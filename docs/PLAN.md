# Orlický pohár — plán

Pilotní projekt platformy. Seriál závodů plachetnic na Orlíku: web, veřejné
výsledky, administrace a mobilní přístup.

**Jméno projektu:** `orlickypohar` → `orlickypohar.klihovka.cz`
(bez pomlčky a podtržítka — jméno slouží zároveň jako databáze, role i subdoména).

**Stav k 8. 9. 2026: fáze 1 nasazená, fáze 2 hotová.**

| | |
|---|---|
| `orlickypohar.klihovka.cz` | veřejný web (Next.js), běží |
| `orlickypohar-api.klihovka.cz` | API, běží |
| V databázi | vymyšlený ročník 2025 — 16 lodí, 10 závodů, 334 výsledků |
| Publikováno | **ne**, proto web hlásí „zatím žádný ročník" |
| Nasazení | automatické: push do `main` → build → háček → server |

Bodovací pravidla jsou rozluštěná ze skutečných tabulek rozhodčího a ověřená
proti výsledkové listině závodu (viz *Co říkají skutečná data*). Otevřená
zůstává jediná otázka — bonus u 24hodinovky.

---

## Proč zrovna tenhle projekt jako první

Není to nejmenší možný projekt, ale je to **dobrý test platformy**, protože
poprvé narazí na věci, které telemetrie neřeší: skuteční uživatelé, role,
schvalovací proces a veřejný obsah. Tedy přesně to, kde se pozná, jestli je
platforma použitelná, nebo jen postavená.

## Doménový model

Upřesněno podle Filipových odpovědí 6. 9. 2026.

```
Serie (Orlický pohár 2026)
 ├── Kategorie          Race / Nad7m / Pod7m — konfigurovatelné
 ├── Prihlaska          loď + kategorie na CELÝ ROČNÍK  ← nositel bodů
 └── Zavod              jedno z ~12 zastavení, vlastní typ a bodování
      ├── Ucast         která loď na tenhle závod přijela, s kým za kormidlem
      └── Rozjizdka
           └── Vysledek  účast × rozjížďka
```

**Loď jede celý rok v jedné kategorii**, takže kategorie patří k celoroční
přihlášce, ne k jednotlivému závodu. Body v seriálu sbírá **loď**, ve
výsledcích se vedle ní uvádí jméno majitele.

Účast na jednotlivém závodě je pořád potřeba — loď nejede všech dvanáct
zastavení a kormidelník se mezi závody mění. Ale kategorii už nenese.

### Entity

| Entita | K čemu | Poznámka |
|---|---|---|
| `Serie` | ročník poháru | |
| `Kategorie` | Race / Nad7m / Pod7m | patří sérii, dá se přidat i přejmenovat |
| `Lod` | loď | jméno, číslo plachty, typ, **majitel** (odkaz na osobu) |
| `Osoba` | závodník, majitel, rozhodčí | |
| `Prihlaska` | loď do ročníku, v jedné kategorii | **nositel bodů v seriálu** |
| `Zavod` | jedno zastavení | pořadatel, datum, typ, pravidla bodování |
| `Ucast` | loď na konkrétním závodě | kormidelník a posádka pro ten závod |
| `Rozjizdka` | jedna rozjížďka závodu | číslo, čas startu, stav |
| `Vysledek` | účast v rozjížďce | pořadí, časy, kód, body |
| `Clanek` | blog série i jednotlivých závodů | |
| `Zarizeni` | push token, platforma, odběry | veřejný odběr bez přihlášení |
| `Osoba.UserId` | volitelné napojení na účet | většina osob účet mít nebude |
| `Trasa` | metadata trasy lodi v závodě | body samotné leží v R2, ne v databázi |

## Bodování ve dvou úrovních

Závody nejsou stejné — jsou vytrvalostní, okruhové, na 4,5 hodiny, každý
má své jméno a svá pravidla. U okruhových se škrtá jedna rozjížďka,
u Izolepy se do poháru počítá jen jedna. **Na tohle nepotřebujeme engine.**

Jsou to dvě oddělené otázky a každá má odpověď v datech, ne v kódu:

### 1. Rozjížďky → výsledek závodu

| Pole na `Zavod` | Co znamená | Příklad |
|---|---|---|
| `PocetSkrtu` | kolik nejhorších rozjížděk se škrtá | okruhový se čtyřmi a více: `1`, jinak `0` |
| `Vyhodnoceni` | `CelePole` nebo `PoKategoriich` | 24 h: `CelePole` |

**Pravidlo pro škrt:** okruhový závod, který odjel **čtyři a více rozjížděk**,
škrtá jeden nejhorší výsledek. Se třemi a méně se neškrtá nic.

Počet rozjížděk se ale rozhoduje **na vodě podle větru**, ne při vypisování
závodu. Škrt proto nejde nastavit dopředu — hodnota se odvodí, teprve až je
jasné, kolik se jich odjelo. Aplikace ji předvyplní podle pravidla a rozhodčí
ji smí přepsat; uloženo zůstává číslo na závodě, protože ono je tou pravdou.

### 2. Výsledek závodu → body do seriálu

| Pole na `Zavod` | Co znamená | Příklad |
|---|---|---|
| `Rozjizdka.DoSerie` | počítá se tahle rozjížďka do poháru? | Izolepa: jen některé |
| `KoeficientDoSerie` | váha závodu v seriálu | běžně `1.0` |

**Příznak je na rozjížďce, ne počet na závodě.** Původně tu stálo
`PocetRozjizdekDoSerie` a bylo to špatně: rozhoduje se, **které** rozjížďky
se počítají, a posuzuje se to na vodě podle podmínek. Číslo „jedna" neřekne,
jestli je to první, poslední, nebo nejlepší.

Izolepa je fun závod, kde je část rozjížděk **mimo vodu** — třeba běh pro
míčky z kopce. Je to schválně: zamíchá pořadím a vnese do závodu prvek
nezávislý na výkonnosti lodi. Do závodu se počítá, do poháru nesmí — a to
počtem vyjádřit nejde vůbec.

Pro model je běh pro míčky pořadí jako každé jiné. Rozjížďka nemusí být plavba.

**Do seriálu se boduje vždycky po kategoriích**, i když se závod vyhodnocoval
jako celé pole. Potvrzeno na 24hodinovce ročníku 2026: závod se jede jako
jeden celek, ale v seriálové tabulce má každá ze tří kategorií vlastní řadu
začínající u vítěze. U 24hodinovky se tedy zveřejní jedno pořadí přes všechny lodě,
ale do poháru se z něj vytáhne pořadí uvnitř kategorie: když v `Nad7m` skončily
lodě celkově třetí, sedmá a devátá, do seriálu jdou jako první, druhá a třetí.

Proto má seriál **tři průběžná pořadí, ne jedno** — jedno na kategorii.

### Co je pravda a co se dopočítává

V `Vysledek` se ukládá jen to, co se skutečně stalo: **pořadí v cíli, časy
a kód**. Body se **počítají**, neukládají jako pravda.

Je to schválně. Pravidla se mění mezi ročníky, škrty se doladí až podle
loňských dat a přepočet celého seriálu musí jít kdykoliv spustit znovu.
Kdyby byly body uložené jako fakt, každá změna pravidla by znamenala
migraci dat místo přepočtu.

Tři čísla na závodě pokrývají všechny tři příklady, které jsi uvedl. Kdyby
někdy přišel závod se **skutečně jiným vzorcem**, přibude jedna funkce —
až tehdy, ne teď. Tohle je přesně to místo, kde se lidem rodí pravidlové
enginy, a je to špatně: engine se píše dřív, než je známo, co má počítat.

### Nízkobodový systém — dvě různé stupnice

Ověřeno proti výsledkové listině FxCK Cancer regaty 2026 a proti seriálové
tabulce téhož ročníku. Sedí na každém řádku obou kategorií.

**V závodě: vítěz má 1 bod.** Loď dostane v každé rozjížďce **pořadí ve své
kategorii** a body závodu jsou jejich součet. Sea Mouse III byla v obou
rozjížďkách první v RACE → 1 + 1 = 2 body a celkové vítězství.

**Kódy mají pořadí mezi sebou.** Za dokončivšími následuje `DNF` — loď, která
startovala a odstoupila — a teprve za ním `DNS`, která vůbec nevyjela.

V první rozjížďce nad 7 m má Caprice `DNF` a dostává 13, Thea `DNS` a dostává
14. Ve druhé rozjížďce žádný `DNF` nebyl, takže všechny tři lodě s `DNS`
spadly shodně na 12. Není to tedy pevné „+1" ani „+2": je to **další místo
v řadě za posledním, kdo dojel**, a kódy se do té řady staví v pořadí podle
závažnosti.

Caprice má proto za závod 13 + 12 = 25 bodů — každá rozjížďka se počítá zvlášť.

**Do seriálu: vítěz má 0 bodů.** Do ročníkové tabulky nejde součet bodů
závodu, ale **pořadí v kategorii mínus jedna**. V kategorii nad 7 m skončila
Mamba první a v seriálu má za tenhle závod 0, Pezi druhá má 1, Depresso
šesté má 5. Kdo nestartoval, dostává (počet dokončivších + 1) − 1, tedy 13
při třinácti lodích.

**Proč to takhle je:** obě stupnice vznikly nezávisle a obě jsou nízkobodové,
jen jedna počítá od jedné a druhá od nuly. Kdo to naprogramuje jako jedno
pravidlo, dostane všude posun o jedničku — a ten se v seriálu projeví až
u lodí se stejným součtem.

**Kódy** v praxi: `DNF` a `DNS` jsou vidět přímo ve výsledkové listině.

Kódy, bez kterých se výsledky nedají zadat: `DNF` (nedokončil), `DNS`
(nestartoval), `DNC` (nezúčastnil se), `OCS` (předčasný start), `DSQ`
(diskvalifikace), `RET` (odstoupil), `RDG` (náprava).

Tohle je jediné místo projektu, kde na správnosti opravdu záleží — špatně
spočítané pořadí je viditelná ostuda. Píše se to jako **čisté funkce
s testy**, ne rozeseté po endpointech.

## Handicap

Dnes se jede bez přepočtu (line honours) ve třech kategoriích. Yardstick
nebo ORC můžou přijít.

**Neděláme na to engine.** Do přihlášky přijde `HandicapKoeficient`, do
série údaj, jaký systém se používá, a přepočet je jedna funkce na systém.
Druhá vznikne, až druhý systém skutečně nastane — ne dřív.

## Životní cyklus zastávky

Ročník nezačíná závody, ale **předběžným kalendářem**. Teprve pak pořadatel
závod vypíše, a nakonec se odjede — nebo zruší, nebo přesune.

| Stav | Kdo do něj dostane | Co znamená |
|---|---|---|
| `Planovany` | rozhodčí | termín v předběžném kalendáři, nic víc |
| `Potvrzeny` | rozhodčí | **termín je jistý.** Pořadatel ještě závod nevypsal |
| `Vypsany` | organizátor | vypsání závodu a plachetní směrnice; přihlášky se potvrzují |
| `Odjety` | organizátor | proběhl; teprve tenhle stav dává výsledkům smysl |
| `Zruseny` | rozhodčí | nekonal se, do poháru se nepočítá vůbec |

**`Potvrzeny` přibyl podle Filipova zadání 9. 9. 2026.** Je to rozdíl, který
závodník potřebuje a kalendář ho dosud neumel říct: „počítáme s tímhle
termínem, ale ještě si neberte dovolenou" versus „termín platí". Bez něj by
se muselo čekat s celým kalendářem na vypsání prvního závodu, nebo tvrdit
o nejistém termínu, že je vypsaný.

**Přesun není stav.** Přesunutá zastávka je pořád plánovaná, jen jindy —
zůstává po ní jen `PuvodniDatum`, protože termín, na který se lidé chystali,
nemá smysl zahodit.

Bez těchhle stavů se nedá rozlišit „zastávka, která teprve bude" od
„zastávky, která se nekonala". V sešitu rozhodčího je ten rozdíl vidět
a stojí za otázku: nadcházející zastávky (O pohár Vltavy, Pohár Slunce) mají
sloupec **prázdný**, kdežto Radavská a Vánoční regata mají u všech lodí
**nuly**. Co ty nuly znamenají, zatím nevíme.

## Průběh závodu

Zastávka není jen datum a výsledky — má den, který někde začíná a někam
spěje. Filip, 8. 9. 2026:

| Krok | Co to je |
|---|---|
| **Rozprava** | sraz kormidelníků před závodem; pořadatel řekne, co se pojede |
| **Startovní procedura rozjížďky** | vyzývací a přípravné znamení, pak start |
| Rozjížďka | jede se |
| Cíl | lodě projíždějí cílem, zapisuje se pořadí |
| Vyhlášení | výsledky a ceny |

**Pro model to skoro nic neznamená, pro upozornění všechno.** Rozjížďka už
má `StartV`; startovní procedura je čas před ním, ne vlastní záznam — počítá
se, neukládá. Přibude nanejvýš čas rozpravy na závodě, a to teprve až bude
co zobrazovat.

Zato je to **první konkrétní obsah pro push z fáze 7**: rozprava za deset
minut, startovní procedura třetí rozjížďky běží, start odložen. Do té doby,
než appka existuje, je průběh věc vývěsky na břehu a do webu nepatří —
zpráva, která dorazí pozdě, je horší než žádná.

## Penalizace a protesty

Filipovo zadání: penalizace se budou evidovat a protesty taky. Pro Orlickou
sérii je to novinka, takže se hledá vzor.

**Vzor existuje a je světový** — Závodní pravidla jachtingu (World Sailing),
vydání 2025–2028. Nevymýšlí se tu nic vlastního; čísla pravidel ale ověř
proti aktuálnímu vydání, mezi vydáními se posouvají.

### Tři různé věci, které se snadno slijí do jedné

| Věc | Kdy vzniká | Co dělá s výsledkem |
|---|---|---|
| **Trest odjetý na vodě** | loď se přizná hned a udělá otočky | **nic** — trest je vykonaný, loď dojede normálně |
| **Trest z rozhodnutí** | protestní komise po projednání | změní výsledek: `DSQ`, nebo bodová penalizace |
| **Náprava** | komise uzná, že loď poškodil někdo jiný | `RDG` a **náhradní body** místo dojetého pořadí |

Tohle je celé jádro. Kdo to naprogramuje jako jeden „trest", dostane model,
ve kterém se otočky na vodě evidují (zbytečně) a náprava se nedá zapsat
(protože nemá pořadí ani prostý kód).

### Co náš model už umí a co ne

**Umí:** tresty, které se projeví jako kód. `Vysledek.Kod` je přesně na to
a `DSQ`, `OCS`, `RET`, `RDG` v číselníku jsou. Chybí jen další kódy ze
standardu — `DNE` (diskvalifikace nezahrnutá do škrtů), `UFD` a `BFD`
(vlajkové starty), `ZFP` (dvacetiprocentní penalizace). Je to řádek do
výčtu, ne změna modelu.

**Neumí dvě věci:**

1. **Kód bez čísla nestačí.** Bodová penalizace přičítá body a náprava je
   naopak přiděluje (typicky průměr z ostatních rozjížděk, nebo body podle
   pořadí, které by loď získala). Obojí potřebuje u výsledku **číslo**, ne
   jen značku. Dnes není kam ho zapsat.

   `DNE` navíc mění chování škrtu: nesmí se škrtnout. To je příznak
   u kódu, ne u výsledku.

2. **Protest je vlastní záznam s vlastním životním cyklem**, ne pole
   u výsledku. Podá ho loď nebo rozhodčí, má svůj čas podání a lhůtu, může
   být odmítnut jako neplatný dřív, než se vůbec projedná, a jedno
   rozhodnutí může potrestat i loď, která protest nepodala.

   Tvar, který standardu odpovídá:

   ```
   Protest
    ├── rozjížďka (kde se to stalo) a čas incidentu
    ├── kdo podává: loď, pořadatel, nebo protestní komise
    ├── proti komu: jedna nebo víc lodí
    ├── stav: podán → platný/neplatný → projednán → rozhodnuto → stažen
    ├── popis incidentu a dotčená pravidla
    └── rozhodnutí: zjištěné skutečnosti, závěr, a trest nebo náprava
         └── promítne se do Vysledek: kód, nebo body navíc
   ```

   **Stav se vede na protestu, ne na výsledku** — ze stejného důvodu, proč
   se workflow vede na rozjížďce a ne na jednotlivém řádku: projednává se
   incident jako celek.

### Proč to jednou bude stát za to

Filip, 8. 9. 2026: *„mají v tom bordel, ale bylo by fajn to jednou dát
dokupy, hodně lidí si stěžuje."*

To je jediný důvod, který u téhle funkce rozhoduje. **Cena není v modelu,
ale v tom, že je vidět, co se rozhodlo a proč** — kdo protestoval, jak to
komise uzavřela a podle kterého pravidla. Dneska je to ústní domluva na
břehu, a co si každý odnese, se rozchází; odtud ty stížnosti.

Plyne z toho i to, co se **nesmí** postavit: evidence, do které se zapíše
jen výsledek trestu. Tím by se z nepřehledného procesu stal nepřehledný
proces se záznamem. Užitečné je zjištění skutečností, závěr a odkaz na
pravidlo — tedy přesně to, co po komisi chtějí i závodní pravidla.

Je to zároveň částečná odpověď na otázku, jestli má být protest veřejný:
když si lidé stěžují na neprůhlednost, je zveřejněné rozhodnutí ta hodnota.
Potvrdit to ale musí rozhodčí, ne my.

### Kdy to stavět

**Ne teď — jen s tím počítat.** Filipovo rozhodnutí z 8. 9. 2026. Protest
bez administrace a bez identity nemá kdo zapsat —
patří do fáze 5, kde vzniká zadávání a schvalování, a rozhodnutí komise je
přesně ten druh zápisu, u kterého musí být vidět, kdo ho udělal.

Do té doby se penalizace zapíše tak, jak se dnes zapisuje všechno ostatní:
kódem u výsledku. Rozhodnutí, které se nedá vyjádřit kódem, je ta chvíle,
kdy je potřeba číslo — a teprve tehdy má smysl migrace.

**Co potřebuje odpověď od rozhodčího dřív, než se to postaví:**

1. Vede se dnes protest vůbec písemně, nebo se řeší domluvou na břehu?
2. Používá se bodová penalizace (procentní), nebo jen diskvalifikace?
3. Jak se dnes počítá náprava — průměr, nebo přidělené pořadí?
4. Má se protest zveřejňovat, nebo je to interní věc komise? Na tom stojí,
   jestli se to vůbec dostane na veřejné stránky.

## Workflow výsledků

Ze zadání: výsledek se dá **navrhnout, ověřit, schválit, potvrdit, vrátit
k revizi, publikovat nebo eliminovat**. Stavy tedy nejsou volba, jsou zadané.

| Stav | Kdo do něj dostane | Co znamená |
|---|---|---|
| `Navrzeno` | editor | zapsáno, nikdo to ještě nekontroloval |
| `Overeno` | rozhodčí | čísla sedí s papírem z vody |
| `Schvaleno` | rozhodčí | protesty vyřízené, pořadí platí |
| `Potvrzeno` | správce | konečné, dál se needituje |
| `Publikovano` | správce | vidí veřejnost |
| `KRevizi` | rozhodčí i správce | vráceno zpátky s důvodem |
| `Eliminovano` | správce | rozjížďka se nepočítá (zrušená, neplatná) |

Dvě rozhodnutí, která je potřeba udělat dřív, než se to začne psát:

**Stav se vede na rozjížďce, ne na jednotlivém výsledku.** Rozhodčí schvaluje
sadu výsledků jako celek — pořadí dává smysl jen dohromady. Stav na řádku by
znamenal, že rozjížďka může být zpola schválená, což neodpovídá ničemu ve
skutečnosti.

**Publikováno je vlastní příznak, ne poslední stav v řadě.** Potvrzený výsledek
smí zůstat neveřejný a publikovaný se smí vrátit k revizi, aniž by se
publikace ztratila. Kdyby to byl jeden sloupec, jedno by přepisovalo druhé.

Přechody hlídá jedna funkce s testy, ne rozeseté podmínky po endpointech.
Správce smí přeskočit dopředu — to už v plánu bylo a platí dál.

## Role a oprávnění

Upřesněno podle Filipova zadání 9. 9. 2026. Co řekl výslovně je označené,
zbytek je **odvozený** — a odvození je vidět, aby se dalo opravit.

Práva jsou **rozsahová**: platí buď pro celou sérii, nebo pro jeden závod.
Pořadatel zastávky spravuje svůj závod, ne cizí. **Rozsah série pokrývá její
zastávky, ne naopak.**

| Role | Rozsah | Smí |
|---|---|---|
| Čtenář | — | vidí publikované; neuděluje se, je to každý |
| Editor | série i závod | píše na blog svého rozsahu *(zadáno)* |
| Organizátor | série i závod | vypisuje závod, spravuje přihlášené lodě, rozjížďky a výsledky, píše na blog *(zadáno)* |
| Rozhodčí | série | kalendář a stavy zastávek, přiřazuje organizátora a editora *(zadáno)*; ověřuje a schvaluje výsledky *(z dřívějšího plánu)* |
| Správce | série | vše ve svém rozsahu, včetně publikace a udělování rolí |

**Série má tytéž role jako zastávka a vlastní blog** *(zadáno)*. Organizátor
celého ročníku tedy může to samé na kterékoliv jeho zastávce; organizátor
jedné zastávky jen na ní.

### Co z toho plyne a co jsem odvodil

**Rozhodčí vládne kalendáři, organizátor závodu.** Rozhodčí zakládá zastávky,
posouvá je z `Planovany` do `Potvrzeny` a smí je zrušit; teprve pak si závod
přebírá jeho organizátor, vypíše ho a odjede. Je to rozdělení podle toho, kdo
o čem skutečně rozhoduje: termín v seriálu je věc rozhodčího, průběh závodu
věc pořadatele.

**Rozhodčí není stupeň oprávnění, ale funkce v procesu** — proto samostatná
role, ne úroveň mezi editorem a správcem. Editor nesmí schvalovat a rozhodčí
sám o sobě nesmí zapisovat výsledky; obojí má jen správce. Hlídá to
`PravaTests`.

**Editor je podmnožina organizátora, ne jeho předstupeň.** Ze zadání píše
blog a nic dalšího. Je to role pro toho, kdo umí psát o závodě, ale nemá do
něj zasahovat — typicky někdo z klubu pořadatele.

**Odvozeno: výsledky zapisuje organizátor, schvaluje rozhodčí.** Ze zadání
organizátor „zapisuje výsledky"; z dřívějšího plánu rozhodčí „ověřuje
a schvaluje". Sedí to na sebe: zapsat a schválit nemá dělat tentýž člověk,
jinak je schválení jen druhé kliknutí téhož.

**Odvozeno: publikuje správce.** Zůstává z dřívějšího plánu. Rozhodčí říká
„čísla platí", správce „ať to vidí veřejnost" — a to je jiné rozhodnutí,
zejména u ročníku s vymyšlenými daty.

**Odvozeno: role udělují správci.** Rozhodčí přiřazuje organizátora a editora
**konkrétní zastávce** *(zadáno)*; udělit někomu právo na celý ročník, nebo
udělat z někoho rozhodčího, může jen správce. Bez toho by si rozhodčí mohl
rozšířit vlastní rozsah.

### Příspěvky na blogu se dají psát dopředu

*(zadáno)* Článek se dá skrýt a zobrazit, aby se pozvánka nebo souhrn napsaly
předem a vyšly, až mají. Model to už umí — `Clanek.Publikovano` je právě
tenhle příznak a veřejné čtení ho respektuje. Chybí jen obrazovka, která ho
přepne.

**Nepublikovaná zastávka schová i svůj blog**, takže článek k zastávce, která
ještě není venku, se nedá přečíst ani odkazem. To platí už dnes.

### Otevřené: přihlášení lodi na jednu zastávku

*(zadáno)* „Na každou akci se může přihlásit do kategorie loď" a organizátor
ji pak „zapisuje, potvrzuje, nebo ruší ve vyhlášeném závodě". Účast tedy
přestává být jen záznam o tom, kdo přijel, a dostává stav:
přihlášená → potvrzená → zrušená.

**Tady se to potkává s rozhodnutím, které už padlo:** kategorii nese
**celoroční přihláška**, ne účast — protože loď jede celý rok v jedné
kategorii. Přihlásit se na zastávku „do kategorie" tedy nejspíš znamená
přihlásit se na zastávku a kategorii si přinést z ročníku.

**Zodpovězeno 10. 9. 2026: ano, smí.** *(zadáno)* Filip: „ano, tím pádem se
doplní její neúčast v uplynulých podnicích."

**Rozhodnutí o celoroční kategorii to nenabourává** — a to je na té odpovědi
to podstatné. Loď se přihlášením na zastávku **stává účastníkem ročníku**:
založí se jí celoroční přihláška s kategorií, jako by přijela od začátku,
a zastávky před tím se jí zapíšou jako neúčast. Účast tedy vlastní kategorii
nepotřebuje a model zůstává, jak je.

**Neúčast ale musí dostat číslo, a to zatím nemá.** Dnes se do součtu
nepočítá vůbec ([PoradiEndpoints.cs](../src/OrlickyPohar.Api/Features/Bodovani/PoradiEndpoints.cs)
to má napsané jako otevřenou otázku). V nízkobodovém systému je chybějící
zastávka **výhoda**: kdo nejel, nemá co přičíst. Dokud se tohle nedoplní,
vyhraje ročník loď, která přijede na poslední zastávku — a to platí i bez
téhle změny, jen se dosud nemělo jak stát.

Obvyklé řešení v plachtění je **DNC = počet přihlášených v kategorii plus
jedna**, což na téhle stupnici (vítěz nula, tedy pořadí mínus jedna) vychází
na **počet lodí v kategorii**. Škrt nejhorší zastávky jednu neúčast schová,
druhou už ne — což je přesně ten účinek, který se od škrtu čeká.

**Tohle je otázka na rozhodčího**, ne odvození: je to jediné číslo, které
o pořadí rozhodne pokaždé, když někdo vynechá. Do odpovědi se dopočet
neúčasti nestaví.

#### Co k tomu říkají závodní pravidla (ověřeno 11. 9. 2026)

Zdroj: [Závodní pravidla jachtingu 2025–2028](https://rules.sailing.cz/#dodatek-a),
Dodatek A — český překlad ČSJ.

**A5.2 dává tvar, který jsme odvodili.** „Loď, která neproplula dráhu,
vzdala nebo byla diskvalifikována, musí být bodována za cílové umístění
**o jedno vyšší, než je počet lodí přihlášených do závodu**." Na naší
stupnici, kde do seriálu jde *pořadí mínus jedna*, to vychází přesně na
**počet lodí v kategorii**. Odvození v plánu tedy pravidla potvrzují.

**A10 potvrzuje i význam zkratky:** `DNC` = „Neodstartovala, nepřiplula do
startovního prostoru".

**Co pravidla ale neřeší, je seriál.** Dodatek A boduje **závod** z jeho
rozjížděk (A2.1: součet bodů z rozjížděk s vyškrtnutím nejhoršího) a
„počet přihlášených" v A5.2 je počet přihlášených **do toho závodu**.
Pohár z dvanácti samostatných závodů žádné pravidlo WS neupravuje — je to
věc vypsání seriálu, tedy rozhodčího. **Zbývají na něj tedy dvě otázky, ne
jedna:**

1. Počítá se DNC z lodí přihlášených **do ročníku**, nebo z těch, co
   přijely **na tu zastávku**? Odpověď z 10. 9. („loď se smí přihlásit
   i mimo ročník a neúčast se doplní") mluví pro ročník, ale nevylučuje
   druhé čtení.
2. **Zrušená zastávka:** v sešitu mají Radavská a Vánoční regata u všech
   lodí nuly, kdežto nadcházející zastávky prázdno. Znamenají ty nuly, že
   se zrušená zastávka boduje nulou všem, nebo je to jen zápis „nic se
   nejelo"?

**A ještě jedna věc, která vyplavala:** náš výpočet dává kódům různé body
podle závažnosti — při dvanácti dokončivších `DNF` třináct a `DNS`
čtrnáct, doloženo výsledkovou listinou FxCK Cancer 2026. **A5.2 by dala
oběma totéž** (přihlášených + 1). Pravidla to připouštějí — A4 platí, jen
„pokud vypsání závodu nebo plachetní směrnice nestanoví jiný systém" —
takže buď má seriál vlastní úpravu, nebo se v sešitu boduje po svém.
Neměníme nic: kód stojí na skutečné listině. Je to ale **třetí otázka na
rozhodčího** a teď se dá položit i s odkazem na pravidlo.

## Úvodní stránka

Filipův záměr, upřesněný 9. 9. 2026: landing má udělat dojem, kdežto
výsledkové stránky mají zůstat utilitární. Nejsou to protiklady — slouží
dvěma různým lidem. Kdo přijde poprvé, potřebuje za dvě vteřiny pochopit,
že tohle je skutečný seriál; kdo se vrací, chce číslo.

Rozpor mizí jediným pravidlem: **wau se nesmí postavit do cesty.** Velká
fotka ano, úvodní obrazovka k odkliknutí ne — ta odradí toho, kdo chodí
každý týden, a rozbije sdílení odkazů.

**Dojem nedělá hezká fotka, ale aktuálnost.** Ukázalo se to na seriálech
jiných sportů (Diamond League, Ski Classics): hero je vždycky *co se právě
stalo* nebo *co bude*. Proto je nad fotkou **věta spočítaná z dat** — odjeté
zastávky, kdo vede, další termín. Statická fotka zestárne za měsíc, tahle
věta se mění sama.

Obojí má i strukturální oporu: oba ty weby drží **výsledky zastávky
a průběžné pořadí odděleně**, přesně jak to má náš model, a **pořadí dávají
na úvodní stránku**, protože je to číslo, kvůli kterému lidé chodí.

Zkoušená a **zamítnutá** varianta: připnutá fotka, po které obsah přejíždí.
Vypadá dobře jen tehdy, když sedne práce s vrstvami — hlavička přes fotku
a neprůhledné pozadí obsahu. Když to nesedne, vypadá to jako chyba, ne jako
efekt. Odloženo, ne zavrženo.

**Samostatná „wau" stránka** je Filipův nápad, jak to mít obojí: landing
zůstane rychlý a efektní prezentace bude vedle. Až na ni dojde, počítá se
s karuselem z vybraných fotek.

## Web a mobil

| Část | Čím | Proč |
|---|---|---|
| API | .NET 10, vertikální řezy | standard platformy, kontrakt `http-service` |
| Web | React (Next.js) — veřejné stránky serverem, administrace v prohlížeči | blog a výsledky potřebují SEO, administrace ne |
| Mobil | **Expo / React Native, nativní na iOS i Android** | Filipovo rozhodnutí, viz níž |
| Fotky | R2 přes S3 API | pravidlo platformy — na disku nesmí být nic autoritativního |

Klient API je generovaný z OpenAPI v TypeScriptu a **sdílí ho web i appka**.
To je platformové rozhodnutí, ne volba projektu.

### Fotky — co na nich má být

Filipovo doporučení, ne pravidlo. Když se vybírá fotka na web, hledá se jedno
ze tří:

1. **Detail lodi** — takový, kde jsou na plachetnici vidět podrobnosti.
2. **Velká skupina lodí na startu.**
3. **Lodě pod plnými plachtami v náklonu.**

Pozadí typické pro Orlík fotku vylepší, nejlepší jsou záběry se zámkem; obecná
voda bez rozpoznatelného břehu může být odkudkoliv.

**Co nebrat: drobné cílové fotky**, kde jsou lodě jen tečky na hladině. Na
webu z nich není nic vidět a stránku ničím neobohatí.

Je to volba obsahu, ne technické rozhodnutí — píše se sem proto, že fotky bude
vybírat kdokoliv, kdo zrovna staví stránku, a bez tohohle odstavce vybere
první použitelnou.

**Odkud vzít první sadu:** Filipova vlastní galerie na Rajčeti. Fotil je sám,
takže u nich otázka práv odpadá a dají se použít bez ptaní.

To ale platí **jen pro tuhle sadu**. U fotek od pořadatelů a diváků, které
přibudou později, musí být u snímku vidět autor a souhlas se zveřejněním.
Je to jedno pole u fotky; doplňovat ho zpětně ke dvěma stům snímků je práce,
kterou nikdo neudělá.

**Druhá sada: Izolepa 2026, autor Jiří Tašl.** Album *2026.08.01 orlik
izolepa* na Zoneramě; **autor dal Filipovi svolení** (9. 9. 2026). U snímků
se uvede jeho jméno. Je to zároveň první doklad, že to pole u fotky musí
vzniknout hned s prvním nahráním, ne až bude potřeba.

Fotky se **nelinkují z cizí služby**, ale stáhnou a uloží do R2. Sdílené
album může zmizet nebo změnit adresu a web by měl díry na místech, kde je
nikdo nehlídá.

### Odkud se dají vzít a jak

Jiřího alba z Izolepy na Zoneramě, uživatel `TaslJiri` — **materiál je
k dispozici, kdykoliv bude potřeba**:

| album | ročník | fotek |
|---|---|---|
| `16038455` | 2026 | 18 |
| `13692344` | 2025 | 48 |
| `11853646` | 2024 | 87 |
| `10158399` | 2023 | 100 |
| `8732253` | 2022 | 100 |

Plus album *2026.08.01 orlik izolepa* dostupné jen sdíleným odkazem — ten
má Filip; do repozitáře nepatří.

**Jak z toho vybírat, aniž bys klikal po jedné.** Stránka alba
(`eu.zonerama.com/TaslJiri/Album/<id>`) obsahuje odkazy `Photo/<album>/<foto>`,
z nichž se vytáhnou identifikátory. Obrázek se pak složí přímo:

```
https://eu.zonerama.com/photos/<foto>_<šířka>x<výška>.jpg
```

Rozměry jdou libovolné, server dopočítá — `_360x360` je náhled, `_1600x1600`
tisk na obrazovku. Z náhledů se slepí kontaktní list (mřížka s popisky) a
projde se **tři sta fotek na pár obrázcích** místo tří set kliknutí. Vybrané
se pak stáhnou ve velkém.

Kritéria výběru jsou výš: detail lodi, velká skupina na startu, náklon pod
plnými plachtami. **Zámek Orlík v pozadí je nejcennější** — obecná voda může
být odkudkoliv, zámek fotku usadí na Orlík.

### Administrace i na mobilu

Zadání chce administraci **na webu i na mobilu**, ne jen na webu. To mění
tvar mobilní linky: appka z fáze 3 je jen čtecí a nepotřebuje přihlášení,
ale administrační appka ho potřebuje — tedy **fázi 4**.

Znamená to dvě vydání appky, ne jedno: nejdřív čtecí, později se do ní
přidá přihlášení a zadávání. Není to zdržení, je to pořadí — učit se Expo
současně s OAuth tokem na mobilu jsou dva problémy najednou.

Kdy přesně přijde mobilní administrace, se rozhodne až podle toho, jestli
pořadatelé skutečně zadávají výsledky od vody. Když se ukáže, že je zadávají
večer u počítače, je to práce navíc bez užitku — a to se pozná až z provozu.

### Proč nativní a ne PWA

Navrhoval jsem PWA a Filip to odmítl. Důvod: chce si obojí zkusit postavit,
a hračkárna je přesně od toho. Rozhodnutí zůstává jeho.

Zapisuju to i s protiargumenty, aby bylo za rok jasné, co se vědělo:

- appka je druhý klient — druhý toolchain, buildy, podepisování, verzování
- žádný ze scénářů (číst výsledky, číst blog, zadat výsledky) nativní nutně
  nepotřebuje
- účet u Applu stojí ročně víc než celý provoz platformy

Proti tomu stojí, že se to Filip chce naučit. To je legitimní důvod
a v hobby projektu dokonce ten hlavní.

### Co to stojí a kdy

Ověřeno 6. 9. 2026 v dokumentaci Expo.

| | Vývoj | Rozdat lidem |
|---|---|---|
| **Android** | zdarma | zdarma (APK), Play Store 25 $ jednorázově |
| **iOS** | zdarma přes Expo Go na vlastním iPhonu | **99 $ ročně** — bez placeného účtu nejde nainstalovat na žádný iPhone |

**EAS staví iOS v cloudu na macOS strojích Expo**, takže na pracovní Mac
se neinstaluje Xcode ani nic dalšího. To je pro tenhle projekt zásadní —
stopa na firemním stroji zůstává stejná jako dnes (viz
[PRACOVNI-STROJ.md](https://github.com/file-pb/platform/blob/main/docs/PRACOVNI-STROJ.md)).

Free tier je 15 iOS a 15 Android buildů měsíčně, výslovně určený pro
hobby projekty jednotlivců.

**Pozor na Expo Go.** Push notifikace se v něm vyzkoušet **nedají** —
potřebují development build, a ten na iOS vyžaduje placený účet u Applu
kvůli APNs klíči. Expo Go tedy pokryje vývoj obrazovek, ne upozornění.

**Pořadí, které to nejlevněji umožňuje:** obrazovky i push vyvíjet na
Androidu, kde je všechno zdarma (FCM i instalace APK). Applu zaplatit ve
chvíli, kdy má appka poprvé fungovat na iPhonu včetně upozornění.
Protože push je jádro funkce, přijde ta chvíle **dřív**, než jsem odhadoval
před doplněním o upozornění.

## Jak se po webu chodí

Ročník má **kalendář** — a ten je zároveň rozcestníkem. Každá zastávka v něm
ukazuje svůj stav (plánovaná, vypsaná, odjetá, zrušená) a proklikem se jde
na její vlastní stránku.

**Blog je na dvou úrovních a není to totéž.**

| Úroveň | Kdo píše | Co tam patří |
|---|---|---|
| Série | organizátor poháru | pozvánky na sezónu, zajímavosti, souhrny |
| Zastávka | **pořadatel té zastávky** | pozvánka na svůj závod, jeho příběh, aktuality |

Zastávku pořádá jiný subjekt, takže její stránka je jeho: kromě základních
informací, stavu a výsledků tam patří i jeho vlastní blog.

**Pořadatel není jméno, ale subjekt.** Zastávky pořádají kluby, mariny
a provozovatelé služeb na Orlíku, ale taky agentura pro charter na moři nebo
charitativní organizace. Většina z nich má vlastní web a sociální sítě a bude
je chtít na své stránce mít — je to pro ně důvod, proč do poháru jít.

Dřív byl `Zavod.Poradatel` volný text a pro fázi 1 to stačilo. **Od 15. 9.
2026 je pořadatel vlastní záznam** a text zůstal jako jeho jméno — viz
*Pořadatel jako záznam* ve fázi 6. Byla to hranice, ne odklad: odkaz na
Facebook se do textového pole vecpat dá, ale pak se z něj nikdy nedostane ven.

**Má to důsledek pro oprávnění, ne jen pro vzhled.** Pořadatel Radavské
regaty smí psát na stránku Radavské regaty a nikam jinam. Je to přesně ten
rozsah, který plán popisuje u rolí — článek proto nese vazbu buď na sérii,
nebo na zastávku, a právo se odvozuje od ní.

## Stránka zastávky — cílový tvar

Filipův záměr do budoucna, ne úkol na teď. Zapsané, aby se model nevyvíjel
proti němu.

Každá zastávka má **vlastní prezentační stránku**, protože ji pořádá jiný
subjekt a má svůj příběh. Obsahuje:

| Část | Co to je | Odhad |
|---|---|---|
| Blog závodu | příběh zastávky, aktuality před závodem i po něm | levné, `Clanek` s vazbou na závod |
| Oficiality | vypsání závodu, plachetní směrnice, pravidla | levné, soubory v R2 s popisem |
| Výsledky | to, co staví fáze 1 a 2 | hotové |
| Mapka | trať, místo startu, marina | střední — statická mapa levná, interaktivní ne |
| Registrace do závodu | přihlášení lodi na konkrétní zastávku | střední, ale viz níž |
| Chat | diskuse u závodu | **drahé, viz níž** |
| Napojení na sociální sítě | sdílení ven | levné ven, drahé dovnitř |

### Tři místa, kde je cena jinde, než se čeká

**Chat není technický problém, ale provozní.** Napsat ho je práce na dva
večery; udržet ho je práce navždy. Potřebuje moderaci, řešení sporů mezi
závodníky, mazání a někoho, kdo to dělá — na Facebooku to dnes obstarává
skupina zdarma. Než se bude psát, patří odpovědět: kdo bude moderovat?

**Registrace do závodu má neviditelnou část.** Přihlášení lodi je jedna
tabulka. Ale ve směrnici stojí startovné 500 Kč a požadavek na průkaz
způsobilosti — takže jakmile bude registrace ostrá, přijde otázka plateb
a evidence dokladů. To je jiná velikost úlohy než formulář.

**Stav přihlášek se nemodeluje — nese ho `Vypsany`.** Nabízelo se u zastávky
ukazovat, jestli jsou přihlášky otevřené. Užitečná je na tom jen jedna
polovina: závodník chce vědět, **že se už může hlásit**. A to je přesně to,
co znamená stav `Vypsany` — pořadatel vydal vypsání závodu a plachetní
směrnice. Není potřeba nový příznak, jen to musí stránka říct nahlas.

Druhá polovina, tedy uzavření seznamu, cenu nemá: kdo přijde pět minut před
startem, toho dopíšou. Uzavřeno by byl nápis, který neplatí — udržoval by se
a nic by nevynucoval. Uzávěrka dostane smysl, teprve až bude registrace ostrá
a poveze s sebou startovné a průkazy způsobilosti, protože tehdy bude něco
skutečně zakazovat. (Filip, 8. 9. 2026.)

**Sociální sítě jdou snadno ven, ne dovnitř.** Sdílet článek na Facebook je
odkaz s náhledem. Číst obsah ze skupiny zpátky do webu prakticky nejde —
skupiny jsou zavřené a Facebook to API nedává. Počítej s jednosměrným tokem.

## Upozornění (push)

Appka má závodním lodím nosit informace — během závodu (odložený start,
změna trati, zkrácení) i v rámci poháru (přihlášky, výsledky, termíny).

Tohle je ta funkce, kvůli které nativní appka dává smysl. Web ani PWA by
to na iPhonu spolehlivě neuměly.

### Jak to bude postavené

| Vrstva | Čím |
|---|---|
| Odeslání | Expo Push Notification Service — obálka nad APNs a FCM |
| iOS transport | APNs (Apple) |
| Android transport | FCM (Firebase, zdarma) |
| Evidence příjemců | tabulka `Zarizeni` — token, platforma, odběry |

### Dvě úrovně upozornění

| Komu | Příklad | Přihlášení |
|---|---|---|
| **Veřejná** | výsledky publikovány, nový článek, termín závodu | **ne** — zařízení se přihlásí k odběru série nebo závodu |
| **Jen účastníkům** | odložený start, změna trati, informace pro lodě právě v závodě | **ano** |

Veřejná upozornění nesmějí vyžadovat účet — divák ani fanoušek nemá kvůli
termínu závodu nic zakládat.

Účastnická jsou jiný případ: musí se dát určit, **komu se posílají**. Cíl
je odvoditelný z dat — lodě, které mají `Ucast` na právě běžícím závodě —
ale k doručení je potřeba vědět, které zařízení patří které lodi. A to bez
identity nejde.

**Důsledek pro pořadí fází:** účastnická upozornění stojí na identitě
(fáze 4). Veřejná se dají udělat dřív.

### Jak se z přihlášení stane „kormidelník lodi Anička"

Tohle je vlastní návrhový problém, ne detail. Uživatel se přihlásí přes
Zitadel a tím je to celé — systém pořád neví, ke které lodi patří.

Možnosti, mezi kterými se bude vybírat:

- **Přiřadí pořadatel.** Nejjednodušší, nejbezpečnější, ale někdo to musí dělat.
- **Kód z přihlášky.** Loď dostane při registraci kód, kdo ho zadá, připojí se k lodi.
- **Nárok a potvrzení.** Uživatel si řekne o loď, majitel nebo pořadatel potvrdí.

Platí pravidlo platformy č. 5: `Osoba` má **volitelné** napojení na interní
`UserId`. Většina osob v systému žádný účet mít nebude — figurují jen jako
majitelé a členové posádek.

### Co to znamená pro přenositelnost

`FCM` obejít nejde — na Androidu je to jediná cesta, jak doručit push.
Závislost na **Expo** je naproti tomu tenká: je to odesílací služba, kterou
lze nahradit vlastním odesíláním přes APNs a FCM. Lock-in je tedy v Googlu
a Applu, ne v Expu, a ten se z podstaty platformy vzít nedá.

### Spouští Outbox

Odložená položka platformy **Outbox** má spoušť „první commit, po kterém
nesmí být ztracena externí akce". Zpráva rozhodčího lodím na vodě je přesně
ona: když se uloží „start odložen" a odeslání selže, nikdo se to nedozví.

Řeší se to ve fázi, kdy vzniká odesílání — ne dřív.

### Otevřená otázka: je appka oficiální vývěska?

Jestli má být appka **oficiální vývěskou závodu**, musí to říkat plachetní
směrnice a mění to nároky na spolehlivost i na to, co se smí publikovat.
Jestli je to **pohodlí navíc** vedle oficiálních signálů, je to volnější.

Není to technické rozhodnutí — patří rozhodčímu.

## Tracker

Appka zaznamenává trasu lodi během závodu; po dojezdu si ji každý prohlédne
a porovná. Tohle je funkce, kterou web neumí a nikdy umět nebude.

Zároveň je to **samostatný projekt velikosti zbytku appky.** Mapa je ta
snadná část, těžké je všechno kolem ní.

### Co je na tom skutečně těžké

| Věc | Proč |
|---|---|
| **GPS na pozadí** | iOS vyžaduje oprávnění „Vždy" a deklarované background modes, Android trvale běžící službu s viditelným oznámením |
| **Baterie** | 24hodinovka na telefonu je jiná disciplína než hodinový okruh. Frekvence vzorkování se bude muset dát nastavit |
| **Offline** | Na vodě signál není. Appka musí zapisovat lokálně a nahrát trasu po návratu do dosahu — není to volitelné |
| **Schvalování v obchodě** | Apple se u polohy na pozadí ptá, k čemu to je. Musí to být v popisu appky obhájené |

### Kam trasy ukládat

**Návrh: body trasy jako komprimovaný soubor v R2, metadata v Postgresu.**

Trasa se zapíše jednou a čte se celá — nikdy se nedotazuje po jednotlivých
bodech. Ukládat statisíce řádků do databáze kvůli tomu, aby se vždycky
načetly všechny najednou, je zbytečné.

Co to **neznamená**: nesaháme po PostGIS ani po telemetrické službě.

- **PostGIS** by dával smysl u prostorových dotazů („kdo byl nejblíž bóji").
  Ty zatím nejsou. Přidat ho jde kdykoliv později.
- **Telemetrická služba** je stavěná na skalární veličiny se zdrojem a metrikou.
  Poloha je dvojice, ne skalár. Ohýbat kvůli tomu její model by bylo horší
  než soubor v R2.

### Rozhodnutí, které patří rozhodčímu

**Vidí se trasy živě během závodu, nebo až po dojezdu?**

Živé pozice soupeřů jsou v závodě informace, která může být proti pravidlům.
Není to technická otázka — a technicky je post-race jednodušší, protože
nepotřebuje spojení z vody.

Návrh: **až po dojezdu**, dokud rozhodčí neřekne jinak. Vlastní trasu vidí
závodník vždycky, cizí až po zveřejnění výsledků závodu.

### Nezávislost

Tracker nestojí na bodování, workflow ani administraci. Potřebuje jen
identitu a kontext závodu. Dá se tedy postavit **vedle** hlavní linky —
nebo dřív, když bude větší chuť.

## Kde co bydlí

**Monorepo — API, web i appka v tomhle repozitáři.**

```
src/OrlickyPohar.Api/     API (.NET 10)
web/                      veřejné stránky a administrace (Next.js)
app/                      mobilní appka (Expo)
packages/api-client/      TypeScript klient generovaný z OpenAPI
```

Rozhoduje o tom generovaný klient. Ve třech repozitářích by se musel
publikovat jako balíček a každá změna kontraktu by znamenala tři pull requesty
za sebou. Při pěti hodinách týdně je to celý večer režie na změnu, která je
jinak patnáctiminutová.

Cena monorepa je, že se buildy musí filtrovat podle cest, aby změna ve `web/`
nepřestavovala API image. To je jeden `paths:` filtr ve workflow, ne
architektonický problém.

**Kdy to přestane platit:** až bude mít appka vlastní release cyklus a verze
v obchodech se rozejdou s verzemi backendu. Tehdy se `app/` odštěpí — je to
přesun složky a jedno workflow, ne přepis.

## Pojmenování v kódu

**Doménové entity česky bez diakritiky, všechno ostatní anglicky.**

Rozjížďka není *heat* ani *race*, přihláška do ročníku není *entry* ani
*registration*. Přesný anglický protějšek neexistuje, takže by ho každý
překládal jinak a pokaždé znovu — a s pořadatelem i rozhodčím se stejně mluví
česky. Termíny závodních pravidel jsou navíc kódy (`DNF`, `OCS`), které se
nepřekládají tak jako tak.

Handlery, sufixy DTO, infrastruktura a testy zůstávají anglicky jako v šabloně:
`CreateZavodHandler`, `ZavodResponse`. Hranice vede u doménového pojmu, ne
u souboru.

Nezavádí se tím výjimka z pravidla o `Source` — to platí pro telemetrii, která
tady po první fázi nezůstane.

## Jak se dovnitř dostanou loňská data

**Import ze souboru přes chráněný endpoint** — ne seed v migraci a ne čekání
na administraci.

`POST /import/serie` přijme jeden JSON s celým ročníkem (závody, lodě,
přihlášky, výsledky) a je **idempotentní**: druhé odeslání téhož souboru nic
nezduplikuje. Chrání ho token ze souboru v `/run/secrets`, protože do fáze 4
neexistuje žádná identita.

Proč ne migrace: migrace je schéma, ne obsah. Překlep v loňském výsledku by se
opravoval další migrací a jednou spuštěná migrace se nepřehraje.

Proč ne počkat na administraci: fáze 1 existuje právě proto, aby se model
prověřil o skutečná data dřív, než se na něj něco postaví. Bez dat je to fáze
bez smyslu.

Vedlejší efekt je, že tentýž endpoint zvládne i každý další ročník a poslouží
jako záchrana, kdyby administrace ve fázi 5 nestíhala.

## Zdroje a inspirace

| Co | Kde | K čemu |
|---|---|---|
| Fotky | [galerie na Rajčeti](https://rajce.net/jitkaorlik/album/fuck-cancer-regatta-empatie) | první sada, Filipovy vlastní |
| Existující obsah | Facebook | něco z historie závodů se dá najít tam |
| Inspirace obsahem | [Česká námořní rallye](https://www.ceskanamornirallye.cz/) | co má český web závodu obsahovat a v jakém jazyce |
| Inspirace formou | [Vendée Globe](https://www.vendeeglobe.org/), [Rolex Middle Sea Race](https://www.rolexmiddlesearace.com/), [Barcolana](https://www.barcolana.it/en) | moderní responzivní podání výsledků a průběhu |
| **Pravidla jachtingu** | [rules.sailing.cz](https://rules.sailing.cz/) | závodní pravidla česky — kódy výsledků, škrty, protesty |
| **Český svaz jachtingu** | [sailing.cz](https://www.sailing.cz/) | ukázkové výsledkové listiny, lodní třídy a jejich weby |

**Svaz je nejbližší zdroj pravdy k otevřeným otázkám.** Filip, 11. 9. 2026:
s Českým svazem jachtingu je pohár úzce spojený a rozhodčí je jeho člen.
Znamená to, že část otázek, které dosud čekají na rozhodčího, má nejspíš
**napsanou odpověď v závodních pravidlech** — hodnota za neúčast, pořadí
kódů za `DNF` a `DNS`, chování škrtu. Než se na ně bude ptát člověk, patří
se podívat do [rules.sailing.cz](https://rules.sailing.cz/); dotaz na
rozhodčího má pak cenu jen tam, kde se pohár od pravidel vědomě liší.

Kontakt na rozhodčího je na jeho profilu u svazu. **Do repozitáře se
nekopíruje** — je to profil konkrétního člověka a osobní údaje nemají
v gitu co dělat; odkaz stačí a je vždycky aktuální.

**ČNR se drž obsahem, ne formou.** Je to nejbližší srovnatelný český web
a dobře ukazuje, co takový web má mít, ale jeho podání je zastaralé.
Vizuální vzor patří hledat mezi moderními responzivními weby — těch je
spousta a nemusí to být zrovna weby plachetnic.

**Vzor se hledá v celém sportu, ne u plachtařů.** Nejtěžší kus veřejného webu
je jediný: dvacet lodí krát osm rozjížděk na displeji telefonu. Weby závodů
tenhle problém většinou neřeší dobře — líp ho mají vyřešený sportovní
výsledkové servisy a finanční tabulky, kde se na tabulce vydělává.

Plyne z toho i to, že model **není o plachtění**. Seriál, zastávka, rozjížďka,
kategorie a průběžné pořadí platí pro cyklistiku i pro šipky. Stránky
libovolného seriálu z toho tedy jednou být můžou.

**Nestaví se na to teď.** Zobecňovat model podle jednoho seriálu znamená
trefit špatnou hranici — pravidlo o třetí kopii platí i tady. Až přijde druhý
seriál, ukáže, co je společné doopravdy; do té doby je to poznámka, ne úkol.

Inspirace jsou k tomu, jak se výsledky a průběh **podávají**, ne k tomu, kolik
to stojí. Vendée Globe má rozpočet, který tenhle projekt nemá, a živý tracking
celé flotily je tam samostatný produkt.

## Hranice rozšiřitelnosti

Ne co se postaví, ale **kde by pozdější rozšíření bolelo**. Cílem je dojít
k funkční verzi, ne stavět dopředu — tahle tabulka jen hlídá, aby cesta
k cíli nezavřela dveře.

| Rozšíření | Co by stálo | Stav |
|---|---|---|
| Další kategorie, přejmenování | řádek v tabulce | otevřené |
| Změna bodovacích pravidel | přepočet, žádná migrace — body se neukládají | otevřené |
| Jiný typ závodu | volný text, žádný číselník | otevřené |
| Handicap (Yardstick, ORC) | pole na přihlášce + jedna funkce na systém | otevřené |
| Výměna poskytovatele identity | tabulka `(issuer, subject) → UserId` | otevřené |
| Další ročník | tentýž importní soubor | otevřené |
| Jiný sport se stejným tvarem | sdílí se všechno kromě `Vysledek` | čistá hranice |
| **Kategorie na jednotlivý závod** | sloupec na `Ucast`, s výchozí hodnotou z přihlášky | levné, ale je to migrace |
| **Posádka jako lidé, ne text** | nová vazební tabulka **a ruční přepis historie** | ⚠ viz níž |
| **Druhý seriál jiného pořadatele** | `Lod` a `Osoba` jsou dnes globální | ⚠ viz níž |

### Dvě místa, která se pozdějším odkladem zdraží

**Posádka.** Dneska je to volný text, protože se jen vypisuje. Jakmile bude
potřeba posílat upozornění posádce nebo jí dát práva, musí to být odkaz na
osoby — jenže do té doby vznikne několik set závodů s texty, které nikdo
automaticky nerozseká. Převod bude ruční práce úměrná tomu, jak dlouho se
čekalo.

Nedělá se teď, protože pro veřejné čtení a bodování je text dost. Ale je to
rozhodnutí s rostoucí cenou, ne odložený detail.

**Globální lodě a osoby.** `Serie` je kořen skoro všeho, takže druhý seriál
by se přidal snadno — kromě `Lod` a `Osoba`, které leží mimo něj. To je
schválně: jedna loď jezdí víc ročníků a rozdělit ji podle seriálů by
znamenalo duplikáty.

Problém by nastal až u seriálu **jiného pořadatele**, který nemá vidět cizí
rejstřík. Tehdy přibude vlastník k lodi a osobě. Odhad: jedna aditivní
migrace a filtry v dotazech — nepříjemné, ne dramatické. Dřív to řešit nemá
smysl, protože dneska žádný druhý pořadatel neexistuje.

**Zastávka ve dvou seriálech.** `Zavod` patří přesně jedné `Serie`. U
[melges24.com](https://www.melges24.com/Worlds2026) je tentýž závod současně
světovým šampionátem a zastávkou americké série — a to náš model neumí:
znamenalo by to vazební tabulku mezi závodem a sérií a počítání pořadí pro
každý seriál zvlášť, protože koeficient i škrty jsou vlastnost seriálu, ne
závodu.

Dneska je jeden seriál, takže se to řešit nemá. Patří to ale sem, do téže
kategorie jako druhý pořadatel: **cena roste s odkladem** a poznat se to dá
jen tím, že si toho někdo všimne dřív, než to bude potřeba.

### Co ještě ukázaly cizí weby

Prohlédnuté 9. 9. 2026: [Diamond League](https://www.diamondleague.com/) a
[melges24.com](https://www.melges24.com/Worlds2026). Druhý je tvarem skoro
totéž co my — seriál a v něm zastávky s vlastní stránkou — takže hlavně
potvrzuje *Stránku zastávky* výš, položku za položkou. Nové jsou dvě věci:

**Místo a pořadatel jako blok, ne řádek.** Adresa, hostující klub, jmenovaný
kontakt. Potvrzuje to, co je u `Zavod.Poradatel` napsané jako hranice: pro
pořadatele je jeho vlastní blok na té stránce důvod, proč do seriálu jít.

**Archiv novinek po letech.** Dnes se vypisují jen novinky aktuálního
ročníku. Levné doplnění, které se vyplatí ve druhé sezóně — stejně jako
`/historie` u ročníků.

A z Diamond League **drobečková navigace**, která je od 9. 9. 2026 nasazená,
a **články s obrázky**. To druhé je odložené vědomě: obrázek u článku
potřebuje R2, protože fotky dnes leží zabalené v image webu a to na jednu
fotku ke každému článku nestačí. Až na to dojde, začne se **jedním hlavním
obrázkem na článek** — z něj náhled do výpisu i velká fotka do detailu.
Galerie a obrázky uvnitř textu jsou pětkrát víc práce za zlomek užitku.

**A jedna věc, která není o kódu:** u Diamond League ten vzhled funguje
proto, že mají na každém mítinku fotografa. Devět článků ročně s vlastní
fotkou je pravidelná práce pro člověka. Karta proto musí vypadat dobře
i **bez** obrázku, jinak bude blog vypadat rozbitě zrovna u zastávky, ze
které nikdo nic nevyfotil.

## Fáze

Počítáno na pět hodin týdně.

| # | Co | Odhad | Proč v tomhle pořadí |
|---|---|---|---|
| 0 | ~~Kostra: repozitář, databáze, DNS, nasazení, `/health`~~ | **hotovo** | |
| 1 | ~~**Veřejné čtení** — model, import, stránky série a závodů~~ | **hotovo 7. 9. 2026** | Model se o skutečná data prověřil dřív, než se na něj něco postavilo — a našel dvě chyby v bodování |
| 2 | ~~**Bodování** — nízkobodový systém, kódy, škrty, pořadí po kategoriích~~ | **hotovo** | Čisté funkce **ověřené proti skutečnému sešitu rozhodčího**, vydané endpointem a vidět na webu |
| 3 | ~~**Mobilní appka, jen čtení**~~ | **hotovo 8. 9. 2026** | Nepotřebovala přihlášení, takže vznikla dřív než identita. Běží na telefonu, typy si bere z OpenAPI a jde poslat jako APK |
| 4 | ~~**Identita a role** — Zitadel, mapování `(issuer, subject) → UserId`~~ | **hotovo 9. 9. 2026** | Zitadel na vlastním stroji, přihlášení na webu, API ověřuje tokeny. Odblokovalo odloženou položku platformy |
| 5 | **Administrace a workflow** — zadávání, stavy, publikace, protesty a penalizace | skoro hotovo | Oprávnění, kalendář a workflow výsledků hotové 11. 9. 2026; zápis výsledků, přihlášky lodí a role od rozhodčího 14. 9. Zbývají protesty a penalizace — čekají na odpovědi rozhodčího |
| 6 | **Blog a fotky** — model, import, veřejné čtení, novinky na webu | skoro hotovo | Psaní článků i fotky v kartách hotové 11. 9. 2026; nahrávání vlastní fotky do R2 v kódu 16. 9. 2026, zapne se založením bucketu (viz *Fotky v R2*) |
| 7 | **Upozornění** — veřejná i účastnická, odesílání, Outbox | 2–3 týdny | Účastnická stojí na identitě z fáze 4 a na napojení osoby k lodi |
| 8 | **Tracker** — záznam trasy, offline, nahrání, prohlížení | 4–6 týdnů | Samostatná linka; potřebuje jen identitu a kontext závodu |
| 9 | Handicap | až bude potřeba | |

Realisticky **čtyři měsíce** do použitelné verze. Fáze 1 dá něco, co jde
ukázat pořadatelům — a to je nejrychlejší způsob, jak zjistit, co je
v modelu špatně.

Fáze 3 je schválně brzy: čtecí appka nepotřebuje přihlášení ani
administraci, takže se dá postavit proti hotovému veřejnému API. Učit se
Expo současně s řešením OAuth toků na mobilu by byly dva problémy najednou.

### Fáze 1 krok za krokem — hotovo

Pořadí je zvolené tak, aby se po každém kroku dalo přestat a mít funkční
repozitář.

| # | Krok | Hotovo, když |
|---|---|---|
| 1.1 + 1.2 | ~~Smazat šablonový řez, entity a migrace~~ | hotovo; `ModelPoharu` tabulky měření zahazuje, `InitialCreate` zůstala |
| 1.3 | ~~`POST /import/serie`~~ | hotovo; idempotence ověřená **proti produkční databázi**, druhý běh vrátil samé nuly |
| 1.4 | ~~Ročník jako soubor v `data/`~~ | hotovo, ale **vymyšlený** — skutečná data zatím nejsou |
| 1.5 | ~~Veřejné čtecí endpointy~~ | hotovo; nepublikované vrací 404, ne 403 |
| 1.6 | ~~`web/` — stránka ročníku a zastávky~~ | hotovo a nasazené; odkaz poslat jde, ale ukáže prázdno, dokud se nepublikuje ročník |

**Body se ve fázi 1 nepočítaly.** Výsledky se ukazují tak, jak přišly
z importu. Počítání je fáze 2 a chce vlastní testy — míchat obojí znamená
ladit model a bodovací pravidla najednou.

Zlaté payloady ze šablony smazáním `Measurements` pozbývají smysl, ale
mechanismus ne: `ContractTests` se překlopí na tvar importu a veřejného API.
Producent, ke kterému se nedostaneš, je tady mobilní appka na cizím telefonu —
a platí pro ni totéž co pro firmware na lodi.

## Co to spouští v platformě

| Odložená položka | Spoušť | Stav |
|---|---|---|
| **Zitadel** | druhá aplikace se skutečnými uživateli | **nastala** — řeší fáze 3 |
| **Outbox** | akce, která nesmí být ztracena | **nastala** — push rozhodčího lodím, řeší fáze 7 |
| Stavy životního cyklu projektů | čtvrtý projekt | tohle je druhý |

Platí pravidlo platformy č. 5: **vlastní interní `UserId`** a tabulka
`(issuer, subject) → UserId`. Nikdy `sub` z tokenu jako primární klíč.

## Zodpovězeno

| Otázka | Odpověď |
|---|---|
| Nositel bodů v seriálu | **loď**, ve výsledcích se uvádí jméno majitele |
| Kategorie | **loď jede celý rok v jedné** → kategorie patří celoroční přihlášce |
| Škrty | liší se závod od závodu → pole na `Zavod`, ne na sérii |
| Rozhodčí | rozsahová role, na závod i na sérii týmž mechanismem |
| Workflow | všechny stavy, správce smí přeskočit dopředu |
| Různá pravidla závodů | čísla a přepínač na `Zavod`, viz bodování výš |
| Vyhodnocení 24h | celé pole dohromady, ale **do seriálu po kategoriích** |

## Co ukázala první skutečná směrnice

Zdroj: *Speciální plachetní směrnice — O pohár Vltavy 2026*, Marina Orlík,
5. 9. 2026. Pořadatel Plachtič z Vltavy, hlavní rozhodčí Miloš Zvonař.
První doklad z provozu, ne z doslechu.

**Potvrzuje, co plán předpokládal:**

- Nízkobodový systém, výslovně jmenovaný.
- Zastávku pořádá cizí subjekt a má vlastní ředitele závodu.
- Vytrvalostní závod je „dálková plavba" — jedna rozjížďka, žádné škrty.
- Dvě úrovně vyhodnocení. Směrnice říká doslova, že *„pořadí do Orlické série
  bude dopočteno"* — závod má vlastní výsledek a do poháru se z něj teprve
  odvozuje. Přesně proto jsou na `Zavod` dvě sady polí.

**Co je nové a plán to nepokrýval:**

1. **Závod má vlastní kategorie, které se sérii nerovnají.** Tenhle má
   „celkové pořadí" a „dřevěné lodě" — dřevěná loď není kategorie seriálu,
   je to skupina pro ceny na téhle jedné zastávce. Přesouvá to položku
   *Kategorie na jednotlivý závod* z hypotézy mezi pozorované potřeby.

   Nedělá se teď: pro veřejné čtení i bodování stačí kategorie ze série
   a závodní skupiny jsou zatím věc vyhlašování cen, ne dat.

2. **Ředitel závodu není rozhodčí.** Směrnici podepisují oba a je to jiný
   člověk. Plán má roli `Rozhodčí`, ale pořadatele bere jako text na závodě.
   Až budou role ostré, jsou to dvě různé funkce v rozsahu jedné zastávky.

3. **Oficiální vývěska je dnes fyzická tabule.** Směrnice odkazuje na
   „informační tabuli ZK". To je částečná odpověď na otevřenou otázku, jestli
   má být appka oficiální vývěskou: dnes není a nic na ní nestojí. Změnit to
   může jedině plachetní směrnice, ne my.

4. **Zdrojové dokumenty jsou lidské a chybují.** Tenhle má v hlavičce termín
   5. 9. 2026 a v časovém programu „Sobota 6.9.2025" — jiný rok i den.
   Import proto nesmí data tiše dopočítávat ani opravovat; co je v rozporu,
   patří ukázat člověku.

## Co říkají skutečná data

Zdroj: dva sešity *Pořadí Orlická série 2026* od rozhodčího, zachycující
tutéž sezónu po šesti a po sedmi závodech. Rozdíl mezi nimi prozradí víc
než jeden sešit sám.

**Potvrzeno:**

- **Tři kategorie**, ne čtyři: `pořadí do 7m`, `pořadí nad 7m`, `RACE`.
  Neověřená stopa z článku o čtyřech kategoriích tedy neplatí.
- **Devět zastávek v ročníku 2026:** Jarní vítr, Radavská regata,
  24hodinovka, Vánoční regata, Izolepa, FxCK Cancer, Radavský pohár,
  O pohár Vltavy, Pohár Slunce. Ne dvanáct.
- **Lodě se vedou jménem**, bez čísla plachty. Import páruje stejně —
  odpovídá to tomu, jak s daty zachází rozhodčí.
- **Rozjížďky se zapisují po kategoriích.** Ruční zápis z vody má tři
  sloupce (DO 7M, NAD 7M, RACE), každý s vlastním pořadím a víc rozjížďkami.

**Závod se vyhodnocuje dvakrát najednou.** Výsledková listina má sloupce
*Celkové pořadí* i *Pořadí kategorie*, a to pro každou rozjížďku zvlášť.
Nejde tedy o volbu mezi celým polem a kategoriemi — počítá se obojí a každé
slouží k něčemu jinému: celkové pořadí pro vyhlášení závodu, pořadí
v kategorii pro seriál.

**Škrtá se jeden nejhorší závod.** Tím je zodpovězená první otevřená otázka.
Sloupec „Body přepočet" odpovídá součtu bez nejhoršího výsledku: PEZI má
0+12+1 = 13 a přepočet 1, tedy bez dvanáctky; M1 má 44 a přepočet 31, tedy
bez třináctky.

**Co z dat čistě nevychází a patří se zeptat:**

1. **24hodinovka je bonusová, ne násobená.** Filip slyšel, že „se počítá
   dvakrát". Data ale ukazují posun celého pole o jedničku dolů, ne násobek:
   vítěz −1, druhý 0, třetí 1 — a stejně ve všech třech kategoriích.

   Koeficient 2 by dal druhému 2 body a osmému 14; bonus mu dá 0 a 6.
   V seriálu je to propastný rozdíl, takže **tohle je potřeba potvrdit
   od rozhodčího dřív, než se to naprogramuje.**

   Pokud platí bonus, není to `KoeficientDoSerie` — to pole násobí. Byl by
   to samostatný odečet na závodě, nebo se 24hodinovka dá zapsat prostě tak,
   jak je: hodnotami, které rozhodčí spočítal.
2. **Několik řádků škrtu neodpovídá.** LUNA i MAMBA mají přepočet vyšší,
   než by drhnutí nejhoršího dalo. Je na −1 zvláštní pravidlo, nebo je to
   překlep?
3. ~~**ČERVENÉ CAFE má ve 24hodinovce 20.**~~ **Nejspíš vysvětleno.**
   24hodinovka se jede a vyhodnocuje jako **jeden celek přes celé pole**
   (Filip, s výhradou „tuším"). Odstoupivší loď proto dostala místo za
   posledním z celé flotily, ne ze své kategorie — odtud dvacítka.

   Do seriálového sloupce se pak to číslo opsalo tak, jak bylo, protože loď
   s kódem žádné **pořadí v kategorii** nemá a nebylo co přepočítat. Není to
   trest ani překlep: je to místo, kde ruční přepočet nemá pravidlo.

   **Rozhodnutí, které z toho plyne pro počítání:** i u závodu hodnoceného
   jako celé pole musí lodě s kódem dostat do seriálu hodnotu odvozenou
   z **jejich kategorie**, ne z celkového pořadí. Jinak jeden odstup zničí
   celý ročník — dvacítka v seriálu je víc než součet čtyř běžných závodů.

   **A je to nejlepší doklad, proč tabulka nestačí.** V Excelu není kam
   napsat, že loď *odstoupila*; zbylo po ní jen číslo a jeho původ se musí
   luštit zpětně. Model drží `PoradiVCili` a `Kod` odděleně, takže „RET"
   zůstane zapsaný jako fakt a body se z něj počítají. Za rok se nikdo
   nebude ptát, odkud se vzala dvacítka.

**A hlavní důvod, proč tenhle projekt vzniká:** v sešitu má vzorec **jediný
sloupec** — `Body` jako `SUM(B:J)`. `Pořadí`, `Body přepočet` i `Pořadí
přepočet` jsou psané rukou. Škrt i seřazení tedy dnes dělá člověk v Excelu
u každé změny znovu, pro tři kategorie zvlášť. To je přesně ta práce, kterou
má převzít počítání z fáze 2.

### Fáze 3 — co stojí a co zbývá

Kostra appky v `app/` (Expo, expo-router) a čtyři obrazovky: ročníky,
kalendář, průběžné pořadí, zastávka s výsledky nebo se seznamem přihlášených
lodí. Barvy má appka stejné jako web, protože je to jeden produkt.

| Zbývá | Proč to ještě není |
|---|---|
| ~~Vyzkoušet na skutečném telefonu~~ | hotovo 8. 9. 2026 — `npm run telefon` |
| ~~Sdílený klient z OpenAPI~~ | hotovo 8. 9. 2026 — `packages/api-client/generuj.sh` |
| Ikona a splash | jsou ze šablony |
| ~~Vydání (APK)~~ | hotovo 8. 9. 2026 — `npm run apk`; iOS odloženo, viz níž |

**Podoba tabulek čeká na rozhodčího, neladí se dopředu.** Filip, 8. 9. 2026:
až dorazí, jak se pořadí doopravdy počítá, bude se doplňovat počítání
i to, co se kde zobrazuje. Ladit rozložení dřív znamená stavět na pěti
dohadech (bonus u 24hodinovky, pořadí kódů, škrt, neúčast, koeficient) —
a překreslovat pak obojí, jen podruhé dráž.

Co je hotové, tedy **stačí, že je čitelné a pravdivé**; hezké bude, až bude
co ukazovat. Otevřené otázky jsou vypsané výš u bodování a u protestů.

**Účet u Applu se zatím neplatí.** Filip, 8. 9. 2026: 99 $ ročně je moc na
to, aby si člověk jen hrál. Appka tedy zůstává v Expo Go na vlastním telefonu
a pro ostatní se počítá s Androidem, kde je instalace APK zdarma. Zaplatí se
to ve chvíli, kdy o appku bude zájem — tehdy to bude výdaj proti něčemu,
ne do prázdna.

Co z toho plyne pro pořadí prací: **push upozornění se dají vyvíjet jen na
Androidu**, protože na iOSu potřebují development build a ten bez placeného
účtu nevznikne. Fáze 7 se tím nezastaví, jen začne na druhé platformě, než
bylo v plánu.

**Datum se v appce formátuje ručně.** `toLocaleDateString` závisí na tom,
co má telefon v sobě, a Hermes nemusí mít plné Intl — je to tatáž past jako
alpine bez ICU na serveru. Deset názvů měsíců je levnější než závislost na
prostředí.

### Fáze 2 krok za krokem — hotovo

| # | Krok | Hotovo, když |
|---|---|---|
| 2.1 | ~~Body závodu a pořadí seriálu jako čisté funkce~~ | hotovo; `Bodovani.cs` a `Serie.cs` |
| 2.2 | ~~Testy proti sešitu rozhodčího~~ | hotovo; součet sedí na 37 lodích z 37, `SerieTests` |
| 2.3 | ~~Testy pravidla pro kódy a škrtů~~ | hotovo; `BodovaniTests` proti listině FxCK Cancer 2026 |
| 2.4 | ~~`GET /serie/{slug}/poradi`~~ | hotovo; obě čísla, jen zastávky ve stavu `Odjety` |
| 2.5 | ~~Body závodu počítá server~~ | hotovo; web je už nesčítá, jen ukazuje |
| 2.6 | ~~Stránka průběžného pořadí~~ | hotovo; jméno lodi a body ukotvené i na telefonu |

**Co zůstává na rozhodčím**, ne na kódu: bonus u 24hodinovky, pořadí kódů za
`DNF` a `DNS`, pět řádků škrtu, které sešitu neodpovídají (LUNA, JOY, MAMBA,
SULA, FILOZEP), a co znamená neúčast na zastávce. Nic z toho se nedopočítává —
počítá se podle pravidla a rozdíl se drží na očích.

### Fáze 6 — blog a novinky

Hotové 9. 9. 2026: model `Clanek`, rozšíření importu, veřejné čtení a stránky
na webu. Co zbývá, je **psaní** — na to je potřeba administrace z fáze 5.
Do té doby se články nahrávají importem stejně jako výsledky a demo obsah
vyrábí `tools/gen-mock.py`.

**Jedna entita, dvě úrovně.** Článek má vždycky `SerieId` a volitelně
`ZavodId`. Vypadá to jako duplicita — závod svou sérii zná — ale je to
jediné místo, odkud se odvodí právo psát: pořadatel Radavské regaty smí psát
na stránku Radavské regaty a nikam jinam. Novinky ročníku se navíc načtou
jedním dotazem bez spojení přes závody.

**Adresa je vždycky `/serie/{serie}/novinky/{clanek}`**, i u článku zastávky.
Slug je unikátní v rámci ročníku, ne závodu, takže odkaz přežije, když se
článek k zastávce dodatečně připne nebo od ní odpojí.

**Tělo je prostý text**, odstavce oddělené prázdným řádkem. Markdown by
znamenal renderer na webu i v appce a rozhodnutí, co z něj povolit; HTML
sanitizaci cizího vstupu. Až bude potřeba víc, je to aditivní sloupec
s formátem — ne přepis toho, co je uložené.

**Články se importem nemažou**, na rozdíl od výsledků a účastí. Uvnitř
závodu je soubor úplná pravda, u blogu ne: až bude psát pořadatel
v administraci, import ročníku o jeho článcích vědět nebude a smazal by je.

**Nepublikovaná zastávka schová i svůj blog.** Bez toho by pozvánka
prozradila závod, který ročník ještě nezveřejnil.

| Zbývá | Proč to ještě není |
|---|---|
| ~~Psaní článků v administraci~~ | hotovo 11. 9. 2026 — `/sprava/{serie}/clanky` |
| ~~Fotky v článku~~ | hotovo 16. 9. 2026 — jeden hlavní obrázek na článek, viz *Fotky v R2* |
| ~~Pořadatel jako záznam, ne text~~ | hotovo 15. 9. 2026, viz *Pořadatel jako záznam* níž; vlastní obrázek 16. 9. 2026 |

### Pořadatel jako záznam

**Hotové 15. 9. 2026.** Filip chtěl u zastávky odkaz na web pořadatele
(v nové kartě) a medailonek: kontakt, mapku, popis a obrázek. Příklad:
Yacht Club Písek, `https://yachtclubpisek.cz/`.

| Kus | Kde |
|---|---|
| Entita, pravidla (web, kontakt, souřadnice, kdo smí) — čisté funkce | `Features/Poradatele/Poradatel.cs` (`Medailonek`) |
| Přiřazení podle jména, čtení a zápis | `Features/Poradatele/PoradateleSprava.cs` |
| `GET`/`PUT /sprava/serie/{serie}/poradatele/{poradatel}` | `Features/Poradatele/PoradateleEndpoints.cs` |
| Medailonek na stránce zastávky i akce | `web/app/medailonek.tsx` |
| Obrazovka `/sprava/{serie}/poradatele/{poradatel}`, odkaz z kalendáře | `web/app/sprava/[serie]/poradatele/` |

Rozhodnutí (Filip, 15. 9. 2026):

1. **Vlastní záznam, společný všem ročníkům.** YC Orlík pořádá čtyři
   zastávky a medailonek se píše jednou. `Zavod.PoradatelId` vede na
   záznam, `Zavod.Poradatel` zůstává jako kopie jména kvůli appce na
   telefonech a importu.
2. **Upravuje rozhodčí ročníku, nebo organizátor zastávky, kterou klub
   pořádá** (správce pokrývá obojí). Záznam je sdílený, takže organizátor
   Izolepy upraví medailonek YC Orlík i u Jarního větru — vědomá cena;
   obrazovka vypisuje, kde všude se změna projeví.
3. **Mapka je odkaz, ne vložená mapa.** Ukládají se souřadnice, web z nich
   skládá odkaz na Mapy.com a OpenStreetMap. Žádné cizí požadavky, žádný
   souhlas, žádný javascript.
4. **Kontakt: jméno, e-mail, telefon, adresa — jen vyplněné.** Jméno
   a telefon jsou osobní údaje; obrazovka to u polí říká.
5. **Obrázek.** Bez vlastního je u medailonku kurátorská fotka z Orlíku
   od Jiřího Tašla, vybraná podle klíče klubu a jen s kreditem (není to
   fotka klubu). Vlastní obrázek se nahrává od 16. 9. 2026, viz *Fotky
   v R2*; medailonek jen s ním už se na webu ukáže.

**Pořadatel vzniká ze jména, ne vlastním formulářem.** Kalendář i import
posílají text jako dřív a `PoradateleSprava.PriradAsync` k němu najde, nebo
založí záznam. **Páruje se podle slugu**, takže „YC Písek" a „yc pisek" jsou
týž klub a text na zastávce dostane jméno záznamu. Jiné jméno v kalendáři
přiřadí jiného pořadatele; **přejmenovat klub jde jen v medailonku** — a to
přepíše jméno na všech jeho zastávkách a změní slug. Přejmenovat na jméno
existujícího klubu nejde: sloučení je rozhodnutí o zastávkách, dělá se
v kalendáři.

**Adresu webu hlídá API, ne web.** Jde do `href`, takže se ukládá jen
`http`/`https`; `javascript:` a spol. neprojdou, bez schématu se doplní
`https://`. Web to kontroluje ještě jednou, než odkaz vypíše.

**Import medailonek nenese ani nepřepisuje.** Píše se v administraci
a nahrání ročníku by ho jinak smazalo — stejný důvod, proč import nemaže
články.

**Migrace naplnila záznamy ze stávajících jmen.** Slug v SQL (`translate`
s českými znaky, protože `unaccent` na serveru být nemusí) musí vycházet
stejně jako `Medailonek.Slug`; ověřeno na produkci, zastávky mají záznam.

**Medailonek se ukáže, jen když má co říct nad rámec jména.** Samotné jméno
stojí v podtitulku; když medailonek obsah má, jméno vede na něj (`#poradatel`).

**Radavský pohár pořádá Yacht Club Písek**, ne LK Radava (Filip, 15. 9.
2026). Opraveno v `tools/gen-mock.py`; Radavská regata zůstává u LK Radava.
Na produkci se to projeví přiřazením v kalendáři, nebo dalším importem
ročníku.

**Demo obsah je vymyšlený, ale nehádá.** Zpráva ze zastávky si bere vítěze
z vygenerovaných výsledků, aby si text s tabulkou neodporoval — rozpor mezi
článkem a čísly vypadá jako chyba webu, ne jako ukázka. Nejsou v něm žádné
citace ani jména lidí: jména zastávek a pořadatelů skutečná jsou, takže by
se text dal číst jako tvrzení o tom, co se doopravdy stalo.

### Fáze 4 — identita a role

**Zitadel poběží na vlastním stroji.** Filip, 9. 9. 2026. Nic neodtéká ven
a nad rámec CX23 to nic nestojí; cenou je půl až jeden gigabajt paměti na
stroji, kde už běží Traefik, Postgres, Seq, uptime a dvě aplikace, a to,
že upgrady Zitadelu jsou naše starost.

Hotové 9. 9. 2026, **všechno nezávislé na poskytovateli**:

| Co | Kde |
|---|---|
| `Uzivatel` s vlastním `Guid` | nikdy `sub` z tokenu, pravidlo platformy č. 5 |
| `UcetVazba` — `(issuer, subject) → UserId` | unikátní index nad **dvojicí**, ne nad subjektem |
| `Opravneni` — role v rozsahu | tvar shodný s `Clanek`: série vždy, závod volitelně |
| `Prava.Smi` | čistá funkce, sedm testů bez databáze |
| `Uzivatele` | překlad přihlášení na interní účet, pět integračních testů |

**Vazeb může být na uživatele víc.** Po přechodu na jiného poskytovatele se
přidá nová k témuž `UzivatelId` a stará se nechá být — historie oprávnění
i osob zůstane nedotčená. To je celý smysl té tabulky.

**Účet vzniká při prvním přihlášení.** Pozvat člověka znamená dát mu roli,
ne vyrobit mu předem účet, o kterém neví. Uživatel bez jediného oprávnění
nesmí nic nad rámec nepřihlášeného čtenáře, takže samo založení nic neotevírá.

**Rozhodčí není stupeň mezi editorem a správcem.** Editor nesmí schvalovat
a rozhodčí sám o sobě nesmí zadávat; správce má obojí, protože ve svém
rozsahu smí všechno. Kdyby rozhodčího pokrývala „vyšší" role, znamenalo by
schválení výsledku jen to, že ho někdo smí zapsat — a kontrola by ztratila
smysl. Hlídá to `PravaTests`.

**Čtenář se neuděluje.** Je to každý, i nepřihlášený, takže odpověď na něj
nesmí záviset na obsahu tabulky. Napsané to bylo nejdřív obráceně a našel
to test: prázdný seznam práv znamenal „nesmí ani číst".

**Dokončeno 9. 9. 2026.** Zitadel běží na `ucty.klihovka.cz` jako součást
stacku platformy, web má přihlášení a API ověřuje podpisy tokenů.

| Kus | Kde |
|---|---|
| Zitadel ve stacku | `platform/stack/docker-compose.yml`, postup v [ZITADEL.md](https://github.com/file-pb/platform/blob/main/runbooks/ZITADEL.md) |
| Ověřování tokenu | `Features/Identita/Poskytovatel.cs` |
| `GET /ja` | kdo jsem a co smím; při prvním přihlášení účet založí |
| Přihlášení na webu | `web/lib/oidc.ts`, cesty `/prihlaseni`, `/prihlaseni/zpet`, `/odhlaseni` |
| Profil v hlavičce | `web/app/profil.tsx`, na `<details>` — bez javascriptu |

**Dvě věci, které se budou opakovat u každé další aplikace** a stály čtyři
kola nasazení (rozbor je v [POUCENI.md](https://github.com/file-pb/platform/blob/main/docs/POUCENI.md), poučení 36):

1. **Aplikace musí mít *Auth Token Type* `JWT`.** Výchozí `Bearer Token` je
   neprůhledný řetězec, který se nedá ověřit podpisem.
2. **Profil se čte z `userinfo`, ne z tokenu.** Přístupový token jméno ani
   e-mail nenese; jsou v ID tokenu, a ten patří klientovi, ne API.

| Zbývá | Proč to ještě není |
|---|---|
| Udělování rolí | fáze 5, viz níž |
| Přihlášení v appce | tentýž tok s PKCE, ale s obnovovacím tokenem; na telefonu se sezení nedrží v cookie |

### Čím pokračovat ve fázi 5

**První krok je kuře a vejce a má navržené řešení.** Nikdo nemá jediné
oprávnění, takže se za přihlášení nikdo nedostane — a obrazovka, která
oprávnění uděluje, sama roli správce vyžaduje.

Návrh: endpointy `/sprava/serie/{slug}/opravneni` (výpis, udělení, odebrání)
vyžadují `Spravce` v té sérii, **s jednou výjimkou**. Udělení prvního
správce projde i na importní token — ale **jen dokud v té sérii žádný
správce není**. Bootstrap se tím sám zavře: první správce tu cestu zamkne
za sebou.

Proč importní token a ne nové tajemství: nové by se muselo vyrobit na
serveru, a tenhle už existuje a chrání zápis srovnatelné váhy (přepsání
celého ročníku). Je to vědomé rozšíření jeho významu, ne nedopatření —
proto ta podmínka, která ho po prvním použití vypne.

**Uděluje se podle e-mailu, ne podle identifikátoru.** Účet ale vzniká až
prvním přihlášením, takže komu se ještě nikdy nepřihlásil, roli dát nejde
a endpoint to řekne. Zvací tok je vlastní věc a dělat ho teď by znamenalo
řešit rozesílání pošty dřív než administraci samotnou.

**Hotové a zapojené 9. 9. 2026.** Endpointy `/sprava/serie/{slug}/opravneni`
běží — výpis, udělení, odebrání — a s nimi i bootstrap na importní token.

| Kus | Kde |
|---|---|
| Překlad slugů na rozsah, jediné místo s otázkou na právo | `Features/Sprava/Rozsahy.cs` |
| Pravidla udělení a bootstrapu, čisté funkce | `Features/Sprava/Udeleni.cs` |
| Čtení a zápis oprávnění | `Features/Sprava/OpravneniSprava.cs` |
| Endpointy a rozhodnutí, kdo smí | `Features/Sprava/OpravneniEndpoints.cs` |
| Ověření importního tokenu pro oba jeho účely | `Features/Import/ImportniToken.cs` |

`Uzivatele.PodleUctuAsync` najde uživatele bez toho, aby ho zakládal: kontrola
práv je čtení a čtení nemá měnit databázi.

**Čtyři rozhodnutí, která k tomu při psaní přibyla:**

1. **Posledního správce ročníku odebrat nejde.** Jinak se dá ročník zamknout
   ven jedním kliknutím a zpátky vede jen cesta přes tajemství na serveru.
2. **Rozhodčí ani správce nejdou udělit na jednu zastávku.** V tabulce rolí
   mají rozsah série; kdyby to endpoint pustil, vznikl by rozsah, o kterém
   plán mlčí a `Prava` ho tiše uznají.
3. **Druhé udělení téže role vrací týž řádek a 200.** Není to chyba, jen se
   nic nezměnilo — a unikátní index by z toho udělal pád na půl cesty.
4. **Týž e-mail u dvou účtů odmítne.** Vznikne to po výměně poskytovatele.
   Hádat, komu roli dát, je horší než odmítnout: špatný tip nikdo nepozná.

**Bez nakonfigurovaného poskytovatele se endpointy neregistrují vůbec**, ani
pro bootstrap. Role se dává existujícímu účtu a ten vzniká až přihlášením,
takže administrace bez identity nemá komu co udělit.

**Rozhodčí přiřazuje pořadatele a editora zastávce.** Filip potvrdil
14. 9. 2026. Víc ne: právo na celý ročník a roli rozhodčího uděluje jen
správce, jinak by si rozhodčí mohl rozšířit vlastní rozsah. Odebrat smí
rozhodčí jen to, co smí udělit. Pravidlo je `Udeleni.RozhodciSmiUdelit`,
obrazovka oprávnění podle `SmiNaRocnik` nabídne jen zastávkové role.

**Obrazovka je hotová** — `/sprava/{serie}/opravneni`, odkaz na ni je
v profilové nabídce u ročníků, kde je člověk správcem.

Celá je serverová a bez javascriptu: formulář odešle prohlížeč, serverová
akce zavolá API a stránka se překreslí s hláškou. Administrace se používá
zřídka a často z telefonu na břehu, takže hydratovat kvůli dvěma polím
nemá co vrátit. Token přitom zůstává na serveru — v prohlížeči je jen
cookie, kterou nikdo nečte.

**Oprávnění se vypisují po místech, ne jedním seznamem.** Správce ročníku
a pořadatel Radavské regaty jsou dvě různé věci a v jednom sloupci by
splynuly. Prázdná zastávka se schová, prázdný ročník ne: ročník bez
jediného oprávnění je stav, který se má vidět, kdežto devět prázdných
tabulek je jen šum.

**Výsledek se předává v adrese, ne hotovou větou.** Serverová akce zná jen
slugy, jména zastávek a rolí zná stránka — a „na zastávce radavska-regata"
je věta pro stroj. Přesměrování po zápisu tam musí být tak jako tak: bez
něj by obnovení stránky udělilo roli podruhé.

Falešné API (`tools/fake-api.py`) umí `/sprava` taky, takže obrazovka jde
vyvíjet a zkoušet bez databáze — včetně chybových stavů, které se na
skutečných datech vyrábějí špatně.

**Seznam přihlášených účtů přibyl 15. 9. 2026.** Filip dal tři role
e-mailu, na který se ten člověk ještě nepřihlásil. Všechna tři udělení
skončila „účet neexistuje“ a účet po přihlášení žádnou roli neměl, takže to
vypadalo jako „nemám možnost žádné editace“. Dohledávalo se to v databázi.

| Kus | Kde |
|---|---|
| `UcetDto`, `OpravneniSprava.UctyAsync` — účty, naposledy přihlášené nahoře | `Features/Sprava/OpravneniSprava.cs` |
| `PrehledOpravneniDto.Ucty` — volitelné, jen správci | `Features/Sprava/OpravneniEndpoints.cs` |
| Tabulka „Přihlášené účty“, našeptávání e-mailu, odkaz z hlášky | `web/app/sprava/[serie]/opravneni/page.tsx` |

Tři rozhodnutí (Filip, 15. 9. 2026):

1. **Seznam vidí jen správce.** Jsou v něm e-maily všech, kdo se kdy
   přihlásili, i lidí z jiných ročníků. Rozhodčí přiřazuje pořadatele
   zastávkám a obejde se bez něj: `Ucty` je u něj `null` a na neexistující
   účet ho upozorní udělení.
2. **Tabulka i našeptávání.** Našeptávání je `<datalist>` u pole e-mail,
   takže funguje bez javascriptu. Jen na něm by ale poslední přihlášení
   vidět nebylo, a o to šlo.
3. **Role jen v tomhle ročníku.** API je u účtu nevydává vůbec. Stránka je
   páruje přes `uzivatelId` s oprávněními, která v přehledu už jsou, takže
   role z cizích ročníků nejdou ven ani omylem. „Bez role“ je v tabulce
   schválně: je to přesně ten, kdo se přihlásil a čeká.

Změna API je aditivní (nové volitelné pole). Hláška „účet neexistuje“ pozná
web podle 404 z udělení a přidá k ní odkaz na seznam.

**Balíček JwtBearer šel přidat až po vypnutí VPN.** `dotnet restore` padal
na `NU1301: Socket is not connected`, zatímco `curl` na tutéž adresu vracel
200. Vypadalo to jako nedostupný NuGet — po vzoru nedostupného Docker Hubu —
a chvíli to tak stálo i tady v plánu. **Nebyla to pravda:** za vším byla VPN
do práce a s vypnutou VPN se stáhne i balíček, který není v cache. Celý
rozbor je v [POUCENI.md](https://github.com/file-pb/platform/blob/main/docs/POUCENI.md),
poučení 33.

Zůstává z toho jedna věc, která platí bez ohledu na příčinu: **ověřování
tokenu je v samostatném souboru** a model ani oprávnění na balíčku nezávisí.
Vzniklo to jako obcházení domnělé překážky, ale dává to smysl samo o sobě —
poskytovatel identity má být na jednom místě.

### Správa zastávek — kalendář

**Hotové a zapojené 11. 9. 2026.** Endpointy
`/sprava/serie/{slug}/zastavky` — výpis, založení, úprava termínu, posun
stavu a publikace — a obrazovka `/sprava/{serie}/kalendar`, odkaz na ni je
v profilové nabídce u ročníků, kde je člověk rozhodčí nebo organizátor.

| Kus | Kde |
|---|---|
| Přechody, termíny, adresa, řazení — čisté funkce | `Features/Zavody/Kalendar.cs` |
| Čtení a zápis kalendáře | `Features/Zavody/KalendarSprava.cs` |
| Endpointy a rozhodnutí, kdo smí | `Features/Zavody/KalendarEndpoints.cs` |

**Rozhoduje cílový stav, ne směr.** Do potvrzeného a zrušeného se zastávka
dostane přes rozhodčího, do vypsaného a odjetého přes organizátora — přesně
podle tabulky životního cyklu. Plyne z toho jedna věc, která není na první
pohled vidět: **stáhnout vypsaný závod zpátky smí rozhodčí, ne pořadatel.**
Vypsání už vidělo publikum a vzít ho zpět je zásah do kalendáře.

**Po jednom kroku, oběma směry.** Přeskočit dopředu nejde: vypsat závod na
termín, který rozhodčí nepotvrdil, by znamenalo, že si organizátor
odsouhlasil termín sám. Krok zpátky jde, protože překlep se musí dát vzít
zpět a stav zastávky je o kalendáři, ne o datech v ní. **Odjetý závod se
zrušit nedá** — jsou v něm výsledky, které se počítají do poháru. Zrušená
zastávka se vrací jako plánovaná, ne rovnou jako vypsaná.

**Pořadí zastávky se přepočítává podle data.** Kalendář se řadí časem a
pořadí je jen jeho zápis; bez přepočtu by zastávka doplněná dodatečně
skončila v ročníku až za Vánoční regatou, protože dostala nejvyšší číslo.
Shodné datum rozhoduje dosavadní pořadí, aby se dvoudenní víkend
nepřehazoval při každém uložení.

**Přesun si pamatuje první termín, ne předposlední** — ten, na který se lidé
chystali. **U plánované zastávky se nepamatuje vůbec:** předběžný kalendář
je návrh a hlásit u něj „přesunuto z" by znamenalo tvrdit, že něco platilo,
když nic neplatilo.

**Nabídku stavů posílá server.** Každý řádek nese seznam stavů, do kterých
ho ten konkrétní člověk může posunout. Kdyby si ho obrazovka počítala sama,
rozejde se to při první změně pravidla a člověk dostane „nemáš práva" na
tlačítko, které mu web sám nabídl.

**Kalendář se vypisuje celý, i pořadateli jedné zastávky.** Půlka kalendáře
není kalendář — pořadatel potřebuje vidět, co je kolem jeho termínu. Co smí
změnit, říká každý řádek.

**Publikace je vlastní příznak, ne stav, a přepíná ji správce.** Plánovaná
zastávka má být v kalendáři vidět dřív, než se cokoliv vypíše, a odjetá se
smí stáhnout, aniž by se odjetou přestala být. Že publikuje správce, je
*odvozené* — zůstává z dřívějšího plánu; bez toho by ale založená zastávka
zůstala navždycky neviditelná.

**Obrazovka je celá serverová a bez javascriptu**, stejně jako oprávnění
a blog: formulář odešle prohlížeč, serverová akce zavolá API a stránka se
překreslí s hláškou. Úprava termínu se rozbaluje přímo v kartě zastávky —
mění se zřídka a kvůli pěti polím není proč odcházet z kalendáře.

**Nápis na tlačítku se mění podle směru.** „Vypsat závod" u odjeté zastávky
by znamenalo, že se vypisuje znovu, přitom se jen opravuje překlep — proto
„Vrátit mezi vypsané". Že jde o návrat, ví jen ten, kdo zná dosavadní stav,
takže se to rozhoduje ve webu, ne v API.

**Pořadatel se v kalendáři přiřazuje jménem** (od 15. 9. 2026): text
najde, nebo založí záznam pořadatele a karta zastávky nabídne odkaz na jeho
medailonek — viz *Pořadatel jako záznam* ve fázi 6. Roli organizátora
zastávce dál uděluje obrazovka oprávnění; pořadatel není účet v systému.

### Workflow výsledků — jak je postavené

**Hotové a zapojené 11. 9. 2026.** Endpointy
`/sprava/serie/{slug}/vysledky` — rozcestník po zastávkách, rozjížďky jedné
zastávky, posun stavu a publikace — a obrazovky `/sprava/{serie}/vysledky`
a `.../vysledky/{zavod}`. Odkaz je v profilové nabídce a u každé zastávky
v kalendáři.

| Kus | Kde |
|---|---|
| Přechody, kdo smí, povinný důvod — čisté funkce | `Features/Zavody/Workflow.cs` |
| Čtení a zápis | `Features/Zavody/VysledkySprava.cs` |
| Endpointy a rozhodnutí, kdo smí | `Features/Zavody/VysledkyEndpoints.cs` |

**Zapisuje pořadatel, ověřuje a schvaluje rozhodčí, potvrzuje správce.**
Tabulka workflow výš má u `Navrzeno` napsáno „editor" — je to starší zápis
téhož. Podle novějšího zadání rolí píše editor **jen na blog**, kdežto
rozjížďky a výsledky spravuje organizátor, takže platí ten. Hlídá to
`WorkflowTests`.

**Zpátky se chodí přes revizi, ne krokem vedle.** Couvnout o stupeň nejde
ani správci: vrácení má povinný důvod a ten by se dal potichu obejít.
Z revize i z eliminace se vrací **jako návrh** — opravený zápis musí projít
ověřením znovu, jinak je revize jen zdržení.

**Správce smí přeskočit dopředu**, ostatním je každý stupeň něčí podpis.
Zůstává to z plánu a dává to smysl u ročníku, který si projde jeden člověk.

**Eliminováno není totéž co `DoSerie`.** `DoSerie` říká, že se rozjížďka
nepočítá do poháru, ale ve výsledku závodu platí — typicky běh pro míčky
z kopce na Izolepě. Eliminovaná neplatí nikde a na veřejné stránce po ní
nezůstane ani řádek.

**Veřejné čtení se od téhle změny ptá na publikaci rozjížďky.** Zastávka
ukáže rozjížďku i bez čísel, protože „jelo se" je pravda; nepotvrzené
pořadí pravda být nemusí. Do průběžného pořadí jde jen to, co je venku
a platí.

**Import přináší výsledky jako potvrzené a veřejné.** Je to zápis ze sešitu
rozhodčího, ne návrh — čísla prošla jeho rukama dřív, než soubor vznikl.
Kdyby přicházela jako nezveřejněná, nahrání ročníku by web vyprázdnilo;
a starší soubory, které o workflow nevědí, se kvůli tomu nemusí přepisovat.
Ze stejného důvodu migrace **dorovná i řádky, které v databázi už jsou**.

**Vrácení k revizi se rozbaluje v kartě, ostatní kroky jsou tlačítka.**
Důvod je povinný, takže se mezi úkony na jedno kliknutí nevejde — a psát ho
na vlastní stránce by znamenalo odejít od seznamu kvůli dvěma větám. Důvod
pak zůstává v kartě i po návratu do návrhu: kdo zápis opravuje, potřebuje
ho vidět právě tehdy.

**Nepublikovaná zastávka schová i publikovanou rozjížďku**, a obrazovka to
říká nahlas. Bez té věty by správce pouštěl čísla ven a divil se, že na
webu nejsou.

### Zápis výsledků

**Hotové 14. 9. 2026.** Endpointy `/sprava/serie/{slug}/vysledky/{zavod}/rozjizdky`
— přidání rozjížďky, čtení zápisu a uložení celé sady — a obrazovka
`/sprava/{serie}/vysledky/{zavod}/{cislo}`, odkaz na ni je u každé rozjížďky.

| Kus | Kde |
|---|---|
| Kdy se smí přepsat, co musí sada splnit — čisté funkce | `Features/Zavody/Zapis.cs` |
| Čtení, uložení, nová rozjížďka | `Features/Zavody/ZapisSprava.cs` |
| Endpointy a kdo smí | `Features/Zavody/VysledkyEndpoints.cs` |

**Zapisuje pořadatel zastávky, rozhodčí zápis jen vidí.** Kdyby ho směl
i měnit, ověřoval by sám sebe. Správce ho pokrývá jako všude.

**Přepsat jde jen návrh a vrácený zápis.** Od ověření čísla někdo podepsal
a cesta k opravě vede přes revizi s důvodem. Uložení vráceného zápisu ho
**do návrhu samo nevrací** — je to vědomý krok ve workflow a obrazovka po
uložení připomene, že ho má pořadatel udělat.

**Zapisuje se od vypsání, ne až po odjetí.** Výsledky se píšou na břehu
v den závodu a přepnout zastávku na odjetou je krok, na který se v tu
chvíli snadno zapomene. Do poháru jde tak jako tak jen odjetá zastávka.

**Ukládá se celá sada rozjížďky.** Loď, která v ní nemá pořadí ani kód,
výsledek nemá — tak se dá smazat i řádek zapsaný omylem. Uložení je jedno
`SaveChanges`, takže se nestane, že loď přijela a výsledek jí chybí.

**Formulář nabízí celý ročník, ne jen lodě s účastí.** Účast dnes přináší
jen import, takže na nové zastávce by nebylo co zapsat. Loď, která dostane
výsledek, dostane i účast — a ta je potvrzená, i když ji pořadatel předtím
jen přihlásil. **Smazáním výsledku účast nezmizí**, v jiné rozjížďce ho mít
může.

### Přihlášky lodí na zastávku

**Hotové 14. 9. 2026.** Endpointy `/sprava/serie/{slug}/zastavky/{zavod}/lode`
a obrazovka `/sprava/{serie}/prihlasky/{zavod}`, odkaz z kalendáře
i z výsledků zastávky.

| Kus | Kde |
|---|---|
| Kdy se přihlašuje, přechody, nová loď — čisté funkce | `Features/Zavody/Prihlasky.cs` |
| Čtení, přihlášení, přepnutí stavu | `Features/Zavody/PrihlaskySprava.cs` |
| Endpointy a kdo smí | `Features/Zavody/PrihlaskyEndpoints.cs` |

**Přihlašuje pořadatel, loď sama ne.** Filip, 14. 9. 2026: veřejný formulář
by znamenal sbírat kontakty, souhlas a ochranu proti spamu dřív, než je
o co stát. Samoobsluha jde přidat později. Rozhodčí přihlášky vidí, nemění.

**Stav je na účasti:** přihlášená → potvrzená, nebo zrušená, a oběma směry,
protože překlep se musí dát vzít zpět. Existující účasti migrace označila
za potvrzené — přišly ze sešitu rozhodčího. **Loď s výsledky zrušit nejde**:
zmizela by ze seznamu a výsledky by dál platily.

**Přihlašuje se od vypsání**, i po odjetí (kdo přijel, se ví až večer).

**Nová loď se stává účastníkem ročníku** v zadané kategorii, i s majitelem.
Loď se páruje podle názvu a osoba podle jména jako v importu. Loď, která
v ročníku je, v jiné kategorii přihlásit nejde — změna kategorie je
rozhodnutí správce, ne vedlejší účinek přihlášky. **Neúčast na dřívějších
zastávkách se nedopočítává**, čeká na rozhodčího.

**Import přihlášky pořadatele nemaže.** Soubor je úplná pravda o tom, kdo
jel, ne o tom, kdo se přihlásil — maže proto jen potvrzené účasti, které
v něm nejsou. Loď, kterou soubor má, je po importu potvrzená.

**Veřejně:** zrušená loď na stránce zastávky není, přihlášená nese
„čeká na potvrzení" (`UcastDto.Potvrzena`, aditivně).

**Pořadí, nebo kód, ne obojí.** Bodování by pořadí vedle kódu nevzalo
a zůstalo by číslo, které vypadá, že platí. **Stejné pořadí se hlídá
uvnitř kategorie**, ne přes celé pole: v cíli se čísluje přes všechny lodě
(v kategorii pak zbydou mezery), ale pořadatel, který čísluje každou
kategorii zvlášť, nesmí dostat chybu. Mrtvý dojezd se tím zapsat nedá;
až se objeví, je to otázka na rozhodčího.

**Čas se v zápisu nemění.** Formulář ho nemá a výsledek z importu ho nést
může — prázdná hodnota z obrazovky by ho tiše smazala.

**Při chybě se rozepsaná čísla vracejí v adrese.** Vzor „POST, pak
přesměruj" by formulář vyprázdnil a pořadatel by po jednom překlepu opisoval
třicet lodí znovu.

**Nová rozjížďka je návrh a na webu není** — stejně jako nový článek je
koncept. Číslo je o jedno vyšší než nejvyšší, ne počet.

### Appka se rozešla s modelem, protože není v CI

Zjištěno 11. 9. 2026. `app/src/components/ui.tsx` měl slovník stavů jako
`Record<StavZavodu, string>` bez `Potvrzeny` — tedy **chybu překladu, která
se nikdy nespustila**: CI staví obraz API a webu, ale `app/` se nedotkne.
Na webu tentýž slovník tutéž chybu chytil, protože `next build` typy
kontroluje.

Projevit by se to začalo právě teď: `Potvrzeny` na produkci zatím žádná
zastávka nemá, ale kalendář ho konečně umí nastavit — a appka by u ní
ukázala prázdný štítek. Doplněno i s barvou a s větou do „proč nejsou
výsledky".

**Zavřeno 11. 9. 2026**: úloha `appka` v CI pouští `npx tsc --noEmit` nad
`app/`, takže se další rozchod s modelem pozná na pull requestu, ne na
telefonu.

## Podněty z 14. 9. 2026

Filip, během dotahování fáze 5. Design přijde **až po funkční části**;
komunitní akce jsou ale funkce a mění model, takže jdou dřív.

### Komunitní akce v kalendáři (funkce)

*(zadáno)* Do kalendáře se mají dát zadat i akce, které s pohárem nesouvisí
— komunitní setkání a podobně. Zobrazují se **na druhém tabu kalendáře**
a dají se k nim psát články a upoutávky.

**Hotové 15. 9. 2026.** Akce je **zastávka jiného druhu** (`Zavod.Druh`:
`Pohar`, `Akce`), ne vlastní tabulka. Kalendář, stavy, publikace i články
přes `Clanek.ZavodId` tak platí beze změny; zakládá je rozhodčí a pořadatele
jim přiřazuje on, stejně jako u zastávek poháru.

Cenou je, že **každé místo, které počítá pohár, se ptá na druh**, ne jen
na stav — a to je celý seznam, který se musí hlídat:

| Místo | Co dělá s akcí |
|---|---|
| `GET /serie/{slug}` | `Zavody` jen kola poháru, akce zvlášť v `Akce` — appka o druhu neví |
| `GET /serie` | `PocetZavodu` počítá jen kola |
| průběžné pořadí | akci nebere, ani odjetou |
| číslování v kalendáři | každý druh zvlášť, akce neposune číslo kola |
| správa výsledků | akce v rozcestníku není, její stránka vrací 404 |
| rozjížďky, přihlášky lodí | `Kalendar.ProcNejdePoharove` odmítne |
| import | akce s rozjížďkami nebo účastmi neprojde |

**Druh se určuje při založení a nemění se.** Pohárová zastávka může mít
výsledky a přehodit ji na akci by je tiše vyřadilo z poháru.

Na webu mají kalendář ročníku i kalendář ve správě **taby Pohár / Komunitní
akce** — odkazy s parametrem v adrese, bez javascriptu. Stránka akce nemá
výsledky ani pravidla, jen novinky; štítky stavu jí říkají „oznámeno"
a „proběhlo".

### Design (až po funkcích)

**Hotové 15. 9. 2026**, všechno bez javascriptu:

- **Boky širokého monitoru** (`web/app/boky.tsx`), od 1500 px (dnes od
  1280 px a s widgety, viz *Widgety s cizími daty*), na všech
  veřejných stránkách: vlevo vedoucí tři lodě každé třídy, vpravo
  nadcházející zastávky a akce. Kde by se to se středem zdvojilo (průběžné
  pořadí, stránka ročníku), jsou v bocích novinky a plakát nejbližší akce
  — Filipova volba. Obal se o boky rozšíří, takže střed o místo nepřijde.
- **Taby lodních tříd** v průběžném pořadí, ve výsledcích zastávky
  a u přihlášených lodí — na zastávce, která se teprve pojede, i na stránce
  ročníku. Výchozí první třída, třída v adrese (`?trida=Pod7m`); jediná
  třída taby nemá a dostane nadpis.
- **Logo:** pata šedé plachty je za přední plachtou; šedý klín pod
  červenou už nevykukuje.
- **Znaky tříd** kreslí `app/scripts/ikona.py` z tvarů hlavního loga:
  jedna plachta v barvě třídy a písmeno jako vodoznak přes celý znak.
  Barvy určil Filip: Race červená, Nad7m tmavě modrá, Pod7m šedomodrá
  (šedá z loga by na bílém zmizela). Web znak **kreslí přímo do stránky**
  z dat, která skript zapíše do `web/app/znaky-trid.ts` — ne přes `<img>`:
  jen tak má průhledné pozadí a v tmavém režimu mu CSS dá světlejší
  odstíny. V tabu je velký 2,6 rem, dvakrát víc než první verze (Filip).
- **Pás partnerů** nad koncem stránky, posun v CSS, najetím se zastaví.
  **Loga jsou ukázková** a nakreslená jako zjevné zástupné značky — cizí
  logo skutečné organizace by na veřejném webu tvrdilo, že nás podporuje.
  Skutečná se vymění v `web/app/partneri.tsx` a `web/public/partneri/`.

**Otevřené:** v tmavém režimu tmavě modré plachty hlavního loga v hlavičce
skoro zanikají.

## Schéma řešení

Vykreslené schéma celého řešení — nasazení, vnitřek API a datový model —
leží v [docs/schemata/](schemata/). Je to **snímek k datu, ne živý zdroj
pravdy**: nic ho nepřegeneruje, když se kód změní. Když se rozejde s kódem,
platí kód.

## Fotky v R2

**Hotové v kódu 16. 9. 2026.** Jeden hlavní obrázek na článek a jeden na
medailonek pořadatele. Filip k ceně: R2 má 10 GB zdarma, zálohy z nich
berou 3,3 MB; pro pohár to vychází na nulu.

| Kus | Kde |
|---|---|
| Záznam o fotce, pravidla, adresy | `Features/Fotky/Fotka.cs` (`Nahravani`) |
| Přepočet do WebP, zahození EXIF | `Features/Fotky/Zpracovani.cs` |
| S3 klient a náhrada, když není nastavený | `Features/Fotky/Uloziste.cs` |
| Výměna a odebrání, úklid souborů | `Features/Fotky/FotkySprava.cs` |
| `PUT`/`DELETE …/clanky/{clanek}/obrazek` a `…/poradatele/{poradatel}/obrazek` | endpointy obou řezů |
| Formulář v administraci | `web/app/sprava/obrazek.tsx`, akce vedle |

Rozhodnutí:

1. **Soubor jde přes server webu a API, ne z prohlížeče rovnou do R2.**
   Přímé nahrání by chtělo podepsané adresy a javascript; takhle stačí
   obyčejný formulář a API soubor přepočítá dřív, než se cokoliv uloží.
2. **Každá fotka se přepočítá** na dvě varianty ve WebP (480 a 1600 px,
   nikdy se nezvětšuje). Tím zmizí EXIF s polohou a zároveň se ověří, že
   soubor je obrázek. Bere se JPEG, PNG a WebP do 15 MB a 60 Mpx;
   formulář HEIC nenabízí, takže iPhone fotku sám převede na JPEG.
3. **Autor a souhlas jsou povinné při každém nahrání.** Souhlas se ukládá
   jako to, kdo fotku nahrál a kdy (`Fotka.NahralId`).
4. **Nová fotka = nový klíč** (`fotky/{id}-{šířka}.webp`), takže soubor se
   pod jednou adresou nikdy nemění a má `immutable` cache.
5. **Odebraná nebo nahrazená fotka se maže i z R2.** Kdo fotku stahuje
   kvůli odvolanému souhlasu, čeká, že zmizí. Cena: obnova databáze ze
   starší zálohy může ukazovat na smazaný soubor — web pak ukáže prázdné
   místo, ne chybu.
6. **Bez nastavení aplikace naběhne** a jen nahrávání vrací 503. Web bez
   fotek je pořád web.
7. **Přepočet vždy jen jeden naráz** — rozbalená fotka zabere až 240 MB
   a API má limit 512 MB.
8. **ImageSharp 3.1**, ne 4: čtyřka chce při buildu licenční klíč.
   Licence je pro jednotlivce s obratem pod milion dolarů Apache 2.0;
   Dependabot má major verzi vypnutou.

**Co je potřeba, aby to na serveru běželo** (jednou, v Cloudflaru):

1. R2 → bucket `orlickypohar-fotky`, **EU jurisdikce**, Standard. Token
   se vydává pro jurisdikci zvlášť — token k bucketu bez EU na EU bucket
   nesáhne. Se špatným endpointem nebo tokenem vrací R2 `AccessDenied`,
   ne „bucket neexistuje". Smazáním bucketu se odpojí i vlastní doména.
2. Bucket → *Custom Domains* → `orlickypohar-foto.klihovka.cz`. Veřejný
   přístup jen přes tuhle doménu, `r2.dev` vypnuté.
3. Account API token *Object Read & Write* **jen na tenhle bucket**.
4. Na serveru: endpoint do `/opt/apps/orlickypohar/.env` jako
   `FOTKY_ENDPOINT=https://<účet>.eu.r2.cloudflarestorage.com` a klíče do
   `secrets/Fotky__KlicId` a `secrets/Fotky__Klic` (vlastník UID 1654),
   pak `docker compose up -d app`. **Hotové 16. 9. 2026**, zápis i čtení
   přes doménu ověřené. Access Key ID má 32 znaků, Secret 64 — R2 na
   prohozené hodnoty odpoví „Credential access key has length 64".

## Teplota vody

**Ze satelitu Landsat, v nádrži** (od 18. 9. 2026). Úloha `jobs/landsat`
počítá povrchovou teplotu v deseti oblastech, kde se plachtí, a posílá ji
do API (`POST /vodocet/teplota-hladiny`, tabulka `TeplotyHladiny`). Metoda,
místa a pasti jsou v [jobs/landsat/README.md](../jobs/landsat/README.md).
Web (`web/lib/satelit.ts`, `web/app/teplota.tsx`) ukazuje tři centra —
Radavu velkým číslem, Trhovky a Žďákov menším, každé jako medián se
sousedy — změnu proti předchozímu snímku v okně 14 dní a graf Radavy
a Trhovek za 60 dní. Starší snímek než 30 dní widget schová.

**Je to odhad, ne měření:** horní vrstva kolem poledne, neověřená
teploměrem, a widget to tak píše. Kalibraci udělá Filip ručním měřením
z konce mola (hráz, Radava, zámek, marina Orlík, Salaš) v termínech
přeletů Landsatu.

**Přítoky z ČHMÚ byly do 18. 9. 2026** (Lužnice, Lomnice, Skalice) a Filip
je vypnul: řeka o šest stupňů studenější než nádrž jachtaři nic neřekne.
`web/lib/teplota.ts` je smazaný.

**Nedělat:** teplotavody.cz je model, ne měření, a podmínky zakazují
stahování. Povodí Vltavy měří v nádrži jen po týdnech a vydává to jen jako
graf na mapě.

## Radar na příští hodinu

**Pod výstrahami ČHMÚ** (`web/lib/radar.ts`, 18. 9. 2026): jestli nad
Orlíkem prší, nebo kdy začne, a pás sedmi políček (teď, +10 … +60 min).
Zdroj je radarová extrapolace ČHMÚ na opendata (`composite/fct_maxz/png`,
po 5 minutách, venku zhruba do minuty) a měření `composite/maxz/png`.
Z PNG se čtou indexy palety v okruhu 8 km kolem bodu mezi Radavou
a Velkým vírem, žádný obrázek se neukládá ani nevykresluje.

- **Prahy podle stupnice ČHMÚ:** od 24 dBZ déšť (~1 mm/h), od 40 silný
  (~10 mm/h), od 52 přívalový, zpravidla bouřka.
- **Co radar neumí:** předpověď jen posouvá srážky, které už padají.
  Bouřku, která teprve vznikne, neukáže — widget to říká přímo.
- **Dál:** push v appce „déšť do hodiny", až bude Outbox (krok 7
  přihlášek).

## Vodočet Orlíku

**Přítok a odtok za 24 h z dat, ne okamžitý průtok krát den** (Filip,
16. 9. 2026). Povodí Vltavy vydává po hodinách jen hladinu a odtok,
přítok a objem ukazuje jen aktuální. Proto si je API sbírá samo:
`SberVodocetu` každých 10 minut uloží stránku do `MereniNadrze` a smaže
měření starší 3 dnů (tabulka nepřeroste ~430 řádků). Zapíná se proměnnou
`Vodocet__Sber`, jen v nasazení.

- **Odtok** se sčítá z hodinové řady Povodí. Elektrárna pouští vodu
  nárazově, desetiminutový vzorek by špičku minul.
- **Přítok** se integruje z vlastních měření (lichoběžníky). Dokud sběr
  nemá celý den, nebo v něm je díra delší než hodina, API vrací `null`
  a widget píše, že se sbírá.
- **Změna objemu** přímo z údaje Povodí slouží jako kontrola bilance.
- Přirovnání k olympijským bazénům Filip nechce.

Web už stránku Povodí nečte, bere `GET /vodocet/orlik`.

## Widgety s cizími daty

Doplňky stránky s daty odjinud (Filip, 16.–18. 9. 2026). Každý se načítá
na serveru s vlastní cache, **výpadek zdroje widget jen schová** —
stránka kvůli němu nespadne a ostatní widgety zůstanou (`doplnky()`
v `web/app/boky.tsx`, každý zvlášť v `try`).

| Widget | Soubor | Zdroj | Cache | Past |
|---|---|---|---|---|
| Vodočet | `app/vodocet.tsx` | vlastní API `GET /vodocet/orlik` (sběr z Povodí Vltavy, oddíl *Vodočet Orlíku*) | 5 min | Povodí posílá neúplný řetězec certifikátů, mezilehlý přibaluje API (`Features/Vodocet/Pvl.cs`) |
| Teplota vody | `app/teplota.tsx` | vlastní API, Landsat (oddíl *Teplota vody*) | 1 h | odhad, ne měření |
| Kvalita ke koupání | `app/koupani.tsx` | `geoportal.mzcr.cz`, `KoupaciVody_View` | 6 h | jen v sezóně, odběry starší 45 dní se nezobrazí; teplotu služba nemá |
| Vítr | `app/vitr.tsx`, `lib/vitr.ts` | opendata.chmi.cz `meteorology/climate/now/data`, 10min data | 10 min | zpoždění ~45 min; stanice Orlík a Kamýk měří jen srážky |
| Výstrahy ČHMÚ | `app/vystrahy.tsx`, `lib/chmi.ts` | CAP na opendata.chmi.cz, obvody Milevsko a Písek | 15 min | kódy ORP ověřené, některé přehledy je mají posunuté o jedna |
| Počasí | `app/pocasi.tsx` | vložená mapa Windy, bod mezi Radavou a Velkým vírem | — | pás předpovědi jen 5 dní, `calendar` mapu neposune, tmavý režim nemá |

**Vítr** (18. 9. 2026): nahoře Vráž (16 km, nejbližší stanice s větrem),
pod ní Nadějkov, Příbram, Kocelovice a Temelín. Stahují se jen prvky
`F` (rychlost), `Fmax` (náraz) a `D` (odkud fouká) z dnešního
a včerejšího souboru stanice. Rukáv v kompasu míří po větru, pět pruhů
po 3 uzlech jako skutečný. Barva nárazů: do 5 m/s klid, do 8 čerstvý, do
11 silný, nad to prudký. Upozornění na stočení o víc než 90° za 30 minut,
jen při větru aspoň 2 m/s.

**Windy v tmavém režimu** je ztlumené na `brightness(0.82)`. Windy tmavý
režim nemá (skript vloženého okna žádný parametr vzhledu nečte) a do
cizího iframe styl nesáhne; invertovat barvy nejde, přestaly by odpovídat
stupnici.

**Windy API ne** (18. 9. 2026): upozornění z Windy jsou jen v appce pro
jednoho uživatele, API na ně není. Point Forecast API zdarma vrací
„randomly shuffled" data jen pro vývoj, ostrý tarif stojí 990 € ročně.

### Rozložení

Widgety nikdy nerostou přes celou šířku středu — velké byly „špalky"
(Filip, 18. 9. 2026). Místo toho se se šířkou okna přesouvají
(`web/app/boky.tsx`, `globals.css`):

| Šířka | Boky | Pod obsahem |
|---|---|---|
| od 1920 px | pořadí a kalendář; pravý bok drží své widgety | 5 sloupců |
| 1600–1920 px | totéž | sloupce po 18 rem |
| 1280–1600 px | pořadí a kalendář s widgety | dva sloupce (`stredDoplnky`) |
| pod 1280 px | nejsou | všechny widgety ve sloupcích, na telefonu pod sebou |

Stránka si rozdělení určí parametry `vlevoDoplnky`, `vpravoDoplnky`
a `stredDoplnky`. Pravidla: **boky mají vyjít zhruba stejně vysoké**
(měří se na 1440 a 2000 px), pravý bok pod krátkým kalendářem nesmí zet
prázdný, a **meteo stojí pohromadě** — teplota, vítr, výstrahy a počasí
za sebou, výstrahy vždy vedle počasí.

**Pojmenované oblasti mřížky jen tam, kde je mřížka definuje** (PR #25,
18. 9. 2026). Přiřazení `grid-area` platilo na všech stránkách, oblasti
ale definuje jen úvod; stránka pořadí a ročníku dostala nedefinovanou
oblast, prohlížeč přidal skryté sloupce a widgety se rozstřelily. Oblasti
platí jen do 1600 px — výš by vyšší specificita přebila reset řady.

## Veřejné přihlášky lodí (plán 17. 9. 2026)

Filip chce, aby loď na zastávku přihlásil kdokoliv z veřejnosti, s našeptávačem
podle lodí z dřívějších zastávek a ročníků, s workflow stavů a s kontakty
kapitánů. Navazuje na *Přihlášky lodí na zastávku* (dnes přihlašuje jen
pořadatel). Inspirace: Manage2Sail (profil lodi, přihláška oddělená od
prezence), vypsání závodů ČSJ (přihlášku podepisuje kapitán, souhlas
s pravidly).

### Rozhodnutí (Filip, 17. 9. 2026)

1. **Bez účtu a bez hesla.** Lidi se nemají otravovat. Přihláška je na
   důvěře, pořadatel nebo rozhodčí ji před zapsáním zkontroluje a nesmysl
   smaže. Proti robotům Cloudflare Turnstile a omezení počtu požadavků.
   Dobrovolné přihlášení přes Google/Facebook (Zitadel) může přijít
   později kvůli přehledu „moje přihlášky".
2. **Kapitán a kormidelník je jedna role.** Přihlásit smí kapitán
   i majitel; kontakt se vede u toho, kdo je uvedený.
3. **Kontakty jen e-mail a telefon.**
4. **Žádná uzávěrka ani kapacita.** Loď se běžně domluví po telefonu na
   startu 24hodinovky a pořadatel ji zapíše dodatečně — přihlašuje se
   od vypsání až po odjetí, jako dnes.
5. **Startovné je součást přihlášky, ale nic neblokuje** — jen příznak
   zaplaceno a poznámka.
6. **Číslo člena ČSJ volitelně.**
7. **Kontakty se drží do konce následující sezóny** (pozvánky na další
   ročník), pak se smažou.

### Stavy přihlášky

Stav říká, *jestli loď na závodě je*. Kódy výsledků (DNS, DSQ…) zůstávají
na rozjížďkách.

| Stav | Kdo | Význam |
|---|---|---|
| Požadavek | veřejnost | přišla, pořadatel ji neviděl |
| K doplnění | pořadatel | vráceno, něco chybí nebo nesedí |
| Zapsaná | pořadatel | přijato (dnešní `Prihlasena`) |
| Potvrzená | pořadatel | prezence, loď startuje (dnešní `Potvrzena`) |
| Odmítnutá | pořadatel | nepřijato, s důvodem; nesmysl se místo toho smaže |
| Odhlášená | kapitán přes pořadatele | předem odřekla (dnešní `Zrusena`) |
| Nedostavila se | pořadatel | byla zapsaná, nepřijela |
| Vyloučená | rozhodčí | diskvalifikace z celého závodu |

Každá změna jde do historie (kdo, kdy, důvod; důvod povinný u vrácení,
odmítnutí a vyloučení). **Propsání „nedostavila se" a „vyloučená" do
výsledků (DNC, DNE) čeká na rozhodčího** — stejné otázky jako dopočet
neúčasti.

### Našeptávač

Veřejné hledání podle názvu nebo čísla plachty přes lodě všech ročníků.
Předvyplní jen to, co je už veřejné: název, plachta, typ, poslední
kategorie, majitel, poslední kormidelník. **Kontakty nikdy** — jinak by
kdokoliv vylovil cizí e-mail napsáním názvu lodi.

### Kontakty

U osoby s historií: nový e-mail nebo telefon z přihlášky přibude jako nový
záznam s datem, starý se nepřepíše. Přihláška si drží kopii toho, co kapitán
zadal. Vidí je jen pořadatel zastávky, rozhodčí a správce ročníku.

### Kroky

1. Model: stavy, historie, kontakty s historií, kopie kontaktu, startovné,
   ČSJ; migrace dnešních stavů.
2. Veřejné hledání lodí (našeptávač).
3. Veřejný formulář na stránce vypsané zastávky, Turnstile, omezení.
4. Obrazovka pořadatele: fronta požadavků, zapsání, vrácení, odmítnutí,
   smazání, prezence, startovné, kontakty.
5. Úklid kontaktů po sezóně (plánovaná úloha).
6. Propsání do výsledků — po odpovědi rozhodčího.
7. E-maily kapitánovi při změně stavu — s Outboxem z fáze 7.

**Kroky 1–5 hotové 18. 9. 2026** (model, našeptávač, veřejný formulář,
obrazovka pořadatele, úklid kontaktů). Zbývá propsání do výsledků
(čeká na rozhodčího) a e-maily (s Outboxem).

**Obrazovka pořadatele** ukazuje u každé přihlášky sbalené podrobnosti:
kapitána, kontakt (kopie z přihlášky, jinak poslední známý), posádku,
poznámku, kdy přišla, historii změn a startovné (zaplaceno + poznámka).
Přechody s důvodem se rozbalí až na kliknutí. **Smazat** jde jen požadavek,
vrácenou nebo odmítnutou přihlášku bez výsledků — a smaže se i loď,
přihláška do ročníku a osoby, které vznikly jen kvůli ní, aby se spam
neusadil v našeptávači. Zapsaná loď se odhlašuje, ne maže.

**Úklid kontaktů** (`UklidKontaktu`, zapíná `Kontakty__Uklid`) běží denně:
kontakt zadaný v roce R a kopie na přihláškách ze zastávek roku R zmizí
1. 1. roku R+2. Přihláška sama zůstává.

**Kroky 1–3:** (model, našeptávač, veřejný formulář).

**Našeptávač** je `GET /lode/napoveda` (`Features/Lode/Napoveda.cs`):
hledá přes všechny ročníky podle jména i čísla plachty, bez ohledu na
diakritiku a velikost písmen. Filtruje se **v paměti**, ne v SQL —
databáze nemusí mít `unaccent` (tatáž past jako u slugu pořadatelů)
a lodí jsou nižší stovky. Vydává jen veřejné údaje; kontakty nikdy,
což hlídá i test nad tvarem DTO.

**Veřejný formulář** je `/serie/{serie}/zavody/{zavod}/prihlaska`
a `POST /serie/{serie}/zavody/{zavod}/prihlasky`.

- **Dva kroky, protože web nemá javascript.** Nejdřív se vybere loď
  z nabídky prohlížeče (`datalist` se všemi loděmi poháru), pak se
  formulář zobrazí předvyplněný. Novou loď stačí napsat.
- **Kontakt se nikdy nepředvyplňuje** a je povinný (e-mail nebo telefon),
  jinak nemá pořadatel jak přihlášku doplnit. Povinný je i souhlas.
- **Vzniká požadavek**, ne zapsaná loď: na webu není, dokud ho pořadatel
  nezapíše. Loď, která na zastávce už jede, formulář podruhé nepřijme.
- **Proti robotům zatím jen past ve formuláři** (skryté pole a odeslání
  do tří vteřin) a strop 30 přihlášek na zastávku za hodinu. Turnstile se
  přidá, až spam skutečně přijde — nezakládá se kvůli němu nic dopředu.
- Kategorii lodi, která v ročníku jede, formulář nenabízí: mění ji správce.

**Krok 1 hotový 17. 9. 2026.** Stavy jsou aditivní: původní `Prihlasena`,
`Potvrzena`, `Zrusena` zůstaly pod svými jmény (appka je zná) a web je
jmenuje „zapsaná", „potvrzená", „odhlášená". Nové: `Pozadavek`,
`KDoplneni`, `Odmitnuta`, `Nedostavila`, `Vyloucena`. Historie v
`ZmenyUcasti`, kontakty v `KontaktyOsob`, kopie kontaktu, poznámka
a startovné na `Ucast`, číslo ČSJ na `Osoba`. Rozhodčí smí přepínat jen
vyloučení, pořadatel všechno ostatní. Zápis výsledků vyloučenou loď
nepřepne zpět na potvrzenou.

### Dál: účty a role vůči lodi, akcím a poháru

Filip, 17. 9. 2026 — výhled, ne teď. Přihlášený uživatel bude mít kromě
dnešních rolí (editor, organizátor, rozhodčí, správce) i role **vůči
lodi** — posádka, kapitán, majitel, fanoušek — a **vůči akcím a poháru**.
Dnešní model tomu nestojí v cestě: `Osoba.UserId` už existuje, historie
změn ukládá účet a kontakty visí na osobě. Přibude vazba účet × loď
s rolí (a obdobně pro akci a ročník); z ní pak „moje přihlášky",
odhlášení bez pořadatele a upozornění fanouškům.

## Kde se pokračuje

Kdo sem přijde z jiného stroje, potřebuje vědět tohle:

1. **Rozjezd** — [JINY-STROJ.md](https://github.com/file-pb/platform/blob/main/docs/JINY-STROJ.md)
   v platformě. Na pracovním Macu je nedostupný Docker Hub, takže integrační
   testy běží jen v CI a lokální databáze nejede vůbec.
2. **Web bez databáze** — `tools/fake-api.py` servíruje mock ročník
   ve tvarech skutečného API.
3. **Nasazení** — nic ručního. Push do `main` postaví obě image a háček je
   vymění na serveru i s `docker-compose.yml`.
4. **Otázky na rozhodčího** — tři, vypsané v oddílu *Co k tomu říkají
   závodní pravidla*: z čeho se počítá DNC, co znamenají nuly u zrušených
   zastávek a proč má DNF jiné body než DNS. Dopočet neúčasti na nich stojí.
5. **Fáze 5 je skoro hotová** (stav k 14. 9. 2026). Hotové: udělování
   oprávnění (i rozhodčím na zastávku), kalendář zastávek, přihlášky lodí,
   workflow a zápis výsledků, psaní novinek. Protesty a penalizace čekají
   na odpovědi rozhodčího. Komunitní akce v kalendáři hotové 15. 9. Další
   na řadě je **design** (oddíl *Podněty z 14. 9. 2026*). Pořadatel jako
   záznam s medailonkem hotový 15. 9.; vlastní obrázek pořadatele i fotky
   k článkům jsou v kódu od 16. 9. a čekají na bucket (*Fotky v R2*). Seznam přihlášených účtů na obrazovce oprávnění
   hotový 15. 9. (oddíl *Čím pokračovat ve fázi 5*).
6. **Skutečná data** — až dorazí, nahradí `data/2025-mock.json` a nahrají se
   importem. Struktura zůstane.
7. **Widgety** (stav k 18. 9. 2026, oddíl *Widgety s cizími daty*).
   Rozpracované v PR #26 (tlakový trend z Kocelovic ve větru) a #27 (radar
   srážek ČHMÚ na hodinu, `radar/composite/fct_maxz`, PNG v EPSG:3857,
   11,267–19,624° v. d., 48,047–51,458° s. š.). Pak push „déšť do hodiny"
   v appce. Blesky nemají volný zdroj (ČHMÚ je
   nedává, Blitzortung zakazuje komerční použití).

## Zbývá doladit

Nic z toho nebrání založit projekt a napsat první migraci.

1. ~~**Škrtají se v seriálu celé závody?**~~ **Zodpovězeno daty:** ano,
   škrtá se jeden nejhorší závod. Zbývá potvrdit, jestli je to vždy jeden,
   nebo se počet mění s délkou ročníku — a jak se škrt chová k záporným
   bodům ze 24hodinovky.
2. ~~**Seznam závodů a jejich typy.**~~ **Zodpovězeno daty:** ročník 2026 má
   devět zastávek — Jarní vítr, Radavská regata, 24hodinovka, Vánoční regata,
   Izolepa, FxCK Cancer, Radavský pohár, O pohár Vltavy, Pohár Slunce — a tři
   kategorie: do 7 m, nad 7 m, RACE. Stopa z článku o čtyřech kategoriích
   neplatila.

   Seriál se na Facebooku jmenuje **ORLÍK CUP** (skupina `148250098639632`),
   výsledky tam dává Miloš Zvonař z YC Písek. Skupina je zavřená: obsah se
   veřejně přečíst nedá a stahování příloh přes `facebook.com/download`
   vrací přihlašovací stránku. Odkazy přes `lookaside.fbsbx.com` fungují.
3. ~~**Výpadek API vypadá jako neexistující stránka.**~~ **Opraveno
   9. 9. 2026.** Výpadek se ošetřuje přímo ve stránce (`ApiNedostupne` →
   komponenta `Vypadek`), ne přes `error.tsx` — Next u výjimky v serverové
   komponentě dynamické cesty ukazoval stránku „nenalezeno".

   **Stav 503 zůstává neudělaný, a je to rozhodnutí, ne odklad.** Stránka
   výpadku vrací 200; správnější by bylo 503 s `Retry-After`. Next 16 na to
   nemá API — serverová komponenta stav odpovědi nastavit neumí (ověřeno
   9. 9. 2026 v nainstalované verzi 16.3.4) a jediná cesta je middleware,
   který si sám ověří zdraví API a při výpadku vrátí vlastní odpověď.

   Ta cena je vyšší než užitek: middleware nemá layout ani CSS stránky,
   takže výpadková stránka by přestala vypadat jako web, a ke každému
   načtení by přibyl dotaz na `/health/ready`. Stav 503 přitom čtenář
   nevidí — je pro roboty a monitoring, a ty na výpadek upozorní z
   `/health` samy. Zůstává tedy 200 a správná stránka; přehodnotit se to
   má, až bude web mít middleware z jiného důvodu.
4. **Co když loď kategorii přece jen změní** (nové plachty, přeměření).
   Návrh: správce ji smí přepsat a pořadí se přepočítá. Historie se nevede,
   dokud se neukáže, že je potřeba.
