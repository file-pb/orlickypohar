using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Poradatele;

/// <summary>Medailonek pořadatele, jak ho vidí veřejnost. Prázdná pole se nevydávají jako prázdné řetězce.</summary>
public record PoradatelDto(
    string Slug,
    string Nazev,
    string? Web,
    string? Popis,
    string? Email,
    string? Telefon,
    string? KontaktniOsoba,
    string? Adresa,
    double? Sirka,
    double? Delka,
    // Vlastní obrázek klubu. Bez něj ukazuje web kurátorskou fotku.
    ObrazekDto? Obrazek = null);

/// <summary>Zastávka téhož pořadatele v ročníku — aby bylo vidět, kde všude se změna projeví.</summary>
public record ZastavkaPoradateleDto(string Slug, string Nazev, DateOnly Datum, DruhZastavky Druh);

public record PoradatelSpravaDto(
    string Serie,
    string SerieNazev,
    PoradatelDto Poradatel,
    bool SmiUpravit,
    IReadOnlyList<ZastavkaPoradateleDto> Zastavky,
    // Záznam je společný všem ročníkům. Názvy cizích zastávek se neukazují,
    // stačí vědět, že změna nezůstane jen tady.
    int ZastavekJinde);

public record PoradatelVstup(
    string Nazev,
    string? Web = null,
    string? Popis = null,
    string? Email = null,
    string? Telefon = null,
    string? KontaktniOsoba = null,
    string? Adresa = null,
    double? Sirka = null,
    double? Delka = null);

/// <summary>
/// Čtení a zápis pořadatelů.
/// <para>
/// <b>Pořadatel vzniká ze jména, ne vlastním formulářem.</b> Kalendář
/// a import posílají jméno jako dosud a <see cref="PriradAsync"/> k němu
/// najde, nebo založí záznam. Druhé místo, kde se pořadatelé zakládají,
/// by se s kalendářem rozešlo v tom, jak se jmenují.
/// </para>
/// </summary>
public class PoradateleSprava(AppDbContext db)
{
    /// <summary>
    /// Přiřadí zastávce pořadatele podle jména. Neukládá — to udělá ten,
    /// kdo zastávku mění, jedním <c>SaveChanges</c> s ní.
    /// <para>
    /// Páruje se podle slugu, takže na velikosti písmen a diakritice
    /// nezáleží. <b>Text na zastávce dostane jméno záznamu</b>: kdo napíše
    /// „yc orlik", nemá tím klub přejmenovat, ani mít na webu jiný nápis
    /// než ostatní zastávky.
    /// </para>
    /// <para>
    /// Statické, protože import žije mimo kontejner služeb a má jen kontext.
    /// Hledá se i v nezapsaných záznamech — import zakládá devět zastávek
    /// v jedné dávce a čtyři z nich pořádá týž klub.
    /// </para>
    /// </summary>
    public static async Task PriradAsync(AppDbContext db, Zavod zavod, string? nazev, CancellationToken ct)
    {
        var jmeno = string.IsNullOrWhiteSpace(nazev) ? null : nazev.Trim();
        var slug = jmeno is null ? "" : Medailonek.Slug(jmeno);

        if (slug == "")
        {
            zavod.Poradatel = jmeno;
            zavod.PoradatelId = null;
            zavod.PoradatelZaznam = null;
            return;
        }

        var poradatel = db.Poradatele.Local.FirstOrDefault(p => p.Slug == slug)
                        ?? await db.Poradatele.FirstOrDefaultAsync(p => p.Slug == slug, ct);

        if (poradatel is null)
        {
            poradatel = new Poradatel { Slug = slug, Nazev = jmeno! };
            db.Poradatele.Add(poradatel);
        }

        zavod.PoradatelZaznam = poradatel;
        zavod.Poradatel = poradatel.Nazev;
    }

    public Task<Poradatel?> NajdiAsync(string slug, CancellationToken ct) =>
        db.Poradatele.Include(p => p.Fotka).FirstOrDefaultAsync(p => p.Slug == slug, ct);

    /// <summary>Zastávky pořadatele v ročníku, podle kalendáře.</summary>
    public async Task<List<(int Id, ZastavkaPoradateleDto Zastavka)>> ZastavkyAsync(
        int poradatelId, int serieId, CancellationToken ct)
    {
        var zastavky = await db.Zavody
            .Where(z => z.PoradatelId == poradatelId && z.SerieId == serieId)
            .OrderBy(z => z.Datum).ThenBy(z => z.Poradi)
            .Select(z => new { z.Id, z.Slug, z.Nazev, z.Datum, z.Druh })
            .ToListAsync(ct);

        return [.. zastavky.Select(z => (z.Id, new ZastavkaPoradateleDto(z.Slug, z.Nazev, z.Datum, z.Druh)))];
    }

    public Task<int> ZastavekJindeAsync(int poradatelId, int serieId, CancellationToken ct) =>
        db.Zavody.CountAsync(z => z.PoradatelId == poradatelId && z.SerieId != serieId, ct);

    /// <summary>
    /// Uloží medailonek. Vrací chybu, nebo <c>null</c>.
    /// <para>
    /// <b>Přejmenování přepíše i text na všech jeho zastávkách</b> — ve
    /// všech ročnících. Sloupec se jménem na zastávce zůstává kvůli appce
    /// na telefonech a importu, a kdyby se nepřepsal, byl by klub na webu
    /// pod dvěma jmény.
    /// </para>
    /// </summary>
    public async Task<string?> UlozAsync(Poradatel poradatel, PoradatelVstup vstup, CancellationToken ct)
    {
        if (Medailonek.ProcNejdeUlozit(vstup.Nazev, vstup.Popis, vstup.Email, vstup.Telefon,
                vstup.KontaktniOsoba, vstup.Adresa, vstup.Sirka, vstup.Delka) is { } chyba)
            return chyba;

        var (web, chybaWebu) = Medailonek.NormalizujWeb(vstup.Web);
        if (chybaWebu is not null) return chybaWebu;

        var nazev = vstup.Nazev.Trim();
        var slug = Medailonek.Slug(nazev);

        if (slug != poradatel.Slug
            && await db.Poradatele.AnyAsync(p => p.Slug == slug && p.Id != poradatel.Id, ct))
            return $"Pořadatel se jménem „{nazev}“ už existuje. Regatu mu přiřaď v kalendáři.";

        if (nazev != poradatel.Nazev)
        {
            await db.Zavody
                .Where(z => z.PoradatelId == poradatel.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(z => z.Poradatel, nazev), ct);
        }

        poradatel.Nazev = nazev;
        poradatel.Slug = slug;
        poradatel.Web = web;
        poradatel.Popis = Prazdne(vstup.Popis);
        poradatel.Email = Prazdne(vstup.Email);
        poradatel.Telefon = Prazdne(vstup.Telefon);
        poradatel.KontaktniOsoba = Prazdne(vstup.KontaktniOsoba);
        poradatel.Adresa = Prazdne(vstup.Adresa);
        poradatel.Sirka = vstup.Sirka;
        poradatel.Delka = vstup.Delka;

        await db.SaveChangesAsync(ct);
        return null;
    }

    public static PoradatelDto Dto(Poradatel p, Fotka? fotka, string? verejnaAdresa) =>
        new(p.Slug, p.Nazev, p.Web, p.Popis, p.Email, p.Telefon, p.KontaktniOsoba, p.Adresa, p.Sirka, p.Delka,
            Nahravani.Dto(fotka, verejnaAdresa));

    /// <summary>Prázdný řetězec z formuláře je „nevyplněno", ne hodnota.</summary>
    private static string? Prazdne(string? text) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Trim();
}
