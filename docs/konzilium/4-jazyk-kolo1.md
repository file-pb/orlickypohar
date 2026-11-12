# Názvosloví a čeština v rozhraní — kolo 1

## Co je dobře

1. **Drobečky mají aria-label „Kde stojím" a pruh „Co spravuju v ročníku".** První
   osoba, otázka člověka, ne popis komponenty. Sedí to k veřejné navigaci
   *Závodím / Fandím* a je to vzácné — většina webů tam má „Navigace".
2. **Úkoly v *Co teď* mluví následkem, ne stavem.** „2 podepsané rozjížďky nikdo
   neuvidí." říká, co se stane, když nic neudělám; „nepublikováno" by to neřeklo.
   Totéž „Rozhodčí napsal, co je špatně."
3. **Nadpis je apozice, ne věta** — *Orlický pohár 2027 — Co teď*. Tím se obchází
   past „Jarní vítr uložena" (`docs/PLAN.md:5870`: věty přestavěné na první pád,
   protože „končí Vánoční regatou" se u každého jména skloňuje jinak). Jméno
   regaty ani ročníku se do nadpisu nikdy nemusí ohnout. Držet to.
4. **Štítky stavů jsou jednotná jmenná řada** — *vypsáno · odjeto · plánováno ·
   zrušeno*. Jeden rod, jeden tvar, žádné míchání s přídavnými jmény.
5. **„Účet vzniká až prvním přihlášením — rolí se pozvat nedá."** Říká pravdu
   předem, ne po chybě. Takhle má vypadat nápověda pod polem.

## Co je špatně

### 1. Zkracování jmen tabů jde proti rozhodnutí z 29. 10. 2026

- **Nález** — ročník zkracuje *Kalendář ročníku* → **Kalendář**, *Lodě a kapitáni*
  → **Lodě**, *Novinky ročníku* → **Novinky**, *Otázky k aplikaci* → **Otázky**
  (dnešní jména: `web/lib/co-smim.ts:192,228,236,246`). O patro níž, na veřejné
  regatě, stojí schválně **plná** jména — *Vypsání závodu · Plachetní směrnice ·
  Závodní trať · Startovní listina*. Komentář u `NAZVY`
  (`web/app/serie/[slug]/zavody/[zavod]/hlava.tsx:56–73`) důvod zapisuje: zkratka
  stála „dvojí jméno pro tutéž sekci" a nesrovnalost mezi tabem a nadpisem, na
  který vede — a šířku Filip připustil řešit zkratkou jen „když budeš muset".
- **Proč to vadí** — Miloš chodí do obou pater v jednom sezení (R10, R28). Když je
  jednou jméno celé a podruhé zkrácené, nedá se odvodit pravidlo, a pruh přestane
  být odpověď na „co můžu spravovat". Bublina pod myší to nespraví: na telefonu,
  kde rozhodčí u vody pracuje, žádná není.
- **Návrh** — zkrátit smí jen to, co zkrácením nepřestane být jednoznačné:
  *Kalendář* a *Novinky* ano (patro nese drobeček a nadpis), **Lodě → Lodě
  a kapitáni** a **Otázky → Otázky k aplikaci** zůstávají celé.

### 2. *Výsledky* ve správě ročníku: jméno slibuje výstup, obsah je proces

- **Nález** — pod tabem leží rozjížďky, workflow, trať, kdo je na vodě i lodě
  (Filipův postřeh 12, `docs/PLAN.md`). Vedle toho je *Výsledky* jméno veřejného
  tabu regaty, kde je hotová tabulka — a návrh jim dává tutéž barvu
  (`--ukon-vysledky`), takže se tvrdí, že je to tatáž agenda.
- **Proč to vadí** — porušuje to pravidlo, které si projekt sám vyvodil v R28:
  veřejná dlaždice se nejmenuje „trať", ale **„předpokládaná trať"**, protože
  jinak slibuje víc, než je pravda. Tady je to naopak — jméno slibuje **méně**
  práce, než za ním je, takže pořadatel hledá zápis z vody jinde.
- **Návrh** — ve správě **Rozjížďky**, venku zůstává **Výsledky**. Projekt tu
  asymetrii už jednou vědomě přijal: *Závodní trať* venku, *Bóje na trati* ve
  správě, s důvodem „venku se na trať dívám, ve správě ji stavím" (R10).
  Dvojice „ve správě se zapisují rozjížďky, venku jsou výsledky" se naučí jednou.

### 3. *Otázky* nejde pojmenovat, protože ten tab v pruhu nemá co dělat

- **Nález** — v řadě *Kalendář · Výsledky · Lodě · Novinky · **Otázky** ·
  Oprávnění* se *Otázky* čtou jako dotazy závodníků nebo nápověda pro veřejnost.
  Obsah je oponentura — otázky **Filipa na rozhodčího o aplikaci**
  (`co-smim.ts:246`).
- **Proč to vadí** — není to agenda ročníku, je to kanál zpětné vazby na software.
  Žádné jméno to nespraví: krátké lže, plné (*Otázky k aplikaci*) je v pruhu
  agend cizí slovo.
- **Návrh** — vyvést z pruhu ročníku do Správy webu jako **Otázky k aplikaci**
  (patří k webu, ne k ročníku). Tím se zároveň zodpoví otevřená otázka z plánu.

### 4. „Okno" je slovo návrhu, ne uživatele — a je ve dvou popiscích

- **Nález** — *Sprava*: „Ročník se otevře do vlastního okna — Co teď, regaty…";
  *Regaty*: „Klepnutím se otevře okno regaty…"; *OpravneniWebu*: „Role
  v jednotlivých ročnících se udělují v jejich vlastním okně."
- **Proč to vadí** — pro pořadatele je *okno* to, co má na obrazovce operační
  systém. Je to interní jméno tvaru z tohohle sezení, které uniklo do textu.
- **Návrh** — „Klepnutím se otevře regata — přihlášky, směrnice, trať, výsledky
  a polohy pohromadě." / „Role v jednom ročníku se udělují v tom ročníku."

### 5. *Legislativa* je nejúřednější slovo v celém návrhu

- **Nález** — veřejná navigace *Závodím · Fandím · **Legislativa***
  (`VerejnyRocnik.dc.html`), pod ní Pravidla, Nápověda, Osobní údaje.
- **Proč to vadí** — nápověda není legislativa, a vedle dvou sloves v první osobě
  stojí latinismus z úředního jazyka. Dvě různé mluvy v jednom řádku.
- **Návrh** — **Pravidla** (Nápověda a Osobní údaje pod tím). Veřejné menu se
  podle plánu rozhoduje najednou s bodem 2, tak ať se rozhodne i tohle slovo.

### 6. Telefon mluví jinak než počítač

- **Nález** — `Telefon.dc.html`: tab **Práva** místo *Oprávnění*, drobeček **Pohár
  2027** vedle nadpisu *Orlický pohár 2027*, a v `h1` **chybí pomlčka** —
  „Orlický pohár 2027 Co teď", dvě jména slepená bez vztahu. Navíc tam zůstala
  věta pro recenzenta: „Pruh partnerů tu není — rozhodčí a správce ho nevidí
  nikde."
- **Proč to vadí** — tři jména pro jeden tab (*Oprávnění* / *Oprávnění na celý
  web* / *Práva*) a slepený nadpis na jediné obrazovce, kde se pracuje pod tlakem.
- **Návrh** — *Práva* → **Oprávnění**, doplnit pomlčku, věta o pruhu partnerů ven
  (vysvětluje nepřítomnost, které si nikdo nevšiml). Jestli se 390 px nevejde,
  zkracuje se to jméno, které zkrácením neztratí význam, ne tohle.

### 7. Věty, hlášky a popisky — dnešní znění → navržené znění

| Kde | Dnes | Navrženo |
|---|---|---|
| Main, úkol | 3 ze 4 rozjížděk **čeká** na tvůj podpis. | 3 ze 4 rozjížděk **čekají** na tvůj podpis. *(číslovka 2–4 → množné číslo)* |
| Main, Mimo ročník | Obecné články · Oprávnění na celý web · Co web stojí — role, které platí ve všech ročnících, jsou o patro výš ve Správě. | Obecné články, oprávnění na celý web a to, co web stojí, jsou o patro výš ve **Správě**. *(dnes se podmět vymění uprostřed věty: vztažná část sedí jen na jednu ze tří položek)* |
| Regaty, štítek | 1× k revizi | 1 rozjížďka k revizi *(„1×" je násobná číslovka, ne počet)* |
| Regaty, průběh | zrušeno pro vítr | zrušeno kvůli silnému větru *(„pro vítr" je dvojznačné a ve sloupci, kde výš stojí regata **Jarní vítr**, se slovo přečte jako jméno)* |
| Kalendář, hlava + pruh | „ročník je venku" a hned pod tím „**Ročník je venku.** Veřejné stránky ho ukazují i s publikovanými regatami." | V hlavě **venku od 2. 4. 2027**, v pruhu „**Ročník je venku.** Na veřejných stránkách je vidět i ty regaty, které jsou publikované." *(dnes totéž dvakrát na dvou centimetrech)* |
| Kalendář, tlačítko | Stáhnout ročník z webu | Schovat ročník před veřejností *(„stáhnout" na webu čte devět lidí z deseti jako download; u směrnice ho vývěska vysvětluje, tady vedle ní nic nestojí)* |
| Kalendář, pole | Konec, u vícedenního | **Poslední den** + nápověda „Jen u vícedenní regaty." *(dnes popisek bez podstatného jména)* |
| Kalendář, pole | Škrtá se nejhorších | Škrtá se nejhorších **rozjížděk** *(věta dnes končí přívlastkem bez jména)* |
| Kalendář, pole | Koeficient | Koeficient + nápověda, co násobí. Samotné slovo není ve slovníku pořadatele, který zakládá regatu. |
| Kalendář, pole | Ukazovat průběžné výsledky → *Ano, i nepodepsané / Až po podpisu* | **Kdy ukazovat průběžné výsledky** → *Hned, i nepodepsané / Až po podpisu rozhodčího* *(dnes se ptá ano/ne a ani jedna odpověď není „ne")* |
| Kalendář, nápověda | Zbytek — typ, vyhodnocení, pořadatel — je na regatě samotné. Sem patří jen to, co se zadává při založení. | Typ, vyhodnocení a pořadatele nastavíš až na regatě. *(druhá věta říká o formuláři jen to, co už je vidět)* |
| Články, zaškrtnutí | Text je vložený z Wordu nebo z webu | Zahodit formátování z Wordu a z webu *(popisek má říkat následek, ne odkud text je — jinak se nepozná, proč zaškrtnout)* |
| Články, nápověda | Nový článek je vždycky koncept — veřejnost ho uvidí, až ho publikuješ. | Veřejnost ho uvidí, až ho publikuješ. *(první polovinu říká tlačítko „Založit jako koncept" o tři řádky výš)* |
| Články, sloupec | Vydání | Venku od *(„vydání" je knižní a nesedí na štítek **venku** ve vedlejším sloupci; u konceptu je tam dnes „—")* |
| Články/Kalendář/Oprávnění, sloupec | Úkony | *(bez názvu)* — nad jedním tlačítkem *Upravit* je „úkony" slovo ze správního řízení; *úkon* si projekt drží pro dlaždice u regaty |
| Oprávnění, tlačítko | Udělit | Udělit roli |
| Oprávnění, poznámka | Dvě role jednoho člověka stojí na jednom řádku, ne na dvou — odebírá se ta, na kterou klepneš. | Klepnutím na roli ji odebereš. *(první polovina je důvod návrhu, ne informace pro uživatele — a věta si odporuje s tlačítkem **Odebrat**, které v řádku stojí jedno pro obě role)* |
| Veřejný ročník, hlava | po 2 z 8 regat · 15. května | po 2 z 8 regat · další 12. června *(dnes není poznat, jestli datum patří poslední odjeté, nebo nejbližší regatě)* |
| Veřejný ročník, poznámka | Čísla, která ještě neprošla rozhodčím, jsou označená. | …jsou v kurzivě. *(„označená" nutí hledat, čím; v maketě žádné označení není — přeškrtnuté DNF/OCS je jiná věc)* |
| Správa, štítek | 1 úkol čeká | Co teď: 1 *(slovo „úkol" se v samotném Co teď nikde nevyskytuje)* |
| aria-label | Hlavní | Hlavní nabídka *(ostatní jsou věty v první osobě: „Kde stojím", „Co spravuju v ročníku")* |

## Co bych potřeboval vědět

- **Filipovi:** sedí *Rozjížďky* místo *Výsledky* ve správě, nebo chceš jméno,
  které unese i „pustit ven" (třeba *Zápis a publikace*)? Je to rozhodnutí
  o slovníku, které pak drží v API, v návodu i u Miloše.
- **Filipovi:** co doopravdy udělá zaškrtnutí „Text je vložený z Wordu" — bez toho
  nejde napsat popisek, který by říkal následek.
- **Jachting (5):** je *Koeficient* slovo, které pořadatel z vypsání zná, nebo se
  mu říká jinak? A je *Škrtá se nejhorších rozjížděk* správná formulace proti ZPJ?
- **Ergonomie (1):** `h1` má `white-space: nowrap` — *Orlický pohár 2027 —
  Oprávnění na celý web* se na užším okně nezalomí. Česká jména jsou dlouhá, je
  to tvoje nebo designu?
- **UX (3):** u *Otázek k aplikaci* navrhuju přesun o patro výš. Mění ti to tok?

## Čeho se nedotýkám

Barvy a hierarchie (2-design), počet kroků a mřížka tabů na 390 px (1-ergonomie),
prázdné stavy a chování při chybě jako toky (3-ux) — posuzoval jsem jen jejich
znění, kde v maketě nějaké je. Pravidla ZPJ, názvy kategorií a tříd a slovník
startovní procedury (5-jachting). Adresy a slugy návrh nemění, tak je neřeším.
