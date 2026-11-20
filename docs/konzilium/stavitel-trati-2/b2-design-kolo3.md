# Vizuální design — kolo 3

## Jedna řádka trati

Šířka 358. **Žlábek osy 40 dp** (dnes 34), karta 318, vnitřek 292
(padding 13 + 13). Výška **56**, mezera **8**, rozteč **64**.

| | obsah | šířka | písmo |
|---|---|---|---|
| vlevo | silueta značky, výplň = barva bóje | 28 × 36 v žlábku 40 | — |
| uprostřed | jméno / předpis | 72 / **134** z 292 | 16/600 · 13/400 `tlumeny` |
| vpravo | stav slovem, zarovnaný doprava | sloupec **114** | 13/600 |

**Vlevo: 28 × 36 beru, ale jiným důvodem, než kterým se nabízí.**
Spočítáno z geometrie `znak-boje.tsx:182–195`. Při poloměru, který se do
36 dp vejde (plovatka je `2,8 r`, tedy `r` = 13), je kužel proti válci
rozdíl **13 dp** přes horní hranu a plovatka proti válci **13 dp** na
šířce — ty tvary se oddělí nepochybně. Co se **neoddělí**, je válec proti
kulové: roh je `0,293 r`, tedy **3,8 dp** proti 2,5 u dnešního disku 17.
Na ten pár velikost nestačí nikdy a nevadí to, červený válec proti
červené kouli se na Orlíku nepotká. **Ano 28 × 36, žlábek 40** — a `r`
nad 13 ne, plovatka by řádku přerostla (`2,8 × 14 = 39,2 > 36`).

**Velikost ale neřeší viditelnost, jen rozpoznání.** Žlutá `#e8b400` má
na `papir` **1,92:1** v 17 dp i v 36 dp, bílá **1,00:1**, růžová 2,85,
oranžová 3,03; mez SC 1.4.11 je 3:1 a nese ji **lem**, ne průměr.
**Uprostřed** se nemění nic: jméno 16/600 (nejdelší `Odskok 4` = 72),
předpis 13/400 `tlumeny` (nejdelší `ponechat po levoboku` = **134**).

**Vpravo stav slovem a nic jiného.** Změřeno 13/600: `z plánu` 46,
`změřeno` 55, `odesláno` 58, `chybí fotka` 70, `čeká ve frontě` 90,
`čeká na odemčení` **114**. Sloupec tedy **pevných 114 dp** zarovnaných
doprava, aby stavy stály pod sebou; roztřepený pravý okraj je na šesti
řádcích šum. Nejhorší případ 134 + 10 + 114 = **258 z 292**.

### Výška a rozteč: spojnici nekracujte, zrušte ji jako prvek

Dnes je spojnice **tři tečky 3 dp s mezerami 3** v boxu 21. Na 8 dp
zbudou **dvě** (3 + 2 + 3), a dvě tečky nejsou vzorek — přerušovaná čára
potřebuje tři opakování. Pahýl se navíc nedotkne ani jednoho uzlu:
silueta 36 v řádku 56 nechá nad i pod sebou 10 dp, takže mezi tvary je
28 dp volna a osm z nich je tečkovaných.

**Návrh: souvislé vlákno 1,5 dp v `tlumeny`** (5,60:1 na `pozadi`)
kreslené na pozadí žlábku od prvního uzlu k poslednímu, siluety na něm
sedí. Vlákno **není prvek ve sloupci**, takže rozteč je řádek plus mezera
a zkrácení na něm není vidět: čára nemá rytmus, o který by přišla.
`tlumeny` je token, kterým se na téže řádce píše předpis — žádný nový
význam barvy, a tmavý protějšek má, na rozdíl od `#b7b2aa` (2,02:1
světlá, 8,53:1 tmavá). **Je to i argument pro siluety:** stejnorodý
sloupec disků nesl osu sám, šest různých tvarů ji nenese.

**Kolik se vejde** (oblast seznamu je dnes y 154–636, z toho 18 padding
a 26 návěstí → 438 dp na řádky; `64 n − 8 ≤ oblast`): při 438 **šest**
prvků, bez návěstí *CO UŽ STOJÍ* (464) **sedm**, a bez návěstí i bez
řádku *Přerovnat / Nahlásit hotovo* (522) **osm**. Těch 84 dp, které
jsem navrhoval uvolnit v kole 2, tedy zaplatí právě osm řádků, které
rozhodnutí 3 slibuje a na hlavní obrazovce nikdo neměřil.

### Dvě věci, kvůli kterým tu řádku dnes nelze nakreslit

Uzavřený bod 7 velí kreslit ze `znak-boje.tsx`; ta má ale dvě výchozí
hodnoty psané pro **mapu**, ne pro bílou kartu:

1. `const vypln = vyplnPrepis ?? (barva ? BARVY[barva] : "#c1121f")`
   (`znak-boje.tsx:134`) — **bez zapsané barvy kreslí červenou.** `Barva`
   je nepovinná schválně a podle bodu 13 ji API nevydává, takže by byl
   celý seznam červený: přesně J10, *pravá strana plavební dráhy*.
2. `stroke: "#fff", strokeWidth: 3` — **lem je bílý**, nad fotomapou
   správně, ale na `papir` je bílá na bílé **1,00:1**: žlutá, bílá,
   růžová a oranžová silueta zůstanou pod 3:1 bez obrysu.

Obojí spraví dva parametry — výchozí výplň `tlumeny` a lem dopočítaný
z podkladu po vzoru `pismoNaVyplni` —, ne druhá kresba.

## Detail prvku

Pořadí shora dolů s jedním pravidlem: **váha klesá podle četnosti, kromě
destruktivní akce, která je poslední a nejlehčí vždy.**

1. **Hlavička** 72 dp — jméno 20/700, předpis 13 `tlumeny`, vedle silueta
   v náhledovém stupni (`Plasticita` to umí).
2. **Proužek polohy** 42 dp jako všude: *Přesunout sem* měří, takže
   čerstvost fixu musí být vidět dřív, než na něj sáhne palec.
3. **Doklad k poloze** ~96 dp, bez rámů, mezery 8: souřadnice, čas,
   přesnost, zdroj (*změřeno telefonem* / *odečteno z mapy*), azimut
   a vzdálenost odsud; popisky 13 `tlumeny`, hodnoty 16/600.
4. **Fotky** ~130 dp — dvě dlaždice 104, pod nimi *Vyfotit* / *Vybrat
   z galerie* obrysově.
5. **Barva a tvar** 56 dp jako řádek s aktuální hodnotou, ne jako výběr.
6. **Pořadí *výš / níž*** 48 dp, dva obrysové terče.
7. **Smazat prvek** 48 + 32 dp věty — holý text, dvě fáze, úplně dole.
8. **Dole pevně:** *Sebrat z vody* obrysové (neměří) a pod ním **jediná
   plná plocha obrazovky, *Přesunout sem* 358 × 86**, na témž místě
   a v téže velikosti jako *Pípni* na hlavní obrazovce: měří polohu tady
   a teď, takže váhu 1 nese právem (bod 6), a návyk přechází beze změny.

Rozpočet: 106 + 42 + 96 + 130 + 56 + 48 + 80 + hlavička 72 + dolní pruh
174 = **804 z 844**, bez rolování; kdyby popisky přetekly, pruh stojí.

## Zbytek sporu C

**Vzorky: ustupuju, dvě řady po 56.** Vedl jsem spor o to, aby se
opticky nic nezměnilo — jenže po bodu 9 barva v zakládací cestě není a je
to obrazovka otevíraná **jednou za ráno**, kde je 248 dp volna a vzorek
56 × 56 je v rukavicích jistější. Námitka proti „čtyřem a třem" padá
taky: nesymetrické je to jen při centrované druhé řadě, zarovnaná doleva
je to mřížka a místo po sedmém vzorku nese popisek *žlutá je předvolená*.
Podmínku si nechávám jednu: **vzorek nese lem dopočítaný z výplně**.

## Co jsem si rozmyslel

**Azimut a vzdálenost v pravém sloupci každé řádky byla chyba** a 3-ux ji
pojmenoval mým vlastním měřítkem: pět pohyblivých čísel na šesti řádcích
je znovu „všechno váží stejně", jen s číslicemi. Bod 2 je lepší — jedno
číslo u akce (`3 prvky odesláno · ±4 m · 240 m k Bráně 2` = 13/400
**256 z 358**), azimut v detailu. Těch 109 dp platí teď žlábek a stav.

**A proužek zůstává 42 dp**, ne 56: vítr padl, druhá řádka není na co —
rozpočet z kola 2 se tím zlepšil, uvolní se 84 dp a neutratí se nic.
