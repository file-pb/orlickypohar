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
| **Zčásti** | Část běží, zbytek drží na jiném nálezu |
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
| Po rozpravě nastavit předpokládaný čas startu | **Běží** | K6, v appce od 7. 11. 2026. Tlačítko *Zapsat čas startu* v panelu rozjížďky bez času — hodina a minuta pražského času, velké číslice. Od 8. 11. 2026 se čas **vybírá kolečkem**, ne píše (Filip: *„možná místo textu by se hodil nějaký nástroj"*); táž volba je i v potvrzení odkladu. Jde to **týmž endpointem** jako skutečný start: rozdíl je jedině v tom, jestli ten čas už přišel, a dvě cesty k témuž by se rozešly. Hodina, která minula, se nevezme a neposune se tiše na zítřek. Nabízí se jen u rozjížďky **bez** času — u té, která čas má, je na změnu odložení (vlajka AP), které si o nový čas řekne samo |
| Tabule se startovní listinou | **Běží** | Přepíná se sama podle fáze dne, nezapíná se ručně |
| Do startovní listiny smí jen rozhodčí | **Běží** | R38, 7. 11. 2026. Filip: *„listina po rozpravě uzamčená pro všechny kromě rozhodčího.“* Je to **výměna**, ne přidání práva — po rozpravě pořadatel nesmí nic. Fronta návrhů z dřívější verze R38 odpadla: u vody to vyřídí věta přes molo. Příznak pomocníka (K8) listinu neotvírá, jak bylo rozhodnuto 28. 10. |
| Mapa před startem | **Běží** | R4. Naskočí sama 10 minut před procedurou, ne až výstřelem (29. 10.) |
| Odkdy se posádkám hlásí telefon | **Běží** | R3, 7. 11. 2026. Dva režimy: *hlásím se* od zápisu v klubovně (handshake a baterie, **žádné souřadnice**) a *nahrávám* od **T−20**, tedy patnáct minut před procedurou. Přepnutí není povel ze serveru, nýbrž **stažený čas** — na vodě by povel nedošel právě té lodi, které je potřeba nejvíc. Posádka klepne naposledy na břehu. Vedlejší zisk: baterie se tím **poprvé dostane na břeh**, dosud tekla jedině z dávky bodů, tedy až z vody, a přehled pořadatele v klubovně ukazoval prázdno. Je to **zpřísnění**: dnes se polohy brala od rozpravy klidně čtrnáct hodin |

## Start

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Spustit startovní proceduru jedním tlačítkem | **Běží** | Panel na obrazovce regaty (`app/src/app/serie/[slug]/zavody/[zavod]/index.tsx`, `app/src/lib/start.ts`), postaveno 29. 10. Tlačítko ukáže stisk i čekání a nepovedené spuštění appku neshodí |
| Odpočet s intervaly 5 / 4 / 1 / 0 na obrazovce | **Běží** | `app/src/components/odpocet.tsx` (29. 10.). Fáze se lámou podle ZPJ 26, ne po minutách; posledních deset vteřin panel tepe. Od 30. 10. k tomu **mluví a troubí** (`app/src/lib/dirigent.ts`) a umí si vyžádat Nerušit — na Androidu z appky, na iPhonu ne |
| Dlaždice **Odklad startu** s novým časem | **Běží** | R37. Od 8. 11. 2026 se odklad i odvolání **ohlásí pingem a větou**, ne klaksonem: směrnice poháru vypisuje jediné zvukové znamení (zrušení rozjížďky, R23) a klakson u nevyhlášeného úkonu by se pletl s tím, co platí (Filip: *„jinak by se to pletlo s oficiálním signálem“*). Start se neklepe — zastavuje se odložením nebo odvoláním, a po odložení zůstane panel, ze kterého jde spustit znovu (29. 10.) |
| Dlaždice **Zrušit rozjížďku / neplatný start** | **Běží** | `Odvolat` (ZPJ 29.2); v appce od 29. 10. vedle odložení. Nový čas **není volný**: vyzývací znamení padne minutu po spuštění prvního opakovače a od něj uplyne celá procedura — se zdejšími pěti minutami je start o šest minut dál (`Procedura.NovyStart`). Do 8. 11. 2026 to dlaždice popisovala jako *„přidá minutu“*, což svádělo číst, že se start posune o minutu. **Dlaždice je ztlumená celou proceduru a rozsvítí se v okamžiku startu** — a je to tak správně: ZPJ 29.2 začíná *„when **at the starting signal**“*, takže před startem se odkládá (27.3, vlajka AP), neodvolává. Ověřeno na simulátoru 8. 11. 2026. **Nevyřešené zůstává, od čeho se měří ta minuta.** Server ji počítá od okamžiku odvolání, tedy od **vyvěšení** prvního opakovače. Pravidlo ji měří od jeho **svěšení** (*„the warning signal … shall be made one minute after the First Substitute is removed“*) — a kdy se svěsí, neurčuje vůbec; rozhoduje komise, až se pole vrátí za čáru. Dnešní výpočet proto platí jen v jediném případě: když se opakovač svěsí v tutéž vteřinu, kdy byl vyvěšen. Na vodě to tak nikdy není, takže appka ukazuje čas startu, který už neplatí. Čeká na rozhodnutí, jestli se po odvolání má čas vybírat kolečkem jako u odkladu, nebo jestli má přibýt druhý krok *Opakovač dolů*, od kterého teprve minuta běží |
| Dlaždice **OCS** → loď → odčinila / neodčinila | **Běží** | R35, 7. 11. 2026. Dlaždice po startu, druhým klepnutím se vybere loď ze zápisu. Jde to přes zápis výsledků, ne vlastní úkon: OCS je kód jedné lodi a dvě cesty k témuž by se rozešly |
| Velitelský čas na mobilu hlavního startéra | **Běží** | `Velitel`, převzetí na žádost, doklad. **V appce od 7. 11. 2026**: pilulka v hlavičce regaty je tlačítko — kdo velí, čte *„velíš ty"*, kdo nevelí, čte jantarově *„velí Miloš"* a klepnutím si velení vezme (`nactiVeleni`, `prevezmiVeleni` v `lib/api.ts`). Směr je ten z nálezu R19: velení se **bere**, nedává. Tvar odpovědi stojí v `api.ts` ručně, protože `VeleniDto` není ve vygenerovaném kontraktu — až se `schema.d.ts` vygeneruje znovu, má ten typ zmizet |
| Start přežije výpadek | **Běží** | `app/src/lib/cekajici-start.ts`: odpočet nečeká na server, start se podrží a odešle, až je kam (29. 10.). **Jedna výjimka:** ohlásit rozjížďku bez signálu nejde, číslo dává server — popsáno v `APPKA-PORADI-PRACI.md` |
| Posádka vidí stav startu | **Běží** | R34. `GET /lod/dnes` i obrazovka *Moje regata* v appce (7. 11. 2026): barva stavu, hodina startu, běžící hodiny, pokyny komise a to, jak loď eviduje rozhodčí. Dotaženo podle `Zavodnik.dc.html`: **plachetní číslo** (jméno lodi nestačí, dvě Luny na Orlíku nejsou nic divného), karta **Telefony na lodi** s počtem *„2 ze 3 vysílají“*, baterií a časem posledního hlášení, věta **Komise tě vidí**, a tlačítko **Pozastavit vysílání polohy** — jediné tlačítko na té obrazovce, protože polohu vysílá posádčin telefon. Odpočet tam není a **nebude**, a nestojí tam ani věta, proč (*„co je závodníkům do toho“*) |
| Posádka hlásí komisi (trest, neregulérnost) | **Zavřené** | R41. *„Alespoň v prvních verzích ne."* Miloš došel k témuž: *„abychom jim nekomplikovali život"* |

## Za jízdy

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Úprava tratě za jízdy | **Běží** | 7. 11. 2026 **i v appce**: třetí karta pod jménem regaty vedle startu a cíle (`app/src/app/serie/[slug]/zavody/[zavod]/trat.tsx`). Prvky trati v pořadí, u každého *Změna úseku* (C, ZPJ 33) a *Značka chybí* (M, ZPJ 34), nad nimi vyhlášené s odvoláním. Trať se čte **veřejnou cestou**, touž jako web a tabule — zvláštní endpoint pro telefon by znamenal, že rozhodčí vidí jinou trať než ta, podle které se pluje. Jen za jízdy, tutéž mez drží server. **Zbývá** pípání a focení bójí z appky v módu stavby, trať ale schvaluje rozhodčí |
| Dlaždice **360°** za dotek bóje | **Běží** | R36, 7. 11. 2026. Vlastní tabulka `TrestyZaJizdy` — otáčka pořadí nemění, takže to není kód výsledku |
| Dlaždice **720°** za dotek s lodí soupeře | **Běží** | R36, 7. 11. 2026. Totéž co 360°, jen dvě otáčky |
| Trest dostupný **celou** rozjížďku, ne jako krok | **Běží** | 7. 11. 2026. Úkony jsou v panelu od chvíle, kdy je nastavený čas startu |
| Vykonaný trest se odklepne | **Běží** | 7. 11. 2026. Pruh *Tresty na trati* pod dlaždicemi (podle `Jede.dc.html`): čipy po lodích s otáčkami a časem od uložení, klepnutím odčiněno. Do té doby šel trest zapsat, ale už ne odkliknout |
| Vytlačená loď a rozjížďka přerušená pro bezpečnost | **Zčásti** | R13, 7. 11. 2026. **Cesta komise běží:** zrušení s důvodem podle ZPJ 32.1 má *Bezpečnost* mezi čtyřmi důvody na výběr a jde z webu i z appky (R17); odložení před startem taky. Nově se u zrušení na obou stranách připomíná **ZPJ 61.4(d)** — před zrušením se mají přijmout důkazy z vhodných zdrojů — s odkazem na záznam trasy, protože vytlačení od bojky je z trasy vidět a z paluby ne. Trasování tím dostalo pravidlovou funkci, kterou dosud plnilo, aniž by mu ji kdo připsal. **Zbytek drží na protestech (K2):** protest vytlačené lodi, náprava podle 61.4(c) a zproštění viny podle 43.1(a). Nárok na nápravu vytlačená loď podle 61.4(b) **nemá** — žádný z pěti důvodů na to nesedí, protože ji nepoškodila komise; to pravidla, ne aplikace |
| Startovní tresty bez vlajek | **Zavřené** | R15, R16. Na poháru se vlajky nevyvěšují, jede se megafonem, takže tresty podle pravidla 30 formálně neplatí. Nosné pro dlaždici OCS |
| Polohy lodí na mapě | **Běží** | Tracking nasazený 24. 10.; **z telefonu to nikdo neověřil** |

## Cíl

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Ruční zápis průjezdu cílem | **Běží** | Od 29. 10. **i v appce**: karta *Cíl* na obrazovce regaty, klepání na lodě s časem z telefonu, oprava posledního klepnutí i jednotlivého místa, *Ukončit rozjížďku* se zápisem DNF zbylým (`app/src/lib/cil.ts`, `app/src/app/serie/[slug]/zavody/[zavod]/cil.tsx`). Rozepsaný zápis leží v souboru, takže přežije konec appky |
| Přepsat to, co určilo trasování | **Běží** | R33, postaveno 29. 10. Čerstvý průjezd lodi bez místa se ukáže jako návrh s čárkovaným okrajem a klepnutím se zapíše; k zapsanému klepnutí obrazovka nabídne čas ze stopy, leží-li do minuty. Nic se nezapisuje samo a nic se nemaže |
| Shoda v cíli (dvě lodě stejně) | **Běží** | K7, 6. 11. 2026, **v appce od 7. 11.** V cílovém listu se dvěma lodím napíše totéž pořadí; API body za obsazená místa sečte a rozdělí rovným dílem (ZPJ A7) — dvě lodě třetí berou 3,5 a další je pátá, takže jsou body desetinné (`Bodovani.BodyRozjizdky`). V klepacím cíli appky je to **oprava, ne gesto**: rozhodčí klepne na obě lodě po sobě a pak u druhé řekne *Dojela shodně s předchozí*. Shoda je **vztah k předchozímu místu**, ne číslo — odebrání lodi ji skupině nepřelepí. V seznamu se shodné místo pozná rovnítkem místo čísla. **Zbývá klepací cíl na webu**, kde se pořadí pořád počítá jako `i + 1` |

## Po rozjížďce

| Co chce | Stav | Kde to je / co zbývá |
| --- | --- | --- |
| Odsouhlasení pořadí | **Jen web** | Stavy výsledků, běží |
| Úpravu výsledků smí jen rozhodčí | **Zčásti** | R38, druhá polovina, 7. 11. 2026. **Opačná polovina opravena:** rozhodčí ročníku, který není zároveň pořadatel, nemohl u cíle klepnout jedinou loď — `Rozhodci` nepokrývá `Organizator` (*„rozhodčí není stupeň“*, `Prava.Pokryva`) —, a přitom celý K8 vznikl z toho, že u startu a cíle rozhodčí **stojí**. Teď prochází týmž sítem jako pomocník (`Pomocnici.SmiUVody`): velení, procedura, start, konec, zápis dojezdů. **Dvojice očí zůstává**, protože se dělí dvě věci — *zapsat* čísla, která ještě nikdo nepodepsal, a *změnit* podepsaná, u čehož by rozhodčí ověřoval sám sebe; to jde dál jedině přes revizi. **Nerozhodnuto zůstává**, jestli má zapisovat i pořadatel: Milošova věta říká *„pouze rozhodčí“*, Filipovo rozhodnutí ze 16. 10. *„pořadatel dokud je zápis otevřený“*. Dokud to nikdo nerozhodne, platí Filipovo |
| Zásah do pořadí při protestu | **Zčásti** | K2, 7. 11. 2026. Protesty jako celek se **nestaví** — velká věc s vlastním rozhodnutím: pohár není pod svazem, takže odvolání k ČSJ odpadá a protestní komise by byla poslední instancí. Postavené je to, na co aplikace data má: **protestní časový limit** podle ZPJ 60.3(b), dvě hodiny po dojezdu poslední lodi, se počítá a u rozjížďky se píše, dokud běží. **Nic nezamyká** — aplikace nevi, že nějaký protest visí, takže by zamykala podle hodin, ne podle skutečnosti. Jestli má podpis nepustit, je otevřená otázka na rozhodčího |
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
