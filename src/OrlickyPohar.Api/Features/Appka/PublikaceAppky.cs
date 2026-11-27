namespace OrlickyPohar.Api.Features.Appka;

/// <summary>
/// Jedna aktualizace JavaScriptu, kterou CI publikovalo do kanálu Expa.
/// <para>
/// <b>Proč to existuje.</b> Bez tohohle záznamu server neví, co je pro
/// který telefon nejnovější, a přehled flotily by nepoznal telefon, kterému
/// se aktualizace ztratila, od telefonu, který je aktuální. Je to dvojče
/// <see cref="VydaniAppky"/>: to říká, jaký balíček leží v obchodě, tohle,
/// co k němu doteklo po síti.
/// </para>
/// <para>
/// <b>Zapisuje to CI</b> po každé publikaci, stejným tokenem jako vydání
/// (<c>Appka:Token</c>). Přirozený klíč je platforma × kanál × otisk ×
/// aktualizace: opakované odeslání téhož nic nezdvojí.
/// </para>
/// <para>
/// <b>Nejnovější je ta zapsaná naposledy</b>, ne ta s „vyšším" identifikátorem
/// — identifikátory jsou náhodné a pořadí nenesou. Opakovaný zápis čas
/// prvního nechává, takže pozdní opakování starší publikaci neoživí.
/// </para>
/// </summary>
public class PublikaceAppky
{
    public int Id { get; set; }

    /// <summary><c>android</c> nebo <c>ios</c>.</summary>
    public required string Platforma { get; set; }

    /// <summary>Kanál Expa, do kterého aktualizace šla (<c>preview</c>, <c>production</c>).</summary>
    public required string Kanal { get; set; }

    /// <summary>Otisk nativní části, pro který aktualizace je (<c>runtimeVersion</c>).</summary>
    public required string Otisk { get; set; }

    /// <summary>Identifikátor aktualizace, jak ho telefon hlásí v <c>X-Appka-Verze</c>.</summary>
    public Guid Aktualizace { get; set; }

    /// <summary>Commit, ze kterého aktualizace je. Jen pro dohledání.</summary>
    public string? Commit { get; set; }

    /// <summary>Kdy přišel první zápis, v UTC.</summary>
    public DateTimeOffset PublikovanoV { get; set; }
}
