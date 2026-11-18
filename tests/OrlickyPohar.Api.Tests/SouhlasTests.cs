using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Znění souhlasu závodníka a jeho verzování (nález R9 oponentury
/// rozhodčího). Bez databáze — jsou to konstanty a jedna funkce.
///
/// <para>
/// <b>Proč to má testy.</b> Souhlas je u poháru <b>jediná vazba</b> mezi
/// závodníkem a pravidly, protože pořadatelsky ofiko není. Dvě věci se u něj
/// dají rozbít tiše: povýšit <see cref="Souhlas.Verze"/> a zapomenout na
/// znění (pak se ukládá číslo, ke kterému žádný text nepatří), a přepsat
/// starou verzi (pak se u přihlášky ukáže text, se kterým kapitán
/// nesouhlasil). Ani jedno nepozná žádná jiná kontrola.
/// </para>
/// <para>
/// Že text <b>odpovídá</b> tomu, co žádá vypsání, žádný test nepozná — to je
/// úsudek. Shodu s tím, co ukazuje web, hlídá
/// <c>tools/kontrola-souhlasu.py</c> v CI.
/// </para>
/// </summary>
public class SouhlasTests
{
    [Fact]
    public void DnesniZneniPatriDnesniVerzi()
    {
        // Jediná vazba mezi číslem a textem. Bez ní by povýšení verze bez
        // doplnění `Podle` prošlo a u přihlášky by zbylo číslo bez znění.
        Assert.Equal(Souhlas.Zneni, Souhlas.Podle(Souhlas.Verze));
    }

    [Fact]
    public void NeznamaVerzeJeChyba()
    {
        // Tichý návrat k poslednímu znění by znamenal ukázat text, se kterým
        // nikdo nesouhlasil.
        Assert.Throws<ArgumentOutOfRangeException>(() => Souhlas.Podle(Souhlas.Verze + 1));
        Assert.Throws<ArgumentOutOfRangeException>(() => Souhlas.Podle(0));
    }

    [Fact]
    public void KazdaVerzeJePokracovanimPredchozi()
    {
        // Starší verze se nemění, jen se k nim přidává. Kdyby se jedna
        // z nich přepsala, přestala by tahle vlastnost platit — a doklad
        // o tom, s čím kdo souhlasil, by byl k ničemu.
        Assert.StartsWith(Souhlas.ZneniV1, Souhlas.ZneniV2, StringComparison.Ordinal);
        Assert.StartsWith(Souhlas.ZneniV2, Souhlas.ZneniV3, StringComparison.Ordinal);
    }

    [Fact]
    public void VerzeTriNesePodminkyUcasti()
    {
        // Kolize 2 oponentury: čísla VMP a technického průkazu se sbírat
        // nebudou, takže to musí říct text — vypsání ty doklady žádá.
        Assert.Contains("vůdce malého plavidla", Souhlas.ZneniV3, StringComparison.Ordinal);
        Assert.Contains("technický průkaz", Souhlas.ZneniV3, StringComparison.Ordinal);
        Assert.Contains("pojištění", Souhlas.ZneniV3, StringComparison.Ordinal);
    }

    [Fact]
    public void StarsiVerzePodminkyUcastiNepotvrzuji()
    {
        // Věcný rozdíl, kvůli kterému se verzuje: kdo se přihlásil dřív,
        // o dokladech nepotvrdil nic.
        Assert.DoesNotContain("vůdce malého plavidla", Souhlas.ZneniV1, StringComparison.Ordinal);
        Assert.DoesNotContain("vůdce malého plavidla", Souhlas.ZneniV2, StringComparison.Ordinal);
        // A lodě s verzí 1 nesouhlasily ani se sledováním.
        Assert.DoesNotContain("poloha lodi", Souhlas.ZneniV1, StringComparison.Ordinal);
    }

    [Fact]
    public void HlaskaOChybejicimSouhlasuJmenujeVsechno()
    {
        // Hláška je to, co člověk uvidí, když zaškrtávátko mine. Vyjmenovat
        // v ní méně, než se sbírá, je totéž jako sbírat něco mlčky.
        Assert.Contains("pravidly", Souhlas.Chybi, StringComparison.Ordinal);
        Assert.Contains("vlastní nebezpečí", Souhlas.Chybi, StringComparison.Ordinal);
        Assert.Contains("polohy", Souhlas.Chybi, StringComparison.Ordinal);
        Assert.Contains("podmínek účasti", Souhlas.Chybi, StringComparison.Ordinal);
    }
}
