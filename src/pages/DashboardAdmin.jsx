import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import ReminderList from "../components/ReminderList";
import DocStatusCard, { DocStatusModal } from "../components/DocStatusCard";
import PercentBarChart from "../components/PercentBarChart";
import PercentColumnChart from "../components/PercentColumnChart";
import DonutChart from "../components/DonutChart";
import { fetchDashboardData } from "../utils/queries";
import { seedDefaultSectionsIfEmpty } from "../utils/sectionCatalog";
import { tallyField } from "../utils/optionLists";

// Ambang "akan berakhir" dashboard -- disamakan semua kategori jadi 180 hari
// (lihat fetchDashboardData di utils/queries.js).
const THRESHOLD_DAYS = 180;

const AGE_BUCKETS = ["20-30", "31-40", "41-50", "51-60", "61-65"];

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

// Kartu grafik. `small` = judul kecil huruf kapital (baris kartu ringkasan atas).
function ChartCard({ title, subtitle, small = false, className = "", children }) {
  return (
    <div className={`card p-5 ${className}`}>
      {small ? (
        <div className="text-xs uppercase tracking-wide text-[color:var(--color-ink-500)] mb-2">{title}</div>
      ) : (
        <div className="font-medium text-[color:var(--color-ink-900)]">{title}</div>
      )}
      {subtitle && <div className="text-xs text-[color:var(--color-ink-500)]">{subtitle}</div>}
      <div className={small ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

const TOP_N = 8; // jumlah baris terbanyak yang ditampilkan di grafik unit/golongan/jabatan

export default function DashboardAdmin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // { doc: "sip" | "spk", kind: "hijau" | "kuning" | "merah" }

  useEffect(() => {
    seedDefaultSectionsIfEmpty();
    fetchDashboardData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const total = data ? data.pegawaiList.length : 0;
  const perUnit = useMemo(() => (data ? groupCount(data.pegawaiList, "unitKerja") : []), [data]);
  const perGolongan = useMemo(() => (data ? groupCount(data.pegawaiList, "golongan") : []), [data]);
  const perJabatan = useMemo(() => (data ? groupCount(data.pegawaiList, "jabatan") : []), [data]);
  const genderRows = useMemo(() => (data ? tallyGender(data.pegawaiList) : []), [data]);
  const statusRows = useMemo(() => (data ? tallyFixedOrder(data.pegawaiList, "statusPegawai", ["PNS", "PPPK", "BLUD"]) : []), [data]);
  const ageRows = useMemo(() => (data ? tallyAge(data.pegawaiList) : []), [data]);
  const profesiRows = useMemo(() => (data ? tallyField(data.pegawaiList, "profesi") : []), [data]);

  if (loading) {
    return (
      <Layout>
        <div className="text-sm text-[color:var(--color-ink-500)]">Memuat dashboard…</div>
      </Layout>
    );
  }

  const genderUnfilled = total - genderRows.reduce((sum, [, n]) => sum + n, 0);
  const chartHeight = (n) => Math.max(160, n * 34);

  return (
    <Layout>
      <div className="mb-5">
        <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Dashboard</h1>
        <p className="text-sm text-[color:var(--color-ink-500)] mt-1">Ringkasan data kepegawaian secara real time.</p>
      </div>

      {/* Ringkasan: diagram lingkaran dengan jumlah dan persentase */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(110px,0.4fr)_1fr_1fr_1.2fr] gap-4 mb-4">
        <StatCard label="Total Pegawai" value={total} />
        <ChartCard small title="Jenis Kelamin">
          <DonutChart rows={genderRows} />
          {genderUnfilled > 0 && (
            <div className="text-xs text-[color:var(--color-ink-500)] mt-3">
              Persentase dari {total - genderUnfilled} pegawai yang sudah mengisi · {genderUnfilled} belum mengisi
            </div>
          )}
        </ChartCard>
        <ChartCard small title="Status Kepegawaian">
          <DonutChart rows={statusRows} />
        </ChartCard>
        <ChartCard small title="Rentang Usia">
          <DonutChart rows={ageRows} />
        </ChartCard>
      </div>

      {/* Profesi (daftar dikelola Admin di menu Kelola Pilihan), lalu unit, golongan, jabatan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 min-[1700px]:grid-cols-5 gap-4 mb-6">
        <ChartCard
          title="Pegawai per Profesi"
          subtitle="Jumlah dan persentase dari total pegawai"
          className="lg:col-span-3 min-[1700px]:col-span-2"
        >
          <PercentColumnChart rows={profesiRows} total={total} height={300} />
        </ChartCard>
        <ChartCard title="Pegawai per Unit" subtitle={`${TOP_N} unit terbanyak`}>
          <PercentBarChart rows={perUnit.slice(0, TOP_N)} total={total} height={chartHeight(Math.min(perUnit.length, TOP_N))} yWidth={100} />
        </ChartCard>
        <ChartCard title="Pegawai per Golongan" subtitle={`${TOP_N} golongan terbanyak`}>
          <PercentBarChart rows={perGolongan.slice(0, TOP_N)} total={total} height={chartHeight(Math.min(perGolongan.length, TOP_N))} yWidth={90} />
        </ChartCard>
        <ChartCard title="Pegawai per Jabatan" subtitle={`${TOP_N} jabatan terbanyak`}>
          <PercentBarChart rows={perJabatan.slice(0, TOP_N)} total={total} height={chartHeight(Math.min(perJabatan.length, TOP_N))} yWidth={110} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <DocStatusCard
          title="Status SIP"
          status={data.status.sip}
          threshold={THRESHOLD_DAYS}
          onSelect={(kind) => setDetail({ doc: "sip", kind })}
        />
        <DocStatusCard
          title="Status SPK"
          status={data.status.spk}
          threshold={THRESHOLD_DAYS}
          onSelect={(kind) => setDetail({ doc: "spk", kind })}
        />
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

      <DocStatusModal
        docLabel={detail ? detail.doc.toUpperCase() : ""}
        kind={detail?.kind}
        items={detail ? data.status[detail.doc][detail.kind] : []}
        onClose={() => setDetail(null)}
      />
    </Layout>
  );
}
