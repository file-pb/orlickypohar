using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;

namespace OrlickyPohar.Api.Features.Prevzate;

/// <summary>
/// Stáhne kanály zdrojů v <see cref="Zdroje.Vsechny"/> a z každého nechá
/// jeho nejnovější články. Novější vytlačují starší; naše vlastní články
/// se nemažou nikdy, ty leží v jiné tabulce (Filip, 23. 9. 2026).
/// <para>
/// <b>Smysl je plnost obsahu</b>, ne archiv. Proto se staré mažou a ne
/// archivují: k čemu by byl náš tři roky starý odpis cizí novinky, když
/// originál je o kliknutí dál a je celý.
/// </para>
/// <para>
/// <b>Rotace je na zdroj</b> (<see cref="ZdrojKanalu.Kolik"/>). Se společným
/// stropem by jeden hodně píšící zdroj vytlačil všechny ostatní a výpis by
/// se tvářil, že jiné kluby nic nedělají.
/// </para>
/// <para>
/// <b>Zapíná se proměnnou <c>Prevzate__Sber=true</c></b>, jen v nasazení —
/// stejně jako sběr vodočtu. Testy ani vývojový stroj tak na cizí server
/// nesahají. Ukládání fotek k sobě má vlastní vypínač
/// <c>Prevzate__Fotky</c>: po jeho vypnutí se uložené fotky při příštím
/// běhu samy smažou a web se vrátí k adrese u zdroje.
/// </para>
/// <para>
/// <b>Jedna replika.</b> Dvakrát spuštěná služba nic nerozbije — klíčem je
/// odkaz článku a zápis je upsert — jen by se zdrojů ptala dvakrát. Až
/// přibude druhá replika, patří sem zámek v databázi.
/// </para>
/// </summary>
public class SberPrevzatych(
    IServiceScopeFactory sluzby,
    IHttpClientFactory http,
    TimeProvider cas,
    IConfiguration konfigurace,
    ILogger<SberPrevzatych> log)
    : BackgroundService
{
    /// <summary>
    /// Zdroj vydá článek zhruba obden. Šest hodin znamená, že novinka je
    /// u nás nejpozději do půl dne, a je to čtyři dotazy denně na cizí
    /// server — což je slušné.
    /// </summary>
    public static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    public const string Klient = "prevzate";

    /// <summary>Ukládat fotky k sobě, nebo zůstat u adresy u zdroje.</summary>
    private bool FotkyKSobe => konfigurace.GetValue<bool>("Prevzate:Fotky");

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        using var takt = new PeriodicTimer(Interval, cas);
        do
        {
            foreach (var zdroj in Zdroje.Vsechny)
            {
                try
                {
                    await JednouAsync(zdroj, stop);
                }
                catch (Exception e) when (e is not OperationCanceledException || !stop.IsCancellationRequested)
                {
                    // Cizí server bývá nedostupný. Příští takt to zkusí znovu
                    // a do té doby se ukazuje, co už máme — díra v přejatých
                    // novinkách nikoho nepoškodí. Jeden nefunkční zdroj
                    // nesmí zastavit ostatní.
                    log.LogWarning(e, "Stažení článků ze zdroje {Zdroj} se nepovedlo", zdroj.Nazev);
                }
            }

            try
            {
                await UklidAsync(stop);
            }
            catch (Exception e) when (e is not OperationCanceledException || !stop.IsCancellationRequested)
            {
                log.LogWarning(e, "Úklid souborů přejatých článků se nepovedl");
            }
        } while (await takt.WaitForNextTickAsync(stop));
    }

    public async Task JednouAsync(ZdrojKanalu zdroj, CancellationToken ct)
    {
        using var klient = http.CreateClient(Klient);
        var xml = await klient.GetStringAsync(zdroj.Rss, ct);

        var polozky = Kanal.Rozeber(xml);
        if (polozky.Count == 0)
        {
            log.LogWarning("Kanál zdroje {Zdroj} nemá očekávaný tvar nebo je prázdný", zdroj.Nazev);
            return;
        }

        await using var scope = sluzby.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Dál se pracuje jen s tím, co se udrží: víc se stejně vytlačí
        // a ke každému nováčkovi se musí stáhnout jeho stránka kvůli fotce.
        // Padesát zbytečných dotazů na cizí server by bylo nezdvořilé.
        var vybrane = polozky.Take(zdroj.Kolik).ToList();
        var sObrazky = await DoplnObrazkyAsync(db, scope, klient, zdroj, vybrane, ct);

        var (nove, smazane) = await UlozAsync(db, zdroj, sObrazky, cas.GetUtcNow(), ct);

        log.LogInformation(
            "Články ze zdroje {Zdroj}: {Nove} nových, {Smazane} vytlačených, drží se {Kolik}",
            zdroj.Nazev, nove, smazane, zdroj.Kolik);
    }

    /// <summary>
    /// Ke každému <b>novému</b> článku dohledá fotku, kterou k němu dal
    /// zdroj. RSS obrázky nevydává, takže se musí stáhnout jeho stránka
    /// a vzít <c>og:image</c>. Když je ukládání zapnuté, fotka se rovnou
    /// stáhne, přepočítá na naše velikosti a uloží k nám.
    /// <para>
    /// <b>Jen k novým.</b> U článku, který už v databázi leží, se fotka
    /// nemění a ptát se na ni znovu by znamenalo osm dotazů každých šest
    /// hodin místo zhruba jednoho denně.
    /// </para>
    /// <para>
    /// Nepovedené stažení článek nezahodí — zůstane bez fotky a web sáhne
    /// po náhradní. Cizí server, který zrovna neodpovídá, nemá být důvod,
    /// proč se novinka neukáže.
    /// </para>
    /// </summary>
    private async Task<IReadOnlyList<PolozkaKanalu>> DoplnObrazkyAsync(
        AppDbContext db, IServiceScope scope, HttpClient klient, ZdrojKanalu zdroj,
        IReadOnlyList<PolozkaKanalu> polozky, CancellationToken ct)
    {
        var odkazy = polozky.Select(p => p.Odkaz).ToList();
        var uz = await db.PrevzateClanky
            .Where(c => odkazy.Contains(c.Odkaz))
            .Select(c => c.Odkaz)
            .ToListAsync(ct);

        var stahovac = FotkyKSobe ? scope.ServiceProvider.GetRequiredService<StahovacFotek>() : null;

        var doplnene = new List<PolozkaKanalu>(polozky.Count);
        foreach (var p in polozky)
        {
            if (uz.Contains(p.Odkaz))
            {
                doplnene.Add(p);
                continue;
            }

            string? ogImage = null;
            try
            {
                var html = await klient.GetStringAsync(p.Odkaz, ct);
                ogImage = Kanal.Obrazek(html);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogInformation(e, "Fotku k článku {Odkaz} se nepovedlo zjistit", p.Odkaz);
            }

            var vysledek = ogImage is null || stahovac is null
                ? new VysledekFotky(null, false)
                : await stahovac.UlozAsync(klient, zdroj, ogImage, ct);

            // Když zdroj místo fotky dal logo, zahodí se i jeho adresa —
            // jinak by ho web ukázal přes celou kartu (Filip, 2. 10. 2026).
            if (vysledek.Nepouzitelna)
            {
                log.LogInformation(
                    "Obrázek u článku {Odkaz} je na kartu moc malý, použije se náhradní", p.Odkaz);
                ogImage = null;
            }

            doplnene.Add(p with { Obrazek = ogImage, Fotka = vysledek.Fotka });
        }

        return doplnene;
    }

    /// <summary>
    /// Zapíše, co přišlo, a nechá jen <see cref="ZdrojKanalu.Kolik"/>
    /// nejnovějších článků <b>toho zdroje</b>.
    /// <para>
    /// Ořezává se <b>až po zápisu a podle data vydání</b>, ne tak, že by se
    /// vzalo prvních osm ze vstupu: v databázi můžou ležet články, které
    /// v tomhle kanálu už nejsou, a rozhodnout se musí mezi všemi dohromady.
    /// Pořadí ve vstupu k tomu neříká nic — <see cref="Kanal.Rozeber"/> ho
    /// sice srovná podle data, ale tahle metoda na to nespoléhá.
    /// </para>
    /// <para>
    /// Existující se přepíše — zdroj smí článek opravit a přepsaný titulek
    /// je oprava, ne nový článek. Klíčem je odkaz, takže se nic nezdvojí.
    /// </para>
    /// <para>
    /// <b>Fotky vytlačených článků jdou do fronty k smazání v téže
    /// transakci</b>, ve které mizí jejich řádek. Jinak by po zaškobrtnutí
    /// úložiště zbyl v bucketu soubor, ke kterému už nevede žádný záznam.
    /// </para>
    /// </summary>
    public static async Task<(int Nove, int Smazane)> UlozAsync(
        AppDbContext db, ZdrojKanalu zdroj, IReadOnlyList<PolozkaKanalu> polozky,
        DateTimeOffset nyni, CancellationToken ct)
    {
        var odkazy = polozky.Select(p => p.Odkaz).ToList();
        var zname = await db.PrevzateClanky
            .Where(c => odkazy.Contains(c.Odkaz))
            .ToDictionaryAsync(c => c.Odkaz, ct);

        var nove = 0;
        foreach (var p in polozky)
        {
            if (!zname.TryGetValue(p.Odkaz, out var clanek))
            {
                clanek = new PrevzatyClanek
                {
                    Zdroj = zdroj.Nazev,
                    ZdrojOdkaz = zdroj.Odkaz,
                    Odkaz = p.Odkaz,
                    Titulek = p.Titulek,
                };
                db.PrevzateClanky.Add(clanek);
                nove++;
            }

            clanek.Titulek = p.Titulek;
            clanek.Perex = p.Perex;
            // Fotka se dohledává jen u nových, takže u známého článku
            // přijde prázdná — a tou se nesmí přepsat ta, kterou už má.
            clanek.Obrazek = p.Obrazek ?? clanek.Obrazek;
            if (p.Fotka is { } f)
            {
                clanek.FotkaId = f.Id;
                clanek.Sirka = f.Sirka;
                clanek.Vyska = f.Vyska;
            }

            // Časy do databáze patří v UTC — Npgsql jiný posun do
            // `timestamp with time zone` nezapíše a kanál posílá +02:00.
            clanek.PublikovanoV = p.PublikovanoV.ToUniversalTime();
            clanek.StazenoV = nyni.ToUniversalTime();
        }

        await db.SaveChangesAsync(ct);

        // Rotace až po zápisu: teprve teď je jasné, které je osm nejnovějších
        // dohromady — nové i ty, co už ležely. Jen články téhož zdroje:
        // zdroje si navzájem místo neberou.
        var vytlacene = await db.PrevzateClanky
            .Where(c => c.Zdroj == zdroj.Nazev)
            .OrderByDescending(c => c.PublikovanoV).ThenByDescending(c => c.Id)
            .Skip(zdroj.Kolik)
            .ToListAsync(ct);

        if (vytlacene.Count > 0)
        {
            Uklid.Zarad(db, vytlacene.Where(c => c.FotkaId is { } id && id != Guid.Empty)
                .SelectMany(c => PrevzateFotky.Klice(c.FotkaId!.Value)), nyni);
            db.PrevzateClanky.RemoveRange(vytlacene);
            await db.SaveChangesAsync(ct);
        }

        return (nove, vytlacene.Count);
    }

    /// <summary>
    /// Vyprázdní frontu smazaných souborů a — když je ukládání fotek
    /// vypnuté — zařadí do ní i fotky, které ještě držíme. Vypnutí
    /// vypínače tak uklidí samo, nejpozději při dalším běhu.
    /// </summary>
    private async Task UklidAsync(CancellationToken ct)
    {
        await using var scope = sluzby.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var uloziste = scope.ServiceProvider.GetRequiredService<IUloziste>();

        if (!FotkyKSobe)
        {
            var sFotkou = await db.PrevzateClanky.Where(c => c.FotkaId != null).ToListAsync(ct);
            if (sFotkou.Count > 0)
            {
                Uklid.Zarad(db, sFotkou.SelectMany(c => PrevzateFotky.Klice(c.FotkaId!.Value)),
                    cas.GetUtcNow());
                foreach (var c in sFotkou)
                {
                    c.FotkaId = null;
                    c.Sirka = null;
                    c.Vyska = null;
                }

                await db.SaveChangesAsync(ct);
                log.LogInformation(
                    "Ukládání fotek je vypnuté, {Pocet} přejatých fotek jde pryč", sFotkou.Count);
            }
        }

        var (smazano, neuspechu) = await Uklid.VyprazdniAsync(db, uloziste, log, ct);
        if (smazano > 0 || neuspechu > 0)
            log.LogInformation("Soubory přejatých: {Smazano} smazáno, {Neuspechu} zůstalo na příště",
                smazano, neuspechu);
    }
}
