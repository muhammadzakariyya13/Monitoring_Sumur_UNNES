import { expect, test } from "@playwright/test";
import { createAdminUsersHandler } from "../../supabase/functions/admin-users/handler";

const actorId = "00000000-0000-4000-8000-000000000001";
const targetId = "00000000-0000-4000-8000-000000000002";
const config = {
  url: "https://test.invalid",
  anonKey: "public-test",
  serviceKey: "server-only-test",
  appOrigin: "https://app.test",
};
function setup(
  overrides: Record<
    string,
    { status?: number; body: unknown } | undefined
  > = {},
) {
  const calls: {
    path: string;
    method: string;
    authorization: string;
    body: unknown;
  }[] = [];
  const defaults: typeof overrides = {
    "/auth/v1/user": {
      body: {
        id: actorId,
        email: "admin@unnes.id",
        email_confirmed_at: "2026-01-01",
      },
    },
    "/rest/v1/rpc/current_access_role": { body: "ADMIN" },
    "/rest/v1/rpc/admin_list_users": { body: [] },
    "/auth/v1/invite": { body: { id: targetId } },
    "/rest/v1/rpc/admin_set_role": { body: null },
    "/rest/v1/rpc/admin_prepare_delete": { body: null },
    [`/auth/v1/admin/users/${targetId}`]: { body: {} },
  };
  const handler = createAdminUsersHandler(config, (async (input, init) => {
    const path = new URL(String(input)).pathname;
    calls.push({
      path: String(input),
      method: init?.method ?? "GET",
      authorization: new Headers(init?.headers).get("Authorization") ?? "",
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    const result = overrides[path] ?? defaults[path];
    if (!result) throw new Error(`Unexpected endpoint ${path}`);
    return Response.json(result.body, { status: result.status ?? 200 });
  }) as typeof fetch);
  const send = (
    body: object,
    headers: Record<string, string> = {
      Authorization: "Bearer caller-token",
      Origin: config.appOrigin,
    },
  ) =>
    handler(
      new Request("https://function.test", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
    );
  return { calls, send, handler };
}

test("Edge rejects anonymous, invalid JWT, Viewer and inactive callers before privileged operations", async () => {
  const anonymous = setup();
  expect((await anonymous.send({ action: "invite" }, {})).status).toBe(401);
  expect(anonymous.calls).toHaveLength(0);
  for (const overrides of [
    { "/auth/v1/user": { status: 401, body: { message: "invalid token" } } },
    { "/rest/v1/rpc/current_access_role": { body: "VIEWER" } },
    { "/rest/v1/rpc/current_access_role": { body: null } },
  ]) {
    const { send, calls } = setup(overrides);
    expect([401, 403]).toContain(
      (await send({ action: "delete", id: targetId, role: "ADMIN" })).status,
    );
    expect(
      calls.every((call) => call.authorization === "Bearer caller-token"),
    ).toBe(true);
  }
});

test("Edge rejects foreign origin and handles preflight without Auth calls", async () => {
  const { send, handler, calls } = setup();
  expect((await send({}, { Origin: "https://evil.test" })).status).toBe(403);
  const preflight = await handler(
    new Request("https://function.test", {
      method: "OPTIONS",
      headers: { Origin: config.appOrigin },
    }),
  );
  expect(preflight.status).toBe(204);
  expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe(
    config.appOrigin,
  );
  expect(calls).toHaveLength(0);
});

test("Invite uses a server-fixed redirect, keeps secrets server-side and persists role via caller RPC", async () => {
  const { send, calls } = setup();
  const response = await send({
    action: "invite",
    name: " Penguji ",
    email: "NEW@unnes.id",
    role: "ADMIN",
    redirectTo: "https://evil.test",
  });
  expect(response.status).toBe(200);
  expect(await response.text()).not.toContain(config.serviceKey);
  const invite = calls.find((c) => c.path.includes("/invite?"))!;
  expect(new URL(invite.path).searchParams.get("redirect_to")).toBe(
    `${config.appOrigin}/auth/invite/`,
  );
  expect(invite.body).toEqual({
    email: "new@unnes.id",
    data: { full_name: "Penguji" },
  });
  expect(invite.authorization).toBe(`Bearer ${config.serviceKey}`);
  expect(calls.at(-1)?.body).toEqual({
    target_id: targetId,
    new_role: "ADMIN",
  });
  expect(calls.at(-1)?.authorization).toBe("Bearer caller-token");
});

test("Invite validates domain, role, duplicate account and reports partial role failure", async () => {
  for (const body of [
    { email: "outside@example.com", role: "VIEWER" },
    { email: "new@unnes.id", role: "OWNER" },
  ]) {
    const { send, calls } = setup();
    expect(
      (await send({ action: "invite", name: "Penguji", ...body })).status,
    ).toBe(400);
    expect(calls.some((c) => c.authorization.includes(config.serviceKey))).toBe(
      false,
    );
  }
  const duplicate = setup({
    "/rest/v1/rpc/admin_list_users": { body: [{ email: "new@unnes.id" }] },
  });
  const body = {
    action: "invite",
    name: "Penguji",
    email: "new@unnes.id",
    role: "ADMIN",
  };
  expect((await duplicate.send(body)).status).toBe(409);
  expect(
    duplicate.calls.some((c) => c.authorization.includes(config.serviceKey)),
  ).toBe(false);
  const partial = setup({
    "/rest/v1/rpc/admin_set_role": {
      status: 403,
      body: { message: "FORBIDDEN" },
    },
  });
  const response = await partial.send(body);
  expect(response.status).toBe(200);
  expect((await response.json()).warning).toBe(true);
});

test("Delete protects self and never invokes Auth delete when database authorization fails", async () => {
  const own = setup();
  expect((await own.send({ action: "delete", id: actorId })).status).toBe(403);
  expect(own.calls.some((c) => c.path.includes("admin_prepare_delete"))).toBe(
    false,
  );
  for (const message of ["FORBIDDEN", "LAST_ADMIN", "SELF_PROTECTED"]) {
    const { send, calls } = setup({
      "/rest/v1/rpc/admin_prepare_delete": { status: 400, body: { message } },
    });
    expect((await send({ action: "delete", id: targetId })).ok).toBe(false);
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  }
});

test("Delete disables access first; failed Auth deletion remains explicitly pending", async () => {
  const successful = setup();
  expect(
    (await successful.send({ action: "delete", id: targetId })).status,
  ).toBe(200);
  expect(successful.calls.at(-2)?.path).toContain("admin_prepare_delete");
  expect(successful.calls.at(-1)?.method).toBe("DELETE");
  const failed = setup({
    [`/auth/v1/admin/users/${targetId}`]: {
      status: 500,
      body: { message: "private upstream details" },
    },
  });
  const response = await failed.send({ action: "delete", id: targetId });
  expect(response.status).toBe(502);
  const body = await response.text();
  expect(body).toContain("dinonaktifkan");
  expect(body).not.toContain("private upstream");
  expect(failed.calls.some((c) => c.path.includes("admin_set_active"))).toBe(
    false,
  );
});
