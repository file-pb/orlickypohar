using OrlickyPohar.Api.Features.Upozorneni;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla odběrů a fronty. Čisté funkce, takže bez databáze a bez Dockeru.
/// </summary>
public class UpozorneniTests
{
    [Fact]
    public void Odbery_se_radi_a_nezdvojuji()
    {
        // Stejný seznam se musí uložit vždycky stejně, jinak by se dva
        // zápisy téhož lišily textem a nešly porovnat.
        Assert.Equal(
            "serie:2027,zavod:jarni-vitr",
            Odbery.DoSloupce(["zavod:jarni-vitr", "serie:2027", "serie:2027", " "]));

        Assert.Equal("", Odbery.DoSloupce([]));
        Assert.Equal(["serie:2027", "zavod:x"], Odbery.ZeSloupce("serie:2027,zavod:x"));
        Assert.Empty(Odbery.ZeSloupce(null));
    }

    /// <summary>
    /// <b>Token se kontroluje na tvar.</b> Endpoint je bez přihlášení,
    /// takže se do něj dá poslat cokoliv; bez kontroly by se tabulka
    /// plnila nesmysly, na které by úloha marně volala Expo.
    /// </summary>
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("neco-jineho")]
    [InlineData("ExponentPushToken[bez-zavorky")]
    public void Spatny_token_se_odmitne(string? token)
    {
        Assert.NotNull(Odbery.ProcNejdeZapsat(token, ["serie:2027"]));
    }

    [Fact]
    public void Spravny_token_a_odber_projdou()
    {
        Assert.Null(Odbery.ProcNejdeZapsat("ExponentPushToken[abc123]", ["serie:2027"]));
        Assert.Null(Odbery.ProcNejdeZapsat("ExponentPushToken[abc123]", []));
    }

    [Fact]
    public void Neznamy_tvar_odberu_se_odmitne()
    {
        Assert.NotNull(Odbery.ProcNejdeZapsat("ExponentPushToken[abc]", ["lod:anicka"]));
        Assert.NotNull(
            Odbery.ProcNejdeZapsat(
                "ExponentPushToken[abc]",
                [.. Enumerable.Range(0, Odbery.NejvicOdberu + 1).Select(i => $"serie:{i}")]));
    }

    /// <summary>
    /// Čekání mezi pokusy roste, aby se při výpadku Expa nevolalo v těsné
    /// smyčce — a má strop, aby zpráva nečekala den.
    /// </summary>
    [Fact]
    public void Cekani_mezi_pokusy_roste_a_ma_strop()
    {
        var prvni = Odbery.ZkusitZa(1);
        var druhy = Odbery.ZkusitZa(2);

        Assert.True(druhy > prvni);
        Assert.True(Odbery.ZkusitZa(10) <= TimeSpan.FromMinutes(60));
        // Nultý pokus se chová jako první, ne jako „hned znovu".
        Assert.Equal(prvni, Odbery.ZkusitZa(0));
    }
}
