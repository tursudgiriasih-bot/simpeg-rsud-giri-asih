import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import ReminderList from "../components/ReminderList";
import { fetchDashboardData } from "../utils/queries";
import { seedDefaultSectionsIfEmpty } from "../utils/sectionCatalog";
import { Link } from "react-router-dom";

function groupCount(list, key) {
  const map = {};
  list.forEach((p) => {
    const k = p[key] || "Tidak diketahui";
    map[k] = (map[k] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
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
        <StatCard label="SIP/SPK/KGB ≤ 90 hari" value={data.reminders90.sip.length + data.reminders90.spk.length + data.reminders90.kgb.length} />
        <StatCard label="Kenaikan Pangkat ≤ 180 hari" value={data.reminders180.pangkat.length} />
        <StatCard label="Dokumen Belum Lengkap" value={data.dokumenBelumLengkap.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="font-medium text-[color:var(--color-ink-900)] mb-3">Pegawai per Unit</div>
          <ul className="space-y-2">
            {perUnit.slice(0, 6).map(([k, v]) => (
              <li key={k} className="flex justify-between text-sm">
                <span className="text-[color:var(--color-ink-700)]">{k}</span>
                <span className="font-mono-data text-[color:var(--color-ink-900)]">{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <div className="font-medium text-[color:var(--color-ink-900)] mb-3">Pegawai per Golongan</div>
          <ul className="space-y-2">
            {perGolongan.slice(0, 6).map(([k, v]) => (
              <li key={k} className="flex justify-between text-sm">
                <span className="text-[color:var(--color-ink-700)]">{k}</span>
                <span className="font-mono-data text-[color:var(--color-ink-900)]">{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <div className="font-medium text-[color:var(--color-ink-900)] mb-3">Pegawai per Jabatan</div>
          <ul className="space-y-2">
            {perJabatan.slice(0, 6).map(([k, v]) => (
              <li key={k} className="flex justify-between text-sm">
                <span className="text-[color:var(--color-ink-700)]">{k}</span>
                <span className="font-mono-data text-[color:var(--color-ink-900)]">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ReminderList title="SIP akan berakhir" items={data.reminders90.sip} threshold={90} />
        <ReminderList title="SPK akan berakhir" items={data.reminders90.spk} threshold={90} />
        <ReminderList title="Kenaikan Gaji Berkala" items={data.reminders90.kgb} threshold={90} />
        <ReminderList title="Kenaikan Pangkat/Golongan" items={data.reminders180.pangkat} threshold={180} />
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
