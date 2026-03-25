"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import toast from "react-hot-toast";

export default function StagiaireLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [firstLoginMode, setFirstLoginMode] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (firstLoginMode) {
        const res = await fetch("/api/auth/request-first-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: username.trim().toLowerCase(),
            role: "stagiaire",
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Erreur");
          return;
        }
        toast.success("Accédez à la page pour définir votre mot de passe");
        router.push("/stagiaire/first-login");
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Erreur de connexion");
          return;
        }
        if (data.role !== "stagiaire") {
          toast.error("Accès réservé aux stagiaires");
          return;
        }
        toast.success("Connexion réussie");
        if (!data.firstLoginDone) {
          router.push("/stagiaire/first-login");
        } else {
          router.push("/stagiaire");
        }
      }
      router.refresh();
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Espace Stagiaire</CardTitle>
          <p className="text-sm text-slate-500 mt-1">SF Formation</p>
        </CardHeader>
        <CardContent>
          {firstLoginMode ? (
            <>
              <p className="text-sm text-slate-600 mb-4">
                Première connexion : entrez votre identifiant pour accéder à la page de définition du mot de passe.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Identifiant"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="jean.dupont"
                  required
                  autoComplete="username"
                />
                <Button type="submit" fullWidth size="lg" disabled={loading}>
                  {loading ? "Accès..." : "Accéder à la première connexion"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  fullWidth
                  onClick={() => setFirstLoginMode(false)}
                  disabled={loading}
                >
                  Retour à la connexion
                </Button>
              </form>
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Identifiant (prénom.nom)"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="jean.dupont"
                required
                autoComplete="username"
              />
              <Input
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <Button type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </Button>
              <p className="text-center">
                <button
                  type="button"
                  onClick={() => setFirstLoginMode(true)}
                  className="text-sm text-primary-600 hover:underline"
                >
                  Première connexion ?
                </button>
              </p>
              <p className="text-center text-sm text-slate-500">
                <Link href="/mot-de-passe-oublie" className="text-primary-600 hover:underline">
                  Mot de passe oublié ?
                </Link>
              </p>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-slate-500">
            <Link href="/" className="text-primary-600 hover:underline">
              Retour à l&apos;accueil
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
