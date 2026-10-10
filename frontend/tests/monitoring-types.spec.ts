import { test, expect } from "@playwright/test";
import { placeholderRepository } from "../src/lib/placeholder-data";

test("Lokasi trial dan lokasi rencana terpisah", async () => {
  const data = await placeholderRepository.load();
  expect(data.locations.filter((p) => p.active).map((p) => p.type)).toEqual([
    "WELL",
    "BUILDING",
  ]);
  expect(data.locations.filter(p => p.type === "WELL").every((p) => p.occupants === null)).toBe(true);
  expect(
    data.readings.every((r) =>
      data.locations.some((p) => p.id === r.locationId && p.active),
    ),
  ).toBe(true);
});

test("Detail gedung, jenis riwayat dan akses Viewer", async ({ page }) => {
  await page.goto("/login/");
  await page.getByRole("button", { name: "Lihat pratinjau" }).click();
  await expect(
    page.getByRole("button", { name: "Kelola Titik Monitoring" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Gedung Rektorat/ }).click();
  const detail = page.getByRole("dialog");
  await expect(detail).toContainText("Debit masuk");
  await expect(detail).toContainText("Jumlah pegawai");
  await expect(detail).toContainText("250 orang");
  await page.getByRole("button", { name: "Bulanan", exact: true }).click();
  await page.getByRole("button", { name: "Lihat riwayat titik" }).click();
  await expect(page.getByLabel("Jenis titik")).toHaveText("Gedung");
  await expect(page.getByLabel("Lokasi titik", { exact: true })).toHaveText(
    "Gedung Rektorat",
  );
  await page.getByLabel("Jenis titik").click();
  await page.getByRole("option", { name: "Sumur", exact: true }).click();
  await page.getByLabel("Lokasi titik", { exact: true }).click();
  await expect(page.getByRole("option")).toHaveCount(2);
});
