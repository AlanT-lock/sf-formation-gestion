import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

async function verifyFormateurCanAccessInscription(
  inscriptionId: string
): Promise<boolean> {
  const session = await getSession();
  if (!session || session.role !== "formateur") return false;
  const { data: formateur } = await supabase
    .from("formateurs")
    .select("id")
    .eq("user_id", session.sub)
    .single();
  if (!formateur) return false;
  const { data: ins } = await supabase
    .from("inscriptions")
    .select("session_id")
    .eq("id", inscriptionId)
    .single();
  if (!ins) return false;
  const { data: sess } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", ins.session_id)
    .eq("formateur_id", formateur.id)
    .single();
  return !!sess;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "formateur") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id } = await params;
  const allowed = await verifyFormateurCanAccessInscription(id);
  if (!allowed) {
    return NextResponse.json({ error: "Inscription non trouvée ou non autorisée" }, { status: 404 });
  }
  const body = await request.json();
  const { analyse_besoins_texte } = body;

  const { data, error } = await supabase
    .from("inscriptions")
    .update({ analyse_besoins_texte: analyse_besoins_texte ?? null })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
