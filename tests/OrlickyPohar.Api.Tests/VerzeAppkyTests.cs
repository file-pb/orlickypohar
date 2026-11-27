using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using OrlickyPohar.Api.Features.Appka;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Čtení hlavičky <c>X-Appka-Verze</c>. Bez databáze: je to čistá funkce
/// a na ní stojí, jestli se o telefonu vůbec něco dozvíme.
/// <para>
/// <b>Hlavička je telemetrie</b>, takže se čte shovívavě — neplatná je
/// <c>null</c> a nic víc. Tyhle testy hlídají obojí: že platná projde celá
/// a že cokoliv mimo smlouvu skončí jako „nic", ne jako polovina hlášení.
/// </para>
/// </summary>
public class VerzeAppkyTests
{
    private const string Aktualizace = "0f6d1c7e-5b2a-4c1e-9a43-2d8f6e1b7c90";
    private const string Ceka = "7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

    private const string Platna =
        "platforma=android;otisk=84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b;" +
        $"aktualizace={Aktualizace};kanal=production;spusteni=stazena;ceka={Ceka}";

    [Fact]
    public void Platna_hlavicka_projde_cela()
    {
        var v = VerzeAppky.Precti(Platna);

        Assert.NotNull(v);
        Assert.Equal("android", v.Platforma);
        Assert.Equal("84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b", v.Otisk);
        Assert.Equal(Guid.Parse(Aktualizace), v.Aktualizace);
        Assert.Equal("production", v.Kanal);
        Assert.Equal(SpusteniAppky.Stazena, v.Spusteni);
        Assert.Equal(Guid.Parse(Ceka), v.Ceka);
    }

    [Fact]
    public void Kanal_smi_byt_prazdny_a_ceka_chybet()
    {
        // Build bez kanálu žádný nemá — a hlásit se musí i on.
        var v = VerzeAppky.Precti(
            $"platforma=ios;otisk=abc;aktualizace={Aktualizace};kanal=;spusteni=vestavena");

        Assert.NotNull(v);
        Assert.Equal("", v.Kanal);
        Assert.Null(v.Ceka);
        Assert.Equal(SpusteniAppky.Vestavena, v.Spusteni);
    }

    [Fact]
    public void Prazdna_ceka_je_jako_zadna()
    {
        var v = VerzeAppky.Precti(
            $"platforma=ios;otisk=abc;aktualizace={Aktualizace};kanal=preview;spusteni=nouzova;ceka=");

        Assert.NotNull(v);
        Assert.Null(v.Ceka);
        Assert.Equal(SpusteniAppky.Nouzova, v.Spusteni);
    }

    /// <summary>
    /// <b>Neznámý klíč se přeskočí.</b> Novější appka může přidat pole a
    /// server, který o něm neví, ji kvůli tomu nesmí přestat vidět.
    /// Mezery kolem oddělovačů a středník na konci jsou taky jen šum.
    /// </summary>
    [Fact]
    public void Neznamy_klic_mezery_a_strednik_na_konci_nevadi()
    {
        var v = VerzeAppky.Precti(
            $" balicek=19 ; platforma = android;otisk=abc ;aktualizace={Aktualizace};kanal=preview;spusteni=stazena; ");

        Assert.NotNull(v);
        Assert.Equal("android", v.Platforma);
        Assert.Equal("abc", v.Otisk);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("tohle-neni-hlavicka")]
    public void Prazdna_a_nesmyslna_je_null(string? hodnota)
    {
        Assert.Null(VerzeAppky.Precti(hodnota));
    }

    [Theory]
    [InlineData("platforma")]
    [InlineData("otisk")]
    [InlineData("aktualizace")]
    [InlineData("kanal")]
    [InlineData("spusteni")]
    public void Chybejici_povinny_klic_je_null(string klic)
    {
        var bez = string.Join(';', Platna.Split(';').Where(p => !p.StartsWith(klic + "=")));

        Assert.NotEqual(Platna, bez);
        Assert.Null(VerzeAppky.Precti(bez));
    }

    [Theory]
    // Platforma přesně podle smlouvy; „Android" je jiný řetězec.
    [InlineData("platforma=android", "platforma=Android")]
    [InlineData("platforma=android", "platforma=web")]
    // Otisk se porovnává s vydáním znak po znaku — mezera by se neshodla nikdy.
    [InlineData("otisk=84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b", "otisk=84146e78 d94b")]
    [InlineData("otisk=84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b", "otisk=")]
    [InlineData("otisk=84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b",
        "otisk=84146e78d94b4ab28d7e36a9c22d3bae60b8ee6b84146e78d94b4ab28d7e36a9c2")]
    [InlineData("aktualizace=" + Aktualizace, "aktualizace=neni-to-uuid")]
    [InlineData("aktualizace=" + Aktualizace, "aktualizace=0f6d1c7e5b2a4c1e9a432d8f6e1b7c90")]
    [InlineData("kanal=production", "kanal=Production")]
    [InlineData("kanal=production", "kanal=abcdefghijabcdefghijabcdefghijabc")]
    [InlineData("spusteni=stazena", "spusteni=stazená")]
    [InlineData("spusteni=stazena", "spusteni=")]
    [InlineData("ceka=" + Ceka, "ceka=neni-to-uuid")]
    public void Hodnota_mimo_smlouvu_shodi_celou_hlavicku(string puvodni, string spatna)
    {
        Assert.Contains(puvodni, Platna);
        Assert.Null(VerzeAppky.Precti(Platna.Replace(puvodni, spatna)));
    }

    [Fact]
    public void Klic_dvakrat_je_dvojznacny()
    {
        Assert.Null(VerzeAppky.Precti(Platna + ";otisk=jiny"));
    }

    [Fact]
    public void Kus_bez_rovnitka_je_neplatny()
    {
        Assert.Null(VerzeAppky.Precti(Platna + ";nesmysl"));
    }

    [Fact]
    public void Prilis_dlouha_se_ani_necte()
    {
        var dlouha = Platna + ";vata=" + new string('x', VerzeAppky.NejvicZnaku);
        Assert.Null(VerzeAppky.Precti(dlouha));
    }

    /// <summary>
    /// Slova ze smlouvy jsou na dvou místech: v rozboru hlavičky a ve jménech,
    /// se kterými jde výčet ven v JSONu. Rozejdou-li se, appka by hlásila
    /// jedno a přehled ukazoval druhé.
    /// </summary>
    [Fact]
    public void Spusteni_jde_ven_temiz_slovy_jake_hlavicka_nese()
    {
        var json = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            Converters = { new JsonStringEnumConverter() },
        };

        foreach (var spusteni in Enum.GetValues<SpusteniAppky>())
        {
            var slovo = JsonSerializer.Serialize(spusteni, json).Trim('"');
            var v = VerzeAppky.Precti(
                $"platforma=android;otisk=abc;aktualizace={Aktualizace};kanal=x;spusteni={slovo}");

            Assert.Equal(spusteni, v?.Spusteni);
        }
    }

    [Fact]
    public void Z_pozadavku_se_cte_jednou_a_dvakrat_poslana_je_zadna()
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Headers[VerzeAppky.Hlavicka] = Platna;

        var prvni = VerzeAppky.Z(ctx);
        Assert.NotNull(prvni);

        // Druhá otázka nečte hlavičku znovu — dostane uschovaný výsledek.
        ctx.Request.Headers[VerzeAppky.Hlavicka] = "rozbita";
        Assert.Same(prvni, VerzeAppky.Z(ctx));

        var dvakrat = new DefaultHttpContext();
        dvakrat.Request.Headers.Append(VerzeAppky.Hlavicka, Platna);
        dvakrat.Request.Headers.Append(VerzeAppky.Hlavicka, Platna);
        Assert.Null(VerzeAppky.Z(dvakrat));

        Assert.Null(VerzeAppky.Z(new DefaultHttpContext()));
    }

    /// <summary>
    /// <b>„Od kdy" se posune jen se změnou běžícího kódu.</b> Jinak by
    /// každé hlášení tvrdilo, že telefon jede na téhle verzi teprve chvíli,
    /// a nedalo by se poznat, kdo visí na staré aktualizaci týden.
    /// </summary>
    [Fact]
    public void Od_kdy_se_meni_jen_se_zmenou_otisku_nebo_aktualizace()
    {
        var cil = new Cil();
        var t0 = new DateTimeOffset(2026, 11, 27, 8, 0, 0, TimeSpan.Zero);
        var v = VerzeAppky.Precti(Platna)!;

        VerzeAppky.Zapis(cil, v, t0);
        Assert.Equal(t0, cil.VerzeOdV);
        Assert.Equal(t0, cil.VerzeHlasenaV);

        // Totéž znovu, jen s jinou čekající aktualizací a kanálem: běží
        // pořád tentýž kód.
        VerzeAppky.Zapis(cil, v with { Ceka = null, Kanal = "preview" }, t0.AddHours(1));
        Assert.Equal(t0, cil.VerzeOdV);
        Assert.Equal(t0.AddHours(1), cil.VerzeHlasenaV);
        Assert.Equal("preview", cil.VerzeKanal);
        Assert.Null(cil.VerzeCeka);

        VerzeAppky.Zapis(cil, v with { Aktualizace = Guid.NewGuid() }, t0.AddHours(2));
        Assert.Equal(t0.AddHours(2), cil.VerzeOdV);

        VerzeAppky.Zapis(cil, v with { Otisk = "novy" }, t0.AddHours(3));
        Assert.Equal(t0.AddHours(3), cil.VerzeOdV);

        // A uložené se dá přečíst zpátky jako totéž hlášení.
        Assert.Equal(v with { Otisk = "novy" }, VerzeAppky.Z(cil));
    }

    [Fact]
    public void Kdo_se_nehlasil_nema_verzi()
    {
        Assert.Null(VerzeAppky.Z(new Cil()));
    }

    private sealed class Cil : IHlasiVerzi
    {
        public string? VerzePlatforma { get; set; }
        public string? VerzeOtisk { get; set; }
        public Guid? VerzeAktualizace { get; set; }
        public string? VerzeKanal { get; set; }
        public SpusteniAppky? VerzeSpusteni { get; set; }
        public Guid? VerzeCeka { get; set; }
        public DateTimeOffset? VerzeOdV { get; set; }
        public DateTimeOffset? VerzeHlasenaV { get; set; }
    }
}
