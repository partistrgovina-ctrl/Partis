/* PARTIS — izbor jezika. Tekstovi na sajtu su srpski; prevodi se učitavaju samo za izabrani jezik (assets/lang/XX.js)
   i primenjuju na prikazani tekst. Porudžbine i upiti koji stižu prodavnici uvek ostaju na srpskom. */
(function(){
  var LANGS=[["sr","Srpski"],["en","English"],["de","Deutsch"],["it","Italiano"],["fr","Français"],["hu","Magyar"],["ro","Română"],["bg","Български"],["mk","Македонски"],["sq","Shqip"],["el","Ελληνικά"],["tr","Türkçe"],["pl","Polski"],["sl","Slovenščina"]];
  var KEY="partis_lang",cur="sr",dict=null,H=document.documentElement;
  var AV=["sr","en","de","it","fr","hu","ro","pl","sl","tr","bg","mk","sq"];
  LANGS=LANGS.filter(function(l){return AV.indexOf(l[0])>=0;});
  var codes=LANGS.map(function(l){return l[0];});
  try{var m=/[?&]lang=([a-z]{2})/.exec(location.search);if(m&&codes.indexOf(m[1])>=0){localStorage.setItem(KEY,m[1]);}
      var s=localStorage.getItem(KEY);if(s&&codes.indexOf(s)>=0)cur=s;}catch(e){}
  window.PARTIS_LANG=cur;
  var store={};window.PARTIS_I18N={add:function(c,d){store[c]=d;}};
  var TAGS={sr:"sr-Latn"};H.lang=TAGS[cur]||cur;

  /* ---------- prevođenje jednog teksta ---------- */
  var NUM=/\d+(?:[.,]\d+)?/g;
  function lookup(t){
    if(!dict)return null;
    if(Object.prototype.hasOwnProperty.call(dict,t))return dict[t];
    if(/\d/.test(t)){
      var nums=t.match(NUM),k=t.replace(NUM,"#");
      if(Object.prototype.hasOwnProperty.call(dict,k)){var i=0;return dict[k].replace(/#/g,function(){return nums[i++]||"";});}
      /* srpski brojni oblici (dimenzija/dimenzije, stavka/stavki, proizvod/proizvoda) — isti prevod */
      var k2=k.replace(/^# dimenzija$/,"# dimenzije").replace(/(\+ #) stavka sa/,"$1 stavki sa").replace(/^# proizvod$/,"# proizvoda");
      if(k2!==k&&Object.prototype.hasOwnProperty.call(dict,k2)){var j=0;return dict[k2].replace(/#/g,function(){return nums[j++]||"";});}
    }
    return null;
  }
  function tr(t){
    var a=lookup(t);if(a!=null)return a;
    if(t.indexOf(" · ")>0){
      var parts=t.split(" · "),ch=false;
      var out=parts.map(function(p){var x=lookup(p);if(x!=null){ch=true;return x;}return p;});
      if(ch)return out.join(" · ");
    }
    return null;
  }
  function trWS(s){ /* čuva razmake na početku i kraju */
    var m=/^(\s*)([\s\S]*?)(\s*)$/.exec(s);if(!m[2])return null;
    var r=tr(m[2].replace(/\s+/g," "));return r==null?null:m[1]+r+m[3];
  }
  window.PARTIS_TR=function(s){if(cur==="sr"||!dict)return s;var r=trWS(String(s));return r==null?s:r;};

  /* ---------- DOM ---------- */
  var ATTRS=["placeholder","title","aria-label","alt","data-l"];
  var nodes=new WeakMap(),attrs=new WeakMap();
  function doText(n){
    var p=n.parentNode;if(!p)return;var tag=p.nodeName;if(tag==="SCRIPT"||tag==="STYLE"||tag==="TEXTAREA"||tag==="NOSCRIPT")return;
    var rec=nodes.get(n);
    if(rec&&n.nodeValue===rec.out){/* naš tekst */}else{rec={orig:n.nodeValue,out:null};nodes.set(n,rec);}
    var r=cur==="sr"?null:trWS(rec.orig);
    var v=r==null?rec.orig:r;rec.out=v;if(n.nodeValue!==v)n.nodeValue=v;
  }
  function doAttrs(el){
    if(!el.getAttribute)return;
    for(var i=0;i<ATTRS.length;i++){var a=ATTRS[i];if(!el.hasAttribute(a))continue;
      var map=attrs.get(el);if(!map){map={};attrs.set(el,map);}
      var cv=el.getAttribute(a),rec=map[a];
      if(!rec||cv!==rec.out)rec=map[a]={orig:cv,out:null};
      var r=cur==="sr"?null:trWS(rec.orig);var v=r==null?rec.orig:r;rec.out=v;if(cv!==v)el.setAttribute(a,v);
    }
  }
  function walk(root){
    if(root.nodeType===3){doText(root);return;}
    if(root.nodeType!==1)return;
    doAttrs(root);
    var w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,null),n;
    while((n=w.nextNode())){if(n.nodeType===3)doText(n);else doAttrs(n);}
  }
  var titleOrig=null;
  function doTitle(){
    if(titleOrig===null)titleOrig=document.title;
    var r=cur==="sr"?null:trWS(titleOrig);document.title=r==null?titleOrig:r;
    var md=document.querySelector('meta[name="description"]');
    if(md){if(!md._o)md._o=md.getAttribute("content");var d=cur==="sr"?null:trWS(md._o);md.setAttribute("content",d==null?md._o:d);}
  }
  var obs=null;
  function start(){
    walk(document.body);doTitle();
    if(obs)return;
    obs=new MutationObserver(function(ms){
      for(var i=0;i<ms.length;i++){var m=ms[i];
        if(m.type==="childList"){for(var j=0;j<m.addedNodes.length;j++)walk(m.addedNodes[j]);}
        else if(m.type==="characterData"){doText(m.target);}
        else if(m.type==="attributes"){doAttrs(m.target);}
      }
    });
    obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  }

  /* ---------- izbor jezika ---------- */
  function build(){
    var host=document.querySelector(".navbar .nav-inner")||document.querySelector("header .head-inner");if(!host||document.getElementById("langSel"))return;
    var wrap=document.createElement("div");wrap.className="lang-wrap";
    var sel=document.createElement("select");sel.id="langSel";sel.className="lang-sel";sel.setAttribute("aria-label","Jezik / Language");
    LANGS.forEach(function(l){var o=document.createElement("option");o.value=l[0];o.textContent=l[1];if(l[0]===cur)o.selected=true;sel.appendChild(o);});
    sel.onchange=function(){try{localStorage.setItem(KEY,sel.value);}catch(e){}
      var u=location.href.replace(/([?&])lang=[a-z]{2}&?/,"$1").replace(/[?&]$/,"");location.href=u;};
    wrap.appendChild(sel);host.appendChild(wrap);
  }
  function ready(f){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",f);else f();}
  function go(){ready(function(){dict=store[cur]||null;build();if(cur!=="sr"&&dict)start();H.classList.remove("i18n-wait");});}
  if(cur==="sr"){ready(function(){build();});}
  else{
    H.classList.add("i18n-wait");
    document.write('<script src="assets/lang/'+cur+'.js"><\/script>');
    setTimeout(function(){H.classList.remove("i18n-wait");},2500);
    go();
  }
})();
