using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Vodocet;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Ukládání sběru vodočtu proti reálnému PostgreSQL: řada a aktuální
/// hodnoty se slijí do jednoho řádku podle času a staré se smažou.
/// </summary>
[Trait("Category", "Integracni")]
[Collection(PostgresCollection.Name)]
public class VodocetSberTests(PostgresFixture fixture)
{
    private static readonly DateTimeOffset Nyni = new(2030, 1, 10, 12, 10, 0, TimeSpan.Zero);

    private async Task VDbAsync(Func<AppDbContext, Task> co)
    {
        await using var scope = fixture.Services.CreateAsyncScope();
        await co(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    [Fact]
    public async Task Rada_a_aktualni_hodnoty_se_slijou_a_stare_zmizi()
    {
        var hodina = Nyni.AddMinutes(-10);
        var stara = Nyni.AddDays(-4);

        await VDbAsync(async db =>
        {
            db.MereniNadrze.Add(new MereniNadrze { Cas = stara, Hladina = 330m, Pritok = 1m });
            await db.SaveChangesAsync();
        });

        // První sběr: aktuální hodnoty přesně v celou hodinu, řada bez ní.
        await VDbAsync(db => SberVodocetu.UlozAsync(db, new StrankaPvl(
            new MereniPvl(hodina, 334.70m, 345.4m, 14.3m, 0m), []), Nyni, default));

        // Druhý sběr: v řadě se objeví táž hodina s hodinovým odtokem.
        await VDbAsync(db => SberVodocetu.UlozAsync(db, new StrankaPvl(
            new MereniPvl(Nyni, 334.69m, 345.3m, 14.5m, 0m),
            [new MereniPvl(hodina, 334.71m, null, null, 120m)]), Nyni, default));

        await VDbAsync(async db =>
        {
            var radky = await db.MereniNadrze
                .Where(m => m.Cas >= Nyni.AddDays(-5) && m.Cas <= Nyni)
                .OrderBy(m => m.Cas).ToListAsync();

            Assert.Equal([hodina, Nyni], radky.Select(r => r.Cas));

            // Hodinová hodnota Povodí má přednost, přítok a objem zůstaly.
            var h = radky[0];
            Assert.Equal((334.71m, 120m, 14.3m, 345.4m), (h.Hladina, h.Odtok!.Value, h.Pritok!.Value, h.Objem!.Value));
            Assert.Equal(14.5m, radky[1].Pritok);
        });
    }
}
