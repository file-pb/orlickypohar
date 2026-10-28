using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;

namespace OrlickyPohar.Api.Features.Oponentura;

/// <summary>
/// Sady otázek pro oponenturu: výpis se stavem, detail s odpověďmi, zápis
/// odpovědi a hlasová nahrávka.
/// <para>
/// <b>Stav se počítá, neukládá se</b> — kromě uzavření sady, které spočítat
/// nejde (<see cref="VyplneniSady"/>). Dva zdroje pravdy o tom, kolik otázek
/// je odpovězených, by se rozešly při první smazané nahrávce.
/// </para>
/// <para>
/// <b>Odpovědi se nerozlišují podle člověka ve výpisu.</b> Sadu dostane
/// rozhodčí a vyplní ji on; čte ji on i pořadatel. Kdyby na jednu sadu
/// odpovídali dva, stav by se počítal ze všeho dohromady a u každé odpovědi
/// je vidět, kdo ji dal — to stačí. Vyplnění je ale vedené po lidech, aby
/// „mám to" jednoho neuzavřelo sadu druhému.
/// </para>
/// </summary>
public class OponenturaSprava(
    AppDbContext db, IUloziste uloziste, TimeProvider cas, ILogger<OponenturaSprava> log)
{
    public bool Pripraveno => uloziste.Pripraveno;

    /// <summary>
    /// Sady ročníku s počty a stavem, v pořadí podle <c>Poradi</c>.
    /// <para>
    /// <b>Počítá se v paměti, ne v dotazu.</b> Sad je pár a otázek v nich
    /// desítky, takže tři dotazy a sečtení jsou levnější než poddotaz na
    /// každý počet — a hlavně je vidět, co se počítá: otázka s volbou
    /// <i>i</i> nahrávkou se nesmí počítat dvakrát.
    /// </para>
    /// </summary>
    public async Task<List<SadaShrnutiDto>> SeznamAsync(
        int serieId, Guid kdo, CancellationToken ct)
    {
        var sady = await db.Sady
            .Include(s => s.Otazky)
            .Where(s => s.SerieId == serieId)
            .OrderBy(s => s.Poradi).ThenBy(s => s.Id)
            .ToListAsync(ct);
        if (sady.Count == 0) return [];

        var ids = sady.SelectMany(s => s.Otazky).Select(o => o.Id).ToList();

        var odpovedi = await db.OponenturaOdpovedi
            .Where(o => ids.Contains(o.OtazkaId))
            .Select(o => new { o.OtazkaId, o.Volby, o.Text, o.ZmenenoV })
            .ToListAsync(ct);

        var nahravky = await db.HlasoveOdpovedi
            .Where(h => ids.Contains(h.OtazkaId))
            .Select(h => new { h.OtazkaId, h.NahranoV })
            .ToListAsync(ct);

        var dokoncene = await db.Vyplneni
            .Where(v => v.KdoId == kdo && v.Sada!.SerieId == serieId)
            .Select(v => new { v.SadaId, v.DokonceneV })
            .ToListAsync(ct);

        return
        [
            .. sady.Select(s =>
            {
                var sveOtazky = s.Otazky.Select(o => o.Id).ToHashSet();
                var sveOdpovedi = odpovedi.Where(o => sveOtazky.Contains(o.OtazkaId)).ToList();
                var sveNahravky = nahravky.Where(h => sveOtazky.Contains(h.OtazkaId)).ToList();

                var sText = sveOdpovedi
                    .Where(o => o.Volby.Count > 0 || !string.IsNullOrWhiteSpace(o.Text))
                    .Select(o => o.OtazkaId);
                var odpovezeno = sText.Concat(sveNahravky.Select(h => h.OtazkaId))
                    .Distinct()
                    .Count();

                var dokonceneV = dokoncene
                    .FirstOrDefault(d => d.SadaId == s.Id)?.DokonceneV;

                return new SadaShrnutiDto(
                    s.Slug, s.Nazev, s.Uvod, s.Otazky.Count, odpovezeno, sveNahravky.Count,
                    Dotazovani.Stav(odpovezeno, dokonceneV), dokonceneV,
                    Pozdejsi(
                        sveOdpovedi.Count == 0 ? null : sveOdpovedi.Max(o => o.ZmenenoV),
                        sveNahravky.Count == 0 ? null : sveNahravky.Max(h => h.NahranoV)));
            }),
        ];
    }

    private static DateTimeOffset? Pozdejsi(DateTimeOffset? a, DateTimeOffset? b) =>
        a is null ? b : b is null ? a : a > b ? a : b;

    /// <summary>
    /// Sada i s odpověďmi, nebo <c>null</c>, když v ročníku není.
    /// <para>
    /// Odpovědi jsou <b>všechny</b>, ne jen moje: pořadatel sadu čte a má
    /// vidět, co rozhodčí odpověděl. U každé otázky je nejnovější odpověď
    /// a všechny její nahrávky.
    /// </para>
    /// </summary>
    public async Task<SadaDetailDto?> DetailAsync(
        int serieId, string serie, string slug, Guid kdo, CancellationToken ct)
    {
        var sada = await db.Sady
            .Include(s => s.Otazky)
            .FirstOrDefaultAsync(s => s.SerieId == serieId && s.Slug == slug, ct);
        if (sada is null) return null;

        var otazky = sada.Otazky.OrderBy(o => o.Poradi).ThenBy(o => o.Id).ToList();
        var ids = otazky.Select(o => o.Id).ToList();

        var odpovedi = await db.OponenturaOdpovedi
            .Where(o => ids.Contains(o.OtazkaId))
            .OrderByDescending(o => o.ZmenenoV)
            .ToListAsync(ct);

        var nahravky = await db.HlasoveOdpovedi
            .Include(h => h.Kdo)
            .Where(h => ids.Contains(h.OtazkaId))
            .OrderBy(h => h.NahranoV)
            .ToListAsync(ct);

        var dokonceneV = await db.Vyplneni
            .Where(v => v.SadaId == sada.Id && v.KdoId == kdo)
            .Select(v => v.DokonceneV)
            .FirstOrDefaultAsync(ct);

        var vysledek = otazky.Select(o =>
        {
            var odpoved = odpovedi.FirstOrDefault(od => od.OtazkaId == o.Id);
            var mojeNahravky = nahravky
                .Where(h => h.OtazkaId == o.Id)
                .Select(h => new NahravkaDto(
                    h.Id, Dotazovani.Adresa(serie, sada.Slug, h.Id),
                    h.Typ, h.Velikost, h.Sekund, h.NahranoV, h.Kdo?.Zobrazovane))
                .ToList();

            return new OtazkaDto(
                o.Kod, o.Text, o.Vysvetleni, o.Uvolni, o.Volby, o.VolbyVice,
                odpoved?.Volby ?? [], odpoved?.Text, odpoved?.ZmenenoV, mojeNahravky);
        }).ToList();

        var odpovezeno = vysledek.Count(o =>
            o.Zaskrtnuto.Count > 0 || !string.IsNullOrWhiteSpace(o.Odpoved) || o.Nahravky.Count > 0);

        return new SadaDetailDto(
            sada.Slug, sada.Nazev, sada.Uvod,
            Dotazovani.Stav(odpovezeno, dokonceneV), dokonceneV, vysledek);
    }

    /// <summary>
    /// Zapíše odpověď na otázku. <b>Jedna odpověď na otázku a člověka</b>,
    /// přepisuje se — zaškrtnutí a text jsou poslední stav, ne historie.
    /// Hlas je naopak aditivní, viz <see cref="NahrajAsync"/>.
    /// </summary>
    public async Task<string?> OdpovezAsync(
        int serieId, string slug, string kodOtazky, OdpovedVstup vstup, Guid kdo,
        CancellationToken ct)
    {
        var otazka = await NajdiOtazkuAsync(serieId, slug, kodOtazky, ct);
        if (otazka is null) return "Takovou otázku tahle sada nemá.";

        if (Dotazovani.ProcNejdeOdpovedet(otazka, vstup) is { } chyba) return chyba;

        var ted = cas.GetUtcNow();
        var odpoved = await db.OponenturaOdpovedi
            .FirstOrDefaultAsync(o => o.OtazkaId == otazka.Id && o.KdoId == kdo, ct);

        if (odpoved is null)
        {
            odpoved = new OdpovedNaOtazku
            {
                OtazkaId = otazka.Id, KdoId = kdo, VytvorenoV = ted, ZmenenoV = ted,
            };
            db.OponenturaOdpovedi.Add(odpoved);
        }

        odpoved.Volby = vstup.Volby ?? [];
        odpoved.Text = string.IsNullOrWhiteSpace(vstup.Text) ? null : vstup.Text.Trim();
        odpoved.ZmenenoV = ted;

        // Odpověď po uzavření sadu zase otevře: kdo se vrátil a něco dořekl,
        // už „nemá to" — a Filip by jinak nepoznal, že přišlo něco nového.
        await OtevriZnovuAsync(otazka.SadaId, kdo, ct);

        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Uloží hlasovou odpověď. Vrací chybu, nebo hotovou nahrávku.
    /// <para>
    /// <b>Pořadí kroků: nejdřív soubor, pak záznam</b>, stejně jako u
    /// směrnice. Selže-li zápis do databáze, soubor se uklidí — opačné
    /// pořadí by nechalo v seznamu odpověď, pod kterou nic nehraje.
    /// </para>
    /// </summary>
    public async Task<(NahravkaDto? Nahravka, string? Chyba)> NahrajAsync(
        int serieId, string serie, string slug, string kodOtazky,
        byte[] data, int? sekund, Guid kdo, CancellationToken ct)
    {
        if (!uloziste.Pripraveno) return (null, Dotazovani.Vypnuto);

        var otazka = await NajdiOtazkuAsync(serieId, slug, kodOtazky, ct);
        if (otazka is null) return (null, "Takovou otázku tahle sada nemá.");

        if (Dotazovani.ProcNejdeNahrat(data.LongLength) is { } chyba) return (null, chyba);

        // Obsah, ne typ z prohlížeče: ten jen tvrdí, co posílá.
        if (Dotazovani.PoznejZvuk(data) is not { } typ) return (null, Dotazovani.NeniZvuk);

        var nahravka = new HlasovaOdpoved
        {
            Id = Guid.CreateVersion7(),
            OtazkaId = otazka.Id,
            KdoId = kdo,
            Typ = typ,
            Velikost = data.LongLength,
            // Nula i záporné číslo z prohlížeče je nevědomost, ne délka.
            Sekund = sekund > 0 ? sekund : null,
            NahranoV = cas.GetUtcNow(),
        };

        var klic = Dotazovani.Klic(nahravka.Id, typ);
        await uloziste.UlozAsync(klic, data, typ, ct, Dotazovani.Cache);

        try
        {
            db.HlasoveOdpovedi.Add(nahravka);
            await OtevriZnovuAsync(otazka.SadaId, kdo, ct);
            await db.SaveChangesAsync(ct);
        }
        catch
        {
            // Záznam nevznikl, takže na soubor nic neukazuje. Úklid je
            // součást téhle chyby, ne pozdější starost.
            try
            {
                await uloziste.SmazAsync(klic, ct);
            }
            catch (Exception e)
            {
                log.LogWarning(e, "Nepovedlo se uklidit nahrávku {Id}", nahravka.Id);
            }

            throw;
        }

        return (new NahravkaDto(
            nahravka.Id, Dotazovani.Adresa(serie, slug, nahravka.Id), typ,
            nahravka.Velikost, nahravka.Sekund, nahravka.NahranoV, null), null);
    }

    /// <summary>
    /// Obsah nahrávky, nebo <c>null</c>, když v téhle sadě není.
    /// <para>
    /// <b>Čte se přes API, ne z veřejné adresy úložiště.</b> Hlas rozhodčího
    /// k neuzavřenému rozhodnutí není určený ven — a veřejná adresa by
    /// platila napořád, i kdyby odkaz unikl z transkriptu.
    /// </para>
    /// </summary>
    public async Task<(Stream Obsah, string Typ)?> NahravkaAsync(
        int serieId, string slug, Guid id, CancellationToken ct)
    {
        var nahravka = await db.HlasoveOdpovedi
            .Where(h => h.Id == id
                && h.Otazka!.Sada!.Slug == slug && h.Otazka.Sada.SerieId == serieId)
            .Select(h => new { h.Typ, h.Id })
            .FirstOrDefaultAsync(ct);
        if (nahravka is null) return null;
        if (!uloziste.Pripraveno) return null;

        var obsah = await uloziste.CtiAsync(Dotazovani.Klic(nahravka.Id, nahravka.Typ), ct);
        return obsah is null ? null : (obsah, nahravka.Typ);
    }

    /// <summary>
    /// Smaže nahrávku — zmáčknutý mikrofon omylem se musí dát vzít zpět.
    /// Klíč jde <b>v téže transakci</b> do fronty úklidu, takže zaškobrtnutí
    /// R2 soubor v bucketu nezapomene.
    /// </summary>
    public async Task<string?> SmazNahravkuAsync(
        int serieId, string slug, Guid id, CancellationToken ct)
    {
        var nahravka = await db.HlasoveOdpovedi
            .FirstOrDefaultAsync(h => h.Id == id
                && h.Otazka!.Sada!.Slug == slug && h.Otazka.Sada.SerieId == serieId, ct);
        if (nahravka is null) return "Takovou nahrávku tahle sada nemá.";

        var klic = Dotazovani.Klic(nahravka.Id, nahravka.Typ);
        db.HlasoveOdpovedi.Remove(nahravka);
        Uklid.Zarad(db, [klic], cas.GetUtcNow());
        await db.SaveChangesAsync(ct);

        log.LogInformation("Hlasová odpověď {Id} smazaná", id);
        return null;
    }

    /// <summary>
    /// Uzavře sadu, nebo ji otevře zpátky. <c>true</c> znamená „mám to".
    /// </summary>
    public async Task<string?> DokonciAsync(
        int serieId, string slug, bool hotovo, Guid kdo, CancellationToken ct)
    {
        var sadaId = await db.Sady
            .Where(s => s.SerieId == serieId && s.Slug == slug)
            .Select(s => (int?)s.Id)
            .FirstOrDefaultAsync(ct);
        if (sadaId is null) return "Takovou sadu tenhle ročník nemá.";

        var vyplneni = await db.Vyplneni
            .FirstOrDefaultAsync(v => v.SadaId == sadaId && v.KdoId == kdo, ct);

        if (vyplneni is null)
        {
            vyplneni = new VyplneniSady { SadaId = sadaId.Value, KdoId = kdo };
            db.Vyplneni.Add(vyplneni);
        }

        vyplneni.DokonceneV = hotovo ? cas.GetUtcNow() : null;
        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Založí sadu, nebo doplní tu, která pod tímhle slugem už je.
    /// <para>
    /// <b>Idempotentní podle přirozených klíčů</b>, jako import ročníku:
    /// sada podle slugu, otázka podle kódu v sadě. Druhé odeslání téhož
    /// JSONu nic nezduplikuje a <b>nic nemaže</b> — otázka, která v souboru
    /// chybí, v sadě zůstane, protože na ní mohou být odpovědi. Takhle se
    /// přidá další sada i další otázka bez nasazení.
    /// </para>
    /// </summary>
    public async Task<(string Slug, int Pridano, int Zmeneno)> ZalozAsync(
        int serieId, SadaVstup vstup, CancellationToken ct)
    {
        var sada = await db.Sady
            .Include(s => s.Otazky)
            .FirstOrDefaultAsync(s => s.SerieId == serieId && s.Slug == vstup.Slug, ct);

        if (sada is null)
        {
            sada = new SadaOtazek
            {
                SerieId = serieId,
                Slug = vstup.Slug.Trim(),
                Nazev = vstup.Nazev.Trim(),
                Uvod = vstup.Uvod.Trim(),
                Poradi = vstup.Poradi,
                VytvorenoV = cas.GetUtcNow(),
            };
            db.Sady.Add(sada);
        }
        else
        {
            sada.Nazev = vstup.Nazev.Trim();
            sada.Uvod = vstup.Uvod.Trim();
            sada.Poradi = vstup.Poradi;
        }

        var pridano = 0;
        var zmeneno = 0;
        var poradi = 0;

        foreach (var o in vstup.Otazky)
        {
            poradi++;
            var kod = o.Kod.Trim();
            var otazka = sada.Otazky.FirstOrDefault(x => x.Kod == kod);

            if (otazka is null)
            {
                otazka = new OtazkaSady { SadaId = sada.Id, Kod = kod, Text = "" };
                sada.Otazky.Add(otazka);
                pridano++;
            }
            else
            {
                zmeneno++;
            }

            otazka.Poradi = poradi;
            otazka.Text = o.Text.Trim();
            otazka.Vysvetleni = Prazdne(o.Vysvetleni);
            otazka.Uvolni = Prazdne(o.Uvolni);
            otazka.VolbyVice = o.VolbyVice;
            otazka.Volby = o.Volby ?? [];
        }

        await db.SaveChangesAsync(ct);
        log.LogInformation(
            "Sada otázek {Slug} v ročníku {Serie}: {Pridano} nových otázek, {Zmeneno} aktualizovaných",
            sada.Slug, serieId, pridano, zmeneno);

        return (sada.Slug, pridano, zmeneno);
    }

    private static string? Prazdne(string? text) =>
        string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    private Task<OtazkaSady?> NajdiOtazkuAsync(
        int serieId, string slug, string kod, CancellationToken ct) =>
        db.Otazky.FirstOrDefaultAsync(
            o => o.Kod == kod && o.Sada!.Slug == slug && o.Sada.SerieId == serieId, ct);

    /// <summary>
    /// Zruší uzavření sady. <b>Neukládá</b> — volající to dělá v téže
    /// transakci jako zápis odpovědi.
    /// </summary>
    private async Task OtevriZnovuAsync(int sadaId, Guid kdo, CancellationToken ct)
    {
        var vyplneni = await db.Vyplneni
            .FirstOrDefaultAsync(v => v.SadaId == sadaId && v.KdoId == kdo, ct);
        if (vyplneni is not null) vyplneni.DokonceneV = null;
    }
}
