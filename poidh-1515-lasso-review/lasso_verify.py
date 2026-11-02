#!/usr/bin/env python3
"""Second pass through Lasso: verify our 3 poidh claims using the real on-chain bounty ids (poidh URL ids differ),
read the claim txs' receipts, and fetch our ClaimCreated logs inside Lasso's 1000-block getLogs window.
Output: out/lasso_verify.json"""
import json, os
import lasso_check as L

TARGETS = [("base", 526, 9306, "../claims/tx/execute_1512.json"), ("base", 527, 9307, "../claims/tx/execute_1513.json"),
           ("arbitrum", 159, 1160, "../claims/tx/execute_339.json")]
res = {}
for chain, onchain, cid, ex in TARGETS:
    url = L.lasso_url("premium", chain)
    ids, err = L.walk(chain, onchain, url)
    tx = json.load(open(ex))["data"]["txHash"]
    rc = L.rpc(url, "eth_getTransactionReceipt", [tx], tag=f"receipt {chain}/{cid}").get("result") or {}
    blk = int(rc.get("blockNumber", "0x0"), 16)
    ev = [lg for lg in rc.get("logs", []) if lg["topics"] and lg["topics"][0] == L.TOPIC_CC]
    onchain_cid = int(ev[0]["topics"][1], 16) if ev else None
    logs = L.rpc(url, "eth_getLogs", [{"address": L.POIDH, "fromBlock": hex(blk - 500), "toBlock": hex(blk + 499),
                 "topics": [L.TOPIC_CC, None, "0x" + "0" * 24 + L.ME[2:]]}], tag=f"getLogs1000 {chain}/{cid}")
    res[f"{chain}/{cid}"] = {"onchain_bounty": onchain, "walk_len": len(ids), "walk_end": err, "tx": tx, "status": rc.get("status"),
                             "block": blk, "onchain_claim_id": onchain_cid, "claim_in_walk": onchain_cid in ids,
                             "issuer_check": L.claim_issuer(chain, onchain_cid, url) if onchain_cid else None,
                             "getLogs_ids": [int(x["topics"][1], 16) for x in logs.get("result") or []], "getLogs_err": logs.get("error"),
                             "getLogs_meta": logs.get("lasso_meta")}
json.dump({"results": res, "calls": L.LOG}, open(os.path.join(os.path.dirname(__file__), "out", "lasso_verify.json"), "w"), indent=1)
print(json.dumps({k: {x: v[x] for x in v if x != "getLogs_meta"} for k, v in res.items()}, indent=1))
