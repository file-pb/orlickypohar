using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>Čím je účet lodi (Filip, 3. 10. 2026).</summary>
public enum RoleKLodi
{
    /// <summary>Vlastní ji. Smí všechno, co kapitán, a navíc předat loď dál.</summary>
    Majitel = 1,

    /// <summary>Kormidluje a odpovídá za posádku. Potvrzuje, kdo se k lodi připojí.</summary>
    Kapitan = 2,

    /// <summary>Jede na lodi. Smí odesílat trasu a číst, co je lodi určené.</summary>
    Posadka = 3,

    /// <summary>Jen sleduje. Žádné právo zapisovat.</summary>
    Fanousek = 4,
}

/// <summary>Jak vazba vznikla. Kvůli dohledání, ne kvůli právům.</summary>
public enum PuvodVazby
{
    /// <summary>Ověřený e-mail účtu sedl s kontaktem na přihlášce.</summary>
    Email = 1,

    /// <summary>Kód nebo QR od pořadatele či kapitána.</summary>
    Kod = 2,

    /// <summary>Uživatel si o loď řekl, kapitán potvrdil.</summary>
    Narok = 3,

    /// <summary>Přiřadil správce ručně — nouzová páka.</summary>
    Rucne = 4,
}

/// <summary>
/// Účet patřící k lodi. <b>Tohle je ten chybějící kus</b>, bez kterého
/// systém po přihlášení pořád neví, ke které lodi člověk patří — a bez
/// kterého nejde ani poslat upozornění posádce, ani přijmout trasu.
/// <para>
/// <b>Role je u vazby, ne u uživatele.</b> Jeden člověk může být kapitánem
/// jedné lodi, posádkou druhé a fanouškem třetí; opačně má loď několik lidí.
/// </para>
/// <para>
/// <b>Vazba vzniká třemi cestami</b> (plán, oddíl *Jak se z přihlášení stane
/// „kormidelník lodi Anička"*): shodou ověřeného e-mailu s kontaktem na
/// přihlášce, kódem od pořadatele, nebo nárokem, který potvrdí kapitán.
/// Ruční přiřazení správcem je nouzová páka. <see cref="Puvod"/> drží, kudy
/// to přišlo — kvůli dohledání, ne kvůli právům.
/// </para>
/// </summary>
public class VazbaKLodi
{
    public int Id { get; set; }

    public int LodId { get; set; }
    public Lod? Lod { get; set; }

    public Guid UzivatelId { get; set; }
    public Uzivatel? Uzivatel { get; set; }

    public RoleKLodi Role { get; set; }

    public PuvodVazby Puvod { get; set; }

    public DateTimeOffset VzniklaV { get; set; }

    /// <summary>
    /// Kdo vazbu potvrdil, když ji potvrdit bylo potřeba (nárok). Prázdné
    /// u cest, které potvrzení nepotřebují — e-mail i kód jsou důkaz samy
    /// o sobě.
    /// </summary>
    public Guid? PotvrdilId { get; set; }
    public Uzivatel? Potvrdil { get; set; }
}

/// <summary>Loď, ke které účet patří, i s rolí. Pro appku a pro „moje lodě".</summary>
public record MojeLodDto(int LodId, string Nazev, string? CisloPlachty, RoleKLodi Role);
