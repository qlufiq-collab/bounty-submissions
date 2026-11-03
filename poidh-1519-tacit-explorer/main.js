/* main.js — orchestration: refresh loop, event delegation, XNS name decoration, sources panel. */
(function () {
  'use strict';
  const C = window.TacitCore, D = window.TMData, U = window.TMUI, P1 = window.TMPanels1, P2 = window.TMPanels2;
  const { h, raw, $, $$, runCard } = U;

  const EXAMPLES = [
    ['TAC genesis (Bitcoin etch)', 'e2d10be19c2b73b86e14be99dc237a3d999ba3dfbe6f3e3714590acee2ca481e'],
    ['A bridge burn', '97a33076ef6ca869268b5cecd9edfcdcd759f6d31b58c6d79fc19d29211d2f2d'],
    ['Bitcoin AMM pool founding', '665bdd4b1b9d6220d62aa3d154a8de9870dd9a9ae92658ab03452660c2437bd5'],
    ['ConfidentialPool', D.ADDR.pool],
    ['A top depositor', '0x85f2602e95a4490388a7fcdc0f5d83f21b310ad2'],
    ['XNS name', 'monim@xns'],
    ['tacit1 ID (repo test vector)', 'tacit1qqps86ymc78aa5v4q03hjlz70hrmq3a2xa4g8zg9exreekzye4h6yw4eqdvy85q973gqj85aa84d25wpex67fpal72yznlej9q85eez9ax0jsqlgn0rclhk3j5p7x7tute7u0vz84gmk4qufqhyc08xcgnxklg36hyl7pvk0'],
  ];

  let lastRefresh = 0, refreshing = false, nextAt = 0;

  /* ---------- XNS decoration: any <a class="addr" data-addr> gets a name badge once resolved ---------- */
  let decoTimer = null;
  function decorate(root) {
    const nodes = $$('a.addr[data-addr]', root || document).filter((n) => !n.dataset.xnsDone);
    if (!nodes.length) return;
    const addrs = [...new Set(nodes.map((n) => n.dataset.addr))];
    clearTimeout(decoTimer);
    decoTimer = setTimeout(async () => {
      try { await D.resolveXns(addrs); } catch (e) { /* names are a bonus; leave addresses as they are */ }
      nodes.forEach((n) => {
        if (n.dataset.xnsDone) return;
        const name = D.xnsCache.get(n.dataset.addr);
        if (name === undefined) return; // not resolved yet (RPC error): retry on the next render
        n.dataset.xnsDone = '1';
        if (name) {
          const s = document.createElement('span'); s.className = 'xns'; s.textContent = name; s.title = 'XNS name (xns.name) for ' + n.dataset.addr;
          n.parentNode.insertBefore(s, n); n.title = n.dataset.addr;
          n.classList.add('has-name');
        }
      });
    }, 60);
  }

  /* ---------- clock + source health ---------- */
  function paintClock() {
    const el = $('#clock'); if (!el) return;
    if (!lastRefresh) { el.textContent = refreshing ? 'loading…' : '—'; if (window.TMFX) window.TMFX.setRing(0.04, refreshing); return; }
    const t = new Date(lastRefresh);
    const left = Math.max(0, Math.round((nextAt - Date.now()) / 1000));
    el.innerHTML = `Last updated <b>${t.toISOString().slice(11, 19)} UTC</b> · ${refreshing ? 'refreshing…' : 'next in ' + left + 's'}<span class="srcs" id="srcs">${srcDots()}</span>`;
    if (window.TMFX) window.TMFX.setRing(refreshing ? 1 : 1 - left / 60, refreshing);
  }
  function srcDots() {
    const names = { indexer: 'indexer', btcpool: 'pool-idx', mempool: 'mempool', rpc1: 'ETH RPC', rpc8453: 'Base RPC', rpc4663: 'Robinhood RPC' };
    return Object.keys(names).map((k) => {
      const s = D.SRC[k];
      const cls = !s ? 'idle' : s.ok ? 'up' : 'down';
      return `<span class="sd ${cls}" title="${U.esc(names[k] + (s ? ': ' + (s.ok ? 'ok' : 'error ' + s.detail) : ': not contacted yet'))}"><i></i>${names[k]}</span>`;
    }).join('');
  }

  /* ---------- refresh ---------- */
  async function refreshAll(force) {
    if (refreshing) return;
    refreshing = true; paintClock();
    if (force) D.clearCache();
    const jobs = [
      P1.renderStrip(),
      runCard('p-btc-state', P1.cardBtcState), runCard('p-btc-amm', P1.cardBtcAmm), runCard('p-btc-feed', P1.cardBtcFeed), runCard('p-btc-pool', P1.cardBtcPool),
      runCard('p-bridge-relay', P1.cardBridgeRelay), runCard('p-bridge-roots', P1.cardBridgeRoots), runCard('p-bridge-flow', P1.cardBridgeFlow), runCard('p-bridge-burns', P1.cardBridgeBurns),
      runCard('p-eth-pool', P2.cardEthPool), runCard('p-eth-assets', P2.cardEthAssets), runCard('p-eth-activity', P2.cardEthActivity), runCard('p-eth-farms', P2.cardEthFarms),
      runCard('p-evm-pool', P2.cardEvmPool), runCard('p-relay', P2.cardRelay), runCard('p-points', P2.cardPoints),
    ];
    (await Promise.allSettled(jobs)).forEach((r) => { if (r.status === 'rejected') { console.warn('[refresh job]', r.reason); if (window.__diag) window.__diag.errors.push('job: ' + ((r.reason && r.reason.message) || r.reason)); } });
    // privacy + verify depend on data the cards just fetched (cached), so they run last
    await Promise.allSettled([runCard('p-privacy', P2.cardPrivacy), runCard('verify', P2.cardVerify)]);
    lastRefresh = Date.now(); nextAt = lastRefresh + 60000; refreshing = false; paintClock();
  }

  /* ---------- sources panel ---------- */
  function renderSources() {
    const rows = [
      ['Header strip, bridge relay, proven height', 'Ethereum RPC: BitcoinLightRelay.tip()/blockHeight(), ConfidentialPool.attestedReflectionTip(); mempool.space /blocks/tip/height; indexer /reflection/status, /stats?view=front, /flow'],
      ['Bitcoin protocol state', 'mempool.space block + tx API; indexer /reflection/status, /reflection/dump (snapshot of the proven Bitcoin state); RPC pool.cbtcBackingSats()'],
      ['Bitcoin-native AMM pool', 'indexer /reflection/dump → snapshot.pools[0] (as folded by the Bitcoin reflection guest at the attested height); founding data from docs/DEPLOYMENTS.md'],
      ['Recent Tacit envelopes', '/reflection/dump pendingDepositRecords (bridge burns), tacit-btc-pool-mainnet /btc-pool/notes, six reference txs and the live block scan from mempool.space; all decoded in-browser by tacit-core.js'],
      ['Bitcoin shielded pool', 'tacit-btc-pool-mainnet.onrender.com /btc-pool/status, /notes, /roots'],
      ['Latest proven roots', 'RPC pool.currentRoot(), attestedReflectionDigest(), attestedReflectionTip(); indexer /reflection/dump, /confidential/index (lockSet); pool indexer /btc-pool/status'],
      ['Burns, mints, cross-outs', 'indexer /reflection/status, /reflection/dump, /stats?view=front; RPC pool.attestedCrossOutCount(), attestedBitcoinConsumedCount()'],
      ['ConfidentialPool, assets, activity', 'RPC: nextLeafIndex, currentRoot, eth_getBalance, totalSupply() of TAC / tacBTC / tacUSD / wTAC, CollateralEngine.outstandingCusd(), eth_getLogs (Wrap, NullifiersSpent, LeavesInserted, CrossOutRecorded, BitcoinNotesConsumed); indexer /confidential/index, /stats, /confidential/relay'],
      ['On-pool AMM and launch farms', 'indexer /farm/program, /farm/health (which read FarmManager on chain)'],
      ['EVM pool (Ethereum, Base, Robinhood Chain)', 'RPC eth_getLogs for TacitEvmPool Transact events (0x000000c2…EE9, same address on every chain), eth_getBalance, nextIndex() (Robinhood Chain: balance and nextIndex only, via rpc.mainnet.chain.robinhood.com); indexer /stats?view=front for lifetime counts and other chains'],
      ['Relayed ops and fees', 'indexer /relay/economics, /prover/board'],
      ['Top depositors and XNS names', 'indexer /leaderboard; XNS registry 0x6e797ba2…5f74b on Ethereum: getName(address) and getAddress(string) through RPC'],
      ['Lookup', 'tacit1/bp1: bech32m decoded locally; Bitcoin tx/address: mempool.space; EVM address/tx: RPC; points: indexer /points/:address, /claim/:address'],
    ].map(([k, v]) => h`<tr><td><b>${k}</b></td><td>${v}</td></tr>`);
    const gaps = [
      raw('<b>No complete Bitcoin asset list or feed of every etch/transfer.</b> Tacit\'s indexer routes for that (/assets, /amm/pools, /market, /recent-cxfer-txids) only allow browsers on tacit.finance and tacitscan.io, and tacitscan has no public JSON API. This page therefore shows what open endpoints provide (the proven reflection state, the Bitcoin shielded-pool indexer), decodes any envelope you give it, and offers an opt-in live scan of the newest blocks (about 1 in 16 blocks held a Tacit envelope when tested).'),
      raw('<b>Event windows are short.</b> Ethereum pool activity covers about 30 hours, Base EVM pool about an hour, Ethereum EVM pool about 30 hours: public RPCs cap eth_getLogs ranges. Lifetime totals come from the indexer and are labelled as such.'),
      raw('<b>Bitcoin ages are estimates</b> (blocks × 10 min) wherever only a block height is known; exact times appear on decoded transactions.'),
      raw('<b>AMM reserves</b> are shown as 8-decimal in-system units, as DEPLOYMENTS.md describes for tETH and TAC.'),
      raw('<b>Only Ethereum and Base are read from chain.</b> Robinhood Chain and MegaETH EVM pools appear from the indexer only.'),
      raw('<b>Free public endpoints</b> can rate-limit or fail; every card says “unavailable” and keeps the last good numbers marked stale instead of guessing.'),
    ];
    $('#sources-body').innerHTML = h`<table class="tbl"><thead><tr><th>Panel</th><th>Data source (all public, read-only, CORS-enabled)</th></tr></thead><tbody>${rows}</tbody></table>
      <h4>Known gaps</h4><ul class="caveats">${gaps.map((g) => h`<li>${g}</li>`)}</ul>
      <h4>Run it yourself</h4><p>No build step: serve the folder with any static host (<code>python3 -m http.server</code>) and open <code>index.html</code>. Code: <a href="https://github.com/qlufiq-collab/bounty-submissions/tree/main/poidh-1519-tacit-explorer" rel="noopener">poidh-1519-tacit-explorer</a>. There is no third-party JavaScript: every script here is first-party and dependency-free.</p>`.s;
  }

  /* ---------- events ---------- */
  function wire() {
    $('#refresh').addEventListener('click', () => refreshAll(true));
    $('#lookup-form').addEventListener('submit', (ev) => { ev.preventDefault(); const q = $('#q').value; if (q.trim()) window.TMLookup.lookup(q); });
    const ex = $('#examples');
    ex.innerHTML = '<span class="dim">Try:</span> ' + EXAMPLES.map(([label, val], i) => `<button type="button" class="ex" data-ex="${i}">${U.esc(label)}</button>`).join('');
    document.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-ex],[data-decode],[data-retry],[data-copy],[data-feed-filter],#feed-more,#scan-go,#lookup-close');
      if (!t) return;
      if (t.dataset.ex != null) { const v = EXAMPLES[Number(t.dataset.ex)][1]; $('#q').value = v; window.TMLookup.lookup(v); }
      else if (t.dataset.decode) { ev.preventDefault(); $('#q').value = t.dataset.decode; window.TMLookup.lookup(t.dataset.decode); }
      else if (t.dataset.retry) { const id = t.dataset.retry; const fn = { 'p-btc-state': P1.cardBtcState, 'p-btc-amm': P1.cardBtcAmm, 'p-btc-feed': P1.cardBtcFeed, 'p-btc-pool': P1.cardBtcPool, 'p-bridge-relay': P1.cardBridgeRelay, 'p-bridge-roots': P1.cardBridgeRoots, 'p-bridge-flow': P1.cardBridgeFlow, 'p-bridge-burns': P1.cardBridgeBurns, 'p-eth-pool': P2.cardEthPool, 'p-eth-assets': P2.cardEthAssets, 'p-eth-activity': P2.cardEthActivity, 'p-eth-farms': P2.cardEthFarms, 'p-evm-pool': P2.cardEvmPool, 'p-relay': P2.cardRelay, 'p-points': P2.cardPoints, 'p-privacy': P2.cardPrivacy, 'verify': P2.cardVerify }[id]; if (fn) { D.clearCache(); runCard(id, fn); } }
      else if (t.dataset.copy) { navigator.clipboard && navigator.clipboard.writeText(t.dataset.copy).then(() => { const o = t.textContent; t.textContent = '✓'; setTimeout(() => { t.textContent = o; }, 900); }); }
      else if (t.dataset.feedFilter) { P1.FEED.filter = t.dataset.feedFilter; P1.renderFeedBody(null, true); }
      else if (t.id === 'feed-more') { P1.FEED.showAll = !P1.FEED.showAll; P1.renderFeedBody(null, true); }
      else if (t.id === 'scan-go') { P1.scanBlocks(Number($('#scan-n').value) || 3); }
      else if (t.id === 'lookup-close') { const r = $('#lookup-result'); r.hidden = true; r.innerHTML = ''; }
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() > nextAt) refreshAll(); });
    setInterval(() => { paintClock(); if (!document.hidden && !refreshing && lastRefresh && Date.now() >= nextAt) refreshAll(); }, 1000);
  }

  /* per-render touches: staggers for lists and bars (set via CSSOM, which the CSP allows) */
  function afterRender(root) {
    decorate(root);
    $$('.feed .fi', root).forEach((li, i) => li.style.setProperty('--i', String(Math.min(i, 14))));
    $$('.bars rect', root).forEach((r, i) => { r.style.animationDelay = Math.min(i, 60) * 12 + 'ms'; });
    $$('.fx-in > *', root).forEach((n, i) => n.style.setProperty('--i', String(Math.min(i, 14))));
  }
  function paintLive() {
    const live = $('#live'); if (!live) return;
    const vals = Object.values(D.SRC);
    const down = vals.filter((s) => s.ok === false).length;
    live.classList.toggle('degraded', down > 0);
    live.title = down ? down + ' data source(s) currently failing; affected cards say "unavailable"' : 'All data sources reachable';
    const b = $('b', live); if (b) b.textContent = down ? 'DEGRADED' : 'LIVE';
  }
  window.TM = { afterRender, onSource: () => { const s = $('#srcs'); if (s) s.innerHTML = srcDots(); paintLive(); } };
  document.addEventListener('DOMContentLoaded', () => {
    renderSources(); wire(); paintClock(); if (window.TMFX) window.TMFX.initReveal(document);
    refreshAll(false).then(() => { const q = new URLSearchParams(location.search).get('q'); if (q) { $('#q').value = q; window.TMLookup.lookup(q); } });
  });
})();
