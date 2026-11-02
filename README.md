# BYOK Image Playground

Playground sederhana untuk generate gambar dengan konsep **Bring Your Own Key**.
Masukkan API key provider, tes koneksi, pilih model, lalu generate — semua jalan di localhost.

## Menjalankan

```bash
npm install
npm run dev
```

Buka http://localhost:5173

## Provider

| Provider | Base URL | Cara generate |
|---|---|---|
| OpenRouter | `https://openrouter.ai/api/v1` | `POST /chat/completions` dengan `modalities` |
| SemutSSH | `https://ai.semutssh.com` | `POST /images/generations` (OpenAI-compatible) |
| Custom | isi sendiri | `POST /images/generations` (OpenAI-compatible) |

- **Tes Koneksi**: OpenRouter → `GET /key` + `GET /models?output_modalities=image`; lainnya → `GET /models`.
- **Daftar model**: default hanya model gambar (OpenRouter dari `output_modalities`, lainnya dari nama ID). Centang "Tampilkan semua model" atau ketik ID manual kalau model tidak terdeteksi.
- Menambah gateway OpenAI-compatible lain: tambahkan satu entri di `PROVIDERS` pada `src/providers.js`.

## Keamanan key

- Key disimpan di `localStorage` browser (per provider) dan hanya dikirim ke provider yang dipilih.
- Tidak ada backend. Jangan deploy app ini ke publik — ini untuk pemakaian lokal.
- Provider Custom harus mengizinkan CORS dari browser; kalau tidak, akan muncul pesan "Gagal menghubungi provider".

## Struktur

```
src/
  providers.js       preset provider + adapter (openrouter / openai) + parsing respons
  storage.js         simpan/muat state di localStorage
  App.jsx            state utama, layout dua kolom
  Settings.jsx       provider, API key, tes koneksi, pilih model
  Playground.jsx     prompt, rasio, generate, galeri hasil (per sesi)
  providers.test.js  unit test (npm test)
```

## Test

```bash
npm test
```
