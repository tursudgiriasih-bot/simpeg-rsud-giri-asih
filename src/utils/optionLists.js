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

// Daftar pilihan dropdown yang bisa dikelola Admin (menu "Kelola Pilihan").
// Nama kunci (profesi, agama, ...) SAMA dengan nama field di data pegawai.
// Daftar disimpan di Firestore: appSettings/{docId} -> { list: [...] }.
// Selama Admin belum mengubah daftar, yang dipakai adalah `defaults` di bawah.
// Begitu Admin menambah/mengubah/menghapus satu pilihan, seluruh daftar
// disimpan ke Firestore dan daftar itulah yang berlaku.

const GOLONGAN_PNS = [
  "I/a", "I/b", "I/c", "I/d",
  "II/a", "II/b", "II/c", "II/d",
  "III/a", "III/b", "III/c", "III/d",
  "IV/a", "IV/b", "IV/c", "IV/d", "IV/e",
];

const GOLONGAN_PPPK = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX",
  "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII",
].map((r) => `Golongan ${r}`);

export const OPTION_LISTS = {
  profesi: {
    label: "Profesi",
    docId: "profesi", // sama dengan daftar profesi yang sudah ada -- data lama tetap terpakai
    defaults: [
      "Dokter Spesialis", "Dokter Umum", "Dokter Gigi", "Perawat Ners", "Perawat D3", "Bidan",
      "Apoteker", "Analis Kesehatan", "Radiografer", "Nutrisionis", "Tenaga Administrasi",
    ],
  },
  unitKerja: {
    label: "Unit Kerja",
    docId: "unitKerja",
    defaults: [
      "Poliklinik", "Ruang Rawat Inap", "Ruang Operasi", "Tata Usaha", "UGD",
      "Ruang Bersalin", "Ruang Intensif", "CSSD", "IPSRS", "Gizi",
    ],
  },
  golongan: {
    label: "Golongan",
    docId: "golongan",
    defaults: [...GOLONGAN_PNS, ...GOLONGAN_PPPK],
  },
  agama: {
    label: "Agama",
    docId: "agama",
    defaults: ["Hindu", "Islam", "Kristen Katolik", "Kristen Protestan", "Budha", "Konghucu"],
  },
  statusPerkawinan: {
    label: "Status Perkawinan",
    docId: "statusPerkawinan",
    defaults: ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"],
  },
};

export const BELUM_DIISI = "Belum diisi";

export function isManagedField(field) {
  return Object.prototype.hasOwnProperty.call(OPTION_LISTS, field);
}

const settingsRef = (key) => doc(db, "appSettings", OPTION_LISTS[key].docId);

function normalize(name) {
  return (name || "").replace(/\s+/g, " ").trim();
}

function sameName(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

// Langganan realtime ke daftar pilihan. Kalau dokumennya belum ada (atau
// gagal dibaca), otomatis memakai daftar bawaan supaya dropdown tidak
// pernah kosong.
export function useOptionList(key) {
  const defaults = OPTION_LISTS[key].defaults;
  const [list, setList] = useState(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setList(defaults);
    const unsub = onSnapshot(
      settingsRef(key),
      (snap) => {
        const saved = snap.exists() ? snap.data().list : null;
        setList(Array.isArray(saved) ? saved : defaults);
        setLoading(false);
      },
      () => {
        setList(defaults);
        setLoading(false);
      }
    );
    return unsub;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { list, loading };
}

async function saveList(key, list) {
  await setDoc(settingsRef(key), { list, updatedAt: new Date() });
}

export async function addOption(key, name, currentList) {
  const clean = normalize(name);
  if (!clean) throw new Error("Isian tidak boleh kosong.");
  if (currentList.some((x) => sameName(x, clean))) {
    throw new Error(`"${clean}" sudah ada di daftar.`);
  }
  await saveList(key, [...currentList, clean]);
}

// Mengganti nama satu pilihan: semua pegawai yang memakai nama lama otomatis
// ikut diganti ke nama baru, supaya data dan grafik dashboard tetap konsisten.
// Mengembalikan jumlah pegawai yang ikut diperbarui.
export async function renameOption(key, oldName, newName, currentList) {
  const clean = normalize(newName);
  if (!clean) throw new Error("Isian tidak boleh kosong.");
  if (clean === oldName) return 0;
  if (currentList.some((x) => x !== oldName && sameName(x, clean))) {
    throw new Error(`"${clean}" sudah ada di daftar.`);
  }

  const snap = await getDocs(query(collection(db, "pegawai"), where(key, "==", oldName)));
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { [key]: clean, updatedAt: new Date() }));
    await batch.commit();
  }

  await saveList(key, currentList.map((x) => (x === oldName ? clean : x)));
  return docs.length;
}

// Pilihan yang masih dipakai pegawai TIDAK boleh dihapus (supaya data pegawai
// tidak diam-diam kehilangan isiannya). Ubah dulu data pegawai tersebut,
// atau cukup ganti nama pilihannya.
export async function deleteOption(key, name, currentList) {
  const snap = await getDocs(query(collection(db, "pegawai"), where(key, "==", name)));
  if (snap.size > 0) {
    throw new Error(
      `"${name}" masih dipakai ${snap.size} pegawai, jadi belum bisa dihapus. ` +
        `Ubah dulu data pegawai tersebut, atau gunakan Edit untuk mengganti namanya.`
    );
  }
  await saveList(key, currentList.filter((x) => x !== name));
}

// { "Bidan": 12, "Perawat Ners": 30, "Belum diisi": 4 }
export function countByField(pegawaiList, field) {
  const counts = {};
  pegawaiList.forEach((p) => {
    const key = normalize(p[field]) || BELUM_DIISI;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

// Baris [nama, jumlah] terurut dari terbanyak; "Belum diisi" selalu paling bawah.
export function tallyField(pegawaiList, field) {
  return Object.entries(countByField(pegawaiList, field)).sort((a, b) => {
    if (a[0] === BELUM_DIISI) return 1;
    if (b[0] === BELUM_DIISI) return -1;
    return b[1] - a[1];
  });
}
