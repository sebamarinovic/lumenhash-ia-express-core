/*!
 * LUMEN Chat Widget — Lumen Labs (lumenhash.cl)
 */
(function () {
  "use strict";

  var S = document.currentScript || (function () {
    var s = document.getElementsByTagName("script");
    return s[s.length - 1];
  })();

  var CFG = {
    webhook: S.getAttribute("data-webhook") || "",
    titulo: S.getAttribute("data-titulo") || "LUMEN",
    subtitulo: S.getAttribute("data-subtitulo") || "Asistente de Lumen Labs",
    saludo: S.getAttribute("data-saludo") ||
      "Hola, soy LUMEN de Lumen Labs. ¿Qué parte de tu operación te está quitando más tiempo hoy?",
    posicion: S.getAttribute("data-posicion") === "left" ? "left" : "right",
    autoabrir: parseInt(S.getAttribute("data-autoabrir") || "0", 10)
  };

  if (!CFG.webhook) {
    console.warn("[LUMEN] Falta el atributo data-webhook en la etiqueta script. El widget no se cargará.");
    return;
  }

  var SUGERENCIAS = [
    "Quiero automatizar la atención",
    "¿Cuánto cuesta?",
    "Agendar diagnóstico"
  ];

  /* ---------- sesión ---------- */
  var sessionId = null;
  try {
    sessionId = window.sessionStorage.getItem("lumen_sid");
    if (!sessionId) {
      sessionId = "web-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      window.sessionStorage.setItem("lumen_sid", sessionId);
    }
  } catch (e) {
    sessionId = "web-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- estilos ---------- */
  var CSS = [
    '#lumen-root,#lumen-root *{box-sizing:border-box;margin:0;padding:0}',
    '#lumen-root{',
    '--lx-bg:#0C0D11;--lx-surface:#15171E;--lx-line:#262A35;',
    '--lx-amber:#FF9A3C;--lx-copper:#D05008;--lx-gold:#F5C98B;',
    '--lx-text:#EDEFF4;--lx-muted:#9AA1B1;',
    'position:fixed;bottom:20px;z-index:2147483000;',
    'font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
    '-webkit-font-smoothing:antialiased}',
    '#lumen-root[data-pos="right"]{right:20px;align-items:flex-end}',
    '#lumen-root[data-pos="left"]{left:20px;align-items:flex-start}',
    '#lumen-fab{width:60px;height:60px;border:0;border-radius:50%;cursor:pointer;',
    'background:linear-gradient(145deg,var(--lx-amber),var(--lx-copper));',
    'box-shadow:0 10px 30px rgba(208,80,8,.42);display:flex;align-items:center;justify-content:center;',
    'transition:transform .18s ease,box-shadow .18s ease;position:absolute;bottom:0;right:0}',
    '#lumen-root[data-pos="left"] #lumen-fab{right:auto;left:0}',
    '#lumen-fab:hover{transform:translateY(-2px) scale(1.04);box-shadow:0 14px 36px rgba(208,80,8,.55)}',
    '#lumen-fab:focus-visible{outline:3px solid var(--lx-gold);outline-offset:3px}',
    '#lumen-fab svg{width:27px;height:27px;display:block}',
    '#lumen-dot{position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;',
    'background:#39D98A;border:2.5px solid var(--lx-bg)}',
    '#lumen-root.abierto #lumen-fab{transform:scale(.85);opacity:0}',
    '#lumen-root.abierto #lumen-fab{pointer-events:none}',
    '#lumen-panel{width:376px;max-width:calc(100vw - 32px);height:558px;max-height:calc(100vh - 110px);',
    'background:var(--lx-bg);border:1px solid var(--lx-line);border-radius:18px;overflow:hidden;',
    'display:none;flex-direction:column;box-shadow:0 26px 70px rgba(0,0,0,.62);',
    'opacity:0;transform:translateY(14px) scale(.98);transition:opacity .2s ease,transform .2s ease}',
    '#lumen-root.abierto #lumen-panel{display:flex}',
    '#lumen-root.visible #lumen-panel{opacity:1;transform:none}',
    '#lumen-head{display:flex;align-items:center;gap:11px;padding:15px 16px;',
    'background:linear-gradient(160deg,#1A1C24,#101218);border-bottom:1px solid var(--lx-line);flex:0 0 auto}',
    '#lumen-mark{width:36px;height:36px;border-radius:10px;flex:0 0 auto;',
    'background:linear-gradient(145deg,var(--lx-amber),var(--lx-copper));display:flex;',
    'align-items:center;justify-content:center}',
    '#lumen-mark svg{width:19px;height:19px}',
    '#lumen-head h3{color:var(--lx-text);font-size:15px;font-weight:600;letter-spacing:.14em}',
    '#lumen-head p{color:var(--lx-muted);font-size:11.5px;margin-top:2px;display:flex;align-items:center;gap:5px}',
    '#lumen-head p i{width:6px;height:6px;border-radius:50%;background:#39D98A;display:inline-block}',
    '#lumen-close{margin-left:auto;background:transparent;border:0;color:var(--lx-muted);cursor:pointer;',
    'width:30px;height:30px;border-radius:8px;font-size:21px;line-height:1;transition:.15s}',
    '#lumen-close:hover{background:rgba(255,255,255,.07);color:var(--lx-text)}',
    '#lumen-msgs{flex:1 1 auto;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:11px;',
    'scrollbar-width:thin;scrollbar-color:var(--lx-line) transparent}',
    '#lumen-msgs::-webkit-scrollbar{width:7px}',
    '#lumen-msgs::-webkit-scrollbar-thumb{background:var(--lx-line);border-radius:4px}',
    '.lx-m{max-width:84%;padding:10px 13px;font-size:14px;line-height:1.5;white-space:pre-wrap;',
    'word-wrap:break-word;animation:lx-in .22s ease both}',
    '@keyframes lx-in{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}',
    '.lx-bot{align-self:flex-start;background:var(--lx-surface);color:var(--lx-text);',
    'border:1px solid var(--lx-line);border-radius:14px 14px 14px 4px}',
    '.lx-user{align-self:flex-end;color:#1A0E04;border-radius:14px 14px 4px 14px;font-weight:500;',
    'background:linear-gradient(145deg,var(--lx-amber),var(--lx-copper))}',
    '.lx-err{align-self:flex-start;background:rgba(208,80,8,.12);border:1px solid rgba(208,80,8,.4);',
    'color:var(--lx-gold);border-radius:14px;font-size:13px}',
    '.lx-m a{color:var(--lx-gold)}',
    '#lumen-typing{align-self:flex-start;display:none;gap:4px;padding:12px 14px;background:var(--lx-surface);',
    'border:1px solid var(--lx-line);border-radius:14px 14px 14px 4px}',
    '#lumen-typing.on{display:flex}',
    '#lumen-typing span{width:7px;height:7px;border-radius:50%;background:var(--lx-amber);opacity:.35;',
    'animation:lx-b 1.25s infinite}',
    '#lumen-typing span:nth-child(2){animation-delay:.18s}',
    '#lumen-typing span:nth-child(3){animation-delay:.36s}',
    '@keyframes lx-b{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-4px)}}',
    '#lumen-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 16px 12px}',
    '#lumen-chips button{background:transparent;border:1px solid var(--lx-line);color:var(--lx-gold);',
    'border-radius:999px;padding:7px 13px;font-size:12.5px;cursor:pointer;font-family:inherit;transition:.15s}',
    '#lumen-chips button:hover{border-color:var(--lx-amber);background:rgba(255,154,60,.1)}',
    '#lumen-foot{flex:0 0 auto;border-top:1px solid var(--lx-line);background:#0F1116;padding:11px 12px}',
    '#lumen-form{display:flex;gap:9px;align-items:flex-end}',
    '#lumen-in{flex:1;background:var(--lx-surface);border:1px solid var(--lx-line);border-radius:12px;',
    'color:var(--lx-text);font-size:14px;font-family:inherit;padding:11px 13px;resize:none;max-height:104px;',
    'line-height:1.45;transition:border-color .15s}',
    '#lumen-in:focus{outline:0;border-color:var(--lx-amber)}',
    '#lumen-in::placeholder{color:#5C6373}',
    '#lumen-send{flex:0 0 auto;width:42px;height:42px;border:0;border-radius:12px;cursor:pointer;',
    'background:linear-gradient(145deg,var(--lx-amber),var(--lx-copper));display:flex;align-items:center;',
    'justify-content:center;transition:.15s}',
    '#lumen-send:disabled{opacity:.4;cursor:not-allowed}',
    '#lumen-send:not(:disabled):hover{transform:translateY(-1px)}',
    '#lumen-send svg{width:18px;height:18px}',
    '#lumen-legal{text-align:center;color:#5C6373;font-size:10.5px;margin-top:8px;letter-spacing:.02em}',
    '@media(max-width:480px){',
    '#lumen-root{bottom:14px;right:14px;left:14px}',
    '#lumen-panel{width:100%;height:calc(100vh - 96px)}',
    '#lumen-root[data-pos="right"] #lumen-fab,#lumen-root[data-pos="left"] #lumen-fab{right:0;left:auto}}',
    '@media(prefers-reduced-motion:reduce){#lumen-root *{animation:none!important;transition:none!important}}'
  ].join("");

  var ICON_SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.2 5.4L20 10.5l-5.8 2.1L12 18l-2.2-5.4L4 10.5l5.8-2.1z"/><path d="M18.5 16.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/></svg>';

  var style = document.createElement("style");
  style.id = "lumen-style";
  style.textContent = CSS;
  document.head.appendChild(style);

  var root = document.createElement("div");
  root.id = "lumen-root";
  root.setAttribute("data-pos", CFG.posicion);
  root.innerHTML =
    '<div id="lumen-panel" role="dialog" aria-modal="false" aria-label="Chat con LUMEN de Lumen Labs">' +
      '<div id="lumen-head">' +
        '<div id="lumen-mark">' + ICON_SPARK + '</div>' +
        '<div><h3>' + CFG.titulo + '</h3><p><i></i>' + CFG.subtitulo + '</p></div>' +
        '<button id="lumen-close" aria-label="Cerrar chat">&times;</button>' +
      '</div>' +
      '<div id="lumen-msgs" role="log" aria-live="polite" aria-relevant="additions">' +
        '<div id="lumen-typing" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '</div>' +
      '<div id="lumen-chips"></div>' +
      '<div id="lumen-foot">' +
        '<form id="lumen-form">' +
          '<textarea id="lumen-in" rows="1" placeholder="Escribe tu mensaje…" aria-label="Mensaje"></textarea>' +
          '<button id="lumen-send" type="submit" aria-label="Enviar">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="#1A0E04" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>' +
          '</button>' +
        '</form>' +
        '<div id="lumen-legal">Lumen Labs · Diagnóstico gratuito de 15 min</div>' +
      '</div>' +
    '</div>' +
    '<button id="lumen-fab" aria-label="Abrir chat con LUMEN">' + ICON_SPARK + '<span id="lumen-dot"></span></button>';
  document.body.appendChild(root);

  var $fab = root.querySelector("#lumen-fab"),
      $close = root.querySelector("#lumen-close"),
      $msgs = root.querySelector("#lumen-msgs"),
      $typing = root.querySelector("#lumen-typing"),
      $chips = root.querySelector("#lumen-chips"),
      $form = root.querySelector("#lumen-form"),
      $in = root.querySelector("#lumen-in"),
      $send = root.querySelector("#lumen-send"),
      $dot = root.querySelector("#lumen-dot");

  var abierto = false, ocupado = false, arrancado = false;

  function esc(t) {
    return String(t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function linkear(t) {
    return esc(t)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }

  function abajo() { $msgs.scrollTop = $msgs.scrollHeight; }

  function pintar(texto, clase) {
    var d = document.createElement("div");
    d.className = "lx-m " + clase;
    if (clase === "lx-user") { d.textContent = texto; } else { d.innerHTML = linkear(texto); }
    $msgs.insertBefore(d, $typing);
    abajo();
    return d;
  }

  function chips(lista) {
    $chips.innerHTML = "";
    if (!lista || !lista.length) return;
    lista.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = t;
      b.addEventListener("click", function () { $chips.innerHTML = ""; enviar(t); });
      $chips.appendChild(b);
    });
  }

  function pensando(on) {
    $typing.classList.toggle("on", on);
    $typing.setAttribute("aria-hidden", on ? "false" : "true");
    if (on) abajo();
  }

  function bloquear(on) {
    ocupado = on;
    $send.disabled = on;
    $in.disabled = on;
    if (!on) $in.focus();
  }

  function enviar(texto) {
    texto = (texto || "").trim();
    if (!texto || ocupado) return;

    pintar(texto, "lx-user");
    $in.value = "";
    $in.style.height = "auto";
    $chips.innerHTML = "";
    bloquear(true);
    pensando(true);

    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var tOut = setTimeout(function () { if (ctrl) ctrl.abort(); }, 45000);

    fetch(CFG.webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: sessionId,
        message: texto,
        page: location.pathname + location.search
      }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var d = Array.isArray(data) ? data[0] : data;
        var txt = (d && (d.reply || d.output || d.text || d.message)) || "";
        if (!txt) throw new Error("respuesta vacia");
        pintar(txt, "lx-bot");
      })
      .catch(function (err) {
        console.warn("[LUMEN]", err);
        pintar(
          "Se me cortó la conexión. Inténtalo de nuevo en un momento, o escríbenos a contacto@lumenhash.cl y te respondemos hoy.",
          "lx-err"
        );
      })
      .then(function () {
        clearTimeout(tOut);
        pensando(false);
        bloquear(false);
      });
  }

  function abrir() {
    if (abierto) return;
    abierto = true;
    root.classList.add("abierto");
    $dot.style.display = "none";
    requestAnimationFrame(function () { root.classList.add("visible"); });
    if (!arrancado) {
      arrancado = true;
      setTimeout(function () {
        pintar(CFG.saludo, "lx-bot");
        chips(SUGERENCIAS);
      }, 260);
    }
    setTimeout(function () { $in.focus(); }, 320);
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    root.classList.remove("visible");
    setTimeout(function () { root.classList.remove("abierto"); }, 200);
    $fab.focus();
  }

  $fab.addEventListener("click", abrir);
  $close.addEventListener("click", cerrar);

  $form.addEventListener("submit", function (e) {
    e.preventDefault();
    enviar($in.value);
  });

  $in.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar($in.value); }
  });

  $in.addEventListener("input", function () {
    $in.style.height = "auto";
    $in.style.height = Math.min($in.scrollHeight, 104) + "px";
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && abierto) cerrar();
  });

  if (CFG.autoabrir > 0) setTimeout(abrir, CFG.autoabrir * 1000);

  window.LumenChat = { abrir: abrir, cerrar: cerrar, enviar: enviar, sessionId: sessionId };
})();
