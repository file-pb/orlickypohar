using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;

namespace OrlickyPohar.Api.Features.Smernice;

/// <summary>
/// Vyvěšení plachetní směrnice.
/// <para>
/// <b>Pořadí kroků: nejdřív soubor, pak záznam.</b> Selže-li zápis do
/// databáze, soubor se uklidí. Opačné pořadí by nechalo na vývěsce odkaz,
/// pod kterým nic není — a to je u dokumentu, podle kterého se jede, horší
/// než osiřelý soubor za zlomek haléře.
/// </para>
/// <para>
/// <b>Záznam se nepřepisuje, obsah se dá odvolat.</b> Vyvěšená směrnice
/// zůstává v historii a oprava je nová verze — ale stažení smaže soubor
/// z úložiště, protože nová verze chybnou neodvolá a do té doby se špatně
/// nahraný dokument dal donekonečna stahovat z veřejné adresy
/// (oponentura, 5. 10. 2026).
/// </para>
/// </summary>
public class SmerniceSprava(
    AppDbContext db, IUloziste uloziste, TimeProvider cas, ILogger<SmerniceSprava> log)
{
    public bool Pripraveno => uloziste.Pripraveno;

    /// <summary>
    /// Směrnice zastávky, od nejnovější verze. <b>Včetně stažených</b> —
    /// správa musí vidět i to, co se odvolalo, a proč.
    /// </summary>
    public async Task<List<SmerniceDto>> SeznamAsync(int zavodId, CancellationToken ct)
    {
        var smernice = await db.Smernice
            .Include(s => s.Vyvesil)
            .Include(s => s.Stahl)
            .Where(s => s.ZavodId == zavodId)
            .OrderByDescending(s => s.Verze)
            .ToListAsync(ct);

        return [.. smernice.Select(s => Vyveseni.Dto(s, uloziste.VerejnaAdresa)).OfType<SmerniceDto>()];
    }

    /// <summary>Vyvěsí novou verzi. Vrací chybu, nebo hotovou směrnici.</summary>
    public async Task<(SmerniceDto? Smernice, string? Chyba)> VyvesAsync(
        int zavodId, SmerniceFormular formular, Guid kdo, CancellationToken ct)
    {
        if (!uloziste.Pripraveno) return (null, Vyveseni.Vypnuto);

        var nazev = formular.Soubor?.FileName?.Trim();
        if (Vyveseni.ProcNejde(formular.Soubor?.Length ?? 0, nazev, formular.Poznamka) is { } chyba)
            return (null, chyba);

        using var obsah = new MemoryStream();
        await formular.Soubor!.CopyToAsync(obsah, ct);
        var data = obsah.ToArray();

        // Obsah, ne koncovka: prohlížeč typ souboru jen tvrdí.
        if (!Vyveseni.JePdf(data)) return (null, Vyveseni.NeniPdf);

        var posledni = await db.Smernice
            .Where(s => s.ZavodId == zavodId)
            .MaxAsync(s => (int?)s.Verze, ct) ?? 0;

        var smernice = new PlachetniSmernice
        {
            Id = Guid.CreateVersion7(),
            ZavodId = zavodId,
            Verze = posledni + 1,
            Nazev = nazev!,
            Velikost = data.LongLength,
            Poznamka = string.IsNullOrWhiteSpace(formular.Poznamka) ? null : formular.Poznamka.Trim(),
            VyvesilId = kdo,
            VyveseneV = cas.GetUtcNow(),
        };

        await uloziste.UlozAsync(
            Vyveseni.Klic(smernice.Id), data, "application/pdf", ct, Vyveseni.Cache);

        try
        {
            db.Smernice.Add(smernice);
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            // Záznam nevznikl, takže na soubor nic neukazuje a nikdo se k němu
            // nedostane. Úklid je součást téhle chyby, ne pozdější starost.
            try
            {
                await uloziste.SmazAsync(Vyveseni.Klic(smernice.Id), ct);
            }
            catch (Exception e)
            {
                log.LogWarning(e, "Nepovedlo se uklidit soubor směrnice {Id}", smernice.Id);
            }

            throw;
        }

        await db.Entry(smernice).Reference(s => s.Vyvesil).LoadAsync(ct);
        return (Vyveseni.Dto(smernice, uloziste.VerejnaAdresa), null);
    }

    /// <summary>
    /// Stáhne verzi z vývěsky. Vrací text chyby, nebo <c>null</c>.
    /// <para>
    /// <b>Pořadí kroků je obrácené než u vyvěšení: nejdřív záznam, pak
    /// soubor.</b> Tady je cílem zbavit se obsahu, takže zapsat stažení
    /// a soubor nechat je mnohem menší zlo než naopak — řádek, který tvrdí,
    /// že směrnice visí, zatímco soubor je pryč, by na vývěsce ukazoval
    /// mrtvý odkaz.
    /// </para>
    /// <para>
    /// Klíč jde <b>v téže transakci</b> do fronty úklidu, takže zaškobrtnutí
    /// R2 soubor v bucketu nezapomene — mazání se opakuje, dokud nevyjde.
    /// Hned po zápisu se o smazání zkusí rovnou: u odvolaného dokumentu se
    /// na pravidelný úklid čekat nemá.
    /// </para>
    /// </summary>
    public async Task<string?> StahniAsync(
        int zavodId, int verze, string? duvod, Guid kdo, CancellationToken ct)
    {
        var smernice = await db.Smernice
            .FirstOrDefaultAsync(s => s.ZavodId == zavodId && s.Verze == verze, ct);
        if (smernice is null) return "Takovou verzi tahle regata nemá.";

        if (Vyveseni.ProcNejdeStahnout(!Vyveseni.Visi(smernice), duvod) is { } chyba) return chyba;

        var klic = Vyveseni.Klic(smernice.Id);
        var ted = cas.GetUtcNow();

        smernice.StazenoV = ted;
        smernice.StahlId = kdo;
        smernice.DuvodStazeni = duvod!.Trim();
        Uklid.Zarad(db, [klic], ted);
        await db.SaveChangesAsync(ct);

        log.LogInformation("Směrnice {Id} (verze {Verze}) stažená z vývěsky účtem {Kdo}",
            smernice.Id, verze, kdo);

        await UklidHnedAsync(klic, ct);
        return null;
    }

    /// <summary>
    /// Zkusí soubor smazat rovnou a vyřazenou položku odebere z fronty.
    /// Když to nevyjde, zůstává ve frontě na pravidelný úklid — proto se
    /// chyba jen loguje a stažení samo platí dál.
    /// </summary>
    private async Task UklidHnedAsync(string klic, CancellationToken ct)
    {
        if (!uloziste.Pripraveno) return;

        try
        {
            await uloziste.SmazAsync(klic, ct);
            var ve_fronte = await db.SouboryKeSmazani.Where(s => s.Klic == klic).ToListAsync(ct);
            db.SouboryKeSmazani.RemoveRange(ve_fronte);
            await db.SaveChangesAsync(ct);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            log.LogWarning(e,
                "Soubor stažené směrnice {Klic} se nepovedlo smazat hned, zůstává ve frontě", klic);
        }
    }
}
