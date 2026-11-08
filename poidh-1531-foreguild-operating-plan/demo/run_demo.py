#!/usr/bin/env python3
"""Foreguild demo: T0 harness (template 5, dataset dedup), mandate compiler, enforcer. Deterministic, offline, no funds.
FIP = Foreguild Improvement Proposal: a proposal decided by a decision market; only a passed FIP can become a mandate.
    python3 -I demo/run_demo.py        (exit 0 = every expectation below held)
It demonstrates three things and nothing more; see section 12.3 of the plan for what it does not prove."""
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCHEMA = ["mandate_id", "source_fip", "market_id", "take_bps", "allowed_categories", "daily_spend_cap_usd", "max_ticket_usd", "harness_share_bps", "expiry", "status"]


def load(rel):
    return json.loads((HERE / rel).read_text())


def t0_harness(task):
    """Deterministic checks for 'dataset dedup and normalisation': declared row count, unique key, no empty required field, amount a number > 0."""
    fails = []
    rows = task.get("rows", [])
    if len(rows) != task.get("declared_rows"):
        fails.append(f"row count {len(rows)} != declared {task.get('declared_rows')}")
    keys = [r.get(task.get("key", "")) for r in rows]
    dup = sorted({k for k in keys if keys.count(k) > 1})
    if dup:
        fails.append(f"duplicate key {','.join(map(str, dup))}")
    for i, rec in enumerate(rows):
        miss = [f for f in task.get("required_fields", []) if not str(rec.get(f, "")).strip()]
        if miss:
            fails.append(f"row {i} missing {','.join(miss)}")
    amt = task.get("amount_usd")
    if not isinstance(amt, (int, float)) or isinstance(amt, bool) or amt <= 0:
        fails.append("amount_usd missing or not > 0")
    return ("ACCEPTED", []) if not fails else ("REJECTED", fails)


def compile_mandate(fip):
    if fip.get("status") != "passed":
        raise ValueError(f"{fip['fip']} has status '{fip.get('status')}': only a passed proposal can compile into a mandate")
    d = fip["decision"]
    m = {"mandate_id": "MANDATE-" + fip["fip"], "source_fip": fip["fip"], "market_id": fip["market_id"], "take_bps": d["take_bps"],
         "allowed_categories": list(d["allowed_categories"]), "daily_spend_cap_usd": d["daily_spend_cap_usd"], "max_ticket_usd": d["max_ticket_usd"],
         "harness_share_bps": d["harness_share_bps"], "expiry": fip["expiry"], "status": "active"}
    assert list(m.keys()) == SCHEMA
    return m


def enforce(mandate, category, amount, spent_today, today="2026-11-13"):
    if mandate["status"] != "active" or today > mandate["expiry"]:
        return "BLOCKED", "mandate not active or expired"
    if category not in mandate["allowed_categories"]:
        return "BLOCKED", f"category '{category}' not allowed"
    if amount > mandate["max_ticket_usd"]:
        return "BLOCKED", f"amount {amount} exceeds max ticket {mandate['max_ticket_usd']}"
    if spent_today + amount > mandate["daily_spend_cap_usd"]:
        return "BLOCKED", f"daily cap {mandate['daily_spend_cap_usd']} exceeded ({spent_today}+{amount})"
    return "ALLOWED", "within mandate"


def main():
    ok = True
    print("[1] T0 harness")
    for name, want in (("fixtures/task_bad.json", "REJECTED"), ("fixtures/task_good.json", "ACCEPTED")):
        verdict, why = t0_harness(load(name))
        print(f"    {name}: {verdict}" + (f" ({'; '.join(why)})" if why else ""))
        ok &= verdict == want
    print("[2] Mandate compiler")
    try:
        compile_mandate(load("proposals/fip-002.json"))
        print("    FIP-002 (rejected): compiled  <-- unexpected")
        ok = False
    except ValueError as e:
        print(f"    FIP-002 (rejected): refused ({e})")
    mandate = compile_mandate(load("proposals/fip-001.json"))
    print("    FIP-001 (passed): compiled")
    print("    " + json.dumps(mandate, sort_keys=False))
    print("[3] Enforcer against MANDATE-FIP-001 (daily cap 300, max ticket 400)")
    cases = [("data-dedup", 60, 0, "ALLOWED"), ("legal-advice", 60, 0, "BLOCKED"), ("code-review", 60, 270, "BLOCKED"), ("data-dedup", 450, 0, "BLOCKED")]
    for cat, amt, spent, want in cases:
        verdict, why = enforce(mandate, cat, amt, spent)
        print(f"    {cat:13s} ${amt:<4} spent ${spent:<4} -> {verdict}: {why}")
        ok &= verdict == want
    print("RESULT:", "all expectations held" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
