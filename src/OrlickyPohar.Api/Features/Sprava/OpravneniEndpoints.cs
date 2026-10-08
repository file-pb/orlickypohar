using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Import;

using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Sprava;

/// <summary>
/// Komu a co udělit. <c>Zavod</c> prázdný znamená celý ročník.
/// </summary>
public record UdeleniVstup(string Email, Role Role, string? Zavod = null);

/// <summary>
/// Udělování a odebírání rolí. <b>První obrazovka za přihlášením.</b>
/// <para>
/// Je to kuře a vejce: obrazovka, která uděluje oprávnění, sama roli správce
/// vyžaduje — a na začátku ji nemá nikdo. Řeší to jedna výjimka: udělení
/// prvního správce projde i na importní token, ale <b>jen dokud v té sérii
/// žádný správce není</b>. Bootstrap se tím sám zavře.
/// </para>
/// <para>
/// Proč zrovna importní token a ne nové tajemství: nové by se muselo vyrobit
/// na serveru, a tenhle už existuje a chrání zápis srovnatelné váhy —
/// přepsání celého ročníku. Je to vědomé rozšíření jeho významu, ne
/// nedopatření; proto ta podmínka, která ho po prvním použití vypne.
/// </para>
/// </summary>
public static class OpravneniEndpoints
{
    public static void MapSpravaOpravneni(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/opravneni");

        // Tvar odpovědi se musí říct ručně: handlery vracejí `IResult`,
        // protože se z nich chodí ven šesti různými způsoby, a z toho
        // dokument nic neodvodí. Bez těchhle řádků nemá generovaný klient
        // pro administraci jediný typ.
        g.MapGet("/", PrehledAsync)
            .Produces<PrehledOpravneniDto>()
            .WithSummary("Vypíše oprávnění ročníku i regaty, na které jdou udělit")
            .WithDescription(
                "Vyžaduje roli správce, nebo rozhodčího v tom ročníku. Co smí udělit, " +
                "říká SmiNaRocnik. Ucty — účty, které se kdy přihlásily — dostane " +
                "jen správce; rozhodčímu je null.");

        g.MapPost("/", UdelAsync)
            .Produces<OpravneniRadek>(StatusCodes.Status201Created)
            .Produces<OpravneniRadek>()
            .WithSummary("Udělí roli podle e-mailu")
            .WithDescription(
                "Vyžaduje roli správce v tom ročníku; rozhodčí smí udělit pořadatele " +
                "a editora jedné zastávce. Výjimka: udělení prvního " +
                "správce projde i na hlavičku " + ImportniToken.Hlavicka +
                ", dokud v ročníku žádný správce není. Účet musí existovat — " +
                "vzniká až prvním přihlášením.");

        g.MapDelete("/{id:int}", OdeberAsync)
            .Produces(StatusCodes.Status204NoContent)
            .WithSummary("Odebere jedno oprávnění")
            .WithDescription(
                "Vyžaduje roli správce; rozhodčí smí odebrat, co smí udělit. " +
                "Posledního správce ročníku odebrat nelze.");
    }

    /// <summary>
    /// Role na celém webu (od 22. 9. 2026): editor webu píše obecné články,
    /// správce webu smí všechno ve všech ročnících. Uděluje a odebírá jen
    /// správce webu. Prvního správce webu pustí importní token, dokud žádný
    /// není — stejný bootstrap jako u ročníku.
    /// </summary>
    public static void MapSpravaOpravneniWebu(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/web/opravneni");

        g.MapGet("/", WebPrehledAsync)
            .Produces<PrehledWebuDto>()
            .WithSummary("Vypíše oprávnění na celý web a účty, kterým jde roli dát")
            .WithDescription("Vyžaduje roli správce celého webu.");

        g.MapPost("/", WebUdelAsync)
            .Produces<OpravneniRadek>(StatusCodes.Status201Created)
            .Produces<OpravneniRadek>()
            .WithSummary("Udělí roli na celý web podle e-mailu")
            .WithDescription(
                "Jen editor nebo správce. Vyžaduje roli správce webu; prvního " +
                "správce webu pustí i hlavička " + ImportniToken.Hlavicka + ", dokud žádný není.");

        g.MapDelete("/{id:int}", WebOdeberAsync)
            .Produces(StatusCodes.Status204NoContent)
            .WithSummary("Odebere jedno oprávnění na celý web")
            .WithDescription("Vyžaduje roli správce webu. Posledního správce webu odebrat nelze.");
    }

    private static readonly Pozadavek SpravceWebu = new(Role.Spravce, null);

    private static async Task<IResult> WebPrehledAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, OpravneniSprava sprava, CancellationToken ct)
    {
        if (!await rozsahy.SmiAsync(kdo, SpravceWebu, ct)) return Nesmi(kdo);
        return Results.Ok(new PrehledWebuDto(await sprava.SeznamAsync(null, ct), await sprava.UctyAsync(ct)));
    }

    private static async Task<IResult> WebUdelAsync(
        UdeleniVstup telo,
        ClaimsPrincipal kdo,
        HttpContext ctx,
        Rozsahy rozsahy,
        OpravneniSprava sprava,
        IConfiguration config,
        ILoggerFactory logu,
        CancellationToken ct)
    {
        if (telo.Zavod is not null)
            return Results.BadRequest(new { error = "Právo na celý web se nedá omezit na regatu." });

        if (Udeleni.ProcNejdeNaWebu(telo.Role) is { } duvod)
            return Results.BadRequest(new { error = duvod });

        if (!await rozsahy.SmiAsync(kdo, SpravceWebu, ct))
        {
            var maSpravce = await sprava.MaSpravceAsync(null, ct);

            if (!Udeleni.BootstrapProjde(maSpravce, telo.Role, false)
                || ImportniToken.Over(ctx, config) != StavTokenu.Sedi)
                return Nesmi(kdo);

            logu.CreateLogger("Sprava").LogWarning(
                "Bootstrap: první správce celého webu se uděluje na importní token.");
        }

        var (stav, radek) = await sprava.UdelAsync(null, null, telo.Email, telo.Role, ct);

        return stav switch
        {
            StavUdeleni.UcetNeni => Results.NotFound(new
            {
                error = $"Na e-mail {telo.Email} se zatím nikdo nepřihlásil. "
                        + "Účet vzniká až prvním přihlášením, rolí se pozvat nedá.",
            }),
            StavUdeleni.VicUctu => Results.Conflict(new
            {
                error = $"E-mail {telo.Email} patří víc účtům. Roli je potřeba udělit ručně.",
            }),
            StavUdeleni.JizMel => Results.Ok(radek),
            _ => Results.Created($"/sprava/web/opravneni/{radek!.Id}", radek),
        };
    }

    private static async Task<IResult> WebOdeberAsync(
        int id, ClaimsPrincipal kdo, Rozsahy rozsahy, OpravneniSprava sprava, CancellationToken ct)
    {
        if (!await rozsahy.SmiAsync(kdo, SpravceWebu, ct)) return Nesmi(kdo);

        return await sprava.OdeberAsync(null, id, ct) switch
        {
            StavOdebrani.Neni => Results.NotFound(),
            StavOdebrani.PosledniSpravce => Results.Conflict(new
            {
                error = "Poslední správce webu se odebrat nedá. Nejdřív udělte roli někomu jinému.",
            }),
            _ => Results.NoContent(),
        };
    }

    private static async Task<IResult> PrehledAsync(
        string serie, ClaimsPrincipal kdo, Rozsahy rozsahy, OpravneniSprava sprava, CancellationToken ct)
    {
        var rozsah = await rozsahy.NajdiAsync(serie, null, ct);
        if (rozsah is null) return Neni(kdo);

        // Rozhodčího pokrývá i správce, takže tahle jedna otázka pustí oba.
        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct))
            return Nesmi(kdo);

        var spravce = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct);

        if (await sprava.PrehledAsync(rozsah.SerieId, ct) is not { } prehled) return Neni(kdo);

        // Seznam účtů nese e-maily lidí z celé aplikace, ne jen z tohoto
        // ročníku. Rozhodčí přiřazuje pořadatele zastávkám a obejde se bez
        // něj — na neexistující účet ho upozorní udělení.
        return Results.Ok(prehled with
        {
            SmiNaRocnik = spravce,
            Ucty = spravce ? await sprava.UctyAsync(ct) : null,
        });
    }

    private static async Task<IResult> UdelAsync(
        string serie,
        UdeleniVstup telo,
        ClaimsPrincipal kdo,
        HttpContext ctx,
        Rozsahy rozsahy,
        OpravneniSprava sprava,
        IConfiguration config,
        ILoggerFactory logu,
        CancellationToken ct)
    {
        // Rozsah se překládá dřív než cokoliv jiného — je v něm i kontrola,
        // že závod patří té sérii, na kterou se ptáme.
        var rozsah = await rozsahy.NajdiAsync(serie, telo.Zavod, ct);
        if (rozsah is null)
            // Kdo drží importní token, tomu se překlep ve slugu říct může —
            // je to jediná cesta, kterou se bootstrap dělá, a hledat příčinu
            // v 401 by znamenalo podezřívat token místo adresy.
            return ImportniToken.Over(ctx, config) == StavTokenu.Sedi
                ? Results.NotFound()
                : Neni(kdo);

        var naZavod = rozsah.ZavodId is not null;

        if (Udeleni.ProcNejde(telo.Role, naZavod) is { } duvod)
            return Results.BadRequest(new { error = duvod });

        var log = logu.CreateLogger("Sprava");

        var spravce = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct);

        // Rozhodčí přiřazuje pořadatele a editora jedné zastávce. Pravidlo je
        // v `Udeleni`, sem patří jen otázka, jestli rozhodčím je.
        var rozhodci = !spravce
                       && Udeleni.RozhodciSmiUdelit(telo.Role, naZavod)
                       && await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);

        if (!spravce && !rozhodci)
        {
            var maSpravce = await sprava.MaSpravceAsync(rozsah.SerieId, ct);

            if (!Udeleni.BootstrapProjde(maSpravce, telo.Role, naZavod)
                || ImportniToken.Over(ctx, config) != StavTokenu.Sedi)
                return Nesmi(kdo);

            // Tohle je jediná cesta, jak se dovnitř dostat bez role, takže
            // musí být vidět v logu i zpětně. Použije se v životě série
            // jednou.
            log.LogWarning(
                "Bootstrap: první správce série {Serie} se uděluje na importní token.", serie);
        }

        var (stav, radek) = await sprava.UdelAsync(
            rozsah.SerieId, rozsah.ZavodId, telo.Email, telo.Role, ct);

        return stav switch
        {
            // Účet vzniká až prvním přihlášením. Není to chyba správce ani
            // překlep, takže odpověď musí říct, co s tím — jinak to vypadá
            // jako rozbitá administrace.
            StavUdeleni.UcetNeni => Results.NotFound(new
            {
                error = $"Na e-mail {telo.Email} se zatím nikdo nepřihlásil. "
                        + "Účet vzniká až prvním přihlášením, rolí se pozvat nedá.",
            }),

            StavUdeleni.VicUctu => Results.Conflict(new
            {
                error = $"E-mail {telo.Email} patří víc účtům. Roli je potřeba udělit ručně.",
            }),

            // Druhé kliknutí na totéž vrací týž řádek a stav 200: nic se
            // nezměnilo, ale výsledek je přesně ten, o který správce žádal.
            StavUdeleni.JizMel => Results.Ok(radek),

            _ => Results.Created($"/sprava/serie/{serie}/opravneni/{radek!.Id}", radek),
        };
    }

    private static async Task<IResult> OdeberAsync(
        string serie, int id, ClaimsPrincipal kdo,
        Rozsahy rozsahy, OpravneniSprava sprava, CancellationToken ct)
    {
        var rozsah = await rozsahy.NajdiAsync(serie, null, ct);
        if (rozsah is null) return Neni(kdo);

        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct))
            return Nesmi(kdo);

        // Rozhodčí smí odebrat jen to, co smí i udělit — jinak by jedním
        // kliknutím sundal správce nebo sám sebe z celého ročníku.
        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct))
        {
            if (await sprava.NajdiAsync(rozsah.SerieId, id, ct) is not { } co) return Results.NotFound();
            if (!Udeleni.RozhodciSmiUdelit(co.Role, co.NaZavod)) return Nesmi(kdo);
        }

        return await sprava.OdeberAsync(rozsah.SerieId, id, ct) switch
        {
            StavOdebrani.Neni => Results.NotFound(),
            StavOdebrani.PosledniSpravce => Results.Conflict(new
            {
                error = "Poslední správce ročníku se odebrat nedá. "
                        + "Nejdřív udělte roli někomu jinému.",
            }),
            _ => Results.NoContent(),
        };
    }

    /// <summary>
    /// Neexistující ročník nebo zastávka. Nepřihlášenému se vrací <b>401,
    /// ne 404</b>: veřejné čtení schová nepublikovaný ročník za 404, ale
    /// tady by rozdíl mezi 404 a 401 prozradil, které nezveřejněné slugy
    /// existují — a to je táž informace obráceně.
    /// </summary>
    private static IResult Neni(ClaimsPrincipal kdo) =>
        kdo.Identity?.IsAuthenticated == true ? Results.NotFound() : Results.Unauthorized();

    /// <summary>
    /// Nepřihlášenému 401, přihlášenému bez role 403. Je to rozdíl, který
    /// klient potřebuje: na první se dá odpovědět přihlášením, na druhé ne.
    /// </summary>
    private static IResult Nesmi(ClaimsPrincipal kdo) =>
        kdo.Identity?.IsAuthenticated == true ? Results.Forbid() : Results.Unauthorized();
}
