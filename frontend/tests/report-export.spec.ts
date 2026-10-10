import { test, expect } from "@playwright/test";
import ExcelJS from "exceljs";
import { readFile, writeFile } from "node:fs/promises";
import { createReport, reportCsv } from "../src/lib/history-report";
import { excelReport, pdfReport } from "../src/lib/report-files";
import { placeholderRepository } from "../src/lib/placeholder-data";

test("Report integrity, numeric Excel, raw CSV, multi-page PDF", async ({}, info) => {
  const data = await placeholderRepository.load();
  const report = createReport({
    readings: data.readings,
    locations: data.locations,
    start: "2025-01-01",
    end: "2026-12-31",
    period: "Tahunan",
    kind: "all",
    location: "Semua titik",
    illustrative: true,
  });
  expect(report.groups).toHaveLength(2);
  const point = data.locations.find((p) => p.type === "BUILDING")!;
  const selected = data.readings
    .filter((r) => r.locationId === point.id)
    .slice(0, 24);
  for (const period of ["Harian", "Mingguan", "Bulanan", "Tahunan"]) {
    const filtered = createReport({
      ...report,
      readings: selected,
      kind: "BUILDING",
      location: point.name,
      period,
    });
    expect(filtered.groups).toHaveLength(1);
    expect(filtered.groups[0].total).toBe(
      selected.reduce((sum, r) => sum + r.liters, 0) / 1000,
    );
    expect(
      filtered.details.every(
        (r) => r.name === point.name && r.type === "Gedung",
      ),
    ).toBe(true);
  }

  for (const group of report.groups) expect(group.total).toBeGreaterThan(0);
  expect(reportCsv(report).startsWith('\uFEFF"Tanggal WIB";')).toBe(true);
  const bytes = await excelReport(report);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(new Uint8Array(bytes).buffer);
  const sheet = book.getWorksheet("Rincian")!;
  expect(sheet.getCell("B2").value).toBeInstanceOf(Date);
  expect(typeof sheet.getCell("F2").value).toBe("number");
  expect(sheet.views[0].state).toBe("frozen");
  expect(sheet.autoFilter).toBeTruthy();
  const pdf = await pdfReport({
    ...report,
    details: Array.from({ length: 180 }, (_, i) => ({
      ...report.details[i % report.details.length],
      name: "Gedung dengan nama panjang untuk menguji pembungkusan teks",
    })),
  });
  const text = Buffer.from(pdf).toString("latin1");
  expect((text.match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(1);
  await writeFile(info.outputPath("report.pdf"), pdf);
  await info.attach("report.pdf", {
    body: Buffer.from(pdf),
    contentType: "application/pdf",
  });
  const empty = createReport({ ...report, readings: [] });
  expect(empty.groups.every((g) => g.total === null)).toBe(true);
  expect(empty.details).toHaveLength(0);
  expect(
    reportCsv({
      ...empty,
      readings: [
        {
          locationId: data.locations[0].id,
          at: "2026-10-08T00:00:00Z",
          liters: 1000,
        },
      ],
      locations: [{ ...data.locations[0], name: '=SUM(1;2)"' }],
    }),
  ).toContain('"\'=SUM(1;2)"""');
});
for (const width of [390, 1440])
  test(`Download formats ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/demo/");
    await page
      .locator(width < 640 ? ".bottom-nav" : ".sidebar")
      .getByRole("button", { name: "Riwayat", exact: true })
      .click();
    for (const [label, extension] of [
      ["Excel (.xlsx)", "xlsx"],
      ["PDF (.pdf)", "pdf"],
      ["CSV (.csv) - Data mentah", "csv"],
    ]) {
      await page
        .getByRole("button", { name: "Unduh Laporan", exact: true })
        .click();
      const menu = page.getByRole("group", {name:"Format laporan"});
      await expect(menu).toBeVisible();
      const box=await menu.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y+box!.height).toBeLessThan(760);
      await page.screenshot({ path: `test-results/report-menu-${width}.png` });
      const download = page.waitForEvent("download");
      await page.getByRole("button", { name: label, exact: true }).click();
      const file = await download;
      expect(file.suggestedFilename()).toMatch(
        new RegExp(`TIRTA_UNNES_Laporan_Air_.*\\.${extension}$`),
      );
      const bytes = await readFile((await file.path())!);
      expect(bytes.length).toBeGreaterThan(100);
      if (extension === "xlsx") {
        const book = new ExcelJS.Workbook();
        await book.xlsx.load(new Uint8Array(bytes).buffer);
        expect(book.getWorksheet("Ringkasan")!.getCell("A8").text).toContain(
          "DATA CONTOH",
        );
      }
      if (extension === "csv")
        expect(bytes.subarray(0, 3).equals(Buffer.from([239, 187, 191]))).toBe(
          true,
        );
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
