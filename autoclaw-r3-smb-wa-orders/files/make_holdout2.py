#!/usr/bin/env python3
"""Second holdout (written after the manual fix, never used for development): 25 messages, new customers, new phrasings.
Same catalog. Intents are hand-labelled; the key is computed from them. Writes source/holdout2_chats.txt + holdout2_key.json."""
import json
from pathlib import Path

R = Path(__file__).resolve().parent
cat = {p["code"]: p for p in json.loads((R / "source/catalog.json").read_text())["products"]}
store = json.loads((R / "source/catalog.json").read_text())["store"]

# intent types: order(items, delivery) | set(code->qty, 0=remove) | add(code->delta) | cancel_all | none | unknown_product
M = [
    ("16.01", "Nadia", "boleh pesan nastar dua toples sama kastengel satu", {"type": "order", "items": {"NS": 2, "KS": 1}}),
    ("16.04", "Pak Yusuf", "saya ambil 2 brownies panggang + 1 bolu cokelat", {"type": "order", "items": {"BRP": 2, "BC": 1}}),
    ("16.08", "Tari", "Kue Sus 2, Donat Gula 2. Tolong anterin ya", {"type": "order", "items": {"KSU": 2, "DG": 2}, "delivery": True}),
    ("16.11", "Nadia", "+1 nastar ya bu", {"type": "add", "add": {"NS": 1}}),
    ("16.15", "Bimo", "pesen risol 4 sama pastel 4", {"type": "order", "items": {"RM": 4, "PT": 4}}),
    ("16.19", "Pak Yusuf", "tolong cancel bolu cokelatnya", {"type": "set", "set": {"BC": 0}}),
    ("16.22", "Laras", "ada nastar keju bu?", {"type": "none"}),
    ("16.25", "Laras", "oke nastar 1 aja kalau gitu", {"type": "order", "items": {"NS": 1}}),
    ("16.29", "Bimo", "pastelnya ga usah deh bu", {"type": "set", "set": {"PT": 0}}),
    ("16.33", "Rani", "lapis legit 2 sama putri salju 1", {"type": "order", "items": {"LL": 2, "PS": 1}}),
    ("16.36", "Tari", "makasih ya bu 😊", {"type": "none"}),
    ("16.40", "Eko", "brownies kukus 2", {"type": "order", "items": {"BRK": 2}}),
    ("16.44", "Rani", "lapis legitnya jadi 1 bu", {"type": "set", "set": {"LL": 1}}),
    ("16.47", "Eko", "tambahin 1 bolu pandan ya", {"type": "add", "add": {"BP": 1}}),
    ("16.51", "Dina", "bolu pandan 2", {"type": "order", "items": {"BP": 2}}),
    ("16.55", "Dina", "eh ganti bolu pandannya jadi bolu cokelat ya bu, jumlahnya sama", {"type": "swap", "from": "BP", "to": "BC"}),
    ("16.58", "Fikri", "ada martabak bu?", {"type": "unknown_product", "what": "martabak"}),
    ("17.02", "Bimo", "risolnya kurangi 2", {"type": "add", "add": {"RM": -2}}),
    ("17.06", "Sekar", "kastengel 1, nastar 1, putri salju 1, antar ke Cimahi", {"type": "order", "items": {"KS": 1, "NS": 1, "PS": 1}, "delivery": True}),
    ("17.10", "Nadia", "udah transfer bu", {"type": "none"}),
    ("17.13", "Sekar", "batalin yg putri salju ya", {"type": "set", "set": {"PS": 0}}),
    ("17.17", "Galih", "donat 2 kotak, kue sus 1 kotak", {"type": "order", "items": {"DG": 2, "KSU": 1}}),
    ("17.21", "Eko", "maaf bu ga jadi pesen semuanya ya", {"type": "cancel_all"}),
    ("17.25", "Galih", "donatnya 3 aja deh", {"type": "set", "set": {"DG": 3}}),
    ("17.29", "Fikri", "yaudah brownis 1", {"type": "order", "items": {"BRP": 1}}),
]
assert len(M) == 25

orders, delivery, first = {}, {}, {}
for t, who, txt, it in M:
    o = orders.setdefault(who, {})
    if it["type"] == "order":
        for c, q in it["items"].items():
            o[c] = o.get(c, 0) + q
        first.setdefault(who, t)
        if it.get("delivery"):
            delivery[who] = True
    elif it["type"] == "set":
        for c, q in it["set"].items():
            if q == 0:
                o.pop(c, None)
            else:
                o[c] = q
    elif it["type"] == "add":
        for c, d in it["add"].items():
            o[c] = o.get(c, 0) + d
            if o[c] <= 0:
                o.pop(c)
    elif it["type"] == "swap":
        q = o.pop(it["from"], 0)
        if q:
            o[it["to"]] = o.get(it["to"], 0) + q
    elif it["type"] == "cancel_all":
        orders[who] = {}
orders = {k: v for k, v in orders.items() if v}
demand = {}
for o in orders.values():
    for c, q in o.items():
        demand[c] = demand.get(c, 0) + q
out = []
for who in sorted(orders, key=lambda w: first[w]):
    items = [{"code": c, "qty": q} for c, q in orders[who].items()]
    sub = sum(cat[c]["price"] * q for c, q in orders[who].items())
    fee = store["delivery_fee"] if delivery.get(who) else 0
    out.append({"customer": who, "items": items, "delivery": bool(delivery.get(who)), "total": sub + fee})
key = {"messages": len(M), "orders": out,
       "stock_after": {c: cat[c]["stock"] - demand.get(c, 0) for c in cat},
       "unknown_products": [it["what"] for *_, it in M if it["type"] == "unknown_product"],
       "cancelled_customers": [w for _, w, _, it in M if it["type"] == "cancel_all"],
       "grand_total": sum(o["total"] for o in out),
       "phrasings_new": ["x2 / 3x", "ALL CAPS", "tambah 2 lagi (relative)", "kurangi 1 (relative)", "ga jadi", "cancel", "ganti jadi", "minta", "order", "—"]}
(R / "source/holdout2_chats.txt").write_text("\n".join(f"[14/11/26 {t}] {w}: {x}" for t, w, x, _ in M) + "\n")
(R / "source/holdout2_key.json").write_text(json.dumps(key, ensure_ascii=False, indent=1))
print("customers", len(out), "grand_total", key["grand_total"])
for o in out:
    print(f"  {o['customer']:9} {', '.join(f'{i['code']}x{i['qty']}' for i in o['items']):30} {o['total']:>9,}")
