using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
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

        return new ImportVysledek(
            serie.Slug,
            osoby.Pocty, lode.Pocty, prihlasky.Pocty,
            zavody.Zavody, zavody.Rozjizdky, zavody.Vysledky);
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

        foreach (var z in v.Zavody)
        {
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
            serie = new Serie { Slug = v.Slug, Nazev = v.Nazev, Rok = v.Rok, Publikovano = v.Publikovano };
            db.Serie.Add(serie);
            await db.SaveChangesAsync(ct);
            return serie;
        }

        serie.Nazev = v.Nazev;
        serie.Rok = v.Rok;
        serie.Publikovano = v.Publikovano;
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
        return (mapa, new ImportPocty(nove, upravene));
    }

    private static async Task<(ImportPocty Zavody, ImportPocty Rozjizdky, ImportPocty Vysledky)> SlaďZavody(
        AppDbContext db, Serie serie, SerieVstup vstup,
        Dictionary<string, Prihlaska> prihlasky, Dictionary<string, Osoba> osoby, CancellationToken ct)
    {
        var existujici = await db.Zavody
            .Where(z => z.SerieId == serie.Id)
            .Include(z => z.Rozjizdky)
            .ToListAsync(ct);
        var podleSlugu = existujici.ToDictionary(z => z.Slug);

        int noveZ = 0, upraveneZ = 0, noveR = 0, upraveneR = 0, noveV = 0, upraveneV = 0;

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
            zavod.Poradatel = v.Poradatel;
            zavod.Datum = v.Datum;
            zavod.DatumKonce = v.DatumKonce;
            zavod.Typ = v.Typ;
            zavod.Poradi = v.Poradi;
            zavod.PocetSkrtu = v.PocetSkrtu;
            zavod.Vyhodnoceni = v.Vyhodnoceni;
            zavod.KoeficientDoSerie = v.KoeficientDoSerie;
            zavod.Publikovano = v.Publikovano;
            zavod.Stav = v.Stav;
            zavod.PuvodniDatum = v.PuvodniDatum;

            await db.SaveChangesAsync(ct);

            var ucasti = await SlaďUcasti(db, zavod, v, prihlasky, osoby, ct);
            var (nr, ur, nv, uv) = await SlaďRozjizdky(db, zavod, v, ucasti, ct);
            noveR += nr; upraveneR += ur; noveV += nv; upraveneV += uv;
        }

        return (new(noveZ, upraveneZ), new(noveR, upraveneR), new(noveV, upraveneV));
    }

    private static async Task<Dictionary<string, Ucast>> SlaďUcasti(
        AppDbContext db, Zavod zavod, ZavodVstup vstup,
        Dictionary<string, Prihlaska> prihlasky, Dictionary<string, Osoba> osoby, CancellationToken ct)
    {
        var existujici = await db.Ucasti.Where(u => u.ZavodId == zavod.Id).ToListAsync(ct);
        var podlePrihlasky = existujici.ToDictionary(u => u.PrihlaskaId);

        var mapa = new Dictionary<string, Ucast>();

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
            }

            u.Kormidelnik = kormidelnik;
            u.Posadka = v.Posadka;
            mapa[v.Lod] = u;
        }

        await db.SaveChangesAsync(ct);
        return mapa;
    }

    private static async Task<(int NoveR, int UpraveneR, int NoveV, int UpraveneV)> SlaďRozjizdky(
        AppDbContext db, Zavod zavod, ZavodVstup vstup, Dictionary<string, Ucast> ucasti, CancellationToken ct)
    {
        var existujici = await db.Rozjizdky.Where(r => r.ZavodId == zavod.Id).ToListAsync(ct);
        var podleCisla = existujici.ToDictionary(r => r.Cislo);

        int noveR = 0, upraveneR = 0, noveV = 0, upraveneV = 0;

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
            await db.SaveChangesAsync(ct);

            var (nv, uv) = await SlaďVysledky(db, r, v, vstup.Slug, ucasti, ct);
            noveV += nv; upraveneV += uv;
        }

        return (noveR, upraveneR, noveV, upraveneV);
    }

    private static async Task<(int Nove, int Upravene)> SlaďVysledky(
        AppDbContext db, Rozjizdka rozjizdka, RozjizdkaVstup vstup, string slugZavodu,
        Dictionary<string, Ucast> ucasti, CancellationToken ct)
    {
        var existujici = await db.Vysledky.Where(x => x.RozjizdkaId == rozjizdka.Id).ToListAsync(ct);
        var podleUcasti = existujici.ToDictionary(x => x.UcastId);

        int nove = 0, upravene = 0;

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
        }

        await db.SaveChangesAsync(ct);
        return (nove, upravene);
    }
}
