using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Klice;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>Co komise vyhlásila, jak to vidí posádka.</summary>
public record PokynDto(string Druh, string Veta, DateTimeOffset VyhlasenoV);

/// <summary>Jak loď eviduje rozhodčí — jedna věta a čas.</summary>
public record StavLodiDto(string Veta, DateTimeOffset? Kdy);

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
    int? Rozjizdka,
    StavRozjizdky? StavRozjizdky,
    DateTimeOffset? StartV,
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
        var dnes = DateOnly.FromDateTime(cas.GetUtcNow().UtcDateTime);

        var ucast = await db.Ucasti
            .Include(u => u.Zavod!).ThenInclude(z => z.Serie)
            .Include(u => u.Prihlaska!).ThenInclude(p => p.Lod)
            .Where(u => u.Prihlaska!.LodId == klic.LodId
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

        return new ZavodnikDto(
            zavod.Serie!.Slug,
            zavod.Slug,
            zavod.Nazev,
            ucast.Prihlaska!.Lod!.Nazev,
            ucast.Prihlaska.Kategorie?.Nazev,
            rozjizdka?.Cislo,
            rozjizdka?.Stav,
            rozjizdka?.StartV,
            rozjizdka is null ? null : await StavLodiAsync(rozjizdka.Id, ucast.Id, ct),
            rozjizdka is null ? [] : await PokynyAsync(rozjizdka.Id, ct));
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
