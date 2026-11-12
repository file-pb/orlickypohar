# Ergonomie ovládání — kolo 3

## Rozhodnutí

**β — jedno číslo je 350 px a na práh se sahat musí.** Změřeno v prohlížeči proti živému
`globals.css` se skutečným DOM `DlazdiceSekci`, sedm dlaždic, cíl 44 px:

| displej | obsah `main.obal` | práh 7,25 rem (dnes) | práh 6,6 rem |
|---|---|---|---|
| 390 px | 350 px | 2 sloupce / 4 řady / **196,3 px** | 3 / 3 / **145,6 px** |
| 375 px | 335 px | 2 / 4 / 196,3 px | 3 / 3 / 145,6 px |
| 360 px | 320 px | 2 / 4 / 196,3 px | 2 / 4 / 196,3 px |

- **361 px je maketa** (`.okno { padding: 0.9rem }`); aplikace má
  `.obal { padding: 0 1.25rem }` (`globals.css:287`) → 350 px, přečteno z `main.obal`. Moje číslo
  platí pro aplikaci, designové pro maketu.
- **Dvě řady / 93,6 px se dostat nedají.** Čtyři sloupce chtějí práh ≤ 5,17 rem
  a pak jsou čtyři karty o 5,8–21,8 px širší než sloupec, jeden pár se **překrývá** a nejpravější
  končí 13,4 px za obsahem — `scrollWidth` přitom hlásí 390 a vodorovné rolování nevzniká, takže
  rychlé měření to nepozná.
- **Moje „7 rem" z kola 2 platilo jen pro 390 px:** na 375 px (velikost, na které
  projekt zkouší, R10) dává pořád dva sloupce. Min-content nejširší dlaždice je **104,5 px**
  (*Oprávnění* 74,5 px textu + 30 px rámu), takže okno prahu je 6,53–6,71 rem — **beru 6,6 rem**.
  Pod 366 px pruh spadne na dva sloupce, a to je správně: přeteklá karta je horší než čtvrtá řada.
- **Flex z designova kola 2 vyjde nastejno, ale rozbije zkrácená jména:** `li` má
  `container-type: inline-size` (`globals.css:2040`), tedy size containment — dlaždice se nesmí
  měřit podle obsahu a změřeně spadne na **30 px se šesti překryvy**; s `container-type: normal`
  dá flex 3 řady / 145,6 px, totéž co grid na 6,6 rem. Grid s prahem je levnější a nechá
  `@container` žít. A **padá *Víc*** (3-uxovi): sedm dlaždic se vejde, schovávat není co.

**α — hlasuju pro 3, úkol v *Co teď*.** Možnost 2 je mimo (ročníková adresa — na to jsem
upozorňoval v kole 2 a 4-jazyk to potvrdil), možnost 1 vrací položku z práv do nabídky, o které
audit 6. 10. 2026 píše, že *„vede jen na rozcestník"*. Trojka stojí **nulovou navigaci**, když
něco visí, a nic, když nevisí — **podmínkou**, že stojí poslední, za závodními úkoly.

**δ — teplá barva ani barva nevybraných mi k zamíření nepomáhá, a nemusí.** Míří se polohou:
pořadí drží `polozkyRocniku` (`co-smim.ts:184`), na telefonu je to sedm pevných míst a *Co teď*
je první vlevo nahoře. **Přijímám 45 % barvy v lince i zrušení `--ukon-coted` s tečkou** — z
mého oboru proti tomu nestojí nic.

**ζ — tu cenu neplatím: šestý tab je levnější než *Novinky* z pruhu.** *Pravidla ročníku* se
čtou raz za sezónu před přihláškou, *Novinky* opakovaně celou sezónu; vyměnit častěji čtené za
jednou čtené je proti frekvenci, a šířka k tomu nenutí — osm plných jmen padne podle 2-designu
do 876,5 px z 1216. **Pravidla šestým tabem, Novinky zůstávají.**

**η — držím, 3-ux i 4-jazyk souhlasí:** drobeček končí patrem, nikdy tabem.

## Co nesmí spadnout pod stůl

Oprava 44 px patří pod `@media (pointer: coarse)` do `.dlazdice-sekci .karta`
(`globals.css:1998`), ne do maket — jinak má **správa regaty, která „už stojí", cíl o 12 px
menší než ročník**, a to je obrazovka pro práci u vody. Práh 6,6 rem jde s ní v jednom commitu a obojí se
musí vidět na 375 i 390 px: okno prahu je 2,9 px široké.

## Výhrada

**Cena za *Pravidla ročníku* (ζ).** Trvá-li 5-jachting na výměně, chci zapsané, že *Novinky*
mizí z pruhu kvůli tabu otevíranému řádově desetkrát za sezónu, a že šířka k tomu nenutí: šestý
tab je drahý jednou, schovaná agenda při každém hledání.
