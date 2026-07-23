import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only. Uses SUPABASE_SECRET_KEY and bypasses RLS entirely —
// never import this from a client component, and always check the
// caller's own admin status before using it for a privileged write.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
