using Microsoft.EntityFrameworkCore;
using OrlickyPohar.Api.Data;

namespace OrlickyPohar.Api.Features.Lode;

/// <summary>
/// Spárování účtu s lodí podle e-mailu — první ze tří cest
/// (Filip, 3. 10. 2026: nejdřív ta, která nikoho nestojí práci).
/// <para>
/// <b>Kdo se přihlásí e-mailem, který je na přihlášce lodi, dostane roli
/// sám.</b> Většina kapitánů tím projde bez jediného kliknutí navíc; kód
/// a nárok jsou až pro ty, u kterých e-mail nesedí.
/// </para>
/// <para>
/// <b>Sdílená adresa klubu nesmí spárovat cizího člověka.</b> Proto se
/// páruje jen tehdy, když e-mail vede k <b>právě jedné</b> osobě. Adresa,
/// kterou má v kontaktech víc lidí, nepáruje nic — a je to schválně tichý
/// konec, ne chyba: ten člověk se připojí kódem.
/// </para>
/// <para>
/// <b>Role se neponižuje.</b> Kdo už je u lodi kapitánem, zůstane jím,
/// i kdyby párování podruhé nabídlo posádku. Jinak by druhé přihlášení
/// sebralo práva, která někdo vědomě udělil.
/// </para>
/// </summary>
public class Parovani(AppDbContext db, TimeProvider cas, ILogger<Parovani> log)
{
    /// <summary>
    /// Spáruje účet se vším, na co má podle e-mailu nárok. Vrací, kolik
    /// vazeb přibylo. Volá se při přihlášení — je to levné: dva dotazy
    /// a zápis jen tehdy, když je co zapsat.
    /// </summary>
    public async Task<int> PodleEmailuAsync(Guid uzivatelId, string? email, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(email)) return 0;
        var hledany = email.Trim();

        // Osoby, které tenhle e-mail mají v kontaktech. Víc než jedna
        // znamená sdílenou adresu — a ta nepáruje nic.
        var osoby = await db.Osoby
            .Where(o => o.Kontakty.Any(k => k.Email != null && k.Email.ToLower() == hledany.ToLower()))
            .Select(o => new { o.Id, o.UserId })
            .Take(2)
            .ToListAsync(ct);

        if (osoby.Count != 1)
        {
            if (osoby.Count > 1)
                log.LogInformation(
                    "E-mail při párování vede k víc osobám, nepáruje se nic (uživatel {Uzivatel})",
                    uzivatelId);
            return 0;
        }

        var osoba = osoby[0];

        // Osoba patřící někomu jinému se nepřebírá. Tohle není spor
        // o kontakt, ale o to, kdo je ten člověk.
        if (osoba.UserId is { } cizi && cizi != uzivatelId)
        {
            log.LogInformation("Osoba {Osoba} už patří jinému účtu, párování končí", osoba.Id);
            return 0;
        }

        // Lodě, kde je ta osoba majitelem nebo kormidelníkem účasti.
        // Majitel dostane roli majitele, kormidelník kapitána.
        var jakoMajitel = await db.Lode
            .Where(l => l.MajitelId == osoba.Id)
            .Select(l => l.Id)
            .ToListAsync(ct);

        var jakoKapitan = await db.Ucasti
            .Where(u => u.KormidelnikId == osoba.Id)
            .Select(u => u.Prihlaska!.LodId)
            .Distinct()
            .ToListAsync(ct);

        var role = new Dictionary<int, RoleKLodi>();
        foreach (var lod in jakoKapitan) role[lod] = RoleKLodi.Kapitan;
        foreach (var lod in jakoMajitel) role[lod] = RoleKLodi.Majitel;
        if (role.Count == 0) return 0;

        var uz = await db.VazbyKLodim
            .Where(v => v.UzivatelId == uzivatelId && role.Keys.Contains(v.LodId))
            .ToDictionaryAsync(v => v.LodId, ct);

        var ted = cas.GetUtcNow();
        var pribylo = 0;
        foreach (var (lodId, nova) in role)
        {
            if (uz.TryGetValue(lodId, out var stara))
            {
                // Nižší číslo role znamená víc práv. Povyšuje se, nesnižuje.
                if (nova < stara.Role) stara.Role = nova;
                continue;
            }

            db.VazbyKLodim.Add(new VazbaKLodi
            {
                LodId = lodId,
                UzivatelId = uzivatelId,
                Role = nova,
                Puvod = PuvodVazby.Email,
                VzniklaV = ted,
            });
            pribylo++;
        }

        // Účet si k osobě přivlastní i její záznam, pokud ještě nikomu
        // nepatří — kontakty i historie pak visí na jednom člověku.
        if (osoba.UserId is null)
        {
            var zaznam = await db.Osoby.FirstAsync(o => o.Id == osoba.Id, ct);
            zaznam.UserId = uzivatelId;
        }

        await db.SaveChangesAsync(ct);
        if (pribylo > 0)
            log.LogInformation("Účet {Uzivatel} spárován s {Pocet} loděmi podle e-mailu",
                uzivatelId, pribylo);

        return pribylo;
    }

    /// <summary>Lodě, ke kterým účet patří, i s rolí. Od nejsilnější role.</summary>
    public Task<List<MojeLodDto>> MojeLodeAsync(Guid uzivatelId, CancellationToken ct) =>
        db.VazbyKLodim
            .Where(v => v.UzivatelId == uzivatelId)
            .OrderBy(v => v.Role).ThenBy(v => v.Lod!.Nazev)
            .Select(v => new MojeLodDto(v.LodId, v.Lod!.Nazev, v.Lod.CisloPlachty, v.Role))
            .ToListAsync(ct);
}
