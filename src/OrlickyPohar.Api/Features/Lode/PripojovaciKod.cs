using System.Security.Cryptography;
using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Kód, kterým se člověk připojí k lodi — druhá cesta párování
/// (plán, *Jak se z přihlášení stane „kormidelník lodi Anička"*).
/// <para>
/// <b>Kód a QR jsou jedna věc ve dvou podobách</b> (Filip, 4. 10. 2026):
/// stejný řetězec se dá opsat z papíru i načíst z obrazovky. QR je
/// pohodlnější, opsání funguje i bez kamery a bez signálu v tu chvíli.
/// </para>
/// <para>
/// <b>Platí pár minut, ne celou sezónu.</b> Kód na displeji si kdokoliv
/// vyfotí přes rameno; krátká platnost to riziko skoro maže. Použít ho smí
/// víc lidí — posádka se připojuje po jednom z jednoho papíru.
/// </para>
/// </summary>
public class PripojovaciKod
{
    public int Id { get; set; }

    public int LodId { get; set; }
    public Lod? Lod { get; set; }

    /// <summary>Samotný kód. Velkými písmeny, bez snadno zaměnitelných znaků.</summary>
    public required string Kod { get; set; }

    /// <summary>Kdo ho vystavil: pořadatel, rozhodčí, nebo kapitán lodi.</summary>
    public Guid VystavilId { get; set; }
    public Uzivatel? Vystavil { get; set; }

    public DateTimeOffset VystavenV { get; set; }
    public DateTimeOffset PlatiDo { get; set; }

    /// <summary>Kolikrát se kód použil. Jen pro přehled, nic neblokuje.</summary>
    public int Pouzit { get; set; }
}

/// <summary>
/// Vystavený kód pro klienta. <b>Jen řetězec a platnost</b> — adresu do QR
/// si poskládá web, který svou adresu zná; API ji vědět nepotřebuje a nemá
/// kvůli QR přibývat další proměnná prostředí.
/// </summary>
public record KodDto(string Kod, DateTimeOffset PlatiDo);

/// <summary>Co se stalo po zadání kódu.</summary>
/// <param name="LodId">Loď, ke které se účet připojil.</param>
/// <param name="Nazev">Jméno lodi, ať klient nemusí dohledávat.</param>
/// <param name="Role">Role, kterou účet dostal.</param>
/// <param name="JizBylo">Účet už k lodi patřil; nic se nezměnilo.</param>
public record PripojeniDto(int LodId, string Nazev, RoleKLodi Role, bool JizBylo);

/// <summary>Pravidla kódu. Čisté funkce, bez databáze.</summary>
public static class Kody
{
    /// <summary>
    /// Šest znaků z abecedy bez nul, jedniček, I a O: kód se opisuje
    /// z papíru u vody, kde se „0" a „O" plete každému. Zbývá 32 znaků,
    /// tedy přes miliardu možností — na krátkou platnost dost.
    /// </summary>
    public const string Abeceda = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

    public const int Delka = 6;

    /// <summary>
    /// Jak dlouho kód platí. Čtvrt hodiny stačí na registraci posádky
    /// u stolu a je krátká na to, aby fotka přes rameno byla k něčemu.
    /// </summary>
    public static readonly TimeSpan Platnost = TimeSpan.FromMinutes(15);

    public const string Neplatny = "Kód neplatí. Nech si vystavit nový.";

    /// <summary>Náhodný kód. Kryptografický generátor, ne `Random` — je to přístupový údaj.</summary>
    public static string Novy() =>
        RandomNumberGenerator.GetString(Abeceda, Delka);

    /// <summary>
    /// Srovná zadaný kód do podoby, ve které se hledá: velká písmena
    /// a pryč s mezerami i pomlčkami, které si lidé do opisu přidávají.
    /// </summary>
    public static string Uprav(string? kod) =>
        new([.. (kod ?? "").ToUpperInvariant().Where(Abeceda.Contains)]);

    /// <summary>
    /// Role, kterou nově připojený dostane. <b>První je kapitán, další
    /// posádka</b> (Filip, 4. 10. 2026) — kdo loď převezme jako první, za ni
    /// odpovídá; ostatní jsou posádka, dokud jim kapitán nedá víc.
    /// </summary>
    public static RoleKLodi RoleProNoveho(bool uzMaKapitana) =>
        uzMaKapitana ? RoleKLodi.Posadka : RoleKLodi.Kapitan;
}
