/* Lia-Circuits · Arbeitsfläche
 *
 * Zeichnet die Schaltung als SVG und macht sie bedienbar: Bauteile aus der Leiste holen,
 * verschieben, drehen, Werte ändern, Leitungen legen, messen. Nach jeder Änderung wird neu
 * gerechnet (circuits-solver.js) und neu gezeichnet (circuits-parts.js). Schaltungen mit
 * Kondensator, Spule, Wechselspannung oder Oszilloskop laufen in der Zeit weiter.
 * Einfache Datei ohne Build-Schritt.
 */
(function (global) {
  "use strict";
  var LC = (global.LiaCircuits = global.LiaCircuits || {});
  var G = 40;                          // Pixel je Rasterschritt
  var FRAME_MS = 6;                    // Rechenzeit je Bild; reicht sie nicht, läuft die Schaltung in Zeitlupe
  var CHUNK = 50;                      // Zeitschritte am Stück, zwischen zwei Blicken auf die Uhr
  LC.store = LC.store || {};           // Zustand je Arbeitsfläche – überlebt den Folienwechsel

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  /** Sprache der Seite als Code von LiaScript; ohne Angabe Deutsch, "" für eine Sprache ohne eigene Übersetzung. */
  function language() {
    var l = typeof document !== "undefined" && document.documentElement.lang;
    return l ? LC.lang(l) : "de";
  }

  // Sprachwechsel von außen: LiaScript, Google Übersetzer oder die Übersetzung des Browsers setzen lang an <html>.
  // Dann werden alle sichtbaren Flächen in der neuen Sprache neu gebaut; ihr Zustand bleibt (LC.store).
  var mounted = [];
  function relocalize() {
    var lang = language();
    mounted = mounted.filter(function (el) { return el.isConnected && el._lc; });
    mounted.forEach(function (el) { if (el._lc.lang !== lang) el._lc.remount(); });   // "" (keine eigene) zählt für sich
  }
  if (typeof MutationObserver !== "undefined" && typeof document !== "undefined")
    new MutationObserver(relocalize).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  /** Geschwindigkeit der wandernden Punkte in Pixel je Sekunde, mit Vorzeichen. */
  function speedOf(current) {
    var a = Math.abs(current);
    if (a < 1e-6) return 0;
    return (current > 0 ? 1 : -1) * clamp(12 + 14 * Math.log10(a / 1e-3), 6, 80);
  }

  /** Baut die Arbeitsfläche in das Element el; source ist die Beschreibung der Schaltung (JSON-Text).
   *  options.onChange(text) erfährt jede Änderung der Schaltung als Text; solange options.paused() gilt, wird nicht
   *  gerechnet: Bauen ja, Strom nein (@Circuits.code: Play schaltet die Simulation ein, circuits-code.js). */
  function mount(el, source, options) {
    var onChange = options && options.onChange, paused = options && options.paused;
    if (!el) return;
    if (el._lc) el._lc.stop();                           // dasselbe Element wird neu aufgebaut
    var lang = language(), own = !!LC.strings[lang], esc = LC.escape;
    if (!own) lang = "en";
    function T(key) { return LC.text(key, lang); }
    if (mounted.indexOf(el) < 0) mounted.push(el);
    // Mit eigener Übersetzung übersetzt Google die Fläche nicht noch einmal; ohne sie (Englisch) darf er.
    if (own) { el.setAttribute("translate", "no"); el.classList.add("notranslate"); }
    else { el.removeAttribute("translate"); el.classList.remove("notranslate"); }

    var st = LC.store[el.id];
    if (!st) {
      st = LC.store[el.id] = { circuit: null, initial: "", selected: null, copyText: null, error: null, run: null };
      try { st.circuit = LC.normalize(source); st.initial = LC.serialize(st.circuit); }
      catch (error) { st.error = error; }
    }
    el.classList.add("lia-circuits");
    if (st.error) {
      var key = { json: "errJson", part: "errPart", wire: "errWire", place: "errPlace", task: "errTask" }[st.error.code] || "errOther";
      el.innerHTML = '<p class="lc-error" role="alert">' + esc(T(key)) + (st.error.detail ? ": " + esc(st.error.detail) : "") + "</p>";
      return;
    }
    st.rows = st.rows || [];           // notierte Messwerte (Tabelle unter der Fläche)
    // Fehlersuche: Die vorgegebene Schaltung enthält einen versteckten Defekt. Dann fehlt "Schaltung als Text
    // kopieren" (der Text würde ihn verraten), und "Ersetzen" bleibt auch in einer gesperrten Schaltung möglich.
    if (st.hunt === undefined) st.hunt = st.circuit.parts.some(function (p) { return !!p.fault; });
    if (st.potential === undefined) st.potential = !!st.circuit.potential;   // Leitungen nach Potenzial gefärbt; die Autorin kann es vorab einschalten

    var uid = "lc-" + String(el.id).replace(/[^A-Za-z0-9_-]/g, "");
    var ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
    // Kopfzeile: Ansicht, Bauteile, Rückgängig, Zoom, Ton; Seltenes (Zurücksetzen, als Text kopieren) im Menü "Mehr".
    // Darunter die Leiste (Fächer, eine Zeile Bauteile), die Fläche mit dem Feld des gewählten Bauteils, Aufgabe und Messwerte.
    el.innerHTML =
      '<div class="lc-top">' +
        '<div class="lc-views" role="group" aria-label="' + esc(T("view")) + '">' +
          '<button type="button" data-view="picture">' + esc(T("viewPicture")) + "</button>" +
          '<button type="button" data-view="symbol">' + esc(T("viewSymbol")) + "</button></div>" +
        '<button type="button" class="lc-barbtn" data-act="parts" aria-expanded="false" aria-controls="' + uid + '-bar">' + ICON +
          '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' +
          esc(T("parts")) + "</button>" +
        '<span class="lc-fill"></span>' +
        '<div class="lc-tools">' +
          '<button type="button" data-act="undo" title="' + esc(T("undo")) + ' (Ctrl+Z)" aria-label="' + esc(T("undo")) + '">↶</button>' +
          '<button type="button" data-act="redo" title="' + esc(T("redo")) + ' (Ctrl+Y)" aria-label="' + esc(T("redo")) + '">↷</button>' +
          '<button type="button" data-act="zoomout" title="' + esc(T("zoomOut")) + '" aria-label="' + esc(T("zoomOut")) + '">−</button>' +
          '<button type="button" data-act="zoomin" title="' + esc(T("zoomIn")) + '" aria-label="' + esc(T("zoomIn")) + '">+</button>' +
          '<button type="button" data-act="fit" hidden>' + esc(T("fit")) + "</button>" +
          '<button type="button" data-act="sound" aria-pressed="false" title="' + esc(T("sound")) + '" aria-label="' + esc(T("sound")) + '" hidden>🔇</button>' +
          '<button type="button" data-act="potential" aria-pressed="false" title="' + esc(T("potential")) + '" aria-label="' + esc(T("potential")) + '">' +
            '<svg width="22" height="18" viewBox="0 0 22 18" aria-hidden="true" focusable="false"><defs><linearGradient id="' + uid + '-pot">' +
            '<stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#dc2626"/></linearGradient></defs>' +
            '<rect x="1" y="6" width="20" height="6" rx="3" fill="url(#' + uid + '-pot)"/></svg></button>' +
          '<div class="lc-more">' +
            '<button type="button" data-act="more" aria-haspopup="true" aria-expanded="false" title="' + esc(T("more")) + '" aria-label="' + esc(T("more")) + '">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg></button>' +
            '<div class="lc-menu" hidden>' +
              '<button type="button" data-act="reset">' + esc(T("reset")) + "</button>" +
              '<button type="button" data-act="copy">' + esc(T("copy")) + "</button></div></div></div></div>" +
      '<div class="lc-bar" id="' + uid + '-bar" hidden>' +
        '<div class="lc-tabs" role="tablist" aria-label="' + esc(T("parts")) + '"></div>' +
        '<div class="lc-palette" role="toolbar" aria-label="' + esc(T("parts")) + '"></div></div>' +
      '<div class="lc-stage"><svg class="lc-svg" xmlns="http://www.w3.org/2000/svg" tabindex="0" role="group" aria-label="' + esc(T("workspace")) + '"></svg>' +
        '</div><div class="lc-panel"></div>' +
      '<div class="lc-status" role="status" aria-live="polite"></div>' +
      '<div class="lc-panes" role="tablist" hidden>' +
        '<button type="button" role="tab" data-act="pane" data-pane="task">' + esc(T("task")) + "</button>" +
        '<button type="button" role="tab" data-act="pane" data-pane="log">' + esc(T("readings")) + "</button></div>" +
      '<div class="lc-task" hidden><p class="lc-task-text"></p><ul class="lc-goals"></ul>' +
        '<p class="lc-done" role="status" aria-live="polite"></p></div>' +
      '<div class="lc-log" hidden></div>';
    var svg = el.querySelector(".lc-svg"), palette = el.querySelector(".lc-palette");
    var bar = el.querySelector(".lc-bar"), tabs = el.querySelector(".lc-tabs"), menu = el.querySelector(".lc-menu"), panes = el.querySelector(".lc-panes");
    var panel = el.querySelector(".lc-panel"), status = el.querySelector(".lc-status");
    var taskBox = el.querySelector(".lc-task"), logBox = el.querySelector(".lc-log");
    var taskText = el.querySelector(".lc-task-text"), goalList = el.querySelector(".lc-goals"), doneNode = el.querySelector(".lc-done");
    var drag = null;       // laufende Zeigerbewegung auf der Fläche: Leitung legen oder Bauteil schieben
    var adding = null;     // Bauteil, das gerade aus der Leiste gezogen wird
    var kbd = null;        // Bauteil, das per Tastatur den Fokus hat
    var note = "";         // kurze Meldung (z. B. "kopiert")
    var flows = [], partNodes = [], warnNode = null, slowNode = null;   // Knoten der letzten Zeichnung
    var offsets = [];      // Lage der wandernden Punkte je Leitungsstück
    var raf = 0, lastTime = 0, pending = 0, sinceLive = 0, slow = false, stopped = false;
    var still = !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    // Mit dem Finger (grober Zeiger) sind die Greifflächen an Anschlüssen und Klemmen größer.
    var coarse = !!(global.matchMedia && global.matchMedia("(pointer: coarse)").matches);
    var GRAB = coarse ? 18 : 13;

    // ------------------------------------------------------------ Rückgängig und Wiederholen

    st.history = st.history || [];     // frühere Stände der Schaltung (als Text)
    st.future = st.future || [];       // rückgängig gemachte Stände, zum Wiederholen
    /** Der Stand der Schaltung als Text – ohne die Ansicht, die kein Schritt zum Zurücknehmen ist. */
    function snapshot() { return LC.serialize(Object.assign({}, st.circuit, { view: "picture" })); }
    if (st.last === undefined) st.last = snapshot();

    // ------------------------------------------------------------ Zoomen und Verschieben

    // Der Ausschnitt ist nur Ansicht, kein Schritt zum Zurücknehmen; er steht nicht im Text der Schaltung.
    // s: Vergrößerung, x/y: linke obere Ecke des Ausschnitts in Pixeln der Fläche.
    var ZOOM_MAX = 4;
    st.cam = st.cam || { s: 1, x: 0, y: 0 };
    /** Vergrößert um den Faktor f; der Punkt (gx, gy) der Fläche bleibt dabei an seiner Stelle (ohne Punkt: die Mitte). */
    function zoom(f, gx, gy) {
      var c = st.circuit, cam = st.cam, s = clamp(cam.s * f, 1, ZOOM_MAX);
      if (gx === undefined) { gx = cam.x + c.size[0] * G / cam.s / 2; gy = cam.y + c.size[1] * G / cam.s / 2; }
      cam.x = gx - (gx - cam.x) * cam.s / s; cam.y = gy - (gy - cam.y) * cam.s / s; cam.s = s;
      renderStage(); renderTools();
    }
    /** Pixel der Fläche je Bildschirmpixel. */
    function scale() { return st.circuit.size[0] * G / st.cam.s / (svg.getBoundingClientRect().width || 1); }

    function renderTools() {
      var undoButton = el.querySelector('[data-act="undo"]'), redoButton = el.querySelector('[data-act="redo"]');
      if (undoButton) undoButton.disabled = !st.history.length;
      if (redoButton) redoButton.disabled = !st.future.length;
      var zoomOut = el.querySelector('[data-act="zoomout"]'), zoomIn = el.querySelector('[data-act="zoomin"]'), fit = el.querySelector('[data-act="fit"]');
      if (zoomOut) zoomOut.disabled = st.cam.s <= 1;
      if (zoomIn) zoomIn.disabled = st.cam.s >= ZOOM_MAX;
      if (fit) fit.hidden = st.cam.s <= 1;
      var soundButton = el.querySelector('[data-act="sound"]');           // nur, wenn etwas in der Schaltung klingen kann
      if (soundButton) {
        soundButton.hidden = !st.circuit.parts.some(function (p) { return !!LC.parts[p.type].tone; });
        soundButton.setAttribute("aria-pressed", String(!!st.sound));
        soundButton.textContent = st.sound ? "🔊" : "🔇";
      }
      var potentialButton = el.querySelector('[data-act="potential"]');
      if (potentialButton) potentialButton.setAttribute("aria-pressed", String(!!st.potential));
      var copyButton = el.querySelector('[data-act="copy"]');
      if (copyButton) copyButton.hidden = !!st.hunt;
    }
    /**
     * Nach jeder Bedienung aufrufen: Hat sich die Schaltung geändert, wandert der vorige Stand in die
     * Liste für "Rückgängig". Mit burst zählen schnelle Änderungen an derselben Einstellung als ein Schritt.
     */
    function commit(burst) {
      var now = snapshot(), time = Date.now();
      if (now === st.last) return;
      var same = burst && st.burst === burst && time - st.burstTime < 1500;
      if (!same) { st.history.push(st.last); if (st.history.length > 100) st.history.shift(); }
      st.future.length = 0;
      st.last = now; st.burst = burst || null; st.burstTime = time;
      renderTools();
      if (onChange) onChange(LC.serialize(st.circuit));
    }
    function restore(text) {
      var view = st.circuit.view;
      st.circuit = LC.normalize(text);
      st.circuit.view = view;
      st.selected = null; st.copyText = null; kbd = null; note = ""; st.burst = null;
      st.last = snapshot();
      renderAll();
      svg.focus({ preventScroll: true });
      if (onChange) onChange(LC.serialize(st.circuit));
    }
    function undo() { if (!st.history.length) return; st.future.push(snapshot()); restore(st.history.pop()); }
    function redo() { if (!st.future.length) return; st.history.push(snapshot()); restore(st.future.pop()); }

    // ------------------------------------------------------------ rechnen

    /** Rechnet die Schaltung nach einer Änderung neu: im Ruhezustand oder als nächster Zeitschritt. */
    function compute() {
      var c = st.circuit;
      if (paused && paused()) {                          // Bauen ohne Strom: nur das Netz für Anschlüsse und Abzweige
        st.run = null;
        var net = LC.buildNet(c);
        return { parts: c.parts.map(function () { return null; }), edges: net.edges, overlaps: net.overlaps, warnings: [], events: [],
          anchors: net.pointOf.map(function (pt, k) { return { x: pt[0], y: pt[1], degree: net.degree[k], terminal: net.hasTerminal[k] }; }) };
      }
      try {
        if (LC.isDynamic(c)) {
          if (!st.run || st.run.circuit !== c) st.run = LC.createRun(c); else LC.refresh(st.run);
          return LC.advance(st.run, 1);
        }
        st.run = null;
        return LC.simulate(c);
      } catch (error) {
        st.run = null;
        return { failed: true, parts: c.parts.map(function () { return null; }), edges: [], anchors: [], warnings: [], events: [] };
      }
    }

    // ------------------------------------------------------------ zeichnen

    /** Die Teile der Leiste: alle, die in der Beschreibung genannten – oder keine, wenn die Schaltung gesperrt ist. */
    function paletteList() {
      var c = st.circuit;
      return c.lock ? [] : c.palette || LC.palette;
    }

    // Die Leiste ist offen, wenn die Fläche leer ist oder die Autorin die Teile vorgibt; sonst zu, bis man sie braucht.
    if (st.shelf === undefined) st.shelf = !st.circuit.parts.length || !!st.circuit.palette;

    /** Die Fächer mit den Teilen dieser Leiste. Fächer als Reiter erst ab neun Teilen; wenige Teile stehen in einer Zeile. */
    function shelfGroups(list) {
      var groups = LC.paletteGroups.map(function (g) {
        return [g[0], g[1].filter(function (type) { return list.indexOf(type) >= 0; })];
      }).filter(function (g) { return g[1].length; });
      return list.length > 8 && groups.length > 1 ? groups : [];
    }

    function renderPalette() {
      var view = st.circuit.view, list = paletteList(), groups = shelfGroups(list);
      if (!groups.some(function (g) { return g[0] === st.group; })) st.group = groups.length ? groups[0][0] : null;
      var shown = groups.length ? groups.filter(function (g) { return g[0] === st.group; })[0][1] : list;
      var partsButton = el.querySelector('[data-act="parts"]');
      if (partsButton) { partsButton.hidden = !list.length; partsButton.setAttribute("aria-expanded", String(!!st.shelf)); }
      bar.hidden = !list.length || !st.shelf;
      tabs.hidden = !groups.length;
      tabs.innerHTML = groups.map(function (g) {
        return '<button type="button" role="tab" data-act="group" data-group="' + g[0] + '" aria-selected="' + (g[0] === st.group) + '">' +
          esc(T(g[0])) + '<span class="lc-n">' + g[1].length + "</span></button>";
      }).join("");
      el.classList.toggle("lc-locked", !!st.circuit.lock);
      palette.innerHTML = list.map(function (type) {
        var def = LC.parts[type], p = Object.assign({ type: type, x: 0, y: 0, rot: 0 }, def.defaults), b = def.box;
        var x0 = Math.min(b[0], -44), x1 = Math.max(b[0] + b[2], 44), y0 = Math.min(b[1], -30), y1 = Math.max(b[1] + b[3], 30);
        return '<button type="button" class="lc-pal" data-add="' + type + '" title="' + esc(T(type)) + '"' + (shown.indexOf(type) < 0 ? " hidden" : "") + ">" +
          '<svg viewBox="' + (x0 - 2) + " " + (y0 - 2) + " " + (x1 - x0 + 4) + " " + (y1 - y0 + 4) + '" aria-hidden="true" focusable="false">' +
          def.draw(p, null, { view: view, rot: 0, uid: uid, lang: lang }) + "</svg><span>" + esc(T(type)) + "</span></button>";
      }).join("");
      Array.prototype.forEach.call(el.querySelectorAll("[data-view]"), function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === view));
      });
    }

    /** Richtung der wandernden Punkte: technische Stromrichtung (+ nach −) oder, mit "flow":"electrons", die der Elektronen. */
    function dir() { return st.circuit.flow === "electrons" ? -1 : 1; }

    function pathOf(points) {
      return "M" + points.map(function (pt) { return pt[0] * G + " " + pt[1] * G; }).join(" L");
    }

    function ariaOf(p, r) {
      var def = LC.parts[p.type];
      var text = def.state ? def.state(p, r, lang) : def.caption ? def.caption(p, lang, r) : "";
      return T(p.type) + (text ? ": " + text : "");
    }

    /** Inhalt eines Bauteils: Fläche zum Anfassen, Zeichnung, Beschriftung. */
    function partInner(p, r) {
      var def = LC.parts[p.type], box = def.box, ctx = { view: st.circuit.view, rot: p.rot || 0, uid: uid, lang: lang };
      var caption = "";
      if (def.caption) {
        // Die Beschriftung steht unter dem Bauteil, bei einem senkrecht stehenden rechts daneben.
        var top = -box[1], bottom = box[1] + box[3], rot = p.rot || 0;
        var at = rot === 1 ? [0, -(top + 6), "start"] : rot === 3 ? [0, bottom + 6, "start"] : rot === 2 ? [0, -(top + 8), "middle"]
          : def.captionAt ? [def.captionAt[0], def.captionAt[1], "middle"] : [0, bottom + 8, "middle"];
        caption = LC.label(ctx, at[0], at[1], def.caption(p, lang, r, ctx), "lc-text lc-caption", at[2]);
      }
      return '<rect class="lc-box" x="' + box[0] + '" y="' + box[1] + '" width="' + box[2] + '" height="' + box[3] + '" rx="6"/>' +
        def.draw(p, r, ctx) + caption;
    }

    function warningsMarkup(res) {
      var c = st.circuit, s = "";
      res.warnings.forEach(function (w) {
        var p = c.parts[w.part];
        if (p && (w.type === "short" || w.type === "bypass"))
          s += '<text class="lc-warn" x="' + (p.x * G + 14) + '" y="' + (p.y * G - 16) + '">' + (w.type === "short" ? "⚡" : "⚠") + "</text>";
      });
      return s;
    }

    function renderStage() {
      var c = st.circuit, W = c.size[0], H = c.size[1], res = compute();
      st.result = res;
      var cam = st.cam, vw = W * G / cam.s, vh = H * G / cam.s;
      cam.x = clamp(cam.x, 0, W * G - vw); cam.y = clamp(cam.y, 0, H * G - vh);   // nie über den Rand der Fläche hinaus
      svg.setAttribute("viewBox", cam.x + " " + cam.y + " " + vw + " " + vh);
      svg.classList.toggle("lc-zoomed", cam.s > 1);

      var s = "<defs>" +
        '<pattern id="' + uid + '-grid" width="' + G + '" height="' + G + '" x="' + -G / 2 + '" y="' + -G / 2 + '" patternUnits="userSpaceOnUse">' +
        '<circle class="lc-griddot" cx="' + G / 2 + '" cy="' + G / 2 + '" r="1.3"/></pattern>' +
        '<radialGradient id="' + uid + '-glow"><stop offset="0" stop-color="#ffe45c" stop-opacity="0.95"/>' +
        '<stop offset="0.55" stop-color="#ffd84a" stop-opacity="0.45"/><stop offset="1" stop-color="#ffd84a" stop-opacity="0"/></radialGradient></defs>' +
        '<rect class="lc-bg" width="' + W * G + '" height="' + H * G + '"/>' +
        '<rect width="' + W * G + '" height="' + H * G + '" fill="url(#' + uid + '-grid)"/>';

      // Bauteile
      c.parts.forEach(function (p, pi) {
        var r = res.parts[pi], selected = st.selected && st.selected.part === pi;
        s += '<g class="lc-part' + (selected ? " lc-selected" : "") + '" data-part="' + pi + '" tabindex="0" role="button" aria-label="' +
          esc(ariaOf(p, r)) + '" transform="translate(' + p.x * G + " " + p.y * G + ") rotate(" + 90 * (p.rot || 0) + ')">' + partInner(p, r) + "</g>";
      });

      // Leitungen liegen über den Bauteilen: eine Leitung quer über ein Bauteil bleibt sichtbar und lässt sich
      // antippen. Darauf die wandernden Punkte für den Strom (bewegt in frame).
      // Wo Leitungen übereinanderliegen, bekommt die Stelle einen orangen Rand und helle Striche.
      var marks = "";
      (res.overlaps || []).forEach(function (o) { marks += "M" + o[0] * G + " " + o[1] * G + " L" + o[2] * G + " " + o[3] * G + " "; });
      if (marks) s += '<path class="lc-overlap" d="' + marks + '"/>';
      var selectedWire = st.selected && st.selected.wire != null ? st.selected.wire : -1;
      var pieces = res.failed
        ? c.wires.map(function (w, wi) { return { wire: wi, path: LC.lattice(w), current: 0 }; })
        : res.edges;
      pieces.forEach(function (e) {
        var d = pathOf(e.path);
        s += '<path class="lc-wire' + (e.wire === selectedWire ? " lc-selected" : "") + '" d="' + d + '"/>' +
          '<path class="lc-flow" d="' + d + '" style="opacity:0"/>';
        if (Math.abs(e.current) > 1e-6) {
          var a = e.path[0], b = e.path[1];
          var angle = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + (e.current * dir() > 0 ? 0 : 180);
          s += '<path class="lc-arrow" d="M-5 -4 L4 0 L-5 4 z" transform="translate(' + (a[0] + b[0]) / 2 * G + " " + (a[1] + b[1]) / 2 * G + ") rotate(" + angle.toFixed(0) + ')"/>';
        }
        s += '<path class="lc-hit" d="' + d + '" data-wire="' + e.wire + '"/>';
      });
      if (marks) s += '<path class="lc-overlap-top" d="' + marks + '"/>';
      s += '<g class="lc-warnings">' + warningsMarkup(res) + "</g>";

      // Anschlusspunkte: von hier aus zieht man Leitungen
      c.parts.forEach(function (p) {
        if (LC.parts[p.type].probes) return;             // Klemmen an Messleitungen: siehe unten
        LC.terminalPoints(p).forEach(function (pt) {
          s += '<circle class="lc-term" cx="' + pt[0] * G + '" cy="' + pt[1] * G + '" r="4.5"/>' +
            '<circle class="lc-grab" cx="' + pt[0] * G + '" cy="' + pt[1] * G + '" r="' + GRAB + '" data-term="' + pt[0] + "," + pt[1] + '"/>';
        });
      });
      res.anchors.forEach(function (a) {
        if (a.degree >= 3) s += '<circle class="lc-junction" cx="' + a.x * G + '" cy="' + a.y * G + '" r="5"/>';
        if (!a.terminal && a.degree === 1)
          s += '<circle class="lc-term lc-end" cx="' + a.x * G + '" cy="' + a.y * G + '" r="4"/>' +
            '<circle class="lc-grab" cx="' + a.x * G + '" cy="' + a.y * G + '" r="' + GRAB + '" data-term="' + a.x + "," + a.y + '"/>';
      });
      // Messleitungen mit Krokodilklemmen: rot ist Plus, schwarz ist COM. Die Leitung hängt durch, die Klemme
      // sitzt mit der Spitze auf ihrem Rasterpunkt und lässt sich dorthin ziehen, wo gemessen werden soll.
      c.parts.forEach(function (p, pi) {
        var def = LC.parts[p.type];
        if (!def.probes) return;
        var sockets = def.sockets[c.view] || def.sockets.picture, plain = c.view === "symbol" ? " lc-plain" : "";
        LC.terminalPoints(p).forEach(function (pt, k) {
          var so = LC.rotate(sockets[k][0], sockets[k][1], p.rot || 0);
          var sx = p.x * G + so[0], sy = p.y * G + so[1], cx = pt[0] * G, cy = pt[1] * G;
          var mx = (sx + cx) / 2, my = Math.max(sy, cy) + 10 + 0.18 * Math.hypot(cx - sx, cy - sy);
          var ux = mx - cx, uy = my - cy, length = Math.hypot(ux, uy) || 1;
          ux /= length; uy /= length;
          var color = (k === 0 ? " lc-red" : " lc-black") + plain;
          s += '<path class="lc-cable' + color + '" d="M' + sx.toFixed(1) + " " + sy.toFixed(1) + " Q" + mx.toFixed(1) + " " + my.toFixed(1) + " " +
            (cx + 17 * ux).toFixed(1) + " " + (cy + 17 * uy).toFixed(1) + '"/>' +
            '<g class="lc-clip' + color + '" transform="translate(' + cx + " " + cy + ") rotate(" + (Math.atan2(uy, ux) * 180 / Math.PI).toFixed(0) + ')">' +
            '<path d="M0 0 L8 -5 L18 -4 L18 4 L8 5 Z"/><path class="lc-jaw" d="M1.5 0 L9 0"/></g>' +
            '<circle class="lc-grab" cx="' + cx + '" cy="' + cy + '" r="' + (GRAB + 1) + '" data-probe="' + pi + ":" + k + '"/>';
        });
      });
      if (drag && drag.kind === "wire") s += '<path class="lc-wire lc-preview" d="' + pathOf(LC.lattice(LC.route(drag.from, drag.to))) + '"/>';
      s += '<text class="lc-text lc-slow" x="8" y="16">' + (slow && st.run ? esc(T("slow")) : "") + "</text>";

      svg.innerHTML = s;
      flows = svg.querySelectorAll(".lc-flow");
      partNodes = svg.querySelectorAll(".lc-part");
      warnNode = svg.querySelector(".lc-warnings");
      slowNode = svg.querySelector(".lc-slow");
      paint(res);
      if (offsets.length !== flows.length) offsets = [];
      renderStatus();
      renderLog();
      if (kbd != null) {
        var g = svg.querySelector('[data-part="' + kbd + '"]');
        if (g && document.activeElement !== g) g.focus({ preventScroll: true });
      }
      startLoop();
    }

    /** Potenzial: jede Leitung in der Farbe ihres Knotens, von Blau (niedrigstes) über Violett bis Rot (höchstes Potenzial). */
    function paint(res) {
      var wires = svg.querySelectorAll("path.lc-wire:not(.lc-preview)"), on = st.potential && res && !res.failed, vs = [];
      if (on) res.edges.forEach(function (e) { if (e.v != null) vs.push(e.v); });
      var lo = Math.min.apply(null, vs), hi = Math.max.apply(null, vs);
      for (var k = 0; k < wires.length; k++) {
        var v = on && res.edges[k] ? res.edges[k].v : null, f = (v - lo) / (hi - lo);
        wires[k].style.stroke = v != null && hi - lo > 1e-6 && !wires[k].classList.contains("lc-selected")
          ? "rgb(" + Math.round(37 + 183 * f) + "," + Math.round(99 - 61 * f) + "," + Math.round(235 - 197 * f) + ")" : "";
      }
    }

    /** Im Zeitverlauf: nur das neu zeichnen, was sich mit der Zeit ändert (Lampen, Messwerte, Schirm, Meldungen). */
    function updateLive() {
      var c = st.circuit, res = st.result;
      if (!res || res.failed) return;
      for (var k = 0; k < partNodes.length; k++) {
        var p = c.parts[k];
        if (!p) continue;
        partNodes[k].innerHTML = partInner(p, res.parts[k]);
        var name = ariaOf(p, res.parts[k]);
        if (partNodes[k].getAttribute("aria-label") !== name) partNodes[k].setAttribute("aria-label", name);
      }
      if (warnNode) warnNode.innerHTML = warningsMarkup(res);
      paint(res);                                        // Wechselspannung: das Potenzial ändert sich mit der Zeit
      if (slowNode) { var text = slow ? T("slow") : ""; if (slowNode.textContent !== text) slowNode.textContent = text; }
      renderStatus();
    }

    function renderStatus() {
      var c = st.circuit, res = st.result, messages = [];
      if (res && res.warnings.some(function (w) { return w.type === "short"; })) messages.push(T("short"));
      if (c.parts.some(function (p) { return p.type === "fuse" && p.blown; })) messages.push(T("fuseBlown"));
      if (c.parts.some(function (p) { return p.type === "lamp" && p.blown; })) messages.push(T("lampBlown"));
      if (c.parts.some(function (p) { return p.type === "led" && p.blown; })) messages.push(T("ledBlown"));
      if (res && res.failed) messages.push(T("errOther"));
      var alert = messages.length > 0;
      if (res && res.warnings.some(function (w) { return w.type === "bypass"; })) messages.push(T("bypass"));
      if (st.potential) messages.push(T("potentialKey"));
      if (res && res.overlaps && res.overlaps.length) messages.push(T("overlap"));
      if (note) messages.push(note);
      var text = messages.join(" ");
      if (status.textContent !== text) status.textContent = text;
      status.classList.toggle("lc-alert", alert);
      renderTask();
      syncSound();
    }

    /** Die Aufgabe über der Fläche: ihr Text, je Ziel ein Häkchen und "Geschafft!", sobald alle Ziele erfüllt waren. */
    /** Aufgabe und Messwerte unter der Fläche; gibt es beides, als zwei Reiter. */
    function both() { return !!st.circuit.task && !!st.circuit.table; }
    function renderPanes() {
      panes.hidden = !both();
      Array.prototype.forEach.call(panes.querySelectorAll("[data-pane]"), function (b) {
        b.setAttribute("aria-selected", String(b.getAttribute("data-pane") === (st.pane || "task")));
      });
    }
    function renderTask() {
      var c = st.circuit, task = c.task;
      taskBox.hidden = !task || (both() && st.pane === "log");
      if (!task) return;
      var check = LC.checkTask(c, st.result);
      if (check.done) st.solved = true;
      var text = T("task") + ": " + task.text;
      if (taskText.textContent !== text) taskText.textContent = text;
      var goals = task.goals.map(function (goal, k) {
        var met = check.goals[k];
        return '<li class="lc-goal' + (met ? " lc-met" : "") + '"><span class="lc-tick" aria-hidden="true">' + (met ? "✔" : "○") + "</span> " +
          esc(goal.label || LC.goalText(goal, lang)) + '<span class="lc-sr"> – ' + esc(T(met ? "goalMet" : "goalOpen")) + "</span></li>";
      }).join("");
      if (goalList.innerHTML !== goals) goalList.innerHTML = goals;
      var done = st.solved ? T("done") : "";
      if (doneNode.textContent !== done) doneNode.textContent = done;
    }

    /** Die Messgeräte der Schaltung mit ihrer Spaltenüberschrift, z. B. "Multimeter 1 (V)". */
    function meterColumns() {
      var count = 0, list = [];
      st.circuit.parts.forEach(function (p, pi) {
        var def = LC.parts[p.type];
        if (!def.meter) return;
        count++;
        var unit = def.column ? def.column(p) : "";
        list.push({ part: pi, name: T(p.type).replace(/­/g, "") + " " + count + (unit ? " (" + unit + ")" : "") });
      });
      return list;
    }

    /** Die Messwerttabelle unter der Fläche: "Messwerte notieren" hängt eine Zeile mit den Anzeigen aller Messgeräte an. */
    function renderLog() {
      var c = st.circuit;
      logBox.hidden = !c.table || (both() && st.pane !== "log");
      if (!c.table) return;
      var columns = meterColumns(), rows = st.rows;
      var h = '<div class="lc-log-tools"><button type="button" data-act="note">' + esc(T("noteRow")) + "</button>" +
        ' <button type="button" data-act="clear"' + (rows.length ? "" : " disabled") + ">" + esc(T("clearRows")) + "</button></div>";
      if (rows.length) {
        var width = columns.length;
        rows.forEach(function (row) { width = Math.max(width, row.length); });
        h += '<table class="lc-table"><caption>' + esc(T("readings")) + '</caption><thead><tr><th scope="col">' + esc(T("number")) + "</th>";
        for (var k = 0; k < width; k++) h += '<th scope="col">' + esc(columns[k] ? columns[k].name : "–") + "</th>";
        h += "</tr></thead><tbody>";
        rows.forEach(function (row, n) {
          h += "<tr><td>" + (n + 1) + "</td>";
          for (var q = 0; q < width; q++) h += "<td>" + esc(row[q] === undefined ? "–" : row[q]) + "</td>";
          h += "</tr>";
        });
        h += "</tbody></table>";
      }
      if (logBox.innerHTML !== h) logBox.innerHTML = h;
    }

    // ------------------------------------------------------------ Ton: Summer und Lautsprecher

    if (st.sound === undefined) st.sound = !!st.circuit.sound;           // die Autorin kann ihn vorab einschalten
    var voices = new Map();                                              // Bauteil → { osc, gain }

    /** Der gemeinsame Audio-Kontext. Browser erlauben Ton erst nach einer Bedienung: dann wird er hier geweckt. */
    function audio() {
      var Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return null;
      if (!LC.audio) LC.audio = new Ctx();
      if (LC.audio.state === "suspended" && LC.audio.resume) LC.audio.resume();
      return LC.audio;
    }

    /** Lässt jedes Bauteil klingen, das gerade klingen soll – und nur, solange der Ton an und die Fläche zu sehen ist. */
    function syncSound() {
      var res = st.result, wanted = new Map();
      if (st.sound && !stopped && el.isConnected && res && !res.failed)
        st.circuit.parts.forEach(function (p, k) {
          var def = LC.parts[p.type], tone = def.tone && !p.fault ? def.tone(p, res.parts[k]) : null;
          if (tone) wanted.set(p, tone);
        });
      if (!wanted.size && !voices.size) return;
      var ctx = audio();
      if (!ctx) return;
      var now = ctx.currentTime;
      voices.forEach(function (v, p) {
        if (wanted.has(p)) return;
        v.gain.gain.setTargetAtTime(0, now, 0.02);
        v.osc.stop(now + 0.15);
        voices.delete(p);
      });
      wanted.forEach(function (tone, p) {
        var v = voices.get(p);
        if (!v) {
          v = { osc: ctx.createOscillator(), gain: ctx.createGain() };
          v.gain.gain.value = 0;
          v.osc.connect(v.gain); v.gain.connect(ctx.destination); v.osc.start();
          voices.set(p, v);
        }
        v.osc.type = tone.wave;
        v.osc.frequency.setTargetAtTime(tone.freq, now, 0.01);
        v.gain.gain.setTargetAtTime(0.08 * tone.level, now, 0.02);
      });
    }

    // ------------------------------------------------------------ Bildschleife: Zeit weiterrechnen, Punkte bewegen

    function frame(now) {
      raf = 0;
      if (stopped || !el.isConnected) { syncSound(); return; }   // Folie verlassen: die Schleife endet, der Ton auch
      var dtReal = lastTime ? Math.min(0.1, (now - lastTime) / 1000) : 0;
      lastTime = now;
      var run = st.run;
      if (run && dtReal > 0) {
        pending += dtReal;
        var steps = Math.floor(pending / run.dt);
        if (steps > 0) {
          // so viele Schritte, wie das Gerät in FRAME_MS schafft: ein schneller Rechner bleibt in Echtzeit
          var started = global.performance.now(), done = 0;
          try {
            do { var n = Math.min(CHUNK, steps - done); st.result = LC.advance(run, n); done += n; }
            while (done < steps && global.performance.now() - started < FRAME_MS);
          } catch (error) { st.run = null; }
          slow = done < steps;
          pending = slow ? 0 : pending - steps * run.dt;
          sinceLive += dtReal;
          if (sinceLive >= 0.08) { sinceLive = 0; updateLive(); }
        }
      }
      if (!still && st.result && !st.result.failed) {
        var edges = st.result.edges;
        for (var k = 0; k < flows.length; k++) {
          var f = flows[k], v = edges[k] ? speedOf(edges[k].current * dir()) : 0;
          if (v === 0) { if (f.style.opacity !== "0") f.style.opacity = "0"; continue; }
          if (f.style.opacity !== "1") f.style.opacity = "1";
          offsets[k] = ((offsets[k] || 0) - v * dtReal) % 16;
          f.setAttribute("stroke-dashoffset", offsets[k].toFixed(2));
        }
        // Motoren drehen sich: der Winkel steht am Bauteil (_a), damit er ein Neuzeichnen übersteht
        var parts = st.circuit.parts;
        for (var m = 0; m < parts.length && m < partNodes.length; m++) {
          var result = st.result.parts[m];
          if (!LC.parts[parts[m].type].spins || !result || !result.speed) continue;
          parts[m]._a = ((parts[m]._a || 0) + 360 * result.speed * dtReal) % 360;
          var rotor = partNodes[m].querySelector(".lc-rotor");
          if (rotor) rotor.setAttribute("transform", "rotate(" + parts[m]._a.toFixed(1) + ")");
        }
      }
      raf = global.requestAnimationFrame(frame);
    }
    function startLoop() {
      if (raf || stopped || !global.requestAnimationFrame) return;
      lastTime = 0;
      raf = global.requestAnimationFrame(frame);
    }

    // ------------------------------------------------------------ Einstellungen des gewählten Bauteils

    function rangeText(p, ctl) {
      return ctl.unit ? LC.format(p[ctl.prop], ctl.unit, lang, true) : Math.round(p[ctl.prop] * 100) + " %";
    }

    function control(p, ctl, k) {
      var name = esc(T(ctl.label || "value"));
      if (ctl.kind === "number") {
        var current = ctl.get ? ctl.get(p) : p[ctl.prop], factor = ctl.units ? ctl.units[0][1] : 1;
        if (ctl.units) ctl.units.forEach(function (u) { if (current >= u[1]) factor = u[1]; });
        return " <label>" + name + ' <input type="number" data-ctl="' + k + '" value="' + +(current / factor).toPrecision(6) + '" min="' + (ctl.min || 0) + '"' +
          (ctl.max != null ? ' max="' + ctl.max + '"' : "") + ' step="' + (ctl.step || "any") + '"></label>' +
          (ctl.units
            ? ' <select data-unit="' + k + '" aria-label="' + esc(ctl.unit) + '">' + ctl.units.map(function (u) {
              return '<option value="' + u[1] + '"' + (u[1] === factor ? " selected" : "") + ">" + esc(u[0]) + "</option>";
            }).join("") + "</select>"
            : " " + esc(ctl.unit));
      }
      if (ctl.kind === "range")
        return " <label>" + name + ' <input type="range" data-ctl="' + k + '" min="' + ctl.min + '" max="' + ctl.max + '" step="' + ctl.step + '" value="' + p[ctl.prop] + '">' +
          ' <output data-out="' + k + '">' + esc(rangeText(p, ctl)) + "</output></label>";
      if (ctl.kind === "select") {
        var options = typeof ctl.options === "function" ? ctl.options(lang) : ctl.options;
        return " <label>" + name + ' <select data-ctl="' + k + '">' + options.map(function (o) {
          return '<option value="' + esc(o[0]) + '"' + (String(p[ctl.prop]) === String(o[0]) ? " selected" : "") + ">" + esc(T(o[1])) + "</option>";
        }).join("") + "</select></label>";
      }
      if (ctl.kind === "toggle") return ' <button type="button" data-act="tap">' + esc(T(p[ctl.prop] ? ctl.on : ctl.off)) + "</button>";
      if (ctl.kind === "flip") return ' <button type="button" data-act="tap">' + esc(T(ctl.label)) + "</button>";
      if (ctl.kind === "replace") return p[ctl.prop] ? ' <button type="button" data-act="tap">' + esc(T(ctl.label)) + "</button>" : "";
      if (ctl.kind === "action") return ' <button type="button" data-act="act">' + esc(T(ctl.label)) + "</button>";
      return "";
    }

    /**
     * Darf diese Einstellung bedient werden? In einer gesperrten Schaltung nur, was Schalten, Regler bedienen
     * und Messen ist: Schieberegler, Schalt- und Ersatzknöpfe und die Einstellungen der Messgeräte – keine Zahlenwerte.
     */
    function allowed(def, ctl) {
      if (!st.circuit.lock) return true;
      return ctl.kind === "range" || ctl.kind === "toggle" || ctl.kind === "flip" || ctl.kind === "replace" || ctl.kind === "action" ||
        (ctl.kind === "select" && !!def.instrument);
    }

    /** Das Feld des gewählten Bauteils steht unter der Fläche und verdeckt nichts; ohne Auswahl ein Hinweis. */
    function renderPanel() {
      var c = st.circuit, sel = st.selected, h, float = st.copyText != null || !!sel;
      panel.classList.toggle("lc-float", float);
      panel.setAttribute("role", float ? "group" : "note");
      var close = float ? '<button type="button" class="lc-close" data-act="deselect" aria-label="' + esc(T("closePanel")) + '">' + ICON +
        '<path d="M18 6L6 18M6 6l12 12"/></svg></button>' : "";
      if (st.copyText != null) {
        h = '<p class="lc-hint">' + esc(T("copyManual")) + '</p><textarea class="lc-copy" readonly rows="7">' + esc(st.copyText) + "</textarea>";
      } else if (!sel) {
        h = '<p class="lc-hint">' + esc(T(c.lock ? "hintLock" : "hint")) + "</p>";
      } else if (sel.wire != null) {
        h = "<strong>" + esc(T("wire")) + '</strong> <button type="button" data-act="remove">' + esc(T("remove")) + "</button>";
      } else {
        var p = c.parts[sel.part], def = LC.parts[p.type], own = false;
        h = "<strong>" + esc(T(p.type)) + "</strong>";
        (def.controls || []).forEach(function (ctl, k) {
          if (!allowed(def, ctl)) return;
          h += control(p, ctl, k);
          if (ctl.kind === "replace" && p[ctl.prop]) own = true;      // sichtbar kaputt: das Bauteil zeigt schon seinen eigenen Ersatzknopf
        });
        if (!c.lock && !def.fixed) h += ' <button type="button" data-act="turn">' + esc(T("turn")) + "</button>";
        // Jedes Bauteil lässt sich ersetzen – auch eines, dem man den Defekt nicht ansieht (Fehlersuche).
        if (!own && (!c.lock || st.hunt)) h += ' <button type="button" data-act="swap">' + esc(T("swap")) + "</button>";
        if (!c.lock) h += ' <button type="button" data-act="remove">' + esc(T("remove")) + "</button>";
      }
      panel.innerHTML = close + h;
    }

    function renderAll() { renderPalette(); renderStage(); renderPanel(); renderTools(); renderPanes(); }

    // ------------------------------------------------------------ Schaltung ändern

    function point(ev) {
      var m = svg.getScreenCTM();
      if (!m) return { x: 0, y: 0 };
      var p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
      return { x: p.x, y: p.y };
    }
    /** Ist der Platz belegt? Zwei Bauteile dürfen sich an den Anschlüssen berühren, aber keines darf mit
     *  seiner Mitte auf der Mitte oder einem Anschluss eines anderen liegen. */
    function occupied(x, y, except, part) {
      var mine = LC.terminalPoints(Object.assign({}, part, { x: x, y: y }));
      return st.circuit.parts.some(function (q, k) {
        if (k === except) return false;
        if (q.x === x && q.y === y) return true;
        if (LC.terminalPoints(q).some(function (pt) { return pt[0] === x && pt[1] === y; })) return true;
        return mine.some(function (pt) { return pt[0] === q.x && pt[1] === q.y; });
      });
    }
    /** Leitungsenden, die an den Anschlüssen eines Bauteils hängen – sie wandern beim Schieben mit. */
    function attachments(pi) {
      var c = st.circuit, list = [];
      LC.terminalPoints(c.parts[pi]).forEach(function (pt, t) {
        c.wires.forEach(function (w, wi) {
          if (w[0] === pt[0] && w[1] === pt[1]) list.push({ wire: wi, end: 0, t: t });
          if (w[w.length - 2] === pt[0] && w[w.length - 1] === pt[1]) list.push({ wire: wi, end: 1, t: t });
        });
      });
      return list;
    }
    /** Nimmt doppelte Punkte und Punkte auf gerader Strecke aus einer Leitung. */
    function straighten(w) {
      var out = [];
      for (var k = 0; k < w.length; k += 2) {
        var n = out.length;
        if (n >= 2 && out[n - 2] === w[k] && out[n - 1] === w[k + 1]) continue;
        if (n >= 4 && (out[n - 2] - out[n - 4]) * (w[k + 1] - out[n - 1]) === (out[n - 1] - out[n - 3]) * (w[k] - out[n - 2])) {
          out.length = n - 2;                                    // der mittlere Punkt liegt auf der Geraden
          if (out[n - 4] === w[k] && out[n - 3] === w[k + 1]) continue;
        }
        out.push(w[k], w[k + 1]);
      }
      return out.length >= 4 ? out : [w[0], w[1], w[0], w[1]];
    }
    /** Führt die Leitungsenden einem bewegten Bauteil nach: nur das letzte Stück wird neu gelegt, der Rest bleibt. */
    function reattach(pi, list) {
      var c = st.circuit, pts = LC.terminalPoints(c.parts[pi]);
      list.forEach(function (a) {
        var w = c.wires[a.wire], n = w.length;
        c.wires[a.wire] = straighten(a.end === 0
          ? LC.route(pts[a.t], [w[2], w[3]]).concat(w.slice(4))
          : w.slice(0, n - 4).concat(LC.route([w[n - 4], w[n - 3]], pts[a.t])));
      });
    }
    /** Entfernt Leitungen ohne Länge (entstehen, wenn zwei Anschlüsse aufeinander geschoben werden). */
    function tidy() {
      var c = st.circuit, before = c.wires.length;
      c.wires = c.wires.filter(function (w) {
        for (var k = 2; k < w.length; k += 2) if (w[k] !== w[0] || w[k + 1] !== w[1]) return true;
        return false;
      });
      if (c.wires.length !== before && st.selected && st.selected.wire != null) st.selected = null;
    }
    function newPart(type, x, y) {
      return Object.assign({ type: type, x: x, y: y, rot: 0 }, JSON.parse(JSON.stringify(LC.parts[type].defaults)));
    }
    /** Ein freier Platz für ein neues Bauteil: nicht auf einem anderen Bauteil und so, dass kein Anschluss
     *  eine Leitung oder einen fremden Anschluss berührt (sonst wäre es ungewollt schon angeschlossen). */
    function freeSpot(type) {
      var c = st.circuit, taken = {}, probe = { type: type, x: 0, y: 0, rot: 0 };
      c.wires.forEach(function (w) { LC.lattice(w).forEach(function (pt) { taken[pt[0] + "," + pt[1]] = true; }); });
      c.parts.forEach(function (q) { LC.terminalPoints(q).forEach(function (pt) { taken[pt[0] + "," + pt[1]] = true; }); });
      for (var y = 2; y < c.size[1] - 1; y++)
        for (var x = 2; x < c.size[0] - 1; x++) {
          probe.x = x; probe.y = y;
          if (c.parts.some(function (q) { return Math.abs(q.x - x) < 3 && Math.abs(q.y - y) < 2; })) continue;
          if (taken[x + "," + y] || LC.terminalPoints(probe).some(function (pt) { return taken[pt[0] + "," + pt[1]]; })) continue;
          return [x, y];
        }
      return [2, 2];
    }
    function add(type) {
      var c = st.circuit, spot = freeSpot(type);
      c.parts.push(newPart(type, spot[0], spot[1]));
      st.selected = { part: c.parts.length - 1 };
      st.copyText = null;
    }
    /** Dreht nur das Bauteil, die Leitungen bleiben liegen. So polt zweimal Drehen eine Diode oder Batterie um;
     *  würden die Leitungen mitwandern, lägen sie danach quer über dem Bauteil und schlössen es kurz. */
    function turnSelected() {
      var c = st.circuit, pi = st.selected.part, p = c.parts[pi];
      if (LC.parts[p.type].fixed) return;
      var rot = ((p.rot || 0) + 1) % 4;
      if (occupied(p.x, p.y, pi, Object.assign({}, p, { rot: rot }))) return;   // gedreht läge es auf einem anderen Bauteil
      p.rot = rot;
    }
    function removeSelected() {
      var c = st.circuit, sel = st.selected;
      if (!sel) return;
      if (sel.wire != null) c.wires.splice(sel.wire, 1); else c.parts.splice(sel.part, 1);
      st.selected = null; kbd = null;
    }
    function tapSelected() {
      var p = st.circuit.parts[st.selected.part], def = LC.parts[p.type];
      if (def.tap) def.tap(p);
    }

    // ------------------------------------------------------------ Zeiger auf der Fläche

    // Jede Bewegung gehört genau einem Zeiger. Ein zweiter Finger (nicht isPrimary) wird übergangen – sonst
    // sprängen Bauteil oder Leitung zu ihm. Ein neuer erster Zeiger beginnt immer neu: so bleibt nichts hängen,
    // wenn ein Loslassen verloren geht (z. B. Strg+Z beim Ziehen aus der Leiste zeichnet den Knopf neu).
    function mine(ev, owner) { return !!owner && (owner.id === undefined || ev.pointerId === undefined || owner.id === ev.pointerId); }

    svg.addEventListener("pointerdown", function (ev) {
      if (ev.isPrimary === false) {                      // zweiter Finger: zoomen nur, wenn der erste auf freier Fläche liegt
        if (drag && drag.kind === "pan") {
          drag = { kind: "pinch", id: drag.id, b: ev.pointerId, pa: [drag.px, drag.py], pb: [ev.clientX, ev.clientY] };
          drag.mx = (drag.pa[0] + drag.pb[0]) / 2; drag.my = (drag.pa[1] + drag.pb[1]) / 2;
          drag.d = Math.hypot(drag.pa[0] - drag.pb[0], drag.pa[1] - drag.pb[1]);
          try { svg.setPointerCapture(ev.pointerId); } catch (error) { /* älterer Browser: ohne Zeigerbindung */ }
        }
        return;
      }
      if (ev.button) return;
      adding = null;
      var c = st.circuit, g = point(ev), target = ev.target;
      var term = target.closest("[data-term]"), partEl = target.closest("[data-part]"), wireEl = target.closest("[data-wire]");
      var probe = target.closest("[data-probe]");
      try { svg.setPointerCapture(ev.pointerId); } catch (error) { /* älterer Browser: ohne Zeigerbindung */ }
      svg.focus({ preventScroll: true });
      kbd = null; note = ""; st.copyText = null;
      if (st.sound) audio();                             // von der Autorin eingeschalteter Ton: die erste Berührung weckt ihn
      if (probe) {                                       // eine Klemme des Multimeters wird versetzt
        var ids = probe.getAttribute("data-probe").split(":").map(Number);
        drag = { kind: "probe", pi: ids[0], k: ids[1] };
        st.selected = { part: ids[0] };
      } else if (term && !c.lock) {
        var xy = term.getAttribute("data-term").split(",").map(Number);
        drag = { kind: "wire", from: xy, to: xy };
      } else if (partEl) {
        var pi = Number(partEl.getAttribute("data-part")), p = c.parts[pi];
        drag = { kind: "part", pi: pi, dx: g.x / G - p.x, dy: g.y / G - p.y, moved: false, list: attachments(pi) };
        if (LC.parts[p.type].hold) p.pressed = true;
        st.selected = { part: pi };
      } else if (wireEl && !c.lock) {
        st.selected = { wire: Number(wireEl.getAttribute("data-wire")) };
      } else {                                           // freie Fläche: abwählen und den Ausschnitt verschieben
        st.selected = null;
        drag = { kind: "pan", cx: ev.clientX, cy: ev.clientY, px: ev.clientX, py: ev.clientY, x: st.cam.x, y: st.cam.y };
      }
      if (drag) drag.id = ev.pointerId;
      renderStage(); renderPanel();
      ev.preventDefault();
    });

    svg.addEventListener("pointermove", function (ev) {
      if (drag && drag.kind === "pinch" && (ev.pointerId === drag.id || ev.pointerId === drag.b)) {
        var q = drag, k = scale(), box = svg.getBoundingClientRect();
        q[ev.pointerId === q.id ? "pa" : "pb"] = [ev.clientX, ev.clientY];
        var mx = (q.pa[0] + q.pb[0]) / 2, my = (q.pa[1] + q.pb[1]) / 2, d = Math.hypot(q.pa[0] - q.pb[0], q.pa[1] - q.pb[1]);
        st.cam.x -= (mx - q.mx) * k; st.cam.y -= (my - q.my) * k;      // die Fläche wandert mit den Fingern
        q.mx = mx; q.my = my;
        var f = q.d > 0 ? d / q.d : 1;
        q.d = d;
        zoom(f, st.cam.x + (mx - box.left) * k, st.cam.y + (my - box.top) * k);
        return;
      }
      if (!mine(ev, drag)) return;
      if (drag.kind === "pan") {
        drag.px = ev.clientX; drag.py = ev.clientY;
        if (st.cam.s <= 1) return;                       // nicht vergrößert: es gibt nichts zu verschieben
        var kp = scale();
        st.cam.x = drag.x - (ev.clientX - drag.cx) * kp; st.cam.y = drag.y - (ev.clientY - drag.cy) * kp;
        renderStage();
        return;
      }
      var c = st.circuit, g = point(ev), W = c.size[0], H = c.size[1];
      if (drag.kind === "wire") {
        var to = [clamp(Math.round(g.x / G), 0, W), clamp(Math.round(g.y / G), 0, H)];
        if (to[0] !== drag.to[0] || to[1] !== drag.to[1]) { drag.to = to; renderStage(); }
        return;
      }
      if (drag.kind === "probe") {
        var meter = c.parts[drag.pi], at = LC.terminalPoints(meter)[drag.k];
        var spot = [clamp(Math.round(g.x / G), 0, W), clamp(Math.round(g.y / G), 0, H)];
        if (spot[0] !== at[0] || spot[1] !== at[1]) { meter[drag.k ? "b" : "a"] = spot; renderStage(); }
        return;
      }
      if (c.lock) return;                                // gesperrt: Bauteile bleiben an ihrem Platz
      var p = c.parts[drag.pi];
      var nx = clamp(Math.round(g.x / G - drag.dx), 1, W - 1), ny = clamp(Math.round(g.y / G - drag.dy), 1, H - 1);
      if ((nx !== p.x || ny !== p.y) && !occupied(nx, ny, drag.pi, p)) {
        p.x = nx; p.y = ny; drag.moved = true;
        delete p.pressed;
        reattach(drag.pi, drag.list);
        renderStage();
      }
    });

    function finish(cancelled) {
      if (!drag) return;
      var c = st.circuit, d = drag;
      drag = null;
      if (d.kind === "pan" || d.kind === "pinch") return;   // nur die Ansicht hat sich bewegt
      if (d.kind === "wire") {
        if (!cancelled && (d.from[0] !== d.to[0] || d.from[1] !== d.to[1])) c.wires.push(LC.route(d.from, d.to));
      } else if (d.kind === "probe") {
        // zurück an ihren Platz am Gerät gesteckt, wandert die Klemme wieder mit dem Gerät
        var meter = c.parts[d.pi], key = d.k ? "b" : "a", home = LC.parts[meter.type].home(meter, d.k);
        if (meter[key] && meter[key][0] === home[0] && meter[key][1] === home[1]) meter[key] = null;
      } else {
        var p = c.parts[d.pi], def = LC.parts[p.type];
        delete p.pressed;
        if (!d.moved && !cancelled && def.tap) def.tap(p);
        tidy();
      }
      renderStage(); renderPanel();
      commit();
    }
    function lift(ev, cancelled) {
      if (drag && drag.kind === "pinch" && ev.pointerId === drag.b) drag = null;   // ein Finger hebt ab: das Zoomen endet
      else if (mine(ev, drag)) finish(cancelled);
    }
    svg.addEventListener("pointerup", function (ev) { lift(ev, false); });
    svg.addEventListener("pointercancel", function (ev) { lift(ev, true); });
    // Strg + Mausrad, und zwei Finger auf dem Touchpad (sie kommen als Rad mit Strg): zoomen. Ohne Strg scrollt die Seite.
    svg.addEventListener("wheel", function (ev) {
      if (!ev.ctrlKey && !ev.metaKey) return;
      var g = point(ev);
      zoom(clamp(Math.exp(-ev.deltaY * 0.002), 0.5, 2), g.x, g.y);
      ev.preventDefault();
    }, { passive: false });
    // Langes Drücken (z. B. auf den Taster) öffnet mit dem Finger sonst das Kontextmenü und bricht den Druck ab.
    function noMenu(ev) { ev.preventDefault(); }
    svg.addEventListener("contextmenu", noMenu);
    palette.addEventListener("contextmenu", noMenu);

    // ------------------------------------------------------------ Bauteilleiste: antippen oder auf die Fläche ziehen

    palette.addEventListener("pointerdown", function (ev) {
      var b = ev.target.closest("[data-add]");
      if (!b || ev.button || ev.isPrimary === false || st.circuit.lock) return;
      drag = null;
      adding = { type: b.getAttribute("data-add"), pi: null, x: ev.clientX, y: ev.clientY, id: ev.pointerId };
      try { b.setPointerCapture(ev.pointerId); } catch (error) { /* ohne Zeigerbindung bleibt das Antippen */ }
    });
    palette.addEventListener("pointermove", function (ev) {
      if (!mine(ev, adding)) return;
      var c = st.circuit;
      if (adding.pi === null && Math.hypot(ev.clientX - adding.x, ev.clientY - adding.y) < 10) return;
      adding.moved = true;                               // gezogen, nicht angetippt: ohne Ziel auf der Fläche kommt nichts dazu
      var box = svg.getBoundingClientRect();
      if (ev.clientX < box.left || ev.clientX > box.right || ev.clientY < box.top || ev.clientY > box.bottom) return;
      var g = point(ev), nx = clamp(Math.round(g.x / G), 1, c.size[0] - 1), ny = clamp(Math.round(g.y / G), 1, c.size[1] - 1);
      if (adding.pi === null) {
        if (occupied(nx, ny, -1, newPart(adding.type, nx, ny))) return;
        c.parts.push(newPart(adding.type, nx, ny));
        adding.pi = c.parts.length - 1;
        st.selected = { part: adding.pi }; st.copyText = null;
        renderStage();
      } else {
        var p = c.parts[adding.pi];
        if ((nx !== p.x || ny !== p.y) && !occupied(nx, ny, adding.pi, p)) { p.x = nx; p.y = ny; renderStage(); }
      }
    });
    palette.addEventListener("pointerup", function (ev) {
      if (!mine(ev, adding)) return;
      var tapped = adding.pi === null && !adding.moved;
      if (tapped) add(adding.type);
      adding = null; kbd = null; note = "";
      renderStage(); renderPanel();
      commit();
    });
    palette.addEventListener("pointercancel", function (ev) { if (mine(ev, adding)) adding = null; });

    // ------------------------------------------------------------ Knöpfe

    function onClick(ev) {
      var b = ev.target.closest("button");
      if (!b || !el.contains(b)) return;
      var c = st.circuit, act = b.getAttribute("data-act"), part = st.selected && st.selected.part != null;
      if (act !== "more") showMenu(false);               // jede andere Wahl schließt das Menü, auch eine im Menü
      if (act === "more") {
        showMenu(menu.hidden);
      } else if (act === "parts") {
        st.shelf = !st.shelf; renderPalette();
      } else if (act === "group") {
        st.group = b.getAttribute("data-group"); renderPalette();
      } else if (act === "pane") {
        st.pane = b.getAttribute("data-pane"); renderPanes(); renderTask(); renderLog();
      } else if (act === "deselect") {
        st.selected = null; st.copyText = null; kbd = null;
        renderStage(); renderPanel();
        svg.focus({ preventScroll: true });
      } else if (b.hasAttribute("data-view")) {
        c.view = b.getAttribute("data-view"); renderAll();
      } else if (b.hasAttribute("data-add")) {
        if (ev.detail === 0 && !c.lock) { add(b.getAttribute("data-add")); renderStage(); renderPanel(); commit(); }   // per Tastatur; Zeiger siehe oben
      } else if (act === "sound") {                      // der Klick weckt den Audio-Kontext
        st.sound = !st.sound;
        if (st.sound) audio();
        renderTools(); syncSound();
      } else if (act === "potential") {
        st.potential = !st.potential;
        renderStage(); renderTools();
      } else if (act === "zoomin" || act === "zoomout") {
        zoom(act === "zoomin" ? 1.5 : 1 / 1.5);
      } else if (act === "fit") {
        st.cam = { s: 1, x: 0, y: 0 }; renderStage(); renderTools();
      } else if (act === "undo") {
        undo();
      } else if (act === "redo") {
        redo();
      } else if (act === "reset") {
        var view = c.view;
        st.circuit = LC.normalize(st.initial); st.circuit.view = view;
        st.selected = null; st.copyText = null; kbd = null; note = "";
        st.solved = false;                               // die Aufgabe beginnt von vorn
        renderAll(); commit();
        svg.focus({ preventScroll: true });
      } else if (act === "note") {                       // Messwerte notieren: eine Zeile mit den Anzeigen aller Messgeräte
        var row = [];
        c.parts.forEach(function (q, qi) {
          var meter = LC.parts[q.type];
          if (meter.meter) row.push(meter.state(q, st.result && st.result.parts[qi], lang) || "–");
        });
        if (row.length) { st.rows.push(row); note = ""; } else note = T("noMeter");
        renderStatus(); renderLog();
      } else if (act === "clear") {
        st.rows = []; renderLog();
      } else if (act === "copy") {
        if (st.hunt) return;
        st.copyText = LC.serialize(c); st.selected = null; note = "";
        renderStage(); renderPanel();
        var area = panel.querySelector(".lc-copy");
        if (area) { area.focus(); area.select(); }
        if (global.navigator && navigator.clipboard && navigator.clipboard.writeText)
          navigator.clipboard.writeText(st.copyText).then(function () { note = T("copied"); renderStatus(); }, function () { /* dann von Hand kopieren */ });
      } else if (st.selected && act === "remove") {
        if (c.lock) return;
        removeSelected(); renderStage(); renderPanel(); commit();
        svg.focus({ preventScroll: true });              // der Knopf ist weg: der Fokus bleibt auf der Fläche, Strg+Z geht weiter
      } else if (part && act === "turn") {
        if (c.lock) return;
        turnSelected(); renderStage(); commit();
      } else if (part && act === "swap") {               // Ersetzen: ein neues Bauteil derselben Art an derselben Stelle
        if (c.lock && !st.hunt) return;
        var old = c.parts[st.selected.part], bad = !!old.fault || !!old.blown;
        delete old.fault;
        if (old.blown !== undefined) old.blown = false;
        old._s = null;
        note = T(bad ? "swapBad" : "swapGood");
        renderStage(); renderPanel(); commit();
        svg.focus({ preventScroll: true });
      } else if (part && act === "tap") {
        tapSelected(); renderStage(); renderPanel(); commit();
        svg.focus({ preventScroll: true });
      } else if (part && act === "act") {
        var p = c.parts[st.selected.part], def = LC.parts[p.type];
        if (def.act) def.act(p);
        renderStage();
      }
    }
    el.addEventListener("click", onClick);
    function showMenu(open) {
      menu.hidden = !open;
      var more = el.querySelector('[data-act="more"]');
      if (more) more.setAttribute("aria-expanded", String(open));
    }
    menu.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape") return;
      showMenu(false);
      var more = el.querySelector('[data-act="more"]');
      if (more) more.focus();
    });

    function onControl(ev) {
      var t = ev.target, sel = st.selected;
      if (!sel || sel.part == null) return;
      var p = st.circuit.parts[sel.part], def = LC.parts[p.type], k, ctl, v;
      if (t.hasAttribute("data-ctl") || t.hasAttribute("data-unit")) {
        var which = def.controls[Number(t.getAttribute(t.hasAttribute("data-ctl") ? "data-ctl" : "data-unit"))];
        if (!which || !allowed(def, which)) return;      // gesperrt: diese Einstellung ist nicht bedienbar
      }
      if (t.hasAttribute("data-ctl")) {
        k = t.getAttribute("data-ctl"); ctl = def.controls[Number(k)];
        if (ctl.kind === "select") {
          v = ctl.numeric ? Number(t.value) : t.value;
          if (ctl.set) { ctl.set(p, v); if (def.clean) def.clean(p); renderStage(); renderPanel(); commit(); return; }   // die Wahl ändert weitere Felder
          p[ctl.prop] = v;
        } else {
          v = parseFloat(String(t.value).replace(",", "."));
          if (!Number.isFinite(v) || v < 0) return;
          var unit = panel.querySelector('[data-unit="' + k + '"]');
          v *= unit ? Number(unit.value) : 1;
          if (ctl.set) ctl.set(p, v); else p[ctl.prop] = v;
        }
      } else if (t.hasAttribute("data-unit")) {
        k = t.getAttribute("data-unit"); ctl = def.controls[Number(k)];
        v = parseFloat(panel.querySelector('[data-ctl="' + k + '"]').value);
        if (!Number.isFinite(v) || v < 0) return;
        if (ctl.set) ctl.set(p, v * Number(t.value)); else p[ctl.prop] = v * Number(t.value);
      } else return;
      if (def.clean) def.clean(p);
      var out = panel.querySelector('[data-out="' + k + '"]');
      if (out) out.textContent = rangeText(p, ctl);
      renderStage();
      commit(sel.part + ":" + k);                        // Tippen und Schieben an einer Einstellung ist ein Schritt
    }
    panel.addEventListener("input", onControl);
    panel.addEventListener("change", onControl);

    // ------------------------------------------------------------ Tastatur

    svg.addEventListener("focusin", function (ev) {
      var g = ev.target.closest && ev.target.closest("[data-part]");
      if (!g) return;
      var pi = Number(g.getAttribute("data-part"));
      kbd = pi;
      if (!st.selected || st.selected.part !== pi) { st.selected = { part: pi }; st.copyText = null; renderStage(); renderPanel(); }
    });

    svg.addEventListener("keydown", function (ev) {
      var c = st.circuit, sel = st.selected, key = ev.key;
      if (!sel || ev.ctrlKey || ev.metaKey || ev.altKey) return;      // Strg+R usw. gehören dem Browser
      var build = !c.lock;                                            // gesperrt: nur schalten (Eingabe, Leertaste)
      if (key === "Delete" || key === "Backspace") {
        if (build) { removeSelected(); renderStage(); renderPanel(); commit(); }
        ev.preventDefault();
        return;
      }
      if (sel.part == null) return;
      var p = c.parts[sel.part], def = LC.parts[p.type];
      var step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
      if (!build && (step || key === "r" || key === "R")) { ev.preventDefault(); return; }
      if (step) {
        var nx = clamp(p.x + step[0], 1, c.size[0] - 1), ny = clamp(p.y + step[1], 1, c.size[1] - 1);
        if (!occupied(nx, ny, sel.part, p)) { var list = attachments(sel.part); p.x = nx; p.y = ny; reattach(sel.part, list); tidy(); }
        renderStage();
      } else if (key === "r" || key === "R") {
        turnSelected(); renderStage();
      } else if (key === "Enter" || key === " ") {
        if (def.hold) { if (p.pressed) delete p.pressed; else p.pressed = true; } else if (def.tap) def.tap(p);
        renderStage(); renderPanel();
      } else return;
      commit();
      ev.preventDefault();                 // sonst blättern die Pfeiltasten die Folie um
    });

    /** Strg+Z macht rückgängig, Strg+Y oder Strg+Umschalt+Z wiederholt – überall auf der Arbeitsfläche,
     *  außer in einem Eingabefeld (dort gilt das Rückgängig des Feldes). */
    function onShortcut(ev) {
      var tag = String((ev.target && ev.target.tagName) || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
      var key = String(ev.key).toLowerCase();
      if (key === "z" && !ev.shiftKey) undo();
      else if (key === "y" || (key === "z" && ev.shiftKey)) redo();
      else return;
      ev.preventDefault();
    }
    el.addEventListener("keydown", onShortcut);

    /** Mit dem Finger: Eine Berührung auf Fläche oder Leiste zieht ein Bauteil. Sie soll nicht weiterwandern
     *  und dabei die Folie wechseln (LiaScript blättert mit einer Wischgeste). */
    var TOUCH = ["touchstart", "touchmove", "touchend", "touchcancel"];
    function onTouch(ev) {
      var t = ev.target;
      if (t && t.closest && t.closest(".lc-svg, .lc-palette")) ev.stopPropagation();
    }
    TOUCH.forEach(function (type) { el.addEventListener(type, onTouch, { passive: true }); });

    el._lc = {
      lang: own ? lang : "",
      remount: function () { mount(el, source, options); },
      refresh: renderAll,
      stop: function () {
        stopped = true;
        syncSound();
        el.removeEventListener("click", onClick);
        el.removeEventListener("keydown", onShortcut);
        TOUCH.forEach(function (type) { el.removeEventListener(type, onTouch); });
        if (raf && global.cancelAnimationFrame) global.cancelAnimationFrame(raf);
      }
    };

    renderAll();
  }

  LC.mount = mount;
})(typeof globalThis !== "undefined" ? globalThis : this);
