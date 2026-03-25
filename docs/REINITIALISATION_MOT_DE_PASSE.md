# Réinitialisation du mot de passe (sans Supabase Auth)

Ce projet n’utilise pas Supabase Auth : les comptes sont en base (`users`) avec des mots de passe hashés (bcrypt). La réinitialisation se fait donc **manuellement** côté app avec des jetons temporaires et l’envoi d’emails.

## Principe

1. **Demande de réinitialisation**  
   L’utilisateur saisit son **email** ou son **nom d’utilisateur** sur une page « Mot de passe oublié ».  
   Le backend :
   - trouve l’utilisateur dans `users` (par `email` ou `username`) ;
   - génère un **jeton unique** (ex. `crypto.randomUUID()`), avec une **date d’expiration** (ex. 1 h) ;
   - enregistre le jeton en base (`password_reset_tokens`) ;
   - envoie un **email** contenant un lien du type :  
     `https://votre-app.com/reinitialiser-mot-de-passe?token=...`

2. **Clic sur le lien**  
   L’utilisateur arrive sur une page « Nouveau mot de passe » avec le `token` dans l’URL.  
   Il saisit (et confirme) un nouveau mot de passe.  
   Le backend :
   - vérifie que le jeton existe, n’est pas expiré et n’a pas déjà été utilisé ;
   - met à jour `users.password_hash` avec le nouveau mot de passe (bcrypt) ;
   - invalide le jeton (suppression ou champ `used_at`).

Aucune utilisation de Supabase Auth : tout est géré dans votre BDD et votre API (Next.js ou Edge Functions).

## Ce qui est fourni dans le projet

- **Migration SQL** : table `password_reset_tokens` (voir `supabase/migration_password_reset_tokens.sql`).
- **API Next.js** (à implémenter ou déjà en place) :
  - `POST /api/auth/forgot-password` : reçoit `email` ou `username`, crée un jeton, **envoie l’email** (voir ci‑dessous).
  - `POST /api/auth/reset-password` : reçoit `token` + `password` (+ confirmation), vérifie le jeton et met à jour le mot de passe.

## Envoi d’emails

Supabase Auth ne gère pas l’envoi d’emails à votre place. Il faut utiliser un service d’email :

- **Option 1 – Edge Function Supabase**  
  Une Edge Function qui :
  - reçoit (en body ou en query) l’email du destinataire et l’URL du lien de réinitialisation (ou le token) ;
  - appelle un fournisseur d’email (Resend, SendGrid, etc.) pour envoyer le mail.  
  Votre API Next.js `forgot-password` crée le jeton en BDD puis appelle cette Edge Function (avec la clé appropriée) pour envoyer le lien.

- **Option 2 – API Next.js + SDK email**  
  Dans la route `forgot-password` (Next.js), après avoir créé le jeton :
  - construire l’URL de réinitialisation ;
  - appeler directement un SDK (Resend, Nodemailer, etc.) pour envoyer l’email.  
  Les variables (clé API, SMTP, etc.) sont à mettre dans `.env` (ou Vercel).

- **Option 3 – Cron + Edge Function**  
  Moins courant : une Edge Function déclenchée par un cron qui lit les jetons « à envoyer » et envoie les emails (utile si vous voulez tout centraliser côté Supabase).

Recommandation : **Option 1 ou 2** selon que vous préférez centraliser l’envoi dans Supabase (Edge) ou dans Next.js.

## Sécurité

- Jeton **aléatoire**, **à usage unique** et **limité dans le temps** (ex. 1 h).
- Ne pas exposer le jeton dans les logs ni dans l’URL au‑delà du besoin (la page peut le lire une fois puis le retirer de l’historique si besoin).
- Rate limiting conseillé sur `forgot-password` et `reset-password` pour limiter les abus (bruteforce, énumération d’emails).

## Résumé

| Étape | Où | Action |
|-------|----|--------|
| 1 | Page « Mot de passe oublié » | Saisie email ou username |
| 2 | API `forgot-password` | Recherche user, création jeton en BDD, envoi email avec lien |
| 3 | Email | Lien vers `/reinitialiser-mot-de-passe?token=...` |
| 4 | Page « Nouveau mot de passe » | Saisie nouveau mot de passe + confirmation |
| 5 | API `reset-password` | Vérification jeton, mise à jour `password_hash`, invalidation jeton |

Une fois l’email en place (Edge Function ou Next.js), la réinitialisation par email ou nom d’utilisateur est opérationnelle avec ce schéma.
