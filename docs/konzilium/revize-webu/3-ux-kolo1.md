# UX — kolo 1

Viděl jsem vykreslené stránky jako text (HTML z `localhost:3000`) v rolích bez cookie, `jana`,
`petr`, `milos`, `zdenek`, `filip`, `dana`, zbytek z kódu. **Pixely jsem neměřil** — nálezy jsou
o toku a o tom, co obrazovka říká; platí na 375 px stejně jako na monitoru. Nic jsem neodeslal.

## Co je dobře

1. **Správa rozlišuje, proč tě nepustí.** `Stav` má zvlášť `neprihlasen`, `odmitnut`, `nesmi`,
   `vypadek` (`web/lib/sprava.ts:64`) — „přihlas se", „přihlas se znovu" a „tohle není tvoje" jsou
   tři různé stopy a každá vede jinam.
2. **Rozhraní nabízí jen to, co server pustí.** `mozneStavy`, `smiPublikovat`, `smiUpravit` chodí
   z API; jako `milos` vidím v kalendáři tlačítko jen u Izolepy, cizí regaty jsou holé řádky.
   Obrazovka tím neslibuje úkon, který skončí čtyřistatrojkou.
3. **Výpadek říká, co se nenačetlo, a že stránka existuje** (`web/app/vypadek.tsx`, použitý ve
   41 souborech, vykreslený ze stránky). Úvod při výpadku nezůstane fotkou bez vysvětlení
   (`web/app/page.tsx:189`).
4. **„Co teď" vede úkolem a umí i prázdno s cestou dál** („Teď nic nečeká… najdeš v Regatách");
   předání rozhodčí → pořadatel → rozhodčí má na obou stranách vlastní řádek (scénář D3).
5. **Dva formuláře práci neztrácejí:** zápis rozjížďky vrací čísla po chybě v adrese
   (`…/vysledky/[zavod]/[cislo]/akce.ts:21`) a připojení kódem se po přihlášení vrátí i s kódem
   (`web/app/pripojeni/akce.ts:19`). Je to vzor pro body 1 a 6 níž.

## Co je špatně

**1. Vypršelé sezení vyhodí člověka z práce na úvodní stránku.**
- **Nález** — 35 odkazů `href="/prihlaseni"` bez `kam` (všechny brány správy, Moje lodě, Můj účet)
  a přesměrování bez `kam` v `sprava/[serie]/zavod/[zavod]/page.tsx:42`, `moje-lode/akce.ts`,
  `muj-ucet/akce.ts`. Návrat umí jediné místo (`pripojeni/akce.ts:19`). Sezení žije
  `expires_in − 60 s` bez obnovy (`prihlaseni/zpet/route.ts:72`). Cílová obrazovka při 401 hlásí
  „Přihlášení vypršelo" a zkouší to po 30 s znovu (`cil.tsx:223`), což nepomůže nikdy.
- **Proč to vadí** — scénář C5: pořadatel klepe dojezdy, token doběhne, přihlásí se a stojí na
  úvodu; zpátky do cíle je to Správa → ročník → regata → rozjížďka → cíl. U zápisu z papíru zmizí
  i adresa s `navrh=`, tedy přesně ta čísla, která bod 5 výš zachraňuje.
- **Návrh** — každá brána posílá `kam` = adresa, na které stojí, včetně dotazu; mechanismus
  i ochrana proti cizí adrese jsou hotové (`prihlaseni/route.ts:17`). V cíli při 401 přestat
  opakovat a ukázat odkaz „Přihlásit se znovu" s `kam` na tentýž cíl.

**2. Veřejná přihláška slibuje „pořadatel ji uvidí a ozve se" — a nic mu ji neukáže.**
- **Nález** — věta v `…/prihlaska/page.tsx:77`. „Co teď" zná čtyři druhy úkolů
  (`sprava/[serie]/page.tsx:176–251`), čekající přihláška mezi nimi není; přehled zastávek ji
  nenese (`VysledkySprava.cs:109`) a API neposílá žádnou poštu. Pořadatel ji najde, jen když sám
  otevře Přihlášky té regaty. Žadatel nemá kde zjistit stav; zamítnutí se nedozví nikde.
- **Proč to vadí** — tok končí mezi dvěma lidmi (týž vzorec jako E4). Loď přijede na regatu
  s tím, že je přihlášená, a v listině není.
- **Návrh** — pátý úkol v „Co teď": *Vyřídit přihlášky z webu — {regata}*, „N čeká" (jedno
  aditivní pole v přehledu zastávek). Větu po odeslání přepsat na to, co platí: „Pořadatel ji
  vyřídí nejpozději při registraci na místě. V startovní listině bude, až ji zapíše."

**3. Úvod nezná stav „po sezóně" a první větou tvrdí, že se ještě jede** (otázka 3).
- **Nález** — `web/app/page.tsx:84–93`: `celkem` počítá i zrušenou regatu, takže dojetý ročník
  (7 odjeto, 1 zrušena) hlásí „Odjeto 7 z 8 regat · Vedou SEA MOUSE III, PEZI, LUNA". „Další:"
  stojí ve větě až třetí a po sezóně chybí bez náhrady.
- **Proč to vadí** — cizí člověk přichází s jednou ze dvou otázek: *kdy a kde se jede* (A1), nebo
  *jak to dopadlo* (A7). Věta neodpoví ani na jednu a u druhé mate. Těch 543 px z auditu je
  následek: nejbližší regata není první věc, kterou úvod říká.
- **Návrh** — věta má tři stavy a první odkaz je vždy ta jedna věc: před sezónou „První regata:
  …", v sezóně „Další: … · odjeto N z M" (M bez zrušených), po sezóně „Ročník je dojetý ·
  vyhráli …" s odkazem na konečné pořadí.

**4. Kalendář správy: následek úkonu je vidět jen po najetí myší** (otázka 1).
- **Nález** — „Stáhnout z webu", přechody stavu i „Schovat ročník před veřejností" jsou tlačítka
  na jedno klepnutí (`kalendar/page.tsx:176, 485–519`); co udělají, stojí v `title` (ve správě
  24×), který telefon neukáže. Stažená odjetá regata začne veřejně vracet „Tady nic není" i na
  adrese výsledků. Okno regaty přitom vlastní obsah nemá — je to přesměrování
  (`zavod/[zavod]/page.tsx:60–75`) —, takže termín, stav a publikace žijí jen v kalendáři.
- **Proč to vadí** — nejtěžší úkon obrazovky sedí mezi sedmi odkazy (audit C: 84 cílů) a jeho
  následek se pořadatel dozví od diváků.
- **Návrh** — karta regaty nese název, termín, stav a **jeden** odkaz „Otevřít regatu →" na
  `/sprava/{ročník}/zavod/{regata}`, který pracovní obrazovku vybere sám. Sedm odkazů pryč.
  Stav a zveřejnění pod `details`, u každého tlačítka viditelná věta následku (texty už existují
  v `prechod(na).popis` a v dnešních `title`).

**5. Odmítnutí, „nenalezeno" a chyba mluví každé jinak, a dvakrát nepravdu.**
- **Nález** — vzor existuje: „K přihláškám téhle regaty nemáš přístup. Spravuje je její
  pořadatel. Co smíš ty, ukáže rozcestník." Vedle něj: (a) `nesmi` v okně regaty a u článku končí
  veřejnou 404 (`zavod/[zavod]/page.tsx:49`, `clanky/[clanek]/page.tsx:91`) s větou o výsledcích,
  které uzavírá rozhodčí; (b) 404 radí „seznam ročníků" odkazem na `/`, kde žádný není;
  (c) `web/app/error.tsx` má pro jakoukoliv chybu nadpis „Výsledky se teď nedaří načíst" — proti
  rozhodnutí z 10. 10. (`vypadek.tsx:6–11`); (d) „U téhle regaty nemáš žádný úkon." bez cesty;
  (e) 50 hlášek „API odpovědělo 500." / „API se nedaří zavolat." v 16 souborech.
- **Proč to vadí** — pořadatel s překlepem v adrese čte o nezveřejněných výsledcích; po selhání
  zápisu neví to jediné, co potřebuje: jestli se uložilo.
- **Návrh** — ve správě jedna komponenta odmítnutí (kdo to dělá + odkaz na rozcestník) místo
  `notFound()`; `error.tsx` s nadpisem „Stránka se teď nedaří načíst"; 404 odkazuje na
  `/historie`; hlášky zápisu ve tvaru „Neuložilo se. Zkus to znovu." bez slova API.

**6. Veřejná přihláška po chybě vyprázdní kontakt.**
- **Nález** — `…/prihlaska/akce.ts:42–44`: komentář slibuje návrat „na vyplněný formulář", zpět
  jde jen `lod` a `chyba`. Jméno, e-mail, telefon, číslo ČSJ, posádka a poznámka jsou pryč.
- **Proč to vadí** — A3 na telefonu: jeden překlep a osm polí se píše znovu; komentář sám
  říká, že tohle člověka odradí nejrychleji.
- **Návrh** — rozepsaný formulář do krátké `httpOnly` cookie (10 minut, jako rozdělané
  přihlášení). Do adresy ne, jsou to osobní údaje.

**7. Posádka má v Mých lodích funkci bez vchodu a loď bez kapitána bez vysvětlení.**
- **Nález** — odkaz na detail lodi dostane jen kapitán a majitel (`moje-lode/page.tsx:180`).
  `/moje-lode?lod=2` jako `petr` přitom ukáže „Telefony na palubě — Vystavit pozvánku". Řádek
  „SENDY CZE 204 posádka" neřekne, že loď kapitána nemá, ani za kým jít (B5).
- **Proč to vadí** — funkce, na kterou se dá dostat jen opsáním adresy, pro uživatele není.
- **Návrh** — řádek lodi je odkaz pro každou roli; u lodi bez kapitána věta „Loď nemá kapitána
  — určí ho správce ročníku."

**8. Přihlášky: výstraha, se kterou se z té obrazovky nedá nic dělat** (otázka 2).
- **Nález** — nad tabulkou „Bez souhlasu s pravidly: 16 z 16" a jmenovitě všech šestnáct;
  tentýž text říká, že se souhlas nevynucuje a dává se jinde.
- **Proč to vadí** — výstraha, která svítí vždy, naučí oko ji přeskočit, a hned pod ní stojí to
  jediné, co na pořadatele opravdu čeká: přihlášky z webu.
- **Návrh** — souhlas pryč z hlavičky, zůstane v Podrobnostech lodi. Řádek ukazuje loď, stav
  a jeden krok daný stavem (čeká → Potvrdit, přihlášená → Prezence); kód k připojení, zrušení
  prezence a startovné až po rozbalení.

**9. Tabule se nabízí právě tomu, kdo ji nepřečte** (otázka 5).
- **Nález** — „Sledovat na tabuli →" se objeví jen při běžící rozjížďce (`upozorneni.tsx:120–128`),
  tedy divákovi na břehu s telefonem, a pošle ho na písmo 2,9 px (audit A2).
- **Proč to vadí** — jediný odkaz, který veřejná regata v tu chvíli zvýrazní, vede do slepé ulice.
- **Návrh** — tabule zůstane obrazovkou pro televizi a adresa se nemění; na šířce telefonu vede
  tentýž řádek na Výsledky regaty (dva odkazy, přepíná je CSS podle šířky).

## Co bych potřeboval vědět

- **Moderátor:** zadání uvádí `milos` jako rozhodčího. V mocku je to **pořadatel Izolepy**;
  rozhodčí je `zdenek` (`tools/fake-api.py:558`). Kdo zkoušel rozhodčího jako `milos`, viděl
  pořadatele — audit G tím zůstává otevřený, pokud to ostatní nevědí.
- **9-rizika / Filip:** jak dlouho žije přístupový token na produkci? Kód počítá s 3600 s; hodina
  je uprostřed regaty a z bodu 1 dělá jistotu, ne možnost.
- **5-jachting:** do kdy po regatě má veřejná přihláška smysl? Dnes ji nabízí každá odjetá regata
  bez omezení (`lode/page.tsx:39`) — Radavský pohár z 29. 8. i 27. 11. A co chce divák na břehu
  vidět při běžící rozjížďce: stačí mu výsledky po dojezdu?
- **1-ergonomie:** nabídka vynechává položku stránky, na které stojíš (na `/moje-lode` chybí
  „Moje lodě"), takže se ostatní položky posouvají. Vadí to při hledání?
- **5-jachting / Filip:** smí pořadatel jediné regaty stáhnout z webu odjetou regatu i s výsledky,
  nebo to má po odjetí patřit jen správci?

## Čeho se nedotýkám

- Vzhled, kontrast, velikosti písma a cílů, fotka a značka — `2-design`, `10-grafik`, audit A a B.
- Počty klepnutí a rozmístění na obrazovce, pevné pruhy (otázka 4) — `1-ergonomie`.
- Délka nápovědy a vypsání (otázka 6): z toku jen to, že na kotvy nápovědy vede 34 odkazů
  z ostatních stránek, hlavně z prázdných stavů a odmítnutí — kotvy musí zůstat; jak ji zkrátit,
  nechávám jiným.
- Jména kormidelníků ve veřejném našeptávači přihlášky a nevratnost úkonů — `9-rizika`.
- Jestli pořadí, kódy a stavy sedí na praxi závodu — `5-jachting`.
