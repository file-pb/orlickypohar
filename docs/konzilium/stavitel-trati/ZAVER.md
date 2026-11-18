# Závěr konzilia nad stavitelem trati (17. 11. 2026)

Pět oborů, tři kola, 1 600 řádků posudků. Tohle je, co z toho platí.
Nesouhlas je zapsaný, ne zahlazený; kde nevyšla shoda, rozhodl moderátor
a je to u toho napsané.

**Podklady:** `NAVRH.md` a makety v `navrh/`, `ZADANI.md`, posudky
`<obor>-kolo{1,2,3}.md`, zadání kol `KOLO2.md` a `KOLO3.md`.

**Nejdůležitější věta celého běhu nepatří návrhu.** Tři nálezy míří na živý
kód a platí bez ohledu na to, jestli se přepracování postaví: dva terče
dnešní obrazovky nedrží 44 pt a kontrola to nevidí, Odskok nejde postavit,
a appka pouští ke stavbě i toho, komu ji server odmítne. Jsou to body 6, 7
a 8.

## Co se v návrhu mění

### 1. Pípnutí je první a trvale dostupná akce — přijato celé

Hlavní teze návrhu prošla bez jediné námitky. **Shoda všech pěti oborů**
(kolo 1, krediováno každým zvlášť): poloha je jediný vstup s platností
čtyř vteřin (`poloha.ts:40`), všechno ostatní počká. 1-ergonomie to
změřila: otočná levobokem je dnes čtyři klepnutí a to kritické je třetí;
po změně dvě a kritické je první — **−50 % na nejčastějším prvku**.

Tlačítko dostává **pevné místo** v dolním pruhu. Dnes leží v `ScrollView`
za bannery a předvolbami, takže se jeho horní hrana pohybuje o víc než
200 pt podle stavu — a pohyblivý hlavní terč neumí vybudovat návyk, který
je v rukavicích tím, co člověk má místo miření.

### 2. „Popíšu potom" padá celé — hlasování 3 : 1

**Nejdražší kus návrhu neprošel.** Hlasovali 1, 3, 7, 9; pro zrušení
1-ergonomie, 7-psycholog a 9-rizika, proti 3-ux.

Rozhodl důvod, který padl až v posledním kole: **odklad neušetří ani jedno
klepnutí.** Popis je jedno klepnutí a to klepnutí **má čas** — poloha je
uložená, čtyři vteřiny doběhly. U brány je to v obou případech
pípni → typ → pípni → varianta; odklad jen posouvá čtvrté klepnutí za druhé
pípnutí a kupuje za to **návrat** do seznamu, tedy nejdražší pohyb, jaký
ergonomie měří.

K tomu tvrdá překážka v kódu: **bez varianty se body nedají pojmenovat.**
`jmenaBodu` je počítá z `volba.jmena` a u dvoubodových se liší právě
variantou — „brána 3" proti „linie 3" (`stavba-prvku.ts:265`, `:273`,
`:281`). Řádek fronty přitom žádá `nazev` u každého bodu a modul sám píše,
že *„jméno se po zápisu nepřepisuje, protože záznam značky je měření"*.
Odložená varianta je tedy buď zástupné jméno v měření, nebo přepis jména po
zápisu — obojí zakázané.

**Dva obory během toho změnily pozici proti kolu 2** (7 a 9), 3-ux naopak
obrátil opačným směrem a zůstal sám. Jeho argument je zapsaný níž.

**Z nálezu 1 návrhu zůstává to podstatné:** pípnutí patří před otázky uvnitř
jednoho prvku. Padá jen věta *„a i na to se dá odpovědět později"*.

**Podmínka tří hlasů je splněná** (odpověď Filipa, 17. 11. 2026): trať se
dohodne s organizátorem **ústně ten den**, u některých regat se navíc obecně
ví, co se asi pojede. Prvky jsou tedy známé dřív, než motorák odrazí — popis
po pípnutí je **vybavení** toho, co bylo ujednáno před chvílí, ne rozhodování
na vodě podle větru. Hlasy 1, 7 a 9 platí tak, jak jsou zapsané, odklad
popisu padá a vlastní tabulka pro nepopsané pípnutí se nestaví.

**Co ta odpověď otevřela a co rozhodnutí není.** Ujednání žije **jen v hlavě**
stavitele; v appce o něm není nic. Kritérium 7-psychologa — *„zátěž je ta, ke
které se člověk musí vrátit sám a bez vodítka"* — tedy míří na ranní dohodu
stejně jako na odložený popis: popsat prvek hned znamená popsat ho, dokud si
ho stavitel pamatuje. Druhý směr, totiž zapsat ujednanou trať do appky na
břehu a na vodě ji jen potvrzovat, konzilium neposuzovalo a tenhle závěr ho
**nerozhoduje** — je to zaznamenaný podnět, ne bod ke stavbě.

### 3. Seznam má osm řádků, ne sedm — jednomyslně, a rozhodl kód

Hlasovali 1, 2, 3 — **všichni pro osm**. Byla to věcná otázka, ne vkus:
nese *Průjezdní* stranu jako zapsaný údaj?

Nese. `VOLBY.jedna` má `PrujezdniBoje` dvakrát, se `strana: "PoLeve"`
a `"PoPrave"`, s vlastním jménem i stopou (`stavba-prvku.ts:241–256`), a
server to hlídá: `StranaPatri` jmenuje `PrujezdniBoje` vedle otočné
(`PrvekTrati.cs:283–284`) a odmítne stranu u typu, kam nepatří. Sedm řádků
by tedy mazalo údaj, který server ukládá — a sloučení *po levoboku* a *po
pravoboku* do jedné *Průjezdní* by bylo jediné nepravdivé místo seznamu.

**Výsledný tvar:** otočná levobokem · otočná pravobokem · průjezdní
levobokem · průjezdní pravobokem · brána · odskok · start · cíl. Doptání
na variantu zůstává u **brány, startu a odskoku** — u odskoku proto, že
`StranaPatri` jmenuje i jeho, což našla 1-ergonomie až v posledním kole.

**Měření:** osm řádků po 56 pt s mezerou 12 dp dává 780 až 795 pt na 844pt
obrazovce; měřili nezávisle 1-ergonomie a 2-design a došli k témuž.
**Neroluje** — a to je podmínka, ne pohodlí: rolování je v rukavicích
nejhorší možná interakce a nechtěné klepnutí během něj zapíše prvek.
Devátý řádek se při 12 dp nevejde (875 pt), proto doptání u odskoku.

2-design k tomu přidal pořadí prací: **nejdřív pryč s rámem u voleb**
(za 1,26:1 je neviditelný a nic nestojí ho zrušit), mezera 12 dp je až
druhá.

### 4. Stav polohy nese trvale slovo, číslo jen u akce

Spor, který se vyřešil sám: 2-design i 7-psycholog došli nezávisle k témuž
a každý ustoupil tomu druhému v tom, co měl slabší.

Proužek drží **tři slovní stavy** — a musí to být věty z `posud`
(`poloha.ts:67–101`), které kromě závady říkají, co udělat. Živé číslo
z proužku mizí: na ±4 → ±7 → ±11 stavitel neodpoví ničím než čekáním,
a protože se hýbe, pozornost si ho vybere. Číslo patří k akci a do detailu
prvku.

**Hystereze 25 → 20** (7-psycholog): slovo blikající kolem
`PRESNOST_K_ZAMYSLENI_M` krade pozornost stejně jako číslo a čte se jako
nejistota nástroje.

**Číslo u tlačítka nesmí skončit na té modré ploše ztlumené** (2-design,
měřeno): bílá na `light.voda` při 72 % krytí dává **3,79:1**, tedy pod mez.
Patří nad tlačítko na `pozadi`, kde `tlumeny` drží 5,60:1.

### 5. Tečka u stavu polohy — moderátorské rozhodnutí, ne shoda

**2-design a 1-ergonomie si vyměnili pozice.** Design v kole 1 chtěl, aby
tečka nesla **znak**, a podložil to měřením: `vystraha` a `stavZruseny`
mají mezi sebou 1,09:1, **při protanopii 1,00:1**, a ve světlé sadě
neexistuje token, který by to spravil. Ergonomie v kole 2 znak přijala.
Design mezitím ustoupil ergonomii, znak **zrušil** (po uzavření bodu 4 nese
stav slovo) a navrhl třetí věc — **siluetu**. Nikdo nedržel, co obhajoval.

Proto rozhodl moderátor: **silueta — plný disk, kroužek 3 dp, kroužek
s diagonálou —, 20 dp, odstín jako druhý kanál, slovo v proužku jako
první.** Splní měření designu, nečte se jako znak (námitka ergonomie)
a 7-psycholog u velikosti nerozhodoval.

Je to **syntéza, ne shoda**: posoudili ji každý zvlášť, dohromady ne.
7-psycholog k ní připojil podmínku, kterou beru: **ty tři tvary se už nikdy
nesmějí změnit ani prohodit** — celá jejich hodnota je v tom, že se poznají
bez čtení, a to je naučený návyk.

### 6. Karta zádrhelu: klasifikace odmítnutí, dvě fáze, nepohnutý terč

Nejvíc se tu posunulo tím, že 9-rizika ukázala, že **většina sporu zmizí
klasifikací**. Dnes `posliZaSebe` označí jako `OdmitnutoServerem` každý
ne-ok stav kromě 401 (`api.ts:155–169`), takže 403, 404, 500 i **502 od
Traefiku při nasazení během závodního dne** vypadají jako trvalé odmítnutí
platného prvku — a jediná nabízená cesta ven maže nenahraditelné měření.

**Platí:** odmítnutí se dělí na **vadu prvku** (400 s větou pravidla)
a **vadu okolností** (404, 5xx). U druhé třídy se karta vůbec neukáže —
zůstane pruh „zkouším znovu, naposledy v …" a fronta se rozjede sama.
*Zkusit znovu* stojí nad *Zahodit*, obojí obrysové; jediná plná barevná
plocha na obrazovce zůstává pípnutí.

**Potvrzení u zahození: hlasování 2 : 1 pro nepohnutý terč** (1, 9 proti 7),
ale **všichni tři se shodli na prodlevě**. Druhá fáze téhož tlačítka,
terč se nepohne, přijme klepnutí teprve po ~300–500 ms, po pěti vteřinách
se vrátí zpět. Prodleva zabrání dvojklepu z houpnutí lodi, aniž by někoho
nutila mířit.

*Zahodit celou frontu jedním klepnutím* (návrh 3-ux z kola 1) **neprošlo**:
je to nejnevratnější úkon, jaký na obrazovce může být.

### 7. Vzdálenost u brány: jeden stupeň se znakem směru

Všechny tři obory, které se k tomu vyjádřily, chválily nález návrhu a
opravily jeho typografii. **`↑ 63 m`** v jednom stupni (34 dp/800); slovní
„roste" zrušit, protože směr změny je to jediné, co se v pohybu čte, a byl
v maketě 14 dp v `tlumeny`. Pod `NEJKRATSI_LINIE_M` = 5 (`stavba-prvku.ts:490`)
k číslu věta, že z toho linie nevyjde.

## Co se nemění

- **Atomický zápis prvku a tvar API.** Nikdo proti němu nic neměl.
- **Odmítnutý prvek zastaví frontu celou.** Potvrzeno jako správné.
- **Meze 44 pt** — ale viz bod 8, dnes neplatí.
- **Server zůstává autoritou.** 9-rizika výslovně odmítla, aby server věděl
  o polotovarech: *„polotovar bez typu by znamenal nový stav v autoritě na
  pravidla."*
- **Žádná nová nativní závislost.** Nikdo ji nenavrhl.

## Co platí o živém kódu, ať se návrh postaví, nebo ne

### 8. Dva terče nedrží 44 pt a kontrola je slepá

`chip` má ≈ **39,5 pt** a `zahodit` ≈ **40,7 pt** (1-ergonomie, měřeno
z deklarací a výšky řádku). `kontrola-dotyku.py` obojí pustí, protože
každému řádku textu připisuje paušálních 20 pt (`:61`, `:179`) bez ohledu
na velikost písma.

**Moderátor to přiznává jako vlastní chybu:** 16. 11. jsem opravil 36 pt
na „44" podle téhož skriptu a napsal to do `ZKOUSKA-STAVITELE.md` jako
hotovou věc. **Obě čísla byla čísla skriptu**, vykreslené je 39,5.

### 9. Odskok dnes nelze postavit — a je to v obou klientech

`TYPY` má u Odskoku dva body, ale `jak: "jedna"` (`stavba-prvku.ts:202–211`),
takže průvodce nabídne jednobodové předpisy a uloží `OtocnaBoje` se dvěma
body — kombinaci, kterou `dvaBody` vylučuje. Pět klepnutí skončí prvkem,
který zastaví frontu. **Tutéž řádku má web** (`…/boje/[zavod]/stavba.tsx:293`).
Komentář u `stopaProPrvek` přitom tvrdí, že se odskok *„uloží jako vlastní
typ"* — zapsaný úmysl, který kód neplní.

**Důsledek, který 1-ergonomie pojmenovala:** `packages/stavba/` se musí
otevřít tak jako tak. Cena, kterou návrh označil za svůj nejdražší bod, je
splatná, i kdyby se nesloučilo nic.

### 10. Appka pouští ke stavbě i toho, komu ji server odmítne

`veliNekde` se ptá *„velí ten člověk někde"* (`role.ts:26–28`), server se
ptá na rozsah **konkrétní zastávky** (`TratEndpoints.cs:537–540`). Pořadatel
Radavské regaty tedy vidí kartu *Stavba trati* na cizí zastávce, pípá celou
trať a dozví se to až z odmítnutého prvku — a pak stojí fronta a každý prvek
se musí zahodit zvlášť.

**A není to budoucí problém.** Zaškrtnout jako pomocníka jde jen toho, kdo
je pořadatelem některé zastávky ročníku (`Pomocnik.cs:140–143`), takže
`VELI` ho pustí a **každý dnešní pomocník z K8 to má přesně takhle**.

Řešení je v repozitáři už jednou rozhodnuté — u zápisu výsledků posílá
server příznak na konkrétní zastávku (`VysledkyEndpoints.cs:698–704`).
Stavba potřebuje **vlastní** příznak, ne použití hotového, a **nesmí viset
na `GET …/trat`**: ten vrací 404, dokud regata nemá ani jednu bóji, tedy
by chyběl přesně u prvního prvku trati. Patří do `/ja`, rozšířeného o
zastávky, kde je ten člověk zaškrtnutý jako pomocník.

### 11. Pomocníkovi se stavba nesmí otevřít bez vlastního predikátu

Podmínka, kterou vznesla 9-rizika a potvrdily 3-ux i moderátor. `StaviAsync`
kryje celou skupinu `MapSpravu` — tedy i `DELETE /{trat}`,
`DELETE /prvky/{prvek}` a `/prestavba`. Přidat tam pomocníka znamená, že
člověk, který přijel na jednu regatu vypomoct, smí smazat prvky a zahodit
trať. To je přesně ta chyba, kvůli které pomocník vznikl jako **příznak,
ne role**.

**Tvar:** čistá funkce `Pomocnici.SmiStavet(poradatel, pomocnik, rozhodci)`
vedle `SmiUVody` (testovatelná bez databáze, a appka potřebuje tutéž
odpověď), sběr dat v `TratEndpoints` po vzoru `SmiUVodyAsync`. Shoda 3-ux
a 9-rizika.

**Kořen je hlubší, než se zdálo** (9-rizika): `RozsahAsync` má
`bool jenRozhodci = false` (`TratEndpoints.cs:524`), takže se `DELETE /{trat}`
a `/prestavba` dostaly pod nejširší predikát **mlčením, ne rozhodnutím**.
Rozsah se proto musí u každé cesty vybírat jmenovitě výčtem.

## Co čeká na Filipa

Pět otázek, které konzilium rozhodnout nemůže, protože jsou to tvoje pravidla.
**První odpovězena 17. 11. 2026, zbytek 18. 11.; otevřená zůstává pátá.**
Pátá je od 18. 11. 2026 vedená ve `FRONTA.md`, skupina C, aby se nehledala
tady; rozhodnutí se zapisuje sem.

1. **Staví se trať podle předem nakresleného plánu, nebo se o prvcích
   rozhoduje až na vodě podle větru?** — **Odpovězeno 17. 11. 2026:** ústní
   dohoda s organizátorem ten den, u některých regat navíc obecné povědomí,
   co se asi pojede. Ani jedna z nabídnutých možností: plán je, ale není
   nakreslený. **Bod 2 tím platí celý**, odklad popisu padá a vlastní
   tabulka se nestaví; podrobně v bodu 2.
2. **Jede telefon ráno na vodě v tmavém režimu?** — **Odpovězeno 18. 11.
   2026: ano, počítat s tmavým.** Celá tmavá polovina posudku 2-designu tedy
   platí a kontrast se hlídá v obou odrudách.
3. **Mají barvy bójí na Orlíku skutečný význam** (žlutá otočná, červený
   a modrý konec brány)? — **Odpovězeno 18. 11. 2026: mají.** Potřebují proto
   **vlastní tokeny**: dnes si půjčují `pripravaZnameni` a `stavZruseny`, tedy
   barvu znamení a zrušené rozjížďky, a změna kterékoliv z nich by přebarvila
   bóje na vodě. Spolu s bodem 2 to znamená tokeny ve světlé i tmavé odrudě.
4. **Kormidluje a pípá tentýž člověk, nebo jsou na motoráku dva?** —
   **Odpovězeno 18. 11. 2026: jeden člověk.** Platí tedy přísnější zadání:
   jedna ruka na kormidle, druhá na telefonu, loď se hýbe. Dotyková mez
   a počet kroků průvodce se podle toho neuvolňují.
5. **Kolik z osmi kombinací se za sezónu reálně postaví?** Pořadí voleb má
   být podle četnosti a pevně zadrátované — bez čísel ho seřadím odhadem.
   **Zůstává otevřená.**

Šestá otázka je od 9-rizik a není o stavbě: **má `posud` dál pouštět celé
Česko**, když ani jedna kontrola nepozná bránu položenou mimo přehradu? —
**Odpovězeno 18. 11. 2026: ano, meze zůstávají na Česku.** Hlídají překlep
v souřadnici, ne území; prvek daleko od přehrady pozná stavitel na mapě.

## Co se při stavbě zapomene první

Každý obor dostal jednu větu na to, co není sporné, a proto nemá vlastní bod.

- **1-ergonomie:** **`kontrola-dotyku.py` musí číst `fontSize`**, ne
  připisovat paušálních 20 pt na řádek — jinak `minHeight: 44` spraví tyhle
  dva terče a příští se 13dp písmem projde znovu. A rozšířit kontrolu
  znamená rozšířit její sabotáž: `Pressable` s `fontSize: 13`
  a `paddingVertical: 12` musí nově spadnout. `vyska()` navíc nehlídá šířku
  terče nikdy.
- **2-design:** **`app/testy/kontrast.test.ts` se musí rozšířit** o páry,
  které stavitel zavádí, protože dnes měří jen proužky znamení na panelu
  odpočtu — návrat bílé napevno na modré ploše (2,35:1 v tmavé sadě) by CI
  nechytila. Obrys *Zkusit znovu* patří do tokenu `text`, ne do `voda`:
  přerušovaný `voda` už znamená „tady chybí značka".
- **3-ux:** **pomocník vidí kartu na cizí zastávce už dnes** (bod 10), a
  příznak `smiStavet` nesmí viset na `GET …/trat`, který vrací 404, dokud
  regata nemá ani jednu bóji.
- **7-psycholog:** **tři slovní stavy musí být věty z `posud`**, které kromě
  závady říkají, co udělat — stav, který jen pojmenuje potíž, přesouvá vinu
  na člověka. A pruh „zkouším znovu" musí ukazovat, kdy to zkoušel naposled;
  mlčící nástroj se čte jako mrtvý a vede k té jediné nevratné akci.
- **9-rizika:** **rozsah se musí u každé cesty vybírat jmenovitě** —
  `bool jenRozhodci = false` znamená, že příští přidaný endpoint zdědí
  nejširší práva a nikdo si toho nevšimne. A vznikne-li přesto nepopsaný
  řádek ve frontě, musí ho `prvniKOdeslani` vyloučit dřív, než odešle.

## Zapsané nesouhlasy

- **3-ux k bodu 2:** hlasoval jediný pro zachování odkladu varianty a jeho
  argument stojí: varianta se odpovídá **za jízdy mezi konci**, tedy
  v jediné chvíli celého toku, kdy staviteli nic nemizí a neplave vedle něj
  objekt ve vodě. Přehlasován 3 : 1; rozhodlo, že odklad neušetří žádné
  klepnutí a že bez varianty nejdou pojmenovat body.
- **9-rizika k úložišti:** upozornila, že zadání kola 3 zapsalo mezi
  uzavřené body *„řádek ve frontě, ne vlastní tabulka"* — tedy variantu, od
  které její autor (3-ux) v kole 2 s doložením ustoupil, protože
  `fronta.vstup` je `NOT NULL` a drží hotový `PrvekKPostaveni`. **Moderátor
  výhradu uznává jako oprávněnou.** Je bezpředmětná, dokud platí bod 2
  (neukládá se nic), ale **vynutila-li by odpověď na otázku 1 odklad, platí
  vlastní tabulka**, ne řádek ve frontě. Odpověď z 17. 11. 2026 odklad
  nevynutila, takže výhrada zůstává bezpředmětná — a zapsaná pro případ, že
  se odklad někdy vrátí.
- **7-psycholog k bodu 6:** **403 se nesmí schovat do „zkouším znovu".**
  U 5xx je tiché opakování správné, mizí samy; 403 samo nezmizí a podle
  bodu 10 je to běžný stav, ne porucha. Tiché opakování by znamenalo, že
  stavitel postaví celou trať, nedozví se nic a odjede od vody
  s přesvědčením, že je hotovo. **Moderátor to bere:** 403 nese vlastní
  větu, nebo musí bod 10 platit dřív, než klasifikace začne mlčet.
  Proto je 403 v bodu 6 vypuštěno z výčtu „vad okolností".
- **7-psycholog k odemčení přijaté trati:** to právo na motoráku nemá být
  vůbec; kdo odemčení potřebuje, sedí u počítače. Potvrzení je podle něj až
  druhá nejlepší odpověď. Nerozhodnuto — souvisí s otázkou, kterou nikdo
  nepoložil Filipovi.
