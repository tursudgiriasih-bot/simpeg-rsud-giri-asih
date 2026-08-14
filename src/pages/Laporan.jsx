import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { subscribeSections } from "../utils/sectionCatalog";
import { fetchSectionAcrossPegawai } from "../utils/queries";
import { daysUntil, formatDate } from "../utils/helpers";
import { exportGenericExcel } from "../utils/exportExcel";
import { exportPdfTable } from "../utils/exportPdf";
import { SYSTEM_REMINDER_FIELDS } from "../utils/reminderFields";

// Ambang "akan berakhir" untuk halaman Laporan. Sengaja dipisah dari ambang
// alert Dashboard (90 hari untuk SIP/SPK/KGB) karena laporan cetak butuh
// jendela waktu yang lebih longgar supaya TU Kepegawaian bisa mengurus
// perpanjangan jauh-jauh hari -- sesuai permintaan: "sebelum 180 hari".
const THRESHOLD_DAYS = 180;

const REPORT_SECTIONS = [
  { sectionKey: "sip", title: "SIP" },
  { sectionKey: "spk", title: "SPK" },
  { sectionKey: "kgb", title: "Kenaikan Gaji Berkala" },
  { sectionKey: "riwayatPangkat", title: "Kenaikan Pangkat / Golongan" },
];

// Tiap bagian dipecah jadi 2 laporan terpisah -- "Sudah Kedaluwarsa" dan
// "Akan Berakhir" -- bukan digabung jadi satu seperti sebelumnya, supaya
// TU Kepegawaian bisa mencetak/mengirim daftar yang benar-benar berbeda
// urgensinya secara terpisah.
const REPORTS = REPORT_SECTIONS.flatMap(({ sectionKey, title }) => [
  {
    key: `${sectionKey}-expired`,
    sectionKey,
    label: `${title} — Sudah Kedaluwarsa`,
    matches: (days) => days < 0,
  },
  {
    key: `${sectionKey}-upcoming`,
    sectionKey,
    label: `${title} — Akan Berakhir (\u2264${THRESHOLD_DAYS} hari)`,
    matches: (days) => days >= 0 && days <= THRESHOLD_DAYS,
  },
]);

export default function Laporan() {
  const [sections, setSections] = useState([]);
  const [dataBySection, setDataBySection] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeSections(setSections), []);

  useEffect(() => {
    let cancelled = false;
    const sectionKeys = [...new Set(REPORT_SECTIONS.map((s) => s.sectionKey))];
    Promise.all(sectionKeys.map((k) => fetchSectionAcrossPegawai(k))).then((results) => {
      if (cancelled) return;
      const map = {};
      sectionKeys.forEach((k, i) => { map[k] = results[i]; });
      setDataBySection(map);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  function rowsForReport(report) {
    const dateField = SYSTEM_REMINDER_FIELDS[report.sectionKey];
    const raw = dataBySection[report.sectionKey] || [];
    return raw
      .filter((r) => r[dateField])
      .map((r) => ({ ...r, _days: daysUntil(r[dateField]) }))
      .filter((r) => report.matches(r._days))
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

  function handleExportExcel(report) {
    const rows = rowsForReport(report);
    const dateField = SYSTEM_REMINDER_FIELDS[report.sectionKey];
    const extraCols = extraColsFor(report.sectionKey);
    const excelRows = rows.map((r) => {
      const row = { Nama: r.pegawai?.nama, NIP: r.pegawai?.nip, "Unit Kerja": r.pegawai?.unitKerja };
      extraCols.forEach((c) => (row[labelFor(report.sectionKey, c)] = displayValue(report.sectionKey, r, c)));
      row["Jatuh Tempo"] = formatDate(r[dateField]);
      row["Status"] = statusLabel(r._days);
      return row;
    });
    exportGenericExcel(excelRows, report.label, `${report.key}-laporan.xlsx`);
  }

  function handleExportPdf(report) {
    const rows = rowsForReport(report);
    const dateField = SYSTEM_REMINDER_FIELDS[report.sectionKey];
    const extraCols = extraColsFor(report.sectionKey);
    const head = ["Nama", "NIP", "Unit Kerja", ...extraCols.map((c) => labelFor(report.sectionKey, c)), "Jatuh Tempo", "Status"];
    const body = rows.map((r) => [
      r.pegawai?.nama, r.pegawai?.nip, r.pegawai?.unitKerja,
      ...extraCols.map((c) => displayValue(report.sectionKey, r, c)),
      formatDate(r[dateField]),
      statusLabel(r._days),
    ]);
    exportPdfTable({ title: report.label, head, body, filename: `${report.key}-laporan.pdf` });
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Laporan</h1>
        <p className="text-sm text-[color:var(--color-ink-500)] mt-1">
          Cetak dan ekspor daftar dokumen yang sudah kedaluwarsa atau akan berakhir dalam {THRESHOLD_DAYS} hari, dalam format PDF atau Excel.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-[color:var(--color-ink-500)]">Memuat data…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPORTS.map((r) => {
            const rows = rowsForReport(r);
            const isExpiredReport = r.key.endsWith("-expired");
            return (
              <div key={r.key} className="card p-5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-[color:var(--color-ink-900)]">{r.label}</div>
                  <div className={`text-xs mt-0.5 ${isExpiredReport && rows.length > 0 ? "text-[color:var(--color-red-700)]" : "text-[color:var(--color-ink-500)]"}`}>
                    {rows.length} dokumen
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExportPdf(r)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[color:var(--color-teal-700)] text-[color:var(--color-teal-700)] hover:bg-[color:var(--color-teal-100)]"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleExportExcel(r)}
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
