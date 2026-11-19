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

    /// <summary>
    /// Přečetl ta čísla stroj z fotky papíru?
    /// <para>
    /// <b>Třetí zapisovatel vedle dvou lidských</b> (oponentura rozhodčího,
    /// 27. 10. 2026). Papír z cíle se stejně fotí a fotka v aplikaci leží;
    /// rozpoznaná čísla jsou přesně takový druhý zdroj jako zápis z druhého
    /// telefonu — nezávazný doklad o tom, co kdo viděl.
    /// </para>
    /// <para>
    /// <b>Proč vlastní příznak a ne jen autor.</b> Snímek je vždycky čísi,
    /// takže patří tomu, kdo rozpoznaná čísla vložil. Jenže ten je
    /// nezapisoval ani neviděl v cíli — a rozhodčí, který verze porovnává,
    /// musí vědět, které z nich četl stroj. Ruční zápis je svědectví,
    /// tohle je odhad z fotky; spolehlivost je nižší a u výsledků je chyba
    /// drahá (Filip, 18. 11. 2026).
    /// </para>
    /// </summary>
    public bool ZPapiru { get; set; }

    /// <summary>
    /// Čemu stroj nerozuměl — řádky z papíru, které se nepodařilo spárovat
    /// s lodí. Drží se u snímku, aby bylo při potvrzování vidět, že fotka
    /// nesla víc, než co je v tabulce.
    /// </summary>
    public List<string> Neprecteno { get; set; } = [];

    public List<NavrhRadek> Radky { get; set; } = [];
}
