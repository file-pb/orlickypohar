# Závěr konzilia (12. 11. 2026)

Pět oborů, tři kola, 1 800 řádků posudků. Tohle je, co z toho platí. Nesouhlas
je zapsaný, ne zahlazený; kde nevyšla shoda, rozhodl moderátor a je to u toho
napsané.

**Podklady:** `ZADANI.md`, posudky `<obor>-kolo{1,2,3}.md`, zadání kol
`KOLO2.md` a `KOLO3.md`, makety `navrh/`.

## Co se v návrhu mění

Patnáct rozhodnutí. Pořadí podle toho, jak moc sahají do toho, co je nakreslené.

### 1. Pruh ročníku má sedm tabů, ne osm

*Otázky k aplikaci* z pruhu ven. **Shoda 1 + 3 + 4** (hlasování kola 3, všichni
pro možnost 3): není to agenda ročníku, ale fronta — objeví se jako **úkol
v *Co teď*** („3 otázky k aplikaci čekají na odpověď", pořadateli „…čekají na
rozhodčího"), a protože pořadatel odpovědi jen čte, **trvalý odkaz v patě**
vedle položek *Mimo ročník*. Tab ve Správě webu padl na adrese
(`/sprava/{ročník}/oponentura` je ročníková), nabídka pod účtem na tom, že
vrací položku odvozenou z práv tam, odkud ji audit 6. 10. 2026 vytáhl.

Pruh tedy je: **Co teď · Regaty · Kalendář · Zápis výsledků · Lodě a kapitáni ·
Novinky · Oprávnění**.

### 2. Jméno tabu výsledků — moderátorské rozhodnutí, ne shoda

4-jazyk a 5-jachting si **vyměnili pozice**: jazyk ustoupil na *Rozjížďky*
(ověřil v kódu, že `Stav`, `StavVysledku` i `Publikovano` jsou vlastnosti
rozjížďky), jachting ustoupil na *Zápis výsledků* (tab v pruhu **ročníku** je
rozcestník přes regaty, takže *Rozjížďky* míří o úroveň níž, než kam vede).
Oba argumenty jsou pravdivé, každý o jiné obrazovce. Proto:

- **tab v pruhu ročníku: *Zápis výsledků*** — vede na seznam regat, ne na
  rozjížďky;
- **dlaždice v pruhu regaty (dnes *Výsledky*): *Rozjížďky*** — tam se opravdu
  vypisují, podepisují a pouštějí ven;
- **venku zůstává *Výsledky***, protože venku je listina.

Je to syntéza, ne shoda — posoudili ji každý zvlášť, dohromady ne. Kdyby to
mělo být jedno jméno, platí *Zápis výsledků* (silnější argument o úrovni).

**Barva se nemění:** `--ukon-vysledky` sdílejí všechny tři. Jazyk i jachting
vzali námitku zpět, protože při různých jménech barva neříká „dělá se tu
totéž", ale „je to tatáž věc ve dvou fázích" — tak jako `trat` ↔ `boje` (R10).

### 3. Barvu nese vybraná dlaždice; nevybraná 45 % do `--tlumeny`

Kolo 1 (2-design): osm plných barev je duha — L\* rozptyl 15,2, při
deuteranopii *Regaty* × *Novinky* ΔE′ 1,9. Kolo 2: kompromis 45 % do `--linka`,
jenže hrana pak padne na 1,95–2,37 : 1, pod WCAG 1.4.11. **Kolo 3 to vyřešilo:
míchat do `--tlumeny`** — hrana 4,12–5,31 : 1, duha zkrocená (ΔE mezi
dlaždicemi 6,2, lepší než u vlastního kompromisu), WCAG se nepodkračuje.
**Shoda 1 + 2 + 5.** Cena: pruh je o odstín těžší.

**`--ukon-coted` se ruší.** *Co teď* nemá vlastní barvu; upomínku nese **tečka
u úkolu** a případně **počet** v tabu (*Co teď 3*, při nule nic). Důvod od
3-ux: teplá barva slibuje spěch i ve dnech, kdy nic nevisí, a to je většina
roku — barva, která lže, je horší než žádná. **Shoda 1 + 2 + 3.**

**Dvě kolize se musí odstranit:** `--ukon-opravneni` je týž hex jako
`--ukon-smernice`, `--ukon-naklady` jako `--ukon-trat` (ΔE 0,0). Obojí řeší šeď
`--ukon-uvod`, tak jako ji má *Úvod*.

### 4. Plná jména tabů

Zkracování padlo, protože padl jeho důvod. Změřeno (2-design, headless Chrome):
plná jména osmi tabů **876,5 px z 1216**, jeden řádek do okna 941 px — dnešní
**zkrácená** mřížka se přitom láme už na 1037 px. Zkracování nic nešetřilo.
**Shoda 1 + 2 + 4.**

*Kalendář* a *Novinky* zkrácené zůstávají (patro nese drobeček); *Lodě
a kapitáni* a *Oprávnění* celé. **Pozor:** na telefonu vyjde dlaždice na
77–134 px, tedy pod `@container (max-width: 10.75rem)`, kde si CSS bere
`nazevKratky` — takže „plná jména" je rozhodnutí **o monitoru** a každá položka
pruhu musí mít i krátkou podobu, jinak z dlaždice vyteče.

### 5. Telefon: dotykový cíl 44 px a práh 6,6 rem

Rozpor v číslech rozsekl 1-ergonomie měřením v prohlížeči proti živému
`globals.css`: **350 px** je aplikace (`.obal { padding: 0 1.25rem }`), 361 px
byla maketa. 2-design to uznal.

| displej | práh 7,25 rem (dnes) | práh 6,6 rem |
|---|---|---|
| 390 px | 2 sloupce / 4 řady / 196 px | 3 / 3 / **146 px** |
| 375 px | 2 / 4 / 196 px | 3 / 3 / **146 px** |

**Dvě řady se dostat nedají** — čtyři sloupce chtějí práh ≤ 5,17 rem a čtyři
karty se pak překrývají, aniž by vzniklo vodorovné rolování, takže to rychlé
měření nepozná.

2-design chtěl místo prahu zrušit mřížku a dát `flex-wrap`; 1-ergonomie změřil,
že flex se rozbije o `container-type: inline-size` (`globals.css:2040`) —
dlaždice spadne na 30 px se šesti překryvy, a s `container-type: normal` přijde
o přepínání na krátká jména. **Moderátor bere grid s prahem 6,6 rem**, protože
je to jediná varianta, kterou někdo změřil celou. Námitka 2-designu je zapsaná:
`flex-wrap` by prahu zbavil úplně.

**44 px patří do `.dlazdice-sekci .karta` pod `@media (pointer: coarse)`, ne do
maket** — jinak má správa regaty, která „už stojí", cíl o 12 px menší než
ročník. Práh i cíl jdou v jednom commitu a musí se vidět na 375 i 390 px: okno
prahu je 2,9 px široké.

> **Práh 6,6 rem padl 13. 11. 2026** — Filip poslal fotku pruhu z mobilu
> („ta jména nejsou úplně fengšuej"): ze sedmi dlaždic se dvě lámaly do dvou
> řádků a řady měly nestejnou výšku.
>
> Čísla v tabulce výše sedí (dva sloupce vyšly na 195 px, konzilium psalo 196),
> ale **měřila se šířka dlaždice, ne místo na text**, a toho nechá dlaždice
> o 43 px míň, než je sama široká. Při 107 px zbude **64 px** — méně, než měří
> `P. směrnice` (84 px). Práh 6,6 rem tedy nezlomil jen dlouhá jména; vyřadil
> i úspornou podobu z `uzky`, která se na úzkou dlaždici zapíná právě proto,
> aby se nelámalo nic. Celý mechanismus krátkých jmen byl na telefonu k ničemu
> a nikdo si toho nevšiml, protože se kontrolovalo, kolik sloupců vyjde.
>
> Při **10 rem** jsou dva sloupce po 164 px, tedy 121 px na text: pruh správy
> ročníku je 7/7 na jeden řádek, veřejný ročník 6/6, správa webu 3/4.
> Stojí to 50 px, které konzilium šetřilo. Jména se neměnila žádná — rozhodnutí
> o názvosloví z bodů 9 a 11 platí dál.
>
> **Pět jmen se nevešlo ani do dvou sloupců** a Filip je týž den nechal
> zkrátit („Zkrať je"): `Oprávnění na celý web` a ve veřejné regatě
> `Vypsání závodu`, `Plachetní směrnice`, `Předpokládaná trať`
> a `Startovní listina`.
>
> **Zkrácené nakonec bylo jen to první.** U regaty nebyla příčinou délka
> jmen, ale signální vlajka: ze 143 px na text jich brala 30. Vlajky týž
> den skončily z jiného důvodu — na poháru se nevyvěšují, signalizuje se
> megafonem (R16) — a Milošova celá jména se vešla sama. Zkratka by je už
> jen nahradila, takže se zahodila.
>
> **U `Oprávnění na celý web` padlo pravidlo „druhé jméno pro tutéž věc se
> nezavádí"** (29. 10. 2026, kvůli trojici „Oprávnění · Oprávnění na celý
> web · Práva"). Padlo jen pro tenhle tvar: krátká podoba plné jméno
> nenahrazuje, vykreslují se obě a nadpis okna nese celé jméno vždycky —
> což byla ta původní nesrovnalost, kvůli které zkratky 28. 10. 2026
> ve veřejné regatě skončily poprvé.

### 6. *Co teď* nesmí být prázdné, a výchozí tab se nemění

Nejdražší nález kola 1 (1-ergonomie): přistání na prázdném *Co teď* přidává
krok právě tam, kde ho postřeh 3 chtěl ubrat — `coTeď` nezná `Planovany`, a to
je sedm regat z osmi. 1-ergonomie chtěl měnit výchozí tab, 3-ux naplnit obsah;
**ergonomie ustoupila**, protože jedna adresa by podle dat ukazovala dvě různé
obrazovky.

Dělení potvrdili všichni tři dotčení (1 + 3 + 5):

- **pilot:** nejbližší zastávka podle `datum`, i `Planovany`, s odkazem do okna
  regaty. Víc `ZastavkaVysledkyDto` nenese.
- **druhá fáze:** první chybějící položka řady **vypsání → směrnice → trať →
  startovní listina** („Jarní vítr, 15. 5. — vypsání závodu není vyvěšené").
  Je to pořadí povinností z pravidel (ZPJ 25.1, R1/R8, R22, R28, R10), ne
  výmysl aplikace — se dvěma hranicemi od 5-jachtinga: **jmenovat chybějící
  dokument, nikdy stanovovat lhůtu** (R27).

**Znění pro pilot** (4-jazyk, opravené po vlastním nálezu, že původní slibovalo
víc, než API nese): karta ve tvaru ostatních úkolů — záhlaví *„Jarní vítr ·
15. května · plánováno"*, jméno *„Nejbližší regata"*, detail *„Teď nic
nečeká."* Rozkazovací způsob si drží jen skutečné úkoly.

**Dva důsledky, které se snadno zapomenou:** `kamNaRegate` pošle u `Planovany`
regaty na přihlášky, a ty jsou prázdné (hlásit se smí od `Vypsany`) — v pilotu
tedy vést na okno regaty. A komu *Co teď* nenaplní nikdy nic (čistý editor, jemu
API přehled zastávek odmítne), tab se nekreslí; **zbude-li po filtraci práv
jediná dlaždice, pruh se nekreslí vůbec**, tak jako `/sprava` při jediném
ročníku.

### 7. Veřejný ročník má šest tabů

**Úvod · Kalendář · Pravidla ročníku · Průběžné pořadí · Lodě ročníku ·
Novinky.**

*Pravidla ročníku* prosadil 5-jachting: ZPJ 25.1 žádá podmínky čitelné dřív,
než se loď přihlásí, a R24 říká, že pravidlo, podle kterého loď patří do
kategorie, je **ve vypsání a nikde jinde**. Ročníkové hodnoty (škrty, DSQ 20,
bonus) `/pravidla` mimo okno neunese.

**Cenu, kterou za to nabídl — *Novinky* z pruhu do *Úvodu* — moderátor
nepřijímá.** 1-ergonomie proti ní podal výhradu a má pravdu v obojím: šířka
k výměně nenutí (osm plných jmen se vejde do 876 px z 1216) a vyměňovat
agendu čtenou celou sezónu za agendu čtenou jednou před přihláškou je proti
frekvenci. 3-ux cenu přijímal pod podmínkou odkazu na archiv; ta podmínka tím
odpadá.

**Dlaždice *Správa ročníku* na konci veřejného pruhu** (3-ux) — pro toho, kdo
má práva. Stěhuje se dnešní odkaz, nevzniká šestá cesta. **Nesmí být teplá**
(2-design): odděluje ji poloha a šipka, barva `--ukon-uvod`.

### 8. Řádek regaty nese jednu odpověď: čeká něco, a na kom to je

Shoda 3 + 5 na tvaru, 2-design dal rozpočet (všech pět bloků = 1089 px, 90 %
šířky; tři bloky = 752 px):

```
15 kvě │ Jarní vítr · Marina Orlík │ 2 rozjížďky venku · 1 čeká na pořadatele │ vypsání·směrnice·trať
 9 čvc │ 24hodinovka · Stingray    │ čeká na vypsání závodu                   │ plánováno
```

- **adresát vždy**, podle téhož filtru práv jako `coTeď` — jinak si *Regaty*
  a *Co teď* protiřečí v tom jediném, co čtenář hledá;
- **jmenovatel „ze 4" nikdy** — 3-ux i 5-jachting, každý z jiného důvodu:
  počet rozjížděk se rozhoduje na vodě podle větru a `pocetRozjizdek` je počet
  existujících, ne plánovaných;
- **počty po kategoriích do okna regaty**, na jedno klepnutí — ráno v den
  závodu se podle nich rozhoduje, jestli se v kategorii jede, ale na řádku
  vytlačí adresáta (320 px);
- **štítek „vypsáno" nahradit řadou *vypsání · směrnice · trať*** — po R1 má to
  slovo dva významy a pořadatel potřebuje ten dokumentový.

### 9. Lano není šrafa

2-design, podmínka bez protinávrhu: šrafa je **obsazená publikací**
(`globals.css:757`) a publikace druhý kanál nemá — barvu mít nesmí, tu drží
stav. Lano má být stojící pramen z SVG masky (`globals.css:2272`). Maketa to
kreslila šrafou přes každý nadpis na webu.

### 10. Nadpis: obrácená hierarchie a žádné `nowrap`

2-design držel celé kolo a nikdo neoponoval: nejtěžší typografie je dnes na
jméně ročníku, tedy na tom, co se nemění a co stojí o řádek výš v drobečku.
Stojící komponenta má `h1` **1,2 rem v barvě agendy**, `strong` 700, `.agenda`
0,88 em — maketa 1,55 rem v `--text` a 800.

**Agenda dostane váhu, jméno ročníku ustoupí.** `nowrap` ven, `flex-wrap: wrap`
a `min-width: 0` zpátky, lanu `min-width: 2rem`, aby nezmizelo první.

**Apozice `{jméno} — {agenda}` platí ve všech patrech** (4-jazyk): jen ona nikdy
nenutí jméno skloňovat (*Výsledky Jarního větru* je past „Jarní vítr uložena").
Pomlčka se nesmí ocitnout na začátku řádku — pevná mezera před ní. Je-li místo
jen na jedno, **vypustí se jméno ročníku**, nikdy se neslepí dvě jména bez
pomlčky, jak to dnes dělá maketa telefonu.

### 11. Drobeček končí patrem, nikdy tabem

1-ergonomie našel, že makety mají tři různé hloubky; 3-ux i 4-jazyk souhlasí.
Tab už nesou dlaždice i nadpis, třetí opis nepřidá nic — a drobeček končící
tabem tvrdí, že tab je hlubší patro, takže krok nahoru znamená „opustit tab".
Prakticky: nepředávat poslední drobek do `drobeckySpravy`. V *Kalendáři*
a *Článcích* tím *Orlický pohár 2027* přestane být odkazem a dostane
`aria-current`.

### 12. Tabulka průběžného pořadí se přepíše celá

Nejtvrdší nález konzilia, nikdo neoponoval. Maketa počítala **závodovou
stupnicí** (vítěz 1), seriál má **nízkobodovou** (vítěz 0); ve sloupcích
zastávek stály `DNF` a `OCS`, což jsou kódy **jedné rozjížďky**; škrt byl
vysvětlen pravidlem závodu a **škrtnuté číslo se sčítalo**.

Tvar od 5-jachtinga: jedna tabulka na kategorii (**žádné pořadí napříč
kategoriemi** — seriál takové nezná a někdo by podle něj vyhlásil), sloupce
`#` · `Loď` (kapitán v podřádku) · `Znak` samostatně · zastávky (datum
v hlavičce, ne jméno) · `Škrty` · `Celkem`. 2-design to změřil: **unese to**
(8 zastávek + znak = 1125 px z 1216), ale jen když kapitán zůstane v podřádku
a hlavy zastávek jsou datum; hlavička patří do `<caption>`, ne do `<p>`, jinak
se při tisku od tabulky odpojí.

**Hlavička listiny — výhrada 4-jazyka přijata.** Jachtingův jednořádkový tvar
nese o dva fakty víc, než unese: bodovací pravidlo patří **pod** tabulku.
Hlavička odpovídá na *co to je, čí to je, ke kterému dni*:

> **Orlický pohár 2027 · do 7 m · průběžné pořadí**
> Po 2 z 8 odjetých regat. Nepodepsaný průběžný stav k 15. 5. 2027.

**Nad nepodepsanou tabulkou nesmí stát „vydáno" ani jméno rozhodčího** — jinak
web vydává doklad, který rozhodčí nevydal. Je-li podepsáno, druhý řádek zní
*„Vydáno 15. 5. 2027, rozhodčí Miloš Zvonař."*

**Legenda musí být věta, ne tabulka čísel:** `DSQ` je 20 bodů (platí pro 2026),
ale `DNC` je **počet lodí kategorie přihlášených na tu zastávku** — u každé
zastávky jiné číslo. Konstanta by byla nepravda, která se najde až při
reklamaci. A **bonus 24hodinovky `−1` se při shodě srovnává jako místo, ne jako
číslo** (`SerieBodovani.Rozstrel`).

**U shody značka `*` a věta pod tabulkou**, co rozhodlo: *„Shoda 7 b: Charlotte
III výš — jedno první místo, JOY žádné."* Bez ní nikdo nepozná proč, a je to
první dotaz po vyhlášení.

### 13. Kategorie v maketě nejsou kategorie Orlické série

*Kajuta · Sport · Open* jsou vymyšlené. Seriál má **do 7 m, nad 7 m, Race**,
a od 2027 **čtyři třídy** (R29) — čtvrtá mění šířku pilulky, která se posuzuje.

### 14. Zakládání se sbalí i v kalendáři

1-ergonomie: `Kalendar` drží formulář *Nová regata* trvale rozbalený v levém
sloupci, `Clanky` má *Nový článek* pod `<details>` — dva tvary téhož vzorce.
Scénář E5 je práce v pravé tabulce, formulář při ní zabírá půlku šířky.
Srovnat podle článků; rozbalené jen tehdy, když v ročníku žádná regata není.

### 15. Dvě role, jedno tlačítko *Odebrat*

1-ergonomie: v `OpravneniWebu` má Miloš na řádku dvě role, jedno tlačítko
*Odebrat* a pod tabulkou větu „odebírá se ta, na kterou klepneš" — dvě
protichůdné nabídky nad **nevratným** úkonem, kterým si navíc jde zavřít dveře.
Ovládacím prvkem je **štítek role** (každý s vlastním ×), tlačítko v řádku
zmizí. Znění (4-jazyk): *„Klepnutím na roli ji odebereš."*

## Co se nemění

Všech pět oborů to potvrdilo, nebo proti tomu nic nenamítlo:

- **okno s pruhem dlaždic ve čtyřech patrech** jako tvar;
- ***Co teď* jako první tab** ročníku — jediné místo, které rozhodčímu s osmi
  regatami řekne, u které něco visí, a oprava tiché předávky z 8. 10. 2026;
- ***Co teď* a *Regaty* jako dva taby**, ne jeden slepenec;
- **jeden pruh naráz**, nadřazená patra nese drobeček;
- **taby z `polozkyRocniku` / `polozkyWebu`**, tedy z téhož zdroje práv — žádný
  čtvrtý ruční opis;
- **žádná adresa se nemění**;
- **vnitřní přepínač jako pilulka**, od pruhu rozlišená třemi kanály naráz
  (radius, podklad, velikost). 3-ux k ní dodal: patří k **obsahu pod sebou**
  (0,35 rem po ní, 1,1 rem před ní), ne k nadpisu;
- ***Pořadatelé* nejsou tab** — 1 i 5: záznam s medailonkem, zakládá se spolu
  s regatou, patří do *Kalendáře*.

## Co čeká na Filipa

1. **Pořadatel jediné zastávky: okno ročníku, nebo rovnou okno jeho regaty?**
   3-ux chce přesměrování (jeho regata je stejně jediný řádek), 1-ergonomie
   okno drží a má k tomu čísla: vypsat svou regatu jde **jen z Kalendáře
   ročníku**, takže přesměrování ušetří klepnutí v den regaty a přidá ho po
   celou předsezónu. Padá to, až okno regaty ponese i vypsání (R1, R8).
2. **Zůstává tab *Co teď* v pruhu i tomu, komu nikdy nic nevydá?** Konzilium
   doporučuje ne, ale je to tvoje pravidlo 2 („pruh = co můžu spravovat").
3. **Veřejné menu *Závodím / Fandím / Legislativa*.** 4-jazyk: *Legislativa* je
   nejúřednější slovo v návrhu a stojí vedle dvou sloves v první osobě —
   navrhuje **Pravidla**. Rozhoduje se to podle plánu najednou s bodem 2 fáze 8.

## Co čeká na Miloše

5-jachting to označil jako podmínky, bez kterých se tabulka publikovat nemá:

1. **Od kolika odjetých zastávek se v ročníku škrtá a kolik škrtů má ročník
   s osmi?** Pravidlo zní „od devíti odjetých — 2 škrtačky", 2027 má osm.
   **Do odpovědi škrt nekreslit vůbec** a sčítat všechny zastávky: neškrtnutý
   součet je pravda o odjetém, chybně škrtnutý je nepravda.
2. **Smí průběžné pořadí vyjít jako listina** s datem, kategorií a jeho jménem?
3. **Platí od 2027 čtyři třídy** (R29), a má se u shodného součtu veřejně psát,
   co rozhodlo?

Jsou to tři otázky, které se dají poslat tabem *Otázky k aplikaci*, jakmile
bude úkolem v *Co teď*.

## Co se při stavbě zapomene první

Každý obor dostal jednu větu na to, co není sporné, a proto nemá vlastní bod:

- **4-jazyk:** **dvacet tři oprav popisků, hlášek a prázdných stavů** z kola 1
  nikdo nerozporoval — patří k té obrazovce, na které se stojí, ne do úklidu
  potom. Jednou vypsaný popisek *„Škrtá se nejhorších"* se přepisuje dráž než
  řádek v maketě. Mimo jiné: *„3 ze 4 rozjížděk **čekají**"*, *„1 rozjížďka
  k revizi"* místo „1×", *„zrušeno kvůli silnému větru"* (ve sloupci, kde o řádek
  výš stojí regata *Jarní vítr*), *„Převzít nadpisy, seznamy a odkazy
  z vloženého textu"* místo „Text je vložený z Wordu" (dohledáno v
  `Clanek.cs:56–66`: formátování se zahodí, struktura zůstane), *„Schovat
  ročník před veřejností"* místo „Stáhnout ročník z webu".
- **2-design:** **devět nových tokenů potřebuje tmavou odrudu dřív, než se pruh
  postaví.** Tři z osmi hran jsou na tmavém papíru pod 3 : 1
  a `tools/kontrola-tokenu.py` je **nezměří** — páruje jen pravidla s `color`
  i plným `background`, kdežto hrana je `border-color` nad `color-mix`. Pozná
  se to až u vody.
- **1-ergonomie:** **oprava 44 px patří do `globals.css`, ne do maket**, jinak
  má správa regaty cíl o 12 px menší než ročník.
- **3-ux:** **před stavbou pruhu projet všech sedm tabů proti serverovým
  kontrolám.** Pruh je tvrzení o právech; jeden chybějící `kdyz` (dnes
  u *Otázek* pro pořadatele zastávky) z něj dělá nepravdivou odpověď. Jako
  chybějící karta mezi deseti to byl nedostatek — jako pruh, který **je**
  odpovědí na otázku rozsahu, je to lež.
- **5-jachting:** **štítek „vypsáno" má po R1 dva významy** (stav v kalendáři
  a vyvěšený dokument) a podle toho dokumentu se smí přihlašovat — takže řádek
  *Regaty* dnes neumí říct, jestli jsou přihlášky otevřené. Tentýž chybějící
  údaj chce *Co teď* ve druhé fázi: **jedna změna DTO pokryje obojí.**

## Zapsané nesouhlasy

- **2-design k bodu 5:** `flex-wrap` místo mřížky by prahu zbavil úplně; přijato
  bylo řešení s prahem 6,6 rem, protože jediné bylo změřené celé.
- **5-jachting k bodu 7:** drží výměnu *Novinek* za *Pravidla ročníku*;
  moderátor cenu nepřijal na základě výhrady 1-ergonomie.
- **1-ergonomie k bodu 1 (zapsáno v kole 3):** kdyby se *Otázky* přece jen
  schovaly do nabídky pod účtem, je to návrat položky odvozené z práv tam,
  odkud ji audit vytáhl.
