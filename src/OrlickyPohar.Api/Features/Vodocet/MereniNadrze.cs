namespace OrlickyPohar.Api.Features.Vodocet;

/// <summary>
/// Jedno měření nádrže Orlík, jak ho sběr uložil.
/// <para>
/// <b>Proč si to aplikace ukládá.</b> Povodí Vltavy vydává po hodinách jen
/// hladinu a odtok; přítok a objem ukazuje jen aktuální. Filip chtěl
/// (16. 9. 2026) skutečný přítok a odtok za posledních 24 h spočítaný
/// z dat, ne okamžitou hodnotu krát den — a přítok za den jinak než
/// vlastním sběrem nezjistíme.
/// </para>
/// <para>
/// Řádek vzniká ze dvou míst stránky: z aktuálních hodnot (všechna čtyři
/// čísla) a z hodinové řady (hladina a odtok). Klíčem je čas; co jedno
/// místo nemá, doplní druhé.
/// </para>
/// </summary>
public class MereniNadrze
{
    /// <summary>Čas měření v UTC. Přirozený klíč.</summary>
    public DateTimeOffset Cas { get; set; }

    /// <summary>m n. m.</summary>
    public decimal Hladina { get; set; }

    /// <summary>mil. m³</summary>
    public decimal? Objem { get; set; }

    /// <summary>m³/s</summary>
    public decimal? Pritok { get; set; }

    /// <summary>m³/s</summary>
    public decimal? Odtok { get; set; }
}
