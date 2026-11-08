namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Co se s rozjížďkou dělá kolem startu.</summary>
public enum DruhProcedury
{
    /// <summary>
    /// Spustit startovní proceduru: od teď běží odpočet a start padne za
    /// tolik minut, kolik má regata nastaveno (ZPJ 26).
    /// </summary>
    Spustit = 0,

    /// <summary>
    /// <b>Odložení před startem</b> — ZPJ 27.3, vlajka AP. Nový čas je
    /// volný: odkládá se *„z jakékoli příčiny"*, typicky kvůli počasí, a
    /// kdy se pojede, rozhodne startér.
    /// </summary>
    Odlozit = 1,

    /// <summary>
    /// <b>Všeobecné odvolání po startu</b> — ZPJ 29.2, vyvěšení prvního
    /// opakovače. <b>Nový čas z toho ještě nevyjde</b>: běží od okamžiku,
    /// kdy se opakovač <em>svěsí</em>, a to je samostatný úkon
    /// (<see cref="OpakovacDolu"/>).
    /// </summary>
    Odvolat = 2,

    /// <summary>
    /// <b>První opakovač dolů</b> — tím začíná nový start odvolané
    /// rozjížďky. ZPJ 29.2: *„Vyzývací znamení nového startu odvolané
    /// třídy musí být dáno jednu minutu poté, co je první opakovač
    /// <b>svěšen</b> (jeden zvukový signál)."*
    /// <para>
    /// <b>Proč je to krok zvlášť</b> (Filip, 8. 11. 2026: *„ta minuta se
    /// mi nějak nezdá"*, a po doložení znění *„po stisku toho tlačítka
    /// musí být vyvěšeno modální okno, které informuje o tom stavu, a
    /// v okamžiku, kdy ho zavřeme, běží ona minuta"*). Do té doby se
    /// nový čas počítal od <see cref="Odvolat"/>, tedy od vyvěšení —
    /// a to platí jedině tehdy, kdyby komise opakovač svěsila v tutéž
    /// vteřinu, kdy ho vytáhla. Na vodě visí, dokud se pole nevrátí za
    /// čáru, a <b>jak dlouho, pravidlo neurčuje vůbec</b>: rozhoduje
    /// komise. Dopočítaný čas startu tedy neplatil a appka ho ukazovala
    /// posádkám.
    /// </para>
    /// </summary>
    OpakovacDolu = 3,
}

/// <summary>
/// <b>Startovní procedura podle ZPJ 26 a její přerušení.</b> Čisté funkce,
/// bez databáze.
///
/// <para>
/// <b>Proč to vzniklo</b> (nálezy R5 a R12 oponentury rozhodčího,
/// 28. 10. 2026). Rozhodčí Miloš Zvonař vyjmenoval, co proceduru tvoří:
/// *„5 minut výzva · 4 minuty Přípravné znamení · 1 minuta do startu ·
/// Start"* — doslova pravidlo 26. Aplikace z té tabulky znala **jediný
/// řádek, ten poslední**: zápis času startu, který rozjížďku rovnou
/// rozjel. Nebylo tedy kam zapsat ani jeden z úkonů, které pravidla
/// ukládají závodní komisi kolem startu.
/// </para>
///
/// <para>
/// <b>Role aplikace je „drží čas a paměť, znamení dává člověk"</b>
/// (nález R15). Vizuální znamení pro pole z obrazovky nebude — závodníci
/// na vodě nevidí startérův telefon a tabule visí v klubovně. Co aplikace
/// umí, je odpočítávat, zaznamenat, co platilo, a zapsat následky.
/// </para>
///
/// <para>
/// <b>Přerušení nejsou jedna věc, ale dvě, a dělí je startovní znamení</b>
/// (R12). Před startem se <b>odkládá</b> (27.3) a nový čas je volný; po
/// startu se <b>všeobecně odvolává</b> (29.2) a nový čas volný není.
/// Jsou to navíc různé důvody — odložit jde kvůli počasí, odvolat kvůli
/// tomu, že lodě nejdou rozpoznat nebo se stala chyba v proceduře.
/// </para>
/// </summary>
public static class Procedura
{
    /// <summary>
    /// Výchozí délka procedury v minutách — pět, jak ji vyjmenoval
    /// rozhodčí i pravidlo 26.
    /// <para>
    /// <b>Je to výchozí hodnota, ne konstanta</b>: pravidlo 26 má u pětky
    /// hvězdičku (*„nebo tak, jak je stanoveno ve vypsání závodu nebo
    /// v plachetních směrnicích"*), takže délka je parametr regaty
    /// (<see cref="Zavod.DelkaProceduryMin"/>) a tiskne se do vypsání.
    /// </para>
    /// </summary>
    public const int DelkaVychozi = 5;

    /// <summary>Nejkratší a nejdelší rozumná procedura. Mez, ne pravidlo.</summary>
    public const int DelkaNejmene = 1;
    public const int DelkaNejvic = 60;

    /// <summary>
    /// Jak dlouho po <b>svěšení</b> prvního opakovače padne vyzývací
    /// znamení nového startu — ZPJ 29.2 doslova *„jednu minutu poté, co
    /// je první opakovač svěšen"*.
    /// <para>
    /// <b>Měří se od svěšení, ne od vyvěšení.</b> Jméno zůstalo, protože
    /// odkazuje na pravidlo; okamžik, od kterého se počítá, nese
    /// <see cref="DruhProcedury.OpakovacDolu"/>.
    /// </para>
    /// </summary>
    public static readonly TimeSpan PoOdvolani = TimeSpan.FromMinutes(1);

    /// <summary>Proč délka procedury nejde uložit — nebo <c>null</c>.</summary>
    public static string? ProcNejdeDelka(int? minut) =>
        minut is { } m && (m < DelkaNejmene || m > DelkaNejvic)
            ? $"Startovní procedura trvá {DelkaNejmene} až {DelkaNejvic} minut."
            : null;

    /// <summary>
    /// Proč ten úkon na téhle rozjížďce nejde — nebo <c>null</c>.
    /// <para>
    /// <b>Odložení a odvolání se nezaměňují</b>, a není to formalita:
    /// liší se v tom, kdy se smějí použít i jaký čas z nich vyjde. Kdyby
    /// aplikace nabídla obojí vždycky, startér by si v tlačítkách vybíral
    /// podle jména, ne podle toho, co se stalo.
    /// </para>
    /// </summary>
    /// <param name="opakovacOd">
    /// Kdy byl vyvěšen první opakovač, pokud ještě visí
    /// (<see cref="Rozjizdka.OpakovacOd"/>). Dokud visí, je jediný úkon
    /// <see cref="DruhProcedury.OpakovacDolu"/> — nový start odvolané
    /// rozjížďky se počítá od svěšení, takže cokoliv jiného by tu minutu
    /// obešlo.
    /// </param>
    public static string? ProcNejde(
        DruhProcedury druh,
        StavRozjizdky stav,
        DateTimeOffset? startV,
        DateTimeOffset? opakovacOd = null) =>
        (druh, stav) switch
        {
            (_, StavRozjizdky.Zrusena) =>
                "Rozjížďka je zrušená, takže se nestartuje. Vrať ji do hry.",
            (_, StavRozjizdky.Dokoncena) =>
                "Rozjížďka je dojetá. Nový start je opakování startu — pusť nejdřív časomíru znovu.",

            // <b>Dokud opakovač visí, nic jiného se nestartuje.</b> Nový
            // start se počítá od jeho svěšení, takže spuštění procedury
            // nebo druhé odvolání by tu minutu obešly — a startér by měl
            // na obrazovce čas, který pravidlo nedává.
            (not DruhProcedury.OpakovacDolu, _) when opakovacOd is not null =>
                "Visí první opakovač. Nejdřív ho svěs — od toho okamžiku běží "
                + "minuta do vyzývacího znamení (ZPJ 29.2).",

            // Spustit proceduru dvakrát by posunulo start dopředu a lodím,
            // které podle prvního odpočtu najíždějí, vzalo minuty.
            (DruhProcedury.Spustit, StavRozjizdky.Probiha) =>
                "Rozjížďka už jede. Na nový start je všeobecné odvolání.",

            (DruhProcedury.Odlozit, StavRozjizdky.Probiha) =>
                "Rozjížďka už odstartovala, takže se neodkládá (ZPJ 27.3 platí před startem). "
                + "Po startu je na to všeobecné odvolání.",
            (DruhProcedury.Odlozit, _) when startV is null =>
                "Rozjížďka nemá nastavený čas startu, takže není co odložit.",

            // 29.2 mluví o odvolání *startu*; dokud se nestartovalo, je to
            // odložení. Bez téhle meze by se odvoláním dal vyrobit čas
            // T+1+procedura u rozjížďky, která na startu teprve stojí.
            (DruhProcedury.Odvolat, StavRozjizdky.Planovana) =>
                "Rozjížďka ještě nestartovala, takže není co odvolat (ZPJ 29.2 platí po startu). "
                + "Před startem se odkládá.",

            // Svěsit jde jen to, co visí. Jediná výjimka je rozjížďka,
            // která na serveru pořád „probíhá": tam odvolání nedoletělo
            // ze vody a svěšení ho dohání, viz `JeOpakovanyStart`.
            (DruhProcedury.OpakovacDolu, StavRozjizdky.Planovana) when opakovacOd is null =>
                "Žádný opakovač nevisí, takže není co svěsit. Nový start "
                + "odvolané rozjížďky začíná všeobecným odvoláním.",

            _ => null,
        };

    /// <summary>
    /// Nový čas startu po tom úkonu. <c>null</c> znamená „žádný" — tedy
    /// odložení, po kterém se čas volí znovu.
    /// </summary>
    /// <param name="delkaMinut">Délka procedury regaty; hvězdička u ZPJ 26.</param>
    public static DateTimeOffset? NovyStart(DruhProcedury druh, DateTimeOffset ted, int delkaMinut) =>
        druh switch
        {
            DruhProcedury.Spustit => ted.AddMinutes(delkaMinut),

            // <b>Volný čas, ne dopočítaný</b> (ZPJ 27.3). Odložená
            // rozjížďka čeká, až startér řekne kdy — a to je plánovaný
            // start, který aplikace od 28. 10. 2026 umí zapsat (K6).
            DruhProcedury.Odlozit => null,

            // <b>Odvolání samo žádný čas nedává</b> (ZPJ 29.2). Opakovač
            // je vyvěšený a visí, dokud se pole nevrátí za čáru; minuta
            // běží teprve od jeho svěšení. Dopočítat čas už tady by
            // znamenalo ukázat posádkám start, který pravidlo neslibuje
            // — a který by komise přestřelila, kdykoliv opakovač podrží
            // delší než vteřinu.
            DruhProcedury.Odvolat => null,

            // <b>Tady volný není</b>: od svěšení opakovače minuta do
            // vyzývacího znamení a od něj celá procedura.
            DruhProcedury.OpakovacDolu => ted + PoOdvolani + TimeSpan.FromMinutes(delkaMinut),

            _ => null,
        };

    /// <summary>
    /// Stav rozjížďky po tom úkonu. Všechny tři ji nechávají nebo vracejí
    /// mezi <b>plánované</b>: procedura znamená, že se teprve pojede.
    /// </summary>
    public static StavRozjizdky StavPo(DruhProcedury druh) => StavRozjizdky.Planovana;

    /// <summary>
    /// Je ten úkon opakováním startu (ZPJ 36)? Jen všeobecné odvolání —
    /// odložená rozjížďka se nestartovala, takže se ani neopakuje.
    /// <para>
    /// Počítá se kvůli tomu, že se to dnes <b>nikam nezapisovalo</b>:
    /// nový start přepsal čas a tím po předchozím pokusu nezbylo nic
    /// (R5, tabulka u pravidla 36).
    /// </para>
    /// </summary>
    public static bool JeOpakovanyStart(DruhProcedury druh) => druh == DruhProcedury.Odvolat;

    /// <summary>
    /// Visí po tom úkonu první opakovač? Vyvěsí ho odvolání a svěsí
    /// kterýkoliv další úkon — odklad včetně, protože AP se nad visícím
    /// opakovačem nevyvěšuje.
    /// </summary>
    public static bool VisiOpakovac(DruhProcedury druh) => druh == DruhProcedury.Odvolat;
}
