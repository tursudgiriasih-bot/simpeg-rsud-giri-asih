import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase auth user
  const [profile, setProfile] = useState(null); // { role, pegawaiId, nama, ... }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (u) {
        // onSnapshot (bukan getDoc sekali) supaya begitu Admin menyetujui
        // pendaftaran, pegawai yang sedang menunggu di layar langsung
        // ter-update tanpa perlu login ulang.
        unsubProfile = onSnapshot(doc(db, "users", u.uid), (snap) => {
          setProfile(snap.exists() ? snap.data() : null);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, isAdmin: profile?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
