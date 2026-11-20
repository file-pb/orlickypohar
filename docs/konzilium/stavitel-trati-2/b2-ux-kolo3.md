# UX — kolo 3

Z mého oboru je na řádce jediná otázka: **kolik slov tam může stát a které
vyhrává.** Návrh jich chce šest, místo je na jedno.

## Jedna řádka trati

**Vlevo** nemám co dodat; čísla mají 1 a 2. Jen jeden následek bodu 7: řádka je
od teď **značka**, takže bóje, po které se jede dvakrát, nese `2×` — a je to
vlastnost prvků, ne bóje, takže patří ke jménu, **nikdy do sloupce stavu**.

**Uprostřed** `Otočná 1 · ponechat po levoboku`, a u opakované `· 2×`; podle
čísel 2-designu berou jméno a předpis 200 z 298 pt vnitřku, takže místo je.

**Vpravo — tady je moje práce.** Stav, který návrh chce na řádce zobrazit, je
ve skutečnosti šest různých stavů, a sloupec unese **jeden**. Jsou to:
*zamčeno / čeká na odemčení*, *čeká ve frontě*, *chybí druhý konec*,
*z plánu*, *chybí fotka* a *odesláno*. Pořadí, ve kterém vyhrávají, není vkus —
plyne z toho, co každý z nich dovoluje:

1. **`čeká na odemčení`.** Zamčená trať zastaví frontu celou, takže na ničem
   jiném u té řádky nezáleží, dokud se neuvolní.
2. **`čeká`.** Dokud prvek nedošel na server, **nemá serverová čísla** —
   `zapamatujCisla` je zapisuje teprve z odpovědi (`odesilani.ts:72–85`) —, takže
   u té značky nejde přiložit fotka (`POST …/boje/{boje}/fotky` chce `{boje}`)
   ani ji přesunout. Slovo tedy hlásí i to, že detail bude prázdný.
3. **`chybí druhý konec`.** Rozestavěný dvoubod ještě prvek není.
4. **`z plánu`** — a jen u trati, která plán má (bod 4).
5. **`chybí fotka`** — doklad, nikdy překážka (`Hotovo.dc.html`: *„je to doklad,
   ne podmínka"*).
6. **`odesláno` = mlčení.** Jediná věc, kterou ve sloupci držím proti dnešní
   kresbě: stav platný o každé řádce nenese žádnou informaci, a `Main.dc.html`
   dává zelenou fajfku všem třem řádkám — nejčastějšímu stavu nejvíc inkoustu.
   Řádka, u které je všechno v pořádku, **neříká nic**.

**Výška a rozteč: rolovat pod pevným pruhem, ne krátit spojnici.** (a) **Počet
řádek není omezený.** Po bodu 7 je to počet značek — u regaty tři, osm
i jedenáct — a fronta přidává další; každý pevný rozpočet se jednou překročí
a `overflow: hidden` šestou řádku **ustřihne mlčky** (1-ergonomie/N1).
Neviditelná řádka je horší než odrolovaná: o ustřižené nic neřekne ani to, že
existuje. (b) **Důvod, proč se rolování zakázalo, tady neplatí.** Rozhodnutí 3
ho zakázalo proto, že nechtěné klepnutí při rolování **zapíše prvek** — to byl
seznam voleb v `Popis`, kde je každá řádka zápis. Na hlavní obrazovce je řádka
vstup do detailu a destruktivní terče z ní odešly: mazání o patro níž (nález 13),
přerovnání z lodi úplně (J3). (c) Bod 11 pevný dolní pruh žádá tak jako tak,
a právě ten dělá rolování bezpečným. Měření „osm řádek neroluje" ať zůstane
tam, kam patří — na `Popis`.

**Dvě věci z uzavřeného seznamu, které se takhle nepostaví.** Výjimka ze zadání:

- **Bod 2 a řádka si protiřečí o azimutu.** Bod 2 říká *„azimut jen v detailu
  prvku"*, 2-design naměřil do pravého sloupce `↑ 063° · 310 m` (109 pt).
  Obojí nejde. Držím bod 2 a jachtařovo zdůvodnění (azimut je třikrát za
  regatu): azimut na **každé** řádce je pět pohyblivých čísel, tedy znovu to
  „všechno váží stejně", které nález 6 odstraňoval. Vzdálenost už má místo
  u akce (bod 2), takže pravý sloupec nese **jedno slovo** a víc nic.
- **Bod 13 je o jedno pole kratší, než na co jste se shodli.** `Zdroj`, `Barva`
  a `Tvar` nakreslí značku vlevo, ale `chybí fotka` z nich nevyjde — počet fotek
  v `PrvekDto` není. Přitom `BojeDto` nese **všechno**: `Poradi`, `Zdroj`,
  `Barva`, `Tvar`, `Znaceni`, `Sebrana` i `Fotky` (`Boje.cs:289–304`), a vydává
  to `GET …/boje` (`BojeEndpoints.cs:36–41`) — jenže ta cesta je **jen pro
  pořadatele a rozhodčího** (`:237–240`), tedy zavřená pro pomocníka, kvůli
  kterému se obrazovka otevírala. Bod 13 je proto správná odpověď z těch dvou,
  a musí k těm třem polím přibrat počet fotek.

## Detail prvku

**Má dva tvary, a ten chudší je na vodě obvyklejší.** Dokud řádka neodešla, není
k čemu připojit nic: ids přijdou teprve s odpovědí (`odesilani.ts:72–85`), fotka
chce `{boje}`, přesun chce `NahrazujeId`. Detail čekající značky nese tedy jen
jméno, polohu a *Zahodit z fronty* — zbytek v něm **není**, ne že je zešedivělý.
Na vodě není signál celé hodiny (NAVRH:213–214), takže je to ten běžný stav;
nakreslený není a návrh počítá jen s plným.

**Pořadí shora dolů.** Princip: čtení → nejčastější práce → doklad → popis →
nevratné. Nevratné se nemá potkat s palcem, který jde po tom nejčastějším.

1. **Čím to je a kde to je** — jméno, předpis, `2×`, souřadnice, čas, ±m a
   **slovo o zdroji**: `změřeno telefonem` nebo `odečteno z mapy`. To druhé je
   podmínka nálezu 10: odečtený bod se nesmí tvářit jako měření.
2. **Azimut a vzdálenost odsud** (bod 2; u jachtaře pravidlo 33 a utržená bóje).
3. **Přesunout sem** — hlavní práce dne (nález 14). S větou, že to **není
   oprava**: starý záznam zůstává platný pro dobu, kdy platil (NAVRH:442–446).
   Kdo chtěl opravit překlep, má zahodit a pípnout znovu.
4. **Sebrat z vody.**
5. **Fotka** — kolik chybí. Doklad, nikdy překážka.
6. **Barva a tvar** — sem je poslal E5; je to popis a drží se pro další značku.
7. **Výš / níž** — jen kdyby to Filip na vodě chtěl. U značky se dvěma průjezdy
   jednoznačný význam nemá, takže se tam nenabízí.
8. **Smazat** — poslední, nejslabší tvar, s prodlevou podle rozhodnutí 6.

**A jedna věc, kterou musím říct, i když ji rozhodl Filip.** Mazání maže
**prvek, ne bóji** — *„prvek se maže doopravdy, na rozdíl od bóje: není to
měření, je to rozhodnutí"* (`PrvkySprava.cs:434`). Na obrazovce, kde je řádka
**značka** (bod 7), tedy spodní a nejnevratnější akce míří na něco jiného, než
co ta řádka ukazuje — a u značky se dvěma průjezdy je to táž dvojznačnost,
kterou bod 7 právě odstranil u *Přesunout*. Dvě cesty ven, a doporučuju první:

- **Na vodě je nevratná akce *Sebrat z vody*** (týká se bóje, měření zůstává)
  a mazání prvku odchází z lodi spolu s pořadím, ze stejného dokladu: *„typ,
  pořadí, strana a směr jsou rozhodnutí rozhodčího"* (`PrvekTrati.cs:146–149`).
  Detail je pak celý o značce a nic v něm nemíří jinam.
- Nebo mazání zůstane, ale **jen u značky s jediným průjezdem**; se dvěma musí
  říct, který maže, a to je dialog navíc na nejnevratnějším terči obrazovky.

**Vstup a cesta zpátky.** Vstupem je celý řádek (358 × 56 už je; v živém kódu
jsou to `View`, `stavba.tsx:475`) a z detailu musí vést zpět terč, který **nic
nezapíše** — týž vzorec jako E6; jinak je to zase destinace, ne stav.

## Co jsem si rozmyslel

**Jachtařovo číslo nahradilo můj odhad.** V kole 1 jsem u *Jsem u ní* napsal
„blíž než pár desítek metrů"; on to doložil praxí — odskoková bóje patnáct až
třicet metrů za otočnou —, takže **pod padesát metrů** se dva kandidáti
nerozliší a obrazovka se musí zeptat.

**Dvouřádkové tlačítko 2-designu je lepší než moje jméno na terči.** Chtěl jsem
`JSEM U BRÁNY 2 — LEVÁ`; jeho tvar — `PÍPNI` 26/800 a pod tím `u Brány 2 — levá`
15/600 — říká totéž a **nemění slovo**, na kterém stojí návyk změřený
1-ergonomií (11 pt napříč stavy). Beru jeho a svůj tvar stahuju.
