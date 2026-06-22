import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const PARIS_TZ = "Europe/Paris";

/** Formate l'heure d'un créneau en heure française : 9H, 16H30… (timezone Europe/Paris). */
function formatHeureCreneau(iso: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return m === 0 ? `${h}H` : `${h}H${String(m).padStart(2, "0")}`;
}

/** Construit la plage horaire d'un créneau, ex : "15/06/2026 9H - 16H". */
function formatHoraireCreneau(
  heureDebut: string | null,
  heureFin: string | null
): string {
  if (!heureDebut) return "";
  const dateStr = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(heureDebut));
  const debut = formatHeureCreneau(heureDebut);
  const fin = heureFin ? formatHeureCreneau(heureFin) : null;
  return fin ? `${dateStr} ${debut} - ${fin}` : `${dateStr} ${debut}`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const inscription_id = searchParams.get("inscription_id");
  const document = searchParams.get("document");
  if (!inscription_id || !document) {
    return NextResponse.json(
      { error: "inscription_id et document requis" },
      { status: 400 }
    );
  }

  const { data: inscription } = await supabase
    .from("inscriptions")
    .select(`
      id,
      session_id,
      stagiaire_id,
      analyse_besoins_texte,
      stagiaire:stagiaires(nom, prenom),
      session:sessions(nom, formation:formations(nom))
    `)
    .eq("id", inscription_id)
    .single();
  if (!inscription) {
    return NextResponse.json({ error: "Inscription non trouvée" }, { status: 404 });
  }

  type StagiaireRef = { nom: string; prenom: string } | null;
  type SessionRef = { nom: string; formation: { nom: string } | null | { nom: string }[] } | null;
  const rawSt = inscription.stagiaire;
  const stagiaire: StagiaireRef = Array.isArray(rawSt) ? (rawSt[0] as StagiaireRef) ?? null : (rawSt as StagiaireRef);
  const rawSession = inscription.session;
  const sessionData: SessionRef = Array.isArray(rawSession) ? (rawSession[0] as SessionRef) ?? null : (rawSession as SessionRef);
  const formationObj = sessionData?.formation;
  const formation = Array.isArray(formationObj) ? formationObj[0] : formationObj;
  const nomStagiaire = stagiaire ? `${stagiaire.prenom} ${stagiaire.nom}` : "—";
  const nomSession = sessionData?.nom ?? "—";
  const nomFormation = (formation && typeof formation === "object" && "nom" in formation) ? formation.nom : "—";

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  let page = doc.addPage([595, 842]);
  let y = 800;
  const lineHeight = 14;
  const margin = 50;

  function addText(text: string, opts?: { bold?: boolean }) {
    if (y < 80) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
    const f = opts?.bold ? fontBold : font;
    page.drawText(text, {
      x: margin,
      y,
      size: 10,
      font: f,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= lineHeight;
  }

  addText("SF FORMATION", { bold: true });
  addText("Document QUALIOPI — Export brut");
  y -= 10;
  addText(`Session : ${nomSession}`);
  addText(`Formation : ${nomFormation}`);
  addText(`Stagiaire : ${nomStagiaire}`);
  y -= 15;

  if (document === "analyse_besoins") {
    addText("Analyse des besoins de la formation", { bold: true });
    y -= 5;
    const texte = (inscription.analyse_besoins_texte as string) || "—";
    const lines = texte.split("\n").flatMap((l) => {
      const words = l.split(" ");
      const result: string[] = [];
      let current = "";
      for (const w of words) {
        if (current.length + w.length + 1 > 80) {
          if (current) result.push(current);
          current = w;
        } else current += (current ? " " : "") + w;
      }
      if (current) result.push(current);
      return result;
    });
    for (const line of lines) {
      addText(line);
    }
  }

  if (document === "emargement") {
    const { data: emargements } = await supabase
      .from("emargements")
      .select(`
        signed_at,
        signature_data,
        creneau:session_creneaux(ordre, heure_debut, heure_fin)
      `)
      .eq("inscription_id", inscription_id)
      .order("signed_at");
    addText("Feuille d'émargement", { bold: true });
    y -= 5;
    const maxImgWidth = 200;
    const maxImgHeight = 80;
    for (const e of emargements || []) {
      const rawC = e.creneau;
      const creneau = Array.isArray(rawC) ? rawC[0] : rawC;
      const ordre = creneau && typeof creneau === "object" && "ordre" in creneau ? creneau.ordre : "?";
      const heureDebut =
        creneau && typeof creneau === "object" && "heure_debut" in creneau
          ? (creneau.heure_debut as string | null)
          : null;
      const heureFin =
        creneau && typeof creneau === "object" && "heure_fin" in creneau
          ? (creneau.heure_fin as string | null)
          : null;
      const horaire = formatHoraireCreneau(heureDebut, heureFin);
      addText(horaire ? `Créneau ${ordre} : ${horaire}` : `Créneau ${ordre}`);
      if (e.signature_data && typeof e.signature_data === "string") {
        try {
          const base64 = e.signature_data.replace(/^data:image\/\w+;base64,/, "");
          const bytes = new Uint8Array(Buffer.from(base64, "base64"));
          const img = await doc.embedPng(bytes);
          const scale = Math.min(maxImgWidth / img.width, maxImgHeight / img.height, 1);
          const w = img.width * scale;
          const h = img.height * scale;
          if (y - h < 80) {
            page = doc.addPage([595, 842]);
            y = 800;
          }
          page.drawImage(img, {
            x: margin,
            y: y - h,
            width: w,
            height: h,
          });
          y -= h + lineHeight;
        } catch {
          addText("(signature non affichable)");
        }
      }
    }
    if (!emargements?.length) addText("Aucun émargement enregistré.");
  }

  if (["test_pre", "points_cles", "test_fin", "enquete_satisfaction", "bilan_final"].includes(document)) {
    const docType =
      document === "test_pre"
        ? "Test de pré-formation"
        : document === "points_cles"
        ? "Test Points clés"
        : document === "test_fin"
        ? "Test de fin de formation"
        : document === "enquete_satisfaction"
        ? "Enquête de satisfaction"
        : "Bilan final";
    addText(docType, { bold: true });
    y -= 5;
    let questionsQuery = supabase
      .from("questions")
      .select("id, libelle, ordre")
      .eq("document_type", document)
      .order("ordre");
    if (inscription?.session_id) {
      const { data: sess } = await supabase
        .from("sessions")
        .select("formation_id")
        .eq("id", inscription.session_id)
        .single();
      if (sess?.formation_id) {
        questionsQuery = questionsQuery.eq("formation_id", sess.formation_id);
      }
    }
    const { data: questions } = await questionsQuery;
    const { data: reponses } = await supabase
      .from("reponses")
      .select("question_id, valeur, valeur_json")
      .eq("inscription_id", inscription_id);
    const repByQ = (reponses || []).reduce(
      (acc, r) => {
        acc[r.question_id] = r.valeur ?? (r.valeur_json != null ? JSON.stringify(r.valeur_json) : "—");
        return acc;
      },
      {} as Record<string, string>
    );
    for (const q of questions || []) {
      addText(q.libelle, { bold: true });
      addText(repByQ[q.id] ?? "—");
      y -= 3;
    }
  }

  const pdfBytes = await doc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${document}_${inscription_id.slice(0, 8)}.pdf"`,
    },
  });
}
