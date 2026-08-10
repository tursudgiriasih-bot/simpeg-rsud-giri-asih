import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StatusAccount from "./pages/StatusAccount";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardPegawai from "./pages/DashboardPegawai";
import DataPegawai from "./pages/DataPegawai";
import ProfilPegawai from "./pages/ProfilPegawai";
import Laporan from "./pages/Laporan";
import UbahPassword from "./pages/UbahPassword";
import VerifikasiPendaftaran from "./pages/VerifikasiPendaftaran";
import KelolaBagianData from "./pages/KelolaBagianData";
import CekMasaBerlaku from "./pages/CekMasaBerlaku";

function HomeRoute() {
  const { profile, isAdmin } = useAuth();
  if (profile?.role === "pending" || profile?.role === "rejected") return <StatusAccount />;
  return isAdmin ? <DashboardAdmin /> : <DashboardPegawai />;
}

function ProfilSayaRedirect() {
  const { profile } = useAuth();
  if (!profile?.pegawaiId) return <div className="p-6 text-sm">Akun belum terhubung dengan data pegawai.</div>;
  return <Navigate to={`/pegawai/${profile.pegawaiId}`} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/daftar" element={<Register />} />
      <Route path="/" element={<ProtectedRoute><HomeRoute /></ProtectedRoute>} />
      <Route path="/pegawai" element={<ProtectedRoute adminOnly><DataPegawai /></ProtectedRoute>} />
      <Route path="/pegawai/:id" element={<ProtectedRoute><ProfilPegawai /></ProtectedRoute>} />
      <Route path="/profil-saya" element={<ProtectedRoute><ProfilSayaRedirect /></ProtectedRoute>} />
      <Route path="/laporan" element={<ProtectedRoute adminOnly><Laporan /></ProtectedRoute>} />
      <Route path="/verifikasi" element={<ProtectedRoute adminOnly><VerifikasiPendaftaran /></ProtectedRoute>} />
      <Route path="/kelola-data" element={<ProtectedRoute adminOnly><KelolaBagianData /></ProtectedRoute>} />
      <Route path="/masa-berlaku" element={<ProtectedRoute adminOnly><CekMasaBerlaku /></ProtectedRoute>} />
      <Route path="/ubah-password" element={<ProtectedRoute><UbahPassword /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
