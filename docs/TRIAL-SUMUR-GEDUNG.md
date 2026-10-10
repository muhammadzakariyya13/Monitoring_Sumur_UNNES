# Trial Sumur dan Gedung

## Model dan sumber data

`frontend/src/lib/data.ts` mendefinisikan `MonitoringLocation`: id, code,
type (`WELL` / `BUILDING`), name, area, lat, lng, active, occupants,
flow, updatedAt. Reading memakai locationId, waktu, dan liter interval.
Ini model aplikasi, bukan kontrak payload IoT.

Data contoh dipisahkan di `placeholder-data.ts`. Trial: Sumur Rektorat dan
Gedung Rektorat. DSIH dan Arsip masih rencana. Semua koordinat, volume,
dan debit pratinjau adalah contoh, bukan data resmi. Gedung Rektorat memakai
occupants=250 hanya sebagai contoh pengembangan; ini bukan jumlah pegawai resmi.
Sumur dan gedung lain yang belum memiliki jumlah pegawai tetap null.

`monitoring-repository.ts` membedakan pratinjau dari akun login. Pratinjau
menggunakan data contoh. Akun login membaca metadata lokasi Supabase;
readings tetap kosong sampai adapter hardware selesai. Tidak ada endpoint
ingest, payload MQTT, atau telemetri palsu yang dikirim ke database.

Total penggunaan dashboard dihitung dari gedung saja. Jangan menjumlahkan
volume keluar sumur dengan volume masuk gedung sebagai konsumsi bersih.
Riwayat Semua menampilkan volume terukur lintas titik, bukan konsumsi bersih.
Rata-rata hanya mencakup hari dengan data. Hari tanpa kiriman bukan nol.

## Supabase dan Admin

Migrasi 003 adalah file lokal; belum diterapkan atau diuji pada server.
Tinjau dan backup sebelum menerapkan 001, 002, 003 secara berurutan ke staging.
003 mengganti nama wells menjadi monitoring_locations serta well_id menjadi
location_id dengan menjaga relasi/data lama; sesuaikan klien eksternal lama.

Role berada di user_access, bukan user_metadata. current_access_role diperiksa
setelah validasi akun UNNES. Viewer tidak memiliki hak tulis metadata.
Admin dapat menambah/mengedit titik dan mengubah peran pengguna lain.
Perubahan peran sendiri ditolak. Admin awal harus ditetapkan oleh pengelola
database tepercaya, bukan melalui browser. Jangan memasukkan service-role
key ke frontend. Semua akun baru otomatis Viewer.

Kelola Titik Monitoring menggunakan tabel metadata nyata, bukan localStorage.
Kelola Pengguna memakai RPC admin_list_users/admin_set_role. Kegagalan server
ditampilkan, tidak dilaporkan sebagai sukses. Admin pada HP diakses dari Profil.

Sebelum trial terhubung: uji RLS Viewer/Admin/nonaktif, penolakan RPC langsung,
CRUD lokasi, role berubah setelah sesi diperiksa ulang, dan domain @unnes.id.
Audit SQL staging belum dapat digantikan oleh pengujian browser lokal.

## Integrasi berikutnya

- Konfirmasi koordinat, kode perangkat, jumlah pengguna gedung dan lokasi trial.
- Sepakati timestamp, satuan debit, interval vs counter volume, reset counter,
  duplikasi/retry dan indikator online dengan tim hardware.
- Implementasikan adapter pembacaan dan penerimaan tepercaya setelah kontrak final.
- Aktifkan Supabase Auth sesuai docs/EMAIL-AUTH.md dan konfigurasi env frontend.
- Uji login email/password, Google, pemulihan sandi, dan Admin di staging.

## Validasi lokal

Jalankan dari frontend: npm run lint, npx tsc --noEmit, npm run build, npm test.
Tidak ada package.json yang dipindahkan ke root. Tidak ada dependency baru.

## Inventaris perubahan

Ditambahkan:
- frontend/src/lib/placeholder-data.ts
- frontend/src/lib/monitoring-repository.ts
- frontend/src/components/admin-view.tsx
- frontend/tests/monitoring-types.spec.ts
- frontend/public/fonts/plus-jakarta-regular.ttf, plus-jakarta-bold.ttf, OFL.txt
- supabase/migrations/003_monitoring_locations_admin.sql
- docs/TRIAL-SUMUR-GEDUNG.md

Diubah: README.md; frontend/src/lib/data.ts; komponen dashboard.tsx,
dashboard.css, map-explorer.tsx, well-map.tsx, history-results.tsx,
notifications.tsx, auth.tsx, profile-view.tsx; app/globals.css dan
app/login/page.tsx; pengujian data, history, map-filters, notifications,
password, responsive, ui. Beberapa komponen lain hanya penyeragaman istilah.

Tidak ada file penting dihapus. Generator data contoh dikeluarkan dari data.ts
agar tipe/perhitungan dan sumber data tidak bercampur. Struktur frontend/backend
dan login email/password dipertahankan.

## Jumlah pegawai dan rata-rata per orang

- Field `occupants` yang sudah ada adalah jumlah pegawai/pengguna Gedung. Admin
  dapat mengisi dan mengeditnya melalui Kelola Titik Monitoring. Simpan tetap
  memakai Supabase; tidak ada penyimpanan palsu di browser.
- Bilangan bulat 0 atau lebih (batas integer PostgreSQL 2.147.483.647). Kosong
  disimpan sebagai null. Untuk Sumur, field disembunyikan dan disimpan null.
- Detail Gedung menampilkan jumlah pegawai serta rata-rata pemakaian per orang:
  `(volumeM3 * 1000) / occupants`, misalnya 12,5 m3 / 250 orang = 50 L/orang/hari.
- Riwayat satu Gedung memakai volume rata-rata harian dari hari yang memiliki
  data, dibagi jumlah pegawai saat ini. Ini bukan histori perubahan jumlah
  pegawai; nilai pegawai terbaru dipakai sebagai pembagi dan dijelaskan di UI.
- Jumlah pegawai kosong/0/tidak valid, atau tidak ada volume: tampilkan tanda
  kosong, bukan 0, NaN, atau Infinity. Volume terukur yang benar-benar nol dengan
  jumlah pegawai positif tetap sah menghasilkan nol.
- Sumur dan pilihan Semua titik tidak menampilkan indikator per orang. Sensor
  mengukur aliran masuk gedung, bukan konsumsi masing-masing individu.
- Tidak perlu migrasi baru: migrasi 003 sudah menyediakan occupants integer,
  constraint nonnegatif, serta larangan occupants pada WELL. Migrasi lama tidak diubah.
- Metadata live sudah berasal dari Supabase, tetapi readings live masih kosong
  sampai adapter IoT tersedia. Karena itu nilai per orang live tetap kosong,
  meskipun jumlah pegawai telah diisi. Data pegawai resmi masih perlu dikonfirmasi
  kepada UNNES, termasuk apakah pembagi mencakup pengguna selain pegawai.

Tes khusus: `building-usage.spec.ts` memeriksa rumus dan lima ukuran layar;
`building-occupants-configured.spec.ts` memeriksa tambah/edit 250 ke 275,
validasi, reload sumber data, kosong/0 dan perubahan jenis ke Sumur dengan
request Supabase yang di-mock. Jalankan tes configured dengan build dummy dan
`TIRTA_AUTH_TEST=1` seperti panduan pengujian di README. Pengujian mock bukan
bukti migrasi/RLS telah diterapkan di Supabase production.
