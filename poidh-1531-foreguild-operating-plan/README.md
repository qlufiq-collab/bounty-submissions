# The Verification Guild: entry kit (v2 · 8 November 2026)

Entry to the FAO Operating Plan Contest (poidh Base bounty #1531). Independent proposal, prepared with AI assistance; no affiliation with Seer is claimed and nothing here claims that Foreguild exists.

**Read it live:** [plan (HTML)](https://qlufiq-collab.github.io/bounty-submissions/poidh-1531-foreguild-operating-plan/) · [PDF](https://qlufiq-collab.github.io/bounty-submissions/poidh-1531-foreguild-operating-plan/foreguild-operating-plan.pdf)

| File | What it is |
|---|---|
| `index.html` | The plan as a single offline page (no external requests, hash-pinned CSP) with live calculators |
| `foreguild-operating-plan.pdf` | The same plan, printed from the page (`?print=1`) |
| `model.py`, `test_model.py` | One model for every number; `python3 -I model.py --check` exits 0 only if every published figure matches |
| `model.js`, `test_js_parity.mjs` | Browser twin of the model; `node test_js_parity.mjs` compares it with `model.py` for eight scenarios |
| `demo/` | T0 harness, mandate compiler and enforcer; `python3 -I demo/run_demo.py` (deterministic, offline, no funds); output in `demo/captured-output.txt` |
| `v1/` | Version 1 (6 November 2026), kept for reference; Appendix E lists what changed |
| `scripts/market_depth.py`, `data/` | Reads Seer's public `markets-search` function and writes the raw market list and the depth summary quoted in section 5.2 |

Checks (all offline except the depth script):

```
python3 -I model.py --check
python3 -m unittest -q test_model
node test_js_parity.mjs
python3 -I demo/run_demo.py
python3 scripts/market_depth.py      # needs network; re-measures Seer market depth
```

What this kit does not prove: the demo is not an on-chain contract; the model's inputs are assumptions, not observed Foreguild demand; the depth measurement is one public API on one day.
