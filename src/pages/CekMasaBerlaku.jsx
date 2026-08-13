import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { subscribeSections } from "../utils/sectionCatalog";
import { fetchSectionAcrossPegawai } from "../utils/queries";
import { daysUntil, urgencyStatus, URGENCY_COLORS, formatDate } from "../utils/helpers";
import { exportGenericExcel } from "../utils/exportExcel";
import { exportPdfTable } from "../utils/exportPdf";

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 7 }, (_, i) => currentYear - 1 + i);

export default function CekMasaBerlaku() {
  const [sections, setSections] = useState([]);
  const [sectionKey, setSectionKey] = useState("");
  const [dateField, setDateField] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("hari"); // hari | tahun | lewat | semua
  const [hariThreshold, setHariThreshold] = useState(90);
  const [tahun, setTahun] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => subscribeSections(setSections), []);

  const sectionsWithDate = useMemo(
    () => sections.filter((s) => (s.fields || []).some((f) => f.type === "date")),
    [sections]
  );

  useEffect(() => {
    if (!sectionKey && sectionsWithDate.length > 0) setSectionKey(sectionsWithDate[0].key);
  }, [sectionsWithDate, sectionKey]);

  const activeSection = sections.find((s) => s.key === sectionKey);
  const dateFields = useMemo(() => (activeSection?.fields || []).filter((f) => f.type === "date"), [activeSection]);

  useEffect(() => {
    // Pilih otomatis kolom tanggal yang dipakai sistem pengingat (reminderThreshold),
    // sama seperti logika di Dashboard -- BUKAN kolom tanggal pertama yang ada.
    // Contoh: bagian KGB punya "TMT" (tanggal mulai, sudah lewat) dan
    // "Tanggal Berakhir" (dipakai pengingat) -- yang benar dipilih adalah
    // "Tanggal Berakhir", supaya hasilnya sinkron dengan angka di Dashboard.
    if (dateFields.length === 0) return;
    const preferred = dateFields.find((f) => f.reminderThreshold) || dateFields[0];
    setDateField(preferred.name);
  }, [dateFields]);

  useEffect(() => {
    if (!sectionKey) return;
    setLoading(true);
    fetchSectionAcrossPegawai(sectionKey).then((r) => {
      setRows(r);
      setLoading(false);
    });
  }, [sectionKey]);

  const activeDateFieldDef = dateFields.find((f) => f.name === dateField);
  const threshold = activeDateFieldDef?.reminderThreshold || 90;

  const filtered = useMemo(() => {
    if (!dateField) return [];
    let list = rows
      .filter((r) => r[dateField])
      .map((r) => ({ ...r, _days: daysUntil(r[dateField]) }));

    if (mode === "hari") {
      list = list.filter((r) => r._days !== null && r._days <= Number(hariThreshold) && r._days >= 0);
    } else if (mode === "tahun") {
      list = list.filter((r) => {
        const v = r[dateField];
        const d = v?.toDate ? v.toDate() : new Date(v);
        return !isNaN(d) && d.getFullYear() === Number(tahun);
      });
    } else if (mode === "lewat") {
      list = list.filter((r) => r._days !== null && r._days < 0);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => [r.pegawai?.nama, r.pegawai?.nip].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
    }

    list.sort((a, b) => (sortDir === "asc" ? a._days - b._days : b._days - a._days));
    return list;
  }, [rows, dateField, mode, hariThreshold, tahun, search, sortDir]);

  function labelFor(name) {
    return activeSection?.fields?.find((f) => f.name === name)?.label || name;
  }

  // Kolom ringkas tambahan (selain nama/NIP/tanggal) diambil dari kolom yang sudah
  // dikonfigurasi Admin untuk bagian ini, supaya relevan untuk bagian apa pun.
  const extraCols = (activeSection?.columns || []).filter((c) => c !== dateField).slice(0, 2);

  function handleExportExcel() {
    const data = filtered.map((r) => {
      const row = { Nama: r.pegawai?.nama, NIP: r.pegawai?.nip, Unit: r.pegawai?.unitKerja };
      extraCols.forEach((c) => (row[labelFor(c)] = r[c]));
      row[labelFor(dateField)] = formatDate(r[dateField]);
      row["Sisa Hari"] = r._days;
      return row;
    });
    exportGenericExcel(data, activeSection?.label || "Data", `${sectionKey}-masa-berlaku.xlsx`);
  }

  function handleExportPdf() {
    exportPdfTable({
      title: `${activeSection?.label || ""} — Masa Berlaku`,
      head: ["Nama", "NIP", "Unit", ...extraCols.map(labelFor), labelFor(dateField), "Sisa Hari"],
      body: filtered.map((r) => [
        r.pegawai?.nama, r.pegawai?.nip, r.pegawai?.unitKerja,
        ...extraCols.map((c) => r[c] ?? "-"),
        formatDate(r[dateField]),
        r._days,
      ]),
      filename: `${sectionKey}-masa-berlaku.pdf`,
    });
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Cek Masa Berlaku Dokumen</h1>
        <p className="text-sm text-[color:var(--color-ink-500)] mt-1">
          Filter dan urutkan dokumen pegawai berdasarkan tanggal — per tahun, per rentang hari, atau yang sudah kedaluwarsa.
        </p>
      </div>

      <div className="card p-5 mb-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Bagian</label>
            <select
              value={sectionKey}
              onChange={(e) => setSectionKey(e.target.value)}
              className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
            >
              {sectionsWithDate.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
          {dateFields.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Field Tanggal</label>
              <select
                value={dateField}
                onChange={(e) => setDateField(e.target.value)}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
              >
                {dateFields.map((f) => (
                  <option key={f.name} value={f.name}>{f.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "hari", label: "Akan berakhir dalam" },
              { key: "tahun", label: "Tahun tertentu" },
              { key: "lewat", label: "Sudah kedaluwarsa" },
              { key: "semua", label: "Semua data" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`px-3 py-1.5 text-xs rounded-full border ${
                  mode === m.key
                    ? "bg-[color:var(--color-teal-700)] text-white border-[color:var(--color-teal-700)]"
                    : "border-[color:var(--color-teal-100)] text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-paper)]"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === "hari" && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={hariThreshold}
                onChange={(e) => setHariThreshold(e.target.value)}
                className="w-20 border border-[color:var(--color-teal-100)] rounded-lg px-2.5 py-1.5 text-sm"
              />
              <span className="text-xs text-[color:var(--color-ink-500)]">hari ke depan</span>
            </div>
          )}
          {mode === "tahun" && (
            <select
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="border border-[color:var(--color-teal-100)] rounded-lg px-2.5 py-1.5 text-sm"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          <div className="ml-auto flex items-center gap-2">
            <input
              type="text"
              placeholder="Cari nama/NIP dalam hasil…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-[color:var(--color-teal-100)] rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
            />
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="px-3 py-1.5 text-xs rounded-lg border border-[color:var(--color-teal-100)] text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-paper)]"
              title="Urutkan"
            >
              {sortDir === "asc" ? "Terdekat dulu ↑" : "Terjauh dulu ↓"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-[color:var(--color-ink-500)]">{filtered.length} hasil</div>
        <div className="flex gap-2">
          <button onClick={handleExportPdf} className="px-3 py-1.5 text-xs rounded-lg border border-[color:var(--color-teal-700)] text-[color:var(--color-teal-700)] hover:bg-[color:var(--color-teal-100)]">
            PDF
          </button>
          <button onClick={handleExportExcel} className="px-3 py-1.5 text-xs rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)]">
            Excel
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-[color:var(--color-ink-500)]">Memuat…</div>
        ) : filtered.length === 0 ? (
          <div className="p-5 text-sm text-[color:var(--color-ink-500)]">Tidak ada data yang cocok dengan filter ini.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[color:var(--color-teal-100)]/50 text-left text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">
                <th className="px-4 py-3 font-medium">Pegawai</th>
                {extraCols.map((c) => (
                  <th key={c} className="px-4 py-3 font-medium">{labelFor(c)}</th>
                ))}
                <th className="px-4 py-3 font-medium">{labelFor(dateField)}</th>
                <th className="px-4 py-3 font-medium">Sisa</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const status = urgencyStatus(r._days, threshold);
                const colors = URGENCY_COLORS[status];
                return (
                  <tr key={r.pegawaiId + r.id} className="border-t border-[color:var(--color-teal-100)]">
                    <td className="px-4 py-3">
                      <Link to={`/pegawai/${r.pegawaiId}`} className="font-medium text-[color:var(--color-teal-700)] hover:underline">
                        {r.pegawai?.nama}
                      </Link>
                      <div className="text-xs text-[color:var(--color-ink-500)] font-mono-data">{r.pegawai?.nip}</div>
                    </td>
                    {extraCols.map((c) => (
                      <td key={c} className="px-4 py-3 text-[color:var(--color-ink-700)]">{r[c] ?? "-"}</td>
                    ))}
                    <td className="px-4 py-3 text-[color:var(--color-ink-700)]">{formatDate(r[dateField])}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-mono-data ${colors.badge}`}>
                        {r._days < 0 ? `Lewat ${Math.abs(r._days)}h` : `${r._days} hari`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
