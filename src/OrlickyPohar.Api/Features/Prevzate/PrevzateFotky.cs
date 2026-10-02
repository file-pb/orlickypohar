using OrlickyPohar.Api.Features.Fotky;

namespace OrlickyPohar.Api.Features.Prevzate;

/// <summary>
/// Fotka přejatého článku <b>u nás</b>, ne odkaz na cizí server
/// (Filip, 2. 10. 2026).
/// <para>
/// <b>Proč kopie, když dřív stačil odkaz:</b> výpadek cizího serveru nemá
/// rozbít náš web, a obrázek, který si přepočítáme, má velikost, kterou
/// stránka doopravdy potřebuje — ne rozmazaný náhled a ne zbytečné dvě
/// stě kilobajtů. Přebírat smíme podle domluvy u zdroje
/// (<see cref="ZdrojKanalu.Souhlas"/>); štítek se zdrojem a odkaz na
/// originál zůstávají.
/// </para>
/// <para>
/// <b>Jakmile článek vypadne z rotace, soubory mizí.</b> Držíme obrázky
/// k osmi článkům na zdroj, ne archiv — mazání jde přes
/// <see cref="Uklid"/>, aby přežilo i zaškobrtnutí úložiště.
/// </para>
/// </summary>
public static class PrevzateFotky
{
    /// <summary>
    /// Pod tuhle šířku se fotka nebere. Velká karta na úvodu má na hustém
    /// displeji přes 1300 skutečných pixelů; 600 px je kompromis mezi
    /// „ostré dost" a „radši něco než nic". Pod tím jsou typicky loga
    /// a ikonky, které zdroj dává do <c>og:image</c>, když fotku nemá —
    /// ty na kartě vypadají hůř než naše náhradní fotka.
    /// </summary>
    public const int NejmensiSirka = 600;

    /// <summary>
    /// Strop na stažený soubor. Fotka z článku bývá do 500 kB; osm MB je
    /// nad tím s rezervou a zároveň to nepustí dovnitř nic, co by položilo
    /// kontejner s 512 MB.
    /// </summary>
    public const long NejvicBajtu = 8 * 1024 * 1024;

    /// <summary>
    /// Klíč v úložišti. <b>Předpona <c>prevzate/</c></b> drží cizí fotky
    /// stranou od našich (<c>fotky/</c>) — jsou to dvě různé věci se dvěma
    /// různými životními cykly a je to vidět i při pohledu do bucketu.
    /// </summary>
    public static string Klic(Guid id, int sirka) => $"prevzate/{id:N}-{sirka}.webp";

    public static IEnumerable<string> Klice(Guid id) =>
        [Klic(id, Nahravani.SirkaNahledu), Klic(id, Nahravani.SirkaVelke)];

    /// <summary>
    /// Adresy, na kterých se fotka zkusí, od nejlepší. Větší varianta podle
    /// zvyklosti zdroje je první, původní <c>og:image</c> druhá — a když
    /// zdroj žádnou zvyklost nemá, zbude jen ta.
    /// </summary>
    public static IReadOnlyList<string> Kandidati(ZdrojKanalu zdroj, string ogImage)
    {
        var vetsi = zdroj.VetsiObrazek?.Invoke(ogImage);
        return vetsi is null || vetsi == ogImage ? [ogImage] : [vetsi, ogImage];
    }
}

/// <summary>Co se o uložené fotce ví: její id v úložišti a rozměry velké varianty.</summary>
public record UlozenaFotka(Guid Id, int Sirka, int Vyska);

/// <summary>
/// Stáhne fotku od zdroje, přepočítá ji na naše varianty a uloží.
/// <para>
/// <b>Nic z toho není důvod, proč by článek neměl vyjít.</b> Když se fotka
/// nepovede, vrací se <c>null</c>, článek se uloží bez ní a web sáhne po
/// náhradní fotce — stejně jako u našeho článku bez obrázku.
/// </para>
/// </summary>
public class StahovacFotek(IUloziste uloziste, ILogger<StahovacFotek> log)
{
    public async Task<UlozenaFotka?> UlozAsync(
        HttpClient klient, ZdrojKanalu zdroj, string ogImage, CancellationToken ct)
    {
        if (!uloziste.Pripraveno) return null;

        foreach (var adresa in PrevzateFotky.Kandidati(zdroj, ogImage))
        {
            var varianty = await ZkusAsync(klient, adresa, ct);
            if (varianty is null) continue;

            // Zpracování nezvětšuje, takže šířka velké varianty je šířka
            // originálu, dokud nepřesáhne naši. Malé obrázky — loga, ikony —
            // tím vypadnou.
            if (varianty.Sirka < PrevzateFotky.NejmensiSirka)
            {
                log.LogInformation(
                    "Fotka {Adresa} má jen {Sirka} px, nechávám ji být", adresa, varianty.Sirka);
                continue;
            }

            var id = Guid.CreateVersion7();
            await uloziste.UlozAsync(
                PrevzateFotky.Klic(id, Nahravani.SirkaNahledu), varianty.Nahled, "image/webp", ct);
            await uloziste.UlozAsync(
                PrevzateFotky.Klic(id, Nahravani.SirkaVelke), varianty.Velky, "image/webp", ct);

            return new UlozenaFotka(id, varianty.Sirka, varianty.Vyska);
        }

        return null;
    }

    /// <summary>Stáhne jednu adresu a přepočítá ji, nebo vrátí <c>null</c>.</summary>
    private async Task<Varianty?> ZkusAsync(HttpClient klient, string adresa, CancellationToken ct)
    {
        try
        {
            using var odpoved = await klient.GetAsync(adresa, HttpCompletionOption.ResponseHeadersRead, ct);
            if (!odpoved.IsSuccessStatusCode)
            {
                log.LogInformation("Fotka {Adresa}: zdroj odpověděl {Stav}", adresa, (int)odpoved.StatusCode);
                return null;
            }

            // Ohlášená délka ušetří stahování; když ji zdroj neposílá,
            // hlídá strop až čtení níž.
            if (odpoved.Content.Headers.ContentLength > PrevzateFotky.NejvicBajtu)
            {
                log.LogInformation("Fotka {Adresa} má přes {Strop} B, neberu ji",
                    adresa, PrevzateFotky.NejvicBajtu);
                return null;
            }

            await using var proud = await odpoved.Content.ReadAsStreamAsync(ct);
            using var pamet = new MemoryStream();
            // Strop i na nedeklarovanou délku: čte se o bajt víc, a když
            // ho stream má, je soubor nad limitem.
            var buffer = new byte[81920];
            long celkem = 0;
            int precteno;
            while ((precteno = await proud.ReadAsync(buffer, ct)) > 0)
            {
                celkem += precteno;
                if (celkem > PrevzateFotky.NejvicBajtu)
                {
                    log.LogInformation("Fotka {Adresa} přesáhla strop při stahování", adresa);
                    return null;
                }

                await pamet.WriteAsync(buffer.AsMemory(0, precteno), ct);
            }

            pamet.Position = 0;
            // Tentýž přepočet jako u nahraných fotek: WebP ve dvou
            // velikostech a pryč s metadaty, včetně polohy v EXIF.
            var (varianty, chyba) = await Zpracovani.ZpracujAsync(pamet, ct);
            if (varianty is null)
                log.LogInformation("Fotka {Adresa} se nedá zpracovat: {Chyba}", adresa, chyba);

            return varianty;
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            log.LogInformation(e, "Fotku {Adresa} se nepovedlo stáhnout", adresa);
            return null;
        }
    }
}
