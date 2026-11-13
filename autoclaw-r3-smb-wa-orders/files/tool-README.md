# Dapur Bu Rini — Alat Kelola Pesanan WhatsApp

Alat web satu-file untuk home bakery "Dapur Bu Rini" (Bandung) yang menerima semua
pesanan lewat WhatsApp. Bu Rini tinggal menempel (paste) ekspor chat WhatsApp ke
halaman ini, dan alatnya mengubah chat mentah menjadi: pesanan per pelanggan,
sisa stok, tagihan per pelanggan, dan ringkasan harian.

## Cara pakai

1. Buka `index.html` di browser (Chrome/Firefox di HP pun cukup — tidak butuh internet).
2. Di WhatsApp: buka chat grup/tujuan → Menu → Lainnya → **Ekspor chat** (tanpa media),
   lalu buka file `.txt`-nya dan salin isinya.
3. Tempel ke kotak "Tempel Chat WhatsApp" (atau unggah file `.txt`-nya langsung),
   lalu tekan **Proses Pesanan**.
4. Hasilnya muncul: pesanan per pelanggan, sisa stok, ringkasan harian, tombol
   **Cetak Struk** dan **Salin untuk WhatsApp** per pelanggan, dan **Unduh CSV**.
5. Isi halaman tersimpan otomatis di `localStorage` browser — buka lagi besok,
   pesanan kemarin masih ada. Tekan **Bersihkan** untuk mulai hari baru.

Tidak ada server, tidak ada CDN, tidak ada pihak ketiga. Semua CSS dan JS ada di
dalam satu file `index.html` dan semua data tetap di perangkat Bu Rini.

## Cara kerja parser

Parser (`window.parseChats(chatText, catalog)`) membaca baris demi baris dengan
format ekspor WhatsApp `[13/11/26 07.58] Nama: pesan` dan menerapkan aturan
sesuai urutan waktu (pesan yang datang belakangan menang):

1. **Normalisasi** — huruf kecil, emoji dibuang, pemisah `+` `,` `;` `.` dijadikan spasi.
2. **Pengenalan produk** — nama produk dan semua alias di katalog dicocokkan
   (alias terpanjang menang, jadi "brownies kukus" tidak salah jadi "brownies").
   Akhiran "-nya" diizinkan ("nastarnya", "bolu coklatnya"). Tipografi umum
   tertangani: "bolcok", "brokus", "kaastengel", "soes", "brownis".
3. **Angka kata** — `satu, dua, tiga … duabelas` diterjemahkan menjadi angka,
   selain angka biasa ("donat dua", "2 toples").
4. **Jumlah produk** — angka *setelah* nama produk dipakai ("bolu pandan 2");
   kalau tidak ada, angka *sebelum* nama ("2 nastar"); kalau tetap tidak ada, jumlah 1.
5. **Perubahan jumlah** — pesan dengan kata `jadi`/`jd`, `tambah`, `kurang`, atau
   `aja` dianggap perubahan:
   - "nastarnya **jadi 3** aja" → Nastar jadi 3
   - "tambah 1 lagi ya **jadi 3**" → jumlah final 3
   - "**kurangin jadi 4**" → jumlah final 4
   - "lapis legitnya **1 aja**" → jumlah final 1
   - "tambah 1 lagi" (tanpa jumlah final) → jumlah lama + 1
6. **Pembatalan** — "…**nya batal**" membatalkan item itu saja; "**semua pesanan
   saya batal**" menghapus semua pesanan pelanggan itu. Item yang dibatalkan
   dicatat di daftar `cancelled`.
7. **Bukan pesanan** — makasih, konfirmasi transfer ("udah transfer", "sudah tf"),
   dan pertanyaan ("jam brp bisa diambil?") tidak memuat produk dan otomatis
   diabaikan. Pertanyaan ketersediaan ("ada bika ambon ga bu?") juga bukan pesanan.
8. **Produk tak dikenal** — barang yang diminta/ditanya tapi tidak ada di katalog
   masuk daftar `unknown` (contoh: bika ambon, kue lumpur).
9. **Pengantaran** — kata `antar`, `anter`, `dianter`, `kirim`, `dikirim`,
   `antarin`, `kirimin`, `diantarin` menandai pesanan itu untuk diantar
   dan menambah ongkir (Rp10.000) ke tagihannya. "diambil"/"ambil" berarti ambil sendiri.

Hasil `parseChats` berbentuk:

```js
{
  orders:    [{ customer, items: [{ code, qty }], delivery }],
  unknown:   [{ customer, text }],
  cancelled: [{ customer, code, qty }]
}
```

Fungsi ini **murni** (tidak menyentuh DOM sama sekali) sehingga bisa diuji otomatis,
misalnya lewat `window.parseChats("…", catalog)` di konsol browser. Ada juga
`window.computeStats(orders, catalog)` yang menghitung sisa stok, pendapatan,
dan jumlah pelanggan dari hasil parse.

## Bagian-bagian aplikasi

| Bagian | Isi |
|---|---|
| **Pesanan per Pelanggan** | Rincian item + harga, subtotal, ongkir (bila diantar), total; badge "DIANTAR"/"AMBIL SENDIRI"; tombol Cetak Struk (struk 58 mm siap print) dan Salin untuk WhatsApp (teks dengan format `*tebal*` WhatsApp). |
| **Sisa Stok** | Stok awal → sisa setelah semua pesanan; bilah warna; peringatan **stok rendah** (sisa ≤ 3), **habis** (0), dan **oversold** (sisa minus — mis. Kastengel terpesan 9 dari stok 8 di data uji). |
| **Ringkasan Harian** | Jumlah pelanggan, unit terjual, pengantaran, total pendapatan; unit & pendapatan per produk; ekspor **CSV** (UTF-8 + BOM, aman dibuka di Excel). |

Katalog bawaan (12 produk, harga, stok, alias, ongkir, batas stok rendah) tertanam
di `index.html`. Kalau mau dipakai dengan katalog lain: unggah file `catalog.json`
melalui tombol unggah — file JSON yang punya `products` akan mengganti katalog,
sementara file `.txt` dianggap chat.

## Batasan

- **Hanya format ekspor WhatsApp** `[DD/MM/YY HH.MM] Nama: pesan`. Format 12-jam
  dengan AM/PM atau `[DD/MM/YYYY, HH:MM:SS]` versi iPhone tidak didukung (nama
  pengirim juga bisa ikut terpotong di iPhone).
- **Urutan = waktu ekspor.** Perubahan ("jadi 3") dipakai begitu saja; kalau
  pelanggan menulis pesanan baru untuk produk yang sama tanpa kata perubahan,
  jumlahnya dijumlahkan, bukan diganti.
- **Angka kata terbatas** sampai "duabelas"; " dua belas" yang dipisah spasi tidak dikenali.
- **Satu nama = satu pelanggan.** Dua orang bernama sama di chat akan tergabung.
- **Produk tak dikenal hanya dilaporkan**, tidak dihitung ke stok/pendapatan;
  pertanyaan ketersediaan yang menyebut produk yang dikenal (mis. "ada nastar ga?")
  diabaikan, tidak dihitung sebagai pesanan.
- **Deteksi "bukan pesanan" berbasis kata kunci** (produk tidak disebut, atau
  ada kata batal/ada/tanya). Bahasa gaul baru di luar daftar bisa lolot.
- **"kirim" yang berarti lain** (mis. "kirim fotonya dulu") akan salah ditandai
  sebagai minta diantar.
- **Stok tidak berkurang permanen** — stok awal selalu dari katalog setiap kali
  diproses; alat ini untuk satu hari/transkrip sekali proses, bukan pembukuan
  lintas hari. Kalau butuh multi-hari, simpan CSV per hari.
- **localStorage per browser & per perangkat** — ganti HP = data hilang; ekspor
  CSV dulu sebelum ganti perangkat. Mode privat/incognito bisa menolak penyimpanan.
- Emoji dibuang saat parsing, jadi emoji sebagai bagian dari nama produk tidak cocok.

## Pengujian

`test-output.txt` berisi hasil menjalankan `parseChats` terhadap seluruh
`chats.txt` (40 pesan, 13/11/26): 20 pelanggan aktif, 3 item dibatalkan
(Hendra: Putri Salju; Siska: Kastengel + Nastar karena "semua pesanan saya batal"),
2 produk tak dikenal (bika ambon — Rudi, kue lumpur — Joko), 4 pesanan diantar,
pendapatan total Rp6.515.000 (Rp6.475.000 produk + Rp40.000 ongkir).
Parser juga lolos 36 asersi otomatis (satu per pelanggan/per aturan) saat diuji headless.
