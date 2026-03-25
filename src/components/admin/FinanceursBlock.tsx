"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Plus, Trash2, Mail } from "lucide-react";

interface Financeur {
  id: string;
  nom: string;
  email: string;
  created_at: string;
}

export function FinanceursBlock({ sessionId }: { sessionId: string }) {
  const [financeurs, setFinanceurs] = useState<Financeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const fetchFinanceurs = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/financeurs`);
      const data = await res.json();
      if (res.ok) setFinanceurs(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Erreur chargement financeurs");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchFinanceurs();
  }, [fetchFinanceurs]);

  async function handleAdd() {
    if (!newNom.trim() || !newEmail.trim()) {
      toast.error("Nom et email requis");
      return;
    }
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/financeurs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newNom.trim(), email: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Financeur ajouté");
      setNewNom("");
      setNewEmail("");
      setAdding(false);
      fetchFinanceurs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce financeur ?")) return;
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/financeurs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Financeur supprimé");
      fetchFinanceurs();
    } catch {
      toast.error("Erreur");
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-slate-500">Chargement...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Financeurs
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Les financeurs recevront un lien par email 1 semaine après la formation pour remplir l&apos;enquête de satisfaction (sans connexion).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {financeurs.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg"
            >
              <div>
                <span className="font-medium text-slate-800">{f.nom}</span>
                <span className="text-sm text-slate-500 ml-2">{f.email}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(f.id)}
                className="p-2 text-slate-500 hover:text-red-600 rounded"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        {adding ? (
          <div className="flex flex-col sm:flex-row gap-2 p-4 bg-slate-50 rounded-lg">
            <Input
              placeholder="Nom du financeur"
              value={newNom}
              onChange={(e) => setNewNom(e.target.value)}
              className="flex-1"
            />
            <Input
              type="email"
              placeholder="Email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={!newNom.trim() || !newEmail.trim()}>
                Enregistrer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Ajouter un financeur
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
