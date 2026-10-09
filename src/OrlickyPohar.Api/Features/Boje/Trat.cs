using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Kam došla stavba trati.
/// <para>
/// <b>Zveřejnění není samostatný knoflík</b> (plán, <i>Trať je veřejná,
/// jakmile ji rozhodčí přijme</i>): veřejně se vydává jedině
/// <see cref="Prijato"/>.
/// </para>
/// </summary>
public enum StavTrati
{
    /// <summary>Staví se. Veřejně není co ukázat — nikdo nic nepotvrdil.</summary>
    Rozestaveno = 0,

    /// <summary>Stavitelé hlásí hotovo a trať čeká na rozhodčího.</summary>
    Hotovo = 1,

    /// <summary>Rozhodčí přijal: trať je zamčená a veřejná.</summary>
    Prijato = 2,

    /// <summary>
    /// Přijatá trať se přestavuje.
    /// <para>
    /// <b>Veřejně to znamená „počkej", ne nic.</b> Někdo už má GPX
    /// v plotteru a popluje k bóji, která se mezitím posunula; tiché
    /// zmizení vypadá jako chyba a starý obrázek lže.
    /// </para>
    /// </summary>
    Prestavba = 3,
}

/// <summary>
/// Jedna stavba trati v čase: od rozestavění po přijetí rozhodčím.
///
/// <para>
/// <b>Normální stav je jedna zamčená trať.</b> Přestavba trati, kterou už
/// rozhodčí přijal, je <b>výjimka, ne režim</b> (Filip, 9. 10. 2026:
/// <i>„systémově to nechci, ale může se to stát"</i>) — vítr odfoukne bójku
/// nebo ji někdo ukradne, a to se stane i v průběhu rozjížďky. Zapsat to
/// model umět musí; nabízet to jako běžnou cestu ne.
/// </para>
///
/// <para>
/// Proto je tu <see cref="NahrazujeId"/> a ne seznam tratí u rozjížďky:
/// když k výjimce dojde, vznikne nová trať navázaná na starou a historie
/// je řetěz, který jde projít zpátky. Model, ve kterém má rozjížďka trať
/// jedinou a přepisuje se, by si musel vybrat, která z nich je ta pravá —
/// a každá odpověď by byla lež.
/// </para>
///
/// <para>
/// <b><c>RozjizdkaId</c> je nullable.</b> Trať se staví dřív, než rozjížďka
/// vznikne, a u jednorozjížďkové regaty se k ní nemusí přiřadit nikdy.
/// </para>
///
/// <para>
/// <b>Které bóje k trati patří, tenhle krok neřeší.</b> Dokud se trať
/// nevybírá a neklonuje, je to „co zrovna stojí u téhle regaty" — a to už
/// vrací <c>BojeEndpoints</c>. Výslovné členství přijde s výběrem
/// a klonováním a nahradí ho pak prvky trati.
/// </para>
/// </summary>
public class Trat
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    public int? RozjizdkaId { get; set; }
    public Rozjizdka? Rozjizdka { get; set; }

    public StavTrati Stav { get; set; } = StavTrati.Rozestaveno;

    public DateTimeOffset ZalozenaV { get; set; }

    /// <summary>
    /// Trať, kterou tahle nahradila. Řetěz přestaveb tak jde projít zpátky,
    /// stejně jako u bóje — a u krizové přestavby je to jediný záznam
    /// o tom, že se trať během závodu měnila.
    /// </summary>
    public int? NahrazujeId { get; set; }
    public Trat? Nahrazuje { get; set; }

    /// <summary>Kdy a kdo ji přijal. Od té chvíle je zamčená a veřejná.</summary>
    public DateTimeOffset? PrijatoV { get; set; }
    public Guid? PrijalId { get; set; }
    public Uzivatel? Prijal { get; set; }

    /// <summary>
    /// Proč ji rozhodčí vrátil stavitelům. <b>Bez důvodu je vrácení jen
    /// „ne"</b> — stejně jako u revize výsledků: kdo ji má dodělat, musí
    /// vědět co.
    /// </summary>
    public string? DuvodVraceni { get; set; }

    /// <summary>Zamčená trať se nedá přestavovat, jen nahradit novou.</summary>
    public bool Zamcena => Stav == StavTrati.Prijato;
}

/// <summary>Stav trati, jak ho vidí správa.</summary>
public record TratDto(
    int Id,
    StavTrati Stav,
    DateTimeOffset ZalozenaV,
    DateTimeOffset? PrijatoV,
    string? Prijal,
    string? DuvodVraceni,
    int? RozjizdkaId,
    /// <summary>
    /// Trať, kterou tahle nahradila. Jediná viditelná stopa po krizové
    /// přestavbě — bez ní by obrazovka tvrdila, že trať vznikla z ničeho.
    /// </summary>
    int? NahrazujeId,
    /// <summary>Odjela podle ní nějaká rozjížďka? Pak se už nepřestavuje.</summary>
    bool Odjeta,
    bool SmiHlasitHotovo,
    bool SmiPrijmout,
    bool SmiPrestavet);

/// <summary>
/// Bóje, jak ji vidí divák: <b>jen kam se pluje</b>.
/// <para>
/// Chybí tu schválně jméno stavitele, přesnost měření, čas postavení
/// i fotky. Nic z toho závodníkovi k navigaci nepomůže a jméno s přesností
/// jsou údaje o tom, kdo a jak měřil — to patří do správy.
/// </para>
/// </summary>
public record VerejnaBojeDto(string Nazev, int Poradi, double Sirka, double Delka);

/// <summary>
/// Trať pro veřejnost. Vydává se jedině přijatá; u přestavby se vrací
/// <see cref="Prestavba"/> a bóje se zamlčí, protože starý obrázek lže
/// a tiché zmizení vypadá jako chyba.
/// </summary>
public record VerejnaTratDto(
    bool Prestavba,
    DateTimeOffset? PrijatoV,
    IReadOnlyList<VerejnaBojeDto> Boje);

/// <summary>
/// Pravidla stavu trati. Čisté funkce, aby se na ně dalo odpovědět bez
/// databáze — role a „odjelo se podle ní" řeší volající.
/// </summary>
public static class Stavba
{
    public const int DuvodNejvic = 300;

    /// <summary>Proč nejde hlásit hotovo — nebo <c>null</c>.</summary>
    public static string? ProcNejdeHotovo(StavTrati stav) => stav switch
    {
        StavTrati.Rozestaveno or StavTrati.Prestavba => null,
        StavTrati.Hotovo => "Hotovo už je nahlášené, trať čeká na rozhodčího.",
        _ => "Trať je přijatá a zamčená. Na úpravu ji nejdřív odemkni přestavbou.",
    };

    /// <summary>Proč nejde přijmout — nebo <c>null</c>. Smí jen rozhodčí.</summary>
    public static string? ProcNejdePrijmout(StavTrati stav) => stav switch
    {
        StavTrati.Hotovo => null,
        StavTrati.Prijato => "Tahle trať je už přijatá.",
        _ => "Stavitelé zatím nehlásili hotovo. Přijmout jde trať, o které někdo řekl, že stojí.",
    };

    /// <summary>
    /// Proč nejde vrátit stavitelům — nebo <c>null</c>. Smí jen rozhodčí
    /// a důvod je povinný.
    /// </summary>
    public static string? ProcNejdeVratit(StavTrati stav, string? duvod)
    {
        if (stav != StavTrati.Hotovo)
            return "Vrátit jde jen trať, která čeká na přijetí.";

        var oriznuty = duvod?.Trim();
        if (string.IsNullOrEmpty(oriznuty))
            return "Napiš, co na trati chybí. Vrácení bez důvodu je jen „ne“ a stavitelé "
                   + "nevědí, co mají dodělat.";

        return oriznuty.Length > DuvodNejvic
            ? $"Důvod má nejvýš {DuvodNejvic} znaků."
            : null;
    }

    /// <summary>
    /// Proč nejde odemknout na přestavbu — nebo <c>null</c>.
    /// <para>
    /// <b>Odjetá trať se nepřestavuje, nahrazuje se novou</b> (Filip,
    /// 9. 10. 2026): podle té se už jelo, počítalo se z ní pořadí a jednou
    /// podle ní možná hendikep. Volající v tom případě založí novou trať —
    /// není to chyba, je to jiná cesta.
    /// </para>
    /// </summary>
    public static string? ProcNejdePrestavba(StavTrati stav) => stav switch
    {
        StavTrati.Prijato => null,
        StavTrati.Prestavba => "Trať se už přestavuje.",
        _ => "Přestavět jde jen přijatá trať. Rozestavěnou prostě dostav.",
    };

    /// <summary>
    /// Veřejně se vydává přijatá trať; u přestavby se místo ní říká, že se
    /// přestavuje. Rozestavěná trať veřejně neexistuje.
    /// </summary>
    public static bool JeVerejna(StavTrati stav) =>
        stav is StavTrati.Prijato or StavTrati.Prestavba;
}
