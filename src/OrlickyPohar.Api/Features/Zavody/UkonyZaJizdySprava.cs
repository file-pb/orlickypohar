using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Co komise vyhlásila za jízdy, jak to jde ven.</summary>
public record UkonDto(
    int Id,
    DruhUkonu Druh,
    string Vlajka,
    int PrvekId,
    /// <summary>Kolikátý prvek trati to je — tím se o značce mluví na vodě.</summary>
    int PrvekPoradi,
    Boje.TypPrvku PrvekTyp,
    int? Kurz,
    ZmenaDelky Delka,
    double? NahradniSirka,
    double? NahradniDelka,
    string? Poznamka,
    DateTimeOffset VyhlasenoV);

/// <summary>Co se vyhlašuje. Co z polí platí, rozhoduje <see cref="Druh"/>.</summary>
public record UkonVstup(
    DruhUkonu Druh,
    int Prvek,
    int? Kurz = null,
    ZmenaDelky Delka = ZmenaDelky.Beze,
    double? NahradniSirka = null,
    double? NahradniDelka = null,
    string? Poznamka = null,
    // Kdy komise úkon vyhlásila, podle hodin telefonu. Bez signálu ho
    // appka podrží; serverový čas zápisu by byl čas, kdy telefon chytil
    // síť. Mimo okno v `CasKlienta` se nepřijme a platí server.
    DateTimeOffset? VyhlasenoV = null);

/// <summary>
/// Úkony komise za jízdy — změna úseku (ZPJ 33) a chybějící značka (34).
/// <para>
/// <b>Stejná mez jako u zkrácení dráhy:</b> jen rozhodčí a jen u rozjížďky,
/// která se jede. Před startem se staví rovnou jiná trať, po dojetí se už
/// nemění, kudy se jelo.
/// </para>
/// </summary>
public class UkonyZaJizdySprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>Co platí pro rozjížďku, v pořadí vyhlášení.</summary>
    public async Task<List<UkonDto>> SeznamAsync(int zavodId, int cislo, CancellationToken ct) =>
        await db.UkonyZaJizdy
            .Where(u => u.Rozjizdka!.ZavodId == zavodId && u.Rozjizdka.Cislo == cislo)
            .OrderBy(u => u.VyhlasenoV).ThenBy(u => u.Id)
            .Select(u => new UkonDto(
                u.Id, u.Druh, u.Vlajka, u.PrvekId, u.Prvek!.Poradi, u.Prvek.Typ,
                u.Kurz, u.Delka, u.NahradniSirka, u.NahradniDelka,
                u.Poznamka, u.VyhlasenoV))
            .ToListAsync(ct);

    /// <summary>Vyhlásí úkon. Vrací chybu pro člověka, nebo <c>null</c>.</summary>
    public async Task<string?> VyhlasAsync(
        int zavodId, int cislo, UkonVstup vstup, Guid kdo, CancellationToken ct)
    {
        var rozjizdka = await db.Rozjizdky
            .FirstOrDefaultAsync(r => r.ZavodId == zavodId && r.Cislo == cislo, ct);
        if (rozjizdka is null) return "Taková rozjížďka u téhle regaty není.";
        if (rozjizdka.Stav != StavRozjizdky.Probiha)
            return rozjizdka.Stav == StavRozjizdky.Dokoncena
                ? "Rozjížďka je dojetá. Co se za jízdy vyhlásilo, se zpětně nedoplňuje."
                : "Rozjížďka se nejede. Dokud se nevyjelo, stav rovnou jinou trať.";

        // Prvek musí být z trati téhle rozjížďky — jinak by úkon ukazoval na
        // značku, kterou pole nepluje.
        var prvekSedi = await db.PrvkyTrati
            .AnyAsync(p => p.Id == vstup.Prvek && p.Trat!.RozjizdkaId == rozjizdka.Id
                           && p.Trat.ZavodId == zavodId, ct);
        if (!prvekSedi) return "Takový prvek na trati téhle rozjížďky není.";

        if (vstup.Druh == DruhUkonu.ZmenaUseku && vstup.Kurz is null
            && vstup.Delka == ZmenaDelky.Beze)
        {
            // Vlajka C beze změny směru i délky nenese žádnou informaci —
            // a posádky by hledaly, co se vlastně změnilo.
            return "Změna úseku musí říct kurz, délku, nebo obojí.";
        }

        if (vstup.Kurz is { } kurz && (kurz < 0 || kurz > 359))
            return "Kurz je ve stupních, tedy 0 až 359.";

        var ted = cas.GetUtcNow();
        var (vyhlaseno, posun) = Spolecne.CasKlienta.Kdy(vstup.VyhlasenoV, ted);

        db.UkonyZaJizdy.Add(new UkonZaJizdy
        {
            RozjizdkaId = rozjizdka.Id,
            Druh = vstup.Druh,
            PrvekId = vstup.Prvek,
            // U chybějící značky se kurz ani délka nevyhlašují; kdyby je
            // klient poslal, zahodí se tady, ne až v zobrazení.
            Kurz = vstup.Druh == DruhUkonu.ZmenaUseku ? vstup.Kurz : null,
            Delka = vstup.Druh == DruhUkonu.ZmenaUseku ? vstup.Delka : ZmenaDelky.Beze,
            NahradniSirka = vstup.Druh == DruhUkonu.ChybejiciZnacka ? vstup.NahradniSirka : null,
            NahradniDelka = vstup.Druh == DruhUkonu.ChybejiciZnacka ? vstup.NahradniDelka : null,
            Poznamka = string.IsNullOrWhiteSpace(vstup.Poznamka) ? null : vstup.Poznamka.Trim(),
            VyhlasenoV = vyhlaseno,
            ZapsanoV = ted,
            PosunCasu = posun,
            VyhlasilId = kdo,
        });
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>Odvolá vyhlášený úkon. Jde to, jen dokud se rozjížďka jede.</summary>
    public async Task<string?> OdvolejAsync(int zavodId, int cislo, int ukonId, CancellationToken ct)
    {
        var ukon = await db.UkonyZaJizdy
            .Include(u => u.Rozjizdka)
            .FirstOrDefaultAsync(u => u.Id == ukonId
                                      && u.Rozjizdka!.ZavodId == zavodId
                                      && u.Rozjizdka.Cislo == cislo, ct);
        if (ukon is null) return "Takový úkon u téhle rozjížďky není.";
        if (ukon.Rozjizdka!.Stav != StavRozjizdky.Probiha)
            return "Rozjížďka se nejede. Co viselo na stěžni, se zpětně nemaže.";

        db.UkonyZaJizdy.Remove(ukon);
        await db.SaveChangesAsync(ct);
        return null;
    }
}
