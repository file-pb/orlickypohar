using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Tracker;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Okna;

/// <summary>Co pořadatel pošle, když rozpravou okno otevírá.</summary>
/// <param name="TrvaniHodin">
/// Jak dlouho smí okno nejdéle běžet. Prázdné znamená
/// <see cref="OknoRegaty.VychoziHodin"/>; dvacetičtyřhodinovka si řekne
/// o víc.
/// </param>
public record RozpravaVstup(int? TrvaniHodin);

/// <summary>
/// Co po závodním dni zůstalo otevřené.
/// <para>
/// <b>Uzavření dne je ten okamžik, kdy se to dá říct</b> (Filip, 24. 10.
/// 2026: *„logické pojistky, aby nám tam nezůstávaly takové věci"*).
/// Pořadatel ho dělá tak jako tak, takže se na něj dá pověsit kontrola —
/// stejně jako rozprava nese otevření okna i zámek nastavení.
/// </para>
/// <para>
/// <b>Nic se tím nezavírá.</b> Konec rozjížďky je rozhodnutí rozhodčího,
/// ne dopočet; systém proto jen řekne, co zbylo, a nechá to na člověku.
/// </para>
/// </summary>
/// <param name="Rozjizdky">Čísla rozjížděk, které pořád „běží".</param>
/// <param name="RozdelaneTrasy">
/// Trasy, které telefon nedokončil. Po tvrdém konci okna už do nich
/// nikdo nic nepošle, takže zůstanou rozdělané napořád.
/// </param>
public record ZustaloOtevrene(IReadOnlyList<int> Rozjizdky, int RozdelaneTrasy)
{
    public bool Neco => Rozjizdky.Count > 0 || RozdelaneTrasy > 0;
}

/// <summary>Okno tak, jak ho vidí pořadatel i telefon.</summary>
public record OknoDto(
    int Id,
    int Den,
    DateTimeOffset OtevrenoV,
    DateTimeOffset TvrdyKonec,
    DateTimeOffset? ZavrenoV,
    bool Bezi,
    /// <summary>Co po dni zůstalo otevřené. Plní se jen při uzavírání.</summary>
    ZustaloOtevrene? Zbylo = null);

/// <summary>Okno i s regatou, ke které patří. Telefon si bere obojí.</summary>
public record OknoRegatyDto(
    int Id,
    int ZavodId,
    string Serie,
    string Zavod,
    string Nazev,
    int Den,
    DateTimeOffset OtevrenoV,
    DateTimeOffset TvrdyKonec,
    DateTimeOffset? ZavrenoV,
    bool Bezi);

/// <summary>
/// Okna závodních dnů: kdy smí tracker zaznamenávat.
/// <para>
/// <b>Jedno běžící okno na regatu.</b> Rozprava se smí odkliknout kolikrát
/// chce — druhé okno nezaloží, vrátí to běžící. Na vodě se klikne dvakrát
/// častěji, než se nekline vůbec, a chybová hláška by pořadateli v tu
/// chvíli nijak nepomohla.
/// </para>
/// </summary>
public class OknaSprava(AppDbContext db, TimeProvider cas, NastaveniSprava nastaveni)
{
    /// <summary>Stavy účasti, ve kterých loď na regatě závodí.</summary>
    private static readonly StavUcasti[] NaZavode =
        [StavUcasti.Prihlasena, StavUcasti.Potvrzena];

    /// <summary>
    /// Otevře okno rozpravou, nebo vrátí to, které už běží. Druhá hodnota
    /// říká, jestli okno vzniklo teď.
    /// </summary>
    public async Task<(OknoDto Okno, bool Nove)> OtevriAsync(
        int zavodId, Guid kdo, int? trvaniHodin, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();

        if (await BeziciAsync(zavodId, ted, ct) is { } uzBezi)
            return (Dto(uzBezi, ted), false);

        var hodin = Math.Clamp(
            trvaniHodin ?? OknoRegaty.VychoziHodin, 1, OknoRegaty.NejvicHodin);

        // Den se počítá z toho, kolikátá rozprava to je, ne z kalendáře:
        // dvacetičtyřhodinovka má jedno okno přes dva kalendářní dny.
        var den = await db.Okna.CountAsync(o => o.ZavodId == zavodId, ct) + 1;

        var okno = new OknoRegaty
        {
            ZavodId = zavodId,
            Den = den,
            OtevrenoV = ted,
            OtevrelId = kdo,
            TvrdyKonec = ted.AddHours(hodin),
        };

        db.Okna.Add(okno);
        await db.SaveChangesAsync(ct);

        // Rozprava nese tři věci naráz: otevře okno, zamkne nastavení
        // zobrazení a je to check-in. Je to dobře, protože se nedá udělat
        // půlka — a když se neodklikne vůbec, okno se neotevře, tracker
        // neběží a zůstane odemčené nastavení, které nemá na co působit.
        await nastaveni.ZamkniAsync(zavodId, ted, ct);

        return (Dto(okno, ted), true);
    }

    /// <summary>
    /// Uzavře den. Když žádné okno neběží, vrátí poslední — zavřít zavřené
    /// není chyba, jen nic nedělá.
    /// </summary>
    public async Task<OknoDto?> UzavriAsync(int zavodId, Guid kdo, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();

        if (await BeziciAsync(zavodId, ted, ct) is { } okno)
        {
            okno.ZavrenoV = ted;
            okno.ZavrelId = kdo;
            await db.SaveChangesAsync(ct);
            return Dto(okno, ted) with { Zbylo = await ZbyloAsync(zavodId, okno, ct) };
        }

        var posledni = await db.Okna
            .Where(o => o.ZavodId == zavodId)
            .OrderByDescending(o => o.OtevrenoV)
            .FirstOrDefaultAsync(ct);

        return posledni is null ? null : Dto(posledni, ted);
    }

    /// <summary>
    /// Co po dni zůstalo otevřené. Volá se při uzavírání, aby to pořadatel
    /// viděl ve chvíli, kdy s tím ještě může něco udělat.
    /// </summary>
    public async Task<ZustaloOtevrene> ZbyloAsync(
        int zavodId, OknoRegaty okno, CancellationToken ct)
    {
        var rozjizdky = await db.Rozjizdky
            .Where(r => r.ZavodId == zavodId && r.Stav == StavRozjizdky.Probiha)
            .OrderBy(r => r.Cislo)
            .Select(r => r.Cislo)
            .ToListAsync(ct);

        var trasy = await db.Trasy
            .CountAsync(t => t.OknoId == okno.Id && !t.Dokoncena, ct);

        return new ZustaloOtevrene(rozjizdky, trasy);
    }

    public async Task<List<OknoDto>> SeznamAsync(int zavodId, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();
        var okna = await db.Okna
            .Where(o => o.ZavodId == zavodId)
            .OrderBy(o => o.Den)
            .ToListAsync(ct);

        return [.. okna.Select(o => Dto(o, ted))];
    }

    /// <summary>Okno, které u téhle regaty právě běží.</summary>
    public async Task<OknoRegaty?> BeziciAsync(int zavodId, DateTimeOffset kdy, CancellationToken ct)
    {
        var okna = await db.Okna
            .Where(o => o.ZavodId == zavodId && o.OtevrenoV <= kdy && o.TvrdyKonec > kdy)
            .ToListAsync(ct);

        return okna.FirstOrDefault(o => o.Bezi(kdy));
    }

    /// <summary>
    /// Okno, ve kterém tahle loď právě smí zaznamenávat. Hledá se přes
    /// účast: <b>loď, která v regatě není, nemá co trackovat.</b>
    /// <para>
    /// Když okna běží dvě (dvě regaty téhož dne, což se nestává, ale
    /// vyloučit to nejde), bere se to, které se otevřelo později — tedy
    /// to, na které se právě jede.
    /// </para>
    /// </summary>
    public async Task<OknoRegaty?> ProLodAsync(int lodId, DateTimeOffset kdy, CancellationToken ct)
    {
        var okna = await db.Okna
            .Where(o => o.OtevrenoV <= kdy && o.TvrdyKonec > kdy)
            .Where(o => db.Ucasti.Any(u =>
                u.ZavodId == o.ZavodId
                && u.Prihlaska!.LodId == lodId
                && NaZavode.Contains(u.Stav)))
            .OrderByDescending(o => o.OtevrenoV)
            .ToListAsync(ct);

        return okna.FirstOrDefault(o => o.Bezi(kdy));
    }

    /// <summary>
    /// Okna, kterými se má telefon řídit: co běží teď a co se dnes otevřelo.
    /// <para>
    /// <b>Stahuje se dopředu a platí i bez signálu</b> — tvrdý konec si
    /// telefon pamatuje a řídí se jím, i když se na síť celý den nedostane.
    /// Změna od pořadatele se projeví, až signál chytí.
    /// </para>
    /// </summary>
    public async Task<List<OknoRegatyDto>> ProTelefonAsync(int lodId, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();
        var od = ted.AddHours(-OknoRegaty.NejvicHodin);

        var okna = await db.Okna
            .Where(o => o.OtevrenoV >= od)
            .Where(o => db.Ucasti.Any(u =>
                u.ZavodId == o.ZavodId
                && u.Prihlaska!.LodId == lodId
                && NaZavode.Contains(u.Stav)))
            .Include(o => o.Zavod!).ThenInclude(z => z.Serie)
            .OrderByDescending(o => o.OtevrenoV)
            .ToListAsync(ct);

        return
        [
            .. okna.Select(o => new OknoRegatyDto(
                o.Id,
                o.ZavodId,
                o.Zavod!.Serie!.Slug,
                o.Zavod.Slug,
                o.Zavod.Nazev,
                o.Den,
                o.OtevrenoV,
                o.TvrdyKonec,
                o.ZavrenoV,
                o.Bezi(ted))),
        ];
    }

    private static OknoDto Dto(OknoRegaty o, DateTimeOffset ted) =>
        new(o.Id, o.Den, o.OtevrenoV, o.TvrdyKonec, o.ZavrenoV, o.Bezi(ted));
}
