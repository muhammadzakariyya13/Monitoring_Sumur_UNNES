import { test, expect } from "@playwright/test";

for (const width of [360, 375, 390, 400, 430, 768, 1024, 1366, 1440, 1920]) {
  test(`Riwayat ${width}px: periode, tanggal, CSV dan batas layar`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/demo/");
    await page
      .locator(width <= 640 ? ".bottom-nav" : ".sidebar")
      .getByRole("button", { name: "Riwayat", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Penggunaan air", exact: true }),
    ).toBeVisible();
    if (width <= 640) {
      expect(
        (await page.getByRole("button", { name: "Unduh Laporan" }).boundingBox())!
          .width,
      ).toBeLessThan(width / 2);
    }
    for (const name of [
      "Harian",
      "Mingguan",
      "Bulanan",
      "Tahunan",
      "Rentang tanggal",
    ]) {
      const button = page.getByRole("combobox", { name: "Periode", exact: true });
      await button.click();
      await page.getByRole("option", {name, exact:true}).click();
      await expect(button).toHaveText(name);
      const bounds = await button.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    await page.getByLabel("Jenis titik", { exact: true }).click();
    await page.getByRole("option", { name: "Sumur", exact: true }).click();
    await page.getByLabel("Lokasi titik", { exact: true }).click();
    await page
      .getByRole("option", { name: "Sumur Rektorat", exact: true })
      .click();
    const end = await page.getByLabel("Sampai tanggal").inputValue();
    await page.getByLabel("Dari tanggal").fill(end);
    await page.getByLabel("Sampai tanggal").fill(end);
    await expect(page.getByRole("combobox", { name: "Periode", exact: true })).toHaveText("Rentang tanggal");
    for (const label of [
      "Jenis titik",
      "Lokasi titik",
      "Dari tanggal",
      "Sampai tanggal",
    ]) {
      const bounds = await page
        .getByLabel(label, { exact: true })
        .boundingBox();
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Unduh Laporan" }).click();
    await page.getByRole("button", {name: "CSV (.csv) - Data mentah", exact:true}).click();
    expect((await download).suggestedFilename()).toContain("TIRTA_UNNES_Laporan_Air_");
    await page.getByRole("button", { name: "Reset filter" }).click();
    await expect(page.getByLabel("Jenis titik", { exact: true })).toHaveText(
      "Semua",
    );
    await expect(page.getByLabel("Lokasi titik", { exact: true })).toHaveText(
      "Semua titik",
    );
    await expect(
      page.getByRole("combobox", { name: "Periode", exact: true }),
    ).toHaveText("Harian");
    const active = await page
      .getByRole("combobox", { name: "Periode", exact: true })
      .boundingBox();
    expect(active!.x).toBeGreaterThanOrEqual(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width <= 640) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const pagination = await page
        .locator(".history-pagination")
        .boundingBox();
      const navigation = await page.locator(".bottom-nav").boundingBox();
      expect(pagination!.y + pagination!.height).toBeLessThanOrEqual(
        navigation!.y,
      );
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/history-compact-${width}.png`,
      fullPage: true,
    });
  });
}

test("Riwayat: filter sumur, pagination, pencarian, dan reset", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-09-17T10:00:00Z") });
  await page.goto("/login/");
  await page.getByRole("button", { name: "Lihat pratinjau" }).click();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Riwayat", exact: true })
    .click();
  await page.getByLabel("Dari tanggal").fill("2026-09-01");
  await page.getByLabel("Sampai tanggal").fill("2026-09-16");
  await page.getByLabel("Lokasi titik", { exact: true }).click();
  await page
    .getByRole("option", { name: "Sumur Rektorat", exact: true })
    .click();
  await expect(page.locator(".history-kpis article")).toHaveCount(4);
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await expect(page.locator("tbody tr").first()).toContainText(
    "Sumur Rektorat",
  );
  await page.getByRole("button", { name: "Halaman berikutnya" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page
    .getByRole("textbox", { name: "Cari periode riwayat" })
    .fill("2026-09-03");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("2026-09-03");
  await page
    .getByRole("textbox", { name: "Cari periode riwayat" })
    .fill("tidak ada");
  await expect(page.getByText("Tidak ada periode yang cocok.")).toBeVisible();
  await page.getByRole("button", { name: "Reset filter" }).click();
  await expect(page.getByLabel("Lokasi titik", { exact: true })).toHaveText(
    "Semua titik",
  );
  await expect(
    page.getByRole("combobox", { name: "Periode", exact: true }),
  ).toHaveText("Harian");
});

test("Admin and Viewer share history filters and date validation", async ({ page }) => {
  for (const route of ["/demo/", "/demo/admin/"]) {
    await page.setViewportSize({width:390,height:844});
    await page.goto(route);
    await page.locator('.bottom-nav').getByRole('button',{name:'Riwayat',exact:true}).click();
    const period=page.getByRole('combobox',{name:'Periode',exact:true});
    await period.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('End'); await page.keyboard.press('Enter');
    await expect(period).toHaveText('Rentang tanggal');
    await page.getByLabel('Dari tanggal').fill('2026-10-08');
    await page.getByLabel('Sampai tanggal').fill('2026-10-01');
    await expect(page.locator('.history-view').getByRole('alert')).toContainText('Tanggal akhir');
    await expect(page.getByRole('button',{name:'Unduh Laporan'})).toBeDisabled();
    await page.getByRole('button',{name:'Reset filter'}).click();
    await expect(period).toHaveText('Harian');
    await expect(page.locator('.history-view').getByRole('alert')).toHaveCount(0);
    await expect(page.locator('.history-view .periods')).toHaveCount(0);
  }
});
