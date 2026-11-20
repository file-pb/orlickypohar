# Vizuální design — kolo 1

Měřeno v prohlížeči na všech patnácti maketách (390 × 844), kontrasty
WCAG 2.2 proti oběma sadám `theme.ts`; tmavá je dopočítaná z tokenů.

**Odpověď na Filipovu otázku předem:** je to dnes patnáct odpovědí a dá se
to změřit — tentýž řádek trati má na šesti obrazovkách šest značek vlevo
a pět výšek, jedna modrá plocha nese šest významů. Elegance tu není ozdoba
navíc, je to **ubírání**: jedna řádka, jedna osa, tři váhy, jeden význam
na barvu.

## Co je dobře

1. **Hlavní plocha je největší věc na obrazovce a nese to, co mizí** —
   358 × 86 dp, 26 dp/800, bílá na `voda` 5,67:1 (`Main.dc.html`); osa
   s uzly k tomu ukazuje pořadí bez jediné barvy navíc.
2. **Karta zádrhelu drží závěr prvního běhu** (`Fronta.dc.html`): *Zkusit
   znovu* 326 × 54 obrysové nad *Zahodit prvek 5* jako holý text.
3. **`Znaky.dc.html` je z nové dávky nejlepší věc, kterou můj obor dostal**
   — dělá ze znaku učitelnou věc a má být zdrojem té kresby všude jinde.
4. **Barvy bójí už nejsou půjčené:** `#e8b400`, `#c1121f`, `#1b7f4b`,
   `#1f5fa8`, `#e8740c`, `#f06ba8` sedí na `BARVY` ve
   `web/app/znak-boje.tsx:24–33` — nález 4 mého kola 1 je vyřízený, ale
   jen v pěti souborech z osmi.

## Co je špatně

### 1. Modrá plocha znamená šest věcí, a jedna z nich je její opak

Jediná plná plocha `voda` `#1f6f8b`, měřeno:

| maketa | plocha | písmo | co dělá |
|---|---|---|---|
| Main, Dvoubod, Plan | 358 × 86, r16 | 24–26/800 verzálky | PÍPNI ZNAČKU · PÍPNI PRAVOU · JSEM U NÍ |
| Mapa | 358 × 72, r16 | 22/800 verzálky | POSTAVIT SEM |
| Fotka, Barva | 358 × 60, r12 | 19/700 minuskule | Vyfotit · Hotovo |

**Proč to vadí.** *Postavit sem* je bod odečtený z mapy, tedy podle nálezů
10 a 15 výslovně **ne měření** (`ZdrojPolohy.Mapa`, `Boje.cs:22–32`).
Nosí přitom tutéž barvu na témže místě, jen o 14 dp nižší: jediný tvar,
který měl znamenat „tohle je měření", nese i tu jedinou akci, která jím
není — a v `Barva.dc.html` jím *Hotovo* zavírá výběr barvy.

**Co s tím.** Tři váhy, vyhlášené a pak nelámané. **1 — plná `voda`, 86 dp,
26/800, verzálky: jedině „změř polohu tady a teď".** 2 — obrysové, rám
`text`, 48–54 dp: každá jiná akce, **Postavit sem** včetně. 3 — holý
text: destruktivní a vzácné.

### 2. Tentýž řádek trati má šest značek vlevo a pět výšek

| maketa | značka vlevo | výška / rádius |
|---|---|---|
| Main | 17 dp disk v barvě bóje, lem 1,5 dp | 56 / 12 |
| Plan | týž disk; „z plánu" přerušovaný kroužek `vystraha` | 56 / 12 |
| Poradi | 15 dp šedý kroužek `tlumeny`, bez barvy bóje | 56 / 12 |
| Hotovo, Fronta | žádná — pořadové číslo „1." | 58 a 42 / 10 |
| Zamek | vlaječka 29 × 20 u startu a cíle, jinde číslo | 44–46 / 10 |

*Cíl* je proto třikrát něco jiného: červený disk (Main), špendlík 18 × 22
(Plan, Poradi), vlaječka (Zamek).

**Proč to vadí.** Návrh sám (revize 20. 11.) říká, že Main, Plan, Hotovo
a Poradi jsou **jedna obrazovka** ve stavech a režimu. Značka vlevo na
každé kóduje jinou proměnnou — barvu bóje, změřenost, nic, pořadí, druh
prvku —, takže co se stavitel naučí v jednom stavu, v druhém neplatí; a je
to nejmenší věc na řádku, tedy ta, kterou v pohybu čte nejhůř.

**Co s tím. Jedna řádka:** 56 dp, rádius 12, bílá, značka vlevo **vždycky**
to, jak ta věc vypadá na vodě (kresba ze `znak-boje.tsx`, nález 8), nikdy
stav; ten je slovo vpravo — *změřeno*, *z plánu*, *čeká*, *odesláno*.

**Týž rozpor má proužek polohy**, o kterém rozhodnutí 4 závěru říká, že
nese **trvale** slovo: měřeno je to 358 × 42 bílá + 1 dp `linka` s diskem
20 dp (Main, Dvoubod, Fronta), nebo 358 × 67 bílá + 1 dp `jede` (Popis,
Varianta, Dvoubod), nebo **chybí úplně** — Plan, Hotovo, Poradi, Zamek,
Mapa, Barva, Fotka; na Planu, témž displeji jako Main, ho nahradila
jantarová karta plánu. Ať je proužek 42 dp první věcí pod hlavičkou vždy,
i v režimu pořadí a na zámku, a karta 67 dp ať zmizí: je to týž údaj
podruhé a jiným tvarem.

### 3. Barevný rám na neviditelné ploše se stal univerzálním pásem

`zvyrazneni` `#f3f0ea` na `pozadi` `#fbfaf8` je **1,09:1** (tmavá sada
**1,21:1**) — plocha vidět není, všechnu práci dělá 1 dp rám. `vystraha`
`#8a5000` dnes znamená *jedeš podle plánu* (Plan, čistá informace), *dva
prvky ještě neodešly* (Hotovo, varování), ***rozhodčí trať přijal***
(Zamek, úspěšný konec), *Odemknout na přestavbu* (tlačítko) i *stavba čeká
na prvku 5* (Fronta, překážka); `voda` `#1f6f8b` znamená *pravá značka
chybí* (Dvoubod), *řádek se táhne* (Poradi) a *tahle regata* (Vyber).

Mezi sebou mají `vystraha`/`voda` **1,15:1** a `vystraha`/`stavZruseny`
**1,09:1**: dva pásy se v pohybu neliší ničím než textem — přesně ono
„všechno váží stejně", které měl nález 6 odstranit.

**Co s tím.** Jeden význam na token: `vystraha` = *něco čeká na tebe*,
`jede` = *hotovo* (tam patří „rozhodčí trať přijal"), `voda` = *tady jsi /
sem miř*. Rám jen 2 dp a jen když nese stav; `linka` 1 dp (1,26:1 na
pozadí) vyhodit ze všech 65 výskytů a skupiny oddělit mezerou 8 dp.

### 4. Paleta mimo sadu: devět pevných hexů, dvě žluté, obrácená tmavá

Makety mají 37 různých hexů, z toho 11 tokenů světlé sady. Mimo sadu stojí
`#b7b2aa` (spojnice osy, 54 výskytů), `#c8c4bd`, `#e6e3de` a `#8d8880`
(vypnuté *Nahlásit hotovo*), `#f6f3ef`, `#9b968d`, `#eef3f5`, `#dfe6ea` —
tmavý protějšek nemá žádný a `tools/kontrola-tokenu.py` je neuvidí:
porovnává klíče z `theme.ts`, ne hexy přibylé v komponentě. Proti
`dark.pozadi` jde spojnice osy z **2,02:1** (ve světlé pod mezí 3:1 pro
grafiku, SC 1.4.11) na **8,53:1**, plocha vypnutého tlačítka z 1,23:1 na
**14,06:1**, pás poznámky na **16,27:1** a plocha mapy na **16,08:1**: ve
světlé neviditelné, v tmavé nejjasnější plocha displeje, kde by spojnice
křičela víc než značky — a s tmavou se podle odpovědi z 18. 11. počítá.
`#8d8880` na `#e6e3de` je **2,75:1**, přitom je to jediné místo, kde je
napsané, **proč** hlásit nejde.

Žlutá bójka je navíc dvě různé žluté: `Fotka`, `Popis` a `Zamek` ji kreslí
`#f2c14e` (`pripravaZnameni`, token **přípravného znamení**) s lemem
`#c9922f` = `dark.vystraha`, tedy **tokenem tmavé sady ve světlé maketě**;
zbylých pět souborů `#e8b400`. Skutečná paleta přitom neunese
obě sady sama — poměr k `papir` proti `dark.papir`: žlutá **1,92** → 8,65;
bílá **1,00** → 16,58; červená 6,22 → **2,66**; modrá 6,44 → **2,57**.
Lemy jsou dopočítané jen pro světlou (`#8f0d17` má na `dark.papir`
**1,77:1**) a **červená se zelenou mají mezi sebou 1,24:1** — dva konce
brány jsou pro barvoslepého jeden flek.

**Co s tím.** Hexy, které přežijí, do `theme.ts` i na web (jinak kontrola
tokenů zastaví nasazení); zbytek nahradit tokeny. Lem bóje odvodit z barvy
výpočtem (vzor: `pismoNaVyplni`, `app/src/lib/kontrast.ts:66`, vznikl
30. 10. přesně z tohohle důvodu) a rozlišení nechat na **tvaru**, který
`Znaky.dc.html` už umí. A dvě věci z „co se zapomene první" překreslení
20. 11. nevzalo: bílá je pořád napevno na všech šesti modrých plochách
(tmavá **2,35:1**, `dark.pozadi` by dalo 7,66:1) a obrys *Zkusit znovu* je
dál `voda`, ne `text`.

## Co bych potřeboval vědět

- **Filipovi.** Má být *Postavit sem* stejně silné jako pípnutí? Můj obor
  říká ne, jiný zdroj polohy má mít jinou váhu — ale co je hlavní práce,
  rozhoduješ ty.
- **Filipovi.** Smí bójka v seznamu přijít o barvu, když zůstane tvar
  a slovo? Žlutá má ve světlé sadě 1,92:1 a bílá 1,00:1 — pracuje jen lem.
- **Ergonomii (1).** Unese řádek 56 dp značku kreslenou tvarem (válec,
  kužel, plovatka), nebo je silueta v pohybu nečitelná a disk poctivější?

## Čeho se nedotýkám

- Počet klepnutí, pořadí otázek a velikost terčů — obor 1. Jen co jsem
  naměřil: swatche barev v `Barva.dc.html` jsou 38 × 38 dp.
- Model „jedna obrazovka ve stavech", prázdný plán a formulace hlášek — 3.
- Věcná správnost tvarů a znaků ve `Znaky.dc.html` a sled stavby — obor 5.
- Cena nativních závislostí a otisku; a vymyšlená jména lodí v maketách.
