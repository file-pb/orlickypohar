# 9-rizika (bezpečnost a rizika) — kolo 1

Podle zadání oboru jsem **četl kód a na mocku nic nespouštěl; obrazovky jsem
očima neviděl.** Rozměry cituji z auditu (šířka 375 px), chování z řádků kódu.

## Co je dobře

1. **Rozhraní nabízí jen to, co server pustí, a server to kontroluje znovu.**
   Nabídka úkonů přichází z API (`Kalendar.MozneZ`, `Kalendar.cs:98`;
   `Prihlasky.MozneZ`, `Prihlasky.cs:160`) a endpoint se ptá na právo sám
   (`KalendarEndpoints.cs:172–173`, `:190`). Schované tlačítko tu není ochrana.
2. **Žádný zápis nejde spustit odkazem.** Všechno jsou POST serverové akce,
   cookie sezení je `httpOnly`, `secure`, `sameSite: lax` (`web/lib/oidc.ts:66`);
   i potvrzení v adrese (`?potvrdit=`) jen předvyplní formulář, klepnout se musí.
3. **Vzor „rozbal → Opravdu odebrat" už v kódu je** i s větou o následku: klíč
   trackeru (`tracker/[zavod]/page.tsx:413–421`), smazání trati
   (`boje/[zavod]/vyber-trati.tsx:231–275`). Není co vymýšlet, jen rozšířit.
4. **Zrušení rozjížďky je udělané správně:** rozbalovač, povinný důvod vynucený
   serverem, zpět jen přes návrh (`vysledky/[zavod]/page.tsx:702–725`,
   `Workflow.cs:142–170`). Stejně tak loď s výsledky nejde odhlásit
   (`Prihlasky.cs:114–117`) a poslední správce odebrat (`OpravneniSprava.cs:253–258`).
5. **„Zrušit prezenci" není to nebezpečné tlačítko přihlášek.** Je vratné
   jedním klepnutím a zapíše se, kdo to udělal (`PrihlaskySprava.cs:292`).
   K otázce 2: z 34 tlačítek (audit C) je riziko jinde — viz bod 2 níž.

## Co je špatně

1. **Kalendář: jedno klepnutí bez otázky vyndá odjetou regatu z průběžného pořadí.**
   - **Nález** — Karta odjeté regaty nese vedle sebe „Vrátit mezi vypsané" (×7)
     a „Stáhnout z webu" (×8, audit C; `kalendar/page.tsx:483–520`). Pořadí poháru
     počítá jen regaty `Publikovano && Stav == Odjety` (`PoradiEndpoints.cs:85`, `:105`),
     takže oba úkony tiše přepočítají celý pohár. Navíc pravidlo „odjetý závod
     zrušit nejde — jsou v něm výsledky" (`Kalendar.cs:74–77`) se obejde dvěma
     klepnutími: Odjetý → Vypsaný je dovolený krok zpět (`:84–88`) a Vypsaný → Zrušený
     už ano. Krok zpět smí i pořadatel jediné regaty (`Kalendar.cs:41–44`).
   - **Proč to vadí** — Scénář: správce chce na telefonu „Zveřejnit" novou regatu,
     palec sjede o kartu výš. Hláška řekne „z webu zmizela. Stav regaty se tím
     nezměnil" (`page.tsx:567`) — že lodím ubyly body, neřekne. Vratné to je, ale
     nikdo neví, že je co vracet.
   - **Návrh** — K otázce 1: kalendář nese **jen krok vpřed** (potvrdit, vypsat,
     odjeto, zveřejnit). Krok zpět, stažení a zrušení patří do okna regaty pod
     „Další úkony" jako u karty rozjížďky. Na serveru: Odjetý → Vypsaný odmítnout,
     dokud má regata rozjížďku s výsledky venku — jinak pravidlo o zrušení neplatí.

2. **Přihlášky: „Smazat" je jediné tvrdé mazání osobních dat a je na jedno klepnutí.**
   - **Nález** — Tlačítko stojí v řádku mezi přepínači stavu, bez otázky
     (`prihlasky/[zavod]/page.tsx:682–692`). Smaže účast, kontakty, přihlášku do
     ročníku, loď i osobu, pokud je nic jiného nedrží (`PrihlaskySprava.cs:475–503`).
     Nabízí se i u lodi **vrácené k doplnění** (`Prihlasky.cs:156–157`) — to není
     spam, to je skutečný kapitán, kterému pořadatel právě napsal, co má doplnit.
     A neběží v transakci: kontakty maže `ExecuteDelete` hned (`:475`), zbytek až
     dalšími zápisy; pád uprostřed nechá přihlášku bez kontaktů.
   - **Proč to vadí** — Zpět nevede nic: kapitán vyplní formulář znovu a kontakt,
     přes který mu šlo napsat, je pryč. Následek je jen v `title` (viz bod 4).
   - **Návrh** — „Smazat" za rozbalovač s větou o následku a tlačítkem „Opravdu
     smazat" (vzor klíče trackeru); u stavu *K doplnění* ho nenabízet vůbec;
     `SmazAsync` do jedné transakce.

3. **Fotka papíru z vody se dá jedním klepnutím nenávratně smazat i přepsat.**
   - **Nález** — „Odebrat fotku" i „Nahradit fotku" jsou bez otázky
     (`vysledky/[zavod]/[cislo]/page.tsx:386–419`). Nahrazení starý soubor smaže
     z úložiště (`FotkySprava.cs:123–132`), odebrání taky (`:211–222`).
   - **Proč to vadí** — Papír zapisovatele je prvotní doklad rozjížďky; opírá se
     o něj porovnání zápisů i protest. Scénář: zapisovatel vyfotí omylem jiný list,
     „Nahradit" — a snímek správné rozjížďky už neexistuje nikde.
   - **Návrh** — Fotka papíru se **nepřepisuje ani nemaže, jen přidává verzi** —
     totéž pravidlo, jaké už platí pro plachetní směrnice („verze se nepřepisují").

4. **Následek úkonu je napsaný jen v `title` — na telefonu ho nikdo neuvidí.**
   - **Nález** — „Zmizí z webu. Stav regaty se tím nemění." (`kalendar/page.tsx:511–515`),
     „Body z téhle rozjížďky přestanou platit v poháru." (`vysledky/[zavod]/page.tsx:635–639`),
     „Smaže přihlášku i loď a osobu…" (`prihlasky/[zavod]/page.tsx:688`). Na 375 px
     s dotykem se `title` nezobrazí; rámec 7 přitom říká, že se pracuje telefonem.
   - **Proč to vadí** — Varování existuje, ale jen pro myš. U vody je úkon
     s následkem k nerozeznání od úkonu bez něj.
   - **Návrh** — Každý úkon, který něco schová, smaže nebo přepočítá pohár, má
     následek **viditelnou větou pod tlačítkem** uvnitř rozbalovače. Platí i pro
     „Schovat ročník před veřejností" (`kalendar/page.tsx:171–178`, 32 px v auditu B):
     jen ho zvětšit na 44 px riziko zvýší — jedno klepnutí vyprázdní web i appku.

5. **„Pustit ven" u výsledků odešle zprávu do telefonů a ta se nedá vzít zpět.**
   - **Nález** — Publikace rozjížďky zařadí upozornění všem odběratelům ročníku
     (`VysledkySprava.cs:347–384`). „Stáhnout z webu" ho neodvolá; a oprava cestou
     stáhnout → pustit znovu pošle „výsledky jsou venku" **podruhé**, protože
     pojistka hlídá jen stav v tu chvíli (`:347`). Tlačítko o telefonech nemluví
     (`vysledky/[zavod]/page.tsx:652–661`).
   - **Proč to vadí** — Je to jediný úkon správy, který opouští web: stažením se
     chyba z webu opraví, z telefonů ne, a opravná zpráva nepřijde.
   - **Návrh** — Tlačítko se jmenuje „Pustit ven a oznámit do telefonů" a po stažení
     se stejným kanálem pošle „výsledky N. rozjížďky byly staženy k opravě".

6. **Po stažení, schování a odebrání nezůstane, kdo to udělal.**
   - **Nález** — `PrepniStavAsync` a `PublikujAsync` jen přepíšou příznak a původce
     vůbec nedostanou (`KalendarSprava.cs:417–436`); totéž publikace ročníku
     (`SerieSpravaEndpoints.cs:83`) a `OdeberAsync` oprávnění (`OpravneniSprava.cs:243–261`).
     Přihlášky záznam mají (`PrihlaskySprava.cs:292`).
   - **Proč to vadí** — Nejde odlišit omyl od záměru ani od zneužitého účtu. Štítek
     „uzavřeno samo" vznikl ze stejné potřeby (`kalendar/page.tsx:443–451`).
   - **Návrh** — Stejný záznam (kdo, kdy, z čeho na co) u stavu a publikace regaty,
     publikace ročníku a oprávnění; na kartě štítek „staženo — kdo, kdy".

7. **Oprávnění: štítek role je zároveň mazací tlačítko.**
   - **Nález** — Na oprávnění webu se role odebírá klepnutím na štítek „Správce
     webu ×" (`opravneni-webu/page.tsx:150–160`); v ročníku je „Odebrat" 32 px
     vysoké (audit B). Obojí bez otázky. Je to rozhodnutí konzilia z 12. 11.
     (bod 15) — podle mého oboru špatné.
   - **Proč to vadí** — Štítek vypadá jako údaj, ne jako úkon. Vrátit roli umí jen
     zbylý správce, který si pamatuje e-mail odebraného.
   - **Návrh** — Štítek zůstane údajem; odebrání je rozbalovač „Odebrat roli…"
     s tlačítkem „Opravdu odebrat <role> — <jméno>".

8. **Smazaný článek je vratný jen pro toho, kdo zná adresu.**
   - **Nález** — Tlačítka ve výpisu nesou jméno stavu, ne sloveso: „Smazané",
     „Skryté" (`clanky/page.tsx:221–231`). Smazaný z výpisu zmizí a zpět vede jen
     ručně psaná adresa (`ClankySprava.cs:74–76`); hláška odkaz nedává (`:126–130`).
   - **Proč to vadí** — Měkké mazání bez cesty zpět je pro uživatele tvrdé mazání.
   - **Návrh** — Pod výpisem sbalený oddíl „Smazané (n)" s „Vrátit jako koncept" —
     vzor oddílu odhlášených lodí (`prihlasky/[zavod]/page.tsx:440`).

9. **Jedno sloveso „stáhnout" pro vratné skrytí i nevratné smazání.**
   - **Nález** — „Stáhnout z webu" (regata, rozjížďka) je vratný příznak; „Stáhnout
     verzi N" u směrnice smaže soubor z úložiště (`smernice/[zavod]/page.tsx:228–242`);
     holé „Stáhnout" ×3 na polohách (audit B) stahuje zprávu z vývěsky
     (`tracker/[zavod]/page.tsx:536–540`) — a běžně znamená uložit soubor.
   - **Proč to vadí** — Kdo se naučil, že „stáhnout" jde vrátit, smaže směrnici.
   - **Návrh** — Vratné úkony „Skrýt z webu", nevratné „Stáhnout z vývěsky (smaže soubor)".

## Co bych potřeboval vědět

- **5-jachting:** Kdy je legitimní vrátit odjetou regatu mezi vypsané — a smí to
  pořadatel jediné regaty, když tím mění pořadí celého poháru? A jak dlouho se má
  držet fotka papíru (protestní lhůta, vyhlášení ročníku)?
- **1-ergonomie, 3-ux:** Unese stůl registrace a zápis u vody rozbalovač s druhým
  klepnutím? Navrhuji ho jen tam, kde úkon nejde vrátit nebo mění pohár — ne
  u „Zrušit prezenci".
- **8-pr:** Je po stažení výsledků horší druhé pípnutí telefonu, nebo mlčení?
- **Filip:** Za jak dlouho umíš ze zálohy vrátit **jednu** smazanou přihlášku
  s kontakty? Tvrdé mazání v bodě 2 je únosné jen s tou odpovědí.
- **Filip:** Připojovací kód k lodi se nese v adrese (`prihlasky/[zavod]/akce.ts:166`),
  platí 15 minut a jde použít opakovaně (`KodySprava.cs:79` jen počítá). Zapisuje
  nginx nebo Traefik adresy správy i s dotazem do logu?

## Čeho se nedotýkám

- Vkus a podoba nebezpečných tlačítek (2-design, 10-grafik) — říkám jen, že
  následek má být čitelný bez myši.
- Cena a pořadí nápravy; velikost dotykových cílů jako taková (1-ergonomie).
- Provoz, zálohy a nasazení — žijí v platformě; ptám se na ně, neposuzuji je.
- Mobilní appka, tabule, délka stránek a úvodní stránka (otázky 3–7).
- Role rozhodčího a pořadatele jediné regaty: jen pravidla API, ne obrazovky.
