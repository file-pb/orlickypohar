using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;

namespace OrlickyPohar.Api.Features.Fotky;

/// <summary>
/// Kam se soubory ukládají. Rozhraní je tu kvůli testům a kvůli tomu, že
/// úložiště nemusí být nastavené — ne kvůli výměně poskytovatele. Na to
/// stačí S3 protokol, který mluví R2 i všichni ostatní.
/// </summary>
public interface IUloziste
{
    /// <summary>Dá se do úložiště zapisovat? Bez klíčů se nahrávání nenabízí.</summary>
    bool Pripraveno { get; }

    /// <summary>Veřejná adresa, pod kterou jsou soubory vidět, nebo <c>null</c>.</summary>
    string? VerejnaAdresa { get; }

    /// <summary>
    /// Uloží soubor. <paramref name="cache"/> přepíše hlavičku
    /// <c>Cache-Control</c>; bez něj se soubor tváří jako nemněnný na rok,
    /// což platí pro fotky, ale ne pro dokumenty, které se dají odvolat.
    /// </summary>
    Task UlozAsync(string klic, byte[] data, string typ, CancellationToken ct, string? cache = null);

    /// <summary>Smaže soubor. Chybějící soubor není chyba.</summary>
    Task SmazAsync(string klic, CancellationToken ct);
}

/// <summary>
/// Nastavení úložiště, sekce <c>Fotky</c>.
/// <para>
/// Adresa endpointu, bucket a veřejná adresa jsou v prostředí — nic z toho
/// není tajemství. <b>Klíče jsou v <c>/run/secrets</c></b>
/// (<c>Fotky__KlicId</c>, <c>Fotky__Klic</c>), jako každé tajemství.
/// </para>
/// </summary>
public class FotkyNastaveni
{
    /// <summary>S3 endpoint, u R2 <c>https://&lt;účet&gt;.eu.r2.cloudflarestorage.com</c>.</summary>
    public string? Endpoint { get; set; }

    public string? Bucket { get; set; }

    /// <summary>Odkud soubory čte prohlížeč, třeba <c>https://orlickypohar-foto.klihovka.cz</c>.</summary>
    public string? VerejnaAdresa { get; set; }

    public string? KlicId { get; set; }
    public string? Klic { get; set; }

    public bool Uplne =>
        !string.IsNullOrWhiteSpace(Endpoint) && !string.IsNullOrWhiteSpace(Bucket)
        && !string.IsNullOrWhiteSpace(VerejnaAdresa)
        && !string.IsNullOrWhiteSpace(KlicId) && !string.IsNullOrWhiteSpace(Klic);
}

/// <summary>
/// Úložiště přes S3 protokol. Nastavené na Cloudflare R2, ale nic v něm
/// na R2 nezávisí kromě dvou přepínačů níž, které ostatním nevadí.
/// </summary>
public sealed class S3Uloziste(IAmazonS3 s3, FotkyNastaveni nastaveni) : IUloziste
{
    public bool Pripraveno => true;

    public string? VerejnaAdresa => nastaveni.VerejnaAdresa;

    public static IAmazonS3 Klient(FotkyNastaveni n) =>
        new AmazonS3Client(
            new BasicAWSCredentials(n.KlicId, n.Klic),
            new AmazonS3Config
            {
                ServiceURL = n.Endpoint,
                ForcePathStyle = true,
                AuthenticationRegion = "auto",
            });

    public async Task UlozAsync(
        string klic, byte[] data, string typ, CancellationToken ct, string? cache = null)
    {
        using var obsah = new MemoryStream(data);
        var pozadavek = new PutObjectRequest
        {
            BucketName = nastaveni.Bucket,
            Key = klic,
            InputStream = obsah,
            ContentType = typ,
            // R2 neumí streamované podepisování, které SDK používá jako
            // výchozí, ani jeho výchozí kontrolní součty (dokumentace
            // Cloudflaru k AWS SDK pro .NET). Obojí se musí vypnout.
            DisablePayloadSigning = true,
            DisableDefaultChecksumValidation = true,
        };

        // Soubor pod jedním klíčem se nikdy nemění — nová fotka je nový klíč.
        // Prohlížeč i Cloudflare ho proto smějí držet napořád. Dokument,
        // který se dá stáhnout z vývěsky, si řekne o svou hlavičku sám:
        // s roční cache by Cloudflare vydával kopii ještě rok po smazání.
        pozadavek.Headers.CacheControl = cache ?? "public, max-age=31536000, immutable";

        await s3.PutObjectAsync(pozadavek, ct);
    }

    public async Task SmazAsync(string klic, CancellationToken ct) =>
        await s3.DeleteObjectAsync(nastaveni.Bucket, klic, ct);
}

/// <summary>
/// Úložiště, které není nastavené. Čtení běží dál — obrázky, které už
/// existují, mají adresu — jen nahrávání se nenabízí.
/// </summary>
public sealed class NenastaveneUloziste(FotkyNastaveni nastaveni) : IUloziste
{
    public bool Pripraveno => false;

    public string? VerejnaAdresa =>
        string.IsNullOrWhiteSpace(nastaveni.VerejnaAdresa) ? null : nastaveni.VerejnaAdresa;

    public Task UlozAsync(
        string klic, byte[] data, string typ, CancellationToken ct, string? cache = null) =>
        throw new InvalidOperationException("Úložiště fotek není nastavené.");

    public Task SmazAsync(string klic, CancellationToken ct) =>
        throw new InvalidOperationException("Úložiště fotek není nastavené.");
}

public static class UlozisteRegistrace
{
    /// <summary>
    /// Zaregistruje úložiště. <b>Neúplné nastavení nespadne</b>, jen
    /// nahrávání vypne — web bez fotek je pořád web, zatímco aplikace, která
    /// nenaběhne kvůli chybějícímu klíči k fotkám, neukáže ani výsledky.
    /// </summary>
    public static bool PridejUloziste(this IServiceCollection services, IConfiguration konfigurace)
    {
        var nastaveni = konfigurace.GetSection("Fotky").Get<FotkyNastaveni>() ?? new FotkyNastaveni();
        // Soubor s tajemstvím často končí novým řádkem z editoru nebo `echo`.
        // V klíči by znamenal odmítnutý podpis bez jakéhokoliv vodítka.
        nastaveni.KlicId = nastaveni.KlicId?.Trim();
        nastaveni.Klic = nastaveni.Klic?.Trim();
        services.AddSingleton(nastaveni);

        if (!nastaveni.Uplne)
        {
            services.AddSingleton<IUloziste, NenastaveneUloziste>();
            return false;
        }

        services.AddSingleton(S3Uloziste.Klient(nastaveni));
        services.AddSingleton<IUloziste, S3Uloziste>();
        return true;
    }
}
