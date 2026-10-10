# Pengelolaan pengguna Admin TIRTA UNNES

Halaman **Pengelolaan → Pengguna** memakai akun Supabase sebenarnya. `/admin/` memerlukan login Admin; `/demo/` tetap pratinjau Viewer. Pada Admin asli tidak ada fallback daftar pengguna palsu. Untuk mencoba tanpa akun, buka `/demo/admin/`: Dashboard, Pengguna, dan Kelola Titik menggunakan data dummy lokal tanpa akses Supabase. Perubahan demo direset saat reload dan tidak memberikan akses ke `/admin/`. Konfigurasi awal berikut dikerjakan developer sekali; sesudahnya operator mengundang, mengubah role/status, dan menghapus pengguna dari aplikasi.

**Status pekerjaan:** kode dan tes lokal tersedia. Migrasi, deployment Edge Function, SMTP, dan pengiriman email pada proyek Supabase nyata belum dijalankan oleh perubahan ini. Uji pada staging sebelum production; jangan mengulangi migrasi yang sudah diterapkan.

## Mencoba tanpa Supabase

Buka `/demo/admin/` untuk melihat halaman Pengguna dengan akun **Admin Dummy** (`admin@example.invalid`). Tidak membutuhkan password. Semua tindakan hanya simulasi di memori browser dan kembali ke awal saat reload; tidak ada email atau operasi Supabase. Role Auth tetap Viewer/tanpa sesi. `/admin/` tetap khusus akun Admin sebenarnya.

## Arsitektur

- Next.js tetap `output: "export"`. Tidak ada API Next.js yang membutuhkan server Vercel.
- Daftar, perubahan role, dan status memakai RPC PostgreSQL dengan pemeriksaan `current_access_role() = 'ADMIN'`.
- Undangan dan penghapusan Auth melalui Edge Function `admin-users`. Function memvalidasi JWT dengan Auth lalu membaca role/status terkini dari database menggunakan JWT pemanggil. Browser tidak menentukan hak akses pemanggil.
- Service-role key hanya dipakai Function untuk Auth Admin API. Tidak ada service-role key di frontend, variabel publik, atau Vercel.
- `user_access` tetap RLS dan tidak dapat ditulis langsung oleh browser. Role tidak diambil dari metadata yang bisa diubah pengguna.
- Perubahan role/status/persiapan hapus diserialkan dengan lock database. Akun sendiri dan Admin aktif terakhir dilindungi.
- Saat menghapus, akses dinonaktifkan dan ditandai `deletion_pending` sebelum Auth dihapus. Jika penghapusan Auth gagal, akses tetap tertutup; klik Hapus kembali. Role/aktivasi akun yang sedang dihapus ditolak. Penghapusan Auth yang berhasil menghapus `user_access` melalui foreign key cascade.
- Akun nonaktif langsung ditolak oleh RLS/RPC, termasuk JWT lama; hook token juga menolak login/refresh baru. Tampilan sesi melakukan validasi berkala (maksimal sekitar 60 detik), tetapi pemeriksaan backend berlaku setiap request.

`verify_jwt = false` pada konfigurasi Function **bukan akses publik tanpa pemeriksaan**: handler sendiri memanggil Auth `getUser` melalui REST dan RPC role, sehingga kompatibel dengan verifikasi JWT di Auth. Jangan menghapus pemeriksaan tersebut. Lihat [panduan otorisasi Edge Functions](https://supabase.com/docs/guides/functions/auth).

## 1. Pilih proyek Supabase untuk staging

1. Buka proyek uji milik Anda di Supabase Dashboard. Catat Project URL, publishable key, dan project reference.
2. Jika menggunakan proyek lama, cadangkan database dan catat migrasi yang sudah diterapkan.
3. Buka **SQL Editor**. Terapkan file dalam `supabase/migrations/` berurutan: `001`, `002`, `003`, lalu **`004_admin_user_management.sql`**, hanya yang belum pernah diterapkan. Jika 001–003 sudah ada, cukup jalankan 004.
4. Jangan menjalankan ulang 003: migrasi itu mengganti nama tabel lama. Jangan memakai `db reset` pada proyek berisi data.
5. Pastikan eksekusi 004 selesai tanpa error. Migrasi dibungkus transaksi; jika gagal, baca pesan SQL terlebih dahulu.

Verifikasi kolom baru:

```sql
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'user_access';
-- id, role, active, deletion_pending
```

Migrasi 004 memperluas `admin_list_users`, memperkuat `admin_set_role`, menambah `admin_set_active` dan `admin_prepare_delete`, serta mengizinkan sesi invite yang identitasnya sudah terverifikasi. Migrasi lama tidak diubah.

## 2. Siapkan Auth dan email undangan

1. Di **Authentication**, aktifkan provider Email. Pertahankan pengaturan Google UNNES yang sudah dipakai; ikuti [SETUP.md](SETUP.md) bila proyek belum pernah dikonfigurasi.
2. Pada **Auth Hooks**, pastikan **Before User Created** memakai `public.before_user_created_unnes` dan **Custom Access Token** memakai `public.access_token_unnes`. Keduanya harus aktif. Jangan mengubah fungsi domain menjadi selalu mengizinkan.
3. Pada **URL Configuration**, isi Site URL dengan origin aplikasi, misalnya `http://localhost:3000` untuk uji laptop atau domain HTTPS Vercel untuk deployment.
4. Tambahkan redirect berikut dengan origin yang sama:

```text
http://localhost:3000/auth/invite/
http://localhost:3000/auth/callback/
http://localhost:3000/auth/reset-password/
```

Untuk deployment, tambahkan masing-masing path pada domain HTTPS sebenarnya. Tautan localhost hanya bisa dibuka di laptop server itu sendiri. Gunakan domain staging HTTPS untuk menguji email di HP.

5. Pada **Email Templates → Invite user**, ubah tautan utama menjadi:

```html
<h2>Undangan TIRTA UNNES</h2>
<p>Anda diundang untuk mengakses TIRTA UNNES.</p>
<p><a href="{{ .RedirectTo }}#token_hash={{ .TokenHash }}">Terima undangan</a></p>
```

Function selalu menentukan RedirectTo ke `/auth/invite/`. Template ini diperlukan karena aplikasi statis menerima token hash secara eksplisit, bukan implicit access-token callback. Fragment dibersihkan dari URL setelah halaman dibuka. Token baru diverifikasi ketika penerima menekan **Terima undangan**, lalu penerima menetapkan password sendiri. Jangan menyalin token undangan ke chat/log. Lihat [template email](https://supabase.com/docs/guides/auth/auth-email-templates) dan [redirect URL](https://supabase.com/docs/guides/auth/redirect-urls).

6. Siapkan **Custom SMTP** untuk mengirim ke pengguna UNNES sebenarnya. SMTP bawaan Supabase dibatasi untuk alamat tim proyek, sehingga bukan pengiriman umum. Isi SMTP host/port/pengirim/credential milik penyedia email Anda; jangan masukkan credential SMTP ke frontend. Matikan link tracking pada penyedia email bila mengubah tautan undangan. Lihat [konfigurasi SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## 3. Deploy Edge Function

Dari folder utama `monitoring-air-unnes`, bukan `frontend`, gunakan terminal:

```powershell
npx supabase login
npx supabase link --project-ref PROJECT_REF_ANDA
npx supabase secrets set APP_ORIGIN=http://localhost:3000
npx supabase functions deploy admin-users
```

Ganti `PROJECT_REF_ANDA` dengan reference proyek staging. CLI dapat meminta instalasi tool sementara; ini tidak menambah dependency aplikasi. Tidak perlu menjalankan `supabase init` karena `supabase/config.toml` sudah tersedia.

- `APP_ORIGIN` adalah origin persis, tanpa path dan tanpa garis miring terakhir. Gunakan `https://DOMAIN-ANDA` untuk deployment. Hanya satu origin yang diizinkan per deployment; pisahkan proyek staging dan production. Jika berbeda, aplikasi menampilkan kegagalan Function/CORS.
- Hosted Supabase menyediakan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` untuk Function. Jangan menyalin key ini ke Vercel/frontend.
- `supabase/functions/.env.example` hanya template untuk menjalankan Functions secara lokal. `.env` asli sudah di-ignore Git.
- Pada Dashboard **Edge Functions**, pastikan `admin-users` muncul. Sesuaikan `APP_ORIGIN` sebelum menguji dari domain lain.

Rujukan: [deploy Function](https://supabase.com/docs/guides/functions/deploy), [secret Function](https://supabase.com/docs/guides/functions/secrets).

## 4. Hubungkan frontend dan Vercel

Untuk laptop:

```powershell
cd frontend
Copy-Item .env.example .env.local
```

Jika `.env.local` sudah ada, edit file itu; jangan menimpanya. Isi hanya:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF_ANDA.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=ISI_PUBLISHABLE_KEY_ANDA
```

Kemudian:

```powershell
npm install
npm run dev
```

Untuk Vercel:

1. Import repository; set **Root Directory** ke `frontend`.
2. Gunakan preset Next.js, build `npm run build`, hasil static export `out` (relatif terhadap `frontend`).
3. Tambahkan dua environment variable publik di atas untuk environment deployment yang sesuai.
4. Jangan menambah service-role key di Vercel. Operasi Admin berlangsung di Supabase Edge Function.
5. Deploy/redeploy agar environment publik masuk build. Setelah URL tersedia, sesuaikan `APP_ORIGIN`, Site URL, dan redirect allowlist Supabase dengan domain tersebut.

## 5. Buat Admin pertama

Langkah ini hanya dilakukan developer dengan akses SQL, bukan operator harian.

1. Login aplikasi menggunakan **akun Google UNNES terverifikasi milik Anda**, sesuai konfigurasi Google yang sudah ada. Akun awal mendapat role Viewer dari trigger database.
2. Pastikan email tersebut terlihat di Supabase Authentication → Users dan sudah terverifikasi.
3. Ganti placeholder email berikut dengan email Anda sendiri, lalu jalankan di SQL Editor proyek yang benar:

```sql
update public.user_access a
set role = 'ADMIN', active = true
from auth.users u
where a.id = u.id
  and lower(u.email) = lower('GANTI_EMAIL_ANDA@unnes.id')
  and public.has_verified_unnes_identity(u.id)
  and not a.deletion_pending
returning u.email, a.role, a.active;
```

Harus mengembalikan tepat satu akun yang Anda maksud. Jika nol baris, periksa email dan verifikasi akun; jangan melepas pemeriksaan identitas.

4. Keluar dan login lagi, kemudian buka `/admin/`.
5. Desktop: sidebar **Pengelolaan → Pengguna**. HP: **Kelola → Pengguna**.

Selanjutnya, undang Admin tambahan dari aplikasi. Menu `/admin/` tidak lagi menyediakan demo tanpa login.

## 6. Uji dari aplikasi

Gunakan akun uji UNNES yang Anda kuasai di staging.

1. Login sebagai Admin; buka Pengguna. Daftar harus berasal dari Supabase, tanpa akun contoh.
2. Klik **Tambah Pengguna**, isi nama/email, pilih Viewer, lalu **Kirim undangan**. Pastikan ada pesan sukses dan status **Menunggu undangan**.
3. Buka email penerima di browser terpisah, klik tautan, tekan **Terima undangan**, isi password minimal 12 karakter dan konfirmasinya. Buka aplikasi, logout, lalu login email/password. Viewer tidak boleh mendapat menu Pengelolaan.
4. Dari sesi Admin ubah akun uji ke Admin; refresh daftar dan login ulang akun uji. Kembalikan ke Viewer. Pastikan perubahan tersimpan sesudah reload, bukan hanya teks berubah.
5. **Nonaktifkan** akun uji. Di browser akun uji, request data privat harus ditolak dan login/refresh token juga ditolak. Aktifkan kembali dan pastikan dapat login.
6. Klik **Hapus** pada akun uji lalu **Batal**: akun harus tetap ada. Ulangi dan klik **Hapus Pengguna**: dialog tutup, pesan sukses muncul, akun hilang setelah refresh, dan login akun lama gagal.
7. Pada akun Admin yang sedang digunakan, dropdown role dan tombol Nonaktifkan/Hapus harus disabled. Memanggil RPC secara langsung dengan target ID sendiri juga harus ditolak. Viewer yang memanggil RPC atau Function Admin langsung harus mendapat error, walaupun mengirim `role: "ADMIN"`.
8. Uji pada layar HP 360 px: email panjang tidak membuat halaman melebar, dialog bisa digulir, dan dropdown role tetap dalam layar.
9. Dengan dua Admin terverifikasi pada dua browser, perubahan role/status yang bersamaan tidak boleh menghilangkan semua Admin. Semua perubahan melalui helper lock database; uji skenario ini di staging.

### Jika gagal

- **Gagal memuat pengguna:** pastikan migrasi 004 sudah diterapkan, sesi masih Admin aktif, URL/key sesuai proyek.
- **Layanan Admin tidak tersedia:** periksa deploy Function, `APP_ORIGIN` versus origin browser, dan koneksi. Lihat Function logs tanpa membagikan JWT/secret.
- **Email sudah terdaftar:** kelola dari daftar. Untuk akun terverifikasi yang lupa sandi, gunakan Lupa password. Untuk undangan kedaluwarsa yang belum diterima, developer/Admin dapat menghapus akun uji yang belum digunakan lalu mengundang ulang setelah konfirmasi; jangan menghapus akun aktif untuk mengirim ulang undangan.
- **Undangan terkirim tetapi peran Admin belum tersimpan:** undangan dan perubahan role merupakan dua operasi. Refresh, periksa role sebenarnya, lalu ubah role bila diperlukan. Jangan mengirim ulang karena email sudah terkirim.
- **Penghapusan tertunda:** akses sudah dinonaktifkan. Tutup dialog, refresh, lalu coba Hapus lagi. Jika tetap gagal, developer perlu memeriksa kendala Auth/dependensi seperti kepemilikan objek Storage. Akun pending tidak boleh diaktifkan ulang dari UI/RPC.
- **Email tidak sampai:** periksa SMTP, batas pengiriman, folder spam, dan template Invite user. Respons sukses API bukan bukti email sudah diterima inbox.

## File dan validasi

Baru: `supabase/migrations/004_admin_user_management.sql`, `supabase/functions/admin-users/{index,handler}.ts`, `supabase/config.toml`, `supabase/functions/.env.example`, `frontend/src/components/admin-users.{tsx,module.css}`, `frontend/src/app/auth/invite/page.tsx`, tes Admin, dan panduan ini.

Diubah: `admin-view.tsx` menghubungkan panel Pengguna; `auth.tsx` dan `/admin/page.tsx` memerlukan Admin nyata; `dashboard.tsx`/`profile-view.tsx` melepas pratinjau Admin; `custom-select.tsx` mendukung dropdown dalam modal native; `.env.example` dan README menjelaskan konfigurasi. Komponen `admin-preview.tsx` lama dihapus setelah diperiksa. Fitur Viewer, repository monitoring, IoT, dan migrasi 001–003 tidak diganti.

```powershell
cd frontend
npm run lint
npm run build
npm test -- --workers=2
```

Tes UI Supabase khusus menggunakan build dummy (semua request diintersep, tidak mengakses Supabase nyata):

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='https://tirta-auth-test.supabase.co'
$env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-publishable-key'
npm run build
$env:TIRTA_AUTH_TEST='1'
npx playwright test tests/auth-configured.spec.ts tests/admin-users-configured.spec.ts tests/admin-users-edge.spec.ts --workers=2
Remove-Item Env:TIRTA_AUTH_TEST
Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL
Remove-Item Env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run build
```

Jalankan perintah dummy di terminal baru bila terminal awal memiliki variabel environment sendiri. Build terakhir memulihkan konfigurasi `.env.local`; jangan deploy build dummy.

Tes handler memeriksa JWT/role ditolak, proteksi hapus sendiri, error database sebelum Auth delete, undangan parsial, redirect tetap, serta secret tidak dikirim sebagai respons. Tes UI memeriksa invite, dropdown modal, role/status, konfirmasi hapus, retry/empty/error, proteksi akun sendiri, penerimaan undangan, dan responsivitas. Tes mock **tidak menggantikan** verifikasi SQL/RLS, hook Auth, SMTP, penghapusan Auth, dan konkurensi terhadap Supabase staging.
