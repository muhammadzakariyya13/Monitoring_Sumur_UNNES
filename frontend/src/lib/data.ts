export type MonitoringType = "WELL" | "BUILDING";
export interface MonitoringLocation {
  id: string;
  code: string;
  type: MonitoringType;
  name: string;
  area: string;
  lat: number;
  lng: number;
  flow: number | null;
  updatedAt: string;
  active: boolean;
  occupants: number | null;
}
export type Reading = { locationId: string; at: string; liters: number };
export type Snapshot = {
  locations: MonitoringLocation[];
  readings: Reading[];
  generatedAt: string;
};
export interface WaterRepository {
  load(): Promise<Snapshot>;
}
export const number = (value: number, digits = 1) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(
    value,
  );
export const wibDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const wibTime = (date: string) =>
  !date
    ? "Belum ada pembacaan"
    : new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(date)) + " WIB";
export function bounds(start: string, end: string) {
  return [
    new Date(`${start}T00:00:00+07:00`).getTime(),
    new Date(`${end}T00:00:00+07:00`).getTime() + 86400000,
  ];
}
export function selectReadings(
  readings: Reading[],
  start: string,
  end: string,
  id = "all",
) {
  const [a, b] = bounds(start, end);
  return readings.filter(
    (r) =>
      (id === "all" || r.locationId === id) &&
      Date.parse(r.at) >= a &&
      Date.parse(r.at) < b,
  );
}
export function aggregate(readings: Reading[], mode: "hour" | "day" | "month") {
  const result = new Map<string, number>();
  for (const r of readings) {
    const local = new Date(Date.parse(r.at) + 7 * 3600000).toISOString();
    const key = local.slice(0, mode === "hour" ? 13 : mode === "day" ? 10 : 7);
    result.set(key, (result.get(key) ?? 0) + r.liters);
  }
  return [...result]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, liters]) => ({
      key,
      label: mode === "hour" ? key.slice(11) + ":00" : key.slice(5),
      volume: +(liters / 1000).toFixed(3),
    }));
}
