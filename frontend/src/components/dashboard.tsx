"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Building2,
  SlidersHorizontal,
  Users,
  Activity,
  RotateCcw,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Droplets,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  UserRound,
  Wifi,
  X,
} from "lucide-react";
import { Brand, useAuth } from "./auth";
import { SplashScreen } from "./splash-screen";
import { UsageChart } from "./usage-chart";
import { Notifications } from "./notifications";
import { MapExplorer } from "./map-explorer";
import { UsageLimit } from "./usage-limit";
import { getDailyUsage, getUsageLimitStatus } from "@/lib/usage-limits";
import { BuildingUsage } from "./building-usage";
import { ReportDownload } from "./report-download";
import { HistoryResults } from "./history-results";
import { monitoringRepository } from "@/lib/monitoring-repository";
import { AdminView } from "./admin-view";
import { CustomSelect } from "./custom-select";
import { MobileBackButton } from "./mobile-back-button";
import { ProfileView } from "./profile-view";
import "./history.css";
import { useMapSheet } from "./use-map-sheet";
import {
  aggregate,
  number,
  selectReadings,
  wibDate,
  wibTime,
  type Snapshot,
} from "@/lib/data";
const WellMap = dynamic(() => import("./well-map"), {
  ssr: false,
  loading: () => <div className="empty">Memuat peta…</div>,
});
type Tab = "dashboard" | "map" | "history" | "profile" | "locations" | "users" | "manage";
const tabs = [
  { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
  { id: "map", label: "Peta", icon: MapPin },
  { id: "history", label: "Riwayat", icon: CalendarDays },
  { id: "profile", label: "Profil", icon: UserRound },
] as const;
export default function Dashboard({ adminPreview = false }: { adminPreview?: boolean }) {
  const { user, role: accountRole, demo: sessionDemo } = useAuth();
  // Preview changes navigation only; AuthContext and server authorization stay unchanged.
  const role = adminPreview ? "ADMIN" : accountRole;
  const demo = adminPreview || sessionDemo;
  const [tab, setTab] = useState<Tab>("dashboard");
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const {
    containerRef: detailContainerRef,
    style: detailStyle,
    stop: detailStop,
    handlers: detailHandlers,
    toggle: toggleDetail,
    reset: resetDetail,
  } = useMapSheet(60, 88);
  const [period, setPeriod] = useState("Harian");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [filter, setFilter] = useState("all");
  const [kind, setKind] = useState("all");
  const [detailPeriod, setDetailPeriod] = useState("hour");
  const [refreshing, setRefreshing] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!selected) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function trap(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const targets = dialog.current?.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, [tabindex="0"]',
      );
      if (!targets?.length) return;
      const first = targets[0],
        last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [selected]);
  async function refresh() {
    setRefreshing(true);
    try {
      const incoming = await monitoringRepository.load(demo);
      setData(old => adminPreview && old ? { ...incoming, locations: old.locations.map(w => {
        const fresh = incoming.locations.find(item => item.id === w.id);
        return { ...w, flow: fresh?.flow ?? w.flow, updatedAt: fresh?.updatedAt ?? w.updatedAt };
      }) } : incoming);
      setError("");
    } catch {
      setError("Data gagal dimuat. Coba muat ulang.");
    } finally {
      setRefreshing(false);
    }
  }
  useEffect(() => {
    monitoringRepository
      .load(demo)
      .then(setData)
      .catch(() => setError("Data gagal dimuat."));
  }, [demo]);
  if (!data && !error) return <SplashScreen message="Menyiapkan data contoh" />;
  if (!data)
    return (
      <main className="splash">
        <Brand />
        <p>{error || "Menyiapkan data contoh…"}</p>
        {error && <button onClick={refresh}>Coba lagi</button>}
      </main>
    );
  const today = wibDate(new Date(clock));
  const daily = selectReadings(data.readings, today, today);
  const buildingIds = new Set(
    data.locations
      .filter((w) => w.type === "BUILDING" && w.active)
      .map((w) => w.id),
  );
  const buildingDaily = daily.filter((r) => buildingIds.has(r.locationId));
  const total = buildingDaily.reduce((s, r) => s + r.liters, 0) / 1000;
  const well = data.locations.find((w) => w.id === selected);
  const wellDaily = daily.filter((r) => r.locationId === selected);
  const exceededBuildings = data.locations.filter(w => w.type === "BUILDING" && w.active && getUsageLimitStatus(getDailyUsage(data, w.id, new Date(clock)).actual, w.dailyUsageLimit).status === "LIMIT_EXCEEDED").length;
  const activeLocations = data.locations.filter((w) => w.active);
  const online = activeLocations.filter((w) => w.flow !== null).length;
  const offline = activeLocations.filter(
    (w) => w.flow === null && w.updatedAt,
  ).length;
  const visible = data.locations;
  const rangeStart = start || today;
  const rangeEnd = end || today;
  const invalid = rangeStart > rangeEnd;
  const history = invalid
    ? []
    : selectReadings(data.readings, rangeStart, rangeEnd, filter).filter(
        (r) =>
          kind === "all" ||
          data.locations.find((w) => w.id === r.locationId)?.type === kind,
      );
  const series = aggregate(
    history,
    rangeStart === rangeEnd ? "hour" : period === "Tahunan" ? "month" : "day",
  );
  function changePeriod(value: string) {
    setPeriod(value);
    const date = new Date(`${today}T00:00:00+07:00`);
    let from = today;
    if (value === "Mingguan") {
      const day = new Date(date.getTime() + 7 * 3600000).getUTCDay();
      from = wibDate(new Date(date.getTime() - ((day + 6) % 7) * 86400000));
    }
    if (value === "Bulanan") from = today.slice(0, 7) + "-01";
    if (value === "Tahunan") from = today.slice(0, 4) + "-01-01";
    setStart(from);
    setEnd(today);
  }
  const selectWell = (id: string) => {
    resetDetail();
    setDetailPeriod("hour");
    setTab("map");
    setSelected(id);
  };
  const managementActive = tab === "manage" || tab === "locations" || tab === "users";
  const mobileTabs = role === "ADMIN" ? [tabs[0], tabs[1], { id: "manage" as const, label: "Kelola", icon: SlidersHorizontal }, tabs[2], tabs[3]] : tabs;
  const navigation = (includeProfile = true, mobile = false) => (
    <>
      {(mobile ? mobileTabs : tabs)
        .filter((t) => includeProfile || t.id !== "profile")
        .map((t) => (
          <button
            key={t.id}
            className={(tab === t.id || (t.id === "manage" && managementActive)) ? "nav-item active" : "nav-item"}
            onClick={() => {
              setTab(t.id);
              setSelected("");
            }}
            aria-current={(tab === t.id || (t.id === "manage" && managementActive)) ? "page" : undefined}
          >
            <t.icon size={20} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
    </>
  );
  const wellList = (
    <div className="well-list">
      {visible.length === 0 && (
        <p className="empty">Tidak ada titik yang cocok.</p>
      )}
      {visible.map((w) => (
        <button
          className={`well-row ${selected === w.id ? "selected" : ""}`}
          key={w.code}
          onClick={() => selectWell(w.id)}
        >
          <span className={`well-icon ${w.flow === null ? "amber" : ""}`}>
            {w.type === "BUILDING" ? (
              <Building2 size={22} />
            ) : (
              <Droplets size={22} />
            )}
          </span>
          <span className="well-name">
            <strong>{w.name}</strong>
            <small>
              {w.type === "BUILDING" ? "Gedung" : "Sumur"} - {w.area}
              {w.type === "BUILDING"
                ? ` - Jumlah pegawai: ${w.occupants ?? "Belum tersedia"}`
                : ""}
            </small>
          </span>
          <span className="well-value">
            <strong>
              {daily.some((r) => r.locationId === w.id) ? number(
                daily
                  .filter((r) => r.locationId === w.id)
                  .reduce((s, r) => s + r.liters, 0) / 1000,
              ) : "Belum ada data"}{" "}
              <small>m³</small>
            </strong>
            <small className={w.flow === null ? "text-amber" : "text-green"}>
              ●{" "}
              {!w.active
                ? "Direncanakan"
                : !w.updatedAt
                  ? "Belum ada data"
                  : w.flow === null
                    ? "Terputus"
                    : "Terhubung"}
            </small>
          </span>
          <ChevronRight size={17} />
        </button>
      ))}
    </div>
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />

        <nav>
          {role === "ADMIN" && <small>MONITORING</small>}
          {navigation(false)}
          {role === "ADMIN" && (
            <>
              <small>PENGELOLAAN</small>
              <button
                className={`nav-item ${tab === "locations" ? "active" : ""}`}
                onClick={() => setTab("locations")}
              >
                <MapPin size={20} />
                Kelola Titik Monitoring
              </button>
              <button
                className={`nav-item ${tab === "users" ? "active" : ""}`}
                onClick={() => setTab("users")}
              >
                <UserRound size={20} />
                Pengguna
              </button>
            </>
          )}
        </nav>

        <button
          type="button"
          className="sidebar-footer"
          aria-label="Profil"
          aria-current={tab === "profile" ? "page" : undefined}
          onClick={() => {
            setTab("profile");
            setSelected("");
          }}
        >
          <span className="avatar">
            {user ? (user.email?.[0] ?? "U").toUpperCase() : "D"}
          </span>
          <span className="sidebar-account-text">
            <strong>{user?.user_metadata?.full_name || user?.email || (adminPreview ? "Admin Dummy" : "Pengunjung")}</strong>
            <small>{user ? (role === "ADMIN" ? "Admin" : "Viewer") : "Akses pratinjau"}</small>
          </span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </aside>
      <div className={`app-main ${tab === "map" ? "map-mode" : ""}`}>
        <header className={`topbar${role === "ADMIN" && (tab === "locations" || tab === "users") ? " admin-child-header" : ""}`}>
          {role === "ADMIN" && (tab === "locations" || tab === "users") && <MobileBackButton onClick={() => setTab("manage")} />}
          <div>
            <h1>
              {tab === "dashboard"
                ? "Dashboard"
                : tab === "map"
                  ? "Peta monitoring"
                  : tab === "history"
                    ? "Riwayat"
                    : tab === "manage"
                      ? "Kelola"
                    : tab === "locations"
                      ? "Kelola Titik Monitoring"
                      : tab === "users"
                        ? "Pengguna"
                        : "Profil"}
            </h1>
            <time dateTime={today}>
              {new Date(data.generatedAt).toLocaleDateString("id-ID", {
                timeZone: "Asia/Jakarta",
                day: "numeric",
                month: "short",
              })}
            </time>
          </div>
          <div className="top-actions">
            <button
              className="icon-button"
              aria-label="Perbarui data contoh"
              onClick={refresh}
              disabled={refreshing}
            >
              <RefreshCw size={20} className={refreshing ? "spin" : ""} />
            </button>
            <Notifications data={data} onSelect={selectWell} now={clock} />
          </div>
        </header>
        <main className={`content${tab === "history" ? " history-content" : ""}`}>
          {adminPreview && tab !== "history" && <details className="admin-preview-note"><summary>Pratinjau - Data contoh</summary><p>Data simulasi, bukan data resmi UNNES. Perubahan hanya untuk sesi ini dan direset saat halaman dimuat ulang.</p></details>}
          {tab !== "users" && !(role === "ADMIN" && (tab === "profile" || managementActive)) && <div className="data-context">
            <div className="data-meta">
              <details className="simulation-info">
                <summary>
                  {demo
                    ? "Data contoh - belum terhubung perangkat"
                    : "Menunggu integrasi perangkat"}
                </summary>
                <p>
                  Angka dan koordinat adalah contoh, bukan data sumur asli
                  UNNES. Pembaruan dilakukan manual.{tab === "history" && " Data contoh tersedia hingga 730 hari terakhir."}
                </p>
              </details>
              <p role="status">
                Diperbarui{" "}
                {new Date(data.generatedAt).toLocaleTimeString("id-ID", {
                  timeZone: "Asia/Jakarta",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                WIB
              </p>
            </div>
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            {clock - Date.parse(data.generatedAt) > 15 * 60000 && (
              <p className="notice" role="status">
                Data contoh terakhir lebih dari 15 menit lalu. Pilih Perbarui
                contoh untuk memuat ulang.
              </p>
            )}
          </div>}
          {tab === "dashboard" && (
            <>
              {exceededBuildings > 0 && <p className="notice">{exceededBuildings} gedung melebihi batas pemakaian harian.</p>}
              <section className="dashboard-hero">
                <div className="hero-summary">
                  <Wifi size={20} />
                  <strong>
                    {online} dari {activeLocations.length} titik terhubung
                  </strong>
                  <p>{offline} titik terputus · contoh</p>
                </div>
                <article className="stat featured">
                  <div>
                    <span>Pemakaian gedung hari ini</span>
                    <Droplets size={22} />
                  </div>
                  <h2>
                    {buildingDaily.length ? number(total) : "Belum ada data"}{" "}
                    <small>m³</small>
                  </h2>
                  <p>
                    {buildingDaily.length ? number(total * 1000, 0) : "Belum ada data"} liter
                    · sejak 00.00 WIB
                  </p>
                </article>
              </section>
              <section className="stats quick-stats">
                <article className="stat">
                  <div>
                    <span>Debit masuk gedung</span>
                    <Activity size={22} />
                  </div>
                  <h2>
                    {number(
                      data.locations
                        .filter((w) => w.type === "BUILDING" && w.active)
                        .reduce((s, w) => s + (w.flow ?? 0), 0),
                    )}{" "}
                    <small>L/menit</small>
                  </h2>
                </article>
                <article className="stat">
                  <div>
                    <span>Titik monitoring</span>
                    <Wifi size={22} />
                  </div>
                  <h2>
                    {activeLocations.length}
                    <small> aktif</small>
                  </h2>
                  <p>
                    <span className="text-amber">
                      ● {offline} titik terputus
                    </span>
                  </p>
                </article>
                <article className="stat">
                  <div>
                    <span>Koneksi terputus</span>
                    <Activity size={22} />
                  </div>
                  <h2>
                    {offline}
                    <small> titik</small>
                  </h2>
                  <p>Perlu pemeriksaan perangkat</p>
                </article>
              </section>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Pemakaian gedung</h2>
                      <p>Volume per jam · m³ · hari ini (WIB)</p>
                    </div>
                    <span className="tag">Hari ini</span>
                  </div>
                  <UsageChart data={aggregate(buildingDaily, "hour")} />
                  <div className="panel-foot">
                    <button
                      className="text-button"
                      onClick={() => setTab("history")}
                    >
                      Lihat riwayat <ArrowRight size={14} />
                    </button>
                  </div>
                </section>
                <section className="panel status-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Status perangkat</h2>
                      <p>Koneksi perangkat contoh</p>
                    </div>
                  </div>
                  <div className="status-line">
                    <span className="text-green">Terhubung</span>
                    <strong>{online}</strong>
                  </div>
                  <div className="status-line">
                    <span className="text-amber">Terputus</span>
                    <strong>{offline}</strong>
                  </div>
                  <p className="map-help">
                    Status koneksi tidak menunjukkan kondisi kualitas air.
                  </p>
                </section>
              </div>
              <section className="panel location-preview">
                <div className="panel-heading">
                  <div>
                    <h2>Lokasi titik</h2>
                    <p>Lokasi contoh</p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Buka peta lengkap"
                    onClick={() => setTab("map")}
                  >
                    <ArrowRight size={19} />
                  </button>
                </div>
                <WellMap
                  wells={data.locations}
                  selected={selected}
                  onSelect={(id) => {
                    setTab("map");
                    selectWell(id);
                  }}
                />
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Monitoring sumur dan gedung</h2>
                    <p>Pemakaian hari ini dan kondisi perangkat</p>
                  </div>
                </div>
                {wellList}
              </section>
            </>
          )}
          {tab === "map" && (
            <MapExplorer
              wells={data.locations}
              daily={daily}
              selected={selected}
              onSelect={selectWell}
            />
          )}
          {tab === "history" && (
            <div className="history-view">
              <div className="history-intro">
                <div>
                  <h2>Penggunaan air</h2>
                  <p>Pantau penggunaan berdasarkan lokasi dan periode.</p>
                </div>
                <ReportDownload disabled={invalid || !history.length} input={{readings:history,locations:data.locations,start:rangeStart,end:rangeEnd,period,kind,location:data.locations.find(w=>w.id===filter)?.name || "Semua titik",illustrative:demo}} />
              </div>
              <section className="panel filters">
                <div className="date-fields">
                  <label className="history-period">
                    Periode
                    <CustomSelect ariaLabel="Periode" value={period} onChange={changePeriod} options={["Harian", "Mingguan", "Bulanan", "Tahunan", "Rentang tanggal"].map(value => ({value, label: value}))} />
                  </label>
                  <label>
                    Jenis titik
                    <CustomSelect
                      ariaLabel="Jenis titik"
                      value={kind}
                      onChange={(value) => {
                        setKind(value);
                        setFilter("all");
                      }}
                      options={[{ value: "all", label: "Semua" }, { value: "WELL", label: "Sumur" }, { value: "BUILDING", label: "Gedung" }]}
                    />
                  </label>
                  <label>
                    Lokasi titik
                    <CustomSelect
                      ariaLabel="Lokasi titik"
                      value={filter}
                      onChange={setFilter}
                      options={[{ value: "all", label: "Semua titik" }, ...data.locations
                        .filter((w) => kind === "all" || w.type === kind)
                        .map((w) => ({ value: w.id, label: w.name }))]}
                    />
                  </label>
                  <label>
                    Dari tanggal
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={(e) => {
                        setStart(e.target.value);
                        setPeriod("Rentang tanggal");
                      }}
                    />
                  </label>
                  <label>
                    Sampai tanggal
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={(e) => {
                        setEnd(e.target.value);
                        setPeriod("Rentang tanggal");
                      }}
                    />
                  </label>
                  <button
                    className="secondary history-reset"
                    aria-label="Reset filter"
                    onClick={() => {
                      setStart("");
                      setEnd("");
                      setFilter("all");
                      setKind("all");
                      setPeriod("Harian");
                    }}
                  >
                    <RotateCcw size={16} aria-hidden="true" /> Reset filter
                  </button>
                </div>
                {invalid && (
                  <p className="notice" role="alert">
                    Tanggal akhir harus sama atau setelah tanggal awal.
                  </p>
                )}
                <p className="history-help">
                  {{
                    Harian: "Menampilkan penggunaan per jam.",
                    Mingguan: "Senin hingga hari ini, per hari.",
                    Bulanan: "Awal bulan hingga hari ini, per hari.",
                    Tahunan: "Awal tahun hingga hari ini, per bulan.",
                    "Rentang tanggal": "Menampilkan rentang tanggal pilihan.",
                  }[period]}
                </p>
              </section>
              <HistoryResults
                key={`${rangeStart}-${rangeEnd}-${filter}-${period}-${kind}`}
                readings={history}
                selectedLocation={data.locations.find(w => w.id === filter)}
                illustrative={demo}
                series={series}
                location={
                  data.locations.find((w) => w.id === filter)?.name ||
                  (kind === "WELL"
                    ? "Semua sumur"
                    : kind === "BUILDING"
                      ? "Semua gedung"
                      : "Semua titik (volume terukur)")
                }
                start={rangeStart}
                end={rangeEnd}
              />
            </div>
          )}
          {tab === "profile" && <ProfileView adminPreview={adminPreview} />}
          {role === "ADMIN" && tab === "manage" && <section className="management-hub" aria-label="Kelola">
            <p>Kelola data dan akses TIRTA UNNES.</p>
            <button onClick={() => setTab("locations")}><MapPin aria-hidden="true" /><span><strong>Titik Monitoring</strong><small>Kelola Sumur dan Gedung</small></span><ChevronRight size={18} aria-hidden="true" /></button>
            <button onClick={() => setTab("users")}><Users aria-hidden="true" /><span><strong>Pengguna</strong><small>Kelola akun dan hak akses</small></span><ChevronRight size={18} aria-hidden="true" /></button>
          </section>}
          {(adminPreview || (!demo && role === "ADMIN")) && (tab === "locations" || tab === "users") && (
            <AdminView key={tab} page={tab} snapshot={data} preview={adminPreview} onLocationsChange={() => void refresh()} onPreviewSave={row => setData(old => {
              if (!old || !adminPreview) return old;
              const existing = old.locations.find(w => w.id === row.id);
              const location = { id: row.id, code: row.code, type: row.type, name: row.name, area: row.area, lat: row.latitude, lng: row.longitude, active: row.active, occupants: row.occupants, dailyUsageLimit: row.daily_usage_limit ?? null, limitNotificationEnabled: row.limit_notification_enabled ?? false, flow: existing?.flow ?? null, updatedAt: existing?.updatedAt ?? "" };
              return { ...old, locations: existing ? old.locations.map(w => w.id === row.id ? location : w) : [...old.locations, location] };
            })} />
          )}
        </main>
      </div>
      <nav className={`bottom-nav${role === "ADMIN" ? " admin-bottom-nav" : ""}`} aria-label="Navigasi utama">{navigation(true, true)}</nav>
      {well && (
        <div
          ref={detailContainerRef}
          style={detailStyle}
          className={`detail-backdrop ${detailStop === 0 ? "detail-collapsed" : ""}`}
          onClick={() => setSelected("")}
        >
          <div
            className="detail-map"
            onClick={(event) => event.stopPropagation()}
          >
            <WellMap
              detail
              wells={data.locations}
              selected={selected}
              onSelect={selectWell}
            />
          </div>
          <section
            ref={dialog}
            className="detail-panel"
            role="dialog"
            aria-modal="true"
            aria-label={`Detail ${well.name}`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setSelected("");
            }}
          >
            <button
              {...detailHandlers}
              className="detail-sheet-grip"
              aria-label={
                detailStop === 2
                  ? "Kecilkan detail titik"
                  : "Perluas detail titik"
              }
              aria-expanded={detailStop === 2}
              onClick={toggleDetail}
            >
              <span />
            </button>
            <div className="panel-heading">
              <div {...detailHandlers} className="detail-sheet-title">
                <span className="eyebrow">TITIK MONITORING · DATA CONTOH</span>
                <h2>{well.name}</h2>
                <p className="detail-area">
                  <MapPin size={14} />
                  {well.area}
                </p>
              </div>
              <button
                autoFocus
                className="icon-button"
                aria-label="Tutup detail"
                onClick={() => setSelected("")}
              >
                <X />
              </button>
            </div>
            <div className="detail-body">
              <span
                className={`connection ${well.flow === null ? "offline" : ""}`}
              >
                <Wifi size={16} />
                {!well.active
                  ? "Direncanakan"
                  : !well.updatedAt
                    ? "Belum ada data"
                    : well.flow === null
                      ? "Koneksi terputus"
                      : "Perangkat terhubung"}
              </span>
              <div className="detail-stats">
                <div>
                  <small>
                    {well.type === "BUILDING"
                      ? "Debit masuk"
                      : "Debit keluar"}
                  </small>
                  <h2>{well.flow === null ? "—" : number(well.flow)}</h2>
                  <p>L/menit</p>
                </div>
                <div>
                  <small>{well.type === "BUILDING" ? "Pemakaian hari ini" : "Produksi air hari ini"}</small>
                  <h2>
                    {wellDaily.length
                      ? number(
                          wellDaily.reduce((s, r) => s + r.liters, 0) / 1000,
                        )
                      : "Belum ada data"}
                  </h2>
                  <p>m³</p>
                </div>
              </div>
              {well.type === "BUILDING" && <UsageLimit actual={getDailyUsage(data, well.id, new Date(clock)).actual} limit={well.dailyUsageLimit} enabled={well.limitNotificationEnabled} illustrative={demo} />}
              <BuildingUsage location={well} volumeM3={wellDaily.length ? wellDaily.reduce((sum, reading) => sum + reading.liters, 0) / 1000 : null} illustrative={demo} />
              {well.flow === null && (
                <p className="notice">
                  Debit tidak tersedia saat terputus. Volume hanya mencakup
                  interval yang diterima.
                </p>
              )}
              <section className="well-description">
                <h3>Informasi titik</h3>
                <p>
                  {well.name} merupakan titik monitoring di {well.area}. Data
                  contoh menampilkan debit terkini dan akumulasi pemakaian air
                  hari ini berdasarkan interval yang diterima.
                </p>
                <dl>
                  <div>
                    <dt>Jenis titik</dt>
                    <dd>{well.type === "BUILDING" ? "Gedung" : "Sumur"}</dd>
                  </div>
                  <div>
                    <dt>Kode titik</dt>
                    <dd>{well.code}</dd>
                  </div>
                  <div>
                    <dt>Pembaruan terakhir</dt>
                    <dd>{wibTime(well.updatedAt)}</dd>
                  </div>
                  <div>
                    <dt>Koordinat contoh</dt>
                    <dd>
                      {well.lat}, {well.lng}
                    </dd>
                  </div>
                </dl>
                <small>
                  Lokasi dan angka merupakan contoh, bukan data sumur asli
                  UNNES. Status koneksi tidak menunjukkan kualitas air.
                </small>
              </section>
              <h3>Riwayat penggunaan</h3>
              <div className="periods">
                {[
                  ["hour", "Per jam"],
                  ["day", "Harian"],
                  ["month", "Bulanan"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={detailPeriod === value}
                    className={detailPeriod === value ? "active" : ""}
                    onClick={() => setDetailPeriod(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p>Volume per jam (m³) · WIB</p>
              <UsageChart
                data={aggregate(
                  detailPeriod === "hour"
                    ? wellDaily
                    : data.readings.filter((r) => r.locationId === selected),
                  detailPeriod as "hour" | "day" | "month",
                )}
              />
              <button
                className="primary"
                onClick={() => {
                  setFilter(well.id);
                  setKind(well.type);
                  setTab("history");
                  setSelected("");
                }}
              >
                Lihat riwayat titik <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
