# Audit obsazení: táž regata v pěti sestavách lidí (26. 10. 2026)

Zadání: *„projít regatu z pohledu všech rolí — a hlavně když je Miloš zároveň
pořadatel i rozhodčí a je na všechno sám. Posoudit z pohledu ergonomie
a intuitivního designu."*

Tenhle audit je **kolmý na `docs/SCENARE-OVLADANI.md`.** Ten jde po rolích
a ptá se, kam se která role dostane. Tenhle jde po **obsazeních lidmi** a ptá
se, co se stane, když jeden člověk drží dvě role najednou — nebo když je rolí
víc než lidí. Nálezy se proto nepřekrývají: SCENARE měří, jestli cesta
existuje, tohle měří, jestli má smysl po ní jít tolikrát.

**Hlavní výstup není seznam překlepů**, ale odpověď na otázku, jestli má
aplikace u jednoho člověka ustoupit. Je dole, hned za přehledem obsazení.

## Mez poctivosti

**Je to simulace agentem, ne sezení s živým pořadatelem.** Čerstvý člověk
u téhle zkoušky neseděl a žádný z nálezů neříká, jak dlouho kdo co hledal.
Měřitelné bylo tohle a nic víc: **jestli cesta existuje, jestli ji role
projde, co je na obrazovce napsáno a kolikrát se musí klepnout.** Sezení
s pořadatelem v plánu pořád chybí a tenhle audit ho nenahrazuje — pořadí
nálezů podle toho, co bolí, je odhad, ne pozorování.

Druhá mez: **skutečné API tu neběží** (na stroji není Docker ani Postgres,
viz `docs/PLAN.md`, *Kde se pokračuje*). Měřilo se proti mocku, a **mock
není API**. U každého nálezu je proto napsané, odkud tvrzení je — z běžící
obrazovky, z odpovědi mocku, nebo z řádku zdrojáku API. Kde se mock od API
lišil, je to v oddílu *Nálezy v mocku*; všechny takové rozdíly se napřed
srovnaly, teprve pak se měřilo.

## Jak se měřilo

| Co | Čím | Platnost závěru |
|---|---|---|
| rozcestník, kalendář, oprávnění, bóje, zápis, porovnání | běžící `next dev` na **3077** proti mocku na **8077** | **plná** — měří se skutečná obrazovka |
| kdo co smí v řadě stavů a v udělování rolí | HTTP proti mocku, **po** srovnání mocku s API (M1–M6) | **plná pro tvar pravidla** |
| tvrzení o API | řádek zdrojáku, vždy jmenovaný | plná pro pravidlo, ne pro běh |
| trvanlivost, databáze, integrační testy | — | **NEODJETO**, viz konec |

Souběžné session držely 8080, 8090 a 8099, tahle si vzala **8077 / 3077**.
Mock nic neukládá na disk, takže každý restart vrací výchozí stav.

## Pět obsazení a jak se vyrobila

V mocku **žádný účet nemá dvě role**, takže obsazení 1 bylo potřeba vyrobit —
a to je samo o sobě první nález. Výchozí stav: `filip` správce ročníku,
`milos` pořadatel jen Izolepy, `zdenek` rozhodčí ročníku, `dana` správkyně
celého webu, `jana` a `petr` bez role.

| # | Kdo je kdo | Jak se to v mocku vyrobilo |
|---|---|---|
| 1 | **Miloš sám na všechno** | `filip` udělil `milos` roli *Rozhodci* na celý ročník; pořadatele Izolepy už měl |
| 2 | pořadatel + jeden pomocník + Miloš | `jana` jako druhý pořadatel Izolepy, `milos` rozhodčí |
| 3 | tři pořadatelé; jeden z nich s Milošem zapisují v cíli | tytéž role, zápis ze dvou účtů do jedné rozjížďky |
| 4 | jeden pořadatel; Miloš staví start a cíl, pomocník otočky a zapíše cíl | tytéž role, dva lidé do jedné trati |
| 5 | Miloš jen rozhodčí, dva pořadatelé dělají všechno | `milos` bez pořadatelství, `jana` a `petr` pořadatelé |

**Obsazení 2 a 5 nemají vlastní měření navíc.** Co je na nich jiné, stojí na
týchž třech otázkách, které odjela obsazení 1, 3 a 4: smí si pořadatel
přibrat pomocníka (O12), kdo trať přijme (O11) a kdo pustí výsledky ven (O3).
Zapsané je to tak, aby bylo poznat, že jde o tytéž naměřené odpovědi, ne
o tři nezávislá potvrzení.

---

## Odpověď: má aplikace u jednoho člověka ustoupit?

**Ne sloučením kroků. Ano zkrácením cesty mezi nimi — a u jednoho místa
nestačí ani to.**

Tři důvody, proč **nesloučit** a nedělat přepínač „jsem na to sám":

1. **Aplikace nepozná, proč druhý pár očí chybí.** Jestli tam nikdo není,
   nebo se jen Miloš nepodíval, vypadá z dat stejně. Podpis, který se dá
   zapnout, přestane být podpisem — a je to podpis, o který se opírá
   protest: rozhodčí říká „čísla platí", a to je věta ze Závodních pravidel,
   ne z aplikace.
2. **Ten přepínač by zapnuli všichni**, protože je rychlejší. Pak se dělba
   rolí neztratí jen Milošovi, ale i tam, kde dva lidé jsou.
3. **Obřad je ve skutečnosti malý.** Změřeno na jedné rozjížďce v obsazení 1:
   zápis se ukládá sám po každém klepnutí, a nad ním jsou **dvě klepnutí**
   (*Ověřit*, *Schválit*). Na trati jsou taky dvě (*Hlásit hotovo*,
   *Přijmout trať*). Čtyři klepnutí na regatu není důvod bourat dělbu rolí.

Co **ustoupit má**, je tohle — a jsou to tři různé věci:

- **Cesta mezi kroky, ne kroky samy.** Dnes každý krok bydlí jinde: hotovo
  a přijetí na obrazovce bójí (to je v pořádku, jsou vedle sebe), ale
  založení regaty v kalendáři, udělení role sobě samému na oprávněních
  a vypsání zase v kalendáři (O2). Tam se ušetřit dá.
- **Jak s ním aplikace mluví.** Obrazovka o Milošovi mluví ve třetí osobě:
  *„Stavitelé hlásí, že trať stojí. Veřejná bude, až ji rozhodčí přijme."*
  a *„Vrátit stavitelům — vidí to ten, kdo trať staví"* (O11). To není
  obřad, to je nedorozumění: aplikace ví, že je to tentýž člověk, a dělá,
  že ne.
- **Zeď na konci, kterou zkrátit nejde.** `Potvrzeno` a publikace patřily
  **správci** a správce **není v žádném z pěti obsazení** (O3). Ať je
  u vody jeden člověk nebo pět, poslední dvě klepnutí za ně udělal někdo,
  kdo tam není. **Tohle bylo jediné místo, kde nestačí ergonomie a musí se
  rozhodnout o pravidle.** Filip rozhodl 27. 10. 2026: **výsledky pouští
  ven rozhodčí.** Podrobnosti a co se tím ztratilo jsou v O3.

---

## Nálezy

Stav u každého: **opraveno** (v téhle session), **zapsáno** (čeká na
rozhodnutí), **potvrzeno** (dřívější pozorování, které se znovu potkalo).

### O1 — Rozhodčí jedné regaty neexistuje, takže „Miloš na všechno" je rozhodčí všech osmi

*Obsazení 1. Změřeno: odpověď mocku + `Udeleni.ProcNejde`. Stav: **zapsáno**.*

Role `Rozhodci` a `Spravce` jdou udělit **jen na celý ročník**:

```
POST /sprava/serie/2026-nanecisto/opravneni  {role: Rozhodci, zavod: izolepa}
  → 400 „Role Rozhodci platí pro celý ročník, ne pro jednu zastávku."
```

Je to schválně a zdrojový komentář důvod říká: *„kdyby to šlo, vznikl by
rozsah, o kterém plán mlčí a `Prava` ho tiše uznají"*
(`Features/Sprava/Udeleni.cs`). Důsledek pro obsazení 1 ale stojí za
vyslovení: **„Miloš dělá rozhodčího na své regatě" se zapsat nedá.** Zapíše
se jen „Miloš je rozhodčí celého ročníku", a tím dostane ověřování
a schvalování výsledků i u sedmi regat, které nepořádá — a na rozcestníku
vidí všech osm (O5).

Druhá cesta, jak udělat „jednoho člověka na všechno", je dát mu **správce
ročníku**. Pak ale padá celá dělba: `Workflow.ProcNejde` správci dovolí
přeskočit řadu dopředu, takže z návrhu rovnou na potvrzeno. Rozdíl mezi
těmi dvěma cestami je ostrý a aplikace ho nikde nepojmenuje: *dvě role*
znamená čtyři klepnutí a zeď na konci, *správce* znamená jedno klepnutí
a žádnou kontrolu.

### O2 — Kdo regatu založí, není jejím pořadatelem — a aplikace o tom mlčí

*Obsazení 1, 5. Změřeno na obrazovce i přes HTTP. Stav: **zapsáno**.*

Řada je rozdělená: založit a potvrdit termín smí rozhodčí, **vypsat
a nahlásit odjeto pořadatel té regaty** (`Kalendar.KdoSmi`). Miloš jako
rozhodčí regatu založí a potvrdí, a pak se zastaví:

```
POST …/zastavky/podzimni-zkouska/stav {stav: Vypsany} jako milos → 403
```

Na obrazovce to ale **není 403, je to ticho**. V kalendáři u právě založené
regaty stojí:

```
Podzimni zkouska · termín platí · nezveřejněno
14. listopadu 2026
[Vrátit do plánu] [Zrušit] [Upravit termín a údaje]
```

Tlačítko *Vypsat* tam není a nic neříká proč — `mozneStavy` ho správně
vynechá, protože Miloš na té regatě pořadatelem není. Jediný krok, který
má přijít další, tedy z obrazovky zmizí beze stopy.

Vyřešit si to Miloš umí sám: jako rozhodčí si **udělí pořadatele vlastní
regaty** (`Udeleni.RozhodciSmiUdelit` to dovolí a nikdo nehlídá, že ten
e-mail je jeho vlastní). Měřeno: `POST …/opravneni` jako `milos` s tělem
`{email: milos@…, role: Organizator, zavod: podzimni-zkouska}` → 201,
a hned potom `{stav: Vypsany}` → 200.
Je to **jiná obrazovka, tři pole a tři klepnutí** kvůli kroku, o kterém se
nedozvěděl.

*Návrh k rozhodnutí:* buď ať se zakládající rozhodčí stane pořadatelem rovnou
(a pak ať to formulář řekne zaškrtávátkem „pořádám ji sám"), nebo ať
v kalendáři u regaty bez pořadatele stojí věta, že pořadatele ještě nemá
a kudy se přiřazuje. Dnes není ani jedno.

### O3 — Konec řady patří správci, a správce není v žádném z pěti obsazení

*Všechna obsazení. Změřeno: dvě odpovědi mocku, pravidlo v API. Stav: **rozhodnuto a opraveno 27. 10. 2026**. **Hlavní nález auditu.***

> **Filipovo rozhodnutí: výsledky pouští ven rozhodčí.** Z možnosti (c) níž,
> a s vědomím, že „čísla platí" a „ať to vidí veřejnost" tím u rozjížďky
> říká týž člověk. Pravidlo i s důvodem je `Workflow.KdoSmiPublikovat`,
> v plánu oddíl *Pouští ven rozhodčí*.
>
> **Co se tím povedlo.** Celá řada od zápisu po veřejná čísla se dá odjet
> lidmi, kteří u vody jsou — měřeno znovu za Miloše: vrátit k revizi,
> stáhnout z webu, zpátky do návrhu, ověřit, schválit, pustit ven, všechno
> 200. Spolu s tím padl i nález **O4**: kdo smí říct „čísla neplatí", je
> teď smí i sundat.
>
> **Co drží dál.** Dvojice očí: pořadatelka Jana, která čísla zapsala,
> dostane na publikaci 403 a `smiPublikovat: false` — test
> `Ven_pousti_rozhodci_ne_zapisovatel`. Jediné obsazení bez druhého páru
> očí zůstává to první, kde je jeden člověk obojí; tam ho aplikace nemá
> jak nahradit.
>
> **Co zůstalo správci.** `Potvrzeno` (archivní zámek), zveřejnění
> **regaty** v kalendáři a publikace ročníku. Nově založená regata se tedy
> bez správce ven pořád nedostane (O2) — jen už to není otázka každého
> závodního dne, protože regata bývá zveřejněná dávno před startem.
>
> **Co se tím ztratilo.** Schválenou rozjížďku, která už venku je a čeká
> jen na `Potvrzeno`, nikdo nepřipomíná: `kPodpisu` se zúžilo na
> *Navrzeno* a *Overeno* (jinak by rozhodčí četl „čeká na tvůj podpis"
> u čísel, která sám podepsal) a `kPublikaci` se rozšířilo na *Schváleno*
> i *Potvrzeno*, které nejsou venku. Správce to má na obrazovce výsledků,
> ne v „co teď". **Tohle je ta část změny, kterou Filip nezadal a já ji
> udělal, aby byla ta první vidět** — bez ní by se rozhodčí o publikaci
> z rozcestníku nedozvěděl vůbec.

Celá řada v obsazení 1, jedním člověkem, na Izolepě:

```
KRevizi   (rozhodčí) → 200
Navrzeno  (pořadatel) → 200
Overeno   (rozhodčí) → 200
Schvaleno (rozhodčí) → 200
Potvrzeno (správce)  → 403  „Stav „Potvrzeno" je podpis někoho jiného."
publikace (správce)  → 403  „Na tohle nemáš v ročníku roli."
```

Pravidlo je v `Workflow.KdoSmi` (*Potvrzeno* a vše ostatní mimo řadu →
`Role.Spravce`) a v `VysledkyEndpoints.PublikaceAsync`
(`Pozadavek(Role.Spravce, SerieId)`). Totéž platí o zveřejnění **regaty**:
`KalendarEndpoints.PublikaceAsync` chce taky správce, takže nově založená
regata zůstane nezveřejněná (měřeno: 403) a obrazovka výsledků o tom píše
*„Regata sama není zveřejněná, takže veřejnost neuvidí ani výsledky, které
pustíš ven"* — Milošovi, který s tím nic nenadělá.

**Žádné z pěti obsazení správce neobsahuje.** Ať je u vody jeden člověk nebo
pět, po posledním dojezdu je potřeba šestý, který tam není. Dnes je to Filip.

*Rozhodnutí je Filipovo* a jsou tři možnosti: (a) nechat to tak a napsat do
plánu, že správce je součástí štábu závodního dne; (b) pustit publikaci
rozhodčímu jeho ročníku a správci nechat jen zřizování a role; (c) nechat
`Potvrzeno` správci a publikaci dát rozhodčímu — „čísla platí" a „ať to vidí
veřejnost" by pak říkal týž člověk, což je přesně to rozdělení, proti kterému
plán argumentuje.

### O4 — Rozhodčí řekne „čísla neplatí" a nemá jak je stáhnout z webu

*Obsazení 1–5. Změřeno na veřejné stránce. Stav: **opraveno 27. 10. 2026** spolu s O3 — rozhodčí teď má u rozjížďky tlačítko *Stáhnout z webu* (ověřeno na obrazovce i přes API). Otevřená zůstává jen druhá polovina návrhu níž: označit na veřejné stránce čísla, která se právě přepočítávají.*

Publikace je vlastní příznak, ne stupeň řady — to je v plánu schválně.
Důsledek v provozu: když rozhodčí vrátí rozjížďku k revizi, **zůstane
veřejně viditelná a ničím označená**.

```
POST …/rozjizdky/1/stav {KRevizi, duvod: "Prohozené Cafe, oprav to."} → 200
GET  /serie/2026-nanecisto/zavody/izolepa          → pořád 3 rozjížďky
/serie/…/izolepa/vysledky                          → sloupec „1.*" beze změny
```

Hvězdička u sloupce znamená „nepočítá se do poháru", o revizi neříká nic.
Sejmout čísla z webu smí jen správce (`PublikaceAsync`), takže ten, kdo
právě prohlásil, že jsou špatně, je tam nechá viset. Veřejná cesta to
umožňuje z API, ne z mocku: `ZavodEndpoints.cs:263` pouští výsledek podle
`Rozjizdka.Publikovano` a `StavVysledku` sleduje jen kvůli eliminaci.

*Návrh:* buď u publikované rozjížďky v revizi psát na veřejné stránce
„tahle čísla se právě přepočítávají", nebo nechat vrácení k revizi strhnout
publikaci. První je poctivější — výsledek nezmizí, jen přestane tvrdit, že
platí.

### O5 — Druhá role sebere oddíl „Moje regaty" a vlastní regata se ztratí mezi osmi

*Obsazení 1. Změřeno na obrazovce + `co-smim.ts`. Stav: **zapsáno**.*

Pořadatel jedné regaty má na rozcestníku nadpis **Moje regaty** a pod ním
jediný řádek. V okamžiku, kdy dostane roli na celý ročník, se nadpis změní
na **Regaty ročníku** a vypíše se jich osm — jeho vlastní je čtvrtá
odshora a od ostatních se neliší ničím.

Dělá to `jenSveZastavky` (`web/lib/co-smim.ts`): kdo má právo na celý
ročník, „není omezený na zastávky", takže vrací `null` a `page.tsx`
(`jenSve ? "Moje regaty" : "Regaty ročníku"`) vypíše všechno. Je to správně
jako odpověď na otázku *na co má práva*, ale špatně jako odpověď na otázku
*kde dneska stojím na břehu*.

*Návrh:* vypisovat obojí — *Moje regaty* z pověření k zastávkám a pod tím
*Ostatní regaty ročníku* z ročníkové role. Dnes to druhé pohltí to první.

### O6 — Rozcestník sliboval rozhodčímu tři věci, které mu obrazovka ani nenabídne

*Obsazení 1, 5. Změřeno na obrazovce. Stav: **opraveno**.*

Rozcestník u rozhodčího psal:

- *Kalendář ročníku — „Vypsat regatu, posunout termín, zrušit."* Vypsat
  nesmí, to je pořadatel (O2).
- *Oprávnění — „Komu udělit roli pořadatele, rozhodčího, správce."*
  Rozhodčího ani správce udělit nesmí (`Udeleni.RozhodciSmiUdelit`), a sama
  obrazovka oprávnění mu ty dvě role v nabídce ani neukáže.
- *Výsledky — „Ověřit rozjížďky, vrátit k revizi a pustit ven."* Pustit ven
  tehdy nesměl (O3). Od 27. 10. 2026 smí, takže se tahle věta vrátila
  zpátky — ale už je pravdivá.

Je to přesně to, proti čemu stojí hlavička `co-smim.ts`: *„slib naprázdno je
horší než chybějící odkaz"*. **Opraveno**: všechny tři položky mají teď
podoby podle role, stejně jako výsledky a přihlášky od 8. 10.
Rozhodčí čte „Založit regatu, potvrdit a posunout termín, zrušit",
„Komu z regat přiřadit pořadatele nebo editora" a „Ověřit rozjížďky a vrátit
je k revizi"; správce dál čte svoje.

### O7 — Pořadatel neměl na kalendář odkaz, ačkoliv se jeho závod vypisuje jen tam

*Obsazení 2, 3, 4, 5. Změřeno na obrazovce. Stav: **opraveno**.*

`jana`, pořadatelka Izolepy, viděla na rozcestníku *Moje regaty* s pěti
odkazy a **žádný kalendář** — položka chtěla rozhodčího. Přitom server ji
do kalendáře pouští (`KalendarEndpoints.PohledAsync` se ptá
`zavody.Count > 0`), má tam u své regaty tlačítko *Vrátit mezi vypsané*
a **vypsání vlastního závodu se nedá udělat nikde jinde**. Adresa
`/sprava/{ročník}/kalendar` fungovala, jen k ní nevedla cesta.

Je to tatáž vada jako u trackeru 24. 10. — funkce bez cesty. **Opraveno**:
položka *Kalendář ročníku* má teď i pořadatelskou podobu („Vypsat svou
regatu a nahlásit, že se odjela.") a ukáže se každému, kdo je pořadatelem
aspoň jedné regaty ročníku. Ověřeno na obrazovce za `jana`.

### O8 — Přestavba trati založí **prázdnou** trať: tři prvky se staví znovu

*Obsazení 1, 4. Změřeno na obrazovce + `TratSprava.PrestavbaAsync`. Stav: **zapsáno**.*

Přijatá trať je zamčená a obrazovka říká, jak ji rozmrazit: *„na úpravu ji
nejdřív odemkni přestavbou"*. U trati, podle které se už jelo, přestavba
starou nepřepíše — založí novou (`TratSprava.PrestavbaAsync`, větev
`OdjetaAsync`). **A ta nová je prázdná.** Změřeno: Izolepa měla start, bóji
a cíl; po přestavbě stojí na obrazovce *„Prvky trati — zatím žádné."*

Kdo posunul jednu bóji o dvacet metrů, staví průvodcem všechny tři prvky
znovu, na vodě, na telefonu. Klonování prvků přitom aplikace umí
(`POST …/trat/{id}/klon`, *„kopíruje prvky na tytéž bóje — žádná nová
pípnutí"*), jen se nabízí na jiném místě: na trať **pro další rozjížďku**,
ne jako převzetí při přestavbě.

*Návrh:* po přestavbě prvky převzít (je to „táž trať, jen jinak postavená" —
`NahrazujeId` to tak i jmenuje), nebo aspoň nabídnout jedním klepnutím
*Převzít prvky z předchozí trati*.

### O9 — Po přestavbě obrazovka zůstala stát na staré trati a druhé klepnutí založilo další

*Obsazení 1, 4. Změřeno na obrazovce. Stav: **opraveno**.*

Po *Odemknout na přestavbu* se nahoře objevila hláška „Trať je odemčená",
ale panel pod ní dál popisoval **starou** trať: „Přijatá a zamčená" i s
tlačítkem *Odemknout na přestavbu*. Kdo klepl znovu — a to je na vodě
pravděpodobné, když hláška říká jedno a panel druhé — založil třetí trať:

```
klepnutí 1 → Trať 4 · 2. rozjížďka · přestavuje se
klepnutí 2 → Trať 5 · 2. rozjížďka · přestavuje se
```

Příčina: `stavTratiAkce` posílá v přesměrování **to id trati, se kterým se
přišlo**, a dělá to schválně — u *hotovo*, *přijetí* a *vrácení* je to
správně (Filip, 15. 10. 2026: *„rozhodčí pak přijme trať, na kterou se
nedíval"*). Přestavba je ale jediný krok, který může vrátit **jinou** trať,
a odpověď serveru se zahazovala.

**Opraveno**: `posunTrat` vrací i id trati z odpovědi a u přestavby se jde
na něj. Ověřeno na obrazovce — po klepnutí se otevře Trať 4 se stavem
„Přestavuje se" a s tlačítkem *Hlásit hotovo*.

### O10 — Nahlášené „hotovo" jde potichu podrýt: do trati se dál staví a stav zůstane

*Obsazení 4 (dva lidé staví jednu trať). Změřeno na mocku + `ProcNejdeStavetAsync`. Stav: **zapsáno**.*

Stavění brání jedině stav `Prijato`
(`TratSprava.ProcNejdeStavetAsync`: `is { Stav: StavTrati.Prijato }`).
Trať ve stavu `Hotovo` — tedy *„Stavitelé hlásí, že trať stojí. Veřejná
bude, až ji rozhodčí přijme."* — se **dá dál měnit a stav se nevrátí**:

```
trať 4, stav Hotovo
POST …/trat/prvky?trat=4 jako jana → 201 (prvek přibyl)
GET  …/trat?trat=4                 → stav: Hotovo
```

V obsazení 4 je to přesně ta situace ze zadání: Miloš postaví start a cíl
a nahlásí hotovo, pomocník mezitím dopípne otočné bóje — a Miloš jako
rozhodčí přijímá trať, kterou už neviděl. Nic mu neřekne, že se po nahlášení
změnila.

*Návrh:* úprava prvku nebo bóje na trati ve stavu `Hotovo` ať ji vrátí do
`Rozestaveno` (ať ji někdo nahlásí znovu), nebo ať aspoň u přijetí stojí
„od nahlášení hotovo přibyly 2 změny".

### O11 — Obrazovka mluví o Milošovi ve třetí osobě

*Obsazení 1. Změřeno na obrazovce. Stav: **zapsáno** — jádro otázky o ustoupení.*

Doslovné znění, které Miloš (pořadatel i rozhodčí v jedné osobě) na
obrazovkách čte:

| Kde | Co tam stojí |
|---|---|
| trať, stav *Staví se* | „Až bude stát, nahlas hotovo a **rozhodčí** ji přijme." |
| trať, stav *Hotovo* | „**Stavitelé** hlásí, že trať stojí. Veřejná bude, až ji **rozhodčí** přijme." |
| trať, tlačítko | „Vrátit stavitelům — co chybí. **Vidí to ten, kdo trať staví.**" |
| rozcestník, *Co teď* | „Ověřit výsledky — Izolepa. 4. rozjížďka **čeká na tvůj podpis**." |

Poslední řádek je dobře: mluví k němu. První tři mluví **o něm** jako o někom
dalším, a poslední z nich mu nabízí napsat vzkaz sám sobě.

Tohle je to, co se na obsazení 1 doopravdy pozná — ne počet klepnutí, ale že
aplikace nepracuje s tím, že obě role drží tentýž člověk, ačkoliv to z `/ja`
ví. **Ustoupit má tady**: stejné kroky, jiná věta. Například „Trať stojí.
Jsi tu i rozhodčí — přijmout ji můžeš rovnou" místo *„čeká na rozhodčího"*.

### O12 — Pořadatel si nemůže přibrat pomocníka

*Obsazení 2, 3, 4. Změřeno na mocku, pravidlo v `OpravneniEndpoints.UdelAsync`. Stav: **zapsáno**.*

```
POST /sprava/serie/2026-nanecisto/opravneni jako jana (pořadatelka Izolepy)
  {email: petr@…, role: Organizator, zavod: izolepa}
  → 403 „Na tohle nemáš v ročníku roli."
```

Udělovat smí jen rozhodčí (pořadatele a editora na zastávku) a správce.
Obsazení 2, 3 a 4 přitom všechna začínají tím, že pořadatel přijde
s pomocníky — a ty do aplikace musí pustit někdo jiný. Ráno u vody to
znamená telefonát rozhodčímu.

*Návrh k rozhodnutí:* pustit pořadatele regaty, aby na **svou** regatu
přiřadil dalšího pořadatele nebo editora. Rozsah si tím nerozšíří — zůstává
na jedné regatě — a je to tentýž argument, kterým `Udeleni` povoluje
rozhodčímu přiřazovat pořadatele zastávkám.

### O13 — Role pomocníka není: pomocník dostane celého pořadatele

*Obsazení 2, 3, 4. Z `Prava.Pokryva` a `polozkyZastavky`. Stav: **zapsáno**.*

Kdo má v cíli jen zapisovat, dostane `Organizator` na tu regatu — a s ním
i vypsání závodu, nahlášení odjeto, přihlášky, vyloučení lodi, směrnice,
stavbu trati a přepínání rozjížďky do poháru. Mezistupeň mezi *editorem*
(jen blog) a *pořadatelem* (celá regata) neexistuje.

Není to nutně vada: u pětičlenného štábu z jednoho klubu je důvěra dána
a role navíc by byla administrativa. Zapisuje se proto jako **vědomá
hrana**, ne jako nález k opravě — a jako věc, na kterou se má zeptat čerstvý
pořadatel, až sezení proběhne.

### O14 — Porovnání dvou zápisů neřekne, čí verze je právě ve výsledcích

*Obsazení 3, 4. Změřeno na obrazovce. Stav: **opraveno zčásti**.*

Dva zapisovatelé v cíli fungují: snímek je jeden na člověka
(`ZapisSprava.SnimekAsync`), konflikt přijde (409), porovnání postaví dva
sloupce vedle sebe a zvýrazní rozdíly. Odjeto `milos` + `jana` na nové
rozjížďce Izolepy.

Chybí jediné, a je to první otázka u vody: **čí čísla v rozjížďce právě
jsou?** Platí poslední uložená verze (věta nad zápisem to říká správně:
*„Ve výsledcích je poslední uložená verze"*), jenže porovnání hlavičky
sloupců časovalo **na minuty** (`timeStyle: "short"`). Dva zapisovatelé
v cíli ukládají pár sekund po sobě, takže oba sloupce měly `26.10.26 23:48`
a pořadí z nich poznat nešlo.

**Opraveno zčásti**: časy jsou teď na sekundy (`23:58:32` vs `23:58:30`),
takže se to z obrazovky odvodit dá. *Zbývá k rozhodnutí:* označit ten
sloupec rovnou — „tahle verze je teď ve výsledcích". Odvozovat pořadí
z časů je práce, kterou by obrazovka mohla udělat za člověka.

### O15 — Nová regata: devět polí a nic se nepřebírá z loňska

*Obsazení 1, 5. Změřeno na obrazovce kalendáře. Stav: **zapsáno**, návrh.*

Formulář *Nová regata* má devět polí: název, datum, datum konce, typ,
vyhodnocení, počet škrtů, koeficient, procesní děj, pořadatel. Předvyplněné
jsou tři rozumné výchozí hodnoty (`PoKategoriich`, 0 škrtů, koeficient 1);
zbytek je prázdný a v nápovědě pole stojí loňské hodnoty jako placeholder
(„Radavská regata", „YC Písek", „okruhový, vytrvalostní, Izolepa").

Ročník má devět zastávek a většina se jmenuje, pořádá a jede stejně jako
loni. Rozhodčí, který zakládá kalendář, tedy přepisuje ručně to, co už
v databázi je o rok dřív.

*Návrh:* u zakládání nabídnout „převzít z loňského ročníku" — buď celý
kalendář, nebo jednu regatu podle názvu. Je to návrh, ne nález: nikdo
u toho neseděl a neměřilo se, jak dlouho to trvá.

### O16 — „K revizi: …" zůstává na obrazovce i po schválení

*Obsazení 1. Změřeno na obrazovce. Stav: **potvrzeno** (pozorování z D3, 8. 10. 2026).*

Po celé řadě `KRevizi → Navrzeno → Overeno → Schvaleno` stojí u rozjížďky
pořád „K revizi: Zkouška obsazení 1." Je to schválně
(`VysledkySprava.PrepniStavAsync` důvod přepíše až při novém vrácení), ale
u obsazení 1 to vychází zvlášť divně: Miloš čte svůj vlastní vzkaz, který
si napsal před třemi minutami a sám vyřídil.

Zapisuje se jako **druhé nezávislé potkání téhož**, tedy podle pravidla
*Kdy je toho dost* už ne jako podnět, ale jako nález k opravě.

### O17 — Trať bez jediného prvku jde nahlásit hotovo a přijmout

*Obsazení 1, 4. Změřeno na mocku, pravidlo v `Trat.ProcNejdeHotovo`. Stav: **zapsáno**.*

```
trať 4 (po přestavbě, prvků nula)
POST …/trat/hotovo?trat=4 → 200, stav Hotovo, smiPrijmout: true
```

`ProcNejdeHotovo` se dívá jen na stav, `ProcNejdeHotovoKvuliZnackam` jen na
prvky stojící na sebrané bóji. **Počet prvků nekontroluje nikdo.** Jediný
člověk, který po přestavbě (O8) dostane prázdnou trať a mechanicky proklepne
*Hlásit hotovo* a *Přijmout trať*, zveřejní trať bez start i cíle.

*Návrh:* nepustit hotovo pod dva prvky — tutéž hranici už jinde drží
výsledková obrazovka („Trať zatím nemá dva prvky, takže se nedá počítat
postup ani kreslit mapa").

### O18 — V obsazení 5 Miloš „jen rozpravu" neudělá

*Obsazení 5. Z `OknaEndpoints.SmiAsync`, `TratEndpoints` a O3. Stav: **zapsáno**.*

Zadání obsazení 5 je, že pořadatelé zapíšou, postaví i odstartují, a Miloš
udělá jen rozpravu. Rozpravu otevřít smí (`OknaEndpoints.SmiAsync`: pořadatel
té regaty **nebo** rozhodčí ročníku) — jenže aplikace mu k ní přidá dvě
věci, které nikdo jiný udělat nesmí:

- **přijmout trať** — `TratEndpoints.PrijmiAsync` má `jenRozhodci: true`,
  takže bez něj trať nebude veřejná a závodníci si ji nestáhnou;
- **ověřit a schválit výsledky** — `Workflow.KdoSmi`.

A i potom nikdo z nich výsledky nepustí ven (O3). Obsazení 5 tedy není
„Miloš skoro nic", ale „Miloš dvakrát, a na konci stejně Filip".

---

## Nálezy v mocku (a co se s nimi udělalo)

Mock není API a tahle session na něm našla **šest** míst, kde se od něj
lišil — a jako loni v obou směrech. Bez jejich srovnání by audit měřil mock:
dvě z nich (M1, M6) by přímo vyrobily falešné nálezy o rozhodčím. Všechna
jsou **opravená** a měření výš je **po** opravě.

| # | Co mock dělal | Co dělá API | Stav |
|---|---|---|---|
| M1 | rozhodčí si přes `/opravneni` udělil **správce ročníku** (201) a odebral cizí role | `UdelAsync` a `OdeberAsync` pouští rozhodčího jen na *Organizator*/*Editor* **na zastávku** (`Udeleni.RozhodciSmiUdelit`) | opraveno — teď 403 |
| M2 | ročníková a webová oprávnění měla **dvě nezávislé řady čísel**, takže nové ročníkové dostalo `id: 4`, které už měl řádek Dany na webu | jedna tabulka, jedna identita | opraveno — používá se `novy_id()`, přesně na to napsané |
| M3 | rozhodčí **vypsal regatu**, ke které pořadatelem není (200) | `Kalendar.KdoSmi(Vypsany) = Organizator` v rozsahu té zastávky | opraveno — teď 403; `mozneStavy` to přitom počítal správně, takže se rozcházel mock sám se sebou |
| M4 | zveřejnění zastávky pouštěl rozhodčímu a `smiPublikovat` počítal z rozhodčího | `KalendarEndpoints.PublikaceAsync` i `Pohled.Radek` chtějí **správce** | opraveno |
| M5 | `zavodPublikovan` posílal natvrdo `true`, takže věta „Regata sama není zveřejněná" nevyšla nikdy | posílá `z.Publikovano` (`VysledkyEndpoints.cs:195`) | opraveno; nasazený ročník se uvnitř mocku nově tváří jako publikovaný, aby správa netvrdila opak veřejných cest |
| M6 | `smiNaRocnik` natvrdo `true` u oprávnění, takže obrazovka nabízela rozhodčímu role *Rozhodčí* a *Správce*, rozsah „Celý ročník", seznam všech účtů a tlačítka *Odebrat* u cizích řádků | `SmiNaRocnik = spravce`, `Ucty = spravce ? … : null` | opraveno — obrazovka se po opravě chová správně sama od sebe (nabídne jen Editora a Organizátora, vynutí výběr regaty a napíše „Jako rozhodčí přiřazuješ pořadatele a editora jednotlivým regatám") |

**M6 stojí za zapamatování:** obrazovka oprávnění byla celou dobu napsaná
správně a reagovala na `smiNaRocnik`. Chyba byla jen v mocku — a kdyby se
neověřila proti API, zapsal by se nález o obrazovce, která žádnou vadu nemá.

## NEODJETO (a proč)

| Co | Proč |
|---|---|
| totéž proti skutečnému API | na tomhle stroji není Docker ani Postgres (`docs/PLAN.md`, *Kde se pokračuje*) |
| trvanlivost čehokoliv | mock drží stav v paměti procesu a nic nezapisuje na disk |
| `smiNaRocnik` u **článků** (`/sprava/serie/{s}/clanky`) | mock ho má taky natvrdo `true` s poznámkou „falešné API nerozlišuje rozsahy". Neověřeno proti `ClankySpravaEndpoints` — mimo rozsah tohohle auditu, ale je to sedmé místo téhož druhu |
| obsazení 3 a 4 s telefony u vody | dva zapisovatelé se odjeli HTTP požadavky a na jedné obrazovce; tempo, jedna ruka a slunce měří C5 a C7 v `SCENARE-OVLADANI.md` |
| jak dlouho co komu trvá, kolik udělá odboček | k tomu je potřeba člověk, ne agent — viz *Mez poctivosti* |

## Co z toho vzít do sezení s pořadatelem

Až sezení bude, tyhle tři otázky se agentem změřit nedaly a stojí za
položení:

1. **Pozná člověk, že má dvě role?** Rozcestník mu je vypíše jako dva štítky
   („rozhodčí ročníku", „pořadatel — Izolepa"). Dojde mu z toho, že *Ověřit*
   po vlastním zápisu je jeho další krok, ne cizí?
2. **Co udělá v kalendáři s regatou, kterou právě založil?** Tlačítko
   *Vypsat* tam není a nic neříká proč (O2).
3. ~~**Komu zavolá, když má výsledky schválené a nejsou venku?**~~
   Zavřeno rozhodnutím z 27. 10. — místo toho: **napadne ho po schválení
   čísla taky pustit ven?** Jsou to dvě klepnutí na dvou místech a nic ho
   ke druhému nenutí (viz D2 v `docs/SCENARE-OVLADANI.md`).
