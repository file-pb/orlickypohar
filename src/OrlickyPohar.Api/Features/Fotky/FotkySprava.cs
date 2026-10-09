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

    /// <summary>
    /// Nahraje soubor a vyrobí z něj záznam fotky — <b>bez vazby na
    /// vlastníka a bez zápisu do databáze</b>. To, k čemu fotka patří,
    /// rozhodne volající; tahle část je u všech tří cest (hlavní obrázek,
    /// tělo článku, bóje) stejná a třetí ruční kopie by se rozešla.
    /// </summary>
    private async Task<(Fotka? Fotka, string? Chyba)> VyrobAsync(
        FotkaFormular formular, Guid kdo, CancellationToken ct)
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

        return (fotka, null);
    }

    /// <summary>
    /// Uloží záznam. Selže-li zápis, uklidí soubory, které už v úložišti
    /// leží — jinak by tam zůstaly a neukazovalo by na ně nic.
    /// </summary>
    private async Task UlozAsync(Fotka fotka, CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            await UklidAsync(fotka.Id);
            throw;
        }
    }

    /// <summary>Nahraje obrázek a nahradí jím předchozí. Vrací chybu, nebo hotový obrázek.</summary>
    public async Task<(ObrazekDto? Obrazek, string? Chyba)> NastavAsync(
        IMaFotku vlastnik, FotkaFormular formular, Guid kdo, CancellationToken ct)
    {
        var (fotka, chyba) = await VyrobAsync(formular, kdo, ct);
        if (fotka is null) return (null, chyba);

        var stara = vlastnik.FotkaId;
        db.Fotky.Add(fotka);
        // Klíč i navigace naráz. Vlastník bývá načtený i se starou fotkou
        // a změnit jen jedno z nich nechává rozhodnutí na EF.
        vlastnik.Fotka = fotka;
        vlastnik.FotkaId = fotka.Id;

        await UlozAsync(fotka, ct);

        if (stara is { } id) await SmazAsync(id);

        return (Nahravani.Dto(fotka, uloziste.VerejnaAdresa), null);
    }

    /// <summary>
    /// Nahraje obrázek <b>do těla článku</b>. Na rozdíl od
    /// <see cref="NastavAsync"/> nic nenahrazuje — v textu jich může být víc.
    /// <para>
    /// Prochází týmž zpracováním, takže i fotka z mobilu skončí jako WebP
    /// nejvýš 1600 px. Právě proto smí být v těle jen obrázek nahraný k nám:
    /// u cizí adresy velikost neřídíme a zaplatí ji každý čtenář.
    /// </para>
    /// </summary>
    public async Task<(ObrazekDto? Obrazek, string? Chyba)> NahrajDoTelaAsync(
        int clanekId, FotkaFormular formular, Guid kdo, CancellationToken ct)
    {
        var (fotka, chyba) = await VyrobAsync(formular, kdo, ct);
        if (fotka is null) return (null, chyba);

        fotka.VTeleClankuId = clanekId;
        db.Fotky.Add(fotka);
        await UlozAsync(fotka, ct);

        return (Nahravani.Dto(fotka, uloziste.VerejnaAdresa), null);
    }

    /// <summary>
    /// Přiloží fotku <b>k bóji</b>. Taky nic nenahrazuje: jeden snímek
    /// zblízka neukáže zároveň bóji i břeh za ní, a teprve obojí dohromady
    /// dokládá, kde to je (Filip, 9. 10. 2026).
    /// <para>
    /// Prochází týmž zpracováním jako všechno ostatní, takže fotka
    /// z telefonu skončí jako WebP nejvýš 1600 px — originál se nikam
    /// neukládá. Jsou to doklady k poloze, ne obrázky na web.
    /// </para>
    /// </summary>
    public async Task<(ObrazekDto? Obrazek, string? Chyba)> PridejKBojiAsync(
        int bojeId, FotkaFormular formular, Guid kdo, CancellationToken ct)
    {
        var (fotka, chyba) = await VyrobAsync(formular, kdo, ct);
        if (fotka is null) return (null, chyba);

        fotka.UBojeId = bojeId;
        db.Fotky.Add(fotka);
        await UlozAsync(fotka, ct);

        return (Nahravani.Dto(fotka, uloziste.VerejnaAdresa), null);
    }

    /// <summary>
    /// Odebere jednu fotku bóje i její soubory. Cizí fotku neodebere —
    /// id přichází od klienta a bóje se kontroluje spolu s ním.
    /// </summary>
    public async Task<string?> OdeberZBojeAsync(int bojeId, Guid fotkaId, CancellationToken ct)
    {
        var fotka = await db.Fotky.FirstOrDefaultAsync(
            f => f.Id == fotkaId && f.UBojeId == bojeId, ct);
        // Fotka, která tam není, je z pohledu volajícího hotová věc.
        if (fotka is null) return null;

        // Bez úložiště nejde smazat soubor. Odpojit záznam a soubor nechat
        // viset by bylo přesně to, před čím smazání chrání.
        if (!uloziste.Pripraveno) return Vypnuto;

        await SmazAsync(fotka.Id);
        return null;
    }

    /// <summary>Obrázky nahrané do těla článku, od nejnovějšího.</summary>
    public async Task<IReadOnlyList<ObrazekDto>> VTeleAsync(int clanekId, CancellationToken ct) =>
        [.. (await db.Fotky
                .Where(f => f.VTeleClankuId == clanekId)
                .OrderByDescending(f => f.NahranoV)
                .ToListAsync(ct))
            .Select(f => Nahravani.Dto(f, uloziste.VerejnaAdresa))
            .OfType<ObrazekDto>()];

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
    /// <summary>
    /// Smaže všechny fotky bóje. Vrací <c>false</c>, když se mazat nedá,
    /// protože úložiště není zapnuté — volající pak nesmí smazat ani
    /// záznam, jinak by soubory zůstaly viset bez vlastníka.
    /// </summary>
    public async Task<bool> OdeberVsechnyUBojeAsync(int bojeId, CancellationToken ct)
    {
        var id = await db.Fotky.Where(f => f.UBojeId == bojeId).Select(f => f.Id).ToListAsync(ct);
        if (id.Count == 0) return true;
        if (!uloziste.Pripraveno) return false;

        foreach (var x in id) await SmazAsync(x);

        // <b>Odpojit, co se smazalo.</b> `SmazAsync` maže
        // `ExecuteDeleteAsync`, tedy mimo sledování změn: řádek z databáze
        // zmizí, ale sledovaná entita zůstane. Kdyby volající hned potom
        // smazal bóji, EF by k ní fotku kaskádou přidal do dávky a spadl
        // na „expected to affect 1 row, but actually affected 0".
        foreach (var e in db.ChangeTracker.Entries<Fotka>()
                     .Where(e => id.Contains(e.Entity.Id))
                     .ToList())
            e.State = Microsoft.EntityFrameworkCore.EntityState.Detached;

        return true;
    }

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
