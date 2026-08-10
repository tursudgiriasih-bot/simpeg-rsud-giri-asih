import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { uploadToCloudinary } from "../utils/cloudinary";
import Modal from "./Modal";
import { formatDate, toDateInputValue, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, formatFileSize } from "../utils/helpers";

export default function SectionRecords({ pegawaiId, config, canEdit }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);

  const colRef = collection(db, "pegawai", pegawaiId, config.collection);

  useEffect(() => {
    setLoading(true);
    const q = query(colRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => {
        // Ditolak Security Rules (mis. bagian ini bukan bagian yang boleh dilihat/ditulis pegawai).
        setRecords([]);
        setLoading(false);
      }
    );
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pegawaiId, config.collection]);

  function openAdd() {
    const empty = {};
    config.fields.forEach((f) => (empty[f.name] = ""));
    setForm(empty);
    setEditing(null);
    setFile(null);
    setFileError("");
    setModalOpen(true);
  }

  function openEdit(record) {
    const values = {};
    config.fields.forEach((f) => {
      values[f.name] = f.type === "date" ? toDateInputValue(record[f.name]) : record[f.name] ?? "";
    });
    setForm(values);
    setEditing(record);
    setFile(null);
    setFileError("");
    setModalOpen(true);
  }

  function handleFileSelect(selected) {
    if (!selected) {
      setFile(null);
      setFileError("");
      return;
    }
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setFile(null);
      setFileError(`Berkas terlalu besar (${formatFileSize(selected.size)}). Maksimal ${MAX_FILE_SIZE_MB}MB -- coba kompres atau scan ulang dengan resolusi lebih rendah.`);
      return;
    }
    setFileError("");
    setFile(selected);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (fileError) return;
    setSaving(true);
    try {
      let fileUrl = form.fileUrl || editing?.fileUrl || "";
      if (file) {
        fileUrl = await uploadToCloudinary(file, `pegawai/${pegawaiId}/${config.collection}`);
      }

      const payload = { ...form };
      config.fields.forEach((f) => {
        if (f.type === "number") payload[f.name] = form[f.name] === "" ? null : Number(form[f.name]);
        if (f.type === "date") payload[f.name] = form[f.name] ? new Date(form[f.name]) : null;
        if (f.type === "file") payload[f.name] = fileUrl;
      });

      if (editing) {
        await updateDoc(doc(db, "pegawai", pegawaiId, config.collection, editing.id), {
          ...payload,
          updatedAt: new Date(),
        });
      } else {
        await addDoc(colRef, { ...payload, createdAt: new Date(), updatedAt: new Date() });
      }
      setModalOpen(false);
    } catch (err) {
      setFileError(err.message || "Gagal mengunggah berkas. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record) {
    if (!confirm("Hapus data ini? Tindakan tidak dapat dibatalkan.")) return;
    await deleteDoc(doc(db, "pegawai", pegawaiId, config.collection, record.id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-[color:var(--color-ink-900)]">{config.label}</h3>
        {canEdit && (
          <button
            onClick={openAdd}
            className="text-sm px-3 py-1.5 rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)] transition-colors"
          >
            + Tambah
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-[color:var(--color-ink-500)]">Memuat…</div>
        ) : records.length === 0 ? (
          <div className="p-5 text-sm text-[color:var(--color-ink-500)]">Belum ada data.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[color:var(--color-teal-100)]/50 text-left text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">
                {config.columns.map((c) => (
                  <th key={c} className="px-4 py-2.5 font-medium">
                    {config.fields.find((f) => f.name === c)?.label || c}
                  </th>
                ))}
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-t border-[color:var(--color-teal-100)]">
                  {config.columns.map((c) => {
                    const fieldDef = config.fields.find((f) => f.name === c);
                    const val = r[c];
                    return (
                      <td key={c} className="px-4 py-2.5 text-[color:var(--color-ink-900)]">
                        {fieldDef?.type === "date" ? formatDate(val) : val ?? "-"}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {r.fileUrl && (
                      <a href={r.fileUrl} target="_blank" rel="noreferrer" className="text-[color:var(--color-teal-700)] hover:underline text-xs mr-3">
                        Lihat File
                      </a>
                    )}
                    {canEdit && (
                      <>
                        <button onClick={() => openEdit(r)} className="text-[color:var(--color-teal-700)] hover:underline text-xs mr-3">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(r)} className="text-[color:var(--color-red-500)] hover:underline text-xs">
                          Hapus
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${config.label}` : `Tambah ${config.label}`} wide>
        <form onSubmit={handleSave} className="space-y-4">
          {config.fields.map((f) => (
            <div key={f.name}>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">{f.label}</label>
              {f.type === "textarea" ? (
                <textarea
                  className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
                  rows={3}
                  value={form[f.name] || ""}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              ) : f.type === "select" ? (
                <select
                  className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
                  value={form[f.name] || ""}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                >
                  <option value="">Pilih…</option>
                  {f.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === "file" ? (
                <div>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                    className="text-sm"
                  />
                  <div className="text-[11px] text-[color:var(--color-ink-500)] mt-1">Maksimal {MAX_FILE_SIZE_MB}MB (PDF atau gambar)</div>
                  {fileError && <div className="text-xs text-[color:var(--color-red-500)] mt-1">{fileError}</div>}
                  {file && !fileError && (
                    <div className="text-xs text-[color:var(--color-green-500)] mt-1">{file.name} ({formatFileSize(file.size)}) siap diunggah</div>
                  )}
                  {editing?.fileUrl && !file && (
                    <a href={editing.fileUrl} target="_blank" rel="noreferrer" className="block mt-1 text-xs text-[color:var(--color-teal-700)] hover:underline">
                      File saat ini
                    </a>
                  )}
                </div>
              ) : (
                <input
                  type={f.type}
                  className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
                  value={form[f.name] || ""}
                  onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-[color:var(--color-teal-100)] text-[color:var(--color-ink-700)]">
              Batal
            </button>
            <button type="submit" disabled={saving || !!fileError} className="px-4 py-2 text-sm rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)] disabled:opacity-50">
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
