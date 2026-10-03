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
/// <b>Nic se nemaže ani nepřepisuje.</b> Vyvěšená směrnice zůstává; oprava
/// je nová verze. Vývěska musí jít doložit zpětně.
/// </para>
/// </summary>
public class SmerniceSprava(
    AppDbContext db, IUloziste uloziste, TimeProvider cas, ILogger<SmerniceSprava> log)
{
    public bool Pripraveno => uloziste.Pripraveno;

    /// <summary>Směrnice zastávky, od nejnovější verze.</summary>
    public async Task<List<SmerniceDto>> SeznamAsync(int zavodId, CancellationToken ct)
    {
        var smernice = await db.Smernice
            .Include(s => s.Vyvesil)
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

        await uloziste.UlozAsync(Vyveseni.Klic(smernice.Id), data, "application/pdf", ct);

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
}
