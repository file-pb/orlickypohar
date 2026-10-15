using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Poradatele;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Zastávka v kalendáři tak, jak ji vidí rozhodčí nebo pořadatel. Proti
/// veřejnému <c>ZavodShrnutiDto</c> nese navíc příznak publikace a
/// <b>seznam stavů, do kterých ji tenhle člověk může posunout</b>.
/// <para>
/// Nabídka se počítá na serveru schválně: pravidla přechodů i oprávnění
/// jsou tady, a kdyby si je obrazovka odvozovala sama, rozejdou se při
/// první změně a člověk dostane „nemáš práva“ na tlačítko, které mu web
/// sám nabídl.
/// </para>
/// </summary>
public record ZastavkaRadek(
    string Slug,
    string Nazev,
    DateOnly Datum,
    DateOnly? DatumKonce,
    string? Typ,
    string? Poradatel,
    int Poradi,
    StavZavodu Stav,
    DateOnly? PuvodniDatum,
    bool Publikovano,
    bool SmiUpravit,
    bool SmiPublikovat,
    IReadOnlyList<StavZavodu> MozneStavy,
    DruhZastavky Druh = DruhZastavky.Pohar,
    // Klíč záznamu pořadatele, ze kterého se jde na jeho medailonek.
    // Na konci a s výchozí hodnotou: změny API jsou jen aditivní.
    string? PoradatelSlug = null,
    // Medailonek smí upravit rozhodčí, nebo organizátor téhle zastávky.
    bool SmiMedailonek = false,
    // Jak se regata vyhodnocuje. Aditivně, na konci: formulář kalendáře
    // to předvyplňuje (Filip, 22. 9. 2026).
    Vyhodnoceni Vyhodnoceni = Vyhodnoceni.PoKategoriich,
    // Počty do poháru. Formulář je potřebuje předvyplnit, jinak by úprava
    // termínu ukazovala prázdno tam, kde nějaká hodnota platí.
    int PocetSkrtu = 0,
    decimal KoeficientDoSerie = 1.0m,
    int PosunDoSerie = 0);

public record PrehledZastavekDto(
    string Serie,
    string SerieNazev,
    bool SmiZalozit,
    IReadOnlyList<ZastavkaRadek> Zastavky);

/// <summary>
/// Co se posílá při založení i úpravě zastávky. Adresa se odvodí z názvu.
/// <para>
/// Počet škrtů a koeficient do poháru tu schválně nejsou: to jsou čísla,
/// podle kterých se pohár počítá, a mění se jinde a jindy.
/// <para>
/// <b>Vyhodnocení tu ale je</b> (Filip, 22. 9. 2026). Neříká, kolik kdo
/// dostane bodů — ty jdou do poháru vždycky po kategoriích — jen jestli
/// regata vyhlašuje i celkové pořadí napříč kategoriemi. To je rozhodnutí
/// o regatě, které padá při jejím vypsání, a rozhodčí ho má mít po ruce
/// v kalendáři.
/// </para>
/// </para>
/// </summary>
public record ZastavkaVstup(
    string Nazev,
    DateOnly Datum,
    DateOnly? DatumKonce = null,
    string? Typ = null,
    string? Poradatel = null,
    // Platí jen při založení. Úprava druh nemění — viz `Zavod.Druh`.
    DruhZastavky Druh = DruhZastavky.Pohar,
    // Bez hodnoty zůstává „po kategoriích", jak se regaty vyhodnocují běžně.
    Vyhodnoceni Vyhodnoceni = Vyhodnoceni.PoKategoriich,
    /// <summary>
    /// Kolik nejhorších rozjížděk se v regatě škrtá. Okruhová typicky 1,
    /// vytrvalostní 0.
    /// <para>
    /// <b>Nepovinné, a „nezadáno" není nula</b>: starý klient tahle pole
    /// neposílá a úprava termínu by jinak naimportovanému ročníku vynulovala
    /// škrty i koeficient. Bez hodnoty se nechá, co na zastávce je.
    /// </para>
    /// <para>
    /// <b>Stojí na konci schválně</b>: vložené doprostřed by rozbilo
    /// poziční volání.
    /// </para>
    /// </summary>
    int? PocetSkrtu = null,
    /// <summary>Váha regaty v seriálu, běžně 1,0. Nepovinné jako škrty.</summary>
    decimal? KoeficientDoSerie = null,
    /// <summary>
    /// Kolik se přičte lodím s umístěním — typicky bonus −1 u 24hodinovky.
    /// Není to koeficient: bonus posouvá, nenásobí. Nepovinné jako škrty.
    /// </summary>
    int? PosunDoSerie = null);

public record StavZastavkyVstup(StavZavodu Stav);

public record PublikaceVstup(bool Publikovano);

/// <summary>
/// Čtení a zápis kalendáře ročníku.
/// <para>
/// Leží to v řezu <c>Zavody</c>, ne ve <c>Features/Sprava</c> — stejně jako
/// psaní článků leží u článků. Řez je doménový pojem, ne publikum.
/// </para>
/// <para>
/// <b>Zastávka předaná do <c>UpravAsync</c>, <c>PrepniStavAsync</c> a
/// <c>PublikujAsync</c> musí pocházet z téhož požadavku.</b> Entita z jiného
/// <c>DbContext</c> není sledovaná a uložení tiše neudělá nic. V endpointech
/// to platí samo sebou, protože si zastávku načtou přes <c>NajdiAsync</c>
/// v témže požadavku; u článků to stálo jeden běh CI, tak ať je to napsané
/// i tady.
/// </para>
/// </summary>
public class KalendarSprava(AppDbContext db)
{
    /// <summary>Zastávka i s identifikátorem — ten se ven neposílá, ale rozsah se ptá na něj.</summary>
    public record Zaznam(int Id, Zavod Zavod);

    /// <summary>
    /// Všechny zastávky ročníku, seřazené jako kalendář.
    /// <para>
    /// <b>Celý ročník, i tomu, kdo smí jen na jednu zastávku.</b> Půlka
    /// kalendáře není kalendář — pořadatel jedné zastávky potřebuje vidět,
    /// co je kolem ní, jinak si termín nemá s čím srovnat. Co smí změnit,
    /// říká každý řádek sám.
    /// </para>
    /// </summary>
    public Task<List<Zaznam>> VypisAsync(int serieId, CancellationToken ct) =>
        db.Zavody
            .Include(z => z.PoradatelZaznam)
            .Where(z => z.SerieId == serieId)
            .OrderBy(z => z.Poradi).ThenBy(z => z.Datum)
            .Select(z => new Zaznam(z.Id, z))
            .ToListAsync(ct);

    public Task<Zavod?> NajdiAsync(int serieId, string slug, CancellationToken ct) =>
        db.Zavody
            .Include(z => z.PoradatelZaznam)
            .FirstOrDefaultAsync(z => z.SerieId == serieId && z.Slug == slug, ct);

    /// <summary>
    /// Založí zastávku. Vrací hotový záznam, nebo text chyby.
    /// <para>
    /// <b>Nová zastávka je vždycky plánovaná a nepublikovaná.</b> Kalendář
    /// začíná návrhem termínu; potvrdit ho i pustit ven jsou dvě další
    /// rozhodnutí a každé patří někomu jinému.
    /// </para>
    /// </summary>
    public async Task<(Zavod? Zastavka, string? Chyba)> ZalozAsync(
        int serieId, ZastavkaVstup vstup, CancellationToken ct)
    {
        var slug = Kalendar.Slug(vstup.Nazev ?? "");
        var rok = await db.Serie.Where(s => s.Id == serieId).Select(s => (int?)s.Rok)
            .FirstOrDefaultAsync(ct);

        if (Kalendar.ProcNejdeUlozit(vstup.Nazev, vstup.Datum, vstup.DatumKonce, slug, rok)
            is { } chyba)
            return (null, chyba);

        if (Kalendar.ProcNejdouPocty(vstup.PocetSkrtu, vstup.KoeficientDoSerie) is { } pocty)
            return (null, pocty);

        if (await db.Zavody.AnyAsync(z => z.SerieId == serieId && z.Slug == slug, ct))
            return (null, $"Regata s adresou „{slug}“ už v ročníku je. Změň název.");

        var zastavka = new Zavod
        {
            SerieId = serieId,
            Slug = slug,
            Nazev = vstup.Nazev.Trim(),
            Datum = vstup.Datum,
            DatumKonce = vstup.DatumKonce,
            Typ = Prazdne(vstup.Typ),
            Druh = vstup.Druh,
            Vyhodnoceni = vstup.Vyhodnoceni,
            PocetSkrtu = vstup.PocetSkrtu ?? 0,
            KoeficientDoSerie = vstup.KoeficientDoSerie ?? 1.0m,
            PosunDoSerie = vstup.PosunDoSerie ?? 0,
            Stav = StavZavodu.Planovany,
            Publikovano = false,
            // Pořadí se hned přepočítá podle data; tohle je jen než dostane
            // identifikátor, bez kterého se řadit nedá.
            Poradi = 0,
        };

        await PoradateleSprava.PriradAsync(db, zastavka, vstup.Poradatel, ct);
        db.Zavody.Add(zastavka);
        await db.SaveChangesAsync(ct);

        await PreradAsync(serieId, ct);
        return (zastavka, null);
    }

    /// <summary>
    /// Upraví zastávku. <b>Adresa se nemění</b>, ani když se změní název —
    /// odkaz na zastávku už mohl někam odejít.
    /// </summary>
    public async Task<string?> UpravAsync(Zavod zastavka, ZastavkaVstup vstup, CancellationToken ct)
    {
        var rok = await db.Serie.Where(s => s.Id == zastavka.SerieId).Select(s => (int?)s.Rok)
            .FirstOrDefaultAsync(ct);

        if (Kalendar.ProcNejdeUlozit(
                vstup.Nazev, vstup.Datum, vstup.DatumKonce, zastavka.Slug, rok) is { } chyba)
            return chyba;

        if (Kalendar.ProcNejdouPocty(vstup.PocetSkrtu, vstup.KoeficientDoSerie) is { } pocty)
            return pocty;

        zastavka.PuvodniDatum = Kalendar.PuvodniPoPresunu(
            zastavka.Stav, zastavka.Datum, vstup.Datum, zastavka.PuvodniDatum);

        zastavka.Nazev = vstup.Nazev.Trim();
        zastavka.Datum = vstup.Datum;
        zastavka.DatumKonce = vstup.DatumKonce;
        zastavka.Typ = Prazdne(vstup.Typ);
        zastavka.Vyhodnoceni = vstup.Vyhodnoceni;
        // Co nepřišlo, se nemění — viz `ZastavkaVstup.PocetSkrtu`.
        zastavka.PocetSkrtu = vstup.PocetSkrtu ?? zastavka.PocetSkrtu;
        zastavka.KoeficientDoSerie = vstup.KoeficientDoSerie ?? zastavka.KoeficientDoSerie;
        zastavka.PosunDoSerie = vstup.PosunDoSerie ?? zastavka.PosunDoSerie;
        // Jiné jméno přiřadí jiného pořadatele; přejmenovat klub se dá jen
        // v jeho medailonku, jinak by jeden překlep v kalendáři přepsal
        // jméno na všech jeho zastávkách.
        await PoradateleSprava.PriradAsync(db, zastavka, vstup.Poradatel, ct);

        await db.SaveChangesAsync(ct);
        await PreradAsync(zastavka.SerieId, ct);
        return null;
    }

    public async Task<string?> PrepniStavAsync(Zavod zastavka, StavZavodu na, CancellationToken ct)
    {
        if (Kalendar.ProcNejde(zastavka.Stav, na) is { } chyba) return chyba;

        zastavka.Stav = na;
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Pustí zastávku ven, nebo ji stáhne. <b>Publikace není stav</b>, je to
    /// vlastní příznak — plánovaná zastávka má být v kalendáři vidět dřív,
    /// než se cokoliv vypíše, a odjetá se smí stáhnout, aniž by se
    /// odjetou přestala být.
    /// </summary>
    public async Task PublikujAsync(Zavod zastavka, bool publikovano, CancellationToken ct)
    {
        zastavka.Publikovano = publikovano;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Přečíslování celého ročníku podle data. Pravidlo je v <see cref="Kalendar.Preradit"/>.
    /// <para>
    /// <b>Každý druh zvlášť.</b> Pořadí zastávky poháru je „třetí kolo" — akce
    /// vložená mezi kola by ho posunula a sloupce v průběžném pořadí by
    /// přestaly sedět s tím, co zná každý závodník.
    /// </para>
    /// </summary>
    private async Task PreradAsync(int serieId, CancellationToken ct)
    {
        var zastavky = await db.Zavody.Where(z => z.SerieId == serieId).ToListAsync(ct);
        var poradi = zastavky
            .GroupBy(z => z.Druh)
            .SelectMany(druh => Kalendar.Preradit(druh.Select(z => (z.Id, z.Datum, z.Poradi))))
            .ToDictionary(x => x.Key, x => x.Value);

        var zmena = false;
        foreach (var z in zastavky.Where(z => z.Poradi != poradi[z.Id]))
        {
            z.Poradi = poradi[z.Id];
            zmena = true;
        }

        if (zmena) await db.SaveChangesAsync(ct);
    }

    /// <summary>Prázdný řetězec z formuláře je „nevyplněno", ne hodnota.</summary>
    private static string? Prazdne(string? text) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Trim();
}
