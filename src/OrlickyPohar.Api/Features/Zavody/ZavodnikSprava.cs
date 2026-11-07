using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Klice;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Co komise vyhlásila, jak to vidí posádka.</summary>
public record PokynDto(string Druh, string Veta, DateTimeOffset VyhlasenoV);

/// <summary>Jak loď eviduje rozhodčí — jedna věta a čas.</summary>
public record StavLodiDto(string Veta, DateTimeOffset? Kdy);

/// <summary>
/// Jeden telefon na lodi.
/// <para>
/// <b>Baterie cizího telefonu tu je schválně.</b> V appce se vlastní
/// nezobrazuje (*„to uživatel vidí na telefonu nativně"*, Filip,
/// 26. 10. 2026), ale o <b>kolegově</b> telefonu se jinak nedozví nikdo —
/// a otázka *„vydrží nám telefony do konce?"* se klade na břehu, kde se
/// s odpovědí dá něco udělat. Posádku drží pohromadě kapitán, který ty
/// klíče vydal.
/// </para>
/// </summary>
public record ClenPosadkyDto(
    string? Jmeno,
    /// <summary>Je to tenhle telefon? Návrh to značí slovem „tvůj".</summary>
    bool Ja,
    int? BaterieProcent,
    DateTimeOffset? OzvalSeV,
    /// <summary>
    /// Vysílá? Počítá server (<c>Klice.Hlaseni.Cerstve</c>), ne obrazovka —
    /// posádka i pořadatel to musí vidět stejně.
    /// </summary>
    bool Vysila);

/// <summary>
/// Celá obrazovka posádky na jeden dotaz.
///
/// <para>
/// <b>Jeden dotaz, ne čtyři.</b> Na vodě je signál drahý a přerušovaný;
/// čtyři volání znamenají čtyři příležitosti, jak skončit s půlkou
/// obrazovky. Tohle je jediné místo, kde se posádka dozví, co o ní
/// zapsal někdo jiný, takže buď dorazí celé, nebo nic.
/// </para>
/// </summary>
public record ZavodnikDto(
    string Serie,
    string Zavod,
    string ZavodNazev,
    string Lod,
    /// <summary>
    /// <b>Jméno kategorie, ne její záznam.</b> Do 7. 11. 2026 tu stála celá
    /// <c>Serial.Kategorie</c>, a s ní i ročník, do kterého patří — tedy
    /// kus modelu navíc na telefon posádky, který z toho četl jediné slovo.
    /// Obrazovka ho navíc vykreslovala jako objekt. Nalezeno při generování
    /// klienta z nasazeného API, kde se ten tvar poprvé ukázal.
    /// </summary>
    string? Kategorie,
    /// <summary>
    /// <b>Plachetní číslo</b> (zbytek R34). Posádka na břehu kontroluje
    /// jedno: že telefon visí u správné lodi — a jméno lodi na to nestačí,
    /// protože dvě *Luny* na Orlíku nejsou nic divného. Číslo na plachtě je
    /// to, čím se loď na vodě pozná, a je to i to, čím se o ní mluví
    /// v zápisu.
    /// </summary>
    string? CisloPlachty,
    /// <summary>
    /// <b>Telefony na lodi</b> (zbytek R34, podle návrhu <c>Zavodnik.dc.html</c>)
    /// — jména, jak je zadal kapitán, protože víc o členech posádky nevíme
    /// a vědět nemáme.
    /// <para>
    /// Není to seznam posádky, je to seznam <b>telefonů</b>: kdo tu nevysílá,
    /// loď na palubě má, jen se jeho telefon nehlásí. Posádka to kontroluje
    /// na břehu, kde se s tím ještě dá něco udělat — na vodě už ne.
    /// </para>
    /// </summary>
    IReadOnlyList<ClenPosadkyDto> Posadka,
    int? Rozjizdka,
    StavRozjizdky? StavRozjizdky,
    DateTimeOffset? StartV,
    /// <summary>
    /// <b>Odkdy si telefon sám zapne nahrávání</b> — T−20, tedy patnáct
    /// minut před procedurou (R3, <c>Klice.Hlaseni</c>). Stojí tu proto, že
    /// to je tatáž rozjížďka a tentýž čas, který obrazovka ukazuje jako
    /// <see cref="StartV"/>; počítat to podruhé v appce by znamenalo druhý
    /// vzorec, který se může rozejít.
    /// </summary>
    DateTimeOffset? NahravatOd,
    StavLodiDto? StavLodi,
    IReadOnlyList<PokynDto> Pokyny);

public class ZavodnikSprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>
    /// <b>Která regata je dneska moje</b> — pro telefon spárovaný klíčem.
    ///
    /// <para>
    /// Bez tohohle by appka musela prohledávat ročníky a hádat, která
    /// regata se týká téhle lodi. Dnem se myslí den, ne okno: regata
    /// trvá od rána a posádka si obrazovku otevře dávno před rozpravou.
    /// </para>
    ///
    /// <para>
    /// <b>Vrací `null`, když dnes loď nikde nejede.</b> To není chyba —
    /// je to většina dnů v roce, a appka na to má vlastní obrazovku.
    /// </para>
    /// </summary>
    public async Task<ZavodnikDto?> DnesAsync(KlicLodi klic, CancellationToken ct)
    {
        if (await DnesniAsync(klic.LodId, ct) is not { } dnesek) return null;
        var (ucast, zavod, rozjizdka) = dnesek;

        return new ZavodnikDto(
            zavod.Serie!.Slug,
            zavod.Slug,
            zavod.Nazev,
            ucast.Prihlaska!.Lod!.Nazev,
            ucast.Prihlaska.Kategorie?.Nazev,
            ucast.Prihlaska.Lod.CisloPlachty,
            await PosadkaAsync(klic, ct),
            rozjizdka?.Cislo,
            rozjizdka?.Stav,
            rozjizdka?.StartV,
            Klice.Hlaseni.NahravatOd(rozjizdka?.StartV),
            rozjizdka is null ? null : await StavLodiAsync(rozjizdka.Id, ucast.Id, ct),
            rozjizdka is null ? [] : await PokynyAsync(rozjizdka.Id, ct));
    }

    /// <summary>
    /// <b>Dnešní regata téhle lodi a rozjížďka, která se jí zrovna týká.</b>
    /// <para>
    /// Odsud čte obrazovka posádky i hlášení telefonu (R3) — <b>jeden dotaz
    /// pro obojí schválně</b>: kdyby si každý hledal rozjížďku po svém,
    /// mohla by obrazovka ukazovat čas jedné a telefon se řídit časem jiné.
    /// </para>
    /// </summary>
    public async Task<(Ucast Ucast, Zavod Zavod, Rozjizdka? Rozjizdka)?> DnesniAsync(
        int lodId, CancellationToken ct)
    {
        var dnes = DateOnly.FromDateTime(cas.GetUtcNow().UtcDateTime);

        var ucast = await db.Ucasti
            .Include(u => u.Zavod!).ThenInclude(z => z.Serie)
            .Include(u => u.Prihlaska!).ThenInclude(p => p.Lod)
            .Where(u => u.Prihlaska!.LodId == lodId
                        && u.Zavod!.Datum <= dnes
                        && (u.Zavod.DatumKonce ?? u.Zavod.Datum) >= dnes
                        && u.Zavod.Stav != StavZavodu.Zruseny)
            .OrderBy(u => u.Zavod!.Datum)
            .FirstOrDefaultAsync(ct);
        if (ucast?.Zavod is null) return null;

        var zavod = ucast.Zavod;

        // Rozjížďka, která se zrovna týká: běžící, jinak nejbližší
        // plánovaná. Dojeté nezajímají — posádka se ptá „co teď".
        var rozjizdka = await db.Rozjizdky
            .Where(r => r.ZavodId == zavod.Id
                        && (r.Stav == StavRozjizdky.Probiha || r.Stav == StavRozjizdky.Planovana))
            .OrderByDescending(r => r.Stav == StavRozjizdky.Probiha)
            .ThenBy(r => r.Cislo)
            .FirstOrDefaultAsync(ct);

        return (ucast, zavod, rozjizdka);
    }

    /// <summary>
    /// Telefony na lodi, v pořadí vydání klíče.
    /// <para>
    /// <b>Klíč bez jména zůstává</b>, jen bezejmenný: *„posádka jen QR,
    /// maximálně jméno, aby se vědělo"* (Filip) — a telefon, který vysílá,
    /// se v počtu musí objevit, i když mu kapitán jméno nenapsal. Vynechat
    /// ho by znamenalo, že *„2 ze 3 vysílají"* sedí jen někdy.
    /// </para>
    /// <para>
    /// <b>Odepnutý klíč tu není.</b> „Dneska nejedu" znamená, že ten telefon
    /// do pole nepatří — a kdyby zůstal, hlásil by se jako chybějící.
    /// </para>
    /// </summary>
    private async Task<IReadOnlyList<ClenPosadkyDto>> PosadkaAsync(
        KlicLodi muj, CancellationToken ct)
    {
        var ted = cas.GetUtcNow();

        return await db.Klice
            .Where(k => k.LodId == muj.LodId && k.OdebranV == null && k.Sleduje)
            .OrderBy(k => k.VydanV)
            .Select(k => new ClenPosadkyDto(
                k.Jmeno,
                k.Id == muj.Id,
                k.BaterieProcent,
                k.PosledniPouzitiV,
                k.PosledniPouzitiV != null
                && ted - k.PosledniPouzitiV.Value <= Klice.Hlaseni.JesteCerstve))
            .ToListAsync(ct);
    }

    /// <summary>
    /// <b>Jak loď eviduje rozhodčí</b>, jednou větou.
    ///
    /// <para>
    /// Pořadí je nejsilnější: kdo dojel, o ničem jiném číst nepotřebuje.
    /// Pak kód (OCS, DNF), pak nevykonaný trest — ten je jediný, se
    /// kterým posádka ještě může něco udělat, takže musí být vidět dřív
    /// než vykonaný.
    /// </para>
    /// </summary>
    private async Task<StavLodiDto?> StavLodiAsync(int rozjizdkaId, int ucastId, CancellationToken ct)
    {
        var v = await db.Vysledky
            .Where(x => x.RozjizdkaId == rozjizdkaId && x.UcastId == ucastId)
            .Select(x => new { x.PoradiVCili, x.Kod, x.DojezdV })
            .FirstOrDefaultAsync(ct);

        if (v?.PoradiVCili is { } misto)
            return new StavLodiDto($"Dojela {misto}.", v.DojezdV);

        if (v?.Kod is { } kod)
            return new StavLodiDto(VetaKodu(kod), v.DojezdV);

        var trest = await db.TrestyZaJizdy
            .Where(t => t.RozjizdkaId == rozjizdkaId && t.UcastId == ucastId)
            .OrderBy(t => t.VykonanoV != null).ThenByDescending(t => t.UlozenoV)
            .Select(t => new { t.Druh, t.UlozenoV, t.VykonanoV })
            .FirstOrDefaultAsync(ct);

        if (trest is not null)
        {
            var otacek = trest.Druh == DruhTrestu.Otacka360 ? "360°" : "720°";
            return new StavLodiDto(
                trest.VykonanoV is null ? $"Trest {otacek} — nevykonán" : $"Trest {otacek} — vykonán",
                trest.VykonanoV ?? trest.UlozenoV);
        }

        var jede = await db.Rozjizdky
            .Where(r => r.Id == rozjizdkaId && r.Stav == StavRozjizdky.Probiha)
            .Select(r => r.StartV)
            .FirstOrDefaultAsync(ct);

        return jede is null ? null : new StavLodiDto("Odstartovala · na trati", jede);
    }

    /// <summary>Co kód znamená pro posádku — ne zkratka, věta.</summary>
    private static string VetaKodu(KodVysledku kod) => kod switch
    {
        KodVysledku.Ocs => "OCS — předčasný start",
        KodVysledku.Dnf => "DNF — nedokončila",
        KodVysledku.Dns => "DNS — nestartovala",
        KodVysledku.Dsq => "DSQ — diskvalifikace",
        KodVysledku.Ret => "Odstoupila",
        _ => kod.ToString().ToUpperInvariant(),
    };

    /// <summary>
    /// <b>Pokyny komise pro běžící rozjížďku.</b> Veřejně, protože
    /// posádka je musí vidět na vodě — dosud žily jen pod `/sprava`.
    /// </summary>
    private async Task<IReadOnlyList<PokynDto>> PokynyAsync(int rozjizdkaId, CancellationToken ct) =>
        await db.UkonyZaJizdy
            .Where(u => u.RozjizdkaId == rozjizdkaId)
            .OrderBy(u => u.VyhlasenoV)
            .Select(u => new PokynDto(
                u.Druh == DruhUkonu.ZmenaUseku ? "ZmenaUseku" : "ChybejiciZnacka",
                u.Druh == DruhUkonu.ZmenaUseku
                    ? "Změna následujícího úseku dráhy"
                    : "Chybějící nebo posunutá značka",
                u.VyhlasenoV))
            .ToListAsync(ct);
}
