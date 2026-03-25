import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  getAuthCookie,
  verifyToken,
  hashPassword,
  createToken,
  setAuthCookie,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const token = await getAuthCookie();
    if (!token) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Session expirée" },
        { status: 401 }
      );
    }
    if (payload.firstLoginDone) {
      return NextResponse.json(
        { error: "Mot de passe déjà défini" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { password, email } = body;
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères" },
        { status: 400 }
      );
    }

    const emailTrimmed =
      typeof email === "string" && email.trim() ? email.trim() : null;

    const hash = await hashPassword(password);
    const updates: {
      password_hash: string;
      first_login_done: boolean;
      updated_at: string;
      email?: string | null;
    } = {
      password_hash: hash,
      first_login_done: true,
      updated_at: new Date().toISOString(),
    };
    if (emailTrimmed !== undefined) {
      updates.email = emailTrimmed;
    }

    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", payload.sub);

    if (error) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    const newToken = await createToken({
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
      firstLoginDone: true,
    });
    await setAuthCookie(newToken);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
