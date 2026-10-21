using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Každý zapisovací endpoint musí bez přihlášení odmítnout — 401 nebo 403.
///
/// Převzato ze <c>service-template</c> (nález S10). Proč test, a ne jen
/// pravidlo: kontrola oprávnění je tu tichá — sedí uvnitř handlerů, takže
/// když ji u nového endpointu zapomeneš zavolat, nic neselže a nic nekřikne.
/// Endpoint je prostě otevřený. Při 22 zapisovacích endpointech a tempu
/// dvou stovek commitů za čtrnáct dní to není teorie.
///
/// Test <b>prochází endpointy sám</b>, žádný seznam. Kontrola s vypsaným
/// seznamem zastará dřív než to, co hlídá (poučení 40).
///
/// Měří <b>výsledek</b>, ne metadata: zavolá endpoint a přečte stavový kód.
/// A vynutí, že oprávnění se ověřuje <b>dřív</b> než validace a hledání dat —
/// endpoint, který vrátí 404 dřív než 403, prozrazuje, co existuje.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class OchranaZapisuTests(PostgresFixture fx)
{
    /// <summary>
    /// Zapisovací endpointy, které SMÍ být bez přihlášení. Každý s důvodem.
    /// Veřejný zápis je vědomé rozhodnutí, ne vedlejší produkt nové obrazovky.
    /// </summary>
    private static readonly Dictionary<string, string> VedomeVerejne = new()
    {
        ["POST /serie/{serie}/zavody/{zavod}/prihlasky/"] =
            "veřejná přihláška lodi na zastávku — posádka se hlásí bez účtu "
            + "(Features/Zavody/VerejnaPrihlaskaEndpoints.cs)",
        ["POST /klice/uplatnit/"] =
            "uplatnění pozvánky za mobilní klíč k lodi — pozvánka sama je tím "
            + "oprávněním a posádka v tu chvíli ještě nic nemá. Smysl celého "
            + "klíče je, že se posádka nemusí registrovat (plán, Telefon jako "
            + "mobilní klíč k lodi), takže přihlášení by ho popřelo. Chrání ji "
            + "jednorázovost, 48hodinová platnost a to, že kód je tajemství "
            + "z generátoru náhody (Features/Klice/KliceEndpoints.cs)",
        // Klíč nese koncové lomítko — tak ho skládá `CestaZeVzoru.Normalizuj`.
        ["PUT /zarizeni/"] =
            "registrace telefonu k veřejným upozorněním — plán (Dvě úrovně "
            + "upozornění) říká, že výsledky, článek ani termín závodu nesmějí "
            + "vyžadovat účet: divák nemá kvůli termínu nic zakládat. Zápis je "
            + "proto bez přihlášení a token se místo toho kontroluje na tvar "
            + "(Odbery.ProcNejdeZapsat). Účastnická upozornění — odložený start, "
            + "změna trati — účet potřebují a půjdou jinou cestou, protože se "
            + "musí vědět, které zařízení patří které lodi "
            + "(Features/Upozorneni/UpozorneniEndpoints.cs)",
    };

    private static readonly string[] Zapisovaci = ["POST", "PUT", "PATCH", "DELETE"];

    [Fact]
    public async Task Kazdy_zapisovaci_endpoint_bez_prihlaseni_odmitne()
    {
        var zdroj = fx.Services.GetRequiredService<EndpointDataSource>();
        var klient = fx.CreateClient();
        var otevrene = new List<string>();
        var netrefene = new List<string>();
        var nalezene = new HashSet<string>();

        foreach (var ep in zdroj.Endpoints.OfType<RouteEndpoint>())
        {
            var metody = ep.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? [];
            foreach (var metoda in metody.Where(m => Zapisovaci.Contains(m)))
            {
                var klic = $"{metoda} {CestaZeVzoru.Normalizuj(ep.RoutePattern.RawText)}";
                nalezene.Add(klic);
                if (VedomeVerejne.ContainsKey(klic)) continue;

                using var pozadavek = new HttpRequestMessage(new HttpMethod(metoda), CestaZeVzoru.Vypln(ep.RoutePattern))
                {
                    // Prázdné tělo schválně: autorizace musí zasáhnout dřív
                    // než validace. 400 tady znamená „prošlo až k datům".
                    // Typ obsahu ale musí sedět, jinak endpoint odmítne 415
                    // při výběru routy a k autorizaci se vůbec nedojde.
                    Content = CestaZeVzoru.Telo(ep),
                };
                var cesta = CestaZeVzoru.Vypln(ep.RoutePattern);
                var odpoved = await klient.SendAsync(pozadavek);

                if (odpoved.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                    continue;

                // 404 z routování není nález, je to vada tohohle testu:
                // dosazená hodnota se netrefila do omezení v cestě.
                if (odpoved.StatusCode == HttpStatusCode.NotFound
                    && await CestaZeVzoru.NetrefenoAsync(klient, cesta))
                {
                    netrefene.Add($"{klic} (zkoušeno {cesta})");
                    continue;
                }

                otevrene.Add($"{klic} → {(int)odpoved.StatusCode}");
            }
        }

        // Pojistka dřív než hlavní tvrzení: prázdný seznam otevřených
        // u hostitele, který nevidí správu, by vypadal jako úspěch.
        nalezene.ShouldNotBeEmpty(
            "Test nenašel jediný zapisovací endpoint — pak nic neověřuje.");
        nalezene.Any(k => k.Contains("/sprava/")).ShouldBeTrue(
            "Test nevidí žádný endpoint pod /sprava/ — v PostgresFixture nejspíš " +
            "zmizelo nastavení Identita:Authority a chráněné řezy se nezaregistrovaly. " +
            "Test by pak byl zelený naprázdno.");

        // Dřív než nález: cesta, která se netrefila, nic neověřila.
        netrefene.ShouldBeEmpty(
            "U těchhle endpointů se dosazená adresa netrefila do žádné routy, " +
            "takže o jejich ochraně test nic neříká. Doplň omezení do CestaZeVzoru.Vypln.");

        otevrene.ShouldBeEmpty(
            "Tyhle zapisovací endpointy bez přihlášení neodmítly. Buď je chraň, " +
            "nebo — je-li veřejný zápis záměr — přidej je do VedomeVerejne i s důvodem. " +
            "404 nebo 400 znamená, že oprávnění se kontroluje až po hledání dat nebo po validaci.");

        // Mrtvá výjimka je tichá díra: endpoint zmizel, ale kdyby se vrátil
        // pod stejnou cestou, byl by rovnou vědomě veřejný.
        VedomeVerejne.Keys.Except(nalezene).ShouldBeEmpty(
            "Tyhle výjimky ve VedomeVerejne neodpovídají žádnému endpointu. Smaž je.");
    }
}
