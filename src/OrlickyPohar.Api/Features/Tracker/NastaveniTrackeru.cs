using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Tracker;

/// <summary>
/// Co vidí posádky za jízdy.
/// <para>
/// Hodnoty jdou od nejpřísnější k nejvolnější schválně — po zamčení se
/// smí jen zpřísnit, a to je potom porovnání čísel, ne tabulka výjimek.
/// </para>
/// </summary>
public enum CoVidiPosadky
{
    /// <summary>Nic. Trackuje se, ale posádka na vodě nevidí ani sebe.</summary>
    Nic = 0,

    /// <summary>Jen vlastní polohu nad tratí. <b>Výchozí hodnota.</b></summary>
    JenSebe = 1,

    /// <summary>I ostatní lodě. Tohle je ta volba, která se po rozpravě zapnout nedá.</summary>
    IOstatni = 2,
}

/// <summary>
/// Nastavení zobrazení trackingu na jedné regatě.
/// <para>
/// <b>Tři přepínače, ne matice režimů</b> (plán, *Tři přepínače na
/// regatu*). Míchaly se dvě různé otázky: <i>kdy</i> se smí dívat a
/// <i>koho</i> je vidět. Drží se zvlášť.
/// </para>
/// <para>
/// <b>Zamyká rozprava, ne start</b> (Filip, 24. 10. 2026). Tracker běží od
/// rozpravy, takže mezi rozpravou a startem už polohy chodí — a to je
/// přesně okno, ve kterém by šlo nastavení překlopit podle toho, co je na
/// mapě vidět. Zámek má zavírat dřív, než je z čeho vyvozovat.
/// </para>
/// <para>
/// <b>Zamrzne i to, co nikdo nenastavil</b>, takže výchozí hodnota musí být
/// bezpečná: posádky jen sebe, ven nic.
/// </para>
/// </summary>
public class NastaveniTrackeru
{
    public int Id { get; set; }

    public int ZavodId { get; set; }
    public Zavod? Zavod { get; set; }

    public CoVidiPosadky CoVidiPosadky { get; set; } = CoVidiPosadky.JenSebe;

    /// <summary>Živý přenos ven — na web i na tabuli. Zamyká se.</summary>
    public bool ZivyPrenosVen { get; set; }

    /// <summary>
    /// Jízdy po regatě veřejně. <b>Nezamyká se</b>: rozhoduje se o nich až
    /// po závodě a na jeho průběh nemají vliv.
    /// </summary>
    public bool JizdyPoRegateVerejne { get; set; }

    /// <summary>
    /// Kdy nastavení zaklaplo. U vícedenní regaty to udělá <b>ta první</b>
    /// rozprava — jinak by se mezi dny dalo překlopit vidění ostatních
    /// podle toho, jak to komu vyšlo první den.
    /// </summary>
    public DateTimeOffset? ZamcenoV { get; set; }

    public List<ZmenaNastaveniTrackeru> Zmeny { get; set; } = [];

    public bool Zamceno => ZamcenoV is not null;
}

/// <summary>
/// Jedna změna nastavení: kdo, kdy, z čeho na co a proč.
/// <para>
/// <b>Zamčené nastavení je zároveň doklad.</b> Spor *„vy jste nás viděli
/// a my vás ne"* nemá dnes podle čeho rozhodnout; záznam s časem a s tím,
/// kdo ho nastavil, ho rozhoduje sám. Po regatě se jinak nedá zjistit,
/// proč se to vypnulo.
/// </para>
/// </summary>
public class ZmenaNastaveniTrackeru
{
    public int Id { get; set; }

    public int NastaveniId { get; set; }
    public NastaveniTrackeru? Nastaveni { get; set; }

    public DateTimeOffset Kdy { get; set; }

    public Guid UzivatelId { get; set; }

    public CoVidiPosadky ZPosadky { get; set; }
    public CoVidiPosadky NaPosadky { get; set; }
    public bool ZVen { get; set; }
    public bool NaVen { get; set; }
    public bool ZJizdy { get; set; }
    public bool NaJizdy { get; set; }

    /// <summary>Proč. Po zamčení povinné — bez důvodu se zásah neuloží.</summary>
    public string? Duvod { get; set; }

    /// <summary>Byla regata v okamžiku změny už zamčená?</summary>
    public bool PoZamku { get; set; }
}
