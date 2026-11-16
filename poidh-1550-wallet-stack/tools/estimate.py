import json, collections, sys, datetime, random
sys.path.insert(0, "tools"); from stack import stack, claims
D = "data/"
gt = json.load(open(D + "groundtruth.json")); A = set(gt["agents"]); HB = set(gt["photo_bounties"])
cls = lambda c: "consumer" if stack(c)[0] == "consumer" else ("eoa" if stack(c)[0] == "eoa" else "other")
mon = lambda c: datetime.datetime.fromtimestamp(c["createdAt"], datetime.UTC).strftime("%Y-%m")
ag = [cls(c) == "consumer" for c in claims.values() if c["issuer"] in A]
first = {}
for c in sorted(claims.values(), key=lambda c: c["id"]): first.setdefault(c["issuer"], mon(c))
hu = [cls(c) == "consumer" for c in claims.values() if c["issuer"] not in A and first[c["issuer"]] <= "2026-06" and "2026-07" <= mon(c) < "2026-10"]
hu_photo = [cls(c) == "consumer" for c in claims.values() if c["bountyId"] in HB and c["issuer"] not in A and "2026-07" <= mon(c) < "2026-10"]
bym = collections.defaultdict(list)
for c in claims.values(): bym[mon(c)].append(cls(c) == "consumer")
def est(s, h, a): return min(1, max(0, 1 - (s - a) / (h - a)))
random.seed(7); R = 2000
rows = []
for m in sorted(bym):
    floor = sum(1 for c in claims.values() if mon(c) == m and c["issuer"] in A) / len(bym[m])
    xs = bym[m]; s = sum(xs) / len(xs); h = sum(hu) / len(hu); a = sum(ag) / len(ag)
    bs = []
    for _ in range(R):
        sb = sum(random.choices(xs, k=len(xs))) / len(xs); hb = sum(random.choices(hu, k=len(hu))) / len(hu); abb = sum(random.choices(ag, k=len(ag))) / len(ag)
        bs.append(est(sb, hb, abb))
    bs.sort(); rows.append(dict(month=m, claims=len(xs), selfdeclared_floor=round(floor, 4), in_window=m >= "2026-07", consumer_share=round(s, 4), agent_est=round(est(s, h, a), 3), lo=round(bs[int(.025 * R)], 3), hi=round(bs[int(.975 * R)], 3)))
out = dict(h_human=round(sum(hu) / len(hu), 4), n_human=len(hu), h_photo_crosscheck=round(sum(hu_photo) / len(hu_photo), 4), n_photo=len(hu_photo), a_agent=round(sum(ag) / len(ag), 4), n_agent=len(ag), rows=rows)
json.dump(out, open(D + "estimate.json", "w"), indent=1)
print("h", out["h_human"], out["n_human"], "a", out["a_agent"], out["n_agent"])
for r in rows: print(r)
