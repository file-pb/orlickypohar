using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Sprava;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla udělování rolí. Bez databáze, ze stejného důvodu jako
/// <see cref="PravaTests"/>.
/// <para>
/// Nejcennější je tu <b>bootstrap</b>: je to jediná cesta, jak se dostat
/// dovnitř bez role, takže musí být přesně tak úzká, jak se o ní píše —
/// a hlavně se musí sama zavřít.
/// </para>
/// </summary>
public class UdeleniTests
{
    [Theory]
    [InlineData(Role.Editor)]
    [InlineData(Role.Spravce)]
    public void Na_web_jde_udelit_editor_a_spravce(Role role) =>
        Assert.Null(Udeleni.ProcNejdeNaWebu(role));

    [Theory]
    [InlineData(Role.Ctenar)]
    [InlineData(Role.Rozhodci)]
    [InlineData(Role.Organizator)]
    public void Na_web_nejde_udelit_role_rocniku(Role role) =>
        Assert.NotNull(Udeleni.ProcNejdeNaWebu(role));

    [Fact]
    public void Bootstrap_se_po_prvnim_spravci_zavre()
    {
        // Dokud správce není, projde udělení správce na importní token.
        Assert.True(Udeleni.BootstrapProjde(maSerieSpravce: false, Role.Spravce, naZavod: false));

        // Jakmile jeden je, tahle cesta končí — i pro dalšího správce.
        Assert.False(Udeleni.BootstrapProjde(maSerieSpravce: true, Role.Spravce, naZavod: false));
    }

    [Theory]
    [InlineData(Role.Editor)]
    [InlineData(Role.Organizator)]
    [InlineData(Role.Rozhodci)]
    public void Bootstrapem_projde_jen_spravce(Role role)
    {
        // Kdyby prošla kterákoliv role, byl by importní token univerzálním
        // klíčem k prázdné sérii — a ta je prázdná pokaždé, dokud nemá
        // správce, tedy i po smazání posledního.
        Assert.False(Udeleni.BootstrapProjde(maSerieSpravce: false, role, naZavod: false));
    }

    [Fact]
    public void Bootstrapem_nejde_udelit_pravo_na_jednu_zastavku()
    {
        // Správce je vždycky správcem ročníku. Zastávkový by navíc nesplnil
        // podmínku „série už má správce", takže by bootstrap zůstal otevřený.
        Assert.False(Udeleni.BootstrapProjde(maSerieSpravce: false, Role.Spravce, naZavod: true));
    }

    [Fact]
    public void Ctenar_se_neudeluje()
    {
        // Čtenář je každý, i nepřihlášený. Řádek v tabulce by sliboval, že
        // se dá odebrat.
        Assert.NotNull(Udeleni.ProcNejde(Role.Ctenar, naZavod: false));
        Assert.NotNull(Udeleni.ProcNejde(Role.Ctenar, naZavod: true));
    }

    [Theory]
    [InlineData(Role.Rozhodci)]
    [InlineData(Role.Spravce)]
    public void Rozhodci_ani_spravce_nejsou_role_jedne_zastavky(Role role)
    {
        Assert.Null(Udeleni.ProcNejde(role, naZavod: false));
        Assert.NotNull(Udeleni.ProcNejde(role, naZavod: true));
    }

    [Theory]
    [InlineData(Role.Editor)]
    [InlineData(Role.Organizator)]
    public void Rozhodci_prirazuje_poradatele_a_editora_zastavce(Role role)
    {
        // Zadáno: rozhodčí přiřazuje pořadatele a editora konkrétní zastávce.
        Assert.True(Udeleni.RozhodciSmiUdelit(role, naZavod: true));

        // Na celý ročník ne — to je rozsah, který uděluje správce.
        Assert.False(Udeleni.RozhodciSmiUdelit(role, naZavod: false));
    }

    [Theory]
    [InlineData(Role.Rozhodci)]
    [InlineData(Role.Spravce)]
    [InlineData(Role.Ctenar)]
    public void Rozhodci_si_nerozsiri_vlastni_rozsah(Role role)
    {
        Assert.False(Udeleni.RozhodciSmiUdelit(role, naZavod: true));
        Assert.False(Udeleni.RozhodciSmiUdelit(role, naZavod: false));
    }

    [Theory]
    [InlineData(Role.Editor)]
    [InlineData(Role.Organizator)]
    public void Editor_a_organizator_jdou_na_rocnik_i_na_zastavku(Role role)
    {
        // Organizátor celého ročníku může to samé na kterékoliv jeho
        // zastávce, organizátor jedné zastávky jen na ní.
        Assert.Null(Udeleni.ProcNejde(role, naZavod: false));
        Assert.Null(Udeleni.ProcNejde(role, naZavod: true));
    }
}
