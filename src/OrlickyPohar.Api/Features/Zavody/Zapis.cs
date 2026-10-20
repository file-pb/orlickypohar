namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Jeden řádek zápisu: loď přes přihlášku, pořadí v cíli, nebo kód.
/// <c>DojezdV</c> posílá cílová obrazovka (od 22. 9. 2026) — okamžik, kdy
/// zapisovatel klepl na loď. Formulář z papíru ho nemá a nepošle.
/// </summary>
public record ZapisRadekVstup(
    int PrihlaskaId, int? PoradiVCili = null, KodVysledku? Kod = null, DateTimeOffset? DojezdV = null);

/// <summary>
/// Řádek zápisu i s tím, co o lodi ví databáze. Pravidla potřebují jméno
/// do hlášky a kategorii, uvnitř které se hlídá pořadí.
/// </summary>
public record ZapisRadek(ZapisRadekVstup Vstup, string Lod, string Kategorie)
{
    /// <summary>Prázdný řádek znamená „bez výsledku", ne chybu.</summary>
    public bool MaVysledek => Vstup.PoradiVCili is not null || Vstup.Kod is not null;
}

/// <summary>
/// Zápis výsledků rozjížďky: kdy se smí a co musí platit, aby se uložil.
/// <para>
/// Čisté funkce ze stejného důvodu jako <see cref="Workflow"/>: ptá se na
/// ně každé uložení, takže se to musí dát zkoušet bez databáze. Kdo smí,
/// tady není — to je otázka na roli a řeší ji <c>Rozsahy</c>.
/// </para>
/// </summary>
public static class Zapis
{
    /// <summary>
    /// Přepisovat jde jen návrh a vrácený zápis.
    /// <para>
    /// <b>Od ověření dál čísla někdo podepsal.</b> Kdyby šla přepsat, podpis
    /// by platil pro něco jiného, než co podepisoval. Cesta k opravě je
    /// vrácení k revizi — a to má důvod, který oprava potřebuje.
    /// </para>
    /// </summary>
    public static bool Otevreny(StavVysledku stav) =>
        stav is StavVysledku.Navrzeno or StavVysledku.KRevizi;

    /// <summary>
    /// Proč na zastávku zatím nejde zapisovat — nebo <c>null</c>.
    /// <para>
    /// <b>Zapisuje se od vypsání, ne až po odjetí.</b> Pořadatel píše
    /// výsledky na břehu v den závodu a přepnout zastávku na odjetou je
    /// krok, na který se v tu chvíli snadno zapomene. Do poháru se stejně
    /// počítá jen odjetá zastávka, takže dřívější zápis nic nepokazí.
    /// </para>
    /// </summary>
    public static string? ProcNejdeNaZavod(StavZavodu stav) => stav switch
    {
        StavZavodu.Vypsany or StavZavodu.Odjety => null,
        StavZavodu.Zruseny => "Regata je zrušená, výsledky nemá.",
        _ => "Závod ještě není vypsaný. Výsledky se zapisují od vypsání.",
    };

    public const string RevizeChybi =
        "Zápis přišel bez revize, ze které vycházel, a tím se ukládat nedá — "
        + "uložení maže lodě, které v sadě nejsou. Obnov stránku a ulož znovu.";

    public const string RevizeNesedi =
        "Rozjížďku mezitím uložil někdo jiný, takže tvoje sada vychází ze starších "
        + "čísel. Tvůj zápis se nikam neztratil: otevři porovnání zápisů, podívej se, "
        + "co se liší, a ulož znovu.";

    /// <summary>
    /// Totéž, když tu novější revizi uložil <b>tentýž účet</b> — typicky
    /// druhý telefon u vody. Hláška výš by tvrdila nepravdu a poslala
    /// zapisovatele hledat člověka, který neexistuje (zkouška ovládání C7).
    /// </summary>
    public const string RevizeNesediTentyzUcet =
        "Mezitím se rozjížďka uložila z tvého účtu na jiném zařízení, takže tahle "
        + "sada vychází ze starších čísel. Zápis se nikam neztratil: otevři porovnání "
        + "zápisů, podívej se, co se liší, a ulož znovu.";

    /// <summary>
    /// Proč sadu uložit nejde kvůli revizi — nebo <c>null</c>.
    /// <para>
    /// <b>Chybějící revize je taky chyba</b>, ne „tak tedy bez kontroly".
    /// Uložení maže, co v sadě není; pustit sadu, u které nevíme, z čeho
    /// vznikla, znamená pustit i mazání naslepo (oponentura, 5. 10. 2026).
    /// </para>
    /// </summary>
    public static string? ProcNejdeUlozitRevizi(int? poslanaKlientem, int soucasna)
    {
        if (poslanaKlientem is not { } poslana) return RevizeChybi;
        return poslana == soucasna ? null : RevizeNesedi;
    }

    /// <summary>Nejdelší poznávací znak. Stojí na tlačítku lodi, víc se tam nevejde.</summary>
    public const int ZnakNejvic = 60;

    /// <summary>
    /// Poznávací znak k uložení: oříznutý, prázdný jako <c>null</c> — nebo
    /// chyba, když je moc dlouhý.
    /// </summary>
    public static (string? Znak, string? Chyba) UpravZnak(string? znak)
    {
        var oriznuty = znak?.Trim();
        if (string.IsNullOrEmpty(oriznuty)) return (null, null);
        return oriznuty.Length > ZnakNejvic
            ? (null, $"Poznávací znak má nejvýš {ZnakNejvic} znaků, ať se vejde na tlačítko.")
            : (oriznuty, null);
    }

    /// <summary>
    /// Je loď na regatě? Přihlášená, potvrzená i vyloučená ano — tyhle na
    /// startu jsou nebo byly. Požadavek z webu, vrácená, odmítnutá, zrušená
    /// a nedostavená ne. Stejné rozdělení jako na obrazovce přihlášek.
    /// </summary>
    public static bool NaRegate(StavUcasti stav) =>
        stav is StavUcasti.Prihlasena or StavUcasti.Potvrzena or StavUcasti.Vyloucena;

    /// <summary>
    /// <b>Jaký stav má rozjížďka po uložení sady.</b> Dojetá je ta, kde má
    /// každá loď na vodě dojezd nebo kód; loď bez výsledku ji drží otevřenou,
    /// protože se na ni čeká.
    ///
    /// <para>
    /// <b>Proč to je funkce výsledků, ne tlačítko</b> (15. 10. 2026):
    /// <c>Dokoncena</c> se do té doby nenastavovalo nikde a jediný přechod
    /// v API byl <c>Planovana → Probiha</c> při startu. Rozjížďka tak zůstala
    /// „probíhá" napořád — tabule hlásila „jede se" i po schválení a
    /// publikaci, alert „rozjížďka dojeta" nevyjel nikdy a veřejná trať, která
    /// bere rozjížďku na řadě, se po dojetí první už neposunula na další.
    /// </para>
    ///
    /// <para>
    /// Počítají se jen lodě <see cref="NaRegate"/> — odhlášená ani nedostavená
    /// se nečeká, vyloučená ano, protože své výsledky má. Platí to i zpátky:
    /// smazaný dojezd vrátí rozjížďku mezi probíhající, aby oprava nenechala
    /// dojetou rozjížďku s dírou. Zrušené se to netýká, ta se nejede.
    /// </para>
    /// </summary>
    public static StavRozjizdky StavPoZapisu(
        StavRozjizdky ted, bool odstartovano,
        IEnumerable<(StavUcasti Stav, bool MaVysledek)> lode,
        /// <summary>
        /// Zastavená časomíra. Rozjížďka je tím dojetá bez ohledu na zápis.
        /// </summary>
        bool casZastaven = false)
    {
        if (ted == StavRozjizdky.Zrusena) return ted;

        // <b>Zastavená časomíra rozhoduje dřív než zápis</b> (Filip, 20. 10.
        // 2026: *„lodě bez cíle dopíšeme, ale čas už zastav"*). Dokud to
        // uměl jen zápis, nešlo rozjížďku uzavřít, dokud se nedopsal papír;
        // na vodě je to opačně.
        if (casZastaven) return StavRozjizdky.Dokoncena;

        var naVode = lode.Where(l => NaRegate(l.Stav)).ToList();
        if (naVode.Count > 0 && naVode.TrueForAll(l => l.MaVysledek))
            return StavRozjizdky.Dokoncena;

        // Zpátky jen z dojeté: nedojetá rozjížďka bez startu zůstává
        // plánovaná, i když do ní někdo zapsal půlku papíru.
        if (ted == StavRozjizdky.Dokoncena)
            return odstartovano ? StavRozjizdky.Probiha : StavRozjizdky.Planovana;

        return ted;
    }

    /// <summary>
    /// Naměřený čas: od startu rozjížďky do dojezdu. <c>null</c>, když start
    /// zapsaný není, nebo když by vyšel záporný — to je špatně nastavený
    /// start, ne loď, která dojela dřív, než vyjela.
    /// </summary>
    public static TimeSpan? NamerenyCas(DateTimeOffset? start, DateTimeOffset dojezd) =>
        start is { } s && dojezd >= s ? dojezd - s : null;

    /// <summary>Proč rozjížďku nejde přepsat — nebo <c>null</c>.</summary>
    public static string? ProcNejdePrepsat(StavZavodu zavod, StavVysledku vysledky)
    {
        if (ProcNejdeNaZavod(zavod) is { } chyba) return chyba;

        return Otevreny(vysledky)
            ? null
            : $"Výsledky jsou ve stavu „{Workflow.Nazev(vysledky)}“ a dál se nepřepisují. "
              + "Když je v nich chyba, musí je rozhodčí vrátit k revizi.";
    }

    /// <summary>
    /// Proč se sada výsledků nedá uložit — nebo <c>null</c>.
    /// <para>
    /// Hlídá se všechno najednou a vrací se první problém. Uložení je celé,
    /// nebo nic: rozjížďka zpola zapsaná je horší než nezapsaná, protože
    /// chybějící řádek nikdo nepozná.
    /// </para>
    /// </summary>
    public static string? ProcNejdeUlozit(IReadOnlyList<ZapisRadek> radky)
    {
        if (radky.GroupBy(r => r.Vstup.PrihlaskaId).FirstOrDefault(g => g.Count() > 1) is { } dvakrat)
            return $"Loď {dvakrat.First().Lod} je v zápisu dvakrát.";

        foreach (var r in radky)
        {
            if (r.Vstup.PoradiVCili is < 1)
                return $"{r.Lod}: pořadí v cíli začíná jedničkou.";

            // Bodování by pořadí vedle kódu stejně nevzalo, takže by tu
            // zůstalo číslo, které nic neznamená a vypadá, že platí.
            if (r.Vstup.PoradiVCili is not null && r.Vstup.Kod is not null)
                return $"{r.Lod} má pořadí i kód. Buď dojela, nebo platí kód.";
        }

        // Uvnitř kategorie, ne přes celé pole: pořadí se v cíli píše přes
        // všechny lodě, ale body se počítají po kategoriích — a pořadatel,
        // který čísluje každou kategorii zvlášť, nesmí dostat chybu.
        var shoda = radky
            .Where(r => r.Vstup.PoradiVCili is not null)
            .GroupBy(r => (r.Kategorie, r.Vstup.PoradiVCili))
            .FirstOrDefault(g => g.Count() > 1);

        if (shoda is not null)
            return $"V kategorii {shoda.Key.Kategorie} má pořadí {shoda.Key.PoradiVCili} víc lodí: "
                   + string.Join(", ", shoda.Select(r => r.Lod)) + ".";

        return null;
    }
}
