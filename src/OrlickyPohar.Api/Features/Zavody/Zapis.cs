namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Jeden řádek zápisu: loď přes přihlášku, pořadí v cíli, nebo kód.</summary>
public record ZapisRadekVstup(int PrihlaskaId, int? PoradiVCili = null, KodVysledku? Kod = null);

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
