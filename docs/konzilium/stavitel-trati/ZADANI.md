# Konzilium nad návrhem přepracování stavitele trati (17. 11. 2026)

Pět odborníků, tři kola, na konci závěr. Každý mluví za svůj obor
a **nikdo nepřepisuje kód** — výstupem je posudek, ne commit.

## Co se posuzuje

**Stavitel trati** je obrazovka v mobilní appce Orlického poháru, na které
pořadatel nebo rozhodčí zapisuje trať tím, že z motoráku pípá polohu
u jednotlivých značek. Postavila se 16. 11. 2026 a **nikdy neběžela na
vodě** — všechno, co o ní víme, je z kódu a z testů na Node.

Čím to začalo: Filip si ji prohlédl a napsal *„koukl jsem zběžně a chtělo
by to trochu zapracovat taky na ergonomii a designu."* Žádný konkrétní
nález, dojem z letmého pohledu. Moderátor z toho dojmu sepsal návrh
přepracování — **a ten návrh je to, co posuzujete.** Není rozhodnutý;
je k rozcupování.

**Celý rozbor i důvody jsou v `NAVRH.md` vedle tohohle souboru. Přečti ho
první**, je to nejhutnější zdroj. Jeho teze zní: *pípni teď, popiš potom* —
pípnutí je dnes až třetí krok průvodce, přestože poloha je jediná věc,
která mizí.

Pět maket leží v `navrh/`. Jsou to **statické HTML soubory**, ne aplikace:
čti je jako zdroj. Nesou skutečné barevné tokeny appky
(`app/src/constants/theme.ts`, světlé téma), takže kontrast se na nich dá
měřit doopravdy.

| Soubor | Co ukazuje |
|---|---|
| `navrh/Main.dc.html` | klidový stav: stav polohy, co stojí, trvalé *Pípni* |
| `navrh/Popis.dc.html` | po pípnutí: jeden seznam konkrétních prvků |
| `navrh/Dvoubod.dc.html` | rozestavěná brána: vzdálenost od prvního bodu |
| `navrh/Fronta.dc.html` | bez signálu a zaseknutý prvek |
| `navrh/Zamek.dc.html` | přijatá trať, jen ke čtení |

## Rámec, ve kterém návrh stojí

Pravidla, která se **nediskutují** — jsou rozhodnutá a návrh na nich stojí:

1. **Žádná nová nativní závislost.** Otisk appky se nesmí pohnout, jinak si
   všichni musí ručně přeinstalovat APK. Vylučuje to fotoaparát, mapu
   i cokoliv, co potřebuje nový modul. Návrh fotky a mapu schválně nemá.
2. **Prvek se zapisuje jedním požadavkem.** `POST …/trat/prvky/postav`
   zapíše prvek i obě značky v jedné transakci. Návrh mění pořadí otázek
   v rozhraní, **ne tvar zápisu** — API se nedotýká.
3. **Odmítnutý prvek zastaví frontu celou.** Pořadí prvků na trati určuje
   pořadí, v jakém dorazí na server, takže přeskočit zaseknutý prvek by
   trať poskládalo jinak, než ji stavitel postavil. Ven z toho vede jen
   zahození, a to je rozhodnutí člověka.
4. **Klepací cíle nejméně 44 pt.** Hlídá `tools/kontrola-dotyku.py`, který
   měří zdrojový kód appky, ne makety.
5. **Pravidla průvodce jsou sdílená s webem.** `packages/stavba/` se
   rozkopírovává do `web/lib/` i `app/src/lib/`; co se změní tam, změní se
   oběma klientům. CI to hlídá.
6. **Server je autorita na pravidla.** Klient jen šetří cestu; co pustí
   appka a odmítne server, skončí zaseknuté ve frontě.
7. **Stavitel je pořadatel, rozhodčí — a nově i pomocník.** Rozšíření
   oprávnění na zaškrtnutého pomocníka je rozhodnuté, ale ještě nepostavené;
   počítejte s tím, že obrazovku bude obsluhovat i člověk, který přijel na
   jednu regatu vypomoct.

## Kontext, který je potřeba znát

- `NAVRH.md` — **čti první.** Šest nálezů, návrh ke každému, a pět otázek,
  které moderátor klade konziliu.
- `app/src/app/serie/[slug]/zavody/[zavod]/stavba.tsx` — dnešní obrazovka,
  průvodce o pěti krocích a styly na konci souboru.
- `packages/stavba/stavba-prvku.ts` — pravidla průvodce: `TYPY`, volby,
  jména bodů. **Sdílené s webem.**
- `app/src/lib/stavba/poloha.ts` — kdy se poloha smí vzít jako pípnutí.
  Jádro je **stáří fixu**, ne přesnost.
- `app/src/lib/stavba/fronta.ts` — fronta prvků a pravidlo, že odmítnutý
  zastaví pořadí.
- `docs/ZKOUSKA-STAVITELE.md` — co se má na telefonu vyzkoušet a co je
  známé omezení.
- `docs/PLAN.md`, oddíl *Stavitel trati v appce* a *Obrazovka v appce je
  postavená* — proč obrazovka vypadá takhle.
- Webový protějšek: `web/app/sprava/[serie]/boje/[zavod]/stavba.tsx`.

## Kdo sedí u stolu

| Session | Obor |
|---|---|
| `1-ergonomie` | ergonomie ovládání — kolik kroků, kolik hledání, práce jednou rukou v rukavicích |
| `2-design` | vizuální design — hierarchie, barva, typografie, kontrast na slunci |
| `3-ux` | UX — toky, role, prázdné stavy, chování při chybě |
| `7-psycholog` | psycholog — zátěž, důvěra, chování při nejistotě, odpovědnost za trať |
| `9-rizika` | bezpečnost a rizika — co se rozbije, co je nevratné, co selže tiše |

## Jak se píše posudek

Do `docs/konzilium/stavitel-trati/<tvoje-session>-kolo1.md` (např.
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
Otázky na ostatní odborníky nebo na zadavatele. Jmenuj obor, komu je kladeš.

## Čeho se nedotýkám
Co jsi vědomě nechal jinému oboru.
```

Pravidla pro všechny:

- **Nálezy podkládej.** Odkaz na soubor a řádek, na scénář, na závodní
  pravidlo, nebo na změřenou věc. Dojem označ jako dojem.
- **Kde se dá měřit, měř** — a měř proti **skutečným tokenům**
  v `app/src/constants/theme.ts`, ne proti maketám.
- **Žádné přepisování.** Když navrhuješ jinou formulaci nebo tvar, napiš ji
  do posudku; neměň maketu ani kód.
- **Stručně.** Posudek do 150 řádků.
- **Nesmlouvej sám se sebou.** Když je něco podle tvého oboru špatně,
  napiš to rovnou, i kdyby to bylo rozhodnuté.
- **Rozlišuj vadu makety od vady návrhu.** Zástupná jména lodí, čísla
  rozjížděk a vymyšlené souřadnice jsou nedbalost makety. Hlas je, jen
  když z nich plyne něco o návrhu.

## Jak poběží kola

1. **Kolo 1** — každý svůj posudek, bez čtení ostatních.
2. **Kolo 2** — moderátor rozešle, co napsali ostatní; každý reaguje na to,
   co se ho týká, a kde si protiřečíte, hájí nebo ustupuje.
   Výstup: `<session>-kolo2.md`, do 120 řádků.
3. **Kolo 3** — **poslední**. Jen sporné body, s hlasováním. Výstup:
   `<session>-kolo3.md`, do 60 řádků.

Závěr píše moderátor; shoda ani jednohlasnost se nevyžaduje — nesouhlas se
zapíše i s důvodem.
