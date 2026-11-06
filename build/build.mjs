/* PARTIS — izrada sajta.
   Čita artikle iz content/ i pravi gotov sajt u dist/. Pokreće se automatski na Netlify-ju
   posle svake izmene u editoru (npm run build). */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = (...a) => path.join(ROOT, ...a);
const PARTIS = require(P("static/assets/shared.js"));
const CORE = require(P("build/core.js"));

const SITECFG = JSON.parse(fs.readFileSync(P("site.json"), "utf8"));
const SITE = (SITECFG.domen || "").replace(/\/+$/, "");
const CATNAME = JSON.parse(fs.readFileSync(P("categories.json"), "utf8"));
const KJ = fs.existsSync(P("kategorije.json")) ? JSON.parse(fs.readFileSync(P("kategorije.json"), "utf8")) : [];
const CUSTOM = Array.isArray(KJ) ? KJ : (KJ.nove || []);
const HIDDEN = Array.isArray(KJ) ? [] : (KJ.skrivene || []);
const POCJ = fs.existsSync(P("pocetna.json")) ? JSON.parse(fs.readFileSync(P("pocetna.json"), "utf8")) : {};
const NAZIVI = Array.isArray(KJ) ? {} : (KJ.nazivi || {});
const warn = [];

/* ---------- čitanje sadržaja ---------- */
function readDir(dir) {
  const d = P("content", dir);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter(f => f.endsWith(".json")).map(f => {
    try { return { file: dir + "/" + f, data: JSON.parse(fs.readFileSync(path.join(d, f), "utf8")) }; }
    catch (e) { throw new Error(`Greška u fajlu content/${dir}/${f}: ${e.message}`); }
  });
}
const lsFiles = d => (fs.existsSync(d) ? fs.readdirSync(d).filter(f => fs.statSync(path.join(d, f)).isFile() && !f.startsWith(".")) : []);
const M = CORE.model({
  creva: readDir("creva"), hema: readDir("hema"), artikli: readDir("artikli"), categories: CATNAME, custom: CUSTOM, hidden: HIDDEN, nazivi: NAZIVI, pocetna: POCJ,
  imgFiles: lsFiles(P("static/assets/img")), uploadFiles: lsFiles(P("static/assets/img/uploads"))
});
warn.push(...M.warn);
const D = M.D, hoses = D.HOSES, sprays = D.SPRAYS, items = D.ITEMS;

/* ---------- dist ---------- */
const DIST = P("dist");
fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(P("static"), DIST, { recursive: true });
for (const [f, c] of Object.entries(CORE.dataFiles(M, SITECFG))) fs.writeFileSync(path.join(DIST, f), c);
warn.push(...CORE.missingImages(M, f => fs.existsSync(path.join(DIST, f))));

/* ---------- optimizacija novih slika (samo uploads/) ---------- */
async function optimize() {
  const dir = path.join(DIST, "assets/img/uploads");
  if (!fs.existsSync(dir)) return;
  let sharp;
  try { sharp = require("sharp"); } catch { warn.push("sharp nije instaliran — slike iz uploads/ nisu optimizovane"); return; }
  for (const f of fs.readdirSync(dir)) {
    const fp = path.join(dir, f), ext = path.extname(f).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) continue;
    try {
      let s = sharp(fp).rotate().flatten({ background: "#ffffff" }).resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true });
      s = ext === ".png" ? s.png({ compressionLevel: 9 }) : ext === ".webp" ? s.webp({ quality: 82 }) : s.jpeg({ quality: 84, mozjpeg: true });
      const buf = await s.toBuffer();
      fs.writeFileSync(fp, buf);
    } catch (e) { warn.push(`Slika ${f} nije obrađena: ${e.message}`); }
  }
}
await optimize();

/* ---------- stranice ---------- */
const tplDir = P("templates");
const pages = [];
for (const f of fs.readdirSync(tplDir).filter(f => f.endsWith(".html") && !f.startsWith("_") && !(D.HIDDENFILES || []).includes(f))) {
  const r = CORE.renderPage(fs.readFileSync(path.join(tplDir, f), "utf8"), D, SITE, PARTIS);
  fs.writeFileSync(path.join(DIST, f), r.html);
  pages.push({ file: f, noindex: r.noindex });
}
if (D.KATS && D.KATS.length) {
  for (const k of CORE.katPages(fs.readFileSync(path.join(tplDir, "_kategorija.html"), "utf8"), D, SITE, PARTIS)) {
    fs.writeFileSync(path.join(DIST, k.file), k.html);
    pages.push({ file: k.file, noindex: k.noindex });
  }
}
for (const k of CORE.productPages(fs.readFileSync(path.join(tplDir, "_proizvod.html"), "utf8"), D, SITE, PARTIS)) {
  fs.writeFileSync(path.join(DIST, k.file), k.html);
  pages.push({ file: k.file, noindex: false });
}
for (const [f, c] of Object.entries(CORE.sitemapRobots(pages, SITE))) fs.writeFileSync(path.join(DIST, f), c);

const total = PARTIS.totalProducts(D);
console.log(`PARTIS izrada: ${total} proizvoda (${items.length} artikala, ${hoses.length} creva, ${sprays.length} HEMA), ${pages.length} stranica -> dist/`);
if (SITE.includes("VASDOMEN")) console.log("NAPOMENA: u fajlu site.json još nije upisan pravi domen.");
warn.forEach(w => console.log("UPOZORENJE:", w));
