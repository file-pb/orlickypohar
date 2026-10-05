using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla kapitánství. Čisté funkce, takže bez databáze a bez Dockeru —
/// a to je schválně: ptá se na ně každá změna pravomoci u lodi.
/// </summary>
public class KapitanstviTests
{
    [Fact]
    public void Kod_nedela_kapitana_nikdy()
    {
        // Celý nález A stojí a padá na téhle jedné hodnotě: dokud ji kód
        // uděloval podle pořadí, rozhodovalo o pravomoci, kdo byl první
        // na telefonu.
        Assert.Equal(RoleKLodi.Posadka, Kody.RoleProNoveho);
    }

    [Theory]
    [InlineData(RoleKLodi.Majitel, true)]
    [InlineData(RoleKLodi.Kapitan, true)]
    [InlineData(RoleKLodi.Posadka, false)]
    [InlineData(RoleKLodi.Fanousek, false)]
    public void Odpovedny_je_majitel_a_kapitan(RoleKLodi role, bool ceka)
        => Assert.Equal(ceka, Kapitanstvi.Odpovedny(role));

    [Fact]
    public void Posledniho_kapitana_snizit_nejde()
    {
        var chyba = Kapitanstvi.ProcNejdeZmenit(
            RoleKLodi.Kapitan, RoleKLodi.Posadka, jinychOdpovednych: 0);

        Assert.Equal(Kapitanstvi.PosledniOdpovedny, chyba);
    }

    [Fact]
    public void Kapitana_snizit_jde_kdyz_je_jiny()
        => Assert.Null(Kapitanstvi.ProcNejdeZmenit(
            RoleKLodi.Kapitan, RoleKLodi.Posadka, jinychOdpovednych: 1));

    [Fact]
    public void Posledniho_kapitana_odebrat_nejde()
        => Assert.Equal(
            Kapitanstvi.PosledniOdpovedny,
            Kapitanstvi.ProcNejdeOdebrat(RoleKLodi.Kapitan, jinychOdpovednych: 0));

    [Fact]
    public void Posadku_odebrat_jde_i_kdyz_lod_kapitana_nema()
        => Assert.Null(Kapitanstvi.ProcNejdeOdebrat(RoleKLodi.Posadka, jinychOdpovednych: 0));

    [Fact]
    public void Majitele_obrazovkou_nastavit_nejde()
    {
        // Vlastnictví je fakt o ročníku, ne role k rozdělení. Kdyby šlo
        // nastavit tudy, rozešlo by se s přihláškou.
        var chyba = Kapitanstvi.ProcNejdeZmenit(
            RoleKLodi.Posadka, RoleKLodi.Majitel, jinychOdpovednych: 1);

        Assert.Equal(Kapitanstvi.MajitelNeniRole, chyba);
    }

    [Fact]
    public void Potvrzeni_stejne_role_neni_chyba()
    {
        // Tímhle správce potvrzuje kapitány z doby před opravou: role se
        // nemění, mění se to, že za ni od teď někdo stojí.
        Assert.Null(Kapitanstvi.ProcNejdeZmenit(
            RoleKLodi.Kapitan, RoleKLodi.Kapitan, jinychOdpovednych: 0));
    }

    [Fact]
    public void Prevod_snizi_kapitana_majitele_nechava()
    {
        Assert.Equal(RoleKLodi.Posadka, Kapitanstvi.PriPrevodu(RoleKLodi.Kapitan));
        Assert.Null(Kapitanstvi.PriPrevodu(RoleKLodi.Majitel));
        Assert.Null(Kapitanstvi.PriPrevodu(RoleKLodi.Posadka));
    }

    [Fact]
    public void Ke_kontrole_je_kapitan_od_kodu_bez_potvrzeni()
    {
        Assert.True(Kapitanstvi.KeKontrole(RoleKLodi.Kapitan, PuvodVazby.Kod, urcenaRucne: false));
        // Potvrzený už ne — to je přesně ten rozdíl, který obrazovka ukazuje.
        Assert.False(Kapitanstvi.KeKontrole(RoleKLodi.Kapitan, PuvodVazby.Kod, urcenaRucne: true));
        // Posádka od kódu je normální stav, ne práce pro správce.
        Assert.False(Kapitanstvi.KeKontrole(RoleKLodi.Posadka, PuvodVazby.Kod, urcenaRucne: false));
        // Majitel z párování podle e-mailu stojí na datech ročníku.
        Assert.False(Kapitanstvi.KeKontrole(RoleKLodi.Majitel, PuvodVazby.Email, urcenaRucne: false));
    }
}
