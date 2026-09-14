using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Loď v zápisu rozjížďky: všechny přihlášky ročníku, i ty bez výsledku.
/// <para>
/// <b>Nabízí se celý ročník, ne jen lodě s účastí.</b> Účast dnes přináší
/// jen import, takže na nové zastávce by formulář byl prázdný. Loď, která
/// dostane výsledek, tím přijela — účast se jí založí při uložení.
/// </para>
/// </summary>
public record ZapisLodDto(
    int PrihlaskaId,
    string Lod,
    string? CisloPlachty,
    string Kategorie,
    int? PoradiVCili,
    KodVysledku? Kod,
    int? CasSekundy);

/// <summary>
/// Zápis jedné rozjížďky. <c>ProcNelze</c> říká, proč je jen ke čtení —
/// obrazovka tu větu ukáže místo tlačítka, které by skončilo chybou.
/// </summary>
public record ZapisRozjizdkyDto(
    string Serie,
    string SerieNazev,
    string Zavod,
    string ZavodNazev,
    StavZavodu StavZavodu,
    int Cislo,
    StavVysledku StavVysledku,
    string? DuvodRevize,
    bool SmiZapisovat,
    string? ProcNelze,
    IReadOnlyList<ZapisLodDto> Lode);

/// <summary>Celá sada výsledků rozjížďky. Loď, která v ní není, výsledek nemá.</summary>
public record ZapisVstup(IReadOnlyList<ZapisRadekVstup> Radky);

/// <summary>
/// Čtení a uložení výsledků rozjížďky a přidání další rozjížďky.
/// <para>
/// Pravidla leží v <see cref="Zapis"/>, kdo smí, v <c>Rozsahy</c>. Tady je
/// jen to, co potřebuje databázi: kdo je v ročníku přihlášený a co už je
/// zapsané.
/// </para>
/// <para>
/// <b>Rozjížďka předaná do zápisových metod musí pocházet z téhož
/// požadavku</b> — stejně jako u <see cref="VysledkySprava"/>.
/// </para>
/// </summary>
public class ZapisSprava(AppDbContext db)
{
    private const string NeniPoradatel =
        "Výsledky zapisuje pořadatel zastávky. Rozhodčí je ověřuje, ale nemění.";

    public async Task<ZapisRozjizdkyDto> NactiAsync(
        Rozjizdka rozjizdka, bool poradatel, CancellationToken ct)
    {
        var zavod = await db.Zavody
            .Where(z => z.Id == rozjizdka.ZavodId)
            .Select(z => new { z.Slug, z.Nazev, z.Stav, z.SerieId, Serie = z.Serie!.Slug, SerieNazev = z.Serie.Nazev })
            .FirstAsync(ct);

        var prihlasky = await db.Prihlasky
            .Where(p => p.SerieId == zavod.SerieId)
            .Select(p => new
            {
                p.Id, p.Lod!.Nazev, p.Lod.CisloPlachty,
                Kategorie = p.Kategorie!.Nazev, KategoriePoradi = p.Kategorie.Poradi,
            })
            .ToListAsync(ct);

        var vysledky = await db.Vysledky
            .Where(v => v.RozjizdkaId == rozjizdka.Id)
            .Select(v => new { v.Ucast!.PrihlaskaId, v.PoradiVCili, v.Kod, v.NamerenyCas })
            .ToDictionaryAsync(v => v.PrihlaskaId, ct);

        var procNelze = poradatel ? Zapis.ProcNejdePrepsat(zavod.Stav, rozjizdka.StavVysledku) : NeniPoradatel;

        // Po kategoriích jako výsledková tabulka, uvnitř podle jména: zápis
        // se opisuje z papíru z cíle a loď se hledá očima podle názvu.
        var lode = prihlasky
            .OrderBy(p => p.KategoriePoradi)
            .ThenBy(p => p.Nazev, Jmena.Cesky)
            .Select(p =>
            {
                var v = vysledky.GetValueOrDefault(p.Id);
                return new ZapisLodDto(
                    p.Id, p.Nazev, p.CisloPlachty, p.Kategorie,
                    v?.PoradiVCili, v?.Kod,
                    v?.NamerenyCas is { } cas ? (int)cas.TotalSeconds : null);
            })
            .ToList();

        return new ZapisRozjizdkyDto(
            zavod.Serie, zavod.SerieNazev, zavod.Slug, zavod.Nazev, zavod.Stav,
            rozjizdka.Cislo, rozjizdka.StavVysledku, rozjizdka.DuvodRevize,
            procNelze is null, procNelze, lode);
    }

    /// <summary>
    /// Uloží celou sadu výsledků rozjížďky. Vrací text chyby, nebo <c>null</c>.
    /// <para>
    /// <b>Jedno uložení, celé, nebo nic.</b> Nové účasti i výsledky jdou
    /// jedním <c>SaveChanges</c>, takže se nestane, že loď přijela a výsledek
    /// jí chybí.
    /// </para>
    /// <para>
    /// <b>Čas se nepřepisuje.</b> Formulář ho nemá a výsledek z importu ho
    /// nést může — prázdná hodnota z obrazovky by ho tiše smazala.
    /// </para>
    /// <para>
    /// <b>Účast se nemaže</b>, ani když loď v téhle rozjížďce výsledek
    /// ztratí: v jiné rozjížďce téže zastávky ho mít může a posádka
    /// z importu by se ztratila s ní.
    /// </para>
    /// </summary>
    public async Task<string?> UlozAsync(
        Rozjizdka rozjizdka, IReadOnlyList<ZapisRadekVstup> radky, CancellationToken ct)
    {
        var zavod = await db.Zavody.FirstAsync(z => z.Id == rozjizdka.ZavodId, ct);

        if (Zapis.ProcNejdePrepsat(zavod.Stav, rozjizdka.StavVysledku) is { } zamceno) return zamceno;

        var prihlasky = await db.Prihlasky
            .Where(p => p.SerieId == zavod.SerieId)
            .Select(p => new { p.Id, p.Lod!.Nazev, Kategorie = p.Kategorie!.Nazev })
            .ToDictionaryAsync(p => p.Id, ct);

        var zapis = new List<ZapisRadek>();
        foreach (var r in radky)
        {
            // Přihláška z cizího ročníku by se jinak zapsala do téhle
            // zastávky — a rozsah by tím přestal cokoliv znamenat.
            if (!prihlasky.TryGetValue(r.PrihlaskaId, out var p))
                return $"Přihláška {r.PrihlaskaId} do ročníku nepatří.";

            zapis.Add(new ZapisRadek(r, p.Nazev, p.Kategorie));
        }

        if (Zapis.ProcNejdeUlozit(zapis) is { } chyba) return chyba;

        var ucasti = await db.Ucasti
            .Where(u => u.ZavodId == zavod.Id)
            .ToDictionaryAsync(u => u.PrihlaskaId, ct);

        var existujici = await db.Vysledky
            .Where(v => v.RozjizdkaId == rozjizdka.Id)
            .Include(v => v.Ucast)
            .ToDictionaryAsync(v => v.Ucast!.PrihlaskaId, ct);

        foreach (var r in zapis.Where(r => r.MaVysledek))
        {
            if (!ucasti.TryGetValue(r.Vstup.PrihlaskaId, out var ucast))
            {
                ucast = new Ucast { ZavodId = zavod.Id, PrihlaskaId = r.Vstup.PrihlaskaId };
                db.Ucasti.Add(ucast);
                ucasti[r.Vstup.PrihlaskaId] = ucast;
            }

            // Loď s výsledkem přijela — i když ji pořadatel předtím jen
            // přihlásil, nebo omylem zrušil.
            ucast.Stav = StavUcasti.Potvrzena;

            if (!existujici.TryGetValue(r.Vstup.PrihlaskaId, out var vysledek))
            {
                vysledek = new Vysledek { RozjizdkaId = rozjizdka.Id, Ucast = ucast };
                db.Vysledky.Add(vysledek);
            }

            vysledek.PoradiVCili = r.Vstup.PoradiVCili;
            vysledek.Kod = r.Vstup.Kod;
        }

        // Co v zápisu s výsledkem není, výsledek nemá. Bez toho by se omylem
        // zapsaný řádek nedal odstranit jinak než ručně v databázi.
        var sVysledkem = zapis.Where(r => r.MaVysledek).Select(r => r.Vstup.PrihlaskaId).ToHashSet();
        db.Vysledky.RemoveRange(existujici.Where(x => !sVysledkem.Contains(x.Key)).Select(x => x.Value));

        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Přidá další rozjížďku zastávky. Vrací ji, nebo text chyby.
    /// <para>
    /// <b>Nová rozjížďka je návrh a venku není.</b> Stejně jako nový článek
    /// je koncept: čísla, která ještě nikdo nezapsal, nemají co dělat na webu.
    /// Číslo je o jedno vyšší než nejvyšší — ne počet, protože zrušená
    /// rozjížďka po sobě může nechat mezeru.
    /// </para>
    /// </summary>
    public async Task<(Rozjizdka? Rozjizdka, string? Chyba)> PridejRozjizdkuAsync(
        int zavodId, CancellationToken ct)
    {
        var stav = await db.Zavody.Where(z => z.Id == zavodId).Select(z => z.Stav).FirstAsync(ct);
        if (Zapis.ProcNejdeNaZavod(stav) is { } chyba) return (null, chyba);

        var cislo = (await db.Rozjizdky.Where(r => r.ZavodId == zavodId).MaxAsync(r => (int?)r.Cislo, ct) ?? 0) + 1;

        var rozjizdka = new Rozjizdka
        {
            ZavodId = zavodId,
            Cislo = cislo,
            StavVysledku = StavVysledku.Navrzeno,
            Publikovano = false,
        };

        db.Rozjizdky.Add(rozjizdka);
        await db.SaveChangesAsync(ct);
        return (rozjizdka, null);
    }
}
