"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { FileText, Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import type { DocumentType } from "@/types/database";

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  test_pre: "Test de pré-formation",
  points_cles: "Test Points clés",
  test_fin: "Test de fin de formation",
  enquete_satisfaction: "Enquête de satisfaction",
  enquete_satisfaction_financeur: "Enquête de satisfaction financeur",
  bilan_final: "Bilan final",
};

const RESPONSE_TYPE_LABELS: Record<string, string> = {
  qcm: "QCM (choix multiples)",
  texte_libre: "Texte libre",
  liste: "Liste déroulante",
  echelle: "Échelle (note)",
};

interface FormationDocument {
  id: string;
  formation_id: string;
  document_type: DocumentType;
  nom_affiche: string;
  ordre: number;
  rempli_par: "stagiaire" | "formateur" | "financeur";
  created_at: string;
}

interface Question {
  id: string;
  formation_id: string;
  document_type: DocumentType;
  ordre: number;
  libelle: string;
  type_reponse: string;
  options: Record<string, unknown> | null;
  created_at: string;
}

interface FormationContenuProps {
  formationId: string;
  formationNom: string;
}

export function FormationContenu({ formationId, formationNom }: FormationContenuProps) {
  const [documents, setDocuments] = useState<FormationDocument[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocNom, setEditingDocNom] = useState("");
  const [expandedDoc, setExpandedDoc] = useState<DocumentType | null>(null);
  const [addingQuestionFor, setAddingQuestionFor] = useState<DocumentType | null>(null);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [formLibelle, setFormLibelle] = useState("");
  const [formTypeReponse, setFormTypeReponse] = useState<string>("texte_libre");
  const [formOptions, setFormOptions] = useState("");
  const [formOrdre, setFormOrdre] = useState(0);
  const [saving, setSaving] = useState(false);

  const fetchDocuments = useCallback(async () => {
    const res = await fetch(`/api/admin/formations/${formationId}/documents`);
    const data = await res.json();
    if (res.ok) setDocuments(Array.isArray(data) ? data : []);
  }, [formationId]);

  const fetchQuestions = useCallback(async () => {
    const res = await fetch(`/api/admin/formations/${formationId}/questions`);
    const data = await res.json();
    if (res.ok) setQuestions(Array.isArray(data) ? data : []);
  }, [formationId]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([fetchDocuments(), fetchQuestions()]).finally(() => setLoading(false));
  }, [fetchDocuments, fetchQuestions]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveDocumentNom(doc: FormationDocument) {
    if (!editingDocNom.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/formations/${formationId}/documents`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: doc.id, nom_affiche: editingDocNom.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Nom mis à jour");
      setEditingDocId(null);
      fetchDocuments();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  function openAddQuestion(document_type: DocumentType) {
    setAddingQuestionFor(document_type);
    setEditingQuestionId(null);
    setFormLibelle("");
    setFormTypeReponse("texte_libre");
    setFormOptions("");
    setFormOrdre(questions.filter((q) => q.document_type === document_type).length);
  }

  function openEditQuestion(q: Question) {
    setEditingQuestionId(q.id);
    setAddingQuestionFor(null);
    setFormLibelle(q.libelle);
    setFormTypeReponse(q.type_reponse);
    setFormOrdre(q.ordre);
    const opts = q.options as { options?: string[] } | null;
    setFormOptions(opts?.options?.join("\n") ?? "");
  }

  function parseOptions(): Record<string, unknown> | null {
    if (formTypeReponse === "texte_libre") return null;
    if (formTypeReponse === "echelle") {
      const lines = formOptions.trim().split(/\n/).filter(Boolean);
      if (lines.length >= 2) {
        const nums = lines.map((l) => parseInt(l.trim(), 10)).filter((n) => !isNaN(n));
        if (nums.length >= 2) return { options: nums.map(String) };
      }
      return { options: ["1", "2", "3", "4", "5"] };
    }
    const lines = formOptions.trim().split(/\n/).filter(Boolean);
    if (lines.length === 0) return null;
    return { options: lines };
  }

  async function handleCreateQuestion() {
    if (!addingQuestionFor || !formLibelle.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/formations/${formationId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_type: addingQuestionFor,
          ordre: formOrdre,
          libelle: formLibelle.trim(),
          type_reponse: formTypeReponse,
          options: parseOptions(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Question ajoutée");
      setAddingQuestionFor(null);
      fetchQuestions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateQuestion() {
    if (!editingQuestionId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${editingQuestionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordre: formOrdre,
          libelle: formLibelle.trim(),
          type_reponse: formTypeReponse,
          options: parseOptions(),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Question mise à jour");
      setEditingQuestionId(null);
      fetchQuestions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm("Supprimer cette question ?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Question supprimée");
      fetchQuestions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">Chargement...</CardContent>
      </Card>
    );
  }

  const documentsSorted = [...documents].sort((a, b) => a.ordre - b.ordre);
  const questionsByDoc = documentsSorted.reduce(
    (acc, doc) => {
      acc[doc.document_type] = questions
        .filter((q) => q.document_type === doc.document_type)
        .sort((a, b) => a.ordre - b.ordre);
      return acc;
    },
    {} as Record<DocumentType, Question[]>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents (tests) de la formation
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Modifiez le nom affiché pour les stagiaires. Cliquez sur un document pour gérer ses questions.
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {documentsSorted.map((doc) => (
            <div
              key={doc.id}
              className="border border-slate-200 rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center justify-between gap-2 p-3 bg-slate-50 cursor-pointer hover:bg-slate-100"
                onClick={() =>
                  setExpandedDoc(expandedDoc === doc.document_type ? null : doc.document_type)
                }
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {expandedDoc === doc.document_type ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                  {editingDocId === doc.id ? (
                    <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingDocNom}
                        onChange={(e) => setEditingDocNom(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1 border border-slate-300 rounded text-sm"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleSaveDocumentNom(doc)} disabled={saving}>
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingDocId(null)}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium text-slate-800">{doc.nom_affiche}</span>
                  )}
                  {editingDocId !== doc.id && (
                    <select
                      value={doc.rempli_par ?? "stagiaire"}
                      onChange={async (e) => {
                        const val = e.target.value as "stagiaire" | "formateur" | "financeur";
                        setSaving(true);
                        try {
                          const res = await fetch(`/api/admin/formations/${formationId}/documents`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ document_id: doc.id, rempli_par: val }),
                          });
                          if (!res.ok) throw new Error((await res.json()).error);
                          toast.success("Rempli par mis à jour");
                          fetchDocuments();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "Erreur");
                        } finally {
                          setSaving(false);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-2 px-2 py-1 border border-slate-300 rounded text-sm bg-white"
                    >
                      <option value="stagiaire">Rempli par le stagiaire</option>
                      <option value="formateur">Rempli par le formateur</option>
                      <option value="financeur">Fourni par le financeur</option>
                    </select>
                  )}
                </div>
                {editingDocId !== doc.id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDocId(doc.id);
                      setEditingDocNom(doc.nom_affiche);
                    }}
                    className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                    title="Modifier le nom"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              {expandedDoc === doc.document_type && (
                <div className="p-4 border-t border-slate-200 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-700">Questions</h4>
                    <Button
                      size="sm"
                      onClick={() => openAddQuestion(doc.document_type)}
                      disabled={!!addingQuestionFor || !!editingQuestionId}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter une question
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {(questionsByDoc[doc.document_type] ?? []).map((q) => (
                      <li
                        key={q.id}
                        className="flex items-center justify-between gap-2 py-2 border-b border-slate-100 last:border-0"
                      >
                        {editingQuestionId === q.id ? (
                          <div className="flex-1 space-y-2">
                            <Input
                              label=""
                              value={formLibelle}
                              onChange={(e) => setFormLibelle(e.target.value)}
                              placeholder="Libellé de la question"
                            />
                            <select
                              value={formTypeReponse}
                              onChange={(e) => setFormTypeReponse(e.target.value)}
                              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                            >
                              {Object.entries(RESPONSE_TYPE_LABELS).map(([val, label]) => (
                                <option key={val} value={val}>
                                  {label}
                                </option>
                              ))}
                            </select>
                            {(formTypeReponse === "qcm" || formTypeReponse === "liste" || formTypeReponse === "echelle") && (
                              <textarea
                                value={formOptions}
                                onChange={(e) => setFormOptions(e.target.value)}
                                placeholder={
                                  formTypeReponse === "echelle"
                                    ? "Une valeur par ligne (ex: 1 à 5)"
                                    : "Une option par ligne"
                                }
                                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                                rows={3}
                              />
                            )}
                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleUpdateQuestion} disabled={saving}>
                                Enregistrer
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingQuestionId(null)}>
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{q.libelle}</p>
                              <p className="text-xs text-slate-500">
                                {RESPONSE_TYPE_LABELS[q.type_reponse] ?? q.type_reponse}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => openEditQuestion(q)}
                                className="p-1.5 text-slate-500 hover:text-primary-600 rounded"
                                title="Modifier"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 text-slate-500 hover:text-red-600 rounded"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  {addingQuestionFor === doc.document_type && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg space-y-3">
                      <h4 className="font-medium text-slate-700">Nouvelle question</h4>
                      <Input
                        label="Libellé"
                        value={formLibelle}
                        onChange={(e) => setFormLibelle(e.target.value)}
                        placeholder="Texte de la question"
                      />
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Format de réponse
                        </label>
                        <select
                          value={formTypeReponse}
                          onChange={(e) => setFormTypeReponse(e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                        >
                          {Object.entries(RESPONSE_TYPE_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {(formTypeReponse === "qcm" || formTypeReponse === "liste" || formTypeReponse === "echelle") && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Options (une par ligne)
                          </label>
                          <textarea
                            value={formOptions}
                            onChange={(e) => setFormOptions(e.target.value)}
                            placeholder={
                              formTypeReponse === "echelle"
                                ? "1\n2\n3\n4\n5"
                                : "Option A\nOption B\nOption C"
                            }
                            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm"
                            rows={4}
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button onClick={handleCreateQuestion} disabled={saving || !formLibelle.trim()}>
                          Ajouter
                        </Button>
                        <Button variant="ghost" onClick={() => setAddingQuestionFor(null)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
