using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Odkud se poloha bóje vzala.
/// <para>
/// <b>Měří jediný z nich.</b> Telefon u bóje hlásí i přesnost a ta se
/// ukládá; bod odečtený z mapy žádnou přesnost nemá a tvářit se, že má,
/// by byl výmysl. Dokud tohle pole nebylo, slil se „telefon přesnost
/// nehlásí" a „opsáno z mapy" do jednoho prázdného čísla.
/// </para>
/// <para>
/// Proč se poloha vůbec zadává jinak než pípnutím (Filip, 9. 10. 2026):
/// někdo u počítače ji zapíše za stavitele, který pípat neumí, nebo si
/// rozhodčí po posunu zavolá s člověkem úplně mimo proces — *„ukotvi mi
/// to tam a pošli mi odkaz v mapě"*. V obou případech zapisuje někdo
/// jiný, než kdo tu bóji viděl, a záznam to má říct.
/// </para>
/// </summary>
public enum ZdrojPolohy
{
    /// <summary>Změřeno telefonem u bóje. Jediný zdroj, který měří.</summary>
    Telefon = 0,

    /// <summary>Odečteno z mapy — opsané souřadnice nebo odkaz do mapy.</summary>
    Mapa = 1,

    /// <summary>Z QR kódu, který nesl odkaz do mapy. Taky odečtené, jen jinudy.</summary>
    Qr = 2,
}

/// <summary>
/// Bóje postavená na trati (Filip, 4. 10. 2026: *„musíme udělat verzi
/// v appce pro pořadatele, který staví bójky, aby pípnul GPS, když postaví
/// bójku, nebo přenastaví"*).
/// <para>
/// <b>Přesnější polohu než ten, kdo bóji staví, nemá nikdo.</b> Trať je
/// zároveň podmínka pro tři věci z plánu: okna pro zhuštění záznamu trasy,
/// pořadí na vodě a čitelnou mapu.
/// </para>
/// <para>
/// <b>Přenastavení je nový záznam, ne přepis</b> — stejné pravidlo jako
/// u plachetní směrnice. Trať se během dne mění a trasa musí jít porovnat
/// se stavem, který zrovna platil. Proto se poloha nikdy nepřepisuje
/// a místo mazání se bóje označí za sebranou.
/// </para>
/// </summary>
public class Boje : Fotky.IMaFotku
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    /// <summary>
    /// Fotka bóje z okamžiku postavení (Filip, 9. 10. 2026). Je to doklad
    /// k poloze, ne obrázek na web: ze souřadnic se nepozná, jestli je ta
    /// bóje nafouklá, jakou má barvu a co je za ní na břehu. Veřejně se
    /// nevydává — stejně jako celá trať.
    /// <para>
    /// <b>Patří k záznamu, ne k bóji jako věci.</b> Přenastavení zakládá
    /// nový záznam, takže i fotka je nová; ta stará zůstane u staré polohy
    /// a je z ní vidět, jak trať vypadala tehdy.
    /// </para>
    /// </summary>
    public Guid? FotkaId { get; set; }
    public Fotky.Fotka? Fotka { get; set; }

    /// <summary>
    /// Čím bóje na trati je: „start levý", „bóje 1", „cíl". Volný text —
    /// trati se liší regatu od regaty a číselník by jen překážel.
    /// </summary>
    public required string Nazev { get; set; }

    /// <summary>Pořadí na trati. Podle něj se skládá trať a kola.</summary>
    public int Poradi { get; set; }

    public double Sirka { get; set; }
    public double Delka { get; set; }

    /// <summary>
    /// Přesnost hlášená telefonem v metrech. <b>Ukládá se schválně</b>:
    /// iPhone s vypnutou přesnou polohou hlásí klidně 65 m a bez tohohle
    /// čísla by se taková poloha tvářila stejně jako přesná.
    /// <para>U polohy z mapy je prázdná — mapa přesnost neměří.</para>
    /// </summary>
    public double? PresnostM { get; set; }

    /// <summary>
    /// Odkud se poloha vzala. Starší záznamy jsou všechny z telefonu,
    /// protože jinudy to tehdy nešlo — nula je tedy pravda, ne doplněk.
    /// </summary>
    public ZdrojPolohy Zdroj { get; set; }

    public DateTimeOffset PostavenaV { get; set; }

    public Guid PostavilId { get; set; }
    public Uzivatel? Postavil { get; set; }

    /// <summary>
    /// Záznam, který tenhle nahradil. Řetěz přenastavení tak jde projít
    /// zpátky — kde bóje stála, když kolem ní loď proplouvala.
    /// </summary>
    public int? NahrazujeId { get; set; }
    public Boje? Nahrazuje { get; set; }

    /// <summary>
    /// Kdy ji někdo sebral z vody. Sebraná bóje zmizí z trati, ale zůstane
    /// v historii — trasa z té doby se bez ní nedá přečíst.
    /// </summary>
    public DateTimeOffset? SebranaV { get; set; }

    /// <summary>
    /// Kdy ji nahradilo novější pípnutí. Nastavuje se na <b>starém</b>
    /// záznamu, takže platná bóje se pozná bez dotazu na ostatní.
    /// </summary>
    public DateTimeOffset? NahrazenaV { get; set; }

    /// <summary>Platná bóje: nenahrazená novějším pípnutím a nesebraná.</summary>
    public bool Platna => NahrazenaV is null && SebranaV is null;
}

/// <summary>Bóje, jak ji vidí klient.</summary>
public record BojeDto(
    int Id,
    string Nazev,
    int Poradi,
    double Sirka,
    double Delka,
    double? PresnostM,
    DateTimeOffset PostavenaV,
    string? Postavil,
    bool Sebrana,
    Fotky.ObrazekDto? Fotka,
    ZdrojPolohy Zdroj = ZdrojPolohy.Telefon);

/// <summary>Pípnutí polohy: co posílá web i appka.</summary>
/// <param name="Nazev">Čím bóje je — „bóje 1", „start levý".</param>
/// <param name="Poradi">Pořadí na trati; nula znamená „za poslední".</param>
/// <param name="Sirka">Zeměpisná šířka ve stupních.</param>
/// <param name="Delka">Zeměpisná délka ve stupních.</param>
/// <param name="PresnostM">Přesnost z telefonu v metrech, když ji hlásí.</param>
/// <param name="NahrazujeId">Při přenastavení id bóje, která tam stála dosud.</param>
/// <param name="Zdroj">
/// Odkud poloha je. Chybějící znamená <c>Telefon</c>, aby klient, který
/// o poli neví, posílal dál pravdu — dokud tohle pole nebylo, jiná cesta
/// než pípnutí z telefonu neexistovala.
/// </param>
public record PipnutiVstup(
    string? Nazev,
    int Poradi,
    double Sirka,
    double Delka,
    double? PresnostM,
    int? NahrazujeId,
    ZdrojPolohy? Zdroj = null);

/// <summary>Pravidla pípnutí. Čisté funkce, bez databáze.</summary>
public static class Pipnuti
{
    public const int NazevNejvic = 60;

    /// <summary>
    /// Nad tuhle přesnost se poloha nebere. Telefon u vody hlásí běžně 3 až
    /// 10 m; sto metrů znamená, že se chytá sítě, ne družic — a taková bóje
    /// by posunula celou trať.
    /// </summary>
    public const double NejhorsiPresnostM = 100;

    /// <summary>
    /// Orlík i s rezervou. Překlep v souřadnicích (prohozená šířka a délka)
    /// by jinak postavil bóji v Africe a nikdo by si toho nevšiml.
    /// </summary>
    public const double SirkaOd = 49.2;
    public const double SirkaDo = 49.8;
    public const double DelkaOd = 14.0;
    public const double DelkaDo = 14.5;

    /// <summary>Proč pípnutí nejde — nebo <c>null</c>, když jde.</summary>
    public static string? ProcNejde(PipnutiVstup vstup)
    {
        if (string.IsNullOrWhiteSpace(vstup.Nazev)) return "Napiš, čím ta bóje je — třeba „bóje 1\".";
        if (vstup.Nazev.Trim().Length > NazevNejvic)
            return $"Jméno bóje má nejvýš {NazevNejvic} znaků.";

        var zdroj = vstup.Zdroj ?? ZdrojPolohy.Telefon;

        // Přesnost umí říct jen měření. Kdyby ji směl poslat i bod z mapy,
        // stálo by v záznamu číslo, které nikdo nezměřil — a právě kvůli
        // tomu se zdroj zavedl.
        if (zdroj != ZdrojPolohy.Telefon && vstup.PresnostM is not null)
            return "Přesnost hlásí jen telefon. U polohy z mapy ji neposílej.";

        if (vstup.PresnostM is { } presnost && presnost > NejhorsiPresnostM)
            return $"Poloha je přesná jen na {presnost:0} m. Počkej na lepší signál a pípni znovu.";

        // Platí pro obojí, a u mapy o to víc: odkaz může vést kamkoliv na
        // světě a prohozená šířka s délkou jsou v mapách běžná past.
        if (vstup.Sirka is < SirkaOd or > SirkaDo || vstup.Delka is < DelkaOd or > DelkaDo)
            return zdroj == ZdrojPolohy.Telefon
                ? "Tahle poloha není na Orlíku. Zkontroluj, že telefon má signál z družic."
                : "Tahle poloha není na Orlíku. Zkontroluj, že se v odkazu neprohodila šířka s délkou.";

        return null;
    }
}
