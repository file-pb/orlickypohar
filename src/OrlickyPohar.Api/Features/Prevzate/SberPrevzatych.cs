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
        var (nove, smazane) = await UlozAsync(db, polozky, cas.GetUtcNow(), ct);

        log.LogInformation(
            "Články ze svazu: {Nove} nových, {Smazane} vytlačených, drží se {Kolik}",
            nove, smazane, Kolik);
    }

    /// <summary>
    /// Zapíše, co přišlo, a nechá jen <see cref="Kolik"/> nejnovějších.
    /// <para>
    /// Ukládá se celý kanál a teprve pak se ořezává, ne prvních osm z něj:
    /// kdyby zdroj poslal položky v jiném pořadí, než tvrdí, vybralo by
    /// „prvních osm" špatné. Rozhoduje datum vydání, ne pozice v souboru.
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
