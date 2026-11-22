using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Správa <b>přes HTTP</b>, s podepsaným tokenem — poslední položka
/// „Testy správy přes HTTP" z fronty v plánu k 20. 10. 2026.
/// <para>
/// <b>Co tím přibylo.</b> Ostatní testy správy chodí přes služby, protože
/// se k endpointu dřív nedalo dostat s platným tokenem (viz
/// <see cref="TestoveTokeny"/>). Tím zůstávalo neověřené právě to, co vrstva
/// nad službou dělá sama: převod chyby na stavový kód, pořadí kontrol
/// a rozdíl mezi 403 a 404. To je přitom to, co se pozná až z prohlížeče.
/// </para>
/// <para>
/// <b>První čtyři testy jsou sabotáž té nové cesty</b>, ne ozdoba. Podpis
/// se nově ověřuje proti klíči, který si drží testy — kdyby se tím omylem
/// vyplo ověřování, celá sada by začala lhát a nic jiného by to nechytilo.
/// Každý z nich proto rozbije jednu část tokenu a čeká 401.
/// </para>
/// <para>
/// <b>Nic se neuklízí</b>, databázi sdílí celá kolekce. Každý test má proto
/// vlastní slug ročníku a vlastní subjekty účtů.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class SpravaPresHttpTests(PostgresFixture fixture)
{
    private static readonly JsonSerializerOptions Json =
        new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };

    private const string Jina = "https://nekdo-jiny.invalid";

    private async Task<T> VeScope<T>(Func<IServiceProvider, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        return await co(scope.ServiceProvider);
    }

    /// <summary>
    /// Ročník s jednou kategorií navíc a jednou lodí v ní. Vrací slug,
    /// číslo lodi a čísla obou kategorií.
    /// </summary>
    private Task<(string Slug, int LodId, int Race, int Pod7m)> RocnikAsync(string jmeno) =>
        VeScope(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();

            var serie = new Serie { Nazev = $"Pohár {jmeno}", Slug = jmeno, Rok = 2026 };
            db.Serie.Add(serie);
            await db.SaveChangesAsync();

            var race = new Kategorie { SerieId = serie.Id, Nazev = "Race", Poradi = 1 };
            var pod = new Kategorie { SerieId = serie.Id, Nazev = "Pod7m", Poradi = 2 };
            db.Kategorie.AddRange(race, pod);

            var osoba = new Osoba { Jmeno = "Majitel", Prijmeni = "Testovací" };
            db.Osoby.Add(osoba);
            await db.SaveChangesAsync();

            var lod = new Lod { Nazev = $"Loď {jmeno}", MajitelId = osoba.Id };
            db.Lode.Add(lod);
            await db.SaveChangesAsync();

            db.Prihlasky.Add(new Prihlaska
            {
                SerieId = serie.Id, LodId = lod.Id, KategorieId = race.Id,
            });
            await db.SaveChangesAsync();

            return (serie.Slug, lod.Id, race.Id, pod.Id);
        });

    /// <summary>
    /// Účet, který se přihlásil, a (volitelně) role správce toho ročníku.
    /// Vrací subjekt, kterým se dá vydat token.
    /// </summary>
    private async Task<string> UcetAsync(string subjekt, string? slugSeSpravou = null)
    {
        var email = $"{subjekt}@priklad.cz";

        await VeScope(async sp =>
        {
            await sp.GetRequiredService<Uzivatele>().NajdiNeboZalozAsync(
                TestoveTokeny.Vydavatel, subjekt, $"Účet {subjekt}", email,
                TimeProvider.System, default);
            return 0;
        });

        if (slugSeSpravou is not null)
            await VeScope(async sp =>
            {
                var db = sp.GetRequiredService<AppDbContext>();
                var serieId = await db.Serie.Where(s => s.Slug == slugSeSpravou)
                    .Select(s => s.Id).SingleAsync();
                await sp.GetRequiredService<OpravneniSprava>()
                    .UdelAsync(serieId, null, email, Role.Spravce, default);
                return 0;
            });

        return subjekt;
    }

    private static HttpClient STokenem(HttpClient klient, string token)
    {
        klient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return klient;
    }

    // ---- sabotáž podepisování: 401 musí dál držet -------------------------

    [Fact]
    public async Task Bez_tokenu_je_401()
    {
        var (slug, _, _, _) = await RocnikAsync("http-bez-tokenu");

        var odpoved = await fixture.CreateClient().GetAsync($"/sprava/serie/{slug}/lode");

        Assert.Equal(HttpStatusCode.Unauthorized, odpoved.StatusCode);
    }

    [Fact]
    public async Task Token_podepsany_cizim_klicem_je_401()
    {
        var (slug, _, _, _) = await RocnikAsync("http-cizi-podpis");
        await UcetAsync("cizi-podpis", slug);

        // Týž obsah, jiný klíč. Kdyby se ověřování podpisu novou cestou
        // omylem vyplo, projde tohle — a celá sada začne lhát.
        var cizi = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes("uplne-jiny-klic-ktery-nikdo-nezna-32B+++"));
        var token = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            issuer: TestoveTokeny.Vydavatel,
            audience: TestoveTokeny.Publikum,
            claims: [new Claim("sub", "cizi-podpis")],
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: new SigningCredentials(cizi, SecurityAlgorithms.HmacSha256)));

        var odpoved = await STokenem(fixture.CreateClient(), token)
            .GetAsync($"/sprava/serie/{slug}/lode");

        Assert.Equal(HttpStatusCode.Unauthorized, odpoved.StatusCode);
    }

    [Fact]
    public async Task Prosly_token_je_401()
    {
        var (slug, _, _, _) = await RocnikAsync("http-prosly");
        await UcetAsync("prosly", slug);

        var odpoved = await STokenem(
                fixture.CreateClient(),
                TestoveTokeny.Vydej("prosly", platnost: TimeSpan.FromMinutes(-10)))
            .GetAsync($"/sprava/serie/{slug}/lode");

        Assert.Equal(HttpStatusCode.Unauthorized, odpoved.StatusCode);
    }

    [Fact]
    public async Task Token_od_jineho_vydavatele_je_401()
    {
        var (slug, _, _, _) = await RocnikAsync("http-jiny-vydavatel");
        await UcetAsync("jiny-vydavatel", slug);

        // Podepsaný správným klíčem, ale vydaný někým jiným. Vazba účtu
        // stojí na dvojici (iss, sub), takže cizí vydavatel nesmí projít
        // ani tehdy, když subjekt sedí.
        var token = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            issuer: Jina,
            audience: TestoveTokeny.Publikum,
            claims: [new Claim("sub", "jiny-vydavatel")],
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: new SigningCredentials(
                TestoveTokeny.Klic, SecurityAlgorithms.HmacSha256)));

        var odpoved = await STokenem(fixture.CreateClient(), token)
            .GetAsync($"/sprava/serie/{slug}/lode");

        Assert.Equal(HttpStatusCode.Unauthorized, odpoved.StatusCode);
    }

    [Fact]
    public async Task Token_pro_jine_publikum_je_401()
    {
        var (slug, _, _, _) = await RocnikAsync("http-jine-publikum");
        await UcetAsync("jine-publikum", slug);

        // Správný klíč i vydavatel, cizí publikum. Je to zároveň zkouška
        // toho, že `PostConfigure` ve fixtuře nepřepsalo zbytek
        // `TokenValidationParameters` — přidává se do nich klíč, nic víc.
        var token = new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken(
            issuer: TestoveTokeny.Vydavatel,
            audience: "nejaka-jina-aplikace",
            claims: [new Claim("sub", "jine-publikum")],
            expires: DateTime.UtcNow.AddMinutes(10),
            signingCredentials: new SigningCredentials(
                TestoveTokeny.Klic, SecurityAlgorithms.HmacSha256)));

        var odpoved = await STokenem(fixture.CreateClient(), token)
            .GetAsync($"/sprava/serie/{slug}/lode");

        Assert.Equal(HttpStatusCode.Unauthorized, odpoved.StatusCode);
    }

    // ---- co teprve HTTP ukáže ---------------------------------------------

    [Fact]
    public async Task Prihlaseny_bez_role_dostane_403_a_ne_404()
    {
        var (slug, _, _, _) = await RocnikAsync("http-bez-role");
        await UcetAsync("bez-role");

        var odpoved = await fixture.KlientJako("bez-role").GetAsync($"/sprava/serie/{slug}/lode");

        // 403, ne 404: ročník existuje a nemá smysl to zapírat před někým,
        // kdo je přihlášený. Obráceně by se z kódu dalo číst, co existuje.
        Assert.Equal(HttpStatusCode.Forbidden, odpoved.StatusCode);
    }

    [Fact]
    public async Task Spravce_dostane_lode_i_s_kategoriemi_rocniku()
    {
        var (slug, lodId, race, pod) = await RocnikAsync("http-spravce");
        await UcetAsync("spravce", slug);
        var klient = fixture.KlientJako("spravce");

        var seznam = await klient.GetFromJsonAsync<List<LodSpravaDto>>(
            $"/sprava/serie/{slug}/lode", Json);
        Assert.NotNull(seznam);
        Assert.Equal("Race", Assert.Single(seznam).Kategorie);

        var detail = await klient.GetFromJsonAsync<LodDetailSpravaDto>(
            $"/sprava/serie/{slug}/lode/{lodId}", Json);
        Assert.NotNull(detail);

        // Kategorie ročníku jdou s detailem, aby obrazovka nemusela na
        // druhý dotaz, a v pořadí zobrazení.
        Assert.Equal([race, pod], detail.Kategorie.Select(k => k.Id));
        Assert.Equal(["Race", "Pod7m"], detail.Kategorie.Select(k => k.Nazev));
    }

    [Fact]
    public async Task Prerazeni_lodi_projde_a_projevi_se_v_seznamu()
    {
        var (slug, lodId, _, pod) = await RocnikAsync("http-prerazeni");
        await UcetAsync("prerazeni", slug);
        var klient = fixture.KlientJako("prerazeni");

        var odpoved = await klient.PutAsJsonAsync(
            $"/sprava/serie/{slug}/lode/{lodId}/kategorie", new { kategorieId = pod }, Json);

        Assert.Equal(HttpStatusCode.NoContent, odpoved.StatusCode);

        var seznam = await klient.GetFromJsonAsync<List<LodSpravaDto>>(
            $"/sprava/serie/{slug}/lode", Json);
        Assert.Equal("Pod7m", Assert.Single(seznam!).Kategorie);
    }

    [Fact]
    public async Task Prerazeni_do_kategorie_ciziho_rocniku_je_400()
    {
        var (slug, lodId, _, _) = await RocnikAsync("http-cizi-kategorie");
        var (_, _, _, cizi) = await RocnikAsync("http-cizi-kategorie-druhy");
        await UcetAsync("cizi-kategorie", slug);

        var odpoved = await fixture.KlientJako("cizi-kategorie").PutAsJsonAsync(
            $"/sprava/serie/{slug}/lode/{lodId}/kategorie", new { kategorieId = cizi }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, odpoved.StatusCode);
        var telo = await odpoved.Content.ReadFromJsonAsync<Chyba>(Json);
        Assert.Equal("Taková kategorie v ročníku není.", telo!.Error);
    }

    [Fact]
    public async Task Prerazeni_lodi_mimo_rocnik_je_404_i_pro_spravce()
    {
        var (slug, _, _, pod) = await RocnikAsync("http-lod-mimo");
        var (_, cizilod, _, _) = await RocnikAsync("http-lod-mimo-druhy");
        await UcetAsync("lod-mimo", slug);

        var odpoved = await fixture.KlientJako("lod-mimo").PutAsJsonAsync(
            $"/sprava/serie/{slug}/lode/{cizilod}/kategorie", new { kategorieId = pod }, Json);

        // 404 až po kontrole práv: správce ročníku už ví, že ročník
        // existuje, takže o cizí lodi se smí dozvědět, že v něm není.
        Assert.Equal(HttpStatusCode.NotFound, odpoved.StatusCode);
    }

    [Fact]
    public async Task Pravo_na_jeden_rocnik_nedosahne_na_druhy()
    {
        var (muj, _, _, _) = await RocnikAsync("http-rozsah-muj");
        var (cizi, cizilod, _, cizikat) = await RocnikAsync("http-rozsah-cizi");
        await UcetAsync("rozsah", muj);
        var klient = fixture.KlientJako("rozsah");

        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await klient.GetAsync($"/sprava/serie/{cizi}/lode")).StatusCode);

        // A zápis taky, i když by to jinak byl platný požadavek: loď
        // v tom ročníku je a kategorie k němu patří.
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await klient.PutAsJsonAsync(
                $"/sprava/serie/{cizi}/lode/{cizilod}/kategorie",
                new { kategorieId = cizikat }, Json)).StatusCode);
    }

    private record Chyba(string Error);
}
