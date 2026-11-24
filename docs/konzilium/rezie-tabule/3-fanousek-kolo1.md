# Sportovní fanoušek — kolo 1

*Měřeno proti mocku `8113` nad `data/2026-nanecisto.json`, web `3113`, okno
**1920 × 1080**. Viděl jsem `po` (`izolepa`, tři odjeté rozjížďky) a `listina`
(`radavska-regata`); demo v kebabu mi v té kartě nepřepnulo (stránka se
nenahydratovala), takže `mapa` a `mezi` jsou čtené z kódu, ne viděné.*

## Co je dobře

1. **„Konečné pořadí · odjeto 3 rozjížďky · potvrzeno"** (`vysledky.tsx:113`).
   Do dvou vteřin vím, že se čísla už nezmění — to je otázka, kterou si u piva
   kladu dřív než cokoliv o stavu zápisu.
2. **Vývěska vlevo nahoře.** *„Přechod bouřky — lodě zůstávají na břehu…
   před 8 min"* odpoví laikovi na „proč se nic neděje". Nejlepší prvek tabule.
3. **„a další 2"** (`teaser.tsx:228`) — jinak bych deset řádků četl jako pole.
4. **Zrychlený záznam každých 105 s** (`SEZNAM_MS` 75 + `PREHRAVKA_MS` 30,
   `obrazovka.tsx:389`) — jediný důvod koukat dál, když jsem tabulku přečetl.
5. **Štítek „v cíli" u řádku lodi** (`mapa-trackeru.tsx:1923`), ne v okýnku.

## Co je špatně

### 1. Z obrazovky nejde poznat, kdo vyhrává
- **Nález.** První loď je obyčejné `<li>` jako šestá (`vysledky.tsx:158`)
  a v `globals.css` není jediné pravidlo na první místo v pořadí tabule.
  Slovo „vede" ani „vítěz" se na tabuli nevyskytuje — v `NADPISKY`
  (`obrazovka.tsx:822`) ani jinde. Na snímku mají `1. ČERVENÉ CAFE`
  a `6. SEA MOUSE III` stejnou velikost, barvu i váhu.
- **Proč to vadí.** Odpovědí na mou jedinou otázku je tabulka, kterou musím
  přečíst: najít sloupec, pochopit, že jsou tři, pak že každý má svého vítěze.
  Televize dělá vedoucího **většího**, ne jen prvního odshora.
- **Návrh.** První řádek každé třídy nese slovo: za jménem `vede` během
  regaty, `vítěz` po potvrzení — tak jako dnes `v cíli` v ranku.

### 2. Body: vyhrává nejnižší číslo a nikde to nestojí
- **Nález.** Na snímku `1. ČERVENÉ CAFE 8`, `6. SEA MOUSE III 14`. Sloupec
  čísel nemá nadpis (`vysledky.tsx:163`, `obrazovka.tsx:887`), `app/body.ts:11`
  jen formátuje. Dole v pásu má týž údaj příponu `b` (`obrazovka.tsx:430`).
- **Proč to vadí.** Ve fotbale i hokeji vyhrává vyšší číslo, takže mi vyjde,
  že vede SEA MOUSE III se čtrnácti. Dvě čísla na řádku, která si odporují,
  jsou horší než jedno.
- **Návrh.** Nad sloupec drobný nadpis `body — nejmíň vyhrává`, u každé
  třídy, a tatáž přípona `b` jako dole v pásu.

### 3. „před 12 s" u lodi vypadá jako ztráta na vedoucího
- **Nález.** V ranku stojí za jménem `před 12 s` / `před 3 min`
  (`mapa-trackeru.tsx:1924–1931`). Je to stáří polohy z telefonu — podle
  nálezu 14 v `TABULE-DIVAK.md` dokonce proti nejčerstvějšímu bodu pole.
- **Proč to vadí.** Čas ve vteřinách vedle pořadí znamená v cyklistice i ve
  formuli ztrátu na vedoucího. Přečtu to jako „druhý je dvanáct vteřin za
  prvním". *Dojem:* nejvíc zavádějící věc na tabuli, a nepoznám to ani dlouhým
  koukáním.
- **Návrh.** Předřadit slovo o signálu, ne o závodě: `signál 12 s`,
  `signál 3 min`, `nehlásí`.

### 4. Vedoucí loď pravidelně odjede z obrazovky
- **Nález.** Rank se sám roluje dolů a zpět po `TOCENI_MS = 18 s`
  (`mapa-trackeru.tsx:53`, smyčka `:1258–1271`). Dvaadvacet přihlášených lodí
  (`izolepa`) se do sloupce nevejde, takže první dvě místa zmizí.
- **Proč to vadí.** Koukám po záblescích; trefím-li spodní půlku cyklu, vidím
  lodě 12–22 a vedoucího ne. Televize vedoucího neschovává.
- **Návrh.** První tři řádky zůstanou připíchnuté nahoře, roluje se zbytek.

### 5. Dole jsou dvě různá pořadí pod sebou a jedno se nejmenuje
- **Nález.** Při živé regatě nese pás pořadí z vody a `nadpis` dostává
  `undefined` (`obrazovka.tsx:743`); pod ním točí karusel pořadí regaty
  v bodech (`:759`, `tridyPanely` na `:869`). Obojí začíná týmž znakem
  a jménem třídy; jedno má za lodí `před 12 s`, druhé body.
- **Proč to vadí.** Dvě pořadí téže třídy deset centimetrů od sebe, táž loď
  v každém jinde; vypadá to jako chyba. Mimo regatu pás nadpis má
  (`PRŮBĚŽNÉ POŘADÍ SÉRIE`) — chybí zrovna tehdy, když je pořadí dvojí.
- **Návrh.** Pás má nadpis vždycky; při živé regatě `NA VODĚ TEĎ`.

### 6. Zkratky tříd nikdo nevysvětlí a nevypadají jako tři závody
- **Nález.** Nadpisy sloupců `RACE`, `NAD7M`, `POD7M` (`vysledky.tsx:154`).
  `app/lodka.tsx:9–12` to říká samo: jména jsou ze sešitu rozhodčího a
  *„nic v nich neříká, jak je loď velká"*.
- **Proč to vadí.** Nevím, co „Nad7m" je, a hlavně mi nedochází, že jde o tři
  oddělené závody se třemi vítězi: čtu to jako tři sloupce jedné tabulky
  a hledám v nich celkové pořadí (sloupec `Celkem` tu není).
- **Návrh.** Pod nadpisem třídy řádka drobným: `lodě nad 7 metrů`. **Je to
  návrh na nová data** (rámec 4) — rozpis tříd ve `Snimek` není.

### 7. Zrušená regata mluví, jako by se čekalo na rozpravu
- **Nález.** Změřeno: `radavska-regata` má `stav: Zruseny` a nula rozjížděk;
  tabule ukázala `Čeká se na rozpravu`. `stavDne`
  (`lib/rozjizdky-tabule.ts:111–141`) větev pro zrušenou regatu nemá, takže
  spadne na poslední možnost v řadě.
- **Proč to vadí.** Sedím pod obrazovkou a čekám na závod, který se nejede.
  To není nedorozumění o zkratce, to je špatná informace o dnešku.
- **Návrh.** Větev nahoru: `stav === "Zruseny"` → `Regata zrušena.`

### 8. Kód `DNF` projede obrazovkou bez překladu
- **Nález.** Karta dojezdu nese detail `3. rozjížďka · Nad7m · DNF`
  (`lib/tabule-udalosti.ts:219`), visí 4,5 s (`ALERT_MS`) a zmizí.
- **Proč to vadí.** Za 4,5 s nezjistím, co se té lodi stalo, a zrovna to je
  zajímavé. Legenda na tabuli není a být nemá.
- **Návrh.** Na kartě slovo místo kódu (`nedojela`, `předčasný start`); kód
  ať zůstane v tabulce, kde je na něj čas.

## Co bych potřeboval vědět

- **Filipovi:** smí tabule říct „vede" u pořadí, které ještě není potvrzené,
  nebo je to proti rámci 5? Bez toho slova nález 1 textem spravit nejde.
- **5-jachting:** vyhlašuje se vítěz regaty i celkově napříč třídami, nebo
  jsou vždycky tři? Na tom visí nálezy 1 a 6.
- **5-jachting:** kolik kódů (`DNF`, `OCS`, …) se na jedné regatě reálně
  objeví? Při třech se dají přeložit, při patnácti návrh 8 neobstojí.
- **8-jazyk:** jak pojmenovat stáří polohy, aby nevypadalo jako ztráta na
  vedoucího? `signál 12 s` je nástřel, ne návrh znění.
- **1-režie:** rozbije připíchnutá vedoucí trojice rytmus rolování po 18 s?
- **4-insider:** je „Nad7m" pro místní pojem, který by vysvětlivka urazila?

## Čeho se nedotýkám

- Kódu, výkonu, CSS, kontrastů — 6-design a 7-efekty.
- Věcné správnosti čísel, bodování, škrtů a pravidel — 5-jachting.
- Toho, kdy se co ukáže a jak dlouho visí — 1-režie; mých pět vteřin je
  požadavek na obsah, ne na délku záběru.
- Přesného znění textů, pádů a tónu — 8-jazyk.
- Uříznutého názvu `Radavská re` u zrušené regaty — rozvržení, 6-design.
