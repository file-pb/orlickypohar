namespace OrlickyPohar.Api.Features.Sprava;

/// <summary>
/// Skupina endpointů pod <c>/sprava/</c>.
///
/// <para>
/// <b>Nepřihlášený se nedozví ani to, co existuje.</b> Handlery správy
/// nejdřív přeloží adresu na rozsah a teprve pak se ptají na právo:
/// </para>
///
/// <code>
/// if (await rozsahy.NajdiAsync(serie, zavod, ct) is not { } rozsah)
///     return Results.NotFound();
/// if (!await rozsahy.SmiAsync(kdo, pozadavek, ct)) return Results.Forbid();
/// </code>
///
/// <para>
/// Jinak to u nich ani nejde — na právo se ptá <b>pro ten rozsah</b>, takže
/// se musí napřed najít. Důsledek ale je, že kdokoliv zvenčí rozliší
/// <b>404 od 403</b> a tím si přečte, které ročníky a zastávky existují.
/// To je nález G z oponentury 5. 10. 2026: <i>oprávnění se kontroluje při
/// vydání, ne až u mapy</i>.
/// </para>
///
/// <para>
/// Řeší se to o patro výš, ne přepsáním pořadí v každém handleru:
/// <b>celá správa vyžaduje přihlášení</b>, takže anonymní požadavek skončí
/// čtyřistajedničkou dřív, než se sáhne na data. Role se pak pořád kontroluje
/// v handleru, protože ta závisí na rozsahu — tahle vrstva ji nenahrazuje,
/// jen před ni staví práh.
/// </para>
///
/// <para>
/// <b>Co tím vyřešené není:</b> přihlášený bez role dál rozliší 404 od 403.
/// Pro ročníky a zastávky je to menší únik — jejich jména jsou stejně
/// veřejná v kalendáři. Kde to menší únik není, tam to handler řeší sám
/// (<c>ClankySpravaEndpoints.NajdiSPravem</c> vrací na obojí totéž).
/// </para>
/// </summary>
public static class SkupinaSpravy
{
    /// <summary>Skupina správy: společná značka a práh přihlášení.</summary>
    public static RouteGroupBuilder MapSpravu(this IEndpointRouteBuilder app, string vzor) =>
        app.MapGroup(vzor).WithTags("Správa").RequireAuthorization();
}
