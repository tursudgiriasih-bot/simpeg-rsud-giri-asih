import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { initials } from "../utils/helpers";
import logoRsud from "../assets/logo-rsud.png";

const adminNav = [
  { to: "/", label: "Dashboard", icon: "grid" },
  { to: "/pegawai", label: "Data Pegawai", icon: "users" },
  { to: "/masa-berlaku", label: "Cek Masa Berlaku", icon: "clock" },
  { to: "/verifikasi", label: "Verifikasi Pendaftaran", icon: "check" },
  { to: "/kelola-data", label: "Kelola Bagian Data", icon: "sliders" },
  { to: "/laporan", label: "Laporan", icon: "file" },
];

const pegawaiNav = [
  { to: "/", label: "Beranda", icon: "grid" },
  { to: "/profil-saya", label: "Profil Saya", icon: "user" },
];

const icons = {
  grid: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
  users: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2 20a7 7 0 0 1 14 0M15 13.5a5.5 5.5 0 0 1 7 5.3",
  file: "M6 2h9l5 5v15H6V2Zm9 0v5h5",
  user: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9a8 8 0 0 1 16 0",
  check: "M5 13l4 4L19 7",
  sliders: "M4 6h16M8 6v4M4 12h16M14 12v4M4 18h16M10 18v-4",
  clock: "M12 8v4l3 3M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
};

function Icon({ name, className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={icons[name]} />
    </svg>
  );
}

export default function Layout({ children }) {
  const { profile, isAdmin, logout } = useAuth();
  const nav = isAdmin ? adminNav : pegawaiNav;
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-[color:var(--color-paper)]">
      <aside className="w-64 shrink-0 bg-[color:var(--color-teal-900)] text-white flex flex-col">
        <div className="px-6 py-6 border-b border-white/10 flex items-center gap-3">
          <img src={logoRsud} alt="Logo RSUD Giri Asih" className="w-9 h-9 object-contain shrink-0" />
          <div>
            <div className="font-display text-xl tracking-tight leading-tight">SIMPEG</div>
            <div className="text-[11px] text-teal-200/70">RSUD Giri Asih</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive ? "bg-white/10 text-white" : "text-teal-200/80 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <NavLink to="/ubah-password" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-teal-200/80 hover:bg-white/5 hover:text-white">
            Ubah Password
          </NavLink>
          <button
            onClick={async () => { await logout(); navigate("/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-teal-200/80 hover:bg-white/5 hover:text-white"
          >
            Keluar
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 bg-white border-b border-[color:var(--color-teal-100)] flex items-center justify-end px-6 gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-[color:var(--color-ink-900)]">{profile?.nama || profile?.email}</div>
            <div className="text-xs text-[color:var(--color-ink-500)]">{profile?.role === "admin" ? "Administrator TU Kepegawaian" : "Pegawai"}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-[color:var(--color-teal-100)] text-[color:var(--color-teal-700)] flex items-center justify-center text-sm font-semibold">
            {initials(profile?.nama || profile?.email)}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
