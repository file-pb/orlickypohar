using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;
using OrlickyPohar.Api.Features.Upozorneni;

namespace OrlickyPohar.Api.Features.Appka;

/// <summary>
/// Na čem jede flotila — jen pro správce celého webu.
/// <para>
/// <b>Proč za přihlášením a jen pro tuhle roli.</b> Řádek nese jméno účtu,
/// loď a jméno člena posádky; to nejsou výsledky závodů. Ptá se na to ten,
/// kdo za appku odpovídá — tentýž rozsah jako u nákladů.
/// </para>
/// </summary>
public static class FlotilaEndpoints
{
    private static readonly Pozadavek SpravceWebu = new(Role.Spravce, null);

    /// <summary>Kolik posledních publikací se vypíše. Na otázku „vyšla ta poslední?" stačí.</summary>
    public const int NejvicPublikaci = 50;

    public static void MapFlotila(this IEndpointRouteBuilder app)
    {
        app.MapGet("/sprava/flotila", FlotilaAsync)
            .RequireAuthorization()
            .WithTags("Správa")
            .Produces<FlotilaDto>()
            .Produces(StatusCodes.Status403Forbidden)
            .WithSummary("Na čem jede flotila: řádek na identitu a souhrn po druzích")
            .WithDescription(
                "Vyžaduje roli správce celého webu. Identita je klíč k účtu, klíč k lodi nebo " +
                "zařízení k upozorněním; jeden telefon jich může mít víc, proto se souhrn " +
                "nesčítá přes druhy. Stav se měří proti poslednímu vydanému balíčku platformy " +
                "a poslední publikované aktualizaci kanálu a otisku. Odebrané klíče se nevypisují.");

        app.MapGet("/sprava/flotila/publikace", PublikaceAsync)
            .RequireAuthorization()
            .WithTags("Správa")
            .Produces<List<PublikaceAppkyDto>>()
            .Produces(StatusCodes.Status403Forbidden)
            .WithSummary("Poslední publikované aktualizace appky")
            .WithDescription(
                $"Vyžaduje roli správce celého webu. Nejvýš {NejvicPublikaci} posledních, " +
                "od nejnovější. Zapisuje je CI přes POST /appka/publikace.");
    }

    private static async Task<IResult> FlotilaAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, AppDbContext db, CancellationToken ct)
    {
        if (!await rozsahy.SmiAsync(kdo, SpravceWebu, ct))
            return Results.Json(new { error = "Flotilu vidí jen správce celého webu." },
                statusCode: StatusCodes.Status403Forbidden);

        return Results.Ok(await NactiAsync(db, ct));
    }

    private static async Task<IResult> PublikaceAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, AppDbContext db, CancellationToken ct)
    {
        if (!await rozsahy.SmiAsync(kdo, SpravceWebu, ct))
            return Results.Json(new { error = "Publikace vidí jen správce celého webu." },
                statusCode: StatusCodes.Status403Forbidden);

        var publikace = await db.PublikaceAppky.AsNoTracking()
            .OrderByDescending(p => p.PublikovanoV).ThenByDescending(p => p.Id)
            .Take(NejvicPublikaci)
            .ToListAsync(ct);
        var balicky = await db.VydaniAppky.AsNoTracking().ToListAsync(ct);
        var vydano = new Vydano(balicky, []);

        return Results.Ok(publikace
            .Select(p => new PublikaceAppkyDto(
                p.Platforma, p.Kanal, p.Otisk, p.Aktualizace, p.Commit, p.PublikovanoV,
                vydano.CisloBalicku(p.Platforma, p.Otisk)))
            .ToList());
    }

    /// <summary>
    /// Celý přehled. Tři dotazy na identity, jeden na vydání a jeden na
    /// publikace — ten jen pro otisky, které flotila hlásí: starší otisky
    /// nikdo nenosí a jejich publikace by jen rostly.
    /// </summary>
    public static async Task<FlotilaDto> NactiAsync(AppDbContext db, CancellationToken ct)
    {
        // Odebraný klíč je mrtvá identita: za ním už žádný telefon nestojí.
        // Odepnutý klíč k lodi (`Sleduje == false`) naopak telefon dál má.
        var ucty = await db.KliceUctu.AsNoTracking()
            .Where(k => k.OdebranV == null)
            .Select(k => new Identita
            {
                Druh = DruhIdentityFlotily.Ucet,
                Id = k.Id,
                Hlavni = k.Uzivatel!.Zobrazovane,
                Upresneni = k.Zarizeni,
                AktivniV = k.OzvalSeV,
                VerzePlatforma = k.VerzePlatforma,
                VerzeOtisk = k.VerzeOtisk,
                VerzeAktualizace = k.VerzeAktualizace,
                VerzeKanal = k.VerzeKanal,
                VerzeSpusteni = k.VerzeSpusteni,
                VerzeCeka = k.VerzeCeka,
                VerzeOdV = k.VerzeOdV,
                VerzeHlasenaV = k.VerzeHlasenaV,
            })
            .ToListAsync(ct);

        var lode = await db.Klice.AsNoTracking()
            .Where(k => k.OdebranV == null)
            .Select(k => new Identita
            {
                Druh = DruhIdentityFlotily.Lod,
                Id = k.Id,
                Hlavni = k.Lod!.Nazev,
                Upresneni = k.Jmeno,
                AktivniV = k.PosledniPouzitiV,
                VerzePlatforma = k.VerzePlatforma,
                VerzeOtisk = k.VerzeOtisk,
                VerzeAktualizace = k.VerzeAktualizace,
                VerzeKanal = k.VerzeKanal,
                VerzeSpusteni = k.VerzeSpusteni,
                VerzeCeka = k.VerzeCeka,
                VerzeOdV = k.VerzeOdV,
                VerzeHlasenaV = k.VerzeHlasenaV,
            })
            .ToListAsync(ct);

        // Zařízení k upozorněním je bez účtu; o člověku za ním nevíme nic
        // a token je jeho identita, takže ven nejde. Zbývá platforma.
        var zarizeni = await db.Zarizeni.AsNoTracking()
            .Select(z => new Identita
            {
                Druh = DruhIdentityFlotily.Zarizeni,
                Id = z.Id,
                Hlavni = z.Platforma == PlatformaZarizeni.Ios ? "iOS" : "Android",
                AktivniV = z.NaposledyV,
                VerzePlatforma = z.VerzePlatforma,
                VerzeOtisk = z.VerzeOtisk,
                VerzeAktualizace = z.VerzeAktualizace,
                VerzeKanal = z.VerzeKanal,
                VerzeSpusteni = z.VerzeSpusteni,
                VerzeCeka = z.VerzeCeka,
                VerzeOdV = z.VerzeOdV,
                VerzeHlasenaV = z.VerzeHlasenaV,
            })
            .ToListAsync(ct);

        List<Identita> vsechny = [.. ucty, .. lode, .. zarizeni];
        var vydano = await NactiVydanoAsync(db, vsechny.Select(i => i.VerzeOtisk), ct);

        var radky = vsechny
            .Select(i => Radek(i, vydano))
            .OrderBy(r => r.Druh)
            .ThenBy(r => Zavaznost(r.Stav))
            .ThenByDescending(r => r.AktivniV ?? DateTimeOffset.MinValue)
            .ThenBy(r => r.Id)
            .ToList();

        var souhrn = Enum.GetValues<DruhIdentityFlotily>()
            .Select(druh =>
            {
                var r = radky.Where(x => x.Druh == druh).ToList();
                int Pocet(StavVerzeAppky s) => r.Count(x => x.Stav == s);
                return new FlotilaSouhrnDto(
                    druh, r.Count,
                    Pocet(StavVerzeAppky.Aktualni),
                    Pocet(StavVerzeAppky.StaryBalicek),
                    Pocet(StavVerzeAppky.StaraAktualizace),
                    Pocet(StavVerzeAppky.Nouzove),
                    Pocet(StavVerzeAppky.BezHlaseni));
            })
            .ToList();

        var balicky = vydano.PosledniBalicky
            .Select(b => new PosledniBalicekDto(b.Platforma, b.CisloBalicku, b.Otisk, b.VydanoV))
            .ToList();

        return new FlotilaDto(souhrn, radky, balicky);
    }

    /// <summary>
    /// Měřítko pro telefony s těmito otisky: všechna vydání (je jich
    /// jednotky) a publikace jen pro ty otisky. Bez jediného hlášení se
    /// nečte nic — stav „bez hlášení" měřítko nepotřebuje.
    /// </summary>
    public static async Task<Vydano> NactiVydanoAsync(
        AppDbContext db, IEnumerable<string?> otisky, CancellationToken ct)
    {
        var hlasene = otisky.OfType<string>().Distinct(StringComparer.Ordinal).ToList();
        if (hlasene.Count == 0) return new Vydano([], []);

        var balicky = await db.VydaniAppky.AsNoTracking().ToListAsync(ct);
        var publikace = await db.PublikaceAppky.AsNoTracking()
            .Where(p => hlasene.Contains(p.Otisk))
            .ToListAsync(ct);

        return new Vydano(balicky, publikace);
    }

    private static FlotilaRadekDto Radek(Identita i, Vydano vydano)
    {
        var verze = VerzeAppky.Z(i);

        return new FlotilaRadekDto(
            i.Druh,
            i.Id,
            string.IsNullOrWhiteSpace(i.Upresneni) ? i.Hlavni : $"{i.Hlavni} — {i.Upresneni}",
            i.VerzePlatforma,
            verze is null ? null : vydano.CisloBalicku(verze.Platforma, verze.Otisk),
            i.VerzeOtisk,
            i.VerzeKanal,
            i.VerzeSpusteni,
            i.VerzeAktualizace,
            i.VerzeCeka,
            i.VerzeOdV,
            i.VerzeHlasenaV,
            i.AktivniV,
            vydano.Stav(verze),
            verze is null ? null : vydano.PosledniBalicek(verze.Platforma)?.CisloBalicku,
            verze is null ? null : vydano.PosledniPublikace(verze.Platforma, verze.Kanal, verze.Otisk)?.Aktualizace);
    }

    /// <summary>
    /// Co patří nahoru. Rozbité dřív než zpožděné, zpožděné dřív než
    /// neznámé, a aktuální na konec — přehled se čte shora, dokud je co řešit.
    /// </summary>
    private static int Zavaznost(StavVerzeAppky stav) => stav switch
    {
        StavVerzeAppky.Nouzove => 0,
        StavVerzeAppky.StaryBalicek => 1,
        StavVerzeAppky.StaraAktualizace => 2,
        StavVerzeAppky.BezHlaseni => 3,
        _ => 4,
    };

    /// <summary>Společný tvar tří druhů identit, než se z něj stane řádek.</summary>
    private sealed class Identita : IHlasiVerzi
    {
        public DruhIdentityFlotily Druh { get; init; }
        public int Id { get; init; }
        public string Hlavni { get; init; } = "";
        public string? Upresneni { get; init; }
        public DateTimeOffset? AktivniV { get; init; }

        public string? VerzePlatforma { get; set; }
        public string? VerzeOtisk { get; set; }
        public Guid? VerzeAktualizace { get; set; }
        public string? VerzeKanal { get; set; }
        public SpusteniAppky? VerzeSpusteni { get; set; }
        public Guid? VerzeCeka { get; set; }
        public DateTimeOffset? VerzeOdV { get; set; }
        public DateTimeOffset? VerzeHlasenaV { get; set; }
    }
}
