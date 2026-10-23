"use client";
import Image from "next/image";
import { useUiCopy } from "./use-ui-copy";
import styles from "./splash-screen.module.css";

export function SplashScreen({ message = "Memuat aplikasi" }: { message?: string }) {
  const { uiText } = useUiCopy();
  return (
    <main className={styles.splash} aria-busy="true">
      <section className={styles.content}>
        <Image className={styles.logo} src="/logo-simar-lengkap-putih.svg" width={1339} height={1360} alt="SIMARA — Sistem Informasi Monitoring Air" priority />
        <div className={styles.loading} role="progressbar" aria-label={uiText(message)}>
          <span className={styles.progress} />
        </div>
        <noscript>{uiText("Aktifkan JavaScript untuk membuka aplikasi.")}</noscript>
      </section>
    </main>
  );
}
