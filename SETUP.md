# SI-PATUH — Panduan Setup & Deploy (100% Gratis, Tanpa Kartu)

Dokumen ini menjelaskan apa yang berubah dari versi asli, dan langkah-langkah
supaya aplikasi ini jalan penuh di Netlify tanpa perlu link kartu kredit ke mana pun.

## Ringkasan Perubahan

| Fitur | Sebelumnya | Sekarang |
|---|---|---|
| Upload foto/dokumen | Firebase Storage | **Cloudinary** (unsigned upload, gratis) |
| Reset password pegawai (admin) | Firebase Cloud Function | **Netlify Function** (`netlify/functions/reset-pegawai-password.js`) |
| Konfigurasi Firebase client | Hardcoded di `src/firebase.js` | Environment variables (`VITE_FIREBASE_*`) |
| `firebase.json` | hosting + firestore + storage + functions | Hanya `firestore` (rules & indexes) |
| Folder `functions/` (Firebase) | Ada | **Dihapus** — diganti `netlify/functions/` |
| `storage.rules` | Ada | Dihapus (tidak dipakai lagi) |

Hasilnya: project Firebase Anda **hanya memakai Authentication + Firestore**,
dua layanan yang gratis selamanya di Spark plan dan **tidak pernah** minta
kartu kredit ditautkan.

## Langkah Setup

### 1. Cloudinary (untuk upload foto & dokumen)

1. Daftar gratis di [cloudinary.com](https://cloudinary.com) — tidak perlu kartu.
2. Di Dashboard, catat **Cloud name** Anda.
3. Buka **Settings → Upload → Upload presets → Add upload preset**.
   - **Signing Mode**: pilih **Unsigned** (wajib, supaya browser bisa upload
     langsung tanpa backend).
   - (Opsional tapi disarankan) Set **Max file size** ke 2 MB, samakan dengan
     batas di aplikasi.
   - Simpan, catat **nama preset**-nya.

### 2. Deploy Firestore Rules (dari komputer Anda, sekali saja / tiap ada perubahan rules)

```bash
npm install -g firebase-tools   # sekali saja
firebase login
firebase deploy --only firestore
```

Ini tidak butuh Blaze plan — deploy rules & indexes gratis di semua plan.

### 3. Hubungkan Project ke Netlify

**Opsi A — lewat Git (disarankan, auto-deploy tiap push):**
1. Push project ini ke GitHub/GitLab.
2. Di Netlify: **Add new site → Import an existing project** → pilih repo.
3. Build command: `npm run build` — Publish directory: `dist` (sudah diatur
   otomatis lewat `netlify.toml`, tidak perlu diisi manual).

**Opsi B — drag & drop / Netlify CLI (tanpa Git):**
```bash
npm install -g netlify-cli   # sekali saja
npm run build
netlify deploy --prod
```

### 4. Isi Environment Variables di Netlify

Buka **Site configuration → Environment variables**, tambahkan semua ini:

**Dari Firebase Console → Project Settings → General → Your apps:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**Dari Cloudinary (langkah 1):**
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

**Dari `scripts/serviceAccountKey.json` milik Anda (buka filenya, salin nilainya):**
- `FIREBASE_PROJECT_ID` → nilai field `project_id`
- `FIREBASE_CLIENT_EMAIL` → nilai field `client_email`
- `FIREBASE_PRIVATE_KEY` → nilai field `private_key` (termasuk `-----BEGIN PRIVATE KEY-----` dst.)

⚠️ **Penting**: 3 variabel terakhir TIDAK boleh diberi prefix `VITE_`. Kalau
diberi prefix `VITE_`, nilainya akan ikut ter-bundle ke kode yang dikirim ke
browser pengguna dan bisa dibaca siapa saja — ini kredensial admin penuh ke
project Firebase Anda, harus tetap rahasia di sisi server.

Setelah env vars terisi, trigger deploy ulang (**Deploys → Trigger deploy**)
supaya nilainya terbaca oleh build.

### 5. Buat akun Admin pertama (lokal, sekali saja)

```bash
cd scripts
npm install
node createUser.js   # cek isi file ini dulu untuk detail argumen yang dibutuhkan
```

Script ini pakai `serviceAccountKey.json` secara langsung di komputer Anda —
tidak ada hubungannya dengan hosting, jadi tidak butuh Netlify/Blaze sama sekali.

## Yang HARUS Anda Jaga Kerahasiaannya

- `scripts/serviceAccountKey.json` — kredensial admin penuh ke project
  Firebase Anda. Sudah ada di `.gitignore`, jangan pernah di-commit, di-share,
  atau di-upload ke tempat publik.
- Nilai `FIREBASE_PRIVATE_KEY` di Netlify — sama sensitifnya, isi hanya lewat
  Netlify Dashboard.

## Cek Cepat Setelah Deploy

- [ ] Bisa login (Auth + Firestore jalan)
- [ ] Upload foto profil pegawai berhasil muncul (Cloudinary jalan)
- [ ] Admin bisa klik "Reset Password" di profil pegawai dan dapat password baru (Netlify Function jalan)
- [ ] Refresh halaman di URL selain `/` (mis. `/data-pegawai`) tidak 404 (SPA redirect jalan)

## Biaya

Rp0. Selamanya, selama pemakaian wajar (Firestore/Auth: gratis tanpa batas
waktu di Spark plan; Netlify: 100GB bandwidth + 300 menit build/bulan;
Netlify Functions: 125.000 request/bulan; Cloudinary: 25 kredit/bulan —
semuanya jauh di atas kebutuhan aplikasi kepegawaian internal).
