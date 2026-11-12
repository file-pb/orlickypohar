#!/usr/bin/env python3
"""Zkouška úsudku hlídky. Bez sítě, bez lockfilu, do sekundy.

**Proč to existuje:** 6. 11. 2026 vypsala hlídka nad skutečným lockem „Klid"
(kód 0), přestože na `decode-uri-component` viselo otevřené **high**
CVE-2026-118664 (#27). Dvě vady, obě tiché:

1. prah záplaty byl `0.5.0`, ale `<= 0.5.0` je zranitelný rozsah, takže nad
   lockem s 0.5.0 hlídka doporučila *zavřít hlášení o zranitelné verzi*;
2. kontrola dopadu čítala jen `cvss.vector_string`, které je u hlášení
   ohodnocených jen CVSS 4.0 `null`, a regulár neznal předpony `VC:`/`VI:`.

Třetí přibyla 7. 11. 2026: oprava prahu nechala v textu zprávy původní
„od 0.5 výš“, tedy to číslo, které bylo špatně — a člověk čte zprávu, ne
`ZAPLATY`.

Čtvrtá 9. 11. 2026, a je to ta nejhorší z nich: verze se četla z nejkratší
cesty v lockfilu, tedy z hoistnuté kopie. U `zod` je hoistnutá kopie 4.6.7
(pro devDependency), kdežto ta, na které visí #25, je 3.25.76 pod `expo` —
hlídka tedy radila **zavřít hlášení o verzi, která je nainstalovaná**.

`zkouska` v `hlidka-zranitelnosti.yml` ověřuje **cestu hlášení**, ne úsudek —
vynutí nález a podívá se, že vznikne issue. Že hlídka pozná, *co* hlásit,
nekontrolovalo nic. Tohle to kontroluje: sabotáž, ne přečtení kódu.

**Pátá kontrola se zkouší od 10. 11. 2026** (rodiny s utlumeným patchem).
Šest sabotáží, všechny změřené toho dne: mlčící úsudek, zrušené rozlišení
řady, hlášení mimo držený rozsah, `re.split` bez lookaheadu (to byla
skutečná vada první verze — hlídka pak našla 0 sekcí npm `/app`), ignorované
`update-types` a zmizelý `ignore:`. Každá spadne.

**Cesta se sítí se zkouší od 12. 11. 2026.** Byla to do té doby ta nejtenčí
část: sabotáže mířily jen na úsudek, takže kdyby `hlidej_tlumene_patche`
odpověď zahodila nebo se ptala na špatné jméno, zkouška by prošla a hlídka by
mlčela nad otevřenou zranitelností. `urlopen` se teď podstrčí a sabotáže
ověřují, že se ptá na obě jména ze zámku, že odpověď dojde do úsudku, že se
data z jednoho balíčku nepoužijí na druhý, že nedostupné API i odpověď, která
není JSON, vyjdou jako nález, a že scoped jméno jde do dotazu zakódované.
Pět rozbití implementace (zahozená data, pevné jméno v dotazu, spolknutá
chyba sítě, prohozené jméno v úsudku, dotaz jen na první balíček) spadne.
Šestá sabotáž odhalila skutečnou vadu — jména se berou ze zámku, takže
`@types/react` šlo do URL holé; proto je v `vsechna_hlaseni`
`urllib.parse.quote`.

**Stránkování se zkouší od 12. 11. 2026.** `per_page=100` není záruka: další
stránku dává advisory API jen jako odkaz v `Link` hlavičce, a dokud ji nikdo
nečetl, posuzovalo se u **všech pěti** kontrol jen prvních sto hlášení. Tichý
výřez vstupu je přesně ten tvar vady, kvůli kterému hlídka 6. 11. 2026
vypsala „Klid" nad otevřeným high. Zkouška podstrčí dvě stránky, každou
s jinou záplatou, a vyžaduje v nálezech obě; čtení `Link` hlavičky je navíc
jednou změřené proti skutečnému GitHubu (`per_page=1` nad
`decode-uri-component` prošlo tři stránky a vrátilo stejná tři hlášení jako
jediný dotaz se stovkou). Pět rozbití spadne: ignorovaná hlavička, zahozené
předchozí stránky, chybějící strop (zkouška se po padesátém dotazu ptát
přestane, aby se nezasekla), vyčerpaný strop vydávaný za hotový výsledek
a odebrané `quote`.

**Co ani tak vidět není** — úspěšná sabotáž dokazuje jen tu část, kam
zkouška dosáhne:

1. **Skutečné HTTP.** `urlopen` je podstrčený, takže TLS,
   třicetisekundový timeout, přesměrování a chování GitHubu při vyčerpaném
   limitu nezkouší nic. Jediná výjimka je čtení `Link` hlavičky, změřené
   jednou proti skutečnému GitHubu.
2. **Víc než deset stránek hlášení.** Strop `vsechna_hlaseni` je deset
   stránek, tedy 1000 hlášení u jednoho balíčku. Nad ním vyjde nález
   o nenačtení, ne klid — ale úplný seznam hlídka v takovém případě nemá
   a nikdo nezkoušel, co se stane, kdyby takový balíček doopravdy existoval.
3. **Advisory API je jediný zdroj.** Zranitelnost, kterou GitHub v
   `/advisories` nevede, nebo hlášení bez `vulnerable_version_range`,
   pátá kontrola nevidí vůbec.
4. **Jen `ignore` v sekci npm `/app`** a jen balíčky nahoře v zámku.
   Tlumení ve `web` nebo v nugetu nehlídá nic, zanořené kopie taky ne.
5. **Rate limit.** Dnes se ptá na dva balíčky. Kdyby u `expo*` někdo mute
   zvolnil na plný, bylo by jich 43 — a neautentizované advisory API dává
   60 dotazů za hodinu. Hlídka by to nahlásila jako chybu načtení, ne jako
   klid, ale nikdo to nezkoušel.

Pustí se bez argumentů. 0 = v pořádku, 1 = podívej se.
"""

import importlib.util
import json
import os
import sys

KOREN = os.path.dirname(os.path.abspath(__file__))


def hlidka():
    cesta = os.path.join(KOREN, "hlidka-zranitelnosti.py")
    spec = importlib.util.spec_from_file_location("hlidka", cesta)
    modul = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modul)
    return modul


def v4(telo):
    """Hlášení ohodnocené **jen** CVSS 4.0 — `cvss` je u nich `null`."""
    return {
        "cvss": {"vector_string": None, "score": 0.0},
        "cvss_severities": {
            "cvss_v3": {"vector_string": None, "score": 0.0},
            "cvss_v4": {"vector_string": "CVSS:4.0/AV:N/AC:L/AT:P/PR:N/UI:N/" + telo},
        },
    }


def v31(telo):
    return {"cvss": {"vector_string": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/" + telo}}


def main():
    h = hlidka()
    chyby = []

    def saha(advisory):
        return any(h.SAHA_DAL.search(x) for x in h.vektory_z(advisory))

    # --- 1. prah zaplaty odpovida advisory, ne opravene verzi stareho CVE ---
    # CVE-2026-118664 ma rozsah `<= 0.5.0` a first_patched_version 0.5.1.
    if h.ZAPLATY.get("decode-uri-component") != (0, 5, 1):
        chyby.append(
            f"prah `decode-uri-component` je {h.ZAPLATY.get('decode-uri-component')}, "
            "čekáno (0, 5, 1) — `<= 0.5.0` je zranitelný rozsah CVE-2026-118664"
        )

    # --- 2. kontrola dopadu pozna duvernost a integritu v obou zapisech ---
    pripady = [
        # (jméno, čekáno, hlášení)
        ("v4 jen dostupnost (skutečné #27)", False, v4("VC:N/VI:N/VA:H/SC:N/SI:N/SA:N")),
        ("v4 důvěrnost zranitelného systému", True, v4("VC:H/VI:N/VA:N/SC:N/SI:N/SA:N")),
        ("v4 integrita zranitelného systému", True, v4("VC:N/VI:L/VA:N/SC:N/SI:N/SA:N")),
        ("v4 důvěrnost navazujícího systému", True, v4("VC:N/VI:N/VA:N/SC:H/SI:N/SA:N")),
        ("v4 integrita navazujícího systému", True, v4("VC:N/VI:N/VA:N/SC:N/SI:L/SA:N")),
        ("v3.1 s C:H", True, v31("C:H/I:N/A:N")),
        ("v3.1 s I:L", True, v31("C:N/I:L/A:N")),
        ("v3.1 jen dostupnost", False, v31("C:N/I:N/A:H")),
        ("bez vektoru vůbec", False, {"cvss": None, "cvss_severities": None}),
        ("prázdné hlášení", False, {}),
    ]
    for jmeno, cekano, advisory in pripady:
        skutecnost = saha(advisory)
        if skutecnost != cekano:
            chyby.append(f"dopad u „{jmeno}“: hlásí {skutecnost}, čekáno {cekano}")

    # --- 3. vektor se najde i tam, kde ho stara verze neprecetla ---
    jen_ctyrka = v4("VC:H/VI:H/VA:H/SC:N/SI:N/SA:N")
    if not h.vektory_z(jen_ctyrka):
        chyby.append(
            "u hlášení ohodnoceného jen CVSS 4.0 nevidí hlídka žádný vektor — "
            "to byla ta vada, kvůli které #27 prošlo jako „Klid“"
        )

    # --- 4. zprava o dosazitelne zaplate jmenuje prah, ne pevne cislo ---
    # Do 7. 11. 2026 v ní stálo „od 0.5 výš“, přestože prah už byl 0.5.1.
    # Číslo ve zprávě je to jediné, co člověk uvidí, takže se **odvozuje**
    # z `ZAPLATY`. Sabotáž: posuň prah a zpráva se musí posunout s ním.
    lock = {"packages": {
        "node_modules/expo-router": {"dependencies": {"query-string": "^7.1.3"}},
        # Rozsah smí vyjít jen z `^0.6.0`: kdyby v něm stálo `0.5.1`, zpráva by
        # prošla i s pevně zapsaným „0.5“, protože to číslo echuje rozsah.
        "node_modules/query-string": {"dependencies": {"decode-uri-component": "^0.6.0"}},
    }}
    zpravy = h.hlidej_duc(lock)
    if len(zpravy) != 1 or "0.5.1" not in zpravy[0]:
        chyby.append(f"zpráva o dosažitelné záplatě nejmenuje prah 0.5.1: {zpravy}")
    puvodni = h.ZAPLATY["decode-uri-component"]
    try:
        h.ZAPLATY["decode-uri-component"] = (9, 9, 9)
        sabotovane = h.hlidej_duc(lock)
    finally:
        h.ZAPLATY["decode-uri-component"] = puvodni
    if sabotovane:
        chyby.append(
            "po posunu prahu na 9.9.9 pořád tvrdí, že je záplata dosažitelná "
            f"z `^0.6.0`: {sabotovane}")

    # --- 5. verze se posuzuje podle nejnizsi kopie, ne podle hoistnute ---
    # Skutečný stav `app/package-lock.json` z 9. 11. 2026: hoistnutá kopie
    # `zod` je 4.6.7 (pro devDependency), ale ta, na které visí #25, je
    # 3.25.76 pod `expo`. Hlídka na to řekla „zaplátovaný, zavři to".
    lock_zod = {"packages": {
        "": {"name": "orlickypohar-app"},
        "node_modules/zod": {"version": "4.6.7", "dev": True},
        "node_modules/expo/node_modules/zod": {"version": "3.25.76"},
    }}
    serazene, necitelne = h.kopie(lock_zod, "zod")
    if necitelne:
        chyby.append(f"verze kopií `zod` se nepřečetly: {necitelne}")
    if [c for _, c, _ in serazene] != ["node_modules/expo/node_modules/zod", "node_modules/zod"]:
        chyby.append(f"kopie `zod` nejsou seřazené od nejnižší verze: {serazene}")
    if h.zaplatovany(lock_zod, "zod") is not False:
        chyby.append(
            "`zod` se jeví jako zaplátovaný, přestože pod `expo` visí 3.25.76 — "
            "to je ta vada, kvůli které hlídka 9. 11. 2026 radila zavřít #25")
    # Jediná kopie, a ta zaplátovaná: musí vyjít True (jinak by předchozí
    # kontrola prošla i tak, že předikát vrací False vždycky).
    lock_duc = {"packages": {"node_modules/decode-uri-component": {"version": "0.5.1"}}}
    if h.zaplatovany(lock_duc, "decode-uri-component") is not True:
        chyby.append("jediná zaplátovaná kopie `decode-uri-component` nevyšla jako zaplátovaná")
    if h.zaplatovany({"packages": {}}, "zod") is not None:
        chyby.append("chybějící balíček nevrátil `None`")

    # --- 6. pata kontrola: rodiny s utlumenym patchem ---------------------
    # Hlídá díru v automatice, ne odmítnuté hlášení: u `react`/`react-dom` je
    # utlumený i patch, takže PR na záplatu v řadě 19.2 nepřijde. Sabotáž
    # podstrčí stav, při kterém **má** zahlásit, a ověří, že zahlásí.
    def advisory(rozsah, zaplata, balicek="react", tezkost="high"):
        return {
            "ghsa_id": "GHSA-zkouska", "severity": tezkost,
            "html_url": "https://example.invalid/a",
            "vulnerabilities": [{
                "package": {"name": balicek},
                "vulnerable_version_range": rozsah,
                "first_patched_version": {"identifier": zaplata} if zaplata else None,
            }],
        }

    nase = (19, 2, 3)
    pripady_pata = [
        # (jméno, hlášení, musí v nálezu být, nesmí v nálezu být)
        ("záplata v držené řadě",
         advisory("< 19.2.9", "19.2.9"), ["19.2.9", "držené řadě", "PR nepřijde"], []),
        ("záplata mimo drženou řadu",
         advisory("< 19.3.1", "19.3.1"), ["S13", "mimo drženou řadu"], ["držené řadě"]),
        ("záplata neexistuje",
         advisory("<= 19.2.3", None), ["záplata neexistuje"], ["S13"]),
        ("rozsah, kterému nerozumím",
         advisory("<19.2.x nebo tak", "19.2.9"), ["nepřečtu"], []),
    ]
    for jmeno, a, musi, nesmi in pripady_pata:
        zpravy = h.posudek_tlumene("react", nase, [a])
        text = " ".join(zpravy)
        if not zpravy:
            chyby.append(f"pátá kontrola u „{jmeno}“ mlčí, přitom má hlásit")
            continue
        for kus in musi:
            if kus not in text:
                chyby.append(f"pátá kontrola u „{jmeno}“ neříká „{kus}“: {text}")
        for kus in nesmi:
            if kus in text:
                chyby.append(f"pátá kontrola u „{jmeno}“ říká „{kus}“, a to je jiný případ: {text}")

    # Nesmí hlásit to, co se nás netýká. Skutečná advisory na `react` jsou
    # `< 0.14.0` a `< 0.5.2` — devatenáct majorů pod zámkem. Kdyby je hlídka
    # hlásila, měsíční issue by bylo pokaždé stejné a nikdo by ho nečetl.
    mimo = h.posudek_tlumene("react", nase, [advisory("< 0.14.0", "0.14.0")])
    if mimo:
        chyby.append(f"pátá kontrola hlásí hlášení, které se držené verze netýká: {mimo}")
    cizi = h.posudek_tlumene("react", nase, [advisory("< 99.0.0", "99.0.0", balicek="react-dom")])
    if cizi:
        chyby.append(f"pátá kontrola hlásí hlášení na cizí balíček: {cizi}")

    # --- 7. ctou se skutecne rodiny, ne vymyslene ------------------------
    # Tohle je sabotáž, která chytila první verzi: `re.split` bez lookaheadu
    # separátor odřízl, takže hlídka našla **0 sekcí** npm `/app` a místo
    # úsudku vypsala „přečti to ručně". Čte se skutečný soubor v repu.
    dependabot = os.path.join(os.path.dirname(KOREN), ".github", "dependabot.yml")
    with open(dependabot, encoding="utf-8") as f:
        yml = f.read()
    vzory, nalezy_yml = h.utlumene_rodiny(yml)
    if nalezy_yml:
        chyby.append(f"`dependabot.yml` v repu hlídka nepřečte: {nalezy_yml}")
    if sorted(vzory) != ["react", "react-dom"]:
        chyby.append(
            f"utlumený patch má podle hlídky {vzory}, čekáno ['react', 'react-dom'] — "
            "ostatní čtyři rodiny mají `update-types`, tedy patch povolený")

    # Sabotáž naopak: dej `react` také `update-types` a musí ze seznamu zmizet.
    # Bez toho by kontrola hlásila i rodiny, kde Dependabot záplatu pošle sám.
    s_typy = yml.replace(
        '      - dependency-name: "react"\n',
        '      - dependency-name: "react"\n        update-types:\n'
        '          - "version-update:semver-major"\n', 1)
    vzory_s, _ = h.utlumene_rodiny(s_typy)
    if "react" in vzory_s:
        chyby.append("po doplnění `update-types` u `react` ho hlídka pořád bere jako plně utlumený")

    # Co nepřečtu, nahlásím: zmizelý `ignore` nesmí vyjít jako „není co hlídat".
    bez_ignore, nalezy_bez = h.utlumene_rodiny(yml.replace("    ignore:\n", "", 1))
    if not nalezy_bez:
        chyby.append(f"bez `ignore:` v sekci npm `/app` hlídka mlčí místo nahlášení: {bez_ignore}")
    _, nalezy_prazdne = h.utlumene_rodiny("version: 2\nupdates:\n")
    if not nalezy_prazdne:
        chyby.append("nad `dependabot.yml` bez sekce npm `/app` hlídka mlčí místo nahlášení")

    # --- 8. cesta se siti: dotaz, predani dat, strankovani, selhani ------
    # Tohle byla do 12. 11. 2026 ta nejtenčí část: sabotáže 5 a 6 míří na
    # `posudek_tlumene` a `utlumene_rodiny`, tedy na úsudek. Že
    # `hlidej_tlumene_patche` pošle dotaz na **správné jméno** a odpověď
    # úsudku doopravdy **předá**, nekontrolovalo nic — kdyby data zahodila,
    # zkouška by prošla a hlídka by mlčela nad otevřenou zranitelností.
    # U téhle rodiny je utlumený i patch, takže advisory API je jediná cesta,
    # jak o záplatě vědět; tichá chyba v ní znamená, že nevíme nic.
    #
    # Síť se nedotýká: `urlopen` se podstrčí a vrátí zpátky.
    class FalesnaOdpoved:
        def __init__(self, telo, hlavicky=None):
            self._telo = telo
            self.headers = hlavicky or {}

        def read(self):
            return json.dumps(self._telo).encode()

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return False

    def se_siti(odpoved):
        """Pustí `hlidej_tlumene_patche` s podstrčeným `urlopen`.

        Vrací `(nálezy, dotázané URL)`. `odpoved` dostane URL a vrátí tělo,
        nebo výjimku k vyhození.
        """
        dotazy = []

        def falesny(url, timeout=None):
            dotazy.append(url)
            # Strop schválně: kdyby `vsechna_hlaseni` přestalo počítat
            # stránky, nekonečná smyčka by se projevila jako zaseknutá
            # zkouška. Takhle spadne.
            if len(dotazy) > 50:
                raise RuntimeError("hlídka se ptá bez konce — chybí strop stránek")
            telo = odpoved(url)
            if isinstance(telo, Exception):
                raise telo
            if isinstance(telo, tuple):
                return FalesnaOdpoved(*telo)
            return FalesnaOdpoved(telo)

        puvodni = h.urllib.request.urlopen
        h.urllib.request.urlopen = falesny
        try:
            return h.hlidej_tlumene_patche(lock_rodin, os.path.dirname(KOREN)), dotazy
        finally:
            h.urllib.request.urlopen = puvodni

    lock_rodin = {"packages": {
        "node_modules/react": {"version": "19.2.3"},
        "node_modules/react-dom": {"version": "19.2.3"},
    }}

    # a) ptá se na obě jména ze zámku, a na žádné jiné
    zpravy, dotazy = se_siti(lambda url: [])
    if len(dotazy) != 2 or not any("affects=react" in d and "react-dom" not in d for d in dotazy) \
            or not any("affects=react-dom" in d for d in dotazy):
        chyby.append(f"pátá kontrola se neptá na `react` a `react-dom`, ale na: {dotazy}")
    if zpravy:
        chyby.append(f"nad prázdnou odpovědí advisory hlídka něco hlásí: {zpravy}")

    # b) odpoved se doopravdy dostane do usudku — nalez musi jmenovat zaplatu
    #    z podstrceneho tela. Kdyby `hlidej_tlumene_patche` data zahodila,
    #    tohle je to misto, kde se to pozna.
    def pro(url):
        balicek = url.rsplit("affects=", 1)[-1]
        return [advisory("<= 19.2.3", "19.2.9", balicek=balicek, tezkost="critical")]

    zpravy, _ = se_siti(pro)
    if len(zpravy) != 2:
        chyby.append(f"z odpovědi na dva balíčky vzniklo {len(zpravy)} nálezů, čekány dva: {zpravy}")
    spojene = " ".join(zpravy)
    for musi in ("`react` 19.2.3", "`react-dom` 19.2.3", "19.2.9", "critical", "držené řadě"):
        if musi not in spojene:
            chyby.append(f"nález z podstrčené odpovědi neříká „{musi}“: {spojene}")

    # c) data z dotazu na jeden balicek se nesmi pouzit na druhy. Odpoved
    #    mluvi vzdycky o `react`; u `react-dom` musi vyjit prazdno, jinak
    #    hlidka hlasi cizi balicek jako nas.
    zpravy, _ = se_siti(lambda url: [advisory("<= 19.2.3", "19.2.9", balicek="react")])
    if len(zpravy) != 1 or "`react` 19.2.3" not in zpravy[0]:
        chyby.append(f"odpověď o `react` se u obou balíčků chová jako o obou: {zpravy}")

    # d) selhani siti je nalez, ne klid
    zpravy, _ = se_siti(lambda url: h.urllib.error.URLError("sit je dole"))
    if len(zpravy) != 2:
        chyby.append(f"při nedostupném advisory API hlídka hlásí {len(zpravy)} nálezů, čekány dva: {zpravy}")
    for musi in ("se nepodařilo načíst", "utlumený i patch"):
        if musi not in " ".join(zpravy):
            chyby.append(f"nález o nedostupném API neříká „{musi}“: {zpravy}")

    # e) scoped jmeno jde do dotazu zakodovane. `@types/react` dnes `ignore`
    #    tlumi jen od minoru vys, takze se na nej kontrola nepta — ale kdyby
    #    ho nekdo utlumil cely, jmeno se bere ze zamku a `@` ani `/` do URL
    #    holé nepatří.
    lock_puvodni = lock_rodin
    lock_rodin = {"packages": {"node_modules/@types/react": {"version": "19.2.18"}}}
    vzory_puvodni = h.utlumene_rodiny
    h.utlumene_rodiny = lambda text: (["@types/react"], [])
    try:
        _, dotazy = se_siti(lambda url: [])
    finally:
        h.utlumene_rodiny = vzory_puvodni
        lock_rodin = lock_puvodni
    if not dotazy or "affects=%40types%2Freact" not in dotazy[0]:
        chyby.append(f"scoped jméno nejde do dotazu zakódované: {dotazy}")

    # f) rozbita odpoved (ne JSON) taky nesmi vyjit jako klid
    class Rozbita(FalesnaOdpoved):
        def read(self):
            return b"<html>rate limit</html>"

    puvodni_open = h.urllib.request.urlopen
    h.urllib.request.urlopen = lambda url, timeout=None: Rozbita(None)
    try:
        zpravy = h.hlidej_tlumene_patche(lock_rodin, os.path.dirname(KOREN))
    finally:
        h.urllib.request.urlopen = puvodni_open
    if len(zpravy) != 2 or "se nepodařilo načíst" not in " ".join(zpravy):
        chyby.append(f"nad odpovědí, která není JSON, hlídka nehlásí dva nálezy: {zpravy}")

    # g) druha stranka doopravdy dojde do usudku. `per_page=100` neni
    #    zaruka: GitHub vrati prvni stovku a zbytek necha v `Link`. Prvni
    #    stranka tu nese zaplatu 19.2.5, druha 19.2.9 — v nalezech musi byt
    #    **obe**. Tim spadne i ignorovana hlavicka, i zahozene predchozi
    #    stranky.
    DRUHA = "https://api.github.com/advisories?after=kurzor&affects="

    def po_strankach(url):
        if url.startswith(DRUHA):
            return [advisory("<= 19.2.3", "19.2.9", balicek=url.rsplit("affects=", 1)[-1],
                             tezkost="critical")]
        balicek = url.rsplit("affects=", 1)[-1]
        return ([advisory("<= 19.2.3", "19.2.5", balicek=balicek)],
                {"Link": f'<{DRUHA}{balicek}>; rel="next", <https://x/?page=1>; rel="prev"'})

    zpravy, dotazy = se_siti(po_strankach)
    if len(dotazy) != 4 or sum(1 for d in dotazy if d.startswith(DRUHA)) != 2:
        chyby.append(f"druhá stránka se nenačítá, dotazy byly: {dotazy}")
    spojene = " ".join(zpravy)
    for musi in ("19.2.5", "19.2.9"):
        if musi not in spojene:
            chyby.append(f"záplata `{musi}` ze stránkované odpovědi se do nálezů nedostala: {spojene}")

    # h) `Link`, ktera ukazuje porad dal, nesmi hlidku zacyklit ani vyjit
    #    jako klid — neuplny seznam je selhani nacteni.
    def bez_konce(url):
        return ([], {"Link": f'<{DRUHA}react&x={len(url)}>; rel="next"'})

    try:
        zpravy, dotazy = se_siti(bez_konce)
        if len(zpravy) != 2 or "se nepodařilo načíst" not in " ".join(zpravy):
            chyby.append(f"nekonečné stránkování nevyjde jako nález: {zpravy}")
        if len(dotazy) > 40:
            chyby.append(f"strop stránek je příliš vysoký, dotazů bylo {len(dotazy)}")
    except RuntimeError as e:
        chyby.append(str(e))

    if chyby:
        print("Hlídka soudí špatně:\n")
        for c in chyby:
            print(f"- {c}")
        return 1
    print(f"Hlídka soudí správně: prah, {len(pripady)} případů dopadu, text zprávy, "
          f"všechny kopie, {len(pripady_pata)} případů páté kontroly, čtení "
          "`dependabot.yml`, cesta se sítí i stránkování.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
