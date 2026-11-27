# 2-design — kolo 3

## Rozhodnutí

- **δ — hlas 1 (stavová věta na fotce).** Na fotce stojí jediný a nejtěžší text obrazovky,
  takže to má být ten, který odpovídá a na který se klepe; věta pro cizího se v 16 px / 400
  čte líp na čistém `--pozadi` než na snímku.
- **ε — hlas 2 (podle cíle a fáze).** Plné tlačítko je na obrazovce jedno a nese největší
  váhu mezi vším, na co se klepe, takže jeho nápis má říkat, kam vede, a měnit se spolu se
  stavovou větou; „Chci závodit" pustil i 8-pr, který ho navrhl.
- **η — hlas 2, měním proti kolu 2.** Hájil jsem odkaz rovnou na Výsledky, aby rozcestník
  nebyl klepnutí navíc; nese-li ale „Vydáno k regatě", není mezizastávka, nýbrž jediné místo,
  kde oznámení komise půjde na telefonu přečíst. Ve variantě 3 by na něj pod prahem nevedl
  žádný odkaz, protože všechny míří na Výsledky.
- **ι — hlas 1 (jen závorka a tlumená barva).** Závorka je tvar a tlumená barva tón, tedy dva
  kanály a žádný nestojí jen na barvě; čára přes číslici 14,4 px ji kazí. 5-jachting měří, že
  v třídě Nad7m je DNC 106 ze 175 buněk — přeškrtnutá by byla většina tabulky.
- **κ — hlas 1 (Orlický pohár).** Stojí už v titulku, `h1`, adrese i appce, takže sjednocení
  na něj nechá nejmíň míst, kde by zůstalo jméno druhé; ať vyhraje kterékoliv, nápis u znaku
  má být plnou výplní, ne šrafou.

## Co nesmí spadnout pod stůl

Tokeny (pět kroků písma, tři poloměry, modrá jen pro klepnutí) a kontrola párů písmo–podklad
v obou vzhledech v `tools/kontrola-tokenu.py` přijdou dřív než první opravená obrazovka, jinak
každá oprava přidá další hodnotu. Stavová věta na fotce drží 700 a závoj pod jejím horním
řádkem aspoň 50 % černé v obou vzhledech: jen tak je 19,2 px „velký text" s mezí 3 : 1
a projde i na bílém místě snímku (3,98 : 1).
