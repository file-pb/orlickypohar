using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace OrlickyPohar.Api.Features.Upozorneni;

/// <summary>Co Expo řeklo o jednom tokenu.</summary>
/// <param name="Token">Komu se posílalo.</param>
/// <param name="Chyba">Text chyby, nebo <c>null</c> při úspěchu.</param>
/// <param name="Neregistrovane">
/// Expo hlásí, že zařízení už neexistuje — appka je odinstalovaná. Token
/// se zahodí, jinak by tabulka rostla o mrtvé a volalo se na ně navždy.
/// </param>
public record VysledekTokenu(string Token, string? Chyba, bool Neregistrovane);

/// <summary>
/// Odeslání přes Expo Push Notification Service.
///
/// <para>
/// <b>Proč Expo a ne APNs/FCM přímo</b> (plán, <i>Jak to bude postavené</i>):
/// Expo je obálka nad obojím, takže odpadá certifikát od Applu i klíč do
/// Firebase. Lock-in je v Googlu a Applu, ne v Expu — tenhle soubor je to
/// jediné místo, které by se při výměně přepisovalo.
/// </para>
/// <para>
/// <b>Bez přístupového tokenu.</b> Expo přijímá push i nepřihlášeně; token
/// zpřísňuje, kdo smí posílat na projektové tokeny, a dá se doplnit
/// proměnnou, až bude potřeba.
/// </para>
/// </summary>
public class ExpoPush(HttpClient klient, ILogger<ExpoPush> log)
{
    public const string Klient = "expo-push";

    /// <summary>Kolik tokenů smí jít v jednom volání — mez Expa.</summary>
    public const int NejvicVDavce = 100;

    private sealed record Zprava(
        [property: JsonPropertyName("to")] string To,
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("body")] string Body,
        [property: JsonPropertyName("data")] Dictionary<string, string>? Data);

    private sealed record Polozka(
        [property: JsonPropertyName("status")] string? Status,
        [property: JsonPropertyName("message")] string? Message,
        [property: JsonPropertyName("details")] Detaily? Details);

    private sealed record Detaily([property: JsonPropertyName("error")] string? Error);

    private sealed record Odpoved([property: JsonPropertyName("data")] List<Polozka>? Data);

    /// <summary>
    /// Pošle jednu zprávu na zadané tokeny. Vrací výsledek ke každému
    /// tokenu zvlášť — na jednom může selhat a na ostatních projít.
    /// </summary>
    /// <exception cref="HttpRequestException">
    /// Expo nedostupné nebo odpovědělo chybou. <b>Vyhazuje se schválně</b>:
    /// to je případ „zkusit znovu", kdežto chyba u jednoho tokenu je
    /// konečná odpověď o tom tokenu.
    /// </exception>
    public async Task<IReadOnlyList<VysledekTokenu>> PosliAsync(
        IReadOnlyList<string> tokeny, string titulek, string text, string? cesta, CancellationToken ct)
    {
        if (tokeny.Count == 0) return [];

        var vysledky = new List<VysledekTokenu>(tokeny.Count);
        foreach (var davka in tokeny.Chunk(NejvicVDavce))
        {
            var data = cesta is null ? null : new Dictionary<string, string> { ["cesta"] = cesta };
            var zpravy = davka.Select(t => new Zprava(t, titulek, text, data)).ToList();

            var odpoved = await klient.PostAsJsonAsync("/--/api/v2/push/send", zpravy, ct);
            odpoved.EnsureSuccessStatusCode();

            var telo = await odpoved.Content.ReadFromJsonAsync<Odpoved>(ct);
            var polozky = telo?.Data ?? [];

            // <b>Odpověď kratší než dávka je chyba, ne prázdno.</b> Expo
            // vrací položku ke každé zprávě; kdyby jich přišlo míň a my je
            // párovali podle pořadí, přiřadili bychom výsledky cizím
            // tokenům — a zahodili pak zařízení, které je v pořádku.
            if (polozky.Count != davka.Length)
            {
                log.LogWarning(
                    "Expo vrátilo {Polozek} výsledků na {Zprav} zpráv", polozky.Count, davka.Length);
                throw new HttpRequestException(
                    $"Expo vrátilo {polozky.Count} výsledků na {davka.Length} zpráv.");
            }

            vysledky.AddRange(davka.Select((token, i) =>
            {
                var p = polozky[i];
                var chyba = string.Equals(p.Status, "ok", StringComparison.OrdinalIgnoreCase)
                    ? null
                    : p.Message ?? p.Details?.Error ?? "Expo odmítlo zprávu.";
                return new VysledekTokenu(
                    token, chyba,
                    string.Equals(p.Details?.Error, "DeviceNotRegistered", StringComparison.Ordinal));
            }));
        }

        return vysledky;
    }
}
