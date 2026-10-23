// Run against the existing dev server. Saves affect only /demo/admin/ preview state.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
let checks = 0;
try {
  for (const theme of ["light", "dark"])
    for (const language of ["id", "en"]) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(
        ({ theme, language }) =>
          localStorage.setItem(
            "simara-ui-preferences",
            JSON.stringify({ theme, language }),
          ),
        { theme, language },
      );
      await page.goto(
        `${process.env.SIMARA_CHECK_URL || "http://localhost:3000"}/demo/admin/`,
      );
      await page.locator(".bottom-nav").waitFor();
      await page.addStyleTag({
        content: "nextjs-portal{display:none!important}",
      });
      for (const width of [320, 360, 375, 390, 414, 430, 1024, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        if (width < 641) {
          await page
            .locator(".bottom-nav .nav-item")
            .filter({ hasText: language === "id" ? "Kelola" : "Manage" })
            .click();
          const title = page.locator(".management-hub strong").first();
          assert.equal(
            await title.evaluate((e) => getComputedStyle(e).color),
            theme === "dark" ? "rgb(243, 247, 252)" : "rgb(32, 56, 78)",
          );
          await page.locator(".management-hub button").first().click();
        } else {
          await page
            .locator(".sidebar .nav-item")
            .filter({
              hasText:
                language === "id"
                  ? "Kelola Titik Monitoring"
                  : "Manage monitoring points",
            })
            .click();
        }
        const filters = page.locator(".periods");
        await filters
          .getByRole("button", {
            name: language === "id" ? "Sumur" : "Well",
            exact: true,
          })
          .click();
        assert.equal(
          await page.locator('article[aria-label="Gedung Rektorat"]').count(),
          0,
        );
        await filters
          .getByRole("button", {
            name: language === "id" ? "Semua" : "All",
            exact: true,
          })
          .click();
        await page
          .getByRole("button", { name: "Edit Gedung Rektorat", exact: true })
          .click();
        const dialog = page.getByRole("dialog");
        const employee = dialog.getByRole("textbox", {
          name: language === "id" ? "Jumlah pegawai" : "Employee count",
          exact: true,
        });
        assert.equal(await employee.getAttribute("inputmode"), "numeric");
        assert.equal(await employee.getAttribute("type"), "text");
        const rect = await dialog.boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1);
        assert.ok(rect.y >= 0 && rect.y + rect.height <= 845);
        const kind = dialog.getByRole("combobox");
        await kind.click();
        assert.equal(await dialog.getByRole("listbox").isVisible(), true);
        await kind.press("Escape");
        await employee.fill("250");
        await employee.fill("");
        assert.equal(await employee.inputValue(), "");
        for (const invalid of ["abc", "-1", "2.5", "1e3"]) {
          await employee.fill(invalid);
          assert.equal(
            await employee.evaluate((e) => e.checkValidity()),
            false,
          );
        }
        await employee.fill("250");
        await dialog
          .getByRole("textbox", { name: "Latitude", exact: true })
          .fill("-7.051234");
        await dialog
          .getByRole("textbox", { name: "Longitude", exact: true })
          .fill("110.394567");
        const active = dialog.getByRole("switch");
        assert.equal(await active.isChecked(), true);
        await active.click();
        assert.equal(await active.isChecked(), false);
        await active.click();
        await dialog
          .getByRole("button", {
            name: language === "id" ? "Simpan" : "Save",
            exact: true,
          })
          .click();
        await dialog.waitFor({ state: "hidden" });
        await page
          .getByRole("button", { name: "Edit Gedung Rektorat", exact: true })
          .click();
        assert.equal(await employee.inputValue(), "250");
        assert.equal(
          await dialog
            .getByRole("textbox", { name: "Latitude", exact: true })
            .inputValue(),
          "-7.051234",
        );
        await dialog
          .getByRole("button", {
            name: language === "id" ? "Batal" : "Cancel",
            exact: true,
          })
          .click();
        await page.evaluate(() => document.activeElement?.blur());
        if (width < 641) {
          await page
            .locator(".bottom-nav .nav-item")
            .filter({ hasText: language === "id" ? "Kelola" : "Manage" })
            .click();
          await page.locator(".management-hub button").last().click();
        } else {
          await page
            .locator(".sidebar .nav-item")
            .filter({ hasText: language === "id" ? "Pengguna" : "Users" })
            .click();
        }
        assert.ok(
          await page
            .locator('article[aria-label="viewer@example.invalid"]')
            .isVisible(),
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        checks++;
      }
      await page.close();
      console.log(
        `${theme}/${language}: menus, filters, form validation, preview save/edit and users passed`,
      );
    }
  assert.deepEqual(errors, []);
  console.log(
    `${checks} viewport/theme/language combinations passed; no page errors.`,
  );
} finally {
  await browser.close();
}
