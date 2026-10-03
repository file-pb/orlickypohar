using System.Text;
using OrlickyPohar.Api.Features.Smernice;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla vyvěšení plachetní směrnice. Čisté funkce — bez databáze
/// a bez úložiště.
/// </summary>
public class SmerniceTests
{
    private static byte[] Soubor(string zacatek) => Encoding.ASCII.GetBytes(zacatek);

    [Fact]
    public void Pdf_se_pozna_podle_obsahu()
    {
        // Koncovka ani typ hlášený prohlížečem nic nedokazují: na vývěsce
        // nesmí viset soubor, který se jen tváří jako směrnice.
        Assert.True(Vyveseni.JePdf(Soubor("%PDF-1.7\n…")));
        Assert.False(Vyveseni.JePdf(Soubor("PK\u0003\u0004")));   // .docx
        Assert.False(Vyveseni.JePdf(Soubor("<html>")));
        Assert.False(Vyveseni.JePdf([]));
        Assert.False(Vyveseni.JePdf(Soubor("%PD")));
    }

    [Fact]
    public void Prazdny_soubor_nebo_moc_velky_neprojde()
    {
        Assert.Equal("Vyber soubor se směrnicí.", Vyveseni.ProcNejde(0, "smernice.pdf", null));
        Assert.NotNull(Vyveseni.ProcNejde(Vyveseni.NejvicBajtu + 1, "smernice.pdf", null));
        Assert.Null(Vyveseni.ProcNejde(1024, "smernice.pdf", null));
    }

    [Fact]
    public void Dlouhe_jmeno_a_poznamka_neprojdou()
    {
        Assert.NotNull(Vyveseni.ProcNejde(1024, new string('a', Vyveseni.NazevNejvic + 1), null));
        Assert.NotNull(Vyveseni.ProcNejde(1024, "smernice.pdf", new string('a', Vyveseni.PoznamkaNejvic + 1)));
    }

    [Fact]
    public void Klic_drzi_smernice_stranou_od_fotek()
    {
        var id = Guid.CreateVersion7();

        // Tři předpony, tři různé životnosti: fotky zůstávají, přejaté mizí
        // s článkem, směrnice se nemaže nikdy.
        Assert.StartsWith("smernice/", Vyveseni.Klic(id));
        Assert.EndsWith(".pdf", Vyveseni.Klic(id));
    }

    [Fact]
    public void Dto_bez_verejne_adresy_nevznikne()
    {
        var smernice = new PlachetniSmernice
        {
            Id = Guid.CreateVersion7(),
            ZavodId = 1,
            Verze = 2,
            Nazev = "smernice-v2.pdf",
            VyveseneV = DateTimeOffset.UnixEpoch,
        };

        // Bez adresy úložiště by vznikl odkaz, pod kterým nic není —
        // u dokumentu, podle kterého se jede, horší než chybějící řádek.
        Assert.Null(Vyveseni.Dto(smernice, null));

        var dto = Vyveseni.Dto(smernice, "https://fotky.test/");
        Assert.NotNull(dto);
        Assert.Equal(2, dto.Verze);
        Assert.Equal($"https://fotky.test/{Vyveseni.Klic(smernice.Id)}", dto.Adresa);
    }
}
