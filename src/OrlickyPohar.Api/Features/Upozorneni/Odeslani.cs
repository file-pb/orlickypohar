namespace OrlickyPohar.Api.Features.Upozorneni;

/// <summary>Kam zpráva míří. Zatím jen push; e-maily přibudou jako další druh.</summary>
public enum DruhOdeslani
{
    /// <summary>Push do appky přes Expo Push Notification Service.</summary>
    Push = 0,
}

/// <summary>
/// Jeden úkol k odeslání ven — <b>outbox</b>.
///
/// <para>
/// <b>Proč to není prosté „pošli a hotovo".</b> Do databáze se zapisuje
/// transakčně, ven do světa ne. Kdyby se posílalo přímo z akce, která
/// změnu ukládá, byly by dvě špatné možnosti: poslat napřed a pak uložit
/// (spadne uložení → lodě mají zprávu o něčem, co se nestalo), nebo uložit
/// napřed a pak poslat (spadne odeslání → <b>nikdo se to nedozví</b>,
/// protože obrazovka hlásí uloženo).
/// </para>
/// <para>
/// Outbox to řeší tím, že se <b>odeslání zapíše jako úkol ve stejné
/// transakci jako ta změna</b>. Buď se uloží obojí, nebo nic. Teprve pak
/// samostatná úloha úkoly čte a posílá; co selže, zůstane a zkusí se
/// znovu. Platforma to vede jako odloženou položku se spouští „první
/// commit, po kterém nesmí být ztracena externí akce"
/// (<c>platform/docs/ARCHITEKTURA.md</c>) — a zpráva závodníkům je přesně
/// ona.
/// </para>
/// <para>
/// <b>Tělo se ukládá hotové, ne jako odkaz na data.</b> Zpráva má říkat,
/// co platilo ve chvíli, kdy se stala — kdyby se skládala až při odesílání
/// z aktuálního stavu, poslal by se po opravě výsledku text, který k té
/// události nepatří.
/// </para>
/// </summary>
public class Odeslani
{
    public int Id { get; set; }

    public DruhOdeslani Druh { get; set; } = DruhOdeslani.Push;

    /// <summary>
    /// Komu to patří — odběr, podle kterého se hledají zařízení.
    /// Tvar <c>serie:{slug}</c> nebo <c>zavod:{slug}</c>; viz <see cref="Odbery"/>.
    /// </summary>
    public required string Odber { get; set; }

    /// <summary>Tučný řádek v upozornění.</summary>
    public required string Titulek { get; set; }

    /// <summary>Řádek pod ním. Krátký — na zamčené obrazovce se víc nevejde.</summary>
    public required string Text { get; set; }

    /// <summary>
    /// Kam appka skočí po klepnutí. Cesta ve webu, ne celá adresa —
    /// doména se mění s prostředím a uložená by zprávu svázala s jedním.
    /// </summary>
    public string? Cesta { get; set; }

    public DateTimeOffset VzniklV { get; set; }

    /// <summary>Kdy se to podařilo odeslat. <c>null</c>, dokud čeká.</summary>
    public DateTimeOffset? OdeslanoV { get; set; }

    /// <summary>
    /// Kolikátý pokus selhal. Po <see cref="Odbery.NejvicPokusu"/> se úkol
    /// vzdá — jinak by neodeslatelná zpráva blokovala frontu donekonečna.
    /// </summary>
    public int Pokusu { get; set; }

    /// <summary>Proč poslední pokus selhal. Pro provoz, ne pro uživatele.</summary>
    public string? Chyba { get; set; }

    /// <summary>
    /// Kdy to zkusit znovu. <c>null</c> znamená „hned"; po chybě se posouvá,
    /// aby se nevolalo Expo v těsné smyčce.
    /// </summary>
    public DateTimeOffset? ZkusitPo { get; set; }

    /// <summary>Vzdáno — vyčerpané pokusy. Zůstává v tabulce jako doklad.</summary>
    public bool Vzdano { get; set; }
}
