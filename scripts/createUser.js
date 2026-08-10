const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();
const db = getFirestore();

const [, , role, identifier, password, extra] = process.argv;

async function main() {
  if (!role || !identifier || !password) {
    console.log("Penggunaan:");
    console.log('  node createUser.js admin <email> <password> "<Nama>"');
    console.log("  node createUser.js pegawai <NIP> <password> <pegawaiId>");
    process.exit(1);
  }

  if (role === "admin") {
    const nama = extra || "Administrator";
    const userRecord = await auth.createUser({ email: identifier, password });
    await db.collection("users").doc(userRecord.uid).set({
      role: "admin",
      email: identifier,
      nama,
    });
    console.log(`Akun admin dibuat: ${identifier}`);
  } else if (role === "pegawai") {
    const pegawaiId = extra;
    if (!pegawaiId) {
      console.log("pegawaiId wajib diisi untuk akun pegawai.");
      process.exit(1);
    }
    const email = `${identifier}@pegawai.simpeg.internal`;
    const pegawaiDoc = await db.collection("pegawai").doc(pegawaiId).get();
    const nama = pegawaiDoc.exists ? pegawaiDoc.data().nama : identifier;

    const userRecord = await auth.createUser({ email, password });
    await db.collection("users").doc(userRecord.uid).set({
      role: "pegawai",
      email,
      pegawaiId,
      nama,
    });
    console.log(`Akun pegawai dibuat. Login dengan NIP: ${identifier}`);
  } else {
    console.log('Role harus "admin" atau "pegawai".');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});