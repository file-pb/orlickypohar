# Ergonomie ovládání — kolo 3

## Rozhodnutí

- **α — hlas 2 (pata okna).** Jediná varianta, která nepřidá osm rozbalovačů
  do řady stejných karet (1) ani nový cíl do nadpisu okna (3) — ten na
  375 px už dnes přetéká (A1: 396 px v 335) a první pracovní řádek leží na
  y = 649. Úkon párkrát za sezónu smí stát posun na konec stránky; *Upravit
  termín* zůstává v kalendáři.
- **β — hlas 2 (pořadateli odmítnout, rozhodčímu a správci s důvodem).**
  Chybné uzavření se stane (5) a úkon bez cesty v rozhraní končí telefonátem;
  rozbalovač s polem důvodu už karta rozjížďky má (pole 66 px, tlačítko
  45 px, změřeno), není se co učit. Podmínka: automat takovou regatu znovu
  nezavře, jinak platí past, kterou změřil 9.
- **γ — hlas 2 (jen co chybí, jinak „v pořádku").** Ustupuju 5 a 7: u stolu
  se hledá výjimka, ne čte šestnáct stejných řádků, a prezenci slovem už
  nese první řádek karty vpravo, takže by ji druhý řádek opakoval. Nejdelší
  výčet bez souhlasu vychází na asi 211 px z 301 (odhad, 6,8 px na znak).
- **ζ1 — hlas 1 (výstraha mimo den regaty nelepí).** „Týká se plavby" je
  seznam jevů, který by někdo musel vést; v den regaty pruh lepí tak jako tak.
- **ζ2 — hlas 2 (jen úvod a veřejná regata).** Vracím se ke svému měření
  z kola 1: s pruhem stojí nápověda 18,7 tahu místo 15,8, a den regaty je
  právě den, kdy se na telefonu čte vypsání a směrnice. V kole 2 jsem
  ustoupil víc, než čísla dovolují.
- **θ1 — hlas 2 (jedno klepnutí, jméno říká „…a oznámit do telefonů").**
  Ustupuju 3 a 7: rozbalovač chrání u vzácného úkonu. Krok, který rozhodčí
  dělá u každé rozjížďky, se naučí odklepávat do konce první regaty a pak
  nechrání ani tady, ani jinde.
- **θ2 — hlas 1 (rozbalovač „Opravdu odebrat <role> — <jméno>").** Úkon je
  vzácný, takže se neodklepává naslepo. Štítek, na který se klepe, navíc
  odporuje shodě G (pilulka jen pro neklepatelné) a dnes je to cíl 35 px
  s mezerou 6 px od sousední role (z CSS, `globals.css:6297`, `:871`). „Vrátit
  roli" v hlášce ať přibude k tomu, ne místo toho.
- **κ — hlas 1 (Orlický pohár).** Mimo můj obor; hlasuju tím, co člověk
  píše do adresy, a adresa se nemění (rámec 9).

## Co nesmí spadnout pod stůl

Cíl se staví až nad mockem ve stavu „den regaty": dojetá dlaždice zůstane
stát na místě, opravy mají 44 px s rozestupem 8 px a *✕* není v řadě — nikdo
z osmi tu obrazovku neviděl v běhu. Pravidlo 44 px pod `pointer: coarse`
dostane kontrolu v CI jako appka (`tools/kontrola-dotyku.py`) a přijde
v téže změně jako druhé klepnutí (9), ne před ním.

## Výhrada

- **Opravuju vlastní návrh z kola 2.** Psal jsem, že loď se v cíli pozná
  podle čísla plachty a to má být na dlaždici 16 px před jménem. 5-jachting
  odpověděl jinak: pozná se podle jména a domluveného poznávacího znaku,
  číslo je pojistka. Návrh tedy zní: **poznávací znak** na dlaždici nejmíň
  16 px (dnes je s číslem v řádku `small` 12,8 px, `globals.css:1925`);
  číslo plachty smí zůstat drobné. Do závěru prosím tuhle podobu.
- **K rozhodnutí 1 bez nesouhlasu, jen upřesnění:** „u vody nejmíň 16 px" je
  výpočet zorného úhlu, ne měření, a mez 16 minut cituju z paměti. Jako
  pravidlo to obstojí; jako číslo to má potvrdit zkouška venku.
