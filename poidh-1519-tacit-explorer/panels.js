/* panels.js — UI helpers, the status strip, Bitcoin column and bridge column. */
(function () {
  'use strict';
  const C = window.TacitCore, D = window.TMData;
  const { CFG, ADDR } = D;

  /* ---------- tiny safe-HTML templating: interpolated values are escaped unless wrapped in raw() ---------- */
  class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
  const raw = (s) => new Raw(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const part = (v) => (v instanceof Raw ? v.s : Array.isArray(v) ? v.map(part).join('') : esc(v == null ? '' : v));
  const h = (strings, ...vals) => raw(strings.reduce((acc, s, i) => acc + s + (i < vals.length ? part(vals[i]) : ''), ''));

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------- links ---------- */
  const L = {
    btcTx: (t) => 'https://mempool.space/tx/' + t,
    btcBlock: (x) => 'https://mempool.space/block/' + x,
    btcAddr: (a) => 'https://mempool.space/address/' + a,
    tsTx: (t) => 'https://tacitscan.io/tx/' + t,
    tsAsset: (a) => 'https://tacitscan.io/assets/' + a,
    tx: (c, t) => CFG.explorer[c] + '/tx/' + t,
    addr: (c, a) => CFG.explorer[c] + '/address/' + a,
    block: (c, b) => CFG.explorer[c] + '/block/' + b,
    read: (a) => CFG.explorer[1] + '/address/' + a + '#readContract',
    api: (p) => CFG.api + p,
  };
  const a = (href, text, title) => h`<a href="${href}" target="_blank" rel="noopener"${title ? raw(' title="' + esc(title) + '"') : ''}>${text}</a>`;
  const mono = (s) => h`<code>${s}</code>`;
  const chipChain = (href, tip) => h`<a class="chip src-chain" href="${href}" target="_blank" rel="noopener" title="${tip}">chain</a>`;
  const chipIdx = (path, tip) => h`<a class="chip src-idx" href="${L.api(path)}" target="_blank" rel="noopener" title="${tip || 'Tacit public indexer: ' + path}">indexer</a>`;
  const chipBtc = (href, tip) => h`<a class="chip src-btc" href="${href}" target="_blank" rel="noopener" title="${tip}">mempool.space</a>`;
  const addrLink = (chainId, addr, label) => {
    const known = D.KNOWN_ADDR[String(addr).toLowerCase()];
    return h`<a class="addr" data-addr="${String(addr).toLowerCase()}" href="${L.addr(chainId, addr)}" target="_blank" rel="noopener" title="${addr}">${known || label || C.shortHex(addr, 6, 4)}</a>`;
  };
  const txLink = (chainId, t) => h`<a href="${L.tx(chainId, t)}" target="_blank" rel="noopener" title="${t}">${C.shortHex(t, 8, 6)}</a>`;
  const btcTxLink = (t) => h`<a href="${L.btcTx(t)}" target="_blank" rel="noopener" title="${t}">${C.shortHex(t, 8, 6)}</a>`;
  const copyBtn = (v) => h`<button class="copy" type="button" data-copy="${v}" title="Copy" aria-label="Copy to clipboard">⧉</button>`;

  /* ---------- formatting ---------- */
  const unavailable = h`<span class="na">unavailable</span>`;
  const big = (v) => (v == null ? unavailable : h`${raw(C.fmtInt(v))}`);
  const fmt = C.fmtUnits;
  const num = (v) => (v == null ? unavailable : h`<b class="n">${v}</b>`);
  const nowSec = () => Date.now() / 1000;
  const rowKV = (k, v, src, hint) => h`<div class="kv"><span class="k">${k}${hint ? raw(' <span class="hint" tabindex="0" title="' + esc(hint) + '">?</span>') : ''}</span><span class="v">${v}</span>${src ? raw('<span class="s">' + part(src) + '</span>') : ''}</div>`;
  const note = (t) => h`<p class="note">${t}</p>`;
  const jsonNum = (o) => (o && typeof o === 'object' && o.$n != null ? BigInt(o.$n) : o == null ? null : BigInt(o)); // indexer big-ints arrive as {"$n": "123"}

  /* ---------- card plumbing ---------- */
  const lastOk = {}; // card id -> epoch ms of last successful render
  const FX = () => window.TMFX;
  function setCard(id, html, ok, opts) {
    const card = document.getElementById(id);
    if (!card) return;
    const body = $('.body', card);
    const wasLoaded = !body.classList.contains('skel') && !!lastOk[id];
    const prevVals = wasLoaded ? $$('.n', body).map((n) => n.textContent) : [];
    body.classList.remove('skel');
    // Re-renders caused by the periodic refresh must not replay entrance animations; filter clicks may.
    body.classList.toggle('no-anim', wasLoaded && !(opts && opts.animate));
    body.innerHTML = html instanceof Raw ? html.s : html;
    if (prevVals.length && FX()) $$('.n', body).forEach((n, i) => { if (prevVals[i] !== undefined && prevVals[i] !== n.textContent) FX().flash(n); });
    let upd = $('.upd', card);
    if (!upd) { upd = document.createElement('span'); upd.className = 'upd'; $('header', card).appendChild(upd); }
    if (ok !== false) lastOk[id] = Date.now();
    upd.textContent = lastOk[id] ? 'updated ' + new Date(lastOk[id]).toLocaleTimeString([], { hour12: false }) : 'not loaded';
    upd.classList.toggle('stale', ok === false);
    if (window.TM && window.TM.afterRender) window.TM.afterRender(card);
  }
  async function runCard(id, fn) {
    try { setCard(id, await fn(), true); }
    catch (e) {
      console.warn('[card ' + id + ']', e);
      const prev = document.getElementById(id);
      const has = prev && !$('.body', prev).classList.contains('skel') && lastOk[id];
      if (has) { // keep last good numbers, mark stale
        const upd = $('.upd', prev); if (upd) { upd.textContent = 'stale since ' + new Date(lastOk[id]).toLocaleTimeString([], { hour12: false }); upd.classList.add('stale'); }
      } else setCard(id, h`<p class="err">Could not load this panel: <span class="na">${(e && e.message) || 'network error'}</span>. Nothing is shown rather than a guess. <button class="btn small retry" data-retry="${id}" type="button">Retry</button></p>`, false);
    }
  }

  /* ---------- approximate wall time for a Bitcoin height (only used where we have no timestamp) ---------- */
  const btcAgeApprox = (tip, hgt) => { const mins = (tip - hgt) * 10; return mins < 90 ? '~' + mins + ' min' : mins < 2880 ? '~' + (mins / 60).toFixed(0) + ' h' : '~' + (mins / 1440).toFixed(0) + ' d'; };

  /* ---------- SVG helpers ---------- */
  function sparkline(series, keys, colors, labels, w, hgt) {
    // series: [{t, k1, k2...}] ; draws each key as a step line on a shared y-range
    const pts = series.filter((p) => keys.every((k) => p[k] != null));
    if (pts.length < 2) return h`<p class="note">Not enough history yet to draw a chart.</p>`;
    const xs = pts.map((p) => p.t), x0 = Math.min(...xs), x1 = Math.max(...xs);
    const all = pts.flatMap((p) => keys.map((k) => p[k]));
    const y0 = Math.min(...all), y1 = Math.max(...all), pad = 6;
    const X = (t) => pad + ((t - x0) / (x1 - x0 || 1)) * (w - pad * 2);
    const Y = (v) => hgt - pad - ((v - y0) / (y1 - y0 || 1)) * (hgt - pad * 2);
    const lines = keys.map((k, i) => {
      let d = '';
      pts.forEach((p, j) => { d += (j ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p[k]).toFixed(1); });
      return `<path class="draw" d="${d}" pathLength="1" fill="none" stroke="${colors[i]}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    }).join('');
    const legend = keys.map((k, i) => `<span class="lg"><i class="sw sw${i}"></i>${esc(labels[i])}</span>`).join('');
    return raw(`<svg class="spark" viewBox="0 0 ${w} ${hgt}" role="img" aria-label="${esc(labels.join(', '))} over the last 24 hours" preserveAspectRatio="none"><rect x="0" y="0" width="${w}" height="${hgt}" fill="none"/>${lines}</svg><div class="legend">${legend}<span class="lg dim">${y0.toLocaleString('en-US')} … ${y1.toLocaleString('en-US')} · ${Math.round((x1 - x0) / 3600)}h</span></div>`);
  }

  /* ================= STRIP + HERO ================= */
  const TILES = [['t-relay', 'bridge', 'Header relay tip'], ['t-attest', 'bridge', 'Last attestation'], ['t-evm', 'eth', 'EVM pools, ETH held'], ['t-eth', 'eth', 'Ethereum block'], ['t-base', 'eth', 'Base block'], ['t-rh', 'eth', 'Robinhood Chain block']];
  function ensureStrip() {
    const el = document.getElementById('strip');
    if (el.children.length) return;
    el.innerHTML = TILES.map(([id, cls, label]) => `<a class="tile ${cls} reveal" id="${id}"><span class="tl">${esc(label)}</span><span class="tv n">…</span><span class="ts">loading</span></a>`).join('');
    if (FX()) FX().initReveal(el);
  }
  function setTile(id, value, sub, href) {
    const t = document.getElementById(id); if (!t) return;
    const tv = $('.tv', t);
    if (typeof value === 'string') { if (tv.textContent !== value) { tv.textContent = value; tv.classList.remove('na'); if (FX() && tv.__str !== undefined) FX().flash(tv); tv.__str = value; } }
    else if (FX()) FX().setNumber(tv, value); else tv.textContent = value == null ? 'unavailable' : C.fmtInt(value);
    $('.ts', t).textContent = sub;
    if (href) { t.setAttribute('href', href); t.setAttribute('target', '_blank'); t.setAttribute('rel', 'noopener'); } else t.removeAttribute('href');
  }
  async function renderStrip() {
    ensureStrip();
    const [btcTip, eth, base, st, fl, flow, rhS] = await Promise.allSettled([D.btc.tipHeight(), D.chain.eth(), D.chain.base(), D.api.reflStatus(), D.api.statsFront(), D.api.flow(), D.chain.rh()]);
    const v = (r) => (r.status === 'fulfilled' ? r.value : null);
    const tip = v(btcTip), e = v(eth), b = v(base), s = v(st), sf = v(fl);
    const attested = e && e.attestedHeight != null ? e.attestedHeight : s ? s.attestedHeight : null;
    const lastAttest = sf && sf.link && sf.link.lastAttest ? sf.link.lastAttest : null;
    setTile('t-relay', e ? e.relayHeight : null, tip != null && e && e.relayHeight != null ? (tip - e.relayHeight) + ' blocks behind Bitcoin' : 'BitcoinLightRelay', L.read(ADDR.relay));
    const rh = v(rhS);
    const evmParts = [e && e.evmBalance, b && b.evmBalance, rh && rh.evmBalance];
    const evmSum = evmParts.every((x) => x != null) ? evmParts.reduce((s2, x) => s2 + BigInt(x), 0n) : null;
    setTile('t-evm', evmSum != null ? (Number(evmSum / 10n ** 14n) / 1e4).toFixed(2) + ' ETH' : null, evmSum != null ? 'Ethereum + Base + Robinhood, live RPC' : 'an RPC is unavailable', L.addr(1, ADDR.evmPool));
    setTile('t-attest', lastAttest ? C.ago(lastAttest.timeStamp) : null, lastAttest ? sf.link.attests.toLocaleString('en-US') + ' attests in total' : 'indexer', lastAttest ? L.tx(1, lastAttest.hash) : null);
    setTile('t-eth', e && e.block ? e.block : null, e && e.blockTime ? C.ago(e.blockTime) : 'public RPC', e ? L.block(1, e.block) : null);
    setTile('t-base', b && b.block ? b.block : null, b && b.blockTime ? C.ago(b.blockTime) : 'public RPC', b ? L.block(8453, b.block) : null);
    setTile('t-rh', rh && rh.block ? rh.block : null, 'rpc.mainnet.chain.robinhood.com', null);
    if (FX()) FX().heroUpdate({ tip, e, b, st: s, sf, fl: v(flow) });
    D.btc.recentBlocks().then((blks) => { if (FX() && Array.isArray(blks)) FX().setSpark('k-tip', blks.slice().reverse().map((x) => x.tx_count), '#f7931a', 'Transactions in each of the last ' + blks.length + ' Bitcoin blocks (mempool.space)'); }).catch(() => {});
  }

  /* ================= BITCOIN: protocol state ================= */
  async function cardBtcState() {
    const [tipR, eth, st, sf, dumpR] = await Promise.allSettled([D.btc.tipHeight(), D.chain.eth(), D.api.reflStatus(), D.api.statsFront(), D.api.dump()]);
    const v = (r) => (r.status === 'fulfilled' ? r.value : null);
    const tip = v(tipR), e = v(eth), s = v(st), f = v(sf), dump = v(dumpR);
    let blockLine = unavailable;
    if (tip != null) {
      try {
        const hash = await D.btc.blockHash(tip);
        const blk = await D.btc.block(hash);
        blockLine = h`${a(L.btcBlock(hash), '#' + C.fmtInt(tip))} · ${C.fmtInt(blk.tx_count)} txs · ${C.ago(blk.timestamp)}`;
      } catch (err) { blockLine = h`${a('https://mempool.space/block/' + tip, '#' + C.fmtInt(tip))}`; }
    }
    const live = s ? s.liveNotes : null;
    const tacLive = dump ? dump.snapshot.liveTriples.filter((t) => t[2].toLowerCase() === '0xf0bbe868af10c6c67652a99709bf32048d1aa7194efe3e9a1ef1bde43f94762b').length : null;
    const attested = e && e.attestedHeight != null ? e.attestedHeight : s ? s.attestedHeight : null;
    const backing = e ? e.backingSats : null;
    const rows = [
      rowKV('Latest Bitcoin block', blockLine, chipBtc('https://mempool.space/api/blocks/tip/height', 'GET /api/blocks/tip/height')),
      rowKV('Tacit state proven to Ethereum up to', attested != null ? h`${a(L.btcBlock(String(attested)), '#' + C.fmtInt(attested))} <span class="dim">(${tip != null ? tip - attested : '?'} behind tip)</span>` : unavailable, e ? chipChain(L.read(ADDR.pool), 'pool.attestedReflectionTip() → relay.blockHeight()') : (s ? chipIdx('/reflection/status?network=mainnet') : ''), 'The Ethereum pool only trusts Bitcoin state that a ZK proof has folded in and that is buried 24 blocks deep.'),
      rowKV('Live notes in the proven Bitcoin state', live != null ? h`${raw(C.fmtInt(live))}${tacLive != null ? raw(' <span class="dim">(' + C.fmtInt(tacLive) + ' are TAC)</span>') : ''}` : unavailable, chipIdx('/reflection/status?network=mainnet'), 'Unspent Tacit notes the reflection guest has folded. Note values are hidden commitments.'),
      rowKV('Bridge burns recorded', s ? num(C.fmtInt(s.bridgeBurns)) : unavailable, chipIdx('/reflection/status?network=mainnet')),
      rowKV('cBTC locks: BTC backing the Ethereum mint', backing != null ? h`<b class="n">${fmt(backing, 8)} BTC</b> <span class="dim">(${raw(C.fmtInt(backing))} sats)</span>` : unavailable, chipChain(L.read(ADDR.pool), 'pool.cbtcBackingSats()'), 'Reflection-attested sum of live self-custody lock sats (T_CBTC_LOCK). The lock value is public by design.'),
      rowKV('TAC: Bitcoin genesis', h`${a(L.btcTx('e2d10be19c2b73b86e14be99dc237a3d999ba3dfbe6f3e3714590acee2ca481e'), 'e2d10be1…ca481e')} <span class="dim">· 21,000,000 TAC fixed · block 948,242</span>`, chipBtc(L.btcTx('e2d10be19c2b73b86e14be99dc237a3d999ba3dfbe6f3e3714590acee2ca481e'), 'T_CETCH reveal from DEPLOYMENTS.md')),
      rowKV('Reflection depth required', num('24 blocks'), '', 'REFLECTION_CONFIRMATIONS on mainnet (SPEC section 6.2).'),
    ];
    const assetRows = dump ? assetTable(dump) : '';
    return h`<div class="kvs">${rows}</div>${assetRows}`;
  }
  function assetTable(dump) {
    const cnt = {};
    dump.snapshot.liveTriples.forEach((t) => { const k = t[2].toLowerCase(); cnt[k] = (cnt[k] || 0) + 1; });
    const entries = Object.entries(cnt).sort((x, y) => y[1] - x[1]);
    const rows = entries.map(([id, n]) => h`<tr><td>${D.ASSETS[id] ? D.ASSETS[id].sym : id.startsWith('0x1f117528') ? 'tETH/TAC LP share' : 'other asset'}</td><td>${a(L.tsAsset(id.slice(2)), C.shortHex(id, 10, 6), 'View on tacitscan')}</td><td class="r">${raw(C.fmtInt(n))}</td></tr>`);
    return h`<h4>Assets inside the proven state</h4><table class="tbl"><thead><tr><th>Asset</th><th>ID</th><th class="r">Live notes</th></tr></thead><tbody>${rows}</tbody></table>${note('Only TAC folds unbound; other Bitcoin assets enter the bridge via a bridge burn, a bound transfer or an AMM/farm output (SPEC 6.2). The full Bitcoin asset list needs the indexer\'s /assets route, which does not allow browser access from other origins; see tacitscan for it.')}`;
  }

  /* ================= BITCOIN: AMM pool ================= */
  const FOUNDING = { reserveA: 20000n, reserveB: 182704255n, shares: 1911566n };
  async function cardBtcAmm() {
    const dump = await D.api.dump();
    const p = (dump.snapshot.pools || [])[0];
    if (!p) throw new Error('no pool in the proven snapshot');
    const A = BigInt(p.reserveA), B = BigInt(p.reserveB), S = BigInt(p.totalShares);
    const tethPerTac = Number(A) / Number(B), tacPerTeth = Number(B) / Number(A);
    const k = A * B, k0 = FOUNDING.reserveA * FOUNDING.reserveB;
    const pct = (now, was) => ((Number(now) - Number(was)) / Number(was) * 100).toFixed(1) + '%';
    const rows = [
      rowKV('Pair', h`<b>tETH / TAC</b> <span class="dim">· fee ${p.feeBps / 100}% · protocol fee ${p.protocolFeeBps / 100}%</span>`, chipIdx('/reflection/dump', 'snapshot.pools[0] in the proven reflection state')),
      rowKV('tETH reserve', h`<b class="n">${fmt(A, 8)}</b> <span class="dim">${pct(A, FOUNDING.reserveA)} vs founding</span>`),
      rowKV('TAC reserve', h`<b class="n">${fmt(B, 8)}</b> <span class="dim">${pct(B, FOUNDING.reserveB)} vs founding</span>`),
      rowKV('Implied price', h`1 TAC = <b class="n">${tethPerTac.toFixed(8)}</b> tETH · 1 tETH = <b class="n">${tacPerTeth.toFixed(1)}</b> TAC`, '', 'Reserve ratio of a constant-product pool; not a quote that includes fees or depth.'),
      rowKV('LP shares outstanding', h`<b class="n">${raw(C.fmtInt(S))}</b> <span class="dim">(1,000 locked as MINIMUM_LIQUIDITY)</span>`),
      rowKV('Invariant k = A × B', h`<code>${k.toString()}</code> <span class="dim">${k >= BigInt(p.kLast || 0) ? '≥' : '<'} kLast ${p.kLast}</span> · ${k < k0 ? 'below' : 'above'} founding k`),
      rowKV('Pool id', h`${mono(C.shortHex(p.poolId, 12, 8))} ${copyBtn(p.poolId)}`),
      rowKV('State as of', h`Bitcoin block ${a(L.btcBlock(String(dump.snapshot.height)), C.fmtInt(dump.snapshot.height))}`, '', 'This is the pool as folded by the Bitcoin reflection guest, an independent implementation of the AMM rules.'),
      rowKV('Founded by', h`${a(L.btcTx('1ab6e965474ca6e09e23117c151a779c981643f7bb2aa930e40995d144a9e04c'), 'commit')} · ${a(L.btcTx('665bdd4b1b9d6220d62aa3d154a8de9870dd9a9ae92658ab03452660c2437bd5'), 'reveal (T_LP_ADD POOL_INIT)')}`, '', 'Founding reserves 0.0002 tETH / 1.82704255 TAC (docs/DEPLOYMENTS.md).'),
    ];
    return h`<div class="kvs">${rows}</div>${note('No UTXO holds pool funds: reserves are public numbers every indexer re-derives from envelopes; LP shares are ordinary hidden-amount Tacit notes. Units are 8-decimal in-system units.')}`;
  }

  /* ================= BITCOIN: feed of envelopes ================= */
  const FEED = { items: new Map(), filter: 'all', showAll: false, scan: { running: false, msg: '' }, landmarksLoaded: false };
  const LANDMARKS = [
    ['e2d10be19c2b73b86e14be99dc237a3d999ba3dfbe6f3e3714590acee2ca481e', 'TAC genesis etch'],
    ['665bdd4b1b9d6220d62aa3d154a8de9870dd9a9ae92658ab03452660c2437bd5', 'Bitcoin AMM pool founding'],
    ['aaa687924435ef64f056aa83beb7fabef4f57087f315655b52c596f83897bcf2', 'Cross-out mint (ETH → BTC leg)'],
    ['7320b6b654726ba99489bcf47f3d31dcf8a87040241def827b5fccd8836b0fbb', 'Return bridge burn (BTC → ETH leg)'],
    ['d7d7e46e316d535ec23ac4a79962365ad3b952b8b164fb3827b80eb7dec21eff', 'Recent TAC transfer (found by the live scan)'],
    ['34192ae1512ebb5e9287f396ed3a551eef7b36198a6c45c90ee359da8ad208ba', 'Recent TAC transfer, 2 outputs'],
  ];
  function addFeed(it) { if (!FEED.items.has(it.key)) FEED.items.set(it.key, it); else Object.assign(FEED.items.get(it.key), it); }
  function feedFromTx(tx, label, source) {
    const out = [];
    (tx.vin || []).forEach((vin, i) => {
      const env = C.envelopeFromWitness(vin.witness);
      if (!env) return;
      const d = C.describePayload(env.opcode, env.payload);
      out.push({ key: tx.txid + ':' + i, txid: tx.txid, vin: i, height: tx.status && tx.status.block_height != null ? tx.status.block_height : null, time: tx.status && tx.status.block_time || null, desc: d, source, label });
    });
    return out;
  }
  async function loadLandmarks() {
    if (FEED.landmarksLoaded) return;
    FEED.landmarksLoaded = true;
    await Promise.allSettled(LANDMARKS.map(async ([txid, label]) => {
      const tx = await D.btc.tx(txid);
      feedFromTx(tx, label, 'landmark').forEach(addFeed);
    }));
  }
  async function cardBtcFeed() {
    const [dumpR, bpsR, tipR] = await Promise.allSettled([D.api.dump(), D.api.btcPoolStatus(), D.btc.tipHeight()]);
    const tip = tipR.status === 'fulfilled' ? tipR.value : null;
    if (dumpR.status === 'fulfilled') {
      const recs = dumpR.value.snapshot.pendingDepositRecords.slice().sort((x, y) => y.height - x.height);
      recs.slice(0, 40).forEach((r) => {
        const txid = r.burnTxidDisplay.replace(/^0x/, '');
        addFeed({ key: txid + ':0', txid, vin: 0, height: r.height, time: null, source: 'reflection', label: 'Bridge burn' + (r.completed ? ' · minted on Ethereum' : ' · mint pending'),
          desc: { name: 'BRIDGE_BURN', label: 'Bridge burn', kind: 'bridge', assetId: r.asset.replace(/^0x/, ''), public: [['Asset id', r.asset.slice(2)], ['Nullifier', r.nu.slice(2)], ['Destination commitment', r.dest.slice(2)]], hidden: ['Burned amount', 'Recipient on Ethereum'], blurb: '' }, completed: r.completed });
      });
    }
    if (bpsR.status === 'fulfilled' && bpsR.value.leafCount) {
      try {
        const from = Math.max(0, bpsR.value.leafCount - 12);
        const notes = await D.api.btcPoolNotes(from, 12);
        const byTx = new Map();
        notes.notes.forEach((n) => { const g = byTx.get(n.txid) || { txid: n.txid, height: n.height, n: 0, asset: n.asset }; g.n++; byTx.set(n.txid, g); });
        byTx.forEach((g) => addFeed({ key: g.txid + ':pool', txid: g.txid, vin: 0, height: g.height, time: null, source: 'btc-pool', label: 'Shielded pool op · ' + g.n + ' new encrypted note(s)',
          desc: { name: 'T_BTC_POOL_SHIELD', label: 'Shielded pool op', kind: 'pool', assetId: g.asset.replace(/^0x/, ''), public: [['Asset id', g.asset.slice(2)], ['New leaves', String(g.n)]], hidden: ['Amounts', 'Owners'], blurb: '' } }));
      } catch (e) { /* the shielded-pool card reports its own failure */ }
    }
    loadLandmarks().then(() => renderFeedBody(tip));
    return feedMarkup(tip);
  }
  const KINDS = [['all', 'All'], ['etch', 'Etches'], ['transfer', 'Transfers'], ['mint', 'Mints'], ['burn', 'Burns'], ['bridge', 'Bridge'], ['amm', 'AMM'], ['pool', 'Shielded pool']];
  function kindOf(it) { const k = it.desc.kind; return (k === 'bridge' && it.desc.name === 'BRIDGE_BURN') ? 'bridge' : k; }
  function feedMarkup(tip) {
    const items = [...FEED.items.values()].sort((x, y) => (y.height ?? 1e9) - (x.height ?? 1e9));
    const counts = {}; items.forEach((it) => { const k = kindOf(it); counts[k] = (counts[k] || 0) + 1; });
    const chips = KINDS.map(([k, name]) => h`<button type="button" class="fchip ${FEED.filter === k ? 'on' : ''}" data-feed-filter="${k}">${name}${k === 'all' ? '' : raw(' <small>' + (counts[k] || 0) + '</small>')}</button>`);
    const list = items.filter((it) => FEED.filter === 'all' || kindOf(it) === FEED.filter);
    const shown = FEED.showAll ? list : list.slice(0, 10);
    const rows = shown.map((it) => {
      const d = it.desc;
      const where = it.height != null ? h`${a(L.btcBlock(String(it.height)), '#' + C.fmtInt(it.height))}${tip != null && it.height ? raw(' <span class="dim">' + (it.time ? C.ago(it.time) : btcAgeApprox(tip, it.height) + ' ago') + '</span>') : ''}` : raw('<span class="dim">mempool</span>');
      const what = d.ticker ? d.name + ' · ' + d.ticker : d.name;
      return h`<li class="fi k-${kindOf(it)}"><div class="fi-top"><span class="tag t-${kindOf(it)}">${d.label}</span><span class="fi-name">${what}</span><span class="fi-h">${where}</span></div>
        <div class="fi-sub">${btcTxLink(it.txid)} ${copyBtn(it.txid)} <a href="#" class="decode" data-decode="${it.txid}">decode</a> · ${a(L.tsTx(it.txid), 'tacitscan')} <span class="chip">${it.source}</span>${it.label ? raw(' <span class="dim">' + esc(it.label) + '</span>') : ''}</div></li>`;
    });
    const scan = FEED.scan;
    const controls = h`<div class="scan">
      <div class="scan-row"><label for="scan-n">Live-decode newest blocks:</label>
      <select id="scan-n"><option value="1">1 block</option><option value="3" selected>3 blocks</option><option value="6">6 blocks</option></select>
      <button class="btn small" type="button" id="scan-go" ${scan.running ? raw('disabled') : ''}>${scan.running ? 'Scanning…' : 'Scan'}</button>
      <span class="scan-msg" id="scan-msg">${scan.msg}</span></div>
      <p class="note">The scan downloads each block’s transactions from mempool.space (~140 requests per block) and looks for the <code>TACIT</code> envelope in every input witness, entirely in your browser. Most blocks hold none, so an empty result is normal.</p></div>`;
    return h`<div class="fchips">${chips}</div><ul class="feed">${rows.length ? rows : raw('<li class="note">Nothing in this filter yet.</li>')}</ul>
      ${list.length > 10 ? raw(`<button class="btn small" type="button" id="feed-more">${FEED.showAll ? 'Show fewer' : 'Show all ' + list.length}</button>`) : ''}${controls}
      ${note('Rows come from three places: bridge burns in the proven reflection state (indexer), recent Bitcoin-pool ops (pool indexer), and six reference envelopes decoded live from mempool.space. “Decode” runs the envelope parser in your browser on the raw witness.')}`;
  }
  function renderFeedBody(tip, animate) { const card = document.getElementById('p-btc-feed'); if (!card) return; setCard('p-btc-feed', feedMarkup(tip), true, { animate: !!animate }); }

  /* In-browser block scanner: pages through the block's transactions and decodes any Tacit envelope. */
  async function scanBlocks(n) {
    if (FEED.scan.running) return;
    FEED.scan.running = true; FEED.scan.msg = 'starting…';
    const tip = await D.btc.tipHeight();
    renderFeedBody(tip);
    const msg = (t) => { FEED.scan.msg = t; const m = document.getElementById('scan-msg'); if (m) m.textContent = t; };
    let found = 0, failed = 0;
    try {
      for (let hgt = tip; hgt > tip - n; hgt--) {
        const hash = await D.btc.blockHash(hgt);
        const blk = await D.btc.block(hash);
        const pages = Math.ceil(blk.tx_count / 25);
        let next = 0, done = 0;
        const worker = async () => {
          while (next < pages) {
            const idx = next++;
            let txs = null;
            for (let tryN = 0; tryN < 3 && !txs; tryN++) {
              try { txs = await D.btc.blockTxs(hash, idx * 25); }
              catch (e) { await new Promise((r) => setTimeout(r, 800 * (tryN + 1) * (e.status === 429 ? 3 : 1))); }
            }
            if (!txs) { failed++; continue; }
            for (const tx of txs) feedFromTx({ ...tx, status: { block_height: hgt, block_time: blk.timestamp } }, 'live scan', 'live scan').forEach((it) => { addFeed(it); found++; });
            done++;
            msg('block ' + C.fmtInt(hgt) + ': ' + done + '/' + pages + ' pages, ' + found + ' envelope(s) found');
          }
        };
        await Promise.all([0, 1, 2, 3, 4, 5].map(worker));
        msg('block ' + C.fmtInt(hgt) + ' done · ' + found + ' envelope(s) so far' + (failed ? ' · ' + failed + ' page(s) failed (rate-limited), result incomplete' : ''));
      }
      msg('finished: ' + found + ' envelope(s) in the newest ' + n + ' block(s)' + (failed ? ' · ' + failed + ' page(s) failed, so this may be incomplete' : ''));
    } catch (e) { msg('scan stopped: ' + ((e && e.message) || 'network error')); }
    FEED.scan.running = false;
    renderFeedBody(tip);
  }

  /* ================= BITCOIN: shielded pool ================= */
  async function cardBtcPool() {
    const [stR, rootsR] = await Promise.allSettled([D.api.btcPoolStatus(), D.api.btcPoolRoots()]);
    if (stR.status !== 'fulfilled') throw stR.reason;
    const s = stR.value;
    let notes = [];
    if (s.leafCount) { try { notes = (await D.api.btcPoolNotes(Math.max(0, s.leafCount - 6), 6)).notes.reverse(); } catch (e) { notes = []; } }
    const rows = [
      rowKV('Notes (leaves) in the tree', num(C.fmtInt(s.leafCount)), h`<a class="chip src-idx" href="${CFG.btcPool}/btc-pool/status" target="_blank" rel="noopener">pool indexer</a>`),
      rowKV('Merkle root', h`${mono(C.shortHex(s.root, 12, 8))} ${copyBtn(s.root)}`),
      rowKV('Replayed to Bitcoin block', h`${a(L.btcBlock(String(s.height)), C.fmtInt(s.height))} <span class="dim">(tip ${C.fmtInt(s.tip)}, ${s.confirmations} confirmations)</span>`),
      rowKV('Proof system', h`<b>${s.proofSystem}</b> <span class="dim">verified natively: ${s.verifierEnabled ? 'on' : 'off'}${s.halted ? ' · HALTED' : ''}</span>`),
    ];
    const list = notes.map((n) => h`<tr><td class="r">${n.leafIndex}</td><td>${btcTxLink(n.txid)}</td><td class="r">${a(L.btcBlock(String(n.height)), C.fmtInt(n.height))}</td><td>${D.ASSETS[n.asset.toLowerCase()] ? D.ASSETS[n.asset.toLowerCase()].sym : C.shortHex(n.asset, 8, 4)}</td><td>${mono(C.shortHex(n.leaf, 8, 4))}</td></tr>`);
    return h`<div class="kvs">${rows}</div>${notes.length ? h`<h4>Newest notes</h4><table class="tbl"><thead><tr><th class="r">Leaf</th><th>Bitcoin tx</th><th class="r">Block</th><th>Asset</th><th>Commitment</th></tr></thead><tbody>${list}</tbody></table>` : ''}
      ${note('Visible: which transaction created each note, its block, the asset id and an opaque leaf. Hidden: owner and amount (each note carries only an ephemeral key and a ciphertext only its recipient can open). Marked experimental by the protocol.')}`;
  }

  /* ================= BRIDGE ================= */
  const LOCAL = [];
  async function cardBridgeRelay() {
    const [eth, tipR, flowR, sfR, stR] = await Promise.allSettled([D.chain.eth(), D.btc.tipHeight(), D.api.flow(), D.api.statsFront(), D.api.reflStatus()]);
    const v = (r) => (r.status === 'fulfilled' ? r.value : null);
    const e = v(eth), tip = v(tipR), fl = v(flowR), sf = v(sfR), st = v(stR);
    if (!e && !st) throw new Error('neither the RPC nor the indexer answered');
    const relayH = e ? e.relayHeight : sf && sf.link ? sf.link.tip : null;
    const att = e && e.attestedHeight != null ? e.attestedHeight : st ? st.attestedHeight : null;
    const tipHash = e && e.relayTip ? [...C.hexToBytes(e.relayTip)].reverse().map((b) => b.toString(16).padStart(2, '0')).join('') : null;
    const link = sf && sf.link ? sf.link : null;
    const rows = [
      rowKV('Bitcoin tip', tip != null ? num(C.fmtInt(tip)) : unavailable, chipBtc('https://mempool.space/api/blocks/tip/height', 'mempool.space')),
      rowKV('Header relay tip', relayH != null ? h`<b class="n">${raw(C.fmtInt(relayH))}</b> <span class="dim">${tip != null ? '(' + (tip - relayH) + ' behind Bitcoin)' : ''}</span>` : unavailable, e ? chipChain(L.read(ADDR.relay), 'BitcoinLightRelay.tip() → blockHeight()') : chipIdx('/stats?view=front'), 'BitcoinLightRelay is permissionless: anyone can submit headers; it checks full proof of work and follows the heaviest chain.'),
      rowKV('Relay tip block', tipHash ? h`${a(L.btcBlock(tipHash), C.shortHex(tipHash, 14, 6))}` : unavailable, e ? chipChain(L.read(ADDR.relay)) : ''),
      rowKV('Proven (reflected) height', att != null ? h`<b class="n">${raw(C.fmtInt(att))}</b> <span class="dim">${relayH != null ? '(' + (relayH - att) + ' behind relay; 24 required)' : ''}</span>` : unavailable, e ? chipChain(L.read(ADDR.pool), 'pool.attestedReflectionTip()') : chipIdx('/reflection/status?network=mainnet')),
      rowKV('Attestations on Ethereum', link ? h`<b class="n">${raw(C.fmtInt(link.attests))}</b> <span class="dim">last ${C.ago(link.lastAttest.timeStamp)} · ${txLink(1, link.lastAttest.hash)}</span>` : unavailable, chipIdx('/stats?view=front'), 'Each attestation is an SP1 proof that moves the reflected Bitcoin state forward.'),
      rowKV('Lag guard', num('≤ 2,016 blocks'), '', 'REFLECTION_MAX_LAG: a proof whose tip is more than 2016 blocks behind the relay is refused.'),
    ];
    if (tip != null && relayH != null && att != null) { const last = LOCAL.at(-1); if (!last || Date.now() - last.t * 1000 > 20000) LOCAL.push({ t: Math.floor(Date.now() / 1000), btc: tip, relay: relayH, att }); if (LOCAL.length > 240) LOCAL.shift(); }
    const flowN = fl && fl.series ? fl.series.length : 0;
    let chartHtml, chartNote, chartTitle;
    if (flowN > 2) { chartHtml = sparkline(fl.series, ['btc', 'relay', 'att'], ['#f7931a', '#2dd4bf', '#a78bfa'], ['Bitcoin tip', 'Header relay', 'Proven height'], 520, 110); chartTitle = 'Last 24 hours'; chartNote = note('Data: indexer /flow, which snapshots these counters about every half hour; each point is a reading, not an event time.'); }
    else { chartHtml = sparkline(LOCAL, ['btc', 'relay', 'att'], ['#f7931a', '#2dd4bf', '#a78bfa'], ['Bitcoin tip', 'Header relay', 'Proven height'], 520, 110); chartTitle = 'Since you opened this page'; chartNote = note('The indexer\'s 24-hour history (/flow) holds only ' + flowN + ' reading(s) right now, so this chart uses your own live readings, one per refresh, instead of inventing history.'); }
    return h`<div class="kvs">${rows}</div><h4>${chartTitle}</h4>${chartHtml}${chartNote}`;
  }

  async function cardBridgeRoots() {
    const [eth, dumpR, bps, idxR] = await Promise.allSettled([D.chain.eth(), D.api.dump(), D.api.btcPoolStatus(), D.api.confIndexMeta()]);
    const v = (r) => (r.status === 'fulfilled' ? r.value : null);
    const e = v(eth), d = v(dumpR), b = v(bps), idx = v(idxR);
    const root = (label, val, src, hint) => rowKV(label, val ? h`${mono(C.shortHex(val, 14, 10))} ${copyBtn(val)}` : unavailable, src, hint);
    const rows = [
      root('Note-tree root (Ethereum pool)', e && e.root, chipChain(L.read(ADDR.pool), 'pool.currentRoot()'), e ? 'After ' + C.fmtInt(e.leaves) + ' leaves. Every spend proves membership against a root the pool has held.' : ''),
      root('Reflection digest (Bitcoin → Ethereum)', e && e.digest, chipChain(L.read(ADDR.pool), 'pool.attestedReflectionDigest()'), 'The hash chain the last proof extended; the next proof must start from exactly this value.'),
      root('Attested Bitcoin tip hash', e && e.attestedTip, chipChain(L.read(ADDR.pool), 'pool.attestedReflectionTip()'), 'Stored in the relay\'s internal (little-endian) byte order.'),
      root('Ethereum reflection digest (Ethereum → Bitcoin)', d && d.snapshot.ethReflDigest, chipIdx('/reflection/dump'), 'What the Bitcoin-side guest has folded about Ethereum (cross-outs, outbox messages).'),
      root('Ethereum sync-committee commitment', d && d.snapshot.ethSyncCommittee, chipIdx('/reflection/dump'), 'sp1-helios light client state used to prove finalized Ethereum state to Bitcoin.'),
      root('Stealth-lock set root', idx && idx.lockSet && idx.lockSet.root, chipIdx('/confidential/index?from=999999999&limit=1'), idx && idx.lockSet ? (idx.lockSet.verified ? 'Rebuilt from logs and checked against the pool.' : 'NOT verified against the pool.') : ''),
      root('Bitcoin shielded-pool root', b && b.root, h`<a class="chip src-idx" href="${CFG.btcPool}/btc-pool/status" target="_blank" rel="noopener">pool indexer</a>`),
    ];
    return h`<div class="kvs">${rows}</div>${note('Program keys the proofs are checked against are immutable and published: settle vkey 0x006cd47f…32d6e3, Bitcoin relay vkey 0x00bb158b…074bc5, Ethereum reflection vkey 0x00ca8171…aea72 (docs/DEPLOYMENTS.md).')}`;
  }

  async function cardBridgeFlow() {
    const [eth, stR, sfR, dumpR] = await Promise.allSettled([D.chain.eth(), D.api.reflStatus(), D.api.statsFront(), D.api.dump()]);
    const v = (r) => (r.status === 'fulfilled' ? r.value : null);
    const e = v(eth), s = v(stR), sf = v(sfR), dump = v(dumpR);
    if (!s && !e) throw new Error('indexer and RPC both unavailable');
    const recs = dump ? dump.snapshot.pendingDepositRecords : null;
    const pending = recs ? recs.filter((r) => !r.completed).length : null;
    const crossOuts = e && e.crossOuts != null ? Number(e.crossOuts) : sf ? sf.link.crossOuts : null;
    const folded = s ? s.foldedCrossoutCount : null;
    const tac = sf && sf.tac ? sf.tac : null;
    const svg = raw(`<svg class="flow" viewBox="0 0 520 150" role="img" aria-label="Bitcoin to Ethereum bridge burns and Ethereum to Bitcoin cross-outs">
      <rect x="6" y="20" width="118" height="110" rx="10" class="fb-btc"/><text x="65" y="45" class="ft">Bitcoin</text><text x="65" y="68" class="fs">burn a note</text><text x="65" y="86" class="fs">(T_BURN / 0x2B)</text><text x="65" y="116" class="fs">re-mint ← proof</text>
      <rect x="396" y="20" width="118" height="110" rx="10" class="fb-eth"/><text x="455" y="45" class="ft">Ethereum</text><text x="455" y="68" class="fs">mint note once</text><text x="455" y="86" class="fs">(OP_BRIDGE_MINT)</text><text x="455" y="116" class="fs">cross out →</text>
      <path d="M128 52 H392" class="fa f1"/><path d="M386 46 L394 52 L386 58" class="fh f1"/>
      <path d="M392 108 H128" class="fa f2"/><path d="M134 102 L126 108 L134 114" class="fh f2"/>
      <text x="260" y="42" class="fl">${s ? C.fmtInt(s.bridgeBurns) : '?'} burns recorded → ${s ? C.fmtInt(s.bridgeMinted) : '?'} minted</text>
      <text x="260" y="128" class="fl">${crossOuts != null ? crossOuts : '?'} cross-outs recorded → ${folded != null ? folded : '?'} folded on Bitcoin</text>
      <rect x="195" y="62" width="130" height="34" rx="8" class="fb-mid"/><text x="260" y="76" class="fs">header relay + ZK</text><text x="260" y="90" class="fs">“reflection” proofs</text></svg>`);
    const rows = [
      rowKV('Bitcoin → Ethereum: burns recorded', s ? num(C.fmtInt(s.bridgeBurns)) : unavailable, chipIdx('/reflection/status?network=mainnet')),
      rowKV('… notes minted on Ethereum', s ? num(C.fmtInt(s.bridgeMinted)) : unavailable, chipIdx('/reflection/status?network=mainnet'), 'Counter kept by the reflection status; includes bundled burn-mints. Burns can target other deployments, so recorded minus minted is not by itself "stuck".'),
      rowKV('Burn deposits awaiting a bundle', s ? num(C.fmtInt(s.burnsAwaitingBundle)) : unavailable, chipIdx('/reflection/status?network=mainnet'), 'Burns proven on Bitcoin that have not yet been put into a mint batch: the in-flight number.'),
      rowKV('Burn-deposit records: completed / pending', recs ? h`<b class="n">${raw(C.fmtInt(recs.length - pending))}</b> / <b class="n">${raw(C.fmtInt(pending))}</b>` : unavailable, chipIdx('/reflection/dump'), 'From the reflection snapshot (pendingDepositRecords[].completed).'),
      rowKV('Ethereum → Bitcoin: cross-outs recorded', crossOuts != null ? num(C.fmtInt(crossOuts)) : unavailable, e ? chipChain(L.read(ADDR.pool), 'pool.attestedCrossOutCount()') : chipIdx('/stats?view=front'), 'Counter of CrossOutRecorded events the pool has attested.'),
      rowKV('… folded into Bitcoin state', folded != null ? num(C.fmtInt(folded)) : unavailable, chipIdx('/reflection/status?network=mainnet'), 'Recorded minus folded = cross-outs whose T_CROSSOUT_MINT has not yet been folded (the holder must still broadcast the re-mint).'),
      rowKV('Fast-lane notes consumed on Ethereum', e && e.consumed != null ? num(C.fmtInt(Number(e.consumed))) : unavailable, e ? chipChain(L.read(ADDR.pool), 'pool.attestedBitcoinConsumedCount()') : ''),
    ];
    const tacRows = tac ? [
      rowKV('TAC wrapped into the pool (public ERC-20 → note)', h`<b class="n">${raw(C.fmtInt(tac.tacIn.n))}</b> wraps · ${fmt(jsonNum(tac.tacIn.v), 18, 0)} TAC`, chipIdx('/stats?view=front')),
      rowKV('TAC paid out of the pool as ERC-20', h`<b class="n">${raw(C.fmtInt(tac.tacOut.n))}</b> mints · ${fmt(jsonNum(tac.tacOut.v), 18, 0)} TAC · ${raw(C.fmtInt(tac.tacOut.who))} recipients`, chipIdx('/stats?view=front')),
    ] : [];
    return h`${svg}<div class="kvs">${rows}${tacRows}</div>`;
  }

  async function cardBridgeBurns() {
    const [dumpR, tipR] = await Promise.allSettled([D.api.dump(), D.btc.tipHeight()]);
    if (dumpR.status !== 'fulfilled') throw dumpR.reason;
    const tip = tipR.status === 'fulfilled' ? tipR.value : null;
    const recs = dumpR.value.snapshot.pendingDepositRecords.slice().sort((x, y) => y.height - x.height).slice(0, 8);
    const rows = recs.map((r) => {
      const txid = r.burnTxidDisplay.replace(/^0x/, '');
      return h`<tr><td>${a(L.btcBlock(String(r.height)), C.fmtInt(r.height))}</td><td>${btcTxLink(txid)}</td><td>${D.ASSETS[r.asset.toLowerCase()] ? D.ASSETS[r.asset.toLowerCase()].sym : C.shortHex(r.asset, 8, 4)}</td><td>${r.completed ? raw('<span class="ok">minted</span>') : raw('<span class="warn">pending</span>')}</td><td><a href="#" class="decode" data-decode="${txid}">decode</a></td></tr>`;
    });
    return h`<table class="tbl"><thead><tr><th>Block</th><th>Bitcoin burn tx</th><th>Asset</th><th>On Ethereum</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      ${note('From the proven reflection snapshot (indexer /reflection/dump). Each row is public: the asset, the nullifier and the destination commitment inside the envelope. The burned amount and the Ethereum recipient are not. “Decode” re-parses the envelope from mempool.space.' + (tip ? '' : ''))}`;
  }

  window.TMUI = { skeleton: (n) => (window.TMFX ? window.TMFX.skeleton(n) : ''), h, raw, esc, $, $$, L, a, mono, chipChain, chipIdx, chipBtc, addrLink, txLink, btcTxLink, copyBtn, unavailable, big, fmt, num, rowKV, note, jsonNum, setCard, runCard, sparkline, nowSec, btcAgeApprox, part };
  window.TMPanels1 = { renderStrip, cardBtcState, cardBtcAmm, cardBtcFeed, cardBtcPool, cardBridgeRelay, cardBridgeRoots, cardBridgeFlow, cardBridgeBurns, FEED, scanBlocks, renderFeedBody, feedFromTx, addFeed, KINDS };
})();
