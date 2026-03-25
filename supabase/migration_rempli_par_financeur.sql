-- Migration : ajouter "financeur" aux valeurs de rempli_par
-- (Fourni par le financeur — pour l'enquête de satisfaction financeur)

ALTER TABLE formation_documents
  DROP CONSTRAINT IF EXISTS formation_documents_rempli_par_check;

ALTER TABLE formation_documents
  ADD CONSTRAINT formation_documents_rempli_par_check
  CHECK (rempli_par IN ('stagiaire', 'formateur', 'financeur'));

-- Enquête satisfaction financeur : par défaut fourni par le financeur
UPDATE formation_documents
SET rempli_par = 'financeur'
WHERE document_type = 'enquete_satisfaction_financeur';
