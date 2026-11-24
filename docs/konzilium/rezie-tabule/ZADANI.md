# Konzilium nad režií tabule (22. 11. 2026)

Osm odborníků, tři kola, na konci závěr. Každý mluví za svůj obor
a **nikdo nepřepisuje kód** — výstupem je posudek, ne commit.

Sestavu i počet kol odsouhlasil Filip před prvním kolem. Osm oborů je nad
stropem skillu (pět), proto jsou **limity posudků zkrácené**: 120 / 100 / 60
řádků místo 150 / 120 / 60. Kolo 3 je poslední.

## Co se posuzuje

**Otázka: má tabule působit jako profesionální televizní sportovní přenos —
a co jí k tomu chybí?** Ne jako webová stránka s výsledky, ale jako obraz,
který v hospodě běží na telce a člověk u piva z něj pozná, co se na vodě
děje. Posuzuje se **režie**: co je na obrazovce, kdy, jak dlouho, co ustoupí
čemu a jak se mezi tím přechází.

**Čím to začalo.** Filip (22. 11. 2026): *„V Orlickém poháru máme tabuli na
telku. Napadlo mne využít AI možnosti a vytvořit televizní sportovní přenos,
který bude co nejvěrněji vypadat jako opravdový sportovní přenos v televizi.
Ideálně i s hlavní komentátorkou a jejím hostem, režií a detaily."*

Z toho se během rozpravy odbouralo to podstatné. Nejdřív se ukázalo, že tabule
se nemá přestavovat: *„tabuli bych jen využil, ta je dobrá, tohle by byl
bratříček vedle."* Pak padl hlas, a padl dobrým argumentem: *„ten komentář by
zněl jako EA hra a o to nikdo nestojí."* A zůstalo tohle: *„asi nakonec tabule
postačí, akorát ji musíme hooodně vyladit a revidovat a doplnit o režii"*,
a k sestavě tohoto konzilia: *„Je to o tom udělat z tabule profesionální
prezentaci a la televizní přenos."*

**Takže návrh, který posuzujete, je:** vzít dnešní tabuli a dodělat jí režii.
Nic jiného. Kdo přijde s komentátorkou, hlasem nebo zvukovou stopou, jde proti
zadání — viz rámec níž.

Dnešní tabule **má čtyři podoby** (v kódu „režimy"): `listina` (startovní
listina před závodem), `mapa` (lodě na vodě, pořadí vpravo), `mezi` (mezi
rozjížďkami — pořadí, občas prostřih na zrychlený záznam) a `po` (po dojetí
regaty). Volí se jedním výrazem v `obrazovka.tsx:300`.

Celý rozbor tabule očima diváka i důvody za jejími rozhodnutími jsou
v [`docs/TABULE-DIVAK.md`](../../TABULE-DIVAK.md). **Přečti ho první**, je to
nejhutnější zdroj — 653 řádků, čtrnáct nálezů, u každého jak se měřilo.

## Rámec, ve kterém to stojí

Pravidla, na kterých návrh stojí. V kolech se na ně odkazuje číslem.

1. **Žádný hlas, žádný zvuk.** Komentátorka, spolukomentátor, TTS, hlášky,
   atmosféra ze hřiště — všechno zamítnuto 22. 11. 2026 s důvodem, že by to
   znělo jako videohra. Neotvírat ani jako „jen na dojezdy". Televizní dojem
   se tu staví **obrazem a rytmem**.
2. **Tabuli nikdo neobsluhuje.** Visí v hospodě a jediná klikatelná věc na ní
   je logo (cesta zpátky na web). Žádné řešení nesmí předpokládat, že někdo
   něco zapne, přepne nebo zavře. Co se otevře, musí samo zhasnout — otevřené
   menu v hospodě zůstane do rána.
3. **Je to televize, ne telefon.** Rozměry se počítají z tokenu
   `--tv: min(1vw, 1.78vh)` (`globals.css:3611`, 193 užití), tedy relativně
   k šířce obrazovky na 16:9; na 1920 × 1080 je `--tv` = 19,2 px. **Měří se na
   televizi a ze vzdálenosti místnosti**, ne na 390 pt. Tím se pravidlo skillu
   o šířce telefonu pro tenhle běh ruší — nález měřený na telefonu je nález
   o jiné obrazovce.
4. **Co není ve `Snimek`, tabule neví.** Zdroj je jedna projekce
   (`web/lib/tabule.ts`): zprávy z vývěsky, stav regaty, rozjížďky s pořadím
   a časy, lodě s kormidelníky a stavem telefonů, pořadí po třídách, trať,
   značky, okno závodního dne. Navrhuješ-li něco, co v ní není, **napiš to** —
   je to pak návrh na nová data, ne na režii.
5. **Nepodepsaná čísla nesmějí vypadat jako hotová.** Výsledky jdou ven buď
   průběžně (regata se zapnutým *procesním dějem*), nebo až publikací. U pořadí
   proto stojí, jak daleko je zápis (`čerstvé z vody / u rozhodčího /
   potvrzeno / přepisuje se`).
6. **Tabule drží poslední dobrý snímek.** Když obnovení selže, zůstane, co
   bylo, a jen se napíše, jak je to staré. Prázdná obrazovka do rána je
   nejhorší možný stav.
7. **Simulovaná data se nikdy nevydávají za skutečná.** Demo režim existuje
   (kebab vpravo dole) a po celou dobu přes obrazovku běží pruh, že jsou data
   simulovaná.

## Pět nálezů moderátora — vstup do rozpravy, ne hotová pravda

Moderátor prošel tabuli optikou režie před svoláním konzilia. Tyhle nálezy
**nejsou zadání ani rozhodnutí** — jsou to body, na kterých se dá začít, a kdo
je vyvrátí, udělá dobře.

**R1. Start nemá vlastní obraz, a je ze tří čtvrtin napsaný.**
Mezi `listina` a `mapa` není nic. Start je dnes jedna karta „N. rozjížďka
startuje", která visí 4,5 s, a pak se nezmění nic. V televizi je start minuta
vlastního obrazu: odpočet, vlajky, procedura. Přitom
`tabule/semafor.tsx` (298 řádků: světla `ceka/jede/dojeto/zruseno`, odpočet do
startu, stopky od startu, počet lodí, na které se čeká, a ochrana proti
neuzavřené rozjížďce) a `tabule/vlajka.tsx` (92 řádků) **leží v repozitáři
a nikdo je neimportuje**. Odpojily se omylem v #486 při přerovnání rozvržení.
Filip si vlajku 27. 10. 2026 objednal zpátky, aniž věděl, že ji má: *„Vlajku
(vlající 3d) můžeme ukázat třeba na telce vlevo na mapě dole nad běžícími
pořadími spolu s odpočty a informacemi startovní procedury."*

**R2. Hlásí se dvěma korytama, která o sobě nevědí.**
Obrazovka má frontu karet doprostřed (`ALERT_MS` 4 500). Mapa si vedle toho
dělá vlastní „lepíky" u řádku v pořadí (`mapa-trackeru.tsx:1159`, `LEPIK_MS`
6 000). Mapa dostává `onUdalost`, hlídá si ho — a **nikdy ho nezavolá**.
Důsledek: souboj v čele se divákovi nikdy neohlásí kartou. Druh karty `souboj`
i jeho nadpisek *„Na vodě"* jsou nedosažitelný kód, a to u jevu, který podle
vlastního měření projektu zabírá 43 % času záběru mapy.

**R3. Fronta karet nemá přednost ani strop.**
Je to `fronta[0]`, čisté FIFO. Co jde ven první, rozhoduje pořadí příkazů
v `udalosti()` — takže výstraha o bouřce čeká za dojezdy ze stejného snímku.
Strop není: dvanáct dojezdů je skoro minuta karet, během které se nedá ukázat
nic jiného.

**R4. Přepnutí podoby nemá pojistku.**
`rezim` visí na `zive.length > 0`, a `useStopy` vrátí prázdno hned, jak zhasne
příznak `vysila` (`web/lib/stopy.ts:56`) — žádná minimální doba, žádná
hystereze. **Tentýž problém o úroveň níž je vyřešený**: `DAV_DRZI_M = 110`
v `rezie-tabule.ts` existuje právě proto, že *„bez téhle hystereze by loď
kmitající kolem hranice přepínala záběr sem a tam."*

**R5. Patnáct časových konstant na čtyřech místech.**

| Kde | Konstanty |
|---|---|
| `tabule/obrazovka.tsx` | `OBNOVA_MS` 5 s, `ALERT_MS` 4,5 s, `SEZNAM_MS` 75 s, `PREHRAVKA_MS` 30 s, `KEBAB_ZHASNE_MS` 20 s |
| `tabule/karusel.tsx` | `PANEL_MS` 9 s |
| `app/mapa-trackeru.tsx` | `TOCENI_MS` 18 s, `ZABER_CELEK_MS` 18 s, `ZABER_CELO_MS` 12 s, `LEPIK_MS` 6 s, `SIPKA_MS` 2 s, `TAKT_MS` 1,9 s, `VYMENA_MS` 1,1 s |
| `lib/rezie-tabule.ts` | `FOCUS_SOUBOJE_S` 40, `KOLOTOC_S` 60 |

Žádné dvě spolu nemluví. Panel se mění po devíti sekundách, záběr mapy po
dvanácti až osmnácti, karta visí 4,5 — takže karta vyjede do přepínání panelu
a lepík ukazuje na řádek, který se vzápětí odroluje. Režie je z velké části
právě rozhodování, **co ustoupí čemu**, a to se nedá rozhodnout, dokud je to
na čtyřech místech.

## Kontext, který je potřeba znát

**Přečti podle svého oboru, ne všechno.** U každého je proč.

- [`docs/TABULE-DIVAK.md`](../../TABULE-DIVAK.md) — audit tabule očima diváka.
  Čtrnáct nálezů, u každého jak se měřilo a co se neprokázalo. **Nálezy 11, 12
  a 14 jsou dosud otevřené**; 12 je přímo o odpojeném semaforu a vlajce.
- `web/lib/rezie-tabule.ts` (235 řádků) — **jediná dnešní režie**, a vzor, jak
  má režie v tomhle repozitáři vypadat: čistá funkce, plán dopředu, konstanty
  s doloženým měřením u každé. Rozhoduje, na co se kouká mapa: `souboj` (43 %
  času), `boje` (28 %), `kolotoc` (29 %).
- `web/testy/rezie.test.ts` (121 řádků) — jedenáct kontrol nad tou režií. Takhle
  se tady režijní rozhodnutí měří, protože *„okem se to z běžící tabule
  nespočítá: záběr se mění po minutách a rozjížďka trvá hodinu."*
- `web/lib/tabule-udalosti.ts` (235 řádků) — dvanáct druhů událostí s hotovým
  titulkem a detailem, odvozených z porovnání dvou snímků. Tohle je materiál,
  ze kterého režie staví.
- `web/lib/tabule.ts` (267 řádků) — typ `Snimek`: co přesně tabule o regatě ví.
- `web/app/serie/[slug]/zavody/[zavod]/tabule/obrazovka.tsx` (1 100 řádků) —
  volba podoby (`:300`), fronta karet, střídání seznamu se záznamem, demo.
- `web/app/serie/[slug]/zavody/[zavod]/tabule/` — `semafor.tsx` a `vlajka.tsx`
  (**odpojené**, viz R1), `teaser.tsx` (startovní listina), `vysledky.tsx`,
  `karusel.tsx`, `poradi-tridy.tsx` (běžící pásy), `rozjizdky.tsx` (panýlky).
- `web/app/mapa-trackeru.tsx` (2 009 řádků) — mapa, záběry, lepíky. Velký
  soubor; čti cíleně podle konstant z R5.
- `web/app/globals.css` — oddíl `.tabule` od řádku 3638, token `--tv` na 3611.
- [`docs/konzilium/`](..) — **starší běh konzilia nad regatou** (12. 11. 2026,
  pět oborů: ergonomie, design, UX, jazyk, jachting). Co tam padlo, se
  neotevírá znovu; jazyk a design si odtud vezmou, co už bylo rozhodnuto.

**Chceš měřit na běžící tabuli?** Jde to: `tools/fake-api.py` jako mock nad
`data/2026-nanecisto.json`, web proti němu, a v kebabu vpravo dole se dají
vyvolat všechny čtyři podoby na simulovaných datech. Vezmi si **port podle
svého čísla** (mock `811<N>`, web `311<N>`), ať si session nelezou do cesty,
a do posudku napiš, na čem a proti čemu jsi měřil. Pro většinu nálezů ale
stačí kód a `TABULE-DIVAK.md`.

## Kdo sedí u stolu

| Session | Obor |
|---|---|
| `1-rezie` | **režisér** — rytmus a střih: co je na obrazovce, co ustoupí čemu, jak dlouho co visí, jak se přechází. Podkládá časem, pořadím, tím, co divák uvidí dvakrát a co ani raz. Nedotýká se estetiky (6) ani věcnosti jachtingu (5) |
| `2-dramatik` | **dramatik** — příběh a napětí: závod jako oblouk, ne proud událostí. Co je expozice, co vrchol, co dojezd; kde se napětí staví a kde se prozradí předem. Podkládá stavbou dne a tím, co divák v které minutě ví. Nedotýká se provedení (1, 6, 7) |
| `3-fanousek` | **sportovní fanoušek** — divák v hospodě, který není jachtař. Hájí jedinou věc: aby z obrazovky do pěti sekund poznal, kdo vyhrává a co se právě stalo, bez legendy a bez znalosti pravidel. Podkládá tím, co na obrazovce najde a co ne. Nedotýká se techniky |
| `4-insider` | **sportovní novinář a znalec prostředí** — ten, kdo seriál a jeho zvyky zná (Filip: *„takový ten Insider, jako jsou specialisté např Záruba v hokeji"*). Hájí, co je zpráva a co šum, a co se u téhle komunity sluší ukázat a co ne. Podkládá zvykem prostředí a tím, co se o závodě doopravdy říká. Nedotýká se pravidel plachtění (5) |
| `5-jachting` | **jachtař a ČSJ** — hájí, aby tabule nelhala o jachtingu: co na vodě doopravdy znamená dav u bóje, souboj, přestavba trati, startovní procedura, kódy pravidel. Podkládá předpisem, zvykem praxe, slovníkem člověka na vodě. V minulém běhu jediný, kdo poznal věcnou chybu v číslech |
| `6-design` | **vizuální design** — hierarchie a čitelnost přes místnost: co je na obrazovce nejtěžší, co znamená barva a znamená-li to pořád totéž, jak to obstojí v šeru hospody. Podkládá změřeným kontrastem, WCAG, tokenem a jeho hexem, šířkou v `--tv`. Nedotýká se rytmu (1) ani textů (8) |
| `7-efekty` | **broadcast grafika a efekty** — přechody, prostřihy, obraz v obraze, vstupy při soubojích, animace příchodu a odchodu prvků. Hájí, aby efekt nesl informaci a nebyl ozdoba, a aby se dal udělat v CSS na televizi bez trhání. Podkládá konkrétní technikou, délkou animace, cenou za překreslení. Nedotýká se toho, *kdy* se co ukáže (1) |
| `8-jazyk` | **názvosloví a čeština** — jména podob, nadpisky karet, texty na obrazovce: aby řekly, co se stalo, šly skloňovat a měly jeden tón. Podkládá dřívějším rozhodnutím o jménu, místem v kódu, pádem, který se rozbije. Nedotýká se rozvržení (6) ani věcnosti (5) |

## Jak se píše posudek

Do `docs/konzilium/rezie-tabule/<tvoje-session>-kolo1.md` — tedy například
`1-rezie-kolo1.md`. **Nesahej na cizí soubory a nic necommituj.**

Posudek drží tuhle stavbu a **nic navíc**:

```markdown
# <obor> — kolo 1

## Co je dobře
Nejvýš pět bodů. U každého proč, ne jen že.

## Co je špatně
Seřazené podle toho, co bolí nejvíc. U každého bodu:
- **Nález** — co konkrétně, kde (soubor a řádek)
- **Proč to vadí** — následek, ne dojem
- **Návrh** — jedna konkrétní změna, ne seznam možností

## Co bych potřeboval vědět
Otázky na ostatní odborníky nebo na Filipa. Jmenuj obor, komu je kladeš.

## Čeho se nedotýkám
Co jsi vědomě nechal jinému oboru.
```

Pravidla pro všechny:

- **Nálezy podkládej.** Soubor a řádek, scénář, předpis, nebo změřená věc.
  **Dojem označ jako dojem.**
- **Měř na televizi, ne na telefonu** (rámec 3). Uveď, na jakém rozměru.
- **Žádné přepisování.** Navrhuješ-li jiný tvar nebo formulaci, napiš ji do
  posudku; neměň kód ani CSS.
- **Pět nálezů moderátora smíš vyvrátit.** Nejsou zadání. Kdo ukáže, že R1 až
  R5 míří mimo, odvedl největší práci v tomhle kole.
- **Nesmlouvej sám se sebou.** Je-li něco podle tvého oboru špatně, napiš to
  rovnou, i kdyby to bylo rozhodnuté.
- **Stručně: do 120 řádků.** Osm oborů je nad stropem, takže se platí místem.
- Necommituj.

## Jak poběží kola

1. **Kolo 1** — každý svůj posudek, bez čtení ostatních. Do 120 řádků.
2. **Kolo 2** — moderátor rozešle sporné body; každý hájí nebo ustupuje.
   Výstup `<session>-kolo2.md`, do 100 řádků.
3. **Kolo 3** — **poslední**. Jen co zbylo, s hlasováním, a povinná rubrika
   *Co nesmí spadnout pod stůl*. Výstup `<session>-kolo3.md`, do 60 řádků.

Závěr píše moderátor; shoda ani jednohlasnost se nevyžaduje — nesouhlas se
zapíše i s důvodem.
