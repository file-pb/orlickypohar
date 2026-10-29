namespace OrlickyPohar.Api.Features.Spolecne;

/// <summary>
/// Kdy se věc doopravdy stala, když ji klient poslal se zpožděním.
///
/// <para>
/// <b>Proč to existuje.</b> Appka u vody ztratí signál a úkon podrží, než
/// bude kam ho odeslat. Serverový čas zápisu je pak čas, kdy telefon chytil
/// síť — ne čas, kdy rozhodčí klepl. U trestu uděleného ve 14:12 a odeslaného
/// ve 14:31 je to devatenáct minut rozdílu v záznamu, který někdo může
/// zpochybnit. Plán to vede jako podmínku pro appku od 8. 10. 2026, ne jako
/// podrobnost.
/// </para>
///
/// <para>
/// <b>Proč se čas z telefonu nebere naslepo.</b> Jsou to cizí hodiny.
/// Telefon s ručně přenastaveným datem, po výměně baterie nebo se
/// zapomenutým cestovním pásmem pošle hodnotu, která by tiše přepsala
/// pravdu — a protože se zapisuje jednou a čte potom, nikdo by si toho
/// nevšiml. Proto se přijímá jen čas v okně kolem serverového; mimo ně
/// platí server a <see cref="Posun"/> řekne proč.
/// </para>
/// </summary>
public static class CasKlienta
{
    /// <summary>
    /// Dopředu se tolerují dvě minuty: tolik se běžně rozchází hodiny,
    /// které se nesynchronizují. Víc už není rozchod, ale špatně nastavený
    /// telefon — a událost z budoucnosti nedává smysl ani v záznamu.
    /// </summary>
    public static readonly TimeSpan DopreduNejvic = TimeSpan.FromMinutes(2);

    /// <summary>
    /// Zpátky se tolerují dva dny. Regata se vejde do jednoho a
    /// dvacetičtyřhodinovka i s přípravou a dojezdy do třiceti hodin
    /// (Filip, 24. 10. 2026), takže delší zpoždění není podržený úkon,
    /// ale chybné datum.
    /// </summary>
    public static readonly TimeSpan ZpetNejvic = TimeSpan.FromDays(2);

    /// <summary>Co se s časem z klienta stalo a proč.</summary>
    public enum Posun
    {
        /// <summary>Klient čas neposlal; platí serverový.</summary>
        Neuveden = 0,

        /// <summary>Čas z klienta je v okně a platí.</summary>
        Prijat = 1,

        /// <summary>Čas z klienta byl v budoucnosti; platí serverový.</summary>
        ZBudoucnosti = 2,

        /// <summary>Čas z klienta byl příliš starý; platí serverový.</summary>
        PrilisStary = 3,
    }

    /// <summary>
    /// Vrátí čas, který se má zapsat, a čím to je.
    /// <para>
    /// <b>Nikdy nevrací chybu.</b> Úkon u vody se nesmí ztratit kvůli
    /// špatně jdoucím hodinám — zapíše se se serverovým časem a rozdíl
    /// zůstane doložený tím, že se oba časy ukládají vedle sebe.
    /// </para>
    /// </summary>
    public static (DateTimeOffset Kdy, Posun Proc) Kdy(DateTimeOffset? zKlienta, DateTimeOffset ted)
    {
        if (zKlienta is not { } klient) return (ted, Posun.Neuveden);
        if (klient > ted + DopreduNejvic) return (ted, Posun.ZBudoucnosti);
        if (klient < ted - ZpetNejvic) return (ted, Posun.PrilisStary);
        return (klient, Posun.Prijat);
    }
}
