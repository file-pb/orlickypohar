using System.Text.Json;

namespace OrlickyPohar.Api.Tests;

/// <summary>
/// Zlaté payloady jsou zmrazené vzorky reálného provozu. Jejich smysl není
/// pokrýt kód, ale zafixovat KONTRAKT — ten prorůstá do firmwaru, adaptérů,
/// pollerů, historie i mobilního klienta a jeho otočení po roce je nejdražší
/// změna v celém návrhu. Když se některý z těchhle testů rozbije, znamená to,
/// že se rozbijí i producenti, ke kterým se nedostaneš.
/// </summary>
internal static class Golden
{
    /// <summary>Stejná nastavení, jaká používá Minimal API při deserializaci těla requestu.</summary>
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static string Read(string name) =>
        File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "GoldenPayloads", name));

    public static T Parse<T>(string name) =>
        JsonSerializer.Deserialize<T>(Read(name), Json)
            ?? throw new InvalidOperationException($"Payload {name} se nepodařilo načíst.");
}
