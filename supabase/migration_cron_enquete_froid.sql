-- Migration : Cron quotidien pour l'enquête de satisfaction à froid (14 jours après la formation)
-- Prérequis :
--   1. Activer les extensions pg_cron et pg_net (Dashboard > Database > Extensions)
--   2. Créer les secrets dans le Vault (Dashboard > Database > Vault) :
--      - project_url : https://VOTRE_PROJECT_REF.supabase.co
--      - anon_key : votre clé anon Supabase (Settings > API)
--
-- Exécuter ce script dans l'éditeur SQL Supabase APRÈS avoir créé les secrets.

SELECT cron.schedule(
  'enquete-satisfaction-froid-quotidien',
  '0 8 * * *',  -- Tous les jours à 08:00 UTC (09:00 heure de Paris en hiver, 10:00 en été)
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/send-satisfaction-survey',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
