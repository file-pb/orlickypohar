using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace OrlickyPohar.Api.Features.Fotky;

/// <summary>Varianty jedné fotky, připravené k uložení.</summary>
public record Varianty(byte[] Nahled, byte[] Velky, int Sirka, int Vyska);

/// <summary>
/// Z nahraného souboru udělá dvě varianty ve WebP.
/// <para>
/// <b>Obrázek se vždycky přepočítá, nikdy neuloží, jak přišel.</b> Fotka
/// z telefonu nese v EXIF souřadnice místa, kde vznikla — u fotky z chaty
/// je to adresa, kde člověk bydlí. Nové kódování metadata zahodí a zároveň
/// ověří, že soubor je opravdu obrázek, ne něco s koncovkou <c>.jpg</c>.
/// </para>
/// <para>
/// <b>WebP, ne AVIF.</b> Knihovna AVIF neumí zapsat a WebP dnes zobrazí
/// každý prohlížeč i obě mobilní platformy. JPEG jako záloha tu proto není.
/// </para>
/// <para>
/// ImageSharp je čistě řízený kód, bez nativních knihoven — běží stejně na
/// alpine, na ARM i na vývojovém stroji. Licence: Six Labors Split License,
/// pro jednotlivce s obratem pod milion dolarů zdarma. Od řady 4 se licence
/// ověřuje při buildu — klíč je v prostředí (`SIXLABORS_LICENSE_KEY`), ne
/// v gitu. Důvod přechodu na 4.1.2: v řadě 3.1 zůstalo pět ohlášených
/// zranitelností bez opravy, čtyři z nich nedosažitelné kvůli omezené
/// sadě dekodérů níž.
/// </para>
/// </summary>
public static class Zpracovani
{
    /// <summary>
    /// Jen formáty, které z telefonu a foťáku opravdu chodí. Každý další
    /// dekodér (TIFF, BMP, GIF) je kód, který čte cizí vstup a nic nepřináší.
    /// </summary>
    private static readonly Configuration Formaty = new(
        new JpegConfigurationModule(),
        new PngConfigurationModule(),
        new WebpConfigurationModule());

    private static readonly DecoderOptions Dekoder = new() { Configuration = Formaty, MaxFrames = 1 };

    private static readonly WebpEncoder Koder = new()
    {
        FileFormat = WebpFileFormatType.Lossy,
        Quality = 80,
    };

    public const string Nepodporovane =
        "Soubor se nedá přečíst jako fotka. Nahraj JPEG, PNG nebo WebP.";

    public static async Task<(Varianty? Varianty, string? Chyba)> ZpracujAsync(
        Stream vstup, CancellationToken ct)
    {
        // Rozměry se zjistí z hlavičky dřív, než se obrázek rozbalí do paměti.
        ImageInfo info;
        try
        {
            info = await Image.IdentifyAsync(Dekoder, vstup, ct);
        }
        catch (Exception e) when (e is UnknownImageFormatException or InvalidImageContentException
                                      or NotSupportedException)
        {
            return (null, Nepodporovane);
        }

        if ((long)info.Width * info.Height > Nahravani.NejvicPixelu)
            return (null, $"Fotka je moc velká. Zmenši ji pod {Nahravani.NejvicPixelu / 1_000_000} Mpx.");

        vstup.Position = 0;

        Image obrazek;
        try
        {
            obrazek = await Image.LoadAsync(Dekoder, vstup, ct);
        }
        catch (Exception e) when (e is UnknownImageFormatException or InvalidImageContentException
                                      or NotSupportedException)
        {
            return (null, Nepodporovane);
        }

        using (obrazek)
        {
            // Telefon fotí na výšku, ale ukládá na šířku s příznakem otočení.
            // Po přepočtu by příznak zmizel a fotka by ležela na boku.
            obrazek.Mutate(x => x.AutoOrient());

            // Barevný profil zůstává — bez něj by fotka z iPhonu vybledla.
            // Všechno ostatní pryč, hlavně poloha.
            obrazek.Metadata.ExifProfile = null;
            obrazek.Metadata.XmpProfile = null;
            obrazek.Metadata.IptcProfile = null;

            var (velky, sirka, vyska) = await VariantaAsync(obrazek, Nahravani.SirkaVelke, ct);
            var (nahled, _, _) = await VariantaAsync(obrazek, Nahravani.SirkaNahledu, ct);

            return (new Varianty(nahled, velky, sirka, vyska), null);
        }
    }

    /// <summary>Zmenšená kopie. <b>Nezvětšuje</b> — malá fotka zůstane malá, jen převedená.</summary>
    private static async Task<(byte[] Data, int Sirka, int Vyska)> VariantaAsync(
        Image obrazek, int sirka, CancellationToken ct)
    {
        using var kopie = obrazek.Width > sirka
            ? obrazek.Clone(x => x.Resize(sirka, 0))
            : obrazek.Clone(_ => { });

        using var vystup = new MemoryStream();
        await kopie.SaveAsync(vystup, Koder, ct);
        return (vystup.ToArray(), kopie.Width, kopie.Height);
    }
}
