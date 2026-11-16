#!/usr/bin/env python3
"""Merge ClaimCreated from Blockscout v2 logs + rotating-RPC logs -> data/claims.json; bounties -> data/bounties.json"""
import json
D = "data/"
def dec_str(data, off):
    n = int(data[off*2:off*2+64], 16); s = bytes.fromhex(data[off*2+64: off*2+64+n*2]); return s.decode("utf-8", "replace")
def dec_claim_data(h):
    d = h[2:]; w = lambda i: d[i*64:(i+1)*64]
    bountyIssuer = "0x" + w(0)[24:]; title = dec_str(d, int(w(1), 16)); desc = dec_str(d, int(w(2), 16))
    createdAt = int(w(3), 16); uri = dec_str(d, int(w(4), 16)); rnd = int(w(5), 16)
    return bountyIssuer, title, desc, createdAt, uri, rnd
claims = {}
for l in open(D + "logs.jsonl"):
    x = json.loads(l); dc = x.get("decoded") or {}
    mc = dc.get("method_call", "")
    if not mc.startswith("ClaimCreated"): continue
    P = {p["name"]: p["value"] for p in dc["parameters"]}
    claims[int(P["id"])] = dict(id=int(P["id"]), issuer=P["issuer"].lower(), bountyId=int(P["bountyId"]), bountyIssuer=P["bountyIssuer"].lower(),
        title=P["title"], desc=P["description"], createdAt=int(P["createdAt"]), uri=P["imageUri"], tx=x["transaction_hash"], block=x["block_number"])
r = json.load(open(D + "claimlogs_rpc.json"))["logs"]
for x in r:
    cid = int(x["topics"][1], 16)
    bi, t, de, ca, uri, rnd = dec_claim_data(x["data"])
    claims[cid] = dict(id=cid, issuer="0x" + x["topics"][2][-40:], bountyId=int(x["topics"][3], 16), bountyIssuer=bi.lower(),
        title=t, desc=de, createdAt=ca, uri=uri, tx=x["transactionHash"], block=int(x["blockNumber"], 16))
bounties = {}
for l in open(D + "logs.jsonl"):
    x = json.loads(l); dc = x.get("decoded") or {}
    if dc.get("method_call", "").startswith("BountyCreated"):
        P = {p["name"]: p["value"] for p in dc["parameters"]}
        bounties[int(P["id"])] = dict(id=int(P["id"]), issuer=P["issuer"].lower(), title=P["title"], desc=P["description"], amount=int(P["amount"]), createdAt=int(P["createdAt"]), tx=x["transaction_hash"])
ids = sorted(claims); miss = sorted(set(range(1, ids[-1] + 1)) - set(ids))
json.dump(claims, open(D + "claims.json", "w")); json.dump(bounties, open(D + "bounties.json", "w"))
print("claims", len(claims), "max", ids[-1], "missing", miss[:10], len(miss), "| bounties", len(bounties))
