"use client";

import { Search, X } from "lucide-react";
import { useUiCopy } from "./use-ui-copy";
import styles from "./search-field.module.css";

export function SearchField({ value, onChange, placeholder, ariaLabel, onClear }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  onClear?: () => void;
}) {
  const { uiText } = useUiCopy();
  return (
    <div className={styles.root}>
      <Search size={20} aria-hidden="true" />
      <input
        className={styles.input}
        type="search"
        aria-label={uiText(ariaLabel)}
        placeholder={uiText(placeholder)}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value && onClear && (
        <button className={styles.clear} type="button" aria-label={uiText("Hapus pencarian")} onClick={onClear}>
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
