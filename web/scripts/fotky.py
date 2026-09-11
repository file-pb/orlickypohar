#!/usr/bin/env python3
"""Vyrobí varianty fotek pro úvodní stránku.

**Proč to nedělá Next sám:** jeho `next/image` by to uměl, ale v režimu
`standalone` k tomu potřebuje `sharp` a běhové zpracování obrázků. Tohle
je hrstka fotek, které se mění jednou za sezónu — vyrobit je předem
a poslat je v image je jednodušší a rychlejší než optimalizovat je za běhu.

Dvě úspory, každá jinde:

1. **Formát.** AVIF má při stejné kvalitě zhruba poloviční velikost než JPEG.
2. **Rozměr.** Telefon nemá důvod stahovat 1600 px širokou fotku. Prohlížeč
   si podle `srcset` vezme tu svoji — na displeji 375 px tedy 800px verzi,
   která má šestinu velikosti té největší v JPEG.

Zdrojem jsou `*.jpg` v `web/public/foto/`; ty zůstávají jako záloha pro
prohlížeče bez AVIF.

    python3 web/scripts/fotky.py
"""
import pathlib

from PIL import Image

SLOZKA = pathlib.Path(__file__).resolve().parent.parent / "public" / "foto"
# 400 je náhled do karty článku, zbytek hero a velká fotka v článku.
# Náhled na 800 px by byl čtyřikrát větší, než na co se kouká.
SIRKY = [400, 800, 1200, 1600]
KVALITA = 56


def main():
    # Varianty jsou AVIF, zdroje JPEG — plést se nemůžou.
    for zdroj in sorted(SLOZKA.glob("*.jpg")):
        im = Image.open(zdroj).convert("RGB")
        for sirka in SIRKY:
            if sirka > im.width:
                continue
            vyska = round(sirka * im.height / im.width)
            cil = SLOZKA / f"{zdroj.stem}-{sirka}.avif"
            im.resize((sirka, vyska), Image.LANCZOS).save(cil, quality=KVALITA)
            print(f"  {cil.name}  {sirka}px  {cil.stat().st_size // 1024} kB")


if __name__ == "__main__":
    main()
