# Upload proyek ke GitHub

Repository lokal sudah memakai branch `main` dan remote `origin`:
https://github.com/muhammadzakariyya13/Monitoring_Sumur_UNNES.git

Jalankan dari folder utama proyek, bukan frontend. Perintah ini untuk Git Bash:

```bash
cd "/e/JOB REKTORAT/MONITORING DEBIT AIR/monitoring-air-unnes"
git status
git remote -v
git add -A
git diff --cached --stat
git diff --cached --name-only
```

Periksa daftar file sebelum commit. Setelah sesuai:

```bash
git commit -m "Update TIRTA UNNES UI and history reports"
git push -u origin main
```

Login GitHub melalui browser jika diminta Git Credential Manager. Jangan memasukkan token ke URL remote atau file proyek. Jika push ditolak karena remote berisi commit baru, jangan memakai force push; lakukan fetch dan periksa perbedaan terlebih dahulu. Tidak perlu git init atau remote add karena sudah tersedia.

Jika ingin repository baru, buat repository kosong (tanpa README/license/gitignore otomatis), kemudian gunakan `git remote set-url origin https://github.com/USERNAME/NAMA-REPO.git` sebelum push. Pilih Private jika kode belum untuk publik.

## File yang disimpan di GitHub

Source frontend, public assets, tests, scripts, package.json, package-lock.json, konfigurasi Next/TypeScript, dokumentasi, backend placeholder, migrasi Supabase, source Edge Function, serta `.env.example` dengan nilai rahasia kosong.

## File lokal yang tidak diunggah

- `.env*` selain `.env.example`: konfigurasi dan kredensial lokal.
- Private key / sertifikat privat: `.pem`, `.key`, `.p12`, `.pfx`, `.jks`, `.keystore`.
- `node_modules/`, `.next/`, `out/`: dependency dan hasil build yang bisa dibuat ulang.
- `test-results/`, `playwright-report/`, `visual-review/`, coverage, log dan cache.
- Konfigurasi akun/tool lokal di `.aws/`, `.codex/`, `.agents/`; cache lokal Supabase.

Jangan hapus environment yang digunakan aplikasi hanya karena tidak boleh dipublikasikan. Simpan lokal dan abaikan melalui .gitignore. Service-role key, token GitHub, password database, dan client secret tidak boleh ditulis ke source frontend atau variabel NEXT_PUBLIC_.

`.gitignore` tidak menghapus rahasia dari riwayat commit. Jika rahasia pernah ter-commit, cabut/rotasi kredensial dan bersihkan riwayat sebelum push. Pemeriksaan pola otomatis bukan jaminan semua jenis rahasia terdeteksi.

## Pembersihan yang dilakukan

`_legacy/` dihapus setelah diperiksa: hanya template Next.js lama dan cache development, tidak digunakan frontend aktif. `frontend/test-results/` dihapus karena hanya artefak tes sementara. Dependency/build aktif dan screenshot review lama tetap lokal tetapi diabaikan Git.

Upload kode ke GitHub tidak otomatis menjalankan atau men-deploy aplikasi.
