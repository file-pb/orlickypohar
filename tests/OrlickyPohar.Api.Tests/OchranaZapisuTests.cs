using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Patterns;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using Testcontainers.PostgreSql;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Hostitel <b>s nakonfigurovanou identitou</b>. Vlastní, protože
/// <see cref="PostgresFixture"/> ji schválně nemá — a bez ní se chráněné
/// řezy v <c>Program.cs</c> vůbec nezaregistrují (`if (identita)`).
/// <para>
/// Kdyby tenhle test běžel nad běžnou fixture, byl by <b>zelený a nic by
/// neověřil</b>: endpointy pod <c>/sprava/</c> by v hostiteli neexistovaly,
/// takže by neměl co kontrolovat. To je přesně ta třída chyby, kterou má
/// hlídat.
/// </para>
/// <para>
/// Autorita je vymyšlená a nedostupná schválně. Požadavek <b>bez tokenu</b>
/// odmítne JwtBearer rovnou 401 — metadata poskytovatele potřebuje teprve
/// k ověření podpisu, a ten se tu nikdy nekontroluje. Test tedy nesahá na síť.
/// </para>
/// </summary>
public sealed class IdentitaFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _db =
        new PostgreSqlBuilder("postgres:17-alpine").Build();

    async Task IAsyncLifetime.InitializeAsync()
    {
        await _db.StartAsync();

        // `Program.cs` má kolem celého startu try/catch, který výjimku jen
        // zaloguje jako Fatal a vrátí 1. Navenek z toho je nicneříkající
        // „The entry point exited without ever building an IHost" a skutečná
        // příčina zůstane v konzoli, kterou nikdo nečte. Zachytíme ji
        // a přilepíme k chybě, ať se nehádá.
        var puvodni = Console.Out;
        var zachyt = new StringWriter();
        Console.SetOut(zachyt);
        try
        {
            _ = Server;
        }
        catch (Exception e)
        {
            throw new InvalidOperationException(
                $"Hostitel s identitou nenaběhl. Co aplikace vypsala:\n{zachyt}", e);
        }
        finally
        {
            Console.SetOut(puvodni);
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Postgres", _db.GetConnectionString());
        builder.UseSetting("Import:Token", PostgresFixture.Token);
        builder.UseSetting("Landsat:Token", PostgresFixture.LandsatToken);
        builder.UseSetting("Identita:Authority", "https://identita.neexistuje.invalid");
        builder.UseSetting("Identita:Audience", "orlickypohar-test");
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
    }
}

[CollectionDefinition(Name)]
public class IdentitaCollection : ICollectionFixture<IdentitaFixture>
{
    public const string Name = "identita";
}

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
[Collection(IdentitaCollection.Name)]
public class OchranaZapisuTests(IdentitaFixture fx)
{
    /// <summary>
    /// Zapisovací endpointy, které SMÍ být bez přihlášení. Každý s důvodem.
    /// Veřejný zápis je vědomé rozhodnutí, ne vedlejší produkt nové obrazovky.
    /// </summary>
    private static readonly Dictionary<string, string> VedomeVerejne = new();

    private static readonly string[] Zapisovaci = ["POST", "PUT", "PATCH", "DELETE"];

    [Fact]
    public async Task Kazdy_zapisovaci_endpoint_bez_prihlaseni_odmitne()
    {
        var zdroj = fx.Services.GetRequiredService<EndpointDataSource>();
        var klient = fx.CreateClient();
        var otevrene = new List<string>();
        var nalezene = new HashSet<string>();

        foreach (var ep in zdroj.Endpoints.OfType<RouteEndpoint>())
        {
            var metody = ep.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? [];
            foreach (var metoda in metody.Where(m => Zapisovaci.Contains(m)))
            {
                var klic = $"{metoda} {Normalizuj(ep.RoutePattern.RawText)}";
                nalezene.Add(klic);
                if (VedomeVerejne.ContainsKey(klic)) continue;

                using var pozadavek = new HttpRequestMessage(new HttpMethod(metoda), Vypln(ep.RoutePattern))
                {
                    // Prázdné tělo schválně: autorizace musí zasáhnout dřív
                    // než validace. 400 tady znamená „prošlo až k datům".
                    Content = JsonContent.Create(new { }),
                };
                var odpoved = await klient.SendAsync(pozadavek);

                if (odpoved.StatusCode is not (HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden))
                    otevrene.Add($"{klic} → {(int)odpoved.StatusCode}");
            }
        }

        // Pojistka dřív než hlavní tvrzení: prázdný seznam otevřených
        // u hostitele, který nevidí správu, by vypadal jako úspěch.
        nalezene.ShouldNotBeEmpty(
            "Test nenašel jediný zapisovací endpoint — pak nic neověřuje.");
        nalezene.Any(k => k.Contains("/sprava/")).ShouldBeTrue(
            "Test nevidí žádný endpoint pod /sprava/. Hostitel nemá identitu, " +
            "takže se chráněné řezy nezaregistrovaly — a test by byl zelený naprázdno.");

        otevrene.ShouldBeEmpty(
            "Tyhle zapisovací endpointy bez přihlášení neodmítly. Buď je chraň, " +
            "nebo — je-li veřejný zápis záměr — přidej je do VedomeVerejne i s důvodem. " +
            "404 nebo 400 znamená, že oprávnění se kontroluje až po hledání dat nebo po validaci.");

        // Mrtvá výjimka je tichá díra: endpoint zmizel, ale kdyby se vrátil
        // pod stejnou cestou, byl by rovnou vědomě veřejný.
        VedomeVerejne.Keys.Except(nalezene).ShouldBeEmpty(
            "Tyhle výjimky ve VedomeVerejne neodpovídají žádnému endpointu. Smaž je.");
    }

    /// <summary>Doplní parametry cesty tak, aby prošly omezeními.</summary>
    private static string Vypln(RoutePattern vzor)
    {
        var cesta = vzor.RawText ?? "/";
        foreach (var p in vzor.Parameters)
        {
            var celociselny = p.ParameterPolicies.Any(pol => pol.Content is "int" or "long");
            var hodnota = celociselny ? "1" : "x";
            cesta = System.Text.RegularExpressions.Regex.Replace(
                cesta, $@"\{{\*?{p.Name}(:[^}}]*)?\??\}}", hodnota);
        }
        return cesta.StartsWith('/') ? cesta : "/" + cesta;
    }

    private static string Normalizuj(string? vzor)
    {
        var s = "/" + (vzor ?? "").Trim('/');
        return s.EndsWith('/') ? s : s + "/";
    }
}
