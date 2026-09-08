#!/usr/bin/env python3
"""Vyrobí vymyšlený ročník pro vývoj a testy.

**Jména lodí, kategorií a zastávek jsou skutečná** — vytažená z tabulek
rozhodčího. Výsledky jsou vymyšlené: skutečné zatím nemáme.

Proč skutečná jména: mock je zároveň zkouškou importu, a skutečná data mají
diakritiku, dvojité mezery (`FAR  STAR III`) i zavináč (`M@rtina`). Vymyšlené
hezké názvy by tuhle třídu chyb nikdy neodhalily.

Pevný seed, takže opakované spuštění dá tentýž soubor a v gitu se objeví
jen skutečné změny.
"""
import json, random, unicodedata
from datetime import date, datetime, timedelta, timezone

R = random.Random(20260426)

LODE = {
    "Pod7m": ["LUNA", "SENDY", "JOY", "Andante", "Varianta", "SANDY", "Charlotte III"],
    "Nad7m": ["PEZI", "MAMBA", "M1", "DEPRESSO", "CASSIOPEIA", "SULA", "NABLB",
              "FILOZEP", "SPRUNZEL", "THEA", "MICHELLE", "DIVNA", "FAMILY LADY",
              "M@rtina", "ROSE", "MICINY", "AVENIR", "HOGAN", "LIBERTÉ", "Rio",
              "Claudie", "Mabye", "Caprice", "Valhalla", "Perun"],
    "Race": ["ČERVENÉ CAFE", "MODRÉ CAFE", "SEA MOUSE III", "SOCKA",
             "FAR  STAR III", "Zephyr"],
}

# Zastávky ročníku 2026 tak, jak je vede rozhodčí. Typ, počet rozjížděk,
# škrty a vyhodnocení odpovídají tomu, co o nich víme z plánu.
ZAVODY = [
    ("Jarní vítr",      "YC Orlík",     date(2026, 4, 25), "okruhový",     4, 1, "PoKategoriich", 1.0),
    ("Radavská regata", "LK Radava",    date(2026, 5,  9), "okruhový",     4, 1, "PoKategoriich", 1.0),
    ("24hodinovka",     "YC Orlík",     date(2026, 5, 23), "24 hodin",     1, 0, "CelePole",      1.0),
    ("Izolepa",         "YC Orlík",     date(2026, 6, 20), "Izolepa",      3, 0, "PoKategoriich", 1.0),
    ("FxCK Cancer",     "Marina Orlík", date(2026, 7, 11), "okruhový",     2, 0, "PoKategoriich", 1.0),
    ("Radavský pohár",  "LK Radava",    date(2026, 8, 15), "okruhový",     3, 1, "PoKategoriich", 1.0),
    ("O pohár Vltavy",  "Plachtič z Vltavy", date(2026, 9, 5), "vytrvalostní", 1, 0, "PoKategoriich", 1.0),
    ("Pohár Slunce",    "SK Popovice",  date(2026, 9, 19), "okruhový",     4, 1, "PoKategoriich", 1.0),
    ("Vánoční regata",  "YC Orlík",     date(2026, 12, 12), "fun",         1, 0, "PoKategoriich", 1.0),
]

JMENA = ["Jan", "Petr", "Martin", "Tomáš", "Jakub", "Lucie", "Eva", "Michal",
         "Ondřej", "Pavel", "Kateřina", "Jiří", "Zdeněk", "Markéta", "Radek",
         "Hana", "Vojtěch", "Lukáš", "Alena", "Marek", "Tereza", "Ivan",
         "Dana", "Filip", "Roman", "Jana", "Karel", "Věra", "Milan", "Olga",
         "Josef", "Šárka", "David", "Blanka", "Aleš", "Nikola", "Vít", "Iva"]
PRIJMENI = ["Novák", "Svoboda", "Dvořák", "Černý", "Procházka", "Kučera",
            "Veselý", "Horák", "Němec", "Marek", "Pokorný", "Král", "Beneš",
            "Fiala", "Sedláček", "Urban", "Kolář", "Ryba", "Vaněk", "Bláha",
            "Hájek", "Kříž", "Jelínek", "Malý", "Šimek", "Konečný", "Vlček",
            "Sýkora", "Zeman", "Kolman", "Bartoš", "Doležal", "Štěpánek",
            "Havel", "Souček", "Bureš", "Toman", "Kadlec", "Musil", "Duda"]

KODY = ["Dnf", "Dns", "Ret", "Ocs"]

# Co o ročníku 2026 skutečně víme. Zbytek výsledků je vylosovaný, ale tohle
# ne — mock má skutečná jména lodí, takže vymyslet jim účast, kterou nikdo
# nejel, je zbytečná nepravda. Přibývá sem, co Filip potvrdí.
#
# Zdroj: Filip, 8. 9. 2026, ke 24hodinovce.
ZNAME = {
    ("24hodinovka", "zephyr"): "nejela",
    ("24hodinovka", "cervene-cafe"): "odstoupila",
    ("24hodinovka", "modre-cafe"): "dojela",
}


def klic(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return "-".join(x for x in "".join(c if c.isalnum() else " " for c in s.lower()).split())


osoby, lode, prihlasky = [], [], []
for i, (kategorie, jmena) in enumerate(LODE.items()):
    for nazev in jmena:
        o = {"klic": f"osoba-{len(osoby) + 1}",
             "jmeno": JMENA[len(osoby) % len(JMENA)],
             "prijmeni": PRIJMENI[len(osoby) % len(PRIJMENI)]}
        osoby.append(o)
        lode.append({"klic": klic(nazev), "nazev": nazev,
                     "cisloPlachty": f"CZE {R.randint(100, 999)}",
                     "typ": R.choice(["Fireball", "Vaurien", "Pirát", "Star", "Dyas",
                                      "Laser", "Finn", "Beneteau First"]),
                     "majitel": o["klic"]})
        prihlasky.append({"lod": klic(nazev), "kategorie": kategorie})

zavody = []
for poradi, (nazev, poradatel, den, typ, pocet_r, skrty, vyhodnoceni, koef) in enumerate(ZAVODY, 1):
    # Loď nejede všechny zastávky; u vánoční regaty jich jede výrazně míň.
    pravdepodobnost = 0.45 if typ == "fun" else 0.82
    startuji = [l["klic"] for l in lode if R.random() < pravdepodobnost]
    if len(startuji) < 6:
        startuji = [l["klic"] for l in lode][:8]

    # Co víme, to se nelosuje.
    zname = {lod: co for (zavod, lod), co in ZNAME.items() if zavod == klic(nazev)}
    startuji = [k for k in startuji if zname.get(k) != "nejela"]
    startuji += [k for k, co in zname.items() if co != "nejela" and k not in startuji]

    ucasti = [{"lod": k,
               "kormidelnik": next(l["majitel"] for l in lode if l["klic"] == k)
               if R.random() > 0.25 else R.choice(osoby)["klic"],
               "posadka": ", ".join(f'{o["jmeno"]} {o["prijmeni"]}'
                                    for o in R.sample(osoby, R.randint(1, 3)))}
              for k in startuji]

    dvoudenni = typ == "24 hodin"
    rozjizdky = []
    for cislo in range(1, pocet_r + 1):
        start = datetime(den.year, den.month, den.day, 10, 0,
                         tzinfo=timezone(timedelta(hours=2))) + timedelta(hours=2 * (cislo - 1))
        poradi_lodi = startuji[:]
        R.shuffle(poradi_lodi)

        vysledky, misto = [], 0
        for k in poradi_lodi:
            # Los padne vždycky, i když se pak přebije známým faktem —
            # jinak by se posunul celý zbytek generátoru.
            los, znamy = R.random(), zname.get(k)
            if znamy == "odstoupila":
                vysledky.append({"lod": k, "kod": "Ret"})
                continue
            if los < 0.08 and znamy != "dojela":
                vysledky.append({"lod": k, "kod": R.choice(KODY)})
                continue
            misto += 1
            zaklad = 86000 if dvoudenni else 3600
            cas = int(zaklad * (1 + 0.02 * misto) + R.randint(-90, 90))
            vysledky.append({"lod": k, "poradiVCili": misto,
                             "dojezdV": (start + timedelta(seconds=cas)).isoformat(),
                             "casSekundy": cas})

        # Izolepa: první rozjížďka je běh pro míčky z kopce, do poháru jde
        # jedna z těch na vodě.
        do_serie = True
        if typ == "Izolepa":
            do_serie = cislo == 2
        rozjizdky.append({"cislo": cislo, "startV": start.isoformat(),
                          "stav": "Dokoncena", "doSerie": do_serie,
                          "vysledky": vysledky})
        if typ == "Izolepa" and cislo == 1:
            rozjizdky[-1]["poznamka"] = "běh pro míčky z kopce — nejede se na vodě"

    zavody.append({"slug": klic(nazev), "nazev": nazev, "poradatel": poradatel,
                   "datum": den.isoformat(), "datumKonce":
                       (den + timedelta(days=1)).isoformat() if dvoudenni else None,
                   "typ": typ, "poradi": poradi, "pocetSkrtu": skrty,
                   "vyhodnoceni": vyhodnoceni, "koeficientDoSerie": koef,
                   # Vánoční regata je až v prosinci, takže je teprve v kalendáři.
                   "stav": "Planovany" if den > date(2026, 9, 8) else "Odjety",
                   "publikovano": False, "ucasti": ucasti, "rozjizdky": rozjizdky})

data = {
    "_poznamka": (
        "JMÉNA JSOU SKUTEČNÁ, VÝSLEDKY VYMYŠLENÉ. Lodě, kategorie a zastávky "
        "pocházejí z tabulek rozhodčího; pořadí a časy jsou vygenerované, "
        "protože skutečné výsledky zatím nemáme. Ročník je NEPUBLIKOVANÝ, "
        "aby se vymyšlená data nedostala na veřejné stránky. Vyrábí "
        "tools/gen-mock.py s pevným seedem."),
    "slug": "2026-nanecisto", "nazev": "Orlický pohár 2026 (nanečisto)",
    "rok": 2026, "publikovano": False,
    "kategorie": [{"nazev": "Race", "poradi": 1},
                  {"nazev": "Nad7m", "poradi": 2},
                  {"nazev": "Pod7m", "poradi": 3}],
    "osoby": osoby, "lode": lode, "prihlasky": prihlasky, "zavody": zavody,
}

with open("data/2026-nanecisto.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")

print(f"lodí: {len(lode)} | zastávek: {len(zavody)} | rozjížděk: "
      f"{sum(len(z['rozjizdky']) for z in zavody)} | výsledků: "
      f"{sum(len(r['vysledky']) for z in zavody for r in z['rozjizdky'])}")
