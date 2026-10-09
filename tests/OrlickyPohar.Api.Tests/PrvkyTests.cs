using OrlickyPohar.Api.Features.Boje;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla prvku trati. Čisté funkce, bez databáze.
/// <para>
/// Jádro je jediné: <b>neúplný prvek je horší než žádný</b>. Půlka brány
/// nakreslí na mapě bod tam, kde je průjezd, a loď k němu popluje.
/// </para>
/// </summary>
public class PrvkyTests
{
    private static string? Jde(
        TypPrvku typ,
        int? bojeB = null,
        double? sirka = null,
        double? delka = null,
        string? popis = null,
        StranaPrvku? strana = null) =>
        Prvky.ProcNejde(typ, bojeB, sirka, delka, popis, strana);

    [Fact]
    public void Znacka_ma_jeden_konec()
    {
        Assert.Null(Jde(TypPrvku.Znacka));
        Assert.NotNull(Jde(TypPrvku.Znacka, bojeB: 7));
        Assert.NotNull(Jde(TypPrvku.Znacka, sirka: 49.5, delka: 14.1, popis: "bod"));
    }

    [Theory]
    [InlineData(TypPrvku.Brana)]
    [InlineData(TypPrvku.Odskok)]
    [InlineData(TypPrvku.CaraStart)]
    [InlineData(TypPrvku.CaraCil)]
    public void Dvoukonec_bez_druheho_konce_neprojde(TypPrvku typ)
    {
        Assert.NotNull(Jde(typ));
        Assert.Null(Jde(typ, bojeB: 7, strana: Strana(typ)));
    }

    [Fact]
    public void Konec_je_bud_boje_nebo_bod()
    {
        Assert.NotNull(Jde(TypPrvku.Brana, bojeB: 7, sirka: 49.5, delka: 14.1, popis: "bod"));
    }

    [Fact]
    public void Bod_misto_boje_chce_rict_cim_je()
    {
        // Start se běžně vytyčí mezi bójí a plavidlem komise. Bez popisu
        // se na vodě nepozná, kam se pluje.
        Assert.NotNull(Jde(TypPrvku.CaraStart, sirka: 49.5, delka: 14.1));
        Assert.NotNull(Jde(TypPrvku.CaraStart, sirka: 49.5, delka: 14.1, popis: "   "));
        Assert.Null(Jde(TypPrvku.CaraStart, sirka: 49.5, delka: 14.1, popis: "plavidlo komise"));
    }

    [Fact]
    public void Dlouhy_popis_neprojde()
    {
        var dlouhy = new string('a', Prvky.PopisNejvic + 1);
        Assert.NotNull(Jde(TypPrvku.Brana, sirka: 49.5, delka: 14.1, popis: dlouhy));
        Assert.Null(Jde(TypPrvku.Brana, sirka: 49.5, delka: 14.1, popis: dlouhy[..Prvky.PopisNejvic]));
    }

    [Fact]
    public void Strana_patri_jen_tam_kde_ji_nevoli_lod()
    {
        // U brány si stranu volí loď, u čáry rozhoduje směr průjezdu.
        Assert.Null(Jde(TypPrvku.Znacka, strana: StranaPrvku.PoLeve));
        Assert.Null(Jde(TypPrvku.Odskok, bojeB: 7, strana: StranaPrvku.PoPrave));
        Assert.NotNull(Jde(TypPrvku.Brana, bojeB: 7, strana: StranaPrvku.PoLeve));
        Assert.NotNull(Jde(TypPrvku.CaraStart, bojeB: 7, strana: StranaPrvku.PoLeve));
    }

    [Fact]
    public void Dvoukonec_zna_jen_znacku_jako_vyjimku()
    {
        Assert.False(Prvky.Dvoukonec(TypPrvku.Znacka));
        Assert.True(Prvky.Dvoukonec(TypPrvku.Brana));
        Assert.True(Prvky.Dvoukonec(TypPrvku.Odskok));
        Assert.True(Prvky.Dvoukonec(TypPrvku.CaraStart));
        Assert.True(Prvky.Dvoukonec(TypPrvku.CaraCil));
    }

    [Fact]
    public void Start_a_cil_jsou_dva_typy_ne_jeden()
    {
        // Tytéž dvě polohy můžou být ráno start a odpoledne cíl, takže to
        // nesmí být jeden typ s příznakem.
        Assert.NotEqual(TypPrvku.CaraStart, TypPrvku.CaraCil);
    }

    /// <summary>Strana, která je u toho typu přípustná — jinak <c>null</c>.</summary>
    private static StranaPrvku? Strana(TypPrvku typ) =>
        Prvky.StranaPatri(typ) ? StranaPrvku.PoLeve : null;
}
