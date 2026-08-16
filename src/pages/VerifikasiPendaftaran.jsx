import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, updateDoc, where, addDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import Layout from "../components/Layout";
import Modal from "../components/Modal";
import { fetchAllPegawai } from "../utils/queries";
import { formatDate, initials } from "../utils/helpers";

export default function VerifikasiPendaftaran() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [reviewing, setReviewing] = useState(null); // registration doc being reviewed
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "pending"));
    const unsub = onSnapshot(q, (snap) => {
      setPending(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
    fetchAllPegawai().then(setPegawaiList);
    return unsub;
  }, []);

  const matches = useMemo(() => {
    if (!search) return pegawaiList.slice(0, 8);
    return pegawaiList
      .filter((p) => [p.nama, p.nip].filter(Boolean).some((v) => v.toLowerCase().includes(search.toLowerCase())))
      .slice(0, 8);
  }, [search, pegawaiList]);

  function openReview(reg) {
    setReviewing(reg);
    setSearch(reg.nip || "");
  }

  async function linkToExisting(pegawai) {
    setBusy(true);
    try {
      // Isi field kontak yang masih kosong di data pegawai dari data pendaftaran, tanpa menimpa yang sudah ada.
      const patch = {};
      if (!pegawai.noHp && reviewing.noHp) patch.noHp = reviewing.noHp;
      if (!pegawai.email && reviewing.emailPribadi) patch.email = reviewing.emailPribadi;
      if (Object.keys(patch).length > 0) {
        await updateDoc(doc(db, "pegawai", pegawai.id), { ...patch, updatedAt: new Date() });
      }
      await updateDoc(doc(db, "users", reviewing.uid), {
        role: "pegawai",
        pegawaiId: pegawai.id,
        status: "approved",
        nama: pegawai.nama,
        updatedAt: new Date(),
      });
      setReviewing(null);
    } finally {
      setBusy(false);
    }
  }

  async function createAndLink() {
    setBusy(true);
    try {
      const newDoc = await addDoc(collection(db, "pegawai"), {
        nama: reviewing.nama || "",
        nip: reviewing.nip || "",
        nik: reviewing.nik || "",
        tempatLahir: reviewing.tempatLahir || "",
        tanggalLahir: reviewing.tanggalLahir ? new Date(reviewing.tanggalLahir) : null,
        noHp: reviewing.noHp || "",
        email: reviewing.emailPribadi || "",
        statusPegawai: "PNS",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await updateDoc(doc(db, "users", reviewing.uid), {
        role: "pegawai",
        pegawaiId: newDoc.id,
        status: "approved",
        updatedAt: new Date(),
      });
      setReviewing(null);
    } finally {
      setBusy(false);
    }
  }

  async function reject(reg) {
    if (!confirm(`Tolak pendaftaran "${reg.nama}"? Akun login dan data pendaftarannya akan dihapus permanen -- NIP ini nantinya bisa dipakai daftar ulang.`)) return;
    prompt(`Alasan penolakan pendaftaran "${reg.nama}" (opsional, buat catatan Anda sendiri -- tidak disimpan di sistem):`);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("/api/delete-pegawai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ uid: reg.uid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menolak pendaftaran.");
    } catch (err) {
      alert(err.message || "Gagal menolak pendaftaran. Coba lagi.");
    }
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-[color:var(--color-ink-900)]">Verifikasi Pendaftaran</h1>
        <p className="text-sm text-[color:var(--color-ink-500)] mt-1">
          Pegawai yang mendaftar mandiri akan muncul di sini sampai Anda menautkan atau menolaknya.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-[color:var(--color-ink-500)]">Memuat…</div>
      ) : pending.length === 0 ? (
        <div className="card p-6 text-sm text-[color:var(--color-ink-500)]">Tidak ada pendaftaran yang menunggu verifikasi.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pending.map((reg) => (
            <div key={reg.uid} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[color:var(--color-teal-100)] text-[color:var(--color-teal-700)] flex items-center justify-center text-sm font-semibold">
                  {initials(reg.nama)}
                </div>
                <div>
                  <div className="font-medium text-[color:var(--color-ink-900)]">{reg.nama || "(tanpa nama)"}</div>
                  <div className="text-xs font-mono-data text-[color:var(--color-ink-500)]">NIP {reg.nip}</div>
                </div>
              </div>
              <dl className="text-xs text-[color:var(--color-ink-500)] grid grid-cols-2 gap-y-1 mb-4">
                <div>NIK: <span className="text-[color:var(--color-ink-700)]">{reg.nik || "-"}</span></div>
                <div>No HP: <span className="text-[color:var(--color-ink-700)]">{reg.noHp || "-"}</span></div>
                <div>Lahir: <span className="text-[color:var(--color-ink-700)]">{reg.tempatLahir || "-"}, {formatDate(reg.tanggalLahir)}</span></div>
                <div>Daftar: <span className="text-[color:var(--color-ink-700)]">{formatDate(reg.createdAt)}</span></div>
              </dl>
              <div className="flex gap-2">
                <button onClick={() => openReview(reg)} className="flex-1 px-3 py-2 text-xs rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)]">
                  Tinjau & Setujui
                </button>
                <button onClick={() => reject(reg)} className="px-3 py-2 text-xs rounded-lg border border-[color:var(--color-red-500)] text-[color:var(--color-red-500)] hover:bg-[color:var(--color-red-100)]">
                  Tolak
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!reviewing} onClose={() => setReviewing(null)} title={`Tinjau Pendaftaran: ${reviewing?.nama || ""}`} wide>
        {reviewing && (
          <div>
            <div className="mb-5 text-sm text-[color:var(--color-ink-700)]">
              Cocokkan pendaftaran ini dengan data pegawai yang sudah ada (disarankan, agar riwayat lama tidak
              terpisah), atau buat data pegawai baru jika memang belum pernah diinput.
            </div>

            <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Cari data pegawai (nama/NIP)</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
            />

            <div className="max-h-56 overflow-y-auto border border-[color:var(--color-teal-100)] rounded-lg mb-5">
              {matches.length === 0 ? (
                <div className="p-4 text-sm text-[color:var(--color-ink-500)]">Tidak ada data pegawai yang cocok.</div>
              ) : (
                matches.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-2.5 border-b border-[color:var(--color-teal-100)] last:border-b-0">
                    <div>
                      <div className="text-sm font-medium text-[color:var(--color-ink-900)]">{p.nama}</div>
                      <div className="text-xs font-mono-data text-[color:var(--color-ink-500)]">NIP {p.nip || "-"}</div>
                    </div>
                    <button
                      disabled={busy}
                      onClick={() => linkToExisting(p)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[color:var(--color-teal-700)] text-white hover:bg-[color:var(--color-teal-900)] disabled:opacity-50"
                    >
                      Tautkan & Setujui
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[color:var(--color-teal-100)] pt-4">
              <div className="text-xs text-[color:var(--color-ink-500)] max-w-xs">
                Belum ada di sistem? Buat data pegawai baru langsung dari data yang dikirim saat pendaftaran.
              </div>
              <button
                disabled={busy}
                onClick={createAndLink}
                className="px-4 py-2 text-xs rounded-lg border border-[color:var(--color-teal-700)] text-[color:var(--color-teal-700)] hover:bg-[color:var(--color-teal-100)] disabled:opacity-50"
              >
                + Buat Data Pegawai Baru
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
