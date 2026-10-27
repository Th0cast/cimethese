// GET /api/tombes : la liste publique des tombes validées, avec leurs bougies.
import { magasin, json, erreur, toutLire, versPublic, bougiesParTombe } from "../../lib/commun.mjs";

export default async (req) => {
  if (req.method !== "GET") return erreur("Méthode non autorisée.", 405);

  const [tombes, comptes] = await Promise.all([toutLire(magasin("tombes")), bougiesParTombe()]);
  const liste = tombes
    .map((t) => versPublic(t, comptes[t.id] || 0))
    .sort((a, b) => (b.publieLe || "").localeCompare(a.publieLe || ""));

  return json({ tombes: liste });
};

export const config = { path: "/api/tombes" };
