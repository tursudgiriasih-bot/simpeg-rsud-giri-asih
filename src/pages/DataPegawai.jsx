import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { initials } from "../utils/helpers";
import { exportPegawaiExcel } from "../utils/exportExcel";

const emptyForm = {
  nama: "", nip: "", nik: "", tempatLahir: "", tanggalLahir: "", jenisKelamin: "",
  agama: "", statusPerkawinan: "", alamat: "", noHp: "", email: "", pendidikan: "",
  jabatan: "", unitKerja: "", pangkat: "", golongan: "", tmtCpns: "", tmtPns: "",
  statusPegawai: "PNS",
};

export default function DataPegawai() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const q = query(collection(db, "pegawai"), orderBy("nama"));
    const unsub = onSnapshot(q, (snap) => {
      setList(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const units = useMemo(() => [...new Set(list.map((p) => p.unitKerja).filter(Boolean))], [list]);

  const filtered = useMemo(() => {
    return list.filter((p) => {
      const matchSearch =
        !search ||
        [p.nama, p.nip, p.jabatan, p.golongan, p.unitKerja]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(search.toLowerCase()));
      const matchUnit = !filterUnit || p.unitKerja === filterUnit;
      return matchSearch && matchUnit;
    });
  }, [list, search, filterUnit]);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        tanggalLahir: form.tanggalLahir ? new Date(form.tanggalLahir) : null,
        tmtCpns: form.tmtCpns ? new Date(form.tmtCpns) : null,
        tmtPns: form.tmtPns ? new Date(form.tmtPns) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const docRef = await addDoc(collection(db, "pegawai"), payload);
      setModalOpen(false);
      setForm(emptyForm);
      navigate(`/pegawai/${docRef.id}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    if (!confirm(`Hapus data pegawai "${p.nama}"? Seluruh riwayat dan dokumen terkait akan hilang.`)) return;
    await deleteDoc(doc(db, "pegawai", p.id));
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Data Pegawai</h1>
          <p className="text-sm text-[color:var(--color-ink-500)] mt-1">{list.length} pegawai terdaftar</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportPegawaiExcel(filtered)}
            className="px-4 py-2 text-sm rounded-lg border border-[color:var(--color-teal-700)] text-[color:var(--color-teal-700)] hover:bg-[color:var(--color-teal-100)] transition-colors"
          >
            Export Excel
          </button>
          <button
            onClick={() => { setForm(emptyForm); setModalOpen(true); }}
            className="px-4 py-2 text-sm rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)] transition-colors"
          >
            + Tambah Pegawai
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Cari nama, NIP, jabatan, golongan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
        />
        <select
          value={filterUnit}
          onChange={(e) => setFilterUnit(e.target.value)}
          className="border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
        >
          <option value="">Semua Unit</option>
          {units.map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-5 text-sm text-[color:var(--color-ink-500)]">Memuat…</div>
        ) : filtered.length === 0 ? (
          <div className="p-5 text-sm text-[color:var(--color-ink-500)]">Tidak ada data yang cocok.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[color:var(--color-teal-100)]/50 text-left text-xs uppercase tracking-wide text-[color:var(--color-ink-500)]">
                <th className="px-4 py-3 font-medium">Pegawai</th>
                <th className="px-4 py-3 font-medium">NIP</th>
                <th className="px-4 py-3 font-medium">Jabatan</th>
                <th className="px-4 py-3 font-medium">Unit</th>
                <th className="px-4 py-3 font-medium">Golongan</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-[color:var(--color-teal-100)] hover:bg-[color:var(--color-paper)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[color:var(--color-teal-100)] text-[color:var(--color-teal-700)] flex items-center justify-center text-xs font-semibold shrink-0">
                        {initials(p.nama)}
                      </div>
                      <Link to={`/pegawai/${p.id}`} className="font-medium text-[color:var(--color-ink-900)] hover:text-[color:var(--color-teal-700)]">
                        {p.nama}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono-data text-[color:var(--color-ink-700)]">{p.nip || "-"}</td>
                  <td className="px-4 py-3 text-[color:var(--color-ink-700)]">{p.jabatan || "-"}</td>
                  <td className="px-4 py-3 text-[color:var(--color-ink-700)]">{p.unitKerja || "-"}</td>
                  <td className="px-4 py-3 font-mono-data text-[color:var(--color-ink-700)]">{p.golongan || "-"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link to={`/pegawai/${p.id}`} className="text-[color:var(--color-teal-700)] hover:underline text-xs mr-3">
                      Detail
                    </Link>
                    <button onClick={() => handleDelete(p)} className="text-[color:var(--color-red-500)] hover:underline text-xs">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tambah Pegawai" wide>
        <form onSubmit={handleAdd} className="grid grid-cols-2 gap-4">
          {[
            ["nama", "Nama Lengkap", "text"],
            ["nip", "NIP", "text"],
            ["nik", "NIK", "text"],
            ["tempatLahir", "Tempat Lahir", "text"],
            ["tanggalLahir", "Tanggal Lahir", "date"],
            ["jenisKelamin", "Jenis Kelamin", "text"],
            ["agama", "Agama", "text"],
            ["statusPerkawinan", "Status Perkawinan", "text"],
            ["noHp", "Nomor HP", "text"],
            ["email", "Email", "email"],
            ["pendidikan", "Pendidikan Terakhir", "text"],
            ["jabatan", "Jabatan", "text"],
            ["unitKerja", "Unit Kerja", "text"],
            ["pangkat", "Pangkat", "text"],
            ["golongan", "Golongan", "text"],
            ["tmtCpns", "TMT CPNS", "date"],
            ["tmtPns", "TMT PNS", "date"],
          ].map(([name, label, type]) => (
            <div key={name}>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">{label}</label>
              <input
                type={type}
                value={form[name]}
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Alamat</label>
            <textarea
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
              rows={2}
            />
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-[color:var(--color-teal-100)] text-[color:var(--color-ink-700)]">
              Batal
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)] disabled:opacity-50">
              {saving ? "Menyimpan…" : "Simpan & Lanjut ke Profil"}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
