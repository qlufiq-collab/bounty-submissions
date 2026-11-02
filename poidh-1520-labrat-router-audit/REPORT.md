# LabRat's "calculate" router treats dates, ranges, "50/50", "777-300ER" and "how much is" as arithmetic: retrieval is skipped for knowledge questions, and the rescue gate the claim build had was not carried into the app

Audit for poidh bounty #1520 ("Audit a Month of Offline AI Research"). One finding, with a reproduction that needs no model and no network writes.

Pinned sources: `r4topunk/labrat-boar-fork` @ `0ecd282d03a0c2e5a1130cd0016618b751506291` (app), `r4topunk/boar-bench` @ `74a8984c09002a07e910837e1afc5e0dafb0dc68`, `r4topunk/boar-research` @ `0590f3cf2fb1c1d4abba72983fc1c95f3c3734b1`, traces from `huggingface.co/datasets/r4topunk/boar-traces` (sha256 pinned in `boar-research/TRACES.tsv`).

## Summary

`Classify.kt` decides before any search whether a question is "arithmetic". Its test is `\b(calculate|compute|how much is)\b|\d+\s*[+\-*/×÷]\s*\d`: any digit, then `-`, `/`, `+`, `*`, `x`, then a digit, anywhere in the message, or the words "how much is" / "compute". A question that matches is classed `calculate`, and `AnswerPipeline` then skips retrieval entirely, so the 1.7B model answers from memory with no passages and no "say so if the context does not cover it" instruction. Plain knowledge questions fall in: "Explain how the Schengen 90/180-day rule works", "why the answer isn't 50/50" (Monty Hall), "Why did the 1914-1918 war start?", "Which airlines fly the 777-300ER?", "how much is a metro ticket in Tokyo", "how much is a day pass?". A second shortcut in `QuickMath.kt` answers whole messages such as `What is 9/11?` with `9/11 = 0.82.` and `2019-2022` with `-3.`, and a health question that contains a number range ("hold pressure on a nosebleed, 10-15 minutes?") can never reach a health-pack passage, so it always gets the fixed refusal.

This is not a guess about intent: the author's own traces show the same item routed both ways. In the 4B claim build (cut 6) the Schengen item carries `route-gate:calculate->chat` and retrieves four passages (one is the Wikivoyage "Travelling around the Schengen Area" page); in the deep-tier run of the same engine commit (no gate) it carries `task:calculate`, `retrieve:skipped-task-not-knowledge-based`, `context:0->0`, zero passages. The claim build had a model-based override that undid this misclassification. `labrat-boar-fork` has no such override (no `route-gate` anywhere in `android-native`), and every unit test that builds the pipeline stubs the classifier, so the real `Classify` to `AnswerPipeline` path is never exercised.

Scope, stated plainly: the 75-item ruler v0.4 contains no such question (0 of 88 turns), so the published U-total (0.165 / 0.242) is unaffected. The defect is in the shipped chat path and in 6 of 1,485 distinct English questions across the author's other dev sets (0.40 %, 95 % Wilson interval 0.19-0.88 %). I did not run Kotlin or the phone, and I do not claim a score effect.

## The finding, with locations

All paths are relative to `android-native/engine/src/main/java/team/sopa/boar/engine/` at the pinned commit.

1. `routing/Classify.kt:38`
   ```kotlin
   TaskType.CALCULATE to """\b(calculate|compute|how much is)\b|\d+\s*[+\-*/×÷]\s*\d""",
   ```
   Unanchored. `5-10`, `2016-10-14`, `4-1`, `90/180`, `50/50`, `777-300`, `1914-1918`, `186-5` all satisfy it. The patterns are tried in the order COMPARE, SUMMARIZE, TRANSLATE, CODE, CALCULATE (`Classify.kt:33-43`), so only a compare/summarize/translate/code cue wins over it.
2. `routing/Classify.kt:101-103`: `isRetrievalIrrelevant(CALCULATE) == true`.
3. `answer/AnswerPipeline.kt:126`
   ```kotlin
   val retrieved = !retrievalIrrelevant(task) && (req.filesOnly || !QuickMath.isCalculation(req.query, req.history))
   ```
   so `retrieved = false`, `sources = []`; `rag/RagPure.kt:225-227` then builds the prompt with no `Context:` block and without the context instruction (`ctxInstr = ""`). The chat uses the same classifier (`app/.../chat/ChatViewModel.kt:677`), as do the device evals (`DeviceEvalRunner` receives `Classify` from `BenchActivity.kt:80`).
4. `answer/QuickMath.kt:21-23, 103, 119-125`: `EXPR = ^LEAD([\d\s.,+\-*/x×÷()]+?)\s*(?:=\s*)?[?.!]*$` with `LEAD` including "what is"/"how much is". `HAS_OP` is `\d\s*[+\-*/x×÷]\s*[\d(]`; a body containing `/` is accepted when the message opens with "what is". The message is then evaluated and returned as the answer, with no model, no search and no sources (`AnswerPipeline.kt:120-124`).
5. Tests do not cover the integration. Every unit test that builds an `AnswerPipeline` passes stub lambdas for the classifier and for `retrievalIrrelevant` (`QuickMathTest.kt:22`, `HealthGateTest.kt:28,85`, `PersonalFilesPipelineTest.kt:19`, `SearchPortTest.kt:181-198`, `StopDuringSearchTest.kt:14`; the stubs are `"lookup"`/`{ false }`, or `"calculate"`/`{ true }` in `HealthGateTest.kt:85`), so the real `Classify` never meets the pipeline in a test. `RoutingLeavesGoldenTest.kt` compares `classifyTask` with `golden/routing-leaves.json`, which holds the output of the original JavaScript function on 855 strings harvested from other fixtures. Those strings include, with `"type":"calculate","irrelevant":true`: the first-aid sentence "Pinch the soft part of your nose and blow your nose gently. Hold for 5-10 minutes." (line 1178), "The 1970 FIFA World Cup ... beating Italy 4-1 in the final." (line 1295) and "Created: 2016-10-14" (line 1438). The golden file certifies the behaviour; it does not specify it.

## Evidence

### A. Reproduction against the app's own test data (no model)

`repro/router_misfires.py` holds three small Python ports written for this report (`classify_port.py`, `quickmath_port.py`, `health_port.py`). Before anything else it validates them against data the author ships:

```
Classify.classifyTask port vs golden/routing-leaves.json "classify": 855/855 identical
QueryContext/HealthTerms port vs health-terms-fixture.json: 181/181 identical
QuickMath.compute port vs QuickMathTest.kt assertions: 3/3 identical
```

Then it routes ordinary questions (full output in `repro/router_misfires.out.txt`):

```
- 'Explain how the Schengen 90/180-day rule works for visa-exempt visitors and how to count my days.'
    task=calculate no search -> model answers from memory, no sources
- "Explain whether you should switch doors in the Monty Hall problem, and why the answer isn't 50/50."
    task=calculate no search -> model answers from memory, no sources
- 'us passport, flying into bali. can i get a visa on arrival, how much is it, how long can i stay?'
    task=calculate no search -> model answers from memory, no sources
- 'how much is a day pass?'                              task=calculate no search -> model answers from memory, no sources
- 'How much is the entry fee for the Louvre?'            task=calculate no search -> model answers from memory, no sources
- 'Which airlines still fly the Boeing 777-300ER?'       task=calculate no search -> model answers from memory, no sources
- 'Why did the 1914-1918 war start?'                     task=calculate no search -> model answers from memory, no sources
- 'What is the 3-2-1 backup rule?'                       task=calculate no search -> model answers from memory, no sources
- 'How do I compute a Merkle root?'                      task=calculate no search -> model answers from memory, no sources
- 'What is 9/11?'                                        task=calculate ANSWERED BY CALCULATOR: "9/11 = 0.82."
- 'what is 24/7'                                         task=calculate ANSWERED BY CALCULATOR: "24/7 = 3.43."
- '2019-2022'                                            task=calculate ANSWERED BY CALCULATOR: "2019-2022 = -3."
- 'How long do I hold pressure on a nosebleed, 10-15 minutes?'   task=calculate no search -> HealthGate fixed refusal
- 'Is it OK to take 200-400 mg of ibuprofen every 6 hours?'      task=calculate no search -> HealthGate fixed refusal
  controls: 'What is the capital of Australia?' lookup/search; 'Tell me about Japan' chat/search; 'What is 15% of 80?' calculator (correct)
```

(The questions after the first three are mine, written to show the pattern; the first three come from the author's sets.)

### B. The author's own question sets

Over every English question in `boar-bench/bench/**` (1,485 distinct strings), the router classes 7 as `calculate`; 6 are not arithmetic:

```
bench-v02 (v0.2 dev set)   Explain how the Schengen 90/180-day rule works for visa-exempt visitors ...
bench-v02/writer-b         Explain whether you should switch doors in the Monty Hall problem, and why the answer isn't 50/50.
bench-v02/writer-b         Explain how the Schengen 90/180-day rule works for a visa-free visitor, with an example.
heldout/vpara1 (item 57)   us passport, flying into bali. can i get a visa on arrival, how much is it, how long can i stay?
selftest/boar-nist-crypto  We still sign with DSA at work. Did FIPS 186-5 change anything for us?
slices/chat-fu-v1          how much is a day pass?
(7th, correct)             What is 18% of 2,450?
```

That is 0.40 % of the questions (6/1,485). V-para, the set the 4B claim was held out on, has 1 of 51 and the final v0.2 set has 1 of 110 (the two writer-b rows above are candidate-pool items); the counts are small and the intervals wide. The ruler v0.4 has none, which is why the headline number does not move.

### C. The author's own traces: same item, with and without the rescue

`repro/fetch_traces.sh` downloads four sha256-pinned files from `boar-traces` (2.9 MB). Section 5 of the script's output:

```
DEVICE-FINAL M2 phone row h17: query='BP 190/110, is that high?' taskType=calculate retrievalMs=None contextTokensBefore=None healthFixed=True
dv-D-v02-s42.traces.jsonl      v02-travel-practical-A02   route.task=calculate ['task:calculate', 'retrieve:skipped-task-not-knowledge-based', 'context:0->0'] raw_passages=0
cut6-v02-s42.traces.jsonl      v02-travel-practical-A02   route.task=chat      ['task:chat', 'route-gate:calculate->chat', 'retrieve:yes', 'context:671->593'] raw_passages=4
cut6-vpara-s42.traces.jsonl    vpara-057                  route.task=chat      ['task:chat', 'route-gate:calculate->chat', 'retrieve:yes', 'context:803->646'] raw_passages=4
```

- All three engine rows are commit `0cfd4a77` (`detmax`). In the cut-6 rows the route gate overrode the classifier (`route-gate:calculate->chat`) and the search ran; the Schengen item's four raw passages include `Wikivoyage: Travelling around the Schengen Area`. In the deep-tier row (no gate) the item was classed `calculate` and nothing was retrieved; its answer is "look back from your current date and count the total number of days ... over the preceding 179 days", with no sources.
- The `route-gate` machinery exists in the record (`data/glossary.md` G-route-gate, `decisions.md` D-044). The Kotlin app has none: `grep -ri "route.gate\|calculate->chat" android-native` returns nothing, and `AnswerPipeline.kt:126` uses the classifier's verdict directly. So the misclassification that the claim build neutralised is live in LabRat.
- The one phone row that shows it, M2 probe `h17` ("BP 190/110, is that high?"), has `taskType=calculate` and no retrieval fields; it is one of the 53 "fixed text" outcomes in F-2241. For that probe the refusal is what the author wants (`QuickMathTest.kt` asserts `healthFixed`), but it shows the phone path takes the skip.

### D. Why health questions are hit harder

`HealthGate.fixedText` refuses a health question unless a passage from a health pack was kept (`answer/HealthGate.kt:40-43`). With retrieval skipped, `kept` is empty, so any health question that contains a number range or fraction ("nosebleed, 10-15 minutes", "ibuprofen 200-400 mg", "BP 120/80") is refused without a search, however good the first-aid/MedlinePlus pack is. The same question without the digits searches normally.

## Why it matters

- It is a silent quality loss in the shipped app on a question type the bounty names (travel prices, visa rules, history with date ranges): no sources, free-form model memory on a 1.7B model, and no sign in the UI that the library was never consulted.
- It is a regression between the measured 4B claim build and the submitted 1.7B app: the same item that was rescued in cut 6 is not rescued in LabRat.
- It is invisible to the test suite: every pipeline test stubs the classifier, and a golden file records the original JS output as truth.
- It is cheap to hit: a date range, a score, a fraction or the phrase "how much is" is enough. The published headline is unaffected, but anyone who tests the app with a few pricing or history questions can trigger it in one message.

## Fix (3 lines in Classify.kt, plus a test)

```kotlin
// Classify.kt:38  (QuickMath already owns "how much is 12*7" through its LEAD, so "how much is" can go)
TaskType.CALCULATE to """(?=[^\n]*\d)\b(calculate|compute)\b|^\s*(?:what(?:'s| is)\s+|how much is\s+|calculate\s+|compute\s+)?\(?\d[\d\s.,]*\)?\s*[+\-*/×÷x]\s*[\d(][\d\s.,+\-*/×÷x()=]*[?.!]*\s*$""",
```

i.e. "calculate/compute" count only when the message has a digit, and the digit-operator-digit test must cover the whole message (an expression, optionally after a lead word). A smaller alternative is to drop `CALCULATE` from `isRetrievalIrrelevant` and rely on `QuickMath.isCalculation`, which `AnswerPipeline.kt:126` already ANDs in. Either way: add an integration test that runs the real `Classify` through `AnswerPipeline` on "Explain how the Schengen 90/180-day rule works", "why the answer isn't 50/50" and "how much is a day pass?" and asserts that search ran; regenerate the 11 golden rows that change; and give `QuickMath.EXPR` the same whole-message guard (reject `\d{4}-\d{4}` year ranges and bare `\d+/\d+` unless the message opens with "calculate" or "divide").

`repro/fix_check.py` applies the proposed pattern to the same ports:

```
golden classify cases whose verdict changes under the fix: 11 of 855
   (4 non-arithmetic sentences: '5-10 minutes', '4-1 in the final', 'Created: 2016-10-14', a 'riskyHealthInstruction' label; 3 temperature-formula strings; the bare words 'calculate' / 'detects calculate'; the currency question, which Calculators still computes; the RAM word problem)
arithmetic goldens still answered by QuickMath after the fix: 6
  calculate -> research  Explain how the Schengen 90/180-day rule works ...        calculate -> research  ... why the answer isn't 50/50
  calculate -> chat      us passport, flying into bali ... how much is it ...       calculate -> research  how much is a day pass?
  calculate -> research  Why did the 1914-1918 war start?                           calculate -> research  How do I compute a Merkle root?
  calculate -> calculate What is 15 percent of 240? / Calculate the compound interest on $500 / what is 12 times 7   (unchanged)
```

## How this differs from the existing claims

- It is not the `Calculators.kt` number-parsing family: grouped-decimal lexing and "50,000.0 mAh" (claim 5, grouped decimal lexer) or the "12.000 yen -> 0.08 USD" parse and currency-direction bugs and the golden test pinning them (claim 10). Those are wrong numbers inside a computed answer; this is the decision to compute or search at all, in `Classify.kt` and `QuickMath.kt`, with different files, different mechanism and different victims (non-arithmetic questions, not arithmetic ones). The golden-file point is the same pattern as in claim 10 (goldens generated from the implementation), on a different golden (`classify`).
- It is not HealthGate provenance (claims 6 and 13): those concern which passages license a health answer once retrieval ran. Here retrieval does not run. The health consequence in section D is a side effect, not the claim.
- Claim 4 ("retrieval, not model") and claim 11 (FACT-AVAIL) say delivery of the right passage is the bottleneck; this finding is one concrete, deterministic way the app delivers nothing at all for a class of questions, and it was handled in the claim build.
- Claims 1, 2, 3, 9, 12 concern the judge, the scorer and statistics; none involves the app's routing.

## What I did not do, and limits

- I did not build or run the Android app, and I did not run Kotlin. The ports are Python, written from the Kotlin text, and validated 855/855 (Classify) and 181/181 (health predicates) against the app's own golden and fixture files; `QuickMath` is validated on the three assertions in its test file and by reading the code path in `AnswerPipeline.kt`.
- The trace evidence for the "rescue" is from the JavaScript engine at the claim commit (4B, deep tier), not from Kotlin. The Kotlin side is established by code (no override exists) and by the phone row `h17`.
- I measured no effect on a score. The ruler contains no matching item. Frequency on the author's other dev sets is 0.4 %; on questions that ask for prices, visa rules or date-bounded history it will be higher, but I have no data for that and do not estimate it.
- The ruler's multi-turn and health items were not re-scored.

## Related observation (not part of the claim)

The same family of front-end heuristics also mishandles dates in the named-article route of the pack search: month and weekday names and dates resolve to calendar articles that are placed first. In the phone run (`df-m1-v04-s42/s43`, identical in both seeds) six model turns carry such a source: cw-004 "November", cw-030 "June" (2 of 4 passages), cx-029 "Monday", cx-032 "January 15" (3 of 5 passages), plus filler words ("OK" x3 for "ok what's it good for besides being dry", "First Time", "Lunch"); the M4 matrix has "January 1" x3 for a question that mentions January 1. I did not measure a score effect for this.

## Reproduce

```
git init labrat && git -C labrat fetch --depth 1 https://github.com/r4topunk/labrat-boar-fork 0ecd282d03a0c2e5a1130cd0016618b751506291 && git -C labrat checkout FETCH_HEAD
git init bench  && git -C bench  fetch --depth 1 https://github.com/r4topunk/boar-bench 74a8984c09002a07e910837e1afc5e0dafb0dc68 && git -C bench checkout FETCH_HEAD
sh repro/fetch_traces.sh traces                                   # optional, 2.9 MB, sha256-checked
python3 -I repro/router_misfires.py labrat bench traces           # drop the third argument to skip the trace section
python3 -I repro/fix_check.py labrat bench
```

Only Python 3 standard library; nothing from the repositories is executed (the health port reads regex text out of two Kotlin files and compiles it with `re`). Expected output is in `repro/router_misfires.out.txt` and `repro/fix_check.out.txt`. The scripts are reproduced in the appendix.

## Appendix: scripts

### repro/classify_port.py

```python
"""Faithful Python port of engine/routing/Classify.kt (labrat-boar-fork 0ecd282) task classification.
JS \\b is ASCII-only -> re.ASCII for the \\b patterns; Unicode \\s is kept by compiling without ASCII where \\s matters (irrelevant for these inputs)."""
import re
I=re.I
def R(p): return re.compile(p, I)
PATTERNS=[
 ('compare', R(r"""\b(compare|versus|vs\.?|difference between|which is better)\b""")),
 ('summarize', R(r"""\b(summarize|summarise|summary of|tl;?dr)\b""")),
 ('translate', R(r"""\btranslate\b""")),
 ('code', R(r"""```|\b(write (a |some )?code|debug this|refactor|fix this function|regex for)\b""")),
 ('calculate', R(r"""\b(calculate|compute|how much is)\b|\d+\s*[+\-*/×÷]\s*\d""")),
 ('calculate', R(r"""\d+(?:[.,]\d+)?\s*(?:%|percent\b|per cent\b)\s*of\s+\d|\b\d+(?:[.,]\d+)?\s+(?:times|plus|minus|divided by|multiplied by)\s+\d""")),
 ('extract', R(r"""\b(extract|list all|pull out|find every)\b""")),
 ('research', R(r"""^(why|how)\b|\b(explain|caused?|causes|effects? of|impacts?|relate[sd]?|relationship|contrast|implications?)\b""")),
]
GREETING=R(r"""^(hi|hiya|hello|hey+|hey there|howdy|g'?day|yo|sup|wake up|good (morning|afternoon|evening|night)|how(?:'s| is| are) it going|how goes it|how are you|what'?s (up|good)|thanks?( you)?|thank you|(thanks|thank you)( (so|very) much| a lot| again)?|many thanks|much appreciated|(i )?appreciate it|thx|ty|tysm|cheers|you'?re welcome|you bet|no problem|np|that (helps|helped)|that'?s (helpful|great|perfect)|sounds (good|great)|makes sense|got it|perfect|great|awesome|bye|goodbye|see ya|see you|cya|ttyl|talk (to you )?later|ok(ay)?|cool|nice|hola|buenas|qu[eé] (tal|onda)|buenos d[ií]as|buenas (tardes|noches)|todo bien|de nada|por nada|de acuerdo|gracias|chao|hasta luego|nos vemos|adi[oó]s|merci( beaucoup)?|salut|coucou|[cç]a va|bonjour|bonsoir|de rien|[aà] plus|danke( sch(o|ö)n)?|hallo|guten (morgen|tag|abend)|tsch[üu]ss)[!.?~]*$""")
SEG=R(r"""[,;]|\band\b""")
CONV=R(r"""^(?:what'?s?\s+(?:is\s+)?your\s+name|who\s+are\s+you|what\s+are\s+you|what\s+can\s+you\s+do|(?:how\s+)?can\s+you\s+help(?:\s+me)?|who\s+(?:made|built|created|trained)\s+you|are\s+you\s+(?:an?\s+)?(?:ai|bot|robot|human|real|person|chatgpt|online|offline)|how\s+do\s+you\s+work|(?:tell\s+me\s+)?(?:a\s+)?joke|what\s+time\s+is\s+it|what'?s?\s+(?:is\s+)?the\s+time|what\s+day\s+is\s+(?:it|today)|what'?s?\s+(?:is\s+)?today'?s\s+date)(?:\s+(?:please|again|now|today))?[\s!.?~]*$""")
YES_NO=R(r"""^(is|are|was|were|do|does|did|can|could|should|will|would|has|have|e|são|sao|era|foi|devo|tem|ha|vale)(?![^\W\d_])[^?]*\?\s*$""")
WH=R(r"""^(who|what|when|where|which)\s""")
RW=R(r"""\b(research|analyze|analyse|investigate|explore|explain in depth)\b""")
def classify(q):
    t=q.strip()
    if not t: return 'unknown'
    segs=[s.strip() for s in SEG.split(t) if s and s.strip()]
    if segs and all(GREETING.search(s) for s in segs): return 'greeting'
    if CONV.search(t): return 'conversation'
    for ty,re_ in PATTERNS:
        if re_.search(t): return ty
    wc=len(re.split(r'\s+',t))
    if WH.search(t+' ') and wc<=12: return 'lookup'
    if wc>25 or RW.search(t): return 'research'
    if YES_NO.search(t): return 'lookup'
    return 'chat'
IRRELEVANT={'calculate','translate','code','greeting','conversation'}
if __name__=='__main__':
    import sys
    for q in sys.argv[1:]: print(classify(q), classify(q) in IRRELEVANT, '|', q)
```

### repro/quickmath_port.py

```python
"""Port of QuickMath.kt routing predicates (EXPR / HAS_OP / WORD_LEAD / PERCENT_OF / evaluate) at labrat-boar-fork 0ecd282."""
import re
NUM=r"-?\d+(?:[.,]\d+)?"
LEAD=r"(?:what(?:'s| is| are)|how much is|calculate|compute|work out|convert|how many|give me)?\s*"
PERCENT_OF=re.compile(r"^"+LEAD+"("+NUM+r")\s*(?:%|percent|per cent)\s+of\s+("+NUM+r")\s*[?.!]*$",re.I)
EXPR=re.compile(r"^"+LEAD+r"([\d\s.,+\-*/x×÷()]+?)\s*(?:=\s*)?[?.!]*$",re.I)
HAS_OP=re.compile(r"\d\s*[+\-*/x×÷]\s*[\d(]",re.I)
WORD_LEAD=re.compile(r"^(?:what(?:'s| is)|how much is|calculate|compute|work out)\b",re.I)
def parse_number(raw):
    s=re.sub(r"\s","",raw)
    if ',' in s and '.' in s:
        return float(s.replace('.','').replace(',','.',1) if s.rfind(',')>s.rfind('.') else s.replace(',',''))
    if ',' in s:
        return float(s.replace(',','')) if re.search(r",\d{3}$",s) else float(s.replace(',','.',1))
    return float(s)
class P:
    def __init__(s,t): s.s=t; s.i=0
    def peek(s): return s.s[s.i] if s.i<len(s.s) else '\0'
    def number(s):
        st=s.i
        while s.i<len(s.s) and (s.s[s.i].isdigit() or s.s[s.i] in '.,'): s.i+=1
        if s.i==st: return None
        try: return parse_number(s.s[st:s.i])
        except Exception: return None
    def atom(s):
        if s.peek()=='-': s.i+=1; a=s.atom(); return None if a is None else -a
        if s.peek()=='(':
            s.i+=1; v=s.expr()
            if v is None or s.peek()!=')': return None
            s.i+=1; return v
        return s.number()
    def term(s):
        v=s.atom()
        if v is None: return None
        while s.peek() in '*/':
            op=s.s[s.i]; s.i+=1; r=s.atom()
            if r is None: return None
            v = v*r if op=='*' else (v/r if r!=0 else float('inf'))
        return v
    def expr(s):
        v=s.term()
        if v is None: return None
        while s.peek() in '+-':
            op=s.s[s.i]; s.i+=1; r=s.term()
            if r is None: return None
            v = v+r if op=='+' else v-r
        return v
def evaluate(src):
    t=src.replace('×','*').replace('÷','/')
    t=re.sub(r"(?<=[\d)\s])x(?=[\d(\s])","*",t); t=re.sub(r"\s+","",t)
    p=P(t); v=p.expr()
    return v if (v is not None and p.i==len(t) and abs(v)!=float('inf')) else None
def fmt(n):
    return f"{n:,.2f}".rstrip('0').rstrip('.') if n!=int(n) else f"{int(n):,}"
def compute(q):
    m=PERCENT_OF.search(q)
    if m: return f"{fmt(parse_number(m.group(1)))}% of {fmt(parse_number(m.group(2)))} = {fmt(parse_number(m.group(1))*parse_number(m.group(2))/100)}."
    m=EXPR.search(q)
    if m:
        body=m.group(1).strip()
        if HAS_OP.search(body) and (WORD_LEAD.search(q) or '/' not in body):
            v=evaluate(body)
            if v is not None: return f"{body} = {fmt(v)}."
    return None
if __name__=='__main__':
    import sys
    for q in sys.argv[1:]: print(repr(q),'->',compute(q))
```

### repro/health_port.py

```python
"""Python port of QueryContext.isHealthQuestion + HealthTerms.matches (labrat-boar-fork 0ecd282).
Regex sources are extracted verbatim from the Kotlin files at run time and translated for Python re:
  \\p{L} -> [^\\W\\d_]   \\p{N} -> \\d   [\\p{L}\\p{N}] -> [^\\W_]   [\\p{L}] -> [^\\W\\d_]
JS/Kotlin '\\b' is ASCII-only; Python's is Unicode: irrelevant for ASCII test strings."""
import re,sys,os
ROOT=os.environ.get('LABRAT','/mnt/data/bounties/poidh/work/1520/src/labrat-boar-fork')+'/android-native/engine/src/main/java/team/sopa/boar/engine/'
def tr(src):
    src=src.replace(r'[^\p{L}]',r'[\W\d_]').replace(r'[^\p{L}\p{N}]',r'[\W_]').replace(r'[\p{L}\p{N}]','[^\\W_]').replace(r'[\p{L}]',r'[^\W\d_]').replace(r'\p{L}',r'[^\W\d_]').replace(r'\p{N}',r'\d')
    return src
def comp(src,flags):
    f=0
    if 'i' in flags: f|=re.I
    return re.compile(tr(src),f)
def grab(path):
    t=open(path,encoding='utf-8').read()
    out=[]
    for m in re.finditer(r'(?:"(\w+)" to JsRegex\.re\(|private val (\w+) = re\(|private val (\w+) = JsRegex\.re\()\s*"""(.*?)"""\s*,\s*"(\w*)"',t,re.S):
        name=m.group(1) or m.group(2) or m.group(3)
        out.append((name,m.group(4),m.group(5)))
    return out
qc=grab(ROOT+'routing/QueryContext.kt'); ht=grab(ROOT+'answer/HealthTerms.kt')
# interpolation in QueryContext.PHRASE_ASK ($LANGUAGE_NAMES)
lang=re.search(r'LANGUAGE_NAMES =\s*"([^"]+)"',open(ROOT+'routing/QueryContext.kt').read()).group(1)
Q={}
for n,s,f in qc:
    s=s.replace('$LANGUAGE_NAMES',lang); Q[n]=comp(s,f)
RULES=[(n,comp(s,f)) for n,s,f in ht if n not in ('CONTINUES','TEMPERATURE','CONVERT_ASK','ASKS_WHAT_TO_DO','WHITESPACE')]
def is_health_question(q):
    g=lambda n:Q[n].search(q)
    return bool((g('VENOMOUS') and g('STUNG_OR_RISK')) or g('SWALLOWED') or g('UNRESPONSIVE') or g('HEALTH_ES') or g('HEALTH')
      or (g('DISASTER') and (g('ACTION_INTENT') or g('SHOULD_INTENT')))
      or (Q['INJURY_DESCRIBED'].search(re.sub(r'\ba (little )?bit\b',' ',q,flags=re.I)) and (g('ACTION_INTENT') or g('SHOULD_INTENT')))
      or g('FROSTBITE') or (g('CHEST_PAIN') and not g('CHEST_PAIN_METAPHOR')) or g('HEAD_INJURY')
      or (g('PHRASE_ASK') and g('PHRASE_HEALTH_CONTENT')))
def terms_hits(q): return [n for n,r in RULES if r.search(q)]
def is_health(q): return is_health_question(q) or bool(terms_hits(q))
if __name__=='__main__':
    print([n for n,_,_ in qc]); print([n for n,_ in RULES])
```

### repro/router_misfires.py

```python
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
```

### repro/fix_check.py

```python
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
```

### repro/fetch_traces.sh

```sh
#!/bin/sh
# Downloads the four public trace files used in section 5 of REPORT.md (about 2.9 MB) and checks their sha256 against boar-research/TRACES.tsv.
# usage: sh fetch_traces.sh <empty output dir>     (then: python3 -I router_misfires.py <labrat> <boar-bench> <output dir>)
set -eu
D="$1"; mkdir -p "$D/out" "$D/hf"; B=https://huggingface.co/datasets/r4topunk/boar-traces/resolve/main
get() { curl -sSL -A "Mozilla/5.0" "$B/$1" -o "$2"; [ "$(sha256sum "$2" | cut -d' ' -f1)" = "$3" ] && echo "ok   $2" || { echo "FAIL $2"; exit 1; }; }
get rnd/research/coordinator/arms/device-final/out/df-m2-probes-s42.jsonl "$D/out/df-m2-probes-s42.jsonl" b8be421dbae5959507c97cd74a2349894ec6e14898389f0552cbdeca5690af4e
get rnd/heldout/bench-v02/runs-deepvpara/dv-D-v02-s42.traces.jsonl "$D/hf/dv-D-v02-s42.traces.jsonl" da0b45a136fad84cd6706cbe427e1f12ff5fd25502ee19062307a1a065873874
get rnd/heldout/bench-v02/runs-cut6/cut6-v02-s42.traces.jsonl "$D/hf/cut6-v02-s42.traces.jsonl" a379e791f0476126ec619f1ca02c01834a1b33ace586d393512e1cb9d92e94c3
get rnd/heldout/vitalik-para1/runs-cut6/cut6-vpara-s42.traces.jsonl "$D/hf/cut6-vpara-s42.traces.jsonl" f3d3e49ef693efa686d12d628e044b25f8646072a6544843d50d7203b225e6ba
```

