using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Jeden řádek snímku zápisu. Tvarem odpovídá <see cref="ZapisRadekVstup"/> —
/// je to přesně to, co ten zapisovatel naposledy poslal.
/// </summary>
public class NavrhRadek
{
    public int PrihlaskaId { get; set; }
    public int? PoradiVCili { get; set; }
    public KodVysledku? Kod { get; set; }
    public DateTimeOffset? DojezdV { get; set; }
}

/// <summary>
/// Snímek zápisu jednoho zapisovatele (PLAN.md, Zápis z vody, krok 4).
/// <para>
/// <b>Na vodě zapisují dva</b> a každý na svém telefonu. Výsledky rozjížďky
/// jsou jedny, takže druhé uložení to první přepíše — a bez snímků by verze
/// toho prvního zmizela dřív, než by si jí kdo všiml. Snímek proto vzniká
/// při každém uložení zápisu a drží se k dvojici rozjížďka × uživatel.
/// </para>
/// <para>
/// <b>Není to výsledek, je to doklad o tom, co kdo viděl.</b> Do bodování
/// nevstupuje; slouží k porovnání, ze kterého zapisovatelé vyberou správné
/// pořadí. S jedním zapisovatelem je snímek jen jeden a porovnávat není co.
/// </para>
/// <para>
/// Řádky leží v jednom sloupci jako JSON. Jsou to pracovní data, ke kterým
/// se nikdy nepřipojuje ani nedotazuje podle jednotlivé lodi — vlastní
/// tabulka by přidala vazby, které by nikdo nepoužil.
/// </para>
/// </summary>
public class ZapisNavrh
{
    public int Id { get; set; }

    public int RozjizdkaId { get; set; }
    public Rozjizdka? Rozjizdka { get; set; }

    /// <summary>Kdo zapisoval. Snímek je vždycky čísi, anonymní nemá smysl.</summary>
    public Guid UzivatelId { get; set; }
    public Uzivatel? Uzivatel { get; set; }

    /// <summary>Kdy tenhle zapisovatel naposledy uložil.</summary>
    public DateTimeOffset ZapsanoV { get; set; }

    public List<NavrhRadek> Radky { get; set; } = [];
}
