namespace OrlickyPohar.Api.Features.Identita;

/// <summary>
/// Účet se nezaloží, protože by překročil strop. <b>Není to chyba klienta</b>
/// — token je platný a člověk za to nemůže —, takže se z toho navenek stává
/// 503, ne 400.
/// </summary>
public class UctuJePlno(string duvod) : Exception(duvod);

/// <summary>
/// Kolik účtů smí vzniknout. <b>Čistá funkce</b>, aby se strop dal zkoušet
/// bez databáze — stejně jako <see cref="Prava"/> nebo <see cref="Potvrzeni"/>.
///
/// <para>
/// <b>Proč to vůbec je.</b> Účet zakládá první přihlášení na <c>/ja</c>, a to
/// znamená, že držitel jednoho platného tokenu umí vyrábět řádky v tabulce.
/// Limit na hraně proti tomu nestačí: <c>ratelimit-standard</c> v Traefiku
/// pouští <b>30 požadavků za sekundu na jednu adresu</b> (změřeno
/// 22. 11. 2026 v <c>platform/stack/traefik/dynamic/middleware.yml</c>), což
/// je za den víc než dva miliony účtů. Brzda tedy musí být tady, ne na hraně.
/// </para>
/// <para>
/// <b>Dvě čísla, dvě různé obrany.</b> Strop živých účtů je výpověď
/// o kapacitě: Orlický pohár má desítky lidí a stovku nepřekročí (Filip,
/// 22. 11. 2026), takže pětistovka je pětinásobná rezerva a zároveň hranice,
/// za kterou už něco není v pořádku. Denní rozpočet je obrana proti kolotoči
/// <i>přihlas se — smaž — přihlas se</i>: smazaný účet zůstává jako náhrobek
/// a při dalším přihlášení vznikne řádek nový, takže <b>jeden</b> účet
/// u poskytovatele by jinak tabulku nafukoval bez konce. Náhrobek si drží
/// <c>ZalozenV</c>, proto se do rozpočtu počítá taky.
/// </para>
/// <para>
/// <b>Strop nikdy nevyhodí toho, kdo už účet má.</b> Platí jen na zakládání;
/// přihlášení známého člověka přes něj neprochází vůbec.
/// </para>
/// </summary>
public static class StropUctu
{
    /// <summary>Kolik živých účtů smí existovat. Stovka je očekávání, pětistovka strop.</summary>
    public const int NejvicVychozi = 500;

    /// <summary>
    /// Kolik účtů smí vzniknout za jeden den. Dvacet je pro ročník, do kterého
    /// se hlásí desítky lidí, pořád víc než dost — a kolotoč tím spadne
    /// z milionů řádků na dvacet.
    /// </summary>
    public const int ZaDenVychozi = 20;

    /// <summary>
    /// Proč účet nezakládat, nebo <c>null</c>, když to jde.
    /// <para>
    /// Hláška jde do odpovědi i do logu. <b>Říká číslo</b>, protože „nelze
    /// založit účet" pošle člověka hledat příčinu do databáze.
    /// </para>
    /// </summary>
    public static string? ProcNezalozit(int zivych, int zaDnes, int nejvic, int zaDen)
    {
        if (nejvic > 0 && zivych >= nejvic)
            return $"Účtů je {zivych}, což je strop ({nejvic}). Nový účet se nezaloží.";

        if (zaDen > 0 && zaDnes >= zaDen)
            return $"Dnes vzniklo {zaDnes} účtů, což je denní rozpočet ({zaDen}). " +
                   "Další se založí zítra.";

        return null;
    }

    /// <summary>
    /// Začátek dne v UTC. <b>Ne místní půlnoc</b> — rozpočet se porovnává
    /// s <c>ZalozenV</c>, a to je čas v UTC jako všechno ostatní v databázi
    /// (Npgsql jiný posun do <c>timestamp with time zone</c> nezapíše).
    /// </summary>
    public static DateTimeOffset OdPolnoci(DateTimeOffset ted) =>
        new(ted.Year, ted.Month, ted.Day, 0, 0, 0, TimeSpan.Zero);
}
