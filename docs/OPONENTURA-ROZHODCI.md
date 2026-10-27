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

### Velitelský čas (R19) — potvrzeno 27. 10. 2026

> *„super tak si to zapiš že to budeme chtít dodělat"*

Dva chybějící díly ze šesti; zbylé čtyři na cílové obrazovce už jsou:

1. **Start musí přežít výpadek.** Dát ho do `Koncept` v `koncept.ts` vedle
   dojezdů a kódů. Dnes se klepnutí při selhání odeslání zahodí
   (`setStart(puvodni)`), a *„zkus to znovu"* u startu nejde splnit, protože ten
   okamžik uplynul. **Tohle je ta vada, která jim pokazila start.**
2. **Pojmenovat, čí hodiny platí.** Jeden velitelský čas v rukou hlavního
   startéra, nezávislý na spojení; po připojení se rozešle ven a srovná ostatní.
   Mechanismus pro dva **rovnocenné** zapisovatele projekt má (porovnání dvou
   snímků, scénář C7), ale tady je jeden **nadřízený** — platí čas hlavního, bez
   vybírání. Filip uvedl, že se to už řešilo; v dokumentaci to není a z C7 se to
   odvodit nedá, takže to chce zapsat dřív, než se to začne stavět.

3. **Kdo je hlavní, se stáhne dopředu a drží celý den.** *(Odsouhlaseno
   Filipem 27. 10. 2026: „naprosto souhlas".)* Rozhodne server při propojení —
   ale **ne v okamžiku startu**, protože pak by výpadek sebral startéru právo
   odstartovat, a to je horší než dnešní stav, kde se ztratí jen zápis. Údaj
   „jsem hlavní startér téhle regaty" se chová jako okna závodních dnů: stáhne
   se u mola, platí celý den, výpadek s ním nehne. Rozbor je u R19.

4. **Převzetí velení musí jít.** *(Filip, 27. 10. 2026: „a spadnutí do vody je
   jasné a musí být řešitelné, je to docela možné".)* Tedy ne otevřená otázka,
   ale požadavek.

   **Co ho komplikuje** — a je to dobré vědět předem: *„oba by to měli
   akceptovat"* znamená, že se slave hlavním **udělat sám nesmí**. Jenže
   potvrdit to má ten, kdo je ve vodě. Z toho plynou tři cesty a každá má svou
   daň:

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

## Nálezy R — z diskuse s rozhodčím

### R1 — Vypsání závodu je dokument, a aplikace žádný nezná

*Původ: střípek 1, **potvrzeno střípkem 3**. Doloženo:
`Features/Zavody/Kalendar.cs:43`, celý `Features/Smernice/`, ZPJ 25.1.
Stav: **zapsáno, po střípku 3 vyšší priorita**.*

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

> **Místo na citát z diskuse:** _(„zapínali trasování" = telefony smí
> nahrávat, nebo že se polohy už ukazují? A komu se ukazují — posádkám, nebo
> jen do systému?)_

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
**zapsáno, vysoká priorita**.*

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
PravidlaBodovani.cs`, `docs/PLAN.md:5455–5478`. Stav: **zapsáno, nejvyšší
praktická priorita**.*

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
| 1.1(2) | **že se závod řídí podle ZPJ** | **ne** — a je to ta věta, kvůli které pravidla vůbec platí |
| 1.1(3) | seznam dalších dokumentů, které závod řídí, a kde je vzít | **ne** |
| 1.1(4) | závodící třídy, handicap, podmínky a omezení přihlášení | **zpola** — kategorie ano (do 7 m / nad 7 m / Race), podmínky ne |
| 1.1(5) | postupy a časy přihlášení, **poplatky, termín uzávěrky** | **ne** — `Zavod` nemá uzávěrku ani výši startovného; `Ucast` má jen `Zaplaceno` a `StartovnePoznamka`, tedy evidenci platby, ne její předpis |
| 1.1(6) | **časy vyzývacích znamení** první a dalších rozjížděk | **ne** (K6) — a všimni si, že J1 chce čas **vyzývacího znamení**, tedy T−5, ne čas startu |
| 1.3(4) | obecný popis dráhy nebo typů drah | **zpola** — trať se staví až v den závodu, dopředu o ní není nic |
| 1.3(5) | **bodovací systém, je-li odlišný od Dodatku A** | **ne** — žije v `PocetSkrtu`, `KoeficientDoSerie`, `PosunDoSerie`, `Vyhodnoceni` a v konstantě `PravidlaBodovani` |
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

### R9 — „Vlastní nebezpečí" a souhlas s pravidly: jediná vazba, kterou pohár má, se nesbírá a neukládá

*Původ: střípek 5. Doloženo: `Features/Zavody/VerejnaPrihlaska.cs:16`, `:29`,
`:87`, `web/app/serie/[slug]/zavody/[zavod]/prihlaska/page.tsx:278–283`,
ZPJ 4.1(a), 4.3, J1.2(12). Stav: **zapsáno, podle mě nejvážnější nález
dokumentu**.*

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

### R10 — Stránka regaty: Miloš jmenuje pět položek, aplikace má pět jiných

*Původ: střípek 6. Doloženo:
`web/app/serie/[slug]/zavody/[zavod]/hlava.tsx:68–83` (funkce `sekce`),
`Features/Zavody/Prihlasky.cs:121` (`VerejneViditelna`),
`NAVOD-ROZHODCI.pdf` s. 18. Stav: **zapsáno** — polovina patří do
`SCENARE-OVLADANI.md`, viz konec nálezu.*

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
ZPJ 26, 27.3, 29.2. Stav: **zapsáno** — navazuje na R4, R5 a K6, které tím
dostávají tvar.*

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
| velký odpočet do toho času | **zpola** — tabule odpočítává (`semafor.tsx`), ale z času, který ještě nejde nastavit; v telefonu startéra nic |
| kontrola startovní listiny na rozpravě | **zpola** — listina je, rozprava je, propojené to není (R6) |
| potvrzení tras na rozpravě | **ano** — přijetí trati rozhodčím (`TratEndpoints.PrijmiAsync`), a je to jeho výhradní úkon |
| telka se 15 minut před startem přepne na tracker | **ne** — mapa naskočí až startem, a `Procedura` je natvrdo 5 minut (R4) |
| proceduru spustí startér jedním tlačítkem | **ne** — procedura neexistuje (R5) |
| přerušit kdykoli uprostřed | **ne**, a pravidla to dělí na dvě věci — viz níž |
| zadat nový čas a odpočítávat znovu | **ne** |
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

*Původ: střípek 9 — **odpověď Miloše na otázku 10**. Doloženo: ZPJ 30.1–30.4,
29.1, 44.3(c), A10, `Features/Zavody/Zavod.cs:184–207`. Stav: **zapsáno —
opravuje R11**.*

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
Stav: **zapsáno**.*

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

Z téhle tabulky aplikace umí **dvě věci**: **zkrácení** (plně, jako úkon
rozhodčího za jízdy) a **zrušení** (jen oklikou přes eliminaci výsledků a bez
důvodu, R13). Zbytek — změna úseku, chybějící značka, vztlakové prostředky,
pátrání — v ní není.

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

### R18 — Doručení ven: takt je minuta, a kód s tímhle požadavkem předem počítá

*Původ: střípek 13. Doloženo:
`Features/Upozorneni/OdesilaniUloha.cs:18–28`, `Zarizeni.cs:58–66`,
`Features/Zavody/VysledkySprava.cs:240–256`, `NAVOD-ROZHODCI.pdf` s. 22.
Stav: **zapsáno — budoucí požadavek, podklad pro rozhodnutí**.*

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

### R19 — Velitelský čas: start se při výpadku ztratí, dojezdy ne

*Původ: střípek 14. Doloženo:
`web/app/sprava/[serie]/vysledky/[zavod]/[cislo]/cil/cil.tsx:271–290`,
`koncept.ts:23–28`, `Features/Zavody/VysledkyEndpoints.cs:211`. Stav:
**K DODĚLÁNÍ — potvrzeno Filipem 27. 10. 2026** (*„super tak si to zapiš že to
budeme chtít dodělat"*). Doložená příčina skutečné události.*

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
| přežití výpadku v prohlížeči | **je, ale jen pro dojezdy** — `koncept.ts`; start do něj patří taky |
| displej, který nezhasne | **je** — `useDisplejSviti` |
| porovnání dvou zápisů při rozporu | **je** — `podleRizika` a dvě tlačítka *Doplnit chybějící* / *Přepsat rozdílná* |
| opakované odeslání, až se signál vrátí | **je** — `setInterval(zkus, 30_000)` a událost `online` |
| jeden autoritativní čas mezi dvěma startéry | **není** |

Takže **pět ze šesti dílů existuje** a čtyři z nich přímo na cílové obrazovce.
Chybí dvě věci: dát start do konceptu, a pojmenovat, čí hodiny platí.

**Hlavní a „slave" startér.** Filip: *„Startér může být jeden hlavní a druhý
slave u druhého bodu startovní čáry… Velitelský čas je ale jeden, je v rukách
hlavního startéra a nesmí být závislý."* Mechanismus pro rozpor dvou zapisovatelů
projekt má (scénář C7 v `docs/SCENARE-OVLADANI.md`, snímek na zapisovatele
a porovnání) — jenže ten řeší **dva rovnocenné zápisy**, kdežto tady je jeden
nadřízený. To je jiné pravidlo: ne „ukaž rozdíl a nech vybrat", ale „platí čas
hlavního".

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

## Nálezy K — odvozené z kódu a pravidel

Hypotézy. Každá má doložený řádek, ale **žádnou z nich rozhodčí neřekl** —
takže než se podle nich něco postaví, mají projít diskusí.

### K1 — Sedm kódů ze čtrnácti, a mezi chybějícími je DNE

*Doloženo: `Features/Zavody/Zavod.cs:184–207`, ZPJ A10 a 90.3(b),
`Features/Bodovani/Bodovani.cs:152–160`. Stav: **zapsáno**.*

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

### K2 — Protesty: aplikace neví, že nějaký visí, a přesto nabídne podpis

*Doloženo: `web/lib/vysledky.ts:73`, `Features/Zavody/Zavod.cs:160`,
`Features/Zavody/Workflow.cs`, ZPJ 60.3(b) a 90.3(e). Stav: **zapsáno,
nejvyšší priorita podle řezu**.*

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
Stav: **zapsáno**.*

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
