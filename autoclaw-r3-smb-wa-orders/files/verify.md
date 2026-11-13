# Verification — WhatsApp order tool for "Dapur Bu Rini" (T03, 2026-11-13)

Built by AutoClaw (model cbcn/glm-5.3, website-builder skill) in one run (~7 min): single-file `index.html`
(no CDN, localStorage), `window.parseChats()`, README, 36 self-written unit assertions.

## Test sets (all fictional, labelled by hand; totals/stock computed from the labels)
| Set | Messages | Customers with orders | Seen by AutoClaw? | Seen by me while fixing? |
|---|---|---|---|---|
| main (`chats.txt`) | 40 | 20 | yes (it was the brief) | yes |
| holdout 1 | 30 | 13 | no | yes — used to find bugs |
| holdout 2 | 25 | 10 | no | written after fix round 1; first score is blind |

Scoring script: `test_parser.py` loads the page in headless Chromium, calls `parseChats`, compares with the key.
Sanity check: a mock that returns the key scores 20/20 and 38/38.

## Results
| Version | Set | Orders exact | Item lines | Extra lines | Stock after | Total (expected → parsed) |
|---|---|---|---|---|---|---|
| v1 AutoClaw | main | 20/20 | 38/38 | 0 | 12/12 | Rp 6,515,000 → 6,515,000 |
| v1 AutoClaw | holdout 1 | **9/13** | 18/21 | 8 | 7/12 | Rp 3,275,000 → 3,500,000 |
| v1 AutoClaw | holdout 2 | **6/10** | 13/15 | 8 | 6/12 | Rp 1,825,000 → 2,370,000 (+30%) |
| v3 (fix round 1) | holdout 2 — **blind** | **7/10** | 13/15 | 4 | 8/12 | Rp 1,825,000 → 1,795,000 (−1.6%) |
| v4 (fix round 2) | main / holdout 1 / holdout 2 | 20/20 · 13/13 · 10/10 | 38/38 · 21/21 · 15/15 | 0 | 12/12 | all exact |

Lesson: 100% on the data the builder saw meant nothing — on new chats the first version overcharged by 30%.
v4's 100% on holdout 2 is **not** blind (I fixed against it); the honest blind number is 7/10 for v3.
AutoClaw's own 36 assertions still pass on v4.

## What failed and what I changed (all in `parseChats`, marked "revisi manual" in the code)
| Phrase customers used | v1 did | Fix |
|---|---|---|
| "pastelnya ga jadi", "cancel ya semua pesanan", "ga usah", "batalin" | ignored (only "batal" known) | wider cancel vocabulary |
| "bolu pandannya ga jadi, nastar aja" | cancelled both / reset qty | items after the cancel phrase are kept, not cancelled |
| "kastengelnya 3 deh" (item already ordered) | added 3 → 5 | "-nya" on an ordered item, "deh/dong/ganti" = set, not add |
| "pastelnya kurangi 1" | set to 1 | relative subtract |
| "Bolu Pandan x2", "3x risol" | read as 1 | "2x"/"x2" quantities |
| "saya ambil 2 brownies + 1 bolu" | gave each item the next number | numbers-before-items mode |
| "tolong anterin" | no delivery fee | more delivery words |
| "ganti bolu pandannya jadi bolu cokelat" | kept both | swap keeps the quantity |

Still not handled (documented limits): orders split over several messages without product names ("yang tadi 2 lagi"),
voice notes/images, quantities like "setengah lusin", prices negotiated in chat.
