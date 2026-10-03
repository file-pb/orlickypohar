using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Identita;

/// <summary>Jedno udělené oprávnění tak, jak ho vidí klient.</summary>
public record OpravneniDto(Role Role, string Serie, string? Zavod);

/// <summary>
/// Kdo jsem a co smím. Rozsahy se vydávají jako slugy, ne jako čísla —
/// klient stejně pracuje s adresami a interní identifikátory by si musel
/// párovat sám.
/// <para>
/// <c>Web</c> jsou role na celém webu (od 22. 9. 2026). Jdou zvlášť, ne jako
/// řádek v <c>Opravneni</c> s prázdnou sérií: to pole je v appce povinné
/// a změna API smí být jen aditivní.
/// </para>
/// </summary>
public record JaDto(
    Guid Id,
    string Zobrazovane,
    string? Email,
    IReadOnlyList<OpravneniDto> Opravneni,
    IReadOnlyList<Role>? Web = null);

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
                "žádná oprávnění — pozvat člověka znamená dát mu roli. " +
                "Zároveň účet spáruje s loděmi, kde jeho e-mail sedí s kontaktem.");

        app.MapGet("/ja/lode", MojeLodeAsync)
            .RequireAuthorization()
            .Produces<List<MojeLodDto>>()
            .WithTags("Identita")
            .WithSummary("Vrátí lodě, ke kterým přihlášený patří, i s rolí")
            .WithDescription(
                "Majitel, kapitán, posádka, fanoušek. Vazba vzniká shodou e-mailu " +
                "s kontaktem na přihlášce, kódem od pořadatele, nebo nárokem, " +
                "který potvrdí kapitán.");
    }

    private static async Task<Results<Ok<List<MojeLodDto>>, UnauthorizedHttpResult>> MojeLodeAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Parovani parovani, CancellationToken ct)
    {
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel)
            return TypedResults.Unauthorized();

        return TypedResults.Ok(await parovani.MojeLodeAsync(uzivatel, ct));
    }

    private static async Task<Results<Ok<JaDto>, UnauthorizedHttpResult>> JaAsync(
        ClaimsPrincipal kdo,
        HttpContext ctx,
        Uzivatele uzivatele,
        Profily profily,
        Parovani parovani,
        TimeProvider cas,
        ILogger<JaDto> log,
        CancellationToken ct)
    {
        // Sem se dostane jen ověřený token, ale bez dvojice (vydavatel,
        // subjekt) není co uložit. Chybějící `sub` je vadný token, ne
        // uživatel bez práv — proto 401, ne prázdná odpověď.
        if (kdo.Ucet() is not { } ucet) return TypedResults.Unauthorized();

        // Přístupový token profil nenese — jméno a e-mail se berou od
        // poskytovatele z endpointu `userinfo`. Nároky v tokenu se zkusí
        // první jen proto, že u jiného poskytovatele tam být můžou.
        var jmeno = kdo.FindFirst("name")?.Value ?? kdo.FindFirst("preferred_username")?.Value;
        var email = kdo.FindFirst("email")?.Value;

        if (jmeno is null || email is null)
        {
            var token = ctx.Request.Headers.Authorization
                .ToString()
                .Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase);
            var profil = await profily.NactiAsync(token, ct);
            jmeno ??= profil?.Jmeno;
            email ??= profil?.Email;
        }

        var uzivatel = await uzivatele.NajdiNeboZalozAsync(
            // Poslední záchrana je subjekt. Ošklivé, ale pravdivé — lepší
            // než prázdné jméno v seznamu správců.
            ucet.Issuer, ucet.Subject, jmeno ?? ucet.Subject, email, cas, ct);

        // Spárování s loděmi podle e-mailu. Tiché a při každém přihlášení:
        // kontakt na přihlášce může přibýt kdykoliv a člověk nemá mít důvod
        // někam klikat (plán, *Jak se z přihlášení stane kormidelník*).
        // Selhání párování nesmí shodit přihlášení — od toho je tenhle
        // endpoint, ne od vazeb k lodím.
        try
        {
            await parovani.PodleEmailuAsync(uzivatel.Id, uzivatel.Email, ct);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            log.LogWarning(e, "Párování účtu {Uzivatel} s loděmi se nepovedlo", uzivatel.Id);
        }

        var rozsahy = await uzivatele.RozsahyAsync(uzivatel.Id, ct);

        return TypedResults.Ok(new JaDto(
            uzivatel.Id,
            uzivatel.Zobrazovane,
            uzivatel.Email,
            [.. rozsahy.Select(r => new OpravneniDto(r.Role, r.Serie, r.Zavod))],
            await uzivatele.WebRoleAsync(uzivatel.Id, ct)));
    }
}
