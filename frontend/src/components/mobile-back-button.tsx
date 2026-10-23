import { ChevronLeft } from "lucide-react";
import { useUiCopy } from "./use-ui-copy";
import styles from "./mobile-back-button.module.css";

export function MobileBackButton({ onClick }: { onClick: () => void }) {
  const { uiText } = useUiCopy();
  return <button type="button" className={styles.button} aria-label={uiText("Kembali")} onClick={onClick}><span><ChevronLeft size={22} aria-hidden="true" /></span></button>;
}
