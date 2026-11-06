/* PARTIS — jezgro izrade sajta. Koristi ga i build/build.mjs i upravljanje.html (program za upravljanje). */
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
    pneumatika:{cats:["pneu","crevapn","mesing","spojnice"],files:["pneumatika.html","pneumatski-alat-i-nastavci.html","creva-pneumatike.html","ojacanja-creva.html","spojnice-pneumatike.html"]},
    hema:{sprays:1,files:["hema-aerosol.html"]},
    creva:{hoses:1,cats:["crevo"],files:["armirana-creva.html"]},
    traktorski:{cats:["traktor","gotova"],files:["traktorski-program.html","traktorska-roba.html","gotova-creva.html"]},
    mazalice:{cats:["mazalice"],files:["nastavci-mazalica.html"]}
  };
  const POC_DEF={
    seo_naslov:"PARTIS Niš — delovi i oprema za vozila, mašine i mehanizaciju",
    seo_opis:"PARTIS Niš, Bulevar Nemanjića 103, lokal 8. Tel. +381 18 553 800, +381 65 2553 800.",
    tag:"Niš · Za vozila, mašine i mehanizaciju",
    naslov:"Sve što je potrebno *vozilu* i mašini",
    opis:"Delovi i oprema za vozila, mašine i mehanizaciju, na jednom mestu. Ako ne nađete šta vam treba, pozovite — rado ćemo potražiti.",
    kategorije:"Kategorije",
    info1_naslov:"Cene i porudžbine",
    info1_tekst:"Sve cene su bez PDV-a. U zagradi je iznos sa PDV-om. Za artikle sa oznakom „Cena na upit“ pozovite +381 18 553 800 / +381 65 2553 800 ili pišite na WhatsApp.",
    info2_naslov:"Sečenje creva po meri",
    info2_tekst:"Armirana gumena creva prodajemo u koturu od 50 m ili sečemo po potrebi.",
    opisi:{pneumatika:"Pneumatski alat i nastavci, ojačanja creva i spojnice pneumatike.",hema:"Podmazivanje, zaštita, čišćenje, uklanjanje rđe i hitne popravke.",creva:"Creva za gorivo, vodu, vazduh i ulje — kotur 50 m, sečenje po potrebi.",traktorski:"Delovi i oprema za traktore i mehanizaciju i gotova creva sa montiranim nastavcima.",mazalice:"Nastavci za mazalice pod uglom od 45°, 90° i 180°."}
  };
  function pocMerge(u){
    u=u||{};const o={...POC_DEF,opisi:{...POC_DEF.opisi}};
    Object.keys(POC_DEF).forEach(k=>{if(k==="opisi")return;if(typeof u[k]==="string"&&u[k].trim())o[k]=u[k].trim();});
    if(u.opisi)Object.keys(POC_DEF.opisi).forEach(k=>{if(typeof u.opisi[k]==="string"&&u.opisi[k].trim())o.opisi[k]=u.opisi[k].trim();});
    return o;
  }
  function pocFill(s,P){
    const e=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const link=t=>e(t).replace(/\+381 18 553 800/g,'<a href="tel:+38118553800">+381 18 553 800</a>').replace(/\+381 65 2553 800/g,'<a href="tel:+381652553800">+381 65 2553 800</a>').replace(/WhatsApp/g,'<a href="https://wa.me/381652553800" target="_blank" rel="noopener">WhatsApp</a>');
    const h1=e(P.naslov).replace(/\*(.+?)\*/g,"<em>$1</em>");
    const M={SEOT:e(P.seo_naslov),SEOD:e(P.seo_opis),TAG:e(P.tag),H1:h1,P:e(P.opis),KAT:e(P.kategorije),I1N:e(P.info1_naslov),I1T:link(P.info1_tekst),I2N:e(P.info2_naslov),I2T:link(P.info2_tekst)};
    return s.replace(/\{\{POC_(\w+)\}\}/g,(_,k)=>M[k]!==undefined?M[k]:"");
  }
  function model(inp){
    const warn=[];
    const slK=t=>String(t).replace(/[čć]/gi,"c").replace(/š/gi,"s").replace(/ž/gi,"z").replace(/đ/gi,"dj").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70);
    const usedK=new Set();
    const KATS=(inp.custom||[]).filter(k=>k&&k.id&&k.naziv).map(k=>{let b="kategorija-"+(slK(k.naziv)||String(k.id)),u=b,n=2;while(usedK.has(u))u=b+"-"+n++;usedK.add(u);return {id:String(k.id),naziv:String(k.naziv),opis:String(k.opis||""),naslov:String(k.naslov||""),roditelj:String(k.roditelj||""),file:u+".html"};});
    const CATNAME={...inp.categories};const NAZ=inp.nazivi||{};Object.keys(CATNAME).forEach(k=>{if(NAZ[k]&&String(NAZ[k]).trim())CATNAME[k]=String(NAZ[k]).trim();});KATS.forEach(k=>{CATNAME[k.id]=k.naziv;});
    const hoses=live(inp.creva.map(e=>({...e.data,_file:e.file}))).map(h=>strip({
      kind:"crevo",id:base(h._file),name:h.title,type:txt(h.hose_type),img:img(h.image),short:txt(h.card_text),temp:txt(h.temp,"—"),
      material:txt(h.material,"—"),reinforce:txt(h.reinforce,"—"),cover:txt(h.cover,"—"),standard:txt(h.standard,"—"),use:txt(h.use,"—"),
      variants:(h.variants||[]).filter(v=>v.in_stock!==false).map(v=>({dim:txt(v.dim),wp:txt(v.wp,"—"),burst:txt(v.burst,"—"),flex:txt(v.flex,"—"),weight:txt(v.weight,"—"),price:num(v.price)??0,sf:txt(v.sifra)||undefined})),_a:[...(h.aliases||[]),...(h.variants||[]).map(v=>v.sifra)]
    })).filter(h=>h.variants.length);
    const sprays=live(inp.hema.map(e=>({...e.data,_file:e.file}))).map(s=>strip({
      kind:"sprej",id:base(s._file),name:s.title,eng:txt(s.eng),img:img(s.image),opts:(s.packs||[]).filter(o=>o.in_stock!==false).map(o=>({pack:txt(o.pack),price:num(o.price)??0,sf:txt(o.sifra)||undefined,img:img(o.image)||undefined})),
      short:txt(s.card_text),desc:txt(s.description,"Opis u pripremi."),use:txt(s.use,"—"),_a:[...(s.aliases||[]),...(s.packs||[]).map(o=>o.sifra)]
    })).filter(s=>s.opts.length);
    const items=live(inp.artikli.map(e=>({...e.data,_file:e.file}))).filter(a=>{const all=(a.variants||[]).filter(v=>txt(v.label));return !all.length||all.some(v=>v.in_stock!==false);}).map(a=>{
      const main=img(a.image),vs=(a.variants||[]).filter(v=>txt(v.label)&&v.in_stock!==false);
      const extra=(Array.isArray(a.categories)?a.categories:[]).map(String).filter(c=>c&&c!==a.category&&CATNAME[c]);
      const o={hint:txt(a.hint)||undefined,tnote:txt(a.table_note)||undefined,cat:a.category,cats:extra.length?extra:undefined,catName:CATNAME[a.category]||a.category,name:a.title,img:main,price:vs.length?null:num(a.price),desc:txt(a.description,"Opis u pripremi."),
        spec:txt(a.spec)||null,short:txt(a.card_text)||undefined,colLabel:txt(a.col_label)||undefined,specLabel:txt(a.spec_label)||undefined,sf:txt(a.sifra)||undefined,_a:[...(a.aliases||[]),a.sifra,...(a.variants||[]).map(v=>v.sifra)]};
      if(vs.length){o.promo=a.promo!==false;o.gal=vs.map(v=>({grp:txt(v.group)||undefined,label:txt(v.label),price:num(v.price),sf:txt(v.sifra)||undefined,note:txt(v.note)||undefined,img:img(v.image)||main}));}
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
    [...hoses,...sprays,...items].forEach(x=>{if(x._a&&x._a.length)aliases[x.name]=x._a.filter(Boolean).map(String);delete x._a;});
    [[hoses,"h"],[sprays,"s"],[items,"i"]].forEach(([arr,k])=>arr.forEach((p,i)=>{p._k=k+i;}));
    const used=new Set(),slg=t=>String(t).replace(/[čć]/gi,"c").replace(/š/gi,"s").replace(/ž/gi,"z").replace(/đ/gi,"dj").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70);
    [...hoses,...sprays,...items].forEach(p=>{let b="proizvod-"+(slg(p.name)||p._k),u=b,n=2;while(used.has(u)){u=b+"-"+n++;}used.add(u);p.u=u+".html";});
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
    s=s.replace(/<div class="grid"/,()=>'<p class="pdv-note pdv-top"><sup class="ast">*</sup> Cene su u dinarima (RSD) i iskazane bez PDV-a; u zagradi je cena sa PDV-om ('+PARTIS.VAT+'%).</p><div class="grid"');
    s=s.replace(/\{\{TRAK_PICK\}\}/g,()=>{const BR=(D.KATS||[]).filter(k=>k.roditelj==="traktorska-roba");if(!BR.length)return "";return '<section class="trk-pick"><h2>Izaberite vaš traktor</h2><div class="trk-cards">'+BR.map(b=>{const MO=(D.KATS||[]).filter(m=>m.roditelj===b.id);return '<a class="trk-card" href="'+b.file+'"><b>'+b.naziv+'</b><span>'+MO.length+' modela</span><small>'+MO.slice(0,5).map(m=>m.naziv.replace(b.naziv+" ","")).join(" · ")+(MO.length>5?" …":"")+'</small></a>';}).join("")+'</div></section>';});
    s=s.replace(/\{\{TRAK_BRANDS\}\}/g,()=>(D.KATS||[]).filter(k=>k.roditelj==="traktorska-roba").map(k=>'<a class="pill sub" href="'+k.file+'">'+k.naziv+'</a>').join(""));
    (D.HIDDENFILES||[]).forEach(f=>{s=s.replace(new RegExp('<a [^>]*href="'+f.replace(/\./g,"\\.")+'"[^>]*>[\\s\\S]*?</a>',"g"),"");});
    {
      const KS=D.KATS||[],kt=KS.find(k=>k.id==="tork");
      const L=[["hema-aerosol.html","HEMA aerosol"],["armirana-creva.html","Armirana creva i oprema"],["pneumatika.html","Pneumatika"],["traktorski-program.html","Traktorski program"],["vase-vozilo.html","Vaše vozilo, naš deo"],...(kt?[[kt.file,kt.naziv]]:[])]
        .filter(l=>!(D.HIDDENFILES||[]).includes(l[0])).map(l=>`<a href="${l[0]}">${l[1]}</a>`).join("");
      s=s.replace(/(<div class="foot-nav">\s*<div class="muted">KATEGORIJE<\/div>\s*)[\s\S]*?(\n\s*<\/div>)/,(_,x,y)=>x+L+y);
    }
    /* gornji meni: Početna · Proizvodi · Kontakt · Informacije; kategorije su u levom padajućem meniju */
    const home=pg.id==="home",on=(c)=>c?' class="on" aria-current="page"':"";
    const cat=!home&&!["pretraga","privatnost","kontakt","informacije"].includes(pg.id);
    const tabs=`<div class="tabs"><a href="index.html"${on(home)}>Početna</a><a href="proizvodi.html"${on(cat)}>Proizvodi</a><a href="kontakt.html"${on(pg.id==="kontakt")}>Kontakt</a><a href="informacije.html"${on(pg.id==="informacije")}>Informacije</a></div>`;
    const btn=`<button type="button" class="menu-btn" id="menuBtn" aria-expanded="false" aria-controls="sideMenu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>Kategorije</span></button>`;
    const side=`<button type="button" class="menu-fab" id="menuFab" aria-label="Kategorije proizvoda"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg><span>Kategorije</span></button><div class="side-ov" id="sideOv"></div><aside class="side-menu" id="sideMenu" aria-label="Kategorije proizvoda" aria-hidden="true"><div class="side-head"><b>Kategorije</b><button type="button" class="side-x" id="sideX" aria-label="Zatvori meni">&times;</button></div>${PARTIS.menuHTML(D)}</aside><script>(function(){var b=document.getElementById("menuBtn"),m=document.getElementById("sideMenu"),o=document.getElementById("sideOv"),x=document.getElementById("sideX");if(!b)return;function t(v){document.body.classList.toggle("side-open",v);b.setAttribute("aria-expanded",v);m.setAttribute("aria-hidden",!v);}b.onclick=function(){t(!document.body.classList.contains("side-open"));};var f=document.getElementById("menuFab");if(f)f.onclick=b.onclick;o.onclick=x.onclick=function(){t(false);};document.addEventListener("keydown",function(e){if(e.key==="Escape")t(false);});m.addEventListener("click",function(e){var g=e.target.closest(".s-tg");if(g){var li=g.closest("li"),sb=li.querySelector(".s-subs"),open=sb.hidden;sb.hidden=!open;g.setAttribute("aria-expanded",open);li.classList.toggle("open",open);return;}if(e.target.closest("a"))t(false);});})();</script>`;
    s=s.replace(/(<nav class="navbar"[^>]*><div class="nav-inner">)<div class="tabs">[\s\S]*?<\/div>(<form class="search"|<\/div><\/nav>)/,(_,a,b)=>a+btn+tabs+b);
    s=s.replace("</nav>",()=>"</nav>"+side);
    if(!s.includes("assets/i18n.js"))s=s.replace("</head>",'<script src="assets/i18n.js"></script></head>');
    if(cat||pg.id==="pretraga")s=s.replace(/<body([^>]*)>/,'<body$1 class="has-side">');
    s=s.replace("<footer>",'<footer id="kontakt">').replace('<section class="info-strip">','<section class="info-strip" id="informacije">');
    s=s.split(site+"/").join("\u0000").replace(/\u0000(index)\.html/g,site+"/").replace(/\u0000([a-z0-9-]+)\.html/g,site+"/$1").replace(/\u0000/g,site+"/");
    {
      const VB="viber://chat?number=%2B381652553800";
      const vsvg='<svg class="vb-ic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z"/></svg>';
      s=s.replace(/(<a class="wa-float"[^>]*>[\s\S]*?<\/a>)/,(m)=>m+'<a class="vb-float" href="'+VB+'" aria-label="Pišite nam na Viber">'+vsvg+'</a>');
      s=s.replace(/(<a href="https:\/\/wa\.me\/381652553800" target="_blank" rel="noopener">\+381 65 2553 800<\/a>)(<\/div>)/,(_,a,b)=>a+' &middot; <a href="'+VB+'">Viber</a>'+b);
      s=s.replace(/(<div><a href="https:\/\/wa\.me\/381652553800" target="_blank" rel="noopener">WhatsApp \+381 65 2553 800<\/a><\/div>)/g,(m)=>m+'<div><a href="'+VB+'">Viber +381 65 2553 800</a></div>');
    }
    s=PARTIS.rename(D,s);
    return {html:s,noindex:/name="robots" content="noindex/.test(s)};
  }
  /* stranice novih kategorija iz šablona templates/_kategorija.html */
  function katPages(tpl,D,site,PARTIS){
    const eh=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const KS=D.KATS||[],byId=id=>KS.find(k=>k.id===id);
    const pill=(href,txt,on)=>`<a class="pill sub${on?" active":""}" href="${href}"${on?" aria-current=page":""}>${eh(txt)}</a>`;
    return KS.map(k=>{
      const par=k.roditelj?byId(k.roditelj):null,brand=par&&par.roditelj?par:(k.roditelj==="traktorska-roba"?k:null),isTr=!!k.roditelj;
      let crumb='<a href="proizvodi.html">Proizvodi</a> &rsaquo; ';
      if(isTr){crumb+='<a href="traktorski-program.html">Traktorski program</a> &rsaquo; <a href="traktorska-roba.html">Traktorska roba</a> &rsaquo; '+(par&&par.roditelj?'<a href="'+par.file+'">'+eh(par.naziv)+'</a> &rsaquo; ':"");}
      else if(k.id!=="tork")crumb+='<a href="vase-vozilo.html">Vaše vozilo, naš deo</a> &rsaquo; ';
      let subs="";
      if(isTr){
        const BR=KS.filter(x=>x.roditelj==="traktorska-roba");
        subs+='<nav class="filters subfilters" aria-label="Potkategorije: Traktorski program"><span class="sub-lbl">Traktorski program &rsaquo;</span>'+pill("traktorski-program.html","Sve u traktorskom programu",false)+pill("traktorska-roba.html","Traktorska roba",true)+pill("gotova-creva.html","Gotova creva",false)+'</nav>';
        subs+='<nav class="filters subfilters" aria-label="Potkategorije: Traktorska roba"><span class="sub-lbl">Traktorska roba &rsaquo;</span>'+BR.map(b=>pill(b.file,b.naziv,brand&&b.id===brand.id)).join("")+'</nav>';
        if(brand){const MO=KS.filter(x=>x.roditelj===brand.id);
          subs+='<nav class="filters subfilters" aria-label="Modeli: '+eh(brand.naziv)+'"><span class="sub-lbl">'+eh(brand.naziv)+' &rsaquo;</span>'+pill(brand.file,"Svi modeli",k.id===brand.id)+MO.map(m=>pill(m.file,m.naziv.replace(brand.naziv+" ",""),m.id===k.id)).join("")+'</nav>';}
      }
      const ttl=k.naslov||(isTr?(k.roditelj==="traktorska-roba"?k.naziv+" traktori — delovi i oprema":k.naziv+" — delovi i oprema za traktor"):k.naziv+" — Vaše vozilo, naš deo");
      const t=tpl.replace(/\{\{KAT_SUBS\}\}/g,()=>subs).replace(/\{\{KAT_ID\}\}/g,k.id).replace(/\{\{KAT_FILE\}\}/g,k.file).replace(/\{\{KAT_CRUMB\}\}/g,()=>crumb).replace(/\{\{KAT_TAG\}\}/g,()=>eh(isTr?"Traktorski program \u00b7 "+(brand&&brand.id!==k.id?brand.naziv:"Traktorska roba"):k.naziv)).replace(/\{\{KAT_NAZIV\}\}/g,()=>eh(k.naziv)).replace(/\{\{KAT_TITLE\}\}/g,()=>eh(ttl)).replace(/\{\{KAT_META\}\}/g,()=>{const o=(k.opis||k.naziv+" — PARTIS Niš.").replace(/\s+/g," ");if(o.length<=158)return eh(o);const c=o.slice(0,155),i=Math.max(c.lastIndexOf(" "),c.lastIndexOf(","));return eh(c.slice(0,i>80?i:155).replace(/[,;:\s]+$/,"")+"…");}).replace(/\{\{KAT_OPIS\}\}/g,()=>eh(k.opis||k.naziv+" — PARTIS Niš."));
      const r=renderPage(t,D,site,PARTIS);return {file:k.file,html:r.html,noindex:r.noindex};
    });
  }

  /* zasebna stranica za svaki proizvod iz šablona templates/_proizvod.html */
  function productPages(tpl,D,site,PARTIS){
    const eh=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
    const PO={pneu:"pneumatski-alat-i-nastavci.html",crevapn:"creva-pneumatike.html",mesing:"ojacanja-creva.html",spojnice:"spojnice-pneumatike.html",crevo:"armirana-creva.html",gotova:"gotova-creva.html",traktor:"traktorska-roba.html",mazalice:"nastavci-mazalica.html"};
    const PAR={};["pneumatski-alat-i-nastavci","creva-pneumatike","ojacanja-creva","spojnice-pneumatike"].forEach(f=>PAR[f+".html"]=["pneumatika.html","Pneumatika"]);["traktorska-roba","gotova-creva"].forEach(f=>PAR[f+".html"]=["traktorski-program.html","Traktorski program"]);
    const all=[...D.HOSES,...D.SPRAYS,...D.ITEMS];
    return all.map(p=>{
      const sp=p.kind==="sprej",ho=p.kind==="crevo";
      let catName=ho?"Armirana creva i oprema":sp?"HEMA Kimya aerosol":(p.catName||"");
      const catFile=ho?"armirana-creva.html":sp?"hema-aerosol.html":(PO[p.cat]||((D.KATS||[]).find(k=>k.id===p.cat)||{}).file||"kategorija-"+p.cat+".html");
      if(catFile==="armirana-creva.html")catName="Armirana creva i oprema";
      const desc=(sp?p.desc:ho?p.short:(p.desc||p.short))||p.name;
      const dsc=(desc.toLowerCase().indexOf(p.name.toLowerCase())===0?desc:p.name+" — "+desc).replace(/\s+/g," ").slice(0,155);
      const vlist=ho?p.variants.map(v=>v.dim):sp?p.opts.map(o=>o.pack):(p.gal?p.gal.map(g=>g.label):[]);
      const img=p.img?site+"/"+p.img.replace(/^\//,""):"";
      const ld={"@context":"https://schema.org","@type":"Product",name:p.name,description:desc,brand:{"@type":"Brand",name:sp?"HEMA Aerosol":"PARTIS"},category:catName};
      if(img)ld.image=img;
      {const prices=(ho?p.variants.map(v=>v.price):sp?p.opts.map(o=>o.price):(p.gal?p.gal.map(g=>g.price):[p.price])).filter(x=>typeof x==="number"&&x>0);
       if(prices.length){const lo=Math.min(...prices),hi=Math.max(...prices),u=site+"/"+p.u.replace(/\.html$/,"");
         ld.offers=lo===hi?{"@type":"Offer",url:u,priceCurrency:"RSD",price:lo.toFixed(2),availability:"https://schema.org/InStock",priceSpecification:{"@type":"PriceSpecification",price:lo.toFixed(2),priceCurrency:"RSD",valueAddedTaxIncluded:false}}
         :{"@type":"AggregateOffer",url:u,priceCurrency:"RSD",lowPrice:lo.toFixed(2),highPrice:hi.toFixed(2),offerCount:prices.length,availability:"https://schema.org/InStock"};}}
      const stat=`<h1>${eh(p.name)}</h1>${p.img?`<img src="${eh(p.img)}" alt="${eh(p.name)}" width="400">`:""}<p>${eh(desc)}</p>`+(p.hint?`<p>${eh(p.hint)}</p>`:"")+(vlist.length?`<ul>${vlist.map(v=>`<li>${eh(v)}</li>`).join("")}</ul>`:"")+`<p>Cena na upit: <a href="tel:+38118553800">+381 18 553 800</a> / <a href="tel:+381652553800">+381 65 2553 800</a></p>`;
      const t=tpl.replace(/\{\{P_KEY\}\}/g,p._k).replace(/\{\{P_FILE\}\}/g,p.u).replace(/\{\{P_TITLE\}\}/g,()=>eh(p.name)).replace(/\{\{P_DESC\}\}/g,()=>eh(dsc)).replace(/\{\{P_IMG\}\}/g,()=>eh(img||site+"/assets/img/nu40.jpg"))
        .replace(/\{\{P_PARENT\}\}/g,PAR[catFile]?'<a href="'+PAR[catFile][0]+'">'+PAR[catFile][1]+'</a> &rsaquo; ':(/^kategorija-/.test(catFile)&&catFile!=="kategorija-tork.html"?'<a href="vase-vozilo.html">Vaše vozilo, naš deo</a> &rsaquo; ':"")).replace(/\{\{P_CATNAME\}\}/g,()=>eh(catName)).replace(/\{\{P_CATFILE\}\}/g,catFile).replace(/\{\{P_LD\}\}/g,()=>`<script type="application/ld+json">${j(ld).replace(/</g,"\\u003c")}</script>`).replace(/\{\{P_STATIC\}\}/g,()=>stat);
      const r=renderPage(t,D,site,PARTIS);return {file:p.u,html:r.html,noindex:false};
    });
  }
  function sitemapRobots(pages,site){
    const sm=pages.filter(p=>!p.noindex).sort((a,b)=>(a.file==="index.html"?-1:b.file==="index.html"?1:a.file.localeCompare(b.file)))
      .map(p=>`  <url><loc>${site}/${p.file==="index.html"?"":p.file.replace(/\.html$/,"")}</loc><changefreq>weekly</changefreq><priority>${p.file==="index.html"?"1.0":"0.8"}</priority></url>\n`).join("");
    return {
      "sitemap.xml":`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm}</urlset>\n`,
      "robots.txt":`User-agent: *\nAllow: /\nDisallow: /pretraga.html\nDisallow: /admin/\n\nSitemap: ${site}/sitemap.xml\n`
    };
  }
  return {MULTI:true,POC_DEF,pocMerge,HIDE,model,dataFiles,missingImages,renderPage,katPages,productPages,sitemapRobots};
});
