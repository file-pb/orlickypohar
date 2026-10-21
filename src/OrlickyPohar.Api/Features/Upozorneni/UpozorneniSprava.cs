using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Upozorneni;

/// <summary>
/// Zápis do outboxu a evidence zařízení.
///
/// <para>
/// <b>Zápis do fronty nesmí být vlastní transakce.</b> Metody tu jen
/// přidávají do <c>DbContext</c> a <b>neukládají</b> — volající je zavolá
/// v téže transakci, ve které ukládá svou změnu. O to v outboxu jde: buď
/// se uloží změna i úkol k odeslání, nebo nic.
/// </para>
/// </summary>
public class UpozorneniSprava(AppDbContext db, TimeProvider cas)
{
    /// <summary>
    /// Přidá úkol k odeslání. <b>Neukládá</b> — viz poznámka u třídy.
    /// </summary>
    public Odeslani Zarad(string odber, string titulek, string text, string? cesta = null)
    {
        var ukol = new Odeslani
        {
            Odber = odber,
            Titulek = titulek,
            Text = text,
            Cesta = cesta,
            VzniklV = cas.GetUtcNow(),
        };
        db.Odeslani.Add(ukol);
        return ukol;
    }

    /// <summary>
    /// Zapíše zařízení, nebo obnoví to, které už token má. Vrací text chyby.
    ///
    /// <para>
    /// <b>Registrace je idempotentní.</b> Appka ji dělá při každém spuštění,
    /// protože Expo token po přeinstalaci mění — druhý zápis téhož tokenu
    /// proto jen přepíše odběry a čas, ne aby založil druhé zařízení.
    /// </para>
    /// </summary>
    public async Task<string?> ZapisZarizeniAsync(
        string? token, PlatformaZarizeni platforma, IReadOnlyList<string> odbery, CancellationToken ct)
    {
        if (Odbery.ProcNejdeZapsat(token, odbery) is { } chyba) return chyba;

        var ted = cas.GetUtcNow();
        var zarizeni = await db.Zarizeni.FirstOrDefaultAsync(z => z.Token == token, ct);
        if (zarizeni is null)
        {
            db.Zarizeni.Add(new Zarizeni
            {
                Token = token!,
                Platforma = platforma,
                Odbery = Features.Upozorneni.Odbery.DoSloupce(odbery),
                ZapsanoV = ted,
                NaposledyV = ted,
            });
        }
        else
        {
            zarizeni.Platforma = platforma;
            zarizeni.Odbery = Features.Upozorneni.Odbery.DoSloupce(odbery);
            zarizeni.NaposledyV = ted;
        }

        await db.SaveChangesAsync(ct);
        return null;
    }

    /// <summary>
    /// Úkoly, které teď čekají na odeslání — nejstarší napřed.
    ///
    /// <para>
    /// Vzdané se neberou a ty s <c>ZkusitPo</c> v budoucnu taky ne: po
    /// chybě se čeká, aby se při výpadku Expa nevolalo v těsné smyčce.
    /// </para>
    /// </summary>
    public Task<List<Odeslani>> CekajiciAsync(CancellationToken ct)
    {
        var ted = cas.GetUtcNow();
        return db.Odeslani
            .Where(o => o.OdeslanoV == null && !o.Vzdano && (o.ZkusitPo == null || o.ZkusitPo <= ted))
            .OrderBy(o => o.VzniklV).ThenBy(o => o.Id)
            .Take(Features.Upozorneni.Odbery.DavkaOdeslani)
            .ToListAsync(ct);
    }

    /// <summary>Tokeny zařízení, která tenhle odběr mají.</summary>
    public Task<List<string>> TokenyAsync(string odber, CancellationToken ct) =>
        db.Zarizeni
            // `LIKE` nad sloupcem s čárkami: hledá se odběr jako celá
            // položka, ne podřetězec — jinak by „serie:2026" chytilo
            // i „serie:2026-nanecisto".
            .Where(z => (z.Odbery + ",").Contains(odber + ","))
            .Select(z => z.Token)
            .ToListAsync(ct);

    /// <summary>Označí úkol za odeslaný.</summary>
    public async Task HotovoAsync(Odeslani ukol, CancellationToken ct)
    {
        ukol.OdeslanoV = cas.GetUtcNow();
        ukol.Chyba = null;
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Zapíše neúspěch a posune další pokus; po vyčerpání pokusů se úkol
    /// vzdá, aby neblokoval frontu donekonečna.
    /// </summary>
    public async Task NepovedloSeAsync(Odeslani ukol, string chyba, CancellationToken ct)
    {
        ukol.Pokusu++;
        ukol.Chyba = chyba.Length > 500 ? chyba[..500] : chyba;
        ukol.Vzdano = ukol.Pokusu >= Features.Upozorneni.Odbery.NejvicPokusu;
        ukol.ZkusitPo = ukol.Vzdano
            ? null
            : cas.GetUtcNow() + Features.Upozorneni.Odbery.ZkusitZa(ukol.Pokusu);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// Zahodí zařízení, která Expo označilo za neexistující.
    ///
    /// <para>
    /// <b>Odinstalovaná appka se nedozví, že se odhlásila.</b> Expo na
    /// takový token odpoví <c>DeviceNotRegistered</c> — bez úklidu by
    /// tabulka rostla o mrtvé tokeny, na které se marně volá při každé
    /// zprávě.
    /// </para>
    /// </summary>
    public async Task ZahodZarizeniAsync(IReadOnlyCollection<string> tokeny, CancellationToken ct)
    {
        if (tokeny.Count == 0) return;
        await db.Zarizeni.Where(z => tokeny.Contains(z.Token)).ExecuteDeleteAsync(ct);
    }
}
