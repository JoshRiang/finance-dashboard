# Market Terminal

Aplikasi web all-in-one untuk memantau **berita**, **pasar global**, **indikator makro dunia**, dan **dealer positioning (GEX)** — dibangun dengan Laravel + Inertia + React.

> ⚠️ **Repository ini berisi modul keamanan yang sengaja dibuat rentan** (command injection & insecure JWT) untuk keperluan praktikum. **Jangan pernah men-deploy dengan `LAB_MODE=true` ke internet publik.**

---

## Fitur

- **Dashboard** — preview berita (dengan fade + "lihat selengkapnya"), data pasar, indikator makro, dan kalender ekonomi.
- **Berita** — agregasi RSS/Atom dari 20+ sumber dalam & luar negeri, dengan filter cakupan (Semua / Indonesia / Luar Negeri).
- **Pasar Global** — grafik ala TradingView (area + volume, crosshair, tooltip), pilihan layout **1 / 2 / 4 grafik**, 23 instrumen (indeks, komoditas, kripto, valuta), serta **8 timeframe** (`1D`–`MAX`).
- **Indikator Makro** — peta dunia (dark theme) interaktif + perbandingan 12 negara (PDB, inflasi, pengangguran), dan halaman detail per negara.
- **Kalender Ekonomi** — agenda berdampak tinggi/menengah dari Forex Factory, ditampilkan dalam UTC + waktu lokal.
- **Dealer GEX** — Options Dealer Positioning & Gamma Exposure untuk 16 aset (GLD, SPY, QQQ, NVDA, dst): Gamma Flip, Put/Call Wall, Motherwall, Expected Move, GEX per strike.
- **Autentikasi** — Laravel Fortify (login, registrasi, reset password, 2FA, passkey). *Verifikasi email dinonaktifkan.*

---

## Tech Stack

| Lapisan | Teknologi |
|---|---|
| Backend | PHP 8.3+, Laravel 13 |
| Auth | Laravel Fortify |
| Frontend | React 19 + TypeScript |
| Bridge | Inertia.js v3 |
| Styling | Tailwind CSS v4 |
| Routing types | Laravel Wayfinder |
| Database | MySQL 8.4 |
| Container | Laravel Sail (Docker) |

---

## Prasyarat

- Docker Desktop
- Node.js 20+ dan npm
- PHP 8.3+ & Composer (hanya jika menjalankan tanpa Docker)

---

## Menjalankan (Docker / Sail)

```bash
# 1. Jalankan container
docker compose up -d

# 2. Install dependency PHP di dalam container (sekali saja)
docker compose exec laravel.test composer install

# 3. Install dependency frontend
npm install

# 4. Migrasi database
docker compose exec laravel.test php artisan migrate

# 5. Jalankan Vite (hot reload)
npm run dev
```

Aplikasi tersedia di **http://localhost:8000**.

> Karena `vendor/` dipisah ke named volume (untuk performa di Windows), setiap kali Anda `composer require/update` di host, jalankan ulang `docker compose exec laravel.test composer install`.

### Build produksi aset

```bash
npm run build
```

---

## Konfigurasi Environment

Salin `.env.example` menjadi `.env`, lalu sesuaikan variabel penting:

```env
APP_NAME="Market Terminal"
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=laravel_app
DB_USERNAME=sail
DB_PASSWORD=password

# Modul keamanan (praktikum). Lihat peringatan di bawah.
LAB_MODE=true
LAB_JWT_SECRET=partner-secret-2024
LAB_JWT_ACCEPT_NONE=true
LAB_ADMIN_SECRET=FLAG{...}
```

---

## Halaman & Route

| Route | Deskripsi |
|---|---|
| `/` | Landing page |
| `/dashboard` | Ringkasan: berita, pasar, makro, kalender ekonomi |
| `/berita` | Semua berita (`?scope=domestic\|international`) |
| `/news/{id}` | Detail berita |
| `/pasar` | Grafik pasar (1/2/4 layout, multi-timeframe) |
| `/pasar/series` | JSON series harga (dipakai grafik) |
| `/indikator` | Peta indikator makro dunia |
| `/indikator/{iso3}` | Detail makro per negara |
| `/gex` | Dealer positioning & gamma exposure (`?symbol=GLD`) |
| `/settings/*` | Profil, keamanan, tampilan |
| `/system/diagnostics` | **Lab:** diagnostik DNS (command injection) |
| `/developer/partner` | **Lab:** console Partner API (JWT) |
| `/api/v1/partner/me`, `/api/v1/partner/admin` | **Lab:** endpoint API berbasis JWT |

---

## Sumber Data (gratis, tanpa API key)

- **Berita:** Antara, CNN Indonesia, Tempo, CNBC Indonesia, Republika, Katadata, BBC, Al Jazeera, The Guardian, NYT, CNBC World, TechCrunch, The Verge, Ars Technica, Engadget, Wired, Hacker News, DW, CNA.
- **Pasar:** Yahoo Finance (chart API).
- **Makro:** World Bank (indikator tahunan).
- **Kalender ekonomi:** Forex Factory (XML).
- **GEX:** Yahoo Finance options chain (GLD & lainnya) + perhitungan Greeks (Black-Scholes) sendiri.

Semua data di-cache (5–60 menit) untuk mengurangi beban sumber.

---

## 🧪 Security Lab (Sengaja Rentan)

Modul ini dibuat untuk latihan **command injection** dan **insecure JWT**. Dikontrol oleh `LAB_MODE`.

| Celah | Lokasi | Ringkasan |
|---|---|---|
| Command Injection | `GET /system/diagnostics/lookup?host=` | Input host diteruskan ke shell tanpa escape. |
| Insecure JWT | `GET /api/v1/partner/*` | Secret lemah **dan** menerima `alg: none`. |

**Aturan keselamatan:**

1. **Jangan** aktifkan `LAB_MODE=true` di lingkungan publik/produksi.
2. Jalankan hanya di jaringan/container terisolasi.
3. Untuk menonaktifkan: set `LAB_MODE=false` → endpoint lab otomatis `404`.
4. Ganti `LAB_JWT_SECRET` dan `LAB_ADMIN_SECRET` sesuai kebutuhan skenario.

---

## Testing

```bash
docker compose exec laravel.test php artisan test
```

Pemeriksaan gaya kode PHP:

```bash
vendor/bin/pint
```

Type-check frontend:

```bash
npm run types:check
```

---

## Struktur Proyek (ringkas)

```
app/
  Http/Controllers/        # Dashboard, News, Macro, Gex, Lab
  Services/                # NewsService, MacroService, EconomicCalendarService, GexService
  Support/                 # Jwt (lab)
  Models/
config/                    # fortify, lab, inertia, ...
routes/
  web.php                  # route utama + route lab
  settings.php
resources/js/
  pages/                   # dashboard, berita, pasar, indikator, gex, settings, auth
  components/              # deep-chart, asset-picker, world-map, economic-calendar, ...
  layouts/, hooks/, types/
public/world.svg           # peta dunia untuk halaman indikator
tests/Feature/             # News, Macro, Gex, EconomicCalendar, Lab, Auth, Settings
```

---

## Catatan

- Verifikasi email dinonaktifkan; pengguna baru langsung dapat mengakses dashboard.
- Jika menambah/mengubah route, regenerate helper TypeScript:

```bash
php artisan wayfinder:generate --with-form
```

---

## Lisensi

Dirilis di bawah lisensi **MIT**.
