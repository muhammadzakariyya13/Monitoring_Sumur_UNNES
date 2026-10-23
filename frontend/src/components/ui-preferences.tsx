"use client";
import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";

type Language = "id" | "en";
type Theme = "light" | "dark";
type Preferences = { language: Language; theme: Theme };
const KEY = "simara-ui-preferences";
const EVENT = "simara-ui-preferences-change";
const DEFAULT = '{"language":"id","theme":"light"}';
let memory = DEFAULT;
let storageAvailable = true;
function read() { try { return storageAvailable ? localStorage.getItem(KEY) || DEFAULT : memory; } catch { storageAvailable = false; return memory; } }
function parse(raw: string): Preferences {
  try { const value = JSON.parse(raw); return { language: value.language === "en" ? "en" : "id", theme: value.theme === "dark" ? "dark" : "light" }; }
  catch { return { language: "id", theme: "light" }; }
}
function apply(value: Preferences) { document.documentElement.dataset.theme = value.theme; document.documentElement.lang = value.language; }
function subscribe(listener: () => void) {
  const update = () => { apply(parse(read())); listener(); };
  window.addEventListener(EVENT, update); window.addEventListener("storage", update);
  return () => { window.removeEventListener(EVENT, update); window.removeEventListener("storage", update); };
}
const messages = {
  id: { dashboard: "Dashboard", home: "Beranda", map: "Peta", mapTitle: "Peta monitoring", history: "Riwayat", profile: "Profil", manage: "Kelola", users: "Pengguna", locations: "Kelola Titik Monitoring", settings: "Pengaturan", status: "Status akun", signedOut: "Belum masuk akun", email: "Email / Username", unavailable: "Tidak tersedia", password: "Ubah kata sandi", passwordHint: "Perbarui keamanan akun", googleHint: "Kata sandi dikelola melalui akun Google", loginHint: "Masuk untuk mengubah kata sandi", language: "Bahasa", dark: "Mode gelap", logout: "Keluar akun", leavePreview: "Keluar dari pratinjau", preview: "Mode pratinjau - belum masuk akun", newPassword: "Kata Sandi Baru", confirmPassword: "Konfirmasi Kata Sandi", passwordDescription: "Perbarui kata sandi akun Anda", close: "Tutup", cancel: "Batal", saving: "Menyimpan...", minimum: "Minimal 8 karakter", reenter: "Masukkan kembali kata sandi", passwordShort: "Kata sandi minimal terdiri dari 8 karakter.", passwordMismatch: "Konfirmasi kata sandi tidak sesuai.", passwordAccount: "Perubahan sandi memerlukan akun email.", passwordSaved: "Kata sandi berhasil diperbarui.", passwordFailed: "Kata sandi belum berhasil diperbarui. Silakan coba lagi.", logoutFailed: "Gagal keluar. Silakan coba lagi." },
  en: { dashboard: "Dashboard", home: "Home", map: "Map", mapTitle: "Monitoring map", history: "History", profile: "Profile", manage: "Manage", users: "Users", locations: "Monitoring locations", settings: "Settings", status: "Account status", signedOut: "Not signed in", email: "Email / Username", unavailable: "Unavailable", password: "Change password", passwordHint: "Update account security", googleHint: "Your password is managed by Google", loginHint: "Sign in to change your password", language: "Language", dark: "Dark mode", logout: "Sign out", leavePreview: "Leave preview", preview: "Preview mode - not signed in", newPassword: "New password", confirmPassword: "Confirm password", passwordDescription: "Update your account password", close: "Close", cancel: "Cancel", saving: "Saving...", minimum: "At least 8 characters", reenter: "Re-enter your password", passwordShort: "Use at least 8 characters.", passwordMismatch: "The passwords do not match.", passwordAccount: "An email/password account is required.", passwordSaved: "Password updated.", passwordFailed: "Could not update your password. Please try again.", logoutFailed: "Could not sign out. Please try again." }
};
type MessageKey = keyof typeof messages.id;
const Context = createContext({ language: "id" as Language, theme: "light" as Theme, setLanguage: (value: Language) => { void value; }, setTheme: (value: Theme) => { void value; }, t: (key: MessageKey): string => messages.id[key] });
export function UiPreferencesProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, read, () => DEFAULT);
  const preferences = parse(raw);
  useEffect(() => { apply(parse(read())); }, []);
  function update(value: Partial<Preferences>) {
    const next = { ...parse(read()), ...value }; memory = JSON.stringify(next);
    try { localStorage.setItem(KEY, memory); } catch { storageAvailable = false; }
    apply(next); window.dispatchEvent(new Event(EVENT));
  }
  return <Context.Provider value={{ ...preferences, setLanguage: language => update({language}), setTheme: theme => update({theme}), t: key => messages[preferences.language][key] }}>{children}</Context.Provider>;
}
export const useUiPreferences = () => useContext(Context);
