# Teplota hladiny Orlíku z Landsatu

Plánovaná úloha: jednou denně spočítá povrchovou teplotu nádrže v deseti
oblastech a pošle ji do API (`POST /vodocet/teplota-hladiny`). Web z toho
ukazuje poslední snímek a změnu proti předchozímu v rámci 14 dní.

**Proč vůbec:** přímo v nádrži nikdo teplotu průběžně neměří a nezveřejňuje.
ČHMÚ měří jen přítoky, Povodí ručně a jen do grafu, hygiena dává jen známku
1–5. Landsat 8/9 měří povrchovou teplotu zhruba jednou za týden, když
není zataženo.

**Co to je a co ne:** horní vrstva vody kolem poledne (přelet ~11:51–11:57
SELČ), medián pixelů aspoň ~100 m od břehu. Teploměr ve 20 cm ukáže nejspíš
o něco méně. **Neověřeno** — do kalibrace ručním měřením je to odhad a web
to tak označuje.

## Běh

Běží na platformě jako služba `landsat` v `deploy/docker-compose.yml`, první
workload typu `scheduled-job`. Smyčka je v kontejneru: hned po startu,
pak každý den v `HODINA_UTC`. Když API nemá nic, dopočítá historii od
dubna 2021; jinak se vrací o 10 dní za poslední snímek, protože Level-2
produkty se v katalogu objevují se zpožděním.

    python3 -m venv geo && geo/bin/pip install -r requirements.txt
    geo/bin/python uloha.py --nanecisto   # posledních 30 dní na stdout, API nečte

Token pro zápis je v `/run/secrets/Landsat__Token`, zvlášť od importního:
úloha smí zapsat teploty, ne přepsat ročník.

## Metoda

- Zdroj: STAC katalog Microsoft Planetary Computer, kolekce `landsat-c2-l2`,
  bez registrace; soubory se čtou s SAS tokenem ke kolekci.
- Pásmo `lwir11` (ST_B10): °C = DN × 0,00341802 + 149,0 − 273,15.
- Maska `qa_pixel`: voda (bit 7), bez výplně, mraků, rozšířených mraků,
  stínů a sněhu (bity 0, 1, 3, 4, 5).
- **Eroze masky vody o 3 px** na každém snímku zvlášť. Termální pixel má
  ~100 m a při nízké hladině (2026 ~15 m pod normálem) se do „vody"
  přimíchá rozpálený břeh — Salaš dávala až 36,5 °C. Po erozi klesl rozdíl
  Radava − hráz z +1,2 na +0,3 °C.
- V každém místě medián z okna ±8 px, aspoň 3 pixely.
- Sousední scény téhož přeletu (řádky 025 a 026) se slučují do jednoho
  snímku; jinak by widget ukazoval změnu nula mezi dvěma kopiemi.

## Místa

Oblasti, kde se nejvíc plachtí (Filip, 18. 9. 2026). Bod je posunutý na
nejbližší vodu, která je i při letošní hladině aspoň 4 px od břehu.
Historie 2021–2026, 143 snímků duben–říjen:

| Slug | Oblast | Hodnot | Proti Radavě |
|---|---|---|---|
| `spalenka` | Spálenka / hráz | 70 | −0,2 |
| `trhovky` | Klučenice / Lavičky / Trhovky | 81 | −0,4 |
| `bukovanska` | U Bukovanské zátoky | 88 | −0,5 |
| `vystrkov` | Vystrkov | 91 | −0,2 |
| `podskali` | Podskalí | 97 | −0,1 |
| `radava` | Radava | 100 | 0 |
| `velky-vir` | Velký Vír | 92 | 0,0 |
| `marina-orlik` | Marina Orlík | 83 | +0,1 |
| `zdakov` | Žďákov | 90 | 0,0 |
| `husarna` | Husárna | 86 | +0,1 |

Rozdíly mezi místy jsou pod přesností metody; voda se mění v čase, ne
v prostoru (15. 8. 2026 26,8 °C, 23. 8. 22,4 °C). Web proto ukazuje jedno
hlavní číslo — Radava — a menší Trhovky a Žďákov, každé jako medián se
sousedními místy, aby mrak nad jedním bodem nevzal celé centrum.

Zvíkov a úzké zátoky (Salaš) jsou pro satelit nepoužitelné: koryto je tam
při nízké hladině užší než 100 m a po erozi nezbude žádný pixel.

## Kalibrace

Filip změří ručně 10–20 cm pod hladinou z konce mola, s časem a počasím,
ideálně v den přeletu: 24., 25. 9., 2., 3., 10., 11. 10. 2026.
