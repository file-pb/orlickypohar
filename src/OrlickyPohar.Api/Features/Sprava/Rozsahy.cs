using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Sprava;

/// <summary>
/// Převod adres na rozsahy a jedno místo, kde se ptá na právo.
/// <para>
/// Endpointy pracují se slugy, protože v adrese stojí slugy; oprávnění je
/// vedené na identifikátorech, protože slug se dá přepsat. Překlad tedy musí
/// být někde — a <b>musí být na jednom místě</b>, jinak si ho každý endpoint
/// napíše trochu jinak a jeden z nich zapomene ověřit, že závod patří té
/// sérii, na kterou se ptáme.
/// </para>
/// </summary>
public class Rozsahy(AppDbContext db, Uzivatele uzivatele)
{
    public record Rozsah(int SerieId, int? ZavodId);

    /// <summary>
    /// Najde sérii a případně závod v ní. Vrací <c>null</c>, když neexistují
    /// — nebo když závod patří <b>jiné</b> sérii, což je pokus obejít rozsah.
    /// </summary>
    public async Task<Rozsah?> NajdiAsync(string serie, string? zavod, CancellationToken ct)
    {
        var serieId = await db.Serie
            .Where(s => s.Slug == serie)
            .Select(s => (int?)s.Id)
            .FirstOrDefaultAsync(ct);

        if (serieId is null) return null;
        if (zavod is null) return new Rozsah(serieId.Value, null);

        var zavodId = await db.Zavody
            .Where(z => z.Slug == zavod && z.SerieId == serieId)
            .Select(z => (int?)z.Id)
            .FirstOrDefaultAsync(ct);

        return zavodId is null ? null : new Rozsah(serieId.Value, zavodId);
    }

    /// <summary>
    /// Smí přihlášený to, na co se ptáme? Účet se přitom <b>nezakládá</b>:
    /// kdo se ještě nikdy nepřihlásil, nemá práva, a kontrola práv nemá být
    /// důvod, proč mu účet vznikne.
    /// </summary>
    public async Task<bool> SmiAsync(ClaimsPrincipal kdo, Pozadavek co, CancellationToken ct)
    {
        if (kdo.Ucet() is not { } ucet) return false;

        var uzivatel = await uzivatele.PodleUctuAsync(ucet.Issuer, ucet.Subject, ct);
        if (uzivatel is null) return false;

        return Prava.Smi(await uzivatele.PravaAsync(uzivatel.Id, ct), co);
    }
}
