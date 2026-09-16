using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Vodocet;

/// <summary>
/// Každých deset minut stáhne stránku Orlíku a uloží, co na ní je; měření
/// starší tří dnů smaže (Filip, 16. 9. 2026: po deseti minutách a staré
/// promazávat, ať tabulka nebobtná). Na výpočet stačí 24 h, zbytek je
/// rezerva na výpadek.
/// <para>
/// <b>Zapíná se proměnnou <c>Vodocet__Sber=true</c></b>, jen v nasazení.
/// Testy ani vývojový stroj tak na cizí server nesahají.
/// </para>
/// <para>
/// <b>Jedna replika.</b> Běžela-li by služba dvakrát, nic se nerozbije —
/// klíčem je čas měření a zápis je upsert — jen by se Povodí ptalo
/// dvakrát. Až přibude druhá replika, patří sem zámek v databázi.
/// </para>
/// </summary>
public class SberVodocetu(
    IServiceScopeFactory sluzby, IHttpClientFactory http, TimeProvider cas, ILogger<SberVodocetu> log)
    : BackgroundService
{
    public static readonly TimeSpan Interval = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan Uchovani = TimeSpan.FromDays(3);

    public const string Klient = "pvl";

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
                // Cizí server bývá občas nedostupný. Příští takt to zkusí znovu;
                // díra do hodiny výpočet nerozbije.
                log.LogWarning(e, "Sběr vodočtu Orlíku se nepovedl");
            }
        } while (await takt.WaitForNextTickAsync(stop));
    }

    public async Task JednouAsync(CancellationToken ct)
    {
        using var klient = http.CreateClient(Klient);
        var html = await klient.GetStringAsync(Pvl.Adresa, ct);

        if (Pvl.Rozeber(html) is not { } stranka)
        {
            log.LogWarning("Stránka Povodí Vltavy nemá očekávaný tvar");
            return;
        }

        await using var scope = sluzby.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await UlozAsync(db, stranka, cas.GetUtcNow(), ct);
    }

    /// <summary>
    /// Zapíše stránku a uklidí staré. Řada přepisuje hladinu a odtok —
    /// je to hodinová hodnota Povodí, která má přednost. Aktuální hodnoty
    /// doplní objem a přítok a zbytek jen tam, kde nic není.
    /// </summary>
    public static async Task UlozAsync(AppDbContext db, StrankaPvl stranka, DateTimeOffset nyni, CancellationToken ct)
    {
        var od = nyni - Uchovani;
        var casy = stranka.Rada.Select(m => m.Cas).Append(stranka.Aktualni.Cas)
            .Where(c => c >= od).ToList();
        var ulozene = await db.MereniNadrze.Where(m => casy.Contains(m.Cas)).ToDictionaryAsync(m => m.Cas, ct);

        MereniNadrze Radek(DateTimeOffset kdy)
        {
            if (ulozene.TryGetValue(kdy, out var radek)) return radek;
            radek = new MereniNadrze { Cas = kdy };
            db.MereniNadrze.Add(radek);
            ulozene[kdy] = radek;
            return radek;
        }

        foreach (var m in stranka.Rada.Where(m => m.Cas >= od))
        {
            var r = Radek(m.Cas);
            r.Hladina = m.Hladina;
            r.Odtok = m.Odtok ?? r.Odtok;
        }

        var a = stranka.Aktualni;
        var nyniRadek = Radek(a.Cas);
        var novy = nyniRadek.Hladina == 0;
        if (novy) nyniRadek.Hladina = a.Hladina;
        nyniRadek.Objem = a.Objem ?? nyniRadek.Objem;
        nyniRadek.Pritok = a.Pritok ?? nyniRadek.Pritok;
        nyniRadek.Odtok ??= a.Odtok;

        await db.SaveChangesAsync(ct);
        await db.MereniNadrze.Where(m => m.Cas < od).ExecuteDeleteAsync(ct);
    }
}
