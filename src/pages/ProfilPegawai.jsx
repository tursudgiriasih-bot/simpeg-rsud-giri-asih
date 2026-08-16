import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { uploadToCloudinary } from "../utils/cloudinary";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import SectionRecords from "../components/SectionRecords";
import { subscribeSections } from "../utils/sectionCatalog";
import { formatDate, toDateInputValue, initials, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB, formatFileSize } from "../utils/helpers";
import { useAuth } from "../context/AuthContext";

const IDENTITY_EDITABLE_BY_PEGAWAI = ["alamat", "noHp", "email"];

// Daftar field identitas yang bisa diisi/diedit Admin -- SENGAJA daftar tetap
// (bukan Object.keys(pegawai)), supaya field yang dari awal kosong (mis.
// pegawai daftar mandiri yang tidak diminta isi Jenis Kelamin/Agama/dst)
// tetap muncul di form Edit dan bisa dilengkapi -- bukan hilang begitu saja
// hanya karena belum pernah ada nilainya. Urutan & isinya harus sama dengan
// daftar tampilan "Data Identitas" di bawah supaya konsisten.
const IDENTITY_EDITABLE_BY_ADMIN = [
  "nama", "nip", "nik", "tempatLahir", "tanggalLahir", "jenisKelamin", "agama",
  "statusPerkawinan", "alamat", "noHp", "email", "pendidikan", "jabatan",
  "unitKerja", "pangkat", "golongan", "tmtCpns", "tmtPns", "statusPegawai",
];

// Label yang enak dibaca untuk tiap field di atas -- dipakai di form Edit
// supaya tidak menampilkan nama field mentah seperti "tempatLahir"/"noHp".
const IDENTITY_FIELD_LABELS = {
  nama: "Nama Lengkap", nip: "NIP", nik: "NIK", tempatLahir: "Tempat Lahir",
  tanggalLahir: "Tanggal Lahir", jenisKelamin: "Jenis Kelamin", agama: "Agama",
  statusPerkawinan: "Status Perkawinan", alamat: "Alamat", noHp: "No HP", email: "Email",
  pendidikan: "Pendidikan", jabatan: "Jabatan", unitKerja: "Unit Kerja",
  pangkat: "Pangkat", golongan: "Golongan", tmtCpns: "TMT CPNS", tmtPns: "TMT PNS",
  statusPegawai: "Status Pegawai",
};

function generateTempPassword() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export default function ProfilPegawai() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, profile: authProfile } = useAuth();
  const [pegawai, setPegawai] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("identitas");
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [identityForm, setIdentityForm] = useState({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [sections, setSections] = useState([]);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetResult, setResetResult] = useState(null); // { password } | { error }

  useEffect(() => {
    const unsub = subscribeSections(setSections);
    return unsub;
  }, []);

  useEffect(() => {
    setLoading(true);
    setAccessDenied(false);
    const unsub = onSnapshot(
      doc(db, "pegawai", id),
      (snap) => {
        if (snap.exists()) setPegawai({ id: snap.id, ...snap.data() });
        else setPegawai(null);
        setLoading(false);
      },
      (err) => {
        // Firestore rules menolak akses (mis. pegawai mencoba membuka profil orang lain).
        if (err.code === "permission-denied") setAccessDenied(true);
        setLoading(false);
      }
    );
    return unsub;
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="text-sm text-[color:var(--color-ink-500)]">Memuat profil…</div>
      </Layout>
    );
  }

  if (accessDenied) {
    return (
      <Layout>
        <div className="card p-6 text-sm text-[color:var(--color-ink-700)]">
          Anda tidak memiliki akses untuk melihat profil pegawai ini. Setiap pegawai hanya dapat
          melihat datanya sendiri.
        </div>
      </Layout>
    );
  }

  if (!pegawai) {
    return (
      <Layout>
        <div className="text-sm text-[color:var(--color-ink-500)]">Data pegawai tidak ditemukan.</div>
      </Layout>
    );
  }

  const canEditAll = isAdmin;

  function startEditIdentity() {
    const editable = isAdmin ? IDENTITY_EDITABLE_BY_ADMIN : IDENTITY_EDITABLE_BY_PEGAWAI;
    const vals = {};
    editable.forEach((k) => {
      const v = pegawai[k];
      vals[k] = v?.toDate ? toDateInputValue(v) : v ?? "";
    });
    setIdentityForm(vals);
    setEditingIdentity(true);
  }

  async function saveIdentity(e) {
    e.preventDefault();
    const payload = { ...identityForm, updatedAt: new Date() };
    ["tanggalLahir", "tmtCpns", "tmtPns"].forEach((k) => {
      if (payload[k]) payload[k] = new Date(payload[k]);
    });
    await updateDoc(doc(db, "pegawai", id), payload);
    setEditingIdentity(false);
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`Foto terlalu besar (${formatFileSize(file.size)}). Maksimal ${MAX_FILE_SIZE_MB}MB -- coba kompres atau ambil ulang dengan resolusi lebih kecil.`);
      e.target.value = "";
      return;
    }
    setPhotoUploading(true);
    try {
      const url = await uploadToCloudinary(file, `pegawai/${id}/foto`);
      await updateDoc(doc(db, "pegawai", id), { fotoUrl: url });
    } catch (err) {
      alert(err.message || "Gagal mengunggah foto.");
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleResetPassword() {
    setResetting(true);
    setResetResult(null);
    try {
      const newPassword = generateTempPassword();
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/reset-pegawai-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ pegawaiId: id, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mereset password. Coba lagi.");
      setResetResult({ password: newPassword });
    } catch (err) {
      setResetResult({ error: err.message || "Gagal mereset password. Coba lagi." });
    } finally {
      setResetting(false);
    }
  }

  const tabs = [
    { key: "identitas", label: "Identitas" },
    ...sections.map((s) => ({ key: s.key, label: s.label })),
  ];

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="text-sm text-[color:var(--color-teal-700)] hover:underline mb-4">
        ← Kembali
      </button>

      <div className="card p-6 mb-6 flex items-center gap-5">
        <div className="relative shrink-0">
          {pegawai.fotoUrl ? (
            <img src={pegawai.fotoUrl} alt={pegawai.nama} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[color:var(--color-teal-100)] text-[color:var(--color-teal-700)] flex items-center justify-center text-2xl font-semibold">
              {initials(pegawai.nama)}
            </div>
          )}
          {(canEditAll || authProfile?.pegawaiId === id) && (
            <label className="absolute -bottom-1 -right-1 bg-[color:var(--color-teal-700)] text-white text-[10px] px-1.5 py-0.5 rounded-full cursor-pointer">
              {photoUploading ? "…" : "Ubah"}
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          )}
        </div>
        <div>
          <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">{pegawai.nama}</h1>
          <p className="text-sm text-[color:var(--color-ink-500)] mt-0.5">
            {pegawai.jabatan || "-"} · {pegawai.unitKerja || "-"}
          </p>
          <p className="text-xs font-mono-data text-[color:var(--color-ink-500)] mt-1">
            NIP {pegawai.nip || "-"} · Golongan {pegawai.golongan || "-"}
          </p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto mb-5 border-b border-[color:var(--color-teal-100)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key
                ? "border-[color:var(--color-teal-700)] text-[color:var(--color-teal-700)] font-medium"
                : "border-transparent text-[color:var(--color-ink-500)] hover:text-[color:var(--color-ink-900)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "identitas" ? (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[color:var(--color-ink-900)]">Data Identitas</h3>
            <div className="flex gap-2">
              {isAdmin && !editingIdentity && (
                <button
                  onClick={() => { setResetResult(null); setResetModalOpen(true); }}
                  className="text-sm px-3 py-1.5 rounded-lg border border-[color:var(--color-teal-700)] text-[color:var(--color-teal-700)] hover:bg-[color:var(--color-teal-100)]"
                >
                  Reset Password
                </button>
              )}
              {!editingIdentity && (
                <button onClick={startEditIdentity} className="text-sm px-3 py-1.5 rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)]">
                  Edit
                </button>
              )}
            </div>
          </div>
          {editingIdentity ? (
            <form onSubmit={saveIdentity} className="grid grid-cols-2 gap-4">
              {Object.keys(identityForm).map((key) => {
                const isDate = ["tanggalLahir", "tmtCpns", "tmtPns"].includes(key);
                const isGender = key === "jenisKelamin";
                const isStatus = key === "statusPegawai";
                return (
                  <div key={key}>
                    <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">{IDENTITY_FIELD_LABELS[key] || key}</label>
                    {isGender ? (
                      <select
                        value={identityForm[key] || ""}
                        onChange={(e) => setIdentityForm({ ...identityForm, [key]: e.target.value })}
                        className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
                      >
                        <option value="">- Pilih -</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    ) : isStatus ? (
                      <select
                        value={identityForm[key] || ""}
                        onChange={(e) => setIdentityForm({ ...identityForm, [key]: e.target.value })}
                        className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
                      >
                        <option value="PNS">PNS</option>
                        <option value="PPPK">PPPK</option>
                        <option value="BLUD">BLUD</option>
                      </select>
                    ) : (
                      <input
                        type={isDate ? "date" : "text"}
                        value={identityForm[key] || ""}
                        onChange={(e) => setIdentityForm({ ...identityForm, [key]: e.target.value })}
                        className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
                      />
                    )}
                  </div>
                );
              })}
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingIdentity(false)} className="px-4 py-2 text-sm rounded-lg border border-[color:var(--color-teal-100)]">
                  Batal
                </button>
                <button type="submit" className="px-4 py-2 text-sm rounded-lg bg-[color:var(--color-teal-700)] text-white">
                  Simpan
                </button>
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                ["NIP", pegawai.nip], ["NIK", pegawai.nik], ["Tempat Lahir", pegawai.tempatLahir],
                ["Tanggal Lahir", formatDate(pegawai.tanggalLahir)], ["Jenis Kelamin", pegawai.jenisKelamin],
                ["Agama", pegawai.agama], ["Status Perkawinan", pegawai.statusPerkawinan],
                ["Alamat", pegawai.alamat], ["No HP", pegawai.noHp], ["Email", pegawai.email],
                ["Pendidikan", pegawai.pendidikan], ["Jabatan", pegawai.jabatan], ["Unit Kerja", pegawai.unitKerja],
                ["Pangkat", pegawai.pangkat], ["Golongan", pegawai.golongan],
                ["TMT CPNS", formatDate(pegawai.tmtCpns)], ["TMT PNS", formatDate(pegawai.tmtPns)],
                ["Status Pegawai", pegawai.statusPegawai],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-[color:var(--color-ink-500)]">{label}</dt>
                  <dd className="text-sm text-[color:var(--color-ink-900)] mt-0.5">{value || "-"}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ) : (
        (() => {
          const activeSection = sections.find((s) => s.key === tab);
          if (!activeSection) return null;
          return (
            <SectionRecords
              pegawaiId={id}
              config={{ ...activeSection, collection: activeSection.key }}
              canEdit={canEditAll || (authProfile?.pegawaiId === id && !!activeSection.allowPegawaiAdd)}
            />
          );
        })()
      )}

      <Modal open={resetModalOpen} onClose={() => setResetModalOpen(false)} title={`Reset Password: ${pegawai.nama}`}>
        {resetResult?.password ? (
          <div>
            <p className="text-sm text-[color:var(--color-ink-700)] mb-3">
              Password baru berhasil dibuat. Sampaikan ke pegawai secara langsung (jangan lewat
              chat/email yang tidak aman) — minta mereka segera menggantinya lewat menu
              <span className="font-medium"> Ubah Password</span> setelah login.
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono-data text-lg bg-[color:var(--color-paper)] border border-[color:var(--color-teal-100)] rounded-lg px-4 py-3 text-center tracking-wider">
                {resetResult.password}
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(resetResult.password)}
                className="px-3 py-3 text-xs rounded-lg border border-[color:var(--color-teal-700)] text-[color:var(--color-teal-700)] hover:bg-[color:var(--color-teal-100)]"
              >
                Salin
              </button>
            </div>
            <button
              onClick={() => setResetModalOpen(false)}
              className="w-full mt-4 py-2.5 rounded-lg bg-[color:var(--color-teal-700)] text-white text-sm font-medium hover:bg-[color:var(--color-teal-900)]"
            >
              Selesai
            </button>
          </div>
        ) : resetResult?.error ? (
          <div>
            <p className="text-sm text-[color:var(--color-red-500)] mb-4">{resetResult.error}</p>
            <button onClick={() => setResetModalOpen(false)} className="w-full py-2.5 rounded-lg border border-[color:var(--color-teal-100)] text-sm text-[color:var(--color-ink-700)]">
              Tutup
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-[color:var(--color-ink-700)] mb-5">
              Sistem akan membuatkan password sementara acak untuk akun login <strong>{pegawai.nama}</strong>.
              Password lama akan langsung tidak berlaku. Lanjutkan?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetModalOpen(false)} className="px-4 py-2 text-sm rounded-lg border border-[color:var(--color-teal-100)] text-[color:var(--color-ink-700)]">
                Batal
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="px-4 py-2 text-sm rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)] disabled:opacity-50"
              >
                {resetting ? "Memproses…" : "Ya, Buatkan Password Baru"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
