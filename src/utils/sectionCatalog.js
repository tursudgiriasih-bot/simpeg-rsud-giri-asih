import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";
import { SECTIONS as BUILTIN_DEFAULTS } from "../data/sectionSchemas";

export const SECTION_COL = "sectionDefinitions";

// Bagian "sistem": kuncinya dipakai langsung oleh logika pengingat & dashboard
// (lihat src/utils/queries.js), jadi tidak boleh dihapus atau diganti kuncinya.
// Field di dalamnya tetap boleh ditambah/dikurangi oleh Admin.
export const SYSTEM_KEYS = ["sip", "spk", "kgb", "riwayatPangkat", "cpd", "dokumenLain"];

export function subscribeSections(callback) {
  const q = query(collection(db, SECTION_COL), orderBy("order", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ key: d.id, ...d.data() })));
  });
}

// Mengisi 14 bagian bawaan SI-PATUH ke Firestore sekali saja (jika koleksinya masih kosong),
// supaya aplikasi tetap berfungsi penuh sejak pertama kali dipakai tanpa Admin harus
// membuat semuanya dari nol. Setelah ini, semuanya diedit lewat halaman Kelola Bagian Data.
export async function seedDefaultSectionsIfEmpty() {
  const existing = await getDocs(collection(db, SECTION_COL));
  if (!existing.empty) return false;

  const batch = writeBatch(db);
  Object.entries(BUILTIN_DEFAULTS).forEach(([key, cfg], i) => {
    batch.set(doc(db, SECTION_COL, key), {
      label: cfg.label,
      columns: cfg.columns,
      fields: cfg.fields,
      allowPegawaiAdd: key === "pelatihan" || key === "kesehatan",
      system: SYSTEM_KEYS.includes(key),
      order: i,
    });
  });
  await batch.commit();
  return true;
}

export async function saveSection(key, data) {
  await setDoc(doc(db, SECTION_COL, key), data, { merge: false });
}

export async function deleteSection(key) {
  await deleteDoc(doc(db, SECTION_COL, key));
}
