import type { MonitoringLocation, Reading, WaterRepository } from "./data";
// Volume merupakan jumlah interval simulasi, bukan penjumlahan debit.
export const placeholderRepository: WaterRepository = {
  async load() {
    const now = new Date();
    const hour = Math.floor(now.getTime() / 3600000) * 3600000;
    const locations: MonitoringLocation[] = [
      {
        id: "a",
        code: "SMR-RKT",
        type: "WELL",
        active: true,
        occupants: null,
        name: "Sumur Rektorat",
        area: "Area Rektorat",
        lat: -7.0475,
        lng: 110.394,
        flow: 16.4,
        updatedAt: new Date(now.getTime() - 45000).toISOString(),
      },
      {
        id: "b",
        code: "GDG-RKT",
        type: "BUILDING",
        active: true,
        occupants: null,
        name: "Gedung Rektorat",
        area: "Area Rektorat",
        lat: -7.0505,
        lng: 110.392,
        flow: 8.2,
        updatedAt: new Date(now.getTime() - 90000).toISOString(),
      },
      {
        id: "c",
        code: "GDG-DSIH",
        type: "BUILDING",
        active: false,
        occupants: null,
        name: "DSIH",
        area: "Lokasi rencana DSIH",
        lat: -7.053,
        lng: 110.395,
        flow: null,
        updatedAt: new Date(now.getTime() - 3 * 3600000).toISOString(),
      },
    ];
    locations.push({
      id: "d",
      code: "GDG-ARS",
      type: "BUILDING",
      name: "Arsip",
      area: "Lokasi rencana Arsip",
      lat: -7.052,
      lng: 110.396,
      active: false,
      occupants: null,
      flow: null,
      updatedAt: now.toISOString(),
    });
    const readings: Reading[] = [];
    for (let h = 0; h < 24 * 730; h++) {
      const at = new Date(hour - h * 3600000);
      locations.forEach((w, i) => {
        if (!w.active) return;
        const localHour = (at.getUTCHours() + 7) % 24;
        const liters = Math.round(
          (localHour > 5 && localHour < 19 ? 380 : 95) *
            (1 - i * 0.25) *
            (1 + 0.18 * Math.sin(h * 1.7 + i)),
        );
        readings.push({ locationId: w.id, at: at.toISOString(), liters });
      });
    }
    return { locations, readings, generatedAt: now.toISOString() };
  },
};
