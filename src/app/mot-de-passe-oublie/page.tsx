"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import toast from "react-hot-toast";

export default function MotDePasseOubliePage() {
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = emailOrUsername.trim();
    if (!value) {
      toast.error("Indiquez votre email ou identifiant");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername: value }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Une erreur est survenue");
        return;
      }
      setSent(true);
      toast.success(data.message || "Email envoyé si un compte existe.");
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
          <CardTitle>Mot de passe oublié</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Entrez votre email ou identifiant pour recevoir un lien de réinitialisation.
          </p>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Si un compte existe avec ces informations, un email vous a été envoyé avec un lien pour définir un nouveau mot de passe. Vérifiez aussi vos spams.
              </p>
              <Link href="/">
                <Button variant="outline" fullWidth>
                  Retour à l&apos;accueil
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email ou identifiant"
                type="text"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                placeholder="vous@exemple.fr ou prenom.nom"
                required
                autoComplete="username email"
              />
              <Button type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? "Envoi en cours..." : "Envoyer le lien"}
              </Button>
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
