import {
  aggregate,
  type MonitoringLocation,
  type Reading,
  wibTime,
} from "./data";

export type ReportInput = {
  readings: Reading[];
  locations: MonitoringLocation[];
  start: string;
  end: string;
  period: string;
  kind: string;
  location: string;
  illustrative: boolean;
};
export const reportNote =
  "Produksi Sumur dan pemakaian Gedung disajikan terpisah, bukan total konsumsi bersih. Interval tanpa data tidak dianggap nol. Rata-rata dihitung dari hari dengan data diterima.";
export function createReport(input: ReportInput, createdAt = new Date()) {
  const mode =
    input.start === input.end
      ? "hour"
      : input.period === "Tahunan"
        ? "month"
        : "day";
  const source = input.illustrative
    ? "DATA CONTOH - bukan pengukuran resmi UNNES"
    : "Data monitoring yang diterima";
  const groups = (["WELL", "BUILDING"] as const)
    .filter((type) => input.kind === "all" || input.kind === type)
    .map((type) => {
      const ids = new Set(
        input.locations.filter((p) => p.type === type).map((p) => p.id),
      );
      const readings = input.readings.filter((r) => ids.has(r.locationId));
      const days = aggregate(readings, "day");
      const total = readings.length
        ? readings.reduce((sum, r) => sum + r.liters, 0) / 1000
        : null;
      return {
        label: type === "WELL" ? "Sumur - produksi" : "Gedung - pemakaian",
        total,
        average: total === null ? null : total / days.length,
        peak: days.length ? Math.max(...days.map((d) => d.volume)) : null,
        points: new Set(readings.map((r) => r.locationId)).size,
      };
    });
  const details = input.locations
    .flatMap((location) =>
      aggregate(
        input.readings.filter((r) => r.locationId === location.id),
        mode,
      ).map((row) => ({
        ...row,
        name: location.name,
        type: location.type === "WELL" ? "Sumur" : "Gedung",
      })),
    )
    .sort((a, b) => a.key.localeCompare(b.key) || a.name.localeCompare(b.name));
  return {
    ...input,
    created: wibTime(createdAt.toISOString()),
    source,
    groups,
    details,
    mode,
    filename: `TIRTA_UNNES_Laporan_Air_${input.start}${input.end === input.start ? "" : `_${input.end}`}`,
  };
}
export type HistoryReport = ReturnType<typeof createReport>;
export function csvField(value: string | number) {
  // Spreadsheet formulas must not be executable through user-supplied location names.
  let text = String(value);
  if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
export function reportCsv(report: HistoryReport) {
  const rows: (string | number)[][] = [
    [
      "Tanggal WIB",
      "Waktu WIB",
      "Titik monitoring",
      "Jenis titik",
      "Volume (m3)",
      "Sumber",
    ],
  ];
  const locations = new Map(report.locations.map((p) => [p.id, p]));
  for (const reading of [...report.readings].sort((a, b) =>
    a.at.localeCompare(b.at),
  )) {
    const point = locations.get(reading.locationId);
    const local = new Date(Date.parse(reading.at) + 7 * 3600000).toISOString();
    rows.push([
      local.slice(0, 10),
      local.slice(11, 19),
      point?.name ?? reading.locationId,
      point?.type === "WELL" ? "Sumur" : "Gedung",
      String(reading.liters / 1000).replace(".", ","),
      report.source,
    ]);
  }
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvField).join(";")).join("\r\n") +
    "\r\n"
  );
}
