using OrlickyPohar.Api.Features.Zavody;

namespace OrlickyPohar.Api.Features.Import;

// Tvar importního souboru. Odkazy uvnitř souboru jdou přes `klic` — čitelnou
// zkratku, která platí jen v rámci jednoho souboru a nikam se neukládá.
// V databázi se páruje podle přirozených klíčů, viz ImportHandler.

public record OsobaVstup(string Klic, string Jmeno, string Prijmeni);

public record LodVstup(string Klic, string Nazev, string? CisloPlachty, string? Typ, string Majitel);

public record KategorieVstup(string Nazev, int Poradi);

public record PrihlaskaVstup(string Lod, string Kategorie);

public record UcastVstup(string Lod, string? Kormidelnik, string? Posadka);

/// <summary>
/// Čas se posílá v sekundách, ne jako TimeSpan. Zápis doby trvání v JSONu není
/// napříč platformami jednoznačný a tenhle soubor budou psát i lidé ručně.
/// </summary>
public record VysledekVstup(
    string Lod,
    int? PoradiVCili = null,
    DateTimeOffset? DojezdV = null,
    int? CasSekundy = null,
    KodVysledku? Kod = null);

/// <summary>
/// Rozjížďka v importním souboru.
/// <para>
/// <c>StavVysledku</c> a <c>Publikovano</c> mají výchozí hodnoty schválně:
/// <b>import je zápis ze sešitu rozhodčího, ne návrh</b>. Čísla v něm už
/// prošla jeho rukama dřív, než soubor vznikl, takže přijdou jako potvrzená
/// a veřejná — a starší soubory, které o workflow nevědí, se kvůli němu
/// nemusí přepisovat.
/// </para>
/// </summary>
public record RozjizdkaVstup(
    int Cislo,
    DateTimeOffset? StartV,
    StavRozjizdky Stav,
    IReadOnlyList<VysledekVstup> Vysledky,
    bool DoSerie = true,
    StavVysledku StavVysledku = StavVysledku.Potvrzeno,
    bool Publikovano = true);

public record ZavodVstup(
    string Slug,
    string Nazev,
    DateOnly Datum,
    int Poradi,
    IReadOnlyList<UcastVstup> Ucasti,
    IReadOnlyList<RozjizdkaVstup> Rozjizdky,
    string? Poradatel = null,
    DateOnly? DatumKonce = null,
    string? Typ = null,
    int PocetSkrtu = 0,
    Vyhodnoceni Vyhodnoceni = Vyhodnoceni.PoKategoriich,
    decimal KoeficientDoSerie = 1.0m,
    bool Publikovano = true,
    StavZavodu Stav = StavZavodu.Odjety,
    DateOnly? PuvodniDatum = null);

/// <summary>
/// Článek ročníku nebo zastávky. <c>Zavod</c> je slug zastávky ze stejného
/// souboru; prázdné znamená článek celé série.
/// <para>
/// Odkaz jde přes slug, ne přes klíč jako u lodí a osob: závod slug má a je
/// součástí jeho veřejné adresy, takže vymýšlet mu vedle toho ještě klíč
/// platný jen uvnitř souboru by byl druhý identifikátor pro tutéž věc.
/// </para>
/// </summary>
public record ClanekVstup(
    string Slug,
    string Titulek,
    string Telo,
    DateTimeOffset PublikovanoV,
    string? Perex = null,
    string? Autor = null,
    string? Zavod = null,
    bool Publikovano = true);

public record SerieVstup(
    string Slug,
    string Nazev,
    int Rok,
    IReadOnlyList<KategorieVstup> Kategorie,
    IReadOnlyList<OsobaVstup> Osoby,
    IReadOnlyList<LodVstup> Lode,
    IReadOnlyList<PrihlaskaVstup> Prihlasky,
    IReadOnlyList<ZavodVstup> Zavody,
    bool Publikovano = true,
    // Ročníky nahrané před fází 6 blog nemají a jejich soubory se kvůli tomu
    // nepřepisují — chybějící seznam proto znamená „žádné články", ne chybu.
    IReadOnlyList<ClanekVstup>? Clanky = null);

/// <summary>
/// Kolik řádků import založil, kolik jich našel a kolik smazal. Druhý běh
/// téhož souboru musí mít všechna `Nove` i `Smazane` nulová — to je
/// pozorovatelný důkaz idempotence.
/// </summary>
public record ImportVysledek(
    string Serie,
    ImportPocty Osoby,
    ImportPocty Lode,
    ImportPocty Prihlasky,
    ImportPocty Zavody,
    ImportPocty Ucasti,
    ImportPocty Rozjizdky,
    ImportPocty Vysledky,
    ImportPocty Clanky);

public record ImportPocty(int Nove, int Aktualizovane, int Smazane = 0);

/// <summary>Vstup, který se nedá zpracovat. Vrací 400 a nic se neuloží.</summary>
public class ImportException(string message) : Exception(message);
