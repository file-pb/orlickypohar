using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Boje;
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
    int? CasSekundy,
    DateTimeOffset? DojezdV = null,
    // Cílová obrazovka, krok 2 (22. 9. 2026): lodě na regatě jsou tlačítka,
    // zbytek ročníku stranou; na tlačítku stojí domluvený poznávací znak.
    bool NaRegate = false,
    string? PoznavaciZnak = null);

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
    IReadOnlyList<ZapisLodDto> Lode,
    // Od 22. 9. 2026 pro cílovou obrazovku: kdy se odstartovalo a jestli
    // rozjížďka jde do poháru. Aditivně, starší klienti je nečtou.
    DateTimeOffset? StartV = null,
    bool DoSerie = true,
    // Fotka papírového zápisu (krok 3, 22. 9. 2026). Doklad k číslům,
    // veřejné čtení ji nevydává. `SmiPapir` je jen o roli: pořadatel ji
    // smí přiložit i k podepsanému zápisu, protože do čísel nesahá.
    Fotky.ObrazekDto? Papir = null,
    bool SmiPapir = false,
    // Kolik zapisovatelů už rozjížďku uložilo (krok 4). Víc než jeden
    // znamená, že je co porovnávat.
    int PocetNavrhu = 0,
    // Podoba sady, ze které klient vychází. Posílá ji zpátky při uložení
    // a server tím pozná, že mezitím někdo jiný uložil něco novějšího.
    int Revize = 0);

/// <summary>Jeden řádek snímku i s tím, co o lodi ví ročník.</summary>
public record NavrhRadekDto(
    int PrihlaskaId, string Lod, string Kategorie, int? PoradiVCili, KodVysledku? Kod);

/// <summary>
/// Snímek zápisu jednoho zapisovatele k porovnání. <c>Muj</c> říká, jestli
/// je ten, kdo se dívá, jeho autorem — na vodě jsou telefony dva a první
/// otázka je „který je můj".
/// </summary>
public record NavrhDto(
    Guid UzivatelId, string Kdo, DateTimeOffset ZapsanoV, bool Muj,
    IReadOnlyList<NavrhRadekDto> Radky);

/// <summary>Snímky rozjížďky, od nejnovějšího.</summary>
public record NavrhyDto(
    string Zavod, string ZavodNazev, int Cislo, IReadOnlyList<NavrhDto> Navrhy);

/// <summary>
/// Celá sada výsledků rozjížďky. Loď, která v ní není, výsledek nemá.
/// <para>
/// <c>Revize</c> je podoba sady, ze které klient vycházel. <b>Bez ní se
/// neukládá</b>: uložení maže, co v sadě není, takže sada odeslaná naslepo
/// umí smazat opravu, o které klient nevěděl.
/// </para>
/// </summary>
public record ZapisVstup(IReadOnlyList<ZapisRadekVstup> Radky, int? Revize = null);

/// <summary>
/// Jak dopadlo uložení sady. <c>Konflikt</c> znamená, že se mezitím uložilo
/// něco novějšího — klient si svou sadu musí nechat a nabídnout porovnání,
/// ne ji zahodit. Jestli to byl někdo jiný, nebo tentýž účet z druhého
/// telefonu, rozhoduje text chyby, ne tenhle příznak.
/// </summary>
public record VysledekUlozeni(string? Chyba, bool Konflikt = false)
{
    // Pojmenovaný argument schválně: `new(null)` se u recordu rozhodne pro
    // kopírovací konstruktor `VysledekUlozeni(VysledekUlozeni)` a spadne na
    // NullReferenceException při inicializaci typu. Překladač to nehlásí
    // a projeví se to až za běhu.
    public static readonly VysledekUlozeni Ulozeno = new(Chyba: null);
}

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
public class ZapisSprava(AppDbContext db, Fotky.IUloziste uloziste, TimeProvider cas)
{
    private const string NeniPoradatel =
        "Výsledky zapisuje pořadatel regaty. Rozhodčí je ověřuje, ale nemění.";

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
            .Select(v => new { v.Ucast!.PrihlaskaId, v.PoradiVCili, v.Kod, v.NamerenyCas, v.DojezdV })
            .ToDictionaryAsync(v => v.PrihlaskaId, ct);

        var ucasti = await db.Ucasti
            .Where(u => u.ZavodId == rozjizdka.ZavodId)
            .Select(u => new { u.PrihlaskaId, u.Stav, u.PoznavaciZnak })
            .ToDictionaryAsync(u => u.PrihlaskaId, ct);

        var pocetNavrhu = await db.ZapisyNavrhu.CountAsync(n => n.RozjizdkaId == rozjizdka.Id, ct);

        var papir = rozjizdka.FotkaId is { } fotkaId
            ? await db.Fotky.FirstOrDefaultAsync(f => f.Id == fotkaId, ct)
            : null;

        var procNelze = poradatel ? Zapis.ProcNejdePrepsat(zavod.Stav, rozjizdka.StavVysledku) : NeniPoradatel;

        // Po kategoriích jako výsledková tabulka, uvnitř podle jména: zápis
        // se opisuje z papíru z cíle a loď se hledá očima podle názvu.
        var lode = prihlasky
            .OrderBy(p => p.KategoriePoradi)
            .ThenBy(p => p.Nazev, Jmena.Cesky)
            .Select(p =>
            {
                var v = vysledky.GetValueOrDefault(p.Id);
                var u = ucasti.GetValueOrDefault(p.Id);
                return new ZapisLodDto(
                    p.Id, p.Nazev, p.CisloPlachty, p.Kategorie,
                    v?.PoradiVCili, v?.Kod,
                    v?.NamerenyCas is { } cas ? (int)cas.TotalSeconds : null,
                    v?.DojezdV,
                    u is not null && Zapis.NaRegate(u.Stav),
                    u?.PoznavaciZnak);
            })
            .ToList();

        return new ZapisRozjizdkyDto(
            zavod.Serie, zavod.SerieNazev, zavod.Slug, zavod.Nazev, zavod.Stav,
            rozjizdka.Cislo, rozjizdka.StavVysledku, rozjizdka.DuvodRevize,
            procNelze is null, procNelze, lode, rozjizdka.StartV, rozjizdka.DoSerie,
            Fotky.Nahravani.Dto(papir, uloziste.VerejnaAdresa), poradatel, pocetNavrhu,
            rozjizdka.Revize);
    }

    /// <summary>
    /// Uloží celou sadu výsledků rozjížďky. Vrací text chyby, nebo <c>null</c>.
    /// <para>
    /// <b>Jedno uložení, celé, nebo nic.</b> Nové účasti i výsledky jdou
    /// jedním <c>SaveChanges</c>, takže se nestane, že loď přijela a výsledek
    /// jí chybí.
    /// </para>
    /// <para>
    /// <b>Čas se nepřepisuje, když ho zápis nenese.</b> Formulář z papíru ho
    /// nemá a výsledek z importu ho nést může — prázdná hodnota z obrazovky
    /// by ho tiše smazala. Cílová obrazovka ho posílá (<c>DojezdV</c>) a ten
    /// se uloží i s naměřeným časem od startu.
    /// </para>
    /// <para>
    /// <b>Účast se nemaže</b>, ani když loď v téhle rozjížďce výsledek
    /// ztratí: v jiné rozjížďce téže zastávky ho mít může a posádka
    /// z importu by se ztratila s ní.
    /// </para>
    /// </summary>
    public async Task<VysledekUlozeni> UlozAsync(
        Rozjizdka rozjizdka, IReadOnlyList<ZapisRadekVstup> radky, CancellationToken ct,
        Guid? kdo = null, int? revize = null)
    {
        await using var transakce = await db.Database.BeginTransactionAsync(ct);

        // Zámek řádku rozjížďky, ne jen porovnání čísla: dvě uložení ve
        // stejnou chvíli by si obě přečetla tutéž revizi, obě by prošla
        // a druhé by přepsalo první, aniž by to kdo poznal.
        await db.Database.ExecuteSqlAsync(
            $"SELECT 1 FROM \"Rozjizdky\" WHERE \"Id\" = {rozjizdka.Id} FOR UPDATE", ct);
        await db.Entry(rozjizdka).ReloadAsync(ct);

        var zavod = await db.Zavody.FirstAsync(z => z.Id == rozjizdka.ZavodId, ct);

        if (Zapis.ProcNejdePrepsat(zavod.Stav, rozjizdka.StavVysledku) is { } zamceno)
            return new VysledekUlozeni(zamceno);

        // Sada bez revize se neukládá. Není to „tak tedy bez kontroly":
        // uložení maže lodě, které v sadě nejsou, takže sada odeslaná
        // naslepo umí smazat opravu, o které klient nevěděl. Konfliktem je
        // jen nesoulad — chybějící revize je starý klient, ne souběh.
        if (Zapis.ProcNejdeUlozitRevizi(revize, rozjizdka.Revize) is { } stara)
        {
            // „Uložil někdo jiný" je tvrzení, které samo porovnání čísel
            // neunese: u vody bývá jeden účet na dvou telefonech (zkouška
            // ovládání C7). Autora poslední revize dohledáme ze snímků —
            // a jen při konfliktu, na každé uložení by to byl dotaz za nic.
            Guid? posledni = null;
            if (revize is not null && kdo is not null)
                posledni = await db.ZapisyNavrhu
                    .Where(n => n.RozjizdkaId == rozjizdka.Id)
                    .OrderByDescending(n => n.ZapsanoV)
                    .Select(n => (Guid?)n.UzivatelId)
                    .FirstOrDefaultAsync(ct);

            return new VysledekUlozeni(
                posledni == kdo && posledni is not null ? Zapis.RevizeNesediTentyzUcet : stara,
                Konflikt: revize is not null);
        }

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
                return new VysledekUlozeni($"Přihláška {r.PrihlaskaId} do ročníku nepatří.");

            zapis.Add(new ZapisRadek(r, p.Nazev, p.Kategorie));
        }

        if (Zapis.ProcNejdeUlozit(zapis) is { } chyba) return new VysledekUlozeni(chyba);

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
            // přihlásil, nebo omylem zrušil. Vyloučená zůstává vyloučená:
            // výsledky má, ale o jejím stavu rozhodl rozhodčí.
            if (ucast.Stav != StavUcasti.Vyloucena) ucast.Stav = StavUcasti.Potvrzena;

            if (!existujici.TryGetValue(r.Vstup.PrihlaskaId, out var vysledek))
            {
                vysledek = new Vysledek { RozjizdkaId = rozjizdka.Id, Ucast = ucast };
                db.Vysledky.Add(vysledek);
            }

            vysledek.PoradiVCili = r.Vstup.PoradiVCili;
            vysledek.Kod = r.Vstup.Kod;

            if (r.Vstup.DojezdV is { } dojezd)
            {
                // Do UTC: Npgsql jiný posun do `timestamp with time zone`
                // nepřijme a padlo by to až při zápisu.
                vysledek.DojezdV = dojezd.ToUniversalTime();
                vysledek.NamerenyCas = Zapis.NamerenyCas(rozjizdka.StartV, dojezd);
            }
        }

        // Co v zápisu s výsledkem není, výsledek nemá. Bez toho by se omylem
        // zapsaný řádek nedal odstranit jinak než ručně v databázi.
        var sVysledkem = zapis.Where(r => r.MaVysledek).Select(r => r.Vstup.PrihlaskaId).ToHashSet();
        db.Vysledky.RemoveRange(existujici.Where(x => !sVysledkem.Contains(x.Key)).Select(x => x.Value));

        if (kdo is { } zapisovatel) await SnimekAsync(rozjizdka.Id, zapisovatel, radky, ct);

        rozjizdka.Stav = Zapis.StavPoZapisu(
            rozjizdka.Stav,
            rozjizdka.StartV is not null,
            ucasti.Values.Select(u => (u.Stav, sVysledkem.Contains(u.PrihlaskaId))));

        // Nová podoba sady. Klient, který vyšel ze staré, už neprojde.
        rozjizdka.Revize++;

        await db.SaveChangesAsync(ct);
        await transakce.CommitAsync(ct);
        return VysledekUlozeni.Ulozeno;
    }

    /// <summary>
    /// Snímky zápisu k porovnání. Prázdné, dokud nikdo neuložil.
    /// </summary>
    public async Task<NavrhyDto> NavrhyAsync(Rozjizdka rozjizdka, Guid? kdo, CancellationToken ct)
    {
        var zavod = await db.Zavody
            .Where(z => z.Id == rozjizdka.ZavodId)
            .Select(z => new { z.Slug, z.Nazev, z.SerieId })
            .FirstAsync(ct);

        var lode = await db.Prihlasky
            .Where(p => p.SerieId == zavod.SerieId)
            .Select(p => new { p.Id, p.Lod!.Nazev, Kategorie = p.Kategorie!.Nazev })
            .ToDictionaryAsync(p => p.Id, ct);

        // Bez sledování: projekce bere řádky snímku (vlastněná kolekce)
        // bez jejich vlastníka a sledovaný dotaz to nedovolí.
        var navrhy = await db.ZapisyNavrhu
            .AsNoTracking()
            .Where(n => n.RozjizdkaId == rozjizdka.Id)
            .OrderByDescending(n => n.ZapsanoV)
            .Select(n => new { n.UzivatelId, Kdo = n.Uzivatel!.Zobrazovane, n.ZapsanoV, n.Radky })
            .ToListAsync(ct);

        return new NavrhyDto(zavod.Slug, zavod.Nazev, rozjizdka.Cislo,
        [
            .. navrhy.Select(n => new NavrhDto(
                n.UzivatelId, n.Kdo, n.ZapsanoV, n.UzivatelId == kdo,
                [
                    .. n.Radky
                        .OrderBy(r => r.PoradiVCili ?? int.MaxValue)
                        .Select(r => new NavrhRadekDto(
                            r.PrihlaskaId,
                            lode.GetValueOrDefault(r.PrihlaskaId)?.Nazev ?? "neznámá loď",
                            lode.GetValueOrDefault(r.PrihlaskaId)?.Kategorie ?? "",
                            r.PoradiVCili, r.Kod)),
                ])),
        ]);
    }

    /// <summary>
    /// Přepíše výsledky rozjížďky snímkem jednoho zapisovatele. Vrací text
    /// chyby, <c>null</c> když se povedlo, a <c>NenalezenNavrh</c>, když
    /// takový snímek není.
    /// </summary>
    public async Task<(bool Nenalezen, string? Chyba)> PouzijNavrhAsync(
        Rozjizdka rozjizdka, Guid autor, Guid? kdo, CancellationToken ct)
    {
        // Snímek se bere z databáze, takže vychází z právě platné revize —
        // kontrola by tu neměla co hlídat a jen by úkon rozbila.
        var navrh = await db.ZapisyNavrhu
            .FirstOrDefaultAsync(n => n.RozjizdkaId == rozjizdka.Id && n.UzivatelId == autor, ct);

        if (navrh is null) return (true, null);

        var radky = navrh.Radky
            .Select(r => new ZapisRadekVstup(r.PrihlaskaId, r.PoradiVCili, r.Kod, r.DojezdV))
            .ToList();

        return (false, (await UlozAsync(rozjizdka, radky, ct, kdo, rozjizdka.Revize)).Chyba);
    }

    /// <summary>
    /// Snímek zápisu toho, kdo právě uložil (krok 4). Na vodě zapisují dva
    /// a druhé uložení přepíše první — bez snímku by starší verze zmizela
    /// dřív, než by si jí kdo všiml.
    /// </summary>
    private async Task SnimekAsync(
        int rozjizdkaId, Guid kdo, IReadOnlyList<ZapisRadekVstup> radky, CancellationToken ct)
    {
        var navrh = await db.ZapisyNavrhu
            .FirstOrDefaultAsync(n => n.RozjizdkaId == rozjizdkaId && n.UzivatelId == kdo, ct);

        if (navrh is null)
        {
            navrh = new ZapisNavrh { RozjizdkaId = rozjizdkaId, UzivatelId = kdo };
            db.ZapisyNavrhu.Add(navrh);
        }

        navrh.ZapsanoV = cas.GetUtcNow();
        navrh.Radky =
        [
            .. radky
                .Where(r => r.PoradiVCili is not null || r.Kod is not null)
                .Select(r => new NavrhRadek
                {
                    PrihlaskaId = r.PrihlaskaId,
                    PoradiVCili = r.PoradiVCili,
                    Kod = r.Kod,
                    DojezdV = r.DojezdV?.ToUniversalTime(),
                }),
        ];
    }

    /// <summary>
    /// Poznávací znak lodi na regatě (cílová obrazovka). Vrací text chyby,
    /// nebo <c>null</c>.
    /// <para>
    /// <b>Jen loď, která na regatě je.</b> Účast se kvůli znaku nezakládá:
    /// vznikla by loď „na startu" jen proto, že si ji někdo popsal. Pozdní
    /// loď se přihlásí, nebo jí rovnou zapíše dojezd.
    /// </para>
    /// </summary>
    public async Task<string?> ZnakAsync(int zavodId, int prihlaskaId, string? znak, CancellationToken ct)
    {
        var stav = await db.Zavody.Where(z => z.Id == zavodId).Select(z => z.Stav).FirstAsync(ct);
        if (Zapis.ProcNejdeNaZavod(stav) is { } zamceno) return zamceno;

        var (upraveny, chyba) = Zapis.UpravZnak(znak);
        if (chyba is not null) return chyba;

        var ucast = await db.Ucasti.FirstOrDefaultAsync(u => u.ZavodId == zavodId && u.PrihlaskaId == prihlaskaId, ct);
        if (ucast is null || !Zapis.NaRegate(ucast.Stav))
            return "Loď na regatu přihlášená není. Přihlas ji, nebo jí rovnou zapiš dojezd.";

        ucast.PoznavaciZnak = upraveny;
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Zapíše start rozjížďky (cílová obrazovka). Vrací text chyby, nebo
    /// <c>null</c>. Start jde přepsat, dokud je zápis otevřený — tlačítko
    /// se na vodě snadno zmáčkne o znamení dřív.
    /// </summary>
    public async Task<string?> StartAsync(Rozjizdka rozjizdka, DateTimeOffset kdy, CancellationToken ct)
    {
        var zavod = await db.Zavody.FirstAsync(z => z.Id == rozjizdka.ZavodId, ct);
        if (Zapis.ProcNejdePrepsat(zavod.Stav, rozjizdka.StavVysledku) is { } zamceno) return zamceno;

        // <b>Bez přijaté trati se nestartuje</b> (Filip, 15. 10. 2026:
        // *„to, co nemá trať, nejde odstartovat"* — a na doptání: musí být
        // přijatá rozhodčím). Přijetí je to, čím rozhodčí říká „jede se
        // podle tohohle"; odstartovat dřív by znamenalo pustit lodě na
        // trať, kterou nikdo nepotvrdil a která se pod nimi ještě může
        // změnit.
        //
        // <b>Jen první start.</b> Přepsat čas běžící rozjížďky musí jít
        // pořád — tlačítko se na vodě snadno zmáčkne o znamení dřív a mezitím
        // mohla trať odejít do přestavby.
        if (rozjizdka.Stav == StavRozjizdky.Planovana
            && !await db.Trate.AnyAsync(
                t => t.RozjizdkaId == rozjizdka.Id && t.Stav == StavTrati.Prijato, ct))
            return "Rozjížďka nemá přijatou trať. Přiřaď jí trať a nech ji rozhodčím přijmout.";

        rozjizdka.StartV = kdy.ToUniversalTime();
        if (rozjizdka.Stav == StavRozjizdky.Planovana) rozjizdka.Stav = StavRozjizdky.Probiha;

        // Časy už dojetých lodí se přepočítají k novému startu.
        var vysledky = await db.Vysledky.Where(v => v.RozjizdkaId == rozjizdka.Id && v.DojezdV != null).ToListAsync(ct);
        foreach (var v in vysledky) v.NamerenyCas = Zapis.NamerenyCas(rozjizdka.StartV, v.DojezdV!.Value);

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
        int zavodId, CancellationToken ct, bool doSerie = true)
    {
        var zavod = await db.Zavody
            .Where(z => z.Id == zavodId)
            .Select(z => new { z.Stav, z.Druh })
            .FirstAsync(ct);

        if ((Kalendar.ProcNejdePoharove(zavod.Druh) ?? Zapis.ProcNejdeNaZavod(zavod.Stav)) is { } chyba)
            return (null, chyba);

        var cislo = (await db.Rozjizdky.Where(r => r.ZavodId == zavodId).MaxAsync(r => (int?)r.Cislo, ct) ?? 0) + 1;

        var rozjizdka = new Rozjizdka
        {
            ZavodId = zavodId,
            Cislo = cislo,
            StavVysledku = StavVysledku.Navrzeno,
            Publikovano = false,
            // Na vodě se rozhoduje, jestli rozjížďka jde do poháru — typicky
            // běh pro míčky na Izolepě ne (cílová obrazovka, 22. 9. 2026).
            DoSerie = doSerie,
        };

        db.Rozjizdky.Add(rozjizdka);
        await db.SaveChangesAsync(ct);
        return (rozjizdka, null);
    }
}
