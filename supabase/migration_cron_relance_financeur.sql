-- Cron : relance enquête satisfaction financeur (7 jours après le 1er envoi)
-- Prérequis : pg_cron, pg_net, secrets Vault (project_url, anon_key)

SELECT cron.schedule(
  'relance-enquete-financeur-quotidien',
  '15 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/send-financeur-survey-relance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
