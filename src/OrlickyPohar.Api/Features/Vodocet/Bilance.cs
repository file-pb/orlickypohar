namespace OrlickyPohar.Api.Features.Vodocet;

/// <summary>
/// Kolik vody za posledních 24 h přiteklo a odteklo. Čisté funkce nad
/// uloženými měřeními, bez databáze.
/// <para>
/// <b>Obojí se počítá z řady, nikdy okamžitá hodnota krát den</b> (Filip,
/// 16. 9. 2026). Každé číslo ale z jiné řady, protože se jinak chovají:
/// </para>
/// <list type="bullet">
/// <item><b>Odtok</b> je nárazový — elektrárna pouští stovky m³/s pár hodin
/// denně. Sčítá se hodinová řada Povodí, kde je každá hodina zastoupená;
/// vzorek po deseti minutách by špičku mohl minout i zdvojit.</item>
/// <item><b>Přítok</b> je řeka a mění se plynule. Povodí ho po hodinách
/// nevydává, takže se integruje z vlastního sběru po deseti minutách
/// (lichoběžníky mezi sousedními měřeními).</item>
/// </list>
/// </summary>
public static class Bilance
{
    public static readonly TimeSpan Okno = TimeSpan.FromHours(24);

    /// <summary>Delší díra ve sběru znamená, že číslo by bylo vymyšlené.</summary>
    public static readonly TimeSpan NejdelsiMezera = TimeSpan.FromHours(1);

    /// <summary>Hodin v hodinové řadě, pod které se odtok nepočítá.</summary>
    public const int NejmeneHodin = 20;

    /// <summary>
    /// Přítok za 24 h před <paramref name="konec"/>, v m³. <c>null</c>, dokud
    /// sběr nepokrývá celé okno nebo v něm má díru delší než hodinu.
    /// <para>
    /// Začátek okna leží obvykle mezi dvěma měřeními; hodnota se tam dopočítá
    /// přímkou, aby okno mělo přesně 24 h a ne „od prvního měření v něm".
    /// </para>
    /// </summary>
    public static double? PritokZaDen(IEnumerable<MereniNadrze> mereni, DateTimeOffset konec)
    {
        var zacatek = konec - Okno;
        var body = mereni
            .Where(m => m.Pritok is not null && m.Cas <= konec)
            .OrderBy(m => m.Cas)
            .Select(m => (m.Cas, Q: (double)m.Pritok!.Value))
            .ToList();

        var predOknem = body.FindLastIndex(b => b.Cas <= zacatek);
        if (predOknem < 0) return null;

        body = body[predOknem..];
        if (body[^1].Cas < konec - NejdelsiMezera) return null;

        double objem = 0;
        for (var i = 1; i < body.Count; i++)
        {
            var (t0, q0) = body[i - 1];
            var (t1, q1) = body[i];
            if (t1 - t0 > NejdelsiMezera) return null;

            // Úsek, který začíná před oknem, se ořízne na jeho začátek.
            if (t0 < zacatek)
            {
                var podil = (zacatek - t0) / (t1 - t0);
                q0 += (q1 - q0) * podil;
                t0 = zacatek;
            }

            objem += (q0 + q1) / 2 * (t1 - t0).TotalSeconds;
        }

        return objem;
    }

    /// <summary>
    /// Odtok za 24 h před <paramref name="konec"/>, v m³, z hodinové řady.
    /// Bere se jen měření v celou hodinu, každé za celou hodinu; chybějící
    /// hodiny se doplní průměrem ostatních. Pod 20 hodin je řada děravá
    /// a vrací se <c>null</c>.
    /// </summary>
    public static double? OdtokZaDen(IEnumerable<MereniNadrze> mereni, DateTimeOffset konec)
    {
        var hodiny = mereni
            .Where(m => m.Odtok is not null && m.Cas.Minute == 0
                        && m.Cas > konec - Okno && m.Cas <= konec)
            .Select(m => (double)m.Odtok!.Value)
            .ToList();

        if (hodiny.Count < NejmeneHodin) return null;
        return hodiny.Average() * Okno.TotalSeconds;
    }

    /// <summary>
    /// Jak se za 24 h změnil objem nádrže, v m³ — přímo z údaje Povodí, ne
    /// z rozdílu přítoku a odtoku. Slouží jako kontrola: obě čísla by se
    /// měla zhruba potkat. Hledá měření nejblíž začátku okna, nejvýš hodinu
    /// od něj.
    /// </summary>
    public static double? ZmenaObjemu(IEnumerable<MereniNadrze> mereni, DateTimeOffset konec)
    {
        var s = mereni.Where(m => m.Objem is not null && m.Cas <= konec).ToList();
        if (s.Count == 0) return null;

        var posledni = s.MaxBy(m => m.Cas)!;
        if (posledni.Cas < konec - NejdelsiMezera) return null;

        var zacatek = posledni.Cas - Okno;
        var prvni = s.MinBy(m => (m.Cas - zacatek).Duration())!;
        if ((prvni.Cas - zacatek).Duration() > NejdelsiMezera) return null;

        // Objem je v milionech m³.
        return (double)(posledni.Objem!.Value - prvni.Objem!.Value) * 1_000_000;
    }
}
