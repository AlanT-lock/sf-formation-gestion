"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ArrowLeft,
  BarChart3,
  MessageSquare,
  Users,
  Percent,
  Download,
  ChevronDown,
  ChevronRight,
  Filter,
  AlertTriangle,
} from "lucide-react";

interface Formation {
  id: string;
  nom: string;
}

interface SessionOption {
  id: string;
  nom: string;
  formation_id: string;
  formation_nom: string;
}

interface Stats {
  total_invited: number;
  total_responded: number;
  response_rate: number;
  sessions_count: number;
}

interface SessionStat {
  session_id: string;
  session_nom: string;
  invited: number;
  responded: number;
  response_rate: number;
}

interface EchelleAverage {
  question_id: string;
  libelle: string;
  avg: number;
  count: number;
}

interface ColdMailLog {
  session_id: string;
  session_nom: string;
  formation_id: string;
  formation_nom: string;
  sent_at: string;
  invited_count: number;
}

interface QuestionResponse {
  id: string;
  formation_id: string;
  ordre: number;
  libelle: string;
  type_reponse: string;
  options: unknown;
  total_responses: number;
  distribution: { value: string; count: number; session_ids?: string[] }[];
  text_responses: { value: string; session_nom: string; inscription_id: string }[];
}

interface SatisfactionData {
  formations: Formation[];
  sessions: SessionOption[];
  questions: unknown[];
  stats: Stats;
  responses_by_question: QuestionResponse[];
  raw_responses: { question_id: string; question_libelle: string; valeur: string; session_nom: string }[];
  session_stats?: SessionStat[];
  echelle_averages?: EchelleAverage[];
  cold_mail_logs?: ColdMailLog[];
}

export default function AdminSatisfactionPage() {
  const [data, setData] = useState<SatisfactionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [formationId, setFormationId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [expandedText, setExpandedText] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (formationId) params.set("formation_id", formationId);
      if (sessionId) params.set("session_id", sessionId);
      const res = await fetch(`/api/admin/satisfaction?${params.toString()}`);
      if (!res.ok) throw new Error("Erreur chargement");
      const json = await res.json();
      setData(json);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [formationId, sessionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (sessionId && data?.sessions) {
      const s = data.sessions.find((x) => x.id === sessionId);
      if (!s && data.sessions.length > 0) setSessionId("");
    }
  }, [sessionId, data?.sessions]);

  function exportCSV() {
    if (!data?.raw_responses?.length) return;
    const headers = ["Question", "Session", "Réponse"];
    const rows = data.raw_responses.map((r) => [
      `"${(r.question_libelle || "").replace(/"/g, '""')}"`,
      `"${(r.session_nom || "").replace(/"/g, '""')}"`,
      `"${(r.valeur || "").replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enquete_satisfaction_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleTextExpand(qId: string) {
    setExpandedText((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au tableau de bord
          </Link>
          <h1 className="text-2xl font-bold text-slate-800">Enquête de satisfaction</h1>
          <p className="text-slate-600 mt-1">
            Synthèse des réponses à l&apos;enquête de satisfaction (sessions ayant déclenché l&apos;étape).
          </p>
        </div>
        {data && data.raw_responses.length > 0 && (
          <Button variant="outline" onClick={exportCSV} className="flex items-center gap-2 shrink-0">
            <Download className="w-4 h-4" />
            Exporter CSV
          </Button>
        )}
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Filtrer par formation ou par session pour affiner les résultats.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Formation</label>
            <select
              value={formationId}
              onChange={(e) => {
                setFormationId(e.target.value);
                setSessionId("");
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[200px]"
            >
              <option value="">Toutes les formations</option>
              {(data?.formations ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Session</label>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm min-w-[240px]"
            >
              <option value="">Toutes les sessions</option>
              {(data?.sessions ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} — {s.formation_nom}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Chargement des données...</div>
      ) : !data ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            Impossible de charger les données.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Alertes : problèmes à ne pas manquer */}
          {data.stats.total_invited > 0 && (() => {
            const alerts: { type: "warning" | "danger"; msg: string }[] = [];
            if (data.stats.response_rate < 70)
              alerts.push({
                type: data.stats.response_rate < 50 ? "danger" : "warning",
                msg: `Taux de réponse global faible : ${data.stats.response_rate} % (objectif recommandé : ≥ 70 %)`,
              });
            (data.echelle_averages ?? []).forEach((e) => {
              if (e.avg < 3.5)
                alerts.push({
                  type: e.avg < 2.5 ? "danger" : "warning",
                  msg: `Note moyenne basse sur « ${e.libelle} » : ${e.avg}/5`,
                });
            });
            (data.session_stats ?? []).forEach((s) => {
              if (s.invited > 0 && s.response_rate < 50)
                alerts.push({
                  type: "warning",
                  msg: `Session « ${s.session_nom} » : seulement ${s.response_rate} % de réponses (${s.responded}/${s.invited})`,
                });
            });
            if (alerts.length === 0) return null;
            return (
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 ${
                      a.type === "danger"
                        ? "bg-red-50 border-red-300 text-red-900"
                        : "bg-amber-50 border-amber-300 text-amber-900"
                    }`}
                  >
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <p className="font-medium">{a.msg}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Indicateurs clés */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary-50">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{data.stats.total_invited}</p>
                    <p className="text-sm text-slate-600">Stagiaires invités</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{data.stats.total_responded}</p>
                    <p className="text-sm text-slate-600">Réponses reçues</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={data.stats.response_rate < 70 ? "ring-2 ring-amber-400 bg-amber-50/50" : ""}>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${data.stats.response_rate < 70 ? "bg-amber-100" : "bg-amber-50"}`}>
                    <Percent className={`w-6 h-6 ${data.stats.response_rate < 70 ? "text-amber-700" : "text-amber-600"}`} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${data.stats.response_rate < 70 ? "text-amber-800" : "text-slate-800"}`}>
                      {data.stats.response_rate} %
                    </p>
                    <p className="text-sm text-slate-600">Taux de réponse</p>
                    {data.stats.response_rate < 70 && (
                      <p className="text-xs text-amber-700 mt-1 font-medium">Objectif : ≥ 70 %</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100">
                    <BarChart3 className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{data.stats.sessions_count}</p>
                    <p className="text-sm text-slate-600">Sessions concernées</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Taux par session et notes moyennes (échelles) */}
          {((data.session_stats?.length ?? 0) > 0 || (data.echelle_averages?.length ?? 0) > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.session_stats && data.session_stats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">Taux de réponse par session</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Sessions avec un taux &lt; 50 % sont à surveiller.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {data.session_stats.map((s) => (
                        <div
                          key={s.session_id}
                          className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                            s.response_rate < 50 ? "bg-amber-50 border border-amber-200" : "bg-slate-50"
                          }`}
                        >
                          <span className="text-sm font-medium text-slate-800 truncate flex-1 mr-2">
                            {s.session_nom}
                          </span>
                          <span
                            className={`text-sm font-bold shrink-0 ${
                              s.response_rate < 50 ? "text-amber-700" : "text-slate-700"
                            }`}
                          >
                            {s.response_rate} % ({s.responded}/{s.invited})
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {data.echelle_averages && data.echelle_averages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">Notes moyennes (questions échelle)</CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Questions notées sur 5. Une note &lt; 3,5 mérite attention.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {data.echelle_averages.map((e) => (
                        <div
                          key={e.question_id}
                          className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                            e.avg < 3.5 ? "bg-amber-50 border border-amber-200" : "bg-slate-50"
                          }`}
                        >
                          <span className="text-sm font-medium text-slate-800 truncate flex-1 mr-2">
                            {e.libelle}
                          </span>
                          <span
                            className={`text-sm font-bold shrink-0 ${
                              e.avg < 3.5 ? "text-amber-700" : "text-slate-700"
                            }`}
                          >
                            {e.avg}/5 ({e.count} réponses)
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Historique des envois à froid */}
          <Card>
            <CardHeader>
              <CardTitle>Historique des emails d&apos;enquête à froid</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Envois automatiques réalisés à J+14 après la dernière date de session.
              </p>
            </CardHeader>
            <CardContent>
              {(data.cold_mail_logs ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucun envoi d&apos;enquête à froid trouvé pour ce filtre.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-3 py-2 font-medium text-slate-700">Date d&apos;envoi</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-700">Session</th>
                        <th className="text-left px-3 py-2 font-medium text-slate-700">Formation</th>
                        <th className="text-right px-3 py-2 font-medium text-slate-700">Stagiaires ciblés</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.cold_mail_logs ?? []).map((log) => (
                        <tr key={`${log.session_id}-${log.sent_at}`} className="border-t border-slate-100">
                          <td className="px-3 py-2 text-slate-800">
                            {new Date(log.sent_at).toLocaleString("fr-FR")}
                          </td>
                          <td className="px-3 py-2 text-slate-800">{log.session_nom || "—"}</td>
                          <td className="px-3 py-2 text-slate-700">{log.formation_nom || "—"}</td>
                          <td className="px-3 py-2 text-right text-slate-700">{log.invited_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {data.stats.total_invited === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                Aucune session n&apos;a encore déclenché l&apos;enquête de satisfaction, ou aucun stagiaire
                n&apos;est inscrit dans les sessions concernées. Déclenchez l&apos;étape &quot;Enquête de
                satisfaction&quot; depuis une session formateur pour commencer à collecter des réponses.
              </CardContent>
            </Card>
          ) : data.responses_by_question.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                Aucune question d&apos;enquête de satisfaction définie pour les formations concernées.
                Configurez les questions dans Formations → détail d&apos;une formation → document
                &quot;Enquête de satisfaction&quot;.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-slate-800">Résultats par question</h2>
              {data.responses_by_question.map((q) => (
                <Card key={q.id}>
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-slate-800">
                      {q.libelle}
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      {q.total_responses} réponse{q.total_responses !== 1 ? "s" : ""} · Type :{" "}
                      {q.type_reponse === "qcm"
                        ? "QCM"
                        : q.type_reponse === "echelle"
                        ? "Échelle"
                        : q.type_reponse === "liste"
                        ? "Liste"
                        : "Texte libre"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {q.type_reponse === "texte_libre" ? (
                      <div>
                        {q.text_responses.length === 0 ? (
                          <p className="text-slate-500 text-sm">Aucune réponse textuelle.</p>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              {q.text_responses.length} réponse{q.text_responses.length !== 1 ? "s" : ""}
                            </p>
                            <div className="space-y-2 max-h-80 overflow-y-auto">
                              {(expandedText.has(q.id)
                                ? q.text_responses
                                : q.text_responses.slice(0, 10)
                              ).map((tr, idx) => (
                                <div
                                  key={`${tr.inscription_id}-${idx}`}
                                  className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm"
                                >
                                  <p className="text-slate-800 whitespace-pre-wrap">{tr.value}</p>
                                  <p className="text-xs text-slate-500 mt-1">Session : {tr.session_nom}</p>
                                </div>
                              ))}
                            </div>
                            {q.text_responses.length > 10 && (
                              <button
                                type="button"
                                onClick={() => toggleTextExpand(q.id)}
                                className="flex items-center gap-1 text-sm text-primary-600 hover:underline mt-2"
                              >
                                {expandedText.has(q.id) ? (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    Réduire
                                  </>
                                ) : (
                                  <>
                                    <ChevronRight className="w-4 h-4" />
                                    Voir toutes les réponses ({q.text_responses.length})
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3">
                          {(() => {
                            const qMax = Math.max(...q.distribution.map((d) => d.count), 1);
                            return q.distribution.map((d) => {
                              const pct = q.total_responses > 0 ? (d.count / q.total_responses) * 100 : 0;
                              const barPct = (d.count / qMax) * 100;
                              return (
                                <div key={d.value} className="flex items-center gap-3">
                                  <div className="w-32 sm:w-48 shrink-0 text-sm text-slate-700 truncate" title={d.value}>
                                    {d.value || "(vide)"}
                                  </div>
                                  <div className="flex-1 min-w-0 flex items-center gap-2">
                                    <div className="flex-1 h-8 bg-slate-100 rounded-md overflow-hidden">
                                      <div
                                        className="h-full bg-primary-500 rounded-md transition-all duration-500 min-w-[2px]"
                                        style={{ width: `${barPct}%` }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 w-16 text-right">
                                      {d.count} ({Math.round(pct)} %)
                                    </span>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                        {q.distribution.length > 0 && (
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                              <thead>
                                <tr className="bg-slate-50">
                                  <th className="text-left px-3 py-2 font-medium text-slate-700">Réponse</th>
                                  <th className="text-right px-3 py-2 font-medium text-slate-700">Nombre</th>
                                  <th className="text-right px-3 py-2 font-medium text-slate-700">%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {q.distribution.map((d) => {
                                  const pct = q.total_responses > 0 ? (d.count / q.total_responses) * 100 : 0;
                                  return (
                                    <tr key={d.value} className="border-t border-slate-100">
                                      <td className="px-3 py-2 text-slate-800">{d.value || "(vide)"}</td>
                                      <td className="px-3 py-2 text-right text-slate-700">{d.count}</td>
                                      <td className="px-3 py-2 text-right text-slate-700">{Math.round(pct)} %</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {q.total_responses > 0 && q.type_reponse === "echelle" && (() => {
                          const totalWeight = q.distribution.reduce((s, d) => s + d.count, 0);
                          const sum = q.distribution.reduce((s, d) => {
                            const n = parseFloat(d.value);
                            return s + (isNaN(n) ? 0 : n * d.count);
                          }, 0);
                          const avg = totalWeight > 0 ? sum / totalWeight : null;
                          return avg != null ? (
                            <p className="text-sm text-slate-600 pt-2 border-t border-slate-100">
                              <strong>Note moyenne :</strong> {avg.toFixed(2)}
                            </p>
                          ) : null;
                        })()}
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
