import { expect, test } from "@playwright/test";
for (const width of [360, 1440]) {
  test(`Admin dummy ${width}px stays local and cannot open real Admin`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 850 });
    const requests: string[] = [];
    await page.route(/\/(auth|rest|functions)\/v1\//, (route) => {
      requests.push(route.request().url());
      return route.abort();
    });
    const openManagement = async (name: string) => {
      if (width <= 640) await page.locator(".bottom-nav").getByRole("button", { name: "Kelola", exact: true }).click();
      await page.locator(width <= 640 ? ".content" : ".sidebar").getByRole("button", { name: width <= 640 ? (name === "Pengguna" ? "Pengguna Kelola akun dan hak akses" : "Titik Monitoring Kelola Sumur dan Gedung") : name, exact: true }).click();
    };
    await page.goto("/demo/admin/");
    await openManagement("Pengguna");
    await expect(
      page.getByRole("heading", { name: "Pengguna", exact: true }).first(),
    ).toBeVisible();
    const own = page.getByRole("article", {
      name: "admin@example.invalid",
      exact: true,
    });
    await expect(own.getByRole("combobox")).toBeDisabled();
    await expect(
      own.locator("button").filter({ hasText: /^Hapus$/ }),
    ).toBeDisabled();
    const viewer = page.getByRole("article", {
      name: "viewer@example.invalid",
      exact: true,
    });
    await viewer.getByRole("combobox").click();
    await page.getByRole("option", { name: "Admin", exact: true }).click();
    await expect(viewer.getByRole("combobox")).toHaveText("Admin");
    await viewer.getByRole("button", { name: "Nonaktifkan" }).click();
    await expect(
      viewer.getByRole("button", { name: "Aktifkan", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Tambah Pengguna" }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Nama", { exact: true })
      .fill("Pengguna Dummy Baru");
    await dialog
      .getByLabel("Email", { exact: true })
      .fill("baru@example.invalid");
    await dialog.getByRole("button", { name: "Kirim undangan" }).click();
    await expect(dialog).not.toBeVisible();
    const added = page.getByRole("article", {
      name: "baru@example.invalid",
      exact: true,
    });
    await expect(added).toBeVisible();
    await added.getByRole("button", { name: "Hapus", exact: true }).click();
    await dialog.getByRole("button", { name: "Hapus Pengguna" }).click();
    await expect(added).toHaveCount(0);
    await page.getByRole("button", { name: "Refresh pengguna" }).click();
    await expect(viewer.getByRole("combobox")).toHaveText("Admin");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.reload();
    await openManagement("Pengguna");
    await expect(viewer.getByRole("combobox")).toHaveText("Viewer");
    await openManagement("Kelola Titik Monitoring");
    await page.getByRole("button", { name: "Edit Gedung Rektorat" }).click();
    await page.getByLabel("Jumlah pegawai", { exact: true }).fill("275");
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByRole("article", { name: "Gedung Rektorat", exact: true })).toContainText("275 pegawai");
    const card = page.getByRole("article", { name: "Gedung Rektorat", exact: true });
    await card.getByRole("button", { name: "Atur Gedung Rektorat" }).click();
    const settings = page.getByRole("dialog", { name: "Pengaturan pemakaian" });
    await settings.getByRole("spinbutton").fill("0.01");
    await settings.getByRole("switch").check();
    await settings.getByRole("button", { name: "Simpan pengaturan" }).click();
    await expect(card.getByRole("status")).toContainText("pratinjau");
    await page.getByRole("button", { name: "Notifikasi, 1 belum dibaca" }).click();
    await page.getByRole("button", { name: /Pemakaian melebihi batas/ }).click();
    const detail = page.getByRole("dialog", { name: "Detail Gedung Rektorat" });
    await expect(detail).toContainText("275 orang");
    await expect(detail).toContainText("Melebihi batas pemakaian");
    await page.getByRole("button", { name: "Tutup detail" }).click();
    await page.getByRole("button", { name: "Perbarui data contoh" }).click();
    await openManagement("Kelola Titik Monitoring");
    await expect(page.getByRole("article", { name: "Gedung Rektorat", exact: true })).toContainText("275 pegawai");
    await page.reload();
    await openManagement("Kelola Titik Monitoring");
    await expect(page.getByRole("article", { name: "Gedung Rektorat", exact: true })).toContainText("250 pegawai");
    expect(requests).toEqual([]);
    await page.goto("/admin/");
    await expect(page).toHaveURL(/\/login\//);
  });
}
