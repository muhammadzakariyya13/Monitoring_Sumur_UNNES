# Batas pemakaian harian Gedung

## Konfigurasi dan penyimpanan

1. Terapkan migrasi **005_building_usage_limits.sql** ke Supabase staging setelah migrasi 001–004 yang belum diterapkan. Jangan menjalankan ulang migrasi lama. Perubahan ini belum diterapkan ke server oleh agent.
2. Migrasi menambah `monitoring_locations.daily_usage_limit` (numeric nullable, satuan m³/hari) dan `limit_notification_enabled` (boolean, default false).
3. `NULL` berarti belum ditetapkan. Nilai non-null harus positif dan finite; NaN/Infinity ditolak constraint. WELL wajib tanpa batas dan notifikasi batas nonaktif.
4. Login sebagai Admin → **Kelola Titik Monitoring** → pada Gedung buka **Pengaturan pemakaian** → **Atur batas pemakaian/Ubah pengaturan**.
5. Isi batas positif, misalnya `15.5`, aktifkan/nonaktifkan notifikasi, lalu Simpan. Kosongkan nilai untuk menghapus batas. Batal tidak mengirim request.
6. Request `UPDATE` hanya menulis dua field konfigurasi, dibatasi id dan type BUILDING. Form metadata Gedung tidak menimpa konfigurasi batas. Mengubah Gedung menjadi Sumur mengosongkan batas dan mematikan notifikasinya.

RLS `monitoring_insert`/`monitoring_update` dari migrasi 003 sudah mensyaratkan `current_access_role() = 'ADMIN'`. Viewer tidak mendapat hak tulis hanya karena mengirim request langsung. `water_readings` tetap SELECT-only untuk akun aplikasi; migrasi ini tidak menambah hak tulis sensor, Auth, atau service role.

## Perhitungan

Volume harian adalah jumlah liter interval lokasi pada hari WIB berjalan dibagi 1.000. Pembacaan dari hari lain, masa depan, timestamp tidak valid, atau volume negatif/non-finite tidak dipakai. Data kosong tidak diperlakukan sebagai pemakaian nol.

- Persentase = aktual / batas × 100.
- Sisa = batas − aktual (negatif jika melampaui).
- Kelebihan = max(0, (aktual − batas) / batas × 100).
- Aktual ≤ batas: **Normal**; aktual > batas: **Melebihi batas pemakaian**.
- Tanpa batas: **Belum ditetapkan**; ada batas tetapi belum ada volume: **Menunggu data**.
- Progress visual maksimum 100%, tetapi teks tetap menunjukkan persentase sebenarnya, termasuk jika >100%.

Contoh: 17,2 m³ dengan batas 15 m³ berarti kelebihan sekitar 14,7%. Ini bukan diagnosis kebocoran atau penilaian boros. Jumlah pegawai hanya pembagi metrik per orang, tidak digunakan sebagai threshold.

## Notifikasi dan tampilan

Komponen `Notifications` yang sudah ada menggabungkan peringatan perangkat terputus dengan batas Gedung aktif yang terlampaui **dan** notifikasinya aktif. Mematikan toggle hanya menyembunyikan peringatan batas dari daftar; status terlampaui di detail/dashboard tetap dihitung.

Daftar diturunkan langsung dari snapshot, bukan di-append setiap render. Kunci batas `limit:<id>:<tanggal-WIB>` memberi paling banyak satu item per Gedung per hari. Hari berikutnya memiliki kunci baru. Tidak ada arsip kejadian atau layanan push/background baru. Status dibaca disimpan dalam memori sesi tampilan seperti mekanisme sebelumnya, bukan database; reload penuh dapat menandainya belum dibaca lagi, tetapi tidak menggandakan item.

Waktu notifikasi berasal dari pembacaan terakhir yang ikut dihitung. Ini waktu data, bukan klaim waktu pertama kali batas dilewati. Klik item/Lihat detail memakai `onSelect` lama untuk membuka Gedung yang tepat. Perubahan data dan refresh mengevaluasi ulang aturan; pergantian hari memakai WIB dan pembaruan jam tampilan sekitar satu menit.

Detail Gedung memiliki satu kelompok ringkas berisi status, batas, rasio, dan progress. Dashboard hanya menambah teks jumlah Gedung yang terlampaui. Sumur tidak mendapat pengaturan/metrik batas Gedung. Panel notifikasi mobile memakai lebar viewport dengan ruang bagi navigasi bawah/safe area. Pengaturan Admin memakai disclosure inline, tanpa modal atau menu sidebar baru.

## Data pengembangan dan batas implementasi

`/demo/` memiliki konfigurasi contoh Gedung Rektorat sebesar **3 m³/hari**, notifikasi aktif, untuk mencoba keadaan Normal/terlampaui menurut volume contoh saat itu. Ini bukan batas resmi UNNES. Gedung lain yang belum memiliki konfigurasi tetap tanpa batas. Tidak ada nilai default 3 pada database live.

Repository akun login sudah membaca konfigurasi nyata dari Supabase, tetapi pembacaan IoT live masih kosong mengikuti arsitektur sebelumnya. Karena itu belum ada notifikasi pemakaian live sampai adapter telemetry menyediakan Reading yang benar. Fitur ini tidak membuat payload/adapter IoT baru dan tidak mengirim data contoh ke database.

## Validasi dan uji staging

Tes lokal memakai Playwright/Chrome dan request Supabase yang di-mock:

- `usage-limits.spec.ts`: batas normal/sama/terlampaui, input tidak valid, hari WIB, no-data, notifikasi nonaktif, Sumur, lokasi nonaktif, deduplikasi, link detail, dan viewport 360/390/430/768/1366/1440/1920.
- `usage-limit-settings-configured.spec.ts`: simpan/edit/kosongkan batas, toggle, reload, error server, payload tanpa volume sensor, serta edit jumlah pegawai tidak menimpa batas pada 360/768/1440.

Jalankan lint/build dan suite standar dari `frontend`. Tes `*-configured.spec.ts` membutuhkan build dummy serta `TIRTA_AUTH_TEST=1`, mengikuti pola README. Pulihkan build normal setelahnya.

Di staging, setelah migrasi:

1. Login Admin, simpan batas/toggle, reload, dan pastikan nilainya tetap tersimpan.
2. Dengan JWT Viewer, coba update dua field tersebut melalui REST: harus ditolak/tidak mengubah baris. Verifikasi ulang baris dari Admin.
3. Dengan JWT Admin maupun Viewer, coba menulis `water_readings`: harus ditolak. Jangan memakai service key untuk pengujian izin ini.
4. Uji constraint dengan batas 0, negatif, NaN/Infinity, dan batas pada WELL: harus gagal. Ini pengujian SQL/database yang tidak digantikan oleh mock browser.
5. Dengan data telemetry staging yang sah, uji aktual ≤ batas, > batas, toggle nonaktif, dan hari berganti. Sesuaikan batas untuk pengujian, jangan mengedit hasil sensor.
6. Periksa keyboard mobile dan safe area pada perangkat Android/iPhone asli. Pengujian viewport Chrome bukan pengujian Safari/iOS fisik.

Migrasi/RLS dan integrasi perangkat nyata belum diuji terhadap Supabase production. Tidak ada resource production yang diubah.
