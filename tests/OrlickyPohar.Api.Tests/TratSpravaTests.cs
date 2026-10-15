using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Boje;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Stavy trati proti reálnému PostgreSQL.
/// <para>
/// Jádro věci: <b>zámek musí něco znamenat</b>. Přijatá trať je veřejná, takže
/// se do ní nesmí dát sáhnout bez toho, aby se o tom venku vědělo — a trať,
/// podle které se jelo, se nepřepisuje vůbec.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class TratSpravaTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 9, 8, 0, 0, TimeSpan.Zero);

    private sealed class ZadneUloziste : OrlickyPohar.Api.Features.Fotky.IUloziste
    {
        public bool Pripraveno => true;
        public string? VerejnaAdresa => "https://foto.example";

        public Task UlozAsync(
            string klic, byte[] data, string typ, CancellationToken ct, string? cache = null) =>
            Task.CompletedTask;

        public Task SmazAsync(string klic, CancellationToken ct) => Task.CompletedTask;
    }

    private (AppDbContext Db, BojeSprava Boje, TratSprava Trat) Sluzby()
    {
        var (db, boje, trat, _) = SluzbyIPrvky();
        return (db, boje, trat);
    }

    private (AppDbContext Db, BojeSprava Boje, TratSprava Trat, PrvkySprava Prvky) SluzbyIPrvky()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var trat = new TratSprava(db, TimeProvider.System, new ZadneUloziste());

        return (db,
            BojeSluzba(db, trat),
            trat,
            new PrvkySprava(db, trat, TimeProvider.System));
    }

    private static BojeSprava BojeSluzba(AppDbContext db, TratSprava trat)
    {
        var uloziste = new ZadneUloziste();
        return new BojeSprava(
            db, TimeProvider.System, uloziste, trat,
            new OrlickyPohar.Api.Features.Fotky.FotkySprava(
                db, uloziste, TimeProvider.System,
                NullLogger<OrlickyPohar.Api.Features.Fotky.FotkySprava>.Instance),
            NullLogger<BojeSprava>.Instance);
    }

    private static async Task<(Zavod Zavod, Uzivatel Kdo)> RegataAsync(AppDbContext db)
    {
        var klic = Guid.NewGuid().ToString("N")[..8];
        var serie = new Serie { Slug = $"trat-{klic}", Nazev = "Traťová série", Rok = 2027 };
        db.Serie.Add(serie);
        await db.SaveChangesAsync();

        var zavod = new Zavod
        {
            SerieId = serie.Id,
            Slug = $"regata-{klic}",
            Nazev = "Traťová regata",
            Datum = new DateOnly(2027, 5, 15),
        };
        db.Zavody.Add(zavod);

        var kdo = new Uzivatel
        {
            Id = Guid.CreateVersion7(),
            Zobrazovane = "Rozhodčí",
            Email = $"trat-{klic}@example.test",
            ZalozenV = Ted,
        };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();
        return (zavod, kdo);
    }

    private static PipnutiVstup Bod(string nazev) => new(nazev, 0, 49.516, 14.165, 5, null);

    [Fact]
    public async Task Stavba_zacina_prvni_boji()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        // Dokud regata nemá bóji, nemá ani trať — a nemá se co zakládat
        // naprázdno.
        Assert.Null(await trate.StavAsync(zavod.Id, true, true, default));

        Assert.Null((await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default)).Chyba);

        var stav = await trate.StavAsync(zavod.Id, true, true, default);
        Assert.Equal(StavTrati.Rozestaveno, stav!.Stav);
        Assert.False(stav.Odjeta);
    }

    [Fact]
    public async Task Prijata_trat_je_zamcena_pro_pipnuti_i_sebrani()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvni, _) = await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        Assert.Null((await trate.HotovoAsync(zavod.Id, true, default)).Chyba);
        Assert.Null((await trate.PrijmiAsync(zavod.Id, kdo.Id, default)).Chyba);

        // Tohle je ten zámek. Bez něj by byl stav jen nápis.
        Assert.NotNull((await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default)).Chyba);
        Assert.NotNull(await boje.SeberAsync(zavod.Id, prvni!.Id, default));

        // A zapsat se nesmělo nic.
        Assert.Equal(1, await db.Boje.CountAsync(b => b.ZavodId == zavod.Id));
        Assert.Null(await db.Boje.Where(b => b.ZavodId == zavod.Id)
            .Select(b => b.SebranaV).FirstAsync());
    }

    [Fact]
    public async Task Prestavba_neodjete_trate_ji_jen_odemkne()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        var (po, chyba) = await trate.PrestavbaAsync(zavod.Id, true, default);

        Assert.Null(chyba);
        Assert.Equal(StavTrati.Prestavba, po!.Stav);
        // `PrijatoV` zůstává. Dřív se mazalo, „aby neukazovalo na stav,
        // který neplatí" — jenže co platí teď, říká `Stav`, a smazáním
        // času se ztrácel doklad, že trať chvíli byla veřejná. Na něm
        // stojí rozhodnutí, jestli se záznam bóje smí zahodit, nebo ho
        // někdo venku viděl (`BojeSprava.ZahodAsync`).
        Assert.NotNull(po.PrijatoV);
        // Historie se nevyrábí: tahle trať ještě nikomu nesloužila.
        Assert.Equal(1, await db.Trate.CountAsync(t => t.ZavodId == zavod.Id));
        // A stavět se zase smí.
        Assert.Null((await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default)).Chyba);
    }

    [Fact]
    public async Task Podle_odjete_trate_se_jelo_takze_vznikne_nova()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await trate.HotovoAsync(zavod.Id, true, default);
        var (prijata, _) = await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        // Rozjížďka odstartovala po přijetí, tedy se podle téhle trati jelo.
        // Nikam se to nezapisuje, dopočítá se ze startu.
        db.Rozjizdky.Add(new Rozjizdka
        {
            ZavodId = zavod.Id,
            Cislo = 1,
            StartV = prijata!.PrijatoV!.Value.AddMinutes(5),
        });
        await db.SaveChangesAsync();

        Assert.True((await trate.StavAsync(zavod.Id, true, true, default))!.Odjeta);

        // Krizová přestavba: vítr odfoukne bójku. Stará trať zůstane přijatá,
        // protože podle ní lodě jely, a navazuje na ni nová.
        var (nova, chyba) = await trate.PrestavbaAsync(zavod.Id, true, default);

        Assert.Null(chyba);
        Assert.Equal(StavTrati.Prestavba, nova!.Stav);
        Assert.NotEqual(prijata.Id, nova.Id);

        var stara = await db.Trate.FirstAsync(t => t.Id == prijata.Id);
        Assert.Equal(StavTrati.Prijato, stara.Stav);
        Assert.NotNull(stara.PrijatoV);

        var zalozena = await db.Trate.FirstAsync(t => t.Id == nova.Id);
        Assert.Equal(prijata.Id, zalozena.NahrazujeId);
    }

    [Fact]
    public async Task Verejne_se_vydava_jen_prijata_trat()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        var (nahrazena, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 1"), kdo.Id, default);
        var (sebrana, _) = await boje.PipniAsync(zavod.Id, Bod("Bóje 2"), kdo.Id, default);

        // Rozestavěná trať veřejně neexistuje — ani když bóje ve vodě stojí.
        Assert.Null(await trate.VerejnaAsync(zavod.Id, default));

        // Jedna se přenastaví, jedna sebere. Ani jedna nemá být venku:
        // nahrazená proto, že na jejím místě stojí novější záznam, sebraná
        // proto, že ve vodě není.
        await boje.PipniAsync(
            zavod.Id, new PipnutiVstup("Bóje 1", 0, 49.517, 14.166, 5, nahrazena!.Id), kdo.Id, default);
        Assert.Null(await boje.SeberAsync(zavod.Id, sebrana!.Id, default));

        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        var verejna = await trate.VerejnaAsync(zavod.Id, default);

        Assert.NotNull(verejna);
        Assert.False(verejna!.Prestavba);
        Assert.NotNull(verejna.PrijatoV);
        Assert.Equal(["Start", "Bóje 1"], verejna.Boje.Select(b => b.Nazev).ToArray());

        // Přestavba veřejně znamená „počkej", ne tiché zmizení a ne starý
        // obrázek: příznak ano, bóje ne.
        await trate.PrestavbaAsync(zavod.Id, true, default);

        var behem = await trate.VerejnaAsync(zavod.Id, default);
        Assert.True(behem!.Prestavba);
        Assert.Empty(behem.Boje);
        Assert.Empty(behem.Prvky);
        Assert.Null(behem.PrijatoV);
    }

    [Fact]
    public async Task Verejne_jde_ven_trat_jako_rada_prvku()
    {
        // Divák potřebuje vědět, co je čára a co značka. Kdyby dostal jen
        // bóje, složil by si z dvojice nohu trati — přesně tu chybu, kvůli
        // které prvky vznikly.
        var (db, boje, trate, prvky) = SluzbyIPrvky();
        var (zavod, kdo) = await RegataAsync(db);

        var (levy, _) = await boje.PipniAsync(zavod.Id, Bod("start levý"), kdo.Id, default);
        var (pravy, _) = await boje.PipniAsync(zavod.Id, Bod("start pravý"), kdo.Id, default);

        Assert.Null((await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Start, 1, levy!.Id, pravy!.Id,
            Poznamka: "projíždí se po proudu"), kdo.Id, default)).Chyba);

        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        var verejna = await trate.VerejnaAsync(zavod.Id, default);

        var prvek = Assert.Single(verejna!.Prvky);
        Assert.Equal(TypPrvku.Start, prvek.Typ);
        Assert.Equal("start levý", prvek.A.Nazev);
        Assert.Equal("start pravý", prvek.B!.Nazev);
        // Poznámka „jak to jet" je psaná pro závodníky, takže ven patří.
        Assert.Equal("projíždí se po proudu", prvek.Poznamka);

        // Bóje zůstávají vedle prvků: starší klient o prvcích neví a bez
        // nich by mu trať zmizela úplně.
        Assert.Equal(2, verejna.Boje.Count);
    }

    [Fact]
    public async Task Vraceni_stavitelum_nese_duvod()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await trate.HotovoAsync(zavod.Id, true, default);

        Assert.NotNull((await trate.VratAsync(zavod.Id, "  ", default)).Chyba);

        var (po, chyba) = await trate.VratAsync(zavod.Id, " chybí cílová bóje ", default);

        Assert.Null(chyba);
        Assert.Equal(StavTrati.Rozestaveno, po!.Stav);
        Assert.Equal("chybí cílová bóje", po.DuvodVraceni);

        // Dalším hotovo důvod zmizí — už neplatí.
        Assert.Null((await trate.HotovoAsync(zavod.Id, true, default)).Trat!.DuvodVraceni);
    }

    [Fact]
    public async Task Preklep_pri_stavbe_se_nedrzi_jako_historie()
    {
        // Filip, 9. 10. 2026: „Když se překlepnem, nebo rozhodneme to
        // přendat při stavbě před schválením, tak nám ten údaj k ničemu
        // není a ani na něm nic nevisí."
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvni, _) = await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        var (druha, _) = await boje.PipniAsync(
            zavod.Id, Bod("Start") with { NahrazujeId = prvni!.Id }, kdo.Id, default);

        // Z překlepu nezůstal řádek, jen ta oprava.
        Assert.Null(await db.Boje.FindAsync([prvni.Id], default));
        Assert.Equal(1, await db.Boje.CountAsync(b => b.ZavodId == zavod.Id));
        // A řetěz nekončí v prázdnu.
        Assert.Null(await db.Boje.Where(b => b.Id == druha!.Id)
            .Select(b => b.NahrazujeId).FirstAsync());

        // Sebrání rozestavěné bóje taky nic nezanechá.
        Assert.Null(await boje.SeberAsync(zavod.Id, druha!.Id, default));
        Assert.Equal(0, await db.Boje.CountAsync(b => b.ZavodId == zavod.Id));
    }

    [Fact]
    public async Task Co_bylo_v_prijate_trati_zustane_i_kdyz_na_nej_neukazuje_prvek()
    {
        // Veřejná trať vydává i seznam stojících bójí, takže i bóje bez
        // prvku už byla venku — a co bylo veřejné, se zpětně nepřepisuje.
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);

        var (stojici, _) = await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);
        await trate.PrestavbaAsync(zavod.Id, true, default);

        Assert.Null(await boje.SeberAsync(zavod.Id, stojici!.Id, default));

        var zustala = await db.Boje.FindAsync([stojici.Id], default);
        Assert.NotNull(zustala);
        Assert.NotNull(zustala!.SebranaV);
    }

    [Fact]
    public async Task Boje_pouzita_prvkem_zustane()
    {
        var (db, boje, trate, prvky) = SluzbyIPrvky();
        var (zavod, kdo) = await RegataAsync(db);

        var (prvni, _) = await boje.PipniAsync(zavod.Id, Bod("Značka"), kdo.Id, default);
        Assert.Null((await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, prvni!.Id), kdo.Id, default)).Chyba);

        // Prvek je rozhodnutí o trati; smazáním záznamu by se rozbil.
        var (druha, _) = await boje.PipniAsync(
            zavod.Id, Bod("Značka") with { NahrazujeId = prvni.Id }, kdo.Id, default);

        Assert.NotNull(await db.Boje.FindAsync([prvni.Id], default));
        Assert.Equal(prvni.Id, await db.Boje.Where(b => b.Id == druha!.Id)
            .Select(b => b.NahrazujeId).FirstAsync());
    }

    /// <summary>Rozjížďka regaty, ať je čemu trať přiřadit.</summary>
    private static async Task<Rozjizdka> RozjizdkaAsync(
        AppDbContext db, Zavod zavod, int cislo, DateTimeOffset? start = null)
    {
        var r = new Rozjizdka { ZavodId = zavod.Id, Cislo = cislo, StartV = start };
        db.Rozjizdky.Add(r);
        await db.SaveChangesAsync();
        return r;
    }

    /// <summary>
    /// Zkrácení trati (Filip, 15. 10. 2026: *„za běhu do toho má jít
    /// sáhnout a trať zkrátit"*).
    ///
    /// <para>
    /// <b>U konkrétního prvku</b>, ne jen příznakem — jinak by se
    /// nedal dopočítat hendikep a odjeté regaty se už nedoplní. Na
    /// pořadí to nesahá: *„zkrácení počítá normální pořadí, jen cíl je
    /// u té bóje"*.
    /// </para>
    /// </summary>
    [Fact]
    public async Task Zkraceni_posune_cil_k_prvku_a_jde_i_na_zamcene_trati()
    {
        var (db, boje, trate, prvky) = SluzbyIPrvky();
        var (zavod, kdo) = await RegataAsync(db);

        var (a, _) = await boje.PipniAsync(zavod.Id, Bod("A"), kdo.Id, default);
        var (b, _) = await boje.PipniAsync(zavod.Id, Bod("B"), kdo.Id, default);
        await prvky.ZalozAsync(zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, a!.Id), kdo.Id, default);
        await prvky.ZalozAsync(zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 2, b!.Id), kdo.Id, default);

        var rozjizdka = await RozjizdkaAsync(db, zavod, 1);
        var trat = (await trate.AktualniAsync(zavod.Id, default))!;
        Assert.Null((await trate.PriradAsync(zavod.Id, trat.Id, rozjizdka.Cislo, true, default)).Chyba);

        var seznam = await db.PrvkyTrati.Where(x => x.TratId == trat.Id)
            .OrderBy(x => x.Poradi).ToListAsync();

        // Dokud se nejede, zkracovat nejde — to by bylo stavět kratší trať.
        Assert.NotNull(await trate.ZkratAsync(zavod.Id, trat.Id, seznam[0].Id, kdo.Id, default));

        // Zamčená a běžící: zkrátit jde, zámek tomu nebrání.
        trat.Stav = StavTrati.Prijato;
        trat.PrijatoV = DateTimeOffset.UnixEpoch;
        rozjizdka.Stav = StavRozjizdky.Probiha;
        await db.SaveChangesAsync();

        // U posledního prvku cíl už je.
        Assert.NotNull(await trate.ZkratAsync(zavod.Id, trat.Id, seznam[1].Id, kdo.Id, default));

        Assert.Null(await trate.ZkratAsync(zavod.Id, trat.Id, seznam[0].Id, kdo.Id, default));
        await db.Entry(trat).ReloadAsync();
        Assert.Equal(seznam[0].Id, trat.ZkracenoUPrvkuId);
        Assert.NotNull(trat.ZkracenoV);
        Assert.Equal(kdo.Id, trat.ZkratilId);

        // Prvky zůstávají: ve vodě se nic nezměnilo.
        Assert.Equal(2, await db.PrvkyTrati.CountAsync(x => x.TratId == trat.Id));

        // Zrušit jde, dokud se jede.
        Assert.Null(await trate.ZrusZkraceniAsync(zavod.Id, trat.Id, default));
        await db.Entry(trat).ReloadAsync();
        Assert.Null(trat.ZkracenoUPrvkuId);

        // Po dojetí už ne — to by přepsalo, podle čeho se jelo.
        Assert.Null(await trate.ZkratAsync(zavod.Id, trat.Id, seznam[0].Id, kdo.Id, default));
        rozjizdka.Stav = StavRozjizdky.Dokoncena;
        await db.SaveChangesAsync();
        Assert.NotNull(await trate.ZkratAsync(zavod.Id, trat.Id, seznam[0].Id, kdo.Id, default));
        Assert.NotNull(await trate.ZrusZkraceniAsync(zavod.Id, trat.Id, default));
    }

    [Fact]
    public async Task Klon_kopiruje_prvky_na_tytez_boje_a_nevyrabi_pipnuti()
    {
        var (db, boje, trate, prvky) = SluzbyIPrvky();
        var (zavod, kdo) = await RegataAsync(db);

        var (levy, _) = await boje.PipniAsync(zavod.Id, Bod("start levý"), kdo.Id, default);
        var (pravy, _) = await boje.PipniAsync(zavod.Id, Bod("start pravý"), kdo.Id, default);
        await prvky.ZalozAsync(zavod.Id, new PrvekVstup(
            TypPrvku.Start, 1, levy!.Id, pravy!.Id, Poznamka: "po proudu"), kdo.Id, default);

        var prvni = await RozjizdkaAsync(db, zavod, 1);
        var puvodni = (await trate.AktualniAsync(zavod.Id, default))!;
        Assert.Null((await trate.PriradAsync(zavod.Id, puvodni.Id, prvni.Cislo, true, default)).Chyba);

        var druha = await RozjizdkaAsync(db, zavod, 2);
        var (klon, chyba) = await trate.KlonujAsync(
            zavod.Id, puvodni.Id, new KlonTratiVstup(druha.Cislo, null), kdo.Id, true, default);

        Assert.Null(chyba);
        // Výchozí stav je hotovo: klon je tvrzení stavitele, ne rozhodnutí
        // rozhodčího (Filip, 9. 10. 2026).
        Assert.Equal(StavTrati.Hotovo, klon!.Stav);
        Assert.Equal(druha.Id, klon.RozjizdkaId);
        Assert.Equal(2, klon.CisloRozjizdky);
        Assert.Null(klon.PrijatoV);
        // Klon starou trať nenahrazuje — obě platí dál.
        Assert.Null(klon.NahrazujeId);

        // Tohle je ta podstatná věc: žádná nová pípnutí. Prvky ukazují na
        // tytéž záznamy bójí, které pořád stojí ve vodě.
        Assert.Equal(2, await db.Boje.CountAsync(b => b.ZavodId == zavod.Id));

        var zkopirovane = await db.PrvkyTrati.Where(x => x.TratId == klon.Id).ToListAsync();
        var jeden = Assert.Single(zkopirovane);
        Assert.Equal(levy.Id, jeden.BojeAId);
        Assert.Equal(pravy.Id, jeden.BojeBId);
        Assert.Equal("po proudu", jeden.Poznamka);
        Assert.Equal(TypPrvku.Start, jeden.Typ);

        // A originál zůstal, kde byl.
        Assert.Single(await db.PrvkyTrati.Where(x => x.TratId == puvodni.Id).ToListAsync());
    }

    [Fact]
    public async Task Prijaty_klon_smi_jen_rozhodci()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        var zdroj = (await trate.AktualniAsync(zavod.Id, default))!;

        var vstup = new KlonTratiVstup(null, StavTrati.Prijato);

        // Stavitel by si tím odemkl zámek: přijetí je to, co trať zveřejní.
        Assert.NotNull((await trate.KlonujAsync(
            zavod.Id, zdroj.Id, vstup, kdo.Id, false, default)).Chyba);

        var (klon, chyba) = await trate.KlonujAsync(
            zavod.Id, zdroj.Id, vstup, kdo.Id, true, default);
        Assert.Null(chyba);
        Assert.Equal(StavTrati.Prijato, klon!.Stav);
        Assert.NotNull(klon.PrijatoV);
    }

    [Fact]
    public async Task Obsazena_trat_se_neprirazuje_a_rozjizdka_nema_dve()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        var zdroj = (await trate.AktualniAsync(zavod.Id, default))!;

        var prvni = await RozjizdkaAsync(db, zavod, 1);
        var druha = await RozjizdkaAsync(db, zavod, 2);
        Assert.Null((await trate.PriradAsync(zavod.Id, zdroj.Id, prvni.Cislo, true, default)).Chyba);

        // Odebrat trať rozjížďce by přepsalo, podle čeho se jelo.
        Assert.NotNull((await trate.PriradAsync(zavod.Id, zdroj.Id, druha.Cislo, true, default)).Chyba);

        // A druhá trať téže rozjížďky se taky nevyrobí — na to je přestavba.
        Assert.NotNull((await trate.KlonujAsync(
            zavod.Id, zdroj.Id, new KlonTratiVstup(prvni.Cislo, null), kdo.Id, true, default)).Chyba);
    }

    [Fact]
    public async Task Verejne_plati_nejnovejsi_prijata_ne_nejnovejsi()
    {
        var (db, boje, trate, prvky) = SluzbyIPrvky();
        var (zavod, kdo) = await RegataAsync(db);

        var (b, _) = await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, b!.Id), kdo.Id, default);
        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        var prvni = await RozjizdkaAsync(db, zavod, 1);
        var odjeta = (await trate.AktualniAsync(zavod.Id, default))!;
        await trate.PriradAsync(zavod.Id, odjeta.Id, prvni.Cislo, true, default);

        var druha = await RozjizdkaAsync(db, zavod, 2);
        await trate.KlonujAsync(
            zavod.Id, odjeta.Id, new KlonTratiVstup(druha.Cislo, null), kdo.Id, true, default);

        // Čerstvý klon je nejnovější, ale nikdo ho nepřijal. Veřejně proto
        // dál platí trať, podle které se zrovna pluje — jinak by stránka
        // uprostřed závodu řekla „trať není vyvěšená".
        var verejna = await trate.VerejnaAsync(zavod.Id, default);
        Assert.NotNull(verejna);
        Assert.False(verejna!.Prestavba);
        Assert.Equal(1, verejna.CisloRozjizdky);
        Assert.Single(verejna.Prvky);
    }

    [Fact]
    public async Task Seznam_rekne_co_jde_priradit_a_co_se_musi_klonovat()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        var zdroj = (await trate.AktualniAsync(zavod.Id, default))!;

        Assert.True(Assert.Single(await trate.SeznamAsync(zavod.Id, default)).JdePriradit);

        var prvni = await RozjizdkaAsync(db, zavod, 1);
        await trate.PriradAsync(zavod.Id, zdroj.Id, prvni.Cislo, true, default);

        var obsazena = Assert.Single(await trate.SeznamAsync(zavod.Id, default));
        Assert.False(obsazena.JdePriradit);
        Assert.Equal(1, obsazena.CisloRozjizdky);
        // Nespustila se, takže se podle ní ještě nejelo.
        Assert.False(obsazena.Odjeta);
    }

    [Fact]
    public async Task Rozjizdky_na_vyber_reknou_ktera_tra_ma_a_ktera_uz_jela()
    {
        var (db, boje, trate) = Sluzby();
        var (zavod, kdo) = await RegataAsync(db);
        await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        var zdroj = (await trate.AktualniAsync(zavod.Id, default))!;

        var prvni = await RozjizdkaAsync(db, zavod, 1, Ted);
        await RozjizdkaAsync(db, zavod, 2);
        await trate.PriradAsync(zavod.Id, zdroj.Id, prvni.Cislo, true, default);

        var nabidka = await trate.RozjizdkyAsync(zavod.Id, default);

        Assert.Equal([1, 2], nabidka.Select(r => r.Cislo));
        Assert.Equal(zdroj.Id, nabidka[0].TratId);
        Assert.True(nabidka[0].Odstartovana);
        // Druhá trať nemá, takže se na ni dá zaškrtnout.
        Assert.Null(nabidka[1].TratId);
        Assert.False(nabidka[1].Odstartovana);
    }

    [Fact]
    public async Task Otisk_drzi_klony_pohromade_a_po_uprave_je_rozdeli()
    {
        var (db, boje, trate, prvky) = SluzbyIPrvky();
        var (zavod, kdo) = await RegataAsync(db);
        var (b, _) = await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, b!.Id), kdo.Id, default);

        var zdroj = (await trate.AktualniAsync(zavod.Id, default))!;
        var prvni = await RozjizdkaAsync(db, zavod, 1);
        var druha = await RozjizdkaAsync(db, zavod, 2);
        await trate.PriradAsync(zavod.Id, zdroj.Id, prvni.Cislo, true, default);
        var (klon, _) = await trate.KlonujAsync(
            zavod.Id, zdroj.Id, new KlonTratiVstup(druha.Cislo, null), kdo.Id, true, default);

        // Čerstvý klon jede totéž, takže se obě tratě tváří jako jedna.
        var spolu = await trate.SeznamAsync(zavod.Id, default);
        Assert.Equal(2, spolu.Count);
        Assert.NotNull(spolu[0].Otisk);
        Assert.Equal(spolu[0].Otisk, spolu[1].Otisk);

        // Klon je kopie, ne vazba: úprava jedné instance druhou nechá být
        // a pohled „jede se stejně“ se tím musí rozpadnout sám.
        var klonPrvek = await db.PrvkyTrati.SingleAsync(x => x.TratId == klon!.Id);
        Assert.Null((await prvky.UpravAsync(
            zavod.Id,
            klonPrvek.Id,
            new PrvekVstup(TypPrvku.OtocnaBoje, 1, b.Id, Poznamka: "cíl se mění"),
            kdo.Id,
            default)).Chyba);

        var zvlast = await trate.SeznamAsync(zavod.Id, default);
        Assert.NotEqual(zvlast[0].Otisk, zvlast[1].Otisk);
    }

    [Fact]
    public async Task Odskrtnuti_smaze_instanci_jen_kdyz_stejna_zbyde_jinde()
    {
        var (db, boje, trate, prvky) = SluzbyIPrvky();
        var (zavod, kdo) = await RegataAsync(db);
        var (b, _) = await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, b!.Id), kdo.Id, default);

        var zdroj = (await trate.AktualniAsync(zavod.Id, default))!;
        var prvni = await RozjizdkaAsync(db, zavod, 1);
        var druha = await RozjizdkaAsync(db, zavod, 2);
        await trate.PriradAsync(zavod.Id, zdroj.Id, prvni.Cislo, true, default);
        var (klon, _) = await trate.KlonujAsync(
            zavod.Id, zdroj.Id, new KlonTratiVstup(druha.Cislo, null), kdo.Id, true, default);

        // Stejný předpis zbyde u první rozjížďky, takže klon je navíc.
        Assert.Null((await trate.OdvazAsync(zavod.Id, klon!.Id, false, default)).Chyba);
        var po = await trate.SeznamAsync(zavod.Id, default);
        Assert.Equal(zdroj.Id, Assert.Single(po).Id);

        // Teď je poslední svého druhu: odškrtnutí ji nesmí zahodit, jinak
        // by nebylo co upravit a změnit.
        Assert.Null((await trate.OdvazAsync(zavod.Id, zdroj.Id, false, default)).Chyba);
        var zbyla = Assert.Single(await trate.SeznamAsync(zavod.Id, default));
        Assert.Equal(zdroj.Id, zbyla.Id);
        Assert.Null(zbyla.CisloRozjizdky);
        Assert.True(zbyla.JdePriradit);
    }

    [Fact]
    public async Task Odjeta_trat_se_nezamyka_ale_chce_potvrdit()
    {
        var (db, boje, trate, prvky) = SluzbyIPrvky();
        var (zavod, kdo) = await RegataAsync(db);
        var (b, _) = await boje.PipniAsync(zavod.Id, Bod("Start"), kdo.Id, default);
        await prvky.ZalozAsync(
            zavod.Id, new PrvekVstup(TypPrvku.OtocnaBoje, 1, b!.Id), kdo.Id, default);
        await trate.HotovoAsync(zavod.Id, true, default);
        await trate.PrijmiAsync(zavod.Id, kdo.Id, default);

        var zdroj = (await trate.AktualniAsync(zavod.Id, default))!;
        var prvni = await RozjizdkaAsync(db, zavod, 1);
        await trate.PriradAsync(zavod.Id, zdroj.Id, prvni.Cislo, true, default);

        // Přijatá, ale ještě neodjetá: zámek rozhodčího platí a potvrzení
        // ho neobejde. Cesta ven je přestavba, ne knoflík na stavitelské
        // obrazovce.
        var zamcena = await trate.ZahodAsync(zavod.Id, zdroj.Id, true, default);
        Assert.NotNull(zamcena.Chyba);
        Assert.False(zamcena.ChcePotvrdit);

        // Odjetá je trať jedině s přijetím, takže tohle je zároveň
        // přijatá trať — a přesto se má jen zeptat. Přijetí razítkuje
        // `TimeProvider.System`, ne pevné `Ted`, takže start musí být po
        // „teď“, jinak trať jako odjetá nevyjde.
        prvni.StartV = DateTimeOffset.UtcNow.AddHours(1);
        await db.SaveChangesAsync();

        var ptaSe = await trate.ZahodAsync(zavod.Id, zdroj.Id, false, default);
        Assert.NotNull(ptaSe.Chyba);
        Assert.True(ptaSe.ChcePotvrdit);
        Assert.NotEmpty(await trate.SeznamAsync(zavod.Id, default));

        Assert.Null((await trate.ZahodAsync(zavod.Id, zdroj.Id, true, default)).Chyba);
        Assert.Empty(await trate.SeznamAsync(zavod.Id, default));
    }

    /// <summary>
    /// Vybraná trať se vydá i tehdy, když není nejnovější. Bez toho by
    /// taby rozjížděk ukazovaly pořád tutéž trať.
    /// </summary>
    [Fact]
    public async Task Vybrana_trat_se_vyda_i_kdyz_neni_nejnovejsi()
    {
        var (db, _, trat) = Sluzby();
        var (zavod, _) = await RegataAsync(db);
        var rozjizdka = await RozjizdkaAsync(db, zavod, 1);

        // První trať dostane rozjížďku — bez toho by `DalsiAsync` vrátila
        // tutéž prázdnou a druhá by nevznikla. (Na to je vlastní test níž;
        // tenhle by pak neměřil nic.)
        var starsi = await trat.DalsiAsync(zavod.Id, false, default);
        var ulozena = await db.Trate.FirstAsync(t => t.Id == starsi.Id);
        ulozena.RozjizdkaId = rozjizdka.Id;
        await db.SaveChangesAsync();

        var novejsi = await trat.DalsiAsync(zavod.Id, false, default);
        Assert.NotEqual(starsi.Id, novejsi.Id);

        var vybrana = await trat.VybranaAsync(zavod.Id, starsi.Id, default);
        Assert.Equal(starsi.Id, vybrana!.Id);
    }

    /// <summary>
    /// Trať cizí regaty se nevydá. Id je číslo, které jde uhodnout — bez
    /// téhle kontroly by stačilo zkoušet, a obrazovka by cizí trať ukázala
    /// jako vlastní.
    /// </summary>
    [Fact]
    public async Task Trat_jine_regaty_se_nevyda()
    {
        var (db, _, trat) = Sluzby();
        var (nase, _) = await RegataAsync(db);
        var (cizi, _) = await RegataAsync(db);

        var ciziTrat = await trat.DalsiAsync(cizi.Id, false, default);

        Assert.Null(await trat.VybranaAsync(nase.Id, ciziTrat.Id, default));
    }

    /// <summary>
    /// Plus zmáčknuté dvakrát nevyrobí dvě prázdné tratě — ty by v tabech
    /// zůstaly navždy a uklidit by se nedaly.
    /// </summary>
    [Fact]
    public async Task Dalsi_trat_se_nezaklada_dvakrat_naprazdno()
    {
        var (db, _, trat) = Sluzby();
        var (zavod, _) = await RegataAsync(db);

        var prvni = await trat.DalsiAsync(zavod.Id, false, default);
        var druha = await trat.DalsiAsync(zavod.Id, false, default);

        Assert.Equal(prvni.Id, druha.Id);
        Assert.Equal(1, await db.Trate.CountAsync(t => t.ZavodId == zavod.Id));
    }

    /// <summary>
    /// Jakmile prázdná trať dostane rozjížďku, plus založí další —
    /// to je ten případ, kdy se staví druhá trať pro druhou rozjížďku.
    /// </summary>
    [Fact]
    public async Task Po_prirazeni_rozjizdky_zalozi_plus_dalsi_trat()
    {
        var (db, _, trat) = Sluzby();
        var (zavod, _) = await RegataAsync(db);
        var rozjizdka = await RozjizdkaAsync(db, zavod, 1);

        var prvni = await trat.DalsiAsync(zavod.Id, false, default);
        var ulozena = await db.Trate.FirstAsync(t => t.Id == prvni.Id);
        ulozena.RozjizdkaId = rozjizdka.Id;
        await db.SaveChangesAsync();

        var druha = await trat.DalsiAsync(zavod.Id, false, default);

        Assert.NotEqual(prvni.Id, druha.Id);
    }

    /// <summary>
    /// Pomocník: přijatá trať přiřazená rozjížďce. Veřejná trať bere jen
    /// přijaté, takže bez přijetí by testy neměřily nic.
    /// </summary>
    private static async Task<Trat> PrijataTratAsync(
        AppDbContext db, Zavod zavod, Rozjizdka? rozjizdka)
    {
        var t = new Trat
        {
            ZavodId = zavod.Id,
            RozjizdkaId = rozjizdka?.Id,
            Stav = StavTrati.Prijato,
            ZalozenaV = Ted,
            PrijatoV = Ted,
        };
        db.Trate.Add(t);
        await db.SaveChangesAsync();
        return t;
    }

    /// <summary>
    /// Divák vidí trať rozjížďky, která se právě jede — ne tu nejnovější.
    /// Dřív rozhodovalo id, takže se dalo koukat na trať čtvrté rozjížďky,
    /// zatímco se jela druhá.
    /// </summary>
    [Fact]
    public async Task Verejna_trat_je_od_probihajici_rozjizdky()
    {
        var (db, _, trat) = Sluzby();
        var (zavod, _) = await RegataAsync(db);

        var prvni = await RozjizdkaAsync(db, zavod, 1);
        var druha = await RozjizdkaAsync(db, zavod, 2);
        prvni.Stav = StavRozjizdky.Probiha;
        druha.Stav = StavRozjizdky.Planovana;
        await db.SaveChangesAsync();

        var tratPrvni = await PrijataTratAsync(db, zavod, prvni);
        // Novější trať patří druhé rozjížďce — podle id by vyhrála ona.
        await PrijataTratAsync(db, zavod, druha);

        var verejna = await trat.VerejnaAsync(zavod.Id, default);

        Assert.Equal(1, verejna!.CisloRozjizdky);
        Assert.NotNull(tratPrvni);
    }

    /// <summary>
    /// Když se nic nejede, bere se nejbližší plánovaná — ta, co se pojede.
    /// </summary>
    [Fact]
    public async Task Bez_probihajici_se_bere_nejblizsi_planovana()
    {
        var (db, _, trat) = Sluzby();
        var (zavod, _) = await RegataAsync(db);

        var druha = await RozjizdkaAsync(db, zavod, 2);
        var treti = await RozjizdkaAsync(db, zavod, 3);
        await PrijataTratAsync(db, zavod, treti);
        await PrijataTratAsync(db, zavod, druha);

        var verejna = await trat.VerejnaAsync(zavod.Id, default);

        Assert.Equal(2, verejna!.CisloRozjizdky);
    }

    /// <summary>
    /// Po závodě zůstane poslední dokončená, aby stránka nezmizela —
    /// trať, podle které se dojelo, diváka pořád zajímá.
    /// </summary>
    [Fact]
    public async Task Po_zavode_zustane_posledni_dokoncena()
    {
        var (db, _, trat) = Sluzby();
        var (zavod, _) = await RegataAsync(db);

        var prvni = await RozjizdkaAsync(db, zavod, 1);
        var druha = await RozjizdkaAsync(db, zavod, 2);
        prvni.Stav = StavRozjizdky.Dokoncena;
        druha.Stav = StavRozjizdky.Dokoncena;
        await db.SaveChangesAsync();

        await PrijataTratAsync(db, zavod, druha);
        await PrijataTratAsync(db, zavod, prvni);

        var verejna = await trat.VerejnaAsync(zavod.Id, default);

        Assert.Equal(2, verejna!.CisloRozjizdky);
    }

    /// <summary>
    /// Rozjížďka na řadě trať mít nemusí — staví se, zatímco lodě čekají.
    /// Ukázat prázdno by bylo horší než ukázat tu poslední přijatou.
    /// </summary>
    [Fact]
    public async Task Bez_trati_u_rozjizdky_se_vyda_posledni_prijata()
    {
        var (db, _, trat) = Sluzby();
        var (zavod, _) = await RegataAsync(db);

        var prvni = await RozjizdkaAsync(db, zavod, 1);
        var druha = await RozjizdkaAsync(db, zavod, 2);
        druha.Stav = StavRozjizdky.Probiha;
        await db.SaveChangesAsync();

        // Druhá se zrovna staví, přijatou trať má jen první.
        await PrijataTratAsync(db, zavod, prvni);

        var verejna = await trat.VerejnaAsync(zavod.Id, default);

        Assert.NotNull(verejna);
        Assert.Equal(1, verejna!.CisloRozjizdky);
    }
}
