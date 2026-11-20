# Ergonomie ovládání — kolo 4

## Rozhodnutí

**α — hlas pro 1: v pravém sloupci jen stav slovem. Měním pozici z kola 3.**
Rozhodl argument z mého vlastního oboru, který jsem si neuvědomil: číslo, které
stojí **na jednom proměnlivém řádku**, se musí nejdřív najít, kdežto totéž číslo
na pevném místě se nehledá vůbec. Řádek nad hlavní akcí už existuje a 2-design
ho změřil celý: `3 prvky odesláno · ±4 m · 240 m k Bráně 2` je 13/400
**256 z 358 dp**, tedy **102 dp rezervy** — jachtařova **šipka** se do nich
vejde (~14 dp) a nese směr přesně tam, kam se stavitel dívá, i když nečte.
Jeho potřeba je tím splněná a sloupec zůstane jedno slovo; `čeká na odemčení`
si pro sebe bere 114 dp (2-design) a druhé číslo tam bylo navíc.

**β — hlas pro 2: souvislé vlákno.** Spojnice není terč, takže o jejím tvaru
nemám co rozhodovat; co jsem hájil, bylo **rozteč 64**, a ta vláknem platí dál
(56 + 8), takže osm řádků se do 522 dp vejde (504). Jedna ergonomická kontrola
k tomu: vlákno leží ve žlábku 40 dp **vedle** karet, ne mezi nimi, takže
viditelné oddělení dvou terčů o 8 dp zůstává.

**γ — hlas pro 1, s podmínkou, která 3-uxovu námitku ruší bez dialogu:**
mazání ať se nabízí **jen u značky s jediným průjezdem**; u značky s `2×` se
neukáže vůbec. Druhá cesta 3-uxe — zeptat se, který průjezd se maže — přidává
klepnutí a hlavně **dialog na nejnevratnějším terči obrazovky**, což rozhodnutí
6 prvního běhu zakázalo doslova. Filipovi tedy odpovídám, že mazání z lodi
zůstává tak, jak si ho vyžádal, jen se neukáže tam, kde by nebylo jednoznačné.

**δ — hlas pro 1: přesun ano, sebrání ne.** Zákaz nic neušetří, jen přesměruje.
Přesun stojí 2 klepnutí; pomocník, který ho nesmí, **pípne novou značku — a to
smí** (za jeho příznakem je pípnutí a čtení), což stojí taky 2 klepnutí a uloží
druhý platný záznam místo náhrady, protože `NahrazenaV` nenastaví nikdo. Zakázat
levnou správnou cestu a nechat otevřenou stejně levnou nesprávnou je ten
nejhorší možný poměr; ta druhá cena, kterou zákaz platí, je rádio a cizí jízda
několikrát za větrný den, zatímco pomocník sedí u té bóje.

## Co nesmí spadnout pod stůl

`kontrola-dotyku.py` musí přestat připisovat každému řádku textu paušálních
20 pt a číst `fontSize` — a rozšířit ji znamená rozšířit její sabotáž, tedy
ověřit, že `Pressable` s `fontSize: 13` a `paddingVertical: 12` **nově spadne**;
bez toho spraví `minHeight: 44` dva dnešní terče a příští se 13dp písmem projde
znovu. A pozor, čím ta kontrola **není**: `vyska()` nehlídá šířku ani mezeru
mezi terči, takže dvě čísla, na kterých celá tahle řádka stojí — 8 dp mezery
a „terčem je celý řádek" — jsou právě ta dvě, která CI neuvidí.

## Výhrada

Hlas α1 platí **s tou šipkou u akce**. Zmizí-li i ta, přechází můj hlas na α2:
vzdálenost bez směru je pro člověka u kormidla půl údaje a jachtařovo
*„jak daleko to je, nepřebere nikdo"* platí i tehdy, když se čte z jednoho
pevného místa.
