# Vizuální design — kolo 3

## Rozhodnutí

**γ — osm řádků. Hlas: osm.** Ověřil jsem si doložení 1-ergonomie v kódu
a drží: `PrujezdniBoje` je ve `VOLBY.jedna` dvakrát, se `strana: "PoLeve"`
a `"PoPrave"`, s vlastním `jmeno` i vlastní `stopa` (`mineLevobok` /
`minePravobok`) — `packages/stavba/stavba-prvku.ts:241–256`. Strana je
u průjezdní zapsaný údaj stejně jako u otočné, takže sedmý řádek „Průjezdní"
by byl jediný nepravdivý řádek seznamu, a doptání na stranu by druhou vrstvu
přidalo právě u prvku, který se staví často. Můj argument z kola 2 proti
jedenácti (seznam, který roluje, nemá čím ohlásit, že roluje — hrana `linka`
1,26:1, mezera `papir`/`pozadi` 1,04:1) proti osmi nestojí: osm neroluje.

**γ, k mezeře 12 dp — vejde se, ale záleží na β.** Počítám z maket: řádky
8 × 56 = 448, mezery 7 × 12 = 84, tedy seznam 532 pt; k tomu hlavička 103,
karta polohy 67 a dvě návěstí 78 → **780 pt na 844**, se 64 pt k dobru. To
je tvar, ve kterém *Popíšu potom* není, tedy při β 1 — a je to táž sestava,
ve které 1-ergonomie naměřila 735 pt při mezeře 6 dp. **Zůstane-li odklad**
(β 2), spodní pruh s *Popíšu potom* vezme 92 pt a při 12 dp se seznam
přeteče na 872 pt; pak platí mezera 6 dp (830 pt) a vypustí se jedno
z návěstí. Pořadí důležitosti je v obou případech stejné: **nejdřív pryč
s rámem u voleb** — ten je za 1,26:1 neviditelný a nic nestojí ho zrušit —,
mezera 12 dp je až druhá.

## Co nesmí spadnout pod stůl

**`app/testy/kontrast.test.ts` se musí rozšířit o páry, které stavitel
zavádí** — výplň `voda` / `linka` / `text` proti `pismoNaVyplni`, tečka
stavu proti `papir` i `pozadi` —, protože dnes měří jen proužky znamení na
panelu odpočtu, takže návrat bílé napevno na modré ploše (2,35:1 v tmavé
sadě) by CI nechytila; a rozšířit kontrolu znamená rozšířit její sabotáž,
tedy ověřit, že nový pár s bílou napevno **spadne**. Druhá věc, nesporná
a proto zapomenutelná: obrys *Zkusit znovu* patří do tokenu `text`
(16,21:1 světlá, 14,99:1 tmavá), ne do `voda` (5,67:1 a **7,06:1**, ne
7,19 jako v kole 2) — přerušovaný `voda` už v `Dvoubod.dc.html` znamená
„tady chybí značka, pípni", a třetí role pro jeden token je přesně to,
proti čemu stál můj nález 4.
