using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Clanky;

/// <summary>Přepnutí stavu článku. Samostatně, ne jako pole úpravy — viz níž.</summary>
public record StavVstup(StavClanku Stav);

/// <summary>
/// Psaní článků. <b>Editor svého rozsahu</b> — ze zadání: na blog zastávky
/// píše její editor nebo organizátor.
/// <para>
/// Leží to v témže řezu jako veřejné čtení, ne ve <c>Features/Sprava</c>.
/// Řez je doménový pojem, ne publikum: články jsou články, ať je čte
/// návštěvník nebo je píše pořadatel.
/// </para>
/// <para>
/// <b>Stav se přepíná vlastním endpointem</b>, ne polem v úpravě. Publikovat
/// a upravit jsou dvě různá rozhodnutí a slitím do jednoho zápisu by se
/// stalo, že uložení rozepsaného textu článek vydá — nebo že oprava překlepu
/// omylem stáhne publikovaný text.
/// </para>
/// </summary>
public static class ClankySpravaEndpoints
{
    public static void MapSpravaClanku(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/sprava/serie/{serie}/clanky").WithTags("Správa");

        // Tvar odpovědi se říká ručně: handlery vracejí `IResult`, protože
        // se z nich chodí ven víc způsoby, a z toho dokument nic neodvodí.
        g.MapGet("/", PrehledAsync)
            .Produces<PrehledClankuDto>()
            .WithSummary("Vypíše články, na které přihlášený dosáhne")
            .WithDescription(
                "Vyžaduje roli editora v ročníku nebo aspoň na jedné zastávce. " +
                "Smazané se nevypisují.");

        g.MapPost("/", ZalozAsync)
            .Produces<ClanekSpravaRadek>(StatusCodes.Status201Created)
            .WithSummary("Založí článek jako koncept")
            .WithDescription(
                "Adresa se odvodí z titulku. Nový článek je vždycky koncept — " +
                "publikuje se zvlášť.");

        g.MapGet("/{clanek}", DetailAsync)
            .Produces<ClanekDto>()
            .WithSummary("Vrátí článek k úpravě, včetně konceptu a skrytého");

        g.MapPut("/{clanek}", UpravAsync)
            .Produces<ClanekSpravaRadek>()
            .WithSummary("Uloží úpravu článku")
            .WithDescription("Adresa se nemění, ani když se změní titulek.");

        g.MapPost("/{clanek}/stav", StavAsync)
            .Produces<ClanekSpravaRadek>()
            .WithSummary("Přepne stav článku")
            .WithDescription(
                "Koncept, publikováno, skryté, smazané. Smazaný se nedá " +
                "publikovat rovnou — nejdřív se vrátí jako koncept.");
    }

    private static async Task<IResult> PrehledAsync(
        string serie, ClaimsPrincipal kdo, AppDbContext db,
        Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah)
            return Results.NotFound();

        var (celyRocnik, zavody) = await rozsahy.KdeSmiAsync(kdo, Role.Editor, rozsah.SerieId, ct);
        if (!celyRocnik && zavody.Count == 0) return Results.Forbid();

        var nazev = await db.Serie.Where(s => s.Id == rozsah.SerieId)
            .Select(s => s.Nazev).FirstAsync(ct);

        return Results.Ok(new PrehledClankuDto(
            serie,
            nazev,
            celyRocnik,
            await sprava.ZastavkyAsync(rozsah.SerieId, celyRocnik, zavody, ct),
            await sprava.VypisAsync(rozsah.SerieId, celyRocnik, zavody, ct)));
    }

    private static async Task<IResult> ZalozAsync(
        string serie, ClanekVstupSprava vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (await Rozsah(serie, vstup.Zavod, kdo, rozsahy, ct) is not { } kde)
            return Odmitnuti(vstup.Zavod);

        var (clanek, chyba) = await sprava.ZalozAsync(kde.SerieId, kde.ZavodId, vstup, ct);
        if (chyba is not null) return Results.BadRequest(new { chyba });

        return Results.Created(
            $"/sprava/serie/{serie}/clanky/{clanek!.Slug}", await RadekAsync(sprava, clanek, ct));
    }

    private static async Task<IResult> DetailAsync(
        string serie, string clanek, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, AppDbContext db, CancellationToken ct)
    {
        if (await NajdiSPravem(serie, clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        var zavod = nalezeny.ZavodId is null
            ? null
            : await db.Zavody.Where(z => z.Id == nalezeny.ZavodId)
                .Select(z => new { z.Slug, z.Nazev }).FirstAsync(ct);

        return Results.Ok(new ClanekDto(
            nalezeny.Slug, nalezeny.Titulek, nalezeny.Perex, nalezeny.Telo, nalezeny.Autor,
            nalezeny.PublikovanoV, zavod?.Slug, zavod?.Nazev));
    }

    private static async Task<IResult> UpravAsync(
        string serie, string clanek, ClanekVstupSprava vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (await NajdiSPravem(serie, clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        // Přesunout článek jinam smí jen ten, kdo smí i tam. Bez téhle
        // kontroly by editor jedné zastávky přehodil svůj text na cizí.
        if (await Rozsah(serie, vstup.Zavod, kdo, rozsahy, ct) is not { } kam)
            return Odmitnuti(vstup.Zavod);

        if (await sprava.UpravAsync(nalezeny, vstup, kam.ZavodId, ct) is { } chyba)
            return Results.BadRequest(new { chyba });

        return Results.Ok(await RadekAsync(sprava, nalezeny, ct));
    }

    private static async Task<IResult> StavAsync(
        string serie, string clanek, StavVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (await NajdiSPravem(serie, clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        if (await sprava.PrepniStavAsync(nalezeny, vstup.Stav, ct) is { } chyba)
            return Results.BadRequest(new { chyba });

        return Results.Ok(await RadekAsync(sprava, nalezeny, ct));
    }

    /// <summary>
    /// Rozsah, ve kterém se má psát — a rovnou ověřený. Vrací <c>null</c>,
    /// když neexistuje nebo na něj přihlášený nedosáhne; <b>obojí schválně
    /// stejně</b>, aby se z odpovědi nedalo vyčíst, které zastávky existují.
    /// </summary>
    private static async Task<Rozsahy.Rozsah?> Rozsah(
        string serie, string? zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { } rozsah) return null;

        var smi = await rozsahy.SmiAsync(
            kdo, new Pozadavek(Role.Editor, rozsah.SerieId, rozsah.ZavodId), ct);

        return smi ? rozsah : null;
    }

    /// <summary>
    /// Článek, na který přihlášený dosáhne. Právo se odvozuje z rozsahu
    /// <b>toho článku</b>, ne z toho, co je v adrese — jinak by editor
    /// jedné zastávky sáhl na cizí text pouhým uhodnutím jeho adresy.
    /// </summary>
    private static async Task<Clanek?> NajdiSPravem(
        string serie, string slug, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return null;

        var clanek = await sprava.NajdiAsync(rozsah.SerieId, slug, ct);
        if (clanek is null) return null;

        var smi = await rozsahy.SmiAsync(
            kdo, new Pozadavek(Role.Editor, clanek.SerieId, clanek.ZavodId), ct);

        return smi ? clanek : null;
    }

    /// <summary>
    /// Nenašlo se, nebo nesmí? <b>Ven jde totéž.</b> Rozlišit to znamená
    /// říct cizímu, které zastávky v ročníku jsou.
    /// </summary>
    private static IResult Odmitnuti(string? zavod) =>
        zavod is null ? Results.Forbid() : Results.NotFound();

    private static async Task<ClanekSpravaRadek> RadekAsync(
        ClankySprava sprava, Clanek clanek, CancellationToken ct) =>
        (await sprava.VypisAsync(clanek.SerieId, true, [], ct))
        .First(r => r.Slug == clanek.Slug);
}
