using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Appka;

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

        var kod = Kod();
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
        var otisk = Otisk(Uprav(kod));
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
    /// <para>
    /// <b>Verze appky jede v tomtéž příkazu</b> (<paramref name="verze"/>,
    /// z hlavičky <see cref="VerzeAppky.Hlavicka"/>). Zápis ozvání se dělá
    /// tak jako tak, takže hlášení nestojí jediný dotaz navíc — a ukládá se
    /// jen k identitě, kterou klíč právě prokázal. Bez platné hlavičky se
    /// uložené hlášení nechává, jak je.
    /// </para>
    /// </summary>
    public async Task<KlicUctu?> OverAsync(string klic, CancellationToken ct, VerzeAppky? verze = null)
    {
        var otisk = Otisk(klic);
        var nalezeny = await db.KliceUctu
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.Otisk == otisk, ct);

        if (nalezeny is null || !nalezeny.Platny) return null;

        var ted = cas.GetUtcNow();
        if (verze is not null) VerzeAppky.Zapis(nalezeny, verze, ted);

        await db.KliceUctu
            .Where(k => k.Id == nalezeny.Id)
            .ExecuteUpdateAsync(s =>
            {
                s.SetProperty(k => k.OzvalSeV, ted);
                if (verze is null) return;

                s.SetProperty(k => k.VerzePlatforma, nalezeny.VerzePlatforma);
                s.SetProperty(k => k.VerzeOtisk, nalezeny.VerzeOtisk);
                s.SetProperty(k => k.VerzeAktualizace, nalezeny.VerzeAktualizace);
                s.SetProperty(k => k.VerzeKanal, nalezeny.VerzeKanal);
                s.SetProperty(k => k.VerzeSpusteni, nalezeny.VerzeSpusteni);
                s.SetProperty(k => k.VerzeCeka, nalezeny.VerzeCeka);
                s.SetProperty(k => k.VerzeOdV, nalezeny.VerzeOdV);
                s.SetProperty(k => k.VerzeHlasenaV, nalezeny.VerzeHlasenaV);
            }, ct);

        nalezeny.OzvalSeV = ted;
        return nalezeny;
    }

    /// <summary>
    /// Telefony napojené na tenhle účet. Odebrané se nevypisují.
    /// <para>
    /// U každého i balíček a stav proti tomu, co je venku — tentýž výpočet
    /// jako v přehledu flotily (<see cref="Vydano.Stav"/>), aby profil
    /// a správa neříkaly o jednom telefonu dvě různé věci.
    /// </para>
    /// </summary>
    public async Task<List<KlicUctuDto>> MojeAsync(Guid uzivatelId, CancellationToken ct)
    {
        var klice = await db.KliceUctu
            .AsNoTracking()
            .Where(k => k.UzivatelId == uzivatelId && k.OdebranV == null)
            .OrderByDescending(k => k.VydanV)
            .ToListAsync(ct);

        var vydano = await FlotilaEndpoints.NactiVydanoAsync(db, klice.Select(k => k.VerzeOtisk), ct);

        return
        [
            .. klice.Select(k =>
            {
                var verze = VerzeAppky.Z(k);
                return new KlicUctuDto(
                    k.Id, k.Zarizeni, k.VydanV, k.OzvalSeV,
                    verze is null ? null : vydano.CisloBalicku(verze.Platforma, verze.Otisk),
                    vydano.Stav(verze));
            }),
        ];
    }

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

    /// <summary>
    /// Abeceda kódu: bez nul, jedniček, I a O, protože se kód opisuje
    /// z obrazovky počítače a „0" s „O" se plete každému.
    /// <para>
    /// <b>Je to druhá kopie</b> téže abecedy — první má <c>Lode.Kody</c>
    /// u pozvánky k lodi. Sdílet ji je podle konvencí repozitáře
    /// předčasné: hranice odvozená ze dvou vzorků trefí skoro vždy
    /// špatně. Až vznikne třetí, patří všechny tři do jednoho místa.
    /// </para>
    /// </summary>
    public const string Abeceda = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    /// <summary>
    /// Osm znaků, o dva víc než pozvánka k lodi: na druhé straně je celý
    /// účet i s rolemi, ne jedna loď. 32⁸ je 1,1 · 10¹² možností, takže
    /// i tisíc pokusů za sekundu po celou pětiminutovou platnost dává
    /// pravděpodobnost uhádnutí 3 · 10⁻⁷. Omezení počtu pokusů je tedy
    /// obrana proti zahlcení, ne proti uhádnutí.
    /// </summary>
    public const int KodDelka = 8;

    /// <summary>
    /// Náhodný kód k opsání nebo do QR. Kryptografický generátor, ne
    /// <c>Random</c> — je to přístupový údaj.
    /// </summary>
    public static string Kod() => RandomNumberGenerator.GetString(Abeceda, KodDelka);

    /// <summary>
    /// Srovná zadaný kód do podoby, ve které se hledá: velká písmena
    /// a pryč s každým znakem mimo abecedu, tedy i s mezerami a pomlčkami,
    /// které si lidé do opisu přidávají.
    /// <para>
    /// <b>Srovnává server, ne klient.</b> Do 26. 11. 2026 to dělala appka
    /// sama a kód byl přitom base64url ze 32 bajtů — převod na velká
    /// písmena ho tedy pokaždé zničil a napojení nemohlo projít. Jak se
    /// kód čte, patří k tomu, kdo ho vystavil; klientů je víc.
    /// </para>
    /// </summary>
    public static string Uprav(string? kod) =>
        new([.. (kod ?? "").ToUpperInvariant().Where(Abeceda.Contains)]);

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
