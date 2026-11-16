(function(){
  var KEY="partis_cookie";
  function get(){try{return localStorage.getItem(KEY)}catch(e){return null}}
  function set(v){try{localStorage.setItem(KEY,v)}catch(e){}}
  function push(){(window.dataLayer=window.dataLayer||[]).push(arguments)}
  function apply(v){
    var s=v==="granted"?"granted":"denied";
    push("consent","update",{analytics_storage:s,ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied"});
  }
  function close(){var b=document.getElementById("ck-bar");if(b&&b.parentNode)b.parentNode.removeChild(b)}
  function show(){
    if(document.getElementById("ck-bar"))return;
    var b=document.createElement("div");b.id="ck-bar";b.setAttribute("role","dialog");b.setAttribute("aria-label","Kolačići");
    b.innerHTML='<p>Koristimo analitičke kolačiće (Google Analytics) da bismo razumeli kako se sajt koristi i unapredili ga. Isključivo neophodni podaci rade i bez saglasnosti. <a href="/privatnost">Politika privatnosti</a></p><div class="ck-btns"><button type="button" id="ck-no">Odbij</button><button type="button" id="ck-yes">Prihvati</button></div>';
    document.body.appendChild(b);
    document.getElementById("ck-yes").onclick=function(){set("granted");apply("granted");close()};
    document.getElementById("ck-no").onclick=function(){set("denied");apply("denied");close()};
  }
  window.partisCookies=show;
  function init(){
    var p=document.querySelector(".foot-priv");
    if(p&&!p.querySelector(".ck-open")){var a=document.createElement("a");a.href="#";a.className="ck-open";a.textContent="Podešavanja kolačića";a.style.marginLeft="14px";a.onclick=function(e){e.preventDefault();show()};p.appendChild(a)}
    if(get()===null)show();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
