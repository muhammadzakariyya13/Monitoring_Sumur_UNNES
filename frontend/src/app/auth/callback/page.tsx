"use client";
import { useEffect, useState } from "react";
import { Brand } from "@/components/auth";
import { domainMessage, supabase } from "@/lib/supabase";
let exchange: Promise<unknown> | undefined;
export default function Callback() {
  const [error, setError] = useState("");
  useEffect(() => {
    async function complete() {
      const params = new URLSearchParams(location.search);
      const failure = params.get("error");
      const description = params.get("error_description") ?? "";
      const code = params.get("code");
      history.replaceState({}, "", "/auth/callback/");
      if (failure)
        throw new Error(
          description.includes("@unnes.id")
            ? domainMessage
            : failure === "access_denied"
              ? "Login dibatalkan atau akses ditolak. Silakan coba kembali."
              : "Login gagal. Silakan coba kembali.",
        );
      if (!code || !supabase)
        throw new Error(
          "Callback tidak lengkap. Mulai login kembali dari browser yang sama.",
        );
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error)
        throw new Error(
          "Tautan login kedaluwarsa atau tidak valid. Silakan masuk kembali.",
        );
      location.replace("/");
    }
    exchange ??= complete();
    exchange.catch((e: Error) => setError(e.message));
  }, []);
  return (
    <main className="splash">
      <Brand />
      <h1>{error ? "Belum berhasil masuk" : "Memverifikasi akun…"}</h1>
      {error && (
        <>
          <p role="alert">{error}</p>
          <a className="primary" href="/login/">
            Kembali ke login
          </a>
        </>
      )}
    </main>
  );
}
