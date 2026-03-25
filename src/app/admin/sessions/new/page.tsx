"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface Financeur {
  nom: string;
  email: string;
}

interface Formation {
  id: string;
  nom: string;
}

interface Formateur {
  id: string;
  nom: string;
  prenom: string;
}

export default function NewSessionPage() {
  const router = useRouter();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formateurs, setFormateurs] = useState<Formateur[]>([]);
  const [nom, setNom] = useState("");
  const [formationId, setFormationId] = useState("");
  const [nbCreneaux, setNbCreneaux] = useState(2);
  const [formateurId, setFormateurId] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [financeurs, setFinanceurs] = useState<Financeur[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [fRes, foRes] = await Promise.all([
        fetch("/api/admin/formations").then((r) => r.json()).catch(() => []),
        fetch("/api/admin/formateurs").then((r) => r.json()).catch(() => []),
      ]);
      if (Array.isArray(fRes)) setFormations(fRes);
      else if (fRes?.data) setFormations(fRes.data);
      if (Array.isArray(foRes)) setFormateurs(foRes);
      else if (foRes?.data) setFormateurs(foRes.data);
      if (formationId === "" && formations[0]) setFormationId(formations[0].id);
      if (formateurId === "" && formateurs[0]) setFormateurId(formateurs[0].id);
    })();
  }, []);

  useEffect(() => {
    if (formationId === "" && formations.length) setFormationId(formations[0].id);
    if (formateurId === "" && formateurs.length) setFormateurId(formateurs[0].id);
  }, [formations, formateurs, formationId, formateurId]);

  async function loadFormationsAndFormateurs() {
    try {
      const [fRes, foRes] = await Promise.all([
        fetch("/api/admin/formations"),
        fetch("/api/admin/formateurs"),
      ]);
      const fData = await fRes.json();
      const foData = await foRes.json();
      if (Array.isArray(fData)) setFormations(fData);
      if (Array.isArray(foData)) setFormateurs(foData);
      if (formationId === "" && Array.isArray(fData) && fData[0]) setFormationId(fData[0].id);
      if (formateurId === "" && Array.isArray(foData) && foData[0]) setFormateurId(foData[0].id);
    } catch (_) {}
  }

  useEffect(() => {
    loadFormationsAndFormateurs();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || !formationId || nbCreneaux < 1 || !formateurId) {
      toast.error("Remplissez tous les champs requis");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          formation_id: formationId,
          nb_creneaux: nbCreneaux,
          formateur_id: formateurId,
          dates: dates.filter(Boolean),
          financeurs,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      toast.success("Session créée");
      router.push(`/admin/sessions/${data.id}`);
      router.refresh();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  function addDate() {
    setDates([...dates, ""]);
  }
  function removeDate(i: number) {
    setDates(dates.filter((_, idx) => idx !== i));
  }
  function updateDate(i: number, v: string) {
    const next = [...dates];
    next[i] = v;
    setDates(next);
  }

  function addFinanceur() {
    setFinanceurs([...financeurs, { nom: "", email: "" }]);
  }
  function removeFinanceur(i: number) {
    setFinanceurs(financeurs.filter((_, idx) => idx !== i));
  }
  function updateFinanceur(i: number, field: "nom" | "email", v: string) {
    const next = [...financeurs];
    next[i] = { ...next[i], [field]: v };
    setFinanceurs(next);
  }

  return (
    <div className="max-w-lg space-y-6">
      <Link
        href="/admin/sessions"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux sessions
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle session</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Définissez le nom, la formation, le nombre de créneaux et le formateur.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nom de la session"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex. Session mars 2025"
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Formation
              </label>
              <select
                value={formationId}
                onChange={(e) => setFormationId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Choisir...</option>
                {formations.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nom}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Nombre de créneaux (demi-journées)"
              type="number"
              min={1}
              value={nbCreneaux}
              onChange={(e) => setNbCreneaux(parseInt(e.target.value, 10) || 1)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Formateur
              </label>
              <select
                value={formateurId}
                onChange={(e) => setFormateurId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Choisir...</option>
                {formateurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.prenom} {f.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Dates (optionnel)
              </label>
              {dates.map((d, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    type="date"
                    value={d}
                    onChange={(e) => updateDate(i, e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeDate(i)}
                    className="px-3 py-2 text-slate-500 hover:text-red-600"
                  >
                    Retirer
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addDate}
                className="text-sm text-primary-600 hover:underline"
              >
                + Ajouter une date
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Financeurs (optionnel)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Nom du financeur et adresse email. Ils recevront un lien pour remplir l&apos;enquête 1 semaine après la formation.
              </p>
              {financeurs.map((f, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-2 mb-2 p-3 bg-slate-50 rounded-lg">
                  <Input
                    placeholder="Nom du financeur"
                    value={f.nom}
                    onChange={(e) => updateFinanceur(i, "nom", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={f.email}
                    onChange={(e) => updateFinanceur(i, "email", e.target.value)}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeFinanceur(i)}
                    className="p-2 text-slate-500 hover:text-red-600 self-center"
                    title="Retirer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addFinanceur}
                className="text-sm text-primary-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Ajouter un financeur
              </button>
            </div>
            <Button type="submit" fullWidth disabled={loading}>
              {loading ? "Création..." : "Créer la session"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
