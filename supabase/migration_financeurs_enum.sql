-- Partie 1 : Nouvelle valeur d'enum document_type
-- Doit être exécutée en premier car PostgreSQL exige qu'une nouvelle valeur
-- soit committée avant de pouvoir être utilisée dans la même session.

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'enquete_satisfaction_financeur';
