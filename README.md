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

## Live (GitHub Pages)

https://wiraclogent-dotcom.github.io/byok-image-playground/

Setiap push ke `main` otomatis di-test, di-build, dan di-deploy oleh `.github/workflows/deploy.yml`.
Setup sekali: **Settings → Pages → Source: GitHub Actions**.

## Keamanan key

- Key disimpan di `localStorage` browser masing-masing pengunjung (per provider) dan hanya dikirim langsung ke provider yang dipilih — tidak pernah ke GitHub atau server lain.
- Tidak ada backend, jadi aman di-host statis (GitHub Pages). Tetap gunakan key dengan limit/budget, dan hapus key dari browser yang dipakai bersama.
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
