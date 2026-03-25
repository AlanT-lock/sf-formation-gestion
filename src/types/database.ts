export type UserRole = "admin" | "formateur" | "stagiaire";

export type StepType =
  | "test_pre"
  | "emargement"
  | "points_cles"
  | "test_fin"
  | "enquete_satisfaction"
  | "bilan_final";

export type DocumentType =
  | "test_pre"
  | "points_cles"
  | "test_fin"
  | "enquete_satisfaction"
  | "enquete_satisfaction_financeur"
  | "bilan_final";

export type QuestionResponseType = "qcm" | "texte_libre" | "liste" | "echelle";

export interface User {
  id: string;
  username: string;
  email: string | null;
  password_hash: string;
  role: UserRole;
  first_login_done: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stagiaire {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  created_at: string;
}

export interface Formateur {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  created_at: string;
}

export interface Formation {
  id: string;
  nom: string;
  created_at: string;
}

export interface FormationDocument {
  id: string;
  formation_id: string;
  document_type: DocumentType;
  nom_affiche: string;
  ordre: number;
  created_at: string;
}

export interface Session {
  id: string;
  formation_id: string;
  nom: string;
  nb_creneaux: number;
  formateur_id: string;
  created_at: string;
}

export interface SessionDate {
  id: string;
  session_id: string;
  date: string;
}

export interface Inscription {
  id: string;
  session_id: string;
  stagiaire_id: string;
  analyse_besoins_texte: string | null;
  created_at: string;
}

export interface SessionCreneau {
  id: string;
  session_id: string;
  ordre: number;
  heure_debut: string | null;
  heure_fin: string | null;
  created_at: string;
}

export interface SessionStepTrigger {
  id: string;
  session_id: string;
  step_type: StepType;
  creneau_id: string | null;
  triggered_at: string;
}

export interface Question {
  id: string;
  formation_id: string;
  document_type: DocumentType;
  ordre: number;
  libelle: string;
  type_reponse: QuestionResponseType;
  options: Record<string, unknown> | null;
  created_at: string;
}

export interface Reponse {
  id: string;
  inscription_id: string;
  question_id: string;
  valeur: string | null;
  valeur_json: Record<string, unknown> | null;
  created_at: string;
}

export interface Emargement {
  id: string;
  inscription_id: string;
  creneau_id: string;
  signed_at: string;
  signature_data: string;
  created_at: string;
}

export interface SessionFinanceur {
  id: string;
  session_id: string;
  nom: string;
  email: string;
  created_at: string;
}

export interface StepCompletion {
  id: string;
  inscription_id: string;
  step_type: StepType;
  creneau_id: string | null;
  completed_at: string;
}

export interface PendingStep {
  trigger_id: string;
  inscription_id: string;
  session_id: string;
  session_nom: string;
  step_type: StepType;
  creneau_id: string | null;
  creneau_ordre: number | null;
}
