# TIRTA UNNES - Monitoring Air Sumur dan Gedung

Panduan terbaru: [Trial Sumur dan Gedung](docs/TRIAL-SUMUR-GEDUNG.md). Model lokasi mendukung WELL/BUILDING. Pratinjau memakai data contoh; akun login membaca metadata Supabase. Integrasi IoT belum aktif. Migrasi 003 belum diterapkan ke server.

## Jalankan lokal

```powershell
cd frontend
npm install
npm run dev
```

Buka **http://localhost:3000**, lalu pilih **Lihat pratinjau**. Tanpa kredensial, tombol Google menjelaskan bahwa konfigurasi belum tersedia. Akses tanpa sesi ke dashboard diarahkan ke login; demo menggunakan rute `/demo/` tersendiri.

Untuk HP di Wi-Fi yang sama, alamat pengembangan `http://192.168.1.11:3000/` sudah diizinkan di `allowedDevOrigins`. Jika IP laptop berubah, perbarui daftar tersebut di `next.config.ts`. Untuk mencoba versi produksi yang lebih ringan, hentikan dev server (Ctrl+C), jalankan `npm run build`, lalu `npm run preview:lan` dan buka alamat LAN yang sama. Preview HTTP LAN ditujukan untuk demo; Google OAuth dan pemasangan PWA gunakan localhost/HTTPS sesuai panduan konfigurasi.

## Build dan pengujian

```powershell
npm run lint
npm run build
npm run preview
```

`preview` melayani hasil statis di http://localhost:3000. Hentikan dev server sebelum preview. `out/` siap diunggah ke hosting statis subdomain; hosting tidak wajib mendukung Node.js. `npm start` juga menjalankan preview statis, bukan `next start`.

```powershell
npm test
```

Tes memakai Playwright dengan Chrome lokal, meliputi alur demo desktop/mobile dan perhitungan WIB/domain. Jalankan build dahulu; tes melayani `out/` sendiri pada port 4173 agar terpisah dari dev server. Bila Chrome belum terpasang, pasang Chrome atau ubah channel Playwright sesuai browser uji. Pengujian OAuth/RLS produksi memerlukan proyek Supabase; daftar skenarionya ada di panduan konfigurasi.

## Struktur frontend

- `frontend/src/components/`: antarmuka, peta, grafik, dan pengelolaan sesi.
- `frontend/src/lib/data.ts`: tipe dan repository simulasi terpisah dari tampilan.
- `frontend/src/lib/supabase.ts`: klien Supabase browser dengan PKCE.
- `frontend/src/app/auth/callback/`: callback login kompatibel static export.
- `supabase/migrations/001_water_auth.sql`: hook domain/identitas Google, skema awal, dan RLS SELECT.
- `frontend/public/`: manifest, ikon aplikasi, service worker, dan halaman offline.
- `frontend/tests/`: tes browser dan batas tanggal WIB.

Petunjuk lengkap: **[docs/SETUP.md](docs/SETUP.md)** — Google OAuth, redirect localhost/subdomain, Supabase hooks/RLS, hosting/PWA, kebutuhan data, dan rancangan browser sistem + deep link Capacitor.

Isi `frontend/.env.local` berdasarkan [frontend/.env.example](frontend/.env.example) hanya setelah konfigurasi Supabase siap. Jalankan `Copy-Item .env.example .env.local` dari folder `frontend/`. Jangan memasukkan service-role key atau Google client secret ke frontend. Data air tetap simulasi hingga adapter backend dibuat berdasarkan kontrak IoT final.

## Struktur proyek

```text
monitoring-air-unnes/
├── frontend/       # Satu-satunya aplikasi Next.js aktif
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   └── tsconfig.json
├── backend/        # Belum ada server
├── supabase/       # Migrasi SQL yang telah disiapkan
├── docs/
└── _legacy/        # Arsip aplikasi lama
```

Backend nantinya akan menggunakan Supabase untuk Auth, Realtime, Edge Functions, dan penerimaan data IoT. Folder `frontend/` adalah satu-satunya aplikasi Next.js aktif; `backend/` belum menjalankan server.
