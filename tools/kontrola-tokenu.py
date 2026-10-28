#!/usr/bin/env python3
"""Dvě kontroly nad barevnými tokeny webu. Bez závislostí, bez prohlížeče.

Proč to existuje: platforma 28. 10. 2026 odmítla závazný design systém
a přijala místo něj dvě kontroly (`platform/docs/KRAJINA-2026.md`, oddíl
*Design, ergonomie a přístupnost*). Důvod je v téhle rodině repozitářů
opakovaný: pravidlo, u kterého není vidět, čím se pozná, že je porušené,
není pravidlo, ale komentář.

  1. SHODA — appka drží v `app/src/constants/theme.ts` vlastní kopii barev
     webu. Hodnoty dnes sedí, ale synchronizace držela na komentáři.
  2. KONTRAST — poměr kontrastu je číslo spočitatelné z barev, takže WCAG
     2.2 AA se u nich dá doložit bez prohlížeče, bez axe a bez minuty CI.

**Jeden soubor schválně.** Obě kontroly čtou tytéž tři bloky z `globals.css`,
takže dva skripty by ten parser kopírovaly — a kopie hodnot bez kontroly je
právě to, co kontrola 1 hlídá.

Nic tady nedrží seznam očekávaných barev: hodnoty se čtou z obou souborů.
Jediné, co skript o jménech ví, je převod `stavVypsany` → `--stav-vypsany`,
a to je pravidlo, ne tabulka.

    python3 tools/kontrola-tokenu.py            # obojí
    python3 tools/kontrola-tokenu.py --shoda    # jen první
    python3 tools/kontrola-tokenu.py --kontrast # jen druhá

Návratový kód 0 = projde, 1 = rozchod nebo podkročený kontrast,
2 = kontrola sama nemá co měřit (prázdný vstup, přejmenovaný blok).
Ten třetí kód je tu proto, aby se kontrola nedala utišit smazáním vstupu.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
CSS = KOREN / "web" / "app" / "globals.css"
THEME = KOREN / "app" / "src" / "constants" / "theme.ts"

# Tři bloky, ve kterých web definuje barvy. Komentář v `globals.css` to říká
# takhle: tmavý vzhled platí, když je tmavý systém a web není přepnutý na
# světlo, nebo když je tmavý vynucený z přepínače — proto má každé tmavé
# pravidlo dvě podoby a obě musí zůstat stejné.
SVETLY = "světlý"
TMAVY_SYSTEM = "tmavý (systém)"
TMAVY_PREPINAC = "tmavý (přepínač)"


# ---------------------------------------------------------------- parser CSS

def _bez_komentaru(text: str) -> str:
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def bloky(css: str) -> list[tuple[tuple[str, ...], str]]:
    """Rozloží CSS na (cesta vnořených selektorů, vlastní deklarace bloku).

    Stačí počítat závorky — nejde o obecný CSS parser, jen o to vědět, který
    `:root` leží v `@media (prefers-color-scheme: dark)`. Text před `{` se
    dělí na posledním středníku: co je za ním, je selektor vnořeného bloku,
    co před ním, patří ještě rodiči.
    """
    vysledek: list[tuple[tuple[str, ...], str]] = []
    zasobnik: list[tuple[str, list[str]]] = []
    buf: list[str] = []

    for znak in css:
        if znak == "{":
            text = "".join(buf)
            buf = []
            rez = text.rfind(";")
            vlastni, selektor = (text[: rez + 1], text[rez + 1 :]) if rez >= 0 else ("", text)
            if zasobnik and vlastni:
                zasobnik[-1][1].append(vlastni)
            zasobnik.append((" ".join(selektor.split()), []))
        elif znak == "}":
            if not zasobnik:
                buf = []
                continue
            selektor, casti = zasobnik.pop()
            casti.append("".join(buf))
            buf = []
            cesta = tuple(s for s, _ in zasobnik) + (selektor,)
            vysledek.append((cesta, "".join(casti)))
        else:
            buf.append(znak)

    return vysledek


def _deklarace(telo: str) -> list[tuple[str, str]]:
    out = []
    for cast in telo.split(";"):
        if ":" not in cast:
            continue
        jmeno, _, hodnota = cast.partition(":")
        out.append((jmeno.strip(), hodnota.strip()))
    return out


def sady_z_css(css: str) -> dict[str, dict[str, str]]:
    """Pro každý ze tří kontextů vrátí tokeny tak, jak je uvidí prohlížeč.

    Tmavé kontexty dědí ze světlého — proto se do nich světlý nejdřív
    nakopíruje. Bez toho by `--na-pozoru`, který se v tmavých blocích
    schválně nepřebíjí, v tmavém kontextu chyběl.
    """
    svetly: dict[str, str] = {}
    tmavy_system: dict[str, str] = {}
    tmavy_prepinac: dict[str, str] = {}

    for cesta, telo in bloky(_bez_komentaru(css)):
        selektor = cesta[-1]
        v_tmavem_media = any("prefers-color-scheme: dark" in c for c in cesta[:-1])
        if selektor == ":root" and not v_tmavem_media:
            cil = [svetly]
        elif v_tmavem_media and selektor == ':root:not([data-rezim="svetly"])':
            cil = [tmavy_system]
        elif selektor == ':root[data-rezim="tmavy"]':
            cil = [tmavy_prepinac]
        else:
            continue
        for jmeno, hodnota in _deklarace(telo):
            if jmeno.startswith("--"):
                for sada in cil:
                    sada[jmeno] = hodnota

    return {
        SVETLY: svetly,
        TMAVY_SYSTEM: {**svetly, **tmavy_system},
        TMAVY_PREPINAC: {**svetly, **tmavy_prepinac},
    }


def rozvin(sada: dict[str, str], hodnota: str, hloubka: int = 0) -> str:
    """`var(--pozor)` → skutečná hodnota. V tmavém režimu je tak zapsané
    `--pozor-pismo`, takže bez rozvinutí by z něj nešlo spočítat nic."""
    if hloubka > 8:
        return hodnota
    m = re.fullmatch(r"var\(\s*(--[\w-]+)\s*\)", hodnota.strip())
    if m and m.group(1) in sada:
        return rozvin(sada, sada[m.group(1)], hloubka + 1)
    return hodnota


# ------------------------------------------------------------------- barvy

def na_rgb(hodnota: str) -> tuple[int, int, int] | None:
    """Neprůhledná barva → (r, g, b). Jinak None.

    Alfa, gradienty a stíny (`--plocha-hlasi`, `--obrys-hlasi`) vrací None
    schválně: poměr kontrastu nad průhlednou vrstvou záleží na tom, co je
    pod ní, a to z tokenu nevyčteš.
    """
    h = hodnota.strip()
    m = re.fullmatch(r"#([0-9a-fA-F]{3})", h)
    if m:
        return tuple(int(z * 2, 16) for z in m.group(1))  # type: ignore[return-value]
    m = re.fullmatch(r"#([0-9a-fA-F]{6})", h)
    if m:
        return tuple(int(m.group(1)[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]
    m = re.fullmatch(r"rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*\)", h)
    if m:
        return tuple(int(round(float(x))) for x in m.groups())  # type: ignore[return-value]
    return None


def jas(rgb: tuple[int, int, int]) -> float:
    """Relativní svítivost podle WCAG 2.2 (definice *relative luminance*)."""
    slozky = []
    for hodnota in rgb:
        c = hodnota / 255
        slozky.append(c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4)
    r, g, b = slozky
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def kontrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    ja, jb = jas(a), jas(b)
    svetlejsi, tmavsi = max(ja, jb), min(ja, jb)
    return (svetlejsi + 0.05) / (tmavsi + 0.05)


# ------------------------------------------------- kontrola 1: shoda s appkou

def barvy_z_theme(ts: str) -> dict[str, dict[str, str]]:
    """Vytáhne z `theme.ts` obě sady. Hodnoty se čtou, nic se nepředpokládá."""
    sady: dict[str, dict[str, str]] = {}
    for rezim in ("light", "dark"):
        m = re.search(rezim + r"\s*:\s*\{(.*?)\}", ts, flags=re.S)
        if not m:
            continue
        sada = {}
        for jmeno, hodnota in re.findall(r"(\w+)\s*:\s*'([^']*)'", m.group(1)):
            sada[jmeno] = hodnota
        if sada:
            sady[rezim] = sada
    return sady


def na_token(klic: str) -> str:
    """`stavVypsany` → `--stav-vypsany`. Pravidlo, ne tabulka."""
    return "--" + re.sub(r"(?<!^)(?=[A-Z])", "-", klic).lower()


def kontrola_shoda(css: str, ts: str) -> tuple[list[str], list[str], int]:
    """Vrátí (chyby, poznámky, počet porovnaných hodnot)."""
    chyby: list[str] = []
    poznamky: list[str] = []
    sady = sady_z_css(css)
    appka = barvy_z_theme(ts)

    # Dva tmavé bloky musí zůstat stejné — `globals.css` si to u nich říká
    # samo a rozejít se mohou jenom tam.
    def _norm(h: str | None) -> str | None:
        # Víceřádkové stíny se v obou blocích odsazují jinak; rozchod je
        # o hodnotách, ne o mezerách.
        return None if h is None else " ".join(h.split())

    rozdil = {
        t for t in set(sady[TMAVY_SYSTEM]) | set(sady[TMAVY_PREPINAC])
        if _norm(sady[TMAVY_SYSTEM].get(t)) != _norm(sady[TMAVY_PREPINAC].get(t))
    }
    for token in sorted(rozdil):
        chyby.append(
            f"tmavé bloky se rozešly v {token}: "
            f"{TMAVY_SYSTEM} = {sady[TMAVY_SYSTEM].get(token, '—')}, "
            f"{TMAVY_PREPINAC} = {sady[TMAVY_PREPINAC].get(token, '—')}"
        )

    # Obě sady appky musí mít tytéž klíče. `theme.ts` si to u sebe slibuje
    # komentářem, ale **nic to nevynucuje**: typ `Barvy` se odvozuje jen ze
    # světlé sady, takže ubraná barva v té tmavé projde i typovou kontrolou
    # a `t.linka` je za běhu `undefined` — jen v tmavém vzhledu.
    #
    # Bez tohohle se dá celá kontrola 1 utišit ubráním: smyčka níž jde od
    # appky k webu, takže na klíč, který v appce není, se nikdo nezeptá
    # (doloženo sabotáží 28. 10. 2026 — smazání `linka` prošlo se zelenou).
    #
    # Zbývá případ „ubráno z obou sad", a ten **hlídá typová kontrola**:
    # klíč zmizí z `Barvy` a všech 107 míst, kde appka na barvu sahá,
    # přestane kompilovat. Změřeno na smazané `linka`: 7 → 16 chyb `tsc`,
    # devět nových a každá `Property 'linka' does not exist on type 'Barvy'`.
    # CI `tsc --noEmit` v appce pouští, takže sem to doplňovat nepatří.
    klice = {rezim: set(sada) for rezim, sada in appka.items()}
    if len(klice) == 2:
        for rezim, druhy in (("light", "dark"), ("dark", "light")):
            for klic in sorted(klice[rezim] - klice[druhy]):
                chyby.append(
                    f"appka má {rezim}.{klic}, ale v sadě {druhy} ta barva "
                    f"chybí — sady se rozešly v klíčích, ne v hodnotách"
                )
    elif len(klice) == 1:
        chyby.append(
            "appka má jen sadu " + next(iter(klice))
            + " — druhá se nenašla, a tím se kontrola dá obejít"
        )

    porovnano = 0
    for rezim, protejsek in (("light", [SVETLY]), ("dark", [TMAVY_SYSTEM, TMAVY_PREPINAC])):
        for klic, hodnota in sorted(appka.get(rezim, {}).items()):
            token = na_token(klic)
            for kontext in protejsek:
                if token not in sady[kontext]:
                    chyby.append(
                        f"appka má {rezim}.{klic}, ale web v {kontext} bloku "
                        f"token {token} nedefinuje — mapování jmen se rozešlo"
                    )
                    continue
                web = rozvin(sady[kontext], sady[kontext][token]).lower()
                porovnano += 1
                if web != hodnota.lower():
                    chyby.append(
                        f"{rezim}.{klic}: appka {hodnota}, web {token} v {kontext} "
                        f"bloku {web}"
                    )

    barevne_web = {
        t for t, h in sady[SVETLY].items() if na_rgb(rozvin(sady[SVETLY], h))
    }
    navic = sorted(barevne_web - {na_token(k) for k in appka.get("light", {})})
    if navic:
        poznamky.append(
            "jen na webu (appka je nemá a nemusí): " + ", ".join(navic)
        )
    return chyby, poznamky, porovnano


# -------------------------------------------------- kontrola 2: kontrast AA

# Páry, které jsou v CSS doložené pravidlem, ale pozadí leží za aliasem nebo
# se dědí od rodiče, takže je automat z jednoho pravidla nepozná. Nejsou tu
# barvy — jen jména; hodnoty se čtou stejně jako u všeho ostatního.
DOPLNENE_PARY = [
    # `.rozjizdka-probiha .panylek-stavu` má `color: var(--na-pozoru)` na
    # `var(--barva-stavu)`, a ten je v témž stavu `var(--pozor)`.
    ("--na-pozoru", "--pozor", "text na oranžové výplni (přes --barva-stavu)"),
    # Potlačený text na papíru kartu nemá v jednom pravidle vždycky — papír
    # je na kartě, text v odstavci pod ní.
    ("--tlumeny", "--papir", "potlačený text na kartě (dědí se)"),
    ("--voda", "--papir", "odkaz na kartě (dědí se)"),
    ("--voda", "--pozadi", "odkaz na pozadí stránky (dědí se)"),
    # `.rozjizdka-probiha .slovy` a `.stitek.zprava-program`: oranžová jako
    # písmo leží na kartě nebo na stránce, výplň pod ní je průhledná.
    ("--pozor-pismo", "--pozadi", "oranžové písmo na pozadí stránky"),
    ("--pozor-pismo", "--papir", "oranžové písmo na kartě"),
]


def pary_z_css(css: str, tokeny: set[str]) -> dict[tuple[str, str], int]:
    """Páry (text, pozadí) doložené pravidlem, které má obojí pohromadě.

    Bere jen pozadí zapsané jako **plná** barva `var(--x)`: `color-mix` ani
    gradient skutečnou barvu pozadí neurčují, takže poměr spočítaný z jejich
    argumentu by byl číslo o ničem.
    """
    nalez: dict[tuple[str, str], int] = {}
    for _, telo in bloky(_bez_komentaru(css)):
        text = pozadi = None
        for jmeno, hodnota in _deklarace(telo):
            if jmeno == "color":
                m = re.fullmatch(r"var\(\s*(--[\w-]+)\s*\)", hodnota)
                text = m.group(1) if m else None
            elif jmeno in ("background", "background-color"):
                m = re.fullmatch(r"var\(\s*(--[\w-]+)\s*\)", hodnota)
                pozadi = m.group(1) if m else None
        if text and pozadi and text != pozadi and {text, pozadi} <= tokeny:
            nalez[(text, pozadi)] = nalez.get((text, pozadi), 0) + 1
    return nalez


def kontrola_kontrast(css: str, mez: float = 4.5) -> tuple[list[str], list[str], int]:
    chyby: list[str] = []
    radky: list[str] = []
    sady = sady_z_css(css)
    tokeny = {
        t for t, h in sady[SVETLY].items() if na_rgb(rozvin(sady[SVETLY], h))
    }
    odvozene = pary_z_css(css, tokeny)

    pary: list[tuple[str, str, str]] = [
        (t, p, f"odvozeno z CSS ({n}×)") for (t, p), n in sorted(odvozene.items())
    ]
    for text, pozadi, duvod in DOPLNENE_PARY:
        if (text, pozadi) in odvozene:
            continue
        if text not in tokeny or pozadi not in tokeny:
            chyby.append(
                f"doplněný pár {text} na {pozadi} nemá v CSS oporu — "
                f"token se přejmenoval a kontrola by ho tiše přestala měřit"
            )
            continue
        pary.append((text, pozadi, duvod))

    merено = 0
    for kontext in (SVETLY, TMAVY_SYSTEM, TMAVY_PREPINAC):
        sada = sady[kontext]
        for text, pozadi, duvod in pary:
            a = na_rgb(rozvin(sada, sada.get(text, "")))
            b = na_rgb(rozvin(sada, sada.get(pozadi, "")))
            if not (a and b):
                continue
            pomer = kontrast(a, b)
            merено += 1
            stav = "ok " if pomer >= mez else "POD"
            radky.append(
                f"  {stav} {pomer:5.2f}:1  {kontext:<18} {text} na {pozadi}   ({duvod})"
            )
            if pomer < mez:
                chyby.append(
                    f"{kontext}: {text} na {pozadi} má {pomer:.2f}:1, "
                    f"WCAG 2.2 AA chce {mez}:1 pro běžný text ({duvod})"
                )
    return chyby, radky, merено


# --------------------------------------------------------------------- běh

def main(argv: list[str]) -> int:
    jen = {a.lstrip("-") for a in argv[1:]}
    if not jen <= {"shoda", "kontrast"}:
        # Překlep v přepínači by jinak nespustil ani jednu kontrolu a vrátil
        # nulu — tedy přesně to tiché „prošlo", kterému se tady vyhýbáme.
        print(__doc__)
        return 2
    css = CSS.read_text(encoding="utf-8")
    ts = THEME.read_text(encoding="utf-8")
    spadlo = False
    naprazdno = False

    if not jen or "shoda" in jen:
        chyby, poznamky, porovnano = kontrola_shoda(css, ts)
        print(f"SHODA barev web ↔ appka ({porovnano} porovnaných hodnot)")
        for p in poznamky:
            print(f"  · {p}")
        for ch in chyby:
            print(f"  ✗ {ch}")
        if porovnano == 0:
            print("  ✗ nebylo co porovnat — kontrola neměřila nic")
            naprazdno = True
        elif not chyby:
            print("  ✓ sedí")
        spadlo |= bool(chyby)

    if not jen or "kontrast" in jen:
        chyby, radky, merено = kontrola_kontrast(css)
        print(f"\nKONTRAST WCAG 2.2 AA ({merено} spočítaných párů)")
        for r in radky:
            print(r)
        for ch in chyby:
            print(f"  ✗ {ch}")
        if merено == 0:
            print("  ✗ nespočítal se jediný pár — kontrola neměřila nic")
            naprazdno = True
        elif not chyby:
            print("  ✓ všechny měřené páry nad 4,5:1")
        spadlo |= bool(chyby)
        print(
            "\n  Mez téhle kontroly: seznam párů je ČÁSTEČNÝ — jsou v něm jen\n"
            "  páry doložené pravidlem v CSS a šest doplněných, u kterých pozadí\n"
            "  leží za aliasem nebo se dědí. Páry nad průhledným pozadím\n"
            "  (color-mix, gradient) spočítat nejde. A kontrast je jedna\n"
            "  vlastnost přístupnosti: zelený kontrast neznamená, že appka\n"
            "  funguje se čtečkou."
        )

    if naprazdno:
        return 2
    return 1 if spadlo else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
