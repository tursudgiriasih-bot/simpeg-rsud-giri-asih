import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";
import {
  useProfesiList,
  addProfesi,
  renameProfesi,
  deleteProfesi,
  countByProfesi,
  BELUM_DIISI,
} from "../utils/profesi";

const inputClass =
  "border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]";

export default function KelolaProfesi() {
  const { list, loading } = useProfesiList();
  const [pegawai, setPegawai] = useState([]);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(null); // nama profesi yang sedang diedit
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "error", text }

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "pegawai"), (snap) => {
      setPegawai(snap.docs.map((d) => d.data()));
    });
    return unsub;
  }, []);

  const counts = useMemo(() => countByProfesi(pegawai), [pegawai]);

  async function run(action, okText) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      setMessage({ type: "ok", text: typeof okText === "function" ? okText(result) : okText });
      return true;
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Terjadi kesalahan. Coba lagi." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    const ok = await run(() => addProfesi(newName, list), `Profesi "${newName.trim()}" ditambahkan.`);
    if (ok) setNewName("");
  }

  async function handleRename(oldName) {
    const ok = await run(
      () => renameProfesi(oldName, editValue, list),
      (jumlah) =>
        jumlah > 0
          ? `Nama profesi diubah. ${jumlah} pegawai ikut diperbarui otomatis.`
          : "Nama profesi diubah."
    );
    if (ok) setEditing(null);
  }

  async function handleDelete(nama) {
    if ((counts[nama] || 0) > 0) {
      setMessage({
        type: "error",
        text: `Profesi "${nama}" masih dipakai ${counts[nama]} pegawai, jadi belum bisa dihapus. Ubah dulu profesi pegawai tersebut, atau gunakan Edit untuk mengganti namanya.`,
      });
      return;
    }
    if (!confirm(`Hapus profesi "${nama}" dari daftar?`)) return;
    await run(() => deleteProfesi(nama, list), `Profesi "${nama}" dihapus.`);
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Kelola Profesi</h1>
        <p className="text-sm text-[color:var(--color-ink-500)] mt-1">
          Daftar ini muncul sebagai pilihan dropdown &quot;Profesi&quot; di data pegawai dan menjadi dasar grafik di Dashboard.
        </p>
      </div>

      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            message.type === "ok"
              ? "bg-[color:var(--color-green-100)] text-[color:var(--color-green-700)]"
              : "bg-[color:var(--color-red-100)] text-[color:var(--color-red-700)]"
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleAdd} className="card p-5 mb-5 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Tambah profesi baru</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Contoh: Fisioterapis"
            className={`${inputClass} w-full`}
          />
        </div>
        <button
          type="submit"
          disabled={busy || !newName.trim()}
          className="px-4 py-2 text-sm rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)] disabled:opacity-50"
        >
          + Tambah
        </button>
      </form>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-[color:var(--color-ink-500)]">Memuat…</div>
        ) : list.length === 0 ? (
          <div className="p-5 text-sm text-[color:var(--color-ink-500)]">Belum ada profesi. Tambahkan lewat kolom di atas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[color:var(--color-teal-100)]/50 text-left text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">
                <th className="px-4 py-3 font-medium">Profesi</th>
                <th className="px-4 py-3 font-medium w-40">Jumlah Pegawai</th>
                <th className="px-4 py-3 w-48"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((nama) => (
                <tr key={nama} className="border-t border-[color:var(--color-teal-100)]">
                  <td className="px-4 py-3 text-[color:var(--color-ink-900)]">
                    {editing === nama ? (
                      <input
                        autoFocus
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(nama);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className={`${inputClass} w-full`}
                      />
                    ) : (
                      nama
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono-data text-[color:var(--color-ink-700)]">{counts[nama] || 0}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {editing === nama ? (
                      <>
                        <button
                          onClick={() => handleRename(nama)}
                          disabled={busy}
                          className="text-[color:var(--color-teal-700)] hover:underline text-xs mr-3 disabled:opacity-50"
                        >
                          Simpan
                        </button>
                        <button onClick={() => setEditing(null)} className="text-[color:var(--color-ink-500)] hover:underline text-xs">
                          Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setMessage(null); setEditing(nama); setEditValue(nama); }}
                          className="text-[color:var(--color-teal-700)] hover:underline text-xs mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(nama)}
                          disabled={busy}
                          className="text-[color:var(--color-red-500)] hover:underline text-xs disabled:opacity-50"
                        >
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

      {(counts[BELUM_DIISI] || 0) > 0 && (
        <p className="text-xs text-[color:var(--color-ink-500)] mt-3">
          {counts[BELUM_DIISI]} pegawai belum memilih profesi. Isi lewat menu Data Pegawai → Detail → Edit.
        </p>
      )}
    </Layout>
  );
}
