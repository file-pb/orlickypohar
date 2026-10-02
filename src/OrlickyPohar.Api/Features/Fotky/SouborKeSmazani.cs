using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Fotky;

/// <summary>
/// Soubor, který má zmizet z úložiště. Fronta, ne okamžité mazání.
/// <para>
/// <b>Proč fronta:</b> záznam v databázi a soubor v cizí službě se nedají
/// smazat jednou transakcí. Kdyby se mazalo rovnou, stačí jedno zaškobrtnutí
/// R2 a soubor zůstane v bucketu napořád — řádek, podle kterého se dal
/// najít, je už pryč. Takhle se klíč zapíše <b>v téže transakci</b>, která
/// maže řádek, a smazání se opakuje, dokud nevyjde.
/// </para>
/// <para>
/// Fronta je obecná (klíč je řetězec), ne vázaná na přejaté články: každá
/// další věc, která bude mazat soubory, může sáhnout po téhle.
/// </para>
/// </summary>
public class SouborKeSmazani
{
    public int Id { get; set; }

    /// <summary>Klíč v úložišti, například <c>prevzate/ab…-480.webp</c>.</summary>
    public required string Klic { get; set; }

    public DateTimeOffset PridanoV { get; set; }

    /// <summary>Kolikrát se smazání nepovedlo. Jen pro ladění a pro log.</summary>
    public int Pokusu { get; set; }
}

/// <summary>Zařazení do fronty a její vyprázdnění.</summary>
public static class Uklid
{
    /// <summary>
    /// Kolik souborů se smaže v jednom průchodu. Fronta bývá prázdná nebo
    /// krátká; strop je tu proto, aby se jeden špatný den nepropsal do
    /// tisíce požadavků na cizí službu v jedné vteřině.
    /// </summary>
    public const int Davka = 50;

    /// <summary>
    /// Zapíše klíče do fronty. <b>Neukládá</b> — volající to musí udělat
    /// v téže transakci, ve které maže záznam, který na soubory odkazuje.
    /// </summary>
    public static void Zarad(AppDbContext db, IEnumerable<string> klice, DateTimeOffset nyni)
    {
        foreach (var klic in klice)
            db.SouboryKeSmazani.Add(new SouborKeSmazani { Klic = klic, PridanoV = nyni });
    }

    /// <summary>
    /// Smaže, co je ve frontě, a vyřízené z ní odstraní. Co se nepovede,
    /// zůstane na příště s vyšším počtem pokusů — vrací se počet smazaných
    /// a počet neúspěchů.
    /// </summary>
    public static async Task<(int Smazano, int Neuspechu)> VyprazdniAsync(
        AppDbContext db, IUloziste uloziste, ILogger log, CancellationToken ct)
    {
        if (!uloziste.Pripraveno) return (0, 0);

        var fronta = await db.SouboryKeSmazani
            .OrderBy(s => s.Id)
            .Take(Davka)
            .ToListAsync(ct);
        if (fronta.Count == 0) return (0, 0);

        var smazano = 0;
        var neuspechu = 0;
        foreach (var soubor in fronta)
        {
            try
            {
                await uloziste.SmazAsync(soubor.Klic, ct);
                db.SouboryKeSmazani.Remove(soubor);
                smazano++;
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                soubor.Pokusu++;
                neuspechu++;
                log.LogWarning(e, "Soubor {Klic} se nepovedlo smazat ({Pokusu}. pokus)",
                    soubor.Klic, soubor.Pokusu);
            }
        }

        await db.SaveChangesAsync(ct);
        return (smazano, neuspechu);
    }
}
