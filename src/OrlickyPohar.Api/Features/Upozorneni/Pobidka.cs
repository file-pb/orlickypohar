namespace OrlickyPohar.Api.Features.Upozorneni;

/// <summary>
/// <b>Probuzení odesílací úlohy mimo její takt.</b>
///
/// <para>
/// Nález R18 oponentury rozhodčího (28. 10. 2026). <c>OdesilaniUloha</c>
/// s tímhle počítala dopředu: *„Zprávy, které minutu nesnesou — odložený
/// start — půjdou zařadit s vlastní pobídkou, až vzniknou."* Minutový takt
/// se nezahazuje, protože **latence je funkcí fáze** (Filip, 27. 10. 2026:
/// *„v okolí startu a cíle je potřeba mít aktuální a rychlé info. Pak při
/// jízdě uprostřed rozjížďky je minuta naprosto velkorysá."*).
/// </para>
///
/// <para>
/// <b>Vzbuzuje se až po uložení</b>, ne při zařazení do outboxu. Zařazení
/// je součást cizí transakce a ta může spadnout — probuzení nad
/// nepotvrzenou frontou by úlohu poslalo pro něco, co neexistuje.
/// </para>
///
/// <para>
/// <b>Signál se nehromadí.</b> Deset spěšných zpráv za vteřinu má probudit
/// jedno kolo, ne deset: kolo stejně bere celou frontu
/// (<see cref="Odbery.DavkaOdeslani"/>). Proto semafor s maximem jedna —
/// „je co poslat", ne počítadlo zpráv.
/// </para>
/// </summary>
public sealed class Pobidka : IDisposable
{
    private readonly SemaphoreSlim signal = new(0, 1);

    /// <summary>Řekne úloze, že je co poslat. Víc pobídek naráz splyne v jednu.</summary>
    public void Vzbud()
    {
        // Semafor plný = úloha ještě nedoběhla k předchozí pobídce.
        // Druhé uvolnění by vyhodilo výjimku, a to by shodilo uložení,
        // které se zrovna povedlo.
        try
        {
            if (signal.CurrentCount == 0) signal.Release();
        }
        catch (SemaphoreFullException)
        {
            // Závod dvou vláken o tentýž signál. Pobídka už platí, takže
            // není co dělat.
        }
    }

    /// <summary>Čeká na pobídku. Vrací se i při zastavení aplikace.</summary>
    public Task CekejAsync(CancellationToken stop) => signal.WaitAsync(stop);

    public void Dispose() => signal.Dispose();
}
