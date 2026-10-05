using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Import;

/// <summary>
/// Jak se má import zachovat k tomu, co už v ročníku je.
/// <para>
/// <b>Idempotence chrání před opakováním téhož souboru, ne před jeho
/// zastaralostí</b> (oponentura, 5. 10. 2026). Soubor ročníku se připraví
/// jednou, během sezóny vzniknou nové výsledky a publikace — a pozdější
/// nahrání toho původního souboru je přepíše. Obojí jsou platná data, takže
/// to import sám nepozná.
/// </para>
/// </summary>
public enum RezimImportu
{
    /// <summary>
    /// Nic neuloží: provede import a vrátí ho zpátky, takže v odpovědi
    /// stojí přesně to, co by se stalo. <b>Rozdíl se neodhaduje, počítá se
    /// skutečným průchodem</b> — odhad vedle kódu by se s ním rozešel.
    /// </summary>
    Nahled,

    /// <summary>
    /// Výchozí. Uloží, ale <b>odmítne celou dávku</b>, kdyby přepsala
    /// výsledky zapsané v aplikaci nebo stáhla publikaci.
    /// </summary>
    Bezpecny,

    /// <summary>
    /// Výslovný režim opravy: přepíše i provozní výsledky a publikaci.
    /// Vyžaduje otisk ročníku, takže se nedá pustit naslepo.
    /// </summary>
    Oprava,
}

/// <summary>Co by import přepsal. Jedna věta pro člověka, ne kód k rozebrání.</summary>
public record Kolize(string Zavod, int? Rozjizdka, string Co);

/// <summary>
/// Kontrola, jestli soubor nevrací ročník do minulosti, a otisk jeho
/// provozního stavu.
/// </summary>
public static class Prepis
{
    public const string PotrebaOprava =
        "Soubor by přepsal výsledky nebo publikaci, které vznikly v aplikaci. "
        + "Projdi si náhled (rezim=nahled) a pokud to tak má být, pusť import "
        + "znovu s rezim=oprava a otiskem z náhledu.";

    public const string OtiskNesedi =
        "Ročník se od náhledu změnil, takže otisk nesedí — mezitím někdo zapsal "
        + "výsledky nebo pustil publikaci. Udělej náhled znovu.";

    public const string OtiskChybi =
        "Režim opravy přepisuje provozní výsledky, takže se nepouští naslepo: "
        + "pošli otisk ročníku z náhledu.";

    /// <summary>
    /// Otisk provozního stavu ročníku: co se v něm zapsalo a co je venku.
    /// <para>
    /// Není to kontrolní součet celého ročníku. Hlídá právě to, co import
    /// umí přepsat a co by měl přepsat jen vědomě — revize sad výsledků,
    /// stav zápisu a publikace. Jméno lodi se tu měnit může a náhled kvůli
    /// němu zneplatňovat nemá smysl.
    /// </para>
    /// </summary>
    public static async Task<string> OtiskAsync(AppDbContext db, string serieSlug, CancellationToken ct)
    {
        var radky = await db.Rozjizdky
            .Where(r => r.Zavod!.Serie!.Slug == serieSlug)
            .OrderBy(r => r.Zavod!.Slug).ThenBy(r => r.Cislo)
            .Select(r => new
            {
                Zavod = r.Zavod!.Slug,
                ZavodVenku = r.Zavod.Publikovano,
                r.Cislo,
                r.Revize,
                r.StavVysledku,
                r.Publikovano,
            })
            .ToListAsync(ct);

        var text = new StringBuilder(serieSlug);
        foreach (var r in radky)
            text.Append($"|{r.Zavod}:{r.ZavodVenku}:{r.Cislo}:{r.Revize}:{r.StavVysledku}:{r.Publikovano}");

        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(text.ToString())))[..16];
    }

    /// <summary>
    /// Co by soubor přepsal. Prázdný seznam znamená, že je bezpečný.
    /// <para>
    /// Čte se <b>před</b> jakýmkoliv zápisem a ze stejných dat, ze kterých
    /// se počítá otisk: <c>Revize &gt; 0</c> znamená, že sadu zapsal někdo
    /// v aplikaci, ne soubor.
    /// </para>
    /// </summary>
    public static async Task<List<Kolize>> KolizeAsync(
        AppDbContext db, SerieVstup vstup, CancellationToken ct)
    {
        var zavodyVDb = await db.Zavody
            .Where(z => z.Serie!.Slug == vstup.Slug)
            .Select(z => new
            {
                z.Slug,
                z.Publikovano,
                Rozjizdky = z.Rozjizdky.Select(r => new
                {
                    r.Cislo, r.Revize, r.StavVysledku, r.Publikovano,
                }).ToList(),
            })
            .ToListAsync(ct);

        var kolize = new List<Kolize>();
        var vSouboru = vstup.Zavody.ToDictionary(z => z.Slug);

        kolize.AddRange(await RozdvojeniAsync(db, vstup, ct));

        foreach (var vDb in zavodyVDb)
        {
            // Závod, který soubor nepojmenuje, se nemaže — ten se neřeší.
            if (!vSouboru.TryGetValue(vDb.Slug, out var ze_souboru)) continue;

            if (vDb.Publikovano && !ze_souboru.Publikovano)
                kolize.Add(new Kolize(vDb.Slug, null, "stáhlo by publikaci regaty"));

            var rozjizdkyVSouboru = ze_souboru.Rozjizdky.ToDictionary(r => r.Cislo);

            foreach (var r in vDb.Rozjizdky)
            {
                var zapsanaVAplikaci = r.Revize > 0;

                if (!rozjizdkyVSouboru.TryGetValue(r.Cislo, out var sr))
                {
                    // Rozjížďka, kterou soubor nemá, se smaže i s výsledky.
                    if (zapsanaVAplikaci)
                        kolize.Add(new Kolize(vDb.Slug, r.Cislo,
                            "smazalo by rozjížďku zapsanou v aplikaci i s jejími výsledky"));
                    continue;
                }

                if (zapsanaVAplikaci)
                    kolize.Add(new Kolize(vDb.Slug, r.Cislo,
                        "přepsalo by výsledky zapsané v aplikaci"));

                if (r.Publikovano && !sr.Publikovano)
                    kolize.Add(new Kolize(vDb.Slug, r.Cislo, "stáhlo by publikaci výsledků"));

                // Stav se hlídá jen zpátky v řadě: dopředu (návrh → ověřeno)
                // je posun, ne návrat do minulosti.
                if (Array.IndexOf(Workflow.Rada, sr.StavVysledku)
                    < Array.IndexOf(Workflow.Rada, r.StavVysledku))
                    kolize.Add(new Kolize(vDb.Slug, r.Cislo,
                        $"vrátilo by stav výsledků z „{Workflow.Nazev(r.StavVysledku)}“ "
                        + $"na „{Workflow.Nazev(sr.StavVysledku)}“"));
            }
        }

        return kolize;
    }

    /// <summary>
    /// Závod, který by soubor založil znovu pod jinou adresou.
    /// <para>
    /// <b>Slug je přirozený klíč importu a zároveň adresa</b> — a to je past
    /// (oponentura, 5. 10. 2026): rozhodčí přejmenuje regatu v sešitu,
    /// generátor z nového názvu vyrobí jiný slug, import ho vyhodnotí jako
    /// nový závod a ten původní zůstane, protože závody se nemažou. Pak
    /// patří jedné události dvě řady výsledků, příloh a odběrů.
    /// </para>
    /// <para>
    /// Pozná se to podle <b>termínu</b>: soubor zakládá závod na den, na
    /// který už jeden existuje a soubor ho nepojmenoval. Je to vodítko, ne
    /// důkaz — dvě regaty v jeden den být mohou — proto je to kolize
    /// k potvrzení, ne tvrdá chyba. V administraci se slug nemění (viz
    /// <c>KalendarSprava.UpravAsync</c>), takže tudy jiná cesta nevede.
    /// </para>
    /// </summary>
    private static async Task<List<Kolize>> RozdvojeniAsync(
        AppDbContext db, SerieVstup vstup, CancellationToken ct)
    {
        var slugyVSouboru = vstup.Zavody.Select(z => z.Slug).ToHashSet();

        var existujici = await db.Zavody
            .Where(z => z.Serie!.Slug == vstup.Slug)
            .Select(z => new { z.Slug, z.Nazev, z.Datum })
            .ToListAsync(ct);

        // Jen ty, které soubor nepojmenoval — pojmenovaný závod se páruje
        // normálně a o rozdvojení nejde.
        var osirele = existujici
            .Where(z => !slugyVSouboru.Contains(z.Slug))
            .ToLookup(z => z.Datum);

        return
        [
            .. vstup.Zavody
                .Where(z => !existujici.Any(e => e.Slug == z.Slug))
                .SelectMany(novy => osirele[novy.Datum].Select(stary => new Kolize(
                    novy.Slug, null,
                    $"založilo by nový závod na {novy.Datum:d. M. yyyy}, kde už je "
                    + $"„{stary.Nazev}“ ({stary.Slug}), který soubor nepojmenoval — "
                    + "nepřejmenoval se jen název, a tím adresa?"))),
        ];
    }
}
