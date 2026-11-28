namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// <b>Kdy regatu zavře server sám.</b>
///
/// <para>
/// <b>Zadání</b> (Filip, 21. 11. 2026, odpověď na otázku „kde a jak se má
/// regata uzavřít"): *„úkon, který na konci dne uděláme; pokud na to
/// zapomeneme, tak ho udělej za dva dny sám."* Úkon sám existuje — je to
/// posun zastávky z <c>Vypsany</c> na <c>Odjety</c> (<see cref="Kalendar"/>).
/// Nová je jen ta druhá půlka: co se nestalo rukou, stane se po dvou dnech.
/// </para>
///
/// <para>
/// <b>Automat zavírá, nepodepisuje.</b> Podmínka, kterou si rozhodčí klade
/// před uznáním výsledků — *„protesty a tresty jsou vyřešené a nikdo nic
/// nepodal"* —, je přesně to, co aplikace ověřit neumí (nález K2). Zavřením
/// regaty se tedy jen přestane čekat na další rozjížďky; zápisy zůstanou
/// tak podepsané nebo nepodepsané, jak jsou.
/// </para>
///
/// <para>
/// <b>Co se samo nezavře: regata, ve které se nic nejelo.</b>
/// <c>Odjety</c> znamená „jelo se", takže by robot tvrdil něco, co se
/// nestalo — a u regaty, která se nekonala a nikdo ji nezrušil, je to
/// tvrzení obzvlášť drahé: dostala by se do poháru jako odjetá bez
/// výsledků. Takovou nechá stát a rozhodne o ní člověk.
/// </para>
/// </summary>
public static class Uzavirani
{
    /// <summary>Jak dlouho se čeká na ruku, než to udělá server.</summary>
    public static readonly TimeSpan Lhuta = TimeSpan.FromDays(2);

    /// <summary>
    /// Od kdy se lhůta měří: od <b>pozdějšího</b> ze dvou konců — konce
    /// posledního okna závodního dne a konce posledního vypsaného dne.
    ///
    /// <para>
    /// <b>Proč pozdější z nich, a ne okno samo</b> (Filip, 22. 11. 2026:
    /// *„pohlídej past u dvojdenních regat, ten konec je na konci
    /// posledního dne"*): okno vzniká rozpravou, tedy jedno na každý den,
    /// který se doopravdy jel. U dvoudenní regaty, kde se první den jel
    /// a druhý teprve přijde, je posledním známým oknem to z prvního dne —
    /// a kdyby se podle něj měřilo, robot by regatu zavřel, zatímco se
    /// pořád jede. Vypsaný konec je naopak znám dopředu, takže drží dolní
    /// mez: dřív než dva dny po posledním vypsaném dni se nezavírá nikdy.
    /// </para>
    ///
    /// <para>
    /// <b>Okno přesto nejde vynechat.</b> Dvacetičtyřhodinovka má jeden
    /// závodní den, který přeteče do druhého kalendářního; její okno končí
    /// až za vypsaným dnem a tehdy rozhoduje ono.
    /// </para>
    ///
    /// <para>
    /// <b>A třetí konec: kdy regatu člověk vrátil mezi vypsané.</b> Kdo
    /// odjetou regatu otevřel znovu, udělal to kvůli něčemu — a robot,
    /// který ji do dne zavře zpátky, by jeho rozhodnutí přepsal dřív, než
    /// to něco stihne udělat. Hodiny proto jdou od posledního lidského
    /// rozhodnutí; viz <see cref="Zavod.VracenoMeziVypsaneV"/>.
    /// </para>
    /// </summary>
    public static DateTimeOffset Zacatek(
        DateTimeOffset? konecPoslednihoOkna, DateOnly datum, DateOnly? datumKonce,
        DateTimeOffset? vracenoMeziVypsaneV)
    {
        var vypsany = KonecVypsanehoDne(datumKonce ?? datum);
        var konec = konecPoslednihoOkna is { } okno && okno > vypsany ? okno : vypsany;
        return vracenoMeziVypsaneV is { } vraceno && vraceno > konec ? vraceno : konec;
    }

    /// <summary>
    /// Konec závodního dne podle kalendáře, tedy midnight na Orlíku — ne
    /// v UTC, ve kterém server běží. V letním čase je to o dvě hodiny
    /// dřív než půlnoc UTC a ta hodina rozhoduje o tom, který den se lhůta
    /// počítá.
    /// </summary>
    private static DateTimeOffset KonecVypsanehoDne(DateOnly den)
    {
        var pulnocPoKonci = den.AddDays(1).ToDateTime(TimeOnly.MinValue);
        return new DateTimeOffset(pulnocPoKonci, Praha.GetUtcOffset(pulnocPoKonci));
    }

    private static readonly TimeZoneInfo Praha =
        TimeZoneInfo.FindSystemTimeZoneById("Europe/Prague");

    /// <summary>
    /// Má se tahle regata zavřít sama? <c>true</c> jen pro vypsanou regatu,
    /// ve které se aspoň jedna rozjížďka dojela a od konce — nebo od
    /// chvíle, kdy ji člověk vrátil mezi vypsané — uplynula <see cref="Lhuta"/>.
    /// </summary>
    public static bool MaSeUzavrit(
        StavZavodu stav,
        bool maOdjetouRozjizdku,
        DateTimeOffset? konecPoslednihoOkna,
        DateOnly datum,
        DateOnly? datumKonce,
        DateTimeOffset? vracenoMeziVypsaneV,
        DateTimeOffset ted) =>
        stav == StavZavodu.Vypsany
        && maOdjetouRozjizdku
        && ted >= Zacatek(konecPoslednihoOkna, datum, datumKonce, vracenoMeziVypsaneV) + Lhuta;
}
