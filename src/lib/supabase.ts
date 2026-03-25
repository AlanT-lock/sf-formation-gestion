/**
 * Réexporte le client serveur pour compatibilité.
 * Tous les accès BDD se font côté serveur ; le client utilise service_role
 * (bypass RLS) quand SUPABASE_SERVICE_ROLE_KEY est défini.
 */
export { supabaseAdmin as supabase } from "./supabase-server";
