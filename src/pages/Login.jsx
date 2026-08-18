import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import logoRsud from "../assets/logo-rsud.png";
import gedungRsud from "../assets/gedung-rsud.jpg";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("pegawai"); // "pegawai" | "admin" -- dipilih eksplisit, tidak ditebak dari isi input
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);

  function switchMode(next) {
    setMode(next);
    setIdentifier("");
    setError("");
    setForgotMessage("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Admin login pakai email asli. Pegawai login pakai NIP, yang di-mapping
      // ke email internal saat akun dibuatkan admin/didaftarkan mandiri.
      const email = mode === "admin" ? identifier.trim() : `${identifier.trim()}@pegawai.simpeg.internal`;
      await login(email, password);
      navigate("/");
    } catch {
      setError(mode === "admin" ? "Email atau password salah. Silakan coba lagi." : "NIP atau password salah. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setForgotMessage("");

    if (!identifier.trim()) {
      setForgotMessage(mode === "admin" ? "Isi dulu kolom Email di atas, baru klik \"Lupa password?\"." : "Isi dulu kolom NIP di atas, baru klik \"Lupa password?\".");
      return;
    }

    if (mode !== "admin") {
      setForgotMessage(
        "Untuk akun Pegawai, reset password dilakukan oleh Admin TU Kepegawaian (bukan lewat email). Silakan hubungi Admin dan sebutkan NIP Anda."
      );
      return;
    }

    setForgotBusy(true);
    try {
      await sendPasswordResetEmail(auth, identifier.trim());
      setForgotMessage(`Email reset password telah dikirim ke ${identifier.trim()}. Cek kotak masuk (dan folder spam) Anda.`);
    } catch {
      setForgotMessage("Gagal mengirim email reset. Pastikan email tersebut benar-benar terdaftar sebagai akun Admin.");
    } finally {
      setForgotBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[color:var(--color-paper)]">
      {/* Panel kiri -- identitas RSUD */}
      <div className="relative md:w-[46%] bg-[color:var(--color-teal-900)] text-white flex flex-col px-8 py-10 md:px-12 md:py-12 overflow-hidden">
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10">
            <img src={logoRsud} alt="Logo RSUD Giri Asih" className="w-12 h-12 object-contain shrink-0" />
            <div>
              <div className="font-display text-lg leading-tight">RSUD GIRI ASIH</div>
              <div className="text-[11px] text-teal-200/70 tracking-wide">SI-PATUH · Sistem Peringatan Automatis Tenggat Urusan Hukum</div>
            </div>
          </div>

          {/* Blok sambutan -- foto gedung ditaruh sebagai elemen transparan di
              belakang teks, ukurannya mengikuti tinggi blok teks (bukan kartu
              foto terpisah), supaya proporsional dan menyatu dengan panel. */}
          <div className="relative flex-1 flex items-start pt-6 min-h-[320px]">
            <img
              src={gedungRsud}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-[0.32] mix-blend-luminosity"
              style={{
                maskImage: "radial-gradient(ellipse 90% 80% at 30% 50%, black 45%, transparent 88%)",
                WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 30% 50%, black 45%, transparent 88%)",
              }}
            />
            <div className="relative">
              <h1 className="font-display text-3xl md:text-[2.15rem] leading-tight mb-3">Selamat Datang</h1>
              <p className="text-sm font-medium text-white/90 mb-3">
                "Tepat Waktu Mengingatkan, 100% Patuh Regulasi!"
              </p>
              <p className="text-sm text-teal-100/80 leading-relaxed max-w-sm">
                SI-PATUH adalah sistem peringatan otomatis untuk kepatuhan regulasi ketenagakerjaan
                RSUD Giri Asih — memastikan setiap izin praktik, penugasan klinis, dan kenaikan berkala
                pegawai selalu terpantau sebelum jatuh tempo.
              </p>
            </div>
          </div>

          <div className="pt-6 text-[11px] text-teal-200/50">
            © {new Date().getFullYear()} RSUD Giri Asih. Hak cipta dilindungi.
          </div>
        </div>

        {/* Aksen dekoratif */}
        <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-[color:var(--color-teal-700)] opacity-40 pointer-events-none" />
        <div className="absolute -left-16 bottom-10 w-56 h-56 rounded-full bg-[color:var(--color-teal-700)] opacity-30 pointer-events-none" />
      </div>

      {/* Panel kanan -- form login */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl text-[color:var(--color-ink-900)] mb-1">Masuk ke Akun Anda</h2>
          <p className="text-sm text-[color:var(--color-ink-500)] mb-7">
            Belum memiliki akun?{" "}
            <Link to="/daftar" className="text-[color:var(--color-teal-700)] font-medium hover:underline">
              Daftar sekarang
            </Link>
          </p>

          <div className="flex mb-5 rounded-lg bg-[color:var(--color-paper)] p-1">
            <button
              type="button"
              onClick={() => switchMode("pegawai")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === "pegawai" ? "bg-white text-[color:var(--color-teal-900)] shadow-sm" : "text-[color:var(--color-ink-500)]"
              }`}
            >
              Saya Pegawai
            </button>
            <button
              type="button"
              onClick={() => switchMode("admin")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === "admin" ? "bg-white text-[color:var(--color-teal-900)] shadow-sm" : "text-[color:var(--color-ink-500)]"
              }`}
            >
              Saya Admin
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">
                {mode === "admin" ? "Email" : "NIP"}
              </label>
              <input
                type={mode === "admin" ? "email" : "text"}
                inputMode={mode === "admin" ? "email" : "numeric"}
                required
                value={identifier}
                onChange={(e) => { setIdentifier(e.target.value); setForgotMessage(""); }}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
                placeholder={mode === "admin" ? "nama@email.com" : "Contoh: 198501012010011001"}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[color:var(--color-ink-500)] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[color:var(--color-teal-100)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--color-teal-500)]"
              />
            </div>

            {error && <div className="text-sm text-[color:var(--color-red-500)]">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[color:var(--color-teal-700)] text-white text-sm font-medium hover:bg-[color:var(--color-teal-900)] transition-colors disabled:opacity-50"
            >
              {loading ? "Memproses…" : "Masuk"}
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={forgotBusy}
                className="text-xs text-[color:var(--color-teal-700)] hover:underline disabled:opacity-50"
              >
                {forgotBusy ? "Mengirim…" : "Lupa password?"}
              </button>
            </div>
            {forgotMessage && (
              <div className="text-xs text-center text-[color:var(--color-ink-700)] bg-[color:var(--color-paper)] rounded-lg p-3">
                {forgotMessage}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
