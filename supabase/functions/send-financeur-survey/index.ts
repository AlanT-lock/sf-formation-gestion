// Edge Function : envoi enquêtes satisfaction financeur (7 jours après la formation)
// Lien magique sans authentification - le token identifie session + financeur

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") ?? "https://votre-app.vercel.app";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const body = req.method === "POST" && req.body
      ? await req.json().catch(() => ({}))
      : {};
    const baseAppUrl = body.app_url ?? appUrl;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: sessionIds, error: rpcErr } = await supabase.rpc("get_sessions_for_financeur_enquete");

    if (rpcErr) {
      return new Response(
        JSON.stringify({ error: "Erreur BDD", details: rpcErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ids = (sessionIds ?? []) as { session_id: string }[];
    let totalSent = 0;

    for (const row of ids) {
      const sessionId = row.session_id ?? (row as unknown as string);
      const { data: financeurs } = await supabase
        .from("session_financeurs")
        .select("id, nom, email")
        .eq("session_id", sessionId);

      if (!financeurs?.length) continue;

      let sessionSent = 0;
      for (const f of financeurs) {
        const email = f.email?.trim();
        if (!email) continue;

        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error: tokErr } = await supabase.from("financeur_enquete_tokens").insert({
          session_financeur_id: f.id,
          token,
          expires_at: expiresAt.toISOString(),
        });
        if (tokErr) continue;

        const surveyUrl = `${baseAppUrl.replace(/\/$/, "")}/enquete-financeur?token=${encodeURIComponent(token)}`;

        if (resendApiKey) {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
              from: Deno.env.get("RESEND_FROM") ?? "SF Formation <noreply@votre-domaine.com>",
              to: [email],
              subject: "Enquête de satisfaction financeur — SF Formation",
              html: `
                <p>Bonjour ${(f.nom || "").replace(/</g, "&lt;")},</p>
                <p>Votre formation s'est terminée il y a une semaine. Merci de prendre quelques minutes pour remplir l'enquête de satisfaction financeur.</p>
                <p><a href="${surveyUrl}">Remplir l'enquête</a></p>
                <p>Ce lien est personnel et ne nécessite aucune connexion. Il expire dans 30 jours.</p>
                <p>— L'équipe SF Formation</p>
              `,
            }),
          });
          if (res.ok) {
            totalSent++;
            sessionSent++;
          }
        }
      }
      if (sessionSent > 0) {
        await supabase.from("financeur_enquete_sent").insert({ session_id: sessionId });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
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
