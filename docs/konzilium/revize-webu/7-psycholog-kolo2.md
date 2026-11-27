# psycholog — kolo 2

## Kde ustupuju

Nová čísla jsou z 375 × 812, úvod jako návštěvník bez cookie proti mocku. Co je spočtené z kódu, je tak označeno.

- **A — 5-jachtingu a 9-rizikům: kalendář nese jen krok vpřed.** Důvod z mého oboru: na seznamu osmi stejných karet je nejčastější omyl „správný úkon, špatná regata" (scénář 9: palec o kartu výš) a „Další úkony" na kartě ho neodstraní, jen zpomalí. V okně regaty je na obrazovce jediná regata. **Kde v okně:** sbalený oddíl v patě okna, stejný pod všemi šesti agendami, se souhrnem, který zároveň říká stav — „Stav regaty: odjeto · na webu ▸". Uvnitř každý krok s větou následku a tlačítkem, které nese jméno („Opravdu vrátit Radavský pohár mezi vypsané"). Úprava termínu zůstává v kalendáři.
- **D, místo — 1-ergonomii:** na čtecích stránkách (nápověda, pravidla, vypsání, osobní údaje) pruh počasí nelepí ani v den regaty. Tam se nerozhoduje o vodě.
- **E, práh — ze svých 600 px.** Nestačí ani 700 px 2-designu: písmo tabule je `--tv: min(1vw, 1.78vh)` (`globals.css:3690`), roste tedy s šířkou. Nejmenší text má 2,9 px na 375 px, tedy 5,4 px na 700, 5,9 na 768 a 7,9 na 1024 (spočteno). **Práh 1024 px**; pod ním se televizní rozvržení nekreslí.
- **E, znění — 5-jachtingu:** moje věta „na telefonu máš totéž ve Výsledcích" neplatí, dokud „Vydáno k regatě" žije jen na tabuli. Do té doby rozcestník říká jen „Tabule je obrazovka do klubovny. Výsledky regaty →". Jeho podmínka smí přijít po schování: vývěsku v písmu 2,9 px dnes na telefonu stejně nikdo nečte, schováním se nic neztratí.

## Kde držím

- **B — stav slovem, ne znakem; souhlas do řádku jen podmíněně.** Pořadatel jedné regaty tu obrazovku vidí jednou za rok; znak chce legendu a paměť, slovo ne. A souhlas dnes u zapsané lodi **nejde zaznamenat**: bere se jen při přihlašování lodi pořadatelem (`prihlasky/[zavod]/akce.ts:44–46`), Podrobnosti ukazují „nezaznamenaný" bez ovládání. Znak v řádku by tak 16× hlásil něco, s čím se u stolu nedá nic dělat — tatáž vada jako dnešní hlavička, jen rozepsaná do řádků. **Je-li v Podrobnostech zaškrtnutí souhlasu, patří do řádku (5 má pravdu, že prezence jsou tři otázky); není-li, nepatří do řádku ani do hlavičky (3).**
  **Řádek pro 375 px** (karta podle 1-ergonomie, shora dolů):
  1. `CZE 434` · **FAR STAR III** v `--text` · Nikola Bureš
  2. co chybí, slovy: „čeká na prezenci · nezaplaceno · bez souhlasu"; nechybí-li nic, „v pořádku"
  3. „Potvrdit prezenci" 44 px přes šířku, jen u nepotvrzené; pod ním „Podrobnosti ▸" (startovné, kód, zrušení prezence, posádka)
  Pravidlo: **co chybí, je napsáno; co je v pořádku, mlčí.** Dnes je to obráceně — „zaplaceno" se píše a nezaplaceno se pozná z ticha (`page.tsx:742`). Nad seznamem jedna věta s počty: „Chybí: prezence 3 · startovné 5".
  Když se rozhodne pro znaky bez slova: první regatu sezóny je bude pořadatel luštit u stolu s frontou lodí.
- **D, čas — proti samotnému „podle místa".** Jedno pravidlo ze dvou podmínek: **pruh počasí lepí jen na úvodu a veřejné regatě (místo, 1) a jen v den regaty nebo když nese výstrahu (čas); jinak je blokem v patě.** Důvod držet čas: pruh se v mocku hýbe i teď, v listopadu (`paticka-posun`, 28 s, změřeno), a nese výstrahu o sněhu. Výstraha, která svítí a jede každý den, není v den regaty vidět. Rozhodne-li se jen podle místa, zůstane na úvodu trvalý pohyblivý pruh 365 dní kvůli osmi.
- **H — jedno pravidlo, a úzké.** Každé další „Opravdu" zlevňuje ta ostatní; po třetím se odklepává. Proto: **druhé klepnutí dostane úkon, který (1) nejde vrátit jedním klepnutím z téže obrazovky, nebo (2) ubírá něco, co už veřejnost vidí nebo pohár počítá.** Co přidává a co vrátím na místě, zůstává na jedno klepnutí.
  - Pod (1): Smazat přihlášku · Odebrat roli (zpět jen přes e-mail, který si někdo musí pamatovat — s 9 proti bodu 15) · Smazat článek, dokud nemá cestu zpět · smazání souboru směrnice · Odebrat a Nahradit fotku papíru (s verzemi z pravidla vypadne) · už hotové: klíč trackeru, smazání trati, zrušení rozjížďky.
  - Pod (2): Schovat ročník · Skrýt regatu, která je na webu · Skrýt rozjížďku, která je venku · Vrátit odjetou mezi vypsané · Vyndat z poháru · Sundat zprávu z vývěsky.
  - Nespadne: Zrušit prezenci před výsledky (vidím v řádku, vrátím tamtéž) · potvrdit, zveřejnit, pustit ven (přidávají; „Pustit ven" navíc přichází až po podpisu).
  - **1-ergonomii:** vratnost stačí jen tehdy, když se člověk o omylu dozví tam, kde klepl. Scénář 9 ukazuje, že u skrytí odjeté regaty se to nedozví — hláška řekne „stav se nezměnil" a o bodech mlčí.
  - Tvar: tlačítko nese předmět („Opravdu skrýt ročník 2026"), ne holé „Opravdu".
- **K — sloveso „stáhnout" ve správě jako úkon nezůstane vůbec.** Trojice: **Skrýt na webu** (vratné; sedí ke stavu „skrytý" a k opaku „Zveřejnit") · **Sundat z vývěsky** (zpráva zmizí, záznam zůstává) · **Smazat soubor** (nevratné). Proti 9: „skrýt z webu" není česky — skrývá se kde nebo před kým, ne odkud; a „Stáhnout z vývěsky (smaže soubor)" nechává sporné sloveso a to podstatné dává do závorky, kterou pod tlakem nikdo nečte. Směrnice dělá obojí, takže „Sundat z vývěsky a smazat soubor". „Schovat ročník" → „Skrýt ročník", ať sedí s „Ročník je skrytý". Řekne-li 5, že vývěska říká „sejmout", beru jeho slovo. Rozhodne-li se pro 9: kdo si na veřejné části stáhne PDF směrnice, čte ve správě totéž slovo u mazání.
- **C — jinak: jeden seznam pro 375 × 812** (skládám z 2, 3, 5, 8, 10; přidávám pořadí a strop):
  1. Hlavička, 67 px, pevná.
  2. Fotka, 200 px. Na ní **jediný text**: stavová věta, 22,4 px / 700 (2), nejvýš dva řádky ≈ 60 px ve spodním závoji 80 px (10). Je to odkaz na tu jednu věc (3): v sezóně nejbližší regata s datem a místem (5), po sezóně „Ročník 2026 je dojetý — konečné pořadí". Dnes má 14,4 px a leží na y = 243.
  3. Věta pro cizího pod fotkou na čistém pozadí, 16 px, dva řádky ≈ 52 px (8).
  4. Dvě tlačítka 44 px vedle sebe ≈ 60 px: „Chci závodit" · „Výsledky" (8).
  5. Pořadí: první tři každé třídy, stojí (8). Začíná kolem 380 px; do konce obrazovky zbývá ~430 px v běžný den.
  - **Vypadne z první obrazovky:** podtitul verzálkami 11,52 px (říká ho věta 3), „Vedou …" ve větě (říká to pořadí pod ní), pohyb pořadí, novinky.
  - **Proč v tomhle pořadí:** stálý návštěvník hledá podle váhy a stavovou větu najde hned; cizí čte shora a druhá věc mu řekne, co to je; dveře stojí tam, kde zájem vzniká. Strop: nejvýš čtyři věci před prvním posunem.
  - **Podmíněně:** „Chci závodit" jen tehdy, vede-li na stránku, která odpoví (kam, řekne 5). Vede-li na vypsání se šesti „Není vyplněné" (5, bod 8), je lepší jedno tlačítko „Výsledky".
- **D, kolik zůstane pevných:** běžný den **67 px (8 %)** všude. Den regaty nebo výstraha, na úvodu a veřejné regatě: 67 + 57 = **124 px (15 %)**. Partneři podmíněně: je-li jim slíbena *přítomnost*, stojící blok na konci úvodu (8), pevných 0; je-li slíbena *trvalá viditelnost*, stojící řada bez pohybu připnutá jen na úvodu, +64 px, tedy nejvýš 188 px (23 %) na jediné stránce.
- **„Co teď" si protiřečí** (moje kolo 1, bod 5). 3-ux chválí jeho prázdný stav; držím, že „Teď nic nečeká" hned pod úkolem „9 otázek čeká na tvou odpověď" je rozpor (`sprava/[serie]/page.tsx:319`). Oprava je jedna věta.
- **Body 4 a 8 z kola 1** nikdo nenapadl ani nepřevzal: kalendář po chybě vrací nahoru bez vyplněných hodnot (stejná třída jako 3-ux bod 6) a „Nová regata" chce deset odpovědí při zakládání termínu. Držím oba; do závěru je stačí zapsat vedle bodu 6 od 3-ux.

## Kde jsme se shodli

- **A:** karta regaty v kalendáři je stav, krok vpřed a „Otevřít regatu →"; sedm odkazů pryč; kroky zpět v okně regaty.
- **B:** jeden krok s vahou (prezence, 44 px), kód a zrušení prezence do Podrobností, odstavec „16 z 16" se jmény pryč z hlavičky.
- **D:** hlavička návštěvníka jednořádková, 67 px; „Přihlásit" do nabídky.
- **E:** na adrese tabule pod prahem rozcestník (pokryje i adresu poslanou přímo) **a** odkazy pod prahem vedou rovnou na Výsledky (3-ux), aby do rozcestníku nikdo neklepal zbytečně. Řádek při běžící rozjížďce pod prahem zní „Sledovat výsledky →". Samotné nevykreslení odkazu (2) nestačí — adresa přijde i jinudy.
- **H:** Schovat ročník a Smazat přihlášku mají druhé klepnutí; fotka papíru se verzuje.

## Nové, co vylezlo z cizích posudků

- **V první obrazovce návštěvníka běží šest nekonečných animací naráz a na dotyku nejdou zastavit.** Změřeno na úvodu: fotka (prolínání a přibližování, cyklus 21 s), tři pásy pořadí (19,2 s · 80 s · 19,2 s), pruh počasí (28 s), partneři (40 s). Pauza je jen na `:hover` a `:focus-within` (`globals.css:2572–2573`, `:3257`), tedy ne na telefonu; `prefers-reduced-motion` ošetřené je. WCAG 2.2.2 chce u pohybu delšího než 5 s vedle jiného obsahu možnost ho zastavit. **Návrh:** na obrazovce se hýbe nejvýš jedna věc, a to fotka; pořadí, počasí i partneři stojí. Pevné pruhy (D) i úvod (C) to řeší jedním tahem.
- **Odpověď 8-pr** (unavují dva pohyblivé pruhy naráz?): ano — pohyb na okraji zorného pole strhává pozornost mimovolně a nedá se na něj zvyknout, dokud se obsah mění; a nejsou dva, je jich šest.
- **Odpověď 1-ergonomii k cíli** (jeho bod 3, mřížka se přeskládá): z mého oboru nejvážnější nález konzilia na obrazovce, kde se nedá vzít zpět čas — oko zamíří, cíl uhne, a člověk omyl nepozná, protože klepnutí „prošlo". Stojící dlaždice podporuji bez výhrad.
- **K 9-rizikům, bod 5:** přejmenování na „Pustit ven a oznámit do telefonů" podporuji; je to jediné tlačítko, jehož následek opouští web, a jeho jméno o tom mlčí.

## Podmínka

1. **Pravidlo druhého klepnutí se zavádí celé a naráz, s předmětem v tlačítku.** Po obrazovkách vznikne deset různých „Opravdu?" a přestanou chránit dřív, než budou všechna hotová.
2. **Souhlas se do řádku přihlášky nestaví, dokud ho pořadatel u zapsané lodi nemůže zaznamenat.** Jinak se z hlavičky jen přestěhuje šestnáct upozornění, se kterými nejde nic dělat.
