# Draf thread X untuk poidh base/1525 ($OFFR)

Posting dari akun X kak (@lupilupipuli). **Post 1 harus berupa QUOTE dari** https://x.com/RealShark77/status/2116888075980976457 .
Sumber semua angka: README + docs repo https://github.com/SharkCube99/offline-research-android (diambil 2026-11-02).
Kaitan OFFR dengan repo itu: alamat pembuat bounty 1525 (0xdface0bf…) = pengirim klaim 'Offline Research' SharkCube99 di poidh mainnet/31, dengan demo dari @RealShark77.

Aturan bounty: tanpa prediksi harga, tanpa janji keuntungan, tanpa klaim mengalahkan AI lain. Draf ini sudah mematuhinya. Silakan ubah gaya bahasanya, karena kreator menolak thread yang terasa seperti spam AI.

## 1/7  (236 karakter menurut hitungan X)

```
OFFR (Offline Research) by @RealShark77 is an Android app that answers research questions with zero internet. It searches a library stored on the phone and cites the passages it used.

How it works, who it's for, and its honest limits 🧵
```

## 2/7  (259 karakter menurut hitungan X)

```
How it works: a small model (Qwen3-1.7B) turns your question into searches. SQLite full-text search then finds passages in a 24.6 GB library on the phone: Wikipedia (most-viewed 31%), all of Wikivoyage, places by city, first aid, travel facts, Ethereum texts.
```

## 3/7  (235 karakter menurut hitungan X)

```
A bigger model writes the answer with [1]-style citations you can tap to open the source.

Under 10 GB RAM: Qwen3-4B.
From 10 GB: Qwen3.6-35B-A3B at 2 bits, a mixture-of-experts model larger than the phone's RAM, streamed from storage.
```

## 4/7  (215 karakter menurut hitungan X)

```
Offline by design: the app has no network permission (a script checks every build) and no Google Play Services. Unit conversions use exact arithmetic, and any part answered without a source is labelled as unsourced.
```

## 5/7  (197 karakter menurut hitungan X)

```
Who it's for: travellers, people with weak or no signal, anyone who doesn't want their questions to leave the phone, and builders exploring on-device AI.

Open source (MIT): github.com/SharkCube99/offline-research-android
```

## 6/7  (273 karakter menurut hitungan X)

```
Honest limits, from the repo's own logs:
- 54% of a frontier AI with web search, on 61 questions that were also used for tuning; graders vary ~10 pts
- 40 held-out questions not run yet
- only tested on an 8 GB phone: ~3 min per answer (4B), ~8.5 min (35B)
- needs 29-39 GB
```

## 7/7  (185 karakter menurut hitungan X)

```
Project: @OFFR54
Creator: @RealShark77
Token on Base: 0xee9069e8f520652e59674fad2120f6dea2671ba3

Disclosure: I'm entering this thread in a poidh bounty (#bounty). Not financial advice.
```
