# UX — kolo 1

Toky, role, prázdné stavy, chyby. Ptám se: **nabízí obrazovka jen to,
co server doopravdy pustí?**

## Co je dobře

1. **Pípnutí jako trvalá hlavní akce** (nález 1) je jediné možné pořadí,
   když je poloha jediný vstup s platností čtyř vteřin
   (`poloha.ts:40`). Ruší nejhorší vlastnost dnešního toku: do stavu
   „můžu pípnout" se nedostaneš, dokud neodpovíš na dvě otázky, které
   nikdo nespěchá.
2. **Zaseknutá fronta jako vlastní karta s větou od serveru** (nález 5).
   Dnes jsou zámek trati, chybějící oprávnění a zastavená fronta tentýž
   pruh (`stavba.tsx:262–303`) — první dva jsou oznámení, třetí překážka
   s jedinou cestou ven. Karta ten rozdíl poprvé přiznává.
3. **`Zamek.dc.html` je úplný prázdný stav:** stav, důvod, kdo to vrátí,
   a trať k přečtení. Dnešní banner řekne jen „stavět nejde".
4. **Vzdálenost od prvního bodu** (nález 4) je kontrola **výsledku**, ne
   vstupu — jediná věc, která chytí bránu širokou tři metry; pravidlo
   o stáří fixu ji nechytí, protože měří něco jiného.
5. **Trvalý proužek polohy** (nález 3) vytahuje stav prostředí z průvodce
   a prázdný stav „hledám polohu" je tím vidět hned při otevření.

## Co je špatně

### 1. Nepopsaná značka ztratí své místo na trati

**Nález.** `Main.dc.html` ukazuje *„Značka 4 — pípnutá, ještě nepopsaná"*
v seznamu *Co už stojí*, `Popis.dc.html` k tomu dává *Popíšu potom*.
Pořadí prvku na trati ale počítá server z pořadí, v jakém požadavky
dorazí (`DalsiPoradiAsync`, `odesilani.ts:3–7`), a nepopsaná značka
**není ve frontě** — není z čeho požadavek složit.

**Proč to vadí.** Stavitel pípne značku 4, nechá ji nepopsanou, postaví
prvky 5 a 6. Ty odejdou a na trati zaberou místa 4 a 5. Když se vrátí
k popisu, jeho značka dorazí šestá — **na vodě stojí čtvrtá, na trati je
poslední**, a seznam ji přitom kreslí čtvrtou. Je to tatáž vada, které
brání rámcové pravidlo 3, jen jinou dírou: fronta pořadí drží,
nepopsané pípnutí leží mimo ni.

Druhá polovina téhož: **u brány se popis odložit nedá.** Bez zvoleného
typu appka nepozná, že druhé pípnutí je druhý konec téže brány —
`Dvoubod.dc.html` proto žádné *Popíšu potom* správně nemá. Kdo ho
klepne u prvního konce brány, o bránu přišel a návrh neříká, co s tou
značkou pak je. Odložení chybí právě u prvku, kde se spěchá nejvíc.

**Návrh.** Nepopsané pípnutí **zabere svoje místo ve frontě hned** —
řádek v `stavba.db` bez popisu, který se neodesílá a zastavuje odesílání
všeho za sebou, stejně jako odmítnutý prvek. Tlačítko ať se podle toho
jmenuje: *Popíšu potom (další prvky počkají)*.

### 2. Obrazovka se otevře i tomu, komu server stavbu odmítne

**Nález.** Vchod hlídá `veliNekde(ja)` (`…/[zavod]/index.tsx:493`), tedy
dotaz *„velí ten člověk někde?"* — `role.ts:26–28` čte jen `role`, `serie`
ani `zavod` ne. Server se ptá na rozsah: `Organizator` **té zastávky**,
nebo `Rozhodci` **toho ročníku** (`TratEndpoints.cs:537–540`, rozsahy
`Prava.cs:62–66`). `docs/ZKOUSKA-STAVITELE.md` to říká výslovně: stačí
role *„aspoň u jedné regaty"*.

**Proč to vadí.** Pořadatel Radavské regaty otevře stránku cizí zastávky
a kartu *Stavba trati* uvidí. Obrazovka ho pustí celou trať pípat
a server odmítne první prvek `403` bez těla, tedy větou „Server prvek
odmítl." (`api.ts:120–126`); pak stojí fronta a každý další prvek se
musí zahodit zvlášť. U pomocníka je to dvakrát horší: je to příznak
u jedné regaty (K8, `Pomocnici.SmiUVody`), o kterém `veliNekde` nic
neví, a zároveň člověk, který obrazovku vidí poprvé. Tentýž spor už
v repozitáři padl a je rozhodnutý obráceně: *„kdyby obrazovka nabídla
méně, než zápis pustí, startér by u vody viděl zamčenou rozjížďku, do
které by přitom psát mohl"* (`VysledkyEndpoints.cs:698–704`) — zápis
výsledků proto dostává od serveru příznak `uVody` na konkrétní zastávku.

Totéž platí o *Odemknout na přestavbu* v `Zamek.dc.html`:
`POST …/trat/prestavba` pouští jen organizátora regaty nebo rozhodčího
ročníku (`TratEndpoints.cs:210–217`); maketa to řeší větou *„jestli to
máš na starosti"* — textem místo kontroly, u úkonu s veřejným dopadem.

**Návrh.** Trať ať k regatě vydává příznak `smiStavet` počítaný tímtéž
výrazem jako `StaviAsync` (plus pomocník, až vznikne), a appka ať podle
něj skrývá kartu i tlačítko přestavby.

### 3. Po odmítnutí kvůli zámku maketa zve pípat dál

**Nález.** `Fronta.dc.html`: *„Server ho odmítl: »Tahle trať je už
přijatá.«"* a pod tím *„Pípat jde dál — odejde to, až bude signál"*
s aktivním *PÍPNI ZNAČKU*.

**Proč to vadí.** Ta věta je nepravdivá v tom jediném, na čem záleží:
nečeká to na signál, ale na odemčení trati, a to stavitel na vodě
neudělá. Obrazovka nabízí úkon, o kterém už ví, že ho server odmítne —
každá další značka je jedno odmítnutí a jedno povinné zahození. Dnešní
kód to řeší hrubě, ale správně: při `zamcena` se průvodce nevykreslí
vůbec (`stavba.tsx:307`).

**Návrh.** Odmítnutí kvůli zámku ať obrazovku přepne do stavu
`Zamek.dc.html`, s nabídkou zahodit **celou** frontu jedním klepnutím.
Hlavní akce ať zůstane aktivní jen u důvodů, které spraví čas.

### 4. „Nikdo není přihlášený" se nedozví nikdo

**Nález.** Čtení s prošlým sezením vrací `null` a tváří se jako prázdná
data (`api.ts:85`). Při odesílání se `401` zapíše jako potíž, ale
**neodmítnutá** (`odesilani.ts:60–63`), a obrazovka ukazuje potíž jen
u odmítnutých (`stojici` = `fronta.find((f) => f.odmitnuto)`,
`stavba.tsx:239`, a řádek seznamu `stavba.tsx:493–494`).

**Proč to vadí.** Nepřihlášený stavitel projde celou obrazovkou bez
známky, že nic z toho neodejde; je to nerozlišitelné od „není signál",
což je na vodě běžný stav, se kterým se nic nedělá. Věta *„Přihlas se
a zkus to znovu."* se napíše do SQLite a nikdo ji neuvidí.

**Návrh.** V proužku stavu držet i stav přihlášení a při `401` ukázat
potíž fronty i u neodmítnutého, s tlačítkem na přihlášení.

### 5. Tok stavitele nemá konec

**Nález.** Appka neumí nahlásit hotovo — `POST …/trat/hotovo` v ní není.

**Proč to vadí.** Stavitel dojede, trať stojí a nic mu neřekne, že hotovo
musí nahlásit někdo u počítače. K tomu nález O10
(`docs/AUDIT-OBSAZENI.md`): trať ve stavu `Hotovo` se dá dál měnit
a rozhodčí u přijetí nepozná, že se změnila. S nepopsanou značkou je
z toho řetěz: trať se nahlásí a přijme, značka zůstane v telefonu —
a po přijetí už ji server nevezme.

**Návrh.** Na konec obrazovky *Nahlásit hotovo*, aktivní jen při prázdné
frontě a bez nepopsaných značek; jinak ať říká, co ještě drží.

## Co bych potřeboval vědět

- **Zadavateli:** dostane pomocník příznak u regaty jako K8, nebo roli?
  Rozhoduje to, jestli se appka může zeptat jedinou otázkou.
- **Zadavateli:** staví dva lidé jednu trať současně (obsazení 4,
  *„Miloš staví start a cíl, pomocník otočky"*)? Pak pořadí příchodu
  neurčuje pořadí na trati už dnes a bod 1 je širší.
- **9-rizika:** stačí nepopsané pípnutí v `stavba.db`, nebo má o něm
  vědět i server, aby se neztratilo s telefonem?
- **1-ergonomie / 7-psycholog:** má *Popíšu potom* smysl, když u brány
  nejde použít — a čte se *„1 čeká na popis"* jako úkol, nebo jako šum?

## Čeho se nedotýkám

- **Vizuál** — hierarchie, barvy, kontrast, nález 6 (2-design).
- **Počet klepnutí, rukavice, jedna ruka** a jestli sedm položek jde
  vybrat v pohybu (1-ergonomie).
- **Zátěž a důvěra** (7-psycholog), **závažnost ztráty dat
  a nevratnost** přestavby (9-rizika).
- **Cena zásahu do `packages/stavba/`.** Soudím tok, ne účet — a z toku
  vychází sloučení typu a předpisu správně, s výhradou u brány v bodu 1.
