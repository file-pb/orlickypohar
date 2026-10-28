using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Oponentura;

/// <summary>
/// První sada: devět otázek, které v oponentuře s rozhodčím drží zbytek.
/// <para>
/// <b>Obsah je soubor, ne kód</b> — <c>prvni-sada.json</c> vedle téhle
/// třídy, ve tvaru, ve kterém sada přichází koncovým bodem
/// (<see cref="SadaVstup"/>). Je to tentýž soubor, který čte i mock
/// (<c>tools/fake-api.py</c>), takže texty otázek nejsou na dvou místech
/// a obrazovka se dá lokálně zkoušet s tím, co pak pošleme rozhodčímu.
/// </para>
/// <para>
/// <b>Proč je tahle jedna v repozitáři, když sady jsou data.</b> Zakládají
/// se koncovým bodem (<c>POST …/oponentura</c>) a tak se přidá každá
/// další — ale ta první musí po nasazení existovat, aby šel odkaz poslat
/// hned. Zaseje se při startu a <b>nic nepřepisuje</b>: sada, která už pod
/// tím slugem je, se nechá, jak je.
/// </para>
/// <para>
/// <b>Obsah je opsaný z <c>docs/SOUPIS-A-PLAN-START.md</c></b>, oddíl
/// <i>B) Čeká na rozhodnutí</i>: osmnáct nálezů z devatenácti stojí na
/// těchhle devíti otázkách. Formulace jsou proti tabulce <b>přepsané pro
/// telefon</b> — tabulka je psaná pro Filipa a nese zkratky nálezů, které
/// rozhodčímu nic neříkají.
/// </para>
/// <para>
/// <b>Osm z devíti už Miloš odpověděl</b> jednou dávkou třinácti nahrávek
/// (28. 10. 2026 večer). Sada je tu i tak celá: je to doklad, že formát
/// funguje, a místo, kam se jeho odpovědi dají přepsat z WhatsAppu, aby
/// nebyly jen v nahrávkách na telefonu. Co ještě visí, je <c>B5</c> —
/// odkdy se posádkám hlásí telefon.
/// </para>
/// </summary>
public static class PrvniSada
{
    public const string Slug = "b-ceka-na-rozhodnuti";

    /// <summary>Jméno vloženého souboru s obsahem sady.</summary>
    private const string Zdroj = "OrlickyPohar.Api.Features.Oponentura.prvni-sada.json";

    private static readonly JsonSerializerOptions Cteni =
        new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Sada tak, jak by přišla koncovým bodem — tentýž tvar, tedy data.
    /// <para>
    /// Soubor je <b>vložený do assembly</b>, ne vedle binárky: kontejner se
    /// staví z <c>Dockerfile</c> a soubor, který by se zapomněl zkopírovat,
    /// by se projevil až tím, že se sada po nasazení nezasela — a to nikdo
    /// nehlídá. Vložený soubor se nemůže ztratit jinak než chybou buildu.
    /// </para>
    /// </summary>
    public static SadaVstup Obsah()
    {
        using var proud = typeof(PrvniSada).Assembly.GetManifestResourceStream(Zdroj)
            ?? throw new InvalidOperationException(
                $"Ve assembly chybí vložený soubor {Zdroj}. Zkontroluj EmbeddedResource "
                + "v OrlickyPohar.Api.csproj.");

        return JsonSerializer.Deserialize<SadaVstup>(proud, Cteni)
            ?? throw new InvalidOperationException($"Soubor {Zdroj} se nepodařilo přečíst.");
    }

    /// <summary>
    /// Zaseje sadu do nejnovějšího ročníku, pokud tam ještě není.
    /// <para>
    /// <b>Do nejnovějšího</b>, protože oponentura běží nad ročníkem, který
    /// se bude jezdit, a role rozhodčího je udělená v něm. Bez ročníku se
    /// nedělá nic — sada bez rozsahu by neměla, koho se na právo zeptat.
    /// </para>
    /// </summary>
    public static async Task ZasejAsync(
        AppDbContext db, OponenturaSprava sprava, ILogger log, CancellationToken ct = default)
    {
        var serie = await db.Serie
            .OrderByDescending(s => s.Rok)
            .Select(s => new { s.Id, s.Slug })
            .FirstOrDefaultAsync(ct);

        if (serie is null)
        {
            log.LogInformation("Žádný ročník, sada otázek {Slug} se nezaseje", Slug);
            return;
        }

        // Existující sada se nepřepisuje: texty v ní mohly být po zasetí
        // opravené koncovým bodem a start aplikace není důvod, aby se
        // vrátily zpátky k tomu, co leží v repozitáři.
        if (await db.Sady.AnyAsync(s => s.SerieId == serie.Id && s.Slug == Slug, ct))
            return;

        var (slug, pridano, _) = await sprava.ZalozAsync(serie.Id, Obsah(), ct);
        log.LogInformation(
            "Sada otázek {Slug} zaseta do ročníku {Serie}: {Pridano} otázek",
            slug, serie.Slug, pridano);
    }
}
