# Edge Functions — Enquêtes de satisfaction à froid

Les enquêtes de satisfaction sont envoyées **à froid** aux stagiaires, **2 semaines après la dernière date de la formation**. Une Edge Function Supabase envoie les emails via Resend.

## Fonction fournie : `send-satisfaction-survey`

### Deux modes

1. **Mode manuel** : envoi pour une session donnée (test ou déclenchement manuel).
2. **Mode cron** : appel sans `session_id` → la fonction trouve toutes les sessions dont la **dernière date** est **il y a exactement 14 jours**, envoie les emails, et enregistre pour éviter les doublons.

### Déclenchement

- **POST** avec body JSON : `{ "session_id": "<uuid>", "app_url": "https://..." }` → mode manuel  
- **POST** sans `session_id` (body `{}`) → mode cron (utilisé par pg_cron tous les jours)

`app_url` est optionnel.

### Variables d’environnement (Secrets Supabase)

À configurer dans le dashboard Supabase (Edge Functions → Secrets) ou via CLI :

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `APP_URL` | Recommandé | URL de l’application (ex. `https://votre-app.vercel.app`) pour construire le lien de connexion dans l’email |
| `RESEND_API_KEY` | Pour l’envoi | Clé API Resend pour envoyer les emails. Sans cette clé, la fonction répond toujours 200 mais n’envoie aucun email |
| `RESEND_FROM` | Optionnel | Adresse d’envoi (ex. `SF Formation <noreply@votre-domaine.com>`) |

### Déploiement

```bash
# Depuis la racine du projet
supabase functions deploy send-satisfaction-survey
```

Puis configurer les secrets :

```bash
supabase secrets set APP_URL=https://votre-app.vercel.app
supabase secrets set RESEND_API_KEY=re_xxxx
supabase secrets set RESEND_FROM="SF Formation <noreply@votre-domaine.com>"
```

### Cron automatique (2 semaines après la formation)

Un cron **Supabase pg_cron** appelle la fonction tous les jours à 08:00 UTC. Voir `supabase/migration_cron_enquete_froid.sql` et les prérequis (extensions pg_cron, pg_net, secrets Vault).

### Appel depuis l’app

- **Depuis Next.js** : appeler l’URL de la fonction avec `Authorization: Bearer <SUPABASE_ANON_KEY>`, body `{}` (mode cron) ou `{ "session_id": "..." }` (mode manuel).

### Flux côté stagiaire

1. Le stagiaire reçoit l’email avec le lien vers `APP_URL/stagiaire/login`.
2. Il se connecte avec son identifiant (username ou email) et son mot de passe.
3. Dans son espace, il peut remplir l’enquête de satisfaction (étape déjà existante, déclenchée par le formateur ou accessible à froid si vous ajoutez une entrée dédiée « Enquête de satisfaction » dans l’espace stagiaire).

Pour permettre un accès direct à l’enquête sans repasser par le déclenchement en session, vous pouvez ajouter une page ou un lien « Enquête de satisfaction » dans le dashboard stagiaire qui affiche le formulaire d’enquête pour les sessions auxquelles le stagiaire est inscrit et où l’enquête n’a pas encore été remplie.
