"use client";
import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import { Settings2 } from "lucide-react";
import { MonitoringDialog, MonitoringSwitch } from "./monitoring-dialog";
import styles from "./monitoring-admin.module.css";

export function UsageLimitSettings({
  id,
  name,
  limit,
  enabled,
  onSaved,
  preview = false,
}: {
  preview?: boolean;
  id: string;
  name: string;
  limit?: number | null;
  enabled?: boolean;
  actual: number | null;
  onSaved: (limit: number | null, enabled: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [notification, setNotification] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const next = value.trim() === "" ? null : Number(value);
    if (next !== null && (!Number.isFinite(next) || next <= 0)) {
      setError("Batas pemakaian harus lebih dari 0 m³.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (preview) {
        onSaved(next, notification);
        setEditing(false);
        setMessage("Pengaturan tersimpan untuk pratinjau ini.");
        return;
      }
      if (!supabase) throw new Error();
      const { data, error } = await supabase
        .from("monitoring_locations")
        .update({
          daily_usage_limit: next,
          limit_notification_enabled: notification,
        })
        .eq("id", id)
        .eq("type", "BUILDING")
        .select("daily_usage_limit, limit_notification_enabled")
        .single();
      if (error || !data) throw new Error();
      onSaved(
        data.daily_usage_limit == null ? null : Number(data.daily_usage_limit),
        data.limit_notification_enabled,
      );
      setEditing(false);
      setMessage("Pengaturan pemakaian tersimpan.");
    } catch {
      setError(
        "Pengaturan belum tersimpan. Periksa akses Admin, koneksi, dan migrasi 005.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.settings}>
      <button
        className="secondary"
        aria-label={`Atur ${name}`}
        onClick={() => {
          setValue(limit == null ? "" : String(limit));
          setNotification(enabled ?? false);
          setEditing(true);
          setError("");
          setMessage("");
        }}
      >
        <Settings2 size={16} aria-hidden="true" />
        Atur
      </button>
      {message && (
        <p role="status" className={styles.saved}>
          {message}
        </p>
      )}
      {editing && (
        <MonitoringDialog
          title="Pengaturan pemakaian"
          subtitle={name}
          busy={busy}
          onClose={() => setEditing(false)}
        >
          <form className={styles.form} onSubmit={save}>
            <label>
              Batas pemakaian harian (m³)
              <input
                autoFocus
                type="number"
                step="any"
                value={value}
                disabled={busy}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Belum ditetapkan"
                aria-describedby={`limit-help-${id}`}
              />
            </label>
            <small id={`limit-help-${id}`}>
              Kosongkan untuk menghapus batas. Nilai harus lebih dari 0 m³.
            </small>
            <MonitoringSwitch
              label="Notifikasi batas"
              checked={notification}
              disabled={busy}
              onChange={setNotification}
            />
            {error && <p role="alert">{error}</p>}
            <div className={styles.actions}>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Batal
              </button>
              <button className="primary" disabled={busy}>
                {busy ? "Menyimpan..." : "Simpan pengaturan"}
              </button>
            </div>
          </form>
        </MonitoringDialog>
      )}
    </div>
  );
}
