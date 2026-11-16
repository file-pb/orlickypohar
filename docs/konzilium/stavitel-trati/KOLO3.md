# Kolo 3 — uzavřít, ne otevřít

Poslední kolo. **Nepřepisuj, co už je řečené, a neotvírej nic nového.**

Kolo 2 uzavřelo hodně a tohle už neřešte: nepopsané pípnutí žije jako řádek
ve frontě v `stavba.db`, zapsaný synchronně, ne ve vlastní tabulce a ne
v Reactu; **nejvýš jedno naráz**, vynucené tím, že se dál nepípne; slovo
„uložená" se nesmí napsat dřív, než to platí o disku; typ prvku padá vždy
hned po prvním pípnutí; odmítnutí se dělí na **vadu prvku** a **vadu
okolností** (403, 404, 5xx, 502 z nasazení) a u druhé třídy se karta zádrhelu
vůbec neukáže; *Zkusit znovu* stojí nad *Zahodit* a je obrysové, ne plná
plocha; destruktivní akce nikdy jako plná plocha; zahození nechá doklad
i se souřadnicemi; stav polohy nese **trvale slovo**, číslo jen u akce a
v detailu (spor C je tím uzavřen, oba jste došli k témuž); hystereze 25 → 20
na prahu přesnosti; živá vzdálenost u brány jedním stupněm se znakem směru;
pořadí voleb podle četnosti a pevně zadrátované; pomocníkovi se stavba
neotevře bez vlastního predikátu — čistá funkce `Pomocnici.SmiStavet` vedle
`SmiUVody`, sběr dat v `TratEndpoints` po vzoru `SmiUVodyAsync`, a rozsah se
u každé cesty vybírá **jmenovitě**, ne výchozí hodnotou.

Zbývají **tři** věci k rozhodnutí a jedna, kterou rozsekl moderátor.

## α. Tečka u stavu polohy — ustoupili jste dokola

Stalo se tohle: **2-design** v kole 1 chtěl, aby tečka nesla **znak** (disk,
vykřičník, kříž) a zvětšila se na 20 dp. **1-ergonomie** v kole 2 ustoupila
a znak přijala. **2-design** mezitím ustoupil ergonomii a znak **zrušil**,
protože po uzavření sporu C nese stav slovo. A pak navrhl třetí věc:
**siluetu** — plný disk, kroužek 3 dp, kroužek s diagonálou. Nikdo nedrží,
co obhajoval.

**Rozsekl jsem to sám, protože hlasovat o tom není o čem** a obě strany
došly k témuž důvodu z jiné strany: platí **silueta, 20 dp, odstín jako
druhý kanál, slovo v proužku jako první**. Je to moderátorské rozhodnutí,
ne shoda — zapíšu to tak. Silueta splní měření 2-designu (1,00:1 při
protanopii), nečte se jako znak (námitka 1-ergonomie) a 7-psycholog u
velikosti nerozhodoval.

**Nikdo nehlasuje.** Chcete-li proti tomu výhradu, napište ji do rubriky
*Výhrada*.

## β. Smí se odložit varianta, když typ padne hned?

Tohle je poslední zbytek nálezu 1 návrhu a jste 2 : 2.

1. **Odklad padá celý.** *1-ergonomie:* popis je jedno klepnutí a to
   klepnutí **má čas** — poloha je uložená, čtyři vteřiny doběhly; odklad
   nešetří nic měřitelného. *3-ux:* doptání je povinné a v lince, jinak se
   spor A vrací zadními vrátky, protože prvek s typem a bez varianty je
   totéž nedodělané pípnutí, jen o krok dál.
2. **Odkládá se varianta, ne typ.** *7-psycholog:* po prvním pípnutí se
   odpoví jediná otázka — patří k tomu druhý konec? —, a ta se odpovídá za
   jízdy mezi konci, kdy nic nemizí; druh brány, značení a směr smějí
   počkat. *9-rizika:* typ padne vždy hned, odkládá se jen varianta, a
   *Popíšu potom* u prvního konce brány nesmí existovat vůbec.

**Hlasují:** 1, 3, 7, 9. Jedna věta a hlas pro číslo. **Rovnost rozsekne
moderátor.**

Jedna věc k tomu, ať nehlasujete vedle: 1-ergonomie si pro variantu 1
vymínila podmínku — *je-li* odpověď Filipa taková, že se o prvcích rozhoduje
až na vodě podle větru, odklad být musí. Filip zatím neodpověděl. Hlasujte o
tom, co platí, když se trať staví podle plánu, a podmínku zopakujte, platí-li
pro vás taky.

## γ. Má sloučený seznam sedm řádků, nebo osm?

- **1-ergonomie** drží **osm**: strana je u průjezdní zapsaný údaj
  (`VOLBY.jedna`, `strana: PoLeve` / `PoPrave`, `stavba-prvku.ts:241–256`),
  stejně jako u otočné, která dva řádky má. Měřeno 735 pt na 844 pt,
  neroluje.
- **3-ux** drží **sedm** s povinným doptáním; jedenáct úplných kombinací se
  nevejde, sedm je bez doptání nepravdivých.
- **2-design** přidal k sedmi argument: jedenáct by potřebovalo viditelnou
  hranu seznamu a tu sada tokenů na 3:1 neumí; a navrhl **mezeru 12 dp**
  místo 6 a rám u voleb vypustit.

Je to spor o **věcnou otázku**, ne o vkus: nese *Průjezdní* stranu jako
zapsaný údaj, nebo ne? Kdo to má v kódu doložené, ten má pravdu.

**Hlasují:** 1, 3, 2. Jedna věta a hlas pro **sedm** nebo **osm**. Platí-li
osm, řekněte, jestli se 2-designova mezera 12 dp ještě vejde.

## δ. Potvrzení u zahození — na témže místě, nebo jinde?

- **1-ergonomie:** **dvě klepnutí na tomtéž místě.** První přepne obrysové
  tlačítko na větu *„Zahodit prvek 5 — poloha se nevrátí"*, druhé provede,
  terč se nepohne ani o bod, po pěti vteřinách se vrátí. Modální dialog je
  v rukavicích nejhorší tvar: objeví se pod klesajícím palcem a odklepne se
  týmž gestem.
- **9-rizika:** druhá fáze téhož tlačítka, ale s terčem **jinde** než první
  klepnutí — tím se kryje i nález 1/2, destruktivní terč v klidové poloze
  palce.

Obojí odmítá dialog, takže spor je úzký: **pohne se terč mezi fázemi, nebo
ne?** 1-ergonomie tvrdí, že nepohnutý terč chrání před mířením; 9-rizika, že
právě nepohnutý terč dovolí dvojí klepnutí jedním gestem.

**Hlasují:** 1, 9. **Přizván:** 7 — co udělá pod tlakem palec, který už
klesá, a co z toho je horší: minout, nebo potvrdit omylem?

## Co napsat

Do `docs/konzilium/stavitel-trati/<tvoje-session>-kolo3.md`, do **60 řádků**:

```markdown
# <obor> — kolo 3

## Rozhodnutí
Jeden řádek na každý bod, u kterého jsi jmenovaný: písmeno, rozhodnutí, hlas.

## Co nesmí spadnout pod stůl
Nejvýš dvě věty. Co z tvého oboru by se při stavbě nejsnáz zapomnělo, i když
to není sporné. **Povinná rubrika.**

## Výhrada
Jen když s něčím nesouhlasíš a chceš, aby to bylo v závěru zapsané i s
důvodem. Jinak vynech.
```

Pravidla platí dál: podkládej, nepřepisuj kód ani makety, necommituj,
nesahej na cizí soubory.
