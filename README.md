# Cimethèse

Requiem pour les thèses parties trop tôt : une contre-archive des thèses interrompues en droit et en criminologie.

## Ce qu'il y a dedans

- `site/` : les pages publiques (l'allée, le formulaire de dépôt, À propos & vie privée) et la page de modération `/admin`.
- `netlify/functions/` : le petit serveur (tombes, bougies, dépôts, modération), qui tourne sur Netlify.
- `lib/commun.mjs` : réglages partagés (limites de caractères, disciplines...).
- `outils/serveur-local.mjs` : serveur de test pour essayer le site sur son ordinateur.

Les données (dépôts, tombes, bougies) sont stockées dans Netlify Blobs, rattaché au site Netlify. Elles ne sont pas dans ce dépôt.

## Réglages à faire une fois sur Netlify

1. **Variable `ADMIN_PASSWORD`** (Site configuration > Environment variables) : le mot de passe de la page `/admin`. Long et unique.
2. **Notifications de nouveaux dépôts** : Forms > activer la détection des formulaires, puis Form notifications > Email notification sur le formulaire `nouveau-depot`. Le message ne contient aucune donnée du dépôt, il signale seulement qu'un dépôt attend en modération.

## Changer l'adresse de contact

Dans `site/commun.js`, ligne `contact:`.

## Tester en local

```
npm install
ADMIN_PASSWORD=essai npm run dev
```

puis ouvrir http://localhost:8888.
