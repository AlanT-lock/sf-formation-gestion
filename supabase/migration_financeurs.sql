-- Migration : Financeurs de session + Enquête satisfaction financeur
-- 1) Financeurs par session (nom, email)
-- 2) Document "Enquête de satisfaction financeur" (sans auth, lien magique)
-- 3) Envoi automatique 7 jours après la formation
--
-- IMPORTANT : Exécuter d'abord migration_financeurs_enum.sql
-- (PostgreSQL exige que la nouvelle valeur enum soit committée avant usage)

-- Financeurs d'une session (un financeur peut être lié à une seule session, plusieurs par session)
CREATE TABLE IF NOT EXISTS session_financeurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_financeurs_session ON session_financeurs(session_id);

-- Jetons pour le lien magique (un par financeur, identifie session+financeur)
CREATE TABLE IF NOT EXISTS financeur_enquete_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_financeur_id UUID NOT NULL REFERENCES session_financeurs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financeur_enquete_tokens_token ON financeur_enquete_tokens(token);
CREATE INDEX IF NOT EXISTS idx_financeur_enquete_tokens_sf ON financeur_enquete_tokens(session_financeur_id);

-- Réponses enquête financeur
CREATE TABLE IF NOT EXISTS financeur_enquete_reponses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_financeur_id UUID NOT NULL REFERENCES session_financeurs(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  valeur TEXT,
  valeur_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_financeur_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_financeur_enquete_reponses_sf ON financeur_enquete_reponses(session_financeur_id);

-- Suivi envoi enquête financeur (7 jours après)
CREATE TABLE IF NOT EXISTS financeur_enquete_sent (
  session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Document enquête financeur pour les formations existantes
INSERT INTO formation_documents (formation_id, document_type, nom_affiche, ordre, rempli_par)
SELECT f.id, 'enquete_satisfaction_financeur'::document_type, 'Enquête de satisfaction financeur', 6, 'financeur'
FROM formations f
WHERE NOT EXISTS (
  SELECT 1 FROM formation_documents fd
  WHERE fd.formation_id = f.id AND fd.document_type = 'enquete_satisfaction_financeur'
);

-- Fonction : sessions dont la dernière date est il y a 7 jours, avec des financeurs, pas encore envoyé
CREATE OR REPLACE FUNCTION get_sessions_for_financeur_enquete()
RETURNS TABLE(session_id UUID) AS $$
  SELECT s.id
  FROM sessions s
  INNER JOIN (
    SELECT sd.session_id, MAX(sd.date)::date AS last_date
    FROM session_dates sd
    GROUP BY sd.session_id
  ) last ON last.session_id = s.id AND last.last_date = (CURRENT_DATE - INTERVAL '7 days')
  INNER JOIN session_financeurs sf ON sf.session_id = s.id
  WHERE s.id NOT IN (SELECT financeur_enquete_sent.session_id FROM financeur_enquete_sent)
  GROUP BY s.id;
$$ LANGUAGE sql STABLE;
