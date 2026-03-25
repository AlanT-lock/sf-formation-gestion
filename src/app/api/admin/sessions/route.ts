import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id,
      nom,
      nb_creneaux,
      created_at,
      formation:formations(nom),
      formateur:formateurs(id, nom, prenom, user_id, users(username))
    `)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await request.json();
  const { nom, formation_id, nb_creneaux, formateur_id, dates, financeurs } = body;
  if (!nom?.trim() || !formation_id || !nb_creneaux || nb_creneaux < 1 || !formateur_id) {
    return NextResponse.json(
      { error: "Nom, formation, nombre de créneaux et formateur requis" },
      { status: 400 }
    );
  }

  const { data: sessionRow, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      formation_id,
      nom: nom.trim(),
      nb_creneaux: Number(nb_creneaux),
      formateur_id,
    })
    .select()
    .single();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  // Créer les créneaux (ordre 1..nb_creneaux)
  const creneaux = Array.from({ length: Number(nb_creneaux) }, (_, i) => ({
    session_id: sessionRow.id,
    ordre: i + 1,
  }));
  await supabase.from("session_creneaux").insert(creneaux);

  // Dates optionnelles
  if (Array.isArray(dates) && dates.length > 0) {
    const dateRows = dates.map((d: string) => ({
      session_id: sessionRow.id,
      date: d,
    }));
    await supabase.from("session_dates").insert(dateRows);
  }

  // Financeurs (nom + email)
  if (Array.isArray(financeurs) && financeurs.length > 0) {
    const financeurRows = financeurs
      .filter((f: { nom?: string; email?: string }) => f?.nom?.trim() && f?.email?.trim())
      .map((f: { nom: string; email: string }) => ({
        session_id: sessionRow.id,
        nom: (f.nom as string).trim(),
        email: (f.email as string).trim(),
      }));
    if (financeurRows.length > 0) {
      await supabase.from("session_financeurs").insert(financeurRows);
    }
  }

  revalidatePath("/admin", "layout");
  revalidatePath("/admin/sessions");
  revalidatePath(`/admin/sessions/${sessionRow.id}`);

  return NextResponse.json(sessionRow);
}
