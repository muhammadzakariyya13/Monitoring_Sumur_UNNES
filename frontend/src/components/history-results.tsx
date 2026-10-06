"use client";
import { useState } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Droplets,
  MapPin,
  Search,
  TrendingUp,
} from "lucide-react";
import { aggregate, number, type Reading } from "@/lib/data";
import { UsageChart } from "./usage-chart";

export function HistoryResults({
  readings,
  series,
  location,
  start,
  end,
}: {
  readings: Reading[];
  series: ReturnType<typeof aggregate>;
  location: string;
  start: string;
  end: string;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const days = aggregate(readings, "day");
  const total = readings.reduce((sum, r) => sum + r.liters, 0) / 1000;
  const peak = days.reduce<(typeof days)[number] | undefined>(
    (best, day) => (!best || day.volume > best.volume ? day : best),
    undefined,
  );
  const rows = series.filter((r) =>
    r.key.replace("T", " ").includes(search.trim()),
  );
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * 10, current * 10);
  return (
    <>
      <section className="history-kpis" aria-label="Ringkasan riwayat">
        {[
          {
            title: "Total pemakaian",
            value: readings.length ? number(total) : "—",
            unit: "m³",
            note: "Akumulasi periode terpilih",
            Icon: Droplets,
          },
          {
            title: "Rata-rata harian",
            value: days.length ? number(total / days.length) : "—",
            unit: "m³/hari",
            note: "Dari hari dengan data diterima",
            Icon: Activity,
          },
          {
            title: "Harian tertinggi",
            value: peak ? number(peak.volume) : "—",
            unit: "m³",
            note: peak ? `${peak.key} · WIB` : "Belum ada data",
            Icon: TrendingUp,
          },
          {
            title: "Titik tercatat",
            value: number(new Set(readings.map((r) => r.locationId)).size),
            unit: "titik",
            note: "Memiliki data pada periode ini",
            Icon: MapPin,
          },
        ].map(({ title, value, unit, note, Icon }) => (
          <article key={title}>
            <span className="history-kpi-icon">
              <Icon size={20} />
            </span>
            <p>{title}</p>
            <strong>
              {value} <small>{unit}</small>
            </strong>
            <small>{note}</small>
          </article>
        ))}
      </section>
      <section className="panel history-chart">
        <div className="panel-heading">
          <div>
            <h2>Tren penggunaan air</h2>
            <p>
              {start} — {end} · WIB
            </p>
          </div>
          <span className="tag">{location}</span>
        </div>
        <UsageChart data={series} />
      </section>
      <section className="panel history-records">
        <div className="panel-heading">
          <div>
            <h2>Data riwayat</h2>
            <p>Rincian volume untuk {location.toLowerCase()}.</p>
          </div>
          <span className="tag">Data contoh</span>
        </div>
        <div className="history-toolbar">
          <label>
            <Search size={17} />
            <input
              aria-label="Cari periode riwayat"
              placeholder="Cari tanggal atau jam…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <span aria-live="polite">{rows.length} periode</span>
        </div>
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabel riwayat volume"
        >
          <table>
            <caption>
              Volume sumur dan gedung tidak boleh dijumlahkan sebagai konsumsi
              bersih. Interval tanpa kiriman tidak dianggap nol. Volume
              berdasarkan data yang diterima.
            </caption>
            <thead>
              <tr>
                <th>Periode (WIB)</th>
                <th>Lokasi titik</th>
                <th>Volume (m³)</th>
                <th>Sumber</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.key}>
                  <td data-label="Periode (WIB)">
                    <strong>
                      {r.key.replace("T", " ")}
                      {r.key.length === 13 ? ":00" : ""}
                    </strong>
                  </td>
                  <td data-label="Lokasi">{location}</td>
                  <td data-label="Volume">
                    <strong>{number(r.volume, 3)} m³</strong>
                  </td>
                  <td data-label="Sumber">
                    <span className="tag">Data contoh</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && (
            <p className="empty">
              {series.length
                ? "Tidak ada periode yang cocok."
                : "Belum ada data pada rentang ini."}
            </p>
          )}
        </div>
        <div className="history-pagination">
          <span>
            {rows.length
              ? `${(current - 1) * 10 + 1}–${Math.min(current * 10, rows.length)} dari ${rows.length} periode`
              : "0 periode"}
          </span>
          <nav aria-label="Halaman riwayat">
            <button
              aria-label="Halaman sebelumnya"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              {current} / {pages}
            </span>
            <button
              aria-label="Halaman berikutnya"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </nav>
        </div>
      </section>
    </>
  );
}
