import { expect, test } from "@playwright/test";

// Jalankan pada build dengan Supabase dummy; semua request diintersep browser.
test.skip(
  process.env.TIRTA_AUTH_TEST !== "1",
  "Memerlukan build Supabase dummy",
);
const endpoint = "https://tirta-auth-test.supabase.co";
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "penguji@unnes.id",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const session = {
  access_token: "test-access-token",
  refresh_token: "test-refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user,
};

test("Dropdown Admin mempertahankan payload, status busy dan pengelolaan lokasi", async ({
  page,
}) => {
  await page.addInitScript(
    (value) =>
      localStorage.setItem(
        "sb-tirta-auth-test-auth-token",
        JSON.stringify(value),
      ),
    session,
  );
  const location = {
    id: "a",
    code: "SMR-UJI",
    name: "Sumur uji",
    area: "Area uji",
    type: "WELL",
    latitude: -7.05,
    longitude: 110.394,
    occupants: null,
    active: true,
  };
  let currentRole = "VIEWER";
  let rolePayload: unknown;
  let locationPayload: unknown;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`${endpoint}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/user")) return route.fulfill({ json: user });
    if (path.endsWith("/is_unnes_user")) return route.fulfill({ json: true });
    if (path.endsWith("/current_access_role"))
      return route.fulfill({ json: "ADMIN" });
    if (path.endsWith("/admin_list_users"))
      return route.fulfill({
        json: [
          {
            id: "viewer",
            name: "Viewer uji",
            email: "viewer@example.com",
            role: currentRole,
            confirmed: true,
            active: true,
          },
          {
            id: "inactive",
            name: "Nonaktif",
            email: "inactive@example.com",
            role: "VIEWER",
            active: false,
          },
        ],
      });
    if (path.endsWith("/admin_set_role")) {
      rolePayload = route.request().postDataJSON();
      await pending;
      currentRole = "ADMIN";
      return route.fulfill({ json: null });
    }
    if (path.endsWith("/monitoring_locations")) {
      if (route.request().method() === "POST") {
        locationPayload = route.request().postDataJSON();
        return route.fulfill({ json: locationPayload });
      }
      return route.fulfill({ json: [location] });
    }
    return route.abort();
  });
  await page.goto("/");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Pengguna", exact: true })
    .click();
  const role = page.getByRole("combobox", { name: "Peran viewer@example.com" });
  await expect(
    page.getByRole("combobox", { name: "Peran inactive@example.com" }),
  ).toBeEnabled();
  await role.click();
  await page.getByRole("option", { name: "Admin", exact: true }).click();
  await expect(role).toBeDisabled();
  await expect.poll(() => rolePayload).toEqual({ target_id: "viewer", new_role: "ADMIN" });
  release();
  await expect(role).toBeEnabled();
  await expect(role).toHaveText("Admin");
  await page
    .locator(".sidebar")
    .getByRole("button", { name: "Kelola Titik Monitoring" })
    .click();
  await page.getByRole("button", { name: /Sumur uji/ }).click();
  await page.getByRole("combobox", { name: "Jenis", exact: true }).click();
  await page.getByRole("option", { name: "Gedung", exact: true }).click();
  await expect(page.getByLabel("Jumlah pegawai")).toBeVisible();
  await page.getByRole("switch", { name: "Titik monitoring" }).uncheck();
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(
    page.getByText("Titik monitoring tersimpan.", { exact: true }),
  ).toBeVisible();
  expect(locationPayload).toEqual({
    ...location,
    type: "BUILDING",
    active: false,
  });
});

test("Validasi lambat dan respons gagal terlambat tidak menghalangi demo", async ({
  page,
}) => {
  await page.clock.install();
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.addInitScript((value) => {
    localStorage.setItem(
      "sb-tirta-auth-test-auth-token",
      JSON.stringify(value),
    );
  }, session);
  await page.route(`${endpoint}/**`, async (route) => {
    await pending;
    await route.fulfill({ status: 401, json: { message: "Expired session" } });
  });
  const validation = page.waitForRequest(`${endpoint}/auth/v1/user`);
  await page.goto("/login/");
  await validation;
  await page.getByRole("button", { name: "Lihat pratinjau" }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(9000);
  const lateResponse = page.waitForResponse(`${endpoint}/auth/v1/user`);
  release();
  await (await lateResponse).finished();
  await page.clock.runFor(100);
  await expect(page).toHaveURL(/\/demo\//);
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
});

test("Demo dengan sesi tersimpan tidak membaca backend atau membuka Admin", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.addInitScript((value) => {
    localStorage.setItem(
      "sb-tirta-auth-test-auth-token",
      JSON.stringify(value),
    );
  }, session);
  await page.route(`${endpoint}/**`, (route) => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto("/demo/");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kelola Titik Monitoring" }),
  ).toHaveCount(0);
  expect(requests).toEqual([]);
});

for (const role of ["VIEWER", "ADMIN"]) {
  test(`Login ${role}, data privat dan logout tetap bekerja`, async ({
    page,
  }) => {
    let privateReads = 0;
    let savedPassword = "";
    let account = {
      ...user,
      identities: [
        {
          id: user.id,
          user_id: user.id,
          provider: "email",
          identity_data: { email: user.email },
        },
      ],
      user_metadata: {
        full_name:
          "Pengguna UNNES dengan nama lengkap yang panjang untuk menguji tampilan profil",
      },
    };
    await page.route(`${endpoint}/**`, (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/token"))
        return route.fulfill({ json: { ...session, user: account } });
      if (path.endsWith("/user")) {
        if (route.request().method() === "PUT") {
          const update = route.request().postDataJSON();
          if (update.data) account = { ...account, user_metadata: update.data };
          if (update.password) savedPassword = update.password;
        }
        return route.fulfill({ json: account });
      }
      if (path.endsWith("/is_unnes_user")) return route.fulfill({ json: true });
      if (path.endsWith("/current_access_role"))
        return route.fulfill({ json: role });
      if (path.endsWith("/monitoring_locations")) {
        privateReads++;
        return route.fulfill({ json: [] });
      }
      if (path.endsWith("/logout")) return route.fulfill({ status: 204 });
      return route.abort();
    });
    await page.goto("/login/");
    await page.getByLabel("Email UNNES", { exact: true }).fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill("test-password");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toBeVisible();
    expect(privateReads).toBeGreaterThan(0);
    await expect(
      page
        .locator(".sidebar")
        .getByRole("button", { name: "Kelola Titik Monitoring" }),
    ).toHaveCount(role === "ADMIN" ? 1 : 0);
    await expect(
      page
        .locator(".sidebar nav")
        .getByRole("button", { name: "Profil", exact: true }),
    ).toHaveCount(0);
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Profil", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Profil akun" }),
    ).toContainText(role === "ADMIN" ? "Admin" : "Viewer");
    for (const width of [1024, 768, 430, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (width <= 640) {
        const profile = page
          .locator(".bottom-nav")
          .getByRole("button", { name: "Profil", exact: true });
        await profile.click();
        await expect(profile).toHaveAttribute("aria-current", "page");
      }
    }
    await page
      .getByRole("button", { name: "Edit Profil", exact: true })
      .click();
    const edit = page.getByRole("dialog", { name: "Edit Profil" });
    await edit.getByLabel("Nama Lengkap").fill("Nama Penguji UNNES");
    await edit.getByRole("button", { name: "Simpan Perubahan" }).click();
    await expect(edit).not.toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nama Penguji UNNES" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Ubah Kata Sandi/ }).click();
    const password = page.getByRole("dialog", { name: "Ubah Kata Sandi" });
    await password
      .getByLabel("Kata Sandi Baru", { exact: true })
      .fill("password-baru-123");
    await password
      .getByLabel("Konfirmasi Kata Sandi")
      .fill("password-baru-123");
    await password
      .getByRole("button", { name: "Ubah Kata Sandi", exact: true })
      .click();
    await expect(password).not.toBeVisible();
    expect(savedPassword).toBe("password-baru-123");
    await page.getByRole("button", { name: "Keluar", exact: true }).click();
    await expect(page).toHaveURL(/\/login\//);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login\//);
  });
}
