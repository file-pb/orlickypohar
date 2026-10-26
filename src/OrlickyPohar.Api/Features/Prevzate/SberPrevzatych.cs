using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Fotky;

namespace OrlickyPohar.Api.Features.Prevzate;

/// <summary>
/// Stáhne kanály zdrojů v <see cref="Zdroje.Vsechny"/> a z každého nechá
/// jeho nejnovější články. Novější vytlačují starší; naše vlastní články
/// se nemažou nikdy, ty leží v jiné tabulce (Filip, 23. 9. 2026).
/// <para>
/// <b>Smysl je plnost obsahu</b>, ne archiv. Proto se staré mažou a ne
/// archivují: k čemu by byl náš tři roky starý odpis cizí novinky, když
/// originál je o kliknutí dál a je celý.
/// </para>
/// <para>
/// <b>Rotace je na zdroj</b> (<see cref="ZdrojKanalu.Kolik"/>). Se společným
/// stropem by jeden hodně píšící zdroj vytlačil všechny ostatní a výpis by
/// se tvářil, že jiné kluby nic nedělají.
/// </para>
/// <para>
/// <b>Zapíná se proměnnou <c>Prevzate__Sber=true</c></b>, jen v nasazení —
/// stejně jako sběr vodočtu. Testy ani vývojový stroj tak na cizí server
/// nesahají. Ukládání fotek k sobě má vlastní vypínač
/// <c>Prevzate__Fotky</c>: po jeho vypnutí se uložené fotky při příštím
/// běhu samy smažou a web se vrátí k adrese u zdroje.
/// </para>
/// <para>
/// <b>Jedna replika.</b> Dvakrát spuštěná služba nic nerozbije — klíčem je
/// odkaz článku a zápis je upsert — jen by se zdrojů ptala dvakrát. Až
/// přibude druhá replika, patří sem zámek v databázi.
/// </para>
/// </summary>
public class SberPrevzatych(
    IServiceScopeFactory sluzby,
    IHttpClientFactory http,
    TimeProvider cas,
    IConfiguration konfigurace,
    ILogger<SberPrevzatych> log)
    : BackgroundService
{
    /// <summary>
    /// Zdroj vydá článek zhruba obden. Šest hodin znamená, že novinka je
    /// u nás nejpozději do půl dne, a je to čtyři dotazy denně na cizí
    /// server — což je slušné.
    /// </summary>
    public static readonly TimeSpan Interval = TimeSpan.FromHours(6);

    public const string Klient = "prevzate";

    /// <summary>Ukládat fotky k sobě, nebo zůstat u adresy u zdroje.</summary>
    private bool FotkyKSobe => konfigurace.GetValue<bool>("Prevzate:Fotky");

    protected override async Task ExecuteAsync(CancellationToken stop)
    {
        using var takt = new PeriodicTimer(Interval, cas);
        do
        {
            foreach (var zdroj in Zdroje.Vsechny)
            {
                try
                {
                    await JednouAsync(zdroj, stop);
                }
                catch (Exception e) when (e is not OperationCanceledException || !stop.IsCancellationRequested)
                {
                    // Cizí server bývá nedostupný. Příští takt to zkusí znovu
                    // a do té doby se ukazuje, co už máme — díra v přejatých
                    // novinkách nikoho nepoškodí. Jeden nefunkční zdroj
                    // nesmí zastavit ostatní.
                    log.LogWarning(e, "Stažení článků ze zdroje {Zdroj} se nepovedlo", zdroj.Nazev);
                }
            }

            try
            {
                await UklidAsync(stop);
            }
            catch (Exception e) when (e is not OperationCanceledException || !stop.IsCancellationRequested)
            {
                log.LogWarning(e, "Úklid souborů přejatých článků se nepovedl");
            }
        } while (await takt.WaitForNextTickAsync(stop));
    }

    public async Task JednouAsync(ZdrojKanalu zdroj, CancellationToken ct)
    {
        using var klient = http.CreateClient(Klient);
        var xml = await klient.GetStringAsync(zdroj.Rss, ct);

        var polozky = Kanal.Rozeber(xml);
        if (polozky.Count == 0)
        {
            log.LogWarning("Kanál zdroje {Zdroj} nemá očekávaný tvar nebo je prázdný", zdroj.Nazev);
            return;
        }

        await using var scope = sluzby.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Dál se pracuje jen s tím, co se udrží: víc se stejně vytlačí
        // a ke každému nováčkovi se musí stáhnout jeho stránka kvůli fotce.
        // Padesát zbytečných dotazů na cizí server by bylo nezdvořilé.
        var vybrane = polozky.Take(zdroj.Kolik).ToList();
        var sObrazky = await DoplnObrazkyAsync(db, scope, klient, zdroj, vybrane, ct);

        var (nove, smazane) = await UlozAsync(db, zdroj, sObrazky, cas.GetUtcNow(), ct);
        var dobrane = await DoberFotkyAsync(db, scope, klient, zdroj, ct);

        log.LogInformation(
            "Články ze zdroje {Zdroj}: {Nove} nových, {Dobrane} dobraných fotek, "
            + "{Smazane} vytlačených, drží se {Kolik}",
            zdroj.Nazev, nove, dobrane, smazane, zdroj.Kolik);
    }

    /// <summary>
    /// Srovná, co u článků ukazujeme, s <b>dnešním</b> pravidlem zdroje
    /// (<see cref="ZdrojKanalu.NeniFotka"/>). Běží i s vypnutým ukládáním
    /// fotek: adresa u zdroje má být správná tak jako tak.
    /// <para>
    /// <b>Pravidlo se smí upřesnit v obou směrech</b> a uložené články se tím
    /// mají srovnat samy. Dřív to uměl jen jeden směr — co se ukázalo jako
    /// logo, šlo pryč — a opačný ne, protože se s adresou mazal i záznam
    /// o tom, co zdroj dal. Článek, který o fotku přišel neprávem, tak zůstal
    /// prázdný napořád: fotka se dohledává jen u nových článků. Od
    /// <see cref="PrevzatyClanek.OdZdroje"/> se dá rozhodnout znovu ze
    /// záznamu, bez jediného dotazu na cizí server (Filip, 26. 10. 2026).
    /// </para>
    /// <para>
    /// Doptat se je potřeba jen u řádků, u kterých se nikdy neptalo, takže
    /// nejvýš jednou za článek a nejvýš <see cref="ZdrojKanalu.Kolik"/>
    /// dotazů celkem. Článek, u kterého zdroj obrázek opravdu nemá, má
    /// adresu vyplněnou a podruhé se na něj nikdo neptá. Doptání projde
    /// <see cref="ZeStrankyAsync"/>, tedy touž úvahou jako nový článek —
    /// včetně toho, že plochý nápis ustoupí obrázku ze složky článku.
    /// </para>
    /// <para>
    /// Vrácená adresa se zkusí stáhnout znovu, i když se o ni dřív pokus
    /// nezdařil kvůli malému obrázku. Je to jedno stažení za šest hodin
    /// a za cizí server to stojí: na padesáti změřených fotkách svazu
    /// (26. 10. 2026) nebyla pod prahem ani jedna.
    /// </para>
    /// </summary>
    private async Task SrovnejSPravidlemAsync(
        AppDbContext db, StahovacFotek? stahovac, HttpClient klient, ZdrojKanalu zdroj,
        CancellationToken ct)
    {
        var neptano = await db.PrevzateClanky
            .Where(c => c.Zdroj == zdroj.Nazev && c.OdZdroje == null)
            .ToListAsync(ct);

        foreach (var clanek in neptano)
        {
            var (odZdroje, obrazek, fotka) =
                await ZeStrankyAsync(klient, stahovac, zdroj, clanek.Odkaz, ct);

            // Zdroj neodpověděl. Článek zůstane tak, jak je, a příští takt to
            // zkusí znovu — nedostupný cizí server není důvod něco měnit.
            if (odZdroje is null) continue;

            // Stará kopie jde pryč, i když se nová nepovedla: rozhodnutí se
            // právě přepsalo a soubor, ke kterému nevede žádný záznam, by
            // v bucketu zůstal napořád.
            if (clanek.FotkaId is { } stara && stara != fotka?.Id)
            {
                Uklid.Zarad(db, PrevzateFotky.Klice(stara), cas.GetUtcNow());
                clanek.FotkaId = null;
                clanek.Sirka = null;
                clanek.Vyska = null;
            }

            clanek.OdZdroje = odZdroje;
            clanek.Obrazek = obrazek;
            if (fotka is { } f) (clanek.FotkaId, clanek.Sirka, clanek.Vyska) = (f.Id, f.Sirka, f.Vyska);
        }

        if (neptano.Count > 0) await db.SaveChangesAsync(ct);

        await SrovnejAsync(db, zdroj, cas.GetUtcNow(), ct);
    }

    /// <summary>
    /// Rozhodne podle <b>dnešního</b> pravidla zdroje, co se u jeho článků
    /// ukáže — ze záznamu <see cref="PrevzatyClanek.OdZdroje"/>, bez jediného
    /// dotazu na cizí server. Logo jde pryč i s naší kopií, neprávem zahozená
    /// fotka se vrátí.
    /// </summary>
    public static async Task SrovnejAsync(
        AppDbContext db, ZdrojKanalu zdroj, DateTimeOffset nyni, CancellationToken ct)
    {
        var clanky = await db.PrevzateClanky
            .Where(c => c.Zdroj == zdroj.Nazev)
            .ToListAsync(ct);

        foreach (var clanek in clanky)
        {
            var fotka = clanek.OdZdroje is { } adresa && zdroj.NeniFotka?.Invoke(adresa) != true;

            if (!fotka && (clanek.Obrazek is not null || clanek.FotkaId is not null))
            {
                if (clanek.FotkaId is { } stara)
                {
                    Uklid.Zarad(db, PrevzateFotky.Klice(stara), nyni);
                    clanek.FotkaId = null;
                    clanek.Sirka = null;
                    clanek.Vyska = null;
                }

                clanek.Obrazek = null;
            }
            else if (fotka && clanek.Obrazek is null && clanek.FotkaId is null)
            {
                clanek.Obrazek = clanek.OdZdroje;
            }
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Dobere fotky k článkům, které už v databázi leží bez naší kopie.
    /// <para>
    /// <b>Proč to není jen u nových:</b> když se ukládání zapne, nebo když
    /// stažení poprvé nevyšlo, zbyly by staré články napořád na adrese
    /// u zdroje — a právě kvůli jejich výpadkům se fotky ukládají
    /// (Filip, 2. 10. 2026). Adresu z <c>og:image</c> už máme, takže je to
    /// nejvýš osm stažení obrázku; na stránky článků sahá jen
    /// <see cref="SrovnejSPravidlemAsync"/>, a to u řádku nejvýš jednou.
    /// </para>
    /// <para>
    /// Článek, jehož obrázek je na kartu moc malý, přijde o adresu i tady.
    /// Příští běh mu ji ze záznamu vrátí a zkusí to znovu — za jedno stažení
    /// za šest hodin to stojí za to, aby se po výpadku zdroje fotka dobrala
    /// sama.
    /// </para>
    /// </summary>
    private async Task<int> DoberFotkyAsync(
        AppDbContext db, IServiceScope scope, HttpClient klient, ZdrojKanalu zdroj,
        CancellationToken ct)
    {
        var stahovac = FotkyKSobe ? scope.ServiceProvider.GetRequiredService<StahovacFotek>() : null;
        await SrovnejSPravidlemAsync(db, stahovac, klient, zdroj, ct);

        if (stahovac is null) return 0;

        var bezFotky = await db.PrevzateClanky
            .Where(c => c.Zdroj == zdroj.Nazev && c.FotkaId == null && c.Obrazek != null)
            .ToListAsync(ct);
        if (bezFotky.Count == 0) return 0;

        var dobrane = 0;
        foreach (var clanek in bezFotky)
        {
            // Vlastní obrázek článku se tu nepředává: ten je vidět jen na jeho
            // stránce a ta se v tomhle kroku nestahuje. Adresu k zobrazení
            // vybral `ZeStrankyAsync`, tady se k ní jen dodělává naše kopie.
            var vysledek = await stahovac.UlozAsync(klient, zdroj, clanek.Obrazek!, null, ct);
            if (vysledek.Fotka is { } f)
            {
                clanek.FotkaId = f.Id;
                clanek.Sirka = f.Sirka;
                clanek.Vyska = f.Vyska;
                dobrane++;
            }
            else if (vysledek.Nepouzitelna)
            {
                clanek.Obrazek = null;
            }
        }

        await db.SaveChangesAsync(ct);
        return dobrane;
    }

    /// <summary>
    /// Ke každému <b>novému</b> článku dohledá fotku, kterou k němu dal
    /// zdroj. RSS obrázky nevydává, takže se musí stáhnout jeho stránka
    /// a vzít <c>og:image</c>. Když je ukládání zapnuté, fotka se rovnou
    /// stáhne, přepočítá na naše velikosti a uloží k nám.
    /// <para>
    /// <b>Jen k novým.</b> U článku, který už v databázi leží, se fotka
    /// nemění a ptát se na ni znovu by znamenalo osm dotazů každých šest
    /// hodin místo zhruba jednoho denně.
    /// </para>
    /// <para>
    /// Nepovedené stažení článek nezahodí — zůstane bez fotky a web sáhne
    /// po náhradní. Cizí server, který zrovna neodpovídá, nemá být důvod,
    /// proč se novinka neukáže.
    /// </para>
    /// </summary>
    private async Task<IReadOnlyList<PolozkaKanalu>> DoplnObrazkyAsync(
        AppDbContext db, IServiceScope scope, HttpClient klient, ZdrojKanalu zdroj,
        IReadOnlyList<PolozkaKanalu> polozky, CancellationToken ct)
    {
        var odkazy = polozky.Select(p => p.Odkaz).ToList();
        var uz = await db.PrevzateClanky
            .Where(c => odkazy.Contains(c.Odkaz))
            .Select(c => c.Odkaz)
            .ToListAsync(ct);

        var stahovac = FotkyKSobe ? scope.ServiceProvider.GetRequiredService<StahovacFotek>() : null;

        var doplnene = new List<PolozkaKanalu>(polozky.Count);
        foreach (var p in polozky)
        {
            if (uz.Contains(p.Odkaz))
            {
                doplnene.Add(p);
                continue;
            }

            var (odZdroje, obrazek, fotka) = await ZeStrankyAsync(klient, stahovac, zdroj, p.Odkaz, ct);
            doplnene.Add(p with { Obrazek = obrazek, OdZdroje = odZdroje, Fotka = fotka });
        }

        return doplnene;
    }

    /// <summary>
    /// Rozhodne ze stránky článku, co se k němu ukáže: co zdroj dal
    /// (<see cref="PrevzatyClanek.OdZdroje"/>), co z toho smí na kartu
    /// a naše kopie.
    /// <para>
    /// <b>Jediné místo, kde se to rozhoduje</b> — pro nový článek i pro ten,
    /// na který se sběr doptává zpětně. Dvě kopie téhle úvahy by se dřív
    /// nebo později rozešly a karta by vypadala jinak podle toho, kdy článek
    /// přišel.
    /// </para>
    /// <para>
    /// Nepovedené stažení článek nezahodí — zůstane bez fotky a web sáhne
    /// po náhradní. Cizí server, který zrovna neodpovídá, nemá být důvod,
    /// proč se novinka neukáže.
    /// </para>
    /// </summary>
    private async Task<(string? OdZdroje, string? Obrazek, UlozenaFotka? Fotka)> ZeStrankyAsync(
        HttpClient klient, StahovacFotek? stahovac, ZdrojKanalu zdroj, string odkaz,
        CancellationToken ct)
    {
        string? ogImage;
        string? vlastni;
        try
        {
            var html = await klient.GetStringAsync(odkaz, ct);
            ogImage = Kanal.Obrazek(html);
            vlastni = zdroj.VlastniObrazek?.Invoke(html);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            log.LogInformation(e, "Fotku k článku {Odkaz} se nepovedlo zjistit", odkaz);
            return (null, null, null);
        }

        if (ogImage is null) return (null, null, null);

        // Bez ukládání k sobě se obrázek nestahuje, takže se nedá změřit, jestli
        // je to nápis — rozhodne jen pravidlo nad adresou.
        if (stahovac is null)
            return (ogImage, zdroj.NeniFotka?.Invoke(ogImage) == true ? null : ogImage, null);

        var vysledek = await stahovac.UlozAsync(klient, zdroj, ogImage, vlastni, ct);

        // Když zdroj místo fotky dal logo, zahodí se adresa, kterou by web
        // ukázal — jinak by ho roztáhl přes celou kartu (Filip, 2. 10. 2026).
        // Záznam o tom, co zdroj dal, zůstává: podle něj se dá rozhodnout
        // znovu, až se pravidlo upřesní.
        if (vysledek.Nepouzitelna)
        {
            log.LogInformation(
                "Obrázek u článku {Odkaz} se na kartu nehodí, použije se náhradní", odkaz);
            return (ogImage, null, null);
        }

        return (ogImage, vysledek.Adresa ?? ogImage, vysledek.Fotka);
    }

    /// <summary>
    /// Zapíše, co přišlo, a nechá jen <see cref="ZdrojKanalu.Kolik"/>
    /// nejnovějších článků <b>toho zdroje</b>.
    /// <para>
    /// Ořezává se <b>až po zápisu a podle data vydání</b>, ne tak, že by se
    /// vzalo prvních osm ze vstupu: v databázi můžou ležet články, které
    /// v tomhle kanálu už nejsou, a rozhodnout se musí mezi všemi dohromady.
    /// Pořadí ve vstupu k tomu neříká nic — <see cref="Kanal.Rozeber"/> ho
    /// sice srovná podle data, ale tahle metoda na to nespoléhá.
    /// </para>
    /// <para>
    /// Existující se přepíše — zdroj smí článek opravit a přepsaný titulek
    /// je oprava, ne nový článek. Klíčem je odkaz, takže se nic nezdvojí.
    /// </para>
    /// <para>
    /// <b>Fotky vytlačených článků jdou do fronty k smazání v téže
    /// transakci</b>, ve které mizí jejich řádek. Jinak by po zaškobrtnutí
    /// úložiště zbyl v bucketu soubor, ke kterému už nevede žádný záznam.
    /// </para>
    /// </summary>
    public static async Task<(int Nove, int Smazane)> UlozAsync(
        AppDbContext db, ZdrojKanalu zdroj, IReadOnlyList<PolozkaKanalu> polozky,
        DateTimeOffset nyni, CancellationToken ct)
    {
        var odkazy = polozky.Select(p => p.Odkaz).ToList();
        var zname = await db.PrevzateClanky
            .Where(c => odkazy.Contains(c.Odkaz))
            .ToDictionaryAsync(c => c.Odkaz, ct);

        var nove = 0;
        foreach (var p in polozky)
        {
            if (!zname.TryGetValue(p.Odkaz, out var clanek))
            {
                clanek = new PrevzatyClanek
                {
                    Zdroj = zdroj.Nazev,
                    ZdrojOdkaz = zdroj.Odkaz,
                    Odkaz = p.Odkaz,
                    Titulek = p.Titulek,
                };
                db.PrevzateClanky.Add(clanek);
                nove++;
            }

            clanek.Titulek = p.Titulek;
            clanek.Perex = p.Perex;
            // Fotka se dohledává jen u nových, takže u známého článku
            // přijde prázdná — a tou se nesmí přepsat ta, kterou už má.
            clanek.Obrazek = p.Obrazek ?? clanek.Obrazek;
            clanek.OdZdroje = p.OdZdroje ?? clanek.OdZdroje;
            if (p.Fotka is { } f)
            {
                clanek.FotkaId = f.Id;
                clanek.Sirka = f.Sirka;
                clanek.Vyska = f.Vyska;
            }

            // Časy do databáze patří v UTC — Npgsql jiný posun do
            // `timestamp with time zone` nezapíše a kanál posílá +02:00.
            clanek.PublikovanoV = p.PublikovanoV.ToUniversalTime();
            clanek.StazenoV = nyni.ToUniversalTime();
        }

        await db.SaveChangesAsync(ct);

        // Rotace až po zápisu: teprve teď je jasné, které je osm nejnovějších
        // dohromady — nové i ty, co už ležely. Jen články téhož zdroje:
        // zdroje si navzájem místo neberou.
        var vytlacene = await db.PrevzateClanky
            .Where(c => c.Zdroj == zdroj.Nazev)
            .OrderByDescending(c => c.PublikovanoV).ThenByDescending(c => c.Id)
            .Skip(zdroj.Kolik)
            .ToListAsync(ct);

        if (vytlacene.Count > 0)
        {
            Uklid.Zarad(db, vytlacene.Where(c => c.FotkaId is { } id && id != Guid.Empty)
                .SelectMany(c => PrevzateFotky.Klice(c.FotkaId!.Value)), nyni);
            db.PrevzateClanky.RemoveRange(vytlacene);
            await db.SaveChangesAsync(ct);
        }

        return (nove, vytlacene.Count);
    }

    /// <summary>
    /// Vyprázdní frontu smazaných souborů a — když je ukládání fotek
    /// vypnuté — zařadí do ní i fotky, které ještě držíme. Vypnutí
    /// vypínače tak uklidí samo, nejpozději při dalším běhu.
    /// </summary>
    private async Task UklidAsync(CancellationToken ct)
    {
        await using var scope = sluzby.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var uloziste = scope.ServiceProvider.GetRequiredService<IUloziste>();

        if (!FotkyKSobe)
        {
            var sFotkou = await db.PrevzateClanky.Where(c => c.FotkaId != null).ToListAsync(ct);
            if (sFotkou.Count > 0)
            {
                Uklid.Zarad(db, sFotkou.SelectMany(c => PrevzateFotky.Klice(c.FotkaId!.Value)),
                    cas.GetUtcNow());
                foreach (var c in sFotkou)
                {
                    c.FotkaId = null;
                    c.Sirka = null;
                    c.Vyska = null;
                }

                await db.SaveChangesAsync(ct);
                log.LogInformation(
                    "Ukládání fotek je vypnuté, {Pocet} přejatých fotek jde pryč", sFotkou.Count);
            }
        }

        var (smazano, neuspechu) = await Uklid.VyprazdniAsync(db, uloziste, log, ct);
        if (smazano > 0 || neuspechu > 0)
            log.LogInformation("Soubory přejatých: {Smazano} smazáno, {Neuspechu} zůstalo na příště",
                smazano, neuspechu);
    }
}
