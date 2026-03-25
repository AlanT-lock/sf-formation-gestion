"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Users, Plus, Eye } from "lucide-react";
import Link from "next/link";

interface Stagiaire {
  id: string;
  nom: string;
  prenom: string;
}

interface Inscription {
  id: string;
  stagiaire_id: string;
  analyse_besoins_texte: string | null;
  stagiaire: Stagiaire | Stagiaire[] | null;
}

interface InscriptionsBlockProps {
  sessionId: string;
  inscriptions: Inscription[];
  sessionNom: string;
}

export function InscriptionsBlock({
  sessionId,
  inscriptions: initialInscriptions,
  sessionNom,
}: InscriptionsBlockProps) {
  const [inscriptions, setInscriptions] = useState<Inscription[]>(initialInscriptions);
  const [stagiaires, setStagiaires] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [selectedStagiaire, setSelectedStagiaire] = useState("");
  const [analyseBesoins, setAnalyseBesoins] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAnalyse, setEditAnalyse] = useState("");

  useEffect(() => {
    setInscriptions(initialInscriptions);
  }, [initialInscriptions]);

  // Recharger les inscriptions depuis l'API à chaque montage (évite le cache obsolète)
  useEffect(() => {
    (async () => {
      setLoadingList(true);
      try {
        const res = await fetch(`/api/admin/sessions/${sessionId}/inscriptions`);
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setInscriptions(data);
        }
      } finally {
        setLoadingList(false);
      }
    })();
  }, [sessionId]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/stagiaires");
      const data = await res.json();
      if (Array.isArray(data)) setStagiaires(data.map((s: { id: string; nom: string; prenom: string }) => ({ id: s.id, nom: s.nom, prenom: s.prenom })));
    })();
  }, []);

  const alreadyInscrits = inscriptions.map((i) => i.stagiaire_id);
  const availableStagiaires = stagiaires.filter((s) => !alreadyInscrits.includes(s.id));

  async function handleAdd() {
    if (!selectedStagiaire) {
      toast.error("Choisissez un stagiaire");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/inscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stagiaire_id: selectedStagiaire,
          analyse_besoins_texte: analyseBesoins.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("Stagiaire inscrit");
      const st = stagiaires.find((s) => s.id === selectedStagiaire);
      setInscriptions((prev) => [...prev, { ...data, stagiaire: st ?? null }]);
      setSelectedStagiaire("");
      setAnalyseBesoins("");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  function getStagiaire(inscription: Inscription): Stagiaire | null {
    const s = inscription.stagiaire;
    if (Array.isArray(s)) return s[0] ?? null;
    return s ?? null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Stagiaires inscrits ({inscriptions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Ajouter un stagiaire
            </label>
            <select
              value={selectedStagiaire}
              onChange={(e) => setSelectedStagiaire(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
            >
              <option value="">Choisir...</option>
              {availableStagiaires.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.prenom} {s.nom}
                </option>
              ))}
            </select>
            <Input
              label="Analyse des besoins (si déjà formé, pourquoi refaire ?)"
              value={analyseBesoins}
              onChange={(e) => setAnalyseBesoins(e.target.value)}
              placeholder="Texte libre..."
              className="text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAdd}
              disabled={loading || !selectedStagiaire}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Inscrire
            </Button>
          </div>
        </div>

        {loadingList ? (
          <p className="text-slate-500 text-sm py-4">Chargement...</p>
        ) : !inscriptions.length ? (
          <p className="text-slate-500 text-sm py-4">Aucun stagiaire inscrit.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {inscriptions.map((ins) => {
              const st = getStagiaire(ins);
              const analyse = ins.analyse_besoins_texte ?? "";
              const isEditing = editingId === ins.id;
              return (
                <li key={ins.id} className="py-4 first:pt-0">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-medium text-slate-800">
                        {st?.prenom} {st?.nom}
                      </p>
                      <Link
                        href={`/admin/sessions/${sessionId}/stagiaire/${ins.id}`}
                        className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
                      >
                        <Eye className="w-4 h-4" />
                        Voir les réponses
                      </Link>
                    </div>
                    {isEditing ? (
                      <div className="flex gap-2 items-end">
                        <input
                          type="text"
                          value={editAnalyse}
                          onChange={(e) => setEditAnalyse(e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          placeholder="Analyse des besoins..."
                        />
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              const res = await fetch(
                                `/api/admin/inscriptions/${ins.id}`,
                                {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    analyse_besoins_texte: editAnalyse.trim() || null,
                                  }),
                                }
                              );
                              if (!res.ok) throw new Error();
                              setInscriptions((prev) =>
                                prev.map((i) =>
                                  i.id === ins.id
                                    ? { ...i, analyse_besoins_texte: editAnalyse.trim() || null }
                                    : i
                                )
                              );
                              setEditingId(null);
                              toast.success("Modifié");
                            } catch {
                              toast.error("Erreur");
                            }
                          }}
                        >
                          Enregistrer
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingId(null);
                            setEditAnalyse(analyse);
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-600">
                          Analyse des besoins : {analyse || "—"}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(ins.id);
                            setEditAnalyse(analyse);
                          }}
                          className="text-xs text-primary-600 hover:underline"
                        >
                          Modifier l&apos;analyse des besoins
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
