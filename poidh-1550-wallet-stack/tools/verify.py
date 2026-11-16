#!/usr/bin/env python3
"""Recompute every headline number from the public CSV only (stdlib). usage: python3 tools/verify.py [data/claims_stack.csv]"""
import csv, sys, collections
rows = list(csv.DictReader(open(sys.argv[1] if len(sys.argv) > 1 else "data/claims_stack.csv")))
rows.sort(key=lambda r: int(r["claim_id"]))
mon = lambda r: r["created_utc"][:7]
cons = lambda r: r["stack_class"] == "consumer"
agents = {r["claimant"] for r in rows if r["gt_selfdeclared_agent"] == "1"}
first = {}
for r in rows: first.setdefault(r["claimant"], mon(r))
ag = [cons(r) for r in rows if r["claimant"] in agents]
hu = [cons(r) for r in rows if r["claimant"] not in agents and first[r["claimant"]] <= "2026-06" and "2026-07" <= mon(r) <= "2026-09"]
a, h = sum(ag) / len(ag), sum(hu) / len(hu)
print(f"claims {len(rows)} | agent calibration a={a:.4f} (n={len(ag)}) | human calibration h={h:.4f} (n={len(hu)})")
by = collections.defaultdict(list)
for r in rows: by[mon(r)].append(r)
for m in sorted(by):
    L = by[m]; s = sum(map(cons, L)) / len(L); fl = sum(r["claimant"] in agents for r in L) / len(L)
    est = min(1, max(0, 1 - (s - a) / (h - a)))
    print(f"{m} claims {len(L):4d} consumer {s:6.1%} self-declared {fl:6.1%}" + (f" agent-estimate {est:5.1%}" if m >= "2026-07" else ""))
