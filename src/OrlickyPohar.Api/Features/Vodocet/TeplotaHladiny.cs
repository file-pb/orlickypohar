namespace OrlickyPohar.Api.Features.Vodocet;

/// <summary>
/// Povrchová teplota Orlíku v jednom místě z jednoho snímku Landsat.
/// <para>
/// <b>Odkud.</b> Přímo v nádrži nikdo teplotu průběžně neměří a nezveřejňuje.
/// Landsat 8/9 měří povrchovou teplotu zhruba jednou za týden, když není
/// zataženo. Počítá to plánovaná úloha <c>jobs/landsat</c> a posílá sem
/// hotová čísla; metoda a nálezy jsou v jejím README.
/// </para>
/// <para>
/// <b>Co to je.</b> Horní vrstva vody kolem poledne, medián pixelů aspoň
/// ~100 m od břehu. Neověřeno teploměrem — do kalibrace je to odhad.
/// </para>
/// <para>
/// Přirozený klíč je snímek × místo: úloha posílá snímky opakovaně
/// (dopočítává i ty, které se objeví se zpožděním) a nic se nesmí zdvojit.
/// Místa jsou jen slug; které tvoří „centrum" ve widgetu, rozhoduje web.
/// </para>
/// </summary>
public class TeplotaHladiny
{
    public const int SnimekNejvic = 64;
    public const int MistoNejvic = 40;

    public int Id { get; set; }

    /// <summary>Identifikátor snímku Landsat, třeba <c>LC09_L2SP_192026_20260815_02_T1</c>.</summary>
    public required string Snimek { get; set; }

    /// <summary>Čas pořízení snímku v UTC.</summary>
    public DateTimeOffset Cas { get; set; }

    /// <summary>Slug místa, třeba <c>radava</c>.</summary>
    public required string Misto { get; set; }

    /// <summary>°C, na desetiny.</summary>
    public decimal Teplota { get; set; }

    /// <summary>Kolik pixelů vody bez mraků do mediánu vešlo.</summary>
    public int Pixelu { get; set; }
}
