# Stav řešení: co chce Miloš × co z toho stojí

**Stav k 7. 11. 2026 (v noci).** Tenhle dokument je **přehled pro Filipa**, aby
měl kontrolu nad stavem: každý Milošův požadavek na jednom řádku, u něj v jakém
je stavu, **kde se to dá vidět** a co zbývá. Je seřazený **podle dne závodu**,
protože tak o tom Miloš mluví — od vypsání po výsledky.

**Co se změnilo od 28. 10.** Rozhraní rozhodčího u startu a u cíle, které tu
tehdy stálo jako *Zadané* a *Nikde*, od 29.–30. 10. **stojí v appce**: odpočet
podle ZPJ 26 s hlasem a klaksonem, odložení i odvolání, zápis dojezdu klepáním
na lodě, návrh dojezdu z trasování a ohlášení další rozjížďky. Jedenáct řádků
níž tím změnilo stav. Jak se to staví a co u toho ještě nestojí, vede
`APPKA-PORADI-PRACI.md`; pořadí kroků `SOUPIS-A-PLAN-START.md`.

**Co v něm není.** Je to řez **dnem rozhodčího**. Web a články, editor trati,
bóje, tabule pro diváky, náklady, zálohy a kalendář v něm nejsou — ty vede
`PLAN.md`. Kdo u vody stojí a s jakými právy, vede `AUDIT-OBSAZENI.md`.

Zdroje: `OPONENTURA-ROZHODCI.md` (nálezy R1–R40, K1–K7, 38 střípků),
`SOUPIS-A-PLAN-START.md` (plán ovládání startu a celá fronta).

**Jak se čte stav.** Šest slov, nic mezi nimi:

| Stav | Znamená |
| --- | --- |
| **Běží** | Nasazené na produkci, dá se vyzkoušet |
| **Jen web** | Běží, ale **ne v appce** — a Miloš bude na lodi |
| **V API** | Schopnost existuje, obrazovku nikdo nepostavil |
| **Zadané** | Víme přesně co, nestaví se |
| **Čeká** | Stojí na rozhodnutí, které ještě nepadlo |
| **Zavřené** | Miloš rozhodl, že se stavět nebude |

---

## Před závodem

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Vypsání závodu jako dokument | **Běží** | Web, dokument z dat. Čtyři body J1 jsou prázdné a místo konání je „neuvedené" (R21, R23) |
| Plachetní směrnice ke stažení | **Běží** | Jako PDF. Formu zdroje odložil sám: *„teď stačí zdroj jak máme"* (R2) |
| Směrnice **předvyplní** trať, časy a režim startu | **Zavřené** | R22. Filip 28. 10.: *„zatím stačí to co je, do budoucna editor, ale teď je to předčasné."* |
| Vypsání platné bez jeho podpisu | **Zavřené** | *„Je platné i bez mého podpisu"*. Elektronický podpis jen jako nabídka (R20, R32 v nahrávce 32) |
| Přihlašování po zveřejnění vypsání | **Běží** | Přihlášky vede pořadatel |
| Přihlašování se zavře rozpravou | **Běží** | R39, 7. 11. 2026. Rozprava je v datech **čas startu první rozjížďky** (K6) — vlastní kolonku nemá, aby nevznikl druhý úkon o tomtéž, který jde zapomenout. Zavírá i veřejný formulář. Zadní vrátka nejsou zvláštní cesta: zapíše rozhodčí, stejným tlačítkem |
| Číslo VMP a technického průkazu v přihlášce | **Zavřené** | R25. Rozhodnuto 29. 10.: nesbírat, závodník to potvrdí v souhlasu — a kvůli tomu vznikne **verze 3 souhlasu** |
| Souhlas se závodními pravidly u přihlášky | **Běží** | `Souhlas.cs`, verze 2 včetně polohy |
| Nezletilý závodník | **Zavřené** | *„Žádný z kapitánů není nezletilý"* (R26) |
| Čtyři třídy (do 7 m, nad 7 m lehký, těžký, RACE) | **Zavřené** | *„Neřeš, do tříd si je zařadíme sami"* — dva nové záznamy v nastavení, zařadí ručně (R40) |
| Platba startovného u kapitána | **Zavřené** | Platí se u zápisu v klubovně; kapitán to vidí jen na webu, v appce nadbytečné |

## Rozprava

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Po rozpravě nastavit předpokládaný čas startu | **Jen web** | K6, nasazeno. V appce to nejde |
| Tabule se startovní listinou | **Běží** | Přepíná se sama podle fáze dne, nezapíná se ručně |
| Do startovní listiny smí jen rozhodčí | **Běží** | R38, 7. 11. 2026. Filip: *„listina po rozpravě uzamčená pro všechny kromě rozhodčího.“* Je to **výměna**, ne přidání práva — po rozpravě pořadatel nesmí nic. Fronta návrhů z dřívější verze R38 odpadla: u vody to vyřídí věta přes molo. Příznak pomocníka (K8) listinu neotvírá, jak bylo rozhodnuto 28. 10. |
| Mapa před startem | **Běží** | R4. Naskočí sama 10 minut před procedurou, ne až výstřelem (29. 10.) |
| Odkdy se posádkám hlásí telefon | **Zadané** | R3. Rozhodnuto: **15 minut před procedurou** (T−20), appka si sledování zapne sama — musí žít dřív než mapa |

## Start

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Spustit startovní proceduru jedním tlačítkem | **Běží** | Panel na obrazovce regaty (`app/src/app/serie/[slug]/zavody/[zavod]/index.tsx`, `app/src/lib/start.ts`), postaveno 29. 10. Tlačítko ukáže stisk i čekání a nepovedené spuštění appku neshodí |
| Odpočet s intervaly 5 / 4 / 1 / 0 na obrazovce | **Běží** | `app/src/components/odpocet.tsx` (29. 10.). Fáze se lámou podle ZPJ 26, ne po minutách; posledních deset vteřin panel tepe. Od 30. 10. k tomu **mluví a troubí** (`app/src/lib/dirigent.ts`) a umí si vyžádat Nerušit — na Androidu z appky, na iPhonu ne |
| Dlaždice **Odklad startu** s novým časem | **Běží** | R37. Start se neklepe — zastavuje se odložením nebo odvoláním, a po odložení zůstane panel, ze kterého jde spustit znovu (29. 10.) |
| Dlaždice **Zrušit rozjížďku / neplatný start** | **Běží** | `Odvolat` (ZPJ 29.2) — přidá minutu a jede znovu; v appce od 29. 10. vedle odložení |
| Dlaždice **OCS** → loď → odčinila / neodčinila | **Běží** | R35, 7. 11. 2026. Dlaždice po startu, druhým klepnutím se vybere loď ze zápisu. Jde to přes zápis výsledků, ne vlastní úkon: OCS je kód jedné lodi a dvě cesty k témuž by se rozešly |
| Velitelský čas na mobilu hlavního startéra | **Běží** | `Velitel`, převzetí na žádost, doklad |
| Start přežije výpadek | **Běží** | `app/src/lib/cekajici-start.ts`: odpočet nečeká na server, start se podrží a odešle, až je kam (29. 10.). **Jedna výjimka:** ohlásit rozjížďku bez signálu nejde, číslo dává server — popsáno v `APPKA-PORADI-PRACI.md` |
| Posádka vidí stav startu | **Běží** | R34. `GET /lod/dnes` i obrazovka *Moje regata* v appce (7. 11. 2026): barva stavu, hodina startu, pokyny komise a to, jak loď eviduje rozhodčí. Odpočet tam není a **nebude** — a nestojí tam ani věta, proč (*„co je závodníkům do toho"*). Proti návrhu chybí plachetní číslo, posádka a karta stavu telefonu |
| Posádka hlásí komisi (trest, neregulérnost) | **Zavřené** | R41. *„Alespoň v prvních verzích ne."* Miloš došel k témuž: *„abychom jim nekomplikovali život"* |

## Za jízdy

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Úprava tratě za jízdy | **Jen web** | Změna úseku a chybějící značka. Nově zadáno: pípání a focení bójí z appky v módu stavby, trať ale schvaluje rozhodčí |
| Dlaždice **360°** za dotek bóje | **Běží** | R36, 7. 11. 2026. Vlastní tabulka `TrestyZaJizdy` — otáčka pořadí nemění, takže to není kód výsledku |
| Dlaždice **720°** za dotek s lodí soupeře | **Běží** | R36, 7. 11. 2026. Totéž co 360°, jen dvě otáčky |
| Trest dostupný **celou** rozjížďku, ne jako krok | **Běží** | 7. 11. 2026. Úkony jsou v panelu od chvíle, kdy je nastavený čas startu |
| Vykonaný trest se odklepne | **Běží** | 7. 11. 2026. Pruh *Tresty na trati* pod dlaždicemi (podle `Jede.dc.html`): čipy po lodích s otáčkami a časem od uložení, klepnutím odčiněno. Do té doby šel trest zapsat, ale už ne odkliknout |
| Vytlačená loď a rozjížďka přerušená pro bezpečnost | **Zadané** | R13. Pravidla mají čtyři různé cesty podle toho, kdo je původce, a aplikace nezná ani jednu; zrušit rozjížďku jde dnes jen oklikou přes eliminaci výsledků |
| Startovní tresty bez vlajek | **Zavřené** | R15, R16. Na poháru se vlajky nevyvěšují, jede se megafonem, takže tresty podle pravidla 30 formálně neplatí. Nosné pro dlaždici OCS |
| Polohy lodí na mapě | **Běží** | Tracking nasazený 24. 10.; **z telefonu to nikdo neověřil** |

## Cíl

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Ruční zápis průjezdu cílem | **Běží** | Od 29. 10. **i v appce**: karta *Cíl* na obrazovce regaty, klepání na lodě s časem z telefonu, oprava posledního klepnutí i jednotlivého místa, *Ukončit rozjížďku* se zápisem DNF zbylým (`app/src/lib/cil.ts`, `app/src/app/serie/[slug]/zavody/[zavod]/cil.tsx`). Rozepsaný zápis leží v souboru, takže přežije konec appky |
| Přepsat to, co určilo trasování | **Běží** | R33, postaveno 29. 10. Čerstvý průjezd lodi bez místa se ukáže jako návrh s čárkovaným okrajem a klepnutím se zapíše; k zapsanému klepnutí obrazovka nabídne čas ze stopy, leží-li do minuty. Nic se nezapisuje samo a nic se nemaže |
| Shoda v cíli (dvě lodě stejně) | **Běží** | K7, 6. 11. 2026. V cílovém listu se dvěma lodím napíše totéž pořadí; API to dřív odmítalo, teď body za obsazená místa sečte a rozdělí rovným dílem (ZPJ A7) — dvě lodě třetí berou 3,5 a další je pátá. Body jsou proto desetinné (`Bodovani.BodyRozjizdky`). **V appce zápis shody nejde**, klepání v cíli dává pořadí po sobě |

## Po rozjížďce

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Odsouhlasení pořadí | **Jen web** | Stavy výsledků, běží |
| Úpravu výsledků smí jen rozhodčí | **Zadané** | R38, druhá polovina. Zámek ze 7. 11. 2026 se týká **startovní listiny**, ne zápisu — ten má vlastní řadu stavů (`Workflow.KdoSmi`, kde *zapsáno* a *v revizi* už rozhodčímu patří). Dotáhnout se má spolu s protesty (K2) |
| Zásah do pořadí při protestu | **Zadané** | Protesty jsou celá nepostavená fáze; dnes je jen věta, že protest visí (K2) |
| Ověřeno a Schváleno jako dva kroky | **Běží** | K3, 7. 11. 2026. Řada má tři stupně: *zapisuje se → zapsáno → potvrzeno*, vedle nich revize a zrušení. Migrace přepsala uložené „ověřeno" na „zapsáno"; zpátky to nejde. Rozdělit to má smysl až s protesty (K2) a hlídá to test |
| Pomocník u cíle a slave startér | **Běží** | K8, 7. 11. 2026. **Příznak u regaty**, který rozhodčí zaškrtne v klubovně u zápisu — nabízejí se pořadatelé **celého ročníku**, protože u cíle stojí pořadatel odjinud, který by jinak musel dostat celou tuhle regatu. Otevře velení, proceduru, start, konec a zápis dojezdů; **ne** startovní listinu, zakládání rozjížděk, workflow, pohár ani publikaci. Žádná nová role, odškrtnutí zapisuje doklad |
| Zahájit další rozjížďku | **Běží** | V appce od 30. 10. jako *Ohlásit rozjížďku* — **dvě klepnutí**, ohlášení jen založí rozjížďku bez času, proceduru spouští až druhé. Bez signálu to nejde, číslo určuje server |
| Kódy výsledků včetně DNE | **Běží** | Jedenáct kódů, čtyři z nich doplněné 28. 10.; DNE se nedá vyškrtnout (K1) |
| Zrušení rozjížďky s povinným důvodem | **Běží** | R17, v appce od 7. 11. 2026 se čtyřmi důvody podle **ZPJ 32.1** na výběr |

## Mimo den závodu

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Appka řekne, že se sama aktualizovala | **Běží** | Banner a sekce *Verze appky* v Účtu, od buildu 5. Nově zadáno: ukázat verzi i na webové stránce `/appka` |
| Aktualizace po síti bez instalace | **Běží** | První aktualizace publikovaná 28. 10.; do té doby v kanálu neležela **žádná** |
| Publikace automaticky z CI | **Běží** | `EXPO_TOKEN` je v secrets od 29. 10. 10:44. Publikuje se do kanálu `preview` při každém nasazení, kde se změnilo `app/` — ale dosedne jen na APK se shodným otiskem, a ten se od 28. 10. posunul **dvakrát** (build 5, pak build 8 s nativní dávkou). Vydané APK drží `app/vydane-apk.json` |
| Přeložený termín dá vědět přihlášeným | **Běží** | K5, 7. 11. 2026. Přesun vypsané regaty zařadí zprávu do telefonů do téže transakce jako sám přesun. Jde **odběrem ročníku**, tedy všem, kdo appku mají — užší kanál nikdo neposlouchá. **Kdo appku nemá, se to nedozví**; to je zbytek nálezu |

---

## Co zbývá rozhodnout

**Nic.** Po Filipových odpovědích z 28. a 29. 10. je rozhodnuté všechno, co
stálo na rozhodnutí. Tři věci rozhodl **jinak, než Miloš zadal**, a ten je
dostane jako informaci, ne jako otázku:

- **Posádka dostane barvu stavu, ne odpočet** (R34): *„odpočet u posádek není
  v prvních verzích potřeba, navíc je to zdroj problémů."* Zpožděný odpočet na
  lodi lže, barva ne.
- **VMP a technický průkaz se sbírat nebudou** (R25): závodník v souhlasu
  potvrdí, že je má a že je to jeho odpovědnost. Znamená to **verzi 3
  souhlasu**, protože dnešní text tohle neříká.
- **Předčasný start se zapíše jako OCS**, ne DSQ (R35) — tedy jak to žádají
  pravidla. *„Kdyžtak se to změní."*

Zbytek rozhodnutý je: mapa se zapne sama, telefony se hlásí 15 minut před
procedurou, Ověřeno a Schváleno se sloučí, trasování dává jen návrh dojezdu,
startovní listinu po rozpravě mění rozhodčí a pořadatel ji smí navrhovat,
směrnice jako předloha se odkládá, mez z pravidla 76 se neřeší, startovné
zůstává na webu a token do secrets doplní Filip.

**Co tím pádem drží frontu:** už ne rozhodnutí, ale stavba. Pořadí je
v `SOUPIS-A-PLAN-START.md`.

## Jak se tenhle dokument udržuje

Píše se **po každé Milošově dávce** a mění se v něm **jen sloupec Stav**. Řádky
se neruší: co Miloš jednou řekl, zůstává, i když se to rozhodne nestavět — pak
má stav **Zavřené** a je u toho jeho věta. Stav se nikdy nepřepisuje podle
plánu, jen podle toho, co je **doložené v kódu nebo nasazené**.
