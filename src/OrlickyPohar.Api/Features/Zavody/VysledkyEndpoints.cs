using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using OrlickyPohar.Api.Features.Fotky;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Zavody;

public record PublikaceVysledkuVstup(bool Publikovano);

/// <summary>Start rozjížďky. Bez času platí okamžik požadavku.</summary>
public record StartVstup(DateTimeOffset? StartV = null);

/// <summary>Nová rozjížďka. Bez těla jde do poháru, jako dřív.</summary>
public record NovaRozjizdkaVstup(bool DoSerie = true);

/// <summary>Zařazení rozjížďky do poháru.</summary>
public record DoSerieVstup(bool DoSerie);

/// <summary>
/// Fotka papírového zápisu. Autor ani souhlas se neposílají — doklad
/// z cíle se nikde nezveřejňuje a nahrál ho ten, kdo je přihlášený.
/// </summary>
public record PapirFormular(IFormFile? Soubor);

/// <summary>Poznávací znak lodi na regatě. Prázdný znak smaže.</summary>
public record ZnakVstup(string? Znak);

/// <summary>
/// Workflow výsledků: navrženo → ověřeno → schváleno → potvrzeno, k tomu
/// vrácení k revizi, eliminace a publikace. A zápis samotných čísel.
/// <para>
/// <b>Stav se vede na rozjížďce, ne na jednotlivém výsledku.</b> Rozhodčí
/// schvaluje sadu výsledků jako celek; stav na řádku by znamenal, že
/// rozjížďka může být zpola schválená.
/// </para>
/// <para>
/// Pravidla přechodů leží ve <see cref="Workflow"/>, pravidla zápisu
/// v <see cref="Zapis"/> — jedna funkce s testy, ne rozeseté podmínky po
/// endpointech.
/// </para>
/// </summary>
public static class VysledkyEndpoints
{
    public static void MapSpravaVysledku(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/vysledky");

        g.MapGet("/", ZastavkyAsync)
            .Produces<List<ZastavkaVysledkyDto>>()
            .WithSummary("Vypíše regaty ročníku i s tím, kolik výsledků je venku")
            .WithDescription(
                "Rozcestník. Vyžaduje roli rozhodčího v ročníku, nebo organizátora " +
                "aspoň na jedné zastávce.");

        g.MapGet("/{zavod}", PrehledAsync)
            .Produces<PrehledVysledkuDto>()
            .WithSummary("Vypíše rozjížďky regaty i s tím, co s nimi přihlášený smí");

        g.MapPost("/{zavod}/rozjizdky", PridejRozjizdkuAsync)
            .Produces<RozjizdkaSpravaRadek>(StatusCodes.Status201Created)
            .WithSummary("Přidá zastávce další rozjížďku")
            .WithDescription(
                "Pořadatel regaty, od vypsání závodu. Nová rozjížďka je návrh " +
                "a na webu není.");

        g.MapPost("/{zavod}/rozjizdky/{cislo:int}/start", StartAsync)
            .Produces<ZapisRozjizdkyDto>()
            .WithSummary("Zapíše start rozjížďky")
            .WithDescription(
                "Cílová obrazovka. Bez času v těle se vezme okamžik požadavku. Jde přepsat, " +
                "dokud je zápis otevřený; časy dojetých lodí se přepočítají.");

        // Token jde v hlavičce, ne v cookie — proti podvrženému formuláři
        // tu není co chránit (stejně jako u obrázku článku).
        g.MapPut("/{zavod}/rozjizdky/{cislo:int}/papir", PapirAsync)
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(Nahravani.NejvicBajtu + 1024 * 1024))
            .Produces<ObrazekDto>()
            .WithSummary("Nahraje fotku papírového zápisu rozjížďky")
            .WithDescription(
                "Pořadatel regaty, i u podepsaných čísel — je to doklad k zápisu, ne zásah do něj. " +
                "JPEG, PNG nebo WebP do 15 MB. Veřejně se nevydává. Bez nastaveného úložiště vrací 503.");

        g.MapDelete("/{zavod}/rozjizdky/{cislo:int}/papir", OdeberPapirAsync)
            .WithSummary("Odebere fotku papírového zápisu a smaže její soubory");

        g.MapPut("/{zavod}/lode/{prihlaska:int}/znak", ZnakAsync)
            .WithSummary("Nastaví poznávací znak lodi na regatě")
            .WithDescription(
                "Cílová obrazovka. Pořadatel regaty, od vypsání. Jen loď, která na regatě je " +
                "(přihlášená, potvrzená nebo vyloučená). Prázdný znak ho smaže.");

        g.MapGet("/{zavod}/rozjizdky/{cislo:int}/navrhy", NavrhyAsync)
            .Produces<NavrhyDto>()
            .WithSummary("Vypíše snímky zápisu od jednotlivých zapisovatelů")
            .WithDescription(
                "Pořadatel regaty. Na vodě zapisují dva a každý na svém telefonu; tohle jsou " +
                "jejich verze k porovnání. S jedním zapisovatelem je snímek jeden.");

        g.MapPost("/{zavod}/rozjizdky/{cislo:int}/navrhy/{autor:guid}/pouzit", PouzijNavrhAsync)
            .Produces<ZapisRozjizdkyDto>()
            .WithSummary("Přepíše výsledky rozjížďky snímkem jednoho zapisovatele")
            .WithDescription("Pořadatel regaty, dokud je zápis otevřený. Ostatní snímky zůstávají.");

        g.MapGet("/{zavod}/rozjizdky/{cislo:int}", ZapisAsync)
            .Produces<ZapisRozjizdkyDto>()
            .WithSummary("Vypíše zápis rozjížďky: všechny lodě ročníku a jejich výsledky")
            .WithDescription(
                "Vidí ho každý, kdo smí na výsledky ročníku. Měnit ho smí jen " +
                "pořadatel regaty, a jen v návrhu nebo po vrácení k revizi.");

        g.MapPut("/{zavod}/rozjizdky/{cislo:int}/vysledky", UlozAsync)
            .Produces<ZapisRozjizdkyDto>()
            .WithSummary("Uloží celou sadu výsledků rozjížďky")
            .WithDescription(
                "Loď, která v sadě nemá pořadí ani kód, výsledek nemá. Pořadí, " +
                "nebo kód, ne obojí; stejné pořadí v jedné kategorii neprojde. " +
                "Čas se nemění. Povinné `revize` je podoba sady, ze které klient " +
                "vycházel — při nesouladu vrací 409 a svou sadu si klient nechává.");

        g.MapPost("/{zavod}/rozjizdky/{cislo:int}/stav", StavAsync)
            .Produces<RozjizdkaSpravaRadek>()
            .WithSummary("Posune výsledky rozjížďky ve workflow")
            .WithDescription(
                "Řadou po jednom kroku; správce smí přeskočit. Zpátky se chodí " +
                "vrácením k revizi, a to má povinný důvod.");

        g.MapPost("/{zavod}/rozjizdky/{cislo:int}/pohar", DoSerieAsync)
            .Produces<RozjizdkaSpravaRadek>()
            .WithSummary("Zařadí rozjížďku do poháru, nebo ji z něj vyndá")
            .WithDescription(
                "Dokud je zápis rozepsaný, smí pořadatel regaty; u podepsaných čísel rozhodčí " +
                "ročníku. Výsledek regaty se nemění — ten se počítá ze všech odjetých rozjížděk.");

        g.MapPost("/{zavod}/rozjizdky/{cislo:int}/publikace", PublikaceAsync)
            .Produces<RozjizdkaSpravaRadek>()
            .WithSummary("Pustí výsledky rozjížďky na veřejný web, nebo je stáhne")
            .WithDescription(
                "Správce ročníku. Publikace není stav: potvrzený výsledek smí " +
                "zůstat neveřejný a publikovaný se smí vrátit k revizi.");
    }

    private static async Task<IResult> ZastavkyAsync(
        string serie, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah)
            return Results.NotFound();

        if (await PohledAsync(kdo, rozsahy, rozsah.SerieId, ct) is null) return Results.Forbid();

        return Results.Ok(await sprava.ZastavkyAsync(rozsah.SerieId, ct));
    }

    private static async Task<IResult> PrehledAsync(
        string serie, string zavod, ClaimsPrincipal kdo, AppDbContext db,
        Rozsahy rozsahy, VysledkySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();

        if (await PohledAsync(kdo, rozsahy, rozsah.SerieId, ct) is not { } pohled)
            return Results.Forbid();

        var hlavicka = await db.Zavody
            .Where(z => z.Id == rozsah.ZavodId)
            .Select(z => new { z.Nazev, z.Stav, z.Publikovano, z.Druh, SerieNazev = z.Serie!.Nazev })
            .FirstAsync(ct);

        // Komunitní akce výsledky nemá, takže tahle stránka pro ni neexistuje.
        if (Kalendar.ProcNejdePoharove(hlavicka.Druh) is not null) return Results.NotFound();

        var rozjizdky = await sprava.RozjizdkyAsync(rozsah.ZavodId.Value, ct);

        return Results.Ok(new PrehledVysledkuDto(
            serie, hlavicka.SerieNazev, zavod, hlavicka.Nazev, hlavicka.Stav, hlavicka.Publikovano,
            [.. rozjizdky.Select(r => pohled.Radek(rozsah.ZavodId.Value, r.Rozjizdka, r.PocetVysledku))],
            SmiPridatRozjizdku: pohled.Poradatel(rozsah.ZavodId.Value)
                                && Zapis.ProcNejdeNaZavod(hlavicka.Stav) is null));
    }

    private static async Task<IResult> StartAsync(
        string serie, string zavod, int cislo, [FromBody] StartVstup? vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, ZapisSprava zapis, TimeProvider cas, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;
        if (!await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        if (await zapis.StartAsync(rozjizdka, vstup?.StartV ?? cas.GetUtcNow(), ct) is { } chyba)
            return Results.BadRequest(new { error = chyba });

        return Results.Ok(await zapis.NactiAsync(rozjizdka, poradatel: true, ct));
    }

    private static async Task<IResult> PapirAsync(
        string serie, string zavod, int cislo, IFormFile? soubor, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, FotkySprava fotky, IUloziste uloziste, CancellationToken ct)
    {
        var formular = new PapirFormular(soubor);
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;
        if (!await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        if (!fotky.Pripraveno)
            return Results.Json(
                new { error = FotkySprava.Vypnuto }, statusCode: StatusCodes.Status503ServiceUnavailable);

        // Autor je ten, kdo fotku nahrál, a souhlas se neptá: papír z cíle
        // není fotka na web, jde jen o doklad k číslům. Kdo ho vyfotil, je
        // stejně zapsaný v `Fotka.Nahral`.
        var jmeno = kdo.FindFirst("name")?.Value ?? kdo.FindFirst("preferred_username")?.Value ?? "zapisovatel";
        var vstup = new FotkaFormular(
            formular.Soubor, jmeno, $"Papírový zápis {cislo}. rozjížďky", Souhlas: true);

        var (obrazek, chyba) = await fotky.NastavAsync(rozjizdka, vstup, uzivatel, ct);
        return obrazek is null ? Results.BadRequest(new { error = chyba }) : Results.Ok(obrazek);
    }

    private static async Task<IResult> OdeberPapirAsync(
        string serie, string zavod, int cislo, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, FotkySprava fotky, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;
        if (!await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return await fotky.OdeberAsync(rozjizdka, ct) is { } chyba
            ? Results.Json(new { error = chyba }, statusCode: StatusCodes.Status503ServiceUnavailable)
            : Results.NoContent();
    }

    private static async Task<IResult> ZnakAsync(
        string serie, string zavod, int prihlaska, ZnakVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ZapisSprava zapis, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();

        if (!await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return await zapis.ZnakAsync(rozsah.ZavodId.Value, prihlaska, vstup.Znak, ct) is { } chyba
            ? Results.BadRequest(new { error = chyba })
            : Results.NoContent();
    }

    private static async Task<IResult> PridejRozjizdkuAsync(
        string serie, string zavod, [FromBody] NovaRozjizdkaVstup? vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, ZapisSprava zapis, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();

        if (!await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var (rozjizdka, chyba) = await zapis.PridejRozjizdkuAsync(
            rozsah.ZavodId.Value, ct, vstup?.DoSerie ?? true);
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return Results.Created(
            $"/sprava/serie/{serie}/vysledky/{zavod}/rozjizdky/{rozjizdka!.Cislo}",
            await RadekAsync(kdo, rozsahy, sprava, rozsah, rozjizdka, ct));
    }

    private static async Task<IResult> ZapisAsync(
        string serie, string zavod, int cislo, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, ZapisSprava zapis, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;

        // Číst smí každý, kdo smí na výsledky ročníku — rozhodčí ověřuje
        // právě tenhle zápis, takže ho musí vidět, i když ho nemění.
        if (await PohledAsync(kdo, rozsahy, rozsah.SerieId, ct) is null) return Results.Forbid();

        return Results.Ok(await zapis.NactiAsync(
            rozjizdka, await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct), ct));
    }

    private static async Task<IResult> UlozAsync(
        string serie, string zavod, int cislo, ZapisVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, ZapisSprava zapis, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;

        if (!await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var vysledek = await zapis.UlozAsync(
            rozjizdka, vstup.Radky, ct, await rozsahy.UzivatelIdAsync(kdo, ct), vstup.Revize);

        // Konflikt má vlastní kód, ne 400: klient na něj musí reagovat jinak
        // než na chybu v datech — svou sadu si nechat a nabídnout porovnání.
        // Vydává se k němu i současný stav, aby ji bylo s čím srovnat.
        if (vysledek.Konflikt)
            return Results.Json(
                new
                {
                    error = vysledek.Chyba,
                    zapis = await zapis.NactiAsync(rozjizdka, poradatel: true, ct),
                },
                statusCode: StatusCodes.Status409Conflict);

        if (vysledek.Chyba is { } chyba) return Results.BadRequest(new { error = chyba });

        return Results.Ok(await zapis.NactiAsync(rozjizdka, poradatel: true, ct));
    }

    private static async Task<IResult> NavrhyAsync(
        string serie, string zavod, int cislo, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, ZapisSprava zapis, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;
        if (!await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        return Results.Ok(await zapis.NavrhyAsync(rozjizdka, await rozsahy.UzivatelIdAsync(kdo, ct), ct));
    }

    private static async Task<IResult> PouzijNavrhAsync(
        string serie, string zavod, int cislo, Guid autor, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, ZapisSprava zapis, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;
        if (!await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var (nenalezen, chyba) = await zapis.PouzijNavrhAsync(
            rozjizdka, autor, await rozsahy.UzivatelIdAsync(kdo, ct), ct);

        if (nenalezen) return Results.NotFound();
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return Results.Ok(await zapis.NactiAsync(rozjizdka, poradatel: true, ct));
    }

    private static async Task<IResult> StavAsync(
        string serie, string zavod, int cislo, StavVysledkuVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;

        // Rozhoduje cílový stav — a u zrušení i ten, ze kterého se jde:
        // zapisuje pořadatel, ověřuje a schvaluje rozhodčí, potvrzuje
        // správce, a ruší pořadatel, dokud je zápis otevřený.
        var pozadavek = new Pozadavek(
            Workflow.KdoSmi(rozjizdka.StavVysledku, vstup.Stav), rozsah.SerieId, rozsah.ZavodId);

        if (!await rozsahy.SmiAsync(kdo, pozadavek, ct)) return Results.Forbid();

        var spravce = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct);

        if (await sprava.PrepniStavAsync(rozjizdka, vstup.Stav, vstup.Duvod, spravce, ct) is { } chyba)
            return Results.BadRequest(new { error = chyba });

        return Results.Ok(await RadekAsync(kdo, rozsahy, sprava, rozsah, rozjizdka, ct));
    }

    private static async Task<IResult> DoSerieAsync(
        string serie, string zavod, int cislo, DoSerieVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;

        var pozadavek = new Pozadavek(
            Workflow.KdoSmiDoSerie(rozjizdka.StavVysledku), rozsah.SerieId, rozsah.ZavodId);

        if (!await rozsahy.SmiAsync(kdo, pozadavek, ct)) return Results.Forbid();

        await sprava.DoSerieAsync(rozjizdka, vstup.DoSerie, ct);
        return Results.Ok(await RadekAsync(kdo, rozsahy, sprava, rozsah, rozjizdka, ct));
    }

    private static async Task<IResult> PublikaceAsync(
        string serie, string zavod, int cislo, PublikaceVysledkuVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;

        // Rozhodčí říká „čísla platí", správce „ať to vidí veřejnost".
        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct))
            return Results.Forbid();

        await sprava.PublikujAsync(rozjizdka, vstup.Publikovano, ct);
        return Results.Ok(await RadekAsync(kdo, rozsahy, sprava, rozsah, rozjizdka, ct));
    }

    /// <summary>
    /// Zapisuje pořadatel zastávky; správce ho pokrývá. Rozhodčí ne — ten
    /// zápis ověřuje a kdyby ho smel i měnit, ověřoval by sám sebe.
    /// </summary>
    private static Task<bool> SmiZapisovatAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        rozsahy.SmiAsync(kdo, new Pozadavek(
            Workflow.KdoSmi(StavVysledku.Navrzeno, StavVysledku.Navrzeno),
            rozsah.SerieId, rozsah.ZavodId), ct);

    private static async Task<(Rozsahy.Rozsah Rozsah, Rozjizdka Rozjizdka)?> NajdiAsync(
        string serie, string zavod, int cislo,
        Rozsahy rozsahy, VysledkySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return null;

        var rozjizdka = await sprava.NajdiAsync(rozsah.ZavodId.Value, cislo, ct);
        return rozjizdka is null ? null : (rozsah, rozjizdka);
    }

    /// <summary>
    /// Co přihlášený v tomhle ročníku smí. Zjišťuje se <b>jednou na
    /// požadavek</b>: osm rozjížděk krát tři dotazy na práva je dvacet
    /// čtyři cest do databáze za jedno zobrazení.
    /// </summary>
    private sealed record Pohled(
        bool Rozhodci, bool Spravce, bool OrganizatorRocniku, IReadOnlyList<int> Zavody)
    {
        public bool Poradatel(int zavodId) => Spravce || OrganizatorRocniku || Zavody.Contains(zavodId);

        public RozjizdkaSpravaRadek Radek(int zavodId, Rozjizdka r, int pocetVysledku)
        {
            var organizator = Poradatel(zavodId);

            var mozne = Workflow.MozneZ(r.StavVysledku, Spravce)
                .Where(na => Workflow.KdoSmi(r.StavVysledku, na) switch
                {
                    Role.Organizator => organizator,
                    Role.Rozhodci => Rozhodci,
                    _ => Spravce,
                })
                .ToList();

            // Stav zastávky se tu neptá: je stejný pro všechny rozjížďky
            // a obrazovka zápisu řekne sama, proč je jen ke čtení.
            return new RozjizdkaSpravaRadek(
                r.Cislo, r.StartV, r.Stav, r.DoSerie, r.StavVysledku, r.Publikovano,
                r.DuvodRevize, pocetVysledku, Spravce, mozne,
                SmiZapisovat: organizator && Zapis.Otevreny(r.StavVysledku),
                SmiDoPoharu: Workflow.KdoSmiDoSerie(r.StavVysledku) switch
                {
                    Role.Organizator => organizator,
                    _ => Rozhodci,
                },
                MaPapir: r.FotkaId is not null);
        }
    }

    /// <summary>
    /// Vrací <c>null</c>, když přihlášený u výsledků ročníku nemá co
    /// pohledávat — tedy není ani rozhodčí, ani pořadatel jediné zastávky.
    /// </summary>
    private static async Task<Pohled?> PohledAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, int serieId, CancellationToken ct)
    {
        var rozhodci = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, serieId), ct);
        var spravce = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, serieId), ct);
        var (celyRocnik, zavody) = await rozsahy.KdeSmiAsync(kdo, Role.Organizator, serieId, ct);

        if (!rozhodci && !celyRocnik && zavody.Count == 0) return null;

        return new Pohled(rozhodci, spravce, celyRocnik, zavody);
    }

    /// <summary>Jeden řádek po zápisu — aby si obrazovka nemusela nový stav domýšlet.</summary>
    private static async Task<RozjizdkaSpravaRadek> RadekAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, VysledkySprava sprava,
        Rozsahy.Rozsah rozsah, Rozjizdka rozjizdka, CancellationToken ct)
    {
        var pohled = await PohledAsync(kdo, rozsahy, rozsah.SerieId, ct)
                     ?? new Pohled(false, false, false, []);

        var pocet = (await sprava.RozjizdkyAsync(rozsah.ZavodId!.Value, ct))
            .First(r => r.Rozjizdka.Cislo == rozjizdka.Cislo).PocetVysledku;

        return pohled.Radek(rozsah.ZavodId.Value, rozjizdka, pocet);
    }
}
