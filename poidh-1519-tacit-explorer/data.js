/* data.js — network layer. Every request is a plain GET/POST to a public, read-only endpoint.
 * Failures are surfaced as `unavailable`, never replaced with made-up numbers. */
(function () {
  'use strict';
  const C = window.TacitCore;

  const CFG = {
    api: 'https://api.tacit.finance',
    btcPool: 'https://tacit-btc-pool-mainnet.onrender.com',
    mempool: 'https://mempool.space/api',
    rpc: {
      1: ['https://ethereum-rpc.publicnode.com', 'https://rpc.mevblocker.io', 'https://ethereum.publicnode.com', 'https://eth.drpc.org'],
      8453: ['https://base-rpc.publicnode.com', 'https://mainnet.base.org', 'https://base.drpc.org'],
      4663: ['https://rpc.mainnet.chain.robinhood.com'],
    },
    explorer: { 1: 'https://etherscan.io', 8453: 'https://basescan.org' },
    blockSec: { 1: 12, 8453: 2 },
  };

  /* Deployed addresses: docs/DEPLOYMENTS.md and contracts/deployments/*.json in src-company/tacit. */
  const ADDR = {
    pool: '0x000000000Ed1eabD231Be41d93b719056F7febFC',
    engine: '0x000000003f608BDdF0ca45934003ffb9DbDF70DB',
    router: '0x000000005dA3E3B73726af3c774Deeb9472D4992',
    publicAmm: '0x00000000E36C7EC997CC59DCda9E03673B448119',
    relayer: '0x000000009C28617AC88B52Eae5EFaAcdD4aC34c3',
    outbox: '0x00000000a26a6E291972666a9687741dBa11Af46',
    btcCallExecutor: '0x00000000Df8263Ac5810C53B31AaE20ee53C247f',
    relay: '0x20A6ddc2C6E620c6248B5A34E85996516FDd19D0',
    tac: '0xA1313eb9f3A445606D9583bcAc3ebeB56a858279',
    tacBTC: '0xdf1d99148bEb7a9AFf1d95C49B3d22b7ed90D696',
    tacUSD: '0x23cACFFAc2674514A6d4F6cD420B4cc2aC921564',
    wTAC: '0x2018139a8FDd3666855BE3315C7683b4D6aB7AEf',
    farm: '0x000031C47Cb61faB1CE2790a69625FABB71EDE24',
    multisig: '0x006CD14F36F65eCbB29b2519cCBe63A0DC8549F2',
    evmPool: '0x000000c2A20657CE25f2Ba99737933D031AFBEE9',
    evmRouter: '0x0000006C96Afa6f1cD4DF8FE19bc0d8B6A6Cd7B5',
    xns: '0x6e797ba2d3103aF167918e71a7E01DE40D45f74b',
    points: '0x000000C918e44A3a443937fA7594eA4f7C95D6b9',
    buyback: '0x6919cbEf0e70AFFA02Ae02c86c532A137154f250',
  };
  const ASSETS = {
    '0x3cba71e1114af183cdeacc6b8457a474d17529fd28704480ca799d0d03126f34': { sym: 'cETH / tETH', dec: 8 },
    '0xf0bbe868af10c6c67652a99709bf32048d1aa7194efe3e9a1ef1bde43f94762b': { sym: 'TAC', dec: 8 },
    '0x62a20d98fc1cd20289621d1315294cb8772f934d822e404b71e1f471cf0679c8': { sym: 'cBTC', dec: 8 },
    '0x8f4490dd3728b0ee904d7a67c11b37ffd463a5c7f08b79810006995ee8a9679d': { sym: 'cUSD', dec: 8 },
    '0x1097c9e552ae4fce2a8c416b93403953fa445a5f2cdae8ced36d9a78cfe40832': { sym: 'wTAC', dec: 8 },
  };
  const KNOWN_ADDR = {};
  [['ConfidentialPool', ADDR.pool], ['CollateralEngine', ADDR.engine], ['ConfidentialRouter', ADDR.router], ['TacitPublicAmm', ADDR.publicAmm],
    ['TacitRelayer', ADDR.relayer], ['EthCallOutbox', ADDR.outbox], ['BtcCallExecutor', ADDR.btcCallExecutor], ['BitcoinLightRelay', ADDR.relay],
    ['TAC token', ADDR.tac], ['tacBTC (cBTC)', ADDR.tacBTC], ['tacUSD (cUSD)', ADDR.tacUSD], ['wTAC', ADDR.wTAC], ['FarmManager', ADDR.farm],
    ['Ops multisig', ADDR.multisig], ['TacitEvmPool', ADDR.evmPool], ['TacitEvmPoolRouter', ADDR.evmRouter], ['XNS registry', ADDR.xns],
    ['PointsDistributor', ADDR.points], ['TacBuyback', ADDR.buyback]].forEach(([n, a]) => { KNOWN_ADDR[a.toLowerCase()] = n; });

  /* 4-byte selectors / topics, computed once with keccak-256 from the signatures in src-company/tacit (see NOTES.md). */
  const SEL = {
    nextLeafIndex: '0x0be4f422', currentRoot: '0xfdab463d', cbtcBackingSats: '0x9f5b61d9', successor: '0x6ff968c3',
    attestedTip: '0x182f6171', attestedCrossOuts: '0xa6f8c9d6', attestedConsumed: '0x281d8cc9', attestedDigest: '0xb909cdaf',
    relayTip: '0x2755cd2d', blockHeight: '0x59a53331', totalSupply: '0x18160ddd', decimals: '0x313ce567', outstandingCusd: '0xa42542c0',
    evmNextIndex: '0xfc7e9c6f', evmRoot: '0xebf0c717', xnsGetName: '0x5fd4b08a', xnsGetAddress: '0xbf40fac1',
    balanceOf: '0x70a08231',
  };
  const TOPIC = {
    transact: '0xdf0ed29e998ac2f2ff0f0516cb9c1b95af189e00d55af3764b95bdd2a835e53a',
    wrap: '0xf5d1711d21af6f42622ab6237626933cefc42cc9f0663d81b7c4c7bc5ce99e44',
    crossOut: '0x1dcbefc1323b3b80f7cedfeb490313eff6ded6186b4cf10d72b383ee81d90c13',
    nullifiers: '0x576d91547505afce99e7ebe2baf1a0948b5915598105a55f40ba72fea86e875e',
    leaves: '0x7783fb256f5b4e1d4d8b79583488756286326ae15d9997d4098ce5432ed2708b',
    consumed: '0x288856bf0e0f2858e11544264dcf77f1212699edb15bcf447343b07b471bce9a',
    transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  };

  /* ---------- source health registry ---------- */
  const SRC = {};
  function mark(id, ok, detail) {
    const s = SRC[id] || (SRC[id] = { id, ok: null, at: 0, fails: 0, detail: '' });
    s.ok = ok; s.at = Date.now(); s.detail = detail || '';
    if (!ok) s.fails++;
    if (window.TM && window.TM.onSource) window.TM.onSource(s);
  }

  /* ---------- generic fetch ---------- */
  const hostId = (url) => { try { const h = new URL(url).host; return h === 'api.tacit.finance' ? 'indexer' : h.startsWith('tacit-btc-pool') ? 'btcpool' : h === 'mempool.space' ? 'mempool' : null; } catch (e) { return null; } };
  async function fetchJSON(url, opts = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), opts.timeout || 20000);
    const id = hostId(url);
    try {
      const res = await fetch(url, { signal: ctl.signal, headers: opts.headers, method: opts.method, body: opts.body, cache: 'no-store' });
      if (!res.ok) { const e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
      const j = await res.json();
      if (id) mark(id, true, '');
      return j;
    } catch (e) {
      // a 404 is an answer ("not found"), not an outage
      if (id) mark(id, e.status === 404, e.status ? 'HTTP ' + e.status : (e.name === 'AbortError' ? 'timeout' : 'network error'));
      throw e;
    } finally { clearTimeout(t); }
  }
  async function fetchText(url, opts = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), opts.timeout || 15000);
    const id = hostId(url);
    try {
      const res = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
      if (!res.ok) { const e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
      const x = await res.text();
      if (id) mark(id, true, '');
      return x;
    } catch (e) {
      if (id) mark(id, e.status === 404, e.status ? 'HTTP ' + e.status : (e.name === 'AbortError' ? 'timeout' : 'network error'));
      throw e;
    } finally { clearTimeout(t); }
  }

  /* ---------- cache with TTL; concurrent callers share one request ---------- */
  const cache = new Map();
  function memo(key, ttlMs, fn, force) {
    const hit = cache.get(key);
    if (!force && hit && Date.now() - hit.at < ttlMs) return hit.p;
    const p = fn();
    const entry = { at: Date.now(), p, ok: undefined };
    cache.set(key, entry);
    p.then(() => { entry.ok = true; entry.fetchedAt = Date.now(); }, () => { cache.delete(key); });
    return p;
  }
  const clearCache = () => cache.clear();
  const ageOf = (key) => { const h = cache.get(key); return h && h.fetchedAt ? h.fetchedAt : null; };

  /* ---------- JSON-RPC with endpoint fallback and batching ---------- */
  async function rpcPost(chain, payload, timeout) {
    const urls = CFG.rpc[chain];
    let lastErr;
    for (const url of urls) {
      try {
        const res = await fetchJSON(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), timeout: timeout || 20000 });
        const items = Array.isArray(payload) ? res : [res];
        if (Array.isArray(payload) && !Array.isArray(res)) throw new Error('batch not supported');
        // If every item errored with a provider limit, try the next endpoint.
        if (items.every((r) => r && r.error)) throw new Error(items[0].error.message || 'rpc error');
        mark('rpc' + chain, true, new URL(url).host);
        return res;
      } catch (e) { lastErr = e; mark('rpc' + chain, false, new URL(url).host + ': ' + (e.message || e)); }
    }
    throw lastErr || new Error('no RPC endpoint reachable');
  }
  async function rpc(chain, method, params, timeout) {
    const res = await rpcPost(chain, { jsonrpc: '2.0', id: 1, method, params }, timeout);
    if (res.error) throw new Error(res.error.message || 'rpc error');
    return res.result;
  }
  /* calls: [[method, params], ...] -> array of {ok,result|error} (never throws per item) */
  async function rpcBatch(chain, calls, timeout) {
    if (!calls.length) return [];
    const payload = calls.map((c, i) => ({ jsonrpc: '2.0', id: i, method: c[0], params: c[1] }));
    const res = await rpcPost(chain, payload, timeout);
    const by = new Map(res.map((r) => [r.id, r]));
    return payload.map((p) => {
      const r = by.get(p.id);
      return r && !r.error && r.result !== undefined ? { ok: true, result: r.result } : { ok: false, error: (r && r.error && r.error.message) || 'no result' };
    });
  }
  const ethCall = (to, data) => ['eth_call', [{ to, data }, 'latest']];
  const hexNum = (r) => (r && r.ok ? BigInt(r.result) : null);

  /* ---------- eth_getLogs in <=chunk windows (public RPCs cap ranges) ---------- */
  async function getLogs(chain, filter, fromBlock, toBlock, chunk) {
    const out = [];
    const step = chunk || 5000;
    for (let from = fromBlock; from <= toBlock; from += step) {
      const to = Math.min(toBlock, from + step - 1);
      // Free public RPCs rate-limit bursts (HTTP 403/429): back off and retry the same range twice before giving up.
      let logs, err;
      for (const wait of [0, 1500, 4000]) {
        if (wait) await new Promise((r) => setTimeout(r, wait));
        try { logs = await rpc(chain, 'eth_getLogs', [{ ...filter, fromBlock: '0x' + from.toString(16), toBlock: '0x' + to.toString(16) }], 30000); err = null; break; }
        catch (e) { err = e; }
      }
      if (err) throw err;
      for (const l of logs) out.push(l);
    }
    return out;
  }

  async function blockTimes(chain, numbers) { // number[] -> Map(number -> unix ts)
    const uniq = [...new Set(numbers)];
    const res = await rpcBatch(chain, uniq.map((n) => ['eth_getBlockByNumber', ['0x' + n.toString(16), false]]));
    const m = new Map();
    uniq.forEach((n, i) => { if (res[i].ok && res[i].result) m.set(n, Number(BigInt(res[i].result.timestamp))); });
    return m;
  }

  /* ---------- XNS (xns.name) — on-chain getName(address) on Ethereum ---------- */
  const xnsCache = new Map(); // addr(lower) -> string|'' (empty = no name)
  async function resolveXns(addrs) {
    const todo = [...new Set(addrs.map((a) => a.toLowerCase()))].filter((a) => /^0x[0-9a-f]{40}$/.test(a) && !xnsCache.has(a)).slice(0, 120);
    if (!todo.length) return;
    const calls = todo.map((a) => ethCall(ADDR.xns, SEL.xnsGetName + C.pad32(a.slice(2))));
    const res = await rpcBatch(1, calls);
    todo.forEach((a, i) => {
      if (!res[i].ok) return; // leave unresolved so it can be retried; never invent a name
      let name = '';
      try { name = C.abiString(res[i].result, 0); } catch (e) { name = ''; }
      xnsCache.set(a, /^[\x21-\x7e]{1,64}$/.test(name) ? name : '');
    });
  }
  async function xnsAddress(name) {
    const data = SEL.xnsGetAddress + C.abiEncodeString(name);
    const r = await rpc(1, 'eth_call', [{ to: ADDR.xns, data }, 'latest']);
    const a = '0x' + r.slice(26, 66);
    return /^0x0{40}$/.test(a) ? null : a;
  }

  /* ---------- Tacit indexer + Bitcoin endpoints ---------- */
  const api = {
    statsFront: (f) => memo('stats', 30000, () => fetchJSON(CFG.api + '/stats?view=front'), f),
    flow: (f) => memo('flow', 60000, () => fetchJSON(CFG.api + '/flow'), f),
    reflStatus: (f) => memo('refl', 20000, () => fetchJSON(CFG.api + '/reflection/status?network=mainnet'), f),
    dump: (f) => memo('dump', 240000, () => fetchJSON(CFG.api + '/reflection/dump', { timeout: 60000 }), f),
    confIndexMeta: (f) => memo('cidx', 30000, () => fetchJSON(CFG.api + '/confidential/index?from=999999999&limit=1'), f),
    econ: (f) => memo('econ', 120000, () => fetchJSON(CFG.api + '/relay/economics'), f),
    farm: (f) => memo('farm', 60000, () => fetchJSON(CFG.api + '/farm/program?network=mainnet'), f),
    farmHealth: (f) => memo('farmh', 60000, () => fetchJSON(CFG.api + '/farm/health'), f),
    prover: (f) => memo('prover', 30000, () => fetchJSON(CFG.api + '/prover/board'), f),
    relayState: (f) => memo('relaystate', 30000, () => fetchJSON(CFG.api + '/confidential/relay'), f),
    leaderboard: (f) => memo('lb', 120000, () => fetchJSON(CFG.api + '/leaderboard'), f),
    points: (a) => fetchJSON(CFG.api + '/points/' + a),
    claim: (a) => fetchJSON(CFG.api + '/claim/' + a),
    btcPoolStatus: (f) => memo('bps', 30000, () => fetchJSON(CFG.btcPool + '/btc-pool/status'), f),
    btcPoolNotes: (from, limit) => fetchJSON(CFG.btcPool + '/btc-pool/notes?from=' + from + '&limit=' + limit),
    btcPoolRoots: (f) => memo('bpr', 30000, () => fetchJSON(CFG.btcPool + '/btc-pool/roots'), f),
  };
  const btc = {
    tipHeight: (f) => memo('btctip', 20000, async () => Number(await fetchText(CFG.mempool + '/blocks/tip/height')), f),
    tx: (txid) => fetchJSON(CFG.mempool + '/tx/' + txid),
    blockHash: (h) => fetchText(CFG.mempool + '/block-height/' + h),
    block: (hash) => fetchJSON(CFG.mempool + '/block/' + hash),
    blockTxs: (hash, start) => fetchJSON(CFG.mempool + '/block/' + hash + '/txs/' + start, { timeout: 30000 }),
    recentBlocks: (f) => memo('blocks15', 45000, () => fetchJSON(CFG.mempool + '/v1/blocks'), f),
    addrTxs: (a) => fetchJSON(CFG.mempool + '/address/' + a + '/txs'),
    addr: (a) => fetchJSON(CFG.mempool + '/address/' + a),
  };

  /* ---------- the Ethereum / Base chain reads shared by several panels ---------- */
  async function readEthState() {
    const P = ADDR.pool;
    const calls = [
      ['eth_blockNumber', []], ['eth_getBlockByNumber', ['latest', false]],
      ethCall(P, SEL.nextLeafIndex), ethCall(P, SEL.currentRoot), ethCall(P, SEL.cbtcBackingSats), ethCall(P, SEL.successor),
      ethCall(P, SEL.attestedTip), ethCall(P, SEL.attestedCrossOuts), ethCall(P, SEL.attestedConsumed), ethCall(P, SEL.attestedDigest),
      ethCall(ADDR.relay, SEL.relayTip),
      ['eth_getBalance', [P, 'latest']],
      ethCall(ADDR.tac, SEL.totalSupply), ethCall(ADDR.tacBTC, SEL.totalSupply), ethCall(ADDR.tacUSD, SEL.totalSupply), ethCall(ADDR.wTAC, SEL.totalSupply),
      ethCall(ADDR.tac, SEL.decimals), ethCall(ADDR.tacBTC, SEL.decimals), ethCall(ADDR.tacUSD, SEL.decimals), ethCall(ADDR.wTAC, SEL.decimals),
      ethCall(ADDR.engine, SEL.outstandingCusd),
      ethCall(ADDR.evmPool, SEL.evmNextIndex), ['eth_getBalance', [ADDR.evmPool, 'latest']],
    ];
    const r = await rpcBatch(1, calls);
    const out = { at: Date.now() };
    out.block = r[0].ok ? Number(BigInt(r[0].result)) : null;
    out.blockTime = r[1].ok && r[1].result ? Number(BigInt(r[1].result.timestamp)) : null;
    out.leaves = hexNum(r[2]); out.root = r[3].ok ? r[3].result : null; out.backingSats = hexNum(r[4]);
    out.successor = r[5].ok ? '0x' + r[5].result.slice(26) : null;
    out.attestedTip = r[6].ok ? r[6].result : null; out.crossOuts = hexNum(r[7]); out.consumed = hexNum(r[8]); out.digest = r[9].ok ? r[9].result : null;
    out.relayTip = r[10].ok ? r[10].result : null;
    out.poolBalance = hexNum(r[11]);
    out.supply = { tac: hexNum(r[12]), cbtc: hexNum(r[13]), cusd: hexNum(r[14]), wtac: hexNum(r[15]) };
    out.dec = { tac: hexNum(r[16]), cbtc: hexNum(r[17]), cusd: hexNum(r[18]), wtac: hexNum(r[19]) };
    out.outstandingCusd = hexNum(r[20]);
    out.evmLeaves = hexNum(r[21]); out.evmBalance = hexNum(r[22]);
    // heights from the relay (second round, depends on the first)
    const hs = [];
    if (out.relayTip) hs.push(ethCall(ADDR.relay, SEL.blockHeight + out.relayTip.slice(2)));
    if (out.attestedTip) hs.push(ethCall(ADDR.relay, SEL.blockHeight + out.attestedTip.slice(2)));
    const h = await rpcBatch(1, hs);
    let i = 0;
    out.relayHeight = out.relayTip ? hexNum(h[i++]) : null;
    out.attestedHeight = out.attestedTip ? hexNum(h[i++]) : null;
    if (out.relayHeight != null) out.relayHeight = Number(out.relayHeight);
    if (out.attestedHeight != null) out.attestedHeight = Number(out.attestedHeight);
    return out;
  }
  async function readBaseState() {
    const r = await rpcBatch(8453, [
      ['eth_blockNumber', []], ['eth_getBlockByNumber', ['latest', false]],
      ['eth_getBalance', [ADDR.evmPool, 'latest']], ethCall(ADDR.evmPool, SEL.evmNextIndex),
    ]);
    return {
      at: Date.now(),
      block: r[0].ok ? Number(BigInt(r[0].result)) : null,
      blockTime: r[1].ok && r[1].result ? Number(BigInt(r[1].result.timestamp)) : null,
      evmBalance: hexNum(r[2]), evmLeaves: hexNum(r[3]),
    };
  }
  /* Robinhood Chain (4663): the EVM pool lives at the same address; read its balance and note count directly. */
  async function readRhState() {
    const r = await rpcBatch(4663, [
      ['eth_blockNumber', []],
      ['eth_getBalance', [ADDR.evmPool, 'latest']], ethCall(ADDR.evmPool, SEL.evmNextIndex),
    ]);
    return { at: Date.now(), block: r[0].ok ? Number(BigInt(r[0].result)) : null, evmBalance: hexNum(r[1]), evmLeaves: hexNum(r[2]) };
  }
  const chain = {
    eth: (f) => memo('ethstate', 25000, readEthState, f),
    base: (f) => memo('basestate', 15000, readBaseState, f),
    rh: (f) => memo('rhstate', 25000, readRhState, f),
  };

  /* Pool event window on Ethereum: last N blocks, grouped by transaction. */
  async function readPoolActivity(headBlock, span) {
    const from = headBlock - span;
    const logs = await getLogs(1, { address: ADDR.pool, topics: [[TOPIC.wrap, TOPIC.crossOut, TOPIC.nullifiers, TOPIC.leaves, TOPIC.consumed]] }, from, headBlock, 5000);
    const txs = new Map();
    for (const l of logs) {
      const k = l.transactionHash;
      let t = txs.get(k);
      if (!t) { t = { hash: k, block: Number(BigInt(l.blockNumber)), wraps: [], nullifiers: 0, leaves: 0, crossOuts: [], consumed: 0 }; txs.set(k, t); }
      const d = l.data.replace(/^0x/, '');
      const t0 = l.topics[0];
      if (t0 === TOPIC.wrap) t.wraps.push({ asset: l.topics[2], amount: BigInt('0x' + d.slice(0, 64)) });
      else if (t0 === TOPIC.nullifiers) t.nullifiers += Number(BigInt('0x' + d.slice(64, 128)));
      else if (t0 === TOPIC.leaves) { const off = Number(BigInt('0x' + d.slice(0, 64))) * 2; t.leaves += Number(BigInt('0x' + d.slice(off, off + 64))); }
      else if (t0 === TOPIC.crossOut) t.crossOuts.push({ claim: l.topics[1], destChain: Number(BigInt('0x' + d.slice(0, 64))), asset: '0x' + d.slice(192, 256) });
      else if (t0 === TOPIC.consumed) { const off = Number(BigInt('0x' + d.slice(0, 64))) * 2; t.consumed += Number(BigInt('0x' + d.slice(off, off + 64))); }
    }
    return { from, to: headBlock, span, list: [...txs.values()].sort((a, b) => b.block - a.block), logCount: logs.length };
  }

  /* TacitEvmPool Transact events on Ethereum (chain 1) or Base (8453). */
  async function readEvmPool(chainId, headBlock, span) {
    const from = headBlock - span;
    const logs = await getLogs(chainId, { address: ADDR.evmPool, topics: [TOPIC.transact] }, from, headBlock, chainId === 8453 ? 2500 : 5000);
    const ev = logs.map((l) => {
      const d = l.data.replace(/^0x/, '');
      const w = (i) => BigInt('0x' + d.slice(i * 64, i * 64 + 64));
      let ext = w(5); if (ext >= (1n << 255n)) ext -= (1n << 256n);
      return {
        block: Number(BigInt(l.blockNumber)), tx: l.transactionHash, logIndex: Number(BigInt(l.logIndex)),
        ext, kind: ext > 0n ? 'deposit' : ext < 0n ? 'withdraw' : 'transfer',
        recipient: '0x' + d.slice(4 * 64 + 24, 5 * 64), relayer: '0x' + d.slice(6 * 64 + 24, 7 * 64), fee: w(7),
        spends: (BigInt(l.topics[1]) !== 0n ? 1 : 0) + (BigInt(l.topics[2]) !== 0n ? 1 : 0),
        outs: (w(0) !== 0n ? 1 : 0) + (w(1) !== 0n ? 1 : 0),
      };
    }).sort((a, b) => b.block - a.block || b.logIndex - a.logIndex);
    return { chain: chainId, from, to: headBlock, span, events: ev };
  }
  const windows = {
    ethPool: (head, f) => memo('win-ethpool', 120000, () => readPoolActivity(head, 9000), f),
    evmBase: (head, f) => memo('win-evmbase', 60000, () => readEvmPool(8453, head, 2000), f),
    evmEth: (head, f) => memo('win-evmeth', 180000, () => readEvmPool(1, head, 9000), f),
  };

  window.TMData = { clearCache, CFG, ADDR, ASSETS, KNOWN_ADDR, SEL, TOPIC, SRC, mark, memo, ageOf, fetchJSON, fetchText, rpc, rpcBatch, ethCall, hexNum, getLogs, blockTimes, xnsCache, resolveXns, xnsAddress, api, btc, chain, windows, readEvmPool, readPoolActivity };
})();
