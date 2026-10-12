using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Boje;

/// <summary>
/// Stavění a přenastavování bójí.
/// <para>
/// <b>Nic se nepřepisuje.</b> Přenastavení je nový záznam a ten starý se
/// označí za nahrazený; sebrání je razítko, ne smazání. Trasa lodi z té
/// doby se jinak nedá přečíst — ta se k trati vztahuje tak, jak stála
/// tehdy, ne jak stojí teď.
/// </para>
/// </summary>
public class BojeSprava(
    AppDbContext db, TimeProvider cas, Fotky.IUloziste uloziste, TratSprava trate,
    Fotky.FotkySprava fotky,
    ILogger<BojeSprava> log)
{
    /// <summary>Bóje regaty. Platné podle pořadí, historie až za nimi.</summary>
    public async Task<List<BojeDto>> SeznamAsync(int zavodId, bool iHistorie, CancellationToken ct)
    {
        var dotaz = db.Boje.Where(b => b.ZavodId == zavodId);
        if (!iHistorie) dotaz = dotaz.Where(b => b.NahrazenaV == null && b.SebranaV == null);

        // Načítá se celý záznam, ne projekce do DTO: adresy fotky skládá
        // `Fotka.Dto` z veřejné adresy úložiště a to je čistá funkce, kterou
        // EF do SQL nepřeloží. Bójí je na regatě pár, takže o nic nejde.
        var boje = await dotaz
            .Include(b => b.Postavil)
            .Include(b => b.Fotky)
            .OrderBy(b => b.NahrazenaV == null && b.SebranaV == null ? 0 : 1)
            .ThenBy(b => b.Poradi)
            .ThenByDescending(b => b.PostavenaV)
            .ToListAsync(ct);

        return [.. boje.Select(Dto)];
    }

    /// <summary>Bóje, jak ji vidí klient. Jedno místo, ať se tvary nerozejdou.</summary>
    private BojeDto Dto(Boje b) => new(
        b.Id, b.Nazev, b.Poradi, b.Sirka, b.Delka, b.PresnostM, b.PostavenaV,
        b.Postavil?.Zobrazovane, b.SebranaV != null,
        [.. b.Fotky
            .OrderBy(f => f.NahranoV)
            .Select(f => Fotky.Nahravani.Dto(f, uloziste.VerejnaAdresa))
            .OfType<Fotky.ObrazekDto>()],
        b.Zdroj, b.Barva, b.Tvar, b.Znaceni, b.Popis);

    /// <summary>
    /// Zapíše pípnutí. Při přenastavení převezme pořadí i jméno po bóji,
    /// kterou nahrazuje — pořadatel u vody nemá co přepisovat.
    /// </summary>
    public async Task<(BojeDto? Boje, string? Chyba)> PipniAsync(
        int zavodId, PipnutiVstup vstup, Guid kdo, CancellationToken ct)
    {
        if (Pipnuti.ProcNejde(vstup) is { } chyba) return (null, chyba);
        // Do trati, kterou rozhodčí přijal, se nesahá. Bez téhle kontroly by
        // „zamčeno" byl jen nápis a veřejně vydaná trať by se dala tiše změnit
        // pod lodí, která podle ní pluje.
        if (await trate.ProcNejdeStavetAsync(zavodId, ct) is { } zamceno) return (null, zamceno);

        // Stavba začíná první bójí, ne zvláštním knoflíkem, který by nikdo
        // nestiskl.
        await trate.ZalozPokudChybiAsync(zavodId, ct);

        var ted = cas.GetUtcNow();
        Boje? stara = null;

        if (vstup.NahrazujeId is { } nahrazuje)
        {
            stara = await db.Boje
                .FirstOrDefaultAsync(b => b.Id == nahrazuje && b.ZavodId == zavodId, ct);
            if (stara is null) return (null, "Bóje, kterou chceš přenastavit, u téhle regaty není.");
            if (stara.NahrazenaV is not null) return (null, "Tahle bóje už je přenastavená.");
            // Sebraná bóje ve vodě není, takže se nemá co přenastavovat.
            // Dřív se hlídalo jen nahrazení, takže šla sebraná bóje
            // přenastavením „oživit" — vznikl by platný záznam navazující
            // na něco, co leží na břehu (oponentura, 9. 10. 2026).
            if (stara.SebranaV is not null)
                return (null, "Tahle bóje je sebraná z vody. Pípni ji jako novou.");
        }

        // „Za poslední" znamená za poslední **na trati**, ne za poslední,
        // která kdy existovala. Dřív se počítalo přes všechny záznamy včetně
        // nahrazených a sebraných, takže po sebrání poslední bóje dostala
        // další číslo, které na trati nikomu nepatřilo, a čísla rostla
        // s historií (oponentura, 9. 10. 2026).
        var poradi = vstup.Poradi > 0
            ? vstup.Poradi
            : stara?.Poradi ?? (await db.Boje
                .Where(b => b.ZavodId == zavodId && b.NahrazenaV == null && b.SebranaV == null)
                .MaxAsync(b => (int?)b.Poradi, ct) ?? 0) + 1;

        var nova = new Boje
        {
            ZavodId = zavodId,
            Nazev = vstup.Nazev!.Trim(),
            Poradi = poradi,
            Sirka = vstup.Sirka,
            Delka = vstup.Delka,
            PresnostM = vstup.PresnostM,
            Zdroj = vstup.Zdroj ?? ZdrojPolohy.Telefon,
            // Barvu a tvar si přenastavená bóje přebírá po té staré, když
            // je vstup neuvede: je to tentýž kus plastu, jen jinde. Jméno
            // se takhle nepřebírá, protože to API chce vždycky.
            Barva = vstup.Barva ?? stara?.Barva,
            Tvar = vstup.Tvar ?? stara?.Tvar,
            // Značení a poznámka se přebírají týmž pravidlem: je to tatáž
            // věc, jen jinde. U plavidla to platí nejvíc — loď komise se
            // za dopoledne posune několikrát a pokaždé vybírat „plavidlo"
            // je práce, kterou stavitel na vodě nemá dělat.
            Znaceni = vstup.Znaceni ?? stara?.Znaceni,
            Popis = string.IsNullOrWhiteSpace(vstup.Popis) ? stara?.Popis : vstup.Popis.Trim(),
            PostavenaV = ted,
            PostavilId = kdo,
            NahrazujeId = stara?.Id,
        };

        db.Boje.Add(nova);
        if (stara is not null) stara.NahrazenaV = ted;
        await db.SaveChangesAsync(ct);

        // <b>Prvky trati jdou s bójí.</b> Přenastavení je tentýž kus plastu
        // jinde, takže prvek, který tu bóji používá, musí ukazovat na nový
        // záznam. Dokud se to nedělalo, zůstal prvek viset na tom starém —
        // a protože DTO prvku nese polohu připojené bóje, kreslila mapka
        // i GPX trať podle **staré** polohy. V chartplotteru na lodi to
        // znamená bod tam, kde bóje není (objeveno 12. 10. 2026 na trati
        // Jarního větru, kde prvek „start“ držel přenastavený levobok).
        //
        // <para>
        // Nová bóje by se jinak navíc tvářila jako cizí: obrazovka ji hlásí
        // mezi „bóje stojí mimo trať“, protože ji žádný prvek nepoužívá.
        // A starý záznam nejde uklidit, protože na něj prvek ukazuje.
        // </para>
        var byloVPrvku = stara is not null && await PrepojPrvkyAsync(stara.Id, nova.Id, ct);

        // <b>Záznam, který byl součástí trati, se drží.</b> `ZahodAsync`
        // existuje kvůli překlepům — pípnuto a hned přenastaveno, nic na
        // tom neviselo. Bóje, na kterou ukazoval prvek, ale překlep nebyla:
        // je to doklad o tom, jak trať vypadala. Bez téhle podmínky by ho
        // přepojení o pár řádků výš smazalo právě tím, že ho uvolnilo.
        if (stara is not null && !byloVPrvku && await ZahodAsync(stara, nova, ct))
            log.LogInformation(
                "Přenastavený záznam bóje {Nazev} u regaty {Zavod} se nedržel — "
                + "nic na něm neviselo", nova.Nazev, zavodId);

        log.LogInformation(
            "Bóje {Nazev} u regaty {Zavod} {Co} ze zdroje {Zdroj} (přesnost {Presnost} m)",
            nova.Nazev, zavodId, stara is null ? "postavena" : "přenastavena",
            nova.Zdroj, vstup.PresnostM);

        await db.Entry(nova).Reference(b => b.Postavil).LoadAsync(ct);
        // Fotky se přikládají až po pípnutí vlastními požadavky: dokud
        // poloha neexistuje, není k čemu je přiložit.
        return (Dto(nova), null);
    }

    /// <summary>
    /// Přepne prvky trati ze staré bóje na novou. Volá se při přenastavení.
    ///
    /// <para>
    /// <b>Oba konce zvlášť</b>, protože táž bóje může být v jednom prvku
    /// jen jednou, ale ve dvou prvcích klidně na různých koncích.
    /// </para>
    ///
    /// <para>
    /// <b>Nekontroluje se, že prvek patří téhle regatě</b>, a nemusí:
    /// obě bóje jsou z ní, protože `stara` se hledala podle `zavodId`
    /// a `nova` se právě založila. Prvek ukazující na bóji cizí regaty
    /// by byl porušený zápis, ne případ, co má řešit tohle.
    /// </para>
    /// </summary>
    /// <returns>Jestli ta bóje v nějakém prvku byla.</returns>
    private async Task<bool> PrepojPrvkyAsync(int staraId, int novaId, CancellationToken ct)
    {
        var prvky = await db.PrvkyTrati
            .Where(p => p.BojeAId == staraId || p.BojeBId == staraId)
            .ToListAsync(ct);

        if (prvky.Count == 0) return false;

        foreach (var p in prvky)
        {
            if (p.BojeAId == staraId) p.BojeAId = novaId;
            if (p.BojeBId == staraId) p.BojeBId = novaId;
        }

        await db.SaveChangesAsync(ct);

        log.LogInformation(
            "Přenastavení bóje {Stara} na {Nova} přepojilo {Pocet} prvků trati",
            staraId, novaId, prvky.Count);

        return true;
    }

    /// <summary>Označí bóji za sebranou. Ze zápisu nemizí.</summary>
    public async Task<string?> SeberAsync(int zavodId, int bojeId, CancellationToken ct)
    {
        if (await trate.ProcNejdeStavetAsync(zavodId, ct) is { } zamceno) return zamceno;

        var boje = await db.Boje.FirstOrDefaultAsync(b => b.Id == bojeId && b.ZavodId == zavodId, ct);
        if (boje is null) return "Taková bóje u téhle regaty není.";
        if (boje.SebranaV is not null) return null;

        boje.SebranaV = cas.GetUtcNow();
        await db.SaveChangesAsync(ct);

        await ZahodAsync(boje, null, ct);
        return null;
    }

    /// <summary>
    /// Zahodí záznam bóje, na kterém nic nevisí. Vrací, jestli se zahodil.
    ///
    /// <para>
    /// <b>Historie začíná tam, kde na záznamu něco visí</b> (Filip,
    /// 9. 10. 2026: <i>„historii smazaných bójí chci až po tom, co na nich
    /// něco závisí"</i>). Překlep při pípnutí a hned opravené pořadí nejsou
    /// historie, jsou to dva pokusy o totéž — a v seznamu pak překáží tomu,
    /// co platí. Drží se proto jen záznam, na kterém doopravdy něco stojí.
    /// </para>
    ///
    /// <para><b>Záviset na něm může dvojí:</b></para>
    /// <list type="number">
    /// <item><b>Prvek trati</b> na něj ukazuje. Pak je to rozhodnutí
    /// o trati a smazáním by se rozbilo.</item>
    /// <item><b>Stál ve vodě, když rozhodčí nějakou trať přijal.</b>
    /// V tu chvíli šel ven ve veřejné trati, takže ho někdo mohl vidět —
    /// a co bylo veřejné, se zpětně nepřepisuje. Platí i pro bóji, kterou
    /// žádný prvek nepoužívá: veřejná trať vydává i seznam stojících bójí.
    /// </item>
    /// </list>
    ///
    /// <para>
    /// <b>Bez úložiště se nemaže.</b> Smazat řádek a nechat soubory fotek
    /// viset by bylo horší než neuklidit vůbec.
    /// </para>
    ///
    /// <para>
    /// Hranou je trať, která byla přijatá a pak se bez odjetí odemkla:
    /// <c>PrestavbaAsync</c> jí smaže <c>PrijatoV</c>, takže se po ní
    /// nepozná, že chvíli veřejná byla. Dopadá to ale na správnou stranu —
    /// podle takové trati nikdo neplul.
    /// </para>
    /// </summary>
    /// <summary>
    /// Kolik záznamů v historii regaty je k zahození — tedy nic na nich
    /// nevisí. <b>Nic nemaže</b>, jen počítá: obrazovka to musí říct
    /// dřív, než se na něco klikne.
    /// </summary>
    public async Task<int> KUklizeniAsync(int zavodId, CancellationToken ct)
    {
        var pocet = 0;
        foreach (var b in await NeplatneAsync(zavodId, ct))
            if (await ZbytecnyAsync(b, ct)) pocet++;

        return pocet;
    }

    /// <summary>
    /// Jednorázový úklid historie (Filip, 10. 10. 2026: <i>„vymaž tu
    /// historii bójí, ať tam nestraší"</i>). Platí tentýž rozsudek jako
    /// při pípnutí a sebrání — drží se jen záznam, na kterém něco visí.
    ///
    /// <para>
    /// <b>Proč akce a ne migrace:</b> je to mazání, které nejde vzít
    /// zpátky. Migrace by proběhla potichu při nasazení a nikdo by
    /// neviděl, co zmizelo. Takhle obrazovka nejdřív řekne kolik, a maže
    /// se na klik.
    /// </para>
    ///
    /// <para>
    /// Vrací, kolik záznamů zmizelo. Záznamy, u kterých se nedají smazat
    /// fotky (vypnuté úložiště), zůstanou — stejně jako jinde.
    /// </para>
    /// </summary>
    public async Task<int> UklidAsync(int zavodId, CancellationToken ct)
    {
        var zahozeno = 0;
        foreach (var b in await NeplatneAsync(zavodId, ct))
            if (await ZahodAsync(b, null, ct)) zahozeno++;

        if (zahozeno > 0)
            log.LogInformation(
                "Úklid historie bójí u regaty {Zavod}: zahozeno {Pocet} záznamů",
                zavodId, zahozeno);

        return zahozeno;
    }

    /// <summary>
    /// Zahodí <b>jeden</b> záznam historie (Filip, 12. 10. 2026:
    /// <i>„Historie bude mít možnost záznam smazat"</i>). Vrací důvod,
    /// proč to nejde — nebo <c>null</c>, když je zahozený.
    ///
    /// <para>
    /// <b>Oproti hromadnému úklidu tu je past s řetězem.</b> Úklid jde od
    /// nejnovějšího, takže nástupce zahazovaného záznamu je v tu chvíli
    /// obvykle sám pryč a není co napojovat. Tady se maže libovolný
    /// záznam, klidně uprostřed řetězu přenastavení — a kdyby se nástupce
    /// nepřepojil na předchůdce, ukazoval by jeho <c>NahrazujeId</c> do
    /// prázdna. Proto se nástupce dohledá a předá dál.
    /// </para>
    ///
    /// <para>
    /// <b>Stojící bóje se nemaže.</b> Historie je to, co už ve vodě
    /// nestojí; na bóji na trati je sebrání nebo přenastavení, ne mazátko.
    /// </para>
    /// </summary>
    public async Task<string?> ZahodZaznamAsync(int zavodId, int bojeId, CancellationToken ct)
    {
        var zaznam = await db.Boje
            .FirstOrDefaultAsync(b => b.Id == bojeId && b.ZavodId == zavodId, ct);

        if (zaznam is null) return "Takový záznam u téhle regaty není.";
        if (zaznam is { NahrazenaV: null, SebranaV: null })
            return "Tahle bóje na trati pořád stojí. Nejdřív ji seber, nebo přenastav.";

        var nastupce = await db.Boje
            .FirstOrDefaultAsync(b => b.NahrazujeId == zaznam.Id, ct);

        if (!await ZbytecnyAsync(zaznam, ct))
            return "Na tomhle záznamu něco visí: ukazuje na něj prvek trati, nebo bóje "
                   + "stála ve vodě, když rozhodčí trať přijal. Takový záznam je doklad "
                   + "k poloze, podle které se možná jelo.";

        if (!await ZahodAsync(zaznam, nastupce, ct))
            return "Záznam se zahodit nepodařilo. Nejspíš nejde smazat jeho fotky — "
                   + "zkus to za chvíli.";

        log.LogInformation(
            "Zahozen záznam historie bóje {Boje} u regaty {Zavod}", bojeId, zavodId);

        return null;
    }

    /// <summary>
    /// Záznamy, které už ve vodě nestojí. <b>Od nejnovějšího</b>, aby se
    /// řetěz přenastavení rozplétal odzadu a nástupce vždycky existoval
    /// dřív, než se sáhne na jeho předchůdce.
    /// </summary>
    private Task<List<Boje>> NeplatneAsync(int zavodId, CancellationToken ct) =>
        db.Boje
            .Where(b => b.ZavodId == zavodId && (b.NahrazenaV != null || b.SebranaV != null))
            .OrderByDescending(b => b.Id)
            .ToListAsync(ct);

    /// <summary>Visí na tom záznamu něco? Jádro pravidla, bez mazání.</summary>
    private async Task<bool> ZbytecnyAsync(Boje stara, CancellationToken ct)
    {
        if (await db.PrvkyTrati.AnyAsync(
                p => p.BojeAId == stara.Id || p.BojeBId == stara.Id, ct))
            return false;

        return !await db.Trate.AnyAsync(
            t => t.ZavodId == stara.ZavodId
                 && t.PrijatoV != null
                 && t.PrijatoV >= stara.PostavenaV
                 && (stara.NahrazenaV == null || t.PrijatoV < stara.NahrazenaV)
                 && (stara.SebranaV == null || t.PrijatoV < stara.SebranaV), ct);
    }

    private async Task<bool> ZahodAsync(Boje stara, Boje? nastupce, CancellationToken ct)
    {
        if (!await ZbytecnyAsync(stara, ct)) return false;
        if (!await fotky.OdeberVsechnyUBojeAsync(stara.Id, ct)) return false;

        // Nástupce se napojí na předchůdce zahozeného záznamu, ať řetěz
        // přenastavení nekončí v prázdnu. Jiný záznam na zahozený ukazovat
        // nemůže — na starou bóji se navazuje jen tím jedním pípnutím.
        if (nastupce is not null) nastupce.NahrazujeId = stara.NahrazujeId;

        db.Boje.Remove(stara);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
