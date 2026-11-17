/* Lia-Circuits · @Circuits.code: die Schaltung als Inhalt eines ausführbaren Codeblocks
 *
 * Der Codeblock steht direkt unter der Arbeitsfläche. Sein Editor ist unsichtbar, die Fläche liegt an seiner
 * Stelle; sichtbar bleibt nur die Steuerleiste von LiaScript (Play/Stop und die Versionen) unter der Fläche.
 *   Fläche → Codeblock: jede Änderung schreibt die Beschreibung der Schaltung in den Editor.
 *   Codeblock → Fläche: ändert sich der Text anders (Version zurück/vor, im Klassenraum von jemand anderem),
 *   baut sich die Fläche aus diesem Text neu auf.
 *   Play: LiaScript legt eine Version an, und die Simulation läuft – bis Stop. Davor wird nur gebaut.
 * Speichern und Klassenraum übernimmt LiaScript wie bei jedem Codeblock.
 *
 * shortcut: greift auf den Ace-Editor im <lia-editor> (_editor) und auf die Klassen des Codeblocks (lia-accordion,
 * lia-code__input, lia-code-terminal) zu – keine öffentliche Schnittstelle von LiaScript; ändert eine neue
 * LiaScript-Version sie, hier anpassen.
 */
(function (global) {
  "use strict";
  var LC = (global.LiaCircuits = global.LiaCircuits || {});

  // Vom Codeblock unter einer Fläche bleibt nur die Steuerleiste: Editor und Terminal überlagert die Fläche.
  // Als Regel, nicht am Element: LiaScript baut das Terminal erst beim Ausführen ("LIA: terminal" macht aus Play
  // einen Stop-Knopf; seine Eingabezeile braucht es nicht).
  if (typeof document !== "undefined" && !document.getElementById("lc-code-style")) {
    var style = document.createElement("style");
    style.id = "lc-code-style";
    style.textContent = [".lia-accordion", ".lia-code__input", ".lia-code-terminal"].map(function (part) { return ".lia-circuits + .lia-code > " + part; }).join(", ") + " { display: none; }";
    document.head.appendChild(style);
  }

  /** Verbindet die Fläche el mit dem Codeblock unmittelbar danach. false, solange der Editor noch nicht da ist. */
  LC.attach = function (el) {
    var block = el.nextElementSibling, host = block && block.querySelector("lia-editor"), ace = host && host._editor;
    if (!ace) return false;
    var written = ace.getValue(), timer = 0;
    if (el._running === undefined) el._running = false;

    function load(text) {
      delete LC.store[el.id];                            // der Codeblock ist das Gedächtnis, nicht die Fläche
      LC.mount(el, text, { onChange: write, paused: function () { return !el._running; } });
    }
    function write(text) {
      if (text === ace.getValue()) return;
      written = text;
      ace.setValue(text, 1);
    }
    // Ein Versionswechsel kommt in mehreren Schritten (erst gelöscht, dann eingefügt): kurz warten, dann den
    // fertigen Text nehmen. Unlesbarer Text lässt die Fläche, wie sie ist.
    ace.on("change", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var text = ace.getValue();
        if (text === written || !el.isConnected) return;
        try { LC.normalize(text); } catch (error) { return; }
        written = text;
        load(text);
      }, 60);
    });
    load(written);
    return true;
  };

  /** Play im Codeblock: die Simulation läuft, bis Stop gedrückt wird. send ist das send-Objekt des Skripts. */
  LC.play = function (id, send) {
    var el = document.getElementById(id);
    if (!el) return;
    el._running = true;
    if (el._lc) el._lc.refresh();
    send.handle("stop", function () {
      el._running = false;
      if (el._lc) el._lc.refresh();
      send.lia("LIA: stop");
    });
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
