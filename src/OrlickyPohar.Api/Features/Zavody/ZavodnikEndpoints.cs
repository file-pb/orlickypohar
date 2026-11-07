using OrlickyPohar.Api.Features.Klice;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Co vidí posádka na vodě.
///
/// <para>
/// <b>Klíčem, ne přihlášením.</b> Telefon posádky je spárovaný s lodí
/// klíčem — stejně jako u trasování. Přihlášený účet by znamenal, že
/// každý člen posádky musí mít svůj, a to se na molu nestane.
/// </para>
/// </summary>
public static class ZavodnikEndpoints
{
    public static void MapZavodnik(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/lod").WithTags("Závodník");

        g.MapGet("/dnes", DnesAsync)
            .Produces<ZavodnikDto>()
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Která regata je dnes moje, a co se na ní děje")
            .WithDescription(
                "Pro telefon spárovaný klíčem. Jedním dotazem vrací regatu, "
                + "rozjížďku, jak loď eviduje rozhodčí a co komise vyhlásila "
                + "za jízdy — na vodě je signál drahý a čtyři volání znamenají "
                + "čtyři příležitosti skončit s půlkou obrazovky.\n\n"
                + "**204, když dnes loď nikde nejede.** To není chyba, to je "
                + "většina dnů v roce.");
    }

    private static async Task<IResult> DnesAsync(
        HttpContext ctx, KliceSprava klice, ZavodnikSprava sprava, CancellationToken ct)
    {
        if (await klice.ZHlavickyAsync(ctx, ct) is not { } klic) return Results.Unauthorized();

        var dnes = await sprava.DnesAsync(klic, ct);
        return dnes is null ? Results.NoContent() : Results.Ok(dnes);
    }
}
