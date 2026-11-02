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

## Kontrol generate

- **SemutSSH / Custom (gpt-image-2)**: Ukuran (Auto, 1024², 1536×1024, 1024×1536, 2K, 4K eksperimental), Kualitas (Auto/Low/Medium/High — pengaruh terbesar ke biaya), Format (PNG/JPEG/WebP). Opsi default (auto, png) tidak dikirim ke API.
- **OpenRouter**: rasio 1:1 / 3:2 / 2:3.
- **Style preset** (semua provider): teks style ditambahkan ke prompt; prompt final bisa dilihat sebelum generate.
- **Background transparan (chroma key)**: gpt-image-2 tidak mendukung `background: transparent`. Kalau dicentang, prompt meminta background warna solid (default `#FF00FF`), lalu warna itu dihapus di browser → download PNG transparan. Toleransi bisa diatur dan hasil bisa diproses ulang; tepi diberi despill supaya tidak ada fringe warna.

## Monitoring token & biaya

- Setiap hasil generate menampilkan token input/output/total dan biaya (USD + Rupiah), plus `usage` mentah dari provider.
- **OpenRouter**: biaya **aktual** dari respons (`usage.cost`).
- **SemutSSH / Custom**: biaya **perkiraan** = token × harga per 1M token. Default `gpt-image-2` di SemutSSH: **$5 input / $30 output per 1M** — dihitung dari spend log SemutSSH dan sama dengan harga OpenAI (dokumentasi SemutSSH menulis output $0, itu keliru). Model lain: isi harga manual di Pengaturan.
- Panel **Monitoring** merangkum total generate, token, dan biaya per model; tersimpan di localStorage (hanya angka, bukan gambar). Kurs Rp/$ bisa diubah.
- Sisa budget SemutSSH tidak tersedia lewat API — cek di dashboard [app.semutssh.com](https://app.semutssh.com) → AI Service.

## Keamanan key

- Key disimpan di `localStorage` browser masing-masing pengunjung (per provider) dan hanya dikirim langsung ke provider yang dipilih — tidak pernah ke GitHub atau server lain.
- Tidak ada backend, jadi aman di-host statis (GitHub Pages). Tetap gunakan key dengan limit/budget, dan hapus key dari browser yang dipakai bersama.
- Provider Custom harus mengizinkan CORS dari browser; kalau tidak, akan muncul pesan "Gagal menghubungi provider".

## Struktur

```
src/
  providers.js       preset provider + adapter (openrouter / openai) + parsing respons
  usage.js           parsing usage token, hitung biaya, ringkasan, format USD/IDR
  options.js         daftar ukuran/kualitas/format/style + penyusun prompt final
  chromaKey.js       hapus background warna solid (canvas) + despill
  Controls.jsx       kontrol generate (ukuran, kualitas, format, style, chroma key)
  ResultCard.jsx     kartu hasil: gambar, token, biaya, download
  storage.js         simpan/muat state & log usage di localStorage
  App.jsx            state utama, layout dua kolom
  Settings.jsx       provider, API key, tes koneksi, pilih model, harga model
  Usage.jsx          panel monitoring token & biaya
  Playground.jsx     prompt, rasio, generate, galeri hasil (per sesi)
  *.test.js          unit test (npm test)
```

## Test

```bash
npm test
```
