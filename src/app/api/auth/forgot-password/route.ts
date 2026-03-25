import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Resend } from "resend";
import { headers } from "next/headers";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM ?? "SF Formation <onboarding@resend.dev>";
const TOKEN_EXPIRY_HOURS = 1;

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (url) return url.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  try {
    const h = headers();
    const origin = h.get("origin") || h.get("x-forwarded-host");
    if (origin) return origin.startsWith("http") ? origin : `https://${origin}`;
  } catch {
    // ignore
  }
  return "http://localhost:3000";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const emailOrUsername = typeof body.emailOrUsername === "string" ? body.emailOrUsername.trim() : "";
    if (!emailOrUsername) {
      return NextResponse.json(
        { error: "Email ou identifiant requis" },
        { status: 400 }
      );
    }

    const search = emailOrUsername.toLowerCase();
    let user: { id: string; email: string | null; username: string } | null = null;

    const { data: byUsername } = await supabase
      .from("users")
      .select("id, email, username")
      .ilike("username", search)
      .maybeSingle();
    if (byUsername) {
      user = byUsername;
    } else {
      const { data: byEmail } = await supabase
        .from("users")
        .select("id, email, username")
        .ilike("email", search)
        .maybeSingle();
      user = byEmail ?? null;
    }

    if (!user) {
      return NextResponse.json(
        { error: "Aucun compte associé à cet email ou identifiant." },
        { status: 404 }
      );
    }

    const emailToSend = user.email?.trim();
    if (!emailToSend) {
      return NextResponse.json(
        { error: "Aucune adresse email enregistrée pour ce compte. Contactez l'administrateur." },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    const { error: insertErr } = await supabase.from("password_reset_tokens").insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    if (insertErr) {
      console.error(insertErr);
      return NextResponse.json(
        { error: "Erreur lors de la création du lien de réinitialisation." },
        { status: 500 }
      );
    }

    const baseUrl = getBaseUrl();
    const resetUrl = `${baseUrl}/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;

    if (!RESEND_API_KEY || RESEND_API_KEY === "REMPLACER_PAR_TA_CLE_RESEND") {
      return NextResponse.json(
        { error: "Envoi d'email non configuré : RESEND_API_KEY manquante ou invalide dans .env.local" },
        { status: 500 }
      );
    }

    const resend = new Resend(RESEND_API_KEY);
    const { data, error: sendErr } = await resend.emails.send({
      from: RESEND_FROM,
      to: [emailToSend],
      subject: "Réinitialisation de votre mot de passe — SF Formation",
      html: `
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p><a href="${resetUrl}">Cliquez ici pour définir un nouveau mot de passe</a>.</p>
        <p>Ce lien expire dans ${TOKEN_EXPIRY_HOURS} heure(s).</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        <p>— L'équipe SF Formation</p>
      `,
    });
    if (sendErr) {
      console.error("Resend error:", sendErr);
      return NextResponse.json(
        { error: `Impossible d'envoyer l'email : ${sendErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Un lien de réinitialisation a été envoyé à votre adresse email.",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
