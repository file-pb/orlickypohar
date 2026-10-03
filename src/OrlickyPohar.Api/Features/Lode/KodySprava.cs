using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Vystavení připojovacího kódu a jeho uplatnění.
/// <para>
/// <b>Kód je přístupový údaj</b>, i když vypadá jako šest písmen z papíru:
/// kdo ho má, připojí se k lodi. Proto krátká platnost, kryptografický
/// generátor a žádné vypisování kódu do logu.
/// </para>
/// </summary>
public class KodySprava(AppDbContext db, TimeProvider cas, ILogger<KodySprava> log)
{
    /// <summary>
    /// Vystaví kód pro loď. Starý kód se neruší — posádka může mít rozdaný
    /// papír a dva platné kódy nikomu nevadí, oba za čtvrt hodiny vyprší.
    /// </summary>
    public async Task<KodDto> VystavAsync(int lodId, Guid kdo, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();
        var kod = new PripojovaciKod
        {
            LodId = lodId,
            Kod = Kody.Novy(),
            VystavilId = kdo,
            VystavenV = ted,
            PlatiDo = ted + Kody.Platnost,
        };

        db.PripojovaciKody.Add(kod);
        await db.SaveChangesAsync(ct);

        // Do logu jde loď, ne kód. Log čte víc lidí než ten, kdo kód dostal.
        log.LogInformation("Vystaven připojovací kód k lodi {Lod}", lodId);
        return new KodDto(kod.Kod, kod.PlatiDo);
    }

    /// <summary>
    /// Připojí účet k lodi podle kódu. Vrací, co se stalo, nebo chybu
    /// k zobrazení.
    /// <para>
    /// <b>První připojený je kapitán, další posádka.</b> Kdo loď převezme
    /// jako první, za ni odpovídá. Kdo už u lodi roli má, o ni zadáním kódu
    /// nepřijde — role se nikdy nesnižuje, stejně jako u párování e-mailem.
    /// </para>
    /// </summary>
    public async Task<(PripojeniDto? Pripojeni, string? Chyba)> PripojAsync(
        string? zadany, Guid uzivatelId, CancellationToken ct)
    {
        var hledany = Kody.Uprav(zadany);
        if (hledany.Length != Kody.Delka) return (null, Kody.Neplatny);

        var ted = cas.GetUtcNow();
        var kod = await db.PripojovaciKody
            .Include(k => k.Lod)
            .FirstOrDefaultAsync(k => k.Kod == hledany && k.PlatiDo > ted, ct);

        // Propadlý i vymyšlený kód dávají tutéž odpověď: ať z ní nejde
        // vyčíst, že loď s takovým kódem existuje.
        if (kod?.Lod is not { } lod) return (null, Kody.Neplatny);

        var vazba = await db.VazbyKLodim
            .FirstOrDefaultAsync(v => v.LodId == kod.LodId && v.UzivatelId == uzivatelId, ct);

        if (vazba is not null)
            return (new PripojeniDto(lod.Id, lod.Nazev, vazba.Role, JizBylo: true), null);

        var maKapitana = await db.VazbyKLodim.AnyAsync(
            v => v.LodId == kod.LodId
                 && (v.Role == RoleKLodi.Kapitan || v.Role == RoleKLodi.Majitel), ct);

        var role = Kody.RoleProNoveho(maKapitana);
        db.VazbyKLodim.Add(new VazbaKLodi
        {
            LodId = kod.LodId,
            UzivatelId = uzivatelId,
            Role = role,
            Puvod = PuvodVazby.Kod,
            VzniklaV = ted,
        });
        kod.Pouzit++;
        await db.SaveChangesAsync(ct);

        log.LogInformation("Účet {Uzivatel} se připojil k lodi {Lod} jako {Role}",
            uzivatelId, kod.LodId, role);

        return (new PripojeniDto(lod.Id, lod.Nazev, role, JizBylo: false), null);
    }

    /// <summary>Smí účet vystavit kód k téhle lodi? Majitel a kapitán ano, posádka ne.</summary>
    public Task<bool> SmiVystavitAsync(int lodId, Guid uzivatelId, CancellationToken ct) =>
        db.VazbyKLodim.AnyAsync(
            v => v.LodId == lodId && v.UzivatelId == uzivatelId
                 && (v.Role == RoleKLodi.Majitel || v.Role == RoleKLodi.Kapitan), ct);

    /// <summary>Kdo je k lodi připojený. Kapitán i pořadatel to musí vidět.</summary>
    public Task<List<PripojenyDto>> PripojeniAsync(int lodId, CancellationToken ct) =>
        db.VazbyKLodim
            .Where(v => v.LodId == lodId)
            .OrderBy(v => v.Role).ThenBy(v => v.VzniklaV)
            .Select(v => new PripojenyDto(
                v.Id, v.Uzivatel!.Zobrazovane, v.Role, v.Puvod, v.VzniklaV))
            .ToListAsync(ct);

    /// <summary>
    /// Odebere připojení. <b>Poslední kapitán nebo majitel se odebrat
    /// nedá</b> — loď bez někoho odpovědného by zůstala bez správce a nikdo
    /// by k ní nevystavil kód.
    /// </summary>
    public async Task<string?> OdeberAsync(int lodId, int vazbaId, CancellationToken ct)
    {
        var vazba = await db.VazbyKLodim
            .FirstOrDefaultAsync(v => v.Id == vazbaId && v.LodId == lodId, ct);
        if (vazba is null) return "Takové připojení u lodi není.";

        if (vazba.Role is RoleKLodi.Majitel or RoleKLodi.Kapitan)
        {
            var dalsi = await db.VazbyKLodim.CountAsync(
                v => v.LodId == lodId && v.Id != vazbaId
                     && (v.Role == RoleKLodi.Majitel || v.Role == RoleKLodi.Kapitan), ct);
            if (dalsi == 0)
                return "Tohle je poslední kapitán lodi. Nejdřív přidej jiného, pak odeber tohohle.";
        }

        db.VazbyKLodim.Remove(vazba);
        await db.SaveChangesAsync(ct);
        return null;
    }
}

/// <summary>Kdo je k lodi připojený, pro kapitána i pořadatele.</summary>
public record PripojenyDto(
    int Id, string Kdo, RoleKLodi Role, PuvodVazby Puvod, DateTimeOffset VzniklaV);
