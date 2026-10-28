// Cimethèse - réglages et outils partagés par les pages.

// Adresse de contact affichée sur le site (retraits, vie privée, questions).
window.CIMETHESE = {
  contact: "contact@cimethese.com",
};

// Fabrique la stèle d'une tombe (utilisée par l'allée, l'aperçu et l'admin).
window.fabriquerStele = function (t, options = {}) {
  const el = (balise, classe, texte) => {
    const n = document.createElement(balise);
    if (classe) n.className = classe;
    if (texte !== undefined) n.textContent = texte;
    return n;
  };

  const article = el("article", "grave");
  if (t.id) article.dataset.id = t.id;

  const stele = el("div", "stele");
  stele.append(el(options.niveauTitre || "h2", "title", t.titre || "Titre de la thèse"));
  stele.append(el("p", "epitaph", t.epitaphe ? `« ${t.epitaphe} »` : "« … »"));

  const annees = el("div", "years");
  annees.setAttribute(
    "aria-label",
    `Recherche commencée en ${t.debut || "?"}, interrompue en ${t.fin || "?"}`
  );
  const ne = el("span", "born", "✳"); ne.setAttribute("aria-hidden", "true");
  const mort = el("span", "died", "†"); mort.setAttribute("aria-hidden", "true");
  annees.append(ne, ` ${t.debut || "····"} `, mort, " ", el("span", "end", String(t.fin || "····")));
  stele.append(annees);

  const inscr = el("div", "inscr");
  inscr.append(el("span", null, t.discipline || "Discipline"));
  inscr.append(el("span", "dot", "·"));
  inscr.append(el("span", null, t.nom || "Anonyme"));
  stele.append(inscr);
  article.append(stele);

  if (options.bougie) {
    const pied = el("div", "foot");
    const btn = el("button", "btn candle");
    btn.type = "button";
    const flamme = el("span", "flame", "🕯️"); flamme.setAttribute("aria-hidden", "true");
    btn.append(flamme, " ", el("span", "ctxt", "Allumer une bougie"), " ", el("span", "cnum", String(t.bougies || 0)));
    pied.append(btn);
    article.append(pied);
  }
  return article;
};

// Insère l'adresse de contact partout où la page la demande.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-contact]").forEach((a) => {
    a.textContent = window.CIMETHESE.contact;
    a.href = `mailto:${window.CIMETHESE.contact}`;
  });
});

// Petit stockage local tolérant (navigation privée, cookies bloqués...).
window.memoire = {
  lire(cle, defaut) {
    try { return JSON.parse(localStorage.getItem(cle)) ?? defaut; } catch { return defaut; }
  },
  ecrire(cle, valeur) {
    try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch {}
  },
};
