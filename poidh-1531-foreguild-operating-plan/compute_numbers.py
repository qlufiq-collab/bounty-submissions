#!/usr/bin/env python3
"""Foreguild operating plan — angka inti. Semua angka ASUMSI perencanaan
kecuali dinyatakan FAKTA (dengan sumber di plan.md).
Satu sumber kebenaran aritmetika untuk plan.md / HTML / PDF.
Jalankan: python3 compute_numbers.py -> menulis numbers.json + worksheet.md

Konvensi pembulatan (ditambahkan audit final 2026-11-06): semua uang dihitung
dengan Decimal dari nilai desimal exact, dan sel yang ditampilkan dibulatkan
half-up (0.5 ke atas) — konvensi standar yang dipakai pembaca saat menghitung
ulang. Versi sebelumnya memakai round() float Python, yang menyelesaikan 8
sel tie .5 secara tidak konsisten (5 ke bawah, 3 ke atas — artefak biner,
mis. bear M2 gas_disp 59 padahal exact 58.5). Total dihitung dari nilai
exact, bukan dari baris yang sudah dibulatkan.
"""
import json, math
from decimal import Decimal as D, ROUND_HALF_UP

OUT = "/home/hatch/workspace/poidh/foreguild-operating-plan"


def rnd(x, nd=0):
    """Round a Decimal/int to nd places, half-up; int for nd=0, float otherwise."""
    q = D(1).scaleb(-nd)
    v = x.quantize(q, rounding=ROUND_HALF_UP) if isinstance(x, D) else D(x).quantize(q, rounding=ROUND_HALF_UP)
    return int(v) if nd == 0 else float(v)


# ---------------- Parameter dasar (ASUMSI) ----------------
TAKE_RATE = 0.10            # 10% settlement take atas escrow
ASSUR_ATTACH = 0.45        # 45% task membeli assurance
ASSUR_FEE = 0.04            # assurance = 4% dari nilai task
ASSUR_LOSS = 0.50           # loss ratio target 50%
VERIF_T0_SHARE, VERIF_T0 = 0.56, 0.05   # deterministik
VERIF_T1_SHARE, VERIF_T1 = 0.34, 0.80   # dual judge
VERIF_T2_SHARE, VERIF_T2 = 0.10, 5.00   # bonded human review
GAS = 0.05                  # settlement/gas per task
DISPUTE_PROV = 0.10         # provisi dispute per task
FIXED_EX_SUBSIDY = 9700     # $/bln (steward 4800 + intake/router 1600 +
                            #  verif retainer 1200 + treasury/legal 700 +
                            #  dispute&safety 800 + infra 600)
LAUNCH_FLOAT = 90000
AUDIT_PRE = 18000           # audit pra-peluncuran (kas, Bulan 0)
AUDIT_RE = 6000             # re-audit Bulan 9 (kas)

TASKS = [400, 650, 900, 1200, 1600, 2100, 2600, 3200, 3900, 4700, 5600, 6600]
AOV   = [48, 50, 52, 54, 56, 58, 60, 61, 62, 64, 66, 68]
SUBSIDY = [2400, 2400, 2400, 2000, 2000, 2000, 1600, 1600, 1600, 1200, 1200, 1200]
GROWTH  = [800, 1000, 1300, 1600, 2000, 2400, 2800, 3200, 3600, 4000, 4500, 5000]
HARNESS = [0, 0, 0, 150, 300, 500, 750, 1000, 1300, 1600, 2000, 2400]
CONSOLE = [0, 0, 0, 0, 298, 447, 745, 894, 1192, 1490, 1639, 1937]
API     = [0, 0, 0, 0, 0, 0, 150, 250, 400, 600, 800, 1100]

# Biaya verifikasi blended exact: 0.56*0.05 + 0.34*0.80 + 0.10*5.00 = 0.80
verif_unit = (D(str(VERIF_T0_SHARE)) * D(str(VERIF_T0))
              + D(str(VERIF_T1_SHARE)) * D(str(VERIF_T1))
              + D(str(VERIF_T2_SHARE)) * D(str(VERIF_T2)))


def _dec(x):
    return x if isinstance(x, D) else D(str(x))


# kontribusi/task = take + assur_net - verif - gas - dispute
#   = AOV*(0.10 + 0.45*0.04 - 0.45*0.04*0.50) - (verif+gas+dispute)
#   = AOV*0.109 - (verif+gas+dispute)
def contrib(aov, verif=None):
    if verif is None:
        verif = verif_unit
    a = _dec(aov)
    rate = D('0.10') + D('0.45') * D('0.04') * (D(1) - D('0.50'))  # 0.109 exact
    return a * rate - (_dec(verif) + D('0.05') + D('0.10'))

def build(tasks, aov, other_mult=1.0, growth_mult=1.0, freeze_from=None):
    rows, cum, cash = [], D(0), D(LAUNCH_FLOAT - AUDIT_PRE)
    # Exact (unrounded) sums: totals MUST come from these, not from the
    # rounded monthly rows — summing rounded rows drifts by $1-2 (verified
    # 2026-11-06: rounded surplus sum $47,435 vs exact $47,437).
    exact = {k: D(0) for k in ("tasks", "gmv", "take", "assur_gross", "assur_claims",
                              "verif", "gas_disp", "contrib", "other", "fixed",
                              "growth", "surplus")}
    for i in range(12):
        t, a = tasks[i], aov[i]
        aD = _dec(a)
        gmv = D(t) * aD
        take = gmv * D('0.10')
        assur_gross = gmv * D('0.45') * D('0.04')
        assur_claims = assur_gross * D('0.50')
        verif = D(t) * verif_unit
        gd = D(t) * D('0.15')
        c = D(t) * contrib(aD)
        other = D(HARNESS[i] + CONSOLE[i] + API[i]) * _dec(other_mult)
        sub = D(SUBSIDY[i]) * (D('0.5') if (freeze_from and i + 1 >= freeze_from) else D(1))
        fixed = D(FIXED_EX_SUBSIDY) + sub
        growth = D(GROWTH[i]) * _dec(growth_mult) * (D(0) if (freeze_from and i + 1 >= freeze_from) else D(1))
        surplus = c + other - fixed - growth
        cum += surplus
        cash += surplus - (D(AUDIT_RE) if i == 8 else D(0))  # re-audit Bulan 9 (i=8)
        for k, v in (("tasks", D(t)), ("gmv", gmv), ("take", take),
                     ("assur_gross", assur_gross), ("assur_claims", assur_claims),
                     ("verif", verif), ("gas_disp", gd), ("contrib", c),
                     ("other", other), ("fixed", fixed), ("growth", growth),
                     ("surplus", surplus)):
            exact[k] += v
        rows.append(dict(month=i + 1, tasks=t, aov=a, gmv=rnd(gmv),
            take=rnd(take), assur_gross=rnd(assur_gross),
            assur_claims=rnd(assur_claims), verif=rnd(verif), gas_disp=rnd(gd),
            contrib_task=rnd(contrib(aD), 2), contrib=rnd(c),
            other=rnd(other), fixed=int(fixed), growth=rnd(growth),
            surplus=rnd(surplus), cum=rnd(cum), cash=rnd(cash)))
    return rows, exact

base, base_ex = build(TASKS, AOV)
bear, bear_ex = build([round(t * 0.6) for t in TASKS], [round(a * 0.85, 1) for a in AOV],
             other_mult=0.5, growth_mult=0.7)
# Bear + freeze rule menyala dari Bulan 7 (growth -> 0, subsidi dipotong setengah)
bear_freeze, bear_freeze_ex = build([round(t * 0.6) for t in TASKS], [round(a * 0.85, 1) for a in AOV],
                    other_mult=0.5, growth_mult=0.7, freeze_from=7)
# Tanpa channel Seer sama sekali (20% task hilang; other x0.85; growth x0.8)
exseer, exseer_ex = build([round(t * 0.8) for t in TASKS], AOV, other_mult=0.85, growth_mult=0.8)
be_month_exseer = next(r["month"] for r in exseer if r["surplus"] > 0)
bull, bull_ex = build([round(t * 1.4) for t in TASKS], [round(a * 1.10, 1) for a in AOV],
             other_mult=1.5, growth_mult=1.3)

def tot(rows, k): return sum(r[k] for r in rows)
def ex(x, k): return rnd(x[k])  # exact (unrounded) total, rounded for display
be_month = next(r["month"] for r in base if r["surplus"] > 0)
trough_cash = min(r["cash"] for r in base)
avg_fixed = D(FIXED_EX_SUBSIDY) + D(sum(SUBSIDY)) / D(12)
avg_contrib = base_ex["contrib"] / base_ex["tasks"]
be_tasks = avg_fixed / contrib(60)

# ---------------- Sensitivitas verifikasi (AOV $60) ----------------
mixes = {
    "Base 56/34/10": (0.56, 0.34, 0.10),
    "T1-heavy 30/60/10": (0.30, 0.60, 0.10),
    "T2 20% 50/30/20": (0.50, 0.30, 0.20),
    "Terburuk 20/60/20": (0.20, 0.60, 0.20),
}
verif_grid = {}
for name, (s0, s1, s2) in mixes.items():
    unit = D(str(s0)) * D('0.05') + D(str(s1)) * D('0.80') + D(str(s2)) * D('5.00')
    row = {}
    for mult in (1, 2, 5):
        c = contrib(60, verif=unit * mult)
        row[f"x{mult}"] = {"verif": rnd(unit * mult, 2),
                           "contrib": rnd(c, 2),
                           "be": rnd(avg_fixed / c) if c > 0 else None}
    verif_grid[name] = row

aov_grid = {}
for a in (30, 45, 60, 80):
    c = contrib(a)
    aov_grid[a] = {"contrib": rnd(c, 2), "be": rnd(avg_fixed / c) if c > 0 else None}

# Human review pada skala
hr = {}
for vol in (6600, 10000):
    for s in (0.05, 0.10, 0.20):
        hr[f"{vol} task/bln, T2 {int(s * 100)}%"] = {
            "reviews": int(vol * s), "cost_mo": rnd(D(vol) * D(str(s)) * D('5.00')),
            "cost_task": rnd(D(str(s)) * D('5.00'), 2)}

# P&L verifikasi per kategori (AOV $60 seragam — penyederhanaan dinyatakan)
cats = [
    ("Code review & bug triage", 0.30, (0.75, 0.20, 0.05)),
    ("Data labelling & enrichment", 0.25, (0.65, 0.28, 0.07)),
    ("Dev tasks (fitur/skrip kecil)", 0.25, (0.45, 0.43, 0.12)),
    ("Riset & laporan ops", 0.20, (0.35, 0.45, 0.20)),
]
cat_rows = []
w_unit = D(0)  # tertimbang dari unit EXACT (bukan dari check_cost yang dibulatkan)
for name, share, (s0, s1, s2) in cats:
    unit = D(str(s0)) * D('0.05') + D(str(s1)) * D('0.80') + D(str(s2)) * D('5.00')
    w_unit += D(str(share)) * unit
    cat_rows.append({"kategori": name, "share": share, "t0": s0, "t1": s1, "t2": s2,
                     "check_cost": rnd(unit, 3), "contrib": rnd(contrib(60, verif=unit), 2)})

# ---------------- Futarchy: derivasi subsidi LMSR (gap a) ----------------
b_lmsr = 850
lmsr_max = b_lmsr * math.log(2)              # worst-case subsidy per market
traders, exp_profit_each = 24, 18          # ASUMSI
trader_pool = traders * exp_profit_each      # 432
hedger_contrib = 150                       # ASUMSI: expected profit MM dari hedger
exp_subsidy_decision = trader_pool - hedger_contrib   # 282
decisions_yr = 30
exp_subsidy_yr = exp_subsidy_decision * decisions_yr
subsidy_budget_mo = {"lmsr": 800, "batch_seed": 400, "tournament": 600}
gov_cost_yr = sum(SUBSIDY)

# ---------------- LTV / CAC ----------------
channels = [
    ("Integrasi agen/API (agent-to-agent)", 0.35, 4),
    ("Bounty mirroring (OSS)", 0.20, 12),
    ("Konten / AEO / organik", 0.20, 9),
    ("Outreach DAO/protokol", 0.15, 45),
    ("Kemitraan AI lab", 0.10, 60),
]
cac_blended = sum(D(str(s)) * D(c) for _, s, c in channels)
new_posters = D(ex(base_ex, "growth")) / cac_blended
tasks_per_poster = D(ex(base_ex, "tasks")) / new_posters
ltv = tasks_per_poster * avg_contrib

gross_rev = ex(base_ex, "take") + ex(base_ex, "assur_gross") + ex(base_ex, "other")
data = {
    "params": {"take_rate": TAKE_RATE, "verif_unit": rnd(verif_unit, 4),
               "verif_mix": [VERIF_T0_SHARE, VERIF_T1_SHARE, VERIF_T2_SHARE],
               "contrib_at_60": rnd(contrib(60), 2),
               "avg_fixed_incl_subsidy": rnd(avg_fixed, 2),
               "break_even_tasks_mo": rnd(be_tasks),
               "break_even_month": be_month,
               "launch_float": LAUNCH_FLOAT, "audit_pre": AUDIT_PRE, "audit_re": AUDIT_RE},
    "ledger_base": base,
    "ledger_bear": bear,
    "ledger_bull": bull,
    "totals_base": {"tasks": ex(base_ex, "tasks"), "gmv": ex(base_ex, "gmv"),
                    "take": ex(base_ex, "take"), "assur_gross": ex(base_ex, "assur_gross"),
                    "assur_claims": ex(base_ex, "assur_claims"),
                    "verif": ex(base_ex, "verif"), "gas_disp": ex(base_ex, "gas_disp"),
                    "contrib": ex(base_ex, "contrib"), "other": ex(base_ex, "other"),
                    "harness": sum(HARNESS), "console": sum(CONSOLE), "api": sum(API),
                    "fixed": ex(base_ex, "fixed"), "growth": ex(base_ex, "growth"),
                    "surplus_op": ex(base_ex, "surplus"), "gross_rev": gross_rev,
                    "surplus_after_audit": ex(base_ex, "surplus") - AUDIT_PRE - AUDIT_RE,
                    "end_cash": base[-1]["cash"], "trough_cash": trough_cash,
                    "trough_month": min(base, key=lambda r: r["cash"])["month"],
                    "avg_contrib_task": rnd(avg_contrib, 2),
                    "avg_aov": rnd(base_ex["gmv"] / base_ex["tasks"], 2),
                    "gov_cost_yr": gov_cost_yr,
                    "gov_cost_pct_gross": rnd(D(100 * gov_cost_yr) / D(gross_rev), 1)},
    "totals_bear": {"tasks": ex(bear_ex, "tasks"), "gmv": ex(bear_ex, "gmv"),
                    "surplus_op": ex(bear_ex, "surplus"), "end_cash": bear[-1]["cash"],
                    "trough_cash": min(r["cash"] for r in bear)},
    "totals_bear_freeze": {"surplus_op": ex(bear_freeze_ex, "surplus"),
                    "end_cash": bear_freeze[-1]["cash"],
                    "trough_cash": min(r["cash"] for r in bear_freeze),
                    "trough_month": min(bear_freeze, key=lambda r: r["cash"])["month"]},
    "totals_bull": {"tasks": ex(bull_ex, "tasks"), "gmv": ex(bull_ex, "gmv"),
                    "surplus_op": ex(bull_ex, "surplus"), "end_cash": bull[-1]["cash"]},
    "totals_exseer": {"tasks": ex(exseer_ex, "tasks"), "surplus_op": ex(exseer_ex, "surplus"),
                      "be_month": be_month_exseer, "end_cash": exseer[-1]["cash"]},
    "verif_grid": verif_grid, "aov_grid": aov_grid, "human_review": hr,
    "categories": cat_rows, "weighted_check_cost": rnd(w_unit, 3),
    "lmsr": {"b": b_lmsr, "max_loss_per_market": rnd(D(str(lmsr_max)), 2),
             "traders_per_decision": traders, "exp_profit_each": exp_profit_each,
             "trader_pool": trader_pool, "hedger_contrib": hedger_contrib,
             "exp_subsidy_per_decision": exp_subsidy_decision,
             "decisions_yr": decisions_yr, "exp_subsidy_yr": exp_subsidy_yr,
             "budget_mo": subsidy_budget_mo},
    "ltv_cac": {"cac_blended": rnd(cac_blended, 2), "growth_spend": ex(base_ex, "growth"),
                "new_posters": rnd(new_posters),
                "tasks_per_poster": rnd(tasks_per_poster, 1),
                "ltv": rnd(ltv, 2), "ratio": rnd(ltv / cac_blended, 1)},
    "channels": [{"nama": n, "share": s, "cac": c} for n, s, c in channels],
}
with open(f"{OUT}/numbers.json", "w") as f:
    json.dump(data, f, indent=2)

# Worksheet manusiawi
L = []
L.append("# Lembar Kerja Angka — Foreguild Operating Plan (ASUMSI, bukan fakta)\n")
L.append(f"Biaya verifikasi blended: ${verif_unit:.4f}/task (T0 {VERIF_T0_SHARE:.0%}×${VERIF_T0} + "
         f"T1 {VERIF_T1_SHARE:.0%}×${VERIF_T1} + T2 {VERIF_T2_SHARE:.0%}×${VERIF_T2})")
L.append(f"Kontribusi/task @ AOV $60: ${contrib(60):.2f} | Fixed rata-rata (incl. subsidi): ${avg_fixed:,.0f}/bln")
L.append(f"Break-even: {be_tasks:,.0f} task/bln | Bulan break-even: M{be_month}")
L.append(f"Year-1: {ex(base_ex,'tasks'):,} task, GMV ${ex(base_ex,'gmv'):,}, gross revenue ${gross_rev:,}, "
         f"surplus operasi ${ex(base_ex,'surplus'):,}, setelah audit ${ex(base_ex,'surplus')-AUDIT_PRE-AUDIT_RE:,}")
L.append(f"Kas: buka ${LAUNCH_FLOAT:,} − audit ${AUDIT_PRE:,} = ${LAUNCH_FLOAT-AUDIT_PRE:,} | "
         f"trough ${trough_cash:,} (Bulan {min(base, key=lambda r: r['cash'])['month']}) | akhir ${base[-1]['cash']:,}")
L.append(f"Bear: surplus ${ex(bear_ex,'surplus'):,} | Bull: surplus ${ex(bull_ex,'surplus'):,}")
L.append(f"LTV/CAC: CAC ${cac_blended:.2f}/poster, LTV ${ltv:.2f}, rasio {ltv/cac_blended:.1f}x")
L.append(f"LMSR: b=${b_lmsr}, max loss/market ${lmsr_max:.2f}, expected subsidy ${exp_subsidy_decision}/keputusan, "
         f"30 keputusan/thn → ${exp_subsidy_yr:,}/thn flat ($8,250/thn with taper); anggaran subsidi ${sum(SUBSIDY):,}/thn "
         f"({100*sum(SUBSIDY)/gross_rev:.1f}% gross revenue)")
L.append("\n## Ledger bulanan (base)")
L.append("| Bln | Task | AOV | GMV | Take | Assur.net | Verif | Kontrib | Other | Fixed | Growth | Surplus | Kum. | Kas |")
for r in base:
    L.append(f"| {r['month']} | {r['tasks']:,} | ${r['aov']} | ${r['gmv']:,} | ${r['take']:,} | "
             f"${r['assur_gross']-r['assur_claims']:,} | ${r['verif']:,} | ${r['contrib']:,} | "
             f"${r['other']:,} | ${r['fixed']:,} | ${r['growth']:,} | ${r['surplus']:,} | ${r['cum']:,} | ${r['cash']:,} |")
with open(f"{OUT}/worksheet.md", "w") as f:
    f.write("\n".join(L) + "\n")
print(json.dumps(data["totals_base"], indent=2))
print("BE month:", be_month, "| BE tasks:", rnd(be_tasks))
print("Bear surplus:", ex(bear_ex, "surplus"), "Bull surplus:", ex(bull_ex, "surplus"))
print("Verif grid:", json.dumps(verif_grid, indent=1))
print("AOV grid:", json.dumps(aov_grid))
print("LTV/CAC:", data["ltv_cac"])
print("Weighted check cost (kategori):", rnd(w_unit, 3))
