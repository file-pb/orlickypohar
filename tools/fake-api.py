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
import json, os, re, unicodedata
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

D = json.load(open("data/2026-nanecisto.json", encoding="utf-8"))
LODE = {l["klic"]: l for l in D["lode"]}
OSOBY = {o["klic"]: o for o in D["osoby"]}
KAT = {p["lod"]: p["kategorie"] for p in D["prihlasky"]}
# Kategorie se řadí podle série, ne abecedně — jinak Nad7m předběhne Race.
KAT_PORADI = {k["nazev"]: k["poradi"] for k in D["kategorie"]}

# Kódy v pořadí podle závažnosti; doložené je jen DNF před DNS.
ZAVAZNOST = ["Rdg", "Ret", "Dnf", "Ocs", "Dsq", "Dns", "Dnc"]


def jmeno(klic):
    o = OSOBY[klic]
    return f'{o["jmeno"]} {o["prijmeni"]}'


def body_rozjizdky(vysledky):
    """Body v jedné rozjížďce uvnitř jedné kategorie. Vítěz má 1."""
    dokoncily = sorted(
        (v for v in vysledky if not v.get("kod") and v.get("poradiVCili") is not None),
        key=lambda v: v["poradiVCili"])
    body = {v["lod"]: i + 1 for i, v in enumerate(dokoncily)}

    skupiny = {}
    for v in vysledky:
        if v.get("kod"):
            skupiny.setdefault(v["kod"], []).append(v["lod"])

    misto = len(dokoncily) + 1
    for kod in sorted(skupiny, key=ZAVAZNOST.index):
        for lod in skupiny[kod]:
            body[lod] = misto
        misto += 1
    return body


def vysledky_zavodu(rozjizdky, pocet_skrtu=0):
    """Výsledek závodu po kategoriích: součet bodů se škrty a pořadí."""
    lode = {}
    for r in rozjizdky:
        for kategorie in {KAT[v["lod"]] for v in r["vysledky"]}:
            vysledky = [v for v in r["vysledky"] if KAT[v["lod"]] == kategorie]
            for lod, body in body_rozjizdky(vysledky).items():
                lode.setdefault(lod, (kategorie, []))[1].append(
                    {"cislo": r["cislo"], "body": body, "skrtnuto": False})

    spocteno = []
    for lod, (kategorie, body) in lode.items():
        skrtnout = min(pocet_skrtu, max(len(body) - 1, 0))
        for b in sorted(body, key=lambda b: (-b["body"], -b["cislo"]))[:skrtnout]:
            b["skrtnuto"] = True
        zbylo = [b["body"] for b in body if not b["skrtnuto"]]
        spocteno.append({"lod": lod, "kategorie": kategorie, "body": sum(zbylo),
                         "poradi": 0, "rozjizdky": sorted(body, key=lambda b: b["cislo"]),
                         "_nej": min(zbylo, default=10 ** 6)})

    vysledek = []
    for kategorie in sorted({v["kategorie"] for v in spocteno}, key=KAT_PORADI.get):
        v_kategorii = sorted((v for v in spocteno if v["kategorie"] == kategorie),
                             key=lambda v: (v["body"], v["_nej"], v["lod"]))
        for i, v in enumerate(v_kategorii):
            vysledek.append({**{k: v[k] for k in v if k != "_nej"}, "poradi": i + 1})
    return vysledek


def poradi_serie():
    """Průběžné pořadí po kategoriích, jen z odjetých zastávek."""
    zastavky = [z for z in D["zavody"] if z.get("stav") == "Odjety"]
    zastavky.sort(key=lambda z: z["poradi"])

    body = {}
    for i, z in enumerate(zastavky):
        do_serie = [r for r in z["rozjizdky"] if r["doSerie"]]
        for v in vysledky_zavodu(do_serie, z.get("pocetSkrtu", 0)):
            klic = (v["lod"], v["kategorie"])
            body.setdefault(klic, [None] * len(zastavky))[i] = round(
                (v["poradi"] - 1) * z.get("koeficientDoSerie", 1))

    def serad(lode, klic):
        radek = sorted(lode, key=lambda x: (klic(x), sorted(b for b in x[1] if b is not None), x[0]))
        return {lod: i + 1 for i, (lod, _) in enumerate(radek)}

    kategorie = []
    for k in D["kategorie"]:
        lode = [(lod, b) for (lod, kat), b in body.items() if kat == k["nazev"]]
        soucty, po_skrtu, skrtnuto = {}, {}, {}
        for lod, b in lode:
            cisla = sorted((x for x in b if x is not None), reverse=True)
            soucty[lod] = sum(cisla)
            skrtnuto[lod] = cisla[0] if len(cisla) > 1 else None
            po_skrtu[lod] = soucty[lod] - (skrtnuto[lod] or 0)

        podle_bodu = serad(lode, lambda x: soucty[x[0]])
        podle_skrtu = serad(lode, lambda x: po_skrtu[x[0]])

        kategorie.append({"kategorie": k["nazev"], "lode": [
            {"lod": nazvy(lod),
             "majitel": jmeno(LODE[lod]["majitel"]),
             "zastavky": b,
             "body": soucty[lod], "poradi": podle_bodu[lod],
             "bodyPoSkrtu": po_skrtu[lod], "poradiPoSkrtu": podle_skrtu[lod],
             "skrtnuto": skrtnuto[lod]}
            for lod, b in sorted(lode, key=lambda x: podle_skrtu[x[0]])]})

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
            "zavodNazev": z["nazev"] if z else None}


def nazvy(hodnota):
    """Klíče lodí v odpovědi nahradí jmény, stejně jako to dělá API."""
    return LODE[hodnota]["nazev"]


# Články se řadí od nejnovějšího, stejně jako je vydává API.
def clanky_verejne():
    """Co by na webu viděl návštěvník: jen publikované, od nejnovějšího.

    Čte se z téhož seznamu, do kterého zapisuje administrace — jinak by
    falešné API lhalo právě o tom, co se jím zkouší. Napsaný článek by se
    ve správě objevil a na veřejných stránkách ne, a vypadalo by to jako
    chyba v aplikaci.
    """
    return sorted((c for c in SPRAVA_CLANKY if c["stav"] == "Publikovano"),
                  key=lambda c: c["publikovanoV"], reverse=True)


# Oprávnění žijí v paměti procesu, takže restart je vrátí do výchozího
# stavu. Je to schválně: falešné API nemá mít stav, který někdo omylem
# začne považovat za data. Přihlášený vývojář je tu správcem ročníku
# stejně jako v odpovědi na /ja.
JA = {
    "id": "01927f4e-0000-7000-8000-000000000001",
    "zobrazovane": "Filip Burda",
    "email": "filip@priklad.cz",
}
OPRAVNENI = [{"id": 1, "uzivatelId": JA["id"], "zobrazovane": JA["zobrazovane"],
              "email": JA["email"], "role": "Spravce", "zavod": None,
              "udelenoV": "2026-01-01T00:00:00+00:00"}]
# Účty, kterým jde roli udělit. Skutečné API zná jen ty, kdo se aspoň
# jednou přihlásili — bez toho by se nedal vyzkoušet stav „účet neexistuje",
# a ten je na obrazovce vidět nejčastěji.
UCTY = {JA["email"]: JA["zobrazovane"], "petr@priklad.cz": "Petr Svoboda",
        "jana@priklad.cz": "Jana Nováková"}
JEN_ROCNIK = ("Rozhodci", "Spravce")

# Články pro administraci. Berou se z mocku a dál žijí v paměti procesu —
# restart je vrátí do výchozího stavu, což je při zkoušení obrazovek žádoucí.
# Mock nezná stavy, takže se dopočítají z příznaku publikace.
SPRAVA_CLANKY = [
    {**c, "stav": "Publikovano" if c.get("publikovano") else "Draft"}
    for c in D.get("clanky", [])
]


def bez_diakritiky_slug(text):
    """Tentýž převod jako `Psani.Slug` v API. Opsaný schválně — jinak by se
    obrazovka zkoušela proti jinému pravidlu, než jaké pak platí."""
    prevod = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return "-".join(x for x in "".join(
        z if z.isalnum() else " " for z in prevod.lower()).split())[:120]


def clanek_radek(c):
    z = next((z for z in D["zavody"] if z["slug"] == c.get("zavod")), None)
    return {"slug": c["slug"], "titulek": c["titulek"], "perex": c.get("perex"),
            "autor": c.get("autor"), "publikovanoV": c["publikovanoV"],
            "stav": c["stav"],
            "zavod": z["slug"] if z else None, "zavodNazev": z["nazev"] if z else None}


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
        m = re.match(rf'^/sprava/serie/{D["slug"]}/clanky/([a-z0-9-]+)$', urlparse(self.path).path)
        if not m:
            return self.send_error(404)
        if not self.headers.get("authorization"):
            return self.send_error(401)

        c = next((c for c in SPRAVA_CLANKY if c["slug"] == m.group(1)), None)
        if not c:
            return self.send_error(404)

        vstup = self.telo_zadosti()
        if not (vstup.get("titulek") or "").strip():
            return self.chyba(400, "Článek musí mít titulek.")
        if not (vstup.get("telo") or "").strip():
            return self.chyba(400, "Článek musí mít text.")

        # Slug se schválně nemění — adresa už mohla někam odejít.
        c.update({k: vstup.get(k) for k in ("titulek", "telo", "perex", "autor", "zavod")})
        return self.odpoved(clanek_radek(c))

    def do_POST(self):
        cesta = urlparse(self.path).path

        if cesta == f'/sprava/serie/{D["slug"]}/clanky':
            return self.zaloz_clanek()
        if (m := re.match(rf'^/sprava/serie/{D["slug"]}/clanky/([a-z0-9-]+)/stav$', cesta)):
            return self.prepni_stav(m.group(1))

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
                "uzivatelId": JA["id"], "zobrazovane": UCTY[email], "email": email,
                "role": role, "zavod": zavod, "udelenoV": "2026-01-01T00:00:00+00:00"}
        OPRAVNENI.append(novy)
        return self.odpoved(novy, 201)

    def zaloz_clanek(self):
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
        if any(c["slug"] == slug for c in SPRAVA_CLANKY):
            return self.chyba(400, f"Článek s adresou „{slug}“ už v ročníku je. Změň titulek.")

        # Nový článek je vždycky koncept — stejně jako v API.
        novy = {"slug": slug, "titulek": titulek, "telo": vstup.get("telo"),
                "perex": vstup.get("perex"), "autor": vstup.get("autor"),
                "zavod": vstup.get("zavod"), "stav": "Draft",
                "publikovanoV": "2026-09-11T12:00:00+00:00"}
        SPRAVA_CLANKY.insert(0, novy)
        return self.odpoved(clanek_radek(novy), 201)

    def prepni_stav(self, slug):
        if not self.headers.get("authorization"):
            return self.send_error(401)

        c = next((c for c in SPRAVA_CLANKY if c["slug"] == slug), None)
        if not c:
            return self.send_error(404)

        na = self.telo_zadosti().get("stav")
        if c["stav"] == "Smazano" and na == "Publikovano":
            return self.chyba(400, "Smazaný článek se nejdřív vrátí jako koncept, "
                                   "teprve pak se publikuje.")

        c["stav"] = na
        return self.odpoved(clanek_radek(c))

    def do_DELETE(self):
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

        if cesta == "/serie":
            telo = [{"slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
                     "pocetZavodu": len(D["zavody"])}]
        elif cesta == f'/serie/{D["slug"]}':
            telo = {
                "slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
                "kategorie": D["kategorie"],
                "zavody": [{k: z.get(k) for k in
                            ("slug", "nazev", "datum", "datumKonce", "typ", "poradatel",
                             "poradi", "stav", "puvodniDatum")}
                           for z in D["zavody"]],
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
            }
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
            telo = {**clanek_radek(c), "telo": c["telo"]}
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
            telo = {**clanek_shrnuti(c), "telo": c["telo"]}
        elif (m := re.match(rf'^/serie/{D["slug"]}/zavody/([a-z0-9-]+)$', cesta)):
            z = next((z for z in D["zavody"] if z["slug"] == m.group(1)), None)
            if not z:
                return self.send_error(404)
            kormidelnici = {u["lod"]: u.get("kormidelnik") for u in z["ucasti"]}
            telo = {**{k: z.get(k) for k in
                       ("slug", "nazev", "datum", "datumKonce", "typ", "poradatel",
                        "stav", "puvodniDatum", "pocetSkrtu", "vyhodnoceni",
                        "koeficientDoSerie")},
                    "rozjizdky": [{
                        "cislo": r["cislo"], "startV": r["startV"], "stav": r["stav"],
                        "doSerie": r["doSerie"],
                        "vysledky": [{
                            "lod": nazvy(v["lod"]),
                            "kategorie": KAT[v["lod"]],
                            "kormidelnik": jmeno(kormidelnici[v["lod"]]) if kormidelnici.get(v["lod"]) else None,
                            "poradiVCili": v.get("poradiVCili"),
                            "casSekundy": v.get("casSekundy"),
                            "kod": v.get("kod"),
                        } for v in r["vysledky"]],
                    } for r in z["rozjizdky"]],
                    "poradi": [{**v, "lod": nazvy(v["lod"])}
                               for v in vysledky_zavodu(z["rozjizdky"], z.get("pocetSkrtu", 0))],
                    "lode": [{"lod": nazvy(u["lod"]), "kategorie": KAT[u["lod"]],
                              "kormidelnik": jmeno(u["kormidelnik"]) if u.get("kormidelnik") else None}
                             for u in sorted(z["ucasti"],
                                             key=lambda u: (KAT_PORADI[KAT[u["lod"]]], nazvy(u["lod"])))]}
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
