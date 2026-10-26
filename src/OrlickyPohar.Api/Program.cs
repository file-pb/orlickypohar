using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using Serilog;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Boje;
using OrlickyPohar.Api.Features.Clanky;
using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Import;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Upozorneni;
using OrlickyPohar.Api.Features.Naklady;
using OrlickyPohar.Api.Features.Okna;
using OrlickyPohar.Api.Features.Polohy;
using OrlickyPohar.Api.Features.Poradatele;
using OrlickyPohar.Api.Features.Prevzate;
using OrlickyPohar.Api.Features.Smernice;
using OrlickyPohar.Api.Features.Zpravy;
using OrlickyPohar.Api.Features.Tracker;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Sprava;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Trasy;
using OrlickyPohar.Api.Features.Vodocet;
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
    var identita = builder.Services.PridejIdentitu(builder.Configuration);
    var uloziste = builder.Services.PridejUloziste(builder.Configuration);

    // Správa stojí na identitě, ale registruje se vždycky: integrační testy
    // ji volají přes službu, ne přes HTTP, s vymyšleným poskytovatelem.
    builder.Services.AddScoped<Rozsahy>();
    builder.Services.AddScoped<OpravneniSprava>();
    builder.Services.AddScoped<ClankySprava>();
    builder.Services.AddScoped<TrasySprava>();
    builder.Services.AddScoped<OknaSprava>();
    builder.Services.AddScoped<PolohySprava>();
    builder.Services.AddScoped<NastaveniSprava>();
    builder.Services.AddScoped<KliceSprava>();
    builder.Services.AddScoped<KalendarSprava>();
    builder.Services.AddScoped<VysledkySprava>();
    builder.Services.AddScoped<ZapisSprava>();
    builder.Services.AddScoped<PrihlaskySprava>();
    builder.Services.AddScoped<PoradateleSprava>();
    builder.Services.AddScoped<FotkySprava>();
    // Náklady na provoz a servis: čte je ze souboru, který zapisuje přehled
    // platformy. Bez nastavené cesty jen řekne, že čísla nejsou.
    builder.Services.AddScoped<NakladyCteni>();

    // Vodočet Orlíku: sběr z Povodí Vltavy jen tam, kde je zapnutý.
    builder.Services.AddHttpClient(SberVodocetu.Klient, c =>
        {
            c.Timeout = TimeSpan.FromSeconds(15);
            c.DefaultRequestHeaders.UserAgent.ParseAdd("OrlickyPohar/1.0 (+https://orlickypohar.klihovka.cz)");
        })
        .ConfigurePrimaryHttpMessageHandler(Pvl.Handler);
    if (builder.Configuration.GetValue<bool>("Vodocet:Sber"))
        builder.Services.AddHostedService<SberVodocetu>();
    // Přejaté novinky: RSS zdrojů ze `Zdroje.Vsechny`, jen tam, kde je sběr
    // zapnutý. Povolení přebírat je u každého zdroje zapsané v jeho záznamu
    // a podmínkou je uvedení zdroje s odkazem — proto se drží jen perex
    // a odkaz. Fotku si se souhlasem ukládáme k sobě (`Prevzate__Fotky`),
    // aby nám výpadek cizího serveru nerozbil web.
    builder.Services.AddHttpClient(SberPrevzatych.Klient, c =>
    {
        c.Timeout = TimeSpan.FromSeconds(15);
        c.DefaultRequestHeaders.UserAgent.ParseAdd("OrlickyPohar/1.0 (+https://orlickypohar.klihovka.cz)");
    });
    builder.Services.AddScoped<StahovacFotek>();
    // Plachetní směrnice u zastávky: vyvěšení a seznam verzí.
    builder.Services.AddScoped<SmerniceSprava>();
    builder.Services.AddScoped<ZpravySprava>();
    // Vazba účtu k lodi: párování podle e-mailu při přihlášení.
    builder.Services.AddScoped<Parovani>();
    // Připojení k lodi kódem nebo QR.
    builder.Services.AddScoped<KodySprava>();
    // Nárok na loď, který potvrzuje kapitán.
    builder.Services.AddScoped<NarokySprava>();
    builder.Services.AddScoped<KapitanstviSprava>();
    // Bóje na trati: pípnutí polohy pořadatelem z webu i z appky.
    builder.Services.AddScoped<BojeSprava>();
    builder.Services.AddScoped<TratSprava>();
    builder.Services.AddScoped<PrvkySprava>();
    if (builder.Configuration.GetValue<bool>("Prevzate:Sber"))
        builder.Services.AddHostedService<SberPrevzatych>();
    // Kontakty kapitánů se drží do konce následující sezóny, pak se mažou.
    if (builder.Configuration.GetValue<bool>("Kontakty:Uklid"))
        builder.Services.AddHostedService<UklidKontaktu>();
    // Upozornění: zápis do outboxu, evidence zařízení a odesílání přes Expo.
    // Zápis do fronty běží vždycky — je to jen řádek v téže transakci jako
    // změna. Odesílá se jen tam, kde je to zapnuté: testy ani vývoj nemají
    // volat Expo a nezapnutá úloha znamená, že fronta jen roste a čeká.
    builder.Services.AddScoped<UpozorneniSprava>();
    builder.Services.AddHttpClient<ExpoPush>(c =>
    {
        c.BaseAddress = new Uri("https://exp.host");
        c.Timeout = TimeSpan.FromSeconds(20);
        c.DefaultRequestHeaders.UserAgent.ParseAdd("OrlickyPohar/1.0 (+https://orlickypohar.klihovka.cz)");
    });
    if (builder.Configuration.GetValue<bool>("Upozorneni:Odesilat"))
        builder.Services.AddHostedService<OdesilaniUloha>();
    // .NET popisuje čísla jako ["integer","string"], protože je při čtení
    // přijímá i v uvozovkách. Odpovědi je ale píšou vždycky jako čísla —
    // a generovaný klient by jinak u každého bodu nutil ověřovat, jestli
    // není řetězec. Dokument má říkat, co se doopravdy vrací.
    builder.Services.AddOpenApi(o => o.AddSchemaTransformer((schema, _, _) =>
    {
        if (schema.Type is { } typ
            && (typ & (JsonSchemaType.Integer | JsonSchemaType.Number)) != 0
            && (typ & JsonSchemaType.String) != 0)
        {
            schema.Type = typ & ~JsonSchemaType.String;
            schema.Pattern = null;
        }

        return Task.CompletedTask;
    }));

    // Výčty v JSONu jako jména, ne čísla. Importní soubor píší i lidé
    // a "PoKategoriich" je pro ně čitelné; "1" znamená hledat v kódu.
    builder.Services.ConfigureHttpJsonOptions(o =>
        o.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

    // Veřejné čtení pouští prohlížeč z libovolného původu. Web renderuje
    // serverem, takže to nikdy nepotřeboval, ale appka má i webový cíl
    // a běží jako origin. Povoleno je jen GET: import je POST, takže se
    // přes prohlížeč z cizí stránky zavolat nedá ani s tokenem.
    builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
        .AllowAnyOrigin()
        .WithMethods("GET")
        .AllowAnyHeader()));

    builder.Services.AddHealthChecks()
        .AddDbContextCheck<AppDbContext>("postgres", tags: ["ready"]);

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseCors();

    // Bez nakonfigurovaného poskytovatele se ověřování nezapíná a chráněné
    // endpointy se nezaregistrují vůbec — zapomenutá proměnná prostředí
    // nesmí být totéž co „pusť dovnitř kohokoliv".
    if (identita)
    {
        app.UseAuthentication();
        app.UseAuthorization();
    }
    else
    {
        Log.Warning("Identita není nakonfigurovaná (Identita__Authority a Identita__Audience). "
                    + "Chráněné endpointy neběží.");
    }

    if (!uloziste)
        Log.Warning("Úložiště fotek není nastavené (Fotky__Endpoint, Fotky__Bucket, "
                    + "Fotky__VerejnaAdresa a klíče v /run/secrets). Nahrávání fotek neběží.");

    // Liveness: běží proces. Readiness: umí obsloužit provoz (drží i databáze).
    // Z jakého commitu tenhle proces běží. Nasazení si tím po sobě ověří,
    // že na serveru opravdu visí to, co posílalo: `Healthy` a HTTP 200 vrací
    // i stará verze, takže samy o sobě nic o verzi nedokazují.
    app.MapGet("/verze", () => Results.Ok(new
        {
            verze = Environment.GetEnvironmentVariable("VERZE") ?? "neznama",
        }))
        .WithTags("Provoz")
        .WithSummary("Commit, ze kterého je běžící image")
        .ExcludeFromDescription();

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
    app.MapClanky();
    app.MapUpozorneni();
    app.MapImport();
    app.MapVodocet();
    app.MapPrevzate();
    app.MapTeplotaHladiny();
    app.MapNapovedu();
    app.MapVerejnePrihlasky();
    if (identita)
    {
        app.MapJa();
        // Bez ověřeného přihlášení nemá udělování rolí komu roli dát: účet
        // vzniká až prvním přihlášením. Nenakonfigurovaný poskytovatel proto
        // administrativní endpointy neregistruje vůbec, ani pro bootstrap.
        app.MapSpravaOpravneni();
        app.MapSpravaOpravneniWebu();
        app.MapSpravaClanku();
        app.MapSpravaObecnychClanku();
        app.MapSpravaSerie();
        app.MapKalendar();
        app.MapSpravaVysledku();
        app.MapPrihlasky();
        app.MapSmernice();
        app.MapZpravy();
        app.MapKody();
        app.MapKapitanstvi();
        app.MapBoje();
        app.MapTrasy();
        app.MapOkna();
        app.MapPolohy();
        app.MapNastaveniTrackeru();
        app.MapKlice();
        app.MapKliceRegaty();
        app.MapTrat();
        app.MapSpravaPoradatelu();
        app.MapNaklady();
    }

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
