# Kolo 2 — kde se neshodnete

Moderátorský zápis po prvním kole. **Přečti si sedm cizích posudků**
(`docs/konzilium/revize-webu/*-kolo1.md`) a potom tohle.

Filip teď není k dispozici, takže **na otázky položené jemu odpovědi nejsou**.
Kde na něm něco visí, rozhodni podmíněně („je-li A, pak B, jinak C") a napiš,
co z toho je podmínka, bez které se stavět nemá. Otázky na něj sbírám do závěru.

## Co k tomu říká moderátor

Abyste neřešili vady podkladu místo webu. Co jsem mohl, ověřil jsem proti kódu.

- **`milos` není rozhodčí.** V zadání to stojí špatně: v mocku je `milos`
  pořadatel jedné regaty (Izolepa), rozhodčí je `zdenek`. Kdo psal „viděl jsem
  to jako rozhodčí" pod `milos`, viděl pořadatele. Chyba zadání, ne nález.
- **Auditních 124 px (15 %) pevných pruhů platí jen pro přihlášeného s rolí.**
  Tomu layout schová partnery (`web/app/layout.tsx:139`). **Návštěvník má
  110 + 57 + 64 = 231 px, 28 %** — nezávisle to změřili 8-pr a 10-grafik. Ve
  správě pruh počasí není vůbec (7-psycholog). Otázka 4 se od teď čte s 231.
- **Kontrast `.agenda`:** platí rozsah 2-designu **3,13–4,32** (12 kombinací),
  ne auditních 3,99–4,49. A věta auditu „světlý vzhled je jinak čistý" neplatí:
  `.vystraha-stupen` má ve světlém 1,92 (2-design, nález 9). Skript text
  v doplňku výstrah neměřil.
- **34 velikostí písma, nebo 63?** Obojí. `globals.css` má 63 různých hodnot
  `font-size`; 29 z nich jsou výpočty tabule (`--tv`) a znaku (`--znacka`),
  mimo ně jich je 34. Není o co se přít — stupnice se týká těch 34.
- **543 px k první regatě** platí pro mock po sezóně; na produkci je „Další:"
  na 313 px (8-pr). Každé číslo patří svému stavu ročníku.
- **Mock má všechno odjeté a potvrzené.** Den regaty, nepodepsané výsledky ani
  upravitelný zápis nikdo neviděl. Co o těch stavech tvrdíš, je z kódu —
  značte to tak dál, v závěru to bude stát zvlášť.
- **`/prihlaseni` vrací v mocku 500**, protože mock nemá poskytovatele
  identity. Není to nález.
- **„Právě se jede 4. rozjížďka" v listopadu** (8-pr, nález 7) je z ukázkových
  dat produkce. Nález tím ale **nepadá**: věta visí jen na stavu rozjížďky
  `Probiha` (`upozorneni.tsx:120`) a datum nehlídá. Rozjížďka, kterou nikdo
  neuzavře, to bude tvrdit dál.
- **Zápis rozjížďky se všemi 37 loděmi ročníku** (5-jachting, nález 1) je
  záměr zapsaný v hlavičce souboru („všechny lodě ročníku"); důvod jsem
  nedohledal. Je to tedy spor o rozhodnutí, ne o chybu — bod J.
- **Bod 15 z konzilia 12. 11.** (štítek role jako mazací tlačítko) 9-rizika
  otevírá vědomě. Smí; je to bod H.
- **Čím to začalo:** Filip chtěl *„revidovat design, UX a ergonomii"* a dodal
  *„přihoď grafika pro estetiku"*. Je to revize toho, co stojí. Nálezy, které
  chtějí **nový model nebo nové API** (rozprava v modelu, záznam „kdo to
  udělal", verze fotek papíru, transakce mazání, oznámení o stažení do
  telefonů), nezahazuji — půjdou do závěru zvlášť jako „mimo revizi, do plánu".
  V kolech se o ně nepřete, leda na nich visí sporný bod.

## Sporné body

V posudku projdi **ty, u kterých jsi jmenovaný**, a u každého napiš:
**držím / ustupuji / jinak** — a proč. Jedna věta stačí, když je jasná.
**Kde žádám měření, o čísle se nehlasuje** — měř proti běžícímu webu na
375 × 812 (nebo proti řádku kódu) a číslo napiš.

### A. Kalendář: kde bydlí kroky zpět

Shoda pěti oborů: karta regaty nese stav a jediný odkaz „Otevřít regatu →",
sedm odkazů pryč. Rozchází se, kam s úkony:

- **1-ergonomie, 3-ux, 7-psycholog:** na kartě pod „Další úkony", následek
  vypsaný větou.
- **5-jachting, 9-rizika:** v kalendáři **jen krok vpřed**; krok zpět, stažení
  a zrušení až v okně regaty. 9 navíc: server má Odjetý → Vypsaný odmítnout,
  dokud má regata výsledky venku.

**Kdo odpovídá:** 1, 3, 5, 7, 9. Vyberte **jedno místo**. Kdo chce okno
regaty, řekne, **kde v něm** — okno má pruh dlaždic a žádnou „kartu regaty".
**5:** kdy je vrácení odjeté regaty legitimní a smí to pořadatel jediné regaty?

### B. Přihlášky: co je v řádku vidět bez klepnutí

Shoda: jeden krok s vahou (prezence), kód a zrušení do Podrobností.

- **5-jachting:** číslo · loď · kormidelník a **dva znaky — startovné, souhlas**
  (souhlas je jediná právní vazba, R9).
- **7-psycholog:** dva stavy **slovem** — prezence, startovné; souhlas jednou
  větou nad seznamem, jména jen když chybí menšině.
- **3-ux:** výstraha o souhlasu pryč z hlavičky — svítí 16 z 16 a nic nechce.
- **1-ergonomie:** řádek jako karta, tlačítko prezence 44 px.

**Kdo odpovídá:** 1, 3, 5, 7. Rozhodněte, jestli je souhlas v řádku, a složte
**jeden řádek** (co je v něm zleva doprava) pro 375 px.
**Měření, 9-rizika:** projde dnes „Zrušit prezenci" u lodi, která má
výsledky? Přečti `Prihlasky.MozneZ` a endpoint a napiš řádek. 5 tvrdí, že to
mění body třídy (A5.2); ty, že je úkon bezpečný. Jedno z toho neplatí.

### C. Úvod: jedna skladba první obrazovky

Šest oborů, šest prvních věcí, a pás fotky na telefonu má 200 px:

- **10-grafik:** fotka je obraz — pás jen `--hero`, závoj jen ve spodních 40 %.
- **2-design:** `.hero-zivot` je nejtěžší text, 1,4 rem / 700.
- **8-pr:** věta pro nováčka ≥ 16 px, živá věta, dvě tlačítka 44 px
  („Chci závodit", „Výsledky"); vítěz větou, řádky pořadí nejedou.
- **5-jachting:** první blok podle fáze — nejbližší regata, datum, místo,
  Vypsání, Přihlásit loď.
- **7-psycholog, 3-ux:** věta pro cizího a stavová věta se třemi stavy sezóny.

Všechno naráz se do 200 px se závojem na 80 px nevejde.

**Kdo odpovídá:** 2, 3, 5, 7, 8, 10. Chci **jeden seznam shora dolů** pro
375 × 812: co, jak velké, kolik px výšky — a co z první obrazovky vypadne.
**Měření, 10-grafik:** kolik px zbude obsahu pod pevnými pruhy a kolik řádků
textu unese fotka, aby z ní zůstalo vidět to, co hájíš.
**Přizváni:** 1 — unese monitor pás 320 px (první regata o 170 px níž)?
5 — kam má vést „Chci závodit" a je vítěz ročníku po třídách, nebo i celkový?

### D. Pevné pruhy návštěvníka: 231 px

- **Hlavička:** 8 i 10 chtějí jednořádkovou (67 px), „Přihlásit" do nabídky.
  Beru jako shodu, pokud nikdo neprotestuje.
- **Počasí:** 1-ergonomie lepit **podle místa** (jen úvod a veřejná regata),
  7-psycholog **podle času** (jen v den regaty nebo s výstrahou).
- **Partneři:** 8-pr na telefonu nepřipínat, stojící blok na konci úvodu;
  10-grafik pás nechat a ztlumit dlaždice v tmavém vzhledu.

**Kdo odpovídá:** 1, 7, 8, 10. U počasí jedno pravidlo; u partnerů rozhodněte
podmíněně podle toho, co je jim slíbeno. Napište, **kolik px po vašem návrhu
zůstane pevných**.

### E. Tabule na telefonu: jak přesně „nenabízet"

Shoda sedmi oborů, že se televizní rozvržení na telefonu nenabízí. Zbývá jak:

- **2-design:** odkaz pod 700 px nevykreslovat.
- **7-psycholog:** na adrese tabule pod 600 px rozcestník místo rozvržení.
- **3-ux:** na telefonu vést na Výsledky.
- **5-jachting:** nejdřív přenést na stránku regaty, co má jen tabule —
  „Vydáno k regatě" a stav výsledků.

**Kdo odpovídá:** 2, 3, 5, 7. Jedno řešení a jeden práh. Počítejte s tím, že
na tabuli vede i věta „Sledovat na tabuli →" v pruhu upozornění a že adresu
může někdo dostat přímo. **5:** je tvoje podmínka nutná před schováním, nebo
smí přijít po něm?

### F. Modrá: co znamená a čí je

- **2-design:** `--voda` jen pro „dá se na to klepnout"; hotový stav v `--text`.
- **10-grafik:** barva znaku `#0c4a8c` jako `--znacka` na plné tlačítko, linku
  úvodu a `h1` veřejných stránek; `--voda` zůstane odkazům.

Druhá modrá na tlačítku i na nadpisu znamená zase dvě věci — proti 2.

**Kdo odpovídá:** 2, 10. **Měření, 10-grafik:** kontrast `#0c4a8c` v obou
vzhledech ve všech třech užitích (text `h1` na `--pozadi` a `--papir`, výplň
tlačítka pod jeho písmem). Bez čísel se o tom nerozhoduje.
**Přizváni:** 5 — nese modrá u „odjeto / potvrzeno" konvenci ze závodů?
8 — unese značka, že její barva žije jen na dvou místech?

### G. Tvar: jedna stupnice a jedna pilulka

- **Písmo:** 2-design pět kroků (12,8 · 14,4 · 16 · 19,2 · 28 px), 10-grafik
  šest (12 · 13 · 14,4 · 16 · 19 · 28). Liší se dole — tam, kde se čte u vody.
- **Pilulka:** 10 ji chce **jen pro štítek, na který se neklepe**; 2 navrhuje
  úkony v řádku přihlášky právě pilulkou.
- **Nadpis okna:** 2 dva řádky (kontext drobně, agenda 700 v `--text`, barva
  úkonu na hraně) — ruší to A1. 10 se k tvaru nevyjádřil.

**Kdo odpovídá:** 2, 10. Jedna stupnice, jedno pravidlo pro pilulku, jeden
tvar nadpisu. **Přizván:** 1 — nejmenší písmo, které nese údaj u vody.

### H. Druhé klepnutí: kde je hranice

9-rizika chce „rozbal → Opravdu" u: Smazat přihlášku, Schovat ročník, Odebrat
roli (proti bodu 15 z 12. 11.), kroků zpět v kalendáři; fotku papíru jen
verzovat. Následek vždy **větou**, ne v `title`. 7 souhlasí u Schovat ročník.
1-ergonomie se ptá, jestli u vratného úkonu nestačí vratnost.

**Kdo odpovídá:** 1, 3, 7, 9. Chci **jedno pravidlo**, podle kterého se pozná,
že úkon dostane druhé klepnutí, a seznam úkonů, které pod něj dnes spadnou.
**1:** co stojí rozbalovač u stolu registrace a u vody. **5:** jak dlouho se
musí držet fotka papíru.

### I. Kód ve výsledcích (vada A3)

- **5-jachting:** kód je fakt — písmem čísla („DNC 2"), škrt v závorce.
- **2-design:** kód 0,85 em v `--tlumeny`.

**Kdo odpovídá:** 2, 5. **Měření, 2-design:** tabulka průběžného pořadí na
375 px — jak je široká dnes a jak s kódem ve velikosti čísla. Vejde-li se,
platí 5; nevejde-li se, navrhněte spolu tvar, který nese kód čitelně.

### J. Zápis rozjížďky: 37 lodí, nebo 16

5-jachting: jen lodě startovní listiny a úkon „Přidat loď mimo listinu".
Dnes je to záměrně celý ročník.

**Kdo odpovídá:** 1, 5, 9. **9:** co je horší — výsledek omylem zapsaný lodi
mimo listinu, nebo loď, která přijela a v zápisu chybí? **1:** co to udělá
s délkou obrazovky a s cestou k lodi, která se přidává.

### K. Slovo „stáhnout"

7 navrhuje „Skrýt na webu" a „Sundat z vývěsky", 9 „Skrýt z webu" a
„Stáhnout z vývěsky (smaže soubor)". Jazykový obor u stolu nesedí.

**Kdo odpovídá:** 7, 9. **Přizván:** 5 — jak se tomu říká na vývěsce. Jedna
trojice sloves: skrýt vratně · sundat zprávu · smazat soubor.

### L. Jméno

8-pr chce všude „Orlický pohár" (proti nápisu „Orlická série" z 22. 9.),
10-grafik se ptá, které ze tří platí. Rozhodne Filip s Milošem; konzilium dá
**doporučení**.

**Kdo odpovídá:** 5, 8, 10. Jedno jméno a kde smí stát druhé.

## Co beru jako nesporné

Nikdo to nenapadl a v kole 2 to neobhajuj. **Ozvi se jen, když s tím tvůj obor
nesouhlasí:** zrušená regata se nepočítá do „z osmi" · úvod zná stav „po
sezóně" · sezení po vypršení vrací tam, kde člověk byl · veřejná přihláška
se pořadateli ukáže v „Co teď" · následek úkonu větou, ne v `title` ·
„Smazat" přihlášku ne u stavu *K doplnění* · odkaz v textu podtržený · hranice
pole 3 : 1 · `.tlacitko` s písmem `--papir` · slovo stupně výstrahy v `--text`
· `button` dědí písmo · `openGraph` · `noindex` ukázkového ročníku · veřejné
vypsání jen vyplněné oddíly · jedna tabulka kódů · číslo plachty na listině ·
„předběžné / konečné" nad výsledky · osobní údaje na telefonu jako seznam ·
nápověda s odkazy podle role · „Co je vidět" nad „Závodní den".

## Co napsat

Do `docs/konzilium/revize-webu/<tvoje-session>-kolo2.md`, do **120 řádků**:

```markdown
# <obor> — kolo 2

## Kde ustupuju
Bod, komu, proč. Krátce.

## Kde držím
Bod, protiargument, a co se stane, když se rozhodne proti mně.

## Kde jsme se shodli
Jen to, co máš za uzavřené a co může moderátor zapsat jako rozhodnuté.

## Nové, co vylezlo z cizích posudků
Jen když je to doloženo a nikdo to nenapsal. Nepřepisuj kolo 1.
Sem patří i **odpovědi na otázky, které ti kolegové položili** v rubrice
„Co bych potřeboval vědět" — jedna věta na otázku.

## Podmínka
Nejvýš dvě věci, bez kterých se podle tebe stavět nemá.
```

Pravidla z kola 1 platí dál: podkládej, měř na 375 px, nepřepisuj kód,
necommituj, nesahej na cizí soubory. Web i mock běží (`localhost:3000`,
`:8080`); **jen se dívej**, nic neodesílej. Kolo 3 je poslední.
