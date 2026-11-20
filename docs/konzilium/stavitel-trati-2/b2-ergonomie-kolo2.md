# Ergonomie ovládání — kolo 2

Měřeno tam, kde to kolo 1 nezměřilo: svislý rozpočet `Main.dc.html` a rozteč
osy. Obě otázky 2-designu odpovídám rovnou (spor C).

## Kde ustupuju

**E (přerovnání) — 5-jachtaři celou.** `PrvekTrati.cs:146–149` říká, že pořadí
je rozhodnutí rozhodčího, a stavitel ho na vodě nevymýšlí. Tím **padá můj E9
i celý spor o úchyt**: nejtěžší gesto, jaké obrazovka mohla mít, z lodi odchází
a s ním `gesture-handler` i `reanimated`; appka pořadí **ukazuje**, needituje.
Kdyby ho Filip na vodě přece chtěl, platí E9 beze změny: úchyt 44 × 56, nebo
*výš / níž* jako dva terče 44 × 44.

**B — 2-designovi, a není to proti mému E8.** *Jsem u ní* měří telefonem,
takže plnou `voda` nese právem; *Postavit sem* je `ZdrojPolohy.Mapa`, tedy
výslovně ne-měření, a *Hotovo* v `Barva` není akce, jen zavření. Tři váhy beru
s jednou podmínkou: **obrysová váha nesmí terč zmenšit** — *POSTAVIT SEM* má
358 × 72 (y 742–814) a je to jediný důvod, proč na té obrazovce stavitel je, ať
tedy změní jen výplň. U `Barva` spor zmizí sám, drží-li můj E5.

**C, otázka na mě: unese řádek 56 dp siluetu?** Unese, ale ne v tom, co je
nakreslené. Řádek má svislou výplň 9 + 9, tedy **38 dp obsahu**, levý sloupec
je **34 dp** a disk v něm 17 dp (měřeno na `Main`). Šest tvarů se od sebe liší
hranou vršku — při 17 dp jsou to **dva až tři body rozdílu**, v pohybu
nečitelné, a disk je pak poctivější; při **28 × 36 dp** rozdíl drží. Sloupec
tedy ze 34 na 40 dp (text je 324 dp široký a tituly krátké), silueta 28 × 36,
výplň = barva té bóje (J10), stav slovem vpravo. Rozhodnutí 5 závěru volí
siluetu pro tři stavy ve 20 dp; tady je tvarů šest.

**C, druhá otázka: vejde se sedm vzorků po 44 do jedné řady?** Vejde:
7 × 44 = 308 a šest mezer po 8 = 48, celkem **356 z 358 dp**. Ale lepší je to
nedělat: `Barva.dc.html` má mezi koncem obsahu (y 482) a tlačítkem (y 730)
**248 dp volna**, takže se vejdou **dvě řady po čtyřech se vzorky 56 × 56**
(4 × 56 + 3 × 22 = 290 dp) a druhá řada stojí 78 dp. V rukavicích je 56 o čtvrtinu
větší jistota než 44. **Doporučuju dvě řady po 56.**

**J9 — vzdálenost patří i ke startu, cíli a odskoku.** Nula klepnutí a nula dp;
číslo z `Dvoubod.dc.html` už existuje, jen se dnes ukáže jen do dopípnutí.

## Kde držím

**E2 (destruktivní terč v klidové poloze palce).** Nikdo neodporoval a přibyl
druhý důvod: spadne-li `Fronta` pod hranu, je *Zahodit prvek 5* právě to, kam
dopadne nechtěné klepnutí při rolování. Čísla beze změny.

**E6 (z `Popis` nevede cesta zpátky).** 3-ux našel tentýž tvar na dvou dalších
místech — obrazovka bez cesty zpátky není stav, je to destinace —, takže to
není ojedinělost makety, ale vzorec. Pět klepnutí na nápravu omylu nikdo
nepřizná, dokud je nezaplatí; jeden obrysový terč v hlavičce je smaže.

**E7 (varianta před druhým pípnutím).** Nikdo se k tomu nevyjádřil a závěr počítá
opačný sled. Je to jediné místo, kde se nepodstatné rozhodnutí vrátilo před krok,
který má čtyři vteřiny.

**E5 (barva ven ze zakládací cesty).** 2-design k ní přidal důvod z jiné strany
(vzorky mimo sadu, žlutá 1,92:1). V detailu prvku se to opraví stejně dobře
jako v průvodci — a tam to nestojí +50 % klepnutí u každé značky.

## Kde jsme se shodli

Nemá smysl o tom mluvit v kole 3: **„jedna obrazovka" se opravuje
překreslením**, **dolní pruh na `Fronta` je pod hranou**, **detail prvku není
nakreslený**, **barva v seznamu je barva té věci ve vodě**, **prázdný stav
chybí** a **`GET …/trat/prvky` nevydává `Zdroj`, `Barva` ani `Tvar`** — aditivní
změna, tedy jedno nasazení, ale tři nálezy se dnes plánují jako nulová práce.

## Nové, co vylezlo z cizích posudků

**N1. Osa ruší rozpočet osmi řádků, a je to měřitelné.** 2-design postavil
vedle sebe pět podob téhož řádku; při přeměřování `Main.dc.html` vyšlo tohle.
Seznam má oblast **y 154–636, tedy 482 dp**, z toho návěstí bere 44 →
**438 dp na řádky**, a rozteč osy je **77 dp** (řádky 198, 275, 352 — 56 dp
řádek a 19–21 dp spojnice). Z 77 n − 21 ≤ 438 vyjde **pět prvků**; šestý se
nevejde a `overflow: hidden` ho **ustřihne, ne odroluje**. Rozhodnutí 3 závěru
(„osm řádků, neroluje") bylo změřené na `Popis`, kde je rozteč 64 a osa žádná;
na hlavní obrazovce nikdy. **Důsledek:** spojnici na 8 dp (rozteč 64 → šest
prvků), nebo nechat seznam rolovat **pod pevným dolním pruhem** — což bod 3
platných žádá tak jako tak a jde to právě proto, že hlavní terč stojí. Co se
nesmí stát: citovat „osm řádků se vejde" jako doklad, že `Main` neroluje.

**N2. J2 je zároveň nejlevnější oprava N1.** Jeden řádek na značku místo na
průjezd: dvoukolová trať má šest průjezdů, ale čtyři značky — čtyři řádky jsou
287 dp a vejdou se, šest ne. Jede-li se na Orlíku na kola, řeší J2 věcnost
i rozpočet jednou změnou.

**A. Kde ta tři čísla stojí a co stojí.** Spor to být nemusí — **místo už je
nakreslené**:
- **Azimut a vzdálenost k té značce, ke které se zrovna jede**, patří do řádku
  **nad hlavním tlačítkem**. Ten řádek existuje a je změřený: `Main` y 704–720
  (16 dp, *„3 prvky odeslány · ±4 m"*), `Plan` *„Stojíš u Brány 2 · ±4 m"*.
  **Nula nových dp, nula klepnutí**, a je to 24 dp od palce — jediné místo,
  kam se stavitel dívá, i když nečte.
- **Vítr** patří do proužku polohy jako druhá řádka: 42 → 56 dp, tedy **14 dp**,
  ne nová karta. Je to stav prostředí měnící se bez přičinění stavitele — táž
  logika, jakou závěr použil na polohu (rozhodnutí 4).
- **Azimut u jednotlivého prvku** (pravidlo 33, utržená bóje) patří **do
  detailu**: 2 klepnutí, platí se jednou za příhodu, ne dvacetkrát za den.
- **Co za to zmizí:** na `Main` nic; na `Plan` jantarová karta plánu (67 dp,
  2-design/2) zaplatí obojí s rezervou.
Přichází-li azimut rádiem, mění se jen směr toku, ne místo: appka ta čísla
přijímá a ukazuje je na témž řádku.

**G. Co stojí slepá ulička a co z ní vede.** Dnes nevede nic a účet je: pípnutí
1 klepnutí + popis 1, prvek uvízne, zahození 2 — u pětiprvkové trati **patnáct
klepnutí a jedna jízda**, a konec je zámek, který nikdo odemykat nechce.
`POST /dalsi` je **1 klepnutí**, `POST /{trat}/klon` taky jedno a nahradí
**deset** (5 značek × 2) i celou jízdu. Terč je zdarma: druhá řádka hlavičky
(*„Radavská regata · 2. rozjížďka"*) leží v bloku vysokém 106 dp vedle 44 × 44
šipky zpět, takže terč 44 dp z ní **nestojí žádné místo** — tím odpovídám
i designu. Zakládá-li druhou trať kancelář, nese týž terč *která trať se staví*.

## Podmínka

1. **Pevný dolní pruh s pípnutím v každém stavu i režimu.** Bez něj obrazovka
   nemá návyk, a návyk je v rukavicích to, co má člověk místo miření. Po N1
   dvojnásob: rolovat se bude, a tím spíš musí stát terč.
2. **Nakreslený a změřený detail prvku.** Spadly do něj čtyři nálezy, cena
   hlavní práce dne (E4), teď i azimut a barva. Dokud nestojí, je polovina
   návrhu nezměřená.
