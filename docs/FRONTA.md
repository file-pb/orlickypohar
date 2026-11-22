# Fronta: co se má vzít (22. 11. 2026)

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
commitu `0b00bb36` dnes; co ověřené není, je **u toho napsané** — a jedna
položka ve skupině E je právě to ověření.

---

## A) Nic to nedrží — dá se vzít hned

**Skupina A je prázdná.** Všechny čtyři položky z Filipových odpovědí jsou
postavené a nasazené (22. 11.):

| Co | Jak to dopadlo |
| --- | --- |
| **Zámek startovní listiny** | Visí na tom dřívějším ze dvou: vyhlášená rozprava (otevřené okno dne), nebo zapsaný čas startu. Dvacetiminutová mezera mezi klubovnou a zápisem času zmizela |
| **Protestní lhůta drží podpis** | `Protesty.ProcNejdePodepsat` se zbývajícími minutami a koncem v čase Orlíku; web tlačítko během lhůty nenabízí. Rozjížďka bez dojezdu nečeká. **Zkrátit** ji jde na výslovný pokyn s povinným důvodem (rozbalovač u rozjížďky, `Protesty.ProcNejdeZkratit`); prodloužit ne, pod dojezd poslední lodi ne, uplynulou ne, a zkrácení zůstane napsané i po podpisu |
| **Uzavření regaty** | Úkon existoval (Vypsaný → Odjetý); přibyl automat po dvou dnech od konce posledního závodního dne. Zavírá, nepodepisuje, a regatu, ve které se nic nejelo, nechá stát |
| **Dráha a hodina posledního startu** | Dvě kolonky u regaty, s nápovědou z ročníku — medián hodiny, poslední použitá dráha. K tomu **místo konání**, které vypsání do 22. 11. mělo zadrátované jako „neuvedené" |

> **Formulář je hotový** (22. 11., `62eb314b`): vypsání má vlastní sekci
> u regaty (`/sprava/<ročník>/vypsani/<regata>`) se všemi sedmi kolonkami
> a nápovědou z ročníku, karta kalendáře nese štítek *uzavřeno samo*.
> Vzhled na produkci ověřený není — správa chce přihlášení. A má co dělat:
> u *Jarního větru* jsou dnes J1.1(5), J1.1(6) i J1.3(4) prázdné a místo
> konání se ve vypsání pořád tiskne jako *neuvedené* (ověřeno na produkci
> 22. 11.). Vyplnění těch sedmi kolonek ty tři body zaplní.

## B) Čeká na Miloše — zpráva je napsaná, zbývá ji poslat

Text k odeslání stojí v [`OTAZKY-MILOS.md`](OTAZKY-MILOS.md).

Z osmi otázek zbyly **tři**: pět jich 21. 11. odpadlo, protože dvě věci
aplikace už umí (revize trati v editoru bójí, vyloučení obojím způsobem)
a tři rozhodl Filip (uzavření dne, protestní lhůta, vypsání po regatách).

| Otázka | Co na ní visí |
| --- | --- |
| **Kde chceš mít přehled o lodích za jízdy** — telefon na lodi, web u stolu, tabule? Nic se neubírá, jde o místo | mapa pro telefon je jiná stavba než mapa pro monitor; dnes je jen na webu |
| **Je uznání výsledků jeden úkon za celou regatu, nebo dál po rozjížďkách?** Filip popsal konec dne; aplikace podepisuje každou rozjížďku zvlášť | celkový přehled regaty před podpisem dnes není |
| **Zůstávají vyloučené lodi odjeté rozjížďky v bodování?** Dnes zůstávají a loď se dál počítá mezi přihlášené | K4, a mez z pravidla 76.1(a), kterou aplikace nehlídá |

## C) Čeká na rozhodnutí Filipa

- **Kolik z osmi kombinací stavitele se za sezónu reálně postaví?** Pátá
  otázka konzilia, jediná otevřená. Pořadí voleb má být podle četnosti a
  pevně zadrátované — bez čísel ho seřadí odhadem, a odhad se na vodě pozná.
- **Kdo appku nemá, se o přeloženém termínu nedozví** (zbytek K5). Zpráva
  odchází odběrem ročníku, tedy jen do telefonů. Druhý kanál je rozhodnutí
  (mail? SMS? vůbec?), ne práce.
- **Licence** — **Play je zaplacená** (Filip, 22. 11.), Apple 99 USD ročně
  dodělá. Co z toho přesto zbývá a v repozitáři to vidět je: `app/eas.json`
  má `submit.production` prázdné, takže vydání na Play není čím odeslat
  (chybí účet služby a kanál), a veřejný záznam appka nemá — Play na
  `cz.klihovka.orlickypohar` vrací 404 (ověřeno 22. 11.; uzavřený test by
  se taky nezobrazil, tak to tvrdí jen tolik, že publikovaná není).
  Podklady pro záznam hotové jsou (`app/listing`: ikona 512, feature
  1024×500, odpovědi na dotazníky).
- **Publikovat zbylé zastávky 2027 a plachetní směrnici.** Ověřeno na produkci
  22. 11.: ročník má devět zastávek a vypsaná je **jedna** — *Jarní vítr*,
  která jako jediná nese i směrnici. Ostatních osm stojí ve stavu *Plánovaný*.
  Jsou to termíny a texty, ne práce v repozitáři.


## D) Postavené, ale neověřené — čeká na telefon a na vodu

- **Zkouška stavitele trati**: `ZKOUSKA-STAVITELE.md`, **23 bodů**,
  srovnaných 21. 11. s přestavěnou obrazovkou (seznam je nově řádka na
  značku, s osou a stavem jedním slovem; detail ukazuje jen fakta). Od commitu `ea0e6682` (meze polohy rozvolněné z Orlíku na Česko) se
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
- **Stavitel: co z konzilia nestojí.** Session stavitele odpověděla
  21. 11., takže se to nemusí dočítat z kódu. Postavená jsou rozhodnutí 2,
  3 a 4 (řádka na značku, osa značek, souvislé vlákno); rozhodnutí 5 a 6 se
  appky netýkají, byly to vady makety. **Nepostavené zůstává rozhodnutí 1**
  (pevný dolní pruh s pípnutím ve všech stavech), **akce detailu** (přesun,
  fotka, sebrání, barva, pořadí, mazání — pravidla a testy ano, obrazovka
  ne) a **karta zádrhelu** z prvního konzilia. Staví to ta session, ne já.
- **Barvy bójí, až je stavitel začne malovat.** Konzilium (bod 3) žádá
  vlastní tokeny, protože makety si barvu bóje půjčují od
  `pripravaZnameni` a `stavZruseny`. V živém kódu ten rozchod **není**:
  appka bóje barvou nemaluje vůbec a web má na ně vlastní tabulku
  (`web/app/znak-boje.tsx`, `BARVY`) s rozhodnutím, že to tokeny nejsou —
  *„zelená bóje je zelená i na tmavém pozadí, je to vlastnost předmětu ve
  vodě"*. Až stavitel barvy dostane, má si vzít **tu tabulku**, ne vyrobit
  třetí zdroj. Ověřeno 18. 11.: jediné dva výskyty těch dvou tokenů
  v `trat.tsx` jsou texty chyb.
- **Vypsání jako plný dokument J1** (R1, R8). Osnova stojí, dva body si
  aplikace dosadí sama (skupina A), dva vydává Miloš a místo konání nevede
  nikdo (skupina B). Teprve pak je to dokument, o kterém R8 mluví.
- ~~**Obecná offline fronta v appce.**~~ **Postaveno 22. 11. 2026**
  (`d0fa64b9`, `a641a5d1`) session stavitele: `app/src/lib/outbox.ts` stojí
  **po druzích, ne globálně** — u prvků trati určuje pořadí server podle
  doručení, takže odmítnutý prvek musí zastavit i ty za ním, kdežto sebrání
  jedné bóje nemá co blokovat přebarvení druhé. Prvním uživatelem jsou
  akce detailu značky, které do té doby bez signálu padaly. Dávka bodů
  trasy se do něj nestěhuje (tisíce řádků, byl by to druhý tracker) a
  fronta prvků trati až po vodě.
- **Push „déšť do hodiny" nedrží fronta, ale chybějící zdroj.** Projekt má
  vodočet z Povodí Vltavy, teplotu hladiny z Landsatu a blesky z EUMETSAT;
  předpověď srážek na hodinu dopředu nemá žádnou (ověřeno 22. 11.: slovo
  „srážky" není v API nikde). Který zdroj a za jakých podmínek posílat, je
  rozhodnutí, ne práce — patří do skupiny C.

## F) Údržba a drobnosti

- **Tři otevřené Dependabot PR, a všechny tři jsou tatáž věc**:
  `react-native-safe-area-context` (#534),
  `@react-native-community/datetimepicker` (#553) a `expo-sharing` (#546) —
  **nativní moduly appky**. Mění **otisk**, takže telefony s dnes
  nainstalovanou appkou po jejich sloučení přestanou dostávat aktualizace
  po síti, dokud si někdo nenainstaluje nové APK. Patří do jedné dávky
  a hned s vydáním buildu, ne po jednom.
  **Drží je zkouška stavitele ze skupiny D**: sloučit je dřív, než si Filip
  projde těch 23 bodů na telefonu, by znamenalo, že mu appka v ruce tiše
  zůstane na starém JavaScriptu — přesně ta past, co 17. 11. stála půl
  hodiny (`AGENTS.md`, oddíl o pastech). Až po zkoušce.
  Zbylých devět se zavřelo: osm mimo appku sloučil `5298ff4e` (#560)
  a **Scalar** šel rovnou na 3.1.1 (`12f22c9f`), protože nabízená 3.0.0 byla
  o tři vydání pozadu a poznámky k vydání k ní nejsou nikde — major se tedy
  ověřil během, ne čtením. Živé hlášení už žádné není.
- **Odsazení tabule na demo ročnících** — **zadání existuje, jen zatím není
  v repozitáři.** Napsalo ho konzilium *Režie tabule*, dokončené 22. 11.
  ve 22:12: `.tabule` má dnes padding 2,7 % výšky a 2,0 % šířky
  (`globals.css:3658`), kdežto broadcast title-safe je 5 % a televize bez
  vypnutého overscanu ořezává 2 až 5 %. Ořez tedy padne přesně do krajních
  znaků, nejdřív vpravo v žebříčku, kde stojí body a čas. Rozhodnutí je
  vodorovně `5 × --tv`, svisle `3 × --tv`, a cena je reálná: sloupec pořadí
  se zúží, nebo mapa přijde o ~115 px. Patří to do **dávky 2** toho závěru,
  spolu s `--linka-tv` a `--srafou` u dema — odtud i to „na demo ročnících".
  **Tenhle řádek se maže až tou dávkou, ne dřív, a hlavně:** závěr leží
  neverzovaný v `docs/konzilium/rezie-tabule/` na větvi
  `konzilium/rezie-tabule` v hlavním checkoutu, která není nikde odeslaná.
  Dokud se nezveřejní, je 160 kB rozhodnutí jen na jednom disku.

- **Zrušený krok `Deploy` obejde ověření verze** (`AGENTS.md`, oddíl
  o nasazení). Pátý reset přenosu 22. 11. neskončil nenulovým kódem
  `curl`u, ale stavem `cancelled` — větev, která selhání zapamatuje,
  neproběhla a ověření `/verze` se přeskočilo na svém `if: !cancelled()`.
  Úloha spadla, aniž se kdokoliv podíval na produkci; ta přitom běžela
  přesně to, co se posílalo. Záplata je **volba**, ne psaní: buď falešná
  červená, která přes `needs: [nasazeni]` přeskočí vydání do telefonů,
  nebo zrušený běh, který se pět minut nedá zabít.

---

## Co z fronty vypadlo

**22. 11. večer** vypadly obě *Drobnosti* z plánu, které byly prací.
**Kategorie lodi** (`ea19dc98`): správce loď přeřadí u ní na obrazovce
lodí. Návrh to ale říkal zavádějivě — body se nepřenesou, *přepočítají*
se, protože vznikají uvnitř kategorie, takže přeřazení změní pořadí obou
a body i lodím, které nic neudělaly; proto je úkon za zaškrtnutím.
**Testy správy přes HTTP** (`582265e7`): fixtura umí podepsat testovací
token, takže správa jde zkoušet přes HTTP, a čtyři testy hlídají, že se
tím ověřování podpisu nezměkčilo. Zbylá *Drobnost* — odsazení tabule —
zůstává, protože k ní nikde není zadání; viz skupinu F.

**Z oponentury rozhodčího** se zavřelo K1, K3, K5, K6, K7 (v appce), K8, R3,
R4, R6, R9, R10, R12, R13 (cesta komise), R17, R19, R33, R34, R35, R36, R37,
R38 (polovina) a R39, a s nimi celá startovní procedura podle ZPJ 26 včetně
dirigenta. Z devatenácti nálezů, které 28. 10. čekaly na rozhodnutí, nečeká
**ani jeden**.

**Z fronty v plánu** vypadl **úvodník jako příznak článku** — plán z 20. 10.
tvrdí, že to pole neexistuje nikde, a dnes je v `Clanek.cs:132` i ve správě
článků a na stránce regaty. A zbytek, který měl 28. 10. *pípání a focení bójí
z appky*, postavily `a4710ffa`, `34605f3d` a `4b9c256d`.

**18. 11. odpoledne** vypadly tři položky skupiny A: shoda v cíli na webu
(`8dee3387`, 15 testů), verze 3 souhlasu s podmínkami účasti (`8a254875`,
6 testů a nová kontrola rozchodu znění v CI) a verze buildu na `/appka`
(`0b00bb36`). Čtvrtá se rozpadla při čtení kódu — barvy bójí, viz skupinu E.

**22. 11. odpoledne** vypadlo **„integrační testy nejdou na tomhle
stroji"**, a to beze zbytku. Dvakrát se k té položce napsala špatná
příčina — nejdřív nedostupný Docker Hub, pak že kontejnerový runtime na
stroji není vůbec. Filip řekl *„docker tu asi mám"* a měl pravdu: Docker
Desktop je nainstalovaný, jen přesunutý do `/Applications/Vývoj`, zatímco
symlinky v `/usr/local/bin` míří na starou cestu a visí naprázdno. Proto
`which docker` nic nenašel. Stačilo appku spustit: **1186 testů zelených
za 19 s**, integrační včetně, a Testcontainers si socket najde samo bez
jediné proměnné. Oprava je v `AGENTS.md`; za tou noční dvojicí červených
main tedy nestál stroj, ale dvakrát nedoložené tvrzení o něm.

**21. 11.** vypadly z A další dvě položky, a ani jedna nebyla práce.
**Graf tlaku na stránce regaty už tam je** — `BokVitr` ho nese spolu
s 24hodinovým průběhem a na regatě se vykresluje (ověřeno na produkci:
*„Tlak · Kocelovice 1006 hPa ↗ +1,6 za 3 h"*); zápis v plánu je z 20. 10.
a od té doby zestárl. A **dva prázdné body vypsání**, o kterých jsem psal,
že si je aplikace dosadí sama, si dosadit neumí: R21 říká, že *Dráhu* vydává
Miloš jako text ve směrnici a zbylé dva pohár nevyhlašuje vůbec. Jedno patří
do B, druhé do C.

Téhož dne odešel i **`VeleniDto`**: příčina nebyla v appce, ale v API —
oba endpointy velitele vracely `IResult`, takže se tvar odpovědi do
kontraktu nedostal. Po `Produces<VeleniDto>()` a přegenerování kontraktu
z produkce je ruční typ v `api.ts` pryč. **Skupina A je tím prázdná** až
na rozšíření `kontrast.test.ts`, a to má smysl až se stavitelem, protože
barvy, které by hlídalo, zatím nikdo nemaluje.

## Jak se tahle fronta udržuje

1. Nový nález jde do svého zdroje — oponentura, závěr konzilia, plán —, ne sem.
2. Stav Milošova požadavku jde do `STAV-RESENI.md`, ne sem.
3. Sem se píše **jen to, co se má vzít**, a řádek se maže teprve tehdy, když
   je věc v kódu nebo nasazená. Hotovo se nepíše do sloupce, hotovo řádek
   odebere — doklad zůstane v commitu.
4. Co se tvrdí, má mít u sebe cestu a číslo řádku. Kde je místo toho napsané
   *nekontroloval jsem*, je to taky tvrzení — jen opačné.
