// POST /api/depot : recevoir un témoignage. Rien n'est publié avant validation.
import {
  magasin, json, erreur, propre, nouvelId, hacher, nomAffiche,
  LIMITES, DISCIPLINES, NOMMAGES, ANNEE_MIN, anneeMax,
} from "../../lib/commun.mjs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEPOTS_PAR_HEURE = 5;

export default async (req, context) => {
  if (req.method !== "POST") return erreur("Méthode non autorisée.", 405);

  let c;
  try {
    c = await req.json();
  } catch {
    return erreur("Requête illisible.");
  }

  // Piège à robots : un champ invisible que seuls les robots remplissent,
  // et un formulaire envoyé trop vite pour avoir été lu.
  if (c.site || (Number(c.ouvertDepuis) || 0) < 4000) {
    return json({ ok: true }); // on ne signale rien au robot
  }

  const titre = propre(c.titre, LIMITES.titre);
  const epitaphe = propre(c.epitaphe, LIMITES.epitaphe);
  const debut = parseInt(c.debut, 10);
  const fin = parseInt(c.fin, 10);
  const discipline = DISCIPLINES.includes(c.discipline) ? c.discipline : null;
  const autreDiscipline = propre(c.autreDiscipline, LIMITES.autreDiscipline);
  const nommage = NOMMAGES.includes(c.nommage) ? c.nommage : null;
  const nom = nomAffiche(nommage, c.nom);
  const contact = propre(c.contact, LIMITES.contact).toLowerCase();
  const mot = typeof c.mot === "string" ? c.mot.trim().slice(0, LIMITES.mot) : "";

  const manque = [];
  if (titre.length < 3) manque.push("le titre de la thèse");
  if (epitaphe.length < 3) manque.push("l'épitaphe");
  if (!(debut >= ANNEE_MIN && debut <= anneeMax())) manque.push("l'année de début");
  if (!(fin >= ANNEE_MIN && fin <= anneeMax())) manque.push("l'année d'arrêt");
  if (debut && fin && fin < debut) manque.push("des années cohérentes");
  if (!discipline) manque.push("la discipline");
  if (discipline === "Autre" && !autreDiscipline) manque.push("la discipline précise");
  if (!nommage) manque.push("le choix de nommage");
  if (nommage && nommage !== "anonyme" && !nom) manque.push("le nom à afficher");
  if (!EMAIL.test(contact)) manque.push("une adresse de contact valide");
  if (c.consentPublication !== true || c.consentDonnees !== true || c.consentAuteur !== true)
    manque.push("les trois consentements");
  if (manque.length) return erreur(`Il manque ${manque.join(", ")}.`, 422);

  // Limite de dépôts par connexion et par heure, sans conserver l'adresse IP.
  const heure = new Date().toISOString().slice(0, 13);
  const cle = `${heure}/${hacher(`${context?.ip || "?"}|${heure}`)}`;
  const limites = magasin("limites");
  const deja = Number(await limites.get(cle, { type: "json" }).catch(() => 0)) || 0;
  if (deja >= DEPOTS_PAR_HEURE)
    return erreur("Trop de dépôts depuis cette connexion. Réessayez dans une heure.", 429);
  await limites.setJSON(cle, deja + 1);

  const id = nouvelId();
  await magasin("depots").setJSON(id, {
    id,
    statut: "attente",
    recuLe: new Date().toISOString(),
    titre,
    epitaphe,
    debut,
    fin,
    discipline: discipline === "Autre" ? autreDiscipline : discipline,
    nommage,
    nom,
    contact,
    mot,
  });

  return json({ ok: true }, 201);
};

export const config = { path: "/api/depot" };
