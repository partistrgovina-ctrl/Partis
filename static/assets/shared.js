/* PARTIS — zajednički kod: gradi HTML kartica, brojače i pločice.
   Koristi ga i pregledač (sajt) i izrada sajta (build/build.mjs), pa su kartice uvek iste. */
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory();
  else root.PARTIS=factory();
})(typeof self!=="undefined"?self:this,function(){
  const VAT=20,gross=n=>Math.round(n*(100+VAT))/100;
  const fmt=n=>n.toLocaleString("sr-RS",{minimumFractionDigits:2,maximumFractionDigits:2});
  const esc=s=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const priced=p=>!!(p.gal&&p.gal.some(g=>g.price!=null));
  const itemCount=x=>x.gal?x.gal.length:1;

  function hoseCardHTML(p,i){
    return `<a class="card" href="${esc(p.u)}" data-k="${p._k}" style="animation-delay:${(i*0.07).toFixed(2)}s">
    <div class="card-top contain"><span class="badge">${esc(p.type)}</span><img src="${esc(p.img)}" alt="${esc(p.name)}"></div>
    <div class="card-body">
      <h3>${esc(p.name)}</h3><p class="desc">${esc(p.short)}</p>
      <div class="specrow"><div>Temperatura<b>${esc((p.temp||"").split("  ")[0])}</b></div>${p.variants.length===1?`<div>Dimenzija<b>${esc(p.variants[0].dim)}</b></div>`:`<div>Varijante<b>${p.variants.length}</b></div>`}</div>
      <div class="card-foot end"><div class="card-go">Dimenzije i cene →</div></div>
    </div></a>`;
  }
  function sprayCardHTML(p,i){
    return `<a class="card" href="${esc(p.u)}" data-k="${p._k}" style="animation-delay:${(i*0.06).toFixed(2)}s">
    <div class="card-top spray"><span class="badge">HEMA</span>${p.img?`<img src="${esc(p.img)}" alt="${esc(p.name)}">`:`<div class="noimg">Slika uskoro</div>`}</div>
    <div class="card-body">
      <div class="eng">HEMA Kimya aerosol</div><h3>${esc(p.name)}</h3><p class="desc">${esc(p.short)}</p>
      <div class="card-foot"><div class="opts">${p.opts.map(o=>`<div class="opt"><span>${esc(o.pack)}</span><b>${fmt(o.price)} RSD<sup class="ast">*</sup></b> <span class="vat">(${fmt(gross(o.price))} sa PDV-om)</span></div>`).join("")}</div><div class="card-go">Detalji →</div></div>
    </div></a>`;
  }
  function itemCardHTML(p,i){
    const pr=priced(p),promo=pr&&p.promo!==false;
    let price;
    if(p.gal){
      if(!pr)price=`<div class="opt"><b>Cena na upit</b></div><span class="pdv">Kontakt: +381 18 553 800</span>`;
      else if(!promo)price=p.gal.length>1?`<div class="opt"><b>${p.gal.length} ${plr(p.gal.length,"dimenzija","dimenzije","dimenzija")}</b></div><span class="pdv">cene u detaljima</span>`:`<div class="opt"><b>${fmt(p.gal[0].price)} RSD<sup class="ast">*</sup></b> <span class="vat">(${fmt(gross(p.gal[0].price))} sa PDV-om)</span></div>`;
      else price=`<div class="opt"><b class="promo-t">Akcijske cene</b></div><span class="pdv">cene u detaljima</span>`;
    }else if(p.price==null)price=`<div class="opt"><b>Cena na upit</b></div><span class="pdv">Kontakt: +381 18 553 800</span>`;
    else price=`<div class="opt"><b>${fmt(p.price)} RSD<sup class="ast">*</sup></b> <span class="vat">(${fmt(gross(p.price))} sa PDV-om)</span></div>`;
    return `<a class="card" href="${esc(p.u)}" data-k="${p._k}" style="animation-delay:${(i*0.04).toFixed(2)}s">
    <div class="card-top item"><span class="badge">${esc(p.catName)}</span>${promo?`<span class="badge promo">Akcija</span>`:""}${p.img?`<img src="${esc(p.img)}" alt="${esc(p.name)}">`:`<div class="noimg">Slika uskoro</div>`}</div>
    <div class="card-body">
      <h3>${esc(p.name)}</h3>${p.spec?`<div class="spec">${esc(p.spec)}</div>`:""}<p class="desc">${esc(p.short||p.desc)}</p>
      <div class="card-foot"><div class="opts">${price}</div><div class="card-go">Detalji →</div></div>
    </div></a>`;
  }
  /* srpski množinski oblici: 1, 21 → jednina; 2–4, 22–24 → paukal; ostalo → genitiv množine */
  const plr=(n,a,b,c)=>{const m=n%100,d=n%10;return (d===1&&m!==11)?a:(d>=2&&d<=4&&(m<12||m>14))?b:c;};
  const cardHTML=(r,i)=>r.kind==="crevo"?hoseCardHTML(r,i):r.kind==="sprej"?sprayCardHTML(r,i):itemCardHTML(r,i);

  /* artikal može biti u više kategorija: glavna (cat) + dodatne (cats) */
  const inCat=(x,id)=>x.cat===id||(x.cats||[]).includes(id);
  /* kartice jedne sekcije, istim redom kao na sajtu */
  function sectionList(D,id){
    if(id==="crevo")return [...D.HOSES,...D.ITEMS.filter(x=>inCat(x,"crevo"))];
    if(id==="sprej")return D.SPRAYS;
    if(id==="istaknuto"){
      const pick=[[D.SPRAYS,/^NU-40/i],[D.HOSES,/preliv/i],[D.ITEMS,/^Ventil kipe/i],[D.SPRAYS,/Brake Cleaner/i],[D.ITEMS,/^Hvatač pneumatske spojnice 10/i],[D.HOSES,/za gorivo/i]];
      return pick.map(([L,re])=>L.find(x=>re.test(x.name))).filter(Boolean);
    }
    if(id==="crevapn")return [...D.ITEMS.filter(x=>inCat(x,id)),...D.HOSES.filter(h=>/vazduh/i.test(h.name))];
    return D.ITEMS.filter(x=>inCat(x,id));
  }
  const gridHTML=(D,id)=>sectionList(D,id).map((p,i)=>cardHTML(p,i)).join("");

  /* brojači */
  const PNEU=["pneu","crevapn","mesing","spojnice"],TRAK=["traktor","gotova"],TOPCOUNT=5;
  function secTitle(D,id){
    if(id==="crevo")return "Armirana gumena creva i prateća oprema";
    if(id==="sprej")return "HEMA aerosol";
    const c=D.CATS.find(x=>x.id===id);return c?c.title:id;
  }
  function secN(D,id){
    if(id==="crevo")return D.HOSES.reduce((a,h)=>a+h.variants.length,0)+D.ITEMS.filter(x=>inCat(x,"crevo")).reduce((a,x)=>a+itemCount(x),0);
    if(id==="sprej")return D.SPRAYS.length;
    return D.ITEMS.filter(x=>inCat(x,id)).reduce((a,x)=>a+itemCount(x),0);
  }
  /* zbir za grupu kategorija: artikal u dve kategorije iste grupe se broji jednom */
  const groupN=(D,ids)=>D.ITEMS.filter(x=>ids.some(id=>inCat(x,id))).reduce((a,x)=>a+itemCount(x),0);
  function totalProducts(D){
    const seen=new Set();
    const items=D.ITEMS.reduce((a,x)=>{if(seen.has(x.name))return a;seen.add(x.name);return a+itemCount(x);},0);
    return D.HOSES.reduce((a,h)=>a+h.variants.length,0)+D.SPRAYS.length+items;
  }
  /* preimenovane kategorije: stari naziv -> novi (D.NAZIVI = {grupa/potkategorija: novi naziv}) */
  const OLDN={creva:["Armirana gumena creva i prateća oprema","Armirana creva i oprema","Creva i oprema","Armirana gumena creva"],pneumatika:["Pneumatika"],hema:["HEMA aerosol"],traktorski:["Traktorski program"],mazalice:["Nastavci mazalica"],pneu:["Pneumatski alat i nastavci"],mesing:["Ojačanja creva"],spojnice:["Spojnice pneumatike"],traktor:["Traktorska roba"],gotova:["Gotova creva"],crevo:["Prateća oprema"]};
  function rename(D,html){
    const N=(D&&D.NAZIVI)||{};
    Object.keys(N).forEach(k=>{
      const v=String(N[k]||"").trim(),olds=OLDN[k];if(!v||!olds)return;
      [...olds].sort((a,b)=>b.length-a.length).forEach(o=>{if(o!==v)html=html.split(o).join(esc(v));});
    });
    return html;
  }
  function metaHTML(P,D){return rename(D,metaHTML0(P,D));}
  function metaHTML0(P,D){
    if(P.id==="home")return `<span><b>${totalProducts(D)}</b> Proizvoda</span><span><b>${tiles(D).length}</b> Kategorija</span>`;
    if(P.id==="pneumatika"){const t=groupN(D,PNEU);return `<span><b>${t}</b> Proizvoda u kategoriji Pneumatika</span><span><b>4</b> Potkategorije</span>`;}
    if(P.id==="vozilo"){const t=groupN(D,(D.KATS||[]).filter(k=>k.id!=="tork").map(k=>k.id));return `<span><b>${t}</b> Proizvoda u kategoriji Vaše vozilo, naš deo</span><span><b>${(D.KATS||[]).filter(k=>k.id!=="tork").length}</b> Potkategorija</span>`;}
    if(P.id==="traktorski"){const t=groupN(D,TRAK);return `<span><b>${t}</b> Proizvoda u kategoriji Traktorski program</span><span><b>2</b> Potkategorije</span>`;}
    const id=P.secs[0];
    return `<span><b>${secN(D,id)}</b> Proizvoda u ${PNEU.includes(id)||TRAK.includes(id)?"potkategoriji":"kategoriji"} ${secTitle(D,id)}${PNEU.includes(id)?" (Pneumatika)":TRAK.includes(id)?" (Traktorski program)":""}</span>`;
  }
  /* pločice na početnoj */
  function tiles(D){
    const sum=ids=>groupN(D,ids);
    const STAND=["tork"],ALLK=(D.KATS||[]);const KS=ALLK.filter(k=>!STAND.includes(k.id));const kf=KS.map(k=>D.ITEMS.find(x=>inCat(x,k.id)&&x.img)).find(Boolean);
    const vz={t:"Vaše vozilo, naš deo",pool:KS.map(k=>k.id),u:"vase-vozilo.html",src:kf?kf.img:"",d:"Sijalice, elektrika, signalizacija, brave, releji i drugi delovi za vozila.",n:sum(KS.map(k=>k.id)),subs:KS.map(k=>[esc(k.naziv),k.file])};
    return [
     {t:"HEMA aerosol",pool:["sprej"],u:"hema-aerosol.html",img:"nu40",d:((D.POC&&D.POC.opisi&&D.POC.opisi.hema)||"Podmazivanje, zaštita, čišćenje, uklanjanje rđe i hitne popravke."),n:secN(D,"sprej")},
     {t:"Armirana gumena creva i prateća oprema",pool:["crevo"],u:"armirana-creva.html",img:"hose_gorivo",d:((D.POC&&D.POC.opisi&&D.POC.opisi.creva)||"Creva za gorivo, vodu, vazduh i ulje — kotur 50 m, sečenje po potrebi."),n:secN(D,"crevo")},
     {t:"Pneumatika",pool:PNEU,u:"pneumatika.html",img:"pist_gume",d:((D.POC&&D.POC.opisi&&D.POC.opisi.pneumatika)||"Pneumatski alat i nastavci, ojačanja creva i spojnice pneumatike."),n:sum(PNEU),subs:[["Pneumatski alat i nastavci","pneumatski-alat-i-nastavci.html"],["Creva pneumatike","creva-pneumatike.html"],["Ojačanja creva","ojacanja-creva.html"],["Spojnice pneumatike","spojnice-pneumatike.html"]]},
     {t:"Traktorski program",pool:TRAK,u:"traktorski-program.html",img:"oko14",d:((D.POC&&D.POC.opisi&&D.POC.opisi.traktorski)||"Traktorska roba (okca, šuplji vijci) i gotova creva sa montiranim nastavcima."),n:sum(TRAK),subs:[["Traktorska roba","traktorska-roba.html"],["Gotova creva","gotova-creva.html"]]},
     ...(KS.length?[vz]:[]),
     ...ALLK.filter(k=>STAND.includes(k.id)).map(k=>{const f=D.ITEMS.find(x=>inCat(x,k.id)&&x.img);return {t:esc(k.naziv),pool:[k.id],u:k.file,src:f?f.img:"",d:esc(k.opis||""),n:secN(D,k.id)};}).filter(t=>t.n>0),
    ].filter(t=>!(D.HIDDENFILES||[]).includes(t.u));
  }
  function tilesHTML(D){return rename(D,tilesHTML0(D));}
  function tilesHTML0(D){
    return tiles(D).map(t=>`<div class="tile" data-pool="${t.pool.join(",")}"><a class="tile-main" href="${t.u}"><div class="tile-img"><img class="on" src="${esc(t.src||(D.IMG&&D.IMG[t.img])||"")}" alt="${esc(t.t)}"></div><div class="tile-body"><h3>${t.t}</h3><p>${t.d}</p><span class="tile-n">${t.n} ${plr(t.n,"proizvod","proizvoda","proizvoda")}</span></div></a>${t.subs?`<div class="tile-subs">${t.subs.map(s=>`<a href="${s[1]}">${s[0]}</a>`).join("")}</div>`:""}</div>`).join("");
  }
  function menuHTML(D){
    const li=tiles(D).map(t=>t.subs?`<li class="has-subs"><div class="s-row"><a class="s-top" href="${t.u}"><span>${t.t}</span><i>${t.n}</i></a><button type="button" class="s-tg" aria-expanded="false" aria-label="Potkategorije: ${t.t}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="s-subs" hidden>${t.subs.map(x=>`<a href="${x[1]}">${x[0]}</a>`).join("")}</div></li>`:`<li><a class="s-top" href="${t.u}"><span>${t.t}</span><i>${t.n}</i></a></li>`).join("");
    return rename(D,`<ul>${li}</ul>`);
  }
  /* ----- rabati kupaca (po grupi artikala) ----- */
  const GROUPS=[["pneumatika","Pneumatika"],["hema","HEMA aerosol"],["creva","Armirana creva i oprema"],["traktorski","Traktorski program"],["mazalice","Nastavci mazalica"],["ostalo","Ostale (nove) kategorije"]];
  function groupOf(p){
    if(p.kind==="sprej")return "hema";
    if(p.kind==="crevo"||p.cat==="crevo")return "creva";
    if(["pneu","crevapn","mesing","spojnice"].includes(p.cat))return "pneumatika";
    if(["traktor","gotova"].includes(p.cat))return "traktorski";
    return p.cat==="mazalice"?"mazalice":(["pneu","crevapn","mesing","spojnice","crevo","traktor","gotova"].includes(p.cat)?"pneumatika":"ostalo");
  }
  /* procenat rabata za artikal: rabat grupe, a ako nije upisan — opšti rabat ("svi") */
  function rebateFor(p,R){
    if(!R)return 0;
    const g=Number(R[groupOf(p)]),a=Number(R.svi);
    const v=R[groupOf(p)]!==undefined&&R[groupOf(p)]!==""&&!isNaN(g)?g:(!isNaN(a)?a:0);
    return v>0&&v<100?v:0;
  }
  const discounted=(price,r)=>Math.round(price*(100-r))/100;
  /* HTML cene sa rabatom: precrtana stara cena + nova */
  function priceHTML(price,r){
    return r>0?`<s class="old">${fmt(price)}</s> <b class="newp">${fmt(discounted(price,r))}</b> <span class="rb">\u2212${r}%</span>`:fmt(price);
  }
  function priceHTML2(price,r){const n=r>0?discounted(price,r):price;return priceHTML(price,r)+` <span class="vat">(${fmt(gross(n))})</span>`;}
  return {GROUPS,groupOf,rebateFor,discounted,priceHTML:priceHTML2,gross,VAT,fmt,esc,priced,itemCount,cardHTML,gridHTML,sectionList,secN,metaHTML,tilesHTML,menuHTML,totalProducts,rename,OLDN};
});
