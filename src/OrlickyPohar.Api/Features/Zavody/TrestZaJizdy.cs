using OrlickyPohar.Api.Features.Identita;

namespace OrlickyPohar.Api.Features.Zavody;

/// <summary>
/// Otáčkový trest, jak ho zná ZPJ 44.2 — a jak ho rozhodčí na poháru
/// uděluje megafonem (nález R16: vlajky se nevyvěšují).
/// </summary>
public enum DruhTrestu
{
    /// <summary>
    /// <b>Jedna otáčka</b> za dotek značky — ZPJ 31 je příčina, 44.2 trest.
    /// Miloš: *„podle pravidla 31, otáčka 360 stupňů za dotyk s bójí."*
    /// </summary>
    Otacka360 = 0,

    /// <summary>
    /// <b>Dvě otáčky</b> za porušení pravidla části 2, tedy typicky dotek
    /// s jinou lodí — ZPJ 44.1 je článek o trestu, 44.2 jsou samotné
    /// otáčky. Miloš: *„podle pravidla 44.1 otáčky 720 za dotek s lodí
    /// soupeře."*
    /// </summary>
    Otacka720 = 1,
}

/// <summary>
/// <b>Co rozhodčí lodi uložil za jízdy</b> (nález R36).
///
/// <para>
/// <b>Proč to není kód výsledku.</b> Otáčka pořadí nemění: loď ji
/// odkrouží a jede dál. Kód (OCS, DSQ) naproti tomu pořadí nahrazuje.
/// Zapisovat trest jako kód by tedy znamenalo tvrdit o lodi něco, co
/// pravidla neříkají — a do výsledku se promítne teprve tehdy, když
/// trest nevykoná a někdo podá protest.
/// </para>
///
/// <para>
/// <b>Proč to není `UkonZaJizdy`.</b> Ten je vázaný na prvek trati
/// (`PrvekId` je povinný, kvůli budoucímu hendikepu); trest se váže na
/// loď. Jsou to dvě různé věci, které se jen dějí ve stejnou chvíli.
/// </para>
///
/// <para>
/// <b>Vykonání se eviduje, ale nevyžaduje.</b> Návrh rozhraní počítá se
/// stavem *„Trest 720° — nevykonán"*, který posádka uvidí v patičce.
/// Potvrzovat vykonání ale posádka nebude — Miloš si to sám omezil
/// (R34): *„abychom jim nekomplikovali život."* Zapisuje ho rozhodčí,
/// nebo nikdo.
/// </para>
/// </summary>
public class TrestZaJizdy
{
    public int Id { get; set; }

    public int RozjizdkaId { get; set; }
    public Rozjizdka? Rozjizdka { get; set; }

    /// <summary>Které lodi — účast v závodě, stejně jako u výsledku.</summary>
    public int UcastId { get; set; }
    public Ucast? Ucast { get; set; }

    public DruhTrestu Druh { get; set; }

    /// <summary>
    /// Kdy ho rozhodčí uložil. <b>Čas z telefonu</b>, prošel-li oknem
    /// v <see cref="Spolecne.CasKlienta"/>; jinak čas zápisu. Na vodě se
    /// trest uloží hned, odeslat se dá až v signálu — a rozhoduje, kdy
    /// platil.
    /// </summary>
    public DateTimeOffset UlozenoV { get; set; }

    /// <summary>
    /// Kdy došel na server. Liší se od <see cref="UlozenoV"/> jen
    /// u trestu podrženého bez signálu; rozdíl zůstane doložený.
    /// </summary>
    public DateTimeOffset? ZapsanoV { get; set; }

    /// <summary>Co se stalo s časem z telefonu.</summary>
    public Spolecne.CasKlienta.Posun PosunCasu { get; set; }

    /// <summary>
    /// Kdy loď trest odkroužila, nebo <c>null</c>, dokud se to neví.
    /// <b>`null` neznamená „nevykonala"</b>, znamená „nikdo to nezapsal" —
    /// a právě proto se do výsledku nic nepromítá samo.
    /// </summary>
    public DateTimeOffset? VykonanoV { get; set; }

    public Guid UlozilId { get; set; }
    public Uzivatel? Ulozil { get; set; }
}
