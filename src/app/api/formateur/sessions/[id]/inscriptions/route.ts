import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

async function getFormateurAndVerifySession(
  sessionId: string
): Promise<{ formateurId: string } | NextResponse> {
  const session = await getSession();
  if (!session || session.role !== "formateur") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { data: formateur } = await supabase
    .from("formateurs")
    .select("id")
    .eq("user_id", session.sub)
    .single();
  if (!formateur) {
    return NextResponse.json({ error: "Formateur non trouvé" }, { status: 404 });
  }
  const { data: sess } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("formateur_id", formateur.id)
    .single();
  if (!sess) {
    return NextResponse.json({ error: "Session non trouvée ou non autorisée" }, { status: 404 });
  }
  return { formateurId: formateur.id };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const result = await getFormateurAndVerifySession(sessionId);
  if (result instanceof NextResponse) return result;

  const { data, error } = await supabase
    .from("inscriptions")
    .select(`
      id,
      session_id,
      stagiaire_id,
      analyse_besoins_texte,
      created_at,
      stagiaire:stagiaires(id, nom, prenom, user_id, users(username))
    `)
    .eq("session_id", sessionId)
    .order("created_at");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const result = await getFormateurAndVerifySession(sessionId);
  if (result instanceof NextResponse) return result;

  const body = await request.json();
  const { stagiaire_id, analyse_besoins_texte } = body;
  if (!stagiaire_id) {
    return NextResponse.json(
      { error: "Stagiaire requis" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("inscriptions")
    .insert({
      session_id: sessionId,
      stagiaire_id,
      analyse_besoins_texte: analyse_besoins_texte?.trim() || null,
    })
    .select(`
      id,
      session_id,
      stagiaire_id,
      analyse_besoins_texte,
      created_at,
      stagiaire:stagiaires(id, nom, prenom, user_id, users(username))
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ce stagiaire est déjà inscrit à cette session" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
