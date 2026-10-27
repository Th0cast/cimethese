// Serveur de test local : sert le dossier site/ et branche les fonctions /api/*
// sur un stockage local. N'est pas déployé sur Netlify.
//   ADMIN_PASSWORD=essai node outils/serveur-local.mjs
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { BlobsServer } from "@netlify/blobs/server";
import { setEnvironmentContext } from "@netlify/blobs";

const racine = fileURLToPath(new URL("..", import.meta.url));
const PORT = Number(process.env.PORT) || 8888;

const blobs = new BlobsServer({ directory: join(racine, ".donnees-locales"), token: "local" });
const { port: portBlobs } = await blobs.start();
setEnvironmentContext({
  siteID: "local",
  token: "local",
  edgeURL: `http://localhost:${portBlobs}`,
  uncachedEdgeURL: `http://localhost:${portBlobs}`,
});

const routes = {
  "/api/tombes": "tombes.mjs",
  "/api/bougie": "bougie.mjs",
  "/api/depot": "depot.mjs",
  "/api/admin": "admin.mjs",
};
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png",
  ".ico": "image/x-icon", ".txt": "text/plain", ".json": "application/json",
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (routes[url.pathname]) {
      const mod = await import(join(racine, "netlify/functions", routes[url.pathname]));
      const corps = ["GET", "HEAD"].includes(req.method) ? undefined : await lireCorps(req);
      const requete = new Request(url, { method: req.method, headers: req.headers, body: corps });
      const reponse = await mod.default(requete, { ip: req.socket.remoteAddress });
      res.writeHead(reponse.status, Object.fromEntries(reponse.headers));
      res.end(Buffer.from(await reponse.arrayBuffer()));
      return;
    }
    if (req.method === "POST" && url.pathname === "/") {
      res.writeHead(200).end("ok"); // simule Netlify Forms
      return;
    }
    let chemin = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
    if (chemin.endsWith("/")) chemin += "index.html";
    if (!extname(chemin)) chemin += ".html";
    const fichier = join(racine, "site", chemin);
    const contenu = await readFile(fichier);
    res.writeHead(200, { "content-type": types[extname(fichier)] || "application/octet-stream" });
    res.end(contenu);
  } catch (e) {
    if (e.code === "ENOENT") {
      res.writeHead(404, { "content-type": "text/plain" }).end("Introuvable");
    } else {
      console.error(e);
      res.writeHead(500, { "content-type": "text/plain" }).end("Erreur : " + e.message);
    }
  }
}).listen(PORT, () => console.log(`Cimethèse en local : http://localhost:${PORT}`));

function lireCorps(req) {
  return new Promise((ok, ko) => {
    const morceaux = [];
    req.on("data", (m) => morceaux.push(m));
    req.on("end", () => ok(Buffer.concat(morceaux)));
    req.on("error", ko);
  });
}
