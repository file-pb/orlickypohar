# Kolo 3 — dvě obrazovky, které nejsou nakreslené

Třetí ze čtyř. **Pořád se nehlasuje** — uzavírá se v kole 4. Kolo 2 bylo
nejlepší, co jsem v konziliu viděl: ustupovalo se doloženě, dvakrát proti
vlastnímu kolu 1, a sporů zbyly dva.

Proto tohle kolo **není o sporech**. Všechno, na čem jste se shodli, teď
míří do dvou věcí, které nikdo nenakreslil — **jedna řádka trati**
a **detail prvku**. Obě jsou podmínkou dvou z vás. Kolo 3 je má popsat
tak, aby se v kole 4 hlasovalo o jednom tvaru, ne o nápadech.

## Co je uzavřené a v kole 4 se o tom nehlasuje

Shodli jste se, nebo tomu nikdo neodporoval:

1. **Vítr na obrazovku nepatří** — 5-jachtar ho sám zrušil: stavitel ho
   vidí z vlajky, čeření a tvaru vody, a z vody nejde přečíst jedině
   **geometrie**. Spor A tím ztratil svou dražší polovinu.
2. **Vzdálenost k cíli jízdy stojí u akce**, na řádku nad hlavním
   tlačítkem, který už existuje (`Main` y 704–720). Nula nových dp, nula
   klepnutí. **Azimut jen v detailu prvku.**
3. **Jantarová karta plánu mizí**, proužek polohy je první věc pod
   hlavičkou ve všech stavech. Stav prvku je **slovo vpravo v řádku**,
   takže plán přestane být rozložením a obrazovka vypadá stejně, ať plán
   je, nebo není.
4. **„Plán existuje" je `Trat.ZverejnenaV`**, ne dopočet ze `ZdrojPolohy`.
   Dráty a molo se do plánu nepočítají — nejede se k nim.
5. **Přerovnání není práce stavitele na vodě** (J3). Padá s ním režim,
   dva přechody, gesto, `gesture-handler` i `reanimated`. Z „jedné
   obrazovky ve stavech a v režimu" zůstává **jedna obrazovka ve
   stavech**, a je jich šest včetně zámku.
6. **Plná `voda` 358 × 86 = „změř polohu tady a teď".** *Jsem u ní* ji
   nese právem, protože měří; *Postavit sem* a *Hotovo* jdou do obrysové
   váhy — ale obrysová váha **nesmí zmenšit terč**.
7. **Osa ukazuje značky, ne průjezdy** (J2). Všichni tři, kdo se
   vyjádřili, došli k témuž ze tří stran: stavy jsou vlastnosti bóje
   a při řádku na průjezd se zdvojí a rozejdou; chyba opačným směrem je
   horší; a je to zároveň nejlevnější oprava N1.
8. **Varianta až po druhém pípnutí** (E7) — a je to rozhodnutí
   rozhodčího, ne stavitele u kormidla.
9. **Barva ven ze zakládací cesty** (E5): do motoráku se ráno naloží
   jedna krabice bójí.
10. **Cesta zpátky z „co jsi pípnul"** (E6): *Nebylo to nic* ten stav
    uzavírá, ne rozbíjí.
11. **Destruktivní terč pryč z klidové polohy palce** (E2), **dolní pruh
    ven z rolovaného obsahu a do každého stavu** (E1, E3).
12. **Žádná barva bez tokenu v `theme.ts` s tmavým protějškem**, a
    `app/testy/kontrast.test.ts` rozšířený včetně sabotáže.
13. **`GET …/trat/prvky` musí vydávat `Zdroj`, `Barva` a `Tvar`.** Bez
    toho se řádka nenakreslí ani jednou. Text návrhu tvrdí opak a je
    nepravdivý.
14. **Klon je obvyklý začátek druhé rozjížďky**, `POST /dalsi` když se
    jede jinudy. Terč patří do druhé řádky hlavičky, kde místo je.

## Moderátorský zápis: tu chybu jsem ověřil sám

3-ux ohlásil, že přesun bóje po klonu přepíše odjetou rozjížďku. **Ověřil
jsem to v kódu a platí:** `PrepojPrvkyAsync` hledá prvky jen podle
`BojeAId`/`BojeBId` a **filtr na trať tam není** (`BojeSprava.cs:183–185`);
komentář nad ním vylučuje jen cizí *regatu*, ne druhou trať téže regaty.
Klon přitom kopíruje prvky **na tytéž záznamy bójí**
(`TratSprava.cs:881–884`, *„kopíruje se rozhodnutí, ne měření"*).

Je to **vada živého kódu**, ne návrhu, a klon volá web už dnes. Do
posudků ji neberte — půjde do závěru jako nález o kódu. Co se jí ale týká
vás: 3-ux na ni postavil podmínku *„klon nesmí být v appce dřív, než
přepojení umí trať"*, a to **podmínka je**, o které se v kole 4 hlasovat
bude.

## Co popsat v kole 3

### 1. Jedna řádka trati

Je to nejmenší a nejčastější věc na obrazovce; stavitel ji za regatu
přečte stokrát a všichni čtyři jste na ní něco našli. Dnes má **šest
podob v pěti výškách**. Popište **jednu**, každý ze svého oboru, a pište
čísla, ne přívlastky:

- co stojí **vlevo** (2-design chce kresbu ze `znak-boje.tsx`;
  1-ergonomie změřila, že při 17 dp jsou od sebe tvary dva až tři body
  a navrhuje sloupec 40 dp a siluetu 28 × 36);
- co **uprostřed** — jméno, předpis, a kolik z 298 dp vnitřku berou;
- co **vpravo** — stav slovem, vzdálenost a azimut; 2-design naměřil, že
  `↑ 063° · 310 m` v 15/700 je 109 pt a vejde se, když odejde fajfka;
- **výška a rozteč.** Tady je otevřená věc: 1-ergonomie změřila, že při
  rozteči 77 dp se na hlavní obrazovku vejde **pět prvků** a šestý se
  **ustřihne**, ne odroluje. Nabízí spojnici na 8 dp (rozteč 64, šest
  prvků) nebo rolování pod pevným pruhem. Rozhodněte které — a
  2-designu: co to dělá s osou, když se spojnice zkrátí na polovinu?

### 2. Detail prvku

Nenakreslená obrazovka, do které spadlo všechno: *Přesunout sem*,
*Sebrat z vody*, fotka, barva, tvar, azimut, mazání, a po J3 i oprava
pořadí *výš/níž*. 1-ergonomie z ní udělala podmínku (*„dokud nestojí, je
polovina návrhu nezměřená"*), 3-ux taky.

Popište, co v ní má být **z vašeho oboru**, a hlavně **v jakém pořadí
shora dolů** — je to obrazovka, kde se potkává nejčastější práce dne
(přesun) s nejnevratnější (mazání). 1-ergonomie: spočítej cenu přesunu
v klepnutích proti dnešním patnácti ze sporu G. 5-jachtar: co z toho
dělá stavitel na vodě a co až na břehu.

### 3. Zbytek sporu C

Jediný spor, který kolo 2 neuzavřelo, a je malý:

- **Vzorky barev.** 2-design: jedna řada, disk 38–40 dp, terč nafouknout
  výplní na 44 × 44. 1-ergonomie: dvě řady po čtyřech se vzorky **56 ×
  56**, protože pod obsahem je 248 dp volna a v rukavicích je 56
  o čtvrtinu jistější. **Hlásí se 1 a 2**, rozhodne se v kole 4.
- **Silueta 28 × 36 ve sloupci 40 dp** — 2-design se k tomu číslu ještě
  nevyjádřil.

## Co napsat

Do `docs/konzilium/stavitel-trati-2/<tvoje-session>-kolo3.md`, do **120
řádků**:

```markdown
# <obor> — kolo 3

## Jedna řádka trati
Čísla, ne přívlastky. Co je vlevo, uprostřed, vpravo; výška a rozteč.

## Detail prvku
Co v něm je z tvého oboru a v jakém pořadí shora dolů.

## Zbytek sporu C
Jen obory 1 a 2. Ostatní vynechte.

## Co jsem si rozmyslel
Jen když ti kolo 2 něco obrátilo. Jinak vynech.
```

Pravidla platí: podkládej, nepřepisuj kód ani makety, necommituj,
nesahej na cizí soubory. **Neotvírej nic nového** — na to byla kola 1
a 2. Výjimka je jediná: kdyby se při popisu řádky nebo detailu ukázalo,
že něco z uzavřeného seznamu výš **nejde postavit**, řekni to hned.

## Filipovy otázky, na které pořád nemám odpověď

Jede se na Orlíku na kola? Dostává stavitel azimut a vzdálenost rádiem,
nebo rozhoduje sám? Kdo zakládá trať pro druhou rozjížďku? Smí pomocník
nahlásit hotovo? Kolik fotek se vejde do dne?
