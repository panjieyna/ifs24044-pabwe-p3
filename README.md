# LaciKu — Studi Kasus PABWE P3

> ⚠️ **Sebelum dikumpulkan:** ganti nama folder proyek ini dari
> `usernamekamu-pabwe-p3` menjadi `{username-kamu}-pabwe-p3`
> (contoh: `ifs18005-pabwe-p3`) sesuai ketentuan.

Aplikasi web satu halaman dengan tiga fitur, dipisah menggunakan tab:

1. **Catatan Pengeluaran Harian (Expense Tracker)** — CRUD transaksi, ringkasan saldo, cari/filter/sort, validasi input, modal ubah & hapus.
2. **Bookmark / Link Manager** — CRUD bookmark, validasi URL (`http://`/`https://`), buka tautan di tab baru, cari & sort.
3. **Kuis Interaktif (Quiz App)** — 6 soal pilihan ganda (array of object), skor, high score, bisa diulang.

## Struktur Proyek

```
usernamekamu-pabwe-p3/
├── index.html          # markup semantik: header, nav (tab), main (3 panel), footer, modal
├── assets/
│   ├── script.js       # seluruh logika JS, dikelompokkan per fitur (IIFE) + util bersama
│   └── img/            # opsional, belum dipakai
└── README.md
```

## Poin Teknis Penting

- **Tab aktif disimpan & dipulihkan lewat query string URL**, bukan localStorage —
  contoh: `index.html?tab=bookmark`. Lihat modul `TabNavigation` di `assets/script.js`.
- **Key localStorage terpisah per fitur** agar data tidak saling menimpa:
  - `laciku_expenses_v1`
  - `laciku_bookmarks_v1`
  - `laciku_quiz_highscore_v1`
- Semua logika JS ada di `assets/script.js`, tidak ada `onclick="..."` inline di HTML.
- Setiap fitur dibungkus dalam **IIFE** terpisah (`ExpenseTracker`, `BookmarkManager`, `QuizApp`)
  agar tidak saling bentrok / mencemari variabel global (separation of concern).
- Ubah dan hapus data memakai **modal**, bukan `prompt()`/`confirm()` bawaan browser.
- Styling memakai Tailwind CSS (CDN), Google Fonts (Fraunces + Work Sans), dan Tabler Icons (CDN).
  Tidak ada backend / fetch — sepenuhnya client-side.

## Cara Menjalankan

Cukup buka `index.html` langsung di browser (double-click atau `Live Server` di VS Code).
Tidak memerlukan server backend.

## Yang Perlu Disesuaikan Sebelum Dikumpulkan

- [ ] Ganti nama folder sesuai username kamu.
- [ ] Cek ulang: apakah kode di atas masih terasa seperti "template"? Tambahkan sentuhan personal
  (misalnya kategori pengeluaran, topik soal kuis, atau gaya visual) supaya tidak dianggap
  copy-paste mentah dari contoh manapun.
- [ ] Uji tiga tab, CRUD di masing-masing fitur, refresh halaman untuk pastikan data & tab tersimpan.
- [ ] Uji tampilan responsive di DevTools (mode mobile) dan di layar desktop.
