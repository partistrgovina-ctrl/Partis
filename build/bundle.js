/* PARTIS — offline katalog: spaja ceo sajt u JEDAN HTML fajl (radi bez interneta i bez hostinga).
   Kupac ga dobije mejlom, otvori, popuni korpu i jednim klikom pripremi mejl za nas. */
(function(root,factory){
  if(typeof module==="object"&&module.exports)module.exports=factory();
  else root.PARTIS_BUNDLE=factory();
})(typeof self!=="undefined"?self:this,function(){
  const IMGRE=/assets\/img\/[A-Za-z0-9_.\-\/]+\.(?:jpg|jpeg|png|webp|gif|svg)/gi;
  const LS=new RegExp(String.fromCharCode(0x2028),"g"),PS=new RegExp(String.fromCharCode(0x2029),"g");
  const jsonSafe=o=>JSON.stringify(o).replace(/</g,"\\u003c").replace(LS,"\\u2028").replace(PS,"\\u2029");
  const scriptSafe=s=>s.replace(/<\/script/gi,"<\\/script");

  function parsePages(pages){
    const out={};
    for(const [file,html] of Object.entries(pages)){
      const t=(html.match(/<title>([\s\S]*?)<\/title>/)||[])[1]||"PARTIS";
      const a=html.indexOf("<header>"),b=html.indexOf("<script>window.PAGE=");
      if(a<0||b<0)continue;
      const pg=(html.match(/window\.PAGE=(\{[\s\S]*?\});<\/script>/)||[])[1]||'{"id":"home","secs":[]}';
      out[file]={title:t,view:html.slice(a,b).trim(),page:JSON.parse(pg)};
    }
    return out;
  }
  /* koje slike su zaista potrebne */
  function collect(o){
    const P=parsePages(o.pages),txt=Object.values(P).map(p=>p.view).join("\n")+o.assets["data.js"]+o.assets["shared.js"]+o.assets["app.js"];
    return [...new Set(txt.match(IMGRE)||[])];
  }
  function build(o){
    const P=parsePages(o.pages),A=o.assets,imgs=o.imgs||{};
    const home=o.pages["index.html"],first=P["index.html"];
    const a=home.indexOf("<a class=\"wa-float\""),f0=home.indexOf("<script src=");
    const shell=home.slice(a,f0).replace(/<script[\s\S]*?<\/script>/g,"");
    const head=home.slice(home.indexOf("<meta charset"),home.indexOf("<link rel=\"stylesheet\""));
    const fonts=(head.match(/<link[^>]*(?:fonts\.googleapis|fonts\.gstatic)[^>]*>/g)||[]).join("\n");
    const router=`
(function(){
  var PAGES=JSON.parse(document.getElementById("pages-json").textContent),view=document.getElementById("view"),cur="index.html";
  window.PARTIS_IMGU=function(u){return IMGDATA[u]||u;};
  function fix(img){var s=img.getAttribute("src");if(s&&IMGDATA[s]){if(!img.dataset.p)img.dataset.p=s;img.setAttribute("src",IMGDATA[s]);}}
  new MutationObserver(function(ms){ms.forEach(function(m){
    if(m.type==="attributes")fix(m.target);
    else m.addedNodes.forEach(function(n){if(n.nodeType!==1)return;if(n.tagName==="IMG")fix(n);else n.querySelectorAll&&n.querySelectorAll("img").forEach(fix);});
  });}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["src"]});
  document.querySelectorAll("img").forEach(fix);
  function parse(h){var m=/^([\\w\\-]+\\.html)(?:\\?q=([^#]*))?(?:#(.*))?$/.exec(h);return m&&PAGES[m[1]]?{f:m[1],q:m[2]!=null?decodeURIComponent(m[2].replace(/\\+/g," ")):null,h:m[3]||""}:null;}
  function render(r,push){
    if(typeof closeModal==="function")closeModal();
    var same=(r.f===cur&&r.f!=="pretraga.html");
    if(!same){
      cur=r.f;var p=PAGES[r.f];
      window.PARTIS_Q=r.f==="pretraga.html"?(r.q||""):null;
      window.PAGE=p.page;document.title=p.title;view.innerHTML=p.view;
      window.scrollTo(0,0);window.partisInitPage();
    }
    if(r.h)window.partisOpenKey(r.h);
    if(push){try{history.pushState(r,"");}catch(e){}}
  }
  window.PARTIS_GO=function(h){var r=parse(h);if(r)render(r,true);else location.href=h;};
  document.addEventListener("click",function(e){
    if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey)return;
    var a=e.target.closest&&e.target.closest("a[href]");if(!a||a.target==="_blank")return;
    var r=parse(a.getAttribute("href"));if(!r)return;
    e.preventDefault();render(r,true);
  });
  document.addEventListener("submit",function(e){
    var f=e.target;if(!f.classList||!f.classList.contains("search"))return;
    e.preventDefault();var i=f.querySelector("input[name=q]");
    render({f:"pretraga.html",q:i?i.value:"",h:""},true);
  });
  window.addEventListener("popstate",function(e){var s=e.state;render(s&&s.f?s:{f:"index.html",q:null,h:""},false);});
  try{history.replaceState({f:"index.html",q:null,h:""},"");}catch(e){}
})();`;
    const used=collect(o),map={};
    used.forEach(u=>{if(imgs[u])map[u]=imgs[u];});
    return `<!DOCTYPE html>
<html lang="sr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PARTIS katalog — Niš</title>
<meta name="robots" content="noindex">
${fonts}
<style>${A["style.css"]}</style>
</head>
<body>
<div class="offline-bar">PARTIS katalog (offline): izaberite artikle, dodajte ih u korpu i kliknite <b>Pošalji upit</b> — mejl za nas se priprema sam.</div>
<div id="view">${first.view}</div>
<script>window.PAGE=${jsonSafe(first.page)};window.PARTIS_OFFLINE=true;window.PARTIS_CFG={};window.IMGDATA=${jsonSafe(map)};</script>
<script type="application/json" id="pages-json">${jsonSafe(P)}</script>
${shell}
<script>${scriptSafe(A["data.js"])}</script>
<script>${scriptSafe(A["aliases.js"])}</script>
<script>${scriptSafe(A["shared.js"])}</script>
<script>${scriptSafe(A["app.js"])}</script>
<script>${scriptSafe(router)}</script>
<script>${scriptSafe(A["cart.js"])}</script>
</body>
</html>`;
  }
  return {collect,build};
});
