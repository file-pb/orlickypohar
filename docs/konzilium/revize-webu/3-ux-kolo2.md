# UX — kolo 2

Úvod jsem tentokrát změřil v prohlížeči na **375 × 812** (mock, po sezóně). Den regaty, běžící
rozjížďku ani nepodepsané výsledky mock nemá — co o nich píšu, je **z kódu**.

## Kde ustupuju

**A — 5-jachtingu a 9-rizikům: kroky zpět na kartu v kalendáři nepatří.** Tři důvody z toku:
- Po úkonu se kalendář vrací nahoru bez kotvy (`kalendar/akce.ts:27–32`); na stránce jedné regaty
  člověk přistane tam, kde klepl. Tím padá i nález 4 psychologa.
- Osm sbalených „Další úkony" na seznamu je totéž opakování ×8, které audit C vytýká.
- Regata dnes nemá domov pro vlastní údaje: `/sprava/{ročník}/zavod/{regata}` jen přesměruje
  (`zavod/[zavod]/page.tsx:60–75`) a drobeček se jménem regaty tak z Přihlášek odvede na Rozjížďky.

**Kde v okně:** nová stránka **„Termín a stav"** na `…/zavod/{regata}/stav` (stará adresa dál
přesměrovává, rámec 9 drží). Nese „Upravit termín a údaje", kroky zpět a skrytí, každý s větou
následku. Vede na ni odkaz hned za štítkem stavu v nadpisu okna, ne sedmá dlaždice — pruh už bere
144–195 px (1-ergonomie, nález 6). Karta v kalendáři: termín, název, stav, **krok vpřed**,
„Otevřít regatu →".

**E — 7-psychologovi v tom, co jsem nepokryl:** adresu tabule může někdo dostat přímo, takže pod
prahem má na ní stát rozcestník. Odkaz v pruhu upozornění držím po svém, viz níž.

## Kde držím

**B — výstraha o souhlasu z hlavičky pryč; souhlas v řádku jen s krokem.**
- Proti 5-jachtingu: pro už zapsanou loď správa žádný úkon „zaznamenat souhlas" nemá — jde to jen
  při zápisu nové lodi (`prihlasky/[zavod]/page.tsx:203–217`), v Podrobnostech je pouhý text.
  Znak v řádku by tedy svítil 16× a nešel zhasnout: stejný šum, jen rozstrkaný po řádcích.
- Podmíněně: **vymáhá-li se souhlas u stolu registrace** (5 tvrdí že ano, R9), patří do řádku
  jako třetí stav *a* do Podrobností přibude „Zaznamenat souhlas". Nevymáhá-li, stačí věta
  s počtem nad seznamem (7-psycholog).
- **Řádek na 375 px** (karta, shora dolů):
  1. `CZE 434` tlumeně · **FAR STAR III** · Nikola Bureš
  2. stavy slovem: `prezence: čeká` · `startovné: nezaplaceno` · (`souhlas: chybí` — jen s krokem)
  3. jedno tlačítko přes šířku, 44 px, podle stavu: z webu „Přijmout přihlášku", přihlášená
     „Potvrdit prezenci", potvrzená **žádné**; vedle „Podrobnosti".
  Do Podrobností: posádka, startovné, kód, zrušení prezence, k doplnění, odmítnutí, smazání.
- Když se rozhodne proti: 16 znaků bez úkonu naučí oko přeskakovat řádek, ne jen hlavičku.

**C — stavová věta je první odkaz stránky a je sama na fotce.** Změřeno dnes: pás fotky y 45–245,
podtitul 11,52 px na y 131 (37 px), věta 14,4 px na y 177 (48 px), „Průběžné pořadí" y 285, první
regata y 543. Můj seznam pro 375 × 812, návštěvník, hlavička podle bodu D:

| # | Co | Jak velké | Výška |
|---|---|---|---|
| 1 | hlavička (pevná) | — | 67 |
| 2 | pás fotky; ve spodních 80 px **jen stavová věta**, celá odkazem | 22,4 px / 700, nejvýš 2 řádky | 200 |
| 3 | věta pro cizího, na `--pozadi`, ne na fotce | 16 px, 2 řádky | 64 |
| 4 | dvě tlačítka vedle sebe: krok závodníka · Výsledky | 44 px | 60 |
| 5 | karta nejbližší regaty (dnešní 335 × 65); po sezóně odpadá | — | 81 |

Součet 472 px; zbývá 340 px minus dolní pevné pruhy (0–121 podle D) na začátek „Průběžného
pořadí". První odkaz na regatu je na y ≈ 190 místo 543 (v sezóně; po sezóně vede na pořadí).
**Z první obrazovky vypadne:** podtitul verzálkami, „Odjeto N z M" jako samostatný odkaz, „Vedou…"
v sezóně (jde do nadpisu bloku pořadí), jedoucí řádky pořadí, novinky, celý kalendář.
- Proti 8-pr a 7: věta pro cizího se na fotku nevejde spolu se stavovou — 48 + 56 px proti
  80 px závoje, které hájí 10-grafik. Na fotce zůstane ta, která je odkazem.
- Když se rozhodne proti: nejtěžší text stránky bude buď bez odkazu, nebo pod 44 px.

**E — odkaz „Sledovat na tabuli →" na telefonu vede na Výsledky, bez mezizastávky.**
- Proti 2-designu: odkaz jen schovat nestačí — věta „Právě se jede" pak nikam nevede.
- **Jeden práh, z kódu, ne odhadem:** tabule se škáluje `--tv: min(1vw, 1.78vh)`
  (`globals.css:3690`) a její písma jsou 0,65–3,4 × `--tv`, 21 pravidel z 55 nejvýš 0,9.
  Prahy 600 a 700 px pustí telefon naležato: 812 × 375 dá `--tv` 6,7 px, běžný řádek 6,7 px.
  Práh je **`--tv` pod 10 px**, tedy `(max-width: 999px), (max-height: 561px)`.
- Jedna podmínka na dvou místech, obojí CSS: v pruhu upozornění dva odkazy (Výsledky / tabule),
  na adrese tabule rozcestník místo rozvržení.
- K podmínce 5-jachtingu: **není nutná před schováním** — písmo 2,9 px nikomu nic nebere. Určuje
  ale znění: rozcestník nesmí slíbit „totéž", dokud „Vydáno k regatě" na stránce regaty není.
  Do té doby: „Tabule je obrazovka do klubovny. Výsledky a startovní listina jsou u regaty →".

**H — jedno pravidlo.** *Druhé klepnutí dostane úkon, který něco bere — maže, skrývá před
veřejností nebo vrací stav zpět — a jehož následek dopadne mimo obrazovku, na které se klepe.
Krok vpřed ho nedostane nikdy; ten má následek ve jménu.*
- **Spadne pod něj:** Smazat přihlášku · Stáhnout verzi směrnice (maže soubor) · Odebrat
  a Nahradit fotku papíru (dokud se neverzuje) · Schovat ročník · Skrýt regatu s výsledky venku ·
  krok zpět z Odjeté · Zrušit prezenci u lodi s výsledky (pokud ji server dál pustí).
- **Nespadne:** Zrušit prezenci bez výsledků, potvrzení, Zveřejnit, Pustit ven (krok vpřed —
  9-rizika mu správně dává telefony do jména), kód, přesuny pořadí.
- **Odebrat roli** (bod 15 z 12. 11.): následek dopadne jinam a řádek zmizí, takže pod pravidlo
  spadne — **leda** že hláška po odebrání nese „Vrátit roli {jméno}". Pak stačí jedno klepnutí.
- Když se rozhodne proti (všude druhé klepnutí): u stolu registrace se „Opravdu" odklepává
  naslepo a přestane chránit i Smazat.

## Kde jsme se shodli

- Karta v kalendáři: stav, krok vpřed, „Otevřít regatu →"; sedm odkazů pryč.
- Přihlášky: jeden krok s vahou, kód a zrušení prezence do Podrobností; seznam šestnácti jmen
  bez souhlasu nad tabulku nepatří (1 ho chce pod seznam, 7 jako větu, já pryč — tvar je volný).
- Televizní rozvržení se pod prahem nevykreslí a odkaz z regaty na něj na telefonu nevede.
- Následek úkonu větou; vratný úkon s následkem na téže obrazovce druhé klepnutí nedostává.

## Nové, co vylezlo z cizích posudků

- **`jedeSeDnes` už existuje a slouží jen bleskům** (`upozorneni.tsx:76`, `hlava.tsx:144`). Věta
  „Právě se jede" (`:120`) se jím jen podmíní — tím je vyřízen nález 7 od 8-pr i „Dnes se jede"
  od 5-jachtingu, bez nového modelu.
- **„Zrušit prezenci" u lodi s výsledky dnes projde.** `Prihlasky.cs:114–117` odmítá u takové lodi
  jen stavy Zrušena, Odmítnuta, K doplnění a Nedostavila; Přihlášená v seznamu není. Hláška na
  témž řádku přitom říká „má výsledky, takže přijela". Co to udělá s body třídy, jsem nečetl (9).
- **Odpovědi:**
  - *1-ergonomie:* ne — „Zapsat dojezdy" vede v den regaty na seznam rozjížděk
    (`sprava/[serie]/page.tsx:212`), ne do cíle; s formulářem nad seznamem to budou tři klepnutí.
  - *5-jachting:* z kódu — stejně jako týden předtím. Den regaty stránka nepozná; věty pruhu visí
    na stavu rozjížďky, takže do založení první rozjížďky přibude nejvýš řádek o bleskách.
  - *7-psycholog:* nevidí. Návrat nemá kotvu, hláška regatu jmenuje, karta je o 1–2 obrazovky níž.
  - *2-design:* záměrně nikdo — jediný odkaz se objeví při běžící rozjížďce, takže divák nebo
    posádka na břehu, a hledá „co se jede a jak to stojí". Druhý je pořadatel, který kontroluje,
    co běží na televizi; pod prahem ji neuvidí a je to vědomá ztráta.
  - *9-rizika:* unese — žádný častý úkon registrace ani zápisu pod pravidlo z bodu H nespadá.
  - *10-grafik:* pás 320 px na monitoru unesu, pokud je stavová věta s odkazem v něm.

## Podmínka

1. **Nejdřív pravidlo na serveru, pak obrazovka.** Odjetá → Vypsaná u regaty s výsledky venku
   a Zrušit prezenci u lodi s výsledky má odmítnout API. Rozhraní nabízí to, co server pustí;
   přestěhováním tlačítka se past jen schová.
2. **Stavová věta se nezvětšuje dřív, než je pravdivá ve všech třech stavech sezóny.** Dnes říká
   po sezóně „Odjeto 7 z 8 · Vedou"; na 22 px a jako první odkaz by to byla největší nepravda webu.
