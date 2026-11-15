# Kiosk – Prototyp-Shop

Ein klickbarer Shopping-Prototyp, der 20 Animations- und UX-Prinzipien sichtbar umsetzt.
Reines HTML/CSS/JavaScript – keine Abhängigkeiten, kein Build.

## Starten

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

(Oder `index.html` direkt im Browser öffnen.)

Oben rechts blendet der **ⓘ-Button** einen Präsentationsmodus ein, der an den Elementen anzeigt, welches Prinzip dort wirkt.

## Wo steckt welches Prinzip?

| Prinzip | Umsetzung im Prototyp |
|---|---|
| **Squash & stretch** | Warenkorb-Zähler und Buttons quetschen sich beim „Aufprall“ und federn zurück (`squash()` in `app.js`). Das fliegende Produkt streckt sich in der Bewegung. |
| **Anticipation** | „In den Korb“ zieht sich kurz zusammen (`windUp()`), bevor das Produkt losfliegt. Das Herz schrumpft kurz vor dem Pop. |
| **Staging** | Detail-Ansicht: Hintergrund wird abgedunkelt und geblurrt, nur das Produkt bleibt im Fokus. Beim Hinzufügen tritt das Modal zurück, damit der Blick dem Produkt folgt. |
| **Pose to pose** | Alle Animationen definieren nur Schlüssel-Posen (Web Animations API / CSS-Transitions); der Browser interpoliert. |
| **Follow through** | Drawer und Warenkorb-Leiste schwingen über und pendeln sich ein; die Einträge folgen leicht verzögert. Das Warenkorb-Icon wackelt nach. Auf dem Handy federn Karten nach dem Loslassen zurück, und ein nicht weit genug gewischtes Sheet schnappt zurück. |
| **Slow in & slow out** | Nur `cubic-bezier`-Easings als Design-Tokens (`--ease-out`, `--ease-in-out`, …), nie `linear`. |
| **Moving in arcs** | Das Produkt fliegt auf einer Bézier-Kurve zum Warenkorb (`flyToCart()`), auf dem Handy in die Warenkorb-Leiste unten; Partikel fallen in Bögen. |
| **Secondary action** | „+1“-Pop und Konfetti am Badge, Ringe beim Herz, das Produkt „landet“ verzögert im Modal. |
| **Snappy timing** | Jede Animation ≤ 300 ms (`--dur-fast` 120 ms, `--dur` 200 ms, `--dur-slow` 280 ms), auch Konfetti, „+1“ und Ringe. Hinzufügen gesamt: 80 ms Ausholen + 260 ms Flug + 240 ms Aufprall. Einzige bewusste Ausnahme ist das Konfetti nach der Bestellung (900 ms), siehe *Frequency of use*. |
| **Exaggerated feedback** | Herz poppt auf 1,45× mit Ringen und Partikeln; ungültige Formularfelder „schütteln den Kopf“. |
| **Solid drawing in 3D** | Produktkarten kippen der Maus folgend (perspective + rotateX/Y), Emoji schwebt per `translateZ`, gestaffelte Schatten, Glanzlicht. Auf dem Handy sinkt die Karte unter dem Finger ein und neigt sich zu ihm; beim Scrollen liegen die Karten wie auf einer leicht gewölbten Fläche. |
| **Overall appeal** | Konsistente Tokens für Farbe, Radius, Schatten, Timing; Dark Mode; `prefers-reduced-motion` wird respektiert. |
| **Fitts's law** | Großer, fixer „Zur Kasse“-Button (56 px hoch, volle Breite) unten im Drawer. Auf dem Handy: Warenkorb-Leiste in der Daumenzone unten und ein fixierter „In den Warenkorb“-Button am Sheet-Ende. |
| **Bigger hit areas** | Icon-Buttons (Herz, Info, „+“, Mengen ±, Farbfelder) haben per `::before` eine unsichtbare Klickfläche von mindestens 44 px. |
| **Hick's law** | Nur 4 Kategorien; Varianten (Farbe/Größe) erst in der Detail-Ansicht. |
| **Miller's law** | Checkout in 3 Schritte gegliedert, Formularfelder in Gruppen (Fieldsets), Fortschrittsanzeige. |
| **Doherty threshold** | Skeleton erscheint sofort, Inhalte < 400 ms; Warenkorb wird optimistisch sofort aktualisiert; „Bezahlen“ antwortet in 380 ms; `touch-action: manipulation` entfernt die Tipp-Verzögerung auf dem Handy. |
| **Postel's law** | Suche ignoriert Groß-/Kleinschreibung, Umlaute und Tippfehler („kafe“ → Kaffee). PLZ `D-10 115` → `10115`, Karte `4242-4242 4242…` → `4242 4242 …`, Ablauf `1/27` → `01/27`. |
| **Jakob's law** | Gewohntes Shop-Layout: Logo links, Suche in der Mitte, Warenkorb rechts, Drawer von rechts. Auf dem Handy wie in Shopping-Apps: wischbare Kategorien, Bottom-Sheet zum Herunterziehen, Drawer zum Wegwischen. |
| **Frequency of use** | Suche und Mengen-± (häufig) ändern nur die Farbe, ohne Bewegung. „In den Korb“ zeigt die volle Show nur beim 1. und 2. Mal, danach fliegt das Produkt ohne Konfetti und „+1“. Die abgeschlossene Bestellung (selten) bekommt die große Feier. |

## Auf dem Handy

- Zwei Spalten mit kompakten Karten und rundem „+“-Button
- Kategorien als wischbare Zeile
- Warenkorb-Leiste unten mit Anzahl, Summe und „Zur Kasse“, sobald etwas im Korb liegt
- Detailansicht als Bottom-Sheet: am Griff oder Bild nach unten ziehen zum Schließen
- Warenkorb nach rechts wischen zum Schließen
- Tastatur-Taste „Weiter“ springt ins nächste Feld, „Fertig“ schließt den Schritt ab
- Hover-Effekte nur bei echter Maus, auf Touch stattdessen Drück-Zustände
- Ränder respektieren Notch und Systemleisten (`env(safe-area-inset-*)`)

## Dateien

- `index.html` – Struktur
- `styles.css` – Design-Tokens, Layout, Zustände
- `app.js` – Daten, Rendering, Warenkorb, alle Animationen
