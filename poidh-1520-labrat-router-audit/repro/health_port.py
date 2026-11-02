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
