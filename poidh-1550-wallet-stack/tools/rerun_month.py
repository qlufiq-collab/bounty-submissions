#!/usr/bin/env python3
"""Monthly rerun (stdlib only, no keys): pull new ClaimCreated logs from public RPCs, read each claim's tx and the
claimant's code AT the claim block, append to data/claims_stack_new.csv, then run tools/estimate.py on the merged set.
usage: python3 tools/rerun_month.py <from_block> [<to_block>]"""
import csv, json, sys, datetime
sys.path.insert(0, "tools"); import rpc
C = "0x5555Fa783936C260f77385b4E153B9725feF1719"
T = json.load(open("data/topics.json"))["ClaimCreated"]
lo = int(sys.argv[1]); hi = int(sys.argv[2]) if len(sys.argv) > 2 else int(rpc.call("eth_blockNumber", []), 16) - 5
logs = rpc.logs(C, [T], lo, hi)
txs = rpc.batch("eth_getTransactionByHash", [[l["transactionHash"]] for l in logs])
ARCH = ["https://mainnet.base.org", "https://base-mainnet.public.blastapi.io", "https://api.zan.top/base-mainnet", "https://base.meowrpc.com"]
rpc.GEN = ARCH
codes = rpc.batch("eth_getCode", [["0x" + l["topics"][2][-40:], l["blockNumber"]] for l in logs])
rows = []
for l, t, cd in zip(logs, txs, codes):
    ts = int(rpc.call("eth_getBlockByNumber", [l["blockNumber"], False])["timestamp"], 16)
    rows.append(dict(claim_id=int(l["topics"][1], 16), bounty_id=int(l["topics"][3], 16),
                     created_utc=datetime.datetime.fromtimestamp(ts, datetime.UTC).strftime("%Y-%m-%d %H:%M"),
                     claimant="0x" + l["topics"][2][-40:], tx=l["transactionHash"], tx_to=(t or {}).get("to"),
                     wallet_7702_delegate=("0x" + cd[8:48]) if (cd or "").startswith("0xef0100") else "", code_len=len(cd or "0x") // 2 - 1))
with open("data/claims_stack_new.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
print(len(rows), "new claims; classify with the delegate/relay table in README, then compute s and the estimate")
