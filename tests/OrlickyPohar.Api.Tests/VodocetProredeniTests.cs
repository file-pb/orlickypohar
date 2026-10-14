using OrlickyPohar.Api.Features.Vodocet;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Prořeďování historie vodočtu a strop na počet bodů.
/// <para>
/// <b>Proč zrovna tohle:</b> je to jediné místo, kde se dá splést, který
/// vzorek zůstane — a chyba by se poznala až na grafu za měsíc, kdy už
/// smazaná data nejsou.
/// </para>
/// </summary>
public class VodocetProredeniTests
{
    private static readonly DateTimeOffset Nyni = new(2026, 10, 15, 12, 0, 0, TimeSpan.Zero);

    /// <summary>Řada po deseti minutách, jak ji dává sběr.</summary>
    private static List<DateTimeOffset> Rada(TimeSpan odStari, TimeSpan doStari) =>
        [.. Enumerable
            .Range(0, (int)((odStari - doStari).TotalMinutes / 10))
            .Select(i => Nyni - odStari + TimeSpan.FromMinutes(10 * i))];

    [Fact]
    public void Poslednich_24_h_zustane_cele()
    {
        var casy = Rada(TimeSpan.FromHours(24), TimeSpan.Zero);

        Assert.Empty(Prorideni.KeSmazani(casy, Nyni));
    }

    [Fact]
    public void Druhy_a_treti_den_zridne_na_pulhodiny()
    {
        var casy = Rada(TimeSpan.FromDays(3), TimeSpan.FromDays(1));
        var zbyde = casy.Count - Prorideni.KeSmazani(casy, Nyni).Count;

        // Dva dny po půlhodině.
        Assert.Equal(2 * 48, zbyde);
    }

    [Fact]
    public void Starsi_nez_ctrnact_dnu_zridne_na_dve_hodiny()
    {
        var casy = Rada(TimeSpan.FromDays(20), TimeSpan.FromDays(15));
        var zbyde = casy.Count - Prorideni.KeSmazani(casy, Nyni).Count;

        // Pět dnů po dvou hodinách.
        Assert.Equal(5 * 12, zbyde);
    }

    [Fact]
    public void Zustava_prvni_vzorek_v_kroku_at_uklid_bezi_kdykoli()
    {
        var casy = Rada(TimeSpan.FromDays(3), TimeSpan.FromDays(1));
        var smazat = Prorideni.KeSmazani(casy, Nyni).ToHashSet();
        var zbyle = casy.Where(c => !smazat.Contains(c)).OrderBy(c => c).ToList();

        // Každý zbylý vzorek sedí na celou nebo na půl hodiny — to je ta
        // vlastnost, kvůli které se seskupuje po kroku a ne „každý n-tý".
        Assert.All(zbyle, c => Assert.True(c.Minute % 30 == 0, $"{c:HH:mm} nesedí na půlhodinu"));
    }

    [Fact]
    public void Prorideni_nesahne_na_to_co_uz_je_ridke()
    {
        // Denní vzorky starší tří měsíců: krok pásma je taky den, takže
        // druhý průchod nesmí smazat nic.
        var casy = Enumerable.Range(0, 100)
            .Select(i => Nyni - TimeSpan.FromDays(100 - i))
            .ToList();

        Assert.Empty(Prorideni.KeSmazani(casy, Nyni).Where(c => c < Nyni - TimeSpan.FromDays(90)));
    }

    [Fact]
    public void Strop_nechava_prvni_i_posledni_bod()
    {
        var body = Enumerable.Range(0, 1250).Select(i => new BodHladinyDto(
            Nyni - TimeSpan.FromMinutes(10 * (1250 - i)), 334 + i * 0.001m)).ToList();

        var vybrane = RozsahyGrafu.NaStrop(body);

        Assert.True(vybrane.Count <= RozsahyGrafu.NejvicBodu + 1);
        Assert.Equal(body[0], vybrane[0]);
        Assert.Equal(body[^1], vybrane[^1]);
    }

    [Fact]
    public void Nabizi_se_jen_rozsahy_pro_ktere_jsou_data()
    {
        // Pět dnů sběru: den a tři dny ano, rok ne.
        var dostupne = RozsahyGrafu.Dostupne(Nyni - TimeSpan.FromDays(5), Nyni);

        Assert.Contains("24h", dostupne);
        Assert.Contains("3d", dostupne);
        Assert.DoesNotContain("3m", dostupne);
        Assert.DoesNotContain("1r", dostupne);
    }

    [Fact]
    public void Bez_jedineho_mereni_se_nenabizi_nic()
    {
        Assert.Empty(RozsahyGrafu.Dostupne(null, Nyni));
    }
}
