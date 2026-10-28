using OrlickyPohar.Api.Features.Oponentura;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pravidla dotazníku pro oponenturu. Čisté funkce, bez databáze
/// a bez úložiště.
/// </summary>
public class OponenturaTests
{
    /// <summary>
    /// <b>Formát se poznává z obsahu</b>, protože každý telefon nahrává
    /// jinak: Chrome Opus ve WebM, Safari na iPhonu AAC v MP4. Vnutit jeden
    /// by znamenalo, že na polovině telefonů nahrávání nejde.
    /// </summary>
    [Fact]
    public void Webm_se_pozna_podle_ebml()
    {
        byte[] data = [0x1A, 0x45, 0xDF, 0xA3, 0x01, 0x02, 0x03];
        Assert.Equal("audio/webm", Dotazovani.PoznejZvuk(data));
    }

    [Fact]
    public void Mp4_z_iphonu_se_pozna_podle_ftyp()
    {
        // Délka boxu, `ftyp`, značka — tak začíná záznam ze Safari.
        var data = new byte[] { 0, 0, 0, 0x20 }
            .Concat("ftypM4A "u8.ToArray())
            .Concat(new byte[4])
            .ToArray();
        Assert.Equal("audio/mp4", Dotazovani.PoznejZvuk(data));
    }

    [Fact]
    public void Ogg_a_wav_se_poznaji()
    {
        Assert.Equal("audio/ogg", Dotazovani.PoznejZvuk("OggS\0\0\0\0"u8.ToArray()));
        Assert.Equal("audio/wav",
            Dotazovani.PoznejZvuk("RIFF\u0001\u0002\u0003\u0004WAVEfmt "u8.ToArray()));
    }

    /// <summary>
    /// Fotka ani PDF nejsou zvuk. Prohlížeč může tvrdit, co chce —
    /// rozhoduje obsah.
    /// </summary>
    [Fact]
    public void Pdf_neni_zvuk()
    {
        Assert.Null(Dotazovani.PoznejZvuk("%PDF-1.7"u8.ToArray()));
        Assert.Null(Dotazovani.PoznejZvuk([0x89, 0x50, 0x4E, 0x47]));
        Assert.Null(Dotazovani.PoznejZvuk([]));
    }

    [Fact]
    public void Prazdna_a_prilis_velka_nahravka_neprojde()
    {
        Assert.NotNull(Dotazovani.ProcNejdeNahrat(0));
        Assert.NotNull(Dotazovani.ProcNejdeNahrat(Dotazovani.NejvicBajtu + 1));
        Assert.Null(Dotazovani.ProcNejdeNahrat(Dotazovani.NejvicBajtu));
    }

    private static OtazkaSady Otazka(bool vice = false) => new()
    {
        Kod = "B2",
        Text = "Dvě věci, nebo tři?",
        VolbyVice = vice,
        Volby =
        [
            new Volba { Kod = "dve", Text = "Dvě" },
            new Volba { Kod = "tri", Text = "Tři" },
        ],
    };

    /// <summary>
    /// <b>Neznámý kód volby se neuloží a neřekne se o tom</b> — to by bylo
    /// tvrzení, že odpověď je zapsaná, zatímco zmizela. Může být podvržený
    /// i zastaralý (volba se ze sady odebrala).
    /// </summary>
    [Fact]
    public void Neznama_volba_se_odmitne()
    {
        var chyba = Dotazovani.ProcNejdeOdpovedet(Otazka(), new OdpovedVstup(["ctyri"], null));
        Assert.NotNull(chyba);
        Assert.Contains("ctyri", chyba);
    }

    [Fact]
    public void Dve_volby_u_otazky_na_jednu_neprojdou()
    {
        Assert.NotNull(Dotazovani.ProcNejdeOdpovedet(
            Otazka(), new OdpovedVstup(["dve", "tri"], null)));
        Assert.Null(Dotazovani.ProcNejdeOdpovedet(
            Otazka(vice: true), new OdpovedVstup(["dve", "tri"], null)));
    }

    /// <summary>Nic není povinné: prázdná odpověď je platná odpověď.</summary>
    [Fact]
    public void Prazdna_odpoved_je_v_poradku()
    {
        Assert.Null(Dotazovani.ProcNejdeOdpovedet(Otazka(), new OdpovedVstup(null, null)));
        Assert.Null(Dotazovani.ProcNejdeOdpovedet(Otazka(), new OdpovedVstup([], "   ")));
    }

    [Fact]
    public void Prilis_dlouhy_text_neprojde() =>
        Assert.NotNull(Dotazovani.ProcNejdeOdpovedet(
            Otazka(), new OdpovedVstup(null, new string('a', Dotazovani.TextNejvic + 1))));

    /// <summary>
    /// Otázka je odpovězená volbou, textem, <b>nebo</b> nahrávkou. Hlas sám
    /// stačí — tak Miloš odpovídá.
    /// </summary>
    [Fact]
    public void Otazka_je_odpovezena_i_jen_hlasem()
    {
        Assert.True(Dotazovani.Odpovezena(null, 1));
        Assert.False(Dotazovani.Odpovezena(null, 0));
        Assert.False(Dotazovani.Odpovezena(new OdpovedNaOtazku { OtazkaId = 1 }, 0));
        Assert.True(Dotazovani.Odpovezena(
            new OdpovedNaOtazku { OtazkaId = 1, Volby = ["dve"] }, 0));
        // Mezery nejsou odpověď.
        Assert.False(Dotazovani.Odpovezena(
            new OdpovedNaOtazku { OtazkaId = 1, Text = "  " }, 0));
    }

    /// <summary>
    /// <b>Uzavření váží víc než počet odpovědí.</b> Nic v sadě není povinné,
    /// takže „odpověděl na všechno“ nenastane nikdy a hotovou sadu od
    /// rozpracované odliší jen to, že někdo řekl „mám to“.
    /// </summary>
    [Fact]
    public void Stav_sady()
    {
        var ted = new DateTimeOffset(2026, 10, 28, 20, 0, 0, TimeSpan.Zero);
        Assert.Equal(StavSady.Neodpovezeno, Dotazovani.Stav(0, null));
        Assert.Equal(StavSady.Rozpracovano, Dotazovani.Stav(3, null));
        Assert.Equal(StavSady.Odpovezeno, Dotazovani.Stav(3, ted));
        // Uzavřená sada bez jediné odpovědi je taky odpovězená: „na zbytek
        // odpovídat nebudu“ je odpověď.
        Assert.Equal(StavSady.Odpovezeno, Dotazovani.Stav(0, ted));
    }

    /// <summary>Klíč nese předponu, aby hlas neležel mezi fotkami.</summary>
    [Fact]
    public void Klic_ma_predponu_a_koncovku()
    {
        var id = Guid.Parse("0199c3f0-0000-7000-8000-000000000001");
        Assert.Equal("oponentura/0199c3f0000070008000000000000001.webm",
            Dotazovani.Klic(id, "audio/webm"));
        Assert.Equal("oponentura/0199c3f0000070008000000000000001.m4a",
            Dotazovani.Klic(id, "audio/mp4"));
    }

    /// <summary>
    /// Adresa nahrávky vede na API, ne na úložiště — hlas k neuzavřenému
    /// rozhodnutí se nevydává z veřejné adresy.
    /// </summary>
    [Fact]
    public void Adresa_nahravky_vede_na_api()
    {
        var id = Guid.Parse("0199c3f0-0000-7000-8000-000000000001");
        Assert.Equal(
            "/sprava/serie/2027/oponentura/b-ceka-na-rozhodnuti/nahravky/"
            + "0199c3f0000070008000000000000001",
            Dotazovani.Adresa("2027", "b-ceka-na-rozhodnuti", id));
    }

    [Fact]
    public void Prvni_sada_ma_devet_otazek_a_projde_kontrolou()
    {
        var sada = PrvniSada.Obsah();
        Assert.Equal(9, sada.Otazky.Count);
        Assert.Null(Zalozeni.ProcNejde(sada));
        // Kódy B1..B9 jsou to, pod čím se o otázkách mluví v dokumentech.
        Assert.Equal(
            ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"],
            sada.Otazky.Select(o => o.Kod));
    }

    [Fact]
    public void Sada_bez_otazek_a_s_dvojitym_kodem_neprojde()
    {
        var prazdna = new SadaVstup("x", "X", "", 1, []);
        Assert.NotNull(Zalozeni.ProcNejde(prazdna));

        var dvakrat = new SadaVstup("x", "X", "", 1,
        [
            new OtazkaVstup("B1", "A?", null, null, null, false),
            new OtazkaVstup("B1", "B?", null, null, null, false),
        ]);
        var chyba = Zalozeni.ProcNejde(dvakrat);
        Assert.NotNull(chyba);
        Assert.Contains("B1", chyba);
    }

    /// <summary>
    /// Slug je adresa sady, takže v něm nesmí být nic, co by se v adrese
    /// muselo kódovat — jinak by se o sadě mluvilo jinak, než jak se k ní
    /// chodí.
    /// </summary>
    [Fact]
    public void Slug_s_diakritikou_nebo_mezerou_neprojde()
    {
        var otazky = new List<OtazkaVstup> { new("B1", "A?", null, null, null, false) };
        Assert.NotNull(Zalozeni.ProcNejde(new SadaVstup("čeká na", "X", "", 1, otazky)));
        Assert.NotNull(Zalozeni.ProcNejde(new SadaVstup("x/y", "X", "", 1, otazky)));
        Assert.Null(Zalozeni.ProcNejde(new SadaVstup("b-ceka-2", "X", "", 1, otazky)));
    }
}
