// POST /api/bougie
//   { id, sens: 1 }          : allumer une bougie -> renvoie { cle, bougies }
//   { id, sens: -1, cle }    : souffler SA bougie (la clé reçue à l'allumage)
// Chaque bougie est une entrée distincte : deux personnes qui allument en même
// temps ne peuvent jamais s'écraser l'une l'autre.
import { magasin, json, erreur, nouvelId } from "../../lib/commun.mjs";

export const compterBougies = async (bougies, id) => {
  const { blobs } = await bougies.list({ prefix: `${id}/` });
  return blobs.length;
};

export default async (req) => {
  if (req.method !== "POST") return erreur("Méthode non autorisée.", 405);

  let corps;
  try {
    corps = await req.json();
  } catch {
    return erreur("Requête illisible.");
  }
  const id = typeof corps?.id === "string" ? corps.id.slice(0, 80) : "";
  if (!id || id.includes("/")) return erreur("Tombe inconnue.", 404);

  const existe = await magasin("tombes").getMetadata(id);
  if (!existe) return erreur("Tombe inconnue.", 404);

  const bougies = magasin("bougies");

  if (corps.sens === -1) {
    const cle = typeof corps.cle === "string" ? corps.cle : "";
    if (cle.startsWith(`${id}/`)) await bougies.delete(cle);
    return json({ id, bougies: await compterBougies(bougies, id) });
  }

  const cle = `${id}/${nouvelId()}`;
  await bougies.set(cle, new Date().toISOString());
  return json({ id, cle, bougies: await compterBougies(bougies, id) });
};

export const config = { path: "/api/bougie" };
