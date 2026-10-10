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
        StranaPrvku? strana = null,
        SvetovaStrana? smer = null,
        DruhStartu? druhStartu = null) =>
        Prvky.ProcNejde(typ, bojeB, sirka, delka, popis, strana, null, smer, druhStartu);

    [Fact]
    public void Znacka_ma_jeden_konec()
    {
        Assert.Null(Jde(TypPrvku.OtocnaBoje));
        Assert.NotNull(Jde(TypPrvku.OtocnaBoje, bojeB: 7));
        Assert.NotNull(Jde(TypPrvku.OtocnaBoje, sirka: 49.5, delka: 14.1, popis: "bod"));
    }

    [Theory]
    [InlineData(TypPrvku.Brana)]
    [InlineData(TypPrvku.OtocnaBrana)]
    [InlineData(TypPrvku.Odskok)]
    [InlineData(TypPrvku.Start)]
    [InlineData(TypPrvku.Cil)]
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
        Assert.NotNull(Jde(TypPrvku.Start, sirka: 49.5, delka: 14.1));
        Assert.NotNull(Jde(TypPrvku.Start, sirka: 49.5, delka: 14.1, popis: "   "));
        Assert.Null(Jde(TypPrvku.Start, sirka: 49.5, delka: 14.1, popis: "plavidlo komise"));
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
        Assert.Null(Jde(TypPrvku.OtocnaBoje, strana: StranaPrvku.PoLeve));
        Assert.Null(Jde(TypPrvku.Odskok, bojeB: 7, strana: StranaPrvku.PoPrave));
        Assert.Null(Jde(TypPrvku.PrujezdniBoje, strana: StranaPrvku.PoLeve));
        Assert.NotNull(Jde(TypPrvku.Brana, bojeB: 7, strana: StranaPrvku.PoLeve));
        Assert.NotNull(Jde(TypPrvku.Start, bojeB: 7, strana: StranaPrvku.PoLeve));
        Assert.NotNull(Jde(TypPrvku.OtocnaZona, bojeB: 7, strana: StranaPrvku.PoLeve));
    }

    [Fact]
    public void Jednokoncove_jsou_jen_boje_samotne()
    {
        // Jeden kus plastu ve vodě.
        Assert.False(Prvky.Dvoukonec(TypPrvku.OtocnaBoje));
        Assert.False(Prvky.Dvoukonec(TypPrvku.PrujezdniBoje));

        // Odskok má dva konce schválně: otočná a hned za ní odskoková,
        // dohromady jedno místo v řadě.
        Assert.True(Prvky.Dvoukonec(TypPrvku.Odskok));
        Assert.True(Prvky.Dvoukonec(TypPrvku.Brana));
        Assert.True(Prvky.Dvoukonec(TypPrvku.Start));
        Assert.True(Prvky.Dvoukonec(TypPrvku.Cil));
        // Otočná zóna je spojnice dvou objektů — i drátů nad vodou.
        Assert.True(Prvky.Dvoukonec(TypPrvku.OtocnaZona));
        // Otočná brána jsou taky dvě bóje; otáčí se mezi nimi.
        Assert.True(Prvky.Dvoukonec(TypPrvku.OtocnaBrana));
    }

    /// <summary>
    /// <b>Otočná brána nenese stranu</b> (Filip, 10. 10. 2026): <i>„u brány
    /// se tam branou vjede, ale stranu, okolo které točí — jestli si
    /// nakonec vybere tu levou bóji nebo pravou — volí loď."</i>
    /// <para>
    /// Od průjezdní brány se liší tím, <b>že</b> se v ní otáčí, ne kde.
    /// Proto vlastní typ, ne pole na bráně — a proto se tohle měří: kdyby
    /// někdo stranu u otočné brány „dodělal", vydával by rozhodnutí
    /// posádky za pravidlo trati.
    /// </para>
    /// </summary>
    [Fact]
    public void Otocna_brana_stranu_nenese()
    {
        Assert.False(Prvky.StranaPatri(TypPrvku.OtocnaBrana));
        Assert.False(Prvky.StranaPatri(TypPrvku.Brana));

        Assert.Null(Jde(TypPrvku.OtocnaBrana, bojeB: 7));
        Assert.NotNull(Jde(TypPrvku.OtocnaBrana, bojeB: 7, strana: StranaPrvku.PoLeve));
        Assert.NotNull(Jde(TypPrvku.OtocnaBrana, bojeB: 7, strana: StranaPrvku.PoPrave));
    }

    /// <summary>
    /// Směr ani druh startu k otočné bráně nepatří — není to čára, kterou
    /// se proplouvá v jednom směru.
    /// </summary>
    [Fact]
    public void Otocna_brana_nema_smer_ani_druh()
    {
        Assert.NotNull(Jde(TypPrvku.OtocnaBrana, bojeB: 7, smer: SvetovaStrana.J));
        Assert.NotNull(Jde(
            TypPrvku.OtocnaBrana, bojeB: 7, druhStartu: DruhStartu.PevnaLinie));
    }

    /// <summary>
    /// Směr a druh startu dávají smysl jen u startu. Jinde by to bylo
    /// pole, které obrazovka ukáže a nikdo neví, co znamená.
    /// </summary>
    [Fact]
    public void Smer_a_druh_patri_jen_ke_startu()
    {
        Assert.Null(Jde(TypPrvku.Start, bojeB: 7, smer: SvetovaStrana.J));
        Assert.Null(Jde(
            TypPrvku.Start, bojeB: 7, druhStartu: DruhStartu.OtevirajiciSeBrana));

        Assert.NotNull(Jde(TypPrvku.Cil, bojeB: 7, smer: SvetovaStrana.J));
        Assert.NotNull(Jde(TypPrvku.OtocnaBoje, smer: SvetovaStrana.SZ));
        Assert.NotNull(Jde(
            TypPrvku.Brana, bojeB: 7, druhStartu: DruhStartu.PevnaLinie));
    }

    /// <summary>
    /// Průjezdní bóje je jedna bóje se stranou. Strana závisí na směru
    /// průjezdu, takže táž bóje může být ve dvou prvcích s různou
    /// stranou — to ale hlídá pořadí, ne tohle pravidlo.
    /// </summary>
    [Fact]
    public void Prujezdni_boje_je_jedna_boje_se_stranou()
    {
        Assert.Null(Jde(TypPrvku.PrujezdniBoje, strana: StranaPrvku.PoPrave));
        Assert.NotNull(Jde(TypPrvku.PrujezdniBoje, bojeB: 7));
    }

    [Fact]
    public void Start_a_cil_jsou_dva_typy_ne_jeden()
    {
        // Tytéž dvě polohy můžou být ráno start a odpoledne cíl, takže to
        // nesmí být jeden typ s příznakem.
        Assert.NotEqual(TypPrvku.Start, TypPrvku.Cil);
    }

    /// <summary>Strana, která je u toho typu přípustná — jinak <c>null</c>.</summary>
    private static StranaPrvku? Strana(TypPrvku typ) =>
        Prvky.StranaPatri(typ) ? StranaPrvku.PoLeve : null;
}
