/* Pravi dist/PARTIS-katalog.html (jedan fajl, slike ugrađene). Pokreće se posle build.mjs. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const B = require("./bundle.js");
const sharp = require("sharp");
const rd = f => fs.readFileSync(path.join(DIST, f), "utf8");
const pages = {};
for (const f of fs.readdirSync(DIST).filter(f => f.endsWith(".html"))) pages[f] = rd(f);
const assets = {};
for (const f of ["style.css", "data.js", "aliases.js", "shared.js", "app.js", "cart.js"]) assets[f] = rd("assets/" + f);
const imgs = {};
for (const u of B.collect({ pages, assets })) {
  const p = path.join(DIST, u);
  if (!fs.existsSync(p)) continue;
  const buf = await sharp(p).rotate().resize(560, 560, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#fff" }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
  imgs[u] = "data:image/jpeg;base64," + buf.toString("base64");
}
const html = B.build({ pages, assets, imgs });
fs.writeFileSync(path.join(DIST, "PARTIS-katalog.html"), html);
console.log(`PARTIS-katalog.html: ${(html.length / 1048576).toFixed(1)} MB, ${Object.keys(imgs).length} slika`);
