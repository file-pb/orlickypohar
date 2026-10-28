using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Poradatele;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.PixelFormats;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Výměna a odebrání fotky proti reálnému PostgreSQL. Úložiště je
/// podvržené a pamatuje si, co v něm leží — jde o to, aby po výměně
/// nezůstal viset soubor ani záznam.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class FotkySpravaTests(PostgresFixture fixture)
{
    private sealed class PametoveUloziste : IUloziste
    {
        public Dictionary<string, byte[]> Soubory { get; } = [];
        public bool Pripraveno => true;
        public string? VerejnaAdresa => "https://foto.example";
        /// <summary>Čtení je tu kvůli hlasovým odpovědím oponentury.</summary>
        public Task<Stream?> CtiAsync(string klic, CancellationToken ct) =>
            Task.FromResult<Stream?>(
                Soubory.TryGetValue(klic, out var data) ? new MemoryStream(data) : null);


        public Task UlozAsync(
            string klic, byte[] data, string typ, CancellationToken ct, string? cache = null)
        {
            Soubory[klic] = data;
            return Task.CompletedTask;
        }

        public Task SmazAsync(string klic, CancellationToken ct)
        {
            Soubory.Remove(klic);
            return Task.CompletedTask;
        }
    }

    private static FotkaFormular Formular(string autor = "Jiří Tašl", bool souhlas = true)
    {
        using var obrazek = new Image<Rgba32>(1000, 600);
        var data = new MemoryStream();
        obrazek.Save(data, new JpegEncoder());
        data.Position = 0;

        return new FotkaFormular(new FormFile(data, 0, data.Length, "soubor", "fotka.jpg"), autor, null, souhlas);
    }

    private async Task<(int PoradatelId, Guid UzivatelId)> PripravAsync(string slug)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var uzivatel = await scope.ServiceProvider.GetRequiredService<Uzivatele>().NajdiNeboZalozAsync(
            "https://ucty.test", $"fotky-{slug}", "Jan Novák", $"{slug}@priklad.cz", TimeProvider.System, default);

        var poradatel = new Poradatel { Slug = slug, Nazev = slug };
        db.Poradatele.Add(poradatel);
        await db.SaveChangesAsync();

        return (poradatel.Id, uzivatel.Id);
    }

    private async Task<T> SeSpravouAsync<T>(PametoveUloziste uloziste, Func<AppDbContext, FotkySprava, Task<T>> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sprava = new FotkySprava(db, uloziste, TimeProvider.System, NullLogger<FotkySprava>.Instance);
        return await co(db, sprava);
    }

    [Fact]
    public async Task Vymena_smaze_starou_fotku_i_se_soubory()
    {
        var (poradatelId, uzivatelId) = await PripravAsync("fotky-vymena");
        var uloziste = new PametoveUloziste();

        var prvni = await SeSpravouAsync(uloziste, async (db, s) =>
        {
            var p = await db.Poradatele.Include(x => x.Fotka).FirstAsync(x => x.Id == poradatelId);
            var (obrazek, chyba) = await s.NastavAsync(p, Formular(), uzivatelId, default);
            Assert.Null(chyba);
            return p.FotkaId!.Value;
        });

        Assert.Equal(2, uloziste.Soubory.Count);

        var druha = await SeSpravouAsync(uloziste, async (db, s) =>
        {
            var p = await db.Poradatele.Include(x => x.Fotka).FirstAsync(x => x.Id == poradatelId);
            var (_, chyba) = await s.NastavAsync(p, Formular("Filip Burda"), uzivatelId, default);
            Assert.Null(chyba);
            return p.FotkaId!.Value;
        });

        Assert.NotEqual(prvni, druha);
        Assert.Equal(Nahravani.Klice(druha).Order(), uloziste.Soubory.Keys.Order());

        await SeSpravouAsync(uloziste, async (db, _) =>
        {
            Assert.False(await db.Fotky.AnyAsync(f => f.Id == prvni));
            var ulozena = await db.Poradatele.Include(x => x.Fotka).FirstAsync(x => x.Id == poradatelId);
            Assert.Equal("Filip Burda", ulozena.Fotka!.Autor);
            Assert.Equal(uzivatelId, ulozena.Fotka.NahralId);
            return 0;
        });
    }

    [Fact]
    public async Task Odebrani_smaze_zaznam_i_soubory()
    {
        var (poradatelId, uzivatelId) = await PripravAsync("fotky-odebrani");
        var uloziste = new PametoveUloziste();

        var id = await SeSpravouAsync(uloziste, async (db, s) =>
        {
            var p = await db.Poradatele.FirstAsync(x => x.Id == poradatelId);
            await s.NastavAsync(p, Formular(), uzivatelId, default);
            return p.FotkaId!.Value;
        });

        await SeSpravouAsync(uloziste, async (db, s) =>
        {
            var p = await db.Poradatele.Include(x => x.Fotka).FirstAsync(x => x.Id == poradatelId);
            Assert.Null(await s.OdeberAsync(p, default));
            return 0;
        });

        Assert.Empty(uloziste.Soubory);
        await SeSpravouAsync(uloziste, async (db, _) =>
        {
            Assert.False(await db.Fotky.AnyAsync(f => f.Id == id));
            Assert.Null((await db.Poradatele.FirstAsync(x => x.Id == poradatelId)).FotkaId);
            return 0;
        });
    }

    [Fact]
    public async Task Bez_souhlasu_se_do_uloziste_nic_nedostane()
    {
        var (poradatelId, uzivatelId) = await PripravAsync("fotky-souhlas");
        var uloziste = new PametoveUloziste();

        var chyba = await SeSpravouAsync(uloziste, async (db, s) =>
        {
            var p = await db.Poradatele.FirstAsync(x => x.Id == poradatelId);
            return (await s.NastavAsync(p, Formular(souhlas: false), uzivatelId, default)).Chyba;
        });

        Assert.NotNull(chyba);
        Assert.Empty(uloziste.Soubory);
    }

    /// <summary>Článek, do jehož těla se bude nahrávat.</summary>
    private async Task<int> ClanekAsync(string slug)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var clanek = new Features.Clanky.Clanek
        {
            Slug = slug,
            Titulek = "Pozvánka",
            Telo = "[]",
            Format = Features.Clanky.FormatClanku.Bloky,
            PublikovanoV = DateTimeOffset.UtcNow,
        };
        db.Clanky.Add(clanek);
        await db.SaveChangesAsync();
        return clanek.Id;
    }

    [Fact]
    public async Task Obrazek_do_tela_nic_nenahrazuje()
    {
        // Na rozdíl od hlavního obrázku jich v textu může být víc — a to je
        // celý rozdíl proti `NastavAsync`, kterou by bylo snadné použít
        // omylem a druhou fotkou přepsat první.
        var (_, uzivatelId) = await PripravAsync("telo-vic");
        var clanekId = await ClanekAsync("telo-vic");
        var uloziste = new PametoveUloziste();

        var adresy = await SeSpravouAsync(uloziste, async (_, s) =>
        {
            var (prvni, chyba1) = await s.NahrajDoTelaAsync(clanekId, Formular(), uzivatelId, default);
            var (druhy, chyba2) = await s.NahrajDoTelaAsync(clanekId, Formular("Filip Burda"), uzivatelId, default);
            Assert.Null(chyba1);
            Assert.Null(chyba2);
            return (prvni!.Velky, druhy!.Velky);
        });

        Assert.NotEqual(adresy.Item1, adresy.Item2);
        // Dvě fotky po dvou variantách. Kdyby druhá nahradila první, byly by
        // tu dva soubory a jeden by visel v úložišti bez záznamu.
        Assert.Equal(4, uloziste.Soubory.Count);

        var vTele = await SeSpravouAsync(uloziste, (_, s) => s.VTeleAsync(clanekId, default));
        Assert.Equal(2, vTele.Count);
    }

    [Fact]
    public async Task Obrazky_v_tele_patri_svemu_clanku()
    {
        // Seznam se ukazuje autorovi u konkrétního článku; kdyby vracel cizí
        // fotky, vkládal by je do textu, kam nepatří.
        var (_, uzivatelId) = await PripravAsync("telo-cizi");
        var muj = await ClanekAsync("telo-muj");
        var cizi = await ClanekAsync("telo-cizi-clanek");
        var uloziste = new PametoveUloziste();

        await SeSpravouAsync(uloziste, async (_, s) =>
        {
            await s.NahrajDoTelaAsync(muj, Formular(), uzivatelId, default);
            await s.NahrajDoTelaAsync(cizi, Formular(), uzivatelId, default);
            return true;
        });

        var vTele = await SeSpravouAsync(uloziste, (_, s) => s.VTeleAsync(muj, default));
        Assert.Single(vTele);
    }

    [Fact]
    public async Task Fotka_v_tele_neni_hlavnim_obrazkem_clanku()
    {
        // Vazba vede opačně než u hlavního obrázku: fotka ukazuje na článek,
        // ne článek na fotku. Kdyby se přitom nastavil i `FotkaId`, přepsal
        // by první vložený obrázek tu fotku nad článkem.
        var (_, uzivatelId) = await PripravAsync("telo-hlavni");
        var clanekId = await ClanekAsync("telo-hlavni-clanek");
        var uloziste = new PametoveUloziste();

        await SeSpravouAsync(uloziste, (_, s) =>
            s.NahrajDoTelaAsync(clanekId, Formular(), uzivatelId, default));

        await using var scope = fixture.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var clanek = await db.Clanky.FirstAsync(c => c.Id == clanekId);

        Assert.Null(clanek.FotkaId);
    }
}
