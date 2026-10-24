using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Klice;
using OrlickyPohar.Api.Features.Okna;

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
/// <param name="Regata">Jméno regaty, jak ho zadala posádka. Volný text.</param>
/// <param name="ZavodId">
/// Regata, ke které server trasu přiřadil podle běžícího okna. Tohle je ta
/// vazba, která platí — jméno výš je jen to, co kdo napsal.
/// </param>
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
    long? PosledniBod,
    int? ZavodId = null);

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
public class TrasySprava(AppDbContext db, TimeProvider cas, OknaSprava okna)
{
    /// <summary>
    /// Co se řekne telefonu, který chce zaznamenávat mimo okno regaty.
    /// Hláška je pro člověka na palubě, ne pro protokol.
    /// </summary>
    public const string MimoOkno =
        "Teď neběží žádné okno regaty, ve které je tahle loď přihlášená. "
        + "Záznam se smí nahrávat od rozpravy do uzavření závodního dne.";

    /// <summary>
    /// Založí trasu, nebo vrátí tu, která už pod tímtéž identifikátorem
    /// existuje. Volá se před první dávkou a smí se zavolat kolikrát chce.
    /// <para>
    /// <b>Bez běžícího okna regaty trasa nevznikne.</b> Záznam smí běžet,
    /// jen když je loď v té regatě přihlášená a běží její okno — jinak by
    /// z trackeru bylo sledovací zařízení, které zaznamená cestu přes
    /// hospodu domů. Už založená trasa se tím neuzavírá: <b>doposílat jde
    /// i po uzavření dne</b>, protože výpadek sítě na vodě je normál, ne
    /// porucha.
    /// </para>
    /// </summary>
    public async Task<(TrasaDto? Trasa, string? Chyba)> ZalozAsync(
        KlicLodi klic, ZalozTrasuVstup vstup, CancellationToken ct)
    {
        var trasa = await db.Trasy
            .FirstOrDefaultAsync(t => t.KlicId == klic.Id && t.LokalniId == vstup.LokalniId, ct);

        if (trasa is null)
        {
            var ted = cas.GetUtcNow();
            var zacatek = vstup.Zacatek.ToUniversalTime();

            // Okno se hledá nejdřív k začátku záznamu, teprve pak k teď.
            // Pořadí je schválně takové: záznam patří tomu dni, ve kterém
            // začal, a telefon ho smí založit se zpožděním, až chytí signál.
            // Hodiny telefonu se ale dají přestavit, takže „teď" je záchrana
            // pro případ, kdy se rozešly — jinak by loď, která skutečně jede
            // v okně, přišla o celý záznam kvůli špatně nastavenému času.
            var okno = await okna.ProLodAsync(klic.LodId, zacatek, ct)
                       ?? await okna.ProLodAsync(klic.LodId, ted, ct);

            if (okno is null) return (null, MimoOkno);

            trasa = new Trasa
            {
                ZavodId = okno.ZavodId,
                OknoId = okno.Id,
                LokalniId = vstup.LokalniId,
                KlicId = klic.Id,
                LodId = klic.LodId,
                LodNazev = vstup.Lod.Trim(),
                RegataNazev = string.IsNullOrWhiteSpace(vstup.Regata) ? null : vstup.Regata.Trim(),
                Zdroj = vstup.Zdroj,
                Zacatek = zacatek,
                NahranoV = ted,
                PosledniDavkaV = ted,
                // Posun se měří jednou, při založení: jak dalece se hodiny
                // telefonu rozešly s našimi v okamžiku, kdy záznam začal.
                // Ukládá se, nezahlazuje — viz Trasa.PosunMs.
                PosunMs = (long)(ted - zacatek).TotalMilliseconds,
            };
            db.Trasy.Add(trasa);
            await db.SaveChangesAsync(ct);
        }

        return (await DtoAsync(trasa, ct), null);
    }

    /// <summary>
    /// Přijme dávku bodů. Body, které už pod svým pořadovým číslem existují,
    /// se přeskočí — opakované poslání dávky tedy nic nezdvojí.
    /// </summary>
    public async Task<DavkaDto?> PridejAsync(
        KlicLodi klic, string lokalniId, IReadOnlyList<BodVstup> body, CancellationToken ct)
    {
        var trasa = await db.Trasy
            .FirstOrDefaultAsync(t => t.KlicId == klic.Id && t.LokalniId == lokalniId, ct);
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
        KlicLodi klic, string lokalniId, DateTimeOffset? konec, CancellationToken ct)
    {
        var trasa = await db.Trasy
            .FirstOrDefaultAsync(t => t.KlicId == klic.Id && t.LokalniId == lokalniId, ct);
        if (trasa is null) return null;

        trasa.Dokoncena = true;
        trasa.Konec = konec?.ToUniversalTime() ?? trasa.Konec;
        await db.SaveChangesAsync(ct);
        return await DtoAsync(trasa, ct);
    }

    public async Task<List<TrasaDto>> MojeAsync(KlicLodi klic, CancellationToken ct)
    {
        var trasy = await db.Trasy
            .Where(t => t.KlicId == klic.Id)
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
            pocet, t.PosunMs, t.Dokoncena, posledni, t.ZavodId);
    }
}
