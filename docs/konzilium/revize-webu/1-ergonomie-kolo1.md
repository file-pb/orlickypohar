# Ergonomie ovládání — kolo 1

Měřeno 27. 11. 2026 na **375 × 812**, účet `filip`, mock `2026-nanecisto`.
**Cílovou obrazovku jsem živě neviděl** — v mocku jsou všechny rozjížďky
potvrzené a nová by znamenala odeslat formulář. Co o ní píšu, je z `cil.tsx`
a z CSS, a je to tak označené.

## Co je dobře

1. **Dojezd je jedno klepnutí do velkého cíle.** `.cil-lod` má
   `min-height: 3.6rem` = 57,6 px a `touch-action: manipulation`
   (`globals.css:1919–1923`), čas se bere v okamžiku klepnutí (`cil.tsx:287`)
   a displej nezhasne. To je přesně zadání startéra ze `SCENARE-OVLADANI.md`.
2. **Pruh dlaždic stojí jedno klepnutí bez návratu.** Šest dlaždic regaty
   164 × 44 px ve dvou sloupcích; z přihlášek na rozjížďky se nejde přes
   rozcestník. Změřeno na všech oknech správy.
3. **Nejčastější skok je největší cíl.** Řádek regaty ve správě 335 × 66 px,
   karta regaty na úvodu 335 × 65 px — celá plocha, ne slovo v ní.
4. **Správa nelepí nic navíc.** Pruh počasí tam není, pevných je 67 px (8 %).
5. **Zápis z papíru otevře číselnou klávesnici** (`type="number"`
   + `inputMode="numeric"`, `vysledky/[zavod]/[cislo]/page.tsx:249–253`)
   a nevratné úkony na kartě rozjížďky jsou dvoukrokové — minutí nic nezruší.

## Co je špatně

### 1. Přihlášky: úkon prezence není na telefonu celý vidět — nikdy
- **Nález** — tabulka má 587 px v obalu 333 px (`th, td { white-space:
  nowrap }`, `globals.css:913`). Sloupec s tlačítkem prezence začíná na
  x = 474. Sloupec *Loď* je lepivý a široký 255 px, takže na ostatní sloupce
  zbývá okno 78 px. Po posunu úplně doprava (254 px) leží tlačítko na
  x 231–343, ale lepivý sloupec ho kryje do x = 276: **vidět je 67 ze 112 px,
  z nápisu jen „… prezenci"**. Sloupec *Stav* v tu chvíli vidět není vůbec.
- **Proč to vadí** — prezence 16 lodí je ranní úkon pořadatele. Stojí tah
  do strany, po němž zmizí stav, a 16 klepnutí do půlky tlačítka, u kterého
  se nedá přečíst, jestli potvrzuje, nebo ruší. Co je naopak hned po ruce, je
  *Vystavit kód* (21 px) 3 px pod *Podrobnostmi* (20 px, stejné x = 32) —
  minutí o výšku řádku vystaví kód.
- **Návrh** (otázka 2) — na šířce pod 48 rem řádek lodi jako karta podle
  vzoru rozjížďky: nahoře jméno a stav, pod tím **jedno tlačítko prezence
  přes šířku, 44 px**; *Vystavit kód* a změny stavu dovnitř *Podrobností*.
  34 tlačítek → 16, žádný vodorovný posun.

### 2. Cesta k cíli se s každou rozjížďkou prodlužuje (scénář C5)
- **Nález** — z úvodu: účet (32 px) → *Správa* → *Regaty* → řádek regaty →
  posun → *Nová rozjížďka — cílová obrazovka*. **Pět klepnutí a posun
  o 1 380 px (1,7 obrazovky)**; tlačítko je za seznamem
  (`vysledky/[zavod]/page.tsx:290`) a každá odjetá rozjížďka ho odsune
  o dalších 250 px. Zpátky z cíle vede jen drobeček (22 px, druhý řádek)
  nebo odkaz ve větě (16 px).
- **Proč to vadí** — je to jediná cesta, která se chodí pod tlakem, a je
  nejdražší právě při čtvrté rozjížďce dne, kdy je nejmíň času.
- **Návrh** — formulář *Nová rozjížďka* **nad seznam**. Jedna změna pořadí
  bloků, žádný javascript.

### 3. Cíl: mřížka lodí se po každém klepnutí přeskládá (z kódu, neviděno)
- **Nález** — dojetá loď z mřížky zmizí (`zbyvaji`, `cil.tsx:284`) a mřížka
  je `repeat(auto-fill, minmax(9rem, 1fr))` (`globals.css:1918`), na 333 px
  dva sloupce po 162 px. Každá loď za tou klepnutou tedy **přeskočí do
  druhého sloupce**, polovina z nich i o řádek výš.
- **Proč to vadí** — C5 čte dojezdy po 1–2 s. Oko si loď najde, palec
  vyrazí, a cíl mezitím změnil sloupec. Chyba = cizí loď s cizím časem.
  Podle CSS se navíc 22 lodí (11 řad × 65,6 px + nadpisy kategorií) nevejde
  pod lištu naráz, takže se hledá i posunem.
- **Návrh** — dojetá dlaždice **zůstane na místě**, zešedne a nese pořadí;
  nic se neposouvá. Cíl je jediná obrazovka, kde javascript smí být.

### 4. Cíl: opravy pořadí jsou čtyři cíle po 38 px s mezerou 4 px
- **Nález** — `.cil-opravy button` má 2,4 rem = 38,4 px, `gap: 0.25rem`
  (`globals.css:1938–1940`); v řadě ↑ ↓ = ✕. *✕* vrací loď na vodu
  (`odeberMisto`, `cil.tsx`) a sedí 4 px od *=*.
- **Proč to vadí** — oprava záměny (C6) se dělá, když už se spěchá. Palec
  mířící na *↓* nebo *=* smaže dojezd **i s jeho časem**; čas se znovu
  nezměří.
- **Návrh** — tlačítka 44 px, mezera 8 px, a *✕* pryč z řady: na druhý
  konec řádku, nebo pod klepnutí na jméno.

### 5. Kalendář správy: karta má nést jeden cíl, ne sedm (otázka 1)
- **Nález** — karta regaty má 205 px; sedm odkazů je 17 px vysokých ve dvou
  řadách s roztečí 23 px (*rozjížďky* a *směrnice* pod sebou na x = 39).
  *Stáhnout z webu* (123 × 32) je 7 px od *Vrátit mezi vypsané* a odesílá
  se bez potvrzení (`kalendar/page.tsx:517`).
- **Proč to vadí** — odkazy zdvojují pruh, ale jako cíl jsou 2,6× nižší než
  dlaždice, na kterou vedou. Kdo je použije, trefuje se hůř, než kdyby šel
  oknem; kdo mine tlačítko, schová regatu veřejnosti.
- **Návrh** — jméno regaty jako celý řádek 44+ px do okna regaty; sedm
  odkazů pryč; tři úkony pod jedno *Další úkony*. Ke kterékoliv agendě
  2 klepnutí místo 1, obě do 44 px. Osm karet × 205 px → osm řádků × ~70.

### 6. První řádek, se kterým se pracuje, začíná na 649 px
- **Nález** — přihlášky i kalendář: hlavička 67, drobečky 48, pruh 144 až
  195 px, pak nadpis a vysvětlující odstavce (~300 px). První loď i první
  regata leží na y = 649 z 812.
- **Proč to vadí** — každý příchod začíná tahem. Pruh je rozhodnutý a svou
  cenu (18–24 % první obrazovky) vrací; odstavce ne.
- **Návrh** — vysvětlení (*Bez souhlasu s pravidly: 16 z 16 — …*) **pod
  seznam**; nad ním jen počet a jedna věta.

### 7. Pevné pruhy: nejlepší místo pro palec drží počasí (otázka 4)
- **Nález** — pruh počasí je `position: fixed` dole, y 755–812
  (`globals.css:2859`); navigace je nahoře ve třech cílech po 32 px. Užitečná
  výška je 688 px: nápověda (12 867 px) stojí 18,7 tahu místo 15,8.
- **Proč to vadí** — spodních 57 px je jediné místo dosažitelné jednou rukou
  bez přehmatu a nese věc, na kterou se klepe nejmíň. Platí se to i tam,
  kde se jen čte.
- **Návrh** — na telefonu pruh lepit jen na úvodu a veřejné regatě; na
  čtecích stránkách (nápověda, pravidla, vypsání, osobní údaje) blok v patě.
  K B: přepínač vzhledu z hlavičky do nabídky — tři cíle po 44 px chtějí
  132 px a dnes mají 123 (x 232–355).

### 8. K oddílu B: pravidlo ano, ale pořadí podle následku minutí
- **Nález** — základní pravidlo pod `pointer: coarse` chybí
  (`globals.css:6285–6343` jsou jen jednotliviny).
- **Proč to vadí** — vedle prázdna se minout smí, vedle jiného úkonu ne;
  oprava po řádcích tabulky B to nerozliší.
- **Návrh** — jedno pravidlo `button, select, summary, input` (mimo
  zaškrtávátka) `min-height: 44px`, a **nejdřív** tam, kde sousedí dva
  úkony: body 1, 4, 5 a karta rozjížďky (*Vrátit k revizi* a *Zrušit
  rozjížďku* 22 px, mezera 11 px). Drobečky a zkratky regat až potom.

### 9. Drobné, s číslem
- **Zápis z papíru** — *Uložit zápis* je za 37 řádky na konci 4,1 obrazovky
  (`[cislo]/page.tsx:315`). Návrh: `position: sticky; bottom: 0`, jen CSS.
- **Obsah nápovědy** (otázka 6) — 24 kotev po 18 px, jediná cesta, jak
  15,8 obrazovky nepřejet palcem. Návrh: řádky obsahu 44 px.
- **Tabule** (otázka 5) — klepnutí na písmo 2,9 px je klepnutí a návrat
  navíc. Návrh: na šířce telefonu odkaz nenabízet.

## Co bych potřeboval vědět

- **5-jachting:** dělá se prezence s telefonem na molu, nebo u stolu
  s notebookem? Určuje váhu bodu 1.
- **5-jachting:** hledá rozhodčí v cíli loď podle jména, nebo podle čísla
  plachty? Číslo je na dlaždici drobným písmem 0,8 rem.
- **3-ux:** je v *Co teď* v den regaty přímý krok na cíl? V mocku je vše
  potvrzené, neviděl jsem to; zkrátilo by to bod 2 z pěti klepnutí na tři.
- **9-rizika:** *Stáhnout z webu* a *Schovat ročník* jdou jedním klepnutím
  bez potvrzení. Stačí, že jsou vratné?
- **Filip:** smí pruh na telefonu do tří sloupců krátkých jmen (144 → 94 px),
  nebo jsou dva sloupce součást rozhodnutí z 12. 11.?

## Čeho se nedotýkám

- Vzhled, barva, písmo, kontrast (A3, oddíl E) — 2-design a 10-grafik.
- Smysl toku, prázdné stavy, texty a jména — 3-ux.
- Jestli má jít regata schovat jedním klepnutím — 9-rizika; měřím jen
  vzdálenost, o kterou se dá minout.
- Úvodní stránka jako celek (otázka 3) a přetékání A1 — nemám nové měření.
- Appka a role, které jsem neměřil (`milos`, `dana`).
