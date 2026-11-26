# Rozcestník appky — rozvaha

Zadal Filip 26. 11. 2026. Dnešní úvodní obrazovka je **dočasná**: od
7. 11. je na ní jen logo a jediná cesta kamkoliv vedou tři tečky
(`app/src/app/index.tsx`, komentář to říká rovnou). Tohle je rozvaha nad
tím, co ji nahradí — **ne zadání ke stavbě**. Grafický návrh je vedle
v `docs/navrh/rozcestnik.html`; ergonomie se posuzuje z obrázku, ne
z odstavce.

## Co rozcestník je

**Odpověď na otázku „co teď budeš dělat", ne menu.** Menu vyjmenovává,
co appka umí; rozcestník nabízí to, co tenhle člověk dnes dělat může —
a zbytek neukazuje vůbec. Filip, 29. 10. 2026: *„rozhraní podle toho,
kdo ji zapíná, aby tam nebyl ten současnej pelmel."*

Z toho plyne tvar: **velké dlaždice, ne řádky.** Totéž, co se osvědčilo
na stavbě trati — jedním palcem, v rukavicích, na slunci. Řádkový seznam
je nabídka, dlaždice je rozcestí.

## Odkud se bere nabídka

Nic nového se nevymýšlí; všechno už v odpovědi `/ja` je
(`JaDto`, `IdentitaEndpoints.cs:21`):

| Dlaždice | Podmínka | Vstup |
|---|---|---|
| **Velím regatě** | `veliNekde` — role `Rozhodci` nebo `Organizator` kdekoliv | `kdeVeli` → regata, jinak výběr |
| **Stavím trať** | `smiStavet` na konkrétní zastávce, **včetně pomocníka** | `kdeStavi` |
| **Jedu závod** | má loď, nebo klíč k lodi v telefonu | obrazovka závodníka |
| **Sledování** | vždycky, i nepřihlášený | ročníky a kalendář |
| **Záznam trasy** | má klíč nebo loď | trasa |

**Sledování je podlaha, ne jedna z dlaždic.** Rozhodnuto Filipem 26. 11.
2026: *„sledování na tom rozcestníku je skvělý, protože to vlastně se dá
použít i pro toho, kdo nejede závod a ani nemá žádný login. Takže vždycky
aspoň to sledování zůstane."* Appka tedy **nikdy nekončí u přihlašovací
obrazovky** — i člověk bez účtu má kam jít a co si přečíst. Pro stavbu
z toho plyne, že se rozcestník počítá odspodu: sledování je tam vždycky
a role nad ním jen přidávají. Prázdný rozcestník neexistuje, takže se
nemusí kreslit prázdný stav.

Pravidla jsou **už napsaná a otestovaná** v `app/src/lib/role.ts`
(`veliNekde`, `smiStavet`, `jePouzePomocnik`, `kdeStavi`, `postava`)
a `app/testy/role.test.ts`. Rozcestník je nebude počítat znovu — jen
je použije. Platí dál, že obrazovka smí být **přísnější než server,
nikdy volnější**; rozhoduje server u každé cesty.

**Pomocník není role**, je to příznak na jednu zastávku na jeden den
(`KdePomaha`). Pro rozcestník je to ale plnohodnotný vstup: kdo je dnes
zaškrtnutý jako pomocník, přijel stavět.

## Pravidlo jediné možnosti

Filip: *„v okamžiku, kdy to bude jenom závodník, tak vlastně ani
nepotřebuje zobrazovat ten rozcestník."* Zobecněno, aby z toho šel test:

> **Rozcestník se přeskočí, když má člověk jedinou roli a ta role má
> jediný vstup.** Jinak se ukáže.

- **Závodník** — jediný vstup (moje regata) → appka otevře rovnou jeho
  obrazovku. Rozcestník nikdy neuvidí.
- **Čtenář nepřihlášený** — jediný vstup (sledování) → appka otevře
  rovnou ho. Rozhodnuto Filipem 26. 11. 2026: *„Ano, rovnou."*
  *Přihlásit se* i *Mám kód* zůstávají v tečkách. Kdo si appku stáhl kvůli
  výsledkům, nemá být nejdřív vyzván k přihlášení.
- **Rozhodčí** — jedna role, ale tři vstupy (start, cíl, trať), takže
  rozcestník ano.
- **Organizátor + závodník** — dvě role, rozcestník ano. Tohle je ten
  případ, kvůli kterému celý rozcestník vzniká.

**Co se přeskočí, musí jít vyvolat.** Tři tečky leží nad celým
zásobníkem (`app/src/app/_layout.tsx:68`), takže jsou na každé
obrazovce; položka *Domů* je cesta zpátky na rozcestník. Bez ní by
appka byla past.

## Co zůstane v tečkách

Tři tečky se **mění z navigace na režii**. Co se stěhuje na rozcestník:
*Moje regata*, *Stavba trati*, *Ročníky*, *Záznam trasy*. Co v tečkách
zůstává:

- **Účet a oprávnění** — přihlášení, role, co komu patří.
- **Klíč k lodi** — jednou za sezónu.
- **Ukázkový režim**, **Ukázka pro závodníka**, **Zkouška startu** —
  Filip je tam chce nechat, dokud se bez nich nedá zkoušet.
- **Domů** a odkaz na web.

Až ukázky doslouží, zbude v tečkách účet a nastavení — a to je správná
náplň pro věc, do které se sahá dvakrát za sezónu.

## Přihlášení jednou a dost

Co už hotové **je**: Authorization Code s PKCE, `offline_access`,
obnovovací token v SecureStore a tichá obnova před vypršením
(`app/src/lib/identita.ts:124–160`). Příští spuštění tedy přihlášení
nevyžaduje, dokud relace u poskytovatele platí.

Co se spravilo 26. 11. 2026, když to Filip zkusil v terénu:

1. **Přihlášení je vidět.** Jakmile se nepřihlášenému přeskakuje
   rozcestník, zbyla cesta dovnitř jen pod třemi tečkami — a tam ji Filip
   nenašel. Nabídka proto začíná **dlaždicí** *Přihlásit se* (jeho slovy:
   *„to přihlášení chce dlaždici rovnou v menu vedle tří teček"*) a táž
   řádka je i na sledování.
2. **Neúspěch se řekne tam, kde se kleplo.** Na účtu se chyba vypisovala
   obyčejným písmem až pod kartami, takže klepnutí bez signálu vypadalo,
   že se nestalo nic.
3. **Vypršelá relace se jmenuje jinak než nepřihlášení.** `token()` při
   selhání obnovy tiše odhlásí; nově po sobě nechá stopu
   (`relaceVyprsela()`), takže obrazovka řekne *„přihlášení vypršelo"*
   místo aby mlčky ukázala míň.
4. **Rozcestník nepřeskakuje ve sporu.** Token v telefonu je, ale `/ja`
   nic nevrátí — pak o tom člověku nevíme nic a přeskočit znamená poslat
   ho mezi čtenáře bez jediného slova.

Zbývá doladit: **co vidí rozhodčí bez signálu.** `/ja` se nedovolá, role
se neznají, nabídka je kratší a appka to sice napíše, ale poslední známou
odpověď nedrží. U vody bez signálu zmizí půlka appky zrovna ve chvíli,
kdy je potřeba — cachovat ji je levné a nemá to odklad.

## Přihlášení bez cesty na Zitadel

**Zadání, 26. 11. 2026:** *„na zitadel uživatele tahat nechci. Tohle musí
být lepší."* Dnešní přihlášení otevře prohlížeč s přihlašovací stránkou
poskytovatele — pro pořadatele, který appku zapíná dvakrát za sezónu,
je to cizí obrazovka s heslem, které nemá.

**Odpověď už v appce existuje, jen pro lodě.** Klíč k lodi
(`app/src/lib/klic.ts`) je jednorázová pozvánka na 48 h: kapitán vyrobí
kód nebo QR, posádka ho naskenuje a telefon je spárovaný — **bez účtu,
bez hesla, bez poskytovatele**. Přesně to Filip chce i pro role.

**Návrh: týž tvar pro role.**

1. Správce v administraci vyrobí **kód nebo QR pro roli** (rozhodčí
   ročníku, pořadatel zastávky, pomocník na den).
2. Ten člověk ho v appce jednou naskenuje — obrazovka *Mám kód*, jedna
   pro loď, roli i pomocníka.
3. Telefon dostane **klíč vázaný na osobu a rozsah**, ne na účet
   u poskytovatele. Server u každé cesty ověřuje klíč stejně, jako dnes
   ověřuje klíč k lodi.

**Co se tím kupuje:** pořadatel nikdy neuvidí Zitadel, nezakládá heslo
a zvládne to u vody na jedno klepnutí. **Co se tím platí:** kód jde
přeposlat, takže je to slabší doklad než přihlášení. Pro loď jsme to
jako cenu přijali už v říjnu; pro roli je sázka vyšší, protože rozhodčí
zapisuje výsledky.

**Doporučení:** přijmout tutéž cenu, ale ohraničit ji — kód na jedno
použití, krátká platnost, viditelný seznam „komu kód visí a komu dosedl",
a **odebrání jedním klepnutím**. Zitadel zůstane pro web a pro toho, kdo
kódy vydává; na telefon se nedostane nikdo, kdo nechce.

**Neznamená to zahodit OIDC.** Zůstává jako druhá cesta pro ty, kterým
vyhovuje, a jako jediná cesta do administrace na webu.

## Účty a role: kde to dnes drhne

Filip chce, aby účet vznikl **u nás** — při přihlášce lodi na webu nebo
když správce zakládá organizační účet —, a člověk se pak jen jednou
přihlásí nebo naskenuje kód.

**Dnes to tak není, a je to vědomé rozhodnutí**, ne opomenutí.
`Uzivatele.NajdiNeboZalozAsync` (`Poskytovatel.cs:160`) zakládá účet až
při prvním přihlášení a komentář u něj říká proč: *„pozvat člověka
znamená dát mu roli, ne vyrobit mu předem účet, o kterém neví."*
Důsledek je ale ten, na který Filip narazil: `OpravneniSprava.UdelAsync`
hledá účet podle e-mailu a když ho nenajde, vrátí `UcetNeni`
(`OpravneniSprava.cs:199–205`). **Roli tedy nejde udělit člověku, který
se ještě nikdy nepřihlásil.**

Návrh, který splní Filipovo zadání a to rozhodnutí neporuší: **předem
nevzniká účet, předem vzniká pozvánka.**

1. Správce zadá e-mail a roli. Účet existuje → uděleno jako dnes. Účet
   neexistuje → uloží se **čekající udělení** na ten e-mail.
2. Při prvním přihlášení se čekající udělení vyzvedne — toutéž cestou,
   kterou se dnes páruje loď podle e-mailu
   (`Parovani.PodleEmailuAsync`, `Parovani.cs:38`). Člověk neklikne na
   nic navíc.
3. Když e-mail nesedí (klubová adresa, jiný poskytovatel), platí
   **kód nebo QR** — tvar, který už existuje pro klíč k lodi
   (`app/src/lib/klic.ts`, pozvánka na 48 h, jednorázová).

Tím se role udělují **jedním mechanismem pro tři případy**: loď, role,
pomocník na den. Jedna obrazovka v appce — *Mám kód* — a jedno pravidlo:
nejdřív e-mail, protože ten nikoho nestojí práci; kód pro ty, u kterých
e-mail nesedí; nárok tam, kde ani kód není.

**Co to znamená pro web:** přihláška lodi dnes účet nezakládá a podle
tohohle návrhu ani zakládat nemá. Co má přibýt, je **čekající udělení**
a obrazovka, kde správce vidí, komu pozvánka visí a komu už dosedla.

## V jakém pořadí stavět

**Krok 1 je hotový** (26. 11. 2026). Pořadí určil Filip: nejdřív rozcestník,
teprve pak obrazovka sledování.

1. ~~**Rozcestník se čtyřmi dlaždicemi z `role.ts`.**~~ Hotovo:
   `app/src/lib/rozcestnik.ts` (pravidla, 13 testů), `app/src/app/index.tsx`
   (obrazovka), nabídka pod kebabem se o to, co se přestěhovalo, zmenšila.
   **Pravidlo jediné možnosti** je v tom rovnou, i *Domů* v tečkách.
2. ~~**Ročníky přestanou být cesta pro zkoušení.**~~ Hotovo 26. 11.:
   `app/src/lib/sledovani.ts` (který ročník a která regata z něj, 11 testů)
   a přepsaná `app/src/app/rocniky.tsx`. Nahoře stojí dnešní regata, jinak
   nejbližší, jinak poslední odjetá — a vždycky i to, která z těch tří
   možností to je. Pod tím průběžné pořadí, upozornění, kalendář a ostatní
   ročníky. Kalendář je teď jeden kus kódu pro tuhle obrazovku i pro detail
   ročníku (`components/kalendar.tsx`).
3. **Stav na dlaždicích místo popisů.** Dnes tam stojí, co se za tou
   dlaždicí dělá („pípni značky z lodi"); má tam stát, jestli tam vůbec
   musím jít („5 prvků stojí, dvěma chybí fotka"). Chce to kalendář a stav
   stavby, tedy dotaz navíc na první obrazovce — proto ne hned.
4. **Čekající udělení** v API + obrazovka *Mám kód* v appce.
5. **Zakládání organizačních účtů na webu** — až po tom, protože bez
   čekajícího udělení nemá kam zapsat.

Kroky 1–3 jsou v appce a nikam nesahají. Čtvrtý mění API i web.

## Co z prvního kroku zbylo nedořešené

- **Zvýrazněná dlaždice je ta první, ne ta dnešní.** „Když se dnes nic
  nejede, není zvýrazněná žádná" je v návrhu, ale rozcestník neví, co se
  dnes jede — kromě vlastní lodi. Spraví to krok 3.
- **Jména regat chybí.** Dlaždice *Velím regatě* nemá jak zjistit, že ta
  regata je Izolepa; ze slugu se jméno dělat nedá. Taky krok 3.
- **Záznam trasy zůstal v tečkách**, ačkoliv návrh v popisku slibuje, že se
  přestěhuje. V nakreslených telefonech dlaždici nemá ani jeden a pátá
  dlaždice by mřížku rozbila — spustí se stejně jen na vodě a z *Moje
  regata*. Rozhodnout, až bude příležitost to vidět vedle sebe.

## Co rozhodnutí potřebuje a já ho nemám

- **Co je na dlaždici napsané.** *„Velím regatě"* je role, *„Izolepa,
  dnes"* je kontext. Obojí se nevejde dvakrát.
- **Pořadí dlaždic.** Dnes `postava()` říká, že velení přebíjí loď.
  Platí to i pro organizátora, který přijel závodit?
- **Kdo zakládá organizační účet** — správce celého webu, nebo i
  rozhodčí ročníku?
