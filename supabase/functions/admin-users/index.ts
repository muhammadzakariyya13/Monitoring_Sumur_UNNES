import { createAdminUsersHandler } from "./handler.ts";

Deno.serve(
  createAdminUsersHandler({
    url: Deno.env.get("SUPABASE_URL") ?? "",
    anonKey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    appOrigin: Deno.env.get("APP_ORIGIN") ?? "",
  }),
);
