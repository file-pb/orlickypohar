using System.Text.Json.Serialization;

namespace OrlickyPohar.Api.Features.Appka;

/// <summary>Čím se telefon serveru prokazuje. Jeden telefon může mít víc identit naráz.</summary>
public enum DruhIdentityFlotily
{
    /// <summary>Klíč k účtu — telefon napojený kódem z webu.</summary>
    [JsonStringEnumMemberName("ucet")] Ucet,

    /// <summary>Mobilní klíč k lodi.</summary>
    [JsonStringEnumMemberName("lod")] Lod,

    /// <summary>Zařízení zapsané k upozorněním.</summary>
    [JsonStringEnumMemberName("zarizeni")] Zarizeni,
}

/// <summary>Jak na tom telefon je proti tomu, co je venku.</summary>
public enum StavVerzeAppky
{
    /// <summary>Jede na posledním balíčku i na poslední aktualizaci, o které server ví.</summary>
    [JsonStringEnumMemberName("aktualni")] Aktualni,

    /// <summary>
    /// Otisk není ten z posledního vydaného balíčku pro platformu. Po síti
    /// se to nespraví — aktualizace pro starý otisk nejsou, je potřeba obchod.
    /// </summary>
    [JsonStringEnumMemberName("stary-balicek")] StaryBalicek,

    /// <summary>Balíček sedí, ale neběží poslední aktualizace publikovaná pro jeho kanál a otisk.</summary>
    [JsonStringEnumMemberName("stara-aktualizace")] StaraAktualizace,

    /// <summary>expo-updates spustil nouzově zabudovaný bundle — něco se rozbilo.</summary>
    [JsonStringEnumMemberName("nouzove")] Nouzove,

    /// <summary>Telefon nikdy neposlal platnou hlavičku. Buď jede na appce, která ji ještě neumí, nebo je mrtvý.</summary>
    [JsonStringEnumMemberName("bez-hlaseni")] BezHlaseni,
}

/// <summary>Jedna identita ve flotile. Žádná tajemství, žádné tokeny.</summary>
/// <param name="Druh">Čím se telefon prokazuje.</param>
/// <param name="Id">Číslo záznamu v rámci druhu.</param>
/// <param name="Popis">Lidsky: čí je, nebo jaká je to platforma.</param>
/// <param name="Platforma">Platforma z hlášení.</param>
/// <param name="CisloBalicku">Číslo balíčku dopočtené z otisku; <c>null</c>, když otisk mezi vydanými není.</param>
/// <param name="Otisk">Otisk nativní části z hlášení.</param>
/// <param name="Kanal">Kanál z hlášení. Prázdný = build bez kanálu.</param>
/// <param name="Spusteni">Odkud běží kód.</param>
/// <param name="Aktualizace">Běžící aktualizace.</param>
/// <param name="Ceka">Stažená aktualizace, která čeká na příští spuštění.</param>
/// <param name="OdV">Od kdy běží tahle dvojice otisk + aktualizace.</param>
/// <param name="HlasenoV">Poslední platné hlášení.</param>
/// <param name="AktivniV">
/// Kdy se identita naposledy ozvala vůbec, i bez hlášení. Rozliší telefon,
/// který jede na appce bez hlavičky, od mrtvého.
/// </param>
/// <param name="Stav">Stav proti tomu, co je venku.</param>
/// <param name="PosledniCisloBalicku">Poslední vydaný balíček pro platformu z hlášení.</param>
/// <param name="PosledniAktualizace">Poslední publikovaná aktualizace pro kanál a otisk z hlášení.</param>
public record FlotilaRadekDto(
    DruhIdentityFlotily Druh,
    int Id,
    string Popis,
    string? Platforma,
    int? CisloBalicku,
    string? Otisk,
    string? Kanal,
    SpusteniAppky? Spusteni,
    Guid? Aktualizace,
    Guid? Ceka,
    DateTimeOffset? OdV,
    DateTimeOffset? HlasenoV,
    DateTimeOffset? AktivniV,
    StavVerzeAppky Stav,
    int? PosledniCisloBalicku,
    Guid? PosledniAktualizace);

/// <summary>
/// Souhrn jednoho druhu identit. <b>Druhy se nesčítají</b>: jeden telefon
/// může mít klíč k účtu, klíč k lodi i zápis k upozorněním, a součet by ho
/// počítal třikrát.
/// </summary>
public record FlotilaSouhrnDto(
    DruhIdentityFlotily Druh,
    int Celkem,
    int Aktualni,
    int StaryBalicek,
    int StaraAktualizace,
    int Nouzove,
    int BezHlaseni);

/// <summary>Poslední vydaný balíček jedné platformy — to, proti čemu se měří.</summary>
public record PosledniBalicekDto(string Platforma, int CisloBalicku, string Otisk, DateTimeOffset VydanoV);

/// <summary>Na čem flotila jede: souhrn po druzích, řádek na identitu a měřítko.</summary>
public record FlotilaDto(
    List<FlotilaSouhrnDto> Souhrn,
    List<FlotilaRadekDto> Radky,
    List<PosledniBalicekDto> Balicky);

/// <summary>Publikovaná aktualizace, jak ji vidí správa.</summary>
/// <param name="CisloBalicku">Balíček s tímhle otiskem; <c>null</c>, když mezi vydanými není.</param>
public record PublikaceAppkyDto(
    string Platforma,
    string Kanal,
    string Otisk,
    Guid Aktualizace,
    string? Commit,
    DateTimeOffset PublikovanoV,
    int? CisloBalicku);

/// <summary>
/// Co je venku — vydané balíčky a publikované aktualizace — a stav telefonu
/// proti tomu. <b>Čisté funkce</b>, bez databáze: výpočet stavu je to, na čem
/// přehled stojí, a musí se dát zkoušet bez Dockeru.
/// </summary>
public sealed class Vydano
{
    private readonly Dictionary<string, VydaniAppky> _posledni;
    private readonly Dictionary<(string Platforma, string Otisk), List<VydaniAppky>> _podleOtisku;
    private readonly Dictionary<(string Platforma, string Kanal, string Otisk), PublikaceAppky> _publikace;

    public Vydano(IEnumerable<VydaniAppky> balicky, IEnumerable<PublikaceAppky> publikace)
    {
        var vsechny = balicky.ToList();

        // Poslední je ten s nejvyšším číslem, ne ten zapsaný naposledy:
        // ruční „nahrát znovu" pošle starší číslo později.
        _posledni = vsechny
            .GroupBy(b => b.Platforma)
            .ToDictionary(g => g.Key, g => g.MaxBy(b => b.CisloBalicku)!);

        _podleOtisku = vsechny
            .GroupBy(b => (b.Platforma, b.Otisk))
            .ToDictionary(g => g.Key, g => g.ToList());

        // Poslední je ta zapsaná naposledy. Identifikátory jsou náhodné,
        // pořadí nenesou; při shodě času rozhoduje pořadí zápisu.
        _publikace = publikace
            .GroupBy(p => (p.Platforma, p.Kanal, p.Otisk))
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(p => p.PublikovanoV).ThenByDescending(p => p.Id).First());
    }

    /// <summary>Poslední vydané balíčky, jeden na platformu.</summary>
    public IEnumerable<VydaniAppky> PosledniBalicky =>
        _posledni.Values.OrderBy(b => b.Platforma, StringComparer.Ordinal);

    public VydaniAppky? PosledniBalicek(string platforma) => _posledni.GetValueOrDefault(platforma);

    /// <summary>
    /// Číslo balíčku s tímhle otiskem. Sdílí-li otisk víc balíčků (nová
    /// čísla bez nativní změny), vrací nejvyšší — pro aktualizace jsou
    /// zaměnitelné, protože mají tutéž nativní část.
    /// </summary>
    public int? CisloBalicku(string platforma, string otisk) =>
        _podleOtisku.TryGetValue((platforma, otisk), out var b) ? b.Max(x => x.CisloBalicku) : null;

    public PublikaceAppky? PosledniPublikace(string platforma, string kanal, string otisk) =>
        _publikace.GetValueOrDefault((platforma, kanal, otisk));

    /// <summary>
    /// Stav telefonu. Pořadí podmínek je pořadí závažnosti: kdo se nehlásí,
    /// o tom se neví nic; nouzové spuštění znamená, že se něco rozbilo;
    /// starý balíček se po síti nespraví; stará aktualizace se spraví sama.
    /// <para>
    /// <b>Bez záznamu o vydání se balíček neposuzuje</b> a bez publikace
    /// aktualizace taky ne: „novější" nemá s čím porovnat, a vymyslet si
    /// zastaralost by z přehledu udělalo poplach, kterému nikdo nevěří.
    /// </para>
    /// <para>
    /// <b>Vestavěný bundle z téhož commitu jako poslední publikace je
    /// aktuální</b>, přestože má jiný identifikátor. Po nativní změně vznikne
    /// z jednoho commitu balíček i aktualizace (commit balíčku je ten, ze
    /// kterého ho postavil EAS — <c>app/scripts/zapis-vydani.sh</c>).
    /// Aktualizace bývá publikovaná dřív, než EAS balíček zabalí, a
    /// expo-updates nahraje jen aktualizaci novější než běžící, přičemž
    /// vestavěná dostane čas zabalení — ověřeno v expo-updates 57.0.26:
    /// <c>utils/build/createManifestForBuildAsync.js:41</c> (čas)
    /// a <c>LoaderSelectionPolicyFilterAware.kt:57</c> (porovnání). Čerstvá
    /// instalace z obchodu na té aktualizaci tedy nikdy nepoběží a bez téhle
    /// výjimky by svítila jako zastaralá až do další publikace — právě ve
    /// chvíli, kdy je nejaktuálnější.
    /// </para>
    /// </summary>
    public StavVerzeAppky Stav(VerzeAppky? verze)
    {
        if (verze is null) return StavVerzeAppky.BezHlaseni;
        if (verze.Spusteni == SpusteniAppky.Nouzova) return StavVerzeAppky.Nouzove;

        if (PosledniBalicek(verze.Platforma) is { } balicek && balicek.Otisk != verze.Otisk)
            return StavVerzeAppky.StaryBalicek;

        if (PosledniPublikace(verze.Platforma, verze.Kanal, verze.Otisk) is not { } publikace
            || publikace.Aktualizace == verze.Aktualizace)
            return StavVerzeAppky.Aktualni;

        if (verze.Spusteni == SpusteniAppky.Vestavena
            && _podleOtisku.TryGetValue((verze.Platforma, verze.Otisk), out var sOtiskem)
            && sOtiskem.Any(b => StejnyCommit(b.Commit, publikace.Commit)))
            return StavVerzeAppky.Aktualni;

        return StavVerzeAppky.StaraAktualizace;
    }

    /// <summary>
    /// Shoda commitů i mezi krátkým a plným hashem — oba zápisy berou 7 až
    /// 40 znaků. Chybějící commit se neshoduje s ničím.
    /// </summary>
    public static bool StejnyCommit(string? a, string? b) =>
        !string.IsNullOrEmpty(a) && !string.IsNullOrEmpty(b)
        && (a.StartsWith(b, StringComparison.OrdinalIgnoreCase)
            || b.StartsWith(a, StringComparison.OrdinalIgnoreCase));
}
