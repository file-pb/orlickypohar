namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Protestní časový limit (ZPJ 60.3(b)) — <b>jediný kus protestů, který do
/// plánu patří</b>.
///
/// <para>
/// <b>Protesty jako celek se nestaví.</b> Je to velká věc s vlastním
/// rozhodnutím: pohár není pod svazem, takže odvolání k ČSJ odpadá a
/// protestní komise by byla poslední instancí. Nález K2 proto končí jinde —
/// u <b>věty, kterou aplikace u podpisu říká</b>, a ta se opravila
/// 28. 10. 2026. Co zbylo, je tohle: *„případně u rozjížďky hlídat protestní
/// limit, protože na to aplikace data má."*
/// </para>
///
/// <para>
/// <b>Data na to má jediná ze všech.</b> Čas dojezdu poslední lodi je
/// v <c>Vysledek.DojezdV</c> — tedy přesně to, od čeho pravidlo limit
/// odvozuje:
/// </para>
///
/// <blockquote>
/// ZPJ 60.3(b): protestní časový limit je <i>„pro protesty, které byly
/// pozorovány v závodním prostoru, dvě hodiny poté co poslední loď
/// dokončí"</i>.
/// </blockquote>
///
/// <para>
/// <b>Neuplynulý limit nic nezamyká</b> a zamykat nemá. Aplikace neví, že
/// nějaký protest visí — nemá kam ho zapsat —, takže by zamykala podle
/// hodin, ne podle skutečnosti: na regatě, kde nikdo neprotestoval a
/// všichni chtějí domů, by držela podpis dvě hodiny pro nic. A jestli má
/// aplikace podpis nepustit, nebo jen napsat, je <b>otevřená otázka na
/// rozhodčího</b>; dokud na ni neodpověděl, je napsat to méně škodlivá
/// odpověď než zamknout.
/// </para>
///
/// <para>
/// Dvouhodinová lhůta je <b>výchozí</b>: plachetní směrnice si ji může
/// vypsat jinak (ZPJ 60.3(b) to předpokládá). Dnes ji poháru nikde
/// nepřepisujeme, takže tu stojí jako konstanta — a až se to stane, mění se
/// jedno místo.
/// </para>
/// </summary>
public static class Protesty
{
    /// <summary>Dvě hodiny po dojezdu poslední lodi (ZPJ 60.3(b)).</summary>
    public static readonly TimeSpan Lhuta = TimeSpan.FromHours(2);

    /// <summary>
    /// Kdy limit končí. <c>null</c>, když ještě žádná loď nedokončila —
    /// pak není od čeho měřit a limit neexistuje, ne že už uplynul.
    /// </summary>
    public static DateTimeOffset? Limit(DateTimeOffset? posledniDojezd) =>
        posledniDojezd is { } kdy ? kdy + Lhuta : null;

    /// <summary>
    /// Uplynul už limit? <c>false</c> i tehdy, když limit vůbec není —
    /// z neznámého času se nedá tvrdit, že lhůta prošla.
    /// </summary>
    public static bool Uplynul(DateTimeOffset? posledniDojezd, DateTimeOffset ted) =>
        Limit(posledniDojezd) is { } limit && ted >= limit;

    /// <summary>
    /// Proč nejde podepsat pořadí — nebo <c>null</c>.
    ///
    /// <para>
    /// <b>Od 22. 11. 2026 lhůta podpis drží</b> (Filip: *„dvě hodiny jsou
    /// v poho, klidně"*). Do té doby to byla jen věta na obrazovce, a stálo
    /// u ní, že aplikace o protestech neví, takže nehlídá. Pořád o nich
    /// neví — tohle nehlídá, že je čisto, hlídá jen to, že lhůta na podání
    /// uplynula. Rozhodčí tím nedostane jistotu, dostane čas.
    /// </para>
    /// <para>
    /// <b>Rozjížďka, ze které nikdo nedokončil, nečeká.</b> Lhůta se měří
    /// od dojezdu poslední lodi; bez dojezdu není od čeho měřit, a držet
    /// podpis donekonečna by znamenalo, že se zrušená rozjížďka nedá
    /// zavřít. Je to tentýž důvod, proč <see cref="Uplynul"/> u neznámého
    /// času vrací <c>false</c>, jen obrácený: tam se netvrdí, že prošla,
    /// tady se netvrdí, že běží.
    /// </para>
    /// </summary>
    public static string? ProcNejdePodepsat(DateTimeOffset? posledniDojezd, DateTimeOffset ted)
    {
        if (Limit(posledniDojezd) is not { } limit || ted >= limit) return null;

        var zbyva = limit - ted;
        var minut = (int)Math.Ceiling(zbyva.TotalMinutes);
        return $"Protestní lhůta běží ještě {minut} min, do "
               + $"{TimeZoneInfo.ConvertTime(limit, Praha):HH:mm}. "
               + "Podepsat jde, až uplyne (ZPJ 60.3(b)).";
    }

    /// <summary>
    /// Čas se píše v čase Orlíku, ne serveru. Server jede v UTC
    /// (`deploy/docker-compose.yml` žádné <c>TZ</c> nenastavuje), takže by
    /// hláška v létě ukazovala o dvě hodiny dřív — tutéž past měl web
    /// u zobrazení limitu.
    /// </summary>
    private static readonly TimeZoneInfo Praha =
        TimeZoneInfo.FindSystemTimeZoneById("Europe/Prague");
}
