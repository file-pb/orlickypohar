using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Serial;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>Kategorie ročníku, do které jde loď přeřadit.</summary>
public record KategorieSpravaDto(int Id, string Nazev, int Poradi);

/// <summary>Do které kategorie ročníku loď patří od teď.</summary>
public record ZmenaKategorieVstup(int KategorieId);

/// <summary>
/// Přeřazení lodi do jiné kategorie ročníku. <b>Pravomoc správce ročníku</b>,
/// jako u vazeb k lodím: kategorie platí celý rok a napříč zastávkami, takže
/// pověření k jedné regatě na ni nemá dosáhnout.
/// <para>
/// <b>Proč to vůbec je.</b> Loď jede celý rok v jedné kategorii a nositelem
/// bodů je celoroční přihláška (<c>Prihlaska.KategorieId</c>,
/// <c>Features/Serial/Serie.cs</c>). Jenže loď kategorii přece jen změnit
/// může — nové plachty, přeměření —, a dokud to nešlo přepsat, zbývala
/// databáze (plán, oddíl <i>Zbývá doladit</i>, bod 4).
/// </para>
/// <para>
/// <b>Pořadí se přepočítá samo</b> a nic se tu kvůli tomu nepouští: pořadí
/// seriálu je čtený výpočet nad rozjížďkami, ne uložená tabulka
/// (<c>Features/Bodovani/PoradiEndpoints.cs</c>).
/// </para>
/// <para>
/// <b>Loď si body s sebou neodnese — vzniknou nové.</b> Body v rozjížďce se
/// počítají <i>uvnitř kategorie</i> a vítěz má 1
/// (<c>Bodovani.BodyRozjizdky</c>, seskupení podle kategorie je
/// <c>Bodovani.cs:209</c>), takže čísla závisí na tom, s kým se loď srovnává.
/// Přeřazení proto přepočítá <b>obě</b> kategorie, i tu, ze které loď odešla.
/// Důsledek, který je potřeba znát dřív, než se to zmáčkne: lodím, které
/// s přeřazenou lodí celý rok soupeřily, se tím změní body za odjeté
/// zastávky. To je správně — kategorie není přihrádka, do které se body
/// ukládají, ale okruh, proti kterému se počítají.
/// </para>
/// <para>
/// <b>Historie se nevede</b>, dokud se neukáže, že je potřeba (tamtéž).
/// Změna se proto zapíše do logu a nikam jinam; u vazeb k lodím je historie
/// v tabulce proto, že se z ní odvozují pravomoci, a tady se neodvozuje nic.
/// </para>
/// <para>
/// <b>Transakci ani zámek řádku to nepotřebuje.</b> U kapitánství je zámek
/// kvůli pravidlu o posledním kapitánovi, které drží přes víc řádků. Tady se
/// mění jedno pole jedné přihlášky a žádný invariant napříč řádky na něm
/// nestojí, takže by zámek jen předstíral, že se hlídá něco víc.
/// </para>
/// </summary>
public class KategorieLodiSprava(AppDbContext db, ILogger<KategorieLodiSprava> log)
{
    /// <summary>Kategorie ročníku v pořadí, ve kterém se zobrazují.</summary>
    public async Task<List<KategorieSpravaDto>> SeznamAsync(int serieId, CancellationToken ct) =>
        await db.Kategorie
            .Where(k => k.SerieId == serieId)
            .OrderBy(k => k.Poradi).ThenBy(k => k.Nazev)
            .Select(k => new KategorieSpravaDto(k.Id, k.Nazev, k.Poradi))
            .ToListAsync(ct);

    /// <summary>
    /// Přeřadí loď do jiné kategorie téhož ročníku. Vrací chybu k zobrazení,
    /// nebo <c>null</c>, když se povedlo. Přeřazení do kategorie, ve které
    /// loď už je, projde a nic nezmění.
    /// </summary>
    public async Task<string?> ZmenAsync(
        int serieId, int lodId, int kategorieId, Guid spravce, CancellationToken ct)
    {
        var prihlaska = await db.Prihlasky
            .FirstOrDefaultAsync(p => p.SerieId == serieId && p.LodId == lodId, ct);
        if (prihlaska is null) return "Loď v ročníku přihlášená není.";

        // Kategorie patří sérii, ne lodi. Bez téhle kontroly by správce
        // jednoho ročníku přivěsil loď na kategorii cizího — pořadí by se
        // pak počítalo v přihrádce, kterou v tomhle ročníku nikdo nevidí.
        var kategorie = await db.Kategorie
            .FirstOrDefaultAsync(k => k.Id == kategorieId && k.SerieId == serieId, ct);
        if (kategorie is null) return "Taková kategorie v ročníku není.";

        if (prihlaska.KategorieId == kategorieId) return null;

        var puvodni = prihlaska.KategorieId;
        prihlaska.KategorieId = kategorieId;
        await db.SaveChangesAsync(ct);

        log.LogInformation(
            "Loď {Lod} v ročníku {Serie} přeřazena z kategorie {Puvodni} do {Nova}; "
            + "změnil {Spravce}. Pořadí obou kategorií se tím přepočítá.",
            lodId, serieId, puvodni, kategorieId, spravce);

        return null;
    }
}
