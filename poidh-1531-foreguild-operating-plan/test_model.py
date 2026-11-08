import math
import unittest

import model as M


class Core(unittest.TestCase):
    def test_check_exit_zero(self):
        self.assertEqual(M.check(), 0)

    def test_ledger_identities(self):
        rows, tot = M.run()
        self.assertEqual(len(rows), 12)
        self.assertAlmostEqual(sum(r["surplus"] for r in rows), tot["surplus"], 6)
        self.assertAlmostEqual(rows[-1]["cum"], tot["surplus"], 6)
        # cash = opening float - pre-launch audit + surplus - re-audit
        self.assertAlmostEqual(tot["closing_cash"], 90000 - 18000 + tot["surplus"] - 6000, 6)
        self.assertEqual(tot["first_surplus_month"], 7)

    def test_other_decomposition_ties(self):
        self.assertEqual(sum(M.HARNESS), 10000)
        self.assertEqual(sum(M.CONSOLE), 8642)
        self.assertEqual(sum(M.API), 3300)
        self.assertTrue(all(a >= 0 for a in M.API))

    def test_unit_economics(self):
        u = M.unit(60)
        self.assertAlmostEqual(u["contribution_per_task"], 5.59, 2)
        self.assertAlmostEqual(u["break_even_tasks"], 2057.2, 0)

    def test_lmsr(self):
        self.assertAlmostEqual(M.lmsr_worst_case(850), 589.18, 2)


class V2(unittest.TestCase):
    def test_attack_cost_small_vs_decision_value(self):
        c = M.attack_cost_3pct()
        self.assertTrue(20 < c < 40)                 # ~$26 to move one branch 3% at b=850
        self.assertLess(M.binding_cap(c), 400)       # so a binding cap must be far below $5,000 at that depth

    def test_move_cost_monotonic(self):
        self.assertLess(M.lmsr_move_cost(850, 0.5, 0.52), M.lmsr_move_cost(850, 0.5, 0.60))

    def test_lean_case_survives_with_freeze_but_never_breaks_even(self):
        t = M.lean_case()
        self.assertGreater(t["trough_cash"], 0)
        self.assertLess(t["surplus"], 0)
        self.assertLess(t["trough_cash"], 1000)   # with non-take revenue scaled to volume the raise is almost exhausted

    def test_human_share(self):
        self.assertAlmostEqual(M.human_share(), 0.75)


if __name__ == "__main__":
    unittest.main()
