"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import type { DocumentType } from "@/types/database";

interface Question {
  id: string;
  libelle: string;
  ordre: number;
  type_reponse: string;
  options: Record<string, unknown> | null;
}

interface ReponsesData {
  inscription: { id: string; session_id: string; analyse_besoins_texte: string | null };
  stagiaire: { nom: string; prenom: string } | null;
  session_nom: string | null;
  formation_nom: string | null;
  documents: {
    document_type: DocumentType;
    nom_affiche: string;
    ordre?: number;
    questions: Question[];
    reponses: Record<string, string>;
  }[];
  emargements: { creneau_ordre: number | null; signed_at: string; signature_data: string }[];
}

export default function AdminStagiaireReponsesPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const inscriptionId = params.inscriptionId as string;
  const [data, setData] = useState<ReponsesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/inscriptions/${inscriptionId}/reponses`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.error || "Erreur");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Erreur réseau");
      } finally {
        setLoading(false);
      }
    })();
  }, [inscriptionId]);

  if (loading) {
    return (
      <div className="py-8 text-center text-slate-500">Chargement...</div>
    );
  }
  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href={`/admin/sessions/${sessionId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la session
        </Link>
        <p className="text-red-600">{error ?? "Données introuvables"}</p>
      </div>
    );
  }

  const nomStagiaire = data.stagiaire
    ? `${data.stagiaire.prenom} ${data.stagiaire.nom}`
    : "—";

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/sessions/${sessionId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour à la session
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Réponses du stagiaire</h1>
        <p className="text-slate-600 mt-1">
          {nomStagiaire} — {data.session_nom ?? "—"} — {data.formation_nom ?? "—"}
        </p>
      </div>

      {/* Analyse des besoins */}
      <Card>
        <CardHeader>
          <CardTitle>Analyse des besoins</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 whitespace-pre-wrap">
            {data.inscription.analyse_besoins_texte || "—"}
          </p>
        </CardContent>
      </Card>

      {/* Émargements avec signatures */}
      {data.emargements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Émargements (signatures)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.emargements.map((e, idx) => (
              <div
                key={idx}
                className="p-4 border border-slate-200 rounded-lg space-y-2"
              >
                <p className="text-sm font-medium text-slate-700">
                  Créneau {e.creneau_ordre ?? "?"} —{" "}
                  {e.signed_at
                    ? new Date(e.signed_at).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })
                    : "—"}
                </p>
                {e.signature_data && (
                  <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 inline-block">
                    <img
                      src={e.signature_data}
                      alt={`Signature créneau ${e.creneau_ordre ?? idx + 1}`}
                      className="max-h-24 max-w-[200px] object-contain"
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Documents (tests) avec questions / réponses */}
      {[...data.documents]
        .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0))
        .map((doc) => {
          const nbQuestions = doc.questions.length;
          const nbReponses = doc.questions.filter((q) => doc.reponses[q.id] != null && String(doc.reponses[q.id]).trim() !== "").length;
          const completed = nbQuestions > 0 && nbReponses === nbQuestions;
          const partial = nbReponses > 0 && nbReponses < nbQuestions;
          return (
            <Card key={doc.document_type} className={!completed ? "border-amber-200 bg-amber-50/30" : ""}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  {completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  ) : partial ? (
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                  <CardTitle>{doc.nom_affiche}</CardTitle>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded shrink-0 ${
                    completed
                      ? "bg-green-100 text-green-800"
                      : partial
                      ? "bg-amber-100 text-amber-800"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {nbReponses}/{nbQuestions} rempli{nbReponses !== 1 ? "s" : ""}
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                {doc.questions.length === 0 ? (
                  <p className="text-slate-500 text-sm">Aucune question.</p>
                ) : (
                  <ul className="space-y-4">
                    {doc.questions
                      .sort((a, b) => a.ordre - b.ordre)
                      .map((q) => {
                        const valeur = doc.reponses[q.id];
                        const hasReponse = valeur != null && String(valeur).trim() !== "";
                        const typeLabel =
                          q.type_reponse === "qcm"
                            ? "QCM"
                            : q.type_reponse === "echelle"
                            ? "Échelle"
                            : q.type_reponse === "liste"
                            ? "Liste"
                            : "Texte";
                        return (
                          <li
                            key={q.id}
                            className={`p-3 rounded-lg border ${
                              hasReponse ? "bg-slate-50/50 border-slate-200" : "border-amber-200 bg-amber-50/20"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-slate-800">{q.libelle}</p>
                              <span className="text-xs text-slate-500 shrink-0">{typeLabel}</span>
                            </div>
                            <p className={`mt-2 text-slate-700 ${q.type_reponse === "texte_libre" ? "whitespace-pre-wrap" : ""}`}>
                              {hasReponse ? valeur : <span className="text-amber-700 italic">Non renseigné</span>}
                            </p>
                            {q.type_reponse === "echelle" && hasReponse && !isNaN(parseFloat(valeur)) && (
                              <div className="mt-2 flex gap-1">
                                {[1, 2, 3, 4, 5].map((n) => (
                                  <div
                                    key={n}
                                    className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium ${
                                      n <= parseFloat(valeur) ? "bg-primary-100 text-primary-800" : "bg-slate-100 text-slate-400"
                                    }`}
                                  >
                                    {n}
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}

      <Link href={`/admin/sessions/${sessionId}`}>
        <Button variant="outline" className="flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Retour à la session
        </Button>
      </Link>
    </div>
  );
}
