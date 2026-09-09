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
}
