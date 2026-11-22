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
    int PosunDoSerie = 0,
    // Procesní děj regaty. Formulář ho předvyplňuje jako ostatní počty;
    // aditivně, na konci. Viz `Zavod.ProcesniDej`.
    bool ProcesniDej = false,
    // Kolonky vypsání závodu — formulář je předvyplňuje jako počty, jinak
    // by úprava termínu ukazovala prázdno tam, kde hodnota platí.
    DateOnly? UzaverkaPrihlasek = null,
    string? Startovne = null,
    DateTimeOffset? PrvniVyzyvaciZnameni = null,
    int DelkaProceduryMin = Procedura.DelkaVychozi,
    // Smí dojezdy zapisovat i pořadatel (Filip, 21. 11. 2026). Aditivně,
    // na konci. Viz `Zavod.PoradatelZapisujeVysledky`.
    bool PoradatelZapisujeVysledky = false,
    // Kdy regatu zavřel server sám, protože se na konec dne zapomnělo.
    // Aditivně, na konci. Viz `Uzavirani`.
    DateTimeOffset? UzavrenoAutomatemV = null,
    // Dva body vypsání, které vydává pořadatel sám (R21), a k nim nápověda
    // z ročníku — ne předvyplnění: co se nevyplní, zůstane prázdné.
    string? Draha = null,
    TimeOnly? PosledniStartV = null,
    string? MistoKonani = null,
    string? NapovedaMista = null,
    string? NapovedaDrahy = null,
    TimeOnly? NapovedaPoslednihoStartu = null);

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
/// <summary>
/// <b>Kolonky vypsání závodu</b> (Dodatek J1, nálezy R1, R8 a R21).
///
/// <para>
/// <b>Prázdné znamená smazat, ne „neměnit"</b> — a je to rozdíl proti
/// <see cref="ZastavkaVstup"/> schválně. Tam je prázdno „neměnit", protože
/// ten formulář slouží k posunu termínu a nesmí cestou shodit, co do
/// ročníku přišlo importem. Tenhle formulář je naopak <b>jediné místo,
/// kde se vypsání vyplňuje</b>, posílá vždycky všechny kolonky — a bez
/// možnosti vymazat by se překlep nedal vzít zpět.
/// </para>
/// </summary>
public record VypsaniKolonkyVstup(
    string? MistoKonani = null,
    string? Draha = null,
    TimeOnly? PosledniStartV = null,
    DateOnly? UzaverkaPrihlasek = null,
    string? Startovne = null,
    DateTimeOffset? PrvniVyzyvaciZnameni = null,
    int? DelkaProceduryMin = null);

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
    int? PosunDoSerie = null,
    /// <summary>Procesní děj u regaty. Nepovinné jako škrty.</summary>
    bool? ProcesniDej = null,
    /// <summary>
    /// Smí dojezdy zapisovat i pořadatel? Nepovinné jako škrty — starý
    /// klient to neposílá a úprava termínu by příznak jinak shodila.
    /// </summary>
    bool? PoradatelZapisujeVysledky = null,
    // --- Vypsání závodu (Dodatek J1, nález R8 z 28. 10. 2026) -------------
    // Tři kolonky, které J1 žádá do vypsání a aplikace je neměla. Nepovinné
    // jako škrty a ze stejného důvodu: starý klient je neposílá a úprava
    // termínu by je jinak vymazala.
    /// <summary>Termín uzávěrky přihlášek — J1.1(5).</summary>
    DateOnly? UzaverkaPrihlasek = null,
    /// <summary>Místo konání — J1.1(1). Volný text.</summary>
    string? MistoKonani = null,
    /// <summary>Popis dráhy do vypsání — J1.3(4). Volný text.</summary>
    string? Draha = null,
    /// <summary>Po kolikáté hodině se poslední den nestartuje — J1.3(7).</summary>
    TimeOnly? PosledniStartV = null,
    /// <summary>Výše startovného a za co se platí — J1.1(5). Volný text.</summary>
    string? Startovne = null,
    /// <summary>Čas vyzývacího znamení první rozjížďky — J1.1(6), tedy T−5.</summary>
    DateTimeOffset? PrvniVyzyvaciZnameni = null,
    /// <summary>
    /// Délka startovní procedury v minutách. Pětka má v ZPJ 26 hvězdičku,
    /// takže je to parametr regaty (nález R12, 28. 10. 2026). Nepovinné
    /// jako škrty: co nepřijde, se nemění.
    /// </summary>
    int? DelkaProceduryMin = null);

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
    /// Co napovědět formuláři u dvou bodů vypsání, které vydává pořadatel
    /// sám — dráha a hodina posledního startu (R21, Filip 21. 11. 2026).
    /// Bere se z celého ročníku, protože se jezdí pořád stejně.
    /// <para>
    /// <b>Je to nápověda, ne předvyplnění</b>: pravidla jsou
    /// v <see cref="Napovedy"/>, tohle je jen dotaz k nim.
    /// </para>
    /// </summary>
    public async Task<(string? Misto, string? Draha, TimeOnly? PosledniStart)> NapovedyAsync(
        int serieId, CancellationToken ct)
    {
        var zdroj = await db.Zavody
            .Where(z => z.SerieId == serieId
                        && (z.MistoKonani != null || z.Draha != null || z.PosledniStartV != null))
            .Select(z => new { z.Datum, z.MistoKonani, z.Draha, z.PosledniStartV })
            .ToListAsync(ct);

        return (
            Napovedy.Posledni(zdroj.Select(z => (z.Datum, z.MistoKonani))),
            Napovedy.Posledni(zdroj.Select(z => (z.Datum, z.Draha))),
            Napovedy.Median(zdroj.Where(z => z.PosledniStartV is not null)
                .Select(z => z.PosledniStartV!.Value)));
    }

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

        if (Procedura.ProcNejdeDelka(vstup.DelkaProceduryMin) is { } delka) return (null, delka);

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
            ProcesniDej = vstup.ProcesniDej ?? false,
            PoradatelZapisujeVysledky = vstup.PoradatelZapisujeVysledky ?? false,
            UzaverkaPrihlasek = vstup.UzaverkaPrihlasek,
            Startovne = Prazdne(vstup.Startovne),
            MistoKonani = Prazdne(vstup.MistoKonani),
            Draha = Prazdne(vstup.Draha),
            PosledniStartV = vstup.PosledniStartV,
            PrvniVyzyvaciZnameni = vstup.PrvniVyzyvaciZnameni?.ToUniversalTime(),
            DelkaProceduryMin = vstup.DelkaProceduryMin ?? Procedura.DelkaVychozi,
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
    /// <summary>
    /// Datum do zprávy. Formát je napsaný ručně, ne podle kultury stroje —
    /// server může běžet s invariantní kulturou a „5/15/2027" by českého
    /// adresáta poslalo na jiný den.
    /// </summary>
    private static string Den(DateOnly d) => $"{d.Day}. {d.Month}. {d.Year}";

    /// <summary>
    /// Uloží kolonky vypsání. Prázdné je prázdné — viz
    /// <see cref="VypsaniKolonkyVstup"/>.
    /// </summary>
    public async Task<string?> VypsaniAsync(
        Zavod zastavka, VypsaniKolonkyVstup vstup, CancellationToken ct)
    {
        // Délka procedury je jediná kolonka s mezí: ZPJ 26 mluví o pěti
        // minutách a hvězdička u něj pouští jinou délku, ale ne libovolnou.
        if (vstup.DelkaProceduryMin is { } delka
            && Procedura.ProcNejdeDelka(delka) is { } chyba) return chyba;

        zastavka.MistoKonani = Prazdne(vstup.MistoKonani);
        zastavka.Draha = Prazdne(vstup.Draha);
        zastavka.PosledniStartV = vstup.PosledniStartV;
        zastavka.UzaverkaPrihlasek = vstup.UzaverkaPrihlasek;
        zastavka.Startovne = Prazdne(vstup.Startovne);
        zastavka.PrvniVyzyvaciZnameni = vstup.PrvniVyzyvaciZnameni;
        zastavka.DelkaProceduryMin = vstup.DelkaProceduryMin ?? Procedura.DelkaVychozi;

        await db.SaveChangesAsync(ct);
        return null;
    }

    public async Task<string?> UpravAsync(
        Zavod zastavka, ZastavkaVstup vstup, CancellationToken ct,
        Upozorneni.UpozorneniSprava? upozorneni = null)
    {
        var rok = await db.Serie.Where(s => s.Id == zastavka.SerieId).Select(s => (int?)s.Rok)
            .FirstOrDefaultAsync(ct);

        if (Kalendar.ProcNejdeUlozit(
                vstup.Nazev, vstup.Datum, vstup.DatumKonce, zastavka.Slug, rok) is { } chyba)
            return chyba;

        if (Kalendar.ProcNejdouPocty(vstup.PocetSkrtu, vstup.KoeficientDoSerie) is { } pocty)
            return pocty;

        if (Procedura.ProcNejdeDelka(vstup.DelkaProceduryMin) is { } delka) return delka;

        // <b>Přesun se musí dozvědět i ten, kdo zrovna nekouká do kalendáře</b>
        // (ZPJ 80, nález K5). Zpráva jde do téže transakce jako přesun sám —
        // buď se uloží nový termín i úkol dát o něm vědět, nebo nic; poslat
        // ji rovnou odsud by znamenalo oznámit termín, který se neuložil.
        if (Kalendar.JdeOPresun(zastavka.Stav, zastavka.Datum, vstup.Datum)
            && upozorneni is not null)
        {
            var serie = await db.Serie.Where(x => x.Id == zastavka.SerieId)
                .Select(x => x.Slug).FirstAsync(ct);

            // <b>Odběr ročníku, ne regaty.</b> Telefony se hlásí na
            // `serie:<slug>`; na `zavod:<slug>` by zpráva nedošla nikomu
            // (změřeno 26. 10. 2026 u výsledků, kde to bylo obráceně).
            //
            // Je to širší kanál, než pravidlo žádá — dostane ho každý, kdo
            // sleduje ročník, ne jen přihlášené lodě. Užší kanál zatím
            // nikdo neposlouchá, a málo adresátů je u pravidla 80 horší
            // chyba než pár navíc. <b>Kdo appku nemá, se to nedozví</b>;
            // to je zbytek K5, který tímhle vyřešený není.
            upozorneni.Zarad(
                Upozorneni.Odbery.Serie(serie),
                zastavka.Nazev,
                $"Termín se mění z {Den(zastavka.Datum)} na {Den(vstup.Datum)}.",
                $"/serie/{serie}/zavody/{zastavka.Slug}");
        }

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
        zastavka.ProcesniDej = vstup.ProcesniDej ?? zastavka.ProcesniDej;
        zastavka.PoradatelZapisujeVysledky =
            vstup.PoradatelZapisujeVysledky ?? zastavka.PoradatelZapisujeVysledky;
        zastavka.UzaverkaPrihlasek = vstup.UzaverkaPrihlasek ?? zastavka.UzaverkaPrihlasek;
        zastavka.Startovne = Prazdne(vstup.Startovne) ?? zastavka.Startovne;
        zastavka.MistoKonani = Prazdne(vstup.MistoKonani) ?? zastavka.MistoKonani;
        zastavka.Draha = Prazdne(vstup.Draha) ?? zastavka.Draha;
        zastavka.PosledniStartV = vstup.PosledniStartV ?? zastavka.PosledniStartV;
        zastavka.PrvniVyzyvaciZnameni =
            vstup.PrvniVyzyvaciZnameni?.ToUniversalTime() ?? zastavka.PrvniVyzyvaciZnameni;
        zastavka.DelkaProceduryMin = vstup.DelkaProceduryMin ?? zastavka.DelkaProceduryMin;
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
