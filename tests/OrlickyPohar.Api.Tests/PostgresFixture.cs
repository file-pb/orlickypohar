using System.Net.Http.Headers;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Testcontainers.PostgreSql;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Jeden PostgreSQL pro všechny integrační testy. Kdyby si každá třída
/// startovala vlastní kontejner, běží starty souběžně a v CI se občas
/// nestihnou — což se projeví jako záhadné „entry point exited without ever
/// building an IHost", protože aplikace při nedostupné databázi skončí
/// při migraci a chybu si odnese do svého logu.
/// </summary>
[CollectionDefinition(Name)]
public class PostgresCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "postgres";
}

/// <summary>
/// Reálný PostgreSQL v kontejneru. Schválně ne in-memory provider — idempotence
/// importu stojí na unikátních indexech a fake databáze by je neověřila.
/// Test, který netestuje to, co v produkci selže, je horší než žádný.
/// Vyžaduje běžící Docker.
/// </summary>
public sealed class PostgresFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string Token = "testovaci-token";
    public const string LandsatToken = "testovaci-landsat";

    /// <summary>
    /// Obraz PostgreSQL. <b>V CI ze zrcadla v GHCR</b>, protože anonymní
    /// stahování z Docker Hubu má limit na IP runneru a ta je sdílená se
    /// všemi ostatními (9. 10. 2026 nám tím spadly integrační testy
    /// i build). Lokálně se proměnná nenastavuje a jede se z Hubu —
    /// jeden vývojářský stroj limit nevyčerpá a přihlašovat se kvůli tomu
    /// do GHCR by byla překážka navíc.
    /// </summary>
    private static readonly string Obraz =
        Environment.GetEnvironmentVariable("POSTGRES_IMAGE") ?? "postgres:17-alpine";

    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder(Obraz).Build();

    // Explicitní implementace: WebApplicationFactory má vlastní DisposeAsync
    // s jiným návratovým typem, takže by se jinak srazily.
    async Task IAsyncLifetime.InitializeAsync()
    {
        await _db.StartAsync();

        // `Program.cs` má kolem celého startu try/catch: výjimku zaloguje
        // jako Fatal a vrátí 1. Navenek z toho zbyde jen nicneříkající
        // „The entry point exited without ever building an IHost" a příčina
        // zůstane v konzoli, kterou nikdo nepřečte. Zachytíme ji a přilepíme
        // k chybě. (Při souběžných kolekcích může výpis obsahovat i řádky
        // z jiného hostitele — Console je globální.)
        var puvodni = Console.Out;
        var zachyt = new StringWriter();
        Console.SetOut(zachyt);
        try
        {
            _ = Server; // vynutí start hostitele, který zároveň pustí migrace
        }
        catch (Exception e)
        {
            throw new InvalidOperationException(
                $"Hostitel nenaběhl. Co aplikace vypsala:\n{zachyt}", e);
        }
        finally
        {
            Console.SetOut(puvodni);
        }
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Postgres", _db.GetConnectionString());
        builder.UseSetting("Import:Token", Token);
        builder.UseSetting("Landsat:Token", LandsatToken);
        // Identita se nastavuje schválně, i když je autorita vymyšlená
        // a nedostupná. Bez ní `Program.cs` chráněné řezy pod /sprava/
        // vůbec nezaregistruje (`if (identita)`) — a `OchranaCteniTests`,
        // který je má hlídat, by neměl co kontrolovat. Chytá to jeho
        // pojistka na prázdný seznam; tohle je ta příčina.
        //
        // Na síť se přitom nesahá: požadavek bez tokenu odmítne JwtBearer
        // rovnou 401, metadata poskytovatele potřebuje teprve k ověření
        // podpisu. Ostatní testy správy chodí přes služby, ne přes HTTP.
        //
        // Platí to stejně pro `OchranaZapisuTests` — čtení i zápisy stojí
        // na tomtéž: bez identity není co hlídat.
        builder.UseSetting("Identita:Authority", TestoveTokeny.Vydavatel);
        builder.UseSetting("Identita:Audience", TestoveTokeny.Publikum);

        // A pak jeden krok navíc, aby šla správa zkoušet i **přes HTTP**:
        // hostitel dostane týž symetrický klíč, kterým `TestoveTokeny`
        // podepisují, a prázdnou konfiguraci poskytovatele, takže se
        // metadata nestahují. Na síť se pořád nesahá.
        //
        // Nic jiného se nevypíná — vydavatel, publikum i životnost se
        // ověřují dál. Mění se jediná věc: čím je podpis ověřený. Proto
        // požadavek bez tokenu končí 401 jako dřív a obě `Ochrana*Tests`
        // dál měří to, co měřily.
        builder.ConfigureTestServices(sluzby =>
            sluzby.PostConfigure<JwtBearerOptions>(
                JwtBearerDefaults.AuthenticationScheme,
                o =>
                {
                    o.Configuration = new OpenIdConnectConfiguration();
                    o.TokenValidationParameters.IssuerSigningKey = TestoveTokeny.Klic;
                    o.TokenValidationParameters.ValidateIssuerSigningKey = true;
                }));
    }

    /// <summary>
    /// Klient, který se hlásí jako účet <paramref name="subjekt"/>. Dvojice
    /// <c>(iss, sub)</c> je to, podle čeho si aplikace účet najde, takže
    /// stejný subjekt dvakrát znamená stejný účet.
    /// </summary>
    public HttpClient KlientJako(string subjekt, string? zobrazovane = null, string? email = null)
    {
        var klient = CreateClient();
        klient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", TestoveTokeny.Vydej(subjekt, zobrazovane, email));
        return klient;
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
    }
}
