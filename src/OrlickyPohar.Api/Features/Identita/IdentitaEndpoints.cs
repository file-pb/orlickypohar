using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;

namespace OrlickyPohar.Api.Features.Identita;

/// <summary>Jedno udělené oprávnění tak, jak ho vidí klient.</summary>
public record OpravneniDto(Role Role, string Serie, string? Zavod);

/// <summary>
/// Kdo jsem a co smím. Rozsahy se vydávají jako slugy, ne jako čísla —
/// klient stejně pracuje s adresami a interní identifikátory by si musel
/// párovat sám.
/// </summary>
public record JaDto(
    Guid Id,
    string Zobrazovane,
    string? Email,
    IReadOnlyList<OpravneniDto> Opravneni);

/// <summary>
/// Přihlášený uživatel sám o sobě.
/// <para>
/// Je to <b>první endpoint, který něco vyžaduje</b>, a zároveň jediný způsob,
/// jak si celý řetěz — token, ověření, překlad na interní účet — vyzkoušet
/// dřív, než na něm bude viset administrace. Klient ho potřebuje tak jako
/// tak: bez něj neví, jestli má vůbec ukázat tlačítko „upravit".
/// </para>
/// </summary>
public static class IdentitaEndpoints
{
    public static void MapJa(this IEndpointRouteBuilder app)
    {
        app.MapGet("/ja", JaAsync)
            .RequireAuthorization()
            .WithTags("Identita")
            .WithSummary("Vrátí přihlášeného uživatele a jeho oprávnění")
            .WithDescription(
                "Při prvním přihlášení uživatele založí. Nově založený nemá " +
                "žádná oprávnění — pozvat člověka znamená dát mu roli.");
    }

    private static async Task<Results<Ok<JaDto>, UnauthorizedHttpResult>> JaAsync(
        ClaimsPrincipal kdo,
        Uzivatele uzivatele,
        TimeProvider cas,
        CancellationToken ct)
    {
        // Sem se dostane jen ověřený token, ale bez dvojice (vydavatel,
        // subjekt) není co uložit. Chybějící `sub` je vadný token, ne
        // uživatel bez práv — proto 401, ne prázdná odpověď.
        if (kdo.Ucet() is not { } ucet) return TypedResults.Unauthorized();

        var jmeno = kdo.FindFirst("name")?.Value
            ?? kdo.FindFirst("preferred_username")?.Value
            // Poslední záchrana je subjekt. Ošklivé, ale pravdivé — lepší
            // než prázdné jméno v seznamu správců.
            ?? ucet.Subject;

        var uzivatel = await uzivatele.NajdiNeboZalozAsync(
            ucet.Issuer, ucet.Subject, jmeno, kdo.FindFirst("email")?.Value, cas, ct);

        var rozsahy = await uzivatele.RozsahyAsync(uzivatel.Id, ct);

        return TypedResults.Ok(new JaDto(
            uzivatel.Id,
            uzivatel.Zobrazovane,
            uzivatel.Email,
            [.. rozsahy.Select(r => new OpravneniDto(r.Role, r.Serie, r.Zavod))]));
    }
}
