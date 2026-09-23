using OrlickyPohar.Api.Features.Clanky;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Převod vloženého HTML na bloky. Bez databáze a bez sítě, takže v CI běží
/// první — a je to <b>bezpečnostní kód</b>, takže se tu zkouší hlavně to, co
/// se má zahodit.
/// <para>
/// Klíčová vlastnost, kterou tyhle testy hlídají: <b>na výstupu nejsou
/// značky, ale struktura</b>. Web ji vykreslí vlastními komponentami, takže
/// ani chyba v rozboru nemůže skončit spuštěným skriptem — nanejvýš špatně
/// zobrazeným textem.
/// </para>
/// </summary>
public class BlokyTests
{
    private static string Text(Blok b) => string.Concat(b.Useky!.Select(u => u.Text));

    [Fact]
    public void Odstavce_se_prevedou_na_bloky()
    {
        var bloky = Bloky.ZHtml("<p>První odstavec.</p><p>Druhý odstavec.</p>");

        Assert.Equal(2, bloky.Count);
        Assert.All(bloky, b => Assert.Equal(DruhBloku.Odstavec, b.Druh));
        Assert.Equal("První odstavec.", Text(bloky[0]));
        Assert.Equal("Druhý odstavec.", Text(bloky[1]));
    }

    [Fact]
    public void Skript_zmizi_i_s_obsahem()
    {
        // Tohle je celý důvod, proč čistička existuje. Text uvnitř skriptu
        // se nesmí vysypat do článku ani jako text — jinak by v novince
        // stálo `alert("xss")`.
        var bloky = Bloky.ZHtml("""
            <p>Před</p><script>alert("xss")</script><p>Po</p>
            """);

        Assert.Equal(["Před", "Po"], bloky.Select(Text));
    }

    [Fact]
    public void Styl_zmizi_i_s_obsahem()
    {
        var bloky = Bloky.ZHtml("<style>p { color: red }</style><p>Text</p>");

        var blok = Assert.Single(bloky);
        Assert.Equal("Text", Text(blok));
    }

    [Fact]
    public void Udalostni_atributy_neprojdou()
    {
        // Atributy se nečtou žádné kromě href, src a alt, takže `onclick`
        // se nemá kam dostat. Tenhle test hlídá, že to platí i tehdy, když
        // je značka jinak povolená.
        var bloky = Bloky.ZHtml("""<p onclick="alert(1)" style="mso-x:y">Text</p>""");

        var blok = Assert.Single(bloky);
        Assert.Equal("Text", Text(blok));
        Assert.Null(blok.Useky![0].Odkaz);
    }

    [Fact]
    public void Javascript_v_odkazu_se_zahodi_ale_text_zustane()
    {
        var bloky = Bloky.ZHtml("""<p>Klikni <a href="javascript:alert(1)">sem</a></p>""");

        var useky = Assert.Single(bloky).Useky!;
        // Text nikdo neztratí, jen z něj přestane být odkaz.
        Assert.Equal("Klikni sem", string.Concat(useky.Select(u => u.Text)));
        Assert.All(useky, u => Assert.Null(u.Odkaz));
    }

    [Theory]
    [InlineData("data:text/html;base64,PHNjcmlwdD4=")]
    [InlineData("/relativni/cesta")]
    [InlineData("vbscript:msgbox(1)")]
    public void Nepovolena_adresa_odkazu_se_zahodi(string adresa)
    {
        var bloky = Bloky.ZHtml($"""<p><a href="{adresa}">text</a></p>""");

        Assert.Null(Assert.Single(bloky).Useky![0].Odkaz);
    }

    [Theory]
    [InlineData("https://www.sailing.cz/clanek")]
    [InlineData("http://example.com/x?a=1")]
    [InlineData("mailto:kdo@example.com")]
    public void Povolena_adresa_odkazu_projde(string adresa)
    {
        var bloky = Bloky.ZHtml($"""<p><a href="{adresa}">text</a></p>""");

        Assert.Equal(adresa, Assert.Single(bloky).Useky![0].Odkaz);
    }

    [Fact]
    public void Obrazek_projde_jen_s_absolutni_adresou()
    {
        var bloky = Bloky.ZHtml("""
            <p>Text</p>
            <img src="https://www.sailing.cz/foto.jpg" alt="Loď na Orlíku">
            <img src="javascript:alert(1)">
            <img src="/relativni.jpg">
            """);

        var obrazek = Assert.Single(bloky, b => b.Druh == DruhBloku.Obrazek);
        Assert.Equal("https://www.sailing.cz/foto.jpg", obrazek.Adresa);
        Assert.Equal("Loď na Orlíku", obrazek.Popis);
    }

    [Fact]
    public void Tucne_a_kurziva_se_drzi_na_useku()
    {
        var bloky = Bloky.ZHtml("<p>Normální <b>tučné</b> a <em>kurzíva</em>.</p>");

        var useky = Assert.Single(bloky).Useky!;
        Assert.Contains(useky, u => u.Text == "tučné" && u.Tucne);
        Assert.Contains(useky, u => u.Text == "kurzíva" && u.Kurziva);
        Assert.Contains(useky, u => u.Text.StartsWith("Normální") && !u.Tucne && !u.Kurziva);
    }

    [Fact]
    public void Nadpisy_se_srovnaji_na_dve_urovne()
    {
        // H1 patří titulku článku, který stránka vypisuje sama; hlubší než
        // H3 by v novince neměl co dělat.
        var bloky = Bloky.ZHtml("<h1>A</h1><h2>B</h2><h3>C</h3><h5>D</h5>");

        Assert.Equal([2, 2, 3, 3], bloky.Select(b => b.Uroven));
        Assert.All(bloky, b => Assert.Equal(DruhBloku.Nadpis, b.Druh));
    }

    [Fact]
    public void Seznam_se_prevede_i_s_polozkami()
    {
        var bloky = Bloky.ZHtml("<ul><li>První</li><li>Druhá</li></ul>");

        var seznam = Assert.Single(bloky);
        Assert.Equal(DruhBloku.Seznam, seznam.Druh);
        Assert.False(seznam.Cislovany);
        Assert.Equal(["První", "Druhá"],
            seznam.Polozky!.Select(p => string.Concat(p.Select(u => u.Text))));
    }

    [Fact]
    public void Cislovany_seznam_je_poznat()
    {
        Assert.True(Assert.Single(Bloky.ZHtml("<ol><li>A</li></ol>")).Cislovany);
    }

    [Fact]
    public void Balast_z_Wordu_se_zahodi_ale_text_zustane()
    {
        // Přesně to, co přijde ze schránky: podmíněné komentáře, jmenné
        // prostory, `MsoNormal`, vlastní fonty a pevné velikosti.
        var bloky = Bloky.ZHtml("""
            <!--[if gte mso 9]><xml><o:OfficeDocumentSettings/></xml><![endif]-->
            <p class="MsoNormal" style="margin:0cm;font-size:11.0pt;font-family:&quot;Calibri&quot;">
              <span style="mso-fareast-language:CS">Pozvánka na regatu.<o:p></o:p></span>
            </p>
            """);

        var blok = Assert.Single(bloky);
        Assert.Equal(DruhBloku.Odstavec, blok.Druh);
        Assert.Equal("Pozvánka na regatu.", Text(blok));
    }

    [Fact]
    public void Neznama_znacka_zmizi_ale_text_uvnitr_zustane()
    {
        // `span`, `font`, `table` — rozvržení cizí stránky nás nezajímá,
        // text ano.
        var bloky = Bloky.ZHtml("<table><tr><td><p>V buňce</p></td></tr></table>");

        Assert.Equal("V buňce", Text(Assert.Single(bloky)));
    }

    [Fact]
    public void Nedovrene_znacky_nic_neshodi()
    {
        // Cizí HTML bývá nevalidní a nedovřené značky jsou v něm pravidlo.
        var bloky = Bloky.ZHtml("<p>Text <b>tučné <p>Další");

        Assert.Equal(2, bloky.Count);
        Assert.Equal("Text tučné", Text(bloky[0]));
        Assert.Equal("Další", Text(bloky[1]));
    }

    [Fact]
    public void Entity_a_nedelitelne_mezery_se_prevedou()
    {
        var bloky = Bloky.ZHtml("<p>Ryba&nbsp;&amp;&nbsp;chips &lt;pozor&gt;</p>");

        Assert.Equal("Ryba & chips <pozor>", Text(Assert.Single(bloky)));
    }

    [Fact]
    public void Prazdne_odstavce_se_zahodi()
    {
        // Word jich nasype spoustu. Prázdná mezera mezi odstavci není obsah.
        var bloky = Bloky.ZHtml("<p>A</p><p></p><p>   </p><p>&nbsp;</p><p>B</p>");

        Assert.Equal(["A", "B"], bloky.Select(Text));
    }

    [Fact]
    public void Prazdny_vstup_da_prazdne_telo()
    {
        Assert.Empty(Bloky.ZHtml(null));
        Assert.Empty(Bloky.ZHtml(""));
        Assert.Empty(Bloky.ZHtml("   "));
        Assert.Empty(Bloky.ZHtml("<p></p>"));
    }

    [Fact]
    public void Ulozene_telo_se_precte_zpatky()
    {
        var puvodni = Bloky.ZHtml("""
            <h2>Nadpis</h2><p>Text s <b>tučným</b> a <a href="https://example.com">odkazem</a>.</p>
            <ul><li>Jedna</li></ul><img src="https://example.com/f.jpg" alt="Popis">
            """);

        var nactene = Bloky.Nacti(Bloky.Uloz(puvodni));

        // Porovnává se uložený tvar, ne records: `Blok` nese kolekce a ty se
        // v záznamech srovnávají referencí, takže `List` proti poli by se
        // lišily i se stejným obsahem.
        Assert.Equal(Bloky.Uloz(puvodni), Bloky.Uloz(nactene));

        // A pro jistotu i to, na čem záleží nejvíc — že se cestou neztratil
        // odkaz ani obrázek.
        Assert.Equal(
            "https://example.com",
            nactene.Single(b => b.Druh == DruhBloku.Odstavec).Useky!
                .Single(u => u.Odkaz is not null).Odkaz);
        Assert.Equal(
            "https://example.com/f.jpg",
            nactene.Single(b => b.Druh == DruhBloku.Obrazek).Adresa);
        Assert.Equal(
            ["Jedna"],
            nactene.Single(b => b.Druh == DruhBloku.Seznam).Polozky!
                .Select(p => string.Concat(p.Select(u => u.Text))));
    }

    [Fact]
    public void Rozbite_ulozene_telo_neshodi_stranku()
    {
        // Článek s rozbitým tělem se má ukázat bez něj, ne vyhodit výjimku
        // uprostřed vykreslování stránky.
        Assert.Empty(Bloky.Nacti("{tohle není JSON"));
        Assert.Empty(Bloky.Nacti(""));
        Assert.Empty(Bloky.Nacti(null));
    }

    [Fact]
    public void Ve_vystupu_nikdy_nejsou_znacky()
    {
        // Souhrnná pojistka: ať přijde cokoliv, v textu úseků nesmí zůstat
        // `<` ani `>` z původních značek. Kdyby ano, znamenalo by to, že se
        // něco nerozebralo a putuje to dál jako text.
        var vstup = """
            <p>A</p><script>var x = "<b>";</script><div onmouseover="x()">B</div>
            <img src=x onerror="alert(1)"><iframe src="https://zlo.example"></iframe>
            """;

        var bloky = Bloky.ZHtml(vstup);

        Assert.All(bloky, b => Assert.All(b.Useky ?? [], u =>
        {
            Assert.DoesNotContain('<', u.Text);
            Assert.DoesNotContain('>', u.Text);
        }));
        Assert.DoesNotContain(bloky, b => b.Druh == DruhBloku.Obrazek);
    }

    [Fact]
    public void Do_html_a_zpatky_da_totez()
    {
        // Autor si článek otevře k úpravě, nic nezmění a uloží. Kdyby se
        // obsah druhým průchodem měnil, znamenalo by to, že uložené HTML
        // nese něco, co čistička sama nepustí.
        var puvodni = Bloky.ZHtml("""
            <h2>Nadpis</h2>
            <p>Text s <b>tučným</b>, <i>kurzívou</i> a <a href="https://example.com">odkazem</a>.</p>
            <ol><li>První</li><li>Druhá</li></ol>
            <img src="https://example.com/f.jpg" alt="Popis">
            """);

        var podruhe = Bloky.ZHtml(Bloky.DoHtml(puvodni));

        Assert.Equal(Bloky.Uloz(puvodni), Bloky.Uloz(podruhe));
    }

    [Fact]
    public void Do_html_escapuje_text()
    {
        // Text článku může obsahovat špičaté závorky — třeba když někdo píše
        // o značkách. Bez escapování by z nich při dalším otevření vznikly
        // značky, a to je cesta, jak čističku obejít zevnitř.
        var bloky = Bloky.ZHtml("<p>&lt;script&gt;alert(1)&lt;/script&gt; a &amp; k tomu</p>");
        var html = Bloky.DoHtml(bloky);

        Assert.Contains("&lt;script&gt;", html);
        Assert.DoesNotContain("<script>", html);

        // A po dalším průchodu je to pořád text, ne značka.
        var podruhe = Assert.Single(Bloky.ZHtml(html));
        Assert.Equal("<script>alert(1)</script> a & k tomu", Text(podruhe));
    }

    [Fact]
    public void Do_html_hlida_uvozovky_v_adrese()
    {
        // Uvozovka v adrese by jinak zavřela atribut a zbytek by se stal
        // dalším atributem — třeba `onerror`.
        var html = Bloky.DoHtml([new Blok(
            DruhBloku.Obrazek,
            Adresa: """https://example.com/f.jpg" onerror="alert(1)""",
            Popis: """zlo" onload="alert(2)""")]);

        Assert.DoesNotContain("onerror=\"alert", html);
        Assert.DoesNotContain("onload=\"alert", html);

        // A zpátky z toho nevznikne ani obrázek — adresa s uvozovkou není
        // platná absolutní adresa.
        Assert.DoesNotContain(Bloky.ZHtml(html), b => b.Druh == DruhBloku.Obrazek);
    }

    private const string Uloziste = "https://fotky.klihovka.cz/";

    [Fact]
    public void V_tele_projde_jen_obrazek_nahrany_k_nam()
    {
        // Cizí obrázek si velikostí řídí cizí server a zaplatí ho každý, kdo
        // článek otevře. U nahraného k nám ji srazí přepočet na WebP.
        var bloky = Bloky.ZHtml($"""
            <img src="{Uloziste}abc-1600.webp" alt="Naše">
            <img src="https://cizi.example/desetimegovy.png" alt="Cizí">
            """, Uloziste);

        var obrazek = Assert.Single(bloky, b => b.Druh == DruhBloku.Obrazek);
        Assert.Equal($"{Uloziste}abc-1600.webp", obrazek.Adresa);
    }

    [Fact]
    public void Bez_zadaneho_uloziste_projde_obrazek_odkudkoliv()
    {
        // Volání bez adresy úložiště znamená „nevím, kde je naše" — pak se
        // nedá rozhodnout a platí jen pravidlo o absolutní http(s) adrese.
        // Chodí tudy starší importy a testy rozboru.
        var bloky = Bloky.ZHtml("""<img src="https://cizi.example/f.jpg">""");

        Assert.Single(bloky, b => b.Druh == DruhBloku.Obrazek);
    }

    [Fact]
    public void Prilis_dlouhy_text_se_neulozi()
    {
        var dlouhy = string.Concat(Enumerable.Repeat("<p>" + new string('a', 1000) + "</p>", 60));

        var chyba = Bloky.ProcNejde(dlouhy);

        Assert.NotNull(chyba);
        Assert.Contains("znaků", chyba);
    }

    [Fact]
    public void Prilis_mnoho_bloku_se_neulozi()
    {
        var hodne = string.Concat(Enumerable.Repeat("<p>a</p>", Bloky.NejvicBloku + 5));

        Assert.Contains("odstavců", Bloky.ProcNejde(hodne));
    }

    [Fact]
    public void Prilis_mnoho_obrazku_se_neulozi()
    {
        var hodne = string.Concat(Enumerable.Range(0, Bloky.NejvicObrazku + 3)
            .Select(i => $"""<img src="{Uloziste}f{i}.webp">"""));

        Assert.Contains("obrázků", Bloky.ProcNejde(hodne, Uloziste));
    }

    [Fact]
    public void Bezny_clanek_limity_nedosahne()
    {
        // Limity nesmějí překážet tomu, kdo píše normální novinku.
        var bezny = string.Concat(Enumerable.Repeat(
            "<h2>Nadpis</h2><p>Odstavec o jedné regatě a tom, jak dopadla.</p>", 20));

        Assert.Null(Bloky.ProcNejde(bezny));
    }

    [Fact]
    public void Prevod_limity_dodrzi_i_kdyz_kontrola_nebezela()
    {
        // Pojistka pro cesty, které `ProcNejde` nezavolají — třeba import,
        // kde by chyba shodila celou dávku kvůli jednomu článku.
        var hodne = string.Concat(Enumerable.Repeat("<p>a</p>", Bloky.NejvicBloku + 50));

        Assert.Equal(Bloky.NejvicBloku, Bloky.ZHtml(hodne).Count);
    }
}
