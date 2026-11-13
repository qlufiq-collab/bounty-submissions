#!/usr/bin/env python3
"""Build the SMB test set: catalog, a WhatsApp chat export (40 messages) and the answer key.
Every message carries a hand-written intent; totals, final stock and warnings are computed from those intents."""
import json
from pathlib import Path

OUT = Path(__file__).resolve().parent / "source"
OUT.mkdir(parents=True, exist_ok=True)

STORE = {"name": "Dapur Bu Rini", "city": "Bandung", "note": "fictional home bakery for the demo",
         "low_stock_threshold": 3, "delivery_fee": 10000}

CATALOG = [
    # code, name, price, stock, aliases
    ("BP", "Bolu Pandan", 45000, 20, ["bolu pandan", "bolpan", "pandan"]),
    ("BC", "Bolu Cokelat", 45000, 20, ["bolu coklat", "bolu cokelat", "bolcok"]),
    ("BRP", "Brownies Panggang", 55000, 15, ["brownies", "brownis", "brownies panggang", "browni"]),
    ("BRK", "Brownies Kukus", 50000, 12, ["brownies kukus", "brokus"]),
    ("NS", "Nastar 500 g", 120000, 10, ["nastar"]),
    ("KS", "Kastengel 500 g", 130000, 8, ["kastengel", "kastangel", "kaastengel"]),
    ("PS", "Putri Salju 500 g", 100000, 10, ["putri salju", "putsal"]),
    ("LL", "Lapis Legit", 250000, 5, ["lapis legit", "legit"]),
    ("RM", "Risoles Mayo (isi 10)", 35000, 30, ["risol mayo", "risoles", "risol"]),
    ("PT", "Pastel (isi 10)", 35000, 25, ["pastel"]),
    ("DG", "Donat Gula (isi 6)", 30000, 20, ["donat", "donut"]),
    ("KSU", "Kue Sus (isi 10)", 40000, 15, ["sus", "kue sus", "soes"]),
]

# (time, sender, text, intent)
# intent: {"type": "order", "items": {code: qty}, "delivery": bool}
#         {"type": "change", "set": {code: qty}}        -> sets the customer's qty for that code (0 = remove)
#         {"type": "cancel_all"} | {"type": "none", "why": ...} | {"type": "unknown_product", "what": ...}
M = [
    ("07.58", "Bu Ani", "Pagi bu Rini, pesen bolu pandan 2 sama brownis 1 ya, diambil sore", {"type": "order", "items": {"BP": 2, "BRP": 1}}),
    ("08.03", "Pak Dedi", "bu nastar 2 toples, kastengel 1. dianter ke kantor ya", {"type": "order", "items": {"NS": 2, "KS": 1}, "delivery": True}),
    ("08.05", "Sinta", "Kak mau risol mayo 3 kotak + pastel 2", {"type": "order", "items": {"RM": 3, "PT": 2}}),
    ("08.11", "Bu Ani", "makasih bu 🙏", {"type": "none", "why": "thanks"}),
    ("08.14", "Rudi", "ada bika ambon ga bu?", {"type": "unknown_product", "what": "bika ambon"}),
    ("08.20", "Mega", "Bu, lapis legit 2 ya buat arisan sabtu", {"type": "order", "items": {"LL": 2}}),
    ("08.26", "Pak Dedi", "eh bu nastarnya jadi 3 aja", {"type": "change", "set": {"NS": 3}}),
    ("08.31", "Yuni", "donat dua, kue sus satu", {"type": "order", "items": {"DG": 2, "KSU": 1}}),
    ("08.40", "Hendra", "bolcok 1 brokus 1 putsal 1", {"type": "order", "items": {"BC": 1, "BRK": 1, "PS": 1}}),
    ("08.44", "Sinta", "udah transfer ya kak", {"type": "none", "why": "payment notice"}),
    ("08.52", "Rina", "Bu Rini saya pesan kastangel 2, nastar 1, putri salju 1. Antar ke Jl. Dago ya", {"type": "order", "items": {"KS": 2, "NS": 1, "PS": 1}, "delivery": True}),
    ("09.01", "Mega", "bu maaf lapis legitnya 1 aja ternyata", {"type": "change", "set": {"LL": 1}}),
    ("09.07", "Fajar", "Brownies panggang 3, brownies kukus 2", {"type": "order", "items": {"BRP": 3, "BRK": 2}}),
    ("09.15", "Lia", "jam brp bisa diambil bu?", {"type": "none", "why": "question"}),
    ("09.18", "Tono", "pesen risoles 5 kotak buat kantor, sama pastel 5", {"type": "order", "items": {"RM": 5, "PT": 5}}),
    ("09.26", "Yuni", "bu donatnya tambah 1 lagi ya jadi 3", {"type": "change", "set": {"DG": 3}}),
    ("09.33", "Bu Wati", "Lapis legit 3 ya bu", {"type": "order", "items": {"LL": 3}}),
    ("09.40", "Hendra", "maaf bu putri saljunya batal", {"type": "change", "set": {"PS": 0}}),
    ("09.47", "Dewi", "bolu pandan 4, bolu coklat 4", {"type": "order", "items": {"BP": 4, "BC": 4}}),
    ("09.55", "Rudi", "oke deh bu kalau gitu bolu pandan 1 aja", {"type": "order", "items": {"BP": 1}}),
    ("10.02", "Andi", "kue sus 3, donut 2. kirim ke rumah ya bu", {"type": "order", "items": {"KSU": 3, "DG": 2}, "delivery": True}),
    ("10.10", "Lia", "oke bu nanti sore saya ambil", {"type": "none", "why": "pickup info"}),
    ("10.16", "Siska", "kaastengel 1, nastar 1", {"type": "order", "items": {"KS": 1, "NS": 1}}),
    ("10.22", "Tono", "bu pastelnya kurangin jadi 4 ya", {"type": "change", "set": {"PT": 4}}),
    ("10.30", "Bayu", "brownis 2 + bolu pandan 2 + risol 2", {"type": "order", "items": {"BRP": 2, "BP": 2, "RM": 2}}),
    ("10.38", "Fajar", "sudah tf ya bu, total brp?", {"type": "none", "why": "payment/question"}),
    ("10.45", "Nur", "pesan lapis legit 1", {"type": "order", "items": {"LL": 1}}),
    ("10.51", "Siska", "maaf bu semua pesanan saya batal dulu ya", {"type": "cancel_all"}),
    ("11.03", "Gilang", "soes 4 sama donat 3", {"type": "order", "items": {"KSU": 4, "DG": 3}}),
    ("11.10", "Rina", "bu nastarnya tambah 1 ya jd 2", {"type": "change", "set": {"NS": 2}}),
    ("11.18", "Putri", "Mau putri salju 2 dan nastar 2", {"type": "order", "items": {"PS": 2, "NS": 2}}),
    ("11.25", "Bu Ani", "bu sekalian kue sus 1 ya", {"type": "order", "items": {"KSU": 1}}),
    ("11.31", "Joko", "ada kue lumpur bu?", {"type": "unknown_product", "what": "kue lumpur"}),
    ("11.40", "Dewi", "bolu coklatnya jadi 2 aja bu", {"type": "change", "set": {"BC": 2}}),
    ("11.48", "Wulan", "risol mayo 10 kotak ya bu buat acara kantor, diantar", {"type": "order", "items": {"RM": 10}, "delivery": True}),
    ("11.55", "Gilang", "makasih bu", {"type": "none", "why": "thanks"}),
    ("12.03", "Arif", "kastengel 4", {"type": "order", "items": {"KS": 4}}),
    ("12.10", "Bayu", "eh brownisnya 1 aja bu", {"type": "change", "set": {"BRP": 1}}),
    ("12.18", "Maya", "nastar 2, kastengel 2, putri salju 2", {"type": "order", "items": {"NS": 2, "KS": 2, "PS": 2}}),
    ("12.25", "Rudi", "transfer udah ya bu", {"type": "none", "why": "payment notice"}),
]
assert len(M) == 40

cat = {c: {"code": c, "name": n, "price": p, "stock": s, "aliases": a} for c, n, p, s, a in CATALOG}
DATE = "13/11/26"
chat = "\n".join(f"[{DATE} {t}] {who}: {txt}" for t, who, txt, _ in M) + "\n"

orders = {}      # customer -> {code: qty}
delivery = {}
first_seen = {}
for t, who, txt, it in M:
    if it["type"] == "order":
        o = orders.setdefault(who, {})
        for c, q in it["items"].items():
            o[c] = o.get(c, 0) + q
        first_seen.setdefault(who, t)
        if it.get("delivery"):
            delivery[who] = True
    elif it["type"] == "change":
        o = orders.setdefault(who, {})
        for c, q in it["set"].items():
            if q == 0:
                o.pop(c, None)
            else:
                o[c] = q
    elif it["type"] == "cancel_all":
        orders[who] = {}

orders = {k: v for k, v in orders.items() if v}
demand = {}
for o in orders.values():
    for c, q in o.items():
        demand[c] = demand.get(c, 0) + q
stock_after = {c: cat[c]["stock"] - demand.get(c, 0) for c in cat}

customers = []
for who in sorted(orders, key=lambda w: first_seen[w]):
    items = [{"code": c, "name": cat[c]["name"], "qty": q, "unit_price": cat[c]["price"], "line_total": q * cat[c]["price"]}
             for c, q in orders[who].items()]
    sub = sum(i["line_total"] for i in items)
    fee = STORE["delivery_fee"] if delivery.get(who) else 0
    customers.append({"customer": who, "items": items, "subtotal": sub, "delivery": bool(delivery.get(who)),
                      "delivery_fee": fee, "total": sub + fee})

key = {
    "store": STORE,
    "messages": len(M),
    "message_labels": [{"time": t, "sender": who, "type": it["type"]} for t, who, _, it in M],
    "customers_with_orders": len(customers),
    "orders": customers,
    "units_by_product": {c: demand.get(c, 0) for c in cat},
    "stock_after": stock_after,
    "oversold": {c: -v for c, v in stock_after.items() if v < 0},
    "low_stock": {c: v for c, v in stock_after.items() if 0 <= v <= STORE["low_stock_threshold"]},
    "unknown_products": [it["what"] for *_, it in M if it["type"] == "unknown_product"],
    "cancelled_customers": [who for _, who, _, it in M if it["type"] == "cancel_all"],
    "grand_total": sum(c["total"] for c in customers),
    "revenue_items": sum(c["subtotal"] for c in customers),
}
(OUT / "catalog.json").write_text(json.dumps({"store": STORE, "products": list(cat.values())}, ensure_ascii=False, indent=1))
(OUT / "chats.txt").write_text(chat)
(OUT / "answer_key.json").write_text(json.dumps(key, ensure_ascii=False, indent=1))
print("customers", len(customers), "grand_total", key["grand_total"], "oversold", key["oversold"], "low", key["low_stock"])
for c in customers:
    print(f"  {c['customer']:9} {', '.join(f'{i['code']}x{i['qty']}' for i in c['items']):40} total {c['total']:>9,}")
