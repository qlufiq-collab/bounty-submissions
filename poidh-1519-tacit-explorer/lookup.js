/* lookup.js — the search box: tacit1 IDs, Bitcoin txids / addresses, EVM addresses / tx hashes, XNS names. */
(function () {
  'use strict';
  const C = window.TacitCore, D = window.TMData, U = window.TMUI;
  const { h, raw, esc, a, mono, L, copyBtn, addrLink, txLink, btcTxLink, unavailable, rowKV, note, fmt, chipChain, chipIdx } = U;
  const { ADDR } = D;
  const box = () => document.getElementById('lookup-result');

  const KNOWN_SAMPLE_TAC = 'f0bbe868af10c6c67652a99709bf32048d1aa7194efe3e9a1ef1bde43f94762b';

  async function sha256(bytes) { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); }
  async function addressId(addr) {
    const enc = new TextEncoder();
    const tag = enc.encode('tacit-address-id-v1\0'), body = enc.encode(String(addr).toLowerCase().replace(/\s/g, ''));
    const buf = new Uint8Array(tag.length + body.length); buf.set(tag); buf.set(body, tag.length);
    const x = C.bytesToHex((await sha256(buf)).slice(0, 8));
    return x.slice(0, 4) + '·' + x.slice(4, 8) + '·' + x.slice(8, 12) + '·' + x.slice(12);
  }
  async function etchAssetId(txid, vout) {
    const b = C.hexToBytes(txid).reverse();
    const buf = new Uint8Array(36); buf.set(b); new DataView(buf.buffer).setUint32(32, vout, true);
    return C.bytesToHex(await sha256(buf));
  }

  function show(title, bodyHtml, kind) {
    const el = box();
    el.hidden = false;
    el.className = 'card glass lookup-result ' + (kind || '');
    void el.offsetWidth; el.classList.add('pop');
    el.innerHTML = (h`<header><h3>${title}</h3><button class="btn small" type="button" id="lookup-close">Close</button></header><div class="body">${bodyHtml}</div>`).s;
    if (window.TM && window.TM.afterRender) window.TM.afterRender(el);
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  const working = (msg) => show('Looking up…', h`<p class="note">${msg}</p>${raw(U.skeleton(3))}`);
  const fail = (title, msg) => show(title, h`<p class="err">${msg}</p>`, 'bad');

  /* ---------- classify input ---------- */
  function classify(s) {
    s = s.trim();
    if (/^(tacit|tactt|tacrt)1[a-z0-9]+$/i.test(s)) return { type: 'tacit1', v: s };
    if (/^(bp|tbp)1[a-z0-9]+$/i.test(s)) return { type: 'bp1', v: s };
    if (/^0x[0-9a-fA-F]{40}$/.test(s)) return { type: 'evm-address', v: s };
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(s)) return { type: 'hash64', v: s.replace(/^0x/, '').toLowerCase(), prefixed: /^0x/i.test(s) };
    if (/^[a-z0-9-]{1,20}@[a-z0-9-]{1,20}$/i.test(s)) return { type: 'xns', v: s.toLowerCase() };
    if (/^(bc1[a-z0-9]{20,90}|[13][a-km-zA-HJ-NP-Z1-9]{25,39})$/.test(s)) return { type: 'btc-address', v: s };
    return { type: 'unknown', v: s };
  }

  /* ---------- tacit1 / bp1 ---------- */
  async function lookupTacit1(addr) {
    let d;
    try { d = C.decodeTacitAddress(addr); } catch (e) { return fail('Not a valid Tacit ID', 'This looks like a tacit1… ID but it does not decode: ' + e.message + '.'); }
    const id = await addressId(addr);
    const okmark = (b) => (b ? raw('<span class="ok">valid secp256k1 point</span>') : raw('<span class="bad">NOT a valid curve point</span>'));
    const lanes = [];
    lanes.push(rowKV('Short ID', h`<b class="n">${id}</b>`, '', 'sha256("tacit-address-id-v1\\0" ‖ address)[0..8]: the same text on every Tacit page so a payer and payee can compare it.'));
    lanes.push(rowKV('Network', d.network));
    lanes.push(rowKV('Bitcoin lane: spend key', h`${mono(d.lanes.btc.spend)} ${okmark(d.keyChecks.spend)}`));
    lanes.push(rowKV('Bitcoin lane: scan key', h`${mono(d.lanes.btc.scan)} ${okmark(d.keyChecks.scan)}`, '', 'Used for BIP-352 silent payments and stealth scanning.'));
    if (d.lanes.evm) lanes.push(rowKV('Ethereum-side owner key', h`${mono(d.lanes.evm.owner)} ${d.lanes.evm.sameAsSpend ? raw('<span class="dim">(same as the spend key)</span>') : okmark(d.keyChecks.evm)}`, '', 'The confidential-pool note owner key. It is not an EVM account address.'));
    if (d.lanes.pool) lanes.push(rowKV('Shielded-pool keys', h`view ${mono(C.shortHex(d.lanes.pool.view, 10, 6))} ${okmark(d.keyChecks.poolView)}`, '', 'Keys for the Bitcoin shielded pool and the EVM pool (V ‖ A ‖ N, 97 bytes).'));
    show('Tacit ID ' + C.shortHex(addr, 10, 6), h`<div class="kvs">${lanes}</div>
      <h4>What is public about it</h4><ul class="caveats"><li>The ID is a <em>receive handle</em>: it only bundles public keys, which is why it can be posted anywhere. Decoding it proves the checksum and keys are well-formed; it says nothing about balances.</li>
      <li><b>No chain data can be looked up from it.</b> Payments to it use one-time stealth keys and encrypted memos, so no explorer (including this one) can list the notes it owns. That is the design, not a gap.</li>
      <li>Sharing one ID links its own Bitcoin and Ethereum lanes together for whoever receives it (documented in dapp/tacit-address.js).</li></ul>`);
  }
  async function lookupBp1(addr) {
    let d;
    try { d = C.bech32Decode(addr); } catch (e) { return fail('Not a valid pool address', e.message); }
    if (!['bp', 'tbp'].includes(d.hrp) || d.bytes.length !== 97) return fail('Not a valid pool address', 'Expected a 97-byte bp1… payload with prefix bp/tbp, got ' + d.bytes.length + ' bytes with prefix "' + d.hrp + '".');
    const view = d.bytes.slice(0, 33);
    show('Shielded-pool address ' + C.shortHex(addr, 8, 6), h`<div class="kvs">${[rowKV('Prefix', d.hrp === 'bp' ? 'bp (mainnet)' : 'tbp (signet)'), rowKV('View key (secp256k1)', h`${mono(C.bytesToHex(view))} ${C.isValidCompressedKey(view) ? raw('<span class="ok">valid point</span>') : raw('<span class="bad">invalid point</span>')}`), rowKV('A, N keys (BabyJub)', h`${mono(C.shortHex(C.bytesToHex(d.bytes.slice(33, 65)), 10, 6))} / ${mono(C.shortHex(C.bytesToHex(d.bytes.slice(65)), 10, 6))}`)]}</div>${note('A bp1 address is the pool lane of a tacit1 ID. Like it, it carries only public receive keys; nothing about balances can be derived.')}`);
  }

  /* ---------- Bitcoin tx ---------- */
  async function lookupBtcTx(txid, opts) {
    let tx;
    try { tx = await D.btc.tx(txid); }
    catch (e) {
      if (opts && opts.thenEvm) return lookupEvmTx('0x' + txid, true);
      return fail('Bitcoin transaction not found', 'mempool.space has no transaction ' + txid + (e.status ? ' (HTTP ' + e.status + ')' : '') + '. If this is a Tacit asset id rather than a txid, open it on ' + 'tacitscan: https://tacitscan.io/assets/' + txid);
    }
    const envs = [];
    tx.vin.forEach((vin, i) => { const env = C.envelopeFromWitness(vin.witness); if (env) envs.push({ i, env, d: C.describePayload(env.opcode, env.payload) }); });
    const conf = tx.status && tx.status.confirmed;
    const blocks = [];
    blocks.push(rowKV('Status', conf ? h`<span class="ok">confirmed</span> in block ${a(L.btcBlock(tx.status.block_hash), C.fmtInt(tx.status.block_height))} · ${C.ago(tx.status.block_time)}` : raw('<span class="warn">unconfirmed (mempool)</span>'), U.chipBtc(L.btcTx(txid), 'mempool.space')));
    blocks.push(rowKV('Size / fee', h`${tx.size} B · ${tx.weight} WU · fee ${C.fmtInt(tx.fee)} sats · ${tx.vin.length} in / ${tx.vout.length} out`));
    blocks.push(rowKV('Explorers', h`${a(L.btcTx(txid), 'mempool.space')} · ${a(L.tsTx(txid), 'tacitscan')}`));
    // cross-references (best effort)
    const xrefs = [];
    try {
      const dump = await D.api.dump();
      const rec = dump.snapshot.pendingDepositRecords.find((r) => r.burnTxidDisplay.replace(/^0x/, '') === txid);
      if (rec) xrefs.push(h`<li>Recorded by the proven reflection as a <b>bridge burn</b> at height ${C.fmtInt(rec.height)}; the Ethereum mint is <b class="${rec.completed ? 'ok' : 'warn'}">${rec.completed ? 'completed' : 'pending'}</b>. Nullifier ${mono(C.shortHex(rec.nu, 10, 6))} ${chipIdx('/reflection/dump')}</li>`);
    } catch (e) { /* skip */ }
    try {
      const notes = await D.api.btcPoolNotes(0, 1000);
      const mine = notes.notes.filter((n) => n.txid === txid);
      if (mine.length) xrefs.push(h`<li>Created <b>${mine.length}</b> note(s) in the Bitcoin shielded pool (leaf ${mine.map((n) => n.leafIndex).join(', ')}).</li>`);
    } catch (e) { /* skip */ }
    const env = envs.map(async (x) => {
      const d = x.d;
      let extra = '';
      if (d.opcode === 0x21 || d.opcode === 0x27) {
        const aid = await etchAssetId(txid, 0);
        extra = h`<tr><td>Asset id (sha256(txid ‖ vout 0))</td><td>${mono(aid)} ${copyBtn(aid)} ${a(L.tsAsset(aid), 'tacitscan')}</td></tr>`;
      }
      const pubRows = d.public.map(([k, val]) => h`<tr><td>${k}</td><td>${/^[0-9a-f]{64}$/.test(val) ? h`${mono(val)}` : val}</td></tr>`);
      return h`<div class="env"><h4><span class="tag t-${d.kind}">${d.label}</span> <code>${d.name}</code> <small class="dim">opcode 0x${d.opcode.toString(16)} · input #${x.i} · ${d.payloadBytes} payload bytes</small></h4>
        <p>${d.blurb}</p>
        <div class="two"><div class="see"><b>Public in this envelope</b><table class="tbl small"><tbody>${pubRows}${extra}<tr><td>Signer (x-only)</td><td>${mono(C.shortHex(x.env.signer, 12, 8))}</td></tr></tbody></table></div>
        <div class="hide"><b>Not recoverable from the chain</b><ul>${d.hidden.length ? d.hidden.map((t) => h`<li>${t}</li>`) : raw('<li class="dim">nothing flagged for this opcode</li>')}</ul></div></div></div>`;
    });
    const envHtml = (await Promise.all(env)).map((x) => x.s).join('');
    const none = !envs.length ? h`<p class="note">No <code>TACIT</code> envelope in any input witness of this transaction. Tacit ops put the envelope in the <em>reveal</em> transaction that spends a Taproot commit output; the commit transaction itself looks like an ordinary payment.</p>` : '';
    show('Bitcoin tx ' + C.shortHex(txid, 10, 8), h`<div class="kvs">${blocks}</div>${xrefs.length ? h`<h4>Cross-references</h4><ul class="caveats">${xrefs}</ul>` : ''}${raw(envHtml)}${none}${note('Decoded in your browser from the raw witness fetched from mempool.space; no indexer is trusted for this decode. The layout follows SPEC.md section 3.')}`);
  }

  /* ---------- EVM tx ---------- */
  async function lookupEvmTx(hash, fromBtcFallback) {
    let found = null;
    for (const chainId of [1, 8453]) {
      try {
        const rcpt = await D.rpc(chainId, 'eth_getTransactionReceipt', [hash]);
        if (rcpt) { const tx = await D.rpc(chainId, 'eth_getTransactionByHash', [hash]); found = { chainId, rcpt, tx }; break; }
      } catch (e) { /* try next */ }
    }
    if (!found) return fail('Transaction not found', fromBtcFallback ? 'Not found as a Bitcoin tx on mempool.space nor as an Ethereum/Base tx on the public RPCs.' : 'No receipt for ' + hash + ' on Ethereum or Base.');
    const { chainId, rcpt, tx } = found;
    const seen = [];
    const T = D.TOPIC;
    for (const l of rcpt.logs) {
      const addr = l.address.toLowerCase(), t0 = l.topics[0], d = l.data.replace(/^0x/, '');
      if (addr === ADDR.pool.toLowerCase()) {
        if (t0 === T.wrap) seen.push(h`<li><span class="tag t-wrap">Wrap</span> asset ${mono(C.shortHex(l.topics[2], 10, 6))}, public amount <b>${BigInt('0x' + d.slice(0, 64)).toString()}</b> base units.</li>`);
        else if (t0 === T.nullifiers) seen.push(h`<li><span class="tag t-settle">NullifiersSpent</span> ${Number(BigInt('0x' + d.slice(64, 128)))} nullifier(s). Which notes they came from is not recorded.</li>`);
        else if (t0 === T.leaves) { const off = Number(BigInt('0x' + d.slice(0, 64))) * 2; seen.push(h`<li><span class="tag t-settle">LeavesInserted</span> ${Number(BigInt('0x' + d.slice(off, off + 64)))} new leaf(s) from index ${Number(BigInt(l.topics[1]))}, each with an encrypted memo only its owner can open.</li>`); }
        else if (t0 === T.crossOut) seen.push(h`<li><span class="tag t-cross">CrossOutRecorded</span> claim ${mono(C.shortHex(l.topics[1], 10, 6))} headed to Bitcoin.</li>`);
        else seen.push(h`<li>ConfidentialPool log ${mono(C.shortHex(t0, 10, 6))}</li>`);
      } else if (addr === ADDR.evmPool.toLowerCase() && t0 === T.transact) {
        let ext = BigInt('0x' + d.slice(5 * 64, 6 * 64)); if (ext >= (1n << 255n)) ext -= (1n << 256n);
        const kind = ext > 0n ? 'deposit' : ext < 0n ? 'withdrawal' : 'private transfer';
        seen.push(h`<li><span class="tag t-${ext > 0n ? 'deposit' : ext < 0n ? 'withdraw' : 'transfer'}">EVM pool ${kind}</span> ${ext === 0n ? 'no public amount' : h`public amount <b>${fmt(ext < 0n ? -ext : ext, 18, 6)} ETH</b>`}${ext < 0n ? h` to ${addrLink(chainId, '0x' + d.slice(4 * 64 + 24, 5 * 64))}` : ''}.</li>`);
      }
    }
    const status = rcpt.status === '0x1' ? raw('<span class="ok">success</span>') : raw('<span class="bad">reverted</span>');
    show((chainId === 1 ? 'Ethereum' : 'Base') + ' tx ' + C.shortHex(hash, 10, 8), h`<div class="kvs">${[
      rowKV('Status', h`${status} in block ${a(L.block(chainId, BigInt(rcpt.blockNumber)), C.fmtInt(Number(BigInt(rcpt.blockNumber))))}`),
      rowKV('From → To', h`${addrLink(chainId, tx.from)} → ${tx.to ? addrLink(chainId, tx.to) : 'contract creation'}`),
      rowKV('Value / gas used', h`${fmt(BigInt(tx.value), 18, 6)} ETH · ${C.fmtInt(Number(BigInt(rcpt.gasUsed)))} gas`),
      rowKV('Explorer', a(L.tx(chainId, hash), (chainId === 1 ? 'etherscan' : 'basescan'))),
    ]}</div>${seen.length ? h`<h4>Tacit events recognised in this tx</h4><ul class="caveats">${seen}</ul>` : h`<p class="note">No Tacit pool events in this transaction (${rcpt.logs.length} other log(s)).</p>`}`);
  }

  /* ---------- EVM address ---------- */
  async function lookupAddress(addr, viaName) {
    working('Reading ' + addr + ' from Ethereum, Base and the Tacit points API…');
    const lower = addr.toLowerCase();
    await D.resolveXns([lower]).catch(() => {});
    const name = D.xnsCache.get(lower) || '';
    const bal = '0x' + D.SEL.balanceOf.slice(2);
    const erc = (t) => D.ethCall(t, D.SEL.balanceOf + C.pad32(lower.slice(2)));
    const [ethRes, baseRes, ptsR, claimR] = await Promise.allSettled([
      D.rpcBatch(1, [['eth_getBalance', [addr, 'latest']], ['eth_getCode', [addr, 'latest']], erc(ADDR.tac), erc(ADDR.wTAC), erc(ADDR.tacBTC), erc(ADDR.tacUSD)]),
      D.rpcBatch(8453, [['eth_getBalance', [addr, 'latest']], ['eth_getCode', [addr, 'latest']]]),
      D.api.points(lower), D.api.claim(lower),
    ]);
    const e = ethRes.status === 'fulfilled' ? ethRes.value : null, b = baseRes.status === 'fulfilled' ? baseRes.value : null;
    const get = (r, i) => (r && r[i] && r[i].ok ? BigInt(r[i].result) : null);
    const code = e && e[1].ok ? e[1].result : null;
    const known = D.KNOWN_ADDR[lower];
    const rows = [
      rowKV('Address', h`${mono(addr)} ${copyBtn(addr)}`),
      rowKV('XNS name', name ? h`<b class="xns-big">${name}</b>` : (ethRes.status === 'fulfilled' ? raw('<span class="dim">none registered (xns.name)</span>') : unavailable), chipChain(L.read(ADDR.xns), 'XNS.getName(address)'), 'XNS is an on-chain, permanent, non-transferable name registry (xns.name).'),
      rowKV('Type', known ? h`<b>${known}</b> <span class="dim">(Tacit deployment)</span>` : code == null ? unavailable : (code === '0x' ? 'externally owned account' : 'contract (' + ((code.length - 2) / 2) + ' bytes of code)')),
      rowKV('ETH on Ethereum', get(e, 0) != null ? h`<b class="n">${fmt(get(e, 0), 18, 6)} ETH</b>` : unavailable, chipChain(L.addr(1, addr))),
      rowKV('ETH on Base', get(b, 0) != null ? h`<b class="n">${fmt(get(b, 0), 18, 6)} ETH</b>` : unavailable, chipChain(L.addr(8453, addr))),
      rowKV('TAC / wTAC (Ethereum ERC-20)', get(e, 2) != null ? h`${fmt(get(e, 2), 18, 4)} / ${fmt(get(e, 3), 18, 4)}` : unavailable),
      rowKV('cBTC / cUSD (public ERC-20 form)', get(e, 4) != null ? h`${fmt(get(e, 4), 18, 6)} / ${fmt(get(e, 5), 18, 4)}` : unavailable, '', 'Only the unwrapped ERC-20 form: balances held as confidential notes are not readable.'),
    ];
    let pts = null, claim = null;
    if (ptsR.status === 'fulfilled') pts = ptsR.value; if (claimR.status === 'fulfilled') claim = claimR.value;
    const ptsHtml = pts && pts.deposit_count ? rowKV('ETH-wrap points program', h`<b class="n">${C.fmtInt(Math.round(pts.points))}</b> points · ${C.fmtInt(pts.deposit_count)} deposits · ${fmt(BigInt(pts.amount_wei), 18, 2)} ETH ${claim && claim.cumulativeAmount ? raw('· claimable ' + esc(fmt(BigInt(claim.unclaimedWei || '0'), 18, 2)) + ' TAC, claimed ' + esc(fmt(BigInt(claim.claimedWei || '0'), 18, 2))) : ''}`, chipIdx('/points/' + lower)) : rowKV('ETH-wrap points program', raw('<span class="dim">no activity recorded</span>'), chipIdx('/points/' + lower));
    // EVM pool activity from the cached event windows
    let evmHtml = '';
    try {
      const st = await Promise.all([D.chain.base(), D.chain.eth()]);
      const [wb, we] = await Promise.all([D.windows.evmBase(st[0].block), D.windows.evmEth(st[1].block)]);
      const mine = [...wb.events.map((x) => ({ ...x, c: 8453 })), ...we.events.map((x) => ({ ...x, c: 1 }))].filter((x) => x.recipient.toLowerCase() === lower || x.relayer.toLowerCase() === lower);
      if (mine.length) {
        const rr = mine.slice(0, 6).map((x) => h`<tr><td>${x.c === 1 ? 'Ethereum' : 'Base'}</td><td><span class="tag t-${x.kind}">${x.kind}</span></td><td class="r">${fmt(x.ext < 0n ? -x.ext : x.ext, 18, 4)} ETH</td><td>${x.recipient.toLowerCase() === lower ? 'recipient' : 'relayer'}</td><td>${txLink(x.c, x.tx)}</td></tr>`);
        evmHtml = h`<h4>EVM-pool events naming this address (recent windows)</h4><table class="tbl"><thead><tr><th>Chain</th><th>Type</th><th class="r">Amount</th><th>Role</th><th>Tx</th></tr></thead><tbody>${rr}</tbody></table>`;
      } else evmHtml = h`<p class="note">No EVM-pool withdrawal or relay event names this address in the recent windows loaded above (last ~${C.fmtInt(wb.span)} Base blocks, ~${C.fmtInt(we.span)} Ethereum blocks). Deposits are visible only as the sender of the pool transaction, so check the explorer links.</p>`;
    } catch (err) { evmHtml = h`<p class="note">EVM-pool event windows were unavailable, so pool activity is not shown.</p>`; }
    show(viaName ? viaName + ' → ' + C.shortHex(addr, 8, 6) : 'EVM address ' + C.shortHex(addr, 8, 6), h`<div class="kvs">${rows}${ptsHtml}</div>${evmHtml}${note('Public balances and names are shown. Which confidential notes this address deposited into, owns or spent cannot be read from the chain; that unlinkability is what Tacit is for.')}`);
  }

  /* ---------- XNS name ---------- */
  async function lookupName(name) {
    working('Resolving ' + name + ' on the XNS registry…');
    let addr = null;
    try { addr = await D.xnsAddress(name); } catch (e) { return fail('XNS lookup failed', 'The Ethereum RPC did not answer: ' + e.message); }
    if (!addr) return fail('No such XNS name', name + ' is not registered in the XNS contract (' + ADDR.xns + ').');
    return lookupAddress(addr, name);
  }

  /* ---------- Bitcoin address ---------- */
  async function lookupBtcAddress(addrStr) {
    working('Reading the latest transactions of ' + addrStr + ' from mempool.space…');
    let txs;
    try { txs = await D.btc.addrTxs(addrStr); } catch (e) { return fail('Bitcoin address lookup failed', 'mempool.space did not return data: ' + e.message); }
    const found = [];
    txs.forEach((tx) => tx.vin.forEach((vin, i) => { const env = C.envelopeFromWitness(vin.witness); if (env) found.push({ tx, i, d: C.describePayload(env.opcode, env.payload) }); }));
    const rows = found.map((f) => h`<tr><td><span class="tag t-${f.d.kind}">${f.d.label}</span></td><td>${btcTxLink(f.tx.txid)}</td><td><a href="#" class="decode" data-decode="${f.tx.txid}">decode</a></td></tr>`);
    show('Bitcoin address ' + C.shortHex(addrStr, 8, 6), h`<div class="kvs">${[rowKV('Transactions scanned', h`latest ${txs.length} (mempool.space returns 25 at a time)`, U.chipBtc(L.btcAddr(addrStr), 'mempool.space')), rowKV('Tacit envelopes found', h`<b class="n">${found.length}</b>`)]}</div>${found.length ? h`<table class="tbl"><thead><tr><th>Op</th><th>Tx</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : ''}
      ${note('Tacit has no per-address index on Bitcoin: ownership of a confidential note is a hidden key, not an address. This only shows whether recent transactions touching the address carry a Tacit envelope in an input witness.')}`);
  }

  async function lookup(text) {
    const c = classify(text);
    if (c.type === 'unknown') return fail('Not recognised', 'Try a tacit1… ID, a 64-hex Bitcoin txid, a 0x… EVM address or tx hash, a Bitcoin address, or an XNS name like alice@xns.');
    working('Looking up ' + C.shortHex(c.v, 12, 8) + '…');
    try {
      switch (c.type) {
        case 'tacit1': return await lookupTacit1(c.v);
        case 'bp1': return await lookupBp1(c.v);
        case 'evm-address': return await lookupAddress(c.v);
        case 'xns': return await lookupName(c.v);
        case 'btc-address': return await lookupBtcAddress(c.v);
        case 'hash64': {
          const aid = '0x' + c.v;
          if (D.ASSETS[aid]) return show('Tacit asset ' + D.ASSETS[aid].sym, h`<div class="kvs">${[rowKV('Asset id', h`${mono(c.v)} ${copyBtn(c.v)}`), rowKV('Symbol', D.ASSETS[aid].sym), rowKV('Explorer', a(L.tsAsset(c.v), 'tacitscan asset page'))]}</div>${note('This is a canonical asset id from docs/DEPLOYMENTS.md. For its Bitcoin genesis or on-chain supply see the cards above.')}`);
          if (c.prefixed) return await lookupEvmTx(aid);
          return await lookupBtcTx(c.v, { thenEvm: true });
        }
      }
    } catch (e) { console.warn(e); fail('Lookup failed', (e && e.message) || 'unexpected error'); }
  }

  window.TMLookup = { lookup, classify, addressId, etchAssetId, KNOWN_SAMPLE_TAC };
})();
