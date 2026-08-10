import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function StatusAccount() {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const rejected = profile?.role === "rejected";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-paper)] px-4">
      <div className="w-full max-w-md card p-8 text-center">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4 ${
            rejected ? "bg-[color:var(--color-red-100)] text-[color:var(--color-red-700)]" : "bg-[color:var(--color-amber-100)] text-[color:var(--color-amber-700)]"
          }`}
        >
          {rejected ? "✕" : "⏳"}
        </div>
        <h2 className="font-display text-xl text-[color:var(--color-ink-900)] mb-2">
          {rejected ? "Pendaftaran Ditolak" : "Menunggu Verifikasi"}
        </h2>
        <p className="text-sm text-[color:var(--color-ink-500)] mb-2">
          {rejected
            ? "Pendaftaran akun Anda ditolak oleh Bagian TU Kepegawaian."
            : "Akun Anda sedang ditinjau oleh Bagian TU Kepegawaian. Halaman ini akan otomatis berubah begitu akun Anda disetujui — tidak perlu login ulang."}
        </p>
        {rejected && profile?.catatan && (
          <p className="text-sm text-[color:var(--color-ink-700)] bg-[color:var(--color-red-100)]/40 rounded-lg p-3 mb-2">
            Catatan: {profile.catatan}
          </p>
        )}
        <p className="text-xs text-[color:var(--color-ink-500)] mb-6">
          Ada pertanyaan? Hubungi Bagian TU Kepegawaian RSUD Giri Asih.
        </p>
        <button
          onClick={async () => { await logout(); navigate("/login"); }}
          className="w-full py-2.5 rounded-lg border border-[color:var(--color-teal-700)] text-[color:var(--color-teal-700)] text-sm font-medium hover:bg-[color:var(--color-teal-100)]"
        >
          Keluar
        </button>
      </div>
    </div>
  );
}
