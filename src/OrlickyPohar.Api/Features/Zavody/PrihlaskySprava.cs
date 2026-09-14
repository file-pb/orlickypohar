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
    IReadOnlyList<StavUcasti> MozneStavy);

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

public record StavUcastiVstup(StavUcasti Stav);

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
public class PrihlaskySprava(AppDbContext db)
{
    private const string NeniPoradatel = "Lodě na zastávku přihlašuje její pořadatel.";

    public async Task<PrihlaskyZastavkyDto> PrehledAsync(int zavodId, bool poradatel, CancellationToken ct)
    {
        var zavod = await db.Zavody
            .Where(z => z.Id == zavodId)
            .Select(z => new { z.Slug, z.Nazev, z.Stav, z.SerieId, Serie = z.Serie!.Slug, SerieNazev = z.Serie.Nazev })
            .FirstAsync(ct);

        var kategorie = await db.Kategorie
            .Where(k => k.SerieId == zavod.SerieId)
            .OrderBy(k => k.Poradi)
            .Select(k => k.Nazev)
            .ToListAsync(ct);

        var procNelze = poradatel ? Prihlasky.ProcNejdeNaZavod(zavod.Stav) : NeniPoradatel;

        return new PrihlaskyZastavkyDto(
            zavod.Serie, zavod.SerieNazev, zavod.Slug, zavod.Nazev, zavod.Stav,
            procNelze is null, procNelze, kategorie,
            await LodeAsync(zavod.SerieId, zavodId, smi: procNelze is null, jenPrihlaska: null, ct));
    }

    /// <summary>
    /// Přihlásí loď na zastávku. <c>Nova</c> říká, jestli přihláška vznikla
    /// (nebo se obnovila zrušená) — druhé přihlášení téže lodi není chyba,
    /// jen se nic nezmění.
    /// </summary>
    public async Task<(LodNaZastavceDto? Lod, bool Nova, string? Chyba)> PrihlasAsync(
        int zavodId, PrihlaseniVstup vstup, CancellationToken ct)
    {
        var zavod = await db.Zavody.FirstAsync(z => z.Id == zavodId, ct);

        if (Prihlasky.ProcNejdeNaZavod(zavod.Stav) is { } zamceno) return (null, false, zamceno);

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
            db.Ucasti.Add(new Ucast { ZavodId = zavodId, Prihlaska = prihlaska, Stav = StavUcasti.Prihlasena });
        else if (ucast.Stav == StavUcasti.Zrusena)
            // Zrušená loď, která se znovu přihlásí, začíná znovu — pořadatel
            // ji má potvrdit, ne rovnou vrátit mezi jisté.
            ucast.Stav = StavUcasti.Prihlasena;
        else
            nova = false;

        await db.SaveChangesAsync(ct);

        var lod = (await LodeAsync(zavod.SerieId, zavodId, smi: true, jenPrihlaska: prihlaska.Id, ct)).Single();
        return (lod, nova, null);
    }

    /// <summary>
    /// Přepne loď na zastávce. Vrací (<c>null</c>, <c>null</c>), když loď na
    /// zastávku přihlášená není.
    /// </summary>
    public async Task<(LodNaZastavceDto? Lod, string? Chyba)> PrepniAsync(
        int zavodId, int prihlaskaId, StavUcasti na, CancellationToken ct)
    {
        var zavod = await db.Zavody.FirstAsync(z => z.Id == zavodId, ct);

        if (Prihlasky.ProcNejdeNaZavod(zavod.Stav) is { } zamceno) return (null, zamceno);

        var ucast = await db.Ucasti.FirstOrDefaultAsync(
            u => u.ZavodId == zavodId && u.PrihlaskaId == prihlaskaId, ct);
        if (ucast is null) return (null, null);

        var maVysledky = await db.Vysledky.AnyAsync(v => v.UcastId == ucast.Id, ct);
        if (Prihlasky.ProcNejdePrepnout(ucast.Stav, na, maVysledky) is { } chyba) return (null, chyba);

        ucast.Stav = na;
        await db.SaveChangesAsync(ct);

        return ((await LodeAsync(zavod.SerieId, zavodId, smi: true, jenPrihlaska: prihlaskaId, ct)).Single(), null);
    }

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

    private async Task<List<LodNaZastavceDto>> LodeAsync(
        int serieId, int zavodId, bool smi, int? jenPrihlaska, CancellationToken ct)
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
            .Select(u => new { u.PrihlaskaId, u.Stav, MaVysledky = db.Vysledky.Any(v => v.UcastId == u.Id) })
            .ToDictionaryAsync(u => u.PrihlaskaId, ct);

        // Po kategoriích, uvnitř podle jména — jako všude, kde se loď hledá očima.
        return prihlasky
            .OrderBy(p => p.KategoriePoradi)
            .ThenBy(p => p.Nazev, Jmena.Cesky)
            .Select(p =>
            {
                var u = ucasti.GetValueOrDefault(p.Id);

                IReadOnlyList<StavUcasti> mozne = u is null || !smi
                    ? []
                    : [.. Prihlasky.MozneZ(u.Stav, u.MaVysledky)];

                return new LodNaZastavceDto(
                    p.Id, p.Nazev, p.CisloPlachty, p.Typ, p.Majitel, p.Kategorie,
                    u?.Stav, u?.MaVysledky ?? false, mozne);
            })
            .ToList();
    }

    private static string? Prazdne(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();
}
