import { expect, test } from "@playwright/test";
test.skip(process.env.TIRTA_AUTH_TEST !== "1", "Requires dummy Supabase build");

test("Admin persists building headcount, reloads edits, validates integers and clears Wells", async ({
  page,
}) => {
  const endpoint = "https://tirta-auth-test.supabase.co";
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    email: "admin@unnes.id",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  await page.addInitScript(
    (user) =>
      localStorage.setItem(
        "sb-tirta-auth-test-auth-token",
        JSON.stringify({
          access_token: "test-access-token",
          refresh_token: "test-refresh-token",
          token_type: "bearer",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          user,
        }),
      ),
    user,
  );
  type Row = {
    id: string;
    name: string;
    code: string;
    area: string;
    type: string;
    occupants: number | null;
    latitude: number;
    longitude: number;
    active: boolean;
  };
  let rows: Row[] = [];
  let writes = 0;
  await page.route(`${endpoint}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/user")) return route.fulfill({ json: user });
    if (path.endsWith("/is_unnes_user")) return route.fulfill({ json: true });
    if (path.endsWith("/current_access_role"))
      return route.fulfill({ json: "ADMIN" });
    if (path.endsWith("/monitoring_locations")) {
      if (route.request().method() === "POST") {
        writes++;
        const row = {
          ...route.request().postDataJSON(),
          id: "building-test",
        } as Row;
        rows = [row];
        return route.fulfill({ json: row });
      }
      return route.fulfill({ json: rows });
    }
    return route.abort();
  });
  const openLocations = async () => {
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Kelola Titik Monitoring" })
      .click();
  };
  await page.goto("/admin/");
  await openLocations();
  await page.getByRole("button", { name: "Tambah titik", exact: true }).click();
  const count = page.getByLabel("Jumlah pegawai", { exact: true });
  await expect(count).toHaveCount(0);
  await page.getByRole("combobox", { name: "Jenis", exact: true }).click();
  await page.getByRole("option", { name: "Gedung", exact: true }).click();
  await page.getByLabel("Nama", { exact: true }).fill("Gedung Uji");
  await page.getByLabel("Kode titik", { exact: true }).fill("GDG-UJI");
  await page.getByLabel("Lokasi", { exact: true }).fill("Area uji");
  for (const invalid of ["-1", "2.5"]) {
    await count.fill(invalid);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    expect(
      await count.evaluate((input: HTMLInputElement) => input.validity.valid),
    ).toBe(false);
    expect(writes).toBe(0);
  }
  await count.fill("250");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("article", { name: "Gedung Uji", exact: true })).toContainText(
    "250 pegawai",
  );
  expect(rows[0].occupants).toBe(250);
  await page.getByRole("button", { name: "Edit Gedung Uji" }).click();
  await count.fill("275");
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("article", { name: "Gedung Uji", exact: true })).toContainText(
    "275 pegawai",
  );
  await page.reload();
  // Viewer detail uses metadata returned by the repository, with no invented telemetry.
  await page.getByRole("button", { name: /Gedung Uji/ }).click();
  const metric = page.getByRole("region", {
    name: "Pemakaian per orang Gedung",
  });
  await expect(metric).toContainText("275 orang");
  await expect(metric.locator("dd").nth(1)).toHaveText("—");
  await page.getByRole("button", { name: "Tutup detail" }).click();
  await openLocations();
  for (const value of ["0", ""]) {
    await page.getByRole("button", { name: "Edit Gedung Uji" }).click();
    await count.fill(value);
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(
      page.getByText("Titik monitoring tersimpan.", { exact: true }),
    ).toBeVisible();
    expect(rows[0].occupants).toBe(value ? 0 : null);
  }
  await page.getByRole("button", { name: "Edit Gedung Uji" }).click();
  await count.fill("250");
  await page.getByRole("combobox", { name: "Jenis", exact: true }).click();
  await page.getByRole("option", { name: "Sumur", exact: true }).click();
  await expect(count).toHaveCount(0);
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(
    page.getByText("Titik monitoring tersimpan.", { exact: true }),
  ).toBeVisible();
  expect(rows[0].type).toBe("WELL");
  expect(rows[0].occupants).toBeNull();
});
