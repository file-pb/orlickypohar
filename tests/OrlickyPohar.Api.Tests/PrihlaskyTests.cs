using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Přihlášky lodí na zastávku. Čisté funkce, bez databáze.
/// </summary>
public class PrihlaskyTests
{
    private static NovaLodVstup Lod(
        string nazev = "ANIČKA", string kategorie = "Race",
        string jmeno = "Jan", string prijmeni = "Novák",
        string? plachta = null, string? typ = null) =>
        new(nazev, kategorie, jmeno, prijmeni, plachta, typ);

    [Theory]
    [InlineData(StavZavodu.Vypsany)]
    [InlineData(StavZavodu.Odjety)]
    public void Prihlasuje_se_od_vypsani(StavZavodu stav)
    {
        // Po odjetí se přihlášky dál opravují — kdo přijel, se ví až večer.
        Assert.Null(Prihlasky.ProcNejdeNaZavod(stav));
    }

    [Theory]
    [InlineData(StavZavodu.Planovany)]
    [InlineData(StavZavodu.Potvrzeny)]
    [InlineData(StavZavodu.Zruseny)]
    public void Na_nevypsanou_a_zrusenou_zastavku_se_neprihlasuje(StavZavodu stav)
    {
        Assert.NotNull(Prihlasky.ProcNejdeNaZavod(stav));
    }

    [Fact]
    public void Do_rozpravy_vede_listinu_poradatel()
    {
        // Beze změny proti dřívějšku: rozhodčí jen vylučuje.
        Assert.Null(Prihlasky.ProcNejdeDoListiny(poRozprave: false, Prihlasky.Kdo.Poradatel));
        Assert.NotNull(Prihlasky.ProcNejdeDoListiny(poRozprave: false, Prihlasky.Kdo.Rozhodci));
    }

    [Fact]
    public void Po_rozprave_vede_listinu_rozhodci()
    {
        // Filip, 7. 11. 2026: *„listina po rozpravě uzamčená pro všechny
        // kromě rozhodčího."* Je to **výměna**, ne přidání práva — proto se
        // ověřuje obojí najednou, jinak by test prošel i tomu, kdo by
        // rozhodčímu přidal a pořadateli zapomněl vzít.
        Assert.NotNull(Prihlasky.ProcNejdeDoListiny(poRozprave: true, Prihlasky.Kdo.Poradatel));
        Assert.Null(Prihlasky.ProcNejdeDoListiny(poRozprave: true, Prihlasky.Kdo.Rozhodci));
    }

    [Theory]
    [InlineData(StavUcasti.Prihlasena, StavUcasti.Potvrzena)]
    [InlineData(StavUcasti.Potvrzena, StavUcasti.Zrusena)]
    [InlineData(StavUcasti.Prihlasena, StavUcasti.Nedostavila)]
    public void Po_rozprave_poradatel_stav_neprepne_a_rozhodci_ano(StavUcasti ze, StavUcasti na)
    {
        Assert.NotNull(Prihlasky.ProcNejdePrepnout(
            ze, na, maVysledky: false, Prihlasky.Kdo.Poradatel, poRozprave: true));
        Assert.Null(Prihlasky.ProcNejdePrepnout(
            ze, na, maVysledky: false, Prihlasky.Kdo.Rozhodci, poRozprave: true));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Vylouceni_je_rozhodciho_pred_rozpravou_i_po_ni(bool poRozprave)
    {
        // Vyloučení není vedení listiny, ale rozhodnutí o lodi — zámek
        // rozpravy se ho proto nesmí dotknout ani v jednom směru.
        Assert.Null(Prihlasky.ProcNejdePrepnout(
            StavUcasti.Potvrzena, StavUcasti.Vyloucena, maVysledky: false,
            Prihlasky.Kdo.Rozhodci, poRozprave));
        Assert.NotNull(Prihlasky.ProcNejdePrepnout(
            StavUcasti.Potvrzena, StavUcasti.Vyloucena, maVysledky: false,
            Prihlasky.Kdo.Poradatel, poRozprave));
    }

    [Fact]
    public void Po_rozprave_nenabizi_poradateli_nabidka_nic()
    {
        // Obrazovka se ptá `MozneZ`, zápis `ProcNejdePrepnout`. Kdyby si
        // ty dvě odpovídaly jinak, pořadatel by dostal tlačítka, po kterých
        // přijde „nemáš práva" — proto to hlídá vlastní test.
        Assert.Empty(Prihlasky.MozneZ(
            StavUcasti.Prihlasena, maVysledky: false, Prihlasky.Kdo.Poradatel, poRozprave: true));
        Assert.NotEmpty(Prihlasky.MozneZ(
            StavUcasti.Prihlasena, maVysledky: false, Prihlasky.Kdo.Rozhodci, poRozprave: true));
    }

    [Fact]
    public void Lod_s_vysledky_zrusit_nejde()
    {
        // Zmizela by ze seznamu, a výsledky by přitom dál platily.
        Assert.NotNull(Prihlasky.ProcNejdePrepnout(StavUcasti.Potvrzena, StavUcasti.Zrusena, maVysledky: true));
        Assert.Null(Prihlasky.ProcNejdePrepnout(StavUcasti.Potvrzena, StavUcasti.Zrusena, maVysledky: false));
    }

    [Theory]
    [InlineData(StavUcasti.Prihlasena, StavUcasti.Potvrzena)]
    [InlineData(StavUcasti.Potvrzena, StavUcasti.Prihlasena)]
    [InlineData(StavUcasti.Zrusena, StavUcasti.Prihlasena)]
    [InlineData(StavUcasti.Zrusena, StavUcasti.Potvrzena)]
    public void Prepnout_jde_obema_smery(StavUcasti ze, StavUcasti na)
    {
        // Překlep se musí dát vzít zpět.
        Assert.Null(Prihlasky.ProcNejdePrepnout(ze, na, maVysledky: false));
    }

    [Fact]
    public void Nabidka_nenese_soucasny_stav_ani_zakazane_zruseni()
    {
        var mozne = Prihlasky.MozneZ(StavUcasti.Potvrzena, maVysledky: true).ToList();

        Assert.Equal(new[] { StavUcasti.Prihlasena }, mozne);
    }

    [Fact]
    public void Uplna_nova_lod_projde()
    {
        Assert.Null(Prihlasky.ProcNejdeNovaLod(Lod(plachta: "CZE 430", typ: "Pirát")));
    }

    [Theory]
    [InlineData("", "Race", "Jan", "Novák")]
    [InlineData("ANIČKA", "", "Jan", "Novák")]
    [InlineData("ANIČKA", "Race", "", "Novák")]
    [InlineData("ANIČKA", "Race", "Jan", " ")]
    public void Nova_lod_bez_nazvu_kategorie_nebo_majitele_neprojde(
        string nazev, string kategorie, string jmeno, string prijmeni)
    {
        // Majitel stojí ve výsledcích vedle lodi — bez něj by řádek zůstal
        // napůl prázdný.
        Assert.NotNull(Prihlasky.ProcNejdeNovaLod(Lod(nazev, kategorie, jmeno, prijmeni)));
    }

    [Fact]
    public void Delky_hlida_pred_databazi()
    {
        // Databáze by delší text odmítla až při uložení, hláškou, které
        // pořadatel nerozumí.
        Assert.NotNull(Prihlasky.ProcNejdeNovaLod(Lod(nazev: new string('A', 121))));
        Assert.NotNull(Prihlasky.ProcNejdeNovaLod(Lod(plachta: new string('1', 21))));
        Assert.NotNull(Prihlasky.ProcNejdeNovaLod(Lod(jmeno: new string('J', 81))));
    }
}
