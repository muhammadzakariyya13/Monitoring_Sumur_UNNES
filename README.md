# TIRTA UNNES - Monitoring Air Sumur dan Gedung

Panduan terbaru: [Trial Sumur dan Gedung](docs/TRIAL-SUMUR-GEDUNG.md). Model lokasi mendukung WELL/BUILDING. Pratinjau memakai data contoh; akun login membaca metadata Supabase. Integrasi IoT belum aktif. Migrasi yang tersedia di repository tidak otomatis diterapkan ke server.

## Jalankan lokal

```powershell
cd frontend
npm install
npm run dev
```

Buka **http://localhost:3000**, lalu pilih **Lihat pratinjau**. Tanpa kredensial, tombol Google menjelaskan bahwa konfigurasi belum tersedia. Akses tanpa sesi ke dashboard diarahkan ke login; demo menggunakan rute `/demo/` tersendiri.

Untuk HP di Wi-Fi yang sama, jalankan `npm run dev -- --hostname 0.0.0.0`, lalu buka `http://192.168.1.12:3000/login/`. Host `192.168.1.11` dan `192.168.1.12` diizinkan di `allowedDevOrigins`. Jika IP laptop berubah, perbarui daftar tersebut di `frontend/next.config.ts` dan restart dev server. Next.js juga memeriksa origin koneksi development; halaman HTML bisa tampil meskipun koneksi development ditolak.

Rute `/demo/` bersifat publik dan selalu memakai data contoh dengan peran VIEWER, tanpa menunggu validasi Supabase atau marker sessionStorage. Rute privat tetap memerlukan validasi akun UNNES dan hak akses backend.

Untuk mencoba versi produksi yang lebih ringan, hentikan dev server (Ctrl+C), jalankan `npm run build`, lalu `npm run preview:lan` dan buka alamat LAN yang sama. Preview HTTP LAN ditujukan untuk demo; Google OAuth dan pemasangan PWA gunakan localhost/HTTPS sesuai panduan konfigurasi.

## Admin dummy untuk mencoba tampilan

Buka **http://localhost:3000/demo/admin/** tanpa login. Demo lengkap mencakup Dashboard, Peta, Riwayat, Pengguna, dan Kelola Titik Monitoring. Data memakai **Admin Dummy** (`admin@example.invalid`) dan Viewer Dummy. Tambah/edit titik, jumlah pegawai, batas pemakaian, notifikasi, ubah role/status, dan hapus pengguna hanya simulasi lokal; tidak mengirim email atau mengakses Supabase. Reload mengembalikan data awal. Akun dummy tidak dapat dipakai login ke `/admin/`.

## Admin: pengelolaan pengguna Supabase

Login sebagai Admin, lalu buka `/admin/` dan pilih **Pengelolaan > Pengguna** (HP: Kelola > Pengguna). Halaman memakai akun sebenarnya: undang pengguna, ubah role, aktif/nonaktifkan, hapus dengan konfirmasi, dan refresh. Akun sendiri dilindungi; demo lokal tersedia terpisah di `/demo/admin/`. `/demo/` tetap Viewer.

**Mulai dari [panduan langkah demi langkah Admin](docs/ADMIN-USERS.md)**: migrasi 004, Auth hooks, template undangan, SMTP, deploy Edge Function, environment Vercel, membuat Admin pertama, serta pengujian. Next.js tetap static export; secret hanya berada di Edge Function Supabase. Resource Supabase production belum diubah oleh pekerjaan ini.

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

Tes khusus race condition auth ada di `frontend/tests/auth-configured.spec.ts`. Untuk menjalankannya, buat build dengan variabel proses `NEXT_PUBLIC_SUPABASE_URL=https://tirta-auth-test.supabase.co` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=test-publishable-key`, lalu jalankan `npx playwright test tests/auth-configured.spec.ts` dengan `TIRTA_AUTH_TEST=1`. Semua request Supabase pada tes ini diintersep, tanpa akun/backend nyata. Setelah tes, pulihkan variabel proses dan jalankan build normal kembali; jangan gunakan build dummy untuk aplikasi. Tes ini dilewati dalam suite standar.

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
├── supabase/       # Migrasi SQL dan Edge Function Admin
├── docs/
└── README.md
```

Backend nantinya akan menggunakan Supabase untuk Auth, Realtime, Edge Functions, dan penerimaan data IoT. Folder `frontend/` adalah satu-satunya aplikasi Next.js aktif; `backend/` belum menjalankan server.

## Batas pemakaian Gedung

Panduan [batas harian dan notifikasi](docs/BUILDING-USAGE-LIMITS.md): migrasi 005, pengaturan Admin, status Viewer, rumus, deduplikasi, dan uji staging. Pengaturan hanya mengubah metadata batas, bukan hasil sensor.
