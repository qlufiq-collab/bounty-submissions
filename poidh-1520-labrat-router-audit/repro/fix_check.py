#!/usr/bin/env python3
"""Checks the proposed fix (see REPORT.md) on the app's own 855 golden classify cases and on the misfiring questions.
usage: python3 -I fix_check.py <labrat checkout> <boar-bench checkout>"""
import json, os, re, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import classify_port as C, quickmath_port as Q
LAB, BENCH = sys.argv[1], sys.argv[2]
# Proposed Classify.kt change (3 lines): (a) "how much is" is dropped from the keyword rule (QuickMath's LEAD already owns "how much is 12*7");
# (b) "calculate|compute" count only when the question contains a digit; (c) the unanchored "<digit> <+-*/x> <digit>" test becomes a
# whole-message test: the message is an expression, optionally behind a lead word ("what is", "calculate").
FIXED_CALC1 = re.compile(r"(?=.*\d)\b(calculate|compute)\b|^\s*(?:what(?:'s| is)\s+|how much is\s+|calculate\s+|compute\s+)?\(?\d[\d\s.,]*\)?\s*[+\-*/×÷x]\s*[\d(][\d\s.,+\-*/×÷x()=]*[?.!]*\s*$", re.I | re.S)
def classify_fixed(q):
    saved = C.PATTERNS[4]
    C.PATTERNS[4] = ('calculate', FIXED_CALC1)
    try: return C.classify(q)
    finally: C.PATTERNS[4] = saved
g = json.load(open(f'{LAB}/android-native/engine/src/test/resources/golden/routing-leaves.json'))['classify']
changed = [(r['q'], r['type'], classify_fixed(r['q'])) for r in g if classify_fixed(r['q']) != r['type']]
print(f'golden classify cases whose verdict changes under the fix: {len(changed)} of {len(g)}')
for q, a, b in changed: print('  ', repr(q[:100]), a, '->', b)
arith = [r for r in g if r['type'] == 'calculate' and Q.compute(r['q'])]
print('arithmetic goldens still answered by QuickMath after the fix:', len(arith), '(QuickMath is unchanged by the fix)')
print('\nthe misfiring questions after the fix:')
for q in ['Explain how the Schengen 90/180-day rule works for visa-exempt visitors and how to count my days.', "Explain whether you should switch doors in the Monty Hall problem, and why the answer isn't 50/50.",
          'us passport, flying into bali. can i get a visa on arrival, how much is it, how long can i stay?', 'how much is a day pass?', 'Why did the 1914-1918 war start?', 'How do I compute a Merkle root?',
          'What is 15 percent of 240?', 'Calculate the compound interest on $500', 'what is 12 times 7']:
    print(f'  {C.classify(q):<9} -> {classify_fixed(q):<9} {q[:90]}')
