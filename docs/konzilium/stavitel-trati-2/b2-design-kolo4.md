# Vizuální design — kolo 4

## Rozhodnutí

**α — volba 2, v tom zúžení, jak ji podává 5-jachtar: šipka a metry,
číslice azimutu do detailu.** Není to návrat k tomu, co jsem v kole 3
stáhl — stahoval jsem číslo na **každém** řádku, a proti tomu moje
námitka („pět pohyblivých čísel je zase všechno váží stejně") pořád
platí. Na **jednom** řádku je to obrácená věc: jediný rozlišený řádek
v seznamu je sám o sobě ten nejužitečnější údaj na obrazovce, a dělá ho
**váha**, ne barva — druhá řádka 15/700 v `text`, žádný token nedostane
další význam. Z oboru pro to mám ještě jeden důvod: šipka se váže k tomu,
na co ukazuje, **sousedstvím**. Vedle jména ho nepotřebuje popsat; na
řádku u akce musí totéž udělat slovy („240 m k Bráně 2", změřeno 13/400 =
256 z 358). Adjacence je levnější než tři slova. Měření sedí: šipka
s „310 m" je ~60 dp, tedy se vejde do sloupce, který si stejně držím
širší kvůli nejdelšímu stavu (`čeká na odemčení` = 114 dp), a svisle
18 + 16 = 34 z vnitřních 38 dp. **Podmínka mého hlasu:** metry pak odejdou
z řádku nad tlačítkem. Týž údaj podruhé a jiným tvarem je přesně to, kvůli
čemu zmizela zelená karta polohy i jantarová karta plánu.

**β — volba 2: souvislé vlákno 1,5 dp v `tlumeny` (5,60:1 na `pozadi`)
kreslené na pozadí žlábku od prvního uzlu k poslednímu, místo teček.**
Ostatní to nečetli, takže v jedné větě: vlákno **není prvek ve sloupci**,
takže rozteč je prostě řádek 56 plus mezera 8 — **týž počet 64 a týchž
osm řádků jako volba 1**, jen se v té mezeře nekreslí dvě tečky, které už
nejsou vzorek (přerušovaná čára potřebuje tři opakování; pahýl 8 dp se
navíc nedotkne ani jednoho uzlu, protože silueta 36 v řádku 56 nechá nad
i pod sebou 10 dp volna). Aritmetika 1-ergonomie tím zůstává nedotčená
a výhrada 3-uxe („nekrátit spojnici") se vyřeší tím, že není co krátit.
Dnešní `#b7b2aa` ať zmizí tak jako tak: 2,02:1 ve světlé, 8,53:1 v tmavé,
a tmavý protějšek nemá.

## Co nesmí spadnout pod stůl

Devět hexů mimo `theme.ts` (`#b7b2aa`, `#c8c4bd`, `#e6e3de`, `#8d8880`,
`#f6f3ef`, `#9b968d`, `#eef3f5`, `#dfe6ea`) a bílá napevno na `voda`
nejsou kosmetika: v tmavé sadě se obracejí — spojnice osy z 2,02 na
8,53:1, plocha vypnutého tlačítka z 1,23 na 14,06:1, bílá na modré na
**2,35:1** —, a `tools/kontrola-tokenu.py` je neuvidí, protože porovnává
klíče, ne hexy přibylé v komponentě. Proto musí `app/testy/kontrast.test.ts`
dostat páry, které stavitel zavádí, **i se sabotáží**: ověřit, že pár
s bílou napevno na `voda` doopravdy **spadne**, jinak je ta kontrola jen
zelená známka o tom, co se neměřilo.

## Výhrada

`odesláno` jako mlčení beru, ale pravý sloupec si musí **držet šířku
i prázdný**. Jinak se jména vodorovně posouvají, jak fronta dotéká —
pohyb na obrazovce, která se čte na houpající se lodi, a to u údaje,
který se mění sám od sebe. Totéž platí pro detail ve dvou tvarech: co
v tom chudším chybí, nesmí posunout to, co v něm zůstává.
