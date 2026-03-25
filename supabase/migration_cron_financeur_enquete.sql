-- Cron : enquête satisfaction financeur (7 jours après la formation)
-- Prérequis : mêmes que migration_cron_enquete_froid (pg_cron, pg_net, secrets Vault)

SELECT cron.schedule(
  'enquete-financeur-quotidien',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/send-financeur-survey',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
