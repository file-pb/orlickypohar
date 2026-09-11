using OrlickyPohar.Api.Features.Clanky;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla psaní článků. Čisté funkce, bez databáze — ptá se na ně každý
/// zápis, takže se to musí dát zkoušet levně a hodně.
/// </summary>
public class PsaniTests
{
    [Theory]
    [InlineData("Jarní vítr", "jarni-vitr")]
    [InlineData("FxCK Cancer: SOCKA bere kategorii Race", "fxck-cancer-socka-bere-kategorii-race")]
    [InlineData("  Pohár   Slunce  ", "pohar-slunce")]
    [InlineData("Příliš žluťoučký kůň", "prilis-zlutoucky-kun")]
    [InlineData("24hodinovka 2026", "24hodinovka-2026")]
    public void Slug_vznikne_z_titulku_bez_diakritiky(string titulek, string ocekavano)
    {
        // Adresa článku má jít přečíst do telefonu, takže se odvozuje ze
        // jména, ne z náhodného čísla. Diakritika padá, protože jde do URL.
        Assert.Equal(ocekavano, Psani.Slug(titulek));
    }

    [Fact]
    public void Slug_z_titulku_bez_pismen_je_prazdny_a_pozna_se_to()
    {
        Assert.Equal("", Psani.Slug("??? !!!"));

        // Prázdný slug není tichá chyba — uložení se odmítne s větou, ze
        // které je vidět, co s tím.
        var chyba = Psani.ProcNejdeUlozit("???", "Text.", Psani.Slug("???"));
        Assert.NotNull(chyba);
        Assert.Contains("adresa", chyba);
    }

    [Fact]
    public void Slug_se_vejde_do_sloupce()
    {
        var dlouhy = Psani.Slug(new string('a', 300));

        // Sloupec má 120 znaků; delší slug by padl až při zápisu do databáze.
        Assert.True(dlouhy.Length <= 120);
        Assert.DoesNotContain("--", dlouhy);
    }

    [Fact]
    public void Titulek_i_telo_jsou_povinne()
    {
        Assert.NotNull(Psani.ProcNejdeUlozit("", "Text.", "slug"));
        Assert.NotNull(Psani.ProcNejdeUlozit("   ", "Text.", "slug"));
        Assert.NotNull(Psani.ProcNejdeUlozit("Titulek", "", "slug"));
        Assert.Null(Psani.ProcNejdeUlozit("Titulek", "Text.", "slug"));
    }

    [Fact]
    public void Smazany_clanek_se_neda_publikovat_rovnou()
    {
        // Omylem smazaný text by šel jedním kliknutím zpátky na veřejnost
        // i s tím, co se na něm mezitím mělo opravit. Přes koncept ano.
        Assert.NotNull(Psani.ProcNejde(StavClanku.Smazano, StavClanku.Publikovano));
        Assert.Null(Psani.ProcNejde(StavClanku.Smazano, StavClanku.Draft));
        Assert.Null(Psani.ProcNejde(StavClanku.Draft, StavClanku.Publikovano));
    }

    [Fact]
    public void Ostatni_prechody_jsou_volne()
    {
        StavClanku[] stavy = [StavClanku.Draft, StavClanku.Publikovano, StavClanku.Skryty];

        // Mezi rozepsaným, vydaným a staženým se chodí tam i zpět. Je to
        // jeden člověk u jednoho textu, ne schvalovací proces.
        foreach (var ze in stavy)
            foreach (var na in stavy)
                Assert.Null(Psani.ProcNejde(ze, na));

        // A do koše se dá odkudkoliv.
        foreach (var ze in stavy)
            Assert.Null(Psani.ProcNejde(ze, StavClanku.Smazano));
    }

    [Fact]
    public void Stejny_stav_neni_chyba()
    {
        // Druhé kliknutí na „publikovat" nemá být pád. Nic se nezměnilo.
        foreach (var stav in Enum.GetValues<StavClanku>())
            Assert.Null(Psani.ProcNejde(stav, stav));
    }
}
