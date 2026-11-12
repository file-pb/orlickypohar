# Vizuální design — kolo 2

Šířky změřené v Chrome headless se stejným CSS, jaké mají makety (1216 px obsahu na okně 1280, 361 px na telefonu 390); barvy spočítané z tokenů.

## Kde ustupuju

**B, částečně — 1-ergonomii.** Ptáš se správně a moje „nevybrané na `--linka`" šlo dál,
než bylo potřeba. Tvůj případ ale není barva proti šedi, je to **poloha proti barvě**:
pruh je dvourozměrná mřížka ze stálého zdroje (`polozkyRocniku`), takže *Rozjížďky* jsou
pokaždé na čtvrtém místě a míří se tam palcem, ne okem. Barva pomáhá vybírat z **řady
rovnocenných** — rozcestník regaty, kde se z pěti úkonů jeden volí; v pruhu tabů je jeden
vybraný a to nesou tři kanály. Nabízím proto místo šedi **45 % barvy v lince**
(`color-mix(in srgb, var(--ukon) 45%, var(--linka))`), vybraná drží plnou:

| | L\* rozptyl | C\* rozptyl | min ΔE mezi dlaždicemi | ΔE hrany od `--linka` |
|---|---|---|---|---|
| dnes, plná barva | 15,2 | 28,5 | 13,5 | — |
| 45 % barvy | **6,4** | **14,5** | **5,3** | 18,8–24,2 |
| šedá `--linka` (mé kolo 1) | 0 | 0 | 0 | 0 |

Crescendo na zlaté a šedá díra na *Otázkách* zmizí (C\* *Oprávnění* 37,1 → 17,3), barva
zůstane k zamíření a vybraná je nepřehlédnutelná (ΔE 28,8–29,8 proti své nevybrané).
**Cena, kterou přiznávám:** hrana dá proti papíru 1,95–2,37 : 1, tedy pod 3 : 1 z WCAG
1.4.11 — vědomě, protože tím přestane být nositelem informace a nositelem je vybraná
dlaždice a jméno. Dnešní plné hrany jsou nad 3 : 1, ale tvrdí „která agenda", a to jim
deuteranopie bere (Regaty × Novinky ΔE′ 1,9).

**D — 4-jazyku, úplně.** Měl jsi pravdu a můj argument o hustotě na tebe neplatí. Plná
jména, osm tabů: **876,5 px v 1216 px, jeden řádek**, drží do okna 941 px. Dnešní mřížka
se **zkrácenými** jmény se láme na 1037 px — plná jména s `flex-wrap` jsou o 96 px
odolnější než zkrácená mřížka dneska (*Lodě a kapitáni* 138 px, *Otázky k aplikaci* 152).

**E — 4-jazyku.** Chválil jsem sdílenou barvu podle nápisu v maketě, ne podle obsahu.
Přejmenování na *Rozjížďky* ji ale **nelámá**: projekt má pro tenhle případ zapsaný idiom
*„Veřejné sekce mají jiné klíče než úkony ve správě, ale jde o tytéž věci… Barvu proto
sdílejí"* (`globals.css:2174`, `trat` ↔ `boje`). **Jméno se mění, `--ukon-vysledky`
zůstává na obou stranách** — agenda smí mít dvě jména. Pravidlo porušují dvě **různé**
agendy na jednom hexu, viz podmínka 2.

## Kde držím

**F — proti *Víc*.** 44 px je shoda, ale schovávat nic netřeba — číslo, kterým jsi argumentoval, padá s D:

| pruh na telefonu (cíl 44 px) | řádků | výška |
|---|---|---|
| 8 zkrácených jmen | 2 | 93,6 px |
| 8 plných jmen | 3 | 143,2 px |
| **7 plných jmen (bez *Otázek*)** | **2** | **93,6 px** |
| 8 plných + *Pořadatelé*, bez *Otázek* | 3 | 143,2 px |

*Otázky k aplikaci* chcete z pruhu vyndat oba, takže **sedm plných jmen vyjde na stejné
dvě řádky jako osm zkrácených** — 145 px, které jsem v kole 1 přijal jako cenu, platit
nemusíme. Proti *Víc* držím dvojí: vrací akordeon zrušený 29. 10.
(`prepinac-sekci.tsx:11`) a cokoliv za ním stojí klepnutí, tedy proti postřehu 3.
**Rozpočet je sedm dlaždic s plnými jmény**; osmá (*Pořadatelé*) platí 50 px třetího řádku.

**G — lano.** Držím, nikdo nenamítl: šrafa je obsazená publikací (`globals.css:757`), lano
má být stojící pramen (ř. 2272). Proti mně publikace ztratí jediný kanál, který má —
barvu mít nesmí, tu drží stav.

**J — nadpis.** Držím celé; 4-jazyk potvrzuje pomlčku, 1-ergonomii zalomení nevadí. Proti
mně zůstane nejtěžší typografie na jméně ročníku, které je v drobečku o řádek výš.

## Kde jsme se shodli

- **Dotykový cíl 44 px** (1-ergonomie 3 + já 8b). Pozor na místo opravy: 1-ergonomie to
  změřil na **stávající** komponentě (`globals.css:1998`, `padding: 0.3rem` → 32 px), já
  na maketě (31,1 px). Patří to do `.dlazdice-sekci .karta` pod `@media (pointer: coarse)`,
  ne do maket — jinak má správa regaty, která „už stojí", cíl o 12 px menší než ročník.
- **Plná jména tabů**, kromě *Kalendáře* a *Novinek*, kde patro nese drobeček.
- **Pruh se nemá roztahovat do šířky okna:** `1fr` ven, `display: flex; flex-wrap: wrap`.
  Je to přesnější než můj `max-content` z kola 1 — `auto-fit` počítá počet sloupců
  z minima 7,25 rem, takže zlom by zůstal na 1037 px.

## Nové, co vylezlo z cizích posudků

**H — rozvržení unese, přestavovat se nemusí, ale za dvou podmínek.** Změřeno:

| tabulka pořadí | sloupců | šířka |
|---|---|---|
| 2 zastávky + znak | 7 | 579,8 px |
| 8 zastávek + znak, hlavy jménem | 13 | 1125,4 px |
| 8 zastávek + znak **+ kapitán vlastní sloupec** | 14 | **1233,2 px — přeteče** |
| 8 zastávek + znak, hlavy datem (`15.5.`) | 13 | 808,4 px |

Hlavička listiny („Orlický pohár 2027 · kategorie nad 7 m · … · rozhodčí Miloš Zvonař") je
**731 px na jeden řádek** a vejde se; samostatný sloupec se znakem taky. Padá to na dvou
věcech: **kapitán musí zůstat v podřádku** pod jménem lodi (s vlastním sloupcem 1233 px)
a **hlavy zastávek musí být datum**, ne jméno — se jmény zbude na konci sezóny 91 px
rezervy (7,5 %), a tabulka, které sloupce přirůstají, tak tenkou mít nesmí. A protože
listina je doklad, hlavička patří do `<caption>`, ne do `<p>` nad tabulkou — jinak se při
tisku a při vodorovném rolování od tabulky odpojí.

**I — řádek regaty unese tři bloky, ne pět.** Sečteno z měřených kusů: *den* 42,9 + *jméno
s pořadatelem* 143,4 + přihlášky po kategoriích 320,6 + průběh s adresátem 258,4 + řada
dokumentů 259,8 = 1025,1 px, s mezerami **1089 px, tedy 90 % šířky**, a na telefonu čtyři
řádky. Vejde se, ale řádek se čte tak, že se v něm najde jedna nejtěžší věc — při pěti
stejně vážných skupinách žádná není. Doporučuju **datum + jméno** (kotva), **jednu větu
průběhu s adresátem** (shodnete se na ní oba) a **štítky stavu a dokumentů**: 752,5 px,
62 % šířky, tři řádky na telefonu. Počty po kategoriích patří do regaty — 320,6 px za
číslo potřebné ráno v den závodu vytlačí adresáta.

**3-ux nález 6 — dlaždice *Správa ročníku* na veřejném pruhu nesmí být teplá.** Není to
upomínka, takže si ten význam vzít nesmí, a byla by to jediná teplá barva na stránce, kde
nic teplého není. Oddělit ji má poloha a tvar (poslední v pruhu, se šipkou), barva
`--ukon-uvod`.

## Podmínka

1. **Lano nesmí být šrafa** (G). Je to jediný kanál publikace a druhý nemá.
2. **Žádná nová barva bez tmavé odrudy a bez vlastního hexu.** Tři z osmi hran jsou dnes
   na tmavém papíru pod 3 : 1 a `tools/kontrola-tokenu.py` je nezměří (nula nových párů),
   takže to nikdo nenajde. A vybraná dlaždice nesmí mít hex jiné agendy: *Oprávnění* =
   *Směrnice* a *Co web stojí* = *Trať* na ΔE 0,0. Obojí řeší šeď `--ukon-uvod`.

**Podmíněně k Filipově otevřené otázce (spí):** je-li *Co teď* jediná teplá barva, pak
`--ukon-vypsani` (81°) a `--ukon-smernice` (89°) teplé být přestanou a posunou se do
neutrálu — jinak jsou teplé tři a *Co teď* nerozlišuje nic. **Doporučuju opak:**
`--ukon-coted` zrušit a upomínku nést tečkou, kterou maketa už kreslí (`.teckovana`):
barevná kružnice je plná (16 barev, největší volná výseč 50,3°), teplý odstín nejvíc.
