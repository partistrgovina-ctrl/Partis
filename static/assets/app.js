/* PARTIS — logika sajta: prozor sa detaljima, pretraga, rotacija slika. Kartice dolaze iz shared.js */
const {fmt,esc}=PARTIS;
const D={HOSES,SPRAYS,ITEMS,CATS,IMG,KATS:(typeof KATS!=="undefined"?KATS:[]),HIDDENFILES:(typeof HIDDENFILES!=="undefined"?HIDDENFILES:[]),NAZIVI:(typeof NAZIVI!=="undefined"?NAZIVI:{}),POC:(typeof POC!=="undefined"?POC:null)};
/* cena sa rabatom prijavljenog kupca (window.REBATE postavlja account.js) */
const pr=(p,price)=>price==null?"":PARTIS.priceHTML(price,PARTIS.rebateFor(p,window.REBATE));
const cardEl=(r,i)=>{const t=document.createElement("template");t.innerHTML=PARTIS.cardHTML(r,i).trim();return t.content.firstElementChild;};

const addBtn=(k,vi)=>`<span class="addq"><input class="aq" type="number" min="1" max="999" value="1" inputmode="numeric" aria-label="Količina" onclick="event.stopPropagation()" onkeydown="event.stopPropagation()"><button class="add" type="button" onclick="event.stopPropagation();cartAdd('${k}',${vi},this.previousElementSibling.value)">+ U korpu</button></span>`;
const overlay=document.getElementById("overlay"), modal=document.getElementById("modal");

function openHose(p){
  modal.className="modal hose";
  const rows=p.variants.map((v,vi)=>`<tr><td><b>${esc(v.dim)}</b></td><td data-l="Radni pritisak">${esc(v.wp)}</td><td data-l="Tačka prsk.">${esc(v.burst)}</td><td data-l="Savitljivost">${esc(v.flex)}</td><td data-l="Težina">${esc(v.weight)} g/m</td><td class="price">${pr(p,v.price)} <small>RSD/m bez PDV-a</small></td><td class="addc">${addBtn(p._k,vi)}</td></tr>`).join("");
  modal.innerHTML=`
    <button class="m-close" onclick="closeModal()">\u2715</button>
    <div class="split">
      <div class="m-photo"><img src="${p.img}" alt="${esc(p.name)}"></div>
      <div class="m-content">
        <div class="eng">Armirano crevo \u00b7 ${esc(p.type)}</div>
        <h2>${esc(p.name)}</h2>
        <div class="m-temp">RADNA TEMP. ${esc(p.temp)}</div>
        <div class="props">
          <div class="prop"><div class="k">Materijal creva</div><div class="v">${esc(p.material)}</div></div>
          <div class="prop"><div class="k">Ojačanje zida</div><div class="v">${esc(p.reinforce)}</div></div>
          <div class="prop"><div class="k">Spoljni omotač</div><div class="v">${esc(p.cover)}</div></div>
          ${p.standard&&p.standard!=="\u2014"?`<div class="prop"><div class="k">Standard</div><div class="v">${esc(p.standard)}</div></div>`:""}
          <div class="prop"><div class="k">Primena</div><div class="v">${esc(p.use)}</div></div>
        </div>
        ${p.variants.length===1?`<div class="m-sub">Dimenzija i cena</div>
        <div class="props"><div class="prop"><div class="k">Dimenzija</div><div class="v"><b>${esc(p.variants[0].dim)}</b></div></div><div class="prop"><div class="k">Cena</div><div class="v"><b>${pr(p,p.variants[0].price)}</b> RSD/m bez PDV-a</div></div></div>
        <div class="add-wrap">${addBtn(p._k,0)}</div>`:`<div class="m-sub">Dimenzije i cene</div>
        <div class="tbl-wrap"><table><thead><tr><th>Dimenzija</th><th>Radni prit.</th><th>Tačka prsk.</th><th>Savitlj.</th><th>Težina</th><th>Cena (bez PDV-a)</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
        <div class="note">Cene su izražene po metru, bez PDV-a. Standardna dužina kotura je 50 m.</div>`}
      </div>
    </div>`;
  show();
}
function openSpray(p){
  modal.className="modal spray";
  modal.innerHTML=`
    <button class="m-close" onclick="closeModal()">\u2715</button>
    <div class="split">
      <div class="m-photo sp">${p.img?`<img src="${p.img}" alt="${esc(p.name)}">`:`<div class="noimg">Slika uskoro</div>`}</div>
      <div class="m-content">
        <div class="eng">${esc(p.eng)}</div>
        <h2>${esc(p.name)}</h2>
        
        <p class="m-lead">${esc(p.desc)}</p>
        <div class="props">
          <div class="prop"><div class="k">Namena</div><div class="v">${esc(p.use)}</div></div>
                    <div class="prop"><div class="k">Brend</div><div class="v">HEMA Aerosol</div></div>
        </div>
        <div class="m-sub">Ambalaža i cena</div>
        <div class="tbl-wrap"><table><thead><tr><th>Ambalaža</th><th>Cena (bez PDV-a)</th><th></th></tr></thead><tbody>${p.opts.map((o,vi)=>`<tr><td><b>${esc(o.pack)}</b></td><td class="price">${pr(p,o.price)} <small>RSD bez PDV-a</small></td><td class="addc">${addBtn(p._k,vi)}</td></tr>`).join("")}</tbody></table></div>
      </div>
    </div>`;
  show();
}
function openItem(p){
  if(p.gal){openGal(p);return;}
  modal.className="modal spray";
  modal.innerHTML=`
    <button class="m-close" onclick="closeModal()">\u2715</button>
    <div class="split">
      <div class="m-photo">${p.img?`<img src="${p.img}" alt="${esc(p.name)}">`:`<div class="noimg">Slika uskoro</div>`}</div>
      <div class="m-content">
        <div class="eng">${esc(p.catName)}</div>
        <h2>${esc(p.name)}</h2>
        <p class="m-lead">${esc(p.desc)}</p>
        ${p.spec?`<div class="props"><div class="prop"><div class="k">${esc(p.specLabel||"Navoj")}</div><div class="v">${esc(p.spec)}</div></div></div>`:""}
        <div class="m-sub">Cena</div>
        <div class="tbl-wrap"><table><thead><tr><th>Artikal</th><th>Cena (bez PDV-a)</th></tr></thead><tbody><tr><td><b>${esc(p.name)}</b></td><td class="price">${p.price==null?`Cena na upit <small>kontakt: 018-553-800 / 065-2553-800</small>`:`${pr(p,p.price)} <small>RSD bez PDV-a</small>`}</td></tr></tbody></table></div>
        <div class="add-wrap">${addBtn(p._k,-1)}</div>
      </div>
    </div>`;
  curItem=p;
  show();
}
let curItem=null;
let galIdx=0;
function openGal(p){
  curItem=p;galIdx=0;
  const grouped=p.gal.some(g=>g.grp);
  p._groups=grouped?[...new Set(p.gal.map(g=>g.grp))]:null;
  p._v=p.gal.map((_,i)=>i).filter(i=>!grouped||p.gal[i].grp===p._groups[0]);
  const n=p.gal.length;
  modal.className="modal spray";
  modal.innerHTML=`
    <button class="m-close" onclick="closeModal()">\u2715</button>
    <div class="split">
      <div class="m-photo gal">
        <div class="gal-stage"><img id="gal-img" src="${p.gal[0].img}" alt="${p.name}"><button class="gal-nav prev" onclick="galGo(-1)" aria-label="Prethodna slika">&#8249;</button><button class="gal-nav next" onclick="galGo(1)" aria-label="Sledeća slika">&#8250;</button></div>
        <div class="gal-cap"><b id="gal-label"></b> <span id="gal-count"></span></div>
        <div class="gal-thumbs" id="gal-thumbs"></div>
      </div>
      <div class="m-content">
        <div class="eng">${p.catName}</div>
        <h2>${esc(p.name)}</h2>
        <p class="m-lead">${esc(p.desc)}</p>
        <div class="m-sub">${(p.promo===false||!PARTIS.priced(p))?(n>1?"Dimenzije i cene":"Cena"):(n>1?"Dimenzije i akcijske cene":"Akcijska cena")}</div>
        ${grouped?`<div class="seg" id="seg">${p._groups.map((g,k)=>`<button class="seg-btn${k?"":" on"}" onclick="selGalGroup(${k})">${g}</button>`).join("")}</div>`:""}
        <div class="tbl-wrap"><table><thead><tr><th>${p.colLabel||"Dimenzija"}</th><th>Cena (bez PDV-a)</th><th></th></tr></thead><tbody id="gal-tbody"></tbody></table></div>
        ${p.gal.some(g=>g.price==null)?`<div class="note">Za cene pozovite 018-553-800 / 065-2553-800 ili pišite na <a href="https://wa.me/381652553800" target="_blank" rel="noopener">WhatsApp</a> / partis.trgovina@gmail.com.</div>`:""}
        <div class="note" id="gal-note">Slike menjate strelicama, sličicama ili klikom na red u tabeli.</div>
      </div>
    </div>`;
  renderGalView();galSet(0);show();
}
function renderGalView(){
  const p=curItem,v=p._v,n=v.length;
  const multi=new Set(v.map(gi=>p.gal[gi].img)).size>1;
  document.getElementById("gal-thumbs").innerHTML=multi?v.map((gi,k)=>`<button class="gal-th" onclick="galSet(${k})" aria-label="${p.gal[gi].label}"><img src="${p.gal[gi].img}" alt=""></button>`).join(""):"";
  document.getElementById("gal-tbody").innerHTML=v.map((gi,k)=>{const g=p.gal[gi];return `<tr class="gal-row" onclick="galSet(${k})"><td><b>${g.label}</b>${g.note?`<small class="gal-note">${g.note}</small>`:""}</td><td class="price">${g.price==null?"Cena na upit":`${pr(p,g.price)} <small>RSD bez PDV-a</small>`}</td><td class="addc">${addBtn(p._k,gi)}</td></tr>`}).join("");
  document.querySelectorAll(".gal-nav").forEach(b=>b.hidden=!multi);
  document.getElementById("gal-note").hidden=!multi;
  document.querySelector(".gal-cap").hidden=!multi;
  document.getElementById("gal-note").textContent=multi?"Slike menjate strelicama, sličicama ili klikom na red u tabeli.":"Cene i dimenzije vidite u tabeli.";
  curItem._multi=multi;
}
function selGalGroup(k){
  const p=curItem;
  p._v=p.gal.map((_,i)=>i).filter(i=>p.gal[i].grp===p._groups[k]);
  document.querySelectorAll("#seg .seg-btn").forEach((b,j)=>b.classList.toggle("on",j===k));
  renderGalView();galSet(0);
}
function galSet(i){
  const v=curItem._v,g=curItem.gal;galIdx=(i+v.length)%v.length;
  const it=g[v[galIdx]];
  document.getElementById("gal-img").src=it.img;
  document.getElementById("gal-label").textContent=it.label;
  document.getElementById("gal-count").textContent=curItem._multi?(galIdx+1)+" / "+v.length:"";
  document.querySelectorAll(".gal-row").forEach((r,k)=>r.classList.toggle("on",k===galIdx));
  document.querySelectorAll(".gal-th").forEach((r,k)=>r.classList.toggle("on",k===galIdx));
}
function galGo(d){galSet(galIdx+d)}
document.addEventListener("keydown",e=>{
  if(!overlay.classList.contains("open")||!curItem||!curItem.gal||!curItem._v||!curItem._multi||!document.getElementById("gal-img"))return;
  if(e.key==="ArrowLeft")galGo(-1);else if(e.key==="ArrowRight")galGo(1);
});

function show(){overlay.classList.add("open");document.body.style.overflow="hidden";}
function closeModal(){overlay.classList.remove("open");document.body.style.overflow="";}
overlay.addEventListener("click",e=>{if(e.target===overlay)closeModal();});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();});


/* ================= PAGE LOGIC ================= */
const PAGE_OF={pneu:"pneumatski-alat-i-nastavci.html",mesing:"ojacanja-creva.html",spojnice:"spojnice-pneumatike.html",crevo:"armirana-creva.html",gotova:"gotova-creva.html",traktor:"traktorska-roba.html",mazalice:"nastavci-mazalica.html"};
const pageOf=r=>r.kind==="sprej"?"hema-aerosol.html":r.kind==="crevo"?"armirana-creva.html":PAGE_OF[r.cat]||"kategorija-"+r.cat+".html";
const GROUP_OF=r=>r.kind==="sprej"?"HEMA aerosol":r.kind==="crevo"?"Armirana gumena creva":["pneu","mesing","spojnice"].includes(r.cat)?"Pneumatika":["traktor","gotova"].includes(r.cat)?"Traktorski program":r.catName||"";
const openFor=r=>r.kind==="crevo"?openHose(r):r.kind==="sprej"?openSpray(r):openItem(r);
const cardFor=(r,i)=>cardEl(r,i);
document.addEventListener("click",e=>{
  const c=e.target.closest(".card[data-k]");
  if(c&&REG[c.dataset.k])openFor(REG[c.dataset.k]);
});
/* render grids (preskace se kada je stranica vec izradjena) */
function renderGrids(P){
  (P.secs||[]).forEach(id=>{
    const g=document.getElementById("grid-"+id);if(!g||g.children.length)return;
    g.innerHTML=PARTIS.gridHTML(D,id);
  });
}
function renderTiles(){
  const el=document.getElementById("tiles");if(!el||el.children.length)return;
  el.innerHTML=PARTIS.tilesHTML(D);
}

function poolImgs(ids){
  const s=new Set();
  ids.forEach(id=>{
    if(id==="sprej")SPRAYS.forEach(p=>p.img&&s.add(p.img));
    else if(id==="crevo"){HOSES.forEach(p=>p.img&&s.add(p.img));ITEMS.filter(x=>x.cat==="crevo"||(x.cats||[]).includes("crevo")).forEach(p=>p.img&&s.add(p.img));}
    else ITEMS.filter(x=>x.cat===id||(x.cats||[]).includes(id)).forEach(p=>{p.img&&s.add(p.img);(p.gal||[]).forEach(g=>g.img&&s.add(g.img));});
  });
  return [...s];
}
let ROT=[];
function startRotation(){
  ROT.forEach(t=>{clearTimeout(t);clearInterval(t);});ROT=[];
  const IMGU=window.PARTIS_IMGU||(u=>u);
  document.querySelectorAll(".tile[data-pool]").forEach((el,ti)=>{
    const box=el.querySelector(".tile-img"),pool=poolImgs(el.dataset.pool.split(","));
    if(pool.length<2)return;
    ROT.push(setTimeout(()=>ROT.push(setInterval(()=>{
      if(document.hidden)return;
      const cur=box.querySelector("img.on:last-of-type")||box.querySelector("img");
      const opts=pool.filter(u=>!cur||(cur.dataset.p||cur.src).slice(-u.length)!==u);
      const url=opts[Math.floor(Math.random()*opts.length)];
      const nx=new Image();
      nx.onload=()=>{
        nx.alt=el.querySelector("h3").textContent;box.appendChild(nx);
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          nx.classList.add("on");
          box.querySelectorAll("img.on").forEach(i=>{if(i!==nx)i.classList.remove("on");});
          setTimeout(()=>box.querySelectorAll("img:not(.on)").forEach(i=>i.remove()),1400);
        }));
      };
      nx.dataset.p=url;nx.src=IMGU(url);
    },5000)),ti*800));
  });
}
/* ================= FUZZY SEARCH ================= */
const norm=s=>String(s).toLowerCase().replace(/đ/g,"dj").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[×*]/g,"x").replace(/[^a-z0-9]+/g," ").trim();
const stem=w=>w.length>4?w.replace(/[aeiou]$/,""):w;
const SYN={sprej:["aerosol"],aerosol:["sprej"],spray:["sprej"],cev:["crev"],hose:["crev"],crev:["cev"],vijak:["sraf"],sraf:["vijak"],kompresor:["pneumatsk"],mast:["mazivo"],mazivo:["mast"],spojnic:["konektor","prikljucak"],konektor:["spojnic"],nipl:["nipla"],redukcij:["reducir"],reducir:["redukcij"]};
function lev(a,b,max){
  if(Math.abs(a.length-b.length)>max)return max+1;
  let prev=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    const cur=[i];let mn=i;
    for(let j=1;j<=b.length;j++){
      const v=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));cur.push(v);if(v<mn)mn=v;
    }
    if(mn>max)return max+1;prev=cur;
  }
  return prev[b.length];
}
const SKIP=new Set(["img","kind","id","cat","_k","price","promo","colLabel"]);
function collect(o,out){
  if(o==null)return;
  if(typeof o==="string"||typeof o==="number"){out.push(String(o));return;}
  if(Array.isArray(o)){o.forEach(x=>collect(x,out));return;}
  for(const k in o){
    if(SKIP.has(k))continue;
    if(k==="sizes"){o[k].forEach(x=>out.push(String(x[0])));continue;}
    collect(o[k],out);
  }
}
let SINDEX=null;
function buildIndex(){
  const recs=[...HOSES,...SPRAYS,...ITEMS];
  SINDEX=recs.map(r=>{
    const al=((typeof ALIASES!=="undefined"&&ALIASES[r.name])||[]);
    const nameW=norm(r.name+" "+al.join(" ")+" "+(r.eng||"")+" "+(r.catName||"")+" "+GROUP_OF(r)).split(" ").filter(Boolean).map(stem);
    const parts=[];collect(r,parts);
    const extraW=norm(parts.join(" ")).split(" ").filter(Boolean).map(stem);
    return {r,nameStr:norm(r.name+" "+al.join(" ")),nameW:[...new Set(nameW)],extraW:[...new Set(extraW)]};
  });
}
function tokScore(t,words,wName){
  let best=0;
  const flen=t.length;
  for(const w of words){
    let s=0;
    if(w===t)s=4;
    else if(flen>=3&&(w.startsWith(t)||(w.length>=3&&t.startsWith(w)&&flen-w.length<=2)))s=3;
    else if(flen>=4){
      const max=flen>=8?2:1;
      if(w[0]===t[0]&&lev(t,w,max)<=max)s=2;
      else if(w[0]===t[0]&&flen>=5&&w.length>flen&&lev(t,w.slice(0,flen),1)<=1)s=1.8;
      else if(flen>=4&&w.includes(t))s=1.5;
    }
    if(s>best)best=s;
    if(best===4)break;
  }
  return best*(wName?1.6:1);
}
function search(q){
  if(!SINDEX)buildIndex();
  const toks=norm(q).split(" ").filter(Boolean);
  if(!toks.length)return {exact:[],partial:[]};
  const stems=toks.map(stem);
  const exact=[],partial=[];
  const qn=norm(q);
  for(const e of SINDEX){
    let total=0,hits=0;
    for(const t of stems){
      let s=Math.max(tokScore(t,e.nameW,true),tokScore(t,e.extraW,false));
      if(s===0&&SYN[t])s=Math.max(...SYN[t].map(x=>Math.max(tokScore(x,e.nameW,true),tokScore(x,e.extraW,false))))*0.8;
      if(s>0){hits++;total+=s;}
    }
    if(!hits)continue;
    if(e.nameStr.includes(qn))total+=6;
    if(hits===stems.length)exact.push({r:e.r,s:total});
    else if(stems.length>1)partial.push({r:e.r,s:total});
  }
  const by=(a,b)=>b.s-a.s;
  return {exact:exact.sort(by).map(x=>x.r),partial:partial.sort(by).map(x=>x.r)};
}
function thumb(r){return r.img?`<img src="${r.img}" alt="">`:`<span class="sr-noimg"></span>`;}
function initSearch(form){
  const inp=form.querySelector("input"),drop=form.querySelector(".sr-drop");
  let sel=-1;
  const close=()=>{drop.hidden=true;sel=-1;};
  inp.addEventListener("input",()=>{
    const q=inp.value.trim();
    if(q.length<2){close();return;}
    const res=search(q),list=res.exact.length?res.exact:res.partial;
    if(!list.length){drop.innerHTML=`<div class="sr-empty">Nema rezultata za „${q.replace(/</g,"&lt;")}". Probajte kraći naziv ili dimenziju (npr. „spojnica", „M14", „8mm").</div>`;drop.hidden=false;return;}
    drop.innerHTML=(res.exact.length?"":`<div class="sr-note">Slični rezultati</div>`)+list.slice(0,6).map(r=>`<a class="sr-item" href="${pageOf(r)}#${r._k}">${thumb(r)}<span><b>${r.name}</b><small>${GROUP_OF(r)}</small></span></a>`).join("")+`<a class="sr-all" href="pretraga.html?q=${encodeURIComponent(q)}">Prikaži sve rezultate (${list.length}) →</a>`;
    drop.hidden=false;sel=-1;
  });
  inp.addEventListener("keydown",e=>{
    const items=[...drop.querySelectorAll(".sr-item")];
    if(e.key==="ArrowDown"&&items.length){e.preventDefault();sel=(sel+1)%items.length;}
    else if(e.key==="ArrowUp"&&items.length){e.preventDefault();sel=(sel-1+items.length)%items.length;}
    else if(e.key==="Enter"&&sel>=0){e.preventDefault();(window.PARTIS_GO?window.PARTIS_GO(items[sel].href):(location.href=items[sel].href));return;}
    else if(e.key==="Escape"){close();return;}
    else return;
    items.forEach((a,i)=>a.classList.toggle("on",i===sel));
  });
  document.addEventListener("click",e=>{if(!form.contains(e.target))close();});
  inp.addEventListener("focus",()=>{if(inp.value.trim().length>=2)inp.dispatchEvent(new Event("input"));});
}
function renderSearchPage(){
  const g=document.getElementById("grid-search");if(!g)return;
  const q=window.PARTIS_Q!=null?window.PARTIS_Q:(new URLSearchParams(location.search).get("q")||"");
  document.querySelectorAll(".search input").forEach(i=>i.value=q);
  const info=document.getElementById("search-info");
  if(!q.trim()){info.textContent="Unesite naziv artikla, dimenziju ili kategoriju.";return;}
  const res=search(q);
  const total=res.exact.length+res.partial.length;
  if(!total){info.innerHTML=`Nema rezultata za „<b>${q.replace(/</g,"&lt;")}</b>". Probajte kraći naziv ili dimenziju (npr. „spojnica", „M14", „8mm"), ili pozovite <a href="tel:+38118553800">018-553-800</a>.`;return;}
  info.innerHTML=res.exact.length?`<b>${res.exact.length}</b> rezultata za „${q.replace(/</g,"&lt;")}"`:`Nema tačnog podudaranja za „${q.replace(/</g,"&lt;")}" — prikazani su slični artikli.`;
  res.exact.forEach((r,i)=>g.appendChild(cardFor(r,i)));
  if(res.partial.length&&res.exact.length){
    const lab=document.getElementById("partial-label");lab.hidden=false;
    const g2=document.getElementById("grid-partial");res.partial.slice(0,24).forEach((r,i)=>g2.appendChild(cardFor(r,i)));
  }else if(res.partial.length){res.partial.slice(0,48).forEach((r,i)=>g.appendChild(cardFor(r,i)));}
}
/* init */
let P;
function initPage(){
  P=window.PAGE||{id:"home",secs:[]};
  const metaEl=document.getElementById("meta");
  if(metaEl&&P.id!=="search")metaEl.innerHTML=PARTIS.metaHTML(P,D);
  renderGrids(P);renderTiles();startRotation();renderSearchPage();
  document.querySelectorAll(".search").forEach(initSearch);
}
window.partisInitPage=initPage;
initPage();
function openFromHash(){
  const k=location.hash.slice(1);
  if(REG[k]){openFor(REG[k]);}
}
window.partisOpenKey=k=>{if(REG[k])openFor(REG[k]);};
if(!window.PARTIS_OFFLINE){openFromHash();window.addEventListener("hashchange",openFromHash);}
