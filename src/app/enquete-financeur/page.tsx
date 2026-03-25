"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface Question {
  id: string;
  ordre: number;
  libelle: string;
  type_reponse: string;
  options: Record<string, unknown> | null;
}

function EnqueteFinanceurContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [data, setData] = useState<{
    financeur_nom: string;
    session_nom: string;
    formation_nom: string;
    questions: Question[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [reponses, setReponses] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Lien invalide : token manquant.");
      return;
    }
    fetch(`/api/enquete-financeur?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((body) => {
        if (!body.error) {
          setData(body);
        } else {
          setError(body.error);
          setAlreadySubmitted(!!body.alreadySubmitted);
        }
      })
      .catch(() => setError("Erreur de chargement."));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !data) return;
    setLoading(true);
    try {
      const reponsesList = Object.entries(reponses).map(([question_id, val]) => ({
        question_id,
        valeur: typeof val === "string" ? val : JSON.stringify(val),
      }));
      const res = await fetch("/api/enquete-financeur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, reponses: reponsesList }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.alreadySubmitted) setAlreadySubmitted(true);
        throw new Error(body.error || "Erreur");
      }
      setSubmitted(true);
      toast.success("Merci ! Votre enquête a bien été enregistrée.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-slate-600 text-center">Lien invalide. Utilisez le lien reçu par email.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-slate-600 text-center">{error}</p>
            {alreadySubmitted && (
              <p className="text-sm text-slate-500 text-center mt-2">
                Cette enquête a déjà été remplie. Merci pour votre participation.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-slate-800">Merci !</h2>
            <p className="text-slate-600 mt-2">
              Votre enquête de satisfaction a bien été enregistrée.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <p className="text-slate-500">Chargement...</p>
      </main>
    );
  }

  const { financeur_nom, session_nom, formation_nom, questions } = data;

  return (
    <main className="min-h-screen p-4 bg-slate-50">
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Enquête de satisfaction financeur</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Formation : {formation_nom} — Session : {session_nom}
            </p>
            <p className="text-sm text-slate-500">Financeur : {financeur_nom}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-slate-600">
              Merci de prendre quelques minutes pour remplir cette enquête. Vos réponses sont anonymisées et utilisées pour améliorer la qualité de nos formations.
            </p>
            {questions.length === 0 ? (
              <p className="text-slate-500 text-sm">Aucune question pour cette enquête.</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {questions.map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {q.libelle}
                    </label>
                    {q.type_reponse === "texte_libre" && (
                      <textarea
                        value={(reponses[q.id] as string) ?? ""}
                        onChange={(e) =>
                          setReponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        rows={3}
                      />
                    )}
                    {q.type_reponse === "echelle" && (
                      <select
                        value={(reponses[q.id] as string) ?? ""}
                        onChange={(e) =>
                          setReponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">Choisir...</option>
                        {(q.options as { options?: string[] })?.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}
                    {q.type_reponse === "qcm" && (
                      <div className="space-y-2">
                        {(q.options as { options?: string[] })?.options?.map((opt) => (
                          <label key={opt} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={q.id}
                              value={opt}
                              checked={(reponses[q.id] as string) === opt}
                              onChange={() =>
                                setReponses((prev) => ({ ...prev, [q.id]: opt }))
                              }
                              className="rounded border-slate-300"
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {q.type_reponse === "liste" && (
                      <select
                        value={(reponses[q.id] as string) ?? ""}
                        onChange={(e) =>
                          setReponses((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      >
                        <option value="">Choisir...</option>
                        {(q.options as { options?: string[] })?.options?.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
                <Button type="submit" disabled={loading}>
                  {loading ? "Envoi..." : "Envoyer l'enquête"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function EnqueteFinanceurPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <p className="text-slate-500">Chargement...</p>
      </main>
    }>
      <EnqueteFinanceurContent />
    </Suspense>
  );
}
