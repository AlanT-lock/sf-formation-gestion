/**
 * Client Supabase SERVEUR uniquement - utilise la clé service_role.
 * À utiliser dans : API routes, Server Components, getServerSideProps.
 *
 * La clé service_role bypass les RLS. Ne JAMAIS exposer ce client au client (browser).
 * La variable SUPABASE_SERVICE_ROLE_KEY ne doit PAS avoir le préfixe NEXT_PUBLIC.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Service role bypass RLS. Si absente : fallback anon (à ne pas utiliser après activation RLS)
const key = serviceRoleKey?.trim() || anonKey;

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
