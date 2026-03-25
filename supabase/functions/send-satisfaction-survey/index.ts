// Edge Function : envoi d'enquêtes de satisfaction à froid aux stagiaires
// 1) Mode manuel : POST avec session_id → envoie pour cette session
// 2) Mode cron  : POST sans session_id → trouve les sessions dont la dernière date est il y a 14 jours, envoie pour chacune

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

interface ReqBody {
  session_id?: string;
  app_url?: string;
}

async function sendForSession(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  baseAppUrl: string,
  resendApiKey: string | undefined
) {
  const loginUrl = `${baseAppUrl.replace(/\/$/, "")}/stagiaire/login`;

  const { data: inscriptions, error: insErr } = await supabase
    .from("inscriptions")
    .select(`
      id,
      stagiaire:stagiaires(
        id,
        users(email, username)
      )
    `)
    .eq("session_id", sessionId);

  if (insErr) return { error: insErr.message, sent: 0 };

  type UsersRef = { email: string | null; username: string } | null;
  type StagiaireRef = { id: string; users: UsersRef | UsersRef[] } | null;
  type InscriptionRow = { id: string; stagiaire: StagiaireRef | StagiaireRef[] | null };
  const rows = (inscriptions ?? []) as InscriptionRow[];
  const emails: string[] = [];

  for (const row of rows) {
    const s = Array.isArray(row.stagiaire) ? row.stagiaire[0] : row.stagiaire;
    const u = Array.isArray(s?.users) ? s?.users[0] : s?.users;
    if (u?.email?.trim()) emails.push(u.email.trim());
  }

  let sent = 0;
  if (resendApiKey && emails.length > 0) {
    for (const email of emails) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: Deno.env.get("RESEND_FROM") ?? "SF Formation <noreply@votre-domaine.com>",
          to: [email],
          subject: "Enquête de satisfaction — SF Formation (2 semaines après la formation)",
          html: `
            <p>Bonjour,</p>
            <p>Votre formation s'est terminée il y a deux semaines. Merci de prendre quelques minutes pour remplir l'enquête de satisfaction.</p>
            <p><a href="${loginUrl}">Se connecter à l'espace stagiaire</a></p>
            <p>Une fois connecté(e), vous pourrez accéder à l'enquête de satisfaction.</p>
            <p>— L'équipe SF Formation</p>
          `,
        }),
      });
      if (res.ok) sent++;
    }
  }

  return { sent, total: emails.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") ?? "https://votre-app.vercel.app";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const body: ReqBody = req.method === "POST" && req.body
      ? await req.json().catch(() => ({}))
      : {};
    const sessionIdParam = body.session_id ?? new URL(req.url).searchParams.get("session_id");
    const baseAppUrl = body.app_url ?? appUrl;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Mode manuel : session_id fourni
    if (sessionIdParam) {
      const result = await sendForSession(supabase, sessionIdParam, baseAppUrl, resendApiKey);
      if ("error" in result) {
        return new Response(
          JSON.stringify({ error: result.error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          mode: "manual",
          session_id: sessionIdParam,
          sent: result.sent,
          total: result.total,
          message: resendApiKey
            ? `${result.sent} email(s) envoyé(s) pour cette session.`
            : "RESEND_API_KEY non configurée : aucun email envoyé.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mode cron : sessions dont la dernière date est il y a 14 jours
    const { data: sessionIds, error: rpcErr } = await supabase.rpc("get_sessions_for_enquete_froid");

    if (rpcErr) {
      return new Response(
        JSON.stringify({ error: "Erreur BDD", details: rpcErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ids = (sessionIds ?? []) as { session_id: string }[];
    let totalSent = 0;

    for (const row of ids) {
      const sid = row.session_id ?? (row as unknown as string);
      const result = await sendForSession(supabase, sid, baseAppUrl, resendApiKey);
      if ("error" in result) continue;
      totalSent += result.sent;
      await supabase.from("enquete_satisfaction_froid_sent").insert({
        session_id: sid,
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        mode: "cron",
        sessions_processed: ids.length,
        total_emails_sent: totalSent,
        message: resendApiKey
          ? `${ids.length} session(s) traitée(s), ${totalSent} email(s) envoyé(s).`
          : "RESEND_API_KEY non configurée : aucun email envoyé.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Erreur serveur", details: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
