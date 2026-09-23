using OrlickyPohar.Api.Features.Fotky;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Clanky;

/// <summary>Článek ve výpisu pro autora — na rozdíl od veřejného nese i stav.</summary>
public record ClanekSpravaRadek(
    string Slug,
    string Titulek,
    string? Perex,
    string? Autor,
    DateTimeOffset PublikovanoV,
    StavClanku Stav,
    string? Zavod,
    string? ZavodNazev);

/// <summary>Zastávka, na kterou smí přihlášený psát. Prázdná volba je celý ročník.</summary>
public record ZavodVolbaDto(string Slug, string Nazev);

/// <summary>Obecné články mimo ročník pro obrazovku editora webu.</summary>
public record PrehledObecnychClankuDto(IReadOnlyList<ClanekSpravaRadek> Clanky);

public record PrehledClankuDto(
    string Serie,
    string SerieNazev,
    bool SmiNaRocnik,
    IReadOnlyList<ZavodVolbaDto> Zastavky,
    IReadOnlyList<ClanekSpravaRadek> Clanky);

/// <summary>Co se posílá při založení i úpravě. Slug se odvodí z titulku.</summary>
public record ClanekVstupSprava(
    string Titulek,
    string Telo,
    string? Perex = null,
    string? Autor = null,
    string? Zavod = null,
    DateTimeOffset? PublikovanoV = null,
    // V jakém tvaru autor tělo poslal. `Html` znamená „vloženo odjinud" —
    // server ho vyčistí a uloží jako bloky. Výchozí `Text` drží dosavadní
    // chování pro každého, kdo pole neposílá.
    FormatClanku Format = FormatClanku.Text);

/// <summary>
/// Čtení a zápis článků pro autora.
/// <para>
/// Oddělené od veřejného čtení v <see cref="ClanekEndpoints"/> schválně:
/// veřejné vidí jen publikované a nikoho se neptá, tohle vidí i koncepty
/// a ptá se na právo u každého řádku.
/// </para>
/// <para>
/// <b>Článek předaný do <c>UpravAsync</c> a <c>PrepniStavAsync</c> musí
/// pocházet z téhož požadavku.</b> Entita z jiného <c>DbContext</c> není
/// sledovaná a uložení tiše neudělá nic — chyba se pak neprojeví tady, ale
/// až o dva kroky dál tím, že se změna „neuložila". V endpointech to platí
/// samo sebou, protože si článek načtou přes <c>NajdiAsync</c> v témže
/// požadavku; stálo to jeden běh CI, tak ať je to napsané.
/// </para>
/// </summary>
public class ClankySprava(AppDbContext db, TimeProvider cas, IUloziste uloziste)
{
    /// <summary>
    /// Články, na které přihlášený dosáhne. <paramref name="zavody"/> je
    /// seznam zastávek, kde má právo psát; <c>null</c> v něm znamená celý
    /// ročník.
    /// <para>
    /// <b>Smazané se ve výpisu neukazují.</b> Vrátit se dají, ale ne odsud —
    /// jinak by se z výpisu stal koš, kterým se musí probírat při každém
    /// psaní. Kdo ví, že tam je, najde ho podle adresy.
    /// </para>
    /// </summary>
    /// <param name="serieId">Ročník, nebo <c>null</c> pro obecné články.</param>
    public async Task<List<ClanekSpravaRadek>> VypisAsync(
        int? serieId, bool celyRocnik, IReadOnlyCollection<int> zavody, CancellationToken ct)
    {
        var dotaz = db.Clanky.Where(c => c.SerieId == serieId && c.Stav != StavClanku.Smazano);

        // Kdo smí na celý ročník, vidí všechno. Kdo smí na zastávky, vidí
        // jejich články — a články ročníku ne, ty patří organizátorovi poháru.
        if (!celyRocnik)
            dotaz = dotaz.Where(c => c.ZavodId != null && zavody.Contains(c.ZavodId.Value));

        return await dotaz
            .OrderByDescending(c => c.PublikovanoV)
            .ThenByDescending(c => c.Id)
            .Select(c => new ClanekSpravaRadek(
                c.Slug, c.Titulek, c.Perex, c.Autor, c.PublikovanoV, c.Stav,
                c.Zavod!.Slug, c.Zavod.Nazev))
            .ToListAsync(ct);
    }

    public Task<Clanek?> NajdiAsync(int? serieId, string slug, CancellationToken ct) =>
        db.Clanky.Include(c => c.Fotka).FirstOrDefaultAsync(c => c.SerieId == serieId && c.Slug == slug, ct);

    /// <summary>Zastávky ročníku jako volby do formuláře.</summary>
    public async Task<List<ZavodVolbaDto>> ZastavkyAsync(
        int serieId, bool celyRocnik, IReadOnlyCollection<int> zavody, CancellationToken ct)
    {
        var dotaz = db.Zavody.Where(z => z.SerieId == serieId);
        if (!celyRocnik) dotaz = dotaz.Where(z => zavody.Contains(z.Id));

        return await dotaz
            .OrderBy(z => z.Poradi)
            .Select(z => new ZavodVolbaDto(z.Slug, z.Nazev))
            .ToListAsync(ct);
    }

    /// <summary>
    /// Založí článek. Vrací hotový záznam, nebo text chyby.
    /// <para>
    /// <b>Nový článek je vždycky koncept.</b> Zadání říká, že se příspěvky
    /// dají psát dopředu a skrývat — publikovat se tedy musí zvlášť, jedním
    /// vědomým krokem. Uložit rozepsaný text nesmí znamenat vydat ho.
    /// </para>
    /// </summary>
    public async Task<(Clanek? Clanek, string? Chyba)> ZalozAsync(
        int? serieId, int? zavodId, ClanekVstupSprava vstup, CancellationToken ct)
    {
        var slug = Psani.Slug(vstup.Titulek ?? "");
        if (Psani.ProcNejdeUlozit(vstup.Titulek, vstup.Telo, slug) is { } chyba)
            return (null, chyba);
        if (ProcNejdeTelo(vstup) is { } chybaTela) return (null, chybaTela);

        if (await db.Clanky.AnyAsync(c => c.SerieId == serieId && c.Slug == slug, ct))
            return (null, serieId is null
                ? $"Obecný článek s adresou „{slug}“ už je. Změň titulek."
                : $"Článek s adresou „{slug}“ už v ročníku je. Změň titulek.");

        var clanek = new Clanek
        {
            SerieId = serieId,
            ZavodId = zavodId,
            Slug = slug,
            Titulek = vstup.Titulek.Trim(),
            Perex = Prazdne(vstup.Perex),
            Telo = TeloDoDatabaze(vstup),
            Format = vstup.Format == FormatClanku.Html ? FormatClanku.Bloky : vstup.Format,
            Autor = Prazdne(vstup.Autor),
            // Do UTC: Npgsql jiný posun do `timestamp with time zone`
            // nepřijme a padlo by to až při zápisu.
            PublikovanoV = (vstup.PublikovanoV ?? cas.GetUtcNow()).ToUniversalTime(),
            Stav = StavClanku.Draft,
        };

        db.Clanky.Add(clanek);
        await db.SaveChangesAsync(ct);
        return (clanek, null);
    }

    /// <summary>
    /// Upraví článek. <b>Slug se nemění</b>, ani když se změní titulek —
    /// adresa už mohla někam odejít a přepsat ji znamená rozbít odkaz.
    /// </summary>
    public async Task<string?> UpravAsync(Clanek clanek, ClanekVstupSprava vstup, int? zavodId, CancellationToken ct)
    {
        if (Psani.ProcNejdeUlozit(vstup.Titulek, vstup.Telo, clanek.Slug) is { } chyba)
            return chyba;
        if (ProcNejdeTelo(vstup) is { } chybaTela) return chybaTela;

        clanek.Titulek = vstup.Titulek.Trim();
        clanek.Perex = Prazdne(vstup.Perex);
        clanek.Telo = TeloDoDatabaze(vstup);
        clanek.Format = vstup.Format == FormatClanku.Html ? FormatClanku.Bloky : vstup.Format;
        clanek.Autor = Prazdne(vstup.Autor);
        clanek.ZavodId = zavodId;
        if (vstup.PublikovanoV is { } kdy) clanek.PublikovanoV = kdy.ToUniversalTime();

        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Co se doopravdy uloží. Vložené HTML se čistí <b>tady, při zápisu</b>,
    /// ne až při zobrazení: kdyby se ukládalo syrové, stačilo by jedno místo,
    /// které si ho vezme bez očisty, a je z toho XSS.
    /// </summary>
    private string TeloDoDatabaze(ClanekVstupSprava vstup) =>
        vstup.Format == FormatClanku.Html
            ? Bloky.Uloz(Bloky.ZHtml(vstup.Telo, uloziste.VerejnaAdresa))
            : vstup.Telo.Trim();

    /// <summary>
    /// Proč vložený text nejde uložit. Autor dostane větu, ne tiše oříznutý
    /// článek — a provoz nedostane stránku, kterou nikdo neunese.
    /// </summary>
    private string? ProcNejdeTelo(ClanekVstupSprava vstup) =>
        vstup.Format == FormatClanku.Html
            ? Bloky.ProcNejde(vstup.Telo, uloziste.VerejnaAdresa)
            : null;

    public async Task<string?> PrepniStavAsync(Clanek clanek, StavClanku na, CancellationToken ct)
    {
        if (Psani.ProcNejde(clanek.Stav, na) is { } chyba) return chyba;

        clanek.Stav = na;
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>Prázdný řetězec z formuláře je „nevyplněno", ne hodnota.</summary>
    private static string? Prazdne(string? text) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Trim();
}
