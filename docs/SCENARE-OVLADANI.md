# Scénáře pro zkoušku ovládání a ergonomie

K čemu to je: **zjistit, kam se která role nedostane** a kde se cesta hledá
déle, než má. Výsledky plus audit kódu jsou podklad pro úpravy navigace — ne
seznam přání, ale seznam míst, kde někdo stál a nevěděl kudy.

Zkouší se **úkol, ne cesta.** Zadává se, co má člověk udělat, a sleduje se,
jestli to najde. Napovědět se smí až po třech minutách a zapíše se to.

## Jak to zapisovat

U každého scénáře: **dokončil / nedokončil**, čas, kolik špatných odboček,
kde se zeptal, a jeho vlastní věta o tom, co čekal. Ta věta je nejcennější —
říká, kde čekal odkaz, který tam není.

Zkouší se **na mocku** (`tools/fake-api.py` + `npm --prefix web run dev`),
ne na produkci: scénáře zapisují a mažou data.

## Co už víme z auditu kódu (6. 10. 2026)

Tyhle věci není potřeba objevovat znovu — je potřeba změřit, **jak moc vadí**:

| Zjištění | Kde |
|---|---|
| Nabídka účtu se počítá **jen z rolí na ročník**. Kdo má roli na celý web a žádnou v ročníku, nevidí v nabídce ročníkové položky — ačkoliv na ty obrazovky smí a po zadání adresy ho pustí | `web/app/profil.tsx` |
| **Přihlášky nemají v nabídce položku.** Jde se na ně oklikou z kalendáře („přihlášky →") nebo z výsledků regaty („přihlášené lodě →") | `kalendar/page.tsx:325` |
| **Správa nemá rozcestník.** Neexistuje `/sprava` ani `/sprava/{ročník}`; jediná navigace je rozbalovací nabídka pod ikonkou účtu | — |
| **Posádku nejde zadat ve správě.** Pořadatel ji jen vidí; zapsat ji umí kapitán ve veřejné přihlášce nebo import. Kormidelník totéž | `prihlasky/[zavod]/page.tsx:494` |
| Směrnice a medailonek pořadatele jsou taky jen z kalendáře | `kalendar/page.tsx:313,329` |

## Role, se kterými se zkouší

Role se udělují na `/sprava/{ročník}/opravneni`. Pro zkoušku je potřeba
**pět účtů**, ne jeden s přepínáním: půlka nálezů je o tom, co kdo v nabídce
vidí.

1. **Nepřihlášený** — běžný návštěvník.
2. **Kapitán lodi** bez role ve správě.
3. **Organizátor jedné zastávky.**
4. **Rozhodčí ročníku.**
5. **Správce ročníku** a zvlášť **správce celého webu bez role v ročníku**.

---

## A. Nepřihlášený návštěvník

**A1 — Kdy se jede a kde.** Najdi termín a místo nejbližší regaty.

**A2 — Podle čeho se jede.** Najdi plachetní směrnici k té regatě.
*Sleduj:* hledá ji u regaty, nebo v menu? Je na stránce vidět, že je to
závazný dokument?

**A3 — Přihlásit loď.** Přihlas loď na regatu, včetně posádky.
*Sleduj:* najde formulář? Čeká, že se přihlašuje u regaty, nebo globálně?
Dojde mu, že pole „Kdo pojede s tebou" je volný text, nikoho to nezaloží?

**A4 — Jak si stojí loď v poháru.** Najdi průběžné pořadí a v něm jednu loď.

**A5 — Co znamená prázdno.** U ročníku se skrytými výsledky: pozná, že se
jelo, ale výsledky se neukazují, od toho, že se nejelo?

## B. Kapitán lodi (bez role ve správě)

**B1 — Dostat se ke své lodi.** Přihlas se a najdi svoji loď.
*Očekávaná cesta:* ikonka účtu → Moje lodě.

**B2 — Připojit posádku.** Přidej k lodi dva lidi.
*Sleduj:* najde vystavení kódu? Pochopí, že kód předává posádce, ne že je
zadává sám? Co udělá, když mu vyprší (15 minut)?

**B3 — Kdo mi to tam leze.** Někdo požádal o připojení k tvé lodi — najdi to
a rozhodni.

**B4 — Odebrat člověka.** Odeber připojeného a pak zkus odebrat sebe jako
jediného kapitána. *Čeká se:* druhé odmítnutí s větou, co dělat.

**B5 — Loď bez kapitána.** Jsi posádka lodi, která kapitána nemá. Zkus
vystavit kód. *Čeká se:* nejde, a je vidět proč a za kým jít.

## C. Organizátor zastávky

**C1 — Zapsat loď, která v ročníku není.** U své regaty přidej novou loď
i s majitelem. *Sleduj:* najde „Nová loď, která v ročníku ještě není"? Ví,
že tím loď zakládá na celý ročník, ne jen na svou regatu?

**C2 — Zapsat posádku.** Dopiš k přihlášené lodi posádku.
*Čeká se:* **nejde.** Zapiš, kde ho to zastavilo a co zkoušel.

**C3 — Vyvěsit směrnici.** Vyvěs PDF u své regaty.
*Sleduj:* kudy šel. Očekávaná cesta je kalendář → směrnice.

**C4 — Odvolat špatnou směrnici.** Vyvěsil jsi PDF s telefony posádky.
Zařiď, ať není venku. *Sleduj:* hledá mazání? Najde stažení? Je mu po
provedení jasné, co ještě musí udělat ručně?

**C5 — Zápis z cíle.** Odstartuj rozjížďku a zapiš dojezd osmi lodí,
z toho jedné kódem DNF. *Sleduj:* to hlavní z celé zkoušky — jestli to
zvládne bez pomoci a jestli po každém klepnutí ví, že je uloženo.

**C6 — Oprava omylu.** V C5 jsi klepl dvakrát na tutéž loď a jednu
zapomněl. Oprav to.

**C7 — Dva telefony.** Druhý zapisovatel uložil mezitím jinou sadu.
*Čeká se:* hláška o konfliktu, odkaz na porovnání, a **vlastní klepnutí
zůstanou**. Zapiš, jestli mu je jasné, že o nic nepřišel.

**C8 — Papír.** Dopiš zápis doma z fotky papíru a přilož ji.

## D. Rozhodčí ročníku

**D1 — Založit regatu** a dát jí termín.

**D2 — Ověřit výsledky** jedné rozjížďky a pustit je ven.

**D3 — Vrátit k revizi** s důvodem. *Sleduj:* pochopí, že bez vrácení se
čísla přepsat nedají?

**D4 — Zkus zapsat výsledky sám.** *Čeká se:* nejde, a je vidět proč.

**D5 — Přesunout termín** odjeté regaty. *Čeká se:* nejde.

## E. Správce

**E1 — Určit kapitána lodi.** Loď má jen posádku; urči kapitána.
*Očekávaná cesta:* nabídka → Lodě {ročník}.

**E2 — Kapitán od kódu.** Najdi lodě označené *ke kontrole* a potvrď jednu.
*Sleduj:* pochopí z obrazovky, proč jsou ke kontrole?

**E3 — Nahradit kapitána**, kterého udělal kód omylem.

**E4 — Udělit roli** novému pořadateli na jednu regatu.

**E5 — Správce celého webu.** Přihlas se účtem, který má roli **jen na celý
web**. Najdi kalendář ročníku 2027.
*Čeká se:* v nabídce není; po zadání adresy ručně se otevře. **Změř, za jak
dlouho na to přijde** — tohle je dnes nejpravděpodobnější místo, kde člověk
usoudí, že funkce neexistuje.

## F. Napříč rolemi

**F1 — Od začátku do konce.** Nový člověk: přihlásí se, připojí k lodi,
podívá se na směrnici, po regatě si najde výsledek. Kolik odboček?

**F2 — Telefon u vody.** C5 a C7 na telefonu, jednou rukou, na slunci.

**F3 — Zpět.** Projdi scénáře s tlačítkem Zpět po každém kroku. Nestane se,
že obrazovka ukáže starší stav?

**F4 — Bez signálu.** V C5 zapni letový režim, zapiš tři dojezdy, zapni
signál. *Čeká se:* dojezdy se dopraví samy.

---

## Z čeho se bude vycházet při úpravách

Z nálezů, ne z dojmu. Každý návrh úpravy má mít u sebe **scénář, ve kterém
někdo stál**, a odhad, koho se to týká. Pořadí podle toho, co blokuje práci
u vody, pak co se dělá často, a teprve pak pohodlí.

Do úprav nepatří věci, které zkouška neodhalila — na ty je plán.
