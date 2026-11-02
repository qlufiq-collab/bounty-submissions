#!/usr/bin/env python3
"""Reproduction for: LabRat's digit-triggered "calculate" routing (Classify.kt / QuickMath.kt) hijacks knowledge questions.

usage: python3 -I router_misfires.py <labrat-boar-fork checkout> <boar-bench checkout> [<dir with downloaded boar-traces files>]
Everything here is a Python port written for this report (classify_port.py, quickmath_port.py, health_port.py are in the same folder);
nothing from the cloned repositories is executed. The ports are validated against the app's OWN golden/fixture files first.
"""
import glob, json, os, re, sys, collections
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
LAB, BENCH = sys.argv[1], sys.argv[2]
TRACES = sys.argv[3] if len(sys.argv) > 3 else None
os.environ['LABRAT'] = LAB
import classify_port as C, quickmath_port as Q, health_port as H

print('== 1. port validation against the app\'s own test data')
g = json.load(open(f'{LAB}/android-native/engine/src/test/resources/golden/routing-leaves.json'))
bad = [r for r in g['classify'] if C.classify(r['q']) != r['type'] or (C.classify(r['q']) in C.IRRELEVANT) != r['irrelevant']]
print(f'Classify.classifyTask port vs golden/routing-leaves.json "classify": {len(g["classify"]) - len(bad)}/{len(g["classify"])} identical')
fx = json.load(open(f'{LAB}/android-native/engine/src/test/resources/health-terms-fixture.json'))
badh = [r for r in fx if H.is_health_question(r['q']) != r['base'] or bool(H.terms_hits(r['q'])) != r['terms']]
print(f'QueryContext/HealthTerms port vs health-terms-fixture.json: {len(fx) - len(badh)}/{len(fx)} identical')
for q, want in [('What is 15% of 80?', '15% of 80 = 12.'), ('what is 12 * 7', '12 * 7 = 84.'), ('(2 + 3) × 4', '(2 + 3) × 4 = 20.')]:   # QuickMathTest.kt assertions
    assert Q.compute(q) == want, (q, Q.compute(q))
print('QuickMath.compute port vs QuickMathTest.kt assertions: 3/3 identical')

print('\n== 2. golden entries that pin the behaviour (routing-leaves.json, "classify")')
for r in g['classify']:
    if r['type'] == 'calculate' and not re.search(r'calculate|percent|%|times|[+×÷*]|\d\s*/\s*\d\s*$', r['q'], re.I) :
        print('  ', repr(r['q'][:110]), '->', r['type'], 'retrieval irrelevant =', r['irrelevant'])

print('\n== 3. what the front end does with ordinary knowledge questions (task, retrieval, QuickMath answer, health gate)')
def route(q):
    task = C.classify(q)
    qm = None if H.is_health(q) else Q.compute(q)
    skipped = task in C.IRRELEVANT or qm is not None
    health = H.is_health(q)
    if qm is not None: outcome = f'ANSWERED BY CALCULATOR: "{qm}"'
    elif skipped and health: outcome = 'no search -> HealthGate fixed refusal (a health pack can never license an answer)'
    elif skipped: outcome = 'no search -> model answers from memory, no sources'
    else: outcome = 'normal: search + sources'
    return task, outcome
PROBES = [
 'Explain how the Schengen 90/180-day rule works for visa-exempt visitors and how to count my days.',   # bench-v02 / dev set (real trace below)
 "Explain whether you should switch doors in the Monty Hall problem, and why the answer isn't 50/50.",   # bench-v02 writer-b
 'us passport, flying into bali. can i get a visa on arrival, how much is it, how long can i stay?',     # V-para item 57
 'how much is a day pass?',                                                                                # chat-fu-v1
 'How much is the entry fee for the Louvre?', 'how much is a metro ticket in tokyo',
 'Which airlines still fly the Boeing 777-300ER?', 'Why did the 1914-1918 war start?', 'Tell me about the 1989-1991 revolutions in Eastern Europe',
 'What is 9/11?', 'What is the 3-2-1 backup rule?', 'what is 24/7', '2019-2022',
 'How do I compute a Merkle root?',
 'How long do I hold pressure on a nosebleed, 10-15 minutes?',
 'Is it OK to take 200-400 mg of ibuprofen every 6 hours?',
 'What is the capital of Australia?', 'Tell me about Japan', 'What is 15% of 80?',                    # controls: must NOT misfire / must compute
]
for q in PROBES:
    t, o = route(q); print(f'- {q!r}\n    task={t:<9} {o}')

print('\n== 4. how often does it fire on the author\'s own question sets?')
seen = {}
for f in glob.glob(BENCH + '/bench/**/*.jsonl', recursive=True):
    if any(x in f for x in ('/refs/', '/drafts/', 'refs.jsonl', 'MANIFEST', 'REJECTED', 'gold', 'critique', 'factcheck', 'candidate')): continue
    for l in open(f, errors='replace'):
        try: r = json.loads(l)
        except Exception: continue
        qs = []
        if isinstance(r, dict) and r.get('lang', 'en') in ('en', None):          # the app is English-only: skip es/pt sets
            for k in ('question', 'query', 'q', 'text'):
                if isinstance(r.get(k), str): qs.append(r[k]); break
            for t in r.get('turns') or []:
                if isinstance(t, str): qs.append(t)
                elif isinstance(t, dict) and isinstance(t.get('text'), str) and t.get('role', 'user') == 'user': qs.append(t['text'])
        for q in qs: seen.setdefault(q, os.path.relpath(f, BENCH))
cnt = collections.Counter(C.classify(q) for q in seen); hits = [(f, q) for q, f in seen.items() if C.classify(q) == 'calculate']
print(f'{len(seen)} distinct questions in boar-bench/bench/**: {cnt["calculate"]} classified "calculate" ({100*cnt["calculate"]/len(seen):.2f}%)')
for f, q in hits: print('  ', f, '|', q[:150].replace('\n', ' '))
v04 = [json.loads(l) for l in open(f'{BENCH}/bench/v0.4/items.jsonl')]
n_v04 = sum(C.classify(t) == 'calculate' for it in v04 for t in it['turns'])
print(f'ruler v0.4 (75 items, {sum(len(i["turns"]) for i in v04)} turns): {n_v04} classified calculate -> the published U-total is not affected')

if TRACES:
    print('\n== 5. the author\'s own traces (sha256-pinned in boar-research/TRACES.tsv)')
    p = f'{TRACES}/out/df-m2-probes-s42.jsonl'
    if os.path.exists(p):
        for l in open(p):
            r = json.loads(l)
            if r['queryId'] == 'h17':
                print(f'DEVICE-FINAL M2 phone row h17: query={r["query"]!r} taskType={r["taskType"]} retrievalMs={r.get("retrievalMs")} contextTokensBefore={r.get("contextTokensBefore")} healthFixed={r["healthFixed"]}')
    for name, item in (('dv-D-v02-s42.traces.jsonl', 'v02-travel-practical-A02'), ('cut6-v02-s42.traces.jsonl', 'v02-travel-practical-A02'), ('cut6-vpara-s42.traces.jsonl', 'vpara-057')):
        p = f'{TRACES}/hf/{name}'
        if not os.path.exists(p): continue
        for l in open(p):
            r = json.loads(l)
            if r['itemId'] == item:
                rc = [x for x in r['route']['reasonCodes'] if x.startswith(('task', 'route-gate:calc', 'retrieve', 'context'))]
                print(f'{name:<30} {item:<26} route.task={r["route"]["task"]:<9} {rc} raw_passages={len(r["retrieval"].get("raw", []))}')
