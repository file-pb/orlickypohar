using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Loď ročníku a její vztah k zastávce. <c>Stav</c> prázdný znamená, že na
/// zastávku přihlášená není.
/// </summary>
public record LodNaZastavceDto(
    int PrihlaskaId,
    string Lod,
    string? CisloPlachty,
    string? TypLodi,
    string Majitel,
    string Kategorie,
    StavUcasti? Stav,
    bool MaVysledky,
    IReadOnlyList<StavUcasti> MozneStavy,
    // Důvod poslední změny, třeba co má kapitán doplnit. Aditivně.
    string? Duvod = null);

/// <summary>
/// Přihlášky jedné zastávky. Vypisují se všechny lodě ročníku: z nich se
/// přihlašuje, a zastávka bez jediné přihlášky by jinak neměla co nabídnout.
/// </summary>
public record PrihlaskyZastavkyDto(
    string Serie,
    string SerieNazev,
    string Zavod,
    string ZavodNazev,
    StavZavodu StavZavodu,
    bool SmiSpravovat,
    string? ProcNelze,
    IReadOnlyList<string> Kategorie,
    IReadOnlyList<LodNaZastavceDto> Lode);

/// <summary>Přihlásit loď z ročníku (<c>PrihlaskaId</c>), nebo novou loď. Jedno z toho.</summary>
public record PrihlaseniVstup(int? PrihlaskaId = null, NovaLodVstup? NovaLod = null);

public record StavUcastiVstup(StavUcasti Stav, string? Duvod = null);

/// <summary>
/// Čtení a zápis přihlášek lodí na zastávku.
/// <para>
/// <b>Přihlášení na zastávku dělá z lodi účastníka ročníku.</b> Filip,
/// 10. 9. 2026: loď smí přijet i mimo ročník. Dostane celoroční přihlášku
/// s kategorií, jako by jela od začátku — model tím zůstává, jak je,
/// protože kategorii nese přihláška, ne účast.
/// </para>
/// <para>
/// <b>Neúčast na dřívějších zastávkách se nedopočítává.</b> Kolik bodů za
/// ni patří, je otázka na rozhodčího (plán, oddíl <i>Co k tomu říkají
/// závodní pravidla</i>). Do odpovědi se nic nezapisuje.
/// </para>
/// </summary>
public class PrihlaskySprava(AppDbContext db, TimeProvider cas)
{
    private const string NeniPoradatel = "Lodě na zastávku přihlašuje její pořadatel.";

    public async Task<PrihlaskyZastavkyDto> PrehledAsync(
        int zavodId, bool poradatel, CancellationToken ct, bool rozhodci = false)
    {
        var zavod = await db.Zavody
            .Where(z => z.Id == zavodId)
            .Select(z => new
            {
                z.Slug, z.Nazev, z.Stav, z.Druh, z.SerieId,
                Serie = z.Serie!.Slug, SerieNazev = z.Serie.Nazev,
            })
            .FirstAsync(ct);

        var kategorie = await db.Kategorie
            .Where(k => k.SerieId == zavod.SerieId)
            .OrderBy(k => k.Poradi)
            .Select(k => k.Nazev)
            .ToListAsync(ct);

        var zamek = Kalendar.ProcNejdePoharove(zavod.Druh) ?? Prihlasky.ProcNejdeNaZavod(zavod.Stav);
        var procNelze = zamek ?? (poradatel ? null : NeniPoradatel);

        return new PrihlaskyZastavkyDto(
            zavod.Serie, zavod.SerieNazev, zavod.Slug, zavod.Nazev, zavod.Stav,
            procNelze is null, procNelze, kategorie,
            await LodeAsync(zavod.SerieId, zavodId, Kdo(poradatel, rozhodci, zamek is not null),
                jenPrihlaska: null, ct));
    }

    /// <summary>
    /// Přihlásí loď na zastávku. <c>Nova</c> říká, jestli přihláška vznikla
    /// (nebo se obnovila zrušená) — druhé přihlášení téže lodi není chyba,
    /// jen se nic nezmění.
    /// </summary>
    public async Task<(LodNaZastavceDto? Lod, bool Nova, string? Chyba)> PrihlasAsync(
        int zavodId, PrihlaseniVstup vstup, CancellationToken ct, Guid? kdo = null)
    {
        var zavod = await db.Zavody.FirstAsync(z => z.Id == zavodId, ct);

        if ((Kalendar.ProcNejdePoharove(zavod.Druh) ?? Prihlasky.ProcNejdeNaZavod(zavod.Stav)) is { } zamceno)
            return (null, false, zamceno);

        if ((vstup.PrihlaskaId is null) == (vstup.NovaLod is null))
            return (null, false, "Přihlas buď loď z ročníku, nebo novou loď — jedno z toho.");

        Prihlaska prihlaska;
        if (vstup.PrihlaskaId is { } id)
        {
            // Přihláška z cizího ročníku by přihlásila loď, která do něj nepatří.
            if (await db.Prihlasky.FirstOrDefaultAsync(p => p.Id == id && p.SerieId == zavod.SerieId, ct)
                is not { } nalezena)
                return (null, false, $"Přihláška {id} do ročníku nepatří.");

            prihlaska = nalezena;
        }
        else
        {
            var (nalezena, chyba) = await PrihlaskaNoveLodiAsync(zavod.SerieId, vstup.NovaLod!, ct);
            if (chyba is not null) return (null, false, chyba);
            prihlaska = nalezena!;
        }

        var ucast = prihlaska.Id == 0
            ? null
            : await db.Ucasti.FirstOrDefaultAsync(u => u.ZavodId == zavodId && u.PrihlaskaId == prihlaska.Id, ct);

        var nova = true;
        if (ucast is null)
        {
            ucast = new Ucast { ZavodId = zavodId, Prihlaska = prihlaska, Stav = StavUcasti.Prihlasena };
            db.Ucasti.Add(ucast);
            Zaznamenej(ucast, null, StavUcasti.Prihlasena, kdo, null);
        }
        else if (ucast.Stav is StavUcasti.Zrusena or StavUcasti.Pozadavek or StavUcasti.KDoplneni
                 or StavUcasti.Odmitnuta or StavUcasti.Nedostavila)
        {
            // Loď, která na zastávce nebyla zapsaná, začíná znovu — pořadatel
            // ji má potvrdit, ne rovnou vrátit mezi jisté. Požadavek z webu
            // se přihlášením od pořadatele zapíše.
            Zaznamenej(ucast, ucast.Stav, StavUcasti.Prihlasena, kdo, null);
            ucast.Stav = StavUcasti.Prihlasena;
        }
        else
            nova = false;

        await db.SaveChangesAsync(ct);

        var lod = (await LodeAsync(zavod.SerieId, zavodId, Prihlasky.Kdo.Poradatel, jenPrihlaska: prihlaska.Id, ct)).Single();
        return (lod, nova, null);
    }

    /// <summary>
    /// Přepne loď na zastávce. Vrací (<c>null</c>, <c>null</c>), když loď na
    /// zastávku přihlášená není.
    /// </summary>
    public async Task<(LodNaZastavceDto? Lod, string? Chyba)> PrepniAsync(
        int zavodId, int prihlaskaId, StavUcasti na, CancellationToken ct,
        string? duvod = null, Prihlasky.Kdo role = Prihlasky.Kdo.Poradatel, Guid? kdo = null)
    {
        var zavod = await db.Zavody.FirstAsync(z => z.Id == zavodId, ct);

        if ((Kalendar.ProcNejdePoharove(zavod.Druh) ?? Prihlasky.ProcNejdeNaZavod(zavod.Stav)) is { } zamceno)
            return (null, zamceno);

        var ucast = await db.Ucasti.FirstOrDefaultAsync(
            u => u.ZavodId == zavodId && u.PrihlaskaId == prihlaskaId, ct);
        if (ucast is null) return (null, null);

        var maVysledky = await db.Vysledky.AnyAsync(v => v.UcastId == ucast.Id, ct);
        if (Prihlasky.ProcNejdePrepnout(ucast.Stav, na, maVysledky, role) is { } chyba) return (null, chyba);
        if (ucast.Stav == na) return ((await LodeAsync(zavod.SerieId, zavodId, role, prihlaskaId, ct)).Single(), null);
        if (Prihlasky.ProcNejdeDuvod(na, duvod) is { } chybaDuvodu) return (null, chybaDuvodu);

        Zaznamenej(ucast, ucast.Stav, na, kdo, duvod);
        ucast.Stav = na;
        await db.SaveChangesAsync(ct);

        return ((await LodeAsync(zavod.SerieId, zavodId, role, jenPrihlaska: prihlaskaId, ct)).Single(), null);
    }

    public Task<bool> JeVyloucenaAsync(int zavodId, int prihlaskaId, CancellationToken ct) =>
        db.Ucasti.AnyAsync(u => u.ZavodId == zavodId && u.PrihlaskaId == prihlaskaId
                                && u.Stav == StavUcasti.Vyloucena, ct);

    /// <summary>
    /// Přihláška nové lodi do ročníku — založená, nebo nalezená.
    /// <para>
    /// <b>Loď se páruje podle názvu, osoba podle jména a příjmení</b>,
    /// stejně jako v importu. Dva Jani Novákové splynou; při velikosti
    /// startovního pole je to únosné a alternativa by znamenala vymýšlet
    /// lidem identifikátory, které nikde neexistují.
    /// </para>
    /// <para>
    /// Loď, která už v ročníku je, se znovu nezakládá. <b>V jiné kategorii
    /// ji přihlásit nejde</b> — loď jede celý rok v jedné a změna kategorie
    /// je rozhodnutí správce, ne vedlejší účinek přihlášky.
    /// </para>
    /// </summary>
    private async Task<(Prihlaska? Prihlaska, string? Chyba)> PrihlaskaNoveLodiAsync(
        int serieId, NovaLodVstup v, CancellationToken ct)
    {
        if (Prihlasky.ProcNejdeNovaLod(v) is { } chyba) return (null, chyba);

        var nazev = v.Nazev.Trim();
        var nazevKategorie = v.Kategorie.Trim();

        var kategorie = await db.Kategorie.FirstOrDefaultAsync(
            k => k.SerieId == serieId && k.Nazev == nazevKategorie, ct);
        if (kategorie is null) return (null, $"Kategorie {nazevKategorie} v ročníku není.");

        var lod = await db.Lode.FirstOrDefaultAsync(l => l.Nazev == nazev, ct);

        if (lod is not null)
        {
            var stavajici = await db.Prihlasky
                .Include(p => p.Kategorie)
                .FirstOrDefaultAsync(p => p.SerieId == serieId && p.LodId == lod.Id, ct);

            if (stavajici is not null)
                return stavajici.KategorieId == kategorie.Id
                    ? (stavajici, null)
                    : (null, $"Loď {lod.Nazev} už v ročníku je, a to v kategorii {stavajici.Kategorie!.Nazev}. "
                             + "Přihlas ji ze seznamu lodí ročníku.");
        }
        else
        {
            var jmeno = v.MajitelJmeno.Trim();
            var prijmeni = v.MajitelPrijmeni.Trim();

            var majitel = await db.Osoby.FirstOrDefaultAsync(o => o.Jmeno == jmeno && o.Prijmeni == prijmeni, ct)
                          ?? db.Osoby.Add(new Osoba { Jmeno = jmeno, Prijmeni = prijmeni }).Entity;

            lod = db.Lode.Add(new Lod
            {
                Nazev = nazev,
                CisloPlachty = Prazdne(v.CisloPlachty),
                Typ = Prazdne(v.Typ),
                Majitel = majitel,
            }).Entity;
        }

        var prihlaska = new Prihlaska { SerieId = serieId, Lod = lod, KategorieId = kategorie.Id };
        db.Prihlasky.Add(prihlaska);
        return (prihlaska, null);
    }

    /// <summary>
    /// Kdo na obrazovce co přepíná. <c>null</c> znamená nic: zastávka je
    /// zamčená, nebo přihlášený nemá roli.
    /// </summary>
    private static Prihlasky.Kdo? Kdo(bool poradatel, bool rozhodci, bool zamceno) =>
        zamceno ? null : poradatel ? Prihlasky.Kdo.Poradatel : rozhodci ? Prihlasky.Kdo.Rozhodci : null;

    private void Zaznamenej(Ucast ucast, StavUcasti? ze, StavUcasti na, Guid? kdo, string? duvod) =>
        ucast.Zmeny.Add(new ZmenaUcasti
        {
            Ze = ze,
            Na = na,
            Kdy = cas.GetUtcNow(),
            UzivatelId = kdo,
            Duvod = string.IsNullOrWhiteSpace(duvod) ? null : duvod.Trim(),
        });

    private async Task<List<LodNaZastavceDto>> LodeAsync(
        int serieId, int zavodId, Prihlasky.Kdo? kdo, int? jenPrihlaska, CancellationToken ct)
    {
        var prihlasky = await db.Prihlasky
            .Where(p => p.SerieId == serieId && (jenPrihlaska == null || p.Id == jenPrihlaska))
            .Select(p => new
            {
                p.Id, p.Lod!.Nazev, p.Lod.CisloPlachty, p.Lod.Typ,
                Majitel = p.Lod.Majitel!.Jmeno + " " + p.Lod.Majitel.Prijmeni,
                Kategorie = p.Kategorie!.Nazev, KategoriePoradi = p.Kategorie.Poradi,
            })
            .ToListAsync(ct);

        var ucasti = await db.Ucasti
            .Where(u => u.ZavodId == zavodId && (jenPrihlaska == null || u.PrihlaskaId == jenPrihlaska))
            .Select(u => new
            {
                u.PrihlaskaId, u.Stav, MaVysledky = db.Vysledky.Any(v => v.UcastId == u.Id),
                Duvod = u.Zmeny.OrderByDescending(z => z.Id).Select(z => z.Duvod).FirstOrDefault(),
            })
            .ToDictionaryAsync(u => u.PrihlaskaId, ct);

        // Po kategoriích, uvnitř podle jména — jako všude, kde se loď hledá očima.
        return prihlasky
            .OrderBy(p => p.KategoriePoradi)
            .ThenBy(p => p.Nazev, Jmena.Cesky)
            .Select(p =>
            {
                var u = ucasti.GetValueOrDefault(p.Id);

                IReadOnlyList<StavUcasti> mozne = u is null || kdo is null
                    ? []
                    : [.. Prihlasky.MozneZ(u.Stav, u.MaVysledky, kdo.Value)];

                return new LodNaZastavceDto(
                    p.Id, p.Nazev, p.CisloPlachty, p.Typ, p.Majitel, p.Kategorie,
                    u?.Stav, u?.MaVysledky ?? false, mozne, u?.Duvod);
            })
            .ToList();
    }

    private static string? Prazdne(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();
}
