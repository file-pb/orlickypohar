using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Vypsání závodu podle Dodatku J1 (nálezy R1 a R8 oponentury rozhodčího,
/// 28. 10. 2026). Čisté funkce, bez databáze.
/// <para>
/// Řez testů je ten, kvůli kterému dokument vznikl: <b>že se nerozejde
/// s výpočtem</b> (bodování se vypisuje z týchž čísel, podle kterých se
/// počítá) a <b>že si nic nedomýšlí</b> (co aplikace neví, přizná).
/// </para>
/// </summary>
public class VypsaniTests
{
    private static VypsaniVstup Vstup(
        DateOnly? uzaverka = null,
        string? startovne = null,
        DateTimeOffset? znameni = null,
        int skrtyRegaty = 1,
        decimal koeficient = 1.0m,
        int posun = 0,
        Vyhodnoceni vyhodnoceni = Vyhodnoceni.PoKategoriich,
        int skrtySerie = 1,
        bool maSmernice = true,
        IReadOnlyList<string>? kategorie = null) =>
        new(
            "Orlický pohár 2027", 2027,
            "Jarní vítr", new DateOnly(2027, 5, 15), null,
            "YC Orlík", "okruhový",
            uzaverka, startovne, znameni,
            Procedura.DelkaVychozi,
            kategorie ?? ["Race", "Nad7m", "Pod7m"],
            skrtyRegaty, koeficient, posun, vyhodnoceni,
            skrtySerie,
            PravidlaBodovani.V1,
            maSmernice);

    private static string? Text(VypsaniDto d, string bod) =>
        d.Body.Single(b => b.Bod == bod).Text;

    /// <summary>
    /// <b>Ta věta, kvůli které pravidla vůbec platí.</b> Pohár není
    /// oficiální závod ČSJ, takže ZPJ neplatí z titulu členství — platí
    /// jen proto, že si je závod vezme, a prohlašuje se to podle ZPJ
    /// 89.2(a) právě tady, bodem J1.1(2).
    /// </summary>
    [Fact]
    public void Vypsani_rika_ze_se_jede_podle_ZPJ()
    {
        var d = Vypsani.Sestav(Vstup());

        Assert.Equal(Vypsani.PodleZpj, Text(d, "J1.1(2)"));
        Assert.Contains("Závodních pravidlech jachtingu", Text(d, "J1.1(2)"));
        // A nesmí to být v seznamu chybějících: tohle se nevyplňuje, tohle platí.
        Assert.DoesNotContain("Podle kterých pravidel se jede", d.Chybi);
    }

    /// <summary>
    /// <b>Jádro nálezu R8.</b> Dvacet bodů za diskvalifikaci, škrty,
    /// koeficient i bonus se tisknou z týchž čísel, podle kterých se počítá
    /// — takže se vypsání s výpočtem nemůže rozejít. Dokud to žilo
    /// v konstantě a v `PLAN.md`, rozejít se mohlo kdykoliv.
    /// </summary>
    [Fact]
    public void Bodovani_se_tiskne_z_tychz_cisel_podle_kterych_se_pocita()
    {
        var d = Vypsani.Sestav(Vstup(koeficient: 1.5m, posun: -1, skrtyRegaty: 2, skrtySerie: 0));
        var text = Text(d, "J1.3(5)")!;

        Assert.Contains($"{PravidlaBodovani.V1.BodyZaDiskvalifikaci} bodů", text);
        Assert.Contains("plus " + PravidlaBodovani.V1.PrirazkaZaKod, text);
        Assert.Contains("koeficientem 1,5", text);
        Assert.Contains("připočítává -1", text);
        Assert.Contains("škrtají 2 nejhorší rozjížďky", text);
        Assert.Contains("žádná regata neškrtá", text);
        Assert.Contains($"Verze bodovacích pravidel: {PravidlaBodovani.V1.Verze}", text);
    }

    /// <summary>
    /// Jedna rozjížďka, dvě a pět se v češtině píšou každá jinak. V dokumentu,
    /// který vydává pořadatel, je špatný tvar vidět na první pohled.
    /// </summary>
    [Theory]
    [InlineData(0, "žádná rozjížďka neškrtá")]
    [InlineData(1, "škrtá jedna nejhorší rozjížďka")]
    [InlineData(2, "škrtají 2 nejhorší rozjížďky")]
    [InlineData(5, "škrtá 5 nejhorších rozjížděk")]
    public void Skrty_se_sklonuji(int kolik, string cekam)
    {
        Assert.Contains(cekam, Text(Vypsani.Sestav(Vstup(skrtyRegaty: kolik)), "J1.3(5)")!);
    }

    /// <summary>
    /// <b>Co aplikace neví, to nevymýšlí.</b> Dokument, který si domyslí
    /// startovné nebo uzávěrku, je horší než dokument, který řekne, že je
    /// nezná — podle vypsání se člověk rozhoduje, jestli pojede.
    /// </summary>
    [Fact]
    public void Nevyplnene_body_se_priznaji_misto_dosazeni()
    {
        var d = Vypsani.Sestav(Vstup());

        Assert.Null(Text(d, "J1.1(5)"));
        Assert.Null(Text(d, "J1.1(6)"));
        Assert.Contains("Přihlášky, uzávěrka a startovné", d.Chybi);
        Assert.Contains("Časy vyzývacích znamení", d.Chybi);

        // Body, které aplikace nevede vůbec, chybí pořád — ať se vyplní cokoliv.
        Assert.Contains("Dráha", d.Chybi);
        Assert.Contains("Kdy se poslední den už nestartuje", d.Chybi);
    }

    /// <summary>Vyplněné kolonky ze seznamu chybějících zmizí.</summary>
    [Fact]
    public void Vyplnene_kolonky_dokument_doplni()
    {
        var d = Vypsani.Sestav(Vstup(
            uzaverka: new DateOnly(2027, 5, 10),
            startovne: "300 Kč za loď",
            znameni: new DateTimeOffset(2027, 5, 15, 9, 55, 0, TimeSpan.FromHours(2))));

        Assert.Contains("10. května 2027", Text(d, "J1.1(5)")!);
        Assert.Contains("300 Kč za loď", Text(d, "J1.1(5)")!);
        Assert.DoesNotContain("Přihlášky, uzávěrka a startovné", d.Chybi);

        // Čas v pražské zóně, ať server běží kdekoliv: regata se jede na Orlíku.
        Assert.Contains("9:55", Text(d, "J1.1(6)")!);
        Assert.Contains("15. května 2027", Text(d, "J1.1(6)")!);
    }

    /// <summary>
    /// Vyzývací znamení <b>není</b> čas startu — J1.1(6) chce T−5 (ZPJ 26).
    /// Je to jiný údaj než plánovaný start rozjížďky, který vzniká až na
    /// rozpravě (nález K6).
    /// </summary>
    [Fact]
    public void Vyzyvaci_znameni_mluvi_o_znameni_ne_o_startu()
    {
        var d = Vypsani.Sestav(Vstup(
            znameni: new DateTimeOffset(2027, 5, 15, 7, 55, 0, TimeSpan.Zero)));

        Assert.Contains("Vyzývací znamení první rozjížďky", Text(d, "J1.1(6)")!);
        Assert.Contains("na rozpravě", Text(d, "J1.1(6)")!);
    }

    /// <summary>
    /// Směrnice se vypisují podle toho, jestli nějaké visí — a když nevisí,
    /// dokument to řekne, místo aby odkazoval na prázdno.
    /// </summary>
    [Fact]
    public void Dokumenty_mluvi_o_tom_co_je_vyvesene()
    {
        Assert.Contains("jsou vyvěšené", Text(Vypsani.Sestav(Vstup(maSmernice: true)), "J1.1(3)")!);
        Assert.Contains("Zatím vyvěšené nejsou",
            Text(Vypsani.Sestav(Vstup(maSmernice: false)), "J1.1(3)")!);
    }

    /// <summary>
    /// Záhlaví nese, co aplikace má, a <b>místo konání přizná jako
    /// neuvedené</b> — `Zavod` ho nevede a sídlo pořadatele je něco jiného,
    /// takže „Orlická přehrada" by bylo vymyšlené, ne vygenerované.
    /// </summary>
    [Fact]
    public void Zahlavi_nese_termin_a_poradatele_a_misto_neprededuje()
    {
        var text = Text(Vypsani.Sestav(Vstup()), "J1.1(1)")!;

        Assert.Contains("Jarní vítr, Orlický pohár 2027", text);
        Assert.Contains("15. května 2027", text);
        Assert.Contains("Pořadatel: YC Orlík", text);
        Assert.Contains("Místo konání: neuvedené", text);
    }

    /// <summary>
    /// Vícedenní regata má v záhlaví obě data. Jednodenní jen jedno — a
    /// `DatumKonce` rovné začátku se chová jako jednodenní.
    /// </summary>
    [Fact]
    public void Vicedenni_regata_ma_obe_data()
    {
        var vstup = Vstup() with { DatumKonce = new DateOnly(2027, 5, 16) };
        Assert.Contains("15. května 2027 – 16. května 2027", Text(Vypsani.Sestav(vstup), "J1.1(1)")!);

        var jednodenni = Vstup() with { DatumKonce = new DateOnly(2027, 5, 15) };
        Assert.DoesNotContain("–", Text(Vypsani.Sestav(jednodenni), "J1.1(1)")!);
    }

    /// <summary>Ročník bez kategorií třídy vypsat neumí, takže je přizná.</summary>
    [Fact]
    public void Bez_kategorii_chybi_tridy()
    {
        var d = Vypsani.Sestav(Vstup(kategorie: []));

        Assert.Null(Text(d, "J1.1(4)"));
        Assert.Contains("Závodící třídy a podmínky přihlášení", d.Chybi);
    }

    /// <summary>
    /// Dokument o sobě říká, že je to návrh z dat — úkon <b>uznání
    /// vypsání</b> rozhodčím aplikace nezná (R1) a tvrdit opak by byl
    /// přesně ten slib naprázdno, proti kterému celá oponentura stojí.
    /// </summary>
    [Fact]
    public void Dokument_se_hlasi_jako_navrh()
    {
        Assert.Contains("uznává rozhodčí", Vypsani.Navrh);
    }
}
