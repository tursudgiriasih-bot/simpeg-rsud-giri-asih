import { collection, collectionGroup, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { daysUntil } from "./helpers";

// Mengambil seluruh data pegawai (koleksi utama, bukan sub-koleksi)
export async function fetchAllPegawai() {
  const snap = await getDocs(collection(db, "pegawai"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function pegawaiIdOf(docSnap) {
  return docSnap.ref.parent.parent.id;
}

import { SYSTEM_REMINDER_FIELDS } from "./reminderFields";

async function fetchReminderCollection(collectionName, dateField, detailBuilder, pegawaiMap) {
  const snap = await getDocs(collectionGroup(db, collectionName));
  const items = [];
  snap.forEach((d) => {
    const data = d.data();
    const dateVal = data[dateField];
    if (!dateVal) return;
    const pid = pegawaiIdOf(d);
    const pegawai = pegawaiMap[pid];
    if (!pegawai) return;
    items.push({
      id: d.id,
      pegawaiId: pid,
      pegawaiNama: pegawai.nama,
      date: dateVal,
      detail: detailBuilder(data),
    });
  });
  return items;
}

// Mengambil semua data yang dibutuhkan dashboard admin dalam satu pemanggilan.
export async function fetchDashboardData() {
  const pegawaiList = await fetchAllPegawai();
  const pegawaiMap = Object.fromEntries(pegawaiList.map((p) => [p.id, p]));

  const [sip, spk, kgb, pangkat, cpdSnap, dokumenSnap] = await Promise.all([
    fetchReminderCollection("sip", SYSTEM_REMINDER_FIELDS.sip, (d) => `SIP No. ${d.nomorSip || "-"}`, pegawaiMap),
    fetchReminderCollection("spk", SYSTEM_REMINDER_FIELDS.spk, (d) => `SPK No. ${d.nomorSpk || "-"}`, pegawaiMap),
    fetchReminderCollection("kgb", SYSTEM_REMINDER_FIELDS.kgb, (d) => `KGB No. ${d.nomorSk || "-"}`, pegawaiMap),
    fetchReminderCollection("riwayatPangkat", SYSTEM_REMINDER_FIELDS.riwayatPangkat, (d) => `Kenaikan dari ${d.pangkat || "-"} (${d.golongan || "-"})`, pegawaiMap),
    getDocs(collectionGroup(db, "cpd")),
    getDocs(collectionGroup(db, "dokumenLain")),
  ]);

  const within = (items, threshold) =>
    items
      .map((it) => ({ ...it, _days: daysUntil(it.date) }))
      .filter((it) => it._days !== null && it._days <= threshold)
      .sort((a, b) => a._days - b._days);

  // CPD: pegawai dengan total JP tahun berjalan < 20
  const currentYear = new Date().getFullYear();
  const cpdByPegawai = {};
  cpdSnap.forEach((d) => {
    const data = d.data();
    if (data.tahun !== currentYear) return;
    const pid = pegawaiIdOf(d);
    cpdByPegawai[pid] = (cpdByPegawai[pid] || 0) + (Number(data.totalJp) || 0);
  });
  const belumCpd = pegawaiList.filter((p) => (cpdByPegawai[p.id] || 0) < 20);

  // Dokumen belum lengkap: pegawai tanpa satupun entri "Dokumen Lain"
  const pegawaiWithDokumen = new Set();
  dokumenSnap.forEach((d) => pegawaiWithDokumen.add(pegawaiIdOf(d)));
  const dokumenBelumLengkap = pegawaiList.filter((p) => !pegawaiWithDokumen.has(p.id));

  return {
    pegawaiList,
    reminders90: {
      sip: within(sip, 90),
      spk: within(spk, 90),
      kgb: within(kgb, 90),
    },
    reminders180: {
      pangkat: within(pangkat, 180),
    },
    belumCpd,
    dokumenBelumLengkap,
  };
}

// Mengambil SEMUA data dari satu bagian (mis. "sip") lintas SELURUH pegawai sekaligus,
// dipakai halaman "Cek Masa Berlaku Dokumen" supaya bisa difilter/diurutkan bebas
// (per tahun, per rentang hari, dll) -- bukan cuma ambang 90/180 hari yang dipatok dashboard.
export async function fetchSectionAcrossPegawai(sectionKey) {
  const pegawaiList = await fetchAllPegawai();
  const pegawaiMap = Object.fromEntries(pegawaiList.map((p) => [p.id, p]));
  const snap = await getDocs(collectionGroup(db, sectionKey));
  const rows = [];
  snap.forEach((d) => {
    const pid = pegawaiIdOf(d);
    const pegawai = pegawaiMap[pid];
    if (!pegawai) return; // dokumen yatim (pegawai sudah dihapus) diabaikan
    rows.push({ id: d.id, pegawaiId: pid, pegawai, ...d.data() });
  });
  return rows;
}
