import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import logoRsud from "../assets/logo-rsud.png";

const emptyForm = {
  nip: "", nama: "", nik: "", tempatLahir: "", tanggalLahir: "",
  noHp: "", emailPribadi: "", password: "", confirm: "",
};

export default function Register() {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!/^[0-9]{8,25}$/.test(form.nip.trim())) {
      setError("NIP harus berupa angka (8-25 digit).");
      return;
    }
    if (form.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setSubmitting(true);
    try {
      const email = `${form.nip.trim()}@pegawai.simpeg.internal`;
      const cred = await createUserWithEmailAndPassword(auth, email, form.password);

      await setDoc(doc(db, "users", cred.user.uid), {
        role: "pending",
        status: "menunggu",
        nip: form.nip.trim(),
        nama: form.nama.trim(),
        nik: form.nik.trim(),
        tempatLahir: form.tempatLahir.trim(),
        tanggalLahir: form.tanggalLahir || null,
        noHp: form.noHp.trim(),
        emailPribadi: form.emailPribadi.trim(),
        email,
        createdAt: serverTimestamp(),
      });

      setDone(true);
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("NIP ini sudah pernah didaftarkan. Jika belum bisa login, hubungi Admin TU Kepegawaian untuk mengecek status verifikasi.");
      } else if (err.code === "auth/weak-password") {
        setError("Password terlalu lemah, gunakan minimal 6 karakter.");
      } else {
        setError("Pendaftaran gagal. Silakan coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-teal-900)] px-4">
        <div className="w-full max-w-md bg-white rounded-xl p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-full bg-[color:var(--color-amber-100)] text-[color:var(--color-amber-700)] flex items-center justify-center text-2xl mx-auto mb-4">
            ⏳
          </div>
          <h2 className="font-display text-xl text-[color:var(--color-ink-900)] mb-2">Pendaftaran Terkirim</h2>
          <p className="text-sm text-[color:var(--color-ink-500)] mb-6">
            Data Anda menunggu verifikasi Bagian TU Kepegawaian. Anda akan bisa login setelah
            akun disetujui. Anda bisa menutup halaman ini dan mencoba login lagi nanti.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="w-full py-2.5 rounded-lg bg-[color:var(--color-teal-700)] text-white text-sm font-medium hover:bg-[color:var(--color-teal-900)]"
          >
            Ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-teal-900)] px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <img src={logoRsud} alt="Logo RSUD Giri Asih" className="w-14 h-14 object-contain mx-auto mb-2" />
          <div className="font-display text-lg text-white tracking-tight">RSUD GIRI ASIH</div>
          <div className="text-sm text-teal-200/70 mt-1">Pendaftaran Akun Pegawai — SIMPEG</div>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 space-y-4 shadow-xl">
          <p className="text-xs text-[color:var(--color-ink-500)] -mt-1 mb-1">
            Isi data sesuai identitas kepegawaian Anda. Data ini akan diperiksa dan ditautkan
            dengan data induk oleh Bagian TU Kepegawaian sebelum akun aktif.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Nama Lengkap</label>
              <input required value={form.nama} onChange={(e) => update("nama", e.target.value)}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">NIP</label>
              <input required value={form.nip} onChange={(e) => update("nip", e.target.value)}
                placeholder="Angka saja"
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">NIK</label>
              <input required value={form.nik} onChange={(e) => update("nik", e.target.value)}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Tempat Lahir</label>
              <input value={form.tempatLahir} onChange={(e) => update("tempatLahir", e.target.value)}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Tanggal Lahir</label>
              <input type="date" value={form.tanggalLahir} onChange={(e) => update("tanggalLahir", e.target.value)}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">No HP</label>
              <input value={form.noHp} onChange={(e) => update("noHp", e.target.value)}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Email Pribadi</label>
              <input type="email" value={form.emailPribadi} onChange={(e) => update("emailPribadi", e.target.value)}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Password</label>
              <input type="password" required value={form.password} onChange={(e) => update("password", e.target.value)}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Konfirmasi Password</label>
              <input type="password" required value={form.confirm} onChange={(e) => update("confirm", e.target.value)}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]" />
            </div>
          </div>

          {error && <div className="text-sm text-[color:var(--color-red-500)]">{error}</div>}

          <button type="submit" disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-[color:var(--color-teal-700)] text-white text-sm font-medium hover:bg-[color:var(--color-teal-900)] disabled:opacity-50">
            {submitting ? "Mengirim…" : "Daftar"}
          </button>
          <div className="text-center">
            <Link to="/login" className="text-xs text-[color:var(--color-teal-700)] hover:underline">
              Sudah punya akun? Masuk
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
