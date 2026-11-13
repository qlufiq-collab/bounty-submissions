#!/usr/bin/env python3
"""Check that every quoted fragment in an issues table appears verbatim in the source contract.
usage: verify_quotes.py SOURCE.md ISSUES.md"""
import re
import sys

def norm(s):
    s = re.sub(r"\*\*", "", s)
    for a, b in [("“", '"'), ("”", '"'), ("’", "'"), ("‘", "'"), ("[x]", "☒"), ("[ ]", "☐")]:
        s = s.replace(a, b)
    return re.sub(r"\s+", " ", s)

src = norm(open(sys.argv[1]).read())
rows = [l for l in open(sys.argv[2]).read().split("\n") if re.match(r"^\| \d+ \|", l)]
tot = bad = 0
for r in rows:
    n, cell = r.split("|")[1].strip(), r.split("|")[2]
    for q in re.findall(r"“([^“]+?)”(?:\s|\*|$|\.|,|;)", cell + " "):
        for frag in re.split(r"\s*…\s*", q):
            f = norm(frag).strip(" .")
            if len(f) < 12:
                continue
            tot += 1
            if f not in src:
                bad += 1
                print(f"MISMATCH #{n}: {f[:120]}")
print(f"checked {tot} quote fragments, {bad} mismatch")
