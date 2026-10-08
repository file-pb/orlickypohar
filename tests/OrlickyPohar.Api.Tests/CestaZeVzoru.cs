using System.Net;
using Microsoft.AspNetCore.Routing.Patterns;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Pomocník pro testy, které procházejí endpointy samy
/// (<see cref="OchranaCteniTests"/>, <see cref="OchranaZapisuTests"/>).
/// <para>
/// Obojí potřebuje z route pattern vyrobit adresu, na kterou se dá zavolat.
/// Dokud se dosazovalo <c>"x"</c> za všechno kromě <c>int</c>, cesta
/// s omezením — dnes <c>{autor:guid}</c> ve <c>VysledkyEndpoints</c> —
/// se netrefila do žádného endpointu. Routování pak vrátilo 404 <b>dřív
/// než autorizace</b> a test to ohlásil jako otevřený endpoint, přestože
/// chráněný byl. Falešný poplach v bezpečnostním testu je horší než žádný
/// test: buď se na něj začne spoléhat, nebo se přestane číst.
/// </para>
/// </summary>
public static class CestaZeVzoru
{
    /// <summary>Doplní parametry tak, aby prošly omezeními v cestě.</summary>
    public static string Vypln(RoutePattern vzor)
    {
        var cesta = vzor.RawText ?? "/";
        foreach (var p in vzor.Parameters)
        {
            var omezeni = p.ParameterPolicies
                .Select(pol => pol.Content?.Split('(')[0].ToLowerInvariant())
                .FirstOrDefault(c => !string.IsNullOrEmpty(c));

            var hodnota = omezeni switch
            {
                "int" or "long" or "decimal" or "double" or "float" => "1",
                "guid" => "00000000-0000-0000-0000-000000000001",
                "datetime" => "2026-01-01",
                "bool" => "true",
                // `alpha`, `minlength`, `length` i vlastní `regex` nemají
                // obecnou bezpečnou hodnotu. „x" projde alpha i většinu
                // délek; kdyby se netrefilo, ohlásí to Netrefeno níž jako
                // vadu testu, ne jako otevřený endpoint.
                _ => "x",
            };

            cesta = System.Text.RegularExpressions.Regex.Replace(
                cesta, $@"\{{\*?{p.Name}(:[^}}]*)?\??\}}", hodnota);
        }
        return cesta.StartsWith('/') ? cesta : "/" + cesta;
    }

    /// <summary>Jednotný tvar klíče, ať se výjimky píšou pořád stejně.</summary>
    public static string Normalizuj(string? vzor)
    {
        var s = "/" + (vzor ?? "").Trim('/');
        return s.EndsWith('/') ? s : s + "/";
    }

    /// <summary>
    /// Rozpozná 404, které přišlo z <b>routování</b> (cesta se netrefila do
    /// žádného endpointu), od 404 z <b>handleru</b> (endpoint běžel a data
    /// nenašel). Jen to druhé je bezpečnostní nález.
    /// <para>
    /// Pozná se to metodou, kterou žádný endpoint na té cestě nemá: když se
    /// cesta trefila, vrátí ASP.NET <c>405</c>; když ne, zase <c>404</c>.
    /// </para>
    /// </summary>
    public static async Task<bool> NetrefenoAsync(HttpClient klient, string cesta)
    {
        using var zprava = new HttpRequestMessage(new HttpMethod("TRACE"), cesta);
        var odpoved = await klient.SendAsync(zprava);
        return odpoved.StatusCode == HttpStatusCode.NotFound;
    }
}
