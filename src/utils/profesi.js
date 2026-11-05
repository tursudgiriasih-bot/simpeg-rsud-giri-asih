import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase";

// Daftar profesi bawaan. Dipakai selama Admin belum pernah mengubah daftar
// lewat menu "Kelola Profesi". Begitu Admin menambah/mengubah/menghapus satu
// profesi, seluruh daftar disimpan ke Firestore (appSettings/profesi) dan
// daftar inilah yang berlaku -- jadi Admin bebas menghapus bawaan yang tidak
// diperlukan.
export const DEFAULT_PROFESI = [
  "Dokter Spesialis",
  "Dokter Umum",
  "Dokter Gigi",
  "Perawat Ners",
  "Perawat D3",
  "Bidan",
  "Apoteker",
  "Analis Kesehatan",
  "Radiografer",
  "Nutrisionis",
  "Tenaga Administrasi",
];

export const BELUM_DIISI = "Belum diisi";

const settingsRef = () => doc(db, "appSettings", "profesi");

function normalize(name) {
  return (name || "").replace(/\s+/g, " ").trim();
}

function sameName(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

// Langganan realtime ke daftar profesi. Kalau dokumennya belum ada (atau
// gagal dibaca), otomatis memakai DEFAULT_PROFESI supaya dropdown tidak
// pernah kosong.
export function useProfesiList() {
  const [list, setList] = useState(DEFAULT_PROFESI);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      settingsRef(),
      (snap) => {
        const saved = snap.exists() ? snap.data().list : null;
        setList(Array.isArray(saved) ? saved : DEFAULT_PROFESI);
        setLoading(false);
      },
      () => {
        setList(DEFAULT_PROFESI);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { list, loading };
}

async function saveList(list) {
  await setDoc(settingsRef(), { list, updatedAt: new Date() });
}

export async function addProfesi(name, currentList) {
  const clean = normalize(name);
  if (!clean) throw new Error("Nama profesi tidak boleh kosong.");
  if (currentList.some((x) => sameName(x, clean))) {
    throw new Error(`Profesi "${clean}" sudah ada di daftar.`);
  }
  await saveList([...currentList, clean]);
}

// Mengganti nama profesi: semua pegawai yang memakai nama lama otomatis ikut
// diganti ke nama baru, supaya data dan grafik dashboard tetap konsisten.
// Mengembalikan jumlah pegawai yang ikut diperbarui.
export async function renameProfesi(oldName, newName, currentList) {
  const clean = normalize(newName);
  if (!clean) throw new Error("Nama profesi tidak boleh kosong.");
  if (clean === oldName) return 0;
  if (currentList.some((x) => x !== oldName && sameName(x, clean))) {
    throw new Error(`Profesi "${clean}" sudah ada di daftar.`);
  }

  const snap = await getDocs(query(collection(db, "pegawai"), where("profesi", "==", oldName)));
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { profesi: clean, updatedAt: new Date() }));
    await batch.commit();
  }

  await saveList(currentList.map((x) => (x === oldName ? clean : x)));
  return docs.length;
}

// Profesi yang masih dipakai pegawai TIDAK boleh dihapus (supaya data pegawai
// tidak diam-diam kehilangan profesinya). Ubah dulu profesi pegawai tersebut,
// atau cukup ganti nama profesinya.
export async function deleteProfesi(name, currentList) {
  const snap = await getDocs(query(collection(db, "pegawai"), where("profesi", "==", name)));
  if (snap.size > 0) {
    throw new Error(
      `Profesi "${name}" masih dipakai ${snap.size} pegawai, jadi belum bisa dihapus. ` +
        `Ubah dulu profesi pegawai tersebut, atau gunakan Edit untuk mengganti namanya.`
    );
  }
  await saveList(currentList.filter((x) => x !== name));
}

// { "Bidan": 12, "Perawat Ners": 30, "Belum diisi": 4 }
export function countByProfesi(pegawaiList) {
  const counts = {};
  pegawaiList.forEach((p) => {
    const key = normalize(p.profesi) || BELUM_DIISI;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

// Baris [nama, jumlah] terurut dari terbanyak; "Belum diisi" selalu paling bawah.
export function tallyProfesi(pegawaiList) {
  return Object.entries(countByProfesi(pegawaiList)).sort((a, b) => {
    if (a[0] === BELUM_DIISI) return 1;
    if (b[0] === BELUM_DIISI) return -1;
    return b[1] - a[1];
  });
}
