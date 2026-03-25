-- =============================================================================
-- SF Formation - RLS (Row Level Security) COMPLET
-- =============================================================================
--
-- IMPORTANT AVANT D'EXÉCUTER :
-- ---------------------------
-- Cette application utilise une authentification personnalisée (JWT cookies),
-- PAS Supabase Auth. Tous les accès à la base se font via les API Next.js
-- côté SERVEUR.
--
-- OBLIGATION CRITIQUE : Votre backend Next.js DOIT utiliser la clé
-- SUPABASE_SERVICE_ROLE_KEY (et non l'anon key) pour les appels Supabase.
-- La clé service_role BYPASSE les RLS. Si vous gardez l'anon key côté serveur,
-- TOUTES les requêtes échoueront après activation des RLS.
--
-- Étapes :
-- 1. Ajouter SUPABASE_SERVICE_ROLE_KEY dans .env.local (depuis le dashboard Supabase)
-- 2. Créer un client Supabase serveur utilisant cette clé (voir src/lib/supabase-server.ts)
-- 3. Remplacer les imports de @/lib/supabase par le client serveur dans les API routes
--    et Server Components
-- 4. Exécuter ce script dans l'éditeur SQL Supabase
--
-- Les Edge Functions (cron envoi enquêtes) utilisent déjà service_role.
--
-- =============================================================================

-- Activer RLS sur TOUTES les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stagiaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE formateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_creneaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_step_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE formation_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reponses ENABLE ROW LEVEL SECURITY;
ALTER TABLE emargements ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_financeurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeur_enquete_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeur_enquete_reponses ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeur_enquete_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquete_satisfaction_froid_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquete_froid_relance_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Politiques : BLOQUER tout accès via la clé anon
-- =============================================================================
-- Sans politique permissive pour le rôle 'anon', toutes les requêtes avec
-- la clé anon sont refusées. Le service_role bypass RLS automatiquement.
--
-- On pourrait créer des politiques fines (admin voit tout, formateur voit ses
-- sessions, stagiaire voit ses inscriptions) MAIS cela nécessiterait que
-- Supabase Auth soit utilisé pour que auth.uid() / auth.jwt()->>'role' soient
-- disponibles. Avec l'auth custom (JWT cookies), ce n'est pas le cas.
--
-- Donc : aucune politique permissive = tout refusé pour anon.
-- Le backend avec service_role fonctionne normalement.
-- =============================================================================

-- Note : On pourrait ajouter des politiques "FORCE ROW LEVEL SECURITY" sur les
-- tables sensibles pour s'assurer que même le propriétaire (si postgres était utilisé)
-- est soumis aux règles. Par défaut, le propriétaire bypass RLS. Pour une
-- application Supabase typique, les requêtes passent par l'API Supabase (anon ou
-- service_role), pas par un utilisateur postgres direct.

-- Politique explicite : refuser tout pour anon (défense en profondeur)
-- Ces politiques utilisent une condition impossible pour anon, garantissant
-- qu'aucune ligne n'est jamais retournée/modifiée via anon.

CREATE POLICY "anon_no_access" ON users
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON stagiaires
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON formateurs
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON formations
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON sessions
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON session_dates
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON inscriptions
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON session_creneaux
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON session_step_triggers
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON formation_documents
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON questions
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON reponses
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON emargements
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON step_completions
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON session_financeurs
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON financeur_enquete_tokens
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON financeur_enquete_reponses
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON financeur_enquete_sent
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON enquete_satisfaction_froid_sent
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON enquete_froid_relance_sent
  FOR ALL USING (false) WITH CHECK (false);

CREATE POLICY "anon_no_access" ON password_reset_tokens
  FOR ALL USING (false) WITH CHECK (false);

-- =============================================================================
-- FIN - RLS activé sur toutes les tables
-- =============================================================================
-- Vérification : exécutez en SQL après migration :
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' AND tablename IN ('users','sessions','inscriptions',...);
-- rowsecurity doit être true pour chaque table.
-- =============================================================================
