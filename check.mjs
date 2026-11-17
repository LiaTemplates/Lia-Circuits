// Modelltests für den Baustein "circuits": node --test lia-templates/circuits/check.mjs
// Die Prüfpunkte stehen im Steckbrief (journal.md → Templates → circuits).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "./circuits-solver.js";
import "./circuits-parts.js";
import "./circuits-locale.js";

const LC = globalThis.LiaCircuits;

const near = (actual, expected, rel = 2e-3) =>
  assert.ok(Math.abs(actual - expected) <= Math.abs(expected) * rel + 1e-9, `${actual} statt ${expected}`);
const run = description => {
  const circuit = LC.normalize(description);
  return { circuit, result: LC.simulate(circuit) };
};

// Batterie (4,5 V, Plus oben) links, oben Schalter und Lampe (15 Ω), unten zurück.
const loop = (closed, extraWires = []) => ({
  parts: [
    { type: "battery", x: 3, y: 4, rot: 1 },
    { type: "switch", x: 6, y: 2, closed },
    { type: "lamp", x: 10, y: 2 }
  ],
  wires: [[3, 3, 3, 2, 5, 2], [7, 2, 9, 2], [11, 2, 11, 6, 3, 6, 3, 5], ...extraWires]
});

// ---------------------------------------------------------------- Prüfpunkt 1

test("Prüfpunkt 1: Schalter offen – kein Strom, die Lampe leuchtet nicht", () => {
  const { result } = run(loop(false));
  assert.ok(Math.abs(result.parts[2].i[0]) < 1e-9);
  assert.equal(result.parts[2].brightness, 0);
  assert.ok(result.edges.every(edge => Math.abs(edge.current) < 1e-9));
  assert.deepEqual(result.warnings, []);
});

test("Prüfpunkt 1: Schalter geschlossen – 4,5 V an 15 Ω ergeben 0,3 A, die Lampe leuchtet, der Strom fließt in jeder Leitung", () => {
  const { result } = run(loop(true));
  near(result.parts[2].i[0], 0.3);
  assert.ok(result.parts[2].brightness > 0.9);
  for (const edge of result.edges) near(edge.current, 0.3);      // alle Leitungen sind vom Pluspol weg gezeichnet
  assert.deepEqual(result.warnings, []);
});

test("Prüfpunkt 1: eine Leitung quer über die Batterie ist ein Kurzschluss – Warnung, die Lampe bleibt dunkel", () => {
  const { result } = run(loop(true, [[3, 3, 2, 3, 2, 5, 3, 5]]));
  assert.deepEqual(result.warnings, [{ type: "short", part: 0 }]);
  assert.ok(result.parts[2].brightness < 0.01);
});

// ---------------------------------------------------------------- Prüfpunkt 2

test("Prüfpunkt 2: 9 V an 100 Ω – das Multimeter zeigt 90 mA", () => {
  const { result } = run({
    parts: [
      { type: "battery", x: 3, y: 4, rot: 3, value: 9 },
      { type: "resistor", x: 7, y: 2, value: 100 },
      { type: "multimeter", x: 7, y: 6, mode: "A" }
    ],
    wires: [[3, 5, 3, 6, 6, 6], [8, 6, 11, 6, 11, 2, 8, 2], [6, 2, 3, 2, 3, 3]]
  });
  near(result.parts[2].reading, 0.09, 1e-3);
  assert.equal(LC.parts.multimeter.state({ mode: "A" }, result.parts[2], "de"), "90,0 mA");
});

const divider = second => ({
  parts: [
    { type: "battery", x: 3, y: 4, rot: 1, value: 9 },
    { type: "resistor", x: 6, y: 2, value: 100 },
    { type: "resistor", x: 10, y: 2, value: second },
    { type: "multimeter", x: 10, y: 4, mode: "V" }
  ],
  wires: [[3, 3, 3, 2, 5, 2], [7, 2, 9, 2], [11, 2, 11, 6, 3, 6, 3, 5], [9, 4, 9, 2]]
});

test("Prüfpunkt 2: zwei gleiche Widerstände in Reihe – an jedem liegt die halbe Spannung", () => {
  const { result } = run(divider(100));
  near(result.parts[3].reading, 4.5, 1e-3);
  assert.equal(LC.parts.multimeter.state({ mode: "V" }, result.parts[3], "de"), "4,50 V");
  near(result.parts[1].v[0] - result.parts[1].v[1], 4.5, 1e-3);
});

test("Prüfpunkt 2: umbauen – ein geänderter Wert ändert die Messwerte, und die Beschreibung lässt sich hin und zurück schreiben", () => {
  const { circuit } = run(divider(100));
  circuit.parts[2].value = 300;                                   // Wert ändern
  near(LC.simulate(circuit).parts[3].reading, 6.75, 1e-3);        // 9 V · 300 / 400
  circuit.parts.push({ ...LC.parts.lamp.defaults, type: "lamp", x: 7, y: 6, rot: 0 });   // Bauteil dazu
  circuit.wires.pop();                                            // Leitung weg: das Multimeter hängt nur noch an einer Seite
  assert.ok(Math.abs(LC.simulate(circuit).parts[3].reading) < 1e-6);
  const text = LC.serialize(circuit);
  assert.deepEqual(LC.normalize(text), circuit);
  assert.equal(LC.serialize(LC.normalize(text)), text);
});

test("Prüfpunkt 2: Widerstandsmessung – das Multimeter zeigt den Wert eines einzelnen Widerstands", () => {
  const { result } = run({
    parts: [{ type: "resistor", x: 6, y: 3, value: 220 }, { type: "multimeter", x: 6, y: 6, mode: "R" }],
    wires: [[5, 3, 5, 6], [7, 3, 7, 6]]
  });
  near(result.parts[1].reading, 220, 1e-6);
  const open = run({ parts: [{ type: "multimeter", x: 6, y: 6, mode: "R" }] }).result;
  assert.equal(open.parts[0].reading, Infinity);
});

test("Multimeter: die Klemmen lassen sich an jeden Punkt setzen – an einen Anschluss und mitten auf eine Leitung", () => {
  const description = divider(100);
  description.wires.pop();                                         // ohne eine eigene Leitung zum Messgerät
  description.parts[3] = { type: "multimeter", x: 7, y: 5, mode: "V", a: [9, 2], b: [11, 4] };
  const { circuit, result } = run(description);                    // rot am Widerstand, schwarz mitten auf der Leitung
  assert.deepEqual(LC.terminalPoints(circuit.parts[3]), [[9, 2], [11, 4]]);
  near(result.parts[3].reading, 4.5, 1e-3);
  assert.deepEqual(LC.normalize(LC.serialize(circuit)), circuit);
  // ohne Angabe stecken die Klemmen links und rechts am Gerät und wandern mit ihm
  const parked = LC.normalize({ parts: [{ type: "multimeter", x: 7, y: 5, a: "quatsch", b: [1] }] }).parts[0];
  assert.deepEqual([parked.a, parked.b], [null, null]);
  assert.deepEqual(LC.terminalPoints(parked), [[6, 5], [8, 5]]);
  parked.x = 9;
  assert.deepEqual(LC.terminalPoints(parked), [[8, 5], [10, 5]]);
});

// ---------------------------------------------------------------- Leitungen

test("Leitungen: eine Kreuzung verbindet nicht, ein Abzweig schon", () => {
  assert.equal(LC.buildNet(LC.normalize({ wires: [[3, 5, 7, 5], [5, 3, 5, 7]] })).nodeCount, 2);
  assert.equal(LC.buildNet(LC.normalize({ wires: [[3, 5, 7, 5], [5, 3, 5, 5]] })).nodeCount, 1);
});

test("Leitungen: an einer Verzweigung teilt sich der Strom wie berechnet", () => {
  // zwei Lampen parallel: je 0,3 A, in der gemeinsamen Leitung 0,6 A
  const { result } = run({
    parts: [
      { type: "battery", x: 3, y: 4, rot: 1 },
      { type: "lamp", x: 8, y: 2 },
      { type: "lamp", x: 8, y: 4 }
    ],
    wires: [[3, 3, 3, 2, 7, 2], [6, 2, 6, 4, 7, 4], [9, 2, 11, 2, 11, 6, 3, 6, 3, 5], [9, 4, 11, 4]]
  });
  near(result.parts[1].i[0], 0.3);
  near(result.parts[2].i[0], 0.3);
  const currents = result.edges.map(edge => Math.abs(edge.current)).sort();
  near(currents[currents.length - 1], 0.6);
  near(currents[0], 0.3);
});

test("Leitungen: übereinanderliegende Stücke werden gemeldet, Kreuzungen und Abzweige nicht", () => {
  const overlaps = wires => LC.simulate(LC.normalize({ wires })).overlaps;
  assert.deepEqual(overlaps([[3, 2, 7, 2], [5, 2, 9, 2]]), [[5, 2, 6, 2], [6, 2, 7, 2]]);
  assert.deepEqual(overlaps([[3, 5, 7, 5], [5, 3, 5, 7]]), []);
  assert.deepEqual(overlaps([[3, 5, 7, 5], [5, 3, 5, 5]]), []);
  assert.equal(overlaps([[3, 2, 7, 2], [7, 2, 3, 2]]).length, 4);            // dieselbe Strecke hin und zurück
  assert.equal(LC.buildNet(LC.normalize({ wires: [[3, 2, 7, 2], [5, 2, 9, 2]] })).nodeCount, 1);   // dort verbunden
});

test("Lampen: in Reihe leuchten zwei Lampen nur schwach, parallel beide voll", () => {
  const series = run({
    parts: [{ type: "battery", x: 3, y: 4, rot: 1 }, { type: "lamp", x: 6, y: 2 }, { type: "lamp", x: 10, y: 2 }],
    wires: [[3, 3, 3, 2, 5, 2], [7, 2, 9, 2], [11, 2, 11, 6, 3, 6, 3, 5]]
  }).result;
  near(series.parts[1].i[0], 0.15);                                            // halber Strom, ein Viertel der Leistung
  near(series.parts[1].brightness, Math.pow(0.25, 1.7), 2e-2);                 // rund ein Zehntel des Lichts
  near(series.parts[2].brightness, series.parts[1].brightness);
  assert.equal(LC.parts.lamp.state({}, series.parts[1], "de"), "leuchtet schwach");
  const parallel = run({
    parts: [{ type: "battery", x: 3, y: 4, rot: 1 }, { type: "lamp", x: 8, y: 2 }, { type: "lamp", x: 8, y: 4 }],
    wires: [[3, 3, 3, 2, 7, 2], [6, 2, 6, 4, 7, 4], [9, 2, 11, 2, 11, 6, 3, 6, 3, 5], [9, 4, 11, 4]]
  }).result;
  assert.ok(parallel.parts[1].brightness > 0.9 && parallel.parts[2].brightness > 0.9);
  assert.equal(LC.parts.lamp.state({}, parallel.parts[1], "de"), "leuchtet");
  // drei in Reihe: ein Neuntel der Leistung, kaum noch Licht
  assert.ok(Math.pow(1 / 9, 1.7) < 0.03);
});

test("Lampe: brennt bei deutlich zu hoher Spannung durch, Antippen ersetzt sie", () => {
  const description = volts => ({
    parts: [{ type: "battery", x: 3, y: 4, rot: 1, value: volts }, { type: "lamp", x: 7, y: 2 }],
    wires: [[3, 3, 3, 2, 6, 2], [8, 2, 10, 2, 10, 6, 3, 6, 3, 5]]
  });
  const high = run(description(9));                                           // doppelte Nennspannung
  assert.equal(high.circuit.parts[1].blown, true);
  assert.deepEqual(high.result.events, [{ type: "blown", part: 1 }]);
  assert.equal(high.result.parts[1].brightness, 0);
  assert.equal(LC.parts.lamp.state(high.circuit.parts[1], high.result.parts[1], "de"), "durchgebrannt");
  const bright = run(description(6));                                         // 1,33-fache Nennspannung: sehr hell, hält
  assert.equal(bright.circuit.parts[1].blown, false);
  assert.ok(bright.result.parts[1].brightness > 1.3);
  LC.parts.lamp.tap(high.circuit.parts[1]);                                   // ersetzen …
  high.circuit.parts[0].value = 4.5;                                          // … und die passende Batterie nehmen
  assert.ok(LC.simulate(high.circuit).parts[1].brightness > 0.9);
  const lamp = { ...LC.parts.lamp.defaults };                                 // eine Lampe für 9 V: der Nennstrom bleibt
  LC.parts.lamp.controls[0].set(lamp, 9);
  near(lamp.value, 30);
  near(lamp.power, 2.7);
  near(LC.parts.lamp.controls[0].get(lamp), 9);
  assert.equal(LC.parts.lamp.caption({ value: 15, power: 1.35 }, "de"), "4,5 V");
  assert.equal(LC.parts.lamp.caption({ value: 15, power: 1.35, blown: true }, "de"), "defekt");
});

test("Batterie: mit Innenwiderstand sinkt die Spannung unter Last, ein Kurzschluss wird trotzdem erkannt", () => {
  const description = (lamps, extra = []) => ({
    parts: [{ type: "battery", x: 3, y: 4, rot: 1, ohm: 1 }, { type: "lamp", x: 8, y: 2 }, ...(lamps > 1 ? [{ type: "lamp", x: 8, y: 4 }] : [])],
    wires: [[3, 3, 3, 2, 7, 2], [9, 2, 11, 2, 11, 6, 3, 6, 3, 5], ...(lamps > 1 ? [[6, 2, 6, 4, 7, 4], [9, 4, 11, 4]] : []), ...extra]
  });
  const one = run(description(1)).result, two = run(description(2)).result;
  near(one.parts[1].i[0], 4.5 / 16);                                          // 15 Ω Lampe und 1 Ω innen
  near(one.parts[0].v[0] - one.parts[0].v[1], (4.5 * 15) / 16);               // Klemmenspannung 4,22 V
  near(two.parts[1].i[0], 4.5 / 8.5 / 2);                                     // zwei Lampen parallel: 7,5 Ω und 1 Ω
  assert.ok(two.parts[1].brightness < one.parts[1].brightness);
  assert.deepEqual(two.warnings, []);
  const short = run(description(1, [[3, 3, 2, 3, 2, 5, 3, 5]])).result;       // nur 4,5 A, aber der ganze Kurzschlussstrom
  assert.deepEqual(short.warnings.filter(w => w.type === "short"), [{ type: "short", part: 0 }]);   // die Lampe ist dabei auch überbrückt
  assert.equal(LC.parts.battery.caption({ value: 4.5, ohm: 1 }, "de"), "4,5 V · 1 Ω");
  assert.equal(LC.parts.battery.caption({ value: 4.5, ohm: 0.01 }, "de"), "4,5 V");
});

test("Batterie: vier Bauformen mit eigenem Bild; ohne Angabe richtet sich die Form nach der Spannung", () => {
  const form = raw => LC.normalize({ parts: [{ type: "battery", x: 3, y: 3, ...raw }] }).parts[0].form;
  assert.deepEqual([form({ value: 1.5 }), form({ value: 3 }), form({}), form({ value: 9 })], ["cell", "coin", "flat", "block"]);
  assert.equal(form({ value: 9, form: "flat" }), "flat");                     // eine Angabe bleibt
  assert.equal(form({ form: "akku" }), "flat");                               // eine unbekannte nicht
  const pictures = new Set(), symbols = new Set();
  for (const name of LC.parts.battery.options.form) {
    const part = { ...LC.parts.battery.defaults, type: "battery", x: 3, y: 3, rot: 0 };
    LC.parts.battery.controls[0].set(part, name);                             // die Wahl bringt die übliche Spannung mit
    assert.equal(part.value, { cell: 1.5, flat: 4.5, block: 9, coin: 3 }[name]);
    for (const view of ["picture", "symbol"]) {
      const svg = LC.parts.battery.draw(part, null, { view, rot: 0, uid: "t", lang: "de" });
      assert.doesNotMatch(svg, /undefined|NaN/);
      (view === "picture" ? pictures : symbols).add(svg);
    }
    assert.notEqual(LC.text(LC.parts.battery.controls[0].options.find(option => option[0] === name)[1], "de"), name);
  }
  assert.equal(pictures.size, 4);                                             // jede Form hat ihr eigenes Bild
  assert.equal(symbols.size, 2);                                              // Schaltzeichen: eine Zelle oder mehrere
});

// ---------------------------------------------------------------- Prüfpunkt 3: Bauteile (Abschnitt 1)

test("Prüfpunkt 3: Taster – leitet nur, solange er gedrückt ist", () => {
  const circuit = LC.normalize({ ...loop(false), parts: [loop(false).parts[0], { type: "button", x: 6, y: 2 }, loop(false).parts[2]] });
  assert.ok(Math.abs(LC.simulate(circuit).parts[2].i[0]) < 1e-9);
  circuit.parts[1].pressed = true;
  near(LC.simulate(circuit).parts[2].i[0], 0.3);
});

test("Prüfpunkt 3: Umschalter – wählt eine von zwei Lampen", () => {
  const description = pos => ({
    parts: [
      { type: "battery", x: 2, y: 5, rot: 1 },
      { type: "changeover", x: 5, y: 3, pos },
      { type: "lamp", x: 9, y: 2 },
      { type: "lamp", x: 9, y: 4 }
    ],
    wires: [[2, 4, 2, 3, 4, 3], [6, 2, 8, 2], [6, 4, 8, 4], [10, 2, 12, 2, 12, 7, 2, 7, 2, 6], [10, 4, 12, 4]]
  });
  const first = run(description(0)).result, second = run(description(1)).result;
  near(first.parts[2].i[0], 0.3);
  assert.ok(Math.abs(first.parts[3].i[0]) < 1e-9);
  near(second.parts[3].i[0], 0.3);
  assert.ok(Math.abs(second.parts[2].i[0]) < 1e-9);
});

test("Prüfpunkt 3: Sicherung – löst über ihrem Nennstrom aus und unterbricht", () => {
  const description = value => ({
    parts: [
      { type: "battery", x: 3, y: 4, rot: 1 },
      { type: "fuse", x: 5, y: 2, value },
      { type: "lamp", x: 9, y: 2 }
    ],
    wires: [[3, 3, 3, 2, 4, 2], [6, 2, 8, 2], [10, 2, 10, 6, 3, 6, 3, 5]]
  });
  const weak = run(description(0.2));
  assert.equal(weak.circuit.parts[1].blown, true);
  assert.deepEqual(weak.result.events, [{ type: "blown", part: 1 }]);
  assert.ok(Math.abs(weak.result.parts[2].i[0]) < 1e-9);
  const strong = run(description(1));
  assert.equal(strong.circuit.parts[1].blown, false);
  near(strong.result.parts[2].i[0], 0.3);
});

test("Prüfpunkt 3: Schiebewiderstand – 50 Ω auf halber Stellung vor einer 15-Ω-Lampe ergeben 4,5 V / 40 Ω", () => {
  const description = pos => ({
    parts: [
      { type: "battery", x: 3, y: 4, rot: 1 },
      { type: "potentiometer", x: 7, y: 2, value: 50, pos },
      { type: "lamp", x: 10, y: 3 }
    ],
    wires: [[3, 3, 3, 2, 6, 2], [7, 3, 9, 3], [11, 3, 12, 3, 12, 6, 3, 6, 3, 5]]
  });
  const half = run(description(0.5)).result, none = run(description(0)).result;
  near(half.parts[2].i[0], 4.5 / 40);
  near(none.parts[2].i[0], 0.3);
  assert.ok(half.parts[2].brightness < none.parts[2].brightness);
});

test("Prüfpunkt 3: einstellbare Spannungsquelle – 6 V an 200 Ω ergeben 30 mA", () => {
  const { result } = run({
    parts: [{ type: "source", x: 3, y: 4, rot: 1, value: 6 }, { type: "resistor", x: 7, y: 2, value: 200 }],
    wires: [[3, 3, 3, 2, 6, 2], [8, 2, 10, 2, 10, 6, 3, 6, 3, 5]]
  });
  near(result.parts[1].i[0], 0.03);
});

// ---------------------------------------------------------------- Prüfpunkt 3: Bauteile (Abschnitt 2, zeitlicher Verlauf)

// Wechselspannungsquelle (Anschluss 0 unten), oben ein Bauteil, unten das Multimeter als Strommesser.
const acLoop = (load, source = { value: 6, freq: 50 }) => LC.normalize({
  parts: [
    { type: "acsource", x: 3, y: 4, rot: 3, ...source },
    { x: 7, y: 2, ...load },
    { type: "multimeter", x: 7, y: 6, mode: "A" }
  ],
  wires: [[3, 5, 3, 6, 6, 6], [8, 6, 11, 6, 11, 2, 8, 2], [6, 2, 3, 2, 3, 3]]
});

test("Prüfpunkt 3: Kondensator – lädt sich über 1 kΩ mit der Zeitkonstante 1 s auf, im Ruhezustand sperrt er", () => {
  const circuit = LC.normalize({
    parts: [
      { type: "battery", x: 3, y: 4, rot: 1, value: 9 },
      { type: "resistor", x: 6, y: 2, value: 1000 },
      { type: "capacitor", x: 10, y: 2, value: 1e-3 }
    ],
    wires: [[3, 3, 3, 2, 5, 2], [7, 2, 9, 2], [11, 2, 11, 6, 3, 6, 3, 5]]
  });
  assert.equal(LC.isDynamic(circuit), true);
  assert.ok(Math.abs(LC.simulate(circuit).parts[1].i[0]) < 1e-9);
  const { run, result } = LC.runFor(circuit, 1);
  near(result.parts[2].voltage, 9 * (1 - Math.exp(-1)), 5e-3);            // 5,69 V nach einer Zeitkonstante
  near(LC.runFor(circuit, 4, run).result.parts[2].voltage, 9 * (1 - Math.exp(-5)), 5e-3);
  LC.parts.capacitor.act(circuit.parts[2]);                                // entladen
  near(LC.runFor(circuit, 1, run).result.parts[2].voltage, 9 * (1 - Math.exp(-1)), 5e-3);
});

test("Prüfpunkt 3: Wechselspannungsquelle – 6 V effektiv an 100 Ω ergeben 60 mA, das Multimeter zeigt den Effektivwert", () => {
  const circuit = acLoop({ type: "resistor", value: 100 });
  const { result } = LC.runFor(circuit, 0.5);
  near(result.parts[2].reading, 0.06, 5e-3);
  assert.equal(result.parts[2].ac, true);
  assert.equal(LC.parts.multimeter.state(circuit.parts[2], result.parts[2], "de"), "~ 60,0 mA");
});

test("Prüfpunkt 3: Kondensator an Wechselspannung – 100 µF bei 50 Hz haben 31,8 Ω Blindwiderstand", () => {
  const { result } = LC.runFor(acLoop({ type: "capacitor", value: 100e-6 }), 0.5);
  near(result.parts[2].reading, 6 * 2 * Math.PI * 50 * 100e-6, 5e-3);     // 188 mA
});

test("Prüfpunkt 3: Spule – der Strom steigt mit der Zeitkonstante L/R, an Wechselspannung zählt der Scheinwiderstand", () => {
  const circuit = LC.normalize({
    parts: [{ type: "battery", x: 3, y: 4, rot: 1, value: 9 }, { type: "inductor", x: 7, y: 2, value: 0.5, ohm: 10 }],
    wires: [[3, 3, 3, 2, 6, 2], [8, 2, 10, 2, 10, 6, 3, 6, 3, 5]]
  });
  const R = 10.01;                                                         // Wicklung und Innenwiderstand der Batterie
  near(LC.simulate(circuit).parts[1].i[0], 9 / R);                         // Ruhezustand: nur der Wicklungswiderstand
  const { run, result } = LC.runFor(circuit, 0.05);
  near(result.parts[1].i[1], (9 / R) * (1 - Math.exp((-0.05 * R) / 0.5)), 1e-2);   // 0,57 A nach einer Zeitkonstante
  near(LC.runFor(circuit, 1, run).result.parts[1].i[1], 9 / R, 5e-3);
  const ac = LC.runFor(acLoop({ type: "inductor", value: 0.5, ohm: 10 }), 1).result;
  near(ac.parts[2].reading, 6 / Math.hypot(10.011, 2 * Math.PI * 50 * 0.5), 1e-2);   // 38 mA
});

test("Prüfpunkt 3: Oszilloskop – zeigt den Sinus mit Scheitelwert 8,49 V, getriggert auf den steigenden Durchgang", () => {
  const circuit = LC.normalize({
    parts: [{ type: "acsource", x: 3, y: 4, rot: 3, value: 6, freq: 50 }, { type: "scope", x: 8, y: 3, time: 0.005, volts: 5 }],
    wires: [[3, 5, 7, 5], [3, 3, 2, 3, 2, 7, 9, 7, 9, 5]]
  });
  LC.runFor(circuit, 0.3);
  const trace = LC.parts.scope.trace(circuit.parts[1]);
  assert.ok(trace.length > 200, `${trace.length} Punkte`);
  assert.ok(trace.every(([x]) => x >= 0 && x <= 1));
  assert.ok(Math.abs(trace[0][1]) < 0.6, `Beginn bei ${trace[0][1]} V`);   // am Nulldurchgang
  const peak = trace.reduce((best, point) => (point[1] > best[1] ? point : best));
  near(peak[1], 6 * Math.SQRT2, 1e-2);
  assert.ok(Math.abs((peak[0] % 0.4) - 0.1) < 0.02, `Scheitel bei ${peak[0]}`);   // Viertelperiode = 5 ms = 1 Kästchen von 10
  assert.match(LC.parts.scope.draw(circuit.parts[1], null, { view: "picture", rot: 0, uid: "t", lang: "de" }), /class="lc-trace" d="M/);
});

test("Prüfpunkt 3: langsame Wechselspannung – die Lampe pulsiert, das Messgerät folgt dem Verlauf", () => {
  const circuit = acLoop({ type: "lamp" }, { value: 4.5, freq: 1 });
  const { run, result: peak } = LC.runFor(circuit, 0.25);                   // Scheitel der ersten Halbwelle
  assert.ok(peak.parts[1].brightness > 0.9, `Helligkeit ${peak.parts[1].brightness}`);
  assert.equal(peak.parts[2].ac, false);
  const zero = LC.runFor(circuit, 0.25, run).result;                        // eine Viertelperiode weiter: Nulldurchgang
  assert.ok(zero.parts[1].brightness < 0.5, `Helligkeit ${zero.parts[1].brightness}`);
});

// ---------------------------------------------------------------- Prüfpunkt 3: Bauteile (Abschnitt 3)

test("Prüfpunkt 3: Diode – leitet in einer Richtung ab 0,7 V, in der anderen sperrt sie", () => {
  const description = rot => ({
    parts: [
      { type: "battery", x: 3, y: 4, rot: 3, value: 9 },
      { type: "resistor", x: 6, y: 2, value: 1000 },
      { type: "diode", x: 9, y: 2, rot },
      { type: "multimeter", x: 7, y: 6, mode: "A" }
    ],
    wires: [[3, 5, 3, 6, 6, 6], [8, 6, 11, 6, 11, 2, 10, 2], [8, 2, 7, 2], [5, 2, 3, 2, 3, 3]]
  });
  const forward = run(description(2)), reverse = run(description(0));
  near(forward.result.parts[3].reading, (9 - 0.7) / 1000, 1e-3);                  // 8,3 mA
  assert.equal(LC.parts.diode.state(forward.circuit.parts[2], null, "de"), "leitet");
  assert.ok(Math.abs(reverse.result.parts[3].reading) < 1e-6);
  assert.equal(LC.parts.diode.state(reverse.circuit.parts[2], null, "de"), "sperrt");
  assert.deepEqual(forward.result.events, []);                                    // Umschalten ist kein Schaden
});

test("Prüfpunkt 3: Diode an Wechselspannung – nur eine Halbwelle kommt durch", () => {
  const circuit = LC.normalize({
    parts: [
      { type: "acsource", x: 3, y: 4, rot: 3, value: 6, freq: 50 },
      { type: "resistor", x: 6, y: 2, value: 1000 },
      { type: "diode", x: 9, y: 2, rot: 2 }
    ],
    wires: [[3, 5, 3, 6, 11, 6, 11, 2, 10, 2], [8, 2, 7, 2], [5, 2, 3, 2, 3, 3]]
  });
  const run50 = LC.createRun(circuit);
  let low = Infinity, high = -Infinity;
  for (let k = 0; k < 600; k++) {                                                // drei Perioden
    const current = LC.advance(run50, 1).parts[1].i[0];
    low = Math.min(low, current); high = Math.max(high, current);
  }
  assert.ok(low > -1e-6 || high < 1e-6, `Strom von ${low} bis ${high}`);        // nur ein Vorzeichen
  near(Math.max(Math.abs(low), Math.abs(high)), (6 * Math.SQRT2 - 0.7) / 1000, 1e-2);   // 7,8 mA im Scheitel
});

test("Prüfpunkt 3: Leuchtdiode – leuchtet mit Vorwiderstand, brennt ohne ihn durch, sperrt verkehrt herum", () => {
  const description = (ohm, color = "red", rot = 0) => ({
    parts: [
      { type: "battery", x: 2, y: 4, rot: 1, value: 9 },
      { type: "resistor", x: 7, y: 2, value: ohm },
      { type: "led", x: 10, y: 2, color, rot }
    ],
    wires: [[2, 3, 2, 2, 6, 2], [8, 2, 9, 2], [11, 2, 12, 2, 12, 6, 2, 6, 2, 5]]
  });
  const lit = run(description(470));
  near(lit.result.parts[2].i[0], (9 - 1.8) / 470, 1e-3);                           // 15,3 mA
  near(lit.result.parts[2].brightness, (9 - 1.8) / 470 / 0.02, 1e-3);
  assert.equal(LC.parts.led.state(lit.circuit.parts[2], lit.result.parts[2], "de"), "leuchtet");
  near(run(description(470, "blue")).result.parts[2].i[0], (9 - 3) / 470, 1e-3);   // blau: Schwelle 3,0 V
  assert.ok(run(description(470, "red", 2)).result.parts[2].brightness < 0.01);
  const burnt = run(description(1));                                               // fast ohne Vorwiderstand
  assert.equal(burnt.circuit.parts[2].blown, true);
  assert.deepEqual(burnt.result.events, [{ type: "blown", part: 2 }]);
  assert.equal(burnt.result.parts[2].brightness, 0);
  assert.equal(LC.parts.led.state(burnt.circuit.parts[2], burnt.result.parts[2], "de"), "durchgebrannt");
  LC.parts.led.tap(burnt.circuit.parts[2]);                                        // Antippen ersetzt sie
  assert.equal(burnt.circuit.parts[2].blown, false);
});

test("Prüfpunkt 3: Transistor – sperrt ohne Basisstrom, verstärkt hundertfach, schaltet bei großem Basisstrom durch", () => {
  const build = (base, pressed) => {
    const circuit = LC.normalize({
      parts: [
        { type: "battery", x: 2, y: 4, rot: 1, value: 9 },
        { type: "resistor", x: 9, y: 2, rot: 1, value: 1000 },                     // Kollektorwiderstand
        { type: "resistor", x: 4, y: 2, rot: 1, value: base },                     // Basiswiderstand
        { type: "button", x: 5, y: 4 },
        { type: "transistor", x: 8, y: 4, value: 100 }
      ],
      wires: [[2, 3, 2, 1, 9, 1], [4, 3, 4, 4], [6, 4, 7, 4], [9, 5, 9, 7, 2, 7, 2, 5]]
    });
    if (pressed) circuit.parts[3].pressed = true;
    return { circuit, result: LC.simulate(circuit) };
  };
  const off = build(100000, false);
  assert.ok(Math.abs(off.result.parts[1].i[0]) < 1e-6);
  assert.equal(LC.parts.transistor.state(off.circuit.parts[4], null, "de"), "sperrt");
  const active = build(100000, true);                                              // 83 µA in die Basis
  near(active.result.parts[4].base, (9 - 0.7) / 100000, 1e-3);
  near(active.result.parts[1].i[0], (100 * (9 - 0.7)) / 100000, 1e-2);             // 8,3 mA durch den Kollektor
  assert.equal(active.circuit.parts[4]._mode, "active");
  const saturated = build(10000, true);                                            // 830 µA: mehr, als der Kollektorkreis hergibt
  near(saturated.result.parts[1].i[0], (9 - 0.2) / 1000, 1e-3);                    // 8,8 mA, begrenzt durch 1 kΩ
  near(saturated.result.parts[4].v[1] - saturated.result.parts[4].v[2], 0.2, 1e-2);
  assert.equal(saturated.circuit.parts[4]._mode, "sat");
  assert.equal(LC.parts.transistor.state(saturated.circuit.parts[4], null, "de"), "leitet");
});

test("Prüfpunkt 3: Fotowiderstand – 1 MΩ im Dunkeln, etwa 320 Ω im Hellen", () => {
  const description = light => ({
    parts: [{ type: "battery", x: 3, y: 4, rot: 1, value: 9 }, { type: "ldr", x: 7, y: 2, light }],
    wires: [[3, 3, 3, 2, 6, 2], [8, 2, 10, 2, 10, 6, 3, 6, 3, 5]]
  });
  near(run(description(0)).result.parts[1].i[0], 9 / 1e6);
  near(run(description(1)).result.parts[1].i[0], 9 / Math.pow(10, 2.5));
  assert.equal(LC.parts.ldr.caption({ light: 0 }, "de"), "1 MΩ");
  assert.equal(LC.parts.ldr.caption({ light: 1 }, "de"), "316 Ω");
});

test("Prüfpunkt 3: Motor und Summer – der Motor dreht mit der Spannung und mit ihrem Vorzeichen, der Summer summt ab der halben Nennspannung", () => {
  const description = (type, volts, rot = 1) => ({
    parts: [{ type: "source", x: 3, y: 4, rot, value: volts }, { type, x: 7, y: 2 }],
    wires: [[3, 3, 3, 2, 6, 2], [8, 2, 10, 2, 10, 6, 3, 6, 3, 5]]
  });
  const motor = (volts, rot) => { const { circuit, result } = run(description("motor", volts, rot)); return [result.parts[1], LC.parts.motor.state(circuit.parts[1], result.parts[1], "de")]; };
  const [full, fullText] = motor(4.5), [back, backText] = motor(4.5, 3), [half] = motor(2.25), [still, stillText] = motor(0.3);
  near(full.i[0], 4.5 / 20);                                                       // 20 Ω
  near(full.speed, 1.5);                                                           // Umdrehungen je Sekunde bei Nennspannung
  near(back.speed, -1.5);
  near(half.speed, 0.75);
  assert.equal(still.speed, 0);                                                    // unter einem Zehntel läuft er nicht an
  assert.deepEqual([fullText, backText, stillText], ["dreht sich rechts herum", "dreht sich links herum", "steht"]);
  const buzzer = volts => { const { circuit, result } = run(description("buzzer", volts)); return LC.parts.buzzer.state(circuit.parts[1], result.parts[1], "de"); };
  assert.deepEqual([buzzer(3), buzzer(1.6), buzzer(1)], ["summt", "summt", "ist still"]);
});

test("Prüfpunkt 3: jedes Teil der Liste im Steckbrief ist gebaut", () => {
  const list = ["battery", "source", "acsource", "switch", "changeover", "button", "fuse", "lamp", "resistor", "potentiometer",
    "motor", "buzzer", "capacitor", "inductor", "diode", "led", "transistor", "ldr", "multimeter", "scope",   // dazu die Leitung
    "solar", "dynamo", "relay", "magnet", "speaker", "ntc",                                                   // Paket B
    "voltmeter", "ammeter", "wattmeter", "siggen"];                                                          // Paket C
  assert.deepEqual([...LC.palette].sort(), [...list].sort());
  for (const type of list) assert.equal(typeof LC.parts[type].draw, "function");
});

// ---------------------------------------------------------------- Beschreibung und Zahlen

test("Beschreibung: leer ist erlaubt, Fehler werden benannt", () => {
  assert.deepEqual(LC.normalize(""), { view: "picture", size: [14, 8], parts: [], wires: [] });
  assert.equal(LC.normalize('```{"view":"symbol"}```').view, "symbol");
  assert.throws(() => LC.normalize("{nicht json"), error => error.code === "json");
  assert.throws(() => LC.normalize({ parts: [{ type: "flux-capacitor", x: 1, y: 1 }] }), error => error.code === "part");
  assert.throws(() => LC.normalize({ wires: [[1, 2, 3]] }), error => error.code === "wire");
});

test("Zahlen: drei Stellen wie am Messgerät, kurze Beschriftungen, Dezimalkomma im Deutschen", () => {
  assert.equal(LC.format(0.09, "A", "de"), "90,0 mA");
  assert.equal(LC.format(4.5, "V", "de"), "4,50 V");
  assert.equal(LC.format(4.5, "V", "de", true), "4,5 V");
  assert.equal(LC.format(100, "Ω", "de", true), "100 Ω");
  assert.equal(LC.format(1500, "Ω", "en", true), "1.5 kΩ");
  assert.equal(LC.format(-4.5, "V", "de"), "−4,50 V");
  assert.equal(LC.format(Infinity, "Ω", "de"), "∞ Ω");
  assert.equal(LC.format(0, "A", "de"), "0 A");
});

// ---------------------------------------------------------------- Prüfpunkt 4

test("Prüfpunkt 4: jedes Bauteil wird in beiden Ansichten als SVG gezeichnet", () => {
  for (const type of LC.palette) {
    const part = LC.normalize({ parts: [{ type, x: 3, y: 3 }] }).parts[0];
    for (const view of ["picture", "symbol"]) {
      const svg = LC.parts[type].draw(part, null, { view, rot: 0, uid: "t", lang: "de" });
      assert.match(svg, /^<(line|rect|circle|path|text) /, `${type} (${view})`);
      assert.doesNotMatch(svg, /<canvas|<img|<foreignObject|undefined|NaN/, `${type} (${view})`);
    }
    assert.notEqual(LC.text(type, "de"), type);
    assert.notEqual(LC.text(type, "en"), type);
  }
});

test("Seite des Bausteins: jede Beispielschaltung lässt sich lesen und berechnen, jedes Bauteil kommt in einem Beispiel vor", () => {
  const readme = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "README.md"), "utf8");
  const blocks = [...readme.matchAll(/```json @Circuits\.sim\n([\s\S]*?)\n```/g)].map(match => match[1]);
  assert.ok(blocks.length >= 12, `${blocks.length} Beispiele`);
  const used = new Set();
  for (const block of blocks) {
    const circuit = LC.normalize(block);
    const result = LC.isDynamic(circuit) ? LC.runFor(circuit, 0.3).result : LC.simulate(circuit);
    assert.deepEqual(result.warnings, [], block);
    for (const part of circuit.parts) used.add(part.type);
    // das Oszilloskop an 6 V effektiv zeigt den Scheitelwert; der Kondensator an der Batterie lädt über 1 kΩ
    const scope = circuit.parts.find(part => part.type === "scope");
    if (scope && circuit.parts.some(part => part.type === "acsource" && part.value === 6))
      near(Math.max(...LC.parts.scope.trace(scope).map(point => point[1])), 6 * Math.SQRT2, 1e-2);
    const capacitor = circuit.parts.findIndex(part => part.type === "capacitor");
    if (capacitor >= 0 && circuit.parts.some(part => part.type === "battery"))
      near(result.parts[capacitor].voltage, 9 * (1 - Math.exp(-0.3)), 1e-2);
  }
  assert.deepEqual([...used].sort(), [...LC.palette].sort());
});

// Die Arbeitsfläche ohne Browser: ein Platzhalter für die Seite genügt, um zu prüfen, dass jede
// Beispielschaltung in beiden Ansichten gezeichnet wird und jedes Bauteil seine Einstellungen zeigt.
// Ob sie auf Antippen und Ziehen reagiert, zeigt nur der Versuch im Browser.
function placeholder() {
  const node = {
    id: "", innerHTML: "", textContent: "", attributes: {}, style: {}, parts: {}, listeners: {}, isConnected: true,
    classList: { add() {}, toggle() {} },
    setAttribute(key, value) { node.attributes[key] = String(value); },
    getAttribute(key) { return key in node.attributes ? node.attributes[key] : null; },
    hasAttribute(key) { return key in node.attributes; },
    addEventListener(type, listener) { (node.listeners[type] ||= []).push(listener); },
    removeEventListener() {},
    querySelector(selector) {                          // Einheitenwahl und Ausgabefelder gibt es im Platzhalter nicht
      return /^\[data-(unit|out|ctl)/.test(selector) ? null : (node.parts[selector] ||= placeholder());
    },
    querySelectorAll(selector) {                       // so viele Platzhalter, wie die Zeichnung Knoten dieser Klasse hat
      const name = /^\.([\w-]+)$/.exec(selector);
      if (!name) return [];
      const count = (node.innerHTML.match(new RegExp(`class="${name[1]}[ "]`, "g")) || []).length;
      return (node.lists[selector] = Array.from({ length: count }, placeholder));
    },
    lists: {},
    focus() {}, select() {}, contains() { return true; }, closest() { return node; },
    setPointerCapture() {}, getScreenCTM() { return { inverse() { return {}; } }; }
  };
  return node;
}

test("Arbeitsfläche: jede Beispielschaltung wird in beiden Ansichten gezeichnet, jedes Bauteil zeigt seine Einstellungen", async () => {
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  await import("./circuits-ui.js");
  assert.equal(typeof LC.mount, "function");
  const readme = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "README.md"), "utf8");
  const blocks = [...readme.matchAll(/```json @Circuits\.sim\n([\s\S]*?)\n```/g)].map(match => match[1]);
  const press = (el, attributes) => {
    const button = placeholder();
    Object.assign(button.attributes, attributes);
    for (const listener of el.listeners.click) listener({ target: button, detail: 1 });
  };
  blocks.forEach((block, number) => {
    const el = placeholder();
    el.id = `test-${number}`;
    LC.mount(el, block);
    const svg = el.querySelector(".lc-svg"), panel = el.querySelector(".lc-panel"), palette = el.querySelector(".lc-palette");
    const state = LC.store[el.id], count = state.circuit.parts.length, given = LC.normalize(block);
    const offered = given.lock ? 0 : (given.palette || LC.palette).length;        // gesperrt: keine Leiste
    const sound = () => {
      const texts = [svg.innerHTML, panel.innerHTML, palette.innerHTML, el.querySelector(".lc-goals").innerHTML, el.querySelector(".lc-log").innerHTML];
      for (const text of texts) assert.doesNotMatch(text, /undefined|NaN|\[object/);
      assert.equal((svg.innerHTML.match(/class="lc-part/g) || []).length, count);
      assert.equal((palette.innerHTML.match(/class="lc-pal"/g) || []).length, offered);
    };
    sound();
    for (const view of ["symbol", "picture"]) {
      for (let part = 0; part < count; part++) {
        state.selected = { part };
        press(el, { "data-view": view });
        sound();
        if (given.lock) assert.doesNotMatch(panel.innerHTML, /data-act="(remove|turn)"/);   // gesperrt: nichts umbauen
        else assert.match(panel.innerHTML, /data-act="remove"/);
      }
    }
    press(el, { "data-act": "copy" });
    if (given.parts.some(part => part.fault)) assert.equal(state.copyText, null);   // der Text würde den versteckten Defekt verraten
    else assert.deepEqual(LC.normalize(state.copyText), { ...given, view: "picture" });   // zuletzt stand die Ansicht auf Bildern
    press(el, { "data-act": "reset" });
    sound();
  });
  const doubled = placeholder();
  doubled.id = "test-overlap";
  LC.mount(doubled, { wires: [[3, 2, 7, 2], [5, 2, 9, 2]] });
  assert.match(doubled.querySelector(".lc-svg").innerHTML, /class="lc-overlap" d="M200 80 L240 80 M240 80 L280 80 "/);
  assert.match(doubled.querySelector(".lc-svg").innerHTML, /class="lc-overlap-top"/);
  assert.match(doubled.querySelector(".lc-status").textContent, /Leitungen übereinander/);
  const broken = placeholder();
  broken.id = "test-broken";
  LC.mount(broken, "{kaputt");
  assert.match(broken.innerHTML, /class="lc-error"/);
});

test("Arbeitsfläche: Rückgängig und Wiederholen – mit den Knöpfen und mit Strg+Z / Strg+Y", async () => {
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  await import("./circuits-ui.js");
  const el = placeholder();
  el.id = "test-undo";
  LC.mount(el, loop(false));
  const state = LC.store[el.id];
  const press = attributes => {
    const button = placeholder();
    Object.assign(button.attributes, attributes);
    for (const listener of el.listeners.click) listener({ target: button, detail: 1 });
  };
  const shortcut = (key, extra = {}) => {
    let prevented = false;
    for (const listener of el.listeners.keydown) listener({ key, ctrlKey: true, target: { tagName: "svg" }, preventDefault() { prevented = true; }, ...extra });
    return prevented;
  };
  const undoButton = el.querySelector('[data-act="undo"]'), redoButton = el.querySelector('[data-act="redo"]');
  assert.equal(undoButton.disabled, true);

  state.selected = { part: 1 };
  press({ "data-act": "tap" });                                   // Schalter schließen
  assert.equal(state.circuit.parts[1].closed, true);
  assert.equal(undoButton.disabled, false);
  state.selected = { part: 2 };
  press({ "data-act": "remove" });                                // Lampe entfernen
  assert.equal(state.circuit.parts.length, 2);

  assert.equal(shortcut("z"), true);                              // Strg+Z: die Lampe ist wieder da
  assert.equal(state.circuit.parts.length, 3);
  assert.equal(state.circuit.parts[1].closed, true);
  press({ "data-act": "undo" });                                  // Knopf: der Schalter ist wieder offen
  assert.equal(state.circuit.parts[1].closed, false);
  assert.equal(undoButton.disabled, true);
  assert.equal(shortcut("y"), true);                              // Strg+Y: Schalter wieder zu
  assert.equal(state.circuit.parts[1].closed, true);
  assert.equal(shortcut("Z", { shiftKey: true }), true);          // Strg+Umschalt+Z: Lampe wieder weg
  assert.equal(state.circuit.parts.length, 2);
  assert.equal(redoButton.disabled, true);

  assert.equal(shortcut("z", { target: { tagName: "INPUT" } }), false);   // im Eingabefeld gehört Strg+Z dem Feld
  assert.equal(shortcut("r"), false);                             // Strg+R bleibt dem Browser
  assert.equal(state.circuit.parts.length, 2);

  press({ "data-act": "reset" });                                 // auch Zurücksetzen lässt sich zurücknehmen
  assert.equal(state.circuit.parts.length, 3);
  press({ "data-act": "undo" });
  assert.equal(state.circuit.parts.length, 2);

  // Drehen lässt die Leitungen liegen: zweimal drehen polt die Diode um, dann sperrt sie
  const turned = placeholder();
  turned.id = "test-turn";
  const diodeCircuit = {
    parts: [
      { type: "battery", x: 3, y: 4, rot: 3, value: 9 },
      { type: "resistor", x: 6, y: 2, value: 1000 },
      { type: "diode", x: 9, y: 2, rot: 2 },
      { type: "multimeter", x: 7, y: 6, mode: "A" }
    ],
    wires: [[3, 5, 3, 6, 6, 6], [8, 6, 11, 6, 11, 2, 10, 2], [8, 2, 7, 2], [5, 2, 3, 2, 3, 3]]
  };
  LC.mount(turned, diodeCircuit);
  const diodeState = LC.store[turned.id];
  near(diodeState.result.parts[3].reading, 8.3e-3, 1e-3);
  diodeState.selected = { part: 2 };
  for (let k = 0; k < 2; k++) {
    const button = placeholder();
    button.attributes["data-act"] = "turn";
    for (const listener of turned.listeners.click) listener({ target: button, detail: 1 });
  }
  assert.equal(diodeState.circuit.parts[2].rot, 0);
  assert.deepEqual(diodeState.circuit.wires, diodeCircuit.wires);
  assert.ok(Math.abs(diodeState.result.parts[3].reading) < 1e-6);
  assert.equal(diodeState.history.length, 2);

  // mehrere Eingaben an derselben Einstellung zählen als ein Schritt
  const panel = el.querySelector(".lc-panel"), steps = state.history.length;
  const type = value => {
    const input = placeholder();
    input.attributes["data-ctl"] = "1";                           // die Spannung der Batterie (0 ist ihre Bauform)
    input.value = value;
    for (const listener of panel.listeners.input) listener({ target: input });
  };
  state.selected = { part: 0 };
  type("6"); type("9");
  assert.equal(state.circuit.parts[0].value, 9);
  assert.equal(state.history.length, steps + 1);
  press({ "data-act": "undo" });
  assert.equal(state.circuit.parts[0].value, 4.5);
});

test("Arbeitsfläche: die Klemmen des Multimeters werden gezeichnet und lassen sich mit dem Zeiger versetzen", async () => {
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  globalThis.DOMPoint = class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return this; } };   // Fenster = Zeichnung
  await import("./circuits-ui.js");
  try {
    const description = divider(100);
    description.wires.pop();
    description.parts[3] = { type: "multimeter", x: 7, y: 5, mode: "V" };
    const el = placeholder();
    el.id = "test-clips";
    LC.mount(el, description);
    const svg = el.querySelector(".lc-svg"), state = LC.store[el.id];
    assert.equal((svg.innerHTML.match(/data-probe="3:[01]"/g) || []).length, 2);
    assert.match(svg.innerHTML, /class="lc-cable lc-red"/);
    assert.match(svg.innerHTML, /class="lc-clip lc-black"/);
    assert.doesNotMatch(svg.innerHTML, /data-term="6,5"/);         // an den Klemmen beginnt keine Leitung, sie werden gezogen
    const pointer = (type, x, y, probe) => {
      const target = { closest: selector => (selector === "[data-probe]" && probe ? { getAttribute: () => probe } : null) };
      for (const listener of svg.listeners[type]) listener({ button: 0, pointerId: 1, clientX: x * 40, clientY: y * 40, target, preventDefault() {} });
    };
    const move = (probe, x, y) => { pointer("pointerdown", 0, 0, probe); pointer("pointermove", x, y); pointer("pointerup", x, y); };
    move("3:0", 9, 2);                                              // rote Klemme an den Widerstand
    move("3:1", 11, 4);                                             // schwarze Klemme mitten auf die Leitung
    assert.deepEqual([state.circuit.parts[3].a, state.circuit.parts[3].b], [[9, 2], [11, 4]]);
    near(state.result.parts[3].reading, 4.5, 1e-3);
    assert.match(svg.innerHTML, /Multimeter: 4,50 V/);
    assert.equal(state.history.length, 2);                          // zwei Schritte, beide lassen sich zurücknehmen
    move("3:0", 6, 5);                                              // zurück an ihren Platz am Gerät: wandert wieder mit
    assert.equal(state.circuit.parts[3].a, null);
    // in der Ansicht mit Schaltzeichen sind die Leitungen dünn, die rote Klemme hohl
    const button = placeholder();
    button.attributes["data-view"] = "symbol";
    for (const listener of el.listeners.click) listener({ target: button, detail: 1 });
    assert.match(svg.innerHTML, /class="lc-clip lc-red lc-plain"/);
  } finally {
    delete globalThis.DOMPoint;
  }
});

test("Arbeitsfläche: im Zeitverlauf rechnet die Bildschleife weiter, zeichnet die Bauteile neu und bewegt die Punkte", async () => {
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  await import("./circuits-ui.js");
  const frames = [];
  globalThis.requestAnimationFrame = callback => frames.push(callback);
  globalThis.cancelAnimationFrame = () => {};
  const play = (el, block, count) => {
    LC.mount(el, block);
    for (let k = 0; k < count; k++) frames.shift()(1000 + 50 * k);       // ein Bild alle 50 ms
    el._lc.stop();
    frames.length = 0;
    return LC.store[el.id];
  };
  try {
    // Kondensator lädt über 1 kΩ: 40 Bilder sind knapp 2 s
    const charging = placeholder();
    charging.id = "test-charging";
    const state = play(charging, {
      parts: [
        { type: "battery", x: 3, y: 4, rot: 1, value: 9 },
        { type: "resistor", x: 6, y: 2, value: 1000 },
        { type: "capacitor", x: 10, y: 2, value: 1e-3 }
      ],
      wires: [[3, 3, 3, 2, 5, 2], [7, 2, 9, 2], [11, 2, 11, 6, 3, 6, 3, 5]]
    }, 41);
    near(state.run.t, 2, 2e-2);
    near(state.result.parts[2].voltage, 9 * (1 - Math.exp(-state.run.t)), 5e-3);
    const svg = charging.querySelector(".lc-svg");
    assert.ok(svg.lists[".lc-part"].every(part => /class="lc-box"/.test(part.innerHTML)));
    assert.match(svg.lists[".lc-part"][2].innerHTML, /1 mF · \d,\d\d V/);
    assert.ok(svg.lists[".lc-flow"].length === 3 && svg.lists[".lc-flow"].every(flow => "stroke-dashoffset" in flow.attributes && flow.style.opacity === "1"));
    assert.equal(svg.querySelector(".lc-slow").textContent, "");

    // 500 Hz: 5000 Rechenschritte je Bild zu 50 ms. Die Fläche rechnet, solange ihre Rechenzeit je Bild reicht.
    // Die Uhr ist hier nachgestellt: ein langsames Gerät (jeder Blick auf die Uhr kostet 4 ms) und ein schnelles.
    const ac500 = {
      parts: [{ type: "acsource", x: 3, y: 4, rot: 3, value: 6, freq: 500 }, { type: "resistor", x: 7, y: 2, value: 100 }],
      wires: [[3, 5, 3, 6, 11, 6, 11, 2, 8, 2], [6, 2, 3, 2, 3, 3]]
    };
    const realNow = performance.now;
    try {
      let clock = 0;
      performance.now = () => (clock += 4);
      const slowDevice = placeholder();
      slowDevice.id = "test-slow-device";
      const lagging = play(slowDevice, ac500, 11);
      near(lagging.run.t, 10 * 100 * 1e-5);                          // je Bild nur zwei Stücke zu 50 Schritten
      assert.equal(slowDevice.querySelector(".lc-svg").querySelector(".lc-slow").textContent, "Zeitlupe");
      performance.now = () => 0;
      const fastDevice = placeholder();
      fastDevice.id = "test-fast-device";
      const realtime = play(fastDevice, ac500, 11);
      near(realtime.run.t, 0.5, 1e-3);                                // zehn Bilder zu 50 ms: Echtzeit
      assert.equal(fastDevice.querySelector(".lc-svg").querySelector(".lc-slow").textContent, "");
    } finally {
      performance.now = realNow;
    }

    // ohne Zeitverlauf läuft nur die Bewegung der Punkte
    const steady = placeholder();
    steady.id = "test-steady";
    const fixed = play(steady, loop(true), 5);
    assert.equal(fixed.run, null);
    assert.ok(steady.querySelector(".lc-svg").lists[".lc-flow"].every(flow => "stroke-dashoffset" in flow.attributes));

    // der Motor dreht sich: 1,5 Umdrehungen je Sekunde bei Nennspannung, also 108° in vier Bildern zu 50 ms
    const turning = placeholder();
    turning.id = "test-motor";
    const spun = play(turning, { ...loop(true), parts: [loop(true).parts[0], loop(true).parts[1], { type: "motor", x: 10, y: 2 }] }, 5);
    near(spun.circuit.parts[2]._a, 360 * 1.5 * 0.2, 1e-2);
    const rotor = turning.querySelector(".lc-svg").lists[".lc-part"][2].parts[".lc-rotor"];
    assert.match(rotor.attributes.transform, /^rotate\(1\d\d\.\d\)$/);
  } finally {
    delete globalThis.requestAnimationFrame;
    delete globalThis.cancelAnimationFrame;
  }
});

// ---------------------------------------------------------------- Paket A: Aufgaben im Unterricht
// (Rückmeldung vom 14.11.2026 im Steckbrief: A 1 bis A 6)

// Batterie 4,5 V und zwei Lampen: in Reihe oder parallel
const twoLamps = parallel => parallel
  ? {
    parts: [{ type: "battery", x: 3, y: 4, rot: 1 }, { type: "lamp", x: 8, y: 2 }, { type: "lamp", x: 8, y: 4 }],
    wires: [[3, 3, 3, 2, 7, 2], [6, 2, 6, 4, 7, 4], [9, 2, 11, 2, 11, 6, 3, 6, 3, 5], [9, 4, 11, 4]]
  }
  : {
    parts: [{ type: "battery", x: 3, y: 4, rot: 1 }, { type: "lamp", x: 6, y: 2 }, { type: "lamp", x: 10, y: 2 }],
    wires: [[3, 3, 3, 2, 5, 2], [7, 2, 9, 2], [11, 2, 11, 6, 3, 6, 3, 5]]
  };

// 9-V-Block, drei Lampen für je 3 V in Reihe (die mittlere defekt), Multimeter an der ersten Lampe
const hunt = () => ({
  lock: true,
  task: { text: "Eine Lampe ist defekt.", goals: [{ type: "lamp", count: "all", is: "bright" }] },
  parts: [
    { type: "battery", x: 2, y: 4, rot: 1, value: 9 },
    { type: "lamp", x: 5, y: 2, value: 10, power: 0.9 },
    { type: "lamp", x: 8, y: 2, value: 10, power: 0.9, fault: true },
    { type: "lamp", x: 11, y: 2, value: 10, power: 0.9 },
    { type: "multimeter", x: 7, y: 5, mode: "V", a: [4, 2], b: [6, 2] }
  ],
  wires: [[2, 3, 2, 2, 4, 2], [6, 2, 7, 2], [9, 2, 10, 2], [12, 2, 12, 6, 2, 6, 2, 5]]
});

// Zeiger und Knöpfe für die Arbeitsfläche im Platzhalter; hit nennt, was unter dem Zeiger liegt, z. B. { "data-part": "1" }
const hands = el => {
  const svg = el.querySelector(".lc-svg"), panel = el.querySelector(".lc-panel");
  const pointer = (type, x, y, hit = {}) => {
    const target = { closest: selector => (selector.slice(1, -1) in hit ? { getAttribute: () => hit[selector.slice(1, -1)] } : null) };
    for (const listener of svg.listeners[type]) listener({ button: 0, pointerId: 1, clientX: x * 40, clientY: y * 40, target, preventDefault() {} });
  };
  return {
    drag(hit, from, to) { pointer("pointerdown", from[0], from[1], hit); pointer("pointermove", to[0], to[1]); pointer("pointerup", to[0], to[1]); },
    press(attributes) {
      const button = placeholder();
      Object.assign(button.attributes, attributes);
      for (const listener of el.listeners.click) listener({ target: button, detail: 1 });
    },
    key(key) { for (const listener of svg.listeners.keydown) listener({ key, preventDefault() {} }); },
    set(control, value) {
      const input = placeholder();
      input.attributes["data-ctl"] = String(control);
      input.value = value;
      for (const listener of panel.listeners.input) listener({ target: input });
    }
  };
};

test("Paket A 1: Aufgabe mit Selbstkontrolle – zwei Lampen in Reihe lösen sie nicht, parallel schon; bei Kurzschluss gilt nichts als gelöst", async () => {
  const task = { text: "Beide Lampen sollen hell leuchten.", goals: [{ type: "lamp", count: 2, is: "bright" }] };
  const series = LC.normalize({ task, ...twoLamps(false) });
  assert.deepEqual(LC.checkTask(series, LC.simulate(series)), { goals: [false], done: false });
  const parallel = LC.normalize({ task, ...twoLamps(true) });
  assert.deepEqual(LC.checkTask(parallel, LC.simulate(parallel)), { goals: [true], done: true });
  assert.equal(LC.checkTask(LC.normalize(twoLamps(true)), LC.simulate(parallel)), null);          // ohne Aufgabe nichts zu prüfen

  // "leuchtet" gilt auch für schwaches Licht, "alle" verlangt jede Lampe
  const any = goals => LC.checkTask(LC.normalize({ task: { text: "", goals }, ...twoLamps(false) }), LC.simulate(series)).goals;
  assert.deepEqual(any([{ type: "lamp", count: "all", is: "on" }, { type: "lamp", count: "all", is: "bright" }, { type: "lamp", is: "off" }]), [true, false, false]);

  // Kurzschluss: die Lampen sind aus – das Ziel "aus" wäre erfüllt, gelöst ist trotzdem nichts
  const shorted = LC.normalize({ task: { text: "", goals: [{ type: "lamp", count: 2, is: "off" }] }, ...twoLamps(false) });
  shorted.wires.push([3, 3, 2, 3, 2, 5, 3, 5]);
  assert.deepEqual(LC.checkTask(shorted, LC.simulate(shorted)), { goals: [true], done: false });

  // ein Messwert als Ziel: 9 V an 100 Ω sind 90 mA; es zählt der Betrag
  const measured = ohms => {
    const circuit = LC.normalize({
      task: { text: "", goals: [{ measure: "A", min: 0.085, max: 0.095 }, { measure: "V", min: 1 }] },
      parts: [{ type: "battery", x: 3, y: 4, rot: 3, value: 9 }, { type: "resistor", x: 7, y: 2, value: ohms }, { type: "multimeter", x: 7, y: 6, mode: "A" }],
      wires: [[3, 5, 3, 6, 6, 6], [8, 6, 11, 6, 11, 2, 8, 2], [6, 2, 3, 2, 3, 3]]
    });
    return LC.checkTask(circuit, LC.simulate(circuit)).goals;
  };
  assert.deepEqual(measured(100), [true, false]);                 // kein Spannungsmesser in der Schaltung
  assert.deepEqual(measured(200), [false, false]);

  // die Ziele in Worten, die Beschreibung hin und zurück, Fehler werden benannt
  assert.equal(LC.goalText({ type: "lamp", count: 2, is: "bright" }, "de"), "2 × Lampe – leuchtet hell");
  assert.equal(LC.goalText({ type: "motor", count: "all", is: "on" }, "de"), "Motor (alle) – dreht sich");
  assert.equal(LC.goalText({ measure: "A", min: 0.059, max: 0.061 }, "de"), "Messwert: von 59 mA bis 61 mA");
  assert.equal(LC.goalText({ measure: "V", min: 4 }, "en"), "Reading: at least 4 V");
  assert.deepEqual(LC.normalize(LC.serialize(series)), series);
  assert.deepEqual(LC.normalize({ task: "Nur ein Text" }).task, { text: "Nur ein Text", goals: [] });
  assert.throws(() => LC.normalize({ task: { goals: [{ type: "lamp", is: "glows" }] } }), error => error.code === "task");
  assert.throws(() => LC.normalize({ task: { goals: [{ measure: "A" }] } }), error => error.code === "task");
  assert.throws(() => LC.normalize({ task: { goals: [{ type: "flux-capacitor", is: "on" }] } }), error => error.code === "part");

  // auf der Fläche: Aufgabe und Ziel stehen da; "Geschafft!" erscheint erst nach dem Umbau und bleibt dann stehen
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  await import("./circuits-ui.js");
  const el = placeholder();
  el.id = "test-task";
  LC.mount(el, { task: { ...task, goals: [{ ...task.goals[0], label: "Zwei Lampen leuchten hell" }] }, ...twoLamps(false) });
  const state = LC.store[el.id], done = el.querySelector(".lc-done"), goals = el.querySelector(".lc-goals");
  assert.equal(el.querySelector(".lc-task").hidden, false);
  assert.equal(el.querySelector(".lc-task-text").textContent, "Aufgabe: Beide Lampen sollen hell leuchten.");
  assert.match(goals.innerHTML, /class="lc-goal"><span class="lc-tick" aria-hidden="true">○<\/span> Zwei Lampen leuchten hell/);
  assert.equal(done.textContent, "");
  Object.assign(state.circuit, LC.normalize(twoLamps(true)), { task: state.circuit.task });       // umgebaut: jetzt parallel
  hands(el).press({ "data-view": "symbol" });                     // zeichnet neu
  assert.match(goals.innerHTML, /class="lc-goal lc-met"><span class="lc-tick" aria-hidden="true">✔<\/span>/);
  assert.equal(done.textContent, "Geschafft!");
  state.circuit.wires.length = 0;                                 // wieder kaputt gebaut: das Häkchen geht, "Geschafft!" bleibt
  hands(el).press({ "data-view": "picture" });
  assert.match(goals.innerHTML, /class="lc-goal">/);
  assert.equal(done.textContent, "Geschafft!");
  hands(el).press({ "data-act": "reset" });                       // Zurücksetzen: die Aufgabe beginnt von vorn
  assert.equal(done.textContent, "");
  const plain = placeholder();
  plain.id = "test-no-task";
  LC.mount(plain, loop(true));
  assert.equal(plain.querySelector(".lc-task").hidden, true);
});

test("Paket A 2 und 3: die Leiste bietet nur die genannten Teile an; gesperrt lässt sich schalten und messen, aber nichts umbauen", async () => {
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  globalThis.DOMPoint = class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return this; } };   // Fenster = Zeichnung
  await import("./circuits-ui.js");
  try {
    // A 2: Batterie, Schalter und Lampe in der Leiste – Leitungen zieht man von den Anschlusspunkten
    const limited = placeholder();
    limited.id = "test-palette";
    LC.mount(limited, { palette: ["battery", "switch", "lamp"], ...loop(false) });
    const offered = html => [...html.matchAll(/data-add="([\w-]+)"/g)].map(match => match[1]);
    assert.deepEqual(offered(limited.querySelector(".lc-palette").innerHTML), ["battery", "switch", "lamp"]);
    assert.equal(limited.querySelector(".lc-bar").hidden, false);       // vorgegebene Teile: die Leiste ist offen
    assert.equal(limited.querySelector(".lc-tabs").hidden, true);       // drei Teile brauchen keine Fächer
    assert.match(limited.querySelector(".lc-svg").innerHTML, /data-term="5,2"/);
    assert.deepEqual(LC.normalize(LC.serialize(LC.store[limited.id].circuit)).palette, ["battery", "switch", "lamp"]);
    assert.throws(() => LC.normalize({ palette: ["flux-capacitor"] }), error => error.code === "part");

    // A 3: gesperrt
    const description = { lock: true, ...loop(false) };
    description.parts.push({ type: "multimeter", x: 7, y: 5, mode: "V" });
    const el = placeholder();
    el.id = "test-lock";
    LC.mount(el, description);
    const state = LC.store[el.id], panel = el.querySelector(".lc-panel"), use = hands(el);
    const layout = () => JSON.stringify([state.circuit.parts.map(part => [part.type, part.x, part.y, part.rot]), state.circuit.wires]);
    const built = layout();
    assert.equal(el.querySelector(".lc-bar").hidden, true);
    assert.equal(el.querySelector('[data-act="parts"]').hidden, true);
    assert.equal(el.querySelector(".lc-palette").innerHTML, "");
    assert.match(panel.innerHTML, /fest aufgebaut/);

    use.drag({ "data-part": "1" }, [6, 2], [6, 2]);                 // Schalter antippen: er schließt
    assert.equal(state.circuit.parts[1].closed, true);
    use.drag({ "data-probe": "3:0" }, [6, 5], [9, 2]);              // Klemmen an die Lampe setzen: es wird gemessen
    use.drag({ "data-probe": "3:1" }, [8, 5], [11, 2]);
    near(state.result.parts[3].reading, 4.5, 1e-3);
    state.selected = { part: 3 };
    for (const listener of panel.listeners.change) {                // Messgröße wählen
      const select = placeholder();
      select.attributes["data-ctl"] = "0";
      select.value = "R";
      listener({ target: select });
    }
    assert.equal(state.circuit.parts[3].mode, "R");
    use.key("Enter");                                               // nichts gewählt außer dem Multimeter: Eingabe schaltet nichts um
    state.selected = { part: 1 };
    use.key("Enter");                                               // Tastatur: Eingabe öffnet den Schalter
    assert.equal(state.circuit.parts[1].closed, false);

    const fixed = (() => { state.circuit.parts[3].a = null; state.circuit.parts[3].b = null; return layout(); })();
    assert.equal(fixed, built);                                     // bis hierher ist nichts umgebaut
    use.drag({ "data-part": "2" }, [10, 2], [10, 4]);               // Lampe ziehen
    use.drag({ "data-term": "5,2" }, [5, 2], [5, 5]);               // Leitung legen
    use.drag({ "data-wire": "0" }, [3, 2], [3, 2]);                 // Leitung antippen
    assert.equal(state.selected, null);
    state.selected = { part: 2 };
    for (const key of ["Delete", "ArrowRight", "r"]) use.key(key);  // Tastatur: entfernen, schieben, drehen
    for (const act of ["remove", "turn", "swap"]) use.press({ "data-act": act });
    use.press({ "data-add": "lamp" });
    state.selected = { part: 0 };
    use.set(1, "9");                                                // Zahlenwert: die Spannung der Batterie
    assert.equal(state.circuit.parts[0].value, 4.5);
    assert.equal(layout(), built);
    assert.doesNotMatch(panel.innerHTML, /data-act="(remove|turn|swap)"|type="number"/);
    state.selected = { part: 1 };
    use.press({ "data-view": "picture" });
    assert.match(panel.innerHTML, /data-act="tap"/);                // der Schalter behält seinen Knopf

    // A 6: eine Berührung auf Fläche oder Leiste wandert nicht weiter (sonst wechselte Wischen die Folie)
    let stopped = 0;
    const touch = inside => {
      for (const listener of el.listeners.touchmove) listener({ target: { closest: () => (inside ? {} : null) }, stopPropagation() { stopped++; } });
    };
    touch(true); touch(false);
    assert.equal(stopped, 1);
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "circuits.css"), "utf8");
    assert.match(css, /\.lc-svg \{[^}]*touch-action: none/);
    assert.match(css, /\.lc-pal \{[^}]*touch-action: pan-x/);           // die Zeile wischt waagerecht, nach unten zieht das Teil
  } finally {
    delete globalThis.DOMPoint;
  }
});

test("Paket A 4: Fehlersuche – drei Lampen in Reihe bleiben dunkel, das Multimeter findet die defekte, nach dem Ersetzen leuchten alle", async () => {
  const circuit = LC.normalize(hunt());
  let result = LC.simulate(circuit);
  assert.ok([1, 2, 3].every(k => LC.doing(circuit.parts[k], result.parts[k]).off));
  assert.ok(Math.abs(result.parts[4].reading) < 1e-3);             // an der ersten Lampe liegt keine Spannung
  Object.assign(circuit.parts[4], { a: [7, 2], b: [9, 2] });
  result = LC.simulate(circuit);
  near(result.parts[4].reading, 9, 1e-3);                          // an der defekten liegt die ganze
  assert.deepEqual(LC.checkTask(circuit, result), { goals: [false], done: false });

  // man sieht es ihr nicht an: gezeichnet und benannt wie eine heile Lampe, die nicht leuchtet
  const intact = { ...circuit.parts[2] };
  delete intact.fault;
  for (const view of ["picture", "symbol"]) {
    const ctx = { view, rot: 0, uid: "t", lang: "de" };
    assert.equal(LC.parts.lamp.draw(circuit.parts[2], result.parts[2], ctx), LC.parts.lamp.draw(intact, { brightness: 0 }, ctx));
  }
  assert.equal(LC.parts.lamp.state(circuit.parts[2], result.parts[2], "de"), "leuchtet nicht");
  assert.equal(LC.parts.lamp.caption(circuit.parts[2], "de"), "3 V");
  assert.match(LC.serialize(circuit), /"power":0.9,"blown":false,"fault":true/);
  assert.deepEqual(LC.normalize(LC.serialize(circuit)), circuit);

  // eine leere Batterie: keine Spannung, kein Strom, kein Kurzschluss
  const empty = LC.normalize({ ...loop(true), parts: [{ ...loop(true).parts[0], fault: true }, ...loop(true).parts.slice(1)] });
  const dead = LC.simulate(empty);
  assert.equal(dead.parts[0].v[0] - dead.parts[0].v[1], 0);
  assert.equal(dead.parts[2].brightness, 0);
  assert.deepEqual(dead.warnings, []);

  // auf der Fläche: "Ersetzen" sagt, ob das alte Bauteil defekt war; der Text zum Kopieren fehlt
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  await import("./circuits-ui.js");
  const el = placeholder();
  el.id = "test-hunt";
  LC.mount(el, hunt());
  const state = LC.store[el.id], status = el.querySelector(".lc-status"), use = hands(el);
  assert.equal(el.querySelector('[data-act="copy"]').hidden, true);
  use.press({ "data-act": "copy" });
  assert.equal(state.copyText, null);
  state.selected = { part: 1 };
  use.press({ "data-view": "picture" });
  assert.match(el.querySelector(".lc-panel").innerHTML, /data-act="swap"/);      // auch gesperrt lässt sich hier ersetzen
  use.press({ "data-act": "swap" });
  assert.match(status.textContent, /war in Ordnung/);
  assert.equal(el.querySelector(".lc-done").textContent, "");
  state.selected = { part: 2 };
  use.press({ "data-act": "swap" });
  assert.match(status.textContent, /war defekt/);
  assert.equal(state.circuit.parts[2].fault, undefined);
  assert.ok([1, 2, 3].every(k => state.result.parts[k].brightness > 0.95));
  assert.equal(el.querySelector(".lc-done").textContent, "Geschafft!");
  use.press({ "data-act": "undo" });                               // zurückgenommen ist die Lampe wieder defekt
  assert.equal(state.circuit.parts[2].fault, true);
  const open = placeholder();                                      // ohne versteckten Defekt bleibt der Knopf zum Kopieren
  open.id = "test-no-hunt";
  LC.mount(open, loop(true));
  assert.equal(open.querySelector('[data-act="copy"]').hidden, false);
});

test("Paket A 5: Messwerttabelle – drei Stellungen des Schiebewiderstands ergeben drei Zeilen mit Spannung und Stromstärke", async () => {
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  await import("./circuits-ui.js");
  const el = placeholder();
  el.id = "test-table";
  LC.mount(el, {
    lock: true, table: true,
    parts: [
      { type: "battery", x: 2, y: 4, rot: 1, value: 9 },
      { type: "potentiometer", x: 5, y: 2, value: 100, pos: 0 },
      { type: "resistor", x: 8, y: 3, value: 100 },
      { type: "multimeter", x: 8, y: 5, mode: "V", a: [7, 3], b: [9, 3] },
      { type: "multimeter", x: 11, y: 3, mode: "A" }
    ],
    wires: [[2, 3, 2, 2, 4, 2], [5, 3, 7, 3], [9, 3, 10, 3], [12, 3, 12, 7, 2, 7, 2, 5]]
  });
  const state = LC.store[el.id], log = el.querySelector(".lc-log"), use = hands(el);
  assert.equal(log.hidden, false);
  assert.match(log.innerHTML, /data-act="note"/);
  assert.doesNotMatch(log.innerHTML, /<table/);
  state.selected = { part: 1 };
  for (const position of ["0", "0.5", "1"]) {
    use.set(1, position);                                           // der Schieber – auch gesperrt bedienbar
    use.press({ "data-act": "note" });
  }
  assert.deepEqual(state.rows, [["9,00 V", "90,0 mA"], ["6,00 V", "60,0 mA"], ["4,50 V", "45,0 mA"]]);
  assert.match(log.innerHTML, /<th scope="col">Nr\.<\/th><th scope="col">Multimeter 1 \(V\)<\/th><th scope="col">Multimeter 2 \(A\)<\/th>/);
  assert.match(log.innerHTML, /<tr><td>3<\/td><td>4,50 V<\/td><td>45,0 mA<\/td><\/tr>/);
  assert.equal((log.innerHTML.match(/<tr>/g) || []).length, 4);     // Kopfzeile und drei Messungen
  use.press({ "data-act": "reset" });                               // die Messreihe bleibt beim Zurücksetzen stehen
  assert.equal(state.rows.length, 3);
  use.press({ "data-act": "clear" });
  assert.deepEqual(state.rows, []);
  assert.doesNotMatch(log.innerHTML, /<table/);

  const bare = placeholder();                                       // ohne Messgerät gibt es nichts zu notieren
  bare.id = "test-table-bare";
  LC.mount(bare, { table: true, ...loop(true) });
  hands(bare).press({ "data-act": "note" });
  assert.deepEqual(LC.store[bare.id].rows, []);
  assert.match(bare.querySelector(".lc-status").textContent, /kein Messgerät/);
  const none = placeholder();
  none.id = "test-no-table";
  LC.mount(none, loop(true));
  assert.equal(none.querySelector(".lc-log").hidden, true);
});

test("Paket A 6: Bedienung mit dem Finger – größere Greifflächen, ein zweiter Finger stört das Ziehen nicht, Wischen auf der Leiste legt nichts ab, langes Drücken öffnet kein Menü", async () => {
  // Ob echte Berührungen ankommen und die Folie stehen bleibt, zeigt der Versuch im Browser (nachgestellte
  // Berührung über das DevTools-Protokoll) und auf dem Tablet. Hier: die Regeln der Arbeitsfläche dafür.
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  globalThis.DOMPoint = class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return this; } };
  globalThis.matchMedia = query => ({ matches: query === "(pointer: coarse)" });           // ein Tablet
  await import("./circuits-ui.js");
  try {
    const el = placeholder();
    el.id = "test-touch";
    LC.mount(el, loop(false));
    const state = LC.store[el.id], svg = el.querySelector(".lc-svg"), palette = el.querySelector(".lc-palette");
    assert.match(svg.innerHTML, /class="lc-grab" cx="200" cy="80" r="18" data-term="5,2"/);  // mit der Maus 13
    const finger = (type, id, x, y, hit = {}) => {
      const target = { closest: selector => (selector.slice(1, -1) in hit ? { getAttribute: () => hit[selector.slice(1, -1)] } : null) };
      for (const listener of svg.listeners[type]) listener({ button: 0, pointerId: id, isPrimary: id === 1, clientX: x * 40, clientY: y * 40, target, preventDefault() {} });
    };
    finger("pointerdown", 1, 10, 2, { "data-part": "2" });           // Finger 1 fasst die Lampe
    finger("pointerdown", 2, 12, 6);                                 // Finger 2 tippt daneben
    finger("pointermove", 2, 13, 7);
    finger("pointermove", 1, 10, 4);
    finger("pointerup", 2, 13, 7);                                   // Finger 2 hebt ab: das Ziehen läuft weiter
    finger("pointermove", 1, 10, 5);
    finger("pointerup", 1, 10, 5);
    assert.deepEqual([state.circuit.parts[2].x, state.circuit.parts[2].y], [10, 5]);
    assert.deepEqual(state.selected, { part: 2 });
    assert.equal(state.history.length, 1);                           // ein Schritt

    // Leiste: wischen, ohne die Fläche zu erreichen, legt nichts ab; antippen schon
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: 560, bottom: 320 });
    const lamp = { getAttribute: () => "lamp", setPointerCapture() {} };
    const onPalette = (type, x, y) => { for (const listener of palette.listeners[type]) listener({ button: 0, pointerId: 3, clientX: x, clientY: y, target: { closest: () => lamp } }); };
    const count = state.circuit.parts.length;
    onPalette("pointerdown", 300, 400); onPalette("pointermove", 200, 400); onPalette("pointermove", 100, 400); onPalette("pointerup", 100, 400);
    assert.equal(state.circuit.parts.length, count);
    onPalette("pointerdown", 300, 400); onPalette("pointerup", 302, 401);
    assert.equal(state.circuit.parts.length, count + 1);

    // ein verlorenes Loslassen (Strg+Z beim Ziehen aus der Leiste zeichnet den Knopf neu) friert nichts ein
    onPalette("pointerdown", 300, 400); onPalette("pointermove", 100, 400);   // das Loslassen kommt nie an
    finger("pointerdown", 1, 6, 2, { "data-part": "1" }); finger("pointerup", 1, 6, 2);
    assert.equal(state.circuit.parts[1].closed, true);              // der Schalter lässt sich trotzdem antippen

    // langes Drücken: kein Kontextmenü (es bräche den Druck auf den Taster ab)
    let prevented = 0;
    for (const node of [svg, palette]) for (const listener of node.listeners.contextmenu) listener({ preventDefault() { prevented++; } });
    assert.equal(prevented, 2);
  } finally {
    delete globalThis.DOMPoint;
    delete globalThis.matchMedia;
  }
});

test("Zoomen und Verschieben: Knöpfe, freie Fläche ziehen, zwei Finger, Strg+Mausrad – nur die Ansicht, kein Schritt zum Zurücknehmen", async () => {
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  globalThis.DOMPoint = class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return this; } };
  await import("./circuits-ui.js");
  try {
    const el = placeholder();
    el.id = "test-zoom";
    LC.mount(el, { size: [14, 8], ...loop(false) });
    const state = LC.store[el.id], svg = el.querySelector(".lc-svg");
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, right: 560, bottom: 320, width: 560 });   // 1 Bildschirmpixel = 1 Pixel der Fläche
    const box = () => svg.getAttribute("viewBox").split(" ").map(Number);
    const press = attributes => {
      const button = placeholder();
      Object.assign(button.attributes, attributes);
      for (const listener of el.listeners.click) listener({ target: button, detail: 1 });
    };
    const finger = (type, id, x, y) => {
      for (const listener of svg.listeners[type]) listener({ button: 0, pointerId: id, isPrimary: id === 1, clientX: x, clientY: y, target: { closest: () => null }, preventDefault() {} });
    };
    assert.deepEqual(box(), [0, 0, 560, 320]);
    assert.equal(el.querySelector('[data-act="zoomout"]').disabled, true);
    assert.equal(el.querySelector('[data-act="fit"]').hidden, true);

    press({ "data-act": "zoomin" });                                   // um die Mitte vergrößert
    assert.deepEqual(box().map(Math.round), [93, 53, 373, 213]);
    assert.equal(el.querySelector('[data-act="fit"]').hidden, false);

    finger("pointerdown", 1, 300, 200); finger("pointermove", 1, 200, 150); finger("pointerup", 1, 200, 150);
    const k = 1 / 1.5;                                                 // 1 Bildschirmpixel = 1/1,5 Pixel der Fläche
    assert.deepEqual(box().map(Math.round), [Math.round(560 / 6 + 100 * k), Math.round(320 / 6 + 50 * k), 373, 213]);
    finger("pointerdown", 1, 0, 0); finger("pointermove", 1, 5000, 5000); finger("pointerup", 1, 5000, 5000);
    assert.deepEqual(box().slice(0, 2), [0, 0]);                      // nicht über den Rand hinaus

    for (let i = 0; i < 10; i++) press({ "data-act": "zoomin" });
    assert.equal(state.cam.s, 4);                                      // höchstens vierfach
    assert.equal(el.querySelector('[data-act="zoomin"]').disabled, true);
    press({ "data-act": "fit" });
    assert.deepEqual(box(), [0, 0, 560, 320]);

    finger("pointerdown", 1, 200, 160); finger("pointerdown", 2, 300, 160);   // zwei Finger auf freier Fläche
    finger("pointermove", 2, 400, 160);                                // doppelter Abstand: doppelt so groß
    assert.equal(state.cam.s, 2);
    finger("pointerup", 2, 400, 160); finger("pointerup", 1, 200, 160);

    let prevented = false;
    const wheel = (deltaY, ctrlKey) => { for (const listener of svg.listeners.wheel) listener({ deltaY, ctrlKey, clientX: 280, clientY: 160, preventDefault() { prevented = true; } }); };
    wheel(-100, false);
    assert.equal(prevented, false);                                    // ohne Strg scrollt die Seite
    assert.equal(state.cam.s, 2);
    wheel(-100, true);
    assert.equal(prevented, true);
    assert.ok(state.cam.s > 2);

    assert.equal(state.history.length, 0);                             // Ansicht ist kein Schritt zum Zurücknehmen
    assert.doesNotMatch(LC.serialize(state.circuit), /cam/);
  } finally {
    delete globalThis.DOMPoint;
  }
});

test("Aufgeräumte Bedienung: Leiste mit Fächern, die man aufklappt; Seltenes im Menü; Aufgabe und Messwerte als Reiter; Feld am Bauteil", async () => {
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  await import("./circuits-ui.js");
  const press = (el, attributes) => {
    const button = placeholder();
    Object.assign(button.attributes, attributes);
    for (const listener of el.listeners.click) listener({ target: button, detail: 1 });
  };
  const visible = html => [...html.matchAll(/data-add="([\w-]+)" title="[^"]*">/g)].map(match => match[1]);   // ohne hidden

  const el = placeholder();
  el.id = "test-shelf";
  LC.mount(el, loop(false));
  const state = LC.store[el.id], bar = el.querySelector(".lc-bar"), tabs = el.querySelector(".lc-tabs"), palette = el.querySelector(".lc-palette");
  assert.equal(bar.hidden, true);                                    // eine Schaltung steht schon da: die Leiste ist zu
  press(el, { "data-act": "parts" });
  assert.equal(bar.hidden, false);
  assert.equal((tabs.innerHTML.match(/role="tab"/g) || []).length, 5);
  assert.match(tabs.innerHTML, /data-group="grpSources" aria-selected="true">Quellen<span class="lc-n">6/);
  assert.deepEqual(visible(palette.innerHTML), ["battery", "source", "acsource", "siggen", "solar", "dynamo"]);
  assert.equal((palette.innerHTML.match(/class="lc-pal"/g) || []).length, 30);   // alle da, nur ein Fach sichtbar
  press(el, { "data-act": "group", "data-group": "grpMeters" });
  assert.deepEqual(visible(palette.innerHTML), ["multimeter", "voltmeter", "ammeter", "wattmeter", "scope"]);
  press(el, { "data-act": "parts" });
  assert.equal(bar.hidden, true);

  const empty = placeholder();                                       // leere Fläche: die Leiste ist gleich offen
  empty.id = "test-shelf-empty";
  LC.mount(empty, {});
  assert.equal(empty.querySelector(".lc-bar").hidden, false);

  const menu = el.querySelector(".lc-menu");
  assert.equal(menu.hidden, true);
  press(el, { "data-act": "more" });
  assert.equal(menu.hidden, false);
  press(el, { "data-act": "reset" });                                // eine Wahl im Menü schließt es
  assert.equal(menu.hidden, true);

  const panel = el.querySelector(".lc-panel");
  state.selected = { part: 2 };                                      // die Lampe: rechts auf der Fläche, das Feld kommt links
  press(el, { "data-act": "group", "data-group": "grpSources" });    // irgendein Neuzeichnen
  press(el, { "data-act": "deselect" });
  assert.equal(state.selected, null);
  assert.doesNotMatch(panel.innerHTML, /data-act="deselect"/);       // ohne Auswahl nur der Hinweis

  const both = placeholder();
  both.id = "test-panes";
  LC.mount(both, { task: { text: "Lampe an", goals: [{ type: "lamp", count: 1, is: "on" }] }, table: true, ...loop(true) });
  const panes = both.querySelector(".lc-panes"), task = both.querySelector(".lc-task"), log = both.querySelector(".lc-log");
  assert.equal(panes.hidden, false);
  assert.deepEqual([task.hidden, log.hidden], [false, true]);
  press(both, { "data-act": "pane", "data-pane": "log" });
  assert.deepEqual([task.hidden, log.hidden], [true, false]);
  const one = placeholder();                                         // nur eine Aufgabe: keine Reiter
  one.id = "test-panes-one";
  LC.mount(one, { task: { text: "Lampe an", goals: [{ type: "lamp", count: 1, is: "on" }] }, ...loop(true) });
  assert.equal(one.querySelector(".lc-panes").hidden, true);
  assert.equal(one.querySelector(".lc-task").hidden, false);
});

// ---------------------------------------------------------------- Paket B: neue Bauteile
// (Rückmeldung vom 14.11.2026 im Steckbrief: B 7 bis B 12)

// Quelle links (Pluspol oben), ein Bauteil oben rechts – derselbe Kreis wie in den Beispielen der Seite
const pair = (source, load) => LC.normalize({
  parts: [{ x: 3, y: 4, rot: 1, ...source }, { x: 8, y: 2, ...load }],
  wires: [[3, 3, 3, 2, 7, 2], [9, 2, 11, 2, 11, 6, 3, 6, 3, 5]]
});

test("Paket B 7: Solarzelle – im Dunkeln 0 V, die Leuchtdiode bleibt aus; bei vollem Licht leuchtet sie", () => {
  const lit = light => { const circuit = pair({ type: "solar", light }, { type: "led" }); return { circuit, result: LC.simulate(circuit) }; };
  const dark = lit(0), full = lit(1), half = lit(0.5);
  assert.equal(dark.result.parts[0].v[0] - dark.result.parts[0].v[1], 0);
  assert.equal(LC.parts.led.state(dark.circuit.parts[1], dark.result.parts[1], "de"), "leuchtet nicht");
  near(full.result.parts[0].v[0] - full.result.parts[0].v[1], 1.801, 1e-3); // unter Last: 1,8 V der Leuchtdiode und 0,05 Ω · 20 mA
  near(full.result.parts[1].brightness, 1, 2e-3);                          // 20 mA: volle Helligkeit, ohne Vorwiderstand nicht zerstört
  assert.equal(LC.parts.led.state(full.circuit.parts[1], full.result.parts[1], "de"), "leuchtet");
  near(half.result.parts[1].brightness, 0.477, 1e-2);                      // halbes Licht: etwa halber Strom (9,5 mA)
  assert.deepEqual(full.result.warnings, []);
  const open = LC.normalize({ parts: [{ type: "solar", x: 6, y: 3, light: 0.1 }, { type: "voltmeter", x: 6, y: 6 }], wires: [[5, 3, 5, 6], [7, 3, 7, 6]] });
  near(LC.simulate(open).parts[1].reading, 2.7, 1e-3);                     // ein Zehntel des Lichts: 10 % weniger Leerlaufspannung
  open.parts[0].light = 1;
  near(LC.simulate(open).parts[1].reading, 3, 1e-3);                       // volles Licht, ohne Last: 3 V
  assert.equal(LC.parts.solar.caption(LC.normalize({ parts: [{ type: "solar", x: 3, y: 3, light: 0 }] }).parts[0], "de"), "0 V");
});

test("Paket B 8: Handgenerator – die Lampe leuchtet nur beim Kurbeln, bei schnellerem Tempo heller", () => {
  const glow = (crank, pace) => { const circuit = pair({ type: "dynamo", crank, pace }, { type: "lamp" }); return LC.simulate(circuit).parts[1].brightness; };
  assert.equal(glow(false, 1), 0);
  assert.ok(glow(true, 0.5) > 0.05 && glow(true, 0.5) < 0.5, `${glow(true, 0.5)}`);
  near(glow(true, 1), 1, 1e-3);                                            // 6 V, 5 Ω Wicklung: 4,5 V an der Lampe
  assert.ok(glow(true, 0.25) < glow(true, 0.5) && glow(true, 0.5) < glow(true, 0.75) && glow(true, 0.75) < glow(true, 1));
  const part = LC.normalize({ parts: [{ type: "dynamo", x: 3, y: 3 }] }).parts[0];
  LC.parts.dynamo.tap(part);                                               // antippen: kurbeln
  assert.equal(part.crank, true);
  const result = LC.simulate(pair({ type: "dynamo", crank: true }, { type: "lamp" }));
  near(result.parts[0].speed, 2);                                          // die Kurbel dreht sich in der Zeichnung
  assert.equal(LC.doing(part, result.parts[0]).on, true);
  assert.equal(LC.goalText({ type: "dynamo", count: 1, is: "on" }, "de"), "1 × Handgenerator – wird gekurbelt");
});

// Relais: Taster und Spule links (6 V), Kontakt, Lampe und Batterie (4,5 V) rechts; das Multimeter misst den
// Widerstand zwischen einem Anschluss der Spule und einem des Kontakts
const relayCircuit = () => LC.normalize({
  parts: [
    { type: "battery", x: 2, y: 4, rot: 1, value: 6 }, { type: "button", x: 4, y: 2 }, { type: "relay", x: 7, y: 4 },
    { type: "lamp", x: 11, y: 2 }, { type: "battery", x: 13, y: 4, rot: 1, value: 4.5 },
    { type: "multimeter", x: 7, y: 9, mode: "R", a: [6, 3], b: [8, 3] }
  ],
  wires: [[2, 3, 2, 2, 3, 2], [5, 2, 6, 2, 6, 3], [6, 5, 6, 6, 2, 6, 2, 5], [8, 3, 8, 2, 10, 2], [12, 2, 13, 2, 13, 3], [13, 5, 13, 6, 8, 6, 8, 5]]
});

test("Paket B 9: Relais – Taster im ersten Kreis gedrückt, die Lampe im zweiten leuchtet; die Kreise sind nicht leitend verbunden", () => {
  const circuit = relayCircuit();
  let result = LC.simulate(circuit);
  assert.equal(result.parts[2].active, false);
  assert.equal(result.parts[3].brightness < 1e-6, true);
  circuit.parts[1].pressed = true;
  result = LC.simulate(circuit);
  assert.equal(result.parts[2].active, true);
  near(result.parts[3].brightness, 1, 5e-3);
  near(result.parts[0].i[0], 0.06, 1e-3);                                  // erster Kreis: 6 V an 100 Ω Spule
  near(result.parts[4].i[0], 0.3, 1e-2);                                   // zweiter Kreis: der Strom der Lampe
  assert.equal(result.parts[5].reading, Infinity);                         // zwischen Spule und Kontakt: kein Durchgang
  assert.equal(LC.parts.relay.state(circuit.parts[2], result.parts[2], "de"), "hat angezogen");
  delete circuit.parts[1].pressed;
  result = LC.simulate(circuit);
  assert.equal(result.parts[2].active, false);                             // losgelassen: der Kontakt öffnet
  // angezogen ab 70 % der Nennspannung (6 V), abgefallen erst unter 40 %: so flattert der Kontakt nicht
  circuit.parts[1].pressed = true;
  const coil = volts => { circuit.parts[0].value = volts; return LC.simulate(circuit).parts[2].active; };
  assert.deepEqual([coil(4), coil(4.5), coil(3), coil(2)], [false, true, true, false]);
  assert.equal(LC.goalText({ type: "relay", count: 1, is: "on" }, "de"), "1 × Relais – hat angezogen");
});

test("Paket B 10: Elektromagnet – ohne Strom keine Klammer, mit mehr Strom mehr Klammern", () => {
  const clips = volts => {
    const circuit = pair({ type: "source", value: volts }, { type: "magnet" }), result = LC.simulate(circuit);
    return [result.parts[1].clips, LC.parts.magnet.state(circuit.parts[1], result.parts[1], "de")];
  };
  assert.deepEqual(clips(0), [0, "zieht nichts an"]);
  assert.deepEqual(clips(1), [1, "zieht 1 Büroklammer an"]);
  assert.deepEqual(clips(6), [6, "zieht 6 Büroklammern an"]);              // 0,6 A
  assert.deepEqual(clips(9), [9, "zieht 9 Büroklammern an"]);
  assert.equal(clips(24)[0], 12);                                          // mehr hält er nicht
  const part = LC.normalize({ parts: [{ type: "magnet", x: 3, y: 3 }] }).parts[0];
  for (const view of ["picture", "symbol"]) {
    const svg = LC.parts.magnet.draw(part, { clips: 6 }, { view, rot: 0, uid: "t", lang: "de" });
    assert.equal((svg.match(/class="lc-paperclip"/g) || []).length, 6);
  }
  // an Wechselspannung zählt der gemittelte Betrag des Stroms: 6 V effektiv an 10 Ω, Mittelwert 0,54 A
  const ac = LC.runFor(pair({ type: "acsource", value: 6, freq: 50 }, { type: "magnet" }), 0.6).result;
  assert.equal(ac.parts[1].clips, 5);
});

test("Paket B 11: Lautsprecher – an Wechselspannung Wellen, die bei höherer Frequenz enger stehen; an Gleichspannung keine", () => {
  const sound = freq => LC.runFor(pair({ type: "acsource", value: 3, freq }, { type: "speaker" }), 0.5).result.parts[1];
  const low = sound(100), high = sound(400);
  assert.equal(low.sounds, true);
  assert.equal(high.sounds, true);
  near(low.freq, 100, 1e-3);
  near(high.freq, 400, 1e-3);
  assert.ok(high.gap < low.gap, `${high.gap} < ${low.gap}`);
  const arcs = r => (LC.parts.speaker.draw({ value: 8 }, r, { view: "picture", rot: 0, uid: "t", lang: "de" }).match(/ A\d/g) || []).length;
  assert.ok(arcs(high) > arcs(low), `${arcs(high)} > ${arcs(low)}`);     // mehr Wellen auf derselben Strecke
  const dc = pair({ type: "battery" }, { type: "speaker" });
  assert.equal(LC.simulate(dc).parts[1].sounds, false);
  assert.equal(LC.runFor(dc, 0.5).result.parts[1].sounds, false);
  assert.equal(arcs({ sounds: false }), 0);
  assert.equal(LC.parts.speaker.state({}, low, "de"), "schwingt (Schallwellen)");
  // auch an der Rechteckspannung des Signalgenerators
  near(LC.runFor(pair({ type: "siggen", wave: "square", value: 3, freq: 200 }, { type: "speaker" }), 0.5).result.parts[1].freq, 200, 1e-3);
});

test("Paket B 12: Heißleiter – bei 25 °C misst das Multimeter den Nennwert, bei höherer Temperatur weniger", () => {
  const ohms = temp => LC.simulate(LC.normalize({
    parts: [{ type: "ntc", x: 6, y: 3, value: 10000, temp }, { type: "multimeter", x: 6, y: 6, mode: "R" }],
    wires: [[5, 3, 5, 6], [7, 3, 7, 6]]
  })).parts[1].reading;
  near(ohms(25), 10000, 1e-6);
  near(ohms(50), 3588, 1e-3);                                              // 10 kΩ · e^(3950 K · (1/323,15 K − 1/298,15 K))
  assert.ok(ohms(25) > ohms(40) && ohms(40) > ohms(60) && ohms(60) > ohms(100));
  assert.ok(ohms(0) > ohms(25));
  assert.equal(LC.normalize({ parts: [{ type: "ntc", x: 1, y: 1, temp: 300 }] }).parts[0].temp, 100);
  assert.equal(LC.parts.ntc.caption(LC.normalize({ parts: [{ type: "ntc", x: 1, y: 1 }] }).parts[0], "de"), "10 kΩ · 25 °C");
});

// ---------------------------------------------------------------- Paket C: Messgeräte und Signalgenerator
// (Rückmeldung vom 14.11.2026 im Steckbrief: C 13 bis C 16)

test("Paket C 13: Voltmeter und Amperemeter – 9 V an 100 Ω: 90 mA und 9,00 V, mit großer Anzeige", () => {
  const circuit = LC.normalize({
    parts: [{ type: "battery", x: 2, y: 4, rot: 1, value: 9 }, { type: "ammeter", x: 4, y: 2 }, { type: "resistor", x: 7, y: 2, value: 100 }, { type: "voltmeter", x: 7, y: 4 }],
    wires: [[2, 3, 2, 2, 3, 2], [5, 2, 6, 2], [8, 2, 10, 2, 10, 6, 2, 6, 2, 5], [6, 4, 6, 2], [8, 4, 8, 2]]
  });
  const result = LC.simulate(circuit);
  assert.equal(LC.parts.ammeter.state(circuit.parts[1], result.parts[1], "de"), "90,0 mA");
  assert.equal(LC.parts.voltmeter.state(circuit.parts[3], result.parts[3], "de"), "9,00 V");
  for (const type of ["voltmeter", "ammeter"]) {
    const svg = LC.parts[type].draw(circuit.parts[type === "ammeter" ? 1 : 3], result.parts[type === "ammeter" ? 1 : 3], { view: "picture", rot: 0, uid: "t", lang: "de" });
    assert.match(svg, /class="lc-text lc-big"[^>]*>(90,0 mA|9,00 V)</);    // die große Anzeige
  }
  // sie zählen für Aufgaben und für die Messwerttabelle, auch an Wechselspannung (Effektivwert)
  assert.deepEqual(LC.checkTask({ ...circuit, task: LC.normalize({ task: { goals: [{ measure: "A", min: 0.089, max: 0.091 }] } }).task }, result), { goals: [true], done: true });
  const ac = LC.runFor(pair({ type: "acsource", value: 6, freq: 50 }, { type: "voltmeter" }), 0.3).result.parts[1];
  assert.deepEqual([ac.ac, +ac.reading.toFixed(2)], [true, 6]);
});

// Kanal 1 an der Wechselspannungsquelle, Kanal 2 am Kondensator (100 Ω, 31,8 µF, 50 Hz: X_C = R)
const twoChannels = () => LC.normalize({
  parts: [
    { type: "scope", x: 3, y: 3, channels: 2, time: 0.005, volts: 5 },
    { type: "acsource", x: 12, y: 7, rot: 1, value: 6, freq: 50 },
    { type: "resistor", x: 9, y: 5, value: 100 },
    { type: "capacitor", x: 7, y: 7, rot: 1, value: 0.00003183 }
  ],
  wires: [[4, 5, 4, 9, 12, 9, 12, 8], [12, 6, 12, 5, 10, 5], [8, 5, 7, 5, 7, 6], [7, 8, 7, 9], [3, 5, 3, 7, 6, 7, 6, 5, 7, 5], [2, 5, 2, 10, 13, 10, 13, 4, 12, 4, 12, 5]]
});

test("Paket C 14: Oszilloskop mit zwei Kanälen – am Kondensator an Wechselspannung sind die Kurven sichtbar gegeneinander verschoben", () => {
  const circuit = twoChannels(), scope = circuit.parts[0];
  assert.deepEqual(LC.terminalPoints(scope), [[2, 5], [4, 5], [3, 5]]);   // Kanal 1, Masse, Kanal 2
  LC.runFor(circuit, 0.5);
  const one = LC.parts.scope.trace(scope), two = LC.parts.scope.trace(scope, 1);
  assert.ok(one.length > 200 && two.length === one.length);              // ein Punkt je 0,2 ms über 50 ms
  // die steigenden Nulldurchgänge: Kanal 2 kommt ein Achtel der Periode später (45°, 2,5 ms)
  const rising = points => points.filter((point, k) => k && points[k - 1][1] < 0 && point[1] >= 0).map(point => point[0] * 10 * scope.time);
  const lag = rising(two).find(t => t > rising(one)[0]) - rising(one)[0];
  near(lag, 2.5e-3, 0.06);
  near(Math.max(...one.map(point => point[1])), 6 * Math.SQRT2, 1e-2);
  near(Math.max(...two.map(point => point[1])), 6, 1e-2);                  // am Kondensator der Scheitelwert / √2
  for (const view of ["picture", "symbol"]) {
    const svg = LC.parts.scope.draw(scope, null, { view, rot: 0, uid: "t", lang: "de" });
    assert.equal((svg.match(/class="lc-trace[ "]/g) || []).length, 2);
    assert.match(svg, /class="lc-trace lc-trace2/);                        // andere Farbe und gestrichelt
  }
  // mit einem Kanal wie bisher: zwei Anschlüsse, eine Kurve
  const single = LC.normalize({ parts: [{ type: "scope", x: 3, y: 3 }] }).parts[0];
  assert.equal(single.channels, 1);
  assert.equal(LC.terminalPoints(single).length, 2);
  assert.deepEqual(LC.parts.scope.trace(single, 1), []);
});

test("Paket C 15: Leistungsmesser – an der Lampe für 4,5 V zeigt er 1,35 W", () => {
  const circuit = LC.normalize({
    parts: [{ type: "battery", x: 3, y: 4, rot: 1, value: 4.5 }, { type: "wattmeter", x: 6, y: 2 }, { type: "lamp", x: 10, y: 2 }],
    wires: [[3, 3, 3, 2, 5, 2], [7, 2, 9, 2], [11, 2, 11, 6, 3, 6, 3, 5], [6, 3, 6, 6]]
  });
  const result = LC.simulate(circuit);
  assert.equal(LC.parts.wattmeter.state(circuit.parts[1], result.parts[1], "de"), "1,35 W");
  near(result.parts[2].brightness, 1, 5e-3);                               // die Lampe merkt vom Messgerät nichts
  // Wechselspannung: die Wirkleistung, 6 V effektiv an 100 Ω sind 0,36 W
  const ac = LC.normalize({
    parts: [{ type: "acsource", x: 3, y: 4, rot: 1, value: 6, freq: 50 }, { type: "wattmeter", x: 6, y: 2 }, { type: "resistor", x: 10, y: 2, value: 100 }],
    wires: [[3, 3, 3, 2, 5, 2], [7, 2, 9, 2], [11, 2, 11, 6, 3, 6, 3, 5], [6, 3, 6, 6]]
  });
  near(LC.runFor(ac, 0.3).result.parts[1].reading, 0.36, 1e-2);
  assert.deepEqual(LC.normalize({ task: { goals: [{ measure: "W", min: 1.3 }] } }).task.goals, [{ measure: "W", min: 1.3 }]);
  assert.equal(LC.goalText({ measure: "W", min: 1.3, max: 1.4 }, "de"), "Messwert: von 1,3 W bis 1,4 W");
});

test("Paket C 16: Signalgenerator – bei „Rechteck“ zeigt der Schirm ein Rechteck mit der eingestellten Frequenz", () => {
  const circuit = LC.normalize({
    parts: [
      { type: "siggen", x: 2, y: 5, rot: 3, wave: "square", value: 5, freq: 100 },
      { type: "resistor", x: 5, y: 2, value: 100 },
      { type: "scope", x: 12, y: 4, time: 0.002, volts: 2 }
    ],
    wires: [[2, 4, 2, 2, 4, 2], [6, 2, 8, 2, 8, 8, 2, 8, 2, 6], [11, 6, 8, 6], [13, 6, 13, 9, 1, 9, 1, 2, 2, 2]]
  });
  const scope = circuit.parts[2];
  assert.deepEqual(LC.runFor(circuit, 0.3).result.warnings, []);
  const points = LC.parts.scope.trace(scope);
  assert.ok(points.every(point => Math.abs(Math.abs(point[1]) - 5) < 1e-2), "nur +5 V und −5 V");
  near(points.filter(point => point[1] > 0).length / points.length, 0.5, 0.02);
  const edges = points.filter((point, k) => k && points[k - 1][1] < 0 && point[1] > 0).map(point => point[0] * 10 * scope.time);
  assert.ok(edges.length >= 2);
  near(edges[1] - edges[0], 0.01, 0.02);                                   // 100 Hz: alle 10 ms eine steigende Flanke
  // die drei Kurvenformen über eine Periode
  assert.deepEqual([0, 0.25, 0.5, 0.75].map(x => +LC.waveShape("triangle", x).toFixed(6)), [0, 1, 0, -1]);
  assert.deepEqual([0.1, 0.6].map(x => LC.waveShape("square", x)), [1, -1]);
  near(LC.waveShape("sine", 0.25), 1);
  for (const wave of ["sine", "square", "triangle"])
    assert.match(LC.parts.siggen.draw({ ...scope, wave }, null, { view: "picture", rot: 0, uid: "t", lang: "de" }), /<path d="M-9/);
});

test("Ton: Summer und Lautsprecher klingen erst nach dem Ton-Knopf – der Summer mit 400 Hz, der Lautsprecher mit der gemessenen Frequenz", async () => {
  // was klingen soll, entscheidet das Bauteil
  const buzz = pair({ type: "battery" }, { type: "buzzer" });
  assert.deepEqual(LC.parts.buzzer.tone(buzz.parts[1], LC.simulate(buzz).parts[1]), { freq: 400, wave: "square", level: 0.5 });
  const quiet = pair({ type: "battery", value: 1 }, { type: "buzzer" });
  assert.equal(LC.parts.buzzer.tone(quiet.parts[1], LC.simulate(quiet).parts[1]), null);
  const speaker = LC.runFor(pair({ type: "acsource", value: 3, freq: 400 }, { type: "speaker" }), 0.5).result.parts[1];
  const tone = LC.parts.speaker.tone({}, speaker);
  near(tone.freq, 400, 1e-3);
  near(tone.level, 1, 1e-2);                                       // 3 V effektiv: volle Lautstärke
  assert.equal(LC.parts.speaker.tone({}, { sounds: false }), null);

  // auf der Fläche, mit einem nachgestellten Audio-Kontext des Browsers
  const made = [];
  globalThis.AudioContext = class {
    constructor() { this.state = "running"; this.currentTime = 0; this.destination = {}; }
    createOscillator() {
      const osc = { type: "", frequency: { value: 0, setTargetAtTime(v) { osc.frequency.value = v; } }, connect() {}, start() { osc.on = true; }, stop() { osc.on = false; } };
      made.push(osc);
      return osc;
    }
    createGain() { const gain = { gain: { value: 0, setTargetAtTime(v) { gain.gain.value = v; } }, connect() {} }; return gain; }
  };
  globalThis.document = { documentElement: { lang: "de" }, activeElement: null };
  globalThis.DOMPoint = class { constructor(x, y) { this.x = x; this.y = y; } matrixTransform() { return this; } };
  await import("./circuits-ui.js");
  try {
    delete LC.audio;
    const el = placeholder();
    el.id = "test-sound";
    LC.mount(el, { ...loop(false), parts: [{ ...loop(false).parts[0], value: 4.5 }, { type: "button", x: 6, y: 2 }, { type: "buzzer", x: 10, y: 2 }] });
    const use = hands(el), toggle = el.querySelector('[data-act="sound"]');
    assert.equal(toggle.hidden, false);                             // ein Summer ist da: der Knopf erscheint
    assert.equal(toggle.textContent, "🔇");
    const svg = el.querySelector(".lc-svg");
    const hold = () => { for (const listener of svg.listeners.pointerdown) listener({ button: 0, pointerId: 1, isPrimary: true, clientX: 240, clientY: 80, target: { closest: s => (s === "[data-part]" ? { getAttribute: () => "1" } : null) }, preventDefault() {} }); };
    hold();
    assert.equal(made.length, 0);                                   // Ton aus: es klingt nichts, kein Audio-Kontext
    assert.equal(LC.audio, undefined);
    for (const listener of svg.listeners.pointerup) listener({ pointerId: 1 });
    use.press({ "data-act": "sound" });
    assert.equal(toggle.textContent, "🔊");
    assert.equal(toggle.attributes["aria-pressed"], "true");
    hold();                                                          // Taster gedrückt: der Summer klingt
    assert.equal(made.length, 1);
    assert.deepEqual([made[0].on, made[0].type, made[0].frequency.value], [true, "square", 400]);
    for (const listener of svg.listeners.pointerup) listener({ pointerId: 1 });
    assert.equal(made[0].on, false);                                // losgelassen: still
    hold();
    use.press({ "data-act": "sound" });                              // Ton aus, während er klingt
    assert.equal(made[1].on, false);
    use.press({ "data-act": "sound" });
    assert.equal(made[2].on, true);
    el._lc.stop();                                                   // Folie verlassen
    assert.equal(made[2].on, false);
    // ohne Summer oder Lautsprecher kein Knopf; die Autorin kann den Ton vorab einschalten
    const plain = placeholder();
    plain.id = "test-no-sound";
    LC.mount(plain, loop(true));
    assert.equal(plain.querySelector('[data-act="sound"]').hidden, true);
    assert.equal(LC.normalize({ sound: true }).sound, true);
    assert.match(LC.serialize(LC.normalize({ sound: true })), /"sound":true/);
  } finally {
    delete globalThis.AudioContext;
    delete globalThis.DOMPoint;
    delete LC.audio;
  }
});

test("@Circuits.code: die Schaltung steht im Codeblock – bauen ohne Strom, Play rechnet, Stop hält an, eine andere Version baut die Fläche neu", async () => {
  // was im Browser der Ace-Editor des Codeblocks ist: Text, setValue, change-Ereignisse
  const ace = { text: JSON.stringify(loop(false)), listeners: [], getValue() { return this.text; },
    setValue(text) { this.text = text; this.listeners.forEach(listener => listener()); }, on(type, listener) { this.listeners.push(listener); } };
  const elements = {};
  globalThis.document = {
    documentElement: { lang: "de" }, activeElement: null, head: { appendChild() {} },
    createElement: () => ({}), getElementById: id => elements[id] || null
  };
  await import("./circuits-ui.js");
  await import("./circuits-code.js");
  const timers = [];
  const realTimeout = globalThis.setTimeout;
  globalThis.setTimeout = callback => timers.push(callback);       // die kurze Wartezeit nach einer Änderung im Editor
  try {
    const el = placeholder();
    el.id = "lia-circuits-test-code";
    el.nextElementSibling = { querySelector: selector => (selector === "lia-editor" ? { _editor: ace } : null) };
    el.removeEventListener = (type, listener) => { el.listeners[type] = (el.listeners[type] || []).filter(other => other !== listener); };   // jede neue Fläche löst die alte ab
    elements[el.id] = el;
    assert.equal(LC.attach(el), true);
    const lamp = () => LC.store[el.id].result.parts[2];
    const use = hands(el);

    use.press({ "data-act": "tap" });                               // nichts gewählt: kein Schritt
    LC.store[el.id].selected = { part: 1 };
    use.press({ "data-act": "tap" });                               // Schalter schließen
    assert.match(ace.getValue(), /"closed":true/);                  // die Änderung steht sofort im Codeblock
    assert.equal(lamp(), null);                                     // vor Play: bauen ohne Strom

    let stop = null;
    LC.play(el.id, { handle: (type, listener) => { if (type === "stop") stop = listener; }, lia() {} });
    near(lamp().brightness, 1, 5e-3);                               // Play: die Lampe leuchtet
    stop();
    assert.equal(lamp(), null);                                     // Stop: wieder aus

    ace.setValue(JSON.stringify(loop(true)).replace('"closed":true', '"closed":false'));   // eine andere Version
    ace.setValue(JSON.stringify(twoLamps(true)));                   // … kommt in Schritten: es zählt der letzte Text
    timers.splice(0).forEach(callback => callback());
    assert.equal(LC.store[el.id].circuit.parts.length, 3);
    assert.equal(LC.store[el.id].circuit.parts[2].x, 8);            // die Fläche zeigt jetzt die zweite Lampe parallel
    ace.setValue("{kaputt");                                        // unlesbarer Text: die Fläche bleibt, wie sie ist
    timers.splice(0).forEach(callback => callback());
    assert.equal(LC.store[el.id].circuit.parts[2].x, 8);

    LC.store[el.id].selected = { part: 2 };
    use.press({ "data-act": "remove" });                            // die nächste Änderung ersetzt den unlesbaren Text
    assert.equal(LC.normalize(ace.getValue()).parts.length, 2);
    use.press({ "data-act": "undo" });                              // auch Rückgängig landet im Codeblock
    assert.deepEqual(LC.normalize(ace.getValue()).parts, LC.store[el.id].circuit.parts);

    const lonely = placeholder();                                  // ohne Codeblock danach (noch nicht gezeichnet): später noch einmal
    assert.equal(LC.attach(lonely), false);
  } finally {
    globalThis.setTimeout = realTimeout;
  }
});

test("Prüfpunkt 4: der Ordner enthält nur einfache Dateien, keinen Build-Schritt", () => {
  const files = readdirSync(dirname(fileURLToPath(import.meta.url))).filter(name => !name.startsWith(".")).sort();
  assert.deepEqual(files, ["README.md", "check.mjs", "circuits-code.js", "circuits-locale.js", "circuits-parts.js", "circuits-solver.js", "circuits-ui.js", "circuits.css"]);
});

// ---------------------------------------------------------------- ganzheitlich
// Gesetze, die für JEDE Schaltung gelten müssen, egal welche Teile darin stecken:
// – Knotenregel (Kirchhoff) an jedem Verbindungspunkt: was die Bauteile hineinschicken, führen die Leitungen ab;
// – in jedes Bauteil fließt so viel Strom hinein wie heraus;
// – keine Zahl ist NaN oder unendlich; die Beschreibung übersteht Schreiben und Lesen.
// Geprüft an allen Schaltungen der Seite (sim und code) und an zufällig gebauten Schaltungen.

function assertLaws(circuit, result, net, label) {
  const scale = Math.max(1e-3, ...result.parts.flatMap(r => r.inj.map(Math.abs)));
  const tol = scale * 1e-6 + 1e-9;
  JSON.stringify(result, (key, value) => {
    // ∞ ist erlaubt, wo ein Messgerät es anzeigt (Widerstand eines offenen Kreises: „∞ Ω“)
    if (typeof value === "number") assert.ok(Number.isFinite(value) || (key === "reading" && !Number.isNaN(value)), `${label}: ${key} = ${value}`);
    return value;
  });
  result.parts.forEach((r, pi) => {
    const sum = r.inj.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum) <= tol, `${label}: Bauteil ${pi} (${circuit.parts[pi].type}) verliert ${sum} A`);
  });
  const balance = new Array(net.pointOf.length).fill(0);
  result.parts.forEach((r, pi) => r.inj.forEach((cur, t) => { balance[net.terms[pi][t]] += cur; }));
  result.edges.forEach(e => { balance[e.to] += e.current; balance[e.from] -= e.current; });
  balance.forEach((sum, k) =>
    assert.ok(Math.abs(sum) <= tol, `${label}: Knotenregel verletzt an (${net.pointOf[k]}): ${sum} A`));
}

function checkCircuit(circuit, label) {
  const text = LC.serialize(circuit);
  assert.equal(LC.serialize(LC.normalize(text)), text, `${label}: Schreiben und Lesen`);
  assertLaws(circuit, LC.simulate(circuit), LC.buildNet(circuit), `${label} (Ruhezustand)`);
  if (LC.isDynamic(circuit)) {
    const run = LC.createRun(circuit);
    for (let k = 1; k <= 5; k++) assertLaws(circuit, LC.advance(run, 40), run.net, `${label} (t = ${run.t.toFixed(4)} s)`);
  }
}

test("Ganzheitlich: jede Schaltung der Seite hält Knotenregel und Stromerhaltung ein – im Ruhezustand und im Zeitverlauf", () => {
  const readme = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "README.md"), "utf8");
  const blocks = [...readme.matchAll(/```json @Circuits\.(?:sim|code)\n([\s\S]*?)\n```/g)].map(match => match[1]);
  assert.ok(blocks.length >= 13, `${blocks.length} Schaltungen`);
  blocks.forEach((block, k) => checkCircuit(LC.normalize(block), `Beispiel ${k + 1}`));
});

test("Ganzheitlich: 300 zufällig gebaute Schaltungen aus allen Teilen – keine stürzt ab, alle halten die Gesetze ein", () => {
  let seed = 20261117;                                   // fester Startwert: ein Fehler lässt sich nachstellen
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = list => list[Math.floor(rnd() * list.length)];
  for (let n = 0; n < 300; n++) {
    const parts = Array.from({ length: 2 + Math.floor(rnd() * 4) }, (_, k) =>
      ({ type: pick(LC.palette), x: 4 + 6 * k, y: 3 + Math.floor(rnd() * 6), rot: Math.floor(rnd() * 4) }));
    const circuit = LC.normalize({ parts, wires: [] });
    // jeden Anschluss mit einem zufälligen Anschluss eines anderen Bauteils verbinden (Leitung als Haken)
    const terminals = circuit.parts.flatMap((p, pi) => LC.terminalPoints(p).map(pt => [pi, pt]));
    for (const [pi, [x1, y1]] of terminals) {
      const others = terminals.filter(t => t[0] !== pi);
      if (!others.length || rnd() < 0.15) continue;      // ab und zu bleibt ein Anschluss offen
      const [x2, y2] = pick(others)[1];
      if (x1 !== x2 || y1 !== y2) circuit.wires.push(x1 === x2 || y1 === y2 ? [x1, y1, x2, y2] : [x1, y1, x1, y2, x2, y2]);
    }
    if (rnd() < 0.5) circuit.parts.forEach(p => { if ("closed" in p) p.closed = true; if ("pressed" in p) p.pressed = true; });
    const label = `Zufall ${n}: ${circuit.parts.map(p => p.type).join(", ")}`;
    try { checkCircuit(circuit, label); }
    catch (error) { error.message += `\n${LC.serialize(circuit)}`; throw error; }
  }
});

// ---------------------------------------------------------------- Fehler, bei denen es knallen muss

// Ergebnis nach einer Rechnung: im Ruhezustand oder – bei Wechselspannung – über eine Viertelperiode,
// damit die Quelle ihren Scheitelwert erreicht. Warnungen und Ereignisse aus allen Schritten zählen.
function runFaulty(circuit) {
  if (!LC.isDynamic(circuit)) return { result: LC.simulate(circuit), net: LC.buildNet(circuit), warnings: LC.simulate(circuit).warnings };
  const run = LC.createRun(circuit), warnings = [];
  let result;
  for (let k = 0; k < 10; k++) { result = LC.advance(run, 1); warnings.push(...result.warnings); }
  return { result, net: run.net, warnings };
}
const shorted = (circuit, pi) => {
  const [[x1, y1], [x2, y2]] = LC.terminalPoints(circuit.parts[pi]);
  circuit.wires.push([x1, y1, x2, y2]);                    // Leitung direkt von Pol zu Pol
  return circuit;
};

test("Knallen: jede Spannungsquelle meldet Kurzschluss, wenn eine Leitung ihre Pole verbindet", () => {
  for (const type of LC.palette.filter(t => LC.parts[t].source)) {
    const circuit = shorted(LC.normalize({ parts: [{ type, x: 5, y: 5, crank: true }], wires: [] }), 0);
    const { result, net, warnings } = runFaulty(circuit);
    if (type === "solar") {                                 // 50 mA Kurzschlussstrom schaden nicht: keine Warnung
      assert.deepEqual(warnings, [], type);
    } else {
      assert.ok(warnings.some(w => w.type === "short" && w.part === 0), `${type}: keine Kurzschlusswarnung`);
    }
    assertLaws(circuit, result, net, `Kurzschluss ${type}`);
  }
});

test("Knallen: Lampe, Leuchtdiode und Sicherung direkt an 12 V brennen durch – danach fließt kein Strom mehr; richtig angeschlossen halten sie", () => {
  const at12V = (type, extra = []) => LC.normalize({
    parts: [{ type: "source", x: 3, y: 4, rot: 1, value: 12 }, { type, x: 7, y: 2 }, ...extra],
    wires: [[3, 3, 3, 2, 6, 2], [8, 2, 11, 2, 11, 6, 3, 6, 3, 5]]
  });
  for (const type of ["lamp", "led", "fuse"]) {
    const circuit = at12V(type);
    const first = LC.simulate(circuit);
    assert.equal(circuit.parts[1].blown, true, `${type} hält 12 V aus`);
    assert.deepEqual(first.events, [{ type: "blown", part: 1 }], type);
    const after = LC.simulate(circuit);                     // einmal kaputt, bleibt kaputt – ohne neues Ereignis
    assert.deepEqual(after.events, [], type);
    assert.ok(after.edges.every(edge => Math.abs(edge.current) < 1e-9), `${type}: nach dem Durchbrennen fließt noch Strom`);
    assertLaws(circuit, after, LC.buildNet(circuit), `${type} durchgebrannt`);
  }
  // Gegenprobe mit Vorwiderstand: Lampe 25 Ω → 0,3 A, Nennleistung; Leuchtdiode 470 Ω → ~21 mA < 50 mA; Sicherung 1 A bei 0,12 A
  for (const type of ["lamp", "led", "fuse"]) {
    const circuit = LC.normalize({
      parts: [{ type: "source", x: 3, y: 4, rot: 1, value: 12 }, { type: "resistor", x: 6, y: 2, value: { lamp: 25, led: 470, fuse: 100 }[type] }, { type, x: 10, y: 2 }],
      wires: [[3, 3, 3, 2, 5, 2], [7, 2, 9, 2], [11, 2, 13, 2, 13, 6, 3, 6, 3, 5]]
    });
    const result = LC.simulate(circuit);
    assert.equal(circuit.parts[2].blown, false, `${type} brennt trotz Vorwiderstand durch`);
    assert.deepEqual(result.events, [], type);
    assert.ok(Math.abs(result.parts[2].i[0]) > 1e-3, `${type}: es fließt kein Strom`);
  }
});

test("Knallen: in jeder Schaltung der Seite meldet jede kurzgeschlossene Quelle einen Kurzschluss", () => {
  const readme = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "README.md"), "utf8");
  const blocks = [...readme.matchAll(/```json @Circuits\.(?:sim|code)\n([\s\S]*?)\n```/g)].map(match => match[1]);
  let count = 0;
  blocks.forEach((block, k) => {
    LC.normalize(block).parts.forEach((part, pi) => {
      if (!LC.parts[part.type].source || part.type === "solar") return;
      const circuit = shorted(LC.normalize(block), pi);
      circuit.parts[pi].crank = true;                       // der Handgenerator liefert nur beim Kurbeln
      const { result, net, warnings } = runFaulty(circuit);
      assert.ok(warnings.some(w => w.type === "short" && w.part === pi), `Beispiel ${k + 1}: ${part.type} kurzgeschlossen, keine Warnung`);
      assertLaws(circuit, result, net, `Beispiel ${k + 1} mit Kurzschluss`);
      count++;
    });
  });
  assert.ok(count >= 15, `${count} Kurzschlüsse geprüft`);
});

// ---------------------------------------------------------------- überbrückt, Elektronenrichtung

const bypassed = description => run(description).result.warnings.filter(w => w.type === "bypass").map(w => w.part);

test("Überbrückt: ein Motor, dessen Anschlüsse eine Leitung verbindet, wird gemeldet – in Reihe nicht", () => {
  const motor = { type: "motor", x: 13, y: 1 };
  const across = loop(true, [[12, 1, 11, 1, 11, 2], [14, 1, 14, 6], [14, 6, 11, 6]]);
  across.parts.push(motor);
  assert.deepEqual(bypassed(across), [3]);
  const series = loop(true, [[12, 1, 11, 1, 11, 2], [14, 1, 14, 6], [14, 6, 11, 6]]);
  series.parts.push(motor);
  series.wires[2] = [11, 6, 3, 6, 3, 5];                   // ohne das Stück von der Lampe nach unten
  assert.deepEqual(bypassed(series), []);
  assert.deepEqual(bypassed(loop(true)), []);
});

test("Elektronenrichtung: flow electrons übersteht Lesen und Schreiben, anderes wird verworfen", () => {
  assert.equal(LC.normalize(LC.serialize(LC.normalize({ flow: "electrons" }))).flow, "electrons");
  assert.equal(LC.normalize({ flow: "nonsense" }).flow, undefined);
});

test("Potenzial: jede Leitung trägt das Potenzial ihres Knotens, Plus liegt 4,5 V über Minus", () => {
  const { result } = run(loop(true));
  const at = (x, y) => result.edges.find(e => e.path.some(p => p[0] === x && p[1] === y)).v;
  near(at(4, 2) - at(3, 6), 4.5);                          // vom Pluspol zur Lampe gegenüber der Rückleitung
  assert.ok(Math.abs(at(8, 2) - at(4, 2)) < 0.01);         // geschlossener Schalter: fast kein Unterschied
  assert.equal(LC.normalize(LC.serialize(LC.normalize({ potential: true }))).potential, true);
});

test("Sprachen: alle Sprachen von lia-localization, gleiche Schlüssel, Platzhalter und Dezimalzeichen", () => {
  const keys = Object.keys(LC.strings.en);
  assert.equal(LC.languages.length, 45);
  assert.deepEqual(Object.keys(LC.strings).sort(), LC.languages);
  for (const lang of LC.languages) {
    const table = LC.strings[lang];
    assert.deepEqual(Object.keys(table), keys, lang);
    for (const key of keys) {
      assert.ok(typeof table[key] === "string" && table[key].trim(), lang + "." + key);
      if (LC.strings.en[key].includes("{n}")) assert.ok(table[key].includes("{n}"), lang + "." + key);
    }
  }
  assert.equal(LC.lang("de-AT"), "de");
  assert.equal(LC.lang("zh-TW"), "tw");
  assert.equal(LC.lang("zh-Hant-HK"), "tw");
  assert.equal(LC.lang("zh-CN"), "zh");
  assert.equal(LC.lang("no"), "nb");
  assert.equal(LC.lang("pt_BR"), "pt");
  assert.equal(LC.lang("xx"), "");                                // keine eigene Übersetzung: Englisch, der Übersetzer darf
  assert.equal(LC.format(4.5, "V", "fr"), "4,50 V");
  assert.equal(LC.format(4.5, "V", "ja"), "4.50 V");
  assert.equal(LC.format(4.5, "V", "ar"), "4.50 V");            // westliche Ziffern, wie im Text der Sprachdatei
  assert.equal(LC.text("battery", "xx"), "Battery");            // unbekannt oder noch nicht geladen: Englisch
});
