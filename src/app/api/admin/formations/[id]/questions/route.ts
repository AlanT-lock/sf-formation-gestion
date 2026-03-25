import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { DocumentType } from "@/types/database";

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  "test_pre",
  "points_cles",
  "test_fin",
  "enquete_satisfaction",
  "enquete_satisfaction_financeur",
  "bilan_final",
];
const VALID_RESPONSE_TYPES = ["qcm", "texte_libre", "liste", "echelle"] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id: formationId } = await params;
  const { searchParams } = new URL(request.url);
  const document_type = searchParams.get("document_type") as DocumentType | null;
  let query = supabase
    .from("questions")
    .select("id, formation_id, document_type, ordre, libelle, type_reponse, options, created_at")
    .eq("formation_id", formationId)
    .order("ordre");
  if (document_type && VALID_DOCUMENT_TYPES.includes(document_type)) {
    query = query.eq("document_type", document_type);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { id: formationId } = await params;
  const body = await request.json();
  const { document_type, ordre, libelle, type_reponse, options } = body;
  if (!document_type || !VALID_DOCUMENT_TYPES.includes(document_type)) {
    return NextResponse.json(
      { error: "document_type invalide" },
      { status: 400 }
    );
  }
  if (typeof ordre !== "number" || ordre < 0) {
    return NextResponse.json(
      { error: "ordre invalide (nombre >= 0)" },
      { status: 400 }
    );
  }
  if (!libelle?.trim()) {
    return NextResponse.json(
      { error: "libelle requis" },
      { status: 400 }
    );
  }
  if (!type_reponse || !VALID_RESPONSE_TYPES.includes(type_reponse)) {
    return NextResponse.json(
      { error: "type_reponse invalide (qcm, texte_libre, liste, echelle)" },
      { status: 400 }
    );
  }
  const { data, error } = await supabase
    .from("questions")
    .insert({
      formation_id: formationId,
      document_type,
      ordre: Number(ordre),
      libelle: libelle.trim(),
      type_reponse,
      options: options ?? null,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
