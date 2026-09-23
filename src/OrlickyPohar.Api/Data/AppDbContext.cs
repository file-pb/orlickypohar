using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Features.Clanky;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Poradatele;
using OrlickyPohar.Api.Features.Prevzate;
using OrlickyPohar.Api.Features.Vodocet;
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
    public DbSet<Poradatel> Poradatele => Set<Poradatel>();
    public DbSet<Ucast> Ucasti => Set<Ucast>();
    public DbSet<Rozjizdka> Rozjizdky => Set<Rozjizdka>();
    public DbSet<Vysledek> Vysledky => Set<Vysledek>();
    public DbSet<ZapisNavrh> ZapisyNavrhu => Set<ZapisNavrh>();
    public DbSet<Clanek> Clanky => Set<Clanek>();
    public DbSet<Fotka> Fotky => Set<Fotka>();
    public DbSet<MereniNadrze> MereniNadrze => Set<MereniNadrze>();
    public DbSet<PrevzatyClanek> PrevzateClanky => Set<PrevzatyClanek>();
    public DbSet<TeplotaHladiny> TeplotyHladiny => Set<TeplotaHladiny>();
    public DbSet<Uzivatel> Uzivatele => Set<Uzivatel>();
    public DbSet<UcetVazba> Vazby => Set<UcetVazba>();
    public DbSet<Opravneni> Opravneni => Set<Opravneni>();

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
        // Smazaný pořadatel nesmí odnést zastávku s výsledky. Jméno na ní
        // zůstane jako text, jen bez medailonku.
        zavod.HasOne(x => x.PoradatelZaznam).WithMany().HasForeignKey(x => x.PoradatelId)
            .OnDelete(DeleteBehavior.SetNull);

        var poradatel = b.Entity<Poradatel>();
        poradatel.Property(x => x.Slug).HasMaxLength(Medailonek.SlugNejvic).IsRequired();
        poradatel.Property(x => x.Nazev).HasMaxLength(Medailonek.NazevNejvic).IsRequired();
        poradatel.Property(x => x.Web).HasMaxLength(Medailonek.WebNejvic);
        poradatel.Property(x => x.Popis).HasMaxLength(Medailonek.PopisNejvic);
        poradatel.Property(x => x.Email).HasMaxLength(Medailonek.EmailNejvic);
        poradatel.Property(x => x.Telefon).HasMaxLength(Medailonek.TelefonNejvic);
        poradatel.Property(x => x.KontaktniOsoba).HasMaxLength(Medailonek.OsobaNejvic);
        poradatel.Property(x => x.Adresa).HasMaxLength(Medailonek.AdresaNejvic);
        // Slug je přirozený klíč: podle něj kalendář i import najdou klub,
        // místo aby ho založily podruhé.
        poradatel.HasIndex(x => x.Slug).IsUnique();
        // Smazaná fotka nesmí vzít s sebou klub. Medailonek se vrátí
        // ke kurátorské fotce.
        poradatel.HasOne(x => x.Fotka).WithMany().HasForeignKey(x => x.FotkaId)
            .OnDelete(DeleteBehavior.SetNull);

        var prevzaty = b.Entity<PrevzatyClanek>();
        prevzaty.ToTable("PrevzateClanky");
        prevzaty.Property(x => x.Zdroj).HasMaxLength(120).IsRequired();
        prevzaty.Property(x => x.ZdrojOdkaz).HasMaxLength(500).IsRequired();
        prevzaty.Property(x => x.Odkaz).HasMaxLength(500).IsRequired();
        prevzaty.Property(x => x.Titulek).HasMaxLength(300).IsRequired();
        prevzaty.Property(x => x.Perex).HasMaxLength(Kanal.DelkaPerexu + 1);
        // Odkaz je přirozený klíč: druhé stažení téhož článku ho přepíše,
        // nezdvojí. Bez indexu by se duplicita poznala až podle dvou
        // stejných karet ve výpisu.
        prevzaty.HasIndex(x => x.Odkaz).IsUnique();

        var nadrz = b.Entity<MereniNadrze>();
        nadrz.ToTable("MereniNadrze");
        nadrz.HasKey(x => x.Cas);
        nadrz.Property(x => x.Hladina).HasPrecision(7, 2);
        nadrz.Property(x => x.Objem).HasPrecision(9, 3);
        nadrz.Property(x => x.Pritok).HasPrecision(9, 2);
        nadrz.Property(x => x.Odtok).HasPrecision(9, 2);

        var satelit = b.Entity<TeplotaHladiny>();
        satelit.ToTable("TeplotyHladiny");
        satelit.Property(x => x.Snimek).HasMaxLength(TeplotaHladiny.SnimekNejvic);
        satelit.Property(x => x.Misto).HasMaxLength(TeplotaHladiny.MistoNejvic);
        satelit.Property(x => x.Teplota).HasPrecision(4, 1);
        // Přirozený klíč: úloha posílá snímky opakovaně a nic se nesmí zdvojit.
        satelit.HasIndex(x => new { x.Snimek, x.Misto }).IsUnique();
        // Widget čte okno od nejnovějšího snímku.
        satelit.HasIndex(x => x.Cas);

        var fotka = b.Entity<Fotka>();
        fotka.Property(x => x.Id).ValueGeneratedNever();
        fotka.Property(x => x.Autor).HasMaxLength(Nahravani.AutorNejvic).IsRequired();
        fotka.Property(x => x.Popis).HasMaxLength(Nahravani.PopisNejvic);
        // Účty se nemažou. Kdyby se někdy mazat začaly, záznam o tom, kdo
        // potvrdil souhlas, nesmí zmizet potichu s nimi.
        fotka.HasOne(x => x.Nahral).WithMany().HasForeignKey(x => x.NahralId)
            .OnDelete(DeleteBehavior.Restrict);

        var ucast = b.Entity<Ucast>();
        ucast.Property(x => x.Posadka).HasMaxLength(400);
        ucast.HasOne(x => x.Zavod).WithMany().HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.Cascade);
        ucast.HasOne(x => x.Prihlaska).WithMany().HasForeignKey(x => x.PrihlaskaId)
            .OnDelete(DeleteBehavior.Restrict);
        ucast.HasOne(x => x.Kormidelnik).WithMany().HasForeignKey(x => x.KormidelnikId)
            .OnDelete(DeleteBehavior.Restrict);
        ucast.HasIndex(x => new { x.ZavodId, x.PrihlaskaId }).IsUnique();
        ucast.Property(x => x.KontaktEmail).HasMaxLength(Kontakty.EmailNejvic);
        ucast.Property(x => x.KontaktTelefon).HasMaxLength(Kontakty.TelefonNejvic);
        ucast.Property(x => x.Poznamka).HasMaxLength(1000);
        ucast.Property(x => x.PoznavaciZnak).HasMaxLength(Zapis.ZnakNejvic);
        ucast.Property(x => x.StartovnePoznamka).HasMaxLength(200);

        var navrh = b.Entity<ZapisNavrh>();
        navrh.ToTable("ZapisyNavrhu");
        // Snímky patří rozjížďce; se smazanou rozjížďkou nemají co dokládat.
        navrh.HasOne(x => x.Rozjizdka).WithMany().HasForeignKey(x => x.RozjizdkaId)
            .OnDelete(DeleteBehavior.Cascade);
        navrh.HasOne(x => x.Uzivatel).WithMany().HasForeignKey(x => x.UzivatelId)
            .OnDelete(DeleteBehavior.Cascade);
        // Jeden zapisovatel má u rozjížďky jeden snímek — ten poslední.
        navrh.HasIndex(x => new { x.RozjizdkaId, x.UzivatelId }).IsUnique();
        navrh.OwnsMany(x => x.Radky, r => r.ToJson());

        // Smazaná fotka papíru nesmí odnést rozjížďku i s výsledky.
        b.Entity<Rozjizdka>().HasOne(x => x.Fotka).WithMany().HasForeignKey(x => x.FotkaId)
            .OnDelete(DeleteBehavior.SetNull);

        var zmena = b.Entity<ZmenaUcasti>();
        zmena.ToTable("ZmenyUcasti");
        zmena.HasOne(x => x.Ucast).WithMany(x => x.Zmeny).HasForeignKey(x => x.UcastId)
            .OnDelete(DeleteBehavior.Cascade);
        zmena.Property(x => x.Duvod).HasMaxLength(Features.Zavody.Prihlasky.DuvodNejvic);
        // Účty se nemažou; kdyby začaly, historie nesmí zmizet s nimi.
        zmena.HasOne<Uzivatel>().WithMany().HasForeignKey(x => x.UzivatelId)
            .OnDelete(DeleteBehavior.Restrict);

        b.Entity<Osoba>().Property(x => x.CisloCsj).HasMaxLength(20);

        var kontakt = b.Entity<KontaktOsoby>();
        kontakt.ToTable("KontaktyOsob");
        kontakt.HasOne(x => x.Osoba).WithMany(x => x.Kontakty).HasForeignKey(x => x.OsobaId)
            .OnDelete(DeleteBehavior.Cascade);
        kontakt.Property(x => x.Email).HasMaxLength(Kontakty.EmailNejvic);
        kontakt.Property(x => x.Telefon).HasMaxLength(Kontakty.TelefonNejvic);
        // Smazaná přihláška kontakt nebere — ten patří osobě.
        kontakt.HasOne<Ucast>().WithMany().HasForeignKey(x => x.UcastId)
            .OnDelete(DeleteBehavior.SetNull);
        kontakt.HasIndex(x => new { x.OsobaId, x.ZadanoV });

        var rozjizdka = b.Entity<Rozjizdka>();
        rozjizdka.HasOne(x => x.Zavod).WithMany(x => x.Rozjizdky).HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.Cascade);
        rozjizdka.Property(x => x.DuvodRevize).HasMaxLength(400);
        rozjizdka.HasIndex(x => new { x.ZavodId, x.Cislo }).IsUnique();

        var vysledek = b.Entity<Vysledek>();
        vysledek.HasOne(x => x.Rozjizdka).WithMany().HasForeignKey(x => x.RozjizdkaId)
            .OnDelete(DeleteBehavior.Cascade);
        vysledek.HasOne(x => x.Ucast).WithMany().HasForeignKey(x => x.UcastId)
            .OnDelete(DeleteBehavior.Cascade);
        // Jedna loď má v jedné rozjížďce nejvýš jeden výsledek. Opakovaný import
        // téhož ročníku tak nemá kam vyrobit duplicitu.
        vysledek.HasIndex(x => new { x.RozjizdkaId, x.UcastId }).IsUnique();

        var clanek = b.Entity<Clanek>();
        clanek.Property(x => x.Slug).HasMaxLength(120).IsRequired();
        clanek.Property(x => x.Titulek).HasMaxLength(200).IsRequired();
        clanek.Property(x => x.Perex).HasMaxLength(600);
        clanek.Property(x => x.Autor).HasMaxLength(120);
        // Nula je `Text`, takže stávající články zůstanou tím, čím jsou.
        // Kdyby se výchozí hodnota v databázi neuvedla, migrace by je
        // sice taky nastavila na nulu, ale jen shodou okolností — tohle
        // to říká nahlas.
        clanek.Property(x => x.Format).HasDefaultValue(FormatClanku.Text);
        clanek.HasOne(x => x.Serie).WithMany().HasForeignKey(x => x.SerieId)
            .OnDelete(DeleteBehavior.Cascade);
        // Smazaná zastávka nesmí odnést svůj blog: text o závodě, který se
        // nekonal, je pořád část příběhu ročníku. Vazba se jen uvolní.
        clanek.HasOne(x => x.Zavod).WithMany().HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.SetNull);
        // Slug je přirozený klíč článku — opakovaný import téhož souboru
        // podle něj článek najde místo toho, aby ho založil podruhé.
        clanek.HasIndex(x => new { x.SerieId, x.Slug }).IsUnique();
        // Obecné články ročník nemají a Postgres bere NULL jako pokaždé jiné
        // — index výš by jim duplicitní adresu nezakázal. Proto vlastní.
        clanek.HasIndex(x => x.Slug).IsUnique()
            .HasFilter("\"SerieId\" IS NULL")
            .HasDatabaseName("IX_Clanky_Slug_Obecne");
        // Výpis novinek jde vždycky od nejnovějšího; bez indexu by se řadil
        // celý blog ročníku kvůli třem perexům na úvodní stránce.
        clanek.HasIndex(x => new { x.SerieId, x.PublikovanoV });
        clanek.HasOne(x => x.Fotka).WithMany().HasForeignKey(x => x.FotkaId)
            .OnDelete(DeleteBehavior.SetNull);

        var uzivatel = b.Entity<Uzivatel>();
        uzivatel.Property(x => x.Zobrazovane).HasMaxLength(200).IsRequired();
        uzivatel.Property(x => x.Email).HasMaxLength(320);

        var vazba = b.Entity<UcetVazba>();
        vazba.Property(x => x.Issuer).HasMaxLength(400).IsRequired();
        vazba.Property(x => x.Subject).HasMaxLength(200).IsRequired();
        vazba.HasOne(x => x.Uzivatel).WithMany().HasForeignKey(x => x.UzivatelId)
            .OnDelete(DeleteBehavior.Cascade);
        // Unikátní je až dvojice. Sám `Subject` unikátní není — dva
        // poskytovatelé můžou vydat týž řetězec dvěma různým lidem.
        vazba.HasIndex(x => new { x.Issuer, x.Subject }).IsUnique();

        var opravneni = b.Entity<Opravneni>();
        opravneni.HasOne(x => x.Uzivatel).WithMany().HasForeignKey(x => x.UzivatelId)
            .OnDelete(DeleteBehavior.Cascade);
        opravneni.HasOne(x => x.Serie).WithMany().HasForeignKey(x => x.SerieId)
            .OnDelete(DeleteBehavior.Cascade);
        // Právo na zastávku zaniká se zastávkou. Prázdné ZavodId znamená
        // celý ročník, takže SetNull by ze smazání zastávky udělal tiché
        // rozšíření: z pořadatele jedné zastávky pořadatele všech. Právo na
        // něco, co neexistuje, nemá co chránit — a kdo má dostat ročník,
        // musí ho dostat udělením, ne úklidem.
        opravneni.HasOne(x => x.Zavod).WithMany().HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.Cascade);
        // Totéž právo dvakrát je tichý nepořádek: odebrání jednoho řádku by
        // vypadalo jako odebrání práva, a přitom by dál platilo z druhého.
        opravneni.HasIndex(x => new { x.UzivatelId, x.Role, x.SerieId, x.ZavodId }).IsUnique();
    }
}
