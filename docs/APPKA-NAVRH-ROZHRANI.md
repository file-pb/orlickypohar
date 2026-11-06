# Appka: návrh rozhraní závodníka a sjednocení toho, co stojí

**Stav k 6. 11. 2026.** Návrh k rozhodnutí. U každé věci je **jedna
doporučená varianta**, ne přehled možností — a u každé je napsané, co drží
a co obětuje.

**Co už z něj stojí** (Filip rozhodl 6. 11. 2026, commit `85d66b7`):

| | Co | Stav |
| --- | --- | --- |
| 1 | kontrast písma na barevné výplni | **postaveno**, `app/src/lib/kontrast.ts` + test |
| 2 | tři velikosti akce a 34 přepsaných terčů | **postaveno**, `Akce` a `Radek` v `ui.tsx` |
| 3 | kontrola terčů v CI | **zapojena** vedle kontroly tokenů |
| 4 | rozhraní závodníka | návrh, pruh se mezitím předělal (níž) |
| 5 | rozcestník do tří pásů | návrh |

Plátno s obrazovkami: **Appka závodníka — návrh**
(<https://claude.ai/artifact/LP1yf9Ddz4AaceLnk8mkTK>). Pět kreseb:
rozhraní závodníka ve světlém i tmavém režimu, čtyři stavy pruhu, slovník
akcí s terči a rozcestník.

Co návrh **obchází** a čím se řídí: rozhodnutí z `APPKA-PORADI-PRACI.md`,
oddílů *Co drží rozhraní rozhodčího pohromadě*, *Názvosloví, na kterém
záleží* a *Co má vidět posádka*. Žádné z nich se tu nemění.

---

## Co je změřené, ne odhadnuté

Tři měření. Dvě z nich našly v appce vadu, která tam dneska je.

### 1. V tmavém režimu byly čtyři plochy pod mezí kontrastu

**Opraveno 6. 11. 2026.** Zbytek oddílu popisuje, co se našlo a proč.

Spočítáno z `app/src/constants/theme.ts`, tedy ze stejného zdroje, jaký
čte `tools/kontrola-tokenu.py`. Mez WCAG 2.2 AA pro běžný text je 4,5:1.

| Místo | Co na čem | světlý | tmavý |
| --- | --- | --- | --- |
| `odpocet.tsx:513` panel *„start padl"* | bílá / `jede` | 6,29 | **2,07** |
| `odpocet.tsx:583` poslední minuta | bílá / `vystraha` | 6,51 | **2,75** |
| `odpocet.tsx:393` tlačítko *Provést* | bílá / `vystraha` | 6,51 | **2,75** |
| `cil.tsx:591` tlačítko *Provést* | bílá / `vystraha` | 6,51 | **2,75** |

**Proč to kontrola nechytila.** `kontrola-tokenu.py` odvozuje páry
z pravidel ve webovém `globals.css`. Tyhle páry na webu neexistují —
vznikají až v appce tím, že komponenta položí `s.naBarve` (`#ffffff`)
na token použitý jako **výplň**. Kontrola je tedy nemíjí omylem, ale
proto, že se dívá jinam.

**Proč zrovna v tmavém.** V tmavé sadě jsou `jede`, `vystraha`
i `stavZruseny` **světlé barvy** — jsou tam na to, aby se daly číst jako
písmo na tmavém papíře. Jako výplň pod bílým písmem fungovat nemohou.
Komentář v `theme.ts` u `vystraha` mluví o bílém písmu na panelu poslední
minuty a dokládá to měřením — ale měřená je hodnota světlá (`#8a5000`),
ne tmavá (`#c9922f`).

**Postavená oprava: písmo se vybírá podle jasu výplně, ne podle režimu.**
Nový token nevznikl schválně — každý klíč v `theme.ts` musí mít protějšek
ve webovém `globals.css`, jinak kontrola tokenů spadne, a tahle potřeba je
jen appky. `pismoNaVyplni` v `app/src/lib/kontrast.ts` proto vybírá z barev,
které v sadě už jsou (`text`, `papir`, `pozadi`), tu s nejlepším kontrastem.

**Podle režimu by to nešlo**, a to je ten důvod, proč je to funkce a ne
podmínka: „v tmavém režimu tmavé písmo" by na `dark.procedura` (`#16495c`)
dalo tmavé na tmavém, tedy horší výsledek než ta bílá, co tam byla.

Co z toho vyjde v tmavé sadě:

| Na výplni (tmavý režim) | bílá | `t.pozadi` |
| --- | --- | --- |
| `jede` | 2,07 | **8,69** |
| `vystraha` | 2,75 | **6,54** |
| `stavZruseny` | 3,07 | **5,87** |
| `voda` | 2,35 | **7,66** |

`procedura` je v obou sadách tmavá a světlé písmo nese (5,67 / 9,81).

**Hlídá to test**, ne komentář: `app/testy/kontrast.test.ts` jede přes
**každou** výplň v obou sadách a spadne na šesti případech, když se písmo
začne vybírat napevno (vyzkoušeno sabotáží 6. 11. 2026).

**Jedna věc z toho zbývá, a je změřená.** Proužky fází na panelu odpočtu
jsou barvy znamení — bílá vlajka, žlutý přípravný — a na **jantarové**
ploše poslední minuty v tmavé sadě nedrží ani mez 3:1 pro grafiku:

| | na `procedura` | na `vystraha` |
| --- | --- | --- |
| `vyzvaZnameni` / `minutaZnameni` | 9,81 | **2,75** |
| `pripravaZnameni` | 5,84 | **1,64** |

Žlutý proužek na jantaru je prakticky neviditelný. Přebarvit ho jde, ale
je to **rozhodnutí o vzhledu** — ty barvy nesou význam vlajek, ne ozdobu —
takže to tenhle commit nedělá.

### 2. Čtyři z pěti klepacích míst byla menší, než snese ruka na lodi

**Opraveno 6. 11. 2026:** z 24 klepacích míst drží mez 44 pt **všech 24**
a kontrola je v CI. Zbytek oddílu popisuje, co se našlo.

Nový nástroj: `tools/kontrola-dotyku.py`. Měří deklarovanou geometrii
terče (`minHeight`, svislá výplň, `hitSlop`) a řádek textu počítá
paušálně 20 pt — **horním** odhadem, takže nahlásí jen to, co je malé
i při nejpříznivějším předpokladu.

    python3 tools/kontrola-dotyku.py            # jen přestupky
    python3 tools/kontrola-dotyku.py --mez 48   # androidí mez

Výsledek 30. 10. 2026: z **52** klepacích míst je pod mezí Apple HIG
(44 pt) **34**, pod mezí Android Material (48 dp) **46**. Třicet z nich
má výplň **nulovou** — jsou to holé odkazy vysoké jen jako řádek textu.

| Soubor | Pod mezí |
| --- | --- |
| `ucet.tsx` | 6 |
| `tracker/index.tsx` | 6 |
| `tracker/[id].tsx` | 4 |
| `lode/[lod].tsx` | 4 |
| `klic.tsx` | 3 |
| `index.tsx` | 3 |
| `verze-appky.tsx` | 2 |
| `odpocet.tsx` | 2 (řádky *Hlásí a troubí* a *Povolit „Nerušit"*, 32 pt) |
| `cil.tsx` | 2 (36 a 40 pt) |
| `ui.tsx` | 1 (*Zkusit znovu* v `Chyba`) |
| `lode/index.tsx` | 1 |

**Je v tom vidět historie appky.** Start a cíl se stavěly pro ruku
u vody a mají 56 pt i 78 pt; účet, lodě, klíč a trasa vznikaly, když
byla appka čtečka, a mají řádkové odkazy. Není to zanedbání, je to dvě
různá zadání v jednom produktu.

**Čím se pozná, že ta kontrola je porušená.** Dokázáno sabotáží,
30. 10. 2026, ne přečtením kódu:

| Sabotáž | Výsledek |
| --- | --- |
| `<Pressable>` bez výplně vložený do `odpocet.tsx` | nálezů 2 → 3, s číslem řádku; po vrácení zpět 2 |
| `PROHLEDAT` namířený na neexistující složku | **kód 2**, *„nebylo co měřit"* — ne tichá nula |
| překlep v přepínači (`--mezz`) | **kód 2** |

**Mez té kontroly.** Měří papír, ne obrazovku: terč, který je deklarovaný
dost velký, ale překrývá ho něco jiného, z `.tsx` nevyčteš. A nic neví
o odstupu mezi terči, který je na lodi stejně důležitý jako jejich
velikost.

**Do CI šla až s opravou** (6. 11. 2026), ne dřív: kontrola, která shazuje
každý běh, se vypne a zůstane z ní komentář.

**Pátá sabotáž neprošla — a byla z nich nejužitečnější.** Sražení výplně
`Akce` na nulu kontrola neohlásila, a z toho vyšly dvě věci:

- **chyba, která je opravená:** kontrola hledala proměnnou se stylem
  v celém souboru, takže do `Klepaci` dosadila stejnojmennou proměnnou
  z `Karta` a terč tím propustila. Rozsah je teď omezený na funkci.
- **slepé místo, které opravit nejde a je zapsané v kontrole:** styl
  **předaný propem** rozpustit nelze. React Native nechává pozdější
  položku pole přebít dřívější, takže kdyby `Akce` nastavila
  `minHeight: 0`, terč by se doopravdy srazil a kontrola by mlčela.
  Drží to jen pravidlo, že výšku nastavují `Akce` a `Radek`, a nikdo jiný.

### 3. Na slunci nerozhoduje barva, ale velikost

Tohle je **výpočet, ne měření na telefonu** — a parametry jsou tu proto,
že výsledek na nich stojí: jas displeje 600 cd/m², odraz lesklého skla
4,5 %, osvětlení 60 000 lx (jasný den). Odražené světlo přidá ke každé
barvě stejný závoj ≈ 859 cd/m², a tím se každý poměr srazí k jedničce:

| Pár | v místnosti | na slunci |
| --- | --- | --- |
| text na papíru, světlý | 16,91 | **1,68** |
| text na papíru, tmavý | 13,81 | **1,56** |
| bílá na proceduře, světlý | 5,67 | **1,55** |
| tlumený na papíru, tmavý | 6,48 | **1,24** |

**Dvě věci z toho plynou, a obě jdou proti citu.**

- **Na slunci je na tom lépe světlý režim**, ne tmavý. Prověřeno na 24
  kombinacích parametrů (jas 450–2000 cd/m², odraz 2–4,5 %, osvětlení
  20 000–100 000 lx) — světlý vyhrál ve všech, rozdílem 8 až 16 %. Je to
  malý rozdíl, ale **vždycky týmž směrem**.
- **Rozdíl 1,24:1 proti 1,68:1 žádná barva nespraví.** Co na slunci
  rozhoduje, je velikost písma, plocha a to, že věc leží vždycky na
  stejném místě. Tím je doložené, proč má pruh stavu zabírat třetinu
  obrazovky a proč je stavové slovo 44 px: ne kvůli vzhledu, ale protože
  barva v tu chvíli nenese nic.

---

## Rozhraní závodníka

Jediné zadání, které k tomu je, je z `APPKA-PORADI-PRACI.md`: posádka má
vidět **barvu stavu, pokyn závodní komise, svou loď s posádkou, spojení
a jestli se vysílá poloha** — a **odpočet ne**.

### Doporučená varianta: pruh stavu a tři karty, nic na klepání

Jedna obrazovka, čtyři vodorovné pásy odshora dolů; pořadí je pořadí
otázek, které posádka na vodě má.

1. **Pruh stavu** — horní třetina obrazovky, celá v barvě. **Barva patří
   datům, ne závodu** (Filip, 6. 11. 2026): nese jméno lodi, stavové slovo
   ve 40 px (*Vysílá se* / *Drží se v telefonu* / *Nenahrává se* /
   *Nesleduje se*) a jednu větu, co to znamená. Pod čarou pak **závod** —
   rozjížďka, poslední znamení a jeho čas.
2. **Pokyn závodní komise** — karta se svislým jantarovým pruhem vlevo.
   Je tam **jen tehdy, když nějaký pokyn je**, a sama nezmizí.
3. **Moje loď** — jméno, číslo plachty, třída, posádka po řádcích.
4. **Spojení a poloha** — tři řádky s kolečkem: poloha, spojení,
   baterie. Každý říká **čerstvost, ne kontrolku** („před 8 s", „drží 412
   bodů") — totéž pravidlo, jaké má obrazovka Trasa.

Dole jediný terč na celé obrazovce: **Pozastavit vysílání polohy**,
56 pt, ohraničený a tlumený.

**Co to drží.**

- **Posádka na vodě na nic neklepe.** Z oponentury:
  *„potřebujeme ale aby to nemuseli posádky zapínat manuálně na vodě …
  pak už na to nemusí posádky vůbec koukat"* — zápis se nastaví
  v klubovně a telefon už jen jede. Obrazovka, která je k dívání, se
  navrhuje jinak než obrazovka k ovládání: velké písmo, stálé polohy,
  žádné stavy, do kterých se dá zabloudit.
- **Barva nese to jediné, co ví jenom telefon.** Co se děje na vodě,
  posádka slyší od komise — je to totéž pravidlo, které sem nepustilo
  odpočet. Jestli se její stopa dostane ven, ale neví odnikud jinud, a je
  to zároveň jediná věc, se kterou může sama něco udělat. **Závod zůstává
  v pruhu textem**, protože je to podřízená informace, ne proto, že by
  nebyla důležitá.
- **Barva se pozná koutkem oka a liší se jasem, ne jen odstínem.** Takže
  ji rozliší i ten, kdo zelenou od červené nerozezná. Měřeno výš.
- **Loď s posádkou je v tom proto, že se kontroluje na břehu.** Přejímací
  podmínka č. 6 ze scénářů je *telefon přiřazený ke špatné lodi*; tahle
  karta je to, na co se u mola kouká.
- **Baterie navíc.** V zadání nebyla, ale `UcastDto` ji už nese
  (`baterie`) a Miloš ji chtěl vidět ve správě. Posádka je ten, kdo s ní
  může něco udělat — a jen dokud je u mola.

**Co to obětuje.**

- **Odpočet, i v podobě jména fáze s ubývajícím časem.** Místo něj stojí
  *poslední znamení a kdy padlo* — tedy minulý fakt s časem, ne běžící
  číslo. Zpoždění sítě z něj nedělá lež, jen pozdní zprávu, a to je
  z obrazovky vidět, protože čas je u toho. Pořád je to **méně**, než
  co posádka slyší od komise.
- **Tresty, které posádka dostala.** Miloš je zmínil (*„že jsem mu
  dal"*) a hned si to sám omezil (*„abychom jim nekomplikovali život"*).
  Do návrhu nejdou, protože není rozhodnuto, jestli vidí svoje nebo
  i ostatní — a ta otázka je v oponentuře vedená jako nezapsaná.
- **Výsledky a průběžné pořadí.** Ty zůstávají na obrazovce regaty, kde
  je čtenář hledá — stejné pravidlo, jaké platí pro rozhodčího.
- **Mapa trati.** Veřejná trať se dá číst
  (`/serie/{serie}/zavody/{zavod}/trat` je bez přihlášení), ale mapa je
  obrazovka k prohlížení a tahle je k mrknutí. Patří na vlastní.

### Čtyři stavy dat, a každý má svou barvu

Prahy nejsou vymyšlené: appka odesílá nejvýš jednou za minutu
(`ZIVE_MS = 60_000` v `app/src/lib/tracker/nahravani.ts`), a stavy GPS
i odesílání už appka počítá (`svetloGps`, `stavOdesilani`
v `tracker/stav.ts`). Nezavádí se tedy druhý stavový automat, jen se ten
hotový ukáže nahoře.

| Stav | Kdy | Barva | Co to znamená |
| --- | --- | --- | --- |
| **Vysílá se** | zapisuje a odeslalo do minuty | `jede` | server má všechno |
| **Drží se v telefonu** | zapisuje, neodeslalo | `vystraha` | bez signálu, body čekají — **není to ztráta** |
| **Nenahrává se** | nezapisuje vůbec | `stavZruseny` | **jediný stav, který se musí řešit** |
| **Nesleduje se** | pozastaveno, nebo bez klíče | papír a linka | záměr, ne porucha |

**Proč zrovna tyhle čtyři.** Rozlišit „drží se" od „nenahrává se" je to
podstatné: v prvním případě posádka nemá dělat nic a v druhém musí. Jedna
červená pro obojí by posádku hnala řešit výpadek signálu uprostřed
rozjížďky, a to je horší než mlčet.

**Závod má v pruhu řádek, ne barvu.** Stav startu (`stavStartu`
v `app/src/lib/start.ts`) se promítne do textu pod čarou: *Rozjížďka 3 ·
Příprava · 14:33*. Poslední minuta tam svou barvu **nemá** — to je rozdíl
proti panelu rozhodčího, a schválně: posádce by jantarová řekla „něco se
blíží" bez toho, aby věděla co, a kdyby přišla po síti pozdě, řekla by to
ve špatnou chvíli.

### Kde to leží a kdy se to ukáže

**Doporučení: na rozcestníku, v témže slotu jako `VELÍŠ`.** Ne jako nová
položka v nabídce.

Důvod je ten, který už v projektu platí pro rozhodčího: *start i cíl musí
být po zapnutí telefonu hned*. Pro posádku z toho vychází totéž o jejím
stavu — a `role.ts` tu rozcestu už má, jen má tři podoby místo čtyř.

Co by se v `role.ts` změnilo:

- `Postava` dostane čtvrtou hodnotu **`zavodnik`**;
- je to telefon, který **má klíč k lodi** (`lib/klic.ts`) **nebo** je
  přihlášený a má lodě, **a zároveň** je dnes rozjížďka, která jede nebo
  se ohlásila;
- **`rozhodci` to přebíjí**, stejně jako dnes přebíjí `kapitan`:
  rozhodčí s vlastní plachetnicí přijel velet;
- **klíč stačí, účet ne**: od posádky chceme co nejméně, a půlka
  posádky účet nemá.

Pravidlo patří do `role.ts` a jeho testu, ne do komponenty — stejně jako
`maBytKlid` a `stavStartu`. Dá se ověřit bez telefonu.

**Kdy zmizí.** Když v regatě nic nejede. Mimo závodní den by to byl
pruh, který říká *Čeká se* celý rok, a to je ta chyba, kterou projekt
zná jako *„Čeká se na rozpravu i hodinu po rozpravě"* (nález 9
v `TABULE-DIVAK.md`). **Stav, který platí vždycky, neříká nic.**

### Co k tomu v API chybí

Dohledáno ve `app/src/lib/schema.d.ts`, ne odhadnuto:

- **Pokyn závodní komise není veřejný.** `UkonDto` (`ZmenaUseku`,
  `ChybejiciZnacka`) žije jen pod `/sprava/serie/{serie}/zastavky/
  {zavod}/rozjizdky/{cislo}/ukony`. Bez veřejné cesty je druhá karta
  návrhu prázdná schránka.
- **Zkrácení trati veřejné je.** `VerejnaTratDto` nese `zkracenoUPrvkuId`
  a `zkracenoV`, a `prestavba`. Tím se dá karta naplnit hned, byť jen
  dvěma druhy pokynu ze čtyř.
- **Odvolání a odložení se z `RozjizdkaDto` nepozná.** Je v ní `stav`
  (`Planovana` / `Probiha` / `Dokoncena` / `Zrusena`) a `startV`; že
  procedura byla odvolána, se čte jen z toho, že `startV` zmizel. Pro
  čtvrtý stav pruhu to stačí **slabě** — je to odvozenina, ne zpráva.

**Doporučení:** postavit to na tom, co veřejné je (stavy ze `startV`
a `stav`, pokyn ze zkrácení a přestavby), a kartu pokynu nechat
připravenou. Čekat na nové API by znamenalo nemít posádce co dát.

---

## Ucelenost toho, co stojí

Start, cíl, rozcestník, účet, lodě, klíč a trasa vznikaly každé jiný den.
(Bóje v appce obrazovku nemají — ty jsou jen ve správě.) Čtyři
doporučení, v pořadí podle toho, co je nejvíc vidět.

### 1. Tři velikosti akce a nic mezi nimi

**Doporučení:** jedna komponenta v `ui.tsx` se třemi velikostmi.

| Velikost | Výška | Na co | Dnes v appce |
| --- | --- | --- | --- |
| **hlavní** | 56 pt, plná barva | co se dělá teď: spustit proceduru, ohlásit rozjížďku | je (`s.spustit`) |
| **běžná** | 48 pt, obtažená | co se dá udělat: odložit, odvolat, ukončit | 38–42 pt |
| **řádková** | 44 pt s linkou pod sebou | kam se dá jít: lodě, klíč, trasa, web | 20 pt, holý odkaz |

**Co to drží.** Jediné rozhodnutí u každého tlačítka je *která z těch
tří* — a to je rozhodnutí o úkonu, ne o vzhledu, takže ho udělá ten, kdo
obrazovku staví, a nemůže se minout. Nad tím visí kontrola, která to
změří.

**Co to obětuje.** Obrazovky poroste výška: šest odkazů na Účtu zabere
264 pt místo dnešních ~120. Účet bude potřeba rozdělit na dvě skupiny
(viz 3), jinak se bude rolovat.

**Čtvrtá velikost se nezavádí.** Řádková je 44, ne 40 — na 44 projde iOS
a na Android pak zbývá jedna změna, ne dvě.

### 2. Na barevné ploše se písmo bere podle režimu

**Doporučení:** `useTheme()` vydá kromě barev i `naVyplni` — bílou ve
světlém režimu, `t.pozadi` v tmavém. Hodnota z tokenů, ne barva zapsaná
do komponenty, a `s.naBarve` z `odpocet.tsx` i `cil.tsx` se tím ruší.

**Co to drží.** Čtyři místa z měření 1 se dostanou nad mez, aniž by se
sáhlo na `theme.ts` nebo na web — `kontrola-tokenu.py` zůstává zelená.

**Co to obětuje.** Tmavý režim se změní na vzhled: panel *„start padl"*
a poslední minuta budou tmavé písmo na světlé ploše, ne bílé na tmavé.
**Je to rozhodnutí o vzhledu, a to je Filipovo.** Čísla jsou výš; jestli
ta podoba vyhovuje, se dá říct jen z pohledu na plátno.

### 3. Jeden slot „co teď" a dvě patra pod ním

**Doporučení:** rozcestník má tři pásy a vždycky týž:

- **CO TEĎ** — jedna karta, čtyři podoby, nikdy dvě naráz: *velíš* /
  *jedeš* / *sledování běží* / nic.
- **ROČNÍKY** — jak dnes.
- **TELEFON A ÚČET** — řádky po 44 pt: účet a oprávnění, moje lodě
  a posádka, záznam trasy, web. Každý má vpravo stav („JOY", „běží",
  jméno) — tím řádek říká, co za ním je, a nemusí se tam chodit zjistit.

Účet se tím zbaví role chodby: dnes jsou pod ním lodě, klíč i trasa jako
holé odkazy, protože se musely z rozcestníku uklidit. Tady už
z rozcestníku uklízet nemusí, protože rozcestník má patro, kam patří.

**Co to drží.** Jedno pravidlo nahoře, jedno dole, a nic mezi tím
nekmitá podle role. Dnešní dvě podmínky (`kdo === 'rozhodci'`,
`kdo === 'kapitan'`) ve dvou různých místech obrazovky se scházejí do
jedné komponenty.

**Co to obětuje.** Rozcestník bude delší a *Moje lodě* se objeví na dvou
místech (v řádku „moje lodě a posádka" a v kartě *jedeš*). To je záměr:
na břehu se tam chodí ze seznamu, u vody ze stavu.

### 4. Čerstvost je jeden tvar v celé appce

Obrazovka Trasa už má pravidlo *čerstvost, ne kontrolka* a tvar
`kolečko · popis · hodnota` (`Radek` v `tracker/index.tsx`). Rozcestník
má svůj (`Sledovani`), rozhraní závodníka by měl mít třetí.

**Doporučení:** ten tvar vytáhnout do `ui.tsx` a použít na všech třech
místech. Čtyři barvy koleček, které v trackeru už jsou (`jede`, `ceka`,
`stoji`, `pozastaveno`), jsou slovník — ne vzhled.

**Co to drží.** Posádka se naučí jeden tvar a čte ho pak všude; tři
kopie by se postupně rozešly, jako se rozešlo stáří polohy mezi správou
a tabulí.

**Co to obětuje.** Nic viditelného. Je to jediné ze čtyř doporučení,
které nemění, jak appka vypadá.

---

## Prověření scénáři

`SCENARE-OVLADANI.md` má 37 scénářů ovládání. Návrh se jimi dá prověřit
bez spuštění, a vyšly z toho dvě věci:

**Co scénáře o návrhu říkají.** Skupina **B. Kapitán lodi** (B1–B5) jde
celá o břeh — dostat se ke své lodi, připojit posádku, odebrat člověka.
Všech pět vede přes řádkové odkazy, které měření 2 označilo za malé, a po
doporučení 1 a 3 se jejich cesta zkrátí o jedno hledání: *moje lodě
a posádka* je na rozcestníku, ne pod Účtem.

**Co v nich není.** Žádný scénář nekouká na **posádku na vodě**. B1–B5
končí u mola, C a D jsou pořadatel a rozhodčí, A je návštěvník. Rozhraní
závodníka se tedy prověřit nedá — a to je samo nálezem: obrazovka, kterou
nikdo nezkoušel, se pozná až na vodě.

**Tři scénáře, které chybí** (do `SCENARE-OVLADANI.md` je nezapisuju,
ten dokument vede jiná session):

- **Z1 — Co se teď děje.** *Zadání:* jsi posádka, telefon leží v kapse,
  vytáhni ho a řekni, v jaké fázi je závod. *Pro moderátora:* měř, jak
  dlouho se kouká a jestli hledá, než přečte.
- **Z2 — Komise něco vyhlásila.** *Zadání:* zjisti, co se změnilo na
  trati. *Pro moderátora:* pozná pokyn od stavu? Pozná, že platí **od
  14:21** a ne „teď"?
- **Z3 — Vysílá se moje poloha?** *Zadání:* ověř, že se tvoje poloha
  zapisuje, a potom ji na pět minut zastav. *Pro moderátora:* najde
  jediný terč na obrazovce? A pozná z koleček, že po zastavení vznikne
  v trase díra?

---

## Co z toho je čí rozhodnutí

**Doložitelné, a je to změřené výš** — kontrast čtyř ploch v tmavém
režimu, velikost 34 terčů, to že na slunci rozhoduje velikost a ne
barva, a to že světlý režim je na slunci lepší než tmavý.

**Rozhodnutí o vzhledu, tedy Filipovo:**

1. Má pruh stavu zabírat **třetinu obrazovky**, nebo stačí pás?
2. Má posádka u závodu vidět **poslední znamení a jeho čas**, nebo ani to
   ne?
3. Jde rozcestník do tří pásů (doporučení 3), nebo zůstane, jak je?
4. **Přebarvit proužky fází** na jantarovém panelu, aby v tmavém režimu
   držely 3:1 (dnes 1,64 a 2,75), i za cenu toho, že přestanou odpovídat
   barvám vlajek?

Rozhodnuté 6. 11. 2026: barva pruhu patří datům (ne závodu), písmo na
barevné ploše se vybírá podle jejího jasu, a oprava terčů šla jedním
commitem.

**Co návrh nedoporučuje stavět vůbec:** mapu trati pro posádku, tresty
posádky (není rozhodnuto, čí vidí), a odpočet v jakékoliv podobě.
