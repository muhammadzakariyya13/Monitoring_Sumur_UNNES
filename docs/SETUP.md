# Konfigurasi Supabase, hosting, dan APK

> Pembaruan: aplikasi kini mendukung email/password dan reset sandi selain Google. Ikuti [EMAIL-AUTH.md](EMAIL-AUTH.md) untuk migrasi 002 dan konfigurasi terbaru; aturan Google-only di bawah menggambarkan konfigurasi awal migrasi 001.

## Status implementasi

Frontend memakai Next.js App Router, TypeScript, Tailwind CSS dengan gaya komponen, React Leaflet, Recharts, dan Supabase JS. Seluruh data air masih simulasi, termasuk setelah login kampus. Tidak ada endpoint ingest IoT atau akses data produksi yang diaktifkan. Nama Tirta UNNES dan ikon tetes air adalah identitas sementara, bukan logo resmi universitas.

`src/lib/data.ts` memisahkan model `Well`, `Reading`, `Snapshot` dan antarmuka `WaterRepository` dari komponen. Ganti implementasi repository setelah kontrak IoT disepakati. Untuk volume produksi, backend harus memecah interval yang melintasi tengah malam WIB dan menangani reset meter, duplikasi serta kiriman terlambat. Jangan mengalikan debit terkini untuk memperkirakan seluruh volume harian. SQL merupakan rancangan awal untuk volume interval, bukan format kiriman perangkat final.

Data simulasi tersedia 730 hari ke belakang. Hari memakai `[00.00 WIB, 00.00 WIB hari berikutnya)`, setara offset UTC+07. Minggu dimulai Senin. Data yang hilang tidak dianggap volume nol. Debit sumur terputus ditampilkan `—`; total debit hanya dari sumur terhubung. Pembaruan demo manual. Riwayat CSV diberi label SIMULASI.

## Supabase dan Google OAuth

1. Buat/pilih proyek Supabase khusus aplikasi ini. Jalankan `supabase/migrations/001_water_auth.sql` sekali melalui SQL Editor sebagai pemilik database. Jangan menjalankan ulang pada tabel yang sudah ada tanpa migrasi lanjutan.
2. Di Authentication → Hooks, aktifkan **Before User Created**: `public.before_user_created_unnes`, dan **Custom Access Token**: `public.access_token_unnes`. Hook pertama menolak pendaftaran domain lain/non-Google. Hook token memeriksa identitas Google terverifikasi untuk akun baru, akun lama, serta refresh sesi. Jika proyek sudah memiliki hook token, gabungkan aturan ini; jangan menimpa aturan yang ada tanpa peninjauan.
3. Di Authentication → Providers, aktifkan hanya Google. Nonaktifkan email/password, OTP, anonymous, dan provider lain. Biarkan pemeriksaan keamanan Google default aktif. Hindari linking identitas manual untuk aplikasi ini.
4. Di Google Cloud Console buat OAuth consent screen dan OAuth client bertipe **Web application**. Bila proyek dimiliki Workspace UNNES, gunakan audience Internal bila tersedia; jika External dalam Testing, daftarkan akun penguji. Isi identitas aplikasi, email dukungan, serta authorized domain sesuai subdomain kampus yang disepakati.
5. Authorized JavaScript origins: `http://localhost:3000` dan `https://air.unnes.id` (contoh; ganti dengan subdomain sebenarnya). Authorized redirect URI **Google**: `https://PROJECT_REF.supabase.co/auth/v1/callback`. Salin URI persis dari dashboard Supabase. Ini berbeda dari callback frontend.
6. Masukkan Google Client ID dan Client Secret ke konfigurasi provider Google di **Supabase saja**. Jangan memasukkan secret ke kode frontend, Git, atau variabel `NEXT_PUBLIC_*`.
7. Supabase → Authentication → URL Configuration: gunakan Site URL lokal `http://localhost:3000` selama pengembangan; produksi `https://air.unnes.id`. Tambahkan Redirect URLs tepat:
   - `http://localhost:3000/auth/callback/`
   - `https://air.unnes.id/auth/callback/`
     Gunakan slash akhir yang sama, tanpa wildcard produksi. Jika memakai port lain, daftarkan callback port tersebut.
8. Salin `.env.example` menjadi `.env.local`. Isi `NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dari Supabase Project Settings → API. Keduanya memang publik; **jangan memakai service_role atau secret key**. Restart dev server / build ulang setelah mengubah env.

Callback `/auth/callback/` adalah halaman statis dengan pertukaran kode PKCE di browser, tanpa route handler, cookies server, atau middleware. Mulai dan selesaikan login pada browser/origin yang sama agar verifier tersedia. `hd=unnes.id` hanya petunjuk pemilihan akun. Penolakan domain menampilkan: “Silakan masuk menggunakan akun Google UNNES (@unnes.id).”

Keamanan data berada pada Supabase: fungsi `is_unnes_user()` membaca `auth.users` dan `auth.identities`, bukan metadata profil yang bisa diedit pengguna. Domain tepat `unnes.id`, email Google harus cocok dengan email pengguna, identitas harus `email_verified=true`, dan provider Google. RLS kedua tabel mengizinkan SELECT hanya untuk pengguna yang lolos. Browser tidak memiliki hak menulis. Fungsi hook hanya dapat dipanggil peran Auth; RPC akses hanya peran authenticated. Konten HTML/JS static tetap publik, karena itu jangan menanam data rahasia ke bundle. `/demo/` hanya memuat contoh lokal dan tidak memberikan hak backend.

## Validasi eksternal wajib sebelum produksi

OAuth dan SQL belum dapat diuji terhadap proyek Supabase karena kredensial belum tersedia. Uji pada staging:

| Skenario                                                  | Hasil yang diharapkan                              |
| --------------------------------------------------------- | -------------------------------------------------- |
| Google terverifikasi `nama@unnes.id`                      | Login berhasil, RPC true, SELECT diizinkan         |
| Gmail/domain lain                                         | Pendaftaran/token ditolak; pesan domain            |
| `nama@students.unnes.id` atau `nama@unnes.id.example.com` | Ditolak                                            |
| Akun lama domain lain                                     | Hook token menolak; RLS menolak token lama         |
| Identitas tidak terverifikasi/non-Google                  | Ditolak walaupun metadata profil mengaku UNNES     |
| REST tanpa sesi (anon key)                                | Tidak dapat membaca tabel                          |
| Pengguna valid mencoba INSERT/UPDATE/DELETE               | Ditolak                                            |
| Pengguna mengubah `user_metadata.email_verified`          | Tidak mengubah akses RLS                           |
| Membatalkan Google / callback tanpa kode                  | Pesan kesalahan dan tautan kembali login           |
| Sesi habis, dicabut, atau refresh gagal                   | Data disembunyikan setelah validasi; kembali login |
| Keluar dan buka ulang `/`                                 | Kembali login                                      |

Sesi diperiksa saat membuka aplikasi, perubahan auth, dan setiap 60 detik; token otomatis diperbarui Supabase. Keluar berlaku pada browser/perangkat ini (`scope: local`). Error konfigurasi RPC tidak disamarkan sebagai login berhasil. Uji jaringan putus dan pemulihan koneksi juga.

## Hosting statis / PWA

`npm run build` menghasilkan `out/`. Unggah **isi** direktori tersebut ke document root subdomain kampus. Tidak diperlukan Node.js di hosting; Node.js hanya diperlukan pada komputer/CI untuk build. Hosting harus melayani `index.html` per direktori, termasuk `/login/index.html` dan `/auth/callback/index.html`, dengan query string callback tetap utuh. Jangan mengalihkan semua URL ke satu index secara sembarang.

Aktifkan HTTPS. Berikan MIME yang benar untuk JS, CSS, PNG, dan `.webmanifest`; set `sw.js` dengan `Cache-Control: no-cache` melalui konfigurasi hosting. Tambahkan `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, dan perlindungan frame di hosting. Header dinamis Next.js tidak digunakan karena static export. Arsitektur ini menargetkan root subdomain, bukan subfolder.

Manifest, ikon 192/512, Apple touch icon, dan service worker telah disiapkan. Android: Chrome → Instal aplikasi / Tambahkan ke layar utama. iPhone: Safari → Bagikan → Tambahkan ke Layar Utama. Service worker hanya menyediakan halaman offline; **tidak menyimpan data sumur, respons API, token, atau callback**. Pembacaan data tetap memerlukan internet. Peta memakai tile OpenStreetMap beratribusi dan memerlukan internet; jika tile gagal, daftar sumur tetap bisa dipakai. Tentukan penyedia tile produksi sesuai jumlah pengguna dan kebijakan penyedia.

## Tahap Capacitor Android berikutnya

Belum ada APK pada tahap ini. Pakai frontend hasil build yang sama dengan `webDir: 'out'`, backend Supabase yang sama, dan RLS yang sama. Tetapkan applicationId terlebih dahulu, misalnya `id.ac.unnes.tirta` (contoh, belum disetujui kampus).

Alur implementasi native:

1. Tambahkan Capacitor core/CLI/Android, plugin App dan Browser setelah ID dan signing ditetapkan. Jangan menjalankan login Google di WebView.
2. Dari **WebView aplikasi**, panggil `signInWithOAuth` dengan `skipBrowserRedirect: true`, PKCE, dan `redirectTo: 'id.ac.unnes.tirta://auth/callback'` (contoh). Verifier tetap disimpan pada storage aplikasi, tidak pada browser sistem.
3. Buka `data.url` menggunakan `Browser.open({ url: data.url })` sehingga OAuth memakai browser sistem/Custom Tabs.
4. Daftarkan URI native tepat tersebut pada Supabase Redirect URLs dan Android intent filter scheme `id.ac.unnes.tirta`, host `auth`, path `/callback`. Callback Google tetap URL Supabase, bukan deep link.
5. Tangani `App.addListener('appUrlOpen', ...)` **serta** `App.getLaunchUrl()` untuk cold start. Validasi scheme, host, path; ambil hanya `code`, lalu `exchangeCodeForSession(code)` pada klien Supabase di WebView. Jangan pertukarkan kode lewat halaman web eksternal karena storage verifier berbeda.
6. Deduplicasi callback, tangani error/pembatalan `browserFinished`, dan cek ulang `getUser()` + `is_unnes_user()` sebelum dashboard. Tutup browser jika didukung, hapus status pending, dan jangan log token. Browser selesai ditutup tidak selalu berarti login berhasil; tunggu hasil callback.
7. Untuk produksi pertimbangkan Android App Links terverifikasi dengan `assetlinks.json` dan sertifikat signing kampus agar callback terikat pada aplikasi. Daftarkan URL tersebut pada Supabase sebelum beralih. Uji cold start, aplikasi aktif, cancel, deep link palsu, token refresh, dan uninstall/reinstall.

Jangan menyalin implementasi callback web secara langsung ke native tanpa adapter transport dan storage. Browser web memakai `location.origin`; APK memakai redirect native eksplisit.

## Data yang diperlukan selanjutnya

- URL proyek Supabase dan publishable key (secret tetap di dashboard/backend).
- Akses konfigurasi Google Workspace/OAuth, akun uji UNNES, dan subdomain final.
- Daftar ID/nama sumur, gedung, koordinat tervalidasi, dan logo resmi bila hendak dipakai.
- Contoh payload IoT: timestamp/zonawaktu, satuan debit, volume interval atau counter kumulatif, interval kirim, reset counter, autentikasi perangkat, serta ambang status offline.
- Kebutuhan peran pengguna, retensi data, dan siapa yang boleh mengelola sumur.

## Referensi resmi

- [Google OAuth Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [PKCE untuk callback browser](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [Before User Created hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook)
- [Custom Access Token hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Capacitor deep links](https://capacitorjs.com/docs/guides/deep-links) dan [Browser API](https://capacitorjs.com/docs/apis/browser)
- Panduan Next.js sesuai versi terpasang: `node_modules/next/dist/docs/01-app/02-guides/static-exports.md`.
