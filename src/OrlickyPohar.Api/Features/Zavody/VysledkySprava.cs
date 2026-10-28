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
    bool SmiDoPoharu = false,
    // Má rozjížďka fotku papírového zápisu? Samotná fotka je až v zápisu.
    bool MaPapir = false);

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
/// Zastávka v rozcestníku výsledků.
/// <para>
/// <b>Čísla rozjížděk, ne jen počty</b> (Filip, 20. 10. 2026: *„tyhle tři
/// tlačítka vypadá že dělají asi to samé"*). Vypadala, protože to dělala:
/// každá dlaždice v „co teď" vedla na tentýž seznam výsledků regaty, i když
/// slibovala jinou práci. Aby mohla pustit rovnou do té rozjížďky, která
/// čeká, musí rozcestník vědět <b>která to je</b> — dřív dostával jen
/// kolik jich je. Počet se z toho spočítá; opačně ne.
/// </para>
/// <para>
/// <b>Proč tu jsou čtyři počty a ne dva.</b> Rozcestník z nich skládá
/// „co teď", a podepsat čísla je jiná práce než pustit je ven — i když
/// od 27. 10. 2026 dělá obojí rozhodčí. Dokud se počítalo jen
/// nepublikované, rozjížďka, která <b>už venku byla</b> a jen prošla
/// revizí, rozhodčímu nikde nenaskočila — pořadatel mu ji předal a on se
/// to nedozvěděl (průchod scénářem D3, 8. 10. 2026).
/// </para>
/// </summary>
/// <param name="KRevizi">
/// Čísla rozjížděk, které čekají na pořadatele: vrácené s důvodem.
/// </param>
/// <param name="KPodpisu">
/// Čísla těch, co čekají na podpis rozhodčího: zapsané nebo ověřené.
/// Publikace do toho nemluví — veřejná rozjížďka může na podpis čekat
/// zrovna tak.
/// <para>
/// <b>Schválené sem od 27. 10. 2026 nepatří.</b> Dokud pouštěl ven správce,
/// znamenalo „ještě ne potvrzené“ taky „ještě nehotové“ a schválená
/// rozjížďka tu seděla správně. Jenže větu o ní četl rozhodčí — „čeká na
/// tvůj podpis“ u čísel, která sám před chvílí podepsal. Teď je schválená
/// rozjížďka v <paramref name="KPublikaci"/>, kde na něj doopravdy čeká.
/// </para>
/// </param>
/// <param name="KPublikaci">
/// Čísla podepsaných, které přesto nejsou venku: schválené nebo potvrzené.
/// Od 27. 10. 2026 je pouští <b>rozhodčí</b>
/// (<see cref="Workflow.KdoSmiPublikovat"/>).
/// <para>
/// <b>Co tím zůstalo bez upomínky:</b> schválená rozjížďka, která už venku
/// je a čeká jen na správcovo <c>Potvrzeno</c>. Je to archivní zámek
/// („konečné, dál se needituje“), ne práce, kvůli které se někam spěchá —
/// a správce ji na obrazovce výsledků vidí.
/// </para>
/// </param>
public record ZastavkaVysledkyDto(
    string Zavod,
    string Nazev,
    DateOnly Datum,
    StavZavodu Stav,
    int PocetRozjizdek,
    int Publikovanych,
    IReadOnlyList<int> KRevizi,
    IReadOnlyList<int> KPodpisu,
    IReadOnlyList<int> KPublikaci);

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
public class VysledkySprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>Zastávky ročníku s počty. Řadí se jako kalendář. Komunitní akce výsledky nemají.</summary>
    public Task<List<ZastavkaVysledkyDto>> ZastavkyAsync(int serieId, CancellationToken ct) =>
        db.Zavody
            .Where(z => z.SerieId == serieId && z.Druh == DruhZastavky.Pohar)
            .OrderBy(z => z.Poradi).ThenBy(z => z.Datum)
            // Čísla se řadí vzestupně: dlaždice z nich bere tu první, a to
            // má být nejnižší nedodělaná rozjížďka, ne náhodná.
            .Select(z => new ZastavkaVysledkyDto(
                z.Slug, z.Nazev, z.Datum, z.Stav,
                z.Rozjizdky.Count,
                z.Rozjizdky.Count(r => r.Publikovano),
                z.Rozjizdky
                    .Where(r => r.StavVysledku == StavVysledku.KRevizi)
                    .OrderBy(r => r.Cislo).Select(r => r.Cislo).ToList(),
                z.Rozjizdky
                    .Where(r => r.StavVysledku == StavVysledku.Navrzeno
                                || r.StavVysledku == StavVysledku.Overeno)
                    .OrderBy(r => r.Cislo).Select(r => r.Cislo).ToList(),
                z.Rozjizdky
                    .Where(r => (r.StavVysledku == StavVysledku.Schvaleno
                                 || r.StavVysledku == StavVysledku.Potvrzeno)
                                && !r.Publikovano)
                    .OrderBy(r => r.Cislo).Select(r => r.Cislo).ToList()))
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

        // <b>Zrušená rozjížďka se musí poznat i na vodě, ne jen v zápisu.</b>
        // Eliminace a zrušení jsou dvě strany téhož: rozjížďka, která
        // neplatí nikde, se nejede. Do 16. 10. 2026 se `Stav` neměnil,
        // takže `StavRozjizdky.Zrusena` nenastal nikdy a semafor na tabuli
        // svítil zeleně i u rozjížďky, kterou rozhodčí vyndal.
        //
        // Drží se to tady, u jediného přechodu stavu, schválně: druhá
        // cesta k témuž by se s touhle rozešla při první změně.
        if (na == StavVysledku.Eliminovano)
            rozjizdka.Stav = StavRozjizdky.Zrusena;
        else if (rozjizdka.StavVysledku == StavVysledku.Eliminovano)
            rozjizdka.Stav = await StavPodleZapisuAsync(rozjizdka, ct);

        rozjizdka.StavVysledku = na;
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Kam rozjížďka patří, když přestala být zrušená: podle toho, jestli
    /// odstartovala a jestli mají všechny lodě na vodě výsledek. Počítá to
    /// <see cref="Zapis.StavPoZapisu"/>, tedy tatáž funkce jako po uložení
    /// zápisu — jiný dopočet by se s ní rozešel.
    /// <para>
    /// Vychází se z <see cref="StavRozjizdky.Planovana"/>, protože
    /// <c>StavPoZapisu</c> zrušenou rozjížďku schválně nechává být.
    /// </para>
    /// </summary>
    private async Task<StavRozjizdky> StavPodleZapisuAsync(
        Rozjizdka rozjizdka, CancellationToken ct)
    {
        var sVysledkem = await db.Vysledky
            .Where(v => v.RozjizdkaId == rozjizdka.Id)
            .Select(v => v.UcastId)
            .ToListAsync(ct);

        var lode = await db.Ucasti
            .Where(u => u.ZavodId == rozjizdka.ZavodId)
            .Select(u => new { u.Id, u.Stav })
            .ToListAsync(ct);

        return Zapis.StavPoZapisu(
            StavRozjizdky.Planovana,
            Zapis.Odstartovala(rozjizdka.StartV, cas.GetUtcNow()),
            lode.Select(u => (u.Stav, sVysledkem.Contains(u.Id))),
            rozjizdka.KonecV is not null);
    }

    /// <summary>
    /// Pustí výsledky ven, nebo je stáhne. <b>Publikace není stav</b>:
    /// potvrzený výsledek smí zůstat neveřejný a publikovaný se smí vrátit
    /// k revizi, aniž by se publikace ztratila.
    /// </summary>
    public async Task PublikujAsync(
        Rozjizdka rozjizdka, bool publikovano, CancellationToken ct,
        Upozorneni.UpozorneniSprava? upozorneni = null)
    {
        var pousti = publikovano && !rozjizdka.Publikovano;
        rozjizdka.Publikovano = publikovano;

        // <b>Upozornění se zařazuje do téže transakce jako publikace.</b>
        // To je celý smysl outboxu: buď se uloží „je venku" i úkol zprávu
        // poslat, nebo nic. Poslat rovnou odsud by znamenalo, že při pádu
        // uložení odejde zpráva o něčem, co venku není — a naopak při pádu
        // odesílání se nikdo nedozví, že výsledky jsou.
        //
        // <b>Jen při puštění ven, ne při stažení</b>, a jen když ještě
        // venku nebyla: opakovaná publikace téže rozjížďky by poslala
        // „výsledky jsou venku" podruhé.
        if (pousti && upozorneni is not null)
        {
            var zavod = await db.Zavody
                .Where(z => z.Id == rozjizdka.ZavodId)
                .Select(z => new { z.Slug, z.Nazev, Serie = z.Serie!.Slug })
                .FirstAsync(ct);

            // <b>Posílá se na odběr ročníku, ne regaty.</b> Appka se hlásí
            // k ročníku (`serie:<slug>`) — divák chce vědět o sezóně, ne
            // vypisovat devět regat zvlášť, a nově vypsaná regata by mu
            // jinak utekla. Odběr regaty (`Odbery.Zavod`) zůstává
            // připravený pro chvíli, kdy si o jednu regatu někdo řekne;
            // dokud se k němu nikdo nehlásí, zpráva na něj nikam nedojde.
            //
            // Změřeno 26. 10. 2026: tohle tu bylo obráceně, takže se
            // zařazovalo na `zavod:<slug>`, kdežto telefony se hlásily na
            // `serie:<slug>` — a `TokenyAsync` hledá odběr jako celou
            // položku, takže zpráva neodešla **nikomu**. Celý řetěz byl
            // hotový a nespojený.
            upozorneni.Zarad(
                Upozorneni.Odbery.Serie(zavod.Serie),
                zavod.Nazev,
                $"Výsledky {rozjizdka.Cislo}. rozjížďky jsou venku.",
                $"/serie/{zavod.Serie}/zavody/{zavod.Slug}/vysledky");
        }

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
