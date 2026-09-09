using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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
/// Adresa poskytovatele a identifikátor aplikace přicházejí z prostředí:
/// <c>Identita__Authority</c> a <c>Identita__Audience</c>. Nic jiného o něm
/// aplikace nepotřebuje vědět a nic jiného se o něm nikde nedozví.
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
    public static bool PridejIdentitu(this IServiceCollection sluzby, IConfiguration config)
    {
        sluzby.AddScoped<Uzivatele>();

        var autorita = config["Identita:Authority"];
        var publikum = config["Identita:Audience"];
        if (string.IsNullOrEmpty(autorita) || string.IsNullOrEmpty(publikum))
            return false;

        sluzby.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.Authority = autorita;
                o.Audience = publikum;
                // Nároky se nechávají tak, jak stojí v tokenu. Výchozí
                // mapování přejmenuje `sub` na dlouhou adresu ze světa WS-*
                // a z kódu, který má být čitelný proti specifikaci OIDC,
                // se stane hádanka.
                o.MapInboundClaims = false;
                o.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = autorita,
                    ValidateAudience = true,
                    ValidAudience = publikum,
                    ValidateLifetime = true,
                    // Výchozí tolerance je pět minut. Server má čas z NTP,
                    // takže pět minut navíc pro token, který měl přestat
                    // platit, je zbytečně dlouhé okno.
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        sluzby.AddAuthorization();
        return true;
    }

    /// <summary>
    /// Vydavatel a subjekt z ověřeného přihlášení. Vrací <c>null</c>, když
    /// přihlášení není, nebo mu některý z těch dvou údajů chybí — dvojice
    /// dává smysl jen celá.
    /// </summary>
    public static (string Issuer, string Subject)? Ucet(this ClaimsPrincipal? kdo)
    {
        // `sub` je jméno podle OIDC; NameIdentifier je jeho podoba po výchozím
        // mapování .NETu. Bere se obojí, aby funkce nezávisela na tom, jestli
        // někdo to mapování zapne.
        var subjekt = kdo?.FindFirst("sub") ?? kdo?.FindFirst(ClaimTypes.NameIdentifier);
        if (subjekt is null) return null;

        // Vydavatel se bere z tokenu, ne z konfigurace: uložená vazba má
        // odpovídat tomu, kdo token skutečně vydal. Kdyby se sem dosadila
        // konfigurace, přepsala by změna adresy poskytovatele tiše i všechny
        // staré vazby a přestaly by být tím, čím jsou.
        //
        // Záloha je vydavatel toho samého nároku, ne jiného — v principálu
        // můžou být nároky z víc zdrojů a spárovat subjekt s cizím
        // vydavatelem by vyrobilo dvojici, která nikdy neexistovala.
        var vydavatel = kdo?.FindFirst("iss")?.Value ?? subjekt.Issuer;

        return string.IsNullOrEmpty(vydavatel) ? null : (vydavatel, subjekt.Value);
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

    /// <summary>
    /// Táž práva, ale s rozsahy jako slugy — ve tvaru pro klienta, který
    /// pracuje s adresami a interní čísla by si musel párovat sám.
    /// </summary>
    public async Task<List<(Role Role, string Serie, string? Zavod)>> RozsahyAsync(
        Guid uzivatelId, CancellationToken ct) =>
        await db.Opravneni
            .Where(o => o.UzivatelId == uzivatelId)
            // Zavod je volitelný; u práva na celý ročník vyjde z levého
            // spojení null, což je přesně to, co má klient dostat.
            .Select(o => new ValueTuple<Role, string, string?>(
                o.Role, o.Serie!.Slug, o.Zavod!.Slug))
            .ToListAsync(ct);
}
