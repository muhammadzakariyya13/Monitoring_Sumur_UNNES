import { test, expect } from "@playwright/test";

test("Form sandi, domain UNNES, lupa sandi dan tautan tidak valid", async ({ page }) => {
  await page.goto("/login/");
  await page.getByLabel("Email UNNES").fill("pengguna@gmail.com");
  await page.getByLabel("Password", { exact: true }).fill("contoh-password");
  await page.getByRole("button", { name: "Tampilkan password", exact: true }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("@unnes.id");
  await page.getByRole("button", { name: "Lupa sandi?" }).click();
  await expect(page.getByRole("button", { name: "Kirim tautan reset" })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  await page.getByLabel("Email UNNES").fill("nama@unnes.id");
  await page.getByRole("button", { name: "Kirim tautan reset" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText("belum dikonfigurasi");
  await page.goto("/auth/reset-password/");
  await expect(page.locator('p[role="alert"]')).toContainText("Tautan reset tidak lengkap");
  await expect(page.getByRole("button", { name: "Simpan password" })).toHaveCount(0);
});
