"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, WifiOff, TriangleAlert } from "lucide-react";
import type { Snapshot } from "@/lib/data";
import { getLimitAlerts } from "@/lib/usage-limits";
import { number, wibTime } from "@/lib/data";
import styles from "./notifications.module.css";

export function Notifications({
  data,
  onSelect,
  now,
}: {
  data: Snapshot;
  now?: number;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = [
    ...getLimitAlerts(data, new Date(now ?? Date.parse(data.generatedAt))).map(
      (alert) => ({
        id: alert.id,
        locationId: alert.location.id,
        limit: true,
        title: "Pemakaian melebihi batas",
        description: `${alert.location.name} melewati batas pemakaian harian.`,
        detail: `Aktual ${number(alert.usage.actual)} m\u00b3 / Batas ${number(alert.usage.limit)} m\u00b3 / Selisih +${number(alert.usage.exceededPercent)}%`,
        at: alert.at,
      }),
    ),
    ...data.locations
      .filter((w) => w.active && w.flow === null && !!w.updatedAt)
      .map((w) => ({
        id: `offline:${w.id}:${w.updatedAt}`,
        locationId: w.id,
        limit: false,
        title: `${w.name} terputus`,
        description: "Debit tidak tersedia. Periksa koneksi perangkat.",
        detail: "",
        at: w.updatedAt,
      })),
  ];
  const unread = items.filter((item) => !read.includes(item.id)).length;
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div className={styles.root} ref={container}>
      <button
        ref={trigger}
        className={`icon-button ${styles.bell}`}
        aria-label={`Notifikasi, ${unread} belum dibaca`}
        aria-expanded={open}
        aria-controls="notification-list"
        onClick={() => setOpen(!open)}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className={styles.badge} aria-hidden="true">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <section
          id="notification-list"
          className={styles.panel}
          aria-label="Daftar notifikasi"
        >
          <header>
            <div>
              <h2>Notifikasi</h2>
              <p>{unread ? `${unread} belum dibaca` : "Semua sudah dibaca"}</p>
            </div>
            <button
              className="text-button"
              disabled={!unread}
              onClick={() =>
                setRead((old) =>
                  [...new Set([...old, ...items.map((item) => item.id)])].slice(
                    -200,
                  ),
                )
              }
            >
              Tandai dibaca
            </button>
          </header>
          {items.length === 0 && (
            <p className={styles.empty}>Tidak ada peringatan.</p>
          )}
          {items.map((w) => (
            <button
              className={`${styles.item} ${!read.includes(w.id) ? styles.unread : ""}`}
              key={w.id}
              onClick={() => {
                setRead((old) => [...new Set([...old, w.id])].slice(-200));
                setOpen(false);
                onSelect(w.locationId);
              }}
            >
              {w.limit ? <TriangleAlert size={20} /> : <WifiOff size={20} />}
              <span>
                <strong>{w.title}</strong>
                <span>{w.description}</span>
                {w.detail && <span>{w.detail}</span>}
                <small>
                  {w.at && Number.isFinite(Date.parse(w.at))
                    ? `Data terakhir: ${wibTime(w.at)}`
                    : "Waktu data belum tersedia"}
                </small>
                <small>Lihat detail</small>
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
