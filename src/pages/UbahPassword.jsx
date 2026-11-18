import { useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { auth } from "../firebase";
import Layout from "../components/Layout";

const inputClass =
  "w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]";

// Pesan yang mudah dipahami untuk tiap kode error Firebase Auth.
function describeError(err) {
  switch (err?.code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
      return "Password lama salah. Periksa lagi lalu coba kembali.";
    case "auth/requires-recent-login":
      return "Sesi login sudah terlalu lama. Silakan keluar, login ulang, lalu coba lagi.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "Password baru belum memenuhi syarat keamanan. Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.";
    case "auth/network-request-failed":
      return "Koneksi internet bermasalah. Periksa koneksi lalu coba lagi.";
    default:
      return "Gagal mengubah password. Silakan login ulang lalu coba lagi.";
  }
}

export default function UbahPassword() {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setErrorDetail("");
    setMessage("");
    if (!oldPassword) {
      setError("Isi password lama Anda.");
      return;
    }
    if (password.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      // Firebase mewajibkan login yang masih "baru" untuk mengganti password.
      // Dengan memverifikasi password lama di sini, pegawai tidak perlu
      // keluar dan login ulang dulu.
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, password);
      setMessage("Password berhasil diubah.");
      setOldPassword("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(describeError(err));
      // Kode teknis ditampilkan kecil supaya mudah dilacak kalau masih gagal.
      setErrorDetail([err?.code, err?.code === "auth/password-does-not-meet-requirements" ? err?.message : ""].filter(Boolean).join(" — "));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="max-w-md">
        <h1 className="font-display text-2xl text-[color:var(--color-ink-900)] mb-6">Ubah Password</h1>
        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Password Lama</label>
            <input
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Password Baru</label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Konfirmasi Password Baru</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>
          {error && (
            <div className="text-sm text-[color:var(--color-red-500)]">
              {error}
              {errorDetail && <div className="text-xs opacity-70 mt-1 break-words">Kode: {errorDetail}</div>}
            </div>
          )}
          {message && <div className="text-sm text-[color:var(--color-green-500)]">{message}</div>}
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-[color:var(--color-teal-700)] text-white text-sm font-medium hover:bg-[color:var(--color-teal-900)] disabled:opacity-50">
            {saving ? "Menyimpan…" : "Simpan Password"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
