using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Zavody;

public record PublikaceVysledkuVstup(bool Publikovano);

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
        var g = app.MapGroup("/sprava/serie/{serie}/vysledky").WithTags("Správa");

        g.MapGet("/", ZastavkyAsync)
            .Produces<List<ZastavkaVysledkyDto>>()
            .WithSummary("Vypíše zastávky ročníku i s tím, kolik výsledků je venku")
            .WithDescription(
                "Rozcestník. Vyžaduje roli rozhodčího v ročníku, nebo organizátora " +
                "aspoň na jedné zastávce.");

        g.MapGet("/{zavod}", PrehledAsync)
            .Produces<PrehledVysledkuDto>()
            .WithSummary("Vypíše rozjížďky zastávky i s tím, co s nimi přihlášený smí");

        g.MapPost("/{zavod}/rozjizdky", PridejRozjizdkuAsync)
            .Produces<RozjizdkaSpravaRadek>(StatusCodes.Status201Created)
            .WithSummary("Přidá zastávce další rozjížďku")
            .WithDescription(
                "Pořadatel zastávky, od vypsání závodu. Nová rozjížďka je návrh " +
                "a na webu není.");

        g.MapGet("/{zavod}/rozjizdky/{cislo:int}", ZapisAsync)
            .Produces<ZapisRozjizdkyDto>()
            .WithSummary("Vypíše zápis rozjížďky: všechny lodě ročníku a jejich výsledky")
            .WithDescription(
                "Vidí ho každý, kdo smí na výsledky ročníku. Měnit ho smí jen " +
                "pořadatel zastávky, a jen v návrhu nebo po vrácení k revizi.");

        g.MapPut("/{zavod}/rozjizdky/{cislo:int}/vysledky", UlozAsync)
            .Produces<ZapisRozjizdkyDto>()
            .WithSummary("Uloží celou sadu výsledků rozjížďky")
            .WithDescription(
                "Loď, která v sadě nemá pořadí ani kód, výsledek nemá. Pořadí, " +
                "nebo kód, ne obojí; stejné pořadí v jedné kategorii neprojde. " +
                "Čas se nemění.");

        g.MapPost("/{zavod}/rozjizdky/{cislo:int}/stav", StavAsync)
            .Produces<RozjizdkaSpravaRadek>()
            .WithSummary("Posune výsledky rozjížďky ve workflow")
            .WithDescription(
                "Řadou po jednom kroku; správce smí přeskočit. Zpátky se chodí " +
                "vrácením k revizi, a to má povinný důvod.");

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

    private static async Task<IResult> PridejRozjizdkuAsync(
        string serie, string zavod, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, ZapisSprava zapis, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return Results.NotFound();

        if (!await SmiZapisovatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var (rozjizdka, chyba) = await zapis.PridejRozjizdkuAsync(rozsah.ZavodId.Value, ct);
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

        if (await zapis.UlozAsync(rozjizdka, vstup.Radky, ct) is { } chyba)
            return Results.BadRequest(new { error = chyba });

        return Results.Ok(await zapis.NactiAsync(rozjizdka, poradatel: true, ct));
    }

    private static async Task<IResult> StavAsync(
        string serie, string zavod, int cislo, StavVysledkuVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, VysledkySprava sprava, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, cislo, rozsahy, sprava, ct) is not { } nalezena)
            return Results.NotFound();

        var (rozsah, rozjizdka) = nalezena;

        // Rozhoduje cílový stav: zapisuje pořadatel, ověřuje a schvaluje
        // rozhodčí, potvrzuje a eliminuje správce.
        var pozadavek = new Pozadavek(
            Workflow.KdoSmi(vstup.Stav), rozsah.SerieId, rozsah.ZavodId);

        if (!await rozsahy.SmiAsync(kdo, pozadavek, ct)) return Results.Forbid();

        var spravce = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct);

        if (await sprava.PrepniStavAsync(rozjizdka, vstup.Stav, vstup.Duvod, spravce, ct) is { } chyba)
            return Results.BadRequest(new { error = chyba });

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
        rozsahy.SmiAsync(kdo, new Pozadavek(Workflow.KdoSmi(StavVysledku.Navrzeno), rozsah.SerieId, rozsah.ZavodId), ct);

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
                .Where(na => Workflow.KdoSmi(na) switch
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
                SmiZapisovat: organizator && Zapis.Otevreny(r.StavVysledku));
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
