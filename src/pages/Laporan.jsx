import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { fetchAllPegawai } from "../utils/queries";
import { exportGenericExcel } from "../utils/exportExcel";
import { exportPdfTable } from "../utils/exportPdf";

const REPORTS = [
  { key: "semua", label: "Data Seluruh Pegawai" },
  { key: "unit", label: "Pegawai per Unit" },
  { key: "jabatan", label: "Pegawai per Jabatan" },
  { key: "golongan", label: "Pegawai per Golongan" },
];

export default function Laporan() {
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllPegawai().then((l) => {
      setPegawaiList(l);
      setLoading(false);
    });
  }, []);

  function buildRows() {
    return pegawaiList.map((p) => ({
      Nama: p.nama,
      NIP: p.nip,
      Jabatan: p.jabatan,
      "Unit Kerja": p.unitKerja,
      Pangkat: p.pangkat,
      Golongan: p.golongan,
      "Status Pegawai": p.statusPegawai,
    }));
  }

  function handleExportExcel(reportKey, label) {
    let rows = buildRows();
    if (reportKey !== "semua") {
      // untuk laporan berkelompok, tetap ekspor daftar lengkap terurut berdasarkan grup
      const field = reportKey === "unit" ? "Unit Kerja" : reportKey === "jabatan" ? "Jabatan" : "Golongan";
      rows = [...rows].sort((a, b) => (a[field] || "").localeCompare(b[field] || ""));
    }
    exportGenericExcel(rows, label, `${reportKey}-pegawai.xlsx`);
  }

  function handleExportPdf(reportKey, label) {
    let rows = buildRows();
    if (reportKey !== "semua") {
      const field = reportKey === "unit" ? "Unit Kerja" : reportKey === "jabatan" ? "Jabatan" : "Golongan";
      rows = [...rows].sort((a, b) => (a[field] || "").localeCompare(b[field] || ""));
    }
    exportPdfTable({
      title: label,
      head: ["Nama", "NIP", "Jabatan", "Unit Kerja", "Pangkat", "Golongan", "Status"],
      body: rows.map((r) => [r.Nama, r.NIP, r.Jabatan, r["Unit Kerja"], r.Pangkat, r.Golongan, r["Status Pegawai"]]),
      filename: `${reportKey}-pegawai.pdf`,
    });
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Laporan</h1>
        <p className="text-sm text-[color:var(--color-ink-500)] mt-1">Cetak dan ekspor data kepegawaian dalam format PDF atau Excel.</p>
      </div>

      {loading ? (
        <div className="text-sm text-[color:var(--color-ink-500)]">Memuat data…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map((r) => (
            <div key={r.key} className="card p-5 flex items-center justify-between">
              <div>
                <div className="font-medium text-[color:var(--color-ink-900)]">{r.label}</div>
                <div className="text-xs text-[color:var(--color-ink-500)] mt-0.5">{pegawaiList.length} baris data</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleExportPdf(r.key, r.label)} className="px-3 py-1.5 text-xs rounded-lg border border-[color:var(--color-teal-700)] text-[color:var(--color-teal-700)] hover:bg-[color:var(--color-teal-100)]">
                  PDF
                </button>
                <button onClick={() => handleExportExcel(r.key, r.label)} className="px-3 py-1.5 text-xs rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)]">
                  Excel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[color:var(--color-ink-500)] mt-6">
        Untuk laporan Daftar SIP, SPK, KGB, Kenaikan Pangkat, dan bagian lain yang bisa
        difilter per tahun atau rentang hari (bukan cuma daftar seluruh pegawai), buka menu{" "}
        <Link to="/masa-berlaku" className="text-[color:var(--color-teal-700)] hover:underline font-medium">
          Cek Masa Berlaku
        </Link>.
      </p>
    </Layout>
  );
}
