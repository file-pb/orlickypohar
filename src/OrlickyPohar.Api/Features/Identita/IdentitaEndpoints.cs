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
    IReadOnlyList<Role>? Web = null,
    /// <summary>
    /// Zastávky, kde je přihlášený dneska zaškrtnutý jako pomocník
    /// (17. 11. 2026). <b>Není to role</b> — příznak přenáší na jednu
    /// zastávku to, co někdo v ročníku už má, a klient podle něj kreslí
    /// nabídku. Co z toho plyne, počítá server u každé cesty znovu.
    /// <para>
    /// Aditivní pole s výchozí hodnotou: starší vydání appky, které ho
    /// nezná, se nerozbije.
    /// </para>
    /// </summary>
    IReadOnlyList<KdePomahaDto>? KdePomaha = null);

/// <summary>
/// Zastávka dvojicí slugů, tak jak ji zná adresa.
///
/// <para>
/// <b>Jméno musí být unikátní v celém API.</b> Napoprvé se tenhle typ
/// jmenoval <c>ZastavkaDto</c> — a takový už existuje jinde
/// (slug, název, datum, pořadí). Dokument OpenAPI drží schémata
/// v jediném jmenném prostoru, takže se <c>$ref</c> svezl na ten cizí
/// a vygenerovaný klient dostal tvar, který tahle cesta nikdy nevrátí.
/// Všimla si toho až kontrola typů v appce; kdyby se tvary náhodou
/// shodovaly, projde to tiše.
/// </para>
/// </summary>
public record KdePomahaDto(string Serie, string Zavod);

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

        // Zápis, ne `DELETE /ja`: potvrzení se posílá v těle a tělo u metody
        // DELETE je sice dovolené, ale proxy i klienti se k němu chovají
        // různě. Nová cesta je navíc aditivní změna API — starší vydání
        // appky o ní neví a nerozbije se.
        app.MapPost("/ja/smazani", SmazaniAsync)
            .RequireAuthorization()
            .Produces<SmazaniUctuDto>()
            .WithTags("Identita")
            .WithSummary("Smaže účet přihlášeného a zruší mu přihlášení u poskytovatele")
            .WithDescription(
                "Nevratné. V těle musí přijít přesně opsané potvrzovací slovo. " +
                "Zmizí přihlášení, oprávnění, vazby k lodím, nároky, pomocnictví, " +
                "velení a osobní kontakty; závodní záznamy zůstávají a ukazují na " +
                "bezejmenný účet. Odpověď je účtenka: čeho kolik ubylo a jestli se " +
                "povedlo zrušit i přihlášení u poskytovatele identity.");
    }

    // Návratový typ je `IResult`, ne `Results<…>`: chyba se vydává ve tvaru
    // `{ "error": "…" }` jako všude jinde v tomhle API (viz `KodyEndpoints`)
    // a anonymní objekt se do typovaného výsledku zapsat nedá. Tvar úspěchu
    // hlásí `.Produces<SmazaniUctuDto>()` u registrace.
    private static async Task<IResult>
        SmazaniAsync(
            ClaimsPrincipal kdo,
            HttpContext ctx,
            SmazaniUctuVstup vstup,
            Rozsahy rozsahy,
            SmazaniUctu smazani,
            Ucty ucty,
            IConfiguration config,
            CancellationToken ct)
    {
        if (kdo.Ucet() is not { } ucet) return Results.Unauthorized();

        // Potvrzení ověřuje server, ne formulář. Žádost bez opsaného slova
        // nesmí projít ani z curlu — jinak je to potvrzení jen ozdoba.
        if (Potvrzeni.ProcNejde(vstup.Potvrzeni) is { } proc)
            return Results.BadRequest(new { error = proc });

        // Kdo se nikdy nepřihlásil, nemá u nás co mazat. Není to ale chyba:
        // přihlášení u poskytovatele existuje a zrušit se má tak jako tak.
        var uzivatelId = await rozsahy.UzivatelIdAsync(kdo, ct);

        var uctenka = uzivatelId is { } id
            ? await smazani.SmazAsync(id, ct) ?? Prazdna
            : Prazdna;

        // Zrušit účet se smí jen u toho poskytovatele, který token vydal.
        // Bez téhle kontroly by stačila stará vazba na jiného vydavatele
        // a jeho subjekt by se poslal na adresu dnešního poskytovatele —
        // tedy cizí identifikátor na cizí API.
        var autorita = (config["Identita:Authority"] ?? "").TrimEnd('/');
        var vydavatel = ucet.Issuer.TrimEnd('/');

        if (!string.Equals(autorita, vydavatel, StringComparison.OrdinalIgnoreCase))
            return Results.Ok(uctenka with
            {
                PoskytovatelDuvod = "Přihlášení je od jiného poskytovatele, než který je nastavený.",
            });

        // Token se bere z hlavičky, protože poskytovateli se posílá tentýž,
        // se kterým člověk klepl na tlačítko — maže sám sebe.
        var token = ctx.Request.Headers.Authorization
            .ToString()
            .Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase);

        var duvod = await ucty.ZrusAsync(token, ucet.Subject, ct);

        return Results.Ok(uctenka with
        {
            PoskytovatelZrusen = duvod is null,
            PoskytovatelDuvod = duvod,
        });
    }

    /// <summary>Účtenka pro případ, kdy u nás nebylo co mazat.</summary>
    private static readonly SmazaniUctuDto Prazdna = new(0, 0, 0, 0, 0, 0, 0, 0, 0, 0);

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
        Zavody.PomocniciSprava pomocnici,
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
            await uzivatele.WebRoleAsync(uzivatel.Id, ct),
            [.. (await pomocnici.KdePomahaSlugyAsync(uzivatel.Id, ct))
                .Select(z => new KdePomahaDto(z.Serie, z.Zavod))]));
    }
}
