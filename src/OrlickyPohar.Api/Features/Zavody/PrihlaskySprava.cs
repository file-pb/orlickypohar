using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Bodovani;
using OrlickyPohar.Api.Features.Lode;
using OrlickyPohar.Api.Features.Serial;
using Kontakty = OrlickyPohar.Api.Features.Lode.Kontakty;
using KontaktOsoby = OrlickyPohar.Api.Features.Lode.KontaktOsoby;

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
    string? Duvod = null,
    // Co přišlo s přihláškou. Kontakty vidí jen pořadatel a rozhodčí —
    // tahle odpověď je jen pro ně (plán, Veřejné přihlášky lodí).
    string? Kapitan = null,
    string? Email = null,
    string? Telefon = null,
    string? Posadka = null,
    string? Poznamka = null,
    DateTimeOffset? PodanoV = null,
    bool Zaplaceno = false,
    string? StartovnePoznamka = null,
    IReadOnlyList<ZmenaUcastiDto>? Historie = null,
    // Požadavek nebo odmítnutou přihlášku bez výsledků jde smazat — nesmysl
    // z webu se nemá válet ve frontě ani jako odmítnutý.
    bool SmiSmazat = false,
    // Id lodi, ne přihlášky: připojovací kód se vystavuje lodi, která žije
    // napříč ročníky. Obrazovka přihlášek je jediné místo, kde má pořadatel
    // loď před sebou (Filip, 4. 10. 2026). Aditivně, na konci.
    int LodId = 0);

/// <summary>Jedna změna stavu pro obrazovku. <c>Kdo</c> prázdný znamená „z webu".</summary>
public record ZmenaUcastiDto(StavUcasti? Ze, StavUcasti Na, DateTimeOffset Kdy, string? Kdo, string? Duvod);

public record StartovneVstup(bool Zaplaceno, string? Poznamka = null);

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
/// <b>Neúčast na dřívějších zastávkách se dopočítává v průběžném pořadí.</b>
/// Rozhodčí odpověděl 22. 9. 2026: je to tolik bodů, kolik lodí kategorie
/// bylo do závodu <b>přihlášeno</b> — i těch, které se nedostavily
/// (<c>Bodovani.PrihlasenaDoZavodu</c>), ne kolik jich jelo. Plán, oddíl
/// <i>Pravidla seriálu od rozhodčího</i>.
/// Kdo neúčast dostane, plyne z přihlášky do ročníku, a ta žádné datum nemá
/// — loď přihlášená uprostřed ročníku má DNC i na dřívějších zastávkách.
/// Do odpovědi se schválně nic nezapisuje: pořadí je odvozené, ne uložené.
/// </para>
/// </summary>
public class PrihlaskySprava(AppDbContext db, TimeProvider cas)
{
    private const string NeniPoradatel = "Lodě na regatu přihlašuje její pořadatel.";

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

    /// <summary>
    /// Přihláška z veřejného formuláře. Vzniká jako <b>požadavek</b>: loď
    /// je v systému, ale na webu není a do pole nepatří, dokud ji pořadatel
    /// nezapíše.
    /// <para>
    /// <b>Kategorii u lodi, která v ročníku už jede, formulář nemění.</b>
    /// Loď jede celý rok v jedné a změna je rozhodnutí správce.
    /// </para>
    /// <para>
    /// Kapitán je osoba jako každá jiná (páruje se podle jména) a jeho
    /// kontakt jde do historie kontaktů. Na přihlášce zůstává kopie.
    /// </para>
    /// </summary>
    public async Task<(int? UcastId, string? Chyba)> VerejnaAsync(
        int zavodId, VerejnaPrihlaskaVstup vstup, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();
        if (VerejnaPrihlaska.ProcNejde(vstup, ted) is { } chybaVstupu) return (null, chybaVstupu);

        var zavod = await db.Zavody.FirstAsync(z => z.Id == zavodId, ct);
        if ((Kalendar.ProcNejdePoharove(zavod.Druh) ?? Prihlasky.ProcNejdeNaZavod(zavod.Stav)) is { } zamceno)
            return (null, zamceno);

        // Strop na zastávku. Jedna hodina stačí: pořadatel mezitím frontu
        // uvidí a spam se dá smazat.
        var zaHodinu = await db.Ucasti.CountAsync(
            u => u.ZavodId == zavodId && u.PodanoV != null && u.PodanoV > ted.AddHours(-1), ct);
        if (zaHodinu >= VerejnaPrihlaska.NejvicZaHodinu)
            return (null, "Přihlášek na tuhle regatu teď přišlo moc. Zkus to prosím za chvíli.");

        var kategorie = string.IsNullOrWhiteSpace(vstup.Kategorie)
            ? await db.Kategorie.Where(k => k.SerieId == zavod.SerieId)
                .OrderBy(k => k.Poradi).Select(k => k.Nazev).FirstAsync(ct)
            : vstup.Kategorie.Trim();

        var (prihlaska, chyba) = await PrihlaskaNoveLodiAsync(
            zavod.SerieId,
            new NovaLodVstup(
                vstup.Lod, kategorie,
                Prazdne(vstup.MajitelJmeno) ?? vstup.Kapitan.Jmeno,
                Prazdne(vstup.MajitelPrijmeni) ?? vstup.Kapitan.Prijmeni,
                vstup.CisloPlachty, vstup.Typ),
            ct);

        if (chyba is not null) return (null, chyba);

        var kapitan = await OsobaAsync(vstup.Kapitan, ct);

        var ucast = prihlaska!.Id == 0
            ? null
            : await db.Ucasti.FirstOrDefaultAsync(u => u.ZavodId == zavodId && u.PrihlaskaId == prihlaska.Id, ct);

        if (ucast is not null && Prihlasky.VerejneViditelna(ucast.Stav))
            return (null, $"Loď {prihlaska.Lod?.Nazev ?? vstup.Lod.Trim()} už je na regatu přihlášená. "
                          + "Se změnou se ozvi pořadateli.");

        if (ucast is null)
        {
            ucast = new Ucast { ZavodId = zavodId, Prihlaska = prihlaska, Stav = StavUcasti.Pozadavek };
            db.Ucasti.Add(ucast);
            Zaznamenej(ucast, null, StavUcasti.Pozadavek, null, null);
        }
        else
        {
            // Vrácená k doplnění, odmítnutá i odhlášená se odesláním
            // formuláře vrací do fronty — pořadatel ji uvidí znovu.
            Zaznamenej(ucast, ucast.Stav, StavUcasti.Pozadavek, null, null);
            ucast.Stav = StavUcasti.Pozadavek;
        }

        ucast.Kormidelnik = kapitan;
        ucast.Posadka = Prazdne(vstup.Posadka);
        ucast.Poznamka = Prazdne(vstup.Poznamka);
        ucast.KontaktEmail = Prazdne(vstup.Kapitan.Email);
        ucast.KontaktTelefon = Prazdne(vstup.Kapitan.Telefon);
        ucast.PodanoV = ted;

        await db.SaveChangesAsync(ct);

        // Kontakt do historie osoby až po uložení — potřebuje id účasti.
        var posledni = await db.Set<KontaktOsoby>()
            .Where(k => k.OsobaId == kapitan.Id)
            .OrderByDescending(k => k.ZadanoV).ThenByDescending(k => k.Id)
            .FirstOrDefaultAsync(ct);

        if (Kontakty.Novy(posledni, vstup.Kapitan.Email, vstup.Kapitan.Telefon, ted, ucast.Id) is { } novy)
        {
            novy.OsobaId = kapitan.Id;
            db.Add(novy);
            await db.SaveChangesAsync(ct);
        }

        return (ucast.Id, null);
    }

    /// <summary>Kapitán podle jména a příjmení, jako v importu. Číslo ČSJ se doplní, když chybí.</summary>
    private async Task<Osoba> OsobaAsync(KapitanVstup vstup, CancellationToken ct)
    {
        var jmeno = vstup.Jmeno.Trim();
        var prijmeni = vstup.Prijmeni.Trim();

        var osoba = await db.Osoby.FirstOrDefaultAsync(o => o.Jmeno == jmeno && o.Prijmeni == prijmeni, ct)
                    ?? db.Osoby.Add(new Osoba { Jmeno = jmeno, Prijmeni = prijmeni }).Entity;

        osoba.CisloCsj ??= Prazdne(vstup.CisloCsj);
        return osoba;
    }

    /// <summary>Zapíše startovné. Nic neblokuje — kdo přijede pozdě, zaplatí později.</summary>
    public async Task<(LodNaZastavceDto? Lod, string? Chyba)> StartovneAsync(
        int zavodId, int prihlaskaId, StartovneVstup vstup, CancellationToken ct)
    {
        var ucast = await db.Ucasti.FirstOrDefaultAsync(
            u => u.ZavodId == zavodId && u.PrihlaskaId == prihlaskaId, ct);
        if (ucast is null) return (null, null);

        if (vstup.Poznamka?.Trim().Length > 200) return (null, "Poznámka ke startovnému má nejvýš 200 znaků.");

        ucast.Zaplaceno = vstup.Zaplaceno;
        ucast.StartovnePoznamka = Prazdne(vstup.Poznamka);
        await db.SaveChangesAsync(ct);

        var serieId = await db.Zavody.Where(z => z.Id == zavodId).Select(z => z.SerieId).FirstAsync(ct);
        return ((await LodeAsync(serieId, zavodId, Prihlasky.Kdo.Poradatel, prihlaskaId, ct)).Single(), null);
    }

    /// <summary>
    /// Smaže nesmyslnou přihlášku z webu. Vrací chybu, nebo <c>null</c>;
    /// <c>Nenalezeno</c> říká, že přihláška na zastávce není.
    /// <para>
    /// <b>Uklidí i to, co vzniklo jen kvůli ní</b>: přihlášku lodi do
    /// ročníku, loď a kapitána, pokud je nic jiného nepoužívá, a kontakty,
    /// které přišly s ní. Spam se jinak usadí v našeptávači a v osobách.
    /// </para>
    /// </summary>
    public async Task<(bool Nenalezeno, string? Chyba)> SmazAsync(int zavodId, int prihlaskaId, CancellationToken ct)
    {
        var ucast = await db.Ucasti
            .Include(u => u.Prihlaska)
            .FirstOrDefaultAsync(u => u.ZavodId == zavodId && u.PrihlaskaId == prihlaskaId, ct);
        if (ucast is null) return (true, null);

        var maVysledky = await db.Vysledky.AnyAsync(v => v.UcastId == ucast.Id, ct);
        if (!Prihlasky.SmiSmazat(ucast.Stav, maVysledky))
            return (false, "Smazat jde jen požadavek, vrácenou nebo odmítnutou přihlášku bez výsledků. "
                           + "Zapsanou loď odhlas.");

        var kapitanId = ucast.KormidelnikId;
        var prihlaska = ucast.Prihlaska!;
        var lodId = prihlaska.LodId;

        await db.Set<KontaktOsoby>().Where(k => k.UcastId == ucast.Id).ExecuteDeleteAsync(ct);
        db.Ucasti.Remove(ucast);
        await db.SaveChangesAsync(ct);

        if (!await db.Ucasti.AnyAsync(u => u.PrihlaskaId == prihlaska.Id, ct))
        {
            db.Prihlasky.Remove(prihlaska);
            await db.SaveChangesAsync(ct);
        }

        if (!await db.Prihlasky.AnyAsync(p => p.LodId == lodId, ct))
        {
            var majitelId = await db.Lode.Where(l => l.Id == lodId).Select(l => l.MajitelId).FirstAsync(ct);
            await db.Lode.Where(l => l.Id == lodId).ExecuteDeleteAsync(ct);
            await SmazOsobuBezVazebAsync(majitelId, ct);
        }

        if (kapitanId is { } k) await SmazOsobuBezVazebAsync(k, ct);
        return (false, null);
    }

    /// <summary>Osobu, na kterou nic neukazuje, smaže. Kontakty jdou s ní (cascade).</summary>
    private async Task SmazOsobuBezVazebAsync(int osobaId, CancellationToken ct)
    {
        var pouzita = await db.Lode.AnyAsync(l => l.MajitelId == osobaId, ct)
                      || await db.Ucasti.AnyAsync(u => u.KormidelnikId == osobaId, ct)
                      || await db.Osoby.AnyAsync(o => o.Id == osobaId && o.UserId != null, ct);

        if (!pouzita) await db.Osoby.Where(o => o.Id == osobaId).ExecuteDeleteAsync(ct);
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
                p.Id, p.LodId, p.Lod!.Nazev, p.Lod.CisloPlachty, p.Lod.Typ,
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
                Kapitan = u.Kormidelnik == null ? null : u.Kormidelnik.Jmeno + " " + u.Kormidelnik.Prijmeni,
                // Kopie z přihlášky; když chybí (loď zapsal pořadatel), poslední
                // známý kontakt kapitána.
                Email = u.KontaktEmail ?? db.Set<KontaktOsoby>()
                    .Where(k => k.OsobaId == u.KormidelnikId)
                    .OrderByDescending(k => k.ZadanoV).Select(k => k.Email).FirstOrDefault(),
                Telefon = u.KontaktTelefon ?? db.Set<KontaktOsoby>()
                    .Where(k => k.OsobaId == u.KormidelnikId)
                    .OrderByDescending(k => k.ZadanoV).Select(k => k.Telefon).FirstOrDefault(),
                u.Posadka, u.Poznamka, u.PodanoV, u.Zaplaceno, u.StartovnePoznamka,
                Historie = u.Zmeny.OrderBy(z => z.Id).Select(z => new
                {
                    z.Ze, z.Na, z.Kdy, z.Duvod,
                    Kdo = db.Uzivatele.Where(x => x.Id == z.UzivatelId).Select(x => x.Zobrazovane).FirstOrDefault(),
                }).ToList(),
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
                    u?.Stav, u?.MaVysledky ?? false, mozne, u?.Duvod,
                    u?.Kapitan, u?.Email, u?.Telefon, u?.Posadka, u?.Poznamka, u?.PodanoV,
                    u?.Zaplaceno ?? false, u?.StartovnePoznamka,
                    u is null ? null : [.. u.Historie.Select(z => new ZmenaUcastiDto(z.Ze, z.Na, z.Kdy, z.Kdo, z.Duvod))],
                    u is not null && kdo == Prihlasky.Kdo.Poradatel && Prihlasky.SmiSmazat(u.Stav, u.MaVysledky),
                    p.LodId);
            })
            .ToList();
    }

    private static string? Prazdne(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();
}
