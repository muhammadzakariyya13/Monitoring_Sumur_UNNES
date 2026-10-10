import { placeholderRepository } from "./placeholder-data";
import { supabase } from "./supabase";
import type { MonitoringLocation, Snapshot } from "./data";

export const monitoringRepository = {
  async load(preview = true): Promise<Snapshot> {
    if (preview) return placeholderRepository.load();
    if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
    const { data, error } = await supabase
      .from("monitoring_locations")
      .select("*")
      .order("name");
    if (error) throw error;
    // No telemetry adapter until hardware timestamps/volume semantics are agreed.
    const locations: MonitoringLocation[] = (data || []).map((row) => ({
      id: row.id,
      code: row.code,
      type: row.type,
      name: row.name,
      area: row.area,
      lat: row.latitude,
      lng: row.longitude,
      active: row.active,
      occupants: row.occupants,
      dailyUsageLimit: row.daily_usage_limit == null ? null : Number(row.daily_usage_limit),
      limitNotificationEnabled: row.limit_notification_enabled === true,
      flow: null,
      updatedAt: "",
    }));
    return { locations, readings: [], generatedAt: new Date().toISOString() };
  },
};
