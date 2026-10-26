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
    /// Od téhle plochosti (<see cref="Fotky.Varianty.Plochost"/>) se obrázek
    /// bere jako nápis nebo logo, ne jako fotka.
    /// <para>
    /// <b>Práh je změřený, ne odhadnutý.</b> Na 22 článcích svazu, kde
    /// <c>og:image</c> leží volně v knihovně (26. 10. 2026), mají nápisy
    /// 0,82 až 0,94 a fotky nejvýš 0,66 — mezi tím je mezera a práh sedí
    /// v ní. Jediný nápis pod prahem je banner <c>2000x700px.jpg</c> (0,31),
    /// který fotku obsahuje, takže na kartě vypadá dobře.
    /// </para>
    /// <para>
    /// <b>Neplatí to obecně</b>, jen tady: mezi fotkami od zdroje samého se
    /// nad práh dostanou tři ze šedesáti (fotka na bílém pozadí). Proto se
    /// podle plochosti nikdy nezahazuje — jen se dá přednost obrázku ze
    /// složky článku, a ten je v takovém případě skoro vždycky tatáž fotka.
    /// </para>
    /// </summary>
    public const double NejvicPlochy = 0.75;

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
/// Jak dopadl pokus o fotku. <b>Rozlišuje „nepovedlo se" a „nestojí za to"</b>:
/// když cizí server neodpoví, adresa u zdroje platí dál a web ji použije;
/// když zdroj místo fotky dal logo nebo ikonku, zahodí se i ta adresa a karta
/// dostane naši náhradní fotku. Logo s nápisem přes celou kartu vypadá hůř
/// než fotka lodi (Filip, 2. 10. 2026).
/// </summary>
/// <param name="Fotka">Naše kopie, když se povedla.</param>
/// <param name="Nepouzitelna">
/// Obrázek se podařilo stáhnout, ale na kartu se nehodí — je menší než
/// <see cref="PrevzateFotky.NejmensiSirka"/>, nebo to není obrázek.
/// </param>
/// <param name="Adresa">
/// Adresa, ze které kopie opravdu je. Liší se od <c>og:image</c>, když zdroj
/// dal do hlavičky plochou grafiku a fotka k článku ležela v jeho složce —
/// a web ji musí znát, aby po výpadku našeho úložiště ukázal tutéž věc.
/// </param>
public record VysledekFotky(UlozenaFotka? Fotka, bool Nepouzitelna, string? Adresa = null);

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
    public async Task<VysledekFotky> UlozAsync(
        HttpClient klient, ZdrojKanalu zdroj, string ogImage, string? vlastni,
        CancellationToken ct)
    {
        if (!uloziste.Pripraveno) return new VysledekFotky(null, false);

        // Logo nebo ikonka místo fotky: pozná se podle adresy, ne podle
        // velikosti — logo svazu má v originále 711 × 800 px a prahem by
        // prošlo. Zahodí se i adresa u zdroje, karta dostane náhradní fotku.
        if (zdroj.NeniFotka?.Invoke(ogImage) == true)
        {
            log.LogInformation("Obrázek {Adresa} je u zdroje logo, fotku nehledám", ogImage);
            return new VysledekFotky(null, true);
        }

        var (varianty, nepouzitelna) = await NejlepsiAsync(klient, zdroj, ogImage, ct);
        var adresa = ogImage;

        // Nápis místo fotky: zdroj dal do hlavičky plochou grafiku ze své
        // knihovny, ale k článku nahrál vlastní obrázek. Ten je skoro vždycky
        // to, co čtenář na kartě čeká — u „Mistrovství ČR na moři" je
        // v hlavičce samotný nápis, kdežto ve složce článku celý plakát
        // s lodí (Filip, 26. 10. 2026).
        if (varianty is { } grafika && grafika.Plochost >= PrevzateFotky.NejvicPlochy
            && vlastni is not null && vlastni != ogImage)
        {
            var (zeSlozky, _) = await NejlepsiAsync(klient, zdroj, vlastni, ct);
            if (zeSlozky is not null)
            {
                log.LogInformation(
                    "Obrázek {Adresa} je plochý ({Plochost:P0}), beru obrázek ze složky článku {Vlastni}",
                    ogImage, grafika.Plochost, vlastni);
                (varianty, adresa) = (zeSlozky, vlastni);
            }
        }

        if (varianty is null) return new VysledekFotky(null, nepouzitelna);

        var id = Guid.CreateVersion7();
        await uloziste.UlozAsync(
            PrevzateFotky.Klic(id, Nahravani.SirkaNahledu), varianty.Nahled, "image/webp", ct);
        await uloziste.UlozAsync(
            PrevzateFotky.Klic(id, Nahravani.SirkaVelke), varianty.Velky, "image/webp", ct);

        return new VysledekFotky(
            new UlozenaFotka(id, varianty.Sirka, varianty.Vyska), false, adresa);
    }

    /// <summary>
    /// Nejlepší varianta jedné fotky u zdroje, <b>ještě neuložená</b>:
    /// zkusí se větší podle zvyklosti zdroje a po ní původní adresa.
    /// <para>
    /// Ukládá se až potom a jen jednou. Dokud se ukládalo rovnou tady,
    /// nešlo si to rozmyslet a sáhnout po jiném obrázku — v bucketu by
    /// zbyl soubor, ke kterému nevede žádný záznam.
    /// </para>
    /// <para>
    /// <c>Nepouzitelna</c> znamená, že poslední zkoušená varianta — tedy
    /// původní <c>og:image</c>, ta, kterou by web jinak ukázal — byla malá
    /// nebo nečitelná.
    /// </para>
    /// </summary>
    private async Task<(Varianty? Varianty, bool Nepouzitelna)> NejlepsiAsync(
        HttpClient klient, ZdrojKanalu zdroj, string adresa, CancellationToken ct)
    {
        var nepouzitelna = false;
        foreach (var kandidat in PrevzateFotky.Kandidati(zdroj, adresa))
        {
            var varianty = await ZkusAsync(klient, kandidat, ct);
            if (varianty is null)
            {
                nepouzitelna = false;
                continue;
            }

            // Zpracování nezvětšuje, takže šířka velké varianty je šířka
            // originálu, dokud nepřesáhne naši. Malé obrázky — loga, ikony —
            // tím vypadnou.
            if (varianty.Sirka < PrevzateFotky.NejmensiSirka)
            {
                log.LogInformation(
                    "Fotka {Adresa} má jen {Sirka} px, nechávám ji být", kandidat, varianty.Sirka);
                nepouzitelna = true;
                continue;
            }

            return (varianty, false);
        }

        return (null, nepouzitelna);
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
