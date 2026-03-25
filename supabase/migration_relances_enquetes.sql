-- Migration : relances automatiques (1 semaine après le 1er envoi)
-- Financeur : relance si pas rempli 7 jours après le 1er mail
-- Stagiaire à froid : relance si pas rempli 7 jours après le mail à froid

-- Colonne pour suivi relance financeur (sur le token = 1er envoi)
ALTER TABLE financeur_enquete_tokens
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Table : inscriptions ayant reçu la relance à froid (1 par inscription)
CREATE TABLE IF NOT EXISTS enquete_froid_relance_sent (
  inscription_id UUID PRIMARY KEY REFERENCES inscriptions(id) ON DELETE CASCADE
);

COMMENT ON TABLE enquete_froid_relance_sent IS 'Inscriptions ayant reçu la relance enquête à froid (7j après le 1er mail)';

-- RPC : tokens financeur à relancer (1er envoi il y a 7+ jours, pas rempli, pas déjà relancé)
CREATE OR REPLACE FUNCTION get_financeur_tokens_for_relance()
RETURNS TABLE(
  token_id UUID,
  token TEXT,
  nom TEXT,
  email TEXT,
  expires_at TIMESTAMPTZ
) AS $$
  SELECT
    fet.id AS token_id,
    fet.token,
    sf.nom,
    sf.email,
    fet.expires_at
  FROM financeur_enquete_tokens fet
  JOIN session_financeurs sf ON sf.id = fet.session_financeur_id
  WHERE fet.submitted_at IS NULL
    AND fet.reminder_sent_at IS NULL
    AND fet.created_at <= (NOW() - INTERVAL '7 days')
    AND fet.expires_at > NOW();
$$ LANGUAGE sql STABLE;

-- RPC : inscriptions stagiaire à relancer (mail à froid envoyé il y a 7+ jours, pas de réponse enquête_satisfaction, pas déjà relancé)
CREATE OR REPLACE FUNCTION get_inscriptions_for_froid_relance()
RETURNS TABLE(
  inscription_id UUID,
  email TEXT,
  session_nom TEXT
) AS $$
  SELECT
    i.id AS inscription_id,
    u.email,
    s.nom AS session_nom
  FROM enquete_satisfaction_froid_sent ef
  JOIN sessions s ON s.id = ef.session_id
  JOIN inscriptions i ON i.session_id = s.id
  JOIN stagiaires st ON st.id = i.stagiaire_id
  JOIN users u ON u.id = st.user_id
  WHERE ef.sent_at <= (NOW() - INTERVAL '7 days')
    AND i.id NOT IN (SELECT inscription_id FROM enquete_froid_relance_sent)
    AND u.email IS NOT NULL
    AND TRIM(u.email) != ''
    AND NOT EXISTS (
      SELECT 1 FROM reponses r
      JOIN questions q ON q.id = r.question_id
      WHERE r.inscription_id = i.id
        AND q.formation_id = s.formation_id
        AND q.document_type = 'enquete_satisfaction'
    );
$$ LANGUAGE sql STABLE;
