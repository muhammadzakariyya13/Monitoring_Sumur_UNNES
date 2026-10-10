import { expect, test } from "@playwright/test";
import {
  getDailyUsage,
  getLimitAlerts,
  getUsageLimitStatus,
} from "../src/lib/usage-limits";
import type { Snapshot } from "../src/lib/data";

const now = new Date("2026-10-07T07:20:00Z");
function snapshot(): Snapshot {
  return {
    generatedAt: now.toISOString(),
    locations: [
      {
        id: "b",
        name: "Gedung Uji",
        code: "GDG",
        type: "BUILDING",
        area: "Area",
        lat: 0,
        lng: 0,
        occupants: 250,
        active: true,
        flow: 1,
        updatedAt: now.toISOString(),
        dailyUsageLimit: 15,
        limitNotificationEnabled: true,
      },
    ],
    readings: [{ locationId: "b", at: now.toISOString(), liters: 17200 }],
  };
}
test("Limit math handles equality, zero actual, invalid limits and missing measurements", () => {
  expect(getUsageLimitStatus(12.5, 15)).toMatchObject({
    status: "NORMAL",
    remaining: 2.5,
  });
  expect(getUsageLimitStatus(12.5, 15)).toHaveProperty(
    "usagePercent",
    (12.5 / 15) * 100,
  );
  expect(getUsageLimitStatus(15, 15)).toMatchObject({
    status: "NORMAL",
    usagePercent: 100,
    exceededPercent: 0,
  });
  expect(getUsageLimitStatus(0, 15)).toMatchObject({
    status: "NORMAL",
    usagePercent: 0,
  });
  const over = getUsageLimitStatus(17.2, 15);
  expect(over.status).toBe("LIMIT_EXCEEDED");
  if (over.status === "LIMIT_EXCEEDED") {
    expect(over.exceededPercent).toBeCloseTo(14.66667);
    expect(over.remaining).toBeCloseTo(-2.2);
  }
  for (const limit of [null, undefined, 0, -1, NaN, Infinity])
    expect(getUsageLimitStatus(17.2, limit).status).toBe("UNSET");
  for (const actual of [null, undefined, -1, NaN, Infinity])
    expect(getUsageLimitStatus(actual, 15).status).toBe("NO_DATA");
  expect(getUsageLimitStatus(Number.MAX_VALUE, Number.MIN_VALUE).status).toBe(
    "NO_DATA",
  );
});
test("Alerts are per building/WIB day, not render or reading timestamp; disabled rules do not hide status", () => {
  const data = snapshot();
  const first = getLimitAlerts(data, now);
  expect(first).toHaveLength(1);
  expect(first[0].at).toBe(now.toISOString());
  data.generatedAt = new Date(now.getTime() + 1000).toISOString();
  expect(getLimitAlerts(data, new Date(now.getTime() + 1000))[0].id).toBe(
    first[0].id,
  );
  data.locations[0].limitNotificationEnabled = false;
  expect(getLimitAlerts(data, now)).toEqual([]);
  expect(
    getUsageLimitStatus(getDailyUsage(data, "b", now).actual, 15).status,
  ).toBe("LIMIT_EXCEEDED");
  data.locations[0].limitNotificationEnabled = true;
  data.locations[0].type = "WELL";
  expect(getLimitAlerts(data, now)).toEqual([]);
  data.locations[0].type = "BUILDING";
  data.locations[0].active = false;
  expect(getLimitAlerts(data, now)).toEqual([]);
  data.locations[0].active = true;
  const tomorrow = new Date(now.getTime() + 86400000);
  expect(getLimitAlerts(data, tomorrow)).toEqual([]);
  data.readings[0].at = tomorrow.toISOString();
  expect(getLimitAlerts(data, tomorrow)[0].id).not.toBe(first[0].id);
});
test("Daily totals ignore old, future, invalid and other-location readings, and do not fabricate zero", () => {
  const data = snapshot();
  data.readings = [
    { locationId: "b", at: "2026-10-06T16:59:00Z", liters: 50000 },
    { locationId: "b", at: "2026-10-06T17:00:00Z", liters: 12500 },
    { locationId: "b", at: "2026-10-07T18:00:00Z", liters: 50000 },
    { locationId: "b", at: "invalid", liters: 50000 },
    { locationId: "b", at: now.toISOString(), liters: NaN },
    { locationId: "a", at: now.toISOString(), liters: 50000 },
  ];
  expect(getDailyUsage(data, "b", now)).toMatchObject({
    day: "2026-10-07",
    actual: 12.5,
    last: "2026-10-06T17:00:00Z",
  });
  data.readings = [];
  expect(getDailyUsage(data, "b", now)).toMatchObject({
    actual: null,
    last: null,
  });
  expect(getLimitAlerts(data, now)).toEqual([]);
});

for (const width of [360, 390, 430, 768, 1366, 1440, 1920]) {
  test(`Limit notification ${width}px: read, refresh dedupe, detail and viewport`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2026-10-07T14:00:00Z") });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/demo/");
    const bell = page.getByRole("button", {
      name: "Notifikasi, 1 belum dibaca",
    });
    await bell.click();
    const panel = page.getByRole("region", { name: "Daftar notifikasi" });
    const alert = panel.getByRole("button", {
      name: /Pemakaian melebihi batas/,
    });
    await expect(alert).toHaveCount(1);
    await expect(alert).toContainText("Gedung Rektorat");
    await expect(alert).toContainText("WIB");
    await expect(panel).not.toContainText(/NaN|Infinity/);
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y + box.height).toBeLessThanOrEqual(900);
    if (width === 360 || width === 1440) await page.screenshot({ path: `test-results/limit-notification-${width}.png` });
    await panel.getByRole("button", { name: "Tandai dibaca" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Perbarui data contoh" }).click();
    await page
      .getByRole("button", { name: "Notifikasi, 0 belum dibaca" })
      .click();
    await expect(alert).toHaveCount(1);
    await alert.click();
    const detail = page.getByRole("dialog", { name: "Detail Gedung Rektorat" });
    const limit = detail.getByRole("region", {
      name: "Batas pemakaian Gedung",
    });
    await expect(limit).toContainText("Melebihi batas pemakaian");
    await expect(limit.getByRole("progressbar")).toHaveAttribute(
      "value",
      "100",
    );
    await expect(
      detail.getByRole("button", { name: "Ubah pengaturan" }),
    ).toHaveCount(0);
    await expect(detail).toContainText("250 orang");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
