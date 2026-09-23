#!/usr/bin/env python3
"""Falešné API pro vizuální kontrolu webu.

Servíruje mock ročník ve stejných tvarech jako skutečné API, ale tváří se,
že je publikovaný. Nesahá tím na produkci, kde vymyšlená data zveřejněná
schválně nejsou.

Bodování je tu **opsané** z `Features/Bodovani/Bodovani.cs` a `Serie.cs`.
Pravda o pravidlech leží tam a hlídají ji testy; tenhle přepis existuje jen
proto, aby šly stránky vidět na stroji, kde se databáze rozjet nedá. Když se
pravidlo změní, mění se na obou místech — a rozejít se můžou jen tady.
"""
import functools
import json, os, re, sys, unicodedata, uuid
from email.parser import BytesParser
from email.policy import HTTP
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

# Který ročník servírovat. Výchozí je mock; jiný se dá dát argumentem —
# kalendář ročníku bez lodí (data/2027-kalendar.json) se jinak nedá na
# webu vidět, dokud ho někdo nenahraje do databáze.
D = json.load(open(sys.argv[1] if len(sys.argv) > 1 else "data/2026-nanecisto.json",
                  encoding="utf-8"))
LODE = {l["klic"]: l for l in D["lode"]}
OSOBY = {o["klic"]: o for o in D["osoby"]}
KAT = {p["lod"]: p["kategorie"] for p in D["prihlasky"]}
# Kategorie se řadí podle série, ne abecedně — jinak Nad7m předběhne Race.
KAT_PORADI = {k["nazev"]: k["poradi"] for k in D["kategorie"]}

# Mock vznikl před workflow výsledků a o stavu zápisu neví. Doplní se
# stejně, jako to dělá import: čísla ze sešitu rozhodčího jsou potvrzená
# a veřejná, ne návrh.
for _z in D["zavody"]:
    for _r in _z["rozjizdky"]:
        _r.setdefault("stavVysledku", "Potvrzeno")
        _r.setdefault("publikovano", True)
    # Mock zná jen kola poháru; akce se zakládají v kalendáři.
    _z.setdefault("druh", "Pohar")
    # Účast z mocku je ze sešitu rozhodčího, tedy potvrzená — jako po migraci.
    for _u in _z["ucasti"]:
        _u.setdefault("stav", "Potvrzena")

# Snímek druhého zapisovatele u poslední odjeté regaty: dvě lodě prohozené
# a jedna, kterou jeden z nich nemá. Přesně ty dva případy, které plán
# u porovnání jmenuje.
def _nasad_druhy_snimek():
    z = next((z for z in D["zavody"] if z["stav"] == "Odjety" and z["rozjizdky"]), None)
    if not z:
        return
    r = z["rozjizdky"][0]
    poradi = sorted((v for v in r["vysledky"] if v.get("poradiVCili")),
                    key=lambda v: v["poradiVCili"])
    if len(poradi) < 4:
        return

    jina = [v["lod"] for v in poradi]
    jina[1], jina[2] = jina[2], jina[1]
    jina.pop()

    r["navrhy"] = [{
        "uzivatelId": DRUHY_ZAPISOVATEL["id"], "kdo": DRUHY_ZAPISOVATEL["zobrazovane"],
        "zapsanoV": "2026-09-19T14:32:00Z",
        "radky": [{"prihlaskaId": PRIHLASKA_ID[lod], "poradiVCili": i + 1, "kod": None}
                  for i, lod in enumerate(jina)],
    }]


# Jeden požadavek z webu, ať je ve správě vidět fronta: na vypsanou
# zastávku, a když žádná není, na poslední odjetou.
_otevrene = [z for z in D["zavody"] if z.get("stav") in ("Vypsany", "Odjety")]
_otevrene.sort(key=lambda z: (z.get("stav") != "Vypsany", -z["poradi"]))
if _otevrene:
    _z = _otevrene[0]
    _volna = next((p["lod"] for p in D["prihlasky"]
                   if all(u["lod"] != p["lod"] for u in _z["ucasti"])), None)
    if _volna:
        _z["ucasti"].append({"lod": _volna, "kormidelnik": None, "posadka": None, "stav": "Pozadavek"})



def jmeno(klic):
    o = OSOBY[klic]
    return f'{o["jmeno"]} {o["prijmeni"]}'


def body_rozjizdky(vysledky, prihlaseno=None):
    """Body v jedné rozjížďce uvnitř jedné kategorie. Vítěz má 1.

    Kódy podle ZPJ A5.2 jako v API: přihlášených do závodu + 1, všechny
    stejně; RDG hned za posledním dokončivším.
    """
    dokoncily = sorted(
        (v for v in vysledky if not v.get("kod") and v.get("poradiVCili") is not None),
        key=lambda v: v["poradiVCili"])
    body = {v["lod"]: i + 1 for i, v in enumerate(dokoncily)}
    za_trest = (prihlaseno if prihlaseno is not None else len(vysledky)) + 1
    for v in vysledky:
        if v.get("kod"):
            body[v["lod"]] = len(dokoncily) + 1 if v["kod"] == "Rdg" else za_trest
    return body


# Stavy účasti, se kterými je loď přihlášená do závodu — jako v API.
PRIHLASENA = {"Prihlasena", "Potvrzena", "Nedostavila", "Vyloucena"}


def prihlaseno_do_zavodu(z, rozjizdky):
    """Počet lodí přihlášených do závodu po kategoriích (účasti ∪ výsledky)."""
    lode = {(KAT[u["lod"]], u["lod"]) for u in z.get("ucasti", [])
            if u.get("stav", "Potvrzena") in PRIHLASENA}
    lode |= {(KAT[v["lod"]], v["lod"]) for r in rozjizdky for v in r["vysledky"]}
    pocty = {}
    for kategorie, _ in lode:
        pocty[kategorie] = pocty.get(kategorie, 0) + 1
    return pocty


def vysledky_zavodu(rozjizdky, pocet_skrtu=0, prihlaseno_zvenku=None, napric=False):
    """Výsledek závodu po kategoriích: součet bodů se škrty a pořadí.

    S `napric` je celé pole jedna kategorie — celkové pořadí regaty, jako
    v `ZavodEndpoints`. Kategorie lodi se do výstupu vrací k zobrazení."""
    kat = (lambda lod: "") if napric else (lambda lod: KAT[lod])
    lode = {}
    prihlaseno = {}
    for kategorie, lod in {(kat(v["lod"]), v["lod"]) for r in rozjizdky for v in r["vysledky"]}:
        prihlaseno[kategorie] = prihlaseno.get(kategorie, 0) + 1
    for kategorie, pocet in (prihlaseno_zvenku or {}).items():
        prihlaseno[kategorie] = max(pocet, prihlaseno.get(kategorie, 0))
    for r in rozjizdky:
        for kategorie in {kat(v["lod"]) for v in r["vysledky"]}:
            vysledky = [v for v in r["vysledky"] if kat(v["lod"]) == kategorie]
            for lod, body in body_rozjizdky(vysledky, prihlaseno[kategorie]).items():
                lode.setdefault(lod, (kategorie, []))[1].append(
                    {"cislo": r["cislo"], "body": body, "skrtnuto": False})

    spocteno = []
    for lod, (kategorie, body) in lode.items():
        skrtnout = min(pocet_skrtu, max(len(body) - 1, 0))
        for b in sorted(body, key=lambda b: (-b["body"], b["cislo"]))[:skrtnout]:
            b["skrtnuto"] = True
        zbylo = [b["body"] for b in body if not b["skrtnuto"]]
        spocteno.append({"lod": lod, "kategorie": kategorie, "body": sum(zbylo),
                         "poradi": 0, "rozjizdky": sorted(body, key=lambda b: b["cislo"]),
                         "_nej": min(zbylo, default=10 ** 6)})

    vysledek = []
    for kategorie in sorted({v["kategorie"] for v in spocteno},
                            key=(lambda k: 0) if napric else KAT_PORADI.get):
        # Shoda podle ZPJ A8 jako v API: seřazené body bez škrtů, pak
        # poslední rozjížďka (i škrtnutá), pak jméno.
        def a8(v):
            serazene = sorted(b["body"] for b in v["rozjizdky"] if not b["skrtnuto"])
            od_konce = [b["body"] for b in sorted(v["rozjizdky"], key=lambda b: -b["cislo"])]
            return (v["body"], serazene, od_konce, v["lod"])
        v_kategorii = sorted((v for v in spocteno if v["kategorie"] == kategorie), key=a8)
        for i, v in enumerate(v_kategorii):
            radek = {**{k: v[k] for k in v if k != "_nej"}, "poradi": i + 1}
            if napric:
                radek["kategorie"] = KAT[v["lod"]]
            vysledek.append(radek)
    return vysledek


def plati(r):
    """Počítá se rozjížďka? Jen publikovaná a needliminovaná — jako v API."""
    return r.get("publikovano", True) and r.get("stavVysledku") != "Eliminovano"


def poradi_serie():
    """Průběžné pořadí po kategoriích, jen z odjetých zastávek.

    Pravidla rozhodčího z 22. 9. 2026, stejně jako SerieBodovani v API:
    pořadí v kategorii mínus jedna (plus posun, u 24hodinovky −1), 20 za
    diskvalifikaci v regatě, neúčast = počet lodí kategorie na zastávce,
    škrty podle série a rozstřel počtem lepších umístění, pak poslední
    společně dokončenou regatou.
    """
    # Jen kola poháru — odjetá akce by tu jinak stála jako prázdný sloupec.
    zastavky = [z for z in D["zavody"] if z.get("stav") == "Odjety" and z["druh"] == "Pohar"]
    zastavky.sort(key=lambda z: z["poradi"])
    pocet_skrtu = D.get("pocetSkrtu", 1)

    body = {}   # (lod, kat) -> [ (body, misto, kod) | None ]
    for i, z in enumerate(zastavky):
        do_serie = [r for r in z["rozjizdky"] if r["doSerie"] and plati(r)]
        kody = {}
        for r in do_serie:
            for v in r["vysledky"]:
                kody.setdefault(v["lod"], set()).add(v.get("kod"))
        pocet = prihlaseno_do_zavodu(z, do_serie)
        vysledky = vysledky_zavodu(do_serie, z.get("pocetSkrtu", 0), pocet)
        for v in vysledky:
            if kody.get(v["lod"]) == {"Dsq"}:
                zaznam = (20, None, "DSQ")
            else:
                zaznam = (round((v["poradi"] - 1) * z.get("koeficientDoSerie", 1))
                          + z.get("posunDoSerie", 0), v["poradi"], None)
            body.setdefault((v["lod"], v["kategorie"]), [None] * len(zastavky))[i] = zaznam
        byly = {v["lod"] for v in vysledky}
        for p in D["prihlasky"]:
            if p["lod"] not in byly:
                body.setdefault((p["lod"], p["kategorie"]), [None] * len(zastavky))[i] = \
                    (pocet.get(p["kategorie"], 0), None, "DNC")

    def skrtnute(rada):
        obsazene = [(i, x) for i, x in enumerate(rada) if x is not None]
        kolik = min(pocet_skrtu, max(len(obsazene) - 1, 0))
        # Při shodě se škrtá dřívější zastávka (ZPJ A2.1).
        poradi = sorted(obsazene, key=lambda t: (-t[1][0], t[0]))
        return {i for i, _ in poradi[:kolik]}

    def rozstrel(a, b, skrty):
        (ra, sa), (rb, sb) = a, b
        def mista(r, s):
            return sorted(x[1] for i, x in enumerate(r)
                          if x is not None and x[1] is not None and not (skrty and i in s))
        ma, mb = mista(ra, sa), mista(rb, sb)
        for x, y in zip(ma, mb):
            if x != y:
                return -1 if x < y else 1
        if len(ma) != len(mb):
            return -1 if len(ma) > len(mb) else 1
        for i in range(len(ra) - 1, -1, -1):
            if skrty and (i in sa or i in sb):
                continue
            x, y = ra[i], rb[i]
            if x is None or y is None or x[1] is None or y[1] is None:
                continue
            if x[1] != y[1]:
                return -1 if x[1] < y[1] else 1
        return 0

    kategorie = []
    for k in D["kategorie"]:
        lode = {lod: b for (lod, kat), b in body.items() if kat == k["nazev"]}
        skrty = {lod: skrtnute(b) for lod, b in lode.items()}
        soucty = {lod: sum(x[0] for x in b if x) for lod, b in lode.items()}
        po_skrtu = {lod: sum(x[0] for i, x in enumerate(b) if x and i not in skrty[lod])
                    for lod, b in lode.items()}

        def serad(soucet, se_skrty):
            def porovnej(a, b):
                if soucet[a] != soucet[b]:
                    return soucet[a] - soucet[b]
                r = rozstrel((lode[a], skrty[a]), (lode[b], skrty[b]), se_skrty)
                return r if r else (-1 if a < b else 1 if a > b else 0)
            return {lod: i + 1 for i, lod in enumerate(
                sorted(lode, key=functools.cmp_to_key(porovnej)))}

        podle_bodu = serad(soucty, False)
        podle_skrtu = serad(po_skrtu, True)

        kategorie.append({"kategorie": k["nazev"], "lode": [
            {"lod": nazvy(lod),
             "majitel": jmeno(LODE[lod]["majitel"]),
             "zastavky": [x[0] if x else None for x in b],
             "body": soucty[lod], "poradi": podle_bodu[lod],
             "bodyPoSkrtu": po_skrtu[lod], "poradiPoSkrtu": podle_skrtu[lod],
             "skrtnuto": (soucty[lod] - po_skrtu[lod]) if skrty[lod] else None,
             "kody": [x[2] if x else None for x in b],
             "skrtnute": sorted(skrty[lod])}
            for lod, b in sorted(lode.items(), key=lambda x: podle_skrtu[x[0]])]})

    return {"slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
            "zastavky": [{"slug": z["slug"], "nazev": z["nazev"], "datum": z["datum"],
                          "poradi": z["poradi"]} for z in zastavky],
            "kategorie": kategorie}


def clanek_shrnuti(c):
    """Výpis nese perex, ne tělo — stejně jako ClanekShrnutiDto."""
    z = next((z for z in D["zavody"] if z["slug"] == c.get("zavod")), None)
    return {"slug": c["slug"], "titulek": c["titulek"], "perex": c.get("perex"),
            "autor": c.get("autor"), "publikovanoV": c["publikovanoV"],
            "zavod": z["slug"] if z else None,
            "zavodNazev": z["nazev"] if z else None,
            "obrazek": c.get("obrazek")}


def nazvy_klic(nazev):
    """Řazení jako `Jmena.Cesky` v API — pro falešné API stačí bez diakritiky."""
    return bez_diakritiky_slug(nazev)


def nazvy(hodnota):
    """Klíče lodí v odpovědi nahradí jmény, stejně jako to dělá API."""
    return LODE[hodnota]["nazev"]


# Články se řadí od nejnovějšího, stejně jako je vydává API.
# Obecné články mimo ročník — jen pro náhled webu, správa je nezná.
OBECNE_CLANKY = [{
    "slug": "vitejte-na-webu",
    "titulek": "Vítejte na novém webu Orlické série",
    "perex": "Obecný článek mimo ročník: nepatří žádné sezóně ani zastávce.",
    "telo": "Tohle je ukázka obecného článku.\n\nPíše ho editor webu a na webu zůstane i po skončení ročníku.",
    "autor": "Orlický pohár",
    "publikovanoV": "2026-09-22T10:00:00+02:00",
    "zavod": None, "zavodNazev": None, "obrazek": None,
}]


def clanky_verejne():
    """Co by na webu viděl návštěvník: jen publikované, od nejnovějšího.

    Čte se z téhož seznamu, do kterého zapisuje administrace — jinak by
    falešné API lhalo právě o tom, co se jím zkouší. Napsaný článek by se
    ve správě objevil a na veřejných stránkách ne, a vypadalo by to jako
    chyba v aplikaci.
    """
    venku = [c for c in SPRAVA_CLANKY if c["stav"] == "Publikovano"]

    # Ročník, který výsledky regat veřejně nevydává, mlčí i o nich psaným
    # slovem — zpráva ze závodu je výsledek napsaný větou. Článek celého
    # ročníku zůstává. Jako v API (ClanekEndpoints.Publikovane).
    if not D.get("vysledkyZavoduVerejne", True):
        venku = [c for c in venku if not c.get("zavod")]

    return sorted(venku, key=lambda c: c["publikovanoV"], reverse=True)


# Oprávnění žijí v paměti procesu, takže restart je vrátí do výchozího
# stavu. Je to schválně: falešné API nemá mít stav, který někdo omylem
# začne považovat za data. Přihlášený vývojář je tu správcem ročníku
# stejně jako v odpovědi na /ja.
# Publikace ročníku (23. 9. 2026). Soubor je schválně nepublikovaný, mock
# se ale tváří, že ročník venku je — jinak by neměl co servírovat.
ROCNIK_VENKU = [True]

JA = {
    "id": "01927f4e-0000-7000-8000-000000000001",
    "zobrazovane": "Filip Burda",
    "email": "filip@priklad.cz",
}
# Druhý zapisovatel u cíle. Mock zná jen jedno přihlášení, takže snímek
# „toho druhého" se nasadí do dat — bez něj by nebylo co porovnávat.
DRUHY_ZAPISOVATEL = {
    "id": "01927f4e-0000-7000-8000-000000000002",
    "zobrazovane": "Miloš Zvonař",
}
OPRAVNENI = [{"id": 1, "uzivatelId": JA["id"], "zobrazovane": JA["zobrazovane"],
              "email": JA["email"], "role": "Spravce", "zavod": None,
              "udelenoV": "2026-01-01T00:00:00+00:00"}]
# Účty, kterým jde roli udělit. Skutečné API zná jen ty, kdo se aspoň
# jednou přihlásili — bez toho by se nedal vyzkoušet stav „účet neexistuje",
# a ten je na obrazovce vidět nejčastěji.
#
# Tvar je týž jako `ucty` v přehledu oprávnění. Jana se přihlásila, ale
# nemá roli — přesně ten stav, kvůli kterému seznam vznikl.
UCTY = {u["email"]: u for u in [
    {**JA, "zalozenV": "2026-01-01T00:00:00+00:00",
     "naposledyPrihlasenV": "2026-09-15T12:30:00+00:00"},
    {"id": "01927f4e-0000-7000-8000-000000000002", "zobrazovane": "Petr Svoboda",
     "email": "petr@priklad.cz", "zalozenV": "2026-03-02T08:00:00+00:00",
     "naposledyPrihlasenV": "2026-09-10T17:05:00+00:00"},
    {"id": "01927f4e-0000-7000-8000-000000000003", "zobrazovane": "Jana Nováková",
     "email": "jana@priklad.cz", "zalozenV": "2026-09-14T19:40:00+00:00",
     "naposledyPrihlasenV": "2026-09-14T19:40:00+00:00"},
]}
JEN_ROCNIK = ("Rozhodci", "Spravce")

# Články pro administraci. Berou se z mocku a dál žijí v paměti procesu —
# restart je vrátí do výchozího stavu, což je při zkoušení obrazovek žádoucí.
# Mock nezná stavy, takže se dopočítají z příznaku publikace.
SPRAVA_CLANKY = [
    {**c, "stav": "Publikovano" if c.get("publikovano") else "Draft"}
    for c in D.get("clanky", [])
]

# Totéž pro obecné články mimo ročník. Správa je pod `/sprava/web` a chová
# se stejně; jediný rozdíl je, že článek nepatří do ročníku a nemá zastávku.
SPRAVA_OBECNE = [{**c, "stav": "Publikovano"} for c in OBECNE_CLANKY]

# Obrázky nahrané do těl článků, podle slugu. Falešné API je neukládá —
# vrací hotovou adresu, aby šlo vyzkoušet, jak se sekce chová.
OBRAZKY_V_TELE = {}


# Vzorek novinek ze svazu. Skutečné se stahují z RSS sailing.cz úlohou
# v API; tady jsou napevno, aby vývoj webu nesahal na cizí server a aby
# výpis vypadal pokaždé stejně.
PREVZATE = [
    {"titulek": "Jachtař Koláček se připravuje na Route du Rhum",
     "perex": "Milan Koláček se jako jediný Čech postaví na start letošního "
              "ročníku legendárního transatlantického závodu sólových jachtařů.",
     "publikovanoV": "2026-09-23T10:16:47+02:00",
     "odkaz": "https://www.sailing.cz/clanky/kolacek-route-du-rhum",
     "obrazek": "https://www.sailing.cz/uploads_thumbs/ikony-loga/kolacek_4.jpg"},
    {"titulek": "Filip Otta se stal vicemistrem Polska!",
     "perex": "K medailovým pozicím připsala ještě Tereza Ottová 5. místo v dívkách.",
     "publikovanoV": "2026-09-22T13:10:47+02:00",
     "odkaz": "https://www.sailing.cz/clanky/otta-vicemistr-polska",
     "obrazek": "https://www.sailing.cz/uploads_thumbs/clanky/6ab25e38b9df47139/cely_fleet.jpg"},
    {"titulek": "Mistrovství světa iQFoil, Weymouth",
     "perex": "Na start se postavili závodníci z 39 zemí a nechyběla ani česká "
              "reprezentace, kterou tvořilo celkem sedm závodníků.",
     "publikovanoV": "2026-09-18T09:00:00+02:00",
     # Bez fotky schválně: web na ni musí sáhnout do náhradní sady.
     "odkaz": "https://www.sailing.cz/clanky/ms-iqfoil-weymouth", "obrazek": None},
]
for _p in PREVZATE:
    _p.setdefault("obrazek", None)
    _p["zdroj"] = "Český svaz jachtingu"
    _p["zdrojOdkaz"] = "https://www.sailing.cz/clanky"


def bez_diakritiky_slug(text):
    """Tentýž převod jako `Psani.Slug` v API. Opsaný schválně — jinak by se
    obrazovka zkoušela proti jinému pravidlu, než jaké pak platí."""
    prevod = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return "-".join(x for x in "".join(
        z if z.isalnum() else " " for z in prevod.lower()).split())[:120]


# --- Workflow výsledků ------------------------------------------------------
# Opsané z `Features/Zavody/Workflow.cs`, ze stejného důvodu jako bodování.
RADA_VYSLEDKU = ["Navrzeno", "Overeno", "Schvaleno", "Potvrzeno"]
VSECHNY_VYSLEDKY = RADA_VYSLEDKU + ["KRevizi", "Eliminovano"]
NAZVY_VYSLEDKU = {"Navrzeno": "Navrženo", "Overeno": "Ověřeno", "Schvaleno": "Schváleno",
                  "Potvrzeno": "Potvrzeno", "KRevizi": "K revizi",
                  "Eliminovano": "Eliminováno"}


def proc_nejde_vysledek(ze, na, spravce):
    if ze == na or na == "Eliminovano":
        return None
    if na == "KRevizi":
        return ("Návrh se nemá k čemu vracet — nikdo ho ještě nekontroloval."
                if ze == "Navrzeno" else None)
    if ze in ("KRevizi", "Eliminovano"):
        return None if na == "Navrzeno" else (
            f'Odsud se vrací jako návrh, ne rovnou na \u201e{NAZVY_VYSLEDKU[na]}\u201c. '
            "Opravený zápis musí projít ověřením znovu.")

    z_i, na_i = RADA_VYSLEDKU.index(ze), RADA_VYSLEDKU.index(na)
    if na_i < z_i:
        return (f'Zpátky na \u201e{NAZVY_VYSLEDKU[na]}\u201c se nechodí. '
                "Vrať výsledky k revizi s důvodem.")
    if na_i - z_i == 1 or spravce:
        return None
    return (f'Ze stavu \u201e{NAZVY_VYSLEDKU[ze]}\u201c na \u201e{NAZVY_VYSLEDKU[na]}\u201c '
            "se přeskočit nedá. Každý stupeň je něčí podpis: "
            + " → ".join(NAZVY_VYSLEDKU[s] for s in RADA_VYSLEDKU) + ".")


def rozjizdka_radek(r):
    # Falešné API nerozlišuje rozsahy: přihlášený je správce, tedy smí i
    # přeskakovat. Rozsahy se zkoušejí v testech, tady jde o obrazovku.
    return {"cislo": r["cislo"], "startV": r.get("startV"), "stav": r["stav"],
            "doSerie": r["doSerie"], "stavVysledku": r["stavVysledku"],
            "publikovano": r["publikovano"], "duvodRevize": r.get("duvodRevize"),
            "pocetVysledku": len(r.get("vysledky", [])), "smiPublikovat": True,
            "mozneStavy": [s for s in VSECHNY_VYSLEDKY
                           if s != r["stavVysledku"]
                           and not proc_nejde_vysledek(r["stavVysledku"], s, True)],
            "smiZapisovat": r["stavVysledku"] in OTEVRENY,
            # Práva mock nerozlišuje: přihlášený je tu pořadatel i rozhodčí.
            "smiDoPoharu": True,
            "maPapir": bool(r.get("papir"))}


# --- Zápis výsledků ---------------------------------------------------------
# Opsané z `Features/Zavody/Zapis.cs`, ze stejného důvodu jako bodování.
# Přihlášky mock nečísluje, takže dostanou číslo podle pořadí v souboru.
PRIHLASKA_ID = {p["lod"]: i + 1 for i, p in enumerate(D["prihlasky"])}
LOD_PODLE_ID = {i: lod for lod, i in PRIHLASKA_ID.items()}

# Až tady, protože snímek potřebuje čísla přihlášek.
_nasad_druhy_snimek()
OTEVRENY = ("Navrzeno", "KRevizi")


AKCE_BEZ_POHARU = "Komunitní akce nemá rozjížďky, výsledky ani přihlášky lodí."


def proc_nejde_na_zavod(stav, druh="Pohar"):
    if druh == "Akce":
        return AKCE_BEZ_POHARU
    if stav in ("Vypsany", "Odjety"):
        return None
    if stav == "Zruseny":
        return "Zastávka je zrušená, výsledky nemá."
    return "Závod ještě není vypsaný. Výsledky se zapisují od vypsání."


def proc_nejde_prepsat(z, r):
    if (chyba := proc_nejde_na_zavod(z["stav"], z["druh"])):
        return chyba
    if r["stavVysledku"] in OTEVRENY:
        return None
    return (f'Výsledky jsou ve stavu „{NAZVY_VYSLEDKU[r["stavVysledku"]]}“ '
            "a dál se nepřepisují. Když je v nich chyba, musí je rozhodčí vrátit k revizi.")


def proc_nejde_ulozit(radky):
    """radky: [(lod, kategorie, poradi, kod)] — jen pro hlášky, jako v API."""
    videne = set()
    for lod, _, poradi, kod in radky:
        if lod in videne:
            return f"Loď {nazvy(lod)} je v zápisu dvakrát."
        videne.add(lod)
        if poradi is not None and poradi < 1:
            return f"{nazvy(lod)}: pořadí v cíli začíná jedničkou."
        if poradi is not None and kod:
            return f"{nazvy(lod)} má pořadí i kód. Buď dojela, nebo platí kód."

    shody = {}
    for lod, kategorie, poradi, _ in radky:
        if poradi is not None:
            shody.setdefault((kategorie, poradi), []).append(nazvy(lod))
    for (kategorie, poradi), lode in shody.items():
        if len(lode) > 1:
            return f"V kategorii {kategorie} má pořadí {poradi} víc lodí: {', '.join(lode)}."
    return None


# --- Přihlášky lodí na zastávku --------------------------------------------
# Opsané z `Features/Zavody/Prihlasky.cs`, ze stejného důvodu jako bodování.
STAVY_UCASTI = ["Prihlasena", "Potvrzena", "Zrusena", "Pozadavek", "KDoplneni",
                "Odmitnuta", "Nedostavila", "Vyloucena"]
VEREJNE_UCASTI = ("Prihlasena", "Potvrzena", "Vyloucena")
S_DUVODEM = ("KDoplneni", "Odmitnuta", "Vyloucena")


def proc_nejde_prepnout(ze, na, vysledky):
    """Pravidla pro pořadatele — falešné API přihlášeného bere jako pořadatele."""
    if ze == na:
        return None
    if na == "Pozadavek":
        return "Požadavek vzniká jen přihláškou z webu. Loď zapiš, nebo vrať k doplnění."
    if "Vyloucena" in (ze, na):
        return "O vyloučení ze závodu rozhoduje rozhodčí."
    if vysledky and na in ("Zrusena", "Odmitnuta", "KDoplneni", "Nedostavila"):
        return ("Loď už má na zastávce výsledky, takže přijela. "
                "Tenhle stav jde nastavit, až výsledky v zápisu rozjížděk smažeš.")
    return None


def proc_nejde_prihlasit(stav, druh="Pohar"):
    if druh == "Akce":
        return AKCE_BEZ_POHARU
    if stav in ("Vypsany", "Odjety"):
        return None
    if stav == "Zruseny":
        return "Zastávka je zrušená, lodě se na ni nepřihlašují."
    return "Závod ještě není vypsaný. Lodě se přihlašují od vypsání."


def ma_vysledky(z, lod):
    return any(v["lod"] == lod for r in z["rozjizdky"] for v in r["vysledky"])


def lod_na_zastavce(z, lod, smi=True):
    u = next((u for u in z["ucasti"] if u["lod"] == lod), None)
    vysledky = ma_vysledky(z, lod)
    return {"prihlaskaId": PRIHLASKA_ID[lod], "lod": nazvy(lod),
            "cisloPlachty": LODE[lod].get("cisloPlachty"), "typLodi": LODE[lod].get("typ"),
            "majitel": jmeno(LODE[lod]["majitel"]), "kategorie": KAT[lod],
            "stav": u["stav"] if u else None, "maVysledky": vysledky,
            "duvod": u.get("duvod") if u else None,
            "kapitan": (u or {}).get("kapitan"), "email": (u or {}).get("email"),
            "telefon": (u or {}).get("telefon"), "posadka": (u or {}).get("posadka"),
            "poznamka": (u or {}).get("poznamka"), "podanoV": (u or {}).get("podanoV"),
            "zaplaceno": (u or {}).get("zaplaceno", False),
            "startovnePoznamka": (u or {}).get("startovnePoznamka"),
            "historie": (u or {}).get("historie", []),
            "smiSmazat": bool(u) and smi and not vysledky
                         and u["stav"] in ("Pozadavek", "KDoplneni", "Odmitnuta"),
            "mozneStavy": [] if not u or not smi else
            [s for s in STAVY_UCASTI if s != u["stav"] and not proc_nejde_prepnout(u["stav"], s, vysledky)]}


def prihlasky_dto(z):
    chyba = proc_nejde_prihlasit(z["stav"], z["druh"])
    lode = sorted(D["prihlasky"], key=lambda p: (KAT_PORADI[p["kategorie"]], nazvy(p["lod"])))
    return {"serie": D["slug"], "serieNazev": D["nazev"], "zavod": z["slug"],
            "zavodNazev": z["nazev"], "stavZavodu": z["stav"],
            "smiSpravovat": chyba is None, "procNelze": chyba,
            "kategorie": [k["nazev"] for k in sorted(D["kategorie"], key=lambda k: k["poradi"])],
            "lode": [lod_na_zastavce(z, p["lod"], chyba is None) for p in lode]}


def zapis_dto(z, r):
    chyba = proc_nejde_prepsat(z, r)
    podle_lodi = {v["lod"]: v for v in r["vysledky"]}
    ucasti = {u["lod"]: u for u in z["ucasti"]}
    lode = sorted(D["prihlasky"], key=lambda p: (KAT_PORADI[p["kategorie"]], nazvy(p["lod"])))
    return {"serie": D["slug"], "serieNazev": D["nazev"], "zavod": z["slug"],
            "zavodNazev": z["nazev"], "stavZavodu": z["stav"], "cislo": r["cislo"],
            "stavVysledku": r["stavVysledku"], "duvodRevize": r.get("duvodRevize"),
            "smiZapisovat": chyba is None, "procNelze": chyba,
            "lode": [{"prihlaskaId": PRIHLASKA_ID[p["lod"]], "lod": nazvy(p["lod"]),
                      "cisloPlachty": LODE[p["lod"]].get("cisloPlachty"),
                      "kategorie": p["kategorie"],
                      "poradiVCili": podle_lodi.get(p["lod"], {}).get("poradiVCili"),
                      "kod": podle_lodi.get(p["lod"], {}).get("kod"),
                      "casSekundy": podle_lodi.get(p["lod"], {}).get("casSekundy"),
                      "dojezdV": podle_lodi.get(p["lod"], {}).get("dojezdV"),
                      "naRegate": ucasti.get(p["lod"], {}).get("stav") in VEREJNE_UCASTI,
                      "poznavaciZnak": ucasti.get(p["lod"], {}).get("poznavaciZnak")}
                     for p in lode],
            "startV": r.get("startV"), "doSerie": r.get("doSerie", True),
            "papir": {k: v for k, v in r["papir"].items() if k != "id"} if r.get("papir") else None,
            "smiPapir": True, "pocetNavrhu": len(r.get("navrhy", []))}


def cas_od_startu(start, dojezd):
    """Naměřený čas v sekundách jako `Zapis.NamerenyCas`: bez startu nebo
    se záporným rozdílem žádný."""
    if not start or not dojezd:
        return None
    from datetime import datetime
    rozdil = (datetime.fromisoformat(dojezd.replace("Z", "+00:00"))
              - datetime.fromisoformat(start.replace("Z", "+00:00"))).total_seconds()
    return int(rozdil) if rozdil >= 0 else None


# --- Kalendář ---------------------------------------------------------------
# Pravidla přechodů jsou **opsaná** z `Features/Zavody/Kalendar.cs`, ze
# stejného důvodu jako bodování: aby šla obrazovka zkoušet na stroji, kde
# databáze nejede. Pravda o nich leží tam a hlídají ji testy.
RADA = ["Planovany", "Potvrzeny", "Vypsany", "Odjety"]
# Pořadí, ve kterém stavy vydává API — podle čísel výčtu, ne podle řady v čase.
VSECHNY_STAVY = ["Planovany", "Vypsany", "Odjety", "Zruseny", "Potvrzeny"]
NAZVY_STAVU = {"Planovany": "Plánovaný", "Potvrzeny": "Potvrzený", "Vypsany": "Vypsaný",
               "Odjety": "Odjetý", "Zruseny": "Zrušený"}


def proc_nejde(ze, na):
    """Proč zastávku takhle posunout nejde, nebo None."""
    if ze == na:
        return None
    if na == "Zruseny":
        return ("Odjetý závod zrušit nejde — jsou v něm výsledky, "
                "které se počítají do poháru.") if ze == "Odjety" else None
    if ze == "Zruseny":
        return None if na == "Planovany" else (
            "Zrušená zastávka se vrací jako plánovaná. Termín pak znovu potvrď.")
    if abs(RADA.index(ze) - RADA.index(na)) == 1:
        return None
    return (f'Ze stavu \u201e{NAZVY_STAVU[ze]}\u201c se na \u201e{NAZVY_STAVU[na]}\u201c neskáče. '
            "Jde to jen po jednom kroku: " + " → ".join(NAZVY_STAVU[s] for s in RADA) + ".")


def prerad_kalendar():
    """Kalendář se řadí časem — stejně jako `Kalendar.Preradit`."""
    # Každý druh zvlášť, jako v API: akce nesmí posunout číslo kola.
    for druh in {z["druh"] for z in D["zavody"]}:
        stejne = [z for z in D["zavody"] if z["druh"] == druh]
        for i, z in enumerate(sorted(stejne, key=lambda z: (z["datum"], z["poradi"]))):
            z["poradi"] = i + 1


def zastavka_radek(z):
    # Falešné API nerozlišuje rozsahy: kdo je přihlášený, smí všechno.
    # Rozsahy se zkoušejí v testech, tady jde o obrazovku.
    return {**{k: z.get(k) for k in
               ("slug", "nazev", "datum", "datumKonce", "typ", "poradatel", "poradi",
                "stav", "puvodniDatum", "publikovano")},
            "smiUpravit": True, "smiPublikovat": True, "druh": z["druh"],
            "poradatelSlug": poradatel_zastavky(z)["slug"] if poradatel_zastavky(z) else None,
            "smiMedailonek": bool(poradatel_zastavky(z)),
            "vyhodnoceni": z.get("vyhodnoceni", "PoKategoriich"),
            "mozneStavy": [s for s in VSECHNY_STAVY
                           if s != z["stav"] and not proc_nejde(z["stav"], s)]}


# Pořadatelé jako záznam — v API `Features/Poradatele`. Páruje se podle
# slugu jména, stejně jako `PoradateleSprava.PriradAsync`. Medailonek
# Yacht Clubu Písek je vyplněný ukázkovými kontakty (example.cz, nuly),
# aby šla vidět celá karta; skutečný je jen web.
PORADATELE = {}

# Nahrané fotky v paměti. Skutečné API je přepočítá do WebP a uloží do R2;
# tady se vrací, jak přišly — jde o obrazovky, ne o zpracování obrázku.
FOTKY = {}


def poradatel_zastavky(z):
    """Záznam pořadatele zastávky, případně ho založí z textu."""
    slug = bez_diakritiky_slug(z.get("poradatel") or "")[:80].rstrip("-")
    if not slug:
        return None
    if slug not in PORADATELE:
        PORADATELE[slug] = {"slug": slug, "nazev": z["poradatel"], "web": None, "popis": None,
                            "email": None, "telefon": None, "kontaktniOsoba": None,
                            "adresa": None, "sirka": None, "delka": None, "obrazek": None}
    z["poradatel"] = PORADATELE[slug]["nazev"]
    return PORADATELE[slug]


PORADATELE["yacht-club-pisek"] = {
    "slug": "yacht-club-pisek", "nazev": "Yacht Club Písek",
    "web": "https://yachtclubpisek.cz/",
    "popis": "Ukázkový popis pro falešné API.\n\nDruhý odstavec, ať je vidět, jak se text láme.",
    "email": "info@example.cz", "telefon": "+420 000 000 000",
    "kontaktniOsoba": "Ukázková Osoba", "adresa": "Ukázková adresa přístavu",
    "sirka": 49.5086, "delka": 14.1735}


def proc_nejde_medailonek(v):
    """Opis `Medailonek.ProcNejdeUlozit` a `NormalizujWeb`. Vrací (web, chyba)."""
    nazev = (v.get("nazev") or "").strip()
    if not nazev:
        return None, "Pořadatel musí mít název."
    web = (v.get("web") or "").strip() or None
    if web:
        if ":" in web and "://" not in web:
            return None, "Web musí být adresa stránky, třeba https://yachtclubpisek.cz."
        if "://" not in web:
            web = "https://" + web
        if not re.match(r"^https?://[^\s/]+\.[^\s/]+", web):
            return None, "Web musí být adresa stránky, třeba https://yachtclubpisek.cz."
    email = (v.get("email") or "").strip()
    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s.]+$", email):
        return None, "E-mail nevypadá jako e-mailová adresa."
    telefon = (v.get("telefon") or "").strip()
    if telefon and (not re.match(r"^[0-9 +()/-]+$", telefon)
                    or not 9 <= sum(c.isdigit() for c in telefon) <= 15):
        return None, "Telefon může obsahovat číslice, mezery a „+“ a musí mít aspoň devět číslic."
    s, d = v.get("sirka"), v.get("delka")
    if (s is None) != (d is None):
        return None, "Souřadnice musí mít obě čísla, šířku i délku."
    if s is not None and not -90 <= s <= 90:
        return None, "Zeměpisná šířka musí být mezi −90 a 90."
    if d is not None and not -180 <= d <= 180:
        return None, "Zeměpisná délka musí být mezi −180 a 180."
    return web, None


def poradatel_sprava(p):
    return {"serie": D["slug"], "serieNazev": D["nazev"], "poradatel": p, "smiUpravit": True,
            "zastavky": [{"slug": z["slug"], "nazev": z["nazev"], "datum": z["datum"],
                          "druh": z["druh"]}
                         for z in sorted(D["zavody"], key=lambda z: z["datum"])
                         if poradatel_zastavky(z) is p],
            "zastavekJinde": 0}


def zastavka_ze_vstupu(vstup):
    """Společná kontrola založení i úpravy. Vrací (hodnoty, chyba)."""
    nazev = (vstup.get("nazev") or "").strip()
    datum, konec = vstup.get("datum"), vstup.get("datumKonce") or None

    if not nazev:
        return None, "Zastávka musí mít název."
    if not bez_diakritiky_slug(nazev):
        return None, ("Z názvu nejde udělat adresa. "
                      "Napiš do něj aspoň jedno písmeno nebo číslici.")
    if not datum:
        return None, "Zastávka musí mít termín."
    if konec and konec < datum:
        return None, "Konec závodu je dřív než jeho začátek."

    vyhodnoceni = vstup.get("vyhodnoceni") or "PoKategoriich"
    if vyhodnoceni not in ("PoKategoriich", "CelePole", "Oboje"):
        return None, f"Neznámé vyhodnocení {vyhodnoceni}."

    return {"nazev": nazev, "datum": datum, "datumKonce": konec,
            "typ": (vstup.get("typ") or "").strip() or None,
            "vyhodnoceni": vyhodnoceni,
            "poradatel": (vstup.get("poradatel") or "").strip() or None}, None


def clanek_radek(c):
    z = next((z for z in D["zavody"] if z["slug"] == c.get("zavod")), None)
    return {"slug": c["slug"], "titulek": c["titulek"], "perex": c.get("perex"),
            "autor": c.get("autor"), "publikovanoV": c["publikovanoV"],
            "stav": c["stav"],
            "zavod": z["slug"] if z else None, "zavodNazev": z["nazev"] if z else None,
            "obrazek": c.get("obrazek")}


class H(BaseHTTPRequestHandler):
    def telo_zadosti(self):
        delka = int(self.headers.get("Content-Length", "0") or 0)
        return json.loads(self.rfile.read(delka) or b"{}")

    def chyba(self, kod, text):
        """Chyba ve tvaru, ve kterém ji vydává API: {"error": "..."}."""
        data = json.dumps({"error": text}, ensure_ascii=False).encode()
        self.send_response(kod)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_PUT(self):
        cesta = urlparse(self.path).path

        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)'
                          r'/lode/(\d+)/znak$', cesta)):
            return self.znak(m.group(1), int(m.group(2)))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)'
                          r'/rozjizdky/(\d+)/papir$', cesta)):
            return self.nahraj_papir(m.group(1), int(m.group(2)))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)'
                          r'/rozjizdky/(\d+)/vysledky$', cesta)):
            return self.uloz_zapis(m.group(1), int(m.group(2)))

        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)$', cesta)):
            return self.uprav_zastavku(m.group(1))

        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/(clanky|poradatele)/([a-z0-9-]+)/obrazek$', cesta)):
            return self.nahraj_obrazek(m.group(1), m.group(2))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/poradatele/([a-z0-9-]+)$', cesta)):
            return self.uloz_poradatele(m.group(1))
        if (m := re.match(r'^/sprava/web/clanky/([a-z0-9-]+)$', cesta)):
            return self.uloz_clanek(m.group(1), SPRAVA_OBECNE)

        m = re.match(rf'^/sprava/serie/{D["slug"]}/clanky/([a-z0-9-]+)$', cesta)
        if not m:
            return self.send_error(404)
        return self.uloz_clanek(m.group(1), SPRAVA_CLANKY)

    def uloz_clanek(self, slug, seznam):
        if not self.headers.get("authorization"):
            return self.send_error(401)

        c = next((c for c in seznam if c["slug"] == slug), None)
        if not c:
            return self.send_error(404)

        vstup = self.telo_zadosti()
        if not (vstup.get("titulek") or "").strip():
            return self.chyba(400, "Článek musí mít titulek.")
        if not (vstup.get("telo") or "").strip():
            return self.chyba(400, "Článek musí mít text.")

        # Slug se schválně nemění — adresa už mohla někam odejít.
        c.update({k: vstup.get(k) for k in ("titulek", "telo", "perex", "autor", "zavod")})
        # **Falešné API vložený text nečistí**, jen si formát pamatuje —
        # čistička je v `Features/Clanky/Bloky.cs` a opisovat parser HTML do
        # Pythonu by znamenalo mít dvě různá pravidla. Formulář se tu tedy
        # dá vyzkoušet, ale jak bude článek nakonec vypadat, se pozná až
        # proti skutečnému API. Web tělo ve formátu `Html` vypíše jako text,
        # takže se tu nic nerozbije.
        c["format"] = vstup.get("format") or "Text"
        return self.odpoved(clanek_radek(c))

    def verejna_prihlaska(self, zavod):
        """Veřejný formulář: vzniká požadavek, na webu loď zatím není.

        Bez přihlášení — `self.zastavka` by ho vyžadovala."""
        z = next((z for z in D["zavody"] if z["slug"] == zavod), None)
        if not z:
            return self.send_error(404)
        if (chyba := proc_nejde_prihlasit(z["stav"], z["druh"])):
            return self.chyba(400, chyba)

        v = self.telo_zadosti()
        kapitan = v.get("kapitan") or {}
        if (v.get("past") or "").strip():
            return self.chyba(400, "Přihlášku se nepodařilo přijmout. Zkus to prosím znovu.")
        if not (v.get("lod") or "").strip():
            return self.chyba(400, "Napiš jméno lodi.")
        if not (kapitan.get("jmeno") or "").strip() or not (kapitan.get("prijmeni") or "").strip():
            return self.chyba(400, "Vyplň jméno i příjmení kapitána.")
        if not (kapitan.get("email") or "").strip() and not (kapitan.get("telefon") or "").strip():
            return self.chyba(400, "Vyplň e-mail nebo telefon, ať se ti pořadatel může ozvat.")
        if not v.get("souhlas"):
            return self.chyba(400, "Potvrď, že loď smí být ve startovní listině "
                                   "a že se pořadatel může ozvat.")

        nazev = v["lod"].strip()
        klic = bez_diakritiky_slug(nazev)
        if klic not in LODE:
            LODE[klic] = {"klic": klic, "nazev": nazev, "cisloPlachty": v.get("cisloPlachty"),
                          "typ": v.get("typ"), "majitel": next(iter(OSOBY))}
            KAT[klic] = (v.get("kategorie") or D["kategorie"][0]["nazev"])
            KAT_PORADI.setdefault(KAT[klic], 99)
            D["prihlasky"].append({"lod": klic, "kategorie": KAT[klic]})
            PRIHLASKA_ID[klic] = max(PRIHLASKA_ID.values()) + 1
            LOD_PODLE_ID[PRIHLASKA_ID[klic]] = klic

        u = next((u for u in z["ucasti"] if u["lod"] == klic), None)
        if u and u["stav"] in VEREJNE_UCASTI:
            return self.chyba(400, f"Loď {nazev} už je na zastávku přihlášená. "
                                   "Se změnou se ozvi pořadateli.")
        from datetime import datetime, timezone
        ted = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        if not u:
            u = {"lod": klic, "kormidelnik": None}
            z["ucasti"].append(u)
        u.update({"stav": "Pozadavek", "duvod": None, "posadka": v.get("posadka"),
                  "kapitan": f'{kapitan["jmeno"].strip()} {kapitan["prijmeni"].strip()}',
                  "email": kapitan.get("email"), "telefon": kapitan.get("telefon"),
                  "poznamka": v.get("poznamka"), "podanoV": ted})
        u.setdefault("historie", []).append(
            {"ze": None, "na": "Pozadavek", "kdy": ted, "kdo": None, "duvod": None})

        return self.odpoved({"zavod": z["nazev"], "lod": nazev, "stav": "Pozadavek"}, 201)

    def do_POST(self):
        cesta = urlparse(self.path).path

        if cesta == f'/sprava/serie/{D["slug"]}/publikace':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            ROCNIK_VENKU[0] = bool(self.telo_zadosti().get("publikovano"))
            return self.odpoved({"slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
                                 "publikovano": ROCNIK_VENKU[0], "smiPublikovat": True})
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)'
                          r'/rozjizdky/(\d+)/(stav|publikace|pohar)$', cesta)):
            return self.workflow(m.group(1), int(m.group(2)), m.group(3))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)/rozjizdky$', cesta)):
            return self.pridej_rozjizdku(m.group(1))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)'
                          r'/rozjizdky/(\d+)/start$', cesta)):
            return self.odstartuj(m.group(1), int(m.group(2)))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)'
                          r'/rozjizdky/(\d+)/navrhy/([0-9a-f-]+)/pouzit$', cesta)):
            return self.pouzij_navrh(m.group(1), int(m.group(2)), m.group(3))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/lode$', cesta)):
            return self.prihlas_lod(m.group(1))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/lode/(\d+)/stav$', cesta)):
            return self.prepni_lod(m.group(1), int(m.group(2)))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/lode/(\d+)/startovne$', cesta)):
            z = self.zastavka(m.group(1))
            if not z:
                return None
            lod = LOD_PODLE_ID.get(int(m.group(2)))
            u = next((u for u in z["ucasti"] if u["lod"] == lod), None)
            if not u:
                return self.send_error(404)
            v = self.telo_zadosti()
            u["zaplaceno"], u["startovnePoznamka"] = bool(v.get("zaplaceno")), v.get("poznamka")
            return self.odpoved(lod_na_zastavce(z, lod))

        if cesta == f'/sprava/serie/{D["slug"]}/zastavky':
            return self.zaloz_zastavku()
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/stav$', cesta)):
            return self.prepni_stav_zastavky(m.group(1))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/publikace$', cesta)):
            return self.publikuj_zastavku(m.group(1))

        if cesta == f'/sprava/serie/{D["slug"]}/clanky':
            return self.zaloz_clanek()
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/clanky/([a-z0-9-]+)/stav$', cesta)):
            return self.prepni_stav(m.group(1))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/clanky/([a-z0-9-]+)/obrazky$', cesta)):
            return self.nahraj_do_tela(m.group(1))

        # Obecné články mimo ročník. Chovají se stejně, jen nepatří do
        # ročníku a nemají zastávku.
        if cesta == '/sprava/web/clanky':
            return self.zaloz_clanek(SPRAVA_OBECNE)
        if (m := re.match(r'^/sprava/web/clanky/([a-z0-9-]+)/stav$', cesta)):
            return self.prepni_stav(m.group(1), SPRAVA_OBECNE)
        if (m := re.match(r'^/sprava/web/clanky/([a-z0-9-]+)/obrazky$', cesta)):
            return self.nahraj_do_tela(m.group(1))

        if (m := re.match(rf'^/serie/{D["slug"]}/zavody/([a-z0-9-]+)/prihlasky$', cesta)):
            return self.verejna_prihlaska(m.group(1))

        if cesta != f'/sprava/serie/{D["slug"]}/opravneni':
            return self.send_error(404)
        if not self.headers.get("authorization"):
            return self.send_error(401)

        vstup = self.telo_zadosti()
        email = (vstup.get("email") or "").strip().lower()
        role, zavod = vstup.get("role"), vstup.get("zavod")

        if role == "Ctenar":
            return self.chyba(400, "Čtenář se neuděluje: je to každý, i nepřihlášený.")
        if role in JEN_ROCNIK and zavod:
            return self.chyba(400, f"Role {role} platí pro celý ročník, ne pro jednu zastávku.")
        if email not in UCTY:
            return self.chyba(404, f"Na e-mail {email} se zatím nikdo nepřihlásil. "
                                   "Účet vzniká až prvním přihlášením, rolí se pozvat nedá.")

        stavajici = next((o for o in OPRAVNENI if o["email"] == email
                          and o["role"] == role and o["zavod"] == zavod), None)
        if stavajici:
            return self.odpoved(stavajici)

        novy = {"id": max((o["id"] for o in OPRAVNENI), default=0) + 1,
                "uzivatelId": UCTY[email]["id"], "zobrazovane": UCTY[email]["zobrazovane"],
                "email": email,
                "role": role, "zavod": zavod, "udelenoV": "2026-01-01T00:00:00+00:00"}
        OPRAVNENI.append(novy)
        return self.odpoved(novy, 201)

    def zastavka(self, slug):
        """Zastávka, nebo None. Hlídá i přihlášení — jako skutečné API."""
        if not self.headers.get("authorization"):
            self.send_error(401)
            return None

        z = next((z for z in D["zavody"] if z["slug"] == slug), None)
        if not z:
            self.send_error(404)
        return z

    def workflow(self, zavod, cislo, co):
        if not self.headers.get("authorization"):
            return self.send_error(401)

        z = next((z for z in D["zavody"] if z["slug"] == zavod), None)
        r = next((r for r in z["rozjizdky"] if r["cislo"] == cislo), None) if z else None
        if not r:
            return self.send_error(404)

        vstup = self.telo_zadosti()

        if co == "publikace":
            r["publikovano"] = bool(vstup.get("publikovano"))
            return self.odpoved(rozjizdka_radek(r))

        if co == "pohar":
            # Práva mock nerozlišuje; hranici „kdo smí" hlídají testy API.
            r["doSerie"] = bool(vstup.get("doSerie"))
            return self.odpoved(rozjizdka_radek(r))

        na, duvod = vstup.get("stav"), (vstup.get("duvod") or "").strip()
        if (chyba := proc_nejde_vysledek(r["stavVysledku"], na, True)):
            return self.chyba(400, chyba)
        if na == "KRevizi" and not duvod:
            return self.chyba(400, "Napiš, co je špatně. Bez důvodu začne ten, "
                                   "kdo to má opravit, hledáním.")

        if na == "KRevizi":
            r["duvodRevize"] = duvod
        r["stavVysledku"] = na
        return self.odpoved(rozjizdka_radek(r))

    def rozjizdka(self, zavod, cislo):
        """(zastávka, rozjížďka), nebo (None, None) s už odeslanou chybou."""
        if not self.headers.get("authorization"):
            self.send_error(401)
            return None, None
        z = next((z for z in D["zavody"] if z["slug"] == zavod), None)
        r = next((r for r in z["rozjizdky"] if r["cislo"] == cislo), None) if z else None
        if not r:
            self.send_error(404)
            return None, None
        return z, r

    def uloz_zapis(self, zavod, cislo):
        z, r = self.rozjizdka(zavod, cislo)
        if not r:
            return None
        if (chyba := proc_nejde_prepsat(z, r)):
            return self.chyba(400, chyba)

        radky = []
        for radek in self.telo_zadosti().get("radky") or []:
            lod = LOD_PODLE_ID.get(radek.get("prihlaskaId"))
            if not lod:
                return self.chyba(400, f'Přihláška {radek.get("prihlaskaId")} do ročníku nepatří.')
            radky.append((lod, KAT[lod], radek.get("poradiVCili"), radek.get("kod"), radek.get("dojezdV")))
        if (chyba := proc_nejde_ulozit([r[:4] for r in radky])):
            return self.chyba(400, chyba)

        # Celá sada najednou, jako v API: co v zápisu není, výsledek nemá.
        # Čas u lodi, která výsledek už měla, zůstává — formulář ho nemění.
        # Cílová obrazovka posílá dojezd a ten se uloží i s časem od startu.
        puvodni = {v["lod"]: v for v in r["vysledky"]}
        r["vysledky"] = [{**puvodni.get(lod, {}), "lod": lod, "poradiVCili": poradi, "kod": kod,
                          **({"dojezdV": dojezd, "casSekundy": cas_od_startu(r.get("startV"), dojezd)}
                             if dojezd else {})}
                         for lod, _, poradi, kod, dojezd in radky if poradi is not None or kod]
        # Loď s výsledkem přijela, jako v API; vyloučená zůstává vyloučená.
        self.uloz_snimek(r, JA, [
            {"prihlaskaId": PRIHLASKA_ID[lod], "poradiVCili": poradi, "kod": kod}
            for lod, _, poradi, kod, _ in radky if poradi is not None or kod])

        for lod in (v["lod"] for v in r["vysledky"]):
            u = next((u for u in z["ucasti"] if u["lod"] == lod), None)
            if not u:
                z["ucasti"].append({"lod": lod, "kormidelnik": None, "posadka": None, "stav": "Potvrzena"})
            elif u["stav"] != "Vyloucena":
                u["stav"] = "Potvrzena"
        return self.odpoved(zapis_dto(z, r))

    def prihlas_lod(self, zavod):
        z = self.zastavka(zavod)
        if not z:
            return None
        if (chyba := proc_nejde_prihlasit(z["stav"], z["druh"])):
            return self.chyba(400, chyba)

        vstup = self.telo_zadosti()
        if bool(vstup.get("prihlaskaId")) == bool(vstup.get("novaLod")):
            return self.chyba(400, "Přihlas buď loď z ročníku, nebo novou loď — jedno z toho.")

        if (pid := vstup.get("prihlaskaId")):
            lod = LOD_PODLE_ID.get(pid)
            if not lod:
                return self.chyba(400, f"Přihláška {pid} do ročníku nepatří.")
        else:
            n = vstup["novaLod"]
            nazev = (n.get("nazev") or "").strip()
            kategorie = (n.get("kategorie") or "").strip()
            if not nazev:
                return self.chyba(400, "Loď musí mít název.")
            if not kategorie:
                return self.chyba(400, "Vyber kategorii, ve které loď pojede.")
            if not (n.get("majitelJmeno") or "").strip() or not (n.get("majitelPrijmeni") or "").strip():
                return self.chyba(400, "Vyplň jméno i příjmení majitele. Ve výsledcích stojí vedle lodi.")
            if kategorie not in KAT_PORADI:
                return self.chyba(400, f"Kategorie {kategorie} v ročníku není.")

            lod = next((k for k, l in LODE.items() if l["nazev"] == nazev), None)
            if lod and lod in KAT and KAT[lod] != kategorie:
                return self.chyba(400, f"Loď {nazev} už v ročníku je, a to v kategorii {KAT[lod]}. "
                                       "Přihlas ji ze seznamu lodí ročníku.")
            if not lod:
                # Nová loď i s majitelem, jako v API. Klíče jsou jen pro mock.
                lod = f"nova-{len(LODE) + 1}"
                osoba = f"osoba-nova-{len(OSOBY) + 1}"
                OSOBY[osoba] = {"klic": osoba, "jmeno": n["majitelJmeno"].strip(),
                                "prijmeni": n["majitelPrijmeni"].strip()}
                LODE[lod] = {"klic": lod, "nazev": nazev, "majitel": osoba,
                             "cisloPlachty": (n.get("cisloPlachty") or "").strip() or None,
                             "typ": (n.get("typ") or "").strip() or None}
            if lod not in KAT:
                D["prihlasky"].append({"lod": lod, "kategorie": kategorie})
                KAT[lod] = kategorie
                PRIHLASKA_ID[lod] = max(PRIHLASKA_ID.values()) + 1
                LOD_PODLE_ID[PRIHLASKA_ID[lod]] = lod

        u = next((u for u in z["ucasti"] if u["lod"] == lod), None)
        if u and u["stav"] in VEREJNE_UCASTI:
            return self.odpoved(lod_na_zastavce(z, lod))
        if u:
            u["stav"], u["duvod"] = "Prihlasena", None
        else:
            z["ucasti"].append({"lod": lod, "kormidelnik": None, "posadka": None, "stav": "Prihlasena"})
        return self.odpoved(lod_na_zastavce(z, lod), 201)

    def prepni_lod(self, zavod, prihlaska):
        z = self.zastavka(zavod)
        if not z:
            return None
        if (chyba := proc_nejde_prihlasit(z["stav"], z["druh"])):
            return self.chyba(400, chyba)

        lod = LOD_PODLE_ID.get(prihlaska)
        u = next((u for u in z["ucasti"] if u["lod"] == lod), None) if lod else None
        if not u:
            return self.send_error(404)

        telo = self.telo_zadosti()
        na, duvod = telo.get("stav"), (telo.get("duvod") or "").strip()
        if (chyba := proc_nejde_prepnout(u["stav"], na, ma_vysledky(z, lod))):
            return self.chyba(400, chyba)
        if na in S_DUVODEM and not duvod:
            return self.chyba(400, "Napiš důvod.")
        from datetime import datetime, timezone
        u.setdefault("historie", []).append(
            {"ze": u["stav"], "na": na, "kdo": JA["zobrazovane"], "duvod": duvod or None,
             "kdy": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")})
        u["stav"], u["duvod"] = na, duvod or None
        return self.odpoved(lod_na_zastavce(z, lod))

    def znak(self, zavod, prihlaska):
        """Poznávací znak lodi na regatě, jako `ZapisSprava.ZnakAsync`."""
        z = self.zastavka(zavod)
        if not z:
            return None
        lod = LOD_PODLE_ID.get(prihlaska)
        u = next((u for u in z["ucasti"] if u["lod"] == lod), None) if lod else None
        if not u or u["stav"] not in VEREJNE_UCASTI:
            return self.chyba(400, "Loď na regatu přihlášená není. Přihlas ji, nebo jí rovnou zapiš dojezd.")
        znak = (self.telo_zadosti().get("znak") or "").strip()
        if len(znak) > 60:
            return self.chyba(400, "Poznávací znak má nejvýš 60 znaků, ať se vejde na tlačítko.")
        u["poznavaciZnak"] = znak or None
        self.send_response(204)
        self.end_headers()
        return None

    def uloz_snimek(self, r, kdo, radky):
        """Snímek zápisu jednoho zapisovatele, jako `ZapisSprava.SnimekAsync`."""
        from datetime import datetime, timezone
        navrhy = r.setdefault("navrhy", [])
        navrh = next((n for n in navrhy if n["uzivatelId"] == kdo["id"]), None)
        if not navrh:
            navrh = {"uzivatelId": kdo["id"], "kdo": kdo["zobrazovane"]}
            navrhy.append(navrh)
        navrh["zapsanoV"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        navrh["radky"] = radky

    def navrhy(self, zavod, cislo):
        z, r = self.rozjizdka(zavod, cislo)
        if not r:
            return None
        return self.odpoved({
            "zavod": z["slug"], "zavodNazev": z["nazev"], "cislo": r["cislo"],
            "navrhy": [{
                "uzivatelId": n["uzivatelId"], "kdo": n["kdo"], "zapsanoV": n["zapsanoV"],
                "muj": n["uzivatelId"] == JA["id"],
                "radky": [{**radek,
                           "lod": nazvy(LOD_PODLE_ID[radek["prihlaskaId"]]),
                           "kategorie": KAT[LOD_PODLE_ID[radek["prihlaskaId"]]]}
                          for radek in sorted(n["radky"],
                                              key=lambda x: x.get("poradiVCili") or 10 ** 6)],
            } for n in sorted(r.get("navrhy", []), key=lambda n: n["zapsanoV"], reverse=True)]})

    def pouzij_navrh(self, zavod, cislo, autor):
        z, r = self.rozjizdka(zavod, cislo)
        if not r:
            return None
        navrh = next((n for n in r.get("navrhy", []) if n["uzivatelId"] == autor), None)
        if not navrh:
            return self.send_error(404)
        if (chyba := proc_nejde_prepsat(z, r)):
            return self.chyba(400, chyba)

        puvodni = {v["lod"]: v for v in r["vysledky"]}
        r["vysledky"] = [{**puvodni.get(LOD_PODLE_ID[x["prihlaskaId"]], {}),
                          "lod": LOD_PODLE_ID[x["prihlaskaId"]],
                          "poradiVCili": x.get("poradiVCili"), "kod": x.get("kod")}
                         for x in navrh["radky"]]
        self.uloz_snimek(r, JA, navrh["radky"])
        return self.odpoved(zapis_dto(z, r))

    def odstartuj(self, zavod, cislo):
        z, r = self.rozjizdka(zavod, cislo)
        if not r:
            return None
        if (chyba := proc_nejde_prepsat(z, r)):
            return self.chyba(400, chyba)

        from datetime import datetime, timezone
        r["startV"] = self.telo_zadosti().get("startV") or \
            datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        if r.get("stav") == "Planovana":
            r["stav"] = "Probiha"
        # Časy dojetých se přepočítají k novému startu, jako v API.
        for v in r["vysledky"]:
            if v.get("dojezdV"):
                v["casSekundy"] = cas_od_startu(r["startV"], v["dojezdV"])
        return self.odpoved(zapis_dto(z, r))

    def pridej_rozjizdku(self, zavod):
        z = self.zastavka(zavod)
        if not z:
            return None
        if (chyba := proc_nejde_na_zavod(z["stav"], z["druh"])):
            return self.chyba(400, chyba)

        # Nová rozjížďka je návrh a venku není — stejně jako v API.
        nova = {"cislo": max((r["cislo"] for r in z["rozjizdky"]), default=0) + 1,
                "startV": None, "stav": "Planovana",
                "doSerie": self.telo_zadosti().get("doSerie", True) is not False,
                "stavVysledku": "Navrzeno", "publikovano": False, "vysledky": []}
        z["rozjizdky"].append(nova)
        return self.odpoved(rozjizdka_radek(nova), 201)

    def vlastnik_obrazku(self, druh, klic):
        if druh == "clanky":
            return next((c for c in SPRAVA_CLANKY if c["slug"] == klic), None)
        return PORADATELE.get(klic)

    def nahrana_fotka(self):
        """Pole formuláře a data souboru, nebo (None, None) s odeslanou chybou.

        Společné pro obrázek článku i pro fotku papírového zápisu; kontroly
        souboru jsou tytéž jako `Nahravani.ProcNejde` v API."""
        delka = int(self.headers.get("Content-Length", "0") or 0)
        zprava = BytesParser(policy=HTTP).parsebytes(
            b"Content-Type: " + self.headers["Content-Type"].encode() + b"\r\n\r\n"
            + self.rfile.read(delka))
        pole = {c.get_param("name", header="content-disposition"): c for c in zprava.iter_parts()}

        soubor = pole.get("soubor")
        data = soubor.get_payload(decode=True) if soubor else b""
        if not data:
            self.chyba(400, "Vyber soubor s fotkou.")
            return None, None
        if len(data) > 15 * 1024 * 1024:
            self.chyba(400, "Fotka může mít nejvýš 15 MB.")
            return None, None
        if soubor.get_content_type() not in ("image/jpeg", "image/png", "image/webp"):
            self.chyba(400, "Soubor se nedá přečíst jako fotka. Nahraj JPEG, PNG nebo WebP.")
            return None, None

        return pole, (data, soubor.get_content_type())

    def uloz_fotku(self, vlastnik, klic, data, typ, autor, popis):
        """Uloží fotku vlastníkovi a starou zahodí i ze „soubory"."""
        if vlastnik.get(klic):
            FOTKY.pop(vlastnik[klic]["id"], None)
        id = uuid.uuid4().hex
        FOTKY[id] = (data, typ)
        adresa = f"http://127.0.0.1:{PORT}/fake-foto/{id}"
        vlastnik[klic] = {"id": id, "nahled": adresa, "velky": adresa, "sirka": 1600,
                          "vyska": 1067, "autor": autor, "popis": popis}
        return {k: v for k, v in vlastnik[klic].items() if k != "id"}

    def nahraj_papir(self, zavod, cislo):
        """Fotka papírového zápisu. Autora doplní API, souhlas se neptá."""
        z, r = self.rozjizdka(zavod, cislo)
        if not r:
            return None

        pole, fotka = self.nahrana_fotka()
        if not fotka:
            return None

        return self.odpoved(self.uloz_fotku(
            r, "papir", *fotka, JA["zobrazovane"], f"Papírový zápis {cislo}. rozjížďky"))

    def nahraj_obrazek(self, druh, klic):
        """Stejné kontroly jako `Nahravani.ProcNejde` v API."""
        if not self.headers.get("authorization"):
            return self.send_error(401)
        vlastnik = self.vlastnik_obrazku(druh, klic)
        if not vlastnik:
            return self.send_error(404)

        pole, fotka = self.nahrana_fotka()
        if not fotka:
            return None

        # Části bez charsetu by e-mailový parser četl jako ASCII; formulář je UTF-8.
        text = lambda k: (pole[k].get_payload(decode=True).decode("utf-8").strip() if k in pole else "")
        if not text("autor"):
            return self.chyba(400, "Napiš, kdo fotku fotil. Na webu se pod ní ukáže.")
        if text("souhlas") != "true":
            return self.chyba(400, "Potvrď, že autor souhlasí se zveřejněním fotky na webu.")

        if vlastnik.get("obrazek"):
            FOTKY.pop(vlastnik["obrazek"]["id"], None)
        id = uuid.uuid4().hex
        FOTKY[id] = (data, soubor.get_content_type())
        adresa = f"http://127.0.0.1:{PORT}/fake-foto/{id}"
        vlastnik["obrazek"] = {"id": id, "nahled": adresa, "velky": adresa, "sirka": 1600,
                               "vyska": 1067, "autor": text("autor"),
                               "popis": text("popis") or None}
        return self.odpoved({k: v for k, v in vlastnik["obrazek"].items() if k != "id"})

    def nahraj_do_tela(self, slug):
        """Obrázek do těla článku. Na rozdíl od hlavního nic nenahrazuje —
        v textu jich může být víc, takže se jen přidá do seznamu."""
        if not self.headers.get("authorization"):
            return self.send_error(401)

        pole, fotka = self.nahrana_fotka()
        if not fotka:
            return None

        text = lambda k: (pole[k].get_payload(decode=True).decode("utf-8").strip() if k in pole else "")
        if not text("autor"):
            return self.chyba(400, "Napiš, kdo fotku fotil. Na webu se pod ní ukáže.")
        if text("souhlas") != "true":
            return self.chyba(400, "Potvrď, že autor souhlasí se zveřejněním fotky na webu.")

        data, typ = fotka
        id = uuid.uuid4().hex
        FOTKY[id] = (data, typ)
        adresa = f"http://127.0.0.1:{PORT}/fake-foto/{id}"
        obrazek = {"nahled": adresa, "velky": adresa, "sirka": 1600, "vyska": 1067,
                   "autor": text("autor"), "popis": text("popis") or None}
        OBRAZKY_V_TELE.setdefault(slug, []).insert(0, obrazek)
        return self.odpoved(obrazek)

    def uloz_poradatele(self, slug):
        if not self.headers.get("authorization"):
            return self.send_error(401)
        p = PORADATELE.get(slug)
        if not p or not poradatel_sprava(p)["zastavky"]:
            return self.send_error(404)

        v = self.telo_zadosti()
        web, chyba = proc_nejde_medailonek(v)
        if chyba:
            return self.chyba(400, chyba)

        nazev = v["nazev"].strip()
        novy = bez_diakritiky_slug(nazev)[:80].rstrip("-")
        if novy != slug and novy in PORADATELE:
            return self.chyba(400, f"Pořadatel se jménem „{nazev}“ už existuje. "
                                   "Zastávku mu přiřaď v kalendáři.")

        # Přejmenování přepíše text na zastávkách a slug jde se jménem — jako v API.
        zastavky = [z for z in D["zavody"] if poradatel_zastavky(z) is p]
        text = lambda k: (v.get(k) or "").strip() or None
        p.update({"slug": novy, "nazev": nazev, "web": web, "popis": text("popis"),
                  "email": text("email"), "telefon": text("telefon"),
                  "kontaktniOsoba": text("kontaktniOsoba"), "adresa": text("adresa"),
                  "sirka": v.get("sirka"), "delka": v.get("delka")})
        del PORADATELE[slug]
        PORADATELE[novy] = p
        for z in zastavky:
            z["poradatel"] = nazev
        return self.odpoved(poradatel_sprava(p))

    def zaloz_zastavku(self):
        if not self.headers.get("authorization"):
            return self.send_error(401)

        vstup = self.telo_zadosti()
        hodnoty, chyba = zastavka_ze_vstupu(vstup)
        if chyba:
            return self.chyba(400, chyba)

        # Sloupec zastávky má 80 znaků, kdežto článek 120.
        slug = bez_diakritiky_slug(hodnoty["nazev"])[:80].rstrip("-")
        if any(z["slug"] == slug for z in D["zavody"]):
            return self.chyba(400, f"Zastávka s adresou \u201e{slug}\u201c už v ročníku je. "
                                   "Změň název.")

        # Nová zastávka je vždycky plánovaná a nepublikovaná — stejně jako v API.
        nova = {**hodnoty, "slug": slug, "stav": "Planovany", "publikovano": False,
                "puvodniDatum": None, "poradi": 0, "pocetSkrtu": 0,
                "koeficientDoSerie": 1.0,
                "ucasti": [], "rozjizdky": [], "druh": vstup.get("druh") or "Pohar"}
        D["zavody"].append(nova)
        prerad_kalendar()
        return self.odpoved(zastavka_radek(nova), 201)

    def uprav_zastavku(self, slug):
        z = self.zastavka(slug)
        if not z:
            return None

        hodnoty, chyba = zastavka_ze_vstupu(self.telo_zadosti())
        if chyba:
            return self.chyba(400, chyba)

        # Přesun není stav, zůstává po něm jen původní datum — a u plánované
        # zastávky se nepamatuje vůbec: předběžný kalendář je návrh.
        if hodnoty["datum"] != z["datum"] and z["stav"] != "Planovany":
            z["puvodniDatum"] = z.get("puvodniDatum") or z["datum"]

        z.update(hodnoty)
        prerad_kalendar()
        return self.odpoved(zastavka_radek(z))

    def prepni_stav_zastavky(self, slug):
        z = self.zastavka(slug)
        if not z:
            return None

        na = self.telo_zadosti().get("stav")
        if (chyba := proc_nejde(z["stav"], na)):
            return self.chyba(400, chyba)

        z["stav"] = na
        return self.odpoved(zastavka_radek(z))

    def publikuj_zastavku(self, slug):
        z = self.zastavka(slug)
        if not z:
            return None

        z["publikovano"] = bool(self.telo_zadosti().get("publikovano"))
        return self.odpoved(zastavka_radek(z))

    def zaloz_clanek(self, seznam=None):
        seznam = SPRAVA_CLANKY if seznam is None else seznam
        if not self.headers.get("authorization"):
            return self.send_error(401)

        vstup = self.telo_zadosti()
        titulek = (vstup.get("titulek") or "").strip()
        if not titulek:
            return self.chyba(400, "Článek musí mít titulek.")
        if not (vstup.get("telo") or "").strip():
            return self.chyba(400, "Článek musí mít text.")

        slug = bez_diakritiky_slug(titulek)
        if not slug:
            return self.chyba(400, "Z titulku nejde udělat adresa. "
                                   "Napiš do něj aspoň jedno písmeno nebo číslici.")
        if any(c["slug"] == slug for c in seznam):
            return self.chyba(400, f"Článek s adresou „{slug}“ už je. Změň titulek.")

        # Nový článek je vždycky koncept — stejně jako v API.
        novy = {"slug": slug, "titulek": titulek, "telo": vstup.get("telo"),
                "format": vstup.get("format") or "Text",
                "perex": vstup.get("perex"), "autor": vstup.get("autor"),
                "zavod": vstup.get("zavod"), "stav": "Draft",
                "publikovanoV": "2026-09-11T12:00:00+00:00"}
        seznam.insert(0, novy)
        return self.odpoved(clanek_radek(novy), 201)

    def prepni_stav(self, slug, seznam=None):
        seznam = SPRAVA_CLANKY if seznam is None else seznam
        if not self.headers.get("authorization"):
            return self.send_error(401)

        c = next((c for c in seznam if c["slug"] == slug), None)
        if not c:
            return self.send_error(404)

        na = self.telo_zadosti().get("stav")
        if c["stav"] == "Smazano" and na == "Publikovano":
            return self.chyba(400, "Smazaný článek se nejdřív vrátí jako koncept, "
                                   "teprve pak se publikuje.")

        c["stav"] = na
        return self.odpoved(clanek_radek(c))

    def do_DELETE(self):
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/lode/(\d+)$',
                          urlparse(self.path).path)):
            z = self.zastavka(m.group(1))
            if not z:
                return None
            lod = LOD_PODLE_ID.get(int(m.group(2)))
            u = next((u for u in z["ucasti"] if u["lod"] == lod), None)
            if not u:
                return self.send_error(404)
            if u["stav"] not in ("Pozadavek", "KDoplneni", "Odmitnuta") or ma_vysledky(z, lod):
                return self.chyba(400, "Smazat jde jen požadavek, vrácenou nebo odmítnutou "
                                       "přihlášku bez výsledků. Zapsanou loď odhlas.")
            z["ucasti"].remove(u)
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)'
                          r'/rozjizdky/(\d+)/papir$', urlparse(self.path).path)):
            z, r = self.rozjizdka(m.group(1), int(m.group(2)))
            if not r:
                return
            if r.get("papir"):
                FOTKY.pop(r.pop("papir")["id"], None)
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/(clanky|poradatele)/([a-z0-9-]+)/obrazek$',
                          urlparse(self.path).path)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            vlastnik = self.vlastnik_obrazku(m.group(1), m.group(2))
            if not vlastnik:
                return self.send_error(404)
            if vlastnik.get("obrazek"):
                FOTKY.pop(vlastnik.pop("obrazek")["id"], None)
                vlastnik["obrazek"] = None
            self.send_response(204)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return

        m = re.match(rf'^/sprava/serie/{D["slug"]}/opravneni/(\d+)$', urlparse(self.path).path)
        if not m:
            return self.send_error(404)
        if not self.headers.get("authorization"):
            return self.send_error(401)

        o = next((o for o in OPRAVNENI if o["id"] == int(m.group(1))), None)
        if not o:
            return self.send_error(404)
        if o["role"] == "Spravce" and sum(1 for x in OPRAVNENI if x["role"] == "Spravce") <= 1:
            return self.chyba(409, "Poslední správce ročníku se odebrat nedá. "
                                   "Nejdřív udělte roli někomu jinému.")

        OPRAVNENI.remove(o)
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        rozdelena = urlparse(self.path)
        cesta, dotaz = rozdelena.path, parse_qs(rozdelena.query)

        if (m := re.match(r'^/fake-foto/([0-9a-f]+)$', cesta)) and m.group(1) in FOTKY:
            data, typ = FOTKY[m.group(1)]
            self.send_response(200)
            self.send_header("Content-Type", typ)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        if cesta == "/lode/napoveda":
            # Našeptávač lodí: bez diakritiky, od dvou znaků; vse=true vydá
            # celý seznam pro nabídku prohlížeče. Opsané z Features/Lode.
            q = bez_diakritiky_slug(dotaz.get("q", [""])[0]).replace("-", "")
            vse = dotaz.get("vse", [""])[0] == "true"
            if not vse and len(q) < 2:
                return self.odpoved([])

            polozky = []
            for lod in LODE.values():
                nazev = bez_diakritiky_slug(lod["nazev"]).replace("-", "")
                plachta = bez_diakritiky_slug(lod.get("cisloPlachty") or "").replace("-", "")
                vaha = (0 if nazev.startswith(q) else 1 if q in nazev
                        else 2 if q and q in plachta else None)
                if not vse and vaha is None:
                    continue
                polozky.append((vaha if vaha is not None else 9, lod))

            polozky.sort(key=lambda p: (p[0], nazvy_klic(p[1]["nazev"])))
            return self.odpoved([
                {"lod": lod["nazev"], "cisloPlachty": lod.get("cisloPlachty"), "typ": lod.get("typ"),
                 "majitel": jmeno(lod["majitel"]), "kategorie": KAT.get(lod["klic"]),
                 "kormidelnik": None, "vRocniku": lod["klic"] in KAT, "posledniRok": D["rok"]}
                for _, lod in polozky[:500 if vse else 8]])

        if cesta == "/vodocet/orlik":
            # Vymyšlený, ale věrohodný den: hladina klesá, elektrárna pustila
            # vodu dvakrát. Skutečná čísla sbírá API z Povodí Vltavy.
            from datetime import datetime, timedelta, timezone
            konec = datetime.now(timezone.utc).replace(second=0, microsecond=0)
            konec -= timedelta(minutes=konec.minute % 10)
            body = [{"cas": (konec - timedelta(minutes=10 * i)).isoformat().replace("+00:00", "Z"),
                     "hladina": round(334.66 + 0.08 * i / 144, 2)} for i in range(144, -1, -1)]
            return self.odpoved({
                "cas": body[-1]["cas"], "hladina": 334.66, "objem": 345.4, "pritok": 14.33,
                "odtok": 0.0, "pritokZaDen": 1_231_000.0, "odtokZaDen": 3_016_656.0,
                "zmenaObjemu": -1_780_000.0, "historie": body,
                "zdroj": "https://www.pvl.cz/portal/nadrze/cz/pc/Mereni.aspx?id=VLOR&oid=2"})

        if cesta == "/vodocet/teplota-hladiny":
            # Snímky Landsatu zhruba po týdnu za dva měsíce, jak je letos
            # dával skutečný Orlík. Čísla počítá úloha jobs/landsat; tvar je stejný.
            from datetime import datetime, timedelta, timezone
            posledni = (datetime.now(timezone.utc) - timedelta(days=3)).replace(
                hour=9, minute=57, second=0, microsecond=0)
            def snimek(kdy, zaklad, chybi=()):
                mista = {"spalenka": -0.2, "trhovky": -0.4, "bukovanska": -0.5, "vystrkov": -0.2,
                         "podskali": -0.1, "radava": 0.0, "velky-vir": 0.0, "marina-orlik": 0.1,
                         "zdakov": 0.0, "husarna": 0.1}
                return {"snimek": f"LC09_L2SP_192026_{kdy:%Y%m%d}_02_T1",
                        "cas": kdy.isoformat().replace("+00:00", "Z"),
                        "mista": [{"misto": m, "teplota": round(zaklad + d, 1), "pixelu": 40}
                                  for m, d in mista.items() if m not in chybi]}
            leto = [(0, 19.8, ("husarna",)), (8, 21.6, ("trhovky", "spalenka")), (16, 22.4, ()),
                    (24, 27.2, ()), (32, 26.2, ("zdakov",)), (40, 28.8, ()), (48, 23.5, ()),
                    (56, 25.0, ("marina-orlik",))]
            return self.odpoved({
                "snimky": [snimek(posledni - timedelta(days=d), t, chybi=ch) for d, t, ch in leto],
                "zdroj": "https://planetarycomputer.microsoft.com/dataset/landsat-c2-l2"})

        if cesta in ("/health", "/health/ready"):
            # Skutečné API je má taky; bez nich by zátěžový test hlásil
            # červenou na endpointu, který s aplikací nesouvisí.
            telo = {"status": "Healthy"}
        elif cesta == "/serie":
            telo = [{"slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
                     "pocetZavodu": sum(1 for z in D["zavody"] if z["druh"] == "Pohar")}]
        elif cesta == f'/serie/{D["slug"]}':
            telo = {
                "slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
                "kategorie": D["kategorie"],
                # Zastávky jen poháru, akce zvlášť — jako v API, kvůli appce.
                "zavody": [{k: z.get(k) for k in
                            ("slug", "nazev", "datum", "datumKonce", "typ", "poradatel",
                             "poradi", "stav", "puvodniDatum")}
                           for z in sorted(D["zavody"], key=lambda z: z["poradi"])
                           if z["druh"] == "Pohar"],
                "akce": [{k: z.get(k) for k in
                          ("slug", "nazev", "datum", "datumKonce", "typ", "poradatel",
                           "poradi", "stav", "puvodniDatum")}
                         for z in sorted(D["zavody"], key=lambda z: z["poradi"])
                         if z["druh"] == "Akce"],
                "prihlasky": [{"lod": LODE[p["lod"]]["nazev"],
                               "cisloPlachty": LODE[p["lod"]]["cisloPlachty"],
                               "typLodi": LODE[p["lod"]]["typ"],
                               "majitel": jmeno(LODE[p["lod"]]["majitel"]),
                               "kategorie": p["kategorie"]} for p in D["prihlasky"]],
            }
        elif cesta == f'/serie/{D["slug"]}/poradi':
            telo = poradi_serie()
        elif cesta == "/ja":
            # Přihlášený uživatel pro vývoj. Nekontroluje token — na to by
            # tady musel běžet poskytovatel identity, a celý smysl tohohle
            # skriptu je, že běžet nemusí nic. Bez hlavičky se ale tváří
            # jako neznámý, aby šel vyzkoušet i odhlášený stav.
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = {
                **JA,
                # Role se berou z téhož seznamu, který spravuje obrazovka
                # oprávnění — jinak by se odebrání vlastní role neprojevilo
                # v nabídce a stránka by nabízela odkaz, který skončí na 403.
                "opravneni": [{"role": o["role"], "serie": D["slug"], "zavod": o["zavod"]}
                              for o in OPRAVNENI if o["email"] == JA["email"]],
            }
        elif cesta == f'/sprava/serie/{D["slug"]}/opravneni':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = {
                "serie": D["slug"], "nazev": D["nazev"],
                # I nepublikované zastávky: pořadatele potřebují dřív, než
                # jsou venku.
                "zastavky": [{"slug": z["slug"], "nazev": z["nazev"]} for z in D["zavody"]],
                "opravneni": OPRAVNENI,
                # Přihlášený vývojář je správce, takže smí i na celý ročník
                # a vidí i seznam účtů. Naposledy přihlášení nahoře.
                "smiNaRocnik": True,
                "ucty": sorted(UCTY.values(), key=lambda u: u["naposledyPrihlasenV"],
                               reverse=True),
            }
        elif cesta == f'/sprava/serie/{D["slug"]}':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = {"slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
                    "publikovano": ROCNIK_VENKU[0], "smiPublikovat": True}
        elif cesta == f'/sprava/serie/{D["slug"]}/vysledky':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = [{"zavod": z["slug"], "nazev": z["nazev"], "datum": z["datum"],
                     "stav": z["stav"], "pocetRozjizdek": len(z["rozjizdky"]),
                     "publikovanych": sum(1 for r in z["rozjizdky"] if r["publikovano"]),
                     "kRevizi": sum(1 for r in z["rozjizdky"]
                                    if r["stavVysledku"] == "KRevizi")}
                    for z in sorted((z for z in D["zavody"] if z["druh"] == "Pohar"),
                                    key=lambda z: z["poradi"])]
        elif (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)$', cesta)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            z = next((z for z in D["zavody"] if z["slug"] == m.group(1)), None)
            # Komunitní akce výsledky nemá, stránka pro ni neexistuje.
            if not z or z["druh"] == "Akce":
                return self.send_error(404)
            telo = {"serie": D["slug"], "serieNazev": D["nazev"],
                    "zavod": z["slug"], "zavodNazev": z["nazev"],
                    "stavZavodu": z["stav"], "zavodPublikovan": True,
                    "rozjizdky": [rozjizdka_radek(r) for r in z["rozjizdky"]],
                    "smiPridatRozjizdku": proc_nejde_na_zavod(z["stav"], z["druh"]) is None}
        elif (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)'
                            r'/rozjizdky/(\d+)/navrhy$', cesta)):
            return self.navrhy(m.group(1), int(m.group(2)))
        elif (m := re.match(rf'^/sprava/serie/{D["slug"]}/vysledky/([a-z0-9-]+)'
                            r'/rozjizdky/(\d+)$', cesta)):
            z, r = self.rozjizdka(m.group(1), int(m.group(2)))
            if not r:
                return None
            telo = zapis_dto(z, r)
        elif (m := re.match(rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/lode$', cesta)):
            z = self.zastavka(m.group(1))
            if not z:
                return None
            telo = prihlasky_dto(z)
        elif cesta == f'/sprava/serie/{D["slug"]}/zastavky':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = {
                "serie": D["slug"], "serieNazev": D["nazev"], "smiZalozit": True,
                "zastavky": [zastavka_radek(z) for z in
                             sorted(D["zavody"], key=lambda z: z["poradi"])],
            }
        elif (m := re.match(rf'^/sprava/serie/{D["slug"]}/poradatele/([a-z0-9-]+)$', cesta)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            p = PORADATELE.get(m.group(1))
            # Pořadatel, který v ročníku nic nepořádá, v něm neexistuje.
            if not p or not poradatel_sprava(p)["zastavky"]:
                return self.send_error(404)
            telo = poradatel_sprava(p)
        elif cesta == f'/sprava/serie/{D["slug"]}/clanky':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = {
                "serie": D["slug"], "serieNazev": D["nazev"],
                # Falešné API nerozlišuje rozsahy: kdo je přihlášený, smí
                # všechno. Rozsahy se zkoušejí v testech, tady jde o obrazovku.
                "smiNaRocnik": True,
                "zastavky": [{"slug": z["slug"], "nazev": z["nazev"]} for z in D["zavody"]],
                "clanky": [clanek_radek(c) for c in SPRAVA_CLANKY
                           if c["stav"] != "Smazano"],
            }
        elif (m := re.match(rf'^/sprava/serie/{D["slug"]}/clanky/([a-z0-9-]+)$', cesta)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            c = next((c for c in SPRAVA_CLANKY if c["slug"] == m.group(1)), None)
            if not c:
                return self.send_error(404)
            telo = {**clanek_radek(c), "telo": c["telo"],
                    "format": c.get("format", "Text")}
        elif cesta == '/sprava/web/clanky':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            # Obecný článek do ročníku nepatří, takže ani do zastávky:
            # `smiNaRocnik` je False a seznam zastávek prázdný.
            telo = {"serie": "web", "serieNazev": "Web", "smiNaRocnik": False,
                    "zastavky": [],
                    "clanky": [clanek_radek(c) for c in SPRAVA_OBECNE
                               if c["stav"] != "Smazano"]}
        elif (m := re.match(r'^/sprava/web/clanky/([a-z0-9-]+)$', cesta)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            c = next((c for c in SPRAVA_OBECNE if c["slug"] == m.group(1)), None)
            if not c:
                return self.send_error(404)
            telo = {**clanek_radek(c), "telo": c["telo"],
                    "format": c.get("format", "Text")}
        elif (m := re.match(
                rf'^(?:/sprava/web|/sprava/serie/{D["slug"]})/clanky/([a-z0-9-]+)/obrazky$', cesta)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = OBRAZKY_V_TELE.get(m.group(1), [])
        elif cesta == "/prevzate-clanky":
            # Novinky ze svazu. Falešné API je nestahuje — vydává vzorek,
            # aby šlo na webu vidět, jak karta s cizím zdrojem vypadá.
            telo = PREVZATE[:8]

        elif cesta == "/clanky":
            # Obecné články mimo ročník (od 22. 9. 2026). Jeden ukázkový,
            # ať je vidět, jak se vmíchávají mezi novinky ročníku.
            limit = int(dotaz.get("limit", ["0"])[0] or 0)
            telo = OBECNE_CLANKY[:limit] if limit > 0 else OBECNE_CLANKY
            telo = [{k: v for k, v in c.items() if k != "telo"} for c in telo]
        elif (m := re.match(r'^/clanky/([a-z0-9-]+)$', cesta)):
            c = next((c for c in OBECNE_CLANKY if c["slug"] == m.group(1)), None)
            if not c:
                return self.send_error(404)
            telo = c
        elif cesta == f'/serie/{D["slug"]}/clanky':
            vybrane = clanky_verejne()
            if zavod := dotaz.get("zavod", [""])[0]:
                vybrane = [c for c in vybrane if c.get("zavod") == zavod]
            if (limit := int(dotaz.get("limit", ["0"])[0] or 0)) > 0:
                vybrane = vybrane[:limit]
            telo = [clanek_shrnuti(c) for c in vybrane]
        elif (m := re.match(rf'^/serie/{D["slug"]}/clanky/([a-z0-9-]+)$', cesta)):
            c = next((c for c in clanky_verejne() if c["slug"] == m.group(1)), None)
            if not c:
                return self.send_error(404)
            telo = {**clanek_shrnuti(c), "telo": c["telo"],
                    "format": c.get("format", "Text")}
        elif (m := re.match(rf'^/serie/{D["slug"]}/zavody/([a-z0-9-]+)$', cesta)):
            z = next((z for z in D["zavody"] if z["slug"] == m.group(1)), None)
            if not z:
                return self.send_error(404)
            kormidelnici = {u["lod"]: u.get("kormidelnik") for u in z["ucasti"]}
            telo = {**{k: z.get(k) for k in
                       ("slug", "nazev", "datum", "datumKonce", "typ", "poradatel",
                        "stav", "puvodniDatum", "pocetSkrtu", "vyhodnoceni",
                        "koeficientDoSerie")},
                    "druh": z["druh"],
                    "medailonek": poradatel_zastavky(z),
                    "rozjizdky": [{
                        "cislo": r["cislo"], "startV": r["startV"], "stav": r["stav"],
                        "doSerie": r["doSerie"],
                        # Nepublikovaná rozjížďka na stránce zůstává, jen
                        # prázdná; eliminovaná se sem vůbec nedostane.
                        "vysledky": [] if not r.get("publikovano", True) else [{
                            "lod": nazvy(v["lod"]),
                            "kategorie": KAT[v["lod"]],
                            "kormidelnik": jmeno(kormidelnici[v["lod"]]) if kormidelnici.get(v["lod"]) else None,
                            "poradiVCili": v.get("poradiVCili"),
                            "casSekundy": v.get("casSekundy"),
                            "kod": v.get("kod"),
                        } for v in r["vysledky"]],
                    } for r in z["rozjizdky"]
                        if r.get("stavVysledku") != "Eliminovano"],
                    "poradi": [{**v, "lod": nazvy(v["lod"])}
                               for v in vysledky_zavodu(
                                   [r for r in z["rozjizdky"] if plati(r)],
                                   z.get("pocetSkrtu", 0))],
                    "poradiCelkem": [{**v, "lod": nazvy(v["lod"])}
                                     for v in vysledky_zavodu(
                                         [r for r in z["rozjizdky"] if plati(r)],
                                         z.get("pocetSkrtu", 0), napric=True)],
                    # Zrušená přihláška veřejně neexistuje, nepotvrzená nese
                    # poznámku — jako v API.
                    "lode": [{"lod": nazvy(u["lod"]), "kategorie": KAT[u["lod"]],
                              "kormidelnik": jmeno(u["kormidelnik"]) if u.get("kormidelnik") else None,
                              "potvrzena": u["stav"] != "Prihlasena",
                              "vyloucena": u["stav"] == "Vyloucena"}
                             for u in sorted((u for u in z["ucasti"] if u["stav"] in VEREJNE_UCASTI),
                                             key=lambda u: (KAT_PORADI[KAT[u["lod"]]], nazvy(u["lod"])))]}

            # Ročník, který výsledky jednotlivých regat veřejně nevydává.
            # Jako v API: zastávka zůstane i se seznamem lodí, rozjížďky
            # a pořadí odejdou prázdné a klient dostane příznak, aby
            # nemlčel bez vysvětlení.
            if not D.get("vysledkyZavoduVerejne", True):
                telo = {**telo, "rozjizdky": [], "poradi": [], "poradiCelkem": [],
                        "vysledkySkryte": True}
        else:
            return self.send_error(404)

        return self.odpoved(telo)

    def odpoved(self, telo, kod=200):
        data = json.dumps(telo, ensure_ascii=False).encode()
        self.send_response(kod)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        # Appka běží ve vývoji i v prohlížeči, takže potřebuje totéž,
        # co skutečné API — jinak ji CORS zastaví dřív, než se načte.
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


# Výchozí port je 8080, tedy tentýž, na kterém by běželo skutečné API.
# Web tak nepotřebuje žádné nastavení navíc a postup z README platí
# i v čerstvém klonu, kde .env.local neexistuje.
PORT = int(os.environ.get("PORT", "8080"))
print(f"Falešné API z data/2026-nanecisto.json na http://127.0.0.1:{PORT}", flush=True)
HTTPServer(("127.0.0.1", PORT), H).serve_forever()
