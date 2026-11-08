# Co návrh kreslí a appka nedělá

Soupis vznikl 7. 11. 2026 po Filipově větě *„to už je opakovaně, co jsme
našli, že nejsou implementovány. Investovali jsme hodně do pravidel modelu
a návrhu, tak ty věci prověř a dodržuj."* Do té doby se rozdíly nacházely
po jednom, pokaždé když se na obrazovku někdo podíval — a pokaždé jako
překvapení.

**Co se porovnávalo.** Plátno *„Appka u startu a závodníka — návrh"*
(claude.ai/artifact/F3bpQH1cX6VSjAGTuFc9bC), všech 21 artboardů, proti
`app/src`. Přečteny byly všechny kromě dvou barevných variant
(`Tma.dc.html`, `Zavodnik-tmavy.dc.html`) — tmavý režim hlídá
`tools/kontrola-tokenu.py`, která v CI porovnává barvy webu a appky
a počítá kontrast; 7. 11. 2026 prošla.

**Jak to číst.** Tři stavy: **stojí** (návrh a kód se shodují),
**rozchází se vědomě** (kód dělá něco jiného a je u toho zapsáno proč —
tohle nejsou dluhy), **chybí** (návrh to kreslí, kód to nemá, a nikde
nestojí, že se to nestaví).

---

## Chybí

### 1. Panel startu neříká, kolik lodí vysílá polohu — *postaveno 7. 11. 2026*

Návrh to má ve třech artboardech (`Main`, `Minuta`, `Nahoru`) a ve
čtvrtém (`BezSignalu`) i v té verzi, kvůli které to tam je: zelená tečka
a *„12 z 12 lodí vysílá polohu"*, bez signálu *„9 z 12"* s růžovou
tečkou.

V `components/odpocet.tsx` takový řádek není — ověřeno `grep` na
`poloh`, nenašel v souboru nic než komentáře. Rozhodčí tedy u startu
nepozná, že třem lodím vypadlo vysílání, a dozví se to až z prázdné
stopy po závodě.

Posádka přitom tutéž informaci o sobě má (*„2 ze 3 vysílají"* na
obrazovce závodníka, z `GET /lod/dnes`). Chyběl její součet za celou
rozjížďku.

**Doplněno** ze snímku poloh (`GET /sprava/serie/{serie}/zastavky/{zavod}/polohy`),
který je přesně na tuhle otázku — jeho vlastní popis říká *„vrací celé
pole … protože otázka zní »trackuje nám celé pole?«"*. Za vysílající se
počítá jen loď se stavem `Cerstva`, tedy s polohou do minuty: ta, co se
ozvala naposledy před deseti minutami, nevysílá. Ptá se jen velitel a jen
když panel něco drží, po patnácti vteřinách — server si snímek drží pět
v cache.

### 2. Odklad startu se neptá na nový čas

Dlaždice *Odklad startu* nese podtitul **„vlajka AP · zeptá se na nový
čas"** (`lib/start.ts:486`, `popisUkonu`). Nezeptá se. Klepnutí otevře
potvrzení, jehož vlastní text říká opak: *„Odpočet se zruší a rozjížďka
zůstane bez času startu. Nový čas nastavíš sám, až bude jasno (ZPJ
27.3)."* (`lib/start.ts:492`).

Návrh (`Odklad.dc.html`) má místo toho plachtu, která se ptá hned:
pole s časem, tři zkratky **+15 min / +30 min / +1 hod**, věta *„Necháš-li
čas prázdný, odklad platí a čas doplníš později"* a tlačítko *Odložit na
14:30*.

Dvě věci k opravě, ne jedna: chybí ta plachta, a do té doby **dlaždice
slibuje něco, co se nestane**.

### 3. Konec rozjížďky nemá svou obrazovku

`Konec.dc.html` kreslí, co se stane, až má dojezd poslední loď: karta
*„Rozjížďka 2 je kompletní · Všech 12 lodí má zapsaný dojezd · jelo se
28:51"*, pod ní **Ohlásit rozjížďku 3** a **Jedeme do přístavu**,
vysvětlení obou a výpis pořadí včetně DNF.

Appka má z toho jen ohlášení další rozjížďky, a to v jiné situaci: panel
nabídne *„Pojede se další?"*, až žádná rozjížďka nečeká. Souhrn
*„kompletní"* není, pořadí po rozjížďce na obrazovce velitele není
(a od 7. 11. 2026 tam schválně není nic — viz „Rozchází se vědomě").

**Jedeme do přístavu neexistuje vůbec** — `grep -i přístav` nad `app/src`
nevrací nic. Závodní den se tedy v appce nedá ukončit.

### 4. Posádka nevidí, které znamení padlo naposledy

`Zavodnik-svetly.dc.html` má v barevném pruhu pod nadpisem *Startuje se*
řádek **„Poslední znamení · Příprava · 14:33"** a pod ním větu *„Řiď se
znameními závodní komise, ne telefonem. Odpočet tu schválně není."*

Appka ukazuje místo toho *„Start v 18:21"* a hodiny. To je čas, který
teprve přijde; návrh ukazuje znamení, které už bylo slyšet — a to je ta
informace, podle které se posádka na vodě orientuje, když neslyšela
houkačku.

Partitura k tomu v appce je (`lib/hlaseni.ts`, `dalsiTroubeni`), takže se
to počítá z času startu bez jediného dotazu na server.

### 5. Role posádky v kartě „Moje loď"

**Opraveno 7. 11. 2026, původní znění bylo širší, než je pravda.** Tenhle
soupis nejdřív tvrdil, že karta *Moje loď* chybí celá. Nechybí: na
obrazovce posádky stojí jméno lodi, číslo plachty i třída, přesně jak
je kreslí návrh. Ověřeno čtením `app/src/app/zavodnik.tsx`, ne
obrázkem — původní tvrzení vzniklo z pohledu na snímek obrazovky.

Chybí z ní jediná věc, a ta je blokovaná daty: **role u jmen**
(*„Jana Burdová — kormidelník"*). `ClenPosadkyDto` nese jméno, baterii,
kdy se telefon ozval a jestli vysílá — roli ne.

Samotný seznam jmen navíc appka vědomě nezdvojuje: stojí v kartě
*Telefony na lodi*, kde je u každého i to, jestli vysílá, a kód u toho
má napsáno proč — *„dva seznamy téhož by se lišily jen tím, co
zamlčí"*. Dokud role v API nejsou, není co přidat.

### 6. Vlajka u pokynu komise

**Opraveno 7. 11. 2026 tamtéž.** Soupis tvrdil, že pokynu chybí nadpis
i vlajka. Nadpis nechybí — `p.veta` se kreslí jako tučný osmnáctibodový
nadpis a POKYN ZÁVODNÍ KOMISE je nad ním. Vypadalo to jinak proto, že
věta z ukázky je dlouhá a láme se do tří řádek.

Chyběla **vlajka**, a ta se 7. 11. 2026 doplnila: `PokynDto` ji nenese,
ale dvojice druh → písmeno je táž, jakou má obrazovka trati rozhodčího
(vlajka C u změny úseku, ZPJ 33; vlajka M u chybějící značky, ZPJ 34),
takže se dopočítá a nemůže se s rozhodčím rozejít.

Co návrh kreslí nad rámec dat: **nadpis zvlášť od textu** (*„Trať
zkrácena"* a pod tím věta). `PokynDto` má jedinou větu, a zkrácení trati
(ZPJ 32) mezi jeho dvěma druhy vůbec není.

### 7. Předání velení z appky — *postaveno 7. 11. 2026*

Hlavička všech artboardů rozhodčího má pilulku s baterií, která je
**tlačítko**: `aria-label="Velíš ty, baterie 78 procent — předat velení"`.

`HlavickaVelitele` v `index.tsx` kreslí baterii a hodiny, ale na nic se
neklepe. Předání velení je dodnes jen na webu, jak zapisuje
`docs/STAV-RESENI.md`. Tady je to doloženo podruhé, z druhé strany:
návrh s tím počítá.

**Postavit to jde, a tady je co k tomu platí.** Endpointy existují
(`GET` i `POST /sprava/serie/{serie}/vysledky/{zavod}/velitel`,
`VysledkyEndpoints.cs`) a vrací, kdo velí, jestli jsem to já a jak se
velení předávalo. Dvě věci k rozhodnutí předem:

- **Vygenerovaný kontrakt odpověď nezná.** `schema.d.ts` cestu má, ale
  `VeleniDto` v něm není — tvar by se musel buď napsat ručně, nebo
  vygenerovat znovu.
- **Návrh mluví o „předat velení", server umí opak.** Podle nálezu R19
  si velení <b>vyžádá ten, kdo ho chce</b>, a server ho udělí; dát ho
  někomu jinam nejde.

**Jak se to vyřešilo.** Pilulka v hlavičce je nově tlačítko a říká, co
se doopravdy stane: kdo velí, čte *„velíš ty"*; kdo nevelí, čte *„velí
Miloš"* jantarově a klepnutím si velení vezme. Tvar odpovědi je v
`api.ts` napsaný ručně, protože `VeleniDto` v kontraktu není — s
poznámkou, že má zmizet, až se kontrakt vygeneruje znovu.

---

## Rozchází se vědomě

Tyhle rozdíly jsou rozhodnutí, ne dluhy. Jsou tu proto, aby je příště
nikdo nehlásil jako chybu.

| Návrh | Appka | Proč |
| --- | --- | --- |
| Úkony, které v dané fázi nejdou, se nekreslí (`Jede.dc.html` má jen OCS a Zrušit) | kreslí se všechny čtyři, nepoužitelné ztlumené | *„rozhodčí vidí, co vůbec existuje"* (`odpocet.tsx`, `UkonyNaStartu`) |
| Shodu v cíli spojí **přetažení** lodi na loď (`Tazeni.dc.html`) | spojí volba v dialogu | přetažení je na houpající se lodi nejistý terč; `Tazeni` je v návrhu sám označen jako varianta |
| Šipky nad sebou, 34×22 pt | vedle sebe, 44×44 | mez terče je 44 pt (`tools/kontrola-dotyku.py`); dvě tlačítka ve sloupci by každé řádce daly 88 |
| Pruh stavu u zrušené rozjížďky říká *Odvoláno* | říká *Zrušeno* | odvolání startu (ZPJ 29.2) a zrušení rozjížďky (ZPJ 32.1) jsou dvě různé věci; kód je přesnější |
| Systémový proužek má tři stavy, prostřední *NENAHRÁVÁ SE* | sedm stavů, ten říká *NEZAPISUJE SE* | přibyly ukázka, bez spojení, pozastaveno a bez klíče — stavy, které návrh nekreslí, protože vznikly později |
| Pod panelem velitele pokračuje obrazovka pořadím a listinou | pod pruhem trestů končí | Filip, 7. 11. 2026: *„ten seznam je tam zbytečný, stačí, aby okno končilo tím, tresty na trati"* |
| Landing nese karty *Velíš* a *Sledování* | jen logo přes celou obrazovku | Filip, 7. 11. 2026 — a sám návrh to u sebe zapisuje jako **dočasný** stav |
| Kebab má sedm položek | má deset (navíc *Domů*, *Moje regata*, *Ukázka pro závodníka*) | *„odevšad se musím umět vrátit na landing"* |

---

## Stojí

Ověřeno čtením kódu, u označených i na simulátoru 7. 11. 2026.

- **Landing**: logo 44 pt, jméno, podtitul a kebab na jednom řádku, pod
  tím velké logo. *(simulátor)*
- **Panel startu** ve všech čtyřech fázích: čeká se, procedura, poslední
  minuta, jede se — včetně barev a pruhů výzva / příprava / minuta.
  *(simulátor)*
- **Nerušit**: věta pod tlačítkem procedury. *(simulátor)*
- **Úkony na startu** i **za jízdy** jako dlaždice 2 × 2 s podtitulem
  a odkazem na pravidlo.
- **Tresty na trati**: tmavý pruh na dně panelu, čipy po lodích, čas od
  uložení, klepnutím odčiněno. *(simulátor)*
- **Výběr lodi druhým krokem** po OCS i po trestu.
- **Cíl**: dlaždice na klepání, pořadí, shoda jednou řádkou s *rozdělit*,
  šipky na řádce, hodina průjezdu, návrh od trasování v pořadí
  s *Beru* / *Ne*, ukončení s DNF. *(simulátor; návrh od trasování ne —
  ukázka data trasování nemá)*
- **Tři velikosti terče** (56 / 48 / 44) a kontrola v CI — `Terce.dc.html`
  je sám označený jako POSTAVENO a 7. 11. 2026 hlásí 46 z 46 nad mezí.
- **Obrazovka posádky**: barevný pruh stavu, pokyn komise, *Komise tě
  vidí*, *Telefony na lodi* s bateriemi, pozastavení vysílání, plovoucí
  patička s trestem. *(simulátor)*
- **Systémový proužek** nad vším, na každé obrazovce, s počtem čekajících
  bodů.
- **Hlavička velitele jako v návrhu**: jedna úzká řádka se jménem regaty,
  odznakem stavu, velením a hodinami — velký nadpis ani datum tam od
  8. 11. 2026 nejsou, stejně jako v žádném artboardu rozhodčího. Pro
  čtenáře regaty nadpis zůstává. *(simulátor)*
- **Výběr lodi** po OCS i po trestu: tři sloupce dlaždic, na každé jen
  jméno lodi, jak to kreslí `VyberLodi.dc.html`. Kategorie u jmen byla
  do 8. 11. 2026 navíc — na otázku *„kterou loď jsi viděl"* neodpovídá.
  *(simulátor)*
- **Hlavička cíle** jednou řádkou a dlaždice lodí ve třech sloupcích,
  jak kreslí `Cil.dc.html`. Kategorie se místo řádky textu značí
  **barevným okrajem** v barvě třídy (Filip, 8. 11. 2026) — ty barvy
  dosud žily jen ve znacích tříd na webu a od téhož dne jsou tokeny
  (`--trida-race` a spol.), takže je appka i web berou z jednoho místa.
  *(simulátor)*

---

### 8. Odklad a odvolání se neozvou

Zrušení rozjížďky appka od 8. 11. 2026 ohlásí dvěma dlouhými zvuky,
jak to žádají plachetní směrnice poháru. **Odklad startu a všeobecné
odvolání neohlásí nic** — ani zvuk, ani větu —, přestože obojí má
podle ZPJ 27.3 a 29.2 svá zvuková znamení (AP dvě, první opakovač
dvě). Partitura (`lib/hlaseni.ts`) zná jen znamení procedury; úkony,
které proceduru přeruší, v ní nejsou.

Na obrazovce se po odkladu změní jen čas v panelu, takže rozhodčí
nepozná, jestli se úkon povedl (Filip, 8. 11. 2026: *„odložení startu
taky nic neudělá a aplikace ani nic neřekne"*). Ověřeno na simulátoru:
odklad s časem i bez času zapíše správně, jen o sobě mlčí.

**Rozhodnuto 8. 11. 2026** (Filip: *„jestli ne, tak nějaký ping drobný
a slovně oznámit hlasem. Jinak by se to pletlo s oficiálním
signálem"*): **ping a věta, klakson ne.**

Důvod stojí v nálezu R23. Zvuková znamení u startu jsou **vyhlášená**
a plachetní směrnice poháru vypisuje jediné — *„Zrušení rozjížďky: dva
dlouhé zvuky"*. Odklad ani odvolání v ní nejsou, takže klakson by u
nich oznamoval poli znamení, které nikdo nevyhlásil, a na vodě by se
pletl s tím, co platí. Ping žádné znamení není: je to potvrzení
rozhodčímu, že úkon prošel, a věta po něm říká co — *„Start rozjížďky 4
odložen na 15 hodin 6 minut"*, *„Všeobecné odvolání, rozjížďka 4."*

**Odvolání čas neříká** a odklad ho říká slovy (Filip tentýž den:
*„všeobecné odvolání stačí říct a pak je ten čas nesrozumitelně"*).
U odvolání počítá nový čas pravidlo, ne rozhodčí — nic se jím
nerozhoduje. U odkladu je to naopak ta podstatná informace, protože čas
si volí sám; proto se rozepisuje na hodiny a minuty, dvojtečku syntéza
čte pokaždé jinak.

Zvuk vyrábí `app/scripts/ping.py` a je schválně syntetický, ačkoli
klakson stál za oklikou přes nahrávku skutečné houkačky: ping má znít
**jako z telefonu**. Dva čisté tóny (A6 a E7) nad pásmem houkačky,
0,30 s. Že se délkou nepřiblíží klaksonu, hlídá `testy/zvuky.test.ts`.

Hlásí se **přechodem stavu**, ne klepnutím — stejně jako zrušení, takže
to rozhodčí u vody slyší, i když úkon udělal někdo jiný z webu.

## Co z toho plyne pro příště

Rozdílů je sedm a **žádný z nich není ozdoba** — každý je informace, která
na vodě chybí, nebo slib, který appka nedrží. Vznikly tím, že se obrazovka
stavěla z vlastní úvahy a návrh se otevřel až potom.

Pořadí podle toho, co stojí nejmíň a dá nejvíc — a co z toho je
hotové:

1. ~~**Poslední znamení posádce** (č. 4)~~ — **postaveno 7. 11. 2026.**
2. ~~**Odklad se ptá na nový čas** (č. 2)~~ — **postaveno 7. 11. 2026**,
   i se zkratkami +15 / +30 / +1 hod.
3. ~~**Vlajka u pokynu** (č. 6)~~ — **postaveno 7. 11. 2026.**
4. ~~**Kolik lodí vysílá** (č. 1)~~ — **postaveno 7. 11. 2026.**
5. ~~**Předání velení** (č. 7)~~ — **postaveno 7. 11. 2026.**
6. **Konec rozjížďky a konec dne** (č. 3) — zbývá, a je to jediná
   položka, která potřebuje nový endpoint: *Jedeme do přístavu* na
   serveru neexistuje.
7. **Role posádky** (č. 5) — čeká na `ClenPosadkyDto`; v appce není co
   udělat.

**Stav k večeru 7. 11. 2026: z původních sedmi zbývají dvě, a obě
čekají na API, ne na appku.**

**A jedna lekce o tomhle soupisu samotném.** Dvě ze sedmi položek byly
nadsazené: karta *Moje loď* i nadpis pokynu stály v kódu celou dobu
a do soupisu se dostaly z pohledu na snímek obrazovky, ne ze čtení
`zavodnik.tsx`. Snímek ukáže, co je vidět; neukáže, proč to tak vypadá.
Příště nejdřív kód.
