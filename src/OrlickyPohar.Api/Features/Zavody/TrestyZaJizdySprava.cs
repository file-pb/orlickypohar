using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Co rozhodčí lodi uložil, jak to jde ven.</summary>
public record TrestDto(
    int Id,
    int UcastId,
    string Lod,
    DruhTrestu Druh,
    /// <summary>Kolik otáček — číslo, kterým se o trestu mluví na vodě.</summary>
    int Otacek,
    DateTimeOffset UlozenoV,
    /// <summary><c>null</c> znamená „nikdo nezapsal", ne „nevykonala".</summary>
    DateTimeOffset? VykonanoV);

/// <summary>Co rozhodčí lodi ukládá za jízdy (ZPJ 44.2).</summary>
public record TrestVstup(
    int Ucast,
    DruhTrestu Druh,
    // Kdy ho rozhodčí uložil, podle hodin telefonu. Bez signálu ho appka
    // podrží; serverový čas zápisu by byl čas, kdy telefon chytil signál.
    DateTimeOffset? UlozenoV = null);

public class TrestyZaJizdySprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>Kolik otáček ten trest znamená — ZPJ 44.2.</summary>
    public static int Otacek(DruhTrestu druh) => druh == DruhTrestu.Otacka360 ? 1 : 2;

    public Task<List<TrestDto>> SeznamAsync(int zavodId, int cislo, CancellationToken ct) =>
        db.TrestyZaJizdy
            .Where(t => t.Rozjizdka!.ZavodId == zavodId && t.Rozjizdka.Cislo == cislo)
            .OrderBy(t => t.UlozenoV)
            .Select(t => new TrestDto(
                t.Id,
                t.UcastId,
                t.Ucast!.Prihlaska!.Lod!.Nazev,
                t.Druh,
                t.Druh == DruhTrestu.Otacka360 ? 1 : 2,
                t.UlozenoV,
                t.VykonanoV))
            .ToListAsync(ct);

    /// <summary>
    /// Uloží lodi trest. Vrací text chyby, nebo <c>null</c>.
    ///
    /// <para>
    /// <b>Jen u rozjížďky, která se jede</b> — tatáž mez jako u úkonů za
    /// jízdy. Před startem není co trestat a po dojetí už se k tomu, co
    /// se na trati stalo, nevrací zápis, ale protest.
    /// </para>
    /// </summary>
    public async Task<string?> UlozAsync(
        int zavodId, int cislo, TrestVstup vstup, Guid kdo, CancellationToken ct)
    {
        var rozjizdka = await db.Rozjizdky
            .FirstOrDefaultAsync(r => r.ZavodId == zavodId && r.Cislo == cislo, ct);
        if (rozjizdka is null) return "Taková rozjížďka u téhle regaty není.";
        if (rozjizdka.Stav != StavRozjizdky.Probiha)
            return rozjizdka.Stav == StavRozjizdky.Dokoncena
                ? "Rozjížďka je dojetá. Co se stalo na trati, řeší protest, ne zápis."
                : "Rozjížďka se nejede. Dokud se nevyjelo, není co trestat.";

        // Loď musí být v téhle regatě — jinak by trest visel u někoho,
        // kdo s polem nepluje.
        var ucastSedi = await db.Ucasti
            .AnyAsync(u => u.Id == vstup.Ucast && u.ZavodId == zavodId, ct);
        if (!ucastSedi) return "Taková loď v téhle regatě není.";

        var ted = cas.GetUtcNow();
        var (ulozeno, posun) = Spolecne.CasKlienta.Kdy(vstup.UlozenoV, ted);

        db.TrestyZaJizdy.Add(new TrestZaJizdy
        {
            RozjizdkaId = rozjizdka.Id,
            UcastId = vstup.Ucast,
            Druh = vstup.Druh,
            UlozenoV = ulozeno,
            ZapsanoV = ted,
            PosunCasu = posun,
            UlozilId = kdo,
        });

        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Odvolá trest. <b>Jen dokud se jede</b>: po dojetí je to doklad.
    /// </summary>
    public async Task<string?> OdvolejAsync(int zavodId, int cislo, int trest, CancellationToken ct)
    {
        var zaznam = await db.TrestyZaJizdy
            .Include(t => t.Rozjizdka)
            .FirstOrDefaultAsync(
                t => t.Id == trest && t.Rozjizdka!.ZavodId == zavodId
                     && t.Rozjizdka.Cislo == cislo, ct);
        if (zaznam is null) return "Takový trest u téhle rozjížďky není.";
        if (zaznam.Rozjizdka!.Stav != StavRozjizdky.Probiha)
            return "Rozjížďka se nejede. Co se uložilo na trati, se zpětně nemaže.";

        db.TrestyZaJizdy.Remove(zaznam);
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Zapíše, že loď trest odkroužila. <b>Zapisuje rozhodčí, ne posádka</b>
    /// (nález R34): *„abychom jim nekomplikovali život."*
    /// </summary>
    public async Task<string?> VykonanAsync(
        int zavodId, int cislo, int trest, DateTimeOffset? kdy, CancellationToken ct)
    {
        var zaznam = await db.TrestyZaJizdy
            .Include(t => t.Rozjizdka)
            .FirstOrDefaultAsync(
                t => t.Id == trest && t.Rozjizdka!.ZavodId == zavodId
                     && t.Rozjizdka.Cislo == cislo, ct);
        if (zaznam is null) return "Takový trest u téhle rozjížďky není.";

        var (vykonano, _) = Spolecne.CasKlienta.Kdy(kdy, cas.GetUtcNow());
        zaznam.VykonanoV = vykonano;
        await db.SaveChangesAsync(ct);
        return null;
    }
}
