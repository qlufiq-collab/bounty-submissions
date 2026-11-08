// Browser twin of model.py. Same inputs, same formulas; test_js_parity.mjs compares the two outputs.
const FGModel = (function () {
  const TASKS = [400, 650, 900, 1200, 1600, 2100, 2600, 3200, 3900, 4700, 5600, 6600];
  const AOV = [48, 50, 52, 54, 56, 58, 60, 61, 62, 64, 66, 68];
  const HARNESS = [0, 0, 0, 150, 300, 500, 750, 1000, 1250, 1650, 2000, 2400];
  const SUBS = [0, 0, 0, 0, 2, 3, 4, 6, 8, 10, 12, 13];
  const CONSOLE = SUBS.map((s) => 149 * s);
  const OTHER = [0, 0, 0, 150, 598, 947, 1645, 2144, 2892, 3690, 4439, 5437];
  const API = OTHER.map((o, i) => o - HARNESS[i] - CONSOLE[i]);
  const SUBSIDY = [2400, 2400, 2400, 2000, 2000, 2000, 1600, 1600, 1600, 1200, 1200, 1200];
  const GROWTH = [800, 1000, 1300, 1600, 2000, 2400, 2800, 3200, 3600, 4000, 4500, 5000];
  const FIXED_BASE = 9700, STEWARDS = 4800;
  const DEF = { take: 0.10, attach: 0.45, feeAssurance: 0.04, lossRatio: 0.50, verif: 0.80, gasDispute: 0.15, float: 90000, auditPre: 18000, auditRe: 6000, auditReMonth: 9,
    volMult: 1, aovMult: 1, otherMult: 1, growthMult: 1, harnessOn: true, freezeFrom: 0, freezeStewardCut: false };
  const rhu = (x, n = 0) => { const m = Math.pow(10, n); return Math.floor(x * m + 0.5) / m; };

  function run(over) {
    const p = Object.assign({}, DEF, over || {});
    const rows = []; let cum = 0, cash = p.float - p.auditPre;
    for (let i = 0; i < 12; i++) {
      const t = rhu(TASKS[i] * p.volMult), aov = rhu(AOV[i] * p.aovMult, 1), gmv = t * aov;
      const take = p.take * gmv, aGross = p.attach * p.feeAssurance * gmv, aNet = aGross * (1 - p.lossRatio);
      const verif = p.verif * t, gd = p.gasDispute * t, contrib = take + aNet - verif - gd;
      const harness = p.harnessOn ? HARNESS[i] : 0, other = (harness + CONSOLE[i] + API[i]) * p.otherMult;
      let growth = GROWTH[i] * p.growthMult, fixed = FIXED_BASE + SUBSIDY[i];
      if (p.freezeFrom && i + 1 >= p.freezeFrom) { growth = 0; fixed = FIXED_BASE + SUBSIDY[i] / 2; if (p.freezeStewardCut) fixed -= STEWARDS / 2; }
      const surplus = contrib + other - fixed - growth; cum += surplus;
      cash += surplus - (i + 1 === p.auditReMonth ? p.auditRe : 0);
      rows.push({ month: i + 1, tasks: t, aov, gmv, take, assurNet: aNet, verif, gasDispute: gd, contrib, other, fixed, growth, surplus, cum, cash });
    }
    const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
    const trough = rows.reduce((a, r) => (r.cash < a.cash ? r : a), rows[0]);
    return { rows, tot: { tasks: sum('tasks'), gmv: sum('gmv'), surplus: sum('surplus'), closingCash: rows[11].cash, troughCash: trough.cash, troughMonth: trough.month,
      firstSurplusMonth: (rows.find((r) => r.surplus > 0) || {}).month || null } };
  }
  function unit(aov, over) {
    const p = Object.assign({}, DEF, over || {}); const fixed = p.fixedMonthly || 11500;
    const c = aov * (p.take + p.attach * p.feeAssurance * (1 - p.lossRatio)) - (p.verif + p.gasDispute);
    return { contributionPerTask: c, breakEven: c > 0 ? fixed / c : Infinity };
  }
  const ncvProxy = (aov, tasks, fixed, over) => 3 * (unit(aov, over).contributionPerTask * tasks - fixed);
  const lmsrWorst = (b) => b * Math.log(2);
  const lmsrMoveCost = (b, p0, p1) => b * Math.log((1 - p0) / (1 - p1));
  function attack(b, rel) {
    rel = rel === undefined ? 0.03 : rel; const p0 = 0.5, p1 = Math.min(0.99, p0 * (1 + rel));
    const cost = lmsrMoveCost(b, p0, p1), shares = b * (Math.log(p1 / (1 - p1)) - Math.log(p0 / (1 - p0)));
    return { capital: cost, expectedLoss: cost - 0.5 * shares };
  }
  const bindingCap = (capital, k, hard) => Math.min(hard === undefined ? 5000 : hard, (k === undefined ? 10 : k) * capital);
  const SCEN = {
    base: {}, bear: { volMult: 0.6, aovMult: 0.85, otherMult: 0.5 }, bearFreeze: { volMult: 0.6, aovMult: 0.85, otherMult: 0.5, freezeFrom: 3, freezeStewardCut: true },
    bull: { volMult: 1.4, aovMult: 1.10, otherMult: 1.5 }, zeroHarness: { harnessOn: false }, attach20: { attach: 0.20 },
    exSeer: { volMult: 0.8, otherMult: 0.85, growthMult: 0.8 }, lean: { volMult: 0.2, otherMult: 0.2, freezeFrom: 3, freezeStewardCut: true },
  };
  // mandate demo (twin of demo/run_demo.py)
  function enforce(m, category, amount, spent, today) {
    today = today || '2026-11-13';
    if (m.status !== 'active' || today > m.expiry) return ['BLOCKED', 'mandate not active or expired'];
    if (m.allowed_categories.indexOf(category) < 0) return ['BLOCKED', "category '" + category + "' not allowed"];
    if (amount > m.max_ticket_usd) return ['BLOCKED', 'amount ' + amount + ' exceeds max ticket ' + m.max_ticket_usd];
    if (spent + amount > m.daily_spend_cap_usd) return ['BLOCKED', 'daily cap ' + m.daily_spend_cap_usd + ' exceeded (' + spent + '+' + amount + ')'];
    return ['ALLOWED', 'within mandate'];
  }
  return { run, unit, ncvProxy, lmsrWorst, lmsrMoveCost, attack, bindingCap, SCEN, enforce, rhu, DEF, TASKS, AOV };
})();
if (typeof module !== 'undefined') module.exports = FGModel;
