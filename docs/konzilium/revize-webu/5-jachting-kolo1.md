# 5-jachting — kolo 1

## Co je dobře

1. **Body po škrtu stojí hned za jménem lodi** (`sekce-vysledky.tsx:73`).
   Listiny je mají vpravo; na telefonu je tahle odchylka správně — výsledky
   regaty se na 375 px vejdou celé (tabulka 337 px), v pořadí zůstává vidět
   loď a číslo, podle kterého se řadí.
2. **Startovní listina je, kdo startuje** (`sekce-lode.tsx:44–49`).
   Nepotvrzené a vyloučené lodě stojí zvlášť pod vlastním nadpisem — přesně
   rozdíl mezi přihláškou a listinou, jak ho dělá rozhodčí (R10).
3. **Škrtá se dřívější ze stejně špatných** (ZPJ A2.1; Zephyr 1-1-1-1 má
   škrtnutou první) a zrušená rozjížďka zůstává ve sloupcích — jako na papíře.
4. **Kódy v zápisu jsou řazené podle četnosti na vodě** a zkratka se
   nepřekládá (`lib/kody.ts:21`): pořadí ruky u cíle, ne Dodatku A.
5. **Zrušení rozjížďky chce důvod podle ZPJ 32.1 a podpis čeká na protestní
   lhůtu.** Obojí jsou místa, kde se u vody šidí nejčastěji.

## Co je špatně

**1. Zápis rozjížďky nabízí všech 37 lodí ročníku; na listině regaty je 16.**
- **Nález** — `sprava/[serie]/vysledky/[zavod]/[cislo]/page.tsx:33` („všechny
  lodě ročníku"); audit C: 4,1 obrazovky, 86 cílů na 375 px.
- **Proč to vadí** — rozhodčí listuje 21 loděmi, které na vodě nejsou.
  Výsledek zapsaný omylem lodi mimo listinu z ní dělá „přihlášenou do závodu"
  (PLAN, *Pravidla seriálu*) a zvedne o bod každý DNF, DNS i DNC její třídy
  (A5.2). Listinu přitom rozprava zamyká (R38/R39) — zápis ji obchází.
- **Návrh** — zápis ukazuje jen lodě startovní listiny; pod tabulkou jeden
  úkon rozhodčího „Přidat loď mimo listinu". Délka klesne pod polovinu.

**2. Pravidla ročníku tvrdí o bodech za kódy něco jiného než tabulky.**
- **Nález** — `serie/[slug]/pravidla/page.tsx:109–135`. *DNC „počet
  přihlášených + 1"*: pod průběžným pořadím stojí „tolik bodů, kolik lodí"
  a tabulka to potvrzuje (Jarní vítr, Race: 2 lodě, DNC = 2); „+1" je místo
  na stupnici regaty, ne body seriálu. *RDG „o 1 hůř než poslední, kdo
  dojel"*: body nápravy určuje protestní komise (A9), což `/pravidla:116`
  samo přiznává. *ZFP „+20 % k bodům za nedokončila"* se čte jako DNF × 1,2;
  podle 44.3(c) je to dojeté místo plus 20 % bodů za DNF — a tresty podle
  pravidla 30 pohár formálně nevyhlašuje (R16). Chybí naopak kódy, které ve
  výsledcích opravdu stojí: DNF, DNS, OCS, RET.
- **Proč to vadí** — kdo si svůj řádek přepočítá podle stránky pravidel,
  dojde k jinému číslu než web, přestane věřit výpočtu a volá rozhodčímu.
- **Návrh** — jedna tabulka kódů, odkazovaná z výsledků regaty i z pořadí,
  se dvěma sloupci bodů: *v rozjížďce* a *do poháru*. Řádky DNF, DNS, OCS,
  RET, DSQ, DNE, DNC, RDG. U DNC do poháru „počet přihlášených lodí třídy",
  u RDG „určí protestní komise". ZFP, UFD a BFD z veřejného výkladu ven.

**3. Veřejné výsledky regaty neříkají, jestli jsou předběžné, nebo konečné.**
- **Nález** — `serie/[slug]/zavody/[zavod]/vysledky/page.tsx` a
  `sekce-vysledky.tsx` stav ani čas vyvěšení nenesou; tabule ho má
  (`tabule/vysledky.tsx:114,135`). Regata přitom smí pustit ven i nepodepsaná
  čísla (kalendář: „Hned, i nepodepsané"). Soudím z kódu — mock má vše
  potvrzené, nepodepsaný stav jsem neviděl.
- **Proč to vadí** — od vyvěšení běží lhůta na protest a na opravu bodování.
  Snímek tabulky koluje dál a nepozná se, že čtvrtou rozjížďku nikdo
  nepodepsal. A tabuli, která stav říká, na telefonu nepřečteš (A2).
- **Návrh** — řádek nad tabulkou: „Předběžné · 4. rozjížďka čeká na
  rozhodčího · vyvěšeno 16:42 · protesty do 18:42", po podpisu „Konečné
  výsledky · podepsáno 29. 8. 18:50".

**4. Listina a výsledky nenesou číslo na plachtě ani typ lodi.**
- **Nález** — `sekce-lode.tsx:81–82` má sloupce Loď a Kormidelník; data
  existují (správa přihlášek: „CZE 434 · Vaurien · Nikola Bureš").
- **Proč to vadí** — na vodě se loď pozná podle plachty, ne podle jména na
  boku; papír z cíle i protest se píšou na číslo. Listina, na které číslo
  není, neodpoví na „kdo je ta 434". Typ je druhá věc, kterou jachtař čte.
- **Návrh** — listina: číslo · loď s typem pod jménem · kormidelník;
  ve výsledcích číslo vedle kormidelníka. Na 375 px je na to místo.

**5. Stránka regaty nezná rozpravu a vývěska je jen na tabuli.**
- **Nález** — `upozorneni.tsx:15`: „Rozprava mezi nimi chybí, protože ji
  model nemá". „Vydáno k regatě" (odklad, bouřka, rozprava) kreslí jen
  `tabule/infopanel.tsx:59`.
- **Proč to vadí** — rozprava je jediný pevný čas dne: zavírá přihlašování
  (R39), zamyká listinu a startuje se „po ní" (R27). Web v den regaty ukáže
  vítr, vodočet i blesky, ale ne kdy být v klubovně. A oznámení závodní
  komise, která patří na vývěsku, visí na obrazovce s písmem 2,9–4,3 px.
- **Návrh** — čas a místo rozpravy do vypsání a od večera před regatou jako
  první řádek pruhu upozornění; „Vydáno k regatě" do téhož pruhu. **K ot. 5:**
  na telefonu tabuli nenabízet — u vody stačí tenhle pruh a výsledky (bod 3).

**6. Kalendář (ot. 1): odjetá regata má po ruce dva zpětné úkony.**
- **Nález** — „Vrátit mezi vypsané" ×7 a „Stáhnout z webu" ×8 (audit C).
- **Proč to vadí** — odjetá regata s podepsanými výsledky je uzavřená.
  Vrácení ji vyndá z průběžného pořadí (počítá se jen z odjetých), stažení
  sundá vyvěšené výsledky. Obojí je zásah do poháru, ne údržba kalendáře.
- **Návrh** — kalendář je termínová listina: termín, název, pořadatel, stav,
  koeficient a odkaz „Otevřít regatu". Úkon jen ten, který posouvá stav vpřed;
  u odjeté žádný. Zpětné úkony do okna regaty pod „Další úkony", s důvodem.

**7. Přihlášky (ot. 2): řádek ukazuje úkony, ne to, co prezence kontroluje.**
- **Nález** — vidět je stav a „Zrušit prezenci"; startovné a souhlas
  s pravidly jsou až v Podrobnostech, přitom nahoře stojí „Bez souhlasu
  16 z 16". „Zrušit prezenci" se nabízí i lodi se štítkem „má výsledky".
- **Proč to vadí** — prezence jsou tři otázky: je to tahle loď a posádka,
  zaplatila, podepsala. Souhlas je jediná právní vazba poháru (R9). A zrušená
  prezence u odjeté regaty mění body za kódy celé třídy (A5.2).
- **Návrh** — řádek: číslo · loď · kormidelník, dva znaky (startovné,
  souhlas) a jediné tlačítko „Potvrdit" u nepotvrzené. „Zrušit prezenci"
  a „Kód k připojení" do Podrobností; po rozpravě řádek bez tlačítka.

**8. Veřejné vypsání mluví k pořadateli (ot. 6).**
- **Nález** — `/zavody/radavsky-pohar/vypsani`: nahoře „Vypsání zatím není
  úplné… aplikace to nemá kde vzít", nadpisy s „(J1.1(5))", šestkrát „Není
  vyplněné" — u regaty odjeté v srpnu. 4,5 obrazovky na 375 px.
- **Proč to vadí** — vypsání čte závodník, než se přihlásí (ZPJ 25.1).
  Čísla Dodatku J jsou osnova pisatele a seznam nedodělků je veřejné
  přiznání, že se jelo bez vypsání.
- **Návrh** — veřejně jen vyplněné oddíly, číslované 1…n jako ve vzoru
  (R21): kdy a kde · třídy · přihlášky a startovné · program dne · trať ·
  bodování · právní oddíly. Odkazy na J a co chybí jen ve správě.

**9. Úvod (ot. 3): nejbližší regata je vedlejší věta, pořadí věčně průběžné.**
- **Nález** — `app/page.tsx:137–152`: regata je třetí odkaz jedné věty
  (16 px vysoký, audit B). „Odjeto 7 z 8 regat" počítá do jmenovatele
  zrušenou. Výsledky regaty mají sloupec „Body", pořadí „Po škrtu".
- **Proč to vadí** — závodník jde na úvod s otázkou „kdy a kde se jede";
  pořadí je druhá. „Průběžné" po poslední regatě říká, že se na něco čeká.
  A totéž číslo se na dvou tabulkách jmenuje jinak.
- **Návrh** — první blok podle fáze: před regatou „Nejbližší regata · datum
  · místo · Vypsání · Přihlásit loď", v den regaty „Dnes se jede", po podpisu
  poslední „Konečné pořadí 2026". „Odjeto 7 regat, 1 zrušena." U regaty se
  škrtem sloupec „Po škrtu".

**10. K A3: kód je fakt, body jsou z něj odvozené.**
- **Nález** — DNC a DSQ horním indexem 8,64 px vedle čísla.
- **Proč to vadí** — kód říká, *proč* loď číslo má; jen podle něj se žádá
  oprava. Škrt jen přeškrtnutím nepřežije tisk ani opsání.
- **Návrh** — kód písmem čísla („DNC 2"), škrt v závorce jako na listinách.

## Co bych potřeboval vědět

- **Filip:** mají všechny lodě poháru číslo na plachtě, nebo se část pozná
  jen poznávacím znakem? Od toho se odvíjí bod 4.
- **Filip:** pustí se někdy výsledky „Hned, i nepodepsané"? Pokud ano, bod 3
  je první v řadě; pokud ne, stačí řádek „Konečné".
- **9-rizika:** smí dnes pořadatel zrušit prezenci lodi s výsledky a stáhnout
  odjetou regatu z webu bez důvodu? Z obrazovky to nepoznám a nesmím klepat.
- **3-ux:** jak vypadá stránka regaty v den, kdy se jede? Mock má vše
  odjeté, takže nejdůležitější stav webu jsem neviděl.

## Čeho se nedotýkám

- Výšky cílů, přetečení, kontrast a písmo (A1, B, E) — 1-ergonomie
  a 2-design. K A3 říkám jen, co má kód znamenat, ne jak velký má být.
- Pevné pruhy (ot. 4), jednota vzhledu (ot. 7), nápověda a osobní údaje.
- Správnost výpočtu bodů drží `SerieTests` proti sešitu rozhodčího;
  posuzoval jsem, co web o výpočtu **tvrdí**, ne výpočet.
- Startovní procedura, cílová obrazovka a appka — mají vlastní oponenturu.
- Úvodní fotka a stav „jede se dnes" — neviděl jsem, mock je nemá.
