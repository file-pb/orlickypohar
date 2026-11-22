using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Trasy;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Potvrzení smazání účtu a mez, po které se mažou trasy. <b>Čisté funkce</b>,
/// bez databáze — a schválně: tohle jsou dvě pravidla, která musí držet i na
/// stroji, kde integrační testy nejedou.
/// </summary>
public class SmazaniUctuTests
{
    [Fact]
    public void Presne_opsane_slovo_projde()
    {
        Assert.Null(Potvrzeni.ProcNejde("SMAZAT"));
    }

    [Fact]
    public void Okraje_se_zahazuji()
    {
        // Mezera navíc je nehoda opisování, ne nerozhodnost.
        Assert.Null(Potvrzeni.ProcNejde("  SMAZAT "));
        Assert.Null(Potvrzeni.ProcNejde("\tSMAZAT\n"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("smazat")]
    [InlineData("Smazat")]
    [InlineData("SMAZAT ÚČET")]
    [InlineData("ano")]
    public void Cokoliv_jineho_neprojde(string? potvrzeni)
    {
        // Velikost písmen se schválně nepromíjí: nevratná věc stojí za
        // přesné opsání, a kdo napsal „smazat", psal z hlavy, ne z obrazovky.
        Assert.NotNull(Potvrzeni.ProcNejde(potvrzeni));
    }

    [Fact]
    public void Hlaska_rika_co_opsat()
    {
        // Hláška jde na obrazovku, takže musí nést to slovo — „neplatné
        // potvrzení" pošle člověka hledat, co se po něm vlastně chce.
        Assert.Contains(Potvrzeni.Slovo, Potvrzeni.ProcNejde("ne"));
    }
}

/// <summary>
/// Mez, za kterou se zaznamenané trasy neuchovávají. <b>Tatáž jako u kontaktů
/// kapitánů</b> — jeden důvod, jedno pravidlo.
/// </summary>
public class UklidTrasTests
{
    [Fact]
    public void Trasa_vydrzi_celou_nasledujici_sezonu()
    {
        // Záznam z července 2026 musí být v prosinci 2027 ještě na světě:
        // podklad k protestu má přežít do dalšího ročníku.
        var hranice = Retence.SmazatStarsiNez(new DateTimeOffset(2027, 12, 31, 23, 0, 0, TimeSpan.Zero));
        Assert.True(new DateTimeOffset(2026, 7, 10, 12, 0, 0, TimeSpan.Zero) >= hranice);
    }

    [Fact]
    public void Prvniho_ledna_pak_zmizi()
    {
        var hranice = Retence.SmazatStarsiNez(new DateTimeOffset(2028, 1, 1, 0, 0, 0, TimeSpan.Zero));
        Assert.True(new DateTimeOffset(2026, 7, 10, 12, 0, 0, TimeSpan.Zero) < hranice);
    }

    [Fact]
    public void Mez_je_tataz_jako_u_kontaktu()
    {
        // Kdyby se ty dvě lhůty rozešly, byly by v zásadách dvě data a nikdo
        // by si je nespojil. Tenhle test je tu proto, aby se rozejít nemohly.
        var ted = new DateTimeOffset(2027, 6, 1, 8, 30, 0, TimeSpan.Zero);
        Assert.Equal(
            OrlickyPohar.Api.Features.Lode.Kontakty.SmazatStarsiNez(ted),
            Retence.SmazatStarsiNez(ted));
    }

    [Fact]
    public void Mez_je_v_UTC()
    {
        // Npgsql odmítne zapsat `DateTimeOffset` s jiným posunem než nula,
        // a tahle hodnota jde do dotazu nad `timestamp with time zone`.
        Assert.Equal(TimeSpan.Zero, Retence.SmazatStarsiNez(DateTimeOffset.Now).Offset);
    }
}
