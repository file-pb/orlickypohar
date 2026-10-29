# Oponentura: role rozhodčího proti závodním pravidlům (27. 10. 2026)

Řez téhle oponentury není „jde v aplikaci odklikat, co po ní chceme". Je to
otázka o krok vedle:

> **Co z práce, kterou rozhodčímu ukládají pravidla, aplikace vůbec nezná?**

Rozhodčí má povinnosti ze **Závodních pravidel jachtingu 2025–2028** (ČSJ,
`rules.sailing.cz`), ne z aplikace. Že aplikace něco nedělá, není samo o sobě
vada — vada je, když **tvrdí, že je hotovo**, zatímco krok, který podle
pravidel proběhnout musel, nikde neproběhl.

Druhá otázka, stejně důležitá: **co po rozhodčím aplikace chce, co po něm
chtít nemusí?** Nález „jde to, ale zbytečně" je plnohodnotný nález.

Třetí: **souhlasí návod s aplikací?** `docs/NAVOD-ROZHODCI.pdf` je to, co
rozhodčí drží v ruce a podle čeho půjde.

## Mez poctivosti

**Nejsem rozhodčí.** Co jsem odvodil z kódu, je hypotéza o tom, jak to na vodě
padne — ne doklad. Proto jsou nálezy rozdělené podle původu a to rozdělení je
to hlavní, co tenhle dokument dělá:

| Značka | Původ | Váha |
|---|---|---|
| **R** | **Řekl to živý rozhodčí** na schůzce s Filipem | **doklad zvenčí** |
| **K** | odvozeno z přečteného řádku kódu a textu pravidel | hypotéza |

Stav u nálezu je **zapsáno** (čeká na rozhodnutí), **opraveno**, **padlo**
(střípek ho vyvrátil, text zůstává), nebo **k dodělání** — to poslední znamená,
že Filip řekl, že se to dělat bude. Shrnutí těch je hned za oddílem střípků.

**Nález R váží víc než nález K, i když je K lépe doložený.** K říká, co kód
dělá; R říká, co má dělat. Kde jdou proti sobě, platí R a kód je ten, co je
špatně.

Sezení s čerstvým pořadatelem v plánu pořád chybí (`docs/AUDIT-OBSAZENI.md`,
*Mez poctivosti*) a tenhle audit ho nenahrazuje. Schůzka s rozhodčím je první
skutečný vstup zvenčí za celý projekt.

## Jak se měřilo

- **Pravidla:** plný text ZPJ 2025–2028 z `rules.sailing.cz` (ten zdroj ukázal
  rozhodčí sám, viz střípek 2). Citace jsou doslovné, čísla pravidel sedí.
- **Aplikace:** čtení zdrojáku API a webu. **Neběželo ani API, ani mock** —
  tahle session nic neklikala. Každé tvrzení o aplikaci má u sebe soubor a
  řádek; kde ho nemá, je to označené jako nedoložené.
- **Návod:** text vytažený z `docs/NAVOD-ROZHODCI.pdf` (24 stran, verze
  z 26. 10. 2026).
- **Skutečné listiny** (od 28. 10. 2026): vypsání závodu a plachetní směrnice
  Jarního větru 2026, které poslal rozhodčí mailem (střípek 15). Nálezy R20
  až R27 jsou z nich. Je to **jediný zdroj v tomhle auditu, který říká, co
  pořadatel a rozhodčí opravdu vydávají** — zbytek říká, co pravidla žádají
  nebo co kód dělá. Soubory v repozitáři nejsou a nebudou (osobní údaje
  a cizí listiny).
- **Hlasové nahrávky** (od 28. 10. 2026): jedenáct zpráv z WhatsAppu, 6 minut
  50 sekund, přepsané lokálně modelem `large-v3` (nic se neodesílalo). Přepisy
  jsou doslovné; zřejmý přeslech rozpoznávání je označený hranatou závorkou
  a **nález se z přeslechu nedělá**. Zvuk ani přepisy v repozitáři nejsou.
- **Nezkoušelo se** chování za běhu. Mock v tomhle repu už dvakrát lhal
  v obou směrech (`docs/AUDIT-OBSAZENI.md`, *Nálezy v mocku*), takže tvrzení
  „obrazovka se chová takhle" by bez běžícího API bylo měření nástroje, ne
  světa.

---

## Střípky z diskuse

Doslovný zápis toho, co přišlo od Filipa ze schůzky. **Nepřepisovat** — je to
jediný vstup zvenčí, který projekt má, a jeho hodnota je v tom, že je
nepřebarvený. Nálezy z něj odvozené jsou níž pod značkou R.

**Forma je dohodnutá a je různá** (Filip, 27. 10. 2026): *„někdy to budou texty
z WhatsApp, někdy hlasový záznam a někdy fotka a podobně. Miloš nám začal
koukat na appku a abychom se někam pohnuli a zlepšili jsme ergonomii, tak jsme
domluveni na této formě."* Z toho plynou tři pravidla pro zasazování:

- **Přepis hlasu je mluvená řeč.** Nedokončená věta, přeřeknutí nebo opravená
  myšlenka nejsou nález. Kde si nejsem jistý, jestli je to požadavek nebo
  přemýšlení nahlas, napíšu to k tomu — a nedělám z toho R.
- **U fotky patří k zápisu, co dokládá.** Screenshot obrazovky, fotka papíru
  a fotka situace na vodě jsou tři různé druhy důkazu. Střípek 2 byl screenshot
  telefonu a dokládal jen to, odkud si Miloš pravidla otevřel — nic víc se
  z něj vyvozovat nedá.
- **Útržek z WhatsAppu nemá kontext.** Může navazovat na něco, co jsem neviděl.
  Radši otázka v dokumentu než domyšlená souvislost.

> ### ⚠︎ Past, které se tenhle dokument musí bránit
>
> Miloš kouká na appku kvůli **ergonomii**. Tenhle dokument je oponentura
> **proti pravidlům**. To nejsou tytéž otázky, a většina toho, co Miloš při
> procházení appky řekne, bude nejspíš o ovládání — *„tohle jsem nenašel",
> „tady bych čekal něco jiného"*. **Takový střípek do tohohle dokumentu
> nepatří** a ohýbat ho do pravidlového nálezu by znehodnotilo obojí.
>
> Kam s ním: `docs/SCENARE-OVLADANI.md` (scénáře ovládání, skupina D je
> rozhodčího) nebo `docs/AUDIT-OBSAZENI.md`. Sem se zapíše jen odkaz.
>
> Hranice vede takhle: **je ten střípek o tom, co se má dít, nebo o tom, jak se
> to ovládá?** „Vypsání závodu je dokument" je první, „tlačítko Přijmout trať
> jsem hledal pět minut" je druhé. Střípek 7 leží na hranici schválně — je
> o struktuře stránky, tedy o ergonomii, ale jeho první položka je pravidlová.

### Střípek 1 — workflow z pohledu rozhodčího (27. 10. 2026)

> Workflow z pohledu rozhodčího:
>
> **Vypsání závodu:** Vypisuje Rozhodčí, Pořadatel ale rozhodčí to uznává nebo
> kontroluje. Forma je dokument. Možná později bude rekognice a form ve správě.
>
> **Plachetní směrnice:** Zadává rozhodčí a do budoucna uděláme prekognici do
> stránky s možnosti stáhnout to pdf nebo ten zdroj. Teď stačí zdroj jak máme.
>
> V plachetních směrnicích je veškeré info k závodu, takže i časy a trať (tady
> bychom mohli pomoci tím naším boilerem trati). A dá se využít přeset časů
> rozpravy a jiných bodů organizace. Směrnice nám mohou ušetřit mnoho práce
> s editací a představením systému a opačně — pokud bychom měli editor
> směrnic, tak bychom mohli urychlit předem i vydání samotného dokumentu
> rozhodčím.
>
> To je vše z papírů.
>
> Pak nastupuje **Fáze přihlášek**, kdy se přihlašují lodě do závodu, tedy ne
> až na rozpravě, ale předem. Tam bychom už zapínali trasování pro systém.
>
> Pak je **Rozprava**. Jakmile je rozprava, zapínáme telku se startovní
> listinou, s možností editace ze strany správy. Rozprava — tam bude ujasněn
> předpoklad startu a 10 minut před startem zapnem mapu.
>
> **Startovní procedura:**
> 5 minut výzva · 4 minuty Přípravné znamení · 1 minuta do startu · Start

### Střípek 2 — odkud rozhodčí bere pravidla (27. 10. 2026)

Fotka z telefonu rozhodčího: hledá „závodní pravidla jachtingu" a otevírá
**ZPJ 2025–2028 na `sailing.cz`** (PDF, 113 stran). Filip k tomu: *„Prý tady."*

Není to jen URL. Říká to dvě věci:
- **autoritativní zdroj je ČSJ**, ne výklad v aplikaci — potvrzuje, co má
  projekt zapsané od 23. 9. 2026;
- **rozhodčí si pravidla hledá v Googlu na telefonu.** Aplikace na ně nikde
  neodkazuje; `rules.sailing.cz` má celý text v HTML, tedy odkazovatelný po
  jednotlivých pravidlech (nedoloženo, že má stabilní kotvy — neověřoval jsem).

### Střípek 3 — co je čemu nadřazené (27. 10. 2026)

> Závodní pravidla jachtingu jsou prý nadřazené pravidlům ČSJ (postřeh od
> rozhodčího).

Krátká věta, ale je to **jediný střípek, který mluví o pramenech práva**, a tím
o tom, kde v celém projektu smí bydlet vlastní pravidlo Orlického poháru.
Odvozený nález je R7.

### Střípek 4 — pohár není oficiální závod ČSJ (27. 10. 2026)

> Není to ofiko závod ČSJ. Miloš říká: *„není zahrnut do ČTL."* Ale máme úzkou
> spolupráci s ČSJ.

Odpověď na otázku, kterou otevřel střípek 3. **Část nálezu R7 tím padá a jiná
část naopak zesiluje** — a hlavně z toho vyšel nález R8, který je po R1
nejpraktičtější věc v celém dokumentu. Jak se se střípkem naloženo, je u obou
nálezů.

### Střípek 5 — jedeme podle ZPJ, ale pořadatelsky ofiko nejsme (27. 10. 2026)

> My podle ZPJ jedem, ale nejsme ofiko ve smyslu pořadatelství kvůli pojistkám
> apod. Jede se to na vlastní nebezpečí.
>
> Jen ty pravidla dodržujem. A s ČSJ komunikujeme.

**Tohle zavírá otázku 0** a zavírá ji přesně tak, jak se ptala — ne na ČTL, ale
na pořadatelství. Tři věci v jedné odpovědi, a každá míří jinam:

1. **„Podle ZPJ jedem" / „jen ty pravidla dodržujem"** — pravidla jsou přijatá
   jako pravidla hry. Potvrzuje jádro R8: ZPJ platí, protože si je pohár vzal.
2. **„Nejsme ofiko ve smyslu pořaditelství kvůli pojistkám"** — pořadatel
   tedy **není** členský klub podle ZPJ 89.1, a je to **záměr, ne nedopatření**.
   Tím padá celá větev předpisů ČSJ (licence, pojištění): podle ZPJ 88.1 se
   řídí členstvím pořadatele. Viz opravené R7.
3. **„Jede se to na vlastní nebezpečí"** — a tohle je ta věta, ze které vyšel
   nový nález **R9**. Je to právní konstrukce, která stojí a padá s tím, že si
   ji každý účastník přečte a odsouhlasí — a to se děje v jediném okamžiku,
   který aplikace má: při přihlášení.

*„S ČSJ komunikujeme"* beru jako vztah, ne jako pramen pravidel — do nálezů
z toho nic neodvozuju.

### Střípek 6 — co má být na stránce regaty a v jakém pořadí (27. 10. 2026)

Doslova z WhatsAppu, včetně časů — je to **první střípek psaný samotným
Milošem**, ne přeposlaný Filipem:

> **[27.10.2026 16:59:54] Miloš Zvonař:** Jarni vitr pro prihlasene: Vypsani
> zavodu - plachetni smernice - zavodni trat - prihlasky - startovni listina
>
> **[27.10.2026 17:01:02] Miloš Zvonař:** Neprihlaseni: vypsani zavodu-
> plachetni smernice - zavodni trat

Dvě minuty po sobě, dvě publika, dva seznamy. Odvozený nález je **R10** a leží
schválně na hranici popsané výš: je to požadavek na **strukturu stránky**, tedy
ergonomie — ale **první položka obou seznamů je dokument, který neexistuje**,
a to už pravidlová věc je.

### Střípek 7 — startovní procedura očima startéra (27. 10. 2026)

Nejobsáhlejší střípek zatím. Přišel ve dvou částech, mezi nimi Filipovo *„zatím
nereaguj, budu psát dál"*. Odvozený nález je **R12**, a odpověď na Filipův dotaz
do pravidel je hned za citací.

**První část — jak den běží:**

> On popisoval start rozjížďky: (my v rozpravě na konci setneme kdy asi bude
> startovní procedura). Také se na rozpravě zkontroluje startovní listina
> a potvrdí trasy. Pak se všichni odeberou na lodě a vyrazí do oblasti startu.
> Např 15 minut před startem se telka přepne ze startovní listiny na tracker.
>
> Nyní Miloš hovořil ze svého pohledu, ale jak víme, startovat může i jeden
> z pořadatelů. Mluvil tedy Miloš jako rozhodčí/startér. **Od této chvíle je
> zdroj pravdy mobilní aplikace startéra.**

**Druhá část — jak má nástroj vypadat.** Filipův návrh a v něm Milošova slova:

> Myslím, že by měl běžet veliký odpočet do termínu dohodnutém na rozpravě, ale
> to by mělo být něco jako count down, ale proceduru spustí startér. Cituji
> Miloše: *„Hele ale já spustím startovní proceduru. Musí to být jednoduše
> a jedním tlačítkem, mobil mi nesmí usnout a musím na něj dobře vidět. Nemůžu
> v jedné ruce držet megafon, dalekohled a řídit motorák, koukat kdo je přes
> čáru a do toho vyplňovat formulář v appce."* To byla samozřejmě nadsázka, ale
> vcelku trefná. Z toho pohledu pojďme zkusit jít trochu Milošovi naproti.
>
> Kdykoli uprostřed startovní procedury je možné ji přerušit. Pak je možné
> zadat nový čas a znovu odpočet. Dále po startu bychom potřebovali 10 minut
> zobrazovat seznam tlačítek s názvy lodí, aby se mohlo stisknout že mají
> alternativní trest. A poté, že ho absolvovali? (nevím jak je to správně,
> koukni do pravidel). Po 10ti minutách se obrazovka přepne na cílovou (to ještě
> doladíme).

### Střípek 8 — vytlačení od bojky a rozjížďka přerušená pro bezpečnost (27. 10. 2026)

> pak si pamatuju, že může nastat i situace, že se přerušila rozjížďka z důvodu
> bezpečnosti. Všechny lodě najedou na návětrnou a vytlačí několik lodí mimo
> bojku a ty z důvodu bezpečnosti uhnou mimo start i když jsou v právu
>
> koukni na to jak tohle řešit

Vzpomínka na konkrétní situaci, s přímým dotazem do pravidel. Odvozený nález
je **R13** — a pravidla na to mají **tři různé odpovědi** podle toho, kdo je
původcem.

### Střípky 16 až 24 — devět hlasových nahrávek (28. 10. 2026, 10:43–10:55)

Miloš nahrál do WhatsAppu devět zpráv, celkem 5 minut 11 sekund. **Je to
nejpodrobnější vstup za celou diskusi** — ve zprávě 21 (124 s) popsal celý tok
ovládání od rozpravy po odstartování, a v dalších čtyřech pokračoval až k další
rozjížďce.

**Jak se to přepisovalo.** Model `large-v3` (faster-whisper) lokálně na Filipově
Macu, česky, nic se neodesílalo. Přepisy jsou doslovné; kde rozpoznávání zřejmě
přeslechlo slovo, stojí správné znění v hranatých závorkách a **nález se z
přeslechu nedělá**. Zvuk je u Filipa, přepisy mimo repozitář.

**Nahrávka 16** (10:43:07, 4 s) — *„Tak ještě jednou zkusím ti to namlouvat."*
Bez obsahu, ponechané kvůli pořadí.

**Nahrávka 17** (10:43:29, 21 s) — dlaždice pro nepřihlášeného:

> „Jarní vítr, jako nepřihlášenej, bych viděl dlaždice, vypsání závodu,
> plachetní směrnice, předpokládaná trať, startovní listina, výsledky."

**Nahrávka 18** (10:43:56, 22 s) — a pro přihlášeného:

> „Jako přihlášenej bych za předpokládanou trať doplnil dlaždice přihláška
> k závodu a to je asi všechno."

**Nahrávka 19** (10:44:43, 22 s) — přístupy:

> „Předtím otázkou, asi byste měl nějak nastavit přístupy, priority, kdy my jako
> pořadatele nebo hlavní rozho[d]čí budeme potom moc[t] nějak zasahovat do
> startovní listiny, do upřesnění tříd a všech těchto věcí."

**Nahrávka 20** (10:45:12, 26 s) — čtyři třídy:

> „Jinak prosím tě, od nový sezony uprav třídy na do sedmi metrů, nad sedm metrů
> lehký, nad sedm metrů těžký a race. Názvy, když tak ještě pak upřesníme, ale
> budou čtyři kategorie, třídu nad sedm metrů chci rozhodit, aby měly větší
> motivaci závodit."

**Nahrávka 21** (10:52:54, 124 s) — **celý tok startu**:

> „Jinak aplikace rozhodčího by měla podle mě umět. V okamžiku, kdy uděláme
> rozpravu ze závodníky a odsouhlasíme si předpokládanej čas startu, tak bych
> tam měl umět ten předpokládanej čas startu nastavit s tím, že startovní
> procedura je teda minus pět minut a začíná pět minut před startem, to jsme si
> včera říkali, v okamžiku, kdy budu na lodi a budu připravený a zmáčknu začátek
> startovní procedury, tak by se to mělo rozběhnout, včetně těch intervalů, jak
> jsme říkali, vyzývací znamení v pátý minutě, ve čtvrtý minutě, přípravní
> znamení, minuta do startu a minuta [start]. **To by bylo fajn, kdybych na té
> aplikaci viděl, abych nemusel držet stopky a současně aplikaci ještě
> hu[o]kačku a megafon.** Další věc. V poslední minutě bych měl v té aplikaci
> vidět možnost přerušit startovní interval, nebo přerušit start, zrušit start.
> Druhá dlaždice by měla být alternativní trest. A tu, když máčknu, tak bych tam
> měl vidět jména všech přihlášených lodí. Pokud ty dlaždice nevyužiju, tak by
> se měla objevit kolonka start nebo odstartováno, nebo nápis start odstartováno.
> A tam by měla být ikona po startu zrušení startu, alternativní trest by tam
> stále měla být možnost, a pokud je nepoužiju, tak by se startovní sekvence
> mohla ukončit a závod je odstartovaný, roz[jíž]ďka je odstartovaná."

**Nahrávka 22** (10:53:48, 43 s) — za jízdy a u cíle:

> „Roz[jížď]ka běží. Měl bych tam mít možnost úpravy tratě, tak jak jsme se o ní
> bavili, když doufám, že ta se nebude často využívat. A pokud poběží
> tra[c]kování, tak jak to máš vymyšlený, tak bychom se měli posunout směrem
> k cíli, kde bych měl mít možnost zadávat zase lodě ručně průjezd cílem. A pokud
> to bude dělat tra[c]kování, tak bych tam měl mít možnost si to sám upravit,
> kdybych tam s něčím nesouhlasil."

**Nahrávka 23** (10:54:13, 17 s) — alternativní trest průběžně:

> „Měl bych tam mít někde dlaždici, která by se asi průběžně posouvala stále
> alternativní trest, protože pokud mi přijde loď k cíli a nahlásí rozhodčímu,
> že dělala alternativní trest, tak bych měl možnost to tam jít zaznamenat."

**Nahrávka 24** (10:54:45 a 10:55:10, 17 + 16 s) — ukončení a další rozjížďka:

> „A pro ukončení roz[jížď]ky bych měl mít možnost odsouhlasení pořadí
> a eventuálně možnost v případě přidání nebo dání protestů ze strany závodníka
> do toho pořadí ještě šáhnout."

> „Dál by to mělo umět, pokud odsouhlasíme konečný pořadí a jedeme o[kruhový]
> jachting, tak bych měl mít možnost zahájit nebo zadat druhou rozjížďku, nebo
> další následnou rozjížďku."

**Nahrávka 25** (11:05:17, 99 s) — **appka z pohledu kapitána**, nový řez:

> „Aplikace z pohledu kapitána. Měl by tam vidět seriál závodu, měl by mít
> možnost přihlásit se do závodu, mě[lo] by se to mělo projevit ve startovní
> listině, s tím, že bych tam měl mít někde kolonku platba startovného, kde já
> potvrdím, že zaplatil. Pokud se přihlásí po[řádně] do závodu, tak by mu tam
> měli nabíhat v ap[c]e aktualizace závodní komise. Měl by tam vidět, že byl
> potvrzený čas startu a zaháje[ní] startovní sekvence. **V podstatě by mohl
> vidět stejnou startovní sekvenci, kterou vidím já, akorát do ní nemůže
> zasahovat.** V případě, že udělá chybu na startu, tak by měl vidět, že jsem mu
> dal alternativní trest. Možná by i mohl potvrdit po jeho vykonání, že ho
> vykonal, ale abychom jim nekomplikovali život. Měl by tam mít dlaždici
> alternativní trest 360 stupňů a druhou dlaždici alternativní trest 720 stupňů
> v případě, že se dopustí chyby."

### Střípky 26 až 38 — třináct hlasových nahrávek (28. 10. 2026, 18:01–18:14)

**Tohle je odpověď na osm otázek**, které mu Filip poslal odpoledne (dávka 1
ze soupisu). Třináct zpráv, celkem 3 minuty 14 sekund, a **sedm z osmi otázek
je zodpovězených**. Přepis stejnou cestou jako u předchozích: `large-v3`
lokálně na Filipově Macu, česky, nic se neodesílalo; v hranatých závorkách je
správné znění tam, kde rozpoznávání zřejmě přeslechlo, a **nález se z přeslechu
nedělá**.

**Nahrávka 26** (18:01:19, 12 s) — první dlaždice trestu:

> „Jedna dlaždice bude alternativní trest podle pravidla 31, otáčka 360 stupňů
> za dotyk z[ bójí]."

**Nahrávka 27** (18:01:51, 15 s) — druhá:

> „Druhá dlaždice bude podle pravidla 44.1 otáčky 720 za dotek z lodí soupeře."

**Nahrávka 28** (18:02:44, 19 s) — dlaždice u startu:

> „U startu bude dlaždice s možností zrušit rozjížďku, nebo nějak nazveme
> zrušit rozjížďku, neplatný start, podle pravidla s minutovým [pravidlem]."

**Nahrávka 29** (18:03:05, 14 s) — třídy, a je to pokyn „nestav":

> „Třída lehká, těžká, neřeš, pouze vytvoř dvě dlaždice tohoto typu, do tříd si
> je zařadíme sami."

**Nahrávka 30** (18:03:27, 12 s) — práva, dvě věty:

> „Zásah do startovní listiny smí provést pouze rozhod[č]í. Úpravu výsledků smí
> provést pouze rozhod[č]í."

**Nahrávka 31** (18:03:45, 10 s) — kdy se přihlašuje:

> „Posádky se přihlašují po vypsání závodu. Po vypsání závodu. **Po rozpravě už
> nesmí.**"

**Nahrávka 32** (18:04:08, 12 s) — podpis vypsání:

> „Pokud se veřejní [= zveřejní] vypsání závodu, je platné i bez mého podpisu,
> nebo můžeme vytvořit elektronický podpis."

**Nahrávka 33** (18:04:25, 8 s) — nezletilý:

> „Žádný z kapitánů není nezletilý."

**Nahrávka 34** (18:04:39, 12 s) — co chce do přihlášky:

> „Do přihlášky budeme požadovat číslo VMP a číslo technického průkazu, pokud
> ho loď má."

**Nahrávka 35** (18:12:12, 36 s) — **oprava, kterou poslal sám**:

> „**Oprava.** U startu chci mít dlaždici odklad startu, na kterou když kliknu,
> tak bych potřebuji mít možnost nastavit, v kolik bude start. Když kliknu na
> dlaždici odklad startu, měl bych tam mít možnost, nebo **musím** tam mít
> možnost, napsat, v kolik bude start, posunutý start."

**Nahrávka 36** (18:14:04, 11 s) — a druhá dlaždice u startu:

> „Druhá dlaždice u startu bude OCS podle závodních pravidel jachtingu."

**Nahrávky 37 a 38** (18:14:38 a 18:14:43, 31 + 3 s) — celý úkon OCS, včetně
opravy v poslední větě:

> „Měl bych mít možnost po stisknutí dlaždice OCS napsat loď, která p[r]avidlo
> porušila, a když loď napíšu, měl bych mít možnost napsat, že chybu odčinila
> anebo neodčinila, tím pádem je diskvalifikovaná ze závodu … **nebo
> z rozjížďky.**"

### Střípek 15 — vzory mailem: vypsání i plachetní směrnice z ročníku 2026 (28. 10. 2026)

Miloš poslal **dva skutečné dokumenty** a sám je rozdělil podle toho, kdo je vydává:

> „Mas v mailu vzory vypsani zavodu (od poradatele jako by) a plachetni smernici
> (detailni info k zavodu od rozhodciho)"

`Vypsání závodu Jarní vítr 2026.doc` (3 strany, 574 slov) a `plachetní směrnice
Jarní vítr 2026.doc` (1 strana, 286 slov); oba uložené 14. 5. 2026, závod
16. 5. 2026, Marina Orlík. Podepsaní jsou na obou **oba**: ředitel závodu
i hlavní rozhodčí.

**Proč je to nejcennější střípek za celou diskusi.** R1 a R8 se dosud opíraly
o Dodatek J1 ZPJ — tedy o to, co pravidla *předepisují*. Tohle je, co pořadatel
a rozhodčí na Orlíku **opravdu vydávají**. Dvě položky, které jsem ve
`Vypsani.Sestav` nechal jako `null` s poznámkou „aplikace neví", Miloš ve svých
dokumentech má, takže vím i to, jak je formuluje. Nálezy odtud jsou R20 až R27.

**Vzory nejsou v repozitáři** a ani tam nepatří: nesou jméno a telefon
rozhodčího, jméno ředitele závodu a jsou to listiny Mariny Orlík, ne naše.
Cituje se z nich jen to, co nález potřebuje.

**Jedno upozornění ke čtení.** Vypsání 2026 říká *„Předregistrace není"* a
přihlášky se podávají papírově v kanceláři závodu. To appka vědomě mění — vzor
je tedy **předloha obsahu, ne předloha procesu**. Nálezy níž se drží obsahu.

### Střípek 14 — velitelský čas: start se jim už jednou pokazil výpadkem (27. 10. 2026)

> Stalo se nám, že při startu z webovými hodinami došlo k přerušení spojení a to
> pokazilo start a renomé. Takže startovní procedura musí držet čas a kontinuitu
> tam, kde je fyzicky hlavní startér. Pak při spojení předá data ven a srovná
> všem hodiny na svůj „Velitelský čas". To samé s Cílem.
>
> No a pak nevím proč by Startér s iPhonem by proceduru neměl mít? Startér může
> být jeden hlavní a druhý slave u druhého bodu startovní čáry a při propojení
> si mohou srovnat čas a zasahovat do startu a cíle oba. Mechanizmus rozhodování
> při odlišnostech už jsme řešili. Velitelský čas je ale jeden, je v rukách
> hlavního startéra a nesmí být závislý.

**Nejcennější střípek zatím** — je to jediná věc v celé diskusi, která se
**doopravdy stala a něco stála**. Nález **R19**, a je v něm i oprava mého omylu
o iPhonu.

### Střípek 13 — pushky na appky posádek musí chodit rychle (27. 10. 2026)

> až budeme řešit pushky na appky posádek, a změny stavů rozjížděk, tak bude
> taky potřeba doručit je fofrem

Budoucí požadavek, ne nález — ale vztahuje se k rozhodnutím rozhodčího, protože
právě jeho změny stavů se mají doručovat. Nález **R18**.

### Střípek 12 — co následuje po startu, a jedna vada z provozu (27. 10. 2026)

> Bavíme se stále z pohledu apky pro rozhodčího (protože jsme se bavili
> s Milošem): Po povedenem startu a uplynutí času pro alternativní tresty (nebo
> přepnutí na „Start vyřízen"). Máme klidnou chvíli na cokoli. Následuje
> zobrazení cílové obrazovky, nebo obrazovky pro činnosti (většinou krizové,
> nebo zkrácení, nebo .... to ještě vymyslíme), Cílovka je ale běžný krok co by
> měl následovat. Po dojetí a ukončení rozjížťky bude následovat příprava na
> další.
>
> Mj všml jsem si, že když jsme po startu rozjížďky přihlásili novou loď, tak
> se hned nezobrazila v seznamu v apce. A web jsme museli obnovit.

Dvě věci v jednom: **tok obrazovek** (nález R17) a **vada pozorovaná
v provozu** — a ta druhá je cennější, protože je to jediný střípek zatím, který
hlásí, že něco nefunguje. Rozebraná je v `docs/SCENARE-OVLADANI.md`; sem patří
jen to, že se našla.

### Střípek 11 — megafon, a návrh ukázat vlajku na tabuli (27. 10. 2026)

> Většinou na ně pořvává megafonem. Vlajku (vlající 3d) můžeme ukázat třeba na
> telce vlevo na mapě dole nad běžícími pořadími spolu s odpočty a informacemi
> startovní procedury.

**Odpověď na R15: je to možnost 2.** Megafon. A druhá věta je návrh, co s tím —
rozebraný v R16.

### Střípek 10 — u Miloše nejsou vidět vlajky (27. 10. 2026)

> U miloše jsem nikdy vlajky neviděl

Filipovo pozorování, ne Milošovo slovo. Krátké, ale sahá pod všechno, co bylo
o startu řečeno: pravidlo 30 i odvolání podle 29.1 jsou **podmíněná vyvěšenou
vlajkou**, a procedura podle 26 stojí na vizuálních znameních. Odvozený nález
je **R15**.

### Střípek 9 — Miloš odpovídá na otázku 10 (27. 10. 2026, 21:08)

> **[27.10.2026 21:08:43] Miloš Zvonař:** Alternativni trest
>
> **[27.10.2026 21:09:35] Miloš Zvonař:** Pri startu s minutovym pravidlem pri
> jeho poruseni- lod je v posledni minute pres caru nebo odstartuje predcasne

Odpověď na to, nač se Filip ptal v otázce 10. **Dvě řádky, a opravují nález R11**
— „minutové pravidlo" je ZPJ 30, ne otáčky podle 44. Odvozený nález je **R14**.

---

## Co je potvrzené k dodělání

**Tenhle oddíl není plán** — plán vzniká po diskusi, mezi Filipem a hlavní
session. Je to jen seznam toho, u čeho Filip během diskuse řekl, že se to dělat
bude, aby se to nemuselo hledat po nálezech. Všechno ostatní čeká na rozhodnutí.

### Pyramida autority — rozhodnuto Filipem 28. 10. 2026

> *„pozor, včera jsme se bavili o důležitosti »velitelského času« na mobilu
> hlavního startéra. To skalopevně platí. Ostatní z něj musí vycházet a např. se
> aktualizovat, ale platí to, že v krizi bude startér a jeho papír jediné, co
> nám zbyde a řídí závod. To bude spodek pyramidy. Pak jeho mobil. Pak slave
> startéři a pak teprve systém a ostatní apky."*

**Tohle je pořadí, ve kterém se věří**, od toho, co drží vždycky, k tomu, co
odpadne první:

| # | Kdo řídí závod | Čím je neporazitelný |
| --- | --- | --- |
| 1 | **Startér a jeho papír** | Nepotřebuje elektřinu, síť ani nás. Rozhodčí tak jezdil regaty dodnes. |
| 2 | **Mobil hlavního startéra** | Vlastní hodiny. Velitelský čas vzniká tady, i bez spojení. |
| 3 | **Slave startéři** | Mají čas od hlavního; bez něj neurčují, jen hlásí a mohou o velení požádat. |
| 4 | **Systém a ostatní appky** | Odběratelé. Dozví se to, co jim hlavní pošle, až se to pošle. |

**Co to mění v myšlení.** Obvyklý reflex je postavit server jako jedinou pravdu
a klienty jako okna do něj. Tady je to **naopak**: server je čtvrtý a jeho role
je *rozeslat*, ne *rozhodnout*. Když se rozejdou, platí mobil hlavního startéra
— a když odpadne i ten, platí papír a systém se dozví výsledek až potom
(prekognice vyfocených výsledků, kterou projekt umí od začátku).

**Tři důsledky, které z toho plynou pro každou stavbu okolo startu:**

1. **Odpočet nikdy nesmí čekat na odpověď serveru.** Běží z hodin telefonu
   a odesílá se vedle toho. Prodleva sítě nesmí posunout start ani o sekundu.
2. **Nic se nesmí zablokovat kvůli nedostupnosti systému.** Žádná obrazovka
   startéra nemá mít stav „nelze, nejsem online" — nejvýš „zatím neodeslané".
3. **„Nesouhlasí to" se řeší přepsáním shora**, ne slučováním. Mechanismus pro
   dva rovnocenné zapisovatele projekt má (scénář C7), ale tady rovnocennost
   neplatí: velitelův čas přebije čí koliv (`Veleni.ProcNesmiPrepsatStart`).

**Co to nemění.** Nic z toho nepopírá, že posádky mají odpočet vidět (nález
R34) — jen to říká, **odkud** ho vidí: dostávají kopii toho, co hlavní startér
rozeslal, ne samostatný výpočet na serveru.

### Velitelský čas (R19) — potvrzeno 27. 10. 2026

> *„super tak si to zapiš že to budeme chtít dodělat"*

Dva chybějící díly ze šesti; zbylé čtyři na cílové obrazovce už jsou:

1. ~~**Start musí přežít výpadek.**~~ **Hotovo 28. 10. 2026** (fáze 1.2).
   Klepnutí se nezahazuje: čas leží v telefonu vedle rozdělaného zápisu
   (`koncept.ts`, `CekajiciStart`) a odesílá se, dokud neprojde. Nakonec
   ne jako pole v `Koncept`, ale vedle něj — důvod je u R19.
   **Tohle byla ta vada, která jim pokazila start.**
2. ~~**Pojmenovat, čí hodiny platí.**~~ **Hotovo 28. 10. 2026** (fáze 3.2):
   `Veleni.ProcNesmiPrepsatStart` — velitelův start nikdo jiný nepřepíše,
   velitel přepíše čí koliv. Jeden velitelský čas v rukou hlavního
   startéra, nezávislý na spojení; po připojení se rozešle ven a srovná ostatní.
   Mechanismus pro dva **rovnocenné** zapisovatele projekt má (porovnání dvou
   snímků, scénář C7), ale tady je jeden **nadřízený** — platí čas hlavního, bez
   vybírání. Filip uvedl, že se to už řešilo; v dokumentaci to není a z C7 se to
   odvodit nedá, takže to chce zapsat dřív, než se to začne stavět.

3. ~~**Kdo je hlavní, se stáhne dopředu a drží celý den.**~~ **Hotovo
   28. 10. 2026** (fáze 3.2): `Velitel` je řada záznamů u regaty, bere se
   u mola a výpadek s ním nehne. *(Odsouhlaseno
   Filipem 27. 10. 2026: „naprosto souhlas".)* Rozhodne server při propojení —
   ale **ne v okamžiku startu**, protože pak by výpadek sebral startéru právo
   odstartovat, a to je horší než dnešní stav, kde se ztratí jen zápis. Údaj
   „jsem hlavní startér téhle regaty" se chová jako okna závodních dnů: stáhne
   se u mola, platí celý den, výpadek s ním nehne. Rozbor je u R19.

4. ~~**Převzetí velení: slave požádá, server udělí.**~~ **Hotovo
   28. 10. 2026** (fáze 3.2) — přesně takhle, i s dokladem; telefon se ptá
   při každém připojení. *(Filip, 27. 10. 2026:
   „a spadnutí do vody je jasné a musí být řešitelné, je to docela možné";
   **rozhodnuto 28. 10. 2026**.)*

   **Jak to má fungovat:**
   - **Slave o velení aktivně požádá** — klepne „přebírám velení". Nedostane ho
     automaticky a nikdy si ho nevezme sám.
   - **Server žádost zapíše a stává se autoritou.** Starý hlavní se to dozví při
     připojení a přestane být hlavní; do té doby stejně nic neodešle, takže
     **dva hlavní v datech nevzniknou** — jen v hlavách, a tomu brání právě to,
     že se o velení musí požádat.
   - **Jde to kdykoliv, i uprostřed odpočtu**, a zapíše se kdo a kdy. Když hlavní
     spadne do vody tři minuty před startem, je to přesně ta chvíle, kdy to musí
     jít — zakázat převzetí během procedury by znamenalo zakázat záchranu tam,
     kde je potřeba nejvíc.

   **Proč tahle cesta a ne zbylé dvě** (obě jsou v archivu úvahy níž): *třetí
   strana z břehu* naráží na to, že u poháru dělá rozhodčího všech osmi regat
   jeden člověk, takže ten, kdo má velení předat, může být právě ten spadlý;
   *časová pojistka* je u startu nejriskantnější, protože hlavní může stát na
   startovní lodi s funkčním telefonem a jen bez signálu. Tahle varianta navíc
   sedí na dvě Filipovy dřívější věty, které to vlastně už rozhodly:
   *„rozhodne se na signalu, a oba by to měli akceptovat"* a *„jakmile se
   připojí, dojde k nastavení nového velitele, převzetí času a jedeme standard"*.

   *Zbývá k tomu dořešit jedinou věc, a není to rozhodnutí: telefon si musí při
   každém připojení ověřit, jestli je pořád hlavní — bez toho by se starý hlavní
   o ztrátě velení nedozvěděl.*

   **Archiv úvahy, ze které to rozhodnutí vzešlo** *(ponecháno, protože dvě
   zamítnuté cesty vysvětlují, proč ta třetí vypadá, jak vypadá)*: *„oba by to
   měli akceptovat"* znamená, že se slave hlavním **udělat sám nesmí**. Jenže
   potvrdit to má ten, kdo je ve vodě. Z toho plynuly tři cesty a každá měla
   svou daň:

   - **převede to server** — jenže to jde jen při signálu, a výpadek signálu
     u funkčního telefonu vypadá stejně jako telefon ve vodě. Hrozí dva hlavní,
     tedy přesně to, co se zakázalo;
   - **převede to třetí strana** (rozhodčí ročníku nebo správce na břehu) —
     neptá se telefonů na nic a má přehled; za cenu toho, že u vody musí být
     někdo třetí dostupný;
   - **časová pojistka** — kdo se neozval X minut, přestává být hlavní. Vzorec
     na to projekt má (tvrdý konec okna, stáří hlášení, `2 * ZIVE_MS`), ale
     u startu je to nejriskantnější: hlavní může stát na startovní lodi
     s funkčním telefonem a jen bez signálu.

   **Ať se zvolí cokoliv, po převzetí musí zůstat doklad, kdo a kdy velení
   převzal.** To projekt už umí a dělá to na správném místě — změna nastavení
   trackeru po rozpravě vyžaduje důvod, protože *„je to doklad pro spor"*. Start
   je spornější než viditelnost poloh.

   **Totální krize má ale jednodušší odpověď než převzetí velení** (Filip,
   27. 10. 2026): *„V totální krizi by se rozjížďka odjela jen jea mobil, prostě
   dokud nebude na pripojeni tak si to apka odměří… jakmile se připojí, dojde
   k nastavení nového velitele, převzetí času a jedeme standard."*

   Krizový režim tedy není zvláštní stav, ale **dočasný, který se při připojení
   sám rozpustí** — a velitel se po připojení nastaví znovu, takže se vůbec
   nemusí řešit, kdo jím byl před výpadkem. **Z toho, co k tomu dnes stojí:**

   | Krok | Zvládne to mobil sám? |
   |---|---|
   | **zapsat dojezdy bez startu** | **ano** — `NamerenyCas` vrací `null`, když start chybí (`Zapis.cs:169`), takže se uloží absolutní okamžik a čas se dopočítá; po doplnění startu se přepočítá (`ZapisSprava.cs:486`) |
   | **přežít výpadek s rozepsaným zápisem** | **ano** — `koncept.ts`, a odesílá se znovu po návratu signálu |
   | **zapsat start** | **ne** — ztratí se (bod 1 výš) |
   | **založit rozjížďku** | **ne** — `pridejRozjizdkuAkce` je serverová akce |

   Takže z Filipova *„apka si to odměří"* dnes chybí **dvě věci, a jen jedna
   z nich je práce**: start do konceptu (bod 1) a **rozjížďky založené
   dopředu**. To druhé je provozní zvyk, ne kód — program dne se zná z rozpravy,
   takže se rozjížďky dají založit u mola, dokud je signál. S tím a s bodem 1 se
   **celá rozjížďka odjede offline už dneškem**.

   *Jedna poznámka k `otisk`u: koncept je dnes **rozdíl proti serverovému
   zápisu** (*„`otisk` je podoba zápisu na serveru v době…"*, a použije se *„jen
   při shodném otisku"*). U rozjížďky založené dopředu a prázdné to vadit nemá —
   prázdný zápis je taky otisk. Nezkoušel jsem to, je to hypotéza k ověření.*

   **A proč to vůbec musí jít** (Filip, 27. 10. 2026): *„rozhodčí dodnečka
   jezdil regaty jen na papír, proč by to nemohlo jít."*

   **To je ta správná laťka, a appka ji u startu podlezla.** Startér s papírem
   a stopkami si čas zapíše a nic mu ho nevezme — papír nikdy nebyl online,
   takže výpadek pro něj neexistuje. Aplikace ten čas ztratila právě proto, že
   se spolehla na server. Papír je tedy **spodní laťka, ne vzor**: cílem není
   dělat z appky papír, protože její smysl je v tom, co papír neumí — tabule,
   tracking, přepočet časů, doklad. Ale **v krizi nesmí být horší než papír**,
   a u startu byla.

   **Dnes má krize řešení a jmenuje se papír.** Aplikace s ním počítá: u každé
   rozjížďky je oddíl *Papírový zápis*, kam se nahraje fotka a *„zůstává
   dokladem k číslům"* (`vysledky/[zavod]/[cislo]/page.tsx:270–280`), a návod to
   rozhodčímu říká rovnou — *„Zapsat se dá i doma z papíru a přiložit fotku
   zápisu z cíle"* (s. 14). Takže totální krize **není dnes bez východiska**, jen
   se platí přepisováním večer. Body 1 až 4 to nenahrazují, zkracují.

   **Jak má krize doběhnout** (Filip, 27. 10. 2026):

   > *„co se ji povede napsat, to udela, odjede se zbytek zapise na papir
   > a vyfoti. Jak se bude propojeni probouzet, dojde k synchronizaci a rekognici
   > co bude v nasich silach, a zbytek se bude muset doeditovat na webu, stejne
   > jako pri revizi vysledku."*

   **Tohle je degradace po krocích, ne havarijní režim** — a nejlepší na tom je,
   že **každý z těch kroků už v aplikaci je.** Žádný nový mechanismus:

   | Krok | Čím to dnes je |
   |---|---|
   | *„co se jí povede napsat, to udělá"* | **koncept v prohlížeči** — částečný zápis přežije a odešle se, až signál chytí |
   | *„zbytek zapíše na papír a vyfotí"* | **oddíl Papírový zápis** u rozjížďky; *„zůstává dokladem k číslům"* |
   | *„synchronizace a rekognice, co bude v našich silách"* | **`podleRizika`** — rozděluje rozdíly na *„tohle uložený zápis vůbec nemá"* a *„tady má něco jiného"*, a nabízí dvě tlačítka: **Doplnit chybějící** a **Přepsat rozdílná čísly z telefonu** |
   | *„zbytek doeditovat na webu"* | **formulář zápisu** |
   | *„stejně jako při revizi výsledků"* | **vrácení k revizi s povinným důvodem** a cesta zpátky přes návrh |

   **Ta poslední věta je ze všech nejdůležitější.** Krizový doběh se nenapojuje
   na nic nového — **je to tentýž proces jako revize**, který rozhodčí stejně
   umí a dělá u každé opravy. Tím odpadá otázka, kdo a jak krizový zápis
   schvaluje: schvaluje se jako každý jiný, a stav *K revizi* už nese důvod,
   takže se dá napsat „odjeto při výpadku, dopsáno z papíru".

   Mimochodem `podleRizika` vzniklo z úplně jiného důvodu — z nálezu, že koncept
   z telefonu vydával cizí opravu za ztracenou práci (`docs/SCENARE-OVLADANI.md`,
   C12). Pro „rekognici po krizi" je to ale přesně ten nástroj a nikdo ho tak
   nepojmenoval.

   **Přečíst ten papír strojově — Filipův návrh (27. 10. 2026):**

   > *„na začátku jsme vycházeli z rekognice vyfocených výsledků vzpomínáš? Podle
   > toho jsme dělali první pokusy s počítáním výsledků. No tak proč něco
   > takového nepoužít i po výpadcích?"*

   **V repu to po sobě nechalo stopu — ne jako kód, ale jako data.** `data/`
   obsahuje `2026-fxck-cancer.json`, `2026-poradi-rozhodci.json` a
   `2026-nanecisto.json`, kde *„jména, kategorie a pořadí v kategoriích jsou ze
   sešitu rozhodčího"*, a celé bodování je *„ověřeno proti výsledkové listině
   FxCK Cancer regaty 2026"* (`PLAN.md:174`). Takže ta rekognice proběhla a
   odvedla práci; zůstala po ní strukturovaná data, ne funkce. *(Tu konverzaci
   si nepamatuju — vidím jen její výsledek v souborech.)*

   **Nápad je dobrý a tohle je ta správná chvíle na něj**, protože papír z cíle
   se stejně fotí a fotka v aplikaci už leží. Dva rozdíly proti tehdejšku, které
   by se neměly přehlédnout:

   - **Tehdy to byla tištěná listina, teď je to ruční zápis na mokrém papíru.**
     To je jiná úloha: čísla psaná v cíli v chvatu, možná přeškrtaná, možná
     s šipkami. Spolehlivost bude nižší a u výsledků je chyba drahá.
   - **Proto to nesmí být import, ale návrh k potvrzení.** A tady je ta hezká
     část: vzorec na to projekt má hotový. `podleRizika` ukazuje dva seznamy a
     dvě tlačítka — *Doplnit chybějící* a *Přepsat rozdílná*. Rozpoznaná čísla
     z fotky jsou přesně takový druhý zdroj jako koncept z telefonu, takže by
     šla pověsit na tentýž mechanismus, který už zná odpověď na otázku „čemu
     věřit".

   Pozor na past, kterou tenhle projekt pojmenoval vícekrát: **kontrola, která
   měří nástroj místo světa.** Kdyby se rozpoznaný zápis zobrazil jako hotový,
   rozhodčí ho odklepne a nezkontroluje — a chyba OCR se stane výsledkem. Musí
   se tedy potvrzovat **po řádcích proti fotce**, ne jedním tlačítkem.

   A nemusí to být v API: rozpoznání může zůstat krokem, který udělá člověk
   s modelem (jako tehdy), a aplikace jen přijme výsledek jako druhý zdroj.
   To je výrazně levnější než stavět OCR do serveru — a u věci, která se použije
   několikrát za sezónu, nejspíš i správnější.

   **Filip to upřesnil do postupu** (27. 10. 2026):

   > *„prostě to někdo načmárá na papír, a vyfotí na mobil. Pak ti to nasype až
   > se probereš. Ty se mrkneš a pokusíš se to zapsat. Pak už standardní revize,
   > oprava revize, schválení a jedem."*

   **Pro tenhle postup existuje v aplikaci přesně padnoucí mechanismus a nikdo
   ho tak nepojmenoval.** Zápis z vody má **snímky zapisovatelů**
   (`ZapisNavrh.cs`): *„Snímek zápisu jednoho zapisovatele… **Není to výsledek,
   je to doklad o tom, co kdo viděl.** Do bodování nevstupuje; slouží
   k porovnání, ze kterého zapisovatelé vyberou správné pořadí."* Drží se
   k dvojici **rozjížďka × uživatel** a je na něj endpoint
   `POST …/rozjizdky/{cislo}/navrhy/{autor}/pouzit`.

   **Rozpoznaný papír je přesně takový snímek** — třetí zapisovatel vedle dvou
   lidských, nezávazný, k porovnání. Tedy ne nová funkce, ale nový *autor*
   existující. A navazuje to na revizi tak, jak Filip píše, protože snímky už
   dnes do revize ústí.

   > ### ⚠︎ Kde je moje mez — ten krok „pokusíš se to zapsat" nejde doslova
   >
   > **Do produkce zapsat neumím.** Produkční databázi ani konfiguraci nečtu
   > a přihlášení do aplikace nemám, takže snímek za sebe nezaložím a výsledky
   > neuložím. Import se na to navíc nehodí — `POST /import/serie` *„nahraje
   > celý ročník z jednoho souboru"*, ne jednu rozjížďku.
   >
   > **Co udělat můžu:** přečíst fotku a vrátit čísla v podobě, která se dá
   > rovnou přepsat nebo vložit — loď, pořadí, kód, čas, a u každého řádku
   > říct, jak jistý si tím jsem a co na fotce nejde přečíst. Zapsat to pak
   > musí někdo s přihlášením, a podle `Workflow.KdoSmi` to stejně musí být
   > **pořadatel**, ne rozhodčí.
   >
   > Kdyby to mělo běžet bez člověka uprostřed, znamenalo by to dát mi cestu
   > dovnitř — a to je rozhodnutí o přístupu, ne o funkci. Nenavrhuju ho.

**Jak se ti dva spárují — zodpovězeno 27. 10. 2026.** Filip: *„oni se párují
přes server, oba mají roli pořadatel rozhodčí a více."* Tedy žádné přímé
spojení mezi telefony; server je prostředník a přístup jim dávají role, které
už existují.

**Z toho ale plyne třetí díl, který v seznamu výš chyběl: asymetrie.** Oba mají
táž práva — a velitelský čas potřebuje, aby **jeden z nich byl hlavní**. V rolích
to není a (podle mě) ani být nemá: `Role` říká, **co kdo smí**, ne **kdo velí**,
a nic v `Identita` ani ve `Sprava` pojem „hlavní" nezná. Je to funkce v jednom
okamžiku jedné rozjížďky, ne oprávnění — tedy totéž rozlišení, jaké projekt už
jednou udělal u rozhodčího (`Prava.cs`: *„Rozhodčí je funkce v procesu, ne
stupeň"*), jen ještě užší.

Kam tu asymetrii dát, je otázka na návrh. Dvě cesty, které z dnešního stavu
plynou samy: **hlavní je ten, kdo proceduru spustil** (nic se nenastavuje, ale
po výpadku se neví, kdo to byl), nebo **hlavní se určí u regaty dopředu** (dá se
doložit, ale je to jedno nastavení navíc). Nerozhoduju to.

*Jestli jde jednomu účtu udělit pořadatele i rozhodčího zároveň, zkoumá
`docs/AUDIT-OBSAZENI.md` (nález O1: `Rozhodci` jde udělit jen na celý ročník,
`Organizator` na zastávku) — tady se to nezjišťuje podruhé.*

**Když se nepropojí — Filipův návrh (27. 10. 2026), zapsaný jako návrh:**

> *„pokud se nepropojí, vidí to slave, že nemá velitelský čas? nevim, navrhuji"*

**Ano, a projekt pro to má odladěný vzorec** — appka u trasování neukazuje
„posílá / neposílá", ale **stáří**: `svetlo: stari > 2 * ZIVE_MS ? 'ceka' :
'jede'`, s odůvodněním *„jedno vynechané kolo se stane, dvě už znamenají, že se
něco děje"*, a k tomu větu *„naposledy před X"*. Totéž dělá mapa u poloh
(*hlásí se · stárne · nehlásí se*).

**Jedno zpřesnění k tomu návrhu.** „Nemá velitelský čas" má dvě různé příčiny
a pro slave jsou úplně jinak zlé:

- **nepropojil se vůbec** — nemá žádný, jede na vlastních hodinách;
- **měl ho a spojení spadlo** — má **starý** velitelský čas, a to je pořád
  *jeden* čas pro oba.

To druhé je mnohem lepší než první a zahodit ten rozdíl by byla škoda. Proto
bych neukazoval „mám / nemám", ale **jak starý ten velitelský čas je** — přesně
jako u poloh.

**A důležitější otázka, kterou ten návrh otevírá: co slave mezitím smí dělat?**
Ukázat stav je nutné, ale nerozhoduje. Můj názor: **má zapisovat dál podle
svých hodin**, protože odmítnout zápis u vody je horší než nepřesný čas — a
hlavně se to srovná samo:

> `foreach (var v in vysledky) v.NamerenyCas = Zapis.NamerenyCas(rozjizdka.StartV, v.DojezdV!.Value);`
> — `ZapisSprava.cs:486`

**Dojezdy se ukládají jako absolutní okamžiky** (`DojezdV`) a naměřený čas je
dopočet ze startu, takže **změna startu přepočítá všechny**. Slave tedy nemusí
čekat na velitelský čas; zapisuje, a až dorazí, časy se srovnají samy. Ten díl
už je hotový.

**Jenže platí jen pro dojezdy.** U startu to neplatí a nemůže: start je ten
referenční bod, a dva starty se sloučit nedají. **Takže právo zapsat start má
mít jen hlavní** — a to je vlastně nejpřesnější odpověď na to, co „velitelský
čas" znamená: ne že hlavní má lepší hodiny, ale že **start je jeho úkon**.

**Co smí slave, když velitelský čas má (Filip, 27. 10. 2026):**

> *„no když bude slave mit dobry velitelsky cas tak muze treba dat alternativni
> trest, nebo upozornit hlavniho na (neregulérnost? nevim jak to nazvat, když se
> u jeho pozice něco stane a hlavni by to měl vědět)"*

**To slovo pravidla mají a je to zrovna to, co tě napadlo.** *Regulérnost* je
termín ZPJ — stojí v **32.1(d)** mezi důvody, proč smí komise zrušit rozjížďku:
*„z jakýchkoli jiných příčin, které mají přímý vliv na bezpečnost nebo
**regulérnost** závodění"* (a ještě jednou v N2 u mezinárodní jury). Takže
„ohrožená regulérnost" je přesné.

**Přesnější než jedno slovo je ale pojmenovat to podle následku**, protože jsou
to tři různé věci a každá vede jinam:

| Co slave u svého konce vidí | ZPJ | Co z toho plyne |
|---|---|---|
| loď byla v poslední minutě v trojúhelníku | 30.2–30.4 | **identifikace** → trest bez projednávání |
| loď je po startovním znamení přes čáru | 29.1 | **individuální odvolání**, vlajka X |
| je jich moc / nejdou rozeznat | **29.2** | **všeobecné odvolání** — a pravidlo to říká doslova: *„Když závodní komise **není schopna identifikovat lodě**… může signalizovat všeobecné odvolání"* |
| kolize, nebezpečí, nebo jiná vada regulérnosti | 32.1(d) | **zrušení** rozjížďky |

**A teď to podstatné: pravidla hlavního a slave nerozlišují.** Pravidla 29, 30
i 32 mluví výhradně o **závodní komisi** jako celku, ne o startérovi. Takže
identifikovat loď smí **oba** a je to v souladu s pravidly — druhý startér
u druhého konce čáry je přesně to, čím komise vidí tam, kam hlavní nedohlédne.
Tím se potvrzuje, co stojí výš: **asymetrie hlavní/slave je organizační, ne
pravidlová.** Z pravidel plyne jediné omezení, a to u startu — ten je jeden
a nese ho velitelský čas.

**Filipova podmínka *„když bude mít dobrý velitelský čas"* je věcně nutná, ne
opatrnost.** Identifikace podle pravidla 30 stojí a padá s časem: všechny tři
vlajky (Z, U, černá) mluví o *„poslední minutě před startovním znamením"*
a 30.1 taky. Slave, který nemá srovnané hodiny, tedy **nemůže spolehlivě říct,
jestli ta loď byla v trojúhelníku v poslední minutě, nebo o patnáct vteřin
dřív** — a je to trest bez projednávání, takže se to po závodě nemá o co opřít.
U dojezdů to tak tvrdé není (přepočítají se, viz výš), u startovních trestů ano.

**Kdo je hlavní — zodpovězeno 27. 10. 2026.** Filip:

> *„oba by si neměli myslet že jsou hlavni, to by se mělo rozhodnout na signalu,
> a oba by to měli akceptovat"*

Tedy **server je arbitr** a rozhoduje se při propojení; žádná dohoda mezi
telefony, žádné přebírání velení za provozu. To je jednodušší než cokoliv
distribuovaného a sedí to na to, že se oba párují přes server tak jako tak.

**Jeden důsledek, který jde proti bodu 1 výš, a je lepší ho vyřešit teď než
u vody.** Když se hlavní určuje *„na signálu"* a bez signálu není nikdo, pak
**start bez spojení nezapíše nikdo** — a to je přesně ta situace, která jim
start pokazila (R19). Dvě věci by se tím vylučovaly: *start musí přežít výpadek*
a *hlavního určuje server*.

Řeší se to tím, **kdy** se to rozhodne: ne v okamžiku startu, ale **dopředu —
a pak to telefon drží i bez signálu.** *(Filip to 27. 10. 2026 odsouhlasil:
„naprosto souhlas", takže to je rozhodnuté, ne návrh — viz bod 3 v oddílu
**Co je potvrzené k dodělání**.)* Vzorec na to projekt má, a je to tentýž,
na který ukazoval už R18: okna závodních dnů si telefon *„stáhne dopředu a řídí
se jimi i bez signálu; změna od pořadatele se projeví, až signál chytí"*
(`OknaEndpoints`). „Jsem hlavní startér téhle regaty" je údaj přesně toho
druhu — stáhne se u mola, platí celý den, a když spojení spadne, nic se tím
nemění.

Proti tomu *„rozhodnout se na signálu"* ve smyslu „až v okamžiku startu" by
znamenalo, že výpadek sebere startéru právo odstartovat. To by bylo horší než
dnešní stav, kde se ztratí jen zápis.

**Telefon ve vodě — zodpovězeno 27. 10. 2026.** Filip: *„a spadnutí do vody je
jasné a musí být řešitelné, je to docela možné."* Takže převzetí velení **musí
existovat**; jak se potvrzuje, je v bodu 4 oddílu *Co je potvrzené k dodělání*,
i s tím, proč to není triviální — výpadek signálu u funkčního telefonu vypadá
zvenčí stejně jako telefon na dně.

---

## Pasti v mocku, které by zneplatnily měření

**Tahle oponentura na mocku neměřila** (viz *Jak se měřilo*) — ale kdokoliv, kdo
půjde nálezy ověřovat, na něj narazí. Následující seznam poslala 28. 10. 2026
session *„Audit rolí: Miloš ve všech kombinacích"*, která ty rozdíly našla
a opravila při práci na `docs/TABULE-DIVAK.md`. **Všechny jsou opravené**;
zapsané jsou proto, že každá z nich dokáže vyrobit falešný nález.

| Co mock dělal | Co by to zneplatnilo |
|---|---|
| **`oknoDo` se nevydávalo** — veřejný detail ho bral ze zastávky s komentářem *„mock okna nevede"*, ačkoliv je od trackingu vede (`OKNA`). Po rozpravě tedy zůstávalo `null`. | **R3 a R4.** Oba stojí na tom, že rozprava otevírá den a mapa se zapíná před startem — měřilo by se zapínání mapy **proti nule**, tedy nástroj místo světa. |
| **`trat_na_rade` nefiltrovala zrušené rozjížďky**, tatáž mezera jako v `NaRadeAsync` | R13 a cokoliv kolem zrušení rozjížďky |
| **jména lodí v polohách a v záznamu byla klíče** (`cervene-cafe` místo `ČERVENÉ CAFE`) | identifikaci lodi u R14 a čtení záznamu trasy u R13 |
| **`zastavka_radek` nevydával `procesniDej`**, takže formulář úpravy regaty ho lokálně vždycky ukazoval vypnutý a uložení termínu by ho potichu vyplo | kalendářové úkony rozhodčího (R1) |
| **zprávy na vývěsce dostávaly duplicitní čísla** z `int(čas*1000) % 1000000` | vývěsku u R14 (oznámení čísla plachty) a R16 |

**To nejcennější z toho je první řádka**, a je to doklad k pravidlu, které tenhle
projekt platí opakovaně: *prázdná hodnota z nástroje vypadá jako zjištění o
světě*. Kdyby se R4 šlo ověřovat před tou opravou, vyšlo by, že se mapa
nezapíná — a byla by to pravda o mocku, ne o aplikaci.

**A jedna mez navíc, kterou si táž session dala sama k dobru:** nová funkce
`stavDne` (`web/lib/rozjizdky-tabule.ts`), kterou zavřela nález 9, **není hotový
popis závodního dne**. Umí šest stavů a *„žádný z nich není »deset minut před
startem« z Milošova střípku 1 — ten řetěz odemkne teprve fáze 3"*. Dvě měkké
hranice jsou v komentáři u funkce: po tvrdém konci okna netvrdí nic (okno se
mohlo zavřít dřív) a *„Po rozpravě"* neodliší otevřený den od zavřeného.
**Fáze 3 z ní tedy má vycházet, ne psát druhou** — ale ani ji brát za hotovou.

---

## Plán implementace (28. 10. 2026)

Sepsaný na Filipovu žádost: *„ohledně oponentury udělej plán pro implementaci,
aby nám ta oponentura k něčemu byla."* Oponentura našla dvacet šest nálezů, ale
**plán z nich nemá dvacet šest položek** — většina se sbíhá na čtyři věci a dvě
z nich jsou levné.

**Pořadí je podle závislostí, ne podle vážnosti.** Nahoře stojí to, co odemyká
ostatní; dole to, co na odemčeném staví.

### Fáze 1 — tři levné věci, které odemykají zbytek

> **Hotová 28. 10. 2026.** Všechny tři položky jsou v kódu a změřené proti
> mocku; co se u každé rozhodlo a čím se to ověřilo, stojí u jejích nálezů
> (K6, R19 bod 1, K2, R10). Odpočet na tabuli ožil — nález 7
> v `docs/TABULE-DIVAK.md` tím padl.

**1.1 Plánovaný čas startu** *(K6, R4, R12, a nález 7 v `TABULE-DIVAK.md`)*
Nejlevnější položka s nejdelším dosahem v celé oponentuře. Dnes `StartV` zapisuje
jediné místo (`ZapisSprava.StartAsync`) a ve stejném kroku přepne rozjížďku na
`Probiha`, takže **plánovaný start nejde zapsat vůbec**. Tím jsou mrtvé:
odpočet na tabuli (`rozjizdky-tabule.ts` obě fáze umí), panýlek *„procedura
v 10:25"*, přepnutí tabule na mapu před startem, i odpočet v ruce startéra.
*Hotovo:* rozjížďka může mít čas startu a zůstat `Planovana`; odpočet na tabuli
ožije bez dalšího zásahu. **Uděláno 28. 10. 2026** — čas v budoucnu rozjížďku
nerozjede, cílová obrazovka k tomu má pole.

**1.2 Start do konceptu** *(R19, bod 1 — potvrzeno k dodělání)*
**Tohle je ta vada, která jim pokazila start.** `odstartuj` bere čas lokálně
(dobře), ale při selhání odeslání ho `catch` zahodí (`setStart(puvodni)`) a řekne
*„zkus to znovu"* — u startu rada, kterou nejde splnit. `Koncept` v `koncept.ts`
přitom nese `dojeti` a `kody`, ne start. *Hotovo:* start přežije výpadek stejně
jako dojezdy a odešle se, až se signál vrátí. **Uděláno 28. 10. 2026** — leží
vedle konceptu, ne v něm (důvod u R19), a opakuje se, dokud neprojde.

**1.3 Věty, které tvrdí víc, než aplikace ví** *(K2, R10)*
Jen text, žádná logika. Stav *Schváleno* má popis **„Protesty vyřízené, pořadí
platí"**, a aplikace o protestech neví nic (`web/lib/vysledky.ts:73`,
`Zavod.cs:160`). Přeformulovat na to, co rozhodčí doopravdy podepisuje.
Zároveň: tab `Lodě` se má jmenovat **Startovní listina** (Filip rozhodl), ale
dnes vypisuje i lodě *„čeká na potvrzení"* a vyloučené — buď s názvem změnit
filtr, nebo nechat dvojici *Přihlášky* / *Startovní listina*.
**Uděláno 28. 10. 2026**: věta u *Schváleno* zní *„Pořadí v cíli sedí,
rozhodčí ho podepsal."* na obou místech, a tab je jedna sekce se dvěma
seznamy — listina a pod ní nepotvrzené přihlášky. Dvojice tabů zůstává
otevřená, rozhoduje o ní Filip (R10).

### Fáze 2 — vypsání závodu

> **Hotová 28. 10. 2026.** Obě položky jsou v kódu a změřené proti mocku;
> co se u každé rozhodlo, stojí u jejích nálezů (R1, R8, R9). Vypsání je
> druhý tab stránky regaty a souhlas se ukládá se zněním i časem.
> **Úkon uznání vypsání rozhodčím se nestavěl** — R1 u něj má
> nezodpovězenou otázku.

**2.1 Vypsání závodu jako dokument** *(R1, R8, R10)*
Stojí na něm nejvíc: ZPJ platí pro pohár **jen proto, že si je vezme** (pohár
pořadatelsky ofiko není), a prohlašuje se to v J1.1(2). Žijí v něm i vlastní
pravidla poháru — dvacet bodů za diskvalifikaci, koeficienty, škrty, bonus za
24hodinovku — která dnes bydlí v konstantě a v `PLAN.md`.
**Osnova je v R8 jako tabulka Dodatku J1** a osm z jedenácti řádků už v databázi
leží; chybí uzávěrka přihlášek, výše startovného a čas vyzývacího znamení.
*Hotovo:* vypsání se **generuje** z týchž čísel, podle kterých se počítá, takže
se s výpočtem nemůže rozejít. A je to první položka stránky regaty i pro
nepřihlášené (ZPJ 25.1). **Uděláno 28. 10. 2026** — `Vypsani.cs` a veřejná
cesta `…/zavody/{slug}/vypsani`; tři chybějící kolonky přibyly do `Zavod`
a co aplikace neví, dokument přizná.

**2.2 Souhlas s pravidly a vlastní nebezpečí** *(R9)*
Navazuje na 2.1, protože souhlas má na co odkazovat. Dnes se sbírá souhlas se
zveřejněním ve startovní listině, zatímco dokumentační komentář u toho parametru
tvrdí *„Kapitán potvrdil pravidla"* — a ať zní jakkoliv, **neukládá se**:
`Souhlas` se zkontroluje a zahodí. U závodu, kde pohár *„pořadatelsky ofiko
není"*, je to jediná vazba závodníka na pravidla.
*Hotovo:* znění pokrývá pravidla i vlastní nebezpečí, ukládá se příznak s časem
a verzí znění, a ptá se na něj i cesta přes pořadatele a import — ne jen veřejný
formulář. **Uděláno 28. 10. 2026** — `Souhlas.cs` s verzovaným zněním,
`Ucast.SouhlasV` a `SouhlasVerze`; u pořadatele a importu se nevynucuje a je
vidět, které lodě souhlas nemají.

### Fáze 3 — startovní procedura

> **Hotová 28. 10. 2026, všechny čtyři položky.** Procedura se spouští,
> odkládá i odvolává podle pravidel, přibyly čtyři kódy a
> **nevylučitelná diskvalifikace se už neškrtá** (to byl jediný nález celé
> oponentury, kde se špatně počítaly body).
>
> **3.2 velitelský čas** čekal na rozhodnutí o tom, jak se velení předává
> — R19 měl tři cesty a postavit kteroukoliv by znamenalo rozhodnout za
> Filipa. Rozhodl 28. 10. 2026 (slave požádá, server udělí, zůstane
> doklad) a téhož dne se to postavilo.

Největší kus a staví na 1.1. **Role aplikace je „drží čas a paměť, znamení dává
člověk"** (R15): vizuální znamení pro pole z obrazovky nebude, protože závodníci
nevidí startérův telefon.

**3.1 Procedura podle ZPJ 26** *(R5, R12)* — **hotovo 28. 10. 2026.**
5 / 4 / 1 / 0, spouští startér
jedním tlačítkem, délka je parametr ze směrnic (hvězdička u pravidla 26), ne
konstanta. Přerušení se dělí: **odložení před startem** (27.3, nový čas volný)
a **všeobecné odvolání po startu** (29.2, nový start minutu po spuštění
opakovače).

**3.2 Velitelský čas** *(R19, body 2–4 — **hotovo 28. 10. 2026**)* — jeden
autoritativní čas u hlavního startéra, nezávislý na spojení; kdo je hlavní, se
**stáhne dopředu a drží celý den** (odsouhlaseno); převzetí velení musí jít
a po něm zůstane doklad. Pět dílů ze šesti už na cílové obrazovce je.

**3.3 Startovní tresty a identifikace** *(R14, K1)* — **kódy hotové
28. 10. 2026**, paměť vlajky ne. Z pěti kódů, které
z pravidla 30 a 29.1 plynou, znal `KodVysledku` jediný, **OCS**. Chybí **ZFP,
UFD, BFD** — a ZFP není diskvalifikace, ale 20 % z bodů za nedokončila podle
44.3(c), tedy číslo do listiny. Identifikace lodi je podle 30.2–30.4 úkon
komise *„bez projednávání"*, takže patří startérovi, a smí ji dělat i slave
(pravidla hlavního a slave nerozlišují). **Pozor:** trest přežívá nový start
u každé vlajky jinak, takže aplikace musí vědět, která visela.
**A otevřená otázka před tím vším:** megafon není vizuální znamení, takže
*„minutové pravidlo"* je na poháru dohoda z rozpravy — a jako vlastní pravidlo
patří do vypsání (2.1).

**3.4 DNE a škrt** *(K1)* — **hotovo 28. 10. 2026.**
Nevylučitelná diskvalifikace podle ZPJ 90.3(b)
**nesmí jít vyškrtnout**, a `VysledkyZavodu` škrtala podle výše bodů bez ohledu na
druh kódu. DNE má přitom nejvyšší body, takže je vždycky první na ráně. Je to
jediný nález z celé oponentury, kde se **špatně počítají body**.

### Fáze 4 — na odemčeném

> **Stav k 28. 10. 2026:** 4.2 a 4.3 zčásti hotové, **4.1 předložena
> k rozhodnutí a nestavěna**. Jako jediná položka celého plánu mění
> vědomé rozhodnutí (*„Zamyká rozprava, ne start"*) i slib z návodu,
> takže k ní je u R3 rozbor — tři cesty, co každá stojí, a otázka, která
> stojí před nimi. Rozhodnutí patří Filipovi.

**4.1 Trasování od fáze přihlášek** *(R3)* — **rozbor předložen
28. 10. 2026, nestavěno.** Přímý rozpor s rozhodnutím
z 24. 10. Rozprava dnes nese tři nesouvisející věci (brána na data, zámek
viditelnosti, bod programu); posunout se má **jen ta první**. Pozor na tvrdý
konec okna, který je počítaný od otevření.

**4.2 Činnosti za jízdy** *(R17)* — **hotová 28. 10. 2026.** Zrušení
s důvodem přibylo ráno, změna úseku (33) a chybějící značka (34) večer:
vedou se **stranou, u rozjížďky**, trať zůstává přijatá (Filip: *„veď to
stranou"*). Prvek je povinný, aby na to šlo jednou navázat hendikepem,
který zatím není. Vyhlašuje se u prvku na obrazovce trati, vedle
zkrácení — tytéž meze, týž okamžik, týž člověk. ZPJ je vyjmenovávají a aplikace umí dvě:
**zkrácení** (plně, úkon rozhodčího) a **zrušení** (jen oklikou přes eliminaci
výsledků a **bez důvodu** — a 32.1 má čtyři různé příčiny). Chybí změna úseku
(33) a chybějící značka (34).

**4.3 Doručení ven** *(R18)* — **zčásti hotové 28. 10. 2026**: pobídka,
spěšné zprávy a odběr regaty u odložení a odvolání; kolem cíle se dál
nespěchá, protože napřed je potřeba rozhodnout, co by se posílalo.
Takt byl minuta a probudit ho zvenčí nešlo;
odběr na regatu (`Odbery.Zavod`) je připravený a nepoužitý, takže stačí připojit.
**Latence je funkcí fáze**: rychle jen kolem startu a kolem cíle, uprostřed
minuta stačí — a fáze aplikace už rozlišuje. Úzké hrdlo je ale v telefonu
(`ZIVE_MS` = 60 s při zápisu po 5 s), ne na serveru.

### Co do plánu nepatří, a proč

| Nález | Proč ne |
|---|---|
| **R7** (licence, pojištění ČSJ) | **padlo** — pohár pořadatelsky ofiko není, předpisy ČSJ se ho netýkají |
| **R11** (otáčky podle pravidla 44) | odpověď do diskuse, ne úkol; u otáček není co klepat ani podle pravidel, ani podle praxe poháru |
| **R2** (editor směrnic), **R6** (startovní listina z tabule) | směry, ne nálezy — rozhodnout před zadáním |
| **K3** (Ověřeno a Schváleno jsou dvě klepnutí) | smysl dostane teprve s protesty; do té doby je to vědomá redundance |
| **K4** (mez pravidla 76.1(a)) | nevyjasněné: *„vyloučení"* může v poháru plnit i roli diskvalifikace, která chybí |
| **K7** (shoda v cíli, ZPJ A7) | nízká priorita, a napřed otázka, jestli se to na Orlíku stává |
| **protesty jako celek** (K2 část) | velká věc s vlastním rozhodnutím: pohár není pod svazem, takže odvolání k ČSJ odpadá a protestní komise by byla poslední instancí. **Do plánu patří jen ta věta na obrazovce** (1.3) |
| ergonomie a grafika | jiný dokument — `docs/SCENARE-OVLADANI.md`, a devět os se už dělá ve vlastní session |

### Dokumentace: tři patra, a žádné se nesmí vynechat

Filip, 28. 10. 2026: *„pak je potřeba aktualizovat dokumentaci poháru, aby se
vědělo… a ještě dokumentaci obecnou, abys měl info o projektu."* Je to součást
každé fáze, ne úklid na konci — a projekt má na to, proč, vlastní doklad
(viz past níž).

**1 · Pro lidi** — `web/app/napoveda/page.tsx` a `docs/NAVOD-*.pdf`.

> **Past, kterou si projekt zapsal sám do nápovědy:** *„Oddíl o tabuli zastaral
> za jediný den (26. 10. 2026)… Text se mezitím dostal i do tištěného návodu pro
> rozhodčího, takže **nepravda v nápovědě neplatí jen tady: opisuje se z ní
> dál.**"* Řetěz je tedy **kód → nápověda → tištěný návod → rozhodčí u vody**,
> a vynechané patro se propíše až na konec. V téže hlavičce stojí i pravidlo
> pro spor: *„Kde se tvrzení rozešlo s kódem, platí kód."*

Co konkrétně **zneplatní už fáze 1**:
- nápověda, tabulka stavů: *„Ověřeno · Schváleno → čísla platí"*
  (`napoveda/page.tsx:510`) — a tatáž tabulka je v návodu rozhodčího (bod 16);
- `docs/NAVOD-ROZHODCI.pdf`, oddíl *Co aplikace zatím neumí* (s. 22) a **Šest
  otázek** (s. 23) — po fázi 3 bude otázka 1 zodpovězená;
- bod 18 o tabuli: *„čas do startu"* dnes nejde, po položce 1.1 půjde.

**2 · Obecná, ze které čte každá další session** — `docs/PLAN.md` a `CLAUDE.md`.

- **Hlavička `PLAN.md` nese stav k datu** (*„Stav k 20. 10. 2026: fáze 0 až 4
  a fáze 6 hotové; ve fázi 5 zbývají protesty a penalizace…"*). Je to **první,
  co přečte každý, kdo na projektu začne**, takže se aktualizuje po každé fázi,
  ne až na konci. Spolu s oddílem *Co ještě chybí* je to oficiální místo pro
  stav — a oponentura k fázi 5 právě dodala, co přesně u protestů chybí.
- `CLAUDE.md` jen tehdy, když se změní **konvence nebo přibude past**
  (oddíly *Pravidla, která nejsou na výběr* a *Pasti, na které jsme už šlápli*).
  Čtyři pokusy o jeden stín nebo to, že `revalidatePath` se v projektu nevolá
  nikde, jsou přesně ten druh věci, co tam patří.

**3 · Nálezy** — `docs/OPONENTURA-ROZHODCI.md`, `SCENARE-OVLADANI.md`,
`TABULE-DIVAK.md`. U hotového nálezu se dopíše **čím** je hotový; **text se
neškrtá**, protože vyvrácený i vyřešený nález je doklad, jak se k závěru došlo.

**A napříč všemi třemi: komentáře v kódu nesou důvody, ne popisy.** U každé
změny patří odkaz na nález (`R19`, `K6`…), věta, co ho vyvolalo, a datum —
často s citací rozhodčího nebo Filipa. Je to zvyk celého repa, ne ozdoba, a je
to zároveň jediná dokumentace, která se nemůže rozejít s kódem, protože stojí
vedle něj.

**Co je tenhle plán a co ne:** je to pořadí a rozsah, ne rozhodnutí o návrhu.
Kde oponentura říká *„nerozhoduju to"*, platí to dál — plán tím nic neschvaluje.

---

## Nálezy R — z diskuse s rozhodčím

### R1 — Vypsání závodu je dokument, a aplikace žádný nezná

*Původ: střípek 1, **potvrzeno střípkem 3**. Doloženo:
`Features/Zavody/Kalendar.cs:43`, celý `Features/Smernice/`, ZPJ 25.1.
Stav: **dokument hotový 28. 10. 2026** (fáze 2.1, viz konec nálezu);
**uznání vypsání rozhodčím dál chybí**.*

Rozhodčí: *„Vypsání závodu … Forma je dokument."*

V aplikaci je „vypsání" **stav v kalendáři**, ne dokument:

```csharp
// Kalendar.cs — řada stavů a kdo je dává
StavZavodu.Vypsany or StavZavodu.Odjety => Role.Organizator,
_ => Role.Rozhodci,
```

Jediný dokument, který aplikace zná, je plachetní směrnice
(`PlachetniSmernice.cs`) — jedno PDF na regatu, s verzemi a vyvěšením.
Vypsání závodu nemá tabulku, úložiště ani obrazovku.

**Proč to vadí podle pravidel.** ZPJ 25.1: *„Vypsání závodu musí být dostupné
každé lodi, která se přihlašuje do závodu dříve, než se přihlásí."* A v
aplikaci je to právě přechod na **Vypsaný**, který otevírá přihlášky lodí
(`NAVOD-ROZHODCI.pdf`, s. 3, tabulka kroků: *„Potvrzená → vypsaná … otevřou se
přihlášky lodí"*). Aplikace tedy otevře přihlášky příznakem, zatímco dokument,
který pravidla žádají mít **předem**, v ní není kde mít.

**Druhá polovina nálezu je ta cennější.** Rozhodčí říká: *„Vypisuje Rozhodčí,
Pořadatel ale rozhodčí to uznává nebo kontroluje."* Úkon **uznání vypsání**
v aplikaci neexistuje. Co rozhodčí dnes má:

- potvrdí **termín** (Plánovaný → Potvrzený),
- a smí vypsání **stáhnout zpátky** na potvrzený termín — protože o cílovém
  stavu rozhoduje `KdoSmi(na)` a Potvrzený je jeho.

Má tedy veto, ale ne podpis. Rozdíl není kosmetický: veto se uplatní, jen když
si rozhodčí všimne, kdežto podpis se musí vyžádat.

**Co k tomu přidaly střípky 3 a 4.** Vypsání závodu není jen chybějící
dokument — podle hierarchie pramenů (R7) je to **jediné místo spolu se
směrnicemi, kde smí být napsané vlastní pravidlo poháru.** Dvacet bodů za
diskvalifikaci, koeficienty do seriálu, počty škrtů, bonus za 24hodinovku:
všechno to jsou odchylky od Dodatku A, které v aplikaci dnes žijí jako čísla
ve sloupcích regaty a jako text v `PLAN.md`.

A protože pohár **není oficiální závod ČSJ** (střípek 4), nestojí na vypsání
jen odchylky — stojí na něm i to, že ZPJ vůbec platí. **Osnova toho dokumentu
a co z ní aplikace má, je v R8.**

> **Místo na citát z diskuse:** _(co přesně rozhodčí „uznává" — dokument,
> termín, nebo obojí? A co se stane, když to neuzná?)_

### Hotovo 28. 10. 2026 — dokument (fáze 2.1)

**Vypsání závodu je od teď dokument, ne jen stav v kalendáři.** Sestavuje
ho `Features/Zavody/Vypsani.cs` podle osnovy Dodatku J1 (ta tabulka z R8),
vydává se veřejně na `GET …/zavody/{slug}/vypsani` a na stránce regaty je
**druhým tabem hned za Úvodem** — pro přihlášené i nepřihlášené, jak žádá
ZPJ 25.1 a jak to vyjmenoval Miloš.

**Tři rozhodnutí, která si zaslouží být dohledatelná** (a dají se
přehodnotit, všechna jsou levná):

1. **Dokument je vygenerovaný návrh a říká to o sobě.** Pod ním stojí
   *„Tohle vypsání sestavila aplikace z údajů o regatě. Vydává ho pořadatel
   a uznává rozhodčí."* **Úkon uznání nestavím** — druhá polovina tohohle
   nálezu má nezodpovězenou otázku (*co přesně rozhodčí uznává*), a podpis,
   jehož obsah není vyjasněný, by byl slib naprázdno. Rozhodčí má dál jen
   veto přes stažení vypsání na potvrzený termín.

   > **Odpověď přišla 28. 10. 2026 a je v nálezu R20.** Vzor skutečného
   > vypsání jmenuje v záhlaví ředitele závodu i hlavního rozhodčího a
   > směrnice je podepsaná oběma — uznání je tedy **spolupodpis listiny
   > jmenovitě**, ne klepnutí na stav. Rozhodnutí „úkon uznání nestavím"
   > tím padá jako nedostatek informace; co zbývá, jsou dvě kolonky
   > u regaty a dva podpisy.
2. **Co aplikace neví, dokument nedosazuje.** Bod bez údaje nemá text,
   objeví se v seznamu *„Vypsání zatím není úplné"* a ten seznam stojí
   **nahoře**, ne v patičce: dokument jinak vypadá hotově, i když v něm
   chybí uzávěrka. Pro pořadatele je to zároveň seznam práce před
   otevřením přihlášek. **Místo konání chybí vždycky** — `Zavod` ho nevede
   nikde a sídlo pořadatele je něco jiného, takže „Orlická přehrada" by
   bylo vymyšlené, ne vygenerované. Doplnit se dá jedině údajem v datech.
3. **V tabu stojí „Vypsání", v nadpisu „Vypsání závodu".** Miloš ho jmenuje
   celé, jenže tabů je po jeho seznamu sedm a dvakrát delších a šířka je
   věcná námitka v R10. Plný název v nadpisu a krátký v tabu je cesta,
   kterou projekt už jednou zvolil (`nazev` a `kratky` u položek správy).
   Na 1280 px se pět tabů vejde na řádek, na 375 px je z nich akordeon.

Vypsání **vlajku nedostalo**, ze stejného důvodu jako Úvod: žádný závodní
signál neznamená „tady se vypisuje závod", a vymyslet mu jednu by rozbilo
právě tu znalost, kvůli které vlajky u tabů jsou.

### R2 — Směrnice jako zdroj dat, ne jako příloha

*Původ: střípek 1. Doloženo: `PlachetniSmernice.cs:176` (`JePdf`),
`Vyveseni.NeniPdf`. Stav: **směr, ne vada**.*

Rozhodčí: *„do budoucna uděláme prekognici do stránky s možnosti stáhnout to
pdf nebo ten zdroj. Teď stačí zdroj jak máme."*

Dnes aplikace bere **výhradně PDF** a kontroluje to magickými bajty:

```csharp
public static bool JePdf(ReadOnlySpan<byte> zacatek) => …
public const string NeniPdf = …
```

Takže „zdroj" (text, ze kterého PDF vzniklo) nemá kam uložit. To **není vada** —
rozhodčí sám říká, že dnešní stav stačí.

Vada by vznikla z té druhé věty, a ta je mnohem zajímavější:

> *„V plachetních směrnicích je veškeré info k závodu, takže i časy a trať
> (tady bychom mohli pomoci tím naším boilerem trati). A dá se využít přeset
> časů rozpravy a jiných bodů organizace."*

Rozhodčí tu popisuje **směrnice jako zdroj, ze kterého se aplikace plní** —
trať do stavitele prvků, časy rozpravy a startu do programu dne. Dnes jde tok
opačně a nikam: směrnice je neprůhledná příloha, ze které aplikace nečte nic,
a trať i časy se do ní zadávají podruhé ručně.

Totéž obráceně: *„pokud bychom měli editor směrnic, tak bychom mohli urychlit
předem i vydání samotného dokumentu rozhodčím."* Tedy ne jen číst ze směrnic,
ale **vydávat je z aplikace**.

Pravidla s tím počítají: ZPJ 90.2(a) ukládá závodní komisi *zveřejnit psané
plachetní směrnice, které odpovídají pravidlu J2* — J2 je jmenovitý seznam,
co v nich musí být. Editor podle J2 je tedy vymezená věc, ne volný text.

> **Místo na citát z diskuse:** _(co by v editoru muselo být, aby ho použil
> místo Wordu? A co se smí z PDF číst strojově — čísla bójí, časy?)_

### R3 — Trasování má běžet od přihlášek. Dnes začíná rozpravou

*Původ: střípek 1. **Přímý rozpor s dnešním návrhem.** Doloženo:
`Features/Tracker/NastaveniTrackeru.cs:32`, `Features/Okna/OknaEndpoints.cs`
(popis `/rozprava`), `NAVOD-ROZHODCI.pdf` s. 8. Stav: **zapsáno, vysoká
priorita**.*

Rozhodčí: *„Pak nastupuje Fáze přihlášek, kdy se přihlašují lodě do závodu,
tedy ne až na rozpravě, ale předem. **Tam bychom už zapínali trasování pro
systém.**"*

Aplikace má bránu na data postavenou jinam, a je to **vědomé rozhodnutí**
z 24. 10. 2026:

```csharp
// NastaveniTrackeru.cs
/// <b>Zamyká rozprava, ne start</b> (Filip, 24. 10. 2026). Tracker běží od
/// rozpravy, takže mezi rozpravou a startem už polohy chodí — a to je …
```

```
POST …/okna/rozprava
  „Od téhle chvíle smí trackery zaznamenávat."
```

A návod to rozhodčímu slibuje jako vlastnost: *„Teprve rozpravou začne
aplikace brát trasy z telefonů. Do té doby telefon na palubě nic neodešle —
body si nechá v sobě a pošle je, až se den otevře."* (s. 8)

**Dvě věci se tu pletou do jedné.** Rozprava dnes nese tři nesouvisející
významy najednou:

1. *brána na data* — od teď trackery smí zaznamenávat (`OknaSprava.OtevriAsync`);
2. *zámek viditelnosti* — od teď smí nastavení měnit jen rozhodčí a jen
   přísněji (`NastaveniSprava.Zamkni`);
3. *bod v programu dne* — „sešli jsme se, řekli jsme si, jak se pojede".

Rozhodčí chce posunout **jen (1)**, do fáze přihlášek. Body (2) a (3) na
rozpravě sedí správně — zámek dává smysl právě proto, že po rozpravě už se
pravidla hry měnit nemají.

**Co se rozpadne, když se (1) oddělí:** nic v právech — `SmiAsync` u trackeru
i oken pouští pořadatele regaty i rozhodčího ročníku bez ohledu na okno. Co se
rozpadne, je **tvrdý konec okna**: `TrvaniHodin` (výchozí 14, nejvíc 36,
`OknoRegaty`) je počítaný od otevření. Trasování od přihlášek, tedy klidně
týdny předem, by do téhle konstrukce nešlo bez druhého pojmu.

### Rozbor k rozhodnutí (28. 10. 2026) — fáze 4.1, **nestavěno**

Tahle položka jako jediná v celém plánu **mění vědomé rozhodnutí** a slib
z návodu, takže se nestavěla. Co následuje, je podklad; **jméno nového
pojmu ani to, kde přesně brána leží, nerozhoduju** — to patří Filipovi.

#### Co drží okno pohromadě dnes

`OknoRegaty` nese **tři role naráz**, a teprve když se vypíšou, je vidět,
proč posun brány není jednořádková změna:

| Role | Čím je nesená | Kdo na ní visí |
|---|---|---|
| **brána na data** | `Bezi(kdy)`, `OtevrenoV` | `TrasySprava.ZalozAsync` — mimo okno telefon nenahraje nic |
| **mez uchování** | `TvrdyKonec` = otevření + `TrvaniHodin` | tentýž kód, a je to **slib o soukromí**, ne technická konstanta |
| **identita dne** | `Trasa.OknoId` | každá trasa patří jednomu oknu; `ProLodAsync` proto hledá **jedno** běžící |

**Ta prostřední role je ta, o kterou jde.** Tvrdý konec nevznikl kvůli
výkonu — vznikl kvůli přejímací podmínce č. 5, a `OknoRegaty` to říká
doslova: *„Nechceme sledovat závodníky, jak nám lezou po hospodě a areálu
mariny ve svém volném čase."* Okno otevřené od přihlášek, tedy klidně
týdny předem, ten slib **ruší**, ať se jmenuje jakkoliv.

#### Z toho plyne otázka, která stojí před návrhem

Milošovo *„tam bychom už zapínali trasování"* má dvě možná čtení a každé
vede jinam:

- **„telefony smí nahrávat"** — brána se posune a mez uchování se musí
  pojmenovat znovu, protože ta dnešní je na ni navázaná;
- **„polohy už se ukazují"** — brána zůstane a posune se jen viditelnost,
  což je nastavení trackeru, ne okno.

Je to otázka 2 na konci tohohle nálezu a **pořád nezodpovězená**. Bez ní
se nedá vybrat ani z variant níž.

#### Tři cesty, a co každá stojí

**(a) Druhé, delší okno vedle okna dne.** Brána je nové okno od přihlášek,
mez uchování zůstává u okna dne. *Daň:* `Trasa.OknoId` ukazuje na jedno
okno, takže by se muselo rozhodnout, na které — a `ProLodAsync` vrací
jedno běžící okno, takže by dvě překrývající se znamenala nový výběr.

**(b) Brána mimo okno.** Nahrávání pustí jiný příznak (třeba stav regaty
`Vypsany`), okno zůstane jen mezí uchování a identitou dne. *Daň:* trasa
nahraná před otevřením okna nemá `OknoId` — buď se pole uvolní, nebo
vznikne okno, které se neotevřelo rozpravou. To druhé je přesně to, před
čím varuje poznámka níž.

**(c) Okno se otevírá dřív, ale v jiném režimu.** Jedno okno, dvě fáze:
„sbírá se" a „jede se". *Daň:* tvrdý konec se počítá od otevření, takže
by se musel počítat od něčeho jiného — a režim by musel znát i telefon,
který si okna stahuje dopředu.

#### Co se rozpadne mimo trasy, ať se zvolí cokoliv

**Tabule mluví o okně jako o dni.** `stavDne` staví větu *„Po rozpravě"*
na tom, že okno otevřela rozprava. Jakmile okno přestane rozhodovat
o začátku dne, bude ta věta tvrdit něco o dni, který rozprava neotevřela.
Upozornila na to souběžná session u své větve; **je to důsledek téhle
položky, ne vada tabule** — a znamená to, že se spolu s bránou musí
pojmenovat, co je „začátek závodního dne" pro diváka.

**Zámek nastavení trackeru zůstane na rozpravě** (`NastaveniSprava.Zamkni`),
protože to je význam (2) a ten Miloš posouvat nechce. Po oddělení ale
přestane platit věta z `NastaveniTrackeru.cs`: *„Tracker běží od rozpravy,
takže mezi rozpravou a startem už polohy chodí — a to je přesně okno, ve
kterém by šlo nastavení překlopit podle toho, co je na mapě vidět."*
To okno bude delší, takže **zámek bude zavírat později než dřív**, přesně
proti tomu, proč vznikl. Je to k dořešení spolu s bránou, ne potom.

**Návod s. 8 slibuje opak** (*„Teprve rozpravou začne aplikace brát trasy
z telefonů"*) a je to PDF, které rozhodčí drží v ruce. Změna brány je
tedy i změna návodu.

> **Místo na citát z diskuse:** _(„zapínali trasování" = telefony smí
> nahrávat, nebo že se polohy už ukazují? A komu se ukazují — posádkám, nebo
> jen do systému?)_

> ### ✓ Rozřešeno Filipem 28. 10. 2026 — a podmínky č. 5 se to netýká
>
> > *„myslím že to je opravdu důležité vidět už komunikaci trackeru v den regaty
> > v nějakém okamžiku, kdy řekneme »začni se zobrazovat ve startovní listině«.
> > Tím uvidíme, že je vidíme (nemusíme je sledovat na mapě a ani nemusíme
> > přebírat souřadnice, kde jsou, ale potřebujeme vidět, že jim trakování
> > funguje a stav baterky) a můžeme případně řešit technické problémy. Rozprava
> > je pro všechny a po ní se mastí na molo na lodě."*
>
> **Celý ten spor stál na záměně dvou různých věcí.** Miloš nechtěl **polohy** od
> přihlášek — chtěl vědět, **že tracking jede**. A to jsou dva různé údaje:
>
> | Co | Co to prozradí | Podmínka č. 5 |
> |---|---|---|
> | **poloha** | kde loď (a tedy člověk) je | **týká se** — tohle je „lezení po hospodě" |
> | **že se telefon hlásí + baterie** | že zařízení žije | **netýká se** — o pohybu neříká nic |
>
> **A ta data už existují, mimo okno poloh.** `KlicLodi` nese
> `PosledniPouzitiV` (*„kdy se telefon naposledy ozval"*), `BaterieProcent`
> (*„kolik procent baterie měl telefon, když se naposledy ozval"*) a `Sleduje`.
> Klíč k lodi je vlastní entita, **nezávislá na `OknoRegaty`** — takže se k těmhle
> údajům dá dostat, aniž by se sáhlo na bránu poloh, na tvrdý konec nebo na
> zámek nastavení. **Všechny tři námitky z rozboru tím padají**, protože žádná
> z nich se netýká klíčů, nýbrž okna.
>
> Dnes to vidí jen rozhodčí ve správě (bod 11 návodu: *„X z 22 lodí má spárovaný
> aspoň jeden telefon"*) a tabule to má jako kostičky u lodí. **Chybí tedy jen
> dvě věci**, obě malé: ukázat to **ve startovní listině**, a určit **okamžik,
> odkdy se to zobrazuje**.
>
> **K tomu okamžiku:** Filipova věta *„rozprava je pro všechny a po ní se mastí
> na molo"* ho vlastně pojmenovává — rozprava je poslední chvíle, kdy jsou
> všichni pohromadě a dá se technický problém ještě řešit na břehu. To by
> znamenalo, že **rozprava zůstává tam, kde je**, a nic se neposouvá; jen se od
> ní navíc začne zobrazovat stav telefonů. Potvrdit to má ale Miloš, protože
> „kdy nejpozději se dá ještě spravit vybitý telefon" ví on.
>
> **Co z původního nálezu platí dál:** že rozprava nese tři významy naráz, je
> pravda a stojí za vědomí. Jen se ukázalo, že **R3 nevyžaduje je oddělovat** —
> brána na data může zůstat na rozpravě, protože Miloš nepotřebuje data, nýbrž
> informaci o zařízení.
>
> **A Filip to dotáhl do dvou režimů** (28. 10. 2026): *„můžeme tam udělat klidně
> nějaký trochu jiný režim, který nám bude předávat jen handshake a stav
> baterky"* — a k tomu: *„polohy se mohou fakt zapnout až s mapou."*
>
> | Režim | Co telefon posílá | Odkdy |
> |---|---|---|
> | **hlásím se** | handshake a procenta baterie, **žádné souřadnice** | od rozpravy (k potvrzení Milošem) |
> | **nahrávám** | polohy, jako dnes | **až s mapou**, tedy kolem rozjížďky |
>
> **Tohle je zpřísnění, ne rozvolnění — a to je na tom to nejlepší.** R3 vypadal
> jako požadavek sledovat **dřív**, a skončil u toho, že se bude sledovat
> **míň**: dnes se polohy berou od rozpravy do uzavření dne, tedy klidně
> čtrnáct hodin (`OknoRegaty.VychoziHodin`). Po téhle změně by se braly jen tam,
> kde je k nim důvod. **Přejímací podmínka č. 5 se tím plní lépe než dnes**, ne
> hůř, a tvrdého konce okna se to nedotkne vůbec.
>
> Zároveň to **slučuje R3 s R4**: „polohy až s mapou" je přesně ten okamžik,
> o kterém Miloš mluvil jako o *„10 minut před startem zapnem mapu"*. Jsou to
> tedy dvě strany jedné věci, ne dva nezávislé nálezy — mapa a polohy se zapínají
> spolu, protože bez poloh nemá mapa co kreslit a bez mapy nemají polohy komu
> sloužit.
>
> > **⚠︎ Jenže stav baterie dnes na server nechodí vůbec.** `BaterieProcent` se
> > plní **jedině z dávky bodů trasy** (`TrasySprava.cs:190`: vezme se poslední
> > bod, který baterii nese) — a **appka ji neposílá**: v dávce jsou `sirka`,
> > `delka`, `presnost`, `vyska`, `rychlost`, `kurz` a `casGps`, baterie mezi
> > nimi není a v `app/src/` se o ní nikde nemluví. Takže **bod 11 návodu slibuje
> > přehled, který je zpola prázdný** — počet spárovaných telefonů sedí, procenta
> > jsou `null`.
> >
> > Pro Filipův návrh je to dobrá zpráva v tom, že se nic nerozbíjí: režim
> > „hlásím se" tu hodnotu **přinese poprvé**. Ale znamená to, že se musí doplnit
> > i na straně appky, ne jen vymyslet endpoint — a že dnešní prázdná procenta
> > nejsou vada nového režimu, nýbrž stav, ze kterého se vychází.
>
> ### Nic z toho nesmí posádka zapínat na vodě
>
> Filip, 28. 10. 2026 — a tohle mění tvar celého požadavku:
>
> > *„my potřebujeme ale aby to nemuseli posádky zapínat manuálně na vodě. Zápis
> > v klubovně, pak se mu nastaví a zkontroluje tracking (klidně slepý, ale tak
> > abychom věděli že běží a stav baterie a hlavně pak už na to nemusí posádky
> > sahat). Rozprava udá čas startu a pak už se samo začne trekovat až bude ta
> > chvíle."*
>
> Celý den tedy vypadá takhle, a **posádka klepne naposledy na břehu**:
>
> | Kdy | Kdo | Co |
> |---|---|---|
> | **zápis v klubovně** | pořadatel s posádkou | nastaví tracking a **zkontroluje, že běží** — slepě, jen handshake a baterie |
> | **rozprava** | rozhodčí | **udá čas startu** |
> | **T minus něco** | nikdo | telefon **sám** přepne na nahrávání |
>
> **Z toho plyne jedna věc, která nebyla v žádném z dřívějších nálezů:**
> přepnutí z „hlásím se" na „nahrávám" **nesmí být příkaz ze serveru**. Na vodě
> není signál jistý, a kdyby přepnutí chodilo jako povel, loď bez signálu by
> nezačala nahrávat vůbec. Musí to tedy být **stažený čas, podle kterého se
> telefon řídí sám** — a ten vzorec projekt má: `OknaEndpoints.ProTelefonAsync`
> *„telefon si je stáhne dopředu a řídí se jimi i bez signálu; změna od
> pořadatele se projeví, až signál chytí."*
>
> **A ten čas už jde zapsat** — je to `StartV` na plánované rozjížďce, kterou
> odemkla fáze 1.1 (K6). Takže řetěz je celý: *rozprava zapíše plánovaný start →
> telefon si ho stáhne → v T−něco si sám zapne nahrávání*, bez serveru, bez
> signálu a bez posádky. Tři nálezy, které vypadaly samostatně (**K6** plánovaný
> start, **R3** trasování, **R4** mapa před startem), jsou tím jeden mechanismus.
>
> **A kontrola „hlásí se celé pole?" se tím stěhuje z vody do klubovny** — což je
> jediné místo, kde se vybitý nebo nespárovaný telefon dá ještě spravit. Bod 11
> návodu tu otázku dnes klade rozhodčímu na vodě, kde už s odpovědí nic nenadělá.
>
> **Když se loď v T−něco nerozhlásí** (Filip: *„pak budeme vymýšlet nějaké
> propíchnutí"*), je dobré vědět, že **mechanismus na to od 28. 10. existuje** —
> fáze 4.3 přinesla `Pobidka` a `Odeslani.Spesne`, tedy způsob, jak telefonu
> poslat zprávu bez čekání na minutový takt, na odběr regaty.
>
> **Pokryje ale jen jeden ze tří důvodů, proč loď mlčí**, a to je potřeba říct
> rovnou:
>
> | Proč mlčí | Pomůže propíchnutí? |
> |---|---|
> | **appka se uspala** (Android doze), signál má | **ano** — tohle je přesně ten případ, kvůli kterému push existuje |
> | **nemá signál** | ne — push nedorazí ze stejného důvodu, z jakého nedorazila poloha |
> | **vybitý nebo vypnutý telefon** | ne, a je to nejčastější |
>
> Takže propíchnutí stojí za to postavit, ale **nenahrazuje tu kontrolu
> v klubovně** — naopak ji dělá důležitější, protože dva ze tří případů jde
> ošetřit jedině na břehu. A u třetího, vybité baterie, je jediné technické
> opatření **vidět procenta předem**, což je zrovna ta hodnota, která dnes na
> server nechodí (viz past výš).
>
> *Jedna věc k tomu zbývá nedořešená, a není to rozhodnutí: aby šlo poznat, že se
> loď „nerozhlásila", musí být **známo, že měla** — tedy seznam lodí, které jsou
> ve startovní listině a nehlásí se. To je tentýž přehled, co má vzniknout podle
> rozřešení výš; propíchnutí je jen tlačítko u jeho řádků.*

### R4 — Mapa 10 minut před startem. Dnes naskočí až výstřelem

*Původ: střípek 1. Doloženo: `Features/Polohy/PolohySprava.cs:144` a `:435`.
Stav: **zapsáno**.*

Rozhodčí: *„Rozprava — tam bude ujasněn předpoklad startu a **10 minut před
startem zapnem mapu**."*

Aplikace **pojem startovní procedury zná**, ale jen zpětně a s jiným číslem:

```csharp
/// O kolik začíná veřejný přenos dřív než rozjížďka. Startovní
/// procedura je pět minut a patří do okna — je z ní takticky vidět
/// víc než z celého zbytku rozjížďky.
public static readonly TimeSpan Procedura = TimeSpan.FromMinutes(5);
```

Jenže to okno se otevře **až poté, co rozjížďka odstartovala**. Veřejný výdej
poloh hledá běžící rozjížďku:

```csharp
.Where(r => r.ZavodId == zavodId && r.Stav == StavRozjizdky.Probiha)
```

a teprve když ji najde, dotáhne zpětně `StartV − 5 minut`. **Živě tedy před
startem mapa neběží vůbec** — ani pět minut, natož deset. Ty poslední minuty
se objeví retrospektivně, až když už se jede.

Dvě věci navíc:

- **Pět minut je v kódu natvrdo.** ZPJ 26 má u vyzývacího znamení hvězdičku:
  *„5\* … nebo tak, jak je stanoveno ve vypsání závodu nebo v plachetních
  směrnicích"*. I podle pravidel je to tedy **parametr směrnic**, ne konstanta.
  Rozhodčí řekl 10. Nikdo nemá pravdu ani nepravdu — jen to má být nastavitelné
  a dnes není.
- **„Předpoklad startu" nemá kam zapsat.** Viz K6.

### R5 — Startovní procedura podle pravidla 26 v aplikaci není

*Původ: střípek 1, a je to **odpověď na otázku 1 z návodu**. Doloženo:
`VysledkyEndpoints.cs:14`, `ZapisSprava.cs:454–482`, ZPJ 26–30. Stav:
**zčásti hotovo 28. 10. 2026** (fáze 3.1, viz konec nálezu) — procedura,
odložení, odvolání a záznam opakování; vlajky a jejich meze ne.*

Rozhodčí vyjmenoval: *„5 minut výzva · 4 minuty Přípravné znamení · 1 minuta do
startu · Start"*. To je doslova **ZPJ 26**:

| Minuty před startem | Vizuální znamení | Význam |
|---|---|---|
| 5\* | vlajka třídy | vyzývací znamení |
| 4 | P / I / Z / Z+I / U / černá | přípravné znamení |
| 1 | přípravná vlajka spuštěna | jedna minuta |
| 0 | vlajka třídy spuštěna | **startovní znamení** |

Aplikace zná z téhle tabulky **jediný řádek — ten poslední**:

```csharp
public record StartVstup(DateTimeOffset? StartV = null);
```

Zapisuje ho pořadatel na cílové obrazovce a zápis rozjížďku rovnou rozjede
(`ZapisSprava.StartAsync`: `if (rozjizdka.Stav != StavRozjizdky.Zrusena)
rozjizdka.Stav = StavRozjizdky.Probiha;`).

**Návod se na tohle ptá přímo** (s. 14 a otázka 1 na s. 23): *„Chceš mít
startovní proceduru jako vlastní nástroj — odpočet, signály, odložený start,
odvolání startu? A má ji mít v ruce rozhodčí, nebo pořadatel?"* Rozhodčí
odpověděl výčtem procedury. **Tím je otázka 1 zodpovězená v tom, co to má
být — a zůstala otevřená v tom, kdo to drží.**

**Co na proceduře visí a dnes nemá kde být.** Tohle je jádro celé oponentury:
bez procedury není kam zapsat ani jeden z úkonů, které pravidla ukládají
závodní komisi kolem startu.

| ZPJ | Úkon | Má to v aplikaci místo? |
|---|---|---|
| 27.3 | **odložení** startu (AP), **zrušení** před startem (N) | ne |
| 29.1 | **individuální odvolání** (vlajka X) | ne — a jeho následek OCS ano, viz K1 |
| 29.2 | **všeobecné odvolání** (první opakovač) | ne |
| 30.1–30.4 | startovní tresty podle vyvěšené vlajky (I, Z, U, černá) | ne — kódy ZFP/UFD/BFD chybí, viz K1 |
| 36 | rozjížďka **znovu startovaná** | částečně: nový start přepíše `StartV` a vynuluje `KonecV`, ale že šlo o opakování, se nikam nezapíše |

Zvlášť stojí za pozornost dvojice **29.1 → OCS**: aplikace umí zapsat
**následek** (kód OCS existuje), ale ne **úkon**, kterým ten následek vzniká.
Rozhodčí tedy zapíše OCS, aniž by kde stálo, že bylo vyvěšeno X — a vlajka X
má podle 29.1 tvrdou lhůtu (*„ne déle než 4 minuty po startovním znamení"*),
kterou by aplikace uměla hlídat jediná.

### Hotovo 28. 10. 2026 — čas a paměť (fáze 3.1)

**Role aplikace je ta, kterou pojmenoval R15:** *„drží čas a paměť, znamení
dává člověk"*. Vizuální znamení pro pole z obrazovky nebude, takže se
nestavělo; co šlo postavit, je místo, kam se zapíše, co se stalo.

| ZPJ | Úkon | Dnes |
|---|---|---|
| 26 | spuštění procedury jedním tlačítkem | **ano** — `POST …/rozjizdky/{cislo}/procedura` s `Spustit`; start padne za tolik minut, kolik má regata |
| 27.3 | **odložení** před startem | **ano** — `Odlozit`, a **nový čas zůstane volný**, jak pravidlo žádá |
| 29.2 | **všeobecné odvolání** po startu | **ano** — `Odvolat`, nový start spočítá pravidlo: minuta po opakovači plus celá procedura |
| 36 | rozjížďka **znovu startovaná** | **ano** — `Rozjizdka.OpakovanychStartu`, a na cílové obrazovce štítek *„2× odvolaný start"* |
| 29.1 | individuální odvolání (X) a jeho lhůta | **ne** — zůstává jen následek, kód OCS |
| 30.1–30.4 | startovní tresty podle vlajky | **kódy ano** (fáze 3.3), vlajka a její paměť ne |

**Tři rozhodnutí, která si zaslouží být dohledatelná:**

1. **Jedna cesta pro tři úkony**, na rozdíl od `/start` a `/konec`. Patří
   k sobě pravidlově a hlavně se mezi nimi **vybírá podle toho, co se
   právě stalo** — tři samostatné cesty by vypadaly jako tři nezávislé
   možnosti, a to je přesně ten omyl, kterému se tu brání.
2. **Čas se neposílá z klienta.** Spuštění i odvolání si ho počítají
   z pravidla a z délky procedury regaty; poslat vlastní čas by u odvolání
   znamenalo obejít ZPJ 29.2, kde ten čas závazný je.
3. **Délka procedury je parametr regaty** (`Zavod.DelkaProceduryMin`,
   výchozí 5), protože pětka v pravidle 26 má hvězdičku. Do té doby byla
   zadrátovaná na **dvou místech naráz** — `PolohySprava.Procedura` a
   `PROCEDURA_S` na tabuli — a obě se teď berou z regaty. Tiskne se i do
   vypsání závodu (R8), protože je to odchylka, kterou si závod volí.

**Co se vědomě nestavělo:** velká obrazovka startéra s odpočtem v ruce.
To je ergonomie, a R12 ji sám posílá do `docs/SCENARE-OVLADANI.md` —
*„nejtvrdší ergonomické zadání, jaké projekt zatím dostal"*. Tlačítka
sedí na cílové obrazovce, kterou startér stejně drží.

*Změřeno proti mocku (28. 10. 2026):* spuštění v 00:39:55 → plánovaný start
**00:44:55** a rozjížďka zůstala `Planovana`; odložení → **čas se smazal**;
odvolání plánované rozjížďky → odmítnuto větou *„ještě nestartovala … před
startem se odkládá"*; po skutečném startu odvolání → nový start
**00:45:55**, tedy minuta plus pět, a počítadlo opakování na jedničce.
Totéž projeté obrazovkou: *„Plánovaný start · za 0:04:57"*, po odvolání
*„za 0:05:57"*.

### R6 — Startovní listina na tabuli, editovatelná za běhu

*Původ: střípek 1. Doloženo: `docs/TABULE-DIVAK.md`, `NAVOD-ROZHODCI.pdf`
s. 18. **Nedoloženo v kódu** — neověřoval jsem, odkud tabule listinu bere.
Stav: **zapsáno, k ověření**.*

Rozhodčí: *„Jakmile je rozprava, zapínáme telku se startovní listinou,
s možností editace ze strany správy."*

Dvě poloviny, a každá je jinde:

- **„Jakmile je rozprava, zapínáme telku"** — dnes se tabule nezapíná vůbec,
  je pořád dostupná na vlastní adrese a **přepíná se sama podle toho, kde je
  den** (návod s. 18: *„Nejsou to čtyři obrazovky k přepínání, je to jedna,
  která ví, co se zrovna děje"*). Startovní listinu ukazuje ve fázi „než se
  jelo". To nejspíš sedí — ale **otázka, co tabuli zapne**, dnes odpověď nemá,
  protože se nezapíná.
- **„s možností editace ze strany správy"** — kdo je *správa*? Startovní
  listina je výpis přihlášek a ty vede pořadatel
  (`Prihlasky.ProcNejdePrepnout`: *„Přihlášky vede pořadatel. Rozhodčí jen
  vylučuje."*). Jestli rozhodčí myslí, že má jít do listiny sáhnout **na
  rozpravě a z tabule**, je to nový požadavek na práva.

> **Místo na citát z diskuse:** _(co se na listině po rozpravě ještě mění —
> přibyla loď, odhlásila se, změnila třídu? A kdo to klepne?)_

### R7 — Hierarchie pramenů: rozhodčí má pravdu, a plyne z toho, kde smí žít vlastní pravidlo poháru

*Původ: střípek 3. Doloženo: definice **Pravidlo** v ZPJ, ZPJ 88.1 a 88.2,
Národní předpisy ČSJ k pravidlu 88, `Features/Zavody/Zavod.cs:317`
(`Ucast`), `docs/PLAN.md:5469–5472`. Stav: **zapsáno**.*

**Potvrzeno, a text to říká doslova.** Definice *Pravidlo* v ZPJ vypisuje
prameny v pořadí:

> (a) Pravidla v této knize, včetně Definic, Znamení závodu, Úvodu, preambulí
> a pravidel příslušných dodatků …
> (b) World Sailing Směrnice, kterým World Sailing určil status pravidla …
> **(c) předpisy národního svazu**, pokud nejsou změněny vypsáním závodu nebo
> plachetními směrnicemi v souladu s předpisy národního svazu … podle pravidla
> 88.2;
> (d) pravidla tříd; **(e) vypsání závodu; (f) plachetní směrnice;**
> (g) jakékoli další dokumenty, které řídí závod.

Kniha ZPJ je (a), předpisy ČSJ (c). **Rozhodčí má pravdu** — a je to pořadí
v textu, ne výklad.

**Jedna nuance navíc, kterou v té větě nejspíš nemá na mysli.** Základní ZPJ
88.2 dovoluje, aby *„vypsání závodu nebo plachetní směrnice … předpis
změnily"*. ČSJ si to ale u sebe zakázal:

> *„Nahraď pravidlo ZPJ 88.2 následujícím: Vypsání závodu ani plachetní
> směrnice nemohou předpis změnit bez předchozího schválení Českým svazem
> jachtingu."* (Národní předpisy ČSJ, ZPJ 88)

Pro rozhodčího Orlického poháru je tedy vrstva (c) **tvrdá**: směrnicí ji
obejít nemůže, na rozdíl od toho, co by samotné ZPJ dovolilo. „Nadřazené"
tu neznamená „můžu je ignorovat" — znamená „ČSJ smí doplňovat jen tam, kde ho
ZPJ zmocňuje, a to doplnění pak platí napevno".

**Proč je tenhle střípek důležitější, než vypadá.** Teprve hierarchie
odpovídá na otázku, kterou projekt otevřel už 22. 9. 2026 a nechal viset:

> **Diskvalifikace v regatě 20 bodů** … Miloš k tomu: tresty dávají ZPJ,
> **body si „nějak vymyslel" a může to být špatně.** Filip: varianty si
> necháme navrhnout později. Do té doby platí 20.
> — `docs/PLAN.md:5469`

Dvacet bodů za diskvalifikaci v seriálu je odchylka od ZPJ A5.2 (kde má DSQ
„přihlášených + 1"). Podle hierarchie **to není automaticky špatně** — pohár
jako série závodů v rámci ZPJ vůbec nestojí a vlastní bodování seriálu je
legitimní. Ale smí žít jen v (e) nebo (f): **ve vypsání závodu, nebo
v plachetních směrnicích.** Nikde jinde.

A tím tenhle střípek **potvrzuje R1 a dává mu novou váhu**: vypsání závodu
není jen chybějící dokument, je to jediné místo, kde smí být napsané vlastní
pravidlo poháru. Dnes žije v konstantě `PravidlaBodovani` a v `PLAN.md` —
tedy ve vrstvě (g) v nejlepším případě, a spíš nikde.

**Druhý dopad: co z předpisů ČSJ aplikace nezná.**

> ### ✗ Tahle část nálezu PADLA — střípek 5. Text zůstává schválně.
>
> **Pořadatel poháru není členský klub podle ZPJ 89.1, a je to záměr** („nejsme
> ofiko ve smyslu pořadatelství kvůli pojistkám"). Podle ZPJ 88.1 se platnost
> předpisů národního svazu řídí právě členstvím pořadatele, takže **předpisy
> ČSJ pro pohár neplatí** a licence ani pojištění v přihlášce nechybí —
> **nepatří tam**. Otázka 0 je tím zavřená.
>
> Mezikrok za zaznamenání: po střípku 4 („není v ČTL") jsem nález neškrtl,
> protože ČTL je termínová listina, ne členství, a na členství pořadatele
> neodpovídá. To byl správný krok — odpověď přišla až střípkem 5 a je to
> odpověď na jinou otázku, než jakou ČTL řeší.

**A druhá věc, kterou jsem v původním znění tvrdil špatně.** Stálo tu, že
o licenci ani pojištění aplikace neví *„ani jednu"*, a doložil jsem to tím, že
hledání `licenc|pojist` nevrací nic o jachtingu. **To hledání měřilo samo
sebe.** Pole na členské číslo ČSJ v aplikaci je — jmenuje se `CisloCsj`:

```csharp
// Lode/Lod.cs — na osobě
public string? CisloCsj { get; set; }
// VerejnaPrihlaska.cs:79 — a validuje se
if (v.Kapitan.CisloCsj?.Trim().Length > 20) return "Číslo člena ČSJ má nejvýš 20 znaků.";
// PrihlaskySprava.cs:354 — a ukládá
osoba.CisloCsj ??= Prazdne(vstup.CisloCsj);
```

Je to přesně ta chyba, před kterou varuje zadání téhle oponentury: **grep na
slovo, které jsem si vymyslel, místo na věc.** Pole se nejmenuje „licence",
tak ho hledání minulo, a já z prázdného výsledku usoudil na prázdnou databázi.

Jak to tedy je, po opravě a po střípku 5: **API číslo ČSJ přijímá, validuje
a ukládá — a žádný formulář na webu ho nenabízí** (`web/app/serie`,
`web/app/sprava` ani `web/lib` slovo ČSJ neobsahují). Dostane se do něj jen
import nebo přímé volání API. Není to vada, kterou by bylo potřeba opravit —
po střípku 5 je to **sloupec, který pohár nepotřebuje**, pozůstatek doby, kdy
se počítalo s oficiálním závodem. Stojí za zmínku jen proto, aby ho někdo za
rok nezačal plnit s pocitem, že musí.

Pro úplnost, co předpisy ČSJ žádají a co se poháru **netýká**: závodní licenci
ČSJ (preambule k ZPJ Části 6) a pojištění odpovědnosti min. 9 000 000 Kč na
zdraví a 2 000 000 Kč na věci (doplněk k ZPJ 65.4).

### R8 — Když pohár není pod svazem, drží celou stavbu vypsání závodu — a to chybí

*Původ: střípek 4, navazuje na R7. Doloženo: ZPJ 4.1(a), 89.2(a), **Dodatek
J1**, `Features/Zavody/Zavod.cs:219–309` (`Zavod`), `Features/Bodovani/
PravidlaBodovani.cs`, `docs/PLAN.md:5455–5478`. Stav: **hotovo
28. 10. 2026** (fáze 2.1, viz konec nálezu) — dokument se generuje z týchž
čísel, podle kterých se počítá.*

Střípek 4 obrátil východisko. Dosud jsem počítal s tím, že ZPJ platí a pohár se
od nich ve vypsání odchyluje. **Je to naopak:** pohár není oficiální závod ČSJ,
takže ZPJ neplatí z titulu členství — platí jen proto, že si je závod vezme.
Pravidlo 4.1(a) to říká podmínkou:

> *„Každý závodník a majitel lodě tím, že se účastní … závodu, **který se řídí
> podle těchto pravidel**, souhlasí s přijetím těchto pravidel."*

A kde se to „řídí podle těchto pravidel" prohlašuje, určuje ZPJ 89.2(a) spolu
s Dodatkem J1 — **vypsání závodu**, a je to jeho **první povinná položka hned
po jménu a datu**:

> **J1.1(2)** *„že závod bude řízen podle pravidel, jak je definováno
> v Závodních pravidlech jachtingu"*

**Tím se celý řez obrací a zjednodušuje.** Aplikace nebodovala „podle závazných
pravidel, od kterých se někde odchyluje". Bodovala podle pravidel, která
rozhodčí v září potvrdil ústně a která **nemají v žádném dokumentu oporu** —
protože dokument, do kterého patří, v aplikaci není (R1).

Dobrá zpráva v tom je, že **20 bodů za diskvalifikaci není chyba.** Pohár si
vlastní bodování zvolit smí a J1.3(5) pro to má vlastní řádek
(*„bodovací systém, je-li odlišný od systému v Dodatku A … uvedený v celém
znění"*). Jen to musí být napsané tam, a ne v konstantě.

**Co J1 žádá × co aplikace má.** Tahle tabulka je podle mě nejpoužitelnější
věc, co z celé oponentury vyšla — je to vlastně **rovnou osnova toho
chybějícího dokumentu**, a víc než půlka jeho obsahu už v databázi leží:

| J1 | Co musí být ve vypsání | Má to aplikace? |
|---|---|---|
| 1.1(1) | název, místo, datum, jméno pořadatele | **ano** — `Zavod.Nazev`, `Datum`, `DatumKonce`, `Poradatel` |
| 1.1(2) | **že se závod řídí podle ZPJ** | **ano od 28. 10. 2026** — `Vypsani.PodleZpj`, věta, kvůli které pravidla vůbec platí |
| 1.1(3) | seznam dalších dokumentů, které závod řídí, a kde je vzít | **ano od 28. 10. 2026** — plachetní směrnice a kde visí |
| 1.1(4) | závodící třídy, handicap, podmínky a omezení přihlášení | **zpola** — kategorie ano (do 7 m / nad 7 m / Race), podmínky ne |
| 1.1(5) | postupy a časy přihlášení, **poplatky, termín uzávěrky** | **ano od 28. 10. 2026** — `Zavod.UzaverkaPrihlasek` a `Zavod.Startovne` (text, protože startovné bývá předpis a aplikace z něj nic nepočítá) |
| 1.1(6) | **časy vyzývacích znamení** první a dalších rozjížděk | **zpola od 28. 10. 2026** — `Zavod.PrvniVyzyvaciZnameni` (T−5, ne čas startu); časy dalších rozjížděk se setnou na rozpravě (K6) a dokument to říká |
| 1.3(4) | obecný popis dráhy nebo typů drah | **zpola** — trať se staví až v den závodu, dopředu o ní není nic |
| 1.3(5) | **bodovací systém, je-li odlišný od Dodatku A** | **ano od 28. 10. 2026** — tiskne se z `PocetSkrtu`, `KoeficientDoSerie`, `PosunDoSerie`, `Vyhodnoceni` a `PravidlaBodovani`, tedy z týchž čísel, podle kterých se počítá |
| 1.3(7) | čas, po kterém se poslední den už nestartuje | **ne** |
| 1.2(6) | že platí 90.3(e), a případná změna lhůty 24 hodin | **ne** |
| 1.3(8) | odepření práva na odvolání podle 70.3 | **ne**, a viz pozn. |

*Pozn. k 1.3(8) a odvolání:* napřed jsem sem napsal, že odvolání k národnímu
svazu (ZPJ 70, Dodatek R) nemá u poháru kam jít. **Pravidlo 70.1 to takhle
neříká** — zní *„Strana projednávání má právo odvolat se k národnímu svazu"*
a případy nepřípustnosti v 70.3 na tenhle nemíří. Ta úvaha stojí až na řetězu
88.1 → 89.1: svaz, ke kterému se odvolává, je svaz pořadatele, takže
**visí na téže nezodpovězené otázce 0 jako licence**. Pro nález K2 z toho dnes
neplyne nic.

**Dvě věci z toho plynou pro aplikaci, a ani jedna není „postavit editor".**

1. **Vypsání nemusí být psané od nuly.** Osm z jedenácti řádků výš jsou údaje,
   které už v databázi leží nebo by do `Zavod` přibyly jako dvě tři kolonky
   (uzávěrka, startovné, čas vyzývacího znamení). Dokument se z nich dá
   **vygenerovat** — a to je přesně to, co rozhodčí chce od směrnic opačným
   směrem (R2: *„pokud bychom měli editor směrnic, tak bychom mohli urychlit
   předem i vydání samotného dokumentu"*).
2. **Bodovací pravidla poháru se mají tisknout z týchž čísel, podle kterých se
   počítá.** Dnes jsou v `Zavod` a v `PravidlaBodovani`, a text o nich je
   v `PLAN.md`. Kdyby se vypsání generovalo z nich, nemohlo by se s výpočtem
   rozejít — což je jediná vada, která by se u takového dokumentu opravdu
   stala.

> **Místo na citát z diskuse:** _(vydáváš dnes vypsání poháru jako jeden
> dokument na ročník, nebo zvlášť na každou regatu? A co v něm o bodování
> stojí?)_

### Hotovo 28. 10. 2026 (fáze 2.1)

**Obě věci z tohohle nálezu jsou udělané tak, jak je nález popsal.**

**Vypsání se nepíše, generuje.** `Vypsani.Sestav` je čistá funkce bez
databáze — dokument se dá vyrobit a zkontrolovat bez Dockeru, stejně jako
`Workflow`, `Prava` nebo `Kalendar`, a drží ho čtrnáct testů
(`VypsaniTests`). Do `Zavod` přibyly tři kolonky: `UzaverkaPrihlasek`,
`Startovne` a `PrvniVyzyvaciZnameni`, všechny nepovinné.

**Bodování se tiskne z týchž čísel, podle kterých se počítá.** Dvacet bodů
za diskvalifikaci, přirážky, škrty regaty i ročníku, koeficient a bonus —
všechno z `Zavod` a `PravidlaBodovani.Podle(verze)`, nic opsaného. Test
`Bodovani_se_tiskne_z_tychz_cisel_podle_kterych_se_pocita` sahá přímo na
konstanty z `PravidlaBodovani.V1`, takže změna pravidel shodí test, ne až
rozpor mezi listinou a dokumentem. **To byla jediná vada, která by se
u takového dokumentu opravdu stala.**

Dvě drobnosti, které z psaní vyplynuly:

- **Čeština se skloňuje i v generovaném textu.** *„škrtá se jedna nejhorší
  rozjížďka"* × *„škrtají 2 nejhorší rozjížďky"* × *„škrtá 5 nejhorších
  rozjížděk"* — v dokumentu, který vydává pořadatel, je špatný tvar vidět
  na první pohled. Má to vlastní test.
- **Datum i čas se formátují nezávisle na kultuře stroje**, a čas v pražské
  zóně, ne v zóně serveru: *„9:55, 20. června 2026"*. Tatáž úvaha jako
  u tabule — regata se jede na Orlíku a „9:55" musí znamenat devět padesát
  pět tam.

**Startovné je text, ne číslo**, a je to rozhodnutí: bývá to předpis
(*„300 Kč za loď, 100 Kč každý člen posádky"*), ne jedna částka, a aplikace
z něj nic nepočítá — `Ucast.Zaplaceno` je evidence platby, ne její výpočet.
Číslo by předstíralo přesnost, kterou nikde nevyužije.

*Změřeno proti mocku (28. 10. 2026):* regata `izolepa` s vyplněnou
uzávěrkou, startovným a vyzývacím znamením → dokument má jedenáct bodů,
čtyři z nich přiznaně prázdné (dráha, konec startů, lhůta 90.3(e),
odvolání), a stránka je vypisuje nahoře jako *„Vypsání zatím není úplné"*.
Taby se na 1280 px vejdou na řádek, na 375 px jsou akordeon.

### R9 — „Vlastní nebezpečí" a souhlas s pravidly: jediná vazba, kterou pohár má, se nesbírá a neukládá

*Původ: střípek 5. Doloženo: `Features/Zavody/VerejnaPrihlaska.cs:16`, `:29`,
`:87`, `web/app/serie/[slug]/zavody/[zavod]/prihlaska/page.tsx:278–283`,
ZPJ 4.1(a), 4.3, J1.2(12). Stav: **hotovo 28. 10. 2026** (fáze 2.2, viz
konec nálezu) — znění i záznam. Byl to podle mě nejvážnější nález dokumentu.*

Miloš: *„Jede se to na vlastní nebezpečí."* A protože pohár **není oficiální
pořadatel** (střípek 5), je tahle věta spolu se souhlasem s pravidly **jediná
vazba mezi závodníkem a tím, podle čeho se jede.** U závodu pod svazem je
závodník vázán členstvím a licencí; tady není vázán ničím než tím, co odklikl
při přihlášení.

ZPJ s tím počítají a J1.2(12) říká i jak:

> *„přihlašovací formulář, který má podepsat vlastník lodě nebo zástupce
> vlastníka, který obsahuje sousloví jako například **„Souhlasím s tím, že budu
> vázán Závodními pravidly jachtingu a všemi dalšími pravidly, které řídí tento
> závod"**."*

**Co přihláška doopravdy sbírá.** Souhlas ve formuláři je, je povinný a server
ho vynucuje — jenže je **o něčem jiném**:

```tsx
<input name="souhlas" type="checkbox" required … />
<span>
  Loď smí být ve startovní listině a pořadatel se mi může ozvat na uvedený kontakt.
  <Link href="/osobni-udaje">Co se s údaji děje</Link>.
</span>
```

Je to souhlas se **zveřejněním a kontaktováním**, tedy věc osobních údajů.
O pravidlech ani o vlastním nebezpečí v něm **není ani slovo**, a serverová
hláška to potvrzuje: *„Potvrď, že loď smí být ve startovní listině a že se
pořadatel může ozvat."*

**Kód si přitom o sobě myslí, že souhlas s pravidly sbírá.** V dokumentaci toho
parametru stojí:

```csharp
/// <param name="Souhlas">Kapitán potvrdil pravidla a zveřejnění lodi ve startovní listině.</param>
```

„Potvrdil **pravidla** a zveřejnění". Obrazovka ale pravidla nezmiňuje. Je to
rozpor **uvnitř aplikace** — ne mezi aplikací a pravidly — a je to ten druh
rozporu, kvůli kterému se na chybějící věc nepřijde: kdo čte kód, vidí, že
souhlas s pravidly se sbírá.

**Druhá polovina: i kdyby to znění bylo správné, nezůstane po něm nic.**
`Souhlas` se ve `VerejnaPrihlaska.ProcNejde` zkontroluje a tím končí. Není
sloupec na `Ucast` ani na `Prihlaska`, žádná migrace ho nezakládá, žádné
`osoba.Souhlas =` nikde není. **Je to branka ve formuláři, ne záznam.**

U poháru, kde je souhlas jediná vazba na pravidla, by u něj měl zůstat doklad —
kdy byl dán, kým, a **jaké znění tehdy platilo**. Aplikace to umí jinde a dělá
to dobře: směrnice se nemažou, jen stahují, bóje se sbírá z vody a záznam
zůstává, změna nastavení trackeru se zapíše s důvodem *„je to doklad pro spor"*.
Tady ta úvaha chybí, a přitom je to místo, kde doklad potřebuje víc než
kdekoliv jinde.

**Třetí věc, bez které je to celé jedno:** veřejný formulář je jen jedna cesta,
jak se loď dostane na zastávku. Pořadatel ji může zapsat sám a import jich
naveze stovky — a **ani jedna z těch cest se na souhlas neptá**, protože
`Souhlas` žije jen ve `VerejnaPrihlaskaVstup`. Kolik lodí přijde kterou cestou,
nevím a neměřil jsem to; je to ale otázka, která rozhoduje, jestli se souhlas
nesbírá od části pole, nebo skoro od nikoho.

**Co s tím — a není to velká práce.** Tohle je ze všech nálezů nejlevnější na
opravu a nejdražší na opomenutí: rozšířit znění souhlasu o pravidla a vlastní
nebezpečí, uložit k přihlášce příznak s časem a verzí znění, a mít na to jednu
stránku, na kterou souhlas odkazuje (`/osobni-udaje` už existuje, takže vzor
pro to v projektu je). Smysl to ale dává teprve spolu s R8 — souhlas má
odkazovat na vypsání závodu, a to je ten dokument, který chybí.

*Mez: nejsem právník a netvrdím, co je nebo není právně platné. Tvrdím jen
tohle a nic víc: pravidla pro ten souhlas mají vlastní bod (J1.2(12)), Miloš
řekl, že se jede na vlastní nebezpečí, obrazovka sbírá souhlas se zveřejněním
a kontaktem, a nic z toho se neukládá. Jestli to stačí nebo ne, patří někomu
jinému než mně.*

> **Místo na citát z diskuse:** _(co dnes účastník podepisuje — je někde papír,
> nebo se spoléhá na to, že se ví? A kdo je u poháru „pořadatel", když ne klub?)_

### Hotovo 28. 10. 2026 (fáze 2.2)

Všechny tři části nálezu, tedy znění, záznam i ostatní cesty.

**Znění je o tom, o čem má být.** `Features/Zavody/Souhlas.cs`, verze 1:
*„Souhlasím s tím, že budu vázán Závodními pravidly jachtingu a všemi
dalšími pravidly, která řídí tento závod, a že se závodu účastním na
vlastní nebezpečí. Beru na vědomí, že loď bude ve startovní listině a že se
pořadatel může ozvat na uvedený kontakt."* Pokrývá tedy pravidla (J1.2(12)
na ně má jmenovitě sousloví), vlastní nebezpečí (Milošovo *„jede se to na
vlastní nebezpečí"*) i to jediné, na co se formulář ptal dřív. Zaškrtávátko
odkazuje **na vypsání závodu** té regaty — a to už existuje (R1), takže
souhlas má na co odkazovat.

**Znění se verzuje a starší se nemění**, stejně jako `PravidlaBodovani`:
k přihlášce se ukládá `Ucast.SouhlasV` (kdy) a `Ucast.SouhlasVerze` (s čím).
*„Souhlasil"* bez toho, s čím souhlasil, nedokládá nic.

**Ptají se na něj všechny tři cesty, každá po svém:**

| Cesta | Jak | Proč tak |
|---|---|---|
| veřejný formulář | **povinný**, bez něj přihláška neprojde | souhlas dává kapitán sám |
| pořadatel zapisuje loď | zaškrtávátko *„Kapitán mi potvrdil…"*, **nepovinné** | pořadatel ho zaznamenává za kapitána; loď domluvená telefonem na startu se musí dát zapsat i tak |
| import ročníku | volitelné pole `souhlas` (čas) na účasti | sešit rozhodčího souhlasy nevede, takže navezené lodě ho skoro všechny nemají — a to je pravda, ne chybějící údaj |

**Souhlas se jen přidává, nikdy nemaže.** Odškrtnutí políčka ani opakované
nahrání ročníku doklad nesmažou — stejně jako se nemaže vyvěšená směrnice,
jen se stáhne.

**A je vidět, které lodě ho nemají.** Na obrazovce přihlášek stojí
*„Bez souhlasu s pravidly: 22 z 23 — …"* a u lodi *„nezaznamenaný"*. Tohle
do nálezu dopsala peer session: nevynucovat souhlas u pořadatelské cesty
znamená, že loď zapsaná pořadatelem nemá žádnou vazbu na pravidla, a
rozhodčí by to měl umět zjistit na jednom místě. Je to **tatáž otázka jako
u telefonů v bodu 11 návodu** (*„hlásí se celé pole?"*), jen o patro níž, a
sedí na ni tentýž vzorec: vypsat dole ty, u kterých něco chybí.

*Změřeno proti mocku (28. 10. 2026):* přihláška z veřejného formuláře →
`souhlasV` uložené s časem; loď zapsaná pořadatelem se zaškrtnutým
souhlasem → uložené taky, **a to i když se server cestou zeptal na pozdní
přihlášku do vyhlášené regaty**. Ta otázka byla skutečná díra: potvrzovací
formulář zadání posílá znovu a souhlas v něm nebyl, takže by padl pod stůl
pokaždé, když se server zeptá. Našlo se to až průchodem obrazovkou, ne
čtením kódu.

*Mez zůstává, jak ji nález napsal:* jestli takový souhlas něco právně
znamená, tenhle kód neřeší a tvrdit to nemůže. Řeší jen to, že znění
odpovídá tomu, co se po něm chce, a že po něm zůstane doklad.

### Doplněno týž den — sledování, a verze 2 (28. 10. 2026)

Filip se při ověřování fáze 2 nad souhlasem zarazil: *„souhlas závodníka
se sledovanim"*. **Měl pravdu a chybělo to.** Verze 1 nesla pravidla,
vlastní nebezpečí a zveřejnění lodi — o trasování v ní nebylo ani slovo,
přestože appka nahrává polohu každých pět vteřin a `NastaveniTrackeru`
rozhoduje, kdo ji uvidí. Souvisí to s nálezy **N3 a N5**
v `docs/OPONENTURA-TRACKING.md` (*„Kdo odjíždí, vypnout si to nemůže"*
a *„Nastavení, které nikdo nečte"*).

**Nová je jedna věta**, a je to text v **témže zaškrtávátku** — druhé
zaškrtávátko by bylo klepnutí navíc bez užitku (rozhodl Filip):

> Beru na vědomí, že poloha lodi se během závodního dne zaznamenává, že ji
> vidí pořadatel a rozhodčí, a že podle nastavení regaty může být vidět
> i ostatním lodím, na webu a na tabuli.

**`Verze` jde z 1 na 2 a znění verze 1 zůstává v kódu** (`Souhlas.ZneniV1`
vedle `ZneniV2`, `Podle(verze)` zná obě). Verzuje se právě proto, aby šlo
dohledat, s čím kdo souhlasil; přepsat starý text novým by ten smysl
zrušilo. **Rozdíl je navíc věcný: lodě s verzí 1 se sledováním
nesouhlasily**, a předpokládat to u nich nejde.

Dvě věci ve formulaci jsou schválně. *„Během závodního dne"* odpovídá
tomu, že se trasy dnes berou od rozpravy do uzavření dne — **kdyby prošel
nález R3** a brána se posunula k přihláškám, musí se ta věta změnit spolu
s ní (další důvod pro verzování). A *„vidí pořadatel a rozhodčí"* je
oddělené od *„podle nastavení regaty"*, protože první platí vždycky,
kdežto druhé řídí `CoVidiPosadky` a `ZivyPrenosVen`.

> **Otázka pro Filipa, nerozhoduju ji:** co s loděmi, které stihly
> odkliknout verzi 1? Doptat se jich zvlášť, nebo stačí doplnit při
> příštím přihlášení? Prakticky to nejspíš netrefí nikoho — fáze 2 se
> nasadila v noci a na květnovou regatu se v tu dobu nikdo nehlásí —, ale
> ověřit to odsud nejde, produkční databázi nečtu.

### R10 — Stránka regaty: Miloš jmenuje pět položek, aplikace má pět jiných

*Původ: střípek 6. Doloženo:
`web/app/serie/[slug]/zavody/[zavod]/hlava.tsx:68–83` (funkce `sekce`),
`Features/Zavody/Prihlasky.cs:121` (`VerejneViditelna`),
`NAVOD-ROZHODCI.pdf` s. 18. Stav: **tab přejmenovaný a obsah srovnaný
28. 10. 2026** (fáze 1.3, viz konec nálezu); zbytek **zapsáno** — polovina
patří do `SCENARE-OVLADANI.md`.*

Dnešní taby stránky regaty skládá jedna funkce a jsou **pro všechny stejné**:

```tsx
/** Které sekce ta která regata má. Pořadí je pořadí tabů. */
return [
  "uvod",
  ...((zavod.smernice?.length ?? 0) > 0 ? (["smernice"] as const) : []),
  ...(trat ? (["trat"] as const) : []),
  "lode",
  "vysledky",
];
```

Srovnání s tím, co jmenoval Miloš:

| # | Miloš — přihlášení | Miloš — nepřihlášení | Dnes |
|---|---|---|---|
| 1 | **Vypsání závodu** | **Vypsání závodu** | **neexistuje** (R1, R8) |
| 2 | plachetní směrnice | plachetní směrnice | `smernice` — **ano**, ale tab je jen když je něco vyvěšené |
| 3 | závodní trať | závodní trať | `trat` — **ano**, ale jen když ji rozhodčí přijal |
| 4 | přihlášky | — | `lode` — **ano, ale pro všechny** |
| 5 | startovní listina | — | **není sekcí** — je na tabuli, a ta je bez přihlášení |
| — | (nejmenuje) | (nejmenuje) | `uvod`, `vysledky` |

**Čtyři věci z toho, a každá jinam.**

**(1) Vypsání závodu je první u obou publik — a dvakrát.** To je nezávislé
potvrzení R1 a R8 z úplně jiné strany než střípek 1: tam šlo o workflow, tady
o strukturu stránky. Miloš ho navíc dává **i nepřihlášeným**, což přesně sedí
na ZPJ 25.1 (*„dostupné každé lodi … dříve, než se přihlásí"*) — a sedí to
i logicky, protože podle vypsání se člověk rozhoduje, jestli pojede.

**(2) Rozlišení „přihlášený / nepřihlášený" stránka regaty vůbec nedělá.**
Dnes vidí všichni totéž. A je u toho **dvojznačnost, kterou je potřeba vyjasnit
dřív, než se podle toho něco postaví**: *přihlášený* může znamenat

- **loď přihlášenou do téhle regaty** (`Ucast`, stavy zapsaná/potvrzená) — tak
  to Miloš v kontextu „Jarní vítr pro přihlášené" nejspíš myslí;
- **nebo uživatele přihlášeného na web** (účet, `nactiJa`) — tak tomu bude
  rozumět kód, protože to je jediné „přihlášení", které web dnes zná.

Nejsou to totéž a liší se v obou směrech: kapitán přihlášené lodi nemusí mít
na webu účet (přihlášku může podat kdokoliv s kontaktem) a naopak přihlášený
uživatel nemusí mít v regatě loď. **Neodhaduju to** — je to otázka 9.

**(3) „Přihlášky" a „startovní listina" jsou u Miloše dvě různé věci**, kdežto
v aplikaci je to jedna sekce `lode`. To rozlišení dává smysl a pravidla ho
dělají taky: *přihlášky* jsou proces (kdo se hlásí, komu se co schvaluje),
*startovní listina* je hotový dokument k danému dni. Že je má v seznamu obojí
a na různých místech, mluví spíš pro dvě obrazovky než pro jednu.

**(4) Startovní listina je dnes veřejná, a Miloš ji chce jen pro přihlášené.**
Tabule ji ukazuje ve fázi „než se jelo" a **nikdo se na ni nepřihlašuje**
(návod s. 18); seznam přihlášených je veřejný i na webu
(`Prihlasky.VerejneViditelna` pouští zapsané, potvrzené i vyloučené). Je to
tedy **rozpor s dnešním stavem**, ne chybějící funkce — a pozor, dotýká se
tabule, kterou Filip srovnával 24.–25. 10. a která má vlastní dokument
(`docs/TABULE-DIVAK.md`). Sem patří jen poznámka, že požadavek existuje.

**Co z tohohle nálezu je čí.** Body (2), (3) a (4) jsou o struktuře a
viditelnosti, tedy **ergonomie** — patří do `docs/SCENARE-OVLADANI.md`, a bod
(4) navíc k tabuli. V tomhle dokumentu zůstávají jako odkaz, aby se neztratily,
ne k řešení. **Pravidlový je jen bod (1)**, a ten už nález má.

**Jak se to jmenuje dnes a jak podle Miloše** (Filip 27. 10. 2026: *„Podívej
jestli se nám to nejmenuje jinak a pojmenuj to podle Miloše"*). Taby veřejné
stránky skládá `NAZVY` v `hlava.tsx:45`:

| Miloš říká | dnes tab | dnes ve správě | sedí? |
|---|---|---|---|
| **Vypsání závodu** | — | — | neexistuje (R1, R8) |
| **plachetní směrnice** | `Směrnice` | `Plachetní směrnice` (krátce „směrnice") | **zkráceno** |
| **závodní trať** | `Trať` | `Bóje na trati` (krátce „bóje") | **tři různá jména** |
| **přihlášky** | `Lodě` | `Přihlášky` | **jiné slovo** |
| **startovní listina** | — | — | není tab, je jen na tabuli |

**O tabu `Lodě` rozhodl Filip (27. 10. 2026): „To bude startovní listina."**
Takže ne *Přihlášky*, jak jsem napřed navrhoval — veřejně diváka i závodníka
zajímá, kdo startuje, kdežto přihlášky jako proces patří do správy.

> **⚠︎ Přejmenování samo nestačí: obsah tomu dnes neodpovídá.** Sekce vypisuje
> **přihlášené včetně nepotvrzených** a sama to u nich píše — *„čeká na
> potvrzení"*, a u vyloučených *„vyloučená ze závodu"* (`sekce-lode.tsx:64–70`;
> veřejně se ukazují stavy `Prihlasena`, `Potvrzena` i `Vyloucena`,
> `Prihlasky.VerejneViditelna`). **Startovní listina je přitom ten, kdo
> startuje** — loď čekající na potvrzení a loď vyloučená na ní nemají co dělat.
>
> Nadpis *Startovní listina* nad seznamem, kde stojí „čeká na potvrzení", by
> byl přesně ten *„slib naprázdno"*, proti kterému stojí hlavička `co-smim.ts`.
> Buď se tedy s názvem změní i filtr, nebo zůstane dvojice: **Přihlášky** (vše,
> jak to je dnes) a **Startovní listina** (jen potvrzené) — což je mimochodem
> přesně to, co Miloš vyjmenoval jako **dvě** položky.

**Navržené znění podle Miloše:**

```
Úvod · Vypsání závodu · Plachetní směrnice · Závodní trať · Přihlášky ·
Startovní listina · Výsledky
```

*Úvod* a *Výsledky* Miloš nejmenoval — vypisoval, co je potřeba vidět **před
závodem**, takže z toho nic o nich neplyne a zůstávají.

**Ve správě bych `Bóje na trati` nechal.** Veřejně se na trať dívám, ve správě
ji stavím z bójí a prvků, takže jiný název je tam na místě. Je to ale věc
k rozhodnutí: Miloš chodí do obojího a může ho plést, že venku je *Závodní trať*
a ve správě *Bóje na trati*.

> **⚠︎ Jedna věcná námitka: šířka.** Dnes je tabů pět a jsou krátké. Podle
> Miloše jich bude **sedm a dvakrát delší** — *Plachetní směrnice* a *Závodní
> trať* místo *Směrnice* a *Trať*. Na telefonu, kde rozhodčí u vody pracuje,
> se to nemusí vejít. Vzorec na to projekt má: položky správy mají vedle
> `nazev` i `kratky` (*„směrnice", „bóje", „přihlášky"*), takže **plný název
> v nadpisu a krátký v tabu** je cesta, kterou už jednou zvolil. Nerozhoduju to.

### Hotovo 28. 10. 2026 — tab `Lodě` (fáze 1.3)

Tab se jmenuje **Startovní listina** (`NAZVY` v `hlava.tsx`), a protože
samotné přejmenování by lhalo, **změnil se s ním i obsah**.

**Rozhodnutí, které si zaslouží být dohledatelné:** nález nechával dvě
cesty — buď s názvem změnit filtr, nebo nechat dvojici *Přihlášky* (vše)
a *Startovní listina* (jen potvrzené), jak je Miloš vyjmenoval. Zvolena
byla **jedna sekce a v ní dva seznamy**: nahoře *Startovní listina*
(potvrzené lodě, s taby tříd jako dnes), pod ní *Přihlášené, ještě ne na
listině* (lodě *„čeká na potvrzení"* a *„vyloučená ze závodu"*, s třídou
v řádku).

Důvody, pro které to takhle padlo:

- **nic se neztratilo** — kapitán, který přihlášku podal, na stránce dál
  vidí, že dorazila. Prostý filtr by ji smazal z veřejného webu;
- **nadpis nelže** — na listině stojí jen ti, kdo startují, což je přesně
  to, proti čemu stála výhrada v nálezu;
- **fáze 1 má být levná** — dva taby znamenají novou adresu a nový obsah,
  a to je rozhodnutí o návrhu stránky, ne o názvu.

**Dvojice tabů tím není zamítnutá**, jen odložená: patří k R10 bodům (2)
až (4), tedy do `SCENARE-OVLADANI.md`, a rozhodnout o ní má Filip —
hlavně spolu s tím, jestli se stránka bude dělit na publikum přihlášené
a nepřihlášené (otázka 9).

Co se **nezměnilo**: adresa zůstala `/lode` (odkazy na ni jsou po webu
i v návodu a slug nic netvrdí), ve správě zůstaly *Přihlášky* (tam je to
proces, a to sedí), a názvy *Směrnice* a *Trať* se nesahaly — ty jsou
součástí námitky o šířce, kterou nerozhoduju. Na telefonu (375 px) jsou
taby stejně akordeon, takže delší název se vešel.

*Změřeno proti mocku (28. 10. 2026):* regata `izolepa` s 22 loděmi, z toho
dvě *Prihlasena* a jedna *Vyloucena* → listina hlásí **19 lodí** a tři
zbylé stojí pod ní s důvodem. Ve světlém i tmavém režimu, na 1280 px
i 375 px.

> **Místo na citát z diskuse:** _(co se v tom seznamu nejmenuje: kam patří
> výsledky a úvodní stránka? Je to tím, že jsi vyjmenovával, co je potřeba
> **před** závodem?)_

### R11 — Co pravidla říkají o „alternativním trestu" (odpověď na dotaz)

*Původ: střípek 7, přímý dotaz Filipa (*„nevím jak je to správně, koukni do
pravidel"*). Doloženo: ZPJ 44.1, 44.2, 44.3, 43, 29.1, 30.1, A10,
`docs/PLAN.md:5469–5472`. Stav: **odpověď, ne nález** — ale mění, co by ta
tlačítka měla dělat.*

> ### ⚠︎ Tenhle nález odpovídá na jinou otázku, než jakou Miloš myslel
>
> R11 vykládá **pravidlo 44 (otáčky)** a to, co o nich říká, platí dál. Jenže
> Miloš „alternativním trestem" myslel **startovní trest podle pravidla 30**,
> a tam se trest doopravdy dává, identifikuje a zapisuje. Viz **R14**, který
> tohle opravuje. Text zůstává, protože o otáčkách je správně — jen nebyl
> odpovědí na položenou otázku.

**Krátce: „alternativní trest" není termín ZPJ a ten úkon není rozhodčího.**
Tři věci, každá jinak, než jak zní návrh.

**(1) Pravidla znají tři tresty a žádný se tak nejmenuje.**

| ZPJ | Trest | Za co |
|---|---|---|
| 44.2 | **jednootáčkový** (jeden obrat + jedna halza) | pravidlo 31 — dotek značky |
| 44.2 | **dvouotáčkový** | pravidla Části 2 — potkávání lodí |
| 44.3 | **bodový trest** | jen pokud ho stanoví **vypsání nebo směrnice**; loď ho přijme vyvěšením **žluté vlajky** |

„Alternativní trest" je hovorové označení pro otáčky — alternativa
k diskvalifikaci. V `PLAN.md:5469` ho projekt používá taky, takže si ho
v mluvě klidně nechte; v kódu a na obrazovce by ale měl stát název z pravidel,
protože na něm visí, **který** trest to je.

**(2) Trest si loď bere sama. Rozhodčí ho neukládá.** ZPJ 44.1:
*„Loď, která mohla porušit jedno nebo více pravidel části 2, když závodila,
**může přijmout** dvouotáčkový trest."* Nikdo jí ho nedává a není co odsouhlasit
— loď se odpoutá od ostatních, udělá otáčky a tím je věc vyřízená. **Nikde se to
nehlásí a nikam nezapisuje.** Tlačítko *„má alternativní trest"* by tedy bylo
úkonem, který v pravidlech nikdo nedělá.

Výjimka je právě **bodový trest** (44.3(b)): ten se hlásit musí — loď má žlutou
vlajku vyvěšenou **do dokončení** a *„musí na ni upozornit závodní komisi na
cílové čáře"*, spolu s totožností druhé lodi. To je ovšem zápis **u cíle**, ne
u startu, a v listině se objeví jako **SCP** (A10). Body: *„20 % z bodového
hodnocení pro nedokončila, zaokrouhleno na nejbližší desetinu"*, a loď *„nesmí
být hodnocena hůře, než kdyby nedokončila"*.

**(3) „A poté, že ho absolvovali?" — u otáček se to nepotvrzuje.** Není koho
informovat a pravidla žádný záznam nežádají.

Napřed jsem k tomu napsal, že pohár si zavedl víc, protože `PLAN.md:5469` mluví
o diskvalifikaci za *„nesplnění alternativního trestu nebo **splnění bez
svědka**"* — a domyslel jsem si, že svědek je ten, kdo to odklepne. **Filip to
vyvrátil (27. 10. 2026):**

> *„Svědek je pouze druhá loď, nebo rozhodčí. Je to pouze o důvěře
> a džentlmanství, nikdo to nemusí potvrzovat."*

**Tím padá i poslední cesta k tomu tlačítku.** Svědek není úkon, je to
společenská norma — a norma se do aplikace nezapisuje. Ani v pravidlech, ani ve
vlastní praxi poháru tedy **není nic, co by se u otáček klepalo**. Zůstává
jediné: zapsat výsledek, když trest splněn nebyl (DSQ podle pohárového pravidla,
`PLAN.md:5469`), a to je úkon **po rozjížďce**, ne za jízdy.

**Co startér v prvních minutách po startu doopravdy řeší — a jsou to jiné
lhůty.** Tady je ta nejpoužitelnější část odpovědi:

| Co | ZPJ | Lhůta |
|---|---|---|
| **kdo je přes čáru** → individuální odvolání, vlajka X | 29.1 | X visí **nejdéle 4 minuty** po startovním znamení (nebo do minuty před dalším startem) |
| s vlajkou I musí loď objet prodloužení čáry, než odstartuje | 30.1 | během té doby |
| kdo se nevrátil | A10 | **OCS** |
| otáčky za incident | 44.2 | **kdykoli během rozjížďky**, žádné okno |

**Takže deset minut míchá dvě různé věci.** To, co Miloš po startu sleduje
(*„koukat kdo je přes čáru"*), je **odvolání**, a jeho pravidlová lhůta jsou
**čtyři minuty**. Otáčky naproti tomu žádné okno nemají — loď je může vzít
u poslední bóje. Deset minut by tedy bylo moc na jedno a málo na druhé.

*Mez: tohle je čtení pravidel, ne provozní zkušenost. Jestli se na Orlíku
otáčky řeší u startu proto, že se tam dějí kontakty, je to legitimní vlastní
praxe — jen je potřeba vědět, že se tím zapisuje něco jiného než odvolání.*

> **Místo na citát z diskuse:** _(je „svědek" u otáček pravidlo poháru, nebo
> zvyk? A kdo svědčí — startér, nebo druhá loď?)_

### R12 — Startovní procedura jako nástroj v ruce: co z toho aplikace má

*Původ: střípek 7. Doloženo: `Features/Zavody/ZapisSprava.cs:454–482`,
`Features/Polohy/PolohySprava.cs:144`, `Features/Okna/OknaEndpoints.cs`,
ZPJ 26, 27.3, 29.2. Stav: **zčásti hotovo 28. 10. 2026** (fáze 3.1, podrobně
u R5): procedura, odložení, odvolání a délka jako parametr. Velitelský čas
(R19, body 2–4) a obrazovka startéra ne.*

Střípek 7 je **odpověď na otázku 1 z návodu** (*„Kde chceš mít odstartování
rozjížďky? Chceš mít startovní proceduru jako vlastní nástroj?"*) a odpovídá
i na to, kdo ji drží: **startér**, což může být rozhodčí i pořadatel.

**Nejdůležitější věta celého střípku** je přitom jednořádková poznámka:

> *„Od této chvíle je zdroj pravdy mobilní aplikace startéra."*

To je posun v tom, čím appka je. Dnes je podle návodu (s. 20) *„na nahrávání
trasy lodi, klíč a upozornění"* — nástroj závodníka. Startovní procedura z ní
dělá **nástroj pořadatele**, a to na zařízení, které je dnes **jen pro Android**.

**Co z požadavku aplikace má, a co ne:**

| Požadavek ze střípku | Stav |
|---|---|
| čas startu dohodnutý na rozpravě („setneme kdy asi bude") | **ne** — `StartV` nejde zapsat dopředu, zápis času rozjížďku rovnou rozjede (K6) |
| velký odpočet do toho času | **zpola** — tabule odpočítává a čas už jde nastavit (K6); velká obrazovka v telefonu startéra ne, je to ergonomie |
| kontrola startovní listiny na rozpravě | **zpola** — listina je, rozprava je, propojené to není (R6) |
| potvrzení tras na rozpravě | **ano** — přijetí trati rozhodčím (`TratEndpoints.PrijmiAsync`), a je to jeho výhradní úkon |
| telka se 15 minut před startem přepne na tracker | **ne** — mapa naskočí až startem, a `Procedura` je natvrdo 5 minut (R4) |
| proceduru spustí startér jedním tlačítkem | **ano od 28. 10. 2026** — tlačítko *Spustit proceduru* na cílové obrazovce |
| přerušit kdykoli uprostřed | **ano od 28. 10. 2026**, a to jako dvě věci: *Odložit* (27.3) a *Odvolat start* (29.2) |
| zadat nový čas a odpočítávat znovu | **ano od 28. 10. 2026** — po odložení se čas zadává volně, po odvolání ho spočítá pravidlo |
| 10 minut tlačítka s loděmi | **ne** — a mělo by to být jinak, viz R11 |
| přepnutí na cílovou obrazovku | cílová obrazovka **je** (*„jediné místo aplikace, kde se klepe na čas"*), přepnutí ne |

**Dvě věci, které by návrh měl vědět, než se podle něj něco postaví.**

*Přerušení není jedna věc, ale dvě, a dělí je startovní znamení:*

- **před startem** — odložení (vlajka AP, dvě zvuková znamení) nebo zrušení
  (N, tři) podle **ZPJ 27.3**, *„z jakékoli příčiny"*. Po odložení se nový čas
  volí volně, přesně jak Filip píše.
- **po startu** — **všeobecné odvolání** podle **ZPJ 29.2** (první opakovač,
  dvě znamení), a tady nový čas volný **není**: *„Vyzývací znamení nového startu
  odvolané třídy musí být dáno jednu minutu poté, co je první opakovač spuštěn."*
  Tedy T+1 minuta od spuštění, ne co startér zadá.

Jsou to navíc různé důvody: odložit jde kvůli počasí, odvolat kvůli tomu, že
lodě nejdou rozpoznat nebo se stala chyba v proceduře. Aplikace by ten rozdíl
měla znát, protože rozhoduje o tom, co se nabídne.

*A pět minut v pravidle 26 má hvězdičku:* *„nebo tak, jak je stanoveno ve
vypsání závodu nebo v plachetních směrnicích"*. Délka procedury je tedy
parametr, ne konstanta — a dnes je zadrátovaná na dvou místech
(`PolohySprava.Procedura`, a Miloš u mapy řekl 10 minut, Filip 15, viz R4).

> **Hotovo 28. 10. 2026:** délka je `Zavod.DelkaProceduryMin` (výchozí 5)
> a berou ji z regaty obě ta místa i tabule. Tiskne se do vypsání závodu,
> protože je to odchylka, kterou si závod volí (R8). **Kolik minut má mít
> přepnutí tabule na mapu, tím rozhodnuté není** — to je R4 a ten dál
> nerozhoduju.

**Co z tohohle nálezu je ergonomie a nepatří sem.** Celá Milošova věta o tom,
jak se to drží v ruce — *jedno tlačítko, mobil nesmí usnout, musí být dobře
vidět, žádné vyplňování formuláře* — je požadavek na ovládání, ne na pravidla.
Patří do `docs/SCENARE-OVLADANI.md`; sem zapisuju jen to, že **je to nejtvrdší
ergonomické zadání, jaké projekt zatím dostal**, protože je formulované
podmínkami provozu (jedna ruka, slunce, motorák), ne přáním.

> **Místo na citát z diskuse:** _(„setneme kdy asi bude" — je to odhad, nebo
> závazný čas, od kterého se počítá? A co se stane, když se do něj nestihne
> vyjet?)_

### R14 — Miloš odpověděl: „alternativní trest" je startovní trest podle pravidla 30, a ten se identifikuje

> **Upřesněno 28. 10. 2026 hlasem — tahle oprava šla dál, než měla.** Miloš
> používá „alternativní trest" pro **dva různé úkony**: před startem je to
> pravidlo 30 (jak stojí níž), u cíle je to otáčka podle ZPJ 44.2, a v appce
> posádky to pojmenoval sám jako *„alternativní trest 360 stupňů"* a *„720
> stupňů"*. R11 byl tedy věcně správný, jen nemířil na to, na co se Filip
> tehdy ptal. Celé srovnání je v nálezech R31 a R34.

*Původ: střípek 9 — **odpověď Miloše na otázku 10**. Doloženo: ZPJ 30.1–30.4,
29.1, 44.3(c), A10, `Features/Zavody/Zavod.cs:184–207`. Stav: **kódy hotové
28. 10. 2026** (fáze 3.3, u K1); **paměť vlajky a opakovaná identifikace
ne**. Opravuje R11.*

> **[27.10.2026 21:08:43] Miloš Zvonař:** Alternativni trest
>
> **[27.10.2026 21:09:35] Miloš Zvonař:** Pri startu s minutovym pravidlem pri
> jeho poruseni- lod je v posledni minute pres caru nebo odstartuje predcasne

**Tahle odpověď mění výklad R11, a je to oprava v můj neprospěch.** R11 řeší
pravidlo 44 — otáčky — a došla k tomu, že se neukládají, nehlásí a není co
klepat. To **platí dál a je to správně**, jenže **Miloš o otáčkách nikdy
nemluvil.** „Minutové pravidlo" je **ZPJ 30** a to je něco úplně jiného: tam se
trest dává, identifikuje a zapisuje. R11 tedy odpověděla správně na otázku,
kterou nikdo nepoložil.

**Co je „minutové pravidlo".** Čtyři vlajky, všechny vázané na **poslední minutu
před startovním znamením** — odtud ten název:

| ZPJ | Vlajka | Co loď poruší | Následek | Kód A10 |
|---|---|---|---|---|
| 30.1 | **I** | je na dráhové straně čáry nebo prodloužení | musí objet prodloužení, než odstartuje | **OCS**, když to neudělá |
| 30.2 | **Z** | je v trojúhelníku čára–první značka | **20% bodový trest bez projednávání** | **ZFP** |
| 30.3 | **U** | totéž | diskvalifikace bez projednávání | **UFD** |
| 30.4 | **černá** | totéž | diskvalifikace bez projednávání | **BFD** |

A druhá polovina Milošovy věty — *„nebo odstartuje předčasně"* — je **OCS** podle
29.1, tedy individuální odvolání vlajkou X.

**„Alternativní trest" v jeho ústech je tedy nejspíš vlajka Z**: jediný ze
čtyř, který je skutečně *alternativou k diskvalifikaci* — loď jede dál a dostane
20 % místo vyhazovu. Potvrdit to umí jen on sám, ale sedí to na všechno, co
řekl: *„kdy se dává"* (ano, dává se), *„když se loď dostane přes čáru"* (ano,
v poslední minutě), i to, proč chce tlačítka.

**A teď to podstatné: tohle úkon komise JE.** Pravidla 30.2–30.4 říkají shodně:

> *„Jestliže loď poruší toto pravidlo **a je identifikována**, musí **bez
> projednávání** dostat…"*

**Identifikace je přesně to tlačítko, o které Miloš žádá** — a *„bez
projednávání"* znamená, že to startér smí udělat sám na vodě, bez protestu a bez
komise. Milošův návrh ze střípku 7 tedy není proti pravidlům; je přesně podle
nich, jen se ten úkon jmenuje jinak, než jsme si mysleli.

**Co z toho pro aplikaci plyne — a je to tvrdé.** Z těch pěti kódů aplikace zná
**jediný, OCS**. `KodVysledku` nemá **ZFP, UFD ani BFD** (K1). Startér tedy může
loď identifikovat, ale **výsledek té práce nemá kam zapsat** — a u vlajky Z je to
nejhorší, protože ZFP není diskvalifikace: je to 20 % z bodů za nedokončila
(44.3(c)), tedy **číslo, které se musí spočítat a vejít do výsledkové listiny**.
Bez kódu ZFP by se musel ručně přepsat výsledek, což je zásah do zápisu, co
rozhodčí dělat nemá.

**Dvě netriviální věci, které musí návrh ze střípku 7 vědět.**

**(1) Trest přežívá nový start — ale každá vlajka jinak.** Tohle je přímá vazba
na přerušení procedury (R12):

| Vlajka | Při novém startu téže rozjížďky | Při odložení/zrušení před startem |
|---|---|---|
| **Z** | **platí dál**, a opakovaná identifikace = **další 20 %** | padá |
| **U** | **padá** | padá |
| **černá** | **platí** a loď se nového startu **nesmí účastnit** | padá |

Aplikace tedy musí vědět, **která vlajka visela**, jinak neví, co s trestem při
opakování. Dnes nevede ani vlajku, ani opakování startu (R12).

**(2) Černá vlajka ukládá komisi oznámit číslo plachty.** ZPJ 30.4: *„Jestliže
je signalizováno všeobecné odvolání nebo je rozjížďka zrušena po startovním
znamení, závodní komise **musí zobrazit její číslo plachty před dalším
vyzývacím znamením** této rozjížďky."* To je úkon pro **vývěsku nebo tabuli** —
a aplikace obojí má (vývěska regaty, bod 12 návodu). Je to další místo, kde
tabule plní pravidlovou funkci, kterou jí nikdo nepřipsal (jako záznam trasy
v R13).

> **Místo na citát z diskuse:** _(kterou vlajku na poháru vyvěšuješ — I, Z, U,
> nebo černou? A mění se to podle rozjížďky, nebo je to pro celý závod stejné?)_

**Hned po zápisu tohohle nálezu přišla odpověď, která ho zpochybnila:** Filip
*„u Miloše jsem nikdy vlajky neviděl"* (střípek 10). Každý ze čtyř trestů výš je
přitom podmíněný vyvěšenou vlajkou. **Text R14 zůstává** — výklad pravidla je
správný a kódy v aplikaci chybí tak jako tak — ale jestli se ty tresty na poháru
vůbec dají uplatnit, řeší **R15**.

### R15 — Bez vizuálního znamení neplatí ani „minutové pravidlo", ani odvolání

*Původ: střípek 10 (Filip, 27. 10. 2026). Doloženo: ZPJ 26, 25.2, 25.3,
30.1–30.4, 29.1, `web/app/vlajky.tsx`. Stav: **zapsáno — otázka, která stojí
před celým návrhem procedury**.*

Filip: *„U Miloše jsem nikdy vlajky neviděl."*

**Každé z pravidel, o kterých byla řeč, začíná vyvěšenou vlajkou.** Doslova:

> *„Jestliže **byla vztyčena vlajka I** a jakákoli část trupu…"* (30.1)
> *„Jestliže **byla vztyčena vlajka Z**…"* (30.2), totéž U (30.3) a černá (30.4)
> *„Závodní komise musí neprodleně **vyvěsit vlajku X**…"* (29.1)

A celá procedura podle **ZPJ 26** stojí na vizuálních znameních, ne na zvuku ani
na slovech: *„Časy musejí být brány podle **vizuálních znamení**; na nepřítomnost
zvukového znamení nesmí být brán zřetel."*

**Důsledek, pokud se doopravdy nic nevyvěšuje:** startér nemá k dispozici ani
jeden ze čtyř startovních trestů z R14 — vlajka je jejich podmínka, ne jejich
oznámení — a formálně nemá ani individuální odvolání, protože to je vlajka X.
Zůstalo by jen to, co si lodě odnesou z rozpravy.

**Tři možnosti, a rozhodnout mezi nimi umí jen Miloš:**

1. **Signalizuje něčím jiným než vlajkou.** Pravidla to výslovně dovolují —
   ZPJ 25.3: *„Když je požadováno, aby závodní komise používala vlajku jako
   vizuální znamení, může použít **buď vlajku nebo jiný objekt podobného
   vzhledu**."* Kus látky, deska, cokoliv dohodnutého. Pak je všechno v pořádku
   a jen to nevypadá jako vlajka.
2. **Oznamuje to megafonem.** Pak to podle pravidel vizuální znamení není
   (25.2 dovoluje měnit význam znamení jen podle 86.1(b), ústní sdělení zná
   pravidlo 90.2(c) jen pro změny směrnic na vodě a jen když to směrnice
   připouštějí). Na neoficiálním závodě to funguje z dohody, ne z pravidel.
3. **„Minutové pravidlo" je na poháru dohoda z rozpravy**, ne ZPJ 30. To je
   u závodu, který *„pořadatelsky ofiko není"* (střípek 5), úplně legitimní —
   ale je to **vlastní pravidlo**, a jako každé vlastní pravidlo patří podle R8
   do vypsání závodu nebo směrnic. Dnes není nikde.

**Co z toho plyne pro návrh ze střípku 7, a je to nepříjemné.** Návrh počítá
s tím, že procedurou provede aplikace. Jenže **aplikace vizuální znamení vydat
nemůže**: závodníci na vodě nevidí startérův telefon a tabule v klubovně je pro
diváky na břehu. Ať se obrazovka udělá jakkoliv velká a čitelná, **znamení pro
pole z ní nebude** — to zůstane na tom, co startér vyvěsí nebo zakřičí.

Co aplikace naopak umí a co z téhle úvahy vychází jako její skutečná role:

- **odpočítávat** a říkat startérovi, co má kdy udělat (T−5, T−4, T−1, start);
- **zaznamenat, co platilo** — která vlajka nebo dohoda visela, protože na tom
  podle R14 visí, jaký trest se dává a jestli přežije nový start;
- **zapsat identifikaci** lodě, která pravidlo porušila (to je ten úkon
  z R14).

Tedy ne „aplikace řídí start", ale „aplikace drží čas a paměť, znamení dává
člověk".

**Drobnost, která by jednou kolidovala.** Aplikace vlajky zná — jako ikonky
u tabů regaty (`web/app/vlajky.tsx`, od 11. 10. 2026), a vybrané schválně podle
významu v ZPJ. Jenže mezi nimi je **vlajka P**, u sekce *Lodě*, s popiskem
*„přípravný signál před startem"*. Kdyby aplikace někdy začala ukazovat skutečná
startovní znamení, znamenala by P dvě různé věci na téže obrazovce. Dnes to
nevadí a opravovat to není proč — jen to nemá zapadnout.

> **Místo na citát z diskuse:** _(jak dáváš polí najevo, že platí minutové
> pravidlo a že je někdo přes čáru — vlajka, deska, megafon, nebo se to řekne
> na rozpravě a dál se spoléhá na čestnost?)_

### R16 — Megafon: tresty podle pravidla 30 na poháru formálně neplatí, a tabule to nespraví

*Původ: střípek 11 — **odpověď na R15**. Doloženo: ZPJ 25.2, 25.3, 26, 30,
`docs/TABULE-DIVAK.md` nález 7, `web/lib/rozjizdky-tabule.ts`. Stav:
**zapsáno**.*

**Z možností v R15 platí ta druhá: megafon.** Tím je zodpovězeno, proč nejsou
vidět vlajky — žádné nejsou.

**Co z toho plyne, bez obcházení:** startovní tresty podle pravidla 30 (R14) se
na poháru **formálně uplatnit nedají**. Každý z nich je podmíněný vyvěšenou
vlajkou a křik megafonem vizuální znamení podle 25.2 není. To neznamená, že
Miloš dělá něco špatně — pohár *„pořadatelsky ofiko není"* (střípek 5) a mezi
lidmi, kteří se znají, funguje dohoda líp než vlajka. **Znamená to jen tohle:**
*„minutové pravidlo"* je na poháru **vlastní pravidlo z dohody**, ne ZPJ 30,
a jako každé vlastní pravidlo patří podle R8 do vypsání závodu nebo směrnic.
Tam dnes není, takže jediné, oč se opírá, je to, že si to lidé pamatují
z rozpravy.

Praktický důsledek, který stojí za zvážení nezávisle na aplikaci: **megafon
doletí míň daleko než je vidět vlajka.** Loď na druhém konci čáry nemusí slyšet,
a u trestu bez projednávání je to rozdíl mezi „věděl a riskoval" a „nevěděl".
Deska nebo kus látky na startovní lodi je levná pojistka — ZPJ 25.3 je výslovně
dovoluje (*„buď vlajku nebo jiný objekt podobného vzhledu"*). Zda to je problém,
ví jen Miloš; dosah megafonu jsem neměřil a neodhaduju ho.

**K návrhu ukázat vlajku na tabuli.** Je to dobrý nápad, jen je potřeba být
přesný v tom, **čím je a čím není**:

- **Není to znamení pro pole.** Tabule visí v klubovně, lodě jsou na vodě.
  Pravidlo 26 tím splněné nebude a vlajka na obrazovce nezaloží platnost
  pravidla 30 o nic víc než megafon.
- **Je to ale dobré pro diváka** — a právě na břehu je ten, kdo neví, co se na
  vodě děje. „Visí Z, takže kdo v poslední minutě přejede, dostane dvacet
  procent" je přesně ten druh věty, kterou tabule divákovi dlužila.
- **A je to doklad.** R15 jmenoval jako skutečnou roli aplikace *„zaznamenat,
  co platilo"*. Vlajka na tabuli je ten záznam vidět — a po závodě se dá
  doložit, co bylo oznámeno.

**Dobrá zpráva k odpočtům: půlka už je napsaná.** `rozjizdky-tabule.ts` umí obě
fáze, které Filip chce — *„procedura ve 10:25"* i odpočet *„startovní procedura
4:30"*. Jsou ale mrtvé, protože obě chtějí rozjížďku ve stavu `Planovana`
s vyplněným `startV`, a ten stav **nejde vyrobit** (nález 7
v `docs/TABULE-DIVAK.md`, změřeno nezávisle; totéž je K6 tady).

**Tři nezávislé cesty tedy ukazují na jedno chybějící pole:** oponentura
rozhodčího (K6), oponentura tabule (nález 7) a teď dva střípky od Miloše
a Filipa. Plánovaný čas startu je ta nejlevnější věc s nejdelším dosahem, co
z celé téhle diskuse vyšla — odemyká odpočet na tabuli, odpočet startérovi
(R12) i přepnutí tabule 15 minut před startem (R4).

*Rozvržení tabule — kam přesně ten prvek dát a jak má vypadat — je věc
`docs/TABULE-DIVAK.md`, kde je k nálezu 7 doplněné. Sem patří jen to, co z toho
plyne na pravidla.*

### R17 — Tok obrazovek po startu: „Start vyřízen" je krok, který pravidla neznají, a je to dobře

*Původ: střípek 12. Doloženo: ZPJ 29.1, 30.2, 32.1, 33, 34,
`web/app/sprava/[serie]/vysledky/[zavod]/[cislo]/cil/cil.tsx:218–220`, `:826`.
Stav: **opraveno 28. 10. 2026** (fáze 4.2) — zrušení s důvodem, změna
úseku (33) i chybějící značka (34). Vede se stranou u rozjížďky, trať se
nepřestavuje.*

Filip popisuje sled: **start → čas pro tresty („Start vyřízen") → klidná chvíle
→ cílovka nebo obrazovka pro činnosti → dojetí a ukončení → příprava na další.**

**„Start vyřízen" je dobrý nápad právě proto, že ho pravidla neznají.** ZPJ
žádný takový okamžik nemají — mají jen lhůty, které běží nezávisle (vlajka X
nejdéle 4 minuty podle 29.1, identifikace podle 30.2 kdykoli, než se uzavře
zápis). Jenže **startér potřebuje vědět, kdy má hotovo**, a to pravidla neřeší,
protože neřeší jeho pozornost. Je to tedy legitimní vlastní krok aplikace —
dokud se netváří jako pravidlová lhůta. Co by k němu podle R14 mělo patřit: do
toho okamžiku se ještě dá dopsat identifikovaná loď, po něm už ne bez vysvětlení.

**„Obrazovka pro činnosti" má v pravidlech konkrétní obsah.** Filip píše
*„většinou krizové, nebo zkrácení, nebo .... to ještě vymyslíme"* — vymýšlet se
to nemusí, ZPJ to vyjmenovávají a všechno jsou to úkony **za jízdy**:

| ZPJ | Činnost | Vlajka |
|---|---|---|
| **32.1** | **zkrácení** dráhy | S |
| 32.1 | **zrušení** probíhající rozjížďky (i pro bezpečnost — R13) | N / N nad H / N nad A |
| **33** | změna následujícího úseku dráhy (směr nebo délka) | C + kurz, nebo trojúhelník / obdélník, nebo + / − |
| **34** | chybějící nebo posunutá značka — nahradit objektem s vlajkou M | M |
| 27.1 | vyžádat osobní vztlakové prostředky | Y |
| 37 | pokyny pro pátrání a záchranu | V |

> ### ✗ Tenhle odstavec byl špatně — opraveno 27. 10. 2026
>
> Stálo tu, že *„zkrácení dráhy aplikace nezná vůbec"*. **Zná.** Našel jsem to
> až při ověřování jiné věci: `Trat` má `ZkracenoUPrvkuId`, `ZkracenoV`,
> `ZkratilId` i `Zkracena`, endpoint je `POST …/trate/{trat}/zkraceni`
> (`TratEndpoints.cs:186`) a `SmiZkratit` to pouští **jen rozhodčímu, a jen
> když rozjížďka jede** (`TratSprava.cs:958`: `jeRozhodci && t.RozjizdkaId is
> not null && jede`). Veřejná trať zkrácení vydává ven, aby si ho klient uměl
> spárovat s prvkem.
>
> Tvrdil jsem chybějící funkci, která je hotová — a hotová dobře, včetně
> omezení na rozhodčího a na běžící rozjížďku. Nechávám to tu, protože je to
> doklad, že odvozovat z nepřítomnosti slova v kódu nestačí: hledal jsem
> „zkrácení" mezi kódy výsledků a stavy rozjížďky, kdežto ono to žije na trati.

Z téhle tabulky aplikace uměla **dvě věci**: **zkrácení** (plně, jako úkon
rozhodčího za jízdy) a **zrušení** (jen oklikou přes eliminaci výsledků a bez
důvodu, R13). **Od 28. 10. 2026 umí čtyři**: přibylo zrušení s důvodem
a dvojice **změna úseku** (33) a **chybějící značka** (34). Chybí
vztlakové prostředky (27.1) a pátrání (37) — obojí je pokyn pro
bezpečnost, ne úkon nad tratí, a patří k jinému rozhodnutí.

Zkrácená dráha navíc mění, **kde je cíl** (32.2: u obeplouvané značky, na čáře,
nebo u brány), takže se dotýká trati i cílové obrazovky. Jestli to dnes vydaná
trať celé pokrývá, jsem neověřoval.

**Dvě věci, které aplikace k tomuhle toku už má, a jedna chybí.**

**Má: displej, co nezhasne.** `useDisplejSviti` v `cil.tsx:826` drží Wake Lock
po celou dobu, co je cílovka otevřená, a po přepnutí aplikace si ho vezme znovu:

```tsx
/**
 * Displej nezhasne, dokud je obrazovka otevřená. Na vodě se na telefon
 * mezi dojezdy nesahá a odemykat ho, když se blíží loď, je pozdě.
 */
```

**To je Milošův požadavek *„mobil mi nesmí usnout"* — už hotový a odladěný**,
jen použitý na jediné obrazovce. Startovní procedura ho zdědí, až vznikne.

**Má: cílovku jako běžný krok.** Filip píše, že *„cílovka je běžný krok, co by
měl následovat"* — a to sedí, protože cílová obrazovka je podle návodu (s. 14)
*„jediné místo aplikace, kde se klepe na čas"*.

**Chybí: přechod mezi nimi.** Dnes je start **na cílové obrazovce** — zapisuje
se tam a tamtéž se chytá cíl. V navrhovaném toku jsou to dvě různé obrazovky
za sebou, mezi nimiž se přepíná. To není konflikt, jen upozornění, že
„přepnutí na cílovku" znamená rozdělit obrazovku, která je dnes jedna.

> **Místo na citát z diskuse:** _(zkracuješ na poháru dráhu? A když ano, jak se
> to pozná — kde je pak cíl?)_

### Hotovo 28. 10. 2026 — zrušení s důvodem (fáze 4.2)

**Zrušení rozjížďky teď vyžaduje důvod** (`Workflow.ProcNejdeBezDuvodu`
zná vedle revize i `Eliminovano`, ukládá se do `Rozjizdka.DuvodZruseni`).
Zrušená rozjížďka **mizí z poháru**, takže se bude vysvětlovat — a ZPJ
32.1 má po startu **čtyři různé příčiny**. *„Nefouká, rušíme"* a
*„vytlačili je z čáry, rušíme"* vypadaly v zápisu stejně, přitom druhé
z toho je náprava, o které se vede spor (R13).

**Vlastní pole, ne sdílené s revizí:** obojí může u rozjížďky platit
najednou a sdílený sloupec by jeden důvod přepsal druhým zrovna ve
chvíli, kdy jsou potřeba oba. Ve správě se zrušení proto přesunulo mezi
rozbalovací formuláře (vedle vrácení k revizi), protože s povinným
důvodem to už není úkon na jedno klepnutí — a **proč byla zrušená, je
vidět i potom**.

Hláška jmenuje ty čtyři příčiny, aby se nenapsalo jen *„zrušeno"* a rozdíl
nezmizel stejně jako dřív. **Číselník příčin se nestavěl**: byl by to
návrh obrazovky a ten patří Filipovi.

*Změřeno proti mocku a obrazovkou (28. 10. 2026):* zrušení bez důvodu
odmítnuto hláškou s odkazem na 32.1; se zrušením se uloží i text a ve
správě pak stojí *„Zrušeno: Přešla bouřka, zrušeno pro bezpečnost"*.

### Co se nestavělo a proč (fáze 4.2)

**Změna úseku dráhy (ZPJ 33) a chybějící značka (34)** jsou úkony **na
trati**, tedy v `Features/Boje` — a tam v tutéž dobu pracovala souběžná
session (nálezy 11 a 12 jiného dokumentu). Sahat do stejných souborů ze
dvou stran je nejjistější způsob, jak si navzájem přepsat práci, takže
obojí zůstává na později.

**A je u nich víc než jen kolize.** U pravidla 34 dnes aplikace bóji
*„sbírá z vody"*, což je něco jiného než ji **nahradit objektem s vlajkou
M** — první je úklid, druhé je úkon za jízdy, po kterém se pluje dál.
Rozlišit to znamená rozhodnout, co je na trati prvek a co jeho náhrada,
a to je návrh, ne doplnění.

### R18 — Doručení ven: takt je minuta, a kód s tímhle požadavkem předem počítá

*Původ: střípek 13. Doloženo:
`Features/Upozorneni/OdesilaniUloha.cs:18–28`, `Zarizeni.cs:58–66`,
`Features/Zavody/VysledkySprava.cs:240–256`, `NAVOD-ROZHODCI.pdf` s. 22.
Stav: **zčásti hotovo 28. 10. 2026** (fáze 4.3, viz konec nálezu) —
pobídka, spěšné zprávy a odběr regaty; latence podle fáze jen u startu.*

Filip: *„až budeme řešit pushky na appky posádek, a změny stavů rozjížděk, tak
bude taky potřeba doručit je fofrem."*

**Ten požadavek je v kódu předvídaný, i s důvodem, proč dnes platí opak.**
`OdesilaniUloha` to říká sama:

> *„**Proč takt po minutě.** Upozornění nejsou čas závodu: „výsledky zveřejněny"
> snese minutu, a kratší takt by při prázdné frontě jen budil databázi. **Zprávy,
> které minutu nesnesou — odložený start — půjdou zařadit s vlastní pobídkou, až
> vzniknou.**"*

Takže to není opomenutí, je to **vědomě odložené rozhodnutí** — a Filipova věta
je přesně ta chvíle, kdy se odkládat přestává.

**Co dnes platí, změřeno ve zdrojáku:**

| Co | Jak |
|---|---|
| **takt odesílání** | `PeriodicTimer(TimeSpan.FromMinutes(1))` — latence až minuta, a **probudit zvenčí ho nejde** |
| **dávka** | 50 úkolů na jedno probuzení (`Odbery.DavkaOdeslani`) |
| **pokusů** | 5, pak se úkol vzdá |
| **replik** | jedna, schválně — výběr fronty není zamčený |
| **kolik zpráv se posílá** | **jedna jediná**: „Výsledky N. rozjížďky jsou venku", a to při publikaci, tedy po závodě |
| **komu** | odběr **ročníku** (`serie:<slug>`) |

**Tři věci, které by rozhodnutí mělo vzít v potaz.**

**(1) Odběr na regatu je připravený a nepoužitý.** `Odbery.Zavod(slug)` existuje,
ale nikdo se na něj nehlásí — komentář u publikace to říká: *„zůstává připravený
pro chvíli, kdy si o jednu regatu někdo řekne; dokud se k němu nikdo nehlásí,
zpráva na něj nikam nedojde."* Pro **změny stavů rozjížděk** je to ale ten
správný kanál: odložený start na Jarním větru nemá budit telefony lidí, kteří
jedou jinou regatu. Tedy ne nová infrastruktura — **jen připojit, co je.**

**(2) Tenhle řetěz už jednou byl hotový a nefungoval.** A je to zapsané
u publikace, změřeno 26. 10. 2026: zařazovalo se na `zavod:<slug>`, kdežto
telefony se hlásily na `serie:<slug>`, a `TokenyAsync` hledá odběr jako celou
položku — takže zpráva **neodešla nikomu**. *„Celý řetěz byl hotový
a nespojený."* U rychlého doručování je to varování k zapamatování: **kontrola
musí měřit, že zpráva dorazila, ne že se zařadila.** Prázdná fronta vypadá jako
úspěch.

**(3) „Fofrem" je u push notifikací zčásti mimo kontrolu aplikace.** I po
pobídce jde zpráva přes Expo a dál přes FCM nebo APNS; na Androidu v úsporném
režimu může dorazit se zpožděním a doručení není garantované. Aplikace tedy umí
slíbit *„odesláno bez prodlevy"*, ne *„doručeno včas"* — a u odloženého startu
je ten rozdíl podstatný.

**A pravidlová mez, tatáž jako u tabule (R15, R16):** push **nenahrazuje
signál**. Odložení se podle ZPJ 27.3 signalizuje vlajkou AP, ne zprávou do
telefonu, a loď bez telefonu (nebo s iPhonem — appka je jen pro Android) by jinak
byla v nevýhodě. Na poháru, kde se signalizuje megafonem, je push **navíc, ne
místo** — a má stejnou cenu jako vlajka na tabuli: dosah tam, kam megafon
nedoletí, a **doklad, co bylo oznámeno a kdy**.

**Doplněno týž den — latence je funkcí fáze, ne konstanta.** Filip:

> *„v okolí startu a cíle je potřeba mít aktuální a rychlé info. Pak při jízdě
> uprostřed rozjížďky je minuta naprosto velkorysá."*

Tím se požadavek z „doručovat rychle" mění na něco mnohem levnějšího:
**rychle jen tam, kde se něco děje.** Minutový takt se nemusí zahodit, musí se
k němu přidat pobídka pro dvě okna:

| Fáze | Co se v ní děje | Potřebná latence |
|---|---|---|
| **kolem startu** | procedura, odvolání, odložení, identifikace podle pravidla 30 | **vteřiny** |
| uprostřed rozjížďky | jede se; zkrácení a změna úseku se signalizují na vodě | minuta stačí |
| **kolem cíle** | dojezdy, konec rozjížďky, protestní lhůta | **vteřiny** |
| mezi rozjížďkami a po závodě | příprava další, publikace | minuta je velkorysá |

**A aplikace ty fáze už rozlišuje** — nemusí se vymýšlet, čím je poznat:
`StavRozjizdky` (`Planovana` / `Probiha` / `Dokoncena`), `Procedura` pěti minut
kolem startu (`PolohySprava.cs:144`) a čtyři podoby tabule podle toho, kde je
den. Chybí jen to, aby se podle nich řídil takt.

**Tentýž princip platí i obráceně, dovnitř.** Audit čerstvosti dat
v `docs/SCENARE-OVLADANI.md` (*Čerstvost dat tam, kde se rozhoduje*) došel
k tomu, že po cizí změně se neobnoví nic. Filipovo kritérium to zjemňuje stejně
užitečně: **nemusí se obnovovat všechno pořád** — stačí, aby cíl a okolí startu
byly čerstvé, a zbytek dne snese minutu. Je to jedno rozhodnutí pro oba směry,
ne dvě.

**Kdy přesně má být detailní režim (Filip, 27. 10. 2026):**

> *„jakmile bude 5 minut do startovní procedury a „Start vyřízen" tak je potřeba
> být v detailním režimu. Jakmile se loď dostane do oblasti cíle tak také. Po
> projetí cíle je potřeba např 5 minut a pak to může čekat na další periodu."*

| Okno | Od | Do |
|---|---|---|
| **start** | 5 minut **před procedurou** | „Start vyřízen" **nebo 500 m od startu** |
| **cíl** | loď vjede do oblasti cíle | 5 minut po projetí |

Tu druhou podmínku u startu doplnil Filip jako pojistku: *„po startu to může být
ten Start vyřízen a nebo když odjedou 500m od startu, tím to pojistíme."*
**Dvě nezávislé cesty, a jedna z nich nepotřebuje nikoho** — „Start vyřízen"
klepne startér, pětistovku si telefon spočítá sám, takže detailní režim skončí
i tehdy, když se na tlačítko zapomene nebo když telefon zrovna nemá signál. Je
to tentýž princip jako tvrdý konec okna závodního dne (*„logické pojistky, aby
nám tam nezůstávaly takové věci"*, Filip 24. 10. 2026).

> ### ⚠︎ Na Orlíku leží cíl na startu — tahle pojistka s tím koliduje
>
> Není to teorie, je to změřeno a stojí to v `web/lib/postup-po-trase.ts`:
> *„cesta po vodě se sama k sobě vrací — u Orlíku dokonce tak, že **cíl leží na
> startu (změřeno 0 m mezi nimi)** a noha nahoru vede skoro souběžně s nohou
> zpátky."*
>
> Pokud tedy start a cíl splývají, pak **„500 m od startu" a „v oblasti cíle"
> měří od téhož bodu**, jen opačně. Je-li oblast cíle větší než 500 m, obě
> podmínky platí naráz a detailní režim se nevypne nikdy; je-li menší, vznikne
> mezi nimi pásmo, kde neplatí ani jedna. Obě hranice se tedy musí zvolit
> společně, ne každá zvlášť — a nejspíš se musí vázat na **projetí startovní
> branky** (to `postup-po-trase` umí), ne na vzdálenost od bodu.

Všimni si, že *„pět minut před procedurou"* plus pětiminutová procedura dává
**T−10** — tedy přesně to, co Miloš řekl o mapě (*„10 minut před startem zapnem
mapu"*, R4). Dvě různé věty o dvou různých věcech vyšly na totéž číslo, což je
slušná kontrola, že to číslo sedí.

**A okno cíle je per loď, ne per regatu.** To je podstatný rozdíl: u startu jede
celé pole naráz, u cíle dojíždí každý jindy — vedoucí loď může být v cíli, když
poslední teprve obrací.

**Čím se pozná „oblast cíle" — a tady Filip dodal to podstatné:**

> *„no i loď ví kde je cíl"*

To obrací celý návrh a zlevňuje ho. **Detailní režim nemusí nikdo řídit
centrálně**: telefon zná svou polohu i trať, takže si sám spočítá, že se blíží
k cíli, a sám začne posílat častěji. Vzorec *„telefon si stáhne pravidla a řídí
se jimi sám"* projekt už má — přesně tak fungují okna závodních dnů
(`OknaEndpoints.ProTelefonAsync`: *„Telefon si je stáhne dopředu a řídí se jimi
i bez signálu; změna od pořadatele se projeví, až signál chytí."*).

**Kde je úzké hrdlo, a není tam, kde by se čekalo.** Změřeno v appce:

| Co | Jak často | Proč |
|---|---|---|
| **zápis polohy do telefonu** | `INTERVAL_MS` = **5 s** | *„Zápis do telefonu je zadarmo (GPS stejně běží)"* |
| **odeslání z telefonu** | `ZIVE_MS` = **60 s** | *„rádio žere víc než zápis"* |
| výdej poloh ze serveru | bez cache | — |
| obnova tabule | 5 s | — |
| odeslání upozornění ven | takt 60 s | viz výš |

**Telefon tedy má data už dnes po pěti sekundách a jen je nedoručuje.** Detailní
režim u cíle tedy neznamená měřit častěji, ale **poslat dřív, co už leží
v telefonu** — a to je rozdíl v ceně i v baterii. Ať se server a tabule zrychlí
jakkoliv, bez téhle změny dorazí poloha lodi u cíle až za minutu.

**Co k tomu v appce chybí: trať.** Endpoint `/serie/{serie}/zavody/{zavod}/trat`
i typ `VerejnaTratDto` jsou v `app/src/lib/schema.d.ts`, takže **appka trať
stáhnout umí** — jen to zatím nedělá; v `app/src/lib/tracker/` o trati není nic.
Bez ní telefon neví, kde cíl je, a Filipova věta platí jako potenciál, ne jako
fakt. Je to ale jediný chybějící díl: zbytek (vlastní poloha, lokální data po
pěti sekundách, vzorec se stahováním pravidel) je hotový.

> **Místo na citát z diskuse:** _(které změny mají chodit do telefonů — jen
> odložení a zrušení, nebo i zkrácení trati a změna úseku? A má to chodit všem,
> nebo jen posádkám té regaty?)_

### Hotovo 28. 10. 2026 (fáze 4.3)

**Pobídka vznikla**, přesně jak si ji `OdesilaniUloha` předem
pojmenovala. Minutový takt zůstal, protože **latence je funkcí fáze** —
spěšná zpráva úlohu probudí (`Pobidka`), místo aby se takt zkracoval
všem.

Co se připojilo:

- **`Odeslani.Spesne`** — příznak na úkolu. Zprávy, které minutu
  nesnesou, ho mají;
- **odložení a odvolání startu posílají zprávu** na `Odbery.Zavod`, tedy
  na odběr **regaty**, ne ročníku: odložený start na Jarním větru nemá
  budit telefony lidí, kteří jedou jinou regatu. Ten odběr byl
  připravený a nepoužitý — tohle je ta chvíle, pro kterou čekal;
- **probouzí se až po uložení**, ne při zařazení: zařazení je součást
  cizí transakce a ta může spadnout.

**Kontrola měří doručení, ne zařazení.** Když odběr nemá žádné zařízení,
napíše se to do logu — tentýž řetěz už jednou byl hotový a nefungoval
(26. 10. 2026), a prázdná fronta přitom vypadala jako úspěch.

**Co zůstalo stát, a vědomě:**

- **kolem cíle se nespěchá.** Dojezdy a konec rozjížďky jsou druhá
  rychlá fáze podle tabulky výš, ale dnes z nich žádná zpráva ven
  nechodí. Připojit je znamená napřed rozhodnout, **co by se posílalo**
  — „loď dojela" každému, nebo jen vlastní posádce? To je návrh, ne
  doplnění;
- **úzké hrdlo je v telefonu, ne na serveru** (`ZIVE_MS` = 60 s při
  zápisu po 5 s). Rychlejší server zprávě nepomůže, když ji appka
  vyzvedne až za minutu — ale appka je samostatná věc;
- **push nenahrazuje signál.** Odložení se podle ZPJ 27.3 signalizuje
  vlajkou, ne telefonem. Tohle je navíc: dosah tam, kam megafon
  nedoletí, a doklad, co bylo oznámeno a kdy.

### R19 — Velitelský čas: start se při výpadku ztratí, dojezdy ne

*Původ: střípek 14. Doloženo:
`web/app/sprava/[serie]/vysledky/[zavod]/[cislo]/cil/cil.tsx:271–290`,
`koncept.ts:23–28`, `Features/Zavody/VysledkyEndpoints.cs:211`. Stav:
**hotovo 28. 10. 2026** — bod 1 ve fázi 1.2, body 2 až 4 ve fázi 3.2
(viz konec nálezu). Potvrzeno Filipem 27. 10. 2026 (*„super tak si to zapiš
že to budeme chtít dodělat"*), předávání velení rozhodnuto 28. 10. 2026.
Doložená příčina skutečné události.*

Filip: *„Stalo se nám, že při startu z webovými hodinami došlo k přerušení
spojení a to pokazilo start a renomé."*

**Příčina je v kódu a dá se ukázat na třech řádcích.** Čas se bere **lokálně**,
to je v pořádku:

```tsx
const v = kdy ?? new Date().toISOString();
```

Ale když odeslání selže, **klepnutí se zahodí**:

```tsx
} catch {
  setStart(puvodni);          // ← stav se vrátí, jako by se neklepalo
  setKonec(puvodniKonec);
  setChyba("Start se nepodařilo uložit. Zkus to znovu.");
}
```

A *„zkus to znovu"* je u startu rada, která nejde splnit: **ten okamžik už
uplynul** a druhé klepnutí zapíše pozdější čas.

**Nejhorší na tom je, že projekt tenhle problém jinde vyřešil — a start z toho
vypadl.** Rozdělaný zápis z cíle přežívá v úložišti prohlížeče
(`koncept.ts`, *„u zápisu z vody často jediná kopie klepnutí, která neprošla na
server"*). Jenže koncept nese jen tohle:

```ts
export type Koncept = {
  otisk: string;
  kdy: number;
  dojeti: DojezdKonceptu[];
  kody: Record<number, string>;
};
```

**Žádný `start`.** Dojezdy tedy výpadek přežijí a start ne — ačkoliv je to
jediné klepnutí dne, které se nedá zopakovat. A `DEN-ZAVODU.md` k tomu radí
*„kartu nezavírat a neobnovovat"*, což startéra po neúspěšném startu nechá
stát nad obrazovkou, která tvrdí, že se nejede.

**Co z požadavku plyne, a co už pro něj stojí.**

Filipův *velitelský čas* je **jeden autoritativní čas, držený lokálně
a nezávislý na spojení**, který se po připojení rozešle ven a srovná ostatní.
Z toho, co aplikace má:

| Díl | Stav |
|---|---|
| čas z klienta, ne ze serveru | **je** — `odstartuj` posílá vlastní ISO čas a server ho přebírá (`vstup?.StartV ?? cas.GetUtcNow()`) |
| přežití výpadku v prohlížeči | **je** — od 28. 10. 2026 i pro start (`koncept.ts`, `CekajiciStart`) |
| displej, který nezhasne | **je** — `useDisplejSviti` |
| porovnání dvou zápisů při rozporu | **je** — `podleRizika` a dvě tlačítka *Doplnit chybějící* / *Přepsat rozdílná* |
| opakované odeslání, až se signál vrátí | **je** — `setInterval(zkus, 30_000)` a událost `online` |
| jeden autoritativní čas mezi dvěma startéry | **je od 28. 10. 2026** — `Velitel` a `Veleni`; velitelův start nikdo jiný nepřepíše |

Takže **pět ze šesti dílů existuje** a čtyři z nich přímo na cílové obrazovce.
Chyběly dvě věci a **obě jsou od 28. 10. 2026 hotové**: dát start do konceptu
(fáze 1.2) a pojmenovat, čí hodiny platí (fáze 3.2) — obojí na konci nálezu.

**Hlavní a „slave" startér.** Filip: *„Startér může být jeden hlavní a druhý
slave u druhého bodu startovní čáry… Velitelský čas je ale jeden, je v rukách
hlavního startéra a nesmí být závislý."* Mechanismus pro rozpor dvou zapisovatelů
projekt má (scénář C7 v `docs/SCENARE-OVLADANI.md`, snímek na zapisovatele
a porovnání) — jenže ten řeší **dva rovnocenné zápisy**, kdežto tady je jeden
nadřízený. To je jiné pravidlo: ne „ukaž rozdíl a nech vybrat", ale „platí čas
hlavního".

### Hotovo 28. 10. 2026 — bod 1 (fáze 1.2)

**Klepnutí na start se už nezahazuje.** Čas jde nejdřív do telefonu
a odesílá se, dokud neprojde — stejně jako dojezdy od 23. 9. 2026. Dřív se
při selhání vrátil předchozí stav a obrazovka řekla *„zkus to znovu"*,
radu, kterou u startu nejde splnit.

**Proč vlastní záznam, a ne pole v `Koncept`.** Plán mluvil o tom, dát
start do konceptu; při psaní se ukázalo, že tam nepatří. Koncept je
**rozdíl proti serverovému zápisu** a drží si k tomu `otisk` — jenže
`otisk` se počítá i ze `startV` (`cil/page.tsx`), takže by si start měnil
vlastní podmínku použitelnosti. A smazání konceptu po úspěšném uložení sady
by ho vzalo s sebou. Start proto leží vedle, pod klíčem
`cil-start:{serie}:{zavod}:{cislo}`, ve stejném modulu `koncept.ts` —
jedno místo pro obojí, jak si ten modul v hlavičce vymiňuje.

Jak se chová:

- **odeslání se opakuje** po půl minutě a při události `online`, dokud
  neprojde. Opakuje se i při odmítnutí ze serveru (rozjížďka bez přijaté
  trati), protože po přijetí trati uloží ten **původní** čas — kdežto
  zahodit ho znamená vymyslet si nový;
- **jiný start na serveru nepřepisuje potichu**: obrazovka řekne, že
  v telefonu leží neodeslaný start, a nechá vybrat. Čí hodiny platí, je
  rozhodnutí, které projekt ještě neudělal (body 2–4, fáze 3.2);
- **zavřít kartu varuje** i kvůli startu, nejen kvůli neuloženým dojezdům.

*Změřeno v prohlížeči proti mocku (28. 10. 2026):* mock zabitý → klepnutí
na *Start* → lišta drží `0:31:13` a běží, hláška *„Start 0:31:13 čeká
v telefonu"*, v úložišti prohlížeče leží
`cil-start:2026-nanecisto:izolepa:2`. Po zapnutí mocku a události `online`
hláška zmizela, úložiště se vyčistilo a na serveru stojí
**`2026-10-27T23:31:13.273Z`** — tedy čas **klepnutí**, ne čas doručení
(o ~40 s později). To je ten rozdíl, o který u startu jde.

### Hotovo 28. 10. 2026 — body 2 až 4 (fáze 3.2)

**Velitelský čas je jeden a drží ho hlavní startér.** Filip, 27. 10. 2026:
*„Startér může být jeden hlavní a druhý slave u druhého bodu startovní
čáry… Velitelský čas je ale jeden, je v rukách hlavního startéra a nesmí
být závislý."*

**Co to v kódu znamená, a je to jedna věta:** start, který zapsal velitel,
**nesmí přepsat nikdo jiný** (`Veleni.ProcNesmiPrepsatStart`). Slave
u druhého bodu čáry zapisuje dojezdy, kódy i všechno ostatní dál — chrání
se právě ten jeden čas, kterým se měří celé pole. Opačně to jde: velitel
smí přepsat start kohokoliv, a je to i cesta ven z krize
(*„jakmile se připojí, dojde k nastavení nového velitele, převzetí času
a jedeme standard"*).

**Regata bez velitele se chová jako dřív.** Velení je nástroj pro den, kdy
jsou startéři dva; vynucovat ho tam, kde je startér jeden, by znamenalo
klepnutí navíc bez užitku. Vzít si ho ale musí jít i prvnímu, jinak by se
k němu nikdo nedostal — proto obrazovka nabízí *„Převzít velení"* i tehdy,
když nevelí nikdo.

**Předávání podle rozhodnutí z 28. 10. 2026** (bod 4 v oddílu *Co je
potvrzené k dodělání*):

- **slave o velení požádá** — klepne *„Přebírám velení"*, nikdy si ho
  nevezme sám;
- **server je autorita**, takže dva hlavní v datech nevzniknou. Starý
  hlavní se o ztrátě dozví při připojení; do té doby stejně nic neodešle;
- **jde to kdykoliv, i uprostřed odpočtu** — `Veleni.ProcNejdePrevzit`
  brání jedinému případu, totiž brát velení sám sobě;
- **po převzetí zůstane doklad.** `Velitel` je **řada záznamů, ne
  přepisovaný sloupec**: každý má `OdV`, `DoV` a `PrevzalId`. Přepsat jméno
  v jednom sloupci by doklad smazalo přesně tehdy, kdy je potřeba — a start
  je spornější než viditelnost poloh, u které projekt doklad vyžaduje už
  dnes.

**Telefon se ptá při každém připojení.** `GET …/vysledky/{zavod}/velitel`
vrací, kdo velí, jestli jsem to já, a celou historii. Bez toho by se
startér, kterému velení někdo převzal, o ztrátě nedozvěděl — a vznikli by
dva hlavní přesně tam, kde je rozhodnutí chtělo vyloučit. Je to tentýž
vzorec jako u oken závodních dnů (`OknaEndpoints.ProTelefonAsync`).

**Drobnost, která z psaní vyplynula:** po odložení i po všeobecném
odvolání se příznak *„start je od velitele"* **ruší**. Ten čas vzešel
z pravidla (ZPJ 27.3 a 29.2), ne z velitelových hodin, a starý přestal
platit — nechat příznak viset by znamenalo, že čas spočítaný serverem
nemůže opravit nikdo kromě velitele.

*Změřeno proti mocku a obrazovkou (28. 10. 2026):* Filip převzal velení
a zapsal start; Miloš jako druhý startér dostal **„Velitelský čas drží
hlavní startér"**; po jeho převzetí start přepsal a **Filip dostal tutéž
hlášku**. Doklad nese všechny tři záznamy i s tím, kdo komu velení vzal.
V prohlížeči stojí nad lištou *„Velení startu má Miloš Zvonař, takže jeho
start nepřepíšeš"*, a po klepnutí *„Velíš startu téhle regaty — tvůj čas
platí."*

> ### ✗ Moje poznámka o iPhonu byla chyba v uvažování — opraveno
>
> Napsal jsem, že *„startér s iPhonem by proceduru neměl"*, protože appka je jen
> pro Android. **Filip se právem ptá, proč by ji mít neměl** — a odpověď je, že
> měl. Chyba byla moje: z jeho slov *„mobilní aplikace startéra"* jsem usoudil
> na **nativní appku**, ačkoliv všechno, co dnes rozhodčí dělá, běží **ve webu
> v telefonu** — správa, cíl i trať (návod s. 20). Cílová obrazovka tam už dnes
> drží displej rozsvícený i rozdělaný zápis v prohlížeči, tedy přesně to, co
> procedura potřebuje. **Na iPhonu to poběží stejně jako na Androidu.**
>
> Jediné, co z té poznámky zbývá, je drobnost k ověření: Wake Lock API má Safari
> na iOS až od novějších verzí, takže na starém iPhonu může displej zhasnout.
> Neověřoval jsem od které — a na rozdíl od appky je to vlastnost zařízení, ne
> překážka v návrhu.

> **Místo na citát z diskuse:** _(jak se poznalo, že je start pokažený — všiml
> si toho startér hned, nebo se to zjistilo až u výsledků? A co se s tím pak
> udělalo?)_

### R13 — Vytlačená loď a rozjížďka zrušená pro bezpečnost: tři různé cesty, aplikace nezná ani jednu

*Původ: střípek 8 (Filip, 27. 10. 2026). Doloženo: ZPJ 32.1, 43.1, 61.4(b),
61.4(c), 61.4(d), `Features/Zavody/VysledkySprava.cs:156–177`,
`Features/Zavody/Workflow.cs` (`ProcNejdeBezDuvodu`). Stav: **zapsáno**.*

Filip: *„může nastat i situace, že se přerušila rozjížďka z důvodu bezpečnosti.
Všechny lodě najedou na návětrnou a vytlačí několik lodí mimo bojku a ty
z důvodu bezpečnosti uhnou mimo start, i když jsou v právu."*

**Pravidla na to mají tři různé odpovědi a liší se v tom, kdo je původcem.**
Rozlišit je je půl práce:

**(1) Komise zruší nebo odloží — a tohle je ta „přerušená rozjížďka".**
ZPJ 32.1 vyjmenovává příčiny zrušení po startu a jedna z nich padne přesně:

> *„(d) z jakýchkoli jiných příčin, které mají přímý vliv na **bezpečnost** nebo
> regulérnost závodění."*

Před startovním znamením je to místo toho odložení nebo zrušení podle 27.3.
Rozhodnutí je komise, nikdo o ně nežádá, a nese se vlajkou (N, N nad H, N nad A
se třemi zvuky).

**(2) Vytlačená loď protestuje na toho, kdo ji vytlačil.** Běžný protest podle
60 na porušení pravidla Části 2. Tahle cesta je v aplikaci celá mimo (K2).

**(3) Náprava — a tady je ta nepříjemná odpověď: vytlačená loď na ni nárok
nemá.** ZPJ 61.4(b) má pět důvodů a žádný na tu situaci nesedí:

| 61.4(b) | Co žádá | Vytlačená loď |
|---|---|---|
| (1) | nesprávné jednání **komise nebo pořadatele** | ne — vytlačily ji jiné lodě |
| (2) | **zranění nebo fyzická škoda** od lodi, která porušila Část 2 a byla potrestána | ne, když uhnula včas a bez doteku |
| (3) | zranění nebo škoda od nezávodícího plavidla | ne |
| (4) | poskytování **pomoci** podle 1.1 | ne |
| (5) | jednání lodi, které byl uložen trest podle **pravidla 2 nebo 69** | jen kdyby šlo o nečestné plachtění a proběhlo projednání |

Tedy: **uhnout správně a bez doteku se podle pravidel „nevyplatí"** — loď přijde
o start a nárok na nápravu nemá, protože ji nepoškodila komise. Zůstává jí
protest (2) a to, že je podle **43.1(a)** zproštěna viny, kdyby sama kvůli tomu
porušila pravidlo (*„Když loď v důsledku porušení pravidla donutí druhou loď
porušit pravidlo, potom je druhá loď za toto porušení zproštěna viny"*).

Praktický důsledek pro startéra: když je takových lodí několik, je cesta (1)
jediná, která to srovná pro všechny najednou — a proto se nejspíš pamatuje
právě ta.

**Co z toho aplikace neumí, a je to konkrétní.**

**Zrušit rozjížďku jde jen oklikou přes výsledky.** Samostatný úkon „zrušit
rozjížďku" neexistuje; `StavRozjizdky.Zrusena` nastaví jediné místo, a to
eliminace výsledků:

```csharp
if (na == StavVysledku.Eliminovano)
    rozjizdka.Stav = StavRozjizdky.Zrusena;
```

Je to tentýž rozpor pojmů jako u startu (K6, kde zápis času rozjížďku rozjede):
rozhodnutí **na vodě uprostřed jízdy** se musí vyjádřit jako zásah do
**výsledků**, které v tu chvíli ještě neexistují.

**A hlavně: důvod se nikam nezapíše.** `PrepniStavAsync` parametr `duvod`
přijímá, ale uloží ho jen u revize:

```csharp
if (na == StavVysledku.KRevizi) rozjizdka.DuvodRevize = duvod!.Trim();
```

a `Workflow.ProcNejdeBezDuvodu` ho vyžaduje **taky jen u revize** — s odůvodněním
*„Jinde by byl formulářové pole navíc u úkonu, který se dělá jedním
kliknutím."* U zrušení rozjížďky to neplatí: pravidlo 32.1 má čtyři různé
příčiny, zrušená rozjížďka mizí z poháru a bude se vysvětlovat. „Nefouká,
rušíme" a „vytlačili je z čáry, rušíme" vypadají v aplikaci stejně.

**Co naopak aplikace umí, a nikdo to zatím nepojmenoval.** ZPJ 61.4(d):

> *„Když je pochybnost o skutečnostech nebo o pravděpodobných výsledcích
> jakékoliv úpravy rozjížďky nebo závodu, musí protestní komise přijmout důkazy
> z vhodných zdrojů, **obzvláště před zrušením rozjížďky**."*

Záznam trasy s posuvníkem času (bod 10 návodu, přidáno 26. 10. 2026) je přesně
takový důkaz — a na tuhle situaci je ideální, protože vytlačení od bojky je
přesně to, co se z trasy pozná a z paluby ne. **Tracking tedy už dnes plní
pravidlovou funkci, kterou mu nikdo nepřipsal**, a 61.4(c) k tomu dodává, že
náprava smí znamenat i zrušení rozjížďky — tedy totéž rozhodnutí, jen cestou
přes projednání.

> **Místo na citát z diskuse:** _(stalo se to, nebo si na to vzpomínáš z jiných
> závodů? A zrušili jste celou rozjížďku, nebo se startovalo znovu?)_

---

### R20 — Oba dokumenty podepisují dva lidé, a aplikace nevede ani jednu z těch rolí

**Co dokládá vzor.** Vypsání má hned v záhlaví, na třetím a čtvrtém řádku:

> Ředitel závodu: Vladimír Janouš
> Hlavní rozhodčí: Miloslav Zvonař

a plachetní směrnice je **podepsaná oběma** na konci, ve dvou sloupcích
(*„Hlavní rozhodčí: … Ředitel závodu: …"*). Žádný z obou dokumentů nevydává
jeden člověk sám.

**Čím to je důležité.** U R1 zůstala otevřená otázka, kterou jsem si nedovedl
zodpovědět z pravidel: *„co přesně rozhodčí uznává — dokument, termín, nebo
obojí?"* Vzor na ni odpovídá tím, co je na papíře: **rozhodčí se u obou
dokumentů podepisuje jmenovitě**, a je u toho jmenovaný i ředitel závodu. Uznání
tedy není klepnutí na stav v kalendáři, je to **spolupodpis listiny**.

**Co má aplikace.** `Zavod` (`Features/Zavody/Zavod.cs:303`–`453`) vede
`Poradatel` jako text a `PoradatelId` jako záznam organizace. Nevede **žádnou
osobu** — ani ředitele závodu, ani hlavního rozhodčího. Role `rozhodci` v
`co-smim.ts` je oprávnění uživatele, ne funkce u konkrétní regaty: kdokoli s tou
rolí smí u kterékoli regaty všechno, co rozhodčí.

A `Vypsani.Navrh` dnes přiznává, že dokument je jen návrh:

> „Tohle vypsání sestavila aplikace z údajů o regatě. Vydává ho pořadatel
> a uznává rozhodčí; co v něm chybí, se musí doplnit, než se otevřou přihlášky."

Ta věta je správná, ale vyhýbá se jménům — a právě jména jsou to, co ze
vygenerovaného textu dělá vydaný dokument.

**Co z toho plyne.** Dvě kolonky u regaty (ředitel závodu, hlavní rozhodčí) a dva
úkony podpisu. Dokud tam nejsou, je vygenerované vypsání nepodepsaný koncept,
i kdyby mělo všechny ostatní body.

**Nezapsaná otázka pro Miloše:** je vypsání platné bez podpisu rozhodčího, nebo
stačí ředitel závodu a rozhodčí podepisuje jen směrnici? Vzor ukazuje obojí
podepsané oběma, ale to nemusí znamenat, že je to podmínka.

---

### R21 — Skutečné vypsání má třináct oddílů, které moje osnova J1 nemá, a dva z mých chybějících Miloš má

**Co osnova umí.** `Vypsani.Sestav` (`Vypsani.cs:126`) staví jedenáct bodů podle
Dodatku J1 a čtyři z nich nechává prázdné (`Vypsani.cs:136`, `138`, `139`, `140`):
Dráha, Kdy se poslední den už nestartuje, Lhůta pro změny bodování a Odepření
práva na odvolání.

**Dva ze těch čtyř Miloš skutečně vydává**, a vím teď i jak:

| Prázdný bod | Jak to stojí ve vzoru | Kde |
| --- | --- | --- |
| J1.3(7) *Kdy se poslední den už nestartuje* | „Žádná rozjížďka nebude startována po 16:00 hod." | vypsání, Časový plán |
| J1.3(4) *Dráha* | „start a cíl u koupacího mola Mariny Orlík, čára je tvořená zelenou bójí a lodí rozhodčích … po startu směr Husárna ‚dráty', obeplout točnou bóji levobokem a zpět do cíle" | směrnice, Trať dráhy |

Dva zbylé (lhůta pro změny bodování, odepření práva na odvolání) **ve vzoru
nejsou ani v jednom dokumentu** — to je doklad, že je pohár nevyhlašuje, ne že by
se zapomněly.

**Třináct oddílů, které osnova nezná vůbec.** Po oddílech, jak jdou ve vypsání:

1. **Místo konání** — a to **třikrát, ve tří úrovních podrobnosti**: v záhlaví
   („Marina Orlík - Vltava - Orlická přehrada"), jako vlastní oddíl, a jako
   *Závodní plocha* („start v prostoru koupacího mola a zelené bóje před Marinou
   Orlík"). `Zahlavi()` přitom píše natvrdo „Místo konání: neuvedené"
   (`Vypsani.cs:172`) a v komentáři to hájí tím, že `Zavod` ten údaj nevede.
   Nevede — a vzor ukazuje, že je to povinná položka, ne volitelná.
2. **Kategorie reklamy** — World Sailing „Reklamní kodex", boční čísla a reklama
   sponzora po stranách trupu, akreditace médií u ředitele závodu.
3. **Účast** — požadavky na posádku a loď; vlastní nález R25.
4. **Startovné jako číslo** („450,- Kč/loď") a *kdy se platí* („při registraci").
   Aplikace má `Startovne` jako volný text, okamžik platby nevede.
5. **Časový plán celého dne** — registrace 9:00–10:00, zahájení a rozprava 10:30,
   start 11:00, poslední start 16:00, ukončení 19:00. Aplikace zná jeden čas
   (`PrvniVyzyvaciZnameni`); vlastní nález R27.
6. **Kde budou směrnice k dispozici** („při registraci na vývěsní tabuli").
7. **Bodovací systém** jmenovitě („nízkobodový systém podle pravidla A2") — tenhle
   osnova má a generuje ho dobře.
8. **Protestní komise** — místo („vyhrazená místnost Mariny Orlík") a **protestné
   200 Kč**; směrnice k tomu dodává **lhůtu: do 1 hodiny po ukončení rozjížďky**.
   Obě čísla jsou vstup pro fázi 5, která protesty nezná (K2).
9. **Ceny a kategorie** + **podmínka platnosti závodu**; vlastní nález R24.
10. **Televize a média** — právo pořadatele na záznam bez náhrady.
11. **Odpovědnost a pojištění** — „na vlastní nebezpečí", „za neomezeného lodního
    provozu v prostoru závodní dráhy", povinné pojištění, zřeknutí se
    odpovědnosti pořadatele. Souhlas verze 2 (`Souhlas.cs:93`) první dvě věci
    pokrývá, zbytek je text pořadatele a do souhlasu nepatří.
12. **Ubytování a občerstvení** — ve směrnici i „vlastní na lodích".
13. **Kontakty** — mail a telefon rozhodčího.

**Co z toho plyne.** Osnova J1 je správná jako *minimum podle pravidel*, ale
Milošovo vypsání je **dvakrát delší** a ten přebytek není ozdoba: reklamní kodex,
pojištění a právo na záznam jsou právě ty věty, kvůli kterým se vypsání vydává.
Aplikace z třinácti oddílů neumí vygenerovat ani jeden.

**Nezapsaná otázka pro Miloše:** které z těch třinácti se mezi ročníky mění, a
které jsou pořád stejné? Co je stejné, patří k seriálu (jednou napsat), ne ke
každé regatě.

---

### R22 — Směrnice nese tatáž data, která aplikace vede sama, a nic je nedrží v souladu

**Co jsem v kódu tvrdil.** `PlachetniSmernice` hájí, proč je směrnice **soubor**:

> „Soubor, ne text v databázi. Směrnici píše pořadatel ve Wordu a vydává jako
> PDF. Převádět ji na bloky by znamenalo přepisovat cizí úřední text a riskovat,
> že se naše verze rozejde s tou, podle které se jede."

**Co vzor ukazuje.** Ta jednostránková směrnice je **z větší části seznam údajů,
které aplikace vede taky**:

| Údaj ve směrnici | Kde týž údaj žije v aplikaci |
| --- | --- |
| „5 minut vyzývací znamení / 4 minuty přípravné / 1 minuta / 0 start" | `Zavod.DelkaProceduryMin` (`Zavod.cs:412`), `Procedura` |
| „start a cíl … zelenou bójí a lodí rozhodčích" | `DruhZnaceni.Plavidlo` (`Boje.cs:260`), `TypPrvku.Start` / `Cil` |
| „obeplout točnou bóji levobokem" | `TypPrvku.OtocnaBoje` + `StranaPrvku.PoLeve` (`PrvekTrati.cs:100`) |
| „znaky plavební dráhy platí a obeplouváme je správným směrem" | `DruhZnaceni.DrahaPrava` / `DrahaLeva` (`Boje.cs:241`) |
| „Bodování: Nízkobodový systém" | `PravidlaBodovani` |
| „Protesty … do 1 hod … s vkladem 200,- Kč" | nikde |
| „Startovné 450,- Kč za loď" | `Zavod.Startovne` |
| časový program dne | `PrvniVyzyvaciZnameni` (jen jeden čas) |

**Čím to je vada.** Argument v komentáři („nerozejít se s tou, podle které se
jede") platí pro **text** — pro věty o odpovědnosti, ubytování a pořadateli. Pro
**čísla a trať** říká přesný opak: dnes jsou v aplikaci dvakrát, jednou v datech
a jednou v neprůhledném PDF, a **nic nekontroluje, že se shodují**. Když se na
rozpravě změní trať v aplikaci, PDF zůstane s původní.

U vypsání jsem tuhle vadu vyřešil a napsal to tam jako hlavní zisk: *„bodování
se vypisuje z týchž čísel, podle kterých se počítá, takže se s výpočtem nemůže
rozejít."* U směrnice totéž řešené není.

**Co z toho plyne.** Dvě možnosti a vybírat nemám já:

- **Směrnice se taky generuje** z dat (jako vypsání) a nahrané PDF je příloha
  navíc. Konec dvojího zdroje, ale rozhodčí ztrácí Word.
- **PDF zůstane**, a aplikace u vyvěšení ukáže, co o týchž údajích ví sama, aby
  si rozhodčí všiml rozdílu. Levnější, dvojí zdroj ale zůstává.

> **Upřesnění 28. 10. 2026 večer — a je to oprava mé vlastní nepravdy.**
> V přehledu stavu jsem napsal, že *„Miloš to odložil"*. **Neodložil.** Filip se
> zeptal, co přesně odložil, a odpověď je: odložil **formu ke stažení** (R2,
> *„teď stačí zdroj jak máme"* — tedy PDF versus zdrojový text), nikoliv
> směrnici jako předlohu pro data. O té neřekl ani slovo proti — naopak ji
> **sám navrhl**: *„V plachetních směrnicích je veškeré info k závodu, takže
> i časy a trať … a dá se využít přeset časů rozpravy a jiných bodů
> organizace."* Správný stav tedy není „zavřené", ale **nerozhodnuté kdy**.
>
> **Co konkrétně by předvyplnila.** Ve vzoru z roku 2026 stojí šest údajů,
> které aplikace dnes **neumí vůbec, nebo je vypisuje jako prázdné**:
>
> | Ve směrnici stojí | V aplikaci dnes |
> | --- | --- |
> | „16:00 Poslední možný start rozjížďky" | bod J1.3(7) je `null` (`Vypsani.cs:139`) |
> | „start a cíl u koupacího mola … točnou bóji levobokem" | bod J1.3(4) *Dráha* je `null` (`Vypsani.cs:137`) |
> | „start s minutovým pravidlem s obeplouváním konců" | nikde (R23) |
> | „Zrušení rozjížďky: dva dlouhé zvuky" | nikde (R23) |
> | „Protesty … do 1 hod … s vkladem 200,- Kč" | nikde |
> | „Místo konání: Orlická přehrada – Marina Orlík" | zadrátované *„Místo konání: neuvedené"* (`Vypsani.cs:172`) |
>
> Takže ano: **dvě ze čtyř prázdných položek vypsání a oba chybějící údaje
> o startu leží v listině, kterou Miloš každý rok sám píše.** To není „nice to
> have", to je zdroj pro věci, které dnes v dokumentu chybí.

**Nezapsaná otázka pro Miloše:** psal by směrnici v aplikaci, kdyby z ní vypadlo
PDF se stejnou hlavičkou, nebo je Word podmínka?

---

### R23 — Dva údaje o startu ze směrnice aplikace neumí vůbec, a oba rozhodují, co se smí zapsat

**Co stojí ve směrnici.** Dva řádky, každý o jedné větě:

> Start: start s minutovým pravidlem s obeplouváním konců.

> Zrušení rozjížďky: !!dva dlouhé zvuky!!

**První řádek je režim startu.** Tedy to, co Miloš ve střípku 9 jmenoval jako
„alternativní trest" a co se v aplikaci po R14 projevilo jako kódy `Zfp`, `Ufd`
a `Bfd` v `KodVysledku`. Jenže komentář u toho výčtu (`Zavod.cs:205`) sám říká,
že *„co znamenají a kdy se dávají, rozhoduje vypsání, ne tenhle výčet"* — a
**aplikace nikde nevede, který režim pro tuhle regatu platí**. Rozhodčí u startu
tedy dostane na výběr tři kódy bez vodítka, který z nich je ten dnešní.

A „s obeplouváním konců" je **druhá polovina téhož pravidla**: loď, která
odstartovala předčasně, se musí vracet kolem konce startovní čáry, ne přes ni.
Aplikace tohle nezná v žádné podobě.

**Druhý řádek je signalizace zvukem.** Dva dlouhé zvuky, ne vlajka. Je to
**první písemný doklad** k R16 a ke střípku 10 („U Miloše jsem nikdy vlajky
neviděl"): signalizace není improvizace megafonem navzdory směrnici — **tak je to
ve směrnici napsané**. To R16 nevyvrací, zpevňuje: formální mez (bez vizuálního
znamení nejsou tresty podle ZPJ 30) platí dál, ale pohár si zvukovou signalizaci
**vyhlašuje**, a to je přesně ta cesta, kterou R7 označil za jedinou možnou pro
vlastní pravidlo.

**Co z toho plyne.** Jedna kolonka u regaty — režim startu — a směrnice i vypsání
ji vypisují. Zápis výsledku pak nabídne jen kódy, které k tomu režimu patří.
Zvuková znamení patří do stejné kolonky jako text.

---

### R24 — Kategorie je v aplikaci jen jméno; pravidlo, podle kterého do ní loď patří, je ve vypsání a nikde jinde

**Co stojí ve vypsání.** Tři kategorie a **pravidlo zařazení**:

> - Lodě s délkou trupu do 7 m
> - Lodě s délkou trupu nad 7 m
> - RACE

> Délka trupu se bere podle technického průkazu lodě, ke které se přičítá délka
> čelenu /pokud je použit pro kotvení přední plachty/

A **podmínka platnosti**, kterou jsem dosud neviděl nikde:

> Podmínkou pro platnost závodu je dokončení alespoň 1 platné rozjížďky, účast
> alespoň 2 posádek v dané kategorii.

**Co má aplikace.** Kategorie je **název a pořadí** a nic jiného
(`tools/gen-mock.py:520`: `{"nazev": "Race", "poradi": 1}`). Zařazení lodi do
kategorie zadává člověk. Délku trupu ani čelen aplikace nevede — grep po
`delkaTrupu`, `technickyPrukaz` a `pojisteni` ve `Features/` nevrací nic.

Podmínku platnosti nezná taky nic: grep po `platnaRozjizdka`, `minimalniPocet`
a `PlatnostZavodu` je prázdný. Aplikace tedy **vyhlásí pořadí v kategorii
s jednou lodí**, i když to podle vypsání není platná kategorie.

**Čím je to horší, než to vypadá.** „Nad 7 m" a „do 7 m" nejsou třídy v jachtařském
smyslu, jsou to **měřitelné rozsahy**, a čelen je právě ten sporný detail, kvůli
kterému se u papírové přejímky loď přeřadí. Dokud aplikace délku nevede, nemá
jak ukázat, že je zařazení správné — a u výsledků se o kategorii hraje.

**Co z toho plyne.** Dvě věci, které jdou po sobě: délka trupu a čelen jako údaj
lodi (zařazení se pak spočítá a jde ukázat, z čeho vyšlo), a podmínka platnosti
jako kontrola před vyhlášením. Druhá se dá udělat i bez první.

---

### R25 — Požadavky na loď a posádku: aplikace z nich nevede ani jeden, a vede místo nich číslo ČSJ, které vypsání nežádá

**Co stojí ve vypsání**, v oddílu Účast:

> Alespoň jeden člen posádky lodě musí být držitelem platného **Průkazu
> způsobilosti vůdce malého plavidla** … Loď musí mít **platný technický
> průkaz**.

a v Přihláškách:

> Přihlášené lodě mohou být požádány o předložení platného technického průkazu
> a **platného pojištění**

a v Odpovědnosti: *„Každá loď musí mít platné pojištění."* Totéž potvrzuje
směrnice (*„V případě poškození lodě pořadatel neposkytuje náhradu"*).

**Co má aplikace.** Ani jedno z těch tří. Zato vede `CisloCsj` — a ve vypsání
**není ČSJ zmíněné ani jednou**. Požaduje se World Sailing (pravidla a reklamní
kodex) a státní průkaz VMP, ne členství ve svazu.

To není nové, ale je to **první doklad v listině**: potvrzuje střípek 4 a 5
(*„není zahrnut do CTL", „jen ty pravidla dodržujem a s ČSJ komunikujeme"*) a
staví `CisloCsj` do podivné pozice — je to jediné pole o způsobilosti, které
aplikace vede, a je z těch čtyř to jediné, které vypsání nežádá.

**Co z toho plyne.** Tři příznaky u lodi (VMP u posádky, technický průkaz,
pojištění) a rozhodnutí, co s `CisloCsj`: nechat jako dobrovolný údaj pro ty,
kdo členství mají, nebo zrušit. Zrušit bych nenavrhoval — závodníci ho dávají
rádi a jinde se hodí.

**Pozor na záměnu.** Nic z toho neznamená vybírat doklady do aplikace. Vypsání
říká *„mohou být požádány o předložení"* — kontrola je fyzická u registrace. Co
aplikace potřebuje, je **zaznamenat, že se to zkontrolovalo**, ne skladovat
skeny.

---

### R26 — Nezletilý závodník: vypsání žádá podpis dospělé osoby, souhlas verze 2 ten případ nezná

**Co stojí ve vypsání:**

> Přihláška musí být podepsána kormidelníkem. Podpisem se zavazuje, že bude
> dodržovat ustanovení Závodních pravidel jachtingu.
> **U závodníka mladšího 18 let musí být přihláška podepsána dospělou osobou,
> která přebírá odpovědnost za závodníka.**

**První větu máme a sedí.** `Souhlas.ZneniV1` (`Souhlas.cs:59`) začíná
*„Souhlasím s tím, že budu vázán Závodními pravidly jachtingu…"* — to je přesně
ten závazek, který vypsání od podpisu čeká. Ověřeno proti listině, ne proti
pravidlům.

**Druhou větu nemáme vůbec.** Souhlas v aplikaci odklikává přihlášená loď sama
za sebe; `Ucast` nevede datum narození kormidelníka ani odpovědnou osobu, takže
aplikace nemá jak poznat, že je případ jiný, ani kde by druhý podpis uložila.

**Jak velký případ to je.** Nevím, a nemám z čeho odvodit — u kajutových
plachetnic bude nezletilý kormidelník vzácný, ale VMP se vydává od 18 let, takže
nezletilý **kormidelník** je asi vyloučený už tím. Pravděpodobně se to týká
nezletilého **člena posádky**, a tam vypsání mluví o „závodníkovi", ne
o kormidelníkovi. To je rozdíl, který se nedá dočíst.

**Nezapsaná otázka pro Miloše:** týká se ten odstavec kormidelníka, nebo
kteréhokoli člena posádky? A stalo se to někdy?

**Vazba na R9.** Tahle otázka visí u téže věci jako ta otevřená z R9 (co
s loděmi, které stihly odkliknout souhlas verze 1) — obě jsou o tom, že souhlas
dnes zná jen jeden případ.

---

### R27 — Aplikace chce čas vyzývacího znamení; ani jeden ze dvou skutečných dokumentů ho neuvádí

**Co aplikace žádá.** `PrvniVyzyvaciZnameni` (`Zavod.cs:397`) je čas T−5 a
`VyzyvaciZnameni()` ho vypisuje jako položku J1.1(6) s odůvodněním v komentáři:
*„J1 chce čas vyzývacího znamení, tedy T−5 podle ZPJ 26, ne čas startu."*

**Co dokument píše.** Vypsání:

> 11:00 Start rozjížďky

a směrnice:

> 11:00 předpokládaný start 1. rozjížďky

**Ani jeden neuvádí vyzývací znamení.** Oba uvádějí **čas startu**, a směrnice ho
ještě označuje za *předpokládaný*. Čas vyzývacího znamení (10:55) by si rozhodčí
musel dopočítat, aby vyplnil kolonku, kterou aplikace žádá — a pak ho aplikace
zobrazí jako údaj dokumentu, který v dokumentu nikdy nestál.

**Čím to je přesně ta vada, kterou tahle oponentura hledá.** Ze tří otázek, se
kterými začala, je to odpověď na druhou: *„co po rozhodčím aplikace chce, co
chtít nemusí?"* Pravidla mají pravdu, že závazný je okamžik vyzývacího znamení —
ale **lidé plánují den podle startu** a oba dokumenty to tak píšou. Aplikace si
může dopočítat T−5 z `DelkaProceduryMin` sama; obráceně nutí rozhodčího počítat
ručně to, co umí sama.

A ještě: „předpokládaný" není opatrnost, je to **pravdivý popis** — poslední
možný start je 16:00 a mezi tím se jede, kolik se dá. Kolonka, která chce jeden
přesný čas, tohle neumí vyjádřit.

**Co z toho plyne.** Zadávat **čas startu** a vyzývací znamení dopočítat, s tím,
že v dokumentu stojí obojí a je vidět, které je které. Změna jedné kolonky
a jedné nápovědy; obsah vypsání se tím zpřesní, ne zhrubne.

---

### R28 — Dlaždice: Miloš je vyjmenoval podruhé, jinak než poprvé, a jeden název je významový posun

**Co řekl teď** (nahrávky 17 a 18), pro nepřihlášeného v tomhle pořadí:

1. vypsání závodu
2. plachetní směrnice
3. **předpokládaná trať**
4. startovní listina
5. výsledky

a pro přihlášeného se **za předpokládanou trať** vloží *přihláška k závodu*,
tedy na třetí místo z šesti. *„A to je asi všechno."*

**Co řekl 27. 10. 2026** (střípek 6, WhatsApp): *„Vypsani zavodu - plachetni
smernice - zavodni trat - prihlasky - startovni listina"*.

**Dvě změny mezi tím, a ani jedna není přeřeknutí:**

| | 27. 10. | 28. 10. |
| --- | --- | --- |
| třetí položka | „závodní trať" | **„předpokládaná trať"** |
| výsledky | nebyly | **jsou, jako poslední** |
| přihláška | na čtvrtém místě | na třetím, výslovně „za předpokládanou trať" |

**Ten přívlastek je nález sám.** „Závodní trať" zní jako hotová věc, kdežto
**„předpokládaná trať"** říká, že to, co je před závodem vyvěšené, je návrh —
a to sedí s tím, co aplikace dělá: trať se **přijímá** (`Zapis`,
*„Bez přijaté trati se nestartuje"*, Filip 15. 10. 2026) a za jízdy se smí
změnit (nahrávka 22). Veřejná dlaždice se tedy nemá jmenovat „trať", má se
jmenovat „předpokládaná trať", jinak slibuje víc, než je pravda.

**Co z toho plyne pro R10.** Ten nález tvrdil, že Miloš jmenuje pět položek
a aplikace má pět jiných. Výčet je teď **šest** položek s pevným pořadím
a jedním přejmenováním — a je to druhé nezávislé vyjmenování téhož, což je
u požadavku vzácné. Dvakrát jmenované a stejně seřazené položky jsou to nejlepší
zadání, jaké se dá dostat; rozdíly výš nejsou nejistota, ale upřesnění.

---

### R29 — Čtyři třídy od nové sezóny: zadání, které je konfigurace, ne kód

**Co řekl** (nahrávka 20):

> „od nový sezony uprav třídy na do sedmi metrů, nad sedm metrů lehký, nad sedm
> metrů těžký a race … budou čtyři kategorie, třídu nad sedm metrů chci
> rozhodit, aby měly větší motivaci závodit."

**Důvod je sportovní, ne technický:** dnešní „nad 7 m" míchá lodě, které se
nemají jak porovnat, takže se jim nechce závodit. Rozdělením na lehký a těžký se
zvedne motivace. To je přesně ten druh rozhodnutí, které smí udělat jen rozhodčí.

**Dobrá zpráva: aplikace to umí dnes.** `Kategorie`
(`Features/Serial/Serie.cs:70`) patří **sérii**, ne závodu, nese jen `Nazev`
a `Poradi` a komentář u ní říká: *„Dá se přidat i přejmenovat."* Pro ročník 2027
to tedy znamená jednu změnu v číselníku ročníku, žádnou migraci a žádné nasazení.

**Špatná zpráva: pravidlo zařazení pořád nikde není.** To je nález R24 — délku
trupu ani čelen aplikace nevede, takže loď do kategorie zařadí člověk. A teď to
bude o jednu úvahu horší: *„nad sedm metrů lehký"* a *„těžký"* se nerozhodnou
podle délky, ale podle **hmotnosti nebo typu lodi**, což aplikace nevede už vůbec
a vypsání 2026 to jako kritérium nezná. Bez toho se do dvou nových tříd bude
zařazovat ručně a nepřezkoumatelně.

**Nezapsaná otázka pro Miloše:** podle čeho se pozná lehký a těžký? Hmotnost
z technického průkazu, konstrukce, nebo to rozhodnete případ od případu? A má
„do sedmi metrů" zůstat jedna třída?

**Pozor na okamžik.** *„Od nový sezony"* — ročník 2027 je už naimportovaný
(2. 10. 2026) a lodě v něm mají kategorii. Změna tedy není jen přidání dvou
řádků, ale i přeřazení přihlášek, které už existují. To je úkon, který musí
udělat rozhodčí, ne kód.

---

### R30 — Celý tok ovládání od rozpravy po odstartování, jak ho Miloš popsal sám

Nahrávka 21 je **dvě minuty nepřerušeného zadání** a je to první věc za celou
diskusi, kde Miloš nepopisuje, co mu chybí, ale **co má appka dělat**, krok za
krokem. Tohle je přepsané do kroků, ne převyprávěné:

| # | Krok | Co k tomu aplikace má |
| --- | --- | --- |
| 1 | Po rozpravě **nastavit předpokládaný čas startu** | Postaveno 28. 10. (fáze 1.1, nález K6) — ale jen na webu |
| 2 | Procedura je **T−5**, začíná pět minut před startem | `DelkaProceduryMin`, výchozí 5 |
| 3 | *„budu na lodi a budu připravený a zmáčknu začátek"* → **jedno tlačítko** | `POST …/procedura` se `Spustit`; v appce není |
| 4 | **Odpočet s intervaly**: vyzývací v 5., přípravné ve 4., minuta, start | Nikde — ani web, ani appka |
| 5 | V **poslední minutě**: přerušit interval / přerušit start / zrušit start | `Odlozit` a `Odvolat` v API jsou; v appce ne |
| 6 | **Druhá dlaždice: alternativní trest** → seznam jmen všech přihlášených | Kódy `Zfp`/`Ufd`/`Bfd` jsou; obrazovka ne |
| 7 | Když dlaždice nepoužije → **„start / odstartováno"** | `POST …/start` je |
| 8 | Po startu **zůstává** zrušení startu i alternativní trest | — |
| 9 | Když je nepoužije, **sekvence se ukončí** a rozjížďka jede | `StavRozjizdky.Probiha` |

**Jádro celého zadání je jedna věta** a není o funkci, je o rukách:

> „To by bylo fajn, kdybych na té aplikaci viděl, **abych nemusel držet stopky
> a současně aplikaci ještě houkačku a megafon**."

Startér má dvě ruce a v nich houkačku a megafon. Appka tedy nesmí být třetí věc,
kterou drží a obsluhuje — **musí odpočet odměřit a ukázat sama**, aby stopky
mohly zmizet. To je ta pravá míra úspěchu, ne počet obrazovek: *odejdou mu
z ruky stopky?*

**Proti tomu, co je dnes v appce:** ze devíti kroků výš neumí appka ani jeden.
Procedura je v `app/src/lib/schema.d.ts` jen jako typ z API a žádná z jedenácti
obrazovek start neovládá. `expo-keep-awake` v závislostech appky **není**, zatímco
Miloš 27. 10. řekl *„mobil mi nesmí usnout"* — bez toho telefon uprostřed
odpočtu zhasne.

**Dvě věci, které Miloš nezmínil a v appce stejně musí být:**

1. **Odpočet nesmí záviset na síti** (nález R19 a Filip 27. 10.: *„dokud nebude
   na připojení, tak si to apka odměří"*). Telefon musí odpočítávat z vlastních
   hodin a stav posílat, až to půjde.
2. **Čitelnost na slunci.** Z Milošových tří požadavků *„jednoduše a jedním
   tlačítkem, nesmí usnout, musím na něj dobře vidět"* je tenhle ten, který se
   u stolu nezměří vůbec — a proto má být v appce brzo, aby ho mohl ladit sám
   (Filip, 28. 10.).

---

### R31 — „Alternativní trest" znamená v Milošově slovníku dvě různé věci, a moje oprava R11 byla přestřelená

**Co se stalo dřív.** V R11 jsem „alternativní trest" vyložil jako otáčky podle
ZPJ 44. Miloš pak upřesnil, že myslel **startovní tresty podle pravidla 30**, a
R14 to zapsal jako opravu — R11 označený za odpověď na špatnou otázku.

**Co říkají nahrávky.** Výraz použil **dvakrát, ve dvou různých okamžicích**:

- **před startem** (nahrávka 21): *„V poslední minutě … Druhá dlaždice by měla
  být alternativní trest"* → to je pravidlo 30, jak řekl v střípku 9;
- **u cíle** (nahrávka 23): *„pokud mi přijde loď k cíli a nahlásí rozhodčímu, že
  dělala alternativní trest, tak bych měl možnost to tam jít zaznamenat"* → to
  je **otáčka podle ZPJ 44**, tedy přesně to, co jsem napsal v R11.

**Takže R11 nebyl špatně, byl neúplný** — a moje oprava přestřelila. Miloš má pro
oba úkony jedno slovo, protože z jeho strany je to tentýž děj: *loď si odbyla
trest sama, a já to zapíšu*. Rozdíl je, **kdy** a **co se zapíše**: před startem
kód výsledku, za jízdy odkroucené otáčky.

**Proč na tom záleží při stavbě.** Kdybych postavil jednu dlaždici
„alternativní trest", bude dělat dvě různé věci podle okamžiku — a to je ta
kategorie vady, kterou tahle oponentura hledá. Buď dvě dlaždice s různými názvy,
nebo jedna, která podle fáze ví, co zapisuje, a říká to na obrazovce.

**A ještě jedna věc z nahrávky 23:** dlaždice se má *„průběžně posouvat"* a být
**stále dostupná**. Zápis trestu tedy není krok v postupu, je to **trvale
přístupná věc** po celou rozjížďku. To je o rozvržení, ne o funkci.

---

### R32 — Miloš se ptá na přístupy sám, a je to otázka o jedné konkrétní obrazovce

**Co řekl** (nahrávka 19):

> „asi byste měl nějak nastavit přístupy, priority, kdy my jako pořadatelé nebo
> hlavní rozhodčí budeme potom moct nějak zasahovat do **startovní listiny**, do
> **upřesnění tříd** a všech těchto věcí."

**Co aplikace má.** Role (`Features/Identita/Uzivatel.cs:71`) jsou hierarchické
a `co-smim.ts` je jediná pravda o tom, kdo co smí. Oprávnění tedy existují —
jenže se udělují **na ročník nebo na zastávku**, ne na úkon. Kdokoli s rolí
`rozhodci` u téhle regaty smí všechno, co rozhodčí.

**Co se tedy opravdu ptá.** Ne „kdo má jakou roli" (to je vyřešené), ale **odkdy
dokdy** se do startovní listiny a do tříd smí sahat. To je otázka o **fázi**, ne
o roli: po uzávěrce přihlášek, po rozpravě a po startu je startovní listina
pořád editovatelná stejně, a nález R6 už říká, že editovatelná za běhu **být
musí** (nově přihlášená loď po startu). Takže to nejde zamknout — jde to jen
**ukázat**: kdo a kdy zasáhl.

**Vazba na R29:** „upřesnění tříd" je právě ta změna čtyř kategorií. Když se
třídy mění uprostřed ročníku, kde už lodě body mají, je otázka přístupu
podstatná — a aplikace dnes nevede ani to, kdo kategorii přihlášky změnil.

**Nezapsaná otázka pro Miloše:** má se dát startovní listina po startu zamknout,
nebo stačí, že bude vidět, kdo co změnil? Nález R6 říká, že zamknout nejde;
tohle je příležitost ověřit, že to tak chce.

---

### R33 — Cíl: ruční zápis i oprava toho, co určilo trasování, a oboje v jedné obrazovce

**Co řekl** (nahrávka 22):

> „pokud poběží trackování, tak jak to máš vymyšlený, tak bychom se měli posunout
> směrem k cíli, kde bych měl mít možnost zadávat zase lodě ručně průjezd cílem.
> A pokud to bude dělat trackování, tak bych tam měl mít možnost si to sám
> upravit, kdybych tam s něčím nesouhlasil."

**Dvě věci, a druhá je ta důležitá.** Ruční zápis dojezdů aplikace má (cílová
obrazovka, `POST …/konec`). Co nemá, je **přepsání toho, co určilo trasování** —
a Miloš to žádá výslovně a se správným důvodem: *„kdybych tam s něčím
nesouhlasil"*. Trasování počítá pořadí ze průjezdních bodů
(`docs/…`, nález *Pořadí na trati*), ale **rozhoduje rozhodčí**, ne výpočet.

**Čím je to vážné.** Výpočet, který nejde přebít, je u rozhodování horší než
žádný: rozhodčí pak buď vypne trasování celé, nebo podepíše pořadí, se kterým
nesouhlasí. Obojí je horší než tlačítko „tady to bylo jinak".

**Co dál v té nahrávce je.** *„Měl bych tam mít možnost úpravy tratě … doufám, že
ta se nebude často využívat."* To je **ZPJ 33** (změna úseku dráhy) — nález, který
v tomhle dokumentu dosud chyběl, protože `Features/Boje` drží jiná session. Miloš
k tomu sám dodává, jak často to čeká: zřídka.

**A nahrávka 24** zavírá kruh dvěma kroky, které aplikace zná jen zčásti:
odsouhlasení pořadí *„a eventuálně možnost v případě … protestů ze strany
závodníka do toho pořadí ještě šáhnout"* (protesty = fáze 5, nález K2), a pak
*„možnost zahájit nebo zadat druhou rozjížďku, nebo další následnou rozjížďku"*
(`POST …/rozjizdky` existuje, v appce ne).

---

### R34 — Appka kapitána: odpočet je sdílený stav, ne obrazovka rozhodčího

Nahrávka 25 otevírá **nový řez** — dosud šlo všechno o rozhodčího. A hned v něm
je jedna věta, která mění návrh startu z R30:

> „V podstatě by mohl vidět **stejnou startovní sekvenci, kterou vidím já**,
> akorát do ní nemůže zasahovat."

**Proč to je zásah do návrhu.** Kdyby odpočet běžel jako věc *uzavřená*
v telefonu rozhodčího, posádky by ho neviděly a tahle věta by nešla splnit.
Odpočet se tedy musí **rozesílat**: appka rozhodčího ho vydává, appka posádky
a tabule ho čtou (tabule už ho čte, `/nacrt/casomira`). Prakticky to znamená, že
`StartV` se musí dostat ven **už během procedury**, ne až po startu.

> **Pozor na to, jak snadno se z toho stane obrácená věta** (Filip,
> 28. 10. 2026). Napsal jsem tu původně, že odpočet „je stav regaty" a že
> `StartV` „musí být na serveru" — a to je tiché přesunutí autority na server.
> Tak to není a nesmí být: **zdroj je mobil hlavního startéra**, server je jeho
> odběratel. Celé pořadí je v oddílu *Pyramida autority* výš; rozesílání
> odpočtu je důsledek, ne změna toho, čí hodiny platí.

**Zároveň to nesmí popřít R19 a R30.** Odpočet musí držet i bez sítě (*„dokud
nebude na připojení, tak si to apka odměří"*), takže to je obojí: **velitelský
čas vzniká v telefonu rozhodčího a rozesílá se**, a když spojení chybí, telefon
běží sám a dorovná se, až to půjde. To už je zařízené (`StartOdVelitele`,
`Velitel`) — jen to musí umět i appka.

**Pět dalších věcí z téže nahrávky:**

| Co chce | Co aplikace má |
| --- | --- |
| Kapitán vidí seriál a **přihlásí se do závodu** | Má web i appka (přihlášení ověřeno 21. 10.) |
| Přihlášení **se projeví ve startovní listině** | Má — a nález R6 to hlídá i za běhu |
| **Kolonka platby startovného**, kde *„já potvrdím, že zaplatil"* | `Ucast.Zaplaceno` + `StartovnePoznamka` existují |
| **Aktualizace závodní komise** přicházejí do appky | Pushky jsou (nález R18, takt minuta) |
| Vidí **potvrzený čas startu a zahájení sekvence** | Plánovaný start je od fáze 1.1; sekvence nikde |

**A teď to, co zpevňuje R31 nad vší pochybnost:**

> „Měl by tam mít dlaždici alternativní trest **360 stupňů** a druhou dlaždici
> alternativní trest **720 stupňů**."

To jsou **otáčky podle ZPJ 44.2** — jedna otáčka a dvě otáčky — tedy přesně to
pravidlo, které jsem vyložil v R11 a které R14 označil za špatnou odpověď.
Miloš tím potvrzuje, že R11 byl věcně správný; jen nemířil na to, na co se Filip
tehdy ptal. **Oprava v R14 šla dál, než měla**, a R31 to srovnává: jedno jméno,
dva úkony, obojí z pravidel.

**Jedna věc, kterou Miloš sám omezil.** Potvrzení vykonaného trestu posádkou:
*„Možná by i mohl potvrdit po jeho vykonání, že ho vykonal, **ale abychom jim
nekomplikovali život**."* To je rozhodnutí proti vlastnímu návrhu a patří ho
respektovat: zápis trestu zůstává u rozhodčího, posádka ho jen **vidí**.
Souvisí to se střípkem o svědcích (*„je to pouze o důvěře a džentlmanství, nikdo
to nemusí potvrzovat"*).

**Nezapsaná otázka pro Miloše:** má kapitán vidět tresty ostatních lodí, nebo jen
svůj? Z nahrávky plyne jen *„že jsem mu dal"*, tedy svůj — ale startovní listina
je veřejná a kódy výsledků taky.

---

## Odpovědi na osm otázek — a co z nich plyne (28. 10. 2026, večer)

Miloš odpověděl na **sedm z osmi** otázek a ke dvěma věcem poslal zadání, na
které se nikdo neptal. Tohle je zápis odpovědí; nálezy, které se tím zavírají,
jsou u každé jmenované.

| Otázka | Jeho odpověď | Co se tím zavírá |
| --- | --- | --- |
| 1. Dva „alternativní tresty" | **Dvě dlaždice**, pojmenované podle příčiny: 360° za dotek bóje, 720° za dotek s lodí soupeře | R11, R14, R31 — a R11 byl celou dobu správně |
| 2. Přerušit / zrušit start | **Tři dlaždice u startu**: odklad startu (s novým časem), zrušit rozjížďku / neplatný start, OCS | R23 zčásti; otevírá R35 a R37 |
| 3. Lehký a těžký | *„Třída lehká, těžká, neřeš, pouze vytvoř dvě dlaždice tohoto typu, do tříd si je zařadíme sami."* | R29, R24 — **kritérium se nestaví** |
| 4. Kdo smí do listiny | *„Zásah do startovní listiny smí provést pouze rozhodčí. Úpravu výsledků smí provést pouze rozhodčí."* | R32 — a popírá dnešní kód, viz R38 |
| 5. Odkdy se posádky hlásí | Odpověděl na **přihlašování**, ne na trasování: *„Posádky se přihlašují po vypsání závodu. Po rozpravě už nesmí."* | mění R6, viz R39; **R3 zůstává otevřený** |
| 6. Vypsání bez podpisu | *„Pokud se zveřejní vypsání závodu, je platné i bez mého podpisu, nebo můžeme vytvořit elektronický podpis."* | R20 — nic neblokuje |
| 7. Nezletilý | *„Žádný z kapitánů není nezletilý."* | R26 — případ nenastává |
| 8. VMP a technický průkaz | *„Do přihlášky budeme požadovat číslo VMP a číslo technického průkazu, pokud ho loď má."* | R25 — a je to **změna formuláře přihlášky** |

Nezodpovězené zůstává jediné: **mez z pravidla 76.1(a)** u vyloučení (K4),
a z otázky 5 ta polovina o trasování (R3).

---

### R35 — OCS jako úkon: kód aplikace má, postup ne, a jedno slovo je potřeba doladit

*Původ: nahrávky 36, 37, 38. Doloženo: `Features/Zavody/Zavod.cs:228`
(`Ocs = 4`, *„Předčasný start"*), `:231` (`Dsq = 5`). Stav: **zadáno, nestavěno**.*

Miloš chce u startu dlaždici **OCS** a za ní celý úkon: napsat loď, která
pravidlo porušila, a pak zapsat, **že chybu odčinila, anebo neodčinila** — a
v druhém případě *„je diskvalifikovaná … nebo z rozjížďky"*.

**Co aplikace má:** kód `Ocs` existuje od začátku, i `Dsq`. Co nemá, je ten
postup — dlaždice, výběr lodě a ta jedna otázka „odčinila?".

**Jedno slovo je potřeba doladit, a je to otázka na Miloše, ne nález proti
němu.** Sám se v poslední nahrávce opravil z *„ze závodu"* na *„z rozjížďky"*,
takže rozsah má jasný. Zbývá název následku: loď, která byla na závodní straně
a nevrátila se, se **boduje jako OCS** — diskvalifikace (`Dsq`) je v pravidlech
jiná věc, výsledek jednání o protestu. Pro obrazovku to znamená jedinou otázku:
**má to zapsat `OCS`, nebo `DSQ`?** Na postup to nemá vliv, na výsledkovou
listinu ano.

---

### R36 — Dvě dlaždice otáček, a tím je R11 potvrzený

*Původ: nahrávky 26, 27, potvrzeno nahrávkou 25 (kapitán vidí totéž).
Doloženo: ZPJ 31, ZPJ 44.1 a 44.2. Stav: **zadáno, nestavěno**.*

- **360°** — *„podle pravidla 31, otáčka 360 stupňů za dotyk s bójí"*
- **720°** — *„podle pravidla 44.1 otáčky 720 za dotek s lodí soupeře"*

**Obsahově to souhlasí s pravidly**: jedna otáčka je trest za dotek značky,
dvě otáčky za porušení pravidla z části 2, tedy za dotek s jinou lodí.
Čísla, která jmenuje, míří jedno na **příčinu** (31) a druhé na **článek
o trestu** (44.1); samotné otáčky jsou 44.2. Na obrazovce je to rozdíl jen
v tom, co se napíše pod název dlaždice.

**A tím je uzavřená moje chyba z R14:** R11 vyložil „alternativní trest" jako
otáčky podle ZPJ 44 a bylo to **správně**; R31 to už napravil a tyhle dvě
nahrávky to potvrzují jmenovitě. Startovní tresty podle pravidla 30 (R14) jsou
**třetí věc** a Miloš pro ni teď má vlastní dlaždici: OCS.

---

### R37 — „Odklad startu" chce nový čas v jednom kroku; API to umí ve dvou a appka nijak

*Původ: nahrávka 35, poslaná jako **oprava** vlastního zadání. Doloženo:
`Features/Zavody/Procedura.cs:138` (`Odlozit => null`) a komentář na `:135–137`,
`DruhProcedury.Odlozit` na `:17`, plánovaný start z K6. Stav: **zadáno,
nestavěno**.*

Miloš: *„musím tam mít možnost napsat, v kolik bude start, posunutý start."*

**Tohle je dobrá zpráva, ne vada v rozhodnutí.** API odložení záměrně nechává
nový čas prázdný (ZPJ 27.3: odkládá se *„z jakékoli příčiny"* a kdy se pojede,
řekne startér) a zapsat ten čas umí od 28. 10. jako **plánovaný start** (K6).
Takže schopnost existuje — rozdělená na dva úkony.

**Co z toho zbývá:** aby to v appce bylo **jedno klepnutí a jedno políčko**.
Žádná nová schopnost, jen aby dlaždice *Odklad startu* sama nabídla čas.

---

### R38 — „Do startovní listiny smí jen rozhodčí" je proti tomu, co kód dnes říká

*Původ: nahrávka 30. Doloženo: `Features/Zavody/Prihlasky.cs:64–65`. Stav:
**zadáno, nestavěno — a je to změna práv, ne obrazovky**.*

Dnes stojí v kódu obojí, a druhá věta je přesně naopak:

```csharp
if (vylouceni && kdo != Kdo.Rozhodci) return "O vyloučení ze závodu rozhoduje rozhodčí.";
if (!vylouceni && kdo == Kdo.Rozhodci) return "Přihlášky vede pořadatel. Rozhodčí jen vylučuje.";
```

Miloš říká, že **do startovní listiny i do výsledků smí jen rozhodčí**. To je
odpověď na otázku 4 a zavírá R32, ale **otevírá jinou**: startovní listina je
výpis přihlášek a ty dnes vede pořadatel. Takže se musí rozhodnout, jestli
„zásah do startovní listiny" znamená

1. **přihlášky celé** přejdou na rozhodčího (pořadatel je jen eviduje), nebo
2. přihlášky zůstanou pořadateli a rozhodčí smí **měnit, kdo v rozjížďce
   startuje** — což je jiná věc než přihláška do závodu.

Na poháru je Miloš hlavní rozhodčí a Filip pořadatel, takže rozdíl je dnes
akademický. **V kódu ale ne**, a `Prava.cs` je jediná pravda o právech.

---

### R39 — Přihlašování se zavírá rozpravou, a to mění R6

*Původ: nahrávka 31. Doloženo: nález R6 (startovní listina editovatelná za
běhu), `docs/SOUPIS-A-PLAN-START.md` (mapa dotyků). Stav: **zadáno, nestavěno
— a opravuje dřívější závěr**.*

Miloš: *„Posádky se přihlašují po vypsání závodu. **Po rozpravě už nesmí.**"*

**V soupisu stálo, že zamknout startovní listinu nejde**, protože R6 žádá, aby
se nově přihlášená loď objevila i po startu. Tahle věta to obrací: zámek **je**
na místě, jen nestojí u startu, ale **u rozpravy**. R6 platí dál pro to, co se
na listině mění *jinak* než přihlášením (vyloučení, odhlášení, oprava třídy) —
ty po rozpravě jít musí.

Dvě věci jsou tím pádem jisté a jedna otevřená:

- **Jisté:** přihlašování se otevírá zveřejněním vypsání a zavírá rozpravou.
- **Jisté:** zámek se váže na **rozpravu**, kterou aplikace zná.
- **Otevřené:** co s loděmi, které přijdou po rozpravě — odmítnout, nebo pustit
  se souhlasem rozhodčího? Pravidla to řeší v ZPJ 76.1, a to je nezodpovězený
  nález K4.

---

### R40 — Čtyři třídy: „neřeš, zařadíme si je sami" je pokyn nestavět kritérium

*Původ: nahrávka 29. Doloženo: `Features/Serial/Serie.cs:70` (`Kategorie` nese
jen jméno a pořadí). Stav: **zavřeno jeho rozhodnutím — konfigurace, žádný
kód**.*

Miloš: *„Třída lehká, těžká, neřeš, pouze vytvoř dvě dlaždice tohoto typu, do
tříd si je zařadíme sami."*

Tím padá otázka 3 i celý R24: pravidlo zařazení (délka trupu z technického
průkazu plus čelen) **zůstane ve vypsání** a do kódu nejde. Kategorie jsou
dnes jen jméno a pořadí, takže čtyři třídy znamenají **dva nové záznamy**, ne
změnu modelu. Zařazení lodí udělá rozhodčí ručně.

Jediné, co zbývá rozhodnout, je ročník: 2027 je naimportovaný a lodě v něm
kategorii už mají. **Přeřazení existujících přihlášek je ruční práce, kterou
dělá on**, ne migrace.

---

### R41 — Posádka v prvních verzích komisi nic nehlásí

*Původ: Filip, 28. 10. 2026 večer, **potvrzeno Milošovým vlastním zaváháním**
v nahrávce 25. Stav: **rozhodnuto — hranice návrhu, ne odložená funkce**.*

Filip: *„Nevím, jestli lodě na startu by měly přes apku nějak něco oznamovat
komisi. Alespoň v prvních verzích ne."*

**Totéž řekl Miloš sám**, a na témže místě — u potvrzení vykonaného trestu:

> „Možná by i mohl potvrdit po jeho vykonání, že ho vykonal, **ale abychom jim
> nekomplikovali život**."

Dva lidé nezávisle na sobě došli ke stejné hranici, takže to není kompromis,
ale rozhodnutí: **appka posádky je odběratel, ne vstup.** Vidí startovní
sekvenci, svůj trest, svoje pořadí — a nemá kudy poslat komisi nic.

**Co to ruší.** Padá tím můj vlastní návrh z diskuse o R13 („jedny dveře
zvenčí, kterými loď nahlásí, že se jí stala neregulérnost, a rozhodčí to
zařadí"). Jako myšlenka drží, ale do prvních verzí nepatří — a je dobře, že to
Filip zastavil, protože hlášení od lodí je přesně ta věc, která by rozhodčímu
přidala práci na vodě místo aby mu ji ubrala.

**Co to nemění.** Potvrzení vykonaného trestu podle ZPJ 44 nikdy nebylo na
lodi: trest si loď odbyde na vodě a rozhodčí ho zapíše, až mu to u cíle
nahlásí (nahrávka 23). Pravidla tedy žádný vstup od lodě nevyžadují a aplikace
tím nic nedluží.

**Kde to platí v kódu.** Je to pravidlo pro posuzování návrhů, ne řádek: každá
obrazovka v `app/` pro kapitána smí **číst**. Jediná dnešní výjimka je
přihlášení do závodu a souhlas se ZPJ, což není hlášení komisi za jízdy, ale
vstup do závodu před ním.

---

## Odpovědi Filipa z kontrolního listu (28. 10. 2026, večer)

Filip prošel kontrolní list (soukromá stránka se 47 požadavky) a nechal v něm
**osm rozhodnutí a dvacet poznámek**. Tohle je jejich zápis. Tři z nich jdou
proti tomu, co řekl Miloš, a jsou vyznačené jako **kolize** — ne proto, aby se
Filip opravoval, ale protože se o nich musí vědět, než se to postaví.

**Jak čtu jeho zaškrtnutí.** Sloupce *Web / Appka / API* se ptaly, **kde to
dnes je**, ale Filip jimi odpovídal, **kam to patří** — u věcí, které v appce
nejsou (procedura, odklad, velitel, ruční zápis cíle), zaškrtl *Appka*, a
u nepostavených trestů, shody a protestů *API*. Beru to tedy jako jeho
rozvržení, ne jako popis stavu; stav drží `docs/STAV-RESENI.md`.

### Rozhodnutí, která padla

| Co | Rozhodnuto |
| --- | --- |
| **Mapa** (R4) | Zapne se **sama 10 minut před procedurou**, tedy T−15. Miloš mluvil o deseti minutách před startem; Filip to 29. 10. upřesnil na deset minut před procedurou |
| **Odkdy se hlásí telefony posádek** (R3) | **15 minut před procedurou**, tedy T−20 — a appka o tom musí vědět a sledování si zapnout |

**Tři časy, a to pořadí je důležité.** Telefony se rozběhnou první (procedura
−15), pak naskočí mapa (procedura −10) a pak začne odpočet (procedura, tedy
start −5). Má to vnitřní logiku: sledování musí žít dřív, než se mapa ukáže,
jinak se otevře prázdná. Miloš mluvil o *„10 minut před startem"*, Filip to
posunul k proceduře, takže mapa je ve skutečnosti T−15 a telefony T−20.
| **Ověřeno a Schváleno** (K3) | **Sloučit**, dokud protesty nejsou. Stavy pak: *zapisuje se → zapsáno / v revizi → potvrzeno* |
| **Směrnice jako předloha** (R22) | *„Zatím stačí to co je, do budoucna budeme dělat editor, ale teď je to předčasné."* |
| **Mez z pravidla 76.1(a)** (K4) | *„Neřešit, vyloučení zatím neřešit (je to hobby regata).“* Zavřeno |
| **Publikace aktualizací z CI** | Filip doplní `EXPO_TOKEN` do secrets |
| **Platba startovného** | Platí se u zápisu v klubovně, kapitán to vidí **jen na webu**; v appce by to bylo nadbytečné |
| **Zámek přihlašování rozpravou** (R39) | Zavře se rozpravou, ale **zadní vrátka pro mimořádné zapsání zůstanou** — jen se nenabídnou jako běžná cesta |

### Nová zadání, která z poznámek vyplynula

**Cílová obrazovka má dva módy, a přepíná se mezi nimi** (k R33, R36):

> *„Po startu by se měla automaticky zobrazovat trest mód a na cílovou by si to
> měl pak přepnout Miloš sám. Obě by měly dlaždice jedoucích lodí a seznam
> cílový/trestů. U trestů by pak po stisku lodi vyběhla sestava dlaždic
> s možnými tresty.“*

Tedy ne dvě dlaždice trestů vedle sebe, ale **jedna cesta: loď → sestava
trestů**. To zjednodušuje R36 a zároveň vysvětluje, proč má být trest dostupný
celou rozjížďku: je to mód obrazovky, ne krok v postupu.

**Dojezd z trasování jako návrh, ne jako zápis** (k R33):

> *„Jakmile tracker zaznamená průjezd cílem a nebude loď zapsaná že dojela, tak
> dojde k jakémusi ghost řádku (návrhu dojezdu trackerem) … Rozhodčí nebo
> zapisovatel to uvidí a bude to moci potvrdit anebo zamítnout, popř. posunout
> v pořadí a pak potvrdit.“*

Tím je zodpovězené, co znamenalo Milošovo *„kdybych tam s něčím nesouhlasil“*:
trasování nikdy nezapisuje, jen navrhuje. **Je to návrh, který nestojí a padá
na tom, jak dobře trasování měří** — a to je jeho hlavní přednost.

**Shoda v cíli** (K7): v cílovém listu půjde zaškrtnout stejný dojezd u dvou
lodí — prvek mezi dvěma řádky. Pak se body rozdělí podle pravidel.

**Startovní listina po rozpravě** (R38): *„Jakmile je po rozpravě, už to může
měnit jen rozhodčí. Pořadatel může změny ale navrhovat a rozhodčí to musí
schválit. Nebo můžeme využít roli Pomocník a ten by pak mohl měnit i startovní
listinu.“* Je to tedy **návrh a schválení**, ne odebrání práva — a příznak
pomocníka z K8 se tím rozšiřuje i na listinu.

**Stavba trati z appky** (nové): *„Pípání a focení bójí z appky v módu stavby
by asi mělo jít, trať ale schvaluje rozhodčí.“*

**Zrušení rozjížďky** (R17): nabídnout **nejčastější důvody** a volný text až
pro případ, že si nevybere — *„aby to nemusel klofat“*.

**Verze na stránce `/appka`** (nové): ukázat, jaká verze je venku, aby se dalo
zkontrolovat, co má člověk v telefonu.

---

### Kolize 1 — Posádka nemá vidět ani čas, ani sekvenci

*Filip proti R34 a proti Milošovým vlastním slovům. Nerozhodnuto — rozhodnout
to musí oni dva.*

Filip:

> *„Pokud bude mít server velitelský čas … ale je to potenciální zdroj chyb
> a hádek, že startovali podle appky. Může to posádku při neaktuálním čase
> zmást. Já bych čas ani sekvenci posádkám nedával, jen signalizoval stav
> startovní procedury a rozjížďky nějakou barvou.“*

Miloš (nahrávka 25):

> *„V podstatě by mohl vidět stejnou startovní sekvenci, kterou vidím já,
> akorát do ní nemůže zasahovat.“*

**Oba mají pravdu z jiné strany.** Miloš mluví o tom, co posádka potřebuje
vědět; Filip o tom, co se stane, když se telefonu na lodi nedovolá síť a odpočet
na něm půjde pozadu — loď odstartuje podle appky a bude se hádat. Pyramida
autority dává za pravdu Filipovi: posádka je stupeň, který jen odebírá, a čas
ze stupně 2 se k ní nemusí dostat včas.

**Co z toho plyne pro návrh:** barva stavu (*čeká / procedura běží / jedeme /
zrušeno*) je **bezpečná**, protože se zpožděním nic nelže — zpožděná barva
pořád říká pravdu o minulém okamžiku. Odpočet lže. Takže kdyby se čas posádkám
někdy dával, musí se vedle něj psát, **jak starý údaj to je**.

**Rozhodnuto Filipem 29. 10. 2026:** *„Klidně barevné světlo. Odpočet
u posádek není v prvních verzích potřeba, navíc je to zdroj problémů."*

Posádka tedy v prvních verzích dostane **barvu stavu, ne odpočet**. Milošovi se
to **neposílá jako otázka, ale jako informace** — požádal o sekvenci a má právo
vědět, že ji zatím nedostane a proč. Kdyby na odpočtu trval, platí to, co stojí
výš: musí u něj být vidět, jak je ten údaj starý.

### Kolize 2 — VMP a technický průkaz se sbírat nebudou

*Filip proti Milošově nahrávce 34. Rozhodnuto Filipem, Miloš o tom neví.*

Miloš: *„Do přihlášky budeme požadovat číslo VMP a číslo technického průkazu,
pokud ho loď má.“*

Filip: *„Zatím nic takového nesbíráme, a závodník by měl v podmínkách, na které
dává souhlas, mít, že toto splňuje a že je to jeho odpovědnost.“*

**Rozhodnuto Filipem 29. 10. 2026:** *„2 stačí"* — čísla se sbírat nebudou,
stačí potvrzení v souhlasu. Milošovi se to posílá jako informace, ne jako
otázka.

**Je to legitimní volba, ale není zdarma.** Vypsání dnes ty doklady žádá
(R25), takže kdyby se nesbíraly, musí to říct **text souhlasu** — a ten se tím
mění, tedy vznikne **verze 3** (`Souhlas.cs`, dnes `Verze = 2`). To je ta
práce, která se tím nešetří, jen přesouvá. A Miloš to zadal **výslovně**, takže
mu to patří říct.

### Kolize 3 — OCS, nebo DSQ

*Filip rozhodl DSQ a sám chce Miloše ověřit.*

> *„Loď Miloš klepne, že je přes čáru, a start normálně běží. Když skončí
> rozjížďka anebo loď dojede: pokud neodčiní, tak DSQ (ale zaznamenej, že se na
> to zeptáme Miloše při nejbližší příležitosti).“*

**Rozhodnuto Filipem 29. 10. 2026:** *„OCS, kdyžtak se to změní."* A na Miloše
se s tím nečeká. Je to zároveň to, co říkají pravidla, takže aplikace a pravidla
zůstávají v souladu a Milošovo slovo *„diskvalifikovaná"* zůstává jeho popisem
téhož děje. Změnit kód na `DSQ` by později byla jednořádková věc — postup se
staví nezávisle na tom.

**Proč to vůbec byla otázka:** podle pravidel se loď, která byla na
závodní straně a nevrátila se, **boduje jako OCS**; `DSQ` je výsledek jednání
o protestu. Pro Miloše je to totéž („nemá platný start“), pro výsledkovou
listinu ne. Postup, který Filip popsal, je ale nezávislý na tom, který kód se
nakonec zapíše — klepnutí za běhu, vyhodnocení po dojezdu — takže se **může
stavět teď** a kód se dorovná podle Milošovy odpovědi.

---

### Dvě otázky, které Filip položil mně

**„Do appky to chtěl Miloš? Nebo sis to tam dosadil sám?“** (u přihlašování) —
**chtěl.** Nahrávka 25, první věta o kapitánovi: *„Aplikace z pohledu kapitána.
Měl by tam vidět seriál závodu, měl by mít možnost přihlásit se do závodu, mělo
by se to projevit ve startovní listině.“* Přihlášení v appce tedy není můj
dosazený požadavek — a appka to od 21. 10. umí.

**„Nevím, proč minuta, to je nějak málo.“** (u zrušení rozjížďky / neplatného
startu) — ta minuta **není náš nápad, je z pravidel**: po všeobecném odvolání
padne nové vyzývací znamení minutu po znamení o odvolání a od něj běží celá
procedura znovu. V kódu to drží `Procedura.PoOdvolani` a komentář to říká
doslova. **Ale Filip popsal něco jiného**, a to je důležité rozlišení:

> *„Zrušení rozjížďky je prostě, že je zrušená, a pak zda se bude opakovat start
> a kdy začne procedura. Pak jedeme znovu podle flow.“*

To je **odložení** (ZPJ 27.3): čas je volný a startér řekne, kdy se pojede.
Odvolání je ta jednominutová varianta. Takže v aplikaci **existují oba** a
Milošova otázka 2 („dvě věci, nebo tři?“) se právě ukázala jako podstatná: on
mluvil o jedné dlaždici, ale potřebuje obě.

---

## Nálezy K — odvozené z kódu a pravidel

Hypotézy. Každá má doložený řádek, ale **žádnou z nich rozhodčí neřekl** —
takže než se podle nich něco postaví, mají projít diskusí.

### K1 — Sedm kódů ze čtrnácti, a mezi chybějícími je DNE

*Doloženo: `Features/Zavody/Zavod.cs:184–207`, ZPJ A10 a 90.3(b),
`Features/Bodovani/Bodovani.cs:152–160`. Stav: **opraveno 28. 10. 2026**
(fáze 3.3 a 3.4) — DNE se neškrtá a čtyři kódy přibyly.*

Aplikace zná sedm kódů výsledku: `Dnf`, `Dns`, `Dnc`, `Ocs`, `Dsq`, `Ret`,
`Rdg`. ZPJ A10 jich předepisuje čtrnáct. Chybí **ZFP, UFD, BFD, SCP, NSC,
DNE, DPI**.

Že chybí, návod přiznává (s. 22: *„U výsledku není kam zapsat ani kód jako ZFP
nebo náprava"* — RDG mimochodem aplikace má, takže ta věta je o půl kroku
pozadu). **Jeden z nich ale není chybějící kolonka, nýbrž špatně spočítané
body:**

**DNE — diskvalifikace, kterou nelze vyškrtnout.** ZPJ 90.3(b):
*„Když bodovací systém předpokládá vyškrtnutí jednoho nebo více bodování
rozjížděk, všechna bodování za diskvalifikaci, která je nevylučitelná (DNE),
musí být zahrnuta do bodování lodě v závodu."*

Aplikace škrtá podle výše bodů, bez ohledu na druh kódu:

```csharp
var kSkrtnuti = body
    .OrderByDescending(b => b.Body)
    // Při shodě se škrtá dřívější rozjížďka (ZPJ A2.1).
    .ThenBy(b => b.Cislo)
    .Take(skrtnout)
```

Protože DNE má podle A5.2 nejvyšší možné body, je to **vždycky první
kandidát na škrt**. Rozhodčí, který udělí nevylučitelnou diskvalifikaci podle
pravidla 2 (čestné plachtění) nebo 69 (nepřípustné jednání), ji v aplikaci
nemá jak zapsat tak, aby přežila. Zapíše DSQ, a nejbližší škrt ji smaže.

Na okruhové regatě se škrtá jedna rozjížďka (`Kalendar.ProcNejdouPocty`,
komentář: *„u okruhové regaty je obvyklý jeden škrt"*), takže ta situace
nastane hned při prvním použití.

*Poznámka k rozsahu:* zbytek chybějících kódů jsou bodové tresty (ZFP 20 %,
SCP podle 44.3, DPI podle 64) a startovní diskvalifikace (UFD, BFD). Ty visí
na R5 a na protestech — bez procedury a bez projednávání by samotná kolonka
nebyla k čemu.

### Opraveno 28. 10. 2026 (fáze 3.3 a 3.4)

**Nevylučitelná diskvalifikace se neškrtá** (ZPJ 90.3(b)). Škrt nově
vynechá rozjížďky, kde má loď `DNE`, a **počet škrtů se tím nesnižuje** —
místo ní padne další nejhorší. Loď tedy o škrt nepřijde, jen ho nemůže
použít na tohle. Drží to tři testy: že se DNE neškrtne, že se **obyčejná
DSQ škrtá dál** (jinak by to byl tichý zásah do bodování všech odjetých
ročníků) a že lodi se samými DNE nic nespadne.

**Přibyly čtyři kódy**: `Zfp`, `Ufd`, `Bfd`, `Dne`. Aditivně, s novými
čísly na konci — appka na telefonech je zná jako čísla.

**ZFP není diskvalifikace a chová se jinak než všechny ostatní kódy.**
Podle ZPJ 44.3(c) se k **dosaženému pořadí přičítá** 20 % bodů za
nedokončila, zaokrouhleno s půlkou nahoru, a nikdy nevyjde hůř než
nedokončila. Z toho plyne:

- loď se ZFP **dokončila**, takže zabírá své místo v pořadí a ostatním se
  nic neposouvá;
- jako **jediný kód se zapisuje spolu s pořadím** — `Zapis.ProcNejdeUlozit`
  má na to výjimku a naopak ZFP **bez** pořadí odmítne, protože loď, která
  dostala Z a pak nedokončila, má DNF;
- dvacet procent je parametr (`PravidlaBodovani.TrestZfpProcent`), ne
  výraz: 44.3(c) dovolují *„jinou hodnotu uvedenou ve vypsání závodu"*.

**Mez, kterou si musí přečíst každý, kdo na to sáhne** (R16): startovní
tresty jsou podle pravidel podmíněné **vyvěšenou vlajkou**, a na poháru se
vlajky nevyvěšují. *„Minutové pravidlo"* je tam vlastní pravidlo z dohody,
ne ZPJ 30 — kódy existují proto, aby se výsledek té dohody dal zapsat; co
znamenají a kdy se dávají, rozhoduje vypsání závodu.

*Co dál chybí z A10:* `SCP`, `NSC`, `DPI` a `DGM`. První tři visí na
protestech a na pravidle 64, čtvrtý je druhá nevyškrtnutelná diskvalifikace
— `Bodovani.NelzeSkrtnout` je proto funkce, ne test na rovnost.

### K2 — Protesty: aplikace neví, že nějaký visí, a přesto nabídne podpis

*Doloženo: `web/lib/vysledky.ts:73`, `Features/Zavody/Zavod.cs:160`,
`Features/Zavody/Workflow.cs`, ZPJ 60.3(b) a 90.3(e). Stav: **věta opravena
28. 10. 2026** (fáze 1.3); protesty jako celek dál **zapsáno, nejvyšší
priorita podle řezu**.*

Tohle je přesně ten případ, kvůli kterému tahle oponentura vznikla: **chyba
není v tom, že aplikace protesty neumí. Chyba je ve větě, kterou u toho říká.**

Stav **Schváleno** má v aplikaci popis:

```ts
popis: "Protesty vyřízené, pořadí platí.",
```

Aplikace o protestech **neví nic**. Nemá tabulku protestů, nezná protestní
časový limit, nemá kam zapsat, že se jeden projednává. Ta věta je tedy tvrzení,
které si nemá čím ověřit — a klepne ji rozhodčí, který třeba o protestu ví,
ale nemá kde ho zapsat.

**Co pravidla žádají a aplikace nezná:**

- **ZPJ 60.3(b):** protestní časový limit je *„pro protesty, které byly
  pozorovány v závodním prostoru, dvě hodiny poté co poslední loď dokončí"*.
  Aplikace čas dojezdu poslední lodi **zná** (`Vysledek.DojezdV`), takže limit
  by uměla dopočítat jediná ze všech. Dnes ho nepočítá, a nic tedy nebrání
  rozhodčímu schválit rozjížďku dřív, než limit uplyne.
- **ZPJ 63:** projednávání — strany, střet zájmů, rozhodnutí, informování
  stran, znovuotevření. Mimo aplikaci celé.
- **ZPJ 90.3(d):** *„Závodní komise musí provést všechny změny bodování, jak
  je nařízeno protestní komisí."* Cesta zpátky **existuje** — vrácení k revizi
  otevře zápis a `ProcNejde` pouští eliminaci i z potvrzeného. To je dobře
  postavené.
- **ZPJ 90.3(e):** 24hodinová mez pro změny z jednání. Aplikace ji nezná a
  ani se o ni opřít nemůže.

**Návrh není „postavit protesty".** Návrh je **přestat tvrdit víc, než se ví**:
větu u Schváleno přeformulovat tak, aby říkala, co rozhodčí doopravdy
podepisuje (*„pořadí v cíli sedí"*), a protesty nechat venku přiznaně —
případně u rozjížďky hlídat protestní limit, protože na to aplikace data má.

Souvisí s nálezem **O4** v `docs/AUDIT-OBSAZENI.md` (rozhodčí řekne „čísla
neplatí" a nemá jak je stáhnout z webu) — tam jde o publikaci, tady o větu.
Neduplikovat, řešit spolu.

### Hotovo 28. 10. 2026 — ta věta (fáze 1.3)

Stav *Schváleno* má nově popis **„Pořadí v cíli sedí, rozhodčí ho
podepsal."**, a to na obou místech naráz (`web/lib/vysledky.ts`
a `StavVysledku.Schvaleno` v `Zavod.cs`), aby se nerozešla. Protestní limit
se **nepočítá** a protesty zůstávají venku přiznaně — to je ta velká věc
s vlastním rozhodnutím, která do plánu nepatří.

Rozdíl proti *Ověřeno* (*„Čísla sedí s papírem z vody."*) zůstává čitelný:
ověření je o přepisu z papíru, schválení o podpisu pořadí. Že jsou to dvě
klepnutí téhož člověka, je dál nález **K3** a tohle ho neřeší.

### K3 — Ověřeno a Schváleno jsou dvě klepnutí téhož člověka

*Doloženo: `Features/Zavody/Workflow.cs` (`KdoSmi`), ZPJ 90.3. Stav:
**zapsáno** — kandidát na „jde to, ale zbytečně".*

```csharp
StavVysledku.Overeno or StavVysledku.Schvaleno or StavVysledku.KRevizi
    => Role.Rozhodci,
```

Řada je *Navrženo → Ověřeno → Schváleno → Potvrzeno*, a prostřední dva stupně
jsou **oba rozhodčího**. Mezi nimi do zápisu nevstoupí nikdo jiný a nic se
nestane. Rozhodčí tedy podepisuje dvakrát totéž.

Smysl dvou stupňů by dávalo přesně to, co v aplikaci není: **Ověřeno = čísla
sedí s papírem, Schváleno = protesty vyřízené.** To je i to, co ty dvě věty
na obrazovce říkají. Jenže druhou polovinu aplikace neumí (K2), takže zbyla
dvě klepnutí za jedno rozhodnutí.

Pravidla dvoustupňový podpis rozhodčího nežádají. ZPJ 90.3 mluví o jednom
úkonu závodní komise — bodovat rozjížďku.

> **Otázka na rozhodčího:** podepisuješ u vody dvakrát? Je „čísla sedí"
> a „protesty jsou vyřízené" jeden okamžik, nebo dva různé dny?

> **Upřesnění 28. 10. 2026 večer.** Filip k tomu namítl, že *„mnohdy např. u
> cíle a startu nestojí pouze rozhodčí"*. Má pravdu, ale míří na **jiný nález**:
> K3 je o tom, že *Ověřeno* a *Schváleno* klepne **týž** člověk a mezi nimi se
> nic nestane. To, kdo u vody stojí, je `docs/AUDIT-OBSAZENI.md` nález **O13**,
> a ten už to říká doslova: *„Kdo má v cíli jen zapisovat, dostane
> `Organizator` na tu regatu."* Nový je až důsledek — viz **K8**.

### K8 — Kdo u startu a u cíle stojí s rozhodčím, dostane celého pořadatele — a to je od dneška v rozporu s Milošovým zadáním

*Původ: Filip, 28. 10. 2026 večer. Doloženo: `docs/AUDIT-OBSAZENI.md` nález O13,
`Features/Identita/Uzivatel.cs:71–96` (celý výčet `Role`),
`Features/Zavody/VysledkyEndpoints.cs:293` a `:549–553`
(`SmiZapisovatAsync` → `Workflow.KdoSmi(Navrzeno, Navrzeno)`). Stav: **nový
rozpor, nestavěno**.*

Filip: *„Mnohdy např. u cíle a startu nestojí pouze rozhodčí."*

**Je to doložené a bylo to zapsané — jako vědomá hrana.** Audit obsazení z
26. 10. to má jako O13: *„Kdo má v cíli jen zapisovat, dostane `Organizator` na
tu regatu — a s ním i vypsání závodu, nahlášení odjeto, přihlášky, vyloučení
lodi, směrnice, stavbu trati."* Mezistupeň mezi editorem a pořadatelem
neexistuje; výčet `Role` má pět položek a žádná z nich není „zapisovatel" ani
„startér".

**Co se změnilo dneska večer.** Miloš řekl (nahrávka 30): *„Zásah do startovní
listiny smí provést pouze rozhodčí. Úpravu výsledků smí provést pouze
rozhodčí."* Tím se O13 přestává být vědomou hranou a stává se **rozporem**:
pomocník, který má u cíle jen zapisovat průjezdy, dnes dostane přístup ke
startovní listině — tedy přesně k tomu, co má být podle rozhodčího jen jeho.

**A je tu druhá polovina, kterou nikdo nezapsal: slave startéři.** Pyramida
autority s nimi počítá jako se stupněm 3. Převzetí velení je ale v API za
tímtéž sítem jako zápis výsledku:

```csharp
if (!await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
```

Takže **slave startér musí mít roli pořadatele nebo rozhodčího**, aby si mohl
o velení říct. Pyramida tedy dnes stojí na rolích, které jí dávají mnohem víc,
než potřebuje — a u lidí, kteří přijdou k vodě jednou za rok, je to ta nejmenší
žádoucí důvěra.

**Co z toho plyne, a rozhodnout to nemám já.** Buď

1. **přibyde role** pro toho, kdo u vody zapisuje (zápis průjezdů, převzetí
   velení — nic jiného), nebo
2. **zůstane to jak je** a Milošova věta se bude chápat úzce: *„do startovní
   listiny smí jen rozhodčí"* jako pravidlo o obrazovce, ne o účtech.

Druhá cesta je zdarma a na poháru, kde je štáb z jednoho klubu, obstojí
(přesně tak to O13 zapsal). První je čistší a bude potřeba ve chvíli, kdy
k vodě přijde někdo, komu se nedá dát celá regata.

> **Rozhodnuto Filipem 28. 10. 2026 večer — a je to třetí cesta, kterou jsem
> nenavrhl.** *„Chci, aby to měl Miloš co nejjednodušší … asi v klubovně
> u zápisu bude na webu moct zaškrtnout, kdo z pořadatelů bude moci pomáhat
> i u startu a cíle."*
>
> **Proč je to lepší než obě moje cesty.** Nepřidává roli do výčtu: ti lidé
> **už pořadateli jsou**. Je to **příznak u regaty**, který jim navíc otevře
> start a cíl — tedy převzetí velení (`Veleni.ProcNejdePrevzit`) a ruční zápis
> průjezdu. Nic jiného. Milošova věta *„do startovní listiny a do výsledků smí
> jen rozhodčí"* tím zůstává v platnosti, protože zaškrtnutí listinu neotevírá.
>
> **A okamžik sedí na časový program.** Podle jeho vlastní směrnice je
> registrace 9:00–10:00, rozprava 10:30 a start 11:00. Zaškrtává se tedy
> v klubovně, kde ti lidé fyzicky stojí, **před rozpravou** — stejnou hranicí,
> kterou právě dostalo přihlašování (R39). Rozprava zavře obojí: kdo jede a kdo
> pomáhá. Tím zároveň padá starost, že obrazovka Oprávnění je jen na webu:
> u zápisu je notebook, ne loď.
>
> **Co z toho zbývá postavit.** Příznak u regaty, zaškrtávátko na obrazovce
> rozhodčího a dvě místa, která se ho zeptají (velení, zápis průjezdu). Rozšířit
> `Udeleni.RozhodciSmiUdelit` není potřeba, protože se neudílí role.
>
> **Dvě věci k doladění, ne k rozhodnutí.** Zůstane po tom **doklad**, kdo byl
> toho dne zaškrtnutý (stejný vzorec jako u velitele, kde doklad už je), a
> příznak se váže **na jednu regatu**, ne na ročník — jinak by platil i tam,
> kde ten člověk není.

---

### K4 — Vyloučení nehlídá mez z pravidla 76.1(a)

*Doloženo: `Features/Zavody/Prihlasky.cs:56–101`, ZPJ 76.1. Stav: **zapsáno,
k ověření s rozhodčím**.*

Aplikace dělá jednu polovinu pravidla 76 správně a druhou vůbec:

```csharp
if (vylouceni && kdo != Kdo.Rozhodci) return "O vyloučení ze závodu rozhoduje rozhodčí.";
…
StavUcasti.Vyloucena => "Napiš důvod vyloučení.",
```

- **76.1(b) ✓** — *„sdělí řádné důvody"*: důvod je povinný
  (`PotrebujeDuvod`), nejvýš 500 znaků.
- **76.1(a) ✗** — *„tak učiní **před startem první rozjížďky** po přijetí
  přihlášky"*: tuhle mez aplikace nehlídá. Kontrola `maVysledky` se
  v `ProcNejdePrepnout` uplatní jen na `Zrusena`, `Odmitnuta`, `KDoplneni` a
  `Nedostavila` — **`Vyloucena` v tom výčtu není**. Loď, která má odjeté
  rozjížďky a body, jde vyloučit.

**Tenhle nález si ale nejsem jistý a je to nález o pojmu, ne o kódu.** Pravidlo
76 je o *odmítnutí nebo zrušení přihlášky*; vyhodit loď, která už jela, se
podle pravidel dělá **diskvalifikací po projednání** (63, 64) — a tu aplikace
nemá (K2). Je tedy možné, že „vyloučení ze závodu" v aplikaci plní **obě
role**, protože ta druhá chybí. Pak by hlídání meze 76.1(a) rozhodčímu sebralo
jediný nástroj, který má.

> **Otázka na rozhodčího:** vyloučení ze závodu — je to „nepustím ho ke startu"
> (pravidlo 76), nebo „vyhazuju ho z výsledků" (diskvalifikace)? Potřebuješ
> obojí zvlášť?

### K5 — Přeložený termín nikomu nic neřekne

*Doloženo: `Features/Zavody/Kalendar.cs` (`PuvodniPoPresunu`),
`NAVOD-ROZHODCI.pdf` s. 22, ZPJ 80. Stav: **zapsáno**.*

ZPJ 80: *„Když je závod přeložen na jiný termín, než je uvedeno ve vypsání
závodu, **všechny přihlášené lodě musejí být informovány.**"*

Posun termínu je v aplikaci rozhodčího úkon a je udělaný pečlivě — pamatuje si
**první** termín, ne předposlední (*„termín, na který se lidé chystali, je ten,
který jednou oznámil kalendář"*). Ale **nikomu to neoznámí**. Podle návodu
(s. 22) chodí účastníkům do telefonu **jediná zpráva: že jsou výsledky
rozjížďky venku.** Vývěska regaty jde na tabuli v klubovně, ne do kapsy.

Povinnost informovat je přitom **na rozhodčím**, protože termín je jeho úkon.
Aplikace má seznam přihlášených lodí i cestu do telefonů (upozornění o
výsledcích chodí), takže tohle není chybějící infrastruktura — je to
nepropojený drát.

Souvisí s R1: pravidlo 80 mluví o *„jiný termín, než je uvedeno ve vypsání
závodu"*. Dokud vypsání jako dokument není, nemá se termín s čím rozejít.

### K6 — Plánovaný start se zapsat nedá, a tabule s ním přitom počítá

*Doloženo: `Features/Zavody/ZapisSprava.cs:454–482`,
`web/app/nacrt/casomira/page.tsx:16–30`, `web/app/.../tabule/semafor.tsx:55`.
Stav: **hotovo 28. 10. 2026** — fáze 1.1 plánu, viz konec nálezu.*

Rozhodčí mluví o *„předpokladu startu"* ujasněném na rozpravě (R4). Tabule
umí odpočítávat do startu (`semafor.tsx`: *„Stopky běží od startu, odpočet do
startu. Obojí z téhož času"*) a náčrt časomíry ukazuje přesně ten stav —
rozjížďka **`Planovana` s vyplněným `startV`**:

```tsx
rozjizdky: [R(1, "Dokoncena", null), R(2, "Planovana", "2027-05-15T12:30:00+02:00")],
```

Do toho stavu se ale API nedostane. `StartV` se zapisuje na dvou místech —
`StartAsync` a import ročníku — a `StartAsync` rozjížďku zároveň rozjede:

```csharp
rozjizdka.StartV = kdy.ToUniversalTime();
…
if (rozjizdka.Stav != StavRozjizdky.Zrusena) rozjizdka.Stav = StavRozjizdky.Probiha;
```

Takže **zapsat čas startu = odstartovat**. Plánovaná rozjížďka s časem
existuje jen v náčrtu a v importu.

**Je to malá věc s velkým dosahem**, protože na plánovaném čase startu visí
všechno ostatní z diskuse: mapa 10 minut předem (R4), odpočet na tabuli,
startovní procedura (R5) i „časy z rozpisu", na které se ptá návod (otázka 6).
Dokud není kam zapsat, kdy se **má** jet, nemá se od čeho odpočítávat.

### Hotovo 28. 10. 2026 (fáze 1.1)

**Čas v budoucnu je plánovaný start a rozjížďku nerozjede.** `StartAsync`
nově rozlišuje: rozjížďka, která ještě nejede, dostane čas a **zůstane
`Planovana`**; u běžící se čas jen přepíše, protože tam je oprava dopředu
„klepl jsem pozdě", ne „dnes nestartujeme". Z možností, které nález nechával
otevřené (nové pole × budoucí čas), padla volba na druhou — tabule, náčrt
časomíry i panýlky ten stav **už umějí** a nové pole by znamenalo vést
dvakrát totéž.

Co se k tomu muselo srovnat:

- `Zapis.Odstartovala(startV, ted)` — nová čistá funkce. Na třech místech
  se dřív z `StartV is not null` odvozovalo, jestli rozjížďka jede, což by
  z plánovaného startu udělalo probíhající. Test je v `ZapisTests`.
- `VysledkySprava` dostala `TimeProvider` — ze stejného důvodu.
- **Plánovaný start nežádá přijatou trať.** Filipovo pravidlo z 15. 10.
  (*„to, co nemá trať, nejde odstartovat"*) mluví o odstartování a plánovaný
  čas žádnou loď na trať nepouští; na rozpravě, kde ten čas vzniká, navíc
  trať podle ZPJ 27.1 přijatá být nemusí. Na skutečný start platí kontrola
  nezměněná.
- **Cílová obrazovka má tři stavy místo dvou**: bez startu (tlačítko *Start*
  plus pole *plánovaný čas*), plánovaný start (*„Plánovaný start 10:25 ·
  za 4:30"* a tlačítko *Start*), a běžící jako dřív. Čas v minulosti pole
  odmítne — na „startuj teď" je tlačítko.

*Změřeno proti mocku (`tools/fake-api.py` nad kopií `2026-nanecisto`,
regata `izolepa`, 28. 10. 2026):* `POST …/rozjizdky/1/start` s časem o 4,5
minuty v budoucnu → rozjížďka **`Planovana` se `startV`** (dřív okamžitě
`Probiha`); tytéž rozjížďky protažené funkcemi tabule
(`rozjizdky-tabule.ts`, mapování 1:1 jako v `snimekZavodu`) daly
*„startovní procedura 2:04"* a u vzdálenějšího startu *„procedura ve
00:58"*. Start bez času dál rozjede rozjížďku na `Probiha`. V prohlížeči
na telefonu (375 px) pole i odpočet sedí a čas v minulosti vrátí hlášku.

### K7 — Shodu v cíli aplikace odmítne

*Doloženo: `Features/Zavody/Zapis.cs:211–217`,
`Features/Bodovani/Bodovani.cs:76–88`, ZPJ A7. Stav: **zapsáno, nízká
priorita**.*

ZPJ A7: *„Jestliže mají lodě shodu na cílové čáře … body za umístění, na kterém
mají lodě shodu, a za místo(a) bezprostředně za ním musejí být sečteny a
rozděleny rovným dílem."*

Aplikace shodu **aktivně odmítá**:

```csharp
.GroupBy(r => (r.Kategorie, r.Vstup.PoradiVCili))
…
return $"V kategorii {shoda.Key.Kategorie} má pořadí {shoda.Key.PoradiVCili} víc lodí: "
```

A i kdyby prošla, body jsou `int` (`BodyVRozjizdce.Body`), takže 1,5 bodu by
nešlo vyjádřit.

Zapisuju to jako nález s nízkou prioritou a **s otázkou**, protože se to na
okruhové regatě na Orlíku nejspíš nestává a rozsoudit dvě lodě okem na čáře je
běžná práce. Ale u vytrvalostní regaty s přepočtem může shoda vyjít z výpočtu,
ne z oka.

> **Otázka na rozhodčího:** stalo se ti někdy, že jsi nedokázal rozhodnout
> pořadí dvou lodí v cíli? Co jsi udělal?

---

## Mapa: co pravidla žádají po rozhodčím × kde to v aplikaci je

Přehled pro schůzku. **Sloupec „má to místo"** mluví o aplikaci, ne o tom,
jestli to rozhodčí dělat musí — to mu ukládají pravidla tak jako tak.

**Rámec po střípcích 4 a 5:** pohár jede podle ZPJ, ale **pořadatelsky ofiko
není** — ZPJ pro něj tedy nejsou závazné zvenčí a platí jen tak, jak si je
vezme vypsání závodu (R8) a jak je odsouhlasí závodník (R9).
Sloupec „má to místo" proto nečti jako *„tohle aplikace porušuje"*, ale jako
*„tohle by rozhodčí v aplikaci neměl kam zapsat, kdyby to pohár přijal"*.
Výjimka je spodek tabulky: bodování podle Dodatku A pohár **přijaté má** —
potvrdil to rozhodčí 22. 9. 2026 a podle něj se počítá.

| ZPJ | Úkon závodní / protestní komise | Má to v aplikaci místo? |
|---|---|---|
| 25.1 | vypsání závodu dostupné před přihlášením | **ne** (R1) |
| 90.2 | zveřejnit psané plachetní směrnice podle J2 | ano — PDF s verzemi a vyvěšením |
| 90.2(c) | **změna** směrnic, písemně a na nástěnce | částečně: nová verze + stažení staré s důvodem |
| 26 | startovní procedura 5 / 4 / 1 / 0, **podle vizuálních znamení** | **ne** (R5); a znamení aplikace vydat nemůže (R15) |
| 25.3 | vlajku smí nahradit „objekt podobného vzhledu" | neřeší se — u Miloše vlajky vidět nejsou (R15) |
| 27.1 | určit dráhu nejpozději s vyzývacím znamením | ano, jinak: trať se staví a rozhodčí ji přijímá |
| 27.3 | odložit (AP) nebo zrušit (N) před startem | **ne** (R5) |
| 29.1 | individuální odvolání (X) | **ne** — jen jeho následek OCS |
| 29.2 | všeobecné odvolání (první opakovač) | **ne** |
| 30.1–4 | startovní tresty podle vlajky (I, Z, U, černá) — **„minutové pravidlo"** | **ne** — z pěti kódů zná jen OCS; ZFP, UFD, BFD chybí, a je to úkon, který startér dělá (R14) |
| 30.4 | oznámit číslo plachty lodi s černou vlajkou před dalším startem | vývěska a tabule **jsou**, povinnost nepojmenovaná (R14) |
| 32.1 | **zkrácení** dráhy po startu | **ano** — úkon rozhodčího za jízdy, `SmiZkratit` (R17, opraveno) |
| 32.1 | **zrušení** rozjížďky po startu | zpola — jen oklikou přes eliminaci výsledků, a **bez důvodu** (R13) |
| 33 | změna následujícího úseku dráhy | částečně: přestavba trati (jiný pojem) |
| 34 | chybějící značka | **ne** — bóje se „sbírá z vody", ne nahrazuje |
| 35 | časový limit rozjížďky | **ne** |
| 36 | rozjížďka znovu startovaná / znovu plutá | částečně (R5) |
| 60–63 | protesty, projednávání, rozhodnutí | **ne** (K2) |
| 61 | náprava | kód RDG ano, projednání ne; na vytlačení od bojky ji 61.4(b) stejně nedává (R13) |
| 61.4(d) | důkazy z vhodných zdrojů před zrušením rozjížďky | **ano** — záznam trasy s posuvníkem času (R13) |
| 64 | diskreční tresty | **ne** (DPI chybí) |
| 69 | nepřípustné jednání | **ne** (DNE chybí, K1) |
| 76.1 | odmítnout / zrušit přihlášku, vyloučit závodníka | ano, bez meze 76.1(a) (K4) |
| 80 | informovat lodě o přeloženém termínu | **ne** (K5) |
| 89.2 + J1 | **vypsání závodu** se vším, co J1 žádá | **ne** (R8) |
| 4.1 + J1.2(12) | **souhlas závodníka s pravidly** při přihlášení | **ne** — sbírá se souhlas se zveřejněním, a neukládá se (R9) |
| ~~88 + předpis ČSJ~~ | ~~licence ČSJ, pojištění odpovědnosti~~ | **netýká se poháru** — pořadatelsky ofiko není (střípek 5, R7) |
| 90.3(a) | bodovat podle Dodatku A | **ano, a dobře** — A2.1, A5.2, A8.1, A8.2 |
| 90.3(b) | DNE se nesmí vyškrtnout | **ne** (K1) |
| 90.3(c) | opravit vlastní chybu v bodování a zveřejnit | ano — revize s důvodem |
| 90.3(d) | provést změny nařízené protestní komisí | ano — cesta zpátky existuje |
| 90.3(e) | 24hodinová mez pro změny z jednání | **ne** |
| A7 | shoda v cíli — dělení bodů | **ne, odmítne se** (K7) |

*Pozn. k 32.1:* zrušení probíhající rozjížďky aplikace umí dvěma různými
způsoby (`StavRozjizdky.Zrusena` a `StavVysledku.Eliminovano`) a rozdíl mezi
nimi nikde nevysvětluje. Nezkoumal jsem to — patří to spíš k řezu výsledků.

**Co z toho stojí za vyslovení:** sloupec vpravo je plný „ne", ale skoro
všechna „ne" visí na **třech věcech** — startovní proceduře (R5), protestech
(K2) a vypsání závodu (R1). Nejsou to dvě desítky chybějících funkcí, jsou to
tři chybějící místa, do kterých by se dvacet úkonů zapisovalo.

A naproti tomu: **bodování je hotové a sedí s pravidly**, včetně nuancí jako
A8.2 (*„i škrtnuté"*) a A5.2 (*„přihlášené do závodu + 1"*). Je to jediná část
aplikace, kterou už rozhodčí jednou opřipomínkoval (22. 9. 2026) a jeho
připomínky jsou v kódu i s datem.

---

## Souhlasí návod s aplikací?

Řez, který má podle zadání nejvyšší prioritu — rozhodčí podle návodu půjde.
Prošel jsem všech 24 stran proti kódu.

**Návod je poctivý.** Oddíl *Co aplikace zatím neumí* (s. 22) jmenuje protesty,
penalizace, chybějící obrazovku v appce i to, že účastníkům nechodí upozornění.
Žádné „slib naprázdno" jsem v něm nenašel — a dvě místa ho dokonce **podhodnocují**:

| Kde | Co návod říká | Jak to je |
|---|---|---|
| s. 22 | *„U výsledku není kam zapsat ani kód jako ZFP nebo náprava."* | **náprava (RDG) jde** — `KodVysledku.Rdg` existuje a bodování ji počítá (místo za posledním dokončivším). Chybí jen ZFP a dalších šest. |
| s. 1 | *„neposílá účastníkům zprávy o odloženém startu"* | sedí, ale neříká to podstatnější: **nezná ani samo odložení** (R5) |

Jediné, co proti návodu stojí, je **střípek 1 — tedy sám rozhodčí**: návod mu
na s. 8 vysvětluje, že trasy se berou od rozpravy, a on říká, že se mají brát
od přihlášek (R3). To není chyba návodu. To je ta odpověď, kvůli které se
schůzka konala.

---

## Čemu se nepřekrývám

- **`docs/AUDIT-OBSAZENI.md`** — řez *obsazení lidmi*. Nálezy o rozhodčím,
  které už má a které **neopakuju**: O1 (rozhodčí jde udělit jen na celý
  ročník), O4 (vrácené výsledky zůstanou veřejně viset), O5, O6 (rozcestník
  sliboval tři věci navíc — opraveno), O18 (přijetí trati a podpis výsledků
  jsou úkony, které za rozhodčího nikdo neudělá).
- **`docs/SCENARE-OVLADANI.md`**, skupina D — scénáře ovládání pro rozhodčího
  (D1–D5), projité reprodukcí 8. 10. 2026.
- **`docs/OPONENTURA-TRACKING.md`** — tracking a živé polohy. Nález R3 se s ním
  dotýká (okno a kdo smí zaznamenávat), ale z jiné strany: tam *kdo to vidí*,
  tady *odkdy se to sbírá*.

---

## Soupis a plán ovládání startu

Od 28. 10. 2026 má ovládání startu **vlastní dokument**:
`docs/SOUPIS-A-PLAN-START.md`. Vznikl na Filipův pokyn *„než budeme překopávat
cokoli, udělat nějaký soupis a plán, abychom si to nerozbili a rozhodli se
správně"* — a vznikl **místo stavby, ne po ní**.

Je v něm, co už běží, co z Milošova zadání aplikace neumí (patnáct kroků),
**mapa dotyků** (co se čím dá rozbít a jak se to pozná dopředu), čtyři
rozhodnutí, která musí padnout dřív než kód, a pořadí pěti kroků od toho
nejmenšího.

Téhož dne k tomu přibyl oddíl **Celá fronta**: všech 41 nálezů z tohohle
dokumentu rozdělených tak, aby se daly odbavovat po dávkách — dvanáct, z nichž
něco stojí, devatenáct čekajících na devět otázek, tři ke stavbě hned, šest,
které nejsou práce ale poznání, a jeden, který Miloš rozhodl. Rozdělení je
ověřené strojově: každý nález je přesně v jedné skupině a žádný nechybí.

Tenhle dokument zůstává zdrojem nálezů; ten druhý je záchytný bod, ke kterému
se vrací, a **stav fronty se čte z něj**.

## Přehled stavu řešení

Od 28. 10. 2026 je **stav** v samostatném dokumentu: `docs/STAV-RESENI.md`.
Jeden řádek na každý Milošův požadavek, seřazené podle dne závodu, u každého
stav (*Běží / Jen web / V API / Zadané / Čeká / Zavřené*) a kde se to dá vidět.
Vznikl na Filipův pokyn: *„potřebuji mít kontrolu nad stavem řešení, ten přehled
teď nemám."* Tenhle dokument zůstává zdrojem nálezů, soupis řídí pořadí stavby,
přehled drží stav.

## Co se s tímhle dokumentem dělá dál

**Plán z něj nevzniká.** Filip bude přidávat další střípky z diskuse; každý se
zasadí jako nový střípek a nálezy, které potvrdí nebo vyvrátí, se tady označí.
Plán vznikne až potom.

**Střípky chodí postupně, jak Miloš prochází návodem** (Filip, 27. 10. 2026:
*„budeme doplňovat další, jak tím Miloš projde postupně"*). Má v ruce
`NAVOD-ROZHODCI.pdf`, takže budou **vázané na jeho body** — a návod má
vlastní číslování, kterého se vyplatí držet. Kde se dá, je u střípku napsané,
kterému bodu návodu odpovídá; otázka z návodu, na kterou odpověděl, se u něj
zaškrtne:

| Otázka z návodu (s. 23) | Bod | Odpovězeno? |
|---|---|---|
| 1. Kde chceš mít odstartování rozjížďky? | 14 | **ano** — procedura podle ZPJ 26 (R5), drží ji **startér** (rozhodčí i pořadatel), zdrojem pravdy je jeho mobil (R12) |
| 2. Kde a jak chceš revidovat trať? | 5 | ne |
| 3. Kde chceš mít přehled o lodích za jízdy? | 10 | ne |
| 4. Co potřebuješ vidět, než uznáš výsledky? | 16 | ne |
| 5. Kde a jak se má regata uzavřít? | 17 | ne |
| 6. Jaké má být flow rozpravy? | 8 | **zčásti** — co se rozpravou zapíná (R3, R4, R6) a že se na ní domlouvá čas startu, kontroluje listina a potvrzují trasy (R12); začátek a konec rozpravy pořád ne |

Tři nálezy navíc (R1, R2, R7/R8) jsou z oblastí, na které se návod neptal
vůbec — **papíry před závodem**. Návod začíná přihlášením do aplikace, kdežto
rozhodčí začal vypsáním závodu. To samo o sobě stojí za poznámku: **řetěz
rozhodčího začíná dřív, než kam dosáhne aplikace.**

**Jak se střípek zasazuje:**

1. Doslovný zápis do oddílu *Střípky z diskuse*, s datem. Nepřepisovat.
2. Projít nálezy R a K: **potvrzuje** některý? **vyvrací**? Nebo je to věc,
   kterou tenhle audit vůbec neviděl?
3. U vyvráceného nálezu **nechat původní text** a dopsat, čím byl vyvrácen.
   Škrtnutý nález je doklad, že se kód četl špatně — a to je informace.
4. Nový nález dostane **R**, ne K.

**Otevřené otázky na rozhodčího**, které z téhle oponentury vyšly a v návodu
nejsou (šest otázek z návodu je na s. 23 a ty platí dál):

0. ~~**Kdo je pořadatel poháru podle ZPJ 89.1 — je to klub, který je členem
   ČSJ?**~~ **Zodpovězeno střípkem 5:** pořadatelsky ofiko pohár není, a je to
   záměr kvůli pojistkám; jedou se jen pravidla. Předpisy ČSJ tedy neplatí,
   licence ani pojištění do přihlášky nepatří (R7 opraveno). **Místo toho
   vyšla ven otázka 7** níž — kdo tedy pořadatel je.
1. Co přesně na vypsání závodu *uznáváš* — dokument, termín, obojí? A co se
   stane, když ho neuznáš? (R1)
2. „Zapínali trasování" ve fázi přihlášek — telefony smí nahrávat, nebo se
   polohy už někomu ukazují? Komu? (R3)
3. Podepisuješ výsledky dvakrát? Je „čísla sedí" a „protesty vyřízené" jeden
   okamžik, nebo dva dny? (K3)
4. Vyloučení ze závodu — „nepustím ke startu", nebo „vyhazuju z výsledků"?
   Potřebuješ obojí? (K4)
5. Stalo se ti, že jsi nedokázal rozhodnout pořadí dvou lodí v cíli? (K7)
6. Protestní limit jsou dvě hodiny po dojezdu poslední lodi. Má ti ho aplikace
   hlídat a nepustit podpis dřív — nebo ti to má jen napsat? (K2)
7. **Co dnes účastník na „vlastní nebezpečí" podepisuje?** Je někde papír nebo
   věta ve vypsání, nebo se spoléhá na to, že se to ví? A **kdo je u poháru
   „pořadatel"**, když to není klub — spolek, parta lidí, Miloš? Z toho plyne,
   čí jméno má v tom prohlášení stát. (R9, R8) ***Nová po střípku 5.***
8. **Kolik lodí se přihlašuje veřejným formulářem a kolik jich zapíše pořadatel
   nebo import?** Rozhoduje to, jestli se souhlas nesbírá od části pole, nebo
   skoro od nikoho. Tohle si můžu změřit sám v datech, až bude na čem. (R9)
9. **Co znamená „pro přihlášené" — loď v regatě, nebo účet na webu?** Nejsou to
   totéž a liší se v obou směrech. Bez téhle odpovědi se ta stránka postavit
   nedá. (R10) ***Nová po střípku 6.***
10. **Co si startér po startu potřebuje pamatovat a jak dlouho?** (R11, R12)
    ***Nová po střípku 7.*** **Položeno Milošovi 27. 10. 2026 takto** (Filipovo
    znění, ne návrh z téhle session):

    > Jak jsi to po/při startu říkal? Alternativní trest? A kdy se dává? (když
    > se loď dostane přes čáru?) a kdy ještě? Popisoval jsi mi ten proces, ale
    > už si vše nepamatuju…

    **Jak odpověď číst.** Otázka se ptá, *„kdy se dává"* — tedy předpokládá, že
    trest někdo uděluje. Podle ZPJ 44.1 si ho loď **bere sama** a nikdo jí ho
    nedává (R11). Když to tedy Miloš potvrdí, neznamená to, že se R11 mýlí:
    pravděpodobnější je jedna ze dvou jiných věcí, a obě stojí za zapsání —

    - **vlastní pravidlo poháru**: místo tvrdého OCS za předčasný start dostane
      loď možnost chybu odčinit otáčkami. U neoficiálního závodu je to běžná
      úleva a byla by to **odchylka od 29.1/30.1**, která podle R8 patří do
      vypsání závodu;
    - **nebo jiné slovo pro návrat přes čáru** podle 29.1 a 30.1 — tedy ne
      trest, ale náprava startovní chyby. Lodě si tomu tak můžou říkat.

    Rozlišit to jde jednou doplňující otázkou: **dělá ta loď otáčky, nebo se
    vrací za čáru?** To jsou dvě úplně různé věci na vodě i v zápisu.

    **Zodpovězeno 27. 10. 2026 ve 21:09** (střípek 9): ani jedno z toho —
    je to **startovní trest podle pravidla 30**, „minutové pravidlo". Viz R14.
    Z obou mých domněnek výš byla blíž ta druhá (že nejde o otáčky), ale ani
    ta netrefila: nejde ani o návrat za čáru podle 29.1, nýbrž o samostatnou
    skupinu trestů, kterou jsem v R11 odbyl jedním řádkem tabulky.

    *Pro úplnost: návrh znění z téhle session (ptal se na práci místo na pojem
    a rozpojoval odvolání od otáček) poslán nebyl. Filipova verze má proti němu
    výhodu, že navazuje na to, co Miloš sám vyprávěl — „popisoval jsi mi ten
    proces" vyvolá vzpomínku, kdežto abstraktní otázka vyvolá úvahu.*
