"use client";

import { useState } from "react";
import { useMapSheet } from "./use-map-sheet";
import dynamic from "next/dynamic";
import {
  Building2,
  ChevronUp,
  Droplets,
  MapPin,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react";
import { number, type Reading, type MonitoringLocation } from "@/lib/data";
import styles from "./map-explorer.module.css";

const WellMap = dynamic(() => import("./well-map"), {
  ssr: false,
  loading: () => <div className="empty">Memuat peta…</div>,
});

export function MapExplorer({
  wells,
  daily,
  selected,
  onSelect,
}: {
  wells: MonitoringLocation[];
  daily: Reading[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const {
    containerRef,
    style: sheetStyle,
    stop: sheetStop,
    handlers: sheetHandlers,
    toggle: toggleSheet,
    expand: expandSheet,
  } = useMapSheet();
  const expanded = sheetStop === 2;
  const [showFilters, setShowFilters] = useState(false);
  const online = wells.filter((w) => w.active && w.flow !== null).length;
  const visible = wells.filter(
    (w) =>
      `${w.name} ${w.code} ${w.area}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (status === "all" || w.type === status),
  );
  return (
    <section
      ref={containerRef}
      style={sheetStyle}
      className={`${styles.explorer} ${expanded ? styles.expanded : ""} ${sheetStop === 0 ? styles.collapsed : ""}`}
      aria-label="Peta titik monitoring"
    >
      <div className={styles.heading}>
        <h2>Persebaran titik monitoring</h2>
        <p>
          Pilih titik pada peta atau daftar untuk melihat informasi monitoring
          terbaru.
        </p>
      </div>
      <div className={styles.summary}>
        {[
          {
            label: "Total titik",
            value: wells.length,
            Icon: MapPin,
            tone: "total",
          },
          { label: "Terhubung", value: online, Icon: Wifi, tone: "online" },
          {
            label: "Rencana",
            value: wells.filter((w) => !w.active).length,
            Icon: WifiOff,
            tone: "offline",
          },
        ].map(({ label, value, Icon, tone }) => (
          <article className={styles.summaryCard} key={label}>
            <span className={`${styles.icon} ${styles[tone]}`}>
              <Icon size={21} />
            </span>
            <div>
              <p>{label}</p>
              <strong>
                {value} <small>titik</small>
              </strong>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.app}>
        <section
          className={styles.listPanel}
          aria-label="Daftar titik monitoring"
        >
          <button
            {...sheetHandlers}
            className={styles.sheetHandle}
            aria-label={
              expanded ? "Kecilkan daftar titik" : "Perluas daftar titik"
            }
            aria-expanded={expanded}
            onClick={toggleSheet}
          >
            <span />
          </button>
          <div className={styles.listHeader}>
            <div className={styles.sheetActions}>
              <button
                aria-label="Cari dan filter titik"
                aria-expanded={showFilters}
                aria-controls="map-search-filters"
                onClick={() => {
                  setShowFilters(!showFilters);
                  if (!showFilters) expandSheet();
                }}
              >
                <Search size={19} />
              </button>
              <button
                aria-label={expanded ? "Kecilkan panel" : "Perluas panel"}
                aria-expanded={expanded}
                onClick={toggleSheet}
              >
                <ChevronUp
                  size={19}
                  className={expanded ? styles.chevronDown : ""}
                />
              </button>
            </div>
            <div {...sheetHandlers} className={styles.sheetTitle}>
              <h3>Titik monitoring</h3>
              <p aria-live="polite">
                Menampilkan {visible.length} dari {wells.length} titik
              </p>
            </div>
            <div
              id="map-search-filters"
              className={`${styles.tools} ${showFilters ? styles.toolsOpen : ""}`}
            >
              <label className={styles.search}>
                <Search size={18} aria-hidden="true" />
                <input
                  aria-label="Cari titik"
                  placeholder="Cari nama, kode, atau lokasi…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <div className={styles.filters} aria-label="Filter koneksi">
                {[
                  ["all", "Semua"],
                  ["WELL", "Sumur"],
                  ["BUILDING", "Gedung"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={status === value}
                    onClick={() => setStatus(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.locations}>
            {visible.length === 0 && (
              <p className="empty">Tidak ada titik yang cocok.</p>
            )}
            {visible.map((w) => (
              <button
                className={styles.location}
                key={w.code}
                onClick={() => onSelect(w.id)}
              >
                <span className={styles.locationTop}>
                  <span
                    className={`${styles.wellAvatar} ${w.flow === null ? styles.offline : styles.online}`}
                  >
                    {w.type === "BUILDING" ? (
                      <Building2 size={19} />
                    ) : (
                      <Droplets size={19} />
                    )}
                  </span>
                  <span>
                    <strong>{w.name}</strong>
                    <small>
                      {w.code} · {w.area}
                    </small>
                  </span>
                  <span
                    className={`${styles.dot} ${w.flow === null ? styles.offline : styles.online}`}
                  />
                </span>
                <span className={styles.metrics}>
                  <span>
                    <small>Debit saat ini</small>
                    <strong>
                      {w.flow === null ? "—" : number(w.flow)}{" "}
                      <small>L/menit</small>
                    </strong>
                  </span>
                  <span>
                    <small>Pemakaian hari ini</small>
                    <strong>
                      {daily.some((r) => r.locationId === w.id) ? number(
                        daily
                          .filter((r) => r.locationId === w.id)
                          .reduce((sum, r) => sum + r.liters, 0) / 1000,
                      ) : "Belum ada data"}{" "}
                      <small>m³</small>
                    </strong>
                  </span>
                </span>
                <span className={styles.locationFooter}>
                  <span>
                    {!w.active
                      ? "Direncanakan"
                      : !w.updatedAt
                        ? "Belum ada data"
                        : w.flow === null
                          ? "Terputus"
                          : "Terhubung"}
                  </span>
                  <span>Lihat detail →</span>
                </span>
              </button>
            ))}
          </div>
          <p className={styles.note}>
            <Droplets size={16} /> Status koneksi perangkat, bukan kualitas air.
          </p>
        </section>
        <div className={styles.mapArea}>
          <WellMap wells={visible} selected={selected} onSelect={onSelect} />
          <div className={styles.legend} aria-label="Legenda koneksi">
            <span>
              <i className={`${styles.dot} ${styles.online}`} />
              Sumur ? bulat
            </span>
            <span>
              <i className={`${styles.dot} ${styles.offline}`} />
              Gedung ? kotak
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
