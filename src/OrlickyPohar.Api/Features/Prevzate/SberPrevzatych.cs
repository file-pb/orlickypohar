using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Prevzate;

/// <summary>
/// Stáhne RSS Českého svazu jachtingu a nechá si osm nejnovějších článků.
/// Novější vytlačují starší; naše vlastní články se nemažou nikdy, ty leží
/// v jiné tabulce (Filip, 23. 9. 2026).
/// <para>
/// <b>Smysl je plnost obsahu</b>, ne archiv. Proto se staré mažou a ne
/// archivují: k čemu by byl náš tři roky starý odpis cizí novinky, když
/// originál je o kliknutí dál a je celý.
/// </para>
/// <para>
/// <b>Zapíná se proměnnou <c>Prevzate__Sber=true</c></b>, jen v nasazení —
/// stejně jako sběr vodočtu. Testy ani vývojový stroj tak na cizí server
/// nesahají.
/// </para>
/// <para>
/// <b>Jedna replika.</b> Dvakrát spuštěná služba nic nerozbije — klíčem je
/// odkaz článku a zápis je upsert — jen by se svazu ptala dvakrát. Až
/// přibude druhá replika, patří sem zámek v databázi.
/// </para>
/// </summary>
public class SberPrevzatych(
    IServiceScopeFactory sluzby, IHttpClientFactory http, TimeProvider cas, ILogger<SberPrevzatych> log)
    : BackgroundService
{
    /// <summary>
    /// Kolik přejatých článků na serveru leží. Osm je zadání; je to číslo
    /// pro výpis novinek, ne archivní pravidlo.
    /// </summary>
    public const int Kolik = 8;

    /// <summary>
    /// Svaz vydá článek zhruba obden. Šest hodin znamená, že novinka je
    /// u nás nejpozději do půl dne, a je to čtyři dotazy denně na cizí
    /// server — což je slušné.
    /// </summary>
    public static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    public const string Klient = "csj";

    public const string Zdroj = "Český svaz jachtingu";
    public const string ZdrojOdkaz = "https://www.sailing.cz/clanky";
    public const string Adresa = "https://www.sailing.cz/rss/clanky";

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        using var takt = new PeriodicTimer(Interval, cas);
        do
        {
            try
            {
                await JednouAsync(stop);
            }
            catch (Exception e) when (e is not OperationCanceledException || !stop.IsCancellationRequested)
            {
                // Cizí server bývá nedostupný. Příští takt to zkusí znovu
                // a do té doby se ukazuje, co už máme — díra v přejatých
                // novinkách nikoho nepoškodí.
                log.LogWarning(e, "Stažení článků ze svazu se nepovedlo");
            }
        } while (await takt.WaitForNextTickAsync(stop));
    }

    public async Task JednouAsync(CancellationToken ct)
    {
        using var klient = http.CreateClient(Klient);
        var xml = await klient.GetStringAsync(Adresa, ct);

        var polozky = Kanal.Rozeber(xml);
        if (polozky.Count == 0)
        {
            log.LogWarning("Kanál svazu nemá očekávaný tvar nebo je prázdný");
            return;
        }

        await using var scope = sluzby.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Dál se pracuje jen s osmi nejnovějšími: víc se stejně neudrží
        // a ke každému nováčkovi se musí stáhnout jeho stránka kvůli fotce.
        // Padesát zbytečných dotazů na cizí server by bylo nezdvořilé.
        var vybrane = polozky.Take(Kolik).ToList();
        var sObrazky = await DoplnObrazkyAsync(db, klient, vybrane, ct);

        var (nove, smazane) = await UlozAsync(db, sObrazky, cas.GetUtcNow(), ct);

        log.LogInformation(
            "Články ze svazu: {Nove} nových, {Smazane} vytlačených, drží se {Kolik}",
            nove, smazane, Kolik);
    }

    /// <summary>
    /// Ke každému <b>novému</b> článku dohledá fotku, kterou k němu dal
    /// zdroj. RSS obrázky nevydává, takže se musí stáhnout jeho stránka
    /// a vzít <c>og:image</c>.
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
        AppDbContext db, HttpClient klient, IReadOnlyList<PolozkaKanalu> polozky,
        CancellationToken ct)
    {
        var odkazy = polozky.Select(p => p.Odkaz).ToList();
        var uz = await db.PrevzateClanky
            .Where(c => odkazy.Contains(c.Odkaz))
            .Select(c => c.Odkaz)
            .ToListAsync(ct);

        var doplnene = new List<PolozkaKanalu>(polozky.Count);
        foreach (var p in polozky)
        {
            if (uz.Contains(p.Odkaz))
            {
                doplnene.Add(p);
                continue;
            }

            try
            {
                var html = await klient.GetStringAsync(p.Odkaz, ct);
                doplnene.Add(p with { Obrazek = Kanal.Obrazek(html) });
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                log.LogInformation(e, "Fotku k článku {Odkaz} se nepovedlo zjistit", p.Odkaz);
                doplnene.Add(p);
            }
        }

        return doplnene;
    }

    /// <summary>
    /// Zapíše, co přišlo, a nechá jen <see cref="Kolik"/> nejnovějších.
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
    /// </summary>
    public static async Task<(int Nove, int Smazane)> UlozAsync(
        AppDbContext db, IReadOnlyList<PolozkaKanalu> polozky, DateTimeOffset nyni,
        CancellationToken ct)
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
                    Zdroj = Zdroj,
                    ZdrojOdkaz = ZdrojOdkaz,
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
            // Časy do databáze patří v UTC — Npgsql jiný posun do
            // `timestamp with time zone` nezapíše a kanál posílá +02:00.
            clanek.PublikovanoV = p.PublikovanoV.ToUniversalTime();
            clanek.StazenoV = nyni.ToUniversalTime();
        }

        await db.SaveChangesAsync(ct);

        // Rotace až po zápisu: teprve teď je jasné, které je osm nejnovějších
        // dohromady — nové i ty, co už ležely.
        var vytlacene = await db.PrevzateClanky
            .OrderByDescending(c => c.PublikovanoV).ThenByDescending(c => c.Id)
            .Skip(Kolik)
            .ToListAsync(ct);

        if (vytlacene.Count > 0)
        {
            db.PrevzateClanky.RemoveRange(vytlacene);
            await db.SaveChangesAsync(ct);
        }

        return (nove, vytlacene.Count);
    }
}
