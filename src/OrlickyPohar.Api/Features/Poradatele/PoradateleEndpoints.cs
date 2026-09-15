using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Poradatele;

/// <summary>
/// Správa medailonku pořadatele.
/// <para>
/// <b>Adresa jde přes ročník</b>, přestože záznam je společný všem ročníkům.
/// Práva jsou rozsahová a rozsah je ročník nebo zastávka; pořadatel, který
/// v ročníku nepořádá nic, v něm neexistuje a vrací se 404.
/// </para>
/// </summary>
public static class PoradateleEndpoints
{
    public static void MapSpravaPoradatelu(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/sprava/serie/{serie}/poradatele").WithTags("Správa");

        g.MapGet("/{poradatel}", DetailAsync)
            .Produces<PoradatelSpravaDto>()
            .WithSummary("Medailonek pořadatele i s tím, jestli ho přihlášený smí upravit")
            .WithDescription(
                "Rozhodčí ročníku, nebo organizátor aspoň jedné zastávky v ročníku. " +
                "Pořadatel musí v ročníku pořádat aspoň jednu zastávku.");

        g.MapPut("/{poradatel}", UlozAsync)
            .Produces<PoradatelSpravaDto>()
            .WithSummary("Uloží medailonek pořadatele")
            .WithDescription(
                "Rozhodčí ročníku, nebo organizátor zastávky, kterou pořadatel pořádá. " +
                "Záznam je společný všem ročníkům; přejmenování přepíše jméno na všech jeho zastávkách.");
    }

    private static async Task<IResult> DetailAsync(
        string serie, string poradatel, ClaimsPrincipal kdo, AppDbContext db,
        Rozsahy rozsahy, PoradateleSprava sprava, CancellationToken ct)
    {
        if (await NajdiAsync(serie, poradatel, rozsahy, sprava, ct) is not { } nalez)
            return Results.NotFound();

        var (vidi, smi) = await PravaAsync(kdo, rozsahy, nalez, ct);
        if (!vidi) return Results.Forbid();

        return Results.Ok(await DtoAsync(db, sprava, nalez, smi, ct));
    }

    private static async Task<IResult> UlozAsync(
        string serie, string poradatel, PoradatelVstup vstup, ClaimsPrincipal kdo, AppDbContext db,
        Rozsahy rozsahy, PoradateleSprava sprava, CancellationToken ct)
    {
        if (await NajdiAsync(serie, poradatel, rozsahy, sprava, ct) is not { } nalez)
            return Results.NotFound();

        var (_, smi) = await PravaAsync(kdo, rozsahy, nalez, ct);
        if (!smi) return Results.Forbid();

        if (await sprava.UlozAsync(nalez.Poradatel, vstup, ct) is { } chyba)
            return Results.BadRequest(new { error = chyba });

        return Results.Ok(await DtoAsync(db, sprava, nalez, smi, ct));
    }

    private sealed record Nalez(
        int SerieId, Poradatel Poradatel, List<(int Id, ZastavkaPoradateleDto Zastavka)> Zastavky);

    private static async Task<Nalez?> NajdiAsync(
        string serie, string poradatel, Rozsahy rozsahy, PoradateleSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return null;
        if (await sprava.NajdiAsync(poradatel, ct) is not { } p) return null;

        var zastavky = await sprava.ZastavkyAsync(p.Id, rozsah.SerieId, ct);
        return zastavky.Count == 0 ? null : new Nalez(rozsah.SerieId, p, zastavky);
    }

    /// <summary>
    /// Kdo medailonek vidí a kdo ho smí změnit. Vidí každý, kdo má
    /// k ročníku kalendář — pořadatel sousední zastávky se může podívat,
    /// jak to má vyplněné jiný klub, jen mu to nepřepíše.
    /// </summary>
    private static async Task<(bool Vidi, bool Smi)> PravaAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Nalez nalez, CancellationToken ct)
    {
        var rozhodci = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, nalez.SerieId), ct);
        var (celyRocnik, zavody) = await rozsahy.KdeSmiAsync(kdo, Role.Organizator, nalez.SerieId, ct);

        var smi = Medailonek.SmiUpravit(
            rozhodci, celyRocnik, zavody, [.. nalez.Zastavky.Select(z => z.Id)]);

        return (rozhodci || celyRocnik || zavody.Count > 0, smi);
    }

    private static async Task<PoradatelSpravaDto> DtoAsync(
        AppDbContext db, PoradateleSprava sprava, Nalez nalez, bool smi, CancellationToken ct)
    {
        var serie = await db.Serie.Where(s => s.Id == nalez.SerieId)
            .Select(s => new { s.Slug, s.Nazev }).FirstAsync(ct);

        return new PoradatelSpravaDto(
            serie.Slug, serie.Nazev, PoradateleSprava.Dto(nalez.Poradatel), smi,
            [.. nalez.Zastavky.Select(z => z.Zastavka)],
            await sprava.ZastavekJindeAsync(nalez.Poradatel.Id, nalez.SerieId, ct));
    }
}
