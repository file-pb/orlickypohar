using OrlickyPohar.Api.Features.Boje;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla stavu trati. Čisté funkce, bez databáze — role a „odjelo se podle
/// ní" patří <see cref="TratSprava"/>.
/// </summary>
public class TratTests
{
    [Theory]
    [InlineData(StavTrati.Rozestaveno)]
    [InlineData(StavTrati.Prestavba)]
    public void Hotovo_jde_z_rozestavene_i_z_prestavby(StavTrati stav)
    {
        Assert.Null(Stavba.ProcNejdeHotovo(stav));
    }

    [Fact]
    public void Hotovo_nejde_z_prijate_trati()
    {
        // Tohle je ten zámek: dokud rozhodčí nepustí, nic se nemění.
        Assert.NotNull(Stavba.ProcNejdeHotovo(StavTrati.Prijato));
    }

    [Fact]
    public void Prijmout_jde_jen_to_co_ceka()
    {
        Assert.Null(Stavba.ProcNejdePrijmout(StavTrati.Hotovo));
        Assert.NotNull(Stavba.ProcNejdePrijmout(StavTrati.Rozestaveno));
        Assert.NotNull(Stavba.ProcNejdePrijmout(StavTrati.Prestavba));
        Assert.NotNull(Stavba.ProcNejdePrijmout(StavTrati.Prijato));
    }

    [Fact]
    public void Vratit_bez_duvodu_nejde()
    {
        // Vrácení bez důvodu je jen „ne" a stavitelé nevědí, co dodělat —
        // tatáž úvaha jako u revize výsledků a u stažení směrnice.
        Assert.NotNull(Stavba.ProcNejdeVratit(StavTrati.Hotovo, null));
        Assert.NotNull(Stavba.ProcNejdeVratit(StavTrati.Hotovo, "   "));
        Assert.Null(Stavba.ProcNejdeVratit(StavTrati.Hotovo, " chybí cílová bóje "));
    }

    [Fact]
    public void Vratit_jde_jen_z_hotova()
    {
        Assert.NotNull(Stavba.ProcNejdeVratit(StavTrati.Rozestaveno, "proč"));
        Assert.NotNull(Stavba.ProcNejdeVratit(StavTrati.Prijato, "proč"));
    }

    [Fact]
    public void Dlouhy_duvod_neprojde()
    {
        var dlouhy = new string('a', Stavba.DuvodNejvic + 1);
        Assert.NotNull(Stavba.ProcNejdeVratit(StavTrati.Hotovo, dlouhy));
        Assert.Null(Stavba.ProcNejdeVratit(StavTrati.Hotovo, dlouhy[..Stavba.DuvodNejvic]));
    }

    [Fact]
    public void Prestavet_jde_jen_prijatou()
    {
        Assert.Null(Stavba.ProcNejdePrestavba(StavTrati.Prijato));
        Assert.NotNull(Stavba.ProcNejdePrestavba(StavTrati.Rozestaveno));
        Assert.NotNull(Stavba.ProcNejdePrestavba(StavTrati.Hotovo));
        Assert.NotNull(Stavba.ProcNejdePrestavba(StavTrati.Prestavba));
    }

    [Fact]
    public void Verejne_je_jen_prijata_a_prestavba()
    {
        // Pojistka na to, co se smí ukázat divákům. Rozestavěná trať veřejně
        // neexistuje; přestavba ano, protože „počkej" je taky informace —
        // tiché zmizení vypadá jako chyba a starý obrázek lže.
        Assert.True(Stavba.JeVerejna(StavTrati.Prijato));
        Assert.True(Stavba.JeVerejna(StavTrati.Prestavba));
        Assert.False(Stavba.JeVerejna(StavTrati.Rozestaveno));
        Assert.False(Stavba.JeVerejna(StavTrati.Hotovo));
    }
}
