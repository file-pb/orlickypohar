using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>Konec prvku, který je bóje.</summary>
public record KonecBojeDto(int Id, string Nazev, double Sirka, double Delka);

/// <summary>Konec prvku, který bóje není — plavidlo komise, bod na břehu.</summary>
public record KonecBodDto(double Sirka, double Delka, string Popis);

/// <summary>Prvek trati, jak ho vidí správa.</summary>
public record PrvekDto(
    int Id,
    TypPrvku Typ,
    int Poradi,
    StranaPrvku? Strana,
    string? Poznamka,
    KonecBojeDto A,
    KonecBojeDto? B,
    KonecBodDto? BodB,
    /// <summary>Jen u startu: světová strana, kterou se startuje.</summary>
    SvetovaStrana? Smer = null,
    /// <summary>Jen u startu: pevná linie, nebo otevírající se brána.</summary>
    DruhStartu? DruhStartu = null);

/// <summary>Co přijde při zakládání nebo úpravě prvku.</summary>
public record PrvekVstup(
    TypPrvku Typ,
    int Poradi,
    int BojeAId,
    int? BojeBId = null,
    double? KonecBSirka = null,
    double? KonecBDelka = null,
    string? KonecBPopis = null,
    StranaPrvku? Strana = null,
    string? Poznamka = null,
    SvetovaStrana? Smer = null,
    DruhStartu? DruhStartu = null);

/// <summary>
/// Prvky trati: čára, brána, odskok a značka.
///
/// <para>
/// <b>Zámek platí i na prvky.</b> Prvek je rozhodnutí o trati — typ, pořadí,
/// strana —, takže do přijaté trati se jím sahat nesmí o nic víc než
/// pípnutím. Kdyby to šlo, dala by se veřejně vydaná trať přeskládat pod
/// lodí, která podle ní pluje, aniž by se o tom venku vědělo.
/// </para>
///
/// <para>
/// <b>Konce musí být bóje té regaty, a stojící.</b> Prvek ukazující na
/// sebranou bóji by kreslil průjezd kolem něčeho, co leží na břehu.
/// </para>
/// </summary>
public class PrvkySprava(AppDbContext db, TratSprava trate)
{
    /// <summary>Prvky trati v pořadí. Bez trati prázdno, ne chyba.</summary>
    public async Task<List<PrvekDto>> SeznamAsync(int zavodId, CancellationToken ct)
    {
        if (await trate.AktualniAsync(zavodId, ct) is not { } trat) return [];

        return await db.PrvkyTrati
            .Where(p => p.TratId == trat.Id)
            .OrderBy(p => p.Poradi).ThenBy(p => p.Id)
            .Select(p => new PrvekDto(
                p.Id, p.Typ, p.Poradi, p.Strana, p.Poznamka,
                new KonecBojeDto(p.BojeA!.Id, p.BojeA.Nazev, p.BojeA.Sirka, p.BojeA.Delka),
                p.BojeB == null
                    ? null
                    : new KonecBojeDto(p.BojeB.Id, p.BojeB.Nazev, p.BojeB.Sirka, p.BojeB.Delka),
                p.KonecBSirka == null || p.KonecBDelka == null
                    ? null
                    : new KonecBodDto(p.KonecBSirka.Value, p.KonecBDelka.Value, p.KonecBPopis!),
                p.Smer, p.DruhStartu))
            .ToListAsync(ct);
    }

    /// <summary>Založí prvek. Vrací ho, nebo důvod, proč to nejde.</summary>
    public async Task<(PrvekDto? Prvek, string? Chyba)> ZalozAsync(
        int zavodId, PrvekVstup vstup, CancellationToken ct)
    {
        if (await ProcNejdeAsync(zavodId, vstup, ct) is { } chyba) return (null, chyba);

        var trat = await trate.AktualniAsync(zavodId, ct);
        var prvek = new PrvekTrati { TratId = trat!.Id };
        Napln(prvek, vstup);

        db.PrvkyTrati.Add(prvek);
        await db.SaveChangesAsync(ct);

        return (await JedenAsync(prvek.Id, ct), null);
    }

    /// <summary>Přepíše prvek. Vrací ho, nebo důvod, proč to nejde.</summary>
    public async Task<(PrvekDto? Prvek, string? Chyba)> UpravAsync(
        int zavodId, int prvekId, PrvekVstup vstup, CancellationToken ct)
    {
        if (await ProcNejdeAsync(zavodId, vstup, ct) is { } chyba) return (null, chyba);

        if (await NajdiAsync(zavodId, prvekId, ct) is not { } prvek)
            return (null, "Takový prvek na téhle trati není.");

        Napln(prvek, vstup);
        await db.SaveChangesAsync(ct);

        return (await JedenAsync(prvek.Id, ct), null);
    }

    /// <summary>Smaže prvek. Vrací důvod, proč to nejde — nebo <c>null</c>.</summary>
    public async Task<string?> SmazAsync(int zavodId, int prvekId, CancellationToken ct)
    {
        if (await trate.ProcNejdeStavetAsync(zavodId, ct) is { } zamceno) return zamceno;

        if (await NajdiAsync(zavodId, prvekId, ct) is not { } prvek)
            return "Takový prvek na téhle trati není.";

        // Prvek se maže doopravdy, na rozdíl od bóje. Není to měření, je to
        // rozhodnutí — a špatně zadané rozhodnutí nemá cenu držet v historii.
        db.PrvkyTrati.Remove(prvek);
        await db.SaveChangesAsync(ct);
        return null;
    }

    private async Task<string?> ProcNejdeAsync(int zavodId, PrvekVstup v, CancellationToken ct)
    {
        if (await trate.ProcNejdeStavetAsync(zavodId, ct) is { } zamceno) return zamceno;
        if (await trate.AktualniAsync(zavodId, ct) is null)
            return "Tahle regata zatím nemá ani jednu bóji, takže ani trať.";

        if (Prvky.ProcNejde(
                v.Typ, v.BojeBId, v.KonecBSirka, v.KonecBDelka, v.KonecBPopis, v.Strana,
                v.Poznamka, v.Smer, v.DruhStartu) is { } chyba)
            return chyba;

        if (v.Poradi <= 0) return "Pořadí v trati začíná jedničkou.";
        if (v.BojeAId == v.BojeBId) return "Oba konce nemůžou být tatáž bóje.";

        if (await StojiAsync(zavodId, v.BojeAId, ct) is { } prvni) return prvni;
        if (v.BojeBId is { } b && await StojiAsync(zavodId, b, ct) is { } druhy) return druhy;

        return null;
    }

    /// <summary>Stojí ta bóje u téhle regaty? Jinak důvod, proč ne.</summary>
    private async Task<string?> StojiAsync(int zavodId, int bojeId, CancellationToken ct)
    {
        var boje = await db.Boje
            .Where(b => b.Id == bojeId && b.ZavodId == zavodId)
            .Select(b => new { b.NahrazenaV, b.SebranaV })
            .FirstOrDefaultAsync(ct);

        if (boje is null) return "Taková bóje u téhle regaty není.";
        if (boje.SebranaV is not null)
            return "Ta bóje je sebraná z vody, takže k prvku na trati patřit nemůže.";
        if (boje.NahrazenaV is not null)
            return "Ta bóje je přenastavená. Vyber tu, která na trati stojí teď.";

        return null;
    }

    private static void Napln(PrvekTrati prvek, PrvekVstup v)
    {
        prvek.Typ = v.Typ;
        prvek.Poradi = v.Poradi;
        prvek.Strana = v.Strana;
        prvek.Poznamka = string.IsNullOrWhiteSpace(v.Poznamka) ? null : v.Poznamka.Trim();
        prvek.BojeAId = v.BojeAId;
        prvek.BojeBId = v.BojeBId;
        prvek.KonecBSirka = v.KonecBSirka;
        prvek.KonecBDelka = v.KonecBDelka;
        prvek.KonecBPopis = string.IsNullOrWhiteSpace(v.KonecBPopis) ? null : v.KonecBPopis.Trim();
        prvek.Smer = v.Smer;
        prvek.DruhStartu = v.DruhStartu;
    }

    private Task<PrvekTrati?> NajdiAsync(int zavodId, int prvekId, CancellationToken ct) =>
        db.PrvkyTrati.FirstOrDefaultAsync(
            p => p.Id == prvekId && p.Trat!.ZavodId == zavodId, ct);

    private async Task<PrvekDto?> JedenAsync(int prvekId, CancellationToken ct) =>
        await db.PrvkyTrati
            .Where(p => p.Id == prvekId)
            .Select(p => new PrvekDto(
                p.Id, p.Typ, p.Poradi, p.Strana, p.Poznamka,
                new KonecBojeDto(p.BojeA!.Id, p.BojeA.Nazev, p.BojeA.Sirka, p.BojeA.Delka),
                p.BojeB == null
                    ? null
                    : new KonecBojeDto(p.BojeB.Id, p.BojeB.Nazev, p.BojeB.Sirka, p.BojeB.Delka),
                p.KonecBSirka == null || p.KonecBDelka == null
                    ? null
                    : new KonecBodDto(p.KonecBSirka.Value, p.KonecBDelka.Value, p.KonecBPopis!),
                p.Smer, p.DruhStartu))
            .FirstOrDefaultAsync(ct);
}
