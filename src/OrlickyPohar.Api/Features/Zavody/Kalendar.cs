using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Pravidla kalendáře ročníku, která nepotřebují databázi: kdo smí posunout
/// zastávku kam, co je platný termín a jak se z názvu stane adresa.
/// <para>
/// Zvlášť ze stejného důvodu jako <c>Prava</c>, <c>Udeleni</c> a
/// <c>Psani</c>: ptá se na ně každý zápis, takže se to musí dát zkoušet bez
/// databáze, bez tokenu a bez Dockeru.
/// </para>
/// </summary>
public static class Kalendar
{
    /// <summary>Nejdelší slug, který se ještě vejde do sloupce zastávky.</summary>
    private const int SlugNejvic = 80;

    /// <summary>
    /// Stavy tak, jak jdou v čase po sobě. <b>Je to řada, ne čísla výčtu</b>
    /// — <c>Potvrzeny</c> má číslo 4, protože přibyl později a přečíslování
    /// by z odjetých závodů udělalo zrušené.
    /// </summary>
    public static readonly StavZavodu[] Rada =
        [StavZavodu.Planovany, StavZavodu.Potvrzeny, StavZavodu.Vypsany, StavZavodu.Odjety];

    /// <summary>
    /// Kdo zastávku do tohohle stavu dostane. Přesně podle tabulky
    /// životního cyklu: <b>termín je věc rozhodčího, průběh závodu věc
    /// pořadatele</b>.
    /// <para>
    /// Rozhoduje <b>cílový</b> stav, ne směr. Stáhnout vypsaný závod zpátky
    /// na potvrzený termín tedy smí rozhodčí, ne organizátor — vypsání už
    /// vidělo publikum a vzít ho zpátky je zásah do kalendáře, ne do závodu.
    /// </para>
    /// <para>
    /// Správce smí obojí, protože ve svém rozsahu smí všechno; plyne to
    /// z <see cref="Prava"/> a neopisuje se to sem.
    /// </para>
    /// </summary>
    public static Role KdoSmi(StavZavodu na) => na switch
    {
        StavZavodu.Vypsany or StavZavodu.Odjety => Role.Organizator,
        _ => Role.Rozhodci,
    };

    /// <summary>
    /// Proč zastávka takhle posunout nejde — nebo <c>null</c>, když jde.
    /// <para>
    /// Platí tři pravidla a nic víc:
    /// </para>
    /// <list type="number">
    /// <item>
    /// <b>Po řadě, o jeden krok, oběma směry.</b> Přeskočit dopředu nejde:
    /// vypsat závod na termín, který rozhodčí nepotvrdil, by znamenalo, že
    /// si organizátor odsouhlasil termín sám. Krok zpátky jde, protože
    /// překlep se musí dát vzít zpět.
    /// </item>
    /// <item>
    /// <b>Zrušit jde všechno, co se ještě nejelo.</b> Odjetý závod se
    /// zrušit nedá — jsou v něm výsledky a ty by zmizely z pohárů, aniž by
    /// je kdo smazal.
    /// </item>
    /// <item>
    /// <b>Zrušená zastávka se vrací jako plánovaná.</b> Ne rovnou jako
    /// vypsaná: když se termín obnoví, musí ho někdo znovu potvrdit.
    /// </item>
    /// </list>
    /// </summary>
    public static string? ProcNejde(StavZavodu ze, StavZavodu na)
    {
        if (ze == na) return null;

        if (na == StavZavodu.Zruseny)
            return ze == StavZavodu.Odjety
                ? "Odjetý závod zrušit nejde — jsou v něm výsledky, které se počítají do poháru."
                : null;

        if (ze == StavZavodu.Zruseny)
            return na == StavZavodu.Planovany
                ? null
                : "Zrušená zastávka se vrací jako plánovaná. Termín pak znovu potvrď.";

        var zIndex = Array.IndexOf(Rada, ze);
        var naIndex = Array.IndexOf(Rada, na);

        return Math.Abs(zIndex - naIndex) == 1
            ? null
            : $"Ze stavu „{Nazev(ze)}“ se na „{Nazev(na)}“ neskáče. Jde to jen po jednom kroku: "
              + string.Join(" → ", Rada.Select(Nazev)) + ".";
    }

    /// <summary>
    /// Stavy, do kterých se zastávka může hnout. Posílá se na obrazovku,
    /// aby nabídla jen to, co zápis pustí — dvě různá pravidla na dvou
    /// stranách drátu se rozejdou při první změně.
    /// </summary>
    public static IEnumerable<StavZavodu> MozneZ(StavZavodu ze) =>
        Enum.GetValues<StavZavodu>().Where(na => na != ze && ProcNejde(ze, na) is null);

    /// <summary>České jméno stavu do hlášky. Obrazovka má vlastní, tohle je pro API.</summary>
    public static string Nazev(StavZavodu stav) => stav switch
    {
        StavZavodu.Planovany => "Plánovaný",
        StavZavodu.Potvrzeny => "Potvrzený",
        StavZavodu.Vypsany => "Vypsaný",
        StavZavodu.Odjety => "Odjetý",
        StavZavodu.Zruseny => "Zrušený",
        _ => stav.ToString(),
    };

    /// <summary>
    /// Adresa zastávky z názvu. Vyrábí ji <c>Psani.Slug</c> — je to totéž
    /// pravidlo a druhý opis by znamenal, že „Jarní vítr“ skončí u článku
    /// jinak než u zastávky. Liší se jen strop: sloupec zastávky je kratší.
    /// </summary>
    public static string Slug(string nazev)
    {
        var slug = Clanky.Psani.Slug(nazev);
        return slug.Length > SlugNejvic ? slug[..SlugNejvic].TrimEnd('-') : slug;
    }

    /// <summary>
    /// Proč zastávku takhle uložit nejde — nebo <c>null</c>, když jde.
    /// Vrací větu, protože jediný, kdo z toho něco má, je člověk na druhé
    /// straně obrazovky.
    /// </summary>
    public static string? ProcNejdeUlozit(string? nazev, DateOnly datum, DateOnly? konec, string? slug)
    {
        if (string.IsNullOrWhiteSpace(nazev)) return "Zastávka musí mít název.";

        if (string.IsNullOrEmpty(slug))
            return "Z názvu nejde udělat adresa. Napiš do něj aspoň jedno písmeno nebo číslici.";

        // Vícedenní závod má konec po začátku. Rovnost se pouští: jednodenní
        // zapsaný dvakrát je neškodný a odmítat ho by bylo jen otravné.
        if (konec is { } k && k < datum)
            return "Konec závodu je dřív než jeho začátek.";

        return null;
    }

    /// <summary>
    /// Původní termín po změně data — nebo <c>null</c>, když se žádný
    /// pamatovat nemá.
    /// <para>
    /// <b>Přesun není stav</b>, zůstává po něm jen tohle datum. Pamatuje se
    /// <b>první</b>, ne předposlední: termín, na který se lidé chystali, je
    /// ten, který jednou oznámil kalendář.
    /// </para>
    /// <para>
    /// <b>Plánovaná zastávka se nepřesouvá, jen se jí mění termín.</b>
    /// Předběžný kalendář je návrh a hlásit u něj „přesunuto z“ by znamenalo
    /// tvrdit, že něco platilo, když nic neplatilo.
    /// </para>
    /// </summary>
    public static DateOnly? PuvodniPoPresunu(
        StavZavodu stav, DateOnly stare, DateOnly nove, DateOnly? puvodni)
    {
        if (stare == nove) return puvodni;
        if (stav == StavZavodu.Planovany) return puvodni;

        return puvodni ?? stare;
    }

    /// <summary>
    /// Přečíslování zastávek podle data. Vrací pořadí pro každý
    /// identifikátor.
    /// <para>
    /// <b>Kalendář se řadí časem</b>, a pořadí zastávky je právě jeho
    /// zápis — jinak by zastávka doplněná dodatečně skončila v ročníku až
    /// za Vánoční regatou, protože dostala nejvyšší číslo. Shodné datum
    /// rozhoduje dosavadní pořadí, aby se dvoudenní víkend nepřehazoval
    /// při každém uložení.
    /// </para>
    /// </summary>
    public static IReadOnlyDictionary<int, int> Preradit(
        IEnumerable<(int Id, DateOnly Datum, int Poradi)> zastavky) =>
        zastavky
            .OrderBy(z => z.Datum).ThenBy(z => z.Poradi).ThenBy(z => z.Id)
            .Select((z, i) => (z.Id, Poradi: i + 1))
            .ToDictionary(z => z.Id, z => z.Poradi);
}
