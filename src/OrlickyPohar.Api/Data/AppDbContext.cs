using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Features.Measurements;

namespace OrlickyPohar.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Measurement> Measurements => Set<Measurement>();
    public DbSet<MetricDefinition> Metrics => Set<MetricDefinition>();
    public DbSet<QuarantinedMeasurement> Quarantine => Set<QuarantinedMeasurement>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        var d = b.Entity<MetricDefinition>();
        d.HasKey(x => x.Id);
        d.Property(x => x.Path).HasMaxLength(160).IsRequired();
        d.Property(x => x.Unit).HasMaxLength(24).IsRequired();
        d.Property(x => x.Description).HasMaxLength(400);
        d.HasIndex(x => x.Path).IsUnique();

        var m = b.Entity<Measurement>();
        m.HasKey(x => x.Id);
        m.Property(x => x.SourceId).HasMaxLength(64).IsRequired();
        m.Property(x => x.EventId).HasMaxLength(64);
        m.HasOne(x => x.Metric).WithMany().HasForeignKey(x => x.MetricId).OnDelete(DeleteBehavior.Restrict);

        // Čtení je skoro vždy "jeden zdroj, jedna metrika, časový rozsah".
        m.HasIndex(x => new { x.SourceId, x.MetricId, x.ValidAt });

        // Revize předpovědi: dvě vydání na stejný čas platnosti musí koexistovat.
        m.HasIndex(x => new { x.SourceId, x.MetricId, x.ValidAt, x.IssuedAt });

        // Idempotence: opakovaný přenos téže dávky nesmí vyrobit duplicity.
        m.HasIndex(x => new { x.SourceId, x.EventId })
            .IsUnique()
            .HasFilter("\"EventId\" IS NOT NULL");

        var q = b.Entity<QuarantinedMeasurement>();
        q.HasKey(x => x.Id);
        q.Property(x => x.SourceId).HasMaxLength(64).IsRequired();
        q.Property(x => x.MetricPath).HasMaxLength(160).IsRequired();
        q.Property(x => x.EventId).HasMaxLength(64);
        q.Property(x => x.Reason).HasMaxLength(200).IsRequired();
        q.HasIndex(x => new { x.MetricPath, x.ReceivedAt });
    }
}
