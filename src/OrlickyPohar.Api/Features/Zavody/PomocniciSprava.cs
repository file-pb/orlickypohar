using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Jeden pořadatel ročníku a jestli na téhle zastávce pomáhá u startu a cíle.
/// </summary>
/// <param name="Jmeno">Zobrazované jméno; prázdné nebude, účet ho má vždy.</param>
/// <param name="Pomaha">Je zaškrtnutý teď?</param>
/// <param name="JeZdejsi">
/// Je pořadatelem <b>téhle</b> zastávky? Pak mu zaškrtnutí nic nepřidá — start
/// i cíl má otevřený tak jako tak. Obrazovka to musí říct, jinak si rozhodčí
/// bude myslet, že na někom příznak nefunguje.
/// </param>
/// <param name="OdV">Odkdy pomáhá; <c>null</c>, když nepomáhá.</param>
/// <param name="Zaskrtl">
/// Kdo ho zaškrtl — doklad pro spor o start nebo o dojezd. Vydává se jen
/// u toho, kdo pomáhá teď; celá řada zůstává v databázi, ale obrazovka
/// v klubovně se ptá „kdo dneska", ne „kdo kdy".
/// </param>
public record PoradatelRocnikuDto(
    Guid UzivatelId,
    string Jmeno,
    bool Pomaha,
    bool JeZdejsi,
    DateTimeOffset? OdV,
    string? Zaskrtl);

/// <summary>Kdo smí zaškrtávat a koho je z čeho vybírat.</summary>
/// <param name="SmiZaskrtavat">
/// Je ten, kdo se ptá, rozhodčí? Obrazovka podle toho kreslí zaškrtávátka
/// nebo jen výpis — a nesmí se to rozejít s tím, co pustí zápis.
/// </param>
public record PomocniciDto(bool SmiZaskrtavat, IReadOnlyList<PoradatelRocnikuDto> Poradatele);

/// <summary>
/// <b>Kdo z pořadatelů ročníku pomáhá u startu a u cíle téhle zastávky</b>
/// (nález K8, rozhodnuto Filipem 28. 10. 2026).
///
/// <para>
/// <b>Kandidát je pořadatel kterékoliv zastávky ročníku</b>, ne téhle.
/// Přesně o to jde: u cíle Radavské regaty stojí pořadatel Zahájení sezóny,
/// na Radavské nesmí nic, a bez příznaku by musel dostat celou tu regatu.
/// </para>
/// <para>
/// Práva se nehledají porovnáním rolí, ale <b>přes
/// <see cref="Prava.Smi"/></b>: pokrývání rozsahů je pravidlo (právo na celý
/// web platí i na zastávku, právo na ročník na každou jeho zastávku) a má
/// existovat na jednom místě. Kdyby si to tahle správa porovnala sama,
/// rozešel by se seznam v klubovně s tím, co pak zápis pustí — a to je
/// přesně ta chyba, kvůli které <c>Rozsahy.KdeSmiAsync</c> vznikla.
/// </para>
/// </summary>
public class PomocniciSprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>
    /// Pomáhá tenhle člověk na téhle regatě teď? Otázka pro každý zápis
    /// u vody, takže jeden dotaz a žádné načítání řady.
    /// </summary>
    public Task<bool> JeAsync(int zavodId, Guid? uzivatelId, CancellationToken ct) =>
        uzivatelId is { } id
            ? db.Pomocnici.AnyAsync(p => p.ZavodId == zavodId && p.UzivatelId == id && p.DoV == null, ct)
            : Task.FromResult(false);

    /// <summary>
    /// Pořadatelé ročníku a jejich příznak — podklad pro obrazovku
    /// v klubovně.
    /// </summary>
    public async Task<IReadOnlyList<PoradatelRocnikuDto>> PoradateleAsync(
        int serieId, int zavodId, CancellationToken ct)
    {
        // Udělení, která na tenhle ročník vůbec mohou dosáhnout: celý web,
        // celý ročník, nebo kterákoliv jeho zastávka. Zbytek by `Prava.Smi`
        // zahodil, takže ho není proč tahat z databáze.
        var udelena = await db.Opravneni
            .Where(o => o.SerieId == null || o.SerieId == serieId)
            .Select(o => new
            {
                o.UzivatelId,
                o.Role,
                o.SerieId,
                o.ZavodId,
                Jmeno = o.Uzivatel!.Zobrazovane,
            })
            .ToListAsync(ct);

        var zaskrtnuti = await db.Pomocnici
            .Where(p => p.ZavodId == zavodId && p.DoV == null)
            .Select(p => new
            {
                p.UzivatelId,
                p.OdV,
                Zaskrtl = db.Uzivatele.Where(u => u.Id == p.ZaskrtlId)
                    .Select(u => u.Zobrazovane).FirstOrDefault(),
            })
            .ToListAsync(ct);

        var lide = new List<PoradatelRocnikuDto>();

        foreach (var g in udelena.GroupBy(o => o.UzivatelId))
        {
            var jeho = g.Select(o => new UdeleneRole(o.Role, o.SerieId, o.ZavodId)).ToList();
            if (!JePoradatelemVRocniku(jeho, serieId)) continue;

            var ted = zaskrtnuti.FirstOrDefault(z => z.UzivatelId == g.Key);

            lide.Add(new PoradatelRocnikuDto(
                g.Key,
                g.First().Jmeno,
                ted is not null,
                Prava.Smi(jeho, new Pozadavek(Role.Organizator, serieId, zavodId)),
                ted?.OdV,
                ted?.Zaskrtl));
        }

        return [.. lide.OrderBy(p => p.Jmeno, StringComparer.CurrentCulture)];
    }

    /// <summary>
    /// Zaškrtne pomocníka. Vrací text chyby, nebo <c>null</c>.
    /// <para>
    /// <b>Pořadatelství se ověřuje tady, ne na obrazovce.</b> Příznak roli
    /// nepřidává; kdyby se dal zaškrtnout někdo, kdo v ročníku pořadatelem
    /// není, byl by to obchvat udělování práv.
    /// </para>
    /// </summary>
    public async Task<string?> ZaskrtniAsync(
        int serieId, int zavodId, Guid uzivatelId, Guid kdo, CancellationToken ct)
    {
        var poradatele = await PoradateleAsync(serieId, zavodId, ct);
        var on = poradatele.FirstOrDefault(p => p.UzivatelId == uzivatelId);

        if (Pomocnici.ProcNejdeZaskrtnout(on is not null, on?.Pomaha ?? false) is { } nejde)
            return nejde;

        db.Pomocnici.Add(new Pomocnik
        {
            ZavodId = zavodId,
            UzivatelId = uzivatelId,
            OdV = cas.GetUtcNow(),
            ZaskrtlId = kdo,
        });

        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Odškrtne pomocníka — <b>zápisem, ne smazáním</b>. Řada záznamů je
    /// doklad o tom, kdo kdy u startu a u cíle stál.
    /// </summary>
    public async Task<string?> OdskrtniAsync(
        int zavodId, Guid uzivatelId, Guid kdo, CancellationToken ct)
    {
        var ted = await db.Pomocnici
            .Where(p => p.ZavodId == zavodId && p.UzivatelId == uzivatelId && p.DoV == null)
            .ToListAsync(ct);

        if (Pomocnici.ProcNejdeOdskrtnout(ted.Count > 0) is { } nejde) return nejde;

        foreach (var p in ted)
        {
            p.DoV = cas.GetUtcNow();
            p.OdskrtlId = kdo;
        }

        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Je pořadatelem <b>někde</b> v ročníku? Stejný vzorec jako
    /// <c>Rozsahy.KdeSmiAsync</c>: nejdřív celý ročník, pak jednotlivé
    /// zastávky, na které ten člověk má udělení.
    /// </summary>
    private static bool JePoradatelemVRocniku(IReadOnlyList<UdeleneRole> udelena, int serieId) =>
        Prava.Smi(udelena, new Pozadavek(Role.Organizator, serieId))
        || udelena.Any(u => u.Zavod is not null
                            && Prava.Smi(udelena, new Pozadavek(Role.Organizator, serieId, u.Zavod)));
}
