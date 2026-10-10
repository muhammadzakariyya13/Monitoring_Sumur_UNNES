import { expect, test } from "@playwright/test";
import { litersPerPerson } from "../src/lib/data";

test("Per-person volume converts m3 to liters and rejects unavailable or invalid inputs", () => {
  expect(litersPerPerson(12.5, 250)).toBe(50);
  expect(litersPerPerson(67.9 / 7, 250)).toBeCloseTo(38.8);
  expect(litersPerPerson(0, 250)).toBe(0);
  for (const count of [null, undefined, 0, -1, 2.5, NaN, Infinity]) {
    expect(litersPerPerson(12.5, count)).toBeNull();
  }
  for (const volume of [null, undefined, -1, NaN, Infinity, Number.MAX_VALUE]) {
    expect(litersPerPerson(volume, 250)).toBeNull();
  }
});

for (const width of [360, 390, 430, 768, 1440]) {
  test(`Building detail/history ${width}px: per-person metrics exclude wells and mixed locations`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/demo/");
    await page.getByRole("button", { name: /Gedung Rektorat/ }).click();
    const detail = page.getByRole("dialog");
    const metrics = page.getByRole("region", {
      name: "Pemakaian per orang Gedung",
    });
    await expect(metrics).toContainText("250 orang");
    await expect(metrics).toContainText("L/orang/hari");
    await expect(metrics).toContainText("bukan data resmi UNNES");
    await expect(detail).toContainText("Pemakaian hari ini");
    await page.getByRole("button", { name: "Lihat riwayat titik" }).click();
    await page.getByRole("combobox", { name: "Periode", exact: true }).click();
    await page.getByRole("option", { name: "Mingguan", exact: true }).click();
    await expect(metrics).toContainText("hari dengan data diterima");
    await expect(metrics).not.toContainText(/NaN|Infinity/);
    const meanText = await page
      .locator(".history-kpis article")
      .filter({ hasText: "Rata-rata harian" })
      .locator("strong")
      .innerText();
    const mean = Number(
      meanText.split(" ")[0].replace(/\./g, "").replace(",", "."),
    );
    const perPersonText = await metrics.locator("dd").nth(1).innerText();
    const perPerson = Number(
      perPersonText.split(" ")[0].replace(/\./g, "").replace(",", "."),
    );
    // Both values are displayed with one decimal; allow only rounding error.
    expect(Math.abs(perPerson - (mean * 1000) / 250)).toBeLessThanOrEqual(0.26);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("combobox", { name: "Lokasi titik", exact: true })
      .click();
    await page
      .getByRole("option", { name: "Semua titik", exact: true })
      .click();
    await expect(metrics).toHaveCount(0);
    await page
      .getByRole("combobox", { name: "Jenis titik", exact: true })
      .click();
    await page.getByRole("option", { name: "Sumur", exact: true }).click();
    await expect(metrics).toHaveCount(0);
    await page.goto("/demo/");
    await page.getByRole("button", { name: /Sumur Rektorat/ }).click();
    await expect(detail).toContainText("Produksi air hari ini");
    await expect(detail).not.toContainText("Jumlah pegawai");
    await expect(metrics).toHaveCount(0);
  });
}
