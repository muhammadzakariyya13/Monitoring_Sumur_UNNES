"use client";
import { useEffect, useRef, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { createReport, type ReportInput } from "@/lib/history-report";
import styles from "./report-download.module.css";
export function ReportDownload({
  input,
  disabled,
}: {
  input: ReportInput;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  async function download(format: "xlsx" | "pdf" | "csv") {
    setOpen(false);
    setBusy(true);
    setError("");
    try {
      const report = createReport(input);
      const { reportFile } = await import("@/lib/report-files");
      const blob = await reportFile(report, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.filename}.${format}`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError("Laporan gagal dibuat. Silakan coba lagi.");
    } finally {
      setBusy(false);
      trigger.current?.focus();
    }
  }
  return (
    <div
      className={styles.root}
      ref={root}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={trigger}
        className="secondary"
        aria-expanded={open}
        aria-controls="report-formats"
        aria-label="Unduh Laporan"
        disabled={disabled || busy}
        onClick={() => setOpen(!open)}
      >
        {busy ? (
          <LoaderCircle size={17} className="spin" aria-hidden="true" />
        ) : (
          <Download size={17} aria-hidden="true" />
        )}
        <span>{busy ? "Menyiapkan..." : "Unduh Laporan"}</span>
      </button>
      {open && (
        <div
          id="report-formats"
          className={styles.options}
          role="group"
          aria-label="Format laporan"
        >
          {(
            [
              ["xlsx", "Excel (.xlsx)"],
              ["pdf", "PDF (.pdf)"],
              ["csv", "CSV (.csv) - Data mentah"],
            ] as const
          ).map(([format, label]) => (
            <button
              key={format}
              type="button"
              onClick={() => void download(format)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {busy && (
        <span role="status" className={styles.status}>
          Membuat laporan...
        </span>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
