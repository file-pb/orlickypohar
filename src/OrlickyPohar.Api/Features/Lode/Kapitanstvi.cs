using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Kdo je u lodi odpovědný a jak se to mění. Čisté funkce, bez databáze —
/// ze stejného důvodu jako u bodování: ptá se na ně každá změna pravomoci,
/// takže se to musí dát zkoušet bez Postgresu.
/// <para>
/// <b>Kapitánství se uděluje, nevzniká pořadím.</b> Do 5. 10. 2026 ho dával
/// připojovací kód prvnímu, kdo ho zadal, a nic ho pak nedokázalo přesunout:
/// roli existující vazby neměnila žádná cesta a posledního kapitána nejde
/// odebrat. Jedna špatně zadaná šestice písmen tím nechala loď se špatným
/// kapitánem a bez opravy mimo databázi.
/// </para>
/// </summary>
public static class Kapitanstvi
{
    /// <summary>
    /// Role, které za loď odpovídají. Majitel i kapitán: majitel smí všechno,
    /// co kapitán, takže loď s majitelem bez kapitána správce nemá.
    /// </summary>
    public static bool Odpovedny(RoleKLodi role) => role is RoleKLodi.Majitel or RoleKLodi.Kapitan;

    public const string PosledniOdpovedny =
        "Tohle je poslední kapitán lodi. Nejdřív urči jiného, pak tohohle odeber.";

    public const string MajitelNeniRole =
        "Majitele určuje vlastnictví lodi v ročníku, ne tahle obrazovka. "
        + "Komu má loď patřit, oprav v přihláškách ročníku.";

    /// <summary>
    /// Proč roli takhle změnit nejde — nebo <c>null</c>.
    /// <para>
    /// <paramref name="jinychOdpovednych"/> je počet <b>ostatních</b> vazeb
    /// lodi, které za ni odpovídají. Je to parametr, ne dotaz: pravidlo se
    /// musí dát ověřit bez databáze a volající ho stejně musí přečíst pod
    /// zámkem, jinak by dva souběžné převody obešly oba.
    /// </para>
    /// <para>
    /// <b>Stejná role není chyba.</b> Potvrzení kapitána, kterého kdysi
    /// udělal kód, je právě tenhle případ: role se nemění, mění se to, že za
    /// ni od teď někdo stojí.
    /// </para>
    /// </summary>
    public static string? ProcNejdeZmenit(RoleKLodi soucasna, RoleKLodi nova, int jinychOdpovednych)
    {
        if (nova == RoleKLodi.Majitel) return MajitelNeniRole;

        return Odpovedny(soucasna) && !Odpovedny(nova) && jinychOdpovednych == 0
            ? PosledniOdpovedny
            : null;
    }

    /// <summary>Proč vazbu odebrat nejde — nebo <c>null</c>.</summary>
    public static string? ProcNejdeOdebrat(RoleKLodi role, int jinychOdpovednych) =>
        Odpovedny(role) && jinychOdpovednych == 0 ? PosledniOdpovedny : null;

    /// <summary>
    /// Co se při převodu stane s dosavadní vazbou — nebo <c>null</c>, když se
    /// jí převod netýká.
    /// <para>
    /// <b>Dosavadní kapitán se stane posádkou, majitel zůstane majitelem.</b>
    /// Vlastnictví není pravomoc k předání: loď patří tomu, komu patří, a brát
    /// to převodem kapitánství by přepsalo fakt o ročníku kvůli rozdělení
    /// práce na vodě.
    /// </para>
    /// </summary>
    public static RoleKLodi? PriPrevodu(RoleKLodi soucasna) =>
        soucasna == RoleKLodi.Kapitan ? RoleKLodi.Posadka : null;

    /// <summary>
    /// Čeká tahle vazba na potvrzení správcem? Kapitán, kterého udělal
    /// připojovací kód a nikdo ho od té doby nepotvrdil.
    /// <para>
    /// Lodě z doby před opravou se nepřepisují hromadně: migrace by jim roli
    /// buď nechala bez prověření, nebo ji sebrala, i když je správná. Správce
    /// je proto dostane na obrazovku po jedné.
    /// </para>
    /// </summary>
    public static bool KeKontrole(RoleKLodi role, PuvodVazby puvod, bool urcenaRucne) =>
        Odpovedny(role) && puvod == PuvodVazby.Kod && !urcenaRucne;
}

/// <summary>
/// Dvě věci, které potřebuje každá změna vazby k lodi, ať přichází od
/// kapitána nebo od správce: zámek lodi a záznam změny.
/// </summary>
internal static class VazbyLodi
{
    /// <summary>
    /// Zamkne loď do konce transakce. <b>Bez tohohle je pravidlo o posledním
    /// kapitánovi jen zdání:</b> dva souběžné požadavky si každý přečte, že
    /// „jiný odpovědný ještě je", oba projdou a loď zůstane bez kapitána.
    /// Řádek lodi je tím nejmenším společným zámkem — vazby u ní vznikají
    /// a mizí, takže zamykat je samotné nestačí.
    /// </summary>
    public static Task ZamkniLodAsync(AppDbContext db, int lodId, CancellationToken ct) =>
        db.Database.ExecuteSqlAsync($"SELECT 1 FROM \"Lode\" WHERE \"Id\" = {lodId} FOR UPDATE", ct);

    /// <summary>
    /// Přidá záznam o změně role. Neukládá — patří do stejného
    /// <c>SaveChanges</c> jako změna samotná, jinak by šlo mít změnu bez
    /// záznamu.
    /// </summary>
    public static void Zaznamenej(
        AppDbContext db, int lodId, Guid komu,
        RoleKLodi? predchozi, RoleKLodi? nova, Guid? kdo, DateTimeOffset kdy) =>
        db.ZmenyRoli.Add(new ZmenaRoleKLodi
        {
            LodId = lodId,
            UzivatelId = komu,
            Predchozi = predchozi,
            Nova = nova,
            ZmenilId = kdo,
            ZmenenoV = kdy,
        });
}

/// <summary>Vazba k lodi, jak ji vidí správce ročníku.</summary>
public record VazbaSpravaDto(
    int Id,
    Guid UzivatelId,
    string Kdo,
    string? Email,
    RoleKLodi Role,
    PuvodVazby Puvod,
    DateTimeOffset VzniklaV,
    bool RoleUrcenaRucne,
    string? RoleUrcil,
    DateTimeOffset? RoleUrcenaV,
    bool KeKontrole);

/// <summary>
/// Loď ročníku i s tím, kdo k ní patří. <c>MaKapitana</c> je prázdná loď
/// ve smyslu pravomocí — posádku mít může a kapitána ne.
/// </summary>
public record LodSpravaDto(
    int LodId,
    string Nazev,
    string? CisloPlachty,
    string Kategorie,
    bool MaKapitana,
    bool KeKontrole,
    IReadOnlyList<VazbaSpravaDto> Vazby);

/// <summary>Jedna změna role v historii lodi.</summary>
public record ZmenaRoleDto(
    string Kdo, RoleKLodi? Predchozi, RoleKLodi? Nova, string? Zmenil, DateTimeOffset ZmenenoV);

/// <summary>Loď, její vazby a historie změn — podklad jedné obrazovky.</summary>
public record LodDetailSpravaDto(LodSpravaDto Lod, IReadOnlyList<ZmenaRoleDto> Zmeny);

/// <summary>Koho má správce určit kapitánem.</summary>
public record UrceniKapitanaVstup(Guid UzivatelId);

/// <summary>Jakou roli má vazba mít.</summary>
public record ZmenaRoleVstup(RoleKLodi Role);

/// <summary>
/// Určení kapitána a opravy rolí u lodi. <b>Pravomoc správce ročníku</b>,
/// ne pořadatele jedné regaty: vazba k lodi platí celý rok a napříč
/// zastávkami, takže pověření k jedné regatě na ni nemá dosáhnout
/// (oponentura, 5. 10. 2026).
/// <para>
/// Každá změna běží <b>v jedné transakci se zamčenou lodí</b> a nechává po
/// sobě záznam. Obojí je tu kvůli témuž: pravomoc, kterou nejde dohledat
/// ani spolehlivě omezit, není pravomoc.
/// </para>
/// </summary>
public class KapitanstviSprava(AppDbContext db, TimeProvider cas, ILogger<KapitanstviSprava> log)
{
    /// <summary>
    /// Lodě ročníku i s vazbami, podle jména. Lodě, které na někoho čekají —
    /// bez kapitána nebo s kapitánem od kódu — jsou první: to je ta práce,
    /// kterou obrazovka má nabídnout.
    /// </summary>
    public async Task<List<LodSpravaDto>> SeznamAsync(int serieId, CancellationToken ct)
    {
        var lode = await db.Prihlasky
            .Where(p => p.SerieId == serieId)
            .Select(p => new
            {
                p.LodId,
                p.Lod!.Nazev,
                p.Lod.CisloPlachty,
                Kategorie = p.Kategorie!.Nazev,
                KategoriePoradi = p.Kategorie.Poradi,
            })
            .ToListAsync(ct);

        var lodeId = lode.Select(l => l.LodId).ToList();

        // Pravidla se dopočítávají až nad hotovými řádky: `KeKontrole` je
        // čistá funkce a do SQL se nepřeloží.
        var vazby = await db.VazbyKLodim
            .Where(v => lodeId.Contains(v.LodId))
            .OrderBy(v => v.Role).ThenBy(v => v.VzniklaV)
            .Select(v => new
            {
                v.LodId, v.Id, v.UzivatelId,
                Kdo = v.Uzivatel!.Zobrazovane,
                v.Uzivatel.Email,
                v.Role, v.Puvod, v.VzniklaV,
                Urcena = v.RoleUrcilId != null,
                Urcil = v.RoleUrcil!.Zobrazovane,
                v.RoleUrcenaV,
            })
            .ToListAsync(ct);

        var podleLodi = vazby
            .GroupBy(v => v.LodId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<VazbaSpravaDto>)
                [
                    .. g.Select(v => new VazbaSpravaDto(
                        v.Id, v.UzivatelId, v.Kdo, v.Email, v.Role, v.Puvod, v.VzniklaV,
                        v.Urcena, v.Urcil, v.RoleUrcenaV,
                        Kapitanstvi.KeKontrole(v.Role, v.Puvod, v.Urcena))),
                ]);

        return
        [
            .. lode
                .Select(l =>
                {
                    var moje = podleLodi.GetValueOrDefault(l.LodId, []);
                    return new LodSpravaDto(
                        l.LodId, l.Nazev, l.CisloPlachty, l.Kategorie,
                        moje.Any(v => Kapitanstvi.Odpovedny(v.Role)),
                        moje.Any(v => v.KeKontrole),
                        moje);
                })
                // Co čeká na správce, patří nahoru: loď bez kapitána, pak
                // kapitán od kódu, pak zbytek abecedně.
                .OrderBy(l => l.MaKapitana)
                .ThenByDescending(l => l.KeKontrole)
                .ThenBy(l => l.Nazev, Jmena.Cesky),
        ];
    }

    /// <summary>Loď, její vazby a historie změn. <c>null</c>, když v ročníku není.</summary>
    public async Task<LodDetailSpravaDto?> DetailAsync(int serieId, int lodId, CancellationToken ct)
    {
        var lod = (await SeznamAsync(serieId, ct)).FirstOrDefault(l => l.LodId == lodId);
        if (lod is null) return null;

        var zmeny = await db.ZmenyRoli
            .Where(z => z.LodId == lodId)
            .OrderByDescending(z => z.ZmenenoV).ThenByDescending(z => z.Id)
            .Select(z => new ZmenaRoleDto(
                z.Uzivatel!.Zobrazovane, z.Predchozi, z.Nova, z.Zmenil!.Zobrazovane, z.ZmenenoV))
            .ToListAsync(ct);

        return new LodDetailSpravaDto(lod, zmeny);
    }

    /// <summary>
    /// Určí kapitána lodi. Vrací text chyby, nebo <c>null</c>.
    /// <para>
    /// <b>Jeden úkon, ne dva.</b> Povýšení nového a snížení dosavadního
    /// kapitána patří do jedné transakce: mezi dvěma požadavky by loď měla
    /// dva kapitány, nebo žádného — a kdyby druhý nedošel, zůstala by tak.
    /// </para>
    /// <para>
    /// Člověk, který k lodi ještě nepatří, vazbu dostane. Správce tím smí
    /// přidat i někoho, kdo se nepřipojil kódem — je to ta nouzová páka,
    /// kterou měl mít od začátku (<see cref="PuvodVazby.Rucne"/>).
    /// </para>
    /// </summary>
    public async Task<string?> UrciKapitanaAsync(
        int lodId, Guid uzivatelId, Guid kdo, CancellationToken ct)
    {
        await using var transakce = await db.Database.BeginTransactionAsync(ct);
        await VazbyLodi.ZamkniLodAsync(db, lodId, ct);

        if (!await db.Uzivatele.AnyAsync(u => u.Id == uzivatelId, ct))
            return "Takový účet tu není. Kapitánem jde určit jen někoho, kdo se už přihlásil.";

        var ted = cas.GetUtcNow();
        var vazby = await db.VazbyKLodim.Where(v => v.LodId == lodId).ToListAsync(ct);
        var novy = vazby.FirstOrDefault(v => v.UzivatelId == uzivatelId);

        if (novy is null)
        {
            db.VazbyKLodim.Add(new VazbaKLodi
            {
                LodId = lodId,
                UzivatelId = uzivatelId,
                Role = RoleKLodi.Kapitan,
                Puvod = PuvodVazby.Rucne,
                VzniklaV = ted,
                PotvrdilId = kdo,
                RoleUrcilId = kdo,
                RoleUrcenaV = ted,
            });
            VazbyLodi.Zaznamenej(db, lodId, uzivatelId, null, RoleKLodi.Kapitan, kdo, ted);
        }
        else if (novy.Role != RoleKLodi.Kapitan && novy.Role != RoleKLodi.Majitel)
        {
            VazbyLodi.Zaznamenej(db, lodId, uzivatelId, novy.Role, RoleKLodi.Kapitan, kdo, ted);
            novy.Role = RoleKLodi.Kapitan;
            Urcil(novy, kdo, ted);
        }
        else
        {
            // Už odpovědný je. Potvrzení ale něco mění: od teď za jeho roli
            // stojí správce, ne pořadí u stolu — a párování do ní nesahá.
            Urcil(novy, kdo, ted);
        }

        foreach (var stara in vazby.Where(v => v.UzivatelId != uzivatelId))
        {
            if (Kapitanstvi.PriPrevodu(stara.Role) is not { } snizena) continue;

            VazbyLodi.Zaznamenej(db, lodId, stara.UzivatelId, stara.Role, snizena, kdo, ted);
            stara.Role = snizena;
            Urcil(stara, kdo, ted);
        }

        await db.SaveChangesAsync(ct);
        await transakce.CommitAsync(ct);

        log.LogInformation("Správce {Kdo} určil kapitánem lodi {Lod} účet {Uzivatel}",
            kdo, lodId, uzivatelId);
        return null;
    }

    /// <summary>
    /// Změní roli jedné vazby — snížení kapitána, povýšení na posádku
    /// z fanouška, nebo potvrzení té, která už platí. Vrací text chyby, nebo
    /// <c>null</c>.
    /// </summary>
    public async Task<string?> ZmenRoliAsync(
        int lodId, int vazbaId, RoleKLodi nova, Guid kdo, CancellationToken ct)
    {
        await using var transakce = await db.Database.BeginTransactionAsync(ct);
        await VazbyLodi.ZamkniLodAsync(db, lodId, ct);

        var vazba = await db.VazbyKLodim
            .FirstOrDefaultAsync(v => v.Id == vazbaId && v.LodId == lodId, ct);
        if (vazba is null) return "Takové připojení u lodi není.";

        var jinych = await db.VazbyKLodim.CountAsync(
            v => v.LodId == lodId && v.Id != vazbaId
                 && (v.Role == RoleKLodi.Majitel || v.Role == RoleKLodi.Kapitan), ct);

        if (Kapitanstvi.ProcNejdeZmenit(vazba.Role, nova, jinych) is { } chyba) return chyba;

        var ted = cas.GetUtcNow();
        if (vazba.Role != nova)
            VazbyLodi.Zaznamenej(db, lodId, vazba.UzivatelId, vazba.Role, nova, kdo, ted);

        vazba.Role = nova;
        Urcil(vazba, kdo, ted);

        await db.SaveChangesAsync(ct);
        await transakce.CommitAsync(ct);

        log.LogInformation("Správce {Kdo} dal vazbě {Vazba} u lodi {Lod} roli {Role}",
            kdo, vazbaId, lodId, nova);
        return null;
    }

    private static void Urcil(VazbaKLodi vazba, Guid kdo, DateTimeOffset kdy)
    {
        vazba.RoleUrcilId = kdo;
        vazba.RoleUrcenaV = kdy;
    }
}
