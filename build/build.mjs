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
/* ---------- razgranate adrese: /proizvodi/<kategorija>/<proizvod> ---------- */
/* kratki SEO tekst + pitanja ispod proizvoda na kategorijama (content/seo-tekstovi.json) */
{
  const sp = P("content/seo-tekstovi.json");
  const SEO = fs.existsSync(sp) ? JSON.parse(fs.readFileSync(sp, "utf8")) : {};
  const bp = P("content/proizvodjaci.json");
  const BR = fs.existsSync(bp) ? JSON.parse(fs.readFileSync(bp, "utf8")) : {};
  const eh = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const pg of pages) {
    const fp = path.join(DIST, pg.file);
    let h = fs.readFileSync(fp, "utf8");
    const m = h.match(/<script>window\.PAGE=\{"id": "([a-z0-9]+)"/);
    const e = m && SEO[m[1]];
    const bl = m && BR.stranice && BR.stranice[m[1]];
    const brStrip = bl ? `<section class="brend-strip"><h2>Proizvođači</h2><ul>` + bl.map(k => `<li><img src="assets/img/brend/${k}.png" alt="${eh(BR.brendovi[k].naziv)}" height="35" loading="lazy"><span>${eh(BR.brendovi[k].opis)}</span></li>`).join("") + `</ul></section>\n` : "";
    if (!e && !brStrip) continue;
    const blk = brStrip + (!e ? "" : `<section class="seo-txt"><p>${eh(e.t)}</p>` + (e.q || []).map(q => `<details><summary>${eh(q[0])}</summary><p>${eh(q[1])}</p></details>`).join("") + `</section>\n`);
    h = h.replace('<script>window.PAGE=', () => blk + '<script>window.PAGE=');
    fs.writeFileSync(fp, h);
  }
}
const MAP = CORE.pathMap(D);
const outPages = [];
for (const pg of pages) {
  const old = path.join(DIST, pg.file);
  const html = CORE.rewriteUrls(fs.readFileSync(old, "utf8"), MAP, SITE).replace("<head>", '<head>\n<base href="/">');
  const nf = MAP[pg.file] !== undefined ? CORE.fileOf(MAP[pg.file]) : pg.file;
  if (nf !== pg.file) fs.rmSync(old);
  fs.mkdirSync(path.dirname(path.join(DIST, nf)), { recursive: true });
  fs.writeFileSync(path.join(DIST, nf), html);
  outPages.push({ file: nf, noindex: pg.noindex });
}
for (const f of ["data.js", "app.js", "shared.js", "cart.js", "account.js"]) {
  const fp = path.join(DIST, "assets", f);
  if (fs.existsSync(fp)) fs.writeFileSync(fp, CORE.rewriteUrls(fs.readFileSync(fp, "utf8"), MAP, ""));
}
{
  const hp = path.join(DIST, ".htaccess");
  fs.writeFileSync(hp, fs.readFileSync(hp, "utf8").replace("# {{PREUSMERAVANJA}}", "# stare adrese -> nove razgranate (napravljeno automatski)\n" + CORE.redirectRules(MAP, SITE)));
}
pages.length = 0; pages.push(...outPages);
for (const [f, c] of Object.entries(CORE.sitemapRobots(pages, SITE))) fs.writeFileSync(path.join(DIST, f), c);

/* verzija fajlova (da pregledač nikad ne koristi staru keširanu stranicu/stil) */
const VER = Date.now().toString(36);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
for (const fp of walk(DIST).filter(f => f.endsWith(".html"))) {
  fs.writeFileSync(fp, fs.readFileSync(fp, "utf8").replace(/(assets\/[a-z0-9-]+\.(?:css|js))(?=["'])/g, `$1?v=${VER}`));
}

// Program za upravljanje dostupan na sajtu (radi preko GitHub-a, bez foldera)
fs.copyFileSync(P("upravljanje.html"), path.join(DIST, "upravljanje.html"));

const total = PARTIS.totalProducts(D);
console.log(`PARTIS izrada: ${total} proizvoda (${items.length} artikala, ${hoses.length} creva, ${sprays.length} HEMA), ${pages.length} stranica -> dist/`);
if (SITE.includes("VASDOMEN")) console.log("NAPOMENA: u fajlu site.json još nije upisan pravi domen.");
warn.forEach(w => console.log("UPOZORENJE:", w));
