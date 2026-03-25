import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "formateur") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { data, error } = await supabase
    .from("stagiaires")
    .select(`
      id,
      nom,
      prenom,
      user_id,
      created_at,
      users!inner(username, first_login_done)
    `)
    .order("nom");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "formateur") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const body = await request.json();
  const { nom, prenom, username: usernameBody } = body;
  if (!nom?.trim() || !prenom?.trim()) {
    return NextResponse.json(
      { error: "Nom et prénom requis" },
      { status: 400 }
    );
  }
  const suggested = `${prenom.trim().toLowerCase()}.${nom.trim().toLowerCase()}`.replace(/\s+/g, ".");
  const username = (usernameBody?.trim() && usernameBody.trim().toLowerCase().replace(/\s+/g, "."))
    ? usernameBody.trim().toLowerCase().replace(/\s+/g, ".")
    : suggested;
  if (!username) {
    return NextResponse.json(
      { error: "Identifiant requis" },
      { status: 400 }
    );
  }
  const tempPassword = "ChangeMe" + Math.random().toString(36).slice(2, 10);
  const password_hash = await hashPassword(tempPassword);

  const { data: user, error: userError } = await supabase
    .from("users")
    .insert({
      username,
      password_hash,
      role: "stagiaire",
      first_login_done: false,
    })
    .select("id")
    .single();

  if (userError) {
    if (userError.code === "23505") {
      return NextResponse.json(
        { error: "Cet identifiant est déjà utilisé. Choisissez un autre (ex. " + suggested + "2)." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  const { data: stagiaire, error: stagiaireError } = await supabase
    .from("stagiaires")
    .insert({
      user_id: user.id,
      nom: nom.trim(),
      prenom: prenom.trim(),
    })
    .select()
    .single();

  if (stagiaireError) {
    await supabase.from("users").delete().eq("id", user.id);
    return NextResponse.json({ error: stagiaireError.message }, { status: 500 });
  }

  return NextResponse.json({
    ...stagiaire,
    username,
    message: "Stagiaire créé. Identifiant : " + username + " (le stagiaire définira son mot de passe à la première connexion).",
  });
}
