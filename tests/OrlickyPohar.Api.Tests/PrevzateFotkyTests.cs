using Microsoft.Extensions.Logging.Abstractions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Prevzate;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla kolem fotek přejatých článků. Čisté funkce — bez databáze,
/// bez úložiště a hlavně bez cizího serveru, na kterém testu nezáleží.
/// </summary>
public class PrevzateFotkyTests
{
    private static ZdrojKanalu Svaz => Zdroje.Vsechny[0];

    [Fact]
    public void Vetsi_varianta_u_sailing_cz_vede_na_originál()
    {
        // og:image svazu je náhled kolem 500 px; originál leží pod toutéž
        // cestou bez `_thumbs` (ověřeno 2. 10. 2026).
        Assert.Equal(
            "https://www.sailing.cz/uploads/clanky/6abe/mcr.jpg",
            Zdroje.SailingCzVetsi("https://www.sailing.cz/uploads_thumbs/clanky/6abe/mcr.jpg"));
    }

    [Fact]
    public void Adresa_bez_nahledu_vetsi_variantu_nema()
    {
        // Když zvyklost zdroje nesedí, nevymýšlí se adresa, která by vracela
        // 404 — použije se to, co dal zdroj.
        Assert.Null(Zdroje.SailingCzVetsi("https://www.sailing.cz/img/foto.jpg"));
    }

    [Fact]
    public void Logo_zdroje_se_pozna_podle_cesty_ne_podle_velikosti()
    {
        // Logo svazu má v originále 711 × 800 px, takže prahem na nejmenší
        // šířku projde. Rozhoduje proto cesta: fotky k článkům leží
        // pod /uploads/clanky/, loga pod /uploads/ikony-loga/.
        Assert.True(Zdroje.SailingCzNeniFotka(
            "https://www.sailing.cz/uploads/ikony-loga/loga_csj/logo.jpg"));
        Assert.False(Zdroje.SailingCzNeniFotka(
            "https://www.sailing.cz/uploads/clanky/6abe/mcr.jpg"));
    }

    [Fact]
    public async Task Na_logo_se_zdroje_ani_neptame()
    {
        // PadajiciHandler hodí výjimku při jakémkoliv dotazu: test tak ověří,
        // že se logo pozná dřív, než se na cizí server sáhne.
        var stahovac = new StahovacFotek(new PametoveUloziste(), NullLogger<StahovacFotek>.Instance);

        var vysledek = await stahovac.UlozAsync(
            new HttpClient(new PadajiciHandler()), Svaz,
            "https://www.sailing.cz/uploads_thumbs/ikony-loga/loga_csj/logo.jpg", default);

        Assert.Null(vysledek.Fotka);
        Assert.True(vysledek.Nepouzitelna);
    }

    [Fact]
    public void Kandidati_zkousi_nejdriv_vetsi_pak_puvodni()
    {
        var kandidati = PrevzateFotky.Kandidati(
            Svaz, "https://www.sailing.cz/uploads_thumbs/clanky/6abe/mcr.jpg");

        Assert.Equal(
            ["https://www.sailing.cz/uploads/clanky/6abe/mcr.jpg",
             "https://www.sailing.cz/uploads_thumbs/clanky/6abe/mcr.jpg"],
            kandidati);
    }

    [Fact]
    public void Zdroj_bez_zvyklosti_ma_jedineho_kandidata()
    {
        var cizi = new ZdrojKanalu("Klub", "https://klub.cz", "https://klub.cz/rss", 5, "Domluveno");

        Assert.Equal(["https://klub.cz/foto.jpg"],
            PrevzateFotky.Kandidati(cizi, "https://klub.cz/foto.jpg"));
    }

    [Fact]
    public void Klice_drzi_cizi_fotky_stranou_od_nasich()
    {
        var id = Guid.CreateVersion7();

        // Předpona odděluje dva různé životní cykly: naše fotky zůstávají,
        // přejaté mizí s článkem.
        Assert.All(PrevzateFotky.Klice(id), k => Assert.StartsWith("prevzate/", k));
        Assert.Equal(
            [PrevzateFotky.Klic(id, Nahravani.SirkaNahledu),
             PrevzateFotky.Klic(id, Nahravani.SirkaVelke)],
            PrevzateFotky.Klice(id));
    }

    [Fact]
    public async Task Bez_nastaveneho_uloziste_se_nic_nestahuje()
    {
        // Na vývojovém stroji ani v testech nejsou klíče k R2. Stahovač to
        // musí poznat dřív, než sáhne na cizí server.
        var stahovac = new StahovacFotek(
            new NenastaveneUloziste(new FotkyNastaveni()), NullLogger<StahovacFotek>.Instance);

        var vysledek = await stahovac.UlozAsync(
            new HttpClient(new PadajiciHandler()), Svaz, "https://www.sailing.cz/foto.jpg", default);

        Assert.Null(vysledek.Fotka);
        Assert.False(vysledek.Nepouzitelna);
    }

    [Fact]
    public async Task Logo_misto_fotky_se_neulozi_a_rekne_si_o_nahradni()
    {
        // Svaz dává do og:image svoje logo, když k článku fotku nemá —
        // 177 × 200 px. Přes celou kartu vypadá hůř než naše náhradní fotka.
        var uloziste = new PametoveUloziste();
        var stahovac = new StahovacFotek(uloziste, NullLogger<StahovacFotek>.Instance);

        var vysledek = await stahovac.UlozAsync(
            new HttpClient(new ObrazkovyHandler(177, 200)), Svaz,
            "https://www.sailing.cz/uploads_thumbs/ikony-loga/logo.jpg", default);

        Assert.Null(vysledek.Fotka);
        Assert.True(vysledek.Nepouzitelna);
        Assert.Empty(uloziste.Soubory);
    }

    [Fact]
    public async Task Fotka_dost_velka_se_ulozi_ve_dvou_velikostech()
    {
        var uloziste = new PametoveUloziste();
        var stahovac = new StahovacFotek(uloziste, NullLogger<StahovacFotek>.Instance);

        var vysledek = await stahovac.UlozAsync(
            new HttpClient(new ObrazkovyHandler(1920, 1280)), Svaz,
            "https://www.sailing.cz/uploads_thumbs/clanky/foto.jpg", default);

        Assert.NotNull(vysledek.Fotka);
        var fotka = vysledek.Fotka;
        Assert.False(vysledek.Nepouzitelna);
        // Přepočet nezvětšuje a strop je 1600 px.
        Assert.Equal(Nahravani.SirkaVelke, fotka.Sirka);
        Assert.Equal([.. PrevzateFotky.Klice(fotka.Id).Order()], [.. uloziste.Soubory.Keys.Order()]);
        Assert.All(uloziste.Soubory.Values, d => Assert.NotEmpty(d));
    }

    [Fact]
    public async Task Nedostupny_server_adresu_u_zdroje_neshazuje()
    {
        var stahovac = new StahovacFotek(new PametoveUloziste(), NullLogger<StahovacFotek>.Instance);

        var vysledek = await stahovac.UlozAsync(
            new HttpClient(new PadajiciHandler()), Svaz,
            "https://www.sailing.cz/uploads_thumbs/clanky/foto.jpg", default);

        // Nic neukládáme, ale adresa u zdroje platí dál — výpadek není důvod
        // sahat po náhradní fotce napořád.
        Assert.Null(vysledek.Fotka);
        Assert.False(vysledek.Nepouzitelna);
    }

    /// <summary>Úložiště v paměti: test se dívá na to, co by v bucketu leželo.</summary>
    private sealed class PametoveUloziste : IUloziste
    {
        public Dictionary<string, byte[]> Soubory { get; } = [];
        public bool Pripraveno => true;
        public string? VerejnaAdresa => "https://fotky.test";

        public Task UlozAsync(
            string klic, byte[] data, string typ, CancellationToken ct, string? cache = null)
        {
            Soubory[klic] = data;
            return Task.CompletedTask;
        }

        public Task SmazAsync(string klic, CancellationToken ct)
        {
            Soubory.Remove(klic);
            return Task.CompletedTask;
        }
    }

    /// <summary>Vrátí PNG zadaných rozměrů, ať se zkusí kterákoliv adresa.</summary>
    private sealed class ObrazkovyHandler(int sirka, int vyska) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken)
        {
            using var obrazek = new Image<Rgba32>(sirka, vyska);
            using var pamet = new MemoryStream();
            await obrazek.SaveAsPngAsync(pamet, cancellationToken);
            return new HttpResponseMessage(System.Net.HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(pamet.ToArray()),
            };
        }
    }

    /// <summary>Handler, který by test prozradil: jakýkoliv dotaz je chyba.</summary>
    private sealed class PadajiciHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("Na cizí server se v testu nesahá");
    }
}
