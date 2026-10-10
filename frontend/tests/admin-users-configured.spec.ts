import { expect, test, type Page } from "@playwright/test";

test.skip(
  process.env.TIRTA_AUTH_TEST !== "1",
  "Requires a build with dummy Supabase environment",
);
const endpoint = "https://tirta-auth-test.supabase.co";
const ownerId = "00000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";
const user = {
  id: ownerId,
  aud: "authenticated",
  role: "authenticated",
  email: "admin@unnes.id",
  email_confirmed_at: "2026-01-01T00:00:00Z",
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

async function setup(page: Page, actorRole: string | null = "ADMIN") {
  await page.addInitScript(
    (value) =>
      localStorage.setItem(
        "sb-tirta-auth-test-auth-token",
        JSON.stringify(value),
      ),
    session,
  );
  const state = {
    failList: false,
    failOperation: false,
    listReads: 0,
    operations: [] as { path: string; body: Record<string, unknown> }[],
    accounts: [
      {
        id: ownerId,
        name: "Admin Penguji",
        email: user.email,
        role: "ADMIN",
        active: true,
        confirmed: true,
        deletion_pending: false,
      },
      {
        id: targetId,
        name: "Nama pengguna panjang untuk menguji responsivitas tampilan pengguna",
        email: "pengguna.dengan.email.panjang@unnes.id",
        role: "VIEWER",
        active: true,
        confirmed: true,
        deletion_pending: false,
      },
    ],
  };
  await page.route(`${endpoint}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/logout")) return route.fulfill({ status: 204 });
    if (path.endsWith("/user")) return route.fulfill({ json: user });
    if (path.endsWith("/is_unnes_user")) return route.fulfill({ json: true });
    if (path.endsWith("/current_access_role"))
      return route.fulfill({ json: actorRole });
    if (path.endsWith("/monitoring_locations"))
      return route.fulfill({ json: [] });
    if (path.endsWith("/admin_list_users")) {
      state.listReads++;
      return state.failList
        ? route.fulfill({ status: 503, json: { message: "unavailable" } })
        : route.fulfill({ json: state.accounts });
    }
    if (
      /admin_set_role|admin_set_active|functions\/v1\/admin-users/.test(path)
    ) {
      const body = route.request().postDataJSON();
      state.operations.push({ path, body });
      if (state.failOperation)
        return route.fulfill({
          status: 403,
          json: { message: "FORBIDDEN", error: "Akses Admin diperlukan." },
        });
      if (path.endsWith("admin_set_role"))
        state.accounts = state.accounts.map((a) =>
          a.id === body.target_id ? { ...a, role: body.new_role } : a,
        );
      if (path.endsWith("admin_set_active"))
        state.accounts = state.accounts.map((a) =>
          a.id === body.target_id ? { ...a, active: body.new_active } : a,
        );
      if (body.action === "delete")
        state.accounts = state.accounts.filter((a) => a.id !== body.id);
      if (body.action === "invite")
        state.accounts.push({
          id: "00000000-0000-4000-8000-000000000003",
          name: body.name,
          email: body.email,
          role: body.role,
          active: true,
          confirmed: false,
          deletion_pending: false,
        });
      return route.fulfill({
        json: body.action
          ? {
              message:
                body.action === "invite"
                  ? "Undangan berhasil dikirim."
                  : "Pengguna berhasil dihapus.",
            }
          : null,
      });
    }
    return route.abort();
  });
  return state;
}

async function openUsers(page: Page, mobile = false) {
  await page.goto("/admin/");
  if (mobile)
    await page
      .locator(".bottom-nav")
      .getByRole("button", { name: "Kelola", exact: true })
      .click();
  await page
    .locator(mobile ? ".content" : ".sidebar")
    .getByRole("button", { name: mobile ? "Pengguna Kelola akun dan hak akses" : "Pengguna", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Pengelolaan pengguna" }),
  ).toBeVisible();
}

for (const width of [360, 1440]) {
  test(`User management ${width}px: invite, status, role, confirmation and self protection`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    const state = await setup(page);
    await openUsers(page, width < 640);
    const own = page.getByRole("article", { name: user.email, exact: true });
    await expect(own.getByRole("combobox")).toBeDisabled();
    await expect(
      own.locator("button").filter({ hasText: /^Nonaktifkan$/ }),
    ).toBeDisabled();
    await expect(
      own.locator("button").filter({ hasText: /^Hapus$/ }),
    ).toBeDisabled();
    await expect(page.locator(".data-context")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    await page
      .getByRole("button", { name: "Tambah Pengguna", exact: true })
      .click();
    const invite = page.getByRole("dialog", { name: "Tambah Pengguna" });
    await invite.getByLabel("Nama", { exact: true }).fill("Penguji Undangan");
    await invite.getByLabel("Email", { exact: true }).fill("undangan@unnes.id");
    await invite.getByRole("combobox", { name: "Role undangan" }).click();
    const list = page.getByRole("listbox", { name: "Role undangan" });
    await expect(list).toBeVisible();
    const box = (await list.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await list.getByRole("option", { name: "Admin", exact: true }).click();
    await invite.getByRole("button", { name: "Kirim undangan" }).click();
    await expect(invite).not.toBeVisible();
    await expect(
      page.getByText("Undangan berhasil dikirim.", { exact: true }),
    ).toBeVisible();
    expect(state.operations.at(-1)?.body).toEqual({
      action: "invite",
      name: "Penguji Undangan",
      email: "undangan@unnes.id",
      role: "ADMIN",
    });
    await expect(
      page.getByRole("article", { name: "undangan@unnes.id", exact: true }),
    ).toContainText("Menunggu undangan");

    const row = page.getByRole("article", {
      name: "pengguna.dengan.email.panjang@unnes.id",
      exact: true,
    });
    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: "Admin", exact: true }).click();
    await expect(row.getByRole("combobox")).toHaveText("Admin");
    expect(state.operations.at(-1)?.body).toEqual({
      target_id: targetId,
      new_role: "ADMIN",
    });
    await row.getByRole("button", { name: "Nonaktifkan", exact: true }).click();
    await expect(
      row.getByRole("button", { name: "Aktifkan", exact: true }),
    ).toBeVisible();
    expect(state.operations.at(-1)?.body).toEqual({
      target_id: targetId,
      new_active: false,
    });
    await row.getByRole("button", { name: "Aktifkan", exact: true }).click();
    await expect(
      row.getByRole("button", { name: "Nonaktifkan", exact: true }),
    ).toBeVisible();

    const beforeDelete = state.operations.length;
    await row.getByRole("button", { name: "Hapus", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: "Hapus pengguna?" });
    await expect(confirm).toContainText(
      "pengguna.dengan.email.panjang@unnes.id",
    );
    await confirm.getByRole("button", { name: "Batal", exact: true }).click();
    expect(state.operations).toHaveLength(beforeDelete);
    await row.getByRole("button", { name: "Hapus", exact: true }).click();
    await confirm
      .getByRole("button", { name: "Hapus Pengguna", exact: true })
      .click();
    await expect(confirm).not.toBeVisible();
    await expect(row).toHaveCount(0);
    expect(state.operations.at(-1)?.body).toEqual({
      action: "delete",
      id: targetId,
    });
    const reads = state.listReads;
    await page.getByRole("button", { name: "Refresh pengguna" }).click();
    await expect.poll(() => state.listReads).toBeGreaterThan(reads);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/admin-users-${width}.png`,
      fullPage: true,
    });
  });
}

test("User list failure, retry, empty list and operation errors are visible", async ({
  page,
}) => {
  const state = await setup(page);
  state.failList = true;
  await openUsers(page);
  await expect(
    page
      .getByRole("region", { name: "Pengelolaan pengguna" })
      .getByRole("alert"),
  ).toContainText("Gagal memuat pengguna");
  state.failList = false;
  await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
  await expect(
    page.getByRole("article", { name: user.email, exact: true }),
  ).toBeVisible();
  state.failOperation = true;
  await page
    .getByRole("article", {
      name: "pengguna.dengan.email.panjang@unnes.id",
      exact: true,
    })
    .getByRole("button", { name: "Hapus", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Hapus Pengguna" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Akses Admin diperlukan",
  );
  await dialog.getByRole("button", { name: "Batal" }).click();
  state.accounts = [];
  await page.getByRole("button", { name: "Refresh pengguna" }).click();
  await expect(
    page.getByText("Belum ada pengguna.", { exact: true }),
  ).toBeVisible();
});

for (const role of ["VIEWER", null]) {
  test(`Admin route rejects ${role ?? "inactive"} account`, async ({
    page,
  }) => {
    const state = await setup(page, role);
    await page.goto("/admin/");
    await expect(page).toHaveURL(role ? /\/$/ : /\/login\//);
    if (role) await expect(page).not.toHaveURL(/\/admin\//);
    await expect(
      page.getByRole("button", { name: "Tambah Pengguna" }),
    ).toHaveCount(0);
    expect(state.listReads).toBe(0);
  });
}

test("Invite is accepted explicitly and recipient sets own password", async ({
  page,
}) => {
  let verifies = 0;
  let savedPassword = "";
  await page.route(`${endpoint}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/verify")) {
      verifies++;
      expect(route.request().postDataJSON()).toMatchObject({
        type: "invite",
        token_hash: "test-invite-token",
      });
      return route.fulfill({ json: session });
    }
    if (path.endsWith("/user")) {
      if (route.request().method() === "PUT")
        savedPassword = route.request().postDataJSON().password;
      return route.fulfill({ json: user });
    }
    if (path.endsWith("/is_unnes_user")) return route.fulfill({ json: true });
    if (path.endsWith("/current_access_role"))
      return route.fulfill({ json: "VIEWER" });
    return route.abort();
  });
  await page.goto("/auth/invite/#token_hash=test-invite-token");
  await expect(page).toHaveURL(/\/auth\/invite\/$/);
  expect(verifies).toBe(0);
  await page.getByRole("button", { name: "Terima undangan" }).click();
  await page
    .getByLabel("Password baru", { exact: true })
    .fill("new-password-123");
  await page
    .getByLabel("Konfirmasi password", { exact: true })
    .fill("not-matching-123");
  await page.getByRole("button", { name: "Simpan password" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "tidak cocok",
  );
  expect(savedPassword).toBe("");
  await page
    .getByLabel("Konfirmasi password", { exact: true })
    .fill("new-password-123");
  await page.getByRole("button", { name: "Simpan password" }).click();
  await expect(page.getByRole("link", { name: "Buka aplikasi" })).toBeVisible();
  expect(savedPassword).toBe("new-password-123");
  expect(verifies).toBe(1);
});
