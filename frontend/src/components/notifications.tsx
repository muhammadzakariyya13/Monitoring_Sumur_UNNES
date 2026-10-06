"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, WifiOff } from "lucide-react";
import type { Snapshot } from "@/lib/data";
import { wibTime } from "@/lib/data";
import styles from "./notifications.module.css";

export function Notifications({
  data,
  onSelect,
}: {
  data: Snapshot;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = data.locations.filter(
    (w) => w.active && w.flow === null && !!w.updatedAt,
  );
  const key = (w: Snapshot["locations"][number]) => `${w.id}:${w.updatedAt}`;
  const unread = items.filter((w) => !read.includes(key(w))).length;
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
          aria-label="Notifikasi contoh"
        >
          <header>
            <div>
              <h2>Notifikasi</h2>
              <p>
                {unread ? `${unread} belum dibaca` : "Semua sudah dibaca"} ·
                Data contoh
              </p>
            </div>
            <button
              className="text-button"
              disabled={!unread}
              onClick={() => setRead(items.map(key))}
            >
              Tandai dibaca
            </button>
          </header>
          {items.length === 0 && (
            <p className={styles.empty}>Tidak ada perangkat terputus.</p>
          )}
          {items.map((w) => (
            <button
              className={`${styles.item} ${!read.includes(key(w)) ? styles.unread : ""}`}
              key={key(w)}
              onClick={() => {
                setRead((old) => [...old, key(w)]);
                setOpen(false);
                onSelect(w.id);
              }}
            >
              <WifiOff size={20} />
              <span>
                <strong>{w.name} terputus</strong>
                <span>Debit tidak tersedia. Periksa koneksi perangkat.</span>
                <small>Data terakhir: {wibTime(w.updatedAt)}</small>
              </span>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
