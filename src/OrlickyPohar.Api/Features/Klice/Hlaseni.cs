namespace OrlickyPohar.Api.Features.Klice;

/// <summary>
/// Co telefon posílá, když se hlásí. <b>Žádné souřadnice</b> — to je celý
/// smysl režimu „hlásím se".
/// <para>
/// <c>null</c> u baterie znamená „neříkám" (simulátor, odepřené čtení), ne
/// nulu. Server si drží poslední hodnotu, kterou někdo řekl.
/// </para>
/// </summary>
public record HlaseniVstup(int? BaterieProcent);

/// <summary>
/// Odpověď na hlášení — a zároveň <b>jediný povel, který telefon dostane</b>:
/// čas, odkdy si má sám zapnout nahrávání.
/// <para>
/// <b>Je to stažený čas, ne příkaz.</b> Na vodě signál padá, a kdyby
/// přepnutí chodilo jako povel, loď bez signálu by nezačala nahrávat vůbec.
/// Telefon si <see cref="NahravatOd"/> zapamatuje a řídí se jím i bez
/// signálu; změna od rozhodčího se projeví, až signál chytí. Tentýž vzorec
/// mají okna závodních dnů (<c>OknaSprava.ProTelefonAsync</c>).
/// </para>
/// <para>
/// <b>Proč je odpověď malá.</b> Celou obrazovku posádky vydává
/// <c>GET /lod/dnes</c>. Tohle volá úloha na pozadí každou chvíli a bez
/// obrazovky, takže pokyny ani stav lodi by na drátě byly zbytečné — a na
/// vodě je signál drahý.
/// </para>
/// </summary>
public record HlaseniDto(
    bool Sleduje,
    DateTimeOffset? StartV,
    DateTimeOffset? NahravatOd,
    bool NahravatTed);

/// <summary>
/// Kdy se z telefonu začne nahrávat.
///
/// <para>
/// <b>Nález R3 a Filipovo rozhodnutí z 28. 10. 2026.</b> Telefony se hlásí
/// <b>15 minut před procedurou</b>, a procedura začíná pět minut před
/// startem (ZPJ 26) — dohromady <b>T−20</b>. Mapa naskakuje 10 minut před
/// procedurou (R4), tedy T−15: hlášení musí žít dřív než mapa, protože bez
/// poloh nemá mapa co kreslit.
/// </para>
///
/// <para>
/// <b>Posádka na to nesahá.</b> Filip tamtéž: *„my potřebujeme ale aby to
/// nemuseli posádky zapínat manuálně na vodě. Zápis v klubovně, pak se mu
/// nastaví a zkontroluje tracking (klidně slepý…) a hlavně pak už na to
/// nemusí posádky sahat. Rozprava udá čas startu a pak už se samo začne
/// trekovat až bude ta chvíle."* Řetěz je proto celý: rozprava zapíše
/// plánovaný start → telefon si ho stáhne → v T−20 si sám zapne nahrávání.
/// </para>
///
/// <para>
/// <b>Zpřísnění, ne rozvolnění.</b> Dnes se polohy berou od rozpravy do
/// uzavření dne, tedy klidně čtrnáct hodin
/// (<c>OknoRegaty.VychoziHodin</c>). Po téhle změně se berou jen tam, kde
/// je k nim důvod.
/// </para>
///
/// <para>
/// <b>Horní mez tu není schválně.</b> Plánovaný čas přijde jen pro
/// rozjížďku, která běží nebo se chystá (<c>ZavodnikSprava</c>); dojetá
/// žádný nevydá, takže se nahrávání zastaví samo tím, že čas zmizí. Druhá
/// mez by znamenala, že se telefon vypne uprostřed rozjížďky, která se
/// vlekla — a to je přesně ten případ, kdy je stopa nejpotřebnější. Tvrdý
/// konec okna drží server tak jako tak.
/// </para>
/// </summary>
public static class Hlaseni
{
    /// <summary>Startovní procedura trvá pět minut (ZPJ 26).</summary>
    public static readonly TimeSpan Procedura = TimeSpan.FromMinutes(5);

    /// <summary>Patnáct minut před procedurou — Filipovo rozhodnutí u R3.</summary>
    public static readonly TimeSpan PredProcedurou = TimeSpan.FromMinutes(15);

    /// <summary>
    /// Jak dlouho se telefon počítá za <b>hlásící se</b>, když se neozval.
    /// <para>
    /// Deset minut, tedy dvakrát takt hlášení (appka tluče po pěti —
    /// <c>tracker/hlasim-se.ts</c>, <c>JAK_CASTO_MS</c>). Jedno vynechané
    /// kolo se stane a nic neznamená; dvě už znamenají, že se něco děje.
    /// Táž úvaha jako u odesílání trasy (<c>stav.ts</c>: dvojnásobek
    /// intervalu).
    /// </para>
    /// <para>
    /// <b>Je to mez serveru, ne appky.</b> Posádka i pořadatel čtou „kdo se
    /// hlásí" ze stejné odpovědi, takže kdyby si každý počítal čerstvost
    /// po svém, jeden by viděl loď v poli a druhý ne.
    /// </para>
    /// </summary>
    public static readonly TimeSpan JesteCerstve = TimeSpan.FromMinutes(10);

    /// <summary>
    /// Ozval se telefon tak nedávno, že se dá říct „vysílá"? <c>false</c>,
    /// když se neozval nikdy — to není totéž jako „ozval se dávno", ale na
    /// vodě z toho plyne totéž: komise ho nevidí.
    /// </summary>
    public static bool Cerstve(DateTimeOffset? ozvalSeV, DateTimeOffset ted) =>
        ozvalSeV is { } kdy && ted - kdy <= JesteCerstve;

    /// <summary>Dohromady T−20.</summary>
    public static TimeSpan PredStartem => PredProcedurou + Procedura;

    /// <summary>
    /// Čas, odkdy telefon nahrává. <c>null</c>, když se neví, kdy se
    /// startuje — pak se nenahrává vůbec, protože není proti čemu měřit.
    /// </summary>
    public static DateTimeOffset? NahravatOd(DateTimeOffset? startV) =>
        startV is { } s ? s - PredStartem : null;

    /// <summary>
    /// Má se nahrávat už teď? Telefon si to počítá sám ze
    /// <see cref="NahravatOd"/>; server tu odpověď posílá jen proto, aby
    /// appka nemusela řešit hodiny, které jdou vedle.
    /// </summary>
    public static bool NahravatTed(DateTimeOffset? startV, DateTimeOffset ted) =>
        NahravatOd(startV) is { } od && ted >= od;
}
