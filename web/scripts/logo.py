#!/usr/bin/env python3
"""Převede logo Orlik Yacht Series z EPS do webových formátů.

Zdrojem je vektor od rozhodčího seriálu, `web/grafika/orlik-yacht-series/`
(CorelDRAW X5). Jeho EPS je jednoduché: dvanáct jednobarevných ploch
z přímek a Bézierových křivek, nic dalšího. Proto se čte přímo tady,
bez Ghostscriptu nebo Inkscapu — ani jeden na stroji není a kvůli
dvanácti cestám by to byla zbytečná závislost.

Corel si v prologu přejmenovává operátory. Používají se tyhle:

    m  moveto      L, l  lineto      C, c  curveto      @c  closepath
    F  výplň podle `/$fm`: 1 = nonzero, 0 = even-odd (`wfill` v prologu)

Barva je v EPS jen jako CMYK 0,96 0,63 0,20 0,36. Převod na RGB závisí na
profilu, takže odstín je změřený z PDF téhož loga vykresleného v macOS
(PDFKit do sRGB kontextu): #113b59. Světlá varianta pro tmavý vzhled
webu bere modrou, kterou tmavý vzhled používal i pro staré logo.

Vyrábí:

    web/app/znacka-orlik-yacht-series.ts        cesty pro kreslení ve stránce
    web/public/logo/orlik-yacht-series/*.svg    samostatné SVG, světlé i tmavé
    web/public/logo/orlik-yacht-series/*.png    PNG s průhledným pozadím
    web/public/logo.png                         512 px, výchozí adresa loga
    web/app/icon.png                            favicon na světlé podložce

    python3 web/scripts/logo.py
"""
import os
import re

from PIL import Image, ImageChops, ImageDraw

WEB = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
ZDROJ = f"{WEB}/grafika/orlik-yacht-series/Logo_Orlik_Yacht_Series_vektor.eps"
CIL = f"{WEB}/public/logo/orlik-yacht-series"

MODRA = "#113b59"          # změřeno z PDF, viz výše
SVETLA = "#7fa7c9"         # tmavý vzhled webu, stejná jako u znaků tříd
PAPIR = (252, 252, 251)    # podložka faviconu, stejná jako u staré ikony
CMYK = "0.96 0.63 0.20 0.36"


def nacti_plochy(cesta):
    """Vrátí seznam ploch: (pravidlo výplně, podcesty), souřadnice v bodech EPS."""
    text = open(cesta, "rb").read().decode("latin-1")
    stranka = text[text.index("%%EndPageSetup"):text.index("%%PageTrailer")]
    stranka = re.sub(r"%[^\n]*", " ", stranka)

    plochy, obrysy, zasobnik, podcesty, cesta_ = [], [], [], [], []
    pravidlo = "nonzero"
    tokeny = stranka.split()
    i = 0
    while i < len(tokeny):
        t = tokeny[i]
        if re.fullmatch(r"-?\d+(\.\d+)?", t):
            zasobnik.append(float(t))
        elif t == "@E":
            obrysy.append(zasobnik[-4:])
            zasobnik = []
        elif t == "/$fm":
            pravidlo = "nonzero" if tokeny[i + 1] == "1" else "evenodd"
            i += 2  # hodnota a `def`
        elif t == "m":
            if cesta_:
                podcesty.append(cesta_)
            cesta_ = [("M", zasobnik[-2:])]
            zasobnik = []
        elif t in ("L", "l"):
            cesta_.append(("L", zasobnik[-2:]))
            zasobnik = []
        elif t in ("C", "c"):
            cesta_.append(("C", zasobnik[-6:]))
            zasobnik = []
        elif t == "@c":
            cesta_.append(("Z", []))
            podcesty.append(cesta_)
            cesta_ = []
        elif t == "F":
            if cesta_:
                podcesty.append(cesta_)
            plochy.append((pravidlo, podcesty))
            podcesty, cesta_ = [], []
        elif t == "create_cmyk_color":
            barva = " ".join(f"{v:.2f}" for v in zasobnik[-4:])
            assert barva == CMYK, f"čekal jsem jednu barvu, je tu i {barva}"
            zasobnik = []
        else:
            # @rax, O, @g, set_solid_fill… nic nekreslí.
            zasobnik = [] if not t.startswith("/") else zasobnik
        i += 1
    # Obrys objektu (`@E`) počítá Corel ze skutečného tvaru, ne z řídicích
    # bodů křivek. Sjednocení obrysů je tedy přesný ořez na obsah.
    ramecek = (min(o[0] for o in obrysy), min(o[1] for o in obrysy),
               max(o[2] for o in obrysy), max(o[3] for o in obrysy))
    return plochy, ramecek


def transformace(ramecek):
    """Posun do počátku a otočení osy y (PostScript má počátek vlevo dole)."""
    x0, y0, x1, y1 = ramecek
    return (lambda x, y: (x - x0, y1 - y)), (x1 - x0, y1 - y0)


def cisla(*v):
    return " ".join(f"{c:.2f}".rstrip("0").rstrip(".") for c in v)


def svg_cesta(podcesty, prevod):
    d = []
    for cesta in podcesty:
        for op, c in cesta:
            body = [prevod(c[k], c[k + 1]) for k in range(0, len(c), 2)]
            d.append(op + cisla(*[v for b in body for v in b]))
    return "".join(d)


def bezier(p0, p1, p2, p3, kroku=24):
    return [
        tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * e
              for a, b, c, e in zip(p0, p1, p2, p3))
        for t in (k / kroku for k in range(1, kroku + 1))
    ]


def maska(plochy, prevod, rozmer, sirka_px):
    """Rastr loga jako maska průhlednosti. Kreslí se čtyřikrát větší a
    zmenšuje se až na konci — to je celé vyhlazování hran.

    Podcesty jedné plochy se skládají přes XOR. Pro even-odd je to přesně
    ono; u nonzero ploch to platí taky, protože se jejich podcesty nekříží
    (dírky v písmenech jsou vnitřní obrysy opačného směru)."""
    nad = 4
    m = sirka_px * nad / rozmer[0]
    velikost = (round(rozmer[0] * m), round(rozmer[1] * m))
    celek = Image.new("L", velikost, 0)
    for _, podcesty in plochy:
        plocha = Image.new("L", velikost, 0)
        for cesta in podcesty:
            body, posledni = [], None
            for op, c in cesta:
                pts = [prevod(c[k], c[k + 1]) for k in range(0, len(c), 2)]
                pts = [(x * m, y * m) for x, y in pts]
                if op in ("M", "L"):
                    body.append(pts[0])
                elif op == "C":
                    body += bezier(posledni, *pts)
                if pts:
                    posledni = pts[-1]
            vrstva = Image.new("L", velikost, 0)
            ImageDraw.Draw(vrstva).polygon(body, fill=255)
            plocha = ImageChops.logical_xor(plocha.convert("1"), vrstva.convert("1")).convert("L")
        celek = ImageChops.lighter(celek, plocha)
    vyska_px = round(sirka_px * rozmer[1] / rozmer[0])
    return celek.resize((sirka_px, vyska_px), Image.LANCZOS)


def obarvi(alfa, hex_):
    rgb = tuple(int(hex_[k:k + 2], 16) for k in (1, 3, 5))
    obraz = Image.new("RGBA", alfa.size, rgb + (0,))
    obraz.putalpha(alfa)
    return obraz


def uloz_png(obraz, cesta, barva=None):
    """Logo je jednobarevné, takže se vejde do palety: 256 průhledností
    jedné barvy, nebo 256 odstínů mezi barvou a podložkou. Beze ztráty
    na hranách a čtvrtinová velikost proti RGBA."""
    if obraz.mode == "RGBA":
        rgb = [int(barva[k:k + 2], 16) for k in (1, 3, 5)]
        p = obraz.getchannel("A").convert("P")
        p.putpalette(rgb * 256)
        p.save(cesta, optimize=True, transparency=bytes(range(256)))
    else:
        obraz.quantize(256).save(cesta, optimize=True)


def main():
    plochy, ramecek = nacti_plochy(ZDROJ)
    prevod, rozmer = transformace(ramecek)
    w, h = rozmer
    viewbox = f"0 0 {cisla(w)} {cisla(h)}"
    nonzero = "".join(svg_cesta(p, prevod) for r, p in plochy if r == "nonzero")
    evenodd = "".join(svg_cesta(p, prevod) for r, p in plochy if r == "evenodd")
    print(f"  {len(plochy)} ploch, rámeček {w:.1f} × {h:.1f} bodů")

    with open(f"{WEB}/app/znacka-orlik-yacht-series.ts", "w", encoding="utf-8") as f:
        f.write(
            "// Vygenerováno web/scripts/logo.py z EPS rozhodčího — needituj ručně, spusť skript.\n\n"
            "export const ORLIK_YACHT_SERIES = {\n"
            f'  viewBox: "{viewbox}",\n'
            f'  nonzero: "{nonzero}",\n'
            f'  evenodd: "{evenodd}",\n'
            "} as const;\n"
        )

    os.makedirs(CIL, exist_ok=True)
    for pripona, barva in (("", MODRA), ("-tmave", SVETLA)):
        with open(f"{CIL}/orlik-yacht-series{pripona}.svg", "w", encoding="utf-8") as f:
            f.write(
                f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">'
                f'<title>Orlik Yacht Series</title>'
                f'<path fill="{barva}" d="{nonzero}"/>'
                f'<path fill="{barva}" fill-rule="evenodd" d="{evenodd}"/></svg>'
            )

    alfa = maska(plochy, prevod, rozmer, 1024)
    for sirka in (1024, 512):
        a = alfa if sirka == 1024 else alfa.resize((sirka, round(sirka * h / w)), Image.LANCZOS)
        uloz_png(obarvi(a, MODRA), f"{CIL}/orlik-yacht-series-{sirka}.png", MODRA)
        uloz_png(obarvi(a, SVETLA), f"{CIL}/orlik-yacht-series-tmave-{sirka}.png", SVETLA)
    # Výchozí adresa loga: čtverec 512 px, jako měl starý /logo.png.
    ctverec = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    ctverec.alpha_composite(obarvi(alfa, MODRA), (0, (1024 - alfa.height) // 2))
    uloz_png(ctverec.resize((512, 512), Image.LANCZOS), f"{WEB}/public/logo.png", MODRA)

    # Favicon na světlé podložce, jinak by tmavě modrý kruh na tmavém panelu
    # prohlížeče zmizel. Logo zabírá skoro celou plochu, v 16 px je každý
    # bod znát.
    ikona = Image.new("RGB", (1024, 1024), PAPIR)
    znak = obarvi(alfa.resize((960, round(960 * h / w)), Image.LANCZOS), MODRA)
    ikona.paste(znak, ((1024 - znak.width) // 2, (1024 - znak.height) // 2), znak)
    uloz_png(ikona.resize((512, 512), Image.LANCZOS), f"{WEB}/app/icon.png")

    for jmeno in sorted(os.listdir(CIL)):
        print(f"  {CIL}/{jmeno}")
    print(f"  {WEB}/public/logo.png\n  {WEB}/app/icon.png\n  {WEB}/app/znacka-orlik-yacht-series.ts")


if __name__ == "__main__":
    main()
