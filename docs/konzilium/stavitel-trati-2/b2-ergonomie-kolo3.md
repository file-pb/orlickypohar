# Ergonomie ovládání — kolo 3

Počítám na rozpočtu po uzavřených bodech: vítr nikam (bod 1), řádek
*Přerovnat + Nahlásit hotovo* pryč (−58 dp, bod 5 a 2-design), návěstí
*CO UŽ STOJÍ* pryč (−26 dp, 2-design).

## Jedna řádka trati

**Rozpočet obrazovky po těch dvou škrtech.** Hlavička 106, proužek polohy
48 (y 106–154 včetně 6 dp mezery, vítr v něm není), dolní pruh 208 − 58 =
**150** (10 + popiska 16 + 8 + plocha 86 + 30). Na seznam zbývá
844 − 154 − 150 = **540 dp**, bez návěstí a s vnitřní výplní 18 → **522 dp
na řádky**. Proti kolu 2, kde to bylo 438, je to o **84 dp** víc — přesně
to, co uvolnil 2-design, a nic z toho jsem si nevymyslel sám.

**Rozhodnutí o rozteči: spojnice 8 dp — a seznam přesto roluje.** Není to
„nebo", je to „a", a tady je proč:

| rozteč | spojnice | kolik prvků se vejde do 522 |
|---|---|---|
| 77 dp (dnes) | 19–21 | **7** (77 × 7 − 21 = 518) |
| 64 dp | 8 | **8** (64 × 8 − 8 = 504) |

**Osm řádků, tedy strop rozhodnutí 3, se při dnešní rozteči nevejde ani po
těch škrtech** (595 > 522) — osmý se pořád ustřihne. Teprve 64 ten strop
uhájí, a běžná trať (po bodu 7 čtyři až sedm značek) má při ní rezervu:
sedm řádků zabere 440 a zbývá **82 dp** na zalomené jméno. Druhý důvod je
z mého oboru: spojnice **není terč**, takže její zkrácení nestojí nic. Mezera
mezi dvěma terči klesne na 8 dp — mez, kterou si tohle konzilium drží i u vzorků
barvy —, a je přijatelná právě proto, že chybné klepnutí na řádek otevře **cizí
detail**, odkud vede zpátky jedno klepnutí a nic se nemaže.

**Rolování je pojistka, ne pohodlí.** `overflow: hidden` musí jít pryč, i když
rozpočet vychází: ustřižený řádek je **jediná porucha téhle obrazovky, kterou
nikdo nepozná** — trať vypadá úplná a *Nahlásit hotovo* pak ohlásí trať, kterou
stavitel neviděl. Zalomené jméno nebo zvětšené písmo systému rozpočet přetáhnou
kdykoliv. Rolování stojí jedno gesto, ustřižení dává špatnou odpověď, a je
bezpečné jen proto, že dolní pruh je ven z rolovaného obsahu (bod 11).

**Tvar řádky — čísla.** Šířka 358, levý sloupec **40** (ze 34), karta
tedy **318 × 56**, vnitřek 318 − 26 = **292 dp**.

- **Vlevo:** silueta **28 × 36** ze `znak-boje.tsx`, výplň = barva té bóje.
  Není to terč (terč je celý řádek), takže mez 44 na ni neplatí — platí
  jen čitelnost, a při 17 dp jsou od sebe tvary dva až tři body.
- **Uprostřed:** jméno 16/600 (66 dp) a pod ním předpis 13 (134 dp), tedy
  **134 dp** z 292.
- **Vpravo:** sloupec 15/700 `↑ 063° · 310 m` = **109 dp** (změřil
  2-design) a pod ním stav 13/600 (`změřeno` 55 dp). Součet
  134 + 10 + 109 = **253 z 292**, rezerva 39 dp — **sloupec 40 dp se tedy
  vejde**, a to je číslo, na které 2-design čekal. Svisle 18 + 16 = 34
  z vnitřních 38 dp. Číslo **jen u té značky, ke které se jede** (3-ux).
- **Terč:** celý řádek 318 × 56, vstup do detailu — jedno klepnutí, nejnižší
  možná cena. Dnes neexistuje ani v maketě, ani v kódu (`stavba.tsx:475`
  kreslí `View`).

## Detail prvku

**Hlavní akce detailu je přesun, protože ten měří.** Tím drží bod 6 (plná
`voda` = změř polohu tady a teď) i návyk: stejné místo, stejná velikost
358 × 86 na y 728. Slovo se ale nemění — beru tvar, který 2-design změřil pro
*Jsem u ní*: řádka 1 **`PÍPNI`** 26/800, řádka 2 `sem místo Brány 2` 15/600
(117 dp). Stavitel mačká pořád totéž tlačítko a druhá řádka říká, co se stane.

**Cena přesunu: 2 klepnutí.** Řádek v seznamu (1) + `PÍPNI` (1).
Potvrzení tam **nepatří** — přesun není nevratný, starý záznam zůstává
platný pro dobu, kdy platil (`Boje.NahrazenaV`, NAVRH:442–446). Tím je
hlavní práce dne stejně drahá jako zakládání nové značky (2 klepnutí
z kola 1), což bylo celé moje E4. **Proti patnácti ze sporu G:** druhá
rozjížďka na téže trati s přesazeným horním znakem je klon (1) + řádek (1)
+ `PÍPNI` (1) = **3 klepnutí a žádná jízda**, proti patnácti klepnutím,
jízdě a zámku, který nikdo nechce odemykat. Podmínka 3-ux platí: dokud
`PrepojPrvkyAsync` neumí trať, ten klon v appce být nesmí — jinak jsou ta
tři klepnutí tichý přepis odjeté rozjížďky.

**Pořadí shora dolů, a je dané frekvencí a nevratností:**

| # | co | tvar | proč tam |
|---|---|---|---|
| 1 | jméno a předpis | hlavička, 44 × 44 zpět | jediná orientace |
| 2 | proužek polohy | 42 dp | dvě akce níž měří (bod 3) |
| 3 | geometrie: azimut, vzdálenost, délka linie | 56 dp, bez terče | čte se, neklepe se (J1/2) |
| 4 | fotky: dvě místa 185 × 172, *Vyfotit* 60, *Vybrat z galerie* 54 | 200 dp | nejčastější druhá práce u značky |
| 5 | *Sebrat z vody* | obrysový 358 × 48 | častá, vratná jen novou stavbou |
| 6 | barva a tvar | řádek 56 dp → vzorky | mění se jednou za ráno (E5) |
| 7 | *výš / níž* | dva terče 44 × 44 | oprava sledu, za týmž příznakem jako mazání (J3) |
| 8 | *Smazat prvek z trati* | dvě fáze, nejslabší tvar | nejnevratnější věc na obrazovce |

**Vejde se to, ale bez rezervy.** Nad pevným pruhem je 844 − 150 − 106 − 48 =
**540 dp**; bloky 3 až 8 měří 56 + 200 + 48 + 56 + 56 + 48 = 464 a pět mezer
po 8 dá **504 z 540**. Rezerva 36 dp je míň než jedna řádka, takže i detail
musí rolovat — a je to tady správně: pod hranou skončí první **mazání**, tedy
to, co nemá ležet tam, kam palec dopadne (E2). A *Vybrat z galerie* ať stojí
**nad** *Vyfotit*: cesta, které může chybět EXIF (NAVRH:196–198), nemá být ta
snáz dosažitelná.

## Zbytek sporu C

Držím **dvě řady po čtyřech se vzorky 56 × 56** a nabízím řešení námitky
2-designu o nesymetrii: osmá buňka existuje věcně — `Boje.Barva` je
**nepovinná** (NAVRH:346), takže osmé políčko je *neuvedeno*, a řada
4 + 4 je symetrická. Měřeno: 4 × 56 + 3 × 22 = 290 z 358 dp, dvě řady
s mezerou 8 stojí 120 dp z 248 volných.

Proti nafouknutí terče paddingem mám měřený precedens z tohohle repozitáře:
`chip` měl `minHeight: 44` a vykreslených **39,5 dp**, a první běh to
pojmenoval jako vadu, kterou kontrola nevidí (`ZAVER.md`, bod 8). Terč větší
než inkoust projde skriptem, ale palec míří na to, co vidí. Jsou to dvě řady
na obrazovce, která se otevře jednou za ráno — nejlevnější místo, kde se dá
platit velikostí.

## Co jsem si rozmyslel

**Přesun jsem v kole 2 odhadl na „nejmíň 4 klepnutí". Jsou dvě** — jakmile je
hlavní akcí detailu on. Ten odhad mluvil o obrazovce, která nebyla nakreslená,
a to je přesně ta nejistota, kvůli které jsem ji udělal podmínkou.

**A spojnici 8 dp jsem v kole 2 nabízel jako jednu ze dvou možností.** Po
škrtech 2-designu je to **jediná**, která uhájí osm řádků (595 > 522);
rolování k ní není alternativa, ale pojistka proti ustřižení.
