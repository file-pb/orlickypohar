#!/usr/bin/env python3
"""Velikost klepacích míst v appce. Bez závislostí, bez telefonu.

Proč to existuje: appka se drží v ruce na lodi, mokrou rukou, za náklonu.
Apple HIG žádá terč **44×44 pt**, Android Material **48 dp**; obrazovky
startu a cíle to splňují, protože se stavěly pro ruku u vody, a zbytek
appky ne, protože vznikal jako čtečka. Pravidlo *„terče mají mít 44 pt"*
drželo dosud na ničem — a pravidlo, u kterého není vidět, čím se pozná,
že je porušené, není pravidlo, ale komentář (`tools/kontrola-tokenu.py`,
tatáž věta).

    python3 tools/kontrola-dotyku.py            # jen přestupky
    python3 tools/kontrola-dotyku.py --vse      # i to, co projde
    python3 tools/kontrola-dotyku.py --mez 48   # androidí mez

Návratový kód 0 = projde, 1 = aspoň jeden terč je malý,
2 = kontrola sama nemá co měřit (prázdný vstup, přejmenovaná složka).
Ten třetí kód je tu proto, aby se kontrola nedala utišit smazáním vstupu.

<b>Čím se pozná, že je porušená.</b> Dokazuje se sabotáží, ne přečtením:
do `odpocet.tsx` stačí vrazit `<Pressable onPress={x}><Text>a</Text></Pressable>`
a kontrola to musí vypsat; po vrácení musí projít. Druhá sabotáž je
přesměrovat `PROHLEDAT` na neexistující složku — musí přijít kód 2.

<b>Mez téhle kontroly, a je i ve výstupu.</b> Měří se <b>deklarovaná</b>
geometrie, ne vykreslené pixely: `minHeight`, svislá výplň a `hitSlop`.
Výška řádku textu se nepočítá z fontu, ale paušálně — `RADEK_PT` je
<b>horní</b> odhad řádkové schránky, takže se hlásí jen terč, který
na mez nedosáhne <b>ani</b> s tím nejpříznivějším předpokladem. Tím
kontrola nehlásí nic, co by ve skutečnosti prošlo — a zároveň propustí
terč, který je na papíře dost vysoký, ale ve skutečnosti ho překrývá
něco jiného. To z tohohle souboru nezjistíš.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
PROHLEDAT = KOREN / "app" / "src"

# Mez z Apple HIG (44×44 pt). Android Material žádá 48 dp; `--mez 48`.
MEZ_PT = 44

# Horní odhad řádkové schránky textu v terči. Na iOS i Androidu je řádek
# zhruba 1,2× velikost písma, takže 20 pt odpovídá písmu 16–17 px — tedy
# největšímu, jaké se v appce na řádkovém odkazu vyskytuje. Schválně
# **horní** odhad: kontrola má hlásit jen to, co je malé i tak.
RADEK_PT = 20

ZNACKY = ("Pressable", "TouchableOpacity", "Link")


def hlavicka(txt: str, od: int) -> str:
    """Text uvnitř otevírací značky — do `>` mimo složené závorky."""
    out: list[str] = []
    hloubka = 0
    for znak in txt[od:]:
        if znak == "{":
            hloubka += 1
        elif znak == "}":
            hloubka -= 1
        elif znak == ">" and hloubka == 0:
            break
        out.append(znak)
    return "".join(out)


def deklarace(txt: str, hl: str, styly: dict[str, str]) -> str:
    """Posbírá všechny deklarace, které na terč dosednou.

    Styl se v appce zapisuje čtyřmi způsoby a všechny čtyři se tu musí
    rozpustit, jinak by kontrola hlásila terč, který výplň má: inline
    objekt, `s.jmeno` ze `StyleSheet.create`, pole `[s.a, s.b]`
    a proměnná, do které se to pole uložilo (tak to dělá `Karta`).
    """
    kusy = [hl]
    jmena = set(re.findall(r"\bs\.(\w+)", hl))
    # Každý holý identifikátor v hlavičce, který je v souboru polem stylů.
    # Nejde hledat jen `style={jmeno}`: `Karta` předává styl funkcí
    # (`style={({pressed}) => [styl, …]}`), takže jméno leží uvnitř pole.
    for promenna in set(re.findall(r"\b([a-z]\w*)\b", hl)):
        m = re.search(r"const\s+" + promenna + r"\s*=\s*\[(.*?)\]", txt, re.S)
        if m:
            kusy.append(m.group(1))
            jmena |= set(re.findall(r"\bs\.(\w+)", m.group(1)))
    for jmeno in jmena:
        kusy.append(styly.get(jmeno, ""))
    return " ".join(kusy)


def vyska(decl: str) -> tuple[int, str]:
    """Nejpříznivější deklarovaná výška terče a čím je dána."""
    m = re.search(r"minHeight:\s*(\d+)", decl)
    if m:
        return int(m.group(1)), "minHeight"
    m = re.search(r"height:\s*(\d+)", decl)
    if m:
        return int(m.group(1)), "height"
    m = re.search(r"hitSlop(?:=\{|:\s*)(\d+)", decl)
    slop = int(m.group(1)) if m else 0
    m = re.search(r"paddingVertical:\s*(\d+)", decl) or re.search(r"padding:\s*(\d+)", decl)
    vypln = int(m.group(1)) if m else 0
    return RADEK_PT + 2 * vypln + 2 * slop, (
        f"řádek+2×{vypln}" + (f"+2×{slop} hitSlop" if slop else "")
    )


def projdi(mez: int) -> tuple[list[tuple[int, str, int, str]], int]:
    nalezy: list[tuple[int, str, int, str]] = []
    celkem = 0
    for soubor in sorted(PROHLEDAT.rglob("*.tsx")):
        txt = soubor.read_text()
        styly = dict(re.findall(r"\b(\w+):\s*\{([^{}]*)\}", txt))
        for m in re.finditer(r"<(" + "|".join(ZNACKY) + r")\b", txt):
            celkem += 1
            decl = deklarace(txt, hlavicka(txt, m.end()), styly)
            v, cim = vyska(decl)
            if v < mez:
                radek = txt.count("\n", 0, m.start()) + 1
                nalezy.append((v, str(soubor.relative_to(KOREN)), radek, cim))
    return nalezy, celkem


def main() -> int:
    mez = MEZ_PT
    if "--mez" in sys.argv:
        mez = int(sys.argv[sys.argv.index("--mez") + 1])
    vse = "--vse" in sys.argv
    for a in sys.argv[1:]:
        if a not in ("--vse", "--mez") and not a.isdigit():
            print(f"neznámý přepínač: {a}", file=sys.stderr)
            return 2

    if not PROHLEDAT.is_dir():
        print(f"nebylo co měřit: {PROHLEDAT} neexistuje", file=sys.stderr)
        return 2

    nalezy, celkem = projdi(mez)
    if celkem == 0:
        print(f"nebylo co měřit: v {PROHLEDAT} není jediné klepací místo", file=sys.stderr)
        return 2

    print(f"klepacích míst: {celkem} · mez {mez} pt · řádek se počítá jako {RADEK_PT} pt")
    if not nalezy:
        print("všechna dosahují mez.")
        return 0

    print(f"\npod mezí: {len(nalezy)} z {celkem}\n")
    print(f"{'pt':>4}  {'čím je dána':<22} místo")
    for v, soubor, radek, cim in sorted(nalezy):
        print(f"{v:>4}  {cim:<22} {soubor}:{radek}")
    print(
        "\nMěří se deklarovaná geometrie (minHeight, svislá výplň, hitSlop),\n"
        f"řádek textu se počítá paušálně {RADEK_PT} pt — horním odhadem, takže\n"
        "nahlášený terč je malý i při nejpříznivějším předpokladu."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
