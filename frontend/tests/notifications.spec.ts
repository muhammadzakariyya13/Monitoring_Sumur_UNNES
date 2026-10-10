import { test, expect } from "@playwright/test";
test("Lokasi rencana tidak dianggap perangkat terputus", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-07T18:00:00Z") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login/");
  await page.getByRole("button", { name: "Lihat pratinjau" }).click();
  await page.getByRole("button", { name: "Notifikasi, 0 belum dibaca" }).click();
  await expect(page.getByText("Tidak ada peringatan.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tandai dibaca" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Tidak ada peringatan.")).toHaveCount(0);
});
