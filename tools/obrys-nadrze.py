#!/usr/bin/env python3
"""Obrys Orlické nádrže z OpenStreetMap do `web/lib/orlik-obrys.ts`.

<b>Proč statický soubor a ne dotaz za běhu:</b> obrys zátopy se nemění, zato
Overpass odpovídá chybou, kdykoli se mu zachce — ze tří zrcadel mi při psaní
odpověděla jedna. Mapka trati by na něm visela při každém renderu a padala
by s ním.

<b>Spouští se ručně</b>, když je potřeba obrys přegenerovat. Výsledek se
commituje; běh webu ani CI tenhle skript nepotřebuje.

    python3 tools/obrys-nadrze.py
    python3 tools/obrys-nadrze.py odpoved.json   # z uložené odpovědi Overpassu

Data jsou z OpenStreetMap pod ODbL. Atribuce na mapce už je kvůli dlaždicím.
"""

import json
import math
import pathlib
import sys
import urllib.parse
import urllib.request

# Vodní nádrž Orlík. Relace, ne cesta — obrys je složený z pěti otevřených
# úseků, které se musí sešít (proto `sesij` níž).
RELACE = 11_092_220

ZRCADLA = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
)

DOTAZ = f"[out:json][timeout:120];\nrel({RELACE});\nout geom;\n"

# Na kolik metrů se obrys zjednodušuje. Při 20 m zbyde z 7 825 bodů 1 365,
# tedy 26 kB — a ke klientovi stejně nejde nic, mapka je serverová.
TOLERANCE_M = 20.0

# Metry na stupeň na šířce Orlíku. Měřítko stačí hrubé: zjednodušení
# rozhoduje o tom, kde je břeh, ne o navigaci.
METRU_NA_STUPEN = 111_320.0
STREDNI_SIRKA = 49.5


def stahni() -> dict:
    """Geometrie relace z prvního zrcadla, které odpoví. Overpass vrací na
    přetížení HTML se stavem 200, takže se nedá věřit stavovému kódu —
    kontroluje se, že přišel JSON."""
    telo = urllib.parse.urlencode({"data": DOTAZ}).encode()
    posledni = None
    for adresa in ZRCADLA:
        print(f"zkouším {adresa}", file=sys.stderr)
        try:
            pozadavek = urllib.request.Request(
                adresa, data=telo, headers={"User-Agent": "orlickypohar-obrys/1.0"}
            )
            with urllib.request.urlopen(pozadavek, timeout=180) as odpoved:
                data = json.loads(odpoved.read())
            if data.get("elements"):
                return data
            posledni = "odpověď bez prvků"
        except Exception as chyba:  # noqa: BLE001 — chceme jen zkusit další
            posledni = chyba
        print(f"  nepovedlo se: {posledni}", file=sys.stderr)
    raise SystemExit(f"Žádné zrcadlo neodpovědělo. Poslední: {posledni}")


def sesij(useky: list[list[tuple[float, float]]]) -> list[list[tuple[float, float]]]:
    """Otevřené úseky relace do uzavřených kruhů.

    Overpass vrací členy multipolygonu jako jednotlivé cesty, které na sebe
    navazují krajním bodem — a to v libovolném pořadí i směru. Bez sešití
    vyjde pět otevřených čar a test „leží bod ve vodě" na nich dává nesmysl.
    """
    kruhy: list[list[tuple[float, float]]] = []
    zbyva = list(useky)
    while zbyva:
        kruh = zbyva.pop(0)
        while kruh[0] != kruh[-1] and zbyva:
            for i, u in enumerate(zbyva):
                if u[0] == kruh[-1]:
                    kruh = kruh + u[1:]
                elif u[-1] == kruh[-1]:
                    kruh = kruh + u[-2::-1]
                elif u[-1] == kruh[0]:
                    kruh = u[:-1] + kruh
                elif u[0] == kruh[0]:
                    kruh = u[:0:-1] + kruh
                else:
                    continue
                zbyva.pop(i)
                break
            else:
                break
        if kruh[0] != kruh[-1]:
            raise SystemExit("Úseky obrysu se nesešly do kruhu — zkontroluj relaci v OSM.")
        kruhy.append(kruh)
    return kruhy


def _odchylka(p, a, b, mx: float, my: float) -> float:
    ax, ay = a[0] * mx, a[1] * my
    bx, by = b[0] * mx, b[1] * my
    px, py = p[0] * mx, p[1] * my
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def zjednodus(body, tolerance: float, mx: float, my: float):
    """Douglas–Peucker, iterativně. Rekurzí by to na 1 900 bodech sahalo na
    strop zanoření."""
    if len(body) < 3:
        return list(body)
    drz = [False] * len(body)
    drz[0] = drz[-1] = True
    zasoba = [(0, len(body) - 1)]
    while zasoba:
        od, do = zasoba.pop()
        nej, kde = 0.0, od
        for i in range(od + 1, do):
            d = _odchylka(body[i], body[od], body[do], mx, my)
            if d > nej:
                nej, kde = d, i
        if nej > tolerance:
            drz[kde] = True
            zasoba.append((od, kde))
            zasoba.append((kde, do))
    return [b for b, j in zip(body, drz) if j]


def main() -> None:
    # Overpass padá často, tak ať se dá sáhnout po odpovědi, která už došla.
    data = json.loads(pathlib.Path(sys.argv[1]).read_text()) if len(sys.argv) > 1 else stahni()
    prvek = data["elements"][0]
    useky = [[(p["lon"], p["lat"]) for p in m["geometry"]] for m in prvek["members"]]
    print(f"úseků {len(useky)}, bodů {sum(len(u) for u in useky)}", file=sys.stderr)

    kruhy = sesij(useky)
    my = METRU_NA_STUPEN
    mx = my * math.cos(math.radians(STREDNI_SIRKA))
    zjednodusene = [zjednodus(k, TOLERANCE_M, mx, my) for k in kruhy]

    # Pět desetinných míst je přes metr přesně — víc by jen nadouvalo soubor.
    obrys = [[[round(x, 5), round(y, 5)] for x, y in k] for k in zjednodusene]
    text = json.dumps(obrys, separators=(",", ":"))

    # Modul, ne JSON: tak ho vezme Next i `node` při ověřování, bez
    # importních atributů a bez aliasů v cestě.
    kam = pathlib.Path(__file__).resolve().parent.parent / "web" / "lib" / "orlik-obrys.ts"
    kam.write_text(
        "// Generováno `tools/obrys-nadrze.py` z OpenStreetMap "
        f"(relace {RELACE}, ODbL).\n"
        "// Needitovat ručně. Dvojice jsou [délka, šířka], zjednodušeno na "
        f"{TOLERANCE_M:.0f} m.\n"
        "export const OBRYS_ORLIKU: number[][][] = " + text + ";\n",
        encoding="utf-8",
    )
    print(
        f"kruhů {len(obrys)}, bodů {sum(len(k) for k in obrys)}, "
        f"{len(text) / 1024:.1f} kB -> {kam}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
