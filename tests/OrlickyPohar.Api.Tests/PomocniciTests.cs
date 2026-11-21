using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pomoc u startu a u cíle (nález K8 oponentury rozhodčího, rozhodnuto
/// Filipem 28. 10. 2026). Čisté funkce, bez databáze.
/// <para>
/// Filip, 28. 10. 2026: *„Mnohdy např. u cíle a startu nestojí pouze
/// rozhodčí … asi v klubovně u zápisu bude na webu moct zaškrtnout, kdo
/// z pořadatelů bude moci pomáhat i u startu a cíle."*
/// </para>
/// </summary>
public class PomocniciTests
{
    /// <summary>
    /// <b>Jádro K8:</b> pořadatel jiné zastávky ročníku, kterého rozhodčí
    /// zaškrtl, smí u vody zapisovat — aniž by dostal celou tuhle regatu.
    /// </summary>
    [Fact]
    public void Zaskrtnuty_pomocnik_smi_u_vody()
    {
        Assert.True(Pomocnici.SmiUVody(poradatel: false, pomocnik: true));
    }

    /// <summary>
    /// <b>A opačně:</b> pořadatel téhle zastávky smí dál bez jakéhokoliv
    /// zaškrtávání. Příznak nic neubírá — kdyby ho začal vyžadovat,
    /// znamenal by zámek tam, kde dnes žádný není, a regata s jedním
    /// pořadatelem by přestala fungovat.
    /// </summary>
    [Fact]
    public void Poradatel_zastavky_smi_i_bez_prizanku()
    {
        Assert.True(Pomocnici.SmiUVody(poradatel: true, pomocnik: false));
    }

    /// <summary>
    /// Kdo není ani jedno, nesmí. Bez tohohle řádku by příznak otevřel
    /// start a cíl komukoliv.
    /// </summary>
    /// <summary>
    /// Druhá polovina R38: <b>rozhodčí ročníku smí k vodě</b>, i když není
    /// pořadatel ani zaškrtnutý. Do 7. 11. 2026 nemohl u cíle klepnout
    /// jedinou loď, protože <c>Rozhodci</c> nepokrývá <c>Organizator</c> —
    /// a přitom celý K8 vznikl z toho, že u cíle a startu rozhodčí stojí.
    /// </summary>
    [Fact]
    public void Rozhodci_rocniku_smi_i_bez_poradatelstvi()
    {
        Assert.True(Pomocnici.SmiUVody(poradatel: false, pomocnik: false, rozhodci: true));
        // A bez něj je to pořád zavřené — příznak, který by otevíral
        // vždycky, by prošel i tvrzením výš.
        Assert.False(Pomocnici.SmiUVody(poradatel: false, pomocnik: false, rozhodci: false));
    }

    [Fact]
    public void Kdo_neni_poradatel_ani_pomocnik_nesmi()
    {
        Assert.False(Pomocnici.SmiUVody(poradatel: false, pomocnik: false));
    }

    /// <summary>
    /// <b>Příznak roli nepřidává</b> — zaškrtnout jde jen toho, kdo
    /// v ročníku pořadatelem už je. Zaškrtnutí kolemjdoucího by byl obchvat
    /// udělování práv: startérem by se stal někdo, komu to nikdo neudělil.
    /// </summary>
    [Fact]
    public void Zaskrtnout_jde_jen_poradatele_rocniku()
    {
        var chyba = Pomocnici.ProcNejdeZaskrtnout(jePoradatel: false, jizPomaha: false);

        Assert.NotNull(chyba);
        Assert.Contains("pořadatel", chyba);
    }

    /// <summary>
    /// A pořadatele ročníku zaškrtnout jde. Opačný směr téhož pravidla: bez
    /// něj by test výš prošel i zámku, který nepustí nikoho.
    /// </summary>
    [Fact]
    public void Poradatele_rocniku_zaskrtnout_jde()
    {
        Assert.Null(Pomocnici.ProcNejdeZaskrtnout(jePoradatel: true, jizPomaha: false));
    }

    /// <summary>
    /// Dvakrát ne. Druhý záznam bez konce by znamenal dvě odpovědi na
    /// otázku „odkdy pomáhá" a doklad by přestal být dokladem.
    /// </summary>
    [Fact]
    public void Zaskrtnout_dvakrat_nejde()
    {
        Assert.NotNull(Pomocnici.ProcNejdeZaskrtnout(jePoradatel: true, jizPomaha: true));
    }

    /// <summary>
    /// <b>Stavba trati</b> (Filip, 17. 11. 2026: *„stavitel trati může být
    /// i pomocník"*). Táž tři vstupní práva jako u vody, ale vlastní
    /// funkce — jsou to dvě různé otázky a mají jít rozejít.
    /// </summary>
    [Fact]
    public void Zaskrtnuty_pomocnik_smi_stavet()
    {
        Assert.True(Pomocnici.SmiStavet(poradatel: false, pomocnik: true, rozhodci: false));
        Assert.True(Pomocnici.SmiStavet(poradatel: true, pomocnik: false, rozhodci: false));
        Assert.True(Pomocnici.SmiStavet(poradatel: false, pomocnik: false, rozhodci: true));
    }

    /// <summary>
    /// Kdo není ani jedno, nestaví. Appka se ptá na totéž, aby obrazovku
    /// neotevřela tomu, komu server odmítne každý prvek.
    /// </summary>
    [Fact]
    public void Nikdo_cizi_nestavi()
    {
        Assert.False(Pomocnici.SmiStavet(poradatel: false, pomocnik: false, rozhodci: false));
    }

    /// <summary>
    /// Odškrtnout jde jen toho, kdo pomáhá — jinak by v dokladu vznikl
    /// záznam o ukončení něčeho, co nezačalo.
    /// </summary>
    [Fact]
    public void Odskrtnout_jde_jen_toho_kdo_pomaha()
    {
        Assert.Null(Pomocnici.ProcNejdeOdskrtnout(jizPomaha: true));
        Assert.NotNull(Pomocnici.ProcNejdeOdskrtnout(jizPomaha: false));
    }

    /// <summary>
    /// <b>Přepínač regaty</b> (Filip, 21. 11. 2026). Výchozí je Milošova
    /// věta „úpravu výsledků smí provést pouze rozhodčí", takže pořadatel
    /// bez svolení regaty dojezdy nezapíše.
    /// </summary>
    [Fact]
    public void Poradatel_bez_svoleni_regaty_dojezdy_nezapise()
    {
        Assert.False(Pomocnici.SmiZapsatVysledky(
            poradatel: true, pomocnik: false, rozhodci: false, spravce: false,
            regataPustiPoradatele: false));

        Assert.True(Pomocnici.SmiZapsatVysledky(
            poradatel: true, pomocnik: false, rozhodci: false, spravce: false,
            regataPustiPoradatele: true));
    }

    /// <summary>
    /// Rozhodčí, pomocník a správce na přepínači nevisí — každý z jiného
    /// důvodu: rozhodčí je ten, komu Milošova věta zápis svěřuje, pomocníka
    /// zaškrtl jmenovitě na tuhle regatu (K8) a správce je vlastník ročníku.
    /// </summary>
    [Fact]
    public void Prepinac_neomezuje_rozhodciho_pomocnika_ani_spravce()
    {
        Assert.True(Pomocnici.SmiZapsatVysledky(
            poradatel: false, pomocnik: false, rozhodci: true, spravce: false,
            regataPustiPoradatele: false));

        Assert.True(Pomocnici.SmiZapsatVysledky(
            poradatel: false, pomocnik: true, rozhodci: false, spravce: false,
            regataPustiPoradatele: false));

        Assert.True(Pomocnici.SmiZapsatVysledky(
            poradatel: false, pomocnik: false, rozhodci: false, spravce: true,
            regataPustiPoradatele: false));
    }

    /// <summary>
    /// Kdo nemá nic, nezapíše ani se zapnutým přepínačem: ten otevírá
    /// pořadatelství, nezakládá právo.
    /// </summary>
    [Fact]
    public void Cizi_clovek_nezapise_ani_se_zapnutym_prepinacem()
    {
        Assert.False(Pomocnici.SmiZapsatVysledky(
            poradatel: false, pomocnik: false, rozhodci: false, spravce: false,
            regataPustiPoradatele: true));
    }

    /// <summary>
    /// <b>Úkony u vody se tím nemění.</b> Velení, procedura, start a konec
    /// jdou pořadateli dál — Milošova věta mluví o zápisu výsledků.
    /// </summary>
    [Fact]
    public void Ukony_u_vody_prepinac_neresi()
    {
        Assert.True(Pomocnici.SmiUVody(poradatel: true, pomocnik: false));
    }
}
