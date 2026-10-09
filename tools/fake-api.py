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
SOUBOR = sys.argv[1] if len(sys.argv) > 1 else "data/2026-nanecisto.json"
D = json.load(open(SOUBOR, encoding="utf-8"))
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
def zavod_zkousky():
    """
    Zastávka, na které stojí zkouška ovládání: odjetá, s rozjížďkami a
    <b>s nejdelším seznamem lodí</b>. Na tempo v C5 je potřeba dlouhý
    seznam a na C7 druhý zapisovatel — obojí musí sedět na jedné regatě,
    jinak se tempo měří jinde, než kde je připravený konflikt.
    """
    odjete = [z for z in D["zavody"] if z["stav"] == "Odjety" and z["rozjizdky"]]
    return max(odjete, key=lambda z: len(z["ucasti"]), default=None)


def _nasad_druhy_snimek():
    z = zavod_zkousky()
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

# Druhý zapisovatel, který se umí přihlásit. Existuje kvůli zápisu z vody:
# snímek k porovnání je jeden na člověka (`ZapisSprava.SnimekAsync`), takže
# bez druhé identity nejde vyrobit porovnání dvou zápisů a scénář C7 se dá
# zkusit jen do hlášky o konfliktu.
MILOS = {
    "id": "01927f4e-0000-7000-8000-000000000004",
    "zobrazovane": "Miloš Zvonař",
    "email": "milos@priklad.cz",
}

# Správkyně celého webu bez jediné role v ročníku. Existuje kvůli nálezu
# auditu: nabídka se počítala jen z ročníkových rolí, takže tenhle člověk
# neviděl ročníkové položky, ačkoliv na ty obrazovky smí. Bez takového účtu
# se ta oprava nedá vyzkoušet — a scénář E5 taky ne.
#
# Samu roli nese `OPRAVNENI_WEBU`, ne účet: skutečné API vydává pole `web`
# v odpovědi na /ja z téže tabulky, kterou spravuje obrazovka oprávnění
# (`Poskytovatel.WebRoleAsync`). Zapsaná u účtu by přežila i odebrání.
WEBOVA = {
    "id": "01927f4e-0000-7000-8000-000000000005",
    "zobrazovane": "Dana Hlavní",
    "email": "dana@priklad.cz",
}

# Rozhodčí celého ročníku. Existuje kvůli skupině D zkoušky ovládání: role
# `Rozhodci` **nepokrývá** `Organizator` (`web/lib/co-smim.ts:57`), takže
# rozhodčí vidí v rozcestníku jiné položky než správce. Bez vlastního účtu
# by se skupina D odjela jako Filip a měřilo by se, kam se dostane správce.
ROZHODCI = {
    "id": "01927f4e-0000-7000-8000-000000000006",
    "zobrazovane": "Zdeněk Vávra",
    "email": "zdenek@priklad.cz",
}

# Mock token nerozbaluje — nemá čím a nemá proč. Bere ho jako jméno účtu:
# `Bearer milos` je Miloš. Dva různé tokeny jsou tedy dva lidé a stejný token
# ve dvou kartách je jeden člověk; **obojí je potřeba**, protože jeden účet na
# dvou telefonech je vlastní případ s vlastní mezerou (porovnání nemá co
# ukázat) a mock ji nesmí zamaskovat.
#
# <b>Neznámé jméno se odmítá.</b> Dřív padalo na Filipa, jenže při zkoušce
# ovládání je to past: překlep v `milos` by tiše udělal správce ročníku
# a měřilo by se něco jiného, než co se zadalo (oponentura, 6. 10. 2026).
# Kompatibilní výchozí token má proto vlastní jméno — `vyvoj` je Filip, takže
# kdo chce starý postup „přihlásit se čímkoliv", napíše ho výslovně.
TOKENY = {"filip": JA, "vyvoj": JA, "milos": MILOS, "dana": WEBOVA,
          "zdenek": ROZHODCI}

# Náklady: snímek souboru `stav/naklady.json`, který na serveru zapisuje
# přehled platformy. Čísla jsou skutečná (24. 9. 2026), jen zamrzlá —
# stejně jako zbytek mocku. Přirážka je opsaná z Features/Naklady; pravda
# o ní je tam a hlídají ji testy.
NAKLADY_ZDROJ = {
    "kdy": "2026-09-24T06:45:03Z",
    "kurz": {"eur_kc": 24.380},
    "projekty": [{
        "projekt": "orlickypohar",
        # Doména tu schválně není: platí se za celou hračkárnu a pohár sedí
        # na subdoméně, takže ji platforma projektům nerozpočítává.
        "provoz": [
            {"polozka": "Podíl na serveru", "eur_mesicne": 1.26, "kc_mesicne": 30.72,
             "poznamka": "17,1 % stroje Hetzner CX23 za 7,25 € měsíčně",
             # Rozbor té jedné platby, ne další položky.
             "slozky": [
                 {"polozka": "Paměť", "kc_mesicne": 25.95,
                  "poznamka": "222 MB z 3814 MB stroje, váha 50 %"},
                 {"polozka": "Procesor", "kc_mesicne": 0.53,
                  "poznamka": "31 s za 24 h, váha 40 %"},
                 {"polozka": "Disk", "kc_mesicne": 4.24, "poznamka": "1,0 GB, váha 10 %"},
             ]},
        ],
        "servis": [
            {"polozka": "Předplatné Claude Code", "kc_mesicne": 2030.0, "eur_mesicne": 83.27,
             "poznamka": "95 % z 100 $ měsíčně podle podílu odvedené práce"},
            {"polozka": "GitHub Actions", "kc_mesicne": 0,
             "poznamka": "1345 z 2000 minut měsíčně zdarma"},
            {"polozka": "Cloudflare — DNS, proxy, R2", "kc_mesicne": 0,
             "poznamka": "bezplatná hladina"},
            {"polozka": "Expo EAS — build appky", "kc_mesicne": 0, "poznamka": "bezplatná hladina"},
            {"polozka": "Gmail — odesílání alertů", "kc_mesicne": 0,
             "poznamka": "heslo aplikace, bez tarifu"},
        ],
        "prace": {"stavba_h": 119, "udrzba30_h": 119, "ci_minut": 1345, "podil_procent": 95},
        # Vývoj po dnech. Na serveru ho počítá přehled z naklady.csv; tady je
        # vymyšlený, aby šel graf vidět dřív, než se historie nasbírá.
        "historie": [
            {"den": d, "provoz_kc_mesicne": v}
            for d, v in zip(
                [f"2026-09-{den:02d}" for den in range(4, 24)],
                [27.9, 28.4, 28.1, 29.6, 31.2, 30.8, 29.9, 30.4, 33.1, 34.7,
                 32.2, 31.5, 30.9, 30.1, 29.4, 30.6, 31.8, 32.4, 31.1, 30.7],
            )
        ],
    }],
}
NAKLADY_PRIRAZKA = 7.0


def naklady_dto():
    p = NAKLADY_ZDROJ["projekty"][0]
    nasobek = 1 + NAKLADY_PRIRAZKA / 100

    def radek(x):
        r = {"polozka": x["polozka"],
             "kcMesicne": x["kc_mesicne"] * nasobek,
             "kcRocne": x["kc_mesicne"] * nasobek * 12,
             "poznamka": x.get("poznamka")}
        if x.get("slozky"):
            r["slozky"] = [radek(s) for s in x["slozky"]]
        return r

    def radky(kde):
        return [radek(x) for x in p[kde]]

    provoz, servis = radky("provoz"), radky("servis")
    soucet = lambda r, k: sum(x[k] for x in r)
    return {
        "kdy": NAKLADY_ZDROJ["kdy"],
        "prirazkaProcent": NAKLADY_PRIRAZKA,
        "provoz": provoz, "servis": servis,
        "provozKcMesicne": soucet(provoz, "kcMesicne"),
        "provozKcRocne": soucet(provoz, "kcRocne"),
        "servisKcMesicne": soucet(servis, "kcMesicne"),
        "servisKcRocne": soucet(servis, "kcRocne"),
        "celkemKcMesicne": soucet(provoz, "kcMesicne") + soucet(servis, "kcMesicne"),
        "celkemKcRocne": soucet(provoz, "kcRocne") + soucet(servis, "kcRocne"),
        "prace": {"stavbaH": p["prace"]["stavba_h"],
                  "udrzba30H": p["prace"]["udrzba30_h"],
                  "ciMinut": p["prace"]["ci_minut"]},
        # Přirážka platí i pro historii — jinak by graf ukazoval jiná čísla
        # než tabulka nad ním a vypadalo by to jako pokles.
        "historie": [{"den": d["den"], "provozKcMesicne": d["provoz_kc_mesicne"] * nasobek}
                     for d in p["historie"]],
    }
# Druhý zapisovatel u cíle. Mock zná jen jedno přihlášení, takže snímek
# „toho druhého" se nasadí do dat — bez něj by nebylo co porovnávat.
DRUHY_ZAPISOVATEL = MILOS

# Zastávka, u které leží nasazený snímek druhého zapisovatele. Je to tatáž,
# na které se zkouší C5 a C7, takže Miloš na ní musí mít roli — od chvíle,
# kdy mock role vymáhá, by se jinak k zápisu vůbec nedostal.
ZAVOD_DVOU_ZAPISOVATELU = (zavod_zkousky() or {}).get("slug")

OPRAVNENI = [{"id": 1, "uzivatelId": JA["id"], "zobrazovane": JA["zobrazovane"],
              "email": JA["email"], "role": "Spravce", "zavod": None,
              "udelenoV": "2026-01-01T00:00:00+00:00"},
             {"id": 2, "uzivatelId": MILOS["id"], "zobrazovane": MILOS["zobrazovane"],
              "email": MILOS["email"], "role": "Organizator",
              "zavod": ZAVOD_DVOU_ZAPISOVATELU,
              "udelenoV": "2026-04-01T00:00:00+00:00"},
             {"id": 3, "uzivatelId": ROZHODCI["id"],
              "zobrazovane": ROZHODCI["zobrazovane"],
              "email": ROZHODCI["email"], "role": "Rozhodci", "zavod": None,
              "udelenoV": "2026-02-01T00:00:00+00:00"}]

# Oprávnění na **celý web** — ve skutečném API tytéž řádky s prázdnou sérií
# (`Opravneni.SerieId`), jen je vydává vlastní cesta `/sprava/web/opravneni`.
# Dana je tu sama a `filip` tu schválně není: rozdíl mezi správcem ročníku
# a správcem webu je přesně to, co skupina E zkoušky ovládání měří.
OPRAVNENI_WEBU = [{"id": 4, "uzivatelId": WEBOVA["id"],
                   "zobrazovane": WEBOVA["zobrazovane"],
                   "email": WEBOVA["email"], "role": "Spravce", "zavod": None,
                   "udelenoV": "2026-01-15T00:00:00+00:00"}]

# Na web jdou jen tyhle dvě role (`Udeleni.ProcNejdeNaWebu`). Rozhodčí ani
# pořadatel celého webu neexistují — jsou to funkce v ročníku nebo regatě.
ROLE_WEBU = ("Editor", "Spravce")


def novy_id():
    """
    Další číslo oprávnění. Skutečné API má jednu tabulku pro ročník i web,
    takže dvě nezávislé řady by vyrobily dvě oprávnění s týmž `id` —
    a odebrání by se dalo splést.
    """
    return max((o["id"] for o in OPRAVNENI + OPRAVNENI_WEBU), default=0) + 1


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
    {**MILOS, "zalozenV": "2026-04-01T00:00:00+00:00",
     "naposledyPrihlasenV": "2026-09-19T14:30:00+00:00"},
    {**WEBOVA, "zalozenV": "2026-01-15T00:00:00+00:00",
     "naposledyPrihlasenV": "2026-10-01T09:12:00+00:00"},
    # Na konec schválně: `_nasad_vazby` věší vazby prvním třem účtům podle
    # pořadí a vkládat doprostřed by přestavělo výchozí stav lodí.
    {**ROZHODCI, "zalozenV": "2026-02-01T00:00:00+00:00",
     "naposledyPrihlasenV": "2026-10-05T18:00:00+00:00"},
]}
# Petr a Jana jsou v seznamu účtů odjakživa a `_nasad_vazby` je věší k lodím:
# Petr je posádka lodi, která **nemá kapitána**, Jana je **majitelka** jiné.
# Bez tokenu se za ně nedalo přihlásit, takže se skupina B zkoušky ovládání
# (kapitán lodi bez role ve správě) neměla kým zkoušet.
TOKENY["petr"] = UCTY["petr@priklad.cz"]
TOKENY["jana"] = UCTY["jana@priklad.cz"]

JEN_ROCNIK = ("Rozhodci", "Spravce")

# --- Vazby k lodím ----------------------------------------------------------
# Kdo patří ke které lodi. Lodě mock nečísluje, takže se bere totéž číslo
# jako u přihlášky (`PRIHLASKA_ID`) — v ročníku je to jedna loď na jednu
# přihlášku.
#
# Výchozí stav je schválně nehezký, protože právě ten obrazovka řeší:
# první loď má kapitána od připojovacího kódu (ke kontrole), druhá jen
# posádku a žádného kapitána, třetí majitele z párování podle e-mailu.
# Žije v paměti procesu — restart ho vrátí zpátky.
VAZBY = []
ZMENY_ROLI = []


def _nasad_vazby():
    poradi = list(PRIHLASKA_ID.items())
    ucty = list(UCTY.values())
    vzor = [("Kapitan", "Kod", False), ("Posadka", "Kod", False), ("Majitel", "Email", False)]

    for i, ((_lod, lod_id), (role, puvod, rucne)) in enumerate(zip(poradi, vzor)):
        VAZBY.append({
            "id": i + 1, "lodId": lod_id, "uzivatelId": ucty[i % len(ucty)]["id"],
            "role": role, "puvod": puvod,
            "vzniklaV": "2026-09-20T09:00:00+00:00",
            "roleUrcilId": JA["id"] if rucne else None,
            "roleUrcenaV": "2026-09-20T09:00:00+00:00" if rucne else None,
        })


# --- Připojovací kódy a nároky ---------------------------------------------
# Obojí žije v paměti procesu, stejně jako vazby. Pravidla jsou opsaná
# z `Features/Lode/` — `PripojovaciKod.cs`, `KodySprava.cs` a `NarokNaLod.cs`;
# pravda o nich leží tam a hlídají ji testy API.

KOD_DELKA = 6
KOD_PLATNOST_MINUT = 15
# Propadlý i vymyšlený kód dávají tutéž odpověď: ať z ní nejde vyčíst, že loď
# s takovým kódem existuje.
KOD_NEPLATNY = "Kód neplatí. Nech si vystavit nový."
# Kód přidává posádku, nikdy kapitána.
ROLE_PRO_NOVEHO = "Posadka"
POSLEDNI_ODPOVEDNY = ("Tohle je poslední kapitán lodi. Nejdřív urči jiného, "
                      "pak tohohle odeber.")
NAROK_DVAKRAT = "O tuhle loď už žádáš, kapitán to uvidí."
NAROK_UZ_PATRIS = "K téhle lodi už patříš."
NAROK_ZAMITNUTO = ("O tuhle loď jsi už žádal a kapitán žádost zamítl. "
                   "Domluv se s ním napřímo.")
# `NarokySprava.PoznamkaNejvic` — delší poznámka se tvrdě uřízne, nevrací chybu.
POZNAMKA_NEJVIC = 200

KODY = []
NAROKY = []


def _ted():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)


def _iso(kdy):
    return kdy.isoformat().replace("+00:00", "Z")


# Abeceda bez nul, jedniček, I a O: kód se opisuje z papíru u vody, kde se
# „0" a „O" plete každému. Opsané z `Kody.Abeceda`.
KOD_ABECEDA = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def novy_kod():
    """Šest znaků z téhle abecedy. Mock nepotřebuje kryptografii."""
    import random
    return "".join(random.choice(KOD_ABECEDA) for _ in range(KOD_DELKA))


def uprav_kod(zadany):
    """
    Srovná zadaný kód, jako `Kody.Uprav`: velká písmena a **pryč s každým
    znakem mimo abecedu** — ne jen s mezerami. Pomlčka z opisu tedy zmizí
    a kód projde; nula nebo písmeno O se taky zahodí, nepřeloží.
    """
    return "".join(z for z in (zadany or "").upper() if z in KOD_ABECEDA)


def _nasad_kody():
    """
    Jeden **už prošlý** kód k lodi, kterou má v ruce Filip.

    Čekat při zkoušce ovládání patnáct minut na vypršení rozbije sezení
    (scénář B2), a vyrobit si prošlý kód jinak nejde.
    """
    from datetime import timedelta

    # Kalendář ročníku bez lodí (`data/2027-kalendar.json`) nemá ke komu kód
    # přivěsit a scénář B2 se na takovém ročníku nejede. Dřív tu mock padal
    # na `StopIteration`, takže ten soubor nešel servírovat vůbec — a to je
    # jediný ročník s budoucími termíny, tedy jediný, na kterém jde odjet
    # E5 (nalezeno 9. 10. 2026 při zkoušce ovládání).
    lod_id = next(iter(PRIHLASKA_ID.values()), None)
    if lod_id is None:
        return

    ted = _ted()
    KODY.append({"kod": "PROSLY", "lodId": lod_id, "vystavilId": JA["id"],
                 "vystavenV": _iso(ted - timedelta(minutes=30)),
                 "platiDo": _iso(ted - timedelta(minutes=15)), "pouzit": 0})


def vazba_uzivatele(lod_id, uzivatel_id):
    return next((v for v in VAZBY if v["lodId"] == lod_id and v["uzivatelId"] == uzivatel_id), None)


def smi_vystavit(lod_id, uzivatel_id):
    """Kdo smí přivést dalšího: jen majitel nebo kapitán té lodi."""
    v = vazba_uzivatele(lod_id, uzivatel_id)
    return bool(v and v["role"] in ("Majitel", "Kapitan"))


def lod_podle_id(lod_id):
    klic = next((k for k, v in PRIHLASKA_ID.items() if v == lod_id), None)
    return (klic, LODE[klic]) if klic else (None, None)


def moje_lode_dto(uzivatel_id):
    lode = []
    for v in VAZBY:
        if v["uzivatelId"] != uzivatel_id:
            continue
        klic, lod = lod_podle_id(v["lodId"])
        if not lod:
            continue
        lode.append({"lodId": v["lodId"], "nazev": lod["nazev"],
                     "cisloPlachty": lod.get("cisloPlachty"), "role": v["role"]})
    return lode


def pripojeny_dto(v):
    u = ucet_podle_id(v["uzivatelId"]) or {}
    return {"id": v["id"], "kdo": u.get("zobrazovane", "neznámý účet"),
            "role": v["role"], "puvod": v["puvod"], "vzniklaV": v["vzniklaV"]}


def proc_nejde_odebrat(role, jinych_odpovednych):
    """Opsané z `Kapitanstvi.ProcNejdeOdebrat`."""
    if role in ("Majitel", "Kapitan") and jinych_odpovednych == 0:
        return POSLEDNI_ODPOVEDNY
    return None


def narok_dto(n):
    u = ucet_podle_id(n["uzivatelId"]) or {}
    return {"id": n["id"], "kdo": u.get("zobrazovane", "neznámý účet"),
            "poznamka": n["poznamka"], "podanV": n["podanV"]}


def muj_narok_dto(n):
    _klic, lod = lod_podle_id(n["lodId"])
    return {"id": n["id"], "lodId": n["lodId"], "lod": (lod or {}).get("nazev", "neznámá loď"),
            "poznamka": n["poznamka"], "podanV": n["podanV"],
            "ceka": n["rozhodnutoV"] is None, "prijat": bool(n["prijat"])}


def ke_kontrole(v):
    """Opsané z `Features/Lode/Kapitanstvi.cs` — kapitán od kódu bez potvrzení."""
    return v["role"] in ("Majitel", "Kapitan") and v["puvod"] == "Kod" and not v["roleUrcilId"]


# --- Plachetní směrnice -----------------------------------------------------
# Vyvěšené verze u zastávek. Mock je nemá v datech, takže se jedna nasadí
# k první zastávce — jinak není co stahovat a obrazovka je prázdná.
# Žije v paměti procesu, restart ji vrátí.
SMERNICE = {}


# Odkdy se směrnice ukládají bez cache — opsané z `Vyveseni.CacheVypnutaOd`.
# Co je starší, může po stažení ještě vydávat Cloudflare z edge cache.
CACHE_VYPNUTA_OD = "2026-10-06T02:00:00+00:00"


def _pdf(text):
    """
    Nejmenší platné PDF s jednou stránkou a jedním řádkem textu.

    Skládá se tady, protože v repozitáři žádné PDF neleží a **stažení
    směrnice se bez souboru nedá zkoušet**: adresa vydávaná v `adresa`
    vracela čtyřistačtyřku i před stažením, takže se odvolání nedalo
    poznat od souboru, který nikdy nebyl (scénář F2, 9. 10. 2026).
    """
    obsah = f"BT /F1 18 Tf 60 720 Td ({text}) Tj ET".encode("latin-1", "replace")
    objekty = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length %d >>\nstream\n%s\nendstream" % (len(obsah), obsah),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsety = []
    for i, o in enumerate(objekty, 1):
        offsety.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"

    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objekty) + 1)
    for off in offsety:
        out += b"%010d 00000 n \n" % off
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (
        len(objekty) + 1, xref)
    return bytes(out)


def _nasad_smernice():
    if not D["zavody"]:
        return

    def smernice(verze, vyveseno):
        return {
            "verze": verze, "nazev": f"plachetni-smernice-v{verze}.pdf",
            "adresa": f"http://127.0.0.1:8080/fake-soubor/smernice-v{verze}.pdf",
            "vyveseneV": vyveseno,
            "poznamka": None, "vyvesil": JA["zobrazovane"],
            "stazenoV": None, "stahl": None, "duvodStazeni": None,
            "mohlaUvaznoutVCache": vyveseno < CACHE_VYPNUTA_OD,
        }

    # Dvě verze schválně: jedna z doby s roční cache, druhá z doby bez ní.
    # Po stažení se purge připomíná jen u té první.
    SMERNICE[D["zavody"][0]["slug"]] = [
        smernice(1, "2026-09-21T17:00:00+00:00"),
        smernice(2, "2026-10-06T09:00:00+00:00"),
    ]


# --- Bóje na trati ----------------------------------------------------------
# Opsané z `Features/Boje/`. Mock je potřebuje proto, že bez nich se
# obrazovka bójí nedá zkoušet vůbec — a polohu z telefonu stejně nic
# jiného než prohlížeč nedá.
#
# <b>Nic se nepřepisuje</b>, stejně jako v API: přenastavení je nový
# záznam a starý se označí za nahrazený, sebrání je razítko. Seznam
# proto drží i to, co už na trati nestojí.
BOJE = {}
BOJE_ID = [0]

# Opsané z `Pipnuti` — mock musí odmítat totéž a týmiž slovy, jinak se
# na něm hlášky nedají zkoušet.
NAZEV_NEJVIC = 60
NEJHORSI_PRESNOST_M = 100
SIRKA_OD, SIRKA_DO = 49.2, 49.8
DELKA_OD, DELKA_DO = 14.0, 14.5


def proc_pipnuti_nejde(vstup):
    """Proč pípnutí nejde — nebo None. Doslovně podle `Pipnuti.ProcNejde`."""
    nazev = (vstup.get("nazev") or "").strip()
    if not nazev:
        return "Napiš, čím ta bóje je — třeba „bóje 1\"."
    if len(nazev) > NAZEV_NEJVIC:
        return f"Jméno bóje má nejvýš {NAZEV_NEJVIC} znaků."

    zdroj = vstup.get("zdroj") or "Telefon"
    presnost = vstup.get("presnostM")

    # Přesnost umí říct jen měření; bod odečtený z mapy žádnou nemá.
    if zdroj != "Telefon" and presnost is not None:
        return "Přesnost hlásí jen telefon. U polohy z mapy ji neposílej."

    if presnost is not None and presnost > NEJHORSI_PRESNOST_M:
        return (f"Poloha je přesná jen na {round(presnost)} m. "
                "Počkej na lepší signál a pípni znovu.")

    sirka, delka = vstup.get("sirka"), vstup.get("delka")
    if sirka is None or delka is None \
            or not SIRKA_OD <= sirka <= SIRKA_DO or not DELKA_OD <= delka <= DELKA_DO:
        return ("Tahle poloha není na Orlíku. Zkontroluj, že telefon má signál z družic."
                if zdroj == "Telefon" else
                "Tahle poloha není na Orlíku. "
                "Zkontroluj, že se v odkazu neprohodila šířka s délkou.")

    return None


def boje_dto(b):
    """Co z bóje vidí klient — `BojeDto`. Přenastavenou od platné nerozliší."""
    return {**{k: b[k] for k in
               ("id", "nazev", "poradi", "sirka", "delka", "presnostM", "postavenaV",
                "postavil", "sebrana", "zdroj")},
            # Fotek může být u bóje víc; mock je drží u záznamu, server
            # vazbou od fotky k bóji (`Fotka.UBojeId`).
            "fotky": b.get("fotky") or []}


def _nasad_boje():
    if not D["zavody"]:
        return

    def boje(nazev, poradi, sirka, delka, presnost, postavena, nahrazena=None, sebrana=False,
             zdroj="Telefon"):
        BOJE_ID[0] += 1
        return {
            "id": BOJE_ID[0], "nazev": nazev, "poradi": poradi,
            "sirka": sirka, "delka": delka, "presnostM": presnost,
            "postavenaV": postavena, "postavil": JA["zobrazovane"],
            "nahrazenaV": nahrazena, "sebrana": sebrana, "zdroj": zdroj,
        }

    # Trať u zastávky, na které stojí zkouška ovládání — tam má roli
    # organizátora `milos`, takže se obrazovka dá zkoušet i za pořadatele,
    # ne jen za správce. Dvě platné bóje a jedna přenastavená, aby bylo
    # na čem vidět, že se nic nepřepsalo.
    slug = ZAVOD_DVOU_ZAPISOVATELU or D["zavody"][0]["slug"]
    BOJE[slug] = [
        boje("start levý", 1, 49.5163, 14.1651, 4.0, "2026-10-08T07:12:00+00:00"),
        boje("bóje 1", 2, 49.5201, 14.1702, 6.0, "2026-10-08T07:20:00+00:00",
             nahrazena="2026-10-08T08:05:00+00:00"),
        boje("bóje 1", 2, 49.5208, 14.1711, 3.0, "2026-10-08T08:05:00+00:00"),
        # Jedna odečtená z mapy, ať je na čem vidět, že se měřená od
        # opsané pozná — a že u ní přesnost schválně chybí.
        boje("cíl", 3, 49.4957254, 14.1841419, None, "2026-10-08T08:40:00+00:00",
             zdroj="Mapa"),
    ]


def boje_zastavky(slug, i_historie):
    """Platné podle pořadí, historie až za nimi — jako `SeznamAsync`."""
    vse = BOJE.get(slug, [])
    if not i_historie:
        vse = [b for b in vse if b["nahrazenaV"] is None and not b["sebrana"]]
    return [boje_dto(b) for b in sorted(
        vse,
        key=lambda b: (0 if b["nahrazenaV"] is None and not b["sebrana"] else 1,
                       b["poradi"], _obracene(b["postavenaV"])))]


def _obracene(iso):
    """Řazení `ThenByDescending(PostavenaV)` bez práce s časem."""
    return [-ord(z) for z in iso]


def ucet_podle_id(id_uctu):
    return next((u for u in UCTY.values() if u["id"] == id_uctu), None)


def vazba_dto(v):
    u = ucet_podle_id(v["uzivatelId"]) or {}
    urcil = ucet_podle_id(v["roleUrcilId"]) if v["roleUrcilId"] else None
    return {
        "id": v["id"], "uzivatelId": v["uzivatelId"],
        "kdo": u.get("zobrazovane", "neznámý účet"), "email": u.get("email"),
        "role": v["role"], "puvod": v["puvod"], "vzniklaV": v["vzniklaV"],
        "roleUrcenaRucne": bool(v["roleUrcilId"]),
        "roleUrcil": (urcil or {}).get("zobrazovane"),
        "roleUrcenaV": v["roleUrcenaV"],
        "keKontrole": ke_kontrole(v),
    }


def lod_sprava_dto(klic):
    lod_id = PRIHLASKA_ID[klic]
    vazby = [vazba_dto(v) for v in VAZBY if v["lodId"] == lod_id]
    vazby.sort(key=lambda v: (("Majitel", "Kapitan", "Posadka", "Fanousek").index(v["role"]),
                              v["vzniklaV"]))
    return {
        "lodId": lod_id, "nazev": LODE[klic]["nazev"],
        "cisloPlachty": LODE[klic].get("cisloPlachty"), "kategorie": KAT[klic],
        "maKapitana": any(v["role"] in ("Majitel", "Kapitan") for v in vazby),
        "keKontrole": any(v["keKontrole"] for v in vazby),
        "vazby": vazby,
    }


def ted_iso():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def zaznamenej_zmenu(lod_id, komu, predchozi, nova, zmenil=None):
    ZMENY_ROLI.append({"lodId": lod_id, "uzivatelId": komu, "predchozi": predchozi,
                       "nova": nova, "zmenilId": zmenil or JA["id"],
                       "zmenenoV": ted_iso()})


def zmena_dto(z):
    return {"kdo": (ucet_podle_id(z["uzivatelId"]) or {}).get("zobrazovane", "neznámý účet"),
            "predchozi": z["predchozi"], "nova": z["nova"],
            "zmenil": (ucet_podle_id(z["zmenilId"]) or {}).get("zobrazovane"),
            "zmenenoV": z["zmenenoV"]}


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


def kdo_smi_na_stav(na):
    """Čí podpis je který stupeň. Opsané z `Workflow.KdoSmi`."""
    if na == "Navrzeno":
        return "Organizator"
    if na in ("Overeno", "Schvaleno", "KRevizi"):
        return "Rozhodci"
    return "Spravce"


def kdo_smi_do_serie(stav):
    """Dokud jsou čísla rozepsaná, rozhoduje pořadatel. Opsané z `KdoSmiDoSerie`."""
    return "Organizator" if stav in OTEVRENY else "Rozhodci"


def rozjizdka_radek(r, zavod=None):
    """
    Řádek rozjížďky pro správu, podle práv toho, kdo se ptá.

    <b>Obrazovka musí nabízet jen to, co projde.</b> Dřív tu stálo
    `smiPublikovat: True` a všechny stupně naráz, takže rozhodčí viděl
    tlačítka, která by mu server odmítl, a scénáře D2 a D4 měřily něco
    jiného, než co se zadalo (oponentura, 8. 10. 2026).
    """
    smi = smi_ted
    spravce = smi("Spravce")
    organizator = smi("Organizator", zavod)

    return {"cislo": r["cislo"], "startV": r.get("startV"), "stav": r["stav"],
            "doSerie": r["doSerie"], "stavVysledku": r["stavVysledku"],
            "publikovano": r["publikovano"], "duvodRevize": r.get("duvodRevize"),
            "pocetVysledku": len(r.get("vysledky", [])), "smiPublikovat": spravce,
            # Přeskakovat smí jen správce — proto se mu posílá i do `proc_nejde`.
            "mozneStavy": [s for s in VSECHNY_VYSLEDKY
                           if s != r["stavVysledku"]
                           and not proc_nejde_vysledek(r["stavVysledku"], s, spravce)
                           and smi(kdo_smi_na_stav(s), zavod)],
            "smiZapisovat": organizator and r["stavVysledku"] in OTEVRENY,
            "smiDoPoharu": smi(kdo_smi_do_serie(r["stavVysledku"]), zavod),
            "maPapir": bool(r.get("papir"))}


# --- Zápis výsledků ---------------------------------------------------------
# Opsané z `Features/Zavody/Zapis.cs`, ze stejného důvodu jako bodování.
# Přihlášky mock nečísluje, takže dostanou číslo podle pořadí v souboru.
PRIHLASKA_ID = {p["lod"]: i + 1 for i, p in enumerate(D["prihlasky"])}
LOD_PODLE_ID = {i: lod for lod, i in PRIHLASKA_ID.items()}

# Až tady, protože snímek i vazby k lodím potřebují čísla přihlášek.
_nasad_druhy_snimek()
_nasad_vazby()
_nasad_smernice()
_nasad_boje()
_nasad_kody()
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
    return {"prihlaskaId": PRIHLASKA_ID[lod],
            # `LodId` vydává `LodNaZastavceDto` od 4. 10. 2026 a obrazovka
            # přihlášek na něm staví vystavení připojovacího kódu od stolu
            # registrace. Mock ho neposílal, takže se do skrytého pole
            # dostávalo prázdno a každé vystavení skončilo na „Kód se
            # nepovedlo vystavit" (nalezeno 9. 10. 2026 při scénáři F1).
            "lodId": PRIHLASKA_ID[lod],
            "lod": nazvy(lod),
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
            # Přihlášky vede pořadatel; rozhodčí jen vylučuje (`Prihlasky.cs`).
            "smiSpravovat": chyba is None and smi_ted("Organizator", z["slug"]),
            "procNelze": chyba or (None if smi_ted("Organizator", z["slug"]) else
                                   "Přihlášky vede pořadatel regaty. Rozhodčí "
                                   "rozhoduje jen o vyloučení ze závodu."),
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
            # Zapisuje pořadatel. Rozhodčí čísla podepisuje, nesahá do nich —
            # na tom stojí scénář D4, takže důvod musí být vidět na obrazovce.
            "smiZapisovat": chyba is None and smi_ted("Organizator", z["slug"]),
            "procNelze": chyba or (None if smi_ted("Organizator", z["slug"]) else
                                   "Zápis vede pořadatel regaty. Rozhodčí výsledky "
                                   "podepisuje, ale do čísel nesahá."),
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
            "smiPapir": smi_ted("Organizator", z["slug"]), "pocetNavrhu": len(r.get("navrhy", [])),
            # Podoba sady, ze které klient vychází. Posílá ji zpátky při
            # uložení a server tím pozná starší data (nález B).
            "revize": r.get("revize", 0)}


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
    # Kalendář je práce rozhodčího: vypsat regatu, posunout termín, zrušit.
    rozhodci = smi_ted("Rozhodci")
    # Pořadatel **téhle** zastávky. Řádek vidí i pořadatel jiné regaty
    # (kalendář je celoroční), takže se to musí ptát na ni — jinak mu
    # obrazovka nabídne tlačítka a odkazy, které API odmítne. Opsané
    # z `Pohled.Radek` v `KalendarEndpoints`.
    organizator = smi_ted("Organizator", z["slug"])
    return {**{k: z.get(k) for k in
               ("slug", "nazev", "datum", "datumKonce", "typ", "poradatel", "poradi",
                "stav", "puvodniDatum", "publikovano")},
            "smiUpravit": rozhodci, "smiPublikovat": rozhodci, "druh": z["druh"],
            "poradatelSlug": poradatel_zastavky(z)["slug"] if poradatel_zastavky(z) else None,
            "smiMedailonek": bool(poradatel_zastavky(z)) and (rozhodci or organizator),
            "vyhodnoceni": z.get("vyhodnoceni", "PoKategoriich"),
            # Vypsat a odjet patří pořadateli, zbytek řady rozhodčímu
            # (`Kalendar.KdoSmi`).
            "mozneStavy": [s for s in VSECHNY_STAVY
                           if s != z["stav"] and not proc_nejde(z["stav"], s)
                           and (organizator if s in ("Vypsany", "Odjety") else rozhodci)]}


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
    return {"serie": D["slug"], "serieNazev": D["nazev"], "poradatel": p,
            # Zjednodušení proti API: `Medailonek.SmiUpravit` váže pořadatele
            # na jeho vlastní zastávky, tady stačí role v ročníku.
            "smiUpravit": smi_ted("Rozhodci") or smi_ted("Organizator"),
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


# --- Kdo smí do správy ročníku ----------------------------------------------
# Opsané z `Prava.Smi` a `web/lib/co-smim.ts`. <b>Dřív to mock nehlídal</b>
# a přihlášeného bral všude jako pořadatele, takže scénáře o odmítnutí (D4,
# D5, E4) měřily hlášku, ne oprávnění — a skupina D by se dala odjet účtem,
# který na ni právo nemá (oponentura, 8. 10. 2026).
#
# Hlídá se jen `/sprava/**`. Veřejné stránky a osobní cesty `/ja/**` mají
# vlastní pravidla a ta už mock vymáhal podle vztahu k lodi.

# Která udělená role pokrývá tu požadovanou. Rozhodčí není stupeň: nedá ho
# editor ani organizátor, a sám nepokrývá organizátora.
POKRYVA = {
    "Ctenar": {"Ctenar", "Editor", "Organizator", "Rozhodci", "Spravce"},
    "Editor": {"Editor", "Organizator", "Spravce"},
    "Organizator": {"Organizator", "Spravce"},
    "Rozhodci": {"Rozhodci", "Spravce"},
    "Spravce": {"Spravce"},
}

# Pseudorole pro cesty, kam server pouští pořadatele zastávky *nebo*
# rozhodčího ročníku: výsledky, přihlášky, směrnice, medailonky.
NAHLED = "Nahled"


def prava_uctu(kdo):
    """Udělená práva účtu — ročníková i na celý web, v jednom seznamu."""
    if not kdo:
        return []

    return [{"role": o["role"], "zavod": o["zavod"], "web": False}
            for o in OPRAVNENI if o["email"] == kdo["email"]] + [
        {"role": o["role"], "zavod": None, "web": True}
        for o in OPRAVNENI_WEBU if o["email"] == kdo["email"]]


def smi_role(prava, role, zavod=None):
    """Má někdo s těmihle právy na tohle? Opsané z `Prava.Smi`."""
    if role == "Ctenar":
        return True
    if role == NAHLED:
        if smi_role(prava, "Rozhodci"):
            return True
        if zavod is not None:
            return smi_role(prava, "Organizator", zavod)
        # Otázka na celý ročník: pověření k jedné zastávce stačí. Přehled
        # výsledků pouští i pořadatele jediné regaty — `PohledAsync` se ptá
        # `zavody.Count > 0`, ne na právo k celému ročníku.
        return any(u["role"] in POKRYVA["Organizator"] for u in prava)

    for u in prava:
        # Právo na celý web platí všude; pověření k jedné zastávce jen na ni.
        if not u["web"] and u["zavod"] is not None and u["zavod"] != zavod:
            continue
        if u["role"] in POKRYVA[role]:
            return True
    return False


# Práva toho, kdo se právě ptá. Server je jednovláknový (`HTTPServer`, ne
# `ThreadingHTTPServer`), takže jeden požadavek nikdy nepřepíše druhý —
# a DTO se díky tomu nemusí plnit právy skrz pět vrstev argumentů.
KDO_SE_PTA = [[]]


def smi_ted(role, zavod=None):
    """Smí to ten, kdo poslal právě obsluhovaný požadavek?"""
    return smi_role(KDO_SE_PTA[0], role, zavod)


def role_pro_cestu(metoda, cesta):
    """
    Jakou roli ta cesta chce — `(role, zastávka)`, nebo `None`, když se
    nehlídá. Zastávka `None` znamená otázku na celý ročník.

    Workflow výsledků a stav přihlášky tu nejsou: tam role závisí na tom,
    *co* se posílá, a hlídají si to ty handlery samy.
    """
    if cesta.startswith("/sprava/web/clanky"):
        return ("Editor", "web")
    # Role na celý web uděluje a odebírá jen správce webu — na ročníkovou
    # roli se sem nedostane nikdo (`OpravneniEndpoints.SpravceWebu`).
    if cesta.startswith("/sprava/web/opravneni"):
        return ("Spravce", "web")
    if cesta == "/sprava/naklady":
        return ("Spravce", "web")

    zaklad = f'/sprava/serie/{D["slug"]}'
    if not cesta.startswith(zaklad):
        return None
    zbytek = cesta[len(zaklad):]

    if zbytek in ("", "/"):
        return (NAHLED, None)
    if zbytek == "/publikace":
        return ("Spravce", None)
    if zbytek.startswith("/opravneni"):
        return ("Rozhodci", None)
    if zbytek.startswith("/clanky"):
        return ("Editor", None)
    if zbytek.startswith("/lode"):
        # Kód k cizí lodi si pořadatelskou výjimku hlídá sám (`poradatel_kod`).
        return None if zbytek.endswith("/kod") else ("Spravce", None)

    if (m := re.match(r'^/vysledky(?:/([a-z0-9-]+))?', zbytek)):
        zavod = m.group(1)
        if metoda == "GET":
            return (NAHLED, zavod)
        if zbytek.endswith("/publikace"):
            return ("Spravce", None)
        if zbytek.endswith("/stav") or zbytek.endswith("/pohar"):
            return None
        return ("Organizator", zavod)

    if (m := re.match(r'^/zastavky(?:/([a-z0-9-]+))?', zbytek)):
        zavod = m.group(1)
        if "/smernice" in zbytek:
            return (NAHLED, zavod)
        if "/boje" in zbytek:
            # Táž dvojice jako u směrnice: organizátor té regaty, nebo
            # rozhodčí ročníku (`BojeEndpoints.SmiAsync`).
            return (NAHLED, zavod)
        if "/lode" in zbytek:
            # Vyloučení patří rozhodčímu; řeší to `prepni_lod`.
            return (NAHLED, zavod) if metoda == "GET" or zbytek.endswith("/stav") \
                else ("Organizator", zavod)
        # Kalendář. <b>Čtení pouští i pořadatele jediné zastávky</b> —
        # `KalendarEndpoints.PohledAsync` se ptá `zavody.Count > 0` a jen
        # schová tlačítka (`smiKalendar`). Mock tu dřív chtěl rozhodčího na
        # celý ročník, takže pořadatel kalendář vůbec neotevřel a nešlo
        # vyzkoušet, co z něj vidí (9. 10. 2026).
        if metoda == "GET":
            return (NAHLED, None)
        # Zápis do kalendáře: vypsat regatu, posunout termín, zrušit.
        return ("Rozhodci", None)

    if (m := re.match(r'^/poradatele(?:/([a-z0-9-]+))?', zbytek)):
        return (NAHLED, None)

    return None


class H(BaseHTTPRequestHandler):
    # --- Osobní cesty: moje lodě, kódy, připojení, nároky ------------------
    # Opsané z `Features/Lode/KodyEndpoints.cs` a `Features/Identita`. Mock
    # je potřebuje proto, že bez nich se skupina B zkoušky ovládání (kapitán
    # lodi) nedá vyzkoušet vůbec — web volá cesty, které tu nebyly.

    def _kdo_a_lod(self, lod_id, musi_smet=True):
        """(uživatel, chyba už odeslaná?) — 403 jako skutečné API."""
        kdo = self.prihlaseny()
        if musi_smet and not smi_vystavit(lod_id, kdo["id"]):
            self.send_error(403)
            return None
        return kdo

    def moje_lode(self):
        return self.odpoved(moje_lode_dto(self.prihlaseny()["id"]))

    def vystav_kod(self, lod_id):
        if not (kdo := self._kdo_a_lod(lod_id)):
            return None
        return self.odpoved(self._vystav(lod_id, kdo["id"]))

    def _vystav(self, lod_id, kym):
        from datetime import timedelta
        ted = _ted()
        kod = {"kod": novy_kod(), "lodId": lod_id, "vystavilId": kym,
               "vystavenV": _iso(ted),
               "platiDo": _iso(ted + timedelta(minutes=KOD_PLATNOST_MINUT)), "pouzit": 0}
        KODY.append(kod)
        return {"kod": kod["kod"], "platiDo": kod["platiDo"]}

    def poradatel_kod(self, lod_id):
        """
        Pořadatel u registrace, kdy loď ještě kapitána nemá.

        <b>Tahle jediná cesta ve správě roli doopravdy kontroluje.</b> Jinde
        mock přihlášeného bere jako pořadatele, jenže tady je odmítnutí celý
        smysl scénáře: kdo na ročník roli nemá, nesmí k cizí lodi vystavit
        kód. Vyžaduje se **organizátor nebo rozhodčí celého ročníku** —
        pověření k jedné zastávce nestačí, stejně jako v `Prava`.
        """
        kdo = self.prihlaseny()
        smi = any(
            o["email"] == kdo["email"] and o["zavod"] is None
            and o["role"] in ("Organizator", "Rozhodci", "Spravce")
            for o in OPRAVNENI
        ) or any(o["email"] == kdo["email"] and o["role"] == "Spravce"
                 for o in OPRAVNENI_WEBU)
        if not smi:
            return self.send_error(403)

        if lod_id not in PRIHLASKA_ID.values():
            return self.send_error(404)
        return self.odpoved(self._vystav(lod_id, kdo["id"]))

    def pripojeni_lodi(self, lod_id):
        if not self._kdo_a_lod(lod_id):
            return None
        vazby = [v for v in VAZBY if v["lodId"] == lod_id]
        vazby.sort(key=lambda v: (("Majitel", "Kapitan", "Posadka", "Fanousek").index(v["role"]),
                                  v["vzniklaV"]))
        return self.odpoved([pripojeny_dto(v) for v in vazby])

    def odeber_pripojeni(self, lod_id, vazba_id):
        if not self._kdo_a_lod(lod_id):
            return None

        vazba = next((v for v in VAZBY if v["id"] == vazba_id and v["lodId"] == lod_id), None)
        if not vazba:
            return self.chyba(400, "Takové připojení u lodi není.")

        jinych = sum(1 for v in VAZBY if v["lodId"] == lod_id and v["id"] != vazba_id
                     and v["role"] in ("Majitel", "Kapitan"))
        if (chyba := proc_nejde_odebrat(vazba["role"], jinych)):
            return self.chyba(400, chyba)

        # Kdo odebral, se tu **nezapisuje**: kapitánská cesta volá odebrání
        # bez autora, takže `ZmenilId` zůstane prázdné (KodyEndpoints.cs:129).
        # Mock to nemá vylepšovat — zkouška má vidět totéž co provoz.
        zaznamenej_zmenu(lod_id, vazba["uzivatelId"], vazba["role"], None)
        VAZBY.remove(vazba)
        return self._prazdna_odpoved()

    def pripoj_se(self):
        """Uplatnění kódu. Propadlý a vymyšlený musí dát tutéž odpověď."""
        kdo = self.prihlaseny()
        hledany = uprav_kod((self.telo_zadosti() or {}).get("kod"))
        if len(hledany) != KOD_DELKA:
            return self.chyba(400, KOD_NEPLATNY)

        ted = _iso(_ted())
        kod = next((k for k in KODY if k["kod"] == hledany and k["platiDo"] > ted), None)
        if not kod:
            return self.chyba(400, KOD_NEPLATNY)

        _klic, lod = lod_podle_id(kod["lodId"])
        if not lod:
            return self.chyba(400, KOD_NEPLATNY)

        # Kdo už u lodi roli má, o ni zadáním kódu nepřijde.
        if (vazba := vazba_uzivatele(kod["lodId"], kdo["id"])):
            return self.odpoved({"lodId": kod["lodId"], "nazev": lod["nazev"],
                                 "role": vazba["role"], "jizBylo": True})

        VAZBY.append({"id": max([v["id"] for v in VAZBY], default=0) + 1,
                      "lodId": kod["lodId"], "uzivatelId": kdo["id"],
                      "role": ROLE_PRO_NOVEHO, "puvod": "Kod", "vzniklaV": ted,
                      "roleUrcilId": None, "roleUrcenaV": None})
        kod["pouzit"] += 1
        return self.odpoved({"lodId": kod["lodId"], "nazev": lod["nazev"],
                             "role": ROLE_PRO_NOVEHO, "jizBylo": False})

    def podej_narok(self):
        kdo = self.prihlaseny()
        vstup = self.telo_zadosti() or {}
        lod_id = vstup.get("lodId")

        if lod_id not in PRIHLASKA_ID.values():
            return self.chyba(400, "Taková loď tu není.")
        if vazba_uzivatele(lod_id, kdo["id"]):
            return self.chyba(400, NAROK_UZ_PATRIS)

        drivejsi = next((n for n in reversed(NAROKY)
                         if n["lodId"] == lod_id and n["uzivatelId"] == kdo["id"]), None)
        if drivejsi and drivejsi["rozhodnutoV"] is None:
            return self.chyba(400, NAROK_DVAKRAT)
        # Zamítnutí platí: další žádost by byla obcházení kapitánova ne.
        if drivejsi and drivejsi["rozhodnutoV"] and not drivejsi["prijat"]:
            return self.chyba(400, NAROK_ZAMITNUTO)

        poznamka = ((vstup.get("poznamka") or "").strip() or None)
        if poznamka:
            poznamka = poznamka[:POZNAMKA_NEJVIC]
        NAROKY.append({"id": max([n["id"] for n in NAROKY], default=0) + 1,
                       "lodId": lod_id, "uzivatelId": kdo["id"], "poznamka": poznamka,
                       "podanV": _iso(_ted()), "rozhodnutoV": None, "rozhodlId": None,
                       "prijat": False})
        return self._prazdna_odpoved()

    def moje_naroky(self):
        kdo = self.prihlaseny()
        moje = [n for n in NAROKY if n["uzivatelId"] == kdo["id"]]
        moje.sort(key=lambda n: n["podanV"], reverse=True)
        return self.odpoved([muj_narok_dto(n) for n in moje])

    def naroky_lodi(self, lod_id):
        # Totéž právo jako na vystavení kódu: kdo smí někoho přivést, smí
        # i rozhodnout, kdo se hlásí sám.
        if not self._kdo_a_lod(lod_id):
            return None
        cekaji = [n for n in NAROKY if n["lodId"] == lod_id and n["rozhodnutoV"] is None]
        cekaji.sort(key=lambda n: n["podanV"])
        return self.odpoved([narok_dto(n) for n in cekaji])

    def rozhodni_narok(self, lod_id, narok_id):
        if not (kdo := self._kdo_a_lod(lod_id)):
            return None

        narok = next((n for n in NAROKY if n["id"] == narok_id and n["lodId"] == lod_id), None)
        if not narok:
            return self.chyba(400, "Takový nárok u lodi není.")
        if narok["rozhodnutoV"]:
            return self.chyba(400, "O tomhle nároku už je rozhodnuto.")

        prijmout = bool((self.telo_zadosti() or {}).get("prijmout"))
        ted = _iso(_ted())
        narok["rozhodnutoV"], narok["rozhodlId"], narok["prijat"] = ted, kdo["id"], prijmout

        # Přijetí dělá z žadatele **posádku** — kapitána z nikoho nedělá nárok.
        if prijmout and not vazba_uzivatele(lod_id, narok["uzivatelId"]):
            VAZBY.append({"id": max([v["id"] for v in VAZBY], default=0) + 1,
                          "lodId": lod_id, "uzivatelId": narok["uzivatelId"],
                          "role": "Posadka", "puvod": "Narok", "vzniklaV": ted,
                          "roleUrcilId": None, "roleUrcenaV": None})
            # Do historie rolí se přijatý nárok **nezapisuje** — na rozdíl od
            # všech ostatních cest, které roli dávají nebo berou. Posádka
            # vzniklá z nároku tak v historii nemá řádek (NarokNaLod.cs:141).
        return self._prazdna_odpoved()

    def token_nesedi(self):
        """
        Je v hlavičce jméno, které neznáme? Odmítne se hned, na jednom místě.

        Bez hlavičky se nic neodmítá: veřejné stránky mock servíruje i
        nepřihlášenému a na chráněné odpovídají endpointy čtyřistajedničkou
        samy.
        """
        hlavicka = self.headers.get("authorization")
        if not hlavicka:
            return False
        if self.prihlaseny():
            return False

        # Důvod jde jen do těla. Do `WWW-Authenticate` nepatří: hlavičky se
        # kódují latin-1, takže by na první háčkované souhlásce spadl server
        # a z odpovědi by nezbylo nic — ani ta čtyřistajednička.
        self.chyba(401, "Takový účet mock nezná. Jména jsou: "
                        + ", ".join(sorted(TOKENY)) + ".")
        return True

    def prava_nesedi(self):
        """
        Nemá volající na tuhle cestu roli? Odmítne se na jednom místě.

        Běží hned za `token_nesedi`, tedy dřív než kterýkoliv handler.
        Nepřihlášeného nechává projít: čtyřistajedničku na chráněné cestě
        vrací handler sám a tohle pořadí se nemá měnit — jinak by se
        „nepřihlášen" hlásilo jako „nemáš práva".
        """
        KDO_SE_PTA[0] = prava_uctu(self.prihlaseny())

        if not self.headers.get("authorization"):
            return False

        chce = role_pro_cestu(self.command, urlparse(self.path).path)
        if not chce:
            return False

        role, kde = chce
        prava = KDO_SE_PTA[0]
        if kde == "web":
            prava = [u for u in prava if u["web"]]
            kde = None
        if smi_role(prava, role, kde):
            return False

        self.chyba(403, "Na tohle nemáš v ročníku roli.")
        return True

    def prihlaseny(self):
        """
        Kdo volá, nebo `None` u neznámého jména — viz TOKENY.

        Prázdná hlavička se sem nedostane: na ni odpovídají endpointy
        čtyřistajedničkou dřív. Neznámé jméno vrací `None` a volající ho
        odmítne; tiše dosadit správce by při zkoušce ovládání znamenalo měřit
        něco jiného, než co se zadalo.
        """
        hlavicka = self.headers.get("authorization") or ""
        token = hlavicka.split(" ", 1)[-1].strip().lower()
        return TOKENY.get(token)

    def telo_zadosti(self):
        delka = int(self.headers.get("Content-Length", "0") or 0)
        return json.loads(self.rfile.read(delka) or b"{}")

    def telo_zadosti_pamet(self):
        """Tělo, které se dá přečíst víckrát. Ze socketu jde jen jednou."""
        if not hasattr(self, "_telo"):
            self._telo = self.telo_zadosti()
        return self._telo

    def chyba(self, kod, text):
        """Chyba ve tvaru, ve kterém ji vydává API: {"error": "..."}."""
        data = json.dumps({"error": text}, ensure_ascii=False).encode()
        self.send_response(kod)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_PUT(self):
        if self.token_nesedi() or self.prava_nesedi():
            return None
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

        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/lode/(\d+)/kapitan$', cesta)):
            return self.urci_kapitana(int(m.group(1)))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/lode/(\d+)/vazby/(\d+)/role$', cesta)):
            return self.zmen_roli(int(m.group(1)), int(m.group(2)))

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

    # --- Kapitánství -------------------------------------------------------
    # Pravidla opsaná z `Features/Lode/Kapitanstvi.cs`, ze stejného důvodu
    # jako bodování: pravda leží tam a hlídají ji testy, tohle je jen proto,
    # aby šla obrazovka vidět na stroji bez databáze.

    POSLEDNI_ODPOVEDNY = ("Tohle je poslední kapitán lodi. Nejdřív urči jiného, "
                          "pak tohohle odeber.")

    def _lod_nebo_404(self, lod_id):
        if not self.headers.get("authorization"):
            self.send_error(401)
            return None
        klic = LOD_PODLE_ID.get(lod_id)
        if not klic:
            self.send_error(404)
            return None
        return klic

    def _prazdna_odpoved(self):
        self.send_response(204)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def urci_kapitana(self, lod_id):
        if not self._lod_nebo_404(lod_id):
            return None

        kdo = (self.telo_zadosti() or {}).get("uzivatelId")
        if not ucet_podle_id(kdo):
            return self.chyba(400, "Takový účet tu není. Kapitánem jde určit jen "
                                   "někoho, kdo se už přihlásil.")

        ted = ted_iso()
        urcil = self.prihlaseny()["id"]
        vazby = [v for v in VAZBY if v["lodId"] == lod_id]
        novy = next((v for v in vazby if v["uzivatelId"] == kdo), None)

        if novy is None:
            novy = {"id": max([v["id"] for v in VAZBY], default=0) + 1, "lodId": lod_id,
                    "uzivatelId": kdo, "role": "Kapitan", "puvod": "Rucne", "vzniklaV": ted,
                    "roleUrcilId": urcil, "roleUrcenaV": ted}
            VAZBY.append(novy)
            zaznamenej_zmenu(lod_id, kdo, None, "Kapitan", urcil)
        else:
            if novy["role"] not in ("Kapitan", "Majitel"):
                zaznamenej_zmenu(lod_id, kdo, novy["role"], "Kapitan", urcil)
                novy["role"] = "Kapitan"
            novy["roleUrcilId"], novy["roleUrcenaV"] = urcil, ted

        # Dosavadní kapitán spadne na posádku, majitel zůstává majitelem.
        for stara in vazby:
            if stara["uzivatelId"] == kdo or stara["role"] != "Kapitan":
                continue
            zaznamenej_zmenu(lod_id, stara["uzivatelId"], "Kapitan", "Posadka", urcil)
            stara["role"] = "Posadka"
            stara["roleUrcilId"], stara["roleUrcenaV"] = urcil, ted

        return self._prazdna_odpoved()

    def zmen_roli(self, lod_id, vazba_id):
        if not self._lod_nebo_404(lod_id):
            return None

        vazba = next((v for v in VAZBY if v["id"] == vazba_id and v["lodId"] == lod_id), None)
        if not vazba:
            return self.chyba(400, "Takové připojení u lodi není.")

        nova = (self.telo_zadosti() or {}).get("role")
        if nova == "Majitel":
            return self.chyba(400, "Majitele určuje vlastnictví lodi v ročníku, ne tahle "
                                   "obrazovka. Komu má loď patřit, oprav v přihláškách ročníku.")
        if nova not in ("Kapitan", "Posadka", "Fanousek"):
            return self.chyba(400, "Takovou roli loď nezná.")

        jinych = sum(1 for v in VAZBY if v["lodId"] == lod_id and v["id"] != vazba_id
                     and v["role"] in ("Majitel", "Kapitan"))
        if vazba["role"] in ("Majitel", "Kapitan") and nova not in ("Majitel", "Kapitan") \
                and jinych == 0:
            return self.chyba(400, self.POSLEDNI_ODPOVEDNY)

        if vazba["role"] != nova:
            zaznamenej_zmenu(lod_id, vazba["uzivatelId"], vazba["role"], nova,
                             self.prihlaseny()["id"])
        vazba["role"] = nova
        vazba["roleUrcilId"], vazba["roleUrcenaV"] = self.prihlaseny()["id"], ted_iso()
        return self._prazdna_odpoved()

    def odeber_vazbu(self, lod_id, vazba_id):
        if not self._lod_nebo_404(lod_id):
            return None

        vazba = next((v for v in VAZBY if v["id"] == vazba_id and v["lodId"] == lod_id), None)
        if not vazba:
            return self.chyba(400, "Takové připojení u lodi není.")

        jinych = sum(1 for v in VAZBY if v["lodId"] == lod_id and v["id"] != vazba_id
                     and v["role"] in ("Majitel", "Kapitan"))
        if vazba["role"] in ("Majitel", "Kapitan") and jinych == 0:
            return self.chyba(400, self.POSLEDNI_ODPOVEDNY)

        zaznamenej_zmenu(lod_id, vazba["uzivatelId"], vazba["role"], None,
                         self.prihlaseny()["id"])
        VAZBY.remove(vazba)
        return self._prazdna_odpoved()

    def stahni_smernici(self, slug, verze):
        """Opsané z `Features/Smernice/SmerniceSprava.cs`: záznam zůstává,
        soubor mizí. Důvod je povinný."""
        if not self.headers.get("authorization"):
            return self.send_error(401)
        if not self.zastavka(slug):
            return None

        s = next((x for x in SMERNICE.get(slug, []) if x["verze"] == verze), None)
        if not s:
            return self.chyba(400, "Takovou verzi tahle regata nemá.")
        if s["stazenoV"]:
            return self.chyba(400, "Tahle verze je už stažená.")

        duvod = (self.telo_zadosti() or {}).get("duvod") or ""
        if not duvod.strip():
            return self.chyba(400,
                              "Napiš, proč se směrnice stahuje. U dokumentu, podle kterého "
                              "se jede, musí jít po sezóně dohledat, co se odvolalo a proč.")

        s["stazenoV"] = ted_iso()
        s["stahl"] = self.prihlaseny()["zobrazovane"]
        s["duvodStazeni"] = duvod.strip()
        return self._prazdna_odpoved()

    def pipni_boji(self, slug):
        """
        Opsané z `Features/Boje/BojeSprava.PipniAsync`.

        <b>Přenastavení je nový záznam</b> a ten starý se označí za
        nahrazený. Pořadí se po staré bóji převezme, **jméno ne** — to
        chce API vždycky, i když komentář u `PipniAsync` slibuje opak.
        """
        if not self.zastavka(slug):
            return None

        vstup = self.telo_zadosti() or {}
        if (chyba := proc_pipnuti_nejde(vstup)) is not None:
            return self.chyba(400, chyba)

        seznam = BOJE.setdefault(slug, [])
        stara = None
        if (nahrazuje := vstup.get("nahrazujeId")) is not None:
            stara = next((b for b in seznam if b["id"] == nahrazuje), None)
            if not stara:
                return self.chyba(400, "Bóje, kterou chceš přenastavit, u téhle regaty není.")
            if stara["nahrazenaV"] is not None:
                return self.chyba(400, "Tahle bóje už je přenastavená.")

        poradi = vstup.get("poradi") or 0
        if poradi <= 0:
            poradi = stara["poradi"] if stara else \
                max((b["poradi"] for b in seznam), default=0) + 1

        ted = ted_iso()
        BOJE_ID[0] += 1
        nova = {
            "id": BOJE_ID[0], "nazev": (vstup.get("nazev") or "").strip(), "poradi": poradi,
            "sirka": vstup["sirka"], "delka": vstup["delka"],
            "presnostM": vstup.get("presnostM"),
            "postavenaV": ted, "postavil": self.prihlaseny()["zobrazovane"],
            "nahrazenaV": None, "sebrana": False,
            "zdroj": vstup.get("zdroj") or "Telefon",
        }
        seznam.append(nova)
        if stara:
            stara["nahrazenaV"] = ted

        return self.odpoved(boje_dto(nova), 201)

    def nahraj_fotku_boje(self, slug, boje_id):
        """Fotka k bóji. Autora doplní API, souhlas se neptá — je to doklad
        k poloze, ne obrázek na web. Fotek může být u bóje víc."""
        boje = next((b for b in BOJE.get(slug, []) if b["id"] == boje_id), None)
        if not boje:
            return self.chyba(400, "Taková bóje u téhle regaty není.")

        pole, fotka = self.nahrana_fotka()
        if not fotka:
            return None

        data, typ = fotka
        id = uuid.uuid4().hex
        FOTKY[id] = (data, typ)
        adresa = f"http://127.0.0.1:{PORT}/fake-foto/{id}"
        obrazek = {"id": id, "nahled": adresa, "velky": adresa, "sirka": 1600, "vyska": 1067,
                   "autor": self.prihlaseny()["zobrazovane"], "popis": f"Bóje {boje['nazev']}"}
        boje.setdefault("fotky", []).append(obrazek)
        return self.odpoved(obrazek, 201)

    def odeber_fotku_boje(self, slug, boje_id, fotka_id):
        """Odebere jednu fotku bóje. Sebrání bóje fotky nemaže."""
        boje = next((b for b in BOJE.get(slug, []) if b["id"] == boje_id), None)
        if not boje:
            return self.chyba(400, "Taková bóje u téhle regaty není.")

        zbyde = [f for f in boje.get("fotky", []) if f["id"] != fotka_id]
        FOTKY.pop(fotka_id, None)
        boje["fotky"] = zbyde
        return self._prazdna_odpoved()

    def seber_boji(self, slug, boje_id):
        """Razítko, ne smazání — bóje zůstává v historii."""
        if not self.zastavka(slug):
            return None

        b = next((x for x in BOJE.get(slug, []) if x["id"] == boje_id), None)
        if not b:
            return self.chyba(400, "Taková bóje u téhle regaty není.")

        # Druhé sebrání API nepovažuje za chybu; mock se chová stejně.
        if not b["sebrana"]:
            b["sebrana"] = True
        return self._prazdna_odpoved()

    def do_POST(self):
        if self.token_nesedi() or self.prava_nesedi():
            return None
        cesta = urlparse(self.path).path

        # Osobní cesty. Stojí první, protože nepatří pod ročník.
        if not self.headers.get("authorization") and cesta.startswith("/ja"):
            return self.send_error(401)
        if cesta == "/ja/pripojeni":
            return self.pripoj_se()
        if cesta == "/ja/naroky":
            return self.podej_narok()
        if (m := re.match(r'^/ja/lode/(\d+)/kod$', cesta)):
            return self.vystav_kod(int(m.group(1)))
        if (m := re.match(r'^/ja/lode/(\d+)/naroky/(\d+)$', cesta)):
            return self.rozhodni_narok(int(m.group(1)), int(m.group(2)))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/lode/(\d+)/kod$', cesta)):
            return self.poradatel_kod(int(m.group(1)))

        if cesta == f'/sprava/serie/{D["slug"]}/publikace':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            ROCNIK_VENKU[0] = bool(self.telo_zadosti().get("publikovano"))
            return self.odpoved({"slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
                                 "publikovano": ROCNIK_VENKU[0],
                                 "smiPublikovat": smi_ted("Spravce")})
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
        if (m := re.match(
                rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/boje$', cesta)):
            return self.pipni_boji(m.group(1))
        if (m := re.match(
                rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/boje/(\d+)/sebrana$', cesta)):
            return self.seber_boji(m.group(1), int(m.group(2)))
        if (m := re.match(
                rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/boje/(\d+)/fotky$', cesta)):
            return self.nahraj_fotku_boje(m.group(1), int(m.group(2)))
        if (m := re.match(
                rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/smernice/(\d+)/stazeni$',
                cesta)):
            return self.stahni_smernici(m.group(1), int(m.group(2)))
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

        if cesta == '/sprava/web/opravneni':
            return self.udel_na_webu()

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

    def udel_na_webu(self):
        """
        Udělení role na celý web. Opsané z `OpravneniEndpoints.WebUdelAsync`
        a `Udeleni.ProcNejdeNaWebu`: rozsah se nedá zúžit na regatu a projdou
        jen editor a správce. Roli smí dát jen správce webu, a to hlídá
        brána (`role_pro_cestu`) dřív, než se sem dojde.
        """
        if not self.headers.get("authorization"):
            return self.send_error(401)

        vstup = self.telo_zadosti()
        email = (vstup.get("email") or "").strip().lower()
        role = vstup.get("role")

        if vstup.get("zavod"):
            return self.chyba(400, "Právo na celý web se nedá omezit na regatu.")
        if role == "Ctenar":
            return self.chyba(400, "Čtenář se neuděluje: je to každý, i nepřihlášený.")
        if role not in ROLE_WEBU:
            return self.chyba(
                400, f"Role {role} patří k ročníku nebo zastávce, ne k celému webu.")
        if email not in UCTY:
            return self.chyba(404, f"Na e-mail {email} se zatím nikdo nepřihlásil. "
                                   "Účet vzniká až prvním přihlášením, rolí se pozvat nedá.")

        # Druhé udělení téhož není chyba: vrací týž řádek a dvěstěčku.
        stavajici = next((o for o in OPRAVNENI_WEBU
                          if o["email"] == email and o["role"] == role), None)
        if stavajici:
            return self.odpoved(stavajici)

        novy = {"id": novy_id(), "uzivatelId": UCTY[email]["id"],
                "zobrazovane": UCTY[email]["zobrazovane"], "email": email,
                "role": role, "zavod": None,
                "udelenoV": "2026-01-01T00:00:00+00:00"}
        OPRAVNENI_WEBU.append(novy)
        return self.odpoved(novy, 201)

    def odeber_z_webu(self, id_opravneni):
        """
        Opsané z `WebOdeberAsync`: posledního správce webu odebrat nejde —
        tím by se všichni zamkli ven a zpátky by vedl jen importní token.
        """
        if not self.headers.get("authorization"):
            return self.send_error(401)

        o = next((o for o in OPRAVNENI_WEBU if o["id"] == id_opravneni), None)
        if not o:
            return self.send_error(404)
        if o["role"] == "Spravce" \
                and sum(1 for x in OPRAVNENI_WEBU if x["role"] == "Spravce") <= 1:
            return self.chyba(409, "Poslední správce webu se odebrat nedá. "
                                   "Nejdřív udělte roli někomu jinému.")

        OPRAVNENI_WEBU.remove(o)
        return self._prazdna_odpoved()

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
        muze = smi_ted

        if co == "publikace":
            # „Čísla platí" říká rozhodčí, „ať to vidí veřejnost" správce.
            if not muze("Spravce"):
                return self.chyba(403, "Pouštět výsledky ven smí správce ročníku.")
            r["publikovano"] = bool(vstup.get("publikovano"))
            return self.odpoved(rozjizdka_radek(r, zavod))

        if co == "pohar":
            # Dokud jsou čísla rozepsaná, rozhoduje pořadatel; po podpisu rozhodčí.
            if not muze(kdo_smi_do_serie(r["stavVysledku"]), zavod):
                return self.chyba(403, "Na tohle nemáš v ročníku roli.")
            r["doSerie"] = bool(vstup.get("doSerie"))
            return self.odpoved(rozjizdka_radek(r, zavod))

        na, duvod = vstup.get("stav"), (vstup.get("duvod") or "").strip()
        if na in VSECHNY_VYSLEDKY and not muze(kdo_smi_na_stav(na), zavod):
            return self.chyba(403, f'Stav „{NAZVY_VYSLEDKU[na]}" je podpis někoho jiného.')
        if (chyba := proc_nejde_vysledek(r["stavVysledku"], na, muze("Spravce"))):
            return self.chyba(400, chyba)
        if na == "KRevizi" and not duvod:
            return self.chyba(400, "Napiš, co je špatně. Bez důvodu začne ten, "
                                   "kdo to má opravit, hledáním.")

        if na == "KRevizi":
            r["duvodRevize"] = duvod
        r["stavVysledku"] = na
        return self.odpoved(rozjizdka_radek(r, zavod))

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

        # Kontrola revize jako v `Zapis.ProcNejdeUlozitRevizi`: kdo pošle
        # starší podobu sady, neprojde — uložení maže, co v sadě není.
        # Sada bez revize neprojde vůbec: není to „tak tedy bez kontroly",
        # protože sada odeslaná naslepo umí smazat opravu, o které klient
        # nevěděl.
        poslana = self.telo_zadosti_pamet().get("revize")
        if poslana is None:
            return self.chyba(
                400,
                "Zápis přišel bez revize, ze které vycházel, a tím se ukládat nedá — "
                "uložení maže lodě, které v sadě nejsou. Obnov stránku a ulož znovu.")
        if poslana != r.get("revize", 0):
            return self.chyba(
                409,
                "Rozjížďku mezitím uložil někdo jiný, takže tvoje sada vychází ze "
                "starších čísel. Tvůj zápis se nikam neztratil: otevři porovnání "
                "zápisů, podívej se, co se liší, a ulož znovu.")

        radky = []
        for radek in self.telo_zadosti_pamet().get("radky") or []:
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
        self.uloz_snimek(r, self.prihlaseny(), [
            {"prihlaskaId": PRIHLASKA_ID[lod], "poradiVCili": poradi, "kod": kod}
            for lod, _, poradi, kod, _ in radky if poradi is not None or kod])

        # Nová podoba sady — klient, který vyšel ze staré, už neprojde.
        r["revize"] = r.get("revize", 0) + 1

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

        # Pořadatel vede přihlášky, rozhodčí vylučuje — opsané z `Prihlasky.cs`.
        if na == "Vyloucena":
            if not smi_ted("Rozhodci"):
                return self.chyba(403, "O vyloučení ze závodu rozhoduje rozhodčí.")
        elif not smi_ted("Organizator", z["slug"]):
            return self.chyba(403, "Přihlášky vede pořadatel. Rozhodčí jen vylučuje.")

        if (chyba := proc_nejde_prepnout(u["stav"], na, ma_vysledky(z, lod))):
            return self.chyba(400, chyba)
        if na in S_DUVODEM and not duvod:
            return self.chyba(400, "Napiš důvod.")
        from datetime import datetime, timezone
        u.setdefault("historie", []).append(
            {"ze": u["stav"], "na": na, "kdo": self.prihlaseny()["zobrazovane"],
             "duvod": duvod or None,
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
                "muj": n["uzivatelId"] == self.prihlaseny()["id"],
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
        self.uloz_snimek(r, self.prihlaseny(), navrh["radky"])
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
        return self.odpoved(rozjizdka_radek(nova, zavod), 201)

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
            r, "papir", *fotka, self.prihlaseny()["zobrazovane"],
            f"Papírový zápis {cislo}. rozjížďky"))

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

        # Dřív si tahle větev skládala fotku sama a sahala přitom na `data`
        # a `soubor`, které v jejím rozsahu nejsou — spadlo by to na
        # NameError. `uloz_fotku` dělá totéž a dělá to na jednom místě.
        return self.odpoved(self.uloz_fotku(
            vlastnik, "obrazek", *fotka, text("autor"), text("popis") or None))

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
        if self.token_nesedi() or self.prava_nesedi():
            return None
        if (m := re.match(r'^/ja/lode/(\d+)/pripojeni/(\d+)$', urlparse(self.path).path)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            return self.odeber_pripojeni(int(m.group(1)), int(m.group(2)))
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/lode/(\d+)/vazby/(\d+)$',
                          urlparse(self.path).path)):
            return self.odeber_vazbu(int(m.group(1)), int(m.group(2)))

        if (m := re.match(
                rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/boje/(\d+)/fotky/([0-9a-f-]+)$',
                urlparse(self.path).path)):
            return self.odeber_fotku_boje(m.group(1), int(m.group(2)), m.group(3))

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

        if (m := re.match(r'^/sprava/web/opravneni/(\d+)$', urlparse(self.path).path)):
            return self.odeber_z_webu(int(m.group(1)))

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
        if self.token_nesedi() or self.prava_nesedi():
            return None
        rozdelena = urlparse(self.path)
        cesta, dotaz = rozdelena.path, parse_qs(rozdelena.query)

        if (m := re.match(r'^/fake-soubor/(smernice-v\d+\.pdf)$', cesta)):
            # Stažení v API maže soubor z úložiště, takže adresa přestane
            # platit — a právě tohle měří F2. Záznam o verzi zůstává.
            s = next((x for z in SMERNICE.values() for x in z
                      if x["adresa"].endswith("/" + m.group(1))), None)
            if not s or s["stazenoV"]:
                return self.send_error(404)
            data = _pdf(f"Plachetni smernice v{s['verze']} (mock)")
            self.send_response(200)
            self.send_header("Content-Type", "application/pdf")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

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
        elif cesta == "/ja/lode":
            if not self.headers.get("authorization"):
                return self.send_error(401)
            return self.moje_lode()
        elif cesta == "/ja/naroky":
            if not self.headers.get("authorization"):
                return self.send_error(401)
            return self.moje_naroky()
        elif (m := re.match(r'^/ja/lode/(\d+)/pripojeni$', cesta)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            return self.pripojeni_lodi(int(m.group(1)))
        elif (m := re.match(r'^/ja/lode/(\d+)/naroky$', cesta)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            return self.naroky_lodi(int(m.group(1)))
        elif cesta == "/ja":
            # Přihlášený uživatel pro vývoj. Nekontroluje token — na to by
            # tady musel běžet poskytovatel identity, a celý smysl tohohle
            # skriptu je, že běžet nemusí nic. Bez hlavičky se ale tváří
            # jako neznámý, aby šel vyzkoušet i odhlášený stav.
            if not self.headers.get("authorization"):
                return self.send_error(401)
            kdo = self.prihlaseny()
            telo = {
                **kdo,
                # Role se berou z téhož seznamu, který spravuje obrazovka
                # oprávnění — jinak by se odebrání vlastní role neprojevilo
                # v nabídce a stránka by nabízela odkaz, který skončí na 403.
                "opravneni": [{"role": o["role"], "serie": D["slug"], "zavod": o["zavod"]}
                              for o in OPRAVNENI if o["email"] == kdo["email"]],
                # Role na celý web jdou klientovi zvlášť, ne jako právo
                # s prázdnou sérií (`IdentitaEndpoints`, `WebRoleAsync`) —
                # slug ročníku u nich není co vydat.
                "web": [o["role"] for o in OPRAVNENI_WEBU
                        if o["email"] == kdo["email"]],
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
        elif (m := re.match(
                rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/boje$', cesta)):
            if not self.zastavka(m.group(1)):
                return None
            telo = boje_zastavky(m.group(1), dotaz.get("historie", [""])[0] == "true")
        elif (m := re.match(
                rf'^/sprava/serie/{D["slug"]}/zastavky/([a-z0-9-]+)/smernice$', cesta)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            if not self.zastavka(m.group(1)):
                return None
            # Správa vidí i stažené — musí být vidět, co se odvolalo a proč.
            telo = sorted(SMERNICE.get(m.group(1), []),
                          key=lambda x: x["verze"], reverse=True)
        elif cesta == f'/sprava/serie/{D["slug"]}/lode':
            # Lodě ročníku i s vazbami. Ty, které čekají na správce — bez
            # kapitána nebo s kapitánem od kódu — jsou první.
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = sorted(
                (lod_sprava_dto(p["lod"]) for p in D["prihlasky"]),
                key=lambda l: (l["maKapitana"], not l["keKontrole"], l["nazev"]))
        elif (m := re.match(rf'^/sprava/serie/{D["slug"]}/lode/(\d+)$', cesta)):
            if not self.headers.get("authorization"):
                return self.send_error(401)
            klic = LOD_PODLE_ID.get(int(m.group(1)))
            if not klic:
                return self.send_error(404)
            telo = {
                "lod": lod_sprava_dto(klic),
                "zmeny": [zmena_dto(z) for z in reversed(ZMENY_ROLI)
                          if z["lodId"] == PRIHLASKA_ID[klic]],
            }
        elif cesta == f'/sprava/serie/{D["slug"]}':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = {"slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
                    "publikovano": ROCNIK_VENKU[0], "smiPublikovat": smi_ted("Spravce")}
        elif cesta == "/sprava/naklady":
            # Co web stojí. Skutečné API to čte ze souboru platformy, který
            # na vývojovém stroji není — tady je snímek.
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = naklady_dto()
        elif cesta == f'/sprava/serie/{D["slug"]}/vysledky':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            telo = [{"zavod": z["slug"], "nazev": z["nazev"], "datum": z["datum"],
                     "stav": z["stav"], "pocetRozjizdek": len(z["rozjizdky"]),
                     "publikovanych": sum(1 for r in z["rozjizdky"] if r["publikovano"]),
                     "kRevizi": sum(1 for r in z["rozjizdky"]
                                    if r["stavVysledku"] == "KRevizi"),
                     # Na koho se čeká. Podpis rozhodčího je na stavu zápisu,
                     # ne na publikaci: veřejná rozjížďka může čekat zrovna tak.
                     "kPodpisu": sum(1 for r in z["rozjizdky"]
                                     if r["stavVysledku"] in ("Navrzeno", "Overeno",
                                                              "Schvaleno")),
                     "kPublikaci": sum(1 for r in z["rozjizdky"]
                                       if r["stavVysledku"] == "Potvrzeno"
                                       and not r["publikovano"])}
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
                    "rozjizdky": [rozjizdka_radek(r, z["slug"])
                                  for r in z["rozjizdky"]],
                    "smiPridatRozjizdku": proc_nejde_na_zavod(z["stav"], z["druh"]) is None
                    and smi_ted("Organizator", z["slug"])}
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
                "serie": D["slug"], "serieNazev": D["nazev"],
                "smiZalozit": smi_ted("Rozhodci"),
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
        elif cesta == '/sprava/web/opravneni':
            if not self.headers.get("authorization"):
                return self.send_error(401)
            # `PrehledWebuDto` — jen udělená oprávnění a účty, kterým jde
            # roli dát. Zastávky ani `smiNaRocnik` tu nejsou: na celý web
            # se uděluje jedna ze dvou rolí a rozsah se nevybírá. Seznam
            # účtů dostává vždycky, protože sem projde jen správce webu.
            telo = {"opravneni": OPRAVNENI_WEBU,
                    "ucty": sorted(UCTY.values(),
                                   key=lambda u: u["naposledyPrihlasenV"], reverse=True)}
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
                                             key=lambda u: (KAT_PORADI[KAT[u["lod"]]], nazvy(u["lod"])))],
                    # Vyvěšené směrnice, od nejnovější. Stažené se veřejně
                    # nevydávají vůbec, ne jen bez adresy — jako v API:
                    # starší appka na telefonu o stažení neví a odkaz na
                    # odvolaný dokument je to jediné, co se stát nesmí.
                    "smernice": sorted(
                        (x for x in SMERNICE.get(z["slug"], []) if not x["stazenoV"]),
                        key=lambda x: x["verze"], reverse=True)}

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
# Jméno souboru se vypisuje, ne hádá. Hláška dřív říkala 2026-nanecisto
# i tehdy, když se mock pustil s jiným ročníkem — a jediné místo, kde se to
# dá hned poznat, je právě tahle řádka (9. 10. 2026).
print(f"Falešné API z {SOUBOR} ({D['slug']}) na http://127.0.0.1:{PORT}", flush=True)
HTTPServer(("127.0.0.1", PORT), H).serve_forever()
