using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Fotky;

/// <summary>Co může mít jeden obrázek: článek, medailonek pořadatele.</summary>
public interface IMaFotku
{
    Guid? FotkaId { get; set; }
    Fotka? Fotka { get; set; }
}

/// <summary>
/// Formulář nahrání. Souhlas je <c>bool</c>, ne „on" z HTML — formulář
/// skládá server webu, ne prohlížeč.
/// </summary>
public record FotkaFormular(IFormFile? Soubor, string? Autor, string? Popis, bool Souhlas);

/// <summary>
/// Nahrání a odebrání obrázku u čehokoliv, co ho má.
/// <para>
/// <b>Pořadí kroků je schválně: nejdřív soubory, pak záznam, nakonec úklid
/// starého.</b> Selže-li zápis do databáze, nahrané soubory se smažou
/// a stará fotka zůstane. Selže-li úklid, zůstane v úložišti soubor, na
/// který nic neukazuje — to stojí zlomek haléře a v logu je o něm zmínka;
/// opačné pořadí by při chybě nechalo stránku s rozbitým obrázkem.
/// </para>
/// <para>
/// <b>Odebraná fotka se maže i z úložiště.</b> Adresa je sice
/// neuhádnutelná, ale kdo fotku stáhne kvůli odvolanému souhlasu, čeká, že
/// zmizí, ne že jen přestane být odkázaná.
/// </para>
/// </summary>
public class FotkySprava(AppDbContext db, IUloziste uloziste, TimeProvider cas, ILogger<FotkySprava> log)
{
    public const string Vypnuto = "Nahrávání fotek zatím není zapnuté.";

    /// <summary>
    /// Přepočet vždycky jen jeden. Rozbalená fotka zabere až 240 MB a API
    /// má limit 512 MB — dvě naráz by kontejner shodily. Nahrává se pár
    /// fotek týdně, takže čekání nikdo nepozná.
    /// </summary>
    private static readonly SemaphoreSlim JedenNaraz = new(1, 1);

    public bool Pripraveno => uloziste.Pripraveno;

    /// <summary>Nahraje obrázek a nahradí jím předchozí. Vrací chybu, nebo hotový obrázek.</summary>
    public async Task<(ObrazekDto? Obrazek, string? Chyba)> NastavAsync(
        IMaFotku vlastnik, FotkaFormular formular, Guid kdo, CancellationToken ct)
    {
        if (!uloziste.Pripraveno) return (null, Vypnuto);

        if (Nahravani.ProcNejde(formular.Soubor?.Length ?? 0, formular.Autor, formular.Popis,
                formular.Souhlas) is { } chyba)
            return (null, chyba);

        // Do paměti, ne rovnou ze vstupu: zpracování čte soubor dvakrát
        // (hlavičku a pak celý) a velikost je shora omezená.
        using var obsah = new MemoryStream();
        await formular.Soubor!.CopyToAsync(obsah, ct);
        obsah.Position = 0;

        Varianty? varianty;
        string? chybaObrazku;
        await JedenNaraz.WaitAsync(ct);
        try
        {
            (varianty, chybaObrazku) = await Zpracovani.ZpracujAsync(obsah, ct);
        }
        finally
        {
            JedenNaraz.Release();
        }

        if (varianty is null) return (null, chybaObrazku);

        var fotka = new Fotka
        {
            Id = Guid.NewGuid(),
            Sirka = varianty.Sirka,
            Vyska = varianty.Vyska,
            Autor = formular.Autor!.Trim(),
            Popis = string.IsNullOrWhiteSpace(formular.Popis) ? null : formular.Popis.Trim(),
            NahralId = kdo,
            NahranoV = cas.GetUtcNow(),
        };

        await uloziste.UlozAsync(Nahravani.Klic(fotka.Id, Nahravani.SirkaNahledu), varianty.Nahled, "image/webp", ct);
        await uloziste.UlozAsync(Nahravani.Klic(fotka.Id, Nahravani.SirkaVelke), varianty.Velky, "image/webp", ct);

        var stara = vlastnik.FotkaId;
        db.Fotky.Add(fotka);
        // Klíč i navigace naráz. Vlastník bývá načtený i se starou fotkou
        // a změnit jen jedno z nich nechává rozhodnutí na EF.
        vlastnik.Fotka = fotka;
        vlastnik.FotkaId = fotka.Id;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            await UklidAsync(fotka.Id);
            throw;
        }

        if (stara is { } id) await SmazAsync(id);

        return (Nahravani.Dto(fotka, uloziste.VerejnaAdresa), null);
    }

    /// <summary>Odebere obrázek. Bez obrázku je to úspěch, ne chyba.</summary>
    public async Task<string?> OdeberAsync(IMaFotku vlastnik, CancellationToken ct)
    {
        if (vlastnik.FotkaId is not { } id) return null;

        // Bez úložiště nejde smazat soubor. Odpojit záznam a soubor nechat
        // viset by bylo přesně to, před čím smazání chrání.
        if (!uloziste.Pripraveno) return Vypnuto;

        vlastnik.Fotka = null;
        vlastnik.FotkaId = null;
        await db.SaveChangesAsync(ct);
        await SmazAsync(id);
        return null;
    }

    /// <summary>
    /// Smaže starou fotku. Nová je v tu chvíli uložená, takže úklid už
    /// nepřeruší ani odchod klienta — proto bez jeho tokenu.
    /// </summary>
    private async Task SmazAsync(Guid id)
    {
        await db.Fotky.Where(f => f.Id == id).ExecuteDeleteAsync(CancellationToken.None);
        await UklidAsync(id);
    }

    /// <summary>
    /// Smaže soubory. <b>Chyba se jen zapíše do logu</b> — záznam je
    /// v tu chvíli pryč nebo nevznikl a pro čtenáře je to hotové.
    /// </summary>
    private async Task UklidAsync(Guid id)
    {
        foreach (var klic in Nahravani.Klice(id))
        {
            try
            {
                await uloziste.SmazAsync(klic, CancellationToken.None);
            }
            catch (Exception e)
            {
                log.LogWarning(e, "Soubor {Klic} se z úložiště nepodařilo smazat", klic);
            }
        }
    }
}
