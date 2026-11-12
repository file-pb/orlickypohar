# Konzilium nad návrhem správy (12. 11. 2026)

Pět odborníků, tři kola, na konci závěr. Každý mluví za svůj obor a **nikdo
nepřepisuje kód** — výstupem je posudek, ne commit.

## Co se posuzuje

Návrh, který sjednocuje ovládání celého webu do jednoho tvaru: **okno
s pruhem dlaždic (tabů) nad obsahem**, ve čtyřech patrech. Vznikl ze sezení
s Filipem (majitel projektu) nad patnácti postřehy ze snímků obrazovek.

Celý rozbor i důvody jsou v `docs/PLAN.md`, oddíl **„Ergonomie správy: jedno
okno ve čtyřech patrech (12. 11. 2026)"** — začíná na řádku 7524. **Přečti ho
první**, je to nejhutnější zdroj.

Osm obrazovek návrhu leží v `docs/konzilium/navrh/` jako `.dc.html`. Jsou to
statické makety, ne aplikace: čti je jako zdroj (rozvržení, texty, barvy).

| Soubor | Co ukazuje |
|---|---|
| `Main.dc.html` | správa ročníku, tab **Co teď** |
| `Regaty.dc.html` | správa ročníku, tab **Regaty** |
| `Kalendar.dc.html` | správa ročníku, tab **Kalendář** (+ vnitřní přepínač Pohár / Komunitní akce) |
| `Sprava.dc.html` | patro výš: správa webu, tab **Ročníky** |
| `Clanky.dc.html` | správa webu, tab **Obecné články** |
| `OpravneniWebu.dc.html` | správa webu, tab **Oprávnění na celý web** |
| `VerejnyRocnik.dc.html` | veřejný ročník, tab **Průběžné pořadí** |
| `Telefon.dc.html` | tentýž ročník na telefonu (390 px) |

## Čtyři patra, jeden tvar

| Patro | Taby | Stav |
|---|---|---|
| Veřejný ročník | Úvod · Kalendář · Průběžné pořadí · Přihlášené lodě · Novinky | navrhuje se |
| Veřejná regata | Úvod · Vypsání závodu · Plachetní směrnice · Závodní trať · Startovní listina · Výsledky | **už stojí** |
| Správa webu | Ročníky · Obecné články · Oprávnění na celý web · Co web stojí | navrhuje se |
| Správa ročníku | Co teď · Regaty · Kalendář · Výsledky · Lodě · Novinky · Otázky · Oprávnění | navrhuje se |
| Správa regaty | dlaždice úkonů (Výsledky, Přihlášky, Směrnice, Trať, Polohy) | **už stojí** |

Pravidla, na kterých návrh stojí:

1. **Jeden pruh naráz.** Na obrazovce je pruh jejího patra a nic víc; nadřazená
   patra nese drobečková navigace.
2. **Taby se vypisují podle práv** toho, kdo je přihlášený, takže pruh je
   zároveň odpověď na otázku „co vlastně můžu spravovat".
3. **Vnitřní přepínač má jiný tvar** — segmentovaná pilulka, ne druhý pruh
   dlaždic.
4. **Barva patří agendě, ne patru.** Výsledky mají tutéž barvu v ročníku
   i u regaty. Výjimka je *Co teď*: jediná teplá barva na webu, protože to není
   agenda, ale upomínka.
5. **Žádná adresa se nemění** — mění se hlava stránky, ne cesty.

## Kontext, který je potřeba znát

- `CLAUDE.md` — konvence projektu, pojmenování (doménové entity česky bez
  diakritiky), pasti prostředí.
- `docs/SCENARE-OVLADANI.md` — 37 scénářů ovládání a co našla dosavadní sezení
  (skupiny E a F, ukazování rozhodčímu). **Tady je doloženo, kde lidi stáli
  a nevěděli kudy.**
- `docs/OPONENTURA-ROZHODCI.md` — nálezy ze sezení s rozhodčím Milošem
  Zvonařem; nálezy R1–R41. Hlavně **R10** (co má být na stránce regaty
  a v jakém pořadí) a **R28** (jak Miloš sám pojmenoval dlaždice).
- Kód: `web/lib/co-smim.ts` (co kdo smí a jak se z toho skládají položky),
  `web/app/prepinac-sekci.tsx` (komponenta dlaždic), `web/app/sprava/`.

## Kdo sedí u stolu

| Session | Obor |
|---|---|
| `1-ergonomie` | ergonomie ovládání — kolik kroků, kolik hledání, práce pod tlakem |
| `2-design` | vizuální design — hierarchie, barva, typografie, rytmus |
| `3-ux` | UX — toky, role, prázdné stavy, chování při chybě |
| `4-jazyk` | názvosloví a čeština — jména tabů, texty, skloňování, rod |
| `5-jachting` | jachting a ČSJ — co sedí na skutečný závod a pravidla ZPJ |

## Jak se píše posudek

Do `docs/konzilium/<tvoje-session>-kolo1.md` (např. `1-ergonomie-kolo1.md`).
**Nesahej na cizí soubory a nic necommituj.**

Posudek drží tuhle stavbu a **nic navíc**:

```markdown
# <obor> — kolo 1

## Co je dobře
Nejvýš pět bodů. U každého proč, ne jen že.

## Co je špatně
Seřazené podle toho, co bolí nejvíc. U každého bodu:
- **Nález** — co konkrétně, na které obrazovce
- **Proč to vadí** — následek, ne dojem
- **Návrh** — jedna konkrétní změna, ne seznam možností

## Co bych potřeboval vědět
Otázky na ostatní odborníky nebo na Filipa. Jmenuj obor, komu je kladeš.

## Čeho se nedotýkám
Co jsi vědomě nechal jinému oboru.
```

Pravidla pro všechny:

- **Nálezy podkládej.** Odkaz na soubor a řádek, na scénář, na nález
  z oponentury, nebo na změřenou věc. Dojem označ jako dojem.
- **Žádné přepisování.** Když navrhuješ jinou formulaci nebo tvar, napiš ji
  do posudku; neměň maketu ani kód.
- **Stručně.** Posudek do 150 řádků. Filip čte rychle a chce rozhodnutí.
- **Nesmlouvej sám se sebou.** Když je něco podle tvého oboru špatně,
  napiš to rovnou, i kdyby to bylo rozhodnuté.

## Jak poběží kola

1. **Kolo 1** — každý svůj posudek, bez čtení ostatních.
2. **Kolo 2** — moderátor rozešle, co napsali ostatní; každý reaguje na to,
   co se ho týká, a kde si protiřečíte, hájí nebo ustupuje.
   Výstup: `<session>-kolo2.md`.
3. **Kolo 3** — jen sporné body: co zůstává nerozhodnuté a co každý považuje
   za podmínku, bez které se stavět nemá. Výstup: `<session>-kolo3.md`.

Závěr píše moderátor; shoda ani jednohlasnost se nevyžaduje — nesouhlas se
zapíše i s důvodem.
