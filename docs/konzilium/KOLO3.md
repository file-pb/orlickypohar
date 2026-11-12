# Kolo 3 — uzavřít, ne otevřít

Poslední kolo. **Nepřepisuj, co už je řečené, a neotvírej nic nového** — jediná
výjimka je bod, kde se v kole 2 ukázalo, že si dva z vás protiřečí v číslech.

Kolo 2 uzavřelo hodně: *Co teď* zůstává první tab a nesmí být prázdné, výchozí
tab se nemění, dotykový cíl 44 px, plná jména tabů, barvu nese vybraná dlaždice,
*Pořadatelé* nejsou tab, tabulka pořadí je věcně špatně a opraví se, *Lodě
ročníku · Startovní listina · Lodě a kapitáni · Přihlášky* jsou čtyři jména pro
čtyři věci. **Tohle už neřešte.**

Zbývá sedm věcí. U každé napiš **jednu větu rozhodnutí** a, kde je volba, hlasuj.

## α. Kam s *Otázkami k aplikaci* — ustoupili jste dokola

Stalo se tohle: **4-jazyk** v kole 1 chtěl do Správy webu; **1-ergonomie**
v kole 2 ustoupil jazykovi a přijal Správu webu; **4-jazyk** mezitím ustoupil
ergonomii a vrátil se k nabídce pod účtem; **3-ux** ustoupil oběma v tom, že tab
to být nemá, a navrhl třetí věc — **úkol v *Co teď***. Nikdo nedrží to, co
obhajoval, a shoda z toho nevyšla.

Na stole jsou tři možnosti, u každé je doložená námitka:

1. **Nabídka pod účtem** — 3-ux: vrací položku odvozenou z práv tam, odkud ji
   audit 6. 10. 2026 vytáhl.
2. **Tab ve Správě webu** — 4-jazyk sám: adresa je `/sprava/{ročník}/oponentura`,
   takže by pod drobečkem *Správa* visel obsah ročníku, proti pravidlu pater.
3. **Úkol v *Co teď*** (3-ux) — nikdo zatím nenamítl; stojí jedno čtení navíc
   na landingu a položka zmizí, když nic nevisí.

**Hlasují:** 1, 3, 4. Jedna věta a hlas pro číslo. Rovnost rozsekne moderátor.

## β. Telefon: dvě čísla, která nesedí

**2-design** měřil v headless Chrome **361 px** obsahu a došel k tomu, že sedm
plných jmen jsou **dvě řady, 93,6 px**. **1-ergonomie** počítá z `globals.css:287`
(`.obal { padding: 0 1.25rem }`) **350 px**, práh 7,25 rem, a vychází mu u osmi
dlaždic **čtyři řady, 195 px** — s tím, že pruh míjí tři sloupce o 3,6 px, a chce
práh snížit na **7 rem**.

Rozdíl 11 px je šířka, na které visí, jestli pruh má dvě řady, nebo čtyři.
Nejspíš měří každý něco jiného: jeden maketu (`.okno { padding: 0.9rem }`), druhý
aplikaci (`.obal`).

**2-design a 1-ergonomie:** shodněte se na **jednom čísle** pro `/sprava/{ročník}`
na displeji 390 px — kolik px zbývá na pruh v **aplikaci**, kolik sloupců z toho
vyjde při prahu 7,25 rem a při 7 rem, a kolik řad má **sedm** plných jmen při
44px cíli. Ověřte to proti skutečnému `globals.css`, ne proti maketám.

Pak odpovězte na jedinou otázku: **je potřeba sahat na práh, nebo ne?**

## γ. Jméno tabu, pod kterým se zapisují výsledky

**4-jazyk** ustoupil *Rozjížďkám* a přišel s **Zápis výsledků**. **5-jachting**
drží **Rozjížďky** s tím, že rozhodčí mluví o rozjížďkách a podepisuje je po
sadách. **2-design** říká, že `--ukon-vysledky` zůstane sdílená tak jako tak;
**5-jachting** mu oponuje, že pak barva tvrdí „tady se dělá totéž", a neplatí to.

**4-jazyk a 5-jachting:** jedno jméno. **2-design:** zůstává sdílená barva i při
dvou různých jménech, nebo má pravdu jachting?

## δ. Barva nevybraných dlaždic: kompromis a jeho cena

**2-design** nabídl **45 % barvy v lince** místo plné šedi a sám přiznal cenu:
hrana klesne na 1,95–2,37 : 1, tedy **pod 3 : 1 z WCAG 1.4.11**. Argumentuje
tím, že nositelem informace je pak vybraná dlaždice a jméno, ne hrana.

**1-ergonomie:** stačí ti 45 % k zamíření, nebo je to totéž jako šeď?
**2-design:** potvrď, že vědomé podkročení 1.4.11 obstojí, když hrana nenese
informaci — a řekni, co se stane, až to někdo změří kontrolou tokenů.

**2-design navíc navrhuje zrušit `--ukon-coted`** a nést upomínku tečkou, kterou
maketa kreslí. **3-ux:** unese *Co teď* bez vlastní barvy, když je to první tab
a bývá prázdné? **1-ergonomie:** pomáhá ti ta teplá barva k zamíření?

## ε. Čím se *Co teď* naplní v pilotu

Shoda je, že prázdné být nesmí. Rozcházíte se v tom, čím:

- **3-ux:** nejbližší zastávka podle `datum` včetně `Planovany`, s odkazem přes
  `kamNaRegate` — **jde to bez změny API**.
- **5-jachting:** první chybějící položka řady vypsání → směrnice → trať →
  startovní listina, tedy „vypsání závodu není vyvěšené" — **potřebuje údaje,
  které `ZastavkaVysledkyDto` nenese** (3-ux to dohledal).

**3-ux a 5-jachting:** potvrďte dělení — pilot dostane to první, druhá fáze to
druhé — nebo řekněte, proč to tak nejde. A **4-jazyk** už znění prázdného stavu
napsal; zkontrolujte, že sedí na to, co se doopravdy dopočítá.

## ζ. *Pravidla ročníku* za cenu *Novinek*

**5-jachting** drží šestý veřejný tab a zaplatil ho: *Novinky* z pruhu do *Úvodu*
jako tři poslední s odkazem. Nikdo to zatím nerozporoval.

**1-ergonomie a 3-ux:** sedí vám ta cena? Novinky ročníku jsou dnes vlastní
adresa `/serie/{slug}/novinky` a tab, který by zmizel z pruhu.

## η. Hloubka drobečku

**1-ergonomie** v kole 2 našel, že makety mají tři různé hloubky: *Main* a
*Regaty* končí ročníkem, *Kalendar* a *Clanky* končí tabem. Navrhuje pravidlo:
**drobeček končí vždy patrem, nikdy tabem**, protože tab už nesou dlaždice
i nadpis.

**3-ux** (tok) a **4-jazyk** (znění): souhlas, nebo námitka? Jedna věta.

## Co napsat

Do `docs/konzilium/<tvoje-session>-kolo3.md`, **do 60 řádků**:

```markdown
# <obor> — kolo 3

## Rozhodnutí
Jeden řádek na každý bod, u kterého jsi jmenovaný: písmeno, rozhodnutí, hlas.

## Co nesmí spadnout pod stůl
Nejvýš dvě věty. Co z tvého oboru by se při stavbě nejsnáz zapomnělo, i když
to není sporné.

## Výhrada
Jen když s něčím nesouhlasíš a chceš, aby to bylo v závěru zapsané i s důvodem.
Jinak vynech.
```

Pravidla platí: necommituj, nesahej na cizí soubory ani na makety, podkládej.
Závěr píšu po tomhle kole já a nesouhlas v něm bude zapsaný, ne zahlazený.
