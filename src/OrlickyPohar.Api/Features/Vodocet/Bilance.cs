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

    /// <summary>
    /// Nejdelší díra, kterou okno <paramref name="okno"/> snese.
    /// <para>
    /// <b>Hodina platí jen pro den.</b> Historie se s věkem prořeďuje
    /// (<see cref="Prorideni"/>), takže u delších oken jsou vzorky po
    /// hodinách až dnech — s pevnou hodinou by bilance za dva týdny vyšla
    /// vždycky jako „nespočítáno", i když data v pořádku jsou.
    /// </para>
    /// <para>
    /// Padesátina okna je zvolená tak, aby ji nejhrubší pásmo prořeďování
    /// s rezervou podlezlo: u dvou týdnů vyjde 6,7 h proti kroku 2 h, u roku
    /// 7,3 dne proti kroku 1 den. Zároveň je to pořád dost přísné na to,
    /// aby výpadek sběru přes půl okna číslo zahodil.
    /// </para>
    /// </summary>
    public static TimeSpan Tolerance(TimeSpan okno) =>
        okno <= Okno ? NejdelsiMezera : TimeSpan.FromTicks(Math.Max(okno.Ticks / 50, NejdelsiMezera.Ticks));

    /// <summary>
    /// Objem, který proteče za <paramref name="okno"/> před
    /// <paramref name="konec"/>, v m³ — lichoběžníky mezi sousedními
    /// měřeními. <c>null</c>, když sběr okno nepokrývá nebo v něm má díru
    /// delší, než <see cref="Tolerance"/> dovolí.
    /// <para>
    /// <b>Proč nejde použít `OdtokZaDen` i pro delší okna:</b> ten bere
    /// jen měření v celou hodinu a každé počítá za celou hodinu, což sedí
    /// na hodinovou řadu Povodí za poslední den. Ve starší historii jsou
    /// vzorky po dvou hodinách i po dnech, takže by se většina zahodila
    /// a zbytek počítal za špatně dlouhé úseky.
    /// </para>
    /// </summary>
    public static double? ProtekloZa(
        IEnumerable<MereniNadrze> mereni, DateTimeOffset konec, TimeSpan okno,
        Func<MereniNadrze, decimal?> hodnota)
    {
        var tolerance = Tolerance(okno);
        var zacatek = konec - okno;
        var body = mereni
            .Where(m => hodnota(m) is not null && m.Cas <= konec)
            .OrderBy(m => m.Cas)
            .Select(m => (m.Cas, Q: (double)hodnota(m)!.Value))
            .ToList();

        var predOknem = body.FindLastIndex(b => b.Cas <= zacatek);
        if (predOknem < 0) return null;

        body = body[predOknem..];
        if (body[^1].Cas < konec - tolerance) return null;

        double objem = 0;
        for (var i = 1; i < body.Count; i++)
        {
            var (t0, q0) = body[i - 1];
            var (t1, q1) = body[i];
            if (t1 - t0 > tolerance) return null;

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

    /// <summary>Jak se za okno změnil objem nádrže, v m³. Z měřených objemů.</summary>
    public static double? ZmenaObjemuZa(
        IEnumerable<MereniNadrze> mereni, DateTimeOffset konec, TimeSpan okno)
    {
        var tolerance = Tolerance(okno);
        var s = mereni.Where(m => m.Objem is not null && m.Cas <= konec).ToList();
        if (s.Count == 0) return null;

        var posledni = s.MaxBy(m => m.Cas)!;
        if (posledni.Cas < konec - tolerance) return null;

        var zacatek = posledni.Cas - okno;
        var prvni = s.MinBy(m => (m.Cas - zacatek).Duration())!;
        if ((prvni.Cas - zacatek).Duration() > tolerance) return null;

        return (double)(posledni.Objem!.Value - prvni.Objem!.Value) * 1_000_000;
    }

    /// <summary>
    /// O kolik centimetrů se za okno změnila hladina. Hladinu má každý
    /// řádek, takže tohle vyjde i tam, kde se průtoky spočítat nedají.
    /// <para>
    /// <b>Měří se od hrany okna, ne od prvního měření v něm</b> — stejně
    /// jako změna objemu. Napsané naopak to dávalo dvě čísla, která si
    /// protiřečila: za tři dny vycházelo −8 cm a k tomu změna objemu
    /// −1,66 mil. m³, zatímco osmi centimetrům odpovídá −1,9 (plocha
    /// nádrže vyjde z naměřených 24 h na 23,7 km²). Rozdíl dělalo to, že
    /// hladina začínala až u prvního bodu uvnitř okna, kdežto objem
    /// u bodu nejbližšího jeho hraně — a v řídké historii je mezi nimi
    /// klidně půl dne.
    /// </para>
    /// </summary>
    public static int? ZmenaHladinyCm(
        IEnumerable<MereniNadrze> mereni, DateTimeOffset konec, TimeSpan okno)
    {
        var tolerance = Tolerance(okno);
        var s = mereni.Where(m => m.Cas <= konec).ToList();
        if (s.Count < 2) return null;

        var posledni = s.MaxBy(m => m.Cas)!;
        if (posledni.Cas < konec - tolerance) return null;

        var zacatek = posledni.Cas - okno;
        var prvni = s.MinBy(m => (m.Cas - zacatek).Duration())!;
        if ((prvni.Cas - zacatek).Duration() > tolerance) return null;
        if (prvni.Cas == posledni.Cas) return null;

        return (int)Math.Round((posledni.Hladina - prvni.Hladina) * 100);
    }
}
