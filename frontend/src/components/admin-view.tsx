"use client";
import { useUiCopy } from "./use-ui-copy";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
type LocationDraft = Omit<
  typeof blank,
  "occupants" | "latitude" | "longitude"
> & {
  id?: string;
  occupants: string;
  latitude: string;
  longitude: string;
};
function editable(row: typeof blank & { id?: string }): LocationDraft {
  return {
    ...row,
    occupants: row.occupants == null ? "" : String(row.occupants),
    latitude: String(row.latitude),
    longitude: String(row.longitude),
  };
}

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
  const { localize, locale, uiText } = useUiCopy();
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
  const [draft, setDraft] = useState<LocationDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
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
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if ((!preview && !supabase) || !draft || saving.current) return;
    const form = e.currentTarget;
    function reject(field: string, message: string) {
      setError(message);
      const input = form.elements.namedItem(field) as HTMLInputElement | null;
      input?.setCustomValidity(uiText(message));
      input?.reportValidity();
    }
    const occupants =
      draft.occupants.trim() === "" ? null : Number(draft.occupants);
    const latitude = Number(draft.latitude),
      longitude = Number(draft.longitude);
    if (
      draft.type === "BUILDING" &&
      occupants !== null &&
      (!/^\d+$/.test(draft.occupants) ||
        !Number.isInteger(occupants) ||
        occupants < 0 ||
        occupants > 2147483647)
    ) {
      reject(
        "occupants",
        "Jumlah pegawai harus berupa bilangan bulat antara 0 dan 2.147.483.647. Kosongkan jika belum tersedia.",
      );
      return;
    }
    const decimal = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;
    if (
      !decimal.test(draft.latitude) ||
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      reject("latitude", "Latitude harus berupa angka antara -90 dan 90.");
      return;
    }
    if (
      !decimal.test(draft.longitude) ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      reject("longitude", "Longitude harus berupa angka antara -180 dan 180.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const record = {
      ...(draft.id ? { id: draft.id } : {}),
      type: draft.type,
      latitude,
      longitude,
      active: draft.active,
      ...(draft.type === "WELL"
        ? { daily_usage_limit: null, limit_notification_enabled: false }
        : {}),
      name: draft.name.trim(),
      code: draft.code.trim(),
      area: draft.area.trim(),
      occupants: draft.type === "WELL" ? null : occupants,
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
      saving.current = false;
      setBusy(false);
    }
  }
  if (page === "users") return <AdminUsers preview={preview} />;
  return localize(
    <section className={styles.page}>
      <div className="history-intro">
        <div>
          <h2>{page === "locations" ? "Titik Monitoring" : "Pengguna"}</h2>
          <p>
            {page === "locations"
              ? "Kelola lokasi sumur dan gedung."
              : "Kelola akses Viewer dan Admin."}
          </p>
        </div>
        {page === "locations" && (
          <button
            className="primary"
            onClick={() => {
              setError("");
              setDraft(editable(blank));
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
              <form className={`${styles.form} ${styles.locationForm}`} onSubmit={save}>
                <fieldset disabled={busy}>
                  <legend>Informasi titik</legend>
                  <div className={styles.fields}>
                    <label>
                      Jenis
                      <CustomSelect
                        compact
                        ariaLabel="Jenis"
                        value={draft.type}
                        onChange={(value) =>
                          setDraft({
                            ...draft,
                            type: value as MonitoringType,
                            occupants: value === "WELL" ? "" : draft.occupants,
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
                          type="text"
                          name="occupants"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label="Jumlah pegawai"
                          aria-describedby="occupants-help"
                          value={draft.occupants}
                          onInvalid={(e) =>
                            e.currentTarget.setCustomValidity(
                              uiText(
                                "Jumlah pegawai harus bilangan bulat 0 atau lebih, maksimal 2.147.483.647.",
                              ),
                            )
                          }
                          onInput={(e) => e.currentTarget.setCustomValidity("")}
                          placeholder="Belum tersedia"
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              occupants: e.target.value,
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
                        type="text"
                        name="latitude"
                        inputMode="decimal"
                        onInput={(e) => e.currentTarget.setCustomValidity("")}
                        value={draft.latitude}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            latitude: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        required
                        type="text"
                        name="longitude"
                        inputMode="decimal"
                        onInput={(e) => e.currentTarget.setCustomValidity("")}
                        value={draft.longitude}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            longitude: e.target.value,
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
                    {busy ? "Menyimpan..." : "Simpan"}
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
                    <h3 translate="no">{r.name}</h3>
                    <p className={styles.code} translate="no">
                      {r.code}
                    </p>
                    <p className={styles.area} translate="no">
                      {r.area}
                    </p>
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
                            `${r.daily_usage_limit.toLocaleString(locale, { maximumFractionDigits: 3 })} m³`
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
                      className={styles.editAction}
                      aria-label={`Edit ${r.name}`}
                      onClick={() => {
                        setError("");
                        setDraft(editable(r));
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
    </section>,
  );
}
