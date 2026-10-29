using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Spolecne;

/// <summary>
/// Zapisuje okolnosti rozhodnutí — kdy a odkud rozhodčí rozhodl.
///
/// <para>
/// <b>Zápis nikdy nesmí shodit to, kvůli čemu se volá.</b> Okolnost je
/// doklad k rozhodnutí, ne rozhodnutí samo; když se nepodaří uložit,
/// rozhodnutí platí dál. Proto tahle služba nevrací chybu a volá se až
/// potom, co hlavní zápis prošel.
/// </para>
/// </summary>
public class OkolnostiSprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>Zeměpisná šířka mimo tenhle rozsah není poloha, ale překlep.</summary>
    private const double SirkaMez = 90;

    /// <summary>Totéž pro délku.</summary>
    private const double DelkaMez = 180;

    /// <summary>
    /// Nad sto metrů to není poloha z družic, ale ze sítě — tatáž mez jako
    /// u pípnutí bóje. Takový údaj se neuloží; prázdno je pravdivější než
    /// číslo, které svádí k tomu brát ho vážně.
    /// </summary>
    private const double NejhorsiPresnostM = 100;

    /// <summary>
    /// Zapíše okolnost. <b>Nepřidává <c>SaveChanges</c></b> — volající ho
    /// udělá spolu se svým zápisem, aby rozhodnutí a jeho doklad vznikly
    /// jedním krokem, nebo ani jeden.
    /// </summary>
    public void Pripoj(
        int zavodId,
        DruhRozhodnuti druh,
        Guid kdo,
        OkolnostiVstup? vstup,
        int? rozjizdkaId = null,
        int? prihlaskaId = null,
        string? poznamka = null)
    {
        var ted = cas.GetUtcNow();
        var (kdy, posun) = CasKlienta.Kdy(vstup?.KdyRozhodl, ted);
        var poloha = JePoloha(vstup);

        db.OkolnostiRozhodnuti.Add(new OkolnostRozhodnuti
        {
            ZavodId = zavodId,
            RozjizdkaId = rozjizdkaId,
            PrihlaskaId = prihlaskaId,
            Druh = druh,
            KdoId = kdo,
            KdyRozhodl = kdy,
            KdyZapsano = ted,
            PosunCasu = posun,
            Sirka = poloha ? vstup!.Sirka : null,
            Delka = poloha ? vstup!.Delka : null,
            PresnostM = poloha ? vstup!.PresnostM : null,
            Poznamka = string.IsNullOrWhiteSpace(poznamka) ? null : poznamka.Trim(),
        });
    }

    /// <summary>
    /// Dává ta poloha smysl? Půlka souřadnice ani poloha z vysílače smysl
    /// nedávají — a rozhodnutí se kvůli nim nezdrží, jen se uloží bez polohy.
    /// <para>
    /// Chybějící přesnost polohu nevyřazuje: telefon ji nehlásí vždycky
    /// a „nevím jak přesně" je pořád lepší než nic. Vyřadí ji až přesnost
    /// horší než sto metrů — to už není poloha z družic, ale ze sítě
    /// (tatáž mez jako u pípnutí bóje).
    /// </para>
    /// </summary>
    private static bool JePoloha(OkolnostiVstup? vstup)
    {
        if (vstup is not { Sirka: { } sirka, Delka: { } delka }) return false;
        if (!double.IsFinite(sirka) || !double.IsFinite(delka)) return false;
        if (Math.Abs(sirka) > SirkaMez || Math.Abs(delka) > DelkaMez) return false;
        if (vstup.PresnostM is { } presnost && (presnost <= 0 || presnost > NejhorsiPresnostM))
            return false;
        return true;
    }
}
