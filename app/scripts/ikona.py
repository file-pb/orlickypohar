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

    # Vzadu šedá, jen jako proužek mezi ostatními.
    plachta(k, (300, 150), (556, 512), (330, 496), treti, -60, -20)
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
