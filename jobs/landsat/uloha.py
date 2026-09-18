"""Povrchová teplota Orlíku z Landsatu — plánovaná úloha.

Jednou denně najde nové snímky Landsat 8/9 (Collection 2 Level-2) na
Microsoft Planetary Computer, spočítá teplotu hladiny v deseti oblastech
nádrže a pošle ji do API. Metoda a proč vypadá takhle: README.md vedle.

Když API ještě nic nemá, dopočítá celou historii od OD. Jinak se vrací
o ZPET dní za poslední uložený snímek, protože Level-2 produkty se na
katalogu objevují se zpožděním a občas se přepočítají.

    python uloha.py              # smyčka: hned, pak každý den v HODINA_UTC
    python uloha.py --jednou     # jeden běh a konec
    python uloha.py --nanecisto  # jen vypíše, co by poslal; API nečte ani nepíše
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.request

import numpy as np
import rasterio
from rasterio.warp import transform
from rasterio.windows import Window

# Oblasti, kde se na Orlíku nejvíc plachtí (Filip, 18. 9. 2026), s bodem
# posunutým na nejbližší vodu, která je i při hladině 15 m pod normálem
# aspoň 4 px (~120 m) od břehu. Co tvoří „centrum" ve widgetu, řeší web.
MISTA = {
    "spalenka":     (49.5929, 14.1778),  # Spálenka / hráz
    "trhovky":      (49.5806, 14.1660),  # Klučenice / Lavičky / Trhovky
    "bukovanska":   (49.5636, 14.1551),  # U Bukovanské zátoky
    "vystrkov":     (49.5479, 14.1603),
    "podskali":     (49.5399, 14.1729),
    "radava":       (49.5332, 14.1705),
    "velky-vir":    (49.5251, 14.1673),
    "marina-orlik": (49.5192, 14.1790),
    "zdakov":       (49.5092, 14.1809),
    "husarna":      (49.4672, 14.1824),
}
OKNO = 8    # ±8 px po 30 m kolem bodu
OKRAJ = 3   # eroze masky vody: px od břehu toho dne (termální pixel má ~100 m)
NEJMENE_PIXELU = 3

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
SAS = "https://planetarycomputer.microsoft.com/api/sas/v1/token/landsat-c2-l2"
OD = dt.datetime(2021, 4, 1, tzinfo=dt.timezone.utc)
ZPET = dt.timedelta(days=10)
# Přes zimu nemusí přibýt nic (sníh, mraky) a „poslední uložený" pak stojí
# v říjnu. Bez stropu by každý denní běh přepočítával celou zimu znovu.
NEJDAL = dt.timedelta(days=45)
# Mrakovost celé scény (185 km). Nad Orlíkem může být jasno i při
# zatažené půlce scény; mraky nad vodou vyřadí maska pixel po pixelu.
MRAKY_NEJVIC = 60

API = os.environ.get("API_URL", "http://localhost:5080").rstrip("/")
TOKEN_SOUBOR = os.environ.get("LANDSAT_TOKEN_SOUBOR", "/run/secrets/Landsat__Token")
HODINA_UTC = int(os.environ.get("HODINA_UTC", "13"))
AGENT = "orlickypohar-landsat/1.0 (+https://orlickypohar.klihovka.cz)"


def log(uroven="info", **pole):
    """Strukturovaně na stdout, jeden JSON na řádek (kontrakt platformy)."""
    print(json.dumps({"cas": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
                      "uroven": uroven, **pole}, ensure_ascii=False), flush=True)


def http(url, data=None, hlavicky=None, timeout=60):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": AGENT, **(hlavicky or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


class Podpis:
    """SAS token ke kolekci. Jeden na celou kolekci místo podpisu každého
    souboru — historie jsou stovky souborů a podepisovací služba škrtí."""

    def __init__(self):
        self.token, self.plati_do = None, dt.datetime.min.replace(tzinfo=dt.timezone.utc)

    def __call__(self, href):
        if self.plati_do - dt.datetime.now(dt.timezone.utc) < dt.timedelta(minutes=5):
            t = http(SAS)
            self.token = t["token"]
            self.plati_do = dt.datetime.fromisoformat(t["msft:expiry"].replace("Z", "+00:00"))
        return href + ("&" if "?" in href else "?") + self.token


def hledej(od, do):
    telo = {
        "collections": ["landsat-c2-l2"],
        "intersects": {"type": "Point", "coordinates": [14.18, 49.53]},
        "datetime": f"{od:%Y-%m-%dT%H:%M:%SZ}/{do:%Y-%m-%dT%H:%M:%SZ}",
        "limit": 200,
        "query": {"platform": {"in": ["landsat-8", "landsat-9"]},
                  "eo:cloud_cover": {"lt": MRAKY_NEJVIC}},
    }
    snimky, url, data = [], STAC, telo
    while url:
        r = http(url, json.dumps(data).encode() if data is not None else None,
                 {"Content-Type": "application/json"})
        snimky += r["features"]
        dalsi = next((l for l in r.get("links", []) if l["rel"] == "next"), None)
        url, data = (dalsi["href"], dalsi.get("body")) if dalsi else (None, None)
    return sorted(snimky, key=lambda s: (s["properties"]["datetime"], s["id"]))


def teploty(snimek, podpis):
    """Teplota v každém místě, kde je dost čisté vody daleko od břehu."""
    vysledek = {}
    with rasterio.open(podpis(snimek["assets"]["lwir11"]["href"])) as dst, \
         rasterio.open(podpis(snimek["assets"]["qa_pixel"]["href"])) as dqa:
        for misto, (lat, lon) in MISTA.items():
            xs, ys = transform("EPSG:4326", dst.crs, [lon], [lat])
            r, c = dst.index(xs[0], ys[0])
            w = Window(c - OKNO, r - OKNO, 2 * OKNO + 1, 2 * OKNO + 1)
            t = dst.read(1, window=w, boundless=True, fill_value=0).astype(float)
            q = dqa.read(1, window=w, boundless=True, fill_value=1)

            voda = ((q >> 7) & 1) == 1
            # Eroze: pixel platí, jen když je voda i všude v okolí OKRAJ
            # pixelů. Při nízké hladině se úzká místa vyřadí sama, místo aby
            # do nich prosákl rozpálený břeh (Salaš takhle dávala 36,5 °C).
            daleko = voda.copy()
            for dy in range(-OKRAJ, OKRAJ + 1):
                for dx in range(-OKRAJ, OKRAJ + 1):
                    daleko &= np.roll(np.roll(voda, dy, 0), dx, 1)
            daleko[:OKRAJ, :] = daleko[-OKRAJ:, :] = daleko[:, :OKRAJ] = daleko[:, -OKRAJ:] = False

            # Bity QA_PIXEL: 0 výplň, 1 rozšířený mrak, 3 mrak, 4 stín, 5 sníh.
            cisto = (q & 1) == 0
            for bit in (1, 3, 4, 5):
                cisto &= ((q >> bit) & 1) == 0

            ok = daleko & cisto & (t > 0)
            if ok.sum() >= NEJMENE_PIXELU:
                # ST_B10: kelviny = DN × 0,00341802 + 149,0
                c = t[ok] * 0.00341802 + 149.0 - 273.15
                vysledek[misto] = (round(float(np.median(c)), 1), int(ok.sum()))
    return vysledek


def posledni_ulozeny():
    r = http(f"{API}/vodocet/teplota-hladiny?dni=1", hlavicky={"Accept": "application/json"})
    if not r["snimky"]:
        return None
    return dt.datetime.fromisoformat(r["snimky"][0]["cas"].replace("Z", "+00:00"))


def posli(token, radky):
    return http(f"{API}/vodocet/teplota-hladiny", json.dumps({"mereni": radky}).encode(),
                {"Content-Type": "application/json", "X-Landsat-Token": token})


def beh(nanecisto=False):
    token = None if nanecisto else open(TOKEN_SOUBOR).read().strip()
    ted = dt.datetime.now(dt.timezone.utc)
    posledni = None if nanecisto else posledni_ulozeny()
    od = OD if posledni is None else max(posledni - ZPET, ted - NEJDAL)
    if nanecisto:
        od = ted - dt.timedelta(days=30)
    snimky = hledej(od, ted)
    log(udalost="hledani", od=od.isoformat(), snimku=len(snimky), historie=posledni is None)

    # Sousední scény téhož přeletu (řádky 025 a 026) se nad Orlíkem
    # překrývají a dávají tatáž čísla. Ve widgetu by vypadaly jako dva
    # snímky se změnou nula, takže se slučují do jednoho.
    prelety = {}
    for s in snimky:
        klic = (s["properties"]["platform"], s["properties"]["datetime"][:10])
        prelety.setdefault(klic, []).append(s)

    podpis, poslano, chyb = Podpis(), 0, 0
    for scena in prelety.values():
        hodnoty = {}
        for s in scena:
            try:
                for m, (t, n) in teploty(s, podpis).items():
                    if m not in hodnoty or n > hodnoty[m][1]:
                        hodnoty[m] = (t, n)
            except Exception as e:  # jeden vadný snímek nesmí shodit celý běh
                chyb += 1
                log("warn", udalost="snimek-chyba", snimek=s["id"], chyba=str(e))
        if not hodnoty:
            continue
        s = scena[0]
        radky = [{"snimek": s["id"], "cas": s["properties"]["datetime"], "misto": m,
                  "teplota": t, "pixelu": n} for m, (t, n) in sorted(hodnoty.items())]
        if nanecisto:
            log(udalost="snimek", snimek=s["id"], porizeno=s["properties"]["datetime"],
                teploty={m: t for m, (t, _) in hodnoty.items()})
        else:
            v = posli(token, radky)
            log(udalost="snimek", snimek=s["id"], mist=len(radky), nove=v["nove"], zmenene=v["zmenene"])
        poslano += 1
    log(udalost="hotovo", snimku_s_hodnotou=poslano, chyb=chyb)


def do_pristiho_behu(ted):
    dalsi = ted.replace(hour=HODINA_UTC, minute=0, second=0, microsecond=0)
    if dalsi <= ted:
        dalsi += dt.timedelta(days=1)
    return (dalsi - ted).total_seconds()


def main():
    if "--nanecisto" in sys.argv:
        return beh(nanecisto=True)
    while True:
        try:
            beh()
            cekej = do_pristiho_behu(dt.datetime.now(dt.timezone.utc))
        except Exception as e:
            # Nedostupné API nebo katalog: zkusit za hodinu, ne až zítra.
            log("error", udalost="beh-chyba", chyba=str(e))
            cekej = 3600
        if "--jednou" in sys.argv:
            return
        time.sleep(cekej)


if __name__ == "__main__":
    main()
