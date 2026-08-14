import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { subscribeSections } from "../utils/sectionCatalog";
import { fetchSectionAcrossPegawai } from "../utils/queries";
import { daysUntil, formatDate } from "../utils/helpers";
import { exportGenericExcel } from "../utils/exportExcel";
import { exportPdfTable } from "../utils/exportPdf";
import { SYSTEM_REMINDER_FIELDS } from "../utils/reminderFields";

// 4 laporan kepatuhan dokumen yang benar-benar dipakai sehari-hari (menggantikan
// laporan "Data Seluruh Pegawai / per Unit / per Jabatan / per Golongan" yang lama --
// isinya dulu selalu sama karena cuma diurutkan ulang, bukan benar-benar berguna).
// Setiap laporan berisi SEMUA dokumen yang sudah lewat tenggat ATAUPUN akan segera
// berakhir, diurutkan dari yang paling mendesak, sinkron dengan angka di Dashboard.
const REPORTS = [
  { key: "sip", label: "SIP - Berakhir / Akan Berakhir" },
  { key: "spk", label: "SPK - Berakhir / Akan Berakhir" },
  { key: "kgb", label: "Kenaikan Gaji Berkala" },
  { key: "riwayatPangkat", label: "Kenaikan Pangkat / Golongan" },
];

export default function Laporan() {
  const [sections, setSections] = useState([]);
  const [dataBySection, setDataBySection] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeSections(setSections), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all(REPORTS.map((r) => fetchSectionAcrossPegawai(r.key))).then((results) => {
      if (cancelled) return;
      const map = {};
      REPORTS.forEach((r, i) => { map[r.key] = results[i]; });
      setDataBySection(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  function rowsFor(sectionKey) {
    const dateField = SYSTEM_REMINDER_FIELDS[sectionKey];
    const raw = dataBySection[sectionKey] || [];
    return raw
      .filter((r) => r[dateField])
      .map((r) => ({ ...r, _days: daysUntil(r[dateField]) }))
      .sort((a, b) => a._days - b._days);
  }

  function sectionOf(sectionKey) {
    return sections.find((s) => s.key === sectionKey);
  }

  function extraColsFor(sectionKey) {
    const dateField = SYSTEM_REMINDER_FIELDS[sectionKey];
    return (sectionOf(sectionKey)?.columns || []).filter((c) => c !== dateField);
  }

  function labelFor(sectionKey, fieldName) {
    return sectionOf(sectionKey)?.fields?.find((f) => f.name === fieldName)?.label || fieldName;
  }

  // Kolom bertipe "date" WAJIB lewat formatDate() -- nilainya objek Firestore
  // Timestamp, bukan teks. Menampilkannya mentah bikin React crash (halaman putih).
  function displayValue(sectionKey, row, fieldName) {
    const def = sectionOf(sectionKey)?.fields?.find((f) => f.name === fieldName);
    if (def?.type === "date") return formatDate(row[fieldName]);
    const v = row[fieldName];
    return v === null || v === undefined || v === "" ? "-" : String(v);
  }

  function statusLabel(days) {
    if (days === null) return "-";
    if (days < 0) return `Lewat ${Math.abs(days)} hari`;
    if (days === 0) return "Jatuh tempo hari ini";
    return `${days} hari lagi`;
  }

  function handleExportExcel(reportKey, label) {
    const rows = rowsFor(reportKey);
    const dateField = SYSTEM_REMINDER_FIELDS[reportKey];
    const extraCols = extraColsFor(reportKey);
    const excelRows = rows.map((r) => {
      const row = { Nama: r.pegawai?.nama, NIP: r.pegawai?.nip, "Unit Kerja": r.pegawai?.unitKerja };
      extraCols.forEach((c) => (row[labelFor(reportKey, c)] = displayValue(reportKey, r, c)));
      row["Jatuh Tempo"] = formatDate(r[dateField]);
      row["Status"] = statusLabel(r._days);
      return row;
    });
    exportGenericExcel(excelRows, label, `${reportKey}-laporan.xlsx`);
  }

  function handleExportPdf(reportKey, label) {
    const rows = rowsFor(reportKey);
    const dateField = SYSTEM_REMINDER_FIELDS[reportKey];
    const extraCols = extraColsFor(reportKey);
    const head = ["Nama", "NIP", "Unit Kerja", ...extraCols.map((c) => labelFor(reportKey, c)), "Jatuh Tempo", "Status"];
    const body = rows.map((r) => [
      r.pegawai?.nama, r.pegawai?.nip, r.pegawai?.unitKerja,
      ...extraCols.map((c) => displayValue(reportKey, r, c)),
      formatDate(r[dateField]),
      statusLabel(r._days),
    ]);
    exportPdfTable({ title: label, head, body, filename: `${reportKey}-laporan.pdf` });
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Laporan</h1>
        <p className="text-sm text-[color:var(--color-ink-500)] mt-1">
          Cetak dan ekspor daftar dokumen yang sudah berakhir atau akan segera berakhir, dalam format PDF atau Excel.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-[color:var(--color-ink-500)]">Memuat data…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map((r) => {
            const rows = rowsFor(r.key);
            const expiredCount = rows.filter((x) => x._days < 0).length;
            return (
              <div key={r.key} className="card p-5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-[color:var(--color-ink-900)]">{r.label}</div>
                  <div className="text-xs text-[color:var(--color-ink-500)] mt-0.5">
                    {rows.length} dokumen
                    {expiredCount > 0 && (
                      <span className="text-[color:var(--color-red-700)]"> · {expiredCount} sudah lewat</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportPdf(r.key, r.label)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[color:var(--color-teal-700)] text-[color:var(--color-teal-700)] hover:bg-[color:var(--color-teal-100)]"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleExportExcel(r.key, r.label)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)]"
                  >
                    Excel
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-[color:var(--color-ink-500)] mt-6">
        Untuk filter lebih rinci (tahun tertentu, rentang hari kustom, atau cari nama/NIP tertentu), buka menu{" "}
        <Link to="/masa-berlaku" className="text-[color:var(--color-teal-700)] hover:underline font-medium">
          Cek Masa Berlaku
        </Link>.
      </p>
    </Layout>
  );
}
