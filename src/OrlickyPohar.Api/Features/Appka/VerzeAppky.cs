using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace OrlickyPohar.Api.Features.Appka;

/// <summary>
/// Odkud běží JavaScript appky. Slova jsou ze smlouvy hlavičky
/// <see cref="VerzeAppky.Hlavicka"/> a ven jdou stejná, aby se v přehledu
/// i v hlavičce četlo totéž.
/// </summary>
public enum SpusteniAppky
{
    /// <summary>Běží bundle zabudovaný v balíčku z obchodu.</summary>
    [JsonStringEnumMemberName("vestavena")] Vestavena,

    /// <summary>Běží stažená aktualizace.</summary>
    [JsonStringEnumMemberName("stazena")] Stazena,

    /// <summary>
    /// expo-updates nouzově spustil zabudovaný bundle po chybě. Je to jediný
    /// stav, který říká, že se něco <b>rozbilo</b>, ne jen zpozdilo.
    /// </summary>
    [JsonStringEnumMemberName("nouzova")] Nouzova,
}

/// <summary>
/// Na čem telefon jede — přečtená hlavička <see cref="Hlavicka"/>.
///
/// <para>
/// <b>Proč to existuje</b> (Filip, listopad 2026): <i>„appka musí fungovat
/// nezávisle a musí se aktualizovat sama a to 100% spolehlivě. Až to bude
/// používat celá flotila, musí to být naprostá samozřejmost."</i> Do té doby
/// nikdo nevěděl, na čem který telefon jede, a ztracená aktualizace se dala
/// poznat jen dotazem na manifest Expa — tedy vůbec.
/// </para>
///
/// <para>
/// <b>Je to telemetrie, nikdy podklad pro oprávnění.</b> Hlavičku si pošle
/// kdokoliv s čímkoliv. Proto se čte shovívavě: neplatná nebo chybějící se
/// zahodí a požadavek jde dál, jako by nebyla — kvůli ní se nikdy nevrací
/// chyba. A proto se ukládá jen k identitě, kterou požadavek <b>už
/// prokázal</b> jinak (klíčem nebo tokenem zařízení), do zápisu, který se
/// dělá tak jako tak.
/// </para>
///
/// <para>
/// Tvar je pevná smlouva s appkou (<c>app/src/lib/sit.ts</c>):
/// <c>platforma=android;otisk=…;aktualizace=…;kanal=…;spusteni=vestavena|stazena|nouzova[;ceka=…]</c>.
/// </para>
/// </summary>
/// <param name="Platforma"><c>android</c> nebo <c>ios</c>.</param>
/// <param name="Otisk">Otisk nativní části (<c>runtimeVersion</c>), stejný tvar jako u <see cref="VydaniAppky"/>.</param>
/// <param name="Aktualizace">Identifikátor běžící aktualizace (<c>updateId</c>).</param>
/// <param name="Kanal">Kanál, ze kterého se aktualizace berou. <b>Může být prázdný.</b></param>
/// <param name="Spusteni">Odkud běží kód.</param>
/// <param name="Ceka">Stažená aktualizace, která se ještě nespustila.</param>
public sealed partial record VerzeAppky(
    string Platforma,
    string Otisk,
    Guid Aktualizace,
    string Kanal,
    SpusteniAppky Spusteni,
    Guid? Ceka)
{
    /// <summary>Hlavička, kterou nese každý požadavek appky.</summary>
    public const string Hlavicka = "X-Appka-Verze";

    /// <summary>
    /// Strop délky. Platná hlavička má nejvýš kolem 240 znaků; zbytek je
    /// rezerva pro klíče, které appka přidá později. Delší se ani nerozebírá.
    /// </summary>
    public const int NejvicZnaku = 1024;

    public const int KanalNejvic = 32;

    /// <summary>
    /// Přečte hlavičku. <c>null</c> u chybějící i u čehokoliv, co smlouvě
    /// neodpovídá — <b>celá, nebo nic</b>: polovina hlášení by v přehledu
    /// vypadala jako celé a nikdo by nepoznal, co v ní chybí.
    /// <para>
    /// <b>Neznámý klíč se přeskočí</b>, ne odmítne. Novější appka může
    /// přidat pole a starší server ji kvůli tomu nesmí přestat vidět. Klíč
    /// dvakrát je naopak dvojznačný, a tak je hlavička neplatná.
    /// </para>
    /// </summary>
    public static VerzeAppky? Precti(string? hodnota)
    {
        if (string.IsNullOrWhiteSpace(hodnota) || hodnota.Length > NejvicZnaku) return null;

        var pole = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var kus in hodnota.Split(';'))
        {
            if (string.IsNullOrWhiteSpace(kus)) continue;

            var rovnitko = kus.IndexOf('=');
            if (rovnitko < 0) return null;

            if (!pole.TryAdd(kus[..rovnitko].Trim(), kus[(rovnitko + 1)..].Trim())) return null;
        }

        if (!pole.TryGetValue("platforma", out var platforma)
            || !VydaniAppkyEndpoints.Platformy.Contains(platforma))
            return null;

        if (!pole.TryGetValue("otisk", out var otisk) || !VydaniAppkyEndpoints.Otisk().IsMatch(otisk))
            return null;

        if (!pole.TryGetValue("aktualizace", out var aktualizace)
            || !Guid.TryParseExact(aktualizace, "D", out var aktualizaceId))
            return null;

        // Prázdný kanál je platná hodnota — build bez kanálu žádný nemá.
        // Chybějící klíč ale smlouva nezná.
        if (!pole.TryGetValue("kanal", out var kanal) || !TvarKanalu().IsMatch(kanal)) return null;

        if (!pole.TryGetValue("spusteni", out var spusteniSlovo)
            || SpusteniZeSlova(spusteniSlovo) is not { } spusteni)
            return null;

        // Čekající aktualizace je nepovinná. Prázdná hodnota znamená totéž
        // co chybějící klíč; cokoliv jiného musí být identifikátor.
        Guid? ceka = null;
        if (pole.TryGetValue("ceka", out var cekaSlovo) && cekaSlovo.Length > 0)
        {
            if (!Guid.TryParseExact(cekaSlovo, "D", out var cekaId)) return null;
            ceka = cekaId;
        }

        return new VerzeAppky(platforma, otisk, aktualizaceId, kanal, spusteni, ceka);
    }

    /// <summary>
    /// Verze z požadavku, přečtená jednou a uschovaná v
    /// <see cref="HttpContext.Items"/>.
    /// <para>
    /// <b>Líně, ne middlewarem.</b> Čte ji autentizační handler klíče k účtu,
    /// který běží až uvnitř autorizace, i endpointy — a pořadí middlewarů
    /// by bylo další věc, která se dá splést. Takhle se rozebere při první
    /// otázce, ať přijde odkudkoliv.
    /// </para>
    /// <para>
    /// Hlavička poslaná dvakrát je dvojznačná a bere se jako žádná.
    /// </para>
    /// </summary>
    public static VerzeAppky? Z(HttpContext ctx)
    {
        if (ctx.Items.TryGetValue(KlicVKontextu, out var ulozena)) return ulozena as VerzeAppky;

        var hodnoty = ctx.Request.Headers[Hlavicka];
        var verze = hodnoty.Count == 1 ? Precti(hodnoty[0]) : null;
        ctx.Items[KlicVKontextu] = verze;
        return verze;
    }

    /// <summary>Naposledy uložené hlášení, nebo <c>null</c>, když se telefon nikdy nehlásil.</summary>
    public static VerzeAppky? Z(IHlasiVerzi ulozena) =>
        ulozena is
        {
            VerzeHlasenaV: not null,
            VerzePlatforma: { } platforma,
            VerzeOtisk: { } otisk,
            VerzeAktualizace: { } aktualizace,
            VerzeSpusteni: { } spusteni,
        }
            ? new VerzeAppky(platforma, otisk, aktualizace, ulozena.VerzeKanal ?? "", spusteni, ulozena.VerzeCeka)
            : null;

    /// <summary>
    /// Zapíše hlášení k identitě. <b>Neukládá</b> — volající to udělá v zápisu,
    /// který dělá tak jako tak (ozvání klíče, registrace zařízení).
    /// <para>
    /// <see cref="IHlasiVerzi.VerzeOdV"/> se posune <b>jen se změnou dvojice
    /// otisk + aktualizace</b>: to je to, co určuje, jaký kód běží. Kanál
    /// ani čekající stažená aktualizace na stáří běžícího kódu nic nemění.
    /// </para>
    /// </summary>
    public static void Zapis(IHlasiVerzi cil, VerzeAppky verze, DateTimeOffset ted)
    {
        if (cil.VerzeOdV is null
            || cil.VerzeOtisk != verze.Otisk
            || cil.VerzeAktualizace != verze.Aktualizace)
            cil.VerzeOdV = ted;

        cil.VerzePlatforma = verze.Platforma;
        cil.VerzeOtisk = verze.Otisk;
        cil.VerzeAktualizace = verze.Aktualizace;
        cil.VerzeKanal = verze.Kanal;
        cil.VerzeSpusteni = verze.Spusteni;
        cil.VerzeCeka = verze.Ceka;
        cil.VerzeHlasenaV = ted;
    }

    /// <summary>Slovo ze smlouvy na hodnotu. Táž slova nese <see cref="SpusteniAppky"/> ven.</summary>
    private static SpusteniAppky? SpusteniZeSlova(string slovo) => slovo switch
    {
        "vestavena" => SpusteniAppky.Vestavena,
        "stazena" => SpusteniAppky.Stazena,
        "nouzova" => SpusteniAppky.Nouzova,
        _ => null,
    };

    private static readonly object KlicVKontextu = new();

    [GeneratedRegex("^[a-z0-9-]{0,32}$")]
    internal static partial Regex TvarKanalu();
}

/// <summary>
/// Identita, ke které se ukládá, na čem telefon jede: klíč k účtu, klíč
/// k lodi a zařízení pro upozornění.
/// <para>
/// <b>Předpona <c>Verze</c> je schválně.</b> <c>Otisk</c> na klíčích už
/// znamená otisk tajemství; otisk nativní části appky je jiná věc a nesmí
/// se s ním splést ani v kódu, ani v databázi.
/// </para>
/// <para>
/// Sloupce jsou jen přidané a všechny prázdné, dokud se telefon neozve
/// s hlavičkou — rozšíř a stáhni, nic se nepřejmenovává.
/// </para>
/// </summary>
public interface IHlasiVerzi
{
    /// <summary><c>android</c> nebo <c>ios</c>, jak ho telefon hlásí v hlavičce.</summary>
    string? VerzePlatforma { get; set; }

    /// <summary>Otisk nativní části (<c>runtimeVersion</c>), na kterém telefon jede.</summary>
    string? VerzeOtisk { get; set; }

    /// <summary>Běžící aktualizace (<c>updateId</c>).</summary>
    Guid? VerzeAktualizace { get; set; }

    /// <summary>Kanál aktualizací. Prázdný řetězec je hlášený „bez kanálu", <c>null</c> „nehlásil".</summary>
    string? VerzeKanal { get; set; }

    /// <summary>Odkud běží kód.</summary>
    SpusteniAppky? VerzeSpusteni { get; set; }

    /// <summary>Stažená aktualizace, která čeká na příští spuštění.</summary>
    Guid? VerzeCeka { get; set; }

    /// <summary>Od kdy běží tahle dvojice otisk + aktualizace.</summary>
    DateTimeOffset? VerzeOdV { get; set; }

    /// <summary>Kdy přišlo poslední platné hlášení.</summary>
    DateTimeOffset? VerzeHlasenaV { get; set; }
}
