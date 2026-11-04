/* PARTIS — jezgro izrade sajta. Koristi ga i build/build.mjs (Netlify) i upravljanje.html (program na računaru). */
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory();
  else root.PARTISCORE=factory();
})(typeof self!=="undefined"?self:this,function(){
  const ord=o=>(typeof o.order==="number"?o.order:1e9);
  const byOrder=(a,b)=>ord(a)-ord(b)||String(a.title).localeCompare(String(b.title),"sr");
  const live=arr=>arr.filter(o=>o.in_stock!==false).sort(byOrder);
  const img=s=>(s?String(s).replace(/^\/+/,""):undefined);
  const num=v=>(v===null||v===undefined||v===""||isNaN(Number(v))?null:Number(v));
  const txt=(v,d="")=>(v===undefined||v===null||String(v).trim()===""?d:String(v).trim());
  const strip=o=>JSON.parse(JSON.stringify(o));
  const base=f=>f.replace(/^.*\//,"").replace(/\.json$/,"");
  const j=JSON.stringify;

  /* inp: {creva,hema,artikli:[{file,data}], categories:{id:naziv}, imgFiles:[imena iz static/assets/img], uploadFiles:[imena iz uploads]} */
  const HIDE={
    pneumatika:{cats:["pneu","mesing","spojnice"],files:["pneumatika.html","pneumatski-alat-i-nastavci.html","ojacanja-creva.html","spojnice-pneumatike.html"]},
    hema:{sprays:1,files:["hema-aerosol.html"]},
    creva:{hoses:1,cats:["crevo"],files:["armirana-creva.html"]},
    traktorski:{cats:["traktor","gotova"],files:["traktorski-program.html","traktorska-roba.html","gotova-creva.html"]},
    mazalice:{cats:["mazalice"],files:["nastavci-mazalica.html"]}
  };
  const POC_DEF={
    seo_naslov:"PARTIS Niš — pneumatika, HEMA aerosol, creva i traktorski program",
    seo_opis:"PARTIS, trgovinska radnja u Nišu: pneumatski alat i spojnice, ojačanja creva, HEMA aerosol sprejevi, armirana gumena creva, traktorska roba i nastavci mazalica. Bulevar Nemanjića 103, tel. 018-553-800.",
    tag:"Pneumatika · HEMA Aerosol · Creva · Traktorski program",
    naslov:"Pneumatika, *HEMA aerosol*, creva i traktorski program",
    opis:"Pneumatski alat i nastavci, ojačanja creva i spojnice pneumatike, HEMA aerosol program (podmazivanje, zaštita, čišćenje, uklanjanje rđe i hitne popravke), armirana gumena creva i prateća oprema, traktorski program (traktorska roba i gotova creva) i nastavci mazalica — za vozila, mašine i mehanizaciju.",
    kategorije:"Kategorije",
    info1_naslov:"Cene i porudžbine",
    info1_tekst:"Sve cene su bez PDV-a. Za artikle sa oznakom „Cena na upit“ pozovite 018-553-800 / 065-2553-800 ili pišite na WhatsApp.",
    info2_naslov:"Sečenje creva po meri",
    info2_tekst:"Armirana gumena creva prodajemo u koturu od 50 m ili sečemo po potrebi.",
    opisi:{pneumatika:"Pneumatski alat i nastavci, ojačanja creva i spojnice pneumatike.",hema:"Podmazivanje, zaštita, čišćenje, uklanjanje rđe i hitne popravke.",creva:"Creva za gorivo, vodu, vazduh i ulje — kotur 50 m, sečenje po potrebi.",traktorski:"Traktorska roba (okca, šuplji vijci) i gotova creva sa montiranim nastavcima.",mazalice:"Nastavci za mazalice pod uglom od 45°, 90° i 180°."}
  };
  function pocMerge(u){
    u=u||{};const o={...POC_DEF,opisi:{...POC_DEF.opisi}};
    Object.keys(POC_DEF).forEach(k=>{if(k==="opisi")return;if(typeof u[k]==="string"&&u[k].trim())o[k]=u[k].trim();});
    if(u.opisi)Object.keys(POC_DEF.opisi).forEach(k=>{if(typeof u.opisi[k]==="string"&&u.opisi[k].trim())o.opisi[k]=u.opisi[k].trim();});
    return o;
  }
  function pocFill(s,P){
    const e=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const link=t=>e(t).replace(/018-553-800/g,'<a href="tel:+38118553800">018-553-800</a>').replace(/065-2553-800/g,'<a href="tel:+381652553800">065-2553-800</a>').replace(/WhatsApp/g,'<a href="https://wa.me/381652553800" target="_blank" rel="noopener">WhatsApp</a>');
    const h1=e(P.naslov).replace(/\*(.+?)\*/g,"<em>$1</em>");
    const M={SEOT:e(P.seo_naslov),SEOD:e(P.seo_opis),TAG:e(P.tag),H1:h1,P:e(P.opis),KAT:e(P.kategorije),I1N:e(P.info1_naslov),I1T:link(P.info1_tekst),I2N:e(P.info2_naslov),I2T:link(P.info2_tekst)};
    return s.replace(/\{\{POC_(\w+)\}\}/g,(_,k)=>M[k]!==undefined?M[k]:"");
  }
  function model(inp){
    const warn=[];
    const KATS=(inp.custom||[]).filter(k=>k&&k.id&&k.naziv).map(k=>({id:String(k.id),naziv:String(k.naziv),opis:String(k.opis||""),file:"kategorija-"+k.id+".html"}));
    const CATNAME={...inp.categories};const NAZ=inp.nazivi||{};Object.keys(CATNAME).forEach(k=>{if(NAZ[k]&&String(NAZ[k]).trim())CATNAME[k]=String(NAZ[k]).trim();});KATS.forEach(k=>{CATNAME[k.id]=k.naziv;});
    const hoses=live(inp.creva.map(e=>({...e.data,_file:e.file}))).map(h=>strip({
      kind:"crevo",id:base(h._file),name:h.title,type:txt(h.hose_type),img:img(h.image),short:txt(h.card_text),temp:txt(h.temp,"—"),
      material:txt(h.material,"—"),reinforce:txt(h.reinforce,"—"),cover:txt(h.cover,"—"),standard:txt(h.standard,"—"),use:txt(h.use,"—"),
      variants:(h.variants||[]).filter(v=>v.in_stock!==false).map(v=>({dim:txt(v.dim),wp:txt(v.wp,"—"),burst:txt(v.burst,"—"),flex:txt(v.flex,"—"),weight:txt(v.weight,"—"),price:num(v.price)??0})),_a:h.aliases
    })).filter(h=>h.variants.length);
    const sprays=live(inp.hema.map(e=>({...e.data,_file:e.file}))).map(s=>strip({
      kind:"sprej",id:base(s._file),name:s.title,eng:txt(s.eng),img:img(s.image),opts:(s.packs||[]).filter(o=>o.in_stock!==false).map(o=>({pack:txt(o.pack),price:num(o.price)??0})),
      short:txt(s.card_text),desc:txt(s.description,"Opis u pripremi."),use:txt(s.use,"—"),_a:s.aliases
    })).filter(s=>s.opts.length);
    const items=live(inp.artikli.map(e=>({...e.data,_file:e.file}))).filter(a=>{const all=(a.variants||[]).filter(v=>txt(v.label));return !all.length||all.some(v=>v.in_stock!==false);}).map(a=>{
      const main=img(a.image),vs=(a.variants||[]).filter(v=>txt(v.label)&&v.in_stock!==false);
      const extra=(Array.isArray(a.categories)?a.categories:[]).map(String).filter(c=>c&&c!==a.category&&CATNAME[c]);
      const o={cat:a.category,cats:extra.length?extra:undefined,catName:CATNAME[a.category]||a.category,name:a.title,img:main,price:vs.length?null:num(a.price),desc:txt(a.description,"Opis u pripremi."),
        spec:txt(a.spec)||null,short:txt(a.card_text)||undefined,colLabel:txt(a.col_label)||undefined,specLabel:txt(a.spec_label)||undefined,_a:a.aliases};
      if(vs.length){o.promo=a.promo!==false;o.gal=vs.map(v=>({grp:txt(v.group)||undefined,label:txt(v.label),price:num(v.price),note:txt(v.note)||undefined,img:img(v.image)||main}));}
      if(!CATNAME[a.category])warn.push(`Artikal "${a.title}": nepoznata kategorija "${a.category}"`);
      return strip(o);
    });
    const HF=[],HS=(inp.hidden||[]).filter(g=>HIDE[g]);
    HS.forEach(g=>HF.push(...HIDE[g].files));
    const hcats=new Set(HS.flatMap(g=>HIDE[g].cats||[]));
    if(HS.some(g=>HIDE[g].hoses))hoses.length=0;
    if(HS.some(g=>HIDE[g].sprays))sprays.length=0;
    for(let i=items.length-1;i>=0;i--){const it=items[i];if(!hcats.has(it.cat))continue;
      const vis=(it.cats||[]).filter(c=>!hcats.has(c));
      if(!vis.length){items.splice(i,1);continue;}
      it.cat=vis[0];it.catName=CATNAME[it.cat]||it.cat;it.cats=vis.slice(1).length?vis.slice(1):undefined;if(!it.cats)delete it.cats;}
    const IMG={};
    (inp.imgFiles||[]).forEach(f=>{IMG[f.replace(/\.[^.]+$/,"")]="assets/img/"+f;});
    (inp.uploadFiles||[]).forEach(f=>{IMG["uploads/"+f.replace(/\.[^.]+$/,"")]="assets/img/uploads/"+f;});
    const CATS=Object.entries(CATNAME).filter(([id])=>id!=="crevo").map(([id,title])=>({id,title}));
    const aliases={};
    [...hoses,...sprays,...items].forEach(x=>{if(x._a&&x._a.length)aliases[x.name]=x._a.map(String).filter(Boolean);delete x._a;});
    [[hoses,"h"],[sprays,"s"],[items,"i"]].forEach(([arr,k])=>arr.forEach((p,i)=>{p._k=k+i;}));
    return {D:{HOSES:hoses,SPRAYS:sprays,ITEMS:items,CATS,IMG,KATS,HIDDENFILES:HF,NAZIVI:NAZ,POC:pocMerge(inp.pocetna)},aliases,warn};
  }
  function dataFiles(m,cfg){
    const {D,aliases}=m;cfg=cfg||{};
    return {
      "assets/config.js":`window.PARTIS_CFG=${j({supabaseUrl:(cfg.supabase_url||"").trim(),supabaseKey:(cfg.supabase_key||"").trim()})};\n`,
      "assets/data.js":`/* Napravljeno automatski iz content/ — ne menjati ručno. */\nconst IMG=${j(D.IMG)};\nconst HOSES=${j(D.HOSES)};\nconst SPRAYS=${j(D.SPRAYS)};\nconst ITEMS=${j(D.ITEMS)};\nconst CATS=${j(D.CATS)};\nconst KATS=${j(D.KATS||[])};\nconst HIDDENFILES=${j(D.HIDDENFILES||[])};\nconst NAZIVI=${j(D.NAZIVI||{})};\nconst POC=${j(D.POC||{})};\nconst REG={};\n[HOSES,SPRAYS,ITEMS].forEach(a=>a.forEach(p=>{REG[p._k]=p}));\n`,
      "assets/aliases.js":`/* Napravljeno automatski — alternativni nazivi artikala za pretragu. */\nconst ALIASES=${j(aliases)};\n`
    };
  }
  function missingImages(m,exists){
    const w=[];
    [...m.D.HOSES,...m.D.SPRAYS,...m.D.ITEMS].forEach(p=>{
      new Set([p.img,...(p.gal||[]).map(g=>g.img)].filter(Boolean)).forEach(f=>{if(!exists(f))w.push(`Artikal "${p.name}": slika ${f} ne postoji`);});
    });
    return w;
  }
  function renderPage(tpl,D,site,PARTIS){
    const pg=JSON.parse(/window\.PAGE=(\{.*?\});/.exec(tpl)[1]),names=[];
    tpl=tpl.indexOf("{{POC_")>=0?pocFill(tpl,D.POC||pocMerge()):tpl;
    let s=tpl.replace(/<!--GRID:(\w+)-->/g,(_,id)=>{PARTIS.sectionList(D,id).forEach(p=>names.push(p.name));return PARTIS.gridHTML(D,id);});
    s=s.replace("<!--META-->",()=>PARTIS.metaHTML(pg,D)).replace("<!--TILES-->",()=>PARTIS.tilesHTML(D));
    const h1=(/<h1>(.*?)<\/h1>/s.exec(s)||[,pg.id])[1].replace(/<[^>]+>/g,"");
    const ld=names.length?`<script type="application/ld+json">${j({"@context":"https://schema.org","@type":"ItemList",name:h1,numberOfItems:names.length,itemListElement:names.map((n,i)=>({"@type":"ListItem",position:i+1,name:n}))}).replace(/</g,"\\u003c")}</script>`:"";
    s=s.replace("<!--ITEMLIST-->",()=>ld).replace(/\{\{SITE\}\}/g,site);
    s=PARTIS.rename(D,s);
    (D.HIDDENFILES||[]).forEach(f=>{s=s.replace(new RegExp('<a [^>]*href="'+f.replace(/\./g,"\\.")+'"[^>]*>[\\s\\S]*?</a>',"g"),"");});
    const KS=D.KATS||[];
    if(KS.length){
      const eh=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      const tabs=KS.map(k=>`<a href="${k.file}"${pg.id===k.id?' class="on" aria-current="page"':""}>${eh(k.naziv)}</a>`).join("");
      s=s.replace("</div></div></nav>",()=>tabs+"</div></div></nav>");
      s=s.replace(/(<div class="foot-nav">[\s\S]*?)(\n\s*<\/div>)/,(_,a,b)=>a+KS.map(k=>`<a href="${k.file}">${eh(k.naziv)}</a>`).join("")+b);
    }
    return {html:s,noindex:/name="robots" content="noindex/.test(s)};
  }
  /* stranice novih kategorija iz šablona templates/_kategorija.html */
  function katPages(tpl,D,site,PARTIS){
    const eh=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    return (D.KATS||[]).map(k=>{
      const t=tpl.replace(/\{\{KAT_ID\}\}/g,k.id).replace(/\{\{KAT_FILE\}\}/g,k.file).replace(/\{\{KAT_NAZIV\}\}/g,()=>eh(k.naziv)).replace(/\{\{KAT_OPIS\}\}/g,()=>eh(k.opis||k.naziv+" — PARTIS Niš."));
      const r=renderPage(t,D,site,PARTIS);return {file:k.file,html:r.html,noindex:r.noindex};
    });
  }
  function sitemapRobots(pages,site){
    const sm=pages.filter(p=>!p.noindex).sort((a,b)=>(a.file==="index.html"?-1:b.file==="index.html"?1:a.file.localeCompare(b.file)))
      .map(p=>`  <url><loc>${site}/${p.file==="index.html"?"":p.file}</loc><changefreq>weekly</changefreq><priority>${p.file==="index.html"?"1.0":"0.8"}</priority></url>\n`).join("");
    return {
      "sitemap.xml":`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm}</urlset>\n`,
      "robots.txt":`User-agent: *\nAllow: /\nDisallow: /pretraga.html\nDisallow: /admin/\n\nSitemap: ${site}/sitemap.xml\n`
    };
  }
  return {MULTI:true,POC_DEF,pocMerge,HIDE,model,dataFiles,missingImages,renderPage,katPages,sitemapRobots};
});
