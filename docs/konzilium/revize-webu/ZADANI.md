# Konzilium nad revizí webu Orlického poháru (27. 11. 2026)

Osm odborníků, tři kola, na konci závěr. Každý mluví za svůj obor
a **nikdo nepřepisuje kód** — výstupem je posudek, ne commit.

Sestavu i počet kol odsouhlasil Filip před prvním kolem. **Kolo 3 je
poslední** — po něm už se nic neotvírá.

## Co se posuzuje

**Živý web**, ne maketa: veřejné stránky a správa, jak jsou na `main`
k 27. 11. 2026. Filipovo zadání zní: *„projdi si web orlického poháru
a reviduj design, UX a ergonomii. Když bude potřeba, uděláme konzilium."*

Moderátor udělal první průchod měřením — 50 obrazovek na šířce telefonu
i monitoru. Výsledek je v [`AUDIT.md`](AUDIT.md). **Přečti ho první**, je to
nejhutnější zdroj. Je to ale jen to, co se dá změřit skriptem: šířky, výšky,
kontrast, počty. Jestli je obrazovka hezká, srozumitelná a sedí na praxi,
z něj nevyčteš — a přesně proto konzilium sedí.

Web za poslední dva týdny rostl po kusech: pruh dlaždic, okno ročníku,
karta rozjížďky, nabídka *Závodím / Fandím / Legislativa*, snímek z papíru.
Každý kus posoudil někdo zvlášť; **celek naposled nikdo.**

## Na co má konzilium odpovědět

Otázky, které měření nerozhodne. Čísluji je — v kolech se na ně odkazuje.

1. **Kalendář správy proti oknu regaty.** Karta regaty v kalendáři nese sedm
   odkazů, které zdvojují pruh dlaždic v okně regaty, a tři úkony včetně
   „Stáhnout z webu". Co má kalendář nést, když regata má vlastní okno?
2. **Přihlášky.** U každé z 16 lodí jsou vidět „Vystavit kód k připojení",
   „Zrušit prezenci" a „Podrobnosti" (34 tlačítek). Co má řádek lodi ukazovat
   hned a co až na vyžádání?
3. **Úvodní stránka.** Co má cizí člověk vidět jako první, v jakém pořadí
   a jak to má vypadat. První odkaz na regatu je 543 px pod horním okrajem.
4. **Pevné pruhy na telefonu.** Hlavička a pruh počasí drží trvale 15 % výšky.
   Je to dobrá cena?
5. **Tabule na telefonu.** Písmo 2,9–4,3 px. Má se na telefonu nabízet,
   mít vlastní podobu, nebo zmizet?
6. **Dlouhé stránky.** Nápověda má 15,8 obrazovky, vypsání 4,5, osobní údaje
   tabulky čtyřikrát širší než telefon.
7. **Celkový vzhled a jednota.** Působí web jako jedna věc? Kde se rozchází
   veřejná část a správa, tmavý a světlý vzhled, značka a zbytek?
8. **Cokoliv dalšího z tvého oboru**, co audit nevidí. Je to revize, ne
   kontrola seznamu.

## Rámec — co je rozhodnuté a nediskutuje se

1. **Správa je serverová, bez javascriptu.** Jediná výjimka je cílová
   obrazovka. Návrh, který chce javascript jinde, je proti zadání.
2. **Okno s pruhem dlaždic ve čtyřech patrech, jeden pruh naráz.** Rozhodlo
   konzilium 12. 11. 2026 (`docs/konzilium/ZAVER.md`).
3. **Dotykový cíl má 44 px** a obrazovka se měří na šířce telefonu.
4. **Veřejná nabídka je *Závodím / Fandím / Legislativa*.** Jméno
   *Legislativa* rozhodl Filip 18. 11. 2026; neotvírá se.
5. **Tabule nepatří do nabídky** (Filip, 13. 11. 2026); chodí se na ni od
   regaty.
6. **Na kartě má váhu jeden krok, zbytek je po ruce** — vzor z karty
   rozjížďky (18. 11. 2026), k dispozici pro další obrazovky.
7. **U vody je jeden člověk s jednou volnou rukou** a telefon může jet
   v tmavém vzhledu (Filip, 18. 11. 2026).
8. **Vady A1–A3 a cíle z oddílu B auditu se opraví tak jako tak.** Neptáme
   se *jestli*. Máš-li k tomu *jak* — třeba že A2 není vada, ale rozhodnutí —
   napiš to.
9. **Adresy se nemění.**

## Kontext, který je potřeba znát

- `docs/konzilium/revize-webu/AUDIT.md` — měření. **Čísla jsou z něj.**
- `docs/konzilium/ZAVER.md` — konzilium nad oknem správy (12. 11.), patnáct
  rozhodnutí a Filipovy odpovědi z 18. 11.
- `docs/konzilium/stavitel-trati/ZAVER.md` — konzilium nad stavitelem trati;
  odtud je pravidlo o jednom člověku u vody.
- `docs/SCENARE-OVLADANI.md` — scénáře po rolích a co o navigaci víme.
- `docs/PLAN.md` — doménový model a důvody; je dlouhý, hledej v něm.
- Kód: `web/app/page.tsx` (úvod), `web/app/layout.tsx`, `web/app/menu.tsx`,
  `web/app/paticka.tsx` (pruh počasí), `web/app/serie/[slug]/` (veřejný
  ročník a regata), `web/app/sprava/[serie]/kalendar/page.tsx`,
  `web/app/sprava/[serie]/prihlasky/[zavod]/page.tsx`,
  `web/app/sprava/pruh-ukonu.tsx`, `web/app/globals.css`.

### Jak se na web podívat

Web i mock **už běží**, nespouštěj vlastní — dva vývojové servery z téhož
adresáře se nesnesou.

- web: `http://localhost:3000`, mock API: `http://localhost:8080`
- ročník `2026-nanecisto`, regata s nejvíc daty `radavsky-pohar`
- přihlášení je cookie `op_token`: `filip` (správce ročníku), `milos`
  (rozhodčí), `dana` (správkyně celého webu); bez cookie jsi návštěvník
- **jen se dívej**: neodesílej formuláře a neklepej na úkony, mock sdílí
  všech osm oborů
- úvodní fotku mock nemá; veřejné stránky s ní jsou na
  `https://orlickypohar.klihovka.cz` (jen čtení)
- kdyby server neodpovídal, čti kód a **napiš, že jsi obrazovku neviděl**

## Kdo sedí u stolu

| Session | Obor |
|---|---|
| `1-ergonomie` | ergonomie ovládání — kolik kroků, kolik hledání, práce pod tlakem |
| `2-design` | vizuální design — hierarchie, barva jako význam, typografie, kontrast |
| `3-ux` | UX — toky, role, prázdné stavy, chování při chybě |
| `5-jachting` | jachting a ČSJ — jestli web sedí na praxi závodů: pořadí, kódy, vypsání, co kdo potřebuje v den regaty |
| `7-psycholog` | psycholog — motivace, zátěž, důvěra toho, kdo to používá |
| `8-pr` | PR a marketing — jak to působí navenek, co se dá ukázat |
| `9-rizika` | bezpečnost a rizika — co se rozbije, co se zneužije, co je nevratné |
| `10-grafik` | grafik — estetika: značka, fotka, písmo jako výraz, rytmus, celkový dojem |

**`10-grafik` je obor přidaný pro tenhle běh** na Filipovo přání. Dělí se
s `2-design` takhle: design hájí, aby obrazovka **šla přečíst** (hierarchie,
kontrast, význam barvy); grafik hájí, aby **byla hezká a jedna** (výraz,
proporce, značka, fotka, ilustrace, detail). Kde se překrývají, napíšou to
oba a rozsoudí to kola.

## Jak se píše posudek

Do `docs/konzilium/revize-webu/<tvoje-session>-kolo1.md` (např.
`1-ergonomie-kolo1.md`). **Nesahej na cizí soubory a nic necommituj.**

Posudek drží tuhle stavbu a **nic navíc**:

```markdown
# <obor> — kolo 1

## Co je dobře
Nejvýš pět bodů. U každého proč, ne jen že.

## Co je špatně
Seřazené podle toho, co bolí nejvíc. U každého bodu:
- **Nález** — co konkrétně, kde
- **Proč to vadí** — následek, ne dojem
- **Návrh** — jedna konkrétní změna, ne seznam možností

## Co bych potřeboval vědět
Otázky na ostatní odborníky nebo na Filipa. Jmenuj obor, komu je kladeš.

## Čeho se nedotýkám
Co jsi vědomě nechal jinému oboru.
```

Pravidla pro všechny:

- **Nálezy podkládej.** Odkaz na soubor a řádek, na scénář, na pravidlo, nebo
  na změřenou věc. Dojem označ jako dojem.
- **Posuzuje-li se obrazovka, měř ji na šířce telefonu** — 375 px, jako
  audit —, a to číslo v posudku uveď. Stránka otevřená na monitoru je jiná
  obrazovka než ta, na kterou se bude klepat. Nález, který šířku neuvádí, se
  čte jako nález o monitoru.
- **Žádné přepisování.** Když navrhuješ jinou formulaci nebo tvar, napiš ji
  do posudku; neměň kód.
- **Stručně.** Posudek do 150 řádků.
- **Nesmlouvej sám se sebou.** Když je něco podle tvého oboru špatně,
  napiš to rovnou, i kdyby to bylo rozhodnuté.
- **Neopakuj audit.** Co v něm je, je známé; cituj číslo a řekni, co s ním.

## Jak poběží kola

1. **Kolo 1** — každý svůj posudek, bez čtení ostatních.
2. **Kolo 2** — moderátor rozešle, co napsali ostatní; každý reaguje na to,
   co se ho týká, a kde si protiřečíte, hájí nebo ustupuje.
   Výstup: `<session>-kolo2.md`, do 120 řádků.
3. **Kolo 3** — **poslední**. Jen sporné body, s hlasováním. Výstup:
   `<session>-kolo3.md`, do 60 řádků.

Závěr píše moderátor; shoda ani jednohlasnost se nevyžaduje — nesouhlas se
zapíše i s důvodem.
