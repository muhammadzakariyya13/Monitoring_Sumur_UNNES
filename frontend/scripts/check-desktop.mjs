// Uses the existing dev server; no build or authenticated writes.
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome" });
const errors = [];
let checks = 0;
const baseURL = process.env.SIMARA_CHECK_URL || "http://localhost:3000";
try {
  for (const theme of ["light", "dark"])
    for (const language of ["id", "en"]) {
      const context = await browser.newContext({
        viewport: { width: 1024, height: 900 },
      });
      await context.addInitScript(
        ({ theme, language }) => {
          if (!localStorage.getItem("simara-ui-preferences"))
            localStorage.setItem(
              "simara-ui-preferences",
              JSON.stringify({ theme, language }),
            );
        },
        { theme, language },
      );
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      const labels =
        language === "id"
          ? ["Beranda", "Peta", "Riwayat", "Profil"]
          : ["Home", "Map", "History", "Profile"];
      for (const route of ["/demo/", "/demo/admin/"]) {
        await page.goto(`${baseURL}${route}`);
        await page.locator(".sidebar").waitFor();
        await page.addStyleTag({
          content: "nextjs-portal{display:none!important}",
        });
        const names = route.includes("admin")
          ? [
              ...labels,
              ...(language === "id"
                ? ["Kelola Titik Monitoring", "Pengguna"]
                : ["Manage monitoring points", "Users"]),
            ]
          : labels;
        for (const width of [1024, 1280, 1440, 1920]) {
          await page.setViewportSize({ width, height: 900 });
          for (const collapsed of [false, true]) {
            const toggle = page.locator(".sidebar-toggle");
            if (
              ((await toggle.getAttribute("aria-expanded")) === "false") !==
              collapsed
            )
              await toggle.click();
            for (const name of names) {
              await (
                name === labels[3]
                  ? page.locator(".sidebar-footer")
                  : page
                      .locator(".sidebar .nav-item")
                      .filter({ hasText: name })
                      .first()
              ).click();
              assert.equal(
                await page.evaluate(
                  () => document.documentElement.scrollWidth > innerWidth,
                ),
                false,
                `${route}/${theme}/${language}/${width}/${name}: overflow`,
              );
              assert.ok(
                (await page.locator(".app-main").boundingBox()).width >
                  width - (collapsed ? 73 : 233),
              );
              if (theme === "dark") {
                const white = await page
                  .locator("main")
                  .evaluate((main) =>
                    [...main.querySelectorAll("section, article, button")]
                      .filter(
                        (e) =>
                          e.getBoundingClientRect().height > 0 &&
                          getComputedStyle(e).backgroundColor ===
                            "rgb(255, 255, 255)",
                      )
                      .map((e) => e.className),
                  );
                assert.deepEqual(white, [], `${name}: white surfaces`);
              }
              if (name === labels[1]) {
                await page.locator(".leaflet-container").waitFor();
                const size = await page
                  .locator(".leaflet-container")
                  .boundingBox();
                assert.ok(size.width > 200 && size.height > 300);
                assert.equal(
                  await page
                    .locator(".leaflet-control-attribution")
                    .isVisible(),
                  true,
                );
              }
              if (name === labels[3]) {
                assert.equal(await page.getByRole("switch").count(), 1);
                assert.equal(
                  await page
                    .getByRole("combobox", {
                      name: language === "id" ? "Bahasa" : "Language",
                      exact: true,
                    })
                    .isVisible(),
                  true,
                );
              }
              checks++;
            }
          }
        }
      }
      // Shared controls remain usable on desktop, including inside a modal dialog.
      await page
        .locator(".sidebar .nav-item")
        .filter({ hasText: labels[2] })
        .click();
      const period = page.getByRole("combobox", {
        name: language === "id" ? "Periode" : "Period",
        exact: true,
      });
      await period.click();
      await page
        .getByRole("option", {
          name: language === "id" ? "Bulanan" : "Monthly",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: language === "id" ? "Dari tanggal" : "From date",
          exact: true,
        })
        .click();
      await page.getByRole("dialog").waitFor();
      await page.keyboard.press("Escape");
      await page.locator('button[aria-controls="notification-list"]').click();
      assert.equal(await page.locator("#notification-list").isVisible(), true);
      await page.keyboard.press("Escape");
      await page.locator(".sidebar-footer").click();
      const themeSwitch = page.getByRole("switch");
      await themeSwitch.click();
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        theme === "dark" ? "light" : "dark",
      );
      await themeSwitch.click();
      // Mobile uses its existing layout and bottom navigation, regardless of sidebar state.
      const languageControl = page.getByRole("combobox", {
        name: /^(Bahasa|Language)$/,
      });
      await languageControl.click();
      await page
        .getByRole("option", {
          name: language === "id" ? "English" : "Bahasa Indonesia",
          exact: true,
        })
        .click();
      assert.equal(
        await page.locator("html").getAttribute("lang"),
        language === "id" ? "en" : "id",
      );
      await languageControl.click();
      await page
        .getByRole("option", {
          name: language === "id" ? "Bahasa Indonesia" : "English",
          exact: true,
        })
        .click();
      for (const width of [375, 390]) {
        await page.setViewportSize({ width, height: 844 });
        for (const name of labels) {
          await page.evaluate(() => document.activeElement?.blur());
          await page
            .locator(".bottom-nav .nav-item")
            .filter({ hasText: name })
            .click();
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
          );
          assert.equal(await page.locator(".sidebar").isVisible(), false);
          checks++;
        }
      }
      // Preview exit exercises the existing handler without signing out a real account.
      await page
        .getByRole("button", {
          name: language === "id" ? "Keluar dari pratinjau" : "Leave preview",
          exact: true,
        })
        .click();
      await page.waitForURL("**/login/**");
      await context.close();
      console.log(
        `${theme}/${language}: desktop/sidebar/roles, controls and mobile regression passed`,
      );
    }
  assert.deepEqual(errors, []);
  console.log(
    `${checks} page/layout checks passed; no JavaScript page errors.`,
  );
} finally {
  await browser.close();
}
