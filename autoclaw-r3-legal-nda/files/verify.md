# Verification of the AutoClaw NDA review (T03, 2026-11-13)

AutoClaw run: model GLM-5.3-FlashX-Legal, skills contract-review + legal-docx-revisor + legal-norm-validity-check.
Run time ~11 min (2nd attempt; 1st attempt failed twice with "Model resources are busy"). Credits used on the successful run: 761.
Output: `output/NDA-redline.docx`, `output/issues.md` (16 issues), `output/memo.md`, `output/sources.md`.

## 1. Quotes vs. the source NDA (automatic check)
Every quoted fragment in `issues.md` was normalised (curly quotes, bold, whitespace) and searched in the source text.
- 17 / 17 NDA quotes match the source **exactly**.
- 1 "mismatch" was the bare term "personal data" used as a word (row #5, a SILENT row), not a quote of the NDA.

## 2. Redline docx
- Opens in LibreOffice; renders to 4 pages with strikethrough/underline (page images on the demo page).
- 15 insertions, 5 deletions, 12 anchored comments, author "PT Sinar Data Nusantara".
- Each comment maps to an issue row (#1–#7, #8–#10, #4, #12).
- Weakness: whole sentences are replaced where one word changes (e.g. "1 year" → "3 years" replaced the full Term of Confidentiality sentence). Readable, but a lawyer would prefer word-level diffs.

## 3. Legal citations, re-checked independently (second researcher, official sources first)
| Claim used by AutoClaw | Result | Source read |
|---|---|---|
| UU 24/2009 Art. 31(1)-(2): Indonesian required; foreign party's language and/or English also | VERIFIED (text) | pasal.id/peraturan/uu/uu-no-24-tahun-2009/pasal-31 (BPK returned 403) |
| Perpres 63/2019 Art. 26 | VERIFIED; note Art. 26(4): the governing language is the one **agreed by the parties** — so "Indonesian controls" is a negotiation ask, not a legal requirement | pasal.id …/perpres-no-63-tahun-2019/pasal-26 |
| UU 27/2022 Art. 2 (extraterritorial), Art. 46 (3×24 h notice), Art. 56(2)-(4) (transfer bases), Art. 16(2)(g) (deletion after retention) | VERIFIED | pasal.id …/uu-no-27-tahun-2022/pasal-2, -46, -56, -16 |
| PP 33/2026: promulgated 16 Jul 2026, in force 16 Jan 2027 (Art. 225, +6 months) | VERIFIED via copies (datahukum, Hukumonline); official JDIH page not reachable | datahukum.com/peraturan/PP_33_Tahun_2026.html; pro.hukumonline.com |
| PP 33/2026: "11 minimum processor clauses" (issue #6) | **UNVERIFIED** — sources conflict (one lists 6 items "including"). AutoClaw did not flag this one. | verihubs.com/blog/pp-33-tahun-2026 |
| MK 127/PUU-XXIII/2025: 28 Aug 2025, petition "tidak dapat diterima" | VERIFIED (amar via pasal.id copy) | pasal.id/peraturan/putusan-mk/puu-mk-127-2025 |
| SEMA 3/2023: foreign-language contract without Indonesian translation is not a ground to cancel (exception: bad faith) | PARTLY (copy text matches; official PDF is a scan) — AutoClaw already marked the rumusan UNVERIFIED | pasal.id/peraturan/se/sema-3-2023 |
| Art. 436 Rv: foreign judgments not executable; re-litigate | PARTLY (secondary sources agree on the rule; exceptions disputed) — AutoClaw already marked UNVERIFIED | hukumonline.com klinik lt4d48c7e08e001 |
| HCCH 2019 Judgments Convention: Indonesia not a party; US signed only (2 Mar 2022) | VERIFIED | hcch.net status table cid=137 |

**Result:** no citation found WRONG. One unflagged claim (11 clauses) revised below. AutoClaw's own UNVERIFIED marks were accurate.

## 4. Reasoning checked by hand — what I revised
| Issue | AutoClaw said | Check against the NDA text | Revision |
|---|---|---|---|
| #1 / memo risk 1 | "Nothing stops Northwind" from using the sample data beyond the pilot / "however Northwind wants" | § 2(a) already limits use "solely for the Purpose" | Overstated. Real gap: no **express** ban on model training and no data-minimisation; keep the clause as a clarification. |
| #7 | Leak by Northwind then posted online → § 3(a) lets Northwind say "publicly available" | § 3(a) only applies "through no fault of the Receiving Party" | Wrong for Northwind's own leak; the added carve-out is redundant but harmless. Real risk is a leak via a **third party** (e.g. Northwind's processor). |
| #2 | After year 1, "§ 3 exceptions can be argued to strip residual protection" | After the Term of Confidentiality the duty simply ends; § 3 is not the mechanism | Conclusion (1 year too short for personal data) stands; reasoning corrected. |
| #6 | PP 33/2026 has 11 minimum processor clauses | Not verifiable | Reworded to "PP 33/2026 Art. 14 requires a written controller–processor agreement with minimum content (count unverified)". |
| #3 | "Indonesian version shall control" as the fix | Perpres 63/2019 Art. 26(4): parties choose | Kept as an ask; labelled as negotiation preference, not legal requirement. |

## 5. What others can reuse
1. Prompt template (`prompt.txt`): role + facts of who sends what data + named skills + 4 deliverables + "mark UNVERIFIED instead of guessing".
2. Quote checker: normalise quotes, split on "…", search source text (`verify_quotes.py` on the demo page).
3. Second-pass citation check against official sources, then a "what I revised" table.
