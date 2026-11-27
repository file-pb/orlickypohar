# 10-grafik — kolo 1

## Co je dobře

1. **Tmavý a světlý vzhled jsou opravdu dvě podoby téhož.** Tokeny jsou
   v párech a tam, kde číslo lhalo, rozhodlo oko (`--sytost-agendy` 3 / 5 %,
   přitlumené `--ukon-*`). Na 68 snímcích (17 obrazovek × 375 a 1280 px ×
   oba vzhledy) se rozcházejí jen na dvou místech (nálezy 1 a 5).
2. **Tabule je nejhezčí obrazovka webu** (1280): kulatý znak, název regaty
   v proužkovaném Inter Black (`tabule-nazev.tsx`), tři klidné sloupce. Důkaz,
   že značka vlastní řeč má — jen se jinde nepoužívá.
3. **Znaky tříd** (`znaky-trid.ts`): siluety plachet v barvě třídy, stejné
   v záložkách pořadí, na úvodu i na tabuli. Ilustrace, která nese význam.
4. **Rám stavu a lano.** Stav vsazený do rámu karty (`.karta.ram-stavu`)
   a pramen lana za nadpisem (`h1::after`, srovnaný na optický střed verzálek
   o 0,7 px) jsou řemeslné detaily; námořní motiv bez kýče.
5. **Stín znamená výšku.** Karta je plochá (`--papir`, 1 px `--linka`), stín
   mají jen věci, které plavou (`--stin-nabidky`, `--stin-listy`).

## Co je špatně

### 1. Nejlepší věc, kterou web má, není vidět — úvodní fotka (ot. 3, 7)

- **Nález** — Tři výborné snímky 2,2 : 1 (loď v náklonu, lodě pod zámkem
  Orlík, červený spinakr) leží i v repozitáři (`web/public/foto/hero*.jpg`),
  takže jsou vidět i na `localhost`. Vrstva `.hero-fotky` je ale vysoká
  `--hero + 2rem + 70vh` (`globals.css:540`): na 375 px je to 800 px, fotka se
  roztáhne na šířku 1761 px a zbude z ní **21 % šířky**. Úplně bez závoje je
  jen pás 56–90 px od vrchu, tedy **34 px** (na 1280 px 12 px); pod ním závoj
  do 86 % (`:545–560`). Loď, voda i zámek leží v dolních dvou třetinách —
  pod závojem. Vidět je les a cíp plachty. Ve světlém vzhledu se navíc závoj
  mění v šedou mlhu a popisky sloupců „Průběžné pořadí / Novinky / Kalendář"
  v ní mizí (375 i 1280, mock i produkce).
- **Proč to vadí** — Cizí člověk z úvodu nepozná, že jde o plachtění na
  Orlíku; fotka funguje jako textura. Mlha pod kartami působí jako špinavé
  pozadí a je to jediné místo, kde je světlý vzhled horší než tmavý.
- **Návrh** — Fotka je obraz, ne podklad: `.hero-fotky` vysoká jen jako
  `--hero`, závoj jen ve spodních 40 % pod textem, pod pásem čistá
  `--pozadi`. Na 375 px je pás 375 × 200 (1,9 : 1) skoro poměr snímku —
  **bez jediného pixelu výšky navíc** je vidět 85 % fotky. Na monitoru
  `--hero` 320 px (4 : 1) a `object-position` zvlášť pro každý snímek.

### 2. Tři jména a dvě modré — značka a web nejsou jedna věc (ot. 7)

- **Nález** — V hlavičce stojí vedle sebe „ORLIK YACHT SERIES" (obvod znaku)
  a „ORLICKÁ SÉRIE" (nápis), titulek stránky a `h1` říkají „Orlický pohár".
  Modrá znaku `#0c4a8c` (`globals.css:370`) není nikde jinde; všechno, na co
  se kliká, je petrolejová `--voda #1f6f8b`. Červená linka v úvodu `#c41e3a`
  (`:617`) je „z loga", které se už nekreslí (`logo-puvodni.tsx`). Nadpis
  stránky bere barvu úkonu (`--ukon-strany`): zelený Kalendář, indigové
  Přihlášky, modré Výsledky; na veřejné regatě je šedý.
- **Proč to vadí** — Značku dělá opakování. Tady se znak neopakuje barvou,
  písmem ani jménem, takže působí jako nálepka na cizím webu. Místo, kde by
  barva značky mohla žít — nadpis — je obsazené orientací.
- **Návrh** — `--barva-znacky` povýšit na kořenový token `--znacka` a dát mu
  tři místa: plné tlačítko `.tlacitko`, linka v úvodu místo červené, `h1`
  veřejných stránek. `--voda` zůstane odkazům. Jméno viz otázky.
  *Překryv s 2-design:* on řeší, co barva znamená; já, že žádná není značky.

### 3. Písmo nemá stupnici (ot. 7, audit E)

- **Nález** — `globals.css` má 63 různých `font-size`. Na úvodu (375) je
  naráz 19 velikostí, z toho **11 mezi 10,88 a 15,2 px** (10,88 · 11,2 ·
  11,52 · 12 · 12,48 · 12,8 · 13,6 · 14 · 14,4 · 14,8 · 15,2). Verzálkové
  popisky: 27 pravidel, 14 hodnot prostrkání (0,04–0,3 em); na jedné
  obrazovce 12 px / 0,07 em, 12 / 0,04, 11,52 / 0,05, 10,88 / 0,05. V okně
  regaty má `h1` 19,2 px a `h2` 18,4 px — rozdíl 0,8 px.
- **Proč to vadí** — Krok 0,3–0,5 px oko nečte jako úroveň, jen jako neklid;
  proto stránka působí „slepená z kusů", i když každý kus je čistý. Písmo je
  systémové, na každém stroji jiné — o to víc musí výraz nést stupnice.
- **Návrh** — Šest stupňů jako tokeny: 12 · 13 · 14,4 · 16 · 19 · 28 px.
  Jeden verzálkový popisek: 12 px, 600, 0,07 em (ten z „PRŮBĚŽNÉ POŘADÍ").
  Písmo pod 12 px z auditu E tím zmizí samo.
  *Překryv s 2-design:* já stupnici, on co na kterém stupni stojí (`h1`).

### 4. Tlačítko má pět tvarů a pilulka dva významy (ot. 2, audit B)

- **Nález** — Správa na 375 px: plné `.tlacitko` r 10 („Nová rozjížďka"),
  obrysová pilulka r 999 („Stáhnout z webu"), hranaté tlačítko s tmavým
  rámečkem („Vystavit kód k připojení" — písmo 13,33 px × 32, tedy výchozí
  písmo prohlížeče, web se nedědí), dlaždice r 8 s barevnou hranou
  a trojúhelník `summary`. Pilulka je zároveň stav („odjeto"), vlastnost
  („dálková plavba") i úkon. Poloměry v CSS: 10 px × 29, 8 × 26, 7 × 7,
  6 × 10, 4 × 7, 12 × 3, 14 × 2 — na úvodu šest naráz.
- **Proč to vadí** — Tvar neříká, na co se dá klepnout. A rozdíl 7 / 8 /
  10 px není rozhodnutí, ale drift — karta a dlaždice vedle sebe „skoro"
  sedí, což je horší než zřetelný rozdíl.
- **Návrh** — Tři poloměry jako tokeny: 4 px (pole, drobnosti), 10 px
  (karta, dlaždice, tlačítko), 999 px **jen pro štítek, na který se
  neklepe**. Dvě tlačítka: plné (jeden krok) a obrysové r 10 (zbytek).
  Základní pravidlo pro `button` z auditu B ať nese i `font: inherit`.

### 5. Pevné pruhy návštěvníka: 231 px, ne 124 (ot. 4)

- **Nález** — Audit měřil správce, kterému layout zmenší logo a schová
  partnery. Návštěvník na 375 × 812: hlavička **110 px** (nabídka spadne pod
  logo, `globals.css:477`; vpravo nahoře zůstane prázdných ~68 px), počasí
  57, partneři 64 = **231 px, 28 %**. Na 1280 × 900: 98 + 57 + 76 = 231 px,
  26 %. Produkce má nad tím ještě 46 px pruhu ukázky. V tmavém vzhledu jsou
  dlaždice partnerů `#fff` (`:3263`) nejjasnější plocha obrazovky.
- **Proč to vadí** — Obsah je obraz v rámu těžším než on sám: tři pruhy,
  dva se hýbou. V tmavém vzhledu oko skončí na logu sponzora, ne na
  výsledku; hlavička o dvou nesrovnaných osách je první, co návštěvník vidí.
- **Návrh** — Na telefonu jednořádková hlavička s logem 52 px pro každého
  (už existuje: `globals.css:2280`) → 67 px. Dlaždice partnerů v tmavém
  vzhledu `#e8e6e1` bez rámečku. *Překryv s 1-ergonomie:* cenu pruhů v práci
  počítá on; já říkám, že rám přebíjí obraz.

### 6. Vodoznak působí jako šmouha (dojem)

- **Nález** — `.pozadi-znak`: 486 px na 1280, průhlednost 0,07, rozostření
  4 px (`globals.css:411`). Karty jsou neprůhledné, takže ze znaku vykukují
  jen oblouky ve spárách; na telefonu je to 113 px v rohu pod hlavičkou.
- **Proč to vadí** — Rozostřený tvar bez volné plochy kolem se čte jako
  nečistota displeje, ne jako hloubka, a zlevňuje ostrý znak v hlavičce.
- **Návrh** — Jen na veřejných stránkách od 1180 px; jinde nic.

### 7. Čtyři vady, které je vidět jen okem

- **Nález** — (a) 1280 px, `/serie/…/poradi`, levý sloupec „Novinky"
  (`boky.tsx`, tmavý vzhled): titulek po jednom slově na řádek a datum přes
  něj. (b) 375 px, přihlášky: štítek „potvrzená" uříznutý hranou tabulky.
  (c) Novinka bez fotky dostane šedou plochu se znakem ČSJ, na 375 px
  vysokou 159 px. (d) Převzatý titulek ve verzálkách 18,4 px / 700 je
  nejhlasitější text úvodu.
- **Proč to vadí** — (a) a (b) vypadají jako rozbitá stránka. (c) a (d)
  dávají největší plochu a největší hlas obsahu, který je nejméně náš.
- **Návrh** — (a), (b) opravit s A1. Novinka bez fotky je karta jen
  s textem; převzatý titulek o stupeň níž (16 px / 600).

## Co bych potřeboval vědět

- **Filip, 8-pr:** Které jméno platí — Orlický pohár, Orlická série, nebo
  Orlik Yacht Series? A přejde appka z původního loga na kulaté, aby oboje
  dveře měly jeden znak?
- **Filip:** Existuje znak i bez textu po obvodu? Při 52 px je ten text
  odhadem 4 px vysoký. A jsou od Jiřího Tašiho další snímky pro regaty?
- **8-pr:** Váže slib partnerům pevný pruh i na telefonu, nebo stačí blok
  log na stránce? Od toho se odvíjí nález 5.
- **1-ergonomie, 3-ux:** Vyšší pás fotky na monitoru (320 px místo 150)
  posune první regatu o 170 px níž. Na telefonu nic. Unesete to?

## Čeho se nedotýkám

- Počtu odkazů a tlačítek v kalendáři a přihláškách (ot. 1, 2, audit C) —
  1-ergonomie a 3-ux; mně jde jen o jejich tvar.
- Kontrastu v číslech (A3, audit E) — 2-design. Délky stránek (ot. 6)
  a toků — 3-ux. Věcné správnosti pořadí a kódů — 5-jachting.
- Tabule na telefonu (ot. 5, A2): tvar pro 375 px navržený není, takže
  není co posuzovat; jestli má vzniknout, je věc 3-ux a 5-jachting.
