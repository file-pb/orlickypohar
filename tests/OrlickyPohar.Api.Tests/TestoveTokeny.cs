using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Podepisování testovacích tokenů, aby se správa dala zkoušet <b>přes HTTP</b>.
/// <para>
/// <b>Proč to vzniklo.</b> Testovací hostitel má identitu nastavenou na
/// nedostupnou autoritu — bez ní by <c>Program.cs</c> chráněné řezy pod
/// <c>/sprava/</c> vůbec nezaregistroval (<c>if (identita)</c>). Požadavek
/// bez tokenu odmítne JwtBearer rovnou 401, takže na kontrolu „neprošlo bez
/// přihlášení" to stačilo. Dál se ale nedalo: s platným tokenem se k endpointu
/// nikdo nedostal, a všechny testy správy proto chodily přes služby. Tím
/// zůstávalo neověřené právě to, co vrstva nad službou dělá sama — převod
/// chyby na stavový kód, pořadí kontrol, 404 místo 403 a naopak.
/// </para>
/// <para>
/// <b>Jak.</b> Tokeny se podepisují symetrickým klíčem a hostitel dostane
/// týž klíč do <c>TokenValidationParameters</c>; metadata poskytovatele se
/// nestahují, protože se mu podstrčí prázdná konfigurace. Na síť se tedy
/// pořád nesahá.
/// </para>
/// <para>
/// <b>Co to nezměkčuje.</b> Ověřování vydavatele, publika ani životnosti se
/// nevypíná — mění se jediná věc, totiž čím je podpis ověřený. Požadavek bez
/// tokenu, s cizím podpisem nebo s prošlou platností dopadne stejně jako
/// v produkci, a <see cref="OchranaCteniTests"/> i <see cref="OchranaZapisuTests"/>
/// posílají požadavky bez tokenu, takže jim 401 zůstává.
/// </para>
/// </summary>
public static class TestoveTokeny
{
    /// <summary>Vydavatel, na který je testovací hostitel nastavený.</summary>
    public const string Vydavatel = "https://identita.neexistuje.invalid";

    /// <summary>Publikum, které testovací hostitel uznává.</summary>
    public const string Publikum = "orlickypohar-test";

    /// <summary>
    /// Klíč k podpisu. Je napevno a je to v pořádku: platí jen uvnitř
    /// testovacího hostitele, který nikam neposlouchá. HS256 chce aspoň
    /// 256 bitů, jinak `SignTo` spadne na délce klíče.
    /// </summary>
    public static readonly SymmetricSecurityKey Klic = new(
        Encoding.UTF8.GetBytes("testovaci-klic-jen-pro-integracni-testy-32B+"));

    /// <summary>
    /// Token pro účet <paramref name="subjekt"/> u testovacího vydavatele.
    /// Dvojice <c>(iss, sub)</c> je to, podle čeho si aplikace účet najde
    /// (<c>Poskytovatel.Ucet</c>), takže stejný subjekt znamená stejný účet.
    /// </summary>
    public static string Vydej(
        string subjekt,
        string? zobrazovane = null,
        string? email = null,
        TimeSpan? platnost = null)
    {
        List<Claim> naroky =
        [
            new("sub", subjekt),
            new("name", zobrazovane ?? $"Účet {subjekt}"),
        ];
        if (email is not null) naroky.Add(new Claim("email", email));

        // Záporná platnost vydá token, který už vypršel — na to se zkouší,
        // že ho hostitel odmítne. `JwtSecurityToken` ale neunese `nbf`
        // položené za `exp`, takže se u prošlého tokenu odvíjí od vypršení,
        // ne od teď.
        var ted = DateTime.UtcNow;
        var vyprsi = ted.Add(platnost ?? TimeSpan.FromMinutes(10));
        var odkdy = (vyprsi < ted ? vyprsi : ted).AddMinutes(-1);

        var token = new JwtSecurityToken(
            issuer: Vydavatel,
            audience: Publikum,
            claims: naroky,
            notBefore: odkdy,
            expires: vyprsi,
            signingCredentials: new SigningCredentials(Klic, SecurityAlgorithms.HmacSha256));

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
