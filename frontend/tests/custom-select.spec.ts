import { expect, test } from "@playwright/test";

test.describe("Dropdown sentuh", () => {
  test.use({
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
  });
  test("tap opsi dan tap di luar", async ({ page }) => {
    await page.goto("/demo/");
    await page
      .locator(".bottom-nav")
      .getByRole("button", { name: "Riwayat", exact: true })
      .tap();
    const kind = page.getByRole("combobox", { name: "Jenis titik" });
    await kind.tap();
    await page.getByRole("option", { name: "Gedung", exact: true }).tap();
    await expect(kind).toHaveText("Gedung");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await kind.tap();
    await page.getByRole("heading", { name: "Penggunaan air", exact: true }).tap();
    await expect(page.getByRole("listbox")).toHaveCount(0);
  });
});

for (const width of [360, 390, 430, 768, 1440]) {
  test(`Dropdown ${width}px: menu custom, keyboard dan posisi`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/demo/");
    await page
      .locator(width <= 640 ? ".bottom-nav" : ".sidebar")
      .getByRole("button", { name: "Riwayat", exact: true })
      .click();
    const kind = page.getByRole("combobox", {
      name: "Jenis titik",
      exact: true,
    });
    const location = page.getByRole("combobox", {
      name: "Lokasi titik",
      exact: true,
    });
    await expect(page.locator("select")).toHaveCount(0);
    await kind.focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Semua", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(kind).toHaveText("Sumur");
    await expect(kind).toBeFocused();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await kind.press("Enter");
    await kind.press("ArrowDown");
    await kind.press("Escape");
    await expect(kind).toHaveText("Sumur");
    await kind.press("Enter");
    await kind.press("Home");
    await kind.press("Enter");
    await expect(kind).toHaveText("Semua");
    await kind.click();
    await location.click();
    await expect(page.getByRole("listbox")).toHaveCount(1);
    await expect(kind).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("option")).toHaveCount(5);
    const menu = page.getByRole("listbox");
    const bounds = await menu.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    const bottom =
      width <= 640 ? (await page.locator(".bottom-nav").boundingBox())!.y : 844;
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(bottom);
    expect(
      await menu.evaluate((element) => element.parentElement === document.body),
    ).toBe(true);
    await page.screenshot({ path: `test-results/dropdown-${width}.png` });
    await page.getByRole("heading", { name: "Penggunaan air", exact: true }).click();
    await expect(menu).toHaveCount(0);
    await location.focus();
    await location.press("g");
    await location.press("Enter");
    await expect(location).toHaveText("Gedung Rektorat");
    await location.press("Enter");
    await location.press("Tab");
    await expect(menu).toHaveCount(0);
    await expect(location).not.toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

test("Menu membalik ke atas ketika ruang HP terbatas", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 560 });
  await page.goto("/demo/");
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "Riwayat", exact: true })
    .click();
  const location = page.getByRole("combobox", { name: "Lokasi titik" });
  await location.click();
  const trigger = await location.boundingBox();
  const menu = await page.getByRole("listbox").boundingBox();
  expect(menu!.y + menu!.height).toBeLessThanOrEqual(trigger!.y);
  await page.getByRole("option", { name: "Arsip", exact: true }).click();
  await expect(location).toHaveText("Arsip");
});
