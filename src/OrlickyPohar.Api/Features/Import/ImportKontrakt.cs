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

public record RozjizdkaVstup(
    int Cislo,
    DateTimeOffset? StartV,
    StavRozjizdky Stav,
    IReadOnlyList<VysledekVstup> Vysledky,
    bool DoSerie = true);

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

public record SerieVstup(
    string Slug,
    string Nazev,
    int Rok,
    IReadOnlyList<KategorieVstup> Kategorie,
    IReadOnlyList<OsobaVstup> Osoby,
    IReadOnlyList<LodVstup> Lode,
    IReadOnlyList<PrihlaskaVstup> Prihlasky,
    IReadOnlyList<ZavodVstup> Zavody,
    bool Publikovano = true);

/// <summary>
/// Kolik řádků import založil a kolik jich našel. Druhý běh téhož souboru musí
/// mít všechna `Nove` nulová — to je pozorovatelný důkaz idempotence.
/// </summary>
public record ImportVysledek(
    string Serie,
    ImportPocty Osoby,
    ImportPocty Lode,
    ImportPocty Prihlasky,
    ImportPocty Zavody,
    ImportPocty Rozjizdky,
    ImportPocty Vysledky);

public record ImportPocty(int Nove, int Aktualizovane);

/// <summary>Vstup, který se nedá zpracovat. Vrací 400 a nic se neuloží.</summary>
public class ImportException(string message) : Exception(message);
