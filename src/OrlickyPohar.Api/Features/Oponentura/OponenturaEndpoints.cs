using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Oponentura;

/// <summary>
/// Sady otázek pro oponenturu: rozhodčí odpovídá, pořadatel čte.
/// <para>
/// <b>Odpovídá rozhodčí ročníku, čte i pořadatel.</b> Je to týž střih jako
/// u směrnice (<c>SmerniceEndpoints.SmiAsync</c>), jen obráceně: tam obojí
/// smí zapisovat, tady má zápis jen rozhodčí. Sadu dostává on a jeho
/// odpověď je to, co v oponentuře váží — pořadatel ji má vidět, ale
/// odpovídat za něj nemá co.
/// </para>
/// <para>
/// <b>Zakládá sady správce ročníku</b> a jsou to data, ne kód: další sada
/// se přidá odesláním JSONu, bez nasazení. Chybí v oponentuře sezení
/// s čerstvým pořadatelem a bude to tentýž formát.
/// </para>
/// <para>
/// <b>Nahrávka se vydává odsud, ne z veřejné adresy úložiště.</b> Důvod je
/// u <see cref="HlasovaOdpoved"/>: hlas k neuzavřenému rozhodnutí není
/// určený ven.
/// </para>
/// </summary>
public static class OponenturaEndpoints
{
    public static void MapOponenturu(this IEndpointRouteBuilder app)
    {
        var g = app.MapSpravu("/sprava/serie/{serie}/oponentura");

        g.MapGet("/", SeznamAsync)
            .Produces<List<SadaShrnutiDto>>()
            .WithSummary("Vypíše sady otázek ročníku se stavem odpovědí")
            .WithDescription("Rozhodčí nebo pořadatel ročníku.");

        g.MapPost("/", ZalozAsync)
            .WithSummary("Založí sadu otázek, nebo doplní tu stávající")
            .WithDescription(
                "Správce ročníku. Idempotentní podle slugu sady a kódu otázky: "
                + "druhé odeslání téhož JSONu nic nezduplikuje a nic nemaže.");

        g.MapGet("/{sada}", DetailAsync)
            .Produces<SadaDetailDto>()
            .WithSummary("Sada i s tím, co na kterou otázku kdo odpověděl")
            .WithDescription(
                "Rozhodčí nebo pořadatel ročníku. Tudy se odpovědi čtou "
                + "i k pozdějšímu probrání — adresy nahrávek vedou na API.");

        g.MapPut("/{sada}/otazky/{kod}", OdpovezAsync)
            .WithSummary("Zapíše zaškrtnuté volby a text u jedné otázky")
            .WithDescription(
                "Rozhodčí ročníku. Přepisuje poslední stav; nic není povinné. "
                + "Odpověď po uzavření sady ji zase otevře.");

        g.MapPost("/{sada}/otazky/{kod}/nahravky", NahrajAsync)
            .Produces<NahravkaDto>(StatusCodes.Status201Created)
            .DisableAntiforgery()
            .WithSummary("Nahraje hlasovou odpověď k jedné otázce")
            .WithDescription(
                "Rozhodčí ročníku. Nejvýš 20 MB; formát se poznává z obsahu "
                + "(WebM, Ogg, MP4/AAC, WAV, MP3), protože každý telefon "
                + "nahrává jinak. Nahrávek u jedné otázky může být víc.");

        g.MapGet("/{sada}/nahravky/{id}", VydejNahravkuAsync)
            .WithSummary("Vydá obsah hlasové odpovědi")
            .WithDescription("Rozhodčí nebo pořadatel ročníku.");

        g.MapDelete("/{sada}/nahravky/{id}", SmazNahravkuAsync)
            .WithSummary("Smaže hlasovou odpověď")
            .WithDescription("Rozhodčí ročníku. Zmáčknutý mikrofon omylem se musí dát vzít zpět.");

        g.MapPost("/{sada}/dokonceni", DokonciAsync)
            .WithSummary("Řekne „mám to“, nebo to vezme zpátky")
            .WithDescription(
                "Rozhodčí ročníku. Spočítat to nejde — nic v sadě není povinné, "
                + "takže hotovou sadu od rozpracované odliší jen ten, kdo odpovídá.");
    }

    private static async Task<IResult> SeznamAsync(
        string serie, ClaimsPrincipal kdo,
        Rozsahy rozsahy, OponenturaSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (!await SmiCistAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        return Results.Ok(await sprava.SeznamAsync(rozsah.SerieId, uzivatel, ct));
    }

    private static async Task<IResult> DetailAsync(
        string serie, string sada, ClaimsPrincipal kdo,
        Rozsahy rozsahy, OponenturaSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (!await SmiCistAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var detail = await sprava.DetailAsync(rozsah.SerieId, serie, sada, uzivatel, ct);
        return detail is null ? Results.NotFound() : Results.Ok(detail);
    }

    private static async Task<IResult> OdpovezAsync(
        string serie, string sada, string kod, OdpovedVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, OponenturaSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (!await SmiOdpovidatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var chyba = await sprava.OdpovezAsync(rozsah.SerieId, sada, kod, vstup, uzivatel, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    /// <summary>
    /// <b>Soubor je samostatný parametr, zbytek formuláře jde vedle něj.</b>
    /// <c>IFormFile</c> schovaný uvnitř záznamu s <c>[FromForm]</c> se
    /// nenaveze a koncový bod vrátí 400 s prázdným tělem — na tom padlo
    /// osm nahrávacích koncových bodů na produkci (12. 10. 2026). Hlídá to
    /// <c>VazbaNahraniTests</c>.
    /// </summary>
    private static async Task<IResult> NahrajAsync(
        string serie, string sada, string kod,
        IFormFile? nahravka, [FromForm] int? sekund, ClaimsPrincipal kdo,
        Rozsahy rozsahy, OponenturaSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (!await SmiOdpovidatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        if (!sprava.Pripraveno)
            return Results.Json(new { error = Dotazovani.Vypnuto },
                statusCode: StatusCodes.Status503ServiceUnavailable);

        if (Dotazovani.ProcNejdeNahrat(nahravka?.Length ?? 0) is { } proc)
            return Results.BadRequest(new { error = proc });

        using var obsah = new MemoryStream();
        await nahravka!.CopyToAsync(obsah, ct);

        var (hotova, chyba) = await sprava.NahrajAsync(
            rozsah.SerieId, serie, sada, kod, obsah.ToArray(), sekund, uzivatel, ct);

        return chyba is not null
            ? Results.BadRequest(new { error = chyba })
            : Results.Created((string?)null, hotova);
    }

    private static async Task<IResult> VydejNahravkuAsync(
        string serie, string sada, Guid id, ClaimsPrincipal kdo,
        Rozsahy rozsahy, OponenturaSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (!await SmiCistAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        if (await sprava.NahravkaAsync(rozsah.SerieId, sada, id, ct) is not { } soubor)
            return Results.NotFound();

        // Neveřejná data: necachovat nikde po cestě. `enableRangeProcessing`
        // kvůli přehrávači, který si o kus nahrávky říká skokem.
        return Results.Stream(soubor.Obsah, soubor.Typ, enableRangeProcessing: true);
    }

    private static async Task<IResult> SmazNahravkuAsync(
        string serie, string sada, Guid id, ClaimsPrincipal kdo,
        Rozsahy rozsahy, OponenturaSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (!await SmiOdpovidatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();

        var chyba = await sprava.SmazNahravkuAsync(rozsah.SerieId, sada, id, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> DokonciAsync(
        string serie, string sada, DokonceniVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, OponenturaSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (!await SmiOdpovidatAsync(kdo, rozsahy, rozsah, ct)) return Results.Forbid();
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var chyba = await sprava.DokonciAsync(
            rozsah.SerieId, sada, vstup.Hotovo, uzivatel, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> ZalozAsync(
        string serie, SadaVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, OponenturaSprava sprava, CancellationToken ct)
    {
        if (await rozsahy.NajdiAsync(serie, null, ct) is not { } rozsah) return Results.NotFound();
        if (!await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Spravce, rozsah.SerieId), ct))
            return Results.Forbid();

        if (Zalozeni.ProcNejde(vstup) is { } chyba) return Results.BadRequest(new { error = chyba });

        var (slug, pridano, zmeneno) = await sprava.ZalozAsync(rozsah.SerieId, vstup, ct);
        return Results.Ok(new { slug, pridano, zmeneno });
    }

    /// <summary>Rozhodčí ročníku. Pořadatel sadu nedostal a odpovídat za něj nemá co.</summary>
    private static Task<bool> SmiOdpovidatAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);

    /// <summary>Rozhodčí ročníku, nebo pořadatel — ten odpovědi čte.</summary>
    private static async Task<bool> SmiCistAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct)
        || await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId), ct);
}

/// <summary>Zaškrtnutí „mám to“, nebo jeho zrušení.</summary>
public record DokonceniVstup(bool Hotovo);

/// <summary>
/// Pravidla zakládané sady. Čisté funkce, bez databáze — sada chodí jako
/// JSON od člověka a musí se poznat, co je v něm špatně, dřív než se uloží.
/// </summary>
public static class Zalozeni
{
    public const int NejvicOtazek = 100;
    public const int NejvicVoleb = 12;

    /// <summary>Proč sada nejde založit — nebo <c>null</c>, když jde.</summary>
    public static string? ProcNejde(SadaVstup vstup)
    {
        if (string.IsNullOrWhiteSpace(vstup.Slug)) return "Sada musí mít slug.";
        if (vstup.Slug.Trim().Length > Dotazovani.SlugNejvic)
            return $"Slug sady má nejvýš {Dotazovani.SlugNejvic} znaků.";
        if (vstup.Slug.Any(z => !char.IsAsciiLetterOrDigit(z) && z != '-'))
            return "Slug sady smí mít jen písmena bez diakritiky, číslice a pomlčky.";

        if (string.IsNullOrWhiteSpace(vstup.Nazev)) return "Sada musí mít název.";
        if (vstup.Nazev.Trim().Length > Dotazovani.NazevNejvic)
            return $"Název sady má nejvýš {Dotazovani.NazevNejvic} znaků.";
        if (vstup.Uvod?.Trim().Length > Dotazovani.UvodNejvic)
            return $"Úvod sady má nejvýš {Dotazovani.UvodNejvic} znaků.";

        if (vstup.Otazky is null || vstup.Otazky.Count == 0)
            return "Sada bez otázek nemá co posílat.";
        if (vstup.Otazky.Count > NejvicOtazek)
            return $"Sada může mít nejvýš {NejvicOtazek} otázek.";

        var kody = new HashSet<string>(StringComparer.Ordinal);
        foreach (var o in vstup.Otazky)
        {
            if (string.IsNullOrWhiteSpace(o.Kod)) return "Každá otázka musí mít kód.";
            var kod = o.Kod.Trim();
            if (kod.Length > Dotazovani.KodNejvic)
                return $"Kód otázky má nejvýš {Dotazovani.KodNejvic} znaků: {kod}";
            // Kód je přirozený klíč v sadě, takže dvakrát týž by znamenal,
            // že se druhá otázka tiše ztratí v doplnění.
            if (!kody.Add(kod)) return $"Kód otázky {kod} je v sadě dvakrát.";

            if (string.IsNullOrWhiteSpace(o.Text)) return $"Otázka {kod} nemá text.";
            if (o.Text.Trim().Length > Dotazovani.OtazkaNejvic)
                return $"Otázka {kod} má nejvýš {Dotazovani.OtazkaNejvic} znaků.";
            if (o.Vysvetleni?.Trim().Length > Dotazovani.VysvetleniNejvic)
                return $"Vysvětlení u otázky {kod} má nejvýš {Dotazovani.VysvetleniNejvic} znaků.";

            var volby = o.Volby ?? [];
            if (volby.Count > NejvicVoleb)
                return $"Otázka {kod} může mít nejvýš {NejvicVoleb} voleb.";

            var kodyVoleb = new HashSet<string>(StringComparer.Ordinal);
            foreach (var v in volby)
            {
                if (string.IsNullOrWhiteSpace(v.Kod) || string.IsNullOrWhiteSpace(v.Text))
                    return $"Volba u otázky {kod} musí mít kód i text.";
                if (!kodyVoleb.Add(v.Kod))
                    return $"Volba {v.Kod} je u otázky {kod} dvakrát.";
            }
        }

        return null;
    }
}
