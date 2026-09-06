using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Model proti migracím, bez databáze a bez Dockeru. Chytá ten jeden omyl,
/// který se dělá nejsnáz a projeví se až při nasazení: změna entity, ke které
/// nikdo nevygeneroval migraci.
/// </summary>
public class ModelTests
{
    private static AppDbContext Context() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            // Spojení se nenavazuje — provider je potřeba jen k sestavení modelu.
            .UseNpgsql("Host=localhost;Database=neexistuje")
            .Options);

    [Fact]
    public void Model_odpovida_migracim()
    {
        using var db = Context();

        Assert.False(
            db.Database.HasPendingModelChanges(),
            "Model se rozešel s migracemi. Spusť 'dotnet ef migrations add <nazev>'.");
    }

    [Fact]
    public void Schema_jde_vygenerovat()
    {
        using var db = Context();

        var sql = db.Database.GenerateCreateScript();

        Assert.Contains("\"Zavody\"", sql);
        Assert.Contains("\"Vysledky\"", sql);
        Assert.DoesNotContain("Measurements", sql);
    }

    [Fact]
    public void Body_se_neukladaji_jako_sloupec()
    {
        using var db = Context();

        // Pravidlo plánu: ve Vysledku je jen to, co se stalo. Body se počítají,
        // aby šel seriál kdykoliv přepočítat podle změněných pravidel.
        var vysledek = db.Model.FindEntityType(typeof(OrlickyPohar.Api.Features.Zavody.Vysledek))!;

        Assert.Null(vysledek.FindProperty("Body"));
    }
}
