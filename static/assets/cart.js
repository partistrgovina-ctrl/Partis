/* TODO: upisati ime radnje i broj telefona partnera za maloprodaju */
/* PARTIS — korpa za upit. Artikli se čuvaju u pregledaču; upit se šalje na mejl (PHP skripta porudzbina.php). */
(function(){
  const {fmt,esc}=PARTIS;
  const KEY="partis_korpa_v2";
  let cart=[];
  try{cart=JSON.parse(localStorage.getItem(KEY)||"[]");}catch(e){}
  const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cart));}catch(e){}};

  /* nalazi artikal po nazivu i dimenziji (kodovi se menjaju kada se artikli dodaju/parkiraju) */
  function find(n,l){
    const p=Object.values(REG).find(x=>x.name===n);if(!p)return null;
    if(p.kind==="crevo"){const v=p.variants.find(x=>x.dim===l);return v?{p,label:v.dim,price:v.price,unit:"m",sf:v.sf}:null;}
    if(p.kind==="sprej"){const o=p.opts.find(x=>x.pack===l);return o?{p,label:o.pack,price:o.price,unit:"kom",sf:o.sf}:null;}
    if(p.gal){const g=p.gal.find(x=>x.label===l);return g?{p,label:g.label,price:g.price,unit:"kom",sf:g.sf}:null;}
    return {p,label:"",price:p.price,unit:"kom",sf:p.sf};
  }
  function lines(){return cart.map(c=>{const r=find(c.n,c.l);if(!r)return null;const rb=PARTIS.rebateFor(r.p,window.REBATE);return {...r,c,rb,eff:r.price==null?null:PARTIS.discounted(r.price,rb)};}).filter(Boolean);}
  function clean(){cart=cart.filter(c=>find(c.n,c.l));save();}

  /* dugme u uglu */
  let btn=document.querySelector(".navbar .cart-nav");const hadBtn=!!btn;
  if(!btn)btn=document.createElement("button");
  btn.className="cart-float";btn.type="button";btn.setAttribute("aria-label","Otvori korpu");
  btn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 4h2.5l2.2 10.2a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6.2M10 20h.01M17 20h.01"/></svg><span>Korpa</span><b id="cart-n">0</b>';
  btn.onclick=openCart;btn.classList.add("cart-nav","show");if(!hadBtn)(document.querySelector(".navbar .nav-inner")||document.body).appendChild(btn);
  const toast=document.createElement("div");toast.className="cart-toast";toast.setAttribute("role","status");document.body.appendChild(toast);
  function badge(){
    const n=cart.reduce((a,c)=>a+c.q,0);
    document.getElementById("cart-n").textContent=n;btn.classList.toggle("show",n>0);
  }
  let tt;function say(t){toast.textContent=t;toast.classList.add("on");clearTimeout(tt);tt=setTimeout(()=>toast.classList.remove("on"),1800);}

  window.cartAdd=function(k,vi,q){
    q=Math.max(1,Math.min(99999,parseInt(q,10)||1));
    const p=REG[k];if(!p)return;
    let l="";
    if(p.kind==="crevo")l=p.variants[vi].dim;else if(p.kind==="sprej")l=p.opts[vi].pack;else if(p.gal)l=p.gal[vi].label;
    const ex=cart.find(c=>c.n===p.name&&c.l===l);
    if(ex)ex.q=Math.min(99999,ex.q+q);else cart.push({n:p.name,l,q});
    save();badge();say(q>1?`Dodato u korpu: ${q} kom ✓`:"Dodato u korpu ✓");
  };

  function totals(){
    let sum=0,upit=0,list=0;
    lines().forEach(x=>{if(x.price==null)upit++;else{sum+=x.eff*x.c.q;list+=x.price*x.c.q;}});
    return {sum,upit,list,rab:Math.max(0,list-sum)};
  }
  function orderText(){
    const t=totals();
    const rows=lines().map((x,i)=>`${i+1}. ${x.sf?"["+x.sf+"] ":""}${x.p.name}${x.label?" — "+x.label:""} — ${x.c.q} ${x.unit}`+(x.price==null?" — cena na upit":` × ${fmt(x.eff)}${x.rb?` (cenovnik ${fmt(x.price)}, rabat ${x.rb}%)`:""} = ${fmt(x.eff*x.c.q)} RSD`));
    const pd=PARTIS.gross(t.sum)-t.sum;return rows.join("\n")+(hasR()?`\n\nIznos po cenovniku: ${fmt(t.list)} RSD\nRabat: −${fmt(t.rab)} RSD`:"")+`\n\nIznos bez PDV-a${hasR()?" (sa rabatom)":""}: ${fmt(t.sum)} RSD\nPDV (${PARTIS.VAT}%): ${fmt(pd)} RSD\nUkupno sa PDV-om: ${fmt(t.sum+pd)} RSD`+(t.upit?` (+ ${t.upit} ${(n=>{const m=n%100,d=n%10;return (d===1&&m!==11)?"stavka":(d>=2&&d<=4&&(m<12||m>14))?"stavke":"stavki"})(t.upit)} sa cenom na upit)`:"");
  }
  const hasR=()=>lines().some(x=>x.rb>0);
  function acctLine(){
    if(window.CUSTOMER)return "";
    if(window.PARTIS_ACCOUNTS)return `<div class="cart-acct">Imate nalog? <a href="#" onclick="event.preventDefault();partisAuth('login')">Prijavite se</a> da vidite svoj rabat.</div>`;
    return "";
  }
  function listHTML(){
    const L=lines();
    if(!L.length)return `<p class="cart-empty">Korpa je prazna. Izaberite artikal i kliknite „+ U korpu".</p>`;
    const t=totals();
    return `<div class="tbl-wrap"><table class="cart-t"><thead><tr><th>Artikal</th><th>Količina</th><th>Cena (bez PDV-a)</th><th></th></tr></thead><tbody>${L.map((x,i)=>`<tr><td><b>${esc(x.p.name)}</b>${x.label?`<small class="cart-l">${esc(x.label)}</small>`:""}</td><td><div class="qty"><button type="button" onclick="cartQty(${i},-1)" aria-label="Manje">−</button><span>${x.c.q} ${x.unit}</span><button type="button" onclick="cartQty(${i},1)" aria-label="Više">+</button></div></td><td class="price">${x.price==null?"Cena na upit":x.rb?`<s class="old">${fmt(x.price*x.c.q)}</s> <b class="newp">${fmt(x.eff*x.c.q)}</b> <small>RSD · −${x.rb}%</small>`:`${fmt(x.price*x.c.q)} <small>RSD</small>`}</td><td><button type="button" class="cart-x" onclick="cartDel(${i})" aria-label="Ukloni">✕</button></td></tr>`).join("")}</tbody></table></div>
    ${acctLine()}<div class="cart-sum">${hasR()?`<div class="cs-r"><span>Iznos po cenovniku</span><b>${fmt(t.list)} RSD</b></div><div class="cs-r cs-rab"><span>Vaš rabat</span><b>−${fmt(t.rab)} RSD</b></div>`:""}<div class="cs-r"><span>Iznos bez PDV-a${hasR()?" (sa vašim rabatom)":""}</span><b>${fmt(t.sum)} RSD</b></div><div class="cs-r"><span>PDV (${PARTIS.VAT}%)</span><b>${fmt(PARTIS.gross(t.sum)-t.sum)} RSD</b></div><div class="cs-r cs-t"><span>Ukupno sa PDV-om</span><b>${fmt(PARTIS.gross(t.sum))} RSD</b></div>${t.upit?`<small>+ ${t.upit} ${(n=>{const m=n%100,d=n%10;return (d===1&&m!==11)?"stavka":(d>=2&&d<=4&&(m<12||m>14))?"stavke":"stavki"})(t.upit)} sa cenom na upit — cenu potvrđujemo u odgovoru.</small>`:""}</div>`;
  }
  const lineIdx=i=>{const L=lines();return L[i]?cart.indexOf(L[i].c):-1;};
  window.cartQty=function(i,d){const j=lineIdx(i);if(j<0)return;cart[j].q=Math.max(1,cart[j].q+d);save();badge();refresh();};
  window.cartDel=function(i){const j=lineIdx(i);if(j<0)return;cart.splice(j,1);save();badge();refresh();};
  function refresh(){const el=document.getElementById("cart-list");if(!el)return;el.innerHTML=listHTML();const f=document.getElementById("cart-form");if(f)f.hidden=!cart.length;}

  modal.addEventListener("click",function(e){const a=e.target.closest("a[href]");if(a&&modal.querySelector(".cart-box")){overlay.classList.remove("open");document.body.style.overflow="";const h=(a.getAttribute("href")||"").split("#")[1];const t=h&&/informacije/.test(location.pathname)&&document.getElementById(h);if(t){e.preventDefault();history.replaceState(null,"",location.pathname+"#"+h);requestAnimationFrame(function(){requestAnimationFrame(function(){t.scrollIntoView({block:"start"});});});}}});
  function openCart(){
    clean();badge();
    modal.className="modal cartm";
    modal.innerHTML=`<button class="m-close" onclick="closeModal()">✕</button>
    <div class="m-content cart-box">
      <div class="eng">Upit za ponudu</div><h2>Korpa</h2>
      <div id="cart-list">${listHTML()}</div>
      <form id="cart-form" class="cart-form" ${cart.length?"":"hidden"} onsubmit="return cartSend(event)">
        <div class="m-sub">Podaci za odgovor i isporuku</div>
        <p class="cart-note">Ovo je upit, ne i obavezujuća kupovina. Javljamo vam se sa potvrdom cena i dostupnosti. Poštarinu plaćamo za pošiljke čija vrednost prelazi 10.000 dinara.</p>
        <p class="cart-note"><b>Prodaja samo pravnim licima i preduzetnicima — firma i PIB su obavezni.</b></p>
        <div class="f-grid">
          <label>Ime i prezime *<input name="ime" required autocomplete="name" value="${esc((window.CUSTOMER||{}).ime||"")}"></label>
          <label>Firma *<input name="firma" required autocomplete="organization" value="${esc((window.CUSTOMER||{}).firma||"")}"></label>
          <label>PIB *<input name="pib" required inputmode="numeric" maxlength="9" pattern="[0-9]{9}" autocomplete="off" placeholder="9 cifara" title="PIB ima 9 cifara"></label>
          <p class="cart-note wide cart-partners">Niste registrovano pravno lice? <a href="informacije#partneri">Kliknite ovde</a> da vidite spisak naših poslovnih partnera.<br>Napomena: ne znamo i ne odgovaramo za cene po kojima prodaju naše artikle.</p>
          <label>Telefon *<input name="telefon" type="tel" required autocomplete="tel" value="${esc((window.CUSTOMER||{}).telefon||"")}"></label>
          <label>Mejl *<input name="email" type="email" required autocomplete="email" value="${esc((window.CUSTOMER||{}).email||"")}"></label>
          <label class="wide">Adresa za isporuku *<input name="adresa" required autocomplete="street-address" value="${esc((window.CUSTOMER||{}).adresa||"")}" placeholder="Ulica i broj, mesto, poštanski broj"></label>
          <label class="wide">Napomena<textarea name="napomena" rows="3"></textarea></label>
          <label class="hp" aria-hidden="true">Ne popunjavati<input name="bot-field" tabindex="-1" autocomplete="off"></label>
        </div>
        <div id="cart-err" class="cart-err" hidden></div>
        <button class="cart-send" type="submit">Pošalji upit</button>
      </form>
    </div>`;
    show();
  }

  window.cartSend=function(e){
    e.preventDefault();
    const f=document.getElementById("cart-form"),fd=new FormData(f),err=document.getElementById("cart-err"),b=f.querySelector(".cart-send");
    if(!cart.length)return false;
    if(fd.get("bot-field"))return false;
    const text=orderText();
    const _t=totals(),_pd=PARTIS.gross(_t.sum)-_t.sum;
    const stavke=JSON.stringify(lines().map(x=>({s:x.sf||"",n:x.p.name,l:x.label||"",q:x.c.q,u:x.unit||"",cena:x.price,eff:x.eff,rb:x.rb||0}))),ukupno=JSON.stringify({sum:_t.sum,pdv:_pd,total:_t.sum+_pd,upit:_t.upit,rabat:hasR(),list:_t.list,rabIznos:_t.rab});
    const data={stavke,ukupno,"form-name":"porudzbenica",ime:fd.get("ime"),firma:fd.get("firma")||"",pib:fd.get("pib")||"",telefon:fd.get("telefon"),email:fd.get("email"),adresa:fd.get("adresa"),napomena:fd.get("napomena")||"","bot-field":"",porudzbina:text,kupac:window.CUSTOMER?`${window.CUSTOMER.email} (registrovan kupac)`:"gost (bez naloga)",rabati:window.CUSTOMER?JSON.stringify(window.REBATE||{}):""};
    if(window.PARTIS_OFFLINE){offlineSend(data,text);return false;}
    b.disabled=true;b.textContent="Šaljem…";err.hidden=true;
    fetch(/netlify\.app$/.test(location.hostname)?"/":"porudzbina.php",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(data).toString()})
    .then(r=>{if(!r.ok)throw new Error(r.status);
      cart=[];save();badge();
      document.querySelector(".cart-box").innerHTML=`<div class="eng">Upit za ponudu</div><h2>Hvala!</h2><p class="m-lead">Vaš upit je poslat. Javićemo vam se na broj ${esc(data.telefon)} ili na ${esc(data.email)} sa potvrdom cena i dostupnosti.</p><button class="cart-send" type="button" onclick="closeModal()">Zatvori</button>`;})
    .catch(()=>{
      const mail="mailto:partis.trgovina@gmail.com?subject="+encodeURIComponent("Upit sa sajta — "+data.ime)+"&body="+encodeURIComponent(`${text}\n\nIme: ${data.ime}\nFirma: ${data.firma}\nPIB: ${data.pib}\nTelefon: ${data.telefon}\nMejl: ${data.email}\nAdresa: ${data.adresa}\nNapomena: ${data.napomena}`);
      err.innerHTML=`Slanje nije uspelo. Pokušajte ponovo, pozovite <a href="tel:+38118553800">+381 18 553 800</a> ili <a href="${mail}">pošaljite upit iz vašeg mejla</a>.`;err.hidden=false;
      b.disabled=false;b.textContent="Pošalji upit";
    });
    return false;
  };

  /* ===== OFFLINE VARIJANTA: mejl se priprema u kupčevom mejl programu ===== */
  const SHOP="partis.trgovina@gmail.com";
  function offlineBody(d,text,short){
    return `Poštovani,\n\nŠaljem upit za ponudu iz PARTIS kataloga.\n\n`+
      `Ime: ${d.ime}\nFirma: ${d.firma}\nPIB: ${d.pib||""}\nTelefon: ${d.telefon}\nMejl: ${d.email}\nAdresa: ${d.adresa}\nNapomena: ${d.napomena}\n\n`+
      (short?`Spisak artikala je u priloženom fajlu PARTIS-upit.txt (molim vas da ga priložite uz ovaj mejl) ili ga nalepite ovde (Ctrl+V).\n`:`UPIT:\n${text}\n`)+`\nHvala.`;
  }
  function offlineSend(d,text){
    const subj="Upit iz PARTIS kataloga — "+d.ime;
    const full=offlineBody(d,text,false);
    const mailtoFull="mailto:"+SHOP+"?subject="+encodeURIComponent(subj)+"&body="+encodeURIComponent(full);
    const tooLong=mailtoFull.length>1800;
    const mailto=tooLong?"mailto:"+SHOP+"?subject="+encodeURIComponent(subj)+"&body="+encodeURIComponent(offlineBody(d,text,true)):mailtoFull;
    const gmail="https://mail.google.com/mail/?view=cm&fs=1&to="+SHOP+"&su="+encodeURIComponent(subj)+"&body="+encodeURIComponent(tooLong?offlineBody(d,text,true):full);
    const file="PARTIS UPIT\n"+new Date().toLocaleString("sr-RS")+"\n\n"+full.replace(/^Poštovani,\n\n/,"");
    window._partisOff={full,file,subj,mailto,gmail,tooLong};
    if(tooLong)offlineDownload();
    if(tooLong)offlineCopy(true);
    document.querySelector(".cart-box").innerHTML=`<div class="eng">Upit za ponudu</div><h2>Još samo jedan korak</h2>
      <p class="m-lead">Upit je pripremljen. Otvorite ga u svom mejl programu i pritisnite <b>Pošalji</b> — ništa ne morate da prepisujete.</p>
      <a class="cart-send" href="${mailto}" onclick="cartDone()" style="display:block;text-align:center;text-decoration:none">1. Otvori mejl (pripremljen upit)</a>
      <a class="cart-alt" href="${gmail}" target="_blank" rel="noopener" onclick="cartDone()">Koristim Gmail u pregledaču — otvori u Gmail-u</a>
      <p class="cart-alt-t">Ako se ništa ne otvori:</p>
      <div class="cart-alts"><button type="button" onclick="offlineCopy()">Kopiraj tekst upita</button><button type="button" onclick="offlineDownload()">Preuzmi upit (.txt)</button></div>
      ${tooLong?`<p class="m-lead" style="margin-top:10px">Upit je dugačak: preuzet je fajl <b>PARTIS-upit.txt</b> i tekst je kopiran. Priložite fajl uz mejl ili nalepite tekst (Ctrl+V).</p>`:""}
      <p class="m-lead" style="margin-top:10px">Mejl ide na <b>${SHOP}</b>. Možete nas i pozvati: <a href="tel:+38118553800">+381 18 553 800</a>.</p>
      <div id="cart-note" class="m-lead" aria-live="polite"></div>
      <button class="cart-send" type="button" style="margin-top:10px;background:none;color:inherit;border:1px solid currentColor" onclick="closeModal()">Zatvori</button>`;
  }
  window.cartDone=function(){};
  window.offlineCopy=function(silent){
    const t=window._partisOff.full,n=document.getElementById("cart-note");
    const ok=()=>{if(n&&!silent)n.textContent="Tekst je kopiran. Nalepite ga u mejl (Ctrl+V).";};
    const fb=()=>{const ta=document.createElement("textarea");ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");ok();}catch(e){}ta.remove();};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(ok,fb);else fb();
  };
  window.offlineDownload=function(){
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([window._partisOff.file],{type:"text/plain;charset=utf-8"}));
    a.download="PARTIS-upit.txt";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
  };
  window.addEventListener("partis-account",()=>{badge();if(document.getElementById("cart-list"))refresh();});
  badge();
})();
