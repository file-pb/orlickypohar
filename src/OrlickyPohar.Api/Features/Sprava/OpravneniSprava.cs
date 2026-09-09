using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Sprava;

/// <summary>Jedno udělené oprávnění tak, jak ho vidí obrazovka správce.</summary>
public record OpravneniRadek(
    int Id,
    Guid UzivatelId,
    string Zobrazovane,
    string? Email,
    Role Role,
    string? Zavod,
    DateTimeOffset UdelenoV);

/// <summary>Zastávka ročníku jako volba rozsahu, i nepublikovaná.</summary>
public record ZastavkaVolbaDto(string Slug, string Nazev);

/// <summary>
/// Všechno, co obrazovka správy potřebuje: udělená oprávnění a seznam
/// zastávek, na které jdou udělit.
/// <para>
/// Zastávky se schválně berou odsud a ne z veřejného čtení ročníku:
/// <b>nepublikovaná zastávka se veřejně nevydává</b>, ale pořadatele
/// potřebuje dřív, než se zveřejní — jinak by se role dala udělit až poté,
/// co je závod venku.
/// </para>
/// </summary>
public record PrehledOpravneniDto(
    string Serie,
    string Nazev,
    IReadOnlyList<ZastavkaVolbaDto> Zastavky,
    IReadOnlyList<OpravneniRadek> Opravneni);

/// <summary>Jak dopadlo udělení.</summary>
public enum StavUdeleni
{
    Udeleno,

    /// <summary>Uživatel tu roli v tom rozsahu už měl. Není to chyba.</summary>
    JizMel,

    /// <summary>Na ten e-mail se ještě nikdo nikdy nepřihlásil.</summary>
    UcetNeni,

    /// <summary>Týž e-mail u dvou účtů — nedá se poznat, komu roli dát.</summary>
    VicUctu,
}

/// <summary>Jak dopadlo odebrání.</summary>
public enum StavOdebrani
{
    Odebrano,

    /// <summary>Oprávnění neexistuje, nebo patří jiné sérii.</summary>
    Neni,

    /// <summary>Poslední správce ročníku. Odebrat ho znamená zamknout se ven.</summary>
    PosledniSpravce,
}

/// <summary>
/// Čtení a zápis oprávnění. Práce s databází je schválně oddělená od
/// endpointu: kontrola práv a překlad slugů patří k HTTP, tohle ne — a
/// integrační testy tak nepotřebují ani token, ani nakonfigurovaného
/// poskytovatele identity.
/// <para>
/// Metody berou <b>identifikátory, ne slugy</b>. Překlad je jen jeden a bydlí
/// v <see cref="Rozsahy"/>, včetně kontroly, že závod patří té sérii, na
/// kterou se ptáme.
/// </para>
/// </summary>
public class OpravneniSprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>
    /// Podklad pro obrazovku správy: oprávnění ročníku i jeho zastávek a
    /// zastávky, na které jdou role udělit.
    /// <para>
    /// Zastávková oprávnění se nevynechávají: správce se ptá „kdo na tenhle
    /// ročník smí", a pořadatel jedné zastávky je taky odpověď.
    /// </para>
    /// </summary>
    public async Task<PrehledOpravneniDto?> PrehledAsync(int serieId, CancellationToken ct)
    {
        var serie = await db.Serie
            .Where(s => s.Id == serieId)
            .Select(s => new { s.Slug, s.Nazev })
            .FirstOrDefaultAsync(ct);

        if (serie is null) return null;

        var zastavky = await db.Zavody
            .Where(z => z.SerieId == serieId)
            .OrderBy(z => z.Poradi).ThenBy(z => z.Datum)
            .Select(z => new ZastavkaVolbaDto(z.Slug, z.Nazev))
            .ToListAsync(ct);

        return new PrehledOpravneniDto(
            serie.Slug, serie.Nazev, zastavky, await SeznamAsync(serieId, ct));
    }

    /// <summary>Udělená oprávnění ročníku i jeho zastávek.</summary>
    public async Task<List<OpravneniRadek>> SeznamAsync(int serieId, CancellationToken ct) =>
        await db.Opravneni
            .Where(o => o.SerieId == serieId)
            .OrderBy(o => o.Uzivatel!.Zobrazovane).ThenBy(o => o.Id)
            .Select(o => new OpravneniRadek(
                o.Id,
                o.UzivatelId,
                o.Uzivatel!.Zobrazovane,
                o.Uzivatel.Email,
                o.Role,
                o.Zavod!.Slug,
                o.UdelenoV))
            .ToListAsync(ct);

    /// <summary>Má ročník aspoň jednoho správce? Na tom stojí bootstrap.</summary>
    public Task<bool> MaSpravceAsync(int serieId, CancellationToken ct) =>
        db.Opravneni.AnyAsync(o => o.SerieId == serieId && o.Role == Role.Spravce, ct);

    /// <summary>
    /// Udělí roli podle e-mailu.
    /// <para>
    /// <b>Podle e-mailu, ne podle identifikátoru</b> — ten člověk nikde
    /// nevidí. Účet ale vzniká až prvním přihlášením, takže komu se ještě
    /// nepřihlásil, roli dát nejde a je to potřeba říct nahlas. Zvací tok
    /// je vlastní věc a znamenal by rozesílat poštu dřív než administrace
    /// vůbec vznikne.
    /// </para>
    /// </summary>
    public async Task<(StavUdeleni Stav, OpravneniRadek? Radek)> UdelAsync(
        int serieId, int? zavodId, string email, Role role, CancellationToken ct)
    {
        // Poskytovatelé si s velikostí písmen v e-mailu dělají, co chtějí,
        // a správce ho opisuje z papíru. Porovnávat doslova by znamenalo
        // „účet neexistuje" u účtu, který existuje.
        var hledany = email.Trim().ToLowerInvariant();

        var ucty = await db.Uzivatele
            .Where(u => u.Email != null && u.Email.ToLower() == hledany)
            .Select(u => new { u.Id, u.Zobrazovane, u.Email })
            .Take(2)
            .ToListAsync(ct);

        if (ucty.Count == 0) return (StavUdeleni.UcetNeni, null);

        // Dva účty s týmž e-mailem vzniknou po výměně poskytovatele nebo
        // když se tentýž člověk přihlásí dvěma cestami. Hádat, kterému roli
        // dát, je horší než odmítnout: špatný tip nikdo nepozná.
        if (ucty.Count > 1) return (StavUdeleni.VicUctu, null);

        var ucet = ucty[0];

        var stavajici = await db.Opravneni.FirstOrDefaultAsync(
            o => o.UzivatelId == ucet.Id && o.Role == role
                 && o.SerieId == serieId && o.ZavodId == zavodId, ct);

        // Druhé kliknutí na totéž není chyba. Unikátní index by z něj udělal
        // pád na půl cesty a správce by nevěděl, jestli role platí, nebo ne.
        if (stavajici is not null)
            return (StavUdeleni.JizMel, await RadekAsync(stavajici.Id, ct));

        var opravneni = new Opravneni
        {
            UzivatelId = ucet.Id,
            Role = role,
            SerieId = serieId,
            ZavodId = zavodId,
            UdelenoV = cas.GetUtcNow(),
        };

        db.Opravneni.Add(opravneni);
        await db.SaveChangesAsync(ct);

        return (StavUdeleni.Udeleno, await RadekAsync(opravneni.Id, ct));
    }

    /// <summary>
    /// Odebere oprávnění. <b>Posledního správce ročníku ne</b> — tím by se
    /// všichni zamkli ven a zpátky by vedla jen cesta přes importní token,
    /// tedy přes tajemství na serveru.
    /// </summary>
    public async Task<StavOdebrani> OdeberAsync(int serieId, int opravneniId, CancellationToken ct)
    {
        var opravneni = await db.Opravneni
            .FirstOrDefaultAsync(o => o.Id == opravneniId && o.SerieId == serieId, ct);

        // Cizí sérii nepotvrzuj ani existencí: kdyby se tu vracelo 404 jen
        // u neexistujícího čísla, dalo by se procházením zjistit, která
        // oprávnění jinde existují.
        if (opravneni is null) return StavOdebrani.Neni;

        if (opravneni.Role == Role.Spravce)
        {
            var spravcu = await db.Opravneni.CountAsync(
                o => o.SerieId == serieId && o.Role == Role.Spravce, ct);

            if (spravcu <= 1) return StavOdebrani.PosledniSpravce;
        }

        db.Opravneni.Remove(opravneni);
        await db.SaveChangesAsync(ct);

        return StavOdebrani.Odebrano;
    }

    private async Task<OpravneniRadek?> RadekAsync(int id, CancellationToken ct) =>
        await db.Opravneni
            .Where(o => o.Id == id)
            .Select(o => new OpravneniRadek(
                o.Id, o.UzivatelId, o.Uzivatel!.Zobrazovane, o.Uzivatel.Email,
                o.Role, o.Zavod!.Slug, o.UdelenoV))
            .FirstOrDefaultAsync(ct);
}
