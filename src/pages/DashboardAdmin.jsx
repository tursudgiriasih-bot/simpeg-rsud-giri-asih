import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import ReminderList from "../components/ReminderList";
import { fetchDashboardData } from "../utils/queries";
import { seedDefaultSectionsIfEmpty } from "../utils/sectionCatalog";

// Ambang "akan berakhir" dashboard -- disamakan semua kategori jadi 180 hari
// (lihat fetchDashboardData di utils/queries.js).
const THRESHOLD_DAYS = 180;

const AGE_BUCKETS = ["20-30", "31-40", "41-50", "51-60", "61-65"];
const CHART_TICK = { fontSize: 12, fill: "var(--color-ink-500)" };

function groupCount(list, key) {
  const map = {};
  list.forEach((p) => {
    const k = p[key] || "Tidak diketahui";
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));
}

// Menghitung jumlah per kategori TETAP (urutan sudah ditentukan, bukan
// diurutkan berdasar jumlah terbanyak) -- lebih enak dibaca untuk jenis
// kelamin/status pegawai dibanding groupCount() yang mengurutkan bebas.
// Nilai yang tidak dikenali (data lama/salah ketik) masuk "Lainnya", dan
// yang kosong masuk "Belum diisi", supaya tidak ada data yang hilang diam-diam.
function tallyFixedOrder(list, key, knownValues) {
  const counts = {};
  list.forEach((p) => {
    const v = (p[key] || "").trim();
    const bucket = !v ? "Belum diisi" : knownValues.includes(v) ? v : "Lainnya";
    counts[bucket] = (counts[bucket] || 0) + 1;
  });
  const rows = knownValues.map((k) => [k, counts[k] || 0]);
  if (counts["Lainnya"]) rows.push(["Lainnya", counts["Lainnya"]]);
  if (counts["Belum diisi"]) rows.push(["Belum diisi", counts["Belum diisi"]]);
  return rows;
}

// Mengenali variasi penulisan jenis kelamin yang umum dipakai (huruf besar/
// kecil, singkatan, dsb) supaya data lama yang formatnya sedikit berbeda
// tetap terhitung dengan benar -- bukan jatuh ke "Lainnya" hanya karena
// tidak persis sama tulisannya. Yang benar-benar tidak dikenali atau kosong
// tidak dihitung di kartu ini (kartu ini sengaja hanya 2 baris: Laki-laki
// dan Perempuan, sesuai permintaan -- kalau angkanya belum pas, isi ulang
// field Jenis Kelamin pegawai terkait lewat dropdown yang baru).
function normalizeGender(raw) {
  const v = (raw || "").trim().toLowerCase();
  if (["laki-laki", "laki laki", "l", "pria", "male", "m"].includes(v)) return "Laki-laki";
  if (["perempuan", "p", "wanita", "female", "f"].includes(v)) return "Perempuan";
  return null;
}

function tallyGender(list) {
  const counts = { "Laki-laki": 0, Perempuan: 0 };
  list.forEach((p) => {
    const g = normalizeGender(p.jenisKelamin);
    if (g) counts[g] += 1;
  });
  return [["Laki-laki", counts["Laki-laki"]], ["Perempuan", counts["Perempuan"]]];
}

function ageOf(tanggalLahir) {
  if (!tanggalLahir) return null;
  const dob = tanggalLahir?.toDate ? tanggalLahir.toDate() : new Date(tanggalLahir);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

function ageBucketOf(age) {
  if (age === null) return "Belum diisi";
  if (age <= 30) return "20-30";
  if (age <= 40) return "31-40";
  if (age <= 50) return "41-50";
  if (age <= 60) return "51-60";
  if (age <= 65) return "61-65";
  return "> 65";
}

function tallyAge(list) {
  const counts = {};
  list.forEach((p) => {
    const bucket = ageBucketOf(ageOf(p.tanggalLahir));
    counts[bucket] = (counts[bucket] || 0) + 1;
  });
  const rows = AGE_BUCKETS.map((k) => [k, counts[k] || 0]);
  if (counts["> 65"]) rows.push(["> 65", counts["> 65"]]);
  if (counts["Belum diisi"]) rows.push(["Belum diisi", counts["Belum diisi"]]);
  return rows;
}

// Memecah satu daftar reminder jadi jumlah "sudah expired" (_days < 0) dan
// "akan berakhir" (_days >= 0, masih dalam ambang) untuk grafik kepatuhan.
function splitStatus(list) {
  return {
    expired: list.filter((x) => x._days < 0).length,
    upcoming: list.filter((x) => x._days >= 0).length,
  };
}

function BreakdownCard({ title, rows }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-[color:var(--color-ink-500)] mb-3">{title}</div>
      <ul className="space-y-1.5">
        {rows.map(([label, value]) => (
          <li key={label} className="flex justify-between items-baseline text-sm">
            <span className="text-[color:var(--color-ink-700)]">{label}</span>
            <span className="font-mono-data font-semibold text-[color:var(--color-teal-900)]">{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardAdmin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    seedDefaultSectionsIfEmpty();
    fetchDashboardData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const perUnit = useMemo(() => (data ? groupCount(data.pegawaiList, "unitKerja") : []), [data]);
  const perGolongan = useMemo(() => (data ? groupCount(data.pegawaiList, "golongan") : []), [data]);
  const perJabatan = useMemo(() => (data ? groupCount(data.pegawaiList, "jabatan") : []), [data]);
  const genderRows = useMemo(() => (data ? tallyGender(data.pegawaiList) : []), [data]);
  const statusRows = useMemo(() => (data ? tallyFixedOrder(data.pegawaiList, "statusPegawai", ["PNS", "PPPK", "BLUD"]) : []), [data]);
  const ageRows = useMemo(() => (data ? tallyAge(data.pegawaiList) : []), [data]);

  const complianceData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "SIP", ...splitStatus(data.reminders.sip) },
      { name: "SPK", ...splitStatus(data.reminders.spk) },
      { name: "KGB", ...splitStatus(data.reminders.kgb) },
      { name: "Kenaikan Pangkat", ...splitStatus(data.reminders.pangkat) },
    ];
  }, [data]);

  if (loading) {
    return (
      <Layout>
        <div className="text-sm text-[color:var(--color-ink-500)]">Memuat dashboard…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Dashboard</h1>
        <p className="text-sm text-[color:var(--color-ink-500)] mt-1">Ringkasan data kepegawaian secara real time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Pegawai" value={data.pegawaiList.length} />
        <BreakdownCard title="Jenis Kelamin" rows={genderRows} />
        <BreakdownCard title="Status Kepegawaian" rows={statusRows} />
        <BreakdownCard title="Rentang Usia" rows={ageRows} />
      </div>

      {/* Grafik ringkasan kepatuhan dokumen -- jumlah per kategori
          (SIP/SPK/KGB/Kenaikan Pangkat), dipisah expired vs akan berakhir */}
      <div className="card p-5 mb-6">
        <div className="font-medium text-[color:var(--color-ink-900)]">Ringkasan Kepatuhan Dokumen</div>
        <div className="text-xs text-[color:var(--color-ink-500)] mb-4">
          Jumlah dokumen yang sudah kedaluwarsa dibanding yang akan berakhir dalam {THRESHOLD_DAYS} hari, per kategori
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={complianceData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-teal-100)" />
            <XAxis dataKey="name" tick={CHART_TICK} />
            <YAxis allowDecimals={false} tick={CHART_TICK} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="expired" name="Sudah Expired" fill="var(--color-red-500)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="upcoming" name={`Akan Berakhir (\u2264${THRESHOLD_DAYS}h)`} fill="var(--color-amber-500)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="font-medium text-[color:var(--color-ink-900)] mb-3">Pegawai per Unit</div>
          <ResponsiveContainer width="100%" height={Math.max(120, perUnit.slice(0, 6).length * 34)}>
            <BarChart data={perUnit.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={CHART_TICK} />
              <YAxis type="category" dataKey="name" width={90} tick={CHART_TICK} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" fill="var(--color-teal-700)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <div className="font-medium text-[color:var(--color-ink-900)] mb-3">Pegawai per Golongan</div>
          <ResponsiveContainer width="100%" height={Math.max(120, perGolongan.slice(0, 6).length * 34)}>
            <BarChart data={perGolongan.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={CHART_TICK} />
              <YAxis type="category" dataKey="name" width={90} tick={CHART_TICK} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" fill="var(--color-teal-700)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <div className="font-medium text-[color:var(--color-ink-900)] mb-3">Pegawai per Jabatan</div>
          <ResponsiveContainer width="100%" height={Math.max(120, perJabatan.slice(0, 6).length * 34)}>
            <BarChart data={perJabatan.slice(0, 6)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={CHART_TICK} />
              <YAxis type="category" dataKey="name" width={90} tick={CHART_TICK} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="value" fill="var(--color-teal-700)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ReminderList title="SIP akan berakhir" items={data.reminders.sip} threshold={THRESHOLD_DAYS} />
        <ReminderList title="SPK akan berakhir" items={data.reminders.spk} threshold={THRESHOLD_DAYS} />
        <ReminderList title="Kenaikan Gaji Berkala" items={data.reminders.kgb} threshold={THRESHOLD_DAYS} />
        <ReminderList title="Kenaikan Pangkat/Golongan" items={data.reminders.pangkat} threshold={THRESHOLD_DAYS} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-medium text-[color:var(--color-ink-900)] mb-3">
            Belum Memenuhi CPD 20 JP ({new Date().getFullYear()})
          </div>
          {data.belumCpd.length === 0 ? (
            <div className="text-sm text-[color:var(--color-ink-500)]">Semua pegawai telah memenuhi target.</div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {data.belumCpd.map((p) => (
                <li key={p.id}>
                  <Link to={`/pegawai/${p.id}`} className="text-sm text-[color:var(--color-teal-700)] hover:underline">
                    {p.nama}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <div className="font-medium text-[color:var(--color-ink-900)] mb-3">Dokumen Belum Lengkap</div>
          {data.dokumenBelumLengkap.length === 0 ? (
            <div className="text-sm text-[color:var(--color-ink-500)]">Semua pegawai sudah memiliki arsip dokumen.</div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {data.dokumenBelumLengkap.map((p) => (
                <li key={p.id}>
                  <Link to={`/pegawai/${p.id}`} className="text-sm text-[color:var(--color-teal-700)] hover:underline">
                    {p.nama}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}
