using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Rozjížďka tak, jak ji vidí pořadatel, rozhodčí nebo správce: kam došel
/// zápis výsledků a co se s ním dá udělat.
/// <para>
/// Nabídku stavů počítá server, stejně jako u kalendáře — kdyby si ji
/// obrazovka odvozovala sama, rozejde se to při první změně pravidla
/// a člověk dostane „nemáš práva“ na tlačítko, které mu web sám nabídl.
/// </para>
/// </summary>
public record RozjizdkaSpravaRadek(
    int Cislo,
    DateTimeOffset? StartV,
    StavRozjizdky Stav,
    bool DoSerie,
    StavVysledku StavVysledku,
    bool Publikovano,
    string? DuvodRevize,
    int PocetVysledku,
    bool SmiPublikovat,
    IReadOnlyList<StavVysledku> MozneStavy,
    // Na konci, ne vedle ostatních „smí": změny API jsou jen aditivní
    // a klient, který pole nezná, ho má jen přeskočit.
    bool SmiZapisovat = false,
    // Smí ten, kdo se dívá, rozjížďku zařadit do poháru nebo ji z něj
    // vyndat? Závisí na roli i na tom, jestli jsou čísla podepsaná.
    bool SmiDoPoharu = false);

public record PrehledVysledkuDto(
    string Serie,
    string SerieNazev,
    string Zavod,
    string ZavodNazev,
    StavZavodu StavZavodu,
    bool ZavodPublikovan,
    IReadOnlyList<RozjizdkaSpravaRadek> Rozjizdky,
    bool SmiPridatRozjizdku = false);

/// <summary>
/// Zastávka v rozcestníku výsledků. Čísla stačí sečtená: odsud se vybírá,
/// kam jít, ne co udělat.
/// </summary>
public record ZastavkaVysledkyDto(
    string Zavod,
    string Nazev,
    DateOnly Datum,
    StavZavodu Stav,
    int PocetRozjizdek,
    int Publikovanych,
    int KRevizi);

public record StavVysledkuVstup(StavVysledku Stav, string? Duvod = null);

/// <summary>
/// Čtení a zápis workflow výsledků.
/// <para>
/// <b>Zapisování samotných výsledků tu není</b>, leží v <see cref="ZapisSprava"/>.
/// Workflow se ptá na jinou otázku — kdo za ta čísla ručí a smí je vidět
/// veřejnost — a zápis se ptá, co se stalo na vodě.
/// </para>
/// <para>
/// <b>Rozjížďka předaná do zápisových metod musí pocházet z téhož
/// požadavku.</b> Entita z jiného <c>DbContext</c> není sledovaná
/// a uložení tiše neudělá nic.
/// </para>
/// </summary>
public class VysledkySprava(AppDbContext db)
{
    /// <summary>Zastávky ročníku s počty. Řadí se jako kalendář. Komunitní akce výsledky nemají.</summary>
    public Task<List<ZastavkaVysledkyDto>> ZastavkyAsync(int serieId, CancellationToken ct) =>
        db.Zavody
            .Where(z => z.SerieId == serieId && z.Druh == DruhZastavky.Pohar)
            .OrderBy(z => z.Poradi).ThenBy(z => z.Datum)
            .Select(z => new ZastavkaVysledkyDto(
                z.Slug, z.Nazev, z.Datum, z.Stav,
                z.Rozjizdky.Count,
                z.Rozjizdky.Count(r => r.Publikovano),
                z.Rozjizdky.Count(r => r.StavVysledku == StavVysledku.KRevizi)))
            .ToListAsync(ct);

    /// <summary>Rozjížďky zastávky i s počtem zapsaných výsledků.</summary>
    public async Task<List<(Rozjizdka Rozjizdka, int PocetVysledku)>> RozjizdkyAsync(
        int zavodId, CancellationToken ct)
    {
        var rozjizdky = await db.Rozjizdky
            .Where(r => r.ZavodId == zavodId)
            .OrderBy(r => r.Cislo)
            .ToListAsync(ct);

        var pocty = await db.Vysledky
            .Where(v => v.Rozjizdka!.ZavodId == zavodId)
            .GroupBy(v => v.RozjizdkaId)
            .Select(g => new { RozjizdkaId = g.Key, Pocet = g.Count() })
            .ToDictionaryAsync(x => x.RozjizdkaId, x => x.Pocet, ct);

        return [.. rozjizdky.Select(r => (r, pocty.GetValueOrDefault(r.Id, 0)))];
    }

    public Task<Rozjizdka?> NajdiAsync(int zavodId, int cislo, CancellationToken ct) =>
        db.Rozjizdky.FirstOrDefaultAsync(r => r.ZavodId == zavodId && r.Cislo == cislo, ct);

    /// <summary>
    /// Posune výsledky rozjížďky. Vrací text chyby, nebo <c>null</c>.
    /// <para>
    /// <b>Důvod revize se nemaže při dalším posunu.</b> Zůstává u rozjížďky,
    /// dokud ho nepřepíše nové vrácení — kdo opravuje zápis, potřebuje ho
    /// vidět i potom, co ho vrátil do návrhu.
    /// </para>
    /// </summary>
    public async Task<string?> PrepniStavAsync(
        Rozjizdka rozjizdka, StavVysledku na, string? duvod, bool spravce, CancellationToken ct)
    {
        if (Workflow.ProcNejde(rozjizdka.StavVysledku, na, spravce) is { } chyba) return chyba;
        if (Workflow.ProcNejdeBezDuvodu(na, duvod) is { } bezDuvodu) return bezDuvodu;

        if (na == StavVysledku.KRevizi) rozjizdka.DuvodRevize = duvod!.Trim();

        rozjizdka.StavVysledku = na;
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Pustí výsledky ven, nebo je stáhne. <b>Publikace není stav</b>:
    /// potvrzený výsledek smí zůstat neveřejný a publikovaný se smí vrátit
    /// k revizi, aniž by se publikace ztratila.
    /// </summary>
    public async Task PublikujAsync(Rozjizdka rozjizdka, bool publikovano, CancellationToken ct)
    {
        rozjizdka.Publikovano = publikovano;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Zařadí rozjížďku do poháru, nebo ji z něj vyndá. Výsledku závodu se
    /// to netýká — ten se počítá ze všech odjetých rozjížděk.
    /// </summary>
    public async Task DoSerieAsync(Rozjizdka rozjizdka, bool doSerie, CancellationToken ct)
    {
        rozjizdka.DoSerie = doSerie;
        await db.SaveChangesAsync(ct);
    }
}
