import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
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
    .eq("session_id", id)
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
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id: sessionId } = await params;
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
    .select()
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
  revalidatePath(`/admin/sessions/${sessionId}`);
  return NextResponse.json(data);
}
