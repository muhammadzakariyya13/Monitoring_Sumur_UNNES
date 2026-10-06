import { test, expect } from "@playwright/test";

test("Riwayat: filter sumur, pagination, pencarian, dan reset", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-17T10:00:00Z") });
  await page.goto("/login/");
  await page.getByRole("button", { name: "Lihat pratinjau" }).click();
  await page.locator(".sidebar").getByRole("button", { name: "Riwayat", exact: true }).click();
  await page.getByLabel("Dari tanggal").fill("2026-09-01");
  await page.getByLabel("Sampai tanggal").fill("2026-09-16");
  await page.getByLabel("Lokasi titik", { exact: true }).selectOption("a");
  await expect(page.locator(".history-kpis article")).toHaveCount(4);
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await expect(page.locator("tbody tr").first()).toContainText("Sumur Rektorat");
  await page.getByRole("button", { name: "Halaman berikutnya" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page.getByRole("textbox", { name: "Cari periode riwayat" }).fill("2026-09-03");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("2026-09-03");
  await page.getByRole("textbox", { name: "Cari periode riwayat" }).fill("tidak ada");
  await expect(page.getByText("Tidak ada periode yang cocok.")).toBeVisible();
  await page.getByRole("button", { name: "Reset filter" }).click();
  await expect(page.getByLabel("Lokasi titik", { exact: true })).toHaveValue("all");
  await expect(page.getByRole("button", { name: "Harian", exact: true })).toHaveAttribute("aria-pressed", "true");
});
