/* PONTO DO DIA — motor compartilhado pelas duas versões.
   As duas páginas (index.html e diagonal.html) usam este mesmo arquivo.
   Ele só mexe em elementos com estes ids, e ignora os que não existirem:
     #theme  texto do tema        #clock  cronômetro
     #sub    tema pequeno         #state  etiqueta do momento
     #acts   onde nascem os botões
     #fill   a bola enchendo conforme o tempo passa
   Um elemento com data-draw vira área clicável para sortear.          */
(function () {
  "use strict";

  var ESTUDO = 15;   // minutos de estudo  ← mude aqui
  var FALA   = 1;    // minutos de fala    ← mude aqui

  var THEMES = window.SHOT_THEMES || [];
  var SEEN   = "ponto-do-dia:vistos";

  var $ = function (id) { return document.getElementById(id); };
  var R = { theme:$("theme"), clock:$("clock"), sub:$("sub"), state:$("state"),
            acts:$("acts"), fill:$("fill") };

  var theme = null, phase = "idle";
  var endAt = 0, remain = 0, total = 0, running = false, raf = 0, guard = 0;

  function put(el, txt) { if (el) el.textContent = txt; }

  /* ---------------- som ---------------- */
  var ac = null;
  function ctx() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      return ac;
    } catch (e) { return null; }
  }
  /* pancada de raquete na bola */
  function pock(vol) {
    var a = ctx(); if (!a) return;
    var t = a.currentTime;
    var o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
    o.type = "triangle";
    o.frequency.setValueAtTime(430, t);
    o.frequency.exponentialRampToValueAtTime(85, t + .07);
    f.type = "bandpass"; f.frequency.value = 950; f.Q.value = 1.1;
    g.gain.setValueAtTime(vol == null ? .12 : vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + .1);
    o.connect(f); f.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + .11);
  }
  /* apito de fim de tempo */
  function beep(n) {
    var a = ctx(); if (!a) return;
    for (var i = 0; i < n; i++) {
      var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * .3;
      o.type = "square"; o.frequency.setValueAtTime(660, t);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.15, t + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t + .24);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .26);
    }
  }
  /* ponto encerrado */
  function chime() {
    var a = ctx(); if (!a) return;
    [523.25, 659.25, 783.99].forEach(function (hz, i) {
      var o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * .13;
      o.type = "triangle"; o.frequency.setValueAtTime(hz, t);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.14, t + .015);
      g.gain.exponentialRampToValueAtTime(.0001, t + .42);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .44);
    });
  }

  /* ---------------- tela ---------------- */
  function setPhase(p) { phase = p; document.body.dataset.phase = p; }

  function buttons(list) {
    if (!R.acts) return;
    R.acts.innerHTML = "";
    list.forEach(function (b) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "pill" + (b[2] ? " primary" : "");
      el.textContent = b[0];
      el.addEventListener("click", function () { pock(.07); b[1](); });
      R.acts.appendChild(el);
    });
  }

  /* a bola vai enchendo: 0 vazia, 1 cheia */
  function setFill(p) {
    if (R.fill) R.fill.style.height = (Math.min(1, Math.max(0, p)) * 100).toFixed(2) + "%";
  }

  function fit(txt) {
    if (!R.theme) return;
    var n = txt.length;
    R.theme.classList.toggle("long",  n > 34 && n <= 60);
    R.theme.classList.toggle("xlong", n > 60);
  }

  /* ---------------- sorteio ---------------- */
  function seen() { try { return JSON.parse(localStorage.getItem(SEEN)) || []; } catch (e) { return []; } }
  function remember(id) {
    var s = seen();
    if (s.indexOf(id) < 0) s.push(id);
    if (s.length >= THEMES.length) s = [id];
    try { localStorage.setItem(SEEN, JSON.stringify(s)); } catch (e) {}
  }
  function pickOne() {
    if (!THEMES.length) return null;
    var s = seen();
    var pool = THEMES.filter(function (t) { return s.indexOf(t.id) < 0; });
    if (!pool.length) pool = THEMES;
    if (theme && pool.length > 1) pool = pool.filter(function (t) { return t.id !== theme.id; });
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function draw() {
    var final = pickOne();
    if (!final) { put(R.state, "Roleta vazia"); put(R.theme, "Nenhum tema"); return; }
    setPhase("rolling");
    put(R.state, "Sorteando");
    put(R.sub, "");
    buttons([]);
    var n = 0;
    var spin = setInterval(function () {
      var t = THEMES[Math.floor(Math.random() * THEMES.length)];
      put(R.theme, t.title); fit(t.title);
      pock(.05);
      if (++n >= 12) {
        clearInterval(spin);
        theme = final; remember(final.id);
        pock(.2);
        drawn();
      }
    }, 70);
  }

  function drawn() {
    setPhase("drawn");
    put(R.state, "Tema de hoje");
    put(R.theme, theme.title); fit(theme.title);
    put(R.sub, theme.by ? "sugestão de " + theme.by : "");
    setFill(0);
    buttons([
      ["Estudar " + ESTUDO + " min", function () { start(ESTUDO * 60000, "study"); }, true],
      ["Outro tema", draw]
    ]);
  }

  /* ---------------- cronômetro ---------------- */
  function fmt(ms) {
    var s = Math.ceil(Math.max(0, ms) / 1000);
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  function tick() {
    if (!running) return;
    remain = endAt - Date.now();
    put(R.clock, fmt(remain));
    setFill(total ? 1 - remain / total : 0);
    if (remain <= 0) { finish(); return; }
    raf = requestAnimationFrame(tick);
  }
  function start(ms, kind) {
    setPhase(kind);
    remain = ms; total = ms; endAt = Date.now() + ms; running = true;
    setFill(0);
    put(R.state, kind === "study" ? "Estudando" : "Explicando");
    put(R.sub, theme ? theme.title : "");
    put(R.clock, fmt(remain));
    buttons([
      ["Pausar", toggle, true],
      [kind === "study" ? "Já sei" : "Fim", function () { finish(); }]
    ]);
    run();
  }
  /* o requestAnimationFrame congela com a aba em segundo plano;
     o intervalo continua e garante que o tempo acabe na hora certa. */
  function run() {
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    clearInterval(guard);
    guard = setInterval(function () {
      if (running && Date.now() >= endAt) finish();
    }, 500);
  }
  function stop() {
    running = false; cancelAnimationFrame(raf); clearInterval(guard);
  }
  function toggle() {
    if (running) { stop(); remain = endAt - Date.now(); }
    else { running = true; endAt = Date.now() + remain; run(); }
    if (R.acts && R.acts.firstChild) R.acts.firstChild.textContent = running ? "Pausar" : "Continuar";
  }
  function finish() {
    stop();
    setFill(1);
    if (phase === "study") {
      beep(2);
      setPhase("ready");
      put(R.state, "Acabou o estudo");
      put(R.theme, theme.title); fit(theme.title);
      put(R.clock, "00:00");
      buttons([
        ["Explicar " + FALA + " min", function () { start(FALA * 60000, "speech"); }, true],
        ["Mais 5 min", function () { start(5 * 60000, "study"); }]
      ]);
    } else {
      chime();
      setPhase("done");
      put(R.state, "Ponto encerrado");
      put(R.theme, theme.title); fit(theme.title);
      put(R.sub, "grava o vídeo agora");
      buttons([["Sortear outro", draw, true]]);
    }
  }

  /* ---------------- início ---------------- */
  function idle() {
    setPhase("idle");
    put(R.state, "");
    put(R.theme, THEMES.length ? "Aperte sortear" : "Sem temas");
    fit("Aperte sortear");
    put(R.sub, "");
    put(R.clock, String(ESTUDO).padStart(2, "0") + ":00");
    setFill(0);
    buttons([["Sortear tema", draw, true]]);
  }

  var hot = document.querySelector("[data-draw]");
  if (hot) hot.addEventListener("click", function (e) {
    if (e.target.closest("button,a")) return;
    if (phase === "idle" || phase === "done") { pock(.07); draw(); }
  });

  document.addEventListener("keydown", function (e) {
    if (e.code !== "Space") return;
    if (/^(INPUT|TEXTAREA|A|BUTTON)$/.test(document.activeElement.tagName)) return;
    e.preventDefault();
    if (phase === "idle" || phase === "done") draw();
    else if (phase === "study" || phase === "speech") toggle();
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && running) { remain = endAt - Date.now(); run(); }
  });

  idle();
})();
