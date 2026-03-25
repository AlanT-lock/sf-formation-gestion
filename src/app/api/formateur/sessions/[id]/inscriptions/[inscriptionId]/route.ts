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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; inscriptionId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "formateur") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { inscriptionId } = await params;
  const allowed = await verifyFormateurCanAccessInscription(inscriptionId);
  if (!allowed) {
    return NextResponse.json({ error: "Inscription non trouvée ou non autorisée" }, { status: 404 });
  }
  const { error } = await supabase
    .from("inscriptions")
    .delete()
    .eq("id", inscriptionId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
