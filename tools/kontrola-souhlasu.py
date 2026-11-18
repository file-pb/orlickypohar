#!/usr/bin/env python3
"""Znění souhlasu závodníka drží dvě místa. Tahle kontrola hlídá, že se
nerozešla.

Pravda o znění je `src/OrlickyPohar.Api/Features/Zavody/Souhlas.cs`: ukládá
se k přihlášce i s číslem verze, aby šlo dohledat, s čím kdo souhlasil.
Jenže **vidět** ho musí závodník na webu, a tam stojí v JSX — jako text
s `<b>` a odkazy, ne jako řetězec z API. Dvě kopie téhož právního textu jsou
přesně ta věc, která se rozejde potichu: kdo přidá větu do `Souhlas.cs`,
nezmění tím, co má člověk před očima, když klepne na zaškrtávátko.

Kontroluje se dvojí:

  1. VEŘEJNÝ FORMULÁŘ — `Souhlas.Zneni` proti textu u zaškrtávátka
     v `prihlaska/page.tsx`. Web smí na konci přidat odkazy (vypsání,
     osobní údaje), takže se porovnává začátek: co je v C#, musí na webu
     stát slovo za slovem a ve stejném pořadí.
  2. ZÁPIS POŘADATELEM — `Souhlas.ZaKapitana` proti popiskům
     v `sprava/[serie]/prihlasky/[zavod]/page.tsx`. Tam pořadatel
     zaznamenává, co mu kapitán potvrdil; jiné znění než ve formuláři je
     schválně, ale taky se nesmí rozejít.

    python3 tools/kontrola-souhlasu.py

Návratový kód 0 = projde, 1 = rozchod, 2 = kontrola nemá co měřit
(přejmenovaný soubor, zmizelé zaškrtávátko). Ten třetí je tu proto, aby se
kontrola nedala utišit smazáním vstupu.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
SOUHLAS_CS = KOREN / "src/OrlickyPohar.Api/Features/Zavody/Souhlas.cs"
FORMULAR = KOREN / "web/app/serie/[slug]/zavody/[zavod]/prihlaska/page.tsx"
SPRAVA = KOREN / "web/app/sprava/[serie]/prihlasky/[zavod]/page.tsx"


def konstanty(zdroj: str) -> dict[str, str]:
    """Řetězcové konstanty z C#, včetně těch slepených z jiných konstant.

    Tvar `public const string X = Y + "…" + "…";` se vyhodnotí v pořadí, jak
    stojí: identifikátor se vezme z už přečtených, řetězec doslova. Nic se
    tu neinterpretuje — žádné `string.Format`, žádná interpolace.
    """
    hodnoty: dict[str, str] = {}
    for jmeno, telo in re.findall(
        r"public const string (\w+)\s*=\s*(.*?);", zdroj, re.DOTALL
    ):
        kusy: list[str] = []
        for kus in re.findall(r'"((?:[^"\\]|\\.)*)"|\b([A-Za-z_]\w*)\b', telo):
            if kus[0]:
                kusy.append(kus[0].replace('\\"', '"'))
            elif kus[1] in hodnoty:
                kusy.append(hodnoty[kus[1]])
        hodnoty[jmeno] = "".join(kusy)
    return hodnoty


def z_jsx(text: str) -> str:
    """Čitelný text z kusu JSX: bez komentářů, značek a oddělovačů."""
    text = re.sub(r"\{/\*.*?\*/\}", " ", text, flags=re.DOTALL)
    text = re.sub(r'\{"\s*"\}', " ", text)
    text = re.sub(r"</?[A-Za-z][^>]*>", "", text)
    text = text.replace("&nbsp;", " ")
    return re.sub(r"\s+", " ", text).strip()


def vysek(zdroj: str, od: str, do: str) -> str | None:
    i = zdroj.find(od)
    if i == -1:
        return None
    j = zdroj.find(do, i)
    return None if j == -1 else zdroj[i + len(od) : j]


def main() -> int:
    chybi = [p for p in (SOUHLAS_CS, FORMULAR, SPRAVA) if not p.exists()]
    if chybi:
        for p in chybi:
            print(f"  ! nenalezeno: {p.relative_to(KOREN)}")
        return 2

    hodnoty = konstanty(SOUHLAS_CS.read_text(encoding="utf-8"))
    zneni = hodnoty.get("Zneni")
    za_kapitana = hodnoty.get("ZaKapitana")
    if not zneni or not za_kapitana:
        print("  ! v Souhlas.cs se nenašlo Zneni nebo ZaKapitana")
        return 2

    spadlo = False
    print("Znění souhlasu: C# proti webu")

    # 1. Veřejný formulář.
    # Od konce značky `<input …/>`, ne od jejího jména: atributy nejsou text.
    blok = vysek(FORMULAR.read_text(encoding="utf-8"), 'name="souhlas"', "</span>")
    if blok is None or ">" not in blok:
        print("  ! ve formuláři přihlášky nenalezeno zaškrtávátko souhlasu")
        return 2
    blok = blok.split(">", 1)[1]
    # Odkazy na konci jsou navíc — porovnává se, co má C#.
    na_webu = z_jsx(blok.split("<Link")[0])
    if na_webu.startswith(zneni):
        print(f"  ✓ formulář nese celé znění ({len(zneni)} znaků)")
    else:
        spadlo = True
        print("  ✗ formulář se rozešel se Souhlas.Zneni")
        print(f"    C#:  {zneni}")
        print(f"    web: {na_webu}")

    # 2. Zápis pořadatelem. Popisek je bez tečky na konci, text v C# s ní.
    zdroj_spravy = SPRAVA.read_text(encoding="utf-8")
    popisky = [
        z_jsx(x).rstrip(".")
        for x in re.findall(
            # `(?!</?label)` drží hledání v jednom popisku — bez toho se
            # nenalezená `</label>` dohledá o pět obrazovek dál.
            r'name="souhlas" value="ano" />((?:(?!</?label).)*?)</label>',
            zdroj_spravy,
            re.DOTALL,
        )
    ]
    if not popisky:
        print("  ! ve správě přihlášek nenalezen popisek souhlasu")
        return 2
    ocekavane = za_kapitana.rstrip(".")
    rozchody = [p for p in popisky if p != ocekavane]
    if rozchody:
        spadlo = True
        print(f"  ✗ popisek pořadatele se rozešel se Souhlas.ZaKapitana ({len(rozchody)} z {len(popisky)})")
        print(f"    C#:  {ocekavane}")
        for p in rozchody:
            print(f"    web: {p}")
    else:
        print(f"  ✓ popisky pořadatele ({len(popisky)}) nesou ZaKapitana")

    print(
        "\n  Mez téhle kontroly: hlídá shodu dvou textů, ne jejich správnost.\n"
        "  Že znění odpovídá tomu, co vypsání žádá, nepozná — to je úsudek,\n"
        "  ne porovnání."
    )
    return 1 if spadlo else 0


if __name__ == "__main__":
    sys.exit(main())
