"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Clock,
  FileCheck,
  ClipboardList,
  ThumbsUp,
  FileText,
  PenLine,
  RefreshCw,
  Edit3,
  Users,
  Plus,
  Trash2,
  Eye,
} from "lucide-react";
import type { StepType } from "@/types/database";

function suggestedUsername(prenom: string, nom: string) {
  if (!prenom.trim() || !nom.trim()) return "";
  return `${prenom.trim().toLowerCase()}.${nom.trim().toLowerCase()}`.replace(/\s+/g, ".");
}

const STEP_LABELS: Record<StepType, string> = {
  test_pre: "Test de pré-formation",
  emargement: "Émargement",
  points_cles: "Test Points clés",
  test_fin: "Test de fin de formation",
  enquete_satisfaction: "Enquête de satisfaction",
  bilan_final: "Bilan final",
};

interface Creneau {
  id: string;
  ordre: number;
  heure_debut: string | null;
  heure_fin: string | null;
}

interface Trigger {
  id: string;
  step_type: StepType;
  creneau_id: string | null;
  triggered_at: string;
}

interface StepCompletion {
  inscription_id: string;
  step_type: string;
  creneau_id: string | null;
}

interface FormationDocument {
  document_type: string;
  nom_affiche: string;
  rempli_par: string;
}

interface Session {
  id: string;
  nom: string;
  nb_creneaux: number;
  formation: { nom: string } | null;
  formation_documents?: FormationDocument[];
  session_creneaux: Creneau[];
  session_step_triggers: Trigger[];
  inscriptions: { id: string; stagiaire_id: string; analyse_besoins_texte: string | null; stagiaire: { nom: string; prenom: string; users?: { username: string } | { username: string }[] | null } | null }[];
  step_completions?: StepCompletion[];
}

export default function FormateurSessionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"emargement" | "etapes" | "stagiaires">("emargement");
  const [triggering, setTriggering] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [creneauTimes, setCreneauTimes] = useState<Record<string, { debut?: string; fin?: string }>>({});
  // Stagiaires
  const [addMode, setAddMode] = useState<"existant" | "nouveau">("existant");
  const [stagiaires, setStagiaires] = useState<{ id: string; nom: string; prenom: string }[]>([]);
  const [selectedStagiaire, setSelectedStagiaire] = useState("");
  const [newNom, setNewNom] = useState("");
  const [newPrenom, setNewPrenom] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [analyseBesoins, setAnalyseBesoins] = useState("");
  const [stagiairesLoading, setStagiairesLoading] = useState(false);
  const [inscriptionLoading, setInscriptionLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAnalyse, setEditAnalyse] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const usernameManuallyEdited = useRef(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/formateur/sessions/${id}`);
      if (!res.ok) throw new Error("Session non trouvée");
      const data = await res.json();
      setSession(data);
    } catch {
      toast.error("Session non trouvée");
      router.push("/formateur");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, router]);

  useEffect(() => {
    setLoading(true);
    fetchSession();
  }, [fetchSession]);

  const suggestion = suggestedUsername(newPrenom, newNom);
  useEffect(() => {
    if (!usernameManuallyEdited.current && suggestion) setNewUsername(suggestion);
  }, [suggestion]);

  useEffect(() => {
    if (activeTab !== "stagiaires") return;
    (async () => {
      setStagiairesLoading(true);
      try {
        const res = await fetch("/api/formateur/stagiaires");
        const data = await res.json();
        if (Array.isArray(data)) {
          setStagiaires(data.map((s: { id: string; nom: string; prenom: string }) => ({ id: s.id, nom: s.nom, prenom: s.prenom })));
        }
      } finally {
        setStagiairesLoading(false);
      }
    })();
  }, [activeTab]);

  function handleRefresh() {
    setRefreshing(true);
    fetchSession();
  }

  const alreadyInscrits = (session?.inscriptions ?? []).map((i) => i.stagiaire_id);
  const availableStagiaires = stagiaires.filter((s) => !alreadyInscrits.includes(s.id));

  async function handleAddExistant() {
    if (!selectedStagiaire) {
      toast.error("Choisissez un stagiaire");
      return;
    }
    setInscriptionLoading(true);
    try {
      const res = await fetch(`/api/formateur/sessions/${id}/inscriptions`, {
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
      setSession((prev) => prev ? { ...prev, inscriptions: [...prev.inscriptions, data] } : null);
      setSelectedStagiaire("");
      setAnalyseBesoins("");
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setInscriptionLoading(false);
    }
  }

  async function handleCreateAndAdd() {
    if (!newNom.trim() || !newPrenom.trim()) {
      toast.error("Nom et prénom requis");
      return;
    }
    const identifiant = (newUsername || suggestion).trim().toLowerCase().replace(/\s+/g, ".");
    if (!identifiant) {
      toast.error("Identifiant requis");
      return;
    }
    setInscriptionLoading(true);
    try {
      const resCreate = await fetch("/api/formateur/stagiaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: newNom.trim(),
          prenom: newPrenom.trim(),
          username: identifiant,
        }),
      });
      const dataCreate = await resCreate.json();
      if (!resCreate.ok) {
        toast.error(dataCreate.error || "Erreur création");
        return;
      }
      const stagiaireId = dataCreate.id;
      const resInsc = await fetch(`/api/formateur/sessions/${id}/inscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stagiaire_id: stagiaireId,
          analyse_besoins_texte: analyseBesoins.trim() || null,
        }),
      });
      const dataInsc = await resInsc.json();
      if (!resInsc.ok) {
        toast.error(dataInsc.error || "Erreur inscription");
        return;
      }
      toast.success("Stagiaire créé et inscrit");
      setSession((prev) =>
        prev
          ? {
              ...prev,
              inscriptions: [
                ...prev.inscriptions,
                {
                  ...dataInsc,
                  stagiaire: { id: stagiaireId, nom: newNom.trim(), prenom: newPrenom.trim(), users: { username: identifiant } },
                },
              ],
            }
          : null
      );
      setStagiaires((prev) => [...prev, { id: stagiaireId, nom: newNom.trim(), prenom: newPrenom.trim() }]);
      setNewNom("");
      setNewPrenom("");
      setNewUsername("");
      setAnalyseBesoins("");
      usernameManuallyEdited.current = false;
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setInscriptionLoading(false);
    }
  }

  async function handleDelete(inscriptionId: string) {
    setDeletingId(inscriptionId);
    try {
      const res = await fetch(`/api/formateur/sessions/${id}/inscriptions/${inscriptionId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("Stagiaire retiré de la session");
      setSession((prev) => prev ? { ...prev, inscriptions: prev.inscriptions.filter((i) => i.id !== inscriptionId) } : null);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleUpdateAnalyse(inscriptionId: string) {
    try {
      const res = await fetch(`/api/formateur/inscriptions/${inscriptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyse_besoins_texte: editAnalyse.trim() || null }),
      });
      if (!res.ok) throw new Error();
      setSession((prev) =>
        prev
          ? {
              ...prev,
              inscriptions: prev.inscriptions.map((i) =>
                i.id === inscriptionId ? { ...i, analyse_besoins_texte: editAnalyse.trim() || null } : i
              ),
            }
          : null
      );
      setEditingId(null);
      toast.success("Modifié");
    } catch {
      toast.error("Erreur");
    }
  }

  async function triggerStep(stepType: StepType, creneauId?: string) {
    setTriggering(stepType + (creneauId ?? ""));
    try {
      const res = await fetch(`/api/formateur/sessions/${id}/steps`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step_type: stepType, creneau_id: creneauId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success("Étape envoyée aux stagiaires");
      fetchSession();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setTriggering(null);
    }
  }

  async function handleFinCreneau(creneauId: string) {
    const now = new Date().toISOString();
    await updateCreneauTime(creneauId, "heure_fin", now);
  }

  async function handleDemanderEmargement(c: Creneau, index: number) {
    setTriggering("emargement" + c.id);
    try {
      const now = new Date().toISOString();
      let heureFin = c.heure_fin;

      if (!heureFin) {
        await updateCreneauTime(c.id, "heure_fin", now);
        heureFin = now;
      }

      const nextCreneau = creneaux[index + 1];
      if (nextCreneau) {
        await updateCreneauTime(nextCreneau.id, "heure_debut", heureFin);
      }

      await triggerStep("emargement", c.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setTriggering(null);
    }
  }

  async function updateCreneauTime(
    creneauId: string,
    field: "heure_debut" | "heure_fin",
    value: string
  ) {
    try {
      const res = await fetch(`/api/formateur/sessions/${id}/creneaux`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creneau_id: creneauId, [field]: value }),
      });
      if (!res.ok) throw new Error();
      toast.success(field === "heure_debut" ? "Heure de début enregistrée" : "Heure de fin enregistrée");
      setSession((prev) => {
        if (!prev) return null;
        const creneaux = prev.session_creneaux.map((c) =>
          c.id === creneauId ? { ...c, [field]: value } : c
        );
        return { ...prev, session_creneaux: creneaux };
      });
      setCreneauTimes((prev) => ({
        ...prev,
        [creneauId]: { ...prev[creneauId], [field]: value },
      }));
    } catch {
      toast.error("Erreur");
    }
  }

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  const creneaux = [...(session.session_creneaux || [])].sort(
    (a, b) => a.ordre - b.ordre
  );
  const triggersByCreneau = (session.session_step_triggers || []).reduce(
    (acc, t) => {
      if (t.step_type === "emargement" && t.creneau_id) {
        acc[t.creneau_id] = true;
      }
      return acc;
    },
    {} as Record<string, boolean>
  );

  const completionsSet = new Set(
    (session.step_completions ?? []).map(
      (c) => `${c.inscription_id}-${c.step_type}-${c.creneau_id ?? "null"}`
    )
  );
  function isCompleted(inscriptionId: string, stepType: StepType, creneauId: string | null) {
    return completionsSet.has(
      `${inscriptionId}-${stepType}-${creneauId ?? "null"}`
    );
  }

  const inscriptions = session.inscriptions ?? [];
  const triggers = session.session_step_triggers ?? [];
  const documentsToShow: { step_type: StepType; creneau_id: string | null; creneau_ordre?: number; label: string }[] = [];
  triggers.forEach((t) => {
    if (t.step_type === "emargement" && t.creneau_id) {
      const creneau = creneaux.find((c) => c.id === t.creneau_id);
      documentsToShow.push({
        step_type: "emargement",
        creneau_id: t.creneau_id,
        creneau_ordre: creneau?.ordre,
        label: `Émargement — Créneau ${creneau?.ordre ?? "?"}`,
      });
    } else if (t.step_type !== "emargement") {
      documentsToShow.push({
        step_type: t.step_type,
        creneau_id: null,
        label: STEP_LABELS[t.step_type],
      });
    }
  });

  return (
    <div className="space-y-6">
      <Link
        href="/formateur"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux sessions
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-800">{session.nom}</h1>
        <p className="text-slate-600 mt-1">
          {session.formation?.nom ?? "—"} • {session.inscriptions?.length ?? 0} stagiaire(s)
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={activeTab === "emargement" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("emargement")}
            className="gap-1.5"
          >
            <Clock className="w-4 h-4" />
            Émargement
          </Button>
          <Button
            variant={activeTab === "etapes" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("etapes")}
            className="gap-1.5"
          >
            <FileCheck className="w-4 h-4" />
            Étapes à déclencher
          </Button>
          <Button
            variant={activeTab === "stagiaires" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("stagiaires")}
            className="gap-1.5"
          >
            <Users className="w-4 h-4" />
            Stagiaires
          </Button>
        </div>
      </div>

      {activeTab === "emargement" && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Créneaux d&apos;émargement
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Saisissez l&apos;heure de début en début de créneau. En fin de créneau, cliquez sur « Fin du créneau » pour enregistrer automatiquement l&apos;heure de fin. Puis « Envoyer l&apos;émargement » envoie aux stagiaires et préremplit l&apos;heure de début du créneau suivant.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {creneaux.map((c, index) => (
            <div
              key={c.id}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-lg"
            >
              <span className="font-medium text-slate-800 w-24">Créneau {c.ordre}</span>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-slate-500">Début</label>
                  <input
                    type="datetime-local"
                    defaultValue={
                      c.heure_debut
                        ? new Date(c.heure_debut).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      updateCreneauTime(c.id, "heure_debut", e.target.value ? new Date(e.target.value).toISOString() : "")
                    }
                    className="px-2 py-1.5 border border-slate-300 rounded text-sm"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-slate-500">Fin</label>
                  <input
                    type="datetime-local"
                    defaultValue={
                      c.heure_fin
                        ? new Date(c.heure_fin).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      updateCreneauTime(c.id, "heure_fin", e.target.value ? new Date(e.target.value).toISOString() : "")
                    }
                    className="px-2 py-1.5 border border-slate-300 rounded text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!triggersByCreneau[c.id] || triggering !== null}
                  onClick={() => handleFinCreneau(c.id)}
                  title="Enregistrer l'heure de fin du créneau à maintenant"
                >
                  Fin du créneau
                </Button>
                <Button
                  size="sm"
                  disabled={!!triggersByCreneau[c.id] || triggering !== null}
                  onClick={() => handleDemanderEmargement(c, index)}
                >
                  {triggersByCreneau[c.id]
                    ? "Émargement envoyé"
                    : triggering === "emargement" + c.id
                    ? "Envoi..."
                    : "Envoyer l'émargement"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      )}

      {activeTab === "etapes" && (
      <>
      <Card>
        <CardHeader>
          <CardTitle>Étapes à déclencher</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Cliquez pour envoyer l&apos;étape à tous les stagiaires (popup sur leur espace).
            Ordre recommandé : Test pré-formation → Créneaux émargement → Points clés → Test fin → Enquête satisfaction → Bilan final.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={!!(session.session_step_triggers || []).find((t) => t.step_type === "test_pre") || triggering !== null}
            onClick={() => triggerStep("test_pre")}
          >
            <FileCheck className="w-4 h-4" />
            {STEP_LABELS.test_pre}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={!!(session.session_step_triggers || []).find((t) => t.step_type === "points_cles") || triggering !== null}
            onClick={() => triggerStep("points_cles")}
          >
            <ClipboardList className="w-4 h-4" />
            {STEP_LABELS.points_cles}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={!!(session.session_step_triggers || []).find((t) => t.step_type === "test_fin") || triggering !== null}
            onClick={() => triggerStep("test_fin")}
          >
            <FileCheck className="w-4 h-4" />
            {STEP_LABELS.test_fin}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={!!(session.session_step_triggers || []).find((t) => t.step_type === "enquete_satisfaction") || triggering !== null}
            onClick={() => triggerStep("enquete_satisfaction")}
          >
            <ThumbsUp className="w-4 h-4" />
            {STEP_LABELS.enquete_satisfaction}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={!!(session.session_step_triggers || []).find((t) => t.step_type === "bilan_final") || triggering !== null}
            onClick={() => triggerStep("bilan_final")}
          >
            <FileText className="w-4 h-4" />
            {STEP_LABELS.bilan_final}
          </Button>
        </CardContent>
      </Card>

      {documentsToShow.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PenLine className="w-5 h-5" />
                Suivi des documents par stagiaire
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Pour chaque document envoyé, liste des stagiaires : rempli/confirmé ou en attente.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="shrink-0"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
              Rafraîchir
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {documentsToShow.map((doc) => {
              const completedIds = inscriptions.filter((ins) =>
                isCompleted(ins.id, doc.step_type, doc.creneau_id)
              ).length;
              const pendingIds = inscriptions.length - completedIds;
              return (
                <div
                  key={`${doc.step_type}-${doc.creneau_id ?? "x"}`}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{doc.label}</span>
                    <span className="text-sm text-slate-500">
                      {completedIds} rempli(s) · {pendingIds} en attente
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {inscriptions.map((ins) => {
                      const done = isCompleted(ins.id, doc.step_type, doc.creneau_id);
                      const s = ins.stagiaire;
                      const usersRef = Array.isArray(s?.users) ? s?.users[0] : s?.users;
                      const username = usersRef?.username ?? null;
                      const nomStagiaire = s
                        ? `${s.prenom} ${s.nom}${username ? ` (${username})` : ""}`
                        : "—";
                      const isBilanFormateur =
                        doc.step_type === "bilan_final" &&
                        (session.formation_documents ?? []).find(
                          (fd) => fd.document_type === "bilan_final" && fd.rempli_par === "formateur"
                        );
                      return (
                        <li
                          key={ins.id}
                          className="flex items-center justify-between gap-2 px-4 py-2.5"
                        >
                          <span className="text-sm text-slate-800">{nomStagiaire}</span>
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/formateur/sessions/${id}/stagiaire/${ins.id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Voir les réponses
                            </Link>
                            {isBilanFormateur && (
                              <Link
                                href={`/formateur/sessions/${id}/bilan/${ins.id}`}
                                className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                {done ? "Modifier le bilan" : "Remplir le bilan"}
                              </Link>
                            )}
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded ${
                                done
                                  ? "bg-green-100 text-green-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {done ? "Rempli / confirmé" : "En attente"}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
      </>
      )}

      {activeTab === "stagiaires" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Stagiaires inscrits ({inscriptions.length})
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              Ajoutez ou supprimez des stagiaires. L&apos;analyse des besoins peut être saisie à l&apos;inscription ou modifiée ensuite.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Formulaire d'ajout */}
            <div className="p-4 bg-slate-50 rounded-lg space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={addMode === "existant" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setAddMode("existant")}
                >
                  Stagiaire existant
                </Button>
                <Button
                  variant={addMode === "nouveau" ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setAddMode("nouveau")}
                >
                  Créer un stagiaire
                </Button>
              </div>

              {addMode === "existant" ? (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Choisir un stagiaire</label>
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
                      {stagiairesLoading && availableStagiaires.length === 0 && (
                        <option value="">Chargement...</option>
                      )}
                    </select>
                    {!stagiairesLoading && stagiaires.length > 0 && availableStagiaires.length === 0 && (
                      <p className="text-xs text-amber-600 mt-1">Tous les stagiaires sont déjà inscrits. Créez-en un nouveau.</p>
                    )}
                  </div>
                  <div className="flex-1">
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
                      onClick={handleAddExistant}
                      disabled={inscriptionLoading || !selectedStagiaire}
                      className="flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Inscrire
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Prénom"
                      value={newPrenom}
                      onChange={(e) => setNewPrenom(e.target.value)}
                      placeholder="Jean"
                    />
                    <Input
                      label="Nom"
                      value={newNom}
                      onChange={(e) => setNewNom(e.target.value)}
                      placeholder="Dupont"
                    />
                  </div>
                  <div>
                    <Input
                      label="Identifiant de connexion"
                      value={newUsername}
                      onChange={(e) => {
                        usernameManuallyEdited.current = true;
                        setNewUsername(e.target.value);
                      }}
                      placeholder={suggestion || "jean.dupont"}
                      className="text-sm"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Suggestion : <span className="font-mono">{suggestion || "—"}</span>
                    </p>
                  </div>
                  <Input
                    label="Analyse des besoins (si déjà formé, pourquoi refaire ?)"
                    value={analyseBesoins}
                    onChange={(e) => setAnalyseBesoins(e.target.value)}
                    placeholder="Texte libre..."
                    className="text-sm"
                  />
                  <Button
                    onClick={handleCreateAndAdd}
                    disabled={inscriptionLoading || !newNom.trim() || !newPrenom.trim()}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Créer et inscrire
                  </Button>
                </div>
              )}
            </div>

            {/* Liste des inscrits */}
            {inscriptions.length === 0 ? (
              <p className="text-slate-500 py-8 text-center">Aucun stagiaire inscrit.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {inscriptions.map((ins) => {
                  const s = ins.stagiaire;
                  const usersRef = Array.isArray(s?.users) ? s?.users[0] : s?.users;
                  const username = usersRef?.username ?? "—";
                  const nomComplet = s ? `${s.prenom} ${s.nom}` : "—";
                  const analyse = ins.analyse_besoins_texte ?? "";
                  const isEditing = editingId === ins.id;
                  return (
                    <li key={ins.id} className="py-4 first:pt-0">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{nomComplet}</span>
                            <code className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">{username}</code>
                            <Link
                              href={`/formateur/sessions/${id}/stagiaire/${ins.id}`}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Voir les réponses
                            </Link>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(ins.id)}
                            disabled={deletingId !== null}
                          >
                            {deletingId === ins.id ? "..." : <Trash2 className="w-4 h-4" />}
                          </Button>
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
                            <Button size="sm" onClick={() => handleUpdateAnalyse(ins.id)}>
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
      )}
    </div>
  );
}
