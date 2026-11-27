using Microsoft.EntityFrameworkCore;
using Npgsql;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Import;

namespace OrlickyPohar.Api.Features.Appka;

/// <summary>Co CI pošle po publikaci aktualizace.</summary>
/// <param name="Platforma"><c>android</c> nebo <c>ios</c>.</param>
/// <param name="Kanal">Kanál Expa, do kterého aktualizace šla.</param>
/// <param name="Otisk">Otisk nativní části (<c>runtimeVersion</c>).</param>
/// <param name="Aktualizace">ID aktualizace PRO DANOU PLATFORMU (pole <c>id</c> položky
/// s touto platformou ve výstupu <c>eas update --json</c>), NE ID skupiny (<c>group</c>).
/// Totéž ID telefon hlásí jako <c>Updates.updateId</c> v hlavičce X-Appka-Verze —
/// s ID skupiny by se nesešlo nic a všechny telefony by vyšly jako stará aktualizace.</param>
/// <param name="Commit">Commit, ze kterého aktualizace je.</param>
public record ZapisPublikaceAppky(
    string Platforma, string Kanal, string Otisk, string Aktualizace, string? Commit);

public record ZapisPublikaceAppkyVysledek(bool Nove);

public static class PublikaceAppkyEndpoints
{
    public static void MapPublikaceAppky(this IEndpointRouteBuilder app)
    {
        app.MapPost("/appka/publikace", ZapisAsync)
            .WithTags("Appka")
            .Produces<ZapisPublikaceAppkyVysledek>()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status401Unauthorized)
            .WithSummary("Zápis publikované aktualizace appky z CI")
            .WithDescription(
                "Chráněno tokenem v hlavičce X-Vydani-Token, stejným jako zápis vydání. " +
                "Idempotentní podle platformy, kanálu, otisku a aktualizace: opakované " +
                "odeslání téhož nic nezdvojí a čas prvního zápisu zůstane. Podle toho, " +
                "co přišlo naposledy, pozná přehled flotily, jestli telefon jede na " +
                "nejnovější aktualizaci.");
    }

    /// <summary>
    /// <b>Token dřív než tvar.</b> Stejné pořadí jako u vydání: bez tokenu
    /// se odpovídá 401 a o tom, co by v těle vadilo, se nemluví.
    /// </summary>
    private static async Task<IResult> ZapisAsync(
        ZapisPublikaceAppky vstup, HttpContext ctx, AppDbContext db, IConfiguration config,
        TimeProvider cas, CancellationToken ct)
    {
        switch (ImportniToken.Over(ctx, config["Appka:Token"], VydaniAppkyEndpoints.Hlavicka))
        {
            case StavTokenu.Nenakonfigurovan:
                return Results.Problem(
                    "Zápis publikace není nakonfigurovaný.", statusCode: StatusCodes.Status503ServiceUnavailable);
            case StavTokenu.Nesedi:
                return Results.Unauthorized();
        }

        if (Chyba(vstup) is { } chyba) return Results.BadRequest(new { error = chyba });

        return Results.Ok(await UlozAsync(db, vstup, cas.GetUtcNow(), ct));
    }

    /// <summary>
    /// Co na zápisu nesedí, nebo <c>null</c>. Česky a po polích: volá to
    /// skript v CI a z holé čtyřistovky by se příčina hledala v logu serveru.
    /// </summary>
    public static string? Chyba(ZapisPublikaceAppky v)
    {
        if (v.Platforma is null || !VydaniAppkyEndpoints.Platformy.Contains(v.Platforma))
            return $"Platforma „{v.Platforma}“ není android ani ios.";
        // Kanál se porovnává s tím, co hlásí telefon. Publikace bez kanálu
        // neexistuje — prázdný ho smí mít jen telefon, který žádný nemá.
        if (string.IsNullOrEmpty(v.Kanal) || !VerzeAppky.TvarKanalu().IsMatch(v.Kanal))
            return $"Kanál musí být 1–{VerzeAppky.KanalNejvic} znaků z malých písmen, číslic a pomlčky.";
        if (v.Otisk is null || !VydaniAppkyEndpoints.Otisk().IsMatch(v.Otisk))
            return "Otisk musí být 1–64 znaků z písmen, číslic, tečky, pomlčky a podtržítka.";
        // Nulový identifikátor by se shodl s každým telefonem, který žádný
        // nehlásí — a ten by pak vypadal aktuálně.
        if (!Guid.TryParseExact(v.Aktualizace, "D", out var id) || id == Guid.Empty)
            return "Aktualizace musí být UUID ve tvaru 8-4-4-4-12.";
        if (v.Commit is not null && !VydaniAppkyEndpoints.Commit().IsMatch(v.Commit))
            return "Commit musí být hash z gitu.";
        return null;
    }

    /// <summary>
    /// Upsert podle přirozeného klíče. Čas prvního zápisu zůstává —
    /// opakované odeslání téže aktualizace není nová publikace.
    /// <para>
    /// <b>Souběh dvou stejných zápisů dopadne jako opakování.</b> Oba se
    /// zeptají, oba nic nenajdou a jeden narazí na unikátní index; pro CI by
    /// pětistovka znamenala červený krok nad publikací, která je v pořádku.
    /// </para>
    /// </summary>
    public static async Task<ZapisPublikaceAppkyVysledek> UlozAsync(
        AppDbContext db, ZapisPublikaceAppky v, DateTimeOffset ted, CancellationToken ct)
    {
        var aktualizace = Guid.ParseExact(v.Aktualizace, "D");
        var radek = await db.PublikaceAppky.FirstOrDefaultAsync(
            x => x.Platforma == v.Platforma && x.Kanal == v.Kanal && x.Otisk == v.Otisk
                 && x.Aktualizace == aktualizace, ct);

        if (radek is not null)
        {
            radek.Commit = v.Commit ?? radek.Commit;
            await db.SaveChangesAsync(ct);
            return new ZapisPublikaceAppkyVysledek(false);
        }

        db.PublikaceAppky.Add(new PublikaceAppky
        {
            Platforma = v.Platforma,
            Kanal = v.Kanal,
            Otisk = v.Otisk,
            Aktualizace = aktualizace,
            Commit = v.Commit,
            PublikovanoV = ted.ToUniversalTime(),
        });

        try
        {
            await db.SaveChangesAsync(ct);
            return new ZapisPublikaceAppkyVysledek(true);
        }
        catch (DbUpdateException e) when (e.InnerException is PostgresException
                                          {
                                              SqlState: PostgresErrorCodes.UniqueViolation,
                                          })
        {
            return new ZapisPublikaceAppkyVysledek(false);
        }
    }
}
