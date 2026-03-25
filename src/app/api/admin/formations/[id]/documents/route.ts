import { NextRequest, NextResponse } from "next/server";
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
    .from("formation_documents")
    .select("id, formation_id, document_type, nom_affiche, ordre, rempli_par, created_at")
    .eq("formation_id", id)
    .order("ordre");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const { document_id, nom_affiche, ordre, rempli_par } = body;
  if (!document_id) {
    return NextResponse.json(
      { error: "document_id requis" },
      { status: 400 }
    );
  }
  const updates: { nom_affiche?: string; ordre?: number; rempli_par?: string } = {};
  if (typeof nom_affiche === "string") updates.nom_affiche = nom_affiche.trim();
  if (typeof ordre === "number") updates.ordre = ordre;
  if (rempli_par === "stagiaire" || rempli_par === "formateur" || rempli_par === "financeur") updates.rempli_par = rempli_par;
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "nom_affiche, ordre ou rempli_par requis" },
      { status: 400 }
    );
  }
  const { data, error } = await supabase
    .from("formation_documents")
    .update(updates)
    .eq("id", document_id)
    .eq("formation_id", id)
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
