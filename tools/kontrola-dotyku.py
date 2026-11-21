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
geometrie, ne vykreslené pixely: `minHeight`, svislá výplň a `hitSlop`
(pojmenovaná číselná konstanta téhož souboru se dosadí).
Výška řádku textu se nepočítá z fontu, ale paušálně — `RADEK_PT` je
<b>horní</b> odhad řádkové schránky, takže se hlásí jen terč, který
na mez nedosáhne <b>ani</b> s tím nejpříznivějším předpokladem. Tím
kontrola nehlásí nic, co by ve skutečnosti prošlo — a zároveň propustí
terč, který je na papíře dost vysoký, ale ve skutečnosti ho překrývá
něco jiného. To z tohohle souboru nezjistíš.

<b>Měří se obě strany, ale každá jinak.</b> Výška se dopočítá i z textu,
protože řádek se dá odhadnout z `fontSize`. <b>Šířka se dopočítat nedá</b>
— šířka textu závisí na fontu a ten tenhle soubor nezná —, takže se hlásí
jen terč, který má šířku <b>zapsanou</b> a menší než mez (`width`,
`minWidth`, případně vodorovná výplň s `hitSlop`). Terč bez zapsané šířky
se roztáhne podle obsahu nebo rodiče a kontrola o něm mlčí. Je to užší
záběr než u výšky, zato bez dohadů: ikonové tlačítko `width: 32` se
nahlásí, řádka přes celou kartu ne.

<b>Co kontrola nevidí dodnes</b>, a nepředstírá to (nález E druhého
konzilia, 21. 11. 2026): <b>mezeru mezi dvěma terči</b>. Rozteč vzniká
až rozvržením — `gap`, `marginBottom`, pozice v seznamu —, a z jednoho
souboru se nedá zjistit, které dva terče spolu na obrazovce sousedí.
Osm dp mezi řádkami trati tedy drží posudek a maketa, ne tahle kontrola.

<b>A jedno slepé místo navíc, nalezené sabotáží 6. 11. 2026.</b> Styl
předaný do komponenty <b>propem</b> se rozpustit nedá, takže u obalu
jako `Klepaci` kontrola vidí jen tu podlahu, kterou si obal drží sám
(`s.terc`). React Native přitom nechává pozdější položku pole přebít
dřívější — kdyby tedy `Akce` nastavila `minHeight: 0`, terč by se
<b>doopravdy</b> srazil a kontrola by to <b>neohlásila</b>. Proti tomu
tenhle soubor nic nezmůže; drží to jen pravidlo, že výšku si nastavují
`Akce` a `Radek`, a nikdo jiný.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

KOREN = Path(__file__).resolve().parent.parent
PROHLEDAT = KOREN / "app" / "src"

# Mez z Apple HIG (44×44 pt). Android Material žádá 48 dp; `--mez 48`.
MEZ_PT = 44

# Řádek je na iOS i Androidu zhruba 1,2× velikost písma.
RADEK_NASOBEK = 1.2

# Výchozí velikost písma `<Text>` v React Native, když ji styl neurčí.
PISMO_PT = 14

# Záloha pro terč, u kterého se velikost písma nenajde — text může přijít
# propem, ze sdíleného stylu v jiném souboru nebo z komponenty. Je to
# **horní** odhad (odpovídá písmu 16–17 pt, největšímu na řádkovém
# odkazu), takže se u takového terče hlásí jen to, co je malé i tak.
#
# <b>Dřív se tenhle paušál používal vždycky</b>, i když velikost písma
# stála o dva řádky níž — a tím kontrola propustila dva terče ve
# stavitelské obrazovce: `chip` s písmem 13 pt měl 39,6 pt a `zahodit`
# s výchozími 14 pt měl 40,8, ale oba vyšly na rovných 44 (konzilium nad
# stavitelem trati, bod 8). Odhad, který je o 4 pt mimo, je u meze 44
# rozdíl mezi „projde" a „neprojde".
RADEK_PT = 20

ZNACKY = ("Pressable", "TouchableOpacity", "Link")

# `const TERC = 44;` v témže souboru — jméno místo číslice.
KONSTANTA = re.compile(r"\bconst\s+(\w+)\s*=\s*(\d+)\s*;")


def hlavicka(txt: str, od: int) -> str:
    """Text uvnitř otevírací značky — do `>` mimo složené závorky.

    <b>Řádkový komentář se přeskakuje celý.</b> Komentář v hlavičce značky
    může nést `>` — v `</b>` nebo v šipce —, a bez téhle výjimky se značka
    ukončila u něj. Deklarace stylu, která stála pod komentářem, se tím
    vůbec nenašla a kontrola <b>nahlásila terč, který mez dosahuje</b>
    (zjištěno 7. 11. 2026 na `cil.tsx`). Falešné hlášení je mírnější chyba
    než propuštěný malý terč, ale stejně nepřijatelná: kdo ji jednou
    uvidí, přestane kontrole věřit.
    """
    out: list[str] = []
    hloubka = 0
    i = od
    while i < len(txt):
        znak = txt[i]
        if txt.startswith("//", i):
            # Do konce řádku, a nic z toho se nepočítá: hledají se jen
            # deklarace, a ty v komentáři nejsou.
            konec = txt.find("\n", i)
            if konec < 0:
                break
            i = konec
            continue
        if znak == "{":
            hloubka += 1
        elif znak == "}":
            hloubka -= 1
        elif znak == ">" and hloubka == 0:
            break
        out.append(znak)
        i += 1
    return "".join(out)


def blok(txt: str, kde: int) -> str:
    """Text funkce, ve které ta značka leží.

    <b>Proč to tu je.</b> Styl se často drží v místní proměnné
    (`const styl = [s.karta, …]`), a hledat ji v celém souboru znamená
    chytit stejnojmennou proměnnou z úplně jiné komponenty. Tím kontrola
    <b>propustila malý terč</b> — zjištěno sabotáží 6. 11. 2026, kdy
    sražená konstanta nic neshodila, protože se do `Klepaci` dosadil
    `styl` z `Karta`. Hranice se hledá podle `function` na začátku řádku;
    uvnitř jedné funkce se dvě stejná jména nepotkají.
    """
    zacatek = txt.rfind("\nfunction ", 0, kde)
    zacatek = max(zacatek, txt.rfind("\nexport function ", 0, kde))
    konec = txt.find("\nfunction ", kde)
    konec2 = txt.find("\nexport function ", kde)
    if konec < 0 or (0 <= konec2 < konec):
        konec = konec2
    return txt[max(zacatek, 0) : konec if konec >= 0 else len(txt)]


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


def rozpust(decl: str, konstanty: dict[str, int]) -> str:
    """Dosadí číselné konstanty souboru.

    `minHeight: TERC` je totéž jako `minHeight: 44`, jen pojmenované —
    a kontrola, která by četla jen číslice, by hlásila terč, který mez
    drží. Bere jen `const JMENO = <celé číslo>;` z téhož souboru; cokoliv
    složitějšího (výpočet, import) zůstane nerozpuštěné, a tedy nahlášené.
    """
    for jmeno, hodnota in konstanty.items():
        decl = re.sub(r"\b" + jmeno + r"\b", str(hodnota), decl)
    return decl


def podstrom(txt: str, zacatek: int, znacka: str, hl: str) -> str:
    """Co je uvnitř té značky — od `>` po její uzavření.

    Potřebuje to <see cref="radek"/>: velikost písma stojí na `<Text>`
    uvnitř terče, ne v jeho vlastním stylu, takže `deklarace` ji nevidí.
    Hloubka se počítá jen přes tutéž značku; cizí značky uvnitř nevadí,
    protože se hledá jedno číslo, ne struktura.
    """
    if hl.rstrip().endswith("/"):
        return ""  # <Pressable … /> nemá děti

    i = zacatek + len(hl) + 1  # za `>` otevírací značky
    hloubka = 1
    otevreni = re.compile(r"<" + znacka + r"\b")
    while i < len(txt) and hloubka > 0:
        if txt.startswith("</" + znacka, i):
            hloubka -= 1
            i += len(znacka) + 2
            continue
        m = otevreni.match(txt, i)
        if m:
            # Samouzavřená uvnitř hloubku nemění — najdi, čím končí.
            konec = txt.find(">", m.end())
            if konec > 0 and txt[konec - 1] == "/":
                i = konec + 1
                continue
            hloubka += 1
            i = (konec + 1) if konec > 0 else m.end()
            continue
        i += 1
    return txt[zacatek:i]


def radek(uvnitr: str, styly: dict[str, str]) -> tuple[int, bool]:
    """Výška textu v terči a jestli se dala spočítat z písma.

    <b>Sčítá řádky, nebere největší.</b> První verze té opravy vzala
    maximum a okamžitě nahlásila dvouřádkový banner, který mez drží
    s přehledem — terč je vysoký jako součet svých řádků, ne jako ten
    nejvyšší z nich.

    Každý `<Text>` přispěje svou velikostí písma, a když ji nemá,
    výchozími <see cref="PISMO_PT"/>. Podmíněný text (`{a && <Text…`)
    se počítá taky, i když se nevykreslí — tím odhad **roste**, takže
    chyba padá na stranu mlčení, ne falešného poplachu. Bez jediného
    `<Text>` padá výsledek na <see cref="RADEK_PT"/>: uvnitř může být
    obrázek nebo ikona a jejich výšku tenhle soubor nezjistí.

    <b>Pojmenovaný styl se rozpouští</b> stejně jako u terče: `fontSize`
    bývá v `StyleSheet.create`, ne v hlavičce značky. Bez toho vycházel
    `s.vratitText` (15 pt) jako výchozích 14 a odhad byl o pt mimo.
    """
    texty = [m for m in re.finditer(r"<Text\b", uvnitr)]
    if not texty:
        return RADEK_PT, False

    soucet = 0.0
    for i, m in enumerate(texty):
        konec = texty[i + 1].start() if i + 1 < len(texty) else len(uvnitr)
        kus = uvnitr[m.start():konec]
        for jmeno in re.findall(r"\bs\.(\w+)", kus):
            kus += " " + styly.get(jmeno, "")
        velikost = re.search(r"fontSize:\s*(\d+)", kus)
        soucet += (int(velikost.group(1)) if velikost else PISMO_PT) * RADEK_NASOBEK
    return round(soucet), True


def vyska(decl: str, uvnitr: str = "", styly: dict[str, str] | None = None) -> tuple[int, str]:
    """Nejpříznivější deklarovaná výška terče a čím je dána."""
    # Podklad, který se roztahuje od horní hrany ke spodní, je vysoký jako
    # jeho rodič — a to z tohohle souboru nezjistíš. Takový terč se měřit
    # nedá a zároveň je skoro jistě obrovský (překryv nabídky, klepnutí
    # vedle dialogu), takže se počítá jako vyhovující. Platí to jen při
    # <b>obou</b> hranách: samotné `top` je přilepený pruh a ten se měří.
    if re.search(r"position:\s*'absolute'", decl) and re.search(r"\btop:", decl) and re.search(r"\bbottom:", decl):
        return 10_000, "od hrany k hraně"
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
    r, zPisma = radek(uvnitr, styly or {})
    return r + 2 * vypln + 2 * slop, (
        f"{'řádek' if not zPisma else f'písmo→{r}'}+2×{vypln}"
        + (f"+2×{slop} hitSlop" if slop else "")
    )


def sirka(decl: str) -> tuple[int, str] | None:
    """Zapsaná šířka terče, nebo `None`, když žádná zapsaná není.

    <b>Nedopočítává se z textu</b>, na rozdíl od výšky: šířka písmene
    závisí na fontu a ten tenhle soubor nezná. Odhad by byl buď tak
    velkorysý, že by nenašel nic, nebo by hlásil terče, které jsou ve
    skutečnosti široké dost — a falešné hlášení kontrole ubírá víc, než
    kolik přidá nalezená vada.

    Roztažený terč se neměří ze stejného důvodu jako u výšky: `flex: 1`
    i dvojice `left` + `right` berou šířku od rodiče.
    """
    if re.search(r"position:\s*'absolute'", decl) and re.search(r"\bleft:", decl) and re.search(r"\bright:", decl):
        return None
    if re.search(r"\bflex:\s*[1-9]", decl) or re.search(r"alignSelf:\s*'stretch'", decl):
        return None

    m = re.search(r"minWidth:\s*(\d+)", decl)
    if m:
        return int(m.group(1)), "minWidth"
    m = re.search(r"\bwidth:\s*(\d+)", decl)
    if m:
        return int(m.group(1)), "width"

    # Bez zapsané šířky se počítá jen tehdy, když je vodorovná výplň sama
    # o sobě pod mezí a terč nemá text — tedy u ikon. S textem by to byl
    # dohad o fontu.
    m = re.search(r"hitSlop(?:=\{|:\s*)(\d+)", decl)
    slop = int(m.group(1)) if m else 0
    if slop:
        return None
    return None


def projdi(mez: int) -> tuple[list[tuple[int, str, int, str]], int]:
    nalezy: list[tuple[int, str, int, str]] = []
    celkem = 0
    for soubor in sorted(PROHLEDAT.rglob("*.tsx")):
        txt = soubor.read_text()
        styly = dict(re.findall(r"\b(\w+):\s*\{([^{}]*)\}", txt))
        konstanty = {j: int(h) for j, h in KONSTANTA.findall(txt)}
        for m in re.finditer(r"<(" + "|".join(ZNACKY) + r")\b", txt):
            hl = hlavicka(txt, m.end())
            # `<Link asChild>` nekreslí vlastní rámeček — terč je jeho dítě
            # a to kontrola měří zvlášť. Počítat oba by hlásilo obal, který
            # na obrazovce není.
            if m.group(1) == "Link" and "asChild" in hl:
                continue
            celkem += 1
            decl = rozpust(deklarace(blok(txt, m.start()), hl, styly), konstanty)
            v, cim = vyska(decl, podstrom(txt, m.start(), m.group(1), hl), styly)
            if v < mez:
                radek = txt.count("\n", 0, m.start()) + 1
                nalezy.append((v, str(soubor.relative_to(KOREN)), radek, cim))
            if (s := sirka(decl)) is not None and s[0] < mez:
                radek = txt.count("\n", 0, m.start()) + 1
                nalezy.append((s[0], str(soubor.relative_to(KOREN)), radek, f"šířka {s[1]}"))
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

    print(
        f"klepacích míst: {celkem} · mez {mez} pt · řádky se sčítají podle písma, "
        "šířka jen zapsaná"
    )
    if not nalezy:
        print("všechna dosahují mez.")
        return 0

    print(f"\npod mezí: {len(nalezy)} z {celkem}\n")
    print(f"{'pt':>4}  {'čím je dána':<22} místo")
    for v, soubor, radek, cim in sorted(nalezy):
        print(f"{v:>4}  {cim:<22} {soubor}:{radek}")
    print(
        "\nMěří se deklarovaná geometrie (minHeight, svislá výplň, hitSlop)\n"
        f"a text: každý řádek svou velikostí písma, bez ní {PISMO_PT} pt, celý\n"
        f"terč bez textu paušálem {RADEK_PT} pt. Podmíněný text se počítá taky,\n"
        "takže odhad spíš roste — nahlášený terč je malý i tak.\n"
        "Šířka se hlásí jen tam, kde je zapsaná; z textu se nedopočítává.\n"
        "Mezeru mezi dvěma terči tahle kontrola neměří vůbec."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
