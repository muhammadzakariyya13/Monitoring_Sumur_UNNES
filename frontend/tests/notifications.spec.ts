import { test, expect } from "@playwright/test";
test("Lokasi rencana tidak dianggap perangkat terputus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login/");
  await page.getByRole("button", { name: "Lihat pratinjau" }).click();
  await page.getByRole("button", { name: "Notifikasi, 0 belum dibaca" }).click();
  await expect(page.getByText("Tidak ada perangkat terputus.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Tandai dibaca" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Tidak ada perangkat terputus.")).toHaveCount(0);
});
