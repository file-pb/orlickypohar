using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Trasy;

/// <summary>Co telefon posílá při zakládání trasy.</summary>
public record ZalozTrasuVstup(
    string LokalniId,
    string Lod,
    string? Regata,
    ZdrojTrasy Zdroj,
    DateTimeOffset Zacatek);

/// <summary>Jeden bod v dávce. Časy posílá telefon tak, jak je naměřil.</summary>
public record BodVstup(
    long LokalniId,
    double Sirka,
    double Delka,
    double? PresnostM,
    double? RychlostMS,
    double? Kurz,
    double? VyskaM,
    DateTimeOffset CasGps,
    DateTimeOffset CasZarizeni,
    bool Podvrzeny);

/// <summary>Trasa tak, jak ji vidí ten, kdo ji nahrál.</summary>
public record TrasaDto(
    string LokalniId,
    string Lod,
    string? Regata,
    ZdrojTrasy Zdroj,
    DateTimeOffset Zacatek,
    DateTimeOffset? Konec,
    int PocetBodu,
    long? PosunMs,
    bool Dokoncena,
    long? PosledniBod);

/// <summary>
/// Kolik bodů z dávky bylo nových. Telefon podle toho pozná, že se dávka
/// přijala — a že opakované poslání nic nezdvojilo.
/// </summary>
public record DavkaDto(int Prijato, int Preskoceno, long? PosledniBod);

/// <summary>
/// Nahrávání tras z telefonu.
/// <para>
/// <b>Všechno je idempotentní.</b> Na vodě signál padá a dávka se bude
/// posílat znovu; z toho plyne celý návrh. Trasa se pozná podle
/// identifikátoru z telefonu, bod podle pořadového čísla v rámci trasy.
/// Opakované nahrání téže dávky tedy nic nezdvojí ani nepřepíše — to je
/// přejímací podmínka č. 3, *„žádné duplicity ani ztracený potvrzený
/// úsek"*.
/// </para>
/// <para>
/// <b>Trasa zůstává rozdělaná, dokud ji posádka neuzavře.</b> Doposlat jde
/// kdykoli, i po restartu appky — přejímací podmínka č. 4.
/// </para>
/// </summary>
public class TrasySprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>
    /// Založí trasu, nebo vrátí tu, která už pod tímtéž identifikátorem
    /// existuje. Volá se před první dávkou a smí se zavolat kolikrát chce.
    /// </summary>
    public async Task<TrasaDto> ZalozAsync(
        Guid uzivatel, ZalozTrasuVstup vstup, CancellationToken ct)
    {
        var trasa = await db.Trasy
            .FirstOrDefaultAsync(t => t.UzivatelId == uzivatel && t.LokalniId == vstup.LokalniId, ct);

        if (trasa is null)
        {
            var ted = cas.GetUtcNow();
            trasa = new Trasa
            {
                LokalniId = vstup.LokalniId,
                UzivatelId = uzivatel,
                LodNazev = vstup.Lod.Trim(),
                RegataNazev = string.IsNullOrWhiteSpace(vstup.Regata) ? null : vstup.Regata.Trim(),
                Zdroj = vstup.Zdroj,
                Zacatek = vstup.Zacatek.ToUniversalTime(),
                NahranoV = ted,
                PosledniDavkaV = ted,
                // Posun se měří jednou, při založení: jak dalece se hodiny
                // telefonu rozešly s našimi v okamžiku, kdy záznam začal.
                // Ukládá se, nezahlazuje — viz Trasa.PosunMs.
                PosunMs = (long)(ted - vstup.Zacatek.ToUniversalTime()).TotalMilliseconds,
            };
            db.Trasy.Add(trasa);
            await db.SaveChangesAsync(ct);
        }

        return await DtoAsync(trasa, ct);
    }

    /// <summary>
    /// Přijme dávku bodů. Body, které už pod svým pořadovým číslem existují,
    /// se přeskočí — opakované poslání dávky tedy nic nezdvojí.
    /// </summary>
    public async Task<DavkaDto?> PridejAsync(
        Guid uzivatel, string lokalniId, IReadOnlyList<BodVstup> body, CancellationToken ct)
    {
        var trasa = await db.Trasy
            .FirstOrDefaultAsync(t => t.UzivatelId == uzivatel && t.LokalniId == lokalniId, ct);
        if (trasa is null) return null;

        var prichozi = body.Select(b => b.LokalniId).ToHashSet();
        var jiztam = await db.TrasaBody
            .Where(b => b.TrasaId == trasa.Id && prichozi.Contains(b.LokalniId))
            .Select(b => b.LokalniId)
            .ToHashSetAsync(ct);

        var nove = body
            .Where(b => !jiztam.Contains(b.LokalniId))
            // Tatáž dávka může nést týž bod dvakrát, když si ho telefon
            // zopakoval při opravě fronty; bereme první.
            .GroupBy(b => b.LokalniId)
            .Select(g => g.First())
            .Select(b => new TrasaBod
            {
                TrasaId = trasa.Id,
                LokalniId = b.LokalniId,
                Sirka = b.Sirka,
                Delka = b.Delka,
                PresnostM = b.PresnostM,
                RychlostMS = b.RychlostMS,
                Kurz = b.Kurz,
                VyskaM = b.VyskaM,
                CasGps = b.CasGps.ToUniversalTime(),
                CasZarizeni = b.CasZarizeni.ToUniversalTime(),
                Podvrzeny = b.Podvrzeny,
            })
            .ToList();

        if (nove.Count > 0) db.TrasaBody.AddRange(nove);
        trasa.PosledniDavkaV = cas.GetUtcNow();
        await db.SaveChangesAsync(ct);

        var posledni = await db.TrasaBody
            .Where(b => b.TrasaId == trasa.Id)
            .MaxAsync(b => (long?)b.LokalniId, ct);

        return new DavkaDto(nove.Count, body.Count - nove.Count, posledni);
    }

    /// <summary>
    /// Uzavře nahrávání. Do té doby je trasa rozdělaná a smí se doposílat.
    /// </summary>
    public async Task<TrasaDto?> DokonciAsync(
        Guid uzivatel, string lokalniId, DateTimeOffset? konec, CancellationToken ct)
    {
        var trasa = await db.Trasy
            .FirstOrDefaultAsync(t => t.UzivatelId == uzivatel && t.LokalniId == lokalniId, ct);
        if (trasa is null) return null;

        trasa.Dokoncena = true;
        trasa.Konec = konec?.ToUniversalTime() ?? trasa.Konec;
        await db.SaveChangesAsync(ct);
        return await DtoAsync(trasa, ct);
    }

    public async Task<List<TrasaDto>> MojeAsync(Guid uzivatel, CancellationToken ct)
    {
        var trasy = await db.Trasy
            .Where(t => t.UzivatelId == uzivatel)
            .OrderByDescending(t => t.Zacatek)
            .ToListAsync(ct);

        var vysledek = new List<TrasaDto>(trasy.Count);
        foreach (var t in trasy) vysledek.Add(await DtoAsync(t, ct));
        return vysledek;
    }

    private async Task<TrasaDto> DtoAsync(Trasa t, CancellationToken ct)
    {
        var pocet = await db.TrasaBody.CountAsync(b => b.TrasaId == t.Id, ct);
        var posledni = await db.TrasaBody
            .Where(b => b.TrasaId == t.Id)
            .MaxAsync(b => (long?)b.LokalniId, ct);

        return new TrasaDto(
            t.LokalniId, t.LodNazev, t.RegataNazev, t.Zdroj, t.Zacatek, t.Konec,
            pocet, t.PosunMs, t.Dokoncena, posledni);
    }
}
