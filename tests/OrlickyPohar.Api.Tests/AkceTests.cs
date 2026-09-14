using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Komunitní akce v kalendáři. Čisté pravidlo, bez databáze — co s akcí
/// dělá zbytek aplikace, zkouší <see cref="AkceSpravaTests"/>.
/// </summary>
public class AkceTests
{
    [Fact]
    public void Akce_nema_nic_z_toho_co_patri_poharu()
    {
        Assert.NotNull(Kalendar.ProcNejdePoharove(DruhZastavky.Akce));
        Assert.Null(Kalendar.ProcNejdePoharove(DruhZastavky.Pohar));
    }

    [Fact]
    public void Starsi_soubor_i_nova_zastavka_jsou_pohar()
    {
        // Výchozí druh je pohár všude, kde se zastávka rodí: v entitě,
        // v importu i v kalendáři. Jinak by starší soubor přinesl akce.
        Assert.Equal(DruhZastavky.Pohar, new Zavod { Nazev = "x", Slug = "x" }.Druh);
        Assert.Equal(DruhZastavky.Pohar, new ZastavkaVstup("x", new DateOnly(2026, 5, 1)).Druh);
    }
}
