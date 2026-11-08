#!/usr/bin/env python3
"""Measure Seer market depth from Seer's own public API (read-only).

Source: POST https://app.seer.pm/.netlify/functions/markets-search (documented at https://docs.seer.pm/developers/api).
Writes data/seer_markets_<date>.json.gz (raw) and data/market_depth.json (summary). Prints one line per page.
Run: python3 -u scripts/market_depth.py
"""
import gzip
import json
import statistics
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

D = Path(__file__).resolve().parent.parent / "data"
D.mkdir(exist_ok=True)
URL = "https://app.seer.pm/.netlify/functions/markets-search"
UA = "Mozilla/5.0 (X11; Linux x86_64) foreguild-research"


def post(body, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"content-type": "application/json", "User-Agent": UA})
            return json.load(urllib.request.urlopen(req, timeout=90))
        except Exception as e:  # noqa: BLE001
            if i == tries - 1:
                raise
            print("retry", i, repr(e)[:100], flush=True)
            time.sleep(3 * (i + 1))


def fetch_all(extra):
    first = post({"limit": 100, "page": 1, **extra})
    pages, count = first["pages"], first["count"]
    allm = list(first["markets"])
    print(f"page 1/{pages} count={count}", flush=True)
    for p in range(2, pages + 1):
        r = post({"limit": 100, "page": p, **extra})
        allm += r["markets"]
        print(f"page {p}/{pages} total={len(allm)}", flush=True)
        time.sleep(0.4)
    return count, allm


def f(x):
    try:
        return float(x or 0)
    except (TypeError, ValueError):
        return 0.0


def pct(v, q):
    if not v:
        return None
    s = sorted(v)
    return s[min(len(s) - 1, int(q * len(s)))]


def is_conditional(m):
    pm = m.get("parentMarket") or {}
    return bool(set(str(pm.get("id", "")).lower().replace("0x", "")) - {"0"})


def summarise(ms):
    out = {}
    groups = {"all": ms}
    for c in sorted({m.get("chainId") for m in ms}):
        groups[f"chain_{c}"] = [m for m in ms if m.get("chainId") == c]
    for name, g in list(groups.items()):
        groups[name + "_conditional"] = [m for m in g if is_conditional(m)]
        groups[name + "_futarchy"] = [m for m in g if m.get("type") == "Futarchy"]
    for name, g in groups.items():
        if not g:
            continue
        vol = [f(m.get("volumeUSD")) for m in g]
        liq = [f(m.get("liquidityUSD")) for m in g]
        oi = [f(m.get("openInterestUSD")) for m in g]
        traded = [v for v in vol if v > 0]
        out[name] = {
            "markets": len(g),
            "with_liquidity": sum(1 for v in liq if v > 0),
            "traded_volume_gt0": len(traded),
            "traded_median_volume_usd": round(statistics.median(traded), 2) if traded else None,
            "volume_p90_usd": round(pct(traded, 0.9), 2) if traded else None,
            "volume_max_usd": round(max(vol), 2),
            "volume_gt_1k": sum(1 for v in vol if v > 1000),
            "volume_gt_10k": sum(1 for v in vol if v > 10000),
            "volume_total_usd": round(sum(vol), 2),
            "liquidity_median_usd_among_funded": round(statistics.median([v for v in liq if v > 0]), 2) if any(v > 0 for v in liq) else None,
            "liquidity_gt_1k": sum(1 for v in liq if v > 1000),
            "liquidity_gt_10k": sum(1 for v in liq if v > 10000),
            "liquidity_total_usd": round(sum(liq), 2),
            "open_interest_gt_6k": sum(1 for v in oi if v > 6000),
            "open_interest_max_usd": round(max(oi), 2),
        }
    return out


if __name__ == "__main__":
    t0 = time.time()
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    summ = {"fetched_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "source": URL, "datasets": {}}
    # two views: the API default (no filter) and the 'showConditionalMarkets' view, which returns only conditional markets
    for name, extra in (("default", {}), ("conditional_flag", {"showConditionalMarkets": True})):
        count, ms = fetch_all(extra)
        with gzip.open(D / f"seer_markets_{name}_{day}.json.gz", "wt") as fh:
            json.dump(ms, fh)
        summ["datasets"][name] = {"request": extra, "reported_count": count, "fetched": len(ms), "groups": summarise(ms)}
    (D / "market_depth.json").write_text(json.dumps(summ, indent=1))
    for name, ds in summ["datasets"].items():
        print(name, ds["reported_count"], ds["fetched"], json.dumps({k: v for k, v in ds["groups"].items() if k in ("all", "chain_100", "chain_8453", "chain_10", "chain_100_conditional")}))
    print("done", round(time.time() - t0), "s", flush=True)
