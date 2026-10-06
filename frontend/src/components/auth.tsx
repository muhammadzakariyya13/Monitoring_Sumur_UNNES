"use client";
import { SplashScreen } from "./splash-screen";
import { createContext, useContext, useEffect, useState } from "react";
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
  const [demo, setDemo] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let live = true;
    let revision = 0;
    const validate = async () => {
      const current = ++revision;
      const timeout = setTimeout(() => {
        if (!live || current !== revision) return;
        revision++;
        setUser(null);
        setReady(true);
        router.replace("/login/");
      }, 8000);
      try {
        if (!supabase) {
          if (live) setReady(true);
          return;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          if (live && current === revision) {
            setUser(null);
            setReady(true);
          }
          return;
        }
        const { data, error } = await supabase.auth.getUser();
        const allowed = !error && data.user && isUnnesEmail(data.user.email);
        const access = allowed ? await supabase.rpc("is_unnes_user") : null;
        const accessRole = allowed
          ? await supabase.rpc("current_access_role")
          : null;
        if (!live || current !== revision) return;
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
          sessionStorage.setItem(
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
        if (!live || current !== revision) return;
        setUser(null);
        setReady(true);
        sessionStorage.setItem(
          "auth-message",
          "Sesi tidak dapat diverifikasi. Periksa koneksi lalu coba masuk kembali.",
        );
        router.replace("/login/");
      } finally {
        clearTimeout(timeout);
      }
    };
    // Sinkronisasi penyimpanan browser; demo hanya membuka rute /demo, bukan data backend.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDemo(sessionStorage.getItem("tirta-demo") === "true");
    void validate();
    const subscription = supabase?.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        sessionStorage.setItem(
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
  }, [router]);
  const logout = async () => {
    if (supabase && user) {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error)
        throw new Error("Gagal keluar. Periksa koneksi dan coba lagi.");
    }
    sessionStorage.removeItem("tirta-demo");
    setRole("VIEWER");
    setDemo(false);
    setUser(null);
    router.replace("/login/");
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        ready,
        demo,
        logout,
        enterDemo: () => {
          sessionStorage.setItem("tirta-demo", "true");
          setDemo(true);
          router.push("/demo/");
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function Gate({ children }: { children: React.ReactNode }) {
  const { ready, user, demo } = useAuth();
  const path = usePathname();
  const router = useRouter();
  const allowed = !!user || ((path === "/demo/" || path === "/demo") && demo);
  useEffect(() => {
    if (ready && !allowed) router.replace("/login/");
  }, [ready, allowed, router]);
  if (!ready || !allowed) return <SplashScreen message="Memverifikasi sesi" />;
  return children;
}
