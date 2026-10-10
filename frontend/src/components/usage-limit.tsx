import { number } from "@/lib/data";
import { getUsageLimitStatus } from "@/lib/usage-limits";
import styles from "./usage-limit.module.css";

export function UsageLimit({
  actual,
  limit,
  enabled,
  illustrative = false,
}: {
  actual: number | null;
  limit?: number | null;
  enabled?: boolean;
  illustrative?: boolean;
}) {
  const result = getUsageLimitStatus(actual, limit);
  const hasUsage =
    result.status === "NORMAL" || result.status === "LIMIT_EXCEEDED";
  return (
    <section className={styles.summary} aria-label="Batas pemakaian Gedung">
      <div className={styles.heading}>
        <strong>Batas pemakaian harian</strong>
        <span
          className={result.status === "LIMIT_EXCEEDED" ? styles.warning : ""}
        >
          {result.status === "UNSET"
            ? "Belum ditetapkan"
            : result.status === "NO_DATA"
              ? "Menunggu data"
              : result.status === "NORMAL"
                ? "Normal"
                : "Melebihi batas pemakaian"}
        </span>
      </div>
      {hasUsage ? (
        <>
          <p>
            <strong>{number(result.actual)} m³</strong> dari batas{" "}
            {number(result.limit)} m³
          </p>
          <progress
            aria-label="Pemakaian terhadap batas harian"
            max={100}
            value={Math.min(100, result.usagePercent)}
            aria-valuetext={`${number(result.usagePercent)}% dari batas harian`}
          />
          <p>
            {number(result.usagePercent)}% dari batas harian ·{" "}
            {result.status === "LIMIT_EXCEEDED"
              ? `Melebihi batas sebesar ${number(result.exceededPercent)}%`
              : `Sisa ${number(result.remaining)} m³`}
          </p>
        </>
      ) : (
        result.status === "NO_DATA" && (
          <p>
            Batas {number(result.limit)} m³/hari. Pemakaian hari ini belum
            tersedia.
          </p>
        )
      )}
      {result.status !== "UNSET" && (
        <small>
          Notifikasi batas: {enabled ? "Aktif" : "Nonaktif"}. Volume berdasarkan
          interval yang diterima (WIB).
        </small>
      )}
      {illustrative && result.status !== "UNSET" && (
        <small>Batas contoh pengembangan, bukan kebijakan resmi UNNES.</small>
      )}
    </section>
  );
}
