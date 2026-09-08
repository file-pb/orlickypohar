using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using Serilog;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

// Dvoufázová inicializace: i pád při startu skončí ve strukturovaném logu.
Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Services.AddSerilog((services, lc) => lc
        .ReadFrom.Configuration(builder.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .Enrich.WithProperty("service", builder.Environment.ApplicationName));

    // Běžná konfigurace z prostředí, TAJEMSTVÍ ze souborů.
    // Proměnné prostředí vidí přes `docker inspect` každý s přístupem k daemonu,
    // takže connection string ani klíče do nich nepatří.
    builder.Configuration.AddKeyPerFile("/run/secrets", optional: true, reloadOnChange: false);

    var connectionString = builder.Configuration.GetConnectionString("Postgres")
        ?? throw new InvalidOperationException(
            "Chybí connection string. Očekává se soubor /run/secrets/ConnectionStrings__Postgres.");

    builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connectionString));
    builder.Services.AddSingleton(TimeProvider.System);
    builder.Services.AddOpenApi();

    // Výčty v JSONu jako jména, ne čísla. Importní soubor píší i lidé
    // a "PoKategoriich" je pro ně čitelné; "1" znamená hledat v kódu.
    builder.Services.ConfigureHttpJsonOptions(o =>
        o.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

    builder.Services.AddHealthChecks()
        .AddDbContextCheck<AppDbContext>("postgres", tags: ["ready"]);

    var app = builder.Build();

    app.UseSerilogRequestLogging();

    // Liveness: běží proces. Readiness: umí obsloužit provoz (drží i databáze).
    app.MapHealthChecks("/health", new() { Predicate = _ => false });
    app.MapHealthChecks("/health/ready", new() { Predicate = c => c.Tags.Contains("ready") });

    // OpenAPI dokument je zdroj pravdy pro generovaného TypeScript klienta.
    app.MapOpenApi();
    if (app.Environment.IsDevelopment())
        app.MapScalarApiReference();

    // Bez ICU spadne porovnávání na ordinální a `Č` se řadí až za `Z`. Sama
    // aplikace kvůli tomu neselže, ale tabulky by se rozešly s tím, co
    // ukazují testy — a to se pozná jen tak, že se někdo diví pořadí.
    if (Jmena.Cesky.Compare("Č", "Z") > 0)
        Log.Warning("Běží se bez ICU (invariantní globalizace). Jména lodí se neřadí česky.");

    app.MapSerie();
    app.MapPoradi();
    app.MapZavody();
    app.MapImport();

    // Migrace při startu. U jedné repliky je to v pořádku a máš jistotu,
    // že schéma odpovídá kódu. Až budeš škálovat, přesuň to do kroku v CI.
    await using (var scope = app.Services.CreateAsyncScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
    }

    await app.RunAsync();
    return 0;
}
catch (Exception ex) when (ex is not HostAbortedException)
{
    Log.Fatal(ex, "Aplikace spadla při startu.");
    return 1;
}
finally
{
    await Log.CloseAndFlushAsync();
}

// Zpřístupňuje vstupní bod pro WebApplicationFactory v testech.
public partial class Program;
