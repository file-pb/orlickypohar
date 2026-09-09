using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Udělování rolí proti reálnému PostgreSQL.
/// <para>
/// Přes službu, ne přes HTTP: účet vzniká přihlášením a testovací hostitel
/// nemá nakonfigurovaného poskytovatele identity, takže by se k endpointu
/// nedalo dostat s platným tokenem. Ověřuje se tu to, co na databázi
/// skutečně stojí — <b>unikátní index</b> pod opakovaným udělením a
/// <b>počet správců</b> pod odebráním.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class SpravaTests(PostgresFixture fixture)
{
    private const string Vydavatel = "https://ucty.priklad.cz";

    private async Task<T> VeSluzbeAsync<T>(Func<IServiceProvider, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        return await co(scope.ServiceProvider);
    }

    /// <summary>Prázdný ročník s jednou zastávkou. Slug musí být v každém testu jiný.</summary>
    private Task<(int SerieId, int ZavodId)> RocnikAsync(string slug) =>
        VeSluzbeAsync(async sp =>
        {
            var db = sp.GetRequiredService<AppDbContext>();

            var serie = new Api.Features.Serial.Serie { Nazev = $"Pohár {slug}", Slug = slug, Rok = 2026 };
            db.Serie.Add(serie);
            await db.SaveChangesAsync();

            var zavod = new Api.Features.Zavody.Zavod
            {
                SerieId = serie.Id, Nazev = "Radavská regata", Slug = $"radava-{slug}",
                Datum = new DateOnly(2026, 5, 16),
            };
            db.Zavody.Add(zavod);
            await db.SaveChangesAsync();

            return (serie.Id, zavod.Id);
        });

    private Task<Uzivatel> PrihlasAsync(string subject, string email) =>
        VeSluzbeAsync(sp => sp.GetRequiredService<Uzivatele>().NajdiNeboZalozAsync(
            Vydavatel, subject, "Jan Novák", email, TimeProvider.System, default));

    private Task<T> SpravaAsync<T>(Func<OpravneniSprava, Task<T>> co) =>
        VeSluzbeAsync(sp => co(sp.GetRequiredService<OpravneniSprava>()));

    [Fact]
    public async Task Bez_prihlaseni_neni_komu_roli_dat()
    {
        var (serieId, _) = await RocnikAsync("bez-uctu");

        var (stav, _) = await SpravaAsync(s =>
            s.UdelAsync(serieId, null, "nikdo@priklad.cz", Role.Spravce, default));

        // Účet vzniká až prvním přihlášením. Pozvat člověka rolí nejde a
        // administrace to musí říct, ne mlčky založit prázdný účet.
        Assert.Equal(StavUdeleni.UcetNeni, stav);
    }

    [Fact]
    public async Task E_mail_se_pari_bez_ohledu_na_velikost_pismen()
    {
        var (serieId, _) = await RocnikAsync("velka-pismena");
        await PrihlasAsync("sub-velka", "Jan.Novak@Priklad.cz");

        var (stav, radek) = await SpravaAsync(s =>
            s.UdelAsync(serieId, null, "  jan.novak@priklad.CZ  ", Role.Spravce, default));

        // Správce ho opisuje z papíru a poskytovatelé si s velikostí písmen
        // dělají, co chtějí.
        Assert.Equal(StavUdeleni.Udeleno, stav);
        Assert.Equal(Role.Spravce, radek!.Role);
        Assert.Null(radek.Zavod);
    }

    [Fact]
    public async Task Druhe_udeleni_teze_role_nic_nezduplikuje()
    {
        var (serieId, _) = await RocnikAsync("dvakrat");
        await PrihlasAsync("sub-dvakrat", "dvakrat@priklad.cz");

        var prvni = await SpravaAsync(s =>
            s.UdelAsync(serieId, null, "dvakrat@priklad.cz", Role.Spravce, default));
        var druhe = await SpravaAsync(s =>
            s.UdelAsync(serieId, null, "dvakrat@priklad.cz", Role.Spravce, default));

        // Stojí to na unikátním indexu, který by fake databáze neověřila:
        // bez kontroly předem by druhé kliknutí skončilo pádem na půl cesty.
        Assert.Equal(StavUdeleni.Udeleno, prvni.Stav);
        Assert.Equal(StavUdeleni.JizMel, druhe.Stav);
        Assert.Equal(prvni.Radek!.Id, druhe.Radek!.Id);

        var pocet = await VeSluzbeAsync(sp => sp.GetRequiredService<AppDbContext>()
            .Opravneni.CountAsync(o => o.SerieId == serieId));
        Assert.Equal(1, pocet);
    }

    [Fact]
    public async Task Tataz_role_na_rocnik_a_na_zastavku_jsou_dve_ruzna_opravneni()
    {
        var (serieId, zavodId) = await RocnikAsync("dva-rozsahy");
        await PrihlasAsync("sub-rozsahy", "rozsahy@priklad.cz");

        var rocnik = await SpravaAsync(s =>
            s.UdelAsync(serieId, null, "rozsahy@priklad.cz", Role.Organizator, default));
        var zastavka = await SpravaAsync(s =>
            s.UdelAsync(serieId, zavodId, "rozsahy@priklad.cz", Role.Organizator, default));

        Assert.Equal(StavUdeleni.Udeleno, rocnik.Stav);
        Assert.Equal(StavUdeleni.Udeleno, zastavka.Stav);
        Assert.NotEqual(rocnik.Radek!.Id, zastavka.Radek!.Id);

        // Ve výpisu je vidět, čeho se které týká — jinak by se v obrazovce
        // správce nedalo poznat, které z nich odebrat.
        var prehled = await SpravaAsync(s => s.PrehledAsync(serieId, default));
        Assert.Contains(prehled!.Opravneni, r => r.Zavod is null);
        Assert.Contains(prehled.Opravneni, r => r.Zavod == "radava-dva-rozsahy");

        // Obrazovka potřebuje i zastávky, na které jdou role udělit —
        // včetně těch, které ještě nejsou publikované.
        Assert.Contains(prehled.Zastavky, z => z.Slug == "radava-dva-rozsahy");
    }

    [Fact]
    public async Task Bootstrap_se_zavre_prvnim_spravcem()
    {
        var (serieId, _) = await RocnikAsync("bootstrap");
        await PrihlasAsync("sub-bootstrap", "bootstrap@priklad.cz");

        Assert.False(await SpravaAsync(s => s.MaSpravceAsync(serieId, default)));

        await SpravaAsync(s => s.UdelAsync(serieId, null, "bootstrap@priklad.cz", Role.Spravce, default));

        // Od téhle chvíle už importní token na udělování rolí nestačí.
        Assert.True(await SpravaAsync(s => s.MaSpravceAsync(serieId, default)));
    }

    [Fact]
    public async Task Posledniho_spravce_odebrat_nejde()
    {
        var (serieId, _) = await RocnikAsync("posledni");
        await PrihlasAsync("sub-posledni-a", "posledni-a@priklad.cz");
        await PrihlasAsync("sub-posledni-b", "posledni-b@priklad.cz");

        var a = await SpravaAsync(s =>
            s.UdelAsync(serieId, null, "posledni-a@priklad.cz", Role.Spravce, default));

        // Sám sebe by tím ročník zamkl ven a zpátky by vedla jen cesta přes
        // tajemství na serveru.
        Assert.Equal(StavOdebrani.PosledniSpravce,
            await SpravaAsync(s => s.OdeberAsync(serieId, a.Radek!.Id, default)));

        await SpravaAsync(s =>
            s.UdelAsync(serieId, null, "posledni-b@priklad.cz", Role.Spravce, default));

        // S druhým správcem už prvního odebrat jde.
        Assert.Equal(StavOdebrani.Odebrano,
            await SpravaAsync(s => s.OdeberAsync(serieId, a.Radek!.Id, default)));
    }

    [Fact]
    public async Task Opravneni_ciziho_rocniku_se_odebrat_neda()
    {
        var (serieId, _) = await RocnikAsync("cizi-a");
        var (jinaSerieId, _) = await RocnikAsync("cizi-b");
        await PrihlasAsync("sub-cizi", "cizi@priklad.cz");

        var a = await SpravaAsync(s =>
            s.UdelAsync(serieId, null, "cizi@priklad.cz", Role.Editor, default));

        // Správce jednoho ročníku nesmí sáhnout do druhého ani číslem
        // oprávnění v adrese.
        Assert.Equal(StavOdebrani.Neni,
            await SpravaAsync(s => s.OdeberAsync(jinaSerieId, a.Radek!.Id, default)));
    }
}
