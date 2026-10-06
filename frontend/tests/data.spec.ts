import { test, expect } from "@playwright/test";
import { aggregate, bounds, selectReadings, wibDate } from "../src/lib/data";
import { isUnnesEmail } from "../src/lib/supabase";
test("Batas hari WIB dan volume interval", () => {
  const readings = [
    { locationId: "a", at: "2026-09-14T16:59:59Z", liters: 100 },
    { locationId: "a", at: "2026-09-14T17:00:00Z", liters: 250 },
    { locationId: "b", at: "2026-09-15T16:59:59Z", liters: 500 },
    { locationId: "a", at: "2026-09-15T17:00:00Z", liters: 900 },
  ];
  expect(wibDate(new Date("2026-09-14T17:00:00Z"))).toBe("2026-09-15");
  const selected = selectReadings(readings, "2026-09-15", "2026-09-15");
  expect(selected).toHaveLength(2);
  expect(aggregate(selected, "day")[0].volume).toBe(0.75);
  expect(
    selectReadings(readings, "2026-09-15", "2026-09-15", "a"),
  ).toHaveLength(1);
  const [start, end] = bounds("2024-02-29", "2024-02-29");
  expect(end - start).toBe(86400000);
});
test("Validasi domain tepat, bukan suffix atau subdomain", () => {
  expect(isUnnesEmail("nama@unnes.id")).toBe(true);
  expect(isUnnesEmail("NAMA@UNNES.ID")).toBe(true);
  for (const email of [
    "nama@gmail.com",
    "nama@students.unnes.id",
    "nama@unnes.id.evil.com",
    "nama@fakeunnes.id",
    "x@@unnes.id",
    " nama@unnes.id",
    undefined,
  ])
    expect(isUnnesEmail(email)).toBe(false);
});
