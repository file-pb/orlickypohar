using System.Globalization;

namespace OrlickyPohar.Api.Features.Poradatele;

/// <summary>
/// Kdo zastávku pořádá — klub, marina, provozovatel služby na Orlíku.
/// <para>
/// <b>Subjekt, ne jméno.</b> Dokud stačilo „pořádá YC Orlík", byl pořadatel
/// text na zastávce. Filip 15. 9. 2026 chtěl u zastávky odkaz na web
/// pořadatele a medailonek — kontakt, mapku, popis — a ten se píše jednou
/// za klub, ne u každé zastávky znovu: YC Orlík pořádá čtyři.
/// </para>
/// <para>
/// <b>Záznam patří všem ročníkům, ne jednomu.</b> Klub se mezi sezónami
/// nemění a medailonek opisovaný každý rok by za dva roky říkal na každé
/// zastávce něco jiného. Právo ho upravit se proto neuděluje na pořadatele,
/// ale odvozuje od zastávek, které pořádá — viz <see cref="Medailonek.SmiUpravit"/>.
/// </para>
/// <para>
/// Není to účet. Pořadatel se nepřihlašuje; přihlašuje se člověk, který má
/// roli organizátora na zastávce.
/// </para>
/// </summary>
public class Poradatel
{
    public int Id { get; set; }

    /// <summary>
    /// Přirozený klíč, odvozený ze jména. <b>Podle něj se páruje</b> text
    /// z kalendáře i z importu, takže „YC Písek" a „yc pisek" jsou týž klub.
    /// Při přejmenování se mění s ním — jinak by další zápis téhož jména
    /// v kalendáři založil klub podruhé.
    /// </summary>
    public required string Slug { get; set; }

    public required string Nazev { get; set; }

    /// <summary>Úplná adresa s <c>http</c> nebo <c>https</c>. Jiná schémata se neukládají.</summary>
    public string? Web { get; set; }

    /// <summary>Prostý text, odstavce oddělené prázdným řádkem — jako tělo článku.</summary>
    public string? Popis { get; set; }

    // Kontakt. Veřejně se ukáže jen to, co někdo vyplní (Filip, 15. 9. 2026):
    // jméno a telefon jsou osobní údaje a nevyplněné pole je odpověď „ne".
    public string? Email { get; set; }
    public string? Telefon { get; set; }
    public string? KontaktniOsoba { get; set; }
    public string? Adresa { get; set; }

    /// <summary>
    /// Souřadnice přístavu nebo klubovny. <b>Mapa se nevkládá</b>, web z nich
    /// skládá odkaz na Mapy.com a OpenStreetMap: vložená mapa by znamenala
    /// cizí požadavky při každém načtení stránky a souhlas, který se kvůli
    /// jedné tečce na mapě nevyplatí.
    /// </summary>
    public double? Sirka { get; set; }
    public double? Delka { get; set; }
}

/// <summary>
/// Pravidla medailonku pořadatele. Čisté funkce, bez databáze.
/// </summary>
public static class Medailonek
{
    public const int NazevNejvic = 120;
    public const int SlugNejvic = 80;
    public const int WebNejvic = 300;
    public const int PopisNejvic = 2000;
    public const int EmailNejvic = 320;
    public const int TelefonNejvic = 40;
    public const int OsobaNejvic = 120;
    public const int AdresaNejvic = 300;

    /// <summary>Tentýž převod jako u zastávek a článků, jen s vlastním stropem.</summary>
    public static string Slug(string nazev)
    {
        var slug = Clanky.Psani.Slug(nazev);
        return slug.Length > SlugNejvic ? slug[..SlugNejvic].TrimEnd('-') : slug;
    }

    /// <summary>
    /// Adresa webu, jak se uloží — nebo chyba.
    /// <para>
    /// <b>Hlídá se tu, ne až ve webu.</b> Adresa jde do <c>href</c> a
    /// <c>javascript:</c> by se z ní spustilo po kliknutí. Ukládá se proto
    /// jen <c>http</c> a <c>https</c> a každý klient ji smí vypsat, jak je.
    /// </para>
    /// <para>
    /// Bez schématu se doplní <c>https://</c>. Z adresního řádku se kopíruje
    /// všelijak a „yachtclubpisek.cz" je jednoznačné.
    /// </para>
    /// </summary>
    public static (string? Web, string? Chyba) NormalizujWeb(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return (null, null);

        var web = text.Trim();
        const string Chyba = "Web musí být adresa stránky, třeba https://yachtclubpisek.cz.";

        if (web.Length > WebNejvic) return (null, $"Adresa webu může mít nejvýš {WebNejvic} znaků.");
        if (web.Any(char.IsWhiteSpace)) return (null, Chyba);

        // Něco před dvojtečkou, co vypadá jako schéma, a není to http(s):
        // `javascript:`, `mailto:`, `data:`. Doplnit k tomu https by z toho
        // udělalo nesmysl, který by prošel.
        var dvojtecka = web.IndexOf(':');
        if (dvojtecka > 0 && !web.Contains("://"))
            return (null, Chyba);

        if (!web.Contains("://")) web = "https://" + web;

        if (!Uri.TryCreate(web, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || !uri.Host.Contains('.'))
            return (null, Chyba);

        return (web, null);
    }

    /// <summary>
    /// Proč medailonek takhle uložit nejde — nebo <c>null</c>, když jde.
    /// Web se kontroluje zvlášť v <see cref="NormalizujWeb"/>, protože se
    /// přitom i upravuje.
    /// </summary>
    public static string? ProcNejdeUlozit(
        string? nazev, string? popis, string? email, string? telefon,
        string? osoba, string? adresa, double? sirka, double? delka)
    {
        if (string.IsNullOrWhiteSpace(nazev)) return "Pořadatel musí mít název.";
        if (nazev.Trim().Length > NazevNejvic) return $"Název může mít nejvýš {NazevNejvic} znaků.";
        if (Slug(nazev) == "")
            return "Z názvu nejde udělat klíč. Napiš do něj aspoň jedno písmeno nebo číslici.";

        if (popis?.Trim().Length > PopisNejvic) return $"Popis může mít nejvýš {PopisNejvic} znaků.";
        if (osoba?.Trim().Length > OsobaNejvic) return $"Jméno může mít nejvýš {OsobaNejvic} znaků.";
        if (adresa?.Trim().Length > AdresaNejvic) return $"Adresa může mít nejvýš {AdresaNejvic} znaků.";

        if (!string.IsNullOrWhiteSpace(email) && !JeEmail(email.Trim()))
            return "E-mail nevypadá jako e-mailová adresa.";

        if (!string.IsNullOrWhiteSpace(telefon) && !JeTelefon(telefon.Trim()))
            return "Telefon může obsahovat číslice, mezery a „+“ a musí mít aspoň devět číslic.";

        // Jedna souřadnice bez druhé je bod na celém poledníku. Odkaz na
        // mapu by z ní vznikl, jen by vedl jinam, než si kdo myslí.
        if (sirka is null != delka is null) return "Souřadnice musí mít obě čísla, šířku i délku.";
        if (sirka is < -90 or > 90) return "Zeměpisná šířka musí být mezi −90 a 90.";
        if (delka is < -180 or > 180) return "Zeměpisná délka musí být mezi −180 a 180.";

        return null;
    }

    /// <summary>
    /// Smí přihlášený medailonek upravit?
    /// <para>
    /// <b>Rozhodčí ročníku, nebo organizátor zastávky, kterou pořadatel
    /// pořádá</b> (Filip, 15. 9. 2026). Správce pokrývá obojí přes
    /// <c>Prava</c>. Záznam je sdílený, takže organizátor Izolepy upraví
    /// medailonek YC Orlík i u Jarního větru — to je vědomá cena za to, že
    /// se medailonek píše jednou.
    /// </para>
    /// </summary>
    public static bool SmiUpravit(
        bool rozhodci, bool organizatorRocniku,
        IReadOnlyCollection<int> mojeZastavky, IReadOnlyCollection<int> zastavkyPoradatele)
    {
        if (zastavkyPoradatele.Count == 0) return false;
        return rozhodci || organizatorRocniku || mojeZastavky.Intersect(zastavkyPoradatele).Any();
    }

    private static bool JeEmail(string email)
    {
        if (email.Length > EmailNejvic || email.Any(char.IsWhiteSpace)) return false;

        var zavinac = email.IndexOf('@');
        if (zavinac <= 0 || zavinac != email.LastIndexOf('@')) return false;

        var domena = email[(zavinac + 1)..];
        return domena.Contains('.') && !domena.StartsWith('.') && !domena.EndsWith('.');
    }

    private static bool JeTelefon(string telefon)
    {
        if (telefon.Length > TelefonNejvic) return false;
        if (!telefon.All(z => char.IsAsciiDigit(z) || z is ' ' or '+' or '-' or '(' or ')' or '/'))
            return false;

        return telefon.Count(char.IsAsciiDigit) is >= 9 and <= 15;
    }

    /// <summary>Souřadnice jako text do odkazu — s tečkou, ať je jazyk serveru jakýkoliv.</summary>
    public static string Cislo(double hodnota) => hodnota.ToString("0.######", CultureInfo.InvariantCulture);
}
