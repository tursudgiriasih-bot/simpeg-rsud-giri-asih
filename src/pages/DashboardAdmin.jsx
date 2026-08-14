import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import ReminderList from "../components/ReminderList";
import { fetchDashboardData } from "../utils/queries";
import { seedDefaultSectionsIfEmpty } from "../utils/sectionCatalog";

// Ambang "akan berakhir" dashboard -- dulu SIP/SPK/KGB terpisah di 90 hari,
// sekarang disamakan semua jadi 180 hari (lihat fetchDashboardData di utils/queries.js).
const THRESHOLD_DAYS = 180;

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

// Memecah satu daftar reminder jadi jumlah "sudah expired" (_days < 0) dan
// "akan berakhir" (_days >= 0, masih dalam ambang) -- inilah yang ditampilkan
// terpisah sesuai permintaan, bukan cuma satu angka gabungan seperti sebelumnya.
function splitStatus(list) {
  return {
    expired: list.filter((x) => x._days < 0).length,
    upcoming: list.filter((x) => x._days >= 0).length,
  };
}

const CHART_TICK = { fontSize: 12, fill: "var(--color-ink-500)" };

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

  const complianceData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "SIP", ...splitStatus(data.reminders.sip) },
      { name: "SPK", ...splitStatus(data.reminders.spk) },
      { name: "KGB", ...splitStatus(data.reminders.kgb) },
      { name: "Kenaikan Pangkat", ...splitStatus(data.reminders.pangkat) },
    ];
  }, [data]);

  const totalExpired = useMemo(
    () => (data ? complianceData.reduce((sum, c) => sum + c.expired, 0) : 0),
    [data, complianceData]
  );
  const totalUpcoming = useMemo(
    () => (data ? complianceData.reduce((sum, c) => sum + c.upcoming, 0) : 0),
    [data, complianceData]
  );

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Pegawai" value={data.pegawaiList.length} />
        <StatCard label={`Akan Berakhir \u2264 ${THRESHOLD_DAYS} Hari`} value={totalUpcoming} />
        <StatCard label="Sudah Expired" value={totalExpired} />
        <StatCard label="Dokumen Belum Lengkap" value={data.dokumenBelumLengkap.length} />
      </div>

      {/* Grafik ringkasan kepatuhan dokumen -- inti dari permintaan: jumlah per
          kategori (SIP/SPK/KGB/Kenaikan Pangkat), dipisah expired vs akan berakhir */}
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
