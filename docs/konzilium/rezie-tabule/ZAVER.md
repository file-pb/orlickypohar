# Režie tabule — závěr konzilia

**Na čem tenhle závěr stojí a na čem ne.** Nese osm posudků kola 1, posudek
kola 2 od fanouška, pět Filipových odpovědí a tři věci, které moderátor
změřil proti kódu. **Kolo 2 u zbylých sedmi oborů a kolo 3 neproběhlo** —
Filip rozhodl 22. 11. 2026 dojet to moderátorsky. To má dvě následky, které
patří nahoru, ne do poznámky:

1. **Tři ze čtyř sporů, kde se obory v kole 1 rozešly, rozsekl moderátor** —
   ne obor, který v nich má řemeslo. Kde to platí, je to u rozhodnutí
   napsané.
2. **Devět otázek z „co bych potřeboval vědět" zůstalo bez odpovědi**, protože
   je neměl kdo zodpovědět. Nejsou pod stolem, jsou v oddílu *Na čem to stojí*.

Co drží plnou váhu: nálezy, které obor podložil souborem a řádkem a žádný jiný
obor je nerozporoval. Těch je většina a jsou to vady, ne vylepšení.

Rámcová pravidla zadání platí nezměněně, zvlášť tahle tři: **zvuk a komentář
se nedělají**, **tabuli nikdo neobsluhuje**, a **měří se na televizi** — 55"
ze 4–6 metrů, jak Filip potvrdil.

---

## Jedna věc je důležitější než všechno ostatní

**Tabule nepozná, že se právě jede.**

Volba podoby (`obrazovka.tsx:303–311`) se na stav rozjížďky `Probiha` neptá
ani jednou. První podmínka je `zive.length > 0`, tedy *hlásí telefony* —
a průběžné odesílání poloh zatím vůbec není. Takže: po celý den jedné regaty
visí na televizi tabulka s nadpisem **„Průběžné pořadí"** a čísly z rozjížďky,
která skončila, zatímco se jede další. Podoba `mapa` v ročníku 2026 nenastala
ani jednou.

Tři obory na to přišly nezávisle třemi cestami: dramatik (D2) oblouk dne,
režisér (Š5) mechanismus příznaku, fanoušek jako důsledek — *„tabulka pořadí
je celá tabule"*. Všechno ostatní v tomhle dokumentu je o obrazovce, na kterou
se dá koukat. Tahle jedna věc je o tom, že obrazovka tvrdí nepravdu o dnešku
po celý den.

---

## Rozhodnutí v devíti sporech

### S1. Podobu volí stav rozjížďky, ne příznak vysílání

**Rozhodnuto pro dramatika (D2).** Jeden výraz na `obrazovka.tsx:303` dostane
`Probiha` a podobu „jede se"; polohy jsou její **náplň**, ne spoušť:

- polohy jsou → mapa, jak dnes
- polohy nejsou → pořadí předchozí rozjížďky, ale **s titulkem o té běžící**,
  ne pod nadpisem „Průběžné pořadí"

**Hystereze zůstává** — Filip ji 22. 11. schválil s odůvodněním, které platí:
jednosměrný tok informací zpoždění snese. Ale sama neopravuje nic. Minimální
doba podoby nad špatným vstupem jen podrží špatnou podobu o pár sekund déle,
takže `PODOBA_DRZI_S` se zavádí **až po** změně vstupu, ne místo ní.

### S2. Souboj dostane všech pět vrstev — nejsou výlučné

Pět návrhů mířilo na pět různých vrstev, takže se skládají. Rozdělení:

| vrstva | kdo | co |
|---|---|---|
| **spoušť záběru** | `5-jachting` (1) | blízkost ~50 m mezi sousedy v pořadí, ne potvrzené prohození po 60 s a 120 m |
| **značka na mapě** | `7-efekty` (E3) | pás vlevo nahoře, wipe 300 ms, drží celých 40 s; mrtvé CSS `:5288` na to v repozitáři je |
| **barva** | `6-design` (D4) | `--pozor` `#e8a33d`, ne zeleň shodná s „dokončeno" |
| **karta** | `2-dramatik` (D4) | jen změna v čele (`pozice === 1`), nejvýš jednou za dvě minuty |
| **slovo** | `8-jazyk` (3) | nadpisek „Souboj", jméno lodi v prvním pádě |

Jachtařova spoušť je věcná oprava, ne vkus: 120 m je u lodí pod sedm metrů
**sedmnáct délek trupu** — tam na dvojici neplatí žádné pravidlo části 2
a záběr ji ukazuje ve chvíli, kdy je nejdál od sebe za celou epizodu.

**Co rozhodnutí otevírá:** blízkostí poroste podíl času na souboji nad
dnešních 43 %. Strop se musí zapsat jako konstanta, ne nechat vyplynout —
kolotoč potřebuje dolní mez, aby se někdy dostalo i na lodě mimo čelo.
Konkrétní číslo tenhle závěr nemá; chce měření na vodě, ne úvahu.

### S3. Režie se musí naučit třídy — je to většina ročníku

**Rozhodnuto pro jachtaře (2).** Změřeno: **osm z devíti zastávek 2027** má
`vyhodnoceni = PoKategoriich`. Dnes je `pozice` prohození počet **všech** lodí
před dvojicí (`mapa-trackeru.tsx:803–808`) a `poradiVCase` řadí celé pole
v jednom seznamu (`rezie-tabule.ts:127`), takže `SOUBOJ_DO_POZICE = 3` měří ve
stupnici, kterou ten závod nepoužívá. Race lodě jsou rychlejší, obsadí první
tři místa celkově, a **souboj o vedení v Pod7m se neukáže nikdy** — je celkově
třináctý.

Při `PoKategoriich` se `pozice` počítá uvnitř kategorie a `SOUBOJ_DO_POZICE`
platí na každou třídu zvlášť. Je to vada, ne vylepšení.

K tomu druhá polovina, kterou našel fanoušek (6) a potvrdil v kole 2: laik
nepozná, že jsou to tři oddělené závody se třemi vítězi. Lék nejsou
vysvětlivky, které se nečtou, ale **tři totožné pečeti u tří vedoucích** —
stejné odznaky řeknou „tři vítězové" dřív než jakýkoli nadpis. Plus hlavička
v množném čísle: dnes nad třemi sloupci stojí `Konečné pořadí`
(`vysledky.tsx:114`), jednotné číslo tvrdící, že pořadí je jedno.

### S4. Start jako pátá podoba — ve dvou krocích, a druhý je žádost o data

Shoda všech, že pátá podoba má být. Režisér našel nejlepší argument:
`PROCEDURA_S = 300` je **jediné okno celého dne, jehož délku tabule zná
dopředu** (`rozjizdky-tabule.ts:54`) — a je jediné, které se nenaplánovalo
vůbec. Dnes drží těch pět minut celou obrazovku `listina`, tabulka
přihlášených, která se po celých 300 s nezmění, a odpočet k tomu běží jako
panýlek v rohu.

**Krok 1, bez nových dat:** podoba volená ze stavu rozjížděk, ne ze `zive`;
odpočet dostane obrazovku. Tři podmínky, bez kterých se nesmí zapojit:

- **vlajky dnes lžou** (`5-jachting` 4). `vlajka.tsx:45–50` dává stavu
  `dojeto` vlajku **S**, což v Závodních signálech znamená *zkrácená dráha*
  a nic jiného; `ceka` dostane **P**, přípravný signál platný jen od −4:00 do
  −1:00 (ZPJ 26). Oprava: vlajku řídit odpočtem, který semafor beztak počítá
  (`semafor.tsx:57`) — nad −5:00 nic, −5:00 třídová, −4:00 P, −1:00 dolů;
  `dojeto` → modrá **B**, nebo žádná. A **N u slova „zrušena" přeslibuje**:
  N je *přerušení* a přerušená rozjížďka se může přeplout.
- **semafor není připravený** (`6-design` D5): čtyři různé zelené, paleta
  natvrdo mimo tokeny, panel `var(--panel, #1a1a1a)` zmizí ve světlém režimu.
  Přepsat na tokeny **před** zapojením, ne po něm.
- **jméno podoby** (`8-jazyk` 2): sada `listina | mapa | mezi | po` míchá
  podstatná jména s předložkami, takže na pátou podobu není z čeho odvodit
  jméno. Přerovnat na `listina | mapa | pauza | konec` plus `start`. `konec`
  není nový nápad — kód ten stav už tak jmenuje (`konec={rezim === "po"}`).

**Krok 2 je žádost o data:** `Snimek` nezná startovní signály — X, první
zástupce, AP, I/Z/U/černá podle ZPJ 30. Bez nich podoba **odvolaný start
neukáže**, a to je na startu ta nejlepší televize. Dokud data nejsou, je
`start` podoba o čekání, ne o startu. Říká se to narovinu, protože po zapojení
semaforu to bude vypadat hotově.

### S5. Clona jen pro výstrahu, tři dojezdy vedle sebe, zbytek „venku"

**Rozhodnuto, bez sporu — tři obory a fanoušek shodně.** Dnes je
`.tabule-clona` `inset: 0` nad celou tabulí (`globals.css:3806–3811`),
renderuje se **ke každé kartě** (`obrazovka.tsx:808`) a `ALERT_MS` = délka
animace, takže mezi kartami fronty není mezera: **dvanáct dojezdů je 54 s, kdy
celá plocha pulzuje pod `rgb(0 0 0 / 0.55)`** v taktu 4,5 s — zrovna v minutě,
kdy je mapa nejdůležitější. Fanoušek to v kole 2 postavil nad svůj vlastní
nález: *„zrovna v té minutě chci vidět, kdo vyhrává, a dívám se přes šedou."*

- clona se renderuje jen pro `druh === "vystraha"`; ostatní karty mají vlastní
  pozadí i `backdrop-filter`
- výstraha a zpráva z vývěsky se vkládají na **začátek** fronty
- **nejvýš tři dojezdy vedle sebe**, zbytek nahradí už existující druh `venku`

Tím je odpovězena i designova otázka „kolik karet za rozjížďku připustíš":
tři.

### S6. Pohár z obrazovky mizí třemi způsoby a všechny tři se opravují naráz

Insider našel tři nezávislé cesty, jak celoroční údaj z tabule zmizí nebo
zlhaví, a jedna je podmínkou ostatních.

1. **Zamrzne v okamžiku otevření stránky.** `poradiSerie` se čte jednou na
   serveru (`tabule/page.tsx:51`) a jde dolů jako prop (`obrazovka.tsx:75`);
   obnovovací smyčka nese jen `Snimek`. Tabuli nikdo neobsluhuje a dnešní
   zastávku pouští ven rozhodčí ještě na místě — od té chvíle visí na televizi
   pohár **před dnešní zastávkou** pod nadpisem „průběžné pořadí série".
   ⇒ `/tabule/data` vydává vedle snímku i pořadí série. **Tohle je první
   a bez něj nemá zbytek smysl.** Fanoušek dodává výhradu, která platí do té
   doby: kdyby tam viselo staré pořadí, nepozná to — tedy datum nebo slovo
   *před* k tomu údaji, dokud se neobnovuje.
2. **Zmizí přesně v hodinách, kdy se jede** (`obrazovka.tsx:743–744`): pásy
   dole vezou pořadí série jen když `zive.length === 0`. Filipova odpověď 3
   dává směr — střídat v pásech. ⇒ každý **třetí** průjezd pásu jedné třídy
   pustí pořadí série, s nadpisem u sebe. To číslo je úvaha, ne měření.
3. **Dnešní dojezd se nikde nepřeloží do roku.** Hraje se přes devět zastávek
   se **dvěma škrty** (`Serie.PocetSkrtu` = 2) a do série jde pořadí
   v kategorii minus jedna, ne body závodu — takže dnešní čtvrté místo je pro
   jednu loď bezcenné a pro druhou rozhodující. To je věta, kterou u stolu
   řekne znalec seriálu, a tabule ji neumí ani po dojetí regaty, kdy má na
   obrazovce místo. ⇒ panel v podobě `konec`: *co se dnes změnilo v poháru*
   (dramatik D1 našel totéž z druhé strany — `mezi` a `po` jsou dnes tatáž
   větev lišící se jedním slovem).

Bod 3 potřebuje **pořadí série před dnešní zastávkou**, které `Snimek` nemá.
Je to jedna otázka na API, ne tři: vydat obojí.

### S7. „Kdo vede" — nejdřív přestat rolovat, potom pečeť

Filip slovo povolil a přidal objednávku: pečeti u vedoucího a u prvních tří.
Spor tu nebyl, pořadí kroků ale ano, a fanoušek ho v kole 2 postavil správně:

1. **Vedoucí trojice se připíchne nahoru.** Rank se sám roluje po
   `TOCENI_MS = 18 s` (`mapa-trackeru.tsx:53`) a dvaadvacet lodí se do sloupce
   nevejde, takže první dvě místa pravidelně zmizí. **Pečeť na řádku, který
   není na obrazovce, je pečeť pro nikoho.**
2. **Pak odznak.** Nese **tvar a číslici** (1 / 2 / 3), nic, co se musí číst —
   ze čtyř metrů projde text zhruba od 27 px. Slovo stojí **vedle pečeti, ne
   na ní**: `vede` během regaty, `vítěz` po potvrzení, u druhého a třetího nic.
   Žádná třída ani body na odznaku. **Tři pečeti napříč třídami musí být
   totožné**, jinak si z nich divák udělá žebříček napříč závody.
3. **Váha řádku zvlášť** (`6-design` D2): v celém oddílu `.tabule`
   (`globals.css:3638–6320`) není **ani jeden** selektor na první místo
   (přeměřeno: `:first-child` se tam vyskytne čtyřikrát, ale vždy jako
   `:not(:first-child)` u buněk trackeru, `:4741–4746`), a číslo
   pozice je přitom nejtlumenější prvek řádku (`--tlumeny` 7,03 : 1 proti
   14,99 : 1 jména vedle něj). Jméno v `--text` váhou 700 a o 0,3 `--tv` větší,
   číslo pozice z `--tlumeny` na `--text`. Žádná nová barva.
4. **Pečeť nespraví body** (fanoušek 2, drží a nikdo nerozporoval): na řádku
   stojí `1.` a `8` a laikovi si odporují, protože ve fotbale i hokeji vyhrává
   vyšší číslo. Nad sloupec drobný nadpis **`body — nejmíň vyhrává`**, u každé
   třídy, a tatáž přípona `b` jako v pásu dole.

### S8. `ZAPIS` zůstává, `JAK_JISTE` se ruší

**Rozhodnuto jednomyslně — jazyk, fanoušek i insider.** Tím se **obrací nález
12 v `TABULE-DIVAK.md`**, který `ZAPIS` vedl jako kód bez majitele: smazat se
má ten druhý.

Divák dnes vidí `JAK_JISTE` (`tabule/vysledky.tsx:18–24`) — kopii štítků **pro
správce**: *zapisuje se / zapsáno / potvrzeno / v revizi / eliminováno*.
Tři důvody, každý sám dostatečný:

- *zapisuje se* a *zapsáno* se přes místnost liší dvěma znaky a divácky
  znamenají skoro opak
- *v revizi* si laik přeloží jako kontrolu účetnictví, *eliminováno* nijak
- **`eliminováno` jde proti Filipovu vlastnímu rozhodnutí** ze 16. 10. 2026,
  zapsanému v `lib/vysledky.ts:102–106`: *„Zrušená, ne «eliminovaná» — pod tím
  slovem se na vodě rozhoduje"*

`ZAPIS` (`obrazovka.tsx:845`) má *čerstvé z vody / u rozhodčího / potvrzeno /
přepisuje se* — čtyři různé věci, žádná úřední, všechny středního rodu, takže
se shodnou s *pořadí* v nadpisu dvě řádky výš. A *čerstvé z vody* jediné řekne
i **proč** se to ještě může změnit.

**Druhá polovina, která se zapomene:** karta `venku`
(`tabule-udalosti.ts:229`) říká *„3. rozjížďka je venku · 5 lodí v cíli"*
a o podepsanosti ani slovo, přitom `r.stavVysledku` je přímo v ruce. To je
rámcové pravidlo 5 — nepodepsané číslo nesmí vypadat finálně.

Otevřené v provedení: fanoušek namítá, že *u rozhodčího* nenapoví, jestli to
rozhodčí ještě může změnit. Slovo vybírá názvosloví.

### S9. Pauza může být dvě hodiny — smyčka 105 s na ni nestačí

Filipova odpověď 4: u okruhové 15–30 minut, u Izolepy a Fcanceru se čeká na
dojezdy z dálky **hodinu a půl**. Smyčka 75 s seznam + 30 s záznam se tedy
nezopakuje sedmnáctkrát, ale **až sedmdesátkrát** — a začíná vždy 75 s
statické tabulky (`useState(false)`, `obrazovka.tsx:379`).

Rozhodnuto:

1. **První přehrání záznamu hned při přechodu do `Dokoncena`**, jednou a celé
   (dramatik D3). Dnes přijde až po 75 s pořadí, tedy ve chvíli, kdy divák zná
   výsledek a záznam nemá co stavět. Minuta po dojetí je přitom nejhorší
   v celém dni a záznam je jediné, co v ní lze poctivě ukázat: rozjížďka je
   `Dokoncena`, `stavVysledku` teprve `Navrzeno`.
2. **Kadence pak ubývá**, ne se drží. Po třech opakováních přejít na podobu
   `pauza`, která drží dvě věci:
   - **kdy se zase pojede, jako největší věc na obrazovce.** Fanoušek na S9
     odpověděl, že by v patnácté minutě nekoukal — a že to není vada: pauza
     není chvíle, kdy se hospoda dívá na televizi. Vada je, že smyčka
     neodpoví na jedinou otázku, kterou v pauze má. Tabule to umí
     (`casomira`, `rozjizdky-tabule.ts:166`), dnes to vyjde jako panýlek
     v rohu mapy.
   - **pohár.** Insider (4) a fanoušek shodně: pauza je jediná část dne, kdy
     má divák kapacitu dozvědět se, o co se hraje.

---

## Co se dělá bez sporu

Nálezy podložené souborem a řádkem, které žádný obor nerozporoval. Řazeno
podle toho, co stojí nejméně a opravuje nejvíc.

**Obrazovka dnes může být prázdná.** `.tabule` nikde nevynucuje tmavý vzhled;
bez cookie rozhoduje `prefers-color-scheme` (`app/layout.tsx:134`), a karta má
pozadí natvrdo `#14171a` (`globals.css:3824`), text z tokenu. Ve světlém
režimu je `.tabule-alert.zprava` **1,06 : 1**, semafor **1,03 : 1**. Android TV
i Windows startují ve světlém a **podle rámce 2 to nikdo nepřepne**.
⇒ `.tabule { color-scheme: dark }` a předefinovat `--pozadi/--text/--tlumeny/
--linka/--voda/--stav-*` natvrdo na tmavé. Jedna deklarace místo čtyř záplat.

**Zrušená regata hlásí, že se čeká na rozpravu.** Změřeno na mocku:
`radavska-regata` má `stav: Zruseny` a nula rozjížděk, tabule ukázala *„Čeká se
na rozpravu"*, protože `stavDne` (`lib/rozjizdky-tabule.ts:111–141`) větev pro
zrušenou regatu nemá a spadne na poslední možnost v řadě. Divák sedí pod
obrazovkou a čeká na závod, který se nejede. ⇒ větev nahoru.

**„1 lodě".** `lodi()` (`tabule-udalosti.ts:72`) vrací `kolik < 5 ? "lodě" :
"lodí"`, takže pro 1 a 0 dá *„1 lodě"* a *„0 lodě"*; dnes to drží jen podmínka
`zDavky >= 2` o sto padesát řádků níž. Komentář nad funkcí navíc slibuje
číslovku slovem, kterou kód nikdy nevydá — a zadání kola 1 ten komentář
odcitovalo jako fakt. Čtvrté znění téhož faktu je *„a další 3"*
(`vysledky.tsx:169`). ⇒ jedna exportovaná `pocet(kolik, ["loď","lodě","lodí"])`
v `lib/tabule.ts`, vždy číslicí, a **všechna čtyři** místa na ni.

**Pět druhů karet pořád létá a škáluje proti vlastnímu pravidlu.**
`globals.css:3929–3962` přepisuje `animation-name` pro osm druhů na keyframy
se `scale(0.6)` → `1.04` → `scale(0.2)` a odletem na `translate(32vw, -12vh)`.
Tři následky: ruší se důvod, pro který se základní animace přepsala na
prolnutí (televize dopočítávají mezisnímky a škálující se cedule se rozdvojí);
**`prefers-reduced-motion` je neúčinné**, protože `.tabule-alert.start` má
specificitu 0,2,0 proti 0,1,0 uvnitř media query; a cíl odletu je ve `vw`, tedy
na ultrawide se karta usadí mimo svůj chlíveček. ⇒ přepisy smazat, usazení
vyjádřit posunem o `calc(1.5 * var(--tv))` v posledních 12 % animace.

**Dohasínání záběru dělá dvakrát přesně to, čemu mělo zabránit.** `silaZaberu`
(`mapa-trackeru.tsx:1107–1112`) bere zbytek záběru jako `delka - (cas % delka)`,
ale souboj začíná v čase prohození — číslo z dat, ne násobek čtyřiceti — takže
stopa zhasne uprostřed záběru a na samotném střihu svítí na 0,95. Našli to
nezávisle režisér (Š3) a efekty (E6). ⇒ `planRezie` dopíše do `Zaber` `od`
a `do` (má je při sestavování v ruce), `silaZaberu` čte `do - cas`, stopa
dostane `transition: opacity 400ms linear`. Žádná nová konstanta.

**Obratové značky se hádají z indexu, ne z typu.** `obratove =
sort(poradi).slice(1, -1)` (`rezie-tabule.ts:161–163`) předpokládá, že první
prvek je start a poslední cíl; `Znacka` přitom **typ nese** (`plavba.ts:51`).
Trať, která cílí na startovní čáře — na Orlíku u krátkých kruhů běžné — má
start i cíl jako jeden prvek, takže `slice(1,-1)` zahodí skutečnou obratovou
bóji a tabule u ní nenajde dav, ani když je tam půl pole. ⇒ vybírat podle
`typ`. **Pozor na regresi:** změní to dav i tam, kde dnes funguje.

**Dav se smí postavit z pěti minut starých poloh.** `polohaV`
(`rezie-tabule.ts:145–154`) vrátí poslední bod ≤ t bez testu na stáří;
`NEDOSTUPNA_PO_S = 300` se uplatní jen při řazení pole. Pět minut je pod
plachtami při čtyřech uzlech ~600 m, takže tabule může oznámit tlačenici u tří
lodí, které tam dávno nejsou. ⇒ do davu brát polohy ne starší než jeden
odesílací cyklus (~30 s); je-li jich méně než `DAV_LODI`, dav nevznikne.

**Věta, která z konstanty dělá předpis.** `rezie-tabule.ts:44–45` píše
*„Šedesát metrů je zóna, uvnitř které už se na sebe berou ohledy."* **Zóna** je
v ZPJ oblast do **tří délek trupu** — u pole děleného na `Pod7m` a `Nad7m` 21
až ~30 m, tedy třetina až polovina. A ohledy neplatí ani v zóně plošně:
ZPJ 18.1(a) vyjímá lodě na protilehlých halzách na stoupačce, tedy právě
u návětrné bóje. ⇒ číslo nechat, odůvodnění přepsat na *rádius záběru, uvnitř
kterého se trasy kříží; zóna podle ZPJ je 3 délky trupu a je menší*. Nulová
cena, a bez toho poroste z té věty špatné rozhodnutí při každém ladění.

**Dav u bóje ukazuje ty, kdo už odjeli.** Špička se bere podle pořadí na vodě
(`rezie-tabule.ts:209`), tedy nejdál na trati — u obratové značky lodě, které
už oběhly. Tlačenice je za nimi, ve frontě, která se teprve cpe dovnitř. A
`DAV_LODI = 3` s odůvodněním „dvě jsou souboj" je kruhové, protože souboj
platí jen do třetí pozice: **dvě lodě překryté u bóje na osmém a devátém místě
nedostanou záběr žádný** — a je to nejčastější situace, ze které se na vodě
protestuje (ZPJ 18, místo u značky). ⇒ špičku brát z davu **nejpozdější na
trati**; u obratové značky uznat dav i při dvou lodích uvnitř ~30 m.

**Nejmenší text má 12,48 px a uhýbá.** Podlaha je `.pas-stitek` = 0,65 × `--tv`
(`globals.css:5409`) a **27 z 61 deklarací `font-size` v `.tabule` (44 %) je
pod 1 × `--tv`**. Na 55" ze 4–6 m je **jméno lodi v pásu tříd (17,28 px) pod
hranicí rozlišitelnosti**, a pás se k tomu vodorovně posouvá. Pořadí po
třídách je přitom to, podle čeho se boduje. ⇒ podlaha **1,0 × `--tv`
(19,2 px) pro všechno, co nese slovo**; pod ni jen tvary bez textu. Tři údaje
na lodi se do pásu nevejdou — **škrtnout stáří polohy**, nechat číslo a jméno.
Fanouškova podmínka: *zmizet*, ne zmenšit — menší nečitelné číslo je pořád
číslo, na které bude zaostřovat. V ranku (26,88 px) naopak zůstává a jen se
přejmenuje, viz níž.

**„před 12 s" se čte jako ztráta na vedoucího.** V ranku stojí za jménem
`před 12 s` / `před 3 min` (`mapa-trackeru.tsx:1924–1931`) a je to stáří polohy
z telefonu. Čas ve vteřinách vedle pořadí znamená v cyklistice i ve formuli
ztrátu na vedoucího. ⇒ předřadit slovo o signálu, ne o závodě: `signál 12 s`,
`nehlásí`. Znění vybírá názvosloví; `signál` je nástřel.

**Tři barvy nesou dvaadvacet významů.** `--stav-vypsany` devět, `--stav-zruseny`
osm, `--voda` pět. Dvě kolize bolí nejvíc: **souboj** nosí tutéž zeleň jako
„dokončeno", a **značka dema** tutéž červeň jako bouřková výstraha. ⇒ jeden
token = jedna věta (zelená „jede", modrá „dokončeno", červená „stop /
výstraha"), souboj na `--pozor`, značku dema a zastaralost dat odbarvit na
`--tlumeny` a odlišit **rastrem** (`--srafa` existuje). **Musí jít spolu
s `--linka-tv`**, jinak se demo odbarví a z pěti metrů zmizí úplně: 1 px na
55" je 0,63 mm, tedy 0,43′ — pod rozlišovací hranicí, a rámec 7 žádá, aby bylo
demo vidět po celou dobu. ⇒ token `--linka-tv: max(2px, calc(0.1 * var(--tv)))`
všude, kde linka nese význam.

**Žádný title-safe okraj.** `.tabule` má padding 2,7 % výšky a **2,0 % šířky**
(`globals.css:3658`); broadcast title-safe je 5 %, action-safe 3,5 %. Televize
bez vypnutého overscanu ořezává 2–5 %, takže ořez padne přesně do krajních
znaků — nejdřív na pravé straně žebříčku, kde stojí body a čas. ⇒ vodorovně
`5 × --tv`, svisle `3 × --tv`. **Cena je reálná:** sloupec pořadí se zúží, nebo
mapa přijde o ~115 px. To je ta položka, kterou někdo později vrátí, až se mu
tabulka nevejde.

**Na tabuli není ani jedna `transition`.** Přeměřeno: po řádku 3600
v `globals.css` **nula** výskytů `transition` proti **29** s `animation`.
Rejstřík je tedy jen dvojí: tvrdý skok, nebo
keyframe při připojení — a všechno, co se mění *na místě* (podbarvení řádku,
síla stopy, výřez, stáří dat), skáče. **Televizní dojem dělá právě ten
prostřední rejstřík.** ⇒ `.tabule [data-prechod] { transition: opacity 300ms
ease, background-color 300ms ease }` na záběr, stopy a lepík. Jde na
kompozitor, takže nestojí překreslení. **Nejlepší poměr efektu k ceně v celém
dokumentu.**

**Nadpisky a slova.** Pět nadpisků z dvanácti opakuje slovo z vlastní karty
(`dokonceno` „Rozjížďka" nad „4. rozjížďka dojeta" a tak dál), takže karta
nese jednu informaci místo dvou — a nadpisek je verzálkami, čte se první.
⇒ pravidlo *nadpisek nesmí obsahovat slovo z titulku ani z detailu téže
karty*; `ceka` → „Zdržení", `dokonceno` → „Dojeto", u `zavod` vyměnit řádky,
protože jméno regaty je to větší a patří nahoru. A **„v cíli" říká na jedné
obrazovce tři věci** — nadpisek karty, přelétavý lepík a trvalý štítek v pořadí
— ze kterých dvě jsou zpráva a jedna stav: karta **„Cíl"**, lepík **„právě
dojela"**, štítek zůstává **„v cíli"**.

**Ostatní, levné a nesporné:** `vw` u semaforu a teček karuselu na `--tv`
(na 3440 × 820 je dnes světlo elipsa 72 × 31 px); Inter 400/700 dovézt pro
celé `.tabule`, protože `system-ui` je na každém boxu jiné písmo a jména lodí
mají `ellipsis` — tatáž tabule na jednom boxu jméno doveze a na druhém ho tiše
zkrátí; při víc než třech inverzích v žebříčku pustit výměny souběžně (dnes
`TAKT_MS` 1 900 ms po jedné, dvanáct inverzí = 22,8 s, mezitím dorazí další
data); kód `DNF` na kartě přeložit slovem, ale **až po odpovědi jachtaře**,
jestli kód u dojezdu neukáže trest dřív, než doběhne lhůta na protest.

**Režie řekne „dívej se na souboj", rám k tomu ukazuje celé pole.** Časovač
výřezu mapy (`mapa-trackeru.tsx:1034–1042`, 18 / 12 s) se o `zabery` nezajímá;
jediná výjimka je dav u bóje (`:1061`) a i ta platí jen 12 s z 30. S karuselem
tříd (`PANEL_MS` 9 s) a předmětem záběru (40 / 60 s) z toho vychází **jedna
viditelná změna každých ~5 s**, a protože nsn(36, 30, 40) = 360 s, žádné dvě na
sebe za šest minut nesednou. ⇒ `zabery.duvod` rozhoduje o výřezu a `useEffect`
na `:1034` dostane do závislostí identitu záběru. Ze dvou pultů je pak jeden.

**Zrychlená přehrávka vybere za půl minuty třicet položek plánu.**
`krok = (konec * 1000) / prehravkaMs` (`mapa-trackeru.tsx:997`), tik po vteřině,
`PREHRAVKA_MS` 30 000: hodinová rozjížďka jde po **120 s závodního času na tik**,
plán má rozlišení 10 s a čte se `rezie.get(floor(cas/10)*10)` (`:1095`), takže se
v jediném prostřihu, který tabule má, zvýrazňuje jiná dvojice každou vteřinu
a kaskáda výměn (`VYMENA_MS` 1 100) se do tiku nevejde. Nativní pracovní bod té
mapy je 2×. ⇒ v přehrávce režii na plán nepouštět: jeden záběr na celou
půlminutu, zvýrazněné jen lodě, které v rozjížďce skončily do třetího místa.

---

## Pořadí stavby

Čtyři dávky. Každá je sama o sobě vidět, žádná nečeká na data z kroku 2.

**Dávka 1 — tabule přestane lhát.** Nic z toho není vkus.
`color-scheme: dark` a tokeny; větev pro zrušenou regatu; `pocet()` na čtyřech
místech; `JAK_JISTE` → `ZAPIS` plus stav zápisu na kartě `venku`; `/tabule/data`
vydává pořadí série; komentář o zóně.

**Dávka 2 — obrazovka se dá přečíst ze čtyř metrů.** Podlaha 1,0 × `--tv`
a stáří polohy z pásu ven; title-safe 5 %; `--linka-tv` a `--srafa` u dema;
vedoucí trojice připíchnutá; váha prvního řádku; nadpis nad body; `signál`
místo `před`; pečeti.

**Dávka 3 — tabule pozná, co se děje.** `Probiha` do volby podoby a podoba
„jede se" se dvěma náplněmi; `PODOBA_DRZI_S` nad tím; první záznam hned po
dojetí a ubývající kadence; podoba `pauza` s časem dalšího startu a pohárem;
pásy se střídáním poháru; panel „co se dnes změnilo v poháru" v `konec`;
přejmenování podob.

**Dávka 4 — televiznost.** `transition` utilita; clona jen pro výstrahu a strop
tří dojezdů; souboj celý (blízkost, pás, `--pozor`, karta na změnu v čele,
slovo); třídy v režii; dohasínání od začátku záběru; obratové značky podle
typu; výřez podle předmětu záběru; přehrávka bez plánu režie; čerstvé
polohy pro dav; špička z konce davu; souběžné výměny; animace
karet bez odletu; `vw` → `--tv`; Inter.

**Mimo dávky, protože to čeká na Filipa:** podoba `start` a karta o poháru.

---

## Na čem to stojí — otázky, které konzilium nerozhodlo

Devět otázek, které obory položily a kolo 2 je nedoneslo. Čtyři z nich mění
rozhodnutí výše, ne jen provedení.

1. **Startovní signály do `Snimek`** (jachtař, režisér) — bez nich je podoba
   `start` o čekání. Mění S4.
2. **Pořadí série před dnešní zastávkou do API** (insider, dramatik) — bez
   něj není karta o poháru ani panel v `konec`. Mění S6.
3. **Je `Snimek.lode` seznam přihlášených, nebo přítomných?** (insider 3)
   Nestart favorita hýbe ročníkem silněji než cokoli, co se dnes na vodě
   stane — neúčast je tolik bodů, kolik lodí kategorie bylo přihlášeno.
   Dnes se ten údaj zahazuje schválně. Změřeno: `Snimek.lode` míchá
   `Prihlasena`, `Potvrzena` a `Vyloucena` (`ZavodEndpoints.cs:189–190`),
   takže odpověď je zatím „ani jedno".
4. **Smí tabule říct „v poháru z 3. na 2.", dokud rozhodčí zastávku
   nepublikoval?** (insider) Insider sám říká ne — pak tam ale visí včerejší
   stav a musí se to říct slovem, ne mlčením.
5. **Má tabule v `konec` dožít na pořadí regaty, nebo se vrátit k poháru?**
   (dramatik) Dnes dožije na regatě.
6. **Je vyhlášení moment, který má tabule mít?** (dramatik) `PLAN.md` ho
   v průběhu dne jmenuje, do modelu se nezapisuje — tabule nepozná konec dne,
   jen že regata je `Odjety`, takže poslední takt oblouku nemá spoušť.
7. **Jde pustit přehrávku na té telce a vyfotit ji?** (efekty) U pulzování
   clony i u dopočítávání mezisnímků je to jediný způsob, jak zjistit, jak moc
   to vadí — efekty to mají jako předpoklad, ne měření.
8. **Je v datech délka trupu?** (jachtař) Bez ní se zóna podle ZPJ nespočítá
   a zůstává u rádiusu záběru.
9. **Kolik kódů se na jedné regatě reálně objeví?** (fanoušek, jachtaři) Při
   třech se dají přeložit slovem, při patnácti ne.

---

## Co se při stavbě zapomene první

1. **Světlý režim se neotestuje**, protože vývojářský Mac je v tmavém a mock
   taky. Ověřit na tom boxu, který visí u telky, ne v prohlížeči.
2. **Pečeť se udělá dřív než připíchnutá trojice** — a bude pečeť pro nikoho,
   protože vedoucí odrolují z obrazovky po 18 s.
3. **`JAK_JISTE` se nahradí kopií ze správy**, a tím se rozbije shoda: štítek
   správy pro `Eliminovano` je *zrušená* (ženský rod, k *rozjížďce*), ale
   v té větě je podmětem *pořadí*. `ZAPIS` má *zrušeno* a je to správně.
4. **Karta `venku` zůstane bez stavu zápisu** — udělá se první polovina S8
   a druhá se ztratí, přitom právě tam nepodepsané číslo vypadá hotově.
5. **Title-safe se vrátí zpátky**, až se někomu nevejde sloupec. Je to jediná
   položka v dokumentu, která něco ubírá.
6. **Strop tří dojezdů se zapomene**, protože clona se opraví a pulzování
   zmizí — fronta dvanácti karet ale zůstane a bude pulzovat jinak.
7. **Demo se odbarví a zmizí.** `--linka-tv` musí jít v témž commitu jako
   odbarvení na rastr; rámec 7 je na to výslovný.
8. **Hystereze se udělá místo `Probiha`, ne po něm** — protože „to spraví
   kmitání" a kmitání je vidět, zatímco špatná podoba ne.
9. **`pocet()` se zavede na třech místech ze čtyř.** To čtvrté je *„a další 3"*
   ve `vysledky.tsx:169` a nevypadá jako počítání lodí.
10. **Obratové značky podle typu rozbijí dav tam, kde dnes funguje.** Je to
    oprava s regresním rizikem, patří k ní test na trati s cílem na startovní
    čáře.
11. **`PanylkyRozjizdek` visí mimo volbu podoby** (`obrazovka.tsx:690`) a tiká
    ve všech podobách — je to jediný prvek, který obrazovku nikdy neopustí.
    Při přejmenování podob a při páté podobě se na něj zapomene, protože není
    v žádné větvi.

---

## Co tenhle závěr neuzavřel

- **Rozpočet času v režii.** Dnes 43 / 28 / 29 % (souboj / bóje / kolotoč).
  Blízkostní spoušť ho zvedne a strop nikdo nezměřil. Patří to na vodu, ne do
  dokumentu.
- **Jachtařův čtvrtý důvod `rozdeleni`** — kdo šel napravo, kdo nalevo a komu
  to vyšlo. Na stoupačce to nejjachtařštější, co se o závodě dá říct, a dnes
  pro to v režii není druh záběru. Nevyjádřil se k tomu nikdo jiný.
- **PIP vsuvka záznamu** (efekty E2) jako technika: `clip-path` místo výměny
  plochy. Tři překážky k zaplacení — prop `tabule` nese zároveň rozvržení
  i sloupec pořadí a vsuvka potřebuje třetí režim; rozměry `.nacrt-na-tv` jsou
  v `rem`, ne v `--tv`; dvě instance mapy jsou dvě sady dlaždic. Rozhodnutí
  v S9 říká *kdy* se záznam pustí, ne *čím* se vystřihne.
- **Zkratky tříd** (fanoušek 6). `Nad7m` / `Pod7m` se vysvětlit dají textem,
  `Race` ne — rozpis tříd ve `Snimek` není. Polovina jde bez dat, polovina ne.
- **Kde se vezme stáří polohy** — otevřený nález 14 v `TABULE-DIVAK.md`. Dnes
  se počítá proti nejčerstvějšímu bodu pole, ne proti hodinám, takže ani po
  přejmenování na `signál` neříká, co divák čte. Je to o tom, k čemu tabule
  je; nikdo si to nevzal.
