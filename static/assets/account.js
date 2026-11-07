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

  function paint(){
    if(profile){
      box.innerHTML=`<span class="acct-name">${esc(profile.ime||profile.email)}</span><button type="button" class="acct-b" id="acOut">Odjava</button>`;
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
    profile=p&&p.odobren?p:null;
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
      <p class="cart-note">Registrovani kupci dobijaju svoje rabate. <b>Nalog aktivira prodavnica</b> — kada ga odobrimo, možete da se prijavite. Javljamo se na mejl ili telefon.</p>
      <form id="acForm" class="cart-form" onsubmit="return partisRegister(event)">
        <div class="f-grid">
          <label>Ime i prezime *<input name="ime" required autocomplete="name"></label>
          <label>Firma (neobavezno)<input name="firma" autocomplete="organization"></label>
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
      const {data,error}=await c.auth.signUp({email:fd.get("email").trim(),password:fd.get("pass"),options:{data:{ime:fd.get("ime").trim(),firma:(fd.get("firma")||"").trim(),telefon:fd.get("telefon").trim(),adresa:fd.get("adresa").trim()}}});
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
  async function logout(){try{const c=await client();await c.auth.signOut();}catch(e){}apply(null);}
})();
