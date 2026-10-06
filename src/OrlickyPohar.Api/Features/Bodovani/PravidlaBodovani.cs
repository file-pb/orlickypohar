namespace OrlickyPohar.Api.Features.Bodovani;

/// <summary>
/// Pravidla bodování v jedné verzi.
/// <para>
/// <b>Body se neukládají, počítají se při čtení</b> — a to je správně:
/// přepočet celého seriálu musí jít kdykoliv spustit znovu. Má to ale druhou
/// stranu, kterou ukázala oponentura (5. 10. 2026): dokud byla pravidla
/// konstanty v kódu, změnila oprava výpočtu body i u ročníku, který se
/// vyhlásil loni. Z uložených pořadí a kódů se pak nedá zjistit, podle čeho
/// se vyhlašovalo.
/// </para>
/// <para>
/// Parametry, které jsou věc <b>ročníku nebo závodu</b> — počet škrtů,
/// koeficient, bonus 24hodinovky — v datech už byly a zůstávají tam. Tady
/// jsou ty, které byly v kódu a přitom je rozhodčí může upřesnit.
/// </para>
/// <para>
/// <b>Nová verze nikdy nemění starší.</b> Až rozhodčí něco upřesní, přidá se
/// <c>V2</c> a ročníky s verzí 1 dál počítají podle jedničky. To je celý
/// smysl: uzavřený ročník se nehýbe.
/// </para>
/// </summary>
public sealed record PravidlaBodovani
{
    /// <summary>Číslo verze. Je v datech ročníku, takže se nedá splést.</summary>
    public required int Verze { get; init; }

    /// <summary>
    /// Diskvalifikace v celé regatě: pevné body do seriálu, nezávislé na
    /// počtu lodí. Podklady rozhodčího Miloše Zvonaře, 22. 9. 2026.
    /// </summary>
    public required int BodyZaDiskvalifikaci { get; init; }

    /// <summary>
    /// O kolik je kód horší než počet lodí přihlášených do závodu. ZPJ
    /// 2025–2028, A5.2: „počet přihlášených lodí ve třídě plus 1".
    /// </summary>
    public required int PrirazkaZaKod { get; init; }

    /// <summary>
    /// O kolik je náprava (<c>RDG</c>) horší než poslední dokončivší.
    /// Není to trest a její body určuje protestní komise; než to umí fáze 5,
    /// dostává místo hned za posledním, kdo dojel.
    /// </summary>
    public required int PrirazkaZaNapravu { get; init; }

    /// <summary>
    /// Pravidla, podle kterých se bodoval ročník 2026 a 2027: doložená
    /// podklady rozhodčího z 22. 9. 2026 a listinou FxCK Cancer.
    /// <b>Nemění se nikdy</b> — čím se jednou vyhlásilo, tím zůstane.
    /// </summary>
    public static readonly PravidlaBodovani V1 = new()
    {
        Verze = 1,
        BodyZaDiskvalifikaci = 20,
        PrirazkaZaKod = 1,
        PrirazkaZaNapravu = 1,
    };

    /// <summary>Verze, kterou dostane nový ročník.</summary>
    public static readonly PravidlaBodovani Posledni = V1;

    /// <summary>
    /// Pravidla podle čísla z ročníku. Neznámá verze je chyba, ne tichý
    /// návrat k poslední — ročník s verzí, kterou tenhle kód nezná, se
    /// nesmí spočítat podle něčeho jiného, než podle čeho se vyhlašoval.
    /// </summary>
    public static PravidlaBodovani Podle(int verze) => verze switch
    {
        1 => V1,
        _ => throw new ArgumentOutOfRangeException(nameof(verze),
            $"Bodovací pravidla verze {verze} tenhle kód nezná. "
            + "Ročník se spočítat nedá — doplň verzi do PravidlaBodovani."),
    };
}
