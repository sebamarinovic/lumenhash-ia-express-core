/* LUMEN Chat Widget v5 — Lumen Labs */
(function () {
  "use strict";
  if (document.getElementById("lumen-root")) return;

  var S = document.currentScript || document.getElementsByTagName("script")[document.getElementsByTagName("script").length - 1];
  var CFG = {
    webhook: S.getAttribute("data-webhook") || "",
    titulo: S.getAttribute("data-titulo") || "LUMEN",
    subtitulo: S.getAttribute("data-subtitulo") || "Asistente de Lumen Labs",
    saludo: S.getAttribute("data-saludo") || "Hola, soy LUMEN 👋 Puedo ayudarte a identificar qué automatizar, revisar planes o agendar un diagnóstico gratuito de 15 minutos. ¿Qué necesitas?",
    posicion: S.getAttribute("data-posicion") === "left" ? "left" : "right",
    autoabrir: parseInt(S.getAttribute("data-autoabrir") || "0", 10)
  };
  if (!CFG.webhook) return console.warn("[LUMEN] Falta data-webhook");

  var QUICK = ["Quiero automatizar un proceso", "Ver planes y precios", "Agendar diagnóstico"];
  var K_SID = "lumen_sid_v5", K_HIST = "lumen_history_v5", K_AGENDA = "lumen_agenda_pending_v2";
  var sid = "", hist = [], agendaPendiente = false, ultimo = "", abierto = false, ocupado = false, arrancado = false;

  function uid() {
    try {
      var a = new Uint32Array(2); crypto.getRandomValues(a);
      return "web-" + Date.now().toString(36) + "-" + a[0].toString(36) + a[1].toString(36);
    } catch (e) {
      return "web-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    }
  }

  function loadSession() {
    try {
      sid = sessionStorage.getItem(K_SID) || uid();
      sessionStorage.setItem(K_SID, sid);
      hist = JSON.parse(sessionStorage.getItem(K_HIST) || "[]");
      if (!Array.isArray(hist)) hist = [];
      hist = hist.slice(-30);
      agendaPendiente = sessionStorage.getItem(K_AGENDA) === "1";
    } catch (e) {
      sid = uid(); hist = []; agendaPendiente = false;
    }
  }
  loadSession();

  var CSS = [
    '#lumen-root,#lumen-root *{box-sizing:border-box;margin:0;padding:0}',
    '#lumen-root{--b:#0C0D11;--s:#15171E;--l:#282C37;--a:#FF9A3C;--c:#D05008;--g:#F5C98B;--t:#F2F3F6;--m:#9AA1B1;position:fixed;bottom:20px;z-index:2147483000;font-family:"DM Sans","Inter","Segoe UI",Arial,sans-serif;-webkit-font-smoothing:antialiased}',
    '#lumen-root[data-pos="right"]{right:20px}#lumen-root[data-pos="left"]{left:20px}',
    '#lumen-fab{position:absolute;bottom:0;right:0;width:60px;height:60px;border:0;border-radius:50%;cursor:pointer;background:linear-gradient(145deg,var(--a),var(--c));box-shadow:0 10px 30px rgba(208,80,8,.42);display:flex;align-items:center;justify-content:center;transition:.18s}',
    '#lumen-root[data-pos="left"] #lumen-fab{right:auto;left:0}#lumen-fab:hover{transform:translateY(-2px) scale(1.04)}#lumen-fab svg{width:27px;height:27px}#lumen-dot{position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#39D98A;border:2.5px solid var(--b)}',
    '#lumen-root.abierto #lumen-fab{opacity:0;pointer-events:none;transform:scale(.85)}',
    '#lumen-panel{width:400px;max-width:calc(100vw - 32px);height:610px;max-height:calc(100vh - 88px);background:var(--b);border:1px solid var(--l);border-radius:20px;overflow:hidden;display:none;flex-direction:column;box-shadow:0 26px 80px rgba(0,0,0,.68);opacity:0;transform:translateY(14px) scale(.98);transition:.2s}',
    '#lumen-root.abierto #lumen-panel{display:flex}#lumen-root.visible #lumen-panel{opacity:1;transform:none}',
    '#lumen-head{display:flex;align-items:center;gap:11px;padding:15px 16px;background:linear-gradient(160deg,#1A1C24,#101218);border-bottom:1px solid var(--l)}',
    '#lumen-mark{width:38px;height:38px;border-radius:11px;background:linear-gradient(145deg,var(--a),var(--c));display:flex;align-items:center;justify-content:center;flex:0 0 auto}#lumen-mark svg{width:20px;height:20px}',
    '#lumen-head h3{color:var(--t);font-size:15px;font-weight:700;letter-spacing:.14em}#lumen-head p{color:var(--m);font-size:11.5px;margin-top:2px}#lumen-head p:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:#39D98A;margin-right:6px}',
    '.lx-headbtn{width:32px;height:32px;border:0;border-radius:9px;background:transparent;color:var(--m);font-size:19px;cursor:pointer}.lx-headbtn:hover{background:rgba(255,255,255,.07);color:var(--t)}#lumen-reset{margin-left:auto}#lumen-close{font-size:22px}',
    '#lumen-msgs{flex:1;overflow-y:auto;padding:18px 16px 12px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}',
    '.lx-m{max-width:88%;padding:10px 13px;font-size:14px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;animation:lx .2s ease both}@keyframes lx{from{opacity:0;transform:translateY(6px)}}',
    '.lx-bot{align-self:flex-start;background:var(--s);color:var(--t);border:1px solid var(--l);border-radius:14px 14px 14px 4px}.lx-user{align-self:flex-end;color:#1A0E04;font-weight:600;background:linear-gradient(145deg,var(--a),var(--c));border-radius:14px 14px 4px 14px}.lx-err{align-self:flex-start;color:var(--g);background:rgba(208,80,8,.1);border:1px solid rgba(255,154,60,.28);border-radius:14px;font-size:13px}.lx-note{align-self:center;max-width:95%;font-size:10.5px;color:#707888;text-align:center;padding:5px 8px}.lx-m a{color:var(--g);text-decoration:underline}',
    '#lumen-typing{align-self:flex-start;display:none;gap:4px;padding:12px 14px;background:var(--s);border:1px solid var(--l);border-radius:14px 14px 14px 4px}#lumen-typing.on{display:flex}#lumen-typing span{width:7px;height:7px;border-radius:50%;background:var(--a);animation:dot 1.2s infinite;opacity:.35}#lumen-typing span:nth-child(2){animation-delay:.18s}#lumen-typing span:nth-child(3){animation-delay:.36s}@keyframes dot{30%{opacity:1;transform:translateY(-4px)}}',
    '#lumen-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 16px 12px}#lumen-chips:empty{display:none}#lumen-chips button{background:transparent;border:1px solid var(--l);color:var(--g);border-radius:999px;padding:7px 12px;font-size:12px;cursor:pointer}#lumen-chips button:hover{border-color:var(--a);background:rgba(255,154,60,.1)}',
    '#lumen-foot{border-top:1px solid var(--l);background:#0F1116;padding:10px 12px 11px}#lumen-form{display:flex;gap:9px;align-items:flex-end}#lumen-in{flex:1;background:var(--s);border:1px solid var(--l);border-radius:12px;color:var(--t);font:14px inherit;padding:11px 13px;resize:none;max-height:112px;line-height:1.45}#lumen-in:focus{outline:0;border-color:var(--a);box-shadow:0 0 0 3px rgba(255,154,60,.08)}#lumen-in::placeholder{color:#5C6373}',
    '#lumen-send{width:42px;height:42px;border:0;border-radius:12px;cursor:pointer;background:linear-gradient(145deg,var(--a),var(--c));display:flex;align-items:center;justify-content:center}#lumen-send:disabled{opacity:.4;cursor:not-allowed}#lumen-send svg{width:18px;height:18px}',
    '#lumen-meta{text-align:center;color:#646B78;font-size:10px;margin-top:8px}',
    '@media(max-width:480px){#lumen-root{bottom:10px;right:10px;left:10px}#lumen-panel{width:100%;height:calc(100dvh - 76px);max-height:none}#lumen-root[data-pos="right"] #lumen-fab,#lumen-root[data-pos="left"] #lumen-fab{right:0;left:auto}.lx-m{max-width:91%}}',
    '@media(prefers-reduced-motion:reduce){#lumen-root *{animation:none!important;transition:none!important}}'
  ].join("");

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.2 5.4L20 10.5l-5.8 2.1L12 18l-2.2-5.4L4 10.5l5.8-2.1z"/><path d="M18.5 16.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/></svg>';
  var style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style);
  var root = document.createElement("div"); root.id = "lumen-root"; root.setAttribute("data-pos", CFG.posicion);

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  root.innerHTML = '<div id="lumen-panel" role="dialog" aria-label="Chat con LUMEN"><div id="lumen-head"><div id="lumen-mark">'+ICON+'</div><div><h3>'+esc(CFG.titulo)+'</h3><p>'+esc(CFG.subtitulo)+' · En línea</p></div><button id="lumen-reset" class="lx-headbtn" type="button" title="Nueva conversación" aria-label="Nueva conversación">↻</button><button id="lumen-close" class="lx-headbtn" type="button" aria-label="Cerrar">&times;</button></div><div id="lumen-msgs" role="log" aria-live="polite"><div id="lumen-typing" aria-hidden="true"><span></span><span></span><span></span></div></div><div id="lumen-chips"></div><div id="lumen-foot"><form id="lumen-form"><textarea id="lumen-in" rows="1" maxlength="2000" placeholder="Escribe tu mensaje…" aria-label="Mensaje"></textarea><button id="lumen-send" type="submit" aria-label="Enviar"><svg viewBox="0 0 24 24" fill="none" stroke="#1A0E04" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg></button></form><div id="lumen-meta">Diagnóstico gratuito · 15 min · No compartas datos sensibles</div></div></div><button id="lumen-fab" type="button" aria-label="Abrir chat">'+ICON+'<span id="lumen-dot"></span></button>';
  document.body.appendChild(root);

  var fab=root.querySelector("#lumen-fab"), close=root.querySelector("#lumen-close"), reset=root.querySelector("#lumen-reset"), msgs=root.querySelector("#lumen-msgs"), typing=root.querySelector("#lumen-typing"), chipsEl=root.querySelector("#lumen-chips"), form=root.querySelector("#lumen-form"), input=root.querySelector("#lumen-in"), send=root.querySelector("#lumen-send"), dot=root.querySelector("#lumen-dot");

  function save(){try{sessionStorage.setItem(K_HIST,JSON.stringify(hist.slice(-30)));}catch(e){}}
  function add(role,text,store){
    var d=document.createElement("div"), cls=role==="user"?"lx-user":role==="error"?"lx-err":"lx-bot";
    d.className="lx-m "+cls;
    if(role==="user") d.textContent=text; else d.innerHTML=linkify(text);
    msgs.insertBefore(d,typing);
    if(store!==false){hist.push({role:role,text:String(text)});hist=hist.slice(-30);save();}
    msgs.scrollTop=msgs.scrollHeight;
  }
  function note(t){var d=document.createElement("div");d.className="lx-note";d.textContent=t;msgs.insertBefore(d,typing);}
  function linkify(t){
    var s=esc(t), keep=[];
    function hold(x){keep.push(x);return "\u0001"+(keep.length-1)+"\u0001";}
    s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,function(_,x,u){return hold('<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+x+'</a>');});
    s=s.replace(/(https?:\/\/[^\s<)]+)/g,function(u){return hold('<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+u+'</a>');});
    s=s.replace(/([\w.+-]+@[\w-]+\.[\w.-]+)/g,'<a href="mailto:$1">$1</a>');
    s=s.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
    return s.replace(/\u0001(\d+)\u0001/g,function(_,i){return keep[i];});
  }
  function quick(a){
    chipsEl.innerHTML="";
    (a||[]).slice(0,4).forEach(function(t){
      var b=document.createElement("button"); b.type="button"; b.textContent=t;
      b.onclick=function(){chipsEl.innerHTML="";sendMsg(t==="Reintentar"&&ultimo?ultimo:t);};
      chipsEl.appendChild(b);
    });
  }
  function busy(on){ocupado=on;send.disabled=on;input.disabled=on;typing.classList.toggle("on",on);typing.setAttribute("aria-hidden",on?"false":"true");if(!on&&abierto)input.focus();msgs.scrollTop=msgs.scrollHeight;}
  function lastBot(){for(var i=hist.length-1;i>=0;i--)if(hist[i].role==="assistant")return hist[i].text||"";return "";}
  function hasEmail(){return hist.some(function(m){return m.role==="user"&&/[\w.+-]+@[\w-]+\.[\w.-]+/.test(m.text||"");});}
  function agendaCtx(){var t=lastBot().toLowerCase();return /(agend|reuni[oó]n|diagn[oó]stico|horario|disponibilidad)/.test(t)&&/(\d{1,2}:\d{2}|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|hoy|ma[nñ]ana)/.test(t);}
  function yes(t){return /^(s[ií]|ok|okay|dale|confirmo|me sirve|perfecto|de acuerdo|hag[aá]moslo)[.! ]*$/i.test(t);}
  function privacy(t){t=t.toLowerCase();return /(privacidad|datos personales|mis datos|mi correo|mi email|como sabes|cómo sabes|como conoces|cómo conoces)/.test(t);}
  function setAgenda(on){agendaPendiente=!!on;try{on?sessionStorage.setItem(K_AGENDA,"1"):sessionStorage.removeItem(K_AGENDA);}catch(e){}}
  function parse(data){var d=Array.isArray(data)?data[0]:data||{};return {text:String(d.reply||d.output||d.text||d.message||"").trim(),suggestions:d.suggestions||d.quickReplies||d.quick_replies||[]};}
  function norm(t){return String(t||"").toLowerCase().replace(/\s+/g," ").trim();}
  function isGreetingRequest(t){return /^(hola|hola lumen|buenas|buenos d[ií]as|buenas tardes|buenas noches)[!. ]*$/i.test(t||"");}
  function isGenericGreeting(t){var n=norm(t);return n.indexOf("hola, soy lumen de lumen labs")!==-1&&n.indexOf("qué parte de tu operación")!==-1;}

  function localFallback(original){
    var t=norm(original);
    if(/(plan|precio|cu[aá]nto cuesta|valor)/.test(t)){
      add("assistant","Nuestros planes mensuales son: Start $149.000, Grow $390.000, Transform $790.000 y Enterprise desde $1.500.000 CLP, IVA incluido. Si me cuentas cuántas personas trabajan en tu equipo y qué proceso quieres automatizar, te ayudo a identificar el plan más adecuado.");
      quick(["Recomiéndame un plan","Quiero automatizar un proceso","Agendar diagnóstico"]);
      return;
    }
    if(/(automat|proceso|tarea repetitiva|atenci[oó]n|reporte|dashboard)/.test(t)){
      add("assistant","Perfecto. Para orientarte bien, dime qué proceso te quita más tiempo hoy. Por ejemplo: responder clientes, agendar reuniones, preparar reportes, consolidar datos, seguimiento comercial o tareas administrativas.");
      quick(["Atención a clientes","Reportes y datos","Agendamiento"]);
      return;
    }
    add("error","No pude interpretar correctamente la respuesta del asistente. Ya evité que se repita en bucle. Intenta reformular tu consulta o inicia una nueva conversación con ↻.");
    quick(["Quiero automatizar un proceso","Ver planes y precios","Agendar diagnóstico"]);
  }

  function payloadFor(text){
    var tz=""; try{tz=Intl.DateTimeFormat().resolvedOptions().timeZone||"";}catch(e){}
    return {
      sessionId:sid,
      session_id:sid,
      message:text,
      chatInput:text,
      input:text,
      text:text,
      query:text,
      channel:"web",
      page:location.pathname+location.search,
      pageTitle:document.title,
      locale:navigator.language||"es-CL",
      timezone:tz,
      conversation:hist.slice(-10)
    };
  }

  function requestBackend(text, original, attempt){
    var ctrl=typeof AbortController!=="undefined"?new AbortController():null;
    var timer=setTimeout(function(){if(ctrl)ctrl.abort();},45000);
    return fetch(CFG.webhook,{
      method:"POST",
      headers:{"Content-Type":"application/json","Accept":"application/json"},
      credentials:"omit",
      body:JSON.stringify(payloadFor(text)),
      signal:ctrl?ctrl.signal:undefined
    }).then(function(r){
      if(!r.ok) throw new Error("HTTP "+r.status);
      return r.json();
    }).then(function(data){
      clearTimeout(timer);
      var o=parse(data);
      if(!o.text) throw new Error("respuesta vacía");

      if(isGenericGreeting(o.text) && !isGreetingRequest(original)){
        if(attempt===0){
          return requestBackend("Responde directamente a la consulta del usuario, sin volver a presentarte. Consulta: "+original, original, 1);
        }
        localFallback(original);
        return;
      }

      if(/se me trab[oó]|coordinemos por whatsapp|sistema se trab[oó]/i.test(o.text)){
        add("error","No pude completar esa acción. Si estábamos agendando, la reunión no queda confirmada hasta que tengas un horario aceptado y hayas compartido al menos tu nombre y correo.");
        quick(["Reintentar","Agendar diagnóstico"]);
        return;
      }

      add("assistant",o.text);
      if(Array.isArray(o.suggestions)&&o.suggestions.length) quick(o.suggestions);
    }).catch(function(e){
      clearTimeout(timer);
      add("error",e&&e.name==="AbortError"?"La respuesta está demorando más de lo esperado. No se creó ni confirmó ninguna reunión. Puedes reintentar.":"No pude conectar con el asistente. No se creó ni confirmó ninguna reunión. Puedes reintentar o escribirnos a contacto@lumenhash.cl.");
      quick(["Reintentar","Agendar diagnóstico"]);
    });
  }

  function sendMsg(text){
    text=(text||"").trim(); if(!text||ocupado)return;
    ultimo=text; add("user",text); input.value=""; input.style.height="auto"; chipsEl.innerHTML="";

    if(privacy(text)){
      setTimeout(function(){add("assistant","No conozco tus datos personales por visitar la web. Uso lo que tú escribes, un identificador técnico de sesión y la página desde la que consultas. Si quieres agendar, te pediré nombre y correo antes de crear la reunión. No voy a asumir ni inventar esos datos.");quick(["Entendido","Agendar diagnóstico"]);},120);
      return;
    }
    if(yes(text)&&agendaCtx()&&!hasEmail()){
      setAgenda(true);
      setTimeout(function(){add("assistant","Perfecto. Antes de crear la invitación necesito tu nombre y correo. Puedes escribirlos así: Nombre Apellido — correo@empresa.cl. No necesito más datos para agendar.");},120);
      return;
    }

    var backend=text;
    if(agendaPendiente&&/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)){
      backend="El usuario aceptó el último horario propuesto. Datos que entrega ahora: "+text+". Verifica disponibilidad y agenda solo si cuentas con los datos mínimos necesarios; no inventes información.";
      setAgenda(false);
    }

    busy(true);
    requestBackend(backend,text,0).then(function(){busy(false);});
  }

  function clearMessages(){
    Array.prototype.slice.call(msgs.children).forEach(function(el){if(el!==typing) el.remove();});
    chipsEl.innerHTML="";
  }
  function newConversation(){
    try{sessionStorage.removeItem(K_SID);sessionStorage.removeItem(K_HIST);sessionStorage.removeItem(K_AGENDA);}catch(e){}
    sid=uid(); hist=[]; agendaPendiente=false; ultimo="";
    try{sessionStorage.setItem(K_SID,sid);}catch(e){}
    clearMessages();
    add("assistant",CFG.saludo);
    note("Nueva conversación iniciada. LUMEN no necesita tus datos personales para orientarte.");
    quick(QUICK);
  }

  function open(){
    if(abierto)return; abierto=true; root.classList.add("abierto"); dot.style.display="none";
    requestAnimationFrame(function(){root.classList.add("visible");});
    if(!arrancado){
      arrancado=true;
      setTimeout(function(){
        if(hist.length){hist.slice().forEach(function(m){add(m.role,m.text,false);});}
        else{add("assistant",CFG.saludo);note("LUMEN no necesita tus datos personales para orientarte. Solo te los pedirá si quieres que te contactemos o agendar.");quick(QUICK);}
      },180);
    }
    setTimeout(function(){input.focus();},240);
  }
  function shut(){if(!abierto)return;abierto=false;root.classList.remove("visible");setTimeout(function(){root.classList.remove("abierto");},200);fab.focus();}

  fab.onclick=open;
  close.onclick=shut;
  reset.onclick=newConversation;
  form.onsubmit=function(e){e.preventDefault();sendMsg(input.value);};
  input.onkeydown=function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg(input.value);}};
  input.oninput=function(){input.style.height="auto";input.style.height=Math.min(input.scrollHeight,112)+"px";};
  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&abierto)shut();});
  if(CFG.autoabrir>0)setTimeout(open,CFG.autoabrir*1000);

  window.LumenChat={abrir:open,cerrar:shut,enviar:sendMsg,nuevaConversacion:newConversation,sessionId:function(){return sid;}};
})();