using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Upozorneni;

/// <summary>
/// Odesílá, co leží v outboxu.
///
/// <para>
/// <b>Zapíná se proměnnou <c>Upozorneni__Odesilat=true</c></b>, stejně jako
/// ostatní úlohy — testy ani vývoj nemají volat Expo.
/// </para>
/// <para>
/// <b>Jedna replika.</b> Kdyby běžela dvakrát, poslaly by obě tytéž úkoly:
/// výběr fronty není zamčený. Až přibude druhá replika, patří sem zámek
/// (<c>SELECT … FOR UPDATE SKIP LOCKED</c>) — dokud je jedna, byl by to
/// kód bez otázky, na kterou odpovídá.
/// </para>
/// <para>
/// <b>Proč takt po minutě.</b> Upozornění nejsou čas závodu: „výsledky
/// zveřejněny" snese minutu, a kratší takt by při prázdné frontě jen budil
/// databázi. Zprávy, které minutu nesnesou — odložený start — půjdou
/// zařadit s vlastní pobídkou, až vzniknou.
/// </para>
/// </summary>
public class OdesilaniUloha(
    IServiceScopeFactory sluzby, TimeProvider cas, ILogger<OdesilaniUloha> log) : BackgroundService
{
    public static readonly TimeSpan Takt = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        using var takt = new PeriodicTimer(Takt, cas);
        do
        {
            try
            {
                await using var scope = sluzby.CreateAsyncScope();
                var odeslano = await KoloAsync(
                    scope.ServiceProvider.GetRequiredService<UpozorneniSprava>(),
                    scope.ServiceProvider.GetRequiredService<ExpoPush>(),
                    log, stop);

                if (odeslano > 0) log.LogInformation("Odesláno {Pocet} upozornění", odeslano);
            }
            catch (Exception e) when (e is not OperationCanceledException || !stop.IsCancellationRequested)
            {
                log.LogWarning(e, "Kolo odesílání upozornění se nepovedlo");
            }
        } while (await takt.WaitForNextTickAsync(stop));
    }

    /// <summary>
    /// Jedno kolo: vezme frontu, pošle a výsledek zapíše. Vrací počet
    /// odeslaných úkolů. <b>Veřejné kvůli testům</b> — jinak by se dalo
    /// zkoušet jen přes hodiny.
    /// </summary>
    public static async Task<int> KoloAsync(
        UpozorneniSprava sprava, ExpoPush push, ILogger log, CancellationToken ct)
    {
        var fronta = await sprava.CekajiciAsync(ct);
        var odeslano = 0;

        foreach (var ukol in fronta)
        {
            var tokeny = await sprava.TokenyAsync(ukol.Odber, ct);

            // <b>Žádné zařízení není úspěch, ne chyba.</b> Odběr, který
            // nikdo nemá, se nemá zkoušet pětkrát a pak vzdát — zpráva
            // prostě neměla komu dojít.
            if (tokeny.Count == 0)
            {
                await sprava.HotovoAsync(ukol, ct);
                odeslano++;
                continue;
            }

            try
            {
                var vysledky = await push.PosliAsync(tokeny, ukol.Titulek, ukol.Text, ukol.Cesta, ct);

                await sprava.ZahodZarizeniAsync(
                    vysledky.Where(v => v.Neregistrovane).Select(v => v.Token).ToList(), ct);

                // <b>Úkol je hotový, i když část tokenů selhala.</b> Chyba
                // u jednoho telefonu je konečná odpověď o něm, ne důvod
                // posílat zprávu znovu všem ostatním — ti by ji dostali
                // podruhé.
                var selhalo = vysledky.Count(v => v.Chyba is not null && !v.Neregistrovane);
                if (selhalo > 0)
                    log.LogWarning(
                        "Upozornění {Id}: {Selhalo} z {Celkem} tokenů odmítnuto",
                        ukol.Id, selhalo, vysledky.Count);

                await sprava.HotovoAsync(ukol, ct);
                odeslano++;
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                // Expo nedostupné nebo odpovědělo nesmyslem — to je případ
                // „zkusit znovu", proto se úkol nechává ve frontě.
                await sprava.NepovedloSeAsync(ukol, e.Message, ct);
            }
        }

        return odeslano;
    }
}
