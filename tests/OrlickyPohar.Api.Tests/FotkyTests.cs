using OrlickyPohar.Api.Features.Fotky;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Gif;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Metadata.Profiles.Exif;
using SixLabors.ImageSharp.PixelFormats;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla nahrávání a přepočet obrázku. Bez databáze a bez úložiště —
/// obrázky se kreslí přímo v testu.
/// </summary>
public class FotkyTests
{
    private const long Megabajt = 1024 * 1024;

    [Fact]
    public void Fotka_s_autorem_a_souhlasem_projde()
    {
        Assert.Null(Nahravani.ProcNejde(3 * Megabajt, "Jiří Tašl", "Start Izolepy", souhlas: true));
    }

    [Theory]
    [InlineData(0, "Jiří Tašl", true, "Vyber soubor")]
    [InlineData(16 * Megabajt, "Jiří Tašl", true, "15 MB")]
    [InlineData(Megabajt, "  ", true, "kdo fotku fotil")]
    [InlineData(Megabajt, null, true, "kdo fotku fotil")]
    public void Bez_souboru_nebo_autora_neprojde(long delka, string? autor, bool souhlas, string cast)
    {
        Assert.Contains(cast, Nahravani.ProcNejde(delka, autor, null, souhlas));
    }

    [Fact]
    public void Bez_souhlasu_se_nenahraje_nic()
    {
        // Nahraná fotka je na veřejné adrese, i když ji stránka ještě
        // neukazuje. „Souhlas doplním" proto neexistuje.
        Assert.Contains("souhlasí", Nahravani.ProcNejde(Megabajt, "Jiří Tašl", null, souhlas: false));
    }

    [Fact]
    public void Adresy_se_skladaji_z_verejne_predpony()
    {
        var id = Guid.Parse("0f8fad5b-d9cb-469f-a165-70867728950e");
        var fotka = new Fotka { Id = id, Autor = "Jiří Tašl", Sirka = 1600, Vyska = 1067 };

        var dto = Nahravani.Dto(fotka, "https://orlickypohar-foto.klihovka.cz/");

        Assert.NotNull(dto);
        Assert.Equal("https://orlickypohar-foto.klihovka.cz/fotky/0f8fad5bd9cb469fa16570867728950e-480.webp", dto.Nahled);
        Assert.Equal("https://orlickypohar-foto.klihovka.cz/fotky/0f8fad5bd9cb469fa16570867728950e-1600.webp", dto.Velky);
        Assert.Equal("Jiří Tašl", dto.Autor);
    }

    [Fact]
    public void Bez_verejne_adresy_obrazek_neni()
    {
        // Odkaz na soubor, o kterém nevíme, kde leží, by byl rozbitý obrázek.
        Assert.Null(Nahravani.Dto(new Fotka { Autor = "X" }, null));
        Assert.Null(Nahravani.Dto(null, "https://foto.example"));
    }

    private static MemoryStream Jpeg(int sirka, int vyska, ushort? otoceni = null)
    {
        using var obrazek = new Image<Rgba32>(sirka, vyska, new Rgba32(30, 90, 160));

        var exif = new ExifProfile();
        exif.SetValue(ExifTag.GPSLatitudeRef, "N");
        exif.SetValue(ExifTag.GPSLatitude, [new Rational(49), new Rational(30), new Rational(0)]);
        exif.SetValue(ExifTag.Make, "Telefon");
        if (otoceni is { } o) exif.SetValue(ExifTag.Orientation, o);
        obrazek.Metadata.ExifProfile = exif;

        var vystup = new MemoryStream();
        obrazek.Save(vystup, new JpegEncoder());
        vystup.Position = 0;
        return vystup;
    }

    [Fact]
    public async Task Velka_fotka_se_zmensi_na_dve_varianty_ve_WebP()
    {
        var (varianty, chyba) = await Zpracovani.ZpracujAsync(Jpeg(4000, 3000), default);

        Assert.Null(chyba);
        Assert.NotNull(varianty);
        Assert.Equal((1600, 1200), (varianty.Sirka, varianty.Vyska));

        var velky = Image.Identify(varianty.Velky);
        var nahled = Image.Identify(varianty.Nahled);
        Assert.Equal("Webp", velky.Metadata.DecodedImageFormat?.Name);
        Assert.Equal((1600, 1200), (velky.Width, velky.Height));
        Assert.Equal((480, 360), (nahled.Width, nahled.Height));
    }

    [Fact]
    public async Task Poloha_z_telefonu_se_neulozi()
    {
        // Fotka z chaty nese v EXIF adresu, kde člověk bydlí.
        var (varianty, _) = await Zpracovani.ZpracujAsync(Jpeg(800, 600), default);

        Assert.NotNull(varianty);
        foreach (var data in new[] { varianty.Velky, varianty.Nahled })
        {
            var exif = Image.Identify(data).Metadata.ExifProfile;
            Assert.True(exif is null || exif.Values.Count == 0);
        }
    }

    [Fact]
    public async Task Fotka_na_vysku_se_otoci_podle_telefonu()
    {
        // Telefon uloží snímek na šířku s příznakem „otoč o 90°". Po přepočtu
        // příznak zmizí, takže otočení musí být v pixelech.
        var (varianty, _) = await Zpracovani.ZpracujAsync(Jpeg(2000, 1000, otoceni: 6), default);

        Assert.NotNull(varianty);
        Assert.Equal((1000, 2000), (varianty.Sirka, varianty.Vyska));
        Assert.Equal((480, 960), (Image.Identify(varianty.Nahled).Width, Image.Identify(varianty.Nahled).Height));
    }

    [Fact]
    public async Task Mala_fotka_se_nezvetsuje()
    {
        var (varianty, _) = await Zpracovani.ZpracujAsync(Jpeg(300, 200), default);

        Assert.NotNull(varianty);
        Assert.Equal((300, 200), (varianty.Sirka, varianty.Vyska));
        Assert.Equal(300, Image.Identify(varianty.Nahled).Width);
    }

    [Fact]
    public async Task Soubor_ktery_neni_fotka_neprojde()
    {
        var text = new MemoryStream("<?php echo 'ahoj'; ?>"u8.ToArray());

        var (varianty, chyba) = await Zpracovani.ZpracujAsync(text, default);

        Assert.Null(varianty);
        Assert.Equal(Zpracovani.Nepodporovane, chyba);
    }

    [Fact]
    public async Task Jine_formaty_nez_z_telefonu_se_necitaji()
    {
        using var obrazek = new Image<Rgba32>(50, 50);
        var gif = new MemoryStream();
        obrazek.Save(gif, new GifEncoder());
        gif.Position = 0;

        var (_, chyba) = await Zpracovani.ZpracujAsync(gif, default);

        Assert.Equal(Zpracovani.Nepodporovane, chyba);
    }
}
