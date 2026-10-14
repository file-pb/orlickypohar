namespace OrlickyPohar.Api.Features.Vodocet;

/// <summary>
/// Jak hustě se měření drží podle stáří (Filip, 15. 10. 2026: *„můžeme to
/// promazávat, abychom jak se prodlužuje interval drželi jen podíl dat…
/// ze třech měsíců nepotřebuji držet každou hodinu"*).
/// <para>
/// <b>Proč vůbec:</b> sběr dává 144 řádků denně, tedy 52 560 za rok.
/// Prořeďováním se v ustáleném stavu drží <b>1 212 řádků</b> — o 97,7 %
/// míň. Graf tím zároveň nepotřebuje agregaci při čtení: body jsou
/// prořídlé už v databázi.
/// </para>
/// <para>
/// <b>Ponechává se vzorek, nepočítá se průměr.</b> Denní průměr je údaj,
/// který nikdo nenaměřil, a hladina nádrže se mění pomalu — jeden skutečný
/// vzorek na den dá na ročním grafu stejnou křivku a nic si nevymýšlí.
/// Ponechává se <b>první měření v pásmu</b>, ne poslední ani prostřední:
/// je to jediná volba, která nezávisí na tom, kdy úklid běžel.
/// </para>
/// </summary>
public static class Prorideni
{
    /// <summary>
    /// Pásmo: od jakého stáří se řídne a na jakou hustotu. Řadí se od
    /// nejmladšího; co je mladší než první pásmo, zůstává tak, jak přišlo.
    /// </summary>
    public readonly record struct Pasmo(TimeSpan Od, TimeSpan Krok);

    /// <summary>
    /// Pásma. <b>Hustota klesá plynule</b>, ne jedním skokem (Filip,
    /// 15. 10. 2026: *„jak se prodlužuje interval, držet jen podíl dat"*):
    /// posledních 24 h celé, pak postupně řidčeji.
    /// <para>
    /// <b>Krok v každém dalším pásmu naroste</b> (Filip: *„14 dní každý
    /// druhý pryč a tak to postupně odmazávat"*), takže hustota neklesá
    /// skokem, ale po stupních. V ustáleném stavu to dá <b>1 212 řádků</b>
    /// za rok místo 52 560 — o 97,7 % míň a tabulka přestane růst úplně.
    /// (Spočítáno na řadě po deseti minutách za 365 dnů; testy ověřují
    /// jednotlivá pásma.)
    /// </para>
    /// <para>
    /// <b>Seskupuje se po kroku, ne „každý n-tý".</b> Vyjde to skoro
    /// nastejno, ale krok nezávisí na tom, jestli v řadě nějaké měření
    /// chybí — po výpadku Povodí by „každý třetí" posunul mřížku a vzorky
    /// by přestaly sedět na celé hodiny.
    /// </para>
    /// </summary>
    public static readonly IReadOnlyList<Pasmo> Pasma =
    [
        new(TimeSpan.FromDays(1), TimeSpan.FromMinutes(30)),
        new(TimeSpan.FromDays(3), TimeSpan.FromHours(1)),
        new(TimeSpan.FromDays(14), TimeSpan.FromHours(2)),
        new(TimeSpan.FromDays(30), TimeSpan.FromHours(6)),
        new(TimeSpan.FromDays(90), TimeSpan.FromDays(1)),
    ];

    /// <summary>
    /// Časy, které se mají z daných měření smazat, aby v každém kroku
    /// pásma zbyl jeden vzorek.
    /// <para>
    /// Čistá funkce schválně: tohle je to, co se dá otestovat bez
    /// databáze, a zároveň to jediné, kde se dá splést, který vzorek
    /// zůstane.
    /// </para>
    /// </summary>
    public static IReadOnlyList<DateTimeOffset> KeSmazani(
        IEnumerable<DateTimeOffset> casy, DateTimeOffset nyni)
    {
        var smazat = new List<DateTimeOffset>();

        foreach (var pasmo in Pasma)
        {
            // Horní hranice pásma je začátek toho dalšího — bez ní by
            // hustší pásmo přepsalo řidší a ze tří dnů by zbyl jeden bod.
            var mladsiNez = nyni - pasmo.Od;
            var starsiNez = Pasma
                .Where(p => p.Od > pasmo.Od)
                .Select(p => (DateTimeOffset?)(nyni - p.Od))
                .FirstOrDefault();

            var vPasmu = casy
                .Where(c => c < mladsiNez && (starsiNez is null || c >= starsiNez.Value))
                .OrderBy(c => c)
                .ToList();

            // Seskupení podle kroku. Klíč je pořadové číslo kroku od epochy,
            // takže hranice nezávisí na tom, kdy úklid běžel.
            var tiky = pasmo.Krok.Ticks;
            foreach (var skupina in vPasmu.GroupBy(c => c.UtcTicks / tiky))
                smazat.AddRange(skupina.Skip(1));
        }

        return smazat;
    }
}
