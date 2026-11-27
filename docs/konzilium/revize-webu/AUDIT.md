# Audit webu měřením (27. 11. 2026)

Podklad konzilia. Sepsal moderátor před kolem 1; **je to první průchod, ne
úplný seznam** — obory mají najít, co měření nevidí.

## Jak se měřilo

- Kód na `main` k 27. 11. 2026 (`69e42c75`), web proti mocku
  (`tools/fake-api.py`, ročník `2026-nanecisto`, regata `radavsky-pohar`).
- **50 obrazovek**: 27 veřejných, 19 ve správě jako správce ročníku, zbytek
  osobní stránky. Každá na **375 × 812** s dotykovým ukazatelem a na
  1280 × 900 s myší; kontrast ve tmavém i světlém vzhledu.
- Skript v prohlížeči četl vykreslenou stránku: šířku dokumentu, výšku
  dotykových cílů, velikost písma, kontrast textu proti nejbližšímu plnému
  podkladu, úrovně nadpisů, vodorovně rolující bloky.
- **Co měření nevidí:** jestli je obrazovka hezká, jestli dává smysl, jestli
  sedí na praxi. A **úvodní fotku** — mock ji nemá; je vidět jen na produkci
  (`https://orlickypohar.klihovka.cz`).
- Očima moderátor viděl jen úvodní stránku a průběžné pořadí na telefonu.
  Zbytek je z čísel a ze struktury stránky.

## A. Vady

| # | Co | Změřeno |
|---|---|---|
| A1 | **Pět stránek na telefonu přetéká do šířky.** Nadpis „ročník — agenda" se neláme. | `span.nadpis-ukonu` má 396 px v `h1` širokém 335 px. Dokument: veřejné Průběžné pořadí 416 px, Pravidla ročníku 412, Lodě ročníku 385; správa Lodě 403, Zápis výsledků 403. Kalendář a Novinky se vejdou jen kratším slovem. |
| A2 | **Tabule je na telefonu nečitelná.** | Písmo 2,9–4,3 px; televizní rozvržení se jen zmenší. Vede na ni odkaz z veřejné regaty. |
| A3 | **Kódy DNC a DSQ v průběžném pořadí.** | 8,64 px. |

## B. Dotykové cíle pod 44 px (šířka 375, dotykový ukazatel)

| Kde | Co | Výška |
|---|---|---|
| každá stránka | kebab a přepínač vzhledu v hlavičce | 32 px |
| každá stránka s drobečky | odkazy v drobečcích | 16 px |
| veřejná regata | štítek „Máš roli v ročníku →" / „Spravuješ tuhle regatu →" | 23 px |
| průběžné pořadí | odkazy v hlavičce sloupců (zkratky regat) | 15 px |
| úvodní stránka | odkazy „Odjeto 7 z 8 regat", „Celé pořadí →" apod. | 16 px |
| úvodní stránka | řádek třídy v pořadí | 26 px |
| zápis rozjížďky | 37 polí pořadí a 37 výběrů kódu | 35 px |
| přihlášky | „Vystavit kód k připojení" ×16 | 21 px |
| výsledky regaty | zaškrtnutí „do poháru" | 23 px |
| polohy lodí | „Stáhnout" ×3 | 21 px |
| oprávnění ročníku | „Odebrat" ×3, výběry 38 px | 32 px |
| kalendář | „Schovat ročník před veřejností" | 32 px |
| články | výběr regaty | 39 px |

Mez 44 px se zaváděla po jednotlivých obrazovkách (dlaždice pruhu, štítek
role, šipky přesunu, krok vpřed, položky nabídky). **Základní pravidlo pro
`button`, `input`, `select` pod `@media (pointer: coarse)` neexistuje.**

## C. Hustota správy (šířka 375)

| Obrazovka | Výška | Cílů | Tlačítek | Co se opakuje |
|---|---|---|---|---|
| přihlášky regaty (16 lodí) | 3,7 obr. | 67 | 34 | u každé lodi „Vystavit kód k připojení", „Zrušit prezenci", „Podrobnosti" |
| kalendář (8 regat + 7 akcí) | 2,9 obr. | 84 | 18 | u každé regaty 7 odkazů (vypsání, směrnice, trať, přihlášky, rozjížďky, polohy, medailonek), „Stáhnout z webu" ×8, „Vrátit mezi vypsané" ×7, „Upravit termín a údaje" ×8 |
| články | 3,4 obr. | 51 | 26 | — |
| zápis rozjížďky (37 lodí) | 4,1 obr. | 86 | 2 | pole + výběr na řádek, tabulka 487 px v 333 px |
| polohy lodí | 3,5 obr. | 27 | 7 | — |

Sedm odkazů na kartě regaty v kalendáři vede tam, kam pruh dlaždic v okně
regaty (`web/app/sprava/pruh-ukonu.tsx`).

Karta rozjížďky měla tentýž vzorec (18 stejných tlačítek) a 18. 11. 2026
dostala jeden zvýrazněný krok a zbytek pod „Další úkony" — viz
`web/lib/workflow.ts` a `web/app/sprava/[serie]/vysledky/[zavod]/page.tsx`.

## D. Délka a šířka obsahu

- **Nápověda:** 15,8 obrazovky na telefonu, 9,8 na monitoru; čtyři tabulky
  rolují vodorovně (až 711 px v 333 px).
- **Osobní údaje:** 5,8 obrazovky; tabulky 955 a 1416 px v 333 px.
- **Vypsání regaty:** 4,5 obrazovky na telefonu.
- **Novinky ročníku:** 6,4 obrazovky.
- **Úvodní stránka:** 3,8 obrazovky; první odkaz na regatu je 543 px od
  horního okraje.

## E. Vzhled

- **Pevné pruhy na telefonu:** lepivá hlavička 67 px + pruh počasí
  (`details.paticka-pocasi`) 57 px = **124 z 812 px (15 %)** trvale.
- **Kontrast pod 4,5 : 1 (tmavý vzhled):** `.tlacitko` na oprávnění ročníku
  2,35; zvýrazněné slovo agendy v nadpisu (`.agenda`) 3,99–4,49 podle
  obrazovky. Ve světlém vzhledu `.agenda` 4,25–4,48, jinak čisto.
- **Písmo pod 12 px:** popisky měsíců v kalendáři 10,88 px, „Přítok / Odtok"
  10,88, podtitul úvodu 11,52, „Foto …" 11,2, štítky stavu ve správě 11,2.
- **Oddělovač drobečků** má kontrast 1,26–1,39. Je to ozdoba, ne text.

## F. Co je v pořádku

- Každá z 50 stránek má právě jeden `h1` a žádnou přeskočenou úroveň nadpisů.
- Žádný obrázek bez `alt`.
- Na 1280 px nepřetéká nic.
- Světlý vzhled nemá kromě `.agenda` žádný text pod 4,5 : 1.

## G. Co moderátor neposoudil

- úvodní fotku a celkový dojem z úvodu (mock ji nemá);
- obrazovky správy očima — jen z čísel;
- mobilní appku (není předmětem);
- role pořadatele jediné zastávky a rozhodčího — měřilo se jako správce
  ročníku (`op_token=filip`).
