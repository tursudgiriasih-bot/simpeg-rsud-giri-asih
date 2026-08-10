import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";
import ReminderList from "../components/ReminderList";
import { useAuth } from "../context/AuthContext";

export default function DashboardPegawai() {
  const { profile } = useAuth();
  const [pegawai, setPegawai] = useState(null);
  const [reminders, setReminders] = useState({ sip: [], spk: [], kgb: [], pangkat: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.pegawaiId) return;
    const pid = profile.pegawaiId;

    async function load() {
      const pSnap = await getDoc(doc(db, "pegawai", pid));
      const pData = pSnap.exists() ? { id: pSnap.id, ...pSnap.data() } : null;
      setPegawai(pData);
      const nama = pData?.nama || "";

      const build = (snap, dateField, detailFn) =>
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => r[dateField])
          .map((r) => ({ id: r.id, pegawaiId: pid, pegawaiNama: nama, date: r[dateField], detail: detailFn(r) }));

      const [sipSnap, spkSnap, kgbSnap, pangkatSnap] = await Promise.all([
        getDocs(collection(db, "pegawai", pid, "sip")),
        getDocs(collection(db, "pegawai", pid, "spk")),
        getDocs(collection(db, "pegawai", pid, "kgb")),
        getDocs(collection(db, "pegawai", pid, "riwayatPangkat")),
      ]);

      setReminders({
        sip: build(sipSnap, "tanggalBerakhir", (d) => `SIP No. ${d.nomorSip || "-"}`),
        spk: build(spkSnap, "tanggalBerakhir", (d) => `SPK No. ${d.nomorSpk || "-"}`),
        kgb: build(kgbSnap, "tanggalBerakhir", (d) => `KGB No. ${d.nomorSk || "-"}`),
        pangkat: build(pangkatSnap, "targetKenaikanBerikutnya", (d) => `Kenaikan dari ${d.pangkat || "-"}`),
      });
      setLoading(false);
    }
    load();
  }, [profile?.pegawaiId]);

  if (!profile?.pegawaiId) {
    return (
      <Layout>
        <div className="card p-6 text-sm text-[color:var(--color-ink-500)]">
          Akun Anda belum terhubung dengan data pegawai. Hubungi Bagian TU Kepegawaian.
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-sm text-[color:var(--color-ink-500)]">Memuat…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Selamat datang, {pegawai?.nama}</h1>
        <p className="text-sm text-[color:var(--color-ink-500)] mt-1">
          {pegawai?.jabatan} · {pegawai?.unitKerja}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReminderList title="SIP Anda" items={reminders.sip} threshold={90} />
        <ReminderList title="SPK Anda" items={reminders.spk} threshold={90} />
        <ReminderList title="Kenaikan Gaji Berkala" items={reminders.kgb} threshold={90} />
        <ReminderList title="Kenaikan Pangkat/Golongan" items={reminders.pangkat} threshold={180} />
      </div>

      <div className="mt-6">
        <a href={`/profil-saya`} className="text-sm text-[color:var(--color-teal-700)] hover:underline">
          Lihat profil lengkap saya →
        </a>
      </div>
    </Layout>
  );
}
