import sys, json, time
sys.path.insert(0, "tools"); import rpc
D = "data/"
rpc.GEN = ["https://mainnet.base.org", "https://base-mainnet.public.blastapi.io", "https://api.zan.top/base-mainnet", "https://base.meowrpc.com"]
import itertools; rpc._cyc = itertools.cycle(range(len(rpc.GEN)))
claims = json.load(open(D + "claims.json"))
keys = sorted(claims, key=int)
params = [[claims[k]["issuer"], hex(claims[k]["block"])] for k in keys]
out = {}
s = time.time()
for i in range(0, len(params), 400):
    r = rpc.batch("eth_getCode", params[i:i + 400], 20)
    for k, v in zip(keys[i:i + 400], r): out[k] = v
    print(min(i + 400, len(params)), "/", len(params), round(time.time() - s), "s", flush=True)
json.dump(out, open(D + "code_at_claim.json", "w"))
print("DONE", rpc.stats, flush=True)
