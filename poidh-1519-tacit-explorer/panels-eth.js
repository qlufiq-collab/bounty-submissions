/* panels-eth.js — Ethereum/Base column, privacy panel and cross-checks. */
(function () {
  'use strict';
  const C = window.TacitCore, D = window.TMData, U = window.TMUI;
  const { h, raw, a, mono, L, chipChain, chipIdx, addrLink, txLink, copyBtn, unavailable, num, rowKV, note, fmt, jsonNum } = U;
  const { ADDR, CFG } = D;
  const v = (r) => (r.status === 'fulfilled' ? r.value : null);
  const ETH_ASSET = '0x3cba71e1114af183cdeacc6b8457a474d17529fd28704480ca799d0d03126f34';
  const fmtEth = (wei, d) => fmt(wei, 18, d == null ? 4 : d);

  /* ================= ConfidentialPool ================= */
  async function cardEthPool() {
    const [eth, idxR, sfR, relR] = await Promise.allSettled([D.chain.eth(), D.api.confIndexMeta(), D.api.statsFront(), D.api.relayState()]);
    const e = v(eth), idx = v(idxR), sf = v(sfR), rel = v(relR);
    if (!e) throw new Error('Ethereum RPC unavailable');
    const active = e.successor && /^0x0{40}$/.test(e.successor);
    const rows = [
      rowKV('Contract', h`${addrLink(1, ADDR.pool, 'ConfidentialPool')} ${copyBtn(ADDR.pool)}`, chipChain(L.addr(1, ADDR.pool)), 'Immutable: no proxy, no upgrade path, no pause switch, no key over escrow (docs/DEPLOYMENTS.md).'),
      rowKV('Status', e.successor ? (active ? raw('<span class="ok">active</span> <span class="dim">· no successor set</span>') : h`<span class="warn">retired</span> → ${addrLink(1, e.successor)}`) : unavailable, chipChain(L.read(ADDR.pool), 'pool.successor()')),
      rowKV('Note leaves in the Merkle tree', e.leaves != null ? num(C.fmtInt(e.leaves)) : unavailable, chipChain(L.read(ADDR.pool), 'pool.nextLeafIndex()')),
      rowKV('ETH escrowed in the pool', e.poolBalance != null ? h`<b class="n">${fmtEth(e.poolBalance, 4)} ETH</b>` : unavailable, chipChain(L.addr(1, ADDR.pool), 'eth_getBalance(pool)'), 'Public: the escrow balance is just the contract\'s ETH. How it splits between owners is not.'),
      rowKV('Settles verified since deploy', sf ? num(C.fmtInt(sf.link.settles)) : unavailable, chipIdx('/stats?view=front'), 'Each settle is one SP1 proof the pool verified on-chain.'),
      rowKV('Wraps / spent nullifiers / cross-outs', idx ? h`<b class="n">${raw(C.fmtInt(idx.counts.wraps))}</b> / <b class="n">${raw(C.fmtInt(idx.counts.nullifiers))}</b> / <b class="n">${raw(C.fmtInt(idx.counts.crossOuts))}</b>` : unavailable, chipIdx('/confidential/index?from=999999999&limit=1')),
      rowKV('Stealth locks (adaptor / bridge)', idx ? num(C.fmtInt(idx.counts.lockLeaves)) : unavailable, chipIdx('/confidential/index?from=999999999&limit=1')),
      rowKV('Relay', rel ? h`<b class="${rel.state === 'ok' || rel.state === 'busy' ? 'ok' : 'warn'}">${rel.state}</b> <span class="dim">· proving: ${rel.proving ? 'yes' : 'no'} · settling: ${rel.settling ? 'yes' : 'no'} · heartbeat ${rel.ageSeconds}s ago</span>` : unavailable, chipIdx('/confidential/relay'), '"held" means the relay proves but lets any sender submit the settle; anyone can also settle their own proof.'),
      rowKV('Deployed', h`block ${a(L.block(1, 25998736), '25,998,736')} <span class="dim">· live since 2026-09-18</span>`),
    ];
    return h`<div class="kvs">${rows}</div>`;
  }

  /* ================= assets ================= */
  async function cardEthAssets() {
    const [eth, sfR] = await Promise.allSettled([D.chain.eth(), D.api.statsFront()]);
    const e = v(eth), sf = v(sfR);
    if (!e) throw new Error('Ethereum RPC unavailable');
    const d = (x, fallback) => (x != null ? Number(x) : fallback);
    const btc = sf ? sf.btc : null;
    const row = (name, addr, supply, dec, extra) => h`<tr><td><b>${name}</b><br>${addrLink(1, addr, C.shortHex(addr, 6, 4))}</td><td class="r">${supply != null ? h`<b class="n">${fmt(supply, dec, 4)}</b>` : unavailable}<br><small class="dim">ERC-20 totalSupply ${chipChain(L.read(addr), 'totalSupply()')}</small></td><td>${extra}</td></tr>`;
    const out = e.outstandingCusd;
    const rows = [
      row('TAC', ADDR.tac, e.supply.tac, d(e.dec.tac, 18), h`21,000,000 issued once on Bitcoin; this ERC-20 is minted only by the pool for TAC proven to have left Bitcoin. ${a(L.tsAsset('f0bbe868af10c6c67652a99709bf32048d1aa7194efe3e9a1ef1bde43f94762b'), 'asset page')}`),
      row('cBTC (tacBTC)', ADDR.tacBTC, e.supply.cbtc, d(e.dec.cbtc, 18), h`Pool-minted against Bitcoin locks. Backing: <b class="n">${e.backingSats != null ? fmt(e.backingSats, 8) + ' BTC' : 'n/a'}</b> locked on Bitcoin ${chipChain(L.read(ADDR.pool), 'cbtcBackingSats()')}${btc ? raw('<br>' + part2(h`${C.fmtInt(btc.nMint)} locks have minted ${fmt(jsonNum(btc.mint), 8)} BTC of cBTC · ${C.fmtInt(btc.nLocked)} locks live ${chipIdx('/stats?view=front')}`)) : ''}`),
      row('cUSD (tacUSD)', ADDR.tacUSD, e.supply.cusd, d(e.dec.cusd, 18), h`Debt against cBTC collateral. Outstanding principal: <b class="n">${out != null ? fmt(out, 8, 2) : 'n/a'} cUSD</b> ${chipChain(L.read(ADDR.engine), 'CollateralEngine.outstandingCusd() (8-decimal in-system units)')}${btc ? raw('<br>' + part2(h`${C.fmtInt(btc.open)} open positions · borrowed ${fmt(jsonNum(btc.borrowed), 8, 2)} · repaid ${fmt(jsonNum(btc.repaid), 8, 2)} · liquidated ${fmt(jsonNum(btc.liq), 8, 2)} ${chipIdx('/stats?view=front')}`)) : ''}`),
      row('wTAC', ADDR.wTAC, e.supply.wtac, d(e.dec.wtac, 18), h`1:1 wrapper of TAC used to pay launch-farm rewards.`),
    ];
    return h`<table class="tbl assets"><thead><tr><th>Token</th><th class="r">Public supply</th><th>What it is / where it comes from</th></tr></thead><tbody>${rows}</tbody></table>
      ${note('These are the supplies of the public ERC-20 forms only. Value held as confidential pool notes is deliberately not readable on-chain, so these figures are a floor, not total circulation.')}`;
  }
  const part2 = (x) => x.s; // render a template result as a string for raw() splicing

  /* generic stacked bar chart: bins = [{a: n, b: n}], series = [[key, cssClass]] */
  function stackBars(bins, series, label, legend) {
    const n = bins.length, W = 520, H = 70, bw = W / n;
    const max = Math.max(1, ...bins.map((b) => series.reduce((s, [k]) => s + (b[k] || 0), 0)));
    let svg = `<svg class="bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.esc(label)}" preserveAspectRatio="none">`;
    bins.forEach((b, i) => {
      let y = H;
      series.forEach(([k, cls]) => { const hh = ((b[k] || 0) / max) * (H - 4); if (hh > 0) { y -= hh; svg += `<rect class="${cls}" x="${(i * bw + 1).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${hh.toFixed(1)}"/>`; } });
    });
    svg += '</svg><div class="legend">' + legend.map(([cls, name]) => `<span class="lg"><i class="sw ${cls}"></i>${U.esc(name)}</span>`).join('') + '</div>';
    return raw(svg);
  }

  /* ================= recent pool activity ================= */
  const assetLabel = (id) => (id.toLowerCase() === ETH_ASSET ? { sym: 'ETH', dec: 18 } : id.toLowerCase() === '0xf0bbe868af10c6c67652a99709bf32048d1aa7194efe3e9a1ef1bde43f94762b' ? { sym: 'TAC', dec: 18 } : id.toLowerCase() === '0x62a20d98fc1cd20289621d1315294cb8772f934d822e404b71e1f471cf0679c8' ? { sym: 'cBTC', dec: 18 } : id.toLowerCase() === '0x1097c9e552ae4fce2a8c416b93403953fa445a5f2cdae8ced36d9a78cfe40832' ? { sym: 'wTAC', dec: 18 } : null);
  async function cardEthActivity() {
    const e = await D.chain.eth();
    if (!e || !e.block) throw new Error('Ethereum RPC unavailable');
    const win = await D.windows.ethPool(e.block);
    const wraps = win.list.filter((t) => t.wraps.length).length;
    const settles = win.list.filter((t) => t.nullifiers || t.leaves).length;
    const outs = win.list.filter((t) => t.crossOuts.length).length;
    const top = win.list.slice(0, 12);
    const times = await D.blockTimes(1, top.map((t) => t.block)).catch(() => new Map());
    const rows = top.map((t) => {
      const kinds = [];
      t.wraps.forEach((w) => { const al = assetLabel(w.asset); kinds.push(al ? h`<span class="tag t-wrap">wrap</span> ${fmt(w.amount, al.dec, 6)} ${al.sym}` : h`<span class="tag t-wrap">wrap</span> ${w.amount.toString()} base units of ${C.shortHex(w.asset, 8, 4)}`); });
      if (t.nullifiers || t.leaves) kinds.push(h`<span class="tag t-settle">settle</span> spends ${t.nullifiers}, creates ${t.leaves} note(s)`);
      t.crossOuts.forEach((c) => kinds.push(h`<span class="tag t-cross">cross-out</span> to ${c.destChain === 0 || c.destChain === 1 ? 'Bitcoin' : 'chain ' + c.destChain}`));
      if (t.consumed) kinds.push(h`<span class="tag t-fast">fast lane</span> ${t.consumed} Bitcoin note(s) consumed`);
      return h`<tr><td class="nw">${times.get(t.block) ? C.ago(times.get(t.block)) : '#' + C.fmtInt(t.block)}</td><td>${kinds.map((k) => k.s).join('<br>').replace(/^/, '') ? raw(kinds.map((k) => k.s).join('<br>')) : ''}</td><td>${txLink(1, t.hash)}</td></tr>`;
    });
    const hrs = (win.span * 12 / 3600).toFixed(0);
    const nb = 30, size = win.span / nb, bins = Array.from({ length: nb }, () => ({ wrap: 0, settle: 0 }));
    win.list.forEach((t) => { const i = Math.min(nb - 1, Math.max(0, Math.floor((t.block - win.from) / size))); if (t.wraps.length) bins[i].wrap++; if (t.nullifiers || t.leaves) bins[i].settle++; });
    if (window.TMFX && e.leaves != null) {
      const made = bins.map(() => 0); win.list.forEach((t) => { const i = Math.min(nb - 1, Math.max(0, Math.floor((t.block - win.from) / size))); made[i] += t.leaves; });
      const total = made.reduce((s, x) => s + x, 0); let cum = Number(e.leaves) - total; const ser = [cum];
      made.forEach((x) => { cum += x; ser.push(cum); });
      window.TMFX.setSpark('k-leaves', ser, '#7c93ff', 'Pool leaf count over the last ' + hrs + ' hours, rebuilt from LeavesInserted logs');
    }
    const chart = stackBars(bins, [['wrap', 'b-dep'], ['settle', 'b-tr']], 'Pool transactions per hour over the last ' + hrs + ' hours', [['sw-dep', 'wrap txs'], ['sw-tr', 'settle txs'], ['dim', 'one bar ≈ 1 hour, oldest left']]);
    return h`<div class="mini"><div><b class="n">${raw(C.fmtInt(wraps))}</b><span>wrap txs</span></div><div><b class="n">${raw(C.fmtInt(settles))}</b><span>settle txs</span></div><div><b class="n">${raw(C.fmtInt(outs))}</b><span>cross-outs</span></div><div><b class="n">${hrs} h</b><span>window (${C.fmtInt(win.span)} blocks)</span></div></div>
      ${chart}
      <table class="tbl"><thead><tr><th>When</th><th>What the chain shows</th><th>Tx</th></tr></thead><tbody>${rows.length ? rows : raw('<tr><td colspan="3" class="dim">No pool events in this window.</td></tr>')}</tbody></table>
      ${note('Source: eth_getLogs on the pool (Wrap, NullifiersSpent, LeavesInserted, CrossOutRecorded, BitcoinNotesConsumed) via public RPC, grouped by transaction. A wrap shows its deposit amount because it crosses the public boundary; a settle shows only counts.')} ${chipChain(L.addr(1, ADDR.pool) + '#events', 'ConfidentialPool events')}`;
  }

  /* ================= farms / on-pool AMM ================= */
  async function cardEthFarms() {
    const [fR, hR] = await Promise.allSettled([D.api.farm(), D.api.farmHealth()]);
    const f = v(fR), hl = v(hR);
    if (!f) throw new Error('indexer farm endpoint unavailable');
    const ep = f.epoch;
    const days = (ep.remainingSeconds / 86400).toFixed(1);
    const pools = f.pools.map((p) => {
      const A = BigInt(p.reserves.reserveA), B = BigInt(p.reserves.reserveB);
      const nameA = (D.ASSETS[p.reserves.assetA] || {}).sym || 'A', nameB = (D.ASSETS[p.reserves.assetB] || {}).sym || 'B';
      return h`<tr><td><b>${p.pair}</b><br><small class="dim">fee ${p.feeBps / 100}%</small></td><td class="r">${fmt(A, 8, 4)} ${nameA.split(' ')[0]}<br>${fmt(B, 8, 4)} ${nameB}</td><td class="r">${p.sharePct}%<br><small class="dim">${p.tacPerDayForPool} TAC/day</small></td><td class="r">${C.fmtInt(p.totalShares)}</td></tr>`;
    });
    const checks = hl ? hl.checks.map((c) => h`<li><span class="${c.status === 'ok' ? 'ok' : 'warn'}">${c.status === 'ok' ? '●' : '▲'}</span> ${c.name}: <span class="dim">${c.detail}</span></li>`) : [];
    return h`<div class="kvs">${[
      rowKV('Epoch emission', h`<b class="n">${ep.ratePerDayTac} TAC/day</b> <span class="dim">· ${days} days left</span>`, chipIdx('/farm/program?network=mainnet')),
      rowKV('Reward treasury', h`<b class="n">${Number(ep.treasuryTac).toLocaleString('en-US', { maximumFractionDigits: 0 })} TAC</b> <span class="dim">· owed ${Number(ep.outstandingTac).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>`, chipIdx('/farm/program?network=mainnet')),
      rowKV('FarmManager', h`${addrLink(1, f.manager, 'FarmManager')}`, chipChain(L.addr(1, f.manager))),
    ]}</div>
      <h4>Pools inside the ConfidentialPool</h4>
      <table class="tbl"><thead><tr><th>Pair</th><th class="r">Reserves</th><th class="r">Farm share</th><th class="r">LP shares</th></tr></thead><tbody>${pools}</tbody></table>
      ${checks.length ? h`<h4>Farm health ${chipIdx('/farm/health')}</h4><ul class="checks">${checks}</ul>` : ''}
      ${note('Reserves of these AMM pools are public by design (only trade sizes in blind swaps are hidden); units are 8-decimal in-system units.')}`;
  }

  /* ================= EVM pool (Ethereum + Base + others) ================= */
  function evmSummary(win, xnsList) {
    const ev = win.events;
    const dep = ev.filter((x) => x.kind === 'deposit'), wd = ev.filter((x) => x.kind === 'withdraw'), tr = ev.filter((x) => x.kind === 'transfer');
    const sum = (xs, f) => xs.reduce((s, x) => s + f(x), 0n);
    const depSum = sum(dep, (x) => x.ext), wdSum = sum(wd, (x) => -x.ext);
    const rcpt = new Map(); wd.forEach((x) => rcpt.set(x.recipient, (rcpt.get(x.recipient) || 0) + 1));
    const amounts = new Map(); wd.forEach((x) => amounts.set((-x.ext).toString(), (amounts.get((-x.ext).toString()) || 0) + 1));
    const topR = [...rcpt.entries()].sort((p, q) => q[1] - p[1]);
    const topA = [...amounts.entries()].sort((p, q) => q[1] - p[1]);
    return { dep, wd, tr, depSum, wdSum, rcpt, topR, topA, total: ev.length };
  }
  function barChart(win, buckets) {
    const n = buckets || 24, span = win.to - win.from + 1, size = span / n;
    const bins = Array.from({ length: n }, () => ({ deposit: 0, withdraw: 0, transfer: 0 }));
    win.events.forEach((x) => { const i = Math.min(n - 1, Math.floor((x.block - win.from) / size)); bins[i][x.kind]++; });
    const max = Math.max(1, ...bins.map((b) => b.deposit + b.withdraw + b.transfer));
    const W = 520, H = 80, bw = W / n;
    let svg = `<svg class="bars" viewBox="0 0 ${W} ${H}" role="img" aria-label="Transact events per time bucket" preserveAspectRatio="none">`;
    bins.forEach((b, i) => {
      let y = H;
      [['deposit', 'b-dep'], ['withdraw', 'b-wd'], ['transfer', 'b-tr']].forEach(([k, cls]) => {
        const hh = (b[k] / max) * (H - 4);
        if (hh > 0) { y -= hh; svg += `<rect class="${cls}" x="${(i * bw + 1).toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${hh.toFixed(1)}"/>`; }
      });
    });
    svg += '</svg><div class="legend"><span class="lg"><i class="sw sw-dep"></i>deposits</span><span class="lg"><i class="sw sw-wd"></i>withdrawals</span><span class="lg"><i class="sw sw-tr"></i>in-pool transfers</span></div>';
    return raw(svg);
  }
  function evmBlock(title, chainId, win, st, idxDev, hours) {
    const S = evmSummary(win);
    const bal = st ? st.evmBalance : null, leaves = st ? st.evmLeaves : null;
    const topShare = S.wd.length && S.topR.length ? Math.round(S.topR.slice(0, 2).reduce((s, x) => s + x[1], 0) / S.wd.length * 100) : null;
    const topAmt = S.topA.length ? S.topA[0] : null;
    const rows = win.events.slice(0, 7).map((x) => h`<tr><td class="nw"><span class="tag t-${x.kind}">${x.kind}</span></td><td class="r">${fmt(x.ext < 0n ? -x.ext : x.ext, 18, 4)} ETH</td><td>${x.kind === 'withdraw' ? addrLink(chainId, x.recipient) : x.kind === 'deposit' ? raw('<span class="dim">sender = tx.from</span>') : raw('<span class="dim">private</span>')}</td><td>${txLink(chainId, x.tx)}</td></tr>`);
    return h`<div class="evm-chain"><h4>${title} ${chipChain(L.addr(chainId, ADDR.evmPool), 'TacitEvmPool')}</h4>
      <div class="kvs">${[
        rowKV('Pool ETH balance', bal != null ? h`<b class="n">${fmtEth(bal, 4)} ETH</b>` : unavailable, chipChain(L.addr(chainId, ADDR.evmPool), 'eth_getBalance(pool)')),
        rowKV('Leaves in the note tree', leaves != null ? num(C.fmtInt(leaves)) : unavailable, chipChain(L.addr(chainId, ADDR.evmPool) + '#readContract', 'pool.nextIndex()'), 'Anonymity-set ceiling: each leaf is one note commitment.'),
        idxDev ? rowKV('Lifetime deposits / withdrawals', h`<b class="n">${raw(C.fmtInt(idxDev.nd))}</b> / <b class="n">${raw(C.fmtInt(idxDev.nw))}</b>`, chipIdx('/stats?view=front')) : '',
      ]}</div>
      <p class="winhead">Last ${C.fmtInt(win.span)} blocks (~${hours}) — ${C.fmtInt(S.total)} Transact events</p>
      <div class="mini"><div><b class="n">${raw(C.fmtInt(S.dep.length))}</b><span>deposits · ${fmtEth(S.depSum, 2)} ETH</span></div><div><b class="n">${raw(C.fmtInt(S.wd.length))}</b><span>withdrawals · ${fmtEth(S.wdSum, 2)} ETH</span></div><div><b class="n">${raw(C.fmtInt(S.tr.length))}</b><span>in-pool transfers</span></div></div>
      ${S.total ? barChart(win) : ''}
      ${S.wd.length ? note(`Withdrawals reach ${S.rcpt.size} distinct recipient address(es); the top ${Math.min(2, S.topR.length)} take ${topShare}% of them. ${topAmt ? 'The most common amount (' + fmtEth(BigInt(topAmt[0]), 4) + ' ETH) appears in ' + topAmt[1] + ' of ' + S.wd.length + ' withdrawals.' : ''}`) : ''}
      <table class="tbl"><thead><tr><th>Type</th><th class="r">Amount</th><th>Recipient</th><th>Tx</th></tr></thead><tbody>${rows.length ? rows : raw('<tr><td colspan="4" class="dim">No events in this window.</td></tr>')}</tbody></table></div>`;
  }
  async function cardEvmPool() {
    const [ethR, baseR, sfR, rhR] = await Promise.allSettled([D.chain.eth(), D.chain.base(), D.api.statsFront(), D.chain.rh()]);
    const e = v(ethR), b = v(baseR), sf = v(sfR), rh = v(rhR);
    const parts = [];
    if (b && b.block) {
      try { const w = await D.windows.evmBase(b.block); parts.push(evmBlock('Base', 8453, w, b, sf && sf.dev ? sf.dev.find((x) => x.chain === 8453) : null, Math.round(w.span * 2 / 60) + ' min')); }
      catch (err) { parts.push(h`<div class="evm-chain"><h4>Base</h4><p class="err">Event window unavailable: <span class="na">${err.message}</span></p></div>`); }
    } else parts.push(h`<div class="evm-chain"><h4>Base</h4><p class="err">Base RPC unavailable.</p></div>`);
    if (e && e.block) {
      try { const w = await D.windows.evmEth(e.block); parts.push(evmBlock('Ethereum', 1, w, { evmBalance: e.evmBalance, evmLeaves: e.evmLeaves }, sf && sf.dev ? sf.dev.find((x) => x.chain === 1) : null, Math.round(w.span * 12 / 3600) + ' h')); }
      catch (err) { parts.push(h`<div class="evm-chain"><h4>Ethereum</h4><p class="err">Event window unavailable: <span class="na">${err.message}</span></p></div>`); }
    }
    const rhDev = sf && sf.dev ? sf.dev.find((x) => x.chain === 4663) : null;
    const rhChip = raw('<span class="chip src-chain" title="eth_getBalance / nextIndex() via rpc.mainnet.chain.robinhood.com">chain</span>');
    if (rh && rh.block) {
      parts.push(h`<div class="evm-chain"><h4>Robinhood Chain ${rhChip}</h4><div class="kvs">${[
        rowKV('Pool ETH balance', rh.evmBalance != null ? h`<b class="n">${fmtEth(rh.evmBalance, 4)} ETH</b>` : unavailable, rhChip),
        rowKV('Leaves in the note tree', rh.evmLeaves != null ? num(C.fmtInt(rh.evmLeaves)) : unavailable, rhChip, 'Same TacitEvmPool contract address as on Ethereum and Base.'),
        rhDev ? rowKV('Lifetime deposits / withdrawals', h`<b class="n">${raw(C.fmtInt(rhDev.nd))}</b> / <b class="n">${raw(C.fmtInt(rhDev.nw))}</b>`, chipIdx('/stats?view=front')) : '',
        rowKV('Latest block', num(C.fmtInt(rh.block)), rhChip),
      ]}</div></div>`);
    } else if (rhDev) {
      parts.push(h`<div class="evm-chain"><h4>Robinhood Chain ${chipIdx('/stats?view=front')}</h4><p class="err">Robinhood RPC unavailable; indexer says balance ${fmtEth(jsonNum(rhDev.bal), 4)} ETH · ${C.fmtInt(rhDev.nd)} deposits · ${C.fmtInt(rhDev.nw)} withdrawals.</p></div>`);
    }
    const others = sf && sf.dev ? sf.dev.filter((x) => x.chain !== 1 && x.chain !== 8453 && x.chain !== 4663) : [];
    const oth = others.map((x) => h`<li>chain ${x.chain}: balance ${fmtEth(jsonNum(x.bal), 4)} ETH · ${C.fmtInt(x.nd)} deposits · ${C.fmtInt(x.nw)} withdrawals ${chipIdx('/stats?view=front')}</li>`);
    return h`${parts}${oth.length ? h`<h4>Other chains (indexer only)</h4><ul class="checks">${oth}</ul>` : ''}${note('The EVM pool is a separate, ETH-only pool proven on the user\'s own device. Deposits and withdrawals cross a public boundary (amount, recipient, relayer, fee are visible); transfers inside it reveal only that a transfer happened.')}`;
  }

  /* ================= relay economics ================= */
  async function cardRelay() {
    const [econR, provR, sfR] = await Promise.allSettled([D.api.econ(), D.api.prover(), D.api.statsFront()]);
    const ec = v(econR), pv = v(provR);
    if (!ec) throw new Error('indexer /relay/economics unavailable');
    const rows = ec.ledger.recent.slice(-7).reverse().map((d) => h`<tr><td>${d.date}</td><td class="r">${d.settled}</td><td class="r">${d.proveOnly}</td><td class="r">${d.gasEth.toFixed(4)}</td></tr>`);
    const w = ec.ledger.week;
    const sp = ec.sponsorship;
    return h`<div class="kvs">${[
      rowKV('Last 7 days', h`<b class="n">${raw(C.fmtInt(w.settled))}</b> settles relayed · <b class="n">${raw(C.fmtInt(w.proveOnly))}</b> prove-only jobs · ${w.gasEth} ETH gas`, chipIdx('/relay/economics')),
      rowKV('Free-sponsor budget today', sp ? h`<b class="n">${sp.total.used}</b> / ${sp.total.cap} ops` : unavailable, chipIdx('/relay/economics'), 'Fee-less relayed settles share a daily budget; paid ones do not.'),
      pv ? rowKV('Prover board', h`${pv.workers.length} worker(s) · ${pv.proved} proved recently · prove p50 ${pv.recent.proveP50}s / p90 ${pv.recent.proveP90}s · queue ${pv.queued}`, chipIdx('/prover/board')) : '',
      rowKV('ETH price used for fees', h`$${ec.prices.ethUsd}`, chipIdx('/relay/economics')),
    ]}</div>
      <table class="tbl"><thead><tr><th>Day (UTC)</th><th class="r">Settles</th><th class="r">Prove-only</th><th class="r">Gas ETH</th></tr></thead><tbody>${rows}</tbody></table>
      ${note('Relayed ops are proofs someone else submits for the holder. The relay sees the witness for the ops it proves (see the privacy panel) but cannot redirect funds.')}`;
  }

  /* ================= points leaderboard + XNS ================= */
  async function cardPoints() {
    const lb = await D.api.leaderboard();
    const top = lb.slice(0, 10);
    const rows = top.map((r, i) => h`<tr><td class="r">${i + 1}</td><td>${addrLink(1, r.address)}</td><td class="r">${C.fmtInt(Math.round(r.points))}</td><td class="r">${C.fmtInt(r.deposit_count)}</td><td class="r">${fmtEth(BigInt(r.amount_wei), 1)}</td></tr>`);
    const total = lb.length;
    return h`<table class="tbl"><thead><tr><th class="r">#</th><th>Address (XNS name if one exists)</th><th class="r">Points</th><th class="r">Deposits</th><th class="r">ETH</th></tr></thead><tbody>${rows}</tbody></table>
      ${note(total + ' participants in the ETH-wrap points program ' + '(indexer /leaderboard). Names come from the on-chain XNS registry (xns.name) via getName(address) on Ethereum; an address with no name shows as itself.')} ${chipIdx('/leaderboard')}`;
  }

  /* ================= privacy boundary ================= */
  async function cardPrivacy() {
    const [ethR, baseR, feedMod] = await Promise.allSettled([D.chain.eth(), D.chain.base(), Promise.resolve(window.TMPanels1)]);
    const e = v(ethR), b = v(baseR);
    let exSettle = null, exWd = null, S = null, exEnv = null;
    try { if (e && e.block) { const w = await D.windows.ethPool(e.block); exSettle = w.list.find((t) => t.nullifiers && !t.wraps.length) || w.list.find((t) => t.nullifiers); } } catch (err) { /* example omitted */ }
    try { if (b && b.block) { const w = await D.windows.evmBase(b.block); exWd = w.events.find((x) => x.kind === 'withdraw'); S = evmSummary(w); } } catch (err) { /* example omitted */ }
    const items = [...window.TMPanels1.FEED.items.values()];
    exEnv = items.find((it) => it.desc.name === 'BRIDGE_BURN') || items[0] || null;
    const col = (cls, title, seen, hidden) => h`<div class="pcol ${cls}"><h4>${title}</h4><div class="two"><div class="see"><b>An observer can see</b><ul>${seen.map((s) => h`<li>${s}</li>`)}</ul></div><div class="hide"><b>Stays hidden</b><ul>${hidden.map((s) => h`<li>${s}</li>`)}</ul></div></div></div>`;
    const cols = [
      col('btc', 'Bitcoin envelope', ['txids, block, fee and timing', 'Bitcoin addresses and the whole transaction graph', 'opcode and asset id on transfers', 'ticker, decimals, mint authority on an etch', 'burn amounts, fair-launch mint amounts', 'AMM reserves and cBTC lock values'], ['transfer amounts (Pedersen commitments + range proofs)', 'total supply of a confidential etch', 'recipient of a stealth receipt', 'which input funded which output']),
      col('eth', 'Ethereum ConfidentialPool', ['that a settle happened: block, time, tx, who paid gas', 'how many notes it spent and created', 'wrap and unwrap amounts at the public boundary, plus the unwrap recipient', 'escrow total, cBTC backing, cUSD debt totals, AMM reserves'], ['amount and owner of every note', 'which new note came from which spent one (for owned notes)', 'sizes of blind swaps', 'who a stealth payment is for']),
      col('eth', 'EVM pool (Ethereum / Base)', ['deposit: sender and amount', 'withdrawal: recipient, amount, relayer and fee', 'that a private transfer happened and its nullifiers', 'timing of every event'], ['the link between a deposit and a later withdrawal', 'amounts of in-pool transfers', 'who owns a leaf']),
      col('bridge', 'The bridge', ['relay height, attestation times, state roots', 'counts of burns, mints and cross-outs', 'the Bitcoin burn tx: asset, nullifier, destination commitment', 'a cross-out\'s claim id'], ['amount and recipient of a bridged note', 'a proof-level link between the Bitcoin burn and its Ethereum mint (beyond timing and asset)']),
    ];
    const ex = [];
    ex.push(exSettle ? h`<div class="example"><h5>Ethereum pool, right now</h5><p>Settle ${txLink(1, exSettle.hash)} in block ${a(L.block(1, exSettle.block), C.fmtInt(exSettle.block))} spent <b>${exSettle.nullifiers}</b> note(s) and created <b>${exSettle.leaves}</b>. That is everything the chain says. No amount, no owner and no link from a spent note to a new one is on-chain; try to find them in the ${a(L.tx(1, exSettle.hash), 'logs')}.</p></div>` : '');
    ex.push(exWd ? h`<div class="example"><h5>Base EVM pool, right now</h5><p>Latest withdrawal ${txLink(8453, exWd.tx)}: <b>${fmtEth(-exWd.ext, 4)} ETH</b> to ${addrLink(8453, exWd.recipient)}, relayer fee ${fmtEth(exWd.fee, 6)} ETH. The amount and the recipient are public. Which deposit funded it is not.${S ? raw(' ' + part2(h`In the window above, ${S.wd.length} withdrawals went to ${S.rcpt.size} distinct address(es) and ${S.topA[0] ? S.topA[0][1] : 0} of them have the same amount, so an observer can pair deposits with withdrawals by amount and timing. <b>Anonymity depends on how many different people use the pool.</b>`)) : ''}</p></div>` : '');
    ex.push(exEnv ? h`<div class="example"><h5>Bitcoin, newest decoded envelope</h5><p>${exEnv.desc.label} ${C.shortHex(exEnv.txid, 8, 6)} (<a href="#" class="decode" data-decode="${exEnv.txid}">decode it</a>). Public fields: ${exEnv.desc.public.slice(0, 3).map((p) => p[0]).join(', ') || 'opcode only'}. Hidden: ${exEnv.desc.hidden.slice(0, 2).join('; ') || 'amounts'}.</p></div>` : '');
    const caveats = [
      raw('<b>Whoever proves your op sees its witness.</b> The relay/prover learns which notes an op spends and creates and how they link, plus your IP. Self-proving keeps that on your device (BUILD-A-TACIT-DAPP section 6).'),
      raw('<b>The boundary is public.</b> Wrap/unwrap amounts, EVM-pool deposits and withdrawals, Bitcoin addresses and the Bitcoin transaction graph are all visible. Privacy lives <em>inside</em> the pools.'),
      raw('<b>Small sets are weak sets.</b> Few distinct users, repeated identical amounts and tight timing narrow what an observer must guess. The live numbers above show how concentrated today\'s traffic is.'),
      raw('<b>Not trusted, but not invisible.</b> The hosted API, IPFS gateways and block explorers (including this page) cannot change validity, but each sees the queries made to it. This page makes no requests beyond the listed public endpoints and holds no keys.'),
    ];
    return h`<div class="pgrid">${cols}</div><div class="examples-live">${ex}</div><h4>Honest caveats</h4><ul class="caveats">${caveats.map((c) => h`<li>${c}</li>`)}</ul>${note('Sources: SPEC.md section 11 (Hidden / Public lists), docs/BUILD-A-TACIT-DAPP.md "What the relay sees", docs/EVM-POOL.md. The live examples are computed from the event windows loaded above.')}`;
  }

  /* ================= cross-checks ================= */
  async function cardVerify() {
    const [ethR, baseR, tipR, stR, sfR, idxR, dumpR, rhR] = await Promise.allSettled([D.chain.eth(), D.chain.base(), D.btc.tipHeight(), D.api.reflStatus(), D.api.statsFront(), D.api.confIndexMeta(), D.api.dump(), D.chain.rh()]);
    const e = v(ethR), b = v(baseR), tip = v(tipR), st = v(stR), sf = v(sfR), idx = v(idxR), dump = v(dumpR);
    const ageMin = sf ? Math.max(0, (Date.now() - sf.at) / 60000) : null;
    const checks = [];
    const add = (label, idxVal, chainVal, tol, fmtv, srcIdx, srcChain, relTol) => {
      let status = 'na', diff = null;
      if (idxVal != null && chainVal != null) {
        const x = BigInt(idxVal), y = BigInt(chainVal);
        diff = x > y ? x - y : y - x;
        if (diff === 0n) status = 'ok';
        else if (relTol && y > 0n && Number(diff) / Number(y) <= relTol) status = 'drift';
        else if (tol != null && diff <= BigInt(tol)) status = 'drift';
        else status = 'bad';
      }
      checks.push({ label, idxVal, chainVal, status, diff, fmtv, srcIdx, srcChain });
    };
    const fi = (x) => C.fmtInt(Number(x)), f18 = (x) => fmtEth(BigInt(x), 4) + ' ETH';
    add('Proven (attested) Bitcoin height', st && st.attestedHeight, e && e.attestedHeight, 0, fi, '/reflection/status?network=mainnet', L.read(ADDR.pool));
    add('Header-relay tip height', sf && sf.link.tip, e && e.relayHeight, 8, fi, '/stats?view=front', L.read(ADDR.relay));
    add('Bitcoin tip height', sf && sf.link.btcTip, tip, 8, fi, '/stats?view=front', 'https://mempool.space/api/blocks/tip/height');
    add('Pool note leaves', idx && idx.counts.leaves, e && e.leaves, 3, fi, '/confidential/index?from=999999999&limit=1', L.read(ADDR.pool));
    add('Cross-outs recorded', sf && sf.link.crossOuts, e && e.crossOuts, 0, fi, '/stats?view=front', L.read(ADDR.pool));
    add('ETH escrowed in the pool', sf && jsonNum(sf.eth.held), e && e.poolBalance, 0, f18, '/stats?view=front', L.addr(1, ADDR.pool), 0.03);
    add('TAC ERC-20 supply', sf && jsonNum(sf.tac.supply), e && e.supply.tac, 0, (x) => fmt(BigInt(x), 18, 2) + ' TAC', '/stats?view=front', L.read(ADDR.tac), 0.001);
    add('tacBTC (cBTC) ERC-20 supply', sf && jsonNum(sf.btc.tacbtc), e && e.supply.cbtc, 0, (x) => fmt(BigInt(x), 18, 6), '/stats?view=front', L.read(ADDR.tacBTC), 0.01);
    add('tacUSD (cUSD) ERC-20 supply', sf && jsonNum(sf.btc.tacusd), e && e.supply.cusd, 0, (x) => fmt(BigInt(x), 18, 4), '/stats?view=front', L.read(ADDR.tacUSD), 0.01);
    add('cUSD outstanding (engine)', sf && jsonNum(sf.btc.out), e && e.outstandingCusd, 0, (x) => fmt(BigInt(x), 8, 2), '/stats?view=front', L.read(ADDR.engine), 0.01);
    add('cBTC backing sats (reflection vs pool)', dump && dump.snapshot.cbtcBackingSats, e && e.backingSats, 0, fi, '/reflection/dump', L.read(ADDR.pool));
    const base = sf && sf.dev ? sf.dev.find((x) => x.chain === 8453) : null;
    // The Base pool's balance swings by several ETH every few seconds (deposit/withdraw loops), so a 15-minute-old snapshot can
    // never equal "now". Showing that as a mismatch would be a false alarm; it is listed as not comparable instead.
    if (base && b && b.evmBalance != null) {
      checks.push({ label: 'Base EVM-pool ETH balance', idxVal: jsonNum(base.bal), chainVal: b.evmBalance, status: 'na', diff: null, fmtv: f18, srcIdx: '/stats?view=front', srcChain: L.addr(8453, ADDR.evmPool), skip: 'not comparable: this balance moves by several ETH every few seconds, so a snapshot of a different instant cannot match' });
    }
    const ethDev = sf && sf.dev ? sf.dev.find((x) => x.chain === 1) : null;
    add('Ethereum EVM-pool ETH balance', ethDev && jsonNum(ethDev.bal), e && e.evmBalance, 0, f18, '/stats?view=front', L.addr(1, ADDR.evmPool), 0.05);
    const rhDevX = sf && sf.dev ? sf.dev.find((x) => x.chain === 4663) : null, rhX = v(rhR);
    add('Robinhood Chain EVM-pool ETH balance (chain via Robinhood RPC)', rhDevX && jsonNum(rhDevX.bal), rhX && rhX.evmBalance, 0, f18, '/stats?view=front', null, 0.05);
    // Pure-arithmetic identity inside the indexer: borrowed - repaid - liquidated = outstanding.
    if (sf && e && e.outstandingCusd != null) {
      const ident = jsonNum(sf.btc.borrowed) - jsonNum(sf.btc.repaid) - jsonNum(sf.btc.liq);
      add('Identity: borrowed − repaid − liquidated = engine outstanding', ident, e.outstandingCusd, 0, (x) => fmt(BigInt(x), 8, 2), '/stats?view=front', L.read(ADDR.engine), 0.01);
    }
    // Bitcoin AMM invariant
    if (dump && dump.snapshot.pools[0]) {
      const p = dump.snapshot.pools[0];
      const k = BigInt(p.reserveA) * BigInt(p.reserveB), kl = BigInt(p.kLast || 0);
      checks.push({ label: 'Bitcoin AMM: reserveA × reserveB ≥ kLast', idxVal: null, chainVal: null, status: k >= kl ? 'ok' : 'bad', diff: null, text: k.toString() + (k >= kl ? ' ≥ ' : ' < ') + kl.toString(), srcIdx: '/reflection/dump', srcChain: null });
    }
    if (!checks.some((c) => c.status === 'ok' || c.status === 'drift' || c.status === 'bad')) throw new Error('no comparable pair of sources is reachable right now');
    const sym = { ok: ['✓', 'match', 'ok'], drift: ['≈', 'explained drift', 'drift'], bad: ['✗', 'MISMATCH', 'bad'], na: ['–', 'unavailable', 'na'] };
    const rows = checks.map((c) => {
      const s = sym[c.status];
      const iv = c.text ? c.text : c.idxVal != null ? c.fmtv(c.idxVal) : 'unavailable', cv = c.text ? '' : c.chainVal != null ? c.fmtv(c.chainVal) : 'unavailable';
      return h`<tr class="vr-${s[2]}"><td>${c.label}</td><td class="r">${iv} ${c.srcIdx ? chipIdx(c.srcIdx) : ''}</td><td class="r">${cv} ${c.srcChain ? raw(`<a class="chip ${/mempool/.test(c.srcChain) ? 'src-btc' : 'src-chain'}" href="${U.esc(c.srcChain)}" target="_blank" rel="noopener">${/mempool/.test(c.srcChain) ? 'mempool.space' : 'chain'}</a>`) : ''}</td><td class="c"><span class="vs ${s[2]}" title="${c.skip ? U.esc(c.skip) : s[1]}">${s[0]}</span></td></tr>`;
    });
    const skipped = checks.filter((c) => c.skip);
    const ok = checks.filter((c) => c.status === 'ok').length, dr = checks.filter((c) => c.status === 'drift').length, bad = checks.filter((c) => c.status === 'bad').length;
    return h`<div class="vsum"><b class="ok">${ok}</b> exact · <b class="drift">${dr}</b> within drift · <b class="${bad ? 'bad' : 'dim'}">${bad}</b> mismatched${skipped.length ? raw(' · <b class="dim">' + skipped.length + '</b> not comparable') : ''}${ageMin != null ? raw(` · indexer snapshot is ${ageMin < 1 ? '<1' : Math.round(ageMin)} min old`) : ''}</div>
      <table class="tbl"><thead><tr><th>Quantity</th><th class="r">Tacit indexer says</th><th class="r">Chain / explorer says</th><th class="c"></th></tr></thead><tbody>${rows}</tbody></table>
      ${skipped.length ? note('Not comparable: ' + skipped.map((c) => c.label + ' (' + c.skip.replace(/^not comparable: /, '') + ')').join('; ') + '.') : ''}${note('The chain column is read live by your browser from a public RPC or mempool.space. “Explained drift” means the values differ by less than what could change since the indexer’s snapshot (a few blocks, or a small relative move for balances). A red mismatch would mean one source is wrong.')}`;
  }

  window.TMPanels2 = { cardEthPool, cardEthAssets, cardEthActivity, cardEthFarms, cardEvmPool, cardRelay, cardPoints, cardPrivacy, cardVerify, evmSummary };
})();
