using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Tracker;

/// <summary>Co pořadatel posílá, když nastavení mění.</summary>
public record NastaveniVstup(
    CoVidiPosadky CoVidiPosadky,
    bool ZivyPrenosVen,
    bool JizdyPoRegateVerejne,
    string? Duvod);

/// <summary>Nastavení i s tím, co se s ním ještě smí dělat.</summary>
public record NastaveniDto(
    CoVidiPosadky CoVidiPosadky,
    bool ZivyPrenosVen,
    bool JizdyPoRegateVerejne,
    DateTimeOffset? ZamcenoV,
    bool Zamceno);

/// <summary>Jedna zapsaná změna, pro doklad po regatě.</summary>
public record ZmenaDto(
    DateTimeOffset Kdy,
    Guid UzivatelId,
    CoVidiPosadky ZPosadky,
    CoVidiPosadky NaPosadky,
    bool ZVen,
    bool NaVen,
    bool ZJizdy,
    bool NaJizdy,
    string? Duvod,
    bool PoZamku);

/// <summary>
/// Nastavení zobrazení trackingu na regatě.
/// <para>
/// <b>Zpřísnit smí rozhodčí pořád, rozšířit nikdo.</b> Vypnutí má důvod:
/// může se ukázat, že se živá data používají způsobem, který se nelíbí.
/// Zapnout *„i ostatní"* uprostřed regaty ale nesmí ani on — to je přesně
/// ta změna pravidel, které má zámek bránit.
/// </para>
/// </summary>
public class NastaveniSprava(AppDbContext db, TimeProvider cas)
{
    public const string ZamceneRozsireni =
        "Po rozpravě se nastavení smí už jen zpřísnit, ne rozšířit.";

    public const string ChybiDuvod =
        "Zásah do zamčeného nastavení se zapisuje s důvodem — bez něj se po regatě "
        + "nedá zjistit, proč se to změnilo.";

    /// <summary>
    /// Nastavení regaty. Když ještě žádné není, vrátí se výchozí — a to je
    /// to bezpečné: posádky jen sebe, ven nic.
    /// </summary>
    public async Task<NastaveniDto> NactiAsync(int zavodId, CancellationToken ct)
    {
        var n = await NajdiAsync(zavodId, ct);
        return n is null
            ? new NastaveniDto(CoVidiPosadky.JenSebe, false, false, null, false)
            : Dto(n);
    }

    public async Task<List<ZmenaDto>> ZmenyAsync(int zavodId, CancellationToken ct) =>
        await db.ZmenyNastaveniTrackeru
            .Where(z => z.Nastaveni!.ZavodId == zavodId)
            .OrderBy(z => z.Kdy)
            .Select(z => new ZmenaDto(
                z.Kdy, z.UzivatelId, z.ZPosadky, z.NaPosadky, z.ZVen, z.NaVen,
                z.ZJizdy, z.NaJizdy, z.Duvod, z.PoZamku))
            .ToListAsync(ct);

    /// <summary>
    /// Uloží nastavení. Druhá hodnota je důvod odmítnutí — po zamčení se
    /// smí jen zpřísnit a jen s důvodem.
    /// </summary>
    public async Task<(NastaveniDto? Nastaveni, string? Chyba)> UlozAsync(
        int zavodId, NastaveniVstup vstup, Guid kdo, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();
        var n = await NajdiAsync(zavodId, ct) ?? Zaloz(zavodId);

        if (n.Zamceno)
        {
            // Zpřísnit znamená zúžit: míň vidí posádky, nebo se zavře výdej
            // ven. Jízdy po regatě se nezamykají vůbec — rozhoduje se o nich
            // až po závodě.
            if (vstup.CoVidiPosadky > n.CoVidiPosadky) return (null, ZamceneRozsireni);
            if (vstup.ZivyPrenosVen && !n.ZivyPrenosVen) return (null, ZamceneRozsireni);

            var meniSe = vstup.CoVidiPosadky != n.CoVidiPosadky
                         || vstup.ZivyPrenosVen != n.ZivyPrenosVen
                         || vstup.JizdyPoRegateVerejne != n.JizdyPoRegateVerejne;
            if (meniSe && string.IsNullOrWhiteSpace(vstup.Duvod)) return (null, ChybiDuvod);
        }

        n.Zmeny.Add(new ZmenaNastaveniTrackeru
        {
            Kdy = ted,
            UzivatelId = kdo,
            ZPosadky = n.CoVidiPosadky,
            NaPosadky = vstup.CoVidiPosadky,
            ZVen = n.ZivyPrenosVen,
            NaVen = vstup.ZivyPrenosVen,
            ZJizdy = n.JizdyPoRegateVerejne,
            NaJizdy = vstup.JizdyPoRegateVerejne,
            Duvod = string.IsNullOrWhiteSpace(vstup.Duvod) ? null : vstup.Duvod.Trim(),
            PoZamku = n.Zamceno,
        });

        n.CoVidiPosadky = vstup.CoVidiPosadky;
        n.ZivyPrenosVen = vstup.ZivyPrenosVen;
        n.JizdyPoRegateVerejne = vstup.JizdyPoRegateVerejne;

        await db.SaveChangesAsync(ct);
        return (Dto(n), null);
    }

    /// <summary>
    /// Zamkne nastavení. Volá to rozprava, ne člověk.
    /// <para>
    /// <b>Druhý den už zámek nelomí</b> — vrací se, co platí, a to bez
    /// ohledu na to, kolikátá rozprava to je.
    /// </para>
    /// </summary>
    public async Task<NastaveniDto> ZamkniAsync(int zavodId, DateTimeOffset kdy, CancellationToken ct)
    {
        var n = await NajdiAsync(zavodId, ct) ?? Zaloz(zavodId);
        // Zamyká se i nastavení, které nikdo nezaložil: výchozí hodnota je
        // bezpečná a zamrznout musí stejně jako ta zadaná.
        n.ZamcenoV ??= kdy;
        await db.SaveChangesAsync(ct);
        return Dto(n);
    }

    private Task<NastaveniTrackeru?> NajdiAsync(int zavodId, CancellationToken ct) =>
        db.NastaveniTrackeru
            .Include(n => n.Zmeny)
            .FirstOrDefaultAsync(n => n.ZavodId == zavodId, ct);

    private NastaveniTrackeru Zaloz(int zavodId)
    {
        var n = new NastaveniTrackeru { ZavodId = zavodId };
        db.NastaveniTrackeru.Add(n);
        return n;
    }

    private static NastaveniDto Dto(NastaveniTrackeru n) =>
        new(n.CoVidiPosadky, n.ZivyPrenosVen, n.JizdyPoRegateVerejne, n.ZamcenoV, n.Zamceno);
}
