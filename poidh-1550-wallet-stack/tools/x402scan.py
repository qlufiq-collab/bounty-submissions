import sys, json, time
sys.path.insert(0, "tools"); import rpc
D = "data/"
USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; AU = "0x98de503528ee59b575ef0c0a2576a82497bfc029a5685b209e9ec333479b10a5"
ws = sorted(json.load(open(D + "code.json"))); tp = ["0x" + w[2:].rjust(64, "0") for w in ws]
head = int(rpc.call("eth_blockNumber", []), 16) - 5
out = []
PN, BP = "https://base-rpc.publicnode.com", "https://base.public.blockpi.network/v1/rpc/public"
def get(u, a, z):
    for t in range(6):
        try:
            r = rpc._post(u, {"jsonrpc": "2.0", "id": 1, "method": "eth_getLogs", "params": [{"address": USDC, "topics": [AU, tp], "fromBlock": hex(a), "toBlock": hex(z)}]})
            if "result" in r: return r["result"]
        except Exception: pass
        time.sleep(1 + t)
    raise RuntimeError(f"fail {u} {a}")
cur = 51000000; n = 0
while cur <= head:
    if cur >= 53500000: z = min(cur + 49999, head); r = get(PN, cur, z)
    else: z = min(cur + 4999, head, 53499999); r = get(BP, cur, z)
    out += r; cur = z + 1; n += 1
    if n % 40 == 0: print("block", cur, "hits", len(out), flush=True)
json.dump({"from": 51000000, "to": head, "logs": out}, open(D + "x402_logs.json", "w"))
print("DONE", len(out), "logs, wallets", len({x['topics'][1] for x in out}), flush=True)
