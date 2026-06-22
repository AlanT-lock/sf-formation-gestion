/**
 * Convertit un timestamp ISO stocké (UTC / timestamptz) en valeur affichable
 * dans un <input type="datetime-local">, exprimée en heure LOCALE du navigateur.
 *
 * Important : ne pas utiliser `toISOString().slice(0, 16)` ici, car cela renvoie
 * l'heure en UTC alors que l'input datetime-local attend l'heure locale. Cela
 * décalerait l'heure affichée à chaque rechargement (bug de fuseau horaire).
 */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
