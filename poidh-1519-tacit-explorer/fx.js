/* fx.js — the motion layer: count-up numbers, change flashes, scroll reveal, refresh ring, hero updates.
 * Everything animates transform / opacity (or SVG stroke offsets) and is skipped under prefers-reduced-motion. */
(function () {
  'use strict';
  const C = window.TacitCore;
  const RM = () => !!window.__rm;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const fmtDefault = (v, dec) => v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });

  /* ---------- change flash (a soft highlight that fades out) ---------- */
  function flash(el) {
    if (RM() || !el) return;
    el.classList.remove('flash');
    void el.offsetWidth; // restart the animation
    el.classList.add('flash');
    clearTimeout(el.__flashT);
    el.__flashT = setTimeout(() => el.classList.remove('flash'), 1400);
  }

  /* ---------- count-up: from the previously shown value (or 0) to the new one, ~800 ms, ease-out ---------- */
  function setNumber(el, target, opts) {
    if (!el) return;
    opts = opts || {};
    const dec = opts.decimals || 0;
    const fmt = opts.format || ((v) => fmtDefault(v, dec));
    const suffix = opts.suffix || '';
    cancelAnimationFrame(el.__raf);
    if (target == null || Number.isNaN(Number(target))) {
      el.textContent = 'unavailable'; el.classList.add('na'); el.__val = undefined; return;
    }
    target = Number(target);
    el.classList.remove('na');
    const prev = el.__val;
    el.__val = target;
    if (RM() || prev === target) { el.textContent = fmt(target) + suffix; return; }
    const from = prev === undefined ? 0 : prev;
    if (prev !== undefined) flash(el);
    const dur = opts.duration || 800;
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      const v = from + (target - from) * ease(k);
      el.textContent = fmt(k === 1 ? target : (dec ? v : Math.round(v))) + suffix;
      if (k < 1) el.__raf = requestAnimationFrame(step);
    };
    el.__raf = requestAnimationFrame(step);
  }

  /* ---------- scroll reveal with stagger ---------- */
  let io = null;
  function initReveal(root) {
    const els = $$('.reveal:not(.in)', root);
    if (!els.length) return;
    if (RM() || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    if (!io) {
      io = new IntersectionObserver((entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => (a.boundingClientRect.top - b.boundingClientRect.top) || (a.boundingClientRect.left - b.boundingClientRect.left));
        vis.forEach((e, i) => {
          const el = e.target;
          el.style.transitionDelay = Math.min(i, 8) * 50 + 'ms';
          el.classList.add('in');
          io.unobserve(el);
          setTimeout(() => { el.style.transitionDelay = ''; }, 1000 + i * 50); // keep hover transitions snappy afterwards
        });
      }, { threshold: 0.05, rootMargin: '0px 0px -3% 0px' });
    }
    els.forEach((e) => io.observe(e));
    // Safety net: if the observer never fires (unusual embedders), do not leave content hidden.
    setTimeout(() => { if (!$('.reveal.in')) $$('.reveal').forEach((e) => e.classList.add('in')); }, 3500);
  }

  /* ---------- refresh ring ---------- */
  function setRing(frac, spinning) {
    const fg = $('#ring-fg'), ring = $('#ring');
    if (!fg) return;
    fg.style.strokeDashoffset = String(100 - Math.max(0, Math.min(1, frac)) * 100);
    if (ring) ring.classList.toggle('spin', !!spinning);
  }

  /* ---------- tiny SVG sparkline with a stroke draw-in ---------- */
  function miniSpark(values, w, h, color) {
    const v = values.filter((x) => x != null && Number.isFinite(x));
    if (v.length < 2) return '';
    const lo = Math.min(...v), hi = Math.max(...v), pad = 3;
    const X = (i) => pad + (i / (v.length - 1)) * (w - pad * 2);
    const Y = (x) => h - pad - ((x - lo) / (hi - lo || 1)) * (h - pad * 2);
    let d = ''; v.forEach((x, i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x).toFixed(1); });
    const area = d + `L${X(v.length - 1).toFixed(1)} ${h}L${X(0).toFixed(1)} ${h}Z`;
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path class="sp-area" d="${area}" fill="${color}"/><path class="sp-line draw" d="${d}" pathLength="1" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
  }

  /* ---------- hero: diagram labels + KPI tiles ---------- */
  const heroSeen = {};
  function heroUpdate(d) {
    const { tip, e, st, sf, fl } = d;
    const attested = e && e.attestedHeight != null ? e.attestedHeight : st ? st.attestedHeight : null;
    const relayH = e && e.relayHeight != null ? e.relayHeight : sf && sf.link ? sf.link.tip : null;
    const num = (n) => (n == null ? 'unavailable' : C.fmtInt(n));
    const txt = (id, s) => { const el = $('#' + id); if (el && el.textContent !== s) { el.textContent = s; } };
    txt('hd-btc-h', tip != null ? 'block ' + num(tip) : 'block unavailable');
    txt('hd-btc-s', attested != null && tip != null ? 'proven to ' + num(attested) : 'Tacit envelopes');
    txt('hd-br-h', relayH != null ? 'relay ' + num(relayH) : 'relay unavailable');
    txt('hd-br-s', sf && sf.link ? num(sf.link.attests) + ' ZK attestations' : 'ZK reflection');
    const leaves = e ? e.leaves : null;
    txt('hd-eth-h', leaves != null ? num(Number(leaves)) + ' notes' : 'pool unavailable');
    txt('hd-eth-s', e && e.poolBalance != null ? C.fmtUnits(e.poolBalance, 18, 2) + ' ETH escrowed' : 'ConfidentialPool + EVM pool');
    if (st) {
      txt('hd-up', num(st.bridgeBurns) + ' burns → ' + num(st.bridgeMinted) + ' minted');
      txt('hd-down', num(e && e.crossOuts != null ? Number(e.crossOuts) : sf && sf.link ? sf.link.crossOuts : null) + ' cross-outs → ' + num(st.foldedCrossoutCount) + ' folded');
    }
    // KPI tiles
    const kv = (id) => $('#' + id + ' .kpi-v');
    const ks = (id) => $('#' + id + ' .kpi-s');
    setNumber(kv('k-tip'), tip);
    setNumber(kv('k-proven'), attested);
    setNumber(kv('k-leaves'), leaves != null ? Number(leaves) : null);
    setNumber(kv('k-eth'), e && e.poolBalance != null ? Number(C.fmtUnits(e.poolBalance, 18, 4).replace(/,/g, '')) : null, { decimals: 2, suffix: ' ETH' });
    if (ks('k-proven')) ks('k-proven').textContent = tip != null && attested != null ? (tip - attested) + ' blocks behind tip · 24 required' : 'reflected height';
    if (ks('k-tip')) ks('k-tip').textContent = 'mempool.space';
    if (ks('k-leaves')) ks('k-leaves').textContent = 'leaves in the pool tree';
    if (ks('k-eth')) ks('k-eth').textContent = 'Base EVM pool ' + (d.b && d.b.evmBalance != null ? C.fmtUnits(d.b.evmBalance, 18, 2) + ' ETH' : 'unavailable');
    // sparklines: proven height from the indexer's /flow history when it has one; the others are filled by their own cards
    if (fl && fl.series && fl.series.length > 2) setSpark('k-proven', fl.series.map((p) => p.att), '#2dd4bf', 'Proven height, last 24 h (indexer /flow readings)');
  }

  /* put a draw-in sparkline into a KPI tile (replaced only when the data really changed) */
  function setSpark(id, values, color, title) {
    const box = $('#' + id + ' .kpi-spark'); if (!box) return;
    const key = values.join(',');
    if (box.__key === key) return;
    const html = miniSpark(values, 120, 34, color);
    if (!html) { box.innerHTML = ''; box.__key = ''; return; }
    box.__key = key; box.innerHTML = html; if (title) box.title = title;
  }

  /* ---------- SMIL (particles) pause for reduced motion / hidden tab ---------- */
  function syncSmil() {
    const svg = $('#hero-svg');
    if (!svg || !svg.pauseAnimations) return;
    if (RM() || document.hidden) svg.pauseAnimations(); else svg.unpauseAnimations();
  }
  document.addEventListener('visibilitychange', () => { document.documentElement.classList.toggle('paused', document.hidden); syncSmil(); });
  document.addEventListener('DOMContentLoaded', syncSmil);

  /* ---------- skeleton lines (for transient loading states inside a card) ---------- */
  const skeleton = (n) => '<div class="sk-wrap" aria-hidden="true">' + Array.from({ length: n || 3 }, (_, i) => `<i class="sk w${[90, 70, 82, 55][i % 4]}"></i>`).join('') + '</div>';

  window.TMFX = { setSpark, setNumber, flash, initReveal, setRing, miniSpark, heroUpdate, syncSmil, skeleton };
})();
