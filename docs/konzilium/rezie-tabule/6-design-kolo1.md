# Vizuální design — kolo 1

Měřeno na 1920 × 1080, kde `--tv` = 19,2 px, z kódu (`web/app/globals.css`,
oddíl `.tabule` od :3638; komponenty v `tabule/`). Kontrasty spočítané z hexů
tokenů podle WCAG 2.1 (relativní luminance), ne odečtené z fotky. Vzdálenosti
podle úhlové velikosti verzálky: 16′ = pohodlné čtení (ISO 9241-303), 5′ =
hranice rozlišitelnosti. Fyzický pixel: 55" 16:9 → 0,634 mm/px.

## Co je dobře

1. **`--tv` jako jediná jednotka rozměru** (:3611, 193 užití). Důvod je u tokenu
   zapsaný a drží: na 16:9 se nemění nic, na 3440 × 820 už nespadne mapa na
   25 px. Televizní grafika stojí na tom, že se celá hierarchie dá posunout
   z jednoho místa — tady to jde.
2. **`--znacka: min(var(--tv), 19px)`** (:3618). Jediné místo na tabuli, kde je
   hierarchie vyjádřená tím, co **neroste**. Na větší telce má růst to, co se
   čte; značky zůstanou. Správná úvaha, jen se nezobecnila.
3. **Karta se prolne, nelétá**, a `prefers-reduced-motion` má vlastní větev
   (:3819, :3913). Dopočítávání mezisnímků v televizi je skutečné riziko a je
   adresované.
4. **Paleta stop lodí střídá odstín i jas** (`mapa-trackeru.tsx:77`). Změřeno na
   `#14171a`: nejslabší položka je modrá `#4363d8` na 3,44 : 1, nejsilnější
   limetka `#bfef45` na 13,41 : 1 — i to minimum drží nad 3 : 1, které WCAG
   1.4.11 žádá od grafického objektu. Šestnáct barev a žádná pod hranicí.
5. **Rámeček karty škáluje s obrazovkou**: `max(2px, calc(0.1 * var(--tv)))`
   (:3850). Jediná linka na tabuli, která je psaná pro televizi.

## Co je špatně

### D1. Světlý režim tabuli vyprázdní — tři natvrdo tmavé plochy a na nich text z tokenu

- **Nález.** Tabule nikde nevynucuje tmavý vzhled: `app/layout.tsx:66` dává
  `data-rezim` jen z cookie, bez ní rozhoduje `prefers-color-scheme` (:134).
  Uvnitř `.tabule` se žádný token nepředefinovává. Přitom karta má pozadí
  natvrdo `color-mix(in srgb, #14171a 88%, transparent)` (:3824) a semafor
  `var(--panel, #1a1a1a)` (:4024) — `--panel` není nikde definovaný, takže
  platí fallback. Text na nich bere tokeny. Ve světlém režimu tedy:
  `.tabule-alert.zprava` = `--text` `#1a1d21` na `#14171a` → **1,06 : 1**;
  semafor `#1a1d21` na `#1a1a1a` → **1,03 : 1**; nadpisek `.druh` a detail
  `--tlumeny` `#5d666f` na kartě → 3,08 : 1; barevné varianty karty
  `--voda` `#1f6f8b` 3,17 : 1, `--stav-vypsany` `#1c7d4d` 3,50 : 1,
  `--stav-zruseny` `#a8433a` 3,02 : 1. Mapa je tmavá vždy
  (`--voda-podklad, #1b2a36`, :4401), takže se světlý režim nevyrovná ani sám.
- **Proč to vadí.** WCAG 1.4.3 žádá 4,5 : 1 (3 : 1 u velkého textu); 1,06 : 1 je
  prázdná karta. A podle rámce 2 to nikdo nepřepne — vzhled přiveze box
  zapojený do telky, a Android TV i Windows startují ve světlém.
- **Návrh.** `.tabule { color-scheme: dark; }` a hned u toho předefinovat
  `--pozadi/--text/--tlumeny/--linka/--voda/--stav-*` na tmavé hodnoty natvrdo.
  Tabule není web, nemá volbu vzhledu. Jedna deklarace místo čtyř záplat.

### D2. Nic na obrazovce neříká, kdo vede

- **Nález.** V celém oddílu `.tabule` (:3638–6320) není **ani jeden** selektor
  `:first-child`, `:nth-child` ani nic, co by odlišilo první místo. Žebříček,
  pásy tříd i výsledky mají každý řádek ve stejné velikosti, váze a barvě
  (`.tabule li`, :4235; `.tabule-vysledky-trida li`, :5965). Jediné zvýraznění
  řádku je `.nacrt-v-zaberu` (:5445) — a to barvou **lodi, na kterou míří
  mapa**. Číslo pozice je navíc nejtlumenější prvek řádku: `li b` má
  `--tlumeny` (:5968), tedy 7,03 : 1 proti 14,99 : 1 jména vedle něj.
- **Proč to vadí.** Nejtěžší prvek na obrazovce nese „na co se kouká kamera",
  ne „kdo vyhrává" — obrácená hierarchie. Divák, který se podívá na tři
  sekundy, nemá za co zavadit očima.
- **Návrh.** První řádek v každém pásu a v žebříčku: jméno v `--text` váhou 700
  a o 0,3 `--tv` větší, číslo pozice z `--tlumeny` na `--text`. Žádná nová
  barva, jen váha a rozměr.

### D3. Nejmenší text má 12,48 px a stojí v pohyblivém pásu

- **Nález.** Podlaha tabule je `.tabule-tridy .pas-stitek` = `0,65 × --tv`
  = **12,48 px** (:5409), štítek „v cíli". Z 61 deklarací `font-size` v `.tabule`
  je **27 (44 %) pod 1 × --tv**. Verzálka 12,48px písma ≈ 8,7 px:

  | | 43" | 55" | 65" |
  |---|---|---|---|
  | `pas-stitek` 12,48 px | 0,93 / 2,98 m | 1,19 / 3,81 m | 1,41 / 4,50 m |
  | `bok-lod` 17,28 px (jméno lodi v pásu) | 1,29 / 4,12 m | 1,65 / 5,27 m | 1,95 / 6,23 m |
  | `.tabule li` 26,88 px (žebříček) | 2,00 / 6,41 m | 2,56 / 8,20 m | 3,03 / 9,70 m |
  | `.tabule-alert b` 40,32 px (karta) | 3,01 / 9,62 m | 3,85 / 12,31 m | 4,55 / 14,54 m |

  (pohodlně / rozlišitelně.) Pás tříd se navíc vodorovně posouvá
  (`karusel-pas`, `poradi-tridy.tsx:70`), takže se ten text nejen zmenšuje
  k hranici, ale i uhýbá.
- **Proč to vadí.** Od stolu v hospodě (4–6 m) je **jméno lodi v pásu tříd pod
  hranicí rozlišitelnosti na 43" a 55"** a nikde ne v pohodlné zóně. Pořadí po
  třídách je přitom to, podle čeho se boduje — takže nejvíc místa na obrazovce
  zabírá informace, kterou si nikdo nepřečte. Pohodlně čitelná je jen karta,
  která visí 4,5 s.
- **Návrh.** Zavést podlahu **1,0 × --tv (19,2 px) pro všechno, co nese slovo**;
  pod ni jen tvary bez textu. Nejblíž jsou `.pas-stari` 0,7 (:5407),
  `.poradi-cislo` 0,75 (:5405), `.poradi-radek` 0,85 (:5389) a `.bok-lod` 0,9
  (:5406). Tři údaje na lodi se do pásu při 19,2 px nevejdou — škrtnout stáří
  polohy a nechat číslo a jméno.

### D4. Tři barvy nesou dvaadvacet významů

- **Nález.** Spočítáno z užití v `.tabule`. `--stav-vypsany` (#58c98c): rozjížďka
  jede (:3721), start (:3890), trať schválena (:3895), rozjížďka dokončena /
  výsledky venku / závod dojet (:3866, :3892), **souboj na vodě** (:3889), stáří
  polohy v pásu (:5407), stav telefonu (:5772), poloha čerstvá (:4965), loď
  postoupila (:5060) — **devět**. `--stav-zruseny` (#e2726a): zrušeno (:3723,
  :3896), čeká se (:3867), výstraha z vývěsky (:3872), data zastaralá (:3968),
  poloha nedostupná (:4967), loď klesla (:5061), baterie došla (:5776), **značka
  dema** (:5863) — **osm**. `--voda` (#6bb3cc): dojezd (:3864, :3888), nová loď
  (:3897), rozjížďka dojeta (:3722), štítek „v cíli" (:5410), záložní barva lodi
  (:5446) — **pět**.
- **Proč to vadí.** Barva pak neříká nic. Dvě konkrétní kolize bolí nejvíc:
  **souboj** — nejživější věc na vodě — nosí tutéž zeleň jako „dokončeno", a
  **značka dema** (rámec 7) tutéž červeň jako bouřková výstraha. U těch dvou se
  význam neliší v odstínu ani ve tvaru, jen v textu, který je podle D3 na
  hranici čitelnosti.
- **Návrh.** Jeden token = jedna věta: zelená „jede / probíhá", modrá
  „dokončeno / v cíli", červená „stop / zrušeno / výstraha". Souboj přepnout na
  `--pozor` `#e8a33d` (8,34 : 1 na `#14171a`); značku dema a zastaralost dat
  odbarvit na `--tlumeny` a odlišit **rastrem** (šikmý šraf, `--srafa` už
  existuje), ne barvou — ta je rezervovaná pro to, co se děje na vodě.

### D5. Čtyři zelené pro „jede", a dvě z nich přitečou se semaforem

- **Nález.** `--stav-vypsany` `#58c98c` (8,69 : 1), semafor `#3ba55d` (5,76 : 1,
  :4045), vlajka `#2f9e5e` (`vlajka.tsx:44`), loď v paletě `#3cb44b` (6,70 : 1).
  Semafor má celou vlastní paletu natvrdo — `#e8a33d`, `#3ba55d`, `#6fa8dc`,
  zhasnuté `#2b2b2b` na `#111` (:4044–4047) — a žádná z nich není token, i když
  `#e8a33d` je hodnotou shodná s `--pozor`.
- **Proč to vadí.** Semafor a vlajka jsou odpojené (R1) a čekají na zapojení.
  Zapojí se s pátou a šestou zelenou a s panelem, který ve světlém režimu zmizí
  (D1). Nález R1 tím **nevyvracím, potvrzuju** — ten kód není připravený.
- **Návrh.** Před zapojením přepsat semafor na tokeny (`--pozor`,
  `--stav-vypsany`, `--voda`, `--linka`) a jeho pozadí na tabulové. Vlajce
  předpisové barvy ICS nechat — tam barva na výběr není (patří 5-jachting).

### D6. Semafor a tečky karuselu jsou na ultrawide elipsy

- **Nález.** `.tabule .semafor .svetla i` má `width: 2.1vw; height: calc(2.1 *
  var(--tv)); border-radius: 50%` (:4031); `.tabule .karusel .tecky i` totéž
  s 0,5 (:4002). Na 3440 × 820 je `--tv` = 14,6 px a 1vw = 34,4 px → světlo
  **72 × 31 px**, poměr 2,4 : 1. Dál v `vw` zůstaly `7vw` ve mřížce pásů
  (:5384), `22vw` u mapky (:4180, :4200) a odsazení na :4106, :4118, :5499,
  :5521.
- **Proč to vadí.** Je to přesně ten případ, pro který `--tv` vznikl — doložený
  u tokenu měřením z 24. 10. 2026. Kruh, který je elipsa, působí jako chyba
  vykreslení, ne jako design.
- **Návrh.** Obě šířky na `calc(… * var(--tv))`; `7vw` na `calc(7 * var(--tv))`.

### D7. Žádný title-safe okraj

- **Nález.** `.tabule { padding: calc(1.5 * var(--tv)) calc(2 * var(--tv)) }`
  (:3658) = 28,8 / 38,4 px, tedy **2,7 % výšky a 2,0 % šířky**. Broadcast
  title-safe je 5 %, action-safe 3,5 %.
- **Proč to vadí.** Televize bez vypnutého overscanu („Just Scan", „Screen
  Fit") ořezává 2–5 % obrazu. Při 2,0 % padne ořez přesně do krajních znaků —
  nejdřív na pravé straně žebříčku, kde stojí body a čas.
- **Návrh.** Vodorovný padding na `5 × --tv` (96 px = 5,0 %), svislý na
  `3 × --tv`. Cena: `--sloupec-poradi` se zúží nebo mapa přijde o ~115 px.

### D8. Linky, které nesou význam, mají 1 px

- **Nález.** 35 × `1px solid` v `.tabule`. U dvou prvků je ten rámeček **celý
  štítek**: `.pas-stitek` „v cíli" (:5410) a `.tabule-demo-znacka` (:5863).
  1 px na 55" = 0,63 mm → na 5 m 0,43′, pod rozlišovací hranicí.
- **Proč to vadí.** Rámec 7 žádá, aby bylo demo vidět po celou dobu. Z pěti
  metrů z něj zbude jen slovo o 13,44 px (D3) — tedy nic.
- **Návrh.** Token `--linka-tv: max(2px, calc(0.1 * var(--tv)))` podle vzoru
  karty (:3850) a použít ho všude, kde linka nese význam.

### D9. Písmo je `system-ui`, tedy jiné na každém boxu

- **Nález.** `body { font: 16px/1.6 system-ui, … }` (:280) a `.tabule` to
  nepřebíjí; vlastní písmo má jen nadpis (`"Nadpis tabule"`, podmnožina Inter
  Black, 7 kB, :3786). Na Android TV se `system-ui` rozloží na Roboto, na
  Windows na Segoe UI, na Apple TV na SF Pro — jiné šířky při téže velikosti.
  Jména lodí mají `text-overflow: ellipsis; white-space: nowrap` (:5969).
- **Proč to vadí.** Tatáž tabule na jednom boxu jméno lodi doveze a na druhém
  ho tiše zkrátí — a nic o tom neřekne. Mechanismus na to v repozitáři už je.
- **Návrh.** Dovézt Inter 400/700 jako podmnožinu a dát `font-family` celé
  `.tabule`, ne jen nadpisu.

### D10. Dojem: je to webová stránka na velké obrazovce, ne televizní grafika

**Označuju jako dojem**, podložený jen zvyklostí oboru. `.tabule li` má
`line-height: 1.5` (:4235) — webová míra; `.tabule-vysledky-trida li` má 1,25
(:5966), takže si to tabule ani sama nedrží. Nadpisy tříd jsou `--tlumeny`,
uppercase, letter-spacing 0,08em (:5958) — slovník webové tabulky. Kontrast nese
text, ne plocha; jediný prvek, který mluví televizně, je karta. **Návrh:**
žebříčku `line-height: 1,2` a pozici podložit plným pruhem barvy třídy
(`--trida-*` už existují); ušetřená výška padne na větší jména (D3).

## Co bych potřeboval vědět

- **Filip:** jaká telka a jak daleko od stolu? D3 stojí na 55" a 4–6 m; na 65"
  ze tří metrů je podlaha jinde. A z čeho se to pouští — Chromecast/Android TV,
  nebo mini-PC? Rozhoduje to D1 i D9.
- **1-rezie:** clona `rgb(0 0 0 / 0.55)` (:3807) sráží kontrast mapy i žebříčku
  na 4,5 s pokaždé. Kolik karet za rozjížďku připustíš? Nad šest je obrazovka
  ztmavená víc než půl minuty a „kdo vede" (D2) se celou tu dobu čte přes clonu.
- **7-efekty:** když zvednu podlahu textu na 19,2 px, pás tříd povyroste
  (`max-height: 24vh`, :5373 je strop, ne rezerva). Vejdou se vaše vstupy ještě
  do zbytku plochy?
- **5-jachting:** smí se vlajka odchýlit od předpisových odstínů ICS, nebo je
  `#1757a8` / `#2f9e5e` pevné (D5)?
- **8-jazyk:** D4 odbarvuje „data zastarala" a značku dema. Unese to slovo samo,
  bez červené?

## Čeho se nedotýkám

- Kdy se co ukáže, jak dlouho visí, pořadí fronty, přepínání podob — **1-rezie**
  (R3, R4, R5). D2 i D8 mluví jen o tom, jak to má vypadat, ne kdy.
- Technika přechodů, délky animací, cena za překreslení — **7-efekty**.
- Texty nadpisků, jména podob, formulace štítků — **8-jazyk**.
- Co dav u bóje, souboj a startovní procedura doopravdy znamenají, a barvy
  vlajek podle předpisu — **5-jachting**.
- Jestli je R2 (souboj se nikdy neohlásí) chyba režie — **1-rezie**. Já říkám
  jen, jakou barvu by ta karta mít měla (D4).
