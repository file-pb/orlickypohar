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

    /// <summary>
    /// Kde všude smí přihlášený tuhle roli v daném ročníku — celý ročník,
    /// nebo výčet zastávek.
    /// <para>
    /// Je to obrácená otázka než <see cref="SmiAsync"/>: ta se ptá „smí
    /// tohle?", tahle „na co dosáhne?". Potřebuje ji každá obrazovka, která
    /// nabízí volbu — seznam zastávek, na které jde psát, se nesmí lišit od
    /// toho, co pak zápis pustí, jinak si člověk vybere a dostane „nemáš
    /// práva".
    /// </para>
    /// </summary>
    public async Task<(bool CelyRocnik, IReadOnlyList<int> Zavody)> KdeSmiAsync(
        ClaimsPrincipal kdo, Role role, int serieId, CancellationToken ct)
    {
        if (kdo.Ucet() is not { } ucet) return (false, []);

        var uzivatel = await uzivatele.PodleUctuAsync(ucet.Issuer, ucet.Subject, ct);
        if (uzivatel is null) return (false, []);

        var udelena = await uzivatele.PravaAsync(uzivatel.Id, ct);

        // Ptá se přes `Prava`, ne porovnáním rolí: pokrývání je pravidlo
        // (organizátor obsahuje editora, správce obsahuje oboje) a existovat
        // má na jednom místě.
        var celyRocnik = Prava.Smi(udelena, new Pozadavek(role, serieId));

        var zavody = celyRocnik
            ? []
            : udelena
                .Where(u => u.Serie == serieId && u.Zavod is not null)
                .Where(u => Prava.Smi(udelena, new Pozadavek(role, serieId, u.Zavod)))
                .Select(u => u.Zavod!.Value)
                .Distinct()
                .ToList();

        return (celyRocnik, zavody);
    }
}
