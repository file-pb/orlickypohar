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
/// Strop zakládání účtů. <b>Čistá funkce</b> — a je to brzda proti zátěži,
/// takže musí držet i na stroji, kde integrační testy nejedou.
/// </summary>
public class StropUctuTests
{
    [Fact]
    public void Pod_oba_limity_se_zaklada()
    {
        Assert.Null(StropUctu.ProcNezalozit(zivych: 42, zaDnes: 3, nejvic: 500, zaDen: 20));
    }

    [Fact]
    public void Strop_zivych_uctu_zastavi_zakladani()
    {
        var proc = StropUctu.ProcNezalozit(zivych: 500, zaDnes: 0, nejvic: 500, zaDen: 20);

        Assert.NotNull(proc);
        // Hláška jde do odpovědi i do logu, takže musí nést číslo — „nelze
        // založit účet" pošle člověka hledat příčinu do databáze.
        Assert.Contains("500", proc);
    }

    [Fact]
    public void Denni_rozpocet_zastavi_kolotoc()
    {
        // Smazaný účet zůstává jako náhrobek a další přihlášení založí nový
        // řádek. Bez denního rozpočtu by jeden účet u poskytovatele nafukoval
        // tabulku bez konce — strop živých účtů na to nestačí, protože
        // náhrobky se do něj nepočítají.
        var proc = StropUctu.ProcNezalozit(zivych: 10, zaDnes: 20, nejvic: 500, zaDen: 20);

        Assert.NotNull(proc);
        Assert.Contains("20", proc);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Nula_nebo_min_znamena_bez_limitu(int limit)
    {
        // Vypnout se to musí dát jedním číslem v proměnné, ne zásahem do kódu
        // — kdyby projekt vyrostl přes noc, není čas na nasazení.
        Assert.Null(StropUctu.ProcNezalozit(zivych: 10_000, zaDnes: 0, nejvic: limit, zaDen: 20));
        Assert.Null(StropUctu.ProcNezalozit(zivych: 0, zaDnes: 10_000, nejvic: 500, zaDen: limit));
    }

    [Fact]
    public void Pocatek_dne_je_v_UTC()
    {
        // Porovnává se se `ZalozenV`, a to je UTC — Npgsql jiný posun do
        // `timestamp with time zone` nezapíše.
        var odPolnoci = StropUctu.OdPolnoci(new DateTimeOffset(2026, 11, 22, 23, 45, 0, TimeSpan.FromHours(2)));

        Assert.Equal(TimeSpan.Zero, odPolnoci.Offset);
        Assert.Equal(new DateTimeOffset(2026, 11, 22, 0, 0, 0, TimeSpan.Zero), odPolnoci);
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
