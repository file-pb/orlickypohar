using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Features.Boje;
using OrlickyPohar.Api.Features.Clanky;
using OrlickyPohar.Api.Features.Identita;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Fotky;
using OrlickyPohar.Api.Features.Poradatele;
using OrlickyPohar.Api.Features.Prevzate;
using OrlickyPohar.Api.Features.Smernice;
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

    /// <summary>
    /// Kdo kdy velel startu které regaty — řada záznamů, ne přepisovaný
    /// sloupec. Je to doklad (nález R19, 28. 10. 2026).
    /// </summary>
    public DbSet<Velitel> Velitele => Set<Velitel>();
    public DbSet<Rozjizdka> Rozjizdky => Set<Rozjizdka>();

    /// <summary>
    /// Co komise vyhlásila za jízdy — změna úseku a chybějící značka
    /// (ZPJ 33 a 34). Vede se stranou, trať zůstane přijatá
    /// (Filip, 28. 10. 2026).
    /// </summary>
    public DbSet<UkonZaJizdy> UkonyZaJizdy => Set<UkonZaJizdy>();
    public DbSet<Vysledek> Vysledky => Set<Vysledek>();
    public DbSet<ZapisNavrh> ZapisyNavrhu => Set<ZapisNavrh>();
    public DbSet<Clanek> Clanky => Set<Clanek>();
    public DbSet<Fotka> Fotky => Set<Fotka>();
    public DbSet<SouborKeSmazani> SouboryKeSmazani => Set<SouborKeSmazani>();
    public DbSet<PlachetniSmernice> Smernice => Set<PlachetniSmernice>();
    public DbSet<VazbaKLodi> VazbyKLodim => Set<VazbaKLodi>();
    public DbSet<ZmenaRoleKLodi> ZmenyRoli => Set<ZmenaRoleKLodi>();
    public DbSet<PripojovaciKod> PripojovaciKody => Set<PripojovaciKod>();
    public DbSet<NarokNaLod> Naroky => Set<NarokNaLod>();
    public DbSet<Features.Boje.Boje> Boje => Set<Features.Boje.Boje>();
    public DbSet<Features.Boje.Trat> Trate => Set<Features.Boje.Trat>();
    public DbSet<Features.Boje.PrvekTrati> PrvkyTrati => Set<Features.Boje.PrvekTrati>();
    public DbSet<MereniNadrze> MereniNadrze => Set<MereniNadrze>();
    public DbSet<PrevzatyClanek> PrevzateClanky => Set<PrevzatyClanek>();
    public DbSet<TeplotaHladiny> TeplotyHladiny => Set<TeplotaHladiny>();
    public DbSet<Uzivatel> Uzivatele => Set<Uzivatel>();
    public DbSet<UcetVazba> Vazby => Set<UcetVazba>();
    public DbSet<Opravneni> Opravneni => Set<Opravneni>();
    public DbSet<Features.Upozorneni.Odeslani> Odeslani => Set<Features.Upozorneni.Odeslani>();
    public DbSet<Features.Upozorneni.Zarizeni> Zarizeni => Set<Features.Upozorneni.Zarizeni>();
    public DbSet<Features.Trasy.Trasa> Trasy => Set<Features.Trasy.Trasa>();
    public DbSet<Features.Trasy.TrasaBod> TrasaBody => Set<Features.Trasy.TrasaBod>();
    public DbSet<Features.Klice.KlicLodi> Klice => Set<Features.Klice.KlicLodi>();

    /// <summary>Vývěska regaty: krátké zprávy, které pořadatel vydává během dne.</summary>
    public DbSet<Features.Zpravy.ZpravaRegaty> Zpravy => Set<Features.Zpravy.ZpravaRegaty>();
    public DbSet<Features.Okna.OknoRegaty> Okna => Set<Features.Okna.OknoRegaty>();
    public DbSet<Features.Tracker.NastaveniTrackeru> NastaveniTrackeru =>
        Set<Features.Tracker.NastaveniTrackeru>();
    public DbSet<Features.Tracker.ZmenaNastaveniTrackeru> ZmenyNastaveniTrackeru =>
        Set<Features.Tracker.ZmenaNastaveniTrackeru>();
    public DbSet<Features.Klice.PozvankaKlice> Pozvanky => Set<Features.Klice.PozvankaKlice>();

    /// <summary>Sady otázek pro oponenturu s rozhodčím a odpovědi na ně.</summary>
    public DbSet<Features.Oponentura.SadaOtazek> Sady => Set<Features.Oponentura.SadaOtazek>();
    public DbSet<Features.Oponentura.OtazkaSady> Otazky => Set<Features.Oponentura.OtazkaSady>();
    public DbSet<Features.Oponentura.OdpovedNaOtazku> OponenturaOdpovedi =>
        Set<Features.Oponentura.OdpovedNaOtazku>();
    public DbSet<Features.Oponentura.HlasovaOdpoved> HlasoveOdpovedi =>
        Set<Features.Oponentura.HlasovaOdpoved>();
    public DbSet<Features.Oponentura.VyplneniSady> Vyplneni =>
        Set<Features.Oponentura.VyplneniSady>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        var serie = b.Entity<Serie>();
        serie.Property(x => x.Nazev).HasMaxLength(120).IsRequired();
        serie.Property(x => x.Slug).HasMaxLength(80).IsRequired();
        serie.HasIndex(x => x.Slug).IsUnique();
        // Výchozí hodnota patří do databáze, ne jen do konstruktoru entity:
        // bez ní by migrace doplnila stávajícím ročníkům `false` a schovala
        // jim výsledky regat, aniž o to kdokoliv požádal.
        serie.Property(x => x.VysledkyZavoduVerejne).HasDefaultValue(true);
        // Totéž u verze bodovacích pravidel: nula by znamenala „neznámá
        // pravidla" a výpočet by na stávajících ročnících spadl. Jednička je
        // ta, podle které se vyhlašoval ročník 2026 i 2027.
        serie.Property(x => x.VerzePravidel).HasDefaultValue(1);

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
        prevzaty.Property(x => x.Obrazek).HasMaxLength(500);
        prevzaty.Property(x => x.OdZdroje).HasMaxLength(500);
        // Odkaz je přirozený klíč: druhé stažení téhož článku ho přepíše,
        // nezdvojí. Bez indexu by se duplicita poznala až podle dvou
        // stejných karet ve výpisu.
        prevzaty.HasIndex(x => x.Odkaz).IsUnique();

        var smernice = b.Entity<PlachetniSmernice>();
        smernice.Property(x => x.DuvodStazeni).HasMaxLength(Vyveseni.DuvodNejvic);
        // Kdo stáhl, je jen stopa — jeho smazání záznam o vyvěšení neruší.
        smernice.HasOne(x => x.Stahl).WithMany().HasForeignKey(x => x.StahlId)
            .OnDelete(DeleteBehavior.SetNull);

        var kLodi = b.Entity<VazbaKLodi>();
        // Jeden účet má u jedné lodi jednu roli. Bez indexu by druhé
        // párování — třeba e-mailem i kódem — vyrobilo dvě vazby a loď by
        // se v „mých lodích" ukázala dvakrát.
        kLodi.HasIndex(x => new { x.LodId, x.UzivatelId }).IsUnique();
        // Smazaná loď bere vazby s sebou; smazaný účet taky. Historie
        // vazby nemá cenu bez obojího.
        kLodi.HasOne(x => x.Lod).WithMany().HasForeignKey(x => x.LodId)
            .OnDelete(DeleteBehavior.Cascade);
        kLodi.HasOne(x => x.Uzivatel).WithMany().HasForeignKey(x => x.UzivatelId)
            .OnDelete(DeleteBehavior.Cascade);
        // Kdo potvrdil, je jen stopa — jeho smazání vazbu neruší.
        kLodi.HasOne(x => x.Potvrdil).WithMany().HasForeignKey(x => x.PotvrdilId)
            .OnDelete(DeleteBehavior.SetNull);
        // Kdo určil roli, je taky jen stopa. Značka „určil člověk" ale zmizet
        // nesmí, jinak by párování roli zase přepsalo — proto se při smazání
        // účtu správce maže jen jméno, ne `RoleUrcenaV`.
        kLodi.HasOne(x => x.RoleUrcil).WithMany().HasForeignKey(x => x.RoleUrcilId)
            .OnDelete(DeleteBehavior.SetNull);

        var zmenaRole = b.Entity<ZmenaRoleKLodi>();
        // Historie se čte po lodi (obrazovka správce) a po účtu s lodí
        // (párování se ptá, jestli vazba nebyla odebraná).
        zmenaRole.HasIndex(x => x.LodId);
        zmenaRole.HasIndex(x => new { x.UzivatelId, x.LodId });
        zmenaRole.HasOne(x => x.Lod).WithMany().HasForeignKey(x => x.LodId)
            .OnDelete(DeleteBehavior.Cascade);
        zmenaRole.HasOne(x => x.Uzivatel).WithMany().HasForeignKey(x => x.UzivatelId)
            .OnDelete(DeleteBehavior.Cascade);
        zmenaRole.HasOne(x => x.Zmenil).WithMany().HasForeignKey(x => x.ZmenilId)
            .OnDelete(DeleteBehavior.SetNull);

        var kod = b.Entity<PripojovaciKod>();
        kod.Property(x => x.Kod).HasMaxLength(Kody.Delka);
        // Kód se hledá právě podle kódu a musí být jedinečný: dva stejné
        // u dvou lodí by připojily člověka k cizí.
        kod.HasIndex(x => x.Kod).IsUnique();
        kod.HasOne(x => x.Lod).WithMany().HasForeignKey(x => x.LodId)
            .OnDelete(DeleteBehavior.Cascade);
        kod.HasOne(x => x.Vystavil).WithMany().HasForeignKey(x => x.VystavilId)
            .OnDelete(DeleteBehavior.Cascade);

        var narok = b.Entity<NarokNaLod>();
        narok.Property(x => x.Poznamka).HasMaxLength(NarokySprava.PoznamkaNejvic);
        // Čekající nárok se hledá u lodi, moje nároky u uživatele.
        narok.HasIndex(x => new { x.LodId, x.RozhodnutoV });
        narok.HasIndex(x => x.UzivatelId);
        narok.HasOne(x => x.Lod).WithMany().HasForeignKey(x => x.LodId)
            .OnDelete(DeleteBehavior.Cascade);
        narok.HasOne(x => x.Uzivatel).WithMany().HasForeignKey(x => x.UzivatelId)
            .OnDelete(DeleteBehavior.Cascade);
        // Kdo rozhodl, je jen stopa — jeho smazání nárok neruší.
        narok.HasOne(x => x.Rozhodl).WithMany().HasForeignKey(x => x.RozhodlId)
            .OnDelete(DeleteBehavior.SetNull);

        var boje = b.Entity<Features.Boje.Boje>();
        boje.Property(x => x.Nazev).HasMaxLength(Pipnuti.NazevNejvic);
        boje.Property(x => x.Popis).HasMaxLength(Pipnuti.PopisNejvic);
        // Platné bóje regaty se čtou při každém zobrazení trati.
        boje.HasIndex(x => new { x.ZavodId, x.NahrazenaV, x.SebranaV });
        boje.HasOne(x => x.Zavod).WithMany().HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.Cascade);
        boje.HasOne(x => x.Postavil).WithMany().HasForeignKey(x => x.PostavilId)
            .OnDelete(DeleteBehavior.Cascade);
        // Řetěz přenastavení: nová bóje ukazuje na tu, kterou nahradila.
        boje.HasOne(x => x.Nahrazuje).WithMany().HasForeignKey(x => x.NahrazujeId)
            .OnDelete(DeleteBehavior.SetNull);
        boje.Ignore(x => x.Platna);

        var trat = b.Entity<Features.Boje.Trat>();
        trat.Property(x => x.DuvodVraceni).HasMaxLength(Features.Boje.Stavba.DuvodNejvic);
        // Stav trati se čte při každém otevření správy bójí.
        trat.HasIndex(x => new { x.ZavodId, x.Stav });
        trat.HasOne(x => x.Zavod).WithMany().HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.Cascade);
        trat.HasOne(x => x.Rozjizdka).WithMany().HasForeignKey(x => x.RozjizdkaId)
            .OnDelete(DeleteBehavior.SetNull);
        // Řetěz přestaveb: nová trať ukazuje na tu, kterou nahradila.
        trat.HasOne(x => x.Nahrazuje).WithMany().HasForeignKey(x => x.NahrazujeId)
            .OnDelete(DeleteBehavior.SetNull);
        trat.HasOne(x => x.Prijal).WithMany().HasForeignKey(x => x.PrijalId)
            .OnDelete(DeleteBehavior.SetNull);
        // Zkrácení: prvek, u kterého je od vyhlášení cíl. Restrict, ne
        // kaskáda — smazat prvek, na který zkrácení ukazuje, by zahodilo
        // záznam o tom, kudy se jelo.
        trat.HasOne(x => x.ZkracenoUPrvku).WithMany().HasForeignKey(x => x.ZkracenoUPrvkuId)
            .OnDelete(DeleteBehavior.Restrict);
        trat.HasOne(x => x.Zkratil).WithMany().HasForeignKey(x => x.ZkratilId)
            .OnDelete(DeleteBehavior.SetNull);
        trat.Ignore(x => x.Zamcena);
        trat.Ignore(x => x.Zkracena);

        var prvek = b.Entity<Features.Boje.PrvekTrati>();
        prvek.Property(x => x.Poznamka).HasMaxLength(Features.Boje.Prvky.PoznamkaNejvic);
        // Prvky se čtou vždycky celé pro jednu trať, a v pořadí.
        prvek.HasIndex(x => new { x.TratId, x.Poradi });
        prvek.HasOne(x => x.Trat).WithMany().HasForeignKey(x => x.TratId)
            .OnDelete(DeleteBehavior.Cascade);
        // Bóje se nemaže ani při sebrání, takže kaskáda tu nemá co dělat —
        // a kdyby přece, prvek bez konce je horší než prvek žádný.
        prvek.HasOne(x => x.BojeA).WithMany().HasForeignKey(x => x.BojeAId)
            .OnDelete(DeleteBehavior.Restrict);
        prvek.HasOne(x => x.BojeB).WithMany().HasForeignKey(x => x.BojeBId)
            .OnDelete(DeleteBehavior.Restrict);
        prvek.Ignore(x => x.MaDruhyKonec);

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
        // Fotka v těle článku. Mazání článku ji odpojí, ne smaže — soubor
        // v úložišti musí uklidit kód, který k úložišti má přístup, ne
        // kaskáda v databázi.
        fotka.HasIndex(x => x.VTeleClankuId);
        // Fotky bóje. Totéž pravidlo jako u těla článku: mazání bóje je
        // odpojí, ne smaže — soubor v úložišti musí uklidit kód, který
        // k úložišti má přístup, ne kaskáda v databázi.
        fotka.HasOne(x => x.UBoje).WithMany(x => x.Fotky).HasForeignKey(x => x.UBojeId)
            .OnDelete(DeleteBehavior.SetNull);
        fotka.HasIndex(x => x.UBojeId);

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

        var ukon = b.Entity<UkonZaJizdy>();
        ukon.HasOne(x => x.Rozjizdka).WithMany().HasForeignKey(x => x.RozjizdkaId)
            .OnDelete(DeleteBehavior.Cascade);
        // Prvek se maže jen s tratí, a úkon na něj ukazuje jako na doklad
        // „čeho se to týkalo". Kdyby ho smazání prvku odneslo, zmizel by
        // zrovna ten záznam, kvůli kterému se o tom vede spor — proto
        // omezení, ne kaskáda.
        ukon.HasOne(x => x.Prvek).WithMany().HasForeignKey(x => x.PrvekId)
            .OnDelete(DeleteBehavior.Restrict);
        ukon.HasOne(x => x.Vyhlasil).WithMany().HasForeignKey(x => x.VyhlasilId)
            .OnDelete(DeleteBehavior.Restrict);
        ukon.Property(x => x.Poznamka).HasMaxLength(200);
        // Čte se vždycky „co platí pro tuhle rozjížďku, v pořadí vyhlášení".
        ukon.HasIndex(x => new { x.RozjizdkaId, x.VyhlasenoV });

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
        // --- Upozornění -----------------------------------------------------
        var zarizeni = b.Entity<Features.Upozorneni.Zarizeni>();
        zarizeni.Property(x => x.Token).HasMaxLength(200).IsRequired();
        // Token je identita zařízení: Expo ho vydá znovu po přeinstalaci,
        // takže registrace běží při každém spuštění appky. Bez unikátního
        // indexu by tentýž telefon dostal všechno tolikrát, kolikrát se
        // zaregistroval.
        zarizeni.HasIndex(x => x.Token).IsUnique();
        zarizeni.Property(x => x.Odbery).HasMaxLength(2000).IsRequired();

        var odeslani = b.Entity<Features.Upozorneni.Odeslani>();
        odeslani.Property(x => x.Odber).HasMaxLength(120).IsRequired();
        odeslani.Property(x => x.Titulek).HasMaxLength(120).IsRequired();
        odeslani.Property(x => x.Text).HasMaxLength(400).IsRequired();
        odeslani.Property(x => x.Cesta).HasMaxLength(300);
        odeslani.Property(x => x.Chyba).HasMaxLength(500);
        // Fronta se čte jedním dotazem „co čeká" — index přesně na něj.
        // Bez něj by se s rostoucí tabulkou odeslaných zpráv procházelo
        // všechno při každém probuzení úlohy.
        odeslani.HasIndex(x => new { x.OdeslanoV, x.Vzdano, x.ZkusitPo });

        var trasa = b.Entity<Features.Trasy.Trasa>();
        trasa.Property(x => x.LokalniId).HasMaxLength(64).IsRequired();
        trasa.Property(x => x.LodNazev).HasMaxLength(120).IsRequired();
        trasa.Property(x => x.RegataNazev).HasMaxLength(120);
        // Idempotence nahrávání nestojí na tom, že si ji server rozmyslí,
        // ale na databázi: tentýž identifikátor z téhož telefonu je tatáž
        // trasa. Bez unikátního indexu by souběžné nahrání založilo dvě.
        trasa.HasIndex(x => new { x.KlicId, x.LokalniId }).IsUnique();

        var bod = b.Entity<Features.Trasy.TrasaBod>();
        // Totéž o patro níž: bod se pozná podle pořadového čísla, které mu
        // dal telefon. Na tom stojí přejímací podmínka č. 3 — po výpadku se
        // dávka pošle znovu a nic se nezdvojí.
        bod.HasIndex(x => new { x.TrasaId, x.LokalniId }).IsUnique();
        // Body se čtou po trase a v pořadí, v jakém vznikly.
        bod.HasIndex(x => new { x.TrasaId, x.CasGps });
        bod.HasOne(x => x.Trasa).WithMany(x => x.Body)
            .HasForeignKey(x => x.TrasaId).OnDelete(DeleteBehavior.Cascade);

        var klic = b.Entity<Features.Klice.KlicLodi>();
        klic.Property(x => x.Otisk).HasMaxLength(64).IsRequired();
        klic.Property(x => x.Jmeno).HasMaxLength(120);
        // Klíč se hledá podle otisku při každé dávce, takže index není
        // pohodlí. Unikátní proto, že tentýž otisk znamená totéž tajemství.
        klic.HasIndex(x => x.Otisk).IsUnique();
        klic.HasIndex(x => x.LodId);

        var okno = b.Entity<Features.Okna.OknoRegaty>();
        okno.HasOne(x => x.Zavod).WithMany().HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.Cascade);
        // Okno se hledá dvěma dotazy: „co běží u téhle regaty" a „co běží
        // teď vůbec" (při zakládání trasy se neví, o kterou regatu jde).
        okno.HasIndex(x => new { x.ZavodId, x.OtevrenoV });
        okno.HasIndex(x => x.TvrdyKonec);

        var velitel = b.Entity<Features.Zavody.Velitel>();
        velitel.HasOne(x => x.Zavod).WithMany().HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.Cascade);
        // Hledá se jediná věc: „kdo velí téhle regatě teď" — tedy záznam
        // bez konce. Řada ostatních je doklad, do kterého se nekouká
        // jinak než celým výpisem.
        velitel.HasIndex(x => new { x.ZavodId, x.DoV });

        var nastaveni = b.Entity<Features.Tracker.NastaveniTrackeru>();
        nastaveni.HasOne(x => x.Zavod).WithMany().HasForeignKey(x => x.ZavodId)
            .OnDelete(DeleteBehavior.Cascade);
        // Jedna regata, jedno nastavení. Dvě by znamenala dvě pravdy o tom,
        // kdo koho smí vidět.
        nastaveni.HasIndex(x => x.ZavodId).IsUnique();
        // Výchozí hodnota patří do databáze, ne jen do konstruktoru: migrace
        // by jinak stávajícím regatám zapsala nulu, tedy „posádky nevidí nic".
        nastaveni.Property(x => x.CoVidiPosadky)
            .HasDefaultValue(Features.Tracker.CoVidiPosadky.JenSebe);

        var zmenaNastaveni = b.Entity<Features.Tracker.ZmenaNastaveniTrackeru>();
        zmenaNastaveni.Property(x => x.Duvod).HasMaxLength(500);
        zmenaNastaveni.HasOne(x => x.Nastaveni).WithMany(x => x.Zmeny)
            .HasForeignKey(x => x.NastaveniId).OnDelete(DeleteBehavior.Cascade);

        var pozvanka = b.Entity<Features.Klice.PozvankaKlice>();
        pozvanka.Property(x => x.Otisk).HasMaxLength(64).IsRequired();
        pozvanka.Property(x => x.Jmeno).HasMaxLength(120);
        pozvanka.HasIndex(x => x.Otisk).IsUnique();

        var sada = b.Entity<Features.Oponentura.SadaOtazek>();
        sada.Property(x => x.Slug).HasMaxLength(Features.Oponentura.Dotazovani.SlugNejvic)
            .IsRequired();
        sada.Property(x => x.Nazev).HasMaxLength(Features.Oponentura.Dotazovani.NazevNejvic)
            .IsRequired();
        sada.Property(x => x.Uvod).HasMaxLength(Features.Oponentura.Dotazovani.UvodNejvic)
            .IsRequired();
        sada.HasOne(x => x.Serie).WithMany().HasForeignKey(x => x.SerieId)
            .OnDelete(DeleteBehavior.Cascade);
        // Slug je adresa sady v ročníku, takže dvakrát týž nejde.
        sada.HasIndex(x => new { x.SerieId, x.Slug }).IsUnique();

        var otazka = b.Entity<Features.Oponentura.OtazkaSady>();
        otazka.Property(x => x.Kod).HasMaxLength(Features.Oponentura.Dotazovani.KodNejvic)
            .IsRequired();
        otazka.Property(x => x.Text).HasMaxLength(Features.Oponentura.Dotazovani.OtazkaNejvic)
            .IsRequired();
        otazka.Property(x => x.Vysvetleni)
            .HasMaxLength(Features.Oponentura.Dotazovani.VysvetleniNejvic);
        otazka.Property(x => x.Uvolni).HasMaxLength(200);
        otazka.HasOne(x => x.Sada).WithMany(x => x.Otazky).HasForeignKey(x => x.SadaId)
            .OnDelete(DeleteBehavior.Cascade);
        // Kód je přirozený klíč v sadě: doplnění sady podle něj pozná
        // stávající otázku od nové.
        otazka.HasIndex(x => new { x.SadaId, x.Kod }).IsUnique();
        // Volby leží v JSONu u řádku otázky, protože mimo ni nemají význam
        // a nikdo se na ně samostatně neptá.
        otazka.OwnsMany(x => x.Volby, v => v.ToJson());

        var odpoved = b.Entity<Features.Oponentura.OdpovedNaOtazku>();
        odpoved.ToTable("OponenturaOdpovedi");
        odpoved.Property(x => x.Text).HasMaxLength(Features.Oponentura.Dotazovani.TextNejvic);
        odpoved.HasOne(x => x.Otazka).WithMany().HasForeignKey(x => x.OtazkaId)
            .OnDelete(DeleteBehavior.Cascade);
        odpoved.HasOne(x => x.Kdo).WithMany().HasForeignKey(x => x.KdoId)
            .OnDelete(DeleteBehavior.Cascade);
        // Jeden člověk, jedna otázka, jedna odpověď — zaškrtnutí a text jsou
        // poslední stav, ne historie. Hlas je naopak aditivní.
        odpoved.HasIndex(x => new { x.OtazkaId, x.KdoId }).IsUnique();

        var hlas = b.Entity<Features.Oponentura.HlasovaOdpoved>();
        hlas.Property(x => x.Typ).HasMaxLength(60).IsRequired();
        hlas.HasOne(x => x.Otazka).WithMany().HasForeignKey(x => x.OtazkaId)
            .OnDelete(DeleteBehavior.Cascade);
        hlas.HasOne(x => x.Kdo).WithMany().HasForeignKey(x => x.KdoId)
            .OnDelete(DeleteBehavior.Cascade);
        hlas.HasIndex(x => x.OtazkaId);

        var vyplneni = b.Entity<Features.Oponentura.VyplneniSady>();
        vyplneni.ToTable("VyplneniSad");
        vyplneni.HasOne(x => x.Sada).WithMany().HasForeignKey(x => x.SadaId)
            .OnDelete(DeleteBehavior.Cascade);
        vyplneni.HasOne(x => x.Kdo).WithMany().HasForeignKey(x => x.KdoId)
            .OnDelete(DeleteBehavior.Cascade);
        // „Mám to“ jednoho nesmí uzavřít sadu druhému.
        vyplneni.HasIndex(x => new { x.SadaId, x.KdoId }).IsUnique();
    }
}
