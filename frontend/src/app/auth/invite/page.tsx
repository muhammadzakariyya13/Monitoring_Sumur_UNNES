"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { isUnnesEmail, supabase } from "@/lib/supabase";
import styles from "../../login/login.module.css";

export default function AcceptInvite() {
  const token = useRef("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  useEffect(() => {
    // The fragment stays out of hosting logs; explicit acceptance avoids email scanners.
    token.current ||=
      new URLSearchParams(location.hash.slice(1)).get("token_hash") ?? "";
    history.replaceState({}, "", "/auth/invite/");
  }, []);
  async function accept() {
    if (!supabase || !token.current) {
      setMessage(
        "Tautan undangan tidak lengkap. Buka kembali tautan dari email atau hubungi Admin.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token.current,
        type: "invite",
      });
      if (
        error ||
        !isUnnesEmail(data.user?.email) ||
        !data.user?.email_confirmed_at
      )
        throw new Error();
      token.current = "";
      setReady(true);
    } catch {
      setMessage(
        "Undangan tidak valid, kedaluwarsa, atau akses dinonaktifkan. Hubungi Admin untuk memeriksa akun.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !ready || busy) return;
    if (password !== confirm) {
      setMessage("Konfirmasi password tidak cocok.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      setDone(true);
    } catch {
      setMessage(
        "Password belum tersimpan. Periksa kebijakan sandi dan coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.content}>
          <div className={styles.heading}>
            <h1>Undangan TIRTA UNNES</h1>
            <p>
              {done
                ? "Password tersimpan. Akun Anda siap digunakan."
                : "Terima undangan lalu buat password minimal 12 karakter."}
            </p>
          </div>
          {!ready && (
            <button
              className="primary"
              disabled={busy}
              onClick={() => void accept()}
            >
              {busy ? "Memverifikasi..." : "Terima undangan"}
            </button>
          )}
          {ready && !done && (
            <form className={styles.form} onSubmit={save}>
              <label htmlFor="invite-password">Password baru</label>
              <input
                id="invite-password"
                required
                minLength={12}
                autoComplete="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="invite-confirm">Konfirmasi password</label>
              <input
                id="invite-confirm"
                required
                minLength={12}
                autoComplete="new-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <button className="primary" disabled={busy}>
                {busy ? "Menyimpan..." : "Simpan password"}
              </button>
            </form>
          )}
          {message && (
            <p className="notice" role="alert">
              {message}
            </p>
          )}
          <a className={styles.demo} href={done ? "/" : "/login/"}>
            {done ? "Buka aplikasi" : "Kembali ke login"}
          </a>
        </div>
      </section>
    </main>
  );
}
