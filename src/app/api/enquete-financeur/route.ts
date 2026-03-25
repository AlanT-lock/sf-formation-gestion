import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token?.trim()) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const { data: tokenRow, error: tokenErr } = await supabase
    .from("financeur_enquete_tokens")
    .select("id, session_financeur_id, expires_at, submitted_at")
    .eq("token", token.trim())
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }
  if (tokenRow.submitted_at) {
    return NextResponse.json(
      { error: "Cette enquête a déjà été remplie.", alreadySubmitted: true },
      { status: 400 }
    );
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Ce lien a expiré." }, { status: 400 });
  }

  const { data: sf, error: sfErr } = await supabase
    .from("session_financeurs")
    .select("id, nom, session_id")
    .eq("id", tokenRow.session_financeur_id)
    .single();

  if (sfErr || !sf) {
    return NextResponse.json({ error: "Financeur non trouvé" }, { status: 404 });
  }

  const { data: session, error: sessErr } = await supabase
    .from("sessions")
    .select("id, nom, formation_id, formation:formations(nom)")
    .eq("id", sf.session_id)
    .single();

  if (sessErr || !session) {
    return NextResponse.json({ error: "Session non trouvée" }, { status: 404 });
  }

  type FormationRef = { nom: string } | { nom: string }[] | null;
  const formation = Array.isArray(session.formation)
    ? (session.formation[0] as { nom: string }) ?? null
    : (session.formation as FormationRef);
  const formationNom = formation && typeof formation === "object" && "nom" in formation
    ? (formation as { nom: string }).nom
    : "—";

  const sessionTyped = session as { formation_id: string };
  const { data: questions } = await supabase
    .from("questions")
    .select("id, ordre, libelle, type_reponse, options")
    .eq("formation_id", sessionTyped.formation_id)
    .eq("document_type", "enquete_satisfaction_financeur")
    .order("ordre");

  return NextResponse.json({
    token,
    session_financeur_id: tokenRow.session_financeur_id,
    financeur_nom: sf.nom,
    session_nom: session.nom ?? "—",
    formation_nom: formationNom,
    questions: questions ?? [],
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { token, reponses } = body as {
    token?: string;
    reponses?: { question_id: string; valeur?: string; valeur_json?: unknown }[];
  };
  if (!token?.trim() || !Array.isArray(reponses)) {
    return NextResponse.json(
      { error: "Token et reponses requis" },
      { status: 400 }
    );
  }

  const { data: tokenRow, error: tokenErr } = await supabase
    .from("financeur_enquete_tokens")
    .select("id, session_financeur_id, expires_at, submitted_at")
    .eq("token", token.trim())
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
  }
  if (tokenRow.submitted_at) {
    return NextResponse.json(
      { error: "Cette enquête a déjà été remplie.", alreadySubmitted: true },
      { status: 400 }
    );
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Ce lien a expiré." }, { status: 400 });
  }

  const sessionFinanceurId = tokenRow.session_financeur_id;
  const rows = reponses
    .filter((r) => r.question_id)
    .map((r) => ({
      session_financeur_id: sessionFinanceurId,
      question_id: r.question_id,
      valeur: r.valeur ?? null,
      valeur_json: r.valeur_json ?? null,
    }));

  if (rows.length > 0) {
    const { error: insertErr } = await supabase
      .from("financeur_enquete_reponses")
      .upsert(rows, { onConflict: "session_financeur_id,question_id" });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  await supabase
    .from("financeur_enquete_tokens")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", tokenRow.id);

  return NextResponse.json({ ok: true });
}
