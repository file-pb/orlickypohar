# Orlický pohár — plán

Pilotní projekt platformy. Seriál závodů plachetnic na Orlíku: web, veřejné
výsledky, administrace a mobilní přístup.

**Jméno projektu:** `orlickypohar` → `orlickypohar.klihovka.cz`
(bez pomlčky a podtržítka — jméno slouží zároveň jako databáze, role i subdoména).

**Stav k 8. 10. 2026: fáze 0 až 4 a fáze 6 hotové; ve fázi 5 zbývají
protesty a penalizace; fáze 7 a 9 nezačaté; z fáze 8 stojí bóje na trati.**
Co přesně chybí a v jakém pořadí to dělat, je v oddílu *Co ještě chybí
(audit 8. 10. 2026)*.

| | |
|---|---|
| `orlickypohar.klihovka.cz` | veřejný web (Next.js), běží |
| `orlickypohar-api.klihovka.cz` | API, běží |
| V databázi | dva ročníky: **2026 (nanečisto)** — 37 lodí, 8 zastávek (7 odjetých, 1 zrušená), 13 rozjížděk, 226 výsledků; jména, kategorie a pořadí v kategoriích jsou ze sešitu rozhodčího, rozjížďky vymyšlené (`data/2026-nanecisto.json`); **2027** — 9 plánovaných zastávek z termínové listiny rozhodčího, bez lodí a bez výsledků |
| Publikováno | **oba ročníky** (ověřeno na produkci 8. 10. 2026) — `/serie` vrací jen publikované (`SeznamAsync` ve `Features/Serial/SerieEndpoints.cs`) a vrací oba. Dřív tu stálo „ne, proto web hlásí zatím žádný ročník"; prázdný stav v kódu zůstává (`web/app/page.tsx`), jen ho produkce nepotkává. Soubor `data/2026-nanecisto.json` je nepublikovaný schválně, na produkci se nahrává `tools/gen-mock.py --publikovat` |
| Appka | čtecí, bez přihlášení — ročníky, zastávka, výsledky, pořadí (`app/src/app/`); v CI se jen kontrolují typy proti API, `npx tsc --noEmit` (úloha `appka` v `.github/workflows/build-deploy.yml`) |
| Nasazení | automatické: push do `main` → build → háček → server |
| Verze na produkci | API i web běží na tom, co je v `main`. Soudí se to podle `/verze` **obou** služeb, ne podle barvy běhu — konkrétní SHA se sem nepíše, zastará každým nasazením |

Bodovací pravidla jsou rozluštěná ze skutečných tabulek rozhodčího a ověřená
proti výsledkové listině závodu (viz *Co říkají skutečná data*). ~~Otevřená
zůstává jediná otázka — bonus u 24hodinovky.~~ **Bonus u 24hodinovky
potvrdil rozhodčí 22. 9. 2026** (oddíl *Pravidla seriálu od rozhodčího*)
a je naprogramovaný: hodnotu nese `Zavod.PosunDoSerie`
(`Features/Zavody/Zavod.cs`), `SerieBodovani.BodyDoSerie` ji přičítá
k umístění (`Features/Bodovani/Serie.cs`) a drží to `BodovaniTests`.
Otevřená zůstává dvacítka za diskvalifikaci a hodnocení trestů — na nich
visí protesty a penalizace z fáze 5 (8. 10. 2026).

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

**Tabulka je doménový model, ne stav kódu.** `Zarizeni` (fáze 7) ani
`Trasa` (fáze 8) zatím neexistují — stojí tu proto, že s nimi model počítá
a ostatní rozhodnutí se o ně opírají. Co je doopravdy napsané, říká oddíl
*Fáze*. Oponent 9. 10. 2026 z té tabulky vyčetl, že `Trasa` hotová je.

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

**Hotové 22. 9. 2026.** API vydává u regaty vedle pořadí po kategoriích
i `PoradiCelkem` — celé pole spočítané tímtéž výpočtem, jen s jednou
kategorií pro všechny. Je to **jen k zobrazení**: do poháru jde dál pořadí
v kategorii, jak stojí výš. Co se ukáže, řídí `Vyhodnoceni` na regatě:
*celé pole* jen celkovou tabulku, *po kategoriích* jen kategorie, *obojí*
obě jako záložky (celkové první, se starou značkou Orlického poháru).
Nastavuje se zatím **jen importem ročníku** — kalendář pravidla bodování
schválně nemá.

**Rozjížďka jde do poháru zařadit i vyndat** po jejím založení
(`POST .../rozjizdky/{cislo}/pohar`, tlačítko na stránce regaty). Dokud
jsou čísla rozepsaná, smí to pořadatel; u podepsaných je to zásah do
poháru a patří rozhodčímu. Výsledek regaty se tím nemění.

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

> **Od 22. 9. 2026 neplatí.** Kódy se bodují podle ZPJ A5.2: přihlášených do
> závodu + 1, všechny stejně (rozhodčí: „zadej si závodní pravidla… počet
> přihlášených lodí ve třídě plus 1"). Odstupňování níž je vyčtené
> z tehdejší listiny FxCK Cancer a nechávám ho tu jako doklad, proč se kód
> kdysi choval jinak.

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
šesté má 5. Kdo na zastávce nebyl, dostává **počet lodí své kategorie
přihlášených do toho závodu** — i těch, které se nakonec nedostavily. Od
22. 9. 2026 to takhle upřesnil rozhodčí, viz *Pravidla seriálu od rozhodčího*.

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
a `DSQ`, `OCS`, `RET`, `RDG` v číselníku `KodVysledku`
(`Features/Zavody/Zavod.cs`) jsou, vedle `DNF`, `DNS` a `DNC`. Chybí
jen další kódy ze standardu — `DNE` (diskvalifikace nezahrnutá do škrtů),
`UFD` a `BFD` (vlajkové starty), `ZFP` (dvacetiprocentní penalizace).
Je to řádek do výčtu, ne změna modelu — v databázi je `Kod` prostý `int?`,
takže migrace není potřeba. Propsat se to ale musí i do klienta: popisky
drží `KODY` ve `web/lib/vysledky.ts` jako vyčerpávající `Record<KodVysledku,
string>`, takže jakmile se přegeneruje `schema.d.ts` (`generuj.sh` ho píše
webu i appce), web bez nového řádku v `KODY` neprojde překladem
(8. 10. 2026).

**Neumí dvě věci:**

1. **Kód bez čísla nestačí.** Bodová penalizace přičítá body a náprava je
   naopak přiděluje (typicky průměr z ostatních rozjížděk, nebo body podle
   pořadí, které by loď získala). Obojí potřebuje u výsledku **číslo**, ne
   jen značku. Dnes není kam ho zapsat: `Vysledek` nese pořadí, dojezd, čas
   a kód, a **body se tam záměrně neukládají** — počítají se
   (doc u `Vysledek` ve `Features/Zavody/Zavod.cs`). Rozhodnutí komise tedy
   potřebuje vlastní místo, ne jen další číslo u výsledku, a **blokuje to
   dokončení fáze 5** (ne její začátek — oprávnění, workflow a zápis
   výsledků hotové jsou).

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

**Ne teď — jen s tím počítat.** Filipovo rozhodnutí z 8. 9. 2026. ~~Protest
bez administrace a bez identity nemá kdo zapsat~~ — **ten důvod odpadl**:
identita je hotová od 9. 9. 2026 a administrace mezi 9. a 14. 9. 2026
(`Features/Sprava/Rozsahy.cs`, `Features/Zavody/Workflow.cs`,
`Features/Zavody/Zapis.cs`). Odklad dnes drží dvě jiné věci: chybějící místo
pro číslo u výsledku (výš) a nezodpovězené otázky rozhodčího. Protest —
patří do fáze 5, kde vzniká zadávání a schvalování, a rozhodnutí komise je
přesně ten druh zápisu, u kterého musí být vidět, kdo ho udělal.

Do té doby se penalizace zapíše tak, jak se dnes zapisuje všechno ostatní:
kódem u výsledku; jediná stopa po projednaném protestu je stav `Schvaleno`
— „protesty vyřízené, pořadí platí" (`StavVysledku.Schvaleno`
ve `Features/Zavody/Zavod.cs`). Rozhodnutí, které se nedá vyjádřit kódem,
je ta chvíle, kdy je potřeba číslo — a teprve tehdy má smysl migrace toho
pole u výsledku.

**Hodnoty trestů jsou ale od 5. 10. 2026 verzované na ročníku** (oddíl
*Verze bodovacích pravidel*). Dvacítku za diskvalifikaci i přirážku za
nápravu drží `PravidlaBodovani.V1`
(`Features/Bodovani/PravidlaBodovani.cs`), ročník si nese číslo verze
(`Serie.VerzePravidel`, `Features/Serial/Serie.cs`) a obě čtecí cesty
si pravidla vyzvednou podle něj (`PravidlaBodovani.Podle` v `PoradiAsync`
a v `ZavodEndpoints.DetailAsync`). **Pro fázi 5 z toho plyne
postup:** až rozhodčí čísla upřesní — „na příští rok upravíme", 22. 9. 2026,
body za tresty se mají upravit na ročník 2027 — přidá se `V2` a ročníku se
přepne `VerzePravidel`. `V1` se neopravuje, protože podle ní se vyhlašovalo
(dnes 2026 i 2027). Vyhlášený ročník se nesmí pohnout.

Co z toho dnes počítá kód: náprava dostává místo hned za posledním
dokončivším (`BodyRozjizdky` ve `Features/Bodovani/Bodovani.cs`),
diskvalifikace pevných 20 bodů do seriálu (`BodyZaDiskvalifikaci`
v `BodyDoSerie`), ale **jen loď, která nemá v žádné rozjížďce nic jiného
než `DSQ`** (`diskvalifikovane` ve `VysledkyZavodu`) — jednotlivý `DSQ`
se boduje jako každý jiný kód, tedy přihlášených do závodu plus jedna.
Příznak diskvalifikace na účasti by byl přesnější a čeká na rozhodčího;
dokud není, je to odvozenina z kódů, ne zápis rozhodnutí komise.

**Co potřebuje odpověď od rozhodčího dřív, než se to postaví:**

1. Vede se dnes protest vůbec písemně, nebo se řeší domluvou na břehu?
2. Používá se bodová penalizace (procentní), nebo jen diskvalifikace?
3. Jak se dnes počítá náprava — průměr, nebo přidělené pořadí? Než odpověď
   přijde, dává kód místo hned za posledním dokončivším
   (`PrirazkaZaNapravu` v `Features/Bodovani/PravidlaBodovani.cs`) —
   provizorium, ne pravidlo (8. 10. 2026).
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

### Tělo článku: formát je od 23. 9. 2026 zapsaný, ne předpokládaný

**Zadání (Filip).** Pořadatelé budou tělo regaty stavět jako svou propagaci
a podle všeho vezmou Word nebo HTML a vloží ho. Náležitosti článku jim
předepíšeme formulářem — titulek, perex, datum, fotka, autor — ale do těla
si mají dát svůj obsah.

**Krok 1 z pěti, hotový:** sloupec `Clanek.Format` (`FormatClanku`).
Přesně to, co tu dřív stálo jako záměr — *„až bude potřeba víc než odstavce,
je to aditivní sloupec s formátem, ne přepis toho, co je uložené"*. Nic se
nepřepsalo: `Text` je nula i výchozí hodnota, takže stará těla, starší
importní soubory i klienti, kteří o sloupci nevědí, znamenají dál totéž co
doteď. Kolej vede z konce na konec — soubor → import → databáze → veřejné
čtení → web — a ověřuje to `ClankyTests`.

**`Html` je zatím připravená kolej bez čističky.** Nikdo ho nevytváří a web
tělo v tomhle formátu **vypisuje jako text, ne jako značky**. Není to
nedodělek, ale pořadí prací:

- Schránka z Wordu nenese text, nese balast — `mso-*` styly, vlastní fonty,
  pevné velikosti v bodech, tabulky místo rozvržení. Uložené tak, jak přišlo,
  rozbije stránku a na mobilu přeteče.
- **Nevyčištěné HTML z databáze je XSS.** Pořadatel není útočník, ale jeho
  schránka může nést cokoliv a jeho účet se dá ukrást. Obrana je whitelist
  značek a atributů **při ukládání**, ne až při zobrazení.

Dokud čistička není, je vypsat zdrojový text bezpečnější než ho pustit do
stránky. Ověřeno: tělo `<p>…</p><script>alert("xss")</script>` se vykreslí
jako text a žádný `<script>` na stránce nevznikne.

**Kroky 2 a 3 hotové (23. 9. 2026): čistička a vykreslování.** Přišly
spolu schválně — čistička, jejíž výsledek web neumí zobrazit, by dodala
horší stav než žádná.

**Čistička nevrací HTML, ale strukturu.** Obvyklá cesta je whitelist značek
a pak `dangerouslySetInnerHTML`; bezpečnost pak stojí na tom, že whitelist
nemá díru. Tady se vrací bloky (`Features/Clanky/Bloky.cs`), které web
vykresluje vlastními komponentami — **surové HTML se do stránky nedostane
nikdy**. Chyba v rozboru pak znamená špatně zobrazený text, ne XSS. Je to
bezpečné konstrukcí, ne úplností seznamu.

Do bloků se vejde: odstavec, nadpis (H2 a H3), seznam (číslovaný i ne),
odkaz, obrázek, tučné a kurzíva. H1 se srovná na H2, protože H1 je titulek
článku. Co se nevejde, zmizí; u `script`, `style`, `iframe` a spol. i s
textem uvnitř, aby se do článku nevysypal javascript jako text.

**Čistí se při zápisu, ne při zobrazení.** V databázi tak nezůstane HTML,
na které by si někdo mohl sáhnout bez očisty. `FormatClanku.Html` je proto
**jen vstupní hodnota** — import ji převede a uloží `Bloky`.

**Vlastní rozbor, ne knihovna.** Pracovní stroj se na nuget.org nedostane
(`Socket is not connected`), takže `HtmlSanitizer` ani `AngleSharp` přidat
nešlo. Pro tenhle účel to nevadí: nepotřebujeme plnou specifikaci HTML5, ale
rozpoznat hrstku značek a zbytek zahodit — a protože se výstupem nevrací
HTML, chyba v rozboru není bezpečnostní. Kdyby se knihovna jednou přidala,
nahradí jen ten jeden soubor; tvar bloků zůstane.

**Krok 4 hotový (23. 9. 2026): vkládací pole v administraci.** U nového
i upravovaného článku je políčko *„Text je vložený z Wordu nebo z webu"* —
zaškrtnuté znamená `Html`, server text vyčistí a uloží jako bloky. Bez
javascriptu, jako zbytek správy: je to `<input type="checkbox">`, o zbytek
se stará server.

**Autor vidí, co se doopravdy uložilo.** Uložené bloky se do pole vracejí
jako HTML (`Bloky.DoHtml`), ne jako původní vložený text — co čistička
zahodila, je pryč, a autor to má vidět hned, ne až na webu. Druhé uložení
proto nic nemění: `ZHtml(DoHtml(bloky))` dá tytéž bloky a hlídá to test.
Políčko u takového článku zůstává zaškrtnuté; odškrtnutím by se z HTML
staly odstavce plné značek.

**Adresy nesmějí nést uvozovky, špičky ani bílé znaky.** Vyplavalo to
z testu zápisu do HTML: `Uri.TryCreate` takovou adresu překvapivě přijme,
a i když ji zápis escapuje, nemá smysl ji vůbec ukládat — do `src` se pak
nedostane nic, co by se muselo hlídat až na výstupu.

**`tools/fake-api.py` vložený text nečistí**, jen si formát pamatuje.
Opisovat parser HTML do Pythonu by znamenalo mít dvě různá pravidla; jak
bude článek vypadat, se pozná proti skutečnému API. Falešné API tedy vrací
`Html`, a to web vypisuje jako text, takže se při zkoušení nic nerozbije.

**Krok 5 hotový (23. 9. 2026): obrázky v těle — a hlavně jejich meze.**

Zadání (Filip): *„pokusme se je upravit tak, aby nám nezbouraly web… nenecháme
si to sestřelit obsahem, nejsem Onassis."* Rozpadá se to na tři různé věci
a každá se řeší jinde:

| Čeho se bát | Čím je to ošetřené |
|---|---|
| obrázek rozhodí rozvržení | CSS `object-fit: cover` s pevnou výškou — platí už dřív, ať má obrázek jakékoli rozměry |
| nahraná fotka je obrovská | přepočet na WebP nejvýš 1600 px, vstup do 15 MB a 60 Mpx (`Nahravani`, `Zpracovani`) |
| **odkaz na cizí obrázek** | **nově: v těle projde jen obrázek z našeho úložiště** |

Třetí řádek je ten podstatný a předtím chyběl. U fotky nahrané k nám velikost
srazí přepočet; **u cizí adresy ji neřídíme nijak** a zaplatí ji každý, kdo
článek otevře. `Bloky.ZHtml` proto bere adresu našeho úložiště a obrázek
odjinud zahodí. Kdo chce mít v textu fotku, nahraje ji.

**Nahrání do těla** je `POST /sprava/serie/{serie}/clanky/{clanek}/obrazky`
a ve správě vlastní sekce *Obrázky v textu* — bez javascriptu, jako zbytek
správy. Nic nenahrazuje, na rozdíl od hlavního obrázku jich může být víc;
autor dostane hotovou značku `<img …>` k vložení do textu. Fotky nesou
`Fotka.VTeleClankuId`, takže jdou autorovi vypsat a jednou i uklidit.

**Limity na tělo** (`Bloky.NejvicBloku`, `NejvicZnaku`, `NejvicObrazku`):
300 bloků, 40 000 znaků, 20 obrázků. Správa je hlídá **před** uložením
a vrací větu — autor má vědět, že se text nevejde, ne dostat tiše oříznutý
článek. `ZHtml` je dodrží i sám, jako pojistka pro import, kde by chyba
shodila celou dávku kvůli jednomu článku.

**Falešné API umí od 23. 9. 2026 i správu obecných článků** — přehled,
detail, založení, úpravu, stav a obrázky v těle. Do té doby je neznalo
a obrazovka `/sprava/web/clanky` se nedala otevřít, takže se ta polovina
administrace zkoušela jedině proti nasazenému API. Zakládání i úprava
článku jsou teď parametrizované seznamem, ne napsané dvakrát.

**Platí to i pro obecné články mimo ročník** (`/sprava/web/clanky/{clanek}/obrazky`).
Nejdřív to byly jen články ročníku — vzniklo to kvůli pořadatelům — ale mít
dvě různá pravidla podle toho, kde článek leží, by si musel pamatovat každý,
kdo se toho příště dotkne.

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

**Neúčast ale musela dostat číslo, a v době psaní ho neměla.** Do součtu
se nepočítala vůbec. V nízkobodovém systému je chybějící zastávka **výhoda**:
kdo nejel, nemá co přičíst. Dokud se to nedoplnilo, vyhrála by ročník loď,
která přijede na poslední zastávku — a platilo to i bez téhle změny, jen se
dosud nemělo jak stát.

Obvyklé řešení v plachtění je **DNC = počet přihlášených v kategorii plus
jedna**, což na téhle stupnici (vítěz nula, tedy pořadí mínus jedna) vychází
na **počet lodí v kategorii**. Škrt nejhorší zastávky jednu neúčast schová,
druhou už ne — což je přesně ten účinek, který se od škrtu čeká.

**Vyřešeno 22. 9. 2026** — platná verze je v oddílu *Pravidla seriálu od
rozhodčího*. Rozhodčí odvození upřesnil: neúčast je tolik bodů, kolik lodí
kategorie bylo do toho závodu přihlášeno — ne kolik jich jelo. Loď, která se
přihlásila a nepřijela, číslo zvedá. Dopočet je v
[PoradiEndpoints.cs](../src/OrlickyPohar.Api/Features/Bodovani/PoradiEndpoints.cs)
hotový a jede přes všechny zastávky ročníku; kdo neúčast dostane, určují
přihlášky do ročníku, a ty žádné datum nemají — loď přihlášená uprostřed
ročníku má DNC i na zastávkách před svým přihlášením. Nikam se nezapisuje,
protože pořadí je odvozené, ne uložené.

#### Co k tomu říkají závodní pravidla (ověřeno 11. 9. 2026)

Zdroj: [Závodní pravidla jachtingu 2025–2028](https://rules.sailing.cz/#dodatek-a),
Dodatek A — český překlad ČSJ. **Filip, 22. 9. 2026: tohle je základní
set pravidel;** od rozhodčího mohou přijít upřesnění pro seriál. Odkaz je
i na veřejné stránce `/pravidla`.

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

**Odpovědi dorazily 22. 9. 2026**, viz *Pravidla seriálu od rozhodčího*:
DNC se počítá ze zastávky, zrušené zastávky jsou jen zápis a kódy v závodě
se bodují podle A5.2 — DNF i DNS stejně, přihlášených + 1.

## Novinky ze svazu a náš vlastní kanál (23. 9. 2026)

**Zadání (Filip).** Pohár má od Českého svazu jachtingu povolení čerpat
z jeho článků — **s podmínkou, že uvedeme zdroj s odkazem**. Když nám nic
nevyjde, mají výpis novinek plnit svazové: drží se **osm nejnovějších**
a novější vytlačují starší. **Naše články se nemažou nikdy.** Smyslem je
rozmanitost a plnost obsahu, ne archiv. Vedeme je jako kategorii
*Novinky ze svazu* a míchají se mezi naše podle data — v zimě, kdy se nic
nejede, je právě tam ta díra, kterou mají zaplnit.

**Zdroj je RSS, ne stránka.** `https://www.sailing.cz/rss/clanky`, na který
odkazuje hlavička jejich webu. Kanál dává titulek, odkaz, datum a perex
v HTML; **plný text ne**, takže se ani nepřebírá — karta u nás vede rovnou
na originál (`target="_blank" rel="noopener noreferrer"`). Vlastní stránku
u nás přejatý článek nemá, protože by neměla co zobrazit. Perex se čistí od
značek a entit a zkracuje na 400 znaků na hranici slova: do výpisu patří
upoutávka, ne cizí článek. Kanál sám dává až 575 znaků, takže nejdelší se
zkrátí.

| Kus | Kde |
|---|---|
| rozbor RSS a `og:image` — čisté funkce, žádná síť | `Features/Prevzate/Kanal.cs` |
| stahování, rotace na osm | `Features/Prevzate/SberPrevzatych.cs` |
| veřejné čtení | `GET /prevzate-clanky` |
| snímek kanálu k testům | `data/csj/clanky-2026-09-23.xml` |
| zdroje jako data | `Features/Prevzate/Zdroje.cs` |
| fotky u nás | `Features/Prevzate/PrevzateFotky.cs`, fronta `Features/Fotky/SouborKeSmazani.cs` |

**Zdroj je záznam, ne konstanta v kódu** (Filip, 2. 10. 2026): *„tohle je
model, který budeme používat i u jiných zdrojů, časem pokud se dohodne Miloš
i s jinými organizacemi, nebo jednotlivci."* Přidat další zdroj znamená
přidat řádek do `Zdroje.Vsechny` — jméno, odkaz, RSS, kolik článků se drží,
**s kým a kdy je to domluvené**, logo do štítku a případná zvyklost zdroje
na větší variantu obrázku. Rotace je **na zdroj**, ne dohromady: se společným
stropem by jeden hodně píšící zdroj vytlačil všechny ostatní.

**Fotka je ta od zdroje, ne naše náhradní.** Karta bez fotky být nemá
(Filip, 23. 9. 2026), a naše fotka lodi u článku o windsurfingu na Weymouthu
souvisí s textem jen tím, že je to voda. RSS obrázky nevydává, takže se bere
`og:image` ze stránky článku — u svazu ho má každý článek, a kde nemají
fotku, dají tam svoje logo. Když chybí i to, nastoupí náhradní sada jako
u našeho článku bez obrázku.

**Od 2. 10. 2026 si fotku ukládáme k sobě** (Filip): *„Raději bych to měl
u nás, aby nám to nebouralo web, když oni nepojedou."* Souhlas s tím svaz
dal; kdyby přestal platit, vypne se to proměnnou `Prevzate__Fotky` a uložené
fotky se při dalším běhu samy smažou. Předtím se držel jen odkaz na jejich
server — to zápis níž popisuje jako stav do 2. 10.

| Krok | Co se děje |
|---|---|
| výběr adresy | `og:image`, a je-li u zdroje zvyklost na větší variantu, zkusí se napřed (u sailing.cz `uploads_thumbs` → `uploads`, 1920 px místo 500) |
| strop | 8 MB na soubor, hlídá se i bez `Content-Length` |
| přepočet | tentýž jako u nahraných fotek: WebP 480 a 1600 px, pryč s metadaty včetně polohy |
| dolní mez | pod 600 px se fotka nebere — bývá to logo, a to vypadá hůř než naše náhradní fotka |
| loga | pozná je zvyklost zdroje (`NeniFotka`), ne velikost: logo ČSJ má v originále 711 × 800 px a prahem projde. U sailing.cz leží loga pod `/uploads/ikony-loga/`, fotky pod `/uploads/clanky/` |
| selhání | článek vyjde bez fotky; cizí server, který neodpovídá, není důvod novinku neukázat |
| mazání | při vytlačení z rotace jdou klíče do fronty `SouboryKeSmazani` **v téže transakci**, ve které mizí řádek |

**Fronta, ne okamžité mazání.** Řádek v databázi a soubor v R2 se nedají
smazat jednou transakcí; kdyby se mazalo rovnou, stačí jedno zaškobrtnutí
úložiště a v bucketu zůstane soubor, ke kterému už nevede žádný záznam.
Fronta je obecná a smí ji použít i cokoliv dalšího, co maže soubory.

**Velká karta na úvodu bere naši kopii** (od 2. 10. 2026). Dřív uměla jen
naši nahranou fotku, takže u přejatého článku spadla na náhradní sadu —
Filip to viděl na produkci jako „naše fotky u cizích článků". Když kopii
nemáme, použije se adresa u zdroje; měkčí obrázek je pořád lepší než fotka
lodi u článku o windsurfingu.

**Fotky se dobírají i zpětně.** Při každém běhu se zkusí stáhnout obrázek
k článkům, které kopii nemají a adresu u zdroje ano — jinak by po zapnutí
vypínače zůstaly staré články navždy na cizím serveru.

**Štítek zdroje nese jeho malé logo** (`ZdrojKanalu.Logo`, soubory ve
`web/public/zdroje/`). S víc zdroji je na první pohled vidět, odkud článek
je; jméno zůstává textem kvůli čtečkám. Logo ČSJ je oříznuté na samotnou
značku bez nápisu — v 15 px by byl nečitelný — a v tmavém režimu dostane
světlý kroužek, protože tmavě modrá značka by jinak splynula s pozadím.

**Kredit u naší kopie je jméno zdroje.** Fotografa od nich neznáme a vymýšlet
si ho nebudeme. Štítek zdroje a odkaz na originál zůstávají — to je podmínka,
za které se smí přebírat.

Adresa fotky u zdroje (`Obrazek`) v datech zůstává jako záloha pro případ,
že kopii nemáme.

**Stránka článku se stahuje jen u nováčků.** U článku, který už v databázi
leží, se fotka nemění; ptát se znovu by znamenalo osm dotazů každých šest
hodin místo zhruba jednoho denně. Proto se z kanálu rovnou bere jen osm
nejnovějších — padesát stažených stránek, z nichž se 42 hned smaže, by bylo
nezdvořilé.

**Vlastní tabulka, ne druh `Clanek`.** Přejatý článek má jiný životní
cyklus — rotuje se, kdežto naše zůstávají — a nemá koncept, sérii, zastávku,
tělo ani fotku v našem úložišti. Ve sdílené tabulce by zbyla řada sloupců,
které u něj nic neznamenají. Oddělení má ještě jeden důsledek, a ten je
záměr: **náš RSS kanál se skládá jen z našich článků**. Přeposílat cizí
obsah dál nám nikdo nedovolil a s oddělenou tabulkou to není otázka filtru,
na který se dá zapomenout, ale jiného zdroje dat (`nactiVlastniNovinky`).

**Náš kanál je na `/rss.xml` a vydává ho web, ne API.** Odkazy musejí mířit
na stránky, které si čtenář otevře, a čtečky feed hledají na doméně webu;
odkaz na něj je v hlavičce každé stránky. API vydává data, web z nich dělá
stránky — a kanál je stránka jako každá jiná.

**Sběr se zapíná proměnnou `Prevzate__Sber=true`**, jako u vodočtu, takže
testy ani vývojový stroj na cizí server nesahají. Interval je šest hodin:
svaz vydá článek zhruba obden, takže novinka je u nás do půl dne a jsou to
čtyři dotazy denně. Platí tu totéž co u vodočtu — **je to úloha pro jednu
repliku**; druhá by nic nerozbila (klíčem je odkaz, zápis je upsert), jen by
se svazu ptala dvakrát.

**Cizí server se nesmí stát naší poruchou.** Nečitelná odpověď vrátí prázdný
seznam místo výjimky (chybová stránka s kódem 200 se stává), výpadek
stahování jen zaloguje a zkusí to příští takt, a výpadek `/prevzate-clanky`
při vykreslování nesmí shodit výpis našich novinek — jsou to doplněk, ne
obsah, kvůli kterému čtenář přišel.

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

### Jak se chodí po správě (Filip, 9. 10. 2026)

Vzniklo z první chybky při zkoušce ovládání: *„do editace bójí nejde vlézt
z kalendáře a detailu zastávky. Většinou jdu přes správa, pak ročník a pak
na zastávce tlačítko — nahoře se mi cesta nějak přehodí a je tam ročník
a pak správa, a to neodpovídá realitě."*

**Drobeček je adresa.** Cesta nahoře neříká, odkud kdo přišel, ale kde
v adresách stojí — jinak se u každé obrazovky hádá, co je „nad" ní.
Dřív to u ročníku bylo *Domů » Ročník » Správa* s odkazem na **veřejnou**
stránku ročníku, takže krok nahoru vedl ze správy ven, a u bójí a směrnic
*Domů » Kalendář » …*, ačkoliv se na ně chodí z rozcestníku ročníku.

| Adresa | Cesta nahoře |
|---|---|
| `/sprava` | Domů » Správa |
| `/sprava/{ročník}` | Domů » Správa » Ročník |
| `/sprava/{ročník}/kalendar` (a `vysledky`, `lode`, `opravneni`, `clanky`) | … » Ročník » Kalendář |
| `/sprava/{ročník}/boje/{regata}` (a `prihlasky`, `smernice`) | … » Ročník » **{regata}** » Bóje na trati |
| `/sprava/{ročník}/vysledky/{regata}/{n}/cil` | … » Ročník » **{regata}** » Výsledky » {n}. rozjížďka » Cíl |

**Drobeček regaty míří na její kartu na rozcestníku ročníku**
(`/sprava/{ročník}#{regata}`). Vlastní stránka „regata ve správě"
neexistuje a nepotřebuje být: ta karta je ona — má u sebe všechno, co se
k jedné regatě dělá. Odtud se na to chodí, takže tam drobečky vedou
zpátky; totéž dělá odkaz *Zpátky na regatu* místo dřívějšího *Zpátky na
kalendář*. Kalendář zůstává tam, kde je doopravdy nad věcí: u medailonku
pořadatele, protože ten patří klubu, ne regatě.

**Poslední drobeček nikdy není odkaz** a zahazuje se to v `Drobecky`, ne
u každé stránky: půlka obrazovek správy má „hlavu", která se vykreslí i ve
stavu „nemáš práva", a nesla by tentýž seznam dvakrát.

**Co se u regaty nabízí, říká `web/lib/co-smim.ts` a nikdo jiný.** Kalendář
si ten výpis dřív skládal sám — tři odkazy ručně, všem stejně. Rozešlo se
to při prvním přírůstku: bóje se přidaly na rozcestník a v kalendáři na ně
odkaz nebyl. A protože kalendář vidí i pořadatel jediné zastávky, nabízel
mu odkazy na cizí regaty, které API odmítne.

**Do správy se dá i z veřejné stránky**, když na to člověk má práva: na
stránce regaty rámeček s odkazy na tu regatu, na stránce ročníku odkaz na
rozcestník. Na cachování to vliv nemá — mikrocache před webem pouští
požadavek s cookie sezení mimo cache (`deploy/cache/default.conf`, mapa
`$sezeni`), takže se rámeček nemůže uložit a vydat někomu jinému.

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

### Úvodník a taby (Filip, 9. 10. 2026)

Návrh stránky regaty měl dvě nerozhodnuté otázky a do plánu se proto
nezapisoval. **Obě jsou rozhodnuté.**

**Úvodník je článek s příznakem, ne pole na regatě.** `Clanek` s vazbou na
závod a příznakem „úvodník", nejvýš jeden na regatu. Zdědí tím všechno
hotové: editor strukturovaných bloků, čištění při zápisu (oddíl *Tělo
článku*), fotky v R2 a psaní dopředu s datem vydání. Pole na regatě by
vyrobilo druhý editor vedle článků, nedalo by se naplánovat a fotky by v něm
nebyly — a dovybavovalo by se to zpátky.

**Každá část má vlastní adresu; na úzké obrazovce se vykreslí jako akordeon.**
Dnes je závod jedna stránka (`web/app/serie/[slug]/zavody/[zavod]`). Části
dostanou vlastní cesty pod ní, a to ze dvou důvodů: posílají se na ně odkazy
— směrnice se vyvěšuje právě proto, aby šel poslat odkaz — a **mikrocache
drží každou adresu zvlášť**, takže tabule v hospodě i telefon u vody dostanou
jen svůj kus, ne celou stránku.

Na mobilu je z týchž adres akordeon otevřený na sekci, která odpovídá adrese.
**Má to jednu past:** akordeon nesmí natáhnout data všech částí, jinak je to
druhý tvar stránky s jinou cenou a mobil zaplatí i za to, co nerozbalil.
Načítá se tedy jen otevřená sekce a rozbalení jiné je navigace na její
adresu, ne nové vykreslení celku.

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

**Je to celý plán, ne rozdělaná práce** (8. 10. 2026): tabulku `Zarizeni`
databáze nemá (`Data/AppDbContext.cs`), odesílací úloha žádná není
(`Program.cs` registruje jen `SberVodocetu`, `SberPrevzatych`
a `UklidKontaktu`), Outbox v kódu není a appka nemá ani
`expo-notifications` (`app/package.json`). Podrobněji v *Co ještě chybí
(audit 8. 10. 2026)*.

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

**Rozhodnuto (Filip, 3. 10. 2026): tři cesty za sebou, od té, která nikoho
nestojí práci.**

| Pořadí | Cesta | Jak to chodí |
|---|---|---|
| 1 | **Shoda s kontaktem na přihlášce** | Účet s ověřeným e-mailem, který sedí s kontaktem lodi, dostane roli podle dat ročníku sám |
| 2 | **Kód z přihlášky** | Když e-mail nesedí: krátký kód, který pořadatel dává u registrace na papíře |
| 3 | **Nárok a potvrzení** | Zbytek posádky si řekne o loď, kapitán potvrdí — pořadatele to nezatíží |

**Ruční přiřazení správcem zůstává jako nouzová páka**, ne jako hlavní cesta.

Na co si dát pozor u každé: sdílená klubová adresa by cestou 1 spárovala
cizího člověka, proto se páruje jen **ověřený** e-mail a jen na kontakt té
jedné lodi. Kód z cesty 2 se dá přeposlat, proto má krátkou platnost —
a **kapitánem nedělá nikoho** (viz *Kapitána určuje správce* níž).

**Role vůči lodi: majitel, kapitán, posádka, fanoušek.** Trasu smí odeslat
jen kapitán nebo posádka, a jen za loď, se kterou jsou na té zastávce
přihlášení.

**Hotová první cesta (4. 10. 2026):** vazba `VazbaKLodi` (účet × loď × role
× původ) a párování podle e-mailu při každém přihlášení
(`Features/Lode/Parovani.cs`). Lodě účtu vydává `GET /ja/lode`.

| Pravidlo | Proč |
|---|---|
| páruje se jen e-mail, který vede k **právě jedné** osobě | sdílená klubová adresa by jinak připojila kdokoliv z klubu |
| osoba, která už patří jinému účtu, se nepřebírá | není to spor o kontakt, ale o to, kdo je ten člověk |
| majitel lodi → role majitel, kormidelník účasti → kapitán | silnější role vyhrává |
| role se **nesnižuje** | druhé přihlášení nesmí sebrat práva, která někdo vědomě udělil |
| unikátní index `(LodId, UzivatelId)` | bez něj by párování e-mailem i kódem vyrobilo dvě vazby |
| selhání párování neshodí přihlášení | `/ja` je od identity, ne od lodí |

**Hotová druhá cesta (4. 10. 2026):** připojovací kód (`PripojovaciKod`,
`Features/Lode/KodySprava.cs`) a web k němu.

| Věc | Jak |
|---|---|
| vystaví | pořadatel ročníku, rozhodčí, nebo kapitán či majitel lodi |
| platnost | 15 minut, použít smí víc lidí — posádka se připojuje z jednoho papíru |
| podoby | šest znaků k opsání a QR nad adresou `/pripojeni?kod=…`; QR kreslí **web** do SVG, API svou adresu vědět nemusí |
| abeceda | bez `0`, `1`, `I` a `O` — opisuje se z papíru u vody |
| role | **vždy posádka**; kdo roli má, o ni nepřijde (od 5. 10. 2026, dřív byl první kapitán) |
| neplatný kód | propadlý i vymyšlený dávají **tutéž** odpověď — ať z ní nejde vyčíst, že loď existuje |
| odebrání | kapitán, majitel, nebo správce ročníku; **posledního kapitána odebrat nejde** — pod zámkem lodi |

Stránky webu: `/pripojeni` (cíl QR, funguje i bez appky) a `/moje-lode`
(lodě účtu, posádka, vystavení kódu s QR). Odkaz je v profilové nabídce
každého přihlášeného — vazba k lodi není role ve správě.

**Kód i v přihláškách** (4. 10. 2026): v obrazovce pořadatele má každá loď
tlačítko *Vystavit kód k připojení* a kód se ukáže rovnou u ní, velkým
písmem i jako QR. Je to místo, kde pořadatel loď u registrace před sebou
skutečně má. Kvůli tomu vydává `LodNaZastavceDto` i `LodId` — kód se
vystavuje lodi, která žije napříč ročníky, ne přihlášce.

**Hotová třetí cesta (4. 10. 2026):** nárok na loď
(`Features/Lode/NarokNaLod.cs`) pro toho, na koho nesedl e-mail a kdo nemá
kód. Uživatel si o loď řekne, kapitán nebo majitel potvrdí.

| Pravidlo | Proč |
|---|---|
| nárok sám o sobě nedává **nic** | dokud ho někdo nepotvrdí, je to žádost, ne role |
| přijetí dělá **posádku**, ne kapitána | kapitána uděluje správce ročníku, žádná z cest párování |
| zamítnutí platí a nejde o loď žádat znovu | druhá žádost by byla obcházení kapitánova „ne" |
| o rozhodnutém nároku se podruhé nerozhoduje | jinak by šlo zamítnutí po čase tiše otočit |
| rozhodovat smí ten, kdo smí vystavit kód | kdo může někoho přivést, může i rozhodnout o tom, kdo se hlásí sám |

Endpointy: `POST /ja/naroky`, `GET /ja/naroky`, `GET /ja/lode/{lod}/naroky`
a `POST /ja/lode/{lod}/naroky/{narok}`.

**Web k nárokům** (4. 10. 2026): na `/pripojeni` je pod kódem blok *Kód
nemáš?* s výběrem lodi a poznámkou pro kapitána; na `/moje-lode` vidí
kapitán frontu žádostí u své lodi a vedle každé tlačítka *Přijmout jako
posádku* a *Zamítnout*, žadatel pak svoje žádosti i s tím, jak dopadly.
Výběr lodí bere `GET /serie/{slug}/lode`, a když aktuální ročník ještě
nikoho přihlášeného nemá, nabídne lodě z předchozího — ročník se publikuje
s kalendářem dřív, než se kdokoliv přihlásí.

**Zbývá:** čtečka QR v appce.

### Kapitána určuje správce

**Oprava nálezu A z oponentury (5. 10. 2026).** Do té doby dával kapitánství
připojovací kód prvnímu, kdo ho zadal, a žádná cesta pak roli existující
vazby neměnila. Scénář, který to rozbil, je běžný: pořadatel vystaví kód
u registrace, posádka má jeden papír, kapitánem se stane ten, kdo byl
nejrychlejší na telefonu. Opravit to nešlo — posledního kapitána nejde
odebrat, jiného nebylo jak přidat, takže loď zůstala se špatným kapitánem
a jedinou cestou zpět byl zápis do databáze. `PuvodVazby.Rucne` sice popisoval
nouzovou páku, ale nikde v kódu nebyl.

| Věc | Jak |
|---|---|
| kód, nárok ani párování kapitána **neudělují** | pořadí u stolu nemá rozhodovat o pravomoci |
| kapitána určuje **správce ročníku** | vazba platí celý rok a napříč zastávkami, pověření k jedné regatě na ni nemá dosáhnout |
| loď bez kapitána je **normální stav** | čeká na určení, není to chyba |
| převod je **jeden úkon v jedné transakci** | mezi dvěma požadavky by loď měla dva kapitány, nebo žádného |
| dosavadní kapitán → posádka, **majitel zůstává** | vlastnictví je fakt o ročníku, ne pravomoc k předání |
| majitele tudy nastavit nejde | patří k vlastnictví lodi, oprava je v přihláškách |
| každá změna běží **pod `FOR UPDATE` na řádku lodi** | bez zámku si dva souběžné požadavky přečtou tentýž stav a pravidlo o posledním kapitánovi je jen zdání |
| každá změna nechá **záznam** (`ZmenaRoleKLodi`) | kdo, komu, odkud kam a kdy; pravomoc, kterou nejde dohledat, není pravomoc |
| ručně určenou roli **párování nepřepíše** | jinak by příští přihlášení opravu zrušilo; rozhoduje `RoleUrcenaRucne`, ne jen původ vazby |
| odebranou vazbu **párování nevrací** | jinak by stačilo se přihlásit a člověk je u lodi zpátky |
| kapitáni z doby před opravou se **nepřepisují** | migrace by jim roli buď nechala bez prověření, nebo sebrala i tam, kde je správná — správce je dostane na obrazovku po jedné jako *ke kontrole* |

Endpointy (správce ročníku, loď musí být v jeho ročníku):
`GET /sprava/serie/{serie}/lode`, `GET …/lode/{lod}`,
`PUT …/lode/{lod}/kapitan`, `PUT …/lode/{lod}/vazby/{vazba}/role`
a `DELETE …/lode/{lod}/vazby/{vazba}`.

**Obrazovka správce** je na `/sprava/{serie}/lode`: lodě ročníku, nahoře ty
bez kapitána a s kapitánem od kódu *ke kontrole*, u vybrané lodi posádka
i s tím, odkud se tam vzala a kdo jí roli určil, k tomu určení kapitána,
potvrzení role, změna role, odebrání a historie změn. Odkaz v nabídce
profilu má jen správce ročníku, ne rozhodčí.

**Zbývá:** projít ji v prohlížeči. Testy i tvary odpovědí proti produkci
sedí, ale obrazovku samotnou nikdo neviděl — `tools/fake-api.py` k ní
endpointy má, takže jde rozjet bez databáze.

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

**Data pro „změnu trati" už ale leží hotová** (8. 10. 2026): přenastavení
bóje zakládá nový záznam a ten nese `NahrazujeId` na svého předchůdce
(`PipniAsync` ve `Features/Boje/BojeSprava.cs`), zatímco **starému** se
zapíše `NahrazenaV` (týž `PipniAsync`, popsané u `Boje.NahrazenaV`). Je tedy z čeho
zprávu postavit i čím doložit, jak trať stála předtím. Chybí jedině
odeslání — a s ním právě ten Outbox.

### Appka je oficiální vývěska (Filip, 3. 10. 2026)

Rozhodnuto: **appka je oficiální vývěskou závodu.** Tři důsledky, bez
kterých to neplatí:

1. **Musí to říct plachetní směrnice** té zastávky. Bez věty ve směrnici je
   appka jen pohodlí navíc, ať v ní stojí cokoliv.
2. **Vyvěšení má čas, autora a historii.** Co bylo vyvěšeno, kdy a kým —
   a nesmí to jít tiše přepsat. Oprava je nové vyvěšení, ne přepis.
3. **Push není doručení.** Vývěska je místo, kam se chodí dívat; upozornění
   je služba navíc. Jinak by neúspěšné doručení zpochybnilo start.

Web a appka ukazují totéž a ze stejného zdroje — dvě vývěsky, které se
rozcházejí, jsou horší než jedna.

## Tracker

Appka zaznamenává trasu lodi během závodu; po dojezdu si ji každý prohlédne
a porovná. Tohle je funkce, kterou web neumí a nikdy umět nebude.

Zároveň je to **samostatný projekt velikosti zbytku appky.** Mapa je ta
snadná část, těžké je všechno kolem ní.

### Pilot do května 2027, ne celý tracker (Filip, 9. 10. 2026)

Dvě nezávislé oponentury se shodly, že celý popsaný tracker se do sezóny
2027 nevejde — rozpočet je kolem **155 hodin** a zbývá v něm i fronta
z auditu a nedodělaná fáze 5. Rozešly se v tom, jestli se vejde aspoň
pilot. **Filip rozhodl, že ano.**

**Co pilot je:** jeden telefon na loď, záznam a odesílání polohy, nahrání
po dojezdu. Sezóna se s ním dá zahájit **i bez veřejné živé mapy** — první
hodnota je v tom, že trasy vůbec vzniknou a dá se na nich zjistit, co
z téhle kapitoly stojí za doděláni.

**Co do pilotu nepatří** (obě oponentury se na tom shodly): automatické
slučování víc telefonů, zhušťování podle kurzu, pořadí na vodě, přehrávání
s grafem rychlosti, porovnání dvou lodí, režim Expert. Všechno to snese
rok odkladu a nic z toho se bez skutečných tras stejně nedá ověřit.

**Scénáře přijetí, opravené 9. 10. 2026 po druhém kole oponentury.** Původní
pětice obsahovala dva, které zkoušejí funkce, jež pilot **nemá** — odvolání
souhlasu při zahřáté cache a přestavbu trati při přehrávání. Podmínka přijetí
pro něco, co neexistuje, se nedá splnit; obojí patří k veřejné živé mapě,
respektive k přehrávání, a zůstává tam. Na tom se shodly obě oponentury
nezávisle.

Pilot se přejímá na tomhle:

1. **Zamčený telefon** — záznam běží po celou deklarovanou dobu, měří se
   i spotřeba.
2. **Systém zabil appku v půlce závodu.** Zamčený telefon není ten těžký
   případ, zabitý proces je. Zapsaná část musí přežít a záznam pokračovat.
   **Tohle je nejpravděpodobnější skutečná porucha** a jediná, která
   z pilotu udělá nulu.
3. **Výpadek a doposlání** — žádné duplicity ani ztracený potvrzený úsek.
4. **Přerušené nahrání** se dá dokončit.
5. **Posádka zapomene záznam ukončit** — trasa jinak pokračuje přes hospodu
   domů a appka zaznamená, kde kdo bydlí. Chce to ostříhání na okno závodu
   a dotaz po dojezdu. **Je to věc soukromí, ne pohodlí.**
6. **Telefon přiřazený ke špatné lodi** — potvrzení jména lodi při startu
   záznamu.

**V pilotu musí být i způsob, jak se na výsledek podívat.** „Trasy vůbec
vzniknou" je hodnota jen tehdy, když někdo řekne „vzorkování je moc hrubé"
nebo „baterka umřela v šesté hodině". Stačí stažení trasy, počet bodů
a časový rozsah — bez toho vzniknou soubory, které nikdo neotevře.

**Čas je z telefonu, a ten se dá přestavit.** Trasa nahraná po dojezdu nese
výhradně časy z telefonu, takže se musí rozhodnout, co s body v budoucnosti
a s telefonem, kterému skočily hodiny. Jinak se první dlouhá trasa nedá
přiložit ke stavu trati — a to je jediný důvod, proč se historie trati vede.

**Pilot musí jít opustit.** Regata, přijetí trati ani výsledky nesmějí
vyžadovat zapnutý tracker a už nahrané záznamy zůstávají. K tomu patří
**termín rozhodnutí**: nesplněná přejímka znamená neveřejnou zkoušku nebo
vypnutí pilotu, ne opravy mezi dvěma rozjížďkami.

**Míří na konkrétní regatu, ne „na sezónu".** Pilot, který smí debutovat na
druhém nebo třetím závodě 2027, nemusí být hotový k 15. květnu a přestane
soupeřit o hodiny se stavy trati.

**Vyvíjí se pro obě platformy, iOS se zkouší v simulátoru, účet u Applu se
nekupuje** (Filip, 9. 10. 2026: *„postav to i pro Apple, já to zatím budu
spouštět v simulátoru, ale vyvinuté to mít budeme pro obě platformy"*). Dev
build pro simulátor se nepodepisuje, takže na něj účet potřeba není;
`app.json` k tomu zatím nemá ani oddíl `ios` s `bundleIdentifier` — má jen
`android.package`.

**Co tím ale neodpadlo.** Simulátor neprokáže přejímací podmínky 1 a 2, tedy
zamčený telefon se spotřebou a appku zabitou systémem v půlce závodu — a to
je právě ta „nejpravděpodobnější skutečná porucha". Na ně je potřeba fyzický
telefon. Volné Apple ID dev build z Xcode podepíše, ale profil platí sedm
dní, takže na **cizí** iPhone se tím appka rozumně nedostane; k tomu vede
EAS Build s interní distribucí nebo TestFlight, a ty ten zaplacený účet
chtějí. **Přejímka pilotu na iOSu tedy zůstává za rozhodnutím o 99 $** a ten
termín je kalendář, ne hodiny. Na Androidu nic z toho neplatí — `npm run apk`
staví interní APK (`eas build --profile preview`) už dnes.

**Expo Go na pilota nestačí ani na jedné platformě.** Jeho nativní binárka je
pevná, takže se do ní nedá deklarovat `UIBackgroundModes: location` ani
foreground service; `expo-location` proto v Expo Go polohu na pozadí neumí
a flagy `isIosBackgroundLocationEnabled` a `isAndroidBackgroundLocationEnabled`
jsou config-plugin flagy, které mění nativní konfiguraci (dokumentace Expa
k `Location` a `TaskManager`, ověřeno 9. 10. 2026). Na všechno ostatní Expo Go
dost je — přihlášení, moje lodě, bóje, obrazovky —, jen ne na záznam polohy.

### Co je na tom skutečně těžké

| Věc | Proč |
|---|---|
| **GPS na pozadí** | iOS vyžaduje oprávnění „Vždy" a deklarované background modes, Android trvale běžící službu s viditelným oznámením |
| **Baterie** | 24hodinovka na telefonu je jiná disciplína než hodinový okruh. Frekvence vzorkování se bude muset dát nastavit |
| **Offline** | Na vodě signál není. Appka musí zapisovat lokálně a nahrát trasu po návratu do dosahu — není to volitelné |
| **Schvalování v obchodě** | Apple se u polohy na pozadí ptá, k čemu to je. Musí to být v popisu appky obhájené |

### Několik telefonů na jedné lodi (Filip, 4. 10. 2026)

*„Na lodi bude několik mobilů, jestli nemá smysl je připojit všechny s tím,
že je seřadíme podle priority. A když se například vybije baterka
skipperovi, automaticky převezmeme polohu od dalšího."*

**Ano — ale slučováním, ne předáváním.** Každý přihlášený telefon je zdroj
polohy; loď má u zastávky **pořadí zdrojů** a server z nich skládá jednu
trasu: v každém okamžiku bere bod od nejvýš postaveného zdroje, který data
má. Vybitá baterka je pak jen díra, kterou vyplní další v pořadí.

**Proč ne volba aktivního telefonu:** ta by potřebovala, aby se telefony se
serverem domluvily přes signál, který na vodě padá. Fungovala by nejhůř
přesně ve chvíli, kdy je potřeba nejvíc.

| Věc | Jak |
|---|---|
| živě | hlavní zdroj po 5–10 s, ostatní po minutě — záložní poloha stačí hrubá |
| lokálně | **všechny** telefony zapisují na plné frekvenci a po dojezdu nahrají, co mají; výsledná trasa je celá, i když živě byly díry |
| povýšení | když hlavní mlčí déle než minutu, server bere další v pořadí; jeho appka zrychlí, až chytí signál |
| pořadí | určuje kapitán; výchozí je pořadí, v jakém se telefony přihlásily |

**Dvě pasti:**

1. **Telefon, který zůstal v autě.** Posílá se jen z telefonu, kde posádka
   závod ručně spustí, a slučování ignoruje zdroj vzdálený od ostatních víc
   než pár set metrů.
2. **Stáří polohy patří k tomu bodu, který je vidět**, ne k poslednímu
   čemukoliv. Jinak by mapa tvrdila, že je čerstvá, protože se ozval záložní
   telefon.

### Jak často se zapisuje a odesílá (Filip, 4. 10. 2026)

Filip: *„Pokud je komunikace s telefony oboustranná, tak bych jim sdělil:
ty mi dávej polohu po pěti minutách, ty po deseti… a u startu a dojezdu by
se dal nastavit kratší interval."* A k tomu okno u bóje, ve kterém se
provoz zhustí.

**Ano, ale jako plán, ne jako povel.** Telefon si před startem stáhne plán
závodu — svůj interval podle priority, časová okna u startu a dojezdu
a souřadnice bójí s poloměrem — a dál se rozhoduje sám. Povel „zhusti"
odeslaný ve chvíli startu je k ničemu, když zrovna není signál; plán stažený
dopředu funguje i bez něj. Změna plánu se projeví, až telefon chytí signál.

**Zápis a odesílání jsou dva různé knoflíky** a pletou se:

| | Jak často | Proč |
|---|---|---|
| **zápis do telefonu** | vteřiny, u všech zdrojů | GPS stejně běží, místo je zadarmo a po dojezdu se nahraje celý záznam |
| **odesílání živě** | hlavní zdroj 5–10 s, záložní minuty | tohle žere baterku a data |

**Minutový interval neukáže obrátku.** Pro živou mapu je u hlavního zdroje
potřeba 5–10 s, jinak loď skáče a z manévru na bóji není vidět nic.

**Zhuštění bez trati:** kromě oken u bójí se zapisuje hustěji při změně
kurzu o víc než ~15° nebo při větší změně rychlosti. Chytí to každou
obrátku, i mimo bóji, a na rovině se naopak posílá málo.

### Trať staví pořadatel, pípnutím u bóje (Filip, 4. 10. 2026)

*„Musíme udělat verzi v appce pro pořadatele, který staví bójky, aby pípnul
GPS, když postaví bójku, nebo přenastaví."*

Nikdo nemá přesnější polohu než ten, kdo bóji staví. Trať je zároveň
podmínka pro tři věci, které už v plánu jsou: okna pro zhuštění záznamu,
pořadí na vodě a čitelnou mapu.

- **Pípnutí je záznam s časem a přesností z GPS.** Přenastavení je nový
  záznam, ne přepis — během dne se trať mění a trasa musí jít porovnat se
  stavem, který zrovna platil. Je to totéž pravidlo jako u směrnice.
- **Bóje patří k zastávce a mají pořadí**, aby z nich šla složit trať a kola.
- **Jde to i bez signálu:** appka pípnutí podrží a odešle později. **Tohle
  dnešní API neunese** (8. 10. 2026): `PipnutiVstup` čas nenese
  (`Features/Boje/Boje.cs`) a `PostavenaV` se bere ze serverových
  hodin v okamžiku zápisu (`cas.GetUtcNow()` v `PipniAsync`), takže
  podržené pípnutí by se uložilo s časem nahrání, ne s časem postavení —
  a čas z první odrážky je tím pádem taky serverový, ne z GPS. Pole s časem
  z telefonu je tedy podmínka, ne detail.
- **Smí organizátor té regaty nebo rozhodčí**, stejně jako u směrnice.

**Hotové API (5. 10. 2026):** `Features/Boje/` — pípnutí, seznam, sebrání;
zapojené přes `MapBoje` v `Program.cs`, migrace `20261005193300_Boje`, testy
`BojeTests.cs` a `PipnutiTests.cs`. Smí organizátor regaty nebo rozhodčí,
stejně jako u směrnice; veřejné čtení zatím není, protože kdy se trať smí
ukázat divákům, patří rozhodčímu.

**Obrazovka je na webu od 9. 10. 2026**, ne v appce — appka nemá
přihlášení ani polohu, a plán ji vede jako rychlejší cestu až po něm.
`/sprava/{ročník}/boje/{regata}` pípne polohu, přenastaví a sebere;
pořadatel dostane souřadnice i **přesnost, kterou telefon hlásí**, a
tlačítko se odemkne, až je poloha k něčemu. Historie stojí pod tratí,
aby bylo vidět, že přenastavením nic nezmizelo.

**Co obrazovka vědomě neumí:** pípnout bez signálu (viz odrážka výš —
API nenese čas z telefonu). Mapka trati nad seznamem je od 9. 10. 2026,
stejně jako zadání polohy z mapy a fotky u bóje. Mock bóje umí včetně
pravidel a role, takže se dá zkoušet lokálně i ve zkoušce s pořadatelem.

| Pravidlo | Proč |
|---|---|
| přenastavení je **nový záznam**, starý se označí za nahrazený | trasa se k trati vztahuje tak, jak stála tehdy |
| sebrání je razítko, ne smazání | bez bóje se trasa z té doby nedá přečíst |
| přesnost z telefonu se ukládá | iPhone s vypnutou přesnou polohou hlásí i 65 m a bez čísla by to vypadalo stejně jako 5 m |
| nad 100 m se pípnutí odmítne | to už není poloha z družic, ale ze sítě |
| poloha mimo Orlík se odmítne | prohozená šířka a délka je nejčastější překlep a postavila by bóji v Africe |
| u polohy **z mapy** nesmí přijít přesnost | mapa nic neměří; číslo u ní by bylo vymyšlené |

#### Když pípnout nejde (Filip, 9. 10. 2026)

*„Potřeboval bych mít možnost bóji pípnout nejen tak, jak funguje nyní, ale
také tím, že zadám manuálně souřadnice, nebo vyfotím QR, nebo URL z map."*
A k tomu důvody: *„tuhle definici z mapy využije někdo u počítače v případě,
že ten, kdo staví bóje, nebude zdatný je pípnout z telefonu"* a *„pokud
dojde k posunu a rozhodčí si zavolá s někým úplně mimo proces — ukotvi mi
to tam a pošli mi odkaz v mapě"*.

**Z mobilu se pípá dál tak, jak to je** (Filip tamtéž). Tohle je cesta pro
nestandardní řešení, ne náhrada: zapisuje ji někdo **jiný, než kdo tu bóji
viděl**, a jeho zdrojem je mapa, ne měření.

**Proto má bóje `zdroj`** (`ZdrojPolohy`: `Telefon`, `Mapa`, `Qr`). Dokud
ho neměla, slilo se „telefon přesnost nehlásí" a „opsáno z mapy" do jednoho
prázdného `presnostM` a záznam o tom rozdílu mlčel. Chybějící `zdroj`
znamená `Telefon`, protože jinudy to dřív nešlo — starší záznamy jsou tedy
pravdivé bez dopisování.

**Co se dá přečíst** (ověřeno 9. 10. 2026 na tvarech, které Filip poslal):

| Vstup | Kde je poloha |
|---|---|
| `49.4957253N, 14.1841419E` i holá dvojice | šířka na Orlíku je 49,2–49,8 a délka 14,0–14,5, takže se nedají prohodit |
| `mapy.com/…?source=coor&id=14.1841,49.4957` | `id` je ten bod a má **délku první**; `x`/`y` je jen střed mapy |
| `mapy.com/s/lasupogahe` (i z QR) | zkratka, rozbalí se až na serveru |
| `maps.app.goo.gl/nUMo8…` | rozbalí se na `google.com/maps/search/49.495688,+14.183463` — **šířku první** |

**Zkratky se musí rozbalit na serveru**, protože v QR ani ve zprávě od
kamaráda nic jiného není. Jde to jen na známé hostitele a jen po http(s) —
rozbalování cizí adresy je požadavek, který posílá náš server, ne
prohlížeč. Čte se **jen hlavička `location`**, tělo cílové stránky ne:
stačí adresa, na kterou to vede. Jeden neúspěch se zopakuje, protože
dlouho běžící server drží spojení otevřená a to první po pauze spadne
hned (změřeno 9. 10. 2026: úspěch za 275 ms, pak pád za 64 ms).

**QR se čte z obrázku, ne z kamery** — u stolu ho stejně dostaneš jako
screenshot. Knihovna (`jsqr`) se stahuje **až když někdo fotku vybere**,
takže pípání u vody o ni nezakopne. Kreslí se na bílý podklad s okrajem:
QR potřebuje kolem sebe klidovou zónu a fotka obrazovky ji často nemá —
bez okraje se Filipův kód z Mapy.com nepřečetl ani vestavěnou čtečkou
macOS.

**Obrazovka napřed ukáže, čemu rozumí, a staví se až potom.** Špatně
přečtená souřadnice posune celou trať a poznalo by se to až na vodě;
jedno klepnutí navíc je proti tomu nic. U zkratky se vypíše i adresa,
na kterou vedla.

#### Fotky bóje: víc než jedna (Filip, 9. 10. 2026)

*„Je potřeba ty fotky komprimovat na velikost webu, jsou pouze
informativní."* Komprese tu je od začátku a žádná zvláštní být nemusí:
fotka projde `Zpracovani.ZpracujAsync`, uloží se jako **WebP v kvalitě 80
ve dvou šířkách — 480 a 1600 px** — a originál z telefonu se nikam
neukládá. Je to tatáž cesta jako u fotek na web, takže se nemá co rozejít.

**Jedna fotka nestačí.** Snímek zblízka neukáže, co je za bójí na břehu,
a teprve obojí dohromady říká, kde to je. Vazba proto vede **od fotky
k bóji** (`Fotka.UBojeId`), stejně jako u obrázků v těle článku, a ne
opačně jako u medailonku.

#### Co je pokus a co historie (Filip, 9. 10. 2026)

*„Všechno, co neprošlo rozjížďkou, jsou pokusy. Sebrání bóje ještě před
tím, než se trasa schválí, je jen nějaký log, ale nemá z hlediska závodu
hodnotu. Jakmile ale podle toho lodě pojedou nebo jely, to už historickou
hodnotu má, a velmi — může se podle toho v budoucnu třeba počítat
hendikep."*

**Tohle je dělicí čára, ne odstín.** Stejný záznam o bóji znamená před
schválením trati a po odjetí rozjížďky něco úplně jiného, a plyne z toho
dvojí:

1. **Sebrání bóje fotky nemaže.** Záznam o poloze zůstává a fotka je jeho
   doklad; u trati, podle které se jelo, je to podklad, který už nikdo
   nevyrobí znovu.
2. **Úklid na konci ročníku** (Filip tamtéž: *„když budeme přecházet na
   nový ročník, je potřeba vymyslet nějaký úklid toho, co už nikdy
   potřebovat nebudem — takže i takovéto soubory"*) **smí sáhnout jen na
   to, podle čeho nikdo nejel.** Bóje z trati, kterou projela rozjížďka,
   se nemaže nikdy. Pravidlo retence tedy nezní „starší než rok", ale
   „nikdy nesloužila odjeté rozjížďce".

**Rozhodnout to jde teprve se stavy trati** — dnes bóje visí na zastávce,
ne na rozjížďce, takže se „podle téhle trati se jelo" nemá z čeho přečíst.
Je to další důvod, proč stavy trati (akceptace rozhodčím, zámek,
přestavba) patří před úklid, ne za něj.

**Na webu to jde taky** (Filip se ptal 4. 10.): prohlížeč na telefonu umí
přes HTTPS sáhnout na GPS se stejnou přesností, dokud je stránka v popředí.
Dvě ceny: byl by to **první kousek administrace s javascriptem** a bez
signálu se pípnutí odešle, jen dokud je stránka otevřená. Appka obojí řeší
líp, ale web je rychlejší cesta, jak to mít.

**Appka bude nástroj pořadatele** (Filip, 5. 10. 2026): bóje i cílová
obrazovka. Předpokladem je **přihlášení v appce**, které dnes nemá vůbec —
a které stejně potřebujeme pro upozornění posádce i pro tracker.

> **Pozor na dvě kopie cílové obrazovky.** Je to nejchoulostivější kus webu
> (pořadí dojezdů, kódy, časy u míst, fronta bez signálu) a v appce vznikne
> podruhé. Sdílený balíček tu schválně nemáme — Next a Metro by si se
> symlinky v workspace neporadily, proto se i typy generují jako kopie.
> Drží to tedy jediné pravidlo: **rozhodování zůstává na serveru a klient
> posílá celou sadu**, jak to web dělá dnes. Co se do klienta přesune,
> rozejde se.

**Co na webu nepůjde nikdy:** samotné sledování trasy. Hodiny běžící GPS na
pozadí prohlížeč neumí, na iPhonu obzvlášť. To je důvod, proč appka existuje.

#### Trať není seznam bójí, ale řada prvků (Filip, 9. 10. 2026)

*„Dokázali bychom bóje rozšířit i o definici cílové čáry? Nebo to, že musí
být průjezdní brána, jako u závodů optíků, kdy polovina točí pravou
a polovina levou bóji?"*

**Cílová čára i brána jsou tatáž věc: dvě polohy, které spolu tvoří jeden
prvek trati.** Nechybí nový druh bóje, chybí **prvek** — a ten dnes
neexistuje vůbec. Pořadatel ho vyjadřuje jménem („start levý", „start
pravý"), takže dvojice žije v jeho hlavě, ne v datech, a mapka kreslí dva
puntíky tam, kde je čára.

**Tenhle oddíl je přepsaný 9. 10. 2026 po dvou nezávislých oponenturách.**
Původní znění doporučovalo uložit vazbu **na bóji** a zdůvodňovalo to
historií. Oba oponenti to zamítli, nezávisle a z různých důvodů, a mají
pravdu — viz *Proč ne pole na bóji* níž.

##### Co prvek je

**Prvek nese rozhodnutí, bóje zůstane měřením.** To je celé pravidlo
a plyne z něj zbytek.

| Na prvku | Na bóji |
|---|---|
| typ (značka, brána, čára, odskok) | poloha, čas, přesnost, zdroj, fotky |
| pořadí v trati a opakování | řetěz přenastavení (`NahrazujeId`) |
| strana a směr průjezdu | sebrání |
| které polohy k němu patří | — |

**Prvek ukazuje na polohy, ne naopak.** Odkazuje na jeden nebo dva
**konkrétní záznamy `Boje`**, a protože ty se nikdy nepřepisují, je odkaz
zároveň odkazem na *polohu v konkrétní čas*. Přenastavení půlky brány
založí novou polohu i nový prvek; ten starý dál ukazuje, kde to stálo
tehdy. Historie tím vzniká sama a prvek žádný vlastní mechanismus
nepotřebuje.

##### Proč ne pole na bóji

Původní zdůvodnění znělo, že prvek by musel mít vlastní historii. **Neplatí
to:** odkaz na nepřepisovaný záznam polohy minulost přepsat nemůže.
Zdůvodnění si pletlo „ukazuje na bóji" s „ukazuje na aktuální polohu bóje".

Rozhodující je ale něco jiného, co našla až oponentura:

1. **Identita, typ, pořadí a strana jsou rozhodnutí rozhodčího, ne
   měření.** Na nepřepisovaném záznamu měření je lze změnit jedině zápisem
   nového záznamu — tedy vyrobením pípnutí, které se nestalo, s falešným
   časem, autorem a přesností. Záznam, který je nepřepisovaný *protože je
   to měření*, by se stal nosičem rozhodnutí. (Platí to i na samotnou
   `Strana`, kterou druhý oponent na bóji ponechával — jeho vlastní
   argument mluví proti ní.)
2. **`Poradi` na bóji neunese opakování.** Trať `start → A → brána → A →
   brána → cíl` potřebuje tutéž značku dvakrát; na bóji by to šlo jen
   vyrobením falešné druhé bóje. Přitom u toho pole v modelu stojí
   *„Podle něj se skládá trať a kola"* — kola se čekala od začátku a tenhle
   tvar je neunese. **Tohle samo o sobě stačí** a s historií nemá nic
   společného.
3. **Klient by musel přenášet čtyři pole při každém přenastavení.** Dnes
   server nepřebírá po staré bóji ani jméno — `ProcNejde` ho vyžaduje
   u každého pípnutí a web to zachraňuje předvyplněním v prohlížeči,
   ačkoliv doc komentář u `PipniAsync` tvrdí opak. Vzor, který se měl
   rozšířit, je na úrovni API rozbitý už dnes a maskuje ho jediný klient.

##### Typy a co k nim patří

| Typ | Poloh | Co o něm musí být vidět |
|---|---|---|
| značka | 1 | kterou stranou se **ponechává** |
| odskok | 2 | obě se ponechávají touž pevnou stranou, jedno místo v řadě |
| brána | 2 | projíždí se mezi nimi, stranu si volí loď, ale **směr je daný** |
| čára — start | 2 | překonává se **jedním směrem** |
| čára — cíl | 2 | totéž, a opačný průjezd se nepočítá |

**Start a cíl jsou dvě různé funkce**, ne jedna „čára": tytéž dvě polohy
můžou být ráno start a odpoledne cíl.

**Konec čáry nemusí být bóje.** Start i cíl se běžně vytyčí mezi bójí
a **plavidlem komise**, nebo bójí a bodem na břehu. Prvek proto musí umět
konec, který je jen souřadnice bez záznamu bóje. Bez toho pořadatel pípne
neexistující bóji na pozici lodi — tedy přesně to kódování do jména, které
tenhle oddíl ruší.

**Strana se jmenuje „ponechat po levé / po pravé".** „Objíždí se levou" si
půlka lidí přečte jako „ponechat po levé" a druhá jako „točit doleva", a to
jsou protikladné věci.

##### Co to vyvolá

- **Spojnice v mapce** vede dnes z bodu do bodu; u brány a čáry má vést
  **doprostřed mezi dvě polohy** a pak dál. Kreslení samo je přívažek —
  `MapkaTrati` spojnici v pořadí už kreslí jako SVG nad dlaždicemi.
- **GPX bránu jako bránu neumí** a dřívější slib v tomhle oddíle byl
  přehnaný: formát zná body, trasy a stopy, závodní bránu ne. Dosažitelné
  je vyvézt oba konce jako body a do trasy dát pojmenovaný střed — ale
  **nenahrazuje to pravidlo průjezdu**. Dnes se každá bóje píše jako bod
  i jako uzel trasy, takže plotter vede k jednomu konci čáry a pak k druhému.
- **`Poradi: 0` přestane fungovat tak, jak je popsané.** „Za poslední" dnes
  bere `max(Poradi)+1` přes **všechny** bóje závodu včetně nahrazených
  a sebraných, takže dvě půlky brány pípnuté zvlášť dostanou různá čísla.
- **Prvek a jeho polohy se musí uložit jednou transakcí** a neúplný prvek
  nesmí projít přijetím trati. Měřit oba konce může pořadatel postupně —
  pípnutí se uloží jako podklad a dvojici potvrdí až potom, takže se
  nemusí předstírat měření druhého konce.
- **`BojeDto` musí nést prvek v témže kroku.** Dnes nenese ani `nahrazenaV`,
  proto web čte seznam dvakrát a dělá rozdíl; bez prvku v odpovědi by
  obrazovka půlky nespárovala a kontrakt by se měnil dvakrát.

##### Čím prvek vlastní

~~**Nullable `RozjizdkaId` od prvního dne.**~~ **Přepsáno 9. 10. 2026:
prvek patří trati.** Ten původní odstavec je starší než entita `Trat`
a řešil, čím prvek vlastnit, když trať jako záznam neexistuje. Dnes
existuje, nese `RozjizdkaId` sama, a prvek ji tím dědí — jeden cizí klíč
místo dvou.

##### Historie je řetěz tratí, ne řetěz uvnitř prvku

Tady si plán odporoval a stojí za to říct jak: *„prvek ukazuje na jeden
nebo dva konkrétní záznamy bóje"* proti *„celý řetěz přenastavení dostane
jedno `PrvekId`"*. To druhé předpokládalo, že prvek žije přes přestavby,
protože nic jiného, co by je oddělilo, neexistovalo.

**Platí to první.** Prvek patří jedné trati a ukazuje na konkrétní bóje,
které se nemění; přestavba zakládá novou trať a její prvky ukazují na to,
co v tu chvíli stojí. „Týž prvek v čase" se tedy čte jako řetěz tratí
(`Trat.NahrazujeId`), ne jako vazba uvnitř prvku. Klonování trati je pak
přesně to, co chtěl Filip: zkopírují se prvky a ukazují na tytéž záznamy
bójí, které pořád stojí ve vodě — **žádná vyrobená pípnutí**.

##### Převod toho, co už je

**Hotovo 9. 10. 2026.** Z každé **stojící** bóje se stala jednobójová
značka s pořadím z bóje a **bez strany** — tu z názvu domyslet nejde
a `null` musí znamenat „neuvedeno". Nahrazené a sebrané bóje prvek
nedostaly: nepatřily k žádné přijaté trati, protože přijetí do dneška
neexistovalo, a vyrábět jim prvek by bylo tvrzení, které se nedá doložit.

##### Dvě chyby, které se přitom našly

Obě jsou v dnešním kódu a s tímhle návrhem nesouvisí, ale u brány by
zlobily dvojnásob:

1. **Sebranou bóji jde přenastavit.** `PipniAsync` kontroluje `NahrazenaV`,
   nikoli `SebranaV`, takže se sebraná bóje dá přenastavením „oživit".
   U brány by vznikla půlka, která je sebraná a zároveň stojí. Patří k tomu
   rozhodnutí, co je napůl sebraná dvojice — nejspíš že sebrání jedné půlky
   sebere celý prvek.
2. **`Poradi: 0` počítá přes nahrazené i sebrané** (viz výš), takže číslo
   roste s každým přenastavením.

##### Co to nepřinese

**Automatické pořadí v cíli.** K tomu je kromě čáry potřeba ještě kolo,
čas a rozhodnutí o hendikepu — a před tím varovaly obě oponentury.

Je to **změna kontraktu**, takže dvoukroková: nejdřív API a nasazení, pak
přegenerovat klienta a teprve pak web.

#### Trať je veřejná, jakmile ji rozhodčí přijme (Filip, 9. 10. 2026)

*„Bóje, mapka, GPX — to bych, když už to bude schválené a před startem,
zveřejnil taky."*

**Zveřejnění není samostatný knoflík, je to důsledek akceptace.** Dnes leží
celá trať pod `/sprava/` a veřejná cesta k bójím neexistuje, protože *kdy se
trať smí ukázat divákům, patří rozhodčímu* (viz *Kdo trasy vidí*). Jakmile
bude existovat stav „rozhodčí trať přijal", je tím ta otázka zodpovězená
a trať se zveřejní sama.

**Komu to slouží.** Nejvíc závodníkovi: GPX si před startem natáhne do
chartplotteru. Pak divákovi a médiím. A protože to dostanou všichni
najednou, není to výhoda pro nikoho — dnešní stav, kdy trať vidí jen
pořadatel a rozhodčí, je k závodníkům přísnější, ne spravedlivější.

**Dvě pasti, obě o tom, že obrazovka nesmí lhát:**

1. **Odemčení kvůli přestavbě.** Veřejná stránka v tu chvíli nesmí dál
   ukazovat starou trať jako platnou — někdo už má GPX v plotteru a popluje
   k bóji, která se mezitím posunula. Odemčená trať proto veřejně znamená
   **„trať se přestavuje, počkej"**: ne tiché zmizení (vypadá to jako chyba)
   a rozhodně ne starý obrázek.
2. **Která trať.** U vícerozjížďkového závodu může mít každá rozjížďka
   jinou, a dnes bóje visí na regatě, ne na rozjížďce. Dokud je trať jedna,
   je zveřejnění triviální; jakmile budou dvě, musí veřejná stránka říct,
   ke které rozjížďce patří — jinak si lidi stáhnou GPX od té včerejší.

**Pořadí prací z toho plyne samo: stavy trati jsou první.** Bez akceptace
není co zveřejnit; publikovat něco, co nikdo nepotvrdil, by bylo horší než
nepublikovat nic.

**Hotové 9. 10. 2026.** `GET /serie/{serie}/zavody/{zavod}/trat` leží mimo
`/sprava/`, takže ho nekryje práh přihlášení a rozhodnutí drží endpoint sám:
nepřijatou trať nevydá vůbec, u přestavby vrátí jen příznak a bóje zamlčí.
Veřejná bóje nese **jen jméno, pořadí a polohu** — jméno stavitele, přesnost
měření ani fotky ven nejdou, protože to jsou údaje o tom, kdo a jak měřil.

Bóje se berou **k okamžiku přijetí**, ne „jak stojí teď". U přijaté trati to
vyjde nastejno (do zamčené se nedá pípnout), ale podle času je to správně
i pro historické tratě a nic to nestojí: záznam o bóji se nepřepisuje a časy
nese.

**Na skrytých výsledcích ročníku to nezávisí.** Trať je informace o tom, kudy
se pluje, ne výsledek — ročník, který výsledky regat nevydává, trať vydat
může a má.

##### `OchranaCteniTests` ten slib nesplňoval

Test měl u `VedomeVerejne` napsáno, že *„až přibude veřejná mapa a živé
polohy, patří rozhodnutí sem"*. **Nešlo to.** Seznam se porovnával jen
s endpointy pod chráněnými předponami, takže zápis o veřejné cestě shodil
závěrečné tvrzení jako „mrtvou výjimku" — tedy přesně ten zápis, ke kterému
komentář vyzýval.

Opraveno 9. 10. 2026: k existujícím cestám se nově počítají **všechny** GET
endpointy, zatímco odmítnutí se dál vymáhá jen pod `/sprava/` a `/ja/`. Pro
cestu mimo správu je tím záznam tím, čím má být — **zapsaným rozhodnutím
s důvodem**, ne povolením. První takový zápis je právě veřejná trať.

#### Stavy trati (Filip, 9. 10. 2026)

**Postavené 9. 10. 2026** — entita `Trat`, stavy, pravidla a endpointy pod
`/sprava/serie/{serie}/zastavky/{zavod}/trat`, veřejná cesta
`GET /serie/{serie}/zavody/{zavod}/trat` i **obrazovka ve správě**: panel
stavu stojí nad pípnutím, protože rozhoduje, jestli se vůbec smí pípat,
a u zamčené trati se formulář pípnutí neukazuje vůbec. Dozvědět se o zámku
až z chyby API je na vodě o dvě klepnutí navíc.

| Stav | Co znamená | Kdo do něj pustí |
|---|---|---|
| `Rozestaveno` | staví se, veřejně nic | vzniká prvním pípnutím |
| `Hotovo` | stavitelé hlásí, že trať stojí | organizátor regaty i rozhodčí |
| `Prijato` | **zamčeno a veřejné** | jen rozhodčí |
| `Prestavba` | veřejně „trať se přestavuje, počkej" | organizátor regaty i rozhodčí |

**Zámek něco znamená.** Do přijaté trati nejde pípnout ani sebrat bóji
(`TratSprava.ProcNejdeStavetAsync` volá `BojeSprava` u pípnutí i sebrání).
Bez toho by „zamčeno" byl jen nápis a veřejně vydaná trať by se dala tiše
změnit pod lodí, která podle ní pluje.

**Stavba začíná první bójí**, ne zvláštním knoflíkem, který by nikdo nestiskl.
Regata bez bóje trať nemá a `GET` vrací 404.

**Odemknout smí pořadatel i rozhodčí** (Filip): trať přestavuje pořadatel a na
vodě nemá jak shánět rozhodčího. Bezpečné je to proto, že odemčení **je
vidět** — veřejně okamžitě znamená „počkej". Zpátky k přijetí vede jen přes
rozhodčího.

**Přestavba přijaté trati je výjimka, ne režim** (Filip: *„systémově to nechci,
ale může se to stát"*) — vítr odfoukne bójku nebo ji někdo ukradne, a to se
stane i v průběhu rozjížďky. Proto:

- Podle **odjeté** trati se už jelo, takže se nepřepisuje: vznikne nová
  s `NahrazujeId` na starou a stará zůstane přijatá navždy. Historie je řetěz,
  stejně jako u bóje.
- **„Odjelo se podle ní" se nikam neukládá** — pozná se tak, že po přijetí
  odstartovala rozjížďka (`StartV`). Je to dopočet z toho, co v datech už je,
  takže start rozjížďky o trati nemusí vědět.
- Odemčení **neodjeté** trati žádnou historii nevyrábí, jen ji odemkne a smaže
  přijetí, aby `PrijatoV` neukazovalo na stav, který neplatí.

**Členství bójí v trati se zatím neukládá.** Dokud se trať nevybírá
a neklonuje, je to „co zrovna stojí u téhle regaty", a to už vrací
`BojeEndpoints`. Výslovné členství přijde s výběrem a klonováním (níž)
a nahradí ho pak prvky trati.

**Zkrácení trati není přestavba.** Když rozhodčí zkrátí trať, přijatá trať se
nemění — mění se to, kde se dojelo. Nic se tedy neodemyká a veřejně se nehlásí
„přestavuje se, počkej" uprostřed závodu. Zapíše se to na rozjížďku, až budou
prvky (*zkráceno u prvku X v čase T*).

##### Otevřené: výběr a klonování trati

Filip, 9. 10. 2026: *„Jakmile založím novou rozjížďku, můžu si vybrat již
postavenou trať a ta se mi naklonuje z té, co se odjela."*

**Klon nesmí znamenat nová pípnutí.** Vyrobila by se tím měření, která se
nestala, s falešným časem a přesností — přesně to, co zakazuje oddíl *Trať
není seznam bójí, ale řada prvků*. Klon tedy kopíruje **definici trati**
a ukazuje na tytéž záznamy bójí, které pořád stojí ve vodě.

Z toho plyne, že **členství se uložit musí** (ve vodě může stát víc tratí
najednou, takže „co zrovna stojí" nestačí). Nerozhodnuté zůstává, jestli má
rozjížďka mít trať povinně už při založení a v jakém stavu klon začíná.

##### Otevřené: sebraný dojezd a hendikep

Filip, 9. 10. 2026: *„Pokud by se jelo na hendikep, jak bychom řešili zkrácení
trati při nepříznivém větru — rozhodčí jede proti lodím a pípá je do cíle?"*

**Řádné zkrácení u bóje hendikepu nevadí:** všichni dojedou přes tutéž čáru,
takže přepočet zůstává „čas × koeficient" a na délce trati nezáleží.
**Sebraný dojezd ano** — každá loď urazila jinou vzdálenost za jiný čas, takže
poměr nemá co porovnávat. Hendikep by se musel počítat z rychlosti po trati,
a k tomu je potřeba vědět, kolik která loď ujela.

Tři cesty, žádná zatím nezvolená:

1. **Pravidlo místo dat, zadarmo:** směrnice řekne, že sebraná rozjížďka se
   boduje pořadím bez přepočtu. Platí hned a protest má podle čeho rozhodnout.
2. **Zapisovat polohu dojezdu**, aby se to dalo spočítat později. Dnes se
   u dojezdu ukládá jen čas. Chtělo by to polohu a přesnost z telefonu
   rozhodčího (který jede proti poli, takže je to poloha jeho — na desítky
   metrů, a koeficient je mnohem hrubší) a příznak na rozjížďce, že skončila
   sebráním.
3. **Trasy z trackeru**, které jediné dají skutečně uplutou dráhu.

I s polohami zbývá rozhodnout, co je „ujetá vzdálenost": po trati k tomu bodu
(spočitatelné hned, ale zvýhodní toho, kdo jel špatně), nebo skutečně uplutá
(jen z tras). **Kdo nezapíše polohu, zavře si obě dveře** — proto je bod 2
levná pojistka, i když se nikdy nepoužije.

### Připojení k lodi přes QR (Filip, 4. 10. 2026)

*„Co to přihlašování zjednodušit tím, že po rozkliknutí lodi se zobrazí
stránka s QR, které se appkou načte."*

**Je to druhá podoba kódu z přihlášky, ne další mechanismus.** Jeden
krátkodobý token, dvě podoby: šestiznakový kód k opsání a QR k načtení.

- **Kde se ukáže:** po rozkliknutí lodi ve správě (pořadatel při registraci)
  a kapitánovi v appce, aby si posádku připojil sám.
- **Platnost pár minut.** QR na displeji si kdokoliv vyfotí přes rameno;
  krátká platnost to riziko skoro maže.
- **Kód připojuje posádku, kapitána určuje správce ročníku** (oprava
  z 5. 10. 2026). Kdo je na lodi připojený, musí být vidět a kapitán,
  pořadatel i správce to musí umět zrušit.
- **Bez signálu zůstává opsání kódu** — načtení QR potřebuje zavolat server.

Zobrazení QR na webu je hotová věc (knihovnu už web používá u odkazu na
appku). **Načítání QR kamerou v prohlížeči je naopak nespolehlivé** napříč
telefony, proto čtečka patří do appky a na webu musí vedle QR vždycky stát
i kód k opsání.

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

### Kdo trasy vidí (Filip, 3. 10. 2026)

| Kdo | Co vidí |
|---|---|
| organizátor, správce, rozhodčí | **živě vždycky**, bez ohledu na nastavení |
| závodník | svou trasu vždycky |
| veřejnost | živou mapu, **když to organizátor zapne a rozhodčí schválí** |

**Upřesněno 9. 10. 2026 po oponentuře**, protože se to v tomhle oddíle
dalo číst dvěma způsoby. Tabulka říkala *„a rozhodčí to nezamítne"*, tedy
zveřejněno, dokud někdo nevetuje; odstavec pod ní *„organizátor
o zveřejnění požádá"*, tedy čekání na souhlas. Naprogramovat se dá obojí
a každé dává jiný výchozí stav. **Platí souhlas:** bez rozhodčího se
veřejně nic neukáže.

**Zveřejnění je atribut konkrétní regaty** (Filip, 9. 10. 2026), ne
ročníku a ne rozjížďky. Další regata tím nic nedědí a nikdo nemusí po
závodě nic vypínat — což je ta chyba, kterou by zdědění vyrobilo.

V datech to zůstávají **dvě věci** — co chce organizátor a jak rozhodl
rozhodčí —, ne jeden sloupec: po odvolání souhlasu se má vrátit to, co
nastavil organizátor, ne nic. K tomu patří záznam **kdo a kdy** rozhodl,
jinak se spor po závodě nedá rozhodnout.

**Odvolání souhlasu nepůsobí zpětně** a nemá předstírat, že ano: tabule
i telefony už data mají. Patří to do hlášky, ne do kódu.

**Oprávnění se kontroluje při vydání, ne až u mapy.** Pro trať je to
dodržené od 5. 10. 2026: roli prověří endpoint, než cokoliv vydá
(`Features/Boje/BojeEndpoints.cs`), a veřejná cesta k bójím neexistuje —
celá skupina leží pod `/sprava/`.

**Od 8. 10. 2026 to hlídá test, ne jen kázeň.** Vyšlo najevo, že handlery
správy nejdřív přeloží adresu na rozsah a teprve pak se ptají na právo —
jinak to u nich ani nejde, protože na právo se ptá *pro ten rozsah*.
Nepřihlášený tím dostal 404 místo 403 a z toho rozdílu si přečetl, které
ročníky a zastávky existují. Celá skupina `/sprava/` proto vyžaduje
přihlášení (`Features/Sprava/SkupinaSpravy.cs`) a `OchranaCteniTests`
prochází endpointy sám, takže se to u nového endpointu nedá zapomenout.

**Otevřené to zůstává pro vlastní trasu a živé polohy**: ty se budou
vydávat i divákům, tedy *mimo* `/sprava/`, kde práh přihlášení neplatí.
Dvojí zámek tam musí držet endpoint, ne teprve vrstva mapy — a rozhodnutí
patří do seznamu výjimek v tom testu, i s důvodem.

**Totéž platí pro pořadí na vodě.** Ukazovat se smí za stejných podmínek.
Pozor ale na to, co se ukazuje: pořadí v závodě rozhoduje cíl, ne vzdálenost
k bóji. Dokud není zadaná trať, je každé „pořadí na vodě" dohad a nesmí se
tak tvářit.

**Živé neznamená spolehlivé.** Na Orlíku signál padá, takže u každé lodi musí
být vidět **stáří polohy** („před 8 s", červeně „před 6 minutami"). Mapa,
která ukazuje starou polohu jako aktuální, je horší než žádná.

### Živá data na palubě: režim nastavuje regata (Filip, 9. 10. 2026)

*„Tohle je o tom, co nastaví organizátor a rozhodčí do zastávky."*

Oponentura chtěla do plachetní směrnice 2027 **jednu větu** o tom, jestli se
živá data smějí používat na palubě, a tvrdila, že musí být dřív, než se vydá
první veřejná poloha. Ta naléhavost platí; jedna věta ne. **Je to nastavení
regaty, ne pravidlo seriálu** — totéž rozhodnutí jako u tabule (*„co já vím,
jakou budou mít rozhodčí, organizátoři a lidi náladu — prostě se to musí
nechat nastavit"*). Režimy jsou dva:

| Režim | Co smí posádka za jízdy |
|---|---|
| **trať a vlastní poloha** | trať a vlastní polohu ano; polohy cizích lodí a pořadí na vodě ne |
| **jen mezi rozjížďkami** | během rozjížďky nic živého, mezi nimi a po dojezdu ano |

**Směrnice pak neříká pravidlo, říká zvolený režim** — a tady je past:
nastavení v aplikaci a věta v PDF jsou dvě různá místa a nic je nedrží
u sebe. Když se rozejdou, protest nemá podle čeho rozhodnout, tedy přesně to,
čemu ta věta měla zabránit. **Stránka regaty proto musí režim říct slovy**,
vygenerovaně z nastavení, a směrnice na ni má odkázat místo opisování.

Co tím není dotčené: **GPX do plotteru** (trať je veřejná, jakmile ji rozhodčí
přijme) a **telefon, který jen nahrává**. Pilot se žádného režimu netýká —
nahrává po dojezdu a za jízdy neukazuje nic.

#### Trasa se láme startem rozjížďky

*„Dráhy lodí se zaznamenávají a zobrazují historicky po rozjížďkách, aby v tom
nebyl maglajz; jakmile se zahájí další rozjížďka, začne se kreslit dráha lodě
znovu."*

**`Trasa` tedy visí na rozjížďce, ne na závodě** — stejně jako prvek trati
dostal nullable `RozjizdkaId` od prvního dne. Bez toho by se celý závodní den
slil do jedné čáry a nešlo by říct, co se jelo kdy.

**Zpětná animace jízd** je tím zároveň zadaná jako přehrávání *jednoho
segmentu*, ne rozsekávání dlouhé trasy podle časů. Do pilotu nepatří (shodly
se obě oponentury), ale tvar dat se rozhoduje teď, protože pozdější rozdělení
by bylo migrace nad daty, podle kterých se už jelo.

#### Kdo co vidí

| Kdo | Kdy |
|---|---|
| rozhodčí | **vždycky**, bez ohledu na nastavení |
| veřejnost živě | jen když to nevypnul organizátor ani rozhodčí |
| veřejnost zpětně | **organizátor smí jízdy zveřejnit na vyžádání, až po uzavření regaty** |

**Vypnout smí kterýkoliv z nich.** Není to obrat proti souhlasu z oddílu *Kdo
trasy vidí*, je to upřesnění: souhlas obou dál platí, jen je výslovné, že
organizátor není pouhý žadatel. V datech to zůstávají dvě věci, ne jeden
sloupec.

**Zveřejnění po regatě je třetí stav, ne tentýž knoflík.** Regata mohla jet
s vypnutým živým přenosem a jízdy se stejně hodí vydat potom, až o pořadí
nejde — a obráceně, zavřený archiv nemá zhasnout to, co lidi viděli živě.
Odvolání souhlasu nepůsobí zpětně a nemá předstírat, že ano.

### Plachetní směrnice u zastávky (Filip, 3. 10. 2026)

*„To je nutnost u regaty."* A s rozhodnutím, že **appka je oficiální
vývěska**, to platí dvakrát: právě ve směrnici musí stát, že se vyvěšuje
v appce.

| Věc | Jak |
|---|---|
| Co to je | Soubor u zastávky, zpravidla PDF od pořadatele |
| Kam | Objektové úložiště pod předponou `smernice/`, v databázi záznam |
| Verze | **Nová směrnice je nový záznam, ne přepis.** Oprava se vyvěšuje, nepřepisuje se — vývěska musí jít doložit zpětně |
| Kdo vyvěšuje | Organizátor zastávky nebo rozhodčí; u záznamu je kdo a kdy |
| Odvolání | **Záznam se nemaže, obsah se dá stáhnout.** Stažená verze zmizí z úložiště i z veřejného čtení, řádek i důvod zůstanou |
| Kde je vidět | Stránka zastávky na webu, táž obrazovka v appce, odkaz v kalendáři |
| Kontrola | Zastávka ve stavu *vypsaná* bez směrnice **má být** ve správě vidět jako nedodělek — regata bez směrnice se nejede. **Zbývá k 8. 10. 2026:** správa k ní vede jen odkaz (položka *Plachetní směrnice* v `polozkyZastavky`) a API žádný příznak o chybějící směrnici nevydává |

**Formát je soubor, ne text v databázi.** Směrnice je dokument, který
pořadatel píše ve Wordu a vydává jako PDF; převádět ho na bloky by znamenalo
přepisovat cizí úřední text a riskovat, že se naše verze rozejde s tou,
podle které se jede. Z téhož důvodu se soubor po vyvěšení nemění.

**Nahrávání není fotka.** Dnešní cesta (`Features/Fotky`) obrázek dekóduje
a překóduje, což u PDF nedává smysl. Má proto vlastní kus: strop velikosti,
kontrola, že soubor opravdu začíná `%PDF`, a uložení beze změny obsahu.

**Hotové a nasazené 4. 10. 2026** (PR #103 API, #104 web).

| Kde | Co |
|---|---|
| model a pravidla | `Features/Smernice/PlachetniSmernice.cs` — klíč `smernice/{id}.pdf`, strop 20 MB, `JePdf` podle obsahu |
| vyvěšení | `Features/Smernice/SmerniceSprava.cs` — nejdřív soubor, pak záznam; při chybě zápisu se soubor uklidí |
| endpointy | `POST`/`GET` `/sprava/serie/{serie}/zastavky/{zavod}/smernice`; veřejně v detailu zastávky jako pole `smernice` |
| web, čtenář | sekce na stránce regaty: platná verze, starší v rozbalení |
| web, správa | `/sprava/{serie}/smernice/{zavod}`, odkaz z kalendáře |

**Verze se čísluje v rámci zastávky** (1, 2, 3…) a platná je ta nejvyšší.
Mazací endpoint na *záznam* schválně neexistuje — ani pro správce.

#### Stažení z vývěsky (oponentura, 5. 10. 2026)

Do 6. 10. 2026 platilo „vyvěšené zůstává" na záznam **i na obsah** — a to
byla díra. Pořadatel, který nahrál nesprávné PDF s telefony a adresami
posádky, to neměl jak vzít zpět: kontrola formátu soubor pustí, nová verze
chybnou neodvolá a **všechny verze se vydávaly veřejně**, i u ročníku se
skrytými výsledky. Oponent k tomu dodal to podstatné: *příznak v databázi
veřejnou R2 adresu nezastaví.*

| Věc | Jak | Proč |
|---|---|---|
| Co stažení dělá | Zapíše `StazenoV`, kdo a **povinný důvod**; soubor smaže z úložiště | Oddělit záznam o dokumentu od dostupnosti jeho obsahu |
| Pořadí kroků | Nejdřív záznam, pak soubor — **obráceně než u vyvěšení** | Tady je cílem zbavit se obsahu; řádek tvrdící „visí" nad smazaným souborem by na vývěsce ukazoval mrtvý odkaz |
| Když R2 zaškobrtne | Klíč jde v téže transakci do fronty úklidu a mazání se opakuje | Záznam a cizí službu nejde smazat jednou transakcí |
| Veřejné čtení | Staženou verzi **nevydá vůbec**, ne jen bez adresy | Appka zůstává lidem na telefonech; starší klient by o stažení nevěděl a odkaz na odvolaný dokument je to jediné, co se stát nesmí |
| Cache | Směrnice se ukládá s `no-store`, ne s roční `immutable` jako fotky | S roční cache by Cloudflare vydával kopii smazaného souboru ještě rok po odvolání |
| Co vzít zpět nejde | Kopie, které si už někdo stáhl | Platí vždycky a je to tak napsané i v hlášce |

**Zbytek po starých verzích.** Směrnice vyvěšené před 6. 10. 2026 v 00:57
(nasazení `6e1d2d0`) mají v hlavičce roční `immutable`, takže po stažení
může Cloudflare ještě chvíli vydávat kopii z edge cache. Jistotu u nich dá
jen ruční *Purge by URL*; obrazovka proto u takové verze ukáže přesnou
adresu souboru.

**Platí to jen pro ně.** `Vyveseni.MohlaUvaznoutVCache` porovná okamžik
vyvěšení s `CacheVypnutaOd` a novějším souborům se purge nepřipomíná —
u nich je stažení účinné hned a připomínka by byla jen šum. Konstanta je
o hodinu po nasazení, aby hraniční soubor spadl na bezpečnou stranu.

**Ke 6. 10. 2026 není na produkci vyvěšená ani jedna směrnice** (ověřeno
přes veřejné čtení všech zastávek obou ročníků), takže starou cache nemá
co držet a pročišťovat není co. Mechanismus je tu pro případ, že se nějaká
najde na nepublikované zastávce.

**Co zbývá:** upozornění ve správě u vypsané regaty bez směrnice a zobrazení
v appce. Appka dnes směrnici nenese, i když ji API vydává.

### Revize sady výsledků (oponentura, 5. 10. 2026)

Uložení zápisu přichází jako **celá sada** a maže, co v ní není — bez toho
by se omylem zapsaný řádek nedal odstranit. Druhá strana téže mince je díra:
telefon bez signálu, který drží sadu A–B, po připojení smaže C doplněné
mezitím na webu. **Server ten konflikt sám nepozná**, obě sady jsou platná
data.

| Věc | Jak | Proč |
|---|---|---|
| Co klient posílá | `revize` — podobu sady, ze které vycházel | Číslo stačí: nejde o to vědět, co se změnilo, ale že se změnilo |
| Bez revize | **Neprojde** | Není to „tak tedy bez kontroly" — sada naslepo umí smazat opravu, o které klient nevěděl |
| Při nesouladu | `409 Conflict` i se současným stavem; klient si **svou sadu nechává** | Zahodit rozepsaný zápis z cíle je horší než konflikt |
| Souběh | Uložení drží `FOR UPDATE` na řádku rozjížďky | Bez zámku si dvě uložení přečtou tutéž revizi, obě projdou a druhé přepíše první |
| Po uložení | `Revize` se zvýší | Starší klient už neprojde |
| Použití cizího snímku | Posílá právě platnou revizi | Snímek se bere z databáze, takže kontrola by tu neměla co hlídat |

**Další idempotence se nepřidává.** Opakované odeslání téže sady je bez
následku samo: je to úplná podoba výsledků, ne přírůstek.

**Zavádí se po krocích** („rozšiř a stáhni"), protože jinak by nasazení API
zastavilo zápis z vody:

1. API revizi vydává a hlídá ji **tomu, kdo ji pošle**; sada bez revize
   projde a zaloguje se. *(hotovo)*
2. Cílová obrazovka i formulář z papíru revizi posílají. Na `409` cílová
   obrazovka **přestane opakovat** — sada vychází ze starší podoby a každý
   další pokus skončí stejně — klepnutí nechá v telefonu a odkáže na
   porovnání zápisů. *(hotovo)*
3. Sada bez revize se odmítne. *(hotovo)*

### Mapa na webu i v appce

Web má vlastní stránku s polohami (Filip, 3. 10. 2026), ne jen appka —
na břehu se lidi dívají na telefon i na notebook.

**Návrhy k dořešení** (Filip je otevřel 3. 10. 2026, nejsou rozhodnuté):

- **Po kliknutí na loď** karta zespodu: jméno a kategorie, stáří polohy,
  rychlost a kurz, tlačítka *Sledovat* a *Jen tuhle stopu*.
- **Ostatní stopy ustupují ve třech úrovních**: vybraná plně, ostatní v téže
  kategorii tence a průhledně, jiné kategorie jen jako tečka polohy. Stopa
  navíc slábne do minulosti.
- **Řazení lodí**: dokud není trať, podle kategorie a průběžného pořadí
  v seriálu, s popiskem, že je to pořadí seriálu; po dojezdu podle výsledku.
- **Historie plavby**: stopa s přehráváním (1×, 10×, 60×), graf rychlosti
  propojený s mapou a barva stopy podle rychlosti. Porovnání dvou lodí
  a stažení GPX až na skutečných datech.

### Tabule do hospody (Filip, 9. 10. 2026)

*„Stránka, která by se dala pustit v hospodě na telku, když se něco pojede —
aktuální data rozjížděk, lokace a dráhy lodí, stav regaty a rozjížděk.
Prostě map / LiveRanking / dashboard pro diváky a případně média."*

**Rozpadá se to na dvě části a ta efektní stojí na nenapsaném.** Stav
k 9. 10. 2026:

| Co by na tabuli bylo | Stav |
|---|---|
| stav regaty a jednotlivých rozjížděk | hotové |
| startovní listina | hotové |
| výsledky rozjížděk | hotové, ale **jen publikované** |
| průběžné pořadí poháru | hotové |
| trať — bóje, mapka, GPX | data hotová, veřejně se nevydávají; viz *Trať je veřejná, jakmile ji rozhodčí přijme* |
| polohy a dráhy lodí | **neexistuje nic** — fáze 8, trasa jako entita ani poloha v appce nezačaté |

**Tabule bez trackeru dává smysl sama** — co se zrovna jede, kdo je
přihlášený, jak dopadly odjeté rozjížďky, jak to hýbe pohárem — a je to
schránka, do které mapa a živé pořadí jen zapadnou, až fáze 8 vznikne.

**Stav u každého čísla, a dá se to nastavit** (Filip, 9. 10. 2026). Oba
oponenti radili ukazovat **jen publikované výsledky**. Filip zvolil třetí
cestu: tabule nahoře řekne, že **hodnoty jsou informativní a jejich
platnost potvrzuje, případně mění rozhodčí**, a u každého výsledku ukáže,
v jakém je stavu — *under review* jako ve vodním slalomu, *potvrzeno* se
zazelená, protest a jeho vyhodnocení taky. *„Alespoň to bude mít procesní
děj."*

Tím se spor o nepotvrzená čísla neřeší zamlčením, ale tím, že číslo nese
svůj stav. **Má to dvě ceny.** Za prvé se stav výsledku stává součástí
veřejného kontraktu, ne jen vnitřkem administrace. Za druhé se tím na
tabuli dostanou **protesty**, a ty jsou právě ta nedodělaná část fáze 5 —
u výsledku není kam zapsat číslo a `RDG` zatím dostává místo za posledním
dokončivším.

**Proto je to přepínač u regaty, ne pravidlo** (Filip tamtéž: *„co já vím,
jakou budou mít rozhodčí, organizátoři a lidi náladu — prostě se to musí
nechat nastavit"*). Výchozí stav je ten konzervativní, tedy **jen
publikované**; kdo chce procesní děj, zapne si ho. Rozhodnutí tím nepadá
na nás ani napevno do kódu.

**Tři rozhodnutí, která si to vyrobí, ať je uděláme předem:**

1. **Živé dojezdy versus workflow.** Hospoda chce čísla hned, jenže zápis
   schválně čeká na rozhodčího a publikaci dělá správce. Tabule
   s nepotvrzenými dojezdy vyrobí u piva „změněné výsledky", které se jen
   poprvé ukázaly moc brzy. Buď jen publikované — někdy i o půl hodiny
   pozadu —, nebo výslovně **předběžné, nepotvrzené**, a to zasáhne do
   workflow výsledků, ne jen do zobrazení.
2. **Pořadí na vodě je dohad.** Pořadí v závodě rozhoduje cíl, ne vzdálenost
   k bóji (*Kdo trasy vidí*). LiveRanking se tak musí i tvářit, jinak tabule
   vyrobí výsledek, který neplatí.
3. **Dvojí zámek u živé mapy.** Organizátor o zveřejnění požádá, rozhodčí má
   veto, a držet to musí **endpoint**, ne až vrstva mapy — veřejné živé cesty
   povedou mimo `/sprava/`. Tabule je první věc, která tenhle návrh donutí
   doopravdy postavit.

**Dvě provozní, obě opravené po oponentuře 9. 10. 2026** — původní znění
tvrdilo u obou pravý opak toho, co kód dělá.

**Stáří polohy se nesmí vykreslit na serveru.** Mikrocache stojí **před
webem** a drží odpověď 10 s (`proxy_cache_valid 200 404 10s`
v `deploy/cache/default.conf`), takže serverem vykreslené „před 8 s" v ní
zmrzne a bude lhát o deset vteřin plus dobu jednoho vykreslení. Posílat se
proto musí **čas zdroje** a stáří si spočítá prohlížeč. Tím se cache
z překážky stává výhodou: jeden snímek obslouží celou hospodu.

**Výpadek API dnešní web nepřežije.** `Vypadek` se vykresluje jako součást
stránky, která vrací **200**, takže ho nginx uloží jako platnou odpověď —
a `proxy_cache_use_stale updating` chyby nepokrývá, takže starou dobrou
stránku při výpadku nevydá. Tabule tedy dneska ukáže „nedaří se načíst",
ne „data stará šest minut". Je to **požadavek, ne vlastnost**: buď výpadek
nevracet se stavem 200, nebo nechat tabuli držet poslední dobrá data
v prohlížeči.

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

**Na webu a v appce „regata", ne „zastávka"** (Filip, 22. 9. 2026: „jako
je v jachtingu obvyklé"). Týká se textů pro lidi — v kódu zůstává `Zavod`
a v adresách `/zavody/…`, přejmenovat je by rozbilo odkazy i API. Plán
a starší komentáře slovo „zastávka" místy drží; znamená totéž.

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
| 5 | **Administrace a workflow** — zadávání, stavy, publikace, protesty a penalizace | skoro hotovo | Oprávnění, kalendář a workflow výsledků hotové 11. 9. 2026; zápis výsledků, přihlášky lodí a role od rozhodčího 14. 9. Zbývají protesty a penalizace — vedle odpovědí rozhodčího k nim chybí u výsledku pole pro číslo (`Vysledek` ve `Features/Zavody/Zavod.cs`), takže ZFP ani náprava nemají kam; `RDG` proto zatím dostává místo za posledním dokončivším (doc u `BodyRozjizdky`) |
| 6 | ~~**Blog a fotky** — model, import, veřejné čtení, novinky na webu~~ | **hotovo 16. 9. 2026** | Psaní článků i fotky v kartách hotové 11. 9. 2026; nahrávání do R2 i bucket s vlastní doménou 16. 9. 2026 (viz *Fotky v R2*). Úložiště se zapne jen při úplném nastavení (`FotkyNastaveni.Uplne`) a vydává `immutable` cache (`UlozAsync` ve `Features/Fotky/Uloziste.cs`); ověřeno 8. 10. 2026, že produkce fotky z `orlickypohar-foto.klihovka.cz` doopravdy servíruje |
| 7 | **Upozornění** — veřejná i účastnická, odesílání, Outbox | 2–3 týdny, **nezačatá** | Oba předpoklady jsou hotové: identita z fáze 4 (9. 9. 2026) i napojení osoby k lodi (4. 10. 2026, `Features/Lode/VazbaKLodi.cs`, kapitánství upravené 5. 10. 2026). K 8. 10. 2026 v kódu přesto není Outbox, tabulka `Zarizeni` ani odesílací úloha. Data pro upozornění „změna trati" už jsou — přenastavená bóje se nepřepisuje (`Boje.NahrazujeId` a `NahrazenaV`); chybí odeslání, ne záznam |
| 8 | **Tracker** — ~~bóje na trati~~, záznam trasy, offline, nahrání, prohlížení | bóje **hotové 9. 10. 2026** (API 5. 10., obrazovka 9. 10.), zbytek 4–6 týdnů | Samostatná linka; potřebuje jen identitu a kontext závodu. Bóje mají API (`Features/Boje/`), migraci `20261005193300_Boje`, deset testů a od 9. 10. 2026 i obrazovku na webu (`/sprava/{ročník}/boje/{regata}`) a podporu v mocku. Trasa jako entita, mapa ani poloha v appce nezačaté |
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
| **Zitadel** | druhá aplikace se skutečnými uživateli | **nastala**, hotovo 9. 9. 2026 — řešila fáze 4, běží na `ucty.klihovka.cz` |
| **Outbox** | akce, která nesmí být ztracena | **nastane s fází 7** — push rozhodčího lodím; k 8. 10. 2026 v kódu žádné odesílání, Outbox ani `Zarizeni` není |
| Stavy životního cyklu projektů | čtvrtý projekt | tohle je druhý |

Platí pravidlo platformy č. 5: **vlastní interní `UserId`** a tabulka
`(issuer, subject) → UserId`. Nikdy `sub` z tokenu jako primární klíč.

## Zodpovězeno

| Otázka | Odpověď |
|---|---|
| Z čeho se počítá DNC | **z lodí přihlášených do závodu** (na tu zastávku) v kategorii, rozhodčí 22. 9. 2026. Ne z přihlášených do ročníku |
| Shodně špatné výsledky při škrtu | škrtá se **dřívější** — ZPJ A2.1, potvrdil rozhodčí 22. 9. 2026 |
| Nuly u zrušených zastávek | jen zápis „nejelo se", do bodů ani rozstřelu nevstupují |
| Proč má DNF jiné body než DNS | nemá mít: **ZPJ A5.2**, všechny kódy = přihlášených do závodu + 1 (rozhodčí, 22. 9. 2026); `RDG` zatím za posledním |
| 24hodinovka | **bonus**: 1. místo −1, 2. místo 0, 3. místo 1; neúčast bez bonusu |
| Diskvalifikace | **20 bodů** do seriálu, dá se škrtnout; hodnota je zatím pracovní |
| Škrty v závodě | 4 odjeté rozjížďky = 1 škrtačka (potvrzeno) |
| Škrty v seriálu | při 9 zastávkách **2** (číslo na ročníku) |
| Shoda bodů | počet 1., 2., … míst po škrtech, pak poslední společně dokončená regata |
| Nositel bodů v seriálu | **loď**, ve výsledcích se uvádí jméno majitele |
| Kategorie | **loď jede celý rok v jedné** → kategorie patří celoroční přihlášce |
| Škrty | liší se závod od závodu → pole na `Zavod`, ne na sérii |
| Rozhodčí | rozsahová role, na závod i na sérii týmž mechanismem |
| Workflow | všechny stavy, správce smí přeskočit dopředu |
| Různá pravidla závodů | čísla a přepínač na `Zavod`, viz bodování výš |
| Vyhodnocení 24h | celé pole dohromady, ale **do seriálu po kategoriích** |

## Pravidla seriálu od rozhodčího (22. 9. 2026)

Zdroj: Miloš Zvonař (YC Písek), *Pravidla pro výpočet pořadí po kategoriích
v Orlické sérii* (PDF), sešit *Pořadí Orlická série 2026-2.xlsx* po Poháru
Slunce a jeho zprávy Filipovi z 22. 9. 2026. V PDF jsou navíc dvě fotky
ručních listin Race Champagne 2024 (Colins YC) jako ukázka škrtání — pro
výpočet z nich nic neplyne.

**Co pravidla říkají:**

- Tři kategorie: do 7 m, nad 7 m, Race. **Regaty se bodují podle svých
  vlastních pravidel** (po kategoriích, celkově, dřevěné lodě…), do série se
  vždy dopočte pořadí v kategorii.
- Nízkobodový systém: 1. místo 0, 2. místo 1, …
- **Neúčast: tolik bodů, kolik je lodí ve třídě** — v sešitu to znamená lodí
  kategorie, které na zastávce byly. Sedí na všech zastávkách.
  Miloš to později upřesnil: „počet přihlášených lodí ve třídě plus 1". Je to
  **místo** za posledním jako v A5.2. Na seriálové stupnici, kde se od místa
  odečítá jedna, vychází přesně počet lodí, takže výpočet zůstává.
- **Diskvalifikace v regatě 20 bodů** (závažné porušení pravidel, nesplnění
  alternativního trestu nebo splnění bez svědka, dál podle ZPJ). Miloš k tomu:
  tresty dávají ZPJ, **body si „nějak vymyslel" a může to být špatně**.
  Filip: varianty si necháme navrhnout později. Do té doby platí 20.
- **24hodinovka: bonus** −1 / 0 / 1 / … Neúčast na ní bonus nemá (sešit:
  nad 7 m jelo osm lodí, nepřítomní mají 8).
- **Shoda po škrtech:** 1. počet prvních, druhých, … míst; 2. lepší umístění
  v poslední regatě, kterou obě lodě dokončily na bodovaném místě a žádné
  z nich se neškrtá.
- **Škrty** (zprávy): „4 odjeté rozjížďky – 1 škrtačka" potvrzuje pravidlo
  pro závod; „9 odjetých – 2 škrtačky" platí pro ročník.

**Jak je to v kódu:**

| Pravidlo | Kde |
|---|---|
| neúčast = lodí kategorie přihlášených do závodu | `SerieBodovani.BodyDoSerie`; kdo neúčast dostane, určují přihlášky do ročníku, počet účasti na zastávce |
| bonus 24hodinovky | `Zavod.PosunDoSerie` (−1), nový sloupec; nastavuje se importem |
| DSQ = 20 | `DSQ` ve **všech** rozjížďkách zastávky; příznak na účasti doplníme s rozhodčím (Filip, 22. 9.) |
| počet škrtů | `Serie.PocetSkrtu`, nový sloupec, výchozí 1, ročník 2026 má 2 |
| kódy v rozjížďce = přihlášených do závodu v kategorii + 1 (A5.2) | `Bodovani.BodyRozjizdky`; přihlášená je loď s jakýmkoliv výsledkem v závodě |
| rozstřel | `SerieBodovani.Rozstrel`: porovnává **umístění, ne body** — −1 ze 24hodinovky je první místo stejně jako 0 jinde |

API pořadí vydává navíc `kody` (DNC, DSQ) a `skrtnute` (indexy zastávek),
aditivně. Web škrtnuté zastávky přeškrtne a kód ukáže u čísla.

**Ověření:** `SerieTests` proti sešitu po Poháru Slunce. Součet sedí u všech
37 lodí, dva škrty u 34, pořadí po škrtu všude kromě pěti řádků:

- LUNA (−1, sešit 0), DEPRESSO (10, sešit 13), MICHELLE (32, sešit 36) —
  aritmetika v sešitu; CASSIOPEIA a SPRUNZEL se posunou za MICHELLE.
- **JOY a Charlotte III** mají po škrtech obě 7. Charlotte má jedno první
  místo, JOY žádné, takže podle pravidla vede Charlotte; sešit má JOY před ní.

Opravy dat od rozhodčího: JOY na FxCK Cancer má 2 (v sešitu prázdná buňka,
je to neúčast). Pohár Slunce nad 7 m má u neúčasti 15, správně 13 — „dvě
lodě přijely jen teď, už jsem je nechtěl ručně propisovat". Náš výpočet dává 13.

**Listina FxCK Cancer převedená do dat (22. 9. 2026).** Jediná zastávka,
kde máme obě strany skutečné: výsledkovou listinu rozjížděk
(`data/2026-fxck-cancer.json`) i sloupec v sešitu. `SerieTests` ji prožene
celým výpočtem a všech 19 lodí dá do seriálu přesně čísla ze sešitu.
Vyplavala přitom chyba: shodu v závodě rozhodoval nejlepší jednotlivý
výsledek a pak abeceda. SOCKA a FAR STAR III mají v Race obě 3 + 4, listina
i sešit dávají přednost SOCKA (lepší v poslední rozjížďce). Rozstřel
v závodě je teď podle ZPJ A8.1 a A8.2. Generátor bere u FxCK Cancer
rozjížďky z listiny, ostatní zastávky zůstávají vymyšlené.

**Ročník nanečisto** (`tools/gen-mock.py`) od 22. 9. skládá rozjížďky tak,
aby pořadí v kategorii na každé odjeté zastávce bylo **skutečné ze sešitu**
— rozhodčí na webu vidí svá čísla. Rozjížďky, časy a posádky zůstávají
vymyšlené. Radavská regata je zrušená, Pohár Slunce odjetý, loď SANDY
(v pozdějších sešitech není) vypadla.

**Dotaz na soulad se ZPJ (22. 9. 2026, odpoledne).** Miloš se ptal, kolik
dát za neúčast, aby to bylo v souladu s pravidly ČSJ. Navrhl jsem číst ročník
jako jeden závod a zastávky jako rozjížďky; pak by neúčast (DNC, ne DNS —
A10) měla podle A5.2 počet lodí přihlášených do ročníku, nad 7 m tedy 25.
Odpověď: **„přihlášených lodí ve třídě ne"** — ne do ročníku. Upřesněno
hned potom: **„musí to být podle přihlášených lodí do závodu"** — tedy počet
lodí kategorie přihlášených na tu zastávku, včetně těch, které nepřijely
(stavy zapsaná, potvrzená, nedostavila se, vyloučená; `Bodovani.PrihlasenaDoZavodu`).
Stejné číslo platí pro kódy v rozjížďce (A5.2). Sešit bral lodě, které
na zastávce byly; bez přihlášek na zastávku to jinak nešlo. **„Škrtání ano"** — při shodně špatných výsledcích se škrtá
dřívější (A2.1), v závodě i v seriálu. Rozstřel zůstává podle jeho znění,
ne podle A8.2 (to by bralo i škrtnutou poslední rozjížďku).

**Odpovědi rozhodčího na doplňující otázky (22. 9. 2026, WhatsApp):**

| Otázka | Odpověď |
|---|---|
| JOY před Charlotte III | „asi moje chyba" — platí výpočet, Charlotte je třetí |
| Zephyr na 24hodinovce | „asi nejel, moje chyba" — neúčast podle pravidla |
| ČERVENÉ CAFE, 20 bodů | „je podle platných pravidel, na příští rok upravíme" — diskvalifikace 20 platí pro 2026 |
| Od kolika zastávek dva škrty | „od devíti, co bylo dřív, neřešit" — `Serie.PocetSkrtu` = 2 |
| Vánoční regata | zrušená a od 23. 9. 2026 **v ukázkových datech vůbec není**: termín nikde zapsaný není a vymýšlet ho nebudeme — viz *Termínová listina 2027* |
| LUNA −1, DEPRESSO 10, MICHELLE 32 | platí výpočet, v sešitu chyba |

**Zbývá:** seznam lodí přihlášených na zastávky, které nepřijely, a dvě nové
lodě z Poháru Slunce (které, jaká kategorie). Miloš na to teď nemá čas;
Filip: „až budeš vědět, napiš a necháme to dojet". Body za tresty se upraví na ročník 2027.

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

## Termínová listina 2027 (23. 9. 2026)

Zdroj: *Orlická série 2027 — Termínová listina* (PDF od rozhodčího, jedna
strana). Spolu s ní dorazila znovu *Pravidla pro výpočet pořadí po
kategoriích v Orlické sérii* — **tentýž dokument, který plán zaznamenal
22. 9. 2026**, beze změny. Nové je jen to, že obě fotky ručních listen Race
Champagne 2024 (Colins YC, 26. 9. 2024) jsou vedené **po třídách lodí**
(BAVARIA 41S, ELAN E4) a mají sloupce `1.R`–`8.R`, `body celkem`, `body
úprava`, `Pořadí`. Je to nezávislý doklad, že i cizí pořadatel vede listinu
jako rozjížďky, součet, úpravu o škrt a teprve pak pořadí — tedy přesně
tvar, který drží `Zavod`.

**Kalendář 2027:**

| # | Regata | Termín | Start | Typ | Pořadatel |
|---|---|---|---|---|---|
| 1 | Jarní vítr | 15. 5. | Marina Orlík | dálková plavba | Marina Orlík |
| 2 | Radavská regata | 26. 6. | YCPK Radava | okruhový | Yacht club Písek YCPK |
| 3 | Dvacetičtyřhodinovka | 9. 7., 19:00 | Marina Orlík | maraton 24 h | Jacht servis Novák s podporou YC Corona |
| 4 | Vánoční regata | 24. 7. | Surf & Ski Trhovky | dálková plavba | Jacht servis & Wake-surf.cz |
| 5 | Izolepa cup | 31. 7. | Marina Orlík | okruhový, „počítá se první rozjížďka" | Colins yacht club CYC |
| 6 | FxCK CANCER regata | 14.–15. 8. | Marina Orlík | okruhový | Sport Eli & Cancer team |
| 7 | Radavský pohár | 28. 8. | YCPK Radava | okruhový | Yacht club Písek YCPK |
| 8 | O pohár Vltavy | 4. 9. | Marina Orlík | dálková plavba | Roman Vagenknecht & plachtiči z Vltavy |
| 9 | Pohár Slunce | 18. 9., 10:00 | Marina Orlík | maraton 8 h | Jacht servis Novák s podporou YC Corona |

**Co potvrzuje:**

- **Devět zastávek a tatáž sestava jako 2026**, ve **stejném pořadí**.
  Seriál má stabilní kostru, ročník se nepřeskládává.
- **Sezóna je jedno léto**, tady 15. 5. – 18. 9. Termíny 2027 jsou proti
  2026 posunuté o tři až osm týdnů později, takže datum zastávky je vlastnost
  ročníku, ne seriálu — kalendář se musí zadávat po ročnících, což model
  dělá.
- **Pořadatel je cizí subjekt a mění se.** Tři různí pořadatelé jedné
  zastávky napříč dvěma roky nejsou výjimka, jsou pravidlo. Potvrzuje to
  `Poradatele` jako samostatný řez a ne text v závodě.
- **Závod má jednu ze čtyř podob** — okruhový, dálková plavba, maraton 24 h,
  maraton 8 h. Typ řídí počet rozjížděk a tím i škrt.

**V čem se rozešla s tím, co o ročníku 2026 tvrdil `tools/gen-mock.py`**
(stav před 23. 9. 2026; co se z toho opravilo, je hned pod tabulkou):

| Regata | Mock 2026 tehdy | Listina 2027 |
|---|---|---|
| Jarní vítr | YC Orlík, okruhový, 4 rozjížďky | Marina Orlík, **dálková plavba** |
| Radavská regata | LK Radava | **Yacht club Písek YCPK** |
| 24hodinovka | YC Orlík | **Jacht servis Novák + YC Corona**, start v 19 h |
| Vánoční regata | YC Orlík, **12. 12.**, fun, devátá | **24. 7.**, dálková plavba, **čtvrtá** |
| Izolepa | YC Orlík, do poháru jde **druhá** rozjížďka | Colins YC, „počítá se **první** rozjížďka" |
| FxCK Cancer | Marina Orlík, jednodenní | **Sport Eli & Cancer team**, **dvoudenní** |
| Radavský pohár | Yacht Club Písek ✓ | Yacht club Písek YCPK ✓ |
| O pohár Vltavy | Plachtič z Vltavy ✓ | Roman Vagenknecht & plachtiči z Vltavy ✓ |
| Pohár Slunce | SK Popovice, okruhový, 4 rozjížďky | **Jacht servis Novák + YC Corona**, **maraton 8 h** |

**Ukázkový ročník 2026 se tím přepsal na třech místech.** Listina sama
o roce 2026 nevypovídá, ale Filip k ní doplnil, co platí:

| Zastávka | Bylo | Je | Proč |
|---|---|---|---|
| Jarní vítr | okruhový, 4 rozjížďky, škrt 1 | `dálková plavba`, 1 rozjížďka, škrt 0 | Filip potvrdil typ z listiny |
| Pohár Slunce | okruhový, 4 rozjížďky, škrt 1 | `maraton 8 h`, 1 rozjížďka, škrt 0 | maraton jede jednu rozjížďku |
| Vánoční regata | 12. 12., `fun`, devátá | **v mocku není** | termín nikde zapsaný není |

Obě opravy ruší škrt v závodě, kde není z čeho škrtat — dálková plavba
i maraton jedou jednu rozjížďku. Pořadí v kategorii ze sešitu tím zůstává
nedotčené: s jednou rozjížďkou se pořadí v cíli rovná pořadí v kategorii.

**Vánoční regata z ukázkových dat vypadla.** Sešit ji mezi devíti zastávkami
ročníku 2026 vede, ale její termín neexistuje nikde: prosinec byl odhad podle
názvu (listina 2027 ji má 24. 7., takže vánoční není) a červen zase odhad
podle pořadí v sešitu. „Někdy v létě, ale jestli v plánu není, tak ji tam
nedávej" — Filip, 23. 9. 2026. **Ukázkový ročník má proto osm zastávek, ne
devět**, a `KontraktTests` to říkají i s důvodem. Devět zastávek dál platí
o ročníku 2026 jako takovém; rozdíl je v tom, co si smíme dovolit zobrazit.

**Dálková plavba má jedno jméno.** Mock jí u O poháru Vltavy říkal
`vytrvalostní`, jenže jeho vlastní směrnice i listina 2027 píšou „dálková
plavba". Se třemi zastávkami téhož typu by web ukazoval dva různé štítky
pro tutéž věc, tak je sjednocený.

**Úvodní článek si počet regat bere z kalendáře.** Tvrdil „devět regat od
dubna do prosince" a že ročník „končí Vánoční regatou" — po jejím vyřazení
by to byla nepravda v textu vedle správné tabulky. Teď se počet i krajní
zastávky dopočítají; věty jsou přestavěné na první pád, protože „končí
Vánoční regatou" se u každého názvu skloňuje jinak.

**Odpovědi (Filip, 23. 9. 2026):**

| Otázka | Odpověď | Co z toho v kódu |
|---|---|---|
| Platily typy z listiny i v roce 2026? | **Jarní vítr je dálková plavba**; **maratony jedou jednu rozjížďku** | Jarní vítr a Pohár Slunce přepsané, obojí jedna rozjížďka a škrt 0 |
| Izolepa: první, nebo druhá rozjížďka? | **„První" znamená první na vodě**, běh pro míčky jde napřed a nepočítá se | beze změny — `doSerie` na druhé v pořadí je totéž pravidlo |
| Kdy se v roce 2026 jela Vánoční regata? | „někdy v létě, ale jestli v plánu není, tak ji tam nedávej" | zastávka z mocku vyřazená |

**Zbývá:** pořadatelé. Sedm z devíti se mezi mockem a listinou liší a žádný
z nich potvrzený není — u ročníku 2026 zůstávají tak, jak byli.

### Ročník 2027 jako kalendář

`data/2027-kalendar.json` je listina přepsaná do importního tvaru: devět
zastávek ve stavu `Planovany`, tři kategorie, dva škrty a **prázdné seznamy
lodí, osob a přihlášek**. Nahrává se přes `POST /import/serie` jako každý
jiný ročník; `2027` je jiný slug než `2026-nanecisto`, takže si ročníky
nesahají. Ročník je v souboru **publikovaný** — na rozdíl od mocku jsou to
skutečná data a kalendář má být vidět dřív, než sezóna začne. Hlídají ho
`KontraktTests`: platný vstup, nic než termíny, chronologie a pořadí.

**Co se do modelu nevešlo** — tři údaje z listiny nemají kam:

| Údaj | Proč ne |
|---|---|
| místo startu (Marina Orlík, YCPK Radava, Surf & Ski Trhovky) | `Zavod` pole pro místo nemá |
| čas startu (24hodinovka v 19:00, Pohár Slunce v 10:00) | čas je na rozjížďce a ta vzniká až na vodě |
| „u Izolepy se počítá první rozjížďka" | je to `DoSerie` na rozjížďce, tedy taky až po závodě |

Místo startu je z nich jediné, co je vlastnost zastávky a ne jejího průběhu.
Zatím to nestaví za sloupec navíc: pořadatel bývá tentýž subjekt a jinde než
na Orlíku se nejede. Až přibude druhá marina u téhož pořadatele, je to
jednořádková migrace.

**Kalendář bez lodí byl pro web nový stav.** Stránka ročníku ukazovala
samotný nadpis *Přihlášené lodě* a pod ním nic, protože každý dosavadní
ročník lodě měl. Doplněný prázdný stav je stejný jako u kalendáře.
`tools/fake-api.py` proto bere ročník argumentem — jinak se soubor, který
ještě není v databázi, nedá na webu vidět (`.claude/launch.json`, cíl
`fake-api-2027`).

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

**Škrtá se jeden nejhorší závod** (stav sešitu po pěti odjetých; od 22. 9. 2026 jsou škrty dva). Tím je zodpovězená první otevřená otázka.
Sloupec „Body přepočet" odpovídá součtu bez nejhoršího výsledku: PEZI má
0+12+1 = 13 a přepočet 1, tedy bez dvanáctky; M1 má 44 a přepočet 31, tedy
bez třináctky.

**Co z dat čistě nevycházelo a bylo potřeba se zeptat** — všechny tři body
zodpovězené 22. 9. 2026, viz *Pravidla seriálu od rozhodčího* a *Zodpovězeno*:

1. **24hodinovka je bonusová, ne násobená.** *Potvrzeno 22. 9. 2026
   pravidly rozhodčího.* Filip slyšel, že „se počítá dvakrát". Data ale ukazují posun celého pole o jedničku dolů, ne násobek:
   vítěz −1, druhý 0, třetí 1 — a stejně ve všech třech kategoriích.

   Koeficient 2 by dal druhému 2 body a osmému 14; bonus mu dá 0 a 6.
   V seriálu je to propastný rozdíl, takže se čekalo na rozhodčího — bonus
   **potvrdil 22. 9. 2026** (viz *Pravidla seriálu od rozhodčího*).

   Není to `KoeficientDoSerie` — to pole násobí. Je to samostatný posun na
   závodě, **naprogramovaný 22. 9. 2026**: `Zavod.PosunDoSerie`
   (`Features/Zavody/Zavod.cs`, migrace `PravidlaSerialu`), výpočet ho
   přičítá k místu (`BodyDoSerie`) a endpoint pořadí ho předává
   (`PoradiAsync`). Neúčast bonus nemá; obojí drží `BodovaniTests` —
   `Na_24hodinovce_ma_vitez_minus_jedna` a `Neucast_na_24hodinovce_bonus_nema`.
2. **Několik řádků škrtu neodpovídá.** LUNA i MAMBA mají přepočet vyšší,
   než by drhnutí nejhoršího dalo. Je na −1 zvláštní pravidlo, nebo je to
   překlep? *Vysvětleno 22. 9. 2026:* ročník škrtá **dva** závody, ne jeden.
   S dvěma škrty sedí MAMBA, SULA i FILOZEP; zbylé neshody jsou překlepy
   v sešitu (viz *Pravidla seriálu od rozhodčího*).
3. ~~**ČERVENÉ CAFE má ve 24hodinovce 20.**~~ **Vysvětleno 22. 9. 2026,
   a jinak, než stojí níž:** podle pravidel rozhodčího je to **diskvalifikace
   v regatě za pevných 20 bodů**. SPRUNZEL má stejnou dvacítku z Poháru
   Slunce. Úvaha níž (místo za posledním z celého pole) je tím vyvrácená;
   nechávám ji tu jako doklad, jak snadno se ze samotného čísla vyčte špatný
   původ. **Dořešeno 22. 9. 2026:** Filip 8. 9. slyšel, že ČERVENÉ CAFE
   „odstoupila", sešit ji ale vede jako diskvalifikovanou — a rozhodčí
   dvacítku potvrdil jako „podle platných pravidel" (viz *Odpovědi rozhodčího
   na doplňující otázky*), takže platí sešit. Kód s ní tak zachází: v sešitu
   rozhodčího je ta zastávka `DSQ` za 20 bodů
   (`data/2026-poradi-rozhodci.json`, záznam ČERVENÉ CAFE) a prožene ji test
   `SerieTests.Dvacitka_za_diskvalifikaci_se_da_skrtnout`.

   Původní úvaha:
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
   **Takhle to kód počítá**: pořadí se dělá uvnitř kategorie
   (`VysledkyZavodu` ve `Features/Bodovani/Bodovani.cs`) a do seriálu jde
   pořadí mínus jedna (`BodyDoSerie`); drží to test
   `Lod_s_kodem_dostane_do_serie_poradi_ze_sve_kategorie` v `BodovaniTests`.

   **A je to nejlepší doklad, proč tabulka nestačí.** V Excelu není kam
   napsat, že loď *odstoupila*; zbylo po ní jen číslo a jeho původ se musí
   luštit zpětně. Model drží `PoradiVCili` a `Kod` odděleně, takže „RET"
   zůstane zapsaný jako fakt a body se z něj počítají. Za rok se nikdo
   nebude ptát, odkud se vzala dvacítka.

**A hlavní důvod, proč tenhle projekt vzniká:** v sešitu má vzorec **jediný
sloupec** — `Body` jako `SUM(B:J)`. `Pořadí`, `Body přepočet` i `Pořadí
přepočet` jsou psané rukou. Škrt i seřazení tedy dnes dělá člověk v Excelu
u každé změny znovu, pro tři kategorie zvlášť. To je přesně ta práce, kterou
**počítání z fáze 2 převzalo** — viz *Fáze 2 krok za krokem — hotovo* níž.

### Fáze 3 — co stojí a co zbývá

Kostra appky v `app/` (Expo, expo-router) a čtyři obrazovky: ročníky,
kalendář, průběžné pořadí, zastávka s výsledky nebo se seznamem přihlášených
lodí. Barvy má appka stejné jako web, protože je to jeden produkt.

| Zbývá | Proč to ještě není |
|---|---|
| ~~Vyzkoušet na skutečném telefonu~~ | hotovo 8. 9. 2026 — `npm run telefon` |
| ~~Sdílený klient z OpenAPI~~ | hotovo 8. 9. 2026 — `packages/api-client/generuj.sh` |
| ~~Ikona a splash~~ | hotovo 8. 9. 2026 — vlastní ikona místo šablony („Ikona je značka závodu"); logo v křivkách 15. 9. 2026, `app/assets/images/` a `app/app.json` |
| ~~Vydání (APK)~~ | hotovo 8. 9. 2026 — `npm run apk`; iOS odloženo, viz níž |

**Podoba tabulek čeká na rozhodčího, neladí se dopředu.** Filip, 8. 9. 2026:
až dorazí, jak se pořadí doopravdy počítá, bude se doplňovat počítání
i to, co se kde zobrazuje. Ladit rozložení dřív znamená stavět na pěti
dohadech (bonus u 24hodinovky, pořadí kódů, škrt, neúčast, koeficient) —
a překreslovat pak obojí, jen podruhé dráž.

**Čtyři z těch pěti rozhodčí 22. 9. 2026 zodpověděl a jsou v kódu:** bonus
u 24hodinovky (`Zavod.PosunDoSerie`), kódy podle ZPJ A5.2 — s výhradou, že
`RDG` zůstává za posledním (`BodyRozjizdky`) —, škrty jako
číslo na ročníku (`Serie.PocetSkrtu`, výchozí 1, ročník 2026 má 2) a neúčast
z přihlášených do závodu. **Nejistý zůstává koeficient**, a kromě něj hodnota
20 za diskvalifikaci, kterou si rozhodčí podle vlastních slov „nějak vymyslel"
a která se upraví na ročník 2027.

Co je hotové, tedy **stačí, že je čitelné a pravdivé**; hezké bude, až bude
co ukazovat. Otevřené u bodování zůstávají **koeficient** a **dvacítka za
diskvalifikaci** (pracovní hodnota, upraví se na ročník 2027); u protestů
čekají odpovědi rozhodčího a místo pro číslo u výsledku.

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
| 2.4 | ~~`GET /serie/{slug}/poradi`~~ | hotovo; obě čísla, jen publikovaná kola poháru ve stavu `Odjety` (`PoradiAsync`) |
| 2.5 | ~~Body závodu počítá server~~ | hotovo; web je už nesčítá, jen ukazuje |
| 2.6 | ~~Stránka průběžného pořadí~~ | hotovo; jméno lodi a body ukotvené i na telefonu |

**Co zůstávalo na rozhodčím** — bonus u 24hodinovky, pořadí kódů za `DNF`
a `DNS`, řádky, které sešitu neodpovídaly, a co znamená neúčast na zastávce —
**zodpověděl 22. 9. 2026** (oddíl *Pravidla seriálu od rozhodčího*); u
neodpovídajících řádků platí výpočet a chyba je v sešitu. Na rozhodčím dnes
zůstává hodnota 20 za diskvalifikaci, seznam lodí přihlášených na zastávky,
kam nepřijely, a dvě nové lodě z Poháru Slunce. Nic z toho se nedopočítává —
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

**Radavský pohár se jel 29. 8. 2026 a měl čtyři rozjížďky** (ruční startovní
listina od rozhodčího, CTL 260001, ředitel Štěpán Záruba; potvrzeno
23. 9. 2026). V datech byl 15. 8. a tři rozjížďky — a právě ty tři byly
důvod, proč sešit vypadal, že škrtá v rozporu s pravidlem „škrtá se od
čtyř". Škrt byl správně, chyběla rozjížďka. Pořadí z listiny se se sešitem
shoduje ve všech třech třídách, včetně ručně dopsané Sendy; u kajutových
lodí sedí i body 0 / 2 / 6, které dávají smysl jen se čtyřmi rozjížďkami
a jedním škrtem.

Zbytek listiny (čísla plachet, jména kormidelníků) do mocku nejde: ročník
„nanečisto" je veřejný a jsou to skutečná jména lidí. Pořadí v jednotlivých
rozjížďkách u tříd Race a nad 7 m je na fotce přepisované a nečitelné;
kdyby se přečetlo, patří do `data/` jako výsledková listina vedle
`2026-fxck-cancer.json`, ne do generátoru.

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

**Import přepíše i publikaci ročníku, a to bolí** (23. 9. 2026). Soubor
`data/2026-nanecisto.json` je schválně nepublikovaný, aby se vymyšlená data
nedostala ven; na produkci byl ročník publikovaný ručně. Nahrání souboru ho
tedy potichu schovalo — veřejné čtení přestalo vydávat ročník, regaty
i výsledky naráz. Import je autoritativní a tohle je jeho smysl, chybí ale
druhá půlka: publikaci ročníku nešlo zapnout jinak než dalším importem,
protože ve správě byla jen publikace zastávky a rozjížďky. Doplněno
(`POST /sprava/serie/{serie}/publikace`, smí správce). Poučení nad rámec
toho endpointu: **před importem se dívej i na příznaky, které v souboru
vypadají nevinně** — ne jen na data, kvůli kterým ho nahráváš.

**Nepublikovaná zastávka schová i publikovanou rozjížďku**, a obrazovka to
říká nahlas. Bez té věty by správce pouštěl čísla ven a divil se, že na
webu nejsou.

### Ročník bez veřejných výsledků regat (23. 9. 2026)

**Zadání (Filip).** Ročník 2026 je dojetý a slouží jako trenažér, ale jsou
v něm doložené nesrovnalosti — zveřejnit výsledky jednotlivých regat by
otevřelo zpětné spory o odjeté závody, a to je nežádoucí. Správci ho vidí
celý, protože právě na kontrolu a trénink je dobrý. Běžný návštěvník má
vidět kalendář a **konečné pořadí seriálu**, ne výsledky v jednotlivých
regatách. **Není to obecný koncept:** ročníky vedené od začátku v aplikaci
zůstanou otevřené tak jako dnes.

**Je to vlastnost ročníku, ne režim aplikace.** `Serie.VysledkyZavoduVerejne`
s výchozí hodnotou `true` — v entitě i v databázi (`HasDefaultValue(true)`).
Výchozí hodnota patří do obou: bez ní by migrace doplnila stávajícím ročníkům
`false` a schovala jim výsledky, aniž o to kdo požádal. **Mlčení se zapíná
vědomě.**

| Co | Kde |
|---|---|
| příznak a jeho výchozí hodnota | `Serie.VysledkyZavoduVerejne`, `AppDbContext` |
| veřejné čtení zastávky vrátí prázdno a příznak | `ZavodEndpoints.DetailAsync` |
| přepínač pro správce | `POST /sprava/serie/{serie}/vysledky-zavodu` |
| nastavení souborem | `SerieVstup.VysledkyZavoduVerejne` |

**Co se skrývá a co ne:**

- **Skryté:** rozjížďky, výsledky v nich, pořadí závodu i pořadí celého pole.
  Web navíc schová „Pravidla závodu" — vydávají se proto, aby šlo výsledky
  zkontrolovat, a „Do poháru" by muselo buď prozradit počet rozjížděk, nebo
  tvrdit, že se žádná nejela. A **články navázané na zastávku**
  (Filip, 23. 9. 2026: „články ať taky mlčí"): zpráva ze závodu je výsledek
  napsaný větou — „PEZI bere kategorii nad 7 m" říká totéž co tabulka,
  kterou jsme právě schovali.
- **Zůstává:** ročník, kalendář, termín, pořadatel, kdo na zastávku přijel,
  **články celého ročníku** a **pořadí seriálu i se sloupci po zastávkách**
  (Filip, 23. 9. 2026). Článek ročníku není o jedné regatě a konečné pořadí
  je veřejné tak jako tak.

**Články mlčí na jednom místě, ne na každé obrazovce zvlášť.** Pravidlo je
v `ClanekEndpoints.Publikovane` vedle staršího „článek zastávky je vidět, jen
když je vidět zastávka", takže platí najednou pro stránku regaty, výpis
novinek ročníku, bok s novinkami i úvodní stránku — a pro appku stejně jako
pro web.

**Zkratka je nahoře v endpointu, ne filtr v dotazech.** Kdyby se čísla
načetla a teprve pak zahodila, stačilo by jedno nedopatření v projekci
a byla by venku.

**Klient dostane `vysledkySkryte`, ne jen prázdný seznam.** Bez příznaku
vypadá odjetá regata stejně jako ta, co se nejela — a čtenář nemá jak
rozdíl poznat. Web i appka na něm říkají, proč čísla nejsou, a odkazují na
pořadí seriálu. Pole je aditivní, výchozí `false`; starší klienti o něm
nevědí a nic se jim nemění.

**Proč to není `Zavod.Publikovano = false` u všech zastávek:** pořadí
seriálu se počítá jen z publikovaných zastávek, takže by vyšlo prázdné
a ročník by vypadal jako neodjetý. Právě tohle hlídá
`CteniTests.Bez_verejnych_vysledku_zustava_poradi_serialu`.

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
zastávkách se dopočítává** v průběžném pořadí z přihlášky do ročníku (viz
*Pravidla seriálu od rozhodčího*); sama přihláška na zastávku nic takového
nezapisuje, protože pořadí je odvozené.

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

## Mikrocache před webem (22. 9. 2026)

Web unese ~4 stránky za vteřinu (zátěžový test 21. 9., platform
ARCHITEKTURA.md *Cache a očekávaná zátěž*), špička po rozjížďce je ~160
lidí. **Filip zvolil nginx před webem**, ne přestavbu na `"use cache"`:
aplikace se nemění a dá se vyřadit vrácením labelů Traefiku na web.

- Služba `cache` v compose, image z `deploy/cache/`. Veřejná adresa vede
  na ni; web už není v síti `edge`.
- Nepřihlášený dostane stránku nejvýš 10 s starou; klíč je adresa
  a platná hodnota cookie vzhledu `op_rezim`.
- Mimo cache: cookie sezení (`op_token`, `op_token.N`, `op_tok`), hlavička
  `RSC`, jiné metody než GET/HEAD, `/health`, přihlašování, správa,
  odpovědi se `Set-Cookie` a chyby.
- `deploy/cache/test/test.sh` to v CI ověřuje proti falešnému webu
  a **při selhání blokuje nasazení**.
- Zvažovaný systemd restart řeší `restart: unless-stopped`; zdvojení
  s Keepalived ne — web, API i databáze běží v jedné kopii na jednom
  stroji, druhý nginx by neměl kam posílat.

**Zátěžový test** jde teď na nginx, ne na web: `http://orlickypohar-cache-1:8080/`
v síti `edge`. Web sám už v `edge` není; kdo chce měřit web bez cache,
pustí `hey` v síti `orlickypohar_interni` na `http://orlickypohar-web:8080/`.
Hlavička `X-Cache` (`HIT`, `MISS`, `BYPASS`, `STALE`, `UPDATING`) ukáže,
co se stalo, a log nginxu ji má v poli `cache`.

**Co cache neřeší:** vymyšlená cookie sezení nebo náhodný parametr
v adrese ji obejdou a vynutí vykreslení. To je případ „hodně požadavků od
jednoho klienta" a patří k limitu rychlosti (S11 v platformě).

### Dvě repliky webu, rozdělené cookie sezení (9. 10. 2026)

Limity z 9. 10. (`limit_req` 2/s mimo cache, `limit_conn 8`) zaškrtily útok
přes vymyšlenou cookie, ale **flood na stále nové adresy (`?x=N`) ne** —
takový požadavek je *cachovatelný*, takže do zóny `render` nespadne, a osm
souběžných vykreslení jednovláknový web vytíží naplno.

Změřeno (platform `scripts/zatez.sh`, pět cest): z pěti zátěží selhává
jediná, a přihlášený při ní čeká **2,22 s** místo 0,15 s. Pořadatel
zapisující z vody je přihlášený, takže kritérium S11 splněné není.

**Přidat kapacitu by nepomohlo.** Čekání přihlášeného není nedostatek
výkonu, je to **fronta za útočníkem**: dvojnásobná kapacita ji zkrátí na
polovinu, neodstraní. Ověřeno přípravkem na vlastním aliasu (poučení 54):
při tomtéž floodu měl přihlášený na společné replice **1,9 s**, na vlastní
replice **0,20 s**, tedy stejně jako v klidu, a replice to vytížilo **4 %**
procesoru.

**Řešení:** druhá replika webu (`web-sezeni`) a nginx rozhoduje podle jediné
věci — má klient cookie sezení? Kdo ji má, jde na vlastní repliku; všechno
ostatní na anonymní. Flood je anonymní, takže se celý zavře do anonymní
repliky a procesor pořadatelovy repliky nechá na pokoji.

- Pravidlo je schválně **jedno a podle cookie, ne seznam cest** — seznam
  cest je přesně to, na čem padlo poučení 53.
- Druhá replika dědí prostředí a limity **přes kotvu v compose**, ne
  opsáním: vynechaná proměnná je u druhé kopie webu nejčastější chyba.
- `/health-sezeni` v cache, aby dohled druhou repliku viděl. Bez toho by
  spadlá replika sezení znamenala 502 pro každého přihlášeného, a `/health`
  by přitom hlásil klid. **Zbývá přidat dohled v Uptime Kumě** — to je
  změna u nástroje, ne v repozitáři.
- Test cache staví **dva** falešné weby, každý se hlásí jménem, a ověřuje
  oba směry i to, že se stránka jedné nedostane přes cache k druhé.

**Vědomá mez:** kdo ještě cookie sezení nemá, jde na anonymní repliku —
během floodu je tedy pomalé i samo přihlášení. Pořadatel, který je už
přihlášený, je v pořádku; ten, kdo se přihlašuje právě v tu chvíli, čeká.

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
| Radar na hodinu | `app/vystrahy.tsx`, `lib/radar.ts` | opendata.chmi.cz `radar/composite`, extrapolace `fct_maxz` a měření `maxz` (PNG) | 5 min | předpověď jen posouvá, co už prší — novou bouřku neukáže; paleta a georeference z `radar_popis_cz.pdf` (oddíl *Radar na příští hodinu*) |
| Počasí | `app/pocasi.tsx` | vložená mapa Windy, bod mezi Radavou a Velkým vírem | — | pás předpovědi jen 5 dní, `calendar` mapu neposune, tmavý režim nemá |

**Vítr** (18. 9. 2026): nahoře Vráž (16 km, nejbližší stanice s větrem),
pod ní Nadějkov, Příbram, Kocelovice a Temelín. Stahují se jen prvky
`F` (rychlost), `Fmax` (náraz) a `D` (odkud fouká) z dnešního
a včerejšího souboru stanice. Rukáv v kompasu míří po větru, pět pruhů
po 3 uzlech jako skutečný. Barva nárazů: do 5 m/s klid, do 8 čerstvý, do
11 silný, nad to prudký. Upozornění na stočení o víc než 90° za 30 minut,
jen při větru aspoň 2 m/s.

**Tlak z Kocelovic** (PR #26) — jediná synoptická stanice v okolí. ČHMÚ dává tlak
na stanici (519 m), widget ho přepočítá na hladinu moře, aby seděl
s barometrem na lodi. Trend je změna za 3 hodiny, počítaná z tlaku na
stanici (přepočet kolísá s teplotou), a slovy podle stupnice Met Office
z námořní předpovědi. Od poklesu 3,6 hPa za 3 h („rychle klesá") widget
varuje stejně jako u stočení.

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

## Obecné články a rozsah „celý web“ (22. 9. 2026)

Filip: články, které se nevztahují k poháru ani k žádné akci — a psát je
smí i **editor webu**. Dosud každý článek i každé právo patřily ročníku.

- **Obecný článek** má `Clanek.SerieId` prázdné. Veřejně `/clanky`
  a `/clanky/{slug}`, ve správě `/sprava/web/clanky`. Adresa je unikátní
  mezi obecnými (vlastní filtrovaný index — Postgres bere NULL jako pokaždé
  jiné).
- **Rozsah celý web**: `Opravneni.SerieId` prázdné. Pokrývá všechno pod
  sebou, stejně jako ročník své zastávky; na web samotný naopak nestačí
  žádné právo na ročník. Na web jde udělit jen **editor** a **správce** —
  rozhodčí a pořadatel jsou funkce v ročníku. Uděluje správce webu,
  prvního pustí importní token (týž bootstrap jako u ročníku).
- `/ja` vydává role na webu v novém poli `Web` — aditivně, `Opravneni`
  zůstává, jak bylo (appka ho má povinné).

**Web (22. 9. 2026, hotovo):**

- Správa obecných článků je tatáž obrazovka jako u ročníku, jen se slovem
  `web` místo slugu ročníku (`/sprava/web/clanky`, konstanta `WEB`
  v `lib/clanky.ts`) — bez volby zastávky a bez ročníku v drobečkové navigaci.
- Role na celý web uděluje `/sprava/opravneni-webu` (jen editor a správce).
- Veřejně `/novinky/{slug}`. Obecné články se **vmíchávají** mezi novinky
  ročníku na úvodu, v boku i na stránce novinek (`nactiNovinky`
  v `lib/api.ts`) — samostatná stránka jen pro ně by se nenašla.
- V profilovém menu přibyly odkazy „Obecné články" a „Oprávnění na celý
  web" podle pole `Web` z `/ja`.
- První správce webu (Filip) udělen 22. 9. 2026 přes importní token;
  bootstrap je tím zavřený.

## Kalendář: přepínač Pohár / Vše / Mimo pohár (22. 9. 2026)

Filip: „malý přepínač, který si nastavuji". Nahradil taby „Pohár /
Komunitní akce" — taby na stránce už přepínají třídy lodí.

- Tři polohy, volba se pamatuje v cookie `op_kalendar` na rok (stejný vzor
  jako tmavý vzhled: formulář na `/kalendar-volba`, server přesměruje zpět).
  Parametr `?kalendar=pohar|vse|mimo` ji přebije, aby šlo poslat odkaz;
  staré `?kalendar=akce` vede na „Mimo pohár".
- Platí všude, kde je kalendář: stránka ročníku, bok i úvod. Výchozí je
  „Pohár" — bok proto bez nastavení komunitní akce neukazuje, dřív ano.
- Ročník bez akcí přepínač nemá a ukazuje pohár i s uloženým „Mimo pohár".

## Výsledek akce a pořadí do poháru (22. 9. 2026)

U zastávky jsou dvě různá pořadí a dnes je vidět jen jedno. Liší se ve
třech věcech:

| | Výsledek akce | Do poháru |
|---|---|---|
| rozjížďky | všechny | jen s `DoSerie` |
| seskupení | podle akce: celé pole, po kategoriích, vlastní skupiny | vždy tři kategorie série |
| stupnice | body závodu, vítěz 1 | body do seriálu, vítěz 0, 24hodinovka −1 |

Izolepa se liší v rozjížďkách (běh pro míčky do poháru nejde), Pohár
Slunce a 24hodinovka v seskupení (vyhodnocují se jako celé pole).

**Hotovo od 23. 9. 2026:** `Zavod.Vyhodnoceni` už není jen popisek —
regata s `CelePole` nebo `Oboje` vydává i pořadí celého pole (záložka
*Celkem*) a **nastavuje se ve formuláři kalendáře** ve správě. Body do
poháru to nemění; rozhoduje jen o tom, jaké tabulky regata vyhlásí.

**Rozhodnuto (Filip, 22. 9. 2026):**

1. **Ukázat obojí.** Ne jako další záložky — ty už na stránce přepínají
   kategorie. Přepínač pohledu musí být jinde a „elegantně", třeba
   dvoupolohový přepínač „Výsledek akce / Do poháru" nad tabulkou, nebo
   nabídka pod ⋮. Pohled „Do poháru" se nabízí jen tam, kde se od
   výsledku akce liší.
2. **Celé pole bez přepočtu.** Handicap ani časy se zatím nejedou; celé
   pole je pořadí v cíli přes všechny lodě, kódy podle A5.2 z počtu lodí
   přihlášených do celého závodu.
3. **Vlastní skupiny akce na webu** (celkové pořadí, dřevěné lodě…) by
   bylo fajn vidět taky — jako další volba ve výsledku akce. Znamená to
   skupiny na závodě, které se nerovnají kategoriím série (viz *Co ukázala
   první skutečná směrnice*, bod 1).

**Ještě s Milošem:** jak přesně to zobrazovat — Filip to s ním doladí,
stavět až potom. Počítat se musí stejnými funkcemi jako průběžné pořadí,
aby stránka zastávky a seriál nemohly ukazovat něco jiného. Číslo zastávky
v průběžném pořadí má vést rovnou na pohled „Do poháru".

## Zápis z vody (plán 22. 9. 2026)

Dnešní zápis (`/sprava/{rocnik}/vysledky/{regata}/{cislo}`) je přepis
papíru po závodě: u každé lodi se vepíše pořadí nebo kód. Na vodě, když
lodě projíždějí cílem, se tak zapisovat nedá. Plán je **cílová obrazovka
na telefonu**.

**Jak to na vodě chodí (Filip, 22. 9. 2026):**

- Většinou **jeden hlídá a druhý zapisuje**. Někdy stojí dva na obou
  koncích cílové čáry, píšou na papír a pak se musí shodnout.
- **Startuje se najednou**, všechny kategorie jednou startovní procedurou.
- Lodě se poznávají **podle jména** a pak podle znaků, na kterých se domluví
  při zápisu (poznámka k lodi).
- Kolik rozjížděk se jede, rozhoduje počasí. **Loď se smí zapsat i po
  startu**, když přijede pozdě.
- U cíle je **mobilní signál**. Zápis jde rovnou na server; bez připojení
  si telefon klepnutí jen podrží, dokud se neuloží.

**Cílová obrazovka:**

1. **Nová rozjížďka.** Číslo se doplní samo, „do poháru" je zaškrtnuté,
   odškrtne se třeba u běhu pro míčky na Izolepě.
2. **Start.** Jedno tlačítko pro všechny kategorie uloží čas startu.
3. **Cíl.** Hlídač volá jméno, zapisovatel klepne na tlačítko lodi. Loď
   dostane další pořadí a čas. Na tlačítku je jméno a domluvený
   poznávací znak. Kdo dojel, přesune se do seznamu pod tlačítky.
4. **Opravy.** Vrátit poslední klepnutí, prohodit dvě lodě, přetáhnout
   loď na jiné místo.
5. **Po dojezdu.** Zbylým lodím jedním klepnutím kód (DNF, RET, DNS, OCS,
   DSQ). Pořadí v kategoriích se spočítá samo. Zápis odejde jako
   **návrh** a dál běží dnešní workflow (ověřit, schválit, potvrdit,
   publikovat).

**Pozdní loď:** „Přidat loď" přímo na cílové obrazovce — výběr z lodí
ročníku, nebo založení nové (jméno, kategorie). Tím se zároveň přihlásí
na regatu.

**Dva zapisovatelé:** každý zapisuje do téže rozjížďky na svém telefonu.
Aplikace zápisy porovná a zvýrazní rozdíly (prohozené lodě, loď, kterou
jeden nemá); zapisovatelé vyberou správné pořadí. S jedním zapisovatelem
se krok přeskočí.

**Papír zůstává:** k rozjížďce jde přiložit fotku papírového zápisu jako
doklad. Kdo telefon na vodě nepoužije, přepíše papír doma do dnešního
formuláře; ten se zjednoduší (lodě po kategoriích).

**Časy se ukládají vždycky**, i když se podle nich zatím nepočítá: až
přijde přepočet na handicap, budou data, a pomůžou i u protestů.

**Technicky:** cílová obrazovka je jediné místo správy s javascriptem —
klepání v reálném čase bez něj nejde. Zbytek správy zůstává bez něj.

**Pořadí stavby:**

1. ~~Cílová obrazovka: start, klepání s časem, opravy, kódy, odeslání jako
   návrh.~~ **Hotové 22. 9. 2026** (`/sprava/{rocnik}/vysledky/{regata}/{cislo}/cil`).
   Ukládá se po každém klepnutí celá sada, takže „odeslání" není zvláštní
   krok — rozjížďka je od založení v návrhu. Přetahování je zatím šipkami
   o místo; čas zůstává u místa v pořadí, ne u lodi.
2. ~~Poznávací znak na účasti a pozdní přihláška z cílové obrazovky.~~
   **Hotové 22. 9. 2026.** Znak je na účasti (platí pro celou regatu) a
   stojí na tlačítku lodi. Tlačítka mají lodě na regatě, zbytek ročníku je
   v „Dalších lodích" — klepnutí je zapíše a přihlásí. Nová loď jde přidat
   přímo z obrazovky; **majitele vyžaduje**, protože loď ho v modelu mít
   musí a stojí ve výsledcích vedle ní.
3. ~~Fotka papíru u rozjížďky (R2, jako fotky článků).~~ **Hotové
   22. 9. 2026.** Přikládá se u zápisu rozjížďky, nahrát ji smí pořadatel
   i u podepsaných čísel — doklad není zásah do zápisu. Veřejně nikde není,
   autora doplní API z přihlášeného a na souhlas se neptá.
4. ~~Dva zapisovatelé a porovnání.~~ **Hotové 22. 9. 2026.** Každé uložení
   zápisu zakládá **snímek toho, kdo ukládal** (`ZapisyNavrhu`). Výsledky
   zůstávají jedny — drží se v nich poslední uložená verze — ale starší
   nezmizí a obrazovka *Porovnání zápisů* je postaví vedle sebe po místech
   v cíli, zvýrazní rozdíly a nechá vybrat platnou. S jedním zapisovatelem
   je snímek jeden a porovnávat se nemá s čím.
5. ~~Podržení klepnutí bez připojení (jen pojistka, signál je).~~
   **Hotové 23. 9. 2026.** Neuložený stav leží v úložišti prohlížeče, takže
   přežije zhasnutou kartu i vybitý telefon, a odešle se sám — hned po
   návratu signálu, jinak co půl minuty. Záloha se pozná podle **otisku
   zápisu**, ze kterého vznikla: když se zápis mezitím změnil (uložil druhý
   telefon), nic se nepřepíše potichu a obrazovka nabídne odeslat, nebo
   zahodit.

## Výpadek zdroje není klid (oponentura, 5. 10. 2026)

**U výstrahy je ticho samo o sobě tvrzení.** Widget ČHMÚ při výpadku zdroje
zmizel a čtenář si z prázdného místa odvodil, že nic neplatí — „žádná
výstraha" a „zdroj se nepodařilo ověřit" se od sebe nedaly poznat.

Blok proto zůstává vždycky a místo klidné věty se zelenou tečkou ukáže
dutou šedou a větu, že se výstrahy nedaří načíst a že to neznamená, že
žádná neplatí. Odkaz na ČHMÚ platí i tehdy — při výpadku dvojnásob, je to
jediná cesta, jak se k výstrahám dostat.

**Ostatní widgety mizet smějí.** Teplota vody ani vodočet nic netvrdí tím,
že tam nejsou; výstraha ano. Teplota navíc stáří měření ukazuje sama
(„Snímek 3. 10., před 2 dny“), takže denní běh úlohy se nedá splést
s dnešním snímkem.

## Verze bodovacích pravidel (oponentura, 5. 10. 2026)

**Body se neukládají, počítají se při čtení** — a to je správně, protože
přepočet celého seriálu musí jít kdykoliv spustit znovu. Má to ale druhou
stranu: dokud byla pravidla konstanty v kódu, změnila oprava výpočtu body
i u ročníku, který se vyhlásil loni. Z uložených pořadí a kódů se pak nedá
zjistit, podle čeho se vyhlašovalo.

Co už v datech bylo, tam zůstává: **počet škrtů** na ročníku a závodě,
**koeficient** a **bonus** 24hodinovky. Tyhle hodnoty jsou věc ročníku, ne
pravidlo v kódu, a komentář u nich to říkal od začátku.

Co bylo v kódu a přitom to rozhodčí může upřesnit, drží teď
`Features/Bodovani/PravidlaBodovani.cs`:

| Pravidlo | V1 | Odkud |
|---|---|---|
| Diskvalifikace v regatě do seriálu | 20 bodů | podklady rozhodčího, 22. 9. 2026 |
| Přirážka za kód k počtu přihlášených | +1 | ZPJ 2025–2028, A5.2 |
| Náprava (`RDG`) za posledním dokončivším | +1 | provizorium, než to umí fáze 5 |

**Ročník nese číslo verze** (`Serie.VerzePravidel`, výchozí 1) a výpočet si
podle něj pravidla vyzvedne. Neznámá verze je **chyba, ne tichý návrat
k poslední**: ročník se nesmí spočítat podle něčeho jiného, než podle čeho
se vyhlašoval.

**Nová verze nikdy nemění starší.** Až rozhodčí něco upřesní, přidá se `V2`
a ročníky s jedničkou dál počítají podle jedničky. Že refaktoring nic
nepohnul, drží `SerieTests` — pořadí proti skutečnému sešitu rozhodčího.

Verzi vydávají i veřejné odpovědi (detail zastávky, průběžné pořadí), ze
stejného důvodu jako počet škrtů: bez ní se tabulka nedá zkontrolovat.

**Hranice, které oponent připomněl, už pokryté jsou:** shoda bodů proti
sešitu (`SerieTests`), neúčast jako počet lodí kategorie
(`PoradiTests.Lod_ktera_nestartovala_dostane_pocet_lodi_kategorie`)
a zrušený či neodjetý závod
(`PoradiTests.Poradi_se_pocita_jen_z_odjetych_a_publikovanych_zastavek`).

## Zastaralý soubor ročníku (oponentura, 5. 10. 2026)

**Idempotence chrání před opakováním téhož souboru, ne před jeho
zastaralostí.** Soubor ročníku se připraví jednou, během sezóny vzniknou
nové výsledky a publikace — a pozdější nahrání toho původního souboru je
přepíše. Obojí jsou platná data, takže to import sám nepozná. Přepsání
provozních výsledků proto nesmí být vedlejší účinek nahrání kalendáře.

Import má tři režimy (`rezim`):

| Režim | Co dělá |
|---|---|
| `nahled` | **Nic neuloží.** Projde celým importem a vrátí ho zpátky, takže v odpovědi stojí přesně to, co by se stalo, i s kolizemi a otiskem ročníku |
| `bezpecny` (výchozí) | Uloží, ale **odmítne celou dávku**, kdyby přepsala výsledky zapsané v aplikaci, stáhla publikaci nebo vrátila stav zápisu |
| `oprava` | Přepíše i je. **Vyžaduje otisk** z náhledu, takže se nedá pustit naslepo |

**Rozdíl se nepočítá zvlášť, počítá se skutečným průchodem.** Náhled jede
týmž kódem jako import a pak se vrátí; odhad vedle kódu by se s ním dřív
nebo později rozešel.

**Otisk** je kontrolní součet toho, co import umí přepsat: revize sad
výsledků, stav zápisu a publikace. Náhled ho vydá, oprava ho musí poslat
zpátky — mezi náhledem a potvrzením mohl někdo zapsat výsledky a rozdíl,
který člověk viděl, už neplatí. Jméno lodi v otisku není: to se měnit může
a náhled kvůli němu zneplatňovat nemá smysl.

Co se jako kolize hlásí (`Features/Import/Prepis.cs`):

- přepsalo by výsledky zapsané v aplikaci (`Rozjizdka.Revize > 0`),
- smazalo by takovou rozjížďku, protože v souboru není,
- stáhlo by publikaci regaty nebo výsledků,
- vrátilo by stav zápisu zpátky v řadě,
- **založilo by nový závod na termín, kde už jeden je** a soubor ho
  nepojmenoval.

### Rozdvojení přejmenováním (nález D)

Slug je přirozený klíč importu **a zároveň adresa**, a to je past: rozhodčí
přejmenuje regatu v sešitu, generátor z nového názvu vyrobí jiný slug,
import ho vezme jako nový závod a ten původní zůstane — závody se nemažou.
Jedné události pak patří dvě řady výsledků, příloh a odběrů. V administraci
se slug nemění (`KalendarSprava.UpravAsync`), takže jediná cesta vede
souborem.

Řeší to **`puvodniSlug` v souboru** (6. 10. 2026): regata smí říct „tahle
je ta, co u vás leží pod adresou X", a import ji přejmenuje místo toho, aby
založil druhou.

| Věc | Jak | Proč |
|---|---|---|
| Co se mění | **Jméno. Adresa zůstává** | Odkaz na zastávku už mohl někam odejít — totéž pravidlo drží administrace (`KalendarSprava.UpravAsync`) |
| Opakované nahrání | Páruje se zas přes `puvodniSlug` | Slug v databázi se nezměnil, takže nový slug ze souboru nesedí — a zůstává to idempotentní |
| Sám na sebe | Odmítne se | Přejmenování se vyplňuje jen tehdy, když se adresa liší |
| Na adresu, která v ročníku není | **Odmítne se** | Mlčky založit nový závod je přesně to rozdvojení, kterému má bránit; překlep by se poznal až podle dvou řad výsledků |
| Řetěz A → B → C | `puvodniSlug` ukazuje pořád na **A** | Slug se při přejmenování nemění, takže adresa B u nás nikdy nevznikla |
| První import do prázdna | Projde i s `puvodniSlug` na nic | Do prázdna se nedá nic rozdvojit a soubor musí zůstat nahratelný při obnově ze zálohy |
| Na adresu jiné regaty ze souboru | Odmítne se | Dvě regaty jednu adresu sdílet nemůžou, jinak si soubor sám určí, která tu druhou přepíše |
| Kolize podle termínu | U přiznaného přejmenování mlčí | Kdo řekne, že přejmenovává, rozdvojení nedělá |

**Není to umělý importní identifikátor**, který oponent doporučoval a který
jde proti rozhodnutí zapsanému v `CLAUDE.md` i v `ImportHandler` (*sloupec
„externí id" by do schématu propsal tvar zdrojového souboru*). Klíčem
zůstává slug; soubor k němu umí jen přidat větu o přejmenování. Řeší to
navíc i případ, na který vodítko podle termínu nestačí — přejmenování
**spolu se změnou data**.

## Rozcestník správy (6. 10. 2026)

**Zadání od Filipa:** *„potřebuji zpřehlednit menu tak, aby bylo na první
pohled jasné, co mám za možnosti pod jakou rolí"* a *„po přihlášení chci, aby
mě systém intuitivně navedl k zadání podle toho, kdo jsem"*.

**Co bylo špatně.** Jedinou cestou do správy byla rozbalovací nabídka pod
ikonkou účtu: deset odkazů pojmenovaných slugem ročníku („Kalendář
2026-nanecisto"). Kdo přišel zapsat dojezdy, musel vědět, že se na to jde přes
Výsledky. Přihlášky, směrnice a medailonek pořadatele v nabídce nebyly vůbec
a chodilo se na ně oklikou z kalendáře. Rozcestník neexistoval — ani `/sprava`,
ani `/sprava/{ročník}`.

**Co s tím.** `/sprava` a `/sprava/{ročník}` jsou rozcestníky:

1. **Co teď** — spočítané z dat, ne seznam obrazovek. Vrácené výsledky („1×
   k revizi, rozhodčí napsal, co je špatně"), nejbližší vypsaná regata (v den
   závodu rovnou „Zapsat dojezdy"), hotové rozjížďky, které nejsou venku.
2. **Regaty** — u každé výsledky, přihlášky i směrnice pohromadě. Pořadatel
   jedné zastávky vidí jen tu svoji.
3. **Celý ročník** a **mimo ročník** — u každé položky stojí **role, ze které
   plyne**: Kalendář *rozhodčí*, Lodě a kapitáni *správce*, Novinky *editor*.

Nabídka vede na rozcestník jedinou položkou **Správa** a zbytek pouští; kdo má
roli ve víc ročnících, dostane zkratky přímo na ně. Kdo má jediný ročník a nic
nad ním, je z `/sprava` přesměrovaný rovnou do něj.

**Oprávnění počítá jedno místo** — `web/lib/co-smim.ts`, **doslovný přepis
`Prava.Smi`** ze serveru včetně toho, že rozhodčí není stupeň. Nabídka si je
dřív odvozovala sama a **jen z rolí na ročník**, takže kdo měl roli na celý web
a žádnou v ročníku, neviděl ročníkové položky, ačkoliv na ty obrazovky smí
a po zadání adresy ho pustily. Dvě místa s vlastní pravdou o právech se
rozejdou; proto je jedno. Ze stejného důvodu zrušená zastávka nenabízí odkazy,
které API odmítne — slib naprázdno je horší než chybějící odkaz.

## Koncept z telefonu u zápisu z vody (6. 10. 2026)

Z vlastního průchodu scénáře C7 (`docs/SCENARE-OVLADANI.md`) vyšla dvě místa,
kde se **ztrácel dojezd**. Obě jsou opravená.

**Porovnání neukazovalo, co leží v telefonu.** Staví vedle sebe snímky ze
serveru — jenže klepnutí, které kvůli konfliktu neprošlo, žádný snímek nemá.
Kdo sestavoval společný výsledek podle porovnání, o ně přišel a nic ho na to
neupozornilo. Porovnání teď koncept ukáže a vyjmenuje, co má navíc proti
uloženému zápisu.

**Po ruční opravě koncept zůstával ležet.** Při návratu na cíl se nabídl
k odeslání, čímž by právě dokončenou opravu přepsal. Ve formuláři zápisu jde
teď z konceptu **doplnit jedním klepnutím** a uložení ho **vyřeší**: co uložené
pokrývá, se zahodí, o zbytku se rozhoduje vědomě. Hláška na cíli navíc
vyjmenuje, které lodě by odeslání přepsalo — „Přesto odeslat" samo o sobě
neříkalo, že přepíše uložený zápis.

Klíč a tvar konceptu žijí v jednom modulu
(`web/app/sprava/[serie]/vysledky/[zavod]/[cislo]/koncept.ts`). Sahají na něj
tři obrazovky — cíl ho vyrábí, porovnání ho ukazuje, formulář ho řeší —
a rozdíl mezi třemi kopiemi by se poznal až ztraceným dojezdem.

**Ověřeno celým průchodem se dvěma účty:** konflikt → porovnání s konceptem →
doplnění do formuláře → uložení → návrat na cíl → přenačtení stránky. Pořadí
zůstalo správné a nic se nenabídlo k přepsání.

## Co ještě chybí (audit 8. 10. 2026)

Audit devíti oblastí: appka, bóje, upozornění, tracker, zbytky fáze 5, provoz,
zkouška ovládání, data a obsah, testy. Každá mezera se ověřovala **proti kódu,
ne proti tomuhle dokumentu** — a to byl dobrý nápad: na **33 místech vedl
dokument jako nehotové něco, co v kódu hotové je** (bonus 24hodinovky, rozstřel,
verze bodovacích pravidel, bucket na fotky, bóje, rozcestník správy). Všechna
jsou týmž dnem opravená. **Pracovat podle plánu bez kontroly v kódu tedy nejde**
a tenhle oddíl na tom nic nemění: i on zastará.

Podrobný výpis všech nálezů v repozitáři není — je to jednorázový běh. Tady je
to, co má následek.

### Co blokuje nejvíc

**Appka neumí přihlášení.** Je to pořád čtecí klient z fáze 3: čtyři obrazovky,
`app/src/lib/api.ts` posílá jen `accept: application/json` a v závislostech není
`expo-auth-session`, `expo-secure-store`, `expo-notifications` ani
`expo-location`. Blokuje to pět oblastí z devíti — bóje a cíl v appce, moje
lodě, účastnická upozornění i tracker, protože všechno visí na `/sprava/*`
nebo `/ja/*`. Web tok má hotový a `web/lib/oidc.ts` s appkou počítá.

**Fáze 7 není rozdělaná, je nezačatá.** Outbox nemá entitu ani migraci, tabulka
`Zarizeni` v modelu neexistuje, odesílací úloha žádná a e-maily nemají čím jít.
Jedna věc je ale napřed: data pro upozornění „změna trati" existují, protože
bóje se přenastavením nepřepisuje (`Boje.NahrazujeId` a `NahrazenaV`). Chybí odeslání,
ne záznam.

**Z fáze 8 stojí jen bóje.** Trasa jako entita neexistuje, mapa v projektu není
ani rozestavěná, appka neumí polohu. Nález G je u bójí už dodržený — roli
kontroluje `BojeEndpoints.SmiAsync`, ne až obrazovka — takže zbývá pro vlastní
trasu a živé polohy.

**Protesty stojí na jednom chybějícím poli.** U výsledku není kam zapsat číslo
(`Features/Zavody/Zavod.cs`), takže ZFP ani náprava nemají kde být. Dokud to
pole nevznikne, nejde fáze 5 dokončit ani s odpověďmi rozhodčího.

~~**Bóje mají API, ale nikdo je nepoužívá.**~~ **Hotové 9. 10. 2026** —
`/sprava/{ročník}/boje/{regata}` pípne polohu z telefonu, přenastaví
a sebere; `tools/fake-api.py` bóje umí včetně pravidel a role, takže se
dají zkoušet lokálně. **Zbývá appka** (nemá přihlášení ani polohu)
a **mapa** — obrazovka zatím vypisuje souřadnice.

### Co by bolelo při závodu

**Migrace jdou při startu a není k nim záloha.** `Program.cs` pouští
`MigrateAsync()` při každém náběhu a nejbližší bod obnovy je noční záloha
z platformy, tedy až 24 hodin stará. O závodním víkendu je to den zápisů.
Mechanismus z toho být nemusí a není: **ruční dump před nasazením je od
9. 10. 2026 zapsaný postup** (*Den závodu*), ne něco, co si někdo musí
pamatovat.

**Obsahový bucket nemá druhou kopii.** `platform/scripts/backup.sh` bere
databáze a tajemství; fotky a vyvěšené směrnice v R2 ne. Jsou to jediná data
projektu bez záloh.

~~**Zelené nasazení, které nic nenasadilo.**~~ **Opraveno 9. 10. 2026.** Krok
`Deploy` i krok `Ověřit, co doopravdy běží` byly podmíněné
`vars.DEPLOY_WEBHOOK != ''`, takže prázdná proměnná dávala úspěšný běh,
nedotčenou produkci a nulovou stopu. Ochrana ze 6. 10. na to mlčí právem —
hlídá, *co* se nasazuje, ne *jestli* se nasazuje.

Úloha `nasazeni` teď začíná krokem **Je kam nasadit**, který při prázdné
proměnné skončí chybou dřív, než se vůbec přečte produkce; obě podmínky na
prázdnou proměnnou zmizely, protože to byly ony, kdo tu poruchu vyráběl.

~~**Pro den závodu neexistuje postup.**~~ **Napsaný 9. 10. 2026:**
[DEN-ZAVODU.md](DEN-ZAVODU.md). Dump před nasazením, pořadí kroků při výpadku
(a jak podle odpovědi poznat, jestli leží API, kontejner, nebo celý server),
proč **nasadit starší commit nejde a `obnova` to neřeší** — ta pouští jen
případ nečitelné `/verze` a rozchod háčku s produkcí, cesta zpět je `git
revert`. A to, co u vody rozhoduje: rozdělaný zápis v `localStorage` přežije,
načtení stránky bez signálu ne.

**Zátěžový test nikdy neproběhl a míří mimo cache.** Postup v
`platform/docs/PROVOZ.md` jde na kontejner `orlickypohar-web-1`, tedy mimo
nginx, který se kvůli špičce postavil.

~~**Hláška u konfliktu tvrdí nepravdu, když je telefon sdílený.**~~
**Opraveno 9. 10. 2026.** `RevizeNesedi` říkala „Rozjížďku mezitím uložil
někdo jiný" i tehdy, když to byl tentýž účet na druhém telefonu — a to je
u vody pravděpodobné (zkouška C7).

Nebylo to jen přeformulování: **autora poslední revize jde dohledat.**
`UlozAsync` zapisuje ke každému uložení snímek (`ZapisyNavrhu` s
`UzivatelId`), takže při konfliktu stačí porovnat jeho autora s tím, kdo
ukládá, a vybrat mezi `RevizeNesedi` a novým `RevizeNesediTentyzUcet`.
Dotaz jde **jen při konfliktu**, ne při každém uložení. Jeden integrační
test zkouší obě větve naráz: druhý telefon téhož účtu a cizí účet.

### Co se zapne prvními skutečnými přihláškami

~~**Veřejný našeptávač vydává jména majitelů.**~~ **Opraveno 9. 10. 2026.**
`GET /lode/napoveda?vse=true` odpovídal bez tokenu celým seznamem včetně
`majitel`, ačkoliv veřejná startovní listina vydává jen kormidelníka a majitel
je jinak jen pod `/sprava/`. Smysl to má i u vygenerovaných jmen: první
skutečná přihláška z nich udělá skutečná, protože formulář bez vyplněného
majitele zapíše jako majitele kapitána.

**Jeden řádek v projekci to ale nebyl.** Jména majitelů vypisoval i veřejný
formulář přihlášky, v nabídce lodí (`datalist` s `lode-poharu` na stránce
`prihlaska`) — tedy ne jen API, ale i stránka. Pole z `NapovedaLodiDto`
zmizelo, nabídka ukazuje kormidelníka a drží to `NapovedaTests`: pojistka na
tvar DTO nově zakazuje `majitel`, ne jen kontakty. Integrační test se navíc
ptá **syrového těla** odpovědi, protože tvrzení nad typem, který to pole už
nemá, by nehlídalo nic.

Klient se přegeneruje **až po nasazení** (`packages/api-client/generuj.sh`
stahuje dokument z běžícího API), takže `schema.d.ts` nese majitele ještě
o jedno PR dýl; web ho mezitím nečte.

~~**O zpracování osobních údajů není nikde nic.**~~ **Stránka `/osobni-udaje`
hotová 9. 10. 2026**, odkazuje na ni zaškrtávátko v přihlášce i kebab v menu.
Rozhodnutí, která si to vyžádalo (Filip, 9. 10. 2026): **správci jsou dva** —
provozovatel webu za web a databázi, pořadatel za přihlášky na svou zastávku;
**žádost jde na obě strany**, na adresu provozovatele i pořadateli regaty;
**retence zůstává ta, kterou dělá kód**. Stránka pokrývá přihlášky, výsledky
a startovní listiny, účty i fotky.

**Adresa provozovatele je v konfiguraci** (`KONTAKT_UDAJE`), ne v kódu — a
dokud je prázdná, stránka o ní mlčí a pošle čtenáře za pořadatelem. Doplnit ji
je jeden řádek v compose.

Zbývá na tom jediné, co stránka přiznává nahlas: **smazat se pořád nedá
tlačítkem**, mazací endpoint nad lodí, osobou ani ročníkem neexistuje. Minimalizace a retence hotové jsou a jsou dobré
(`UklidKontaktu.cs` maže kontakty starší než začátek předloňského roku),
jen se netýkají jmen posádky ani záznamu osoby, a **smazat se nedá nic**:
mazací endpoint nad lodí, osobou ani ročníkem neexistuje. Žádost „smažte mě"
se dnes vyřídí jedině ručním SQL na produkci.

~~**Pruh ukázkových dat nerozlišuje ročník.**~~ **Opraveno 9. 10. 2026** — a
nebylo to „jakmile se vypíše 2027", jak tu stálo: **lhalo to už tehdy.** Ročník
2027 je publikovaný od 8. 10. 2026, `nactiSerie` ho vrací první (ověřeno na
produkci dotazem na `/serie`) a úvodní stránka ho bere jako aktuální, takže pruh
visel nad termínovou listinou od rozhodčího a tvrdil o ní, že je vymyšlená.

Pruh se teď váže na ročník, o kterém stránka je (`patriPruh`
v `web/app/ukazka.tsx`): `/serie/{slug}` a `/sprava/{slug}` podle slugu, **úvod
podle toho, jestli je ukázkový některý publikovaný ročník** — úvod je smíšený,
pořadí a novinky bere z předchozího ročníku, dokud je ten nejnovější nemá, takže
se ukázková data objeví i nad neukázkovým ročníkem. Jinde pruh není. Seznam
ročníků čte server (`web/lib/ukazka.ts`) a posílá ho v props; v klientském
balíku by z `process.env` zbylo prázdno, tedy pruh, který nikdy není.

**Ročník 2027 je devětkrát `Planovany`.** Celý řetěz veřejných přihlášek
a vývěsky — vedený jako hotový — nikdy neběžel na skutečných datech. Dokud se
aspoň jedna zastávka nepřepne na `Vypsany`, je to nevyzkoušené.

### Druhá vrstva, která chybí

Žádné **bezpečnostní hlavičky**: `Content-Security-Policy`,
`Strict-Transport-Security`, `X-Frame-Options` ani `Referrer-Policy` nejsou ani
ve webu, ani v nginxu, ani v Traefiku. Není to otevřená díra — tělo článku se
vykresluje strukturovanými bloky a `dangerouslySetInnerHTML` je v celém webu
třikrát, vždy nad QR kódem vyrobeným na serveru — ale je to chybějící druhá
vrstva.

Web **nemá service worker ani manifest**, takže jedno obnovení bez signálu
cílovou obrazovku sebere (rozdělaný zápis přežije, leží v `localStorage`).
Appka se šíří jako interní APK přes QR, takže pořadatel s iPhonem ji nedostane
vůbec.

**Testy.** Správcovské endpointy se testují přes službu, ne přes HTTP, a je to
zdůvodněné rozhodnutí: testovací hostitel nemá poskytovatele identity, takže se
k endpointu s platným tokenem nedostaneš (doc u `ClankySpravaTests`). Cena toho
rozhodnutí je, že **zapomenutá kontrola práv** na jednom z 23 souborů endpointů
by neprasknula — a rozsahy oprávnění nemají ani jeden test. **Jedna polovina
té ceny je od 8. 10. 2026 zaplacená**: `OchranaCteniTests` si endpointy
prochází samy a vynucují, že každý GET pod `/sprava/` a `/ja/` bez přihlášení
odmítne; `OchranaZapisuTests` dělají totéž pro zápisy. Nehlídají ale **roli**,
jen ten práh. Web a appka nemají
test žádný, takže změnu práv na serveru nikdo nehlídá proti
`web/lib/co-smim.ts`, který je má doslova přepsané. Dependabot sleduje NuGet
a GitHub Actions, ne npm.

### Zkouška ovládání

Sezení s pořadatelem **neproběhlo.** Tvrzení, že na mocku neběží šest
scénářů, ale **z větší části neplatilo už v době, kdy se psalo** — prověřeno
proti kódu 9. 10. 2026:

| Scénář | Audit tvrdil | Jak to je |
|---|---|---|
| C3 vyvěsit směrnici | neběží | platilo; **hotovo 9. 10. 2026** — mock přijímá `POST .../zastavky/{zavod}/smernice` |
| skupina D | není účet rozhodčího | **neplatilo** — `zdenek` je rozhodčí celého ročníku (`OPRAVNENI` ve `fake-api.py`) |
| A5 skryté výsledky | neběží | příznak mock číst uměl; **hotovo 9. 10. 2026** — správce ho přepíná za běhu jako v API |
| A7, E5 dva ročníky | neběží | **E5 běží** nad `data/2027-kalendar.json`; **A7 zbývá** |
| C5 25–30 lodí | mock jich má 22 | **neplatilo** — 22 je *účastí na izolepě* z 37 lodí ročníku a scénáře říkají, že to stačí |

**Zbývá tedy A7 a sezení se skutečným pořadatelem.** Dva ročníky naráz jsou
přestavba mocku, ne přílepek: `D` je jeden globální ročník, na kterém stojí
celý soubor. Scénáře samy jsou v `docs/SCENARE-OVLADANI.md`.

### Co z toho vědomě nedělat

Stav 503 u výpadkové stránky (zdůvodněno v *Zbývá doladit*), historie kategorie
lodi, protesty do odpovědí rozhodčího, handicap do doby, kdy bude potřeba.
To nejsou mezery, to jsou rozhodnutí.

### Pořadí

1. ~~**Přegenerovat klienta z OpenAPI**~~ — **hotovo 8. 10. 2026**, a na
   něm postavená ~~**obrazovka bójí**~~ **9. 10. 2026**.
2. ~~**Pruh ukázky podle ročníku.**~~ **Hotovo 9. 10. 2026.** Mělo to být dřív
   než vypsaná zastávka — a ukázalo se, že pozdě to bylo už tak: pruh nad
   skutečným 2027 nevisel „až se vypíše", ale od jeho publikace 8. 10. 2026.
3. ~~**Majitel z našeptávače a stránka o osobních údajích**~~ — před otevřením
   přihlášek, ne po. **Obojí hotové 9. 10. 2026.** Majitel nebyl jeden řádek,
   jména vypisoval i veřejný formulář; stránka stojí na Filipových
   rozhodnutích o správcích, kontaktu a retenci a adresu bere z konfigurace.
4. **Vypsat jednu zastávku 2027** a vyvěsit u ní směrnici. Obsah, ne kód,
   a teprve tím se celý řetěz přihlášek a vývěsky zkusí na skutečných datech.
   **Je to až čtvrtý bod, ne druhý** (opraveno 9. 10. 2026). `Vypsany`
   znamená, že se lodě smějí hlásit, takže ho nesmí předběhnout ani únik
   majitele z našeptávače, ani chybějící stránka o osobních údajích. Původní
   pořadí si odporovalo samo: bod o přihláškách u sebe měl „před otevřením
   přihlášek, ne po" a stál za vypsáním.
5. ~~**Zelené nasazení bez nasazení** a **postup pro den závodu** včetně dumpu
   před migrací.~~ **Obojí hotové 9. 10. 2026** (*DEN-ZAVODU.md*).
6. ~~**Hláška u konfliktu**~~ **hotová 9. 10. 2026**, a s ní i **doplnění
   mocku** — až na A7. Mock umí vyvěsit směrnici (C3) i přepnout skryté
   výsledky (A5); tři z pěti nálezů auditu přitom neplatily, viz *Zkouška
   ovládání*.

Appka, upozornění a tracker až potom: jsou to největší kusy, ale na první závod
(15. 5. 2027) nemají vliv.

## Nápověda a prokliky (9. 10. 2026)

**Zadání od Filipa:** *„budeme tam muset udělat help s návody jak co založit
a ty informační věty (např. o založení lodi) udělat s proklikem, ať je to
user friendly."*

**Co bylo špatně.** Aplikace na spoustě míst říkala, co se dá nebo nedá
udělat — a nechala člověka stát. „Lodě se přihlašují od vypsání" neřekne,
kde se vypisuje; „kapitána určuje správce ročníku" neřekne, kdo to je ani
kde se o to říct. Inventura webu našla **154 takových vět**: u 73 cílová
adresa v aplikaci existuje a jen tam nevedl odkaz, 55 potřebuje návod
a **26 nevede nikam, protože ta funkce není**.

**Co vzniklo.** Stránka `/napoveda`, veřejná a bez přihlášení, rozdělená
podle toho, kdo ji čte: *pro závodníky* (přihlásit loď, dostat se ke své
lodi, připojit posádku), *pro pořadatele* (v jakém pořadí to jde, vypsat
regatu, přihlášky, směrnice, bóje, výsledky, kdo co smí) a *když něco
nejde* (proč regata není venku, co aplikace neumí).

**Píše se podle kódu, ne podle představy.** Role jsou opsané z
`Kalendar.KdoSmi`, `Workflow.KdoSmi` a `Prava.Smi`, stavy z `RADA`.
Při psaní se tím našla **nepravda na obrazovce**: `/pripojeni` tvrdilo, že
první připojený k lodi je kapitán a že kapitán mění role. Kód dělá
z každého posádku (`Kody.RoleProNoveho`) a role mění jen správce ročníku
(`KapitanstviEndpoints.SpravceAsync`). Věta je opravená.

**Oddíl „Co aplikace neumí" je tam schválně.** Nejdražší je hledání
funkce, která neexistuje — založit ročník z webu, zapsat posádku ve
správě, změnit kategorii lodi, pozvat člověka rolí. Krátký seznam ušetří
víc času než kterýkoliv návod nad ním.

**Kotvy jsou součást kontraktu.** Odkazy do nápovědy míří na `#role`,
`#po-sobe`, `#vypsat-regatu`, `#prihlasky`, `#smernice`, `#boje`,
`#vysledky`, `#moje-lod`, `#posadka`, `#prihlasit-lod`, `#proc-neni-venku`
a `#co-neumime` z deseti míst ve správě i na veřejném webu. Přejmenovat je
jde jen s projitím odkazů.

**Propojeno je zhruba třicet pět míst** napříč správou i veřejným webem
(9. 10. 2026): prázdné stavy, odmítnutí podle role, hlášky z API (u těch
stojí odkaz vedle textu, protože do něj nejde), kód pro posádku, stavy
regaty a zápisu, bodování a veřejná přihláška.

**Druhá nepravda, kterou to odhalilo:** veřejná přihláška tvrdila, že
kategorii lodi v ročníku změní správce. Nezmění ji nikdo —
`Prihlaska.KategorieId` se zapíše při založení (`PrihlaskaNoveLodiAsync`
v `PrihlaskySprava.cs`) a dál ji přepíše jen import. Věta je opravená.

**Zbytek je fronta, ne hotovo.** Ze 154 vět zůstává přes sto takových, kde
by odkaz byl spíš ozdoba — výpadky, prázdné seznamy s formulářem hned pod
nimi, štítky stavů. Sahat na ně má smysl až po zkoušce ovládání
s pořadatelem: ta řekne, které doopravdy zdržují, a hlavně kolik dalších
tvrzení je nepřesných jako ta dvě výše.

## Kde se pokračuje

Kdo sem přijde z jiného stroje, potřebuje vědět tohle:

1. **Rozjezd** — [JINY-STROJ.md](https://github.com/file-pb/platform/blob/main/docs/JINY-STROJ.md)
   v platformě. Na pracovním Macu je nedostupný Docker Hub, takže integrační
   testy běží jen v CI a lokální databáze nejede vůbec.
2. **Web bez databáze** — `tools/fake-api.py` servíruje mock ročník
   ve tvarech skutečného API, včetně přihlášení (identita podle tokenu)
   a osobních cest `/ja/*`. Jména účtů a pravidla jsou v README, oddíl Web.
3. **Nasazení** — nic ručního. Push do `main` postaví čtyři image (API,
   web, úloha `landsat`, nginx `cache`) a po zelených testech je háček
   vymění na serveru i s `docker-compose.yml`. Nasazení už neběží vedle
   integračních testů: úloha `nasazeni` čeká na `build`, `appka`
   i `integrace` (`needs` u úlohy `nasazeni`). Háček přenáší **jen
   compose** — cokoliv dalšího, co služba potřebuje (třeba konfigurace
   nginxu), musí jet v image.

   **Červená úloha `nasazeni` u staršího běhu není porucha.** Když jdou
   commity rychle za sebou, běhy se potkají: ten starší po odeslání přečte
   `/verze` a najde novější SHA, než posílal — a skončí chybou, místo aby
   tvrdil úspěch. Je to ta kontrola, co mluví (6. 10. 2026 se to stalo
   dvakrát). **Soudit se má podle `/verze` obou služeb**, ne podle barvy
   běhu; dokud sedí s `main`, je produkce v pořádku. **`platform#7` je od
   8. 10. 2026 zavřený** (`e0f867b` v platformě): háček pod jedním zámkem
   (`zamek` v `deploy-hook/hook.py`) přečte, co naposled nasadil, porovná to
   s hlavičkami `X-Deploy-Sha` a `X-Deploy-Poradi` (čas commitu) a starší
   build odmítne `409` (`proc_nenasazovat`); stav zapisuje taky pod zámkem.
   Je to tedy **záruka, ne zúžení okna** — ověřeno 9. 10. 2026 přečtením
   háčku, zkoušku obou pořadí má platforma ve `deploy-hook/zkouska.py`.
4. **Pravidla seriálu jsou od 22. 9. 2026 v kódu** (oddíl *Pravidla
   seriálu od rozhodčího*): neúčast, bonus 24hodinovky, dvacítka za
   diskvalifikaci, dva škrty, rozstřel. Zbývají drobné otázky vypsané
   tamtéž; na dvacítce a hodnocení trestů visí fáze 5 (protesty
   a penalizace) — Filip, 22. 9.: varianty si necháme navrhnout později.
5. **Zápis z vody je hotový celý** (22.–23. 9. 2026; koncept z telefonu
   dotažený 6. 10. 2026, oddíl *Koncept z telefonu u zápisu z vody*),
   kroky 1 až 5:
   cílová obrazovka s pozdní lodí a poznávacími znaky, fotka papíru,
   porovnání dvou zapisovatelů a podržení klepnutí bez signálu. K tomu
   přepínání rozjížďky do poháru a celkové pořadí regaty napříč
   kategoriemi (volí se v kalendáři; „obojí" mají maratony). Co zbývá,
   je zkusit to **na vodě se skutečným telefonem** — nic z toho zatím
   neproběhlo jinde než v prohlížeči proti mocku.
6. **Fáze 5 je skoro hotová** (stav k 14. 9. 2026). Hotové: udělování
   oprávnění (i rozhodčím na zastávku), kalendář zastávek, přihlášky lodí,
   workflow a zápis výsledků, psaní novinek. Protesty a penalizace čekají
   na odpovědi rozhodčího. Komunitní akce v kalendáři hotové 15. 9.
   ~~Další na řadě je **design**~~ — **hotový 15. 9. 2026** (oddíl
   *Podněty z 14. 9. 2026*, pododdíl *Design (až po funkcích)*).
   Pořadatel jako
   záznam s medailonkem hotový 15. 9.; vlastní obrázek pořadatele i fotky
   k článkům běží na R2 od 18. 9. (*Fotky v R2*). Seznam přihlášených účtů
   na obrazovce oprávnění hotový 15. 9. (oddíl *Čím pokračovat ve fázi 5*).
   Veřejné přihlášky lodí kroky 1–5 hotové 18. 9.; krok 6 čeká na
   rozhodčího, krok 7 je Outbox.
7. **Skutečná data už částečně dorazila.** `data/2025-mock.json` od
   8. 9. 2026 neexistuje; nahradil ho `data/2026-nanecisto.json`, který
   vyrábí `tools/gen-mock.py` a který v repozitáři zůstává nepublikovaný.
   Vymyšlené v něm jsou jen rozjížďky, a ani ty všechny — jména lodí,
   kategorie, regaty a pořadí v kategoriích jsou ze sešitu rozhodčího
   a u FxCK Cancer jsou skutečné i rozjížďky. Ročníkové soubory se
   skutečnými daty jsou tři: sešit rozhodčího
   `data/2026-poradi-rozhodci.json`, výsledková listina
   `data/2026-fxck-cancer.json` a termínová listina `data/2027-kalendar.json`
   — ta je naimportovaná a publikovaná, produkce ji v `GET /serie` vrací
   jako ročník `2027` (ověřeno 8. 10. 2026). Zbývají výsledkové listiny
   ostatních zastávek 2026; až dorazí, nahradí mock a nahrají se importem.
   Struktura zůstane.
8. **Widgety na webu jsou hotové** (stav k 6. 10. 2026, oddíl *Widgety
   s cizími daty*). Tlakový trend (#26) a radar na hodinu (#27, oddíl
   *Radar na příští hodinu*) hotové 18. 9.; na opendata.chmi.cz stojí vítr
   (`web/lib/vitr.ts`), výstrahy (`web/lib/chmi.ts`) a radar
   (`web/lib/radar.ts`, kreslí se uvnitř výstrah). Výstrahy od 6. 10. 2026
   nemlčí ani při výpadku zdroje. Zbývá push „déšť do hodiny" v appce,
   a ten **čeká na Outbox**, který neexistuje. Blesky nemají volný zdroj
   (ČHMÚ je nedává, Blitzortung zakazuje komerční použití).
9. **Zátěž** (stav k 22. 9. 2026, oddíl *Mikrocache před webem*).
   Timeouty kontrol zdraví (#32) a nginx cache (#34) nasazené 22. 9.
   Na produkci ověřeno hlavičkou `X-Cache`: druhý požadavek HIT, tmavý
   vzhled vlastní položka, s cookie sezení BYPASS. **Zbývá zátěžový test
   na serveru** na tempu 40 — termín před prvním závodem se skutečnými
   daty. **Postup v platform/docs/PROVOZ.md ale takhle nepoběží**: pouští
   `hey` v síti `edge` proti `orlickypohar-web-1`, a web v `edge` od
   22. 9. 2026 není (služba `web` v `deploy/docker-compose.yml`). Správné
   adresy má oddíl *Mikrocache před webem* — měřit se má `cache` v `edge`.
   Opravit to chce i v platformě (8. 10. 2026).

## Zbývá doladit

~~Nic z toho nebrání založit projekt a napsat první migraci.~~ **Projekt
běží od 6. 9. 2026** (první commit `e4e909b`, „Orlický pohár ze šablony
služby"; migrací je dnes 35) a produkce jede na `main`. Z bodů níž jsou
tři zodpovězené a otevřený zůstává jen čtvrtý.

1. ~~**Škrtají se v seriálu celé závody?**~~ **Zodpovězeno:** ano. Při
   devíti zastávkách dva (rozhodčí, 22. 9. 2026); počet je číslo na ročníku
   (`Serie.PocetSkrtu`). Škrtnout se dá i −1 ze 24hodinovky a dvacítka za
   diskvalifikaci.
2. ~~**Seznam závodů a jejich typy.**~~ **Zodpovězeno daty:** sešit
   rozhodčího vede v roce 2026 devět zastávek — Jarní vítr, Radavská
   regata, 24hodinovka, Vánoční regata, Izolepa, FxCK Cancer, Radavský
   pohár, O pohár Vltavy, Pohár Slunce — a tři kategorie: do 7 m,
   nad 7 m, RACE. Stopa z článku o čtyřech kategoriích neplatila.
   **V ročníku jich je osm, odjetých sedm:** Vánoční regata z dat
   23. 9. 2026 vypadla („někdy v létě, ale jestli v plánu není, tak ji tam
   nedávej", komentář u `ZAVODY` v `tools/gen-mock.py`) a Radavská regata
   v nich zůstává ve stavu `Zruseny`, protože se nejela (rozhodčí,
   22. 9. 2026, `ZRUSENE` v `tools/gen-mock.py`). Produkce
   u `2026-nanecisto` hlásí `pocetZavodu: 8`; devět zastávek má až
   termínová listina 2027 (ověřeno 8. 10. 2026).

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
