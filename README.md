# LaciKu — Studi Kasus PABWE P3


Aplikasi web satu halaman dengan tiga fitur, dipisah menggunakan tab:

1. **Catatan Pengeluaran Harian (Expense Tracker)** — CRUD transaksi, ringkasan saldo, cari/filter/sort, validasi input, modal ubah & hapus.
2. **Bookmark / Link Manager** — CRUD bookmark, validasi URL (`http://`/`https://`), buka tautan di tab baru, cari & sort.
3. **Kuis Interaktif (Quiz App)** — 6 soal pilihan ganda (array of object), skor, high score, bisa diulang.

## Struktur Proyek

```
ifs24044-pabwe-p3/
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
