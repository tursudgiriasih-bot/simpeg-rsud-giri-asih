import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Konfigurasi diambil dari environment variables (lihat .env.example).
// Di Netlify: Site settings -> Environment variables.
// Di lokal: buat file .env di root project (jangan pernah di-commit).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Catatan: proyek ini sengaja HANYA memakai Auth + Firestore (Spark plan,
// gratis selamanya, tanpa kartu). Upload berkas lewat Cloudinary
// (lihat src/utils/cloudinary.js), dan aksi admin sensitif (reset password
// pegawai) lewat Netlify Function (lihat netlify/functions/), bukan
// Firebase Storage / Cloud Functions -- karena keduanya kini mewajibkan
// Blaze plan (kartu ter-link ke akun).
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
