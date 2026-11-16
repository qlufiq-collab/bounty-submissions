import json, collections, re, datetime
D = "data/"
C = "0x5555fa783936c260f77385b4e153b9725fef1719"
claims = json.load(open(D + "claims.json")); tx = json.load(open(D + "tx.json")); code = json.load(open(D + "code.json"))
bounties = json.load(open(D + "bounties.json"))
cac = json.load(open(D + "code_at_claim.json"))
names = {a: (x or {}).get("name") for a, x in json.load(open(D + "addr.json")).items()}
CONSUMER = {"CaliburEntry": "Uniswap Wallet", "EIP7702Proxy": "Coinbase/Base app", "EIP7702StatelessDeleGator": "MetaMask smart account",
            "DelegationManager": "MetaMask smart account", "AmbireAccount7702": "Ambire", "AvoForwarderProxy": "Avocado"}
def stack(c):
    t = tx.get(c["tx"]) or {}
    to = (t.get("to") or "").lower(); fr = (t.get("from") or "").lower()
    cd = cac.get(str(c["id"])) or "0x"  # wallet code AT the claim block (archive state)
    if to and to != C:  # relayed / bundled
        n = names.get(to) or "unknown relay"; return ("consumer" if n in CONSUMER else "relayed", CONSUMER.get(n, n))
    if cd.startswith("0xef0100"):
        n = names.get("0x" + cd[8:48]) or "unverified 7702"; return ("consumer" if n in CONSUMER else "7702-other", CONSUMER.get(n, n))
    if cd != "0x": return ("contract", "contract wallet")
    if not t: return ("unknown", "tx not found")
    return ("eoa", "plain EOA")
if __name__ == "__main__":
    month = lambda c: datetime.datetime.utcfromtimestamp(c["createdAt"]).strftime("%Y-%m")
    tab = collections.defaultdict(collections.Counter)
    for c in claims.values(): tab[month(c)][stack(c)[0]] += 1
    for m in sorted(tab): 
        n = sum(tab[m].values()); print(m, n, {k: f"{v} ({v/n:.0%})" for k, v in tab[m].most_common()})
    print(collections.Counter(stack(c)[1] for c in claims.values()).most_common(14))
