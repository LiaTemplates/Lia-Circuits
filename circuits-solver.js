/* Lia-Circuits · Berechnung
 *
 * Knotenanalyse für elektrische Netze, Netzliste aus der gezeichneten Schaltung,
 * die Ströme in den Leitungen und der zeitliche Verlauf (Kondensator, Spule, Wechselspannung).
 * Einfache Datei ohne Build-Schritt: sie lädt im Browser (script:) und in Node (check.mjs).
 * Die Bauteile stehen in circuits-parts.js.
 */
(function (global) {
  "use strict";
  var LC = (global.LiaCircuits = global.LiaCircuits || {});

  function fail(code, detail) {
    var e = new Error("LiaCircuits: " + code + (detail ? " (" + detail + ")" : ""));
    e.code = code; e.detail = detail || "";
    return e;
  }

  // ---------------------------------------------------------------- lineares Gleichungssystem

  /** LR-Zerlegung mit Spaltenpivot. A bleibt unverändert. */
  function luFactor(A) {
    var n = A.length, M = A.map(function (row) { return row.slice(); }), perm = [];
    for (var q = 0; q < n; q++) perm.push(q);
    for (var c = 0; c < n; c++) {
      var p = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-300) throw fail("singular");
      if (p !== c) { var t = M[p]; M[p] = M[c]; M[c] = t; var tp = perm[p]; perm[p] = perm[c]; perm[c] = tp; }
      for (var r2 = c + 1; r2 < n; r2++) {
        var f = M[r2][c] / M[c][c];
        M[r2][c] = f;
        if (f !== 0) for (var k = c + 1; k < n; k++) M[r2][k] -= f * M[c][k];
      }
    }
    return { n: n, M: M, perm: perm };
  }

  function luSolve(lu, b) {
    var n = lu.n, M = lu.M, y = new Array(n), x = new Array(n), s, i, k;
    for (i = 0; i < n; i++) { s = b[lu.perm[i]]; for (k = 0; k < i; k++) s -= M[i][k] * y[k]; y[i] = s; }
    for (i = n - 1; i >= 0; i--) { s = y[i]; for (k = i + 1; k < n; k++) s -= M[i][k] * x[k]; x[i] = s / M[i][i]; }
    return x;
  }

  function solveLinear(A, b) { return luSolve(luFactor(A), b); }

  // ---------------------------------------------------------------- Knotenanalyse

  /**
   * Löst ein Netz aus Zweigen zwischen den Knoten 0 … nodeCount-1. Jeder Zweig ist linear:
   * Strom von a nach b  i = g·(Ua − Ub) − j.
   *   { kind: "R", a, b, r }      Widerstand r in Ohm
   *   { kind: "V", a, b, v, r }   Spannungsquelle v in Volt mit Innenwiderstand r, a ist der Pluspol
   *   { kind: "B", a, b, g, j }   allgemeiner Zweig (Kondensator und Spule im Zeitschritt, Diode)
   *   { kind: "G", a, b, c, d, g, j }  gesteuerter Zweig: Strom von a nach b  i = g·(Uc − Ud) − j (Transistor)
   * Ergebnis: v = Knotenspannungen, i = Strom je Zweig
   *   R, B: Strom von a nach b durch den Zweig
   *   V:    Strom, den die Quelle am Pluspol a abgibt
   * Jede zusammenhängende Insel bekommt einen Bezugsknoten (0 V), deshalb gibt es auch bei
   * offenen Schaltern und losen Bauteilen immer eine Lösung.
   * cache (optional) merkt sich die zerlegte Matrix, solange sich die Leitwerte nicht ändern –
   * im Zeitverlauf ändert sich dann je Schritt nur die rechte Seite.
   */
  function solveNodal(nodeCount, elements, cache) {
    var n = nodeCount, m = elements.length, k, e;
    var g = new Array(m), j = new Array(m), I = new Array(n).fill(0);
    var same = !!(cache && cache.lu && cache.n === n && cache.g.length === m);
    for (k = 0; k < m; k++) {
      e = elements[k];
      if (e.kind === "R") { g[k] = 1 / e.r; j[k] = 0; }
      else if (e.kind === "V") { g[k] = 1 / e.r; j[k] = e.v / e.r; }
      else if (e.kind === "B" || e.kind === "G") { g[k] = e.g; j[k] = e.j; }
      else throw fail("element", String(e.kind));
      if (same && (cache.g[k] !== g[k] || cache.a[k] !== e.a || cache.b[k] !== e.b || cache.c[k] !== e.c || cache.d[k] !== e.d || cache.kind[k] !== e.kind)) same = false;
      if (e.a === e.b) continue;                       // beide Anschlüsse am selben Knoten: wirkungslos
      I[e.a] += j[k]; I[e.b] -= j[k];
    }
    var lu;
    if (same) lu = cache.lu;
    else {
      var Gm = [], parent = [];
      for (var q = 0; q < n; q++) { Gm.push(new Array(n).fill(0)); parent.push(q); }
      var find = function (x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
      for (k = 0; k < m; k++) {
        e = elements[k];
        if (e.a === e.b) continue;
        if (e.kind === "G") {                            // gesteuert: der Strom a→b hängt an der Spannung zwischen c und d
          Gm[e.a][e.c] += g[k]; Gm[e.a][e.d] -= g[k]; Gm[e.b][e.c] -= g[k]; Gm[e.b][e.d] += g[k];
          continue;
        }
        Gm[e.a][e.a] += g[k]; Gm[e.b][e.b] += g[k]; Gm[e.a][e.b] -= g[k]; Gm[e.b][e.a] -= g[k];
        parent[find(e.a)] = find(e.b);
      }
      var tied = {};
      for (var t = 0; t < n; t++) { var root = find(t); if (!tied[root]) { tied[root] = true; Gm[root][root] += 1; } }
      lu = luFactor(Gm);
      if (cache) {
        cache.lu = lu; cache.n = n; cache.g = g;
        cache.a = elements.map(function (x) { return x.a; });
        cache.b = elements.map(function (x) { return x.b; });
        cache.c = elements.map(function (x) { return x.c; });
        cache.d = elements.map(function (x) { return x.d; });
        cache.kind = elements.map(function (x) { return x.kind; });
      }
    }
    var v = n ? luSolve(lu, I) : [];
    var i = new Array(m);
    for (k = 0; k < m; k++) {
      e = elements[k];
      var branch = e.a === e.b ? -j[k] : g[k] * (e.kind === "G" ? v[e.c] - v[e.d] : v[e.a] - v[e.b]) - j[k];
      i[k] = e.kind === "V" ? -branch : branch;
    }
    return { v: v, i: i };
  }

  // ---------------------------------------------------------------- Geometrie auf dem Raster

  /** Dreht (dx, dy) um rot Vierteldrehungen im Uhrzeigersinn (Bildschirm: y zeigt nach unten). */
  function rotate(dx, dy, rot) {
    switch ((((rot | 0) % 4) + 4) % 4) {
      case 1: return [-dy, dx];
      case 2: return [-dx, -dy];
      case 3: return [dy, -dx];
      default: return [dx, dy];
    }
  }

  /** Rasterpunkte der Anschlüsse eines Bauteils, in der Reihenfolge seiner Beschreibung. */
  function terminalPoints(part) {
    var def = LC.parts[part.type];
    if (def.points) return def.points(part);            // z. B. die frei setzbaren Klemmen des Multimeters
    return def.terminals.map(function (t) {
      var r = rotate(t[0], t[1], part.rot || 0);
      return [part.x + r[0], part.y + r[1]];
    });
  }

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }

  /** Alle Rasterpunkte entlang einer Leitung [x1, y1, x2, y2, …], der Reihe nach. */
  function lattice(wire) {
    var pts = [];
    for (var k = 0; k + 3 < wire.length; k += 2) {
      var x1 = wire[k], y1 = wire[k + 1], x2 = wire[k + 2], y2 = wire[k + 3];
      var g = gcd(x2 - x1, y2 - y1);
      if (!g) { if (!pts.length) pts.push([x1, y1]); continue; }
      var sx = (x2 - x1) / g, sy = (y2 - y1) / g;
      for (var s = pts.length ? 1 : 0; s <= g; s++) pts.push([x1 + sx * s, y1 + sy * s]);
    }
    return pts;
  }

  /** Leitung zwischen zwei Rasterpunkten: gerade, sonst erst waagerecht, dann senkrecht. */
  function route(a, b) {
    return a[0] === b[0] || a[1] === b[1] ? [a[0], a[1], b[0], b[1]] : [a[0], a[1], b[0], a[1], b[0], b[1]];
  }

  // ---------------------------------------------------------------- Netzliste

  /**
   * Verbindungsregel: An einem Rasterpunkt sind alle Anschlüsse und Leitungsenden verbunden.
   * Eine durchlaufende Leitung ist dort nur angeschlossen, wenn an dem Punkt ein Anschluss
   * oder ein Leitungsende liegt (Abzweig). Zwei Leitungen, die sich nur kreuzen, bleiben getrennt.
   */
  function buildNet(circuit) {
    var index = {}, pointOf = [], degree = [], hasTerminal = [];
    function anchor(x, y) {
      var k = x + "," + y;
      if (index[k] === undefined) { index[k] = pointOf.length; pointOf.push([x, y]); degree.push(0); hasTerminal.push(false); }
      return index[k];
    }
    var terms = circuit.parts.map(function (p) {
      return terminalPoints(p).map(function (pt) { var a = anchor(pt[0], pt[1]); degree[a]++; hasTerminal[a] = true; return a; });
    });
    var wires = circuit.wires.map(lattice);
    wires.forEach(function (pts) { anchor(pts[0][0], pts[0][1]); anchor(pts[pts.length - 1][0], pts[pts.length - 1][1]); });

    var parent = pointOf.map(function (_, i) { return i; });
    function find(k) { while (parent[k] !== k) { parent[k] = parent[parent[k]]; k = parent[k]; } return k; }
    var edges = [];
    wires.forEach(function (pts, w) {
      var last = null, path = [];
      pts.forEach(function (pt) {
        path.push(pt);
        var a = index[pt[0] + "," + pt[1]];
        if (a === undefined) return;
        if (last !== null) {
          parent[find(last)] = find(a);
          degree[last]++; degree[a]++;
          edges.push({ wire: w, from: last, to: a, path: path, current: 0 });
        }
        last = a; path = [pt];
      });
    });
    // Stellen, an denen Leitungen übereinanderliegen: jedes Rasterstück, das mehr als einmal belegt ist
    var cover = {}, overlaps = [];
    wires.forEach(function (pts) {
      for (var k = 1; k < pts.length; k++) {
        var a = pts[k - 1], b = pts[k];
        var id = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? a + "|" + b : b + "|" + a;
        cover[id] = (cover[id] || 0) + 1;
        if (cover[id] === 2) overlaps.push([a[0], a[1], b[0], b[1]]);
      }
    });
    var ids = {}, count = 0;
    var node = pointOf.map(function (_, i) { var r = find(i); if (ids[r] === undefined) ids[r] = count++; return ids[r]; });
    // innere Knoten der Bauteile (z. B. zwischen Wicklungswiderstand und Induktivität der Spule)
    var inner = circuit.parts.map(function (p) {
      var list = [];
      for (var k = 0; k < (LC.parts[p.type].inner || 0); k++) list.push(count++);
      return list;
    });
    return { pointOf: pointOf, degree: degree, hasTerminal: hasTerminal, terms: terms, inner: inner, edges: edges, overlaps: overlaps, node: node, nodeCount: count };
  }

  // ---------------------------------------------------------------- Schaltung berechnen

  /**
   * Ein Rechengang. env = null: Gleichstrom im Ruhezustand (Kondensator sperrt, Spule leitet).
   * env = { t, dt, order, window }: ein Zeitschritt. Ein Bauteil darf seinen Zustand ändern
   * (Sicherung: blown), dann wird neu gerechnet.
   */
  function evaluate(circuit, net, env, cache, events) {
    var parts;
    for (var round = 0; round < 50; round++) {
      var elements = [], owners = [];
      circuit.parts.forEach(function (p, pi) {
        var nodes = net.terms[pi].map(function (a) { return net.node[a]; }).concat(net.inner[pi]);
        // Ein Bauteil mit verstecktem Defekt (fault) leitet nicht: es trägt nichts zum Netz bei.
        (p.fault ? [] : LC.parts[p.type].elements(p, env)).forEach(function (e) {
          owners.push(pi);
          elements.push({ kind: e.kind, a: nodes[e.a], b: nodes[e.b], c: nodes[e.c], d: nodes[e.d], r: e.r, v: e.v, g: e.g, j: e.j, ta: e.a, tb: e.b });
        });
      });
      var sol = solveNodal(net.nodeCount, elements, cache);
      parts = circuit.parts.map(function (p, pi) {
        return { v: net.terms[pi].map(function (a) { return sol.v[net.node[a]]; }), i: [], inj: net.terms[pi].map(function () { return 0; }), kinds: [], isc: [] };
      });
      elements.forEach(function (e, k) {
        var r = parts[owners[k]], cur = sol.i[k], out = e.kind === "V" ? cur : -cur;   // out: Strom, der bei ta aus dem Bauteil kommt
        r.i.push(cur); r.kinds.push(e.kind);
        r.isc.push(e.kind === "V" ? e.v / e.r : 0);                                    // Kurzschlussstrom einer Quelle
        if (e.ta < r.inj.length) r.inj[e.ta] += out;
        if (e.tb < r.inj.length) r.inj[e.tb] -= out;
      });
      var changed = false;
      circuit.parts.forEach(function (p, pi) {
        // after meldet, dass das Bauteil seinen Zustand geändert hat (Diode leitet/sperrt) – oder "blown",
        // wenn es dabei kaputtgegangen ist (Sicherung, Lampe, Leuchtdiode). Dann wird neu gerechnet.
        var def = LC.parts[p.type], change = def.after && !p.fault ? def.after(p, parts[pi]) : false;
        if (change) { changed = true; if (change === "blown") events.push({ type: "blown", part: pi }); }
      });
      if (!changed) break;
    }
    return parts;
  }

  /** Ergänzt das Ergebnis: was jedes Bauteil meldet, Warnungen, Ströme in den Leitungen. */
  function finish(circuit, net, parts, env, events) {
    var warnings = [];
    circuit.parts.forEach(function (p, pi) {
      var def = LC.parts[p.type], r = parts[pi];
      if (def.observe && !p.fault) def.observe(p, r, env);   // ein defektes Bauteil meldet nichts: es leuchtet, dreht und misst nicht
      // Kurzschluss: ein sehr großer Strom, oder die Quelle gibt fast ihren ganzen Kurzschlussstrom ab
      // (so wird er auch bei einer Batterie mit großem Innenwiderstand erkannt)
      r.kinds.forEach(function (kind, k) {
        if (kind !== "V" || !def.source) return;
        var cur = Math.abs(r.i[k]), most = Math.abs(r.isc[k]);
        if (cur > LC.limits.short || (most > 0.5 && cur >= 0.9 * most)) warnings.push({ type: "short", part: pi });
      });
      // Überbrückt: eine Leitung verbindet alle Anschlüsse, das Bauteil bekommt keine Spannung.
      // Quellen meldet schon "short", Messgeräte dürfen an einer Leitung messen.
      var nodes = net.terms[pi].map(function (t) { return net.node[t]; });
      if (!def.source && !def.instrument && nodes.length > 1 && nodes.every(function (n) { return n === nodes[0]; }))
        warnings.push({ type: "bypass", part: pi });
    });

    // Ströme in den Leitungen: Knotenregel auf dem Leitungsgraphen. Auf einem Baum sind sie
    // eindeutig; eine zusätzliche, parallele Leitung (Masche aus reinen Leitungen) bleibt bei 0.
    var count = net.pointOf.length, inj = new Array(count).fill(0), adj = [], seen = new Array(count).fill(false);
    for (var a = 0; a < count; a++) adj.push([]);
    parts.forEach(function (r, pi) { r.inj.forEach(function (cur, t) { inj[net.terms[pi][t]] += cur; }); });
    // Potenzial je Knoten, abgelesen an den Anschlüssen; ein Netz aus reinen Leitungen hat keines
    var nodeV = [];
    parts.forEach(function (r, pi) { r.v.forEach(function (v, t) { nodeV[net.node[net.terms[pi][t]]] = v; }); });
    net.edges.forEach(function (e, ei) {
      e.current = 0;
      e.v = nodeV[net.node[e.from]];
      if (e.from !== e.to) { adj[e.from].push([e.to, ei, 1]); adj[e.to].push([e.from, ei, -1]); }
    });
    for (var start = 0; start < count; start++) {
      if (seen[start]) continue;
      var order = [], up = {}, stack = [start], sum = {};
      seen[start] = true;
      while (stack.length) {
        var u = stack.pop();
        order.push(u);
        adj[u].forEach(function (link) { if (!seen[link[0]]) { seen[link[0]] = true; up[link[0]] = [u, link[1], link[2]]; stack.push(link[0]); } });
      }
      for (var k = order.length - 1; k > 0; k--) {
        var child = order[k], link = up[child];
        var s = (sum[child] || 0) + inj[child];          // fließt im Teilbaum in die Leitung, muss zum Elternknoten
        net.edges[link[1]].current = -link[2] * s;
        sum[link[0]] = (sum[link[0]] || 0) + s;
      }
    }

    return {
      parts: parts,
      edges: net.edges,
      anchors: net.pointOf.map(function (pt, k) { return { x: pt[0], y: pt[1], degree: net.degree[k], terminal: net.hasTerminal[k] }; }),
      overlaps: net.overlaps,
      warnings: warnings,
      events: events,
      time: env ? env.t : null
    };
  }

  /**
   * Gleichstrom im Ruhezustand. Ergebnis:
   *   parts[k]  { v: Spannung je Anschluss, i: Strom je Zweig, inj: Strom, der je Anschluss
   *               aus dem Bauteil in die Leitung fließt } plus das, was das Bauteil selbst meldet
   *               (Helligkeit, Messwert …)
   *   edges     Leitungsstücke { wire, path, current, v } – current > 0 fließt in Zeichenrichtung, v ist das Potenzial
   *   anchors   Verbindungspunkte { x, y, degree, terminal }
   *   overlaps  Rasterstücke [x1, y1, x2, y2], auf denen Leitungen übereinanderliegen
   *   warnings  [{ type: "short" | "bypass", part }]
   *   events    [{ type: "blown", part }] – eine Sicherung hat in diesem Lauf ausgelöst
   */
  function simulate(circuit) {
    var net = buildNet(circuit), events = [];
    return finish(circuit, net, evaluate(circuit, net, null, null, events), null, events);
  }

  // ---------------------------------------------------------------- zeitlicher Verlauf

  /** Braucht die Schaltung den zeitlichen Verlauf (Kondensator, Spule, Wechselspannung, Oszilloskop)? */
  function isDynamic(circuit) {
    return circuit.parts.some(function (p) { return !!LC.parts[p.type].dynamic; });
  }

  function highestFrequency(circuit) {
    var f = 0;
    circuit.parts.forEach(function (p) { var def = LC.parts[p.type]; if (def.frequency) f = Math.max(f, def.frequency(p)); });
    return f;
  }

  /** Zeitschritt: 200 Schritte je Periode der schnellsten Wechselspannung, höchstens 1 ms. */
  function timeStep(circuit) {
    var f = highestFrequency(circuit);
    return Math.min(1e-3, Math.max(1e-6, f > 0 ? 1 / (200 * f) : 1e-3));
  }

  /** Ein Lauf merkt sich Zeit, Schrittweite und die zerlegte Matrix. Der Zustand der Bauteile
   *  (Ladung, Strom der Spule, Messfenster) steht an den Bauteilen selbst (part._s). */
  function createRun(circuit) {
    var run = { circuit: circuit, t: 0 };
    refresh(run);
    return run;
  }

  /** Nach jeder Änderung der Schaltung aufrufen: Netz, Matrix und Schrittweite werden neu bestimmt. */
  function refresh(run) {
    var f = highestFrequency(run.circuit);
    run.net = null; run.cache = {}; run.order = 1;
    run.dt = timeStep(run.circuit);
    // Messfenster der Messgeräte: ganze Perioden, mindestens 0,1 s
    run.window = Math.max(1, Math.round((f >= 10 ? Math.ceil(0.1 * f) / f : 0.1) / run.dt));
    return run;
  }

  /**
   * Rechnet steps Zeitschritte weiter (BDF2, der erste Schritt nach einer Änderung implizit Euler)
   * und liefert das Ergebnis des letzten Schritts in derselben Form wie simulate.
   */
  function advance(run, steps) {
    var c = run.circuit, events = [], parts = null, env = null;
    if (!run.net) run.net = buildNet(c);
    for (var s = 0; s < Math.max(1, steps); s++) {
      run.t += run.dt;
      env = { t: run.t, dt: run.dt, order: run.order, window: run.window };
      parts = evaluate(c, run.net, env, run.cache, events);
      for (var pi = 0; pi < c.parts.length; pi++) {
        var def = LC.parts[c.parts[pi].type];
        if (def.advance && !c.parts[pi].fault) def.advance(c.parts[pi], parts[pi], env);
      }
      run.order = 2;
    }
    return finish(c, run.net, parts, env, events);
  }

  /** Für Tests: rechnet eine Schaltung seconds Sekunden lang und liefert Lauf und Ergebnis. */
  function runFor(circuit, seconds, run) {
    run = run || createRun(circuit);
    return { run: run, result: advance(run, Math.round(seconds / run.dt)) };
  }

  // ---------------------------------------------------------------- Beschreibung lesen und schreiben

  // Ziele einer Aufgabe: ein Bauteil ist in einem Zustand (is) oder ein Messgerät zeigt einen Wert (measure).
  LC.taskStates = ["bright", "on", "off"];         // leuchtet hell · leuchtet, dreht sich, summt · ist aus
  LC.taskMeasures = ["V", "A", "R", "W"];          // Spannung, Stromstärke, Widerstand, Leistung

  /**
   * Die Aufgabe zur Schaltung: { text, goals }. Ein Ziel ist
   *   { type, count, is }        mindestens count Bauteile der Art type (oder "all": alle) sind im Zustand is
   *   { measure, min, max }      ein Messgerät zeigt die Messgröße measure mit einem Betrag von min bis max (in V, A, Ω, W)
   * jeweils mit einem optionalen Text label. Ein bloßer Text ist eine Aufgabe ohne Ziele.
   */
  function normalizeTask(raw) {
    if (typeof raw === "string") raw = { text: raw };
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw fail("task", "object expected");
    var task = { text: String(raw.text === undefined ? "" : raw.text), goals: [] };
    if (raw.goals !== undefined && !Array.isArray(raw.goals)) throw fail("task", "goals");
    (raw.goals || []).forEach(function (g) {
      if (!g || typeof g !== "object" || Array.isArray(g)) throw fail("task", JSON.stringify(g));
      var goal;
      if (g.measure !== undefined) {
        if (LC.taskMeasures.indexOf(g.measure) < 0) throw fail("task", "measure " + String(g.measure));
        goal = { measure: g.measure };
        ["min", "max"].forEach(function (key) {
          if (g[key] === undefined || g[key] === null) return;
          var value = Number(g[key]);
          if (!Number.isFinite(value)) throw fail("task", key);
          goal[key] = value;
        });
        if (goal.min === undefined && goal.max === undefined) throw fail("task", "min/max");
      } else {
        if (!LC.parts[g.type]) throw fail("part", String(g.type));
        if (LC.taskStates.indexOf(g.is) < 0) throw fail("task", "is " + String(g.is));
        goal = { type: g.type, count: g.count === "all" ? "all" : Math.max(1, Math.round(Number(g.count)) || 1), is: g.is };
      }
      if (g.label !== undefined && g.label !== "") goal.label = String(g.label);
      task.goals.push(goal);
    });
    return task;
  }

  /**
   * Macht aus der Beschreibung (JSON-Text oder Objekt) eine geprüfte Schaltung mit allen Vorgabewerten.
   * Nur wenn sie angegeben sind, kommen dazu: palette (Bauteile der Leiste), lock (gesperrt: nur schalten,
   * Regler bedienen und messen), table (Messwerttabelle), sound (Ton von Anfang an eingeschaltet), task (Aufgabe mit Zielen) und je Bauteil
   * fault (versteckter Defekt für die Fehlersuche).
   */
  function normalize(input) {
    var d = input;
    if (typeof d === "string") {
      var text = d.replace(/^[\s`]+|[\s`]+$/g, "");
      if (!text) d = {};
      else { try { d = JSON.parse(text); } catch (err) { throw fail("json", err.message); } }
    }
    if (!d || typeof d !== "object" || Array.isArray(d)) throw fail("json", "object expected");
    var c = { view: d.view === "symbol" ? "symbol" : "picture", size: [14, 8], parts: [], wires: [] };
    var maxX = 0, maxY = 0;
    (d.parts || []).forEach(function (raw) {
      var def = raw && LC.parts[raw.type];
      if (!def) throw fail("part", String(raw && raw.type));
      var p = { type: raw.type, x: Math.round(Number(raw.x)), y: Math.round(Number(raw.y)), rot: def.fixed ? 0 : (((raw.rot | 0) % 4) + 4) % 4 };
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw fail("place", raw.type);
      Object.keys(def.defaults).forEach(function (key) {
        var standard = def.defaults[key], value = raw[key];
        if (typeof standard === "number") { value = Number(value); p[key] = raw[key] !== undefined && Number.isFinite(value) && value >= 0 ? value : standard; }
        else if (typeof standard === "boolean") p[key] = raw[key] === undefined ? standard : !!value;
        else p[key] = def.options && def.options[key] && def.options[key].indexOf(value) < 0 ? standard : (value === undefined ? standard : value);
      });
      if (raw.fault) p.fault = true;
      if (def.init) def.init(p, raw);
      if (def.clean) def.clean(p);
      c.parts.push(p);
      terminalPoints(p).forEach(function (pt) { maxX = Math.max(maxX, pt[0]); maxY = Math.max(maxY, pt[1]); });
    });
    (d.wires || []).forEach(function (raw) {
      if (!Array.isArray(raw) || raw.length < 4 || raw.length % 2 || raw.some(function (v) { return !Number.isFinite(Number(v)); })) throw fail("wire", JSON.stringify(raw));
      var w = [];
      for (var k = 0; k < raw.length; k += 2) {
        var x = Math.round(Number(raw[k])), y = Math.round(Number(raw[k + 1]));
        if (w.length && w[w.length - 2] === x && w[w.length - 1] === y) continue;
        w.push(x, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      if (w.length >= 4) c.wires.push(w);
    });
    var size = Array.isArray(d.size) ? d.size : [];
    c.size = [Math.max(14, Math.round(Number(size[0])) || 0, maxX + 2), Math.max(8, Math.round(Number(size[1])) || 0, maxY + 2)];
    if (d.palette !== undefined && d.palette !== null) {
      if (!Array.isArray(d.palette)) throw fail("part", "palette");
      c.palette = [];
      d.palette.forEach(function (type) {
        if (!LC.parts[type]) throw fail("part", String(type));
        if (c.palette.indexOf(type) < 0) c.palette.push(type);
      });
    }
    if (d.lock) c.lock = true;
    if (d.table) c.table = true;
    if (d.sound) c.sound = true;
    if (d.flow === "electrons") c.flow = "electrons";
    if (d.potential) c.potential = true;
    if (d.task !== undefined && d.task !== null) c.task = normalizeTask(d.task);
    return c;
  }

  /** Schreibt die Schaltung als kurzen JSON-Text, ein Bauteil und eine Leitung je Zeile. */
  function serialize(circuit) {
    var parts = circuit.parts.map(function (p) {
      var q = { type: p.type, x: p.x, y: p.y, rot: p.rot || 0 };
      Object.keys(LC.parts[p.type].defaults).forEach(function (key) { q[key] = p[key]; });
      if (p.fault) q.fault = true;
      return JSON.stringify(q);
    });
    var wires = circuit.wires.map(function (w) { return JSON.stringify(w); });
    var extra = "";
    if (circuit.palette) extra += ',\n "palette":' + JSON.stringify(circuit.palette);
    if (circuit.lock) extra += ',\n "lock":true';
    if (circuit.table) extra += ',\n "table":true';
    if (circuit.sound) extra += ',\n "sound":true';
    if (circuit.flow) extra += ',\n "flow":"electrons"';
    if (circuit.potential) extra += ',\n "potential":true';
    if (circuit.task) extra += ',\n "task":' + JSON.stringify(circuit.task);
    return '{"view":"' + circuit.view + '","size":' + JSON.stringify(circuit.size) + extra +
      ',\n "parts":[\n  ' + parts.join(",\n  ") + '\n ],\n "wires":[\n  ' + wires.join(",\n  ") + "\n ]}";
  }

  LC.solveLinear = solveLinear;
  LC.solveNodal = solveNodal;
  LC.rotate = rotate;
  LC.terminalPoints = terminalPoints;
  LC.lattice = lattice;
  LC.route = route;
  LC.buildNet = buildNet;
  LC.simulate = simulate;
  LC.isDynamic = isDynamic;
  LC.timeStep = timeStep;
  LC.createRun = createRun;
  LC.refresh = refresh;
  LC.advance = advance;
  LC.runFor = runFor;
  LC.normalize = normalize;
  LC.serialize = serialize;
})(typeof globalThis !== "undefined" ? globalThis : this);
