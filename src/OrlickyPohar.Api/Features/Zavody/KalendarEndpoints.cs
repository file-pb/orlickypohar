using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Kalendář ročníku: zakládání zastávek, termíny a stavy.
/// <para>
/// <b>Rozhodčí vládne kalendáři, organizátor závodu.</b> Rozhodčí zastávku
/// založí, potvrdí termín a smí ji zrušit; teprve pak si ji přebírá její
/// pořadatel, vypíše ji a odjede. Je to rozdělení podle toho, kdo o čem
/// skutečně rozhoduje — termín v seriálu je věc rozhodčího, průběh závodu
/// věc pořadatele — a celé leží v <see cref="Kalendar"/>, ne rozeseté po
/// endpointech.
/// </para>
/// <para>
/// <b>Pořadatel se přiřazuje jménem.</b> Kalendář posílá text jako dřív
/// a záznam pořadatele se k němu najde, nebo založí — viz
/// <c>PoradateleSprava.PriradAsync</c>. Medailonek se upravuje jinde.
/// </para>
/// </summary>
public static class KalendarEndpoints
{
    public static void MapKalendar(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky");

        // Tvar odpovědi se říká ručně: handlery vracejí `IResult`, protože
        // se z nich chodí ven víc způsoby, a z toho dokument nic neodvodí.
        g.MapGet("/", PrehledAsync)
            .Produces<PrehledZastavekDto>()
            .WithSummary("Vypíše kalendář ročníku i s tím, co s ním přihlášený smí")
            .WithDescription(
                "Vyžaduje roli rozhodčího v ročníku, nebo organizátora aspoň na jedné " +
                "zastávce. Vypisuje celý ročník; co smí kdo změnit, nese každý řádek.");

        g.MapPost("/", ZalozAsync)
            .Produces<ZastavkaRadek>(StatusCodes.Status201Created)
            .WithSummary("Založí regatu v předběžném kalendáři")
            .WithDescription(
                "Rozhodčí ročníku. Adresa se odvodí z názvu. Nová regata je vždycky " +
                "plánovaná a nepublikovaná.");

        g.MapPut("/{zavod}", UpravAsync)
            .Produces<ZastavkaRadek>()
            .WithSummary("Uloží termín a údaje regaty")
            .WithDescription(
                "Rozhodčí ročníku. Adresa se nemění, ani když se změní název. Posun " +
                "termínu u potvrzené a dál zapíše původní datum.");

        // <b>Vypsání závodu</b> (nálezy R1, R8, R21). Vlastní cesta, ne
        // rozšíření úpravy termínu: termín je věc rozhodčího, kdežto
        // vypsání <b>vydává pořadatel</b> („Vydává ho pořadatel a uznává
        // rozhodčí", `Vypsani.Navrh`). Kdyby to viselo na téže bráně,
        // nemohl by pořadatel vyplnit vlastní dokument.
        g.MapPut("/{zavod}/vypsani", VypsaniAsync)
            .Produces<ZastavkaRadek>()
            .WithSummary("Uloží kolonky vypsání závodu")
            .WithDescription(
                "Pořadatel téhle regaty, nebo rozhodčí ročníku. Posílají se všechny "
                + "kolonky najednou a prázdná se maže — je to jediné místo, kde se "
                + "vypsání vyplňuje, takže překlep musí jít vzít zpět. Termínu, názvu "
                + "ani počtů do poháru se to netýká.");

        g.MapPost("/{zavod}/stav", StavAsync)
            .Produces<ZastavkaRadek>()
            .WithSummary("Posune regatu v jejím životním cyklu")
            .WithDescription(
                "Plánovaný → potvrzený (rozhodčí) → vypsaný → odjetý (organizátor), " +
                "nebo zrušený. Po jednom kroku, oběma směry.");

        g.MapPost("/{zavod}/publikace", PublikaceAsync)
            .Produces<ZastavkaRadek>()
            .WithSummary("Pustí regatu na veřejný web, nebo ji stáhne")
            .WithDescription("Správce ročníku. Publikace není stav, je to vlastní příznak.");
    }

    private static async Task<IResult> PrehledAsync(
        string serie, ClaimsPrincipal kdo, AppDbContext db,
        Rozsahy rozsahy, KalendarSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah)
            return Results.NotFound();

        if (await PohledAsync(kdo, rozsahy, rozsah.SerieId, ct) is not { } pohled)
            return Results.Forbid();

        var nazev = await db.Serie.Where(s => s.Id == rozsah.SerieId)
            .Select(s => s.Nazev).FirstAsync(ct);

        // Nápověda do formuláře: jednou na požadavek, ne u každé zastávky.
        var napovedy = await sprava.NapovedyAsync(rozsah.SerieId, ct);

        return Results.Ok(new PrehledZastavekDto(
            serie, nazev, pohled.SmiKalendar,
            (await sprava.VypisAsync(rozsah.SerieId, ct))
            .Select(z => pohled.Radek(z, napovedy))
            .ToList()));
    }

    private static async Task<IResult> ZalozAsync(
        string serie, ZastavkaVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, KalendarSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah)
            return Results.NotFound();

        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct))
            return Results.Forbid();

        var (zastavka, chyba) = await sprava.ZalozAsync(rozsah.SerieId, vstup, ct);
        if (chyba is not null) return Results.BadRequest(new { error = chyba });

        return Results.Created(
            $"/sprava/serie/{serie}/zastavky/{zastavka!.Slug}",
            await RadekAsync(kdo, rozsahy, sprava, zastavka, ct));
    }

    private static async Task<IResult> UpravAsync(
        string serie, string zavod, ZastavkaVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, KalendarSprava sprava, Upozorneni.UpozorneniSprava upozorneni,
        CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, rozsahy, sprava, ct) is not { } zastavka)
            return Results.NotFound();

        // Termín je věc rozhodčího, i když zastávku zrovna pořádá někdo jiný:
        // přesunout závod, na který je vypsané vypsání, není úprava závodu,
        // ale zásah do kalendáře ročníku.
        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, zastavka.SerieId), ct))
            return Results.Forbid();

        if (await sprava.UpravAsync(zastavka, vstup, ct, upozorneni) is { } chyba)
            return Results.BadRequest(new { error = chyba });

        return Results.Ok(await RadekAsync(kdo, rozsahy, sprava, zastavka, ct));
    }

    private static async Task<IResult> VypsaniAsync(
        string serie, string zavod, VypsaniKolonkyVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, KalendarSprava sprava, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, rozsahy, sprava, ct) is not { } zastavka)
            return Results.NotFound();

        // Pořadatel téhle zastávky, nebo rozhodčí ročníku. Správce oboje
        // pokrývá přes `Prava.Pokryva`, takže se neptá zvlášť.
        var smi = await rozsahy.SmiAsync(
                      kdo, new Pozadavek(Role.Organizator, zastavka.SerieId, zastavka.Id), ct)
                  || await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, zastavka.SerieId), ct);

        if (!smi) return Results.Forbid();

        if (await sprava.VypsaniAsync(zastavka, vstup, ct) is { } chyba)
            return Results.BadRequest(new { error = chyba });

        return Results.Ok(await RadekAsync(kdo, rozsahy, sprava, zastavka, ct));
    }

    private static async Task<IResult> StavAsync(
        string serie, string zavod, StavZastavkyVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, KalendarSprava sprava, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, rozsahy, sprava, ct) is not { } zastavka)
            return Results.NotFound();

        // Rozhoduje cílový stav: do potvrzeného a zrušeného se dostane
        // rozhodčí, do vypsaného a odjetého organizátor té zastávky.
        var pozadavek = new Pozadavek(Kalendar.KdoSmi(vstup.Stav), zastavka.SerieId, zastavka.Id);
        if (!await rozsahy.SmiAsync(kdo, pozadavek, ct)) return Results.Forbid();

        if (await sprava.PrepniStavAsync(zastavka, vstup.Stav, ct) is { } chyba)
            return Results.BadRequest(new { error = chyba });

        return Results.Ok(await RadekAsync(kdo, rozsahy, sprava, zastavka, ct));
    }

    private static async Task<IResult> PublikaceAsync(
        string serie, string zavod, PublikaceVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, KalendarSprava sprava, CancellationToken ct)
    {
        if (await NajdiAsync(serie, zavod, rozsahy, sprava, ct) is not { } zastavka)
            return Results.NotFound();

        // Rozhodčí říká „termín platí", správce „ať to vidí veřejnost" —
        // a to je jiné rozhodnutí, zejména u ročníku s vymyšlenými daty.
        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, zastavka.SerieId), ct))
            return Results.Forbid();

        await sprava.PublikujAsync(zastavka, vstup.Publikovano, ct);
        return Results.Ok(await RadekAsync(kdo, rozsahy, sprava, zastavka, ct));
    }

    private static async Task<Zavod?> NajdiAsync(
        string serie, string zavod, Rozsahy rozsahy, KalendarSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return null;
        return await sprava.NajdiAsync(rozsah.SerieId, zavod, ct);
    }

    /// <summary>
    /// Co přihlášený v tomhle ročníku smí. Zjišťuje se <b>jednou na
    /// požadavek</b>, ne u každého řádku: kalendář má devět zastávek a tři
    /// dotazy na práva u každé z nich jsou dvacet sedm cest do databáze za
    /// jedno zobrazení.
    /// </summary>
    private sealed record Pohled(
        bool SmiKalendar, bool SmiPublikovat, bool OrganizatorRocniku, IReadOnlyList<int> Zavody)
    {
        public ZastavkaRadek Radek(
            KalendarSprava.Zaznam zaznam,
            (string? Misto, string? Draha, TimeOnly? PosledniStart) napoveda = default)
        {
            var z = zaznam.Zavod;
            var organizator = OrganizatorRocniku || Zavody.Contains(zaznam.Id);

            var mozne = Kalendar.MozneZ(z.Stav, zaznam.VPoharu)
                .Where(na => Kalendar.KdoSmi(na) == Role.Rozhodci ? SmiKalendar : organizator)
                .ToList();

            // Větu dostane jen ten, kdo by ten krok jinak směl — komu se
            // tlačítko nenabízí kvůli právům, tomu není co vysvětlovat.
            var procNejdeZpet = organizator
                ? Kalendar.ProcNejdeZpetZOdjete(z.Stav, StavZavodu.Vypsany, zaznam.VPoharu)
                : null;

            return new ZastavkaRadek(
                z.Slug, z.Nazev, z.Datum, z.DatumKonce, z.Typ, z.Poradatel, z.Poradi,
                z.Stav, z.PuvodniDatum, z.Publikovano,
                SmiKalendar, SmiPublikovat, mozne, z.Druh,
                z.PoradatelZaznam?.Slug,
                // Totéž pravidlo jako `Medailonek.SmiUpravit`, jen pro jednu
                // zastávku: na ní samotné je organizátor, nebo ne.
                z.PoradatelZaznam is not null && (SmiKalendar || organizator),
                z.Vyhodnoceni,
                z.PocetSkrtu, z.KoeficientDoSerie, z.PosunDoSerie, z.ProcesniDej,
                z.UzaverkaPrihlasek, z.Startovne, z.PrvniVyzyvaciZnameni,
                z.DelkaProceduryMin,
                z.PoradatelZapisujeVysledky,
                z.UzavrenoAutomatemV,
                z.Draha, z.PosledniStartV, z.MistoKonani,
                napoveda.Misto, napoveda.Draha, napoveda.PosledniStart,
                procNejdeZpet);
        }
    }

    /// <summary>
    /// Vrací <c>null</c>, když přihlášený v ročníku nemá co pohledávat —
    /// tedy není ani rozhodčí, ani pořadatel jediné zastávky.
    /// </summary>
    private static async Task<Pohled?> PohledAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, int serieId, CancellationToken ct)
    {
        var smiKalendar = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, serieId), ct);
        var smiPublikovat = await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, serieId), ct);
        var (celyRocnik, zavody) = await rozsahy.KdeSmiAsync(kdo, Role.Organizator, serieId, ct);

        if (!smiKalendar && !celyRocnik && zavody.Count == 0) return null;

        return new Pohled(smiKalendar, smiPublikovat, celyRocnik, zavody);
    }

    /// <summary>Jeden řádek po zápisu — aby si obrazovka nemusela nový stav domýšlet.</summary>
    private static async Task<ZastavkaRadek> RadekAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, KalendarSprava sprava, Zavod zastavka,
        CancellationToken ct)
    {
        var pohled = await PohledAsync(kdo, rozsahy, zastavka.SerieId, ct)
                     ?? new Pohled(false, false, false, []);

        return pohled.Radek(
            await sprava.ZaznamAsync(zastavka, ct),
            await sprava.NapovedyAsync(zastavka.SerieId, ct));
    }
}
