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
