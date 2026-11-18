# Fronta: co se má vzít (18. 11. 2026)

Jeden řádek na každou věc, která doopravdy zbývá — ze **všech** řezů, ne jen
z jednoho. U každé je to jediné, co o ní potřebuješ vědět dřív, než ji vezmeš:
**kdo nebo co ji drží**, a kde se dnes dá vidět, že hotová není.

**Odkud se to sbíralo.** `OPONENTURA-ROZHODCI.md` (49 nálezů, R1–R41 a K1–K8),
`konzilium/stavitel-trati/ZAVER.md` (jedenáct rozhodnutí a čtyři vady),
`PLAN.md` oddíl *Fronta k 20. 10.*, `SCENARE-OVLADANI.md` a otevřená hlášení
na GitHubu. Tyhle dokumenty zůstávají **zdrojem** — zdůvodnění nálezu, stav
Milošova požadavku (`STAV-RESENI.md`) ani pořadí kroků u startu
(`SOUPIS-A-PLAN-START.md`) se sem nepřepisují.

**Proč to drží všechno pohromadě.** Fronty byly čtyři a každá v jiném
dokumentu, s jiným datem a jiným dělením. Z žádné z nich nešlo přečíst větu
*„vezmi si tohle"*, protože ani jedna neviděla ostatní tři.

**Mez poctivosti.** Řádek odsud odejde jedině tak, že je věc **doložená
v kódu nebo nasazená**. Cesty a čísla řádků níž jsou ověřené proti `main` na
commitu `0f9834a2` dnes; co ověřené není, je **u toho napsané** — a jedna
položka ve skupině E je právě to ověření.

---

## A) Nic to nedrží — dá se vzít hned

| Odkud | Co zbývá | Kde se to dnes vidí | Velikost |
| --- | --- | --- | --- |
| **K7** | **Shoda v cíli na webu.** Appka to umí od 7. 11. — dvě lodě na témž místě, body podle ZPJ A7. Web pořád počítá pořadí jako `i + 1`, takže rozhodčí u stolu shodu zapsat nemůže a totéž klepnutí má na telefonu a na webu jiný výsledek | `web/app/sprava/[serie]/vysledky/[zavod]/[cislo]/cil/cil.tsx:921` a `:1122` | střední |
| **konzilium, bod 3** | **Barvy bójí potřebují vlastní tokeny.** Žlutá otočná a červený/modrý konec brány mají na Orlíku význam (rozhodl jsi 18. 11.), ale appka si je půjčuje od barvy znamení a zrušené rozjížďky — změna kterékoliv z nich přebarví bóje na vodě. Ve světlé i tmavé sadě, protože ráno na vodě jede telefon v tmavém | `trat.tsx` bere `pripravaZnameni` a `stavZruseny` z `app/src/constants/theme.ts:34` a `:54` | malá až střední |
| **R25** | **Verze 3 souhlasu.** Rozhodnuto 29. 10.: VMP a technický průkaz se sbírat nebudou, závodník je potvrdí v souhlasu. Znění o průkazech mlčí a kód vydává verzi 2 — dokud se nezmění, nepotvrzuje závodník nic a rozhodnutí žije jen v dokumentaci | `src/OrlickyPohar.Api/Features/Zavody/Souhlas.cs:44` | malá: text a verze, kolonka `SouhlasVerze` v datech už je |
| **R21** | **Dva ze čtyř prázdných bodů vypsání** — ty, které si aplikace umí dosadit sama: *Dráha* (J1.3(4)) z předpisu trati a *lhůta pro změny bodování* (J1.2(6)) ze ZPJ 90.3(e). Zbylé dva vydává Miloš, ty jsou ve skupině B | `src/OrlickyPohar.Api/Features/Zavody/Vypsani.cs:136` a `:139` | střední |
| **PLAN, 19. 10.** | **Graf tlaku na stránce regaty.** Řekl jsi to dvakrát a poslal k tomu obrázek. Tlakový trend existuje jen jako widget na hlavní; na stránce regaty se slovo „tlak" nevyskytuje vůbec | je v `web/app/vitr.tsx`, není nikde ve `web/app/serie/` | střední |
| **konzilium, 2-design** | **`kontrast.test.ts` rozšířit** o páry, které stavitel zavádí. Dnes měří obecné tokeny a proužky fází na panelu odpočtu, takže návrat bílé napevno na modré ploše (2,35 : 1 v tmavé sadě) by CI nechytila | `app/testy/kontrast.test.ts:86` | malá |
| — | **Verze appky na `/appka`.** Stránka rozdává APK a QR kód, ale neřekne, který build to je. Kdo stahuje podruhé, nepozná, že je novější než ten jeho — a `app/vydane-apk.json` to číslo vede | `web/app/appka/page.tsx` | malá |
| — | **`VeleniDto` mimo vygenerovaný kontrakt.** Tvar odpovědi stojí v appce ručně, protože ve `schema.d.ts` ten typ není. Dluh s předem napsaným koncem: až se kontrakt vygeneruje znovu, ruční typ má zmizet | `app/src/lib/api.ts:366` | malá, ale patří ke generování kontraktu |

## B) Čeká na Miloše — a vejde se to do jedné zprávy

Z šesti otázek na konci návodu (s. 23) jsou **dvě odpovězené** — odstartování
rozjížďky a zčásti flow rozpravy. Zbývá tohle:

| Otázka | Bod návodu | Co na ní visí |
| --- | --- | --- |
| Kde a jak chceš revidovat trať? | 5 | příjem trati rozhodčím proti stavbě v appce |
| Kde chceš mít přehled o lodích za jízdy? | 10 | co má být na mapě za jízdy a komu |
| Co potřebuješ vidět, než uznáš výsledky? | 16 | podpis výsledků — dnes se nabízí bez čehokoli |
| Kde a jak se má regata uzavřít? | 17 | konec dne závodu jako úkon |
| **Začátek a konec rozpravy** | 8 | zbytek otázky 6: co rozprava zapíná, už víme (R3, R4, R6, R39), kdy začíná a končí ne |
| **Má protestní limit nepustit podpis, nebo to jen napsat?** | — | K2. Limit se počítá a píše se u rozjížďky; nezamyká nic, protože aplikace neví, že nějaký protest visí |
| **Vyloučení: „nepustím ke startu", nebo „vyhazuju z výsledků"?** | — | K4 a mez z pravidla 76.1(a) |
| **Dva body vypsání, které vydáváš ty** — kdy se poslední den už nestartuje (J1.3(7)) a odepření práva na odvolání (J1.3(8)). A **místo konání**, které aplikace nevede nikde, takže je v dokumentu zadrátované „neuvedené" | — | R21, R23, zbytek R1/R8 |

## C) Čeká na rozhodnutí Filipa

- **Smí do zápisu dojezdů i pořadatel?** Milošova věta říká *„pouze
  rozhodčí"*, tvoje rozhodnutí ze 16. 10. *„pořadatel, dokud je zápis
  otevřený"*. Dnes platí tvoje, a Milošova tím zůstává nenaplněná. Není to
  chyba v kódu, je to nezavřený spor dvou zadání (R38).
- **Kolik z osmi kombinací stavitele se za sezónu reálně postaví?** Pátá
  otázka konzilia, jediná otevřená. Pořadí voleb má být podle četnosti a
  pevně zadrátované — bez čísel ho seřadí odhadem, a odhad se na vodě pozná.
- **Kdo appku nemá, se o přeloženém termínu nedozví** (zbytek K5). Zpráva
  odchází odběrem ročníku, tedy jen do telefonů. Druhý kanál je rozhodnutí
  (mail? SMS? vůbec?), ne práce.
- **Licence** — Play 25 USD jednorázově, Apple 99 USD ročně. Bez nich se nová
  appka k pořadatelům dostane jedině kabelem, a zrovna stavitel trati je
  funkce, kterou budou chtít mít v telefonu bez tvé asistence.
- **Publikovat zbylé zastávky 2027 a plachetní směrnici.** Z fronty v plánu
  k 20. 10.; **stav na produkci jsem nekontroloval**, takže je možné, že je to
  mezitím hotové.

## D) Postavené, ale neověřené — čeká na telefon a na vodu

- **Zkouška stavitele trati**: `ZKOUSKA-STAVITELE.md`, **22 nezaškrtnutých
  bodů**. Od commitu `ea0e6682` (meze polohy rozvolněné z Orlíku na Česko) se
  celý průvodce projde **na suchu**; na vodě zbývá jen to, co vodu doopravdy
  potřebuje. Tohle je dnes nejvýš položená věc ve frontě: tři týdny stavby
  nikdo nedržel v ruce.
- **R18 — že push dojde na telefon posádky do minuty.** Takt kódu je minuta,
  doručení neměřil nikdo.
- **Tracking z telefonu.** Nasazený 24. 10., z telefonu neověřený.
- **Sezení se skutečným pořadatelem.** Ze 37 scénářů (`SCENARE-OVLADANI.md`)
  jsou skupiny E a F odjeté **reprodukcí** (9. 10.) a část C a D při
  reprodukci 8. 10.; u skutečného pořadatele neodjel zatím nikdo.
- **Zátěžový test tempem 40** před prvním ostrým závodem. Postup
  v `platform/docs/PROVOZ.md` takhle nepoběží — míří na `orlickypohar-web-1`
  v síti `edge`, kde web od 22. 9. 2026 není.
- **Nerušit si dirigent na iPhonu nevyžádá** (na Androidu ano). Není to vada,
  je to mez systému — patří sem proto, aby se u vody nečekalo, že to zabere.

## E) Velké věci s vlastním rozhodnutím

- **Protesty (K2).** Celek se nestaví a je to tak rozhodnuté: pohár není pod
  svazem, odvolání k ČSJ odpadá a protestní komise by byla poslední instancí.
  Postavené je jen to, na co aplikace data má — protestní limit podle ZPJ
  60.3(b). Visí na tom **zbytek R13**: protest vytlačené lodi, náprava podle
  61.4(c) a zproštění viny podle 43.1(a). Cesta komise (zrušení s důvodem,
  odložení, důkaz z trasy podle 61.4(d)) běží.
- **Projít sedm změn návrhu stavitele proti kódu** a říct, které z nich
  stojí. Čtyři vady v živém kódu jsou opravené (`ee92fa3e` 44 pt, `41bf382e`
  odskok a kontrola dotyku na písmo, `e80c6e20` stavba jen tam, kam server
  pustí, `d2cb96e5` pomocník), ale u samotných změn návrhu — pípnutí jako
  první akce, padlý odklad popisu, osm řádků seznamu, stav polohy slovem,
  karta zádrhelu, vzdálenost u brány — **jsem si ověřil jedinou**: slovo
  „zádrhel" není v `app/src` nikde, takže karta zádrhelu (bod 6) postavená
  není. Zbytek je nedočtený, a než se začne stavět, má se dočíst.
- **Vypsání jako plný dokument J1** (R1, R8). Osnova stojí, dva body si
  aplikace dosadí sama (skupina A), dva vydává Miloš a místo konání nevede
  nikdo (skupina B). Teprve pak je to dokument, o kterém R8 mluví.
- **Obecný outbox.** V kódu není a blokuje push *„déšť do hodiny"*. Dvě
  jednoúčelové fronty jsou vzor, ne náhrada: `app/src/lib/cekajici-start.ts`
  drží úkon procedury a `tracker/nahravani.ts` dávku bodů. Stavitel ho
  nepotřebuje — potřeboval atomický zápis prvku, a ten je od `232fa0ae`.

## F) Údržba a drobnosti

- **Dvanáct otevřených Dependabot PR** (#530 až #557) a jedno živé hlášení
  **high** — picomatch, `#43`.
- **Testy správy přes HTTP** (z fronty v plánu k 20. 10.).
- **Kategorie lodi, když ji loď přece jen změní** (nové plachty, přeměření).
  Návrh stojí v *Zbývá doladit*, bod 4: správce ji smí přepsat a pořadí se
  přepočítá, historie se nevede, dokud se neukáže, že je potřeba.
- **Odsazení tabule na demo ročnících.**

---

## Co z fronty vypadlo

**Z oponentury rozhodčího** se zavřelo K1, K3, K5, K6, K7 (v appce), K8, R3,
R4, R6, R9, R10, R12, R13 (cesta komise), R17, R19, R33, R34, R35, R36, R37,
R38 (polovina) a R39, a s nimi celá startovní procedura podle ZPJ 26 včetně
dirigenta. Z devatenácti nálezů, které 28. 10. čekaly na rozhodnutí, nečeká
**ani jeden**.

**Z fronty v plánu** vypadl **úvodník jako příznak článku** — plán z 20. 10.
tvrdí, že to pole neexistuje nikde, a dnes je v `Clanek.cs:132` i ve správě
článků a na stránce regaty. A zbytek, který měl 28. 10. *pípání a focení bójí
z appky*, postavily `a4710ffa`, `34605f3d` a `4b9c256d`.

## Jak se tahle fronta udržuje

1. Nový nález jde do svého zdroje — oponentura, závěr konzilia, plán —, ne sem.
2. Stav Milošova požadavku jde do `STAV-RESENI.md`, ne sem.
3. Sem se píše **jen to, co se má vzít**, a řádek se maže teprve tehdy, když
   je věc v kódu nebo nasazená. Hotovo se nepíše do sloupce, hotovo řádek
   odebere — doklad zůstane v commitu.
4. Co se tvrdí, má mít u sebe cestu a číslo řádku. Kde je místo toho napsané
   *nekontroloval jsem*, je to taky tvrzení — jen opačné.
