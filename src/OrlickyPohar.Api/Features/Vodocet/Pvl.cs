using System.Globalization;
using System.Net;
using System.Security.Cryptography.X509Certificates;
using System.Text.RegularExpressions;

namespace OrlickyPohar.Api.Features.Vodocet;

/// <summary>Jeden řádek z portálu Povodí Vltavy. Co zdroj u času neuvádí, je <c>null</c>.</summary>
public record MereniPvl(DateTimeOffset Cas, decimal Hladina, decimal? Objem, decimal? Pritok, decimal? Odtok);

/// <summary>Co je na stránce: aktuální hodnoty a řada pod nimi.</summary>
public record StrankaPvl(MereniPvl Aktualni, IReadOnlyList<MereniPvl> Rada);

/// <summary>
/// Rozbor stránky nádrže Orlík z portálu Povodí Vltavy.
/// <para>
/// <b>Čte se HTML, ne API</b> — Povodí data jinak nevydává. Stránka má dvě
/// tabulky, na kterých to stojí: „Aktuální hodnoty" (hladina, objem, přítok,
/// odtok) a řadu s hlavičkou „Datum" (hladina a odtok po hodinách za den,
/// pod tím denní hodnoty za týden). <b>Přítok v řadě není</b>, proto si ho
/// aplikace sbírá sama, viz <see cref="SberVodocetu"/>.
/// </para>
/// <para>
/// Časy jsou pražské. Když se tvar stránky změní, rozbor vrátí <c>null</c>
/// a sběr to jen zapíše do logu.
/// </para>
/// </summary>
public static partial class Pvl
{
    public const string Adresa = "https://www.pvl.cz/portal/nadrze/cz/pc/Mereni.aspx?id=VLOR&oid=2";

    private static readonly TimeZoneInfo Praha = TimeZoneInfo.FindSystemTimeZoneById("Europe/Prague");
    private static readonly CultureInfo Cesky = CultureInfo.GetCultureInfo("cs-CZ");

    [GeneratedRegex(@"<table[\s\S]*?</table>", RegexOptions.IgnoreCase)]
    private static partial Regex Tabulka();

    [GeneratedRegex(@"<tr[\s\S]*?</tr>", RegexOptions.IgnoreCase)]
    private static partial Regex Radek();

    [GeneratedRegex(@"<t[dh][^>]*>([\s\S]*?)</t[dh]>", RegexOptions.IgnoreCase)]
    private static partial Regex Bunka();

    [GeneratedRegex(@"<[^>]*>")]
    private static partial Regex Znacka();

    [GeneratedRegex(@"\s+")]
    private static partial Regex Mezery();

    [GeneratedRegex(@"(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})")]
    private static partial Regex CasVTextu();

    private static string Text(string html) =>
        Mezery().Replace(WebUtility.HtmlDecode(Znacka().Replace(html, " ")), " ").Trim();

    private static List<List<List<string>>> Tabulky(string html) =>
    [
        .. Tabulka().Matches(html).Select(t =>
            Radek().Matches(t.Value).Select(r =>
                Bunka().Matches(r.Value).Select(c => Text(c.Groups[1].Value)).ToList()).ToList()),
    ];

    /// <summary>„334,72" → 334.72; prázdná buňka nebo nesmysl → null.</summary>
    private static decimal? Cislo(string? s) =>
        decimal.TryParse((s ?? "").Replace(" ", ""), NumberStyles.Number, Cesky, out var n) ? n : null;

    /// <summary>
    /// Pražský čas na UTC. Při podzimním posunu je hodina 2:00–3:00 dvakrát;
    /// bere se ta první — o hodinu posunuté měření za rok nikomu nevadí,
    /// spadlý sběr ano.
    /// </summary>
    public static DateTimeOffset? Cas(string text)
    {
        if (!DateTime.TryParseExact(text, "dd.MM.yyyy HH:mm", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var mistni))
            return null;

        if (Praha.IsInvalidTime(mistni)) mistni = mistni.AddHours(1);
        var posun = Praha.IsAmbiguousTime(mistni)
            ? Praha.GetAmbiguousTimeOffsets(mistni).Max()
            : Praha.GetUtcOffset(mistni);

        return new DateTimeOffset(mistni, posun).ToUniversalTime();
    }

    public static StrankaPvl? Rozeber(string html)
    {
        var vse = Tabulky(html);

        var aktualni = vse.FirstOrDefault(t => t.Count > 0 && t[0].Any(c => c.StartsWith("Aktu")));
        if (aktualni is null) return null;

        decimal? Hodnota(string zacatek) =>
            Cislo(aktualni.FirstOrDefault(r => r.Count > 1 && r[0].StartsWith(zacatek))?[1]);

        var hladina = Hodnota("Hladina");
        var casText = CasVTextu().Match(string.Join(" ", aktualni[0]));
        if (hladina is null || !casText.Success
            || Cas($"{casText.Groups[1].Value} {casText.Groups[2].Value}") is not { } cas)
            return null;

        var nyni = new MereniPvl(cas, hladina.Value, Hodnota("Objem"), Hodnota("Přítok"), Hodnota("Odtok"));

        var rada = vse.FirstOrDefault(t => t.Count > 0 && t[0].Contains("Datum")) ?? [];
        var mereni = rada.Skip(1)
            .Where(r => r.Count >= 3)
            .Select(r => (Cas: Cas(r[0]), Hladina: Cislo(r[1]), Odtok: Cislo(r[2])))
            .Where(r => r.Cas is not null && r.Hladina is not null)
            .Select(r => new MereniPvl(r.Cas!.Value, r.Hladina!.Value, null, null, r.Odtok))
            .OrderBy(m => m.Cas)
            .ToList();

        return new StrankaPvl(nyni, mereni);
    }

    /// <summary>
    /// Mezilehlý certifikát, který server Povodí Vltavy neposílá.
    /// <para>
    /// Jejich certifikát vydala „Alpiro RSA DV SSL CA 2", ale server
    /// přikládá jinou mezilehlou autoritu. Kontrola certifikátu zůstává
    /// zapnutá: tenhle článek se jen přidá k řetězu, kořen se ověřuje proti
    /// systému. Stažený z adresy uvedené v certifikátu serveru
    /// (http://crt.sectigo.com/AlpiroRSADVSSLCA2.crt), platí do 26. 3. 2035.
    /// Totéž dřív dělal web, viz historii <c>web/lib/pvl.ts</c>.
    /// </para>
    /// </summary>
    private const string AlpiroRsaDvSslCa2 = """
        -----BEGIN CERTIFICATE-----
        MIIGITCCBAmgAwIBAgIRAKZyV9GJog2rQ/Aa84oDN+AwDQYJKoZIhvcNAQEMBQAw
        XzELMAkGA1UEBhMCR0IxGDAWBgNVBAoTD1NlY3RpZ28gTGltaXRlZDE2MDQGA1UE
        AxMtU2VjdGlnbyBQdWJsaWMgU2VydmVyIEF1dGhlbnRpY2F0aW9uIFJvb3QgUjQ2
        MB4XDTI1MDMyNzAwMDAwMFoXDTM1MDMyNjIzNTk1OVowRjELMAkGA1UEBhMCQ1ox
        FjAUBgNVBAoTDUFscGlybyBzLnIuby4xHzAdBgNVBAMTFkFscGlybyBSU0EgRFYg
        U1NMIENBIDIwggGiMA0GCSqGSIb3DQEBAQUAA4IBjwAwggGKAoIBgQDUx47MPW7Y
        BVt2znX2Y8FbnYTLLajF9b4WYVcBK3IojDSeNONXkVvjMIi4koo570V4DBlrhugp
        XKB6YFj4X9zJ25vXNOG5KckxIwXEHAQCgxm2yE04abViDCIMIrQvJO04dCgfrqwE
        kdyGxyOT0Mt2YHUGeBUlsUg3Pnp8fuVc9bCk6CsPkQ/WdaRWnHP5uOG7VQBXpa58
        ZIQYAmJTh4AwLGGRT3mnMlvXDICDJP6SiHISGzYEmq2Z/WdQuKP3G9z4tHOKcjo6
        AGNCRs+pDaFyqLHZjc9w/ksrypUh6XYA4xGsmReRFYOppVVdj77O2w9b1tAucpe6
        p1GFXAYcHwtEkEznV+skxFG3VCn96gK0AMiSfvF2kOSok8g+0n4eFOnyz4U7hM3n
        JLIh3dxJeax3IAZb/FLJHxMu+0Bb/6LIFv7kRmM3YMIWY9fQAZ3qwVBA1OQjmDNs
        ZqQ4Bcjuf7b6462ingkX2LscilNBPmQl3iRVflzvc+uPYblwd249uPkCAwEAAaOC
        AW8wggFrMB8GA1UdIwQYMBaAFFZzWGSV+ZIasBIqBGJ5oUAViCFJMB0GA1UdDgQW
        BBR1CNT4yIybtYpS46aNIt7KR4u2fTAOBgNVHQ8BAf8EBAMCAYYwEgYDVR0TAQH/
        BAgwBgEB/wIBADATBgNVHSUEDDAKBggrBgEFBQcDATATBgNVHSAEDDAKMAgGBmeB
        DAECATBUBgNVHR8ETTBLMEmgR6BFhkNodHRwOi8vY3JsLnNlY3RpZ28uY29tL1Nl
        Y3RpZ29QdWJsaWNTZXJ2ZXJBdXRoZW50aWNhdGlvblJvb3RSNDYuY3JsMIGEBggr
        BgEFBQcBAQR4MHYwTwYIKwYBBQUHMAKGQ2h0dHA6Ly9jcnQuc2VjdGlnby5jb20v
        U2VjdGlnb1B1YmxpY1NlcnZlckF1dGhlbnRpY2F0aW9uUm9vdFI0Ni5wN2MwIwYI
        KwYBBQUHMAGGF2h0dHA6Ly9vY3NwLnNlY3RpZ28uY29tMA0GCSqGSIb3DQEBDAUA
        A4ICAQBQPX41avzHSSAVaFJPCr6GLxgeqj5XSl5GflqEZYnUMi11ZFb5R0DBEHIE
        ec/Og7pgUi3ehKt1OZ4hbjhrkhdNqYY260Go4Jf5XxmVLSHz1k1A6q+biCLo2eh1
        w8/TeTLus4opPh7VQHzYAYvHopiaof/QPoJlZFGvquzlnSA94Ffukse1fV+c3Xhz
        niz3wcf/bkTETz3C3cq2/0GJi0SIIoYMVbL0bLrZvO4REvYKk9dfozMBijIo1NDd
        sYQR79DplE3jzycMcGoVsJa2FFRF9N9qCkmFQ4x5BjRYR0NcJXqupV/aFU80ud39
        H0ZZOHNAQryjw+3YTK2gh6YT1iklUbtX2hNL4PwSnu0LPipyzK9smCY9P6BlSOd+
        gj6pUW/7d7I6hBnwpyk+/iZNFH4ViOMrmOJGiY5lJbH6TOP9e/FbiK51NTK4NPoE
        RvxyaKDpbIfZgi7AZGmAG3vQW2h+kugixbhK7z7qTkKOG9JTuHV7Px/xqIB6Wgse
        ddqZCVdZQamPCMtwdtZe7zG9Y7F8VBH5/78hsI7yqn3MRH1JPhlOrth17fyxR+dK
        iLg2lctsv/v2MpDcR/rhASt3TUbTDjT/VnS9/+xPoxl352FHBnME4D7puZWCt+d1
        OING0BUMXPhKecUb3wu27AtmJ06Cfuinj3ifnqfqP4xh5ZFEWQ==
        -----END CERTIFICATE-----
        """;

    /// <summary>HTTP klient s doplněným článkem řetězu. Jen pro PVL.</summary>
    public static HttpMessageHandler Handler()
    {
        var mezilehly = X509Certificate2.CreateFromPem(AlpiroRsaDvSslCa2);

        return new SocketsHttpHandler
        {
            SslOptions =
            {
                RemoteCertificateValidationCallback = (_, cert, _, chyby) =>
                {
                    if (chyby == System.Net.Security.SslPolicyErrors.None) return true;
                    if (cert is null
                        || chyby != System.Net.Security.SslPolicyErrors.RemoteCertificateChainErrors)
                        return false;

                    // Řetěz se staví znovu, jen s chybějícím článkem navíc.
                    // Kořen zůstává ze systémového úložiště.
                    using var retez = new X509Chain();
                    retez.ChainPolicy.ExtraStore.Add(mezilehly);
                    retez.ChainPolicy.RevocationMode = X509RevocationMode.NoCheck;
                    return retez.Build(new X509Certificate2(cert));
                },
            },
        };
    }
}
