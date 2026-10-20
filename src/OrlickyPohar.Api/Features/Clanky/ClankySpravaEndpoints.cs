using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;
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
        var g = app.MapSpravu("/sprava/serie/{serie}/clanky");

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

        // Token jde v hlavičce, ne v cookie — ochrana proti podvrženému
        // formuláři tu nemá co chránit.
        g.MapPut("/{clanek}/obrazek", NastavObrazekAsync)
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(Nahravani.NejvicBajtu + 1024 * 1024))
            .Produces<ObrazekDto>()
            .WithSummary("Nahraje hlavní obrázek článku a nahradí předchozí")
            .WithDescription(
                "JPEG, PNG nebo WebP do 15 MB. Autor a potvrzený souhlas se zveřejněním jsou povinné. " +
                "Bez nastaveného úložiště vrací 503.");

        g.MapDelete("/{clanek}/obrazek", OdeberObrazekAsync)
            .WithSummary("Odebere hlavní obrázek článku a smaže jeho soubory");

        g.MapPost("/{clanek}/obrazky", NahrajDoTelaAsync)
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(Nahravani.NejvicBajtu + 1024 * 1024))
            .Produces<ObrazekDto>()
            .WithSummary("Nahraje obrázek do těla článku a vrátí jeho adresu")
            .WithDescription(
                "Prochází stejným přepočtem jako hlavní obrázek, takže skončí jako WebP " +
                "nejvýš 1600 px. V těle článku smí být jen obrázek nahraný takhle — " +
                "cizí adresa se při uložení textu zahodí.");

        g.MapGet("/{clanek}/obrazky", SeznamVTeleAsync)
            .Produces<List<ObrazekDto>>()
            .WithSummary("Vrátí obrázky nahrané do těla článku");
    }

    /// <summary>
    /// Obecné články mimo ročník (od 22. 9. 2026). Stejné chování jako
    /// články ročníku, jen rozsah je celý web: psát smí editor webu nebo
    /// správce webu, nikdo s právem jen na ročník.
    /// </summary>
    public static void MapSpravaObecnychClanku(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/web/clanky");

        g.MapGet("/", WebPrehledAsync)
            .Produces<PrehledObecnychClankuDto>()
            .WithSummary("Vypíše obecné články mimo ročník")
            .WithDescription("Vyžaduje roli editora celého webu. Smazané se nevypisují.");

        g.MapPost("/", WebZalozAsync)
            .Produces<ClanekSpravaRadek>(StatusCodes.Status201Created)
            .WithSummary("Založí obecný článek jako koncept");

        g.MapGet("/{clanek}", WebDetailAsync)
            .Produces<ClanekDto>()
            .WithSummary("Vrátí obecný článek k úpravě, včetně konceptu a skrytého");

        g.MapPut("/{clanek}", WebUpravAsync)
            .Produces<ClanekSpravaRadek>()
            .WithSummary("Uloží úpravu obecného článku");

        g.MapPost("/{clanek}/stav", WebStavAsync)
            .Produces<ClanekSpravaRadek>()
            .WithSummary("Přepne stav obecného článku");

        g.MapPut("/{clanek}/obrazek", WebNastavObrazekAsync)
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(Nahravani.NejvicBajtu + 1024 * 1024))
            .Produces<ObrazekDto>()
            .WithSummary("Nahraje hlavní obrázek obecného článku a nahradí předchozí");

        g.MapDelete("/{clanek}/obrazek", WebOdeberObrazekAsync)
            .WithSummary("Odebere hlavní obrázek obecného článku a smaže jeho soubory");

        g.MapPost("/{clanek}/obrazky", WebNahrajDoTelaAsync)
            .DisableAntiforgery()
            .WithMetadata(new RequestSizeLimitAttribute(Nahravani.NejvicBajtu + 1024 * 1024))
            .Produces<ObrazekDto>()
            .WithSummary("Nahraje obrázek do těla obecného článku a vrátí jeho adresu");

        g.MapGet("/{clanek}/obrazky", WebSeznamVTeleAsync)
            .Produces<List<ObrazekDto>>()
            .WithSummary("Vrátí obrázky nahrané do těla obecného článku");
    }

    private static readonly Pozadavek EditorWebu = new(Role.Editor, null);

    private static async Task<IResult> WebPrehledAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (!await rozsahy.SmiAsync(kdo, EditorWebu, ct)) return Nesmi(kdo);
        return Results.Ok(new PrehledObecnychClankuDto(await sprava.VypisAsync(null, true, [], ct)));
    }

    private static async Task<IResult> WebZalozAsync(
        ClanekVstupSprava vstup, ClaimsPrincipal kdo, Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (!await rozsahy.SmiAsync(kdo, EditorWebu, ct)) return Nesmi(kdo);

        // Zastávka u obecného článku nedává smysl — žádná k němu nepatří.
        var (clanek, chyba) = await sprava.ZalozAsync(null, null, vstup with { Zavod = null }, ct);
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return Results.Created($"/sprava/web/clanky/{clanek!.Slug}", await RadekAsync(sprava, clanek, ct));
    }

    private static async Task<IResult> WebDetailAsync(
        string clanek, ClaimsPrincipal kdo, Rozsahy rozsahy, ClankySprava sprava, IUloziste uloziste, CancellationToken ct)
    {
        if (await ObecnySPravem(clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        return Results.Ok(new ClanekDto(
            nalezeny.Slug, nalezeny.Titulek, nalezeny.Perex, TeloKUprave(nalezeny), nalezeny.Autor,
            nalezeny.PublikovanoV, null, null, Nahravani.Dto(nalezeny.Fotka, uloziste.VerejnaAdresa),
            FormatKUprave(nalezeny)));
    }

    private static async Task<IResult> WebUpravAsync(
        string clanek, ClanekVstupSprava vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (await ObecnySPravem(clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        if (await sprava.UpravAsync(nalezeny, vstup with { Zavod = null }, null, ct) is { } chyba)
            return Results.BadRequest(new { error = chyba });

        return Results.Ok(await RadekAsync(sprava, nalezeny, ct));
    }

    private static async Task<IResult> WebStavAsync(
        string clanek, StavVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (await ObecnySPravem(clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        if (await sprava.PrepniStavAsync(nalezeny, vstup.Stav, ct) is { } chyba)
            return Results.BadRequest(new { error = chyba });

        return Results.Ok(await RadekAsync(sprava, nalezeny, ct));
    }

    private static async Task<IResult> WebNastavObrazekAsync(
        string clanek, IFormFile? soubor, [FromForm] string? autor, [FromForm] string? popis,
        [FromForm] bool? souhlas, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, FotkySprava fotky, CancellationToken ct)
    {
        var formular = new FotkaFormular(soubor, autor, popis, souhlas ?? false);
        if (await ObecnySPravem(clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        if (!fotky.Pripraveno)
            return Results.Json(new { error = FotkySprava.Vypnuto }, statusCode: StatusCodes.Status503ServiceUnavailable);

        var (obrazek, chyba) = await fotky.NastavAsync(nalezeny, formular, uzivatel, ct);
        return obrazek is null ? Results.BadRequest(new { error = chyba }) : Results.Ok(obrazek);
    }

    private static async Task<IResult> WebNahrajDoTelaAsync(
        string clanek, IFormFile? soubor, [FromForm] string? autor, [FromForm] string? popis,
        [FromForm] bool? souhlas, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, FotkySprava fotky, CancellationToken ct)
    {
        var formular = new FotkaFormular(soubor, autor, popis, souhlas ?? false);
        if (await ObecnySPravem(clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        if (!fotky.Pripraveno)
            return Results.Json(new { error = FotkySprava.Vypnuto }, statusCode: StatusCodes.Status503ServiceUnavailable);

        var (obrazek, chyba) = await fotky.NahrajDoTelaAsync(nalezeny.Id, formular, uzivatel, ct);
        return obrazek is null ? Results.BadRequest(new { error = chyba }) : Results.Ok(obrazek);
    }

    private static async Task<IResult> WebSeznamVTeleAsync(
        string clanek, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, FotkySprava fotky, CancellationToken ct)
    {
        if (await ObecnySPravem(clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        return Results.Ok(await fotky.VTeleAsync(nalezeny.Id, ct));
    }

    private static async Task<IResult> WebOdeberObrazekAsync(
        string clanek, ClaimsPrincipal kdo, Rozsahy rozsahy, ClankySprava sprava, FotkySprava fotky, CancellationToken ct)
    {
        if (await ObecnySPravem(clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        if (await fotky.OdeberAsync(nalezeny, ct) is { } chyba)
            return Results.Json(new { error = chyba }, statusCode: StatusCodes.Status503ServiceUnavailable);

        return Results.NoContent();
    }

    /// <summary>
    /// Obecný článek, pokud přihlášený smí na celý web. Kdo nesmí, dostane
    /// 404 stejně jako u neexistujícího — koncepty se nemají dát uhodnout.
    /// </summary>
    private static async Task<Clanek?> ObecnySPravem(
        string slug, ClaimsPrincipal kdo, Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (!await rozsahy.SmiAsync(kdo, EditorWebu, ct)) return null;
        return await sprava.NajdiAsync(null, slug, ct);
    }

    /// <summary>Nepřihlášenému 401, přihlášenému bez role 403.</summary>
    private static IResult Nesmi(ClaimsPrincipal kdo) =>
        kdo.Identity?.IsAuthenticated == true ? Results.Forbid() : Results.Unauthorized();


    private static async Task<IResult> NastavObrazekAsync(
        string serie, string clanek, IFormFile? soubor, [FromForm] string? autor, [FromForm] string? popis,
        [FromForm] bool? souhlas, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, FotkySprava fotky, CancellationToken ct)
    {
        var formular = new FotkaFormular(soubor, autor, popis, souhlas ?? false);
        if (await NajdiSPravem(serie, clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        if (!fotky.Pripraveno)
            return Results.Json(new { error = FotkySprava.Vypnuto }, statusCode: StatusCodes.Status503ServiceUnavailable);

        var (obrazek, chyba) = await fotky.NastavAsync(nalezeny, formular, uzivatel, ct);
        return obrazek is null ? Results.BadRequest(new { error = chyba }) : Results.Ok(obrazek);
    }

    private static async Task<IResult> NahrajDoTelaAsync(
        string serie, string clanek, IFormFile? soubor, [FromForm] string? autor, [FromForm] string? popis,
        [FromForm] bool? souhlas, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, FotkySprava fotky, CancellationToken ct)
    {
        var formular = new FotkaFormular(soubor, autor, popis, souhlas ?? false);
        if (await NajdiSPravem(serie, clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        if (!fotky.Pripraveno)
            return Results.Json(new { error = FotkySprava.Vypnuto }, statusCode: StatusCodes.Status503ServiceUnavailable);

        var (obrazek, chyba) = await fotky.NahrajDoTelaAsync(nalezeny.Id, formular, uzivatel, ct);
        return obrazek is null ? Results.BadRequest(new { error = chyba }) : Results.Ok(obrazek);
    }

    private static async Task<IResult> SeznamVTeleAsync(
        string serie, string clanek, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, FotkySprava fotky, CancellationToken ct)
    {
        if (await NajdiSPravem(serie, clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        return Results.Ok(await fotky.VTeleAsync(nalezeny.Id, ct));
    }

    private static async Task<IResult> OdeberObrazekAsync(
        string serie, string clanek, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, FotkySprava fotky, CancellationToken ct)
    {
        if (await NajdiSPravem(serie, clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        if (await fotky.OdeberAsync(nalezeny, ct) is { } chyba)
            return Results.Json(new { error = chyba }, statusCode: StatusCodes.Status503ServiceUnavailable);

        return Results.NoContent();
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
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return Results.Created(
            $"/sprava/serie/{serie}/clanky/{clanek!.Slug}", await RadekAsync(sprava, clanek, ct));
    }

    private static async Task<IResult> DetailAsync(
        string serie, string clanek, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, AppDbContext db, IUloziste uloziste, CancellationToken ct)
    {
        if (await NajdiSPravem(serie, clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        var zavod = nalezeny.ZavodId is null
            ? null
            : await db.Zavody.Where(z => z.Id == nalezeny.ZavodId)
                .Select(z => new { z.Slug, z.Nazev }).FirstAsync(ct);

        return Results.Ok(new ClanekDto(
            nalezeny.Slug, nalezeny.Titulek, nalezeny.Perex, TeloKUprave(nalezeny), nalezeny.Autor,
            nalezeny.PublikovanoV, zavod?.Slug, zavod?.Nazev,
            Nahravani.Dto(nalezeny.Fotka, uloziste.VerejnaAdresa),
            FormatKUprave(nalezeny), nalezeny.Uvodnik));
    }

    /// <summary>
    /// Tělo, jak ho autor uvidí v poli. Bloky se převedou zpátky do HTML —
    /// ne do původního vloženého textu, ale do toho vyčištěného, který se
    /// doopravdy uložil. Autor tak vidí, co z jeho vložení zbylo, a další
    /// uložení už nic nemění.
    /// </summary>
    private static string TeloKUprave(Clanek clanek) =>
        clanek.Format == FormatClanku.Bloky ? Bloky.DoHtml(Bloky.Nacti(clanek.Telo)) : clanek.Telo;

    /// <summary>
    /// Formát, jak ho pochopí formulář. Uložené `Bloky` se ukazují a posílají
    /// zpátky jako `Html` — je to tentýž obsah, jen tvar, ve kterém se dá psát.
    /// </summary>
    private static FormatClanku FormatKUprave(Clanek clanek) =>
        clanek.Format == FormatClanku.Bloky ? FormatClanku.Html : clanek.Format;

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
            return Results.BadRequest(new { error = chyba });

        return Results.Ok(await RadekAsync(sprava, nalezeny, ct));
    }

    private static async Task<IResult> StavAsync(
        string serie, string clanek, StavVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, ClankySprava sprava, CancellationToken ct)
    {
        if (await NajdiSPravem(serie, clanek, kdo, rozsahy, sprava, ct) is not { } nalezeny)
            return Results.NotFound();

        if (await sprava.PrepniStavAsync(nalezeny, vstup.Stav, ct) is { } chyba)
            return Results.BadRequest(new { error = chyba });

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
