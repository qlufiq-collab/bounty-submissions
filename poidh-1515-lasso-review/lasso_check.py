#!/usr/bin/env python3
"""Real workload through Lasso RPC: verify our poidh v3 claims on-chain (Base + Arbitrum) and record what Lasso reports.

1. Walk bountyClaims(bountyId, i) until the array ends, the read pattern poidh's skill.md warns can be silently
   truncated by flaky RPCs, then read claims(id) for ours.
2. Find our ClaimCreated events with eth_getLogs filtered by issuer (topic2), in growing block ranges, to see
   how Lasso handles range limits.
3. Repeat key reads on profile/public vs profile/premium with include_meta=body, plus a direct public RPC as a
   cross-check, and log latency + lasso_meta.
Key: ~/.config/lasso/key.json (sent as a Bearer header, never in the URL). Output: poidh/out/lasso_check.json
"""
import json, os, time, urllib.error, urllib.request
from Crypto.Hash import keccak

KEY = json.load(open(os.path.expanduser("~/.config/lasso/key.json")))["key"]
LASSO = "https://lasso.sh/rpc/profile"
POIDH = "0x5555fa783936c260f77385b4e153b9725fef1719"
ME = "0x9442453a44033b126efaffc40a5d9ba201224a4c"
DIRECT = {"base": "https://mainnet.base.org", "arbitrum": "https://arb1.arbitrum.io/rpc"}
TARGETS = [("base", 1512, 9306), ("base", 1513, 9307), ("arbitrum", 339, 1160)]
UA = "Mozilla/5.0 qlufiq-bounty-tools"
LOG = []


def k(sig):
    h = keccak.new(digest_bits=256); h.update(sig.encode()); return "0x" + h.hexdigest()


SEL_BC = k("bountyClaims(uint256,uint256)")[:10]
SEL_CL = k("claims(uint256)")[:10]
TOPIC_CC = k("ClaimCreated(uint256,address,uint256,address,string,string,uint256,string,uint256)")


def rpc(url, method, params, auth=True, tag=""):
    body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    h = {"content-type": "application/json", "user-agent": UA}
    if auth:
        h["authorization"] = f"Bearer {KEY}"
    t = time.perf_counter()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=body, headers=h), timeout=60) as r:
            status, hdr, raw = r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        status, hdr, raw = e.code, dict(e.headers), e.read()
    ms = round((time.perf_counter() - t) * 1000, 1)
    try:
        d = json.loads(raw)
    except Exception:  # noqa: BLE001
        d = {"raw": raw[:300].decode(errors="replace")}
    LOG.append({"tag": tag, "url": url.split("?")[0].replace(LASSO, "lasso"), "method": method, "http": status, "ms": ms,
                "error": d.get("error"), "meta": d.get("lasso_meta"),
                "hdr": {x: v for x, v in hdr.items() if x.lower().startswith(("x-lasso", "retry-after"))}})
    return d


def word(n):
    return hex(n)[2:].rjust(64, "0")


def lasso_url(profile, chain, strategy=None):
    return f"{LASSO}/{profile}/" + (f"{strategy}/" if strategy else "") + f"{chain}?include_meta=body"


def walk(chain, bounty, url):
    ids, i = [], 0
    while True:
        d = rpc(url, "eth_call", [{"to": POIDH, "data": SEL_BC + word(bounty) + word(i)}, "latest"], tag=f"walk {chain}/{bounty}#{i}")
        if "result" not in d or d["result"] in (None, "0x"):
            return ids, d.get("error")
        ids.append(int(d["result"], 16)); i += 1


def claim_issuer(chain, cid, url):
    d = rpc(url, "eth_call", [{"to": POIDH, "data": SEL_CL + word(cid)}, "latest"], tag=f"claim {chain}/{cid}")
    r = d.get("result") or ""
    return ("0x" + r[2 + 64 + 24: 2 + 128]).lower() if len(r) > 130 else None


def main():
    global out
    out = {"selectors": {"bountyClaims": SEL_BC, "claims": SEL_CL, "ClaimCreated": TOPIC_CC}, "walks": {}, "logs": {}}
    for chain, bounty, mine in TARGETS:
        for profile in ("public", "premium"):
            ids, err = walk(chain, bounty, lasso_url(profile, chain))
            out["walks"][f"{chain}/{bounty}/{profile}"] = {"ids": ids, "end_error": err, "ours_present": mine in ids,
                                                          "our_issuer": claim_issuer(chain, mine, lasso_url(profile, chain))}
        ids, err = walk(chain, bounty, DIRECT[chain])  # cross-check without Lasso
        out["walks"][f"{chain}/{bounty}/direct"] = {"ids": ids, "end_error": err}

    # eth_getLogs for our ClaimCreated events, growing ranges back from head
    for chain in ("base", "arbitrum"):
        head = int(rpc(lasso_url("public", chain), "eth_blockNumber", [], tag=f"head {chain}")["result"], 16)
        for span in (10_000, 100_000, 1_000_000):
            for profile in ("public", "premium"):
                d = rpc(lasso_url(profile, chain), "eth_getLogs", [{"address": POIDH, "fromBlock": hex(head - span), "toBlock": hex(head),
                        "topics": [TOPIC_CC, None, "0x" + "0" * 24 + ME[2:]]}], tag=f"getLogs {chain} span={span} {profile}")
                out["logs"][f"{chain}/{span}/{profile}"] = {"n": len(d["result"]) if isinstance(d.get("result"), list) else None,
                                                           "ids": [int(x["topics"][1], 16) for x in d.get("result") or []] if isinstance(d.get("result"), list) else None,
                                                           "error": d.get("error"), "meta": d.get("lasso_meta")}

    # strategy comparison on one cheap call
    for strategy in ("fastest", "balanced-fast", "load-balanced", "priority"):
        for _ in range(5):
            rpc(lasso_url("premium", "base", strategy), "eth_blockNumber", [], tag=f"strategy {strategy}")
    for _ in range(5):
        rpc(lasso_url("public", "base"), "eth_blockNumber", [], tag="public default")
        rpc(DIRECT["base"], "eth_blockNumber", [], auth=False, tag="direct base")
    # error behaviour: bad key, unknown method, oversized batch
    rpc(lasso_url("public", "base"), "eth_blockNumber", [], auth=False, tag="no key")
    rpc(lasso_url("public", "base"), "eth_doesNotExist", [], tag="unknown method")

    out["calls"] = LOG
    os.makedirs(os.path.join(os.path.dirname(__file__), "out"), exist_ok=True)
    json.dump(out, open(os.path.join(os.path.dirname(__file__), "out", "lasso_check.json"), "w"), indent=1)
    print(json.dumps({k2: v for k2, v in out.items() if k2 != "calls"}, indent=1)[:4000])
    print("calls:", len(LOG))


if __name__ == "__main__":
    main()
