import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth } from "../firebase";
import Layout from "../components/Layout";

export default function UbahPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    setSaving(true);
    try {
      await updatePassword(auth.currentUser, password);
      setMessage("Password berhasil diubah.");
      setPassword("");
      setConfirm("");
    } catch {
      setError("Gagal mengubah password. Silakan login ulang lalu coba lagi.");
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
            <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Password Baru</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Konfirmasi Password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
            />
          </div>
          {error && <div className="text-sm text-[color:var(--color-red-500)]">{error}</div>}
          {message && <div className="text-sm text-[color:var(--color-green-500)]">{message}</div>}
          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-[color:var(--color-teal-700)] text-white text-sm font-medium hover:bg-[color:var(--color-teal-900)] disabled:opacity-50">
            {saving ? "Menyimpan…" : "Simpan Password"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
