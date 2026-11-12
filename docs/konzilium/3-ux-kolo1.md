# UX (toky, role, prázdné stavy) — kolo 1

## Co je dobře

1. **Pruh z práv řekne rozsah.** Dnes se role dozví ze štítků nad rozcestníkem
   (`web/app/sprava/[serie]/page.tsx:104`) — „pořadatel — Jarní vítr" neříká,
   na co to vystačí. Pruh to říká výčtem.
2. **„Co teď" zůstává a je první.** Je to oprava tiché předávky zápisu
   (`docs/SCENARE-OVLADANI.md:736–743`); kdyby se rozcestník zrušil ve
   prospěch lišty, ta tichost se vrátí. Rozhodnutí sedí.
3. **Co teď a Regaty jako dva taby je správný řez.** Jsou to dvě otázky —
   „co čeká mně" a „v jakém stavu je která regata". Jedno jméno nad oběma
   by byla vada z postřehu 12.
4. **Regaty jako řádky s průběhem** (`Regaty.dc.html:85–121`) dávají
   rozhodčímu s osmi regatami jeden pohled místo osmi otevření.
5. **Žádná adresa se nemění.** Kotva `#{regata}` z lišty `DoSpravy`
   (`SCENARE-OVLADANI.md:310`) i starší odkazy drží — mění se hlavy, ne toky.

## Co je špatně

### 1. Co teď nezná plánované regaty, takže se sedmi z osmi netýká

- **Nález.** `coTeď` (`web/app/sprava/[serie]/page.tsx:225–322`) počítá ze
  stavů zápisu a z jedné nejbližší regaty ve stavu `Vypsany`
  (ř. 262–265). Z `Planovany` nevydá nic — a to je dnes sedm regat z osmi
  (`SCENARE-OVLADANI.md:729`). Pořadatel plánované regaty má přitom
  rozdělanou práci: vypsat závod, vyvěsit směrnici. Dostane „Nic nečeká."
  Dnešní prázdný stav navíc posílá **níž po stránce** („se chystá u regaty
  níž — přihlášky a směrnice", ř. 116–120); v okně žádné „níž" není, Regaty
  i Kalendář jsou jiné taby. V maketě `Main.dc.html` prázdný stav není vůbec.
- **Proč to vadí.** Landing celé správy bude mimo závodní víkendy prázdná
  obrazovka se slepým odkazem. Je to tatáž vada, kterou projekt sám použil
  jako argument proti zrušení rozcestníku: *„Pro pořadatele plánované regaty
  by cesta do práce nebyla žádná"* (`SCENARE-OVLADANI.md:731`).
- **Návrh.** Co teď nesmí být nikdy prázdné: když nejsou úkoly, vydá nejbližší
  termín a krok před ním — „Jarní vítr, 15. 5.: vypsat závod" — spočítaný
  z `Planovany` zastávek, na které má člověk práva. Vzor projekt má: tab
  *Výsledky* veřejné regaty zůstává i u ročníku bez výsledků schválně,
  „aby se nemlčelo" (komentář funkce `sekce`,
  `web/app/serie/[slug]/zavody/[zavod]/hlava.tsx`).

### 2. Čistý editor dostane pruh o dvou dlaždicích, z toho jedna navždy prázdná

- **Nález.** `polozkyRocniku` (`web/lib/co-smim.ts:181`) dává editorovi jen
  *Novinky ročníku*; Kalendář, Výsledky, Lodě, Otázky i Oprávnění chtějí
  Rozhodci / Organizator / Spravce. Přehled zastávek mu API odmítne
  (403 → `stav: "nesmi"`, `web/lib/sprava.ts:104`), takže tab *Regaty* zmizí.
  A všechny čtyři větve `coTeď` vyžadují Organizator nebo Rozhodci
  (`page.tsx:248, 266, 291, 308`), takže *Co teď* mu nenaplní nic nikdy.
- **Proč to vadí.** Dvě dlaždice a první z nich prázdná se nečte jako „mám
  málo práv", ale jako „je to rozbité". Pruh má být odpověď na „co můžu
  spravovat" — tady odpovídá nepřesně a ještě k tomu nezdravě vypadá.
- **Návrh.** *Co teď* odvodit z práv jako všechno ostatní: tab jen při
  `smi(Organizator) || smi(Rozhodci)`. Zůstane-li po filtraci jediný tab,
  pruh nekreslit a jít rovnou do obsahu — totéž pravidlo, jaké už má
  `/sprava` při jediném ročníku (`web/app/sprava/page.tsx:65`).

### 3. Pořadatel jedné zastávky má svou práci o dva kroky dál než dnes

- **Nález.** Dnes mu jeho regata stojí řádkem na landingu
  (`page.tsx:153–176`). V okně je landing *Co teď*, jeho regata až za tabem
  *Regaty* a práce (přihlášky, výsledky, směrnice, trať) v okně regaty. Pruh
  má přitom jen Co teď + Regaty + Kalendář: *Výsledky* i *Otázky* chtějí celý
  ročník a nemají `kdyz` jako kalendář (`co-smim.ts:198–227, 246–261`).
- **Proč to vadí.** Postřeh 3 chtěl ušetřit krok. U role, která pracuje
  v den regaty pod tlakem, se krok přidá.
- **Návrh.** Když `jenSveZastavky` vrátí jednu zastávku, poslat
  `/sprava/{ročník}` rovnou do okna té regaty (`kamNaRegate`,
  `co-smim.ts:311`, už umí na který úkon). Pruh ročníku zůstává v drobečku.

### 4. Pruh ukáže „co můžu spravovat" nepravdivě u Otázek

- **Nález.** Varianta Organizator u *Otázek k aplikaci*
  (`co-smim.ts:254–260`) chce právo na celý ročník a nemá
  `kdyz: poradatelemVRocniku`, který kalendář kvůli téhle vadě dostal
  (ř. 206). Server přitom pořadatele na čtení pouští (`OponenturaEndpoints`,
  komentář ř. 242–245). Pořadatel zastávky tedy tab nedostane.
- **Proč to vadí.** Jako chybějící karta mezi deseti to byl nedostatek; jako
  pruh, který **je** odpovědí na otázku rozsahu, je to špatná odpověď — vada
  „funkce bez cesty" (tracker 24. 10., kalendář 26. 10.).
- **Návrh.** Doplnit `kdyz: (u) => poradatelemVRocniku(u, serie)` k variantě
  Organizator u Otázek a před stavbou pruhu projet všech osm tabů proti
  serverovým kontrolám — pruh ten rozchod zviditelní, dnes ho schovával.

### 5. Maketa Co teď vypisuje věci celého webu každému

- **Nález.** `Main.dc.html:108` jmenuje Obecné články · Oprávnění na celý web ·
  Co web stojí jako trvalou nohu okna. `polozkyWebu` (`co-smim.ts:455`) je dává
  jen Editorovi / Správci webu a dnešní blok *Mimo ročník* se vykresluje až
  při `web.length > 0` (`page.tsx:199`).
- **Proč to vadí.** Rozhodčí bez role na web si přečte tři jména obrazovek,
  kam se nedostane — proti pravidlu „obrazovka nabízí jen to, co projde"
  (tatáž vada jako panel lodi, `SCENARE-OVLADANI.md:265–270`).
- **Návrh.** Skládat z `polozkyWebu`, při prázdném seznamu vynechat celou; a
  protože to není agenda *Co teď*, patří to do pruhu, ne do prvního tabu.

### 6. Veřejný ročník ztrácí dnešní vstup do správy

- **Nález.** `web/app/serie/[slug]/page.tsx:102` nabízí tomu, kdo má roli,
  odkaz *Správa ročníku →*. Maketa `VerejnyRocnik.dc.html` má pruh pěti
  veřejných tabů a nic dalšího. Cesta z veřejné stránky do správy vznikla
  9. 10. 2026 na vlastní žádost (`SCENARE-OVLADANI.md:155, 310`).
- **Proč to vadí.** Pořadatel na veřejné stránce stojí běžně — dívá se jako
  divák. Bez odkazu se do práce vrací přes nabídku účtu a rozcestník, tedy
  dva kroky, které se jinde šetří.
- **Návrh.** Poslední dlaždice pruhu veřejného ročníku *Správa ročníku*,
  v teplé barvě Co teď, viditelná jen při neprázdném `polozkyRocniku`. Týž
  pruh a týž zdroj práv, takže nevzniká šestá cesta — stěhuje se stávající.

### 7. Regaty a Co teď se neshodnou na tom, kdo je na tahu

- **Nález.** `Regaty.dc.html:89` nese štítek „1× k revizi" bez adresáta,
  ř. 94 „čeká na podpis rozhodčího" s adresátem. Opravu vrácených výsledků
  přitom smí jen pořadatel (`coTeď`, větev 1, `page.tsx:247–258`), takže
  rozhodčí vidí na řádku červený štítek, ke kterému v Co teď nic nemá.
- **Proč to vadí.** Dvě obrazovky o témž stavu si protiřečí v tom jediném,
  co čtenář hledá: je to na mně?
- **Návrh.** Sloupec průběhu psát vždy s adresátem a podle téhož filtru práv,
  jaký má `coTeď` — „čeká na pořadatele" / „čeká na tvůj podpis". Pak Regaty
  a Co teď odpovídají totéž ze dvou stran.

### 8. Výpadek jedné části sebere celé okno včetně pruhu

- **Nález.** `page.tsx:88–89`: při `stav === "vypadek"` se vrátí `<Vypadek />`
  místo celé stránky, ačkoliv pruh se skládá z práv (`Ja`), ne ze zastávek.
- **Proč to vadí.** Spadne-li přehled zastávek, zmizí i cesta na Novinky
  a Oprávnění, které na něm nezávisí.
- **Návrh.** Pruh vykreslit vždy, když je `Ja`; výpadek nechat v obsahu tabu.

## Co bych potřeboval vědět

- **Filip:** má *Co teď* zůstat v pruhu i tomu, komu nikdy nic nevydá
  (editor), nebo se smí schovat? Rozhoduje to o pravidle 2.
- **Filip:** pořadatel jediné zastávky — landing okno ročníku, nebo rovnou
  okno jeho regaty (nález 3)?
- **5-jachting:** dá se „co čeká před regatou" odvodit z povinných dokumentů
  (vypsání, směrnice) tak, aby to nebyl výmysl aplikace? Potřebuju to pro
  neprázdné Co teď.
- **4-jazyk:** znění prázdného stavu Co teď a sloupce „čeká na…" — mám tvar,
  ne formulaci.
- **1-ergonomie:** měříš počet kroků pořadatele v den regaty? Pokud ano,
  nález 3 nechávám tobě k čísle, já u něj držím jen tok.
- **2-design:** unese jediná teplá barva na webu tab, který bývá prázdný?

## Čeho se nedotýkám

Barva, hierarchie, typografie a rytmus (2-design). Počet kroků jako měření
(1-ergonomie). Jména tabů a skloňování (4-jazyk). Vypsání závodu podle ZPJ
(5-jachting). Přestavba obsahu tabu Výsledky a rozpoznání papíru z fotky
(postřehy 12 a 13). Vada mapy (11), tmavý režim, telefonní mřížka.
