using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Measurements;
using Testcontainers.PostgreSql;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Reálný PostgreSQL v kontejneru. Schválně ne in-memory provider —
/// idempotence stojí na filtrovaném unikátním indexu, a ten by fake databáze
/// neověřila. Test, který netestuje to, co v produkci selže, je horší než žádný.
/// Vyžaduje běžící Docker.
/// </summary>
public sealed class PostgresFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _db =
        new PostgreSqlBuilder("postgres:17-alpine").Build();

    // Explicitní implementace: WebApplicationFactory má vlastní DisposeAsync
    // s jiným návratovým typem, takže by se jinak srazily.
    async Task IAsyncLifetime.InitializeAsync()
    {
        await _db.StartAsync();
        _ = Server; // vynutí start hostitele, který zároveň pustí migrace
        await SeedCatalogAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.UseSetting("ConnectionStrings:Postgres", _db.GetConnectionString());

    private async Task SeedCatalogAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        db.Metrics.AddRange(
            new MetricDefinition { Path = "electrical.batteries.house.voltage", Unit = "V" },
            new MetricDefinition { Path = "electrical.batteries.start.voltage", Unit = "V" },
            new MetricDefinition { Path = "environment.wind.speedTrue", Unit = "m/s" });
        await db.SaveChangesAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _db.DisposeAsync();
    }
}
