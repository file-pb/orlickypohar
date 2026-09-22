#!/usr/bin/env python3
"""Nápis „Orlická série" vedle loga jako křivky z písma Inter Black.

Vyrábí `web/app/znacka-napis.ts`: jeden řádek pro širší displej a dva řádky
pro úzký mobil. Obrysy písmen bere funkce `obrys_napisu` z
`app/scripts/ikona.py`, aby nápis měl stejné písmo i proužky jako dřív
„Orlický pohár". Velikost písmen odpovídá původnímu nápisu, takže proužky
(perioda 22, tloušťka 12) vyjdou stejně husté.

Rozhodčí 22. 9. 2026: „nápis změň na Orlická série".

    python3 web/scripts/napis.py      (z kořene repozitáře, potřebuje fonttools)
"""
import importlib.util, os, re

koren = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
spec = importlib.util.spec_from_file_location("ikona", os.path.join(koren, "app", "scripts", "ikona.py"))
ikona = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ikona)


def ram(d, okraj):
    """Obdélník kolem cesty podle jejích bodů. Pero z fontTools píše jen
    absolutní M, L, H, V, Q a Z; řídicí body kvadratických křivek z obrysu
    nevyčnívají, takže stačí vzít všechny."""
    xs, ys, x, y = [], [], 0.0, 0.0
    for prikaz, cisla in re.findall(r"([MLHVQZ])([^MLHVQZ]*)", d):
        c = [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?", cisla)]
        if prikaz == "H":
            x = c[-1]; xs.append(x); ys.append(y)
        elif prikaz == "V":
            y = c[-1]; xs.append(x); ys.append(y)
        elif prikaz in "MLQ":
            for i in range(0, len(c), 2):
                x, y = c[i], c[i + 1]; xs.append(x); ys.append(y)
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    return f"{x0 - okraj:.0f} {y0 - okraj:.0f} {x1 - x0 + 2 * okraj:.0f} {y1 - y0 + 2 * okraj:.0f}"


# Výška verzálek jako u původního nápisu: na monitoru 190, na mobilu 105.
vel_monitor = 190 / ikona.VERZALKY
jeden, _ = ikona.obrys_napisu("ORLICKÁ SÉRIE", vel_monitor, 0, vel_monitor * ikona.VERZALKY, proklad=0.01)

vel_mobil = 105 / ikona.VERZALKY
proklad = 0.02
radek = vel_mobil * ikona.VERZALKY
mezera = radek * 0.45
r1, s1 = ikona.obrys_napisu("ORLICKÁ", vel_mobil, 0, radek, "middle", proklad)
r2, _ = ikona.obrys_napisu("SÉRIE", vel_mobil, 0, 2 * radek + mezera, "middle", proklad)
dva = r1 + r2

ts = "\n".join([
    "// Vygenerováno web/scripts/napis.py — needituj ručně, spusť skript.",
    "",
    "export const NAPIS_SERIE = {",
    f'  monitor: {{ viewBox: "{ram(jeden, 4)}", d: "{jeden}" }},',
    f'  mobil: {{ viewBox: "{ram(dva, 4)}", d: "{dva}" }},',
    "} as const;",
    "",
])
with open(os.path.join(koren, "web", "app", "znacka-napis.ts"), "w", encoding="utf-8") as f:
    f.write(ts)
print("monitor", ram(jeden, 4), "| mobil", ram(dva, 4))
