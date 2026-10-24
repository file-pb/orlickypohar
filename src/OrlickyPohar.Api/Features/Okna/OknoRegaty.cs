using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Okna;

/// <summary>
/// Okno jednoho závodního dne: doba, ve které smí tracker zaznamenávat.
/// <para>
/// <b>Není to kalendářní den.</b> Dvacetičtyřhodinovka startuje večer
/// a končí až druhý den, FxCK CANCER je dvoudenní. Okno proto otevírá
/// a zavírá pořadatel, ne kalendář.
/// </para>
/// <para>
/// <b>Otevírá ho rozprava</b> (plán, *Okno závodního dne se věší na
/// rozpravu*). Je to úkon, který se stejně odehraje, takže se na něj nedá
/// zapomenout tak, jako na zvláštní tlačítko — a když se neodklikne vůbec,
/// okno se neotevře, tracker neběží a není co zobrazovat. Selže to na
/// bezpečnou stranu.
/// </para>
/// <para>
/// <b>Tvrdý konec platí, i když pořadatel zapomene cokoli vypnout.</b> Bez
/// něj se vrátíme k trase přes hospodu domů, tedy k přejímací podmínce
/// č. 5. *„Nechceme sledovat závodníky, jak nám lezou po hospodě a areálu
/// mariny ve svém volném čase."*
/// </para>
/// </summary>
public class OknoRegaty
{
    /// <summary>
    /// Výchozí délka okna od rozpravy. Pokrývá běžný závodní den
    /// i s rezervou na pozdní dojezd; delší regata si ji zadá sama.
    /// </summary>
    public const int VychoziHodin = 14;

    /// <summary>
    /// Nejdelší okno, jaké jde otevřít. Dvacetičtyřhodinovka potřebuje přes
    /// den a noc; nad to už je to zapomenuté okno, ne závod.
    /// </summary>
    public const int NejvicHodin = 36;

    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>Kolikátý závodní den regaty to je. Počítá se od jedné.</summary>
    public int Den { get; set; }

    /// <summary>Okamžik rozpravy, kterou se okno otevřelo.</summary>
    public DateTimeOffset OtevrenoV { get; set; }

    /// <summary>Kdo rozpravu odklikl.</summary>
    public Guid OtevrelId { get; set; }

    /// <summary>
    /// Nejzazší konec okna. Platí bez ohledu na to, jestli někdo den
    /// uzavřel — je to pojistka, ne plán.
    /// </summary>
    public DateTimeOffset TvrdyKonec { get; set; }

    /// <summary>Kdy pořadatel den uzavřel. Prázdné, dokud okno běží.</summary>
    public DateTimeOffset? ZavrenoV { get; set; }

    public Guid? ZavrelId { get; set; }

    /// <summary>
    /// Běží okno v daném okamžiku? Konec je ten dřívější z uzavření
    /// a tvrdého konce.
    /// </summary>
    public bool Bezi(DateTimeOffset kdy) =>
        kdy >= OtevrenoV && kdy < Konec;

    /// <summary>Kdy okno skončilo nebo skončí.</summary>
    public DateTimeOffset Konec =>
        ZavrenoV is { } zavreno && zavreno < TvrdyKonec ? zavreno : TvrdyKonec;
}
