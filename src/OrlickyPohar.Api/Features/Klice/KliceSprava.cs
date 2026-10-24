using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Zavody;

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

/// <summary>Klíče jedné lodi, jak je vidí pořadatel regaty.</summary>
public record KliceLodiDto(int LodId, string Lod, string? CisloPlachty, List<KlicDto> Klice);

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

    /// <summary>Hlavička, ve které telefon posílá svůj klíč.</summary>
    public const string Hlavicka = "X-Klic-Lodi";

    /// <summary>
    /// Najde klíč podle hlavičky požadavku. `null` u chybějícího, neznámého,
    /// odepnutého i odebraného — <b>všechny případy dopadnou stejně</b>, aby
    /// se z odpovědi nedalo nic vyčíst.
    /// </summary>
    public async Task<KlicLodi?> ZHlavickyAsync(HttpContext ctx, CancellationToken ct)
    {
        var hodnota = ctx.Request.Headers[Hlavicka].ToString();
        return string.IsNullOrWhiteSpace(hodnota) ? null : await OverAsync(hodnota, ct);
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

    /// <summary>
    /// Najde klíč, kterým se telefon hlásí <b>sám o sobě</b>: stačí, že
    /// existuje a není odebraný.
    /// <para>
    /// <b>Odepnutý projde schválně.</b> Jinak by se telefon nemohl připnout
    /// zpátky a odepnutí by bylo jednosměrné — tedy k ničemu právě v tom
    /// případě, kvůli kterému vzniklo: *„odjel po prvním dni domů"* a příští
    /// den jede zas.
    /// </para>
    /// <para>
    /// <b>Použití se tu nerazítkuje.</b> <c>PosledniPouzitiV</c> odpovídá
    /// kapitánovi na otázku „ozval se ten telefon?", a ta je o posílání
    /// poloh; dotaz na vlastní nastavení by ji přepsal na „appka je
    /// otevřená".
    /// </para>
    /// </summary>
    public async Task<KlicLodi?> ProSebeAsync(HttpContext ctx, CancellationToken ct)
    {
        var hodnota = ctx.Request.Headers[Hlavicka].ToString();
        if (string.IsNullOrWhiteSpace(hodnota)) return null;

        var otisk = Otisk(hodnota);
        var nalezeny = await db.Klice.FirstOrDefaultAsync(k => k.Otisk == otisk, ct);
        return nalezeny is { OdebranV: null } ? nalezeny : null;
    }

    /// <summary>
    /// Odepne nebo zase připne klíč <b>sám jeho držitel</b>. Plán to žádá
    /// výslovně (*Telefon jako mobilní klíč k lodi*): „kdo odjíždí, vypne si
    /// to sám a není odkázaný na to, že na něj někdo nezapomene."
    /// <para>
    /// Je to tatáž změna jako <see cref="SledujAsync"/>, jen se o ni hlásí
    /// telefon místo kapitána. <b>Odebrat se sám nemůže</b> — to je zásah do
    /// posádky a zůstává kapitánovi; tohle je jen „dneska nejedu".
    /// </para>
    /// </summary>
    public async Task<bool> SledujSamAsync(KlicLodi klic, bool sleduj, CancellationToken ct)
    {
        klic.Sleduje = sleduj;
        await db.SaveChangesAsync(ct);
        return klic.Sleduje;
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

    /// <summary>Stavy účasti, ve kterých loď na regatě závodí. Totéž co v `PolohySprava`.</summary>
    private static readonly StavUcasti[] NaZavode = [StavUcasti.Prihlasena, StavUcasti.Potvrzena];

    /// <summary>
    /// Klíče všech lodí, které jedou tuhle regatu — <b>pořadatelův pohled</b>.
    /// <para>
    /// Je to tentýž výpis jako kapitánův, jen přes celé pole: otázka před
    /// procedurou zní *„má celé pole zapnutý tracker?"*, a na tu odpověď
    /// „zeptej se dvaadvaceti kapitánů" neodpovídá. Loď bez jediného klíče
    /// se vrací taky, právě proto.
    /// </para>
    /// </summary>
    public async Task<List<KliceLodiDto>> ProRegatuAsync(int zavodId, CancellationToken ct)
    {
        var lode = await db.Ucasti
            .Where(u => u.ZavodId == zavodId && NaZavode.Contains(u.Stav))
            .Select(u => new
            {
                u.Prihlaska!.LodId,
                u.Prihlaska.Lod!.Nazev,
                u.Prihlaska.Lod.CisloPlachty,
            })
            .ToListAsync(ct);

        var klice = await db.Klice
            .Where(k => lode.Select(l => l.LodId).Contains(k.LodId))
            .OrderBy(k => k.VydanV)
            .Select(k => new
            {
                k.LodId,
                Dto = new KlicDto(
                    k.Id, k.Jmeno, k.VydanV, k.PosledniPouzitiV, k.Sleduje, k.OdebranV != null),
            })
            .ToListAsync(ct);

        return
        [
            .. lode
                .DistinctBy(l => l.LodId)
                .OrderBy(l => l.Nazev)
                .Select(l => new KliceLodiDto(
                    l.LodId, l.Nazev, l.CisloPlachty,
                    [.. klice.Where(k => k.LodId == l.LodId).Select(k => k.Dto)])),
        ];
    }

    /// <summary>
    /// Klíč, na který pořadatel té regaty dosáhne — tedy klíč lodi, která ji
    /// <b>jede</b>. Vrací <c>null</c> jinak, aby role na jedné regatě
    /// neotvírala cizí lodě.
    /// </summary>
    public async Task<KlicLodi?> NaRegateAsync(int zavodId, int klicId, CancellationToken ct)
    {
        var klic = await db.Klice.FirstOrDefaultAsync(k => k.Id == klicId, ct);
        if (klic is null) return null;

        var jede = await db.Ucasti.AnyAsync(
            u => u.ZavodId == zavodId && NaZavode.Contains(u.Stav)
                 && u.Prihlaska!.LodId == klic.LodId, ct);

        return jede ? klic : null;
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
