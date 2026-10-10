import {
  selectReadings,
  wibDate,
  type MonitoringLocation,
  type Snapshot,
} from "./data";

export function getUsageLimitStatus(
  actual: number | null | undefined,
  limit: number | null | undefined,
) {
  if (limit == null || !Number.isFinite(limit) || limit <= 0)
    return { status: "UNSET" as const };
  if (actual == null || !Number.isFinite(actual) || actual < 0)
    return { status: "NO_DATA" as const, limit };
  const usagePercent = (actual / limit) * 100;
  const remaining = limit - actual;
  const exceededPercent = Math.max(0, ((actual - limit) / limit) * 100);
  if (![usagePercent, remaining, exceededPercent].every(Number.isFinite))
    return { status: "NO_DATA" as const, limit };
  return {
    status: actual > limit ? ("LIMIT_EXCEEDED" as const) : ("NORMAL" as const),
    actual,
    limit,
    usagePercent,
    remaining,
    exceededPercent,
  };
}

// Use the current WIB day, never silently treat yesterday's snapshot as today's usage.
export function getDailyUsage(data: Snapshot, id: string, now = new Date()) {
  const day = wibDate(now);
  const readings = selectReadings(data.readings, day, day, id).filter(
    (r) =>
      Number.isFinite(r.liters) &&
      r.liters >= 0 &&
      Date.parse(r.at) <= now.getTime(),
  );
  const total = readings.reduce((sum, r) => sum + r.liters, 0) / 1000;
  const last = readings.reduce<string | null>(
    (latest, r) =>
      !latest || Date.parse(r.at) > Date.parse(latest) ? r.at : latest,
    null,
  );
  return {
    day,
    actual: readings.length && Number.isFinite(total) ? total : null,
    last,
  };
}

export function getLimitAlerts(data: Snapshot, now = new Date()) {
  return data.locations.flatMap((location: MonitoringLocation) => {
    if (
      location.type !== "BUILDING" ||
      !location.active ||
      !location.limitNotificationEnabled
    )
      return [];
    const daily = getDailyUsage(data, location.id, now);
    const usage = getUsageLimitStatus(daily.actual, location.dailyUsageLimit);
    if (usage.status !== "LIMIT_EXCEEDED") return [];
    return [
      {
        id: `limit:${location.id}:${daily.day}`,
        location,
        usage,
        at: daily.last,
      },
    ];
  });
}
