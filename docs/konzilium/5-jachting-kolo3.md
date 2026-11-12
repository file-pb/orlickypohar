# Jachting a ČSJ — kolo 3

## Rozhodnutí

**γ — ustupuju 4-jazykovi: *Zápis výsledků*.** Jeho rozdíl je silnější než můj
slovníkový argument: rozhodčí ročníku nepodepisuje „rozjížďky ročníku",
podepisuje sady u jednotlivých regat, takže tab v pruhu **ročníku** je
rozcestník a *Rozjížďky* by mířily o úroveň níž, než kam vede. *Zápis výsledků*
navíc drží slovo, které projekt i rozhodčí používají pro práci u vody („zápis
z vody" — CLAUDE.md), a nepředstírá doklad.

**γ, barva — moje oponentura 2-designovi padá.** Jmenují-li se obě věci jinak,
sdílená `--ukon-vysledky` říká „tohle k sobě patří", a to je pravda. Námitka
platila jen tak dlouho, dokud se obojí jmenovalo *Výsledky*.

**ε — dělení potvrzuju: pilot nejbližší zastávka podle data, druhá fáze řada
dokumentů.** 3-ux to dohledal správně — `ZastavkaVysledkyDto`
(`schema.d.ts:8943–8955`) nese `datum` a stavy zápisu, ne stav vypsání,
směrnice a trati. Pilot tedy může říct **kdy a kde**, ne **co chybí**, a to je
v souladu s mou hranicí z kola 2: aplikace nesmí tvrdit povinnost, o které
nemá záznam.

**ε, znění — 4-jazykova věta na pilot nesedí celá.** *„Nic nečeká. Nejbližší je
Jarní vítr 15. 5. — zbývá vypsat závod."* Druhá polovina je právě ten údaj,
který DTO nenese; v pilotu by to byl odhad vydávaný za fakt. Pilotní znění má
skončit u termínu (*„Nejbližší je Jarní vítr, 15. 5."*) s odkazem do okna
regaty; „zbývá vypsat závod" patří ke druhé fázi, kdy pro to bude záznam.

**ζ — držím, cena platí.** *Pravidla ročníku* šestým veřejným tabem, *Novinky*
do *Úvodu* jako tři poslední s odkazem. Adresa `/serie/{slug}/novinky` se
neruší, jen vypadne z pruhu — pravidlo „žádná adresa se nemění" zůstává
nedotčené. Důvod je pořád ZPJ 25.1 a R24: podmínky ročníku musí být čitelné
dřív, než se loď přihlásí, a kategorie bez pravidla, podle kterého do nich loď
patří, jsou jen jména.

## Co nesmí spadnout pod stůl

**Legenda kódů v tabulce pořadí nemá číslo u DNC, protože žádné pevné není.**
`DSQ` je 20 bodů (platí pro 2026; Miloš si je *„nějak vymyslel"* a na 2027 se
upraví), kdežto `DNC` je **počet lodí kategorie přihlášených na tu zastávku** —
u každé zastávky jiné číslo. Legenda proto musí být věta, ne tabulka čísel:
*„DNC — nezúčastnila se: tolik bodů, kolik bylo v kategorii přihlášených
lodí"*. Napsat tam konstantu je nepravda, která se najde až při reklamaci
pořadí.

**Bonus 24hodinovky se v pořadí srovnává jako místo, ne jako číslo.**
`−1` ze 24hodinovky je **první místo** stejně jako `0` jinde
(`SerieBodovani.Rozstrel` porovnává umístění). Kdo při opravě tabulky napíše
rozstřel nad body, dostane u shody jiné pořadí než rozhodčí.
