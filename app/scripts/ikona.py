#!/usr/bin/env python3
"""Vyrobí ikony a splash appky.

Kreslí se kódem schválně: ikona je pár tvarů a takhle se dá doladit bez
grafického programu — a hlavně je vidět v diffu, co se změnilo. Barvy jsou
z palety webu (`web/app/globals.css`), aby appka a web vypadaly jako jedna věc.

    python3 scripts/ikona.py
"""
from PIL import Image, ImageDraw

VODA_SVETLA = (43, 138, 168)
VODA_TMAVA = (16, 62, 78)
PAPIR = (251, 250, 248)

S = 1024  # kreslí se ve velkém, zmenšuje se až na konci


def pozadi():
    """Svislý přechod, aby ikona nebyla placka."""
    obraz = Image.new("RGB", (S, S), VODA_TMAVA)
    kresli = ImageDraw.Draw(obraz)
    for y in range(S):
        t = y / S
        kresli.line(
            [(0, y), (S, y)],
            fill=tuple(round(a + (b - a) * t) for a, b in zip(VODA_SVETLA, VODA_TMAVA)),
        )
    return obraz


def plachetnice(barva=PAPIR):
    """Loď v náklonu: velká plachta, kosatka, trup a vlna. Na průhledném."""
    vrstva = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    k = ImageDraw.Draw(vrstva)

    # Hlavní plachta — od vrcholu stěžně dolů a doprava.
    k.polygon([(548, 168), (548, 690), (858, 690)], fill=barva)
    # Kosatka — menší, na druhou stranu stěžně, s mezerou.
    k.polygon([(508, 236), (508, 690), (250, 690)], fill=barva)
    # Trup.
    k.polygon([(196, 726), (906, 726), (806, 838), (306, 838)], fill=barva)

    # Vlny pod trupem, aby loď na něčem stála. Krátké a pod ním, ne přes
    # celou šířku — jinak vypadají jako dvě čáry vedle lodi.
    k.rounded_rectangle([(268, 892), (652, 934)], radius=21, fill=barva)
    k.rounded_rectangle([(704, 892), (858, 934)], radius=21, fill=barva)

    # Náklon. Loď, která stojí rovně, vypadá jako v přístavu.
    vrstva = vrstva.rotate(-7, resample=Image.BICUBIC, center=(S / 2, S / 2))
    return usad(vrstva)


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
    lod = plachetnice()

    ikona = pozadi()
    ikona.paste(lod, (0, 0), lod)
    uloz(ikona, "icon.png")
    uloz(ikona, "favicon.png", 96)

    # Splash: jen loď, pozadí si obarví Expo podle app.json.
    uloz(lod, "splash-icon.png")

    # Android maskuje ikonu na kruh a ořízne okraje, takže popředí musí být
    # menší a uprostřed — jinak přijdeš o plachtu.
    uloz(usad(lod, podil=0.58), "android-icon-foreground.png")
    uloz(Image.new("RGB", (S, S), VODA_TMAVA), "android-icon-background.png")

    # Monochromatická verze pro témata Androidu: silueta, žádné pozadí.
    uloz(usad(plachetnice((255, 255, 255)), podil=0.58), "android-icon-monochrome.png")


if __name__ == "__main__":
    main()
