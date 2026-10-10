import { test, expect } from "@playwright/test";

for (const width of [360, 390, 430, 768, 1024, 1440]) {
  test(`Tampilan dan navigasi ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/*.tile.openstreetmap.org/**", (route) =>
      route.abort(),
    );
    const check = async (name: string) => {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/review-${width}-${name}.png`,
        fullPage: true,
      });
    };
    await page.goto("/login/");
    await check("login");
    await page.getByRole("button", { name: "Lihat pratinjau" }).click();
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    await expect(page.locator(".stats .stat")).toHaveCount(3);
    await page.locator(".simulation-info summary").click();
    await expect(page.locator(".simulation-info p")).toBeVisible();
    await page.locator(".simulation-info summary").click();
    await check("dashboard");
    const nav = page.locator(width <= 640 ? ".bottom-nav" : ".sidebar");
    await nav.getByRole("button", { name: "Peta", exact: true }).click();
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await check("map");
    await page.getByRole("button", { name: /Sumur Rektorat/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await check("detail");
    await page.getByRole("button", { name: "Tutup detail" }).click();
    await nav.getByRole("button", { name: "Riwayat", exact: true }).click();
    await check("history");
    await expect(
      page
        .locator(".sidebar nav")
        .getByRole("button", { name: "Profil", exact: true }),
    ).toHaveCount(0);
    if (width <= 640) {
      await expect(page.locator(".bottom-nav button")).toHaveText([
        "Beranda",
        "Peta",
        "Riwayat",
        "Profil",
      ]);
      await nav.getByRole("button", { name: "Profil", exact: true }).click();
      await expect(
        nav.getByRole("button", { name: "Profil", exact: true }),
      ).toHaveAttribute("aria-current", "page");
    } else {
      await page.locator(".sidebar-footer").focus();
      await page.keyboard.press("Enter");
      await expect(page.locator(".sidebar-footer")).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(
        page.locator(".sidebar nav [aria-current=page]"),
      ).toHaveCount(0);
    }
    await expect(
      page.getByRole("heading", { name: "Profil", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Profil akun" }),
    ).toContainText("Viewer");
    await check("profile");
  });
}
