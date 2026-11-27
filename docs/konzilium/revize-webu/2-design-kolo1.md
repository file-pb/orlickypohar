# 2-design — kolo 1

## Co je dobře

1. **Základní páry drží s rezervou v obou vzhledech.** `--text` na `--papir` 16,9 (S) / 13,8 (T),
   `--tlumeny` 5,84 / 6,48, `--voda` 5,67 / 7,06; i nejhorší podklad `--zvyrazneni` dá tlumené
   5,14. Rezerva nad 4,5 je to, co z kontrastu zbyde na slunci.
2. **Stav nese slovo, ne jen barva.** Zelená a červená stavu mají mezi sebou jas 1,16 : 1 (S),
   barvoslepému by splynuly — štítek ale vždy říká „odjeto / vypsáno / zrušeno" (WCAG 1.4.1).
3. **Plocha a písmo mají vlastní token tam, kde to někdo změřil:** `--pozor` (výplň) proti
   `--pozor-pismo` (5,17 na papíru) a `--na-pozoru` (6,31 na výplni). To je vzor pro zbytek.
4. **Tmavý vzhled je vlastní sada, ne inverze** — `--srafa`, `--sytost-agendy` i obrysy stáří
   jsou laděné zvlášť a důvod je zapsaný u tokenu (`globals.css:46–107`).
5. **Vypnuté pole zápisu ztrácí rámeček i výplň** (`globals.css:1821`) a čte se jako údaj, ne
   jako výzva k psaní. Potvrzená rozjížďka tak na 375 px vypadá jako výsledek, ne formulář.

## Co je špatně

Měřeno 27. 11. 2026 v prohlížeči na **375 × 812**, tmavý i světlý vzhled: 14 obrazovek proti
mocku (`op_token=filip`), úvod navíc na produkci s fotkou (tmavý, návštěvník). Kontrast podle
WCAG 2.1; „S / T" = světlý / tmavý. **Neviděl jsem:** tabuli, zápis rozjížďky v upravitelném stavu
(mock ho má „Potvrzeno", pole jsou vypnutá), světlý úvod s fotkou, role `milos` a `dana`.

**1. Úvod: nejtěžší na obrazovce není to nejdůležitější (otázka 3).**
- **Nález** — produkce, 375 px: `h1` je `.skryte`. Věta, která cizímu člověku odpovídá
  („Další: Jarní vítr, 15. května"), má 14,4 px / 400 a leží na fotce bez stínu. Těžší než ona
  je logo, podtitul verzálkami (11,52 px), „Race" (16 / 600) i číslo dne v kalendáři (18,4 / 700).
- **Proč to vadí** — oko jde po váze. První obrazovka tak říká „logo, třídy, datum"
  a odpověď na „co to je a kdy se jede" je nejlehčí řádek na ní.
- **Návrh** — řádek `.hero-zivot` je nejtěžší text hrdiny: 1,4 rem / 700, plná bílá, pod ním
  tmavý přechod. Podtitul zůstane drobný. Výraz a fotku nechávám 10-grafikovi.

**2. Tlumená je výchozí barva, ne vedlejší — a s ní drobné písmo.**
- **Nález** — podíl znaků podle barvy na 375 px: přihlášky 1389 tlumených proti 350 v `--text`,
  kalendář správy 865 tlumených / 481 modrých / 275 v `--text` (17 %). Na přihláškách je 51 %
  textu ≤ 12,8 px a v 16 px devět znaků; na úvodu je ≤ 12,8 px kolem 40 %.
- **Proč to vadí** — ztlumení funguje jen proti něčemu plnému. Když je tlumená většina, žádnou
  hierarchii nenese a u vody (rámec 7) se čte hlavní obsah písmem určeným pro poznámku.
- **Návrh** — `--tlumeny` jen pro metadata (datum, zdroj, nápověda). Jméno lodi, posádka,
  počty a stav v `--text`; nejmenší písmo, které nese údaj, 0,8 rem.

**3. Modrá znamená čtyři věci.**
- **Nález** — `--voda` je odkaz (`:284`), výplň hlavního tlačítka (`:974`), fokus a zároveň
  stav „hotovo": `stav-odjety` (`:688`), `stav-prijato` (`:700`), `vysledek-potvrzeno` (`:1784`),
  `ucast-potvrzena` (`:1974`). Přihlášky na 375 px: v každém řádku modrý štítek „potvrzena"
  (neklepe se) vedle modrého „Podrobnosti" (klepe se). Úvod: řada modře orámovaných „odjeto" (mock: 7 z 8 regat).
- **Proč to vadí** — barva, která někdy znamená „klepni" a někdy „je to vyřízené", neznamená
  nic; uživatel se to musí naučit obrazovku po obrazovce. A akcent stránky se utratí za minulost.
- **Návrh** — modrá jen pro „dá se na to klepnout". Dokončený stav dostane `--text` s plným
  okrajem, jak už to dělají `stav-potvrzeny` (`:693`) a `vysledek-overeno` (`:1786`). Jde to
  proti komentáři u tokenu (`:9–10`, „odjetá modrá jako odkazy") — píšu to přesto.

**4. Nadpis okna: barva hrany použitá jako písmo, a dvojí gramatika (k A1).**
- **Nález** — `.agenda` má v okně regaty 16,9 px / 400 a barvu `--ukon-*`. Ze 12 změřených
  kombinací (6 oken × 2 vzhledy) jich 8 neprojde 4,5 : 1: směrnice S **3,13**, trať S 3,72,
  polohy T 3,81, přihlášky T 3,83, rozjížďky T 4,05 / S 4,11, trať T 4,26, přihlášky S 4,32.
  Audit uvádí 3,99–4,49; rozsah je širší. Příčina: tokeny jsou laděné jako „tlumené, ne syté"
  hrany dlaždic (`:64`), ne jako písmo. K tomu: v ročníku je tučná agenda a tlumený kontext
  (`:6350–6351`), v regatě tučné jméno regaty a lehká agenda (`:2393–2398`).
- **Proč to vadí** — nadpis je nejméně kontrastní text na stránce (WCAG 1.4.3) a „tučné"
  jednou znamená „co dělám", podruhé „kde jsem".
- **Návrh** — jedna gramatika: kontext (ročník nebo regata) jako nadřádek 0,8 rem `--tlumeny`
  na vlastním řádku, agenda pod ním 700 v `--text`. Barvu úkonu nese levá hrana nadpisu jako
  u dlaždice — jako ne-text projdou všechny (nejhůř 3,13 ≥ 3 : 1). Dva krátké řádky zároveň
  ruší A1: nezlomitelných 396 px v 335 px zmizí. Tvar nadpisu se překrývá s 10-grafikem.

**5. Odkaz v běžném textu pozná jen ten, kdo vidí barvu.**
- **Nález** — `a { text-decoration: none }` (`:284`). Odkaz uvnitř tlumeného textu má proti
  okolí jas **1,03 : 1 (S) / 1,09 (T)**, proti `--text` 2,98 / 1,96. Bez šipky a bez podtržení:
  „v pravidlech", „nápovědě", „zobrazit zápis", „Yacht Club Písek", „Stránka regaty · kalendář".
- **Proč to vadí** — WCAG 1.4.1 žádá 3 : 1 proti okolnímu textu, nebo jiný znak. Na slunci
  a barvoslepému odkaz ve větě není.
- **Návrh** — odkazy uvnitř textu (`p a, li a, td a, dd a, .poznamka a`) podtržené jako
  drobečky (`:1014`). Samostatné odkazy se šipkou a dlaždice zůstanou bez podtržení.

**6. Hranice polí má 1,3 : 1.**
- **Nález** — okraj `--linka` na `--papir` 1,32 (S) / 1,28 (T), výplň `--pozadi` proti
  `--papir` 1,04 / 1,09. Změřeno na viditelných polích oprávnění a přihlášek; zápis rozjížďky
  má totéž pravidlo (`:1814–1817`), v upravitelném stavu jsem ho neviděl.
- **Proč to vadí** — WCAG 1.4.11 chce pro hranici ovládacího prvku 3 : 1. Na slunci je 37 polí
  zápisu sloupec čísel bez políček.
- **Návrh** — nový token `--okraj-pole`: `#7d858d` (S; 3,74 / 3,59 / 3,29 na papíru, pozadí,
  zvýraznění) a `#707b87` (T; 3,85 / 4,17 / 3,44). `--linka` zůstane dělicí čarou.

**7. Hlavní tlačítko v tmavém vzhledu: 2,35 : 1 — a je to pravidlo, ne jedna obrazovka.**
- **Nález** — `.tlacitko` má `color: #fff` natvrdo (`:974`) na `--voda`: S 5,67, T **2,35**.
  „Přihlásit" na přihláškách má přitom `#1b1f23` na téže výplni (7,06). Dvě hlavní tlačítka.
- **Proč to vadí** — nejdůležitější úkon má v tmavém vzhledu, který se má používat u vody,
  nejhorší kontrast na stránce.
- **Návrh** — `.tlacitko { color: var(--papir) }` → 5,67 (S) / 7,06 (T). A obecně: vady 7 a 9
  jsou každá jen v jednom vzhledu a 4 v každém jinde, takže je nikdo nevidí naráz. `tools/kontrola-tokenu.py`
  ať hlídá i deklarované páry písmo–podklad (4,5) a hrana–podklad (3) v obou vzhledech.

**8. Přihlášky: nejtěžší prvek řádku je nejvzácnější úkon (otázka 2).**
- **Nález** — `button.jemne` („Vystavit kód k připojení", `prihlasky/[zavod]/page.tsx:539, 615`)
  nemá v `globals.css` žádné pravidlo: 13,33 px, systémová šedá výplň, 2px rámeček. V řádku
  jsou tři různé řeči: modrý `summary` 12,8 px, nativní tlačítko, pilulka „Zrušit prezenci".
- **Proč to vadí** — jediná plná plocha v řádku táhne oko k úkonu, který se u lodi dělá
  jednou za sezónu; jméno lodi a stav prezence jsou lehčí. A je to jediný prvek mimo tokeny.
- **Návrh** — váhu v řádku má jméno lodi a stav; úkony jedním stylem (pilulka s okrajem,
  0,8 rem). Co je vidět hned a co pod „Podrobnosti", nechávám 1-ergonomii.

**9. Stupeň výstrahy ve světlém vzhledu: 1,92 : 1 — audit ho nemá.**
- **Nález** — `.vystraha-stupen` („nízký stupeň"), 11,2 px / 600, `#e5b50b` na `#ffffff`
  (`:2800`); na veřejném ročníku, pořadí i regatě. V tmavém 8,64. Audit E píše, že světlý
  vzhled je mimo `.agenda` čistý.
- **Proč to vadí** — slovo, které říká, jak vážná výstraha je, je nejhůř čitelné právě ve
  vzhledu, který se použije na slunci.
- **Návrh** — slovo stupně v `--text`; barvu stupně nese jen levá hrana karty.

**10. Stupnice písma není stupnice (otázka 7).**
- **Nález** — `globals.css` má 34 různých `font-size`, dvanáct z nich mezi 0,68 a 0,95 rem.
  Úvod na 375 px: 13 velikostí mezi 9 a 16 px. V okně správy je `h1` 19,2 px a `h2` 18,4 px
  (poměr 1,04); samostatné stránky (zápis rozjížďky) mají `h1` 28 px.
- **Proč to vadí** — rozdíl 0,3 px hierarchii nenese, jen šum; a nadpis stránky se od nadpisu
  oddílu nedá odlišit velikostí. Tady se veřejná část a správa rozcházejí nejvíc.
- **Návrh** — pět kroků jako tokeny (0,8 · 0,9 · 1 · 1,2 · 1,75 rem) a nic mezi nimi. Kolik
  kroků, říkám já; které řezy a proklad, říká 10-grafik.

**11. K A2 a A3: práh čitelnosti.**
- **Nález** — kódy DNC/DSQ 8,64 px (0,6 em ze 14,4 px); tabule 2,9–4,3 px (číslo auditu).
- **Proč to vadí** — kód je údaj, ne ozdoba, a pod 12 px se na telefonu nečte.
- **Návrh** — kódy 0,85 em (12,2 px) v `--tlumeny`. Tabule: pod 700 px šířky odkaz z veřejné
  regaty nevykreslovat; vlastní podoba jen pokud 3-ux doloží, kdo ji na telefonu potřebuje.

## Co bych potřeboval vědět

- **Filip:** je „odjetá modrá jako odkazy" (`:9–10`) rozhodnutí, nebo zvyk? Od toho se odvíjí
  bod 3. A jede telefon u vody na slunci opravdu tmavě? Světlý má tam čitelnost lepší.
- **5-jachting:** nese modrá u „odjeto / potvrzeno" nějakou konvenci ze závodů? A smí barva
  třídy sloužit jako písmo — `--trida-pod7m` má ve světlém 4,05, `--trida-race` v tmavém 4,67?
- **1-ergonomie:** který úkon v řádku přihlášky je ten jeden s váhou (rámec 6)? Dám mu ji.
- **10-grafik:** tvar nadpisu okna (bod 4) a stupnice písma (bod 10) — kde se nepotkáme?
  A jak čitelný je text hrdiny na fotce ve světlém vzhledu; viděl jsem jen tmavý.
- **3-ux:** kdo otevírá tabuli na telefonu a co na ní hledá?
- **moderátor:** měří skript auditu i text v doplňku výstrah? Bod 9 mu utekl.

## Čeho se nedotýkám

- Počet kroků, výška dotykových cílů (oddíl B) a cena pevných pruhů (otázka 4) — 1-ergonomie.
- Co má kalendář nést vedle okna regaty (otázka 1) a délka stránek (otázka 6) — 1-ergonomie, 3-ux.
- Věcná správnost pořadí, kódů a vypsání — 5-jachting.
- Krása, značka, výběr fotky, výraz písma; i to, že logo říká „Orlická série" a web „Orlický
  pohár" — 10-grafik a 8-pr.
- Mobilní appka; tabule jako televizní obrazovka.
