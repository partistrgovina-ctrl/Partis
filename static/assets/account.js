/* PARTIS — nalozi kupaca (registracija, prijava, rabati). Radi samo kada je u config.js upisan Supabase. */
(function(){
  const cfg=window.PARTIS_CFG||{};
  if(!cfg.supabaseUrl||!cfg.supabaseKey)return;           /* bez podešavanja sajt radi kao pre */
  window.PARTIS_ACCOUNTS=true;
  const {esc}=PARTIS;
  let sb=null,profile=null,recovery=false;

  /* ---------- dugme u zaglavlju i traka ---------- */
  let box=document.querySelector(".head-inner .acct");
  if(!box){box=document.createElement("div");box.className="acct";const head=document.querySelector(".head-inner");if(head)head.appendChild(box);}
  const bar=document.createElement("div");bar.className="acct-bar";bar.hidden=true;
  const hd=document.querySelector("header");if(hd)hd.insertAdjacentElement("afterend",bar);

  const hasSb=()=>{try{return Object.keys(localStorage).some(k=>k.startsWith("sb-"));}catch(e){return false;}};
  let cachedName=null;try{const c=JSON.parse(localStorage.getItem("partis_acct")||"null");if(c&&c.n&&hasSb())cachedName=c.n;}catch(e){}
  const inHTML=n=>`<span class="acct-name">${esc(n)}</span><a class="acct-b alt" href="/nalog">Vaš nalog</a><a class="acct-b" href="/nalog/porudzbine/">Moje porudžbine</a><button type="button" class="acct-b" id="acOut">Odjava</button>`;
  function paint(){
    if(!profile&&cachedName){box.innerHTML=inHTML(cachedName);box.querySelector("#acOut").onclick=logout;bar.hidden=true;bar.innerHTML="";return;}
    if(profile){
      box.innerHTML=`<span class="acct-name">${esc(profile.ime||profile.email)}</span><a class="acct-b alt" href="/nalog">Vaš nalog</a><a class="acct-b" href="/nalog/porudzbine/">Moje porudžbine</a><button type="button" class="acct-b" id="acOut">Odjava</button>`;
      box.querySelector("#acOut").onclick=logout;
      const rs=PARTIS.GROUPS.map(([k,n])=>[n,(profile.rabati||{})[k]]).filter(x=>x[1]>0).map(x=>`${esc(x[0])} <b>${x[1]}%</b>`);
      const all=(profile.rabati||{}).svi>0?`opšti <b>${profile.rabati.svi}%</b>`:"";
      const txt=[...rs,all].filter(Boolean).join(" · ");
      bar.hidden=true;bar.innerHTML="";
    }else{
      box.innerHTML=`<button type="button" class="acct-b" onclick="partisAuth('login')">Prijava</button><button type="button" class="acct-b alt" onclick="partisAuth('register')">Registracija</button>`;
      bar.hidden=true;bar.innerHTML="";
    }
  }
  paint();

  /* ---------- učitavanje Supabase ---------- */
  function loadLib(){
    return new Promise((res,rej)=>{
      if(window.supabase)return res();
      const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js";
      s.onload=res;s.onerror=()=>rej(new Error("Servis za naloge trenutno nije dostupan."));document.head.appendChild(s);
    });
  }
  async function client(){
    if(sb)return sb;
    await loadLib();
    sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true}});
    sb.auth.onAuthStateChange((ev,session)=>{
      if(ev==="PASSWORD_RECOVERY"){recovery=true;partisAuth("newpass");}
      else if(ev==="SIGNED_OUT"){apply(null);}
    });
    return sb;
  }
  function apply(p){
    profile=p&&p.odobren?p:null;cachedName=null;
    try{if(profile)localStorage.setItem("partis_acct",JSON.stringify({n:profile.ime||profile.email,p:{ime:profile.ime,firma:profile.firma,pib:profile.pib,telefon:profile.telefon,email:profile.email,adresa:profile.adresa,rabati:profile.rabati||{}}}));else localStorage.removeItem("partis_acct");}catch(e){}
    window.CUSTOMER=profile;window.REBATE=profile?(profile.rabati||{}):null;
    paint();window.dispatchEvent(new Event("partis-account"));
    /* ako je artikal otvoren, ponovo ga iscrtaj sa novim cenama */
    try{if((overlay.classList.contains("open")||PG)&&curItem&&modal.querySelector(".tbl-wrap")&&!document.getElementById("cart-list")){const p=curItem;if(p.kind==="crevo")openHose(p);else if(p.kind==="sprej")openSpray(p);else openItem(p);}}catch(e){}
  }
  async function fetchProfile(){
    const c=await client();
    const {data:{session}}=await c.auth.getSession();
    if(!session)return null;
    const {data,error}=await c.from("profili").select("*").eq("id",session.user.id).single();
    if(error)return null;
    return data;
  }
  async function init(){
    try{
      const p=await fetchProfile();
      if(p&&!p.odobren){await sb.auth.signOut();apply(null);return;}
      apply(p);
    }catch(e){/* nema veze — sajt radi bez naloga */}
  }
  /* oporavak lozinke vraća kupca na sajt sa tokenom u adresi; inače proveravamo samo ako postoji sačuvana sesija */
  try{
    if(/type=recovery/.test(location.hash))client().catch(()=>{});
    else if(Object.keys(localStorage).some(k=>k.startsWith("sb-")))init();
  }catch(e){}

  /* ---------- prozor za prijavu / registraciju ---------- */
  const tabs=m=>`<div class="seg acct-tabs"><button type="button" class="seg-btn${m==="login"?" on":""}" onclick="partisAuth('login')">Prijava</button><button type="button" class="seg-btn${m==="register"?" on":""}" onclick="partisAuth('register')">Registracija</button></div>`;
  window.partisAuth=function(mode){
    modal.className="modal cartm acctm";
    let inner="";
    if(mode==="login")inner=`${tabs("login")}
      <form id="acForm" class="cart-form" onsubmit="return partisLogin(event)">
        <div class="f-grid"><label class="wide">Mejl<input name="email" type="email" required autocomplete="email"></label>
        <label class="wide">Lozinka<input name="pass" type="password" required autocomplete="current-password"></label></div>
        <div id="acErr" class="cart-err" hidden></div>
        <button class="cart-send" type="submit">Prijavi me</button>
        <p class="cart-note"><a href="#" onclick="event.preventDefault();partisAuth('forgot')">Zaboravili ste lozinku?</a></p>
      </form>`;
    else if(mode==="register")inner=`${tabs("register")}
      <p class="cart-note"><b>Prodaja samo pravnim licima i preduzetnicima — firma i PIB su obavezni.</b></p>
      <p class="cart-note">Registrovani kupci dobijaju svoje rabate. <b>Nalog aktivira prodavnica</b> — kada ga odobrimo, možete da se prijavite. Javljamo se na mejl ili telefon.</p>
      <form id="acForm" class="cart-form" onsubmit="return partisRegister(event)">
        <div class="f-grid">
          <label>Ime i prezime *<input name="ime" required autocomplete="name"></label>
          <label>Firma *<input name="firma" required autocomplete="organization"></label>
          <label>PIB *<input name="pib" required inputmode="numeric" maxlength="9" pattern="[0-9]{9}" autocomplete="off" placeholder="9 cifara" title="PIB ima 9 cifara"></label>
          <label>Telefon *<input name="telefon" type="tel" required autocomplete="tel"></label>
          <label>Mejl *<input name="email" type="email" required autocomplete="email"></label>
          <label class="wide">Adresa *<input name="adresa" required autocomplete="street-address" placeholder="Ulica i broj, mesto, poštanski broj"></label>
          <label class="wide">Lozinka * (najmanje 8 znakova)<input name="pass" type="password" required minlength="8" autocomplete="new-password"></label>
        </div>
        <label class="chk"><input type="checkbox" name="saglasan" required> Saglasan/saglasna sam da PARTIS obrađuje moje podatke radi vođenja naloga i porudžbina, u skladu sa <a href="privatnost.html" target="_blank" rel="noopener">politikom privatnosti</a>.</label>
        <div id="acErr" class="cart-err" hidden></div>
        <button class="cart-send" type="submit">Pošalji zahtev za nalog</button>
      </form>`;
    else if(mode==="forgot")inner=`<p class="cart-note">Upišite mejl naloga. Poslaćemo vam vezu za novu lozinku.</p>
      <form id="acForm" class="cart-form" onsubmit="return partisForgot(event)"><div class="f-grid"><label class="wide">Mejl<input name="email" type="email" required></label></div>
      <div id="acErr" class="cart-err" hidden></div><button class="cart-send" type="submit">Pošalji</button></form>`;
    else if(mode==="newpass")inner=`<p class="cart-note">Upišite novu lozinku.</p>
      <form id="acForm" class="cart-form" onsubmit="return partisNewPass(event)"><div class="f-grid"><label class="wide">Nova lozinka (najmanje 8 znakova)<input name="pass" type="password" required minlength="8" autocomplete="new-password"></label></div>
      <div id="acErr" class="cart-err" hidden></div><button class="cart-send" type="submit">Sačuvaj lozinku</button></form>`;
    modal.innerHTML=`<button class="m-close" onclick="closeModal()">✕</button><div class="m-content cart-box"><div class="eng">Nalog kupca</div><h2>${mode==="register"?"Registracija":mode==="forgot"||mode==="newpass"?"Lozinka":"Prijava"}</h2>${inner}</div>`;
    show();
  };
  const err=t=>{const e=document.getElementById("acErr");if(e){e.textContent=t;e.hidden=!t;}};
  const busy=(f,on,t)=>{const b=f.querySelector(".cart-send");b.disabled=on;if(t)b.textContent=t;};
  const msg=t=>document.querySelector(".cart-box").innerHTML=`<div class="eng">Nalog kupca</div><h2>Hvala!</h2><p class="m-lead">${t}</p><button class="cart-send" type="button" onclick="closeModal()">Zatvori</button>`;
  const nice=m=>/Invalid login/i.test(m)?"Pogrešan mejl ili lozinka.":/already registered|already been registered/i.test(m)?"Nalog sa ovim mejlom već postoji.":/Password should/i.test(m)?"Lozinka mora imati najmanje 8 znakova.":/rate limit|too many/i.test(m)?"Previše pokušaja. Pokušajte malo kasnije.":/fetch|network/i.test(m)?"Nema veze sa serverom. Pokušajte ponovo.":m;

  window.partisLogin=async function(e){
    e.preventDefault();const f=e.target,fd=new FormData(f);err("");busy(f,true,"Prijavljujem…");
    try{
      const c=await client();
      const {error}=await c.auth.signInWithPassword({email:fd.get("email").trim(),password:fd.get("pass")});
      if(error)throw error;
      const p=await fetchProfile();
      if(!p||!p.odobren){await c.auth.signOut();apply(null);busy(f,false,"Prijavi me");err("Vaš nalog još nije odobren. Javićemo vam se čim ga aktiviramo, ili nas pozovite: +381 18 553 800.");return false;}
      apply(p);closeModal();
    }catch(x){busy(f,false,"Prijavi me");err(nice(x.message||String(x)));}
    return false;
  };
  window.partisRegister=async function(e){
    e.preventDefault();const f=e.target,fd=new FormData(f);err("");busy(f,true,"Šaljem…");
    try{
      const c=await client();
      const {data,error}=await c.auth.signUp({email:fd.get("email").trim(),password:fd.get("pass"),options:{data:{ime:fd.get("ime").trim(),firma:(fd.get("firma")||"").trim(),pib:(fd.get("pib")||"").trim(),telefon:fd.get("telefon").trim(),adresa:fd.get("adresa").trim()}}});
      if(error)throw error;
      if(data&&data.session)await c.auth.signOut();   /* dok nalog ne odobrimo, nema prijave */
      apply(null);
      msg("Vaš zahtev za nalog je primljen. Kada ga odobrimo, javićemo vam se na mejl ili telefon i moći ćete da se prijavite. Do tada kupujete po redovnim cenama.");
    }catch(x){busy(f,false,"Pošalji zahtev za nalog");err(nice(x.message||String(x)));}
    return false;
  };
  window.partisForgot=async function(e){
    e.preventDefault();const f=e.target,fd=new FormData(f);err("");busy(f,true,"Šaljem…");
    try{const c=await client();const {error}=await c.auth.resetPasswordForEmail(fd.get("email").trim(),{redirectTo:location.origin+location.pathname});if(error)throw error;
      msg("Ako nalog postoji, poslali smo vezu za novu lozinku na taj mejl.");}
    catch(x){busy(f,false,"Pošalji");err(nice(x.message||String(x)));}
    return false;
  };
  window.partisNewPass=async function(e){
    e.preventDefault();const f=e.target,fd=new FormData(f);err("");busy(f,true,"Čuvam…");
    try{const c=await client();const {error}=await c.auth.updateUser({password:fd.get("pass")});if(error)throw error;
      history.replaceState(null,"",location.pathname+location.search);msg("Lozinka je promenjena. Možete da se prijavite.");await c.auth.signOut();apply(null);}
    catch(x){busy(f,false,"Sačuvaj lozinku");err(nice(x.message||String(x)));}
    return false;
  };

  /* ---------- istorija porudžbina (čuva se uz nalog) ---------- */
  window.partisSaveOrder=async function(row){
    try{if(!profile)return;const c=await client();const {data:{session}}=await c.auth.getSession();if(!session)return;
      const base={user_id:session.user.id,stavke:row.stavke,ukupno:row.ukupno,dostava:row.dostava||null,napomena:row.napomena||null};
      const r=await c.from("porudzbine").insert({...base,predracun:{ukljuci:row.stavke.map((x,i)=>x.eff!=null?i:-1).filter(i=>i>=0),napomena:""}});
      if(r&&r.error)await c.from("porudzbine").insert(base);}catch(e){}
  };

  /* ---------- stranica „Vaš nalog" ---------- */
  const NP=document.getElementById("nalog-page");
  const fmtD=d=>{try{return new Date(d).toLocaleString("sr-Latn-RS",{day:"numeric",month:"numeric",year:"numeric",hour:"2-digit",minute:"2-digit"});}catch(e){return d;}};
  async function renderNalog(){
    if(!NP)return;
    const P=profile||(cachedName?window.CUSTOMER:null);
    if(!P){NP.innerHTML=`<div class="m-content cart-box"><div class="eng">Nalog kupca</div><h2>Vaš nalog</h2><p class="m-lead">Prijavite se da vidite i menjate svoje podatke i pregledate prethodne porudžbine.</p><button class="cart-send" type="button" onclick="partisAuth('login')">Prijava</button></div>`;return;}
    NP.innerHTML=`<div class="m-content cart-box">
      <div class="eng">Nalog kupca</div><h2>Vaš nalog</h2>
      ${navTabs("nalog")}
      <div class="m-sub">Moji podaci</div>
      <form id="nalForm" class="cart-form" onsubmit="return partisSaveProfile(event)">
        <div class="f-grid">
          <label>Ime i prezime *<input name="ime" required value="${esc(P.ime||"")}" autocomplete="name"></label>
          <label>Firma *<input name="firma" required value="${esc(P.firma||"")}" autocomplete="organization"></label>
          <label>PIB *<input name="pib" required inputmode="numeric" maxlength="9" pattern="[0-9]{9}" value="${esc(P.pib||"")}" placeholder="9 cifara"></label>
          <label>Telefon *<input name="telefon" type="tel" required value="${esc(P.telefon||"")}" autocomplete="tel"></label>
          <label class="wide">Adresa sedišta *<input name="adresa" required value="${esc(P.adresa||"")}" autocomplete="street-address"></label>
          <label class="wide">Mejl (prijava)<input value="${esc(P.email||"")}" disabled></label>
        </div>
        <div id="nalMsg" class="cart-err" hidden></div>
        <button class="cart-send" type="submit">Sačuvaj izmene</button>
      </form>
      <form id="passForm" class="cart-form" onsubmit="return partisChangePass(event)" style="margin-top:26px">
        <div class="m-sub">Promena lozinke</div>
        <div class="f-grid">
          <label>Nova lozinka * (najmanje 8 znakova)<input name="pass" type="password" required minlength="8" autocomplete="new-password"></label>
          <label>Ponovite lozinku *<input name="pass2" type="password" required minlength="8" autocomplete="new-password"></label>
        </div>
        <div id="passMsg" class="cart-err" hidden></div>
        <button class="cart-send" type="submit">Promeni lozinku</button>
        <p class="cart-note">Ako ste zaboravili lozinku, na prijavi izaberite „Zaboravili ste lozinku?“ i sami ćete dobiti vezu na mejl.</p>
      </form>
    </div>`;
  }
  window.partisChangePass=async function(e){
    e.preventDefault();const f=e.target,fd=new FormData(f),m=document.getElementById("passMsg"),b=f.querySelector(".cart-send");
    m.hidden=true;m.style.color="";
    if(fd.get("pass")!==fd.get("pass2")){m.textContent="Lozinke se ne poklapaju.";m.hidden=false;return false;}
    b.disabled=true;b.textContent="Čuvam…";
    try{const c=await client();const {error}=await c.auth.updateUser({password:fd.get("pass")});if(error)throw error;
      f.reset();m.textContent="Lozinka je promenjena.";m.style.color="#1f8a4c";m.hidden=false;}
    catch(x){m.textContent=nice(x.message||String(x));m.hidden=false;}
    b.disabled=false;b.textContent="Promeni lozinku";return false;
  };
  window.partisSaveProfile=async function(e){
    e.preventDefault();const f=e.target,fd=new FormData(f),m=document.getElementById("nalMsg"),b=f.querySelector(".cart-send");
    b.disabled=true;b.textContent="Čuvam…";m.hidden=true;m.style.color="";
    try{
      const c=await client();
      const v={p_ime:fd.get("ime").trim(),p_firma:fd.get("firma").trim(),p_pib:fd.get("pib").trim(),p_telefon:fd.get("telefon").trim(),p_adresa:fd.get("adresa").trim()};
      const {error}=await c.rpc("azuriraj_profil",v);
      if(error)throw error;
      if(profile)Object.assign(profile,{ime:v.p_ime,firma:v.p_firma,pib:v.p_pib,telefon:v.p_telefon,adresa:v.p_adresa});window.CUSTOMER=profile||Object.assign({},window.CUSTOMER,{ime:v.p_ime,firma:v.p_firma,pib:v.p_pib,telefon:v.p_telefon,adresa:v.p_adresa});paint();
      m.textContent="Podaci su sačuvani.";m.style.color="#1f8a4c";m.hidden=false;
    }catch(x){m.textContent="Čuvanje nije uspelo. Pokušajte ponovo ili nas pozovite: +381 18 553 800.";m.hidden=false;}
    b.disabled=false;b.textContent="Sačuvaj izmene";return false;
  };
  const navTabs=a=>`<div class="nal-tabs"><a href="/nalog"${a==="nalog"?' class="on"':""}>Vaš nalog</a><a href="/nalog/porudzbine/"${a==="porudzbine"?' class="on"':""}>Moje porudžbine</a></div>`;
  const OP=document.getElementById("porud-page");
  const STAT={poslato:"Upit primljen",obrada:"U obradi",poslato_kupcu:"Poslato",isporuceno:"Isporučeno"};
  async function renderOrders(){
    if(!OP)return;
    if(!profile&&!cachedName){OP.innerHTML=`<div class="m-content cart-box"><div class="eng">Nalog kupca</div><h2>Moje porudžbine</h2><p class="m-lead">Prijavite se da pregledate svoje porudžbine.</p><button class="cart-send" type="button" onclick="partisAuth('login')">Prijava</button></div>`;return;}
    OP.innerHTML=`<div class="m-content cart-box"><div class="eng">Nalog kupca</div><h2>Moje porudžbine</h2>${navTabs("porudzbine")}<div id="nalOrders"><p class="cart-note">Učitavam…</p></div></div>`;
    loadOrders();
  }
  let ORD=[];
  async function loadOrders(){
    const el=document.getElementById("nalOrders");if(!el)return;
    try{
      const c=await client();
      const {data,error}=await c.from("porudzbine").select("*").order("created_at",{ascending:false}).limit(100);
      if(error)throw error;
      ORD=data||[];
      if(!ORD.length){el.innerHTML=`<p class="cart-note">Još nema porudžbina poslatih sa ovog naloga.</p>`;return;}
      el.innerHTML=ORD.map((o,i)=>{
        const st=Array.isArray(o.stavke)?o.stavke:[];const u=o.ukupno||{};
        const nema=st.filter(x=>x.nema).length;
        return `<details class="ord"><summary><b>${esc(fmtD(o.created_at))}</b> · ${st.length} ${st.length===1?"stavka":"stavki"}${u.total!=null?` · ${PARTIS.fmt(u.total)} RSD sa PDV-om`:""} <span class="ord-st st-${esc(o.status||"poslato")}">${esc(STAT[o.status]||STAT.poslato)}</span>${nema?` <span class="ord-nema">${nema} nema na stanju</span>`:""}</summary>
          <div class="tbl-wrap"><table class="cart-t"><thead><tr><th>Artikal</th><th>Količina</th></tr></thead><tbody>${st.map(x=>`<tr><td><b>${esc(x.n||"")}</b>${x.l?`<small class="cart-l">${esc(x.l)}</small>`:""}${x.nema?` <span class="ord-nema">Nema na stanju</span>`:""}</td><td>${esc(String(x.q))} ${esc(x.u||"")}</td></tr>`).join("")}</tbody></table></div>
          ${o.dostava?`<p class="cart-note"><b>Isporuka:</b> ${esc(o.dostava)}</p>`:""}
          ${o.posiljka?`<p class="cart-note"><b>Kurirska služba:</b> ${esc(o.kurir||"—")}<br><b>Broj pošiljke:</b> <span class="trk">${esc(o.posiljka)}</span> — ovim brojem pratite pošiljku na sajtu kurirske službe.</p>`:""}
          ${(o.kurir&&!o.posiljka)?`<p class="cart-note"><b>Kurirska služba:</b> ${esc(o.kurir)}</p>`:""}
          ${o.faktura_path?`<p class="cart-note"><a href="#" onclick="event.preventDefault();partisFaktura(${i})">Preuzmi fakturu (PDF)</a></p>`:""}
          <button class="cart-send" type="button" onclick="partisRepeat(${i})">Ponovi porudžbinu</button></details>`;
      }).join("");
    }catch(x){el.innerHTML=`<p class="cart-note">Porudžbine trenutno nisu dostupne.</p>`;}
  }
  window.partisFaktura=async function(i){
    const o=ORD[i];if(!o||!o.faktura_path)return;
    try{const c=await client();const {data,error}=await c.storage.from("fakture").createSignedUrl(o.faktura_path,120);if(error)throw error;window.open(data.signedUrl,"_blank","noopener");}
    catch(e){alert("Faktura trenutno nije dostupna. Pozovite nas: +381 18 553 800.");}
  };
  window.partisRepeat=function(i){
    const o=ORD[i];if(!o)return;
    let cart=[];try{cart=JSON.parse(localStorage.getItem("partis_korpa_v2")||"[]");}catch(e){}
    (o.stavke||[]).forEach(x=>{const ex=cart.find(c=>c.n===x.n&&c.l===(x.l||""));if(ex)ex.q=Math.min(99999,ex.q+x.q);else cart.push({n:x.n,l:x.l||"",q:x.q});});
    try{localStorage.setItem("partis_korpa_v2",JSON.stringify(cart));}catch(e){}
    location.href="korpa";
  };
  let pageSig="";const psig=()=>JSON.stringify(window.CUSTOMER?[window.CUSTOMER.ime,window.CUSTOMER.firma,window.CUSTOMER.pib,window.CUSTOMER.telefon,window.CUSTOMER.email,window.CUSTOMER.adresa]:null);
  window.addEventListener("partis-account",()=>{const g=psig();if(g===pageSig)return;pageSig=g;
    const ae=document.activeElement;if(ae&&ae.closest&&ae.closest("#nalForm"))return;renderNalog();if(!(OP&&document.querySelector("#nalOrders .ord"))&&OP)renderOrders();});
  pageSig=psig();
  [[NP,renderNalog],[OP,renderOrders]].forEach(([el,fn])=>{if(!el)return;
    if(cachedName||!Object.keys(localStorage).some(k=>k.startsWith("sb-")))fn();
    else{el.innerHTML=`<div class="m-content cart-box"><p class="cart-note">Učitavam…</p></div>`;}
    setTimeout(()=>{if(el.textContent.trim()==="Učitavam…")fn();},6000);});
  async function logout(){try{const c=await client();await c.auth.signOut();}catch(e){}apply(null);}
})();
