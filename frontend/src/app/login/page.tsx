"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth";
import { isUnnesEmail, supabase } from "@/lib/supabase";
import styles from "./login.module.css";
export default function Login() {
  const { user, ready, enterDemo } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [reset, setReset] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!isUnnesEmail(email.trim())) { setMessage("Gunakan alamat email @unnes.id."); return; }
    if (!supabase) { setMessage("Login kampus belum dikonfigurasi. Hubungi pengelola."); return; }
    setBusy(true);
    try {
      if (reset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/auth/reset-password/` });
        if (error) throw error;
        setMessage("Jika akun terdaftar, tautan reset sandi dikirim ke email Anda. Buka melalui browser yang sama.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        // AuthProvider memverifikasi pengguna dan RPC akses sebelum membuka dashboard.
        setPassword("");
        setMessage("Memverifikasi akses akun…");
      }
    } catch {
      setMessage(reset ? "Tautan belum dapat dikirim. Periksa koneksi atau coba lagi nanti." : "Gagal masuk. Periksa email, sandi, dan verifikasi akun Anda.");
    } finally { setBusy(false); }
  }
  // Sinkronisasi pesan dari sessionStorage setelah hydration; tidak tersedia saat static build.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage(sessionStorage.getItem("auth-message") ?? "");
    sessionStorage.removeItem("auth-message");
  }, []);
  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);
  async function login() {
    if (!supabase) {
      setMessage(
        "Login kampus belum dikonfigurasi. Gunakan pratinjau untuk melihat data contoh.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${location.origin}/auth/callback/`,
          queryParams: { hd: "unnes.id", prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch {
      setMessage("Gagal memulai login. Periksa koneksi dan coba lagi.");
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <section className={styles.layout}>
        <aside className={styles.brand}>
          <div><strong>TIRTA UNNES</strong><span className={styles.accent} /></div>
          <div className={styles.story}>
            <h1>Monitoring air kampus dalam satu sistem.</h1>
            <p>Pantau penggunaan air dan riwayat pemakaian melalui TIRTA UNNES.</p>
          </div>
          <small>Universitas Negeri Semarang</small>
        </aside>
        <header className={styles.mobile}>
          <strong>TIRTA UNNES</strong>
          <span className={styles.accent} />
          <p>MONITORING AIR KAMPUS</p>
        </header>
        <section className={styles.panel}>
          <div className={styles.content}>
            <div className={styles.heading}>
              <h2>{reset ? "Lupa sandi" : "Selamat datang"}</h2>
              <p>{reset ? "Masukkan email UNNES untuk menerima tautan reset." : "Masuk menggunakan akun UNNES Anda."}</p>
            </div>
            <form className={styles.form} onSubmit={submit}>
              <label htmlFor="email">Email UNNES</label>
              <input id="email" type="email" autoComplete="username" placeholder="nama@unnes.id" required value={email} onChange={e => setEmail(e.target.value)} />
              {!reset && <>
                <div className={styles.labelRow}><label htmlFor="password">Password</label><button type="button" className={styles.link} disabled={busy} onClick={() => { setReset(true); setMessage(""); setPassword(""); }}>Lupa sandi?</button></div>
                <div className={styles.password}>
                  <input id="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Masukkan password" required value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" aria-label={visible ? "Sembunyikan password" : "Tampilkan password"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                </div>
              </>}
              <button className="primary" disabled={busy}>{busy ? "Memproses…" : reset ? "Kirim tautan reset" : "Masuk"}</button>
              {reset && <button type="button" className={styles.link} disabled={busy} onClick={() => { setReset(false); setMessage(""); }}>Kembali ke login</button>}
            </form>
            <div className={styles.separator}>atau masuk dengan</div>
            <button className={styles.google} type="button" onClick={login} disabled={busy}>
              <svg
              className={styles.googleLogo}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="#4285F4"
                d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
              />
              <path
                fill="#34A853"
                d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.97-3.38.97-2.61 0-4.83-1.77-5.62-4.15H3.04v2.59A10 10 0 0 0 12 22Z"
              />
              <path
                fill="#FBBC05"
                d="M6.38 13.89a6 6 0 0 1 0-3.78V7.52H3.04a10 10 0 0 0 0 8.96l3.34-2.59Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.52l3.34 2.59C7.17 7.73 9.39 5.96 12 5.96Z"
              />
            </svg>
              {busy ? "Menghubungkan…" : "Masuk dengan Google UNNES"}
            </button>
            <button className={styles.demo} type="button" onClick={enterDemo}>
              Lihat pratinjau <ArrowRight size={14} aria-hidden="true" />
            </button>
            {message && <p className="notice" role="alert">{message}</p>}
          </div>
        </section>
      </section>
    </main>
  );
}
