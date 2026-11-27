# 5-jachting — kolo 2

## Kde ustupuju

- **B → 9-rizika.** Moje věta z kola 1, že zrušená prezence mění body třídy,
  **neplatí**. Do počtu pro A5.2 jde `Prihlasena` stejně jako `Potvrzena`
  (`Bodovani.cs:44–45`) a jiné stavy server lodi s výsledky nepustí
  (`Prihlasky.cs:113–116`). Vůči bodům je úkon bezpečný. Zbývá vedlejší
  následek (z kódu): loď s výsledky spadne na veřejné stránce z listiny do
  „čeká na potvrzení" (`sekce-lode.tsx:47`) — lodi s výsledky ho nenabízet.
- **B → 7-psycholog, 3-ux.** Stav slovem, ne znakem, a souhlas v řádku jen
  jako výjimka. Chybí-li všem (16 z 16, import), je to věta nad seznamem.
- **A → 1, 3, 7 (místo).** Okno regaty vlastní obsah nemá (3-ux), takže
  úkony zůstanou na kartě kalendáře pod „Další úkony" s větou následku.
- **C → 8-pr.** Dvě tlačítka místo mého bloku s odkazy.
- **I → 2-design (velikost).** Změřeno na 375 px, třída Nad7m, 25 lodí:
  tabulka má dnes 688 px (kód 8,64 px), s kódem 0,85 em 738 px, v písmu čísla
  771 px; okno má 335. Roluje tak jako tak — a 106 ze 175 buněk je DNC.
  Neúčast v plné váze by přehlušila dojetá místa. 0,85 em a tlumeně beru.

## Kde držím

- **A (pravidlo, s 9-rizika).** Vrátit odjetou regatu je legitimní jen jako
  oprava chybného uzavření: klepnutí omylem, automat po dvou dnech, regata
  dojížděná v náhradním termínu. Oprava výsledku (protest, náprava, chyba
  bodování) se dělá na rozjížďce přes „Vrátit k revizi", ne vrácením regaty.
  Pořadatel jediné regaty to dnes smí vždy (`Kalendar.cs:41–45`); má smět,
  jen dokud z regaty není v poháru nic venku. Potom rozhodčí nebo správce
  ročníku, s důvodem. Rozhodne-li se proti: jeden pořadatel přepočítá pohár
  všem a na kartě to bude stát jako běžný krok.
- **J.** Důvod, proč zápis nabízí celý ročník, už neplatí: „Účast dnes
  přináší jen import, takže na nové zastávce by formulář byl prázdný"
  (`ZapisSprava.cs:10–12`). Dnes ji přinášejí přihlášky a prezence. Výsledek
  lodi mimo listinu jí založí účast jako potvrzenou (`:341–351`) a ta jde do
  počtu pro A5.2 — tohle z kola 1 platí. Nový úkon není potřeba: zápis už
  nese `NaRegate` (`:24–27`) a cílová obrazovka podle něj dává „zbytek
  ročníku stranou". Zápis z papíru totéž: lodě na regatě nahoře, ostatní pod
  `details` „Lodě mimo listinu (21)". **K otázce 9-rizik:** kryté je obojí —
  loď, která přijela, je o jedno rozbalení dál; omyl už není o řádek vedle.
- **E — jinak.** Podmínka nemusí předcházet, ale musí být v téže změně. Dnes
  si telefon tabuli aspoň přiblíží; po schování by „Vydáno k regatě" nemělo
  na telefonu žádnou adresu. Řešení: rozcestník 7-psychologa na adrese tabule
  pod prahem **nese „Vydáno k regatě" jako seznam** a pod ním odkazy Výsledky
  a Startovní listina. Zprávy tabule čte už dnes (`tabule/page.tsx:41`), nové
  API to nechce. „Sledovat na tabuli →" pak na telefonu vede na vývěsku.
  Práh nechávám 2 a 7; pozor na telefon na šířku (812 px).
- **I (zbytek).** Tlumeně jen DNC. Kód, který je rozhodnutí (DSQ, DNF, OCS,
  RDG), v `--text`; nejmíň 12 px; škrt v závorce vedle přeškrtnutí.
- **L — proti 8-pr, podmíněně.** Jméno soutěže je to, které stojí v hlavičce
  dokumentů od rozhodčího. Tři, které známe (pravidla výpočtu, sešit pořadí,
  termínová listina 2027 — PLAN ř. 6161, 6300), říkají „Orlická série";
  vypsání skládané aplikací „Orlický pohár 2026". Tři z osmi regat navíc mají
  „pohár" v názvu (Radavský pohár, O pohár Vltavy, Pohár Slunce), takže
  „Orlický pohár" se v kalendáři čte jako devátá regata. Doporučení: soutěž
  „Orlická série"; „Orlický pohár" jako jméno trofeje a adresy. Vyberou-li
  Filip s Milošem opak, přejmenují se i ty tři dokumenty — dvě jména mezi
  papírem rozhodčího a webem jsou jediný výsledek, který je špatně.

## Kde jsme se shodli

- **A:** karta regaty = stav a „Otevřít regatu →", sedm odkazů pryč.
- **B:** řádek je karta (1-ergonomie), zleva doprava a shora dolů na 375 px:
  `434 · FAR STAR III` tučně a vpravo stav slovem (čeká / přijela) ·
  kormidelník, typ a jen co chybí („startovné nezaplaceno", „bez souhlasu")
  · tlačítko „Potvrdit prezenci" 44 px přes šířku, jen u lodi, která čeká.
- **C:** shora dolů: pás fotky 200 px s názvem a větou pro cizího (16 px,
  dva řádky) · stavová věta 1,4 rem / 700, celá odkaz, ~60 px · dvě tlačítka
  44 px. Z první obrazovky vypadnou jedoucí řádky pořadí, kalendář a novinky.
- **E:** televizní rozvržení se na telefonu nevykresluje.
- **Nesporné, s jedním doplněním:** „číslo plachty na listině" čti „číslo
  plachty nebo poznávací znak" — viz odpověď 1-ergonomii níž.

## Nové, co vylezlo z cizích posudků

- **„Právě se jede" bez data** (8-pr 7): neuzavřená rozjížďka je u vody
  běžná, po bezvětří se odjede domů. Hlídat den (`jedeSeDnes`, `hlava.tsx:144`).

Odpovědi, jedna věta na otázku:

- **1-ergonomie, prezence:** u stolu před rozpravou, kde se platí
  a podepisuje; telefon na molu jen pro pozdě příchozí (zvyk klubových
  regat, u Miloše neověřeno) — karta musí sloužit obojímu.
- **1-ergonomie, cíl:** podle jména a domluveného poznávacího znaku, který
  cíl nese na tlačítku (`ZapisSprava.cs:24–27`); číslo plachty je pojistka.
- **3-ux, přihláška:** do rozpravy (R39); po ní a u odjeté regaty odkaz
  „Přihlásit loď" na stránce být nemá.
- **3-ux, divák:** kolikátá rozjížďka se jede a od kdy, vývěska a po dojezdu
  pořadí označené „předběžné" — výsledky po dojezdu stačí.
- **3-ux, skrytí odjeté regaty:** totéž pravidlo jako A — pořadatel, dokud
  nejsou výsledky venku, potom rozhodčí nebo správce ročníku.
- **7, co vidět:** kdo přijel a kdo nezaplatil. Souhlas na místě dnes nikdo
  nevymáhá (stránka sama píše „nevynucuje se"); má-li být podmínkou startu,
  je to otázka R9 na Filipa, a pak „bez souhlasu" prezenci blokuje.
- **7, prázdné pořadí:** loď na regatě nebyla; výsledek nemá a do poháru
  dostane DNC, tedy počet lodí své třídy přihlášených na tu regatu.
- **7, věta pro cizího:** „duben až září", ne květen (Jarní vítr 25. 4.);
  místo „přijet může každý s lodí" „přihlásit se může loď, která splní
  vypsání" (třídy podle délky trupu, R24); počty z dat, ne napevno.
- **8-pr, „Chci závodit":** na vypsání nejbližší vypsané regaty — tam jsou
  třídy, startovné, uzávěrka i přihláška; není-li žádná, na kalendář.
- **8-pr, vítěz:** jen po třídách, tři; celkové pořadí seriál nemá
  (`serie/[slug]/pravidla/page.tsx:65–66`).
- **9 a H, fotka papíru:** do vyhlášení konečného pořadí ročníku. Pohár
  lhůtu pro změny bodování nevyhlašuje (R21), takže o opravu jde žádat do
  konce série a papír je prvotní záznam komise. Verzovat, nemazat.
- **2 a F, modrá:** konvenci nenese. Barva má v jachtingu význam jen na
  vlajkách (modrá cíl, oranžová start); stav výsledků se říká slovem. Jsem
  s 2-designem: hotový stav v `--text`. Barva třídy: rozhodne kontrast.
- **K:** vývěska má ustálenou dvojici vyvěsit / sejmout („vyvěšeno dne,
  sejmuto dne"). Trojice: **Skrýt na webu · Sejmout z vývěsky · Smazat
  soubor**. „Stáhnout" nikde.

## Podmínka

1. **Zápis rozjížďky se nezvětšuje na 44 px dřív, než z něj zmizí lodě mimo
   listinu** (J). Jinak se zvětší 21 řádků, které tam být nemají, a 4,1
   obrazovky naroste.
2. **Tabule se na telefonu neschová dřív, než má „Vydáno k regatě" adresu
   čitelnou na 375 px** (E). Oznámení komise nesmí zůstat bez vývěsky.
