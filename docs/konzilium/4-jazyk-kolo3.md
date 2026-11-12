# Názvosloví a čeština v rozhraní — kolo 3

## Rozhodnutí

**α. Hlasuju pro 3 — úkol v *Co teď*.** Jazykový problém tím zmizí celý: tab musí
jméno zkrátit a *Otázky* pak znamenají dotazy závodníků, kdežto řádek fronty
unese celou větu — **„3 otázky k aplikaci čekají na odpověď"**, a pořadateli,
který jen čte, **„…čekají na rozhodčího"** (adresát podle 3-uxova nálezu 7).
Možnost 2 jsem sám vyvrátil; možnost 1 drží jméno, které nikdo nevidí, dokud
nerozklikne nabídku.

**γ. Ustupuju 5-jachtingu: jméno je *Rozjížďky*.** Jeho tvrzení jsem si ověřil
v kódu a je pravdivé — `Stav`, `StavVysledku` i `Publikovano` jsou vlastnosti
**rozjížďky** (`Features/Zavody/Zavod.cs:684, 709` a dál), takže „pustit ven" je
publikace rozjížďky, ne jiná agenda, a *Zápis výsledků* by pojmenovával proces
nad jednotkou, kterou ten tab stejně vypisuje. Moje námitka o úrovni se týkala
**škrtů** (`Serie.PocetSkrtu` proti `Zavod.PocetSkrtu`), a ty v tom tabu nejsou.
Jedno jméno: **ve správě *Rozjížďky*, venku *Výsledky*.**

**γ, barva — držím své ustoupení z kola 2, tedy proti 5-jachtingu.** Jakmile se
jména liší, sdílený `--ukon-vysledky` neříká „tady se dělá totéž", ale „tohle
k sobě patří" — a to je pravda: je to tatáž věc ve dvou fázích. Moje námitka
platila jen tak dlouho, dokud se obojí jmenovalo *Výsledky*.

**ε. Moje znění prázdného stavu nesedí a opravuju ho.** Napsal jsem *„Nic nečeká.
Nejbližší je Jarní vítr 15. 5. — zbývá vypsat závod."*; druhá polovina je přesně
to, co 3-ux doložil jako změnu API — `ZastavkaVysledkyDto` nese jen `zavod, nazev,
datum, stav, pocetRozjizdek, publikovanych, kRevizi, kPodpisu, kPublikaci`.
V pilotu by to byl výmysl. Pro pilot tedy karta ve tvaru ostatních úkolů:

- záhlaví karty: **„Jarní vítr · 15. května · plánováno"**
- jméno: **„Nejbližší regata"** — nikdy rozkazovací způsob, protože to není úkol
- detail: **„Teď nic nečeká."**

Rozkazovací způsob (*Zapsat, Opravit, Pustit ven*) si drží jen skutečné úkoly;
fakt mezi nimi bez vlastního jména by se četl jako úkol. **Pro druhou fázi** beru
znění 5-jachtinga — *„Jarní vítr, 15. 5. — vypsání závodu není vyvěšené"* — s
jazykovým pravidlem: jmenuje se **chybějící dokument v prvním pádě**, nikdy lhůta
(*„vyvěsit do pátku"*, R27) a nikdy jméno regaty skloněné.

**η. Souhlas: drobeček končí patrem, nikdy tabem.** Jméno tabu už stojí dvakrát —
ve vybrané dlaždici a v apozici nadpisu — a třetí kopie je tatáž duplicita, kterou
jsem vytkl kalendáři („ročník je venku" dvakrát). Na znění to má jeden důsledek:
v `Kalendar` a `Clanky` přestane být *Orlický pohár 2027* odkazem a dostane
`aria-current`.

## Co nesmí spadnout pod stůl

Dvacet tři oprav popisků, hlášek a prázdných stavů z mého kola 1 nikdo
nerozporoval — a právě proto se zapomenou první: nejsou sporné, takže nemají
v závěru vlastní bod. **Patří k té obrazovce, na které se stojí**, ne do úklidu
potom; jednou vypsaný popisek *„Škrtá se nejhorších"* se přepisuje dráž než
řádek v maketě.

## Výhrada

**Hlavička listiny od 5-jachtinga nese o dva fakty víc, než unese.** Jeho řádek
*„… · nízkobodový systém, vítěz zastávky 0 bodů · k 15. 5. 2027"* vkládá do hlavy
dokumentu **bodovací pravidlo**, které patří do poznámky **pod** tabulkou:
hlavička odpovídá na *co to je, čí to je a ke kterému dni*, poznámka na *jak se to
počítá*. Pět faktů s tečkami na jednom řádku nikdo nedočte do konce a ztratí se
v nich to jediné, co je u nepodepsané tabulky nutné — že je průběžná
a neoficiální. Trvám na dvou řádcích z kola 2 a na pravidle pod tabulkou.
