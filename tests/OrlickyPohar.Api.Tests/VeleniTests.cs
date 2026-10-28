using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Velitelský čas: kdo drží start (nález R19 oponentury rozhodčího,
/// rozhodnuto Filipem 28. 10. 2026). Čisté funkce, bez databáze.
/// <para>
/// Filip, 27. 10. 2026: *„Startér může být jeden hlavní a druhý slave
/// u druhého bodu startovní čáry… Velitelský čas je ale jeden, je
/// v rukách hlavního startéra a nesmí být závislý."*
/// </para>
/// </summary>
public class VeleniTests
{
    private static readonly Guid Hlavni = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly Guid Slave = Guid.Parse("22222222-2222-2222-2222-222222222222");

    /// <summary>
    /// <b>Jádro velitelského času:</b> start, který zapsal hlavní startér,
    /// nesmí přepsat nikdo jiný. Slave u druhého bodu čáry zapisuje
    /// dojezdy dál; co nesmí, je sáhnout na čas, kterým se měří pole.
    /// </summary>
    [Fact]
    public void Slave_neprepise_start_od_velitele()
    {
        var chyba = Veleni.ProcNesmiPrepsatStart(Hlavni, Slave, startUzJe: true);

        Assert.NotNull(chyba);
        Assert.Contains("převezmi velení", chyba);
    }

    /// <summary>
    /// <b>Opačně to jde.</b> Velitel smí přepsat start kohokoliv — právě
    /// proto je velitelský, a je to i cesta ven z krize: *„jakmile se
    /// připojí, dojde k nastavení nového velitele, převzetí času a jedeme
    /// standard"* (Filip, 27. 10. 2026).
    /// </summary>
    [Fact]
    public void Velitel_prepise_start_kohokoliv()
    {
        Assert.Null(Veleni.ProcNesmiPrepsatStart(Hlavni, Hlavni, startUzJe: true));
    }

    /// <summary>
    /// Dokud velitelův start není, smí ho zapsat kdokoliv, kdo smí
    /// zapisovat — slave u druhého bodu čáry taky. Chrání se **přepsání**
    /// autoritativního času, ne zápis jako takový.
    /// </summary>
    [Fact]
    public void Bez_velitelova_startu_zapise_kdokoliv()
    {
        Assert.Null(Veleni.ProcNesmiPrepsatStart(Hlavni, Slave, startUzJe: false));
    }

    /// <summary>
    /// <b>Regata bez velitele se chová jako dřív.</b> Velení je nástroj
    /// pro den, kdy jsou startéři dva; vynucovat ho tam, kde je startér
    /// jeden, by znamenalo klepnutí navíc bez užitku.
    /// </summary>
    [Fact]
    public void Bez_velitele_se_nic_nehlida()
    {
        Assert.Null(Veleni.ProcNesmiPrepsatStart(null, Slave, startUzJe: true));
    }

    /// <summary>
    /// <b>Převzít velení jde kdykoliv</b>, i uprostřed odpočtu. Hlavní
    /// spadlý do vody tři minuty před startem je přesně ten případ,
    /// kvůli kterému to vzniklo — zakázat převzetí během procedury by
    /// znamenalo zakázat záchranu tam, kde je potřeba nejvíc.
    /// </summary>
    [Fact]
    public void Prevzit_veleni_jde_komukoliv_kdo_ho_nema()
    {
        Assert.Null(Veleni.ProcNejdePrevzit(Hlavni, Slave));
        Assert.Null(Veleni.ProcNejdePrevzit(null, Slave));
    }

    /// <summary>
    /// Sám sobě ho brát nemá smysl — a kdyby to prošlo, vznikl by
    /// v dokladu falešný záznam o převzetí, které se nestalo.
    /// </summary>
    [Fact]
    public void Velitel_si_veleni_nebere_sam_sobe()
    {
        Assert.NotNull(Veleni.ProcNejdePrevzit(Hlavni, Hlavni));
    }
}
