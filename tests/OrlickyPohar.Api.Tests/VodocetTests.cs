using OrlickyPohar.Api.Features.Vodocet;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Vodočet Orlíku: rozbor stránky Povodí Vltavy a přítok a odtok za den.
/// Stránka je uložená kopie z 16. 9. 2026 (<c>data/pvl</c>).
/// </summary>
public class VodocetTests
{
    private static readonly DateTimeOffset Konec = new(2026, 9, 16, 12, 0, 0, TimeSpan.Zero);

    private static StrankaPvl Stranka() =>
        Pvl.Rozeber(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Data", "pvl-orlik.html")))
        ?? throw new InvalidOperationException("Uložená stránka se nepřečetla.");

    [Fact]
    public void Aktualni_hodnoty_se_prectou_i_s_casem_v_UTC()
    {
        var a = Stranka().Aktualni;

        // Na stránce 16.09.2026 23:10 pražského letního času.
        Assert.Equal(new DateTimeOffset(2026, 9, 16, 21, 10, 0, TimeSpan.Zero), a.Cas);
        Assert.Equal(334.69m, a.Hladina);
        Assert.Equal(345.40m, a.Objem);
        Assert.Equal(14.33m, a.Pritok);
        Assert.Equal(0m, a.Odtok);
    }

    [Fact]
    public void Rada_ma_hladinu_a_odtok_od_nejstarsiho()
    {
        var rada = Stranka().Rada;

        Assert.Equal(31, rada.Count);
        Assert.True(rada.Zip(rada.Skip(1)).All(p => p.First.Cas < p.Second.Cas));
        Assert.All(rada, m => Assert.Null(m.Pritok));
        Assert.Contains(rada, m => m.Odtok > 100);
    }

    [Fact]
    public void Odtok_za_den_je_soucet_hodinove_rady()
    {
        var s = Stranka();
        var mereni = s.Rada.Select(m => new MereniNadrze { Cas = m.Cas, Hladina = m.Hladina, Odtok = m.Odtok });

        // 24 hodinových hodnot 16. 9., dohromady 484,99 m³/s, každá za hodinu.
        Assert.Equal(484.99 * 3600, Bilance.OdtokZaDen(mereni, s.Aktualni.Cas)!.Value, 1);
    }

    [Theory]
    [InlineData("16.09.2026 23:10", "2026-09-16T21:10:00Z")]
    [InlineData("16.12.2026 23:10", "2026-12-16T22:10:00Z")]
    // Jarní posun: 2:30 neexistuje, bere se 3:30 letního času.
    [InlineData("29.03.2026 02:30", "2026-03-29T01:30:00Z")]
    // Podzimní posun: 2:30 je dvakrát, bere se první (letní čas).
    [InlineData("25.10.2026 02:30", "2026-10-25T00:30:00Z")]
    public void Prazsky_cas_na_UTC(string text, string utc)
    {
        Assert.Equal(DateTimeOffset.Parse(utc), Pvl.Cas(text));
    }

    [Fact]
    public void Stranka_jineho_tvaru_se_neprecte()
    {
        Assert.Null(Pvl.Rozeber("<html><body><table><tr><td>Údržba</td></tr></table></body></html>"));
    }

    private static List<MereniNadrze> Pritoky(TimeSpan krok, TimeSpan delka, Func<int, decimal> q)
    {
        var n = (int)(delka / krok);
        return [.. Enumerable.Range(0, n + 1).Select(i => new MereniNadrze
        {
            Cas = Konec - delka + krok * i,
            Hladina = 334m,
            Pritok = q(i),
        })];
    }

    [Fact]
    public void Staly_pritok_za_den_je_prutok_krat_den()
    {
        // Jediný případ, kdy „krát 86 400" platí — a výpočet ho musí potkat.
        var mereni = Pritoky(TimeSpan.FromMinutes(10), TimeSpan.FromHours(25), _ => 14.33m);

        Assert.Equal(14.33 * 86_400, Bilance.PritokZaDen(mereni, Konec)!.Value, 1);
    }

    [Fact]
    public void Menici_se_pritok_se_integruje()
    {
        // Za 24 h stoupne rovnoměrně z 10 na 34 m³/s: průměr je 22.
        var mereni = Pritoky(TimeSpan.FromMinutes(10), TimeSpan.FromHours(24), i => 10m + i / 6m);

        Assert.Equal(22.0 * 86_400, Bilance.PritokZaDen(mereni, Konec)!.Value, 0);
    }

    [Fact]
    public void Okno_zacina_presne_24_h_pred_koncem()
    {
        // Měření po 40 minutách: začátek okna padne mezi dvě a dopočítá se.
        // Den s přítokem 10 a hodina navíc s přítokem 1000 nesmí nic přidat.
        var mereni = Pritoky(TimeSpan.FromMinutes(40), TimeSpan.FromHours(26), _ => 10m);
        foreach (var m in mereni.Where(m => m.Cas < Konec - TimeSpan.FromHours(25))) m.Pritok = 1000m;

        Assert.Equal(10.0 * 86_400, Bilance.PritokZaDen(mereni, Konec)!.Value, 1);
    }

    [Fact]
    public void Bez_celeho_dne_sberu_pritok_neni()
    {
        var mereni = Pritoky(TimeSpan.FromMinutes(10), TimeSpan.FromHours(23), _ => 14m);

        Assert.Null(Bilance.PritokZaDen(mereni, Konec));
    }

    [Fact]
    public void Dira_ve_sberu_delsi_nez_hodina_pritok_zrusi()
    {
        var mereni = Pritoky(TimeSpan.FromMinutes(10), TimeSpan.FromHours(25), _ => 14m);
        mereni.RemoveAll(m => m.Cas > Konec.AddHours(-10) && m.Cas < Konec.AddHours(-8));

        Assert.Null(Bilance.PritokZaDen(mereni, Konec));
    }

    [Fact]
    public void Odtok_s_malo_hodinami_neni()
    {
        var mereni = Enumerable.Range(0, 19).Select(i => new MereniNadrze
        {
            Cas = Konec.AddHours(-i), Hladina = 334m, Odtok = 100m,
        });

        Assert.Null(Bilance.OdtokZaDen(mereni, Konec));
    }

    [Fact]
    public void Zmena_objemu_je_rozdil_proti_mereni_pred_dnem()
    {
        var mereni = new[]
        {
            new MereniNadrze { Cas = Konec.AddHours(-24).AddMinutes(10), Hladina = 334.76m, Objem = 347.18m },
            new MereniNadrze { Cas = Konec.AddHours(-12), Hladina = 334.70m, Objem = 346m },
            new MereniNadrze { Cas = Konec, Hladina = 334.66m, Objem = 345.40m },
        };

        Assert.Equal(-1_780_000, Bilance.ZmenaObjemu(mereni, Konec)!.Value, 0);
    }
}
