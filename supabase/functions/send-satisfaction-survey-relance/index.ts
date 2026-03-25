// Edge Function : relance enquête satisfaction à froid (stagiaires)
// Envoyée 7 jours après le 1er mail si le stagiaire n'a pas rempli l'enquête

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
    const loginUrl = `${baseAppUrl.replace(/\/$/, "")}/stagiaire/login`;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: rows, error: rpcErr } = await supabase.rpc("get_inscriptions_for_froid_relance");

    if (rpcErr) {
      return new Response(
        JSON.stringify({ error: "Erreur BDD", details: rpcErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = (rows ?? []) as { inscription_id: string; email: string; session_nom: string }[];
    let totalSent = 0;

    for (const item of items) {
      const email = item.email?.trim();
      if (!email) continue;

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
            subject: "Rappel : Enquête de satisfaction — SF Formation",
            html: `
              <p>Bonjour,</p>
              <p>Nous vous avions envoyé il y a une semaine un email pour remplir l'enquête de satisfaction de votre formation. Si vous ne l'avez pas encore fait, merci de prendre quelques minutes pour y répondre.</p>
              <p><a href="${loginUrl}">Se connecter à l'espace stagiaire</a></p>
              <p>Une fois connecté(e), vous pourrez accéder à l'enquête de satisfaction.</p>
              <p>— L'équipe SF Formation</p>
            `,
          }),
        });
        if (res.ok) {
          await supabase.from("enquete_froid_relance_sent").insert({
            inscription_id: item.inscription_id,
          });
          totalSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        total_relances_sent: totalSent,
        message: resendApiKey
          ? `${items.length} stagiaire(s) éligible(s), ${totalSent} relance(s) envoyée(s).`
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
