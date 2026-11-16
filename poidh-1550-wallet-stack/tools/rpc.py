#!/usr/bin/env python3
"""Rotating public Base RPC client: on 429/403/5xx/limit errors move to the next endpoint (kak's idea)."""
import json, time, urllib.request, itertools, threading
LOGS = [("https://base-rpc.publicnode.com", 50000), ("https://base.public.blockpi.network/v1/rpc/public", 5000)]
GEN = ["https://mainnet.base.org", "https://base-rpc.publicnode.com", "https://base.public.blockpi.network/v1/rpc/public",
       "https://base-mainnet.public.blastapi.io", "https://api.zan.top/base-mainnet", "https://base.meowrpc.com", "https://1rpc.io/base"]
_lock = threading.Lock(); _cyc = itertools.cycle(range(len(GEN))); stats = {}
def _post(u, body, to=40):
    r = urllib.request.Request(u, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"})
    return json.load(urllib.request.urlopen(r, timeout=to))
def call(method, params, tries=14):
    last = None
    for t in range(tries):
        with _lock: u = GEN[next(_cyc)]
        try:
            r = _post(u, {"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
            if "result" in r:
                stats[u] = stats.get(u, 0) + 1; return r["result"]
            last = r.get("error")
        except Exception as e:
            last = str(e)
        time.sleep(0.3 * (t % 4))
    raise RuntimeError(f"{method} failed: {last}")
def batch(method, plist, size=20):
    """Batched calls, each batch to the next endpoint; per-item fallback via call()."""
    out = [None] * len(plist)
    for i in range(0, len(plist), size):
        chunk = plist[i:i + size]; ok = False
        for t in range(len(GEN) * 2):
            with _lock: u = GEN[next(_cyc)]
            try:
                r = _post(u, [{"jsonrpc": "2.0", "id": k, "method": method, "params": p} for k, p in enumerate(chunk)])
                if isinstance(r, list) and all("result" in x for x in r):
                    for x in r: out[i + x["id"]] = x["result"]
                    stats[u] = stats.get(u, 0) + 1; ok = True; break
            except Exception:
                pass
            time.sleep(0.2)
        if not ok:
            for k, p in enumerate(chunk): out[i + k] = call(method, p)
    return out
def logs(address, topics, lo, hi):
    out = []; cur = lo
    while cur <= hi:
        done = False
        for u, span in LOGS * 3:
            z = min(cur + span - 1, hi)
            try:
                r = _post(u, {"jsonrpc": "2.0", "id": 1, "method": "eth_getLogs", "params": [{"address": address, "topics": topics, "fromBlock": hex(cur), "toBlock": hex(z)}]})
                if "result" in r:
                    out += r["result"]; cur = z + 1; done = True; stats[u] = stats.get(u, 0) + 1; break
            except Exception:
                time.sleep(0.5)
        if not done: raise RuntimeError(f"logs failed at {cur}")
    return out
