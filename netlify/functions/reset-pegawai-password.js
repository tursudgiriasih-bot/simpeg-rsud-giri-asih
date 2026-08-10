import admin from "firebase-admin";

// Pengganti Firebase Cloud Function (functions/index.js -> resetPegawaiPassword),
// dipindah ke Netlify Function supaya tidak perlu upgrade Firebase ke Blaze plan.
//
// Kenapa harus lewat server (bukan langsung dari browser)?
// Akun pegawai memakai email buatan sistem (bukan email sungguhan), jadi reset
// password tidak bisa lewat email seperti akun Admin -- satu-satunya cara sah
// adalah lewat Firebase Admin SDK di server. Client (browser) tidak pernah
// diberi izin mengubah password akun lain secara langsung.
//
// Env vars yang dibutuhkan (diisi di Netlify: Site settings -> Environment
// variables -- JANGAN taruh di file .env yang ikut ke-bundle ke browser):
//   FIREBASE_PROJECT_ID
//   FIREBASE_CLIENT_EMAIL
//   FIREBASE_PRIVATE_KEY
// Ketiganya diambil dari scripts/serviceAccountKey.json milik Anda sendiri
// (field project_id, client_email, private_key).

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
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
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch {
    return json(401, { error: "Sesi tidak valid, silakan login ulang." });
  }

  const callerSnap = await admin.firestore().collection("users").doc(decoded.uid).get();
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

  const userQuery = await admin
    .firestore()
    .collection("users")
    .where("pegawaiId", "==", pegawaiId)
    .limit(1)
    .get();

  if (userQuery.empty) {
    return json(404, { error: "Akun login untuk pegawai ini belum ada (pegawai belum mendaftar/diverifikasi)." });
  }

  const targetUid = userQuery.docs[0].id;
  await admin.auth().updateUser(targetUid, { password: newPassword });

  return json(200, { success: true });
};

export const config = { path: "/api/reset-pegawai-password" };
