using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;
using OrlickyPohar.Api.Features.Lode;

namespace OrlickyPohar.Api.Features.Identita;

/// <summary>
/// Co po smazání účtu ubylo. <b>Je to účtenka, ne hlášení do logu</b>: člověk,
/// který právě udělal nevratnou věc, má vidět, co se stalo, a ne jen „hotovo".
/// <para>
/// <b>Jméno musí být unikátní v celém API</b> (past v <c>AGENTS.md</c>):
/// schémata OpenAPI žijí v jediném jmenném prostoru, takže druhý
/// <c>SmazaniDto</c> by se svezl na ten existující a vygenerovaný klient by
/// dostal tvar, který tahle cesta nikdy nevrátí.
/// </para>
/// </summary>
public record SmazaniUctuDto(
    int Prihlaseni,
    int Opravneni,
    int VazebKLodim,
    int ZmenRoli,
    int Naroku,
    int Pomocniku,
    int Velitelstvi,
    int OsobOdpojeno,
    int Kontaktu,
    int PrihlasekSKontaktem,
    /// <summary>
    /// Povedlo se zrušit i samo přihlášení u poskytovatele identity? Když ne,
    /// <see cref="PoskytovatelDuvod"/> říká proč a naše strana je přitom
    /// smazaná tak jako tak.
    /// </summary>
    bool PoskytovatelZrusen = false,
    string? PoskytovatelDuvod = null);

/// <summary>
/// Co klient posílá. <b>Jediné pole, a přesto tělo</b>: potvrzení nesmí jít
/// do adresy, protože adresy se logují, přednačítají a sdílejí odkazem.
/// </summary>
public record SmazaniUctuVstup(string? Potvrzeni);

/// <summary>
/// Potvrzení, které nejde odklepnout omylem. <b>Čistá funkce</b> — ptá se na
/// ni endpoint i formulář na webu, takže se musí dát zkoušet bez databáze
/// a bez tokenu, stejně jako <see cref="Prava"/> nebo <see cref="Kontakty"/>.
/// </summary>
public static class Potvrzeni
{
    /// <summary>
    /// Slovo, které se opisuje. Česky a bez diakritiky schválně: opsat se má
    /// dát z telefonu i z klávesnice, na které háčky nejsou.
    /// </summary>
    public const string Slovo = "SMAZAT";

    /// <summary>
    /// Proč potvrzení neplatí, nebo <c>null</c>, když je v pořádku.
    /// <para>
    /// <b>Okraje se zahazují, velikost písmen ne.</b> Mezera navíc je
    /// nehoda opisování, malé písmeno je nepozornost — a nevratná věc má
    /// stát za přesné opsání.
    /// </para>
    /// </summary>
    public static string? ProcNejde(string? potvrzeni) =>
        (potvrzeni ?? "").Trim() == Slovo
            ? null
            : $"Pro smazání účtu opiš do pole slovo {Slovo}.";
}

/// <summary>
/// Smazání účtu na naší straně.
///
/// <para>
/// <b>Řádek uživatele zůstává jako bezejmenný náhrobek.</b> Není to volba
/// z lenosti, ale jediná možnost: na <see cref="Uzivatel"/> míří přes dvacet
/// cizích klíčů z provozní historie (kdo postavil trať, vyvěsil směrnici,
/// vystavil kód, uložil zápis, vyhlásil pořadí, nahrál fotku). Čtyři z nich
/// jsou <c>Restrict</c>, takže by smazání řádku <b>selhalo</b>; víc než deset
/// je <c>Cascade</c>, takže by smazání řádku <b>smazalo závodní data</b> —
/// postavenou trať, vyvěšenou směrnici, zápis z vody, odpovědi v oponentuře.
/// </para>
/// <para>
/// Hranice tedy není „řádek, nebo ne", ale <b>co je čí vztah k systému
/// a co je autorství v závodním záznamu</b>. Vztahy mizí: přihlášení, role,
/// vazby k lodím, nároky, pomocnictví, velení, osobní kontakty. Autorství
/// zůstává a ukazuje na náhrobek, protože závodní záznam je stejná kategorie
/// jako výsledek — a náhrobek už nenese jméno ani e-mail, takže z něj není
/// co vyčíst.
/// </para>
/// <para>
/// <b>Celá dávka, nebo nic.</b> Napůl smazaný účet je horší než nesmazaný:
/// člověk dostane potvrzení a jeho data zůstanou. Proto transakce.
/// </para>
/// </summary>
public class SmazaniUctu(AppDbContext db, TimeProvider cas)
{
    /// <summary>
    /// Jméno, které zůstane v závodních záznamech místo toho skutečného.
    /// <b>Ne prázdný řetězec</b> — sloupec je povinný a prázdno by ve výpisu
    /// správy vypadalo jako chyba dat, ne jako smazaný účet.
    /// </summary>
    public const string Nahrobek = "Smazaný účet";

    /// <summary>
    /// Smaže všechno naše a vrátí, čeho kolik ubylo. Vrací <c>null</c>, když
    /// uživatel neexistuje nebo už smazaný je — druhé odeslání téhož
    /// formuláře tedy nic nerozbije.
    /// </summary>
    public async Task<SmazaniUctuDto?> SmazAsync(Guid uzivatelId, CancellationToken ct)
    {
        var uzivatel = await db.Uzivatele.FirstOrDefaultAsync(u => u.Id == uzivatelId, ct);
        if (uzivatel is null || uzivatel.SmazanV is not null) return null;

        var email = uzivatel.Email;

        await using var transakce = await db.Database.BeginTransactionAsync(ct);

        // Osoby se hledají dřív, než se vazba zahodí — po `SetProperty` by
        // už nebylo podle čeho.
        var osoby = await db.Osoby
            .Where(o => o.UserId == uzivatelId)
            .Select(o => o.Id)
            .ToListAsync(ct);

        var kontaktu = await db.Set<KontaktOsoby>()
            .Where(k => osoby.Contains(k.OsobaId))
            .ExecuteDeleteAsync(ct);

        // Kopie kontaktu na přihlášce nevisí na osobě, jen na textu. Párovat
        // se tedy musí e-mailem — a jen přesnou shodou s e-mailem účtu, aby
        // se nesmazal kontakt spolukapitána, který na téže přihlášce stojí.
        var prihlasek = 0;
        if (!string.IsNullOrWhiteSpace(email))
            prihlasek = await db.Ucasti
                .Where(u => u.KontaktEmail != null && u.KontaktEmail.ToLower() == email.ToLower())
                .ExecuteUpdateAsync(s => s
                    .SetProperty(u => u.KontaktEmail, (string?)null)
                    .SetProperty(u => u.KontaktTelefon, (string?)null), ct);

        // Osoba závodníka zůstává — visí na ní výsledky, a ty jsou podle
        // zásad veřejné i po smazání účtu. Odpojuje se jen vazba na účet.
        var osobOdpojeno = await db.Osoby
            .Where(o => o.UserId == uzivatelId)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.UserId, (Guid?)null), ct);

        // Tohle je ta podstatná řádka: bez vazby (issuer, subject) se tím
        // účtem nedá přihlásit. Token, který už někdo drží, na nic nedosáhne
        // — `/ja` by podle něj založil nový, prázdný účet.
        var prihlaseni = await db.Vazby
            .Where(v => v.UzivatelId == uzivatelId)
            .ExecuteDeleteAsync(ct);

        var opravneni = await db.Opravneni
            .Where(o => o.UzivatelId == uzivatelId)
            .ExecuteDeleteAsync(ct);

        var vazebKLodim = await db.VazbyKLodim
            .Where(v => v.UzivatelId == uzivatelId)
            .ExecuteDeleteAsync(ct);

        var zmenRoli = await db.ZmenyRoli
            .Where(z => z.UzivatelId == uzivatelId)
            .ExecuteDeleteAsync(ct);

        var naroku = await db.Naroky
            .Where(n => n.UzivatelId == uzivatelId)
            .ExecuteDeleteAsync(ct);

        var pomocniku = await db.Pomocnici
            .Where(p => p.UzivatelId == uzivatelId)
            .ExecuteDeleteAsync(ct);

        var velitelstvi = await db.Velitele
            .Where(v => v.UzivatelId == uzivatelId)
            .ExecuteDeleteAsync(ct);

        await db.Uzivatele
            .Where(u => u.Id == uzivatelId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.Zobrazovane, Nahrobek)
                .SetProperty(u => u.Email, (string?)null)
                .SetProperty(u => u.SmazanV, cas.GetUtcNow()), ct);

        await transakce.CommitAsync(ct);

        return new SmazaniUctuDto(
            prihlaseni, opravneni, vazebKLodim, zmenRoli, naroku, pomocniku, velitelstvi,
            osobOdpojeno, kontaktu, prihlasek);
    }
}
