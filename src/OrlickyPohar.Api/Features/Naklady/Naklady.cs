using System.Text.Json;
using System.Text.Json.Serialization;

namespace OrlickyPohar.Api.Features.Naklady;

/// <summary>
/// Jedna položka nákladů tak, jak ji vidí správce: v korunách, za měsíc
/// i za rok, už včetně přirážky.
/// </summary>
/// <param name="Polozka">Za co se platí, česky.</param>
/// <param name="KcMesicne">Měsíčně v korunách, s přirážkou.</param>
/// <param name="KcRocne">Dvanáctinásobek — roční platba se nikde nedělí jinak.</param>
/// <param name="Poznamka">Čím je částka podložená; prázdná být nemá.</param>
/// <param name="Slozky">
/// Z čeho se položka skládá — u serveru paměť, procesor a disk. <b>Není to
/// dalších pár položek</b>: sčítají se do svého řádku, ne do součtu tabulky.
/// Prázdné u položek, které se rozebírat nedají.
/// </param>
public record NakladovaPolozka(
    string Polozka,
    decimal KcMesicne,
    decimal KcRocne,
    string? Poznamka,
    IReadOnlyList<NakladovaPolozka>? Slozky = null);

/// <summary>
/// Kolik práce projekt spotřeboval. Peníze tu nejsou schválně — hodinová
/// sazba nikde zadaná není a vymýšlet si ji by z odhadu udělalo fakturu.
/// </summary>
public record PraceDto(decimal StavbaH, decimal Udrzba30H, int CiMinut);

/// <summary>
/// <b>Kolik už projekt stál dohromady</b>, od prvního zaplaceného měsíce
/// dodnes — ne kolik by stál za rok.
/// <para>
/// Roční částka je dvanáctinásobek dneška, a 95 % z ní je předplatné, které
/// jde vypovědět po měsíci; je to tedy závazek, který nikdo neudělal
/// (Filip, 13. 11. 2026: <i>„tady to každého vyděsí"</i>).
/// </para>
/// <para>
/// <b>Počítá to platforma, ne pohár.</b> Rozpočítání podílu na předplatném,
/// kurz a dělení měsíce na dny jsou v <c>prehled-stav.sh</c>; druhá
/// implementace tady by se rozešla první změnou sazby. Odsud přibude jen
/// přirážka, stejně jako u každé jiné položky.
/// </para>
/// </summary>
/// <param name="Od">První zaplacený den, <c>YYYY-MM-DD</c>.</param>
/// <param name="Dnu">Kolik dní od <paramref name="Od"/> uplynulo.</param>
/// <param name="Poznamka">Čím to číslo přesně je — kolik dní stojí na
/// skutečných denních číslech a kolik je dopočteno z dnešní sazby. Bez ní
/// by to vypadalo přesněji, než to je.</param>
public record ZatimDto(
    string Od,
    int Dnu,
    decimal ProvozKc,
    decimal ServisKc,
    decimal CelkemKc,
    string Poznamka);

/// <summary>
/// Jeden den vývoje provozu: kolik by stál měsíc, kdyby celý vypadal jako
/// ten den. Servis v tom není — předplatné se dnem nehýbe a historii ho
/// platforma nevede.
/// </summary>
public record DenNakladu(string Den, decimal ProvozKcMesicne);

/// <summary>
/// Co pohár stojí. Provoz je to, co běží, servis to, co je potřeba platit,
/// aby na tom šlo dělat — dvě různé otázky, proto dva seznamy.
/// </summary>
/// <param name="Kdy">Kdy čísla spočítala platforma, ne kdy se ptáme.</param>
/// <param name="PrirazkaProcent">Kolik procent je na položkách navíc proti přehledu platformy.</param>
public record NakladyDto(
    DateTimeOffset Kdy,
    decimal PrirazkaProcent,
    IReadOnlyList<NakladovaPolozka> Provoz,
    IReadOnlyList<NakladovaPolozka> Servis,
    decimal ProvozKcMesicne,
    decimal ProvozKcRocne,
    decimal ServisKcMesicne,
    decimal ServisKcRocne,
    decimal CelkemKcMesicne,
    decimal CelkemKcRocne,
    PraceDto? Prace,
    IReadOnlyList<DenNakladu> Historie,
    ZatimDto? Zatim);

/// <summary>
/// Tvar souboru, který vedle své stránky zapisuje <c>prehled-stav.sh</c>
/// v repozitáři platformy. Jména polí jsou tam, ne tady — proto jsou
/// vypsaná ručně a ne odvozená z konvence: kdyby se zdroj přejmenoval,
/// má to prasknout na jednom viditelném místě.
/// </summary>
internal record Zdroj(
    [property: JsonPropertyName("kdy")] DateTimeOffset Kdy,
    [property: JsonPropertyName("kurz")] ZdrojKurz? Kurz,
    [property: JsonPropertyName("projekty")] IReadOnlyList<ZdrojProjekt>? Projekty);

internal record ZdrojKurz([property: JsonPropertyName("eur_kc")] decimal? EurKc);

internal record ZdrojProjekt(
    [property: JsonPropertyName("projekt")] string Projekt,
    [property: JsonPropertyName("provoz")] IReadOnlyList<ZdrojPolozka>? Provoz,
    [property: JsonPropertyName("servis")] IReadOnlyList<ZdrojPolozka>? Servis,
    [property: JsonPropertyName("prace")] ZdrojPrace? Prace,
    [property: JsonPropertyName("historie")] IReadOnlyList<ZdrojDen>? Historie,
    [property: JsonPropertyName("zatim")] ZdrojZatim? Zatim = null);

internal record ZdrojPolozka(
    [property: JsonPropertyName("polozka")] string Polozka,
    [property: JsonPropertyName("kc_mesicne")] decimal? KcMesicne,
    [property: JsonPropertyName("eur_mesicne")] decimal? EurMesicne,
    [property: JsonPropertyName("poznamka")] string? Poznamka,
    [property: JsonPropertyName("slozky")] IReadOnlyList<ZdrojPolozka>? Slozky = null);

internal record ZdrojPrace(
    [property: JsonPropertyName("stavba_h")] decimal StavbaH,
    [property: JsonPropertyName("udrzba30_h")] decimal Udrzba30H,
    [property: JsonPropertyName("ci_minut")] int CiMinut);

/// <summary>
/// <b>Všechno nullable, a je to tak schválně.</b> Když platforma nezná den,
/// odkdy se platí, vydá celý blok prázdný i s poznámkou proč — číslo
/// spočítané z vymyšleného začátku by vypadalo stejně důvěryhodně jako to
/// pravé. Pohár tedy nedostává nulu, ale nic.
/// </summary>
internal record ZdrojZatim(
    [property: JsonPropertyName("od")] string? Od,
    [property: JsonPropertyName("dnu")] int? Dnu,
    [property: JsonPropertyName("provoz_kc")] decimal? ProvozKc,
    [property: JsonPropertyName("servis_kc")] decimal? ServisKc,
    [property: JsonPropertyName("celkem_kc")] decimal? CelkemKc,
    [property: JsonPropertyName("poznamka")] string? Poznamka);

internal record ZdrojDen(
    [property: JsonPropertyName("den")] string Den,
    [property: JsonPropertyName("provoz_kc_mesicne")] decimal ProvozKcMesicne);

/// <summary>
/// Přepočet nákladů platformy na to, co vidí správce poháru.
/// <b>Čistá funkce</b>, schválně: jediné, co se tu děje, je aritmetika,
/// a ta se musí dát zkoušet bez souboru na disku.
/// <para>
/// <b>Přirážka se počítá na položkách, ne na součtu.</b> Na dnešních číslech
/// je rozdíl korunový, ale tabulka, jejíž řádky nedávají dohromady její
/// vlastní součet, vypadá jako chyba — a člověk, který si ji přepočítá na
/// papíře, má pravdu.
/// </para>
/// </summary>
public static class Prepocet
{
    /// <summary>Čím se násobí měsíc na rok. Žádné roční slevy tu nejsou.</summary>
    private const decimal Mesicu = 12m;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Náklady projektu z obsahu souboru platformy, nebo <c>null</c>, když
    /// ho zdroj nezná. Vyhodí <see cref="JsonException"/>, když soubor není
    /// JSON — rozbitý vstup není totéž co chybějící projekt.
    /// </summary>
    public static NakladyDto? ZeJsonu(string json, string projekt, decimal prirazkaProcent)
    {
        var zdroj = JsonSerializer.Deserialize<Zdroj>(json, Json);
        return zdroj is null ? null : Spocitej(zdroj, projekt, prirazkaProcent);
    }

    /// <summary>
    /// Náklady jednoho projektu, nebo <c>null</c>, když ho zdroj nezná —
    /// to je jiný případ než „stojí nulu" a nesmí se s ním slít.
    /// </summary>
    internal static NakladyDto? Spocitej(Zdroj zdroj, string projekt, decimal prirazkaProcent)
    {
        var p = zdroj.Projekty?.FirstOrDefault(x =>
            string.Equals(x.Projekt, projekt, StringComparison.OrdinalIgnoreCase));
        if (p is null) return null;

        var kurz = zdroj.Kurz?.EurKc;
        var provoz = Polozky(p.Provoz, kurz, prirazkaProcent);
        var servis = Polozky(p.Servis, kurz, prirazkaProcent);

        var provozMesicne = provoz.Sum(x => x.KcMesicne);
        var servisMesicne = servis.Sum(x => x.KcMesicne);

        var nasobek = 1m + prirazkaProcent / 100m;

        return new NakladyDto(
            zdroj.Kdy,
            prirazkaProcent,
            provoz,
            servis,
            provozMesicne,
            provoz.Sum(x => x.KcRocne),
            servisMesicne,
            servis.Sum(x => x.KcRocne),
            provozMesicne + servisMesicne,
            provoz.Sum(x => x.KcRocne) + servis.Sum(x => x.KcRocne),
            p.Prace is { } prace ? new PraceDto(prace.StavbaH, prace.Udrzba30H, prace.CiMinut) : null,
            // Historie nese tutéž přirážku jako dnešek. Bez ní by graf ukazoval
            // jiná čísla než tabulka nad ním a vypadalo by to jako pokles.
            (p.Historie ?? [])
                .Select(d => new DenNakladu(d.Den, d.ProvozKcMesicne * nasobek))
                .ToList(),
            Zatim(p.Zatim, nasobek));
    }

    /// <summary>
    /// Kumulativní částky s přirážkou, nebo <c>null</c>.
    /// <para>
    /// <b>Buď celý blok, nebo nic.</b> Platforma při chybějícím datu vydá
    /// prázdná pole i s poznámkou proč; půlka bloku by na obrazovce dala
    /// větu „zaplaceno zatím 0 Kč", což není totéž co „neví se".
    /// </para>
    /// <para>
    /// <b>Poznámka se nemění.</b> Popisuje, jak platforma k číslu došla —
    /// přirážka v něm není a nikde na obrazovce se nejmenuje, stejně jako
    /// u ostatních položek.
    /// </para>
    /// </summary>
    private static ZatimDto? Zatim(ZdrojZatim? z, decimal nasobek) =>
        z is { Od: { } od, Dnu: { } dnu, CelkemKc: { } celkem }
            ? new ZatimDto(
                od,
                dnu,
                (z.ProvozKc ?? 0m) * nasobek,
                (z.ServisKc ?? 0m) * nasobek,
                celkem * nasobek,
                z.Poznamka ?? "")
            : null;

    private static List<NakladovaPolozka> Polozky(
        IReadOnlyList<ZdrojPolozka>? zdroj, decimal? kurz, decimal prirazkaProcent)
    {
        var nasobek = 1m + prirazkaProcent / 100m;

        return (zdroj ?? [])
            .Select(x =>
            {
                // Koruny v souboru jsou, ale spolehnout se na ně samo o sobě
                // nejde: položka může být vedená jen v eurech. Kurz je ve
                // stejném souboru, takže se nikdy nemíchá s jiným dnem.
                var kc = x.KcMesicne ?? (x.EurMesicne is { } eur && kurz is { } k ? eur * k : 0m);
                var sPrirazkou = kc * nasobek;

                return new NakladovaPolozka(
                    x.Polozka, sPrirazkou, sPrirazkou * Mesicu, x.Poznamka,
                    x.Slozky is null ? null : Polozky(x.Slozky, kurz, prirazkaProcent));
            })
            .ToList();
    }
}
