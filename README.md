<!--
author:   LiaAgent
version:  0.1.0
language: de
narrator: Deutsch Female
comment:  Elektrische Schaltungen aufbauen, umbauen und messen – in 2D mit SVG, mit Bildern oder Schaltzeichen.

script:   ./circuits-solver.js
          ./circuits-parts.js
          ./circuits-locale.js
          ./circuits-ui.js
          ./circuits-code.js

link:     ./circuits.css

@Circuits.sim: @Circuits.sim_(@uid,```@0```)

@Circuits.sim_
<div class="lia-circuits" id="lia-circuits-@0"></div>
<script modify="false">
(function wait(tries) {
  var el = document.getElementById("lia-circuits-@0");
  if (el && window.LiaCircuits && window.LiaCircuits.mount) window.LiaCircuits.mount(el, `@'1`);
  else if (tries > 0) setTimeout(function () { wait(tries - 1); }, 100);
})(50);
""
</script>
@end

@Circuits.code: @Circuits.code_(@uid,```@0```)

@Circuits.code_
<div class="lia-circuits" id="lia-circuits-@0"></div>

```json
@1
```
<script>
window.LiaCircuits.play("lia-circuits-@0", send);
"LIA: terminal"
</script>

<script modify="false">
(function wait(tries) {
  var el = document.getElementById("lia-circuits-@0");
  if (el && window.LiaCircuits && window.LiaCircuits.attach && window.LiaCircuits.attach(el)) return;
  if (tries > 0) setTimeout(function () { wait(tries - 1); }, 100);
})(50);
""
</script>
@end
-->

# Circuits – Schaltungen aufbauen und messen

Mit diesem Baustein bauen Lernende elektrische Schaltungen auf einer Arbeitsfläche: Bauteile aus der Leiste holen, verschieben, mit Leitungen verbinden, schalten und mit dem Multimeter messen. Nach jeder Änderung wird die Schaltung neu berechnet.

Es gibt zwei Ansichten zum Umschalten: **Bilder** der Bauteile und **Schaltzeichen** mit Werten.

Einbinden im Kopf des Kurses:

`import: https://raw.githubusercontent.com/LiaTemplates/Lia-Circuits/0.1.0/README.md` (feste Version)

`import: https://raw.githubusercontent.com/LiaTemplates/Lia-Circuits/master/README.md` (immer die neueste)

> **Stand:** 30 Bauteile und Messgeräte – Batterie (in vier Bauformen), Spannungsquelle, Wechselspannungsquelle, Signalgenerator, Solarzelle, Handgenerator, Schalter, Taster, Umschalter, Relais, Lampe, Leuchtdiode, Motor, Summer, Lautsprecher, Elektromagnet, Widerstand, Schiebewiderstand, Fotowiderstand, Heißleiter, Kondensator, Spule, Diode, Transistor, Sicherung, Multimeter, Voltmeter, Amperemeter, Leistungsmesser und Oszilloskop (mit einem oder zwei Kanälen). Für den Unterricht gibt es Aufgaben mit Selbstkontrolle, eine eingeschränkte Leiste, gesperrte Schaltungen, die Fehlersuche und eine Messwerttabelle. Alles lässt sich auch mit dem Finger bedienen. Mit `@Circuits.code` wird die Schaltung gespeichert, mit Versionen und im Klassenraum.

## `@Circuits.sim`

Der Befehl steht an einem Textblock, der die Schaltung beschreibt. Er zeigt sie als Arbeitsfläche.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1,"value":4.5},
  {"type":"switch","x":6,"y":2,"closed":false},
  {"type":"lamp","x":10,"y":2}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5]
 ]}
```

**So geht es:**

- Den **Schalter antippen**: Er schließt sich, die Lampe leuchtet, und der Strom wandert als Punkte durch die Leitung.
- **Bauteile** oben klappt die Leiste auf. Ihre Teile liegen in Fächern: Quellen, Schalter, Verbraucher, Bauelemente, Messgeräte. Ein Teil antippen oder auf die Fläche ziehen. Ist die Fläche leer oder gibt die Beschreibung die Teile vor, ist die Leiste gleich offen; wenige Teile stehen ohne Fächer in einer Zeile.
- Ein Bauteil **antippen**, um seinen Wert zu ändern, es zu drehen oder zu entfernen. Das Feld dafür erscheint unter der Fläche und verdeckt so nichts von der Schaltung.
- Im Menü **⋯** oben rechts: „Zurücksetzen“ und „Schaltung als Text kopieren“.
- Ein Bauteil **ziehen**, um es zu verschieben; seine Leitungen wandern mit.
- **Drehen** dreht nur das Bauteil, die Leitungen bleiben liegen. Zweimal drehen polt es um, zum Beispiel eine Diode oder die Batterie.
- Von einem **Anschlusspunkt** (kleiner Kreis) aus ziehen, um eine Leitung zu legen.
- Eine Leitung quer über die Batterie ist ein **Kurzschluss** – dann erscheint eine Warnung.
- **Potenzial** (der blau-rote Balken oben) färbt jede Leitung nach ihrem Potenzial: Blau ist das niedrigste (Minuspol), Rot das höchste (Pluspol), dazwischen Violett. Wo zwei Leitungen an einem Bauteil verschieden gefärbt sind, liegt an ihm Spannung; sind beide gleich, liegt keine an. Bei Wechselspannung wechseln die Farben mit.
- Eine Leitung quer über ein anderes Bauteil **überbrückt** es: Es bekommt keine Spannung, am Bauteil erscheint ⚠ und darunter ein Hinweis.
- **Strg+Z** nimmt den letzten Schritt zurück, **Strg+Y** wiederholt ihn. Dasselbe tun die Pfeile ↶ und ↷ oben auf der Fläche.
- **Zoomen:** Mit **+** und **−** oben auf der Fläche, mit Strg und Mausrad oder mit zwei Fingern auf freier Fläche. Vergrößert lässt sich der Ausschnitt verschieben: auf freier Fläche ziehen. „Ganze Fläche“ zeigt wieder alles. Das Mausrad ohne Strg scrollt weiter die Seite.
- **Ton:** Ist ein Summer oder Lautsprecher in der Schaltung, erscheint oben der Knopf 🔇. Antippen schaltet den Ton ein (🔊): Der Summer summt mit 400 Hz, der Lautsprecher klingt mit der Frequenz, die an ihm liegt. Ohne den Knopf bleibt alles still – wichtig, wenn 30 Geräte im Raum sind.
- **Mit dem Finger** geht alles genauso: antippen, ziehen, eine Leitung vom Anschlusspunkt aus ziehen, ein Bauteil aus der Leiste auf die Fläche ziehen. Auf einem Tablet sind die Anschlusspunkte zum Greifen größer. Wischen auf der Fläche blättert die Folie nicht um, und ein zweiter Finger stört das Ziehen nicht.

## `@Circuits.code`: speichern, Versionen, Klassenraum

Mit `@Circuits.code` statt `@Circuits.sim` ist die Schaltung der Inhalt eines ausführbaren Codeblocks. Den Editor sieht man nicht, die Arbeitsfläche liegt an seiner Stelle; darunter steht die Leiste des Codeblocks. Damit übernimmt LiaScript, was ein Codeblock ohnehin kann:

- **Play und Stop:** Vor Play wird nur gebaut: Bauteile holen, verschieben, verbinden – es fließt kein Strom. Play schaltet die Simulation ein, Stop wieder aus.
- **Versionen:** Jedes Play speichert den Stand als neue Version. Mit den Pfeilen rechts springt man zu früheren und späteren Versionen; die Fläche zeigt dann diese Schaltung.
- **Speichern:** wie jeder Codeblock – in der LiaScript-App bei einem Kurs ab Version 1.0.0, auch nach dem Neuladen.
- **Klassenraum:** wie jeder Codeblock im Klassenraum von LiaScript.

```json @Circuits.code
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1,"value":4.5},
  {"type":"switch","x":6,"y":2,"closed":false},
  {"type":"lamp","x":10,"y":2}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5]
 ]}
```

So geht es: Schalter antippen, dann Play – die Lampe leuchtet. Stop, eine zweite Lampe aus der Leiste holen und anschließen, wieder Play. Mit dem Pfeil nach links kommt der vorige Stand zurück.

## Reihenschaltung und Parallelschaltung

In **Reihe** teilen sich zwei Lampen die Spannung. Jede bekommt die Hälfte und leuchtet nur noch schwach und orange: Bei einer Glühlampe fällt das Licht viel schneller als die Leistung.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1},
  {"type":"lamp","x":6,"y":2},
  {"type":"lamp","x":10,"y":2}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5]
 ]}
```

**Parallel** liegt an jeder Lampe die volle Spannung. Beide leuchten hell, und in der gemeinsamen Leitung fließt der doppelte Strom.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1},
  {"type":"lamp","x":8,"y":2},
  {"type":"lamp","x":8,"y":4}
 ],
 "wires":[
  [3,3,3,2,7,2],
  [6,2,6,4,7,4],
  [9,2,11,2,11,6,3,6,3,5],
  [9,4,11,4]
 ]}
```

## Wie in echt: Lampe und Batterie

Die Lampe ist für 4,5 V gebaut. An 9 V **brennt sie durch**, sobald der Schalter schließt. Antippen ersetzt sie; ihre Nennspannung lässt sich einstellen.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1,"value":9},
  {"type":"switch","x":6,"y":2,"closed":false},
  {"type":"lamp","x":10,"y":2}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5]
 ]}
```

Eine Batterie hat einen **Innenwiderstand**. Hier ist er auf 1 Ω gestellt: Schließt der Schalter die zweite Lampe an, sinkt die Spannung der Batterie, und beide Lampen leuchten etwas schwächer. Als Vorgabe ist der Innenwiderstand fast null (0,01 Ω).

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1,"value":4.5,"ohm":1},
  {"type":"lamp","x":8,"y":2},
  {"type":"switch","x":6,"y":4,"closed":false},
  {"type":"lamp","x":9,"y":4}
 ],
 "wires":[
  [3,3,3,2,7,2],
  [9,2,11,2,11,6,3,6,3,5],
  [5,2,5,4],
  [7,4,8,4],
  [10,4,11,4]
 ]}
```

## Messen mit dem Multimeter

Das Multimeter misst Spannung, Stromstärke oder Widerstand; die Messgröße stellt man ein, nachdem man es angetippt hat.

Seine beiden Messleitungen enden in **Krokodilklemmen**: Jede Klemme lässt sich ziehen und an einen Anschluss, an ein Leitungsende oder mitten auf eine Leitung setzen. Rot ist Plus, schwarz ist COM. Das Gerät selbst lässt sich danach frei verschieben.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1,"value":9},
  {"type":"resistor","x":6,"y":2,"value":100},
  {"type":"resistor","x":10,"y":2,"value":100},
  {"type":"multimeter","x":7,"y":5,"mode":"V","a":[9,2],"b":[11,4]}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5]
 ]}
```

**Stromstärke:** Das Multimeter liegt im Stromkreis. 9 V an 100 Ω ergeben 90 mA.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":3,"value":9},
  {"type":"resistor","x":7,"y":2,"value":100},
  {"type":"multimeter","x":7,"y":6,"mode":"A"}
 ],
 "wires":[
  [3,5,3,6,6,6],
  [8,6,11,6,11,2,8,2],
  [6,2,3,2,3,3]
 ]}
```

**Spannung:** Das Multimeter liegt parallel zum Bauteil. An zwei gleichen Widerständen in Reihe liegt je die halbe Spannung.

```json @Circuits.sim
{"view":"symbol",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1,"value":9},
  {"type":"resistor","x":6,"y":2,"value":100},
  {"type":"resistor","x":10,"y":2,"value":100},
  {"type":"multimeter","x":10,"y":4,"mode":"V"}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5],
  [9,4,9,2]
 ]}
```

**Widerstand:** Das Bauteil darf dabei nicht an einer Quelle hängen.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"resistor","x":6,"y":3,"value":220},
  {"type":"multimeter","x":6,"y":6,"mode":"R"}
 ],
 "wires":[
  [5,3,5,6],
  [7,3,7,6]
 ]}
```

## Bauteile: Taster und Umschalter

Der **Taster** leitet nur, solange er gedrückt ist.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1},
  {"type":"button","x":6,"y":2},
  {"type":"lamp","x":10,"y":2}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5]
 ]}
```

Der **Umschalter** wählt eine von zwei Lampen.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":2,"y":5,"rot":1},
  {"type":"changeover","x":5,"y":3,"pos":0},
  {"type":"lamp","x":9,"y":2},
  {"type":"lamp","x":9,"y":4}
 ],
 "wires":[
  [2,4,2,3,4,3],
  [6,2,8,2],
  [6,4,8,4],
  [10,2,12,2,12,7,2,7,2,6],
  [10,4,12,4]
 ]}
```

## Bauteile: Sicherung und Schiebewiderstand

Die **Sicherung** unterbricht, wenn ihr Nennstrom überschritten wird – hier 0,2 A bei einer Lampe, die 0,3 A braucht. Antippen ersetzt sie.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1},
  {"type":"fuse","x":5,"y":2,"value":0.2},
  {"type":"switch","x":8,"y":2,"closed":false},
  {"type":"lamp","x":11,"y":2}
 ],
 "wires":[
  [3,3,3,2,4,2],
  [6,2,7,2],
  [9,2,10,2],
  [12,2,12,6,3,6,3,5]
 ]}
```

Der **Schiebewiderstand** dimmt die Lampe: antippen und den Schieber bewegen.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1},
  {"type":"potentiometer","x":7,"y":2,"value":50,"pos":0.5},
  {"type":"lamp","x":10,"y":3}
 ],
 "wires":[
  [3,3,3,2,6,2],
  [7,3,9,3],
  [11,3,12,3,12,6,3,6,3,5]
 ]}
```

## Bauteile: einstellbare Spannungsquelle

Die Spannung lässt sich von 0 V bis 24 V einstellen. 6 V an 200 Ω ergeben 30 mA.

```json @Circuits.sim
{"view":"symbol",
 "parts":[
  {"type":"source","x":3,"y":4,"rot":3,"value":6},
  {"type":"resistor","x":7,"y":2,"value":200},
  {"type":"multimeter","x":7,"y":6,"mode":"A"}
 ],
 "wires":[
  [3,5,3,6,6,6],
  [8,6,11,6,11,2,8,2],
  [6,2,3,2,3,3]
 ]}
```

## Wechselspannung und Oszilloskop

Die **Wechselspannungsquelle** liefert einen Sinus; eingestellt werden der Effektivwert und die Frequenz. Das **Oszilloskop** zeigt den Verlauf der Spannung zwischen seinen beiden Anschlüssen. 6 V effektiv haben einen Scheitelwert von 8,5 V.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"acsource","x":2,"y":5,"rot":3,"value":6,"freq":50},
  {"type":"resistor","x":5,"y":2,"value":100},
  {"type":"scope","x":12,"y":4,"time":0.005,"volts":5}
 ],
 "wires":[
  [2,4,2,2,4,2],
  [6,2,8,2,8,8,2,8,2,6],
  [11,6,8,6],
  [13,6,13,9,1,9,1,2,2,2]
 ]}
```

Bei **langsamer Wechselspannung** sieht man, was Wechselstrom heißt: Die Punkte pendeln hin und her, die Lampe pulsiert.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"acsource","x":3,"y":4,"rot":3,"value":4.5,"freq":1},
  {"type":"lamp","x":7,"y":2}
 ],
 "wires":[
  [3,5,3,6,11,6,11,2,8,2],
  [6,2,3,2,3,3]
 ]}
```

## Kondensator und Spule

Der **Kondensator** lädt sich über den Widerstand auf: 1 kΩ und 1 mF ergeben eine Zeitkonstante von 1 s. Der Umschalter wechselt zwischen Laden und Entladen; die Spannung steht am Kondensator.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":9,"y":3,"value":9},
  {"type":"changeover","x":5,"y":4,"pos":0},
  {"type":"resistor","x":2,"y":4,"value":1000},
  {"type":"capacitor","x":1,"y":6,"rot":1,"value":0.001}
 ],
 "wires":[
  [6,3,8,3],
  [10,3,11,3,11,8,1,8,1,7],
  [6,5,6,8],
  [3,4,4,4],
  [1,4,1,5]
 ]}
```

Die **Spule** hat einen Wicklungswiderstand und eine Induktivität. An Wechselspannung begrenzt die Induktivität den Strom: 10 Ω allein ließen 600 mA fließen, mit 0,5 H bei 50 Hz sind es 38 mA.

```json @Circuits.sim
{"view":"symbol",
 "parts":[
  {"type":"acsource","x":3,"y":4,"rot":3,"value":6,"freq":50},
  {"type":"inductor","x":7,"y":2,"value":0.5,"ohm":10},
  {"type":"multimeter","x":7,"y":6,"mode":"A"}
 ],
 "wires":[
  [3,5,3,6,6,6],
  [8,6,11,6,11,2,8,2],
  [6,2,3,2,3,3]
 ]}
```

## Diode und Leuchtdiode

Die **Diode** leitet nur in einer Richtung, ab 0,7 V. Hier fließen (9 V − 0,7 V) / 1 kΩ = 8,3 mA. Diode antippen und zweimal drehen: Dann sperrt sie.

```json @Circuits.sim
{"view":"symbol",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":3,"value":9},
  {"type":"resistor","x":6,"y":2,"value":1000},
  {"type":"diode","x":9,"y":2,"rot":2},
  {"type":"multimeter","x":7,"y":6,"mode":"A"}
 ],
 "wires":[
  [3,5,3,6,6,6],
  [8,6,11,6,11,2,10,2],
  [8,2,7,2],
  [5,2,3,2,3,3]
 ]}
```

Die **Leuchtdiode** braucht einen Vorwiderstand: Mit 470 Ω fließen an 9 V etwa 15 mA, und sie leuchtet. Ohne ihn brennt sie durch. Ihre Farbe lässt sich wählen; jede Farbe hat ihre eigene Schwellenspannung.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":2,"y":4,"rot":1,"value":9},
  {"type":"switch","x":4,"y":2,"closed":false},
  {"type":"resistor","x":7,"y":2,"value":470},
  {"type":"led","x":10,"y":2,"color":"red"}
 ],
 "wires":[
  [2,3,2,2,3,2],
  [5,2,6,2],
  [8,2,9,2],
  [11,2,12,2,12,6,2,6,2,5]
 ]}
```

## Transistor

Der **Transistor** schaltet mit einem kleinen Strom einen großen: Solange der Taster gedrückt ist, fließt ein kleiner Strom in die Basis, und die Leuchtdiode im Kollektorkreis leuchtet.

```json @Circuits.sim
{"view":"symbol",
 "parts":[
  {"type":"battery","x":2,"y":4,"rot":1,"value":9},
  {"type":"led","x":6,"y":1,"color":"green"},
  {"type":"resistor","x":9,"y":2,"rot":1,"value":470},
  {"type":"resistor","x":4,"y":2,"rot":1,"value":47000},
  {"type":"button","x":5,"y":4},
  {"type":"transistor","x":8,"y":4,"value":100}
 ],
 "wires":[
  [2,3,2,1,5,1],
  [7,1,9,1],
  [4,3,4,4],
  [6,4,7,4],
  [9,5,9,7,2,7,2,5]
 ]}
```

## Fotowiderstand, Motor und Summer

Der **Fotowiderstand** leitet im Hellen gut und im Dunkeln fast gar nicht. Antippen und die Helligkeit hochschieben: Die Leuchtdiode geht an.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":2,"y":4,"rot":1,"value":9},
  {"type":"ldr","x":6,"y":2,"light":0.5},
  {"type":"led","x":10,"y":2,"color":"yellow"}
 ],
 "wires":[
  [2,3,2,2,5,2],
  [7,2,9,2],
  [11,2,12,2,12,6,2,6,2,5]
 ]}
```

Der **Motor** dreht sich schneller, je höher die Spannung ist, und andersherum, wenn man die Batterie umdreht.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1},
  {"type":"switch","x":6,"y":2,"closed":false},
  {"type":"motor","x":10,"y":2}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5]
 ]}
```

Der **Summer** summt, solange der Taster gedrückt ist – gezeichnet als Schallwellen, ohne Ton.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1},
  {"type":"button","x":6,"y":2},
  {"type":"buzzer","x":10,"y":2}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5]
 ]}
```

## Solarzelle und Handgenerator

Die **Solarzelle** liefert Spannung, solange Licht auf sie fällt. Bei vollem Licht sind es 3 V, und die rote Leuchtdiode leuchtet ohne Vorwiderstand mit 20 mA – mehr Strom gibt die kleine Zelle nicht her. Antippen und die Helligkeit auf null schieben: 0 V, die Leuchtdiode bleibt aus.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"solar","x":3,"y":4,"rot":1,"light":1},
  {"type":"led","x":8,"y":2,"color":"red"}
 ],
 "wires":[
  [3,3,3,2,7,2],
  [9,2,11,2,11,6,3,6,3,5]
 ]}
```

Der **Handgenerator** liefert Spannung, solange gekurbelt wird: antippen startet und stoppt das Kurbeln, der Regler „Tempo“ stellt ein, wie schnell. Bei vollem Tempo sind es 6 V; durch die Wicklung (5 Ω) bleiben an der Lampe 4,5 V, und sie leuchtet hell. Bei halbem Tempo leuchtet sie nur schwach.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"dynamo","x":3,"y":4,"rot":1,"crank":false,"pace":1},
  {"type":"lamp","x":8,"y":2}
 ],
 "wires":[
  [3,3,3,2,7,2],
  [9,2,11,2,11,6,3,6,3,5]
 ]}
```

## Relais und Elektromagnet

Das **Relais** schaltet mit einem Stromkreis einen zweiten: Solange der Taster gedrückt ist, fließt Strom durch die Spule (links), und ihr Kontakt (rechts) schließt den Kreis der Lampe. Die beiden Kreise sind nicht leitend verbunden – das Multimeter zwischen ihnen misst unendlich großen Widerstand.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":2,"y":4,"rot":1,"value":6},
  {"type":"button","x":4,"y":2},
  {"type":"relay","x":7,"y":4},
  {"type":"lamp","x":11,"y":2},
  {"type":"battery","x":13,"y":4,"rot":1,"value":4.5},
  {"type":"multimeter","x":7,"y":9,"mode":"R","a":[6,3],"b":[8,3]}
 ],
 "wires":[
  [2,3,2,2,3,2],
  [5,2,6,2,6,3],
  [6,5,6,6,2,6,2,5],
  [8,3,8,2,10,2],
  [12,2,13,2,13,3],
  [13,5,13,6,8,6,8,5]
 ]}
```

Der **Elektromagnet** ist eine Spule mit Eisenkern. Je größer der Strom, desto mehr Büroklammern hält er: etwa eine je 0,1 A. 6 V an 10 Ω ergeben 0,6 A, also sechs Klammern. Spannung der Batterie ändern und zählen.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":5,"rot":1,"value":6},
  {"type":"ammeter","x":5,"y":2},
  {"type":"magnet","x":9,"y":2,"value":10}
 ],
 "wires":[
  [3,4,3,2,4,2],
  [6,2,8,2],
  [10,2,12,2,12,7,3,7,3,6]
 ]}
```

## Lautsprecher und Heißleiter

Der **Lautsprecher** schwingt an Wechselspannung – gezeichnet als Schallwellen, ohne Ton. Je höher die Frequenz, desto enger stehen die Wellen: antippen und die Frequenz der Quelle von 100 Hz auf 400 Hz stellen. An Gleichspannung bleibt er still.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"acsource","x":3,"y":4,"rot":3,"value":3,"freq":100},
  {"type":"speaker","x":7,"y":2}
 ],
 "wires":[
  [3,5,3,6,11,6,11,2,8,2],
  [6,2,3,2,3,3]
 ]}
```

Der **Heißleiter** leitet besser, je wärmer er ist. Bei 25 °C misst das Multimeter seinen Nennwert von 10 kΩ, bei 50 °C nur noch 3,59 kΩ. Antippen und die Temperatur verschieben.

```json @Circuits.sim
{"view":"symbol",
 "parts":[
  {"type":"ntc","x":6,"y":3,"value":10000,"temp":25},
  {"type":"multimeter","x":6,"y":6,"mode":"R"}
 ],
 "wires":[
  [5,3,5,6],
  [7,3,7,6]
 ]}
```

## Voltmeter, Amperemeter und Leistungsmesser

**Voltmeter** und **Amperemeter** sind einzelne Geräte mit großer Anzeige. Das Amperemeter liegt im Stromkreis, das Voltmeter parallel zum Widerstand: 9 V an 100 Ω ergeben 90 mA, am Widerstand liegen 9,00 V.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":2,"y":4,"rot":1,"value":9},
  {"type":"ammeter","x":4,"y":2},
  {"type":"resistor","x":7,"y":2,"value":100},
  {"type":"voltmeter","x":7,"y":4}
 ],
 "wires":[
  [2,3,2,2,3,2],
  [5,2,6,2],
  [8,2,10,2,10,6,2,6,2,5],
  [6,4,6,2],
  [8,4,8,2]
 ]}
```

Der **Leistungsmesser** zeigt die Leistung eines Bauteils in Watt. Sein Strompfad liegt in Reihe vor dem Bauteil, der dritte Anschluss (unten) kommt an die Rückleitung. Die Lampe für 4,5 V nimmt 1,35 W auf.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1,"value":4.5},
  {"type":"wattmeter","x":6,"y":2},
  {"type":"lamp","x":10,"y":2}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5],
  [6,3,6,6]
 ]}
```

## Oszilloskop mit zwei Kanälen und Signalgenerator

Mit **zwei Kanälen** zeigt das Oszilloskop zwei Kurven: Kanal 1 (links) durchgezogen, Kanal 2 (Mitte) in anderer Farbe und gestrichelt, rechts die gemeinsame Masse. Hier liegt Kanal 1 an der Wechselspannungsquelle, Kanal 2 am Kondensator. Die Kurve am Kondensator ist gegen die Quelle verschoben: Mit 100 Ω und 31,8 µF bei 50 Hz kommt sie um ein Achtel der Periode später, also 2,5 ms (45°), und ist kleiner.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"scope","x":3,"y":3,"channels":2,"time":0.005,"volts":5},
  {"type":"acsource","x":12,"y":7,"rot":1,"value":6,"freq":50},
  {"type":"resistor","x":9,"y":5,"value":100},
  {"type":"capacitor","x":7,"y":7,"rot":1,"value":0.00003183}
 ],
 "wires":[
  [4,5,4,9,12,9,12,8],
  [12,6,12,5,10,5],
  [8,5,7,5,7,6],
  [7,8,7,9],
  [3,5,3,7,6,7,6,5,7,5],
  [2,5,2,10,13,10,13,4,12,4,12,5]
 ]}
```

Der **Signalgenerator** liefert Sinus, Rechteck oder Dreieck; eingestellt werden die Kurvenform, der Scheitelwert und die Frequenz. Hier ein Rechteck mit 5 V und 100 Hz: Auf dem Schirm (2 ms je Kästchen) springt die Spannung alle 5 ms zwischen +5 V und −5 V.

```json @Circuits.sim
{"view":"picture",
 "parts":[
  {"type":"siggen","x":2,"y":5,"rot":3,"wave":"square","value":5,"freq":100},
  {"type":"resistor","x":5,"y":2,"value":100},
  {"type":"scope","x":12,"y":4,"time":0.002,"volts":2}
 ],
 "wires":[
  [2,4,2,2,4,2],
  [6,2,8,2,8,8,2,8,2,6],
  [11,6,8,6],
  [13,6,13,9,1,9,1,2,2,2]
 ]}
```

## Aufgaben mit Selbstkontrolle

Zu einer Schaltung kann eine **Aufgabe** gehören. Sie steht unter der Fläche, mit ihren Zielen und je einem Häkchen. Gibt es dazu eine Messwerttabelle, sind Aufgabe und Messwerte zwei Reiter. Sind alle Ziele erfüllt, erscheint „Geschafft!“. Bei einem Kurzschluss gilt nichts als gelöst.

Hier nennt die Beschreibung außerdem, welche Teile die **Leiste** anbietet: nur Batterie, Schalter und Lampe. Leitungen zieht man wie immer von den Anschlusspunkten aus.

```json @Circuits.sim
{"view":"picture",
 "task":{"text":"Baue die Schaltung so um, dass beide Lampen hell leuchten.",
  "goals":[{"type":"lamp","count":2,"is":"bright","label":"Zwei Lampen leuchten hell"}]},
 "palette":["battery","switch","lamp"],
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1},
  {"type":"lamp","x":6,"y":2},
  {"type":"lamp","x":10,"y":2}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5]
 ]}
```

Ein Ziel kann auch ein **Messwert** sein. Diese Schaltung ist dazu **gesperrt**: Der Schieber lässt sich bewegen, umbauen lässt sich nichts.

```json @Circuits.sim
{"view":"symbol",
 "lock":true,
 "task":{"text":"Stelle den Schiebewiderstand so ein, dass 60 mA fließen.",
  "goals":[{"measure":"A","min":0.059,"max":0.061,"label":"Das Multimeter zeigt 60 mA"}]},
 "parts":[
  {"type":"battery","x":2,"y":4,"rot":1,"value":9},
  {"type":"potentiometer","x":5,"y":2,"value":100,"pos":0.2},
  {"type":"resistor","x":8,"y":3,"value":100},
  {"type":"multimeter","x":11,"y":3,"mode":"A"}
 ],
 "wires":[
  [2,3,2,2,4,2],
  [5,3,7,3],
  [9,3,10,3],
  [12,3,12,6,2,6,2,5]
 ]}
```

## Sperren, Fehlersuche und Messwerttabelle

In einer **gesperrten** Schaltung kann man schalten, Schieberegler bedienen und messen – auch die Klemmen des Multimeters umsetzen. Bauteile holen, verschieben, drehen oder entfernen, Leitungen legen und Zahlenwerte ändern geht nicht.

```json @Circuits.sim
{"view":"picture",
 "lock":true,
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1,"value":4.5},
  {"type":"switch","x":6,"y":2,"closed":false},
  {"type":"lamp","x":10,"y":2},
  {"type":"multimeter","x":7,"y":5,"mode":"V","a":[9,2],"b":[11,2]}
 ],
 "wires":[
  [3,3,3,2,5,2],
  [7,2,9,2],
  [11,2,11,6,3,6,3,5]
 ]}
```

**Fehlersuche:** Eine der drei Lampen ist defekt, und man sieht es ihr nicht an. Mit dem Multimeter lässt sie sich finden: An der defekten Lampe liegt die ganze Spannung, an den anderen keine. Lampe antippen und „Ersetzen“ wählen – die Fläche sagt, ob die alte defekt war.

```json @Circuits.sim
{"view":"picture",
 "lock":true,
 "task":{"text":"Eine Lampe ist defekt. Finde sie mit dem Multimeter und ersetze sie.",
  "goals":[{"type":"lamp","count":"all","is":"bright","label":"Alle Lampen leuchten hell"}]},
 "parts":[
  {"type":"battery","x":2,"y":4,"rot":1,"value":9},
  {"type":"lamp","x":5,"y":2,"value":10,"power":0.9},
  {"type":"lamp","x":8,"y":2,"value":10,"power":0.9,"fault":true},
  {"type":"lamp","x":11,"y":2,"value":10,"power":0.9},
  {"type":"multimeter","x":7,"y":5,"mode":"V","a":[4,2],"b":[6,2]}
 ],
 "wires":[
  [2,3,2,2,4,2],
  [6,2,7,2],
  [9,2,10,2],
  [12,2,12,6,2,6,2,5]
 ]}
```

**Messwerttabelle:** „Messwerte notieren“ schreibt die Anzeigen aller Messgeräte als Zeile in eine Tabelle unter der Fläche. Schieber verstellen, notieren, wieder verstellen: So entsteht eine Messreihe. 9 V an 100 Ω, 150 Ω und 200 Ω ergeben 90 mA, 60 mA und 45 mA.

```json @Circuits.sim
{"view":"symbol",
 "lock":true,
 "table":true,
 "parts":[
  {"type":"battery","x":2,"y":4,"rot":1,"value":9},
  {"type":"potentiometer","x":5,"y":2,"value":100,"pos":0},
  {"type":"resistor","x":8,"y":3,"value":100},
  {"type":"multimeter","x":8,"y":5,"mode":"V","a":[7,3],"b":[9,3]},
  {"type":"multimeter","x":11,"y":3,"mode":"A"}
 ],
 "wires":[
  [2,3,2,2,4,2],
  [5,3,7,3],
  [9,3,10,3],
  [12,3,12,7,2,7,2,5]
 ]}
```

## Leere Arbeitsfläche

Ein leerer Block ergibt eine leere Fläche zum freien Bauen.

```json @Circuits.sim
{"view":"picture"}
```

## Sprachen

Die Arbeitsfläche spricht die Sprache des Kurses (`language:` im Kopf) – in allen 45 Sprachen von LiaScript ([lia-localization](https://github.com/LiaScript/lia-localization)): am, ar, bg, bn, ca, cs, da, de, el, en, es, et, eu, fa, fi, fr, ga, hi, hr, hu, hy, it, ja, ka, ko, lt, lv, ms, nb, nl, pa, pl, pt, ro, ru, sk, sl, sq, sv, sw, tr, tw, uk, ur, zh. Auch Zahlen erscheinen in der Schreibweise der Sprache (4,5 V oder 4.5 V).

Wechselt die Sprache der Seite von außen – mit dem Google Übersetzer, der Übersetzung des Browsers oder der Übersetzung in LiaScript –, baut sich jede sichtbare Fläche sofort in der neuen Sprache auf; die Schaltung bleibt, wie sie ist. Die Fläche übersetzt sich dann selbst, der Übersetzer lässt sie aus. Nur eine Sprache, die nicht in der Liste steht, erscheint auf Englisch und wird dem Übersetzer überlassen.

Die Texte stehen in `circuits-parts.js` (Deutsch, Englisch) und `circuits-locale.js` (alle übrigen); die Übersetzungen sind maschinell erstellt – Verbesserungen sind willkommen.

## Die Beschreibung der Schaltung

Die Beschreibung ist ein kurzer Text im JSON-Format. Am einfachsten entsteht er so: Schaltung auf einer Arbeitsfläche bauen, im Menü **⋯** **„Schaltung als Text kopieren“** wählen und den Text im Material in den Block einfügen.

``` json
{"view":"picture",
 "parts":[
  {"type":"battery","x":3,"y":4,"rot":1,"value":4.5}
 ],
 "wires":[
  [3,3,3,2,5,2]
 ]}
```

- `view` – Ansicht beim Start: `picture` (Bilder) oder `symbol` (Schaltzeichen).
- `size` – Breite und Höhe der Fläche in Rasterschritten, z. B. `[14,8]`; ohne Angabe passt sie sich an.
- `parts` – die Bauteile: `type`, der Platz der Mitte auf dem Raster (`x`, `y`) und die Drehung `rot` in Vierteldrehungen (0 bis 3). Die Anschlüsse liegen einen Rasterschritt neben der Mitte.
- `wires` – die Leitungen als Folge von Rasterpunkten `[x1,y1,x2,y2,…]`. Eine Leitung ist an ihren Enden angeschlossen und dort, wo ein Anschluss oder ein Leitungsende auf ihr liegt. Leitungen, die sich nur kreuzen, sind nicht verbunden.

Für Aufgaben im Unterricht gibt es weitere Angaben; ohne sie verhält sich die Fläche wie bisher:

- `palette` – die Teile, die die Leiste anbietet, z. B. `["battery","switch","lamp"]`; ohne Angabe alle.
- `lock` – `true` sperrt die Schaltung: schalten, Schieberegler bedienen und messen geht, umbauen und Zahlenwerte ändern nicht.
- `table` – `true` zeigt unter der Fläche „Messwerte notieren“ und die Tabelle der notierten Messwerte.
- `flow` – `"electrons"` lässt die Punkte auf den Leitungen in Richtung der Elektronen wandern (von − nach +); ohne Angabe zeigen sie die technische Stromrichtung (von + nach −).
- `potential` – `true` färbt die Leitungen von Anfang an nach ihrem Potenzial (wie der Knopf **Potenzial**).
- `sound` – `true` schaltet den Ton von Anfang an ein. Browser spielen Ton erst nach einer Bedienung; er beginnt also mit der ersten Berührung der Fläche.
- `task` – die Aufgabe: `text` und `goals`, die Liste der Ziele. Ein Ziel ist entweder ein Zustand von Bauteilen – `{"type":"lamp","count":2,"is":"bright"}` mit `is` gleich `bright` (leuchtet hell), `on` (leuchtet, dreht sich, summt, schwingt, hat angezogen, hält Klammern, wird gekurbelt oder führt Strom) oder `off`; `count` ist die Mindestzahl oder `"all"` für alle Bauteile dieser Art – oder ein Messwert: `{"measure":"A","min":0.059,"max":0.061}` mit `measure` gleich `V`, `A`, `R` oder `W` und dem Bereich in Volt, Ampere, Ohm oder Watt (es zählt der Betrag). Jedes Ziel kann mit `label` einen eigenen Text bekommen.
- `fault` an einem Bauteil – `true` macht es defekt, ohne dass man es ihm ansieht: Es leitet nicht, eine Batterie ist leer. „Ersetzen“ behebt den Defekt. Solange die vorgegebene Schaltung einen solchen Defekt enthält, fehlt „Schaltung als Text kopieren“, weil der Text ihn verraten würde.

| `type` | Bauteil | Angaben |
|---|---|---|
| `battery` | Batterie | `value` Spannung in V, `ohm` Innenwiderstand in Ω (Vorgabe 0,01), `form` Bauform: `cell` (Mignonzelle), `flat` (Flachbatterie), `block` (9-V-Block), `coin` (Knopfzelle) – ohne Angabe nach der Spannung; Anschluss 1 ist der Pluspol |
| `source` | einstellbare Spannungsquelle | `value` Spannung in V |
| `switch` | Schalter | `closed` true oder false |
| `button` | Taster | – |
| `changeover` | Umschalter | `pos` 0 oder 1 |
| `lamp` | Lampe | `value` Widerstand in Ω, `power` Nennleistung in W |
| `resistor` | Widerstand | `value` in Ω |
| `potentiometer` | Schiebewiderstand | `value` in Ω, `pos` Stellung von 0 bis 1 |
| `fuse` | Sicherung | `value` Nennstrom in A |
| `multimeter` | Multimeter | `mode` `V`, `A` oder `R` (Widerstand); `a` und `b` sind die Rasterpunkte der roten und der schwarzen Klemme, z. B. `[9,2]` – ohne Angabe stecken sie links und rechts am Gerät |
| `acsource` | Wechselspannungsquelle | `value` Effektivwert in V, `freq` Frequenz in Hz (0,1 bis 1000) |
| `capacitor` | Kondensator | `value` Kapazität in F, z. B. `0.001` für 1 mF |
| `inductor` | Spule | `value` Induktivität in H, `ohm` Wicklungswiderstand in Ω |
| `scope` | Oszilloskop | `time` Sekunden je Kästchen, `volts` Volt je Kästchen, `channels` 1 oder 2; die Anschlüsse liegen unten: Kanal 1 links, Masse rechts, Kanal 2 in der Mitte; es lässt sich nicht drehen |
| `diode` | Diode | `value` Schwellenspannung in V (Vorgabe 0,7); der Strom fließt von Anschluss 1 nach Anschluss 2 |
| `led` | Leuchtdiode | `color` `red`, `yellow`, `green`, `blue` oder `white`; volle Helligkeit bei 20 mA, über 50 mA brennt sie durch |
| `transistor` | Transistor (NPN) | `value` Verstärkungsfaktor; Anschlüsse: Basis links, Kollektor rechts oben, Emitter rechts unten |
| `ldr` | Fotowiderstand | `light` Helligkeit von 0 (dunkel, 1 MΩ) bis 1 (hell, etwa 320 Ω) |
| `motor` | Motor | `value` Widerstand in Ω, `volts` Nennspannung in V |
| `buzzer` | Summer | `value` Widerstand in Ω, `volts` Nennspannung in V |
| `solar` | Solarzelle | `light` Helligkeit von 0 (dunkel) bis 1, `value` Leerlaufspannung und `amps` Kurzschlussstrom bei vollem Licht (Vorgabe 3 V und 50 mA); Anschluss 1 ist der Pluspol |
| `dynamo` | Handgenerator | `crank` true, solange gekurbelt wird; `pace` Tempo von 0 bis 1, `value` Spannung bei vollem Tempo (Vorgabe 6 V), `ohm` Widerstand der Wicklung (Vorgabe 5 Ω); Anschluss 1 ist der Pluspol |
| `relay` | Relais | `volts` Nennspannung und `ohm` Widerstand der Spule (Vorgabe 6 V und 100 Ω); Anschlüsse: Spule links oben und unten, Kontakt (Schließer) rechts oben und unten |
| `magnet` | Elektromagnet | `value` Widerstand in Ω (Vorgabe 10 Ω) |
| `speaker` | Lautsprecher | `value` Widerstand in Ω (Vorgabe 8 Ω) |
| `ntc` | Heißleiter | `value` Widerstand bei 25 °C (Vorgabe 10 kΩ), `temp` Temperatur von 0 bis 100 °C |
| `voltmeter` | Voltmeter | –; Anschluss 1 ist Plus |
| `ammeter` | Amperemeter | –; der Strom zählt positiv, wenn er bei Anschluss 1 hineinfließt |
| `wattmeter` | Leistungsmesser | –; Anschlüsse: Eingang links, Ausgang rechts (dazwischen der Strompfad), Rückleitung unten |
| `siggen` | Signalgenerator | `wave` `sine`, `square` oder `triangle`; `value` Scheitelwert in V, `freq` Frequenz in Hz (0,1 bis 1000) |

## So rechnet der Baustein

- Leitungen sind ideal. Quellen haben einen Innenwiderstand von 0,01 Ω; geschlossene Schalter, die Sicherung und das Multimeter als Strommesser haben 0,001 Ω, als Spannungsmesser und das Oszilloskop 10 MΩ.
- Ein Kurzschluss wird gemeldet, wenn durch eine Quelle mehr als 10 A fließen oder wenn sie fast ihren ganzen Kurzschlussstrom abgibt.
- Die Lampe brennt durch, wenn ihre Leistung das 2,25-Fache der Nennleistung übersteigt, also ab der 1,5-fachen Nennspannung.
- Die Lampe ist ein fester Widerstand. Ihr sichtbares Licht fällt schneller als ihre Leistung (etwa mit der Leistung hoch 1,7, wie bei einer Glühlampe): Bei halber Spannung bleibt rund ein Zehntel, und das Licht wird orange.
- Liegen Leitungen übereinander, wird die Stelle orange markiert und unter der Fläche gemeldet. Die Leitungen sind dort verbunden.
- Berechnet wird mit der Knotenanalyse; die Ströme in den Leitungen folgen aus der Knotenregel.
- Schaltungen mit Kondensator, Spule, Wechselspannung oder Oszilloskop laufen in der Zeit weiter: 200 Rechenschritte je Periode der schnellsten Wechselspannung, höchstens 1 ms je Schritt (Verfahren BDF2). Je Bild rechnet die Fläche höchstens 6 ms; schafft das Gerät die Schritte darin nicht, läuft die Schaltung in Zeitlupe, und die Fläche zeigt das an. Wie hoch die Frequenz in Echtzeit sein kann, hängt also vom Gerät ab. Messwerte, Oszilloskop und Ton stimmen auch in der Zeitlupe.
- Im Zeitverlauf mittelt das Multimeter über ganze Perioden (mindestens 0,1 s). Bei einer Wechselgröße zeigt es den Effektivwert mit einem „~“ davor.
- Der Glühfaden der Lampe ist träge (etwa 60 ms), deshalb flackert sie bei 50 Hz nicht.
- Diode und Leuchtdiode haben eine Knickkennlinie: Unter der Schwellenspannung sperren sie, darüber leiten sie mit 0,05 Ω. Das lässt sich von Hand nachrechnen; die gekrümmte Kennlinie echter Dioden bildet es nicht ab.
- Der Transistor (NPN) kennt drei Zustände: Er sperrt, solange an der Basis weniger als 0,7 V liegen; er verstärkt (Kollektorstrom = Verstärkung × Basisstrom); oder er ist durchgeschaltet, dann bleiben zwischen Kollektor und Emitter 0,2 V.
- Motor und Summer sind elektrisch Widerstände. Der Motor läuft ab einem Zehntel seiner Nennspannung an, der Summer summt ab der halben.
- Die Solarzelle ist eine Quelle mit Innenwiderstand: Ihr Kurzschlussstrom wächst mit dem Licht, ihre Leerlaufspannung kaum (je Zehntel des Lichts 10 % weniger). Im Dunkeln liefert sie nichts.
- Der Handgenerator ist eine Quelle, deren Spannung mit dem Tempo wächst, mit dem Widerstand der Wicklung als Innenwiderstand.
- Das Relais zieht an, sobald an seiner Spule 70 % der Nennspannung liegen, und fällt unter 40 % wieder ab. Spule und Kontakt sind nicht leitend verbunden.
- Der Elektromagnet ist elektrisch ein Widerstand. Er hält je 0,1 A eine Büroklammer (gerundet), höchstens zwölf; im Zeitverlauf zählt der gemittelte Betrag des Stroms.
- Der Lautsprecher ist elektrisch ein Widerstand. Er misst die Frequenz der Spannung an ihm selbst (Abstand der Nulldurchgänge) und schwingt ab 16 Hz und 0,05 V effektiv. Gleichspannung lässt ihn still.
- Der Heißleiter folgt R = R₂₅ · e^(B·(1/T − 1/298,15 K)) mit B = 3950 K.
- Voltmeter und Amperemeter messen wie das Multimeter. Der Leistungsmesser zeigt Strom mal Spannung, im Zeitverlauf gemittelt (Wirkleistung).
- Der Signalgenerator liefert seine Kurvenform mit dem eingestellten Scheitelwert; Rechteck und Dreieck haben dieselbe Periode wie der Sinus.
- Eine Aufgabe gilt als gelöst, sobald alle ihre Ziele gleichzeitig erfüllt waren; „Geschafft!“ bleibt dann stehen, bis man zurücksetzt. „Hell“ heißt: mehr als die Hälfte des vollen Lichts.
- Ein Bauteil mit verstecktem Defekt nimmt an der Rechnung nicht teil: Es leitet nicht, leuchtet nicht und misst nicht.

Geprüft wird die Berechnung mit `node --test lia-templates/circuits/check.mjs`.
