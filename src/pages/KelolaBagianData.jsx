import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { subscribeSections, seedDefaultSectionsIfEmpty, saveSection, deleteSection, SYSTEM_KEYS } from "../utils/sectionCatalog";
import { toSlugKey } from "../utils/helpers";

const FIELD_TYPES = [
  { value: "text", label: "Teks Singkat" },
  { value: "textarea", label: "Teks Panjang" },
  { value: "date", label: "Tanggal" },
  { value: "number", label: "Angka" },
  { value: "select", label: "Pilihan (Dropdown)" },
  { value: "file", label: "Berkas (PDF/Gambar)" },
];

function emptyField() {
  return { label: "", type: "text", optionsText: "", reminder: false, reminderThreshold: 90 };
}

export default function KelolaBagianData() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState(null); // null = bagian baru
  const [label, setLabel] = useState("");
  const [allowPegawaiAdd, setAllowPegawaiAdd] = useState(false);
  const [fields, setFields] = useState([emptyField()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    seedDefaultSectionsIfEmpty();
    const unsub = subscribeSections((list) => {
      setSections(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  function openCreate() {
    setEditingKey(null);
    setLabel("");
    setAllowPegawaiAdd(false);
    setFields([emptyField()]);
    setError("");
    setModalOpen(true);
  }

  function openEdit(section) {
    setEditingKey(section.key);
    setLabel(section.label);
    setAllowPegawaiAdd(!!section.allowPegawaiAdd);
    setFields(
      (section.fields || []).map((f) => ({
        label: f.label,
        type: f.type,
        optionsText: (f.options || []).join(", "),
        reminder: !!f.reminderThreshold,
        reminderThreshold: f.reminderThreshold || 90,
        _originalName: f.name,
      }))
    );
    setError("");
    setModalOpen(true);
  }

  function updateField(i, patch) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function addFieldRow() {
    setFields((prev) => [...prev, emptyField()]);
  }

  function removeFieldRow(i) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    if (!label.trim()) {
      setError("Nama bagian wajib diisi.");
      return;
    }
    const validFields = fields.filter((f) => f.label.trim());
    if (validFields.length === 0) {
      setError("Tambahkan minimal satu field.");
      return;
    }

    setSaving(true);
    try {
      const existingNames = [];
      const builtFields = validFields.map((f) => {
        const name = f._originalName || toSlugKey(f.label, existingNames);
        existingNames.push(name);
        const field = { name, label: f.label.trim(), type: f.type };
        if (f.type === "select") {
          field.options = f.optionsText.split(",").map((s) => s.trim()).filter(Boolean);
        }
        if (f.type === "date" && f.reminder) {
          field.reminderThreshold = Number(f.reminderThreshold) || 90;
        }
        return field;
      });

      const nonFileCols = builtFields.filter((f) => f.type !== "file" && f.type !== "textarea").map((f) => f.name);
      const columns = (nonFileCols.length > 0 ? nonFileCols : builtFields.map((f) => f.name)).slice(0, 4);

      const key = editingKey || toSlugKey(label, sections.map((s) => s.key));
      const order = editingKey
        ? sections.find((s) => s.key === editingKey)?.order ?? sections.length
        : sections.length;

      await saveSection(key, {
        label: label.trim(),
        fields: builtFields,
        columns,
        allowPegawaiAdd,
        system: editingKey ? SYSTEM_KEYS.includes(editingKey) : false,
        order,
      });
      setModalOpen(false);
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(section) {
    if (section.system) return;
    if (!confirm(`Hapus bagian "${section.label}"? Seluruh data yang sudah diisi pegawai di bagian ini pada SEMUA pegawai akan tetap ada di database tapi tidak lagi terlihat di aplikasi. Lanjutkan?`)) return;
    await deleteSection(section.key);
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Kelola Bagian Data</h1>
          <p className="text-sm text-[color:var(--color-ink-500)] mt-1">
            Atur bagian & field apa saja yang muncul di profil setiap pegawai, dan siapa yang boleh mengisinya.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)]"
        >
          + Tambah Bagian Data
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-[color:var(--color-ink-500)]">Memuat…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((s) => (
            <div key={s.key} className="card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium text-[color:var(--color-ink-900)] flex items-center gap-2">
                    {s.label}
                    {s.system && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[color:var(--color-teal-100)] text-[color:var(--color-teal-700)] font-semibold">
                        BAWAAN SISTEM
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[color:var(--color-ink-500)] mt-0.5">{(s.fields || []).length} field</div>
                </div>
              </div>
              <div className="text-xs text-[color:var(--color-ink-500)] mb-3">
                {(s.fields || []).map((f) => f.label).join(" · ")}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2.5 py-1 rounded-full ${s.allowPegawaiAdd ? "bg-[color:var(--color-green-100)] text-[color:var(--color-green-700)]" : "bg-gray-100 text-gray-600"}`}>
                  {s.allowPegawaiAdd ? "Pegawai boleh isi sendiri" : "Hanya Admin yang mengisi"}
                </span>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(s)} className="text-xs text-[color:var(--color-teal-700)] hover:underline font-medium">
                    Edit
                  </button>
                  {!s.system && (
                    <button onClick={() => handleDelete(s)} className="text-xs text-[color:var(--color-red-500)] hover:underline font-medium">
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingKey ? `Edit Bagian: ${label}` : "Tambah Bagian Data Baru"} wide>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Nama Bagian</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="mis. Sertifikasi Kompetensi"
              className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[color:var(--color-ink-700)]">
            <input type="checkbox" checked={allowPegawaiAdd} onChange={(e) => setAllowPegawaiAdd(e.target.checked)} className="w-4 h-4" />
            Izinkan pegawai menambahkan data sendiri di bagian ini (bukan hanya Admin)
          </label>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)]">Field yang perlu diisi</label>
              <button type="button" onClick={addFieldRow} className="text-xs text-[color:var(--color-teal-700)] hover:underline font-medium">
                + Tambah Field
              </button>
            </div>
            <div className="space-y-3">
              {fields.map((f, i) => (
                <div key={i} className="border border-[color:var(--color-teal-100)] rounded-lg p-3">
                  <div className="grid grid-cols-12 gap-2 items-start">
                    <input
                      className="col-span-6 border border-[color:var(--color-teal-100)] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
                      placeholder="Nama field, mis. Nomor Sertifikat"
                      value={f.label}
                      onChange={(e) => updateField(i, { label: e.target.value })}
                    />
                    <select
                      className="col-span-4 border border-[color:var(--color-teal-100)] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
                      value={f.type}
                      onChange={(e) => updateField(i, { type: e.target.value })}
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeFieldRow(i)}
                      className="col-span-2 text-xs text-[color:var(--color-red-500)] hover:underline"
                    >
                      Hapus
                    </button>
                  </div>

                  {f.type === "select" && (
                    <input
                      className="mt-2 w-full border border-[color:var(--color-teal-100)] rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
                      placeholder="Pilihan dipisah koma, mis. Baik, Cukup, Kurang"
                      value={f.optionsText}
                      onChange={(e) => updateField(i, { optionsText: e.target.value })}
                    />
                  )}

                  {f.type === "date" && (
                    <label className="mt-2 flex items-center gap-2 text-xs text-[color:var(--color-ink-700)]">
                      <input
                        type="checkbox"
                        checked={f.reminder}
                        onChange={(e) => updateField(i, { reminder: e.target.checked })}
                        className="w-3.5 h-3.5"
                      />
                      Jadikan pengingat dashboard, tenggat
                      <select
                        disabled={!f.reminder}
                        value={f.reminderThreshold}
                        onChange={(e) => updateField(i, { reminderThreshold: e.target.value })}
                        className="border border-[color:var(--color-teal-100)] rounded px-1.5 py-0.5 text-xs disabled:opacity-40"
                      >
                        <option value={90}>90 hari</option>
                        <option value={180}>180 hari</option>
                      </select>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-[color:var(--color-red-500)]">{error}</div>}

          <div className="flex justify-end gap-2 pt-2 border-t border-[color:var(--color-teal-100)]">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-[color:var(--color-teal-100)] text-[color:var(--color-ink-700)]">
              Batal
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)] disabled:opacity-50">
              {saving ? "Menyimpan…" : "Simpan Bagian"}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
