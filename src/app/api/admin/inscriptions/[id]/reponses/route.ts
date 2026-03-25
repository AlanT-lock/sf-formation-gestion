import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { DocumentType } from "@/types/database";

const DOCUMENT_TYPES: DocumentType[] = [
  "test_pre",
  "points_cles",
  "test_fin",
  "enquete_satisfaction",
  "bilan_final",
];

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  test_pre: "Test de pré-formation",
  points_cles: "Test Points clés",
  test_fin: "Test de fin de formation",
  enquete_satisfaction: "Enquête de satisfaction",
  enquete_satisfaction_financeur: "Enquête de satisfaction financeur",
  bilan_final: "Bilan final",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id: inscriptionId } = await params;

  const { data: inscription, error: insErr } = await supabase
    .from("inscriptions")
    .select(`
      id,
      session_id,
      stagiaire_id,
      analyse_besoins_texte,
      stagiaire:stagiaires(nom, prenom),
      session:sessions(nom, formation_id, formation:formations(nom))
    `)
    .eq("id", inscriptionId)
    .single();

  if (insErr || !inscription) {
    return NextResponse.json({ error: "Inscription non trouvée" }, { status: 404 });
  }

  const sessionRaw = inscription.session as { nom?: string; formation_id?: string; formation?: { nom: string } | { nom: string }[] } | { nom?: string; formation_id?: string; formation?: { nom: string } | { nom: string }[] }[] | null;
  const sessionData = Array.isArray(sessionRaw) ? (sessionRaw[0] ?? null) : sessionRaw;
  const formationId = sessionData?.formation_id ?? null;
  const stagiaire = Array.isArray(inscription.stagiaire)
    ? (inscription.stagiaire[0] as { nom: string; prenom: string } | null) ?? null
    : (inscription.stagiaire as { nom: string; prenom: string } | null);
  const formation = sessionData?.formation
    ? (Array.isArray(sessionData.formation) ? sessionData.formation[0] : sessionData.formation) as { nom: string }
    : null;

  const { data: reponsesList } = await supabase
    .from("reponses")
    .select("question_id, valeur, valeur_json")
    .eq("inscription_id", inscriptionId);

  const reponsesByQ = (reponsesList ?? []).reduce(
    (acc, r) => {
      acc[r.question_id] = r.valeur ?? (r.valeur_json != null ? JSON.stringify(r.valeur_json) : "");
      return acc;
    },
    {} as Record<string, string>
  );

  const documents: {
    document_type: DocumentType;
    nom_affiche: string;
    ordre: number;
    questions: { id: string; libelle: string; ordre: number; type_reponse: string; options: Record<string, unknown> | null }[];
    reponses: Record<string, string>;
  }[] = [];

  if (formationId) {
    const { data: fdList } = await supabase
      .from("formation_documents")
      .select("document_type, nom_affiche, ordre")
      .eq("formation_id", formationId)
      .in("document_type", DOCUMENT_TYPES)
      .order("ordre");

    for (const fd of fdList ?? []) {
      const { data: questions } = await supabase
        .from("questions")
        .select("id, libelle, ordre, type_reponse, options")
        .eq("formation_id", formationId)
        .eq("document_type", fd.document_type)
        .order("ordre");

      const qList = (questions ?? []).map((q) => ({
        id: q.id,
        libelle: q.libelle,
        ordre: q.ordre,
        type_reponse: q.type_reponse ?? "texte_libre",
        options: q.options as Record<string, unknown> | null,
      }));
      const rep: Record<string, string> = {};
      for (const q of qList) {
        if (q.id in reponsesByQ) rep[q.id] = reponsesByQ[q.id];
      }
      documents.push({
        document_type: fd.document_type as DocumentType,
        nom_affiche: fd.nom_affiche,
        ordre: (fd as { ordre?: number }).ordre ?? 0,
        questions: qList,
        reponses: rep,
      });
    }
  }

  const { data: emargements } = await supabase
    .from("emargements")
    .select(`
      signed_at,
      signature_data,
      creneau:session_creneaux(ordre)
    `)
    .eq("inscription_id", inscriptionId)
    .order("signed_at");

  const emargementsFormatted = (emargements ?? []).map((e) => {
    const creneau = Array.isArray(e.creneau) ? e.creneau[0] : e.creneau;
    const ordre = creneau && typeof creneau === "object" && "ordre" in creneau ? (creneau as { ordre: number }).ordre : null;
    return {
      creneau_ordre: ordre,
      signed_at: e.signed_at,
      signature_data: e.signature_data,
    };
  });

  return NextResponse.json({
    inscription: {
      id: inscription.id,
      session_id: inscription.session_id,
      stagiaire_id: inscription.stagiaire_id,
      analyse_besoins_texte: inscription.analyse_besoins_texte,
    },
    stagiaire: stagiaire ? { nom: stagiaire.nom, prenom: stagiaire.prenom } : null,
    session_nom: sessionData?.nom ?? null,
    formation_nom: formation?.nom ?? null,
    documents,
    document_labels: DOCUMENT_LABELS,
    emargements: emargementsFormatted,
  });
}
