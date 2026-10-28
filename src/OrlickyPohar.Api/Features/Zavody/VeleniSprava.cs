using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Kdo velí startu téhle regaty, pro obrazovku i pro telefon.
/// </summary>
/// <param name="Jmeno">Zobrazované jméno velitele; <c>null</c>, když nikdo nevelí.</param>
/// <param name="JsemTo">
/// Velí ten, kdo se ptá? <b>Telefon se na tohle musí zeptat při každém
/// připojení</b> — bez toho by se startér, kterému velení mezitím někdo
/// převzal, o ztrátě nedozvěděl a dva hlavní by vznikli přesně tam, kde
/// je rozhodnutí z 28. 10. 2026 chtělo vyloučit.
/// </param>
public record VeleniDto(
    Guid? UzivatelId,
    string? Jmeno,
    DateTimeOffset? OdV,
    bool JsemTo,
    IReadOnlyList<PrevzetiDto> Historie);

/// <summary>Jedno převzetí velení: kdo, kdy a od koho.</summary>
public record PrevzetiDto(string Kdo, DateTimeOffset OdV, DateTimeOffset? DoV, string? Prevzal);

/// <summary>
/// <b>Velitelský čas: kdo drží start.</b>
///
/// <para>
/// Rozhodnuto Filipem 28. 10. 2026 (nález R19, bod 4): <b>slave o velení
/// aktivně požádá, server ho udělí</b>. Nedostane ho automaticky a nikdy
/// si ho nevezme sám — *„oba by to měli akceptovat"*, a žádost je ta
/// akceptace z jedné strany; ta druhá je v tom, že se o velení ví dopředu.
/// </para>
/// <para>
/// <b>Server je autorita, takže dva hlavní v datech nevzniknou.</b> Starý
/// hlavní se o ztrátě dozví při připojení; do té doby stejně nic
/// neodešle. Zbylé dvě cesty, které se zvažovaly, mají v R19 zapsáno,
/// proč neprošly.
/// </para>
/// </summary>
public class VeleniSprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>Kdo velí teď — nebo <c>null</c>, když nikdo.</summary>
    public Task<Velitel?> NajdiAsync(int zavodId, CancellationToken ct) =>
        db.Velitele
            .Where(v => v.ZavodId == zavodId && v.DoV == null)
            .OrderByDescending(v => v.OdV)
            .FirstOrDefaultAsync(ct);

    /// <summary>Id toho, kdo velí teď. Zkratka pro pravidla u startu.</summary>
    public async Task<Guid?> KdoVeliAsync(int zavodId, CancellationToken ct) =>
        (await NajdiAsync(zavodId, ct))?.UzivatelId;

    /// <summary>
    /// Velení a doklad o tom, jak se předávalo.
    /// <para>
    /// Historie se vydává celá a je krátká — na regatu připadá jedno dvě
    /// převzetí. Je to doklad pro spor, ne provozní údaj.
    /// </para>
    /// </summary>
    public async Task<VeleniDto> PohledAsync(int zavodId, Guid? kdoSePta, CancellationToken ct)
    {
        var rada = await db.Velitele
            .Where(v => v.ZavodId == zavodId)
            .OrderByDescending(v => v.OdV)
            .Select(v => new
            {
                v.UzivatelId, v.OdV, v.DoV, v.PrevzalId,
                Jmeno = db.Uzivatele.Where(u => u.Id == v.UzivatelId)
                    .Select(u => u.Zobrazovane).FirstOrDefault(),
                Prevzal = db.Uzivatele.Where(u => u.Id == v.PrevzalId)
                    .Select(u => u.Zobrazovane).FirstOrDefault(),
            })
            .ToListAsync(ct);

        var ted = rada.FirstOrDefault(v => v.DoV is null);

        return new VeleniDto(
            ted?.UzivatelId,
            ted?.Jmeno,
            ted?.OdV,
            ted is not null && kdoSePta is { } ja && ted.UzivatelId == ja,
            [.. rada.Select(v => new PrevzetiDto(v.Jmeno ?? "neznámý", v.OdV, v.DoV, v.Prevzal))]);
    }

    /// <summary>
    /// Převezme velení. Vrací text chyby, nebo <c>null</c>.
    /// <para>
    /// <b>Jde to kdykoliv, i uprostřed odpočtu.</b> Hlavní spadlý do vody
    /// tři minuty před startem je přesně ten případ, kvůli kterému to
    /// vzniklo — zakázat převzetí během procedury by znamenalo zakázat
    /// záchranu tam, kde je potřeba nejvíc.
    /// </para>
    /// <para>
    /// <b>Předchozí velitel se ukončí zápisem, ne smazáním.</b> Po
    /// převzetí musí zůstat doklad, kdo a kdy velení převzal.
    /// </para>
    /// </summary>
    public async Task<string?> PrevezmiAsync(int zavodId, Guid kdo, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();
        var stavajici = await NajdiAsync(zavodId, ct);

        if (Veleni.ProcNejdePrevzit(stavajici?.UzivatelId, kdo) is { } nejde) return nejde;

        if (stavajici is not null)
        {
            stavajici.DoV = ted;
            stavajici.PrevzalId = kdo;
        }

        db.Velitele.Add(new Velitel { ZavodId = zavodId, UzivatelId = kdo, OdV = ted });
        await db.SaveChangesAsync(ct);
        return null;
    }
}
