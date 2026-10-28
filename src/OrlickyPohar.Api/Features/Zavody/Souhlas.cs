namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// <b>Souhlas závodníka s pravidly a vlastním nebezpečím.</b>
///
/// <para>
/// <b>Proč to má vlastní modul</b> (nález R9 oponentury rozhodčího,
/// 28. 10. 2026 — podle ní nejvážnější nález celého dokumentu). Miloš
/// Zvonař 27. 10. 2026: *„Jede se to na vlastní nebezpečí."* A protože
/// pohár pořadatelsky ofiko není, je tahle věta spolu se souhlasem
/// s pravidly <b>jediná vazba mezi závodníkem a tím, podle čeho se jede</b>.
/// U závodu pod svazem váže závodníka členství a licence; tady ho neváže
/// nic než to, co odklikl při přihlášení (ZPJ 4.1(a), J1.2(12)).
/// </para>
///
/// <para>
/// <b>Co bylo špatně.</b> Formulář souhlas sbíral a server ho vynucoval,
/// jenže byl <b>o něčem jiném</b> — o zveřejnění lodi ve startovní listině
/// a o kontaktu, tedy o osobních údajích. O pravidlech ani o vlastním
/// nebezpečí v něm nestálo ani slovo, zatímco dokumentace toho parametru
/// tvrdila *„Kapitán potvrdil pravidla a zveřejnění lodi"*. Rozpor uvnitř
/// aplikace: kdo četl kód, viděl, že souhlas s pravidly se sbírá.
/// A i kdyby znění bylo správné, <b>nezůstal po něm žádný záznam</b>.
/// </para>
///
/// <para>
/// <b>Znění se verzuje a starší verze se nemění.</b> Stejné pravidlo jako
/// u <c>PravidlaBodovani</c>: *„souhlasil"* bez toho, s čím souhlasil,
/// nedokládá nic, takže se k přihlášce ukládá číslo verze a text té verze
/// drží kód. Až se znění upřesní, přibude <c>V2</c> a u starších přihlášek
/// dál platí, co tehdy odklikly.
/// </para>
///
/// <para>
/// <b>Mez, kterou tohle nepřekračuje:</b> jestli takový souhlas něco
/// právně znamená, tenhle kód neřeší a tvrdit to nemůže. Řeší jen to, že
/// znění odpovídá tomu, co se po něm chce, a že po něm zůstane doklad —
/// kdy, s jakým zněním a kudy přišel.
/// </para>
/// </summary>
public static class Souhlas
{
    /// <summary>Verze, kterou dostane souhlas daný dnes.</summary>
    public const int Verze = 2;

    /// <summary>
    /// Znění verze 1, platné 28. 10. 2026 (jen pár hodin, než ho nahradila
    /// verze 2). <b>Nemění se nikdy</b> — co se jednou odkliklo, tím
    /// zůstane, a bez tohohle textu by u lodí s jedničkou nešlo zjistit,
    /// s čím souhlasily.
    /// <para>
    /// Pokrývalo tři věci: pravidla (J1.2(12) na ně má jmenovitě
    /// sousloví), vlastní nebezpečí (ZPJ 4.3 a Milošovo *„jede se to na
    /// vlastní nebezpečí"*) a zveřejnění lodi s kontaktem. <b>O sledování
    /// v něm nebylo nic</b> — to je ten rozdíl proti verzi 2.
    /// </para>
    /// </summary>
    public const string ZneniV1 =
        "Souhlasím s tím, že budu vázán Závodními pravidly jachtingu a všemi "
        + "dalšími pravidly, která řídí tento závod, a že se závodu účastním "
        + "na vlastní nebezpečí. Beru na vědomí, že loď bude ve startovní "
        + "listině a že se pořadatel může ozvat na uvedený kontakt.";

    /// <summary>
    /// Znění verze 2, platné od 28. 10. 2026. Nová je <b>poslední věta</b>
    /// o sledování.
    ///
    /// <para>
    /// <b>Proč přibyla</b> (Filip při ověřování fáze 2, 28. 10. 2026:
    /// *„souhlas závodníka se sledovanim"*). Verze 1 nesla pravidla,
    /// vlastní nebezpečí a zveřejnění lodi — o trasování v ní nebylo ani
    /// slovo, přestože appka nahrává polohu každých pět vteřin a
    /// <c>NastaveniTrackeru</c> rozhoduje, kdo ji uvidí. Souvisí to
    /// s nálezy N3 a N5 v <c>docs/OPONENTURA-TRACKING.md</c>
    /// (*„Kdo odjíždí, vypnout si to nemůže"* a *„Nastavení, které nikdo
    /// nečte"*).
    /// </para>
    /// <para>
    /// <b>Text v témže zaškrtávátku, ne druhé zaškrtávátko</b> (rozhodl
    /// Filip): další klepnutí by nic nepřidalo.
    /// </para>
    /// <para>
    /// <b>Dvě věci ve formulaci jsou schválně.</b> *„Během závodního dne"*
    /// odpovídá tomu, že se trasy dnes berou od rozpravy do uzavření dne —
    /// kdyby prošel nález R3 a brána se posunula k přihláškám, musí se
    /// tahle věta změnit spolu s ní (a to je důvod navíc pro verzování).
    /// A *„vidí pořadatel a rozhodčí"* je oddělené od *„podle nastavení
    /// regaty"*, protože první platí vždycky, kdežto druhé řídí
    /// <c>CoVidiPosadky</c> a <c>ZivyPrenosVen</c>; výchozí hodnota je
    /// „posádky jen sebe, ven nic".
    /// </para>
    /// </summary>
    public const string ZneniV2 =
        ZneniV1
        + " Beru na vědomí, že poloha lodi se během závodního dne zaznamenává, "
        + "že ji vidí pořadatel a rozhodčí, a že podle nastavení regaty může "
        + "být vidět i ostatním lodím, na webu a na tabuli.";

    /// <summary>Znění, které se sbírá dnes.</summary>
    public const string Zneni = ZneniV2;

    /// <summary>Hláška, když souhlas nepřišel.</summary>
    public const string Chybi =
        "Potvrď souhlas s pravidly závodu, s účastí na vlastní nebezpečí, "
        + "se zveřejněním lodi ve startovní listině a se zaznamenáváním "
        + "polohy během závodního dne.";

    /// <summary>
    /// Co o souhlasu říct pořadateli, když loď zapisuje sám.
    /// <para>
    /// <b>Pořadatel ho nedává za kapitána</b>, jen zaznamenává, že ho od něj
    /// má — proto jiné znění než ve veřejném formuláři. Kdo záznam pořídil,
    /// se dá dohledat z <see cref="ZmenaUcasti.UzivatelId"/> u vzniku
    /// přihlášky.
    /// </para>
    /// </summary>
    public const string ZaKapitana =
        "Kapitán mi potvrdil souhlas s pravidly závodu, s účastí na vlastní "
        + "nebezpečí a se zaznamenáváním polohy lodi.";

    /// <summary>
    /// Znění podle čísla verze. Neznámá verze je chyba, ne tichý návrat
    /// k poslednímu znění — u přihlášky s verzí, kterou tenhle kód nezná,
    /// se nesmí ukázat text, se kterým kapitán nesouhlasil.
    /// </summary>
    public static string Podle(int verze) => verze switch
    {
        // <b>Jednička tu musí zůstat navždy.</b> Souhlas se ukládá
        // i s verzí právě proto, aby šlo dohledat, s čím kdo souhlasil —
        // přepsat starý text novým by ten smysl zrušilo. A rozdíl je tu
        // věcný: lodě s verzí 1 se <b>sledováním nesouhlasily</b>.
        1 => ZneniV1,
        2 => ZneniV2,
        _ => throw new ArgumentOutOfRangeException(
            nameof(verze), verze, "Tahle verze znění souhlasu není známá."),
    };
}
