"use client";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import type { MonitoringType } from "@/lib/data";

type LocationRow = {
  id: string;
  code: string;
  type: MonitoringType;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  occupants: number | null;
  active: boolean;
};
type AccountRow = {
  id: string;
  name: string;
  email: string;
  role: "VIEWER" | "ADMIN";
  active: boolean;
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

export function AdminView({ page }: { page: "locations" | "users" }) {
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [users, setUsers] = useState<AccountRow[]>([]);
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
      if (!supabase) return;
      const result =
        page === "locations"
          ? await supabase
              .from("monitoring_locations")
              .select("*")
              .order("name")
          : await supabase.rpc("admin_list_users");
      if (!live) return;
      if (result.error)
        setError(
          "Pengelolaan belum dapat dimuat. Periksa akses dan konfigurasi Supabase.",
        );
      else if (page === "locations") setLocations(result.data || []);
      else setUsers(result.data || []);
    }
    void load();
    return () => {
      live = false;
    };
  }, [page]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!supabase || !draft) return;
    setBusy(true);
    setError("");
    setMessage("");
    const record = {
      ...draft,
      name: draft.name.trim(),
      code: draft.code.trim(),
      area: draft.area.trim(),
      occupants: draft.type === "WELL" ? null : draft.occupants,
    };
    try {
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
    } catch {
      setError(
        "Titik belum tersimpan. Pastikan kode unik, data valid, dan akses Admin tersedia.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function updateRole(id: string, role: string) {
    if (!supabase) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await supabase.rpc("admin_set_role", {
        target_id: id,
        new_role: role,
      });
      if (error) throw error;
      setUsers((old) =>
        old.map((u) =>
          u.id === id ? { ...u, role: role as AccountRow["role"] } : u,
        ),
      );
      setMessage("Peran pengguna diperbarui.");
    } catch {
      setError(
        "Peran tidak dapat diubah. Perubahan peran sendiri tidak diizinkan.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-view">
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
          <button className="primary" onClick={() => setDraft({ ...blank })}>
            Tambah titik
          </button>
        )}
      </div>
      {error && (
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
            <form className="panel admin-form" onSubmit={save}>
              <h3>{draft.id ? "Edit titik" : "Tambah titik"}</h3>
              <label>
                Jenis
                <select
                  value={draft.type}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      type: e.target.value as MonitoringType,
                    })
                  }
                >
                  <option value="WELL">Sumur</option>
                  <option value="BUILDING">Gedung</option>
                </select>
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
                    setDraft({ ...draft, latitude: Number(e.target.value) })
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
                    setDraft({ ...draft, longitude: Number(e.target.value) })
                  }
                />
              </label>
              {draft.type === "BUILDING" && (
                <label>
                  Jumlah pegawai / pengguna
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={draft.occupants ?? ""}
                    placeholder="Belum tersedia"
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        occupants:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              )}
              <label>
                Status
                <select
                  value={String(draft.active)}
                  onChange={(e) =>
                    setDraft({ ...draft, active: e.target.value === "true" })
                  }
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif / direncanakan</option>
                </select>
              </label>
              <div>
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
          )}
          <div className="panel well-list">
            {locations
              .filter((r) => type === "all" || r.type === type)
              .map((r) => (
                <button
                  className="well-row"
                  key={r.id}
                  onClick={() => setDraft(r)}
                >
                  <span className="well-name">
                    <strong>{r.name}</strong>
                    <small>
                      {r.code} · {r.type === "WELL" ? "Sumur" : "Gedung"} ·{" "}
                      {r.area}
                    </small>
                  </span>
                  <span>{r.active ? "Aktif" : "Nonaktif"} · Edit</span>
                </button>
              ))}
            {!locations.length && !error && (
              <p className="empty">
                Belum ada titik tersimpan. Tambahkan lokasi trial pertama.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="panel admin-users">
          {users.map((u) => (
            <div className="well-row" key={u.id}>
              <div className="well-name">
                <strong>{u.name || "Pengguna UNNES"}</strong>
                <small>
                  {u.email} · {u.active ? "Aktif" : "Nonaktif"}
                </small>
              </div>
              <label>
                Peran
                <select
                  aria-label={`Peran ${u.email}`}
                  disabled={busy || !u.active}
                  value={u.role}
                  onChange={(e) => updateRole(u.id, e.target.value)}
                >
                  <option value="VIEWER">Viewer</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>
            </div>
          ))}
          {!users.length && !error && (
            <p className="empty">Belum ada pengguna.</p>
          )}
        </div>
      )}
    </section>
  );
}
