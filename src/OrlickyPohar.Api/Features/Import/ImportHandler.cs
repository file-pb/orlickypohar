using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Clanky;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Import;

/// <summary>
/// Upsert celého ročníku.
/// <para>
/// Idempotence stojí na <b>přirozených klíčech</b>, ne na umělém importním
/// identifikátoru: série podle slugu, závod podle slugu v sérii, rozjížďka
/// podle čísla v závodě, výsledek podle dvojice rozjížďka × účast. Sloupec
/// „externí id“ by do schématu propsal tvar zdrojového souboru, a ten se
/// s každým ročníkem mění.
/// </para>
/// <para>
/// <b>Soubor je pravda o tom, co pojmenuje.</b> Když z opraveného ročníku
/// zmizí výsledek, účast nebo celá rozjížďka, import je smaže — jinak by
/// oprava jen přidávala a v databázi by zůstala loď, která nikdy nestartovala.
/// Maže se ale <b>jen uvnitř závodů, které soubor obsahuje</b>: závody,
/// přihlášky, lodě ani osoby se nemažou, protože částečný soubor by tím
/// vymazal ročník.
/// </para>
/// <para>
/// <b>Známé omezení:</b> osoby se párují podle jména a příjmení, lodě podle
/// názvu. Dva Jani Novákové v jednom ročníku splynou. Při velikosti startovního
/// pole je to únosné a náprava je ruční oprava jednoho řádku; alternativou by
/// bylo vymyslet lidem identifikátory, které nikde neexistují.
/// </para>
/// </summary>
internal static class ImportHandler
{
    public static async Task<ImportVysledek> ZpracujAsync(
        AppDbContext db, SerieVstup vstup, CancellationToken ct)
    {
        OveřVstup(vstup);

        var serie = await NajdiNeboZalozSerii(db, vstup, ct);
        var kategorie = await SlaďKategorie(db, serie, vstup.Kategorie, ct);

        var osoby = await SlaďOsoby(db, vstup.Osoby, ct);
        var lode = await SlaďLode(db, vstup, osoby.Mapa, ct);
        var prihlasky = await SlaďPrihlasky(db, serie, vstup, kategorie.Mapa, lode.Mapa, ct);

        var zavody = await SlaďZavody(db, serie, vstup, prihlasky.Mapa, osoby.Mapa, ct);
        var clanky = await SlaďClanky(db, serie, vstup, ct);

        return new ImportVysledek(
            serie.Slug,
            osoby.Pocty, lode.Pocty, prihlasky.Pocty,
            zavody.Zavody, zavody.Ucasti, zavody.Rozjizdky, zavody.Vysledky, clanky);
    }

    private static void OveřVstup(SerieVstup v)
    {
        if (v.Kategorie.Count == 0)
            throw new ImportException("Ročník musí mít aspoň jednu kategorii.");

        Duplicity(v.Osoby.Select(o => o.Klic), "Klíč osoby");
        Duplicity(v.Lode.Select(l => l.Klic), "Klíč lodi");
        Duplicity(v.Kategorie.Select(k => k.Nazev), "Název kategorie");
        Duplicity(v.Zavody.Select(z => z.Slug), "Slug závodu");
        Duplicity(v.Prihlasky.Select(p => p.Lod), "Přihláška lodi");
        Duplicity((v.Clanky ?? []).Select(c => c.Slug), "Slug článku");

        var slugyZavodu = v.Zavody.Select(z => z.Slug).ToHashSet();
        foreach (var c in v.Clanky ?? [])
            if (c.Zavod is not null && !slugyZavodu.Contains(c.Zavod))
                throw new ImportException($"Článek {c.Slug} odkazuje na neznámou regatu {c.Zavod}.");

        foreach (var z in v.Zavody)
        {
            // Akce s rozjížďkami by se nahrála, a výsledky by pak nikde
            // nebyly vidět — průběžné pořadí se na akce neptá.
            if (z.Druh == DruhZastavky.Akce && (z.Rozjizdky.Count > 0 || z.Ucasti.Count > 0))
                throw new ImportException($"Komunitní akce {z.Slug} nemá rozjížďky ani účasti lodí.");

            Duplicity(z.Rozjizdky.Select(r => r.Cislo.ToString()), $"Číslo rozjížďky v závodě {z.Slug}");
            Duplicity(z.Ucasti.Select(u => u.Lod), $"Účast lodi v závodě {z.Slug}");

            foreach (var r in z.Rozjizdky)
                Duplicity(r.Vysledky.Select(x => x.Lod), $"Výsledek lodi v rozjížďce {z.Slug}/{r.Cislo}");
        }
    }

    private static void Duplicity(IEnumerable<string> hodnoty, string co)
    {
        var duplicitni = hodnoty.GroupBy(x => x).Where(g => g.Count() > 1).Select(g => g.Key).ToList();
        if (duplicitni.Count > 0)
            throw new ImportException($"{co} se opakuje: {string.Join(", ", duplicitni)}.");
    }

    private static async Task<Serie> NajdiNeboZalozSerii(AppDbContext db, SerieVstup v, CancellationToken ct)
    {
        var serie = await db.Serie.FirstOrDefaultAsync(x => x.Slug == v.Slug, ct);
        if (serie is null)
        {
            serie = new Serie { Slug = v.Slug, Nazev = v.Nazev };
            db.Serie.Add(serie);
        }

        // Vlastnosti se nastavují na jednom místě pro nově zakládaný i už
        // existující ročník. Dvě kopie se rozešly: zakládací cesta neznala
        // PocetSkrtu ani VysledkyZavoduVerejne, takže první import souboru
        // dal jiný ročník než druhý — a mlčení o výsledcích se nezapnulo.
        serie.Nazev = v.Nazev;
        serie.Rok = v.Rok;
        serie.Publikovano = v.Publikovano;
        serie.PocetSkrtu = v.PocetSkrtu;
        serie.VysledkyZavoduVerejne = v.VysledkyZavoduVerejne;
        await db.SaveChangesAsync(ct);
        return serie;
    }

    private static async Task<(Dictionary<string, Kategorie> Mapa, ImportPocty Pocty)> SlaďKategorie(
        AppDbContext db, Serie serie, IReadOnlyList<KategorieVstup> vstup, CancellationToken ct)
    {
        var existujici = await db.Kategorie.Where(k => k.SerieId == serie.Id).ToListAsync(ct);
        var mapa = existujici.ToDictionary(k => k.Nazev);
        int nove = 0, upravene = 0;

        foreach (var v in vstup)
        {
            if (mapa.TryGetValue(v.Nazev, out var k)) { k.Poradi = v.Poradi; upravene++; continue; }

            k = new Kategorie { SerieId = serie.Id, Nazev = v.Nazev, Poradi = v.Poradi };
            db.Kategorie.Add(k);
            mapa[v.Nazev] = k;
            nove++;
        }

        await db.SaveChangesAsync(ct);
        return (mapa, new ImportPocty(nove, upravene));
    }

    private static async Task<(Dictionary<string, Osoba> Mapa, ImportPocty Pocty)> SlaďOsoby(
        AppDbContext db, IReadOnlyList<OsobaVstup> vstup, CancellationToken ct)
    {
        var prijmeni = vstup.Select(o => o.Prijmeni).Distinct().ToList();
        var existujici = await db.Osoby.Where(o => prijmeni.Contains(o.Prijmeni)).ToListAsync(ct);
        var podleJmena = existujici.ToDictionary(o => (o.Jmeno, o.Prijmeni));

        var mapa = new Dictionary<string, Osoba>();
        int nove = 0, nalezene = 0;

        foreach (var v in vstup)
        {
            if (podleJmena.TryGetValue((v.Jmeno, v.Prijmeni), out var o)) { nalezene++; }
            else
            {
                o = new Osoba { Jmeno = v.Jmeno, Prijmeni = v.Prijmeni };
                db.Osoby.Add(o);
                podleJmena[(v.Jmeno, v.Prijmeni)] = o;
                nove++;
            }

            mapa[v.Klic] = o;
        }

        await db.SaveChangesAsync(ct);
        return (mapa, new ImportPocty(nove, nalezene));
    }

    private static async Task<(Dictionary<string, Lod> Mapa, ImportPocty Pocty)> SlaďLode(
        AppDbContext db, SerieVstup vstup, Dictionary<string, Osoba> osoby, CancellationToken ct)
    {
        var nazvy = vstup.Lode.Select(l => l.Nazev).Distinct().ToList();
        var existujici = await db.Lode.Where(l => nazvy.Contains(l.Nazev)).ToListAsync(ct);
        var podleNazvu = existujici.ToDictionary(l => l.Nazev);

        var mapa = new Dictionary<string, Lod>();
        int nove = 0, upravene = 0;

        foreach (var v in vstup.Lode)
        {
            if (!osoby.TryGetValue(v.Majitel, out var majitel))
                throw new ImportException($"Loď {v.Nazev} odkazuje na neznámého majitele {v.Majitel}.");

            if (podleNazvu.TryGetValue(v.Nazev, out var l))
            {
                l.CisloPlachty = v.CisloPlachty;
                l.Typ = v.Typ;
                l.Majitel = majitel;
                upravene++;
            }
            else
            {
                l = new Lod { Nazev = v.Nazev, CisloPlachty = v.CisloPlachty, Typ = v.Typ, Majitel = majitel };
                db.Lode.Add(l);
                podleNazvu[v.Nazev] = l;
                nove++;
            }

            mapa[v.Klic] = l;
        }

        await db.SaveChangesAsync(ct);
        return (mapa, new ImportPocty(nove, upravene));
    }

    private static async Task<(Dictionary<string, Prihlaska> Mapa, ImportPocty Pocty)> SlaďPrihlasky(
        AppDbContext db, Serie serie, SerieVstup vstup,
        Dictionary<string, Kategorie> kategorie, Dictionary<string, Lod> lode, CancellationToken ct)
    {
        var existujici = await db.Prihlasky.Where(p => p.SerieId == serie.Id).ToListAsync(ct);
        var podleLodi = existujici.ToDictionary(p => p.LodId);

        var mapa = new Dictionary<string, Prihlaska>();
        int nove = 0, upravene = 0;

        foreach (var v in vstup.Prihlasky)
        {
            if (!lode.TryGetValue(v.Lod, out var lod))
                throw new ImportException($"Přihláška odkazuje na neznámou loď {v.Lod}.");

            if (!kategorie.TryGetValue(v.Kategorie, out var kat))
                throw new ImportException($"Přihláška lodi {v.Lod} odkazuje na neznámou kategorii {v.Kategorie}.");

            if (lod.Id != 0 && podleLodi.TryGetValue(lod.Id, out var p))
            {
                p.Kategorie = kat;
                upravene++;
            }
            else
            {
                p = new Prihlaska { SerieId = serie.Id, Lod = lod, Kategorie = kat };
                db.Prihlasky.Add(p);
                nove++;
            }

            mapa[v.Lod] = p;
        }

        await db.SaveChangesAsync(ct);

        // Loď, kterou opravený soubor v ročníku nemá, do ročníku nepatří.
        // Bez tohohle zůstane v průběžném pořadí s neúčastí na každé regatě
        // napořád — přesně to se stalo lodi SANDY, kterou rozhodčí v sešitu
        // přejmenoval na SENDY: výsledky a účasti import smazal, přihlášku
        // do ročníku nechal, a ona dál sbírala DNC.
        //
        // Jen přihlášky bez jediné účasti. Loď, kterou pořadatel zapsal na
        // regatu v administraci, soubor rozhodčího nezná a smazat ji nesmí;
        // účast na zastávce má vlastní pravidla v SlaďUcasti.
        var zustavaji = mapa.Values.Select(p => p.Id).ToHashSet();
        var osirele = existujici.Where(p => !zustavaji.Contains(p.Id)).Select(p => p.Id).ToList();

        var smazane = 0;
        if (osirele.Count > 0)
        {
            var bezUcasti = await db.Prihlasky
                .Where(p => osirele.Contains(p.Id) && !db.Ucasti.Any(u => u.PrihlaskaId == p.Id))
                .ToListAsync(ct);

            db.Prihlasky.RemoveRange(bezUcasti);
            smazane = bezUcasti.Count;
            await db.SaveChangesAsync(ct);
        }

        return (mapa, new ImportPocty(nove, upravene, smazane));
    }

    private static async Task<(ImportPocty Zavody, ImportPocty Ucasti,
        ImportPocty Rozjizdky, ImportPocty Vysledky)> SlaďZavody(
        AppDbContext db, Serie serie, SerieVstup vstup,
        Dictionary<string, Prihlaska> prihlasky, Dictionary<string, Osoba> osoby, CancellationToken ct)
    {
        var existujici = await db.Zavody
            .Where(z => z.SerieId == serie.Id)
            .Include(z => z.Rozjizdky)
            .ToListAsync(ct);
        var podleSlugu = existujici.ToDictionary(z => z.Slug);

        int noveZ = 0, upraveneZ = 0, noveU = 0, upraveneU = 0, smazaneU = 0;
        int noveR = 0, upraveneR = 0, smazaneR = 0, noveV = 0, upraveneV = 0, smazaneV = 0;

        foreach (var v in vstup.Zavody)
        {
            if (!podleSlugu.TryGetValue(v.Slug, out var zavod))
            {
                zavod = new Zavod { SerieId = serie.Id, Slug = v.Slug, Nazev = v.Nazev };
                db.Zavody.Add(zavod);
                podleSlugu[v.Slug] = zavod;
                noveZ++;
            }
            else upraveneZ++;

            zavod.Nazev = v.Nazev;
            // Jméno z importu přiřadí záznam pořadatele jako v kalendáři.
            // Medailonek import nenese a nepřepisuje: píše se v administraci
            // a nahrání ročníku by ho jinak smazalo.
            await Poradatele.PoradateleSprava.PriradAsync(db, zavod, v.Poradatel, ct);
            zavod.Datum = v.Datum;
            zavod.DatumKonce = v.DatumKonce;
            zavod.Typ = v.Typ;
            zavod.Poradi = v.Poradi;
            zavod.PocetSkrtu = v.PocetSkrtu;
            zavod.Vyhodnoceni = v.Vyhodnoceni;
            zavod.KoeficientDoSerie = v.KoeficientDoSerie;
            zavod.PosunDoSerie = v.PosunDoSerie;
            zavod.Publikovano = v.Publikovano;
            zavod.Stav = v.Stav;
            zavod.PuvodniDatum = v.PuvodniDatum;
            zavod.Druh = v.Druh;

            await db.SaveChangesAsync(ct);

            var ucasti = await SlaďUcasti(db, zavod, v, prihlasky, osoby, ct);
            noveU += ucasti.Pocty.Nove; upraveneU += ucasti.Pocty.Aktualizovane;
            smazaneU += ucasti.Pocty.Smazane; smazaneV += ucasti.SmazaneVysledky;

            var (nr, ur, sr, nv, uv, sv) = await SlaďRozjizdky(db, zavod, v, ucasti.Mapa, ct);
            noveR += nr; upraveneR += ur; smazaneR += sr;
            noveV += nv; upraveneV += uv; smazaneV += sv;
        }

        return (new(noveZ, upraveneZ), new(noveU, upraveneU, smazaneU),
                new(noveR, upraveneR, smazaneR), new(noveV, upraveneV, smazaneV));
    }

    private static async Task<(Dictionary<string, Ucast> Mapa, ImportPocty Pocty, int SmazaneVysledky)> SlaďUcasti(
        AppDbContext db, Zavod zavod, ZavodVstup vstup,
        Dictionary<string, Prihlaska> prihlasky, Dictionary<string, Osoba> osoby, CancellationToken ct)
    {
        var existujici = await db.Ucasti.Where(u => u.ZavodId == zavod.Id).ToListAsync(ct);
        var podlePrihlasky = existujici.ToDictionary(u => u.PrihlaskaId);

        var mapa = new Dictionary<string, Ucast>();
        int nove = 0, upravene = 0;

        foreach (var v in vstup.Ucasti)
        {
            if (!prihlasky.TryGetValue(v.Lod, out var prihlaska))
                throw new ImportException($"Závod {vstup.Slug}: loď {v.Lod} není přihlášená do ročníku.");

            Osoba? kormidelnik = null;
            if (v.Kormidelnik is not null && !osoby.TryGetValue(v.Kormidelnik, out kormidelnik))
                throw new ImportException($"Závod {vstup.Slug}: neznámý kormidelník {v.Kormidelnik}.");

            if (!podlePrihlasky.TryGetValue(prihlaska.Id, out var u))
            {
                u = new Ucast { ZavodId = zavod.Id, Prihlaska = prihlaska };
                db.Ucasti.Add(u);
                nove++;
            }
            else upravene++;

            u.Kormidelnik = kormidelnik;
            u.Posadka = v.Posadka;
            // Soubor je sešit rozhodčího: loď v něm přijela, ať ji pořadatel
            // předtím přihlásil, nebo ne.
            u.Stav = StavUcasti.Potvrzena;
            mapa[v.Lod] = u;
        }

        // Loď, kterou opravený soubor u závodu nemá, tam nestartovala —
        // a odejít musí i s výsledky, jinak by zůstala v pořadí i po opravě.
        // Výsledky se mažou výslovně, ne kaskádou: kaskáda by je odnesla
        // taky, ale v hlášení by chyběly a import by tvrdil, že nic nesmazal.
        //
        // Jen potvrzené účasti. Přihlášenou a zrušenou zapsal pořadatel
        // v administraci a sešit rozhodčího o nich neví — soubor je úplná
        // pravda o tom, kdo jel, ne o tom, kdo se přihlásil. Bez téhle
        // podmínky by nové nahrání ročníku smazalo přihlášky na zastávky,
        // které se teprve pojedou.
        var zustavaji = mapa.Values.Select(u => u.PrihlaskaId).ToHashSet();
        var kSmazani = existujici
            .Where(u => !zustavaji.Contains(u.PrihlaskaId) && u.Stav == StavUcasti.Potvrzena)
            .ToList();

        var idsPryc = kSmazani.Select(u => u.Id).ToList();
        var vysledkyPryc = await db.Vysledky.Where(x => idsPryc.Contains(x.UcastId)).ToListAsync(ct);
        db.Vysledky.RemoveRange(vysledkyPryc);
        db.Ucasti.RemoveRange(kSmazani);

        await db.SaveChangesAsync(ct);
        return (mapa, new ImportPocty(nove, upravene, kSmazani.Count), vysledkyPryc.Count);
    }

    private static async Task<(int NoveR, int UpraveneR, int SmazaneR,
        int NoveV, int UpraveneV, int SmazaneV)> SlaďRozjizdky(
        AppDbContext db, Zavod zavod, ZavodVstup vstup, Dictionary<string, Ucast> ucasti, CancellationToken ct)
    {
        var existujici = await db.Rozjizdky.Where(r => r.ZavodId == zavod.Id).ToListAsync(ct);
        var podleCisla = existujici.ToDictionary(r => r.Cislo);

        int noveR = 0, upraveneR = 0, noveV = 0, upraveneV = 0, smazaneV = 0;

        foreach (var v in vstup.Rozjizdky)
        {
            if (!podleCisla.TryGetValue(v.Cislo, out var r))
            {
                r = new Rozjizdka { ZavodId = zavod.Id, Cislo = v.Cislo };
                db.Rozjizdky.Add(r);
                podleCisla[v.Cislo] = r;
                noveR++;
            }
            else upraveneR++;

            // Do UTC. PostgreSQL v `timestamp with time zone` jiný posun než
            // nula nepřijme a Npgsql to odmítne až při zápisu — tedy uprostřed
            // importu, ne při kontrole vstupu.
            r.StartV = v.StartV?.ToUniversalTime();
            r.Stav = v.Stav;
            r.DoSerie = v.DoSerie;
            r.StavVysledku = v.StavVysledku;
            r.Publikovano = v.Publikovano;
            await db.SaveChangesAsync(ct);

            var (nv, uv, sv) = await SlaďVysledky(db, r, v, vstup.Slug, ucasti, ct);
            noveV += nv; upraveneV += uv; smazaneV += sv;
        }

        // Zrušená rozjížďka ze souboru zmizí a musí zmizet i z databáze,
        // jinak by se pořadí počítalo z něčeho, co se nejelo.
        var cislaVSouboru = vstup.Rozjizdky.Select(r => r.Cislo).ToHashSet();
        var kSmazani = existujici.Where(r => !cislaVSouboru.Contains(r.Cislo)).ToList();

        var idsPryc = kSmazani.Select(r => r.Id).ToList();
        var vysledkyPryc = await db.Vysledky.Where(x => idsPryc.Contains(x.RozjizdkaId)).ToListAsync(ct);
        db.Vysledky.RemoveRange(vysledkyPryc);
        db.Rozjizdky.RemoveRange(kSmazani);
        await db.SaveChangesAsync(ct);

        return (noveR, upraveneR, kSmazani.Count, noveV, upraveneV, smazaneV + vysledkyPryc.Count);
    }

    private static async Task<(int Nove, int Upravene, int Smazane)> SlaďVysledky(
        AppDbContext db, Rozjizdka rozjizdka, RozjizdkaVstup vstup, string slugZavodu,
        Dictionary<string, Ucast> ucasti, CancellationToken ct)
    {
        var existujici = await db.Vysledky.Where(x => x.RozjizdkaId == rozjizdka.Id).ToListAsync(ct);
        var podleUcasti = existujici.ToDictionary(x => x.UcastId);

        int nove = 0, upravene = 0;
        var zustavaji = new HashSet<int>();

        foreach (var v in vstup.Vysledky)
        {
            if (!ucasti.TryGetValue(v.Lod, out var ucast))
                throw new ImportException(
                    $"Závod {slugZavodu}, rozjížďka {vstup.Cislo}: loď {v.Lod} nemá na závodě účast.");

            if (v.PoradiVCili is null && v.Kod is null)
                throw new ImportException(
                    $"Závod {slugZavodu}, rozjížďka {vstup.Cislo}: loď {v.Lod} nemá pořadí ani kód.");

            if (!podleUcasti.TryGetValue(ucast.Id, out var x))
            {
                x = new Vysledek { RozjizdkaId = rozjizdka.Id, Ucast = ucast };
                db.Vysledky.Add(x);
                nove++;
            }
            else upravene++;

            x.PoradiVCili = v.PoradiVCili;
            x.DojezdV = v.DojezdV?.ToUniversalTime();
            x.NamerenyCas = v.CasSekundy is null ? null : TimeSpan.FromSeconds(v.CasSekundy.Value);
            x.Kod = v.Kod;
            zustavaji.Add(ucast.Id);
        }

        // Výsledek, který v opraveném souboru není, se smaže. Bez toho by
        // oprava uměla jen přidávat a přepisovat — a řádek zapsaný omylem
        // by se nedal odstranit ničím jiným než ručním zásahem do databáze.
        var kSmazani = existujici.Where(x => !zustavaji.Contains(x.UcastId)).ToList();
        db.Vysledky.RemoveRange(kSmazani);

        await db.SaveChangesAsync(ct);
        return (nove, upravene, kSmazani.Count);
    }

    /// <summary>
    /// Články ročníku i zastávek. Přirozený klíč je slug v rámci série.
    /// <para>
    /// <b>Nemažou se</b>, na rozdíl od výsledků a účastí. Uvnitř závodu je
    /// soubor úplná pravda — co v něm u zastávky není, se nejelo — kdežto
    /// blog roste jinde a jindy: až bude psát pořadatel v administraci,
    /// import ročníku o jeho článcích vědět nebude a smazal by je.
    /// </para>
    /// </summary>
    private static async Task<ImportPocty> SlaďClanky(
        AppDbContext db, Serie serie, SerieVstup vstup, CancellationToken ct)
    {
        var vstupni = vstup.Clanky ?? [];
        if (vstupni.Count == 0) return new ImportPocty(0, 0);

        var zavody = await db.Zavody
            .Where(z => z.SerieId == serie.Id)
            .ToDictionaryAsync(z => z.Slug, z => z.Id, ct);

        var existujici = await db.Clanky.Where(c => c.SerieId == serie.Id).ToListAsync(ct);
        var podleSlugu = existujici.ToDictionary(c => c.Slug);

        int nove = 0, upravene = 0;

        foreach (var v in vstupni)
        {
            int? zavodId = null;
            if (v.Zavod is not null)
            {
                if (!zavody.TryGetValue(v.Zavod, out var id))
                    throw new ImportException($"Článek {v.Slug} odkazuje na neznámou regatu {v.Zavod}.");
                zavodId = id;
            }

            if (!podleSlugu.TryGetValue(v.Slug, out var c))
            {
                c = new Clanek { SerieId = serie.Id, Slug = v.Slug, Titulek = v.Titulek, Telo = v.Telo };
                db.Clanky.Add(c);
                podleSlugu[v.Slug] = c;
                nove++;
            }
            else upravene++;

            c.ZavodId = zavodId;
            c.Titulek = v.Titulek;
            c.Perex = v.Perex;
            c.Telo = v.Telo;
            c.Autor = v.Autor;
            // Do UTC, ze stejného důvodu jako start rozjížďky: Npgsql jiný
            // posun do `timestamp with time zone` nezapíše.
            c.PublikovanoV = v.PublikovanoV.ToUniversalTime();
            // Soubor umí říct jen „zveřejnit, nebo ne" a je to schválně:
            // koncept, skrytí a mazání jsou úkony v administraci, ne obsah
            // ročníku. Nezveřejněný článek ze souboru je tedy koncept.
            //
            // Znovunahrání souboru vrátí i článek, který někdo mezitím
            // smazal. Je to důsledek toho, že soubor je pravdou o tom, co
            // pojmenuje — stejně jako u výsledků.
            c.Stav = v.Publikovano ? StavClanku.Publikovano : StavClanku.Draft;
        }

        await db.SaveChangesAsync(ct);
        return new ImportPocty(nove, upravene);
    }
}
