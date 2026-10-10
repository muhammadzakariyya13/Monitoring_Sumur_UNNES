import { expect, test } from "@playwright/test";

test("Demo langsung dan reload tidak membutuhkan marker sesi atau backend", async ({
  page,
}) => {
  const privateRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/auth\/v1\/|\/rest\/v1\//.test(request.url()))
      privateRequests.push(request.url());
  });
  await page.goto("/demo/");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kelola Titik Monitoring" }),
  ).toHaveCount(0);
  expect(privateRequests).toEqual([]);
  // Marker demo tidak memberi akses ke dashboard privat.
  await page.evaluate(() => sessionStorage.setItem("tirta-demo", "true"));
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\//);
});

test("Demo tetap bisa masuk dan keluar saat sessionStorage ditolak", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "sessionStorage", {
      get() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    });
  });
  await page.goto("/login/");
  await page.getByRole("button", { name: "Lihat pratinjau" }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Profil", exact: true })
    .click();
  await page.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(page).toHaveURL(/\/login\//);
  expect(errors).toEqual([]);
});
