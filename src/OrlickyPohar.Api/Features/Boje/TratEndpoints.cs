using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>Důvod, proč rozhodčí vrací trať stavitelům.</summary>
public record VraceniTratiVstup(string? Duvod);

/// <summary>
/// Zkrácení trati: u kterého prvku je od teď cíl.
///
/// <para>
/// <b>Konkrétní prvek, ne jen „zkráceno"</b> (Filip, 15. 10. 2026:
/// *„jde-li o koeficient, tak musí být zkracování u konkrétního prvku,
/// aby se to dalo počítat; pokud jde pouze o třídy bez koeficientu, tak
/// je to jedno a čas je pouze informace o dojezdu"*). Uložit jen
/// příznak by stačilo pro dnešek a nestačilo ve chvíli, kdy se začne
/// počítat hendikep — a to je pozdě, protože data z odjetých regat už
/// se nedoplní.
/// </para>
/// </summary>
public record ZkraceniVstup(int Prvek);

/// <summary>
/// Stav trati: stavitelé hlásí hotovo, rozhodčí přijímá a zamyká, přestavba
/// odemyká.
///
/// <para>
/// <b>Kdo co smí</b> (Filip, 9. 10. 2026). Hlásit hotovo a odemknout na
/// přestavbu smí organizátor regaty i rozhodčí ročníku — trať přestavuje
/// pořadatel a na vodě nemá jak shánět rozhodčího. <b>Přijmout a vrátit smí
/// jen rozhodčí</b>: přijetí je to, co trať zveřejní, a tohle rozhodnutí je
/// jeho.
/// </para>
///
/// <para>
/// <b>Veřejná cesta tu pořád není.</b> Zveřejnění přijaté trati je další
/// krok a patří k němu výjimka v <c>OchranaCteniTests</c> i s důvodem —
/// dokud nevznikne, leží celá trať pod <c>/sprava/</c>.
/// </para>
/// </summary>
public static class TratEndpoints
{
    public static void MapTrat(this IEndpointRouteBuilder app)
    {
        // Veřejná cesta leží MIMO `/sprava/`, takže ji nekryje práh
        // přihlášení a rozhodnutí musí držet endpoint sám. Zapsané je to
        // i ve `VedomeVerejne` v `OchranaCteniTests`, i s důvodem.
        app.MapGet("/serie/{serie}/zavody/{zavod}/trat", VerejnaAsync)
            .Produces<VerejnaTratDto>()
            .WithTags("Bóje")
            .WithSummary("Trať regaty, jakmile ji rozhodčí přijal")
            .WithDescription(
                "Bez přihlášení. Nepřijatá trať se nevydává vůbec; u přestavby se vrací "
                + "jen příznak, že se trať přestavuje, a bóje se zamlčí.");

        var g = app.MapSpravu("/sprava/serie/{serie}/zastavky/{zavod}/trat");

        g.MapGet("/", StavAsync)
            .Produces<TratDto>()
            .WithTags("Bóje")
            .WithSummary("Stav trati regaty")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Vrací 404, dokud regata nemá "
                + "ani jednu bóji — stavba začíná prvním pípnutím, ne zvláštním knoflíkem.");

        g.MapPost("/hotovo", HotovoAsync)
            .Produces<TratDto>()
            .WithTags("Bóje")
            .WithSummary("Stavitelé hlásí, že trať stojí")
            .WithDescription("Organizátor regaty, nebo rozhodčí ročníku.");

        g.MapPost("/prijeti", PrijmiAsync)
            .Produces<TratDto>()
            .WithTags("Bóje")
            .WithSummary("Rozhodčí trať přijme, tím se zamkne a je veřejná")
            .WithDescription(
                "Jen rozhodčí ročníku. Zamčenou trať nejde přestavovat ani do ní pípat.");

        g.MapPost("/vraceni", VratAsync)
            .Produces<TratDto>()
            .WithTags("Bóje")
            .WithSummary("Rozhodčí vrátí trať stavitelům")
            .WithDescription("Jen rozhodčí ročníku. Důvod je povinný.");

        g.MapGet("/prvky", PrvkyAsync)
            .WithDescription(
                "Bez `trat` platí ta nejnovější; s ním právě ta vybraná. Cizí id "
                + "vrátí prázdný seznam, ne jinou trať — regata jich má víc a tiché "
                + "podstrčení jiné by si nikdo nevšiml.")
            .Produces<List<PrvekDto>>()
            .WithTags("Bóje")
            .WithSummary("Prvky trati v pořadí")
            .WithDescription("Organizátor regaty, nebo rozhodčí ročníku.");

        g.MapPost("/prvky", ZalozPrvekAsync)
            .Produces<PrvekDto>(StatusCodes.Status201Created)
            .WithTags("Bóje")
            .WithSummary("Založí prvek trati")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Do přijaté trati nejde — "
                + "prvek je rozhodnutí o trati, takže platí tentýž zámek jako u pípnutí.");

        g.MapPut("/prvky/{prvek:int}", UpravPrvekAsync)
            .Produces<PrvekDto>()
            .WithTags("Bóje")
            .WithSummary("Přepíše prvek trati")
            .WithDescription("Organizátor regaty, nebo rozhodčí ročníku. Do přijaté trati nejde.");

        g.MapDelete("/prvky/{prvek:int}", SmazPrvekAsync)
            .WithTags("Bóje")
            .WithSummary("Smaže prvek trati")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Prvek se maže doopravdy, "
                + "na rozdíl od bóje: není to měření, je to rozhodnutí.");

        g.MapGet("/seznam", SeznamAsync)
            .Produces<List<TratNaVyberDto>>()
            .WithTags("Bóje")
            .WithSummary("Tratě regaty na výběr")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Od nejnovější. "
                + "`jdePriradit` říká, jestli je trať volná — volná se přiřadí, "
                + "obsazená naklonuje.");

        g.MapGet("/rozjizdky", RozjizdkyAsync)
            .Produces<List<RozjizdkaNaVyberDto>>()
            .WithTags("Bóje")
            .WithSummary("Rozjížďky regaty na výběr")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Podle čísla. `tratId` říká, "
                + "která trať rozjížďce patří; `odstartovana` to, že se podle ní už jelo "
                + "a trať se jí nebere.");

        g.MapDelete("/{trat:int}/rozjizdka", OdvazAsync)
            .WithTags("Bóje")
            .WithSummary("V téhle rozjížďce se ta trať nejede")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Instance zmizí jen tehdy, "
                + "když stejný předpis zbyde u jiné rozjížďky; poslední se od rozjížďky "
                + "jen odváže a zůstane na stole, aby bylo co upravit. U odjeté trati "
                + "vrátí 409 a chce `?potvrzeno=true` — může to rozkopat výsledky.");

        g.MapDelete("/{trat:int}", ZahodAsync)
            .WithTags("Bóje")
            .WithSummary("Zahodí trať")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Přijatou trať zahodit nejde, "
                + "napřed ji musí vrátit rozhodčí. U odjeté vrátí 409 a chce "
                + "`?potvrzeno=true`. Záznamy bójí zůstávají — pořád stojí ve vodě.");

        g.MapPost("/{trat:int}/rozjizdka", PriradAsync)
            .Produces<TratDto>()
            .WithTags("Bóje")
            .WithSummary("Přiřadí volnou trať rozjížďce")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Obvyklý postup: nejdřív se "
                + "staví trať, pak se na ni založí rozjížďka. Trať, která už rozjížďce "
                + "patří, se přiřadit nedá — ta se klonuje.");

        g.MapPost("/{trat:int}/klon", KlonujAsync)
            .Produces<TratDto>(StatusCodes.Status201Created)
            .WithTags("Bóje")
            .WithSummary("Naklonuje trať pro další rozjížďku")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Kopíruje prvky na tytéž bóje — "
                + "žádná nová pípnutí. Výchozí stav klonu je `Hotovo`; `Prijato` smí "
                + "zvolit jen rozhodčí.");

        g.MapPost("/dalsi", DalsiAsync)
            .Produces<TratDto>(StatusCodes.Status201Created)
            .WithTags("Bóje")
            .WithSummary("Založí další, prázdnou trať regaty")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Pro další rozjížďku, která "
                + "se pojede jinudy — klon je od toho, když se jede stejně. Rozjížďka "
                + "se nepřiřazuje: dá se postavit napřed trať, nebo napřed vyhlásit "
                + "rozjížďku a stavět, zatímco lodě čekají. Opakované volání vrací "
                + "tutéž prázdnou trať, ne další.");

        g.MapPost("/{trat:int}/zkraceni", ZkratAsync)
            .WithTags("Bóje")
            .WithSummary("Rozhodčí zkrátí trať — cíl je od teď u zadaného prvku")
            .WithDescription(
                "Jen rozhodčí ročníku a jen u rozjížďky, která se jede. "
                + "Jde to i na přijaté trati: ve vodě se nic nemění, jen se část "
                + "přestane plout. Pořadí se počítá normálně.");

        g.MapDelete("/{trat:int}/zkraceni", ZrusZkraceniAsync)
            .WithTags("Bóje")
            .WithSummary("Rozhodčí zkrácení zruší — jede se zase celá trať")
            .WithDescription("Jen rozhodčí ročníku a jen dokud se rozjížďka jede.");

        g.MapPost("/prestavba", PrestavbaAsync)
            .Produces<TratDto>()
            .WithTags("Bóje")
            .WithSummary("Odemkne přijatou trať na přestavbu")
            .WithDescription(
                "Organizátor regaty, nebo rozhodčí ročníku. Veřejně to znamená „trať se "
                + "přestavuje, počkej\". Podle odjeté trati se už jelo, takže se nepřepíše — "
                + "vznikne nová a stará zůstane přijatá.");
    }

    /// <summary>
    /// Trať pro diváka. Filtr na publikaci je tentýž jako u veřejné zastávky;
    /// <b>na skrytých výsledcích ročníku nezávisí</b> — trať je informace
    /// o tom, kudy se pluje, ne výsledek.
    /// </summary>
    private static async Task<IResult> VerejnaAsync(
        string serie, string zavod, AppDbContext db, TratSprava sprava, CancellationToken ct)
    {
        var zavodId = await db.Zavody
            .Where(z => z.Slug == zavod && z.Publikovano
                        && z.Serie!.Slug == serie && z.Serie.Publikovano)
            .Select(z => (int?)z.Id)
            .FirstOrDefaultAsync(ct);

        if (zavodId is null) return Results.NotFound();

        return await sprava.VerejnaAsync(zavodId.Value, ct) is { } trat
            ? Results.Ok(trat)
            : Results.NotFound();
    }

    private static async Task<IResult> StavAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, TratSprava sprava,
        CancellationToken ct, int? trat = null)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        var stav = await sprava.StavAsync(
            rozsah!.ZavodId!.Value, true, await JeRozhodciAsync(kdo, rozsahy, rozsah, ct), ct,
            trat);

        return stav is null ? Results.NotFound() : Results.Ok(stav);
    }

    private static async Task<IResult> HotovoAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, TratSprava sprava,
        CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        return Odpoved(await sprava.HotovoAsync(
            rozsah!.ZavodId!.Value, await JeRozhodciAsync(kdo, rozsahy, rozsah, ct), ct));
    }

    private static async Task<IResult> PrijmiAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, TratSprava sprava,
        CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct, jenRozhodci: true);
        if (odpoved is not null) return odpoved;
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        return Odpoved(await sprava.PrijmiAsync(rozsah!.ZavodId!.Value, uzivatel, ct));
    }

    private static async Task<IResult> VratAsync(
        string serie, string zavod, VraceniTratiVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, TratSprava sprava, CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct, jenRozhodci: true);
        if (odpoved is not null) return odpoved;

        return Odpoved(await sprava.VratAsync(rozsah!.ZavodId!.Value, vstup.Duvod, ct));
    }

    private static async Task<IResult> DalsiAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, TratSprava sprava,
        CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        var trat = await sprava.DalsiAsync(
            rozsah!.ZavodId!.Value, await JeRozhodciAsync(kdo, rozsahy, rozsah, ct), ct);

        return Results.Created((string?)null, trat);
    }

    private static async Task<IResult> PrestavbaAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, TratSprava sprava,
        CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        return Odpoved(await sprava.PrestavbaAsync(
            rozsah!.ZavodId!.Value, await JeRozhodciAsync(kdo, rozsahy, rozsah, ct), ct));
    }

    private static async Task<IResult> SeznamAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, TratSprava sprava,
        CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        return Results.Ok(await sprava.SeznamAsync(rozsah!.ZavodId!.Value, ct));
    }

    private static async Task<IResult> RozjizdkyAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, TratSprava sprava,
        CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        return Results.Ok(await sprava.RozjizdkyAsync(rozsah!.ZavodId!.Value, ct));
    }

    private static async Task<IResult> OdvazAsync(
        string serie, string zavod, int trat, bool? potvrzeno, ClaimsPrincipal kdo,
        Rozsahy rozsahy, TratSprava sprava, CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        var (chyba, chcePotvrdit) = await sprava.OdvazAsync(
            rozsah!.ZavodId!.Value, trat, potvrzeno ?? false, ct);

        if (chyba is null) return Results.NoContent();

        // Potvrzení není chyba vstupu, a obrazovka to musí poznat bez čtení
        // textu: na 409 se ptá, na 400 jen hlásí.
        return chcePotvrdit
            ? Results.Conflict(new { error = chyba, potvrdit = true })
            : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> ZahodAsync(
        string serie, string zavod, int trat, bool? potvrzeno, ClaimsPrincipal kdo,
        Rozsahy rozsahy, TratSprava sprava, CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        var (chyba, chcePotvrdit) = await sprava.ZahodAsync(
            rozsah!.ZavodId!.Value, trat, potvrzeno ?? false, ct);

        if (chyba is null) return Results.NoContent();

        // Potvrzení není chyba vstupu, a obrazovka to musí poznat bez čtení
        // textu: na 409 se ptá, na 400 jen hlásí.
        return chcePotvrdit
            ? Results.Conflict(new { error = chyba, potvrdit = true })
            : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> ZkratAsync(
        string serie, string zavod, int trat, ZkraceniVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, TratSprava sprava, CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct, jenRozhodci: true);
        if (odpoved is not null) return odpoved;
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var chyba = await sprava.ZkratAsync(
            rozsah!.ZavodId!.Value, trat, vstup.Prvek, uzivatel, ct);

        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> ZrusZkraceniAsync(
        string serie, string zavod, int trat, ClaimsPrincipal kdo,
        Rozsahy rozsahy, TratSprava sprava, CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct, jenRozhodci: true);
        if (odpoved is not null) return odpoved;

        var chyba = await sprava.ZrusZkraceniAsync(rozsah!.ZavodId!.Value, trat, ct);
        return chyba is null ? Results.NoContent() : Results.BadRequest(new { error = chyba });
    }

    private static async Task<IResult> PriradAsync(
        string serie, string zavod, int trat, PriradTratVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, TratSprava sprava, CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        return Odpoved(await sprava.PriradAsync(
            rozsah!.ZavodId!.Value, trat, vstup.Rozjizdka,
            await JeRozhodciAsync(kdo, rozsahy, rozsah, ct), ct));
    }

    private static async Task<IResult> KlonujAsync(
        string serie, string zavod, int trat, KlonTratiVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, TratSprava sprava, CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var (novaTrat, chyba) = await sprava.KlonujAsync(
            rozsah!.ZavodId!.Value, trat, vstup, uzivatel,
            await JeRozhodciAsync(kdo, rozsahy, rozsah, ct), ct);

        return chyba is not null
            ? Results.BadRequest(new { error = chyba })
            : Results.Created((string?)null, novaTrat);
    }

    private static async Task<IResult> PrvkyAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, PrvkySprava prvky,
        CancellationToken ct, int? trat = null)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        return Results.Ok(await prvky.SeznamAsync(rozsah!.ZavodId!.Value, ct, trat));
    }

    private static async Task<IResult> ZalozPrvekAsync(
        string serie, string zavod, PrvekVstup vstup, ClaimsPrincipal kdo, Rozsahy rozsahy,
        PrvkySprava prvky, CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        // Autora značky, která z nebójového bodu vznikne, bere prvek odsud.
        // Dohledat ho z druhého konce by byla polopravda: prvek může zakládat
        // někdo jiný, než kdo tu bóji pípal.
        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var (prvek, chyba) = await prvky.ZalozAsync(
            rozsah!.ZavodId!.Value, vstup, uzivatel, ct);
        return chyba is not null
            ? Results.BadRequest(new { error = chyba })
            : Results.Created((string?)null, prvek);
    }

    private static async Task<IResult> UpravPrvekAsync(
        string serie, string zavod, int prvek, PrvekVstup vstup, ClaimsPrincipal kdo,
        Rozsahy rozsahy, PrvkySprava prvky, CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        if (await rozsahy.UzivatelIdAsync(kdo, ct) is not { } uzivatel) return Results.Forbid();

        var (upraveny, chyba) = await prvky.UpravAsync(
            rozsah!.ZavodId!.Value, prvek, vstup, uzivatel, ct);
        return chyba is not null ? Results.BadRequest(new { error = chyba }) : Results.Ok(upraveny);
    }

    private static async Task<IResult> SmazPrvekAsync(
        string serie, string zavod, int prvek, ClaimsPrincipal kdo, Rozsahy rozsahy,
        PrvkySprava prvky, CancellationToken ct)
    {
        var (rozsah, odpoved) = await RozsahAsync(serie, zavod, kdo, rozsahy, ct);
        if (odpoved is not null) return odpoved;

        return await prvky.SmazAsync(rozsah!.ZavodId!.Value, prvek, ct) is { } chyba
            ? Results.BadRequest(new { error = chyba })
            : Results.NoContent();
    }

    private static IResult Odpoved((TratDto? Trat, string? Chyba) vysledek) =>
        vysledek.Chyba is { } chyba
            ? Results.BadRequest(new { error = chyba })
            : Results.Ok(vysledek.Trat);

    /// <summary>
    /// Rozsah regaty i s právem na něj — nebo odpověď, kterou má endpoint
    /// vrátit. Pořadí je totéž jako u ostatních cest správy: nejdřív rozsah,
    /// pak právo, protože na právo se ptáme pro ten rozsah.
    /// </summary>
    private static async Task<(Rozsahy.Rozsah? Rozsah, IResult? Odpoved)> RozsahAsync(
        string serie, string zavod, ClaimsPrincipal kdo, Rozsahy rozsahy, CancellationToken ct,
        bool jenRozhodci = false)
    {
        if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { ZavodId: not null } rozsah)
            return (null, Results.NotFound());

        var smi = jenRozhodci
            ? await JeRozhodciAsync(kdo, rozsahy, rozsah, ct)
            : await StaviAsync(kdo, rozsahy, rozsah, ct);

        return smi ? (rozsah, null) : (null, Results.Forbid());
    }

    /// <summary>Kdo smí do trati sáhnout: organizátor regaty, nebo rozhodčí.</summary>
    private static async Task<bool> StaviAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        await rozsahy.SmiAsync(kdo, new Pozadavek(Role.Organizator, rozsah.SerieId, rozsah.ZavodId), ct)
        || await JeRozhodciAsync(kdo, rozsahy, rozsah, ct);

    private static Task<bool> JeRozhodciAsync(
        ClaimsPrincipal kdo, Rozsahy rozsahy, Rozsahy.Rozsah rozsah, CancellationToken ct) =>
        rozsahy.SmiAsync(kdo, new Pozadavek(Role.Rozhodci, rozsah.SerieId), ct);
}
