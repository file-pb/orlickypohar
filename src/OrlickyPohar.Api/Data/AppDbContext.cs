using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Serie> Serie => Set<Serie>();
    public DbSet<Kategorie> Kategorie => Set<Kategorie>();
    public DbSet<Prihlaska> Prihlasky => Set<Prihlaska>();
    public DbSet<Osoba> Osoby => Set<Osoba>();
    public DbSet<Lod> Lode => Set<Lod>();
    public DbSet<Zavod> Zavody => Set<Zavod>();
    public DbSet<Ucast> Ucasti => Set<Ucast>();
    public DbSet<Rozjizdka> Rozjizdky => Set<Rozjizdka>();
    public DbSet<Vysledek> Vysledky => Set<Vysledek>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        var serie = b.Entity<Serie>();
        serie.Property(x => x.Nazev).HasMaxLength(120).IsRequired();
        serie.Property(x => x.Slug).HasMaxLength(80).IsRequired();
        serie.HasIndex(x => x.Slug).IsUnique();

        var kategorie = b.Entity<Kategorie>();
        kategorie.Property(x => x.Nazev).HasMaxLength(60).IsRequired();
        kategorie.HasOne(x => x.Serie).WithMany(x => x.Kategorie).HasForeignKey(x => x.SerieId)
            .OnDelete(DeleteBehavior.Cascade);
        kategorie.HasIndex(x => new { x.SerieId, x.Nazev }).IsUnique();

        var osoba = b.Entity<Osoba>();
        osoba.Property(x => x.Jmeno).HasMaxLength(80).IsRequired();
        osoba.Property(x => x.Prijmeni).HasMaxLength(80).IsRequired();
        // Jeden účet patří nejvýš jedné osobě. Bez toho by se dvě osoby tiše
        // slily do jednoho přihlášeného člověka.
        osoba.HasIndex(x => x.UserId).IsUnique().HasFilter("\"UserId\" IS NOT NULL");

        var lod = b.Entity<Lod>();
        lod.Property(x => x.Nazev).HasMaxLength(120).IsRequired();
        lod.Property(x => x.CisloPlachty).HasMaxLength(20);
        lod.Property(x => x.Typ).HasMaxLength(80);
        lod.HasOne(x => x.Majitel).WithMany().HasForeignKey(x => x.MajitelId)
            .OnDelete(DeleteBehavior.Restrict);

        var prihlaska = b.Entity<Prihlaska>();
        prihlaska.HasOne(x => x.Serie).WithMany().HasForeignKey(x => x.SerieId)
            .OnDelete(DeleteBehavior.Cascade);
        prihlaska.HasOne(x => x.Lod).WithMany().HasForeignKey(x => x.LodId)
            .OnDelete(DeleteBehavior.Restrict);
        prihlaska.HasOne(x => x.Kategorie).WithMany().HasForeignKey(x => x.KategorieId)
            .OnDelete(DeleteBehavior.Restrict);
        // Loď jede celý rok v jedné kategorii, takže do ročníku patří jednou.
        prihlaska.HasIndex(x => new { x.SerieId, x.LodId }).IsUnique();

        var zavod = b.Entity<Zavod>();
        zavod.Property(x => x.Nazev).HasMaxLength(120).IsRequired();
        zavod.Property(x => x.Slug).HasMaxLength(80).IsRequired();
        zavod.Property(x => x.Poradatel).HasMaxLength(120);
        zavod.Property(x => x.Typ).HasMaxLength(60);
        zavod.Property(x => x.KoeficientDoSerie).HasPrecision(5, 2);
        zavod.HasOne(x => x.Serie).WithMany().HasForeignKey(x => x.SerieId)
            .OnDelete(DeleteBehavior.Cascade);
        zavod.HasIndex(x => new { x.SerieId, x.Slug }).IsUnique();

        var ucast = b.Entity<Ucast>();
        ucast.Property(x => x.Posadka).HasMaxLength(400);
        ucast.HasOne(x => x.Zavod).WithMany().HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.Cascade);
        ucast.HasOne(x => x.Prihlaska).WithMany().HasForeignKey(x => x.PrihlaskaId)
            .OnDelete(DeleteBehavior.Restrict);
        ucast.HasOne(x => x.Kormidelnik).WithMany().HasForeignKey(x => x.KormidelnikId)
            .OnDelete(DeleteBehavior.Restrict);
        ucast.HasIndex(x => new { x.ZavodId, x.PrihlaskaId }).IsUnique();

        var rozjizdka = b.Entity<Rozjizdka>();
        rozjizdka.HasOne(x => x.Zavod).WithMany(x => x.Rozjizdky).HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.Cascade);
        rozjizdka.HasIndex(x => new { x.ZavodId, x.Cislo }).IsUnique();

        var vysledek = b.Entity<Vysledek>();
        vysledek.HasOne(x => x.Rozjizdka).WithMany().HasForeignKey(x => x.RozjizdkaId)
            .OnDelete(DeleteBehavior.Cascade);
        vysledek.HasOne(x => x.Ucast).WithMany().HasForeignKey(x => x.UcastId)
            .OnDelete(DeleteBehavior.Cascade);
        // Jedna loď má v jedné rozjížďce nejvýš jeden výsledek. Opakovaný import
        // téhož ročníku tak nemá kam vyrobit duplicitu.
        vysledek.HasIndex(x => new { x.RozjizdkaId, x.UcastId }).IsUnique();
    }
}
