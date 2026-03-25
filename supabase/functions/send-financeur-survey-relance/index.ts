// Edge Function : relance enquête satisfaction financeur
// Envoyée 7 jours après le 1er mail si le financeur n'a pas rempli

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

    const { data: rows, error: rpcErr } = await supabase.rpc("get_financeur_tokens_for_relance");

    if (rpcErr) {
      return new Response(
        JSON.stringify({ error: "Erreur BDD", details: rpcErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = (rows ?? []) as { token_id: string; token: string; nom: string; email: string; expires_at: string }[];
    let totalSent = 0;

    for (const item of items) {
      const email = item.email?.trim();
      if (!email) continue;

      const surveyUrl = `${baseAppUrl.replace(/\/$/, "")}/enquete-financeur?token=${encodeURIComponent(item.token)}`;

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
            subject: "Rappel : Enquête de satisfaction financeur — SF Formation",
            html: `
              <p>Bonjour ${(item.nom || "").replace(/</g, "&lt;")},</p>
              <p>Nous vous avions envoyé il y a une semaine un lien pour remplir l'enquête de satisfaction financeur. Si vous ne l'avez pas encore fait, merci de prendre quelques minutes pour y répondre.</p>
              <p><a href="${surveyUrl}">Remplir l'enquête</a></p>
              <p>Ce lien est personnel et ne nécessite aucune connexion. Il expire dans 30 jours.</p>
              <p>— L'équipe SF Formation</p>
            `,
          }),
        });
        if (res.ok) {
          await supabase
            .from("financeur_enquete_tokens")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", item.token_id);
          totalSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total_relances_sent: totalSent,
        message: resendApiKey
          ? `${items.length} financeur(s) éligible(s), ${totalSent} relance(s) envoyée(s).`
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
