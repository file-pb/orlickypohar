using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Serial;

namespace OrlickyPohar.Api.Features.Oponentura;

/// <summary>
/// Sada otázek, kterou rozhodčí dostane odkazem a vyplní na telefonu.
/// <para>
/// <b>Proč to vůbec je.</b> Oponentura s hlavním rozhodčím jede od 27. 10.
/// 2026 přes WhatsApp: on posílá hlasové nahrávky a fotky, Filip je přepisuje
/// a ručně zapisuje do <c>docs/OPONENTURA-ROZHODCI.md</c>. Dvě věci na tom
/// nefungují — nikdo nevidí, na co se ještě neodpovědělo, a přepis je ruční
/// práce, která se po každé dávce opakuje. Tahle obrazovka je totéž, co
/// WhatsApp, jen s <b>pořadníkem</b> a s odpověďmi přišpendlenými k otázce.
/// </para>
/// <para>
/// <b>Hlas je nosná část, ne doplněk.</b> Miloš odpovídá hlasem a je v tom
/// výborný: osm otázek vyřídil třinácti nahrávkami za třináct minut. Volby
/// a volný text jsou tu pro to, co se dá odpovědět jedním slovem, aby se
/// kvůli „dvě, ne tři" nemusel nahrávat.
/// </para>
/// <para>
/// <b>Sada je data, ne kód</b> (zadání, 28. 10. 2026). Zakládá se
/// koncovým bodem z JSONu, takže další sada — chybí sezení s čerstvým
/// pořadatelem a bude to tentýž formát — nepotřebuje nasazení.
/// </para>
/// <para>
/// <b>Patří ročníku</b>, protože ročník je rozsah, ve kterém jsou role
/// udělené: Miloš je rozhodčí ročníku 2027. Otázky samy jsou o aplikaci,
/// ne o ročníku, ale přes co jiného se na právo zeptat — vlastní rozsah
/// jen pro dotazník by znamenal druhou pravdu o oprávněních.
/// </para>
/// </summary>
public class SadaOtazek
{
    public int Id { get; set; }

    public int SerieId { get; set; }
    public Serie? Serie { get; set; }

    /// <summary>Adresa sady. Přirozený klíč, podle kterého je zakládání idempotentní.</summary>
    public required string Slug { get; set; }

    public required string Nazev { get; set; }

    /// <summary>
    /// Krátký úvod: odkud otázky jsou a co se s odpověďmi stane. Rozhodčí
    /// na telefonu musí z první obrazovky poznat, do čeho jde.
    /// </summary>
    public required string Uvod { get; set; }

    /// <summary>Pořadí ve výpisu. Nižší číslo je výš.</summary>
    public int Poradi { get; set; }

    public DateTimeOffset VytvorenoV { get; set; }

    public List<OtazkaSady> Otazky { get; set; } = [];
}

/// <summary>
/// Jedna otázka v sadě. Nic z ní není povinné vyplnit — vyplní se, co
/// rozhodčí zrovna ví.
/// </summary>
public class OtazkaSady
{
    public int Id { get; set; }

    public int SadaId { get; set; }
    public SadaOtazek? Sada { get; set; }

    /// <summary>
    /// Značka otázky, pod kterou se o ní mluví jinde — třeba <c>B1</c>
    /// pro první otázku skupiny B. <b>Přirozený klíč v sadě:</b> doplnění
    /// sady se podle něj pozná od nové otázky.
    /// </summary>
    public required string Kod { get; set; }

    public int Poradi { get; set; }

    public required string Text { get; set; }

    /// <summary>
    /// Proč se ptáme a co na odpovědi stojí. Nepovinné, ale u otázky, která
    /// uvolní tři nálezy, je to rozdíl mezi odpovědí a protiotázkou.
    /// </summary>
    public string? Vysvetleni { get; set; }

    /// <summary>Které nálezy odpověď uvolní, například <c>R31, R28</c>.</summary>
    public string? Uvolni { get; set; }

    /// <summary>
    /// Volby k zaškrtnutí. Prázdné znamená otázku jen na text a na hlas.
    /// Leží v JSONu u řádku otázky, protože mimo ni nemají význam.
    /// </summary>
    public List<Volba> Volby { get; set; } = [];

    /// <summary>Dá se zaškrtnout víc voleb naráz?</summary>
    public bool VolbyVice { get; set; }
}

/// <summary>
/// Jedna volba k zaškrtnutí.
/// <para>
/// <b>Kód, ne jen text.</b> Odpověď drží kódy zaškrtnutých voleb, takže
/// oprava překlepu v textu volby nerozpojí už uložené odpovědi.
/// </para>
/// </summary>
public class Volba
{
    public required string Kod { get; set; }
    public required string Text { get; set; }
}

/// <summary>
/// Odpověď jednoho člověka na jednu otázku — zaškrtnuté volby a volný text.
/// Hlas je vedle v <see cref="HlasovaOdpoved"/>, protože jich bývá víc.
/// </summary>
public class OdpovedNaOtazku
{
    public int Id { get; set; }

    public int OtazkaId { get; set; }
    public OtazkaSady? Otazka { get; set; }

    public Guid KdoId { get; set; }
    public Uzivatel? Kdo { get; set; }

    /// <summary>Kódy zaškrtnutých voleb. Postgres to drží jako <c>text[]</c>.</summary>
    public List<string> Volby { get; set; } = [];

    public string? Text { get; set; }

    public DateTimeOffset VytvorenoV { get; set; }
    public DateTimeOffset ZmenenoV { get; set; }
}

/// <summary>
/// Nahraná hlasová odpověď. <b>Id je zároveň jméno souboru v úložišti</b>,
/// takže se soubor pod jednou adresou nikdy nezmění.
/// <para>
/// <b>Jedna otázka může mít nahrávek víc.</b> Miloš na osm otázek poslal
/// třináct nahrávek — někde se vrátil, někde doplnil. Přepisovat jednu
/// nahrávku druhou by znamenalo ztratit to, co dořekl.
/// </para>
/// <para>
/// <b>Vydává se přes API, ne z veřejné adresy úložiště.</b> Fotky a směrnice
/// mají veřejnou adresu, protože je obojí určené ven. Hlas rozhodčího
/// k neuzavřenému rozhodnutí určený ven není, a odkaz, který jednou unikne
/// z transkriptu, by platil napořád.
/// </para>
/// </summary>
public class HlasovaOdpoved
{
    public Guid Id { get; set; }

    public int OtazkaId { get; set; }
    public OtazkaSady? Otazka { get; set; }

    public Guid KdoId { get; set; }
    public Uzivatel? Kdo { get; set; }

    /// <summary>MIME typ, jak ho pozná <see cref="Dotazovani.PoznejZvuk"/>.</summary>
    public required string Typ { get; set; }

    public long Velikost { get; set; }

    /// <summary>
    /// Délka nahrávky ve vteřinách, jak ji naměřil prohlížeč. Nepovinná —
    /// server ji z obsahu nepočítá a vymýšlet ji nebude.
    /// </summary>
    public int? Sekund { get; set; }

    public DateTimeOffset NahranoV { get; set; }
}

/// <summary>
/// Že je sada z pohledu jednoho člověka hotová. Vlastní záznam, ne příznak
/// na odpovědi.
/// <para>
/// <b>Proč to nejde spočítat.</b> Nic v sadě není povinné, takže „odpověděl
/// na všechno" nenastane nikdy — a Filip potřebuje poznat rozpracovanou sadu
/// od hotové, aby věděl, co poslat znovu. To ví jen ten, kdo odpovídá.
/// </para>
/// </summary>
public class VyplneniSady
{
    public int Id { get; set; }

    public int SadaId { get; set; }
    public SadaOtazek? Sada { get; set; }

    public Guid KdoId { get; set; }
    public Uzivatel? Kdo { get; set; }

    /// <summary>Kdy řekl „mám to". Prázdné znamená rozpracováno.</summary>
    public DateTimeOffset? DokonceneV { get; set; }
}

/// <summary>V jakém stavu je sada z pohledu toho, kdo ji má vyplnit.</summary>
public enum StavSady
{
    /// <summary>Nikdo na ni nic neodpověděl.</summary>
    Neodpovezeno,

    /// <summary>Něco v ní je, ale nikdo ji neuzavřel.</summary>
    Rozpracovano,

    /// <summary>Někdo řekl „mám to".</summary>
    Odpovezeno,
}

/// <summary>Sada ve výpisu: co je to za sadu a jak na tom je.</summary>
/// <param name="Odpovezeno">
/// Na kolika otázkách je aspoň něco — volba, text nebo nahrávka.
/// </param>
/// <param name="DokonceneV">
/// Kdy se sada uzavřela. Vyplněné jen u <see cref="StavSady.Odpovezeno"/>.
/// </param>
/// <param name="ZmenenoV">Poslední změna kterékoliv odpovědi v sadě.</param>
public record SadaShrnutiDto(
    string Slug,
    string Nazev,
    string Uvod,
    int PocetOtazek,
    int Odpovezeno,
    int PocetNahravek,
    StavSady Stav,
    DateTimeOffset? DokonceneV,
    DateTimeOffset? ZmenenoV);

/// <summary>Nahrávka, jak ji vidí obrazovka: adresa v API, ne v úložišti.</summary>
public record NahravkaDto(
    Guid Id,
    string Adresa,
    string Typ,
    long Velikost,
    int? Sekund,
    DateTimeOffset NahranoV,
    string? Kdo);

/// <summary>Otázka i s tím, co na ni kdo odpověděl.</summary>
public record OtazkaDto(
    string Kod,
    string Text,
    string? Vysvetleni,
    string? Uvolni,
    List<Volba> Volby,
    bool VolbyVice,
    List<string> Zaskrtnuto,
    string? Odpoved,
    DateTimeOffset? OdpovezenoV,
    List<NahravkaDto> Nahravky);

/// <summary>Detail sady: úvod, stav a otázky s odpověďmi.</summary>
public record SadaDetailDto(
    string Slug,
    string Nazev,
    string Uvod,
    StavSady Stav,
    DateTimeOffset? DokonceneV,
    List<OtazkaDto> Otazky);

/// <summary>Zápis odpovědi na jednu otázku. Obojí nepovinné.</summary>
public record OdpovedVstup(List<string>? Volby, string? Text);

/// <summary>Zakládaná sada, jak přijde v JSONu.</summary>
public record SadaVstup(
    string Slug,
    string Nazev,
    string Uvod,
    int Poradi,
    List<OtazkaVstup> Otazky);

/// <summary>Zakládaná otázka.</summary>
public record OtazkaVstup(
    string Kod,
    string Text,
    string? Vysvetleni,
    string? Uvolni,
    List<Volba>? Volby,
    bool VolbyVice);

/// <summary>
/// Pravidla dotazníku. <b>Čisté funkce</b>, bez databáze a bez úložiště —
/// stav sady a poznání zvuku se musí dát zkoušet bez obojího.
/// </summary>
public static class Dotazovani
{
    /// <summary>
    /// Nahrávka hlasem bývá do dvou megabajtů za minutu (Opus v kontejneru
    /// WebM). Dvacet je nad tím s rezervou na delší odpověď a na AAC
    /// z iPhonu, a pořád se to vejde do paměti kontejneru.
    /// </summary>
    public const long NejvicBajtu = 20 * 1024 * 1024;

    public const int TextNejvic = 4000;
    public const int KodNejvic = 20;
    public const int SlugNejvic = 60;
    public const int NazevNejvic = 200;
    public const int UvodNejvic = 1000;
    public const int OtazkaNejvic = 2000;
    public const int VysvetleniNejvic = 2000;

    /// <summary>
    /// Hlavička, se kterou se nahrávka ukládá. <b>Necachovat</b>: soubor se
    /// nevydává z veřejné adresy, ale z API za přihlášením, a edge cache
    /// mezi tím nemá co dělat.
    /// </summary>
    public const string Cache = "no-store";

    public const string Vypnuto = "Úložiště souborů zatím není nastavené.";

    public const string NeniZvuk =
        "Nahrávka nemá rozpoznatelný zvukový formát. Nahraj ji znovu, nebo "
        + "odpověz textem.";

    /// <summary>
    /// Klíč v úložišti. <b>Předpona <c>oponentura/</c></b> drží hlasové
    /// odpovědi stranou od fotek (<c>fotky/</c>), směrnic (<c>smernice/</c>)
    /// a přejatých obrázků (<c>prevzate/</c>) — mají jinou životnost
    /// i jinou míru veřejnosti.
    /// </summary>
    public static string Klic(Guid id, string typ) => $"oponentura/{id:N}{Pripona(typ)}";

    /// <summary>Koncovka podle typu. Jen kvůli tomu, aby soubor šel otevřít ručně.</summary>
    public static string Pripona(string typ) => typ switch
    {
        "audio/webm" => ".webm",
        "audio/ogg" => ".ogg",
        "audio/mp4" => ".m4a",
        "audio/mpeg" => ".mp3",
        "audio/wav" => ".wav",
        _ => ".bin",
    };

    /// <summary>
    /// Jaký zvuk to je — podle <b>obsahu</b>, ne podle toho, co tvrdí
    /// prohlížeč. Vrací <c>null</c>, když to zvuk, který umíme pojmenovat,
    /// není.
    /// <para>
    /// <b>Proč víc formátů.</b> <c>MediaRecorder</c> v Chromu nahrává Opus
    /// ve WebM, Safari na iPhonu AAC v MP4 — a na čí telefon odpověď přijde,
    /// nevíme. Vnucovat jeden formát by znamenalo, že na polovině telefonů
    /// nahrávání nejde a nikdo nepozná proč.
    /// </para>
    /// </summary>
    public static string? PoznejZvuk(ReadOnlySpan<byte> zacatek)
    {
        // Matroska i WebM začínají značkou EBML.
        if (Zacina(zacatek, [0x1A, 0x45, 0xDF, 0xA3])) return "audio/webm";

        // Ogg (Opus i Vorbis).
        if (Zacina(zacatek, "OggS"u8)) return "audio/ogg";

        // ISO BMFF: `ftyp` stojí na čtvrtém bajtu, ne na začátku.
        if (zacatek.Length >= 12 && zacatek[4..8].SequenceEqual("ftyp"u8)) return "audio/mp4";

        // RIFF…WAVE.
        if (zacatek.Length >= 12
            && Zacina(zacatek, "RIFF"u8) && zacatek[8..12].SequenceEqual("WAVE"u8))
            return "audio/wav";

        // MP3: ID3 tag, nebo rovnou rámec (0xFF 0xEx/0xFx).
        if (Zacina(zacatek, "ID3"u8)) return "audio/mpeg";
        if (zacatek.Length >= 2 && zacatek[0] == 0xFF && (zacatek[1] & 0xE0) == 0xE0)
            return "audio/mpeg";

        return null;
    }

    private static bool Zacina(ReadOnlySpan<byte> kde, ReadOnlySpan<byte> co) =>
        kde.Length >= co.Length && kde[..co.Length].SequenceEqual(co);

    /// <summary>Proč nahrát nejde — nebo <c>null</c>, když jde.</summary>
    public static string? ProcNejdeNahrat(long delka)
    {
        if (delka <= 0) return "Nahrávka je prázdná. Zkus to prosím znovu.";
        return delka > NejvicBajtu
            ? $"Nahrávka může mít nejvýš {NejvicBajtu / 1024 / 1024} MB."
            : null;
    }

    /// <summary>
    /// Proč odpověď zapsat nejde — nebo <c>null</c>. Zaškrtnutá volba musí
    /// v otázce existovat; neznámý kód je podvržený nebo zastaralý a tiše
    /// zahodit by ho znamenalo tvrdit, že je uložený.
    /// </summary>
    public static string? ProcNejdeOdpovedet(OtazkaSady otazka, OdpovedVstup vstup)
    {
        if (vstup.Text?.Trim().Length > TextNejvic)
            return $"Odpověď může mít nejvýš {TextNejvic} znaků.";

        var volby = vstup.Volby ?? [];
        if (volby.Count > 1 && !otazka.VolbyVice)
            return "U téhle otázky se dá zaškrtnout jen jedna volba.";

        foreach (var kod in volby)
            if (!otazka.Volby.Any(v => v.Kod == kod))
                return $"Volba „{kod}“ u téhle otázky není.";

        return null;
    }

    /// <summary>Má otázka aspoň něco — volbu, text, nebo nahrávku?</summary>
    public static bool Odpovezena(OdpovedNaOtazku? odpoved, int pocetNahravek) =>
        pocetNahravek > 0
        || (odpoved is not null
            && (odpoved.Volby.Count > 0 || !string.IsNullOrWhiteSpace(odpoved.Text)));

    /// <summary>
    /// Stav sady: nic, rozpracováno, nebo uzavřeno. <b>Uzavření váží víc
    /// než počet odpovědí</b> — kdo řekl „mám to", odpověděl i tím, že na
    /// zbytek odpovídat nebude.
    /// </summary>
    public static StavSady Stav(int odpovezeno, DateTimeOffset? dokonceneV) =>
        dokonceneV is not null ? StavSady.Odpovezeno
            : odpovezeno > 0 ? StavSady.Rozpracovano
            : StavSady.Neodpovezeno;

    /// <summary>
    /// Adresa nahrávky v API. Relativní schválně: web i appka si základ
    /// doplní samy a <see cref="Nahravani.Adresa"/> tu nemá co dělat —
    /// soubor se nevydává z úložiště.
    /// </summary>
    public static string Adresa(string serie, string sada, Guid nahravka) =>
        $"/sprava/serie/{Uri.EscapeDataString(serie)}/oponentura/"
        + $"{Uri.EscapeDataString(sada)}/nahravky/{nahravka:N}";
}
