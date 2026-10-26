using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Zpravy;

/// <summary>Zpráva tak, jak ji vidí tabule i správa.</summary>
public record ZpravaDto(
    int Id,
    string Text,
    DruhZpravy Druh,
    DateTimeOffset VydanoV,
    DateTimeOffset? PlatiDo,
    DateTimeOffset? StazenoV);

/// <summary>Co pořadatel posílá, když zprávu vydává.</summary>
/// <param name="PlatiHodin">
/// Za kolik hodin dohoří sama. Prázdné znamená „dokud ji někdo nestáhne“.
/// </param>
public record ZpravaVstup(string Text, DruhZpravy Druh, double? PlatiHodin);

/// <summary>
/// Vývěska regaty: krátké zprávy, které pořadatel vydává během dne.
/// <para>
/// <b>Vydávají se a stahují, nepřepisují.</b> Oprava je nová zpráva —
/// stejně jako u směrnic. Kdo si tabule všiml před hodinou, musí mít
/// šanci dohledat, co na ní tehdy stálo.
/// </para>
/// </summary>
public class ZpravySprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>Nejdelší text zprávy. Delší se na tabuli stejně nepřečte.</summary>
    public const int TextNejvic = 400;

    /// <summary>Nejdelší lhůta platnosti. Delší znamená „bez lhůty“.</summary>
    public const double PlatnostNejvicHodin = 72;

    /// <summary>Co platí teď — to, co jde na tabuli.</summary>
    public async Task<List<ZpravaDto>> PlatneAsync(int zavodId, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();
        return await db.Zpravy
            .Where(z => z.ZavodId == zavodId && z.StazenoV == null
                        && (z.PlatiDo == null || z.PlatiDo > ted))
            // Výstraha nahoru, pak podle stáří: na tabuli je nejvýš pár
            // řádků a bouřka nesmí skončit pod oznámením o rozpravě.
            .OrderByDescending(z => z.Druh == DruhZpravy.Vystraha)
            .ThenByDescending(z => z.VydanoV)
            .Select(z => new ZpravaDto(z.Id, z.Text, z.Druh, z.VydanoV, z.PlatiDo, z.StazenoV))
            .ToListAsync(ct);
    }

    /// <summary>Všechno včetně stažených — pro správu, kde se dohledává.</summary>
    public async Task<List<ZpravaDto>> SeznamAsync(int zavodId, CancellationToken ct) =>
        await db.Zpravy
            .Where(z => z.ZavodId == zavodId)
            .OrderByDescending(z => z.VydanoV)
            .Select(z => new ZpravaDto(z.Id, z.Text, z.Druh, z.VydanoV, z.PlatiDo, z.StazenoV))
            .ToListAsync(ct);

    /// <summary>
    /// Vydá zprávu. Druhá hodnota je důvod odmítnutí — prázdný text
    /// a přestřelená lhůta se vracejí jako chyba, ne jako tichá oprava.
    /// </summary>
    public async Task<(ZpravaDto? Zprava, string? Chyba)> VydejAsync(
        int zavodId, ZpravaVstup vstup, Guid kdo, CancellationToken ct)
    {
        var text = vstup.Text?.Trim();
        if (string.IsNullOrEmpty(text)) return (null, "Zpráva bez textu nedává smysl.");
        if (text.Length > TextNejvic)
            return (null, $"Zpráva má nejvýš {TextNejvic} znaků; delší se na tabuli nepřečte.");
        if (vstup.PlatiHodin is { } h && (h <= 0 || h > PlatnostNejvicHodin))
            return (null, $"Platnost se zadává v hodinách, nejvíc {PlatnostNejvicHodin:0}.");

        var ted = cas.GetUtcNow();
        var zprava = new ZpravaRegaty
        {
            ZavodId = zavodId,
            Text = text,
            Druh = vstup.Druh,
            VydanoV = ted,
            VydalId = kdo,
            PlatiDo = vstup.PlatiHodin is { } hodin ? ted.AddHours(hodin) : null,
        };

        db.Zpravy.Add(zprava);
        await db.SaveChangesAsync(ct);
        return (Dto(zprava), null);
    }

    /// <summary>
    /// Stáhne zprávu. Stáhnout staženou není chyba — na vodě se klikne
    /// dvakrát spíš než vůbec.
    /// </summary>
    public async Task<ZpravaDto?> StahniAsync(int zavodId, int id, CancellationToken ct)
    {
        var zprava = await db.Zpravy.FirstOrDefaultAsync(z => z.Id == id && z.ZavodId == zavodId, ct);
        if (zprava is null) return null;

        zprava.StazenoV ??= cas.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return Dto(zprava);
    }

    private static ZpravaDto Dto(ZpravaRegaty z) =>
        new(z.Id, z.Text, z.Druh, z.VydanoV, z.PlatiDo, z.StazenoV);
}
