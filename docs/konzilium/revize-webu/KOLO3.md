# Kolo 3 — uzavřít, ne otevřít

Poslední kolo. **Nepřepisuj, co už je řečené, a neotvírej nic nového.**
Posudky kola 2 jsou v `docs/konzilium/revize-webu/*-kolo2.md`; přečti aspoň ty,
se kterými hlasuješ.

## Co kolo 2 uzavřelo — tohle už neřešte

- **A:** karta regaty v kalendáři = stav, krok vpřed, „Otevřít regatu →";
  sedm odkazů pryč.
- **B:** řádek přihlášky je karta; stav **slovem**, ne znakem; jediný krok
  s vahou je „Potvrdit prezenci" 44 px přes šířku, jen u nepotvrzené lodi;
  kód, zrušení prezence a změny stavu do Podrobností; odstavec „16 z 16" pryč.
  **Souhlas do řádku jen tehdy, až ho půjde u zapsané lodi zaznamenat** (3, 7);
  jestli je podmínkou startu, rozhodne Filip. **Změřeno (9, 3, 5):** „Zrušit
  prezenci" u lodi s výsledky dnes projde, body nemění, loď jen spadne
  z veřejné listiny — lodi s výsledky se nenabízí.
- **C:** hlavička 67 px · fotka 200 px s **jedinou** větou · druhá věta pod ní
  na čistém pozadí, 16 px · dvě tlačítka 44 px · pořadí tří tříd, **stojí**.
  Vypadne podtitul verzálkami, „Vedou…" z hrdiny, novinky. Monitor unese pás
  320 px (1, 3), je-li nejbližší regata první kartou.
- **D:** hlavička návštěvníka jednořádková, 67 px, „Přihlásit" i přepínač
  vzhledu v nabídce. **Pruh počasí lepí jen v den regaty.** Partneři
  podmíněně: je-li slíbena přítomnost, na telefonu se nepřipínají a na konci
  úvodu stojí blok osmi log; je-li slíbena trvalá viditelnost, zůstanou.
  Dlaždice partnerů v tmavém vzhledu `#e8e6e1`.
- **E:** na adrese tabule pod prahem rozcestník místo televizního rozvržení.
- **F — rozhodlo měření** (2 i 10 shodně): `#0c4a8c` má v tmavém 1,87–2,03.
  Tlačítko zůstává `--voda`; **modrá = dá se klepnout**, hotový stav
  v `--text`. `--znacka` jen na neklepatelné: linka úvodu, `h1` veřejných stránek.
- **G:** pilulka jen pro štítek, na který se neklepe; úkon je obrysové
  tlačítko r 10, plné je na obrazovce jedno. Nadpis okna dva řádky (kontext
  drobně, agenda 700 v `--text`, barva úkonu na hraně). Tři poloměry.
- **J:** zápis z papíru ukazuje lodě listiny, zbytek ročníku pod `details`
  „Lodě mimo listinu (N)" v témže formuláři s větou, že zápis loď přihlásí —
  stejně jako cíl (`naRegate` už v datech je).
- **H, jádro:** *druhé klepnutí dostane úkon, jehož omyl (1) nejde vrátit
  jedním klepnutím na téže obrazovce, nebo (2) na téže obrazovce není vidět —
  ubírá veřejnosti nebo přepočítá pohár.* Druhým klepnutím je rozbalovač
  s větou následku; třetí nikde; tlačítko nese předmět („Opravdu skrýt
  ročník 2026"). Seznam složím v závěru z vašich čtyř.

## Co rozhoduji sám — není to shoda

Kde jste si vyměnili pozice nebo je to číslo. **Kdo nesouhlasí, napíše to do
Výhrady**; jinak to tak půjde do závěru.

1. **Stupnice písma (G).** 2 ustoupil na šest kroků grafika, 10 na pět kroků
   designu. Beru **pět: 12,8 · 14,4 · 16 · 19,2 · 28 px** — už jsou v CSS jako
   rem. Co na kterém stojí (2): popisek a metadata 12,8; údaj, podle kterého se
   rozhoduje, nejmíň 14,4 v `--text`; u vody (cíl, zápis) nejmíň 16 (1).
2. **Stavová věta má 19,2 px / 700.** 22,4 se nevejde na řádek (338 v 335 px,
   změřil 2) a 20 px není na stupnici.
3. **Práh tabule (E):** `--tv` pod 10 px, tedy `(max-width: 999px),
   (max-height: 561px)` — 2 a 3 došli nezávisle k témuž a kryje i telefon
   naležato. 1024 px od 7 je totéž bez výšky.
4. **Slovník (K):** **Skrýt na webu · Sejmout z vývěsky · Smazat soubor.**
   „Sejmout" je slovo vývěsky (5) a 7 ho předem přijal. „Stáhnout" jen pro
   uložení souboru; „Schovat ročník" → „Skrýt ročník".
5. **Kód ve výsledcích (I).** 5 ustoupil k menšímu písmu, 2 k písmu čísla.
   Beru tvar, který 2 změřil (+17 px místo +135): **kód pod číslem,
   14,4 px**; DNC tlumeně, kódy-rozhodnutí (DSQ, DNF, OCS, RDG) v `--text` (5).

## Hlasování

Jedna věta a **hlas pro číslo**. **Rovnost rozsekne moderátor.**

### α. Kam s kroky zpět u regaty — ustoupili jste dokola

1, 3 a 7 chtěli kartu a přešli k oknu regaty; 5 a 9 chtěli okno a přešli ke
kartě. Nikdo nedrží, co obhajoval.

1. **Karta v kalendáři pod „Další úkony"** (5, 9 dnes) — okno regaty vlastní
   obsah nemá a nová obrazovka je přestavba. Námitka (7): omyl „správný úkon,
   špatná regata" v řadě osmi karet zůstává.
2. **Sbalený oddíl „Stav regaty: odjeto · na webu ▸" v patě okna**, stejný
   pod všemi agendami (1, 7). Námitka: šest agend ponese tentýž blok.
3. **Stránka „Termín a stav"** na `…/zavod/{regata}/stav`, odkaz za štítkem
   stavu v nadpisu okna (3) — nese i úpravu termínu. Námitka (9): nová
   obrazovka kvůli třem úkonům.

**Hlasují:** 1, 3, 5, 7, 9.

### β. Odjetá → Vypsaná, když jsou výsledky venku

Shoda je, že to má hlídat server (9 změřil: dnes to projde, vyndá regatu
z poháru a automat ji do dne vrátí sám).

1. **Odmítnout každému**, dokud je z regaty něco v poháru (9).
2. **Pořadateli odmítnout; rozhodčímu a správci ročníku dovolit s důvodem**
   — pro chybné uzavření a náhradní termín (5).

**Hlasují:** 1, 3, 5, 7, 9.

### γ. Druhý řádek karty přihlášky

1. **Stavy vždy:** „prezence: čeká · startovné: zaplaceno" (1, 3).
2. **Jen co chybí;** co je v pořádku, mlčí, a nechybí-li nic, „v pořádku" (5, 7).

**Hlasují:** 1, 3, 5, 7.

### δ. Která věta stojí na fotce

1. **Stavová** („Další: Jarní vítr, 15. května"), celá odkazem; věta pro
   cizího pod fotkou (2, 3, 7, 10).
2. **Věta pro cizího;** stavová pod fotkou (5, 8).

**Hlasují:** 2, 3, 5, 7, 8, 10.

### ε. Jak se jmenují dvě tlačítka úvodu

1. **„Chci závodit" · „Výsledky"** (10, 7; 5: vede na vypsání nejbližší regaty).
2. **Podle cíle a fáze:** „Přihlásit loď" · „Vypsání", v den regaty
   „Výsledky" · „Vypsání", po sezóně „Konečné pořadí" · „Kalendář 2027" (8).

**Hlasují:** 2, 3, 5, 7, 8, 10.

### ζ. Pruh počasí mimo den regaty a mimo vodu

**ζ1 — výstraha mimo den regaty pruh lepí?** 1. ne (1, 8) · 2. jen
týká-li se plavby (10) · 3. ano (7).
**ζ2 — v den regaty lepí kde?** 1. na všech veřejných stránkách (1) ·
2. jen na úvodu a veřejné regatě, ne na čtecích stránkách (7).

**Hlasují:** 1, 7, 8, 10.

### η. Tabule na telefonu: kam vede „Právě se jede" a kdy přijde vývěska

1. **Věta vede na Výsledky;** rozcestník slouží přímé adrese a „Vydáno
   k regatě" se na stránku regaty doplní později (2, 3, 7).
2. **Rozcestník nese „Vydáno k regatě" jako seznam už v téže změně** (data
   tabule čte dnes) a věta vede na něj (5).
3. **Vývěska na rozcestníku v téže změně, věta vede na Výsledky.**

**Hlasují:** 2, 3, 5, 7.

### θ. Dva úkony, kde se pravidlo H čte dvojím způsobem

**θ1 — „Pustit výsledky ven"** (odchází do telefonů): 1. druhé klepnutí
(1, 9) · 2. jedno klepnutí, jméno říká „…a oznámit do telefonů" (3, 7).
**θ2 — „Odebrat roli"** (bod 15 z 12. 11.): 1. rozbalovač „Opravdu odebrat
<role> — <jméno>" (1, 7) · 2. štítek zůstane na jedno klepnutí a hláška nese
„Vrátit roli <jméno>" (3, 9).

**Hlasují:** 1, 3, 7, 9.

### ι. Škrt v průběžném pořadí

1. **Jen závorka** a tlumená barva; přeškrtnutí pryč, čára kazí číslici (2).
2. **Závorka i přeškrtnutí** (5).

**Hlasují:** 2, 5. **5:** potvrď, že „(2)" nad „DNC" čteš jako listinu.

### κ. Jméno — doporučení Filipovi a Milošovi

Shoda je, že **jedno**. 8 a 10: „Orlický pohár" (adresa, appka, web sám
mluví o „poháru"). 5: „Orlická série" (hlavičky dokumentů rozhodčího; tři
regaty mají „pohár" v názvu).

1. **Orlický pohár** · 2. **Orlická série**

**Hlasují všichni.**

## Ozvi se jen při nesouhlasu

Vylezlo v kole 2 a nikdo to nenapadl: na obrazovce se hýbe **nejvýš jedna
věc**, a to fotka — pořadí, počasí i partneři stojí (7; WCAG 2.2.2) · „Právě
se jede" jen v den regaty (`jedeSeDnes` už existuje, 3) · položka nabídky
nemizí na stránce, na které stojíš (1) · nevratný úkon nikdy plnou výplní,
„Opravdu smazat" obrysově v `--stav-zruseny` (2) · jeden výřez fotky pro pás
i `og:image`, poloha zvlášť pro každý snímek (10) · `noindex` ukázky před
`openGraph` (9) · náhled sdílených výsledků nese „předběžné / konečné" (8).

## Co napsat

Do `docs/konzilium/revize-webu/<tvoje-session>-kolo3.md`, **do 60 řádků**:

```markdown
# <obor> — kolo 3

## Rozhodnutí
Jeden řádek na každý bod, u kterého hlasuješ: písmeno, rozhodnutí, hlas.

## Co nesmí spadnout pod stůl
Nejvýš dvě věty. Co z tvého oboru by se při stavbě nejsnáz zapomnělo, i když
to není sporné.

## Výhrada
Jen když s něčím nesouhlasíš a chceš, aby to bylo v závěru zapsané i s důvodem.
Jinak vynech.
```

Pravidla platí: necommituj, nesahej na cizí soubory, podkládej. Závěr píšu po
tomhle kole já a nesouhlas v něm bude zapsaný, ne zahlazený.
