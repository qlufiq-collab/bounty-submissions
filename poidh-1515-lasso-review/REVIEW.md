# Lasso RPC: field notes from a real Base + Arbitrum workload

By qlufiq (GitHub [qlufiq-collab](https://github.com/qlufiq-collab), X [@lupilupipuli](https://x.com/lupilupipuli)). Tested on 2026-11-02 from Indonesia. The tests ran through an autonomous AI agent working for me.

## What I used it for

I hunt bounties on poidh, and I need to check my own claims on-chain rather than trust the indexer. poidh's agent skill warns that a flaky RPC can silently cut short the `bountyClaims(bountyId, i)` walk. A router that fails over before a provider error reaches my code is therefore the feature I care about.

I put 105 requests through Lasso, using the `public` and `premium` profiles on Base and Arbitrum:

- Walked `bountyClaims` for three bounties until the array ended (Base 526 and 527, Arbitrum 159).
- Read `claims(id)` for my claims.
- Fetched the receipts of my three claim transactions.
- Pulled my `ClaimCreated` logs with `eth_getLogs` filtered on `issuer`.

Result: all three of my claims verified on-chain. Each claim tx has status 1, the issuer matches my wallet, and the claim id appears in the walk. The walk lengths (15, 16, 9) match poidh's UI. The scripts and the raw `lasso_meta` from every call are in this folder (`lasso_check.py`, `lasso_verify.py`, `*.json`; request ids removed, no key).

## What worked well

- **The metadata is the product.** `include_meta=body` names the region, the candidate providers, the selected provider, the retries, the dispatches, and the upstream time versus Lasso time on every response. Without writing any timing code, I could tell that slow responses came from the network path and not from Lasso.
- **The overhead really is small.** Median `lasso_overhead_ms` was 3.2 ms (p95 7.9 ms) across 105 calls. Median upstream latency was 140 ms.
- **The errors are written for agents.** A missing key returns 401 with `error_type: invalid_key`, `retryable: false`, and a `next_action` that tells you exactly what to do. Range refusals return `max_block_range`. My agent recovered from both without me touching anything.
- **Onboarding.** One request returned a working key, with no form to fill in.

## What confused me or cost me time

1. **Every request went to the San Jose region, even from Southeast Asia.** All 105 responses report `region: sjc`. My client-side `eth_blockNumber` on Base had a median of 808 ms through Lasso, against 367 ms straight to `mainnet.base.org`. Lasso's own overhead was about 3 ms, so the ~440 ms gap is the trip to an SJC edge. The page promises the "nearest region". If Asia has no region yet, saying so (or adding SIN/HKG) would set expectations right for builders out here. Caveat: my traffic leaves through Cloudflare WARP, which egresses in Singapore.
2. **Base `eth_getLogs` cap on filtered queries.** A 10,000-block query, filtered to one contract and one issuer topic with 0–2 matches, was refused with `query exceeds max results: eth_getLogs response is too big`, `max_block_range: 1000`. The message blames the response size, but the result was nearly empty; the real cause is a block-range cap. The same refusal also reports `retries: 4–5` while being `retryable: false`, which makes the metadata look as if work was wasted.
3. **The Arbitrum range limit was inconsistent on the same provider.** Through `arbitrum_pocket`, a 100,000-block range on `premium` was refused (`max_block_range: 50000`), while a 1,000,000-block range on the same profile minutes later succeeded and returned my log. A cap that depends on the moment makes it hard to size chunked log scans. A `cap_source` field next to the number would help.
4. **Unknown methods break the error convention.** `eth_doesNotExist` returns HTTP 200 with `-32611 rejected due to request filter settings` and no `next_action` or `error_type`. Every other Lasso error I hit had them. "Unsupported method" would be clearer than "filter settings".
5. **The dashboard shows the key in plain text.** The chain panel prints the full RPC URL with `?key=…`. I had to crop it out of the screenshot for this review. A copy button with a masked value would make it safe to share dashboard screenshots, which you ask people to do.

## Would I use it?

Yes, for my poidh tooling. Free public routing with per-call evidence is exactly what I want for walking claim arrays and checking receipts. For latency-sensitive work from Asia I would stay on a direct regional RPC until there is an Asian edge.

I starred [jaxernst/lasso-rpc](https://github.com/jaxernst/lasso-rpc).
