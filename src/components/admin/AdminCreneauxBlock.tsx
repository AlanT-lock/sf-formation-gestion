"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { toDatetimeLocalValue } from "@/lib/date";
import toast from "react-hot-toast";

interface Creneau {
  id: string;
  ordre: number;
  heure_debut: string | null;
  heure_fin: string | null;
}

interface AdminCreneauxBlockProps {
  sessionId: string;
  creneaux: Creneau[];
}

export function AdminCreneauxBlock({ sessionId, creneaux: initialCreneaux }: AdminCreneauxBlockProps) {
  const [creneaux, setCreneaux] = useState<Creneau[]>(initialCreneaux);

  async function updateCreneauTime(
    creneauId: string,
    field: "heure_debut" | "heure_fin",
    value: string
  ) {
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}/creneaux`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creneau_id: creneauId, [field]: value || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur");
      }
      toast.success(field === "heure_debut" ? "Heure de début enregistrée" : "Heure de fin enregistrée");
      setCreneaux((prev) =>
        prev.map((c) =>
          c.id === creneauId ? { ...c, [field]: value || null } : c
        )
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (creneaux.length === 0) return null;

  const sorted = [...creneaux].sort((a, b) => a.ordre - b.ordre);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Créneaux d&apos;émargement</CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Modifiez les horaires de début et fin pour chaque créneau.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {sorted.map((c) => (
            <li
              key={c.id}
              className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-lg"
            >
              <span className="font-medium text-slate-700 w-24">Créneau {c.ordre}</span>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Début</label>
                  <input
                    type="datetime-local"
                    defaultValue={toDatetimeLocalValue(c.heure_debut)}
                    onChange={(e) => {
                      const val = e.target.value ? new Date(e.target.value).toISOString() : "";
                      updateCreneauTime(c.id, "heure_debut", val);
                    }}
                    className="px-2 py-1.5 border border-slate-300 rounded text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500">Fin</label>
                  <input
                    type="datetime-local"
                    defaultValue={toDatetimeLocalValue(c.heure_fin)}
                    onChange={(e) => {
                      const val = e.target.value ? new Date(e.target.value).toISOString() : "";
                      updateCreneauTime(c.id, "heure_fin", val);
                    }}
                    className="px-2 py-1.5 border border-slate-300 rounded text-sm"
                  />
                </div>
              </div>
              <span className="text-sm text-slate-500">
                {c.heure_debut
                  ? new Date(c.heure_debut).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
                {" → "}
                {c.heure_fin
                  ? new Date(c.heure_fin).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
