
"use strict";
/* ===== PURE:START ===== */
/* ---------- Parser murni: window.parseChats(chatText, catalog) ----------
   Tidak menyentuh DOM. Semua logika pesanan ada di blok ini. */

var _NUM_WORDS = {
  nol:0, satu:1, dua:2, tiga:3, empat:4, lima:5, enam:6,
  tujuh:7, delapan:8, sembilan:9, sepuluh:10, sebelas:11, duabelas:12
};

var _LINE_RE = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2})[.:](\d{2})\]\s*([^:]{1,60}?):\s*(.*)$/;

function _norm(s){
  return String(s).toLowerCase()
    .replace(/[^\x20-\x7E]/g, " ")   // buang emoji/karakter non-ASCII
    .replace(/[+;,]/g, " ")          // pemisah "+", ",", ";" -> spasi
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function _numTok(tok){
  if(/^\d+$/.test(tok)) return parseInt(tok, 10);
  var mx = tok.match(/^(\d+)x$|^x(\d+)$/);            // revisi manual: "2x", "x2"
  if(mx) return parseInt(mx[1] || mx[2], 10);
  if(_NUM_WORDS.hasOwnProperty(tok)) return _NUM_WORDS[tok];
  return null;
}

function _buildMatcher(catalog){
  var list = [];
  (catalog.products || []).forEach(function(p){
    var seen = {};
    var cands = (p.aliases || []).slice();
    if(p.name){
      cands.push(p.name.toLowerCase().replace(/\(.*\)/, "").trim());
    }
    cands.forEach(function(a){
      a = String(a).toLowerCase().trim();
      if(!a || seen[a]) return;
      seen[a] = 1;
      list.push({ alias: a, code: p.code });
    });
  });
  list.sort(function(a, b){ return b.alias.length - a.alias.length; });
  return list;
}

/* Cari semua produk di teks. Alias terpanjang menang; akhiran "-nya" diizinkan. */
function _findProducts(t, matcher){
  var out = [], i = 0;
  while(i < t.length){
    if(!/[a-z]/.test(t[i])){ i++; continue; }
    var hit = null;
    for(var k = 0; k < matcher.length; k++){
      var a = matcher[k].alias;
      if(!t.startsWith(a, i)) continue;
      if(i > 0 && /[a-z0-9]/.test(t[i-1])) continue;          // depan harus batas kata
      var end = i + a.length;
      if(t.startsWith("nya", end)){
        var e2 = end + 3;
        if(e2 >= t.length || !/[a-z0-9]/.test(t[e2])) end = e2; // "nastarnya" dsb.
      }
      if(end < t.length && /[a-z0-9]/.test(t[end])) continue;   // belakang harus batas kata
      hit = { code: matcher[k].code, alias: a, start: i, end: end, nya: end > i + a.length };
      break;
    }
    if(hit){ out.push(hit); i = hit.end; } else { i++; }
  }
  return out;
}

/* Jumlah setelah produk ("bolu pandan 2", "nastar 2 toples", "donat dua"). */
function _qtyNear(t, from, to){
  var seg = t.slice(from, to).trim();
  if(!seg) return null;
  var toks = seg.split(/\s+/);
  for(var i = 0; i < toks.length; i++){
    var n = _numTok(toks[i]);
    if(n !== null) return n;
  }
  return null;
}

/* Cadangan: angka tepat sebelum produk ("2 bolu pandan"). */
function _qtyBefore(t, start){
  var seg = t.slice(Math.max(0, start - 14), start).trim().split(/\s+/);
  for(var i = seg.length - 1; i >= 0; i--){
    var n = _numTok(seg[i]);
    if(n !== null) return n;
  }
  return null;
}

var _DELIVERY_TOK = {
  antar:1, anter:1, diantar:1, dianter:1, kirim:1, dikirim:1,
  antarin:1, dianterin:1, kirimin:1, kirimin:1, diantarin:1,
  anterin:1, antarkan:1, diantarkan:1, kirimkan:1, dikirimkan:1   // revisi manual
};
var _PICKUP_TOK = { ambil:1, diambil:1, jemput:1, pickup:1 };

/* Revisi manual (uji holdout): kosakata batal lebih luas. */
var _CANCEL_RE = /\b(batal\w*|dibatalkan|cancel\w*|(ga|gak|nggak|ngga|enggak|tidak|g)\s+(jadi|usah))\b/;

function _cancelAll(rec, customer, cancelled){
  rec.items.forEach(function(q, code){ cancelled.push({ customer: customer, code: code, qty: q }); });
}

/* Fungsi utama yang dipakai UI maupun pengujian otomatis. */
function parseChats(chatText, catalog){
  var store = (catalog && catalog.store) || {};
  var deliveryFee = store.delivery_fee != null ? store.delivery_fee : 10000;
  var matcher = _buildMatcher(catalog);

  var byName = new Map();   // pelanggan -> {items:Map, delivery, seq}
  var unknown = [];
  var cancelled = [];

  var lines = String(chatText || "").split(/\r?\n/);
  lines.forEach(function(raw, idx){
    var m = raw.match(_LINE_RE);
    if(!m) return;
    var customer = m[6].trim();
    var t = _norm(m[7]);
    if(!t || !customer) return;

    var prods = _findProducts(t, matcher);

    /* Pertanyaan ketersediaan: "ada bika ambon ga?" -> bukan pesanan */
    var asksAvail = /\bada\b/.test(t) &&
      (/\?\s*$/.test(t) || /\b(ga|gak|ngga|nggak|gak)\b/.test(t));
    if(asksAvail){
      if(prods.length === 0){
        var mm = t.match(/\bada\s+(.+)$/);
        var phrase = mm ? mm[1] : "";
        phrase = phrase
          .replace(/\?/g, " ")
          .replace(/\b(ga|gak|ngga|nggak|bu|kak|ya|deh|dong|apakah|ada)\b/g, " ")
          .replace(/\s+/g, " ").trim();
        if(phrase) unknown.push({ customer: customer, text: phrase });
      }
      return; // tanya stok, bukan pesanan (produk pun dikenal pun diabaikan)
    }

    /* Tanpa produk yang dikenali */
    if(prods.length === 0){
      if(_CANCEL_RE.test(t)){
        var rec0 = byName.get(customer);
        if(rec0){
          _cancelAll(rec0, customer, cancelled);
          byName.delete(customer);
        }
      }
      return; // makasih / transfer / tanya-tanya -> diabaikan
    }

    /* Revisi manual: tukar produk "ganti A jadi B" (jumlah ikut A). */
    if(/\bganti\b/.test(t) && prods.length === 2){
      var recS = byName.get(customer), jm = t.slice(prods[0].end, prods[1].start).match(/\b(jadi|jd|ke)\b/);
      if(recS && jm && recS.items.has(prods[0].code)){
        var qS = recS.items.get(prods[0].code);
        recS.items.delete(prods[0].code);
        recS.items.set(prods[1].code, (recS.items.get(prods[1].code) || 0) + qS);
        return;
      }
    }

    /* Pembatalan ("...nya batal", "ga jadi", "cancel", "semua pesanan batal").
       Revisi manual: produk SETELAH frasa batal ("X ga jadi, Y aja") tidak ikut batal:
       Y yang sudah dipesan tetap, Y yang belum dipesan ditambah (jumlah atau 1). */
    var cm = t.match(_CANCEL_RE);
    if(cm){
      var recB = byName.get(customer);
      var isAll = /\bsemua(nya)?\b/.test(t);
      if(!recB) return;
      if(isAll){
        _cancelAll(recB, customer, cancelled);
        byName.delete(customer);
        return;
      }
      var cut = cm.index;
      var before = prods.filter(function(pm){ return pm.start < cut; });
      var after  = prods.filter(function(pm){ return pm.start > cut; });
      if(before.length === 0){ before = prods; after = []; }   // "cancel brownisnya"
      before.forEach(function(pm){
        var q = recB.items.get(pm.code);
        if(q != null){
          cancelled.push({ customer: customer, code: pm.code, qty: q });
          recB.items.delete(pm.code);
        }
      });
      after.forEach(function(pm, i){
        var stop = (i + 1 < after.length) ? after[i+1].start : t.length;
        var q = _qtyNear(t, pm.end, stop);
        if(q !== null) recB.items.set(pm.code, q);
        else if(!recB.items.has(pm.code)) recB.items.set(pm.code, 1);
      });
      if(recB.items.size === 0) byName.delete(customer);
      return;
    }

    /* Antar / ambil */
    var wantsDelivery = false, wantsPickup = false;
    t.split(" ").forEach(function(tok){
      if(_DELIVERY_TOK[tok]) wantsDelivery = true;
      if(_PICKUP_TOK[tok]) wantsPickup = true;
    });

    var rec = byName.get(customer);
    if(!rec){
      rec = { items: new Map(), delivery: false, seq: idx };
      byName.set(customer, rec);
    }
    if(wantsDelivery) rec.delivery = true;

    var hasJadi  = /\b(jadi|jd)\b/.test(t);
    var hasTamb  = /\b(tambah|nambah|tambahin)\b/.test(t);
    var hasKurang= /kurang/.test(t);
    var hasAja   = /\b(aja|ajah|saja)\b/.test(t);
    var jadiM    = t.match(/\b(?:jadi|jd)\s+(\d+)\b/);
    var hasMark  = /\b(deh|dong|ganti|ubah|diganti|diubah)\b/.test(t);
    var refsOwn  = prods.some(function(pm){ return pm.nya && rec.items.has(pm.code); });
    var isChange = hasJadi || hasTamb || hasKurang || hasAja || hasMark || refsOwn;

    if(isChange){
      /* Pesanan berubah: "jadi 3 aja", "tambah 1 jd 2", "kurangin jadi 4", "1 aja" */
      prods.forEach(function(pm, i){
        var stop = (i + 1 < prods.length) ? prods[i+1].start : t.length;
        var cur = rec.items.get(pm.code) || 0;
        var q;
        if(jadiM && prods.length === 1){
          q = parseInt(jadiM[1], 10);            // jumlah final setelah "jadi/jd"
        } else {
          q = _qtyNear(t, pm.end, stop);
          if(q === null) q = 1;
        }
        if(hasTamb && !jadiM) q = cur + q;        // "tambah 1" tanpa jumlah final
        if(hasKurang && !jadiM) q = cur - q;      // revisi manual: "kurangi 1" = relatif
        if(q <= 0){ rec.items.delete(pm.code); return; }
        rec.items.set(pm.code, q);                // set; kalau belum ada -> otomatis masuk
      });
    } else {
      /* Pesanan baru: jumlah per produk, default 1.
         Revisi manual: bila angka ditulis SEBELUM produk pertama ("2 brownies + 1 bolu"),
         tiap produk memakai angka di depannya, bukan angka sesudahnya. */
      var prefix = _qtyBefore(t, prods[0].start) !== null;
      prods.forEach(function(pm, i){
        var stop = (i + 1 < prods.length) ? prods[i+1].start : t.length;
        var q = prefix ? _qtyNear(t, i ? prods[i-1].end : Math.max(0, pm.start - 14), pm.start)
                       : _qtyNear(t, pm.end, stop);
        if(q === null) q = _qtyBefore(t, pm.start);
        if(q === null) q = 1;
        rec.items.set(pm.code, (rec.items.get(pm.code) || 0) + q);
      });
    }
  });

  var orders = [];
  byName.forEach(function(rec, name){
    if(rec.items.size === 0) return;
    var items = [];
    rec.items.forEach(function(qty, code){ items.push({ code: code, qty: qty }); });
    orders.push({ customer: name, items: items, delivery: rec.delivery });
  });

  return { orders: orders, unknown: unknown, cancelled: cancelled };
}

/* Statistik stok & pendapatan dari hasil parseChats (murni, tanpa DOM). */
function computeStats(orders, catalog){
  var store = (catalog && catalog.store) || {};
  var fee = store.delivery_fee != null ? store.delivery_fee : 10000;
  var threshold = store.low_stock_threshold != null ? store.low_stock_threshold : 3;
  var map = new Map();
  (catalog.products || []).forEach(function(p){
    map.set(p.code, { code: p.code, name: p.name, price: p.price, stock: p.stock, units: 0 });
  });
  var itemRevenue = 0, deliveryCount = 0;
  orders.forEach(function(o){
    o.items.forEach(function(it){
      var r = map.get(it.code);
      if(r){ r.units += it.qty; itemRevenue += it.qty * r.price; }
    });
    if(o.delivery) deliveryCount++;
  });
  var rows = [];
  map.forEach(function(r){
    rows.push({
      code: r.code, name: r.name, price: r.price, stock: r.stock,
      units: r.units, remaining: r.stock - r.units, itemRevenue: r.units * r.price
    });
  });
  return {
    rows: rows, customers: orders.length, deliveryCount: deliveryCount,
    deliveryFee: fee, threshold: threshold,
    itemRevenue: itemRevenue, revenue: itemRevenue + deliveryCount * fee
  };
}
/* ===== PURE:END ===== */

/* ---------------- Katalog bawaan (Dapur Bu Rini) ---------------- */
var DEFAULT_CATALOG = {
  store: { name: "Dapur Bu Rini", city: "Bandung", low_stock_threshold: 3, delivery_fee: 10000 },
  products: [
    { code:"BP",  name:"Bolu Pandan",        price:45000,  stock:20, aliases:["bolu pandan","bolpan","pandan"] },
    { code:"BC",  name:"Bolu Cokelat",       price:45000,  stock:20, aliases:["bolu coklat","bolu cokelat","bolcok"] },
    { code:"BRP", name:"Brownies Panggang",  price:55000,  stock:15, aliases:["brownies","brownis","brownies panggang","browni"] },
    { code:"BRK", name:"Brownies Kukus",     price:50000,  stock:12, aliases:["brownies kukus","brokus"] },
    { code:"NS",  name:"Nastar 500 g",       price:120000, stock:10, aliases:["nastar"] },
    { code:"KS",  name:"Kastengel 500 g",    price:130000, stock:8,  aliases:["kastengel","kastangel","kaastengel"] },
    { code:"PS",  name:"Putri Salju 500 g",  price:100000, stock:10, aliases:["putri salju","putsal"] },
    { code:"LL",  name:"Lapis Legit",        price:250000, stock:5,  aliases:["lapis legit","legit"] },
    { code:"RM",  name:"Risoles Mayo (isi 10)", price:35000, stock:30, aliases:["risol mayo","risoles","risol"] },
    { code:"PT",  name:"Pastel (isi 10)",   price:35000,  stock:25, aliases:["pastel"] },
    { code:"DG",  name:"Donat Gula (isi 6)", price:30000,  stock:20, aliases:["donat","donut"] },
    { code:"KSU", name:"Kue Sus (isi 10)",   price:40000,  stock:15, aliases:["sus","kue sus","soes"] }
  ]
};

/* ---------------- Aplikasi (DOM + localStorage) ---------------- */
var LS_KEY = "dapurBuRiniV1";
var state = { chatText: "", catalog: DEFAULT_CATALOG, parsed: null };

function $(id){ return document.getElementById(id); }
function rupiah(n){ return "Rp" + (n || 0).toLocaleString("id-ID"); }
function esc(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function prodByCode(code){
  var p = state.catalog.products.filter(function(x){ return x.code === code; })[0];
  return p || { code: code, name: code, price: 0 };
}

function saveState(){
  try{
    localStorage.setItem(LS_KEY, JSON.stringify({
      chatText: state.chatText,
      catalog: state.catalog === DEFAULT_CATALOG ? null : state.catalog
    }));
  }catch(e){ /* penyimpanan penuh / mode privat: abaikan */ }
}
function loadState(){
  try{
    var raw = localStorage.getItem(LS_KEY);
    if(!raw) return;
    var s = JSON.parse(raw);
    state.chatText = s.chatText || "";
    if(s.catalog && s.catalog.products) state.catalog = s.catalog;
  }catch(e){ /* data rusak: mulai dari awal */ }
}

function invoiceText(order){
  var lines = ["*DAPUR BU RINI — PESANAN*", "Nama: " + order.customer, ""];
  var sub = 0, i = 1;
  order.items.forEach(function(it){
    var p = prodByCode(it.code);
    sub += it.qty * p.price;
    lines.push(i + ". " + p.name + " x" + it.qty + " = " + rupiah(it.qty * p.price));
    i++;
  });
  var fee = order.delivery ? state.catalog.store.delivery_fee : 0;
  lines.push("");
  lines.push("Subtotal: " + rupiah(sub));
  lines.push("Ongkir" + (order.delivery ? " (diantar)" : "") + ": " + rupiah(fee));
  lines.push("*TOTAL: " + rupiah(sub + fee) + "*");
  lines.push("");
  lines.push("Terima kasih sudah pesan di Dapur Bu Rini 🙏");
  return lines.join("\n");
}

function render(){
  var res = state.parsed;
  $("result").hidden = !res;
  if(!res) return;

  var stats = computeStats(res.orders, state.catalog);

  /* --- catatan --- */
  var notes = [];
  if(res.unknown.length){
    notes.push('<div class="sect-title">Produk tidak ada di katalog</div><ul class="note-list">' +
      res.unknown.map(function(u){
        return '<li><span class="tag-unknown">' + esc(u.text) + '</span> — diminta oleh ' + esc(u.customer) + '</li>';
      }).join("") + '</ul>');
  }
  if(res.cancelled.length){
    notes.push('<div class="sect-title">Pesanan dibatalkan</div><ul class="note-list">' +
      res.cancelled.map(function(c){
        return '<li><span class="tag-cancel">' + esc(prodByCode(c.code).name) + ' x' + c.qty + '</span> — ' + esc(c.customer) + '</li>';
      }).join("") + '</ul>');
  }
  $("notesCard").hidden = notes.length === 0;
  $("notesBody").innerHTML = notes.join("");

  /* --- pesanan per pelanggan --- */
  var el = $("ordersList");
  if(res.orders.length === 0){
    el.innerHTML = '<p class="empty">Belum ada pesanan yang dikenali.</p>';
  } else {
    el.innerHTML = res.orders.map(function(o, oi){
      var sub = 0;
      var rows = o.items.map(function(it){
        var p = prodByCode(it.code);
        sub += it.qty * p.price;
        return "<tr><td>" + esc(p.name) + " <small style=\"color:var(--muted)\">×" + it.qty + "</small></td>" +
               '<td class="num">' + rupiah(it.qty * p.price) + "</td></tr>";
      }).join("");
      var fee = o.delivery ? state.catalog.store.delivery_fee : 0;
      return '<div class="cust" data-oi="' + oi + '">' +
        '<div class="cust-head"><span class="cust-name">' + esc(o.customer) + "</span>" +
        '<span class="badge ' + (o.delivery ? "antar" : "ambil") + '">' + (o.delivery ? "🛵 DIANTAR" : "🏃 AMBIL SENDIRI") + "</span></div>" +
        '<table class="items">' + rows + "</table>" +
        '<div class="totrow"><span>Subtotal</span><span>' + rupiah(sub) + "</span></div>" +
        (o.delivery ? '<div class="totrow"><span>Ongkir</span><span>' + rupiah(fee) + "</span></div>" : "") +
        '<div class="totrow grand"><span>Total</span><span>' + rupiah(sub + fee) + "</span></div>" +
        '<div class="btnrow">' +
          '<button class="small" data-act="print" data-oi="' + oi + '">🖨️ Cetak Struk</button>' +
          '<button class="small" data-act="copy" data-oi="' + oi + '">📋 Salin untuk WhatsApp</button>' +
        "</div></div>";
    }).join("");
  }

  /* --- stok --- */
  var sl = $("stockList");
  sl.innerHTML = stats.rows.map(function(r){
    var pct = Math.max(0, Math.min(100, r.remaining > 0 ? (r.remaining / r.stock) * 100 : 0));
    var cls = r.remaining < 0 ? "over" : (r.remaining <= stats.threshold ? "low" : "");
    var sisa = r.remaining < 0
      ? '<span style="color:var(--bad)">kelebihan ' + (-r.remaining) + "</span>"
      : r.remaining;
    return '<div class="stock-row">' +
      '<div class="stock-name">' + esc(r.name) + "<small>" + r.code + " • " + rupiah(r.price) + " • terpesan " + r.units + "</small></div>" +
      '<div class="bar"><i class="' + cls + '" style="width:' + pct + '%"></i></div>' +
      '<div class="stock-qty">sisa ' + sisa + "/" + r.stock + "</div></div>";
  }).join("");
  var warns = [];
  stats.rows.forEach(function(r){
    if(r.remaining < 0){
      warns.push('<div class="warnline over">⚠️ ' + esc(r.name) + " melebihi stok (oversold " + (-r.remaining) + ") — konfirmasi ulang ke pembeli!</div>");
    } else if(r.remaining === 0){
      warns.push('<div class="warnline low">🚫 ' + esc(r.name) + " sudah habis (0 tersisa).</div>");
    } else if(r.remaining <= stats.threshold){
      warns.push('<div class="warnline low">⚠️ ' + esc(r.name) + " tinggal " + r.remaining + " (stok rendah, batas " + stats.threshold + ").</div>");
    }
  });
  sl.innerHTML += warns.length ? warns.join("") : '<div class="warnline ok">✅ Semua stok aman.</div>';

  /* --- ringkasan --- */
  var totalUnits = stats.rows.reduce(function(a, r){ return a + r.units; }, 0);
  $("summaryBox").innerHTML =
    '<div class="sumgrid">' +
    '<div class="sumbox"><b>' + stats.customers + "</b><span>pelanggan</span></div>" +
    '<div class="sumbox"><b>' + totalUnits + "</b><span>unit terjual</span></div>" +
    '<div class="sumbox"><b>' + stats.deliveryCount + "</b><span>pengantaran</span></div>" +
    '<div class="sumbox"><b>' + rupiah(stats.revenue) + "</b><span>total pendapatan</span></div>" +
    "</div>" +
    '<table class="items">' + stats.rows.map(function(r){
      return "<tr><td>" + esc(r.name) + "</td><td class=\"num\">" + r.units + " unit • " + rupiah(r.itemRevenue) + "</td></tr>";
    }).join("") + "</table>";
}

function process(){
  var txt = $("chatInput").value;
  state.chatText = txt;
  state.parsed = txt.trim() ? parseChats(txt, state.catalog) : null;
  saveState();
  render();
  if(!state.parsed) alert("Tempel dulu chat WhatsApp-nya, ya Bu.");
}

function printInvoice(oi){
  var o = state.parsed.orders[oi];
  var p = state.catalog.store;
  var sub = 0;
  var rows = o.items.map(function(it, i){
    var pr = prodByCode(it.code);
    sub += it.qty * pr.price;
    return "<tr><td>" + (i+1) + ". " + esc(pr.name) + " x" + it.qty + "</td><td class=\"num\">" + rupiah(it.qty * pr.price) + "</td></tr>";
  }).join("");
  var fee = o.delivery ? p.delivery_fee : 0;
  $("print-area").innerHTML =
    "<h1>DAPUR BU RINI</h1>" +
    '<div class="sub">Jajanan &amp; kue rumahan — ' + esc(p.city || "Bandung") + "</div>" +
    "<div><b>Pelanggan:</b> " + esc(o.customer) + "</div>" +
    "<div><b>Pengiriman:</b> " + (o.delivery ? "Diantar (+" + rupiah(fee) + ")" : "Ambil sendiri") + "</div>" +
    "<table>" + rows + "</table>" +
    '<div class="tot">Subtotal: ' + rupiah(sub) + "<br>Ongkir: " + rupiah(fee) + "</div>" +
    '<div class="tot grand">TOTAL: ' + rupiah(sub + fee) + "</div>" +
    '<div class="thanks">Terima kasih sudah pesan 🙏</div>';
  window.print();
}

function copyInvoice(oi, btn){
  var text = invoiceText(state.parsed.orders[oi]);
  function done(){
    var old = btn.textContent;
    btn.textContent = "✅ Tersalin!";
    setTimeout(function(){ btn.textContent = old; }, 1600);
  }
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done, function(){ fallbackCopy(text, done); });
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done){
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand("copy"); done(); }catch(e){ alert("Gagal menyalin — salin manual dari struk cetak."); }
  document.body.removeChild(ta);
}

function csvCell(v){
  v = String(v);
  return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
}
function downloadCsv(){
  if(!state.parsed) return;
  var res = state.parsed, cat = state.catalog;
  var stats = computeStats(res.orders, cat);
  var L = [];
  L.push("Ringkasan Harian Dapur Bu Rini");
  L.push("");
  L.push("PRODUK");
  L.push(["kode","nama","harga","stok_awal","terpesan","sisa","pendapatan_produk"].map(csvCell).join(","));
  stats.rows.forEach(function(r){
    L.push([r.code, r.name, r.price, r.stock, r.units, r.remaining, r.itemRevenue].map(csvCell).join(","));
  });
  L.push("");
  L.push("PELANGGAN");
  L.push(["pelanggan","pesanan","subtotal","ongkir","total","pengiriman"].map(csvCell).join(","));
  res.orders.forEach(function(o){
    var sub = 0;
    var desc = o.items.map(function(it){
      var p = prodByCode(it.code);
      sub += it.qty * p.price;
      return p.name + " x" + it.qty;
    }).join("; ");
    var fee = o.delivery ? cat.store.delivery_fee : 0;
    L.push([o.customer, desc, sub, fee, sub + fee, o.delivery ? "diantar" : "ambil sendiri"].map(csvCell).join(","));
  });
  L.push("");
  L.push("TIDAK ADA DI KATALOG");
  L.push(["pelanggan","produk_diminta"].map(csvCell).join(","));
  res.unknown.forEach(function(u){ L.push([u.customer, u.text].map(csvCell).join(",")); });
  L.push("");
  L.push("DIBATALKAN");
  L.push(["pelanggan","produk","jumlah"].map(csvCell).join(","));
  res.cancelled.forEach(function(c){ L.push([c.customer, prodByCode(c.code).name, c.qty].map(csvCell).join(",")); });
  L.push("");
  L.push(["pelanggan", stats.customers].map(csvCell).join(","));
  L.push(["total_pendapatan", stats.revenue].map(csvCell).join(","));
  L.push(["pengantaran", stats.deliveryCount].map(csvCell).join(","));

  var blob = new Blob(["\uFEFF" + L.join("\r\n")], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ringkasan-dapur-bu-rini.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(a.href); }, 5000);
}

function showCatalogChips(){
  var s = state.catalog.store || {};
  $("catalogChips").innerHTML =
    '<span class="chip">' + state.catalog.products.length + " produk</span>" +
    '<span class="chip">Ongkir ' + rupiah(s.delivery_fee) + "</span>" +
    '<span class="chip">Batas stok rendah: ' + (s.low_stock_threshold != null ? s.low_stock_threshold : 3) + "</span>";
}

/* ---- wiring ---- */
$("btnProcess").addEventListener("click", process);
$("btnClear").addEventListener("click", function(){
  if(!confirm("Bersihkan chat dan hasil pesanan yang tersimpan?")) return;
  state.chatText = ""; state.parsed = null;
  try{ localStorage.removeItem(LS_KEY); }catch(e){}
  $("chatInput").value = "";
  render();
});
$("btnCsv").addEventListener("click", downloadCsv);
$("ordersList").addEventListener("click", function(e){
  var b = e.target.closest("button[data-act]");
  if(!b) return;
  var oi = parseInt(b.getAttribute("data-oi"), 10);
  if(b.getAttribute("data-act") === "print") printInvoice(oi);
  else copyInvoice(oi, b);
});
$("fileInput").addEventListener("change", function(e){
  var f = e.target.files && e.target.files[0];
  if(!f) return;
  var r = new FileReader();
  r.onload = function(){
    var txt = String(r.result || "");
    try{
      var j = JSON.parse(txt);
      if(j && Array.isArray(j.products)){
        state.catalog = j;
        showCatalogChips();
        process();
        return;
      }
    }catch(err){ /* bukan JSON: anggap teks chat */ }
    $("chatInput").value = txt;
    process();
  };
  r.readAsText(f);
  e.target.value = "";
});

/* ekspor untuk pengujian otomatis */
window.parseChats = parseChats;
window.computeStats = computeStats;

/* init */
loadState();
$("chatInput").value = state.chatText;
showCatalogChips();
if(state.chatText.trim()) process(); else render();
