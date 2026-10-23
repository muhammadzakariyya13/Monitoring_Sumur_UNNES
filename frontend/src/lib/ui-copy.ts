// Interface copy only. Location names, device codes, and stored data are never keys.
export const englishCopy: Record<string, string> = Object.fromEntries(`
Beranda|Home
Peta|Map
Riwayat|History
Profil|Profile
Kelola|Manage
Pengguna|Users
Pengunjung|Guest
Akses pratinjau|Preview access
PENGELOLAAN|MANAGEMENT
Kelola Titik Monitoring|Manage monitoring points
Titik Monitoring|Monitoring points
MONITORING|MONITORING
Harian|Daily
Mingguan|Weekly
Bulanan|Monthly
Tahunan|Yearly
Rentang tanggal|Date range
Semua|All
Sumur|Well
Gedung|Building
Semua titik|All points
Semua sumur|All wells
Semua gedung|All buildings
Semua titik (volume terukur)|All points (measured volume)
Titik monitoring|Monitoring points
Periode|Period
Jenis titik|Point type
Lokasi titik|Monitoring location
Lokasi|Location
Dari tanggal|From date
Sampai tanggal|To date
Reset filter|Reset filters
Tanggal akhir harus sama atau setelah tanggal awal.|The end date must be on or after the start date.
Menampilkan penggunaan per jam.|Showing hourly usage.
Senin hingga hari ini, per hari.|Monday through today, by day.
Awal bulan hingga hari ini, per hari.|Start of the month through today, by day.
Awal tahun hingga hari ini, per bulan.|Start of the year through today, by month.
Menampilkan rentang tanggal pilihan.|Showing the selected date range.
Tidak ada titik yang cocok.|No matching monitoring points.
Belum tersedia|Unavailable
Belum ada data|No data yet
Direncanakan|Planned
Terputus|Disconnected
Terhubung|Connected
Rencana|Planned
Nonaktif|Inactive
Aktif|Active
aktif|active
terputus|disconnected
titik|points
dari|of
Perbarui data contoh|Refresh monitoring data
Ringkasan dashboard|Dashboard overview
Pantau penggunaan air dan koneksi perangkat kampus.|Monitor campus water usage and device connections.
Data simulasi|Simulated data
Pratinjau - Data contoh|Preview - sample data
Data simulasi, bukan data resmi UNNES. Perubahan hanya untuk sesi ini dan direset saat halaman dimuat ulang.|Simulated data, not official UNNES data. Changes last only for this session and reset on reload.
Data contoh - belum terhubung perangkat|Sample data - devices not connected
Menunggu integrasi perangkat|Awaiting device integration
Angka dan koordinat adalah contoh, bukan data sumur asli UNNES. Pembaruan dilakukan manual.|Figures and coordinates are examples, not actual UNNES well data. Updates are manual.
Data contoh tersedia hingga 730 hari terakhir.|Sample data covers up to the last 730 days.
Diperbarui|Updated
Data contoh terakhir lebih dari 15 menit lalu. Pilih Perbarui contoh untuk memuat ulang.|The sample data is over 15 minutes old. Refresh to update it.
gedung melebihi batas pemakaian harian.|buildings exceed their daily usage limit.
Pemakaian gedung hari ini|Today's building usage
liter · sejak 00.00 WIB|liters · since 00:00 WIB
Koneksi titik monitoring|Monitoring point connections
titik terhubung|points connected
Debit masuk gedung|Building inflow
L/menit|L/min
L/orang/hari|L/person/day
titik terputus|points disconnected
Koneksi terputus|Disconnected devices
Perlu pemeriksaan perangkat|Device inspection required
Pemakaian gedung|Building water usage
Volume per jam · m³ · hari ini (WIB)|Hourly volume · m³ · today (WIB)
Hari ini|Today
Lihat riwayat|View history
Status perangkat|Device status
Koneksi perangkat contoh|Sample device connections
Status koneksi tidak menunjukkan kondisi kualitas air.|Connection status does not indicate water quality.
Lokasi contoh|Example locations
Buka peta lengkap|Open full map
Monitoring sumur dan gedung|Well and building monitoring
Pemakaian hari ini dan kondisi perangkat|Today's usage and device status
Penggunaan air|Water usage
Riwayat Penggunaan Air|Water Usage History
Pantau penggunaan berdasarkan lokasi dan periode.|Monitor usage by location and period.
Pantau penggunaan air berdasarkan lokasi dan periode.|Monitor water usage by location and period.
Kelola data dan akses SIMARA.|Manage SIMARA data and access.
Kelola Sumur dan Gedung|Manage wells and buildings
Kelola akun dan hak akses|Manage accounts and permissions
Navigasi utama|Main navigation
Kecilkan detail titik|Collapse point details
Perluas detail titik|Expand point details
TITIK MONITORING · DATA CONTOH|MONITORING POINT · SAMPLE DATA
Tutup detail|Close details
Perangkat terhubung|Device connected
Debit masuk|Inflow
Debit keluar|Outflow
Pemakaian hari ini|Today's usage
Produksi air hari ini|Today's water production
Debit tidak tersedia saat terputus. Volume hanya mencakup interval yang diterima.|Flow is unavailable while disconnected. Volume includes received intervals only.
Informasi titik|Point information
merupakan titik monitoring di|is a monitoring point in
. Data contoh menampilkan debit terkini dan akumulasi pemakaian air hari ini berdasarkan interval yang diterima.|. Sample data shows the current flow and today's accumulated usage from received intervals.
Kode titik|Point code
Pembaruan terakhir|Last update
Koordinat contoh|Example coordinates
Lokasi dan angka merupakan contoh, bukan data sumur asli UNNES. Status koneksi tidak menunjukkan kualitas air.|Locations and figures are examples, not actual UNNES well data. Connection status does not indicate water quality.
Riwayat penggunaan|Usage history
Per jam|Hourly
Volume per jam (m³) · WIB|Hourly volume (m³) · WIB
Lihat riwayat titik|View point history
Ringkasan penggunaan|Usage summary
Ringkasan riwayat|History summary
Total produksi air|Total water production
Total pemakaian|Total usage
Akumulasi periode terpilih|Total for the selected period
Rata-rata harian|Daily average
Dari hari dengan data diterima|Based on days with received data
Harian tertinggi|Highest daily usage
Titik tercatat|Recorded points
Memiliki data pada periode ini|With data in this period
Tren penggunaan air|Water usage trend
Data riwayat|Usage records
Rincian volume untuk|Volume details for
Cari periode riwayat|Search usage records
Cari tanggal atau jam…|Search date or time…
periode|periods
Tabel riwayat volume|Volume history table
Volume sumur dan gedung tidak boleh dijumlahkan sebagai konsumsi bersih. Interval tanpa kiriman tidak dianggap nol. Volume berdasarkan data yang diterima.|Well and building volumes must not be added as net consumption. Missing intervals are not treated as zero. Volume is based on received data.
Periode (WIB)|Period (WIB)
Volume (m³)|Volume (m³)
Sumber|Source
Volume|Volume
Data contoh|Sample data
Data diterima|Received data
Tidak ada periode yang cocok.|No matching periods.
Belum ada data pada rentang ini.|No data for this date range.
0 periode|0 periods
Halaman riwayat|History pages
Halaman sebelumnya|Previous page
Halaman berikutnya|Next page
Peta titik monitoring|Monitoring point map
Persebaran titik monitoring|Monitoring point distribution
Pilih titik pada peta atau daftar untuk melihat informasi monitoring terbaru.|Select a point on the map or list to view its latest monitoring information.
Total titik|Total points
Daftar titik monitoring|Monitoring point list
Kecilkan daftar titik|Collapse monitoring list
Perluas daftar titik|Expand monitoring list
Cari dan filter titik|Search and filter points
Kecilkan panel|Collapse panel
Perluas panel|Expand panel
Menampilkan|Showing
Cari titik|Search points
Cari nama, kode, atau lokasi…|Search name, code, or location…
Cari sumur, gedung, atau lokasi...|Search wells, buildings, or locations...
Hapus pencarian|Clear search
Filter koneksi|Point category filter
Debit saat ini|Current flow
Lihat detail →|View details →
Lihat detail|View details
Status koneksi perangkat, bukan kualitas air.|Device connection status, not water quality.
Legenda koneksi|Map legend
Sumur · bulat|Well · circle
Gedung · kotak|Building · square
- Gedung|- Building
· lokasi contoh|· example location
Titik contoh · bukan lokasi titik asli|Example points · not actual locations
Peta dasar tidak tersedia. Pilih titik melalui daftar.|Base map unavailable. Select a point from the list.
Pemakaian per orang Gedung|Building usage per person
Jumlah pegawai|Employee count
Rata-rata pemakaian per orang|Average usage per person
Berdasarkan hari dengan data diterima dan jumlah pegawai saat ini.|Based on days with received data and the current employee count.
Berdasarkan volume hari ini yang diterima dan jumlah pegawai saat ini.|Based on today's received volume and the current employee count.
Bukan pengukuran konsumsi individu.|Not a measurement of individual consumption.
Jumlah pegawai adalah contoh pengembangan, bukan data resmi UNNES.|Employee counts are development examples, not official UNNES data.
Batas pemakaian Gedung|Building usage limit
Batas pemakaian harian|Daily usage limit
Belum ditetapkan|Not set
Menunggu data|Awaiting data
Normal|Normal
Melebihi batas pemakaian|Usage limit exceeded
dari batas|of limit
Pemakaian terhadap batas harian|Usage against daily limit
% dari batas harian ·|% of daily limit ·
Batas|Limit
m³/hari. Pemakaian hari ini belum tersedia.|m³/day. Today's usage is unavailable.
m³/hari|m³/day
Notifikasi batas:|Limit notifications:
. Volume berdasarkan interval yang diterima (WIB).|. Volume is based on received intervals (WIB).
Batas contoh pengembangan, bukan kebijakan resmi UNNES.|Development example limit, not official UNNES policy.
Pemakaian melebihi batas|Usage limit exceeded
Debit tidak tersedia. Periksa koneksi perangkat.|Flow unavailable. Check the device connection.
Daftar notifikasi|Notifications list
Notifikasi|Notifications
Semua sudah dibaca|All caught up
Tandai dibaca|Mark as read
Tidak ada peringatan.|No alerts.
Waktu data belum tersedia|Data time unavailable
Memperbarui data|Refreshing data
Lepaskan untuk memperbarui|Release to refresh
Tarik untuk memperbarui|Pull to refresh
Laporan gagal dibuat. Silakan coba lagi.|Could not create the report. Please try again.
Unduh Laporan|Download report
Menyiapkan...|Preparing...
Format laporan|Report format
CSV (.csv) - Data mentah|CSV (.csv) - Raw data
Membuat laporan...|Creating report...
Memuat aplikasi|Loading application
Aktifkan JavaScript untuk membuka aplikasi.|Enable JavaScript to open the application.
Grafik volume penggunaan dalam meter kubik. Nilai rinci tersedia pada tabel riwayat.|Usage volume chart in cubic meters. Detailed values are available in the history table.
Memuat peta…|Loading map…
Memuat dashboard|Loading dashboard
Memuat pratinjau Admin|Loading Admin preview
Data gagal dimuat. Coba muat ulang.|Could not load data. Please refresh.
Data gagal dimuat.|Could not load data.
Menyiapkan data contoh|Preparing sample data
Menyiapkan data contoh…|Preparing sample data…
Coba lagi|Try again
Kembali|Back
Buka sidebar|Expand sidebar
Tutup sidebar|Collapse sidebar
Pilih…|Select…
Nama tidak boleh kosong.|Name cannot be empty.
Masuk dengan akun UNNES untuk mengubah profil.|Sign in with a UNNES account to edit your profile.
Profil berhasil diperbarui.|Profile updated.
Profil belum tersimpan. Periksa koneksi lalu coba lagi.|Could not save your profile. Check your connection and try again.
Pengguna SIMARA|SIMARA user
Akun pratinjau|Preview account
Belum masuk akun|Not signed in
Profil akun|Account profile
Foto profil|Profile photo
Edit Profil|Edit profile
Pengaturan akun|Account settings
Ubah Kata Sandi|Change password
Perbarui keamanan akun|Update account security
Keluar|Sign out
Keluar dari akun pada perangkat ini|Sign out on this device
Monitoring Air Sumur dan Gedung|Well and building water monitoring
Kelola informasi profil Anda|Manage your account information
Tutup|Close
Nama Lengkap|Full name
Masukkan nama lengkap|Enter full name
Email mengikuti akun login dan tidak dapat diubah.|Email follows your sign-in account and cannot be changed.
Batal|Cancel
Menyimpan...|Saving...
Simpan Perubahan|Save changes
Pengelolaan pengguna|User management
Kelola akun dan hak akses.|Manage accounts and permissions.
Refresh pengguna|Refresh users
Tambah Pengguna|Add user
Memuat pengguna...|Loading users...
Belum ada pengguna.|No users yet.
Nama / Email|Name / Email
Peran|Role
Status|Status
Aksi|Actions
Pengguna UNNES|UNNES user
Akun Anda · dilindungi|Your account · protected
Penghapusan tertunda|Deletion pending
Menunggu undangan|Invitation pending
Nonaktifkan|Deactivate
Aktifkan|Activate
Hapus|Delete
Hapus pengguna?|Delete user?
Tutup dialog|Close dialog
Simulasi undangan, tanpa mengirim email.|Simulated invitation. No email will be sent.
Pengguna menerima email undangan dan membuat password sendiri.|The user receives an invitation email and creates their own password.
Nama|Name
Role undangan|Invitation role
Mengirim...|Sending...
Kirim undangan|Send invitation
Pengguna ini akan kehilangan akses ke SIMARA. Akun akan dihapus permanen.|This user will lose access to SIMARA. The account will be permanently deleted.
Menghapus...|Deleting...
Hapus Pengguna|Delete user
Kelola titik monitoring|Manage monitoring points
Kelola lokasi sumur dan gedung untuk trial.|Manage trial well and building locations.
Kelola akses Viewer dan Admin.|Manage Viewer and Admin access.
Tambah titik|Add point
Jenis|Type
Kosongkan jika belum tersedia. Nilai 0 tidak digunakan untuk menghitung rata-rata per orang.|Leave blank if unavailable. Zero is not used to calculate per-person averages.
Jumlah pegawai harus bilangan bulat 0 atau lebih, maksimal 2.147.483.647.|Employee count must be an integer from 0 to 2,147,483,647.
Simpan|Save
Batas harian|Daily limit
Notifikasi batas|Limit notifications
Edit|Edit
Belum ada titik tersimpan. Tambahkan lokasi trial pertama.|No saved points. Add the first trial location.
Atur|Configure
Pengaturan pemakaian|Usage settings
Batas pemakaian harian (m³)|Daily usage limit (m³)
Kosongkan untuk menghapus batas. Nilai harus lebih dari 0 m³.|Leave blank to remove the limit. The value must be greater than 0 m³.
Simpan pengaturan|Save settings
Batas pemakaian harus lebih dari 0 m³.|The usage limit must be greater than 0 m³.
Pengaturan tersimpan untuk pratinjau ini.|Settings saved for this preview.
Pengaturan pemakaian tersimpan.|Usage settings saved.
Pengaturan belum tersimpan. Periksa akses Admin, koneksi, dan migrasi 005.|Could not save settings. Check Admin access, connection, and migration 005.
Perubahan titik tersimpan untuk pratinjau ini.|Point changes saved for this preview.
Titik monitoring tersimpan.|Monitoring point saved.
Titik belum tersimpan. Pastikan kode unik, data valid, dan akses Admin tersedia.|Could not save the point. Check that its code is unique, its data is valid, and Admin access is available.
Pengelolaan belum dapat dimuat. Periksa akses dan konfigurasi Supabase.|Could not load management data. Check access and Supabase configuration.
Jumlah pegawai harus berupa bilangan bulat antara 0 dan 2.147.483.647. Kosongkan jika belum tersedia.|Employee count must be an integer from 0 to 2,147,483,647. Leave blank if unavailable.
Akses Admin tidak tersedia. Silakan login kembali.|Admin access is unavailable. Please sign in again.
Akun Anda sendiri tidak dapat diubah atau dihapus.|Your own account cannot be changed or deleted.
Admin aktif terakhir harus dipertahankan.|The last active Admin must be retained.
Penghapusan belum selesai. Coba Hapus kembali.|Deletion is incomplete. Try Delete again.
Pengguna tidak ditemukan. Refresh daftar pengguna.|User not found. Refresh the user list.
Konfigurasi Supabase belum tersedia.|Supabase configuration is unavailable.
Gagal memuat pengguna. Periksa koneksi dan konfigurasi akses Admin.|Could not load users. Check the connection and Admin access configuration.
Pengguna dummy dihapus dari pratinjau.|Sample user removed from the preview.
Email sudah ada di pratinjau.|This email already exists in the preview.
Undangan disimulasikan. Tidak ada email yang dikirim.|Invitation simulated. No email was sent.
Operasi gagal. Periksa koneksi dan deployment Edge Function.|Operation failed. Check the connection and Edge Function deployment.
Layanan Admin tidak tersedia. Periksa koneksi dan deployment Edge Function.|Admin service unavailable. Check the connection and Edge Function deployment.
Operasi berhasil.|Operation successful.
Operasi gagal. Coba lagi.|Operation failed. Please try again.
Perubahan belum tersimpan. Periksa akses atau coba lagi.|Changes were not saved. Check access or try again.
Perubahan dummy tersimpan di pratinjau.|Sample changes saved in the preview.
Peran pengguna berhasil diubah.|User role updated.
Pengguna berhasil dinonaktifkan.|User deactivated.
Pengguna berhasil diaktifkan.|User activated.
Login kampus belum dikonfigurasi. Hubungi pengelola.|Campus sign-in is not configured. Contact the administrator.
Jika akun terdaftar, tautan reset sandi dikirim ke email Anda. Buka melalui browser yang sama.|If the account is registered, a reset link has been sent. Open it in the same browser.
Memverifikasi akses akun…|Verifying account access…
Tautan belum dapat dikirim. Periksa koneksi atau coba lagi nanti.|Could not send the link. Check your connection or try again later.
Gagal masuk. Periksa email, sandi, dan verifikasi akun Anda.|Could not sign in. Check your email, password, and account verification.
Login kampus belum dikonfigurasi. Gunakan pratinjau untuk melihat data contoh.|Campus sign-in is not configured. Use preview to view sample data.
Gagal memulai login. Periksa koneksi dan coba lagi.|Could not start sign-in. Check your connection and try again.
Sistem Informasi|Information System
Monitoring Air.|Water Monitoring.
Pantau penggunaan air, dan riwayat pemakaian melalui SIMARA.|Monitor water usage and consumption history with SIMARA.
Lupa sandi|Forgot password
Selamat datang|Welcome back
Masukkan email Anda untuk menerima tautan reset.|Enter your email to receive a reset link.
Masuk menggunakan akun Anda.|Sign in with your account.
Masuk menggunakan akun UNNES Anda.|Sign in with your UNNES account.
Masukkan email UNNES untuk menerima tautan reset.|Enter your UNNES email to receive a reset link.
Email UNNES|UNNES email
Masukkan email|Enter your email
Lupa sandi?|Forgot password?
Masukkan password|Enter your password
Sembunyikan password|Hide password
Tampilkan password|Show password
Memproses…|Processing…
Kirim tautan reset|Send reset link
Masuk|Sign in
Kembali ke login|Back to sign in
atau masuk dengan|or sign in with
Menghubungkan…|Connecting…
Masuk dengan Google UNNES|Sign in with Google UNNES
Lihat pratinjau|View preview
Login dibatalkan atau akses ditolak. Silakan coba kembali.|Sign-in was cancelled or access denied. Please try again.
Login gagal. Silakan coba kembali.|Sign-in failed. Please try again.
Callback tidak lengkap. Mulai login kembali dari browser yang sama.|Incomplete callback. Start sign-in again in the same browser.
Tautan login kedaluwarsa atau tidak valid. Silakan masuk kembali.|The sign-in link has expired or is invalid. Please sign in again.
Belum berhasil masuk|Could not sign in
Memverifikasi akun…|Verifying account…
Tautan undangan tidak lengkap. Buka kembali tautan dari email atau hubungi Admin.|Incomplete invitation link. Reopen the email link or contact an Admin.
Undangan tidak valid, kedaluwarsa, atau akses dinonaktifkan. Hubungi Admin untuk memeriksa akun.|The invitation is invalid, expired, or access is disabled. Contact an Admin.
Konfirmasi password tidak cocok.|Passwords do not match.
Password belum tersimpan. Periksa kebijakan sandi dan coba lagi.|Could not save the password. Check the password policy and try again.
Undangan SIMARA|SIMARA invitation
Password tersimpan. Akun Anda siap digunakan.|Password saved. Your account is ready.
Terima undangan lalu buat password minimal 12 karakter.|Accept the invitation and create a password with at least 12 characters.
Memverifikasi...|Verifying...
Terima undangan|Accept invitation
Password baru|New password
Konfirmasi password|Confirm password
Simpan password|Save password
Buka aplikasi|Open application
Tautan reset tidak lengkap. Minta tautan baru dari halaman login.|Incomplete reset link. Request a new one from the sign-in page.
Tautan reset kedaluwarsa atau dibuka di browser berbeda. Minta tautan baru.|The reset link has expired or was opened in another browser. Request a new link.
Akun UNNES belum terverifikasi.|The UNNES account is not verified.
Password berhasil diperbarui.|Password updated.
Password belum dapat diperbarui. Periksa kebijakan sandi dan coba lagi.|Could not update the password. Check the password policy and try again.
Reset password|Reset password
Gunakan password baru minimal 12 karakter.|Use a new password with at least 12 characters.
Memverifikasi tautan…|Verifying link…
Menyimpan…|Saving…
Sesi tidak dapat diverifikasi. Silakan masuk kembali.|Could not verify the session. Please sign in again.
Konfigurasi akses Supabase belum siap atau jaringan bermasalah. Hubungi pengelola.|Access configuration is not ready or the network is unavailable. Contact the administrator.
Sesi tidak dapat diverifikasi. Periksa koneksi lalu coba masuk kembali.|Could not verify the session. Check your connection and sign in again.
Sesi berakhir. Silakan masuk kembali.|Your session has expired. Please sign in again.
Gagal keluar. Periksa koneksi dan coba lagi.|Could not sign out. Check your connection and try again.
Memverifikasi sesi|Verifying session
`.trim().split("\n").map(line => { const index = line.indexOf("|"); return [line.slice(0, index), line.slice(index + 1)]; }));

// Parameters are interpolated after matching a complete interface message.
export const englishPatterns: [RegExp, string][] = [
  [/^Peran (.*)$/, "Role $1"],
  [/^ - Jumlah pegawai: (.*)$/, " - Employee count: $1"],
  [/^- Jumlah pegawai: (.*)$/, "- Employee count: $1"],
  [/^(.*)% dari batas harian$/, "$1% of daily limit"],
  [/^Melebihi batas sebesar (.*)%$/, "Exceeds limit by $1%"],
  [/^Sisa (.*) m³$/, "$1 m³ remaining"],
  [/^(\d+) orang$/, "$1 people"],
  [/^Notifikasi, (\d+) belum dibaca$/, "Notifications, $1 unread"],
  [/^(\d+) belum dibaca$/, "$1 unread"],
  [/^(.*) terputus$/, "$1 disconnected"],
  [/^(.*) melewati batas pemakaian harian\.$/, "$1 exceeded the daily usage limit."],
  [/^Aktual (.*) \/ Batas (.*) \/ Selisih (.*)$/, "Actual $1 / Limit $2 / Difference $3"],
  [/^Data terakhir: (.*)$/, "Last data: $1"],
  [/^Menampilkan (\d+) dari (\d+) titik$/, "Showing $1 of $2 points"],
  [/^(.*) dari (\d+) periode$/, "$1 of $2 periods"],
  [/^(.*) pegawai$/, "$1 employees"],
  [/^Atur (.*)$/, "Configure $1"],
  [/^Edit (.*)$/, "Edit $1"],
  [/^Jumlah pegawai: (.*)$/, "Employee count: $1"],
];
export function translateUi(text: string, language: "id" | "en"): string {
  if (language === "id") return text;
  const trimmed = text.trim();
  let translated = englishCopy[trimmed];
  if (!translated) for (const [pattern, replacement] of englishPatterns) if (pattern.test(trimmed)) { translated = trimmed.replace(pattern, replacement); break; }
  if (!translated) return text;
  return text.replace(trimmed, translated);
}

Object.assign(englishCopy, {
  "Edit Gedung": "Edit building",
  "Edit Sumur": "Edit well",
  "Manajemen SIMARA": "SIMARA management",
  "Kelola titik monitoring dan akses pengguna.": "Manage monitoring points and user access.",
  "Kelola sumur dan gedung": "Manage wells and buildings",
  "Kelola lokasi sumur dan gedung.": "Manage well and building locations.",
  "Latitude harus berupa angka antara -90 dan 90.": "Latitude must be a number between -90 and 90.",
  "Longitude harus berupa angka antara -180 dan 180.": "Longitude must be a number between -180 and 180.",
  "Informasi akun": "Account information",
  "Pilih tanggal": "Select date",
  "Bulan sebelumnya": "Previous month",
  "Bulan berikutnya": "Next month",
  "Bulan": "Month",
  "Tahun": "Year",
  "Cari tanggal atau jam...": "Search date or time...",
  "- Jumlah pegawai:": "- Employee count:",
  "Semua titik (volume terukur)": "All points (measured volume)",
  "Rincian volume untuk": "Volume details for",
  "Silakan masuk menggunakan akun UNNES terverifikasi (@unnes.id).": "Sign in using a verified UNNES account (@unnes.id).",
  "Memuat dashboard": "Loading dashboard",
  "Pilih…": "Select…",
});
