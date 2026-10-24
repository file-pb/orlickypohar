# Oponentura: role v appce a role na webu proti sobě (24. 10. 2026)

Zadání: *„otestuj usecases rolí v appce a spuštění trackování a OPROTI TOMU
usecases rolí na webu a zobrazení pozic lodí v závodě."* Není to stavba
funkce — je to seznam scénářů odjetých proti běžícímu systému a nálezy tam,
kde se obě strany nechovají stejně.

Důvod: oprávnění jde v appce **jinou cestou než na webu**. Telefon se
k lodi páruje mobilním klíčem (`Features/Klice/KlicLodi.cs`: *„Není to
přihlášení, je to oprávnění"*), web stojí na účtu a rolích
(`web/lib/co-smim.ts`, serverová pravda v `Features/Identita/Prava.cs`).
Dvě cesty k témuž jsou dvě místa, kde se dá udělat chyba.

## Jak se měřilo

| Co | Čím | Platnost závěru |
|---|---|---|
| web a jeho rozhodování o rolích | běžící `next dev` na 3100 proti mocku na 8090 | **plná** — měří se skutečná obrazovka |
| oprávnění appky ke klíčům a trasám | HTTP proti mocku, poté co byl mock srovnán s API (M1–M4 níž) | **plná pro tvar pravidla**, viz výhrada |
| veřejný výdej poloh | **produkce** `orlickypohar-api.klihovka.cz`, jen čtení | **plná** |
| okna regaty, nastavení trackingu | — | **NEODJETO**, viz poslední oddíl |

**Skutečné API lokálně neběží** a není to nedbalost: na tomhle stroji není
Docker ani Postgres, což plán zapisuje v oddílu *Kde se pokračuje*, bod 1.
Tvrzení o API se proto opírají buď o produkci, nebo o řádek zdrojáku — a je
u nich napsáno které.

**Výhrada k mocku.** Mock není API; je to jeho nápodoba. Tahle oponentura
začala tím, že se v něm našly tři kontroly, které se od API lišily
(M1–M3) — a lišily se **v obou směrech**, takže by měření rolí vyrobilo
jednou falešné „prošlo" a jednou falešné „odmítnuto". Srovnané jsou
od téhle session; kde mock pravidlo nemá vůbec, stojí u scénáře NEODJETO.

Mock běží na vlastním portu (`PORT=8090`), protože 8080 drží souběžná
session.

---

## Nálezy

### N1 — Panel trackeru pod výsledky si o polohy neřekne vlastní podmínkou

> **Opraveno 25. 10. 2026.** Stránka výsledků se ptá touž podmínkou jako
> API a panel kreslí, jen když na polohy je; kdo na ně není, oddíl *Kdo je
> na vodě* vůbec nevidí. Chybějící snímek už navíc neznamená prázdnou vodu:
> při výpadku čtení se píše *„teď se je nedaří načíst"*. Obojí změřeno na
> běžícím webu, výpadek přes prostředníka, který shodí jen cestu s polohami.

**Změřeno na běžícím webu.** `petr` je pořadatel regaty *FxCK Cancer*
a jiné role v ročníku nemá. Otevře výsledky **Izolepy**, která jemu nepatří:

```
/sprava/2026-nanecisto/vysledky/izolepa jako petr → 200
  oddíl „Kdo je na vodě"
  „Trať zatím nemá dva prvky, takže se nedá počítat postup ani kreslit mapa.
   Postav ji na obrazovce bójí."
```

Izolepa má trať o **třech** prvcích. Ta věta je nepravda a posílá člověka
stavět, co stojí, na obrazovku, která ho odmítne. Současně platí:
`GET …/zastavky/izolepa/polohy` jako `petr` → **403**.

Mechanismus je přesně ten, který se opravoval na vlastní stránce trackeru
(#474): stránka výsledků si podmínku **půjčuje od sousedního endpointu**.
Pouští ji `nactiRozjizdky`, jenže čtení výsledků je otázka na **celý
ročník** — `VysledkyEndpoints.PohledAsync` (`VysledkyEndpoints.cs:513`) se
ptá jen na `SerieId` a vrací pohled každému, kdo je rozhodčí **nebo
pořadatel jediné zastávky**; na cizí zastávce ho pak omezují příznaky
v řádcích, ne odmítnutí. Polohy mají podmínku užší:
`PolohyEndpoints.SmiAsync` chce pořadatele **té** regaty, nebo rozhodčího.

Panel se kreslí bez téhle podmínky
(`web/app/sprava/[serie]/vysledky/[zavod]/page.tsx`, oddíl *Kdo je na
vodě*), a protože `nactiPrvky` vrací na 403 prázdno (`web/lib/trat.ts:240`,
schválně — obrazovka bójí ho tak potřebuje), vyjde odmítnutí jako
„trať neexistuje".

Druhá větev téhož: `jenOdkazKdyzNic` v `panel.tsx:101` hlásí *„zatím se
nehlásí žádná loď"*, kdykoliv `prvni` chybí — tedy i při výpadku API
a při 403. To je tvrzení o vodě, které vzniklo z odpovědi serveru.

**Oprava:** zeptat se touž podmínkou jako `page.tsx` trackeru (`smi`
`Organizator`+zavod, nebo `Rozhodci`+serie) a při nesplnění napsat větu
místo panelu. Rozhodnutí zůstává na API; jde o to, aby obrazovka řekla
pravdu místo prázdna.

### N2 — Veřejný výdej poloh nekontroluje, že je regata vůbec zveřejněná

> **Opraveno 25. 10. 2026.** Cesta má tutéž dvojici podmínek jako sousedi.
> Hlídá to test `Nezverejnena_regata_se_ven_nevyda`, a jde **přes HTTP**:
> podmínku drží endpoint, takže test přes službu by prošel i bez ní.
> Lokálně se nedá spustit (není Docker), běží v CI.

**Změřeno na produkci, dvakrát, jen čtením:**

```
GET /serie/2026-nanecisto/zavody/vanocni-regata        → 404   (nezveřejněná)
GET /serie/2026-nanecisto/zavody/vanocni-regata/polohy → 200   {"vysila":false,…}
GET /serie/2026-nanecisto/zavody/naprosto-vymyslena    → 404
GET /serie/2026-nanecisto/zavody/naprosto-vymyslena/polohy → 404
```

Vymyšlený slug dá 404, takže těch 200 je skutečný řádek: regata, která
veřejně neexistuje, odpovídá na veřejné cestě poloh.

Sousední veřejné cesty mají podmínku dvojitou — `SerieEndpoints.cs:104`,
`ZavodEndpoints.cs:175`, `TratEndpoints.cs:224` všechny žádají
`z.Publikovano && z.Serie.Publikovano`. `PolohyEndpoints.VerejneAsync` má
jen `z.Slug == zavod && z.Serie.Slug == serie`.

Dnes z toho uniká pouze existence, protože `vysila` drží vypnutý přepínač
*živý přenos ven*. Až se zapne, bude jedinou zábranou on — a pravidlo
*„nepublikovaná regata veřejně neexistuje"*, které web říká u výsledků
nahlas, pro polohy platit nebude.

**Oprava:** dopsat tutéž dvojici podmínek jako u sousedů.

### N3 — Kdo odjíždí, vypnout si to nemůže. A klíč k lodi bez odpovědného nejde odebrat vůbec

> **Opraveno, 25. 10. 2026.** Držitel klíče se odepne i připne sám
> (`POST /klice/sledovani`, prokazuje se klíčem; v appce na obrazovce *Klíč
> k lodi*), takže věta z plánu platí. A **pořadatel regaty na klíč dosáhne**
> — Filip to rozhodl týž den: vlastní cesta
> `/sprava/serie/{serie}/zastavky/{zavod}/klice`, na webu sekce *Telefony na
> palubě* na obrazovce trackeru. Rozsah je tentýž jako u poloh a oken
> (pořadatel té regaty nebo rozhodčí ročníku) a sáhne jen na klíče lodí,
> které tu regatu jedou. Tím zmizel i případ *„loď bez odpovědného"*: klíč
> na ní odebere pořadatel.

Plán (*Telefon jako mobilní klíč k lodi*) má tabulku a pod ní větu:

> *„A sám člen posádky se smí odepnout taky — kdo odjíždí, vypne si to sám
> a není odkázaný na to, že na něj někdo nezapomene."*

`KlicLodi.cs` u `OdebranV` navíc tvrdí: *„Smí to kapitán, pořadatel — a sám
držitel klíče."* Kód (`KliceSprava.SmiSpravovatAsync`) zná jen **majitele
a kapitána**. Tři zdroje, tři různé odpovědi.

**Změřeno** (SENDY, loď bez majitele i kapitána, posádkou je `petr`):

```
posádka (petr) odepne klíč              403
cizí účet (jana)                        403
pořadatel regaty (milos)                403
správkyně celého webu (dana)            403
sám držitel klíče (hlavičkou X-Klic-Lodi) 401
```

Posádka přitom klíč **vydat smí** (změřeno: 201) — takže na lodi bez
odpovědného umí kdokoli z posádky telefon k lodi pustit a nikdo ho nemá
právo vzít. Jediné, co držiteli zbývá, je *zapomenout klíč* v telefonu;
`app/src/lib/klic.ts` k tomu sám píše, že **na serveru zůstává platný**.

Past *„telefon, který zůstal v autě"*, kvůli které dočasné odepnutí
vzniklo, tím zůstává otevřená z té strany, ze které ji plán zavírá.

**Oprava:** endpoint na odepnutí klíčem (ne účtem) pro držitele, a
rozhodnout, jestli pořadatel do tabulky patří — pak to srovnat v `KlicLodi.cs`.

### N4 — Odebrání klíče uzavře telefonu cestu k vlastní rozdělané trase

> **Vyřešeno zápisem, 25. 10. 2026** — ne změnou chování. Odebrání zůstává
> nevratné (klíč, který smí psát po odebrání, by nebyl odebraný), ale teď to
> stojí u tlačítka: na webu u *Odebrat natrvalo* i na *Moje lodě*, v appce
> v potvrzení. A je u něj i to, co má člověk udělat místo toho: odepnutí je
> vratné.

**Změřeno** (JOY, celý život klíče):

```
založit trasu, dávka 1                      200
majitelka ODEPNE klíč → telefon pošle dávku 401
majitelka zase PŘIPNE  → telefon pošle dávku 200   (idempotence drží)
majitelka ODEBERE      → telefon pošle dávku 401
                       → telefon dokončí nahrávání 401
```

Odepnutí je vratné a chová se, jak má. Odebrání ale neodřízne jen další
polohy: trasa je vedená na `KlicId` (`TrasySprava.cs:95`), takže co zůstalo
v telefonu, se už nikdy nedoposílá a trasa zůstane navždy rozdělaná — mezi
tím, co uzavření dne vykáže v `zbylo`, a nikdo s tím nic neudělá. Popis
endpointu (*„Pro odchod z posádky nadobro"*) na to neupozorňuje.

Není to nutně vada, je to **rozhodnutí, které nikde není zapsané**: buď
odebrat až po doposlání, nebo to u tlačítka říct.

### N5 — Nastavení, které nikdo nečte

> **Opraveno 25. 10. 2026.** Čte ho `GET /polohy`, kde se telefon prokazuje
> klíčem: nic, jen sebe, nebo i ostatní; mimo běžící okno nic. Chybějící
> řádek nastavení znamená *jen sebe*, tedy totéž co vydává
> `NastaveniSprava.NactiAsync` — bez přetypování na nullable by
> `FirstOrDefault` vrátil `Nic` a dvě místa by o téže regatě tvrdila dvě
> různé věci. **Zbývá to ukázat v appce**: endpoint existuje a má testy,
> obrazovka na palubě zatím ne.

`CoVidiPosadky` (*nic / jen sebe / i ostatní*) se ukládá, zamyká rozpravou,
po zámku jde jen zpřísnit a každá změna se píše do `ZmenaNastaveniTrackeru`
s důvodem — protože *„zamčené nastavení je zároveň doklad"* ke sporu
*„vy jste nás viděli a my vás ne"*.

**Nikdo tu hodnotu nečte.** Mimo `NastaveniSprava` a testy se na ni
neodkazuje žádný kód; `PolohySprava.SpoctiVenAsync` se ptá jen na
`ZivyPrenosVen` a jiný endpoint pro posádku neexistuje. Posádka na vodě
dnes nevidí ani sebe, ať je nastaveno cokoliv.

Doklad, který tvrdí „posádky viděly jen sebe", přitom nikdo neviděl nic, je
horší než žádný doklad.

### N6 — Řetěz se nedá projet, protože dvě obrazovky nejsou

> **Opraveno 25. 10. 2026.** Obrazovka trackeru nese celý závodní den:
> *Závodní den* (rozprava otevře, konec dne zavře), *Co je vidět* (tři
> přepínače i se zámkem a důvodem) a *Telefony na palubě*. Tři otázky téhož
> člověka v tentýž den — *jede se?*, *kdo to uvidí?*, *hlásí se všichni?* —
> takže jedna obrazovka, ne tři. **Odjeto celým řetězem** (mock, Izolepa):
> zapnout přenos ven → rozprava → nastavení zamčené, pořadatel už na ně
> nesmí (403) a rozhodčí bez důvodu taky ne (409) → odstartovaná rozjížďka →
> veřejná tabule vysílá 17 lodí bez přihlášení → uzavřít den → přestane.

Appka nahraje trasu jen při běžícím okně (`TrasyEndpoints`: *„Bez běžícího
okna regaty trasa nevznikne"*, 409). Okno otevírá pořadatel rozpravou
(`POST …/okna/rozprava`), přenos ven pouští rozhodčí
(`PUT …/tracker/nastaveni`). **Ani jedna cesta nemá na webu obrazovku** —
`grep` po `/okna` a `tracker/nastaveni` najde ve `web/` jen komentáře
a generované typy.

Důsledek měřitelný na produkci: `vysila:false` na všech regatách a není,
kdo by to změnil. A plán u zámku žádá, aby *„pořadatel výchozí hodnotu
viděl dřív, než zaklapne"* — bez obrazovky to splnit nejde.

Není to regrese, je to další kus pořadí práce; patří sem proto, že bez něj
se žádný scénář okna ani přenosu ven nedá odjet (viz NEODJETO).

### N7 — Drobnosti

> **Opraveny všechny tři, 25. 10. 2026.**

- `web/app/moje-lode/page.tsx`: tlačítka *Vypnout sledování* a *Odebrat* se
  kreslila podle `spravujeLod = posadka?.stav === "ok"`, tedy podle toho,
  jestli prošlo **čtení připojení** — ne podle role, kterou má obrazovka
  o řádek výš. Dnes se ty množiny kryjí, zítra je to další půjčená podmínka.
  Teď se ptá na roli (`spravujeKlice`).
- `app/src/app/lode/[lod].tsx` nabízelo *Vystavit pozvánku* každému, kdo
  obrazovku otevřel. Server to odmítne (změřeno 403), takže šlo o slib
  naprázdno, ne o díru — tlačítko teď vidí jen ten, kdo k lodi patří.
- Plán tvrdil: *„Zbývá vydávání pozvánek. Server je umí, ale kapitán je nemá
  odkud vystavit."* Neplatilo od 23. 10.; opraveno.

### N8 — Uzavřený závodní den vysílání nezastavil

**Vyšlo až při zkoušce celého řetězu 25. 10. 2026** a je to tentýž druh
chybějící podmínky jako N2.

`SpoctiVenAsync` se ptal na dvě věci: povolený přenos a běžící rozjížďku.
Jenže **konec rozjížďky je rozhodnutí rozhodčího, ne dopočet** — uzavření
dne ji jen vypíše v `zbylo` a nic s ní nedělá. Takže zapomenutá rozjížďka
znamenala, že tabule vysílá dál i večer, kdy se pole vrací k molu: přesně
ten výdej, kterému se má ořez vyhnout.

Změřeno: po uzavření dne `oknoBezi: false`, a přitom `vysila: true`.
Opraveno — ven se vydává, jen když běží i okno závodního dne. Hlídá to test
`Po_uzavreni_dne_se_ven_nevysila`.

---

## Nálezy v mocku (a co se s nimi udělalo)

Mock je měřicí přístroj téhle i příští oponentury. Tyhle čtyři věci měřily
něco jiného, než co je na nich napsané; jsou srovnané v téže větvi.

| | Co dělal | Co dělá API | Čím by to lhalo |
|---|---|---|---|
| **M1** | polohy vydával komukoliv s rolí kdekoliv v ročníku (změřeno: `milos` na cizí `jarni-vitr` → 200, 11 lodí) | pořadatel **té** regaty, nebo rozhodčí | falešné „prošlo" u přesně toho scénáře, kvůli kterému tahle session vznikla |
| **M2** | čtení výsledků chtěl roli **k té zastávce** | `PohledAsync` se ptá na celý ročník | falešné „odmítnuto" — a N1 by zůstal neviditelný |
| **M3** | pozvánku ke klíči vydal komukoli přihlášenému ke kterékoli lodi (změřeno: `jana` na cizí SENDY → 201) | `SmiVydavatAsync`: majitel, kapitán, posádka | celá tabulka „kdo smí vydat klíč" by vyšla jako prošlá |
| **M4** | výpis klíčů, odepnutí a odebrání neměl vůbec (404) | čtyři endpointy v `KliceEndpoints` | scénáře *kdo smí klíč vzít* nešlo odjet; obrazovka *Moje lodě* spadla na chybu |

Co mock pořád nemá: `GET /okna`, `GET /trasy`, nastavení trackingu a
pravidlo *bez okna trasa nevznikne*. Jeho veřejný výdej poloh se navíc
chová jako regata s **povoleným** přenosem (vysílá, jakmile běží
rozjížďka) — je to v jeho dokumentaci přiznané, ale znamená to, že přepínač
*živý přenos ven* se na něm vyzkoušet nedá.

---

## Odjeté scénáře

### Web — kdo vidí živé polohy

Měřeno na běžícím webu, cookie `op_token`. `milos` = pořadatel jen Izolepy,
`zdenek` = rozhodčí ročníku, `dana` = správkyně celého webu bez role
v ročníku, `jana`/`petr` = lodě bez role ve správě.

| Účet | `/tracker/izolepa` | `/tracker/jarni-vitr` | `/vysledky/izolepa` | `/vysledky/jarni-vitr` |
|---|---|---|---|---|
| nepřihlášen | „musíš se přihlásit" | totéž | totéž | totéž |
| `filip` správce ročníku | mapa | mapa | panel | panel |
| `milos` pořadatel Izolepy | mapa | **odmítnut větou** | panel | panel ← **N1** |
| `zdenek` rozhodčí | mapa | mapa | panel | panel |
| `dana` správkyně webu | mapa | mapa | panel | panel |
| `jana`, `petr` bez role | **odmítnut větou** | odmítnut větou | „nemáš přístup" | „nemáš přístup" |

Vlastní stránka trackeru se po #474 ptá touž podmínkou jako API a je
v pořádku ve všech osmi kombinacích. Stránka výsledků kreslí panel všude,
kde pustí výsledky — a to je širší množina.

### Web — co se pouští ven

| Scénář | Výsledek |
|---|---|
| `/serie/…/zavody/izolepa/tabule` bez přihlášení | 200 |
| `/tabule/polohy` před startem | `vysila:false`, žádné lodě |
| `/tabule/polohy` když běží rozjížďka (mock) | `vysila:true`, **17 lodí** — bez přihlášení |
| totéž na produkci (skutečné API) | `vysila:false` na všech regatách |
| `/sprava/…/polohy` bez tokenu, produkce | 401 |

Ven jde `lodId`, jméno lodi, kategorie, poloha, kurz, rychlost, čas GPS.
Jména posádky ani klíče ne. Loď bez polohy se ven neposílá — 17 z 22,
jak to `SpoctiVenAsync` slibuje.

### Appka — kdo smí co s klíčem

| Scénář | Výsledek | Shoda s plánem |
|---|---|---|
| majitelka vydá pozvánku ke své lodi | 201 | ano |
| kapitán ke své lodi | 201 | ano |
| **posádka s účtem** ke své lodi | 201 | ano (rozhodnutí z 23. 10.) |
| cizí účet k cizí lodi | 403 | ano |
| **správce ročníku bez vazby k lodi** | 403 | ano |
| **správkyně celého webu** | 403 | ano |
| bez přihlášení | 401 | ano |
| výpis telefonů: posádka / cizí | 200 / 403 | ano |
| uplatnit pozvánku bez přihlášení | 200 | ano |
| uplatnit tutéž podruhé | 400, tatáž hláška jako u vymyšlené | ano |
| odepnout nebo odebrat klíč: posádka, pořadatel, správce webu, držitel klíče | 403, 403, 403, 401 | **ne** — viz N3 |
| trasa klíčem / bez klíče / s vymyšleným | 200 / 401 / 401 | ano |
| tatáž dávka bodů podruhé | `prijato:0, preskoceno:1` | ano |

### Obě strany proti sobě

**Loď má klíč a posílá polohy — kdo ji uvidí?** Pořadatel té regaty
a rozhodčí ročníku (a kdo je nad nimi: správce ročníku, správce webu).
Veřejnost jen tehdy, když rozhodčí pustil *živý přenos ven* **a** zrovna
běží rozjížďka — dnes nikdo, protože přepínač nemá obrazovku (N6).
Posádka sama nevidí nic, ani sebe (N5). A na cizí regatě to dnes vidí
i pořadatel jiné zastávky, pokud přijde přes výsledky (N1).

**Člověk má na webu roli — smí spustit sledování lodi?** **Ne, a to je
správně** (změřeno: správce ročníku i správkyně celého webu dostanou na
vydání klíče 403). Klíč stojí na vazbě k lodi, ne na roli ve správě. Jediná
cesta od role k trackování vede oklikou: správce ročníku smí měnit vazby
k lodím (`KapitanstviEndpoints`, `Pozadavek(Role.Spravce, serie)`), takže
si kapitánství k cizí lodi může udělit sám a klíč vydat potom. Je to dvakrát
zapsané v historii vazeb, tedy stopa zůstává — ale je to cesta a patří ji
znát.

Obě strany jsou tedy záměrně nesymetrické a drží to: **klíč dává psát,
role dává číst.** Nálezy nejsou o té asymetrii, ale o místech, kde si
jedna strana přečetla podmínku té druhé nepřesně.

---

## NEODJETO (a proč)

Stav k 25. 10. 2026, po opravách. První čtyři řádky z 24. 10. už odjet jdou
— mock okna i nastavení dostal a obrazovka existuje.

| Scénář | Proč |
|---|---|
| ~~okno regaty: rozprava otevře, konec dne zavře~~ | **odjeto** přes obrazovku trackeru |
| ~~*živý přenos ven*: rozhodčí pustí, pořadatel po zámku nesmí~~ | **odjeto**: 403 pořadateli, 409 bez důvodu |
| ~~*co vidí posádky* v praxi~~ | **odjeto** na API (`GET /polohy`) a testy; v appce to zatím není vidět |
| **mimo okno trasa nevznikne (409)** | mock to pravidlo nemá — trasu vezme vždycky. Platí z kódu a z testů API, změřit se to tady nedá |
| klíč bez účtu na skutečném telefonu | APK/simulátor mimo rozsah; měřeno HTTP tvarem, který appka posílá |
| trasa po odebrání klíče v databázi (zůstane, nebo zmizí) | ořez a mazání čeká na úseky rozjížděk, viz plán |
| integrační testy API | na tomhle stroji není Docker ani Postgres; nové testy poběží v CI |
