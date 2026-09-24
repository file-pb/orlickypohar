using System.Text.Json;

namespace OrlickyPohar.Api.Features.Naklady;

/// <summary>Jak dopadlo hledání čísel. „Nevíme" a „nula" nejsou totéž.</summary>
public enum StavNakladu
{
    /// <summary>Čísla jsou.</summary>
    Ok,

    /// <summary>Cesta k souboru není nastavená — funkce je vypnutá.</summary>
    Vypnuto,

    /// <summary>Cesta je, soubor ne (nebo se nedá přečíst).</summary>
    Chybi,

    /// <summary>Soubor je, ale tenhle projekt v něm není.</summary>
    Nezname,
}

/// <summary>
/// Čtení nákladů ze souboru, který vedle své stránky zapisuje přehled stavu
/// platformy (<c>scripts/prehled-stav.sh</c>, každých pět minut).
/// <para>
/// <b>Proč soubor, a ne vlastní výpočet.</b> Čísla vznikají z věcí, o kterých
/// aplikace nic neví a vědět nemá: kolik má stroj paměti, co stojí, kolik
/// procesoru spotřeboval který kontejner. Druhý výpočet téhož by se s tím
/// prvním dřív nebo později rozešel a nikdo by nepoznal, který z nich lže.
/// </para>
/// <para>
/// <b>Pravidlo „žádný stav na lokálním disku" tím neporušujeme.</b> Nic se
/// sem nezapisuje a nic se odsud neobnovuje; je to vstup připojený jen ke
/// čtení, jako konfigurace. Bez něj aplikace běží dál a obrazovka řekne,
/// že čísla nejsou — proto je celá věc volitelná a řídí ji proměnná
/// prostředí, ne přítomnost souboru.
/// </para>
/// </summary>
public class NakladyCteni(IConfiguration config, ILogger<NakladyCteni> log)
{
    /// <summary>
    /// O kolik procent výš než v přehledu platformy (Filip, 24. 9. 2026).
    /// Není to výmysl: alokace serveru je spodní odhad — neúčtuje si zálohy,
    /// dohled ani čas, než se stroj musí zvětšit. Je v konfiguraci, aby se
    /// dala změnit bez nasazení kódu, a ukazuje se na obrazovce; skrytá
    /// přirážka by z tabulky udělala hádanku.
    /// </summary>
    private decimal Prirazka => config.GetValue<decimal?>("Naklady:Prirazka") ?? 7m;

    /// <summary>Jméno projektu v souboru platformy (compose project).</summary>
    private string Projekt => config["Naklady:Projekt"] ?? "orlickypohar";

    private string? Soubor => config["Naklady:Soubor"];

    public async Task<(StavNakladu Stav, NakladyDto? Naklady)> NactiAsync(CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(Soubor)) return (StavNakladu.Vypnuto, null);

        NakladyDto? naklady;
        try
        {
            var json = await File.ReadAllTextAsync(Soubor, ct);
            naklady = Prepocet.ZeJsonu(json, Projekt, Prirazka);
        }
        catch (Exception e) when (e is IOException or UnauthorizedAccessException or JsonException)
        {
            // Nedostupný nebo rozbitý soubor není chyba aplikace: přehled
            // mohl zrovna nenaběhnout, nebo se soubor přepisoval. Do logu to
            // patří, do 500 ne.
            log.LogWarning(e, "Náklady se nepodařilo přečíst ze souboru {Soubor}.", Soubor);
            return (StavNakladu.Chybi, null);
        }

        return naklady is null ? (StavNakladu.Nezname, null) : (StavNakladu.Ok, naklady);
    }
}
