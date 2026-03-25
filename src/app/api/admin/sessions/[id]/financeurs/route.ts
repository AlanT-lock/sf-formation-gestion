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
    .from("session_financeurs")
    .select("id, nom, email, created_at")
    .eq("session_id", id)
    .order("created_at");
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
  const { id: sessionId } = await params;
  const body = await request.json();
  const { nom, email } = body;
  if (!nom?.trim() || !email?.trim()) {
    return NextResponse.json(
      { error: "Nom et email requis" },
      { status: 400 }
    );
  }
  const { data, error } = await supabase
    .from("session_financeurs")
    .insert({
      session_id: sessionId,
      nom: nom.trim(),
      email: email.trim(),
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
