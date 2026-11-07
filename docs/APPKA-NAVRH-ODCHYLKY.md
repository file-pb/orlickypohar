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

### 1. Panel startu neříká, kolik lodí vysílá polohu

Návrh to má ve třech artboardech (`Main`, `Minuta`, `Nahoru`) a ve
čtvrtém (`BezSignalu`) i v té verzi, kvůli které to tam je: zelená tečka
a *„12 z 12 lodí vysílá polohu"*, bez signálu *„9 z 12"* s růžovou
tečkou.

V `components/odpocet.tsx` takový řádek není — ověřeno `grep` na
`poloh`, nenašel v souboru nic než komentáře. Rozhodčí tedy u startu
nepozná, že třem lodím vypadlo vysílání, a dozví se to až z prázdné
stopy po závodě.

Posádka přitom tutéž informaci o sobě má (*„2 ze 3 vysílají"* na
obrazovce závodníka, z `GET /lod/dnes`). Chybí její součet za celou
rozjížďku.

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

### 5. Karta „Moje loď" na obrazovce posádky

Návrh: jméno lodi, číslo plachty, třída jako štítek a **posádka po
jménech s rolí** (*„Jana Burdová — kormidelník"*). Je to podle komentáře
v artboardu to, co posádka kontroluje na břehu — že telefon visí u správné
lodi.

Appka má jen řádek *„FAR STAR III · CZE 142 · Race"*. Jména posádky jsou
o kus níž, ale v jiném významu: karta *Telefony na lodi* říká, kdo
vysílá, ne kdo na lodi jede.

### 6. Pokyn komise nemá nadpis ani vlajku

Návrh: *POKYN ZÁVODNÍ KOMISE* → tučný nadpis **„Trať zkrácena"** → text →
*„Vyhlášeno 14:21 · vlajka S"*.

Appka: *POKYN ZÁVODNÍ KOMISE* → text → *„Vyhlášeno 18:07"*. Chybí nadpis
a vlajka. U zkrácení trati je vlajka S to, co posádka hledá očima na
startovní lodi.

### 7. Předání velení z appky

Hlavička všech artboardů rozhodčího má pilulku s baterií, která je
**tlačítko**: `aria-label="Velíš ty, baterie 78 procent — předat velení"`.

`HlavickaVelitele` v `index.tsx:676` kreslí baterii a hodiny, ale na nic
se neklepe. Předání velení je dodnes jen na webu (`GET/POST /velitel`),
jak zapisuje `docs/STAV-RESENI.md`. Tady je to doloženo podruhé, z druhé
strany: návrh s tím počítá.

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

---

## Co z toho plyne pro příště

Rozdílů je sedm a **žádný z nich není ozdoba** — každý je informace, která
na vodě chybí, nebo slib, který appka nedrží. Vznikly tím, že se obrazovka
stavěla z vlastní úvahy a návrh se otevřel až potom.

Pořadí podle toho, co stojí nejmíň a dá nejvíc:

1. **Poslední znamení posádce** (č. 4) — počítá se z času startu,
   partitura v appce je, žádný nový dotaz.
2. **Dlaždice odkladu přestane lhát** (č. 2, první polovina) — buď
   plachta s časem, nebo jiný podtitul; lhát nesmí ani den.
3. **Kolik lodí vysílá** (č. 1) — potřebuje součet za rozjížďku, tedy
   nejdřív dotaz, co k tomu API umí.
4. **Konec rozjížďky a konec dne** (č. 3) — samostatná obrazovka a nový
   úkon; největší kus.
5. Zbytek (č. 5, 6, 7) jsou karty a pole, kde rozhoduje, jestli data
   v API jsou.
