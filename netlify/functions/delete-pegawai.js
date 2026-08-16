// Pakai modular API firebase-admin (firebase-admin/app, /auth, /firestore) --
// lihat catatan lengkap di reset-pegawai-password.js soal kenapa BUKAN pakai
// "import admin from 'firebase-admin'".
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Menghapus data pegawai SECARA TUNTAS -- dipanggil dari tombol "Hapus" di
// halaman Data Pegawai. Sebelumnya penghapusan hanya menghapus dokumen
// profil (client-side), meninggalkan "data yatim": akun login (Firebase
// Auth) dan seluruh riwayat/dokumen pegawai TIDAK ikut terhapus. Akibatnya
// kalau orang yang sama coba daftar ulang dengan NIP yang sama, sistem
// menolak karena akun lamanya masih ada.
//
// Fungsi ini (lewat Firebase Admin SDK, sama seperti reset-pegawai-password)
// menghapus SEMUANYA: akun Auth, dokumen mapping "users/{uid}", seluruh
// sub-koleksi (riwayat pendidikan, SIP, SPK, KGB, dst), baru dokumen
// profil utamanya -- supaya NIP itu benar-benar bebas dipakai daftar ulang.
//
// Env vars yang dibutuhkan sama seperti reset-pegawai-password.js:
// FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// (diisi di Netlify: Site settings -> Environment variables).

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

const auth = getAuth();
const db = getFirestore();

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function deleteAllDocsIn(collectionRef) {
  const docs = await collectionRef.listDocuments();
  await Promise.all(docs.map((d) => d.delete()));
}

export default async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

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
    return json(403, { error: "Hanya Admin yang boleh menghapus data pegawai." });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Data tidak valid." });
  }

  const { pegawaiId } = body || {};
  if (!pegawaiId) {
    return json(400, { error: "pegawaiId wajib diisi." });
  }

  const pegawaiRef = db.collection("pegawai").doc(pegawaiId);

  // 1) Hapus akun login (Firebase Auth) + dokumen mapping "users/{uid}"
  const usersQuery = await db.collection("users").where("pegawaiId", "==", pegawaiId).get();
  await Promise.all(
    usersQuery.docs.map(async (d) => {
      try {
        await auth.deleteUser(d.id);
      } catch {
        // Akun Auth mungkin sudah tidak ada / sudah terhapus sebelumnya -- lanjutkan saja.
      }
      await d.ref.delete();
    })
  );

  // 2) Hapus semua sub-koleksi (riwayat pendidikan, SIP, SPK, KGB, dst) apapun
  // namanya, supaya tidak ada dokumen yatim tersisa di database.
  const subcollections = await pegawaiRef.listCollections();
  await Promise.all(subcollections.map((c) => deleteAllDocsIn(c)));

  // 3) Terakhir, hapus dokumen profil utamanya.
  await pegawaiRef.delete();

  return json(200, { success: true });
};

export const config = { path: "/api/delete-pegawai" };
