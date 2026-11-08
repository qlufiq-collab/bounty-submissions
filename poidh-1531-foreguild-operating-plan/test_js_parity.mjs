// Parity: browser model (model.js) vs python model (model.py) for every scenario. Run: node test_js_parity.mjs
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const M = createRequire(import.meta.url)('./model.js');
const py = JSON.parse(execFileSync('python3', ['-I', '-c', `
import json, sys
sys.path.insert(0, '.')
import model as M
S = {
 'base': M.P(), 'bear': M.P(vol_mult=0.6, aov_mult=0.85, other_mult=0.5),
 'bearFreeze': M.P(vol_mult=0.6, aov_mult=0.85, other_mult=0.5, freeze_from=3, freeze_steward_cut=True),
 'bull': M.P(vol_mult=1.4, aov_mult=1.10, other_mult=1.5), 'zeroHarness': M.P(harness_on=False), 'attach20': M.P(attach=0.20),
 'exSeer': M.P(vol_mult=0.8, other_mult=0.85, growth_mult=0.8), 'lean': M.P(vol_mult=0.2, other_mult=0.2, freeze_from=3, freeze_steward_cut=True)}
out = {}
for k, p in S.items():
    rows, t = M.run(p)
    out[k] = {'tasks': t['tasks'], 'gmv': t['gmv'], 'surplus': t['surplus'], 'closingCash': t['closing_cash'], 'troughCash': t['trough_cash'], 'cash': [r['cash'] for r in rows]}
out['_unit'] = M.unit(60)['break_even_tasks']; out['_attack'] = M.attack_cost_3pct(); out['_ncv'] = M.ncv90_proxy()
print(json.dumps(out))
`], { encoding: 'utf8' }));
let bad = 0;
const near = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));
for (const [k, over] of Object.entries(M.SCEN)) {
  const { rows, tot } = M.run(over), e = py[k];
  const ok = near(tot.tasks, e.tasks) && near(tot.gmv, e.gmv) && near(tot.surplus, e.surplus) && near(tot.closingCash, e.closingCash) && near(tot.troughCash, e.troughCash) && rows.every((r, i) => near(r.cash, e.cash[i]));
  console.log((ok ? 'OK  ' : 'BAD ') + k, Math.round(tot.surplus), Math.round(tot.closingCash)); if (!ok) bad++;
}
const u = near(M.unit(60).breakEven, py._unit), a = near(M.attack(850).capital, py._attack), n = near(M.ncvProxy(60, 2600, 11500), py._ncv);
console.log((u ? 'OK  ' : 'BAD ') + 'break-even', (a ? 'OK  ' : 'BAD ') + 'attack cost', (n ? 'OK  ' : 'BAD ') + 'ncv proxy');
process.exit(bad || !u || !a || !n ? 1 : 0);
