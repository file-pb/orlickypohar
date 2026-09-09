using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Identita;

/// <summary>
/// <b>Jediné místo, kde aplikace ví, odkud přicházejí přihlášení.</b> Zbytek
/// kódu se ptá na interní <c>UserId</c> a na role v rozsahu; že je za tím
/// zrovna Zitadel, se nikde jinde nedozví — a slovo „Zitadel" se v tomhle
/// souboru schválně nevyskytuje ani jednou. Všechno je konfigurace.
/// <para>
/// Držet to pohromadě není kosmetika. Rozsypaný poskytovatel je přesně ten
/// důvod, proč se výměna identity odkládá tak dlouho, až je nemožná.
/// </para>
/// <para>
/// <b>Ověřování tokenu tu zatím není</b> a je to dělicí čára, ne opomenutí.
/// Tenhle soubor umí přeložit už ověřeného přihlášeného na interní účet;
/// ověření podpisu tokenu potřebuje balíček
/// <c>Microsoft.AspNetCore.Authentication.JwtBearer</c>, který se z pracovního
/// stroje nedá stáhnout (NuGet je odsud nedostupný, stejně jako Docker Hub).
/// Připojí se tady, aby zbytek aplikace zůstal bez znalosti poskytovatele.
/// </para>
/// </summary>
public static class Poskytovatel
{
    /// <summary>
    /// Zaregistruje překlad přihlášení na interní účet.
    /// <para>
    /// Registruje se <b>vždycky</b>, i bez nakonfigurovaného poskytovatele:
    /// sám o sobě nic neotevírá, protože uživatel bez jediného oprávnění
    /// nesmí nic než to, co smí kdokoliv nepřihlášený. Chráněné endpointy
    /// se naproti tomu bez ověřování nezaregistrují vůbec — zapomenutá
    /// proměnná prostředí nesmí být totéž co „pusť dovnitř kohokoliv".
    /// </para>
    /// </summary>
    public static IServiceCollection PridejIdentitu(this IServiceCollection sluzby)
    {
        sluzby.AddScoped<Uzivatele>();
        return sluzby;
    }

    /// <summary>
    /// Vydavatel a subjekt z ověřeného přihlášení. Vrací <c>null</c>, když
    /// přihlášení není, nebo mu některý z těch dvou údajů chybí — dvojice
    /// dává smysl jen celá.
    /// </summary>
    public static (string Issuer, string Subject)? Ucet(this ClaimsPrincipal? kdo)
    {
        var subject = kdo?.FindFirst("sub")?.Value
            ?? kdo?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        // Vydavatel se bere z nároku, ne z konfigurace: uložená vazba má
        // odpovídat tomu, kdo token skutečně vydal. Kdyby se sem dosadila
        // konfigurace, přenesla by se změna adresy poskytovatele tiše na
        // všechny staré vazby a přestaly by být tím, čím jsou.
        var issuer = kdo?.FindFirst("iss")?.Value
            ?? kdo?.FindFirst(ClaimTypes.NameIdentifier)?.Issuer;

        return subject is null || string.IsNullOrEmpty(issuer) ? null : (issuer, subject);
    }
}

/// <summary>
/// Překlad přihlášení na interní <c>UserId</c> a načtení jeho práv.
/// </summary>
public class Uzivatele(AppDbContext db)
{
    /// <summary>
    /// Najde uživatele podle dvojice <c>(issuer, subject)</c>, a když ho
    /// nezná, založí ho.
    /// <para>
    /// Zakládat při prvním přihlášení je schválně: pozvat člověka znamená dát
    /// mu roli, ne vyrobit mu předem účet, o kterém neví. Uživatel bez jediného
    /// oprávnění nesmí nic navíc, takže samo založení nic neotevírá.
    /// </para>
    /// </summary>
    public async Task<Uzivatel> NajdiNeboZalozAsync(
        string issuer, string subject, string zobrazovane, string? email,
        TimeProvider cas, CancellationToken ct)
    {
        var vazba = await db.Vazby
            .Include(v => v.Uzivatel)
            .FirstOrDefaultAsync(v => v.Issuer == issuer && v.Subject == subject, ct);

        var ted = cas.GetUtcNow();

        if (vazba?.Uzivatel is { } znamy)
        {
            // Jméno a e-mail jsou autoritativní u poskytovatele, tady jen
            // k zobrazení — srovnají se při každém přihlášení, ale nic se
            // podle nich nepáruje.
            znamy.Zobrazovane = zobrazovane;
            znamy.Email = email;
            znamy.NaposledyPrihlasenV = ted;
            await db.SaveChangesAsync(ct);
            return znamy;
        }

        var uzivatel = new Uzivatel
        {
            // Verze 7: časově řaditelné UUID. Náhodné by z primárního klíče
            // udělalo náhodné zápisy do indexu.
            Id = Guid.CreateVersion7(),
            Zobrazovane = zobrazovane,
            Email = email,
            ZalozenV = ted,
            NaposledyPrihlasenV = ted,
        };

        db.Uzivatele.Add(uzivatel);
        db.Vazby.Add(new UcetVazba
        {
            Issuer = issuer,
            Subject = subject,
            Uzivatel = uzivatel,
            ZalozenV = ted,
        });

        await db.SaveChangesAsync(ct);
        return uzivatel;
    }

    /// <summary>Práva uživatele ve tvaru, na který se ptá <see cref="Prava"/>.</summary>
    public async Task<List<UdeleneRole>> PravaAsync(Guid uzivatelId, CancellationToken ct) =>
        await db.Opravneni
            .Where(o => o.UzivatelId == uzivatelId)
            .Select(o => new UdeleneRole(o.Role, o.SerieId, o.ZavodId))
            .ToListAsync(ct);
}
