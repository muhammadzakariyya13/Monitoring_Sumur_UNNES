import { expect, test } from "@playwright/test";
test.skip(process.env.TIRTA_AUTH_TEST !== "1", "Requires dummy Supabase build");

for (const width of [360, 768, 1440]) {
  test(`Admin usage settings ${width}px persist only configuration and preserve metadata`, async ({
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
            access_token: "test-token",
            refresh_token: "test-refresh",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: "bearer",
            user,
          }),
        ),
      user,
    );
    let row = {
      id: "building",
      name: "Gedung Uji",
      code: "GDG-UJI",
      type: "BUILDING",
      area: "Area Uji",
      latitude: -7.05,
      longitude: 110.39,
      active: true,
      occupants: 250,
      daily_usage_limit: null as number | null,
      limit_notification_enabled: false,
    };
    const writes: Record<string, unknown>[] = [];
    let reject = false;
    await page.route(`${endpoint}/**`, (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.pathname.endsWith("/user")) return route.fulfill({ json: user });
      if (url.pathname.endsWith("/is_unnes_user"))
        return route.fulfill({ json: true });
      if (url.pathname.endsWith("/current_access_role"))
        return route.fulfill({ json: "ADMIN" });
      if (url.pathname.endsWith("/monitoring_locations")) {
        if (request.method() === "PATCH") {
          expect(url.searchParams.get("id")).toBe("eq.building");
          expect(url.searchParams.get("type")).toBe("eq.BUILDING");
          const body = request.postDataJSON();
          writes.push(body);
          if (reject)
            return route.fulfill({
              status: 403,
              json: { message: "RLS denied" },
            });
          row = { ...row, ...body };
          return route.fulfill({
            json: {
              daily_usage_limit: row.daily_usage_limit,
              limit_notification_enabled: row.limit_notification_enabled,
            },
          });
        }
        if (request.method() === "POST") {
          const body = request.postDataJSON();
          expect(body).not.toHaveProperty("daily_usage_limit");
          expect(body).not.toHaveProperty("limit_notification_enabled");
          row = { ...row, ...body };
          return route.fulfill({ json: row });
        }
        return route.fulfill({ json: [row] });
      }
      throw new Error(
        `Unexpected monitoring request: ${request.method()} ${url.pathname}`,
      );
    });
    await page.setViewportSize({ width, height: 900 });
    const openManagement = async () => {
      if (width <= 640)
        await page
          .locator(".bottom-nav")
          .getByRole("button", { name: "Kelola", exact: true })
          .click();
      await page
        .locator(width <= 640 ? ".content" : ".sidebar")
        .getByRole("button", { name: width <= 640 ? "Titik Monitoring Kelola Sumur dan Gedung" : "Kelola Titik Monitoring" })
        .click();
    };
    await page.goto("/admin/");
    await openManagement();
    const card = page.getByRole("article", { name: "Gedung Uji", exact: true });
    await expect(card).toContainText("Belum ditetapkan");
    await card.getByRole("button", { name: "Atur Gedung Uji" }).click();
    const input = page.getByLabel("Batas pemakaian harian (m³)", {
      exact: true,
    });
    for (const bad of ["0", "-1"]) {
      await input.fill(bad);
      await page.getByRole("button", { name: "Simpan pengaturan" }).click();
      await expect(
        page.getByText("Batas pemakaian harus lebih dari 0 m³.", {
          exact: true,
        }),
      ).toBeVisible();
      expect(writes).toHaveLength(0);
    }
    await input.fill("15.5");
    await page
      .getByRole("switch", { name: "Notifikasi batas" })
      .check();
    await page.getByRole("button", { name: "Simpan pengaturan" }).click();
    await expect(
      page.getByText("Pengaturan pemakaian tersimpan."),
    ).toBeVisible();
    expect(writes.at(-1)).toEqual({
      daily_usage_limit: 15.5,
      limit_notification_enabled: true,
    });
    await page.reload();
    // The live adapter has no telemetry yet: do not display Normal or fabricate volume.
    await page.getByRole("button", { name: /Gedung Uji/ }).click();
    await expect(
      page.getByRole("region", { name: "Batas pemakaian Gedung" }),
    ).toContainText("Menunggu data");
    await page.getByRole("button", { name: "Tutup detail" }).click();
    await openManagement();
    await card.getByRole("button", { name: "Atur Gedung Uji" }).click();
    await expect(input).toHaveValue("15.5");
    await input.fill("17.2");
    await page.getByRole("switch").uncheck();
    reject = true;
    await page.getByRole("button", { name: "Simpan pengaturan" }).click();
    await expect(page.getByText(/Pengaturan belum tersimpan/)).toBeVisible();
    expect(row.daily_usage_limit).toBe(15.5);
    reject = false;
    await page.getByRole("button", { name: "Simpan pengaturan" }).click();
    await expect(
      page.getByText("Pengaturan pemakaian tersimpan."),
    ).toBeVisible();
    expect(writes.at(-1)).toEqual({
      daily_usage_limit: 17.2,
      limit_notification_enabled: false,
    });
    await card.getByRole("button", { name: "Edit Gedung Uji" }).click();
    await page.getByLabel("Jumlah pegawai", { exact: true }).fill("275");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(
      page.getByText("Titik monitoring tersimpan.", { exact: true }),
    ).toBeVisible();
    expect(row.daily_usage_limit).toBe(17.2);
    await card.getByRole("button", { name: "Atur Gedung Uji" }).click();
    await input.fill("");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Simpan pengaturan" }).click();
    await expect(card).toContainText("Belum ditetapkan");
    expect(row.daily_usage_limit).toBeNull();
  });
}
