import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as typeof globalThis & {
  __sgLifeSupabaseClient?: SupabaseClient;
};

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  globalForSupabase.__sgLifeSupabaseClient ??= createSupabaseClient(url, key);

  return globalForSupabase.__sgLifeSupabaseClient;
}
