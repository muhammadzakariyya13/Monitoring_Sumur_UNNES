// Run against the existing dev server: node scripts/check-theme.mjs
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
const widths = [320, 360, 375, 390, 414, 430, 1440];
const baseURL = process.env.SIMARA_CHECK_URL || "http://localhost:3000";
let checks = 0;
try {
  for (const theme of ["light", "dark"]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript((theme) => {
      localStorage.setItem("simara-ui-preferences", JSON.stringify({ theme, language: "id" }));
    }, theme);
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/demo/`);
    await page.locator(".bottom-nav").waitFor();
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const surface = theme === "dark" ? "rgb(20, 40, 63)" : "rgb(255, 255, 255)";
    const navigate = async (name, width = 390) => {
      const target = width > 640 && name === "Profil"
        ? page.locator(".sidebar-footer")
        : page.locator(`${width > 640 ? ".sidebar" : ".bottom-nav"} .nav-item`).filter({ hasText: name }).first();
      await target.click();
    };
    const background = (locator) => locator.evaluate((element) => getComputedStyle(element).backgroundColor);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      for (const name of ["Beranda", "Peta", "Riwayat", "Profil"]) {
        await navigate(name, width);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${theme}/${width}/${name}: overflow`);
        checks++;
      }
      await navigate("Riwayat", width);
      for (const control of await page.locator(".date-fields [role=combobox]").all()) {
        assert.equal(await background(control), theme === "dark" ? surface : "rgb(250, 252, 254)");
        await control.click();
        assert.equal(await background(page.getByRole("listbox")), surface);
        await control.press("Escape");
        checks++;
      }
      await navigate("Beranda", width);
      assert.equal(await background(page.locator(".well-row").first()), surface);
      assert.equal(await background(page.getByRole("button", { name: "Buka peta lengkap" })), "rgba(0, 0, 0, 0)");
      checks += 2;
    }
    await page.setViewportSize({ width: 390, height: 700 });
    await navigate("Riwayat");
    const date = page.getByRole("button", { name: "Dari tanggal", exact: true });
    await date.focus();
    assert.equal(await date.evaluate((element) => element === document.activeElement), true);
    await page.getByRole("button", { name: "Reset filter" }).click();
    await page.getByRole("button", { name: "Unduh Laporan" }).click();
    assert.equal(await page.getByRole("button", { name: /CSV/ }).isVisible(), true);
    await page.keyboard.press("Escape");
    await navigate("Peta");
    const handle = page.getByRole("button", { name: "Perluas daftar titik" });
    await handle.click();
    assert.equal(await page.getByRole("button", { name: "Kecilkan daftar titik" }).getAttribute("aria-expanded"), "true");
    await page.getByRole("button", { name: "Kecilkan daftar titik" }).click();
    await page.getByRole("button", { name: "Cari dan filter titik" }).click();
    assert.equal(await page.locator("#map-search-filters").isVisible(), true);
    await page.getByRole("button", { name: "Kecilkan daftar titik" }).click();
    await page.locator('button[aria-controls="notification-list"]').click();
    assert.equal(await page.locator("#notification-list").isVisible(), true);
    await page.keyboard.press("Escape");
    await navigate("Beranda");
    const chart = page.locator(".chart").first();
    await chart.scrollIntoViewIfNeeded();
    const plot = await chart.boundingBox();
    assert.ok(plot);
    for (let x = 45; x < plot.width - 20; x += 25) {
      await page.mouse.move(plot.x + x, plot.y + 130);
    }
    await page.locator(".recharts-tooltip-wrapper").first().waitFor({ state: "visible" });
    assert.equal(await background(page.locator(".recharts-default-tooltip").first()), theme === "dark" ? "rgb(27, 52, 79)" : "rgb(247, 250, 255)");
    await page.locator(".well-row").first().click();
    assert.equal(await background(page.locator(".detail-panel")), surface);
    assert.equal(await page.locator(".detail-panel .chart").isVisible(), true);
    checks += 9;
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`${checks} theme/layout/interaction checks passed; no page errors.`);
} finally {
  await browser.close();
}
