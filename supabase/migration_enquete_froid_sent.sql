-- Migration : suivi des envois d'enquête de satisfaction à froid (2 semaines après la formation)
-- Évite d'envoyer deux fois aux mêmes stagiaires.

CREATE TABLE IF NOT EXISTS enquete_satisfaction_froid_sent (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE enquete_satisfaction_froid_sent IS 'Sessions pour lesquelles l''enquête à froid (2 semaines après) a déjà été envoyée';

-- Fonction : retourne les sessions dont la dernière date est il y a exactement 14 jours
CREATE OR REPLACE FUNCTION get_sessions_for_enquete_froid()
RETURNS TABLE(session_id UUID) AS $$
  SELECT s.id
  FROM sessions s
  INNER JOIN (
    SELECT sd.session_id, MAX(sd.date)::date AS last_date
    FROM session_dates sd
    GROUP BY sd.session_id
  ) last ON last.session_id = s.id AND last.last_date = (CURRENT_DATE - INTERVAL '14 days')
  WHERE s.id NOT IN (SELECT enquete_satisfaction_froid_sent.session_id FROM enquete_satisfaction_froid_sent)
$$ LANGUAGE sql STABLE;
