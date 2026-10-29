namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// <b>Kdy loď protla cílovou čáru</b> — podle stopy, kterou poslal její
/// telefon. Čisté funkce, bez databáze.
///
/// <para>
/// <b>Proč to vzniklo</b> (nález R33 oponentury rozhodčího). Rozhodčí
/// u cíle chce *„ruční průjezd i přepsání toho, co určilo trasování"*:
/// klepnutí palcem je přesné na vteřiny, stopa na desetiny — ale jen
/// člověk pozná, která loď to byla, a jen on ví, jestli dojela.
/// <b>Trasování proto navrhuje, nerozhoduje.</b>
/// </para>
///
/// <para>
/// <b>Směr rozhoduje, ne jen protnutí.</b> U Orlíku leží cíl na startu
/// (změřeno 0 m mezi nimi), takže každá loď tou čarou projede hned na
/// začátku rozjížďky — opačným směrem. Bez směru by trasování hlásilo
/// dojezd celému poli ve chvíli startu.
/// </para>
///
/// <para>
/// <b>Počítá se v rovině, ne na kouli.</b> Cílová čára je dlouhá desítky
/// metrů a celý výpočet se odehrává v jejím okolí; zakřivení Země je tam
/// o řády menší než přesnost GPS, kterou telefon hlásí v metrech.
/// Rovinný průsečík je proto přesnější, než na co má vstup — a dá se
/// spočítat a ověřit bez knihovny.
/// </para>
/// </summary>
public static class CilZTrasovani
{
    /// <summary>Bod na vodě ve stupních.</summary>
    public readonly record struct Misto(double Sirka, double Delka);

    /// <summary>Jeden bod stopy: kde telefon byl a kdy.</summary>
    public readonly record struct BodStopy(Misto Kde, DateTimeOffset Kdy);

    /// <summary>
    /// Kolik metrů měří stupeň zeměpisné šířky. Pro délku se násobí
    /// kosinem šířky — na Orlíku (49,5° s. š.) je stupeň délky zhruba
    /// o třetinu kratší, a bez toho by čára byla pootočená.
    /// </summary>
    private const double MetruNaStupen = 111_320.0;

    /// <summary>Rovinné souřadnice v metrech vůči vztažnému bodu.</summary>
    private static (double X, double Y) DoRoviny(Misto m, Misto stred) =>
        ((m.Delka - stred.Delka) * MetruNaStupen * Math.Cos(stred.Sirka * Math.PI / 180.0),
         (m.Sirka - stred.Sirka) * MetruNaStupen);

    /// <summary>
    /// Na které straně čáry <c>a–b</c> bod leží. Znaménko je to, co nás
    /// zajímá; velikost je dvojnásobek plochy trojúhelníku.
    /// </summary>
    private static double Strana(
        (double X, double Y) a, (double X, double Y) b, (double X, double Y) p) =>
        (b.X - a.X) * (p.Y - a.Y) - (b.Y - a.Y) * (p.X - a.X);

    /// <summary>
    /// <b>Poslední průjezd cílem ve směru do cíle</b>, nebo <c>null</c>.
    /// </summary>
    /// <param name="stopa">Body stopy v čase vzestupně.</param>
    /// <param name="cilA">Jeden konec cílové čáry.</param>
    /// <param name="cilB">Druhý konec.</param>
    /// <param name="zTrati">
    /// Bod na té straně čáry, ze které se do cíle přijíždí — obvykle
    /// předchozí prvek trati. Z něj plyne směr: loď musí být před
    /// průjezdem na jeho straně a po něm na druhé.
    /// </param>
    /// <param name="neDriv">
    /// Nejdřívější okamžik, který se počítá — čas startu. Průjezdy před
    /// ním patří jiné rozjížďce.
    /// </param>
    /// <returns>
    /// <b>Poslední</b> takový průjezd. Trať se může k cíli vracet
    /// (u Orlíku leží cíl na startu), takže dřívější protnutí správným
    /// směrem je průjezd brankou, ne dojezd — a dojezd je ten poslední.
    /// Kdy se na něj smí spolehnout, rozhoduje rozhodčí.
    /// </returns>
    public static DateTimeOffset? Posledni(
        IReadOnlyList<BodStopy> stopa,
        Misto cilA,
        Misto cilB,
        Misto zTrati,
        DateTimeOffset? neDriv = null)
    {
        if (stopa.Count < 2) return null;

        var a = DoRoviny(cilA, cilA);
        var b = DoRoviny(cilB, cilA);

        // Nulová čára není čára: dvě bóje na jednom místě (nebo jedna
        // zadaná dvakrát) by dělily rovinu na nic a každý bod by byl „na
        // obou stranách".
        var delkaCary = Math.Sqrt((b.X - a.X) * (b.X - a.X) + (b.Y - a.Y) * (b.Y - a.Y));
        if (delkaCary < 1e-6) return null;

        var odkud = Strana(a, b, DoRoviny(zTrati, cilA));
        if (odkud == 0) return null; // Předchozí prvek leží na čáře; směr z něj nevyjde.

        DateTimeOffset? nalezeno = null;

        for (var i = 1; i < stopa.Count; i++)
        {
            var p1 = DoRoviny(stopa[i - 1].Kde, cilA);
            var p2 = DoRoviny(stopa[i].Kde, cilA);

            var s1 = Strana(a, b, p1);
            var s2 = Strana(a, b, p2);

            // Bod přesně na čáře nerozhoduje; rozhodne až ten další.
            if (s1 == 0 || s2 == 0) continue;

            // Směr: z té strany, odkud se přijíždí, na druhou.
            if (Math.Sign(s1) != Math.Sign(odkud) || Math.Sign(s2) == Math.Sign(odkud)) continue;

            // Kde na úseku stopy padne protnutí. `s1 - s2` nemůže být nula:
            // znaménka se liší a ani jedno není nula.
            var podil = s1 / (s1 - s2);
            var prusecikX = p1.X + podil * (p2.X - p1.X);
            var prusecikY = p1.Y + podil * (p2.Y - p1.Y);

            // <b>Mimo čáru to není dojezd.</b> Loď, která obeplula konec
            // cílové čáry, cílem neprojela — čára končí u bóje.
            var u = ((prusecikX - a.X) * (b.X - a.X) + (prusecikY - a.Y) * (b.Y - a.Y))
                    / (delkaCary * delkaCary);
            if (u < 0 || u > 1) continue;

            var kdy = stopa[i - 1].Kdy
                      + TimeSpan.FromTicks((long)((stopa[i].Kdy - stopa[i - 1].Kdy).Ticks * podil));

            if (neDriv is { } mez && kdy < mez) continue;

            nalezeno = kdy;
        }

        return nalezeno;
    }
}
