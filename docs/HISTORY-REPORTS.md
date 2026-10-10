# Ekspor laporan Riwayat

Pilih filter Riwayat, lalu **Unduh Laporan** dan format yang dibutuhkan.

- **Excel**: sheet Ringkasan berisi identitas, periode, sumber data, waktu WIB, serta ringkasan terpisah Sumur/Gedung. Sheet Rincian berisi agregat per titik dengan tanggal Excel, volume numeric, freeze header, auto filter, dan pengaturan cetak A4 landscape.
- **PDF**: A4, metadata, ringkasan per jenis, rincian per titik, header tabel berulang, dan nomor halaman. Tidak ada tanda tangan atau pengesahan otomatis.
- **CSV**: seluruh interval mentah hasil filter, UTF-8 BOM, delimiter titik koma, desimal koma, dan escaping kutip. Nama yang menyerupai formula spreadsheet dinetralkan.

Semua format memakai data yang sudah lolos filter tanggal, jenis, dan lokasi Riwayat; pencarian/pagination tabel hanya mengatur tampilan dan tidak membatasi laporan. Excel/PDF memakai agregasi jam untuk satu hari, bulan untuk Tahunan, dan hari untuk rentang lainnya. Sumur dan Gedung tidak dijumlahkan sebagai konsumsi bersih. Rata-rata hanya dari hari dengan kiriman data; tidak ada data berarti kosong, bukan nol.

Data contoh diberi penanda eksplisit. Repository live saat ini belum memasok telemetri sehingga ekspor dinonaktifkan jika tidak ada data atau rentang tidak valid. Tidak ada backend baru atau perubahan rumus monitoring.

Library ExcelJS, jsPDF, dan jsPDF-AutoTable dimuat saat ekspor. Laporan dibuat lokal di browser. Rentang besar membutuhkan lebih banyak memori. Font PDF standar Helvetica; nama yang memakai aksara di luar karakter Latin dapat memerlukan font tambahan.

Validasi otomatis membaca kembali XLSX, memeriksa CSV dan PDF multi-halaman, serta mengunduh dari browser desktop/mobile. Pemeriksaan langsung di Microsoft Excel regional Indonesia dan perangkat Android/iPhone fisik tetap diperlukan; CSV dapat diimpor melalui Data > From Text/CSV dengan encoding UTF-8 dan delimiter titik koma jika pengaturan regional berbeda.
