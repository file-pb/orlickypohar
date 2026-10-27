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

**Co k tomu přidal střípek 3.** Vypsání závodu není jen chybějící dokument —
podle hierarchie pramenů (R7) je to **jediné místo spolu se směrnicemi, kde
smí být napsané vlastní pravidlo poháru.** Dvacet bodů za diskvalifikaci,
koeficienty do seriálu, počty škrtů, bonus za 24hodinovku: všechno to jsou
odchylky od Dodatku A, které v aplikaci dnes žijí jako čísla ve sloupcích
regaty a jako text v `PLAN.md`. Platit mohou, ale jen když jsou v dokumentu,
který na to má pravomoc. Ten dokument v aplikaci není.

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

**Druhý dopad: co z předpisů ČSJ aplikace nezná.** Národní předpisy ukládají
dvě věci, které patří do přihlášky, a `Ucast` o nich neví ani jednu:

| Předpis ČSJ | Co žádá | V aplikaci |
|---|---|---|
| preambule k ZPJ Části 6 | čeští závodníci se musí prokázat **platnou závodní licencí ČSJ** | **nic** |
| ZPJ 65.4(a) (doplněk ČSJ) | **pojištění odpovědnosti**, min. 9 000 000 Kč na zdraví a 2 000 000 Kč na věci | **nic** |

Přihláška (`Ucast`) nese kormidelníka, posádku jako text, kontakt a poznámku.
Hledání `licenc|pojist` ve zdrojáku a v `PLAN.md` nevrací nic o jachtingu —
jen softwarové licence a metaforické „pojistky". Rozhodčí přitom podle ZPJ
76.1 smí přihlášku odmítnout, když nevyhoví požadavkům — ale nemá podle čeho
kontrolovat.

*U preambule Části 6 stojí za poznámku, že porušení **nemůže být obsahem
protestu ani žádosti o nápravu** — je to tedy věc kanceláře závodu, ne
projednávání. Tím spíš patří do přihlášky.*

> **Otázka na rozhodčího — a je to otázka před všemi ostatními:** je Orlický
> pohár závod **pod ČSJ**? Jede se pod klubem začleněným do svazu (ZPJ 89.1,
> 75), nebo je to vlastní seriál, kde se ZPJ berou jako konvence, protože jsou
> dobře napsané? Odpověď rozhoduje, jestli tabulka výš je nález, nebo nic:
> licence a pojištění jsou povinné jen v prvním případě. **Neodhaduju to** —
> z kódu se to zjistit nedá a hádat to by bylo přesně to, před čím tenhle
> dokument v *Mezi poctivosti* varuje.

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

| ZPJ | Úkon závodní / protestní komise | Má to v aplikaci místo? |
|---|---|---|
| 25.1 | vypsání závodu dostupné před přihlášením | **ne** (R1) |
| 90.2 | zveřejnit psané plachetní směrnice podle J2 | ano — PDF s verzemi a vyvěšením |
| 90.2(c) | **změna** směrnic, písemně a na nástěnce | částečně: nová verze + stažení staré s důvodem |
| 26 | startovní procedura 5 / 4 / 1 / 0 | **ne** (R5) |
| 27.1 | určit dráhu nejpozději s vyzývacím znamením | ano, jinak: trať se staví a rozhodčí ji přijímá |
| 27.3 | odložit (AP) nebo zrušit (N) před startem | **ne** (R5) |
| 29.1 | individuální odvolání (X) | **ne** — jen jeho následek OCS |
| 29.2 | všeobecné odvolání (první opakovač) | **ne** |
| 30.1–4 | startovní tresty podle vlajky (I, Z, U, černá) | **ne** — kódy ZFP/UFD/BFD chybí |
| 32.1 | **zkrácení** dráhy po startu | **ne** |
| 32.1 | **zrušení** rozjížďky po startu | ano — `Zrusena` / eliminace, viz pozn. |
| 33 | změna následujícího úseku dráhy | částečně: přestavba trati (jiný pojem) |
| 34 | chybějící značka | **ne** — bóje se „sbírá z vody", ne nahrazuje |
| 35 | časový limit rozjížďky | **ne** |
| 36 | rozjížďka znovu startovaná / znovu plutá | částečně (R5) |
| 60–63 | protesty, projednávání, rozhodnutí | **ne** (K2) |
| 61 | náprava | kód RDG ano, projednání ne |
| 64 | diskreční tresty | **ne** (DPI chybí) |
| 69 | nepřípustné jednání | **ne** (DNE chybí, K1) |
| 76.1 | odmítnout / zrušit přihlášku, vyloučit závodníka | ano, bez meze 76.1(a) (K4) |
| 80 | informovat lodě o přeloženém termínu | **ne** (K5) |
| 88 + předpis ČSJ | závodní licence ČSJ u českých závodníků | **ne** (R7) |
| 88 + předpis ČSJ | pojištění odpovědnosti 9 mil. / 2 mil. Kč | **ne** (R7) |
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

**Jak se střípek zasazuje:**

1. Doslovný zápis do oddílu *Střípky z diskuse*, s datem. Nepřepisovat.
2. Projít nálezy R a K: **potvrzuje** některý? **vyvrací**? Nebo je to věc,
   kterou tenhle audit vůbec neviděl?
3. U vyvráceného nálezu **nechat původní text** a dopsat, čím byl vyvrácen.
   Škrtnutý nález je doklad, že se kód četl špatně — a to je informace.
4. Nový nález dostane **R**, ne K.

**Otevřené otázky na rozhodčího**, které z téhle oponentury vyšly a v návodu
nejsou (šest otázek z návodu je na s. 23 a ty platí dál):

0. **Je Orlický pohár závod pod ČSJ?** Jede se pod klubem začleněným do svazu,
   nebo je to vlastní seriál, kde se ZPJ berou jako dobře napsaná konvence?
   Předchází všem ostatním otázkám: rozhoduje, jestli licence a pojištění
   v přihlášce chybí, nebo tam nepatří. (R7)
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
