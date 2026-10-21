namespace OrlickyPohar.Api.Features.Upozorneni;

/// <summary>Co appka posílá při registraci k odběru.</summary>
public record ZarizeniVstup(
    string? Token,
    PlatformaZarizeni Platforma = PlatformaZarizeni.Android,
    IReadOnlyList<string>? Odbery = null);

public static class UpozorneniEndpoints
{
    public static void MapUpozorneni(this IEndpointRouteBuilder app)
    {
        // <b>Bez přihlášení, schválně</b> (plán, *Dvě úrovně upozornění*):
        // veřejná upozornění — výsledky, článek, termín — nesmějí vyžadovat
        // účet. Divák ani fanoušek nemá kvůli termínu závodu nic zakládat.
        // Účastnická upozornění přijdou zvlášť a ta účet potřebují, protože
        // se musí vědět, které zařízení patří které lodi.
        app.MapPut("/zarizeni", ZapisAsync)
            .Produces(StatusCodes.Status204NoContent)
            .WithTags("Upozornění")
            .WithSummary("Zapíše zařízení k odběru upozornění")
            .WithDescription(
                "Bez přihlášení. Appka volá při každém spuštění, protože Expo token po "
                + "přeinstalaci mění; druhý zápis téhož tokenu jen přepíše odběry. Odběr má "
                + "tvar `serie:{slug}` nebo `zavod:{slug}`.");
    }

    private static async Task<IResult> ZapisAsync(
        ZarizeniVstup vstup, UpozorneniSprava sprava, CancellationToken ct)
    {
        var chyba = await sprava.ZapisZarizeniAsync(
            vstup.Token, vstup.Platforma, vstup.Odbery ?? [], ct);

        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }
}
