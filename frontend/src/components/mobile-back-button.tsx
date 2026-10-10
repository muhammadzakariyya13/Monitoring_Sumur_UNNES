import { ChevronLeft } from "lucide-react";
import styles from "./mobile-back-button.module.css";

export function MobileBackButton({ onClick }: { onClick: () => void }) {
  return <button type="button" className={styles.button} aria-label="Kembali" onClick={onClick}><span><ChevronLeft size={22} aria-hidden="true" /></span></button>;
}
