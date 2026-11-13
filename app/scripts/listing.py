#!/usr/bin/env python3
"""Grafika do listingu v Google Play.

<b>Kreslí se z týchž křivek jako hlavička webu</b>, ne z kopie. Logo Orlik
Yacht Series i nápis *Orlická série* leží jako cesty v `web/app/
znacka-orlik-yacht-series.ts` a `web/app/znacka-napis.ts`; obojí vyrábí
`web/scripts/logo.py` a `napis.py` z vektoru od rozhodčího. Tenhle skript je
odtamtud čte, takže se obchod s webem nemůže rozejít — a když se logo
překreslí, stačí skript pustit znovu.

Proč ne plachty: značka s plachtami je <b>původní logo</b> poháru
(`web/app/logo-puvodni.tsx`, dnes nepoužité). V hlavičce je od 22. 9. 2026
logo Orlik Yacht Series a do obchodu patří to, co lidé znají z webu.

<b>Světlá verze, protože Play tmavý režim u grafiky nemá.</b> Barvy jsou ty
z `globals.css` pro světlý režim: kruh `#0b5cad`, nápis `#12344e`.

Rozměry nejsou na výběr (support.google.com/googleplay/android-developer/
answer/9866151): ikona přesně 512×512, feature graphic přesně 1024×500.

    python3 scripts/listing.py
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile

KOREN = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(os.path.dirname(KOREN), "web")
VEN = os.path.join(KOREN, "listing")

KRUH = "#0b5cad"
NAPIS = "#12344e"
PAPIR = "#ffffff"

# Rozteč a tloušťka proužků v nápisu. Tytéž hodnoty jako `LOGO.pruhy`
# v `web/app/znacka-loga.ts` — nápis je z vodorovných proužků jako
# námořnické tričko a v jiné rozteči by to byl jiný nápis.
PERIODA, TLOUSTKA = 22, 12

SIR, VYS = 1024, 500
OKRAJ = 75          # Play grafiku v některých místech ořezává
MEZERA_PODIL = 0.28  # mezera mezi kruhem a nápisem, dílem výšky kruhu


def cti(soubor, klic, pole):
    """Vytáhne jednu hodnotu z vygenerovaného TypeScriptu.

    Číst data z `.ts` je ošklivé, ale je to jediný způsob, jak mít logo na
    jednom místě: ty soubory jsou generované z vektoru a web z nich kreslí
    hlavičku. Kopie křivek sem by se rozešla při první úpravě loga.
    """
    text = open(os.path.join(WEB, "app", soubor), encoding="utf-8").read()
    if klic:
        text = text.split(klic, 1)[1]
    nalez = re.search(rf'{pole}:\s*"([^"]+)"', text)
    if not nalez:
        raise SystemExit(f"v {soubor} chybí {klic or ''} {pole} — změnil se tvar souboru?")
    return nalez.group(1)


def svg_banner():
    kruh_vb = cti("znacka-orlik-yacht-series.ts", None, "viewBox")
    kruh_nonzero = cti("znacka-orlik-yacht-series.ts", None, "nonzero")
    kruh_evenodd = cti("znacka-orlik-yacht-series.ts", None, "evenodd")
    napis_vb = cti("znacka-napis.ts", "monitor:", "viewBox")
    napis_d = cti("znacka-napis.ts", "monitor:", "d")

    kx, ky, kw, kh = (float(c) for c in kruh_vb.split())
    nx, ny, nw, nh = (float(c) for c in napis_vb.split())

    # Poměr kruhu a nápisu je z hlavičky webu: kruh 92 px, nápis 30 px
    # (`globals.css`). Banner je tatáž sestava, jen zvětšená.
    vyska_kruhu = 1.0
    vyska_napisu = 30 / 92
    sirka_kruhu = vyska_kruhu * (kw / kh)
    sirka_napisu = vyska_napisu * (nw / nh)
    mezera = MEZERA_PODIL

    sirka_celku = sirka_kruhu + mezera + sirka_napisu
    mira = min((SIR - 2 * OKRAJ) / sirka_celku, (VYS - 2 * OKRAJ) / vyska_kruhu)

    k_vys = vyska_kruhu * mira
    k_sir = sirka_kruhu * mira
    n_vys = vyska_napisu * mira
    n_sir = sirka_napisu * mira
    x = (SIR - sirka_celku * mira) / 2
    # Nápis stojí na střed kruhu, stejně jako v hlavičce.
    ky_ = (VYS - k_vys) / 2
    ny_ = (VYS - n_vys) / 2

    return "".join([
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{SIR}" height="{VYS}" '
        f'viewBox="0 0 {SIR} {VYS}">',
        "<defs>",
        f'<pattern id="pruhy" patternUnits="userSpaceOnUse" width="{PERIODA}" height="{PERIODA}">'
        f'<rect width="{PERIODA}" height="{TLOUSTKA}" fill="{NAPIS}"/></pattern>',
        "</defs>",
        f'<rect width="{SIR}" height="{VYS}" fill="{PAPIR}"/>',
        f'<g transform="translate({x:.2f} {ky_:.2f}) scale({k_vys / kh:.6f}) '
        f'translate({-kx:.2f} {-ky:.2f})" fill="{KRUH}">',
        f'<path d="{kruh_nonzero}"/>',
        f'<path d="{kruh_evenodd}" fill-rule="evenodd"/>',
        "</g>",
        # Proužky musí mít rozteč v souřadnicích nápisu, ne obrázku —
        # jinak by se při zvětšení rozjely. Proto je vzor uvnitř skupiny
        # přepočítaný mírou nápisu.
        f'<g transform="translate({x + k_sir + mezera * mira:.2f} {ny_:.2f}) '
        f'scale({n_vys / nh:.6f}) translate({-nx:.2f} {-ny:.2f})">',
        f'<path d="{napis_d}" fill="url(#pruhy)"/>',
        "</g>",
        "</svg>",
    ])


def rastruj(svg_cesta, png_cesta, sirka, vyska):
    """SVG na PNG tím, co je na stroji.

    Pořadí je podle věrnosti: `cairosvg` a `rsvg-convert` kreslí přesně,
    `qlmanage` je macOS záchrana, která umí jen čtverec a kreslí na bílou —
    proto se výsledek ještě ořízne a posadí na plátno. Když není nic,
    skript to **řekne** a SVG nechá: tiše vydat starý PNG by bylo horší.
    """
    try:
        import cairosvg  # noqa: F401
        subprocess.run([sys.executable, "-c",
                        f"import cairosvg; cairosvg.svg2png(url={svg_cesta!r}, "
                        f"write_to={png_cesta!r}, output_width={sirka}, output_height={vyska})"],
                       check=True)
        return "cairosvg"
    except Exception:
        pass

    if shutil.which("rsvg-convert"):
        subprocess.run(["rsvg-convert", "-w", str(sirka), "-h", str(vyska),
                        "-o", png_cesta, svg_cesta], check=True)
        return "rsvg-convert"

    if shutil.which("qlmanage"):
        # <b>Quick Look umí jen čtvercový náhled.</b> Obdélníkový banner
        # ořízne — poprvé uřízl nápis v půlce slova. Proto se mu podstrčí
        # čtverec, ve kterém banner leží uprostřed, a z výsledku se vyřízne
        # zpátky ten pruh. Složení tím zůstane přesně takové, jaké ho
        # spočítalo SVG.
        from PIL import Image

        strana = max(sirka, vyska)
        posun = (strana - vyska) / 2
        obal = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{strana}" height="{strana}" '
                f'viewBox="0 0 {strana} {strana}">'
                f'<rect width="{strana}" height="{strana}" fill="{PAPIR}"/>'
                f'<g transform="translate(0 {posun})">'
                + open(svg_cesta, encoding="utf-8").read()
                + "</g></svg>")
        with tempfile.TemporaryDirectory() as doc:
            ctverec = os.path.join(doc, "obal.svg")
            with open(ctverec, "w", encoding="utf-8") as soubor:
                soubor.write(obal)
            nasobek = 2
            subprocess.run(["qlmanage", "-t", "-s", str(strana * nasobek), "-o", doc, ctverec],
                           check=True, capture_output=True)
            vyrobene = [f for f in os.listdir(doc) if f.endswith(".png")]
            if not vyrobene:
                return None
            o = Image.open(os.path.join(doc, vyrobene[0])).convert("RGB")

        # Náhled nemusí vyjít přesně na požadovanou stranu, tak se měří.
        m = o.width / strana
        horni = round(posun * m)
        o = o.crop((0, horni, o.width, horni + round(vyska * m)))
        o.resize((sirka, vyska), Image.LANCZOS).save(png_cesta)
        return "qlmanage"

    return None


def main():
    os.makedirs(VEN, exist_ok=True)

    svg_cesta = os.path.join(VEN, "feature-1024x500.svg")
    with open(svg_cesta, "w", encoding="utf-8") as soubor:
        soubor.write(svg_banner())
    print(f"  {svg_cesta}  {SIR}×{VYS}")

    # <b>Ikona do obchodu je ikona appky, ne logo série.</b> Na stránce
    # v Play má stát totéž, co pak uživatel uvidí na ploše telefonu —
    # jinak si po instalaci hledá jinou ikonu, než na kterou klikal.
    # Kdyby měla být i tady značka Orlik Yacht Series, je to změna ikony
    # appky (`ikona.py`), ne jen obchodu.
    from PIL import Image
    zdroj = os.path.join(KOREN, "assets", "images", "icon.png")
    Image.open(zdroj).convert("RGB").resize((512, 512), Image.LANCZOS).save(
        os.path.join(VEN, "ikona-512.png"))
    print(f"  {os.path.join(VEN, 'ikona-512.png')}  512×512  (z ikony appky)")

    png_cesta = os.path.join(VEN, "feature-1024x500.png")
    cim = rastruj(svg_cesta, png_cesta, SIR, VYS)
    if cim:
        print(f"  {png_cesta}  {SIR}×{VYS}  (vykreslil {cim})")
    else:
        print("  PNG nevzniklo: na stroji není cairosvg, rsvg-convert ani qlmanage.")
        print("  SVG je hotové, převeď ho jinde — Play chce PNG nebo JPEG.")


if __name__ == "__main__":
    main()
