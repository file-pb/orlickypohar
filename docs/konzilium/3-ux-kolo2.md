# UX (toky, role, prázdné stavy) — kolo 2

## Kde ustupuju

**C — *Otázky k aplikaci* z pruhu ročníku pryč.** 4-jazyk má pravdu: je to zpětná
vazba na software, ne agenda. Pruh odpovídá na *„co můžu spravovat"* — a otázky se
nespravují, odpovídá se na ně. Můj „opravit a nechat" padá.

**A — nechci dopočítávat chybějící dokumenty hned.** `ZastavkaVysledkyDto`
(`web/lib/schema.d.ts:8943–8955`) nese jen `zavod, nazev, datum, stav,
pocetRozjizdek, publikovanych, kRevizi, kPodpisu, kPublikaci` — „zbývá vyvěsit
směrnici" je změna API, druhá fáze, ne podmínka pilotu.

**I — jmenovatel „ze 4" pryč**, ale z jiného důvodu, než píše 5-jachting:
`pocetRozjizdek` není plán (ten model nedrží), ale počet **existujících**
rozjížděk — číslo je pravdivé, lže formulace. Jeho „2 rozjížďky venku" platí.

## Kde držím

### A. Výchozí tab zůstává *Co teď*, a *Co teď* nesmí být prázdné

Řešení 1-ergonomie (prázdné `coTeď` ⇒ otevřít *Regaty*) stojí jeden řádek a nic
nevymýšlí. Dvě věci proti: **jedna adresa, dvě obrazovky** — `/sprava/2027` by
podle dat ukázala raz *Co teď*, raz *Regaty*, takže záložka, Zpět ani drobeček
z okna regaty (jeho nález 2 ho chce mířit na *Regaty*) nevedou na jedno místo
a o témž rozhodují dvě pravidla. A **prázdná obrazovka se neopraví tím, že se
před ní uhne**: `coTeď` nezná `Planovany`
(`web/app/sprava/[serie]/page.tsx:262–265`) a plánovaných je sedm z osmi, takže
se to vrátí v den, kdy nemají nic ani *Regaty*.

**Čím to naplním bez API:** nejbližší zastávka podle `datum`, i `Planovany`,
s odkazem do okna té regaty (`kamNaRegate`, `co-smim.ts:311`, rozhodne na který
úkon). „Jarní vítr · 15. května · plánováno" je fakt a **jedno klepnutí k práci**,
stejně jako u něj — postřeh 3 splní obě řešení. Výmysl to nebude ani ve druhé
fázi: vypsání má regata vždycky, i neúplné (R1/R8), směrnice je
`zavod.smernice?.length`. **Padne-li to u Filipa, beru jeho podmíněný tab** —
odmítám jen status quo.

**Komu *Co teď* být nemá — bez Filipovy odpovědi:** je v pruhu právě tehdy, když
je čitelný jeho zdroj. Přehled zastávek pustí API jen Organizátorovi a Rozhodčímu
(403 → `stav: "nesmi"`, `web/lib/sprava.ts:104`) a tytéž dvě role chtějí všechny
čtyři větve `coTeď` (`page.tsx:248, 266, 291, 308`). Čistý editor tab nemá a zbude
mu jediná dlaždice — pak pruh nekreslit (jako `sprava/page.tsx:65`).

### C. Kam s *Otázkami*: ani do nabídky účtu, ani o patro výš

Proti **4-jazykovi**: adresa je `/sprava/{ročník}/oponentura` (`co-smim.ts:251`)
a sada se uděluje rozhodčímu **toho ročníku**; tab ve Správě webu by pod
drobečkem *Správa* nesl obsah ročníku — proti postřehu 6, ze kterého pravidlo
pater plyne. Proti **1-ergonomii**: nabídka pod účtem drobeček neporuší, ale
vrací položku odvozenou z práv tam, odkud ji audit 6. 10. 2026 vytáhl (ř. 7–16).

**Neporuší ani jedno: *Otázky* nejsou tab, ale úkol v *Co teď*** — „3 otázky
čekají na odpověď" s odkazem na tutéž adresu. Fronta, ne agenda: objeví se, když
něco visí. `SadaShrnuti` (`web/lib/oponentura.ts:26–36`) nese `pocetOtazek`,
`odpovezeno` i `stav`; cena je jedno čtení navíc na landingu. **Můj nález
o chybějícím `kdyz` platí i po přesunu**: pořadatel zastávky vypadne
z `smi({role:"Organizator", serie})` a neviděl by ani úkol, ani odkaz.

**Číslo: 8 − Otázky = 7.** *Pořadatele* jako tab nechci: medailonek je obsah
o člověku u jedné regaty, dnes vedený z kalendáře (`SCENARE-OVLADANI.md:141`), a
mění se raz za sezónu — zmizet by kvůli němu musel denní *Kalendář*. Patří k regatě.

### I. Řádek regaty nese jednu odpověď: čeká něco, a na kom to je

Počty po kategoriích jsou správná otázka na špatném místě: tři čísla a trojici
`ZastavkaVysledkyDto` nenese vůbec — změna API kvůli sloupci širokému 9 rem.
Adresát nestojí nic: `kRevizi` / `kPodpisu` / `kPublikaci` v DTO jsou a filtr práv
`coTeď` už dělá. Tvar, na kterém se shodneme (unese-li ho 2-design):

```
15 kvě │ Jarní vítr · Marina Orlík │ 2 rozjížďky venku · 1 čeká na pořadatele │ vypsáno
 9 čvc │ 24hodinovka · Stingray    │ čeká na vypsání závodu                   │ plánováno
```

Počty po kategoriích chci v *Co teď* v den regaty (jediná chvíle, kdy se podle
nich jedná) a v *Přihláškách* té regaty, kde se s nimi něco dělá.

### F. Složením čtyř dlaždic se odpověď „co můžu spravovat" ztrácí

Role a rozsah jsou dvě různé věty: řádek u nadpisu („správce ročníku · rozhodčí
ročníku", `Main.dc.html:73`) říká **kdo jsem**, dlaždice **co z toho plyne** —
a že role sama nestačí, je celý důvod existence `co-smim.ts`. Pevná čtveřice je
navíc vybraná podle **frekvence agendy**, ne podle práv: pořadatel zastávky by
dostal *Výsledky*, které mu `polozkyRocniku` nedává (`co-smim.ts:209–227`),
a editor pruh *Novinky + Víc*, za kterým nic není.

**Místo toho skládat podle počtu po filtraci práv:** do pěti dlaždic ukázat
všechny (pořadatel zastávky 3, editor 1, rozhodčí ~6), nad to zbytek za *Víc*
**s počtem** („Víc (3)") — složené číslo pořád říká, že rozsah pokračuje.

## Kde jsme se shodli

- **Co teď zůstává a je první tab** — 1, 3, 5; 2 nenamítá. **Dlaždice z jednoho
  zdroje práv** (`co-smim.ts`), bez čtvrtého ručního opisu — 1, 3.
- **Jmenovatel „ze 4" pryč** (3, 5) a **„1× k revizi" dostane adresáta i správnou
  číslovku** — 3 + 4 („1 rozjížďka k revizi"); nebije se to.
- **„Mimo ročník": filtrovat podle `polozkyWebu`, jako odkazy, přeformulovat** —
  3 + 1 + 4 se skládají.
- **Dotykový cíl 44 px** (1 + 2) — složený pruh je horší než vyšší dlaždice.
- **2-designu:** pilulka patří k **obsahu pod sebou** (0,35 rem po ní, 1,1 rem
  před ní) — mění rozsah tabulky, ne okna.
- **1-ergonomii:** *Regaty* ukážou pořadateli jediné zastávky jeden řádek. Proto
  ten redirect; nepřijme-li se, nemá mu ten tab stát v pruhu vůbec.

## Nové, co vylezlo z cizích posudků

- **Štítek „vypsáno" má dva významy** (5-jachting, nález 10) a je to vada toku, ne
  slov: podle vyvěšeného vypsání se smí přihlašovat (R1), takže řádek *Regaty*
  neumí říct, jestli jsou přihlášky otevřené. Tentýž chybějící údaj chce *Co teď*
  ve druhé fázi — jedna změna DTO pokryje obojí.

## Podmínka

1. **Landing ročníku nesmí vyjít prázdný pořadateli plánované regaty.** Splní to
   neprázdné *Co teď* (držím) nebo podmíněný tab (1-ergonomie) — jedno z nich
   musí být v pilotu, ne „až potom".
2. **Před stavbou pruhu projet všech sedm tabů proti serverovým kontrolám.** Pruh
   je tvrzení o právech; jeden chybějící `kdyz` (Otázky, Výsledky, Pořadatelé pro
   pořadatele zastávky) z něj dělá nepravdivou odpověď.
