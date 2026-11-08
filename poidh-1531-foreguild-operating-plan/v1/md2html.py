#!/usr/bin/env python3
"""Convert plan.md (GitHub-flavoured subset) to self-contained HTML.
Stdlib only. Handles: headings, tables, bullet/numbered lists,
blockquotes, bold/italic/code/links inline, hr, paragraphs.
"""
import re, html, sys

SRC = "/home/hatch/workspace/poidh/foreguild-operating-plan/plan.md"
DST = "/home/hatch/workspace/poidh/foreguild-operating-plan.html"

CSS = """
:root { --ink:#1a1a1a; --muted:#555; --accent:#0b5cad; --line:#d8d8d8; }
* { box-sizing:border-box; }
@page { size:A4; margin:18mm 16mm 20mm 16mm;
  @bottom-center { content: counter(page) " / " counter(pages);
    font-family:'Helvetica Neue',Arial,sans-serif; font-size:8.5pt; color:#888; } }
html { font-size:11pt; }
body { font-family:Georgia,'Times New Roman',serif; color:var(--ink);
  line-height:1.55; margin:0 auto; max-width:210mm; padding:0 4mm; }
h1 { font-family:'Helvetica Neue',Arial,sans-serif; font-size:22pt; line-height:1.2;
  margin:6mm 0 2mm 0; color:#0b2a4a; }
h2 { font-family:'Helvetica Neue',Arial,sans-serif; font-size:14pt; color:#0b2a4a;
  border-bottom:2px solid var(--accent); padding-bottom:1mm; margin:8mm 0 3mm 0;
  page-break-after:avoid; }
h3 { font-family:'Helvetica Neue',Arial,sans-serif; font-size:12pt; color:#143a5e;
  margin:5mm 0 2mm 0; page-break-after:avoid; }
p { margin:0 0 3mm 0; text-align:justify; }
.cover { border-bottom:3px solid var(--accent); padding-bottom:3mm; margin-bottom:4mm; }
.cover .sub { font-family:'Helvetica Neue',Arial,sans-serif; font-size:11pt; color:var(--muted); }
.cover .meta { font-family:'Helvetica Neue',Arial,sans-serif; font-size:10pt; color:var(--muted); margin-top:2mm; }
blockquote { border-left:4px solid var(--accent); background:#f2f7fc; margin:3mm 0;
  padding:3mm 4mm; }
blockquote p { margin:0 0 2mm 0; }
table { border-collapse:collapse; width:100%; margin:3mm 0 4mm 0;
  font-family:'Helvetica Neue',Arial,sans-serif; font-size:9.5pt; page-break-inside:auto; }
/* Wide tables (e.g. the 14-column monthly ledger): shrink so no column
   is cut off at the A4 margin — verified 2026-11-06 that the ledger's
   Cum./Cash columns were previously off-page. */
table.wide { font-size:7.5pt; }
table.wide th, table.wide td { padding:0.9mm 1mm; white-space:nowrap; }
th, td { border:1px solid var(--line); padding:1.6mm 2mm; text-align:left; vertical-align:top; }
th { background:#0b2a4a; color:#fff; font-weight:600; }
tr:nth-child(even) td { background:#f6f8fa; }
tr { page-break-inside:avoid; }
ul, ol { margin:0 0 3mm 0; padding-left:6mm; }
li { margin-bottom:1.2mm; text-align:justify; }
hr { border:none; border-top:1px solid var(--line); margin:6mm 0; }
code { font-family:'Courier New',monospace; font-size:9.5pt; background:#f0f0f0; padding:0 1mm; }
a { color:var(--accent); text-decoration:none; word-break:break-all; }
strong { color:#0b2a4a; }
.footnote { font-size:9pt; color:var(--muted); }
.endmark { text-align:center; color:var(--muted); font-size:9.5pt; margin-top:3mm;
  border-top:1px solid var(--line); padding-top:3mm; }
"""

def inline(s):
    s = html.escape(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)', r'<em>\1</em>', s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', s)
    return s

def is_sep(line):
    cells = [c.strip() for c in line.strip().strip('|').split('|')]
    return cells and all(re.match(r'^:?-{3,}:?$', c) for c in cells)

def parse_table(lines, i):
    header = [inline(c.strip()) for c in lines[i].strip().strip('|').split('|')]
    rows = []
    j = i + 2
    while j < len(lines) and lines[j].strip().startswith('|'):
        rows.append([inline(c.strip()) for c in lines[j].strip().strip('|').split('|')])
        j += 1
    cls = ' class="wide"' if len(header) > 10 else ''
    out = [f'<table{cls}><thead><tr>' + ''.join(f'<th>{h}</th>' for h in header) + '</tr></thead><tbody>']
    for r in rows:
        out.append('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>')
    out.append('</tbody></table>')
    return '\n'.join(out), j

def convert(text):
    lines = text.split('\n')
    out, i = [], 0
    while i < len(lines):
        line = lines[i]
        s = line.strip()
        if not s:
            i += 1
            continue
        if s.startswith('# '):
            out.append(f'<h1>{inline(s[2:])}</h1>')
            # cover block: next two bold/para lines become .cover meta — handled by CSS classes below
            i += 1
            continue
        if s.startswith('## '):
            out.append(f'<h2>{inline(s[3:])}</h2>'); i += 1; continue
        if s.startswith('### '):
            out.append(f'<h3>{inline(s[4:])}</h3>'); i += 1; continue
        if s == '---':
            out.append('<hr>'); i += 1; continue
        if s.startswith('|') and i + 1 < len(lines) and is_sep(lines[i + 1]):
            t, i = parse_table(lines, i)
            out.append(t); continue
        if s.startswith('> '):
            buf = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                buf.append(lines[i].strip()[1:].strip())
                i += 1
            # join wrapped lines; blank '> ' separates paragraphs
            paras, cur = [], []
            for b in buf:
                if b == '':
                    if cur: paras.append(' '.join(cur)); cur = []
                else:
                    cur.append(b)
            if cur: paras.append(' '.join(cur))
            inner = ''.join(f'<p>{inline(p)}</p>' for p in paras)
            out.append(f'<blockquote>{inner}</blockquote>')
            continue
        m = re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)$', line)
        if m:
            tag = 'ul' if m.group(2) in ('-', '*') else 'ol'
            items = []
            while i < len(lines):
                mm = re.match(r'^(\s*)([-*]|\d+\.)\s+(.*)$', lines[i])
                if not mm:
                    break
                items.append(inline(mm.group(3)))
                i += 1
            out.append(f'<{tag}>' + ''.join(f'<li>{t}</li>' for t in items) + f'</{tag}>')
            continue
        # paragraph: gather consecutive plain lines
        buf = []
        while i < len(lines) and lines[i].strip() and not lines[i].strip().startswith(('#', '|', '>', '---')) \
                and not re.match(r'^(\s*)([-*]|\d+\.)\s+', lines[i]):
            buf.append(lines[i].strip())
            i += 1
        out.append(f'<p>{inline(" ".join(buf))}</p>')
    return '\n'.join(out)

with open(SRC) as f:
    md = f.read()
body = convert(md)
# Cover treatment: wrap the h1 + following two paragraphs in .cover
body = re.sub(r'(<h1>.*?</h1>)', r'<div class="cover">\1', body, count=1)
body = body.replace('</h1>\n<p><strong>Proposal for POIDH Bounty 1531',
                    '</h1>\n<p class="sub"><strong>Proposal for POIDH Bounty 1531', 1)
# close cover div after the first blockquote (the "How to read" box)
body = body.replace('</blockquote>', '</blockquote></div>', 1)
body += ('\n<div class="endmark">Foreguild Operating Plan — The Verification Guild · '
         'Prepared 6 November 2026 for POIDH Bounty 1531 · Proposal — not submitted · '
         'Arithmetic audit trail: compute_numbers.py → numbers.json → worksheet.md</div>')

html_doc = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Foreguild Operating Plan — POIDH Bounty 1531</title>
<style>{CSS}</style></head>
<body>
{body}
</body></html>
"""
with open(DST, 'w') as f:
    f.write(html_doc)
print(f"wrote {DST} ({len(html_doc)} bytes)")
