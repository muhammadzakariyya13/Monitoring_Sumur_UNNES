"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import {
  ChevronRight,
  LockKeyhole,
  LogOut,
  Mail,
  Pencil,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "./auth";
import { supabase } from "@/lib/supabase";
import styles from "./profile-view.module.css";

export function ProfileView() {
  const { user, logout } = useAuth();

  const initialName =
    user?.user_metadata?.full_name || "Pengguna TIRTA UNNES";

  const initialEmail =
    user?.email || "Belum masuk akun";

  const [displayName, setDisplayName] = useState(initialName);
  const [name, setName] = useState(initialName);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");

  const modal = useRef<HTMLDialogElement>(null);
  const passwordModal = useRef<HTMLDialogElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  /*
   * Jika user login dengan email/password Supabase,
   * password dikelola oleh Supabase.
   *
   * Jika nanti login menggunakan Google/SSO,
   * password dikelola provider tersebut.
   */
  const passwordAccount =
    user?.identities?.some(
      (identity) => identity.provider === "email"
    ) ?? false;

  function openEditProfile() {
    setName(displayName);
    setMessage("");
    setError("");
    setEditError("");
    modal.current?.showModal();
  }

  function closeModal() {
    if (busy) return;

    setEditError("");
    modal.current?.close();
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();

    const value = name.trim();

    if (!value) {
      setEditError("Nama tidak boleh kosong.");
      return;
    }

    /*
     * DEMO
     * Jika belum login, perubahan hanya disimpan
     * di state lokal agar UI tetap bisa diuji.
     */
    if (!user || !supabase) { setEditError("Masuk dengan akun UNNES untuk mengubah profil."); return; }

    /*
     * PRODUCTION
     * Jika sudah login, simpan ke Supabase.
     */
    setBusy(true);
    setEditError("");

    try {
      const { error } =
        await supabase.auth.updateUser({
          data: {
            full_name: value,
          },
        });

      if (error) throw error;

      setDisplayName(value);
      setMessage("Profil berhasil diperbarui.");

      modal.current?.close();
    } catch {
      setEditError(
        "Profil belum tersimpan. Periksa koneksi lalu coba lagi."
      );
    } finally {
      setBusy(false);
    }
  }

  function openPasswordModal() {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setMessage("");
    setError("");

    passwordModal.current?.showModal();
  }

  function closePasswordModal() {
    if (busy) return;

    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");

    passwordModal.current?.close();
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();

    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError(
        "Kata sandi minimal terdiri dari 8 karakter."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "Konfirmasi kata sandi tidak sesuai."
      );
      return;
    }

    /*
     * Sementara agar form dapat diuji sebelum
     * autentikasi Supabase aktif.
     */
    if (!user || !supabase || !passwordAccount) { setPasswordError("Perubahan sandi memerlukan akun email."); return; }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      passwordModal.current?.close();

      setNewPassword("");
      setConfirmPassword("");

      setMessage("Kata sandi berhasil diperbarui.");
    } catch {
      setPasswordError(
        "Kata sandi belum berhasil diperbarui. Silakan coba lagi."
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      // Jika sudah menggunakan autentikasi Supabase
      await logout();
    } catch {
      setError("Gagal keluar. Silakan coba lagi.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      {(message || error) && (
        <div
          className={`${styles.notice} ${error ? styles.noticeError : ""
            }`}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </div>
      )}

      <section
        className={styles.profileCard}
        aria-label="Profil akun"
      >
        <div className={styles.cover}>
          <div className={styles.coverCircleOne} />
          <div className={styles.coverCircleTwo} />
        </div>

        <div className={styles.profileContent}>
          <div className={styles.identity}>
            <div className={styles.avatar}>
              {user?.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="Foto profil"
                  width={88}
                  height={88}
                  priority
                />
              ) : (
                <UserRound
                  size={38}
                  strokeWidth={1.8}
                />
              )}
            </div>

            <div className={styles.identityText}>
              <h2>{displayName}</h2>

              <div className={styles.email}>
                <Mail size={14} />

                <span>{initialEmail}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className={styles.editButton}
            onClick={openEditProfile}
            disabled={busy || !user}
          >
            <Pencil size={15} />
            <span>Edit Profil</span>
          </button>
        </div>
      </section>

      <section
        className={styles.actions}
        aria-label="Pengaturan akun"
      >
        <button
          type="button"
          onClick={openPasswordModal}
          disabled={busy || !passwordAccount}
          className={styles.action}
        >
          <span className={styles.actionMain}>
            <span className={styles.actionIcon}>
              <LockKeyhole size={19} />
            </span>

            <span className={styles.actionText}>
              <strong>Ubah Kata Sandi</strong>
              <small>Perbarui keamanan akun</small>
            </span>
          </span>

          <ChevronRight
            size={19}
            className={styles.chevron}
          />
        </button>

        <button
          type="button"
          aria-label="Keluar"
          onClick={handleLogout}
          disabled={busy}
          className={`${styles.action} ${styles.logout}`}
        >
          <span className={styles.actionMain}>
            <span
              className={`${styles.actionIcon} ${styles.logoutIcon}`}
            >
              <LogOut size={19} />
            </span>

            <span className={styles.actionText}>
              <strong>Keluar</strong>
              <small>Keluar dari akun pada perangkat ini</small>
            </span>
          </span>

          <ChevronRight
            size={19}
            className={styles.chevron}
          />
        </button>
      </section>

      <div className={styles.footer}>
        <div>
          <strong>TIRTA UNNES</strong>
          <span>
            Monitoring Air Sumur dan Gedung
          </span>
        </div>

        <span>Universitas Negeri Semarang</span>
      </div>

      {/* EDIT PROFILE */}
      <dialog
        ref={modal}
        className={styles.modal}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <form onSubmit={saveProfile}>
          <header className={styles.modalHeader}>
            <div>
              <h2>Edit Profil</h2>
              <p>Kelola informasi profil Anda</p>
            </div>

            <button
              type="button"
              aria-label="Tutup"
              onClick={closeModal}
              disabled={busy}
            >
              <X size={19} />
            </button>
          </header>

          <div className={styles.modalContent}>
            <div className={styles.modalIdentity}>
              <div className={styles.modalAvatar}>
                {user?.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Foto profil"
                    width={62}
                    height={62}
                  />
                ) : (
                  <UserRound size={27} />
                )}
              </div>

              <div>
                <strong>{displayName}</strong>
                <span>{initialEmail}</span>
              </div>
            </div>

            <label className={styles.field}>
              <span>Nama Lengkap</span>

              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="Masukkan nama lengkap"
              />
            </label>

            <label className={styles.field}>
              <span>Email</span>

              <div className={styles.readonlyField}>
                <Mail size={15} />

                <input
                  type="email"
                  value={initialEmail}
                  readOnly
                />
              </div>

              <small>
                Email mengikuti akun login dan tidak
                dapat diubah.
              </small>
            </label>

            {editError && (
              <p
                className={styles.formError}
                role="alert"
              >
                {editError}
              </p>
            )}
          </div>

          <footer className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={closeModal}
              disabled={busy}
            >
              Batal
            </button>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={busy}
            >
              {busy
                ? "Menyimpan..."
                : "Simpan Perubahan"}
            </button>
          </footer>
        </form>
      </dialog>

      <dialog
        ref={passwordModal}
        className={styles.modal}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <form onSubmit={changePassword}>
          <header className={styles.modalHeader}>
            <div>
              <h2>Ubah Kata Sandi</h2>
              <p>Perbarui kata sandi akun Anda</p>
            </div>

            <button
              type="button"
              aria-label="Tutup"
              onClick={closePasswordModal}
              disabled={busy}
            >
              <X size={19} />
            </button>
          </header>

          <div className={styles.modalContent}>
            <label className={styles.field}>
              <span>Kata Sandi Baru</span>

              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                placeholder="Minimal 8 karakter"
              />
            </label>

            <label className={styles.field}>
              <span>Konfirmasi Kata Sandi</span>

              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Masukkan kembali kata sandi"
              />
            </label>

            {passwordError && (
              <p
                className={styles.formError}
                role="alert"
              >
                {passwordError}
              </p>
            )}
          </div>

          <footer className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={closePasswordModal}
              disabled={busy}
            >
              Batal
            </button>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={busy}
            >
              {busy ? "Menyimpan..." : "Ubah Kata Sandi"}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}