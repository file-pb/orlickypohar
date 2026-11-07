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
| 4 | proužky fází na jantarovém panelu | **postaveno**, viz níž |
| 5 | rozhraní závodníka | návrh |
| 6 | systémový proužek se spojením | **postaveno**, `lib/tracker/prouzek.ts` + test |
| 7 | skořápka: landing, kebab, bez hlavičky | **postaveno** |
| 8 | ukázkový režim | **postaveno**, `lib/ukazka.ts` + snímek + testy |
| 9 | patička se stavem lodi | návrh, viz níž |

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

Žlutý proužek na jantaru byl prakticky neviditelný.

**Opraveno 7. 11. 2026 — a vyšlo z toho, že jinak to ani nešlo.** Hledal
jsem napřed pevnou barvu, která by na obou plochách prošla, a **v tmavé
sadě žádná neexistuje**: jantar (jas 0,332) chce protějšek s jasem nejvýš
0,077, modrá (jas 0,057) chce buď aspoň 0,271, nebo zápornou hodnotu. Ty
dva rozsahy se neprotínají, takže barva proužku **musí** záviset na ploše
pod ním.

`barvaNaVyplni` proto ponechá barvu znamení, dokud ji plocha unese, a jinak
ustoupí písmu panelu. Na modrém panelu se tedy nezměnilo nic (9,81 a 5,84
v tmavé sadě); na jantaru poslední minuty jde trojice z **2,75 · 1,64 ·
2,75** na **6,54:1**. Ztráta rozlišení tam nic nestojí: úseky výzvy
a přípravy jsou v poslední minutě dávno plné a hýbe se jen ten minutový.

Žlábek, ve kterém proužek roste, byl bílý napevno a měl tentýž problém —
bere teď tutéž barvu s třetinovou průhledností.

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

0. **Systémový proužek** — úzký pás pod hodinami a baterií, nad vším
   ostatním. Nese **spojení**, a je na každé obrazovce appky; má vlastní
   oddíl níž.
1. **Pruh stavu** — horní třetina obrazovky, celá v barvě stavu. Nese
   číslo rozjížďky, jméno regaty, **stavové slovo ve 44 px** a pod čárou
   **poslední znamení a kdy padlo**.
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

### Čtyři stavy závodu, a každý má svou barvu

Mapování na `stavStartu` z `app/src/lib/start.ts` je přímé, takže se
nezavádí druhý stavový automat:

| Stav | Odkud | Barva | Co stojí pod slovem |
| --- | --- | --- | --- |
| **Čeká se** | není rozjížďka, nebo `bezCasu` | papír a linka | *Žádná rozjížďka neběží* |
| **Startuje se** | `procedura` | `procedura` | poslední znamení a čas |
| **Jede se** | `odstartovano`, `jede` | `jede` | *Start padl* a čas |
| **Odvoláno** | úkon `Odvolat` / `Odlozit` | `stavZruseny` | *Vraťte se ke startu* |

Pět barev se nezavádí a poslední minuta svou barvu **nemá** — to je
rozdíl proti panelu rozhodčího, a schválně: posádce by jantarová řekla
„něco se blíží" bez toho, aby věděla co, a kdyby přišla po síti pozdě,
řekla by to ve špatnou chvíli.

---

## Systémový proužek: spojení, a na každé obrazovce

**Postaveno 7. 11. 2026.** Pravidlo je `app/src/lib/tracker/prouzek.ts`
s jedenácti testy bez telefonu, kreslení `components/prouzek-spojeni.tsx`,
zapojení v `app/_layout.tsx`.

Filip, 6. 11. 2026, a je to jeho nápad, ne můj: spojení patří **úplně
nahoru, do systémového proužku** — pod hodiny a baterii. (Napřed jsem to
pochopil tak, že se má podle dat barvit pruh stavu, a přebarvil ho; to
byla chyba a je opravená 7. 11. 2026.)

**Proč je to lepší než karta na obrazovce závodníka.** Tahle informace
není o závodě, je o telefonu — a je stejně užitečná rozhodčímu u startu
jako posádce na vodě. V systémovém proužku je vidět **na každé obrazovce
appky** a nezabere ani řádek obsahu. Je to zároveň jediná věc, kterou ví
jenom telefon a se kterou může jeho majitel sám něco udělat; co se děje
na vodě, slyší od komise.

| Stav | Kdy | Barva | Co to znamená |
| --- | --- | --- | --- |
| **Vysílá se** | zapisuje a odeslalo do minuty | `jede` | server má všechno |
| **Drží se v telefonu** | zapisuje, neodeslalo | `vystraha` | bez signálu, body čekají — **není to ztráta** |
| **Nenahrává se** | nezapisuje vůbec | `stavZruseny` | **jediný stav, který se musí řešit** |
| **Bez klíče k lodi** | zapisuje, ale nemá kam | `stavZruseny` | jde vyřešit u kapitána |
| **Sledování pozastaveno** | posádka ho vypnula | `zvyrazneni` | záměr, ne porucha |
| *(žádný proužek)* | žádný otevřený záznam | — | není co hlásit |

**Dva stavy navíc oproti návrhu, a oba z kódu.** *Bez klíče* je zvlášť,
protože je to jediná ze tří potíží s odesíláním, kterou posádka vyřeší
sama. *Pozastaveno* je zvlášť, protože zapomenutá pauza je přesně ta
chyba, kterou by jinak nikdo nezahlédl — a červená by na ni byla lež.

**Pořadí podmínek je pořadí naléhavosti.** Když nechodí poloha, je jedno,
jak je na tom odesílání; mrtvá GPS proto přebíjí i potíž s klíčem. Má to
vlastní test, protože je to přesně ten druh pravidla, který se při příští
úpravě obrátí.

**Rozlišit druhý stav od třetího je to podstatné:** v jednom nemá posádka
dělat nic a v druhém musí. Jedna červená pro obojí by ji hnala řešit
výpadek signálu uprostřed rozjížďky, a to je horší než mlčet.

**Když se nic nezaznamenává, proužek tam není.** Pruh, který svítí pořád,
se přestane číst — a appka ten případ zná: *„Čeká se na rozpravu"* platilo
i hodinu po rozpravě (nález 9 v `TABULE-DIVAK.md`).

**Prahy jsou z kódu, ne vymyšlené.** Appka odesílá nejvýš jednou za minutu
(`ZIVE_MS = 60_000` v `app/src/lib/tracker/nahravani.ts`), takže „vysílá
se" je odesláno do minuty a „drží se" všechno nad ní. Stavy GPS
i odesílání už appka počítá (`svetloGps`, `stavOdesilani`
v `tracker/stav.ts`) a rozcestník je dnes čte každé tři vteřiny — zdroj
tedy existuje, chybí jen to místo nahoře.

**Jak je to udělané.** Appka si systémovou lištu podloží vlastním pásem
o výšce horního bezpečného okraje, takže hodiny a baterie sedí na barvě
a je to jeden pruh, ne linka pod lištou. Psát se dá až pod ně — střed
horního okraje zabírá na novějších iPhonech výřez. Světlost hodin se řídí
**výplní proužku**, ne režimem telefonu: `pismoNaVyplni` vybere písmo
a `expo-status-bar` podle jeho jasu přepne lištu. Nativní závislost to
nepřidává, takže to Miloše nestojí instalaci.

**Pod proužkem je mezera 3 px** (Filip, 7. 11. 2026: *„jen bych to od stavu
oddělil malinko"*). Bez ní splyne se vším, co má pod sebou tutéž barvu —
a *„vysílá se"* nad jedoucí rozjížďkou je přesně ten případ, obojí zelené.

**Horní okraj se nepřičítá dvakrát — a je to změřené.** Proužek si bere
horní bezpečný okraj a leží nad navigací; `headerStatusBarHeight`, kterým
by se dalo vynutit, že si ho hlavička nepřičte podruhé, tahle verze
navigace nezná. Spoléhalo se tedy na to, že si iOS i Android spočítají
bezpečnou oblast podle skutečné polohy pohledu — **ověřeno 7. 11. 2026
v simulátoru**, na landingu i na Ročnících: prázdný pruh pod proužkem
nevzniká.

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

## Skořápka appky: landing, kebab, bez hlavičky

**Postaveno 7. 11. 2026.** Rozhodl Filip čtyřmi větami, a každá z nich
odpálila kus toho, co tu stálo předtím:

> *„určitě headerShown: false, zpět gestem"* · *„to menu hoď pod nějaký
> kebab, ať to neotravuje"* · *„ten rozcestník tam máme jen abychom
> simulovali regatu"* · *„na rozcestník zatím jen vodočet a logo … to bude
> takový landing."*

**Hlavička se nekreslí.** Každá obrazovka má vlastní nadpis v obsahu, takže
se tím neztratilo nic než pruh nad ním — a zpět jde gestem od hrany, na
Androidu i systémovým tlačítkem. Tituly v `Stack.Screen` tím zmrtvěly
a zmizely (čtyři obrazovky). Horní bezpečný okraj dorovnává kořenový
pohled; když je vidět proužek spojení, vzal si ho on.

**Domovská obrazovka je landing:** logo, a pod tím *co teď* — rozhodčímu
velení, posádce běžící sledování. Nic jiného.

**A večer téhož dne i to pryč.** Filip: *„tohle z landingu vyndej, dej tam
veliké logo poháru, co máme na webu, přes celou obrazovku (landing budem
měnit, a tak jen teď dočasně jen s logem)."* **Je to vědomě dočasný stav**,
ne výsledek; stojí to tak i v komentáři u `app/src/app/index.tsx`.

Ustálilo se to na třetí pokus a obě opravy přišly od Filipa:

- nejdřív zmizelo všechno kromě značky — a hned se ukázalo, že **kebab
  zmizet nesmí** (*„a kam mi zmizel ten kebab?"*). Hlavička se nekreslí,
  takže ty tři tečky jsou jediná cesta z landingu jinam; bez nich je
  domovská obrazovka slepá ulička;
- pak se vrátil i **řádek se značkou** nahoře (*„to nahoře s tou lodičkou
  jsi klidně mohl nechat"*) — ikona, jméno, podtitulek a kebab vpravo.
  Značka pod ním se proto kreslí na 50 % výšky, ne na 55: ten řádek si
  svoje místo bere a na užším telefonu by se potkaly;
- a nakonec se rozhodlo, **co z toho řádku nabídku otvírá**. Ta věta šla
  číst dvojím způsobem a Filip ji dořekl ve dvou krocích: nejdřív *„klidně
  celý řádek"*, a když to tak stálo, upřesnil *„klidně užij standardní
  chování kebabu, když to nejde, tak jen tečky."* Standardní chování
  kebabu jsou ty tečky, takže platí ony a celý řádek se vrátil zpátky.

**Nativní nabídka se nestaví.** Na iOS je to `ActionSheetIOS`, na Androidu
kontextové menu — dvě různé komponenty pro jednu věc, kterou vlastní panel
umí na obou stejně. Kdyby ji Filip chtěl, je to samostatná práce, ne
přepínač.

**Karta *Velíš* se nevrací** (Filip, 7. 11. 2026). Ptal jsem se na to,
protože se tím Milošovi prodloužila cesta ke startu z jednoho klepnutí na
čtyři — kebab → Ročníky → ročník → regata. Rozhodnutí je jeho a zní ne;
zapsané je to tu proto, aby se ta otázka neotvírala potřetí. Zkrátit tu
cestu je práce pro stavovou obrazovku, ne pro kartu na landingu.

**Kebab drží všechno ostatní:** ročníky, lodě a posádka, klíč, trasa, účet,
web. Tři tečky mají terč 44 pt, i když se kreslí menší.

**Ročníky přestaly být domovem**, protože nejsou obrazovkou produktu —
výsledky a kalendář čte veřejnost na webu. V appce je to cesta dovnitř pro
zkoušení, a tak jsou pod kebabem.

**Co sem teprve přijde.** Na soutěžní den stavová obrazovka závodníka,
mimo něj kalendář — *„ale teď ne"*.

### Vodočet v appce byl a není

Postavil jsem ho a Filip ho týž den zrušil (7. 11. 2026): *„ten vodočet
v apce je blbost, to vyhoď … na webu je skvělý, bavíme se jen o apkách."*
Je to rozdíl mezi dvěma dveřmi do téhož produktu: na webu je hladina to,
kvůli čemu tam člověk jde, v appce by to byl údaj, kvůli kterému appku
nikdo nezapne. Zůstal po tom jen tenhle odstavec — a ten je tu proto, aby
to někdo za půl roku nestavěl znovu.

### Patička se stavem lodi — navržená, nepostavená

Filip, 7. 11. 2026: *„ještě mi tam chybí řádek se statusem lodi (klidně
jako plovoucí footer), ale aby posádka věděla, jak ji rozhodčí eviduje."*

**Plovoucí patička u spodní hrany**, protože to musí být vidět pořád:
tohle je jediné místo v appce, kde se posádka dozví, **co o ní zapsal
někdo jiný**. Kolečko, věta a čas — *Odstartovala · na trati*, *Trest 720°
— nevykonán*, *OCS — vrať se za startovní čáru*, *Dojela 3. · 14:52*,
*DNF*.

**Není to na klepání.** Zápis patří rozhodčímu; posádka ho jen vidí.
Miloš si to sám omezil (nález R34): *„možná by i mohl potvrdit po jeho
vykonání, že ho vykonal, ale abychom jim nekomplikovali život."*

**Co k tomu chybí, a je to totéž jako u pokynu komise:** veřejná cesta.
Jak rozhodčí loď eviduje, dnes žije jen pod `/sprava/…`. Bez ní je
patička prázdný rámeček, takže se musí stavět spolu s tím API.

### Ukázkový režim — postaveno 7. 11. 2026

Filip, 7. 11. 2026: *„když si to bude někdo chtít prohlídnout, tam mu to
nechci pouštět na serveru po telefonu a musíme mít nějaký demo mód"*,
a spouštět se má z kebabu.

**Co to obnáší.** Appka míří na API jedinou adresou
(`EXPO_PUBLIC_API_URL` v `lib/api.ts`), takže přepínač je levný; drahá je
ta druhá polovina — **odkud vzít data**. Tři cesty a jedno doporučení:

| Cesta | Co dá | Co stojí |
| --- | --- | --- |
| **přibalený snímek** regaty do appky | funguje bez sítě, i na vodě bez signálu | otisk appky poroste; snímek se musí udržovat |
| ukázkový ročník na **ostrém API** | nic se nepřibaluje | je to pořád server, což je přesně to, čemu se má předejít |
| **mock, který už máme** (`tools/fake-api.py`) nasazený zvlášť | hotová data | další běžící služba a další adresa |

**Postavený je přibalený snímek**, protože je to jediná z těch tří, která
splní to, co ta věta doopravdy žádá.

| Co | Kde |
| --- | --- |
| přepínač a odpovídač | `app/src/lib/ukazka.ts` |
| snímek, 13 cest, 152 kB | `app/src/ukazka/snimek.json` |
| jeho výroba z mocku | `app/scripts/ukazka.py` |
| jediný šev na síť | `app/src/lib/sit.ts` |
| testy | `app/testy/ukazka.test.ts`, 13 kontrol |

**Data se nevymýšlejí.** Snímek pořizuje skript z mocku
(`tools/fake-api.py`), tedy z týchž dat, na kterých se zkouší web. Ručně
psaný snímek by se tvarem rozešel se schématem a poznalo by se to, až by
v appce zůstalo prázdno. `ukazka.py --kontrola` řekne, jestli snímek
s mockem ještě sedí.

**Kdo je v ukázce u vesla, je rozhodnutí, ne data:** účet, který v mocku
někde velí (`Bearer milos`). Jinak by ukázka neukázala start ani cíl, tedy
to, kvůli čemu appka vznikla.

**Ukázka začíná pět minut před startem** (Filip, 7. 11. 2026: *„ukázka
simuluje 5 minut do startu a pak prostě různé stavy a užití"*). Bez toho
by prohlížející zapnul režim a našel klidnou obrazovku — to, kvůli čemu
appka vznikla, by si musel napřed sám rozjet dvěma klepnutími a pak pět
minut čekat. Takhle spadne rovnou doprostřed odpočtu. Rozjížďka se
**přidává**, odjeté zůstávají: ty jsou ty *různé stavy*, dokončená
s výsledky vedle čerstvé, která se teprve rozbíhá.

**Zápisy nemizí, mění snímek v paměti.** Ohlásit rozjížďku, spustit
proceduru, odložit, odvolat, odstartovat, ukončit — všechno funguje
a odpočet běží z hodin telefonu jako doopravdy. Kdyby se zápisy jen
spolkly, ukázka by po klepnutí neudělala nic a vypadala by rozbitě.
Každá nová ukázka začíná znovu; soubor se nemění.

**Jediný šev na síť, a hlídá ho test.** `fetch` byl na pěti místech ve
třech souborech; slib *„na server se nejde vůbec"* se s pěti místy udržet
nedá. Teď je v `lib/sit.ts` (a v přihlašování, které v ukázce neběží)
a test padne, jakmile se objeví jinde — vyzkoušeno sabotáží.

**Režim je vidět a nepamatuje se.** Nahoře svítí proužek
*UKÁZKA — NIC SE NEODESÍLÁ*, který přebíjí všechny stavy sledování; po
zabití appky je režim pryč. To je pojistka proti tomu nejhoršímu, co ta
věc umí — aby někdo u vody odstartoval rozjížďku v ukázce a čekal, že se
to stalo.

**Co v ukázce není:** klíč k lodi a registrace upozornění se tváří jako
nevydané (401), protože v ukázce nemá kdo mít loď. A cílová obrazovka
dostává zápis složený z veřejného detailu — čísla přihlášek jsou v něm
dopočítaná pořadím, ne skutečná.

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

Rozhodnuté 6.–7. 11. 2026: spojení patří do systémového proužku nahoře
(ne do pruhu stavu, který zůstává závodu), písmo na barevné ploše se
vybírá podle jejího jasu, a oprava terčů šla jedním commitem.

**Co návrh nedoporučuje stavět vůbec:** mapu trati pro posádku, tresty
posádky (není rozhodnuto, čí vidí), a odpočet v jakékoliv podobě.
