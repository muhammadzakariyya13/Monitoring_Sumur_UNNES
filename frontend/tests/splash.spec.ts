import { test, expect } from "@playwright/test";

test("Splash awal tetap terbaca selama JavaScript belum dimuat", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("http://localhost:4173/");
    await expect(page.getByRole("heading", { name: "TIRTA", exact: true })).toBeVisible();
    await expect(page.getByRole("progressbar")).toBeVisible();
    await expect(page.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
    await page.screenshot({ path: `test-results/splash-${width}.png` });
  }
  await context.close();
});
