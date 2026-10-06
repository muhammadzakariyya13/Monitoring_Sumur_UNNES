import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: false,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
export const domainMessage =
  "Silakan masuk menggunakan akun UNNES terverifikasi (@unnes.id).";
export function isUnnesEmail(email: string | undefined) {
  return /^[^@\s]+@unnes\.id$/i.test(email ?? "");
}
