using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Spolecne;

/// <summary>
/// Druh rozhodnutí, které rozhodčí udělal na vodě.
/// <para>
/// Výčet roste s tím, co appka umí. Hodnoty se nepřečíslovávají — zapsané
/// rozhodnutí se vykládá podle čísla, které dostalo tehdy.
/// </para>
/// </summary>
public enum DruhRozhodnuti
{
    /// <summary>Rozjížďka uzavřena, lodě bez dojezdu dostaly DNF.</summary>
    UkonceniRozjizdky = 0,

    /// <summary>Zapsán dojezd lodi.</summary>
    ZapisDojezdu = 1,

    /// <summary>Zapsán kód místo dojezdu (DNF, OCS, DSQ…).</summary>
    ZapisKodu = 2,

    /// <summary>Udělen trest za jízdy (otáčky podle ZPJ 31 nebo 44).</summary>
    Trest = 3,

    /// <summary>Úkon za jízdy: změna úseku nebo chybějící značka.</summary>
    UkonZaJizdy = 4,

    /// <summary>Zásah do startovní procedury: spuštění, odložení, odvolání.</summary>
    Procedura = 5,

    /// <summary>Zrušení rozjížďky.</summary>
    ZruseniRozjizdky = 6,
}

/// <summary>
/// Kde byl rozhodčí, když o něčem rozhodl.
///
/// <para>
/// <b>Proč to existuje.</b> Rozhodnutí na vodě — hlavně ta, která lodi
/// uberou (DNF, trest, OCS) — se dají zpochybnit, a jediné, co je později
/// doloží, jsou okolnosti: kdy to bylo a odkud to rozhodčí viděl. Filip,
/// 29. 10. 2026: *„když bude ukončovat lodě z vody, tak by bylo dobré
/// evidovat zatím jen datově pozice, kde byl v tu dobu rozhodčí a kde byl
/// závodník."* Appka to nezobrazuje; sbírá se to proto, že zpětně se to
/// dosbírat nedá.
/// </para>
///
/// <para>
/// <b>Proč tu není poloha lodi.</b> Ta v databázi už je — trasa lodi
/// (<c>TrasaBody</c>) nese body s časem, takže se dohledá podle
/// <see cref="KdyRozhodl"/>. Uložit ji sem podruhé by znamenalo dva
/// záznamy téhož, které se můžou rozejít; a trasa navíc dovolí podívat
/// se i na to, kudy loď jela před tím a potom, což samotný bod neřekne.
/// </para>
///
/// <para>
/// <b>Proč vlastní tabulka a ne pole na entitách.</b> Rozhodnutí je víc
/// druhů a přibývají; tři sloupce navíc u každé entity by se rozlezly
/// a čtení přes ně by znamenalo spojovat pět tabulek. Takhle je to jedno
/// místo, do kterého se dívá ten, kdo se ptá „jak k tomu rozhodčí přišel".
/// </para>
/// </summary>
public class OkolnostRozhodnuti
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>Rozjížďka, které se rozhodnutí týká. <c>null</c> u zásahu mimo ni.</summary>
    public int? RozjizdkaId { get; set; }
    public Rozjizdka? Rozjizdka { get; set; }

    /// <summary>
    /// Loď, které se rozhodnutí týká — přihláškou, protože ta váže loď
    /// k regatě. <c>null</c> u rozhodnutí o celé rozjížďce.
    /// </summary>
    public int? PrihlaskaId { get; set; }
    public Prihlaska? Prihlaska { get; set; }

    public DruhRozhodnuti Druh { get; set; }

    public Guid KdoId { get; set; }
    public Uzivatel? Kdo { get; set; }

    /// <summary>
    /// Kdy rozhodčí rozhodl — čas z telefonu, prošel-li oknem
    /// v <see cref="CasKlienta"/>; jinak čas zápisu. Podle něj se
    /// z trasy dohledává, kde byla loď.
    /// </summary>
    public DateTimeOffset KdyRozhodl { get; set; }

    /// <summary>Kdy to doputovalo na server. Liší se u rozhodnutí bez signálu.</summary>
    public DateTimeOffset KdyZapsano { get; set; }

    /// <summary>Co se stalo s časem z telefonu.</summary>
    public CasKlienta.Posun PosunCasu { get; set; }

    /// <summary>
    /// Kde byl rozhodčí. <c>null</c>, když telefon polohu nedal — appka
    /// ji posílá, jen když ji má, a <b>rozhodnutí se kvůli chybějící
    /// poloze nesmí zdržet</b>: na vodě je důležitější, že se zapsalo.
    /// </summary>
    public double? Sirka { get; set; }
    public double? Delka { get; set; }

    /// <summary>
    /// Přesnost polohy v metrech, jak ji hlásí telefon. Bez ní se nedá
    /// poznat měření od odhadu — iPhone s vypnutou přesnou polohou hlásí
    /// i 65 m a bez čísla by to vypadalo stejně jako 5 m (totéž pravidlo
    /// jako u pípnutí bóje).
    /// </summary>
    public double? PresnostM { get; set; }

    /// <summary>
    /// Co k tomu rozhodčí řekl, pokud něco. Důvod zrušení, poznámka
    /// u trestu — krátký text, ne vyprávění.
    /// </summary>
    public string? Poznamka { get; set; }
}

/// <summary>Co appka posílá k rozhodnutí. Všechno volitelné: chybějící údaj rozhodnutí nezdrží.</summary>
public record OkolnostiVstup(
    DateTimeOffset? KdyRozhodl = null,
    double? Sirka = null,
    double? Delka = null,
    double? PresnostM = null);
