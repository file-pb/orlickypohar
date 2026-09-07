#!/usr/bin/env python3
"""Falešné API pro vizuální kontrolu webu.

Servíruje mock ročník ve stejných tvarech jako skutečné API, ale tváří se,
že je publikovaný. Nesahá tím na produkci, kde vymyšlená data zveřejněná
schválně nejsou.
"""
import json, os, re
from http.server import BaseHTTPRequestHandler, HTTPServer

D = json.load(open("data/2025-mock.json", encoding="utf-8"))
LODE = {l["klic"]: l for l in D["lode"]}
OSOBY = {o["klic"]: o for o in D["osoby"]}
KAT = {p["lod"]: p["kategorie"] for p in D["prihlasky"]}


def jmeno(klic):
    o = OSOBY[klic]
    return f'{o["jmeno"]} {o["prijmeni"]}'


class H(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/serie":
            telo = [{"slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
                     "pocetZavodu": len(D["zavody"])}]
        elif self.path == f'/serie/{D["slug"]}':
            telo = {
                "slug": D["slug"], "nazev": D["nazev"], "rok": D["rok"],
                "kategorie": D["kategorie"],
                "zavody": [{k: z.get(k) for k in
                            ("slug", "nazev", "datum", "datumKonce", "typ", "poradatel", "poradi")}
                           for z in D["zavody"]],
                "prihlasky": [{"lod": LODE[p["lod"]]["nazev"],
                               "cisloPlachty": LODE[p["lod"]]["cisloPlachty"],
                               "typLodi": LODE[p["lod"]]["typ"],
                               "majitel": jmeno(LODE[p["lod"]]["majitel"]),
                               "kategorie": p["kategorie"]} for p in D["prihlasky"]],
            }
        elif (m := re.match(rf'^/serie/{D["slug"]}/zavody/([a-z0-9-]+)$', self.path)):
            z = next((z for z in D["zavody"] if z["slug"] == m.group(1)), None)
            if not z:
                return self.send_error(404)
            kormidelnici = {u["lod"]: u.get("kormidelnik") for u in z["ucasti"]}
            telo = {**{k: z.get(k) for k in
                       ("slug", "nazev", "datum", "datumKonce", "typ", "poradatel",
                        "pocetSkrtu", "vyhodnoceni", "koeficientDoSerie")},
                    "rozjizdky": [{
                        "cislo": r["cislo"], "startV": r["startV"], "stav": r["stav"],
                        "doSerie": r["doSerie"],
                        "vysledky": [{
                            "lod": LODE[v["lod"]]["nazev"],
                            "kategorie": KAT[v["lod"]],
                            "kormidelnik": jmeno(kormidelnici[v["lod"]]) if kormidelnici.get(v["lod"]) else None,
                            "poradiVCili": v.get("poradiVCili"),
                            "casSekundy": v.get("casSekundy"),
                            "kod": v.get("kod"),
                        } for v in r["vysledky"]],
                    } for r in z["rozjizdky"]]}
        else:
            return self.send_error(404)

        data = json.dumps(telo, ensure_ascii=False).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


# Výchozí port je 8080, tedy tentýž, na kterém by běželo skutečné API.
# Web tak nepotřebuje žádné nastavení navíc a postup z README platí
# i v čerstvém klonu, kde .env.local neexistuje.
PORT = int(os.environ.get("PORT", "8080"))
print(f"Falešné API z data/2025-mock.json na http://127.0.0.1:{PORT}", flush=True)
HTTPServer(("127.0.0.1", PORT), H).serve_forever()
