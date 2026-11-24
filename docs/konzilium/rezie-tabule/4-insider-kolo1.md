# Sportovní novinář a znalec prostředí — kolo 1

*Podloženo kódem a `docs/PLAN.md` (*Bodování ve dvou úrovních*, *Pravidla
seriálu od rozhodčího*). Běžící tabuli jsem nespouštěl, nic na ní nestojí.*

## Co je dobře

1. **`CERSTVY_DOJEZD_S = 90`** (`web/lib/tabule-udalosti.ts:57`) oddělí „loď
   právě protla cíl" od „správce pustil ven sadu". Dojezd před hodinou není zpráva.
2. **`venku` místo dvanácti karet** (`:227`). „Dvanáctá je venku, devět lodí
   v cíli" řekne rozhodčí; dvanáct karet je výpis, ne zpráva.
3. **Zrušená rozjížďka má vlastní kartu** (`:181`). Na zrušení se tady čeká —
   rozhoduje se podle něj, jestli zůstat na vodě. Zpráva, ne administrativa.
4. **„Mimo pohár" vůbec existuje** (`:174`). Jediné místo celé tabule, které
   ví, že vedle regaty běží ročník. Instinkt správný, provedení viz nález 5.
5. **Cedulka jistoty u pořadí** (`tabule/vysledky.tsx:16-26`: *zapisuje se /
   zapsáno / potvrzeno*). Autoritou je sešit rozhodčího, ne obrazovka — jinak
   by ji rozhodčí viset nenechal.

## Co je špatně

### 1. Pohár na obrazovce zamrzne v okamžiku, kdy se stránka otevřela

- **Nález** — `poradiSerie` se čte jednou na serveru (`tabule/page.tsx:51`)
  a jde dolů jako prop (`obrazovka.tsx:75`). Obnovovací smyčka (`:62`, cesta
  `/tabule/data`) nese jen `Snimek`, a `Snimek` o sérii nemá nic (`tabule.ts:13`).
- **Proč to vadí** — tabuli nikdo neobsluhuje (rámec 2) a dnešní zastávku
  pouští ven rozhodčí ještě na místě (`PLAN.md`, *Pouští ven rozhodčí*). Od té
  chvíle visí na televizi pohár **před dnešní zastávkou** pod nadpisem
  „průběžné pořadí série" (`page.tsx:62`) — bez datumu a bez slova *před* to
  nepozná nikdo. Jediný celoroční údaj je nepravdivý v hodinu, kdy se na něj
  kouká nejvíc lidí; rámec 6 naruby, u snímku se stáří píše, u poháru mlčí.
- **Návrh** — ať `/tabule/data` vydává vedle snímku i pořadí série a obrazovka
  ho drží ve stavu. Dotazů to nepřidá, mikrocache už před webem stojí.

### 2. Dnešní dojezd se nikde nepřeloží do roku

- **Nález** — všech dvanáct druhů událostí (`tabule-udalosti.ts:17-30`) je
  o dnešku, o poháru ani jeden. Z `PoradiLodiDto` (`web/lib/schema.d.ts`:
  `poradi`, `poradiPoSkrtu`, `zastavky`, `kody`, `skrtnute`) bere tabule jen
  `bodyPoSkrtu` a `poradiPoSkrtu` (`obrazovka.tsx:92-108`), zbytek zahodí.
- **Proč to vadí** — hraje se o ročník přes devět zastávek se **dvěma škrty**
  (`PLAN.md`: „od devíti, co bylo dřív, neřešit"; `Serie.PocetSkrtu` = 2)
  a do série jde pořadí v kategorii minus jedna, ne body závodu. Dnešní čtvrté
  místo je proto pro jednu loď bezcenné (škrtne se) a pro druhou rozhodující.
  To je ta věta, kterou u stolu řekne znalec seriálu — a tabule ji neumí ani
  po dojetí regaty, kdy má na obrazovce místo.
- **Návrh** — nový druh karty `pohar`: po `dokonceno` poslední rozjížďky,
  titulek jméno lodi, detail *„v poháru nad 7 m z 3. na 2. místo"*. Mechanismus
  je hotový, `udalosti()` porovnává dva snímky — tady dvě pořadí série. Stojí
  to na nálezu 1.

### 3. Nestart favorita je tu největší zpráva dne a zahazuje se schválně

- **Nález** — `tabule-udalosti.ts:152-159` hlásí jen přírůstek lodí,
  s odůvodněním *„že ubyl, je administrativa"*.
- **Proč to vadí** — u jednorázové regaty by to byla pravda, v poháru ne:
  neúčast je **tolik bodů, kolik lodí kategorie bylo na zastávku přihlášeno**
  (`PLAN.md`; `Bodovani.PrihlasenaDoZavodu`) a škrt schová jednu neúčast,
  druhou už ne. Nestart vedoucí lodi hýbe ročníkem silněji než cokoliv, co se
  dnes na vodě stane. Zahodit to a přitom kartou ohlásit každou loď, co
  dorazila, je obrácené pořadí důležitosti.
- **Návrh** — odhlášení nehlásit, ale po startu první rozjížďky jednu kartu za
  lodě, které jsou v `snimek.lode` a v pořadí té rozjížďky nemají místo ani
  kód. **Rámec 4:** `Snimek.lode` nese `potvrzena` (`web/lib/tabule.ts:60`),
  ale přihlášené od přítomných neodliší — potud je to návrh na nová data.

### 4. Celoroční pořadí z obrazovky zmizí přesně v hodinách, kdy se jede

- **Nález** — `obrazovka.tsx:743-744`: pásy dole vezou pořadí série (a nadpis
  k němu) jen když `zive.length === 0`.
- **Proč to vadí** — během rozjížděk, tedy když je u televize nejvíc lidí,
  celoroční pořadí na tabuli není vůbec. Rozhodl to Filip 26. 10. 2026, jenže
  pořadí na vodě divák má už vpravo v celém poli (`poradi-tridy.tsx`: *„vpravo
  stojí celé pole pořád"*) — pásy dole nesou podruhé totéž a cena je pohár.
- **Návrh** — pásy nechat na pořadí na vodě, ale každý N-tý průjezd pásu jedné
  třídy pustit pořadí série, s nadpisem u sebe. Hájím jen to, že pohár nesmí
  z obrazovky vypadnout na celý závod; kolik je N, patří 1-rezie.

### 5. „Mimo pohár" se řekne u startu a pak už nikdy

- **Nález** — `:174` je jediné užití `doSerie` v celé tabuli (grep přes
  `tabule/` a `web/lib/tabule*`). Karta dojezdu (`:219`) nese číslo rozjížďky,
  kategorii a kód, `doSerie` ne; veřejná stránka to značí hvězdičkou
  (`sekce-vysledky.tsx:95`).
- **Proč to vadí** — na Izolepě je část rozjížděk mimo vodu, třeba běh pro
  míčky z kopce (`PLAN.md`, *Bodování ve dvou úrovních*). Divák, co přišel po
  startu, dostane nebodovanou rozjížďku stejně jako bodovanou: rozdíl mezi
  „vyhrál" a „vyhrál běh pro míčky".
- **Návrh** — totéž slovo do detailu karty dojezdu a k panýlku rozjížďky.
  Formulace patří 8-jazyk.

### 6. Koho obrazovka jmenuje, nerozhodl nikdo — rozhodl to kód

- **Nález** — karta nové lodi jmenuje kormidelníka (`:159`), karta dojezdu
  nejmenuje nikoho (`:219`); `PoradiLodiDto` přitom nese `majitel`.
- **Proč to vadí** — tady se o výsledku mluví **jménem lodi** (dnes správně)
  a gratuluje se **kormidelníkovi**. Kód jmenuje člověka u nejmenší zprávy ze
  všech — přírůstku na listině — a u vítěze rozjížďky nikoho.
- **Návrh** — kormidelníka do detailu karty dojezdu; `majitel` na tabuli nikdy.

## Co bych potřeboval vědět

- **Filip:** je `Snimek.lode` seznam přihlášených na zastávku, nebo
  přítomných? Na tom stojí nález 3.
- **Filip:** smí tabule říct „v poháru z 3. na 2.", dokud rozhodčí zastávku
  nepublikoval? Já říkám ne — pak tam ale visí včerejší stav a musí se to říct
  slovem, ne mlčením (nález 1).
- **5-jachting:** nese kód u dojezdu, který **má** místo (RDG, OCS po
  nápravě), riziko, že se trest objeví na televizi dřív, než doběhne lhůta na
  protest? Karta (`:219`) u sebe žádný stav zápisu nemá, `Vysledky` ano.
- **1-rezie:** kde je v rytmu dne místo pro kartu o poháru? Odhaduji po
  `dokonceno` poslední rozjížďky, ne průběžně.
- **2-dramatik:** končí oblouk dne teprve větou o ročníku, ne dojezdem?

## Čeho se nedotýkám

Pravidel plachtění a kódů (5-jachting). Rytmu a délek (1-rezie). Vzhledu
a kontrastu (6-design). Formulací (8-jazyk). Přechodů a animací (7-efekty).
R1 a R5 nekomentuji — jsou o provedení, ne o tom, co je zpráva.
