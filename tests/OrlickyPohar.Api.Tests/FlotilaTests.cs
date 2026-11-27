using OrlickyPohar.Api.Features.Appka;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Stav telefonu proti tomu, co je venku. Bez databáze: na tomhle výpočtu
/// stojí celý přehled flotily, a chyba v něm by z přehledu udělala buď
/// poplach, kterému nikdo nevěří, nebo — horší — zelenou nad telefonem,
/// kterému se aktualizace ztratila.
/// </summary>
public class FlotilaTests
{
    private const string StaryOtisk = "otisk-17";
    private const string NovyOtisk = "otisk-18";
    private const string CommitBalicku = "b870bd39aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    private static readonly Guid Starsi = Guid.Parse("11111111-1111-4111-8111-111111111111");
    private static readonly Guid Posledni = Guid.Parse("22222222-2222-4222-8222-222222222222");
    private static readonly Guid Vestavena = Guid.Parse("33333333-3333-4333-8333-333333333333");

    private static readonly DateTimeOffset T0 = new(2026, 11, 20, 10, 0, 0, TimeSpan.Zero);

    private static VydaniAppky Balicek(int cislo, string otisk, string platforma = "android",
        string? commit = null, int hodin = 0) =>
        new()
        {
            Platforma = platforma, CisloBalicku = cislo, Otisk = otisk, Commit = commit,
            VydanoV = T0.AddHours(hodin),
        };

    private static PublikaceAppky Publikace(Guid aktualizace, string otisk = NovyOtisk,
        string kanal = "production", int hodin = 0, int id = 0, string? commit = null) =>
        new()
        {
            Id = id, Platforma = "android", Kanal = kanal, Otisk = otisk, Aktualizace = aktualizace,
            Commit = commit, PublikovanoV = T0.AddHours(hodin),
        };

    private static VerzeAppky Verze(string otisk = NovyOtisk, Guid? aktualizace = null,
        SpusteniAppky spusteni = SpusteniAppky.Stazena, string kanal = "production") =>
        new("android", otisk, aktualizace ?? Posledni, kanal, spusteni, null);

    /// <summary>Venku: balíčky 17 a 18, pro 18 dvě publikace do production.</summary>
    private static Vydano Venku() =>
        new(
            [Balicek(17, StaryOtisk), Balicek(18, NovyOtisk, commit: CommitBalicku, hodin: 5)],
            [Publikace(Starsi, hodin: 1, id: 1), Publikace(Posledni, hodin: 2, id: 2)]);

    [Fact]
    public void Kdo_se_nikdy_nehlasil_je_bez_hlaseni()
    {
        Assert.Equal(StavVerzeAppky.BezHlaseni, Venku().Stav(null));
    }

    [Fact]
    public void Posledni_balicek_a_posledni_aktualizace_je_aktualni()
    {
        Assert.Equal(StavVerzeAppky.Aktualni, Venku().Stav(Verze()));
    }

    [Fact]
    public void Jiny_otisk_nez_posledni_vydany_je_stary_balicek()
    {
        // Po síti se to nespraví: pro starý otisk žádná aktualizace není.
        Assert.Equal(StavVerzeAppky.StaryBalicek, Venku().Stav(Verze(otisk: StaryOtisk)));
    }

    [Fact]
    public void Posledni_balicek_se_starsi_aktualizaci_je_stara_aktualizace()
    {
        Assert.Equal(StavVerzeAppky.StaraAktualizace, Venku().Stav(Verze(aktualizace: Starsi)));
    }

    /// <summary>
    /// <b>Nouzové spuštění přebije všechno.</b> Je to jediný stav, který
    /// říká, že se něco rozbilo — a starý balíček by ho jinak schoval.
    /// </summary>
    [Fact]
    public void Nouzove_spusteni_ma_prednost()
    {
        Assert.Equal(StavVerzeAppky.Nouzove,
            Venku().Stav(Verze(spusteni: SpusteniAppky.Nouzova)));
        Assert.Equal(StavVerzeAppky.Nouzove,
            Venku().Stav(Verze(otisk: StaryOtisk, spusteni: SpusteniAppky.Nouzova)));
    }

    /// <summary>
    /// Poslední je balíček s nejvyšším číslem, ne ten zapsaný naposledy:
    /// ruční „nahrát znovu" pošle starší číslo později.
    /// </summary>
    [Fact]
    public void Posledni_balicek_je_podle_cisla_ne_podle_casu()
    {
        var venku = new Vydano(
            [Balicek(18, NovyOtisk, hodin: 1), Balicek(17, StaryOtisk, hodin: 9)], []);

        Assert.Equal(18, venku.PosledniBalicek("android")!.CisloBalicku);
        Assert.Equal(StavVerzeAppky.StaryBalicek, venku.Stav(Verze(otisk: StaryOtisk)));
    }

    /// <summary>
    /// Poslední publikace je ta zapsaná naposledy. Identifikátory jsou
    /// náhodné, takže „vyšší" nic neznamená; při shodě času rozhoduje pořadí
    /// zápisu.
    /// </summary>
    [Fact]
    public void Posledni_publikace_je_podle_casu_a_pri_shode_podle_poradi()
    {
        var pozdejsi = new Vydano([], [Publikace(Posledni, hodin: 1, id: 1), Publikace(Starsi, hodin: 2, id: 2)]);
        Assert.Equal(Starsi, pozdejsi.PosledniPublikace("android", "production", NovyOtisk)!.Aktualizace);

        var soucasne = new Vydano([], [Publikace(Posledni, hodin: 1, id: 7), Publikace(Starsi, hodin: 1, id: 3)]);
        Assert.Equal(Posledni, soucasne.PosledniPublikace("android", "production", NovyOtisk)!.Aktualizace);
    }

    [Fact]
    public void Publikace_jineho_kanalu_se_nepocita()
    {
        // Preview má novější aktualizaci, ale telefon z production ji nedostane
        // a nemá se podle ní měřit.
        var venku = new Vydano(
            [Balicek(18, NovyOtisk)],
            [Publikace(Posledni, kanal: "production", hodin: 1), Publikace(Starsi, kanal: "preview", hodin: 2)]);

        Assert.Equal(StavVerzeAppky.Aktualni, venku.Stav(Verze(aktualizace: Posledni)));
        Assert.Equal(StavVerzeAppky.StaraAktualizace,
            venku.Stav(Verze(aktualizace: Posledni, kanal: "preview")));
    }

    /// <summary>
    /// <b>Bez měřítka se zastaralost nevymýšlí.</b> Platforma, pro kterou
    /// v obchodě nic neleží (iOS dnes), nemá starý balíček; otisk bez jediné
    /// publikace nemá starou aktualizaci.
    /// </summary>
    [Fact]
    public void Bez_vydani_a_bez_publikace_neni_cim_merit()
    {
        var nic = new Vydano([], []);
        Assert.Equal(StavVerzeAppky.Aktualni, nic.Stav(Verze(otisk: "cokoliv", aktualizace: Starsi)));

        var jenAndroid = new Vydano([Balicek(18, NovyOtisk)], []);
        Assert.Equal(StavVerzeAppky.Aktualni,
            jenAndroid.Stav(new VerzeAppky("ios", "ios-otisk", Starsi, "production", SpusteniAppky.Stazena, null)));
    }

    /// <summary>
    /// <b>Čerstvá instalace z obchodu je aktuální</b>, přestože běží
    /// vestavěný bundle s jiným identifikátorem než poslední publikace: oba
    /// jsou z jednoho commitu. expo-updates tu publikaci nenahraje, protože
    /// je starší než zabalení balíčku — bez výjimky by telefon svítil jako
    /// zastaralý až do další publikace.
    /// </summary>
    [Fact]
    public void Vestavena_z_tehoz_commitu_jako_posledni_publikace_je_aktualni()
    {
        var venku = new Vydano(
            [Balicek(18, NovyOtisk, commit: CommitBalicku)],
            [Publikace(Posledni, commit: CommitBalicku[..7])]);

        Assert.Equal(StavVerzeAppky.Aktualni,
            venku.Stav(Verze(aktualizace: Vestavena, spusteni: SpusteniAppky.Vestavena)));
    }

    [Fact]
    public void Vestavena_z_jineho_commitu_je_stara_aktualizace()
    {
        var venku = new Vydano(
            [Balicek(18, NovyOtisk, commit: CommitBalicku)],
            [Publikace(Posledni, commit: "c526d726")]);

        Assert.Equal(StavVerzeAppky.StaraAktualizace,
            venku.Stav(Verze(aktualizace: Vestavena, spusteni: SpusteniAppky.Vestavena)));
    }

    /// <summary>
    /// Výjimka platí jen pro vestavěný bundle. Stažená aktualizace s jiným
    /// identifikátorem je jiná publikace, ať je z jakéhokoliv commitu.
    /// </summary>
    [Fact]
    public void Stazena_s_jinym_identifikatorem_vyjimku_nema()
    {
        var venku = new Vydano(
            [Balicek(18, NovyOtisk, commit: CommitBalicku)],
            [Publikace(Posledni, commit: CommitBalicku)]);

        Assert.Equal(StavVerzeAppky.StaraAktualizace, venku.Stav(Verze(aktualizace: Starsi)));
    }

    [Fact]
    public void Chybejici_commit_se_neshoduje_s_nicim()
    {
        var venku = new Vydano([Balicek(18, NovyOtisk)], [Publikace(Posledni)]);

        Assert.Equal(StavVerzeAppky.StaraAktualizace,
            venku.Stav(Verze(aktualizace: Vestavena, spusteni: SpusteniAppky.Vestavena)));
        Assert.False(Vydano.StejnyCommit(null, null));
        Assert.True(Vydano.StejnyCommit("b870bd39", CommitBalicku));
        Assert.False(Vydano.StejnyCommit("b870bd3a", CommitBalicku));
    }

    [Fact]
    public void Cislo_balicku_z_otisku()
    {
        var venku = new Vydano(
            [Balicek(17, StaryOtisk), Balicek(18, NovyOtisk), Balicek(19, NovyOtisk),
             Balicek(5, NovyOtisk, platforma: "ios")], []);

        // Sdílený otisk: nejvyšší číslo, balíčky jsou pro aktualizace zaměnitelné.
        Assert.Equal(19, venku.CisloBalicku("android", NovyOtisk));
        Assert.Equal(17, venku.CisloBalicku("android", StaryOtisk));
        Assert.Equal(5, venku.CisloBalicku("ios", NovyOtisk));
        Assert.Null(venku.CisloBalicku("android", "neznamy"));
    }
}

/// <summary>Kontrola zápisu publikace z CI. Co neprojde tady, do tabulky se nedostane.</summary>
public class PublikaceAppkyTests
{
    private static ZapisPublikaceAppky Zapis(
        string platforma = "android", string kanal = "production", string otisk = "abc",
        string aktualizace = "0f6d1c7e-5b2a-4c1e-9a43-2d8f6e1b7c90", string? commit = "69e42c75") =>
        new(platforma, kanal, otisk, aktualizace, commit);

    [Fact]
    public void Platny_zapis_projde()
    {
        Assert.Null(PublikaceAppkyEndpoints.Chyba(Zapis()));
        Assert.Null(PublikaceAppkyEndpoints.Chyba(Zapis(platforma: "ios", kanal: "preview", commit: null)));
    }

    [Theory]
    [InlineData("Android", "production", "abc", "0f6d1c7e-5b2a-4c1e-9a43-2d8f6e1b7c90")]
    // Publikace bez kanálu neexistuje; prázdný smí mít jen telefon.
    [InlineData("android", "", "abc", "0f6d1c7e-5b2a-4c1e-9a43-2d8f6e1b7c90")]
    [InlineData("android", "Production", "abc", "0f6d1c7e-5b2a-4c1e-9a43-2d8f6e1b7c90")]
    [InlineData("android", "production", "a b", "0f6d1c7e-5b2a-4c1e-9a43-2d8f6e1b7c90")]
    [InlineData("android", "production", "abc", "neni-to-uuid")]
    // Nulový identifikátor by se shodl s telefonem, který žádný nehlásí.
    [InlineData("android", "production", "abc", "00000000-0000-0000-0000-000000000000")]
    public void Spatny_zapis_se_odmitne(string platforma, string kanal, string otisk, string aktualizace)
    {
        Assert.NotNull(PublikaceAppkyEndpoints.Chyba(Zapis(platforma, kanal, otisk, aktualizace)));
    }

    [Fact]
    public void Commit_musi_byt_hash()
    {
        Assert.NotNull(PublikaceAppkyEndpoints.Chyba(Zapis(commit: "main")));
    }
}
