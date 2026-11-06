# Foreguild Operating Plan — The Verification Guild

**Proposal for POIDH Bounty 1531 — "FAO Operating Plan Contest" (Foreguild)**
**Date:** 6 November 2026 · **Status:** Proposal — ready to run from 13 November 2026, subject to the Day-1 decisions in Appendix C. Not submitted anywhere; no team, funding, product, or token exists yet.
**Bounty:** 0.5 ETH (Poidh) + 4,000 USDC (Seer) for the best revenue-focused operating plan. Deadline 12 Nov 2026 23:59 AoE. [FAKTA — bounty 1531, poidh.xyz/base/bounty/1531]

> **How to read this plan.** Every number carries a label. **[FAKTA]** = a verifiable external claim with its source cited. **[ASUMSI]** = a planning assumption proposed by this plan — stated explicitly, with its arithmetic shown, and with the sign that would prove it wrong listed in Appendix A. **[ESTIMASI]** = a figure derived from stated assumptions. Nothing in this plan claims Foreguild already has a team, treasury, users, or revenue. Foreguild is a blank canvas: the only public description is the bounty text itself. [FAKTA — research file §1]

---

## 0. The plan in one page

**Thesis.** Foreguild is not a job board with verification attached. It is a **verification business that happens to run a job board**. The scarce product is not compute — agents are cheap — and not matching — listings are cheap. The scarce product is a *credible, checkable answer to "was this work actually done, to the spec, by someone who can be made to pay if it wasn't?"* Everything in this plan follows from that sentence: the wedge, the revenue mix, the cost centre, and the futarchy metric.

**The wedge (spec-first).** Foreguild lists **only tasks whose acceptance can be specified before work starts** — a written spec plus machine-checkable acceptance tests (schema, test suite, exact-match output, or a frozen rubric). A task with no checkable spec is not listed, at any price. This is the one rule that makes the rest of the plan affordable: deterministic checks cost $0.05, human judgement costs $5.00, and the mix between them is the entire business.

**What agents do.** Poster agents and human posters escrow USDC for a spec'd task. Worker agents bid in a reverse auction, post a bond, do the work, and deliver against the spec. Verifier agents — and, on sample, bonded humans — check the delivery. The guild is paid when, and only when, a delivery passes.

**How futarchy directs them.** One metric, **NCV₉₀** (Net Contribution after Verification, 90-day rolling, USDC), is the guild's welfare function. Every spending, fee, category, and parameter decision above a threshold is a Seer conditional market on NCV₉₀: PASS vs FAIL, adopted only if the market says the decision makes NCV₉₀ at least 3% better. Agents execute; markets decide; humans hold three enumerated emergency powers and nothing else.

**How revenue is generated.** Settlement take (10%) is the toll; verification is the product (assurance + harness royalties + verified-delivery API + buyer console). Governance trading is explicitly **not** a revenue line.

**Year-1 headline numbers [ESTIMASI, from the ledger in §7 — arithmetic in `worksheet.md`]:**

| | Year 1 |
|---|---|
| Settled tasks | 33,450 |
| GMV (escrowed task value) | $2,086,900 |
| Gross revenue | $268,196 |
| Operating surplus | $47,437 |
| Surplus after audit ($24,000) | $23,437 |
| Break-even | Month 7 · 2,057 tasks/month at AOV $60 |
| Launch float [ASUMSI] | $90,000 — treasury never below $27,530 in base case |
| Contribution / task at AOV $60 | $5.59 (verification $0.80, assurance net +$0.54) |
| LTV / CAC | 6.1x (LTV $111.52 vs CAC $18.35 per poster) |

**What this plan does that none of the 15 existing submissions does** (see §11–§12 and Appendix D for the full comparison):

1. **Cold-start liquidity, derived — not asserted.** Who trades, what they expect to earn ($18 per decision per active trader), what the subsidy must cost (LMSR b = $850 → max $589/market, expected $282/decision), the taper curve, the stop rule, and the total governance cost per year ($21,600 = 8.1% of gross revenue) — all budgeted in the cost base.
2. **Verification as a P&L with full sensitivity.** A 4 × 3 grid (mix × cost multiplier) showing exactly where the model dies, human-review cost at 10,000 tasks/month, and a verification P&L per category.
3. **A strategy for beating internal Seer submissions.** The game theory of a contest where the jury also competes — and why verifiability, adoptability, and a hard cap on Seer dependence are the winning moves.

---

## 1. Executive summary — a thesis different from all 15

Fifteen plans were compared before this one was written. Most of them share the same shape: a job board, a take rate, a futarchy appendix. The strongest (9363) is a well-run company; the most buildable (9366) is a well-wired market; the most Seer-native (9369) is a good map of Seer. This plan is none of those shapes. Its shape is dictated by one observation the others price at zero: **verification is the only cost that scales with volume, the only quality buyers actually pay for, and the only moat that compounds** — a precedent library of specs, checks, and calibrated judges that a competitor can only re-earn task by task, never copy wholesale.

Three decisions follow, and each is a deliberate break from the field:

**1. Spec-first listing — the guild refuses work it cannot check.** Two plans, of the twelve read in full, have hard listing rules — 9374 (check cost <6% of task value) and 9356 (~5%) — but neither prices its rule on *expected check cost including the human tail* nor publishes the weekly breach count. This plan adopts a 6% rule on that fuller basis. The consequence is a narrower wedge — four categories only in Year 1 (§5) — and a much cheaper cost base. A guild that lists everything must price human judgement for everything; a guild that lists only checkable work can let machines do 56% of checks for $0.05.

**2. One metric, net of verification.** NCV₉₀ subtracts verification COGS, assurance claims, fixed costs, growth spend, and governance subsidy. A plan that maximises gross fees can hide a verification cost explosion behind volume; a plan that maximises NCV₉₀ cannot. This is why the verification sensitivity grid (§5.4) is the most important table in the document: it shows the conditions under which this thesis is false.

**3. No token, no governance-trading revenue, no escrow float as revenue.** Three temptations, each refused for a stated reason (§9.6): a token would let thin markets be manipulated and would force a "per token" metric with no token behind it (the inconsistency in 9373); governance trading as a revenue line pays the guild to manufacture decisions (the flaw in 9359); escrow float is other people's money held for days, not income. The guild earns from verified work and from selling verification. Nothing else.

**What success looks like at Day 90** (gates, §10): 1,050 cumulative settled tasks; dispute rate below 5%; at least 55 of the first 100 posters with a second settled task (threshold adopted from 9363's Day-90 gate); first binding futarchy decision resolved; NCV₉₀ published weekly; Seer backlog at or below 35% of GMV. **What failure looks like:** any gate missed twice triggers the freeze rules in §7.4 — the plan would rather shrink than burn the float pretending.

**A note on honesty about scale.** Year-1 volume (33,450 tasks) is roughly 1.6% of the on-chain request volume Olas Mech processed in ~16 months (2,103,560 requests [FAKTA]), but at ~1,200× the average value per task ($62.39 vs ~$0.05 [FAKTA]). The bet is explicit: Foreguild does not chase micro-request volume. It sells *deliverables* — code review, data work, small dev tasks, research — where a 10% take is dollars, not cents. If that bet is wrong and average task value collapses toward $5, the AOV sensitivity table (§5.4) shows break-even rising to ~5,000 tasks/month at AOV $30 (2.4×), and §8.4 says what happens then.

---

## 2. Business model — revenue streams with the arithmetic shown

### 2.1 The unit: one settled task

All unit economics are built from one settled task at the reference average order value (AOV) of **$60 [ASUMSI — Year-1 average AOV is $62.39; $60 is the reference case used for sensitivity]**. Every line is shown; nothing is a plug figure.

| Line [ASUMSI unless noted] | Calculation | Per task |
|---|---|---|
| Escrowed task value (AOV) | — | $60.00 |
| Settlement take, 10% | 10% × $60 | **+$6.00** |
| Assurance fee (expected) | 45% attach × 4% × $60 | +$1.08 |
| Assurance claims (expected) | 50% loss ratio × $1.08 | −$0.54 |
| Verification cost (blended) | 56% × $0.05 + 34% × $0.80 + 10% × $5.00 | −$0.80 |
| Gas / settlement | Base L2, per task | −$0.05 |
| Dispute provision | 2.5% dispute rate × ~$4 avg cost | −$0.10 |
| **Contribution per task** | | **+$5.59** |

Contribution margin is 79% of take-plus-assurance revenue ($5.59 / $7.08). The two numbers that matter most are the take ($6.00) and the verification cost ($0.80): verification is 13% of the take, which is why §5 exists.

**Why 10%?** The take sits inside the verified industry range, not above it: Upwork charges freelancers 10% flat (0–15% per contract in 2026) [FAKTA], Fiverr 20% plus a 5.5% buyer surcharge (~25.5% effective) [FAKTA], Freelancer.com 10% or $5 [FAKTA], Olas Mech Marketplace 15% on-chain [FAKTA]. Foreguild at 10% undercuts Fiverr's effective wedge by ~15 points and matches Upwork — while offering escrow, bonded workers, and verified delivery that neither offers to agents. The take is not assumed optimal: §2.4 prices it as an experiment, with a Class A futarchy market to move it inside a constitutional band of **7–14% [ASUMSI]**.

### 2.2 Revenue streams — five lines, one hierarchy

| # | Stream | Year-1 revenue [ESTIMASI] | Share | Nature |
|---|---|---|---|---|
| 1 | Settlement take (10% of GMV) | $208,690 | 77.8% | Core toll; scales with GMV |
| 2 | Assurance (gross fees) | $37,564 | 14.0% | Insurance-like; net +$18,782 after 50% loss ratio |
| 3 | Harness royalties | $10,000 | 3.7% | Verification-as-a-product (see §5.5) |
| 4 | Buyer console subscriptions ($149/mo) | $8,642 | 3.2% | Recurring; 13 subscribers by Month 12 |
| 5 | Verified-delivery API ($0.50/verdict) | $3,300 | 1.2% | Verification-as-a-product, external |
| | **Gross revenue** | **$268,196** | 100% | |

**Stream 1 — settlement take.** Poster escrows the full task value in USDC on Base; on acceptance, the worker receives 90%, the guild 10%. No take is recognised on refunded, disputed-and-reversed, or same-beneficial-owner volume — those are excluded from GMV reporting by rule (§6.2).

**Stream 2 — assurance.** An opt-in poster-paid fee of 4% of task value: if a delivery passes verification but is later shown defective within 14 days (missed spec, plagiarised output, injected payload), the guild refunds the poster from the assurance pool and pursues the worker's bond. Attach rate [ASUMSI] 45%, loss ratio target ≤50% — the pool is priced like insurance, not marketed like a guarantee. If the realised loss ratio exceeds 65% in any 30-day window, the assurance price goes to a Class B futarchy market the same week (§6.5). Assurance is the only stream with an explicit actuarial guard: reserve = 2× trailing-90-day claims, floored at $5,000.

**Stream 3 — harness royalties.** Anyone may publish a machine-checkable acceptance harness (test suite, schema, rubric) for a task category. When the guild — or an external platform — runs it, the author receives 70% of the check fee and the guild 30%. This turns verification from a pure cost into a marketplace: the guild's own T0 checks are the first customer. Year-1 arithmetic [ASUMSI]: average check fee $1.00, guild share $0.30 → $10,000 requires ~33,000 external harness checks in Year 1 (~2,800/month on average; ~8,000/month by Month 12). That is the most speculative line in the plan; §7.3 shows the plan survives at zero harness revenue (surplus $37,437, break-even still Month 7).

**Stream 4 — buyer console.** $149/month for DAO/protocol buyers (the same tier price 9356 uses for its buyer console): bulk posting, API access, dedicated matching queue, monthly verification report. 2 subscribers in Month 5 → 13 in Month 12 [ASUMSI].

**Stream 5 — verified-delivery API.** External platforms pay $0.50 per verdict to run a delivery through Foreguild's judge panel and receive a signed verdict (pass/fail + rubric scores + check hash). 2,200 verdicts/month by Month 12 [ASUMSI].

**Explicitly refused as revenue:** governance-market trading fees and spreads (integrity — §6.2); escrow float yield (other people's money); sale of unconsented task data (consent rules §9.7); listing fees for posters (they tax demand at the coldest moment). A token is refused in §9.6.

### 2.3 Cost base — what it costs to run the guild

Fixed operating cost, excluding governance subsidy and growth spend, is **$9,700/month [ASUMSI]**:

| Office / line | $/month | What it buys |
|---|---|---|
| Stewards (2 part-time humans) | $4,800 | Ratification, panels, incident response (§7.1) |
| Intake & Router Office | $1,600 | Spec linting, matching infra, RPC, hosting |
| Verification Economics Office | $1,200 | Retainer for the human review panel + calibration |
| Treasury & Legal Office | $700 | Bookkeeping, counsel review, reporting |
| Dispute & Safety Office | $800 | Sybil screening, prompt-injection screening, dispute ops |
| Infrastructure (RPC, hosting, tooling) | $600 | — |
| **Subtotal** | **$9,700** | |
| Governance subsidy (avg, tapered §6.6) | $1,800 | LMSR seeding + batch seeding + forecaster tournament |
| **Average all-in fixed cost** | **$11,500** | |

Growth (acquisition) spend is a separate envelope (§3.4), not buried in fixed cost: $800 in Month 1 → $5,000 in Month 12, $32,200 in Year 1.

### 2.4 Break-even and the price experiment

Break-even at the reference AOV of $60: $11,500 ÷ $5.59 = **2,057 tasks/month**. At the Year-1 average AOV of $62.39, contribution is $5.85/task and break-even is 1,966 tasks/month. The monthly ledger (§7.2) crosses into surplus in **Month 7** (Month 6 is −$1,872; Month 7 is +$2,079).

The 10% take is a starting price, not a doctrine. Days 31–90 run a live price experiment [ASUMSI design]: 10% of traffic is randomised to 8% and 10% to 12%, measuring settled-task volume and contribution per listed task; the result goes to a Class A market in Month 4. No other plan runs a randomised take-rate experiment (8% vs 12% arms) with a pre-committed decision rule — 9370's live A/B test prices agent behaviour, not the take rate, and 9362's 90-day experiment is the only other price experiment among the fifteen; most simply assert 8–12%.

---

## 3. Demand engine — where tasks come from, quantitatively

### 3.1 The demand thesis

Demand does not come from "the AI agent economy" in general. It comes from five named channels, each with a target share of Year-1 tasks, a cost per acquired poster, and an owner. The blended cost per acquired poster is **$18.35 [ASUMSI, derived in §3.3]** — and the plan is built so that losing any single channel, including Seer itself, does not kill it (§11.4).

| Channel | Share of Y1 tasks | Who the poster is | Why they post here |
|---|---|---|---|
| Agent/API integrations | 25% | Other agents posting programmatically (MCP/API, x402) | Cheapest acquisition; agents sub-contracting specialists (the AgentBazaar pattern: A hires B hires C [FAKTA]) |
| Bounty mirroring | 25% | OSS repos & protocols with public bounties | Mirror an existing public bounty; Foreguild adds escrow + verification the bounty lacks |
| DAO / protocol retainers | 15% | DAOs & protocols needing recurring ops work | Console subscription; bulk, repeatable, spec-able work |
| Seer-internal backlog | 20% | Seer itself (research, labelling, ops tasks) | Priced like any customer (§11); hard-capped, never free |
| Direct / content / AEO | 15% | Humans & small teams finding the board | Spec-linting free tool + public precedent library as lead magnet |

Volume ramp [ASUMSI]: 400 → 6,600 tasks/month over 12 months (33,450 total). AOV rises $48 → $68 as the mix shifts from small checkable tasks toward larger deliverables. The ramp is deliberately slower than the two steepest existing plans (9356: 2,000 → 70,000/quarter; 9359: 500 → 60,000/month) and is tied to channel-level hiring, not hope: each channel's monthly task target is a line in the Scout's KPI sheet, reviewed weekly.

### 3.2 The first 100 posters

Before public launch, 20 design partners sign LOIs (10 DAOs/protocols, 5 OSS maintainers, 5 agent-framework teams) [ASUMSI target]. Each commits to at least 5 funded tasks in the first 60 days, capped at $750 total exposure per partner — the evidence-led pattern of starting with paid pilots before building for scale. The Day-90 gate (threshold adopted from 9363's Day-90 gate) is a *repeat* gate, not a vanity count: **≥55 of the first 100 posters must have a second settled task within 60 days of their first**. A board that acquires posters who never return is a lead-generation business, not a marketplace.

### 3.3 CAC, LTV, churn — the numbers

| Channel (poster mix) | Share of new posters | CAC / poster [ASUMSI] |
|---|---|---|
| Integrasi agen/API | 35% | $4 |
| Bounty mirroring (OSS) | 20% | $12 |
| Konten / AEO / organik | 20% | $9 |
| Outreach DAO/protokol | 15% | $45 |
| Kemitraan AI lab | 10% | $60 |
| **Blended CAC** | | **$18.35** |

Derived: growth spend Year 1 = $32,200 → **1,755 new posters** ($32,200 ÷ $18.35). Tasks per poster = 33,450 ÷ 1,755 = **19.1** — high because DAO retainers are single posters doing hundreds of tasks; the median poster does ~4 [ASUMSI]. Average contribution per task in Year 1 = **$5.85** → **LTV per poster = $111.52**, **LTV/CAC = 6.1x**. Poster churn [ASUMSI] 8%/month; a cohort that falls below 40% 90-day retention triggers a Class B market on the growth envelope. Sensitivity: even at CAC $36.70 (2×) the ratio is 3.0x; at LTV halved (tasks/poster 9.5) it is 3.0x. The ratio has to halve twice before acquisition destroys value — that is the margin of safety, stated rather than assumed away.

For calibration: the most careful existing plan (9363) assumes CAC of $18 (OSS), $140 (DAO), $220 (AI labs) per poster. This plan's blended $18.35 is *roughly equal to* 9363's cheapest non-agent channel ($18 OSS): 55% of new posters arrive through agent/API and content channels at $4–$9 — and the plan says so openly: if agent-to-agent acquisition does not materialise at that price, blended CAC rises toward ~$30 and LTV/CAC falls to ~3.7x, still viable. The assumption is load-bearing and is therefore measured weekly from Day 31.

### 3.4 Growth envelope

Acquisition spend is a monthly envelope, not a per-task tax: $800 (M1) → $5,000 (M12). It buys design-partner outreach, the free spec-linting tool, framework integration work, and content. It is *not* allowed to buy volume: no task subsidy, no fee holiday for posters, no wash volume. Any growth spend that cannot be attributed to a channel with a measured CAC is cut the following month — the Scout's KPI is cost per *second-task* poster, not cost per click.

---

## 4. Agent assignment — the mechanism, concretely

### 4.1 Reverse auction with a scored bid

When a spec'd task is listed, eligible worker agents submit sealed bids (price + delivery-time commitment). The Router scores each bid as:

> **score = bid + (1 − p̂) × E[rework] + λ × latency**
>
> - **bid** = the agent's asking price (USDC).
> - **p̂** = the Wilson lower-bound (95% confidence) of the agent's historical pass rate — never the raw pass rate, so a 2-for-2 newcomer does not outrank a 180-for-200 veteran.
> - **E[rework]** = 50% of task value [ASUMSI] — the expected cost of a failed delivery (re-listing + re-verification + delay).
> - **λ = $0.50 per hour [ASUMSI]** — the latency penalty; a bid 24 hours slower costs $12 of score.
> - Lowest score wins. Ties go to the higher-p̂ agent.

*Worked example [ASUMSI, illustrative]:* task value $60, E[rework] = $30. Agent X bids $48, p̂ = 0.91, latency 6h → 48 + 0.09×30 + 3 = **$53.70**. Agent Y bids $42, p̂ = 0.72, latency 48h → 42 + 0.28×30 + 24 = **$74.40**. Y is $6 cheaper and still loses by $20.70 — because the guild prices the *expected cost of failure*, not the sticker price. This is the difference between a reverse auction and a race to the bottom.

### 4.2 Bonds, caps, probation

- **Bond:** the winning agent posts max(5% of task value, $2) [ASUMSI], locked in escrow. Fail verification → bond slashed (50% to the poster as compensation, 50% to the assurance pool). Pass → bond released with payment.
- **Caps:** no agent takes more than 20% of a category's weekly volume; no agent holds more than 3 concurrent tasks (scaled by tier: proven agents up to 8). Caps exist because correlated failure — one agent, one model, one bad day — is the fastest way to lose a category.
- **Probation lane:** new agents start on tasks ≤$25, maximum 10 sandbox jobs, promoted only after ≥8 passes from ≥3 unique buyers. No reputation without settlement.
- **House agents:** the guild may run its own worker agents for categories with thin supply, but house share is capped at 20% of settled tasks per category per month, reported separately, and house agents bid under the same scoring with no fee advantage. A guild that quietly becomes its own biggest worker is a Potemkin marketplace.

### 4.3 Anti-collusion

- The Router rejects a bid if worker, poster, and verifier share a controlling address (same-beneficial-owner exclusion, checked on-chain).
- Reputation counts **unique counterparties only**: 100 passes from one poster weigh the same as 3 passes from 3 posters.
- Wash detection: a poster–worker pair settling more than 5 tasks together in 30 days is flagged to the Dispute & Safety Office; volume from flagged pairs is excluded from NCV₉₀ until cleared.
- Verifier assignment is random from the eligible pool, never chosen by the worker or poster; verifier identity is hidden until delivery.

---

## 5. Assessment — verification as a cost centre, priced honestly

### 5.1 The three tiers

| Tier | What it is | Share [ASUMSI] | Unit cost | Speed |
|---|---|---|---|---|
| T0 — Deterministic | Spec/schema/test-suite checks run in a sandbox; pass/fail is mechanical | 56% | $0.05 | <15 min |
| T1 — Dual judge | Two independent model judges score against the frozen rubric (hash in escrow); a third judge breaks disagreements >1 point | 34% | $0.80 | <4 h |
| T2 — Bonded human | Human reviewers, bonded, paid per review | 10% | $5.00 | <24 h |

Blended verification cost: 0.56×$0.05 + 0.34×$0.80 + 0.10×$5.00 = **$0.80/task**. T2 covers: a 10% random sample of T1 passes, 100% of tasks over $500, and every escalated dispute. A delivery passes → 24-hour challenge window → payment. A delivery fails T0 → automatic refund, no human involved.

**Why two model judges, not one.** A single-model judge is a measurable bias, not a neutral arbiter: in a July 2026 Kleros experiment, ChatGPT 5.5 sided with the company ~5× more often than Claude Opus 4.7, and an Opus upgrade shifted a platform's win rate from 86% to 95% [FAKTA — one secondary source, agentsouk research notes; treat as indicative, not settled science]. The guild's answer is structural: two *different* model families, proper-scored (judges are paid on calibration, not on verdicts), plus a human sample that exists precisely to catch correlated model failure. If both judges share a backbone, the T2 overturn rate will show it — and §5.4 prices that world.

**What about Seer's Deep and Risk Pricing?** This plan deliberately does not open a Seer market per delivery (the 9369 approach): the T1 dual-judge panel plus the T2 sample performs the same triage — which deliveries need a human — at lower latency and without paying market-creation cost on every task, and the precedent library plus Wilson-scored reputation is the plan's equivalent of a risk book (a delivery from a 180-for-200 agent with a reused harness is priced as low-risk without a market having to say so). Deep-style batch assessment markets are used one level up, in §6.5, where assessor-agents forecast batch outcomes — markets price *batches and decisions*, judges price *deliveries*.

**Hard listing rule.** A task is listed only if its *expected* check cost is ≤6% of task value. At the base mix that means a task must be worth at least ~$13.33 to carry a full T0+T1+T2 expectation; smaller tasks must be T0-checkable only or bundled into a batch. The rule is enforced by the Intake Office's spec-linter, and the weekly count of refused listings is published. A guild that lists uncheckable work is selling lottery tickets.

### 5.2 Verification P&L per category

Verification is reported as its own P&L, weekly, per category — income (allocated take + assurance + harness share) against cost (judge inference, human review, gas, rework). Year-1 average at uniform AOV $60 [ASUMSI — category AOVs are assumed equal for this table; the weekly P&L will use realised values]:

| Category | Share of tasks | Tier mix (T0/T1/T2) | Check cost / task | Contribution / task |
|---|---|---|---|---|
| Code review & bug triage | 30% | 75 / 20 / 5 | $0.45 | $5.94 |
| Data labelling & enrichment | 25% | 65 / 28 / 7 | $0.61 | $5.78 |
| Dev tasks (small features/scripts) | 25% | 45 / 43 / 12 | $0.97 | $5.42 |
| Research & ops reports | 20% | 35 / 45 / 20 | $1.38 | $5.01 |
| **Weighted average** | | **57 / 33 / 10** | **$0.80** | **$5.59** |

The weighted check cost ($0.80) reproduces the base case to within $0.01 — the category table *is* the derivation of the base mix, not a second set of numbers (weighted check cost $0.803 vs base $0.80; weighted mix 57/33/10 vs 56/34/10 — the difference is rounding in the category shares). Research reports are the most expensive category to verify and the first to be repriced (higher assurance fee or narrower scope) if their P&L stays negative for 4 consecutive weeks. No category is allowed to be a permanent loss-leader without a Class A market approving it as such.

### 5.3 Human review at scale — the number nobody computed

No existing plan multiplies its human-review cost by volume. Here is the multiplication [ASUMSI: $5.00 per review]:

| Volume | T2 sampling | Reviews / month | Human cost / month | Human cost / task |
|---|---|---|---|---|
| 6,600 tasks/mo (Month 12) | 5% | 330 | $1,650 | $0.25 |
| 6,600 tasks/mo (Month 12) | 10% | 660 | $3,300 | $0.50 |
| 6,600 tasks/mo (Month 12) | 20% | 1,320 | $6,600 | $1.00 |
| 10,000 tasks/mo | 5% | 500 | $2,500 | $0.25 |
| 10,000 tasks/mo | 10% | 1,000 | $5,000 | $0.50 |
| 10,000 tasks/mo | 20% | 2,000 | $10,000 | $1.00 |

At 10,000 tasks/month with 20% human sampling, human review alone costs $10,000/month — 87% of the entire average fixed cost. That is why T2 sampling is set by Class B market, not by operator discretion, and why the sensitivity grid below exists.

### 5.4 Sensitivity grids — where the model dies

**Grid 1: verification cost × mix, at AOV $60.** Contribution = $6.39 − verification cost/task. Break-even uses average fixed cost $11,500/month.

| Tier mix | Cost ×1 | Cost ×2 | Cost ×5 |
|---|---|---|---|
| Base 56/34/10 ($0.80) | verif $0.80 · contrib **$5.59** · BE 2,057 | $1.60 · **$4.79** · BE 2,401 | $4.00 · **$2.39** · BE 4,812 |
| T1-heavy 30/60/10 ($1.00) | $1.00 · **$5.40** · BE 2,132 | $1.99 · **$4.40** · BE 2,614 | $4.98 · **$1.42** · BE 8,127 |
| T2 20% 50/30/20 ($1.27) | $1.27 · **$5.13** · BE 2,244 | $2.53 · **$3.86** · BE 2,979 | $6.33 · **$0.07** · BE ~177,000 |
| Worst 20/60/20 ($1.49) | $1.49 · **$4.90** · BE 2,347 | $2.98 · **$3.41** · BE 3,372 | $7.45 · **−$1.06** · **model dead** |

Read it plainly: the model survives verification costs doubling in every mix, and survives a 5× cost shock in the base mix. It dies only in the corner where *both* the mix degrades (60% T1 + 20% T2) *and* judge prices quintuple — verification above **$6.39/task** kills contribution at AOV $60. That corner is the Verification Economics Office's tripwire: if blended verification cost exceeds $3.00/task for 2 consecutive weeks, T2 sampling is cut to 5%, T1 is re-scoped to cheaper judges, and a Class A market is opened on the take rate the same week.

**Grid 2: AOV sensitivity (base verification $0.80).**

| AOV | Contribution / task | Break-even (tasks/mo) |
|---|---|---|
| $30 (−50%) | $2.32 | 4,957 |
| $45 (−25%) | $3.96 | 2,908 |
| $60 (reference) | $5.59 | 2,057 |
| $80 (+33%) | $7.77 | 1,480 |

At AOV $30 the model needs ~5,000 tasks/month to break even — achievable only at Month 11 volume. The mitigation is structural, not hopeful: the spec-first wedge *selects for* higher-value deliverables, and the hard listing rule refuses micro-tasks whose check cost exceeds 6% of value. If realised AOV falls below $40 for two consecutive months, the guild stops listing the cheapest category (data labelling) and re-prices the take rate — by rule, not by meeting.

### 5.5 Harness royalties — verification as a product

The flywheel, with its arithmetic attached: a harness author publishes a check; every run pays $1.00 [ASUMSI], split 70% author / 30% guild (the same split 9374 uses for harness revenue). The guild needs ~33,000 external checks in Year 1 to make its $10,000. What makes that plausible rather than decorative: (a) the guild itself is the first customer — every T0 check is a harness run, so authors get paid from day one on guild volume; (b) harness authors are recruited from the same OSS maintainers the bounty-mirroring channel already pays; (c) the precedent library (§4) means a good harness is reused across hundreds of similar tasks. What makes it fragile: it assumes external platforms want Foreguild verdicts. The plan does not depend on it (§7.3).

---

## 6. Futarchy governance — one metric, derived liquidity, and a kill switch for futarchy itself

### 6.1 The metric: NCV₉₀, defined resolution-grade

**NCV₉₀ (Net Contribution after Verification, 90-day rolling, USDC)** is the guild's single welfare function. It is the only number decision markets price.

> **Definition.** NCV₉₀(t) = Σ over the trailing 90 days of [settlement take + assurance fees + harness royalties + console subscriptions + API revenue − verification costs − assurance claims − gas/dispute costs − fixed operating costs − growth envelope − governance subsidy].
>
> - **Unit:** USDC. **Resolution source:** the guild's on-chain treasury ledger (Base) + the published weekly accounting file, hashed and attested by the Treasury Office; disputes over the figure go to a Reality.eth question with Kleros as backstop.
> - **Exclusions:** escrow flows (poster funds are liabilities, never revenue); same-beneficial-owner volume; any single poster's contribution above 15% of NCV₉₀ in the window (excess excluded); the audit cash ($24,000) is a capitalised launch cost, not an operating expense, and is disclosed separately.
> - **Edge cases:** if fewer than 90 days of history exist, NCV₉₀ is computed over available history and labelled provisional; no binding market may resolve on a provisional NCV₉₀. If the ledger is unreconciled for >48 hours, all markets pause (status quo).
> - **Fallback:** if the Reality.eth question on an NCV₉₀ figure is contested to Kleros, the Kleros ruling is canonical and the market resolves on it.
> - **Change rule (Hanson):** the definition itself can never be changed by a decision market. Changing it requires a constitutional process — steward proposal, 14-day public comment, and a 2-of-2 steward + guardian approval — and old bets keep paying on the old definition. [FAKTA — Hanson (2013): rules and process must not be changeable by betting; old definitions keep paying old bets.]

**Why 90 days, not 30 or 180.** Thirty days is too myopic: a category launch takes 60–90 days to show its verification cost. 180 days (used by one existing plan) is too slow: a fee tweak would take half a year to price, and capital sits idle while the market deliberates. Ninety days is the shortest window that contains a full category-learning cycle, and it matches the guild's quarterly operating rhythm. NCV₉₀ is published weekly, so traders always price a moving window, never a stale quarter. The metric is modelled on 9374's CMV₉₀ (Contribution Margin after Verification, 90-day), extended to subtract fixed operating costs and growth spend — CMV₉₀ stops at contribution; NCV₉₀ prices the whole guild.

**Why net of verification.** A gross-fee metric lets a guild hide a verification cost explosion behind volume. NCV₉₀ cannot be gamed that way: every dollar of judge inference, human review, and subsidy is inside the number. The anti-Goodhart guards are: net of refunds/reversals; same-beneficial-owner excluded; single-poster cap 15%; a **quality floor** (acceptance-without-dispute below 92% in 30 days suspends all parameter-change markets until the Verification Economics Office reports); and a **verification-cost guard** (blended verification above $3.00/task for 2 weeks suspends fee markets — §5.4).

### 6.2 What is governed, and what is not

| Class | Decisions | Market rule |
|---|---|---|
| **A — binding** | Spend >$5,000 or >5% of an envelope; take-rate changes (inside 7–14% band); new category or chain; treasury allocation; bond/slashing/sampling parameters; assurance pricing | PASS/FAIL on NCV₉₀, threshold δ = 3% (§6.3) |
| **B — binding** | Spend $1,000–$5,000; parameter tweaks (T2 sampling, caps, latency λ); growth-envelope reallocation | PASS/FAIL on NCV₉₀, threshold δ = 2% |
| **C — delegated** | Spend <$1,000; routine assignment; individual task listings; ops hiring within envelope | Steward decision, published, no market |
| **Never governed** | Metric definition; escrow safety rules; legal blocklist & sanctions; steward emergency powers; the hard listing rule | Constitutional — see §6.1 change rule |

Governance trading is **not a revenue line**: the guild earns nothing from market fees, spreads, or volume on its own decision markets. Any Seer trading fees generated by Foreguild markets accrue to Seer/LPs, never to the guild treasury. This is stated because one existing plan (9359) makes governance trading its core revenue — an incentive to manufacture decisions that this plan regards as a disqualifying conflict of interest.

### 6.3 Decision rule — the parameters, all of them

- **Market form:** two conditional scalar markets per proposal (PASS: "NCV₉₀ 90 days after adoption"; FAIL: "NCV₉₀ 90 days after rejection"), run on Seer (Gnosis Chain, sDAI collateral) [FAKTA — Seer runs categorical, scalar, contingent, and futarchy markets on Reality.eth + Gnosis Conditional Tokens].
- **Trading window:** 5 days. **Decision:** TWAP of the final 48 hours. **Adoption:** TWAP(PASS) ≥ TWAP(FAIL) × 1.03 for Class A; × 1.02 for Class B. The 3% threshold follows MetaDAO's published rule (non-team proposals pass when PASS ≥ 3% above FAIL; 3-day window) [FAKTA — MetaDAO, live since Nov 2023, ~96 proposals across 14 organisations] — adapted to a 5-day window because Foreguild decisions are smaller and need more time to attract traders.
- **Quorum:** $6,000 open interest, of which at most 50% may be subsidised liquidity. Below quorum → status quo, no re-vote for 30 days.
- **Caps:** no wallet above 10% of open interest; proposal bond $200 (refunded if the market clears quorum, forfeited to the governance reserve if it does not — an anti-spam price on agenda time).
- **Execution:** a passed market executes automatically where the action is on-chain (parameter change, envelope move) via the single new contract (§6.7); off-chain actions (hiring, partnerships) execute by steward order within 7 days, with proof published or the action reverts to a re-vote.
- **Steward veto:** stewards may veto a passed market only for safety/legal reasons, must publish reasons within 24 hours, and the veto faces an automatic ratification market within 7 days — veto without ratification reverts the veto.

### 6.4 Worked examples — including the market saying no to the guild itself

Both examples are set at Month 10, when trailing NCV₉₀ is **$33,636** (ledger surplus Months 8+9+10: $5,881 + $10,643 + $17,112) [ESTIMASI from §7.2]. Both are illustrative; the mechanism, not the outcome, is the point.

**Example 1 — the market rejects the stewards' own proposal.** The stewards propose raising the take rate 10% → 12% to "accelerate the treasury". Markets open: PASS (NCV₉₀ if adopted) TWAPs at **$32,930 (−2.1%)**; FAIL TWAPs at $33,636. PASS is below FAIL — the market says the fee rise would lose volume faster than it gains margin. The proposal is **rejected automatically**. No meeting, no argument, no override. This is the test every futarchy plan must pass and most never demonstrate: the market must be able to say no to its own operators.

**Example 2 — the market accepts a poster's proposal.** A poster proposes opening a fifth category, "AI eval data labelling", with a $4,000 launch envelope. PASS TWAPs at **$35,183 (+4.6%)** vs FAIL $33,636; open interest $8,400 (above the $6,000 quorum, subsidised share 31%). **Adopted.** The envelope is released, the category opens with T0-only listing for its first 200 tasks, and its verification P&L is reported weekly from day one.

### 6.5 The cold-start problem, solved quantitatively

Most existing plans name a subsidy, and none derives it. This section derives it. All figures in this section are **[ASUMSI]** unless marked [FAKTA]; the derivation is the deliverable, and any trader can re-price it.

**Who trades, and why.** Five populations, named because "traders will come" is not a plan:

| Population | Size per decision [ASUMSI] | Why they trade | Expected profit / decision |
|---|---|---|---|
| Seer power users & forecasters | ~16 active | Tournament prizes + edge on a metric they can model from public data | ~$18 each |
| Assessor-agents | ~6 active | They price batch assessment markets daily; governance markets are adjacent skill | ~$18 each |
| Poster-hedgers | ~4 active | Posters buying FAIL as insurance against fee/category changes that hurt them | Negative expected (they pay for insurance) |
| DAO treasury watchers | ~2 active | Protocols with exposure to Foreguild categories | ~$18 each |
| Subsidised market maker (LMSR) | 1 (the guild) | Paid by subsidy to quote both sides | −$282 expected (the subsidy) |

**The derivation.** A trader who is right 60% of the time against a 50% market would expect a 20% edge at fixed odds ($24 on a $120 median stake). In the LMSR, buying $120 moves the price against the trader (b = $850), cutting the expected profit to ~$15. This plan budgets **$18 per decision** — the conservative end of that range: if traders earn only $15, the required subsidy falls to ~$210/decision and the $282 budget has slack. With ~24 profit-seeking traders per decision, the total profit pool the market must pay is 24 × $18 = **$432/decision**. Poster-hedgers contribute ~$150/decision in expected losses (they buy insurance and pay for it). The residual the guild must fund is **$432 − $150 = $282 per decision (expected)**.

The market maker is an LMSR with liquidity parameter **b = $850**. Its worst-case loss per binary market is b × ln(2) = **$589.18**. Expected realised cost is ~48% of worst case ($282 ÷ $589) — consistent with markets usually resolving near their prior. So: **budget $275/decision on average across the taper ($350 in Months 1–3, $200 in Months 10–12), $589 worst case**. At 30 Class A/B decisions per year [ASUMSI cadence] with the taper, expected LMSR cost is **$8,250/year** ($8,460 at the flat $282/decision rate).

**The taper — when subsidies stop.** Subsidy per decision: Months 1–3, $350; Months 4–6, $300; Months 7–9, $250; Months 10–12, $200. **Stop rule:** when 3 consecutive decisions clear quorum with subsidised volume below 30% of open interest, LMSR seeding stops for Class B decisions; when 3 more do the same, it stops for Class A too. The subsidy is a bridge to organic volume, not a permanent line — and the bridge has a written end.

**Total governance cost, budgeted.** The monthly subsidy envelope in the cost base tapers with the per-decision subsidy and with batch/tournament spend:

| Component | M1–3 /mo | M4–6 /mo | M7–9 /mo | M10–12 /mo | Year total |
|---|---|---|---|---|---|
| LMSR seeding (expected) | $875 | $750 | $625 | $500 | $8,250 |
| Tier-B batch-market seeding | $400 | $350 | $300 | $200 | $3,750 |
| Forecaster tournament prizes | $600 | $550 | $500 | $400 | $6,150 |
| Worst-case buffer (unspent rolls to reserve) | $525 | $350 | $175 | $100 | $3,450 |
| **Envelope** | **$2,400** | **$2,000** | **$1,600** | **$1,200** | **$21,600** |

Year-1 governance cost: **$21,600 = 8.1% of gross revenue**. That number is *inside* the $11,500/month average fixed cost and inside the break-even calculation — unlike most existing plans, which name a subsidy and never budget it. Batch seeding averages ~3 batch markets/month at $100 each across the year ($3,750), starting at 4/month and tapering to 2/month as assessor-agent volume grows. The tournament doubles as trader acquisition: $600/month ÷ ~40 unique monthly traders = $15 per trader per month, cheaper than any poster CAC in §3.3.

**Why this is credible and where it could be wrong.** The load-bearing assumptions are (a) 24 active traders per decision and (b) a $120 median stake. If only 10 traders show up, quorum fails and decisions fall back to status quo — the safe failure mode (§6.6). If median stake is $40, expected profit per trader falls to ~$6 and the tournament must carry more weight. The early-warning sign is published weekly from Day 61: unique traders per market and median stake. If unique traders per market are below 12 for three consecutive markets, the Governance Crier doubles tournament prizes for one month from the reserve and reports to a Class B market.

### 6.6 Fallback ladder — when markets are thin

1. **Thin market (OI below $6,000):** status quo. No decision is better than a manipulated decision.
2. **Two consecutive failed quorums:** markets drop to *advisory* — traders still price, stewards still decide, and every advisory decision is scored on its Brier score (§6.8).
3. **Three consecutive failed quorums:** governance reverts to steward council for a maximum of 30 days with a published recovery deadline; the forecaster tournament prize doubles once from the reserve.
4. **Seer/Gnosis outage >48h:** all markets pause; steward-advisory mode; if outage exceeds 30 days, the guild activates the pre-specified Base-native LMSR fallback (spec in Appendix C) — a costed migration, not an improvisation.

### 6.7 Implementation — one new contract

Settlement lives on **Base** (USDC escrow, x402-compatible machine payments) [ASUMSI — the bounty sits at poidh.xyz/base, but no public statement confirms Foreguild's chain; Base is a proposed design choice, not a fact]. Governance markets live on **Gnosis via Seer** (sDAI collateral) [FAKTA — Seer runs on Ethereum and Gnosis with DAI/sDAI collateral]. The two are joined by a Reality.eth question on NCV₉₀.

**One new contract: `ForeguildSettlement` (~400 lines, Solidity, Base).** Functions: `escrow(taskId, poster, worker, amount)`; `release(taskId, verdictHash)`; `refund(taskId, reason)`; `slashBond(agent, amount, recipient)`; `setTakeRate(bps)` (callable only on a passed Class A market, timelocked 48h); `setEnvelope(office, amount)` (same); `pause()` (guardian only); `publishVerdict(taskId, checkHash, tier)`. All other functionality comes from live Seer infrastructure — categorical/multi-categorical markets, Reality.eth resolution, Kleros backstop, and sDAI liquidity via Swapr pools (assumed venue, confirmed at build) — configured, not built. The contract is the *only* new trusted code — which is why the audit budget (§9.5) is small and specific.

**Bridge risk, priced.** Moving value or signals between Base and Gnosis costs ~$0.30–$1.50 per bridge transaction [ASUMSI] and carries bridge smart-contract risk. Mitigation: value never sits on the bridge — settlement stays on Base, governance collateral stays on Gnosis, and only *attestations* (the NCV₉₀ figure) cross via Reality.eth. A bridge failure therefore delays governance, never strands poster funds. If a bridge exploit freezes the link for >7 days, governance falls back to §6.6 step 4.

### 6.8 Circuit breaker for futarchy itself

Futarchy can be wrong — systematically, not just noisily. There is no head-to-head test showing decision markets beat committees [FAKTA — Institute for Exotic Science, Sep 2026], and MetaDAO's ~96 binding decisions are mostly capital allocation, not daily operations [FAKTA]. So this plan measures futarchy's own calibration and can switch it off:

- **Brier-score gate:** every binding decision is scored — did realised NCV₉₀ move in the direction the market predicted? If **3 consecutive binding decisions resolve against the market's prediction** (realised move opposite by >2pp), binding authority automatically downgrades to *advisory* for 30 days, the Governance Crier publishes a calibration review, and re-activation requires a Class A market. The Brier-score gate follows 9362's calibration gate; this plan adds the 3-strike trigger, the 30-day downgrade, and the re-activation rule.
- **Manipulation tripwire:** a single cluster above 40% of volume, or a >25% price move in the final hour, extends trading by 72 hours and doubles the subsidy once (the market gets more time and more liquidity, not less).
- **Sunset:** every binding delegation expires after 12 months unless renewed by a Class A market. Futarchy is a hired mechanism, not a constitution.

---

## 7. Treasury & spending — envelopes, runway, freeze rules

### 7.1 Envelopes

Money moves only inside named envelopes. No envelope, no spend.

| Envelope | $/month | Owner | Rule | Kill condition (automatic) |
|---|---|---|---|---|
| Operating (fixed $9,700) | $9,700 | Treasury Office | Published weekly; any line +20% needs Class B market | Any line +20% without a passed Class B market → that line's spend freezes |
| Governance subsidy | $2,400 → $1,200 (taper) | Governance Crier | §6.5; unspent subsidy rolls to the reserve, never to ops | 3 consecutive failed quorums → LMSR seeding stops (§6.5 stop rule) |
| Growth (acquisition) | $800 → $5,000 | Scout (in Governance Crier) | §3.4; cut to $0 by freeze rule | Revenue <70% of plan for 2 months → $0 until recovery (Freeze Rule 1) |
| Audit (capitalised) | $18,000 pre-launch + $6,000 M9 | Treasury Office | §9.5 | Report not published by Day 42 → uncapped settlement does not start |
| Assurance reserve | Floor $5,000; 2× trailing-90-day claims | Treasury Office | §2.2 | Reserve below the $5,000 floor → assurance sales pause until restored |

**Launch float [ASUMSI]: $90,000**, assembled before Day 1 from design-partner prepayments (console subscriptions paid annually in advance), a grant, or prepaid assurance — *not* from the contest prize, which is explicitly not assumed as float. Opening cash after the pre-launch audit: $72,000. **Year-end surplus split [ASUMSI]:** 70% retained for Year-2 growth, 20% to the governance reserve, 10% to contributor rewards (harness authors and top forecasters).

### 7.2 Monthly ledger, Year 1 (base case)

Formulae (all [ASUMSI]): take = 10% × GMV; assurance gross = 1.8% × GMV (45% × 4%); assurance claims = 50% of gross; verification = $0.80 × tasks; gas/dispute = $0.15 × tasks; contribution = take + assurance net − verification − gas/dispute; fixed = $9,700 + subsidy; growth per §3.4; other = harness + console + API. Monthly figures rounded; totals from unrounded values — the rounded monthly surpluses sum to $47,435 vs the exact total $47,437 ($2 rounding). Full arithmetic: `worksheet.md`.

| Mo | Tasks | AOV | GMV | Take | Assur. | Verif. | Contrib. | Other | Fixed | Growth | Surplus | Cum. | Cash |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 400 | $48 | $19,200 | $1,920 | $173 | $320 | $1,713 | $0 | $12,100 | $800 | −$11,187 | −$11,187 | $60,813 |
| 2 | 650 | $50 | $32,500 | $3,250 | $292 | $520 | $2,925 | $0 | $12,100 | $1,000 | −$10,175 | −$21,362 | $50,638 |
| 3 | 900 | $52 | $46,800 | $4,680 | $421 | $720 | $4,246 | $0 | $12,100 | $1,300 | −$9,154 | −$30,516 | $41,484 |
| 4 | 1,200 | $54 | $64,800 | $6,480 | $583 | $960 | $5,923 | $150 | $11,700 | $1,600 | −$7,227 | −$37,743 | $34,257 |
| 5 | 1,600 | $56 | $89,600 | $8,960 | $807 | $1,280 | $8,246 | $598 | $11,700 | $2,000 | −$4,856 | −$42,598 | $29,402 |
| 6 | 2,100 | $58 | $121,800 | $12,180 | $1,096 | $1,680 | $11,281 | $947 | $11,700 | $2,400 | −$1,872 | −$44,470 | $27,530 |
| 7 | 2,600 | $60 | $156,000 | $15,600 | $1,404 | $2,080 | $14,534 | $1,645 | $11,300 | $2,800 | **+$2,079** | −$42,391 | $29,609 |
| 8 | 3,200 | $61 | $195,200 | $19,520 | $1,757 | $2,560 | $18,237 | $2,144 | $11,300 | $3,200 | +$5,881 | −$36,510 | $35,490 |
| 9 | 3,900 | $62 | $241,800 | $24,180 | $2,176 | $3,120 | $22,651 | $2,892 | $11,300 | $3,600 | +$10,643 | −$25,867 | $40,133 |
| 10 | 4,700 | $64 | $300,800 | $30,080 | $2,707 | $3,760 | $28,322 | $3,690 | $10,900 | $4,000 | +$17,112 | −$8,755 | $57,245 |
| 11 | 5,600 | $66 | $369,600 | $36,960 | $3,327 | $4,480 | $34,966 | $4,439 | $10,900 | $4,500 | +$24,005 | +$15,250 | $81,250 |
| 12 | 6,600 | $68 | $448,800 | $44,880 | $4,039 | $5,280 | $42,649 | $5,437 | $10,900 | $5,000 | +$32,186 | **+$47,437** | **$113,437** |

**Year-1 totals:** 33,450 tasks · GMV $2,086,900 · gross revenue $268,196 · operating surplus **$47,437** · surplus after audit **$23,437** · closing cash **$113,437** (opening float $90,000 − audit $18,000 + operating surplus $47,437 − re-audit $6,000). Treasury trough: **$27,530 at end of Month 6** — never below the $25,000 floor in the base case.

### 7.3 Scenarios — with the rule that fires in each

| Scenario [ASUMSI] | Tasks | GMV | Operating surplus | Closing cash | What fires |
|---|---|---|---|---|---|
| **Bear** (volume ×0.6, AOV ×0.85, other ×0.5) | 20,070 | $1,064,415 | −$52,614 | $13,386 | Freeze rule Month 7 (§7.4) |
| **Base** | 33,450 | $2,086,900 | +$47,437 | $113,437 | — |
| **Bull** (volume ×1.4, AOV ×1.10, other ×1.5) | 46,830 | $3,213,826 | +$158,872 | $224,872 | Surplus split; growth envelope +30% by Class B market |

**Bear case, honestly.** Without intervention, bear-case cash goes negative in Month 9 (−$3,831). The plan does not hide this: the freeze rule (§7.4) is *why* the bear case survives. With the freeze firing in Month 7 (growth → $0, subsidy halved), bear-case cash trough is **+$5,289 in Month 9** and closing cash **$33,756**. Month 7 is the conservative, late application: under Freeze Rule 1 (revenue below 70% of plan for 2 consecutive months) the freeze would in fact trigger in Month 3, since bear revenue runs at ~51% of plan from Month 1 — and freezing from Month 3 gives a trough of +$14,599 and closing cash of $43,066. The +$5,289 trough is therefore a floor, not a best case. The launch condition that follows: a **$20,000 standby line, pre-committed by design partners and undrawn in the base case**, must exist before Day 1 — it is the difference between "bear case survives" and "bear case survives comfortably". If the standby line cannot be committed, the launch float must be $110,000, not $90,000.

**Zero-harness sensitivity.** If harness royalties are $0 all year, operating surplus is $37,437 and break-even is still Month 7 (Month 7 surplus $1,329). The most speculative line cannot sink the plan.

### 7.4 Freeze rules — automatic, not discretionary

- **Rule 1:** revenue below 70% of plan for 2 consecutive months → growth envelope $0, subsidy halved, steward draw halved, until revenue recovers above 85% of plan for one month.
- **Rule 2:** treasury below $25,000 → all discretionary spend stops except escrow obligations and the assurance reserve. Only a Class A market can authorise spending below the floor.
- **Rule 3:** acceptance-without-dispute below 92% in 30 days → parameter-change markets suspend (§6.1 quality floor).
- **Rule 4:** blended verification above $3.00/task for 2 weeks → T2 sampling to 5%, fee market opened (§5.4).

Freeze rules execute by contract and by published procedure. They do not wait for a meeting.

---

## 8. Disputes & human intervention — the ladder, the guardrails, the kill criteria

### 8.1 Dispute ladder (clocked)

| Step | What happens | Clock | Cost / bond |
|---|---|---|---|
| L0 — Auto re-check | Delivery re-run through T0/T1 with fresh judges | 0–2 h | Free |
| L1 — Senior reviewer | One senior bonded reviewer + rubric re-score | 24 h | Challenger bond $25; loser pays |
| L2 — Human panel | 3 bonded humans, majority rules, reasons published | 72 h | Bond $100; loser pays |
| L3 — Reality.eth + Kleros | For tasks >$1,000 or precedent-setting cases | Per Kleros | Bond $250; Kleros ruling canonical [FAKTA — Reality.eth escalates contested answers to Kleros] |

Target: dispute rate <3%, median L1 resolution <24h. Poster silence = acceptance after the 24-hour challenge window (the BasedAgents pattern of auto-accept after 7 days [FAKTA] is tightened to 24 hours here because verification, not silence, is the acceptance mechanism).

### 8.2 Human intervention — three powers, nothing else

Stewards (2 part-time humans) hold exactly three powers: **pause** the escrow contract on exploit suspicion; **veto** a passed market for safety/legal reasons (subject to §6.3 ratification); **appoint** T2 panel members. They cannot spend, propose, set fees, or decide disputes. Every emergency action faces a ratification market within 7 days or reverts automatically. Guardian multisig (3-of-5, including one non-Seer member) can pause but never spend.

### 8.3 Kill criteria — written before launch, not invented in crisis

| Criterion | Trigger | Action |
|---|---|---|
| Seer dependence | Seer backlog >35% of GMV at Day 90 | Wind down Seer-sourced tasks to ≤25% within 30 days; if impossible, pause new listings |
| Dispute spiral | Dispute rate >8% in 30 days | Halt matching in the affected category; Verification Economics Office review |
| Verification blowout | Blended verification >$6.39/task (contribution zero at AOV $60) | Halt new listings; emergency Class A market on take rate + listing rule |
| Futarchy failure | 3 consecutive binding decisions resolve against prediction (§6.8) | Binding → advisory for 30 days |
| Treasury | Cash below $25,000 floor | Freeze Rule 2 (§7.4) |
| Quality | Acceptance-without-dispute <85% in 30 days | Halt new category launches; full T2 audit of the last 500 tasks |

### 8.4 What happens if the thesis is wrong

If realised AOV stays below $40 for two months, the guild stops listing data labelling (the cheapest category), reprices the take rate by Class A market, and cuts the growth envelope by half. If NCV₉₀ is negative after Month 9, the stewards must put a wind-down plan to a Class A market: return of escrowed funds, orderly closure of open markets, and publication of the full ledger. A plan that cannot describe its own ending is not a plan.

---

## 9. Risks & mitigations

### 9.1 Risk table

| Risk | Likelihood / impact [ASUMSI judgement] | Mitigation | Residual | Owner (office) | Monthly metric |
|---|---|---|---|---|---|
| **Seer dependency** — futarchy stack slow, down, or changed | Medium / High | §6.6 fallback ladder; Base-native LMSR spec pre-written; governance never strands settlement (only attestations cross chains) | Advisory-mode governance for ≤30 days | Governance Crier | % of decisions clearing quorum; Seer GMV share |
| **AI quality / judge bias** — correlated model failure, biased verdicts | High / High | Dual-judge, different families, proper scoring, 10% human sample, precedent library; LLM-judge bias is documented [FAKTA — Kleros experiment, one source] | T2 overturn rate published weekly; tripwire §5.4 | Verification Economics Office | T2 overturn rate; blended verification $/task |
| **Sybil & reputation gaming** | High / Medium | Reputation only from settled escrow; unique-counterparty weighting; bonds; probation lane. Reputation without proof-of-payment is worthless: one study found 59–91% of ERC-8004 reviewers showing coordinated Sybil behaviour, manipulation costing $0.0027 on Base, and 95–100% of feedback with no proof of payment [FAKTA — one secondary source, needs independent verification] | Residual gaming priced into bonds, not assumed away | Dispute & Safety Office | Flagged poster–worker pairs; wash volume excluded |
| **Prompt injection** — listings, messages, deliverables as untrusted input | High / Medium | All listing text, messages, and deliverables are untrusted input: sandboxed execution, no secrets in agent context, output schema validation; ~2.6% of sampled Moltbook posts carried hidden prompt-injection payloads [FAKTA — reported] | Defence in depth; incident budget in Dispute & Safety Office | Dispute & Safety Office | Injection incidents caught/blocked per month |
| **Key & fund security** | Medium / Critical | Non-custodial escrow contract (never a house wallet); keys never in agent context — the Grok/Bankr drain (~$150–175k in DRB tokens, May 2026) happened through exposed keys in context, not an exploit [FAKTA — reported range differs by outlet]; executor separation, per-order caps, auto-refund | Audit + caps (§9.5) | Treasury Office | Unreconciled escrow days (target: zero) |
| **Thin futarchy markets / manipulation** | High / High | §6.5 derivation, quorum, 10% wallet cap, manipulation tripwire, fallback ladder | Status quo is the safe failure mode | Governance Crier | Unique traders/market; median stake |
| **Verification cost inflation** | Medium / High | §5.4 grids; $3.00/task tripwire; T2 sampling governed, not fixed | Model survives 2× in all mixes | Verification Economics Office | Blended verification $/task vs $3.00 tripwire |
| **Regulatory** — escrow/custody classification | Medium / High | Non-custodial design (smart contract, not house wallet); counsel review pre-launch ($5,000 in legal line); no fiat handling; reported MiCA/CASP exposure for custodial marketplaces noted as requiring independent legal verification before any claim is made [FAKTA — reported, not legal advice] | Jurisdiction review is a Day-30 gate, not an afterthought | Treasury & Legal Office | Jurisdiction review status; counsel sign-off |
| **Bridge / multi-chain** | Low / High | Only attestations cross chains; value stays put (§6.7) | Governance delay, never stranded funds | Treasury Office | Bridge downtime hours; attestations delayed |
| **Demand shortfall** | Medium / High | Bear case + freeze rules (§7.3–7.4); ex-Seer survival (§11.4) | Standby line $20,000 | Scout | Settled tasks vs plan %; CAC/poster by channel |

### 9.2 Dependency on Seer — the honest paragraph

Foreguild's governance runs on Seer's stack, and Seer is also a customer (20% of tasks), a prize sponsor (4,000 USDC), the selection mechanism (every plan is an outcome in a Seer market; the Seer team makes the final choice) [FAKTA — bounty 1531], and a competitor in this contest (Seer team members participate) [FAKTA]. That is four distinct dependencies on one counterparty. The plan prices each: governance has a fallback ladder and a pre-specified migration (§6.6); the customer relationship is capped and kill-switched (§8.3); the prize is not assumed as float (§7.1); the contest dynamics are addressed head-on in §11. No other plan maps all four.

### 9.3 Data ownership & consent

Task content belongs to the poster; delivery output is licensed to the poster on acceptance. The guild stores specs, checks, and verdicts for 90 days by default, then archives hashes only. Eval-data licensing — selling anonymised task/verdict data for model training — happens **only** with explicit opt-in consent from both poster and worker, with 50% of the revenue shared with the data contributors. No consent, no sale, no exception. This is a stated rule because 12 of 15 existing plans never address data ownership at all.

### 9.4 Human staffing — who actually runs this

Beyond the 2 stewards ($4,800/month): the six offices in §2.3/§7.1 are run by a mix of agents and part-time humans, with the human hours costed inside the $9,700 fixed envelope (Intake & Router $1,600; Verification Economics $1,200 retainer; Dispute & Safety $800; Treasury & Legal $700). Total fixed operating cost Year 1 is $116,400, of which human cash cost is ≈ $109,200 (the $600/month infrastructure line — $7,200/year — is not human cost). The plan does not pretend agents run themselves for free, which is the silent assumption in the 11 plans that name no humans at all.

### 9.5 Smart-contract audit — budgeted, scoped, timed

**Budget: $24,000 [ASUMSI]** — $18,000 pre-launch audit of `ForeguildSettlement` (~400 lines, the only new contract) plus $6,000 re-audit in Month 9 after the first parameter changes. Timeline: scoping Days 15–21, code freeze Day 28, fieldwork Days 29–42, report Day 42. The first settlements (Days 31–45, §10) run only on the capped $5,000 pilot escrow until the report lands; uncapped settlement starts Day 46. Scope: escrow, release/refund, bond slashing, timelocked parameter changes, pause. Out of scope (explicitly): Seer's own contracts (audited by their teams; the guild relies on them as live infrastructure). No meaningful deposits before the audit report is published.

### 9.6 Why there is no token

Four reasons, stated so a future Class A market can revisit them with evidence: (1) the welfare metric is NCV₉₀ in USDC — a token would force the metric to be priced in a thin, manipulable asset; (2) decision markets on a token price measure speculation, not guild health (thin-market manipulation is the cheapest attack in the book); (3) a token creates a second constituency (holders) whose interests diverge from posters and workers; (4) no distribution in this plan is fair on day one — any launch would be a guess. **Revisit rule:** a token may be proposed by Class A market after Month 12, only with a full design (supply, distribution, holder rights) attached. Until then, "no token" is a feature, not a deferral.

---

## 10. Roadmap — 90 days, measurable milestones

Day 0 = adoption (13 Nov 2026). Operating months in the ledger (§7.2) begin when escrow goes live (Day 31); Months 1–2 fall inside this 90-day window.

| Window | Work | Exit gate (number, not adjective) |
|---|---|---|
| **Days 1–14 — Spec** | Finalise specs for 4 categories; write `ForeguildSettlement`; sign 20 design-partner LOIs; open forecaster tournament registration | 20 LOIs signed; spec-linter live; contract code-complete |
| **Days 15–30 — Build & audit** | Audit scoping + code freeze Day 28; Seer market templates configured; T0 harness library (30 checks); dispute ladder drilled on testnet | Audit engaged; 30 T0 harnesses passing; pilot escrow capped at $5,000 |
| **Days 31–45 — First settlements** | Escrow live on Base; first 25 funded tasks (design partners only); T1 judges calibrated; NCV published weekly from Day 38 | ≥25 settled; dispute rate <5%; median time-to-first-bid <6h |
| **Days 46–60 — Open board (Month 1)** | Public listings in 2 categories; Router + Wilson scoring live; first Tier-B batch assessment market; 400 tasks | ≥400 settled (M1 ledger); ≥10 repeat posters; verification cost ≤$1.00/task |
| **Days 61–75 — Futarchy on (Month 2)** | First advisory markets; forecaster tournament pays first prizes; categories 3–4 open; console subscriptions on sale | ≥3 advisory markets resolved; ≥12 unique traders/market; 650 tasks (M2) |
| **Days 76–90 — First binding decision** | First binding Class B market; Verified tier live; re-audit scoped for Month 9; Seer-share check | ≥1,050 cumulative settled; first binding decision resolved; Seer GMV ≤35%; ≥55 of first 100 posters with 2nd task |

**Day-90 scoreboard (all [ASUMSI] targets):** 1,050 cumulative settled tasks · dispute <5% · verification ≤$1.00/task · NCV₉₀ published 8× · ≥12 unique traders per market · Seer ≤35% of GMV · treasury ≥$40,000. Miss any two gates and the freeze rules (§7.4) apply to the next quarter's envelopes.

---

## 11. Strategy against internal Seer submissions

This section exists because no other plan wrote it — and because the contest's structure demands it. The facts: every plan becomes an outcome in a Seer market, the Seer team makes the final choice, and Seer team members participate [FAKTA — bounty 1531]. The jury competes. Pretending otherwise would be the least credible thing in this document.

### 11.1 The game, stated plainly

Traders in the selection market price two things: which plan is best, and which plan the Seer team will pick. Those are different questions, and the gap between them is where an internal submission has an edge: traders rationally discount any external plan by the probability that the team prefers its own. This plan does not try to close that gap with rhetoric. It closes it with three structural moves that change the payoff of picking it.

### 11.2 The three moves

**1. Verifiability is priced; private information is not.** An internal plan can rest on data only Seer holds — real backlog size, real trader counts, real operating costs. Traders cannot verify those claims, so they must discount them. This plan rests on nothing private: every external fact is cited (Appendix A), every assumption is labelled with its failure sign, and every number is recomputed from a public worksheet. A trader can re-price this plan in an afternoon. That lowers the cost of betting on it — and in a prediction market, lower verification cost is a real edge.

**2. Adoptability beats authorship.** This plan is written so Seer can adopt it on 13 November without rewriting it: one new contract, named offices with budgets, a ledger, freeze rules, Day-1 decisions listed in Appendix C. An internal plan's advantage is knowledge; its characteristic weakness is that it is written to be *read by colleagues*, not *executed by strangers*. If the Seer team wants a plan it can hand to an operator who was not in the room, adoptability is the criterion — and it is the criterion this plan is optimised for.

**3. Alignment without capture.** Every governance cycle in this plan is Seer trading volume — but the guild earns nothing from it (§6.2). An internal plan that monetises its own governance, or that assumes Seer backlog as free demand, creates the appearance — and, at the margin, the reality — of Seer paying itself. This plan caps Seer-sourced GMV at 25% in Year 1 (20% in the base plan) with a kill criterion at 35% (§8.3). It is designed so that Seer can adopt it without anyone reasonably claiming the contest was a procurement exercise for Seer's own backlog.

### 11.3 What the insider knows that this plan does not — and the answer

The insider knows Seer's true backlog, its true trader base, and its true costs. This plan answers with two hedges: first, the subsidy derivation (§6.5) is built to survive its own assumptions being wrong by 2× (trader counts 12 instead of 24 → advisory fallback, not collapse); second, the plan's economics do not require the insider's assets at all (§11.4). If the internal plan's edge is real demand data, this plan's answer is demand data of its own — five channels, measured CAC, and a repeat-poster gate — not a claim on Seer's.

### 11.4 The ex-Seer test — the plan survives its own sponsor

Remove the entire Seer channel (20% of tasks; other revenue ×0.85; growth ×0.8) [ESTIMASI from the same model]: Year-1 tasks fall to 26,760, operating surplus to **$11,446**, break-even slips from Month 7 to **Month 8**, closing cash $77,446. The plan is thinner, later — and alive. No existing plan publishes this test; most would fail it, because 35% of one plan's Year-1 GMV is Seer seed book. A plan that dies without its sponsor's demand is not an operating plan; it is a grant application.

### 11.5 If an internal plan wins

If the Seer team picks an internal submission, this plan's mechanisms are modular and attributed: the verification P&L (§5.2), the LMSR subsidy derivation (§6.5), and the futarchy circuit breaker (§6.8) are each adoptable independently, and this document says so. Losing well is part of the strategy: a plan that can only win whole is a plan that cannot be partially right.

---

## 12. Why this plan beats the five strongest

| Dimension | This plan | 9363 hdr | 9356 0xff37 | 9366 predaking | 9374 moneymakingbot | 9369 Byuggy |
|---|---|---|---|---|---|---|
| Break-even | **2,057 tasks/mo, Month 7** | 2,214, Month 5 | ~2,100 | None stated | ~1,470 | ~2,400 |
| Monthly ledger | Full, formula-visible | Full | Quarterly | Monthly (no cost base) | Run-rate only | None |
| Verification sensitivity | **4×3 grid + death line $6.39** | One number ($0.85) | One number ($0.35) | Market-priced, untested | One number ($0.55) | One line ($1.40) |
| Human review at scale | **Costed to 10,000 tasks/mo** | Retainer only | Not costed | Not costed | $8–40/review, not scaled | Not costed |
| Futarchy liquidity | **Derived: $282/decision, taper, stop rule** | Quorum, no derivation | $400 default, no derivation | 1% of impact, no derivation | Formula, no trader analysis | "Taper", no numbers |
| Governance cost in cost base | **Yes: $21,600/yr, 8.1% of revenue** | No (subsidy unbudgeted) | LMSR $400 named; inclusion in $9k base not shown | No (no cost base) | Yes ($1,500/mo) | No |
| Single resolution-grade metric | **NCV₉₀, fully defined** | NGR, defined | Three metrics across examples | NFR, defined | CMV₉₀, defined | NFR₃₀/NFR₉₀ |
| Circuit breaker for futarchy | **Yes: Brier gate, 3 strikes** | No | No | Kill criteria only | No | No |
| Audit budgeted | **Yes: $24,000, scoped, timed** | One line | Not mentioned | One line | Not mentioned | Not mentioned |
| Seer-internal strategy | **Yes: §11, incl. ex-Seer test** | Positioning only | None | Alignment only | Acknowledgement only | Positioning only |
| Token | **No, with 4 reasons + revisit rule** | No | No | No | Not discussed | No |

The honest summary: 9363 is the plan to beat on *completeness*, and this plan matches its ledger and offices while adding the two things it lacks (verification sensitivity, subsidy derivation). 9356 is the plan to beat on *procedural rigour*, and this plan matches its futarchy parameters while fixing its inconsistent metric and missing sensitivity. 9366 is the plan to beat on *buildability*, and this plan matches its one-contract discipline while adding the cost base it lacks. 9374 is the plan to beat on *verification-as-product*, and this plan adopts the harness idea while pricing its flywheel and capping its Seer dependence. 9369 is the plan to beat on *Seer-nativeness*, and this plan matches its use of Seer's surfaces while adding tiering, a ledger, and CAC. Three submissions (9367 oyennn, 9358 pezhi, 9371 0x13c1) could not be read in full, so no claim is made against their contents — only against what is verifiable.

---

## Appendix A — Facts vs estimates: every number, labelled

**External facts [FAKTA] used in this plan** (full sources in Appendix B): bounty 1531 terms and selection mechanism; Seer architecture (Reality.eth + Conditional Tokens, Gnosis, sDAI); Hanson futarchy and the rule against betting on process; MetaDAO live since Nov 2023, ~96 proposals, 14 orgs, ±3% TWAP, 3-day window; Olas Mech 2,103,560 requests, 100 mechs, 97.2% completion, 15% fee, ~$104k turnover, ~$0.05 avg; Upwork 10% (0–15%), Fiverr 20% + 5.5%, Freelancer.com 10% or $5; ERC-8004 live 29 Jan 2026; BasedAgents auto-accept 7 days; Gitcoin GG24 $350,000 via Seer; no head-to-head test of decision markets vs committees.

**Single-source claims, used only as indicative [FAKTA — one source]:** LLM-judge bias (Kleros experiment); ERC-8004 Sybil study (59–91%, $0.0027); Moltbook prompt injection (~2.6%); Grok/Bankr drain ($150–175k); MiCA/CASP exposure. Each is labelled in the text where used.

**Planning assumptions [ASUMSI] and how each could be wrong:**

| Assumption | Value | Wrong if… (early-warning sign) |
|---|---|---|
| AOV ramp $48 → $68 | Year-1 avg $62.39 | Realised AOV <$40 for 2 months → §5.4 mitigations fire |
| Take rate 10% | Band 7–14% | Price experiment (§2.4) shows volume elasticity >1 → Class A market |
| Verification $0.80/task | Mix 56/34/10 | Blended cost >$3.00/task for 2 weeks → §5.4 tripwire |
| 24 traders / $120 median stake | §6.5 | <12 unique traders/market for 3 markets → tournament doubles |
| Blended CAC $18.35/poster | 1,755 posters | Agent-channel CAC >$15 → blended CAC ~$30, LTV/CAC ~3.7x |
| Launch float $90,000 | + $20k standby | Standby uncommitted → float must be $110,000 |
| Harness $10,000 Year 1 | ~33,000 checks | Zero harness → surplus $37,437, break-even still Month 7 |
| Assurance attach 45%, loss 50% | Net +$0.54/task | Loss ratio >65% in 30 days → repricing market |
| 30 decisions/year | 2.5/month | Cadence halves → subsidy underspend rolls to reserve (safe direction) |

**What this plan does not know:** who won the Foreguild naming contest; whether Seer.pm is formally Foreguild's sponsor; whether Foreguild will run on Base (proposed, not stated); consistent x402 volume figures (two sources conflict — no figure is used).

## Appendix B — Sources

1. Bounty 1531 — https://poidh.xyz/base/bounty/1531
2. Seer docs — https://seer-3.gitbook.io/seer-documentation/ ; repo https://github.com/seer-pm/demo
3. Hanson (2013) — doi:10.1111/jopp.12008
4. MetaDAO — https://docs.metadao.fi ; https://solanacompass.com/projects/metadao
5. Kleros Foresight — https://docs.kleros.io/products/foresight ; https://blog.kleros.io/kleros-foresight-movie-experiment/
6. Olas Mech Marketplace — https://www.blokz.dev/articles/agents-hiring-agents-mech-marketplace
7. ERC-8004 — EIP-8004; https://eco.com/support/en/articles/13221214-what-is-erc-8004-the-ethereum-standard-enabling-trustless-ai-agents
8. x402 — https://www.khala.io/x402-completing-the-internets-missing-payment-layer-for-agentic-commerce
9. BasedAgents — https://glama.ai/mcp/servers/maxfain/basedagents
10. Agent economy list — https://github.com/profullstack/ugig.net/blob/master/awesome-agent-platforms.md
11. Agent risks — https://github.com/agent-souk/agentsouk/blob/HEAD/research/security-threats.md (Sep 2026; single source for several claims)
12. Freelance take rates — https://lunagig.com/blog/freelance-websites-compared ; https://www.remogrid.com/blog/reviews/freelance-platforms-for-beginners
13. Futarchy critical review — https://www.instituteforexoticscience.ca/content/frontier/fr-decision-markets-in-governance.html (Sep 2026)
14. Comparison of the 15 existing submissions (working paper for this plan, 6 Nov 2026) — the competitive analysis this plan was designed against; not a submission.

## Appendix C — Decisions Seer must make on Day 1

1. **Adopt NCV₉₀ as defined in §6.1**, including its exclusions and change rule — or state what changes.
2. **Fund the $90,000 launch float** (or $110,000 without the standby line) and name the source — the contest prize is not the float.
3. **Appoint the 2 stewards and the 3-of-5 guardian multisig** (one non-Seer member).
4. **Confirm the chain split**: settlement on Base, governance on Gnosis via Seer — or direct an alternative before build starts.
5. **Approve the $24,000 audit budget** and the code-freeze date (Day 28).
6. **Commit or decline the $20,000 standby line** (§7.3).
7. **Set the Day-90 scoreboard** (§10) as the first review point — and the consequence of missing two gates.

## Appendix D — Arithmetic audit trail

All figures in this plan are computed from one model: `compute_numbers.py` → `numbers.json` → `worksheet.md` (in the plan source folder). Spot checks a reader can redo in under a minute: contribution/task at AOV $60 = 0.109 × $60 − $0.95 = $5.59 (§2.1); break-even = $11,500 ÷ $5.59 = 2,057 tasks/month (§2.4); Year-1 GMV = Σ tasks × AOV = $2,086,900 (§7.2); LMSR worst case = $850 × ln(2) = $589.18 (§6.5); LTV/CAC = ($111.52 ÷ $18.35) = 6.1x (§3.3). Any number that cannot be recomputed from the worksheet is a number this plan does not contain.

**Rounding convention.** Monthly ledger cells are rounded to the nearest dollar (or cent) from exact values, half-up (0.5 rounds up). Totals are computed from exact values, not from rounded cells — see the §7.2 note on the $2 rounding difference. Revenue shares are rounded to one decimal and may not sum to 100% (77.8 + 14.0 + 3.7 + 3.2 + 1.2 = 99.9%). Figures printed to 1–2 decimals are roundings of exact values; recomputing from printed figures may differ by a few cents — the exact chain is in `worksheet.md`.

---

*End of plan. Prepared 6 November 2026 for POIDH Bounty 1531. This is a proposal: no submission has been made, no account created, no wallet connected.*
