#!/usr/bin/env python3
"""Vyrobí ikony a splash appky.

Kreslí se kódem schválně: značka je pár tvarů a takhle se dá doladit bez
grafického programu — a hlavně je v diffu vidět, co se změnilo.

Tvarosloví je od log závodních tříd (vzorem bylo logo Melges 24 Worlds):
**zahnutá zadní hrana** místo rovného trojúhelníku, **překryv plachet**
s tenkými proužky mezi nimi a **oblouk místo trupu**. Není to obrázek
lodičky, je to značka závodu.

Světlé pozadí je záměr. Domovská obrazovka bývá tmavá nebo fotka, takže
světlá ikona z ní vystoupí; modrá by splynula s tapetou.

    python3 scripts/ikona.py
"""
import math
import os

from PIL import Image, ImageDraw

NAMORNI = (18, 52, 78)
CERVENA = (196, 30, 58)
SEDA = (206, 210, 214)
PAPIR = (252, 252, 251)
BILA = (255, 255, 255)

S = 1024  # kreslí se ve velkém, zmenšuje se až na konci


def bricho(od, do, vydut, kroku=48):
    """Body podél prohnuté hrany.

    Mezi dvěma body se natáhne tětiva a odsadí se do strany podle sinu.
    Kladná hodnota vydouvá ven (plachta pod tlakem), záporná dovnitř —
    a právě záporná dělá ten ostrý cíp, kvůli kterému značka vypadá rychle.
    """
    (x1, y1), (x2, y2) = od, do
    dx, dy = x2 - x1, y2 - y1
    delka = math.hypot(dx, dy) or 1
    nx, ny = -dy / delka, dx / delka

    return [
        (x1 + dx * (i / kroku) - nx * math.sin(math.pi * i / kroku) * vydut,
         y1 + dy * (i / kroku) - ny * math.sin(math.pi * i / kroku) * vydut)
        for i in range(kroku + 1)
    ]


def plachta(k, hlava, rohovnik, pata, barva, lem=-110, spodek=-40):
    """Plachta: vrchol, cíp a pata; zadní hrana a spodek prohnuté dovnitř."""
    body = [hlava] + bricho(hlava, rohovnik, lem) + [rohovnik]
    body += bricho(rohovnik, pata, spodek) + [pata]
    k.polygon(body, fill=barva)


def oblouk(k, od, do, siln, tenky, barva):
    """Tenký oblouk místo trupu — loď se naznačí, nekreslí."""
    k.polygon(bricho(od, do, siln) + list(reversed(bricho(od, do, tenky))), fill=barva)


def znacka(hlavni=NAMORNI, druha=CERVENA, treti=SEDA):
    """Tři plachty v překryvu a oblouk pod nimi. Na průhledném podkladu."""
    vrstva = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    k = ImageDraw.Draw(vrstva)

    # Vzadu šedá, jen jako proužek mezi ostatními. Pata stojí za náběžnou
    # hranou přední plachty: dřív byla o kus vlevo a pod červenou z ní
    # vykukoval tenký šedý klín — v hlavičce pár pixelů, ale vidět (Filip,
    # 15. 9. 2026). Hrany se kříží ve výšce 445, takže pata musí být vpravo
    # od přední plachty už tam.
    plachta(k, (300, 150), (556, 512), (356, 488), treti, -60, -20)
    # Hlavní plachta: nejvyšší, ostrý cíp doprava dolů.
    plachta(k, (600, 96), (920, 516), (462, 466), hlavni, -122, -52)
    # Přední plachta překrývá hlavní; cíp končí nad obloukem, ne v něm.
    plachta(k, (232, 200), (742, 544), (368, 556), druha, -108, -44)

    oblouk(k, (398, 624), (904, 586), 50, 18, hlavni)

    return usad(vrstva, podil=0.82, posun=0.0)


def usad(vrstva, podil=0.74, posun=-0.03):
    """Usadí kresbu doprostřed a nechá kolem ní vzduch.

    iOS ikonu ořezává do zaoblených rohů a Android do kruhu, takže co je
    u kraje, o to přijdeš. Rám se počítá z kresby, ne odhadem — po každé
    úpravě tvarů tak sedí sám.
    """
    ram = vrstva.getbbox()
    if ram is None:
        return vrstva

    kresba = vrstva.crop(ram)
    mira = (S * podil) / max(kresba.width, kresba.height)
    kresba = kresba.resize(
        (max(1, round(kresba.width * mira)), max(1, round(kresba.height * mira))),
        Image.LANCZOS,
    )

    hotovo = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    hotovo.paste(
        kresba,
        ((S - kresba.width) // 2, round((S - kresba.height) / 2 + S * posun)),
        kresba,
    )
    return hotovo


# --- Znaky lodních tříd -----------------------------------------------------
# Filip, 15. 9. 2026: loga tříd jako deriváty hlavní značky — jedna plachta
# v barvě třídy a malé písmeno. Tvary se berou z `znacka()`, ne kreslí znovu,
# aby třída vypadala jako výřez z loga, ne jako jeho napodobenina.
#
# Šedá z loga je jen proužek mezi plachtami; sama na bílém by zmizela.
# Pod7m proto dostává tmavší šedomodrou.
BRIDLICE = (112, 128, 144)

# (plachta: hlava, rohovník, pata, lem, spodek), barva, písmeno, nápis
#
# Barvy přidělil Filip 15. 9. 2026: Race červená, Nad7m tmavě modrá. Tvar
# jde s barvou — každá třída má plachtu, která má v logu její barvu.
TRIDY = {
    "race": (((232, 200), (742, 544), (368, 556), -108, -44), CERVENA, "R", "RACE"),
    "nad7m": (((600, 96), (920, 516), (462, 466), -122, -52), NAMORNI, "N", "NAD 7 m"),
    "pod7m": (((300, 150), (556, 512), (356, 488), -60, -20), BRIDLICE, "P", "POD 7 m"),
}


def body_plachty(hlava, rohovnik, pata, lem, spodek, posun=(0, 0)):
    """Obrys plachty jako body — tentýž, který kreslí `plachta()`."""
    body = [hlava] + bricho(hlava, rohovnik, lem) + [rohovnik]
    body += bricho(rohovnik, pata, spodek) + [pata]
    return [(x + posun[0], y + posun[1]) for x, y in body]


def body_oblouku(od, do, siln, tenky):
    return bricho(od, do, siln) + list(reversed(bricho(od, do, tenky)))


def tvary_tridy(klic):
    """Plachta třídy posunutá nad oblouk tak, aby seděla jako hlavní v logu.

    Menší plachty stojí v logu vlevo; bez posunu by visely mimo oblouk.
    Srovnává se střed spodní hrany s hlavní plachtou.
    """
    (hlava, rohovnik, pata, lem, spodek), barva, _, _ = TRIDY[klic]
    stred = (pata[0] + rohovnik[0]) / 2
    posun = (691 - stred, 516 - max(pata[1], rohovnik[1]))
    return [
        (body_plachty(hlava, rohovnik, pata, lem, spodek, posun), barva),
        (body_oblouku((398, 624), (904, 586), 50, 18), NAMORNI),
    ]


def pismo(velikost):
    """Tučné bezpatkové písmo, pokud je na stroji. Jinak výchozí z Pillow."""
    from PIL import ImageFont

    for cesta in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if os.path.exists(cesta):
            return ImageFont.truetype(cesta, velikost)
    return ImageFont.load_default(size=velikost)


# Písmeno je vodoznak přes celou kresbu (Filip, 15. 9. 2026: „přes to logo
# jako takový vodoznak"). Nad papírem je slabé v barvě třídy, přes plachtu
# a oblouk světlé — takže prosvítá obojím a nepřekryje tvar, podle kterého
# je znak poznat.
VODOZNAK_PAPIR = 0.16
VODOZNAK_PLACHTA = 0.38


def ram_tridy(klic):
    """Rám kresby a místo pro písmeno. Společné pro SVG i PNG, aby oba
    výstupy vypadaly stejně."""
    tvary = tvary_tridy(klic)
    xs = [x for body, _ in tvary for x, _ in body]
    ys = [y for body, _ in tvary for _, y in body]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)

    # Písmeno skoro na celou výšku, posazené do středu kresby. Stojí na
    # účaří u spodku oblouku, takže přes plachtu jde jeho horní část.
    vyska = y1 - y0
    velikost = vyska * 1.0
    stred = ((x0 + x1) / 2, y1 - vyska * 0.04)
    return tvary, velikost, stred, (x0, y0, x1, y1)


def znak_tridy_svg(klic):
    """SVG znaku třídy. Pro web: ostré v každé velikosti a text bere písmo
    systému, takže nepotřebuje soubor s fontem.

    Vodoznak jsou dvě kopie téhož písmena: slabá v barvě třídy přes celou
    plochu a světlá oříznutá tvarem plachty a oblouku.
    """
    tvary, velikost, (sx, sy), (x0, y0, x1, y1) = ram_tridy(klic)
    _, barva, pismeno, _ = TRIDY[klic]
    vyska = y1 - y0

    okraj = vyska * 0.05
    hex_ = lambda c: "#%02x%02x%02x" % c
    body_ = lambda body: " ".join(f"{x:.0f},{y:.0f}" for x, y in body)
    text = lambda vypln, pruhlednost, orez="": (
        f'<text x="{sx:.0f}" y="{sy:.0f}" text-anchor="middle" font-size="{velikost:.0f}" '
        'font-family="system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif" '
        f'font-weight="900" fill="{vypln}" fill-opacity="{pruhlednost}"{orez}>{pismeno}</text>'
    )

    casti = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'
        f'{x0 - okraj:.0f} {y0 - okraj:.0f} {(x1 - x0) + 2 * okraj:.0f} {vyska + 2 * okraj:.0f}">',
        f'<defs><clipPath id="tvar-{klic}">'
        + "".join(f'<polygon points="{body_(body)}"/>' for body, _ in tvary)
        + "</clipPath></defs>",
        text(hex_(barva), VODOZNAK_PAPIR),
    ]
    casti += [f'<polygon fill="{hex_(c)}" points="{body_(body)}"/>' for body, c in tvary]
    casti.append(text("#ffffff", VODOZNAK_PLACHTA, f' clip-path="url(#tvar-{klic})"'))
    casti.append("</svg>")
    return "".join(casti)


def znaky_trid_ts():
    """Tvary znaků pro web jako data.

    Web znak kreslí přímo do stránky, ne přes <img>: jen tak mu CSS dá
    barvu podle světlého a tmavého režimu a pozadí zůstane průhledné.
    Přes <img> by tmavě modrá plachta v tmavém režimu zmizela a jediná
    záchrana byla světlá podložka — tu Filip 15. 9. 2026 nechtěl.
    """
    body_ = lambda body: " ".join(f"{x:.0f},{y:.0f}" for x, y in body)
    radky = [
        "// Vygenerováno app/scripts/ikona.py — needituj ručně, spusť skript.",
        "",
        "export const ZNAKY_TRID = {",
    ]
    for klic in TRIDY:
        tvary, velikost, (sx, sy), (x0, y0, x1, y1) = ram_tridy(klic)
        vyska = y1 - y0
        okraj = vyska * 0.05
        radky += [
            f"  {klic}: {{",
            f'    viewBox: "{x0 - okraj:.0f} {y0 - okraj:.0f} {(x1 - x0) + 2 * okraj:.0f} {vyska + 2 * okraj:.0f}",',
            f'    plachta: "{body_(tvary[0][0])}",',
            f'    oblouk: "{body_(tvary[1][0])}",',
            f'    pismeno: {{ text: "{TRIDY[klic][2]}", x: {sx:.0f}, y: {sy:.0f}, velikost: {velikost:.0f} }},',
            "  },",
        ]
    radky += ["} as const;", ""]
    return "\n".join(radky)


def znak_tridy_png(klic, velikost=512):
    """PNG téhož znaku — pro appku a pro náhled. Kreslí se z týchž bodů."""
    tvary, vel, (sx, sy), (x0, y0, x1, y1) = ram_tridy(klic)
    _, barva, pismeno, _ = TRIDY[klic]
    f = pismo(round(vel))

    # Maska písmena, maska tvarů — a z nich dvě vrstvy vodoznaku.
    maska_pismena = Image.new("L", (S, S), 0)
    ImageDraw.Draw(maska_pismena).text((sx, sy), pismeno, font=f, fill=255, anchor="ms")
    maska_tvaru = Image.new("L", (S, S), 0)
    kt = ImageDraw.Draw(maska_tvaru)
    for body, _ in tvary:
        kt.polygon(body, fill=255)

    obraz = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    papir = Image.new("RGBA", (S, S), barva + (0,))
    papir.putalpha(maska_pismena.point(lambda a: round(a * VODOZNAK_PAPIR)))
    obraz.alpha_composite(papir)

    k = ImageDraw.Draw(obraz)
    for body, c in tvary:
        k.polygon(body, fill=c)

    svetla = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    prunik = Image.composite(maska_pismena, Image.new("L", (S, S), 0), maska_tvaru)
    svetla.putalpha(prunik.point(lambda a: round(a * VODOZNAK_PLACHTA)))
    obraz.alpha_composite(svetla)

    return usad(obraz, podil=0.86, posun=0.0).resize((velikost, velikost), Image.LANCZOS)


def uloz(obraz, jmeno, velikost=S):
    cesta = f"assets/images/{jmeno}"
    obraz.resize((velikost, velikost), Image.LANCZOS).save(cesta)
    print(f"  {cesta}  {velikost}×{velikost}")


def main():
    mark = znacka()

    # Web bere tutéž značku: jedna kresba, ne dvě podobné. Průhledné pozadí,
    # protože v hlavičce stojí na papíru stránky.
    web = "../web"
    if os.path.isdir(web):
        mark.resize((512, 512), Image.LANCZOS).save(f"{web}/public/logo.png")
        print(f"  {web}/public/logo.png  512×512")

        # Favicon webu — s podkladem, aby byl vidět i na tmavém panelu.
        ikona_webu = Image.new("RGB", (S, S), PAPIR)
        ikona_webu.paste(mark, (0, 0), mark)
        ikona_webu.resize((512, 512), Image.LANCZOS).save(f"{web}/app/icon.png")
        print(f"  {web}/app/icon.png  512×512")

        # Znaky lodních tříd. Soubor se jmenuje podle kategorie bez
        # diakritiky a malými písmeny — tak ho web najde podle názvu.
        os.makedirs(f"{web}/public/tridy", exist_ok=True)
        for klic in TRIDY:
            with open(f"{web}/public/tridy/{klic}.svg", "w", encoding="utf-8") as soubor:
                soubor.write(znak_tridy_svg(klic))
            print(f"  {web}/public/tridy/{klic}.svg")

        # Tytéž tvary jako data, web je kreslí přímo do stránky.
        with open(f"{web}/app/znaky-trid.ts", "w", encoding="utf-8") as soubor:
            soubor.write(znaky_trid_ts())
        print(f"  {web}/app/znaky-trid.ts")

    ikona = Image.new("RGB", (S, S), PAPIR)
    ikona.paste(mark, (0, 0), mark)
    uloz(ikona, "icon.png")
    uloz(ikona, "favicon.png", 96)

    # Splash: značka na průhledném, pozadí obarví Expo podle app.json.
    uloz(mark, "splash-icon.png")

    # Android maskuje ikonu na kruh a ořezává okraje, takže popředí musí být
    # menší a uprostřed — jinak přijdeš o cípy plachet.
    uloz(usad(znacka(), podil=0.58, posun=0.0), "android-icon-foreground.png")
    uloz(Image.new("RGB", (S, S), PAPIR), "android-icon-background.png")

    # Monochromatická vrstva je jednobarevná maska, takže tři plachty přes
    # sebe by splynuly v jednu skvrnu. Kreslí se proto jen hlavní plachta
    # a oblouk — tvar zůstane poznat.
    silueta = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    k = ImageDraw.Draw(silueta)
    plachta(k, (600, 96), (920, 516), (462, 466), BILA, -122, -52)
    oblouk(k, (398, 624), (904, 586), 50, 18, BILA)
    uloz(usad(silueta, podil=0.58, posun=0.0), "android-icon-monochrome.png")


if __name__ == "__main__":
    main()
