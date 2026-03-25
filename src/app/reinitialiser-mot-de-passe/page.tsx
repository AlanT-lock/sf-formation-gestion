"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import toast from "react-hot-toast";

function ReinitialiserForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Lien invalide : token manquant.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      toast.error("Lien invalide.");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur");
        return;
      }
      setSuccess(true);
      toast.success(data.message || "Mot de passe mis à jour.");
      setTimeout(() => router.push("/"), 2000);
    } catch {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-slate-600 text-center mb-4">
              Lien invalide ou expiré. Demandez un nouveau lien depuis la page « Mot de passe oublié ».
            </p>
            <Link href="/mot-de-passe-oublie">
              <Button fullWidth>Mot de passe oublié</Button>
            </Link>
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

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6">
            <p className="text-slate-600 text-center mb-4">
              Votre mot de passe a été mis à jour. Vous allez être redirigé vers l&apos;accueil pour vous connecter.
            </p>
            <Link href="/">
              <Button fullWidth>Aller à l&apos;accueil</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Choisissez un mot de passe d&apos;au moins 6 caractères.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nouveau mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Input
              label="Confirmer le mot de passe"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <Button type="submit" fullWidth size="lg" disabled={loading}>
              {loading ? "Enregistrement..." : "Enregistrer le mot de passe"}
            </Button>
          </form>
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

export default function ReinitialiserMotDePassePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
          <p className="text-slate-500">Chargement...</p>
        </main>
      }
    >
      <ReinitialiserForm />
    </Suspense>
  );
}
