using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Stavění a přenastavování bójí.
/// <para>
/// <b>Nic se nepřepisuje.</b> Přenastavení je nový záznam a ten starý se
/// označí za nahrazený; sebrání je razítko, ne smazání. Trasa lodi z té
/// doby se jinak nedá přečíst — ta se k trati vztahuje tak, jak stála
/// tehdy, ne jak stojí teď.
/// </para>
/// </summary>
public class BojeSprava(
    AppDbContext db, TimeProvider cas, Fotky.IUloziste uloziste, ILogger<BojeSprava> log)
{
    /// <summary>Bóje regaty. Platné podle pořadí, historie až za nimi.</summary>
    public async Task<List<BojeDto>> SeznamAsync(int zavodId, bool iHistorie, CancellationToken ct)
    {
        var dotaz = db.Boje.Where(b => b.ZavodId == zavodId);
        if (!iHistorie) dotaz = dotaz.Where(b => b.NahrazenaV == null && b.SebranaV == null);

        // Načítá se celý záznam, ne projekce do DTO: adresy fotky skládá
        // `Fotka.Dto` z veřejné adresy úložiště a to je čistá funkce, kterou
        // EF do SQL nepřeloží. Bójí je na regatě pár, takže o nic nejde.
        var boje = await dotaz
            .Include(b => b.Postavil)
            .Include(b => b.Fotky)
            .OrderBy(b => b.NahrazenaV == null && b.SebranaV == null ? 0 : 1)
            .ThenBy(b => b.Poradi)
            .ThenByDescending(b => b.PostavenaV)
            .ToListAsync(ct);

        return [.. boje.Select(Dto)];
    }

    /// <summary>Bóje, jak ji vidí klient. Jedno místo, ať se tvary nerozejdou.</summary>
    private BojeDto Dto(Boje b) => new(
        b.Id, b.Nazev, b.Poradi, b.Sirka, b.Delka, b.PresnostM, b.PostavenaV,
        b.Postavil?.Zobrazovane, b.SebranaV != null,
        [.. b.Fotky
            .OrderBy(f => f.NahranoV)
            .Select(f => Fotky.Nahravani.Dto(f, uloziste.VerejnaAdresa))
            .OfType<Fotky.ObrazekDto>()],
        b.Zdroj);

    /// <summary>
    /// Zapíše pípnutí. Při přenastavení převezme pořadí i jméno po bóji,
    /// kterou nahrazuje — pořadatel u vody nemá co přepisovat.
    /// </summary>
    public async Task<(BojeDto? Boje, string? Chyba)> PipniAsync(
        int zavodId, PipnutiVstup vstup, Guid kdo, CancellationToken ct)
    {
        if (Pipnuti.ProcNejde(vstup) is { } chyba) return (null, chyba);

        var ted = cas.GetUtcNow();
        Boje? stara = null;

        if (vstup.NahrazujeId is { } nahrazuje)
        {
            stara = await db.Boje
                .FirstOrDefaultAsync(b => b.Id == nahrazuje && b.ZavodId == zavodId, ct);
            if (stara is null) return (null, "Bóje, kterou chceš přenastavit, u téhle regaty není.");
            if (stara.NahrazenaV is not null) return (null, "Tahle bóje už je přenastavená.");
            // Sebraná bóje ve vodě není, takže se nemá co přenastavovat.
            // Dřív se hlídalo jen nahrazení, takže šla sebraná bóje
            // přenastavením „oživit" — vznikl by platný záznam navazující
            // na něco, co leží na břehu (oponentura, 9. 10. 2026).
            if (stara.SebranaV is not null)
                return (null, "Tahle bóje je sebraná z vody. Pípni ji jako novou.");
        }

        // „Za poslední" znamená za poslední **na trati**, ne za poslední,
        // která kdy existovala. Dřív se počítalo přes všechny záznamy včetně
        // nahrazených a sebraných, takže po sebrání poslední bóje dostala
        // další číslo, které na trati nikomu nepatřilo, a čísla rostla
        // s historií (oponentura, 9. 10. 2026).
        var poradi = vstup.Poradi > 0
            ? vstup.Poradi
            : stara?.Poradi ?? (await db.Boje
                .Where(b => b.ZavodId == zavodId && b.NahrazenaV == null && b.SebranaV == null)
                .MaxAsync(b => (int?)b.Poradi, ct) ?? 0) + 1;

        var nova = new Boje
        {
            ZavodId = zavodId,
            Nazev = vstup.Nazev!.Trim(),
            Poradi = poradi,
            Sirka = vstup.Sirka,
            Delka = vstup.Delka,
            PresnostM = vstup.PresnostM,
            Zdroj = vstup.Zdroj ?? ZdrojPolohy.Telefon,
            PostavenaV = ted,
            PostavilId = kdo,
            NahrazujeId = stara?.Id,
        };

        db.Boje.Add(nova);
        if (stara is not null) stara.NahrazenaV = ted;
        await db.SaveChangesAsync(ct);

        log.LogInformation(
            "Bóje {Nazev} u regaty {Zavod} {Co} ze zdroje {Zdroj} (přesnost {Presnost} m)",
            nova.Nazev, zavodId, stara is null ? "postavena" : "přenastavena",
            nova.Zdroj, vstup.PresnostM);

        await db.Entry(nova).Reference(b => b.Postavil).LoadAsync(ct);
        // Fotky se přikládají až po pípnutí vlastními požadavky: dokud
        // poloha neexistuje, není k čemu je přiložit.
        return (Dto(nova), null);
    }

    /// <summary>Označí bóji za sebranou. Ze zápisu nemizí.</summary>
    public async Task<string?> SeberAsync(int zavodId, int bojeId, CancellationToken ct)
    {
        var boje = await db.Boje.FirstOrDefaultAsync(b => b.Id == bojeId && b.ZavodId == zavodId, ct);
        if (boje is null) return "Taková bóje u téhle regaty není.";
        if (boje.SebranaV is not null) return null;

        boje.SebranaV = cas.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return null;
    }
}
