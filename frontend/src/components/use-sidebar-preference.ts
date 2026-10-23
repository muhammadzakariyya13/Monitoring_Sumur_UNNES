"use client";
import { useSyncExternalStore } from "react";

const KEY = "simara-sidebar-collapsed";
const EVENT = "simara-sidebar-change";
let fallback = false;
let storageAvailable = true;
function snapshot() {
  if (!storageAvailable) return fallback;
  try { return localStorage.getItem(KEY) === "true"; }
  catch { storageAvailable = false; return fallback; }
}
function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(EVENT, listener);
  };
}
export function useSidebarPreference() {
  const collapsed = useSyncExternalStore(subscribe, snapshot, () => false);
  function toggle() {
    fallback = !collapsed;
    try { localStorage.setItem(KEY, String(fallback)); } catch { storageAvailable = false; }
    window.dispatchEvent(new Event(EVENT));
  }
  return { collapsed, toggle };
}
