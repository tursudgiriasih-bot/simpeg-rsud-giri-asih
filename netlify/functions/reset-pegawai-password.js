// Pakai modular API firebase-admin (firebase-admin/app, /auth, /firestore),
// BUKAN "import admin from 'firebase-admin'" (namespace/default export).
// Cara lama itu diketahui bermasalah di banyak environment ESM/bundler
// (termasuk Netlify Functions).
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Pengganti Firebase Cloud Function (functions/index.js -> resetPegawaiPassword),
// dipindah ke Netlify Function supaya tidak perlu upgrade Firebase ke Blaze plan.
//
// Kenapa harus lewat server (bukan langsung dari browser)?
// Akun pegawai memakai email buatan sistem (bukan email sungguhan), jadi reset
// password tidak bisa lewat email seperti akun Admin -- satu-satunya cara sah
// adalah lewat Firebase Admin SDK di server.
//
// Env vars yang dibutuhkan (diisi di Netlify: Site settings -> Environment
// variables -- JANGAN taruh di file .env yang ikut ke-bundle ke browser):
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// Ketiganya diambil dari scripts/serviceAccountKey.json milik Anda sendiri
// (field project_id, client_email, private_key).

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Inisialisasi dilakukan saat fungsi dipanggil (bukan saat file dimuat), supaya
// kalau konfigurasi salah, hasilnya tetap berupa pesan error yang jelas ke
// layar -- bukan halaman error kosong dari Netlify.
let services = null;
function getServices() {
  if (services) return services;
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    const err = new Error("FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY belum diisi di Netlify.");
    err.code = "config/missing-env";
    throw err;
  }
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }
  services = { auth: getAuth(), db: getFirestore() };
  return services;
}

// Mengubah error teknis menjadi [status HTTP, pesan untuk layar].
function explain(err) {
  const code = err?.code || "";
  const text = String(err?.message || "");
  if (code === "config/missing-env") {
    return [500, "Konfigurasi server belum lengkap: variabel Firebase di Netlify belum diisi."];
  }
  if (code === "auth/user-not-found") {
    return [404, "Akun login pegawai ini tidak ditemukan di Firebase Authentication (mungkin sudah terhapus). Hapus lalu daftarkan ulang pegawai ini."];
  }
  if (code === "auth/invalid-password" || code === "auth/password-does-not-meet-requirements") {
    return [400, "Password sementara ditolak karena belum memenuhi syarat keamanan Firebase."];
  }
  if (/private key|invalid_grant|credential|UNAUTHENTICATED|PERMISSION_DENIED|permission/i.test(code + " " + text)) {
    return [500, "Kunci akses Firebase Admin di Netlify tidak valid atau tidak punya izin. Periksa variabel FIREBASE_* di Netlify."];
  }
  return [500, "Server gagal memproses reset password."];
}

export default async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const { auth, db } = getServices();

    const authHeader = req.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!idToken) {
      return json(401, { error: "Anda harus login." });
    }

    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch {
      return json(401, { error: "Sesi tidak valid, silakan login ulang." });
    }

    const callerSnap = await db.collection("users").doc(decoded.uid).get();
    if (!callerSnap.exists || callerSnap.data().role !== "admin") {
      return json(403, { error: "Hanya Admin yang boleh mereset password pegawai." });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Data tidak valid." });
    }

    const { pegawaiId, newPassword } = body || {};
    if (!pegawaiId || typeof newPassword !== "string" || newPassword.length < 6) {
      return json(400, { error: "Data tidak lengkap atau password terlalu pendek (minimal 6 karakter)." });
    }

    const userQuery = await db.collection("users").where("pegawaiId", "==", pegawaiId).limit(1).get();
    if (userQuery.empty) {
      return json(404, { error: "Akun login untuk pegawai ini belum ada (pegawai belum mendaftar/diverifikasi)." });
    }

    await auth.updateUser(userQuery.docs[0].id, { password: newPassword });
    return json(200, { success: true });
  } catch (err) {
    console.error("reset-pegawai-password gagal:", err);
    const [status, message] = explain(err);
    return json(status, { error: message, code: err?.code || null, detail: String(err?.message || err).slice(0, 300) });
  }
};

export const config = { path: "/api/reset-pegawai-password" };
