import styles from "./splash-screen.module.css";

export function SplashScreen({ message = "Memuat aplikasi" }: { message?: string }) {
  return (
    <main className={styles.splash} aria-busy="true">
      <section className={styles.content}>
        <h1 className={styles.title}>TIRTA</h1>
        <div className={styles.unnes}>UNNES</div>
        <div className={styles.line} aria-hidden="true" />
        <p className={styles.subtitle}>Monitoring Air Kampus</p>
        <div className={styles.loading} role="progressbar" aria-label={message}>
          <span className={styles.progress} />
        </div>
        <noscript>Aktifkan JavaScript untuk membuka aplikasi.</noscript>
      </section>
    </main>
  );
}
