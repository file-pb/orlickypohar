using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Oponentura;
using OrlickyPohar.Api.Features.Serial;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Sady otázek proti reálnému PostgreSQL.
/// <para>
/// Jádro jsou tři věci, které se jinde neověří: že <b>nahrávka doopravdy
/// doteče do úložiště a dá se přečíst zpátky</b>, že <b>stav sady</b> sedí
/// i když je odpověď jen hlasem, a že <b>doplnění sady nic nezahodí</b> —
/// otázka, na kterou už někdo odpověděl, nesmí zmizet jen proto, že
/// v druhém odeslání chybí.
/// </para>
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class OponenturaSpravaTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Ted = new(2026, 10, 28, 20, 0, 0, TimeSpan.Zero);

    /// <summary>Hlavička WebM, jak ji pošle <c>MediaRecorder</c>.</summary>
    private static readonly byte[] Webm = [0x1A, 0x45, 0xDF, 0xA3, 0x42, 0x86, 0x81, 0x01];

    private sealed class PametoveUloziste : IUloziste
    {
        public Dictionary<string, byte[]> Soubory { get; } = [];
        public Dictionary<string, string?> Cache { get; } = [];
        public bool Pripraveno => true;
        public string? VerejnaAdresa => "https://foto.example";

        public Task UlozAsync(
            string klic, byte[] data, string typ, CancellationToken ct, string? cache = null)
        {
            Soubory[klic] = data;
            Cache[klic] = cache;
            return Task.CompletedTask;
        }

        public Task<Stream?> CtiAsync(string klic, CancellationToken ct) =>
            Task.FromResult<Stream?>(
                Soubory.TryGetValue(klic, out var data) ? new MemoryStream(data) : null);

        public Task SmazAsync(string klic, CancellationToken ct)
        {
            Soubory.Remove(klic);
            return Task.CompletedTask;
        }
    }

    private (AppDbContext Db, OponenturaSprava Sprava, PametoveUloziste Uloziste) Sluzby()
    {
        var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var uloziste = new PametoveUloziste();
        return (db, new OponenturaSprava(db, uloziste, TimeProvider.System,
            NullLogger<OponenturaSprava>.Instance), uloziste);
    }

    private static async Task<(Serie Serie, Uzivatel Kdo)> RocnikAsync(AppDbContext db)
    {
        var jmeno = $"{Guid.NewGuid():N}"[..12];

        var serie = new Serie { Nazev = $"Pohár {jmeno}", Rok = 2027, Slug = $"opon-{jmeno}" };
        db.Serie.Add(serie);

        var kdo = new Uzivatel
        {
            Id = Guid.CreateVersion7(), Zobrazovane = "Rozhodčí",
            Email = $"opon-{jmeno}@example.test", ZalozenV = Ted,
        };
        db.Uzivatele.Add(kdo);
        await db.SaveChangesAsync();

        return (serie, kdo);
    }

    /// <summary>
    /// Nová sada je neodpovězená, i když má devět otázek — stav se počítá
    /// z odpovědí, ne z toho, že sada existuje.
    /// </summary>
    [Fact]
    public async Task Nova_sada_je_neodpovezena()
    {
        var (db, sprava, _) = Sluzby();
        var (serie, kdo) = await RocnikAsync(db);

        await sprava.ZalozAsync(serie.Id, PrvniSada.Obsah(), default);

        var sady = await sprava.SeznamAsync(serie.Id, kdo.Id, default);
        var sada = Assert.Single(sady);
        Assert.Equal(PrvniSada.Slug, sada.Slug);
        Assert.Equal(9, sada.PocetOtazek);
        Assert.Equal(0, sada.Odpovezeno);
        Assert.Equal(StavSady.Neodpovezeno, sada.Stav);
        Assert.Null(sada.ZmenenoV);
    }

    /// <summary>
    /// <b>Hlas sám o sobě je odpověď.</b> Tak Miloš odpovídá: osm otázek
    /// třinácti nahrávkami. Kdyby se do stavu počítalo jen zaškrtnutí
    /// a text, byla by sada po třinácti nahrávkách pořád „neodpovězená“.
    /// </summary>
    [Fact]
    public async Task Nahravka_doteka_do_uloziste_a_cte_se_zpatky()
    {
        var (db, sprava, uloziste) = Sluzby();
        var (serie, kdo) = await RocnikAsync(db);
        await sprava.ZalozAsync(serie.Id, PrvniSada.Obsah(), default);

        var (nahravka, chyba) = await sprava.NahrajAsync(
            serie.Id, serie.Slug, PrvniSada.Slug, "B5", Webm, 13, kdo.Id, default);

        Assert.Null(chyba);
        Assert.NotNull(nahravka);
        Assert.Equal("audio/webm", nahravka.Typ);
        Assert.Equal(13, nahravka.Sekund);
        // Adresa vede na API, ne na veřejnou adresu úložiště.
        Assert.StartsWith("/sprava/serie/", nahravka.Adresa);
        Assert.DoesNotContain("foto.example", nahravka.Adresa);

        // V úložišti to doopravdy leží, pod předponou a bez edge cache.
        var klic = Dotazovani.Klic(nahravka.Id, "audio/webm");
        Assert.Equal(Webm, uloziste.Soubory[klic]);
        Assert.Equal("no-store", uloziste.Cache[klic]);

        // A čte se zpátky tím, čím to vydává koncový bod.
        var ctene = await sprava.NahravkaAsync(serie.Id, PrvniSada.Slug, nahravka.Id, default);
        Assert.NotNull(ctene);
        Assert.Equal("audio/webm", ctene.Value.Typ);
        using var pamet = new MemoryStream();
        await ctene.Value.Obsah.CopyToAsync(pamet);
        Assert.Equal(Webm, pamet.ToArray());

        // Stav sady: jedna otázka odpovězená, a to jen hlasem.
        var sada = Assert.Single(await sprava.SeznamAsync(serie.Id, kdo.Id, default));
        Assert.Equal(1, sada.Odpovezeno);
        Assert.Equal(1, sada.PocetNahravek);
        Assert.Equal(StavSady.Rozpracovano, sada.Stav);
        Assert.NotNull(sada.ZmenenoV);
    }

    /// <summary>
    /// Nahrávek u jedné otázky může být víc — Miloš se k otázce vrací
    /// a dořekne, co ho dodatečně napadlo. A otázka s volbou i s hlasem se
    /// nesmí počítat dvakrát.
    /// </summary>
    [Fact]
    public async Task Vic_nahravek_u_jedne_otazky_a_zadne_dvojite_pocitani()
    {
        var (db, sprava, _) = Sluzby();
        var (serie, kdo) = await RocnikAsync(db);
        await sprava.ZalozAsync(serie.Id, PrvniSada.Obsah(), default);

        await sprava.NahrajAsync(
            serie.Id, serie.Slug, PrvniSada.Slug, "B2", Webm, 30, kdo.Id, default);
        await sprava.NahrajAsync(
            serie.Id, serie.Slug, PrvniSada.Slug, "B2", Webm, 12, kdo.Id, default);
        Assert.Null(await sprava.OdpovezAsync(
            serie.Id, PrvniSada.Slug, "B2", new OdpovedVstup(["dve"], null), kdo.Id, default));

        var sada = Assert.Single(await sprava.SeznamAsync(serie.Id, kdo.Id, default));
        Assert.Equal(2, sada.PocetNahravek);
        // Jedna otázka, ne tři: volba i dvě nahrávky visí na témže B2.
        Assert.Equal(1, sada.Odpovezeno);

        var detail = await sprava.DetailAsync(
            serie.Id, serie.Slug, PrvniSada.Slug, kdo.Id, default);
        var b2 = Assert.Single(detail!.Otazky, o => o.Kod == "B2");
        Assert.Equal(2, b2.Nahravky.Count);
        Assert.Equal(["dve"], b2.Zaskrtnuto);
        Assert.Equal("Rozhodčí", b2.Nahravky[0].Kdo);
    }

    /// <summary>
    /// Zaškrtnutí a text jsou poslední stav, ne historie: druhá odpověď
    /// na tutéž otázku tu první přepíše.
    /// </summary>
    [Fact]
    public async Task Druha_odpoved_prepise_tu_prvni()
    {
        var (db, sprava, _) = Sluzby();
        var (serie, kdo) = await RocnikAsync(db);
        await sprava.ZalozAsync(serie.Id, PrvniSada.Obsah(), default);

        await sprava.OdpovezAsync(
            serie.Id, PrvniSada.Slug, "B2", new OdpovedVstup(["dve"], "nejsem si jistý"),
            kdo.Id, default);
        await sprava.OdpovezAsync(
            serie.Id, PrvniSada.Slug, "B2", new OdpovedVstup(["tri"], null), kdo.Id, default);

        var detail = await sprava.DetailAsync(
            serie.Id, serie.Slug, PrvniSada.Slug, kdo.Id, default);
        var b2 = Assert.Single(detail!.Otazky, o => o.Kod == "B2");
        Assert.Equal(["tri"], b2.Zaskrtnuto);
        Assert.Null(b2.Odpoved);
        Assert.Single(await db.OponenturaOdpovedi
            .Where(o => o.Otazka!.Kod == "B2" && o.Otazka.Sada!.SerieId == serie.Id)
            .ToListAsync());
    }

    /// <summary>
    /// Uzavření sady a to, že ji <b>nová odpověď zase otevře</b>: kdo se
    /// vrátil a něco dořekl, už „nemá to“ — a Filip by jinak nepoznal, že
    /// přišlo něco nového.
    /// </summary>
    [Fact]
    public async Task Dokonceni_a_navrat_k_sade()
    {
        var (db, sprava, _) = Sluzby();
        var (serie, kdo) = await RocnikAsync(db);
        await sprava.ZalozAsync(serie.Id, PrvniSada.Obsah(), default);

        await sprava.OdpovezAsync(
            serie.Id, PrvniSada.Slug, "B1", new OdpovedVstup(["pet"], null), kdo.Id, default);
        Assert.Null(await sprava.DokonciAsync(serie.Id, PrvniSada.Slug, true, kdo.Id, default));

        var hotova = Assert.Single(await sprava.SeznamAsync(serie.Id, kdo.Id, default));
        Assert.Equal(StavSady.Odpovezeno, hotova.Stav);
        Assert.NotNull(hotova.DokonceneV);

        // Nahrávka po uzavření sadu otevře zpátky.
        await sprava.NahrajAsync(
            serie.Id, serie.Slug, PrvniSada.Slug, "B3", Webm, null, kdo.Id, default);

        var znovu = Assert.Single(await sprava.SeznamAsync(serie.Id, kdo.Id, default));
        Assert.Equal(StavSady.Rozpracovano, znovu.Stav);
        Assert.Null(znovu.DokonceneV);
    }

    /// <summary>
    /// <b>„Mám to“ jednoho neuzavře sadu druhému.</b> Rozhodčích může být
    /// víc a vyplnění je proto vedené po lidech, zatímco počet odpovědí se
    /// počítá ze všech dohromady.
    /// </summary>
    [Fact]
    public async Task Dokonceni_plati_jen_tomu_kdo_ho_zaskrtl()
    {
        var (db, sprava, _) = Sluzby();
        var (serie, prvni) = await RocnikAsync(db);
        var (_, druhy) = await RocnikAsync(db);
        await sprava.ZalozAsync(serie.Id, PrvniSada.Obsah(), default);

        await sprava.OdpovezAsync(
            serie.Id, PrvniSada.Slug, "B1", new OdpovedVstup(["pet"], null), prvni.Id, default);
        await sprava.DokonciAsync(serie.Id, PrvniSada.Slug, true, prvni.Id, default);

        Assert.Equal(StavSady.Odpovezeno,
            Assert.Single(await sprava.SeznamAsync(serie.Id, prvni.Id, default)).Stav);
        // Druhý vidí tutéž odpověď, ale sada pro něj uzavřená není.
        var pohled = Assert.Single(await sprava.SeznamAsync(serie.Id, druhy.Id, default));
        Assert.Equal(StavSady.Rozpracovano, pohled.Stav);
        Assert.Equal(1, pohled.Odpovezeno);
    }

    /// <summary>
    /// <b>Doplnění sady nic nezahodí.</b> Je to tatáž idempotence jako
    /// u importu ročníku: sada podle slugu, otázka podle kódu. Otázka, která
    /// v druhém odeslání chybí, zůstává — mohou na ní být odpovědi.
    /// </summary>
    [Fact]
    public async Task Doplneni_sady_pridava_a_nemaze()
    {
        var (db, sprava, _) = Sluzby();
        var (serie, kdo) = await RocnikAsync(db);
        await sprava.ZalozAsync(serie.Id, PrvniSada.Obsah(), default);
        await sprava.OdpovezAsync(
            serie.Id, PrvniSada.Slug, "B9", new OdpovedVstup(["jedna"], null), kdo.Id, default);

        var doplnena = new SadaVstup(
            PrvniSada.Slug, "Devět otázek a jedna navíc", "Jiný úvod", 1,
            [
                // B1 s opraveným textem, K4 jako nová. B2..B9 v souboru nejsou.
                new OtazkaVstup("B1", "Opravená otázka?", null, "R31", null, false),
                new OtazkaVstup("K4", "Mez z pravidla 76.1(a)?", null, "K4", null, false),
            ]);

        var (_, pridano, zmeneno) = await sprava.ZalozAsync(serie.Id, doplnena, default);

        Assert.Equal(1, pridano);
        Assert.Equal(1, zmeneno);

        var detail = await sprava.DetailAsync(
            serie.Id, serie.Slug, PrvniSada.Slug, kdo.Id, default);
        Assert.NotNull(detail);
        Assert.Equal("Devět otázek a jedna navíc", detail.Nazev);
        Assert.Equal(10, detail.Otazky.Count);
        Assert.Equal("Opravená otázka?", Assert.Single(detail.Otazky, o => o.Kod == "B1").Text);
        // A odpověď na B9 to nesmazalo, přestože B9 v souboru nebyla.
        Assert.Equal(["jedna"], Assert.Single(detail.Otazky, o => o.Kod == "B9").Zaskrtnuto);
    }

    /// <summary>
    /// Smazání nahrávky — zmáčknutý mikrofon omylem. Klíč jde do fronty
    /// úklidu, takže zaškobrtnutí R2 soubor v bucketu nezapomene.
    /// </summary>
    [Fact]
    public async Task Smazana_nahravka_jde_do_fronty_uklidu()
    {
        var (db, sprava, _) = Sluzby();
        var (serie, kdo) = await RocnikAsync(db);
        await sprava.ZalozAsync(serie.Id, PrvniSada.Obsah(), default);

        var (nahravka, _) = await sprava.NahrajAsync(
            serie.Id, serie.Slug, PrvniSada.Slug, "B1", Webm, null, kdo.Id, default);
        var klic = Dotazovani.Klic(nahravka!.Id, "audio/webm");

        Assert.Null(await sprava.SmazNahravkuAsync(
            serie.Id, PrvniSada.Slug, nahravka.Id, default));

        Assert.False(await db.HlasoveOdpovedi.AnyAsync(h => h.Id == nahravka.Id));
        Assert.True(await db.SouboryKeSmazani.AnyAsync(s => s.Klic == klic));
        // Bez nahrávky je sada zase neodpovězená.
        Assert.Equal(StavSady.Neodpovezeno,
            Assert.Single(await sprava.SeznamAsync(serie.Id, kdo.Id, default)).Stav);
    }

    /// <summary>
    /// Sada z cizího ročníku se nenajde ani tím, že se uhodne slug. Rozsah
    /// je ročník, ne jen jméno sady.
    /// </summary>
    [Fact]
    public async Task Sada_z_cizi_serie_se_nenajde()
    {
        var (db, sprava, _) = Sluzby();
        var (serie, kdo) = await RocnikAsync(db);
        var (cizi, _) = await RocnikAsync(db);
        await sprava.ZalozAsync(serie.Id, PrvniSada.Obsah(), default);

        Assert.Null(await sprava.DetailAsync(cizi.Id, cizi.Slug, PrvniSada.Slug, kdo.Id, default));
        Assert.NotNull(await sprava.OdpovezAsync(
            cizi.Id, PrvniSada.Slug, "B1", new OdpovedVstup(["pet"], null), kdo.Id, default));
        Assert.Empty(await sprava.SeznamAsync(cizi.Id, kdo.Id, default));
    }

    /// <summary>
    /// Co není zvuk, se do úložiště vůbec nedostane — obsah rozhoduje,
    /// ne typ z prohlížeče.
    /// </summary>
    [Fact]
    public async Task Pdf_vydavane_za_zvuk_se_neulozi()
    {
        var (db, sprava, uloziste) = Sluzby();
        var (serie, kdo) = await RocnikAsync(db);
        await sprava.ZalozAsync(serie.Id, PrvniSada.Obsah(), default);

        var (nahravka, chyba) = await sprava.NahrajAsync(
            serie.Id, serie.Slug, PrvniSada.Slug, "B1", "%PDF-1.7 ..."u8.ToArray(),
            null, kdo.Id, default);

        Assert.Null(nahravka);
        Assert.Equal(Dotazovani.NeniZvuk, chyba);
        Assert.Empty(uloziste.Soubory);
    }
}
