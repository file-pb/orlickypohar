using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Publika tokenu z konfigurace.
/// <para>
/// <b>Proč to má test:</b> jedno API obsluhuje víc klientů — web a od
/// 11. 10. 2026 appku — a poskytovatel dává každému token s jeho vlastním
/// <c>aud</c>. Když se seznam rozpadne (mezera navíc, prázdná položka),
/// projeví se to až jako 401 u jednoho klienta ze dvou a vypadá to jako
/// chyba přihlášení, ne konfigurace.
/// </para>
/// </summary>
public class PublikaTests
{
    [Fact]
    public void Jedna_hodnota_zustava_jednou_hodnotou()
    {
        Assert.Equal(["390035493066113030"], Poskytovatel.Publika("390035493066113030"));
    }

    [Fact]
    public void Carka_oddeluje_vic_klientu()
    {
        Assert.Equal(["web", "appka"], Poskytovatel.Publika("web,appka"));
    }

    [Fact]
    public void Mezery_okolo_carky_se_zahazuji()
    {
        Assert.Equal(["web", "appka"], Poskytovatel.Publika(" web , appka "));
    }

    [Fact]
    public void Prazdne_polozky_se_preskakuji()
    {
        Assert.Equal(["web"], Poskytovatel.Publika("web,,"));
    }

    [Fact]
    public void Nic_znamena_zadne_publikum()
    {
        Assert.Empty(Poskytovatel.Publika(null));
        Assert.Empty(Poskytovatel.Publika("  "));
    }
}
