import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[color:var(--color-paper)]">
        <div className="text-[color:var(--color-teal-700)] font-mono-data text-sm">Memuat…</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (profile?.role === "pending" || profile?.role === "rejected") {
    return window.location.pathname === "/" ? children : <Navigate to="/" replace />;
  }
  if (adminOnly && profile?.role !== "admin") return <Navigate to="/" replace />;

  return children;
}
