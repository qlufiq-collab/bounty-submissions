# Tacit Meridian: poidh bounty 1519 notes

Static, client-side explorer for Tacit (Bitcoin | bridge | Ethereum, Base and Robinhood Chain). No build step. No keys are handled; the page has no wallet code.
Live: https://qlufiq-collab.github.io/bounty-submissions/poidh-1519-tacit-explorer/

## Files
- `index.html`, `style.css` (visual layer, system fonts only), `boot.js` (script flag, reduced-motion flag, CSP/error diagnostics in `window.__diag`)
- `tacit-core.js` envelope decoder, bech32m/tacit1 decoder, ABI/format helpers (pure, runs in Node too)
- `data.js` fetch/RPC layer (fallback endpoints, JSON-RPC batching, memo cache, source health)
- `fx.js` motion layer (count-up, change flash, scroll reveal, refresh ring, hero + sparklines)
- `panels.js`, `panels-eth.js`, `lookup.js`, `main.js` panels, lookup, orchestration
- CSP in `index.html`: `default-src 'none'; script-src 'self'; style-src 'self'`, `connect-src` limited to the 8 hosts below. No inline script/style, no third-party code, fonts or CDN.
- Screenshots: `screenshots/desktop.png` (1440 px, full page), `screenshots/mobile-full.png` (375 px full page as a contact sheet), `screenshots/mobile-top.png` (375 px at 2x, hero and KPIs).

## Data sources per panel (all public, CORS-enabled, GET/JSON-RPC only)
Hosts: `api.tacit.finance` (Tacit indexer), `tacit-btc-pool-mainnet.onrender.com` (Bitcoin shielded-pool indexer), `mempool.space/api`, Ethereum RPC `ethereum-rpc.publicnode.com` (fallbacks rpc.mevblocker.io, ethereum.publicnode.com), Base RPC `base-rpc.publicnode.com` (fallbacks mainnet.base.org, base.drpc.org).

| Panel | Source |
|---|---|
| Hero diagram, KPIs, chain-height strip | RPC (relay tip/height, pool.attestedReflectionTip, balances, leaves), mempool.space tip and /v1/blocks, indexer /reflection/status, /stats?view=front, /flow |
| Protocol state on Bitcoin | mempool.space block; indexer /reflection/status, /reflection/dump; RPC pool.cbtcBackingSats() |
| Bitcoin-native AMM (tETH/TAC) | indexer /reflection/dump snapshot.pools[0] (as folded by the Bitcoin reflection guest at height 974231); founding data from DEPLOYMENTS.md |
| Recent Tacit envelopes | /reflection/dump burn records, pool indexer /btc-pool/notes, 6 reference txs from mempool.space, opt-in live block scan; all decoded in-browser |
| Bitcoin shielded pool | pool indexer /btc-pool/status, /notes, /roots |
| Header relay and proven height; proven roots | RPC BitcoinLightRelay.tip()/blockHeight(), pool.currentRoot()/attestedReflectionDigest()/attestedReflectionTip(); indexer /flow, /reflection/dump, /confidential/index (lockSet) |
| Burns, mints, cross-outs; latest burns | indexer /reflection/status, /reflection/dump, /stats; RPC pool.attestedCrossOutCount()/attestedBitcoinConsumedCount() |
| ConfidentialPool, tokens, activity | RPC nextLeafIndex, balance, totalSupply of TAC/tacBTC/tacUSD/wTAC, CollateralEngine.outstandingCusd, eth_getLogs (Wrap, NullifiersSpent, LeavesInserted, CrossOutRecorded, BitcoinNotesConsumed, 9,000 blocks ≈ 30 h); indexer /confidential/index, /confidential/relay, /stats |
| On-pool AMM and farms | indexer /farm/program, /farm/health |
| EVM pool (Ethereum, Base) | RPC eth_getLogs Transact events of 0x000000c2…EE9 (Base 2,000 blocks ≈ 67 min; Ethereum 9,000), eth_getBalance, nextIndex(); indexer /stats for lifetime counts and Robinhood Chain |
| Relayed ops and fees | indexer /relay/economics, /prover/board |
| Top depositors + XNS | indexer /leaderboard; XNS registry 0x6e797ba2…5f74b on Ethereum, `getName(address)` / `getAddress(string)` via RPC |
| Lookup | tacit1/bp1 decoded locally; Bitcoin tx/address via mempool.space; EVM tx/address via RPC; points/claim via indexer |
| Privacy panel | text from SPEC.md section 11, BUILD-A-TACIT-DAPP.md "What the relay sees", EVM-POOL.md; live examples computed from the loaded windows |

Selectors/topics were computed once with keccak-256 from the signatures in the src-company/tacit repo.

## What was verified, and how
- CORS checked with `curl -H "Origin: ..."`: open (`*`) for /stats, /flow, /recent, /leaderboard, /relay/economics, /reflection/*, /confidential/*, /farm/*, /prover/board, /points/*, /claim/*; pool indexer `*`; mempool.space `*`; publicnode RPCs `*`.
- NOT usable from another origin (ACAO = https://tacit.finance only): /assets, /amm/pools, /pools, /market, /coverage, /health. tacitscan.io/api/search has no CORS headers and tacitscan serves HTML only.
- Browser run (Chromium pane and headless) against live mainnet: all 17 data cards load, zero "unavailable" values, `window.__diag` shows 0 CSP violations and 0 script errors at 1440 px, 375 px and with reduced motion.
- In-page cross-checks (Cross-checks card): 13 exact + 1 within explained drift + 1 not comparable, 0 mismatches. They compare the indexer with live RPC/mempool for attested height, relay tip, Bitcoin tip, pool leaves, cross-outs, ETH escrow, TAC/tacBTC/tacUSD supply, cUSD outstanding, cBTC backing sats, Ethereum EVM-pool balance, plus identities (borrowed − repaid = engine outstanding; AMM k ≥ kLast).
- Independent readback (separate Python/RPC script, same minute) matched the page: leaves 5364, pool ETH 17.659793, backing 11,949,754 sats, TAC 2,746,766.34421195, tacBTC 0.000294, tacUSD 17.78678352, wTAC 82,535.10191211, cUSD outstanding 445,285,815,650 units (4,452.85), cross-outs 11, relay height 974255, attested 974231, Ethereum EVM pool 7.0726 ETH / 712 leaves, Bitcoin tip 974277.
- Decoder checked on real txs: TAC genesis etch (ticker TAC, 8 decimals, fixed supply; derived asset id f0bbe868…94762b matches), bridge burn 97a33076… (nullifier/destination equal the reflection record), POOL_INIT, cross-out mint, shielded-pool op, TAC transfers. tacit1 decoder checked on test vectors from the repo (valid points, flags 3/7/133).
- Lookup tested live: Bitcoin txid (etch, burn), XNS name `monim@xns`, EVM address of a top depositor (XNS `0xbyin@wei`, points, Base events), tacit1 ID, garbage input.
- Failure mode tested by forcing indexer fetches to reject: LIVE becomes DEGRADED, dots turn red, cards keep last good numbers marked "stale since …", nothing invented.
- Reduced motion (`--force-prefers-reduced-motion`): `html.rm`, all cards visible, numbers render instantly, particles/pulses off.
- Mobile 375 px: `scrollWidth` = 375 (no horizontal page scroll; wide tables scroll inside their card).

## Design notes
Glass header/cards over a slow animated gradient, hero with animated Bitcoin-bridge-Ethereum/Base SVG (flowing dashes, SMIL particles, pulsing nodes), count-up KPIs with change flash, staggered scroll reveal, shimmer skeletons, refresh-countdown ring and LIVE dot, stroke-draw-in sparklines (block fullness from mempool.space; pool leaf count rebuilt from LeavesInserted logs; proven height from /flow when it has history), bar charts that grow in. Animations use transform/opacity (plus SVG stroke offsets) and are paused when the tab is hidden.

## Known gaps / honest limits
1. No complete Bitcoin asset list or feed of all etches/transfers: the indexer routes for it block foreign origins and tacitscan has no JSON API. Mitigations: reflection snapshot (asset histogram: TAC 3,758 live notes, tETH 1, LP share 1), burns, shielded-pool ops, six reference envelopes, universal in-browser decoder, and an opt-in live block scan (~140 mempool.space requests per block; about 1 block in 16 held an envelope; throttled to ~13 s per block at times).
2. Event windows are short (RPC range caps). Lifetime totals are from the indexer and labelled so.
3. Base EVM-pool balance swings by several ETH every few seconds, so its indexer-vs-chain check is shown as "not comparable" instead of a false mismatch.
4. The indexer's /flow history had only 1 reading when tested; the bridge chart then uses the visitor's own live readings and says so.
5. Bitcoin ages for burn records are block-height estimates (10 min/block).
6. Only Ethereum and Base are read on chain; Robinhood Chain / MegaETH from the indexer only. AMM reserves assume 8-decimal in-system units.
7. The Chromium pane shows one persistent "403 resource" console line that is unrelated to this page (it appears when loading any local file, including bare style.css); the page's own diagnostics are clean.
8. The sample tacit1 ID is a test vector from the Tacit repo, not a user's address.
9. Not verified: behaviour in Safari/Firefox (SMIL, `color-mix`, backdrop-filter are all standard but untested there), and real-world rate limits on the public RPCs/mempool.space under heavy traffic (fallback endpoints are configured).

## Run
`cd site && python3 -m http.server 8099` then open http://127.0.0.1:8099/ . For GitHub Pages, publish the `` contents; all URLs are relative.

## Final audit (2026-11-03, before publishing)
Checked in a real browser (desktop 1440 px and 375 px, real-time headless Chromium):
0 script errors, 0 CSP violations, no horizontal scroll at 375 px, 0 failed cards, cross-checks 15 exact / 0 drift / 0 mismatched / 1 not comparable.
Spot checks: Bitcoin tip = mempool.space, Ethereum head = publicnode, Robinhood EVM-pool balance 0.0902 ETH = indexer.

Fixes made during the audit:
- The bounty names Robinhood Chain; the page only showed it from the indexer. Added live reads from `rpc.mainnet.chain.robinhood.com` (CORS `*`): pool balance, note leaves, latest block, a cross-check row, a header tile and a status dot. CSP updated.
- The header strip repeated two hero KPIs (Bitcoin tip, proven height). Replaced them with "EVM pools, ETH held" (Ethereum + Base + Robinhood, live RPC) and "Robinhood Chain block".
- publicnode rate-limited repeated test loads (HTTP 403), which broke "Recent pool activity". `getLogs` now backs off and retries (1.5 s, 4 s); `eth.drpc.org` added as a last fallback for state reads (its free plan rejects getLogs, so it is not used for logs).
- Screenshots retaken after these changes.
Not verified: Safari and Firefox rendering; rate limits from the published GitHub Pages origin (check again after deploy).
