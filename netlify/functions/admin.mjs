// POST /api/admin : modération, protégée par le mot de passe ADMIN_PASSWORD
// défini dans les réglages Netlify (jamais écrit dans le code).
import {
  magasin, json, erreur, propre, toutLire, nomAffiche, memeSecret, pause,
  bougiesParTombe, effacerBougies,
  LIMITES, NOMMAGES, ANNEE_MIN, anneeMax,
} from "../../lib/commun.mjs";

const secretAttendu = () =>
  (globalThis.Netlify?.env?.get?.("ADMIN_PASSWORD") ?? process.env.ADMIN_PASSWORD) || "";

// Champs modifiables par la modération avant ou après publication.
const appliquerModifs = (base, m = {}) => {
  const out = { ...base };
  if (typeof m.titre === "string") out.titre = propre(m.titre, LIMITES.titre) || out.titre;
  if (typeof m.epitaphe === "string") out.epitaphe = propre(m.epitaphe, LIMITES.epitaphe) || out.epitaphe;
  if (m.debut !== undefined) {
    const d = parseInt(m.debut, 10);
    if (d >= ANNEE_MIN && d <= anneeMax()) out.debut = d;
  }
  if (m.fin !== undefined) {
    const f = parseInt(m.fin, 10);
    if (f >= ANNEE_MIN && f <= anneeMax()) out.fin = f;
  }
  if (typeof m.discipline === "string") out.discipline = propre(m.discipline, LIMITES.autreDiscipline) || out.discipline;
  if (NOMMAGES.includes(m.nommage)) out.nommage = m.nommage;
  if (m.nom !== undefined || m.nommage) out.nom = nomAffiche(out.nommage, m.nom ?? out.nom);
  return out;
};

const tombeDepuis = (d, publieLe) => ({
  id: d.id,
  titre: d.titre,
  epitaphe: d.epitaphe,
  debut: d.debut,
  fin: d.fin,
  discipline: d.discipline,
  nom: d.nommage === "anonyme" ? null : d.nom,
  publieLe,
});

export default async (req) => {
  if (req.method !== "POST") return erreur("Méthode non autorisée.", 405);

  const attendu = secretAttendu();
  if (!attendu) return erreur("Le mot de passe d'administration n'est pas encore configuré sur Netlify.", 503);

  const fourni = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!fourni || !memeSecret(fourni, attendu)) {
    await pause(800); // freine les essais à répétition
    return erreur("Mot de passe incorrect.", 401);
  }

  let c;
  try {
    c = await req.json();
  } catch {
    return erreur("Requête illisible.");
  }

  const depots = magasin("depots");
  const tombes = magasin("tombes");
  const id = typeof c.id === "string" ? c.id : "";

  switch (c.action) {
    case "liste": {
      const [ds, parId] = await Promise.all([toutLire(depots), bougiesParTombe()]);
      ds.sort((a, b) => (b.recuLe || "").localeCompare(a.recuLe || ""));
      // Ménage des compteurs anti-abus des heures passées.
      nettoyerLimites().catch(() => {});
      return json({
        attente: ds.filter((d) => d.statut === "attente"),
        publiees: ds
          .filter((d) => d.statut === "publie")
          .map((d) => ({ ...d, bougies: parId[d.id] || 0 })),
      });
    }

    case "publier": {
      const d = await depots.get(id, { type: "json" });
      if (!d) return erreur("Dépôt introuvable.", 404);
      const maj = appliquerModifs(d, c.modifs);
      const publieLe = d.publieLe || new Date().toISOString();
      await tombes.setJSON(id, tombeDepuis(maj, publieLe));
      await depots.setJSON(id, { ...maj, statut: "publie", publieLe });
      return json({ ok: true });
    }

    case "modifier": {
      const d = await depots.get(id, { type: "json" });
      if (!d) return erreur("Dépôt introuvable.", 404);
      const maj = appliquerModifs(d, c.modifs);
      await depots.setJSON(id, maj);
      if (maj.statut === "publie") await tombes.setJSON(id, tombeDepuis(maj, maj.publieLe));
      return json({ ok: true });
    }

    case "depublier": {
      const d = await depots.get(id, { type: "json" });
      if (!d) return erreur("Dépôt introuvable.", 404);
      await tombes.delete(id);
      await depots.setJSON(id, { ...d, statut: "attente" });
      return json({ ok: true });
    }

    case "supprimer": {
      // Refus d'un dépôt ou droit de retrait : tout est effacé, y compris le contact.
      await Promise.all([depots.delete(id), tombes.delete(id), effacerBougies(id)]);
      return json({ ok: true });
    }

    default:
      return erreur("Action inconnue.");
  }
};

async function nettoyerLimites() {
  const limites = magasin("limites");
  const heure = new Date().toISOString().slice(0, 13);
  const { blobs } = await limites.list();
  await Promise.all(
    blobs.filter((b) => !b.key.startsWith(heure)).map((b) => limites.delete(b.key))
  );
}

export const config = { path: "/api/admin" };
