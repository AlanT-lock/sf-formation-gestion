# Checklist — Tout ce qu’il reste à faire pour finaliser

Liste concrète dans l’ordre recommandé.

---

## 1. Base de données (Supabase)

À faire dans l’éditeur SQL de votre projet Supabase (Dashboard → SQL Editor).

- [ ] **1.1** Exécuter la migration email : ouvrir `supabase/migration_users_email.sql`, copier-coller le contenu dans l’éditeur SQL, exécuter.
- [ ] **1.2** Exécuter la migration jetons de réinitialisation : ouvrir `supabase/migration_password_reset_tokens.sql`, copier-coller, exécuter.
- [ ] **1.3** Exécuter la migration enquête à froid : ouvrir `supabase/migration_enquete_froid_sent.sql`, copier-coller, exécuter.

Vérification : la table `users` doit avoir une colonne `email` ; les tables `password_reset_tokens` et `enquete_satisfaction_froid_sent` doivent exister ; la fonction `get_sessions_for_enquete_froid` doit exister.

---

## 2. Réinitialisation du mot de passe (déjà implémentée)

Les routes, pages et liens « Mot de passe oublié » sont en place. Il ne reste que la configuration email.

- [ ] **2.1** Créer un compte sur [Resend](https://resend.com) (gratuit pour quelques milliers d’emails/mois) et récupérer une clé API.
- [ ] **2.2** Dans `.env.local` (et dans Vercel en prod), ajouter :
  ```env
  RESEND_API_KEY=re_xxxxxxxxxxxx
  RESEND_FROM=SF Formation <noreply@votre-domaine.com>
  ```
  Pour Resend, l’adresse d’envoi doit être un domaine vérifié (ou utiliser `onboarding@resend.dev` pour les tests).
- [ ] **2.3** Rien à coder : le SDK `resend` est déjà installé ; les pages de connexion admin, formateur et stagiaire ont déjà le lien « Mot de passe oublié » vers `/mot-de-passe-oublie`. Le lien envoyé par email mène à `/reinitialiser-mot-de-passe?token=...`.

---

## 3. Enquêtes de satisfaction à froid (Edge Function)

- [ ] **3.1** Installer Supabase CLI si besoin : `npm install -g supabase`
- [ ] **3.2** Se connecter : `supabase login`
- [ ] **3.3** Lier le projet (si pas déjà fait) : `supabase link --project-ref VOTRE_PROJECT_REF` (ref dans l’URL du dashboard Supabase).
- [ ] **3.4** Déployer la fonction :
  ```bash
  supabase functions deploy send-satisfaction-survey
  ```
- [ ] **3.5** Configurer les secrets (dashboard Supabase → Edge Functions → Secrets, ou CLI) :
  - `APP_URL` = URL de votre app (ex. `https://votre-app.vercel.app`)
  - `RESEND_API_KEY` = clé Resend (pour l’envoi des emails d’enquête)
  - `RESEND_FROM` = adresse d’envoi (ex. `SF Formation <noreply@votre-domaine.com>`)
- [ ] **3.6** Cron automatique (2 semaines après la formation) :
  - Activer les extensions **pg_cron** et **pg_net** (Dashboard > Database > Extensions)
  - Créer des secrets dans le **Vault** (Dashboard > Database > Vault) : `project_url` (= `https://VOTRE_REF.supabase.co`) et `anon_key` (= clé anon Supabase)
  - Exécuter `supabase/migration_cron_enquete_froid.sql` dans l’éditeur SQL
  - Le cron s’exécute tous les jours à 08:00 UTC et envoie automatiquement les enquêtes pour les sessions terminées il y a 14 jours.

---

## 4. Optionnel

- [ ] **4.1** Renseigner l’email des comptes admin existants (en BDD ou via un futur écran « Mon profil »).
- [ ] **4.2** En prod, définir `NEXT_PUBLIC_APP_URL` dans Vercel si vous voulez que le QR code formateur pointe explicitement vers votre domaine.
- [ ] **4.3** Ajouter du rate limiting sur `forgot-password` et `reset-password` (ex. Vercel, middleware Next.js ou un service dédié) pour limiter les abus.

---

## Récapitulatif ultra-court

| # | Action |
|---|--------|
| 1 | Exécuter les 3 migrations SQL (email, password_reset_tokens, enquete_froid_sent) dans Supabase |
| 2 | Ajouter `RESEND_API_KEY` et `RESEND_FROM` dans `.env.local` (et Vercel) |
| 3 | `npm install resend` (si pas déjà fait) |
| 4 | Vérifier les liens « Mot de passe oublié » sur les pages de connexion |
| 5 | Déployer l’Edge Function `send-satisfaction-survey` et configurer ses secrets |

Une fois ces points faits, email en BDD, première connexion avec email, connexion par email/username, réinitialisation de mot de passe, QR code formateur et envoi d’enquêtes à froid sont opérationnels.
