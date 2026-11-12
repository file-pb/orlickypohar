# Ergonomie ovládání — kolo 1

Měřeno na ceně ovládání: klepnutí, hledání, návraty, a co z toho jde jednou
rukou na motoráku. Čísla níž jsou spočítaná ze zdrojáku a z maket, ne z dojmu.

## Co je dobře

1. **Co teď zůstává a je to první tab.** Rozhodčí ročníku má osm regat
   (`SCENARE-OVLADANI.md`, *Návrh zrušit rozcestník*) a tohle je jediné místo,
   které mu řekne, u které z nich něco visí — bez něj osm stránek. Návrh ho
   nejen nechává, ale dává mu nejlepší pozici v pruhu.
2. **Co teď a Regaty jsou dva taby.** Dnešní rozcestník staví úkoly a seznam
   regat pod sebe na jednu stránku a člověk musí poznat, která část odpovídá na
   kterou otázku. Rozdělením se obě otázky zkrátí na jedno klepnutí — *„kde mě
   něco čeká"* a *„jak jsou na tom regaty"*.
3. **Řádek regaty v tabu Regaty odpovídá, aniž by se otevíral.** Den, pořadatel,
   `2 ze 4 rozjížděk venku`, `1× k revizi`, stav (`Regaty.dc.html:85–121`). To
   je přesně ta informace, pro kterou se dnes chodí dovnitř.
4. **Dlaždice podle práv z téhož zdroje.** `polozkyRocniku` i `polozkyWebu`
   existují (`web/lib/co-smim.ts:181`, `:455`) a jsou odvozené z týchž práv jako
   dnešní rozcestník. Čtvrtý ruční opis seznamu úkonů tím nevznikne — a tři
   opisy `polozkyZastavky` už jednou stály nález (bóje chyběly v kalendáři).
5. **Žádná adresa se nemění.** Ergonomicky to je nejlevnější druh přestavby:
   odkazy v `NAVOD-ROZHODCI.pdf`, záložky v telefonu i tlačítko Zpět platí dál.

## Co je špatně

### 1. Pevné přistání na Co teď znamená prázdnou obrazovku většinu roku

- **Nález** — `Main.dc.html:59` dává Co teď jako první a jediný výchozí tab
  ročníku. `coTeď` (`web/app/sprava/[serie]/page.tsx:225`) přitom počítá **tři**
  věci: vrácenou revizi, „jede se" a „hotové není ven". Mimo závodní den
  a mimo revizi vrací prázdno — doloženo i jinak: *„Co teď o kapitánství neví…
  s LUNOU ke kontrole hlásí Nic nečeká"* (`SCENARE-OVLADANI.md`, skupina E).
- **Proč to vadí** — pořadatel, který jde připravit přihlášky nebo směrnici na
  plánovanou regatu (scénáře C), dnes dostane na jedné obrazovce prázdné Co teď
  **i** seznam svých regat a klepne jednou. V návrhu přistane na větě „Nic
  nečeká" a ke své práci potřebuje klepnutí navíc. Přesně ten krok, který měl
  návrh ušetřit (postřeh 3: *„ušetřili bychom jeden krok"*), se na nejčastější
  cestě roku přidá.
- **Návrh** — výchozí tab vybrat podle obsahu, ne pevně: je-li `coTeď` prázdné,
  otevřít **Regaty**. Vzorec na to projekt má a je od Filipa:
  `kamNaRegate` (`web/lib/co-smim.ts:311`) rozhoduje úplně stejně — *„dokud se
  nejelo, jsou to přihlášky; jakmile vyjela první rozjížďka, výsledky"* — a ptá
  se líně, aby to nic nestálo.

### 2. Přeskok mezi dvěma regatami stojí o klepnutí víc než dnes

- **Nález** — pravidlo „jeden pruh naráz" znamená, že v okně regaty není seznam
  ostatních regat. Cesta *Jarní vítr → Výsledky* ⇒ *Radavská → Výsledky*:
  drobeček na ročník → tab Regaty → řádek = **3 klepnutí**. Dnes: drobeček na
  rozcestník → řádek regaty (a `kamNaRegate` dojde na výsledky samo) = **2**.
- **Proč to vadí** — tohle je hlavní práce rozhodčího ročníku: osm regat,
  u každé ověřit a pustit ven. Není to jedno klepnutí, je to jedno klepnutí
  **krát počet regat** a každé je serverové načtení stránky.
- **Návrh** — drobeček „Orlický pohár 2027" **v okně regaty** míří na tab
  Regaty, ne na Co teď. Jedna adresa v `drobeckySpravy` (`web/app/drobecky.tsx`),
  pravidlo „jeden pruh naráz" zůstává nedotčené.

### 3. Dlaždice má na telefonu 32 px, doporučená mez je 44

- **Nález** — změřeno ze stávajícího kódu, kterým se návrh vykreslí:
  `.dlazdice-sekci .karta` má `padding: 0.3rem` (`web/app/globals.css:1998`)
  a jméno `font-size: 0.95rem; line-height: 1.35` (`:2024`) → 9,6 + 20,5 + 2 px
  rámečku = **32 px**. Žádný dotaz na šířku to na telefonu nezvětšuje
  (v úseku 1980–2130 jsou jen `hover: none` a `@container 10.75rem`). Maketa
  telefonu je na tom stejně (`Telefon.dc.html`: `0.4rem` / `0.85rem`).
  Doporučení je 44 px (iOS) / 48 dp (Android).
- **Proč to vadí** — osm cílů 32 px vysokých s mezerou 6,4 px, u **horní** hrany
  displeje, tedy nejdál od palce. Zadání od startéra je přitom *„jedna ruka,
  a ta druhá drží něco jiného"* (`SCENARE-OVLADANI.md`). Vedlejší klepnutí
  nestojí jen opravu: je to serverové načtení stránky, a u vody se podle
  `DEN-ZAVODU.md` nemá načítat nic, co není nutné.
- **Návrh** — pod `@media (pointer: coarse)` zvednout vnitřní odsazení dlaždice
  na `0.65rem`, tedy 44 px. Nic jiného se neměnit nemusí; mřížka se zalomí sama.

### 4. Osm dlaždic na telefonu jsou tři řádky navigace, a dvě z nich tam nepatří

- **Nález** — `--min-dlazdice: 7.25rem` ve správě (`globals.css:1995`) dává na
  390 px tři sloupce, takže osm dlaždic = **tři řádky**: dnes 109 px, po opravě
  nálezu 3 asi **145 px** nad obsahem. Dvě z těch osmi jsou přitom práce od
  stolu: *Oprávnění* — komentář u `polozkyRocniku` sám říká *„oprávnění se
  nastaví raz za rok"* (`co-smim.ts:179`) — a *Otázky k aplikaci*, což není
  agenda ročníku, ale oponentura projektu.
- **Proč to vadí** — pruh je podle pravidla 2 odpověď na *„co můžu spravovat"*.
  Když v něm stejnou vahou stojí věc na každý den a věc na rok, platí se čtením
  pruhu při každém příchodu. Na telefonu k tomu přibývá třetina obrazovky.
- **Návrh** — *Otázky k aplikaci* z pruhu ročníku vyndat do nabídky pod účtem
  (tím je zodpovězená otevřená otázka z `PLAN.md`: ano, schovat jinam). Na
  `pointer: coarse` nechat v pruhu čtyři denní dlaždice (Co teď, Regaty,
  Kalendář, Výsledky) a zbytek za jednou dlaždicí **Víc**.
  *Vím, že si to zčásti zadírá s rozhodnutím z 29. 10. 2026, kterým akordeon
  pod 40 rem skončil* (`prepinac-sekci.tsx:11`). Rozdíl je v počtu: tam šlo
  o pět krátkých veřejných sekcí v jednom řádku, tady o osm, z nichž dvě se
  otevřou raz za sezónu.

### 5. „Mimo ročník" se z odkazů stala věta

- **Nález** — `Main.dc.html:108` nahrazuje dnešní karty z `polozkyWebu`
  (`web/app/sprava/[serie]/page.tsx:201`) odstavcem, který je **jmenuje, ale
  neodkazuje**; živý je jen odkaz na Správu.
- **Proč to vadí** — kdo má roli na web i v ročníku (Filip, Miloš podle
  `OpravneniWebu.dc.html`), platí na cestě k obecným článkům dvě klepnutí místo
  jednoho. Věta navíc nese informaci, kterou by pruh o patro výš řekl sám.
- **Návrh** — tři jména v té větě udělat odkazy rovnou na jejich taby ve Správě.
  Rozvržení se nemění, klepnutí se vrátí.

### 6. Dvě obrazovky „založit + seznam" mají dva různé tvary

- **Nález** — `Kalendar.dc.html` drží formulář *Nová regata* trvale rozbalený
  v levém sloupci; `Clanky.dc.html` má *Nový článek* schovaný pod `<details>`.
- **Proč to vadí** — scénář E5 je *„přesuň termín budoucí regaty"*, tedy práce
  v pravé tabulce; formulář na zakládání zabírá při ní polovinu šířky natrvalo.
  A člověk, který obě obrazovky používá, se učí dvě rozvržení téhož vzorce.
- **Návrh** — kalendář srovnat podle článků: zakládání pod `<details>`,
  rozbalené jen tehdy, když v ročníku ještě žádná regata není.

### 7. Dvě role, jedno tlačítko *Odebrat*

- **Nález** — `OpravneniWebu.dc.html`: Miloš má na jednom řádku *správce webu*
  i *editor webu*, v řádku je jedno tlačítko *Odebrat* a pod tabulkou věta
  *„odebírá se ta, na kterou klepneš"*.
- **Proč to vadí** — dvě protichůdné nabídky nad **nevratným** úkonem. Odebrání
  správce webu je mimochodem úkon, kterým si člověk může zavřít dveře.
- **Návrh** — ovládacím prvkem je štítek role (každý s vlastním ×) a tlačítko
  v řádku zmizí. Věta pod tabulkou pak nevysvětluje rozpor, ale co je vidět.

## Co bych potřeboval vědět

- **Filip:** otevírá pořadatel jediné regaty okno ročníku vůbec, nebo chodí
  rovnou z kalendáře a z lišty na veřejné stránce? Na tom stojí, jak moc bolí
  nález 1.
- **Filip / 5-jachting:** pracuje Miloš u vody v okně ročníku, nebo jen v okně
  regaty a na cílovce? Nálezy 3 a 4 platí jen pro to první.
- **3-ux:** co ukáže tab *Regaty* pořadateli jedné regaty — seznam o jednom
  řádku? Dnešní rozcestník pro ten případ mění nadpis na *Moje regaty*.
- **2-design:** snese pruh 145 px na telefonu (nález 3), nebo je přijatelnější
  moje zkrácení na čtyři dlaždice plus *Víc* (nález 4)?

## Čeho se nedotýkám

- Barvy, sytost tokenů, typografie a rytmus — **2-design**. Včetně toho, jestli
  teplá cihlová u *Co teď* funguje jako upomínka.
- Texty prázdných stavů, hlášky při chybě a chování po cizí změně — **3-ux**;
  *Čerstvost dat tam, kde se rozhoduje* je jeho pole, ne moje.
- Jména tabů, zkratky („Práva" na telefonu místo „Oprávnění"), skloňování —
  **4-jazyk**.
- Obsah tabu *Výsledky* a master–detail nad rozjížďkami (postřeh 12), startovní
  procedura a odpočet (R30) — jiná fáze a jiný obor.
- ZPJ, pořadí položek u veřejné regaty podle R10/R28 — **5-jachting**.
