#!/usr/bin/env python3
"""Vyrobí ročník nanečisto pro vývoj, testy a produkční ukázku.

**Jména lodí, kategorií a regat jsou skutečná** — vytažená z tabulek
rozhodčího. **Pořadí v kategoriích na odjetých regatách je skutečné taky**
(od 22. 9. 2026): bere se ze sešitu rozhodčího v
`data/2026-poradi-rozhodci.json`, aby rozhodčí na webu viděl svá čísla
a mohl je porovnat se sešitem. Vymyšlené zůstávají rozjížďky, časy,
posádky a články — sešit vede jen body do seriálu, ne výsledky rozjížděk.

Proč skutečná jména: mock je zároveň zkouškou importu, a skutečná data mají
diakritiku, dvojité mezery (`FAR  STAR III`) i zavináč (`M@rtina`). Vymyšlené
hezké názvy by tuhle třídu chyb nikdy neodhalily.

Pevný seed, takže opakované spuštění dá tentýž soubor a v gitu se objeví
jen skutečné změny.

Dva režimy, protože soubor v `data/` a soubor k nahrání na produkci nemají
stejný stav publikace:

    gen-mock.py                          → data/2026-nanecisto.json, NEPUBLIKOVANÝ
    gen-mock.py --publikovat > kam.json  → tentýž ročník, ale publikovaný

Verze v repozitáři je schválně nepublikovaná, aby se vymyšlená data nedala
omylem vystavit; hlídají to `KontraktTests`. Na produkci ročník publikovaný
**je** — ukazuje se u něj pruh, že data nejsou skutečná — takže nahrání
doslovného souboru z `data/` by ho i všechny regaty schovalo. Import stav
publikace přepisuje, takže tenhle rozdíl není kosmetika, ale výpadek webu.
Proto je to přepínač, ne ruční úprava souboru před odesláním.
"""
import argparse, json, random, sys, unicodedata
from datetime import date, datetime, timedelta, timezone

argumenty = argparse.ArgumentParser(description="Vyrobí vymyšlený ročník.")
argumenty.add_argument(
    "--publikovat", action="store_true",
    help="ročník i regaty označí jako publikované a výsledek pošle na stdout")
VOLBY = argumenty.parse_args()

R = random.Random(20260426)

# Skutečný sešit rozhodčího: body do seriálu po regatách, s odvozeným
# umístěním v kategorii a kódem (DNC, DSQ). Z něj se skládají rozjížďky.
with open("data/2026-poradi-rozhodci.json", encoding="utf-8") as f:
    SESIT = json.load(f)

# Skutečné výsledkové listiny závodů. U nich se rozjížďky nevymýšlejí.
LISTINY = {}
for soubor in ["data/2026-fxck-cancer.json"]:
    with open(soubor, encoding="utf-8") as f:
        listina = json.load(f)
    LISTINY[listina["zavod"]] = listina

# Regaty, které se podle sešitu nejely (u všech lodí nuly).
ZRUSENE = set(SESIT["zruseneVSesitu"])

LODE = {
    # SANDY tu bývala z prvního sešitu; v obou pozdějších není (nejspíš
    # překlep SENDY), a loď bez jediného startu by v tabulce jen mátla.
    "Pod7m": ["LUNA", "SENDY", "JOY", "Andante", "Varianta", "Charlotte III"],
    "Nad7m": ["PEZI", "MAMBA", "M1", "DEPRESSO", "CASSIOPEIA", "SULA", "NABLB",
              "FILOZEP", "SPRUNZEL", "THEA", "MICHELLE", "DIVNA", "FAMILY LADY",
              "M@rtina", "ROSE", "MICINY", "AVENIR", "HOGAN", "LIBERTÉ", "Rio",
              "Claudie", "Mabye", "Caprice", "Valhalla", "Perun"],
    "Race": ["ČERVENÉ CAFE", "MODRÉ CAFE", "SEA MOUSE III", "SOCKA",
             "FAR  STAR III", "Zephyr"],
}

# Regaty ročníku 2026 tak, jak je vede rozhodčí. Počet rozjížděk a typ
# odpovídají tomu, co o nich víme z plánu; škrt se dopočítá pravidlem, ne
# ručně. Kdysi to vypadalo na rozpor — sešit měl u Radavského poháru škrt
# při třech rozjížďkách, což pravidlu „škrtá se od čtyř" odporuje. Ruční
# listina z 29. 8. 2026 ukázala, že rozjížďky byly čtyři (kajutové lodě
# mají na papíře 0 / 2 / 6 bodů, což sedí jen se škrtem ze čtyř);
# rozhodčí to 23. 9. 2026 potvrdil. Pravidlo tedy platí a sešit taky.
ZAVODY = [
    ("Jarní vítr",      "YC Orlík",     date(2026, 4, 25), "okruhový",     4, "PoKategoriich", 1.0),
    ("Radavská regata", "LK Radava",    date(2026, 5,  9), "okruhový",     4, "PoKategoriich", 1.0),
    ("24hodinovka",     "YC Orlík",     date(2026, 5, 23), "24 hodin",     1, "CelePole",      1.0),
    ("Izolepa",         "YC Orlík",     date(2026, 6, 20), "Izolepa",      3, "PoKategoriich", 1.0),
    ("FxCK Cancer",     "Marina Orlík", date(2026, 7, 11), "okruhový",     2, "PoKategoriich", 1.0),
    # Pořadatel: Filip, 15. 9. 2026 — Yacht Club Písek, ne LK Radava.
    # Termín podle ruční startovní listiny od rozhodčího (CTL 260001,
    # ředitel Štěpán Záruba): 29. 8. 2026, ne 15. 8. — Filip, 23. 9. 2026.
    # Čtyři rozjížďky, ne tři (tatáž listina, potvrzeno rozhodčím 23. 9.).
    ("Radavský pohár",  "Yacht Club Písek", date(2026, 8, 29), "okruhový", 4, "PoKategoriich", 1.0),
    ("O pohár Vltavy",  "Plachtič z Vltavy", date(2026, 9, 5), "vytrvalostní", 1, "PoKategoriich", 1.0),
    ("Pohár Slunce",    "SK Popovice",  date(2026, 9, 19), "okruhový",     4, "PoKategoriich", 1.0),
    ("Vánoční regata",  "YC Orlík",     date(2026, 12, 12), "fun",         1, "PoKategoriich", 1.0),
]


def skrty(typ, pocet_rozjizdek):
    """Okruhový závod se čtyřmi a více rozjížďkami škrtá jednu nejhorší.

    Se třemi a méně se neškrtá nic. Skutečný počet rozjížděk se rozhoduje
    na vodě podle větru, takže hodnota vzniká až po závodě — rozhodčí ji
    smí přepsat a uložená zůstává ta jeho.
    """
    return 1 if typ == "okruhový" and pocet_rozjizdek >= 4 else 0

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
# Zdroj: Filip, 8. 9. 2026, ke 24hodinovce. ČERVENÉ CAFE tehdy „odstoupila";
# sešit jí ale dává 20 bodů, což je podle pravidel rozhodčího diskvalifikace
# v regatě — mock se drží sešitu a rozpor je otázka na rozhodčího.
ZNAME = {
    ("24hodinovka", "zephyr"): "nejela",
}


def umisteni_ze_sesitu(nazev_zastavky):
    """Kdo na regatě byl a na kolikátém místě v kategorii, podle sešitu.

    Vrací {klic lodi: misto} pro lodě s umístěním a množinu diskvalifikovaných.
    Neúčast (DNC) se nevrací — loď na regatě nebyla.
    """
    if nazev_zastavky not in SESIT["zavody"]:
        return None, set()
    i = SESIT["zavody"].index(nazev_zastavky)
    mista, dsq = {}, set()
    for radky in SESIT["kategorie"].values():
        for r in radky:
            z = r["zastavky"][i]
            if z.get("misto") is not None:
                mista[klic(r["lod"])] = z["misto"]
            elif z.get("kod") == "DSQ":
                dsq.add(klic(r["lod"]))
    return mista, dsq


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

KATEGORIE_LODI_PRED = {p["lod"]: p["kategorie"] for p in prihlasky}

zavody = []
for poradi, (nazev, poradatel, den, typ, pocet_r, vyhodnoceni, koef) in enumerate(ZAVODY, 1):
    mista, diskvalifikovane = umisteni_ze_sesitu(nazev)
    # Radavská i Vánoční regata se v roce 2026 nejely (rozhodčí, 22. 9. 2026);
    # datum Vánoční regaty v tabulce výš je vymyšlené.
    zrusena = nazev in ZRUSENE

    # Plánovaná regata se ještě nejela, takže po ní nemůžou být výsledky.
    # Nanejvýš je známo, kdo se chystá jet — účasti tedy zůstávají, rozjížďky
    # vzniknou až na vodě.
    odjety = mista is not None and not zrusena

    listina = LISTINY.get(nazev) if odjety else None
    if listina:
        startuji = [klic(v["lod"]) for v in listina["rozjizdky"][0]["vysledky"]]
    elif odjety:
        # Kdo jel, říká sešit: lodě s umístěním a diskvalifikované.
        startuji = [l["klic"] for l in lode if l["klic"] in mista or l["klic"] in diskvalifikovane]
    else:
        # Loď nejede všechny regaty; u vánoční regaty jich jede výrazně míň.
        pravdepodobnost = 0.45 if typ == "fun" else 0.82
        startuji = [l["klic"] for l in lode if R.random() < pravdepodobnost]
        if len(startuji) < 6:
            startuji = [l["klic"] for l in lode][:8]
        startuji = [k for k in startuji
                    if ZNAME.get((klic(nazev), k)) != "nejela"]

    ucasti = [{"lod": k,
               "kormidelnik": next(l["majitel"] for l in lode if l["klic"] == k)
               if R.random() > 0.25 else R.choice(osoby)["klic"],
               "posadka": ", ".join(f'{o["jmeno"]} {o["prijmeni"]}'
                                    for o in R.sample(osoby, R.randint(1, 3)))}
              for k in ([] if zrusena else startuji)]

    odjeto_rozjizdek = (len(listina["rozjizdky"]) if listina else pocet_r) if odjety else 0

    dvoudenni = typ == "24 hodin"
    kat_poradi = {k: i for i, k in enumerate(LODE)}
    rozjizdky = []
    for cislo in range(1, odjeto_rozjizdek + 1):
        start = datetime(den.year, den.month, den.day, 10, 0,
                         tzinfo=timezone(timedelta(hours=2))) + timedelta(hours=2 * (cislo - 1))

        # Izolepa: první rozjížďka je běh pro míčky z kopce, do poháru jde
        # jedna z těch na vodě.
        do_serie = cislo == 2 if typ == "Izolepa" else True

        # Rozjížďky, které jdou do poháru, jedou lodě v pořadí ze sešitu —
        # jinak by body v seriálu nevyšly jako u rozhodčího. Ostatní
        # (běh pro míčky) se losují.
        dojeli = [k for k in startuji if k not in diskvalifikovane]
        if do_serie:
            dojeli.sort(key=lambda k: (mista[k], kat_poradi[KATEGORIE_LODI_PRED[k]]))
        else:
            R.shuffle(dojeli)

        vysledky = []
        for misto, k in enumerate(dojeli, 1):
            zaklad = 86000 if dvoudenni else 3600
            cas = int(zaklad * (1 + 0.02 * misto) + R.randint(-90, 90))
            vysledky.append({"lod": k, "poradiVCili": misto,
                             "dojezdV": (start + timedelta(seconds=cas)).isoformat(),
                             "casSekundy": cas})
        for k in startuji:
            if k in diskvalifikovane:
                vysledky.append({"lod": k, "kod": "Dsq"})

        if listina:
            # Skutečná listina: pořadí v cíli a kódy tak, jak jsou. Časy
            # na listině nejsou, takže tu nejsou ani vymyšlené.
            vysledky = [{"lod": klic(v["lod"]), **{k: v[k] for k in v if k != "lod"}}
                        for v in listina["rozjizdky"][cislo - 1]["vysledky"]]

        rozjizdky.append({"cislo": cislo, "startV": start.isoformat(),
                          "stav": "Dokoncena", "doSerie": do_serie,
                          "vysledky": vysledky})
        if typ == "Izolepa" and cislo == 1:
            rozjizdky[-1]["poznamka"] = "běh pro míčky z kopce — nejede se na vodě"

    zavody.append({"slug": klic(nazev), "nazev": nazev, "poradatel": poradatel,
                   "datum": den.isoformat(), "datumKonce":
                       (den + timedelta(days=1)).isoformat() if dvoudenni else None,
                   "typ": typ, "poradi": poradi,
                   "pocetSkrtu": skrty(typ, odjeto_rozjizdek),
                   "vyhodnoceni": vyhodnoceni, "koeficientDoSerie": koef,
                   # „Za účast ve 24hodinovce bodové zvýhodnění: 1. místo −1."
                   "posunDoSerie": -1 if dvoudenni else 0,
                   # Regata, která je teprve v kalendáři, nemá výsledky.
                   "stav": "Zruseny" if zrusena else "Odjety" if odjety else "Planovany",
                   "publikovano": VOLBY.publikovat,
                   "ucasti": ucasti, "rozjizdky": rozjizdky})


# --- Blog a novinky -------------------------------------------------------
#
# Články jsou VYMYŠLENÉ, stejně jako výsledky. Jména regat a pořadatelů
# skutečná jsou, takže se tu nepíše nic, co by šlo číst jako tvrzení o tom,
# co se doopravdy stalo — žádné citace, žádná jména lidí. Vítěze si text
# bere z vygenerovaných výsledků, aby si novinka s tabulkou neodporovala:
# rozpor mezi textem a čísly vypadá jako chyba webu, ne jako ukázka.
#
# Skutečné články napíše organizátor a pořadatelé v administraci (fáze 5).
# Do té doby slouží tyhle k tomu, aby se dalo vidět, jak blog vypadá plný.

UVOD_SERIE = """\
Devět regat, tři kategorie a jedno průběžné pořadí. Ročník začíná na
konci dubna Jarním větrem a končí Vánoční regatou; mezi tím se jede
čtyřiadvacetihodinovka, Izolepa i klasické okruhové závody.

Body sbírá loď, ne posádka — kormidelník se mezi závody mění, loď ne.
Do celkového pořadí se počítá každá odjetá regata a nejhorší výsledky
se škrtají.

Přihlášky přijímá pořadatel každé regaty zvlášť. Kdo chce jet celý
seriál, hlásí se do ročníku jednou a kategorii má na celý rok."""

POZVANKA = """\
Pořádá {poradatel}. Jede se {datum}.

Vypsání závodu a plachetní směrnice vydává pořadatel; přihlášky přijímá on,
ne pohár. Rozpis rozjížděk se rozhoduje na vodě podle větru, takže jejich
počet dopředu neslibujeme.

Kdo jede celý seriál, nemusí nic hlásit navíc — kategorie platí celý rok."""

ZPRAVA = """\
{nazev} je odjetá. {uvod} vyhrála {vitez}.

{rozjizdky}

Kompletní výsledky včetně bodů z jednotlivých rozjížděk najdeš na stránce
regaty, průběžné pořadí ročníku pak v tabulce seriálu."""

POLOCAS = """\
Ročník má za sebou {odjeto} z {celkem} regat. Průběžné pořadí se od
konečného může ještě výrazně lišit — škrty nejhorších závodů se projeví
až na konci a do té doby drží ve hře i lodě, které jednu regatu
propásly.

Nejbližší regatou je {dalsi}. Kdo ještě neodjel čtyři závody, má pořád
šanci se do popředí dostat; kdo odjel všechny, má naopak co ztratit."""


def cesky_datum(d):
    mesice = ["ledna", "února", "března", "dubna", "května", "června",
              "července", "srpna", "září", "října", "listopadu", "prosince"]
    return f"{d.day}. {mesice[d.month - 1]} {d.year}"


def veta_o_rozjizdkach(celkem, do_serie, skrtu):
    """Kolik se jelo, kolik jde do poháru a jestli se škrtá.

    Skládá se z kusů, ne z jedné šablony s doplňovačkou: čeština má u
    jedničky jiný tvar slovesa i podstatného jména a věta „Jelo se jedna
    rozjížďka, do poháru všechny" je znát na první přečtení.
    """
    if celkem == 1:
        return "Jela se jedna rozjížďka a jde do poháru." if do_serie \
            else "Jela se jedna rozjížďka a do poháru nejde."

    tvar = f"{celkem} rozjížďky" if celkem <= 4 else f"{celkem} rozjížděk"
    kolik = ("jdou všechny" if do_serie == celkem
             else "jde jedna" if do_serie == 1
             else f"jdou {do_serie}")
    skrt = (" Nejhorší z nich se škrtá." if skrtu == 1
            else f" Nejhorší {skrtu} se škrtají." if skrtu else "")
    return f"Jely se {tvar}, do poháru {kolik}.{skrt}"


def vitez_zastavky(z, kategorie):
    """Vítěz dané kategorie podle vygenerovaných výsledků.

    Počítá se stejným pravidlem jako v `fake-api.py` — jenže tady stačí
    součet umístění v rozjížďkách, které jdou do seriálu. Nejde o tabulku,
    jen o jméno do perexu, takže se škrt neuplatňuje.
    """
    do_serie = [r for r in z["rozjizdky"] if r["doSerie"]]
    if not do_serie:
        return None

    body = {}
    for r in do_serie:
        dojely = sorted((v for v in r["vysledky"] if v.get("poradiVCili")),
                        key=lambda v: v["poradiVCili"])
        for misto, v in enumerate(dojely, 1):
            body[v["lod"]] = body.get(v["lod"], 0) + misto

    # U závodu na celé pole se kategorie nerozlišují, jinak se bere ta zadaná.
    v_kategorii = {lod: b for lod, b in body.items()
                   if kategorie is None or KATEGORIE_LODI.get(lod) == kategorie}
    if not v_kategorii:
        return None

    nej = min(v_kategorii, key=lambda lod: (v_kategorii[lod], lod))
    return next(l["nazev"] for l in lode if l["klic"] == nej)


D_KATEGORIE = ["Race", "Nad7m", "Pod7m"]
KATEGORIE_LODI = {p["lod"]: p["kategorie"] for p in prihlasky}

clanky = []
odjete = [z for z in zavody if z["stav"] == "Odjety"]
cekajici = [z for z in zavody if z["stav"] == "Planovany"]

clanky.append({
    "slug": "rocnik-2026-zacina",
    "titulek": "Ročník 2026 začíná",
    "perex": "Devět regat od dubna do prosince, tři kategorie a jedno "
             "průběžné pořadí. Co je letos v kalendáři a jak se boduje.",
    "telo": UVOD_SERIE,
    "autor": "Orlický pohár",
    "publikovanoV": datetime(2026, 4, 12, 18, 0, tzinfo=timezone(timedelta(hours=2))).isoformat(),
    "publikovano": True,
})

for z in zavody:
    den = date.fromisoformat(z["datum"])
    poradatel = z["poradatel"]

    if z["stav"] == "Odjety":
        # Kategorie do titulku se střídá podle pořadí regaty. Brát pořád
        # tu první by dalo devět stejných nadpisů a blog by vypadal jako
        # jeden článek zkopírovaný devětkrát — což o rozložení stránky
        # neřekne nic.
        cele_pole = z["vyhodnoceni"] == "CelePole"
        kategorie = None if cele_pole else D_KATEGORIE[(z["poradi"] - 1) % len(D_KATEGORIE)]
        jmeno_lodi = vitez_zastavky(z, kategorie)
        if not jmeno_lodi:
            continue
        do_serie = sum(1 for r in z["rozjizdky"] if r["doSerie"])
        skrtu = z["pocetSkrtu"]
        clanky.append({
            "slug": f'{z["slug"]}-vysledky',
            "titulek": f'{z["nazev"]}: {jmeno_lodi} '
                       + ("vyhrála celé pole" if cele_pole else f"bere kategorii {kategorie}"),
            "perex": f'Regata je odjetá. Výsledky, body do poháru a co to '
                     f'udělalo s průběžným pořadím.',
            "telo": ZPRAVA.format(
                nazev=z["nazev"], vitez=jmeno_lodi,
                uvod="Napříč celým polem" if cele_pole
                     else f"V kategorii {kategorie}",
                rozjizdky=veta_o_rozjizdkach(len(z["rozjizdky"]), do_serie, skrtu)),
            "autor": poradatel,
            "zavod": z["slug"],
            # Zpráva vychází večer po závodě, ne v poledne během něj.
            "publikovanoV": datetime(den.year, den.month, den.day, 20, 30,
                                     tzinfo=timezone(timedelta(hours=2))).isoformat(),
            "publikovano": True,
        })
    elif z["stav"] == "Planovany":
        clanky.append({
            "slug": f'{z["slug"]}-pozvanka',
            "titulek": f'Pozvánka: {z["nazev"]}',
            "perex": f'{cesky_datum(den)}. Přihlášky přijímá pořadatel; '
                     f'kdo jede celý seriál, hlásit se znovu nemusí.',
            "telo": POZVANKA.format(poradatel=poradatel, datum=cesky_datum(den)),
            "autor": poradatel,
            "zavod": z["slug"],
            # Pozvánka vyjde tři týdny před závodem.
            "publikovanoV": (datetime(den.year, den.month, den.day, 9, 0,
                                      tzinfo=timezone(timedelta(hours=2)))
                             - timedelta(days=21)).isoformat(),
            "publikovano": True,
        })

if odjete and cekajici:
    posledni = date.fromisoformat(odjete[-1]["datum"])
    clanky.append({
        "slug": "prubezne-poradi-neni-konecne",
        "titulek": "Průběžné pořadí ještě není konečné",
        "perex": "Průběžné pořadí ještě zdaleka není konečné — škrty "
                 "nejhorších závodů se projeví až na konci sezóny.",
        "telo": POLOCAS.format(odjeto=len(odjete), celkem=len(zavody),
                               dalsi=cekajici[0]["nazev"]),
        "autor": "Orlický pohár",
        "publikovanoV": datetime(posledni.year, posledni.month, posledni.day, 12, 0,
                                 tzinfo=timezone(timedelta(hours=2))).isoformat(),
        "publikovano": True,
    })

clanky.sort(key=lambda c: c["publikovanoV"], reverse=True)

data = {
    "_poznamka": (
        "JMÉNA I POŘADÍ V KATEGORIÍCH JSOU SKUTEČNÁ, ROZJÍŽĎKY VYMYŠLENÉ. Lodě, "
        "kategorie, regaty a pořadí v kategorii na každé odjeté regatě pocházejí "
        "ze sešitu rozhodčího (data/2026-poradi-rozhodci.json, stav po Poháru Slunce); "
        "u FxCK Cancer jsou i rozjížďky skutečné (data/2026-fxck-cancer.json). Ostatní "
        "rozjížďky, časy, posádky a články jsou vygenerované, protože výsledkové "
        "listiny zbylých regat nemáme. Ročník je "
        + ("PUBLIKOVANÝ — patří na produkci, kde u něj web ukazuje pruh, že "
           "data nejsou skutečná (proměnná UKAZKOVE_SERIE)."
           if VOLBY.publikovat else
           "NEPUBLIKOVANÝ, aby se vymyšlená data nedostala na veřejné stránky.")
        + " Vyrábí tools/gen-mock.py s pevným seedem."),
    "slug": "2026-nanecisto", "nazev": "Orlický pohár 2026 (nanečisto)",
    "rok": 2026, "publikovano": VOLBY.publikovat,
    "pocetSkrtu": SESIT["pocetSkrtu"],
    "kategorie": [{"nazev": "Race", "poradi": 1},
                  {"nazev": "Nad7m", "poradi": 2},
                  {"nazev": "Pod7m", "poradi": 3}],
    "osoby": osoby, "lode": lode, "prihlasky": prihlasky, "zavody": zavody,
    "clanky": clanky,
}

# Publikovaná verze jde na stdout a do `data/` se nezapíše nikdy. Kdyby se
# tam dostala, commitla by se — a od té chvíle by stačil `git pull` a jeden
# import k tomu, aby se na veřejné stránky dostala vymyšlená data.
if VOLBY.publikovat:
    json.dump(data, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
else:
    with open("data/2026-nanecisto.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

# Souhrn patří na stderr, aby nezašpinil ročník posílaný rourou dál.
print(f"lodí: {len(lode)} | regat: {len(zavody)} | článků: {len(clanky)} | rozjížděk: "
      f"{sum(len(z['rozjizdky']) for z in zavody)} | výsledků: "
      f"{sum(len(r['vysledky']) for z in zavody for r in z['rozjizdky'])}"
      + (" | PUBLIKOVANÝ, na stdout" if VOLBY.publikovat else ""),
      file=sys.stderr)
