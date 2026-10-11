using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json;
using Serilog;
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
/// <para>
/// <b>Publik smí být víc, oddělených čárkou.</b> Jedno API obsluhuje víc
/// klientů — web a od 11. 10. 2026 i appku — a poskytovatel dává každému
/// klientovi token s jeho vlastním <c>aud</c>. S jediným publikem by token
/// z appky dostal 401 a v logu by stálo, že nesedí publikum; vypadalo by
/// to jako chyba přihlášení, a přitom by přihlášení proběhlo správně.
/// </para>
/// </summary>
public static class Poskytovatel
{
    /// <summary>
    /// Publika z konfigurace. Jedna hodnota je pořád platná konfigurace —
    /// čárka jen připouští víc klientů téhož API.
    /// <para>
    /// Mezery okolo čárky se zahazují: v compose se seznam píše ručně a
    /// publikum s mezerou navíc by se neshodovalo s ničím, přičemž chyba
    /// by se projevila až jako 401 u jednoho klienta ze dvou.
    /// </para>
    /// </summary>
    public static string[] Publika(string? konfigurace) =>
        (konfigurace ?? string.Empty)
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

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

        var publika = Publika(publikum);
        if (publika.Length == 0) return false;

        sluzby.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(o =>
            {
                o.Authority = autorita;
                // `o.Audience` se schválně nenastavuje: doplnilo by se do
                // `ValidAudience` a vedle `ValidAudiences` by to bylo druhé
                // místo, kde se táž věc rozhoduje.
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
                    ValidAudiences = publika,
                    ValidateLifetime = true,
                    // Výchozí tolerance je pět minut. Server má čas z NTP,
                    // takže pět minut navíc pro token, který měl přestat
                    // platit, je zbytečně dlouhé okno.
                    ClockSkew = TimeSpan.FromSeconds(30),
                };

                // Důvod odmítnutí do logu, vlastním záznamem.
                //
                // JwtBearer ho píše sám, ale na úrovni Information — a
                // appsettings mají `Microsoft.AspNetCore` stažené na Warning,
                // takže se do Sequ nedostane. Výsledkem je 401 bez jediné
                // stopy po tom, co na tokenu nesedělo: podpis, publikum,
                // vypršení, nebo že to vůbec není JWT. Hledá se pak chyba,
                // o které log mlčí, a to je nejdražší druh chyby.
                o.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = kontext =>
                    {
                        // Tvar tokenu se hlásí zvlášť. Neprůhledný token od
                        // poskytovatele, který má u aplikace nastavené
                        // „Bearer" místo „JWT", spadne na nečitelném formátu
                        // — a z hlášky o formátu se ta příčina neuhodne.
                        var token = kontext.Request.Headers.Authorization
                            .ToString()
                            .Replace("Bearer ", "", StringComparison.OrdinalIgnoreCase);
                        var castí = string.IsNullOrEmpty(token) ? 0 : token.Split('.').Length;

                        Log.Warning(
                            "Token odmítnut: {Duvod}. Částí tokenu: {Casti} (JWT má tři; méně znamená neprůhledný token).",
                            kontext.Exception.Message, castí);

                        return Task.CompletedTask;
                    },
                };
            });

        sluzby.AddAuthorization();
        sluzby.AddHttpClient<Profily>();
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

    /// <summary>
    /// Najde uživatele podle přihlášení, ale <b>nezakládá ho</b>.
    /// <para>
    /// Oddělené od <see cref="NajdiNeboZalozAsync"/> schválně: zakládat účet
    /// se má při přihlášení, ne při každé kontrole práv. Kontrola je čtení
    /// a čtení nemá měnit databázi.
    /// </para>
    /// </summary>
    public Task<Uzivatel?> PodleUctuAsync(string issuer, string subject, CancellationToken ct) =>
        db.Vazby
            .Where(v => v.Issuer == issuer && v.Subject == subject)
            .Select(v => v.Uzivatel)
            .FirstOrDefaultAsync(ct);

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
            // Práva na celý web ročník nemají a jdou klientovi zvlášť, viz
            // WebRoleAsync — slug ročníku u nich není co vydat.
            .Where(o => o.UzivatelId == uzivatelId && o.SerieId != null)
            // Zavod je volitelný; u práva na celý ročník vyjde z levého
            // spojení null, což je přesně to, co má klient dostat.
            .Select(o => new ValueTuple<Role, string, string?>(
                o.Role, o.Serie!.Slug, o.Zavod!.Slug))
            .ToListAsync(ct);

    /// <summary>Role na celém webu.</summary>
    public async Task<List<Role>> WebRoleAsync(Guid uzivatelId, CancellationToken ct) =>
        await db.Opravneni
            .Where(o => o.UzivatelId == uzivatelId && o.SerieId == null)
            .Select(o => o.Role)
            .ToListAsync(ct);
}

/// <summary>
/// Jméno a e-mail přihlášeného, načtené od poskytovatele.
/// <para>
/// <b>Přístupový token je nenese</b> a nese je jen ID token, který se
/// k API nikdy nedostane — ten patří klientovi. Standardní cesta pro
/// aplikaci na druhé straně je proto endpoint <c>userinfo</c>: pošle se mu
/// tentýž token a on odpoví tím, co k němu poskytovatel eviduje.
/// </para>
/// <para>
/// Adresa se bere z OIDC dokumentu, ne skládá z autority — tvar cest je věc
/// poskytovatele a uhodnout ho znamená napsat si ho do kódu.
/// </para>
/// </summary>
public class Profily(HttpClient klient, IConfiguration config, TimeProvider cas)
{
    private static (string Adresa, DateTimeOffset Do)? _dokument;
    private static readonly SemaphoreSlim Zamek = new(1, 1);

    public record Profil(string? Jmeno, string? Email);

    /// <summary>
    /// Vrátí profil, nebo <c>null</c>, když se ho nepodaří získat. Selhání
    /// tady <b>nesmí shodit přihlášení</b>: token je platný a uživatel je
    /// ověřený, jen o něm nevíme jméno.
    /// </summary>
    public async Task<Profil?> NactiAsync(string token, CancellationToken ct)
    {
        try
        {
            var adresa = await AdresaUserinfoAsync(ct);
            if (adresa is null) return null;

            using var pozadavek = new HttpRequestMessage(HttpMethod.Get, adresa);
            pozadavek.Headers.Authorization = new("Bearer", token);

            var odpoved = await klient.SendAsync(pozadavek, ct);
            if (!odpoved.IsSuccessStatusCode)
            {
                Log.Warning("Userinfo vrátilo {Stav}.", (int)odpoved.StatusCode);
                return null;
            }

            using var json = JsonDocument.Parse(await odpoved.Content.ReadAsStringAsync(ct));
            var koren = json.RootElement;

            return new Profil(
                Text(koren, "name") ?? Text(koren, "preferred_username"),
                Text(koren, "email"));
        }
        catch (Exception ex)
        {
            Log.Warning(ex, "Profil od poskytovatele se nepodařilo načíst.");
            return null;
        }
    }

    private static string? Text(JsonElement kde, string jmeno) =>
        kde.TryGetProperty(jmeno, out var hodnota) && hodnota.ValueKind == JsonValueKind.String
            ? hodnota.GetString()
            : null;

    /// <summary>
    /// Adresa userinfo z OIDC dokumentu, držená hodinu. Dokument se mění
    /// jednou za dlouho, ale ne nikdy — a stahovat ho při každém přihlášení
    /// znamená dvě volání ven místo jednoho.
    /// </summary>
    private async Task<string?> AdresaUserinfoAsync(CancellationToken ct)
    {
        var ted = cas.GetUtcNow();
        if (_dokument is { } platny && platny.Do > ted) return platny.Adresa;

        await Zamek.WaitAsync(ct);
        try
        {
            if (_dokument is { } znovu && znovu.Do > ted) return znovu.Adresa;

            var autorita = config["Identita:Authority"];
            if (string.IsNullOrEmpty(autorita)) return null;

            using var json = JsonDocument.Parse(
                await klient.GetStringAsync($"{autorita}/.well-known/openid-configuration", ct));

            var adresa = Text(json.RootElement, "userinfo_endpoint");
            if (adresa is null) return null;

            _dokument = (adresa, ted.AddHours(1));
            return adresa;
        }
        finally
        {
            Zamek.Release();
        }
    }
}
