import { type Page } from "@playwright/test";

export async function selectDate(page: Page, label: string, value: string) {
  const [year, month] = value.split("-");
  await page.getByRole("button", { name: label, exact: true }).click();
  const calendar = page.getByRole("dialog");
  await calendar.getByRole("combobox", { name: "Tahun", exact: true }).click();
  await calendar.getByRole("option", { name: year, exact: true }).click();
  await calendar.getByRole("combobox", { name: "Bulan", exact: true }).click();
  await calendar
    .getByRole("option")
    .nth(Number(month) - 1)
    .click();
  await calendar.locator(`[data-date="${value}"]`).click();
}
