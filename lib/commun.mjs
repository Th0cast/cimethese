// Outils partagés par les fonctions serveur de Cimethèse.
import { getStore } from "@netlify/blobs";
import { createHash, timingSafeEqual, randomBytes } from "node:crypto";

// Trois espaces de stockage :
//  - "depots"  : les dépôts reçus (avec l'adresse de contact, jamais publiée)
//  - "tombes"  : les tombes validées, visibles sur le site
//  - "bougies" : le nombre de bougies par tombe
export const magasin = (nom) => getStore({ name: nom, consistency: "strong" });

export const LIMITES = {
  titre: 180,
  epitaphe: 240,
  nom: 60,
  autreDiscipline: 60,
  contact: 120,
  mot: 1000,
};

export const DISCIPLINES = ["Droit", "Criminologie", "Autre"];
export const NOMMAGES = ["nom", "prenom", "initiales", "anonyme"];
export const ANNEE_MIN = 1960;
export const anneeMax = () => new Date().getFullYear();

export const json = (donnees, statut = 200, entetes = {}) =>
  new Response(JSON.stringify(donnees), {
    status: statut,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...entetes,
    },
  });

export const erreur = (message, statut = 400) => json({ erreur: message }, statut);

export const nouvelId = () =>
  `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;

// Nettoie une chaîne : espaces superflus, caractères de contrôle, longueur max.
export const propre = (valeur, max) => {
  if (typeof valeur !== "string") return "";
  return valeur
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
};

export const hacher = (texte) =>
  createHash("sha256").update(String(texte)).digest("hex").slice(0, 24);

// Ce que le site public a le droit de voir d'une tombe.
export const versPublic = (t, bougies = 0) => ({
  id: t.id,
  titre: t.titre,
  epitaphe: t.epitaphe,
  debut: t.debut,
  fin: t.fin,
  discipline: t.discipline,
  nom: t.nom || null,
  bougies,
  publieLe: t.publieLe,
});

// Nom affiché selon le régime choisi par la personne.
export const nomAffiche = (nommage, nom) =>
  nommage === "anonyme" ? null : propre(nom, LIMITES.nom) || null;

// Comparaison de mot de passe à temps constant.
export const memeSecret = (a, b) => {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
};

export const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Lit toutes les entrées d'un magasin (suffisant pour quelques milliers de tombes).
export const toutLire = async (store) => {
  const { blobs } = await store.list();
  const lus = await Promise.all(
    blobs.map((b) => store.get(b.key, { type: "json" }).catch(() => null))
  );
  return lus.filter(Boolean);
};

// Nombre de bougies par tombe : une entrée "idTombe/idBougie" par bougie.
export const bougiesParTombe = async () => {
  const { blobs } = await magasin("bougies").list();
  const comptes = {};
  for (const b of blobs) {
    const id = b.key.split("/")[0];
    comptes[id] = (comptes[id] || 0) + 1;
  }
  return comptes;
};

export const effacerBougies = async (id) => {
  const bougies = magasin("bougies");
  const { blobs } = await bougies.list({ prefix: `${id}/` });
  await Promise.all(blobs.map((b) => bougies.delete(b.key)));
};
