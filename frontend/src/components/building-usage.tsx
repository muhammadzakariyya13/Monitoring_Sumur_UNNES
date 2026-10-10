import { litersPerPerson, number, type MonitoringLocation } from "@/lib/data";
import styles from "./building-usage.module.css";

export function BuildingUsage({
  location,
  volumeM3,
  history = false,
  illustrative = false,
}: {
  location: MonitoringLocation;
  volumeM3: number | null;
  history?: boolean;
  illustrative?: boolean;
}) {
  if (location.type !== "BUILDING") return null;
  const average = litersPerPerson(volumeM3, location.occupants);
  const headcount = location.occupants;
  return (
    <section className={styles.summary} aria-label="Pemakaian per orang Gedung">
      <dl>
        <div>
          <dt>Jumlah pegawai</dt>
          <dd>
            {headcount != null && Number.isInteger(headcount) && headcount >= 0
              ? `${number(headcount, 0)} orang`
              : "—"}
          </dd>
        </div>
        <div>
          <dt>Rata-rata pemakaian per orang</dt>
          <dd>
            {average === null ? (
              "—"
            ) : (
              <>
                {number(average)} <span>L/orang/hari</span>
              </>
            )}
          </dd>
        </div>
      </dl>
      <p>
        {history
          ? "Berdasarkan hari dengan data diterima dan jumlah pegawai saat ini. "
          : "Berdasarkan volume hari ini yang diterima dan jumlah pegawai saat ini. "}
        Bukan pengukuran konsumsi individu.
      </p>
      {illustrative && (
        <p>
          Jumlah pegawai adalah contoh pengembangan, bukan data resmi UNNES.
        </p>
      )}
    </section>
  );
}
