# Memo — Common Paper MNDA (Northwind → PT Sinar Data)

**To:** CEO, PT Sinar Data Nusantara
**From:** Contract review (not legal advice; this is a deal-risk brief)
**Date:** 13 November 2026
**Paper:** Mutual NDA, Common Paper MNDA v1.0, Cover Page filled in. Effective Date 12 November 2026. Term 1 year. Confidentiality 1 year. Delaware law. Delaware courts (New Castle).

**Bottom line:** Do **not** sign this paper as-is if you will send Northwind real customer names, phone numbers, and delivery addresses. It is a normal US-style NDA for API documents. It is **not** a personal-data agreement. Fix five things first.

---

## Top 5 risks, in plain words

### 1. Your customers’ data can be used however Northwind wants for the “pilot”
The Purpose says Northwind may look at “sample shipment data.” That sample will contain your customers’ names, phones, and addresses. Nothing in the NDA says: use only what you need, and do **not** use it to train Northwind’s products. That is the biggest commercial and legal hole.

### 2. The paper says nothing about Indonesia’s personal-data law
Sending customer personal data to a US company is a transfer under Indonesia’s PDP Law (Law No. 27 of 2022). The NDA never mentions personal data, never mentions that law, never requires Northwind’s cloud vendors to sign proper processor terms, and never requires Northwind to tell you within 24 hours if the data leaks. If you send the data under this NDA alone, **you** are the one who has to explain that transfer to the Indonesian authority.

### 3. You would have to sue in Delaware — and you still could not collect in Indonesia
The NDA picks Delaware law and exclusive Delaware courts (New Castle). A Delaware judgment is **not directly enforceable in Indonesia**. There is no Indonesia–US Hague judgment convention, and Indonesian civil procedure (Art. 436 Rv) does not treat foreign judgments as executable. You would have to start a new lawsuit in Indonesia and hope the judge accepts the Delaware paper as evidence. An American injunction against Northwind also will not automatically work here. Pick Indonesian courts.

### 4. The NDA is English-only
Law No. 24 of 2009 Art. 31 says Indonesian must be used in agreements involving an Indonesian private company, and a second language (English is fine) when there is a foreign party. An English-only NDA is usually **not void** (the Supreme Court’s SEMA 3/2023 takes that view, and the Constitutional Court in August 2025 did not rewrite Article 31). It is still a compliance miss, and it hurts you if a judge ever has to read the paper against an Indonesian translation. Ask for bilingual Indonesian + English, Indonesian controlling.

### 5. Confidentiality dies after one year, and “deleted” can mean “still in backups”
The NDA lasts one year, confidentiality lasts one year. A pilot that becomes a real integration will outlive that. On exit, Northwind may keep your customers’ data in “standard backups” for as long as it likes. For personal data that is too loose.

---

## What to ask Northwind for

Ask for these five, in this order. Do not trade away 1–3 to get 4–5.

1. **Purpose limit + no training.** Sample data = minimum fields only. Northwind shall not use it to train, improve, or benchmark any Northwind product other than this pilot.
2. **A short personal-data add-on** (three sentences on the Cover Page is enough):
   - Personal data is used only for the pilot and in line with Law No. 27 of 2022.
   - Cloud/processor vendors need a written contract (no freelancing with the data).
   - If the data leaks, Northwind tells you within 24 hours.
3. **Indonesian courts.** Change “New Castle, DE” to “courts of the Republic of Indonesia.” If they refuse Delaware law, still insist on Indonesian courts for anything involving your customer data.
4. **Bilingual contract.** Indonesian + English, Indonesian version controls.
5. **Longer confidentiality (3 years) and a real deletion rule.** Personal data destroyed or returned within 10 business days; backups of personal data gone in 90 days.

Nice to have if they are in a good mood: a carve-out so the “public information” exception does not apply to your customers’ data if **Northwind** leaked it; a sentence that the “as is” disclaimer does not cover personal data; a rule that government requests only get the minimum data required.

---

## What is fine to accept as is

- **Mutual NDA.** You receive their API docs and pricing; they receive your shipment sample. Mutual is fair.
- **“Reasonable standard of care”** for ordinary confidential information (Section 2(c)). Market.
- **Need-to-know sharing** with employees and contractors (Section 2(b)), **if** you also get the processor terms in ask #2 for personal data.
- **Standard exceptions** (already public, already known, third-party, independent development) for ordinary confidential information. Watch the public-information exception if they leak personal data — that is ask-level, not a deal-breaker if ask #2 is agreed.
- **Either party can walk away** with notice (Section 5). Normal for an NDA.
- **No IP license** (Section 7). Correct. You are not buying their API.
- **“As is” disclaimer** (Section 8) for their **API documentation and pricing**. Acceptable. Do not let it cover your customers’ personal data.
- **Equitable relief / injunctions** (Section 10). Keep it — it protects you too once the court is Indonesian.
- **No obligation to actually do the deal** (Section 11). Correct for an NDA.
- **Assignment on a sale of the company** (Section 11). Normal; the PDP clause is the real protection.
- **One-year MNDA term** is acceptable **only if** confidentiality is extended (ask #5) and you can re-sign or go to a commercial contract before the pilot ends.

---

## One-page action

| Do this | Do not do this |
|---------|----------------|
| Send back the redline (`NDA-redline.docx`) | Sign the Cover Page as sent |
| Insist on asks 1–3 before any live customer data leaves your systems | Send a “sample” that is actually a full customer dump |
| Use a stripped sample (fake names / city only) if Northwind stalls | Assume “confidential” = “complies with the PDP Law” |
| Keep Indonesian counsel on the PDP transfer (Art. 56) before production | Rely on a Delaware judgment to stop a leak in Indonesia |

This memo is a business brief. It is not a formal legal opinion. The redline is the negotiation paper.
