using System.Security.Claims;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Import;

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
        var g = app.MapGroup("/sprava/serie/{serie}/opravneni").WithTags("Správa");

        // Tvar odpovědi se musí říct ručně: handlery vracejí `IResult`,
        // protože se z nich chodí ven šesti různými způsoby, a z toho
        // dokument nic neodvodí. Bez těchhle řádků nemá generovaný klient
        // pro administraci jediný typ.
        g.MapGet("/", PrehledAsync)
            .Produces<PrehledOpravneniDto>()
            .WithSummary("Vypíše oprávnění ročníku i zastávky, na které jdou udělit")
            .WithDescription("Vyžaduje roli správce v tom ročníku.");

        g.MapPost("/", UdelAsync)
            .Produces<OpravneniRadek>(StatusCodes.Status201Created)
            .Produces<OpravneniRadek>()
            .WithSummary("Udělí roli podle e-mailu")
            .WithDescription(
                "Vyžaduje roli správce v tom ročníku. Výjimka: udělení prvního " +
                "správce projde i na hlavičku " + ImportniToken.Hlavicka +
                ", dokud v ročníku žádný správce není. Účet musí existovat — " +
                "vzniká až prvním přihlášením.");

        g.MapDelete("/{id:int}", OdeberAsync)
            .Produces(StatusCodes.Status204NoContent)
            .WithSummary("Odebere jedno oprávnění")
            .WithDescription("Vyžaduje roli správce. Posledního správce ročníku odebrat nelze.");
    }

    private static async Task<IResult> PrehledAsync(
        string serie, ClaimsPrincipal kdo, Rozsahy rozsahy, OpravneniSprava sprava, CancellationToken ct)
    {
        var rozsah = await rozsahy.NajdiAsync(serie, null, ct);
        if (rozsah is null) return Neni(kdo);

        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct))
            return Nesmi(kdo);

        return Results.Ok(await sprava.PrehledAsync(rozsah.SerieId, ct));
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

        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct))
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

        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct))
            return Nesmi(kdo);

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
