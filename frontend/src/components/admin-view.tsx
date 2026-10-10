"use client";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { UsageLimitSettings } from "./usage-limit-settings";
import { getDailyUsage } from "@/lib/usage-limits";
import type { MonitoringType, Snapshot } from "@/lib/data";
import { CustomSelect } from "./custom-select";
import { Building2, Droplets, Pencil, Plus } from "lucide-react";
import { MonitoringDialog, MonitoringSwitch } from "./monitoring-dialog";
import styles from "./monitoring-admin.module.css";
import { AdminUsers } from "./admin-users";

export type LocationRow = {
  id: string;
  code: string;
  type: MonitoringType;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  occupants: number | null;
  active: boolean;
  daily_usage_limit?: number | null;
  limit_notification_enabled?: boolean;
};
const blank = {
  code: "",
  type: "WELL" as MonitoringType,
  name: "",
  area: "",
  latitude: -7.05,
  longitude: 110.394,
  occupants: null as number | null,
  active: true,
};

export function AdminView({
  page,
  onLocationsChange,
  snapshot,
  preview = false,
  onPreviewSave,
}: {
  page: "locations" | "users";
  onLocationsChange?: () => void;
  snapshot?: Snapshot;
  preview?: boolean;
  onPreviewSave?: (row: LocationRow) => void;
}) {
  const [storedLocations, setLocations] = useState<LocationRow[]>([]);
  const locations: LocationRow[] = preview
    ? (snapshot?.locations ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        code: w.code,
        type: w.type,
        area: w.area,
        latitude: w.lat,
        longitude: w.lng,
        active: w.active,
        occupants: w.occupants,
        daily_usage_limit: w.dailyUsageLimit ?? null,
        limit_notification_enabled: w.limitNotificationEnabled ?? false,
      }))
    : storedLocations;
  const [type, setType] = useState("all");
  const [draft, setDraft] = useState<(typeof blank & { id?: string }) | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    async function load() {
      if (preview || !supabase || page !== "locations") return;
      const result = await supabase
        .from("monitoring_locations")
        .select("*")
        .order("name");
      if (!live) return;
      if (result.error)
        setError(
          "Pengelolaan belum dapat dimuat. Periksa akses dan konfigurasi Supabase.",
        );
      else setLocations(result.data || []);
    }
    void load();
    return () => {
      live = false;
    };
  }, [page, preview]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if ((!preview && !supabase) || !draft) return;
    if (
      draft.type === "BUILDING" &&
      draft.occupants !== null &&
      (!Number.isInteger(draft.occupants) ||
        draft.occupants < 0 ||
        draft.occupants > 2147483647)
    ) {
      setError(
        "Jumlah pegawai harus berupa bilangan bulat antara 0 dan 2.147.483.647. Kosongkan jika belum tersedia.",
      );
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const record = {
      ...(draft.id ? { id: draft.id } : {}),
      type: draft.type,
      latitude: draft.latitude,
      longitude: draft.longitude,
      active: draft.active,
      ...(draft.type === "WELL"
        ? { daily_usage_limit: null, limit_notification_enabled: false }
        : {}),
      name: draft.name.trim(),
      code: draft.code.trim(),
      area: draft.area.trim(),
      occupants: draft.type === "WELL" ? null : draft.occupants,
    };
    try {
      if (preview) {
        if (
          locations.some(
            (row) => row.id !== draft.id && row.code === record.code,
          )
        )
          throw new Error("duplicate");
        onPreviewSave?.({
          ...locations.find((row) => row.id === draft.id),
          ...record,
          id: draft.id ?? `dummy-${Date.now()}`,
        });
        setDraft(null);
        setMessage("Perubahan titik tersimpan untuk pratinjau ini.");
        return;
      }
      if (!supabase) throw new Error();
      const result = await supabase
        .from("monitoring_locations")
        .upsert(record)
        .select()
        .single();
      if (result.error) throw result.error;
      setLocations((old) => [
        ...old.filter((r) => r.id !== result.data.id),
        result.data,
      ]);
      setDraft(null);
      setMessage("Titik monitoring tersimpan.");
      onLocationsChange?.();
    } catch {
      setError(
        "Titik belum tersimpan. Pastikan kode unik, data valid, dan akses Admin tersedia.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (page === "users") return <AdminUsers preview={preview} />;
  return (
    <section className={styles.page}>
      <div className="history-intro">
        <div>
          <h2>
            {page === "locations" ? "Kelola titik monitoring" : "Pengguna"}
          </h2>
          <p>
            {page === "locations"
              ? "Kelola lokasi sumur dan gedung untuk trial."
              : "Kelola akses Viewer dan Admin."}
          </p>
        </div>
        {page === "locations" && (
          <button
            className="primary"
            onClick={() => {
              setError("");
              setDraft({ ...blank });
            }}
          >
            <Plus size={17} aria-hidden="true" />
            Tambah titik
          </button>
        )}
      </div>
      {error && !draft && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {page === "locations" ? (
        <>
          <div className="periods">
            {[
              ["all", "Semua"],
              ["WELL", "Sumur"],
              ["BUILDING", "Gedung"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={type === value}
                onClick={() => setType(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {draft && (
            <MonitoringDialog
              title={
                draft.id
                  ? `Edit ${draft.type === "BUILDING" ? "Gedung" : "Sumur"}`
                  : "Tambah titik"
              }
              onClose={() => setDraft(null)}
              busy={busy}
            >
              <form className={styles.form} onSubmit={save}>
                <fieldset disabled={busy}>
                  <legend>Informasi titik</legend>
                  <div className={styles.fields}>
                    <label>
                      Jenis
                      <CustomSelect
                        ariaLabel="Jenis"
                        value={draft.type}
                        onChange={(value) =>
                          setDraft({
                            ...draft,
                            type: value as MonitoringType,
                            occupants:
                              value === "WELL" ? null : draft.occupants,
                          })
                        }
                        options={[
                          { value: "WELL", label: "Sumur" },
                          { value: "BUILDING", label: "Gedung" },
                        ]}
                      />
                    </label>
                    {(
                      [
                        ["name", "Nama"],
                        ["code", "Kode titik"],
                        ["area", "Lokasi"],
                      ] as const
                    ).map(([field, label]) => (
                      <label key={field}>
                        {label}
                        <input
                          required
                          maxLength={120}
                          value={draft[field]}
                          onChange={(e) =>
                            setDraft({ ...draft, [field]: e.target.value })
                          }
                        />
                      </label>
                    ))}
                    {draft.type === "BUILDING" && (
                      <label>
                        Jumlah pegawai
                        <input
                          type="number"
                          min={0}
                          max={2147483647}
                          step={1}
                          aria-label="Jumlah pegawai"
                          aria-describedby="occupants-help"
                          value={draft.occupants ?? ""}
                          onInvalid={(e) =>
                            e.currentTarget.setCustomValidity(
                              "Jumlah pegawai harus bilangan bulat 0 atau lebih, maksimal 2.147.483.647.",
                            )
                          }
                          onInput={(e) => e.currentTarget.setCustomValidity("")}
                          placeholder="Belum tersedia"
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              occupants:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                        <small id="occupants-help">
                          Kosongkan jika belum tersedia. Nilai 0 tidak digunakan
                          untuk menghitung rata-rata per orang.
                        </small>
                      </label>
                    )}
                  </div>
                </fieldset>
                <fieldset disabled={busy}>
                  <legend>Lokasi</legend>
                  <div className={styles.fields}>
                    <label>
                      Latitude
                      <input
                        required
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        value={draft.latitude}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            latitude: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        required
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        value={draft.longitude}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            longitude: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                </fieldset>
                <fieldset disabled={busy}>
                  <legend>Status</legend>
                  <MonitoringSwitch
                    label="Titik monitoring"
                    checked={draft.active}
                    onChange={(active) => setDraft({ ...draft, active })}
                    disabled={busy}
                  />
                </fieldset>
                {error && <p role="alert">{error}</p>}
                <div className={styles.actions}>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => setDraft(null)}
                  >
                    Batal
                  </button>
                  <button className="primary" disabled={busy}>
                    Simpan
                  </button>
                </div>
              </form>
            </MonitoringDialog>
          )}
          <div className={styles.grid}>
            {locations
              .filter((r) => type === "all" || r.type === type)
              .map((r) => (
                <article className={styles.card} key={r.id} aria-label={r.name}>
                  <div className={styles.cardTop}>
                    <span className={styles.kind}>
                      {r.type === "BUILDING" ? (
                        <Building2 size={17} aria-hidden="true" />
                      ) : (
                        <Droplets size={17} aria-hidden="true" />
                      )}
                      {r.type === "BUILDING" ? "Gedung" : "Sumur"}
                    </span>
                    <span className={styles.badge} data-active={r.active}>
                      {r.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div>
                    <h3>{r.name}</h3>
                    <p className={styles.code}>{r.code}</p>
                    <p className={styles.area}>{r.area}</p>
                  </div>
                  {r.type === "BUILDING" && (
                    <dl className={styles.facts}>
                      <div>
                        <dt>Jumlah pegawai</dt>
                        <dd>
                          {r.occupants == null ? (
                            <span className={styles.missing}>
                              Belum tersedia
                            </span>
                          ) : (
                            `${r.occupants} pegawai`
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Batas harian</dt>
                        <dd>
                          {r.daily_usage_limit == null ? (
                            <span className={styles.missing}>
                              Belum ditetapkan
                            </span>
                          ) : (
                            `${r.daily_usage_limit.toLocaleString("id-ID", { maximumFractionDigits: 3 })} m³`
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Notifikasi batas</dt>
                        <dd>
                          {r.limit_notification_enabled ? "Aktif" : "Nonaktif"}
                        </dd>
                      </div>
                    </dl>
                  )}
                  <div className={styles.cardActions}>
                    {r.type === "BUILDING" && (
                      <UsageLimitSettings
                        preview={preview}
                        id={r.id}
                        name={r.name}
                        limit={r.daily_usage_limit}
                        enabled={r.limit_notification_enabled}
                        actual={
                          snapshot ? getDailyUsage(snapshot, r.id).actual : null
                        }
                        onSaved={(limit, enabled) => {
                          if (preview) {
                            onPreviewSave?.({
                              ...r,
                              daily_usage_limit: limit,
                              limit_notification_enabled: enabled,
                            });
                            return;
                          }
                          setLocations((old) =>
                            old.map((item) =>
                              item.id === r.id
                                ? {
                                    ...item,
                                    daily_usage_limit: limit,
                                    limit_notification_enabled: enabled,
                                  }
                                : item,
                            ),
                          );
                          onLocationsChange?.();
                        }}
                      />
                    )}
                    <button
                      className="secondary"
                      aria-label={`Edit ${r.name}`}
                      onClick={() => {
                        setError("");
                        setDraft(r);
                      }}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                </article>
              ))}
            {!locations.length && !error && (
              <p className="empty">
                Belum ada titik tersimpan. Tambahkan lokasi trial pertama.
              </p>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
