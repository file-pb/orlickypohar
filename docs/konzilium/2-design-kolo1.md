# Vizuální design — kolo 1

Barvy jsou počítané z hodnot v maketách a v `web/app/globals.css`, ne odhadnuté okem.

## Co je dobře

- **Barevná levá hrana místo vlajky je správný kanál** — nese rozlišení, ne stav.
- **Nadpis + lano + údaj na jednom řádku** je nejlepší věc na těch obrazovkách:
  tři informace v jedné lince a ani jeden svislý pás.
- **Vybraná dlaždice má tři kanály** (podklad 10 %, rámeček 45 %, spodní `inset`);
  text na tom podkladu drží 14,7–15,3 : 1 ve všech osmi barvách.
- **Pilulka se s pruhem dlaždic nesplete** — rozchází se třemi kanály naráz:
  radius 999 px proti 7, šedý podklad, 0,88 rem proti 0,95.
- **Sdílené barvy tam, kde jde o tutéž agendu, sedí na hex**: Výsledky i Pořadí
  `#4a7f91`, Lodě dědí přihlášky `#6a70a8`, ΔE = 0,0 proti stojícím tokenům.

## Co je špatně

### 1. Nadpis má obrácenou hierarchii a popírá hotové rozhodnutí

- **Nález.** Ve všech osmi maketách je `h1 strong { font-weight: 800 }` na jméně
  ročníku — na tom jediném, co je na všech osmi obrazovkách totéž a co stojí
  o centimetr výš v drobečku; agenda, která se mění, má 500. Stojící komponenta
  má přitom `h1` **1,2 rem v barvě agendy** (`globals.css:2222`), `strong` 700
  a `.agenda` 0,88 em (ř. 2266, 2271) — maketa 1,55 rem v `--text`, 800 a 1 em,
  proti napsanému důvodu *„nadpis je menší, protože barvu a lano už má"*.
- **Proč to vadí.** Při přepnutí tabu se nejtěžší typografie na stránce nezmění,
  takže oko změnu nevidí a musí si ji přečíst. Odebráním barvy navíc padá vazba
  nadpis → vybraná dlaždice, kterou dnes dělá `--ukon-strany`.
- **Návrh.** Nekreslit nic nového: `1.2rem`, `color: var(--ukon-strany)`,
  `strong` 700, `.agenda` 0,88 em; jméno ročníku na `--tlumeny` a 500, agendu 700.

### 2. Lano je v maketách šrafa, a šrafa tu znamená „nezveřejněno"

- **Nález.** `.lano` je ve všech osmi maketách `repeating-linear-gradient(115deg,
  … 0 2px, transparent 2px 7px)`. Nezveřejněná karta je totéž o 20° vedle:
  `repeating-linear-gradient(135deg, transparent 0 7px, var(--srafa) 7px 14px)`
  (`globals.css:757`). Stojící lano je přitom pramen z SVG masky (ř. 2272).
- **Proč to vadí.** Publikace má jediný kanál a je to právě šrafa; barvu mít
  nesmí, tu drží stav (ř. 752, `SCENARE-OVLADANI.md` bod 4). Až šrafovaný pruh
  přeběhne přes každý nadpis na webu, šrafa přestane znamenat cokoliv — a jako
  hranice to nefunguje: kontrast pruhu proti pozadí je 1,80–2,29 : 1 při 29 %.
- **Návrh.** Použít stojící pramen (`--pramen` + `--dobeh`, 10 px) a šrafu
  nekreslit nikde kromě publikace.

### 3. Osm barevných dlaždic je duha, ne soustava

- **Nález, čísly.** Osmička má L\* 43,1–58,3 (rozptyl 15,2) a C\* 8,6–37,1.
  *Oprávnění* `#a18a4a` je nejsvětlejší **i** nejsytější, takže oko čte poslední
  dlaždici první; *Otázky* `#6b7280` má C\* 8,6, tedy šedou díru na sedmé pozici.
  Při deuteranopii splyne Regaty × Novinky na ΔE′ = 1,9 a Co teď × Kalendář na 3,4.
- **Proč to vadí.** Projekt si to sám zakazuje: *„kdyby svítilo všechno, nesvítí
  nic"* (`SCENARE-OVLADANI.md:490`). U pětice regaty barva pracuje, protože se z pěti
  rovnocenných úkonů **vybírá**; v pruhu tabů je jeden vybraný a to nesou tři
  kanály, takže barva sedmi nevybraných neodpovídá na nic — jen zvedá hustotu
  nad obsahem, který má být hlavní.
- **Návrh.** Barvu nese **jen vybraná dlaždice**, nevybrané `border-left: 4px
  solid var(--linka)`. Barva pak znamená „tady jsi" a agenda si ji drží v nadpisu
  a v ploše obsahu.

### 4. „Barva patří agendě" v návrhu neplatí — dvě kolize na hex

- **Nález.** `--ukon-opravneni: #a18a4a` je **týž hex** jako `--ukon-smernice`
  (`globals.css:73`) a `--ukon-naklady: #4a8a80` týž jako `--ukon-trat` (ř. 74).
  Různé agendy, ΔE = 0,0: v jednom průchodu je okrová Směrnice i Oprávnění
  a tyrkys Trať i Co web stojí.
- **Proč to vadí.** Není kam uhnout. S osmi novými tokeny má web **16 barev agend
  a stavů**, největší volná výseč odstínu je 50,3° a průměrná mezera 22,5° —
  kružnice je plná. To je matematický tvar té duhy z bodu 3.
- **Návrh.** Nepřidávat token: *Oprávnění* a *Co web stojí* dát šeď `--ukon-uvod`
  z toho důvodu, pro který ji má Úvod (`globals.css:76`: *„je to celek regaty, ne
  jedna z jejích věcí"*). Zbytek vyřeší bod 3.

### 5. Tmavý režim: tři z osmi hran jsou pod mezí 3 : 1

- **Nález.** Devět nových tokenů nemá tmavou odrudu. Na `--papir` `#1b1f23` dávají
  Co teď 2,87 · Novinky 2,89 · Regaty 2,94 · Kalendář 3,41 · Otázky 3,43 · Lodě
  3,55 · Výsledky 3,74; WCAG 1.4.11 chce pro netextový prvek rozhraní 3 : 1.
- **Proč to vadí.** Kontrola to nenajde: `tools/kontrola-tokenu.py` odvozuje páry
  z pravidel, která mají `color` i **plné** `background` pohromadě, ale hrana je
  `border-color` a podklad `color-mix` — osm nových barev přidá do měření **nula
  párů**. Tuhle mez si `PLAN.md` u té kontroly sám píše.
- **Návrh.** Dodat devět odrud a **podívat se na ně** (`SCENARE-OVLADANI.md` ř. 394:
  hodnoty pro tmavý režim se mají vidět, ne spočítat). Na začátek, L\* 55 a C\*
  o 15 % dolů, tedy ~4,4 : 1: `#a67a6b` coted · `#6d86a3` regaty/ročníky ·
  `#708b62` kalendář · `#9679a4` novinky · `#7e8490` otázky · `#598d85` náklady;
  *Oprávnění* má na tmavém papíru 4,93 a odrudu nepotřebuje.

### 6. Dvě místa pod 4,5 : 1 na drobném písmu

- **Nález.** Neaktivní položka pilulky je `--tlumeny` na `#efece7`, tedy
  **4,10 : 1** při 0,88 rem (`Kalendar`, `VerejnyRocnik`); `#efece7` navíc není
  token a na skutečném `--zvyrazneni` `#f3f0ea` (`globals.css:8`) je to 4,25, taky
  pod. `.ukoly .cim` na kartě „dnes" dává **4,39**.
- **Proč to vadí.** Neaktivní strana přepínače je ta, na kterou se kliká — a obojí
  leží nad `color-mix`, takže to kontrola změřit neumí a projde.
- **Návrh.** Idiom, který projekt má u `.podtitulek` a `--pozor-pismo`:
  `color-mix(in srgb, var(--tlumeny) 80%, var(--text))` = `#5b616d`, tedy 5,47 : 1
  na pilulce a 5,65 na kartě; podklad pilulky z `--zvyrazneni`.

### 7. Pruh dlaždic má v každém patře jinou hustotu

- **Nález.** Na okně 1280 px: ročník 8× → dlaždice **146 px**, veřejný ročník 5×
  → **238 px**, správa webu 4× → **299 px** na slovo „Ročníky". Dělá to `1fr`
  roztahující sloupce na šířku okna plus `minmax`, které se mezi maketami mění
  (7,25 rem proti 9). Osmička drží jeden řádek jen do 1037 px; pod ním sedí osmá
  dlaždice sama ve druhém řádku.
- **Proč to vadí.** Pravidlo zní „jeden tvar ve čtyřech patrech", ale týž komponent
  má v každém patře jinou hustotu — čte se to jako tři nabídky.
- **Návrh.** Všude `repeat(auto-fit, minmax(7.25rem, max-content))`
  a `justify-content: start`: dlaždice má šířku svého jména, pruh končí tam, kde
  končí taby, a osmička se vejde do řádku až k ~860 px.

### 8. Rozvržení nadpisu a telefonu zahodilo dvě hotová řešení

- **Nález a).** `h1 { white-space: nowrap }` a `.radek-nadpisu` bez `flex-wrap`;
  stojící komponenta má `flex-wrap: wrap` (`globals.css:2241`), `min-width: 0`
  (ř. 2266) a `flex: 1 1 14rem` (ř. 2248) právě proto, že se délka jména neví.
  Lano má `flex: 1` bez `min-width`, takže se scvrkne na nulu **první** — zmizí
  kanál nesoucí barvu agendy — a teprve pod ~560 px nadpis vyteče z okna.
  **Návrh:** vrátit `flex-wrap: wrap` a `min-width: 0`, lanu `min-width: 2rem`,
  `nowrap` zrušit.
- **Nález b).** `Telefon.dc.html`: padding 2 × 0,4 rem + řádek 0,85 rem × 1,2
  + rám 2 px = **31,1 px** proti doporučené mezi dotykového cíle 44 px; na text
  zbývá 96,5 px, proto „Práva" místo „Oprávnění". Tímhle pruhem se přepíná u vody,
  případně v rukavici, takže ušetřených 41 px se platí klepnutím mimo.
  **Návrh:** `padding: 0.7rem 0.4rem 0.7rem 0.55rem` → 44,3 px, pruh 145 px, do
  844 px se vejde. (Vedle toho vada makety: `.lano` má na telefonu `--ukon-coted`
  napevno, takže na jiném tabu zůstane cihlové.)

## Co bych potřeboval vědět

- **Filipovi:** *Co teď* má být jediná teplá barva, ale `--ukon-vypsani` `#7a6a52`
  (odstín 81°) a `--ukon-smernice` `#a18a4a` (89°) teplé jsou a stojí — teplé jsou
  tedy tři. Má *Co teď* zůstat barvou, nebo nést upomínku něčím, co barvu neobsadí
  (tečka u úkolu, jak ji maketa kreslí)? A je `#8a5a4a` pro tebe rozdíl proti
  `--stav-zruseny` `#8a4a4a` (ΔE 11,3), když vedle sebe stojí na Správě?
- **Ergonomii (1):** nebere návrh z bodu 3 něco, co pořadatel u vody potřebuje —
  poznat **nevybranou** dlaždici podle barvy dřív, než přečte jméno?
- **UX (3):** pilulka, pruh stavu a tabulka jsou tři pásy se stejnou mezerou
  0,85 rem, takže nic neseskupují. Patří pilulka k obsahu pod sebou (pak 0,35 rem
  po ní a 1,1 rem před ní), nebo k nadpisu?
- **Jachtingu (5):** znamená okrová `#a18a4a` na vodě směrnice, nebo si ji
  Oprávnění může vzít a Směrnice se posune?

## Čeho se nedotýkám

Jména tabů, zkratky na telefonu („Práva" jako třetí jméno téhož) a texty nechávám
jazyku (4). Počet tabů, délku průchodu, jestli *Otázky* v pruhu mají být, prázdné
stavy, chování při chybě a obsah tabu *Výsledky* nechávám ergonomii (1) a UX (3).
