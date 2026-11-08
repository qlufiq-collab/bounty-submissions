#!/usr/bin/env python3
"""Foreguild / The Verification Guild: one model for every number in the plan.

Reproduces the v1 plan (PDF, 6 Nov 2026) exactly, then adds the v2 cases.
    python3 -I model.py --check     verify the published figures listed in EXPECT / EXPECT_V2 (exit 0 = all match)
    python3 -I model.py --json      print the full result set
Labels: every input below is an ASSUMPTION of the plan (ASSUMPTION); nothing here is observed Foreguild data.
"""
import json
import math
import sys
from dataclasses import dataclass, field, replace

# ---- inputs (ASSUMPTION) -------------------------------------------------------------------------------------------
TASKS = [400, 650, 900, 1200, 1600, 2100, 2600, 3200, 3900, 4700, 5600, 6600]
AOV = [48, 50, 52, 54, 56, 58, 60, 61, 62, 64, 66, 68]
OTHER = [0, 0, 0, 150, 598, 947, 1645, 2144, 2892, 3690, 4439, 5437]   # harness + console + API, per plan ledger
# Decomposition of OTHER. Months 4-7 and the totals tie to the plan; the split of months 8-12 between harness and API is reconstructed.
HARNESS = [0, 0, 0, 150, 300, 500, 750, 1000, 1250, 1650, 2000, 2400]
SUBS = [0, 0, 0, 0, 2, 3, 4, 6, 8, 10, 12, 13]
CONSOLE = [149 * s for s in SUBS]
API = [o - h - c for o, h, c in zip(OTHER, HARNESS, CONSOLE)]
FIXED_BASE = 9700
SUBSIDY = [2400] * 3 + [2000] * 3 + [1600] * 3 + [1200] * 3
GROWTH = [800, 1000, 1300, 1600, 2000, 2400, 2800, 3200, 3600, 4000, 4500, 5000]
STEWARDS = 4800
FLOOR = 25000   # treasury floor (Freeze Rule 2)
PRELAUNCH_OPS = 14700   # Days 1-30: one month of fixed cost ($9,700) + legal ($5,000); funded in the raise, not in the ledger


@dataclass(frozen=True)
class P:
    take: float = 0.10
    attach: float = 0.45
    fee_assurance: float = 0.04
    loss_ratio: float = 0.50
    verif: float = 0.80        # blended verification cost per task
    gas_dispute: float = 0.15  # gas 0.05 + dispute provision 0.10
    float_: float = 90000
    audit_pre: float = 18000
    audit_re: float = 6000
    audit_re_month: int = 9
    vol_mult: float = 1.0
    aov_mult: float = 1.0
    other_mult: float = 1.0
    growth_mult: float = 1.0
    harness_on: bool = True
    freeze_from: int = 0       # month from which Freeze Rule 1 applies (0 = never)
    freeze_steward_cut: bool = False


def rhu(x, n=0):
    """round half up (the plan's convention)."""
    m = 10 ** n
    return math.floor(x * m + 0.5) / m


def run(p: P = P()):
    rows, cum, cash, hist = [], 0.0, p.float_ - p.audit_pre, []
    for i in range(12):
        t = rhu(TASKS[i] * p.vol_mult)
        aov = rhu(AOV[i] * p.aov_mult, 1)
        gmv = t * aov
        take = p.take * gmv
        a_gross = p.attach * p.fee_assurance * gmv
        a_net = a_gross * (1 - p.loss_ratio)
        verif = p.verif * t
        gd = p.gas_dispute * t
        contrib = take + a_net - verif - gd
        harness = HARNESS[i] if p.harness_on else 0
        other = (harness + CONSOLE[i] + API[i]) * p.other_mult
        sub = SUBSIDY[i]
        growth = GROWTH[i] * p.growth_mult
        fixed = FIXED_BASE + sub
        if p.freeze_from and i + 1 >= p.freeze_from:
            growth = 0
            fixed = FIXED_BASE + sub / 2
            if p.freeze_steward_cut:
                fixed -= STEWARDS / 2
        surplus = contrib + other - fixed - growth
        cum += surplus
        hist.append(surplus)
        ncv90 = sum(hist[-3:])
        cash += surplus - (p.audit_re if i + 1 == p.audit_re_month else 0)
        rows.append(dict(month=i + 1, tasks=t, aov=aov, gmv=gmv, take=take, assur_gross=a_gross, assur_net=a_net, verif=verif, gas_dispute=gd,
                         contrib=contrib, other=other, fixed=fixed, growth=growth, surplus=surplus, ncv90=ncv90, cum=cum, cash=cash))
    tot = dict(tasks=sum(r["tasks"] for r in rows), gmv=sum(r["gmv"] for r in rows), take=sum(r["take"] for r in rows),
               assur_gross=sum(r["assur_gross"] for r in rows), other=sum(r["other"] for r in rows),
               surplus=sum(r["surplus"] for r in rows), closing_cash=rows[-1]["cash"], trough_cash=min(r["cash"] for r in rows),
               trough_month=min(rows, key=lambda r: r["cash"])["month"])
    tot["gross_revenue"] = tot["take"] + tot["assur_gross"] + tot["other"]
    be = next((r["month"] for r in rows if r["surplus"] > 0), None)
    tot["surplus_after_audit"] = tot["surplus"] - p.audit_pre - p.audit_re
    tot["months_below_floor"] = sum(1 for r in rows if r["cash"] < FLOOR)
    tot["positive_months"] = [r["month"] for r in rows if r["surplus"] > 0]
    tot["first_surplus_month"] = be
    return rows, tot


def unit(aov=60.0, p: P = P(), fixed=11500):
    contrib = aov * (p.take + p.attach * p.fee_assurance * (1 - p.loss_ratio)) - (p.verif + p.gas_dispute)
    return dict(contribution_per_task=contrib, break_even_tasks=fixed / contrib)


def lmsr_worst_case(b):
    return b * math.log(2)


def ncv90_proxy(aov=60.0, tasks=2600, fixed=11500, p: P = P()):
    u = unit(aov, p, fixed)["contribution_per_task"]
    return 3 * (u * tasks - fixed)


CAC_MIX = {"agent_api": (0.35, 4), "bounty_mirror": (0.20, 12), "content": (0.20, 9), "dao_outreach": (0.15, 45), "ai_labs": (0.10, 60)}


def blended_cac(agent_cac=4.0):
    return sum(sh * (agent_cac if k == "agent_api" else c) for k, (sh, c) in CAC_MIX.items())


def ltv_cac():
    rows, tot = run()
    growth = sum(GROWTH)
    cac = 18.35
    posters = growth / cac
    per = tot["tasks"] / round(posters)
    contrib_task = sum(r["contrib"] for r in rows) / tot["tasks"]
    total_contrib = sum(r["contrib"] for r in rows)
    return dict(posters=round(posters), tasks_per_poster=per, contrib_task=contrib_task, ltv=contrib_task * per, ratio=contrib_task * per / cac,
                contribution_total=total_contrib, growth_total=growth,
                ratio_if_70pct_tasks_acquired=0.7 * total_contrib / growth,          # only 70% of tasks attributed to acquired posters
                ratio_cac_x2=total_contrib / (2 * growth), ratio_cac_15=total_contrib / growth * cac / blended_cac(15.0), ratio_cac_15_70=0.7 * total_contrib / growth * cac / blended_cac(15.0))


def verification_grid():
    mixes = {"base 56/34/10": (0.56, 0.34, 0.10), "T1-heavy 30/60/10": (0.30, 0.60, 0.10), "T2 20% 50/30/20": (0.50, 0.30, 0.20), "worst 20/60/20": (0.20, 0.60, 0.20)}
    cost = (0.05, 0.80, 5.00)
    out = {}
    for name, m in mixes.items():
        v1 = sum(a * b for a, b in zip(m, cost))
        for k in (1, 2, 5):
            v = v1 * k
            c = 60 * (0.10 + 0.45 * 0.04 * 0.5) - (v + 0.15)
            out[f"{name} x{k}"] = dict(verif=v, contrib=c, break_even=(11500 / c if c > 0 else None))
    return out


def all_cases():
    base_rows, base = run()
    cases = {"base": base}
    cases["bear"] = run(P(vol_mult=0.6, aov_mult=0.85, other_mult=0.5))[1]
    cases["bull"] = run(P(vol_mult=1.4, aov_mult=1.10, other_mult=1.5))[1]
    cases["zero_harness"] = run(P(harness_on=False))[1]
    cases["attach_20"] = run(P(attach=0.20))[1]
    cases["ex_seer"] = run(P(vol_mult=0.8, other_mult=0.85, growth_mult=0.8))[1]
    return base_rows, cases



# ---- v2 additions (ASSUMPTION unless stated) -----------------------------------------------------------------------
def lmsr_move_cost(b, p0, p1):
    """Cost for a trader to move the YES price of a binary LMSR from p0 to p1 (buying YES): b * ln((1-p0)/(1-p1))."""
    return b * math.log((1 - p0) / (1 - p1))


def attack_cost_3pct(b=850.0, p0=0.5, rel=0.03):
    """Capital needed to push one branch's price rel (relative) above the other, at the binary-equivalent LMSR."""
    return lmsr_move_cost(b, p0, min(0.99, p0 * (1 + rel)))


def binding_cap(depth_cost_usd, k=10.0, hard=5000.0):
    """Depth ladder (v2): a market may bind spend only up to k x the measured cost of moving it by the adoption margin."""
    return min(hard, k * depth_cost_usd)


LEAN_VOL = 0.20      # peer-level ramp: ~1,300 tasks/month by month 12 (peers in the field assume 900-1,150; 4,000 at the high end)


def lean_case():
    """Committed-demand-only case: volume x0.2 and non-take revenue x0.2 (harness, console and API scale with volume), Freeze Rule 1 from month 3 (growth 0, subsidy halved, steward draw halved)."""
    rows, tot = run(P(vol_mult=LEAN_VOL, other_mult=LEAN_VOL, freeze_from=3, freeze_steward_cut=True))
    tot["rows"] = rows
    return tot


def human_share(agent_api_share=0.25):
    """Share of settled tasks posted by humans/organisations (channel mix of section 3.1): everything except Agent/API integrations."""
    return 1 - agent_api_share

# ---- published figures to verify (from the v1 PDF) -----------------------------------------------------------
EXPECT = {
    "tasks": 33450, "gmv": 2086900, "gross_revenue": 268196, "surplus": 47437, "closing_cash": 113437, "trough_cash": 27530,
    "break_even_aov60": 2057, "contrib_task_aov60": 5.59, "lmsr_589": 589.18, "ncv90_proxy": 9102,
    "bear_tasks": 20070, "bear_gmv": 1064415,
    "bull_tasks": 46830, "bull_gmv": 3213826,
    "zero_harness_surplus": 37437, "attach20_surplus": 37002,
    "ex_seer_tasks": 26760, "ex_seer_surplus": 11446, "ex_seer_cash": 77446,
}

# v2 figures quoted in the text (computed by this model; pinned here so a change cannot slip into the prose unnoticed)
EXPECT_V2 = {
    "bear_freeze_surplus": 526, "bear_freeze_trough": 30285, "bear_freeze_cash": 66526,
    "lean_surplus": -63873, "lean_trough": 410, "lean_cash": 2127, "lean_months_below_floor": 7, "lean_first_positive_month": 12, "lean_cash_month3": 39277, "lean_gmv_month3": 19700,
    "ex_seer_trough": 21714, "ex_seer_months_below_floor": 4, "base_trough_margin_over_floor": 2530,
    "ncv30_m10": 17112, "ncv90_m10": 33636, "ncv90_m7": -4648,
    "capital_to_move_3pct_b850": 25.89, "attacker_expected_loss_b850": 0.38, "binding_cap_b850": 259, "lmsr_expected_cost_b850": 282,
    "ltv_cac_ratio": 6.1, "contrib_per_task_y1": 5.85, "ratio_if_70pct_acquired": 4.3, "ratio_cac_x2": 3.0, "blended_cac_agent15": 22.20, "ratio_agent15_all": 5.0,
    "surplus_after_audit": 23437, "human_review_10k_20pct": 10000, "prelaunch_raise_total": 104700,
}


# v1 PDF figures that cannot be re-derived from the plan's own stated inputs (model result differs); v2 replaces them.
V1_UNREPRODUCED = {"bear_surplus": -52614, "bear_cash": 13386, "bull_surplus": 158872, "bull_cash": 224872}


def check():
    rows, cases = all_cases()
    base = cases["base"]
    got = {
        "tasks": base["tasks"], "gmv": rhu(base["gmv"]), "gross_revenue": rhu(base["gross_revenue"]), "surplus": rhu(base["surplus"]),
        "closing_cash": rhu(base["closing_cash"]), "trough_cash": rhu(base["trough_cash"]),
        "break_even_aov60": rhu(unit(60)["break_even_tasks"]), "contrib_task_aov60": rhu(unit(60)["contribution_per_task"], 2),
        "lmsr_589": rhu(lmsr_worst_case(850), 2), "ncv90_proxy": rhu(ncv90_proxy()),
        "bear_tasks": cases["bear"]["tasks"], "bear_gmv": rhu(cases["bear"]["gmv"]),
        "bull_tasks": cases["bull"]["tasks"], "bull_gmv": rhu(cases["bull"]["gmv"]),
        "zero_harness_surplus": rhu(cases["zero_harness"]["surplus"]), "attach20_surplus": rhu(cases["attach_20"]["surplus"]),
        "ex_seer_tasks": cases["ex_seer"]["tasks"], "ex_seer_surplus": rhu(cases["ex_seer"]["surplus"]), "ex_seer_cash": rhu(cases["ex_seer"]["closing_cash"]),
    }
    bad = {k: (got[k], v) for k, v in EXPECT.items() if got[k] != v}
    for k, v in EXPECT.items():
        print(f"{'OK ' if k not in bad else 'BAD'} {k:24s} model={got[k]!s:>12}  plan={v!s:>12}")
    bf = run(P(vol_mult=0.6, aov_mult=0.85, other_mult=0.5, freeze_from=3, freeze_steward_cut=True))[1]
    ln = lean_case()
    exs = cases["ex_seer"]
    a = attack_cost_3pct()
    shares = 850 * math.log(0.515 / 0.485)
    lt = ltv_cac()
    got2 = {
        "bear_freeze_surplus": rhu(bf["surplus"]), "bear_freeze_trough": rhu(bf["trough_cash"]), "bear_freeze_cash": rhu(bf["closing_cash"]),
        "lean_surplus": rhu(ln["surplus"]), "lean_trough": rhu(ln["trough_cash"]), "lean_cash": rhu(ln["closing_cash"]), "lean_months_below_floor": ln["months_below_floor"], "lean_first_positive_month": ln["positive_months"][0],
        "lean_cash_month3": rhu(ln["rows"][2]["cash"]), "lean_gmv_month3": rhu(sum(r["gmv"] for r in ln["rows"][:3])), "ex_seer_trough": rhu(exs["trough_cash"]), "ex_seer_months_below_floor": exs["months_below_floor"], "base_trough_margin_over_floor": rhu(base["trough_cash"] - FLOOR),
        "ncv30_m10": rhu(rows[9]["surplus"]), "ncv90_m10": rhu(rows[9]["ncv90"]), "ncv90_m7": rhu(rows[6]["ncv90"]),
        "capital_to_move_3pct_b850": rhu(a, 2), "attacker_expected_loss_b850": rhu(a - 0.5 * shares, 2), "binding_cap_b850": rhu(binding_cap(a)), "lmsr_expected_cost_b850": rhu(24 * 18 - 150),  # §5.7: 24 traders x $18 - $150 hedger losses; ~48% of b*ln2
        "ltv_cac_ratio": rhu(lt["ratio"], 1), "contrib_per_task_y1": rhu(lt["contrib_task"], 2), "ratio_if_70pct_acquired": rhu(lt["ratio_if_70pct_tasks_acquired"], 1), "ratio_cac_x2": rhu(lt["ratio_cac_x2"], 1),
        "blended_cac_agent15": rhu(blended_cac(15.0), 2), "ratio_agent15_all": rhu(lt["ratio_cac_15"], 1),
        "surplus_after_audit": rhu(base["surplus_after_audit"]), "human_review_10k_20pct": 10000 * 0.20 * 5, "prelaunch_raise_total": 72000 + 18000 + PRELAUNCH_OPS,
    }
    bad2 = {k: (got2[k], v) for k, v in EXPECT_V2.items() if got2[k] != v}
    for k, v in EXPECT_V2.items():
        print(f"{'OK ' if k not in bad2 else 'BAD'} {k:30s} model={got2[k]!s:>12}  text={v!s:>12}")
    bad.update(bad2)
    v2 = {"bear_surplus": rhu(cases["bear"]["surplus"]), "bear_cash": rhu(cases["bear"]["closing_cash"]),
          "bull_surplus": rhu(cases["bull"]["surplus"]), "bull_cash": rhu(cases["bull"]["closing_cash"])}
    for k, v in V1_UNREPRODUCED.items():
        print(f"V1 {k:24s} model={v2[k]!s:>12}  v1-pdf={v!s:>12}  (v1 figure not reproducible from stated inputs; v2 uses the model value)")
    return 0 if not bad else 1


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(check())
    rows, cases = all_cases()
    print(json.dumps(dict(ledger=rows, cases=cases, unit=unit(60), ltv_cac=ltv_cac(), grid=verification_grid()), indent=1))
