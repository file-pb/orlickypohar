using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Smernice;
using OrlickyPohar.Api.Features.Poradatele;
// Řez i třída se jmenují stejně, takže se prosté `Bodovani` uvnitř sousedního
// jmenného prostoru rozumí jako název jmenného prostoru. Alias to rozsekne.
using Vypocet = OrlickyPohar.Api.Features.Bodovani.Bodovani;

namespace OrlickyPohar.Api.Features.Zavody;

public record VysledekDto(
    string Lod, string Kategorie, string? Kormidelnik,
    int? PoradiVCili, int? CasSekundy, KodVysledku? Kod);

public record RozjizdkaDto(
    int Cislo, DateTimeOffset? StartV, StavRozjizdky Stav, bool DoSerie,
    IReadOnlyList<VysledekDto> Vysledky);

/// <summary>
/// Loď, která na zastávku přijela — bez ohledu na to, jestli se už jelo.
/// U plánované zastávky je to jediné, co o ní jde říct: výsledky ještě
/// nejsou a seznam přihlášených lodí ano.
/// </summary>
public record UcastDto(
    string Lod,
    string Kategorie,
    string? Kormidelnik,
    // Přihlášená loď, kterou pořadatel ještě nepotvrdil. Zrušené se sem
    // nedostanou vůbec. Na konci a s výchozí hodnotou: změny API jsou jen
    // aditivní a appka na telefonu o poli neví.
    bool Potvrzena = true,
    // Vyloučená rozhodčím. Na stránce zůstává, protože má výsledky.
    bool Vyloucena = false);

/// <summary>Body lodi v jedné rozjížďce, už jako pořadí v její kategorii.</summary>
public record BodyVRozjizdceDto(int Cislo, int Body, bool Skrtnuto);

/// <summary>
/// Výsledek lodi v závodě: součet bodů z rozjížděk a pořadí v kategorii.
/// Vítěz závodu má jeden bod — do seriálu z toho jde pořadí, ne tenhle součet.
/// </summary>
public record VysledekZavoduDto(
    string Lod, string Kategorie, int Body, int Poradi,
    IReadOnlyList<BodyVRozjizdceDto> Rozjizdky);

public record ZavodDetailDto(
    string Slug, string Nazev, DateOnly Datum, DateOnly? DatumKonce,
    string? Typ, string? Poradatel, StavZavodu Stav, DateOnly? PuvodniDatum,
    int PocetSkrtu, Vyhodnoceni Vyhodnoceni, decimal KoeficientDoSerie,
    IReadOnlyList<RozjizdkaDto> Rozjizdky,
    IReadOnlyList<VysledekZavoduDto> Poradi,
    IReadOnlyList<UcastDto> Lode,
    // Celé pole dohromady, bez ohledu na kategorie. Vydává se vždycky,
    // ukázat ho je věc `Vyhodnoceni` — do poháru jdou dál body
    // z kategorií (Filip, 22. 9. 2026). Aditivně, na konci.
    IReadOnlyList<VysledekZavoduDto>? PoradiCelkem = null,
    // Komunitní akce má stránku jako zastávka, jen bez výsledků a pravidel.
    DruhZastavky Druh = DruhZastavky.Pohar,
    // Pořadatel i s webem, kontaktem a souřadnicemi. `Poradatel` výš zůstává
    // jako jméno pro appku, která o záznamu neví.
    PoradatelDto? Medailonek = null,
    // Ročník, který výsledky regat veřejně nevydává (Serie.VysledkyZavoduVerejne).
    // Bez tohohle příznaku vypadá odjetá regata jako plánovaná: prázdné
    // rozjížďky a prázdné pořadí, a čtenář nemá jak poznat rozdíl mezi
    // „nejelo se" a „neukazujeme to". Aditivně, výchozí false — starší
    // klienti o něm nevědí a nic se jim nemění.
    bool VysledkySkryte = false,
    // Plachetní směrnice vyvěšené u zastávky, od nejnovější verze. U regaty
    // je to povinný dokument a appka je oficiální vývěska, takže se vydává
    // veřejně a se všemi verzemi — co bylo vyvěšené, musí jít doložit.
    IReadOnlyList<SmerniceDto>? Smernice = null);

/// <summary>
/// Veřejné čtení jedné zastávky. Pravidla závodu (škrty, vyhodnocení,
/// koeficient) se vydávají spolu s výsledky schválně: bez nich se pořadí
/// nedá zkontrolovat a divák nemá jak poznat, proč se která rozjížďka
/// nepočítá.
/// <para>
/// Body počítá <b>server</b>. Vydávají se vedle výsledků, ne místo nich:
/// syrové pořadí z vody je pravda, body jsou z něj dopočítané.
/// </para>
/// </summary>
public static class ZavodEndpoints
{
    /// <summary>
    /// Náhradní kategorie pro výpočet celého pole. Prázdná schválně: je to
    /// klíč výpočtu, ne název, který by se někde ukázal.
    /// </summary>
    private const string CelePole = "";

    public static void MapZavody(this IEndpointRouteBuilder app)
    {
        app.MapGet("/serie/{serieSlug}/zavody/{slug}", DetailAsync)
            .WithTags("Závody")
            .WithSummary("Vrátí regatu s rozjížďkami a výsledky");
    }

    /// <summary>
    /// Kdo na zastávku přijel. U plánované zastávky je to jediný obsah, který
    /// stránka má — a u odjeté se z toho pozná loď, která přijela a nakonec
    /// nestartovala v žádné rozjížďce. U ročníku se skrytými výsledky je to
    /// zase jediné, co ze zastávky zbude.
    /// <para>
    /// Veřejně jen lodě, které jedou nebo jely (<c>Prihlasky.VerejneViditelna</c>,
    /// tady rozepsané, aby se dotaz přeložil do SQL). Požadavky, odhlášené
    /// a nepřijaté zůstávají jen pro pořadatele.
    /// </para>
    /// </summary>
    private static Task<List<UcastDto>> LodeAsync(AppDbContext db, int zavodId, CancellationToken ct) =>
        db.Ucasti
            .Where(u => u.ZavodId == zavodId
                        && (u.Stav == StavUcasti.Prihlasena || u.Stav == StavUcasti.Potvrzena
                            || u.Stav == StavUcasti.Vyloucena))
            .OrderBy(u => u.Prihlaska!.Kategorie!.Poradi).ThenBy(u => u.Prihlaska!.Lod!.Nazev)
            .Select(u => new UcastDto(
                u.Prihlaska!.Lod!.Nazev,
                u.Prihlaska.Kategorie!.Nazev,
                u.Kormidelnik == null ? null : u.Kormidelnik.Jmeno + " " + u.Kormidelnik.Prijmeni,
                u.Stav != StavUcasti.Prihlasena,
                u.Stav == StavUcasti.Vyloucena))
            .ToListAsync(ct);

    /// <summary>
    /// Vyvěšené směrnice zastávky, od nejnovější. Bez úložiště prázdné.
    /// <para>
    /// <b>Stažené verze se nevydávají vůbec</b>, ne jen bez adresy: appka
    /// zůstává lidem na telefonech a starší verze klienta by o stažení
    /// nevěděla. Odkaz na odvolaný dokument je to jediné, co se tu stát
    /// nesmí; že verze zmizela z vývěsky, je vidět ve správě i v historii
    /// (oponentura, 5. 10. 2026).
    /// </para>
    /// </summary>
    private static async Task<List<SmerniceDto>> SmerniceAsync(
        AppDbContext db, IUloziste uloziste, int zavodId, CancellationToken ct)
    {
        var smernice = await db.Smernice
            .Include(s => s.Vyvesil)
            .Where(s => s.ZavodId == zavodId && s.StazenoV == null)
            .OrderByDescending(s => s.Verze)
            .ToListAsync(ct);

        return [.. smernice.Select(s => Vyveseni.Dto(s, uloziste.VerejnaAdresa)).OfType<SmerniceDto>()];
    }

    private static async Task<Results<Ok<ZavodDetailDto>, NotFound>> DetailAsync(
        string serieSlug, string slug, AppDbContext db, IUloziste uloziste, CancellationToken ct)
    {
        var zavod = await db.Zavody
            .Where(z => z.Slug == slug && z.Publikovano
                        && z.Serie!.Slug == serieSlug && z.Serie.Publikovano)
            .Select(z => new
            {
                z.Id, z.SerieId, z.Slug, z.Nazev, z.Datum, z.DatumKonce, z.Typ, z.Poradatel,
                z.Stav, z.PuvodniDatum, z.PocetSkrtu, z.Vyhodnoceni, z.KoeficientDoSerie,
                z.Druh, z.PoradatelZaznam, FotkaPoradatele = z.PoradatelZaznam!.Fotka,
                VysledkyVerejne = z.Serie!.VysledkyZavoduVerejne,
            })
            .FirstOrDefaultAsync(ct);

        if (zavod is null) return TypedResults.NotFound();

        // Ročník, který výsledky regat veřejně nevydává: stránka zastávky
        // zůstane — termín, pořadatel, kdo přijel — ale rozjížďky a pořadí
        // se nevydají. Zkratka je tu schválně nahoře, ne filtr v dotazech
        // níž: kdyby se čísla načetla a teprve pak zahodila, stačilo by
        // jedno nedopatření v projekci a byla by venku.
        if (!zavod.VysledkyVerejne)
        {
            var kdoPrijel = await LodeAsync(db, zavod.Id, ct);
            var smerniceSkryte = await SmerniceAsync(db, uloziste, zavod.Id, ct);
            return TypedResults.Ok(new ZavodDetailDto(
                zavod.Slug, zavod.Nazev, zavod.Datum, zavod.DatumKonce, zavod.Typ, zavod.Poradatel,
                zavod.Stav, zavod.PuvodniDatum, zavod.PocetSkrtu, zavod.Vyhodnoceni,
                zavod.KoeficientDoSerie, [], [], kdoPrijel, [], zavod.Druh,
                zavod.PoradatelZaznam is null
                    ? null
                    : PoradateleSprava.Dto(zavod.PoradatelZaznam, zavod.FotkaPoradatele, uloziste.VerejnaAdresa),
                VysledkySkryte: true,
                Smernice: smerniceSkryte));
        }

        // Jeden dotaz na všechny výsledky závodu, ne dotaz na rozjížďku.
        // Rozjížděk bývá osm a lodí dvacet — N+1 by tu bylo osm zbytečných cest.
        //
        // Jen publikované: dokud správce výsledky nepustí ven, rozjížďka na
        // stránce je (jelo se), ale čísla u ní ne. Prázdná rozjížďka je
        // pravda, nepotvrzené pořadí by pravda být nemuselo.
        var radky = await db.Vysledky
            .Where(v => v.Rozjizdka!.ZavodId == zavod.Id && v.Rozjizdka.Publikovano)
            .OrderBy(v => v.Rozjizdka!.Cislo)
            .ThenBy(v => v.PoradiVCili ?? int.MaxValue)
            .Select(v => new
            {
                v.Rozjizdka!.Cislo,
                v.Rozjizdka.StartV,
                v.Rozjizdka.Stav,
                v.Rozjizdka.DoSerie,
                Lod = v.Ucast!.Prihlaska!.Lod!.Nazev,
                Kategorie = v.Ucast.Prihlaska.Kategorie!.Nazev,
                Kormidelnik = v.Ucast.Kormidelnik == null
                    ? null
                    : v.Ucast.Kormidelnik.Jmeno + " " + v.Ucast.Kormidelnik.Prijmeni,
                v.PoradiVCili,
                v.NamerenyCas,
                v.Kod,
            })
            .ToListAsync(ct);

        var lode = await LodeAsync(db, zavod.Id, ct);

        // Seznam rozjížděk se bere z rozjížděk, ne z výsledků: rozjížďka bez
        // jediného zapsaného řádku i ta s nepublikovanými čísly na stránce
        // být má, jen prázdná. Eliminovaná ne — ta neplatí nikde.
        var vsechny = await db.Rozjizdky
            .Where(r => r.ZavodId == zavod.Id && r.StavVysledku != StavVysledku.Eliminovano)
            .OrderBy(r => r.Cislo)
            .Select(r => new { r.Cislo, r.StartV, r.Stav, r.DoSerie })
            .ToListAsync(ct);

        var podleCisla = radky.GroupBy(r => r.Cislo).ToDictionary(g => g.Key, g => g.ToList());

        var rozjizdky = vsechny
            .Select(r => new RozjizdkaDto(r.Cislo, r.StartV, r.Stav, r.DoSerie,
            [
                .. podleCisla.GetValueOrDefault(r.Cislo, []).Select(v => new VysledekDto(
                    v.Lod, v.Kategorie, v.Kormidelnik, v.PoradiVCili,
                    v.NamerenyCas == null ? null : (int)v.NamerenyCas.Value.TotalSeconds,
                    v.Kod)),
            ]))
            .ToList();

        // Kódy mají přihlášených do závodu + 1 (A5.2), takže je potřeba
        // vědět, kolik lodí přihlášených je — i těch, co nepřijely.
        var prihlaseno = await db.Ucasti
            .Where(u => u.ZavodId == zavod.Id && Vypocet.PrihlasenaDoZavodu.Contains(u.Stav))
            .GroupBy(u => u.Prihlaska!.Kategorie!.Nazev)
            .Select(g => new { Kategorie = g.Key, Pocet = g.Count() })
            .ToDictionaryAsync(x => x.Kategorie, x => x.Pocet, ct);

        // Do bodů jde všechno, co se v závodě odjelo a je venku — příznak
        // `DoSerie` rozhoduje o poháru, ne o výsledku závodu.
        var poradi = Vypocet.VysledkyZavodu(
        [
            .. rozjizdky.Select(r => new RozjizdkaVstup(r.Cislo,
                [.. r.Vysledky.Select(v => new VysledekVstup(v.Lod, v.Kategorie, v.PoradiVCili, v.Kod))])),
        ], zavod.PocetSkrtu, prihlaseno);

        // Kategorie se řadí podle série, ne podle toho, v jakém pořadí je
        // vrátila databáze. Abecedně by Nad7m předběhlo Race bez důvodu
        // a klienti by to museli dorovnávat každý sám.
        var poradiKategorii = await db.Kategorie
            .Where(k => k.SerieId == zavod.SerieId)
            .ToDictionaryAsync(k => k.Nazev, k => k.Poradi, ct);

        poradi = [.. poradi
            .OrderBy(v => poradiKategorii.GetValueOrDefault(v.Kategorie, int.MaxValue))
            .ThenBy(v => v.Poradi)];

        // Celé pole dohromady: tentýž výpočet, jen kategorie je jedna pro
        // všechny. Nejde o jiné pravidlo, jen o jiné seskupení — vítěz
        // dlouhé regaty se vyhlašuje napříč kategoriemi.
        var celePole = Vypocet.VysledkyZavodu(
        [
            .. rozjizdky.Select(r => new RozjizdkaVstup(r.Cislo,
                [.. r.Vysledky.Select(v => new VysledekVstup(v.Lod, CelePole, v.PoradiVCili, v.Kod))])),
        ], zavod.PocetSkrtu, new Dictionary<string, int> { [CelePole] = prihlaseno.Values.Sum() });

        // Kategorie lodi zůstává k zobrazení, i když se pořadí počítá bez ní.
        var kategorieLodi = rozjizdky
            .SelectMany(r => r.Vysledky)
            .GroupBy(v => v.Lod)
            .ToDictionary(g => g.Key, g => g.First().Kategorie);

        return TypedResults.Ok(new ZavodDetailDto(
            zavod.Slug, zavod.Nazev, zavod.Datum, zavod.DatumKonce, zavod.Typ, zavod.Poradatel,
            zavod.Stav, zavod.PuvodniDatum, zavod.PocetSkrtu, zavod.Vyhodnoceni, zavod.KoeficientDoSerie,
            rozjizdky,
            [.. poradi.Select(v => new VysledekZavoduDto(
                v.Lod, v.Kategorie, v.Body, v.Poradi,
                [.. v.Rozjizdky.Select(b => new BodyVRozjizdceDto(b.Cislo, b.Body, b.Skrtnuto))]))],
            lode,
            [.. celePole.OrderBy(v => v.Poradi).Select(v => new VysledekZavoduDto(
                v.Lod, kategorieLodi.GetValueOrDefault(v.Lod, ""), v.Body, v.Poradi,
                [.. v.Rozjizdky.Select(b => new BodyVRozjizdceDto(b.Cislo, b.Body, b.Skrtnuto))]))],
            zavod.Druh,
            zavod.PoradatelZaznam is null
                ? null
                : PoradateleSprava.Dto(zavod.PoradatelZaznam, zavod.FotkaPoradatele, uloziste.VerejnaAdresa),
            Smernice: await SmerniceAsync(db, uloziste, zavod.Id, ct)));
    }
}
