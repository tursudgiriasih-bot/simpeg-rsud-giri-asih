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

  const GROUP_FIELD = { unit: "Unit Kerja", jabatan: "Jabatan", golongan: "Golongan" };

  // Benar-benar mengelompokkan pegawai per Unit/Jabatan/Golongan (bukan cuma
  // mengurutkan daftar yang sama seperti sebelumnya) -- setiap kelompok diberi
  // baris judul "— <Nilai> (n pegawai) —" diikuti anggotanya, supaya isinya
  // benar-benar sesuai judul laporan, dan baris kosong ("Tidak diketahui")
  // dikumpulkan di kelompok tersendiri di bagian akhir.
  function buildGroupedRows(field) {
    const rows = buildRows();
    const groups = new Map();
    rows.forEach((r) => {
      const key = r[field] && String(r[field]).trim() ? r[field] : "Tidak diketahui";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    const groupNames = [...groups.keys()].sort((a, b) => {
      if (a === "Tidak diketahui") return 1;
      if (b === "Tidak diketahui") return -1;
      return a.localeCompare(b);
    });

    const result = [];
    const headerIndexes = new Set();
    groupNames.forEach((name) => {
      const members = groups.get(name);
      headerIndexes.add(result.length);
      result.push({
        Nama: `— ${name} (${members.length} pegawai) —`,
        NIP: "", Jabatan: "", "Unit Kerja": "", Pangkat: "", Golongan: "", "Status Pegawai": "",
        _isGroupHeader: true,
      });
      members.forEach((m) => result.push(m));
    });
    return { rows: result, headerIndexes };
  }

  function handleExportExcel(reportKey, label) {
    if (reportKey === "semua") {
      exportGenericExcel(buildRows(), label, `${reportKey}-pegawai.xlsx`);
      return;
    }
    const { rows } = buildGroupedRows(GROUP_FIELD[reportKey]);
    exportGenericExcel(
      rows.map(({ _isGroupHeader, ...r }) => r),
      label,
      `${reportKey}-pegawai.xlsx`
    );
  }

  function handleExportPdf(reportKey, label) {
    const toBody = (rows) => rows.map((r) => [r.Nama, r.NIP, r.Jabatan, r["Unit Kerja"], r.Pangkat, r.Golongan, r["Status Pegawai"]]);
    const head = ["Nama", "NIP", "Jabatan", "Unit Kerja", "Pangkat", "Golongan", "Status"];

    if (reportKey === "semua") {
      exportPdfTable({ title: label, head, body: toBody(buildRows()), filename: `${reportKey}-pegawai.pdf` });
      return;
    }
    const { rows, headerIndexes } = buildGroupedRows(GROUP_FIELD[reportKey]);
    exportPdfTable({
      title: label,
      head,
      body: toBody(rows),
      filename: `${reportKey}-pegawai.pdf`,
      groupHeaderIndexes: headerIndexes,
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
