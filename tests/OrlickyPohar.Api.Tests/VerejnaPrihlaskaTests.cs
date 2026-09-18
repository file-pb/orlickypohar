using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla veřejné přihlášky. Čisté funkce, bez databáze.
/// </summary>
public class VerejnaPrihlaskaTests
{
    private static readonly DateTimeOffset Ted = new(2026, 9, 18, 10, 0, 0, TimeSpan.Zero);

    private static VerejnaPrihlaskaVstup Vstup(
        string lod = "ANIČKA", string? email = "kapitan@example.cz", string? telefon = null,
        bool souhlas = true, string? past = null, DateTimeOffset? zobrazeno = null) =>
        new(lod, new KapitanVstup("Jan", "Novák", email, telefon), Souhlas: souhlas, Past: past,
            ZobrazenoV: zobrazeno ?? Ted.AddMinutes(-2));

    [Fact]
    public void Vyplnena_prihlaska_projde()
    {
        Assert.Null(VerejnaPrihlaska.ProcNejde(Vstup(), Ted));
    }

    [Fact]
    public void Bez_kontaktu_to_nejde()
    {
        // Pořadatel se musí mít jak ozvat, když něco chybí.
        Assert.NotNull(VerejnaPrihlaska.ProcNejde(Vstup(email: null), Ted));
        Assert.Null(VerejnaPrihlaska.ProcNejde(Vstup(email: null, telefon: "777 123 456"), Ted));
    }

    [Fact]
    public void Bez_souhlasu_to_nejde()
    {
        Assert.NotNull(VerejnaPrihlaska.ProcNejde(Vstup(souhlas: false), Ted));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Bez_jmena_lodi_to_nejde(string lod)
    {
        Assert.NotNull(VerejnaPrihlaska.ProcNejde(Vstup(lod), Ted));
    }

    [Fact]
    public void Vyplnena_past_vypada_jako_obecna_chyba()
    {
        // Robotovi se nemá říkat, na čem pohořel.
        Assert.Equal(VerejnaPrihlaska.Robot, VerejnaPrihlaska.ProcNejde(Vstup(past: "https://spam"), Ted));
    }

    [Fact]
    public void Odeslani_do_tri_vterin_je_stroj()
    {
        Assert.Equal(VerejnaPrihlaska.Robot,
            VerejnaPrihlaska.ProcNejde(Vstup(zobrazeno: Ted.AddSeconds(-1)), Ted));

        // Kdo si formulář otevřel a přemýšlel, projde.
        Assert.Null(VerejnaPrihlaska.ProcNejde(Vstup(zobrazeno: Ted.AddSeconds(-30)), Ted));
    }

    [Fact]
    public void Bez_casu_otevreni_se_prihlaska_neodmita()
    {
        // Pole může chybět (jiný klient než náš web); past a moderace zbývají.
        Assert.Null(VerejnaPrihlaska.ProcNejde(
            Vstup() with { ZobrazenoV = null }, Ted));
    }

    [Fact]
    public void Dlouhe_texty_neprojdou()
    {
        Assert.NotNull(VerejnaPrihlaska.ProcNejde(
            Vstup() with { Posadka = new string('x', VerejnaPrihlaska.PosadkaNejvic + 1) }, Ted));
        Assert.NotNull(VerejnaPrihlaska.ProcNejde(
            Vstup() with { Poznamka = new string('x', VerejnaPrihlaska.PoznamkaNejvic + 1) }, Ted));
        Assert.NotNull(VerejnaPrihlaska.ProcNejde(
            Vstup() with { Kapitan = new KapitanVstup("Jan", "Novák", "kapitan@example.cz", null, new string('1', 21)) },
            Ted));
    }
}
