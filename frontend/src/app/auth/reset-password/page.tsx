"use client";
import { useEffect, useState } from "react";
import { isUnnesEmail, supabase } from "@/lib/supabase";
import styles from "../../login/login.module.css";
let recovery: Promise<void> | undefined;
async function verifyRecovery() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  history.replaceState({}, "", "/auth/reset-password/");
  if (!supabase || !code || params.has("error")) throw new Error("Tautan reset tidak lengkap. Minta tautan baru dari halaman login.");
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw new Error("Tautan reset kedaluwarsa atau dibuka di browser berbeda. Minta tautan baru.");
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !isUnnesEmail(data.user?.email) || !data.user?.email_confirmed_at) throw new Error("Akun UNNES belum terverifikasi.");
}
export default function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    recovery ??= verifyRecovery();
    recovery.then(() => { if (active) setReady(true); }).catch((error: Error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || !supabase) return;
    if (password !== confirm) { setMessage("Konfirmasi password tidak cocok."); return; }
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(""); setConfirm(""); setDone(true);
      setMessage("Password berhasil diperbarui.");
    } catch { setMessage("Password belum dapat diperbarui. Periksa kebijakan sandi dan coba lagi."); }
    finally { setBusy(false); }
  }
  return <main className={styles.page}><section className={styles.panel}><div className={styles.content}>
    <div className={styles.heading}><h1>Reset password</h1><p>Gunakan password baru minimal 12 karakter.</p></div>
    {!ready && !message && <p role="status">Memverifikasi tautan…</p>}
    {ready && !done && <form className={styles.form} onSubmit={save}>
      <label htmlFor="new-password">Password baru</label><input id="new-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} />
      <label htmlFor="confirm-password">Konfirmasi password</label><input id="confirm-password" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e => setConfirm(e.target.value)} />
      <button className="primary" disabled={busy}>{busy ? "Menyimpan…" : "Simpan password"}</button>
    </form>}
    {message && <p className="notice" role={done ? "status" : "alert"}>{message}</p>}
    <a className={styles.demo} href="/login/">Kembali ke login</a>
  </div></section></main>;
}
