import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Lien invalide ou expiré." },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères." },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Les deux mots de passe ne correspondent pas." },
        { status: 400 }
      );
    }

    const { data: row, error: fetchErr } = await supabase
      .from("password_reset_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token", token.trim())
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json(
        { error: "Lien invalide ou expiré." },
        { status: 400 }
      );
    }

    if (row.used_at) {
      return NextResponse.json(
        { error: "Ce lien a déjà été utilisé. Demandez un nouveau lien." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    if (row.expires_at < now) {
      return NextResponse.json(
        { error: "Ce lien a expiré. Demandez un nouveau lien." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const { error: updateUserErr } = await supabase
      .from("users")
      .update({
        password_hash: passwordHash,
        updated_at: now,
      })
      .eq("id", row.user_id);

    if (updateUserErr) {
      console.error(updateUserErr);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du mot de passe." },
        { status: 500 }
      );
    }

    const { error: updateTokenErr } = await supabase
      .from("password_reset_tokens")
      .update({ used_at: now })
      .eq("id", row.id);

    if (updateTokenErr) {
      console.error(updateTokenErr);
      // mot de passe déjà mis à jour, on ne fait pas échouer la réponse
    }

    return NextResponse.json({
      ok: true,
      message: "Votre mot de passe a été mis à jour. Vous pouvez vous connecter.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
