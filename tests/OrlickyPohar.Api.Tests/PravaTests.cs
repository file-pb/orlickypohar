using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Vyhodnocení oprávnění. Čistá funkce, bez databáze a bez tokenu — na právo
/// se ptá každý zápis, takže se to musí dát zkoušet levně a hodně.
/// <para>
/// Dvě věci, které se snadno napíšou obráceně a pozná se to pozdě: <b>rozsah
/// série pokrývá její zastávky, ne naopak</b>, a <b>rozhodčí není stupeň mezi
/// editorem a správcem</b>.
/// </para>
/// </summary>
public class PravaTests
{
    private const int Serie = 1;
    private const int JinaSerie = 2;
    private const int Radava = 10;
    private const int Izolepa = 11;

    // --- Celý web (od 22. 9. 2026) ---

    [Fact]
    public void Pravo_na_web_plati_na_web_kazdy_rocnik_i_zastavku()
    {
        UdeleneRole[] editorWebu = [new(Role.Editor, null)];

        Assert.True(Prava.Smi(editorWebu, new(Role.Editor, null)));
        Assert.True(Prava.Smi(editorWebu, new(Role.Editor, Serie)));
        Assert.True(Prava.Smi(editorWebu, new(Role.Editor, JinaSerie, Radava)));
    }

    [Fact]
    public void Na_web_nestaci_zadne_pravo_na_rocnik()
    {
        // Správce ročníku smí v ročníku všechno, ale obecné články mimo
        // ročník mu nepatří.
        UdeleneRole[] spravceRocniku = [new(Role.Spravce, Serie)];
        UdeleneRole[] poradatel = [new(Role.Spravce, Serie, Radava)];

        Assert.False(Prava.Smi(spravceRocniku, new(Role.Editor, null)));
        Assert.False(Prava.Smi(poradatel, new(Role.Editor, null)));
    }

    [Fact]
    public void Na_webu_plati_stejne_pokryvani_roli()
    {
        // Editor webu píše, ale nespravuje. Správce webu smí všechno.
        UdeleneRole[] editorWebu = [new(Role.Editor, null)];
        UdeleneRole[] spravceWebu = [new(Role.Spravce, null)];

        Assert.False(Prava.Smi(editorWebu, new(Role.Spravce, null)));
        Assert.False(Prava.Smi(editorWebu, new(Role.Rozhodci, Serie)));
        Assert.True(Prava.Smi(spravceWebu, new(Role.Rozhodci, Serie)));
        Assert.True(Prava.Smi(spravceWebu, new(Role.Editor, null)));
    }

    [Fact]
    public void Pravo_na_rocnik_plati_i_na_jeho_zastavky()
    {
        UdeleneRole[] spravceRocniku = [new(Role.Spravce, Serie)];

        Assert.True(Prava.Smi(spravceRocniku, new(Role.Spravce, Serie)));
        Assert.True(Prava.Smi(spravceRocniku, new(Role.Spravce, Serie, Radava)));
        Assert.True(Prava.Smi(spravceRocniku, new(Role.Spravce, Serie, Izolepa)));
    }

    [Fact]
    public void Pravo_na_zastavku_neplati_na_rocnik_ani_na_cizi_zastavku()
    {
        // Tohle je celý smysl rozsahů: pořadatel Radavské regaty spravuje
        // svůj závod, ne cizí a ne ročník.
        UdeleneRole[] poradatel = [new(Role.Spravce, Serie, Radava)];

        Assert.True(Prava.Smi(poradatel, new(Role.Spravce, Serie, Radava)));
        Assert.False(Prava.Smi(poradatel, new(Role.Spravce, Serie, Izolepa)));
        Assert.False(Prava.Smi(poradatel, new(Role.Spravce, Serie)));
    }

    [Fact]
    public void Prava_se_nepretekaji_mezi_rocniky()
    {
        UdeleneRole[] spravce = [new(Role.Spravce, Serie)];

        Assert.False(Prava.Smi(spravce, new(Role.Spravce, JinaSerie)));
        Assert.False(Prava.Smi(spravce, new(Role.Editor, JinaSerie, Radava)));
    }

    [Fact]
    public void Spravce_smi_co_editor_i_co_rozhodci()
    {
        UdeleneRole[] spravce = [new(Role.Spravce, Serie)];

        Assert.True(Prava.Smi(spravce, new(Role.Editor, Serie)));
        Assert.True(Prava.Smi(spravce, new(Role.Rozhodci, Serie)));
    }

    [Fact]
    public void Rozhodci_neni_stupen_mezi_editorem_a_spravcem()
    {
        UdeleneRole[] editor = [new(Role.Editor, Serie)];
        UdeleneRole[] rozhodci = [new(Role.Rozhodci, Serie)];

        // Rozhodčí je funkce v procesu, ne úroveň oprávnění. Kdyby ho
        // pokrývala „vyšší" role, znamenalo by schválení výsledku jen to,
        // že ho někdo smí zapsat — a celá kontrola by ztratila smysl.
        Assert.False(Prava.Smi(editor, new(Role.Rozhodci, Serie)));

        // A obráceně taky ne: kdo smí schvalovat, nesmí tím pádem zadávat.
        Assert.False(Prava.Smi(rozhodci, new(Role.Editor, Serie)));
        Assert.False(Prava.Smi(rozhodci, new(Role.Spravce, Serie)));
    }

    [Fact]
    public void Bez_jedineho_opravneni_nesmi_nic_nad_ramec_ctenare()
    {
        // Účet se zakládá při prvním přihlášení, takže tenhle stav je běžný,
        // ne výjimečný — a nesmí znamenat víc než „přišel někdo přihlášený".
        UdeleneRole[] zadna = [];

        Assert.False(Prava.Smi(zadna, new(Role.Editor, Serie)));
        Assert.False(Prava.Smi(zadna, new(Role.Rozhodci, Serie, Radava)));
        Assert.False(Prava.Smi(zadna, new(Role.Spravce, Serie)));

        // Čtenář je každý, i nepřihlášený.
        Assert.True(Prava.Smi(zadna, new(Role.Ctenar, Serie)));
    }

    [Fact]
    public void Vic_roli_se_scita_podle_rozsahu()
    {
        // Běžný případ: organizátor poháru je editor celého ročníku a zároveň
        // správce jedné zastávky, kterou sám pořádá.
        UdeleneRole[] obojí = [new(Role.Editor, Serie), new(Role.Spravce, Serie, Izolepa)];

        Assert.True(Prava.Smi(obojí, new(Role.Editor, Serie, Radava)));
        Assert.True(Prava.Smi(obojí, new(Role.Spravce, Serie, Izolepa)));
        Assert.False(Prava.Smi(obojí, new(Role.Spravce, Serie, Radava)));
        Assert.False(Prava.Smi(obojí, new(Role.Spravce, Serie)));
    }

    [Fact]
    public void Organizator_obsahuje_editora_ale_ne_naopak()
    {
        UdeleneRole[] organizator = [new(Role.Organizator, Serie, Radava)];
        UdeleneRole[] editor = [new(Role.Editor, Serie, Radava)];

        // Organizátor píše i na blog, takže smí, co smí editor.
        Assert.True(Prava.Smi(organizator, new(Role.Editor, Serie, Radava)));

        // Editor je role pro toho, kdo umí psát o závodě, ale nemá do něj
        // zasahovat. Kdyby obsahoval organizátora, nebyla by k čemu.
        Assert.False(Prava.Smi(editor, new(Role.Organizator, Serie, Radava)));
    }

    [Fact]
    public void Organizator_nesmi_schvalovat_a_rozhodci_nesmi_poradat()
    {
        UdeleneRole[] organizator = [new(Role.Organizator, Serie)];
        UdeleneRole[] rozhodci = [new(Role.Rozhodci, Serie)];

        // Zapsat výsledky a schválit je nemá dělat tentýž člověk, jinak je
        // schválení jen druhé kliknutí téhož.
        Assert.False(Prava.Smi(organizator, new(Role.Rozhodci, Serie)));
        Assert.False(Prava.Smi(rozhodci, new(Role.Organizator, Serie)));
    }

    [Fact]
    public void Spravce_obsahuje_i_organizatora()
    {
        UdeleneRole[] spravce = [new(Role.Spravce, Serie)];

        Assert.True(Prava.Smi(spravce, new(Role.Organizator, Serie, Izolepa)));
        Assert.True(Prava.Smi(spravce, new(Role.Editor, Serie, Izolepa)));
    }

    [Fact]
    public void Organizator_rocniku_smi_na_kteroukoliv_zastavku()
    {
        // Organizátor celého ročníku může to samé na kterékoliv jeho
        // zastávce; organizátor jedné zastávky jen na ní.
        UdeleneRole[] rocnik = [new(Role.Organizator, Serie)];
        UdeleneRole[] jedna = [new(Role.Organizator, Serie, Radava)];

        Assert.True(Prava.Smi(rocnik, new(Role.Organizator, Serie, Radava)));
        Assert.True(Prava.Smi(rocnik, new(Role.Organizator, Serie, Izolepa)));
        Assert.False(Prava.Smi(jedna, new(Role.Organizator, Serie, Izolepa)));
    }
}
