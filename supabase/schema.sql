-- SF Formation - Schéma QUALIOPI
-- Exécuter ce script dans l'éditeur SQL Supabase

-- Enum des rôles utilisateur
CREATE TYPE user_role AS ENUM ('admin', 'formateur', 'stagiaire');

-- Enum des types d'étapes de formation
CREATE TYPE step_type AS ENUM (
  'test_pre',
  'emargement',
  'points_cles',
  'test_fin',
  'enquete_satisfaction',
  'bilan_final'
);

-- Enum des types de documents (pour les questions)
CREATE TYPE document_type AS ENUM (
  'test_pre',
  'points_cles',
  'test_fin',
  'enquete_satisfaction',
  'bilan_final'
);

-- Enum des types de réponse aux questions
CREATE TYPE question_response_type AS ENUM (
  'qcm',
  'texte_libre',
  'liste',
  'echelle'
);

-- Table utilisateurs (auth custom, sans Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  first_login_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table stagiaires (liée à users)
CREATE TABLE stagiaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table formateurs (liée à users)
CREATE TABLE formateurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table formations (une seule pour l'instant : Hygiène alimentaire)
CREATE TABLE formations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table sessions de formation
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  nom TEXT NOT NULL,
  nb_creneaux INTEGER NOT NULL CHECK (nb_creneaux > 0),
  formateur_id UUID NOT NULL REFERENCES formateurs(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dates des sessions (jours non forcément consécutifs)
CREATE TABLE session_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  UNIQUE(session_id, date)
);

-- Inscriptions stagiaires à une session (+ analyse des besoins remplie par l'admin)
CREATE TABLE inscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  stagiaire_id UUID NOT NULL REFERENCES stagiaires(id) ON DELETE CASCADE,
  analyse_besoins_texte TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, stagiaire_id)
);

-- Créneaux d'émargement (heures début/fin remplies par le formateur)
CREATE TABLE session_creneaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL,
  heure_debut TIMESTAMPTZ,
  heure_fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, ordre)
);

-- Déclenchement d'une étape par le formateur (tous les stagiaires la reçoivent)
CREATE TABLE session_step_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  step_type step_type NOT NULL,
  creneau_id UUID REFERENCES session_creneaux(id) ON DELETE SET NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documents (tests) par formation (nom affiché, ordre, rempli par stagiaire ou formateur)
CREATE TABLE formation_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  nom_affiche TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  rempli_par TEXT NOT NULL DEFAULT 'stagiaire' CHECK (rempli_par IN ('stagiaire', 'formateur', 'financeur')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(formation_id, document_type)
);

CREATE INDEX idx_formation_documents_formation ON formation_documents(formation_id);

-- Questions (remplies en BDD par l'admin) par formation et type de document
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formation_id UUID NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  ordre INTEGER NOT NULL,
  libelle TEXT NOT NULL,
  type_reponse question_response_type NOT NULL,
  options JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Réponses aux questions (tests, enquête, bilan) par inscription
CREATE TABLE reponses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscription_id UUID NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  valeur TEXT,
  valeur_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inscription_id, question_id)
);

-- Émargements (signature par créneau par stagiaire)
CREATE TABLE emargements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscription_id UUID NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  creneau_id UUID NOT NULL REFERENCES session_creneaux(id) ON DELETE CASCADE,
  signed_at TIMESTAMPTZ NOT NULL,
  signature_data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inscription_id, creneau_id)
);

-- Suivi de complétion des étapes par stagiaire (pour afficher/masquer le popup)
CREATE TABLE step_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscription_id UUID NOT NULL REFERENCES inscriptions(id) ON DELETE CASCADE,
  step_type step_type NOT NULL,
  creneau_id UUID REFERENCES session_creneaux(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inscription_id, step_type, creneau_id)
);

-- Index pour les requêtes courantes
CREATE INDEX idx_inscriptions_session ON inscriptions(session_id);
CREATE INDEX idx_inscriptions_stagiaire ON inscriptions(stagiaire_id);
CREATE INDEX idx_session_step_triggers_session ON session_step_triggers(session_id);
CREATE INDEX idx_questions_document_type ON questions(document_type);
CREATE INDEX idx_questions_formation_document ON questions(formation_id, document_type);
CREATE INDEX idx_reponses_inscription ON reponses(inscription_id);
CREATE INDEX idx_emargements_inscription ON emargements(inscription_id);
CREATE INDEX idx_step_completions_inscription ON step_completions(inscription_id);

-- RLS (Row Level Security) : à activer selon vos besoins
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- etc.

-- Insert formation par défaut
INSERT INTO formations (nom) VALUES ('Hygiène alimentaire');

-- Documents par défaut pour la formation Hygiène alimentaire
INSERT INTO formation_documents (formation_id, document_type, nom_affiche, ordre, rempli_par)
SELECT f.id, dt.document_type, dt.nom_affiche, dt.ordre, dt.rempli_par
FROM formations f
CROSS JOIN (
  VALUES
    ('test_pre'::document_type, 'Test de pré-formation', 1, 'stagiaire'),
    ('points_cles'::document_type, 'Test Points clés', 2, 'stagiaire'),
    ('test_fin'::document_type, 'Test de fin de formation', 3, 'stagiaire'),
    ('enquete_satisfaction'::document_type, 'Enquête de satisfaction', 4, 'stagiaire'),
    ('bilan_final'::document_type, 'Bilan final', 5, 'formateur')
) AS dt(document_type, nom_affiche, ordre, rempli_par);
