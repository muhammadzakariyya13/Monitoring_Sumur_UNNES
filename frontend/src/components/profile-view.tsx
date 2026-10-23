"use client";

import { useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Languages,
  Moon,
  LockKeyhole,
  LogOut,
  Mail,
  Pencil,
  UserRound,
  X,
} from "lucide-react";

import { useUiCopy } from "./use-ui-copy";
import { useUiPreferences } from "./ui-preferences";
import { CustomSelect } from "./custom-select";
import { useAuth } from "./auth";
import { supabase } from "@/lib/supabase";
import styles from "./profile-view.module.css";

export function ProfileView({ adminPreview = false }: { adminPreview?: boolean }) {
  const { localize } = useUiCopy();
  const router = useRouter();
  const { user, role, logout } = useAuth();
  const { language, theme, setLanguage, setTheme, t } = useUiPreferences();

  const initialName = user?.user_metadata?.full_name || (adminPreview ? "Admin SIMARA" : "Pengguna SIMARA");

  const initialEmail = user?.email || (adminPreview ? "Akun pratinjau" : "Belum masuk akun");

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
    user?.identities?.some((identity) => identity.provider === "email") ??
    false;

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

    if (!user || !supabase) {
      setEditError("Masuk dengan akun UNNES untuk mengubah profil.");
      return;
    }

    /*
     * PRODUCTION
     * Jika sudah login, simpan ke Supabase.
     */
    setBusy(true);
    setEditError("");

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: value,
        },
      });

      if (error) throw error;

      setDisplayName(value);
      setMessage("Profil berhasil diperbarui.");

      modal.current?.close();
    } catch {
      setEditError("Profil belum tersimpan. Periksa koneksi lalu coba lagi.");
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
      setPasswordError(t("passwordShort"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordMismatch"));
      return;
    }

    if (!user || !supabase || !passwordAccount) {
      setPasswordError(t("passwordAccount"));
      return;
    }

    setBusy(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      passwordModal.current?.close();

      setNewPassword("");
      setConfirmPassword("");

      setMessage(t("passwordSaved"));
    } catch {
      setPasswordError(
        t("passwordFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (!user) { router.push("/login/"); return; }
    setBusy(true);
    setMessage("");
    setError("");

    try {
      // Jika sudah menggunakan autentikasi Supabase
      await logout();
    } catch {
      setError(t("logoutFailed"));
      setBusy(false);
    }
  }

  return localize(
    <div className={`${styles.page} ${role === "ADMIN" || adminPreview ? styles.adminMobile : ""}`}>
      {(message || error) && (
        <div
          className={`${styles.notice} ${error ? styles.noticeError : ""}`}
          role={error ? "alert" : "status"}
        >
          {error || message}
        </div>
      )}

      <section className={styles.mobileProfile} aria-label={t("profile")}>
        <div className={styles.mobileHero}>
          <div className={styles.mobileAvatar} aria-hidden="true">{user?.email ? user.email[0].toUpperCase() : <UserRound size={34} />}</div>
        </div>
        <div className={styles.mobilePanel}>
          <dl className={styles.accountInfo}>
            <div><dt>{t("status")}</dt><dd>{user ? (role === "ADMIN" ? "Admin" : "Viewer") : t("signedOut")}</dd></div>
            <div><dt>{t("email")}</dt><dd>{user?.email || t("unavailable")}</dd></div>
          </dl>
          {!user && <p className={styles.previewHint}>{t("preview")}</p>}
          <h2 className={styles.settingsHeading}>{t("settings")}</h2>
          <button type="button" className={styles.settingRow} onClick={openPasswordModal} disabled={busy || !passwordAccount}>
            <LockKeyhole size={20} /><span><strong>{t("password")}</strong><small>{!user ? t("loginHint") : passwordAccount ? t("passwordHint") : t("googleHint")}</small></span><ChevronRight size={18} />
          </button>
          <div className={styles.settingRow}><Languages size={20} /><span>{t("language")}</span><div className={styles.languageControl} id="profile-language"><CustomSelect ariaLabel={t("language")} value={language} onChange={value => setLanguage(value === "en" ? "en" : "id")} options={[{value:"id", label:"Bahasa Indonesia"},{value:"en", label:"English"}]} /></div></div>
          <div className={styles.settingRow}><Moon size={20} /><span>{t("dark")}</span><button type="button" role="switch" aria-label={t("dark")} aria-checked={theme === "dark"} className={styles.themeSwitch} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><span /></button></div>
          <button type="button" className={`${styles.settingRow} ${styles.mobileLogout}`} onClick={handleLogout} disabled={busy}><LogOut size={20} /><span>{user ? t("logout") : t("leavePreview")}</span><ChevronRight size={18} /></button>
          <p className={styles.mobileCredit}>SIMARA | Developed by <strong>Hans Elektronik Team</strong></p>
        </div>
      </section>
      <div className={styles.desktopProfile}>
      <section className={styles.profileCard} aria-label="Profil akun">
        <div className={styles.cover} aria-hidden="true" />

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
                <UserRound size={38} strokeWidth={1.8} />
              )}
            </div>

            <div className={styles.identityText}>
              <h2 translate="no">{user ? displayName : t("profile")}</h2>

              <div className={styles.email}>
                <Mail size={14} />

                <span translate="no">{user?.email || t("signedOut")}</span>
              </div>
              <span className={styles.role}>
                {user ? (role === "ADMIN" ? "Admin" : "Viewer") : t("preview")}
              </span>
            </div>
          </div>

          <button
            type="button"
            aria-label="Edit Profil"
            className={styles.editButton}
            onClick={openEditProfile}
            disabled={busy || !user}
          >
            <Pencil size={15} />
            <span>Edit Profil</span>
          </button>
        </div>
        <div className={styles.desktopColumns}>
          <section className={styles.accountPanel} aria-label="Informasi akun">
            <h3>Informasi akun</h3>
            <dl className={styles.accountInfo}>
              <div><dt>{t("status")}</dt><dd>{user ? (role === "ADMIN" ? "Admin" : "Viewer") : t("signedOut")}</dd></div>
              <div><dt>{t("email")}</dt><dd translate="no">{user?.email || t("unavailable")}</dd></div>
            </dl>
            {!user && <p className={styles.previewHint}>{t("preview")}</p>}
          </section>
          <section className={styles.settingsPanel} aria-label={t("settings")}>
            <h3>{t("settings")}</h3>
            <button type="button" className={styles.settingRow} onClick={openPasswordModal} disabled={busy || !passwordAccount}>
              <LockKeyhole size={20} /><span><strong>{t("password")}</strong><small>{!user ? t("loginHint") : passwordAccount ? t("passwordHint") : t("googleHint")}</small></span><ChevronRight size={18} />
            </button>
            <div className={styles.settingRow}><Languages size={20} /><span>{t("language")}</span><div className={styles.languageControl}><CustomSelect compact ariaLabel={t("language")} value={language} onChange={value => setLanguage(value === "en" ? "en" : "id")} options={[{value:"id", label:"Bahasa Indonesia"},{value:"en", label:"English"}]} /></div></div>
            <div className={styles.settingRow}><Moon size={20} /><span>{t("dark")}</span><button type="button" role="switch" aria-label={t("dark")} aria-checked={theme === "dark"} className={styles.themeSwitch} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><span /></button></div>
            <button type="button" className={`${styles.settingRow} ${styles.mobileLogout}`} onClick={handleLogout} disabled={busy}><LogOut size={20} /><span>{user ? t("logout") : t("leavePreview")}</span><ChevronRight size={18} /></button>
          </section>
        </div>
      </section>

      <div className={styles.footer}>
        <div>
          <strong>SIMARA</strong>
          <span>Monitoring Air Sumur dan Gedung</span>
        </div>

        <span>Universitas Negeri Semarang</span>
      </div>

      </div>
      {/* EDIT PROFILE */}
      <dialog
        ref={modal}
        aria-label="Edit Profil"
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
                <span translate="no">{initialEmail}</span>
              </div>
            </div>

            <label className={styles.field}>
              <span>Nama Lengkap</span>

              <input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </label>

            <label className={styles.field}>
              <span>Email</span>

              <div className={styles.readonlyField}>
                <Mail size={15} />

                <input type="email" value={initialEmail} readOnly />
              </div>

              <small>Email mengikuti akun login dan tidak dapat diubah.</small>
            </label>

            {editError && (
              <p className={styles.formError} role="alert">
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

            <button type="submit" className={styles.saveButton} disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </footer>
        </form>
      </dialog>

      <dialog
        ref={passwordModal}
        aria-label={t("password")}
        className={styles.modal}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <form onSubmit={changePassword}>
          <header className={styles.modalHeader}>
            <div>
              <h2>{t("password")}</h2>
              <p>{t("passwordDescription")}</p>
            </div>

            <button
              type="button"
              aria-label={t("close")}
              onClick={closePasswordModal}
              disabled={busy}
            >
              <X size={19} />
            </button>
          </header>

          <div className={styles.modalContent}>
            <label className={styles.field}>
              <span>{t("newPassword")}</span>

              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("minimum")}
              />
            </label>

            <label className={styles.field}>
              <span>{t("confirmPassword")}</span>

              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("reenter")}
              />
            </label>

            {passwordError && (
              <p className={styles.formError} role="alert">
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
              {t("cancel")}
            </button>

            <button type="submit" className={styles.saveButton} disabled={busy}>
              {busy ? t("saving") : t("password")}
            </button>
          </footer>
        </form>
      </dialog>
    </div>
  );
}
