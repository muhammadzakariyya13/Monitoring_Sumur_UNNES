import { expect, test } from "@playwright/test";
for (const width of [390, 1440]) {
  test(`Admin ${width}px requires login, demo stays Viewer`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/login\//);
    await expect(page.getByRole("button", { name: "Tambah Pengguna" })).toHaveCount(0);
    await page.goto("/demo/");
    await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pengguna", exact: true })).toHaveCount(0);
  });
}
