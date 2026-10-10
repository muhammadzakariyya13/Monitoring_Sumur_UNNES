"use client";
import { SplashScreen } from "./splash-screen";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { usePathname, useRouter } from "next/navigation";
import { Droplets } from "lucide-react";
import { domainMessage, isUnnesEmail, supabase } from "@/lib/supabase";
type AuthState = {
  user: User | null;
  role: "VIEWER" | "ADMIN";
  ready: boolean;
  demo: boolean;
  enterDemo: () => void;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState>({
  user: null,
  role: "VIEWER",
  ready: false,
  demo: false,
  enterDemo: () => {},
  logout: async () => {},
});
export const useAuth = () => useContext(AuthContext);
// Penyimpanan hanya untuk pesan/preferensi, bukan syarat akses demo publik.
function storeSession(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Browser dapat menolak storage; pratinjau tetap tersedia.
  }
}
export function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Droplets size={26} />
      </span>
      <div>
        TIRTA <strong>UNNES</strong>
        <small>MONITORING AIR KAMPUS</small>
      </div>
    </div>
  );
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"VIEWER" | "ADMIN">("VIEWER");
  const [ready, setReady] = useState(false);
  const path = usePathname();
  const demo = path === "/demo" || path === "/demo/" || path === "/demo/admin" || path === "/demo/admin/";
  const enteringDemo = useRef(false);
  const router = useRouter();
  useEffect(() => {
    enteringDemo.current = demo;
    // Validasi ulang saat meninggalkan demo sebelum membuka data privat.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
    if (demo) {
      setUser(null);
      setRole("VIEWER");
      return;
    }
    let live = true;
    let revision = 0;
    const isCurrent = (current: number) =>
      live && !enteringDemo.current && current === revision;
    const validate = async () => {
      if (!live || enteringDemo.current) return;
      const current = ++revision;
      const timeout = setTimeout(() => {
        if (!isCurrent(current)) return;
        revision++;
        setUser(null);
        setReady(true);
        router.replace("/login/");
      }, 8000);
      try {
        if (!supabase) {
          if (isCurrent(current)) setReady(true);
          return;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isCurrent(current)) return;
        if (!session) {
          if (isCurrent(current)) {
            setUser(null);
            setReady(true);
          }
          return;
        }
        const { data, error } = await supabase.auth.getUser();
        if (!isCurrent(current)) return;
        const allowed = !error && data.user && isUnnesEmail(data.user.email);
        const access = allowed ? await supabase.rpc("is_unnes_user") : null;
        if (!isCurrent(current)) return;
        const accessRole = allowed
          ? await supabase.rpc("current_access_role")
          : null;
        if (!isCurrent(current)) return;
        if (
          !allowed ||
          access?.error ||
          access?.data !== true ||
          accessRole?.error ||
          !accessRole?.data
        ) {
          setUser(null);
          setReady(true);
          await supabase.auth.signOut({ scope: "local" });
          if (!isCurrent(current)) return;
          storeSession(
            "auth-message",
            error
              ? "Sesi tidak dapat diverifikasi. Silakan masuk kembali."
              : access?.error
                ? "Konfigurasi akses Supabase belum siap atau jaringan bermasalah. Hubungi pengelola."
                : domainMessage,
          );
          router.replace("/login/");
        } else {
          setRole(accessRole?.data === "ADMIN" ? "ADMIN" : "VIEWER");
          setUser(data.user);
          setReady(true);
        }
      } catch {
        if (!isCurrent(current)) return;
        setUser(null);
        setReady(true);
        storeSession(
          "auth-message",
          "Sesi tidak dapat diverifikasi. Periksa koneksi lalu coba masuk kembali.",
        );
        router.replace("/login/");
      } finally {
        clearTimeout(timeout);
      }
    };
    void validate();
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (!live || enteringDemo.current) return;
      if (event === "SIGNED_OUT") {
        setUser(null);
        storeSession(
          "auth-message",
          "Sesi berakhir. Silakan masuk kembali.",
        );
      }
      setTimeout(() => {
        if (live) void validate();
      }, 0);
    });
    const interval = setInterval(() => {
      void validate();
    }, 60000);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      live = false;
      clearInterval(interval);
      subscription?.data.subscription.unsubscribe();
    };
  }, [router, demo]);
  const logout = async () => {
    if (!demo && supabase && user) {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error)
        throw new Error("Gagal keluar. Periksa koneksi dan coba lagi.");
    }
    storeSession("tirta-demo", null);
    setRole("VIEWER");
    setUser(null);
    router.replace("/login/");
  };
  return (
    <AuthContext.Provider
      value={{
        user: demo ? null : user,
        role: demo ? "VIEWER" : role,
        ready: demo || ready,
        demo,
        logout,
        enterDemo: () => {
          enteringDemo.current = true;
          storeSession("tirta-demo", "true");
          router.push("/demo/");
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function Gate({ children }: { children: React.ReactNode }) {
  const { ready, user, demo, role } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const adminRoute = path === "/admin" || path === "/admin/";
  const allowed = adminRoute ? !!user && role === "ADMIN" : !!user || (demo && (path === "/demo/" || path === "/demo"));
  useEffect(() => {
    if (ready && !allowed) router.replace(user ? "/" : "/login/");
  }, [ready, allowed, router, user]);
  if (!ready || !allowed) return <SplashScreen message="Memverifikasi sesi" />;
  return children;
}
