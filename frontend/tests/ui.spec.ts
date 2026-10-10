import { test, expect } from "@playwright/test";
test("Login guard, demo, peta, detail, laporan dan keluar", async ({
  page,
}) => {
  const failures: string[] = [];
  // Uji fallback tile secara deterministik tanpa bergantung jaringan penyedia peta.
  await page.route("**/*.tile.openstreetmap.org/**", (route) => route.abort());
  page.on("pageerror", (e) => failures.push(e.message));
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\//);
  await page.getByRole("button", { name: "Masuk dengan Google UNNES" }).click();
  await expect(page.locator('p[role="alert"]')).toContainText(
    "belum dikonfigurasi",
  );
  await page.getByRole("button", { name: "Lihat pratinjau" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.screenshot({
    path: "test-results/dashboard-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: /DSIH/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Direncanakan");
  await expect(page.getByRole("dialog")).toContainText("Debit tidak tersedia");
  await page.getByRole("button", { name: "Tutup detail" }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Peta", exact: true })
    .click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await expect(
    page.getByText("Peta dasar tidak tersedia. Pilih titik melalui daftar."),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Cari titik" }).fill("tidak ada");
  await expect(page.getByText("Tidak ada titik yang cocok.")).toBeVisible();
  await page.getByRole("textbox", { name: "Cari titik" }).fill("");
  await page.locator(".leaflet-interactive").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Lihat riwayat titik" }).click();
  await page.getByRole("combobox", { name: "Periode", exact: true }).click();
    await page.getByRole("option", { name: "Tahunan", exact: true }).click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh Laporan" }).click();
    await page.getByRole("button", {name: "CSV (.csv) - Data mentah", exact:true}).click();
  expect((await download).suggestedFilename()).toContain("TIRTA_UNNES_Laporan_Air_");
  await page.getByLabel("Dari tanggal").fill("2030-01-01");
  await expect(page.locator('p[role="alert"]')).toContainText("Tanggal akhir");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Profil", exact: true })
    .click();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/login\//);
  expect(failures).toEqual([]);
});
test("Mobile tanpa overflow dan callback gagal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login/");
  await page.getByRole("button", { name: "Lihat pratinjau" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.locator(".bottom-nav")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
  });
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "Peta", exact: true })
    .click();
  await page.getByRole("button", { name: /Sumur Rektorat/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "test-results/detail-mobile.png" });
  await page.goto("/auth/callback/?error=access_denied");
  await expect(page.locator('p[role="alert"]')).toContainText("dibatalkan");
});

test("Manifest, ikon dan fallback offline pada hasil static export", async ({
  page,
  context,
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).display).toBe("standalone");
  expect((await request.get("/icon-192.png")).ok()).toBe(true);
  expect((await request.get("/icon-512.png")).ok()).toBe(true);
  await page.goto("/login/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Koneksi terputus" }),
  ).toBeVisible();
  await context.setOffline(false);
});
