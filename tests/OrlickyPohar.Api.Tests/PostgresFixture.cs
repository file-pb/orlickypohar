using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Reálný PostgreSQL v kontejneru. Schválně ne in-memory provider — idempotence
/// importu stojí na unikátních indexech a fake databáze by je neověřila.
/// Test, který netestuje to, co v produkci selže, je horší než žádný.
/// Vyžaduje běžící Docker.
/// </summary>
public sealed class PostgresFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string Token = "testovaci-token";

    private readonly PostgreSqlContainer _db =
        new PostgreSqlBuilder("postgres:17-alpine").Build();

    // Explicitní implementace: WebApplicationFactory má vlastní DisposeAsync
    // s jiným návratovým typem, takže by se jinak srazily.
    async Task IAsyncLifetime.InitializeAsync()
    {
        await _db.StartAsync();
        _ = Server; // vynutí start hostitele, který zároveň pustí migrace
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Postgres", _db.GetConnectionString());
        builder.UseSetting("Import:Token", Token);
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
    }
}
