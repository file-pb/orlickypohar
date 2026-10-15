using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Bod prvku. <b>Vždycky záznam značky</b> — bóje, plavidlo i objekt na
/// břehu (Filip, 10. 10. 2026). Značení jde s ním, protože jen podle něj
/// se pozná, co na tom místě vlastně je: plavidlo ani molo nemají barvu
/// ani tvar, takže bez něj by to byl bezejmenný bod.
/// </summary>
public record KonecBojeDto(
    int Id, string Nazev, double Sirka, double Delka, DruhZnaceni? Znaceni = null);

/// <summary>Prvek trati, jak ho vidí správa.</summary>
public record PrvekDto(
    int Id,
    TypPrvku Typ,
    int Poradi,
    StranaPrvku? Strana,
    string? Poznamka,
    KonecBojeDto A,
    KonecBojeDto? B,
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
    DruhStartu? DruhStartu = null,
    /// <summary>
    /// Čím je ten nebójový bod značený — plavidlo, objekt na břehu. Vznikne
    /// z něj záznam značky, takže značení patří k němu, ne k prvku.
    /// <para>Stojí na konci schválně: vložené doprostřed by rozbilo poziční volání.</para>
    /// </summary>
    DruhZnaceni? KonecBZnaceni = null);

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
public class PrvkySprava(AppDbContext db, TratSprava trate, TimeProvider cas)
{
    /// <summary>Prvky trati v pořadí. Bez trati prázdno, ne chyba.</summary>
    public async Task<List<PrvekDto>> SeznamAsync(
        int zavodId, CancellationToken ct, int? tratId = null)
    {
        // Bez vybrané trati platí dohad „nejnovější" jako dřív; s vybranou
        // se vydá právě ona. Cizí id vrátí prázdno, ne jinou trať.
        if (await trate.VybranaAsync(zavodId, tratId, ct) is not { } trat) return [];

        return await db.PrvkyTrati
            .Where(p => p.TratId == trat.Id)
            .OrderBy(p => p.Poradi).ThenBy(p => p.Id)
            .Select(p => new PrvekDto(
                p.Id, p.Typ, p.Poradi, p.Strana, p.Poznamka,
                new KonecBojeDto(
                    p.BojeA!.Id, p.BojeA.Nazev, p.BojeA.Sirka, p.BojeA.Delka, p.BojeA.Znaceni),
                p.BojeB == null
                    ? null
                    : new KonecBojeDto(
                        p.BojeB.Id, p.BojeB.Nazev, p.BojeB.Sirka, p.BojeB.Delka, p.BojeB.Znaceni),
                p.Smer, p.DruhStartu))
            .ToListAsync(ct);
    }

    /// <summary>Založí prvek. Vrací ho, nebo důvod, proč to nejde.</summary>
    public async Task<(PrvekDto? Prvek, string? Chyba)> ZalozAsync(
        int zavodId, PrvekVstup vstup, Guid kdo, CancellationToken ct)
    {
        if (await ProcNejdeAsync(zavodId, vstup, ct) is { } chyba) return (null, chyba);

        var trat = await trate.AktualniAsync(zavodId, ct);
        var bojeBId = await ZaznamBoduAsync(zavodId, vstup, kdo, ct);
        var prvek = new PrvekTrati { TratId = trat!.Id };
        Napln(prvek, vstup, bojeBId);

        db.PrvkyTrati.Add(prvek);
        await db.SaveChangesAsync(ct);

        return (await JedenAsync(prvek.Id, ct), null);
    }

    /// <summary>Přepíše prvek. Vrací ho, nebo důvod, proč to nejde.</summary>
    public async Task<(PrvekDto? Prvek, string? Chyba)> UpravAsync(
        int zavodId, int prvekId, PrvekVstup vstup, Guid kdo, CancellationToken ct)
    {
        if (await ProcNejdeAsync(zavodId, vstup, ct) is { } chyba) return (null, chyba);

        if (await NajdiAsync(zavodId, prvekId, ct) is not { } prvek)
            return (null, "Takový prvek na téhle trati není.");

        // Úprava, která by z bodu udělala další záznam, i když prvek už
        // jednu značku na druhém konci má. Tiché zdvojení by nechalo ve
        // vodě značku, kterou nikdo nepostavil, a tiché zahození bodu by
        // zase zapřelo, co uživatel poslal — tak se to řekne nahlas.
        // Web tuhle cestu nevolá, prvky jen zakládá a maže.
        if (prvek.BojeBId is not null && vstup.BojeBId is null
            && vstup.KonecBSirka is not null && vstup.KonecBDelka is not null)
            return (null, "Tenhle prvek už má druhý konec jako značku. Vyber značku, "
                          + "nebo prvek smaž a postav znovu.");

        var bojeBId = await ZaznamBoduAsync(zavodId, vstup, kdo, ct);
        Napln(prvek, vstup, bojeBId);
        await db.SaveChangesAsync(ct);

        return (await JedenAsync(prvek.Id, ct), null);
    }

    /// <summary>
    /// Nebójový bod se zapíše jako <b>záznam značky</b> (Filip, 10. 10. 2026:
    /// <i>„cíl mezi lodí a molem je dost pravděpodobný“</i>). Vrací id značky
    /// pro druhý konec, nebo <c>BojeBId</c> ze vstupu, když bóje přišla.
    ///
    /// <para>
    /// <b>Zdroj je mapa, ne telefon.</b> Jsou to opsané souřadnice, které
    /// nikdo neměřil, takže přesnost zůstane prázdná — jinak by v záznamu
    /// stálo číslo bez měření.
    /// </para>
    ///
    /// <para>
    /// <b>Značení se nedoplňuje.</b> Když ho vstup neřekne, zůstane prázdné:
    /// z popisu „plavidlo komise“ by se dalo hádat, ale hádat se v záznamu
    /// nemá.
    /// </para>
    /// </summary>
    private async Task<int?> ZaznamBoduAsync(
        int zavodId, PrvekVstup v, Guid kdo, CancellationToken ct)
    {
        if (v.BojeBId is not null) return v.BojeBId;
        if (v.KonecBSirka is not { } sirka || v.KonecBDelka is not { } delka) return null;

        // Za poslední stojící značku, stejně jako u pípnutí.
        var poradi = (await db.Boje
            .Where(b => b.ZavodId == zavodId && b.NahrazenaV == null && b.SebranaV == null)
            .MaxAsync(b => (int?)b.Poradi, ct) ?? 0) + 1;

        var znacka = new Boje
        {
            ZavodId = zavodId,
            Nazev = v.KonecBPopis!.Trim(),
            Poradi = poradi,
            Sirka = sirka,
            Delka = delka,
            Zdroj = ZdrojPolohy.Mapa,
            Znaceni = v.KonecBZnaceni,
            PostavenaV = cas.GetUtcNow(),
            PostavilId = kdo,
        };

        db.Boje.Add(znacka);
        await db.SaveChangesAsync(ct);
        return znacka.Id;
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

    private static void Napln(PrvekTrati prvek, PrvekVstup v, int? bojeBId)
    {
        prvek.Typ = v.Typ;
        prvek.Poradi = v.Poradi;
        prvek.Strana = v.Strana;
        prvek.Poznamka = string.IsNullOrWhiteSpace(v.Poznamka) ? null : v.Poznamka.Trim();
        prvek.BojeAId = v.BojeAId;
        prvek.BojeBId = bojeBId;

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
                new KonecBojeDto(
                    p.BojeA!.Id, p.BojeA.Nazev, p.BojeA.Sirka, p.BojeA.Delka, p.BojeA.Znaceni),
                p.BojeB == null
                    ? null
                    : new KonecBojeDto(
                        p.BojeB.Id, p.BojeB.Nazev, p.BojeB.Sirka, p.BojeB.Delka, p.BojeB.Znaceni),
                p.Smer, p.DruhStartu))
            .FirstOrDefaultAsync(ct);
}
