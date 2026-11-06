# Foreguild Operating Plan — POIDH Bounty 1531

**Bounty:** [FAO Operating Plan Contest](https://poidh.xyz/base/bounty/1531) (Poidh, Base)
**Prize:** 0.5 ETH + 4,000 USDC (Seer) for the best revenue-focused operating plan for Foreguild,
a proposed AI job board run as a Futarchy Autonomous Organization (FAO).
**Deadline:** 12 November 2026, 23:59 AoE.
**Status:** Final audit passed (2026-11-06). Ready for submission; not yet submitted to Poidh.

## Thesis

> Foreguild is a verification business that happens to run a job board.

The plan's single governing metric is **NCV₉₀** — Net Contribution after Verification over
90 days. It proposes no token, one new contract (`ForeguildSettlement`, ~400 lines),
settlement on Base, and governance on Gnosis via Seer prediction markets.

## Year-1 headline numbers (labelled planning assumptions)

| | |
|---|---|
| Tasks | 33,450 |
| GMV | $2,086,900 |
| Gross revenue | $268,196 |
| Operating surplus | $47,437 |
| Surplus after audit | $23,437 |
| End cash | $113,437 |
| Cash trough | $27,530 (Month 6) |
| Break-even | 2,057 tasks/month, Month 7 |
| Contribution / task | $5.85 |
| LTV / CAC | 6.1x |

All numbers are computed from a single Python model (`compute_numbers.py` →
`numbers.json`) and were independently recomputed in the final audit
(`bounty-1531-final-audit.md` in the author's workspace).

## Files

| File | What it is |
|---|---|
| `foreguild-operating-plan.html` | The plan, rendered (identical content to the PDF) — open this in a browser |
| `foreguild-operating-plan.md` | The plan source (12,465 words, 12 sections + 4 appendices) |
| `numbers.json` | Every number in the plan, machine-readable |
| `compute_numbers.py` | The model that produces `numbers.json` (Decimal, half-up rounding) |
| `worksheet.md` | Working notes for the model |
| `md2html.py` | Renders `foreguild-operating-plan.md` → HTML |

A PDF version (30 pages A4) exists alongside the HTML and is the file submitted to
Poidh; it is generated from the same Markdown source with WeasyPrint.

## How it beats the other submissions

Three gaps found across the 15 existing submissions, all closed here:

1. **Quantitative futarchy cold-start liquidity** — 5 trader populations, expected profit
   $18/trader/decision → subsidy $282/decision, LMSR b=$850 → max loss $589/market,
   governance cost $21,600/year (8.1% of gross).
2. **Verification as a cost centre** — 4×3 grid, death line $6.39/task, human review
   costed at scale, per-category verification P&L.
3. **Strategy vs internal Seer submissions** — game theory plus an ex-Seer stress test
   (without Seer channels: break-even slips to Month 8, surplus still +$11,446).

## Verification

- Independent verification (round 1) found 8 FAILs; all fixed and re-verified.
- Final audit (2026-11-06, fresh auditor): arithmetic, internal consistency,
  external claims (24/24 verified), originality, prompt completeness, PDF layout —
  all PASS. One honest caveat remains: submission 9374's break-even (~1,470
  tasks/month) is better than this plan's 2,057 — bought with a more aggressive
  $75 AOV.
