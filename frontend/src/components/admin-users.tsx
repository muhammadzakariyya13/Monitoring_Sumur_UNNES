"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Plus, RefreshCw, X } from "lucide-react";
import { supabase, isUnnesEmail } from "@/lib/supabase";
import { useAuth } from "./auth";
import { CustomSelect } from "./custom-select";
import styles from "./admin-users.module.css";

type Account = {
  id: string;
  name: string;
  email: string;
  role: "VIEWER" | "ADMIN";
  active: boolean;
  confirmed: boolean;
  deletion_pending: boolean;
};
const roles = [
  { value: "VIEWER", label: "Viewer" },
  { value: "ADMIN", label: "Admin" },
];
const errors: Record<string, string> = {
  FORBIDDEN: "Akses Admin tidak tersedia. Silakan login kembali.",
  SELF_PROTECTED: "Akun Anda sendiri tidak dapat diubah atau dihapus.",
  LAST_ADMIN: "Admin aktif terakhir harus dipertahankan.",
  DELETION_PENDING: "Penghapusan belum selesai. Coba Hapus kembali.",
  USER_UNAVAILABLE: "Pengguna tidak ditemukan. Refresh daftar pengguna.",
};

const dummyAccounts: Account[] = [
  {
    id: "dummy-admin",
    name: "Admin Dummy",
    email: "admin@example.invalid",
    role: "ADMIN",
    active: true,
    confirmed: true,
    deletion_pending: false,
  },
  {
    id: "dummy-viewer",
    name: "Viewer Dummy",
    email: "viewer@example.invalid",
    role: "VIEWER",
    active: true,
    confirmed: true,
    deletion_pending: false,
  },
];

export function AdminUsers({ preview = false }: { preview?: boolean }) {
  const { user } = useAuth();
  const ownId = preview ? "dummy-admin" : user?.id;
  const nextDummyId = useRef(0);
  const [users, setUsers] = useState<Account[]>(() =>
    preview ? dummyAccounts.map((account) => ({ ...account })) : [],
  );
  const [loading, setLoading] = useState(!preview);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [popup, setPopup] = useState<"invite" | Account | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [dialogError, setDialogError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const revision = useRef(0);

  const load = useCallback(async () => {
    if (preview) return;
    const current = ++revision.current;
    try {
      const { data, error } = await (supabase?.rpc("admin_list_users") ??
        Promise.reject(new Error("Konfigurasi Supabase belum tersedia.")));
      if (error) throw error;
      if (current === revision.current) setUsers(data ?? []);
    } catch {
      if (current === revision.current) {
        setUsers([]);
        setError(
          "Gagal memuat pengguna. Periksa koneksi dan konfigurasi akses Admin.",
        );
      }
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, [preview]);
  useEffect(() => {
    // Synchronize with Supabase; load updates state only after its awaited request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => {
      // Request generation, not a DOM ref: invalidate any in-flight response.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      revision.current++;
    };
  }, [load]);
  async function refresh() {
    if (preview) {
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    await load();
  }
  useEffect(() => {
    if (popup) dialog.current?.showModal();
    else dialog.current?.close();
  }, [popup]);

  async function edge(
    body:
      | { action: "invite"; name: string; email: string; role: string }
      | { action: "delete"; id: string },
  ): Promise<string> {
    if (preview) {
      if (body.action === "delete") {
        if (body.id === ownId) throw new Error(errors.SELF_PROTECTED);
        setUsers((old) => old.filter((account) => account.id !== body.id));
        return "Pengguna dummy dihapus dari pratinjau.";
      }
      if (
        users.some(
          (account) => account.email.toLowerCase() === body.email.toLowerCase(),
        )
      )
        throw new Error("Email sudah ada di pratinjau.");
      const id = `dummy-invite-${++nextDummyId.current}`;
      setUsers((old) => [
        ...old,
        {
          id,
          name: body.name,
          email: body.email,
          role: body.role === "ADMIN" ? "ADMIN" : "VIEWER",
          active: true,
          confirmed: false,
          deletion_pending: false,
        },
      ]);
      return "Undangan disimulasikan. Tidak ada email yang dikirim.";
    }
    if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body,
    });
    if (error instanceof FunctionsHttpError) {
      const result = await error.context.json().catch(() => null);
      throw new Error(
        result?.error ??
          "Operasi gagal. Periksa koneksi dan deployment Edge Function.",
      );
    }
    if (error)
      throw new Error(
        "Layanan Admin tidak tersedia. Periksa koneksi dan deployment Edge Function.",
      );
    return data?.message ?? "Operasi berhasil.";
  }

  async function run(operation: () => Promise<string>, inDialog = false) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    setDialogError("");
    try {
      setMessage(await operation());
      if (inDialog) setPopup(null);
      await refresh();
    } catch (failure) {
      const text =
        failure && typeof failure === "object" && "message" in failure
          ? String(failure.message)
          : "Operasi gagal. Coba lagi.";
      const feedback =
        errors[text] ??
        (failure instanceof Error
          ? text
          : "Perubahan belum tersimpan. Periksa akses atau coba lagi.");
      if (inDialog) setDialogError(feedback);
      else setError(feedback);
    } finally {
      setBusy(false);
    }
  }
  async function change(account: Account, newRole?: string) {
    if (account.id === ownId) return;
    await run(async () => {
      if (preview) {
        setUsers((old) =>
          old.map((item) =>
            item.id === account.id
              ? {
                  ...item,
                  role: newRole
                    ? newRole === "ADMIN"
                      ? "ADMIN"
                      : "VIEWER"
                    : item.role,
                  active: newRole ? item.active : !item.active,
                }
              : item,
          ),
        );
        return "Perubahan dummy tersimpan di pratinjau.";
      }
      if (!supabase) throw new Error("Konfigurasi Supabase belum tersedia.");
      const { error } = newRole
        ? await supabase.rpc("admin_set_role", {
            target_id: account.id,
            new_role: newRole,
          })
        : await supabase.rpc("admin_set_active", {
            target_id: account.id,
            new_active: !account.active,
          });
      if (error) throw error;
      return newRole
        ? "Peran pengguna berhasil diubah."
        : account.active
          ? "Pengguna berhasil dinonaktifkan."
          : "Pengguna berhasil diaktifkan.";
    });
  }
  function invite(event: FormEvent) {
    event.preventDefault();
    if (!preview && !isUnnesEmail(email.trim())) {
      setDialogError("Gunakan email @unnes.id.");
      return;
    }
    void run(
      () =>
        edge({
          action: "invite",
          name: name.trim(),
          email: email.trim(),
          role,
        }),
      true,
    );
  }
  const blocked = loading || busy;
  return (
    <section className={styles.page} aria-label="Pengelolaan pengguna">
      <header className={styles.header}>
        <div>
          <h2>Pengguna</h2>
          <p>Kelola akun dan hak akses.</p>
        </div>
        <div className={styles.buttons}>
          <button
            type="button"
            className="secondary"
            aria-label="Refresh pengguna"
            disabled={blocked}
            onClick={() => void refresh()}
          >
            <RefreshCw size={17} />
          </button>
          <button
            type="button"
            className="primary"
            disabled={blocked}
            onClick={() => {
              setName("");
              setEmail("");
              setRole("VIEWER");
              setDialogError("");
              setPopup("invite");
            }}
          >
            <Plus size={17} />
            Tambah Pengguna
          </button>
        </div>
      </header>
      {message && (
        <p className={styles.feedback} role="status">
          {message}
        </p>
      )}
      {error && (
        <div className={styles.feedback} role="alert">
          <p>{error}</p>
          <button
            className="secondary"
            disabled={blocked}
            onClick={() => void refresh()}
          >
            Coba lagi
          </button>
        </div>
      )}
      {loading && <p role="status">Memuat pengguna...</p>}
      {!loading && !error && !users.length && (
        <p className="empty">Belum ada pengguna.</p>
      )}
      {!!users.length && (
        <div className={styles.list}>
          <div className={styles.columns} aria-hidden="true">
            <span>Nama / Email</span>
            <span>Peran</span>
            <span>Status</span>
            <span>Aksi</span>
          </div>
          {users.map((account) => {
            const own = account.id === ownId;
            const protectedAccount = blocked || own || account.deletion_pending;
            return (
              <article
                className={styles.row}
                data-own={own}
                key={account.id}
                aria-label={account.email}
              >
                <div className={styles.identity}>
                  <div className={styles.avatar} aria-hidden="true">{(account.name || account.email).trim().slice(0, 1).toUpperCase()}</div>
                  <strong>{account.name || "Pengguna UNNES"}</strong>
                  <span>{account.email}</span>
                  {own && <small>Akun Anda · dilindungi</small>}
                </div>
                <CustomSelect
                  ariaLabel={`Peran ${account.email}`}
                  value={account.role}
                  disabled={protectedAccount}
                  onChange={(value) => void change(account, value)}
                  options={roles}
                />
                <span className={styles.status}>
                  {account.deletion_pending
                    ? "Penghapusan tertunda"
                    : !account.active
                      ? "Nonaktif"
                      : !account.confirmed
                        ? "Menunggu undangan"
                        : "Aktif"}
                </span>
                <div className={styles.actions}>
                  <button
                    className="secondary"
                    disabled={protectedAccount}
                    onClick={() => void change(account)}
                  >
                    {account.active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    className={styles.destructive}
                    disabled={blocked || own}
                    onClick={() => {
                      setDialogError("");
                      setPopup(account);
                    }}
                  >
                    Hapus
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="admin-users-dialog-title"
        onCancel={(event) => {
          if (busy) event.preventDefault();
          else setPopup(null);
        }}
      >
        <header>
          <h2 id="admin-users-dialog-title">
            {popup === "invite" ? "Tambah Pengguna" : "Hapus pengguna?"}
          </h2>
          <button
            type="button"
            aria-label="Tutup dialog"
            disabled={busy}
            onClick={() => setPopup(null)}
          >
            <X size={20} />
          </button>
        </header>
        {popup === "invite" ? (
          <form onSubmit={invite}>
            <p>
              {preview
                ? "Simulasi undangan, tanpa mengirim email."
                : "Pengguna menerima email undangan dan membuat password sendiri."}
            </p>
            <label>
              Nama
              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                maxLength={254}
                placeholder={preview ? "nama@example.invalid" : "nama@unnes.id"}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
              />
            </label>
            <label>
              Role
              <CustomSelect
                ariaLabel="Role undangan"
                value={role}
                onChange={setRole}
                disabled={busy}
                options={roles}
              />
            </label>
            {dialogError && <p role="alert">{dialogError}</p>}
            <footer>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setPopup(null)}
              >
                Batal
              </button>
              <button className="primary" disabled={busy || !name.trim()}>
                {busy ? "Mengirim..." : "Kirim undangan"}
              </button>
            </footer>
          </form>
        ) : (
          popup && (
            <div className={styles.confirm}>
              <strong>{popup.name || "Pengguna UNNES"}</strong>
              <p>{popup.email}</p>
              <p>
                Pengguna ini akan kehilangan akses ke TIRTA UNNES. Akun akan
                dihapus permanen.
              </p>
              {dialogError && <p role="alert">{dialogError}</p>}
              <footer>
                <button
                  autoFocus
                  className="secondary"
                  disabled={busy}
                  onClick={() => setPopup(null)}
                >
                  Batal
                </button>
                <button
                  className={styles.destructive}
                  disabled={busy || popup.id === ownId}
                  onClick={() =>
                    void run(
                      () => edge({ action: "delete", id: popup.id }),
                      true,
                    )
                  }
                >
                  {busy ? "Menghapus..." : "Hapus Pengguna"}
                </button>
              </footer>
            </div>
          )
        )}
      </dialog>
    </section>
  );
}
