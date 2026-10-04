using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Nárok na loď — třetí cesta párování (plán, *Jak se z přihlášení stane
/// „kormidelník lodi Anička"*).
/// <para>
/// <b>Pro ty, na koho nesedl e-mail a kdo nemá kód.</b> Uživatel si o loď
/// řekne, kapitán nebo majitel to potvrdí. Nikoho to nestojí nic předem:
/// pořadatel nemusí nic rozdávat a kapitán kliká, jen když někdo přijde.
/// </para>
/// <para>
/// <b>Nárok sám o sobě nedává nic.</b> Dokud ho někdo nepotvrdí, je to jen
/// žádost — žádná role, žádné právo odeslat trasu.
/// </para>
/// </summary>
public class NarokNaLod
{
    public int Id { get; set; }

    public int LodId { get; set; }
    public Lod? Lod { get; set; }

    public Guid UzivatelId { get; set; }
    public Uzivatel? Uzivatel { get; set; }

    /// <summary>Co o sobě žadatel říká: „jsem posádka", „kormidluju ji".</summary>
    public string? Poznamka { get; set; }

    public DateTimeOffset PodanV { get; set; }

    /// <summary>
    /// Kdy a kdo rozhodl. Prázdné znamená, že nárok čeká. Zamítnutý nárok
    /// zůstává: bez něj by žadatel mohl žádat donekonečna a kapitán by
    /// nevěděl, že už jednou řekl ne.
    /// </summary>
    public DateTimeOffset? RozhodnutoV { get; set; }
    public Guid? RozhodlId { get; set; }
    public Uzivatel? Rozhodl { get; set; }

    public bool Prijat { get; set; }
}

/// <summary>Nárok, jak ho vidí kapitán ve frontě.</summary>
public record NarokDto(
    int Id, string Kdo, string? Poznamka, DateTimeOffset PodanV);

/// <summary>Nárok, jak ho vidí žadatel: u které lodi stojí a jak dopadl.</summary>
public record MujNarokDto(
    int Id, int LodId, string Lod, string? Poznamka, DateTimeOffset PodanV,
    bool Ceka, bool Prijat);

/// <summary>Co žadatel posílá.</summary>
public record NarokVstup(int LodId, string? Poznamka);

/// <summary>
/// Podání nároku a rozhodnutí o něm.
/// </summary>
public class NarokySprava(AppDbContext db, TimeProvider cas, ILogger<NarokySprava> log)
{
    public const int PoznamkaNejvic = 200;

    public const string Dvakrat = "O tuhle loď už žádáš, kapitán to uvidí.";
    public const string UzPatris = "K téhle lodi už patříš.";
    public const string Zamitnuto =
        "O tuhle loď jsi už žádal a kapitán žádost zamítl. Domluv se s ním napřímo.";

    /// <summary>Podá nárok. Vrací chybu k zobrazení, nebo <c>null</c>.</summary>
    public async Task<string?> PodejAsync(Guid uzivatelId, NarokVstup vstup, CancellationToken ct)
    {
        if (!await db.Lode.AnyAsync(l => l.Id == vstup.LodId, ct)) return "Taková loď tu není.";

        if (await db.VazbyKLodim.AnyAsync(
                v => v.LodId == vstup.LodId && v.UzivatelId == uzivatelId, ct))
            return UzPatris;

        var drivejsi = await db.Naroky
            .Where(n => n.LodId == vstup.LodId && n.UzivatelId == uzivatelId)
            .OrderByDescending(n => n.Id)
            .FirstOrDefaultAsync(ct);

        if (drivejsi is { RozhodnutoV: null }) return Dvakrat;
        // Zamítnutí platí: další žádost by byla obcházení kapitánova ne.
        if (drivejsi is { Prijat: false, RozhodnutoV: not null }) return Zamitnuto;

        db.Naroky.Add(new NarokNaLod
        {
            LodId = vstup.LodId,
            UzivatelId = uzivatelId,
            Poznamka = string.IsNullOrWhiteSpace(vstup.Poznamka)
                ? null
                : vstup.Poznamka.Trim()[..Math.Min(vstup.Poznamka.Trim().Length, PoznamkaNejvic)],
            PodanV = cas.GetUtcNow(),
        });
        await db.SaveChangesAsync(ct);

        log.LogInformation("Účet {Uzivatel} žádá o loď {Lod}", uzivatelId, vstup.LodId);
        return null;
    }

    /// <summary>Nároky čekající u lodi. Pro kapitána a majitele.</summary>
    public Task<List<NarokDto>> CekajiciAsync(int lodId, CancellationToken ct) =>
        db.Naroky
            .Where(n => n.LodId == lodId && n.RozhodnutoV == null)
            .OrderBy(n => n.PodanV)
            .Select(n => new NarokDto(n.Id, n.Uzivatel!.Zobrazovane, n.Poznamka, n.PodanV))
            .ToListAsync(ct);

    /// <summary>Nároky, které podal přihlášený. Ať ví, na co čeká.</summary>
    public Task<List<MujNarokDto>> MojeAsync(Guid uzivatelId, CancellationToken ct) =>
        db.Naroky
            .Where(n => n.UzivatelId == uzivatelId)
            .OrderByDescending(n => n.PodanV)
            .Select(n => new MujNarokDto(
                n.Id, n.LodId, n.Lod!.Nazev, n.Poznamka, n.PodanV,
                n.RozhodnutoV == null, n.Prijat))
            .ToListAsync(ct);

    /// <summary>
    /// Rozhodne o nároku. Přijetí zakládá vazbu <b>posádky</b> — kapitána
    /// z nikoho nedělá nárok, ale ten, kdo loď převzal jako první.
    /// </summary>
    public async Task<string?> RozhodniAsync(
        int lodId, int narokId, bool prijmout, Guid kdo, CancellationToken ct)
    {
        var narok = await db.Naroky
            .FirstOrDefaultAsync(n => n.Id == narokId && n.LodId == lodId, ct);
        if (narok is null) return "Takový nárok u lodi není.";
        if (narok.RozhodnutoV is not null) return "O tomhle nároku už je rozhodnuto.";

        narok.RozhodnutoV = cas.GetUtcNow();
        narok.RozhodlId = kdo;
        narok.Prijat = prijmout;

        if (prijmout && !await db.VazbyKLodim.AnyAsync(
                v => v.LodId == lodId && v.UzivatelId == narok.UzivatelId, ct))
        {
            db.VazbyKLodim.Add(new VazbaKLodi
            {
                LodId = lodId,
                UzivatelId = narok.UzivatelId,
                Role = RoleKLodi.Posadka,
                Puvod = PuvodVazby.Narok,
                VzniklaV = narok.RozhodnutoV.Value,
                PotvrdilId = kdo,
            });
        }

        await db.SaveChangesAsync(ct);
        log.LogInformation("Nárok {Narok} na loď {Lod}: {Vysledek}",
            narokId, lodId, prijmout ? "přijat" : "zamítnut");
        return null;
    }
}
