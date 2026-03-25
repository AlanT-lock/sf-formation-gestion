import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "formateur") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  const { data: formateur } = await supabase
    .from("formateurs")
    .select("id")
    .eq("user_id", session.sub)
    .single();
  if (!formateur) {
    return NextResponse.json({ error: "Formateur non trouvé" }, { status: 404 });
  }
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id,
      nom,
      nb_creneaux,
      formation_id,
      created_at,
      formation:formations(nom),
      session_creneaux(id, ordre, heure_debut, heure_fin),
      session_step_triggers(id, step_type, creneau_id, triggered_at),
      inscriptions(id, stagiaire_id, analyse_besoins_texte, stagiaire:stagiaires(nom, prenom, user_id, users(username)))
    `)
    .eq("id", id)
    .eq("formateur_id", formateur.id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Session non trouvée" }, { status: 404 });
  }

  let formation_documents: { document_type: string; nom_affiche: string; rempli_par: string }[] = [];
  if (data.formation_id) {
    const { data: fd } = await supabase
      .from("formation_documents")
      .select("document_type, nom_affiche, rempli_par")
      .eq("formation_id", data.formation_id);
    formation_documents = (fd ?? []) as { document_type: string; nom_affiche: string; rempli_par: string }[];
  }

  const inscriptionIds =
    (data.inscriptions as { id: string }[] | null)?.map((i) => i.id) ?? [];
  let stepCompletions: { inscription_id: string; step_type: string; creneau_id: string | null }[] = [];
  if (inscriptionIds.length > 0) {
    const { data: completions } = await supabase
      .from("step_completions")
      .select("inscription_id, step_type, creneau_id")
      .in("inscription_id", inscriptionIds);
    stepCompletions = (completions ?? []) as {
      inscription_id: string;
      step_type: string;
      creneau_id: string | null;
    }[];
  }

  return NextResponse.json({
    ...data,
    formation_documents,
    step_completions: stepCompletions,
  });
}
