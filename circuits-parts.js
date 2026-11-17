/* Lia-Circuits · Bauteile
 *
 * Jedes Bauteil beschreibt: seine Anschlüsse auf dem Raster, seine Vorgabewerte, sein
 * elektrisches Verhalten (einfache Elemente für die Knotenanalyse) und seine Zeichnung in
 * beiden Ansichten ("picture" = Bild, "symbol" = Schaltzeichen), immer als SVG.
 * Einfache Datei ohne Build-Schritt: lädt im Browser und in Node.
 *
 * Zeichnungen: Ursprung in der Mitte des Bauteils, 40 Einheiten je Rasterschritt,
 * die Anschlüsse liegen auf den Rasterpunkten (z. B. links -40|0 und rechts 40|0).
 */
(function (global) {
  "use strict";
  var LC = (global.LiaCircuits = global.LiaCircuits || {});
  var P = (LC.parts = LC.parts || {});

  var R_ON = 1e-3;     // geschlossener Schalter, Strommesser, Sicherung
  var R_SRC = 1e-2;    // Innenwiderstand der Quellen
  var R_VOLT = 1e7;    // Spannungsmesser
  LC.limits = { short: 10 };   // Strom durch eine Quelle in Ampere, ab dem "Kurzschluss" gemeldet wird

  // ---------------------------------------------------------------- Texte

  LC.strings = {
    de: {
      // ­ ist ein weiches Trennzeichen: lange Namen brechen in der Bauteilleiste an dieser Stelle um
      battery: "Batterie", source: "Spannungs­quelle", switch: "Schalter", button: "Taster", changeover: "Umschalter",
      lamp: "Lampe", resistor: "Widerstand", potentiometer: "Schiebe­widerstand", fuse: "Sicherung", multimeter: "Multimeter",
      acsource: "Wechsel­spannungs­quelle", capacitor: "Kondensator", inductor: "Spule", scope: "Oszil­loskop",
      effective: "Spannung (effektiv)", frequency: "Frequenz", winding: "Wicklung", discharge: "Entladen",
      timeBase: "Zeit je Kästchen", voltBase: "Spannung je Kästchen", slow: "Zeitlupe",
      wire: "Leitung", workspace: "Arbeitsfläche der Schaltung", parts: "Bauteile", view: "Ansicht",
      viewPicture: "Bilder", viewSymbol: "Schaltzeichen", reset: "Zurücksetzen", copy: "Schaltung als Text kopieren",
      undo: "Rückgängig", redo: "Wiederholen", sound: "Ton", potential: "Potenzial",
      potentialKey: "Farben der Leitungen: Blau ist das niedrigste Potenzial (Minuspol), Rot das höchste (Pluspol).",
      zoomIn: "Vergrößern", zoomOut: "Verkleinern", fit: "Ganze Fläche", more: "Mehr", closePanel: "Schließen",
      grpSources: "Quellen", grpSwitches: "Schalter", grpLoads: "Verbraucher", grpComponents: "Bauelemente", grpMeters: "Messgeräte",
      copied: "Der Text ist kopiert.", copyManual: "Markieren und kopieren Sie diesen Text:",
      hint: "Bauteil antippen, um es zu ändern. Von einem Anschlusspunkt aus ziehen, um eine Leitung zu legen.",
      remove: "Entfernen", turn: "Drehen", value: "Wert", open: "offen", closed: "geschlossen",
      toOpen: "Öffnen", toClose: "Schließen", flip: "Umschalten", pressed: "gedrückt", released: "nicht gedrückt",
      blown: "durchgebrannt", broken: "defekt", intact: "ganz", replaceFuse: "Sicherung ersetzen", slider: "Schieber",
      mode: "Messgröße", modeV: "Spannung (V)", modeA: "Stromstärke (A)", modeR: "Widerstand (Ω)",
      lampOn: "leuchtet", lampDim: "leuchtet schwach", lampOff: "leuchtet nicht",
      short: "Kurzschluss! Der Strom durch die Quelle ist viel zu groß.",
      bypass: "⚠ Ein Bauteil ist überbrückt: Eine Leitung verbindet seine Anschlüsse, darum liegt an ihm keine Spannung.",
      fuseBlown: "Die Sicherung ist durchgebrannt.",
      overlap: "Hier liegen Leitungen übereinander (orange markiert). Dort sind sie verbunden; eine davon lässt sich entfernen.",
      lampBlown: "Eine Lampe ist durchgebrannt – ihre Spannung war zu hoch. Antippen ersetzt sie.",
      replaceLamp: "Lampe ersetzen", nominal: "Nennspannung", inner: "Innenwiderstand",
      form: "Form", formCell: "Mignonzelle 1,5 V", formFlat: "Flachbatterie 4,5 V", formBlock: "9-V-Block", formCoin: "Knopfzelle 3 V",
      diode: "Diode", led: "Leucht­diode", transistor: "Transistor", ldr: "Foto­widerstand", motor: "Motor", buzzer: "Summer",
      conducts: "leitet", blocks: "sperrt", threshold: "Schwellenspannung", gain: "Verstärkung", light: "Helligkeit",
      colour: "Farbe", red: "rot", yellow: "gelb", green: "grün", blue: "blau", white: "weiß",
      replaceLed: "Leuchtdiode ersetzen",
      ledBlown: "Eine Leuchtdiode ist durchgebrannt – sie braucht einen Vorwiderstand. Antippen ersetzt sie.",
      stands: "steht", turnsRight: "dreht sich rechts herum", turnsLeft: "dreht sich links herum", buzzes: "summt", silent: "ist still",
      errJson: "Die Beschreibung der Schaltung lässt sich nicht lesen", errPart: "Unbekanntes Bauteil",
      errWire: "Fehlerhafte Leitung", errPlace: "Bauteil ohne Platzangabe", errOther: "Die Schaltung lässt sich nicht berechnen",
      errTask: "Die Aufgabe in der Beschreibung lässt sich nicht lesen",
      task: "Aufgabe", done: "Geschafft!", goalMet: "erfüllt", goalOpen: "noch offen",
      goalBright: "leuchtet hell", goalTurns: "dreht sich", goalFlow: "Strom fließt", goalNoFlow: "kein Strom",
      goalAll: "alle", goalReading: "Messwert", goalFrom: "von", goalTo: "bis", goalMin: "mindestens", goalMax: "höchstens",
      swap: "Ersetzen", swapBad: "Ersetzt – das alte Bauteil war defekt.", swapGood: "Ersetzt – das alte Bauteil war in Ordnung.",
      hintLock: "Diese Schaltung ist fest aufgebaut: schalten, Regler bedienen und messen.",
      noteRow: "Messwerte notieren", clearRows: "Tabelle leeren", readings: "Messwerte", number: "Nr.",
      noMeter: "In der Schaltung ist kein Messgerät.",
      // Paket B und C
      solar: "Solar­zelle", dynamo: "Hand­generator", relay: "Relais", magnet: "Elektro­magnet", speaker: "Laut­sprecher",
      ntc: "Heiß­leiter", voltmeter: "Volt­meter", ammeter: "Ampere­meter", wattmeter: "Leistungs­messer", siggen: "Signal­generator",
      openVolts: "Leerlaufspannung bei vollem Licht", shortAmps: "Kurzschlussstrom bei vollem Licht",
      crank: "Kurbeln", stopCrank: "Anhalten", cranking: "wird gekurbelt", pace: "Tempo", fullVolts: "Spannung bei vollem Tempo",
      relayOn: "hat angezogen", relayOff: "hat nicht angezogen", coilVolts: "Nennspannung der Spule", coilOhm: "Widerstand der Spule",
      magnetOn: "zieht Klammern an", magnetOff: "zieht nichts an", clipOne: "zieht 1 Büroklammer an", clipMany: "zieht {n} Büroklammern an",
      speakerOn: "schwingt (Schallwellen)", temperature: "Temperatur", at25: "Widerstand bei 25 °C",
      wave: "Kurvenform", sine: "Sinus", square: "Rechteck", triangle: "Dreieck", peak: "Scheitelwert",
      channels: "Kanäle", oneChannel: "1 Kanal", twoChannels: "2 Kanäle", modeW: "Leistung (W)"
    },
    en: {
      battery: "Battery", source: "Voltage source", switch: "Switch", button: "Push button", changeover: "Changeover switch",
      lamp: "Lamp", resistor: "Resistor", potentiometer: "Slide resistor", fuse: "Fuse", multimeter: "Multimeter",
      acsource: "AC voltage source", capacitor: "Capacitor", inductor: "Coil", scope: "Oscilloscope",
      effective: "Voltage (RMS)", frequency: "Frequency", winding: "Winding", discharge: "Discharge",
      timeBase: "Time per division", voltBase: "Voltage per division", slow: "Slow motion",
      wire: "Wire", workspace: "Circuit workspace", parts: "Parts", view: "View",
      viewPicture: "Pictures", viewSymbol: "Symbols", reset: "Reset", copy: "Copy circuit as text",
      undo: "Undo", redo: "Redo", sound: "Sound", potential: "Potential",
      potentialKey: "Wire colours: blue is the lowest potential (negative pole), red the highest (positive pole).",
      zoomIn: "Zoom in", zoomOut: "Zoom out", fit: "Whole area", more: "More", closePanel: "Close",
      grpSources: "Sources", grpSwitches: "Switches", grpLoads: "Loads", grpComponents: "Components", grpMeters: "Meters",
      copied: "The text is copied.", copyManual: "Select and copy this text:",
      hint: "Tap a part to change it. Drag from a connection point to lay a wire.",
      remove: "Remove", turn: "Rotate", value: "Value", open: "open", closed: "closed",
      toOpen: "Open", toClose: "Close", flip: "Switch over", pressed: "pressed", released: "not pressed",
      blown: "blown", broken: "broken", intact: "intact", replaceFuse: "Replace fuse", slider: "Slider",
      mode: "Quantity", modeV: "Voltage (V)", modeA: "Current (A)", modeR: "Resistance (Ω)",
      lampOn: "is lit", lampDim: "is dimly lit", lampOff: "is not lit",
      short: "Short circuit! The current through the source is far too large.",
      bypass: "⚠ A part is bypassed: a wire connects its terminals, so there is no voltage across it.",
      fuseBlown: "The fuse has blown.",
      overlap: "Wires lie on top of each other here (marked in orange). They are connected there; one of them can be removed.",
      lampBlown: "A lamp has burnt out – its voltage was too high. Tap it to replace it.",
      replaceLamp: "Replace lamp", nominal: "Rated voltage", inner: "Internal resistance",
      form: "Shape", formCell: "AA cell 1.5 V", formFlat: "Flat battery 4.5 V", formBlock: "9 V block", formCoin: "Coin cell 3 V",
      diode: "Diode", led: "LED", transistor: "Transistor", ldr: "Photo­resistor", motor: "Motor", buzzer: "Buzzer",
      conducts: "conducts", blocks: "blocks", threshold: "Threshold voltage", gain: "Gain", light: "Brightness",
      colour: "Colour", red: "red", yellow: "yellow", green: "green", blue: "blue", white: "white",
      replaceLed: "Replace LED",
      ledBlown: "An LED has burnt out – it needs a series resistor. Tap it to replace it.",
      stands: "stands still", turnsRight: "turns clockwise", turnsLeft: "turns anticlockwise", buzzes: "buzzes", silent: "is silent",
      errJson: "The circuit description cannot be read", errPart: "Unknown part",
      errWire: "Faulty wire", errPlace: "Part without a place", errOther: "The circuit cannot be calculated",
      errTask: "The task in the description cannot be read",
      task: "Task", done: "Well done!", goalMet: "met", goalOpen: "still open",
      goalBright: "is brightly lit", goalTurns: "turns", goalFlow: "current flows", goalNoFlow: "no current",
      goalAll: "all", goalReading: "Reading", goalFrom: "from", goalTo: "to", goalMin: "at least", goalMax: "at most",
      swap: "Replace", swapBad: "Replaced – the old part was faulty.", swapGood: "Replaced – the old part was fine.",
      hintLock: "This circuit is fixed: switch, use the sliders and measure.",
      noteRow: "Note the readings", clearRows: "Clear the table", readings: "Readings", number: "No.",
      noMeter: "There is no measuring instrument in the circuit.",
      solar: "Solar cell", dynamo: "Hand generator", relay: "Relay", magnet: "Electro­magnet", speaker: "Loud­speaker",
      ntc: "Thermistor (NTC)", voltmeter: "Voltmeter", ammeter: "Ammeter", wattmeter: "Power meter", siggen: "Signal generator",
      openVolts: "Open-circuit voltage in full light", shortAmps: "Short-circuit current in full light",
      crank: "Crank", stopCrank: "Stop", cranking: "is being cranked", pace: "Speed", fullVolts: "Voltage at full speed",
      relayOn: "is energised", relayOff: "is released", coilVolts: "Rated coil voltage", coilOhm: "Coil resistance",
      magnetOn: "attracts paper clips", magnetOff: "attracts nothing", clipOne: "attracts 1 paper clip", clipMany: "attracts {n} paper clips",
      speakerOn: "vibrates (sound waves)", temperature: "Temperature", at25: "Resistance at 25 °C",
      wave: "Waveform", sine: "Sine", square: "Square", triangle: "Triangle", peak: "Peak voltage",
      channels: "Channels", oneChannel: "1 channel", twoChannels: "2 channels", modeW: "Power (W)"
    }
  };

  LC.text = function (key, lang) {
    var table = LC.strings[lang] || LC.strings.de;
    return table[key] !== undefined ? table[key] : (LC.strings.en[key] !== undefined ? LC.strings.en[key] : key);
  };

  // ---------------------------------------------------------------- Zahlen

  /**
   * Zahl mit Vorsatz und Einheit: 0.09 A → "90,0 mA" (drei Stellen wie ein Messgerät).
   * short = true kürzt für Beschriftungen: 4.5 V → "4,5 V", 100 Ω → "100 Ω".
   */
  LC.format = function (x, unit, lang, short) {
    if (typeof x !== "number" || Number.isNaN(x)) return "– " + unit;
    if (!Number.isFinite(x)) return "∞ " + unit;
    if (Math.abs(x) < 1e-9) return "0 " + unit;
    var steps = [[1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"]];
    var step = steps[steps.length - 1];
    for (var k = 0; k < steps.length; k++) if (Math.abs(x) >= steps[k][0]) { step = steps[k]; break; }
    var v = x / step[0], a = Math.abs(v);
    var s = v.toFixed(a >= 100 ? 0 : a >= 10 ? 1 : 2);
    if (short && s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, "");
    if (lang !== "en") s = s.replace(".", ",");
    return s.replace("-", "−") + " " + step[1] + unit;
  };

  // ---------------------------------------------------------------- Zeichenhilfen

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function lead(x1, x2) { return '<line class="lc-lead" x1="' + x1 + '" y1="0" x2="' + x2 + '" y2="0"/>'; }
  function line(x1, y1, x2, y2, cls) {
    return '<line class="' + (cls || "lc-line") + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
  }
  /** Text, der auch in einem gedrehten Bauteil aufrecht bleibt. anchor: "middle" (Vorgabe), "start" oder "end". */
  function label(ctx, x, y, s, cls, anchor) {
    var back = ctx.rot ? ' transform="rotate(' + -90 * ctx.rot + " " + x + " " + y + ')"' : "";
    return '<text class="' + (cls || "lc-text") + '" x="' + x + '" y="' + y + '" text-anchor="' + (anchor || "middle") + '" dominant-baseline="central"' + back + ">" + esc(s) + "</text>";
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  LC.escape = esc;
  LC.label = label;

  var T2 = [[-1, 0], [1, 0]];
  var WOOD = 'fill="#c9a06a" stroke="#8d6a3c" stroke-width="1.5"';

  // ---------------------------------------------------------------- Quellen

  function sourceElements(p) { return [{ kind: "V", a: 0, b: 1, v: p.value, r: R_SRC }]; }

  P.battery = {
    /** ohm ist der Innenwiderstand: Vorgabe 0,01 Ω (fast ideal); mit z. B. 1 Ω sinkt die Spannung unter Last. */
    terminals: T2, defaults: { value: 4.5, ohm: R_SRC, form: "flat" }, source: true, box: [-32, -20, 64, 40],
    /** form ist die Bauform: cell (Mignonzelle), flat (Flachbatterie), block (9-V-Block), coin (Knopfzelle). */
    options: { form: ["cell", "flat", "block", "coin"] },
    /** Ohne Angabe richtet sich die Bauform nach der Spannung. */
    init: function (p, raw) {
      if (raw.form === undefined) p.form = p.value <= 2 ? "cell" : p.value <= 3.5 ? "coin" : p.value >= 8 ? "block" : "flat";
    },
    elements: function (p) { return [{ kind: "V", a: 0, b: 1, v: p.value, r: Math.max(p.ohm, 1e-3) }]; },
    caption: function (p, lang) {
      return LC.format(p.value, "V", lang, true) + (p.ohm >= 0.05 ? " · " + LC.format(p.ohm, "Ω", lang, true) : "");
    },
    controls: [
      { prop: "form", kind: "select", label: "form",
        options: [["cell", "formCell"], ["flat", "formFlat"], ["block", "formBlock"], ["coin", "formCoin"]],
        set: function (p, form) {                                     // die Bauform bringt ihre übliche Spannung mit
          var volts = { cell: 1.5, flat: 4.5, block: 9, coin: 3 }[form];
          if (volts === undefined) return;
          p.form = form; p.value = volts;
        } },
      { prop: "value", kind: "number", unit: "V", min: 0, max: 400, step: 0.5 },
      { prop: "ohm", kind: "number", label: "inner", unit: "Ω", min: 0, step: "any" }
    ],
    draw: function (p, r, ctx) {
      if (ctx.view === "symbol") {
        var plus = label(ctx, -18, -11, "+", "lc-text lc-sign");
        if (p.form === "cell" || p.form === "coin")                  // eine Zelle
          return lead(-40, -4) + lead(4, 40) + line(-4, -14, -4, 14) + line(4, -7, 4, 7, "lc-line lc-thick") + plus;
        return lead(-40, -10) + lead(10, 40) + line(-10, -14, -10, 14) + line(-5, -7, -5, 7, "lc-line lc-thick") +   // mehrere Zellen
          line(-5, 0, 5, 0, "lc-line lc-dashed") + line(5, -14, 5, 14) + line(10, -7, 10, 7, "lc-line lc-thick") + plus;
      }
      if (p.form === "block")                                         // 9-V-Block: dunkles Gehäuse, zwei Druckknöpfe
        return lead(-40, -27) + lead(27, 40) +
          '<rect x="-21" y="-14" width="42" height="28" rx="3" fill="#2b2f36" stroke="#14161a" stroke-width="1.5"/>' +
          '<rect x="-21" y="-14" width="42" height="7" rx="3" fill="#b8862b"/>' +
          '<circle cx="-25" r="4" fill="#d0d0d0" stroke="#777"/><path d="M20 -5 h6 l3 5 l-3 5 h-6 z" fill="#d0d0d0" stroke="#777"/>' +
          label(ctx, -11, 3, "+", "lc-text lc-on-dark") + label(ctx, 11, 3, "−", "lc-text lc-on-dark");
      if (p.form === "coin")                                          // Knopfzelle
        return lead(-40, -15) + lead(15, 40) + '<circle r="15" fill="#cfd3d8" stroke="#8a8f96" stroke-width="1.5"/>' +
          '<circle r="11" fill="none" stroke="#aeb3ba"/>' + label(ctx, 0, 0, "+", "lc-text lc-sign");
      if (p.form === "cell")                                          // Mignonzelle
        return lead(-40, -28) + lead(28, 40) +
          '<rect x="-29" y="-4" width="6" height="8" rx="1.5" fill="#b9b9b9" stroke="#777"/>' +
          '<rect x="-24" y="-10" width="48" height="20" rx="4" fill="#2f6fb2" stroke="#1d4c80" stroke-width="1.5"/>' +
          '<path d="M-20 -10 h8 v20 h-8 a4 4 0 0 1 -4 -4 v-12 a4 4 0 0 1 4 -4 z" fill="#c0392b"/>' +
          label(ctx, -17, 0, "+", "lc-text lc-on-dark") + label(ctx, 14, 0, "−", "lc-text lc-on-dark");
      return lead(-40, -30) + lead(30, 40) +                          // Flachbatterie: zwei Blechstreifen
        '<rect x="-31" y="-3" width="10" height="6" fill="#c9a23a" stroke="#8d6f22"/><rect x="21" y="-3" width="10" height="6" fill="#c9a23a" stroke="#8d6f22"/>' +
        '<rect x="-22" y="-15" width="44" height="30" rx="3" fill="#2f6fb2" stroke="#1d4c80" stroke-width="1.5"/>' +
        '<rect x="-22" y="-15" width="44" height="8" rx="3" fill="#e3e7ec"/>' +
        label(ctx, -13, 3, "+", "lc-text lc-on-dark") + label(ctx, 13, 3, "−", "lc-text lc-on-dark");
    }
  };

  P.source = {
    terminals: T2, defaults: { value: 6 }, source: true, box: [-32, -22, 64, 44],
    elements: sourceElements,
    // Im Bild steht die Spannung im Display; steht das Gerät senkrecht, passt sie dort nicht hinein und steht daneben.
    caption: function (p, lang, r, ctx) { return ctx && ctx.view !== "symbol" && !(ctx.rot % 2) ? "" : LC.format(p.value, "V", lang, true); },
    controls: [{ prop: "value", kind: "range", unit: "V", min: 0, max: 24, step: 0.5 }],
    draw: function (p, r, ctx) {
      if (ctx.view === "symbol")
        return lead(-40, -14) + lead(14, 40) + '<circle r="14" class="lc-sym"/>' +
          label(ctx, -6, 0, "+", "lc-text lc-sign") + label(ctx, 6, 0, "−", "lc-text lc-sign");
      return lead(-40, -28) + lead(28, 40) +
        '<rect x="-28" y="-18" width="56" height="36" rx="4" fill="#4a4f57" stroke="#2c3036" stroke-width="1.5"/>' +
        '<rect x="-19" y="-14" width="38" height="14" rx="2" fill="#b9e3b0" stroke="#6f8f69"/>' +
        (ctx.rot % 2 ? "" : label(ctx, 0, -7, LC.format(p.value, "V", ctx.lang, true), "lc-text lc-display")) +
        '<circle cx="-19" cy="9" r="4.5" fill="#c0392b" stroke="#7d241a"/><circle cx="19" cy="9" r="4.5" fill="#1b1b1b" stroke="#000"/>' +
        label(ctx, -8, 9, "+", "lc-text lc-on-dark") + label(ctx, 8, 9, "−", "lc-text lc-on-dark");
    }
  };

  // ---------------------------------------------------------------- Widerstand und Lampe

  var BAND = ["#111111", "#7a4a1e", "#d62828", "#f08a1c", "#f4d21f", "#2a9d3c", "#2563c9", "#8e44ad", "#888888", "#ffffff"];
  /** Drei Farbringe: zwei Ziffern und der Multiplikator (ab 10 Ω). */
  function bands(value) {
    if (!(value >= 10)) return "";
    var exp = Math.floor(Math.log10(value)) - 1, digits = Math.round(value / Math.pow(10, exp));
    if (digits >= 100) { digits = 10; exp++; }
    if (exp > 9) return "";
    return [BAND[Math.floor(digits / 10)], BAND[digits % 10], BAND[exp]].map(function (color, k) {
      return '<rect x="' + (-12 + k * 8) + '" y="-7" width="4.5" height="14" fill="' + color + '"/>';
    }).join("");
  }

  P.resistor = {
    terminals: T2, defaults: { value: 100 }, box: [-30, -20, 60, 40],
    elements: function (p) { return [{ kind: "R", a: 0, b: 1, r: Math.max(p.value, 1e-3) }]; },
    caption: function (p, lang) { return LC.format(p.value, "Ω", lang, true); },
    controls: [{ prop: "value", kind: "number", unit: "Ω", units: [["Ω", 1], ["kΩ", 1e3], ["MΩ", 1e6]], min: 0, step: "any" }],
    draw: function (p, r, ctx) {
      if (ctx.view === "symbol") return lead(-40, -20) + lead(20, 40) + '<rect class="lc-sym" x="-20" y="-8" width="40" height="16"/>';
      return lead(-40, -18) + lead(18, 40) +
        '<rect x="-18" y="-7" width="36" height="14" rx="6" fill="#e2c79a" stroke="#9a7b4f" stroke-width="1.2"/>' + bands(p.value);
    }
  };

  /**
   * Sichtbares Licht einer Glühlampe im Verhältnis zum Nennbetrieb. Der Lichtstrom fällt viel schneller
   * als die Leistung (etwa mit der Leistung hoch 1,7): bei halber Spannung bleibt rund ein Zehntel.
   */
  function lampLight(power, nominal) {
    return clamp(Math.pow(Math.max(power, 0) / (nominal || 1), 1.7), 0, 1.6);
  }

  var LAMP_LIMIT = 2.25;       // ab dem 2,25-Fachen der Nennleistung (1,5-fache Nennspannung) brennt der Glühfaden durch

  P.lamp = {
    /** value: Widerstand in Ω, power: Nennleistung in W. Vorgabe 15 Ω und 1,35 W, also 4,5 V / 0,3 A. */
    terminals: T2, defaults: { value: 15, power: 1.35, blown: false }, box: [-30, -34, 60, 54],
    elements: function (p) { return p.blown ? [] : [{ kind: "R", a: 0, b: 1, r: Math.max(p.value, 1e-3) }]; },
    after: function (p, r) {
      if (p.blown || !r.i.length || (r.v[0] - r.v[1]) * r.i[0] <= LAMP_LIMIT * p.power) return false;
      p.blown = true;
      return "blown";
    },
    tap: function (p) { if (p.blown) p.blown = false; },
    advance: function (p, r, env) {
      var s = p._s || (p._s = { b: 0 });
      var target = r.i.length ? lampLight((r.v[0] - r.v[1]) * r.i[0], p.power) : 0;
      s.b += (target - s.b) * (1 - Math.exp(-env.dt / 0.06));          // der Glühfaden ist träge (etwa 60 ms)
    },
    observe: function (p, r, env) {
      r.power = r.i.length ? (r.v[0] - r.v[1]) * r.i[0] : 0;
      r.brightness = p.blown ? 0 : env && p._s ? p._s.b : lampLight(r.power, p.power);
    },
    state: function (p, r, lang) {
      var b = r ? r.brightness : 0;
      return LC.text(p.blown ? "blown" : b > 0.5 ? "lampOn" : b > 0.015 ? "lampDim" : "lampOff", lang);
    },
    /** Unter der Lampe steht ihre Nennspannung – kurz, damit die Beschriftung keine Leitung daneben verdeckt. */
    caption: function (p, lang) {
      return p.blown ? LC.text("broken", lang) : LC.format(Math.sqrt(p.power * p.value), "V", lang, true);
    },
    controls: [
      { kind: "number", label: "nominal", unit: "V", min: 0.5, step: 0.5,
        get: function (p) { return Math.sqrt(p.power * p.value); },
        set: function (p, volts) {                                        // der Nennstrom bleibt, Widerstand und Leistung folgen
          var amps = Math.sqrt(p.power / Math.max(p.value, 1e-3));
          volts = Math.max(volts, 0.1);
          p.value = volts / amps; p.power = volts * amps;
        } },
      { prop: "blown", kind: "replace", label: "replaceLamp" }
    ],
    draw: function (p, r, ctx) {
      if (p.blown) {
        var broken = '<path class="lc-line" d="M-3 -3 L3 3 M-3 3 L3 -3" opacity="0.6"/>';
        if (ctx.view === "symbol")
          return lead(-40, -14) + lead(14, 40) + '<circle r="14" class="lc-sym lc-dead"/>' +
            '<path class="lc-line" stroke-dasharray="3 3" d="M-9.9 -9.9 L-3 -3 M3 3 L9.9 9.9 M-9.9 9.9 L-3 3 M3 -3 L9.9 -9.9"/>';
        return lead(-40, -9) + lead(9, 40) +
          '<rect x="-9" y="-1" width="18" height="13" rx="2" fill="#b9b9b9" stroke="#777"/>' +
          line(-9, 3, 9, 3, "lc-thread") + line(-9, 7, 9, 7, "lc-thread") +
          '<circle cx="0" cy="-10" r="13" fill="#c9c6bd" stroke="#8a8a8a" stroke-width="1.5"/>' +
          '<path d="M-5 -1 L-3 -10 M3 -10 L5 -1" fill="none" stroke="#555" stroke-width="1.5"/>' +
          '<g transform="translate(0 -12)">' + broken + "</g>";
      }
      var b = r && r.brightness ? r.brightness : 0;
      var glow = Math.min(1, Math.pow(b, 0.6)), on = glow.toFixed(2);
      // schwaches Leuchten ist orange, volles gelb – wie bei einem Glühfaden, der heißer wird
      var warm = clamp(b / 0.5, 0, 1), color = "rgb(255," + Math.round(122 + 94 * warm) + "," + Math.round(26 + 48 * warm) + ")";
      var rays = "";
      if (glow > 0.15) {
        var cy = ctx.view === "symbol" ? 0 : -8, inner = ctx.view === "symbol" ? 18 : 17, outer = inner + 3 + 7 * glow;
        for (var k = 0; k < 8; k++) {
          var w = (k * Math.PI) / 4 + Math.PI / 8;
          if (ctx.view !== "symbol" && Math.sin(w) > 0.5) continue;        // unten sitzt die Fassung
          rays += '<line class="lc-ray" x1="' + (Math.cos(w) * inner).toFixed(1) + '" y1="' + (cy + Math.sin(w) * inner).toFixed(1) +
            '" x2="' + (Math.cos(w) * outer).toFixed(1) + '" y2="' + (cy + Math.sin(w) * outer).toFixed(1) + '"/>';
        }
      }
      if (ctx.view === "symbol")
        return lead(-40, -14) + lead(14, 40) +
          '<circle r="' + (14 + 12 * glow).toFixed(1) + '" fill="url(#' + ctx.uid + '-glow)" opacity="' + on + '"/>' +
          '<circle r="14" class="lc-sym"/><circle r="14" fill="' + color + '" opacity="' + on + '"/>' +
          line(-9.9, -9.9, 9.9, 9.9) + line(-9.9, 9.9, 9.9, -9.9) + rays;
      return lead(-40, -9) + lead(9, 40) +
        '<circle cx="0" cy="-8" r="' + (15 + 14 * glow).toFixed(1) + '" fill="url(#' + ctx.uid + '-glow)" opacity="' + on + '"/>' +
        '<rect x="-9" y="-1" width="18" height="13" rx="2" fill="#b9b9b9" stroke="#777"/>' +
        line(-9, 3, 9, 3, "lc-thread") + line(-9, 7, 9, 7, "lc-thread") +
        '<circle cx="0" cy="-10" r="13" fill="#f4f4ee" stroke="#8a8a8a" stroke-width="1.5"/>' +
        '<circle cx="0" cy="-10" r="13" fill="' + color + '" opacity="' + on + '"/>' +
        '<path d="M-5 -1 L-3 -12 L0 -7 L3 -12 L5 -1" fill="none" stroke="' + (glow > 0.05 ? "#d97a00" : "#777") + '" stroke-width="1.5"/>' + rays;
    }
  };

  // ---------------------------------------------------------------- Schalter, Taster, Umschalter

  P.switch = {
    terminals: T2, defaults: { closed: false }, box: [-30, -24, 60, 40],
    elements: function (p) { return p.closed ? [{ kind: "R", a: 0, b: 1, r: R_ON }] : []; },
    tap: function (p) { p.closed = !p.closed; },
    state: function (p, r, lang) { return LC.text(p.closed ? "closed" : "open", lang); },
    controls: [{ prop: "closed", kind: "toggle", on: "toOpen", off: "toClose" }],
    draw: function (p, r, ctx) {
      if (ctx.view === "symbol")
        return lead(-40, -14) + lead(14, 40) + '<circle cx="-14" r="2.4" class="lc-dot"/><circle cx="14" r="2.4" class="lc-dot"/>' +
          (p.closed ? line(-14, 0, 14, 0) : line(-14, 0, 11, -14));
      var end = p.closed ? [20, 0] : [13, -18];
      return lead(-40, -20) + lead(20, 40) + '<rect x="-28" y="-9" width="56" height="18" rx="3" ' + WOOD + "/>" +
        '<circle cx="-20" r="4" fill="#9a9a9a" stroke="#666"/><circle cx="20" r="4" fill="#9a9a9a" stroke="#666"/>' +
        line(-20, 0, end[0], end[1], "lc-lever") + '<circle cx="' + end[0] + '" cy="' + end[1] + '" r="4.5" fill="#c0392b" stroke="#7d241a"/>';
    }
  };

  P.button = {
    terminals: T2, defaults: {}, box: [-30, -24, 60, 40],
    elements: function (p) { return p.pressed ? [{ kind: "R", a: 0, b: 1, r: R_ON }] : []; },
    hold: true,
    state: function (p, r, lang) { return LC.text(p.pressed ? "pressed" : "released", lang); },
    draw: function (p, r, ctx) {
      var y = p.pressed ? 0 : -8;
      if (ctx.view === "symbol")
        return lead(-40, -14) + lead(14, 40) + '<circle cx="-14" r="2.4" class="lc-dot"/><circle cx="14" r="2.4" class="lc-dot"/>' +
          line(-15, y, 15, y) + line(0, y, 0, y - 10) + line(-5, y - 10, 5, y - 10);
      return lead(-40, -20) + lead(20, 40) + '<rect x="-28" y="-9" width="56" height="18" rx="3" ' + WOOD + "/>" +
        '<circle cx="-20" r="4" fill="#9a9a9a" stroke="#666"/><circle cx="20" r="4" fill="#9a9a9a" stroke="#666"/>' +
        line(-17, y / 2 - 1, 17, y / 2 - 1, "lc-contact") +
        '<circle cx="0" cy="' + (y / 2 - 3) + '" r="' + (p.pressed ? 8.5 : 9.5) + '" fill="' + (p.pressed ? "#962d22" : "#c0392b") + '" stroke="#7d241a" stroke-width="1.5"/>';
    }
  };

  P.changeover = {
    terminals: [[-1, 0], [1, -1], [1, 1]], defaults: { pos: 0 }, box: [-30, -50, 76, 100],
    elements: function (p) { return [{ kind: "R", a: 0, b: p.pos ? 2 : 1, r: R_ON }]; },
    clean: function (p) { p.pos = p.pos ? 1 : 0; },
    tap: function (p) { p.pos = p.pos ? 0 : 1; },
    state: function (p, r, lang) { return p.pos ? "2" : "1"; },
    controls: [{ prop: "pos", kind: "flip", label: "flip" }],
    draw: function (p, r, ctx) {
      var y = p.pos ? 40 : -40;
      if (ctx.view === "symbol")
        return lead(-40, -14) + line(16, -40, 40, -40, "lc-lead") + line(16, 40, 40, 40, "lc-lead") +
          '<circle cx="-14" r="2.4" class="lc-dot"/><circle cx="16" cy="-40" r="2.4" class="lc-dot"/><circle cx="16" cy="40" r="2.4" class="lc-dot"/>' +
          line(-14, 0, 15, y * 0.93);
      return lead(-40, -18) + line(16, -40, 40, -40, "lc-lead") + line(16, 40, 40, 40, "lc-lead") +
        '<rect x="-26" y="-48" width="50" height="96" rx="4" ' + WOOD + "/>" +
        '<circle cx="-18" r="4" fill="#9a9a9a" stroke="#666"/><circle cx="16" cy="-40" r="4" fill="#9a9a9a" stroke="#666"/><circle cx="16" cy="40" r="4" fill="#9a9a9a" stroke="#666"/>' +
        line(-18, 0, 16, y, "lc-lever") + '<circle cx="' + 2 + '" cy="' + y * 0.59 + '" r="4.5" fill="#c0392b" stroke="#7d241a"/>';
    }
  };

  // ---------------------------------------------------------------- Sicherung

  P.fuse = {
    terminals: T2, defaults: { value: 1, blown: false }, box: [-30, -20, 60, 40],
    elements: function (p) { return p.blown ? [] : [{ kind: "R", a: 0, b: 1, r: R_ON }]; },
    after: function (p, r) {
      if (p.blown || !r.i.length || Math.abs(r.i[0]) <= p.value) return false;
      p.blown = true;
      return "blown";
    },
    tap: function (p) { if (p.blown) p.blown = false; },
    state: function (p, r, lang) { return LC.text(p.blown ? "blown" : "intact", lang); },
    caption: function (p, lang) { return LC.format(p.value, "A", lang, true); },
    controls: [{ prop: "value", kind: "number", unit: "A", min: 0, step: "any" }, { prop: "blown", kind: "replace", label: "replaceFuse" }],
    draw: function (p, r, ctx) {
      var wire = p.blown
        ? '<path class="lc-line" d="M-13 0 L-5 0 M5 0 L13 0"/><path class="lc-line" d="M-3 -3 L3 3 M-3 3 L3 -3"/>'
        : line(-13, 0, 13, 0);
      if (ctx.view === "symbol")
        return lead(-40, -20) + lead(20, 40) + '<rect class="lc-sym" x="-20" y="-7" width="40" height="14"/>' +
          (p.blown ? '<path class="lc-line" d="M-20 0 L-6 0 M6 0 L20 0 M-3 -3 L3 3 M-3 3 L3 -3"/>' : line(-20, 0, 20, 0));
      return lead(-40, -22) + lead(22, 40) +
        '<rect x="-14" y="-6" width="28" height="12" fill="' + (p.blown ? "#d9d4c9" : "#eaf6fb") + '" stroke="#8aa0a8"/>' + wire +
        '<rect x="-22" y="-7" width="8" height="14" rx="1.5" fill="#b4b4b4" stroke="#777"/><rect x="14" y="-7" width="8" height="14" rx="1.5" fill="#b4b4b4" stroke="#777"/>';
    }
  };

  // ---------------------------------------------------------------- Schiebewiderstand

  P.potentiometer = {
    terminals: [[-1, 0], [1, 0], [0, 1]], defaults: { value: 100, pos: 0.5 }, box: [-30, -20, 60, 66],
    elements: function (p) {
      return [
        { kind: "R", a: 0, b: 2, r: Math.max(p.value * p.pos, 1e-3) },
        { kind: "R", a: 2, b: 1, r: Math.max(p.value * (1 - p.pos), 1e-3) }
      ];
    },
    clean: function (p) { p.pos = clamp(p.pos, 0, 1); },
    caption: function (p, lang) { return LC.format(p.value, "Ω", lang, true); },
    captionAt: [0, -23],         // über dem Bauteil: darunter laufen der Abgriff und seine Leitung
    controls: [
      { prop: "value", kind: "number", unit: "Ω", units: [["Ω", 1], ["kΩ", 1e3], ["MΩ", 1e6]], min: 0, step: "any" },
      { prop: "pos", kind: "range", label: "slider", min: 0, max: 1, step: 0.01 }
    ],
    draw: function (p, r, ctx) {
      var x = (-16 + 32 * p.pos).toFixed(1);
      if (ctx.view === "symbol")
        return lead(-40, -20) + lead(20, 40) + '<rect class="lc-sym" x="-20" y="-8" width="40" height="16"/>' +
          '<path class="lc-line" d="M0 40 L0 25 L' + x + " 25 L" + x + ' 14"/>' +
          '<path class="lc-dot" d="M' + x + " 9 l-4 7 l8 0 z" + '"/>';
      return lead(-40, -24) + lead(24, 40) + line(0, 40, 0, 9, "lc-lead") +
        '<rect x="-24" y="-9" width="48" height="18" rx="3" fill="#3d4450" stroke="#23272e" stroke-width="1.5"/>' +
        line(-18, 0, 18, 0, "lc-track") +
        '<rect x="' + (x - 4) + '" y="-13" width="8" height="26" rx="2" fill="#e67e22" stroke="#a85a12" stroke-width="1.2"/>';
    }
  };

  // ---------------------------------------------------------------- Multimeter

  var MODE_UNIT = { V: "V", A: "A", R: "Ω", W: "W" };

  /** Im Zeitverlauf mittelt ein Messgerät über ein Messfenster (ganze Perioden, mindestens 0,1 s).
   *  Gemittelt werden Spannung, Strom und Leistung (u·i, für den Leistungsmesser). */
  function meterAdvance(p, r, env) {
    var s = p._s || (p._s = { n: 0, u: 0, uu: 0, i: 0, ii: 0, w: 0, out: null });
    var u = meterVolts(p, r), i = r.i[0];
    s.n++; s.u += u; s.uu += u * u; s.i += i; s.ii += i * i; s.w += u * i;
    if (s.n >= env.window) {
      s.out = { u: s.u / s.n, uu: Math.sqrt(s.uu / s.n), i: s.i / s.n, ii: Math.sqrt(s.ii / s.n), w: s.w / s.n };
      s.n = 0; s.u = s.uu = s.i = s.ii = s.w = 0;
    }
  }
  /** Die Spannung, die das Gerät sieht: zwischen seinen Klemmen – beim Leistungsmesser zwischen Ausgang und Rückleitung. */
  function meterVolts(p, r) { return p.type === "wattmeter" ? r.v[1] - r.v[2] : r.v[0] - r.v[1]; }
  /** Der Messwert: Gleichgröße als Mittelwert, Wechselgröße als Effektivwert mit "~" (r.ac). */
  function meterObserve(mode, p, r, env) {
    var u = meterVolts(p, r), i = r.i[0], out = env && p._s ? p._s.out : null;
    r.unit = MODE_UNIT[mode]; r.ac = false;
    if (mode === "R") {
      if (out) { u = out.u; i = out.i; }
      r.reading = Math.abs(i) > 1e-12 ? u / i : Infinity;
    } else if (mode === "W") {
      r.reading = out ? out.w : u * i;                                  // Wirkleistung: Mittelwert von u·i
    } else if (!out) {
      r.reading = mode === "A" ? i : u;
    } else {
      var mean = mode === "A" ? out.i : out.u, rms = mode === "A" ? out.ii : out.uu;
      if (Math.abs(mean) >= 0.2 * rms) r.reading = mean;               // Gleichgröße: Mittelwert
      else { r.reading = rms; r.ac = rms > 1e-9; }                      // Wechselgröße: Effektivwert, mit "~"
    }
    // Was ein echtes Messgerät nicht mehr auflöst, zeigt es als null (z. B. den Sperrstrom einer Diode).
    var floor = { A: 1e-7, V: 1e-6, W: 1e-6 }[mode];
    if (floor && Math.abs(r.reading) < floor) { r.reading = 0; r.ac = false; }
  }
  function meterState(p, r, lang) { return r && r.unit ? (r.ac ? "~ " : "") + LC.format(r.reading, r.unit, lang) : ""; }

  P.multimeter = {
    /**
     * Anschluss 0 ist die rote Klemme (Plus), Anschluss 1 die schwarze (COM). Die Klemmen hängen an
     * Messleitungen: a und b sind ihre Rasterpunkte [x, y]. Ohne Angabe (null) stecken sie links und
     * rechts am Gerät und wandern mit ihm.
     */
    terminals: T2, defaults: { mode: "V", a: null, b: null }, options: { mode: ["V", "A", "R"] }, box: [-32, -36, 64, 60],
    probes: true,
    meter: true,                 // zeigt einen Messwert: zählt für die Ziele einer Aufgabe und für die Messwerttabelle
    instrument: true,            // seine Einstellungen bleiben auch in einer gesperrten Schaltung bedienbar
    column: function (p) { return MODE_UNIT[p.mode]; },
    sockets: { picture: [[-18, 9], [18, 9]], symbol: [[-16, 0], [16, 0]] },      // dort beginnen die Messleitungen
    home: function (p, k) {
      var r = LC.rotate(T2[k][0], T2[k][1], p.rot || 0);
      return [p.x + r[0], p.y + r[1]];
    },
    points: function (p) { return [p.a || P.multimeter.home(p, 0), p.b || P.multimeter.home(p, 1)]; },
    clean: function (p) {
      ["a", "b"].forEach(function (key) {
        var v = p[key];
        p[key] = Array.isArray(v) && v.length === 2 && Number.isFinite(Number(v[0])) && Number.isFinite(Number(v[1]))
          ? [Math.round(Number(v[0])), Math.round(Number(v[1]))] : null;
      });
    },
    elements: function (p) {
      if (p.mode === "A") return [{ kind: "R", a: 0, b: 1, r: R_ON }];
      if (p.mode === "R") return [{ kind: "V", a: 0, b: 1, v: 1, r: 1000 }];     // Prüfspannung für die Widerstandsmessung
      return [{ kind: "R", a: 0, b: 1, r: R_VOLT }];
    },
    advance: meterAdvance,
    observe: function (p, r, env) { meterObserve(p.mode, p, r, env); },
    state: meterState,
    controls: [{ prop: "mode", kind: "select", label: "mode", options: [["V", "modeV"], ["A", "modeA"], ["R", "modeR"]] }],
    draw: function (p, r, ctx) {
      var unit = MODE_UNIT[p.mode], reading = meterState(p, r, ctx.lang);
      // Die Messleitungen mit den Klemmen zeichnet die Arbeitsfläche, weil sie über das Gerät hinausreichen.
      if (ctx.view === "symbol")
        return '<circle r="16" class="lc-sym"/>' + label(ctx, 0, 0, unit, "lc-text lc-mode") +
          label(ctx, -23, -10, "+", "lc-text lc-sign") + label(ctx, 0, 28, reading, "lc-text lc-reading");
      return '<rect x="-28" y="-34" width="56" height="54" rx="6" fill="#f2c230" stroke="#b8901a" stroke-width="1.5"/>' +
        '<rect x="-24" y="-29" width="48" height="17" rx="2" fill="#d5e8cf" stroke="#7c8f77"/>' +
        label(ctx, 0, -20.5, reading, "lc-text lc-display") + label(ctx, 0, -2, unit, "lc-text lc-mode") +
        '<circle cx="-18" cy="9" r="5" fill="#c0392b" stroke="#7d241a"/><circle cx="18" cy="9" r="5" fill="#1b1b1b" stroke="#000"/>';
    }
  };

  // ---------------------------------------------------------------- Wechselspannungsquelle

  /** Zahl ohne Vorsatz, höchstens drei Stellen: 0.5 → "0,5". */
  function plain(x, lang) {
    var s = String(+x.toPrecision(3));
    return lang !== "en" ? s.replace(".", ",") : s;
  }

  P.acsource = {
    terminals: T2, defaults: { value: 6, freq: 50 }, source: true, dynamic: true, box: [-32, -22, 64, 44],
    frequency: function (p) { return p.freq; },
    /** value ist der Effektivwert. Im Ruhezustand (ohne Zeitverlauf) liefert die Quelle 0 V. */
    elements: function (p, env) {
      var v = env ? p.value * Math.SQRT2 * Math.sin(2 * Math.PI * p.freq * env.t) : 0;
      return [{ kind: "V", a: 0, b: 1, v: v, r: R_SRC }];
    },
    clean: function (p) { p.freq = clamp(p.freq, 0.1, 1000); },
    caption: function (p, lang) { return LC.format(p.value, "V", lang, true) + " · " + plain(p.freq, lang) + " Hz"; },
    controls: [
      { prop: "value", kind: "number", label: "effective", unit: "V", min: 0, max: 400, step: 0.5 },
      { prop: "freq", kind: "number", label: "frequency", unit: "Hz", min: 0.1, max: 1000, step: "any" }
    ],
    draw: function (p, r, ctx) {
      var wave = '<path class="lc-line" d="M-8 0 q4 -9 8 0 t8 0"/>';
      if (ctx.view === "symbol") return lead(-40, -14) + lead(14, 40) + '<circle r="14" class="lc-sym"/>' + wave;
      return lead(-40, -28) + lead(28, 40) +
        '<rect x="-28" y="-18" width="56" height="36" rx="4" fill="#4a4f57" stroke="#2c3036" stroke-width="1.5"/>' +
        '<rect x="-19" y="-14" width="38" height="16" rx="2" fill="#b9e3b0" stroke="#6f8f69"/>' +
        '<path d="M-8 -6 q4 -9 8 0 t8 0" fill="none" stroke="#16301a" stroke-width="1.8" stroke-linecap="round"/>' +
        '<circle cx="-19" cy="10" r="4.5" fill="#2f6fb2" stroke="#1d4c80"/><circle cx="19" cy="10" r="4.5" fill="#2f6fb2" stroke="#1d4c80"/>';
    }
  };

  // ---------------------------------------------------------------- Kondensator und Spule

  P.capacitor = {
    terminals: T2, defaults: { value: 1e-3 }, dynamic: true, box: [-30, -20, 60, 40],
    /** Im Ruhezustand sperrt der Kondensator. Im Zeitschritt ist er ein Zweig i = g·u − j (BDF2, erster Schritt Euler). */
    elements: function (p, env) {
      if (!env) return [];
      var s = p._s || (p._s = { v1: 0, v2: 0 }), c = Math.max(p.value, 1e-12);
      return env.order === 1
        ? [{ kind: "B", a: 0, b: 1, g: c / env.dt, j: (c / env.dt) * s.v1 }]
        : [{ kind: "B", a: 0, b: 1, g: (1.5 * c) / env.dt, j: (c / (2 * env.dt)) * (4 * s.v1 - s.v2) }];
    },
    advance: function (p, r) { var s = p._s; s.v2 = s.v1; s.v1 = r.v[0] - r.v[1]; },
    observe: function (p, r, env) { r.voltage = env && p._s ? p._s.v1 : null; },
    act: function (p) { p._s = null; },                                  // entladen
    caption: function (p, lang, r) {
      return LC.format(p.value, "F", lang, true) + (r && r.voltage != null ? " · " + LC.format(r.voltage, "V", lang) : "");
    },
    controls: [
      { prop: "value", kind: "number", unit: "F", units: [["nF", 1e-9], ["µF", 1e-6], ["mF", 1e-3], ["F", 1]], min: 0, step: "any" },
      { kind: "action", label: "discharge" }
    ],
    draw: function (p, r, ctx) {
      if (ctx.view === "symbol") return lead(-40, -5) + lead(5, 40) + line(-5, -13, -5, 13, "lc-line lc-plate") + line(5, -13, 5, 13, "lc-line lc-plate");
      return lead(-40, -15) + lead(15, 40) +
        '<rect x="-15" y="-11" width="30" height="22" rx="5" fill="#3b6ea5" stroke="#274a70" stroke-width="1.5"/>' +
        '<path d="M-10 -11 h5 v22 h-5 a5 5 0 0 1 -5 -5 v-12 a5 5 0 0 1 5 -5 z" fill="#a9c6e3"/>';
    }
  };

  P.inductor = {
    terminals: T2, defaults: { value: 0.5, ohm: 10 }, dynamic: true, inner: 1, box: [-30, -20, 60, 40],
    /** Wicklungswiderstand von Anschluss 0 zum inneren Knoten 2, von dort die Induktivität zu Anschluss 1. */
    elements: function (p, env) {
      var res = Math.max(p.ohm, R_ON);
      if (!env) return [{ kind: "R", a: 0, b: 1, r: res }];              // Ruhezustand: nur der Wicklungswiderstand
      var s = p._s || (p._s = { i1: 0, i2: 0 }), l = Math.max(p.value, 1e-9);
      return [
        { kind: "R", a: 0, b: 2, r: res },
        env.order === 1
          ? { kind: "B", a: 2, b: 1, g: env.dt / l, j: -s.i1 }
          : { kind: "B", a: 2, b: 1, g: (2 * env.dt) / (3 * l), j: -(4 * s.i1 - s.i2) / 3 }
      ];
    },
    advance: function (p, r) { var s = p._s; s.i2 = s.i1; s.i1 = r.i[1]; },
    caption: function (p, lang) { return LC.format(p.value, "H", lang, true); },
    controls: [
      { prop: "value", kind: "number", unit: "H", units: [["mH", 1e-3], ["H", 1]], min: 0, step: "any" },
      { prop: "ohm", kind: "number", label: "winding", unit: "Ω", min: 0, step: "any" }
    ],
    draw: function (p, r, ctx) {
      if (ctx.view === "symbol")
        return lead(-40, -20) + lead(20, 40) + '<path class="lc-line" d="M-20 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0"/>';
      var turns = "";
      for (var k = 0; k < 8; k++) turns += line(-17 + 4.6 * k, 9, -14 + 4.6 * k, -9, "lc-coil");
      return lead(-40, -20) + lead(20, 40) + '<rect x="-21" y="-5" width="42" height="10" rx="2" fill="#7b7f86" stroke="#555"/>' + turns;
    }
  };

  // ---------------------------------------------------------------- Diode und Leuchtdiode

  var R_DIODE = 0.05;      // Widerstand der leitenden Diode
  var G_OFF = 1e-9;        // Leitwert der sperrenden Diode

  /** Diode als Knickkennlinie: Bis zur Schwellenspannung sperrt sie, darüber leitet sie fast ohne Widerstand.
   *  Anschluss 0 ist die Anode, der Strom fließt nur von Anschluss 0 nach Anschluss 1. */
  function diodeElements(p, threshold) {
    return [p._on ? { kind: "B", a: 0, b: 1, g: 1 / R_DIODE, j: threshold / R_DIODE } : { kind: "B", a: 0, b: 1, g: G_OFF, j: 0 }];
  }
  /** Passt "leitet" oder "sperrt" zur Lösung? Wenn nicht: umschalten, dann wird neu gerechnet. */
  function diodeSwitch(p, r, threshold) {
    if (p._on && r.i[0] < 0) { p._on = false; return true; }
    if (!p._on && r.v[0] - r.v[1] > threshold) { p._on = true; return true; }
    return false;
  }

  P.diode = {
    /** value ist die Schwellenspannung in V. */
    terminals: T2, defaults: { value: 0.7 }, box: [-30, -20, 60, 40],
    elements: function (p) { return diodeElements(p, p.value); },
    after: function (p, r) { return diodeSwitch(p, r, p.value); },
    state: function (p, r, lang) { return LC.text(p._on ? "conducts" : "blocks", lang); },
    controls: [{ prop: "value", kind: "number", label: "threshold", unit: "V", min: 0, max: 5, step: 0.1 }],
    draw: function (p, r, ctx) {
      if (ctx.view === "symbol")
        return lead(-40, -10) + lead(10, 40) + '<path class="lc-sym" d="M-10 -10 L-10 10 L10 0 Z"/>' + line(10, -10, 10, 10);
      return lead(-40, -16) + lead(16, 40) +
        '<rect x="-16" y="-7" width="32" height="14" rx="2" fill="#2a2a2a" stroke="#000"/>' +
        '<rect x="7" y="-7" width="5" height="14" fill="#cfcfcf"/>';             // der Ring markiert die Seite, zu der der Strom fließt
    }
  };

  var LED_COLORS = { red: [1.8, "#e53935"], yellow: [2.0, "#f9c80e"], green: [2.2, "#43a047"], blue: [3.0, "#1e88e5"], white: [3.0, "#f1f3f4"] };
  var LED_NOMINAL = 0.02;      // 20 mA: volle Helligkeit
  var LED_LIMIT = 0.05;        // über 50 mA wird die Leuchtdiode zerstört – sie braucht einen Vorwiderstand

  P.led = {
    /** color bestimmt die Schwellenspannung: rot 1,8 V, gelb 2,0 V, grün 2,2 V, blau und weiß 3,0 V. */
    terminals: T2, defaults: { color: "red", blown: false }, options: { color: ["red", "yellow", "green", "blue", "white"] },
    box: [-30, -30, 60, 50],
    elements: function (p) { return p.blown ? [] : diodeElements(p, LED_COLORS[p.color][0]); },
    after: function (p, r) {
      if (p.blown || !r.i.length) return false;
      if (r.i[0] > LED_LIMIT) { p.blown = true; p._on = false; return "blown"; }
      return diodeSwitch(p, r, LED_COLORS[p.color][0]);
    },
    tap: function (p) { if (p.blown) p.blown = false; },
    advance: function (p, r, env) {                                        // kurz gemittelt, damit sie bei 50 Hz nicht flackert
      var s = p._s || (p._s = { b: 0 });
      var target = r.i.length ? clamp(r.i[0] / LED_NOMINAL, 0, 1.5) : 0;
      s.b += (target - s.b) * (1 - Math.exp(-env.dt / 0.02));
    },
    observe: function (p, r, env) {
      r.brightness = p.blown ? 0 : env && p._s ? p._s.b : r.i.length ? clamp(r.i[0] / LED_NOMINAL, 0, 1.5) : 0;
    },
    state: function (p, r, lang) {
      var b = r ? r.brightness : 0;
      return LC.text(p.blown ? "blown" : b > 0.5 ? "lampOn" : b > 0.03 ? "lampDim" : "lampOff", lang);
    },
    caption: function (p, lang) { return p.blown ? LC.text("broken", lang) : ""; },
    controls: [
      { prop: "color", kind: "select", label: "colour", options: [["red", "red"], ["yellow", "yellow"], ["green", "green"], ["blue", "blue"], ["white", "white"]] },
      { prop: "blown", kind: "replace", label: "replaceLed" }
    ],
    draw: function (p, r, ctx) {
      var color = LED_COLORS[p.color][1], b = r && r.brightness ? Math.min(1, r.brightness) : 0, glow = "", rays = "";
      if (b > 0.03) {
        glow = '<circle cx="0" cy="' + (ctx.view === "symbol" ? 0 : -6) + '" r="' + (14 + 12 * b).toFixed(1) + '" fill="' + color + '" opacity="' + (0.45 * b).toFixed(2) + '"/>';
        if (ctx.view !== "symbol" && b > 0.3)
          for (var k = 0; k < 5; k++) {
            var w = Math.PI * (1.1 + 0.2 * k);
            rays += '<line class="lc-ray" x1="' + (Math.cos(w) * 15).toFixed(1) + '" y1="' + (-6 + Math.sin(w) * 15).toFixed(1) +
              '" x2="' + (Math.cos(w) * (18 + 6 * b)).toFixed(1) + '" y2="' + (-6 + Math.sin(w) * (18 + 6 * b)).toFixed(1) + '"/>';
          }
      }
      if (ctx.view === "symbol")
        return lead(-40, -10) + lead(10, 40) + glow +
          '<path class="lc-sym' + (p.blown ? " lc-dead" : "") + '" d="M-10 -10 L-10 10 L10 0 Z"/>' + line(10, -10, 10, 10) +
          '<path class="lc-line" d="M2 -14 l7 -7 m-5 0 h5 v5 M10 -10 l7 -7 m-5 0 h5 v5"/>';
      return lead(-40, -8) + lead(8, 40) + glow +
        '<path d="M-10 8 L-10 -6 A10 10 0 0 1 10 -6 L10 8 Z" fill="' + (p.blown ? "#bdbdbd" : color) + '" opacity="' + (p.blown ? 1 : (0.55 + 0.45 * b).toFixed(2)) +
        '" stroke="#555" stroke-width="1.2"/>' +
        '<rect x="-12" y="6" width="24" height="4" rx="1" fill="' + (p.blown ? "#9e9e9e" : color) + '" stroke="#555" stroke-width="1"/>' +
        (p.blown ? '<path class="lc-line" d="M-3 -6 L3 0 M-3 0 L3 -6" opacity="0.6"/>' : "") + rays;
    }
  };

  // ---------------------------------------------------------------- Transistor

  var V_BE = 0.7, V_SAT = 0.2, R_BE = 1, R_SAT = 0.05;

  P.transistor = {
    /**
     * NPN-Transistor: Anschluss 0 Basis, 1 Kollektor, 2 Emitter; value ist der Verstärkungsfaktor.
     * Drei Zustände: sperrt (Basis unter 0,7 V) · verstärkt (Kollektorstrom = Verstärkung × Basisstrom) ·
     * durchgeschaltet (zwischen Kollektor und Emitter bleiben 0,2 V).
     */
    terminals: [[-1, 0], [1, -1], [1, 1]], defaults: { value: 100 }, box: [-30, -50, 76, 100],
    elements: function (p) {
      var mode = p._mode || "off", gain = Math.max(p.value, 1);
      var base = mode === "off" ? { kind: "B", a: 0, b: 2, g: G_OFF, j: 0 } : { kind: "B", a: 0, b: 2, g: 1 / R_BE, j: V_BE / R_BE };
      if (mode === "active")
        return [base, { kind: "G", a: 1, b: 2, c: 0, d: 2, g: gain / R_BE, j: (gain * V_BE) / R_BE }, { kind: "B", a: 1, b: 2, g: G_OFF, j: 0 }];
      if (mode === "sat") return [base, { kind: "B", a: 1, b: 2, g: 1 / R_SAT, j: V_SAT / R_SAT }];
      return [base, { kind: "B", a: 1, b: 2, g: G_OFF, j: 0 }];
    },
    after: function (p, r) {
      var mode = p._mode || "off", next = mode, gain = Math.max(p.value, 1);
      if (mode === "off") { if (r.v[0] - r.v[2] > V_BE) next = "active"; }
      else if (r.i[0] < 0) next = "off";
      else if (mode === "active") { if (r.v[1] - r.v[2] < V_SAT) next = "sat"; }
      else if (r.i[1] > gain * r.i[0] * (1 + 1e-9) + 1e-12) next = "active";
      if (next === mode) return false;
      p._mode = next;
      return true;
    },
    observe: function (p, r) { r.base = r.i[0]; r.collector = r.i[1]; },
    state: function (p, r, lang) { return LC.text(p._mode && p._mode !== "off" ? "conducts" : "blocks", lang); },
    controls: [{ prop: "value", kind: "number", label: "gain", unit: "", min: 1, step: 1 }],
    draw: function (p, r, ctx) {
      var on = p._mode && p._mode !== "off";
      if (ctx.view === "symbol")
        return lead(-40, -4) + '<circle cx="6" cy="0" r="22" class="lc-sym"/>' + line(-4, -13, -4, 13, "lc-line lc-thick") +
          '<path class="lc-line" d="M-4 -6 L18 -20 L18 -40 L40 -40 M-4 6 L18 20 L18 40 L40 40"/>' +
          '<path class="lc-dot" d="M18 20 l-9 -1.5 l4.5 -7 z"/>';                 // der Pfeil zeigt zum Emitter
      return lead(-40, -6) + '<path class="lc-lead" d="M8 -10 L20 -40 L40 -40 M8 10 L20 40 L40 40"/>' +
        '<path d="M-8 -17 H8 A9 9 0 0 1 17 -8 V8 A9 9 0 0 1 8 17 H-8 Z" fill="' + (on ? "#3a3a3a" : "#222") + '" stroke="#000" stroke-width="1.2"/>' +
        label(ctx, 3, 0, "NPN", "lc-text lc-chip");
    }
  };

  // ---------------------------------------------------------------- Fotowiderstand, Motor, Summer

  P.ldr = {
    /** light von 0 (dunkel, 1 MΩ) bis 1 (hell, etwa 320 Ω); dazwischen fällt der Widerstand gleichmäßig je Stufe. */
    terminals: T2, defaults: { light: 0.5 }, box: [-30, -26, 60, 46],
    resistance: function (p) { return Math.pow(10, 6 - 3.5 * clamp(p.light, 0, 1)); },
    elements: function (p) { return [{ kind: "R", a: 0, b: 1, r: P.ldr.resistance(p) }]; },
    clean: function (p) { p.light = clamp(p.light, 0, 1); },
    caption: function (p, lang) { return LC.format(P.ldr.resistance(p), "Ω", lang, true); },
    controls: [{ prop: "light", kind: "range", label: "light", min: 0, max: 1, step: 0.01 }],
    draw: function (p, r, ctx) {
      var arrows = '<path class="lc-line" d="M-14 -24 l7 7 m0 -5 v5 h-5 M-4 -24 l7 7 m0 -5 v5 h-5"/>';       // Licht fällt ein
      if (ctx.view === "symbol") return lead(-40, -20) + lead(20, 40) + '<rect class="lc-sym" x="-20" y="-8" width="40" height="16"/>' + arrows;
      var sun = clamp(p.light, 0, 1);
      return lead(-40, -14) + lead(14, 40) +
        '<circle r="14" fill="rgb(' + Math.round(150 + 90 * sun) + "," + Math.round(120 + 100 * sun) + "," + Math.round(90 + 40 * sun) + ')" stroke="#7a5a3a" stroke-width="1.5"/>' +
        '<path d="M-9 -6 H7 V-2 H-7 V2 H7 V6 H-9" fill="none" stroke="#8c2f1b" stroke-width="1.6"/>' + arrows;
    }
  };

  P.motor = {
    /** value: Widerstand in Ω, volts: Nennspannung. Er dreht sich mit der Spannung schneller und mit ihrem Vorzeichen andersherum. */
    terminals: T2, defaults: { value: 20, volts: 4.5 }, box: [-30, -26, 60, 46], spins: true,
    elements: function (p) { return [{ kind: "R", a: 0, b: 1, r: Math.max(p.value, 1e-3) }]; },
    /** Umdrehungen je Sekunde: unter einem Zehntel der Nennspannung läuft er nicht an, bei Nennspannung 1,5. */
    speed: function (p, r) {
      var x = r && r.v ? (r.v[0] - r.v[1]) / (p.volts || 1) : 0;
      return Math.abs(x) < 0.1 ? 0 : clamp(x, -2.5, 2.5) * 1.5;
    },
    observe: function (p, r) { r.speed = P.motor.speed(p, r); },
    state: function (p, r, lang) {
      var s = r ? r.speed : 0;
      return LC.text(s > 0 ? "turnsRight" : s < 0 ? "turnsLeft" : "stands", lang);
    },
    caption: function (p, lang) { return LC.format(p.volts, "V", lang, true); },
    controls: [{ prop: "volts", kind: "number", label: "nominal", unit: "V", min: 0.5, step: 0.5 }],
    draw: function (p, r, ctx) {
      var turn = ' transform="rotate(' + (p._a || 0).toFixed(1) + ')"';
      if (ctx.view === "symbol")
        return lead(-40, -14) + lead(14, 40) + '<circle r="14" class="lc-sym"/>' + label(ctx, 0, 0, "M", "lc-text lc-mode") +
          '<g class="lc-rotor"' + turn + '><circle cx="0" cy="-10.5" r="2" class="lc-dot"/></g>';
      return lead(-40, -17) + lead(17, 40) +
        '<circle r="17" fill="#8d99a6" stroke="#566370" stroke-width="1.5"/><circle r="13" fill="#b9c2cb"/>' +
        '<g class="lc-rotor"' + turn + ">" +
        '<path d="M0 0 L-4 -12 A4 4 0 0 1 4 -12 Z" fill="#c0392b"/>' +
        '<path d="M0 0 L-4 -12 A4 4 0 0 1 4 -12 Z" fill="#f4f4f4" transform="rotate(120)"/>' +
        '<path d="M0 0 L-4 -12 A4 4 0 0 1 4 -12 Z" fill="#f4f4f4" transform="rotate(240)"/></g>' +
        '<circle r="3" fill="#3d4450"/>';
    }
  };

  P.buzzer = {
    /** value: Widerstand in Ω, volts: Nennspannung. Ab der halben Nennspannung summt er (gezeichnet, ohne Ton). */
    terminals: T2, defaults: { value: 60, volts: 3 }, box: [-30, -28, 60, 48],
    elements: function (p) { return [{ kind: "R", a: 0, b: 1, r: Math.max(p.value, 1e-3) }]; },
    observe: function (p, r) { r.sounds = Math.abs(r.v[0] - r.v[1]) >= 0.5 * p.volts; },
    /** Ton bei eingeschaltetem Ton-Knopf: ein Summen mit 400 Hz. */
    tone: function (p, r) { return r && r.sounds ? { freq: 400, wave: "square", level: 0.5 } : null; },
    state: function (p, r, lang) { return LC.text(r && r.sounds ? "buzzes" : "silent", lang); },
    caption: function (p, lang) { return LC.format(p.volts, "V", lang, true); },
    controls: [{ prop: "volts", kind: "number", label: "nominal", unit: "V", min: 0.5, step: 0.5 }],
    draw: function (p, r, ctx) {
      var waves = r && r.sounds ? '<path class="lc-wave" d="M-8 -19 a11 11 0 0 1 16 0 M-12 -24 a17 17 0 0 1 24 0"/>' : "";
      if (ctx.view === "symbol")
        return lead(-40, -12) + lead(12, 40) + '<path class="lc-sym" d="M-13 6 A13 13 0 0 1 13 6 Z"/>' + waves;
      return lead(-40, -15) + lead(15, 40) + '<circle r="15" fill="#22262b" stroke="#000" stroke-width="1.5"/>' +
        '<circle r="4" fill="#4a5058"/>' + waves;
    }
  };

  // ---------------------------------------------------------------- Oszilloskop

  var TIMES = [0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1];      // Sekunden je Kästchen
  var VOLTS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];                                   // Volt je Kästchen
  function nearest(list, value) {
    return list.reduce(function (best, x) { return Math.abs(x - value) < Math.abs(best - value) ? x : best; }, list[0]);
  }

  P.scope = {
    /**
     * Schirm mit 10 × 8 Kästchen; lässt sich nicht drehen. Anschluss 0 ist Kanal 1, Anschluss 1 die gemeinsame Masse.
     * Mit channels: 2 kommt Anschluss 2 dazu (in der Mitte): Kanal 2, eine zweite Kurve in anderer Farbe und gestrichelt.
     */
    terminals: [[-1, 2], [1, 2]], defaults: { time: 0.005, volts: 5, channels: 1 }, dynamic: true, fixed: true, instrument: true, box: [-70, -68, 140, 150],
    points: function (p) {
      var list = [[p.x - 1, p.y + 2], [p.x + 1, p.y + 2]];
      if (p.channels === 2) list.push([p.x, p.y + 2]);
      return list;
    },
    elements: function (p) {
      var list = [{ kind: "R", a: 0, b: 1, r: R_VOLT }];
      if (p.channels === 2) list.push({ kind: "R", a: 2, b: 1, r: R_VOLT });
      return list;
    },
    clean: function (p) { p.time = nearest(TIMES, p.time); p.volts = nearest(VOLTS, p.volts); p.channels = p.channels === 2 ? 2 : 1; },
    advance: function (p, r, env) {
      var s = p._s;
      if (!s || s.time !== p.time || s.channels !== p.channels) s = p._s = { time: p.time, channels: p.channels, t: [], u: [], u2: [], last: -Infinity };
      if (env.t - s.last < p.time / 40 - 1e-12) return;                  // 400 Punkte je Schirmbreite
      s.last = env.t; s.t.push(env.t); s.u.push(r.v[0] - r.v[1]); s.u2.push(p.channels === 2 ? r.v[2] - r.v[1] : 0);
      if (s.t.length > 1200) { s.t.splice(0, 200); s.u.splice(0, 200); s.u2.splice(0, 200); }
    },
    /** Die Punkte auf dem Schirm: [x von 0 bis 1, Spannung] – für Kanal 1 (channel 0, Vorgabe) oder Kanal 2 (channel 1).
     *  Schnelle Zeitbasen stehen still (Trigger auf den letzten steigenden Durchgang durch die Mitte von Kanal 1),
     *  langsame laufen von rechts nach. */
    trace: function (p, channel) {
      var s = p._s, out = [];
      if (!s || !s.t.length || (channel && p.channels !== 2)) return out;
      var t = s.t, u = s.u, n = t.length, span = 10 * p.time, end = t[n - 1], start = end - span, k;
      if (p.time < 0.1) {
        var lo = Infinity, hi = -Infinity;
        for (k = n - 1; k >= 0 && t[k] >= end - 2 * span; k--) { lo = Math.min(lo, u[k]); hi = Math.max(hi, u[k]); }
        var mid = (lo + hi) / 2;
        if (hi - lo > 1e-6)
          for (k = n - 1; k > 0 && t[k] >= end - 2 * span; k--)
            if (t[k] <= end - span && u[k - 1] < mid && u[k] >= mid) { start = t[k]; break; }
      }
      var data = channel ? s.u2 : u;
      for (k = 0; k < n; k++) if (t[k] >= start && t[k] <= start + span) out.push([(t[k] - start) / span, data[k]]);
      return out;
    },
    controls: [
      { prop: "time", kind: "select", numeric: true, label: "timeBase", options: function (lang) { return TIMES.map(function (x) { return [x, LC.format(x, "s", lang, true)]; }); } },
      { prop: "volts", kind: "select", numeric: true, label: "voltBase", options: function (lang) { return VOLTS.map(function (x) { return [x, LC.format(x, "V", lang, true)]; }); } },
      { prop: "channels", kind: "select", numeric: true, label: "channels", options: [[1, "oneChannel"], [2, "twoChannels"]] }
    ],
    draw: function (p, r, ctx) {
      var symbol = ctx.view === "symbol", two = p.channels === 2, grid = "", k;
      var curve = function (pts) {
        var d = "";
        for (var q = 0; q < pts.length; q++)
          d += (q ? " L" : "M") + (-60 + 120 * pts[q][0]).toFixed(1) + " " + clamp(-10 - (pts[q][1] / p.volts) * 12, -58, 38).toFixed(1);
        return d;
      };
      var d = curve(P.scope.trace(p)), d2 = two ? curve(P.scope.trace(p, 1)) : "";
      for (k = 1; k < 10; k++) grid += "M" + (-60 + 12 * k) + " -58 V38 ";
      for (k = 1; k < 8; k++) grid += "M-60 " + (-58 + 12 * k) + " H60 ";
      return line(-40, 52, -40, 80, "lc-lead") + line(40, 52, 40, 80, "lc-lead") +
        (symbol
          ? '<rect class="lc-sym" x="-68" y="-66" width="136" height="118" rx="4"/>'
          : '<rect x="-68" y="-66" width="136" height="118" rx="8" fill="#dfe3e8" stroke="#8a939c" stroke-width="1.5"/>') +
        '<rect class="lc-screen' + (symbol ? " lc-plain" : "") + '" x="-60" y="-58" width="120" height="96"/>' +
        '<path class="lc-scopegrid' + (symbol ? " lc-plain" : "") + '" d="' + grid + '"/>' +
        '<path class="lc-scopeaxis' + (symbol ? " lc-plain" : "") + '" d="M0 -58 V38 M-60 -10 H60"/>' +
        (d ? '<path class="lc-trace' + (symbol ? " lc-plain" : "") + '" d="' + d + '"/>' : "") +
        (d2 ? '<path class="lc-trace lc-trace2' + (symbol ? " lc-plain" : "") + '" d="' + d2 + '"/>' : "") +
        (two ? line(0, 53, 0, 80, "lc-lead") + (symbol ? "" : '<circle cx="0" cy="53" r="4" fill="#2f6fb2" stroke="#1d4c80"/>') : "") +
        label(ctx, 0, 45, LC.format(p.time, "s", ctx.lang, true) + " · " + LC.format(p.volts, "V", ctx.lang, true), "lc-text lc-scopeinfo") +
        (symbol ? "" : '<circle cx="-40" cy="52" r="4.5" fill="#c0392b" stroke="#7d241a"/><circle cx="40" cy="52" r="4.5" fill="#1b1b1b" stroke="#000"/>');
    }
  };

  // ---------------------------------------------------------------- Paket B: Solarzelle und Handgenerator

  /** Leerlaufspannung der Solarzelle: Sie steigt mit dem Licht erst schnell, dann kaum noch
   *  (je Zehntel des Lichts 10 % weniger, wie bei einer echten Zelle). Im Dunkeln 0 V. */
  function solarVolts(p) { return p.light > 0 ? p.value * clamp(1 + Math.log10(p.light) / 10, 0, 1) : 0; }

  P.solar = {
    /**
     * light: Helligkeit von 0 (dunkel) bis 1 (volles Licht); value: Leerlaufspannung und amps: Kurzschlussstrom,
     * beide bei vollem Licht. Anschluss 0 ist der Pluspol. Der Strom, den sie höchstens liefert, wächst mit dem Licht.
     */
    terminals: T2, defaults: { light: 1, value: 3, amps: 0.05 }, source: true, box: [-30, -36, 60, 56],
    elements: function (p) {
      var v = solarVolts(p);
      if (!(v > 0) || !(p.amps > 0)) return [];                          // dunkel: sie liefert nichts
      return [{ kind: "V", a: 0, b: 1, v: v, r: Math.max(v / (p.amps * p.light), R_SRC) }];
    },
    clean: function (p) { p.light = clamp(p.light, 0, 1); },
    caption: function (p, lang) { return LC.format(solarVolts(p), "V", lang, true); },
    controls: [
      { prop: "light", kind: "range", label: "light", min: 0, max: 1, step: 0.01 },
      { prop: "value", kind: "number", label: "openVolts", unit: "V", min: 0, step: 0.1 },
      { prop: "amps", kind: "number", label: "shortAmps", unit: "A", min: 0, step: "any" }
    ],
    draw: function (p, r, ctx) {
      var sun = clamp(p.light, 0, 1);
      if (ctx.view === "symbol")
        return lead(-40, -4) + lead(4, 40) + line(-4, -14, -4, 14) + line(4, -7, 4, 7, "lc-line lc-thick") +
          label(ctx, -12, -11, "+", "lc-text lc-sign") +
          '<path class="lc-line" d="M18 -28 l-7 7 m0 -5 v5 h5 M26 -24 l-7 7 m0 -5 v5 h5"/>';      // Licht fällt ein
      var rays = "";
      if (sun > 0.02)
        for (var k = 0; k < 8; k++) {
          var w = (k * Math.PI) / 4;
          rays += '<line class="lc-ray" x1="' + (16 + Math.cos(w) * 8).toFixed(1) + '" y1="' + (-26 + Math.sin(w) * 8).toFixed(1) +
            '" x2="' + (16 + Math.cos(w) * 11).toFixed(1) + '" y2="' + (-26 + Math.sin(w) * 11).toFixed(1) + '" opacity="' + sun.toFixed(2) + '"/>';
        }
      return lead(-40, -24) + lead(24, 40) +
        '<rect x="-24" y="-12" width="48" height="24" rx="2" fill="#1d3557" stroke="#0d1b2a" stroke-width="1.5"/>' +
        '<path d="M-12 -12 V12 M0 -12 V12 M12 -12 V12 M-24 0 H24" stroke="#7fa7d9" stroke-width="1" fill="none"/>' +
        '<circle cx="16" cy="-26" r="5.5" fill="' + (sun > 0.02 ? "#ffd84a" : "#d5d9df") + '" stroke="#b88a00" stroke-width="1" opacity="' + (0.35 + 0.65 * sun).toFixed(2) + '"/>' +
        rays + label(ctx, -31, -9, "+", "lc-text lc-sign");
    }
  };

  P.dynamo = {
    /**
     * Handgenerator: liefert Spannung, solange gekurbelt wird (crank). pace ist das Tempo von 0 bis 1,
     * value die Spannung bei vollem Tempo, ohm der Widerstand der Wicklung. Anschluss 0 ist der Pluspol.
     */
    terminals: T2, defaults: { crank: false, pace: 1, value: 6, ohm: 5 }, source: true, spins: true, box: [-30, -30, 60, 50],
    volts: function (p) { return p.crank ? p.value * clamp(p.pace, 0, 1) : 0; },
    elements: function (p) { return [{ kind: "V", a: 0, b: 1, v: P.dynamo.volts(p), r: Math.max(p.ohm, 1e-3) }]; },
    clean: function (p) { p.pace = clamp(p.pace, 0, 1); },
    tap: function (p) { p.crank = !p.crank; },
    /** Umdrehungen der Kurbel je Sekunde – nur für die Zeichnung. */
    observe: function (p, r) { r.speed = p.crank && p.pace > 0 ? 0.5 + 1.5 * p.pace : 0; },
    state: function (p, r, lang) { return LC.text(p.crank ? "cranking" : "stands", lang); },
    words: ["cranking", "stands"],
    caption: function (p, lang) { return LC.format(P.dynamo.volts(p), "V", lang, true); },
    controls: [
      { prop: "crank", kind: "toggle", on: "stopCrank", off: "crank" },
      { prop: "pace", kind: "range", label: "pace", min: 0, max: 1, step: 0.05 },
      { prop: "value", kind: "number", label: "fullVolts", unit: "V", min: 0, step: 0.5 },
      { prop: "ohm", kind: "number", label: "winding", unit: "Ω", min: 0, step: "any" }
    ],
    draw: function (p, r, ctx) {
      var turn = ' transform="rotate(' + (p._a || 0).toFixed(1) + ')"';
      if (ctx.view === "symbol")
        return lead(-40, -14) + lead(14, 40) + '<circle r="14" class="lc-sym"/>' + label(ctx, 0, 0, "G", "lc-text lc-mode") +
          label(ctx, -22, -10, "+", "lc-text lc-sign") +
          '<g class="lc-rotor"' + turn + '><circle cx="0" cy="-10.5" r="2" class="lc-dot"/></g>';
      return lead(-40, -22) + lead(22, 40) +
        '<rect x="-22" y="-16" width="44" height="32" rx="5" fill="#5b7f6a" stroke="#34503f" stroke-width="1.5"/>' +
        '<circle r="12" fill="#d9dee3" stroke="#7a8590"/>' +
        '<g class="lc-rotor"' + turn + '><path d="M0 0 L0 -10" stroke="#3d4450" stroke-width="3.5" stroke-linecap="round"/>' +
        '<circle cy="-10" r="4" fill="#c0392b" stroke="#7d241a"/></g><circle r="2.5" fill="#3d4450"/>' +
        label(ctx, -30, -9, "+", "lc-text lc-sign");
    }
  };

  // ---------------------------------------------------------------- Paket B: Relais und Elektromagnet

  P.relay = {
    /**
     * Anschlüsse 0 und 1: die Spule (ohm Widerstand, volts Nennspannung); 2 und 3: der Kontakt (Schließer).
     * Spule und Kontakt sind nicht leitend verbunden. Der Kontakt schließt ab 70 % der Nennspannung an der
     * Spule und öffnet erst wieder unter 40 % – so flattert er nicht.
     */
    terminals: [[-1, -1], [-1, 1], [1, -1], [1, 1]], defaults: { volts: 6, ohm: 100 }, box: [-32, -50, 64, 100],
    elements: function (p) {
      var list = [{ kind: "R", a: 0, b: 1, r: Math.max(p.ohm, 1e-3) }];
      if (p._on) list.push({ kind: "R", a: 2, b: 3, r: R_ON });
      return list;
    },
    after: function (p, r) {
      var u = Math.abs(r.v[0] - r.v[1]);
      if (!p._on && u >= 0.7 * p.volts) { p._on = true; return true; }
      if (p._on && u < 0.4 * p.volts) { p._on = false; return true; }
      return false;
    },
    observe: function (p, r) { r.active = !!p._on; },
    state: function (p, r, lang) { return LC.text(p._on ? "relayOn" : "relayOff", lang); },
    words: ["relayOn", "relayOff"],
    caption: function (p, lang) { return LC.format(p.volts, "V", lang, true); },
    controls: [
      { prop: "volts", kind: "number", label: "coilVolts", unit: "V", min: 0.5, step: 0.5 },
      { prop: "ohm", kind: "number", label: "coilOhm", unit: "Ω", min: 0, step: "any" }
    ],
    draw: function (p, r, ctx) {
      var on = !!p._on;
      if (ctx.view === "symbol")
        return '<path class="lc-lead" d="M-40 -40 H-22 V-14 M-40 40 H-22 V14 M40 -40 H22 V-16 M40 40 H22 V16"/>' +
          '<rect class="lc-sym" x="-30" y="-14" width="16" height="28"/>' +
          '<circle cx="22" cy="-16" r="2.4" class="lc-dot"/><circle cx="22" cy="16" r="2.4" class="lc-dot"/>' +
          line(22, 16, on ? 22 : 34, on ? -16 : -10) + line(-14, 0, on ? 22 : 28, on ? 0 : 3, "lc-line lc-dashed");
      var turns = "";
      for (var k = 0; k < 9; k++) turns += line(-27, -20 + 5 * k, -11, -18 + 5 * k, "lc-coil");
      return '<rect x="-30" y="-48" width="60" height="96" rx="5" fill="#e8ecf0" stroke="#9aa4ad" stroke-width="1.2"/>' +
        '<path class="lc-lead" d="M-40 -40 H-19 V-24 M-40 40 H-19 V24 M40 -40 H22 V-28 M40 40 H22 V22"/>' +
        '<rect x="-25" y="-24" width="12" height="48" rx="2" fill="#7b7f86" stroke="#555"/>' + turns +
        '<circle cx="22" cy="-26" r="3.5" fill="#c9a23a" stroke="#8d6f22"/><circle cx="22" cy="22" r="3.5" fill="#9a9a9a" stroke="#666"/>' +
        line(22, 22, on ? 22 : 33, on ? -22 : -14, "lc-lever");
    }
  };

  var CLIP_STEP = 0.1, CLIP_MAX = 12;      // je 0,1 A eine Büroklammer, höchstens zwölf

  /** Büroklammern unter dem Eisenkern, in Reihen zu sechs. */
  function paperClips(n, top) {
    var s = "";
    for (var k = 0; k < n; k++) {
      var x = -16 + 6.4 * (k % 6), y = top + 13 * Math.floor(k / 6);
      s += '<path class="lc-paperclip" d="M' + x.toFixed(1) + " " + y + ' v8 a2.2 2.2 0 0 0 4.4 0 v-6.5 a1.5 1.5 0 0 0 -3 0 v5.5"/>';
    }
    return s;
  }

  P.magnet = {
    /** Spule mit Eisenkern; value: Widerstand in Ω. Je 0,1 A Strom (gerundet) hält er eine Büroklammer, höchstens zwölf. */
    terminals: T2, defaults: { value: 10 }, box: [-30, -20, 60, 60],
    elements: function (p) { return [{ kind: "R", a: 0, b: 1, r: Math.max(p.value, 1e-3) }]; },
    /** Im Zeitverlauf zählt der gemittelte Betrag des Stroms – auch an Wechselspannung zieht er an. */
    advance: function (p, r, env) {
      var s = p._s || (p._s = { i: 0 });
      s.i += (Math.abs(r.i[0]) - s.i) * (1 - Math.exp(-env.dt / 0.1));
    },
    observe: function (p, r, env) {
      var current = env && p._s ? p._s.i : Math.abs(r.i[0] || 0);
      r.clips = Math.min(CLIP_MAX, Math.round(current / CLIP_STEP));
      r.active = r.clips > 0;
    },
    state: function (p, r, lang) {
      var n = r ? r.clips : 0;
      return n ? LC.text(n === 1 ? "clipOne" : "clipMany", lang).replace("{n}", n) : LC.text("magnetOff", lang);
    },
    words: ["magnetOn", "magnetOff"],
    caption: function (p, lang) { return LC.format(p.value, "Ω", lang, true); },
    controls: [{ prop: "value", kind: "number", unit: "Ω", min: 0, step: "any" }],
    draw: function (p, r, ctx) {
      var clips = paperClips(r && r.clips ? r.clips : 0, 9);
      if (ctx.view === "symbol")
        return lead(-40, -20) + lead(20, 40) +
          '<path class="lc-line" d="M-20 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0 a5 5 0 0 1 10 0"/>' +
          line(-20, -9, 20, -9, "lc-line lc-thick") + clips;                // die Linie über der Wicklung ist der Eisenkern
      var turns = "";
      for (var k = 0; k < 8; k++) turns += line(-15 + 4.3 * k, -9, -12 + 4.3 * k, 9, "lc-coil");
      return lead(-40, -24) + lead(24, 40) +
        '<rect x="-24" y="-6" width="48" height="12" rx="2" fill="#6b7178" stroke="#444"/>' + turns + clips;
    }
  };

  // ---------------------------------------------------------------- Paket B: Lautsprecher und Heißleiter

  /** Abstand der gezeichneten Schallwellen: je höher die Frequenz, desto enger (50 Hz: 12, 800 Hz: 4). */
  function waveGap(f) { return clamp(12 - 2 * Math.log2(f / 50), 3, 14); }

  /** Schallwellen als Bögen um (0|cy), nach oben. */
  function soundArcs(gap, cy) {
    var s = "";
    for (var rr = 8; rr <= 28; rr += gap)
      s += "M" + (-0.6 * rr).toFixed(1) + " " + (cy - 0.8 * rr).toFixed(1) + " A" + rr.toFixed(1) + " " + rr.toFixed(1) + " 0 0 1 " +
        (0.6 * rr).toFixed(1) + " " + (cy - 0.8 * rr).toFixed(1) + " ";
    return '<path class="lc-wave" d="' + s + '"/>';
  }

  P.speaker = {
    /**
     * value: Widerstand in Ω. Er schwingt, wenn an ihm eine Wechselspannung liegt (ab 16 Hz, ab 0,05 V effektiv):
     * gezeichnet als Schallwellen, ohne Ton, je höher die Frequenz, desto enger. An Gleichspannung bleibt er still.
     * Die Frequenz misst er selbst: aus dem Abstand der steigenden Nulldurchgänge.
     */
    terminals: T2, defaults: { value: 8 }, box: [-30, -30, 60, 50],
    elements: function (p) { return [{ kind: "R", a: 0, b: 1, r: Math.max(p.value, 1e-3) }]; },
    advance: function (p, r, env) {
      var s = p._s || (p._s = { m: 0, a: 0, sign: 0, tc: null, period: 0 });
      var u = r.v[0] - r.v[1];
      s.m += (u - s.m) * (1 - Math.exp(-env.dt / 0.2));                 // Gleichanteil, langsam gemittelt
      var d = u - s.m;
      s.a += (d * d - s.a) * (1 - Math.exp(-env.dt / 0.05));            // Wechselanteil (Quadrat, gemittelt)
      var h = 0.3 * Math.sqrt(s.a);
      if (s.sign <= 0 && d > h && h > 1e-4) { if (s.tc !== null) s.period = env.t - s.tc; s.tc = env.t; s.sign = 1; }
      else if (s.sign >= 0 && d < -h) s.sign = -1;
    },
    observe: function (p, r, env) {
      var s = env && p._s, f = 0;
      if (s && s.period > 0 && Math.sqrt(s.a) >= 0.05 && env.t - s.tc < 2 * s.period + 0.05) f = 1 / s.period;
      r.freq = f; r.sounds = f >= 16; r.gap = r.sounds ? waveGap(f) : 0;
      r.rms = s ? Math.sqrt(s.a) : 0;
    },
    /** Ton bei eingeschaltetem Ton-Knopf: die gemessene Frequenz, lauter mit größerer Spannung (voll ab 3 V effektiv). */
    tone: function (p, r) { return r && r.sounds ? { freq: r.freq, wave: "sine", level: clamp(r.rms / 3, 0.1, 1) } : null; },
    state: function (p, r, lang) { return LC.text(r && r.sounds ? "speakerOn" : "silent", lang); },
    words: ["speakerOn", "silent"],
    caption: function (p, lang) { return LC.format(p.value, "Ω", lang, true); },
    controls: [{ prop: "value", kind: "number", unit: "Ω", min: 0, step: "any" }],
    draw: function (p, r, ctx) {
      if (ctx.view === "symbol")
        return lead(-40, -6) + lead(6, 40) + '<rect class="lc-sym" x="-6" y="-3" width="12" height="9"/>' +
          '<path class="lc-sym" d="M-6 -3 L-14 -13 H14 L6 -3 Z"/>' + (r && r.sounds ? soundArcs(r.gap, -8) : "");
      return lead(-40, -6) + lead(6, 40) +
        '<rect x="-7" y="-1" width="14" height="10" rx="2" fill="#3d4450" stroke="#23272e"/>' +
        '<path d="M-6 0 L-17 -12 H17 L6 0 Z" fill="#9aa4ad" stroke="#555" stroke-width="1.2"/>' +
        '<ellipse cx="0" cy="-12" rx="17" ry="2.5" fill="#6b7178"/>' + (r && r.sounds ? soundArcs(r.gap, -6) : "");
    }
  };

  var NTC_B = 3950;      // Materialkonstante in Kelvin

  P.ntc = {
    /** Heißleiter: value ist der Widerstand bei 25 °C, temp die Temperatur von 0 bis 100 °C.
     *  R = value · e^(B · (1/T − 1/298,15 K)) mit B = 3950 K: je wärmer, desto kleiner. */
    terminals: T2, defaults: { value: 10000, temp: 25 }, box: [-30, -28, 60, 48],
    resistance: function (p) { return p.value * Math.exp(NTC_B * (1 / (p.temp + 273.15) - 1 / 298.15)); },
    elements: function (p) { return [{ kind: "R", a: 0, b: 1, r: Math.max(P.ntc.resistance(p), 1e-3) }]; },
    clean: function (p) { p.temp = clamp(p.temp, 0, 100); },
    caption: function (p, lang) { return LC.format(P.ntc.resistance(p), "Ω", lang, true) + " · " + plain(p.temp, lang) + " °C"; },
    controls: [
      { prop: "temp", kind: "range", label: "temperature", unit: "°C", min: 0, max: 100, step: 1 },
      { prop: "value", kind: "number", label: "at25", unit: "Ω", units: [["Ω", 1], ["kΩ", 1e3], ["MΩ", 1e6]], min: 0, step: "any" }
    ],
    draw: function (p, r, ctx) {
      if (ctx.view === "symbol")
        return lead(-40, -20) + lead(20, 40) + '<rect class="lc-sym" x="-20" y="-8" width="40" height="16"/>' +
          '<path class="lc-line" d="M-20 14 H-13 L15 -14"/>' + label(ctx, -21, -17, "−ϑ", "lc-text");
      var t = clamp(p.temp / 100, 0, 1);
      var color = "rgb(" + Math.round(58 + 190 * t) + "," + Math.round(123 - 60 * t) + "," + Math.round(213 - 170 * t) + ")";
      return lead(-40, -10) + lead(10, 40) +
        '<circle r="11" fill="' + color + '" stroke="#333" stroke-width="1.2"/>' +
        '<ellipse cx="-3.5" cy="-4" rx="3.5" ry="2" fill="#ffffff" opacity="0.45"/>' +
        '<path d="M14 -24 v12 a3.5 3.5 0 1 0 3 0 v-12 a1.5 1.5 0 0 0 -3 0 z" fill="#ffffff" stroke="#555" stroke-width="1"/>' +
        '<path d="M15.5 ' + (-13 - 9 * t).toFixed(1) + ' V-10" stroke="#c0392b" stroke-width="1.6"/>' +
        '<circle cx="15.5" cy="-9.3" r="2.6" fill="#c0392b"/>';
    }
  };

  // ---------------------------------------------------------------- Paket C: Voltmeter, Amperemeter, Leistungsmesser

  /** Text, der in eine Anzeige der Breite width passen muss: lange Werte werden zusammengeschoben. */
  function fitted(svg, text, width) {
    return text.length > 6 ? svg.replace("<text ", '<text textLength="' + width + '" lengthAdjust="spacingAndGlyphs" ') : svg;
  }

  /** Einzelnes Messgerät mit großer Anzeige: Voltmeter (V, parallel) oder Amperemeter (A, in Reihe). */
  function bigMeter(mode) {
    return {
      terminals: T2, defaults: {}, box: [-32, -30, 64, 52], meter: true, instrument: true,
      column: function () { return MODE_UNIT[mode]; },
      elements: function () { return [{ kind: "R", a: 0, b: 1, r: mode === "A" ? R_ON : R_VOLT }]; },
      advance: meterAdvance,
      observe: function (p, r, env) { meterObserve(mode, p, r, env); },
      state: meterState,
      draw: function (p, r, ctx) {
        var reading = meterState(p, r, ctx.lang).replace("~ ", "~");
        if (ctx.view === "symbol")
          return lead(-40, -16) + lead(16, 40) + '<circle r="16" class="lc-sym"/>' + label(ctx, 0, 0, mode, "lc-text lc-mode") +
            label(ctx, -23, -10, "+", "lc-text lc-sign") + label(ctx, 0, 29, reading, "lc-text lc-reading");
        return lead(-40, -30) + lead(30, 40) +
          '<rect x="-30" y="-28" width="60" height="48" rx="5" fill="' + (mode === "A" ? "#cfdcec" : "#ecd3d3") + '" stroke="#7a8590" stroke-width="1.5"/>' +
          '<rect x="-26" y="-24" width="52" height="22" rx="2" fill="#d5e8cf" stroke="#7c8f77"/>' +
          fitted(label(ctx, 0, -13, reading, "lc-text lc-big"), reading, 48) +
          label(ctx, 0, 9, mode, "lc-text lc-mode") +
          '<circle cx="-21" cy="10" r="4" fill="#c0392b" stroke="#7d241a"/><circle cx="21" cy="10" r="4" fill="#1b1b1b" stroke="#000"/>';
      }
    };
  }
  P.voltmeter = bigMeter("V");
  P.ammeter = bigMeter("A");

  P.wattmeter = {
    /**
     * Leistungsmesser: Anschluss 0 ist der Eingang, 1 der Ausgang – dazwischen liegt der Strompfad, in Reihe vor dem
     * Bauteil. Anschluss 2 kommt an die Rückleitung. Er zeigt die Leistung: Strom durch den Strompfad mal Spannung
     * zwischen Ausgang und Rückleitung, im Zeitverlauf gemittelt (Wirkleistung).
     */
    terminals: [[-1, 0], [1, 0], [0, 1]], defaults: {}, box: [-32, -32, 64, 60], meter: true, instrument: true,
    column: function () { return "W"; },
    elements: function () { return [{ kind: "R", a: 0, b: 1, r: R_ON }, { kind: "R", a: 1, b: 2, r: R_VOLT }]; },
    advance: meterAdvance,
    observe: function (p, r, env) { meterObserve("W", p, r, env); },
    state: meterState,
    draw: function (p, r, ctx) {
      var reading = meterState(p, r, ctx.lang).replace("~ ", "~");
      if (ctx.view === "symbol")
        return lead(-40, -16) + lead(16, 40) + line(0, 16, 0, 40, "lc-lead") + '<circle r="16" class="lc-sym"/>' +
          line(-16, 0, 16, 0) + label(ctx, 0, -7, "W", "lc-text lc-mode") + label(ctx, 0, -25, reading, "lc-text lc-reading");
      return lead(-40, -30) + lead(30, 40) + line(0, 24, 0, 40, "lc-lead") +
        '<rect x="-30" y="-30" width="60" height="54" rx="5" fill="#e6dcef" stroke="#7a8590" stroke-width="1.5"/>' +
        '<rect x="-26" y="-26" width="52" height="22" rx="2" fill="#d5e8cf" stroke="#7c8f77"/>' +
        fitted(label(ctx, 0, -15, reading, "lc-text lc-big"), reading, 48) +
        label(ctx, 0, 7, "W", "lc-text lc-mode") +
        '<circle cx="-21" cy="8" r="4" fill="#9a9a9a" stroke="#666"/><circle cx="21" cy="8" r="4" fill="#9a9a9a" stroke="#666"/>' +
        '<circle cx="0" cy="19" r="3.5" fill="#1b1b1b" stroke="#000"/>';
    }
  };

  // ---------------------------------------------------------------- Paket C: Signalgenerator

  /** Kurvenform über eine Periode: phase in Perioden, Ergebnis von −1 bis 1. */
  function waveShape(wave, phase) {
    var x = phase - Math.floor(phase);
    if (wave === "square") return x < 0.5 ? 1 : -1;
    if (wave === "triangle") return x < 0.25 ? 4 * x : x < 0.75 ? 2 - 4 * x : 4 * x - 4;
    return Math.sin(2 * Math.PI * x);
  }
  var WAVE_ICON = { sine: "M-9 0 q4.5 -10 9 0 t9 0", square: "M-9 4 V-4 H0 V4 H9 V-4", triangle: "M-9 4 L-4.5 -4 L0 4 L4.5 -4 L9 4" };
  LC.waveShape = waveShape;

  P.siggen = {
    /** wave: sine (Sinus), square (Rechteck) oder triangle (Dreieck); value: Scheitelwert in V; freq: Frequenz in Hz
     *  (0,1 bis 1000). Im Ruhezustand (ohne Zeitverlauf) liefert er 0 V. Anschluss 0 ist der Signalausgang. */
    terminals: T2, defaults: { wave: "sine", value: 5, freq: 50 }, options: { wave: ["sine", "square", "triangle"] },
    source: true, dynamic: true, box: [-32, -24, 64, 46],
    frequency: function (p) { return p.freq; },
    elements: function (p, env) {
      return [{ kind: "V", a: 0, b: 1, v: env ? p.value * waveShape(p.wave, p.freq * env.t) : 0, r: R_SRC }];
    },
    clean: function (p) { p.freq = clamp(p.freq, 0.1, 1000); },
    caption: function (p, lang) { return LC.format(p.value, "V", lang, true) + " · " + plain(p.freq, lang) + " Hz"; },
    controls: [
      { prop: "wave", kind: "select", label: "wave", options: [["sine", "sine"], ["square", "square"], ["triangle", "triangle"]] },
      { prop: "value", kind: "number", label: "peak", unit: "V", min: 0, max: 400, step: 0.5 },
      { prop: "freq", kind: "number", label: "frequency", unit: "Hz", min: 0.1, max: 1000, step: "any" }
    ],
    draw: function (p, r, ctx) {
      var icon = WAVE_ICON[p.wave] || WAVE_ICON.sine;
      if (ctx.view === "symbol")
        return lead(-40, -14) + lead(14, 40) + '<circle r="14" class="lc-sym"/><path class="lc-line" d="' + icon + '"/>';
      return lead(-40, -28) + lead(28, 40) +
        '<rect x="-28" y="-20" width="56" height="40" rx="4" fill="#3b4f6b" stroke="#22303f" stroke-width="1.5"/>' +
        '<rect x="-20" y="-16" width="40" height="18" rx="2" fill="#b9e3b0" stroke="#6f8f69"/>' +
        '<path d="' + icon + '" transform="translate(0 -7) rotate(' + -90 * (ctx.rot || 0) + ')" fill="none" stroke="#16301a" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<circle cx="-19" cy="11" r="4.5" fill="#c0392b" stroke="#7d241a"/><circle cx="19" cy="11" r="4.5" fill="#1b1b1b" stroke="#000"/>' +
        '<rect x="-7" y="7" width="14" height="7" rx="2" fill="#8fa3bd"/>';
    }
  };

  // ---------------------------------------------------------------- Aufgabe mit Selbstkontrolle

  /**
   * Was ein Bauteil gerade tut – daran misst eine Aufgabe ihre Ziele:
   * on = es leuchtet (auch schwach), dreht sich, summt oder führt Strom · bright = es leuchtet hell · off = nichts davon.
   */
  LC.doing = function (p, r) {
    var on = false, bright = false;
    if (r && !p.fault) {
      if (typeof r.brightness === "number") { on = r.brightness > 0.015; bright = r.brightness > 0.5; }
      else if (typeof r.speed === "number") on = r.speed !== 0;
      else if (typeof r.sounds === "boolean") on = r.sounds;
      else if (typeof r.active === "boolean") on = r.active;               // Relais hat angezogen, Elektromagnet hält Klammern
      else on = (r.i || []).some(function (current) { return Math.abs(current) > 1e-6; });
    }
    return { on: on, bright: bright, off: !on };
  };

  var GOAL_UNIT = { V: "V", A: "A", R: "Ω", W: "W" };

  /** Ein Ziel in Worten, wenn die Beschreibung keinen eigenen Text (label) dafür nennt. */
  LC.goalText = function (goal, lang) {
    if (goal.measure) {
      var unit = GOAL_UNIT[goal.measure], text = LC.text("goalReading", lang) + ": ";
      if (goal.min !== undefined && goal.max !== undefined)
        return text + LC.text("goalFrom", lang) + " " + LC.format(goal.min, unit, lang, true) + " " + LC.text("goalTo", lang) + " " + LC.format(goal.max, unit, lang, true);
      return text + (goal.min !== undefined
        ? LC.text("goalMin", lang) + " " + LC.format(goal.min, unit, lang, true)
        : LC.text("goalMax", lang) + " " + LC.format(goal.max, unit, lang, true));
    }
    var light = goal.type === "lamp" || goal.type === "led", own = P[goal.type].words;
    var words = {
      bright: "goalBright",
      on: own ? own[0] : light ? "lampOn" : goal.type === "motor" ? "goalTurns" : goal.type === "buzzer" ? "buzzes" : "goalFlow",
      off: own ? own[1] : light ? "lampOff" : goal.type === "motor" ? "stands" : goal.type === "buzzer" ? "silent" : "goalNoFlow"
    };
    var name = LC.text(goal.type, lang).replace(/­/g, "");
    return (goal.count === "all" ? name + " (" + LC.text("goalAll", lang) + ")" : goal.count + " × " + name) + " – " + LC.text(words[goal.is], lang);
  };

  /**
   * Prüft die Aufgabe der Schaltung am Ergebnis einer Rechnung: goals nennt je Ziel, ob es erfüllt ist;
   * done gilt, wenn alle erfüllt sind und kein Kurzschluss gemeldet wird. Ohne Aufgabe: null.
   */
  LC.checkTask = function (circuit, result) {
    var task = circuit.task;
    if (!task) return null;
    var usable = !!result && !result.failed;
    var short = !usable || result.warnings.some(function (w) { return w.type === "short"; });
    var goals = task.goals.map(function (goal) {
      if (!usable) return false;
      if (goal.measure)
        return circuit.parts.some(function (p, k) {
          var r = result.parts[k];
          if (!P[p.type].meter || p.fault || !r || r.unit !== GOAL_UNIT[goal.measure]) return false;
          var x = Math.abs(r.reading);
          return Number.isFinite(x) && (goal.min === undefined || x >= goal.min * (1 - 1e-9)) && (goal.max === undefined || x <= goal.max * (1 + 1e-9));
        });
      var all = 0, hit = 0;
      circuit.parts.forEach(function (p, k) {
        if (p.type !== goal.type) return;
        all++;
        if (LC.doing(p, result.parts[k])[goal.is]) hit++;
      });
      return goal.count === "all" ? all > 0 && hit === all : hit >= goal.count;
    });
    return { goals: goals, done: !short && goals.length > 0 && goals.every(Boolean) };
  };

  /** Die Fächer der Bauteilleiste, in ihrer Reihenfolge. */
  LC.paletteGroups = [
    ["grpSources", ["battery", "source", "acsource", "siggen", "solar", "dynamo"]],
    ["grpSwitches", ["switch", "button", "changeover", "relay"]],
    ["grpLoads", ["lamp", "led", "motor", "buzzer", "speaker", "magnet"]],
    ["grpComponents", ["resistor", "potentiometer", "ldr", "ntc", "capacitor", "inductor", "diode", "transistor", "fuse"]],
    ["grpMeters", ["multimeter", "voltmeter", "ammeter", "wattmeter", "scope"]]
  ];
  /** Reihenfolge in der Bauteilleiste. */
  LC.palette = [].concat.apply([], LC.paletteGroups.map(function (g) { return g[1]; }));
})(typeof globalThis !== "undefined" ? globalThis : this);
