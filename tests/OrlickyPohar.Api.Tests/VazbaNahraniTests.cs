using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OrlickyPohar.Api.Features.Smernice;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Vazba nahrávaného souboru na parametr koncového bodu.
///
/// <para>
/// <b>Proč to má vlastní test</b> (12. 10. 2026): vyvěšení směrnice na
/// produkci odpovídalo <b>400 s prázdným tělem</b>. Všechny čtyřistovky,
/// které si <c>VyvesAsync</c> vyrábí sám, nesou vysvětlení — prázdná tedy
/// znamená, že se to láme dřív, než se handler spustí. Anonymní požadavek
/// přitom dostane 401, takže je to za autorizací: zbývá vazba parametrů.
/// </para>
///
/// <para>
/// <b>Bez databáze a bez Dockeru.</b> Testuje se tvar vazby, ne pravidla
/// vyvěšení — ta mají svoje testy. Proto drobná aplikace s týmž tvarem
/// parametru, ne celý <c>Program</c>: chyba se tím zúží na jednu věc
/// a test doběhne v levné úloze CI.
/// </para>
///
/// <para>
/// Dosavadní testy správy chodí přes službu, ne přes HTTP (nález auditu
/// 8. 10. 2026) — právě proto tahle vrstva nikdy nic nehlídalo.
/// </para>
/// </summary>
public class VazbaNahraniTests
{
    private static readonly byte[] Pdf = "%PDF-1.7\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"u8.ToArray();

    private static async Task<IHost> HostitelAsync(Action<WebApplication> mapuj)
    {
        var stavitel = WebApplication.CreateBuilder();
        stavitel.WebHost.UseTestServer();
        stavitel.Services.AddRoutingCore();
        var aplikace = stavitel.Build();
        mapuj(aplikace);
        await aplikace.StartAsync();
        return aplikace;
    }

    private static MultipartFormDataContent Telo(string poleSouboru = "soubor")
    {
        var obsah = new ByteArrayContent(Pdf);
        obsah.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");
        return new MultipartFormDataContent { { obsah, poleSouboru, "smernice.pdf" } };
    }

    /// <summary>
    /// <b>Tvar, který používáme.</b> Soubor je samostatný parametr, zbytek
    /// formuláře jde vedle něj — tohle hlídá, že nahrávání funguje.
    /// </summary>
    [Fact]
    public async Task Soubor_jako_samostatny_parametr_se_naveze()
    {
        using var hostitel = await HostitelAsync(a =>
            a.MapPost("/x", (IFormFile soubor) =>
                Results.Ok(new { jmeno = soubor.FileName, delka = soubor.Length }))
                .DisableAntiforgery());

        var odpoved = await hostitel.GetTestClient().PostAsync("/x", Telo());

        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
        Assert.Contains("smernice.pdf", await odpoved.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// <b>Tvar, který to rozbil.</b> <c>IFormFile</c> schovaný uvnitř
    /// záznamu s <c>[FromForm]</c> se nenaveze a koncový bod vrátí 400
    /// s prázdným tělem — přesně to, co se dělo na produkci u všech
    /// osmi nahrávacích koncových bodů.
    ///
    /// <para>
    /// Je to test cizího chování, ne našeho, a to schválně: kdyby ho
    /// příští .NET spravil, tenhle test spadne a bude to pokyn, že se
    /// podpisy dají zjednodušit zpátky na jeden záznam. Dokud padá
    /// nahrávání, chceme vědět proč.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Soubor_uvnitr_zaznamu_se_nenaveze()
    {
        using var hostitel = await HostitelAsync(a =>
            a.MapPost("/x", ([FromForm] SmerniceFormular formular) =>
                Results.Ok(new { jmeno = formular.Soubor?.FileName }))
                .DisableAntiforgery());

        var odpoved = await hostitel.GetTestClient().PostAsync("/x", Telo());

        Assert.Equal(HttpStatusCode.BadRequest, odpoved.StatusCode);
        Assert.Equal("", await odpoved.Content.ReadAsStringAsync());
    }
}
