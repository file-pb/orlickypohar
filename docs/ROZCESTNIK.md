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
- **Čtenář nepřihlášený** — jediný vstup (ročníky), ale je tu druhá
  položka *Přihlásit se*, takže rozcestník dává smysl. Rozhodnout.
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

Co je potřeba doladit, až se bude stavět:

1. **Co se stane, když obnova selže** (relace skončila u poskytovatele).
   Dnes se vymažou tokeny; rozcestník se tím pod rukama promění
   z rozhodčího na čtenáře. Má se místo toho ukázat jeden řádek
   *přihlásit znovu* a nabídka nechat, dokud ji člověk nepotvrdí?
2. **Co vidí rozhodčí bez signálu.** `/ja` se nedovolá, role se neznají.
   Poslední známou odpověď cachovat — jinak u vody bez signálu zmizí
   půlka appky zrovna ve chvíli, kdy je potřeba.

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

1. **Rozcestník se čtyřmi dlaždicemi z `role.ts`.** Nic nového
   neotevírá, jen ukazuje, co už appka umí. Dá se vyzkoušet v ukázce.
2. **Pravidlo jediné možnosti** a *Domů* v tečkách.
3. **Čekající udělení** v API + obrazovka *Mám kód* v appce.
4. **Zakládání organizačních účtů na webu** — až po tom, protože bez
   čekajícího udělení nemá kam zapsat.

První dva kroky jsou v appce a nikam nesahají. Třetí mění API i web.

## Co rozhodnutí potřebuje a já ho nemám

- **Vidí nepřihlášený rozcestník, nebo rovnou ročníky?** Jedna dlaždice
  a jedno tlačítko *Přihlásit se* je hubený rozcestník.
- **Co je na dlaždici napsané.** *„Velím regatě"* je role, *„Izolepa,
  dnes"* je kontext. Obojí se nevejde dvakrát.
- **Pořadí dlaždic.** Dnes `postava()` říká, že velení přebíjí loď.
  Platí to i pro organizátora, který přijel závodit?
- **Kdo zakládá organizační účet** — správce celého webu, nebo i
  rozhodčí ročníku?
