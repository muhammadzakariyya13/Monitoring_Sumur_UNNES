// Trusted Edge Function only. Do not import this module in frontend/src.
// Uses the same GoTrue REST endpoints as supabase-js; no additional dependency.
type Config = {
  url: string;
  anonKey: string;
  serviceKey: string;
  appOrigin: string;
};
class OperationError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const messages: Record<string, string> = {
  FORBIDDEN: "Akses Admin diperlukan.",
  SELF_PROTECTED: "Akun Anda sendiri tidak dapat diubah atau dihapus.",
  LAST_ADMIN: "Admin aktif terakhir tidak dapat dihapus atau dinonaktifkan.",
  USER_UNAVAILABLE: "Pengguna tidak ditemukan. Muat ulang daftar.",
  DELETION_PENDING: "Penghapusan pengguna masih tertunda. Coba hapus kembali.",
};

export function createAdminUsersHandler(
  config: Config,
  fetcher: typeof fetch = fetch,
) {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin");
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
      "Access-Control-Allow-Origin": config.appOrigin,
      "Access-Control-Allow-Headers":
        "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
    const respond = (body: object, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
    if (
      !config.url ||
      !config.anonKey ||
      !config.serviceKey ||
      !config.appOrigin
    )
      return respond(
        { error: "Layanan pengelolaan pengguna belum dikonfigurasi." },
        503,
      );
    if (origin && origin !== config.appOrigin)
      return respond({ error: "Origin tidak diizinkan." }, 403);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (request.method !== "POST")
      return respond({ error: "Metode tidak diizinkan." }, 405);
    const authorization = request.headers.get("Authorization") ?? "";
    if (!/^Bearer \S+$/i.test(authorization))
      return respond({ error: "Silakan login kembali." }, 401);

    async function call(
      path: string,
      body?: object,
      privileged = false,
      method = "POST",
    ) {
      const response = await fetcher(`${config.url}${path}`, {
        method,
        headers: {
          apikey: privileged ? config.serviceKey : config.anonKey,
          Authorization: privileged
            ? `Bearer ${config.serviceKey}`
            : authorization,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new OperationError(
          response.status === 401
            ? 401
            : response.status === 403 || data?.message === "FORBIDDEN"
              ? 403
              : 400,
          messages[data?.message] ??
            "Operasi Supabase gagal. Periksa konfigurasi atau coba lagi.",
        );
      return data;
    }
    try {
      // Validate the signed JWT with Auth, then query the current database role.
      const actor = await call("/auth/v1/user", undefined, false, "GET");
      if (
        !actor?.id ||
        !actor.email_confirmed_at ||
        !/^[^@\s]+@unnes\.id$/i.test(actor.email ?? "")
      )
        throw new OperationError(401, "Akun UNNES terverifikasi diperlukan.");
      const role = await call("/rest/v1/rpc/current_access_role", {});
      if (role !== "ADMIN")
        throw new OperationError(403, "Akses Admin aktif diperlukan.");
      const raw = await request.text();
      if (raw.length > 4096)
        throw new OperationError(400, "Permintaan terlalu besar.");
      let input: Record<string, unknown>;
      try {
        input = JSON.parse(raw);
      } catch {
        throw new OperationError(400, "Permintaan tidak valid.");
      }
      if (!input || typeof input !== "object" || Array.isArray(input))
        throw new OperationError(400, "Permintaan tidak valid.");
      if (input.action === "invite") {
        const email =
          typeof input.email === "string"
            ? input.email.trim().toLowerCase()
            : "";
        const name = typeof input.name === "string" ? input.name.trim() : "";
        if (
          !/^[^@\s]+@unnes\.id$/.test(email) ||
          email.length > 254 ||
          !name ||
          name.length > 80 ||
          !["VIEWER", "ADMIN"].includes(String(input.role))
        )
          throw new OperationError(
            400,
            "Isi nama, email @unnes.id, dan peran yang valid.",
          );
        const users = await call("/rest/v1/rpc/admin_list_users", {});
        if (!Array.isArray(users))
          throw new OperationError(503, "Daftar pengguna belum tersedia.");
        if (users.some((u) => String(u.email).toLowerCase() === email))
          throw new OperationError(
            409,
            "Email sudah terdaftar. Kelola akun melalui daftar pengguna.",
          );
        // Redirect is fixed by server configuration, never accepted from the browser.
        const redirect = encodeURIComponent(`${config.appOrigin}/auth/invite/`);
        const invited = await call(
          `/auth/v1/invite?redirect_to=${redirect}`,
          { email, data: { full_name: name } },
          true,
        );
        if (!invited?.id)
          throw new OperationError(
            502,
            "Respons undangan tidak lengkap. Refresh daftar sebelum mencoba kembali.",
          );
        if (input.role === "ADMIN") {
          try {
            await call("/rest/v1/rpc/admin_set_role", {
              target_id: invited.id,
              new_role: "ADMIN",
            });
          } catch {
            return respond({
              message:
                "Undangan terkirim, tetapi peran Admin belum tersimpan. Refresh daftar dan periksa peran pengguna sebelum mengubahnya kembali.",
              warning: true,
            });
          }
        }
        return respond({ message: "Undangan berhasil dikirim." });
      }
      if (input.action === "delete") {
        const id = typeof input.id === "string" ? input.id : "";
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id,
          )
        )
          throw new OperationError(400, "ID pengguna tidak valid.");
        if (id === actor.id)
          throw new OperationError(403, messages.SELF_PROTECTED);
        // Database rechecks authorization under the same lock as role/status changes.
        // Disable access first. If Auth deletion fails, leave the account safely
        // disabled/pending; retries are possible and reactivation is prohibited.
        await call("/rest/v1/rpc/admin_prepare_delete", { target_id: id });
        try {
          await call(
            `/auth/v1/admin/users/${id}`,
            { should_soft_delete: false },
            true,
            "DELETE",
          );
        } catch {
          throw new OperationError(
            502,
            "Akses pengguna sudah dinonaktifkan, tetapi penghapusan belum selesai. Refresh daftar lalu coba Hapus kembali. Jika tetap gagal, hubungi pengelola teknis.",
          );
        }
        return respond({ message: "Pengguna berhasil dihapus." });
      }
      throw new OperationError(400, "Operasi tidak dikenal.");
    } catch (error) {
      return respond(
        {
          error:
            error instanceof OperationError
              ? error.message
              : "Layanan tidak merespons. Refresh daftar sebelum mencoba kembali.",
        },
        error instanceof OperationError ? error.status : 502,
      );
    }
  };
}
