# psycholog — kolo 1

## Co je dobře

1. **Cílová obrazovka nese odpovědnost spolu s člověkem.** Stav „ukládám… / neuloženo / uloženo" (`cil.tsx:750`), záloha v telefonu, „Vrátit poslední" (`:919`) a před přepsáním ukázaný rozdíl (`:804`). Pod tlakem člověk nemusí nástroji věřit — vidí, co se stalo. (Z kódu.)
2. **Úkony s vahou chtějí důvod a řeknou následek dřív, než se klepne.** „Vrátit k revizi" a „Zrušit rozjížďku" mají pole důvodu a větu s odkazem na ZPJ 32.1. Rozhodčí má pro rozhodnutí oporu, ne jen tlačítko.
3. **Hlášky říkají proč, a tím učí, jak web přemýšlí.** „Adresa zůstane … — odkaz už mohl někam odejít", „Posun termínu si zapamatuje ten původní — lidé se na něj chystali". Kdo ví proč, příště nehádá.
4. **Výpadek nesvaluje vinu na člověka.** „Výpadek na naší straně, ne chyba u tebe — stránka existuje… nic se mezitím neztratilo" (`vypadek.tsx`). Přesně věta, která zabrání třem zbytečným pokusům.
5. **Zamčené je zamčené a řekne, kdo má klíč.** Potvrzená rozjížďka má pole `disabled` a větu „musí je rozhodčí vrátit k revizi". Kalendář pořadateli jedné regaty u cizích regat úkony vůbec neukáže.

## Co je špatně

Všechna čísla jsou z šířky 375 × 812, jako správce ročníku (`filip`) a pořadatel jedné regaty (`milos`). Nic jsem neodesílal; co je jen z kódu, je tak označeno.

### 1. Kalendář: kroky zpět s veřejným následkem jsou to nejvýraznější na kartě (otázka 1)
- **Nález** — Na kartě odjeté regaty stojí „Vrátit mezi vypsané" (x 39–179) a „Stáhnout z webu" (x 186–309): 7 px od sebe, obě 32 px. Co udělají, je jen v `title` (`kalendar/page.tsx:494` a `:511–515`), tedy na telefonu nikdy. „Schovat ročník před veřejností" (32 px, y = 467, první obrazovka) schová jedním klepnutím celý ročník i s výsledky (`:171–177`).
- **Proč to vadí** — Po sezóně nemá karta žádný krok vpřed, takže váhu dostanou dva kroky, které nikdo nechce. Sedm odkazů vedle nich učí, že se tu klepe na cokoliv. Omyl pozná veřejnost dřív než pořadatel.
- **Návrh** — Karta v kalendáři nese stav, jeden krok vpřed (má-li regata nějaký) a „Otevřít regatu →". Kroky zpět a stažení jdou pod „Další úkony" s větou z `title` vypsanou jako text. „Schovat ročník" dostane mezikrok bez javascriptu, jaký už má „Opravdu odebrat" (`tracker/[zavod]/page.tsx:419`). Sedm odkazů pryč — vedou tam, kam okno regaty.

### 2. Přihlášky: to, za co pořadatel ručí, se čte z nepřítomnosti (otázka 2)
- **Nález** — Tabulka má 587 px v 335 px. Sloupec „Stav" začíná na 276 px a „Zrušit prezenci" leží na 474–608 px, celé mimo obrazovku; vidět zůstává „Vystavit kód" (21 px). Nezaplacené startovné se pozná jen tím, že chybí slovo „zaplaceno" (`prihlasky/[zavod]/page.tsx:742`). Nad tabulkou je 174 px vysoký odstavec „Bez souhlasu s pravidly: 16 z 16" se všemi jmény, který sám říká, že se nevynucuje.
- **Proč to vadí** — V den regaty pořadatel odpovídá za dvě věci: kdo přijel a kdo zaplatil. Obojí musí držet v hlavě nebo rolovat do strany. Upozornění, které platí pro všechny a nic nechce, naučí přehlížet i to příští, které něco chtít bude.
- **Návrh** — Řádek ukazuje jméno a dva stavy vždy slovem („prezence: ano / čeká", „startovné: zaplaceno / nezaplaceno") a nejvýš jeden krok podle stavu. Kód, zrušení prezence a posádka až v „Podrobnostech". Souhlas: jedna věta s počtem, jména jen když chybí menšině.

### 3. Polohy lodí: nevratný krok stojí nad nastavením, které zamkne
- **Nález** — Pořadí oddílů: „Závodní den" s tlačítkem „Rozprava — otevřít den", pak „Vývěska", až třetí „Co je vidět" s větou „Nastav to před rozpravou: tou to zaklapne, a zamrzne i to, co nikdo nenastavil".
- **Proč to vadí** — Obrazovka se čte shora a pod tlakem se klepe na první tlačítko. Pokyn, co udělat předtím, člověk potká až po něm. Výchozí hodnota je bezpečná, takže škoda je „přenos ven celý den nepůjde" — a pořadatel neví proč.
- **Návrh** — „Co je vidět" nad „Závodní den" a u tlačítka rozpravy jedna věta s tím, co se právě zamyká: „Zamkne se: posádky vidí jen sebe, ven nic."

### 4. Po odmítnutí se člověk vrací na vrch stránky bez toho, co napsal
- **Nález** — Chyba při úpravě regaty přesměruje na kalendář jen s textem chyby (`kalendar/akce.ts:103–106`); formulář té regaty je sbalený až o dvě obrazovky níž (dokument 2,9 obrazovky) a hláška neříká, o kterou regatu jde. Vyplněné hodnoty se nevracejí — u založení deset polí (`:88–94`). (Z kódu.)
- **Proč to vadí** — Odmítnutí je chvíle, kdy se rozhoduje o důvěře. Kdo musí znovu najít kartu a psát to samé, napodruhé to zkusí; potřetí volá správci ročníku.
- **Návrh** — Hotové `kde=zalozeni` rozšířit na `kde=<slug>`: otevře formulář té regaty, skočí na něj kotvou, hláška jmenuje regatu a hodnoty se vrátí vyplněné.

### 5. Obrazovka neřekne, co se ode mě čeká — a jednou si protiřečí
- **Nález** — Pořadatel Izolepy dostane v „Zápisu výsledků" osm regat s výzvou „Vyber regatu, jejíž rozjížďky chceš posunout". Sedm z nich otevře holý seznam bez úkonů a bez slova proč (ověřeno na `radavsky-pohar`). „Co teď" ukáže správci pod sebou „9 otázek čeká na tvou odpověď" a „Teď nic nečeká" (`sprava/[serie]/page.tsx:319`).
- **Proč to vadí** — Bez věty člověk nerozliší „nesmím" od „rozbilo se". Dobrovolník si to vyloží jako vlastní chybu. A „Co teď" je jediná obrazovka, která má nejistotu snímat.
- **Návrh** — Nad cizí regatou věta „Tady jen čteš — pořadatelem jsi u Izolepy." a v seznamu vlastní regata první a označená. V „Co teď" větu zúžit na to, co tvrdí: „Žádná regata teď nic nechce."

### 6. Tabule na telefonu slibuje, co nedodá (otázka 5, vada A2)
- **Nález** — Odkaz z veřejné regaty vede na telefonu na písmo 2,9–4,3 px.
- **Proč to vadí** — Návštěvník z toho nevyčte „tohle je pro televizi", ale „web je rozbitý" — a přenese to na výsledky vedle.
- **Návrh** — A2 není vada ke zvětšení, ale rozhodnutí: pod 600 px se místo televizního rozvržení vykreslí rozcestník „Tabule je obrazovka do klubovny. Na telefonu máš totéž ve Výsledcích →". Jde to čistě přes CSS, bez javascriptu.

### 7. Úvod odpovídá zasvěcenému; cizímu neřekne, co to je (otázka 3)
- **Nález** — První obrazovka nese název, podtitul 11,52 px a dvě věty pro znalce („Odjeto 7 z 8 regat", „Vedou SEA MOUSE III, PEZI, LUNA"). Osmá regata je přitom zrušená (kalendář správy), takže „7 z 8" slibuje závod, který nebude.
- **Proč to vadí** — Cizí člověk si klade otázku „co to je a týká se mě to?"; fanoušek po sezóně „jak to dopadlo?". Ani jeden odpověď nahoře nenajde a první odkaz na regatu je 543 px daleko.
- **Návrh** — Pod název jedna věta pro cizího („Osm regat plachetnic na Orlíku, květen až září. Přijet může každý s lodí." — znění ať potvrdí 5-jachting) a stavová věta podle sezóny: po poslední regatě „Ročník 2026 je odjetý — vyhráli …", zrušená se do „z osmi" nepočítá.

### 8. „Nová regata" chce deset odpovědí dřív, než je na co odpovídat
- **Nález** — Založení termínu se ptá i na vyhodnocení, škrty, koeficient do poháru, kdy ukazovat průběžné výsledky a kdo smí zapisovat dojezdy; stejných deset polí je pod každým „Upravit termín a údaje".
- **Proč to vadí** — Rozhodnutí vyžádané měsíce předem skončí u výchozí hodnoty nebo u strachu formulář odeslat. A kdo jen posouvá termín, má pod prstem koeficient do poháru.
- **Návrh** — Založení a úprava termínu mají tři pole (název, termín, pořadatel). Zbytek je vlastní rozbalení „Pravidla regaty — bodování a zveřejnění" s výchozími hodnotami.

### 9. „Stáhnout" znamená tři věci
- **Nález** — „Stáhnout z webu" (regata, rozjížďka), holé „Stáhnout" u zprávy na vývěsce, „stáhnout odvolanou verzi" u směrnice. Na telefonu to slovo běžně znamená uložit soubor; i audit ho v oddílu B uvádí bez předmětu.
- **Proč to vadí** — Nejistota těsně před klepnutím na úkon, který uvidí veřejnost. Kdo čeká soubor, sundá výstrahu z tabule.
- **Návrh** — „Skrýt na webu" a „Sundat z vývěsky"; sloveso vždy s předmětem.

### 10. Stránky, kam se chodí v nejistotě, kladou nejvíc odporu (otázka 6)
- **Nález** — Osobní údaje: tabulky 955 a 1416 px v 333 px. Nápověda: 15,8 obrazovky.
- **Proč to vadí** — Na osobní údaje jde člověk, který nedůvěřuje; obsah schovaný do strany čte jako schovaný. Do nápovědy jde ten, komu se něco nepovedlo. Správa to řeší dobře kotvami („Proč web nic neukazuje", „jak to jde po sobě"), veřejná nabídka ne.
- **Návrh** — Osobní údaje na telefonu jako seznam pod sebou („co · proč · jak dlouho"), ne tabulka. Nápovědu nekrátit, ale dát jí nahoře čtyři odkazy podle role.

### 11. Pruh počasí, který visí pořád, učí přehlížet výstrahu (otázka 4; dojem)
- **Nález** — Ve správě pruh počasí není (ověřeno na přihláškách), takže 15 % platí veřejná část. V mocku nese trvale výstrahu „Rizikové sněhové jevy".
- **Proč to vadí** — Výstraha, která je na očích i tehdy, když se nic neděje, přestane být v den regaty vidět.
- **Návrh** — Pruh je lepivý jen v den regaty nebo když nese výstrahu; jinak je součástí stránky.

## Co bych potřeboval vědět

- **9-rizika:** Co udělá „Vrátit mezi vypsané" u odjeté regaty s výsledky venku a „Zrušit prezenci" u lodi, která má výsledky? Odmítne-li to API, je to zbytečné tlačítko; projde-li, je to past.
- **5-jachting:** Co potřebuje pořadatel u přihlášek vidět bez klepnutí — prezenci, startovné, obojí? Vymáhá někdo na místě souhlas s pravidly? A co znamená prázdné pořadí u lodi, která nepřijela (zápis má 37 řádků při 16 lodích)?
- **3-ux:** Po úkonu v kalendáři se stránka vrací nahoru s hláškou. Vidí člověk i kartu, na kterou klepl? Neodesílal jsem.
- **Filip:** Kdo kromě tebe letos správu skutečně použil a kvůli čemu ti volal? Je to jediný tvrdý údaj o důvěře a nemám ho.
- **Neviděl jsem:** přihlášení (`/prihlaseni` vrací v mocku 500) — první dojem nového dobrovolníka; cílovou obrazovku v běhu; úvodní fotku.

## Čeho se nedotýkám

- Vzhled, kontrast, velikost písma a jednota (otázka 7) — 2-design a 10-grafik.
- Počet kroků a míra 44 px — 1-ergonomie; oddíl B se opraví tak jako tak.
- Jestli kódy, stavy a pořadí úkonů sedí na ZPJ a praxi regat — 5-jachting.
- Co jde zneužít nebo obejít — 9-rizika; řeším jen to, co člověk udělá omylem.
- Jak web působí navenek a co se dá ukázat — 8-pr.
