# Jachtař — kolo 4

## Rozhodnutí

**α — volba 2: šipka a vzdálenost u té jediné značky, ke které se jede;
číslice azimutu do detailu.** Námitka 3-ux platí na to, co jsem nenavrhoval:
pět pohyblivých čísel na šesti řádcích. Tohle je **jedno** číslo na **jednom**
řádku, a šipka není číslo — je to obrázek, který se nečte, jen vidí. Vzdálenost
nad vodou nikdo neodhadne; směr si člověk okem přebere, a proto je ve řádce
jako šipka a číslicemi až tam, odkud se předčítá do vysílačky.

**β — volba 2: souvislé vlákno 1,5 dp v `tlumeny`.** V kole 3 jsem podpořil
zkrácení teček, ale šlo mi o rozteč 64, ne o tečky; vlákno dá tutéž rozteč bez
pahýlu ze dvou teček. Z oboru k tomu jedna věc navíc: v žlábku teď stojí **šest
různých siluet**, a ty potřebují mezi sebou tichou linku, ne druhou texturu,
která s nimi soupeří o pohled.

**γ — volba 2: mazání prvku odchází z lodi spolu s pořadím.** Měním tím svůj
hlas z kola 3, a to kvůli argumentu, který je důsledkem mé vlastní J2: když je
řádka **značka**, nejnevratnější akce v detailu míří na **prvek**, a u bóje se
dvěma průjezdy neřekne, který z nich maže. Navíc smazat prvek znamená
rozhodnout, že se tudy nejede — a to je rozhodčí (`PrvekTrati.cs:146–149`),
stejně jako u pořadí.

**Co odpovědět Filipovi:** co chtěl, zůstává — z lodi jde zrušit omyl hned po
pípnutí (*Nebylo to nic*), zahodit prvek, který ještě neodešel (*Zahodit
z fronty*), a sebrat bóji, která z vody fyzicky zmizela. Odchází jedině mazání
**potvrzeného** prvku trati, tedy úkon, který na vodě nemá spouštěč: když
rozhodčí vyřadí bránu, stavitel bóje **sebere** a prvek škrtne ten, kdo to
rozhodl. Na vodě tím zbude jediná nevratná akce, a je o bóji, ne o trati.

**δ — volba 1: přesun ano, sebrání ne.** *Přesunout sem* je pípnutí — měří
polohu telefonem u bóje —, takže patří přesně za ten příznak, pro který
pomocník existuje. *Sebrat z vody* žádné měření není: `SebranaV` je u bóje tím,
čím je mazání u prvku (*„místo mazání se bóje označí za sebranou"*,
`Boje.cs:47`), takže zůstává organizátorovi a rozhodčímu — s γ je to pak
jedno pravidlo, ne dvě. A pomocník je často jediný člověk v motoráku: kdyby
nesměl přesouvat, hlavní práce dne by si žádala pořadatele na palubě.

## Co nesmí spadnout pod stůl

**Opravená jména z J4–J8 musí být v `stavba-prvku.ts` dřív, než se obrazovka
poprvé použije na vodě:** záznam značky je měření a jméno se po zápisu
nepřepisuje, takže jedna regata odjezděná se starým zněním nechá „start
levobok" v datech napořád — a ta jména jdou ven a dojdou k posádkám. **A u
*Přesunout sem* musí stát ta jedna věta, že přesun není oprava překlepu**,
protože je to jediný úkon na celé obrazovce, který doopravdy přepisuje historii
trati; bez ní jím lidé budou spravovat špatně zadanou polohu.

## Výhrada

Kdyby γ skončilo volbou 1, chci v závěru zapsané, že **mazání se v detailu
nenabízí u značky se dvěma průjezdy**. U ní není co smazat jednoznačně, a dotaz
„který průjezd" na nejnevratnějším terči obrazovky je horší než ta akce chybějící
— zvlášť když ji o patro výš nahradí *Sebrat z vody*, které říká pravdu o vodě.
