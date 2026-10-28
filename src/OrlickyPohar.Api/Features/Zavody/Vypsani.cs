using OrlickyPohar.Api.Features.Bodovani;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Jeden bod vypsání závodu — číslo z Dodatku J1, nadpis a text.</summary>
/// <param name="Bod">Odkaz do Dodatku J1, například <c>J1.1(2)</c>.</param>
/// <param name="Text">
/// Co aplikace o tom bodu ví. <c>null</c> znamená, že to <b>neví</b> —
/// nedosazuje se pravděpodobná hodnota, bod se přizná jako chybějící.
/// </param>
public record BodVypsani(string Bod, string Nadpis, string? Text);

/// <summary>Vypsání závodu, jak ho aplikace umí sestavit ze svých dat.</summary>
/// <param name="Chybi">
/// Nadpisy bodů bez textu. Dokument tím o sobě říká, co mu schází — a je to
/// zároveň seznam práce pro toho, kdo ho vydává.
/// </param>
public record VypsaniDto(
    string Nazev,
    string SerieNazev,
    IReadOnlyList<BodVypsani> Body,
    IReadOnlyList<string> Chybi);

/// <summary>
/// Vstup pro sestavení vypsání. Všechno, co se do dokumentu dostane, jde
/// skrz tenhle záznam — aby se dal celý dokument vyrobit a zkontrolovat
/// <b>bez databáze</b>, stejně jako <c>Workflow</c>, <c>Prava</c> nebo
/// <c>Kalendar</c>.
/// </summary>
public record VypsaniVstup(
    string SerieNazev,
    int Rok,
    string Nazev,
    DateOnly Datum,
    DateOnly? DatumKonce,
    string? Poradatel,
    string? Typ,
    DateOnly? UzaverkaPrihlasek,
    string? Startovne,
    DateTimeOffset? PrvniVyzyvaciZnameni,
    IReadOnlyList<string> Kategorie,
    int PocetSkrtu,
    decimal KoeficientDoSerie,
    int PosunDoSerie,
    Vyhodnoceni Vyhodnoceni,
    int PocetSkrtuSerie,
    PravidlaBodovani Pravidla,
    bool MaSmernice);

/// <summary>
/// <b>Vypsání závodu jako dokument.</b> Čisté funkce, bez databáze.
///
/// <para>
/// <b>Proč to vzniklo</b> (nálezy R1 a R8 oponentury rozhodčího,
/// 28. 10. 2026). Rozhodčí Miloš Zvonař 27. 10. 2026: *„Vypsání závodu …
/// Forma je dokument."* V aplikaci bylo „vypsání" <b>stav v kalendáři</b>,
/// ne dokument — a přitom je to právě přechod na <c>Vypsany</c>, který
/// otevírá přihlášky lodí. ZPJ 25.1 přitom žádají, aby vypsání bylo
/// dostupné každé lodi <b>dřív, než se přihlásí</b>.
/// </para>
///
/// <para>
/// <b>A je to víc než formalita, protože pohár pořadatelsky ofiko není.</b>
/// ZPJ pro něj neplatí z titulu členství ve svazu — platí jen proto, že si
/// je závod vezme, a prohlašuje se to podle ZPJ 89.2(a) a Dodatku J1 právě
/// ve vypsání, hned druhou položkou J1.1(2). Dokud ta věta nikde nestojí,
/// nemá co udělat ze ZPJ pravidla téhle regaty.
/// </para>
///
/// <para>
/// <b>Dokument se generuje, nepíše.</b> Osm z jedenácti řádků osnovy J1 už
/// v datech leželo a tři přibyly jako kolonky regaty (uzávěrka, startovné,
/// vyzývací znamení). Hlavní zisk je u bodování: vypisuje se z
/// <b>týchž čísel, podle kterých se počítá</b> (<c>PocetSkrtu</c>,
/// <c>KoeficientDoSerie</c>, <c>PosunDoSerie</c>, <c>Vyhodnoceni</c> a
/// <c>PravidlaBodovani</c>), takže se s výpočtem nemůže rozejít. To je
/// jediná vada, která by se u takového dokumentu opravdu stala — dvacet
/// bodů za diskvalifikaci dnes žije v konstantě a text o nich v `PLAN.md`.
/// </para>
///
/// <para>
/// <b>Co aplikace neví, to nevymýšlí.</b> Bod bez údaje nemá text a objeví
/// se v <see cref="VypsaniDto.Chybi"/>. Dokument, který si domyslí
/// startovné nebo místo konání, je horší než dokument, který řekne, že je
/// nezná: podle vypsání se člověk rozhoduje, jestli pojede.
/// </para>
///
/// <para>
/// <b>Co tahle třída nedělá.</b> Nezná úkon <b>uznání vypsání</b>
/// rozhodčím — ten v aplikaci dál chybí a R1 u něj má nezodpovězenou
/// otázku (*„co přesně rozhodčí uznává — dokument, termín, nebo obojí?"*).
/// Dokument je proto <b>vygenerovaný návrh z dat aplikace</b> a říká to
/// o sobě sám.
/// </para>
/// </summary>
public static class Vypsani
{
    /// <summary>Jak se dokument jmenuje, když o něm mluví obrazovka nebo odkaz.</summary>
    public const string Nazev = "Vypsání závodu";

    /// <summary>
    /// Věta, kvůli které pravidla vůbec platí — J1.1(2), doslova podle
    /// Dodatku J1. <b>Nemění se podle dat</b>: je to prohlášení závodu, ne
    /// údaj o něm.
    /// </summary>
    public const string PodleZpj =
        "Závod bude řízen podle pravidel, jak jsou definována v Závodních "
        + "pravidlech jachtingu (ZPJ) 2025–2028.";

    /// <summary>
    /// Že je to návrh z dat, a ne podepsaný dokument. Stojí to v dokumentu,
    /// protože úkon uznání vypsání rozhodčím aplikace nezná (R1).
    /// </summary>
    public const string Navrh =
        "Tohle vypsání sestavila aplikace z údajů o regatě. Vydává ho pořadatel "
        + "a uznává rozhodčí; co v něm chybí, se musí doplnit, než se otevřou "
        + "přihlášky.";

    /// <summary>Sestaví vypsání podle osnovy Dodatku J1.</summary>
    public static VypsaniDto Sestav(VypsaniVstup v)
    {
        var body = new List<BodVypsani>
        {
            new("J1.1(1)", "Název, místo, datum a pořadatel", Zahlavi(v)),
            new("J1.1(2)", "Podle kterých pravidel se jede", PodleZpj),
            new("J1.1(3)", "Další dokumenty, které závod řídí", Dokumenty(v)),
            new("J1.1(4)", "Závodící třídy a podmínky přihlášení", Tridy(v)),
            new("J1.1(5)", "Přihlášky, uzávěrka a startovné", Prihlasky(v)),
            new("J1.1(6)", "Časy vyzývacích znamení", VyzyvaciZnameni(v)),
            new("J1.3(4)", "Dráha", null),
            new("J1.3(5)", "Bodování", Bodovani(v)),
            new("J1.3(7)", "Kdy se poslední den už nestartuje", null),
            new("J1.2(6)", "Lhůta pro změny bodování (ZPJ 90.3(e))", null),
            new("J1.3(8)", "Odepření práva na odvolání (ZPJ 70.3)", null),
        };

        return new VypsaniDto(
            v.Nazev,
            v.SerieNazev,
            body,
            [.. body.Where(b => b.Text is null).Select(b => b.Nadpis)]);
    }

    /// <summary>
    /// Záhlaví. <b>Místo konání se nedosazuje</b> — aplikace ho nevede
    /// nikde (`Zavod` ho nemá a sídlo pořadatele je něco jiného), takže by
    /// „Orlická přehrada" bylo vymyšlené, ne vygenerované. Proto je tenhle
    /// bod vždycky zčásti neúplný; doplnit se dá jedině údajem v datech.
    /// </summary>
    private static string Zahlavi(VypsaniVstup v)
    {
        var kdy = v.DatumKonce is { } konec && konec != v.Datum
            ? $"{Den(v.Datum)} – {Den(konec)}"
            : Den(v.Datum);

        var radky = new List<string>
        {
            $"{v.Nazev}, {v.SerieNazev}",
            $"Termín: {kdy}",
        };

        if (!string.IsNullOrWhiteSpace(v.Typ)) radky.Add($"Typ závodu: {v.Typ.Trim()}");
        radky.Add(string.IsNullOrWhiteSpace(v.Poradatel)
            ? "Pořadatel: neuvedený"
            : $"Pořadatel: {v.Poradatel.Trim()}");
        radky.Add("Místo konání: neuvedené");

        return string.Join("\n", radky);
    }

    private static string Dokumenty(VypsaniVstup v) =>
        v.MaSmernice
            ? "Plachetní směrnice k této regatě jsou vyvěšené v aplikaci na stránce "
              + "regaty, v sekci Směrnice, a platí jejich poslední vyvěšená verze."
            : "Plachetní směrnice vydává pořadatel před závodem a vyvěšují se "
              + "v aplikaci na stránce regaty. Zatím vyvěšené nejsou.";

    /// <summary>
    /// Třídy ano, podmínky přihlášení ne — ty aplikace nevede. Bod proto
    /// chybí celý, i když polovinu údajů má: polovina podmínek je horší než
    /// žádné, protože vypadá jako úplný výčet.
    /// </summary>
    private static string? Tridy(VypsaniVstup v) =>
        v.Kategorie.Count == 0
            ? null
            : $"Závodí se v těchto třídách: {string.Join(", ", v.Kategorie)}. "
              + "Loď jede celý ročník v jedné třídě.";

    private static string? Prihlasky(VypsaniVstup v)
    {
        if (v.UzaverkaPrihlasek is null && string.IsNullOrWhiteSpace(v.Startovne)) return null;

        var radky = new List<string>
        {
            "Lodě se přihlašují formulářem na stránce regaty, a to od chvíle, "
            + "kdy je regata vypsaná.",
        };

        radky.Add(v.UzaverkaPrihlasek is { } uzaverka
            ? $"Uzávěrka přihlášek: {Den(uzaverka)}."
            : "Uzávěrka přihlášek: neuvedená.");

        radky.Add(string.IsNullOrWhiteSpace(v.Startovne)
            ? "Startovné: neuvedené."
            : $"Startovné: {v.Startovne.Trim()}");

        return string.Join("\n", radky);
    }

    /// <summary>
    /// J1 chce čas <b>vyzývacího znamení</b>, tedy T−5 podle ZPJ 26, ne čas
    /// startu. Časy dalších rozjížděk aplikace dopředu nezná — ty se
    /// setnou na rozpravě v den závodu (nález K6).
    /// </summary>
    private static string? VyzyvaciZnameni(VypsaniVstup v) =>
        v.PrvniVyzyvaciZnameni is not { } kdy
            ? null
            : $"Vyzývací znamení první rozjížďky: {Cas(kdy)}, {Den(DateOnly.FromDateTime(VPraze(kdy).DateTime))}.\n"
              + "Časy dalších rozjížděk oznámí závodní komise na rozpravě.";

    /// <summary>
    /// <b>Jádro celého dokumentu</b> (R8): bodování se vypisuje z týchž
    /// čísel, podle kterých se počítá, takže se s výpočtem nemůže rozejít.
    /// Pohár si vlastní bodování zvolit smí a J1.3(5) pro to má vlastní
    /// řádek — jen to musí být napsané, a ne v konstantě.
    /// </summary>
    private static string Bodovani(VypsaniVstup v)
    {
        var radky = new List<string>
        {
            "Boduje se podle Dodatku A Závodních pravidel jachtingu (nízkobodový "
            + "systém), s těmito odchylkami a doplňky poháru:",
            v.Vyhodnoceni switch
            {
                Vyhodnoceni.PoKategoriich => "• Pořadí regaty se vyhodnocuje uvnitř tříd.",
                Vyhodnoceni.CelePole => "• Pořadí regaty se vyhodnocuje v celém poli dohromady.",
                _ => "• Vyhlašuje se pořadí v celém poli i uvnitř tříd.",
            },
            Skrty("V této regatě", "rozjížďka", "rozjížďky", "rozjížděk", v.PocetSkrtu),
            $"• Diskvalifikace v regatě znamená do poháru pevných "
            + $"{Bodu(v.Pravidla.BodyZaDiskvalifikaci)}, bez ohledu na počet lodí.",
            $"• Loď, která nedokončila nebo nestartovala, dostává počet "
            + $"přihlášených lodí ve třídě plus {v.Pravidla.PrirazkaZaKod} (ZPJ A5.2).",
            $"• Náprava (RDG) dostává místo {v.Pravidla.PrirazkaZaNapravu} za lodí, "
            + "která dokončila jako poslední.",
            $"• Do celkového pořadí poháru jde výsledek této regaty s koeficientem "
            + $"{Cislo(v.KoeficientDoSerie)}.",
        };

        if (v.PosunDoSerie != 0)
            radky.Add($"• Umístěným lodím se do poháru připočítává {v.PosunDoSerie} "
                      + "(bonus této regaty; neúčasti se netýká).");

        radky.Add(Skrty("V celkovém pořadí poháru", "regata", "regaty", "regat", v.PocetSkrtuSerie));

        radky.Add($"Verze bodovacích pravidel: {v.Pravidla.Verze}. Ročník se "
                  + "dopočítává pořád podle ní, i kdyby se pravidla později upřesnila.");

        return string.Join("\n", radky);
    }

    // --- Čeština bez závislosti na kultuře stroje --------------------------
    // Tatáž úvaha jako u tabule (`rozjizdky-tabule.ts`): dokument má znít
    // česky a stejně kdekoliv, ne podle toho, s jakou kulturou běží server.

    private static readonly string[] Mesice =
    [
        "ledna", "února", "března", "dubna", "května", "června",
        "července", "srpna", "září", "října", "listopadu", "prosince",
    ];

    private static string Den(DateOnly d) => $"{d.Day}. {Mesice[d.Month - 1]} {d.Year}";

    /// <summary>
    /// Čas v pražské zóně, ne v zóně serveru. Regata se jede na Orlíku a
    /// „9:55" musí znamenat devět padesát pět tam.
    /// </summary>
    private static DateTimeOffset VPraze(DateTimeOffset kdy) =>
        TimeZoneInfo.ConvertTime(kdy, Praha);

    private static readonly TimeZoneInfo Praha =
        TimeZoneInfo.FindSystemTimeZoneById("Europe/Prague");

    private static string Cas(DateTimeOffset kdy) => VPraze(kdy).ToString("H:mm");

    private static string Bodu(int kolik) =>
        kolik == 1 ? "1 bod" : kolik < 5 ? $"{kolik} body" : $"{kolik} bodů";

    /// <summary>
    /// Řádek o škrtech, se správným tvarem. Čeština mění sloveso i podstatné
    /// jméno podle počtu, a „škrtá se 2 nejhorší rozjížďka" je v dokumentu,
    /// který má vydat pořadatel, vidět na první pohled.
    /// </summary>
    private static string Skrty(string kde, string jedna, string dve, string pet, int kolik) =>
        kolik switch
        {
            0 => $"• {kde} se žádná {jedna} neškrtá.",
            1 => $"• {kde} se škrtá jedna nejhorší {jedna}.",
            < 5 => $"• {kde} se škrtají {kolik} nejhorší {dve}.",
            _ => $"• {kde} se škrtá {kolik} nejhorších {pet}.",
        };

    /// <summary>Desetinná čárka a bez zbytečných nul: 1,0 → „1", 1,25 → „1,25".</summary>
    private static string Cislo(decimal c) =>
        c.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture).Replace('.', ',');
}
