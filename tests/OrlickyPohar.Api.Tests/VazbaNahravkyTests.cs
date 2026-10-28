using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OrlickyPohar.Api.Features.Oponentura;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Vazba hlasové nahrávky na parametry koncového bodu — <b>přes HTTP</b>,
/// protože právě tam se nahrávání láme.
///
/// <para>
/// <b>Proč to má vlastní test, když ho má i směrnice.</b>
/// <c>VazbaNahraniTests</c> hlídá tvar <c>(IFormFile soubor)</c>; tady jde
/// o <c>(IFormFile? nahravka, [FromForm] int? sekund)</c>, tedy soubor
/// <b>a číslo</b> z téhož formuláře. U směrnice stojí vedle souboru
/// řetězec, takže to, že se naveze i <c>int?</c>, dosud nic neověřovalo —
/// a selhání by se projevilo jako 400 s prázdným tělem, přesně jako ta
/// vada z 12. 10. 2026.
/// </para>
///
/// <para>
/// Bez databáze a bez Dockeru: drobná aplikace s týmž tvarem parametru
/// a týmž poznáváním obsahu, jaké používá
/// <c>OponenturaSprava.NahrajAsync</c>. Chyba se tím zúží na jednu věc
/// a test doběhne v levné úloze CI.
/// </para>
/// </summary>
public class VazbaNahravkyTests
{
    /// <summary>Hlavička WebM, jak ji pošle <c>MediaRecorder</c> v Chromu.</summary>
    private static readonly byte[] Webm = [0x1A, 0x45, 0xDF, 0xA3, 0x42, 0x86, 0x81, 0x01];

    private static async Task<IHost> HostitelAsync()
    {
        var stavitel = WebApplication.CreateBuilder();
        stavitel.WebHost.UseTestServer();
        stavitel.Services.AddRoutingCore();
        var aplikace = stavitel.Build();

        // Týž podpis jako `OponenturaEndpoints.NahrajAsync`, jen bez
        // oprávnění a bez databáze — ty mají svoje testy.
        aplikace.MapPost("/x", async (
                IFormFile? nahravka, [FromForm] int? sekund, CancellationToken ct) =>
            {
                if (Dotazovani.ProcNejdeNahrat(nahravka?.Length ?? 0) is { } proc)
                    return Results.BadRequest(new { error = proc });

                using var obsah = new MemoryStream();
                await nahravka!.CopyToAsync(obsah, ct);
                var data = obsah.ToArray();

                if (Dotazovani.PoznejZvuk(data) is not { } typ)
                    return Results.BadRequest(new { error = Dotazovani.NeniZvuk });

                return Results.Ok(new { typ, delka = data.LongLength, sekund });
            })
            .DisableAntiforgery();

        await aplikace.StartAsync();
        return aplikace;
    }

    private static MultipartFormDataContent Telo(
        byte[]? data = null, string? sekund = "13", string pole = "nahravka")
    {
        var obsah = new ByteArrayContent(data ?? Webm);
        // Prohlížeč pošle typ, který mu dal `MediaRecorder` — server se na
        // něj schválně nespoléhá a čte obsah.
        obsah.Headers.ContentType = new MediaTypeHeaderValue("audio/webm");
        var telo = new MultipartFormDataContent { { obsah, pole, "odpoved.webm" } };
        if (sekund is not null) telo.Add(new StringContent(sekund), "sekund");
        return telo;
    }

    /// <summary>
    /// <b>Tvar, který používáme.</b> Soubor je samostatný parametr, délka
    /// nahrávky jde vedle něj jako <c>[FromForm] int?</c>.
    /// </summary>
    [Fact]
    public async Task Nahravka_a_sekundy_z_jednoho_formulare_se_navezou()
    {
        using var hostitel = await HostitelAsync();

        var odpoved = await hostitel.GetTestClient().PostAsync("/x", Telo());
        var telo = await odpoved.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
        Assert.Contains("audio/webm", telo);
        Assert.Contains("\"sekund\":13", telo);
        Assert.Contains("\"delka\":8", telo);
    }

    /// <summary>
    /// Délka je nepovinná: prohlížeč ji nemusí znát a vymýšlet si ji server
    /// nebude.
    /// </summary>
    [Fact]
    public async Task Nahravka_bez_sekund_projde()
    {
        using var hostitel = await HostitelAsync();

        var odpoved = await hostitel.GetTestClient().PostAsync("/x", Telo(sekund: null));

        Assert.Equal(HttpStatusCode.OK, odpoved.StatusCode);
        Assert.Contains("\"sekund\":null", await odpoved.Content.ReadAsStringAsync());
    }

    /// <summary>
    /// <b>Prázdný požadavek musí nést vysvětlení.</b> Chybějící pole znamená
    /// 400, kterou si vyrábíme sami — kdyby přišla prázdná z vazby
    /// parametrů, byla by to zase ta vada z 12. 10. a nešlo by ji poznat
    /// odnikud.
    /// </summary>
    [Fact]
    public async Task Chybejici_soubor_vraci_vysvetlenou_ctyristovku()
    {
        using var hostitel = await HostitelAsync();

        var odpoved = await hostitel.GetTestClient()
            .PostAsync("/x", Telo(pole: "spatne-jmeno"));
        var telo = await odpoved.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.BadRequest, odpoved.StatusCode);
        Assert.Contains("error", telo);
        Assert.NotEqual("", telo);
    }

    /// <summary>
    /// Typ z prohlížeče je tvrzení, ne doklad: pod hlavičkou
    /// <c>audio/webm</c> přijde PDF a server to pozná z obsahu.
    /// </summary>
    [Fact]
    public async Task Co_neni_zvuk_se_odmitne_i_kdyz_se_tak_tvari()
    {
        using var hostitel = await HostitelAsync();

        var odpoved = await hostitel.GetTestClient()
            .PostAsync("/x", Telo("%PDF-1.7 ..."u8.ToArray()));

        Assert.Equal(HttpStatusCode.BadRequest, odpoved.StatusCode);
        Assert.Contains("zvukový formát", await odpoved.Content.ReadAsStringAsync());
    }
}
