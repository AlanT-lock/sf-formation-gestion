import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createToken, setAuthCookie } from "@/lib/auth";
import type { UserRole } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, role } = body;
    if (!username?.trim() || !role) {
      return NextResponse.json(
        { error: "Identifiant et rôle requis" },
        { status: 400 }
      );
    }
    if (role !== "formateur" && role !== "stagiaire") {
      return NextResponse.json(
        { error: "Rôle invalide" },
        { status: 400 }
      );
    }

    const searchUsername = username.trim().toLowerCase();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, role, first_login_done")
      .ilike("username", searchUsername)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "Identifiant introuvable ou première connexion déjà effectuée" },
        { status: 401 }
      );
    }
    if (user.role !== role) {
      return NextResponse.json(
        { error: "Identifiant introuvable ou première connexion déjà effectuée" },
        { status: 401 }
      );
    }
    if (user.first_login_done) {
      return NextResponse.json(
        { error: "Première connexion déjà effectuée. Utilisez le formulaire de connexion avec votre mot de passe." },
        { status: 400 }
      );
    }

    const token = await createToken({
      userId: user.id,
      username: user.username,
      role: user.role as UserRole,
      firstLoginDone: false,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      ok: true,
      role: user.role,
      firstLoginDone: false,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
