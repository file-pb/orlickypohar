# Závěr druhého konzilia nad staviteli trati (21. 11. 2026)

Čtyři obory — ergonomie, design, UX, jachtař —, čtyři kola, 1 030 řádků
posudků. Sestavu vybral Filip jmenovitě a design byl hlavní obor: zadání
znělo *„je to potřeba vylepšit více elegantně"*.

**Odpověď na to zadání padla v prvním kole a drží celý závěr:** elegance
tu není ozdoba navíc, je to **ubírání**. Návrh byl v patnácti nálezech
patnáct odpovědí a dalo se to změřit — tentýž řádek trati měl šest
podob v pěti výškách a jedna modrá plocha nesla šest významů. Co z toho
vzešlo, není víc funkcí, ale **méně tvarů**: jedna řádka, jedna osa, tři
váhy, jeden význam na barvu.

Druhý nejdůležitější tah udělal jachtař a byl to škrt: **vítr z obrazovky
zrušil sám**, protože stavitel ho vidí z vlajky, čeření a na kaňonu
i z tvaru vody. Z vody nejde přečíst jedině **geometrie**.

## Co se mění

### 1. Jedna obrazovka, a teď i nakreslená

„Stavba, Plán, Hotovo a Pořadí jsou jedna obrazovka" bylo vyhlášené
v návrhu a **nenakreslené** — doloženo třikrát nezávisle. Po tomhle běhu
jsou to **stavy jedné obrazovky**, je jich šest včetně zámku, a **režim
žádný**: přerovnání z lodi odešlo (bod 5).

Pevný dolní pruh s pípnutím patří do **každého** stavu; dnes chybí ve
dvou a na `Fronta` leží hlavní akce na y 865–951, tedy **pod hranou
displeje**.

### 2. Jedna řádka trati — čísla, ne přívlastky

Žlábek osy **40 dp**, karta **318 × 56**, vnitřek 292, rozteč **64**.

| | co | míra |
|---|---|---|
| vlevo | silueta značky ze `znak-boje.tsx`, výplň = barva té bóje | 28 × 36 |
| uprostřed | jméno 16/600 · předpis 13/400 `tlumeny` | 66 · 134 |
| vpravo | **stav jedním slovem** | sloupec 114 |

Celý řádek je terč a vstup do detailu — dnes to není terč ani v maketě,
ani v kódu (`stavba.tsx:475` kreslí `View`).

**Silueta 28 × 36, a ne menší:** při 17 dp jsou od sebe tvary dva až tři
body, při 36 je kužel proti válci 13 dp. Poloměr nad 13 ne — plovatka je
`2,8 r` a řádku by přerostla. Jediný pár, který se neoddělí nikdy, je
válec proti kouli (roh `0,293 r` = 3,8 dp), a nevadí to: červený válec
proti červené kouli se na Orlíku nepotká.

**`odesláno` je mlčení.** Řádka, u které je všechno v pořádku, neříká
nic; dnešní maketa dává zelenou fajfku všem třem řádkám, tedy
nejčastějšímu stavu nejvíc inkoustu. Stavy vyhrávají v tomhle pořadí,
a plyne to z toho, co každý dovoluje: `čeká na odemčení` → `čeká` →
`chybí druhý konec` → `z plánu` → `chybí fotka` → nic.

**`2×`** u značky, po které se jede dvakrát, patří ke **jménu**, nikdy do
sloupce stavu: je to vlastnost prvků, ne bóje.

### 3. Osa ukazuje značky, ne průjezdy

Došli k tomu tři obory nezávisle. Dvoukolová trať se v modelu zapisuje
opakováním prvku, takže na jednu bóji vyjdou dva řádky — a *Přesunout
sem* na jednom z nich sáhne na kus plastu, který je ve vodě jeden. Stavy
na řádce jsou přitom vlastnosti **bóje**, takže by se zdvojily a mohly
rozejít; jedna bóje nemůže mít fotku na druhém řádku a nemít ji na
prvním. Ztratí se tím doslovné pořadí, a to po bodu 5 na vodě nemá být.

Je to zároveň nejlevnější oprava toho, že se na hlavní obrazovku vejde
**pět** prvků a šestý se `overflow: hidden` **ustřihne, ne odroluje**.

### 4. Osu kreslí souvislé vlákno — jednomyslně (β)

Místo teček zkrácených na 8 dp: dvě tečky nejsou vzorek, přerušovaná čára
potřebuje tři opakování, a pahýl by se nedotkl ani jednoho uzlu. **Vlákno
1,5 dp v `tlumeny`** (5,60:1) kreslené na pozadí žlábku od prvního uzlu
k poslednímu **není prvek ve sloupci**, takže rozteč je prostě 56 + 8
a zkrácení na něm není vidět. V žlábku navíc stojí šest různých siluet
a ty potřebují tichou linku, ne druhou texturu.

Dnešní `#b7b2aa` zmizí tak jako tak: 2,02:1 ve světlé, 8,53:1 v tmavé,
tmavý protějšek nemá.

### 5. Seznam roluje, a je to pojistka, ne pohodlí

Počet řádek není omezený (tři, osm i jedenáct značek) a každý pevný
rozpočet se jednou překročí. **Ustřižený řádek je jediná porucha téhle
obrazovky, kterou nikdo nepozná** — trať vypadá úplná a *Nahlásit hotovo*
pak ohlásí trať, kterou stavitel neviděl.

Zákaz rolování z prvního běhu sem nepatří: zakazoval se proto, že nechtěné
klepnutí při rolování **zapíše prvek**, a to byl seznam voleb v `Popis`.
Tady je řádka vstup do detailu a destruktivní terče z ní odešly.

### 6. Přerovnání odchází z lodi

Pořadí je rozhodnutí rozhodčího (`PrvekTrati.cs:146–149`); stavitel ho na
vodě nevymýšlí, dostane ho zadané. Padá s ním **režim, dva přechody,
gesto, `gesture-handler` i `reanimated`** — jedna nativní závislost
z plánu zmizela. Oprava sledu *výš / níž* zůstává v detailu, nízko.

### 7. Detail prvku: fakta nahoře, protože se předčítají

Nenakreslená obrazovka, do které spadlo všechno. Pořadí shora dolů je
dané frekvencí a nevratností, s jednou výjimkou: **fakta jsou nahoře,
protože se nemačkají, ale čtou do vysílačky** — vestoje v houpající se
lodi a bez rolování.

1. jméno, předpis, `2×`
2. proužek polohy (dvě akce níž měří)
3. **geometrie:** souřadnice, čas, přesnost, **zdroj slovem** —
   *změřeno telefonem* / *odečteno z mapy* —, **azimut číslicemi**,
   vzdálenost, u startu, cíle a odskoku délka linie
4. **Přesunout sem** — hlavní práce dne
5. fotky, *Vybrat z galerie* **nad** *Vyfotit*
6. *Sebrat z vody*
7. barva a tvar
8. *výš / níž*
9. **Smazat prvek** — dole, nejslabší tvar, dvě fáze

**Hlavní akcí detailu je přesun, protože měří:** plná plocha 358 × 86 na
témž místě jako *Pípni*, a **slovo se nemění** — řádka 1 `PÍPNI`, řádka 2
`sem místo Brány 2`. Návyk tím přechází beze změny.

**Přesun stojí 2 klepnutí a nemá potvrzení** — není nevratný. Hlavní práce
dne je tím stejně levná jako zakládání nové značky. A **musí u něj stát
věta, že přesun není oprava překlepu**: starý záznam zůstává platný pro
dobu, kdy platil. Kdo chce opravit špatně zadanou polohu, zahodí a pípne
znovu.

**Detail má dva tvary a ten chudší je na vodě obvyklejší.** Dokud prvek
nedošel na server, nemá serverová čísla, takže fotka ani přesun v něm
**nejsou** — ne zešedivělé.

### 8. Vzdálenost u akce, azimut v detailu — moderátorské rozhodnutí (α)

**Hlasování skončilo 2 : 2** (1 a 3 pro sloupec bez čísla, 2 a 5 pro
šipku s metry v řádce), takže rozhoduju já. Rozhodnutí je blíž syntéze
než výhře jedné strany, protože shoda byla větší, než hlasy ukazují:
všichni čtyři chtějí **číslice azimutu v detailu**, **jedno číslo na
jednom místě** a **šipku** jako jiný kanál než číslici.

**Platí:** pravý sloupec řádky nese **jen stav slovem**; směr
a vzdálenost stojí **na řádku nad hlavní akcí**, kde už je přesnost —
`3 prvky odesláno · ±4 m · ↑ 240 m k Bráně 2` (změřeno 256 z 358 dp,
rezerva 102; šipka ~14).

Rozhodl argument z oboru, který cenu ovládání vlastní: **číslo na
proměnlivém řádku se musí najít, totéž číslo na pevném místě se nehledá
vůbec** — a řádek nad tlačítkem je 24 dp od palce, tedy jediné místo, kam
se stavitel dívá, i když nečte. Námitka 2-designu, že adjacence je
levnější než tři slova, padá tím, že ta tři slova **se tam stejně musí
napsat**: obrazovka musí říct, čeho se pípnutí týká, a pod padesát metrů
se dva kandidáti nerozliší a musí se zeptat.

**Podmínka obou stran je splněná:** číslo existuje právě jednou (podmínka
2-designu) a šipka u akce zůstává (výhrada 1-ergonomie, bez níž její hlas
přechází na druhou volbu).

### 9. Mazání na lodi zůstává — 2 : 1, s podmínkou všech tří (γ)

Filip si mazání vyžádal jmenovitě a **zůstává**. Rozhodly dva důvody:
bez něj vede z omylu jediná cesta, a to **přesun** — tedy ten jediný
úkon, který historii trati doopravdy přepíše —, a dvojznačnost, kterou
3-ux namítal, vzniká **jen u značky se dvěma průjezdy**; ty prvky ale
stavitel nezaložil, opakování vzniká tam, kde trať někdo skládá.

**Podmínka, na které se shodli všichni tři:** u značky s `2×` se mazání
**nenabízí vůbec**. Dotaz „který průjezd" na nejnevratnějším terči
obrazovky je horší než ta akce chybějící, a dialog tam rozhodnutí 6
prvního běhu zakázalo doslova.

### 10. Pomocník smí přesouvat, sebrat ne — jednomyslně (δ)

*Přesunout sem* **je pípnutí**: měří polohu telefonem u bóje, takže patří
přesně za ten příznak, kvůli kterému pomocník existuje. *Sebrat z vody*
měření není — `SebranaV` je u bóje tím, čím je mazání u prvku — a zůstává
organizátorovi a rozhodčímu; s bodem 9 je to jedno pravidlo, ne dvě.

Rozhodl argument, který nikdo nenapadl: **zákaz nic neušetří, jen
přesměruje.** Pomocník, který nesmí přesouvat, **pípne novou značku —
a to smí** —, takže na větrný den položí vedle staré bóje druhou jako
nový prvek. Výsledkem je trať se zdvojenými značkami a bez řetězu
`NahrazenaV`, tedy **horší data než ten úkon, který jsme mu odepřeli**.

### 11. Co ještě padlo a nikdo tomu neodporoval

Plán není rozložením — jantarová karta mizí, proužek polohy je první věc
pod hlavičkou **ve všech stavech** a stav je slovo v řádce, takže
obrazovka vypadá stejně, ať plán je, nebo není. **„Plán existuje" je
`Trat.ZverejnenaV`**, ne dopočet ze `ZdrojPolohy`: jinak jedny dráty nad
vodou překlopí obrazovku do režimu plánu a u nich zůstane *z plánu*
napořád, protože se k nim schválně nejede.

Dál: **varianta až po druhém pípnutí** (mezi konci brány se jede a je to
rozhodnutí rozhodčího, ne stavitele u kormidla); **barva ven ze zakládací
cesty** (do motoráku se ráno naloží jedna krabice bójí) a její vzorky
**dvě řady po čtyřech, 56 × 56**, s osmým polem *neuvedeno*; **cesta
zpátky z „co jsi pípnul"** jako *Nebylo to nic*; **klon jako obvyklý
začátek druhé rozjížďky** (3 klepnutí proti dnešním patnácti a jízdě),
`POST /dalsi` když se jede jinudy; **`Vybrat z galerie` nad `Vyfotit`**,
protože cesta, které může chybět EXIF, nemá být ta snáz dosažitelná.

## Co platí o živém kódu, ať se návrh postaví, nebo ne

### A. Přesun bóje po klonu přepíše odjetou rozjížďku

Našlo 3-ux, **ověřil jsem sám**. `PrepojPrvkyAsync` hledá prvky jen podle
`BojeAId`/`BojeBId` a **filtr na trať tam není** (`BojeSprava.cs:183–185`);
komentář nad ním vylučuje jen cizí *regatu*, ne druhou trať téže regaty.
Klon přitom kopíruje prvky **na tytéž záznamy bójí**
(`TratSprava.cs:881–884`, *„kopíruje se rozhodnutí, ne měření"*).

Po klonu tedy ukazují dvě tratě na tytéž bóje a *Přesunout sem* v druhé
rozjížďce přepíše prvky té první. Veřejná odpověď si pak protiřečí: prvky
berou souřadnice přes připojenou bóji, kdežto seznam bójí se rekonstruuje
časem. **Není to budoucí problém — klon volá web už dnes.**

### B. Řádku dnes nejde nakreslit, protože `znak-boje.tsx` je psaná pro mapu

Dvě výchozí hodnoty: bez zapsané barvy kreslí **červenou** (`:134`), tedy
*pravou stranu plavební dráhy* — celý seznam by byl červený —, a lem je
**bílý**, což je na `papir` **1,00:1**. Spraví to dva parametry (výchozí
výplň `tlumeny`, lem dopočítaný po vzoru `pismoNaVyplni`), ne druhá
kresba.

### C. API nevydává, z čeho se ta řádka kreslí

`GET …/trat/prvky` → `KonecBojeDto` nese jen `Id, Nazev, Sirka, Delka,
Znaceni` (`PrvkySprava.cs:12–13`). Chybí **`Zdroj`, `Barva`, `Tvar`
a počet fotek** — tedy všechno, z čeho je silueta i stav. `BojeDto` to má
celé, ale `GET …/boje` je jen pro pořadatele a rozhodčího, tedy zavřené
pro pomocníka, kvůli kterému se obrazovka otevírala. Aditivní změna,
jedno nasazení — a **text návrhu tvrdí, že se API nedotkne, což je
nepravda**, kterou jsem tam napsal já.

### D. Jména, která jdou ven v datech, jsou věcně špatně

J4–J8: linie nemá levobok a pravobok (boky má loď, ne čára — konce se
jmenují *plavidlo* a *bóje*); otevírající se start pípá dva body, které
nejsou konce linie; „vlevo/vpravo" u brány znamená jen „pípnuto první",
protože směr se u brány neukládá; *„stačí se jí dotknout"* slibuje
pravidlo, které z trasy nikdo neposoudí; a **„otočit levobokem" je ta
dvojznačnost, kterou projekt jednou odstranil** (`PrvekTrati.cs:88–96`) —
ponechat znak po levoboku znamená točit **doprava**.

### E. `kontrola-dotyku.py` nevidí to, na čem řádka stojí

Připisuje každému řádku textu paušálních 20 pt místo `fontSize`, takže
`minHeight: 44` dva dnešní terče spraví a příští se 13dp písmem projde
znovu. A nehlídá **šířku ani mezeru mezi terči** — tedy právě ta dvě
čísla, na kterých tahle řádka stojí: 8 dp mezery a „terčem je celý řádek".

## Co se při stavbě zapomene první

Jedna věta na obor, povinná rubrika.

- **1-ergonomie:** rozšířit `kontrola-dotyku.py` znamená rozšířit její
  **sabotáž** — ověřit, že `Pressable` s `fontSize: 13` nově spadne —,
  jinak je to zelená známka o tom, co se neměřilo.
- **2-design:** devět hexů mimo `theme.ts` a bílá napevno na `voda` se
  v tmavé sadě **obracejí** (spojnice 2,02 → 8,53:1, bílá na modré
  2,35:1) a kontrola tokenů je neuvidí, protože porovnává klíče, ne hexy
  přibylé v komponentě.
- **3-ux:** prázdný stav není v žádné z patnácti maket, a ten druhý —
  *„trať se zatím nenačetla"* — dnes **lže**: `nactiZaSebe` vrací `null`
  i na 401, takže vypršelá relace zve stavitele pípat dál, zatímco každý
  prvek skončí na „Nikdo není přihlášený".
- **5-jachtar:** opravená jména z J4–J8 musí být v kódu **dřív, než se
  obrazovka poprvé použije na vodě** — záznam značky je měření a jméno se
  po zápisu nepřepisuje, takže jedna regata se starým zněním nechá „start
  levobok" v datech napořád.

## Zapsané nesouhlasy

- **5-jachtar k bodu 9:** mazání prvku mělo z lodi odejít spolu
  s pořadím. Smazat prvek znamená rozhodnout, že se tudy nejede, a to je
  rozhodčí; na vodě měla zbýt jediná nevratná akce, a to *Sebrat z vody*,
  která mluví o bóji, ne o trati. Přehlasován 2 : 1; jeho podmínka
  (nenabízet mazání u značky s `2×`) prošla a je v bodě 9.
- **2-design k bodu 2:** pravý sloupec si musí **držet šířku i prázdný**.
  Jinak se jména vodorovně posouvají, jak fronta dotéká — pohyb na
  obrazovce, která se čte na houpající se lodi, u údaje, který se mění sám
  od sebe. Totéž platí pro detail ve dvou tvarech.
- **3-ux k bodu A:** klon nesmí být v appce dřív, než přepojení prvků umí
  trať. Postavit klon a přesun v jednom vydání bez toho filtru znamená dát
  staviteli do ruky tři klepnutí, kterými tiše přepíše doklad o trati,
  podle které se už jelo.

## Co čeká na Filipa

1. ~~Jede se na Orlíku na kola?~~ **Odpovězeno 21. 11. 2026: většinou
   se jede jedno kolo, tedy každý prvek jednou.** Padla tím ta větev,
   kterou konzilium označilo za neškodnou: *značky* a *průjezdy* jsou
   v tomhle případě **tentýž seznam**, takže bod 3 platí dál a nic
   nemění. Je to zároveň doklad, že ten způsob rozhodování byl správný —
   obor vybral možnost, která je v jedné větvi správná a v druhé
   neškodná, místo aby čekal na odpověď.

   **Co z toho plyne.** Dva dovětky přestávají být denní realitou
   a zůstávají jako pojistka, protože model opakování pořád umožňuje
   a trať skládaná v kanceláři ho vyrobit může: `2×` u jména a zákaz
   mazání u značky se dvěma průjezdy (bod 9). **Mazání je tím na běžné
   trati vždycky jednoznačné**, což bere váhu i nesouhlasu 5-jachtara —
   jeho argument stál právě na té dvojznačnosti. A rozpočet řádků sedí
   s rezervou: čtyři až šest značek proti osmi, které se při rozteči 64
   vejdou, takže rolování zůstává pojistkou proti ustřižení, ne běžným
   stavem.
2. **Dostává stavitel azimut a vzdálenost rádiem, nebo rozhoduje sám?**
   Mění to směr toku, ne místo: appka ta čísla buď ukazuje, nebo přijímá.
3. **Kdo zakládá trať pro druhou rozjížďku** — kancelář, nebo stavitel
   z vody? Obě odpovědi jsou v praxi vidět.
4. **Smí pomocník nahlásit hotovo?** `Pomocnik.cs:155–158` to nechává
   výslovně nerozhodnuté a maketa rozhodla za něj.
5. **Kolik fotek se vejde do dne?** Dvě na značku při dvaceti je čtyřicet
   spuštění fotoaparátu.
