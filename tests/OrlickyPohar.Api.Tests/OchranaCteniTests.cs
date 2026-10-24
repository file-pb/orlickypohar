using System.Net;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Každé čtení pod <c>/sprava/</c> a <c>/ja/</c> musí bez přihlášení odmítnout.
///
/// <para>
/// <b>Nález G z oponentury 5. 10. 2026:</b> <i>oprávnění se kontroluje při
/// vydání, ne až u mapy.</i> Vyšel u tras a živých poloh — ty se budou vydávat
/// i divákům, takže dvojí zámek (organizátor zapne, rozhodčí má veto) musí
/// držet endpoint, ne vrstva mapy. Jenže je to pravidlo o <b>čtení</b>, a
/// <see cref="OchranaZapisuTests"/> hlídá jen zápisy. Pro trasy se nedalo
/// udělat nic, protože entita neexistuje; tohle je ta část pravidla, která
/// jde vymáhat <b>dnes</b> a bude platit i na trasy, až vzniknou.
/// </para>
///
/// <para>
/// Proč test, a ne jen pravidlo v dokumentaci: kontrola je tu tichá — sedí
/// uvnitř handlerů. Když ji u nového endpointu zapomeneš zavolat, nic
/// neselže a nic nekřikne. Endpoint prostě vydává data.
/// </para>
///
/// <para>
/// Prochází endpointy sám, žádný seznam (poučení 40), a měří <b>výsledek</b>,
/// ne metadata. Vynucuje i pořadí: 404 místo 403 prozrazuje, co existuje.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class OchranaCteniTests(PostgresFixture fx)
{
    /// <summary>
    /// Předpony, pod kterými čtení patří jen přihlášenému. Veřejné cesty
    /// (<c>/serie/</c>, <c>/clanky/</c>, <c>/health</c>) sem nepatří — ty
    /// jsou veřejné záměrně.
    /// </summary>
    private static readonly string[] Chranene = ["/sprava/", "/ja/"];

    /// <summary>
    /// Čtení, která SMÍ být bez přihlášení, každé s důvodem.
    ///
    /// <para>
    /// <b>Až přibude veřejná mapa a živé polohy, patří rozhodnutí sem</b> —
    /// a s ním i to, že dvojí zámek vyhodnocuje endpoint. Výjimka bez důvodu
    /// je díra, na kterou se za rok nikdo nezeptá.
    /// </para>
    ///
    /// <para>
    /// <b>Opraveno 9. 10. 2026, protože ten slib nefungoval.</b> Seznam se
    /// porovnával jen s endpointy pod chráněnými předponami, takže zápis
    /// o veřejné cestě — tedy přesně to, co sem komentář posílá — shodil
    /// závěrečné tvrzení jako „mrtvá výjimka". Napsat rozhodnutí sem tedy
    /// nešlo. Nově se k existujícím cestám počítají <b>všechny</b> GET
    /// endpointy a pro cestu mimo <c>/sprava/</c> je záznam tím, čím má být:
    /// <b>zapsaným rozhodnutím</b>, ne povolením.
    /// </para>
    /// </summary>
    private static readonly Dictionary<string, string> VedomeVerejne = new()
    {
        ["GET /polohy/"] =
            "Polohy pro posádku na palubě. Prokazuje se klíčem k lodi, ne účtem — "
            + "telefon žádný nemá. Co z toho uvidí, rozhoduje přepínač *co vidí "
            + "posádky*, který zamyká rozprava; bez klíče je odpověď 401.",
        ["GET /klice/sledovani/"] =
            "Telefon se ptá sám na sebe a prokazuje se klíčem k lodi, ne účtem — "
            + "držitel klíče žádný nemá a mít nemusí. Ven nejde nic než to, jestli "
            + "se z tohohle telefonu zaznamenává; bez klíče, s vymyšleným i "
            + "s odebraným je odpověď 401, tedy táž.",
        ["GET /serie/{serie}/zavody/{zavod}/trat/"] =
            "Trať je veřejná, jakmile ji rozhodčí přijme (plán, oddíl téhož jména). "
            + "Rozhodnutí drží endpoint: nepřijatou trať nevydá vůbec, u přestavby "
            + "řekne jen „přestavuje se\" a bóje zamlčí. Jména stavitelů, přesnost "
            + "měření ani fotky se ven nedávají — veřejně je jen to, kam se pluje.",
    };

    [Fact]
    public async Task Kazde_chranene_cteni_bez_prihlaseni_odmitne()
    {
        var zdroj = fx.Services.GetRequiredService<EndpointDataSource>();
        var klient = fx.CreateClient();
        var otevrene = new List<string>();
        // Všechny GET cesty, aby se dala poznat mrtvá výjimka i u té veřejné.
        var vsechny = new HashSet<string>();
        // Jen ty pod chráněnými předponami — na nich stojí pojistka níž.
        var chranene = new HashSet<string>();

        foreach (var ep in zdroj.Endpoints.OfType<RouteEndpoint>())
        {
            var metody = ep.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? [];
            if (!metody.Contains("GET")) continue;

            var vzor = CestaZeVzoru.Normalizuj(ep.RoutePattern.RawText);
            var klic = $"GET {vzor}";
            vsechny.Add(klic);

            if (!Chranene.Any(p => vzor.StartsWith(p, StringComparison.Ordinal))) continue;

            chranene.Add(klic);
            if (VedomeVerejne.ContainsKey(klic)) continue;

            var odpoved = await klient.GetAsync(CestaZeVzoru.Vypln(ep.RoutePattern));
            if (odpoved.StatusCode is not (HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden))
                otevrene.Add($"{klic} → {(int)odpoved.StatusCode}");
        }

        // Pojistka dřív než hlavní tvrzení: prázdný seznam u hostitele, který
        // chráněné řezy vůbec nezaregistroval, by vypadal jako úspěch.
        chranene.ShouldNotBeEmpty(
            "Test nenašel jediné čtení pod /sprava/ ani /ja/ — pak nic neověřuje. " +
            "V PostgresFixture nejspíš zmizelo nastavení Identita:Authority.");

        otevrene.ShouldBeEmpty(
            "Tyhle endpointy vydaly data bez přihlášení. Buď kontroluj oprávnění " +
            "při vydání, nebo — je-li veřejné čtení záměr — přidej je do VedomeVerejne " +
            "i s důvodem. 404 nebo 200 znamená, že se na právo neptal nikdo.");

        // Mrtvá výjimka je tichá díra: endpoint zmizel, ale kdyby se vrátil
        // pod stejnou cestou, byl by rovnou vědomě veřejný.
        VedomeVerejne.Keys.Except(vsechny).ShouldBeEmpty(
            "Tyhle výjimky ve VedomeVerejne neodpovídají žádnému endpointu. Smaž je.");
    }
}
