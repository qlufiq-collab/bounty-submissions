#!/usr/bin/env python3
"""Holdout test set (never shown to AutoClaw): 30 new messages, new customers, new phrasings.
Same catalog. Intents are hand-labelled; the key is computed from them. Writes source/holdout_chats.txt + holdout_key.json."""
import json
from pathlib import Path

R = Path(__file__).resolve().parent
cat = {p["code"]: p for p in json.loads((R / "source/catalog.json").read_text())["products"]}
store = json.loads((R / "source/catalog.json").read_text())["store"]

# intent types: order(items, delivery) | set(code->qty, 0=remove) | add(code->delta) | cancel_all | none | unknown_product
M = [
    ("14.02", "Intan", "Bolu Pandan x2, Nastar x1", {"type": "order", "items": {"BP": 2, "NS": 1}}),
    ("14.05", "Pak Harun", "order 3x risol mayo sm 2x pastel ya bu", {"type": "order", "items": {"RM": 3, "PT": 2}}),
    ("14.09", "Citra", "Halo bu, saya mau pesan BROWNIES KUKUS 2 dan Bolu Cokelat 1", {"type": "order", "items": {"BRK": 2, "BC": 1}}),
    ("14.12", "Intan", "nastarnya tambah 2 lagi ya bu", {"type": "add", "add": {"NS": 2}}),
    ("14.15", "Doni", "ada kue cubit bu?", {"type": "unknown_product", "what": "kue cubit"}),
    ("14.18", "Lestari", "minta putri salju tiga sama kastengel satu, tolong diantar", {"type": "order", "items": {"PS": 3, "KS": 1}, "delivery": True}),
    ("14.22", "Pak Harun", "pastelnya ga jadi bu", {"type": "set", "set": {"PT": 0}}),
    ("14.25", "Wawan", "donat 4 kotak", {"type": "order", "items": {"DG": 4}}),
    ("14.29", "Citra", "oke makasih banyak bu", {"type": "none"}),
    ("14.33", "Ratna", "kue sus 2, risoles 1, bolu pandan 1", {"type": "order", "items": {"KSU": 2, "RM": 1, "BP": 1}}),
    ("14.36", "Doni", "yaudah brownies panggang 1 aja", {"type": "order", "items": {"BRP": 1}}),
    ("14.40", "Wawan", "eh donatnya ganti jadi 2 aja", {"type": "set", "set": {"DG": 2}}),
    ("14.44", "Agus", "lapis legit 1, nastar 2", {"type": "order", "items": {"LL": 1, "NS": 2}}),
    ("14.47", "Lestari", "bu bukti transfer sudah saya kirim", {"type": "none"}),
    ("14.50", "Bella", "pesan bolcok 2 sama bolpan 2, kirim ke kos ya", {"type": "order", "items": {"BC": 2, "BP": 2}, "delivery": True}),
    ("14.54", "Ratna", "cancel ya bu semua pesanan saya, maaf", {"type": "cancel_all"}),
    ("14.58", "Agus", "lapis legitnya tambah 1", {"type": "add", "add": {"LL": 1}}),
    ("15.02", "Hana", "mau tanya bu, brownies kukus masih ada?", {"type": "none"}),
    ("15.05", "Hana", "kalau gitu brokus 3", {"type": "order", "items": {"BRK": 3}}),
    ("15.09", "Pak Harun", "risolnya jadi 5 ya bu", {"type": "set", "set": {"RM": 5}}),
    ("15.12", "Yoga", "soes 2 + donut 1 + pastel 3", {"type": "order", "items": {"KSU": 2, "DG": 1, "PT": 3}}),
    ("15.16", "Bella", "makasih bu rini", {"type": "none"}),
    ("15.20", "Fitri", "kastangel 2", {"type": "order", "items": {"KS": 2}}),
    ("15.24", "Yoga", "bu pastelnya kurangi 1", {"type": "add", "add": {"PT": -1}}),
    ("15.27", "Rizky", "ada bolu gulung?", {"type": "unknown_product", "what": "bolu gulung"}),
    ("15.31", "Intan", "bolu pandannya ga jadi ya bu, nastar aja", {"type": "set", "set": {"BP": 0}}),
    ("15.35", "Fitri", "eh kastengelnya 3 deh", {"type": "set", "set": {"KS": 3}}),
    ("15.39", "Sari", "Putri Salju 1, Nastar 1, Kastengel 1 — antar ya", {"type": "order", "items": {"PS": 1, "NS": 1, "KS": 1}, "delivery": True}),
    ("15.43", "Hana", "udah tf bu", {"type": "none"}),
    ("15.47", "Rizky", "yaudah donat 1 aja bu", {"type": "order", "items": {"DG": 1}}),
]
assert len(M) == 30

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
(R / "source/holdout_chats.txt").write_text("\n".join(f"[13/11/26 {t}] {w}: {x}" for t, w, x, _ in M) + "\n")
(R / "source/holdout_key.json").write_text(json.dumps(key, ensure_ascii=False, indent=1))
print("customers", len(out), "grand_total", key["grand_total"])
for o in out:
    print(f"  {o['customer']:9} {', '.join(f'{i['code']}x{i['qty']}' for i in o['items']):30} {o['total']:>9,}")
