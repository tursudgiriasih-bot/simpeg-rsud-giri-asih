# SIMPEG — Sistem Informasi Kepegawaian RSUD Giri Asih

Aplikasi web kepegawaian berbasis **React + Firebase** (Auth, Firestore) +
**Netlify** (Hosting, Functions) + **Cloudinary** (upload foto/dokumen),
dibangun mengikuti Dokumen Kebutuhan Sistem SIMPEG RSUD Giri Asih.

> 📌 Stack ini sengaja disusun supaya **100% gratis tanpa perlu kartu kredit**
> di mana pun. Untuk langkah setup & deploy lengkap, lihat **[SETUP.md](./SETUP.md)**.

## Fitur yang sudah berfungsi

- **Pendaftaran mandiri pegawai** (`/daftar`) -> status "menunggu" -> **Admin memverifikasi**
  lewat menu Verifikasi Pendaftaran (ditautkan ke data pegawai yang sudah ada, atau dibuatkan
  baru) -> pegawai baru bisa login. Layar pegawai yang masih menunggu otomatis berubah jadi
  dashboard begitu Admin menyetujui, tanpa perlu login ulang.
- Login berbasis peran: **Administrator (TU Kepegawaian)** dan **Pegawai** (login pakai NIP)
- Dashboard admin: total pegawai, per unit/golongan/jabatan, pengingat 90 & 180 hari, CPD, kelengkapan dokumen
- Dashboard pegawai: ringkasan pengingat milik sendiri
- Data Pegawai: tambah, edit, hapus, **cari (nama, NIP, jabatan, golongan, unit)**, filter per unit
- **Cek Masa Berlaku Dokumen**: filter & urutkan dokumen apa pun yang punya field tanggal
  (SIP, SPK, KGB, kenaikan pangkat, atau bagian kustom buatan Anda sendiri) lintas SELURUH
  pegawai sekaligus — bisa difilter "akan berakhir dalam N hari", "tahun tertentu", "sudah
  kedaluwarsa", atau semua data, lalu diurutkan dan diekspor ke PDF/Excel. Tidak terbatas pada
  ambang 90/180 hari yang dipatok di dashboard.
- Profil Pegawai lengkap dengan 14 sub-bagian: Identitas, Riwayat Pendidikan, Riwayat Jabatan,
  Riwayat Pangkat, KGB, SIP, STR, SPK, Pelatihan, CPD, Reward, Punishment, Penilaian Kinerja,
  Kesehatan Pegawai, dan Dokumen Lain — masing-masing dengan CRUD dan unggah dokumen PDF/gambar
- Sistem pengingat otomatis 90 hari (SIP, SPK, KGB) dan 180 hari (kenaikan pangkat)
- Pencarian data (nama, NIP, jabatan, unit, golongan)
- Laporan & ekspor PDF/Excel
- Role-Based Access Control lewat Firestore Security Rules (bukan hanya di sisi tampilan) —
  termasuk mencegah siapa pun memberi dirinya sendiri role "admin" saat mendaftar
- Ubah password mandiri

## Alur akun pegawai (baru)

1. Pegawai buka halaman **/daftar**, isi Nama, NIP, NIK, tanggal lahir, no HP, email, dan
   password sendiri.
2. Sistem membuatkan akun login (role sementara: `pending`) dan menyimpan data yang diisi.
   Pegawai belum bisa mengakses data apa pun pada tahap ini.
3. Admin membuka menu **Verifikasi Pendaftaran**, meninjau data yang masuk, lalu memilih:
   - **Tautkan & Setujui** ke data pegawai yang sudah ada di sistem (disarankan, supaya
     riwayat lama tidak terpisah), atau
   - **Buat Data Pegawai Baru** langsung dari data pendaftaran (jika pegawai memang belum
     pernah diinput sebelumnya), atau
   - **Tolak**, dengan catatan opsional.
4. Begitu disetujui, pegawai bisa login dengan NIP + password yang ia buat sendiri, dan hanya
   bisa melihat datanya sendiri (ditegakkan di Firestore Security Rules).

Akun **Admin** tetap tidak bisa dibuat lewat pendaftaran mandiri (sengaja, demi keamanan) —
lihat bagian C untuk membuat akun Admin pertama lewat script.

## Kelola Bagian Data (field kustom, diatur Admin)

Menu **Kelola Bagian Data** memungkinkan Admin menambah, mengedit, atau menghapus bagian
data & field profil pegawai langsung dari aplikasi — tanpa perlu mengubah kode.

- Setiap bagian (SIP, SPK, Pelatihan, dst — termasuk bagian baru yang Anda buat sendiri)
  bisa diberi field bertipe Teks, Teks Panjang, Tanggal, Angka, Pilihan (dropdown), atau
  Berkas (upload PDF/gambar).
- Field bertipe Tanggal bisa dijadikan pengingat otomatis 90 atau 180 hari di dashboard.
- Per bagian, Admin menentukan apakah **pegawai boleh mengisi sendiri** atau **hanya Admin**
  yang boleh mengisi — sesuai kebutuhan verifikasi masing-masing jenis dokumen.
- 6 bagian bawaan (SIP, SPK, KGB, Riwayat Pangkat, CPD, Dokumen Lain) ditandai **"Bawaan
  Sistem"** dan tidak bisa dihapus, karena dipakai langsung oleh mesin pengingat dashboard —
  tapi field di dalamnya tetap bisa ditambah/dikurangi bebas.
- Bagian **Identitas** (nama, NIP, jabatan, dst di kartu profil atas) di luar sistem ini
  karena strukturnya dipakai fitur pencarian & dashboard; field tambahan di sana perlu
  dikerjakan terpisah jika suatu saat dibutuhkan.

Perubahan di menu ini langsung berlaku ke semua pegawai (real-time, tidak perlu deploy ulang).

## Lupa Password

- **Admin** (login pakai email asli): klik "Lupa password?" di halaman login -> Firebase
  mengirim email reset asli ke alamat tersebut, seperti reset password pada umumnya.
- **Pegawai** (login pakai NIP): karena akun pegawai memakai email buatan sistem
  (`NIP@pegawai.simpeg.internal`, bukan email sungguhan), reset lewat email tidak mungkin
  dilakukan. Sebagai gantinya: **Admin** membuka profil pegawai yang bersangkutan -> tab
  Identitas -> tombol **"Reset Password"** -> sistem membuatkan password sementara acak yang
  langsung aktif. Admin menyampaikan password itu ke pegawai secara langsung (tatap muka/telepon,
  bukan lewat chat), lalu pegawai disarankan segera menggantinya lewat menu Ubah Password.

Fitur reset password pegawai ini berjalan lewat **Netlify Function** (kode di folder
`netlify/functions/`), karena mengubah password akun orang lain butuh hak akses server
(Admin SDK) yang tidak boleh diberikan ke aplikasi web demi keamanan. Sengaja dipakai
Netlify Function (bukan Firebase Cloud Functions) supaya project Firebase tidak perlu
paket Blaze (yang mewajibkan kartu kredit ter-link) — lihat **SETUP.md** untuk detail env
variable yang dibutuhkan.



## Yang BELUM ada / perlu keputusan lanjutan sebelum dipakai produksi

- **Rumus kenaikan pangkat otomatis** (golongan 4 tahun vs fungsional angka kredit) belum
  dihitung otomatis karena aturannya berbeda-beda dan perlu dikonfirmasi ke BKPSDM/TU. Sebagai
  gantinya, setiap entri Riwayat Pangkat punya field "Target Kenaikan Berikutnya" yang diisi
  manual oleh admin — dari situ pengingat 180 hari dihitung.
- Audit log aktivitas pengguna, backup otomatis, dan notifikasi Email/WhatsApp belum
  diimplementasikan (disebut di SRS sebagai pengembangan lanjutan / bagian 13).
- Foto pegawai dan dokumen PDF disimpan di **Cloudinary** (bukan Firebase Storage — lihat
  SETUP.md untuk alasannya) — pastikan kuota sesuai paket Cloudinary yang dipakai (paket
  gratis: 25 kredit/bulan, jauh di atas kebutuhan aplikasi internal). **Batas ukuran per
  berkas: 2MB**, divalidasi di aplikasi sebelum upload dimulai (`MAX_FILE_SIZE_MB` di
  `src/utils/helpers.js`) — disarankan set batas serupa juga di preset upload Cloudinary
  Anda sebagai lapisan kedua. Untuk hasil scan dokumen, resolusi 150-200 DPI hitam-putih
  biasanya sudah cukup jelas dibaca dan jauh di bawah batas ini.

---

## A. Persiapan Firebase (± 5 menit)

1. Buka https://console.firebase.google.com -> **Add project** -> beri nama, mis. `simpeg-giri-asih`.
2. Menu kiri: **Build -> Authentication -> Get started -> Sign-in method -> Email/Password -> Enable**.
3. **Build -> Firestore Database -> Create database** -> lokasi `asia-southeast2 (Jakarta)` -> mode **Production**.
4. **Project settings -> General -> scroll ke "Your apps" -> tambah aplikasi Web (</>)** -> beri
   nama -> copy objek `firebaseConfig` yang muncul (dibutuhkan sebagai environment variables,
   lihat **SETUP.md**).

Firestore + Authentication gratis selamanya di paket **Spark**, tidak pernah minta kartu
kredit ditautkan. Project ini sengaja tidak memakai Firebase Storage, Hosting, atau Cloud
Functions (yang mewajibkan paket Blaze) — lihat **SETUP.md** untuk penggantinya.

## B. Deploy

Panduan lengkap (Cloudinary, Netlify, environment variables, deploy Firestore rules) ada di
**[SETUP.md](./SETUP.md)**. Ringkasnya:

```bash
npm install -g firebase-tools     # sekali saja, untuk deploy Firestore rules
firebase login
firebase deploy --only firestore  # deploy security rules & indexes -- gratis, tanpa Blaze
```

Lalu hubungkan project ini ke Netlify (lewat Git atau `netlify deploy --prod`) dan isi
environment variables sesuai **SETUP.md**. Netlify akan otomatis build dengan `npm run build`
dan publish folder `dist` (sudah diatur lewat `netlify.toml`).

## C. Membuat akun Admin pertama

Aturan keamanan sengaja melarang siapa pun membuat akun dengan role "admin" dari aplikasi web
(supaya pegawai tidak bisa menaikkan hak akses sendiri) — akun pegawai sendiri sudah bisa
dibuat lewat halaman **/daftar** di aplikasi (lihat "Alur akun pegawai" di atas). Untuk akun
Admin pertama, gunakan script Admin SDK:

```bash
cd scripts
npm install
```

Lalu unduh service account key: **Project settings -> Service accounts -> Generate new private
key**, simpan sebagai `scripts/serviceAccountKey.json`.

Buat akun admin pertama:
```bash
node createUser.js admin admin@rsudgiriasih.go.id "PasswordAman123" "Nama Admin"
```

Login ke aplikasi dengan email & password tersebut. Setelah itu, arahkan 173 pegawai untuk
mendaftar sendiri lewat halaman **/daftar**, lalu setujui satu per satu di menu **Verifikasi
Pendaftaran** (bisa ditautkan ke data yang sudah Anda input lewat menu Data Pegawai, atau
dibuatkan otomatis dari data pendaftaran).

## D. Menjalankan secara lokal untuk uji coba

```bash
npm run dev
```

## Struktur data Firestore

```
users/{uid}            -> { role: "admin" | "pegawai", pegawaiId?, nama, email }
pegawai/{pegawaiId}     -> data identitas
  /riwayatPendidikan/{id}
  /riwayatJabatan/{id}
  /riwayatPangkat/{id}
  /kgb/{id}
  /sip/{id}
  /str/{id}
  /spk/{id}
  /pelatihan/{id}
  /cpd/{id}
  /reward/{id}
  /punishment/{id}
  /penilaianKinerja/{id}
  /kesehatan/{id}
  /dokumenLain/{id}
```

## Menambah bagian profil baru

Semua 14 sub-bagian profil memakai satu komponen generik (`SectionRecords.jsx`) yang membaca
konfigurasi dari `src/data/sectionSchemas.js`. Untuk menambah bagian baru, cukup tambahkan
entri baru di file itu -- tidak perlu menulis komponen baru.
