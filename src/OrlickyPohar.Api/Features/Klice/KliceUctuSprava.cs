using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Klice;

/// <summary>
/// Napojení telefonu na účet: kód z webu výměnou za klíč, a ověření klíče.
///
/// <para>
/// <b>Pravidla jsou tady, ne v endpointech.</b> Tentýž důvod, jaký má
/// <see cref="KliceSprava"/> u lodí: kdo smí co, se nesmí rozhodovat na
/// dvou místech.
/// </para>
/// </summary>
public class KliceUctuSprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>Hlavička, ve které telefon posílá klíč k účtu.</summary>
    public const string Hlavicka = "X-Klic-Uctu";

    /// <summary>Jméno nároku, kterým handler nese interní účet dál.</summary>
    public const string NarokUzivatel = "op_uzivatel";

    /// <summary>
    /// <b>Minuty, ne hodiny.</b> Kód svítí na obrazovce počítače a kdokoliv
    /// kolem si ho vyfotí přes rameno. Pozvánka k lodi platí 48 hodin,
    /// protože se tiskne na papír a posádka se připojuje postupně; tady je
    /// na druhé straně celý účet i s rolemi.
    /// </summary>
    public static readonly TimeSpan PlatnostKodu = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Vystaví kód přihlášenému. <b>Starý nevyužitý kód se zruší</b>: dva
    /// platné kódy na jeden účet znamenají dvě okna, kterými se dá projít,
    /// a to druhé nikdo nehlídá.
    /// </summary>
    public async Task<NapojeniKodDto> VystavKodAsync(Guid uzivatelId, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();

        await db.NapojeniUctu
            .Where(n => n.UzivatelId == uzivatelId && n.UplatnenV == null && n.PlatiDo > ted)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.PlatiDo, ted), ct);

        var kod = Tajemstvi();
        db.NapojeniUctu.Add(new NapojeniUctu
        {
            UzivatelId = uzivatelId,
            Otisk = Otisk(kod),
            VydanV = ted,
            PlatiDo = ted + PlatnostKodu,
        });
        await db.SaveChangesAsync(ct);

        return new NapojeniKodDto(kod, ted + PlatnostKodu);
    }

    /// <summary>
    /// Vymění kód za klíč. Vrací <c>null</c> u vymyšleného, propadlého
    /// i už uplatněného — <b>všechny tři případy dopadnou stejně</b>, aby
    /// se z odpovědi nedalo nic vyčíst. Stejné rozhodnutí jako u lodí.
    /// </summary>
    public async Task<NapojeniDto?> NapojAsync(string kod, string? zarizeni, CancellationToken ct)
    {
        var otisk = Otisk(kod);
        var ted = cas.GetUtcNow();

        // <b>Kód se zabere jedním příkazem, ne přečtením a zápisem.</b>
        // Mezi „je ještě volný?" a „označ ho za použitý" se vejdou dva
        // telefony a oba by prošly — jednorázovost, na které tenhle
        // mechanismus stojí, by platila jen do prvního souběhu. Databáze
        // rozhodne sama: kdo změnil řádek, ten kód dostal.
        var zabrano = await db.NapojeniUctu
            .Where(n => n.Otisk == otisk && n.UplatnenV == null && n.PlatiDo > ted)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.UplatnenV, ted), ct);

        // Vymyšlený, propadlý i už uplatněný kód dopadnou stejně, aby se
        // z odpovědi nedalo nic vyčíst. Stejné rozhodnutí jako u lodí.
        if (zabrano == 0) return null;

        var komu = await db.NapojeniUctu
            .AsNoTracking()
            .Where(n => n.Otisk == otisk)
            .Select(n => new { n.UzivatelId, Jmeno = n.Uzivatel!.Zobrazovane })
            .FirstAsync(ct);

        var klic = Tajemstvi();
        db.KliceUctu.Add(new KlicUctu
        {
            UzivatelId = komu.UzivatelId,
            Otisk = Otisk(klic),
            Zarizeni = string.IsNullOrWhiteSpace(zarizeni) ? null : zarizeni.Trim(),
            VydanV = ted,
        });
        await db.SaveChangesAsync(ct);

        return new NapojeniDto(klic, komu.Jmeno);
    }

    /// <summary>
    /// Najde platný klíč a zapíše, že se ozval. <c>null</c> u neznámého
    /// i odebraného.
    /// <para>
    /// <b>Ozvání se zapisuje mimo sledování změn.</b> Je to jediné pole,
    /// které se mění při každém požadavku, a projít kvůli němu celý
    /// <c>SaveChanges</c> by znamenalo zápis navíc u každého dotazu.
    /// </para>
    /// </summary>
    public async Task<KlicUctu?> OverAsync(string klic, CancellationToken ct)
    {
        var otisk = Otisk(klic);
        var nalezeny = await db.KliceUctu
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.Otisk == otisk, ct);

        if (nalezeny is null || !nalezeny.Platny) return null;

        var ted = cas.GetUtcNow();
        await db.KliceUctu
            .Where(k => k.Id == nalezeny.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(k => k.OzvalSeV, ted), ct);

        return nalezeny;
    }

    /// <summary>Telefony napojené na tenhle účet. Odebrané se nevypisují.</summary>
    public Task<List<KlicUctuDto>> MojeAsync(Guid uzivatelId, CancellationToken ct) =>
        db.KliceUctu
            .Where(k => k.UzivatelId == uzivatelId && k.OdebranV == null)
            .OrderByDescending(k => k.VydanV)
            .Select(k => new KlicUctuDto(k.Id, k.Zarizeni, k.VydanV, k.OzvalSeV))
            .ToListAsync(ct);

    /// <summary>
    /// Odebere telefon. <b>Jen svůj</b> — cizí klíč není co odebírat cizí
    /// rukou, a kdyby se to mělo změnit, je to rozhodnutí, ne detail.
    /// Vrací, jestli se něco stalo.
    /// </summary>
    public async Task<bool> OdeberAsync(Guid uzivatelId, int klicId, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();
        var dotceno = await db.KliceUctu
            .Where(k => k.Id == klicId && k.UzivatelId == uzivatelId && k.OdebranV == null)
            .ExecuteUpdateAsync(s => s.SetProperty(k => k.OdebranV, ted), ct);
        return dotceno > 0;
    }

    /// <summary>
    /// Interní účet z nároků, které vyrobil handler klíče — nebo <c>null</c>,
    /// když se člověk přihlásil normálně.
    /// </summary>
    public static Guid? UzivatelZNaroku(ClaimsPrincipal? kdo) =>
        Guid.TryParse(kdo?.FindFirst(NarokUzivatel)?.Value, out var id) ? id : null;

    private static string Tajemstvi() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    /// <summary>
    /// SHA-256 stačí: tajemství je náhodných 32 bajtů, ne heslo vymyšlené
    /// člověkem. Totéž zdůvodnění jako u klíčů k lodi.
    /// </summary>
    private static string Otisk(string tajemstvi) =>
        Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(tajemstvi)));
}
