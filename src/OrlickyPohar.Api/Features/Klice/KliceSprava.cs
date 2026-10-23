using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Features.Klice;

/// <summary>Pozvánka tak, jak ji dostane kapitán — <b>s čitelným kódem, jednou</b>.</summary>
public record PozvankaDto(int Id, string Kod, string? Jmeno, DateTimeOffset PlatiDo);

/// <summary>Klíč, jak ho vidí kapitán ve výpisu. Bez tajemství.</summary>
public record KlicDto(
    int Id,
    string? Jmeno,
    DateTimeOffset VydanV,
    DateTimeOffset? PosledniPouzitiV,
    bool Sleduje,
    bool Odebran);

/// <summary>Co appka dostane po uplatnění pozvánky.</summary>
public record UplatneniDto(string Klic, int LodId, string LodNazev, string? Jmeno);

/// <summary>
/// Vydávání a rušení mobilních klíčů k lodi.
/// <para>
/// <b>Tajemství se ukládá jen jako otisk.</b> Klíč i kód z QR existují
/// v čitelné podobě jedinou chvíli — když odcházejí ven. Kdyby se databáze
/// dostala do cizích rukou, nikdo s ní polohy neposílá.
/// </para>
/// </summary>
public class KliceSprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>
    /// Jak dlouho se dá pozvánka uplatnit. Je na rozpravu, ne na sezónu —
    /// nevyužitá nesmí ležet jako trvalý vstup do lodi.
    /// </summary>
    public static readonly TimeSpan PlatnostPozvanky = TimeSpan.FromHours(48);

    /// <summary>
    /// Kdo smí vydávat klíče k lodi — majitel nebo kapitán. Je to tentýž
    /// okruh jako u kódů připojení, a schválně: klíč je jen jiná podoba
    /// téhož rozhodnutí, totiž koho k lodi pustit.
    /// </summary>
    /// <summary>
    /// Kdo smí vydat klíč dalšímu telefonu — <b>i posádka</b> (Filip,
    /// 23. 10. 2026). Kapitán nemusí být u každého párování; kdo pozvánku
    /// vystavil, se ukládá do <c>VydalUcetId</c>, takže stopa zůstane.
    /// <para>
    /// Platí jen pro členy posádky <b>s účtem</b>. Držitel klíče bez účtu
    /// vydávat nesmí: klíč by uměl vyrobit klíč, ten zase další, a za
    /// žádným by nestál účet, který to má na svědomí.
    /// </para>
    /// </summary>
    public Task<bool> SmiVydavatAsync(int lodId, Guid uzivatelId, CancellationToken ct) =>
        db.VazbyKLodim.AnyAsync(
            v => v.LodId == lodId && v.UzivatelId == uzivatelId
                 && (v.Role == RoleKLodi.Majitel || v.Role == RoleKLodi.Kapitan
                     || v.Role == RoleKLodi.Posadka), ct);

    /// <summary>
    /// Kdo smí cizím klíčem hýbat — vypnout sledování nebo ho odebrat.
    /// <b>Jen majitel a kapitán</b>, protože odebrat klíč je zásah do cizího
    /// telefonu a odpovídá za posádku kapitán. Vydat klíč smí víc lidí než
    /// ho vzít.
    /// </summary>
    public Task<bool> SmiSpravovatAsync(int lodId, Guid uzivatelId, CancellationToken ct) =>
        db.VazbyKLodim.AnyAsync(
            v => v.LodId == lodId && v.UzivatelId == uzivatelId
                 && (v.Role == RoleKLodi.Majitel || v.Role == RoleKLodi.Kapitan), ct);

    /// <summary>Vytvoří pozvánku pro jednoho člena posádky. Kód vrátí jednou.</summary>
    public async Task<PozvankaDto> PozviAsync(
        int lodId, Guid kdo, string? jmeno, CancellationToken ct)
    {
        var kod = Tajemstvi();
        var ted = cas.GetUtcNow();
        var p = new PozvankaKlice
        {
            LodId = lodId,
            Otisk = Otisk(kod),
            Jmeno = string.IsNullOrWhiteSpace(jmeno) ? null : jmeno.Trim(),
            VydalUcetId = kdo,
            VydanaV = ted,
            PlatiDo = ted + PlatnostPozvanky,
        };
        db.Pozvanky.Add(p);
        await db.SaveChangesAsync(ct);
        return new PozvankaDto(p.Id, kod, p.Jmeno, p.PlatiDo);
    }

    /// <summary>
    /// Vymění pozvánku za klíč. Vrací `null`, když je pozvánka vymyšlená,
    /// propadlá nebo už uplatněná — <b>všechny tři případy dávají tutéž
    /// odpověď</b>, aby se z ní nedalo nic vyčíst.
    /// </summary>
    public async Task<UplatneniDto?> UplatniAsync(string kod, CancellationToken ct)
    {
        var otisk = Otisk(kod);
        var pozvanka = await db.Pozvanky
            .Include(p => p.Lod)
            .FirstOrDefaultAsync(p => p.Otisk == otisk, ct);

        var ted = cas.GetUtcNow();
        if (pozvanka is null || !pozvanka.Uplatnitelna(ted)) return null;

        var klic = Tajemstvi();
        db.Klice.Add(new KlicLodi
        {
            LodId = pozvanka.LodId,
            Otisk = Otisk(klic),
            Jmeno = pozvanka.Jmeno,
            VydalUcetId = pozvanka.VydalUcetId,
            VydanV = ted,
        });
        pozvanka.UplatnenaV = ted;
        await db.SaveChangesAsync(ct);

        return new UplatneniDto(klic, pozvanka.LodId, pozvanka.Lod?.Nazev ?? "", pozvanka.Jmeno);
    }

    /// <summary>
    /// Najde klíč podle tajemství a zapíše, že se ozval. Vrací `null`
    /// u neznámého, odebraného i odepnutého — volající z toho nemá co číst.
    /// </summary>
    public async Task<KlicLodi?> OverAsync(string klic, CancellationToken ct)
    {
        var otisk = Otisk(klic);
        var nalezeny = await db.Klice.FirstOrDefaultAsync(k => k.Otisk == otisk, ct);
        if (nalezeny is null || !nalezeny.Platny) return null;

        nalezeny.PosledniPouzitiV = cas.GetUtcNow();
        await db.SaveChangesAsync(ct);
        return nalezeny;
    }

    public async Task<List<KlicDto>> SeznamAsync(int lodId, CancellationToken ct) =>
        await db.Klice
            .Where(k => k.LodId == lodId)
            .OrderBy(k => k.VydanV)
            .Select(k => new KlicDto(
                k.Id, k.Jmeno, k.VydanV, k.PosledniPouzitiV, k.Sleduje, k.OdebranV != null))
            .ToListAsync(ct);

    /// <summary>
    /// Dočasné odepnutí z trackingu, nebo zase připnutí. Člen posádky
    /// zůstává — tuhle regatu jen nejede.
    /// </summary>
    public async Task<bool> SledujAsync(int lodId, int klicId, bool sleduj, CancellationToken ct)
    {
        var k = await db.Klice.FirstOrDefaultAsync(x => x.Id == klicId && x.LodId == lodId, ct);
        if (k is null || k.OdebranV is not null) return false;

        k.Sleduje = sleduj;
        await db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>Trvalé odebrání. Klíč zaniká a nedá se oživit.</summary>
    public async Task<bool> OdeberAsync(int lodId, int klicId, CancellationToken ct)
    {
        var k = await db.Klice.FirstOrDefaultAsync(x => x.Id == klicId && x.LodId == lodId, ct);
        if (k is null) return false;

        k.OdebranV ??= cas.GetUtcNow();
        k.Sleduje = false;
        await db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// Tajemství z kryptografického generátoru, ne z `Random`.
    /// <para>
    /// Base64 bez znaků, které se pletou v URL — klíč i kód cestují
    /// v odkazu z QR.
    /// </para>
    /// </summary>
    private static string Tajemstvi() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    /// <summary>
    /// SHA-256 stačí: tajemství je náhodných 32 bajtů, ne heslo vymyšlené
    /// člověkem, takže slovníkový útok nemá co zkoušet a pomalá funkce by
    /// jen zdržovala ověření u každé dávky.
    /// </summary>
    private static string Otisk(string tajemstvi) =>
        Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(tajemstvi)));
}
