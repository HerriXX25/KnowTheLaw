# KnowTheLaw — Panduan Pengelolaan Konten

## Cara Menambah Pasal Baru

Buka file JSON peraturan yang sesuai, contoh `data/uu-1-2023.json`, lalu tambahkan objek pasal baru di dalam array `pasal` pada bab yang tepat:

```json
{
  "id": "pasal-99",
  "nomor": "99",
  "judul": "Judul Singkat Pasal",
  "tags": ["Pemidanaan", "Pidana Penjara"],
  "bunyi": "Pasal 99\n(1) Bunyi lengkap pasal...\n(2) Ayat berikutnya...",
  "penjelasan": "Penjelasan resmi ayat (1): ...\n\nPenjelasan resmi ayat (2): ..."
}
```

**Catatan penting:**
- `id` harus unik dalam satu dokumen, gunakan format `pasal-[nomor]`
- `tags` harus menggunakan tag yang sudah ada dalam array `tags` di bagian atas dokumen JSON
- Gunakan `\n` untuk baris baru dalam `bunyi` dan `penjelasan`

---

## Cara Menambah Tag Baru

Tambahkan tag baru ke array `tags` di bagian atas file JSON peraturan:

```json
"tags": ["Pidana Mati", "Pidana Penjara", "TAG BARU ANDA", ...]
```

Lalu gunakan tag tersebut di field `tags` pada pasal-pasal yang relevan.

---

## Cara Menambah Bab Baru

Tambahkan objek bab baru ke array `bab` di file JSON peraturan:

```json
{
  "id": "bab-10",
  "nomor": "X",
  "judul": "Judul Bab Baru",
  "pasal": [
    { ... pasal-pasal di bab ini ... }
  ]
}
```

---

## Cara Menambah Peraturan Baru di Kategori SEMA

1. Buat file JSON baru di folder `data/`, contoh `data/sema-1-2023.json`
2. Gunakan struktur yang sama dengan file JSON yang sudah ada
3. Daftarkan peraturan baru di `data/katalog.json` pada bagian `subkategori` kategori SEMA:

```json
{
  "id": "sema",
  "label": "SEMA",
  "subkategori": [
    { "id": "sema-1-2023", "label": "SEMA No. 1/2023", "file": "data/sema-1-2023.json" }
  ]
}
```

---

## Struktur Folder

```
knowthelaw/
├── index.html
├── tentang.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── data/
│   ├── katalog.json       ← Daftar kategori & subkategori
│   ├── uu-1-2023.json     ← Data KUHP (bab + pasal + penjelasan)
│   ├── uu-1-2026.json
│   ├── uu-20-2025.json
│   └── kuhperdata.json
└── pdfs/
    └── (file PDF opsional)
```
