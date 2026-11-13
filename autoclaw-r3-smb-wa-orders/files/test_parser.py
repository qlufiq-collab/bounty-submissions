#!/usr/bin/env python3
"""Score the AutoClaw-built tool against the hand-written answer key.

usage: test_parser.py APP_DIR [--label NAME]
Serves APP_DIR (index.html) + source/ on localhost, calls window.parseChats(chats, catalog) in headless Chromium
(poidh/tools/pageshot.py --probe), and compares with source/answer_key.json. Writes results/<label>.json."""
import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

R = Path(__file__).resolve().parent
PAGESHOT = os.environ.get("PAGESHOT", "pageshot.py")  # any script: URL OUT.png --probe JS -> JSON with "probe"

ap = argparse.ArgumentParser()
ap.add_argument("app")
ap.add_argument("--label", default="run")
ap.add_argument("--set", default="main", choices=["main", "holdout", "holdout2"])
a = ap.parse_args()

tmp = Path(tempfile.mkdtemp(prefix="smbtest_"))
shutil.copytree(a.app, tmp / "app")
shutil.copytree(R / "source", tmp / "app" / "_src")
for k in ("answer_key.json", "holdout_key.json", "holdout2_key.json"):
    (tmp / "app" / "_src" / k).unlink()                      # the page never sees the keys
CHATS = {"main": "chats.txt", "holdout": "holdout_chats.txt", "holdout2": "holdout2_chats.txt"}[a.set]
KEY = {"main": "answer_key.json", "holdout": "holdout_key.json", "holdout2": "holdout2_key.json"}[a.set]

srv = ThreadingHTTPServer(("127.0.0.1", 0), partial(SimpleHTTPRequestHandler, directory=str(tmp / "app")))
srv.RequestHandlerClass.log_message = lambda *x: None
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{srv.server_address[1]}/index.html"

probe = (r"""(async()=>{const CHATS_NAME=%s;const chats=await (await fetch('_src/'+CHATS_NAME)).text();const cat=await (await fetch('_src/catalog.json')).json();
if(typeof window.parseChats!=='function')return {error:'no window.parseChats'};
let r;try{r=window.parseChats(chats,cat)}catch(e){return {error:String(e)}};
try{r=await r}catch(e){};return JSON.parse(JSON.stringify(r))})()""" % json.dumps(CHATS))
out = subprocess.run([sys.executable, PAGESHOT, url, str(tmp / "shot.png"), "--wait", "4", "--probe", probe],
                     capture_output=True, text=True, timeout=180)
srv.shutdown()
rep = json.loads(out.stdout[out.stdout.index("{"):])
got = rep.get("probe") or {}
if not isinstance(got, dict) or got.get("error"):
    print("PROBE ERROR:", got, rep.get("errors"))
    sys.exit(1)

key = json.loads((R / "source" / KEY).read_text())
cat = {p["code"]: p for p in json.loads((R / "source/catalog.json").read_text())["products"]}
store = json.loads((R / "source/catalog.json").read_text())["store"]


def norm_orders(lst):
    o = {}
    for x in lst or []:
        items = {}
        for it in x.get("items", []):
            c = it.get("code")
            q = int(it.get("qty", 0) or 0)
            if c and q > 0:
                items[c] = items.get(c, 0) + q
        if items:
            o[x.get("customer", "").strip()] = {"items": items, "delivery": bool(x.get("delivery"))}
    return o


exp = {o["customer"]: {"items": {i["code"]: i["qty"] for i in o["items"]}, "delivery": o["delivery"]} for o in key["orders"]}
g = norm_orders(got.get("orders"))

exp_lines = {(c, k, v) for c, o in exp.items() for k, v in o["items"].items()}
got_lines = {(c, k, v) for c, o in g.items() for k, v in o["items"].items()}
tp = len(exp_lines & got_lines)
orders_exact = sum(1 for c in exp if c in g and g[c]["items"] == exp[c]["items"])
deliv_ok = sum(1 for c in exp if c in g and g[c]["delivery"] == exp[c]["delivery"])


def totals(o):
    t = 0
    for c, x in o.items():
        t += sum(cat[k]["price"] * v for k, v in x["items"].items() if k in cat) + (store["delivery_fee"] if x["delivery"] else 0)
    return t


def stock(o):
    s = {k: cat[k]["stock"] for k in cat}
    for x in o.values():
        for k, v in x["items"].items():
            if k in s:
                s[k] -= v
    return s


st_g, st_e = stock(g), key["stock_after"]
res = {
    "label": a.label, "set": a.set,
    "customers_expected": len(exp), "customers_found": len(g),
    "orders_exact": f"{orders_exact}/{len(exp)}",
    "item_lines_correct": f"{tp}/{len(exp_lines)}", "item_lines_extra": len(got_lines - exp_lines),
    "delivery_flags_correct": f"{deliv_ok}/{len(exp)}",
    "stock_after_correct": f"{sum(1 for k in st_e if st_g[k] == st_e[k])}/{len(st_e)}",
    "grand_total_expected": key["grand_total"], "grand_total_from_parse": totals(g),
    "unknown_expected": key["unknown_products"], "unknown_found": got.get("unknown"),
    "cancelled_expected": key["cancelled_customers"], "cancelled_found": got.get("cancelled"),
    "mismatches": {c: {"expected": exp.get(c), "got": g.get(c)} for c in sorted(set(exp) | set(g)) if exp.get(c) != g.get(c)},
    "console_errors": rep.get("errors"),
}
(R / "results").mkdir(exist_ok=True)
(R / "results" / f"{a.label}.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
for k, v in res.items():
    if k != "mismatches":
        print(f"{k}: {v}")
print("mismatches:", json.dumps(res["mismatches"], ensure_ascii=False, indent=1)[:3000])
shutil.rmtree(tmp, ignore_errors=True)
