# Jachtař a ČSJ — kolo 1

Měřeno **čtením kódu**, ne na běžící tabuli: jde o to, co kód o závodě tvrdí,
a to se z obrazovky nepozná. Předpisy podle ZPJ 2025–2028 a Závodních signálů.

## Co je dobře

1. **Dojetá loď se v pořadí nehýbe** (`poradi-na-vode.ts:30`) — o místě
   rozhoduje dojezd, ne průmět na trať, jak to má definice *Dokončit*.
2. **Tlačenice na startu a v cíli se za dav nepočítá** (`rezie-tabule.ts:161`).
   Hájím to proti R1: na čáře stojí celé pole z definice a geometrie je
   **čára, ne kruh**. Start si zaslouží vlastní obraz, ne širší `DAV_M`.
3. **Hystereze davu** (`DAV_DRZI_M = 110`) odpovídá tomu, jak se loď u bóje
   doopravdy chová: najíždí, mine, na chvíli se vzdálí a je zpátky.
4. **Kód se počítá mezi vyřízené** (`semafor.tsx:50–52`) — loď s DNS nebo OCS
   nedojede nikdy; bez toho by tabule čekala na někoho, kdo nevyjel.
5. **Dojezdy ze zrušené rozjížďky se nehlásí** (`semafor.tsx:173–177`):
   rozjížďka pod vlajkou N nemá výsledek, oznamovat z ní pořadí je nepravda.

## Co je špatně

**1. Záběr zvaný „souboj" souboj neobsahuje.**
*Nález:* prohození se uzná teprve po `PRAH_PROHOZENI_S = 60` s v novém pořadí
**a** při odstupu `ODSTUP_PROHOZENI_M = 120` m (`mapa-trackeru.tsx:797`);
`FOCUS_SOUBOJE_S = 40` běží až od toho potvrzení (`rezie-tabule.ts:172`).
*Proč to vadí:* souboj je na vodě **blízkost** — krytí, kříž, obrat na hlavu,
luffování. Obě podmínky ale znamenají, že už je po něm: minutu drží a sto
dvacet metrů mezera, u lodí pod sedm metrů **sedmnáct délek trupu**. Tam se
dvojice neovlivňuje nijak a neplatí na ni žádné pravidlo části 2. Záběr ji
tedy ukazuje, když je **nejdál od sebe za celou epizodu**, a zapálí se 60 až
100 s po kříži, který nikdy neukáže. *Návrh:* rozdvojit to — *zpráva*
o prohození ať zůstane na dnešním prahu (tam oznamuje výsledek, správně), ale
*záběr* ať zapíná **blízkost**: dvojice sousedů v pořadí blíž než ~50 m je
souboj a jde na obraz hned, bez ohledu na to, jestli se nakonec předjely.

**2. Režie neví o třídách — a závod se v nich vyhodnocuje.**
*Nález:* `pozice` prohození je počet **všech** lodí před lepší z dvojice
(`mapa-trackeru.tsx:803–808`), `poradiVCase` řadí celé pole v jednom seznamu
(`rezie-tabule.ts:127`). Přitom `Lod.kategorie` je `Race | Nad7m | Pod7m`
(`plavba.ts:28`) a závod má `vyhodnoceni` `PoKategoriich` / `CelePole` / obojí
(`tabule.ts:242, :250`). *Proč to vadí:* na regatě vyhodnocované po
kategoriích **celkové pořadí není pořadí** — není v něm žádný výsledek.
`SOUBOJ_DO_POZICE = 3` pak měří ve stupnici, kterou ten závod nepoužívá: Race
lodě jsou rychlejší, takže první tři místa celkově bývají jejich a souboj
o **vedení ve třídě Pod7m** se neukáže nikdy, protože je celkově třináctý.
Tentýž tvar chyby jako špatná bodovací stupnice z konzilia 12. 11. 2026.
*Návrh:* při `vyhodnoceni === "PoKategoriich"` počítat `pozice` uvnitř
kategorie lodi a `SOUBOJ_DO_POZICE` uplatnit na každou třídu zvlášť.

**3. Dav u bóje ukazuje ty, kdo už odjeli — a dvojici v zóně neukáže vůbec.**
*Nález a:* špička se z davu bere podle pořadí na vodě (`rezie-tabule.ts:209`),
tedy ty **nejdál na trati** — u obratové značky lodě, které už oběhly
a odcházejí. Tlačenice je za nimi, ve frontě, která se teprve cpe dovnitř.
*Nález b:* `DAV_LODI = 3` s odůvodněním „dvě jsou souboj a ten má vlastní
pravidlo" (`:45`) je kruhové: souboj platí jen do třetí pozice a jen po
potvrzeném prohození (nález 1). Dvě lodě překryté u bóje na osmém a devátém
místě tak nedostanou záběr žádný — a je to **nejčastější situace, ze které se
na vodě protestuje**: ZPJ 18, místo u značky, vnitřní loď na něj má právo.
*Proč to vadí:* tabule pojmenuje jako „u bóje" něco jiného, než co je u bóje
zajímavé, a dvojici, o které se dá něco říct pravidlem, přeskočí. *Návrh:*
špičku brát **nejpozdější na trati z davu** (ti, kdo najíždějí); a u obratové
značky uznat dav i při **dvou** lodích uvnitř ~30 m — to je zóna, kde ZPJ 18
doopravdy platí.

**4. Vlajky signalizují, co nikdo nesignalizoval.**
*Nález:* `vlajka.tsx:45–50` dává stavu `dojeto` vlajku **S**, což v Závodních
signálech znamená **zkrácená dráha** a nic jiného; vlajka pro „dojeto"
neexistuje. Stavu `ceka` dává **P** (`:38–43`), což je *přípravný* signál
a vlaje přesně od −4:00 do −1:00 (ZPJ 26) — ne hodinu před startem a ne
v poslední minutě. *Proč to vadí:* jachtař v hospodě přečte S jako „zkrátili
dráhu" a bude hledat, kde; je to falešné tvrzení o závodě, ne volba ikony.
*Návrh:* `dojeto` → **modrá vlajka B** (loď závodní komise na stanovišti
v cíli), nebo žádná; `ceka` → vlajku řídit odpočtem, který semafor beztak
počítá (`semafor.tsx:57`): nad −5:00 nic, −5:00 třídová, −4:00 P, −1:00 dolů.
A **„zrušena" u vlajky N přeslibuje**: N je *přerušení* a přerušená rozjížďka
se může přeplout, zrušená ne — věcný rozdíl, ne formulace (slovo → 8-jazyk).

**5. Obratové značky se hádají z indexu, ne z typu.**
*Nález:* `obratove = sort(poradi).slice(1, -1)` (`rezie-tabule.ts:161–163`)
předpokládá, že první prvek je start a poslední cíl; `Znacka` přitom **typ
nese** (`plavba.ts:51`) a režie se na něj neptá. *Proč to vadí:* trať, která
**cílí na startovní čáře** (na Orlíku běžné u krátkých kruhů), má start i cíl
jako jeden prvek — `slice(1,-1)` pak zahodí skutečnou obratovou bóji a tabule
u ní nenajde dav, ani když je tam půl pole; trať s vrátky to rozhodí stejně.
*Návrh:* vybírat podle `typ` (bóje a obraty ano, čáry ne), ne podle indexu.

**6. „Šedesát metrů je zóna" — není.**
*Nález:* `rezie-tabule.ts:44–45`: *„Šedesát metrů je zóna, uvnitř které už se
na sebe berou ohledy."* *Proč to vadí:* **zóna** je v ZPJ oblast do **tří
délek trupu** lodi bližší ke značce — u pole děleného na `Pod7m` a `Nad7m` je
to 21 až ~30 m, třetina až polovina šesti desítek. A „ohledy" neplatí ani
v zóně plošně: ZPJ 18.1(a) říká, že pravidlo 18 **neplatí mezi loděmi na
protilehlých halzách na stoupačce** — tedy právě u návětrné bóje, kde je
tlačenice největší; tam rozhoduje 10, 13 a 18.3. Věta, která z konstanty dělá
předpis, je nepravdivá a poroste z ní špatné rozhodnutí při každém ladění.
*Návrh:* číslo nechat, odůvodnění přepsat na *rádius záběru, uvnitř kterého se
trasy kříží; zóna podle ZPJ je 3 délky trupu a je menší*.

**7. Dav se smí postavit z pěti minut starých poloh.**
*Nález:* `polohaV` (`rezie-tabule.ts:145–154`) vrátí poslední bod ≤ t bez
testu na stáří; `NEDOSTUPNA_PO_S = 300` se uplatní jen při řazení pole
(`:139`), na vznik davu ne. *Proč to vadí:* pět minut je pod plachtami při
čtyřech uzlech ~600 m. Tabule může oznámit tlačenici u tří lodí, které tam
byly a dávno nejsou — a podle otevřeného nálezu 14 v `TABULE-DIVAK.md` to
divák nepozná, protože stáří se počítá proti nejčerstvějšímu bodu pole, ne
proti hodinám. (**Není** to podezření, které měření 28. 10. 2026 nepotvrdilo —
to bylo o přebarvování textu v ranku, ne o tvorbě davů.) *Návrh:* do davu brát
jen polohy ne starší než jeden odesílací cyklus (~30 s); je-li jich méně než
`DAV_LODI`, dav nevznikne.

**8. „Jakou trasu volili" není nikde.**
*Nález:* zadání u davu má dvě poloviny (`rezie-tabule.ts:40–41`) — *„jak jsou
tady před bójkou"* hotovo, *„a jakou trasu volili"* nikde; kolotoč páruje
sousedy v pořadí (`:229`) a pořadí je průmět na trať. *Proč to vadí:* dvě lodě
se stejným průmětem na stoupačce bývají na **opačných stranách trati**, pár
set metrů od sebe, a nezávodí spolu nijak. Rozdělení pole — kdo šel napravo,
kdo nalevo a komu to vyšlo — je přitom na stoupačce to nejjachtařštější, co se
dá o závodě říct. (Že je to pro diváka čitelné, je můj **dojem**; že se to na
vodě řeší jako první, dojem není.) *Návrh:* čtvrtý `duvod` `rozdeleni` — je-li
pole rozložené kolmo na osu trati víc než podélně, ukázat obě křídla naráz.

## Co bych potřeboval vědět

- **Filip:** jedou se regaty vyhodnocované `PoKategoriich` doopravdy, nebo je
  to zatím jen možnost v API? Od toho visí tíha nálezu 2. A je někde v datech
  **délka trupu**, nebo jen kategorie? Bez ní se zóna podle ZPJ nespočítá.
- **Filip / data (rámec 4):** `Snimek` nezná **startovní signály** — X, první
  zástupce (obecné odvolání), AP, I/Z/U/černá podle ZPJ 30. Bez nich může start
  mít odpočet a vlajku, ale **odvolaný start neukáže**, a to je na startu ta
  nejlepší televize. Je to návrh na nová data, ne na režii.
- **1-rezie:** souhlasíš, aby souboj zapínala blízkost (nález 1)? Tobě to
  zvedne podíl času na souboji nad dnešních 43 %, mně to spraví věcnost.
- **4-insider:** říká se u vás „zrušená" i přerušené rozjížďce, nebo se to
  v seriálu rozlišuje? Chci vědět, jestli je nález 4 jen o kódu.

## Čeho se nedotýkám

Rytmu a délek záběrů (1-rezie), oblouku dne (2-dramatik), čitelnosti bez
znalosti pravidel (3-fanoušek), toho, co je zpráva (4-insider), kontrastu
(6-design), přechodů a animace vlajky (7-efekty), formulací (8-jazyk) — u
vlajek a u slova „zrušena" dodávám jen to, co ten signál na vodě znamená.
