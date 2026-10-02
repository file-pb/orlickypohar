using Microsoft.Extensions.Logging.Abstractions;
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

        Assert.Null(await stahovac.UlozAsync(
            new HttpClient(new PadajiciHandler()), Svaz, "https://www.sailing.cz/foto.jpg", default));
    }

    /// <summary>Handler, který by test prozradil: jakýkoliv dotaz je chyba.</summary>
    private sealed class PadajiciHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("Na cizí server se v testu nesahá");
    }
}
