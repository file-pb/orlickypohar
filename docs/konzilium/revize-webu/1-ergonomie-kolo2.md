# Ergonomie ovládání — kolo 2

Měřeno 27. 11. 2026 na 375 × 812 (bod C na 1280 × 900), účet `filip`, mock.
Den regaty ani upravitelný zápis jsem neviděl; co je z kódu, je označené.

## Kde ustupuju

- **A — 5-jachtingu a 9-rizikům.** Kroky zpět patří do okna regaty, ne pod
  „Další úkony" na kartě. Cena je +1 klepnutí a posun u úkonu, který se dělá
  párkrát za sezónu; zisk je kalendář, kde se **nedá minout do ničeho
  veřejného**. V kole 1 jsem měřil 7 px mezi *Stáhnout z webu* a sousedním
  tlačítkem — rozbalovač na kartě tu vzdálenost zvětší, okno ji zruší.
  **Kde v okně:** sbalené `details` „Stav a zveřejnění regaty" v patě okna,
  pod obsahem každé agendy — na místě, kde má okno ročníku `.pata-okna`
  (`pruh-rocniku.tsx:148`). Nahoru ne: první pracovní řádek je už dnes na
  y = 649. V kalendáři zůstane krok vpřed (44 px) a *Upravit termín*.
- **D, počasí — 7-psychologovi v ose.** Lepit podle **času**, ne podle místa:
  v den regaty chci počasí i na pořadí, a mimo něj ho nepotřebuju lepit ani
  na úvodu. Jedno pravidlo: **pruh je pevný jen v den regaty ročníku.**
  Výhradu k výstraze držím níž.
- **J — 5-jachtingu.** Zápis z papíru má ukazovat listinu, ne ročník; čísla
  a tvar v rubrice *Nové*.

## Kde držím

- **B — řádek je karta a prezence je jediné tlačítko, 44 px přes šířku.**
  Souhlas v řádku **ano, slovem** — stojí šířku, ne výšku. Jeden řádek pro
  375 px (karta 333 px, na text 301):
  1. `CZE 434` · **SEA MOUSE III** … vpravo stav prezence slovem. Změřeno
     16 px / 700: 192 px, nejdelší jméno 225 px, štítek 63 px — vejde se.
  2. kormidelník · typ lodi.
  3. `startovné: zaplaceno · souhlas: chybí` — 14,4 px, nejvýš asi 265 px
     (odhad, 6,8 px na znak). S kormidelníkem na jednom řádku to nejde:
     s dlouhým jménem změřeno 313 px, zalomí se.
  4. **jen u nepotvrzené:** *Potvrdit prezenci*, 44 px přes celou šířku.
  Řádky 1–3 jsou `summary` Podrobností (cíl přes 60 px místo dnešních 20);
  uvnitř kód, zrušení prezence a změny stavu. Odstavec nad seznamem pryč
  (shoda s 3 a 7), zůstane počet. Výška odhadem 16 × ~90 px proti dnešním
  16 × 111 px, a bez tahu do strany. **Když se rozhodne proti:** tabulka
  zůstane 587 px v 333 a z tlačítka prezence bude dál vidět 67 ze 112 px —
  na tom se nedá postavit žádný obsah řádku, ať je v něm cokoliv.
- **D, výstraha sama pruh nelepí.** Proti 7-psychologovi: mock 27. 11. nese
  „Rizikové sněhové jevy, nízký stupeň" — podle „nebo s výstrahou" by pruh
  lepil v listopadu na nápovědě. Výstraha mimo den regaty stojí v bloku
  počasí na stránce. **Partneři:** na telefonu nepřipínat (8-pr); je-li
  slíbena trvalá viditelnost, připnout jen na úvodu. **Pevných zůstane:**
  67 px (8 %) běžný den, 124 px (15 %) v den regaty; s partnery na úvodu
  131 / 188 px. Dnes 231 px (28 %).
- **H — jedno pravidlo, nejvýš dvě klepnutí.** *Druhé klepnutí dostane
  úkon, který nejde vzít zpět jedním klepnutím na téže obrazovce, nebo který
  něco ubere veřejnosti, odejde do telefonů nebo přepočítá pohár.* Druhým
  klepnutím je rozbalovač s větou následku; kde úkon v rozbalovači už leží,
  třetí „Opravdu" se nepřidává.
  **Spadne pod něj:** Smazat přihlášku · Schovat ročník · Skrýt regatu
  z webu · Vrátit odjetou mezi vypsané · Zrušit regatu · Stáhnout rozjížďku
  z webu · Pustit ven (telefony) · Odebrat roli · Odebrat a Nahradit fotku
  papíru · Stáhnout verzi směrnice · *✕* v cíli (ztratí čas dojezdu).
  **Nespadne:** Potvrdit prezenci, Vystavit kód, dojezd, přesun pořadí,
  Zveřejnit, *Vrátit poslední*.
  **Co stojí rozbalovač:** jedno klepnutí do cíle 44 px, bez načtení stránky.
  U stolu by z 16 prezencí udělal 32 klepnutí — proto prezence pod pravidlo
  nesmí; její zrušení je v Podrobnostech a dvě klepnutí už má. U vody je
  jediný kandidát *✕* v cíli: schovat ho pod klepnutí na jméno (kolo 1, bod 4).
  **Když se rozhodne proti** (rozbalovač i u vratných): naučí klepat
  dvakrát bez čtení a druhé klepnutí přestane cokoliv chránit.

## Kde jsme se shodli

- **A:** karta regaty v kalendáři = stav + jeden odkaz „Otevřít regatu →"
  přes celý řádek, 44 px a víc; sedm odkazů pryč.
- **B:** jeden krok s vahou je prezence; kód, zrušení a změny stavu až po
  rozbalení; výstraha „16 z 16" z hlavičky pryč.
- **D:** hlavička návštěvníka jednořádková, 67 px, „Přihlásit" v nabídce.
  Stojí to návštěvníka jedno klepnutí navíc jednou za sezení — beru. Tři cíle
  po 44 px ale chtějí 132 px a dnes mají 123: přepínač vzhledu do nabídky.
- **E:** tabule se na šířce telefonu nenabízí.

## Nové, co vylezlo z cizích posudků

- **J — čísla.** Zápis má 37 řádků lodí po ~62 px (tabulka 2 435 px,
  dokument 3 313 px = 4,1 obrazovky). Se 16 loděmi listiny vychází asi
  2 010 px = 2,5 obrazovky. **Nový úkon není potřeba:** data příznak
  `naRegate` už nesou a cíl podle něj dělí lodě na „Na vodě" a sbalené
  „Další lodě ročníku (N)" (`cil.tsx:105`, `:900`). Formulář z papíru má
  udělat totéž — 16 řádků a pod nimi `details` s 21 zbylými, v témže
  formuláři, bez javascriptu. Cesta k lodi mimo listinu: jedno klepnutí
  a hledání mezi 21 místo mezi 37. Dvě obrazovky jedné práce se dnes liší.
- **C (přizván) — monitor pás 320 px unese.** 1280 × 900: sloupec Kalendář
  začíná na y = 235 a šestá karta končí na y = 675. Návštěvník má hlavičku
  o 31 px vyšší (706) a ohyb na 767 (900 − 57 − 76). S +170 px končí
  kalendář na 876: **první regata zůstane vidět (y ≈ 460), pod ohyb spadnou
  poslední dvě karty ze šesti.** Žádné klepnutí navíc, jeden pohyb kolečkem.
  Podmínka: pás nesmí posunout nejbližší regatu — ta musí být první kartou.
- **G (přizván) — údaj u vody nejmíň 16 px.** Výpočet, ne měření: telefon
  má asi 0,165 mm na CSS px; verzálka písma 12,8 px je vysoká 1,5 mm, ze
  45 cm 11 úhlových minut. Mez pro čtení znaku je 16 minut (MIL-STD-1472,
  cituji z paměti) a za pohybu víc; 16 px dá 14 minut, 19 px 17. Stupnice
  se liší jen pod 14,4 px — tam smí být metadata, ne údaj. Spor 12 vs
  12,8 px je pro vodu bez významu; rozhoduje, co na kterém stupni stojí.
- **Cíl: nejmenší písmo dlaždice nese to, podle čeho se loď pozná.**
  5-jachting (nález 4): na vodě se loď pozná podle čísla plachty. Na dlaždici
  je číslo `small` 0,8 rem = 12,8 px v `--tlumeny` pod jménem
  (`globals.css:1925`). Návrh: číslo plachty 1 rem / 600 před jménem.
  (Z kódu, neviděno.)
- **Odpověď 3-ux** (nabídka vynechává stránku, na které stojíš): ano, vadí —
  na `/moje-lode` má nabídka dál 9 položek, ale bez „Moje lodě", takže se
  jedna položka mění a poloha se nedá naučit; položka má zůstat na místě
  s `aria-current`.
- **Odpověď 9-rizikům** a **10-grafikovi:** v bodech H a C výš.
- **Odpověď 2-designu:** váhu má *Potvrdit prezenci*, jen u nepotvrzené lodi.

## Podmínka

1. **Řádek přihlášky a změny v cíli se nestaví naslepo.** Nikdo z osmi
   neviděl den regaty: nepotvrzenou loď, otevřenou rozjížďku, cíl v běhu.
   Mock potřebuje jednu regatu v tom stavu a obojí se změří na 375 px dřív,
   než se sloučí. Moje nálezy o cíli jsou do té doby z kódu.
2. **Pravidlo 44 px dostane kontrolu, ne jen řádek CSS.** Appka ji má
   a běží v CI (`tools/kontrola-dotyku.py`, `build-deploy.yml:145`); web
   žádnou — proto oddíl B má 13 řádků a bez kontroly dostane čtrnáctý.
