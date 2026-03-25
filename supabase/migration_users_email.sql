-- Migration : champ email sur users (pour tous les rôles : admin, formateur, stagiaire)
-- Permet première connexion, réinitialisation mot de passe par email ou username.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Index pour recherche par email (connexion / réinitialisation)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(TRIM(email)));

-- Contrainte optionnelle : unicité de l'email quand renseigné
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (LOWER(TRIM(email))) WHERE email IS NOT NULL AND TRIM(email) != '';
