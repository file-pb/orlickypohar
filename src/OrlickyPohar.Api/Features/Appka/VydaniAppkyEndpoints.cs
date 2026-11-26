using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Import;

namespace OrlickyPohar.Api.Features.Appka;

/// <summary>Jeden vydaný balíček, jak ho vidí appka.</summary>
public record VydaniAppkyDto(int CisloBalicku, string Otisk, DateTimeOffset VydanoV);

public record ZapisVydaniAppky(string Platforma, int CisloBalicku, string Otisk, string? Commit);

public record ZapisVydaniAppkyVysledek(bool Nove);

public static partial class VydaniAppkyEndpoints
{
    public const string Hlavicka = "X-Vydani-Token";

    /// <summary>
    /// Kolik posledních balíčků se vydá. Appka potřebuje poznat, jestli ten
    /// její v seznamu je — a telefon, který nikdo dvacet vydání neaktualizoval,
    /// se o novince dozví i z věty „tenhle balíček neznám".
    /// </summary>
    public const int NejvicVydani = 20;

    /// <summary>Strop Play pro <c>versionCode</c>.</summary>
    public const int NejvyssiCislo = 2_100_000_000;

    public static readonly IReadOnlyList<string> Platformy = ["android", "ios"];

    public static void MapVydaniAppky(this IEndpointRouteBuilder app)
    {
        app.MapGet("/appka/vydani/{platforma}", CtiAsync)
            .WithTags("Appka")
            .WithSummary("Nativní balíčky appky, které došly do obchodu")
            .WithDescription(
                $"Nejvýš {NejvicVydani} posledních, od nejvyššího čísla balíčku. Prázdný " +
                "seznam, dokud CI nic nezapsalo. Appka podle otisku pozná, jestli ten " +
                "její je poslední — aktualizace po síti to nepoznají, protože hledají " +
                "jen pro otisk, na kterém appka běží.");

        app.MapPost("/appka/vydani", ZapisAsync)
            .WithTags("Appka")
            .WithSummary("Zápis vydaného balíčku z CI")
            .WithDescription(
                "Chráněno tokenem v hlavičce X-Vydani-Token. Idempotentní podle platformy " +
                "a čísla balíčku: ruční „nahrát znovu“ téhož čísla nic nezdvojí.");
    }

    private static async Task<Results<Ok<List<VydaniAppkyDto>>, NotFound>> CtiAsync(
        string platforma, AppDbContext db, CancellationToken ct)
    {
        if (!Platformy.Contains(platforma)) return TypedResults.NotFound();

        var vydani = await db.VydaniAppky.AsNoTracking()
            .Where(v => v.Platforma == platforma)
            .OrderByDescending(v => v.CisloBalicku)
            .Take(NejvicVydani)
            .Select(v => new VydaniAppkyDto(v.CisloBalicku, v.Otisk, v.VydanoV))
            .ToListAsync(ct);

        return TypedResults.Ok(vydani);
    }

    private static async Task<IResult> ZapisAsync(
        ZapisVydaniAppky vstup, HttpContext ctx, AppDbContext db, IConfiguration config,
        TimeProvider cas, CancellationToken ct)
    {
        switch (ImportniToken.Over(ctx, config["Appka:Token"], Hlavicka))
        {
            case StavTokenu.Nenakonfigurovan:
                return Results.Problem(
                    "Zápis vydání není nakonfigurovaný.", statusCode: StatusCodes.Status503ServiceUnavailable);
            case StavTokenu.Nesedi:
                return Results.Unauthorized();
        }

        if (Chyba(vstup) is { } chyba) return Results.BadRequest(new { error = chyba });

        return Results.Ok(await UlozAsync(db, vstup, cas.GetUtcNow(), ct));
    }

    public static string? Chyba(ZapisVydaniAppky v)
    {
        if (v.Platforma is null || !Platformy.Contains(v.Platforma))
            return $"Platforma „{v.Platforma}“ není android ani ios.";
        if (v.CisloBalicku is < 1 or > NejvyssiCislo)
            return $"Číslo balíčku {v.CisloBalicku} je mimo rozsah obchodu.";
        // Otisk se porovnává s tím, co telefon hlásí jako `runtimeVersion`,
        // znak po znaku. Mezera nebo prázdno by se nikdy neshodly a appka by
        // tvrdila, že tenhle balíček nemá nikdo.
        if (v.Otisk is null || !Otisk().IsMatch(v.Otisk))
            return "Otisk musí být 1–64 znaků z písmen, číslic, tečky, pomlčky a podtržítka.";
        if (v.Commit is not null && !Commit().IsMatch(v.Commit))
            return "Commit musí být hash z gitu.";
        return null;
    }

    /// <summary>
    /// Upsert podle platformy a čísla. Čas prvního zápisu zůstává — opakované
    /// nahrání téhož balíčku není nové vydání.
    /// </summary>
    public static async Task<ZapisVydaniAppkyVysledek> UlozAsync(
        AppDbContext db, ZapisVydaniAppky v, DateTimeOffset ted, CancellationToken ct)
    {
        var radek = await db.VydaniAppky.FirstOrDefaultAsync(
            x => x.Platforma == v.Platforma && x.CisloBalicku == v.CisloBalicku, ct);

        if (radek is null)
        {
            db.VydaniAppky.Add(new VydaniAppky
            {
                Platforma = v.Platforma,
                CisloBalicku = v.CisloBalicku,
                Otisk = v.Otisk,
                Commit = v.Commit,
                VydanoV = ted.ToUniversalTime(),
            });
            await db.SaveChangesAsync(ct);
            return new ZapisVydaniAppkyVysledek(true);
        }

        radek.Otisk = v.Otisk;
        radek.Commit = v.Commit ?? radek.Commit;
        await db.SaveChangesAsync(ct);
        return new ZapisVydaniAppkyVysledek(false);
    }

    [GeneratedRegex("^[A-Za-z0-9._-]{1,64}$")]
    private static partial Regex Otisk();

    [GeneratedRegex("^[0-9a-f]{7,40}$")]
    private static partial Regex Commit();
}
