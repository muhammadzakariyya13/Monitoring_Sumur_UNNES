# Login email/password dan pemulihan

Panduan ini menggantikan pembatasan Google-only pada SETUP.md. Frontend menyediakan login email/password untuk akun yang sudah ada, Google OAuth, dan reset sandi. Tidak ada pendaftaran publik di UI.

## Aktivasi Supabase

1. Terapkan migrasi 001 jika database baru, lalu `supabase/migrations/002_email_password_auth.sql`. Jangan menjalankan ulang 001 pada database yang sudah berisi tabel. Migrasi 002 mengganti hook dan fungsi akses tanpa mengubah policy SELECT atau hak tulis.
2. Aktifkan provider Email dan Google. Aktifkan konfirmasi email. Pertahankan kedua Auth Hooks yang disebut SETUP.md. Akun email harus sudah terdaftar dan terverifikasi; akun Google yang ingin menggunakan sandi dapat menyiapkannya melalui pemulihan. Jangan menandai alamat milik orang lain terverifikasi tanpa pemeriksaan kepemilikan.
3. Tambahkan redirect URL `http://localhost:3000/auth/reset-password/` dan URL HTTPS produksi dengan path yang sama. Pertahankan callback Google `/auth/callback/`.
4. Konfigurasikan SMTP dan template Reset Password dengan tautan konfirmasi bawaan Supabase. Pastikan redirect menuju halaman reset, bukan callback Google.
5. Isi `frontend/.env.local` berdasarkan `.env.example`, lalu restart dev server atau build ulang.

Pemulihan memakai PKCE: minta dan buka tautan di browser yang sama. Halaman menukar kode melalui `exchangeCodeForSession`, lalu menyimpan sandi menggunakan `updateUser`. Minimum sandi UI 12 karakter; sesuaikan kebijakan Supabase agar setidaknya sama. Pesan pengiriman tidak mengungkap apakah alamat terdaftar.

## Validasi staging sebelum produksi

- Login Google dan password akun @unnes.id terverifikasi; refresh sesi; logout.
- Tolak domain lain, subdomain, email belum dikonfirmasi, dan metadata profil palsu lewat API langsung maupun UI.
- Reset akun terdaftar, alamat tidak terdaftar, token kedaluwarsa/terpakai, browser berbeda, password ditolak kebijakan, dan jaringan terputus.
- SELECT hanya untuk akun lolos validasi; INSERT/UPDATE/DELETE tabel air tetap ditolak.
- Setelah perubahan email ke non-UNNES, token baru dan akses RLS ditolak.

Migrasi dan login/email nyata belum diverifikasi pada layanan Supabase dari sesi ini. Tes lokal tidak membuktikan konfigurasi SMTP, hook, atau RLS produksi.

Referensi: [Password Auth](https://supabase.com/docs/guides/auth/passwords), [Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook).
