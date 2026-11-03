/* tacit-core.js — pure, dependency-free helpers for the Tacit Meridian explorer.
 *
 * Everything here is deterministic parsing: the Tacit Bitcoin envelope decoder (SPEC section 3.1),
 * a bech32m decoder for tacit1... IDs, a minimal ABI/RPC toolkit, and number formatting.
 * No network access happens in this file, so it also runs under Node for tests.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TacitCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- bytes ---------- */
  const HEXCHARS = '0123456789abcdef';
  function hexToBytes(hex) {
    hex = String(hex).replace(/^0x/i, '');
    if (hex.length % 2) throw new Error('odd hex length');
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
      const v = parseInt(hex.substr(i * 2, 2), 16);
      if (Number.isNaN(v)) throw new Error('bad hex');
      out[i] = v;
    }
    return out;
  }
  function bytesToHex(b) {
    let s = '';
    for (let i = 0; i < b.length; i++) s += HEXCHARS[b[i] >> 4] + HEXCHARS[b[i] & 15];
    return s;
  }
  function le(bytes, off, len) { // little-endian unsigned -> BigInt
    let v = 0n;
    for (let i = len - 1; i >= 0; i--) v = (v << 8n) | BigInt(bytes[off + i]);
    return v;
  }

  /* ---------- Tacit opcodes (SPEC 3.9) ---------- */
  const OPS = {
    0x21: { name: 'T_CETCH', label: 'Etch', kind: 'etch', blurb: 'Issues a new confidential asset. Ticker and decimals are public; the supply is a hidden commitment.' },
    0x22: { name: 'T_CXFER_BPP', label: 'Transfer', kind: 'transfer', blurb: 'Confidential transfer (Bulletproofs+). Asset and number of outputs are public; amounts are hidden.' },
    0x23: { name: 'T_CXFER', label: 'Transfer', kind: 'transfer', blurb: 'Confidential transfer (classic Bulletproof). Asset and number of outputs are public; amounts are hidden.' },
    0x24: { name: 'T_MINT', label: 'Mint', kind: 'mint', blurb: 'Additional issuance signed by the asset\'s mint authority. The minted amount is a hidden commitment.' },
    0x25: { name: 'T_BURN', label: 'Burn', kind: 'burn', blurb: 'Destroys supply. The burned amount is deliberately public so supply stays auditable.' },
    0x26: { name: 'T_AXFER', label: 'Atomic trade', kind: 'trade', blurb: 'A confidential asset settled against a BTC payment in one transaction.' },
    0x27: { name: 'T_PETCH', label: 'Fair-launch etch', kind: 'etch', blurb: 'Declares a public-mint asset: ticker, cap and per-mint amount are public. Creates no supply by itself.' },
    0x28: { name: 'T_PMINT', label: 'Fair-launch mint', kind: 'mint', blurb: 'One public mint of a fair-launch asset. The per-mint amount is public by design.' },
    0x29: { name: 'T_DEPOSIT', label: 'Legacy mixer deposit', kind: 'legacy', blurb: 'Legacy fixed-denomination mixer op (kept so old UTXOs keep their meaning).' },
    0x2a: { name: 'T_WITHDRAW', label: 'Legacy mixer withdraw', kind: 'legacy', blurb: 'Legacy fixed-denomination mixer op.' },
    0x2b: { name: 'BRIDGE_BURN', label: 'Bridge burn', kind: 'bridge', blurb: 'Burns a note on Bitcoin so Ethereum can mint it once. Asset, nullifier and destination commitment are public; amount and recipient are not.' },
    0x2c: { name: 'T_DCLAIM', label: 'Legacy claim', kind: 'legacy', blurb: 'Legacy claim-pool op.' },
    0x2d: { name: 'T_LP_ADD', label: 'Add liquidity', kind: 'amm', blurb: 'Adds liquidity to a Bitcoin-native AMM pool. Pool reserves are public numbers.' },
    0x2e: { name: 'T_LP_REMOVE', label: 'Remove liquidity', kind: 'amm', blurb: 'Burns LP shares for a pro-rata withdrawal.' },
    0x2f: { name: 'T_SWAP_BATCH', label: 'Swap batch', kind: 'amm', blurb: 'Up to 16 hidden-amount swap intents cleared at one price.' },
    0x31: { name: 'T_PROTOCOL_FEE_CLAIM', label: 'Protocol fee claim', kind: 'amm', blurb: 'Mints a pool\'s accrued protocol-fee skim to its recipient.' },
    0x32: { name: 'T_SWAP_VAR', label: 'Swap', kind: 'amm', blurb: 'Per-trade swap against the constant-product curve with a public input amount.' },
    0x33: { name: 'T_SWAP_ROUTE', label: 'Swap route', kind: 'amm', blurb: 'Atomic route over 2-4 pools.' },
    0x34: { name: 'T_FARM_INIT', label: 'Farm init', kind: 'amm', blurb: 'Funds a reward farm.' },
    0x35: { name: 'T_LP_BOND', label: 'LP bond', kind: 'amm', blurb: 'Bonds LP shares into a farm.' },
    0x36: { name: 'T_LP_UNBOND', label: 'LP unbond', kind: 'amm', blurb: 'Unbonds LP shares.' },
    0x37: { name: 'T_AXFER_VAR', label: 'Atomic trade (var)', kind: 'legacy', blurb: 'Variable-amount atomic trade (builders off).' },
    0x38: { name: 'T_WRAPPER_ATTEST', label: 'Wrapper attestation', kind: 'legacy', blurb: 'Issuer-signed reserves and supply attestation.' },
    0x39: { name: 'T_CXFER_BOUND', label: 'Bound transfer', kind: 'transfer', blurb: 'Transfer bound to a pool deployment; becomes a note in that Ethereum pool\'s fast lane after reflection.' },
    0x3b: { name: 'T_LP_HARVEST', label: 'LP harvest', kind: 'amm', blurb: 'Harvests farm rewards.' },
    0x3c: { name: 'T_AXFER_BPP', label: 'Atomic trade', kind: 'trade', blurb: 'Atomic trade with a Bulletproofs+ proof.' },
    0x3e: { name: 'T_FARM_REFUND', label: 'Farm refund', kind: 'amm', blurb: 'Launcher reclaims leftover farm rewards.' },
    0x43: { name: 'T_SLOT_MINT', label: 'cBTC.zk slot mint', kind: 'legacy', blurb: 'BTC locked at a key derived from a mixer leaf.' },
    0x44: { name: 'T_SLOT_BURN', label: 'cBTC.zk slot burn', kind: 'legacy', blurb: 'cBTC.zk slot op.' },
    0x45: { name: 'T_SLOT_ROTATE', label: 'cBTC.zk slot rotate', kind: 'legacy', blurb: 'cBTC.zk slot op.' },
    0x46: { name: 'T_SLOT_SPLIT', label: 'cBTC.zk slot split', kind: 'legacy', blurb: 'cBTC.zk slot op.' },
    0x47: { name: 'T_SLOT_MERGE', label: 'cBTC.zk slot merge', kind: 'legacy', blurb: 'cBTC.zk slot op.' },
    0x5b: { name: 'T_PREAUTH_BID', label: 'Pre-authorized bid', kind: 'trade', blurb: 'Buyer-offline bid.' },
    0x5c: { name: 'T_PREAUTH_BID_VAR', label: 'Pre-authorized bid (var)', kind: 'trade', blurb: 'Buyer-offline bid grid.' },
    0x65: { name: 'T_CROSSOUT_MINT', label: 'Cross-out mint', kind: 'bridge', blurb: 'Re-mints on Bitcoin a note that was crossed out of the Ethereum pool.' },
    0x66: { name: 'T_CBTC_LOCK', label: 'cBTC lock', kind: 'cbtc', blurb: 'Registers a self-custody BTC output so the Ethereum pool can mint cBTC against it. The locked value is public.' },
    0x67: { name: 'T_CBTC_REDEEM', label: 'cBTC redeem', kind: 'cbtc', blurb: 'Unlocks a cBTC lock and burns exactly its value in cBTC.' },
    0x68: { name: 'T_BTC_CALL', label: 'BTC-signed call', kind: 'bridge', blurb: 'A value-free, BIP-340-signed authorization of an Ethereum call.' },
    0x69: { name: 'T_ETH_CALL', label: 'ETH call message', kind: 'bridge', blurb: 'A message from Ethereum\'s EthCallOutbox delivered to Bitcoin.' },
    0x6c: { name: 'T_BTC_POOL_SHIELD', label: 'Shielded pool op', kind: 'pool', blurb: 'Bitcoin-native shielded pool (experimental): notes are encrypted leaves in a Merkle tree.' },
    0x6d: { name: 'T_BTC_SPEND', label: 'Shielded pool spend', kind: 'pool', blurb: 'Bitcoin-native shielded pool spend (experimental).' },
  };

  const MAGIC_HEX = '0063055441434954'; // OP_FALSE OP_IF PUSH5 "TACIT"

  /* Decode one tapscript leaf. Returns { signer, opcode, payload } or null. */
  function decodeEnvelopeScript(script) {
    if (!script || script.length < 36) return null;
    let p = 0;
    if (script[p] !== 32) return null; p += 1;
    const signer = script.slice(p, p + 32); p += 32;
    if (script[p] !== 0xac) return null; p += 1; // OP_CHECKSIG
    if (script[p] !== 0x00 || script[p + 1] !== 0x63) return null; p += 2; // OP_FALSE OP_IF
    const pushes = [];
    let sawEndif = false;
    while (p < script.length) {
      const op = script[p++];
      if (op === 0x68) { sawEndif = true; break; }
      let ln;
      if (op >= 1 && op <= 75) ln = op;
      else if (op === 0x4c) { if (p + 1 > script.length) return null; ln = script[p]; p += 1; }
      else if (op === 0x4d) { if (p + 2 > script.length) return null; ln = script[p] | (script[p + 1] << 8); p += 2; }
      else if (op === 0x00) ln = 0;
      else return null;
      if (p + ln > script.length) return null;
      pushes.push(script.slice(p, p + ln)); p += ln;
    }
    if (!sawEndif || pushes.length < 3) return null;
    const magic = pushes[0];
    if (magic.length !== 5 || bytesToHex(magic) !== '5441434954') return null;
    if (pushes[1].length !== 1 || pushes[1][0] !== 1) return null;
    let total = 0; for (let i = 2; i < pushes.length; i++) total += pushes[i].length;
    if (total < 1) return null;
    const payload = new Uint8Array(total);
    let o = 0; for (let i = 2; i < pushes.length; i++) { payload.set(pushes[i], o); o += pushes[i].length; }
    return { signer: bytesToHex(signer), opcode: payload[0], payload };
  }

  /* Find a Tacit envelope in the witness (array of hex strings) of one input. */
  function envelopeFromWitness(witness) {
    if (!Array.isArray(witness) || witness.length < 2) return null;
    for (let i = witness.length - 1; i >= 0; i--) {
      const w = witness[i];
      if (typeof w === 'string' && w.length > 80 && w.indexOf(MAGIC_HEX) !== -1) {
        try {
          const env = decodeEnvelopeScript(hexToBytes(w));
          if (env) return env;
        } catch (e) { /* not a script */ }
      }
    }
    return null;
  }

  /* Public fields of an envelope payload. Never claims to know a hidden amount. */
  function describePayload(opcode, payload) {
    const meta = OPS[opcode] || { name: 'UNASSIGNED_0x' + opcode.toString(16), label: 'Unknown op', kind: 'unknown', blurb: 'Opcode not assigned in the spec table; creates no Tacit state.' };
    const out = { opcode, name: meta.name, label: meta.label, kind: meta.kind, blurb: meta.blurb, payloadBytes: payload.length, public: [], hidden: [] };
    const P = payload;
    const asset = (off) => bytesToHex(P.slice(off, off + 32));
    try {
      switch (opcode) {
        case 0x21: {
          const tlen = P[1];
          const ticker = new TextDecoder('utf-8', { fatal: false }).decode(P.slice(2, 2 + tlen));
          const dec = P[2 + tlen];
          let q = 3 + tlen + 33 + 8;
          const rpLen = P[q] | (P[q + 1] << 8); q += 2 + rpLen;
          const auth = P.slice(q, q + 32); q += 32;
          const imgLen = P[q] | (P[q + 1] << 8); q += 2;
          const img = imgLen ? new TextDecoder().decode(P.slice(q, q + imgLen)) : '';
          const fixed = auth.every((x) => x === 0);
          out.ticker = ticker;
          out.public.push(['Ticker', ticker], ['Decimals', String(dec)], ['Mint authority', fixed ? 'none (supply fixed forever)' : bytesToHex(auth)]);
          if (img) out.public.push(['Image URI', img]);
          out.hidden.push('Total supply (Pedersen commitment + range proof)', 'Who holds the supply note');
          break;
        }
        case 0x22: case 0x23: case 0x39: {
          let o = 1; let bound = null;
          if (opcode === 0x39) { bound = asset(1); o = 33; }
          out.assetId = asset(o);
          const n = P[o + 32 + 64];
          out.public.push(['Asset id', out.assetId], ['Outputs', String(n)]);
          if (bound) out.public.push(['Bound to deployment', bound]);
          out.hidden.push('Every amount (Pedersen commitments)', 'Which input funded which output', 'Who owns each output');
          break;
        }
        case 0x24: {
          out.assetId = asset(1);
          out.public.push(['Asset id', out.assetId], ['Etch txid', asset(33)]);
          out.hidden.push('Minted amount (commitment)');
          break;
        }
        case 0x25: {
          out.assetId = asset(1);
          const burned = le(P, 33, 8);
          const n = P[33 + 8 + 64];
          out.burned = burned;
          out.public.push(['Asset id', out.assetId], ['Burned (base units)', burned.toString()], ['Change outputs', String(n)]);
          out.hidden.push('Amounts of any change outputs');
          break;
        }
        case 0x27: {
          const tlen = P[1];
          const ticker = new TextDecoder().decode(P.slice(2, 2 + tlen));
          const dec = P[2 + tlen];
          const cap = le(P, 3 + tlen, 8), lim = le(P, 11 + tlen, 8);
          out.ticker = ticker;
          out.public.push(['Ticker', ticker], ['Decimals', String(dec)], ['Cap (base units)', cap.toString()], ['Per-mint amount (base units)', lim.toString()]);
          out.hidden.push('Nothing about supply: it is fully public');
          break;
        }
        case 0x28: {
          out.assetId = asset(1);
          const amt = le(P, 1 + 32 + 32 + 33, 8);
          out.public.push(['Asset id', out.assetId], ['Etch txid', asset(33)], ['Mint amount (base units)', amt.toString()]);
          out.hidden.push('Nothing: amount and blinding are published so the cap is auditable');
          break;
        }
        case 0x2b: {
          if (P.length === 161) {
            out.assetId = asset(1);
            out.public.push(['Asset id', out.assetId], ['Nullifier', asset(65)], ['Destination commitment', asset(97)], ['Target deployment', asset(129)]);
            out.hidden.push('Burned amount', 'Recipient on Ethereum', 'Which earlier note was burned');
          } else {
            out.public.push(['Layout', 'legacy drop op (not a 161-byte bridge burn)']);
          }
          break;
        }
        case 0x65: {
          out.assetId = asset(1);
          out.public.push(['Asset id', out.assetId], ['Claim id', asset(33)]);
          out.hidden.push('Amount (commitment)', 'Owner of the re-minted note');
          break;
        }
        case 0x66: case 0x67:
          out.public.push(['Op', meta.label]);
          out.hidden.push('Which Ethereum note the lock pre-commits to');
          break;
        case 0x2d: case 0x2e: case 0x2f: case 0x32: case 0x33:
          out.public.push(['Pool op', meta.label]);
          out.hidden.push('Hidden-amount swap intents (batch swaps)');
          break;
        default:
          break;
      }
    } catch (e) {
      out.public.push(['Decode note', 'payload shorter than the spec layout; showing opcode only']);
    }
    return out;
  }

  /* ---------- bech32m (BIP-350), written from the spec ---------- */
  const B32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  function polymod(values) {
    const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    let chk = 1;
    for (const v of values) {
      const top = chk >>> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ v;
      for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i];
    }
    return chk >>> 0;
  }
  function hrpExpand(h) {
    const r = [];
    for (let i = 0; i < h.length; i++) r.push(h.charCodeAt(i) >> 5);
    r.push(0);
    for (let i = 0; i < h.length; i++) r.push(h.charCodeAt(i) & 31);
    return r;
  }
  function bech32Decode(str) {
    const lower = str.toLowerCase(), upper = str.toUpperCase();
    if (str !== lower && str !== upper) throw new Error('mixed case');
    str = lower;
    const sep = str.lastIndexOf('1');
    if (sep < 1 || sep + 7 > str.length) throw new Error('bad separator position');
    const hrp = str.slice(0, sep), data = [];
    for (let i = sep + 1; i < str.length; i++) {
      const v = B32.indexOf(str[i]);
      if (v < 0) throw new Error('invalid character "' + str[i] + '"');
      data.push(v);
    }
    const chk = polymod(hrpExpand(hrp).concat(data));
    if (chk !== 0x2bc830a3) throw new Error(chk === 1 ? 'valid bech32 but not bech32m' : 'checksum mismatch');
    const d5 = data.slice(0, -6);
    let acc = 0, bits = 0; const out = [];
    for (const v of d5) {
      acc = (acc << 5) | v; bits += 5;
      while (bits >= 8) { bits -= 8; out.push((acc >> bits) & 255); }
      acc &= (1 << bits) - 1;
    }
    if (bits >= 5 || (acc << (8 - bits)) & 255) throw new Error('non-zero padding');
    return { hrp, bytes: Uint8Array.from(out) };
  }

  /* secp256k1 point-on-curve check for a compressed key */
  const SECP_P = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
  function modpow(b, e, m) { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = (r * b) % m; b = (b * b) % m; e >>= 1n; } return r; }
  function isValidCompressedKey(bytes) {
    if (bytes.length !== 33 || (bytes[0] !== 2 && bytes[0] !== 3)) return false;
    const x = BigInt('0x' + bytesToHex(bytes.slice(1)));
    if (x >= SECP_P) return false;
    const rhs = (modpow(x, 3n, SECP_P) + 7n) % SECP_P;
    const y = modpow(rhs, (SECP_P + 1n) / 4n, SECP_P);
    return (y * y) % SECP_P === rhs;
  }

  /* Decode a tacit1... unified address (layout from the public dapp/tacit-address.js header comment). */
  function decodeTacitAddress(addr) {
    const { hrp, bytes } = bech32Decode(String(addr).trim());
    const nets = { tacit: 'mainnet', tactt: 'signet', tacrt: 'regtest' };
    if (!nets[hrp]) throw new Error('prefix "' + hrp + '" is not a Tacit unified address prefix (tacit / tactt / tacrt)');
    if (bytes.length < 2) throw new Error('payload too short');
    const version = bytes[0], flags = bytes[1];
    if (version !== 0) throw new Error('unsupported address version ' + version);
    if (!(flags & 1)) throw new Error('address carries no Bitcoin lane');
    if ((flags & 2) && (flags & 0x80)) throw new Error('Ethereum-side key named twice');
    const want = 2 + 66 + ((flags & 2) ? 33 : 0) + ((flags & 4) ? 97 : 0);
    const unknown = flags & ~(1 | 2 | 4 | 0x80);
    if (unknown ? bytes.length < want : bytes.length !== want) throw new Error('payload length ' + bytes.length + ' does not match flags (expected ' + want + ')');
    const spend = bytes.slice(2, 35), scan = bytes.slice(35, 68);
    const res = { network: nets[hrp], flags, bytes: bytes.length, lanes: {}, keyChecks: {} };
    res.lanes.btc = { spend: bytesToHex(spend), scan: bytesToHex(scan) };
    res.keyChecks.spend = isValidCompressedKey(spend); res.keyChecks.scan = isValidCompressedKey(scan);
    let at = 68;
    if (flags & 2) { const k = bytes.slice(at, at + 33); at += 33; res.lanes.evm = { owner: bytesToHex(k), sameAsSpend: false }; res.keyChecks.evm = isValidCompressedKey(k); }
    else if (flags & 0x80) { res.lanes.evm = { owner: bytesToHex(spend), sameAsSpend: true }; }
    if (flags & 4) {
      const k = bytes.slice(at, at + 97);
      res.lanes.pool = { view: bytesToHex(k.slice(0, 33)), a: bytesToHex(k.slice(33, 65)), n: bytesToHex(k.slice(65, 97)) };
      res.keyChecks.poolView = isValidCompressedKey(k.slice(0, 33));
    }
    return res;
  }

  /* ---------- ABI / formatting ---------- */
  const word = (hex, i) => '0x' + hex.replace(/^0x/, '').slice(i * 64, i * 64 + 64);
  const wBig = (hex, i) => BigInt(word(hex, i));
  const wSigned = (hex, i) => { const v = wBig(hex, i); return v >= (1n << 255n) ? v - (1n << 256n) : v; };
  const wAddr = (hex, i) => '0x' + hex.replace(/^0x/, '').slice(i * 64 + 24, i * 64 + 64);
  const pad32 = (hexNo0x) => hexNo0x.toLowerCase().padStart(64, '0');
  function abiString(hex, offsetWordIdx) { // decode a dynamic string whose offset sits in word 0
    const h = hex.replace(/^0x/, '');
    const off = Number(BigInt('0x' + h.slice(offsetWordIdx * 64, offsetWordIdx * 64 + 64))) * 2;
    const len = Number(BigInt('0x' + h.slice(off, off + 64)));
    if (!len) return '';
    const bytes = hexToBytes(h.slice(off + 64, off + 64 + len * 2));
    return new TextDecoder().decode(bytes);
  }
  function abiEncodeString(s) {
    const b = new TextEncoder().encode(s);
    const padded = bytesToHex(b).padEnd(Math.ceil(b.length / 32) * 64, '0');
    return pad32('20') + pad32(b.length.toString(16)) + padded;
  }

  function fmtUnits(v, decimals, maxFrac) {
    v = BigInt(v);
    const neg = v < 0n; if (neg) v = -v;
    const base = 10n ** BigInt(decimals);
    const whole = v / base, frac = v % base;
    let f = decimals ? frac.toString().padStart(decimals, '0') : '';
    if (maxFrac != null) f = f.slice(0, maxFrac);
    f = f.replace(/0+$/, '');
    const w = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + w + (f ? '.' + f : '');
  }
  const fmtInt = (n) => (n == null || Number.isNaN(Number(n)) ? 'unavailable' : Number(n).toLocaleString('en-US'));
  const shortHex = (h, a = 8, b = 6) => { h = String(h); return h.length > a + b + 2 ? h.slice(0, a) + '…' + h.slice(-b) : h; };
  function ago(tsSec, nowSec) {
    const d = Math.max(0, (nowSec || Date.now() / 1000) - tsSec);
    if (d < 90) return Math.round(d) + 's ago';
    if (d < 5400) return Math.round(d / 60) + 'm ago';
    if (d < 172800) return (d / 3600).toFixed(1) + 'h ago';
    return Math.round(d / 86400) + 'd ago';
  }

  return {
    hexToBytes, bytesToHex, OPS, MAGIC_HEX,
    decodeEnvelopeScript, envelopeFromWitness, describePayload,
    bech32Decode, decodeTacitAddress, isValidCompressedKey,
    word, wBig, wSigned, wAddr, pad32, abiString, abiEncodeString,
    fmtUnits, fmtInt, shortHex, ago,
  };
});
